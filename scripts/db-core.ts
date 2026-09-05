import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { DATABASE_RESET_POLICY } from "../config/database-reset-policy";
import { getConnectionTarget, isConfiguredTarget } from "../config/database-targets";
import { configuredDatabaseUrl } from "./runtime-validation";
import type { DatabasePurpose, DatabaseTarget, Environment, ExecutionContext } from "@vocabflow/contracts";
import { canonicalIdentityMatches, databasePurposeSchema, executionContextSchema, environmentSchema } from "@vocabflow/contracts";

export const BOOTSTRAP_METADATA_VERSION = 1;
export const PROTECTED_SCHEMA = "vocabflow_meta";
export const PROTECTED_IDENTITY_TABLE = "environment_identity";

export function readContext(): { context: ExecutionContext; environment: Environment } {
  const context = executionContextSchema.parse(process.env.EXECUTION_CONTEXT ?? "local-development");
  const environment = environmentSchema.parse(process.env.VOCABFLOW_ENV ?? "development");
  return { context, environment };
}

export function resolvePurpose(value: string | undefined): DatabasePurpose {
  return databasePurposeSchema.parse(value ?? "runtime");
}

export function openSql(url: string) {
  return postgres(url, { max: 1, idle_timeout: 10, connect_timeout: 10, onnotice: () => undefined });
}

export function applicationDb(url: string) {
  const sql = openSql(url);
  return { sql, db: drizzle(sql) };
}

export async function runMigrations(url: string, expected?: DatabaseTarget) {
  const { sql, db } = applicationDb(url);
  try {
    if (expected) await assertPostConnectIdentity(sql, expected);
    await migrate(db, { migrationsFolder: "drizzle/migrations" });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function assertPostConnectIdentity(sql: ReturnType<typeof openSql>, expected: DatabaseTarget) {
  const [existence] = await sql<{ exists: boolean }[]>`
    SELECT to_regclass(${`${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`}) IS NOT NULL AS exists
  `;
  if (!existence?.exists) throw new Error("PROTECTED_METADATA_MISSING");
  const rows = await sql<{ id: number; environment: Environment; provider: "neon"; project_id: string; branch_id: string; identity_version: number }[]>`
    SELECT id, environment, provider, project_id, branch_id, identity_version
    FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."${PROTECTED_IDENTITY_TABLE}"`)}
    ORDER BY id
  `;
  if (rows.length !== 1 || rows[0]?.id !== 1) throw new Error("CANONICAL_IDENTITY_INVALID");
  const identity = rows[0];
  if (!canonicalIdentityMatches({
    environment: identity.environment,
    provider: identity.provider,
    projectId: identity.project_id,
    branchId: identity.branch_id,
    identityVersion: identity.identity_version as 1
  }, expected)) throw new Error("DATABASE_IDENTITY_MISMATCH");
  return identity;
}

export async function readMigrationState(sql: ReturnType<typeof openSql>) {
  const [exists] = await sql<{ exists: boolean }[]>`
    SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists
  `;
  if (!exists?.exists) return 0;
  const [row] = await sql<{ count: string }[]>`SELECT count(*)::text AS count FROM "drizzle"."__drizzle_migrations"`;
  return Number(row?.count ?? 0);
}

export function getTargetForContext(context: ExecutionContext, purpose: DatabasePurpose) {
  const environment = context === "ci-test" ? "test" : context === "cloudflare-production" ? "production" : "development";
  const target = getConnectionTarget(environment, purpose);
  if (!isConfiguredTarget(target)) throw new Error("UNCONFIGURED_DATABASE_TARGET");
  return target;
}

export function getUrlForContext(context: ExecutionContext, purpose: DatabasePurpose = "runtime"): string {
  const url = configuredDatabaseUrl(context, purpose);
  if (!url) {
    if (context === "ci-test" && (purpose === "integration-test" || purpose === "migration")) throw new Error("SKIPPED_NO_TEST_DATABASE_SECRET");
    throw new Error(`${purpose.toUpperCase().replaceAll("-", "_")}_DATABASE_URL_REQUIRED`);
  }
  return url;
}

export async function assertProtectedState(sql: ReturnType<typeof openSql>) {
  const existence = await sql<{ schema_name: string | null; identity_table: string | null }[]>`
    SELECT to_regnamespace(${PROTECTED_SCHEMA})::text AS schema_name,
      to_regclass(${`${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`})::text AS identity_table
  `;
  const row = existence[0];
  if (!row || row.schema_name !== PROTECTED_SCHEMA || row.identity_table !== `${PROTECTED_SCHEMA}.${PROTECTED_IDENTITY_TABLE}`) {
    throw new Error("PROTECTED_METADATA_MISSING");
  }
  const rows = await sql<{ identity_count: string }[]>`SELECT count(*)::text AS identity_count FROM ${sql.unsafe(`"${PROTECTED_SCHEMA}"."${PROTECTED_IDENTITY_TABLE}"`)} `;
  const identityCount = rows[0]?.identity_count;
  if (identityCount !== "1") throw new Error("CANONICAL_IDENTITY_INVALID");
}

export async function assertMigrationStateZero(sql: ReturnType<typeof openSql>) {
  if ((await readMigrationState(sql)) !== 0) throw new Error("CLEAN_MIGRATION_NOT_FRESH");
}

export async function assertApplicationTablesAbsent(sql: ReturnType<typeof openSql>) {
  const tables = DATABASE_RESET_POLICY.applicationTables.map((name) => name.split(".")[1]);
  if (tables.length === 0) return;
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${sql.array(tables)})
  `;
  if (rows[0]?.count !== "0") throw new Error("APPLICATION_SCHEMA_NOT_EMPTY");
}

export async function assertApplicationTablesPresent(sql: ReturnType<typeof openSql>) {
  const tables = DATABASE_RESET_POLICY.applicationTables.map((name) => name.split(".")[1]);
  if (tables.length === 0) return;
  const rows = await sql<{ count: string }[]>`
    SELECT count(*)::text AS count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ANY(${sql.array(tables)})
  `;
  if (rows[0]?.count !== String(tables.length)) throw new Error("APPLICATION_SCHEMA_INCOMPLETE");
}
