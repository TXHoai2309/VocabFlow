import { loadEnvFile } from "node:process";
import { getConnectionTarget } from "../config/database-targets";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { assertResolvedTargetBeforeMutation, assertMarkers } from "./runtime-validation";

const SCHEMA = "vocabflow_editorial_staging";
const TARGET = { projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", databaseName: "neondb", endpointId: "ep-small-shadow-b3ny4993" };
const TABLES = ["media_mapping_review_events_v1", "media_rights_review_events_v1"] as const;

async function connectBootstrap() {
  const { context, environment } = readContext();
  assertMarkers(context, "dev-launcher", environment);
  if (context !== "local-development" || environment !== "development" || process.env.DATABASE_ENV !== "development") {
    throw new Error("MEDIA_REVIEW_SCHEMA_REQUIRES_LOCAL_DEVELOPMENT");
  }
  const target = getConnectionTarget("development", "bootstrap");
  if (target.projectId !== TARGET.projectId || target.branchId !== TARGET.branchId || target.databaseName !== TARGET.databaseName) {
    throw new Error("MEDIA_REVIEW_SCHEMA_TARGET_MISMATCH");
  }
  const resolved = await assertResolvedTargetBeforeMutation({
    context,
    source: "dev-launcher",
    environment,
    purpose: "bootstrap",
    operation: "db-migrate",
    target,
  });
  const sql = openSql(resolved.url);
  try {
    await assertPostConnectIdentity(sql, target);
    const identity = await sql`SELECT current_database() AS database_name, current_user AS role_name,
      (SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id,
      (SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id`;
    const url = new URL(resolved.url);
    const endpoint = url.hostname.split(".")[0]?.replace(/-pooler$/u, "");
    if (identity[0]?.database_name !== TARGET.databaseName || identity[0]?.role_name !== "vocabflow_identity_bootstrap"
      || identity[0]?.project_id !== TARGET.projectId || identity[0]?.branch_id !== TARGET.branchId || endpoint !== TARGET.endpointId) {
      throw new Error("MEDIA_REVIEW_SCHEMA_DATABASE_IDENTITY_MISMATCH");
    }
    return { sql, target };
  } catch (error) {
    await sql.end({ timeout: 5 });
    throw error;
  }
}

async function provisionReviewTables() {
  const { sql } = await connectBootstrap();
  try {
    await sql.begin(async (tx) => {
      const isolation = await tx`SELECT pg_get_userbyid(n.nspowner) AS schema_owner,
        has_schema_privilege('vocabflow_runtime', n.oid, 'USAGE') AS runtime_usage,
        has_schema_privilege('vocabflow_identity_bootstrap', n.oid, 'CREATE') AS bootstrap_create
        FROM pg_namespace n WHERE n.nspname = ${SCHEMA}`;
      if (isolation[0]?.schema_owner !== "vocabflow_identity_bootstrap" || isolation[0]?.runtime_usage !== false || isolation[0]?.bootstrap_create !== true) {
        throw new Error("MEDIA_REVIEW_STAGING_ISOLATION_PREFLIGHT_FAILED");
      }
      await tx.unsafe(`CREATE TABLE IF NOT EXISTS ${SCHEMA}.media_mapping_review_events_v1 (
        idempotency_key text PRIMARY KEY CHECK (idempotency_key ~ '^[0-9a-f-]{36}$'),
        event_sha256 text NOT NULL CHECK (event_sha256 ~ '^[0-9a-f]{64}$'),
        manifest_version text NOT NULL,
        mapping_bundle_version text NOT NULL,
        mapping_key text NOT NULL REFERENCES ${SCHEMA}.media_mappings_v2(mapping_key),
        media_sha256 text NOT NULL CHECK (media_sha256 ~ '^[0-9a-f]{64}$'),
        media_kind text NOT NULL,
        outcome text NOT NULL,
        source_note_id text NOT NULL,
        source_note_guid text NOT NULL,
        source_record_evidence_sha256 text NOT NULL CHECK (source_record_evidence_sha256 ~ '^[0-9a-f]{64}$'),
        target_lexeme_identity text,
        target_sense_proposal_key text,
        target_example_key text,
        target_content_fingerprint text CHECK (target_content_fingerprint IS NULL OR target_content_fingerprint ~ '^[0-9a-f]{64}$'),
        target_snapshot_fingerprint text NOT NULL CHECK (target_snapshot_fingerprint ~ '^[0-9a-f]{64}$'),
        reviewer_identity text NOT NULL,
        reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        evidence jsonb NOT NULL,
        CHECK ((media_kind = 'ILLUSTRATION_IMAGE' AND outcome IN ('ACCEPT_MAPPING','REJECT_MAPPING','AMBIGUOUS','NEEDS_REVIEW'))
          OR (media_kind = 'WORD_PRONUNCIATION_AUDIO' AND outcome IN ('EXACT_SUPPORTED_LEXEME_MATCH','PRONUNCIATION_VARIANT','HOMOGRAPH_DIFFERENT_PRONUNCIATION','AMBIGUOUS','INVALID_ASSOCIATION','NEEDS_REVIEW'))
          OR (media_kind = 'EXAMPLE_SENTENCE_AUDIO' AND outcome IN ('EXACT_TEXT_MATCH','SAFE_NORMALIZED_MATCH','DIFFERENT_SENTENCE','UNRESOLVED')))
      )`);
      await tx.unsafe(`CREATE TABLE IF NOT EXISTS ${SCHEMA}.media_rights_review_events_v1 (
        idempotency_key text PRIMARY KEY CHECK (idempotency_key ~ '^[0-9a-f-]{36}$'),
        event_sha256 text NOT NULL CHECK (event_sha256 ~ '^[0-9a-f]{64}$'),
        manifest_version text NOT NULL,
        media_sha256 text CHECK (media_sha256 IS NULL OR media_sha256 ~ '^[0-9a-f]{64}$'),
        evidence_group_id text,
        group_assets_fingerprint text CHECK (group_assets_fingerprint IS NULL OR group_assets_fingerprint ~ '^[0-9a-f]{64}$'),
        rights_status text NOT NULL CHECK (rights_status IN ('CLEARED_FOR_INTENDED_USE','INTERNAL_REFERENCE_ONLY','UNKNOWN_REVIEW_REQUIRED','RESTRICTED')),
        evidence_type text NOT NULL,
        evidence_url text,
        rights_holder text,
        intended_use text,
        reviewer_note text NOT NULL DEFAULT '',
        reviewer_identity text NOT NULL,
        reviewed_at timestamptz NOT NULL DEFAULT clock_timestamp(),
        CHECK ((media_sha256 IS NOT NULL AND evidence_group_id IS NULL AND group_assets_fingerprint IS NULL)
          OR (media_sha256 IS NULL AND evidence_group_id IS NOT NULL AND group_assets_fingerprint IS NOT NULL))
      )`);
      await tx.unsafe(`REVOKE ALL ON ${SCHEMA}.media_mapping_review_events_v1, ${SCHEMA}.media_rights_review_events_v1 FROM PUBLIC, vocabflow_runtime`);
      await tx.unsafe(`GRANT USAGE ON SCHEMA ${SCHEMA} TO vocabflow_migration`);
      await tx.unsafe(`GRANT SELECT, INSERT ON ${SCHEMA}.media_mapping_review_events_v1, ${SCHEMA}.media_rights_review_events_v1 TO vocabflow_migration`);
    });

    const result = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const tables = await tx`SELECT table_name FROM information_schema.tables WHERE table_schema = ${SCHEMA}
        AND table_name = ANY(${sql.array([...TABLES])}) ORDER BY table_name`;
      const grants = await tx`SELECT c.relname AS table_name,
        has_table_privilege('vocabflow_migration', c.oid, 'SELECT') AS migration_select,
        has_table_privilege('vocabflow_migration', c.oid, 'INSERT') AS migration_insert,
        has_table_privilege('vocabflow_migration', c.oid, 'UPDATE') AS migration_update,
        has_table_privilege('vocabflow_runtime', c.oid, 'SELECT') AS runtime_select,
        has_table_privilege('vocabflow_runtime', c.oid, 'INSERT') AS runtime_insert
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = ${SCHEMA} AND c.relname = ANY(${sql.array([...TABLES])}) ORDER BY c.relname`;
      const runtimeSchema = await tx`SELECT has_schema_privilege('vocabflow_runtime', ${SCHEMA}, 'USAGE') AS runtime_usage`;
      return { tables, grants, runtimeSchema: runtimeSchema[0]?.runtime_usage };
    });
    if (result.tables.length !== 2 || result.grants.length !== 2 || result.runtimeSchema !== false
      || result.grants.some((grant) => grant.migration_select !== true || grant.migration_insert !== true
        || grant.migration_update !== false || grant.runtime_select !== false || grant.runtime_insert !== false)) {
      throw new Error("MEDIA_REVIEW_STAGING_GRANTS_OR_READBACK_FAILED");
    }
    process.stdout.write("MEDIA_REVIEW_STAGING_TABLES=2\nMIGRATION_SELECT_INSERT_ONLY=PASS\nRUNTIME_ISOLATION=PASS\nSCHEMA_TARGET=DEVELOPMENT_ONLY\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  loadEnvFile(".env");
  if (process.argv[2] !== "--provision-review-staging-v1") throw new Error("Use --provision-review-staging-v1 for the additive Development-only review tables.");
  await provisionReviewTables();
}

main().catch((error: unknown) => {
  process.stderr.write((error instanceof Error ? error.message : "MEDIA_REVIEW_STAGING_PROVISION_FAILED") + "\n");
  process.exitCode = 1;
});
