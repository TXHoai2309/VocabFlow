import type postgres from "postgres";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { APP_SCHEMA, MIGRATION_SCHEMA } from "@vocabflow/contracts";

type SqlClient = ReturnType<typeof postgres>;
const MIGRATION_ROLE = "vocabflow_migration";

type MigrationSubstage =
  | "migration-validate-infrastructure"
  | "migration-load-files"
  | "migration-read-history"
  | "migration-apply"
  | "migration-record-history";

function mark(substage: MigrationSubstage) {
  console.log(`TRUSTED_DB_SUBSTAGE=${substage}`);
}

export function assertProductionMigrationsForwardOnly(migrations: ReturnType<typeof readMigrationFiles>) {
  const destructive = /\b(?:DROP\s+(?:DATABASE|SCHEMA|TABLE|TYPE|COLUMN|OWNED)|TRUNCATE\b|DELETE\s+FROM\b|UPDATE\s+(?:"[^"\r\n]+"|[\w.]+)\s+SET\b|REASSIGN\s+OWNED\b)\b/i;
  if (migrations.some((migration) => migration.sql.some((statement) => destructive.test(statement)))) {
    throw new Error("PRODUCTION_DESTRUCTIVE_MIGRATION_FORBIDDEN");
  }
}

export async function planApplicationMigrationsReadOnly(sql: SqlClient) {
  const migrations = readMigrationFiles({ migrationsFolder: "drizzle/migrations" });
  assertProductionMigrationsForwardOnly(migrations);
  return sql.begin(async (tx) => {
    await tx`SET TRANSACTION READ ONLY`;
    const [identity] = await tx<{ expected_user: boolean }[]>`
      SELECT current_user::text = ${MIGRATION_ROLE}::text
        AND session_user::text = ${MIGRATION_ROLE}::text AS expected_user
    `;
    if (identity?.expected_user !== true) throw new Error("MIGRATION_ROLE_MISMATCH");
    const [schema] = await tx<{ exists: boolean }[]>`
      SELECT to_regnamespace(${MIGRATION_SCHEMA}::text) IS NOT NULL AS exists
    `;
    if (schema?.exists !== true) throw new Error("MIGRATION_SCHEMA_MISSING");
    const [table] = await tx<{ exists: boolean }[]>`
      SELECT to_regclass(${`${MIGRATION_SCHEMA}.__drizzle_migrations`}::text) IS NOT NULL AS exists
    `;
    let latestCreatedAt: number | null = null;
    if (table?.exists) {
      const [last] = await tx<{ created_at: string | number }[]>`
        SELECT created_at FROM "drizzle"."__drizzle_migrations"
        ORDER BY created_at DESC LIMIT 1
      `;
      if (last) latestCreatedAt = Number(last.created_at);
    }
    const pending = migrations.filter((migration) =>
      latestCreatedAt === null || latestCreatedAt < migration.folderMillis,
    );
    return {
      migrationCount: migrations.length,
      appliedThrough: latestCreatedAt,
      pendingCount: pending.length,
      pendingHashes: pending.map((migration) => migration.hash),
    };
  });
}

export async function executeApplicationMigrations(sql: SqlClient, options: { productionForwardOnly?: boolean } = {}) {
  await sql.begin(async (tx) => {
    mark("migration-validate-infrastructure");
    // Coordinate with app-only reset. The surrounding CI workflow also locks
    // the shared branch; this lock protects history selection within a DB.
    await tx`SELECT pg_advisory_xact_lock(89421732)`;
    const [infrastructure] = await tx<{
      expected_user: boolean;
      schema_exists: boolean;
      expected_owner: boolean;
      metadata_usage: boolean;
      metadata_create: boolean;
      application_usage: boolean;
      application_create: boolean;
      database_create: boolean;
    }[]>`
      WITH target AS (
        SELECT
          (SELECT oid FROM pg_roles WHERE rolname::text = ${MIGRATION_ROLE}::text) AS role_oid,
          to_regnamespace(${MIGRATION_SCHEMA}::text)::oid AS metadata_oid,
          to_regnamespace(${APP_SCHEMA}::text)::oid AS application_oid
      )
      SELECT
        current_user::text = ${MIGRATION_ROLE}::text
          AND session_user::text = ${MIGRATION_ROLE}::text AS expected_user,
        metadata_oid IS NOT NULL AS schema_exists,
        (SELECT nspowner FROM pg_namespace WHERE oid = metadata_oid) = role_oid AS expected_owner,
        has_schema_privilege(role_oid::oid, metadata_oid::oid, 'USAGE'::text) AS metadata_usage,
        has_schema_privilege(role_oid::oid, metadata_oid::oid, 'CREATE'::text) AS metadata_create,
        has_schema_privilege(role_oid::oid, application_oid::oid, 'USAGE'::text) AS application_usage,
        has_schema_privilege(role_oid::oid, application_oid::oid, 'CREATE'::text) AS application_create,
        has_database_privilege(role_oid::oid, current_database()::text, 'CREATE'::text) AS database_create
      FROM target
    `;
    if (infrastructure?.expected_user !== true) throw new Error("MIGRATION_ROLE_MISMATCH");
    if (infrastructure.schema_exists !== true) throw new Error("MIGRATION_SCHEMA_MISSING");
    if (infrastructure.expected_owner !== true) throw new Error("MIGRATION_SCHEMA_OWNER_MISMATCH");
    if (infrastructure.metadata_usage !== true || infrastructure.metadata_create !== true) {
      throw new Error("MIGRATION_METADATA_SCHEMA_PRIVILEGES_INVALID");
    }
    if (infrastructure.application_usage !== true || infrastructure.application_create !== true) {
      throw new Error("MIGRATION_APPLICATION_SCHEMA_PRIVILEGES_INVALID");
    }
    if (infrastructure.database_create !== false) throw new Error("MIGRATION_DATABASE_CREATE_FORBIDDEN");

    mark("migration-load-files");
    // Public Drizzle reader preserves journal order, breakpoint splitting,
    // SHA-256 of the complete artifact, and journal `when` as folderMillis.
    const migrations = readMigrationFiles({ migrationsFolder: "drizzle/migrations" });
    if (migrations.some((migration) => migration.sql.some((statement) => /\bCREATE\s+SCHEMA\b/i.test(statement)))) {
      throw new Error("MIGRATION_SCHEMA_DDL_FORBIDDEN");
    }
    if (options.productionForwardOnly) assertProductionMigrationsForwardOnly(migrations);

    mark("migration-read-history");
    // Exact history shape used by drizzle-orm 0.45.2 PgDialect.migrate.
    // Both schemas are bootstrap infrastructure; only the table is created here.
    await tx`CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )`;
    const [last] = await tx<{ id: number; hash: string; created_at: string | number }[]>`
      SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations"
      ORDER BY created_at DESC LIMIT 1
    `;
    // Match Drizzle's fixed latest-history cutoff and artifact order. All
    // pending statements and history inserts commit or roll back together.
    for (const migration of migrations) {
      if (last && Number(last.created_at) >= migration.folderMillis) continue;
      mark("migration-apply");
      for (const statement of migration.sql) {
        // Trusted repository SQL artifacts, never credentials or user input.
        // Direct postgres.js execution preserves native SQLSTATE without an ORM wrapper.
        await tx.unsafe(statement);
      }
      mark("migration-record-history");
      await tx`INSERT INTO "drizzle"."__drizzle_migrations" ("hash", "created_at")
        VALUES (${migration.hash}::text, ${migration.folderMillis}::bigint)`;
    }
  });
}
