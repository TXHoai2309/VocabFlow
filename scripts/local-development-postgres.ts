import postgres from "postgres";
import { executeApplicationMigrations } from "./db-migration-executor";
import { openSql } from "./db-core";
import { createLoginRole, ROLE_NAMES } from "./db-bootstrap";
import { parseRoleCredential } from "./db-credentials";

const DATABASE = "vocabflow_dev";
const HOST = "127.0.0.1";
const PORT = "55432";
const ADMIN_ROLE = "vocabflow_local_admin";
const BOOTSTRAP_ROLE = "vocabflow_identity_bootstrap";

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name}_REQUIRED`);
  return value;
}

function assertLocalUrl(name: string, url: string, role: string) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("LOCAL_DATABASE_URL_INVALID");
  }
  if (!new Set(["postgres:", "postgresql:"]).has(parsed.protocol)
    || parsed.hostname !== HOST || parsed.port !== PORT || parsed.pathname !== `/${DATABASE}`
    || decodeURIComponent(parsed.username) !== role || parsed.password.length < 20) {
    throw new Error(`${name}_LOCAL_TARGET_MISMATCH`);
  }
}

function localMode() {
  if (process.env.VOCABFLOW_ENV !== "development" || process.env.DATABASE_ENV !== "development"
    || process.env.EXECUTION_CONTEXT !== "local-development" || process.env.VERCEL_ENV
    || process.env.DATABASE_DRIVER !== "postgres-js") throw new Error("LOCAL_DEVELOPMENT_ENVIRONMENT_REQUIRED");
}

function credentialsFromEnvironment() {
  const provisionUrl = required("DATABASE_IDENTITY_PROVISION_URL");
  const migrationUrl = required("DATABASE_MIGRATION_URL");
  const runtimeUrl = required("DATABASE_URL");
  assertLocalUrl("DATABASE_IDENTITY_PROVISION_URL", provisionUrl, ROLE_NAMES.provision);
  assertLocalUrl("DATABASE_MIGRATION_URL", migrationUrl, ROLE_NAMES.migration);
  assertLocalUrl("DATABASE_URL", runtimeUrl, ROLE_NAMES.runtime);
  return {
    provision: parseRoleCredential(provisionUrl, ROLE_NAMES.provision),
    migration: parseRoleCredential(migrationUrl, ROLE_NAMES.migration),
    runtime: parseRoleCredential(runtimeUrl, ROLE_NAMES.runtime),
  };
}

async function bootstrap() {
  localMode();
  const adminUrl = required("LOCAL_ADMIN_DATABASE_URL");
  assertLocalUrl("LOCAL_ADMIN_DATABASE_URL", adminUrl, ADMIN_ROLE);
  const bootstrapUrl = required("BOOTSTRAP_DATABASE_URL");
  assertLocalUrl("BOOTSTRAP_DATABASE_URL", bootstrapUrl, BOOTSTRAP_ROLE);
  const credentials = credentialsFromEnvironment();
  const admin = postgres(adminUrl, { max: 1, prepare: false, onnotice: () => undefined });
  try {
    const [connection] = await admin`SELECT current_database() AS database_name, session_user AS session_user`;
    if (connection?.database_name !== DATABASE || connection.session_user !== ADMIN_ROLE) throw new Error("LOCAL_ADMIN_DATABASE_IDENTITY_MISMATCH");
    const parsedBootstrap = new URL(bootstrapUrl);
    await admin.begin(async (tx) => {
      const [existingBootstrap] = await tx<{ rolname: string; rolcanlogin: boolean; rolcreatedb: boolean; rolcreaterole: boolean; rolsuper: boolean }[]>`
        SELECT rolname, rolcanlogin, rolcreatedb, rolcreaterole, rolsuper FROM pg_roles WHERE rolname = ${BOOTSTRAP_ROLE}
      `;
      if (!existingBootstrap) {
        await createLoginRole(tx, BOOTSTRAP_ROLE, decodeURIComponent(parsedBootstrap.password));
        await tx.unsafe(`ALTER ROLE "${BOOTSTRAP_ROLE}" CREATEROLE`);
      } else if (!existingBootstrap.rolcanlogin || existingBootstrap.rolcreatedb
        || !existingBootstrap.rolcreaterole || existingBootstrap.rolsuper) {
        throw new Error("LOCAL_BOOTSTRAP_ROLE_MODEL_MISMATCH");
      }

      const roleCredentials = [
        [ROLE_NAMES.provision, credentials.provision.password],
        [ROLE_NAMES.migration, credentials.migration.password],
        [ROLE_NAMES.runtime, credentials.runtime.password],
      ] as const;
      const existingRoles = await tx<{ rolname: string }[]>`
        SELECT rolname FROM pg_roles WHERE rolname = ANY(${tx.array(roleCredentials.map(([name]) => name))}::text[])
      `;
      const existingNames = new Set(existingRoles.map((row) => row.rolname));
      if (!existingNames.has(ROLE_NAMES.owner)) {
        await tx.unsafe(`CREATE ROLE "${ROLE_NAMES.owner}" NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
      }
      for (const [roleName, password] of roleCredentials) {
        if (!existingNames.has(roleName)) await createLoginRole(tx, roleName, password);
      }

      await tx.unsafe(`REVOKE ALL ON DATABASE "${DATABASE}" FROM PUBLIC`);
      await tx.unsafe(`GRANT CONNECT ON DATABASE "${DATABASE}" TO "${BOOTSTRAP_ROLE}", "${ROLE_NAMES.provision}", "${ROLE_NAMES.migration}", "${ROLE_NAMES.runtime}"`);
      await tx.unsafe(`REVOKE CREATE ON SCHEMA public FROM PUBLIC`);

      for (const [schemaName, owner] of [["vocabflow_app", ROLE_NAMES.migration], ["drizzle", ROLE_NAMES.migration], ["vocabflow_meta", ROLE_NAMES.owner]] as const) {
        const [schema] = await tx<{ owner: string | null }[]>`
          SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname = ${schemaName}
        `;
        if (!schema) await tx.unsafe(`CREATE SCHEMA "${schemaName}" AUTHORIZATION "${owner}"`);
        else if (schema.owner !== owner) throw new Error("LOCAL_SCHEMA_OWNER_MISMATCH");
        await tx.unsafe(`REVOKE ALL ON SCHEMA "${schemaName}" FROM PUBLIC`);
      }
      await tx.unsafe(`GRANT USAGE, CREATE ON SCHEMA "drizzle" TO "${ROLE_NAMES.migration}"`);
      await tx.unsafe(`GRANT USAGE, CREATE ON SCHEMA "vocabflow_app" TO "${ROLE_NAMES.migration}"`);
      await tx.unsafe(`GRANT USAGE ON SCHEMA "vocabflow_app" TO "${ROLE_NAMES.runtime}"`);
      await tx.unsafe(`GRANT USAGE ON SCHEMA "vocabflow_meta" TO "${ROLE_NAMES.provision}", "${ROLE_NAMES.migration}", "${ROLE_NAMES.runtime}"`);
      await tx.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE "${ROLE_NAMES.migration}" IN SCHEMA "vocabflow_app" GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO "${ROLE_NAMES.runtime}"`);
      await tx.unsafe(`ALTER DEFAULT PRIVILEGES FOR ROLE "${ROLE_NAMES.migration}" IN SCHEMA "vocabflow_app" GRANT USAGE, SELECT ON SEQUENCES TO "${ROLE_NAMES.runtime}"`);

      await tx.unsafe(`SET LOCAL ROLE "${ROLE_NAMES.owner}"`);
      await tx.unsafe(`CREATE TABLE IF NOT EXISTS "vocabflow_meta"."bootstrap_metadata" (
        id smallint PRIMARY KEY CHECK (id = 1), version integer NOT NULL CHECK (version = 1)
      )`);
      await tx.unsafe(`INSERT INTO "vocabflow_meta"."bootstrap_metadata" (id, version) VALUES (1, 1) ON CONFLICT (id) DO NOTHING`);
      await tx.unsafe(`CREATE TABLE IF NOT EXISTS "vocabflow_meta"."environment_identity" (
        id smallint PRIMARY KEY CHECK (id = 1),
        environment text NOT NULL CHECK (environment IN ('development','test','production')),
        provider text NOT NULL CHECK (provider = 'neon'),
        project_id text NOT NULL,
        branch_id text NOT NULL,
        identity_version integer NOT NULL CHECK (identity_version = 1),
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await tx.unsafe(`CREATE TABLE IF NOT EXISTS "vocabflow_meta"."local_environment" (
        environment text NOT NULL CHECK (environment = 'development'),
        provider text NOT NULL CHECK (provider = 'docker-local'),
        database_name text PRIMARY KEY CHECK (database_name = 'vocabflow_dev'),
        host text NOT NULL CHECK (host = '127.0.0.1'),
        port integer NOT NULL CHECK (port = 55432),
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
      await tx`INSERT INTO vocabflow_meta.local_environment (environment, provider, database_name, host, port)
        VALUES ('development', 'docker-local', ${DATABASE}, ${HOST}, ${Number(PORT)})
        ON CONFLICT (database_name) DO NOTHING`;
      await tx.unsafe("RESET ROLE");
      await tx.unsafe(`GRANT SELECT ON "vocabflow_meta"."bootstrap_metadata" TO "${ROLE_NAMES.provision}", "${ROLE_NAMES.migration}", "${ROLE_NAMES.runtime}"`);
      await tx.unsafe(`GRANT SELECT, INSERT ON "vocabflow_meta"."environment_identity" TO "${ROLE_NAMES.provision}"`);
      await tx.unsafe(`GRANT SELECT ON "vocabflow_meta"."environment_identity" TO "${ROLE_NAMES.migration}", "${ROLE_NAMES.runtime}"`);
      await tx.unsafe(`GRANT SELECT ON "vocabflow_meta"."local_environment" TO "${BOOTSTRAP_ROLE}", "${ROLE_NAMES.migration}", "${ROLE_NAMES.runtime}"`);

      const [staging] = await tx<{ owner: string | null }[]>`
        SELECT pg_get_userbyid(nspowner) AS owner FROM pg_namespace WHERE nspname = 'vocabflow_editorial_staging'
      `;
      if (!staging) await tx.unsafe(`CREATE SCHEMA "vocabflow_editorial_staging" AUTHORIZATION "${BOOTSTRAP_ROLE}"`);
      else if (staging.owner !== BOOTSTRAP_ROLE) throw new Error("LOCAL_STAGING_SCHEMA_OWNER_MISMATCH");
      await tx.unsafe(`REVOKE ALL ON SCHEMA "vocabflow_editorial_staging" FROM PUBLIC`);
      await tx.unsafe(`GRANT USAGE, CREATE ON SCHEMA "vocabflow_editorial_staging" TO "${BOOTSTRAP_ROLE}"`);
      await tx.unsafe(`GRANT USAGE ON SCHEMA "vocabflow_editorial_staging" TO "${ROLE_NAMES.migration}"`);
    });
  } finally {
    await admin.end({ timeout: 5 });
  }
  console.log("LOCAL_POSTGRES_BOOTSTRAP=PASS");
  console.log("LOCAL_TARGET=127.0.0.1:55432/vocabflow_dev");
  console.log("NEON_CONNECTIONS=0");
}

async function migrate() {
  localMode();
  const migrationUrl = required("DATABASE_MIGRATION_URL");
  assertLocalUrl("DATABASE_MIGRATION_URL", migrationUrl, ROLE_NAMES.migration);
  const sql = openSql(migrationUrl);
  try {
    const [identity] = await sql<{ database_name: string; session_user: string; environment: string | null; provider: string | null }[]>`
      SELECT current_database() AS database_name, session_user AS session_user,
        (SELECT environment FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS environment,
        (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS provider
    `;
    if (identity?.database_name !== DATABASE || identity.session_user !== ROLE_NAMES.migration
      || identity.environment !== "development" || identity.provider !== "docker-local") {
      throw new Error("LOCAL_MIGRATION_TARGET_VERIFICATION_FAILED");
    }
    await executeApplicationMigrations(sql);
    const [tables] = await sql<{ vocabulary: boolean; projection: boolean; topics: boolean; sets: boolean }[]>`
      SELECT to_regclass('vocabflow_app.vocabularies') IS NOT NULL AS vocabulary,
        to_regclass('vocabflow_app.master_v2_development_projections') IS NOT NULL AS projection,
        to_regclass('vocabflow_app.topics') IS NOT NULL AS topics,
        to_regclass('vocabflow_app.learning_sets') IS NOT NULL AS sets
    `;
    if (!tables?.vocabulary || !tables.projection || !tables.topics || !tables.sets) throw new Error("LOCAL_SCHEMA_MIGRATION_INCOMPLETE");
  } finally {
    await sql.end({ timeout: 5 });
  }
  console.log("LOCAL_POSTGRES_MIGRATIONS=PASS");
  console.log("MIGRATION_ROLE=vocabflow_migration");
}

async function verify() {
  localMode();
  const runtimeUrl = required("DATABASE_URL");
  assertLocalUrl("DATABASE_URL", runtimeUrl, ROLE_NAMES.runtime);
  const sql = openSql(runtimeUrl);
  try {
    const [identity] = await sql<{ database_name: string; session_user: string; provider: string; schemas: string[]; version: string }[]>`
      SELECT current_database() AS database_name, session_user AS session_user,
        (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name = current_database()) AS provider,
        ARRAY(SELECT nspname FROM pg_namespace WHERE nspname IN ('vocabflow_app','vocabflow_meta','drizzle','vocabflow_editorial_staging') ORDER BY nspname) AS schemas,
        current_setting('server_version') AS version
    `;
    if (identity?.database_name !== DATABASE || identity.session_user !== ROLE_NAMES.runtime || identity.provider !== "docker-local"
      || identity.schemas?.length !== 4) throw new Error("LOCAL_DATABASE_READBACK_FAILED");
    const [counts] = await sql<{ vocabularies: number; v2_projections: number; progress: number; reviews: number }[]>`
      SELECT count(*)::int AS vocabularies,
        (SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS v2_projections,
        (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress,
        (SELECT count(*)::int FROM vocabflow_app.review_events) AS reviews
      FROM vocabflow_app.vocabularies
    `;
    console.log(JSON.stringify({ localDatabase: identity.database_name, localRole: identity.session_user,
      postgresVersion: identity.version, schemas: identity.schemas, counts }, null, 2));
  } finally {
    await sql.end({ timeout: 5 });
  }
}

const command = process.argv[2];
const run = command === "bootstrap" ? bootstrap : command === "migrate" ? migrate : command === "verify" ? verify : null;
if (!run) {
  console.error("USAGE=local-development-postgres.ts <bootstrap|migrate|verify>");
  process.exitCode = 2;
} else {
  run().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "LOCAL_POSTGRES_OPERATION_FAILED";
    console.error(/^[A-Z][A-Z0-9_]{2,100}$/.test(message) ? message : "LOCAL_POSTGRES_OPERATION_FAILED");
    process.exitCode = 1;
  });
}
