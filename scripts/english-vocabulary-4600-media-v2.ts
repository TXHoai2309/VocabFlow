import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { getConnectionTarget } from "../config/database-targets";
import { bootstrapTargetForEnvironment } from "./bootstrap-target";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";

const ROOT = process.cwd();
const SCHEMA = "vocabflow_editorial_staging";
const VERSION = "english-vocabulary-4600-media-v2.0.0";
const MANIFEST = "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2/media-manifest-v2.json";
const APPLY_REPORT = "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2/neon-staging-apply-report.json";
const CURRENT_SNAPSHOT = "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2/current-effective-staging-snapshot-v1.json";
const MAPPING_BUNDLE = "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2/media-mapping-bundle-v1.json";
const RIGHTS_LEDGER = "vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2/media-rights-ledger-v1.json";
type Row = Record<string, unknown>;
type Manifest = { manifestVersion: string; source: Row; assets: Row[]; mappings: Row[]; report: Row };
type MappingBundle = { bundleVersion: string; source: Row; target: Row; counts: Row; statusCounts: Row; mappings: Row[] };
type RightsLedger = { ledgerVersion: string; counts: Row; assets: Row[] };
let activeStagePhase = "";

function hashText(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return "{" + Object.keys(row).sort().map((key) => JSON.stringify(key) + ":" + stable(row[key])).join(",") + "}";
  }
  return JSON.stringify(value) ?? "null";
}

function assertDevelopment() {
  const context = readContext();
  if (context.context !== "local-development" || context.environment !== "development"
    || process.env.VOCABFLOW_ENV !== "development" || process.env.DATABASE_ENV !== "development") {
    throw new Error("LOCAL_DEVELOPMENT_ONLY");
  }
  return context;
}

async function connectVerified(purpose: "bootstrap" | "migration" | "runtime") {
  const { context, environment } = assertDevelopment();
  const target = purpose === "bootstrap"
    ? bootstrapTargetForEnvironment(environment)
    : getConnectionTarget(environment, purpose);
  const verified = await assertResolvedTargetBeforeMutation({
    context,
    source: "dev-launcher",
    environment,
    purpose,
    operation: "db-check",
    target,
  });
  const sql = openSql(verified.url);
  try {
    await assertPostConnectIdentity(sql, target);
    const rows = await sql.unsafe("SELECT current_database() AS database_name, current_user AS role_name");
    if (rows[0]?.database_name !== "neondb" || rows[0]?.role_name !== target.roleName) {
      throw new Error("DEVELOPMENT_CONNECTION_IDENTITY_MISMATCH");
    }
    return { sql, target };
  } catch (error) {
    await sql.end({ timeout: 5 });
    throw error;
  }
}

async function inspectCurrentStagingSnapshotShape() {
  const connected = await connectVerified("bootstrap");
  const sql = connected.sql;
  try {
    const inspection = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const identity = await tx.unsafe(
        "SELECT current_database() AS database_name, current_user AS role_name, " +
        "current_setting('transaction_read_only') AS read_only, " +
        "(SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id, " +
        "(SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id"
      );
      const tables = await tx.unsafe(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_type = 'BASE TABLE' ORDER BY table_name",
        [SCHEMA]
      );
      const columns = await tx.unsafe(
        "SELECT table_name, column_name, data_type, is_nullable FROM information_schema.columns " +
        "WHERE table_schema = $1 ORDER BY table_name, ordinal_position", [SCHEMA]
      );
      const statuses = await tx.unsafe(
        "SELECT resolution_status, count(*)::text AS rows FROM " + SCHEMA + ".identity_registry " +
        "GROUP BY resolution_status ORDER BY resolution_status"
      );
      const proposalIntegrity = await tx.unsafe(
        "SELECT count(*)::text AS effective_identities, " +
        "count(*) FILTER (WHERE d.proposal_key IS NOT NULL)::text AS joined_proposals, " +
        "count(*) FILTER (WHERE d.editorial_status = 'DRAFT')::text AS effective_drafts, " +
        "count(*) FILTER (WHERE d.proposal_key IS NOT NULL AND d.effective_content_hash = i.effective_content_hash)::text AS matching_content_hashes, " +
        "count(*) FILTER (WHERE d.proposal_key IS NOT NULL AND d.editorial_status <> 'DRAFT')::text AS non_draft_effective_rows, " +
        "count(*) FILTER (WHERE i.effective_content_hash IS NULL OR i.effective_content_hash = '')::text AS missing_identity_hash, " +
        "count(*) FILTER (WHERE d.proposal_key IS NOT NULL AND (d.source_provenance IS NULL OR d.source_provenance = '{}'::jsonb))::text AS missing_draft_provenance " +
        "FROM " + SCHEMA + ".identity_registry i LEFT JOIN " + SCHEMA + ".draft_proposals d ON d.proposal_key = i.proposal_key " +
        "WHERE i.resolution_status = 'EFFECTIVE'"
      );
      const versions = await tx.unsafe(
        "SELECT cv.selection_status, count(*)::text AS rows, " +
        "count(DISTINCT cv.proposal_key)::text AS proposals " +
        "FROM " + SCHEMA + ".candidate_versions cv JOIN " + SCHEMA + ".identity_registry i ON i.proposal_key = cv.proposal_key " +
        "WHERE i.resolution_status = 'EFFECTIVE' GROUP BY cv.selection_status ORDER BY cv.selection_status"
      );
      const currentVersionIntegrity = await tx.unsafe(
        "SELECT count(*)::text AS effective_identities, " +
        "count(*) FILTER (WHERE selected.current_versions = 1)::text AS exactly_one_selected_hash, " +
        "count(*) FILTER (WHERE selected.current_versions = 0)::text AS no_selected_hash, " +
        "count(*) FILTER (WHERE selected.current_versions > 1)::text AS multiple_selected_hashes " +
        "FROM " + SCHEMA + ".identity_registry i LEFT JOIN LATERAL (" +
        "SELECT count(*) FILTER (WHERE cv.selection_status = 'EFFECTIVE' AND cv.candidate_content_hash = i.effective_content_hash) AS current_versions " +
        "FROM " + SCHEMA + ".candidate_versions cv WHERE cv.proposal_key = i.proposal_key" +
        ") selected ON true WHERE i.resolution_status = 'EFFECTIVE'"
      );
      const recoveryBatches = await tx.unsafe(
        "SELECT d.batch_id AS draft_batch_id, i.staging_batch_id AS identity_staging_batch_id, " +
        "count(*)::text AS effective_draft_rows, count(*) FILTER (WHERE d.effective_content_hash = i.effective_content_hash)::text AS hash_matches, " +
        "bool_or(ib.batch_id IS NOT NULL) AS registered_import_batch, max(ib.bundle_sha256) AS bundle_sha256, " +
        "max(ib.source_fingerprint) AS source_fingerprint, max(ib.completeness) AS completeness " +
        "FROM " + SCHEMA + ".identity_registry i JOIN " + SCHEMA + ".draft_proposals d ON d.proposal_key = i.proposal_key " +
        "LEFT JOIN " + SCHEMA + ".import_batches ib ON ib.batch_id = d.batch_id " +
        "WHERE i.resolution_status = 'EFFECTIVE' GROUP BY d.batch_id, i.staging_batch_id ORDER BY d.batch_id, i.staging_batch_id"
      );
      const importBatches = await tx.unsafe(
        "SELECT batch_id, bundle_sha256, source_fingerprint, completeness, group_count, proposal_count, imported_at " +
        "FROM " + SCHEMA + ".import_batches ORDER BY batch_id"
      );
      const samples = await tx.unsafe(
        "SELECT i.proposal_key, i.effective_content_hash, i.source_provenance AS identity_source_provenance, " +
        "d.source_provenance AS draft_source_provenance, " +
        "(SELECT jsonb_agg(jsonb_build_object('candidateHash', cv.candidate_content_hash, " +
        "'selectionStatus', cv.selection_status, 'artifactIdentity', cv.original_artifact_identity, " +
        "'sourceProvenanceReferences', cv.source_provenance_references) ORDER BY cv.candidate_content_hash) " +
        "FROM " + SCHEMA + ".candidate_versions cv WHERE cv.proposal_key = i.proposal_key) AS candidate_lineage " +
        "FROM " + SCHEMA + ".identity_registry i JOIN " + SCHEMA + ".draft_proposals d ON d.proposal_key = i.proposal_key " +
        "WHERE i.resolution_status = 'EFFECTIVE' ORDER BY i.proposal_key LIMIT 3"
      );
      return {
        identity: identity[0], tables, columns, statuses, proposalIntegrity: proposalIntegrity[0],
        versions, currentVersionIntegrity: currentVersionIntegrity[0], recoveryBatches, importBatches, samples,
      };
    });
    const samples = (inspection.samples as Row[]).map((row) => ({
      proposalKey: row.proposal_key,
      effectiveContentHash: row.effective_content_hash,
      identityProvenanceKeys: row.identity_source_provenance && typeof row.identity_source_provenance === "object"
        ? Object.keys(row.identity_source_provenance as Record<string, unknown>).sort() : [],
      draftProvenanceKeys: row.draft_source_provenance && typeof row.draft_source_provenance === "object"
        ? Object.keys(row.draft_source_provenance as Record<string, unknown>).sort() : [],
      candidateLineage: Array.isArray(row.candidate_lineage)
        ? (row.candidate_lineage as Row[]).map((candidate) => ({
          candidateHash: candidate.candidateHash,
          selectionStatus: candidate.selectionStatus,
          artifactIdentityKeys: candidate.artifactIdentity && typeof candidate.artifactIdentity === "object"
            ? Object.keys(candidate.artifactIdentity as Record<string, unknown>).sort() : [],
          sourceProvenanceReferenceCount: Array.isArray(candidate.sourceProvenanceReferences)
            ? candidate.sourceProvenanceReferences.length : 0,
        })) : [],
    }));
    process.stdout.write(JSON.stringify({
      target: { projectId: connected.target.projectId, branchId: connected.target.branchId, databaseName: "neondb", endpointId: "ep-small-shadow-b3ny4993" },
      databaseIdentity: inspection.identity,
      tables: inspection.tables,
      columns: inspection.columns,
      resolutionStatuses: inspection.statuses,
      proposalIntegrity: inspection.proposalIntegrity,
      effectiveCandidateVersions: inspection.versions,
      currentVersionIntegrity: inspection.currentVersionIntegrity,
      effectiveDraftRecoveryBatches: inspection.recoveryBatches,
      registeredImportBatches: inspection.importBatches,
      sampleProvenanceShape: samples,
    }, null, 2) + "\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function inspectMediaStagingIsolation() {
  const connected = await connectVerified("bootstrap");
  const sql = connected.sql;
  try {
    const result = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      return {
        database: await tx.unsafe(
          "SELECT current_database() AS database_name, current_user AS role_name, " +
          "current_setting('transaction_read_only') AS read_only, " +
          "(SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id, " +
          "(SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id"
        ),
        schema: await tx.unsafe(
          "SELECT n.nspname AS schema_name, pg_get_userbyid(n.nspowner) AS owner, " +
          "has_schema_privilege('vocabflow_identity_bootstrap', n.oid, 'USAGE') AS bootstrap_usage, " +
          "has_schema_privilege('vocabflow_identity_bootstrap', n.oid, 'CREATE') AS bootstrap_create, " +
          "has_schema_privilege('vocabflow_migration', n.oid, 'USAGE') AS migration_usage, " +
          "has_schema_privilege('vocabflow_migration', n.oid, 'CREATE') AS migration_create, " +
          "has_schema_privilege('vocabflow_runtime', n.oid, 'USAGE') AS runtime_usage, " +
          "has_schema_privilege('vocabflow_runtime', n.oid, 'CREATE') AS runtime_create " +
          "FROM pg_namespace n WHERE n.nspname = $1", [SCHEMA]
        ),
        roles: await tx.unsafe(
          "SELECT rolname, rolsuper, rolcreatedb, rolcreaterole, rolcanlogin FROM pg_roles " +
          "WHERE rolname IN ('vocabflow_identity_bootstrap', 'vocabflow_migration', 'vocabflow_runtime') ORDER BY rolname"
        ),
        mediaTables: await tx.unsafe(
          "SELECT to_regclass($1)::text AS media_assets_v2, to_regclass($2)::text AS media_mappings_v2, " +
          "to_regclass($3)::text AS media_rights_v1",
          [SCHEMA + ".media_assets_v2", SCHEMA + ".media_mappings_v2", SCHEMA + ".media_rights_v1"]
        ),
        mediaTablePrivileges: await tx.unsafe(
          "SELECT c.relname AS table_name, has_table_privilege('vocabflow_runtime', c.oid, 'SELECT') AS runtime_select, " +
          "has_table_privilege('vocabflow_runtime', c.oid, 'INSERT') AS runtime_insert, " +
          "has_table_privilege('vocabflow_runtime', c.oid, 'UPDATE') AS runtime_update, " +
          "has_table_privilege('vocabflow_migration', c.oid, 'SELECT') AS migration_select, " +
          "has_table_privilege('vocabflow_migration', c.oid, 'INSERT') AS migration_insert " +
          "FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace " +
          "WHERE n.nspname = $1 AND c.relname IN ('media_assets_v2','media_mappings_v2','media_rights_v1') " +
          "AND c.relkind = 'r' ORDER BY c.relname", [SCHEMA]
        ),
        runtimeTables: await tx.unsafe(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'vocabflow_app' " +
          "AND table_type = 'BASE TABLE' ORDER BY table_name"
        ),
      };
    });
    const runtimeTableCounts: Row[] = [];
    for (const row of result.runtimeTables as Row[]) {
      const tableName = String(row.table_name).replace(/"/g, "\"\"");
      const counts = await sql.unsafe("SELECT count(*)::text AS rows FROM \"vocabflow_app\".\"" + tableName + "\"");
      runtimeTableCounts.push({ table_name: row.table_name, rows: counts[0]?.rows });
    }
    const mediaTables = result.mediaTables[0] as Row | undefined;
    const privilegeRows = result.mediaTablePrivileges as Row[];
    const mediaTableNames = ["media_assets_v2", "media_mappings_v2", "media_rights_v1"];
    const tablesAbsent = mediaTableNames.every((name) => mediaTables?.[name] === null);
    const tablesPresentAndIsolated = mediaTableNames.every((name) => typeof mediaTables?.[name] === "string")
      && privilegeRows.length === mediaTableNames.length
      && privilegeRows.every((row) => row.runtime_select === false && row.runtime_insert === false && row.runtime_update === false
        && row.migration_select === true && row.migration_insert === true);
    const canSafelyStageMetadata = result.database[0]?.database_name === "neondb"
      && result.database[0]?.project_id === connected.target.projectId
      && result.database[0]?.branch_id === connected.target.branchId
      && result.database[0]?.read_only === "on"
      && result.schema[0]?.owner === "vocabflow_identity_bootstrap"
      && result.schema[0]?.bootstrap_create === true
      && result.schema[0]?.migration_create === false
      && result.schema[0]?.runtime_usage === false
      && result.schema[0]?.runtime_create === false
      && (tablesAbsent || tablesPresentAndIsolated);
    process.stdout.write(JSON.stringify({
      requestedTarget: { projectId: connected.target.projectId, branchId: connected.target.branchId, databaseName: "neondb" },
      database: result.database,
      schema: result.schema,
      roles: result.roles,
      mediaTables: result.mediaTables,
      mediaTablePrivileges: result.mediaTablePrivileges,
      runtimeTables: runtimeTableCounts,
      canSafelyStageMetadata,
    }, null, 2) + "\n");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function exportCurrentEffectiveStagingSnapshot() {
  const connected = await connectVerified("bootstrap");
  const sql = connected.sql;
  try {
    const captured = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const dbIdentity = await tx.unsafe(
        "SELECT current_database() AS database_name, current_user AS role_name, " +
        "current_setting('transaction_read_only') AS read_only, " +
        "(SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id, " +
        "(SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id"
      );
      const statuses = await tx.unsafe(
        "SELECT resolution_status, count(*)::text AS rows FROM " + SCHEMA + ".identity_registry " +
        "GROUP BY resolution_status ORDER BY resolution_status"
      );
      const allIdentities = await tx.unsafe(
        "SELECT proposal_key, source_group_key, resolution_status, trim(coalesce(effective_content_hash, '')) AS effective_content_hash, " +
        "rights_status, trim(staging_batch_id) AS staging_batch_id, source_provenance " +
        "FROM " + SCHEMA + ".identity_registry ORDER BY proposal_key"
      );
      const effectiveRows = await tx.unsafe(
        "SELECT i.proposal_key, i.source_group_key, i.resolution_status, trim(i.effective_content_hash) AS identity_content_hash, " +
        "i.rights_status AS identity_rights_status, trim(i.staging_batch_id) AS identity_staging_batch_id, " +
        "i.source_provenance AS identity_source_provenance, d.candidate_group_key, d.headword, d.part_of_speech, " +
        "d.sense_identity, d.definition_en, d.meaning_vi, d.examples, d.usage_notes, d.display_form, " +
        "trim(d.effective_content_hash) AS draft_content_hash, d.editorial_status, d.rights_status AS draft_rights_status, " +
        "trim(d.batch_id) AS draft_batch_id, d.source_provenance AS draft_source_provenance, " +
        "coalesce((SELECT jsonb_agg(jsonb_build_object(" +
        "'candidateContentHash', trim(cv.candidate_content_hash), 'selectionStatus', cv.selection_status, " +
        "'stagingBatchId', trim(cv.staging_batch_id), 'originalArtifactIdentity', cv.original_artifact_identity, " +
        "'sourceProvenanceReferences', cv.source_provenance_references) ORDER BY cv.candidate_content_hash) " +
        "FROM " + SCHEMA + ".candidate_versions cv WHERE cv.proposal_key = i.proposal_key), '[]'::jsonb) AS candidate_versions " +
        "FROM " + SCHEMA + ".identity_registry i JOIN " + SCHEMA + ".draft_proposals d ON d.proposal_key = i.proposal_key " +
        "WHERE i.resolution_status = 'EFFECTIVE' ORDER BY i.proposal_key"
      );
      const batchRows = await tx.unsafe(
        "SELECT ib.batch_id, ib.bundle_sha256, ib.source_fingerprint, ib.completeness, ib.group_count, ib.proposal_count, " +
        "count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE')::text AS effective_draft_rows, " +
        "count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE' AND d.effective_content_hash = i.effective_content_hash)::text AS effective_hash_matches " +
        "FROM " + SCHEMA + ".import_batches ib LEFT JOIN " + SCHEMA + ".draft_proposals d ON trim(d.batch_id) = trim(ib.batch_id) " +
        "LEFT JOIN " + SCHEMA + ".identity_registry i ON i.proposal_key = d.proposal_key " +
        "GROUP BY ib.batch_id, ib.bundle_sha256, ib.source_fingerprint, ib.completeness, ib.group_count, ib.proposal_count ORDER BY ib.batch_id"
      );
      const invariants = await tx.unsafe(
        "SELECT count(*)::text AS effective_senses, " +
        "count(*) FILTER (WHERE d.editorial_status = 'DRAFT')::text AS effective_draft_rows, " +
        "count(*) FILTER (WHERE d.effective_content_hash = i.effective_content_hash)::text AS content_hash_matches, " +
        "count(*) FILTER (WHERE d.proposal_key IS NULL OR d.editorial_status <> 'DRAFT')::text AS missing_or_non_draft, " +
        "count(DISTINCT i.proposal_key)::text AS unique_proposals, " +
        "count(DISTINCT i.source_group_key)::text AS effective_groups, " +
        "count(*) FILTER (WHERE selected.effective_candidate_count = 1)::text AS one_selected_candidate_version, " +
        "count(*) FILTER (WHERE selected.effective_candidate_count = 0)::text AS no_candidate_version_row, " +
        "count(*) FILTER (WHERE selected.effective_candidate_count > 1)::text AS multiple_candidate_versions " +
        "FROM " + SCHEMA + ".identity_registry i JOIN " + SCHEMA + ".draft_proposals d ON d.proposal_key = i.proposal_key " +
        "LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE cv.selection_status = 'EFFECTIVE' " +
        "AND trim(cv.candidate_content_hash) = trim(i.effective_content_hash)) AS effective_candidate_count " +
        "FROM " + SCHEMA + ".candidate_versions cv WHERE cv.proposal_key = i.proposal_key) selected ON true " +
        "WHERE i.resolution_status = 'EFFECTIVE'"
      );
      return { dbIdentity: dbIdentity[0], statuses, allIdentities, effectiveRows, batchRows, invariants: invariants[0] };
    });

    const dbIdentity = captured.dbIdentity as Row;
    if (dbIdentity.database_name !== "neondb" || dbIdentity.project_id !== connected.target.projectId
      || dbIdentity.branch_id !== connected.target.branchId || dbIdentity.read_only !== "on") {
      throw new Error("CURRENT_STAGING_SNAPSHOT_TARGET_OR_READ_ONLY_MISMATCH");
    }
    const effectiveRows = captured.effectiveRows as Row[];
    const allIdentities = captured.allIdentities as Row[];
    const batchRows = (captured.batchRows as Row[]).map((row) => ({
      batchId: String(row.batch_id).trim(),
      bundleSha256: String(row.bundle_sha256).trim(),
      sourceFingerprint: String(row.source_fingerprint).trim(),
      completeness: row.completeness,
      groupCount: Number(row.group_count),
      proposalCount: Number(row.proposal_count),
      effectiveDraftRows: Number(row.effective_draft_rows),
      effectiveContentHashMatches: Number(row.effective_hash_matches),
    }));
    const currentVersionProjection = effectiveRows.map((row) => ({
      proposalKey: row.proposal_key,
      sourceGroupKey: row.source_group_key,
      contentHash: row.identity_content_hash,
      draftContentHash: row.draft_content_hash,
      editorialStatus: row.editorial_status,
      batchId: row.draft_batch_id,
      content: {
        candidateGroupKey: row.candidate_group_key,
        headword: row.headword,
        partOfSpeech: row.part_of_speech,
        senseIdentity: row.sense_identity,
        definitionEn: row.definition_en,
        meaningVi: row.meaning_vi,
        examples: row.examples,
        usageNotes: row.usage_notes,
        displayForm: row.display_form,
      },
      identitySourceProvenance: row.identity_source_provenance,
      draftSourceProvenance: row.draft_source_provenance,
      candidateVersions: row.candidate_versions,
    }));
    const identityProjection = allIdentities.map((row) => ({
      proposalKey: row.proposal_key,
      sourceGroupKey: row.source_group_key,
      resolutionStatus: row.resolution_status,
      effectiveContentHash: row.effective_content_hash,
      stagingBatchId: row.staging_batch_id,
      sourceProvenance: row.source_provenance,
    }));
    const invariants = captured.invariants as Row;
    const snapshotFingerprint = hashText(stable({
      target: { projectId: connected.target.projectId, branchId: connected.target.branchId, databaseName: "neondb", schema: SCHEMA },
      resolutionStatuses: captured.statuses,
      identities: identityProjection,
      currentEffectiveProjections: currentVersionProjection,
      importBatches: batchRows,
    }));
    const snapshot = {
      schemaVersion: 1,
      snapshotVersion: "current-effective-staging-snapshot-v1",
      capturedAt: new Date().toISOString(),
      target: {
        projectId: connected.target.projectId,
        branchId: connected.target.branchId,
        databaseName: "neondb",
        roleName: String(dbIdentity.role_name),
        schema: SCHEMA,
        verification: "NEON_PROVIDER_AND_PROTECTED_DATABASE_IDENTITY_PASS",
        transaction: "REPEATABLE_READ_READ_ONLY",
      },
      summary: {
        identityRows: allIdentities.length,
        resolutionStatuses: captured.statuses,
        effectiveSenses: Number(invariants.effective_senses),
        effectiveDraftRows: Number(invariants.effective_draft_rows),
        matchingIdentityAndDraftContentHashes: Number(invariants.content_hash_matches),
        missingOrNonDraftEffectiveRows: Number(invariants.missing_or_non_draft),
        uniqueEffectiveProposalIdentities: Number(invariants.unique_proposals),
        effectiveSourceGroups: Number(invariants.effective_groups),
        exactlyOneSelectedCandidateVersionRows: Number(invariants.one_selected_candidate_version),
        effectiveRowsWithoutCandidateVersionHistory: Number(invariants.no_candidate_version_row),
        multipleSelectedCandidateVersions: Number(invariants.multiple_candidate_versions),
        currentProjectionRule: "One primary-keyed DRAFT projection per EFFECTIVE proposal; draft hash equals identity_registry effective_content_hash. Recovered projections without candidate_versions history are identified by their registered staging/import batch and source provenance.",
      },
      snapshotFingerprint,
      resolutionStatuses: captured.statuses,
      importBatchLineage: batchRows,
      effectiveSenses: currentVersionProjection,
      nonEffectiveIdentities: identityProjection.filter((row) => row.resolutionStatus !== "EFFECTIVE"),
    };
    const serialized = JSON.stringify(snapshot, null, 2) + "\n";
    const snapshotSha256 = hashText(serialized);
    const output = path.join(ROOT, CURRENT_SNAPSHOT);
    mkdirSync(path.dirname(output), { recursive: true });
    writeFileSync(output, serialized, "utf8");
    writeFileSync(output + ".sha256", snapshotSha256 + "  current-effective-staging-snapshot-v1.json\n", "utf8");
    process.stdout.write(
      "CURRENT_EFFECTIVE_STAGING_SNAPSHOT=PASS" +
      "\nSTAGING_EFFECTIVE_TARGET=" + invariants.effective_senses +
      "\nIDENTITY_ROWS=" + allIdentities.length +
      "\nCONTENT_HASH_MATCHES=" + invariants.content_hash_matches +
      "\nMISSING_OR_NON_DRAFT=" + invariants.missing_or_non_draft +
      "\nSELECTED_CANDIDATE_VERSION_ROWS=" + invariants.one_selected_candidate_version +
      "\nRECOVERY_PROJECTIONS_WITHOUT_CANDIDATE_VERSION_HISTORY=" + invariants.no_candidate_version_row +
      "\nSNAPSHOT_SHA256=" + snapshotSha256 +
      "\nSNAPSHOT_FINGERPRINT=" + snapshotFingerprint +
      "\nOUTPUT=" + CURRENT_SNAPSHOT + "\n"
    );
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function readManifest(): Manifest {
  const value = JSON.parse(readFileSync(path.join(ROOT, MANIFEST), "utf8")) as Manifest;
  if (value.manifestVersion !== VERSION || !Array.isArray(value.assets) || !Array.isArray(value.mappings)) {
    throw new Error("MANIFEST_VERSION_OR_SHAPE_INVALID");
  }
  return value;
}

async function runtimeCounts() {
  const { sql } = await connectVerified("runtime");
  try {
    return await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const names = await tx.unsafe(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'vocabflow_app' " +
        "AND table_type = 'BASE TABLE' ORDER BY table_name"
      );
      const counts: Record<string, number> = {};
      for (const row of names) {
        const tableName = String(row.table_name).replace(/"/g, "\"\"");
        const result = await tx.unsafe("SELECT count(*)::text AS rows FROM \"vocabflow_app\".\"" + tableName + "\"");
        counts[String(row.table_name)] = Number(result[0]?.rows ?? 0);
      }
      return counts;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function readVersionedArtifact<T>(relativePath: string): T {
  const absolutePath = path.join(ROOT, relativePath);
  const bytes = readFileSync(absolutePath);
  const expectedHash = readFileSync(absolutePath + ".sha256", "utf8").trim().split(/\s+/)[0];
  if (hashText(bytes.toString("utf8")) !== expectedHash) throw new Error("VERSIONED_ARTIFACT_SHA256_MISMATCH");
  return JSON.parse(bytes.toString("utf8")) as T;
}

async function verifyLiveStagingSnapshot(snapshot: Row) {
  const { sql, target } = await connectVerified("bootstrap");
  try {
    const captured = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const identity = await tx.unsafe(
        "SELECT current_database() AS database_name, current_setting('transaction_read_only') AS read_only, " +
        "(SELECT project_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS project_id, " +
        "(SELECT branch_id FROM vocabflow_meta.environment_identity WHERE id = 1) AS branch_id"
      );
      const statuses = await tx.unsafe("SELECT resolution_status, count(*)::text AS rows FROM " + SCHEMA + ".identity_registry GROUP BY resolution_status ORDER BY resolution_status");
      const identities = await tx.unsafe(
        "SELECT proposal_key, source_group_key, resolution_status, trim(coalesce(effective_content_hash, '')) AS effective_content_hash, " +
        "trim(staging_batch_id) AS staging_batch_id, source_provenance FROM " + SCHEMA + ".identity_registry ORDER BY proposal_key"
      );
      const senses = await tx.unsafe(
        "SELECT i.proposal_key, i.source_group_key, trim(i.effective_content_hash) AS identity_content_hash, i.source_provenance AS identity_source_provenance, " +
        "d.candidate_group_key, d.headword, d.part_of_speech, d.sense_identity, d.definition_en, d.meaning_vi, d.examples, d.usage_notes, d.display_form, " +
        "trim(d.effective_content_hash) AS draft_content_hash, d.editorial_status, trim(d.batch_id) AS draft_batch_id, d.source_provenance AS draft_source_provenance, " +
        "coalesce((SELECT jsonb_agg(jsonb_build_object('candidateContentHash', trim(cv.candidate_content_hash), 'selectionStatus', cv.selection_status, " +
        "'stagingBatchId', trim(cv.staging_batch_id), 'originalArtifactIdentity', cv.original_artifact_identity, " +
        "'sourceProvenanceReferences', cv.source_provenance_references) ORDER BY cv.candidate_content_hash) FROM " + SCHEMA +
        ".candidate_versions cv WHERE cv.proposal_key = i.proposal_key), '[]'::jsonb) AS candidate_versions " +
        "FROM " + SCHEMA + ".identity_registry i JOIN " + SCHEMA + ".draft_proposals d ON d.proposal_key = i.proposal_key " +
        "WHERE i.resolution_status = 'EFFECTIVE' ORDER BY i.proposal_key"
      );
      const batches = await tx.unsafe(
        "SELECT ib.batch_id, ib.bundle_sha256, ib.source_fingerprint, ib.completeness, ib.group_count, ib.proposal_count, " +
        "count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE')::text AS effective_draft_rows, " +
        "count(d.proposal_key) FILTER (WHERE i.resolution_status = 'EFFECTIVE' AND d.effective_content_hash = i.effective_content_hash)::text AS effective_hash_matches " +
        "FROM " + SCHEMA + ".import_batches ib LEFT JOIN " + SCHEMA + ".draft_proposals d ON trim(d.batch_id) = trim(ib.batch_id) " +
        "LEFT JOIN " + SCHEMA + ".identity_registry i ON i.proposal_key = d.proposal_key " +
        "GROUP BY ib.batch_id, ib.bundle_sha256, ib.source_fingerprint, ib.completeness, ib.group_count, ib.proposal_count ORDER BY ib.batch_id"
      );
      const invariants = await tx.unsafe(
        "SELECT count(*)::text AS effective_senses, count(*) FILTER (WHERE d.editorial_status = 'DRAFT')::text AS effective_draft_rows, " +
        "count(*) FILTER (WHERE d.effective_content_hash = i.effective_content_hash)::text AS content_hash_matches, " +
        "count(*) FILTER (WHERE d.proposal_key IS NULL OR d.editorial_status <> 'DRAFT')::text AS missing_or_non_draft, " +
        "count(DISTINCT i.proposal_key)::text AS unique_proposals, " +
        "count(*) FILTER (WHERE selected.effective_candidate_count = 1)::text AS one_selected_candidate_version, " +
        "count(*) FILTER (WHERE selected.effective_candidate_count = 0)::text AS no_candidate_version_row, " +
        "count(*) FILTER (WHERE selected.effective_candidate_count > 1)::text AS multiple_candidate_versions " +
        "FROM " + SCHEMA + ".identity_registry i JOIN " + SCHEMA + ".draft_proposals d ON d.proposal_key = i.proposal_key " +
        "LEFT JOIN LATERAL (SELECT count(*) FILTER (WHERE cv.selection_status = 'EFFECTIVE' AND trim(cv.candidate_content_hash) = trim(i.effective_content_hash)) " +
        "AS effective_candidate_count FROM " + SCHEMA + ".candidate_versions cv WHERE cv.proposal_key = i.proposal_key) selected ON true " +
        "WHERE i.resolution_status = 'EFFECTIVE'"
      );
      return { identity: identity[0], statuses, identities, senses, batches, invariants: invariants[0] };
    });
    const databaseIdentity = captured.identity as Row;
    if (databaseIdentity.database_name !== "neondb" || databaseIdentity.project_id !== target.projectId
      || databaseIdentity.branch_id !== target.branchId || databaseIdentity.read_only !== "on") throw new Error("LIVE_STAGING_IDENTITY_MISMATCH");
    const expectedStatuses = snapshot.resolutionStatuses as Row[];
    if (stable(captured.statuses) !== stable(expectedStatuses)) throw new Error("LIVE_STAGING_RESOLUTION_STATUS_MISMATCH");
    const actualIdentities = captured.identities as Row[];
    const pendingByKey = new Map((snapshot.nonEffectiveIdentities as Row[]).map((row) => [String(row.proposalKey), row]));
    const effectiveByKey = new Map((snapshot.effectiveSenses as Row[]).map((row) => [String(row.proposalKey), row]));
    if (actualIdentities.length !== 7451) throw new Error("LIVE_STAGING_IDENTITY_COUNT_MISMATCH");
    for (const row of actualIdentities) {
      const proposalKey = String(row.proposal_key);
      if (row.resolution_status === "EFFECTIVE") {
        const sense = effectiveByKey.get(proposalKey);
        if (!sense || row.source_group_key !== sense.sourceGroupKey || row.effective_content_hash !== sense.contentHash
          || stable(row.source_provenance) !== stable(sense.identitySourceProvenance)) throw new Error("LIVE_EFFECTIVE_IDENTITY_PROJECTION_MISMATCH");
      } else {
        const pending = pendingByKey.get(proposalKey);
        if (!pending || row.source_group_key !== pending.sourceGroupKey || row.resolution_status !== pending.resolutionStatus
          || row.effective_content_hash !== pending.effectiveContentHash || row.staging_batch_id !== pending.stagingBatchId
          || stable(row.source_provenance) !== stable(pending.sourceProvenance)) throw new Error("LIVE_PENDING_IDENTITY_PROJECTION_MISMATCH");
      }
    }
    const currentSenses = (captured.senses as Row[]).map((row) => ({
      proposalKey: row.proposal_key, sourceGroupKey: row.source_group_key, contentHash: row.identity_content_hash,
      draftContentHash: row.draft_content_hash, editorialStatus: row.editorial_status, batchId: row.draft_batch_id,
      content: { candidateGroupKey: row.candidate_group_key, headword: row.headword, partOfSpeech: row.part_of_speech,
        senseIdentity: row.sense_identity, definitionEn: row.definition_en, meaningVi: row.meaning_vi,
        examples: row.examples, usageNotes: row.usage_notes, displayForm: row.display_form },
      identitySourceProvenance: row.identity_source_provenance, draftSourceProvenance: row.draft_source_provenance,
      candidateVersions: row.candidate_versions,
    }));
    if (stable(currentSenses) !== stable(snapshot.effectiveSenses)) throw new Error("LIVE_EFFECTIVE_SENSE_PROJECTION_MISMATCH");
    const currentBatches = (captured.batches as Row[]).map((row) => ({
      batchId: String(row.batch_id).trim(), bundleSha256: String(row.bundle_sha256).trim(), sourceFingerprint: String(row.source_fingerprint).trim(),
      completeness: row.completeness, groupCount: Number(row.group_count), proposalCount: Number(row.proposal_count),
      effectiveDraftRows: Number(row.effective_draft_rows), effectiveContentHashMatches: Number(row.effective_hash_matches),
    }));
    if (stable(currentBatches) !== stable(snapshot.importBatchLineage)) throw new Error("LIVE_STAGING_BATCH_LINEAGE_MISMATCH");
    const invariant = captured.invariants as Row;
    if (invariant.effective_senses !== "5616" || invariant.effective_draft_rows !== "5616" || invariant.content_hash_matches !== "5616"
      || invariant.missing_or_non_draft !== "0" || invariant.unique_proposals !== "5616"
      || invariant.one_selected_candidate_version !== "5043" || invariant.no_candidate_version_row !== "573"
      || invariant.multiple_candidate_versions !== "0") throw new Error("LIVE_STAGING_EFFECTIVE_VERSION_INVARIANT_MISMATCH");
    return { effectiveSenses: 5616, snapshotFingerprint: String(snapshot.snapshotFingerprint), contentHashesVerified: 5616, recoveryProjectionsWithoutHistory: 573 };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function createMediaMetadataTablesV1() {
  const { sql } = await connectVerified("bootstrap");
  try {
    await sql.begin(async (tx) => {
      const guard = await tx.unsafe(
        "SELECT pg_get_userbyid(n.nspowner) AS owner, has_schema_privilege('vocabflow_identity_bootstrap', n.oid, 'CREATE') AS bootstrap_create, " +
        "has_schema_privilege('vocabflow_runtime', n.oid, 'USAGE') AS runtime_usage, " +
        "to_regclass($2)::text AS assets, to_regclass($3)::text AS mappings, to_regclass($4)::text AS rights " +
        "FROM pg_namespace n WHERE n.nspname = $1",
        [SCHEMA, SCHEMA + ".media_assets_v2", SCHEMA + ".media_mappings_v2", SCHEMA + ".media_rights_v1"]
      );
      if (guard[0]?.owner !== "vocabflow_identity_bootstrap" || guard[0]?.bootstrap_create !== true || guard[0]?.runtime_usage !== false) {
        throw new Error("STAGING_SCHEMA_ISOLATION_PREFLIGHT_FAILED");
      }
      await tx.unsafe("CREATE TABLE IF NOT EXISTS " + SCHEMA + ".media_assets_v2 (" +
        "manifest_version text NOT NULL, media_sha256 text NOT NULL CHECK (media_sha256 ~ '^[0-9a-f]{64}$'), " +
        "media_kind text NOT NULL, media_roles jsonb NOT NULL, detected_mime_type text NOT NULL, normalized_extension text NOT NULL, " +
        "byte_length bigint NOT NULL CHECK (byte_length > 0), provider_neutral_storage_key text NOT NULL, source_file_identities jsonb NOT NULL, " +
        "source_note_identities jsonb NOT NULL, validation_status text NOT NULL, rights_status text NOT NULL, " +
        "upload_eligible boolean NOT NULL CHECK (upload_eligible = false), source_apkg_sha256 text NOT NULL, source_manifest_sha256 text NOT NULL, " +
        "target_snapshot_fingerprint text NOT NULL, PRIMARY KEY (manifest_version, media_sha256))");
      await tx.unsafe("CREATE TABLE IF NOT EXISTS " + SCHEMA + ".media_mappings_v2 (" +
        "mapping_key text PRIMARY KEY, manifest_version text NOT NULL, mapping_bundle_version text NOT NULL, media_sha256 text NOT NULL, " +
        "media_kind text NOT NULL, source_note_id text NOT NULL, source_note_guid text NOT NULL, source_record_evidence_sha256 text NOT NULL, " +
        "source_field text NOT NULL, source_reference_ordinal integer NOT NULL, source_filename text NOT NULL, target_lexeme_identity text, " +
        "target_sense_proposal_key text, target_example_key text, target_example_index integer, target_content_fingerprint text, " +
        "target_snapshot_fingerprint text NOT NULL, mapping_status text NOT NULL, mapping_confidence numeric(4,3) NOT NULL, " +
        "mapping_evidence jsonb NOT NULL, rights_status text NOT NULL, upload_eligible boolean NOT NULL CHECK (upload_eligible = false), " +
        "FOREIGN KEY (manifest_version, media_sha256) REFERENCES " + SCHEMA + ".media_assets_v2 (manifest_version, media_sha256))");
      await tx.unsafe("CREATE TABLE IF NOT EXISTS " + SCHEMA + ".media_rights_v1 (" +
        "manifest_version text NOT NULL, media_sha256 text NOT NULL, evidence_group_id text NOT NULL, rights_status text NOT NULL, " +
        "source_file_identities jsonb NOT NULL, source_note_identities jsonb NOT NULL, evidence jsonb NOT NULL, " +
        "upload_eligible boolean NOT NULL CHECK (upload_eligible = false), PRIMARY KEY (manifest_version, media_sha256), " +
        "FOREIGN KEY (manifest_version, media_sha256) REFERENCES " + SCHEMA + ".media_assets_v2 (manifest_version, media_sha256))");
      await tx.unsafe("GRANT USAGE ON SCHEMA " + SCHEMA + " TO vocabflow_migration");
      await tx.unsafe("GRANT SELECT, INSERT ON " + SCHEMA + ".media_assets_v2, " + SCHEMA + ".media_mappings_v2, " + SCHEMA + ".media_rights_v1 TO vocabflow_migration");
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function insertMediaMetadataV1(manifest: Manifest, bundle: MappingBundle, rights: RightsLedger) {
  const { sql } = await connectVerified("migration");
  const manifestSha = String(bundle.source.sourceManifestSha256);
  const snapshotFingerprint = String(bundle.target.snapshotFingerprint);
  try {
    await sql.begin(async (tx) => {
      const assets = manifest.assets.map((a) => ({ manifest_version: VERSION, media_sha256: a.media_sha256, media_kind: a.media_kind,
        media_roles: a.media_roles, detected_mime_type: a.detected_mime_type, normalized_extension: a.normalized_extension,
        byte_length: a.byte_length, provider_neutral_storage_key: a.provider_neutral_storage_key, source_file_identities: a.source_file_identities,
        source_note_identities: a.source_note_identities, validation_status: a.validation_status, rights_status: a.rights_status,
        upload_eligible: false, source_apkg_sha256: a.source_apkg_sha256, source_manifest_sha256: manifestSha,
        target_snapshot_fingerprint: snapshotFingerprint }));
      const mappings = bundle.mappings.map((r) => {
        const note = r.sourceNoteIdentity as Row;
        return { mapping_key: r.mappingKey, manifest_version: VERSION, mapping_bundle_version: bundle.bundleVersion,
        media_sha256: r.mediaSha256, media_kind: r.mediaKind, source_note_id: note.sourceRecordId,
        source_note_guid: note.sourceNoteGuid, source_record_evidence_sha256: note.recordEvidenceSha256,
        source_field: r.sourceField, source_reference_ordinal: r.sourceReferenceOrdinal, source_filename: r.sourceFilename,
        target_lexeme_identity: r.targetLexemeIdentity, target_sense_proposal_key: r.targetSenseProposalKey,
        target_example_key: r.targetExampleKey, target_example_index: r.targetExampleIndex, target_content_fingerprint: r.targetContentFingerprint,
        target_snapshot_fingerprint: r.targetSnapshotFingerprint, mapping_status: r.mappingStatus, mapping_confidence: r.mappingConfidence,
        mapping_evidence: r.mappingEvidence, rights_status: r.rightsStatus, upload_eligible: false };
      });
      const rightsRows = rights.assets.map((r) => ({ manifest_version: VERSION, media_sha256: r.mediaSha256, evidence_group_id: r.evidenceGroupId,
        rights_status: r.rightsStatus, source_file_identities: r.sourceFileIdentities, source_note_identities: r.sourceNoteIdentities,
        evidence: r.evidence, upload_eligible: false }));
      for (const [table, rows, columns, types, conflict] of [
        ["media_assets_v2", assets, "manifest_version, media_sha256, media_kind, media_roles, detected_mime_type, normalized_extension, byte_length, provider_neutral_storage_key, source_file_identities, source_note_identities, validation_status, rights_status, upload_eligible, source_apkg_sha256, source_manifest_sha256, target_snapshot_fingerprint", "manifest_version text, media_sha256 text, media_kind text, media_roles jsonb, detected_mime_type text, normalized_extension text, byte_length bigint, provider_neutral_storage_key text, source_file_identities jsonb, source_note_identities jsonb, validation_status text, rights_status text, upload_eligible boolean, source_apkg_sha256 text, source_manifest_sha256 text, target_snapshot_fingerprint text", "(manifest_version, media_sha256)"],
        ["media_mappings_v2", mappings, "mapping_key, manifest_version, mapping_bundle_version, media_sha256, media_kind, source_note_id, source_note_guid, source_record_evidence_sha256, source_field, source_reference_ordinal, source_filename, target_lexeme_identity, target_sense_proposal_key, target_example_key, target_example_index, target_content_fingerprint, target_snapshot_fingerprint, mapping_status, mapping_confidence, mapping_evidence, rights_status, upload_eligible", "mapping_key text, manifest_version text, mapping_bundle_version text, media_sha256 text, media_kind text, source_note_id text, source_note_guid text, source_record_evidence_sha256 text, source_field text, source_reference_ordinal integer, source_filename text, target_lexeme_identity text, target_sense_proposal_key text, target_example_key text, target_example_index integer, target_content_fingerprint text, target_snapshot_fingerprint text, mapping_status text, mapping_confidence numeric, mapping_evidence jsonb, rights_status text, upload_eligible boolean", "(mapping_key)"],
        ["media_rights_v1", rightsRows, "manifest_version, media_sha256, evidence_group_id, rights_status, source_file_identities, source_note_identities, evidence, upload_eligible", "manifest_version text, media_sha256 text, evidence_group_id text, rights_status text, source_file_identities jsonb, source_note_identities jsonb, evidence jsonb, upload_eligible boolean", "(manifest_version, media_sha256)"],
      ] as Array<[string, Row[], string, string, string]>) {
        const cols = columns.split(", ");
        const select = cols.map((column) => "x." + column).join(", ");
        for (let offset = 0; offset < rows.length; offset += 300) {
          activeStagePhase = "INSERT_" + table.toUpperCase() + "_" + offset;
          const jsonPayload = JSON.parse(JSON.stringify(rows.slice(offset, offset + 300)));
          await tx.unsafe("INSERT INTO " + SCHEMA + "." + table + " (" + columns + ") SELECT " + select +
            " FROM jsonb_to_recordset($1::jsonb) AS x(" + types + ") ON CONFLICT " + conflict + " DO NOTHING",
          [tx.json(jsonPayload)]);
        }
      }
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function verifyMediaMetadataReadbackV1(manifest: Manifest, bundle: MappingBundle, rights: RightsLedger) {
  const { sql } = await connectVerified("bootstrap");
  try {
    const rows = await sql.begin(async (tx) => {
      await tx.unsafe("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY");
      const assets = await tx.unsafe("SELECT manifest_version, media_sha256, media_kind, media_roles, detected_mime_type, normalized_extension, " +
        "byte_length::text AS byte_length, provider_neutral_storage_key, source_file_identities, source_note_identities, validation_status, rights_status, " +
        "upload_eligible, source_apkg_sha256, source_manifest_sha256, target_snapshot_fingerprint FROM " + SCHEMA + ".media_assets_v2 WHERE manifest_version = $1 ORDER BY media_sha256", [VERSION]);
      const mappings = await tx.unsafe("SELECT mapping_key, manifest_version, mapping_bundle_version, media_sha256, media_kind, source_note_id, source_note_guid, " +
        "source_record_evidence_sha256, source_field, source_reference_ordinal, source_filename, target_lexeme_identity, target_sense_proposal_key, " +
        "target_example_key, target_example_index::text AS target_example_index, target_content_fingerprint, target_snapshot_fingerprint, mapping_status, " +
        "mapping_confidence::text AS mapping_confidence, mapping_evidence, rights_status, upload_eligible FROM " + SCHEMA + ".media_mappings_v2 WHERE manifest_version = $1 ORDER BY mapping_key", [VERSION]);
      const rightsRows = await tx.unsafe("SELECT manifest_version, media_sha256, evidence_group_id, rights_status, source_file_identities, " +
        "source_note_identities, evidence, upload_eligible FROM " + SCHEMA + ".media_rights_v1 WHERE manifest_version = $1 ORDER BY media_sha256", [VERSION]);
      const isolation = await tx.unsafe("SELECT has_schema_privilege('vocabflow_runtime', $1, 'USAGE') AS runtime_usage, " +
        "has_schema_privilege('vocabflow_runtime', $1, 'CREATE') AS runtime_create", [SCHEMA]);
      return { assets, mappings, rightsRows, isolation: isolation[0] };
    });
    const expectedAssets = manifest.assets.map((a) => ({ manifest_version: VERSION, media_sha256: a.media_sha256, media_kind: a.media_kind,
      media_roles: a.media_roles, detected_mime_type: a.detected_mime_type, normalized_extension: a.normalized_extension,
      byte_length: String(a.byte_length), provider_neutral_storage_key: a.provider_neutral_storage_key, source_file_identities: a.source_file_identities,
      source_note_identities: a.source_note_identities, validation_status: a.validation_status, rights_status: a.rights_status, upload_eligible: false,
      source_apkg_sha256: a.source_apkg_sha256, source_manifest_sha256: bundle.source.sourceManifestSha256, target_snapshot_fingerprint: bundle.target.snapshotFingerprint }))
      .sort((a, b) => String(a.media_sha256).localeCompare(String(b.media_sha256)));
    const expectedMappings = bundle.mappings.map((r) => {
      const note = r.sourceNoteIdentity as Row;
      return { mapping_key: r.mappingKey, manifest_version: VERSION, mapping_bundle_version: bundle.bundleVersion,
      media_sha256: r.mediaSha256, media_kind: r.mediaKind, source_note_id: note.sourceRecordId, source_note_guid: note.sourceNoteGuid,
      source_record_evidence_sha256: note.recordEvidenceSha256, source_field: r.sourceField, source_reference_ordinal: r.sourceReferenceOrdinal,
      source_filename: r.sourceFilename, target_lexeme_identity: r.targetLexemeIdentity, target_sense_proposal_key: r.targetSenseProposalKey,
      target_example_key: r.targetExampleKey, target_example_index: r.targetExampleIndex === null ? null : String(r.targetExampleIndex),
      target_content_fingerprint: r.targetContentFingerprint, target_snapshot_fingerprint: r.targetSnapshotFingerprint, mapping_status: r.mappingStatus,
      mapping_confidence: Number(r.mappingConfidence).toFixed(3), mapping_evidence: r.mappingEvidence, rights_status: r.rightsStatus, upload_eligible: false };
    })
      .sort((a, b) => String(a.mapping_key).localeCompare(String(b.mapping_key)));
    const expectedRights = rights.assets.map((r) => ({ manifest_version: VERSION, media_sha256: r.mediaSha256, evidence_group_id: r.evidenceGroupId,
      rights_status: r.rightsStatus, source_file_identities: r.sourceFileIdentities, source_note_identities: r.sourceNoteIdentities, evidence: r.evidence, upload_eligible: false }))
      .sort((a, b) => String(a.media_sha256).localeCompare(String(b.media_sha256)));
    if (stable(rows.assets) !== stable(expectedAssets) || stable(rows.mappings) !== stable(expectedMappings) || stable(rows.rightsRows) !== stable(expectedRights)
      || rows.isolation?.runtime_usage !== false || rows.isolation?.runtime_create !== false) throw new Error("STAGING_MEDIA_METADATA_READBACK_OR_ISOLATION_MISMATCH");
    return { assets: rows.assets.length, mappings: rows.mappings.length, rights: rows.rightsRows.length,
      readbackSha256: hashText(stable({ assets: rows.assets, mappings: rows.mappings, rights: rows.rightsRows })) };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function applyVerifiedMediaStageV1() {
  activeStagePhase = "OFFLINE_INPUTS";
  const manifest = readManifest();
  const bundle = readVersionedArtifact<MappingBundle>(MAPPING_BUNDLE);
  const rights = readVersionedArtifact<RightsLedger>(RIGHTS_LEDGER);
  const snapshot = readVersionedArtifact<Row>(CURRENT_SNAPSHOT);
  const snapshotSha = hashText(readFileSync(path.join(ROOT, CURRENT_SNAPSHOT), "utf8"));
  if (bundle.source.sourceManifestSha256 !== hashText(readFileSync(path.join(ROOT, MANIFEST), "utf8"))
    || bundle.target.snapshotSha256 !== snapshotSha || bundle.target.snapshotFingerprint !== snapshot.snapshotFingerprint
    || bundle.target.effectiveSenseCount !== 5616 || bundle.target.projectId !== "shy-hill-72364426"
    || bundle.target.branchId !== "br-square-grass-b3af0nte" || bundle.target.databaseName !== "neondb"
    || manifest.assets.length !== 13977 || bundle.mappings.length !== 14012 || rights.assets.length !== 13977) {
    throw new Error("OFFLINE_MEDIA_INPUT_INTEGRITY_FAILURE");
  }
  if (manifest.source.sourceId !== "ENGLISH_VOCAB_4600" || manifest.source.apkgSha256 !== "495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b"
    || manifest.assets.some((a) => a.rights_status !== "UNKNOWN_REVIEW_REQUIRED" || a.upload_eligible !== false)
    || rights.assets.some((a) => a.rightsStatus !== "UNKNOWN_REVIEW_REQUIRED" || a.uploadEligible !== false)) throw new Error("SOURCE_OR_RIGHTS_GATE_FAILURE");
  process.stdout.write("OFFLINE_MEDIA_INPUTS=PASS\n");
  activeStagePhase = "LIVE_SNAPSHOT";
  const live = await verifyLiveStagingSnapshot(snapshot);
  process.stdout.write("LIVE_STAGING_SNAPSHOT=PASS\n");
  activeStagePhase = "RUNTIME_BASELINE";
  const before = await runtimeCounts();
  process.stdout.write("RUNTIME_BASELINE=PASS\n");
  activeStagePhase = "STAGING_DDL";
  await createMediaMetadataTablesV1();
  process.stdout.write("STAGING_DDL=PASS\n");
  activeStagePhase = "STAGING_INSERT";
  await insertMediaMetadataV1(manifest, bundle, rights);
  process.stdout.write("STAGING_INSERT=PASS\n");
  activeStagePhase = "STAGING_READBACK";
  const readback = await verifyMediaMetadataReadbackV1(manifest, bundle, rights);
  process.stdout.write("STAGING_READBACK=PASS\n");
  activeStagePhase = "RUNTIME_POSTCHECK";
  const after = await runtimeCounts();
  const runtimePreserved = stable(before) === stable(after);
  const report = {
    schemaVersion: 1, reportVersion: "english-vocabulary-4600-media-neon-stage-report-v1.0.0", manifestVersion: VERSION,
    mappingBundleVersion: bundle.bundleVersion, rightsLedgerVersion: rights.ledgerVersion,
    target: { projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", databaseName: "neondb", environment: "development", schema: SCHEMA },
    sourceApkgSha256: manifest.source.apkgSha256, sourceManifestSha256: bundle.source.sourceManifestSha256,
    targetSnapshotSha256: bundle.target.snapshotSha256, targetSnapshotFingerprint: live.snapshotFingerprint,
    liveStagingVerification: live, stagingReadback: readback, mappingCounts: bundle.counts, mappingStatusCounts: bundle.statusCounts,
    runtimeTablesBefore: before, runtimeTablesAfter: after, runtimePreserved,
    writes: { stagingMetadataOnly: true, sourceBinaryMediaWritten: false, senseContentUpdated: false, senseStatusUpdated: false,
      runtimeVocabularyUpdated: false, progressOrReviewUpdated: false, releaseStatusUpdated: false },
    isolation: { runtimeHasStagingSchemaUsage: false, runtimeGrantedStagingTableAccess: false },
    cloudinary: { mode: "OFFLINE_PLAN_ONLY", uploaded: 0, canary: "BLOCKED_RIGHTS_UNKNOWN", eligibleAssets: 0 },
  };
  const reportPath = path.join(ROOT, APPLY_REPORT);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n", "utf8");
  process.stdout.write("STAGING_EFFECTIVE_TARGET=5616\nNEON_MEDIA_ASSETS=" + readback.assets + "\nNEON_MEDIA_MAPPINGS=" + readback.mappings +
    "\nNEON_MEDIA_RIGHTS_ROWS=" + readback.rights + "\nRUNTIME_PRESERVED=" + (runtimePreserved ? "YES" : "NO") +
    "\nCLOUDINARY_UPLOADED=0\nREPORT=" + APPLY_REPORT + "\n");
  if (!runtimePreserved) throw new Error("RUNTIME_BASELINE_CHANGED_DURING_MEDIA_STAGING");
}

async function main() {
  loadEnvFile(".env");
  if (process.argv[2] === "--inspect-current-staging-snapshot") return inspectCurrentStagingSnapshotShape();
  if (process.argv[2] === "--inspect-media-staging-isolation") return inspectMediaStagingIsolation();
  if (process.argv[2] === "--export-current-effective-staging-snapshot-v1") return exportCurrentEffectiveStagingSnapshot();
  if (process.argv[2] === "--apply-stage") return applyVerifiedMediaStageV1();
  throw new Error("MODE_REQUIRED");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "MEDIA_V2_FAILED";
  const safe = /^[A-Z][A-Z0-9_]{2,100}$/.test(message) ? message : "MEDIA_V2_FAILED";
  const errorCode = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "") : "";
  const safeErrorCode = /^[A-Z0-9_]{2,30}$/.test(errorCode) ? errorCode : "";
  const detail = error instanceof Error ? error.message : "";
  const safeDetail = detail.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "<redacted-db-url>")
    .replace(/(password|api[_-]?key|api[_-]?secret)\s*[:=]\s*[^\s,;]+/gi, "$1=<redacted>")
    .replace(/[\r\n\t]+/g, " ").slice(0, 220);
  process.stderr.write("ENGLISH_VOCABULARY_4600_MEDIA_V2=FAIL\nCODE=" + safe + "\n");
  if (activeStagePhase) process.stderr.write("PHASE=" + activeStagePhase + "\n");
  if (safeErrorCode) process.stderr.write("ERROR_CODE=" + safeErrorCode + "\n");
  if (safeDetail && safeDetail !== "MEDIA_V2_FAILED") process.stderr.write("ERROR_DETAIL=" + safeDetail + "\n");
  process.exitCode = 1;
});
