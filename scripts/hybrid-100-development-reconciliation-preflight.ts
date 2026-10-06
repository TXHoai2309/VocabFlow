import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TrustedSource } from "@vocabflow/contracts";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertCurationDatabaseAccess,
  configuredCurationTarget,
} from "./vocabulary-curation-access";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import {
  databaseHashMatchesMigrationSource,
  matchingMigrationHashRepresentation,
  readMigrationHashEvidence,
  type MigrationHashEvidence,
} from "./migration-hash-verification";
import { canonicalJsonSha256, validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";
import {
  runMasterVocabularyTransform,
  loadPinnedMasterProjectionGraph,
  APP_IMPORT_CONTRACT_VERSION,
  RUNTIME_PROJECTION_CONTRACT_VERSION,
} from "./transform-master-vocabulary-v2";
import { main as verifyApprovedRelease } from "./hybrid-100-approved-release";

const EXPECTED_RELEASE_HASH = "c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d";
const RELEASE_RELATIVE_ROOT = "vocabflow-dataset/releases/hybrid-100-v2.2.0";
const WORKSPACE_RELATIVE_ROOT = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation";
const REPORT_RELATIVE_PATH = "vocabflow-dataset/reports/hybrid-100-development-runtime-reconciliation-2.2.0.md";

type JsonObject = Record<string, unknown>;
type JournalEntry = { idx: number; when: number; tag: string };
type DbMigrationRow = { id: number; hash: string; created_at: string | number | null };
type DbBridgeSchema = {
  tables: string[];
  missingTables: string[];
  missingColumns: Array<{ table: string; column: string }>;
  presentConstraints: string[];
  missingConstraints: string[];
  presentWriteGuardTriggers: string[];
  missingWriteGuardTriggers: string[];
  ready: boolean;
};

const REQUIRED_BRIDGE_COLUMNS: Record<string, string[]> = {
  master_vocabulary_mappings: [
    "master_sense_id", "master_lexeme_id", "vocabulary_id", "projection_contract_version",
    "applied_projection_fingerprint", "last_release_hash", "applied_lexeme_revision", "applied_sense_revision",
  ],
  master_topic_mappings: ["master_topic_id", "topic_id", "last_release_hash", "last_import_run_id"],
  master_learning_set_mappings: ["master_learning_set_id", "learning_set_id", "last_release_hash", "last_import_run_id"],
  master_vocabulary_topic_memberships: ["master_sense_id", "master_topic_id", "vocabulary_id", "topic_id", "last_release_hash"],
  master_learning_set_memberships: [
    "master_learning_set_item_id", "master_learning_set_id", "master_sense_id", "learning_set_id",
    "vocabulary_id", "sort_order", "last_release_hash",
  ],
  master_vocabulary_import_runs: [
    "id", "environment", "target_branch_id", "release_hash", "app_import_contract_version",
    "projection_contract_version", "reconciliation_hash", "plan_fingerprint",
  ],
};

const REQUIRED_COMPOSITE_CONSTRAINTS = [
  "master_vocabulary_mappings_identity_pair_unique",
  "master_vocabulary_topic_memberships_sense_vocabulary_fk",
  "master_vocabulary_topic_memberships_topic_runtime_fk",
  "master_vocabulary_topic_memberships_runtime_link_fk",
  "master_learning_set_memberships_set_runtime_fk",
  "master_learning_set_memberships_sense_vocabulary_fk",
  "master_learning_set_memberships_runtime_link_fk",
];

const REQUIRED_WRITE_GUARD_TRIGGERS = [
  "master_vocabulary_mappings_identity_guard",
  "master_topic_mappings_identity_guard",
  "master_learning_set_mappings_identity_guard",
  "master_vocabulary_topic_memberships_identity_guard",
  "master_learning_set_memberships_identity_guard",
  "master_vocabulary_import_runs_immutable_guard",
  "master_vocabulary_import_runs_write_guard",
  "master_vocabulary_mappings_write_guard",
  "master_topic_mappings_write_guard",
  "master_learning_set_mappings_write_guard",
  "master_vocabulary_topic_memberships_write_guard",
  "master_learning_set_memberships_write_guard",
  "topics_master_managed_write_guard",
  "learning_sets_master_managed_write_guard",
  "learning_set_items_master_managed_write_guard",
  "vocabularies_master_managed_write_guard",
];

export type TranslationStatusSummary = {
  total: number;
  byStatus: Record<string, number>;
  releaseEligible: number;
  releaseIneligible: number;
  ineligibleSenseCount: number;
};

export function summarizeTranslationStatuses(senses: Array<{ masterSenseId?: unknown; translations?: unknown }>): TranslationStatusSummary {
  const byStatus: Record<string, number> = {};
  let total = 0;
  let releaseEligible = 0;
  const ineligibleSenseIds = new Set<string>();
  for (const sense of senses) {
    const translations = Array.isArray(sense.translations) ? sense.translations : [];
    for (const item of translations) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const row = item as JsonObject;
      const status = typeof row.status === "string" ? row.status : "MISSING_STATUS";
      byStatus[status] = (byStatus[status] ?? 0) + 1;
      total += 1;
      if (status === "APPROVED") releaseEligible += 1;
      else ineligibleSenseIds.add(String(sense.masterSenseId ?? "UNKNOWN"));
    }
  }
  return {
    total,
    byStatus: Object.fromEntries(Object.entries(byStatus).sort(([a], [b]) => a.localeCompare(b))),
    releaseEligible,
    releaseIneligible: total - releaseEligible,
    ineligibleSenseCount: ineligibleSenseIds.size,
  };
}

export function assessMigrationHistory(input: {
  entries: JournalEntry[];
  evidence: MigrationHashEvidence[];
  rows: DbMigrationRow[];
  tableExists: boolean;
}): {
  current: boolean;
  localMigrationCount: number;
  appliedCount: number;
  latestApplied: { id: number; tag: string | null; hash: string; createdAt: number | null } | null;
  missingMigrations: string[];
  missingJournalRows: string[];
  hashMismatches: Array<{ tag: string; expectedHash: string; appliedHash: string }>;
  unexpectedAppliedRows: Array<{ id: number; hash: string; createdAt: number | null }>;
  hashComparisons: Array<{ tag: string; databaseHash: string | null; expectedLfHash: string | null; representation: string }>;
  appliedMigrationsForFingerprint: Array<{ tag: string; hash: string }>;
} {
  const evidenceByWhen = new Map(input.evidence.map((row) => [row.folderMillis, row]));
  const entryByWhen = new Map(input.entries.map((row) => [row.when, row]));
  const rowsByWhen = new Map<number, DbMigrationRow[]>();
  for (const row of input.rows) {
    const when = row.created_at === null ? Number.NaN : Number(row.created_at);
    if (!Number.isFinite(when)) continue;
    rowsByWhen.set(when, [...(rowsByWhen.get(when) ?? []), row]);
  }
  const missingMigrations: string[] = [];
  const missingJournalRows: string[] = [];
  const hashMismatches: Array<{ tag: string; expectedHash: string; appliedHash: string }> = [];
  const hashComparisons: Array<{ tag: string; databaseHash: string | null; expectedLfHash: string | null; representation: string }> = [];
  for (const entry of input.entries) {
    const local = evidenceByWhen.get(entry.when);
    const appliedRows = rowsByWhen.get(entry.when) ?? [];
    if (!local || appliedRows.length === 0) {
      missingMigrations.push(entry.tag);
      missingJournalRows.push(entry.tag);
    }
    const applied = appliedRows[0];
    const representation = local && applied ? matchingMigrationHashRepresentation(local, applied.hash) : "NO_DB_ROW";
    hashComparisons.push({
      tag: entry.tag,
      databaseHash: applied?.hash ?? null,
      expectedLfHash: local?.lfHash ?? null,
      representation,
    });
    if (local && applied && !databaseHashMatchesMigrationSource(local, applied.hash)) {
      hashMismatches.push({ tag: entry.tag, expectedHash: local.lfHash, appliedHash: applied.hash });
    }
    if (appliedRows.length > 1 && local) {
      hashMismatches.push({ tag: entry.tag, expectedHash: local.lfHash, appliedHash: "DUPLICATE_CREATED_AT_ROWS" });
    }
  }
  const unexpectedAppliedRows = input.rows.flatMap((row) => {
    const createdAt = row.created_at === null ? null : Number(row.created_at);
    if (createdAt !== null && entryByWhen.has(createdAt)) return [];
    return [{ id: row.id, hash: row.hash, createdAt }];
  });
  const latest = [...input.rows].sort((a, b) => Number(b.created_at ?? 0) - Number(a.created_at ?? 0) || b.id - a.id)[0] ?? null;
  const latestCreatedAt = latest?.created_at === null || latest?.created_at === undefined ? null : Number(latest.created_at);
  const latestEntry = latestCreatedAt === null ? null : entryByWhen.get(latestCreatedAt) ?? null;
  const current = input.tableExists
    && input.rows.length === input.entries.length
    && missingMigrations.length === 0
    && hashMismatches.length === 0
    && unexpectedAppliedRows.length === 0;
  return {
    current,
    localMigrationCount: input.entries.length,
    appliedCount: input.rows.length,
    latestApplied: latest ? { id: latest.id, tag: latestEntry?.tag ?? null, hash: latest.hash, createdAt: latestCreatedAt } : null,
    missingMigrations,
    missingJournalRows,
    hashMismatches,
    unexpectedAppliedRows,
    hashComparisons,
    appliedMigrationsForFingerprint: input.rows.flatMap((row) => {
      const createdAt = row.created_at === null ? null : Number(row.created_at);
      const entry = createdAt === null ? null : entryByWhen.get(createdAt);
      return entry ? [{ tag: entry.tag, hash: row.hash }] : [];
    }).sort((a, b) => a.tag.localeCompare(b.tag)),
  };
}

export function matchesDevelopmentTarget(target: ReturnType<typeof getConnectionTarget>): boolean {
  return target.environment === "development"
    && target.provider === "neon"
    && target.projectId === "shy-hill-72364426"
    && target.branchId === "br-square-grass-b3af0nte"
    && target.databaseName === "neondb"
    && target.usage === "development";
}

export function buildOwnerDecisionTemplate(
  senses: Array<{ masterSenseId: string; masterLexemeId: string }>,
  sourceReleaseHash = EXPECTED_RELEASE_HASH,
) {
  return {
    artifactType: "HYBRID_100_OWNER_DECISION_TEMPLATE",
    generatedBy: "hybrid-100-development-reconciliation-preflight-v1",
    analysisOnly: true,
    ownerReviewed: false,
    acceptedByImporter: false,
    sourceReleaseHash,
    targetEnvironment: "development",
    decisions: senses.map((sense) => ({
      masterSenseId: sense.masterSenseId,
      masterLexemeId: sense.masterLexemeId,
      ownerDecision: "UNRESOLVED",
      possibleDecision: ["MAP_EXISTING", "CREATE_NEW", "SKIP", "UNRESOLVED"],
      appVocabularyId: null,
      firstAdoptionPolicy: null,
      clearFields: [],
    })),
  };
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function releasePreflight(repositoryRoot: string) {
  const releaseRoot = path.resolve(repositoryRoot, RELEASE_RELATIVE_ROOT);
  const manifest = readJson<JsonObject>(path.join(releaseRoot, "dataset.json"));
  const releaseHash = manifest.releaseHash;
  if (manifest.datasetVersion !== "2.2.0" || manifest.schemaVersion !== "2.0.1" || manifest.status !== "APPROVED"
    || releaseHash !== EXPECTED_RELEASE_HASH || manifest.releaseHashAlgorithm !== "sha256-canonical-json-v1") {
    throw new Error("HYBRID_100_RELEASE_IDENTITY_MISMATCH");
  }
  const withoutReleaseHash = { ...manifest };
  delete withoutReleaseHash.releaseHash;
  if (canonicalJsonSha256(withoutReleaseHash) !== EXPECTED_RELEASE_HASH) throw new Error("HYBRID_100_RELEASE_HASH_MISMATCH");
  const validation = validateMasterVocabularyV2({ datasetRoot: releaseRoot, writeReport: false, validatedAt: "2000-01-01T00:00:00Z" });
  if (validation.status !== "PASS" || validation.errorCount !== 0 || validation.warningCount !== 0 || validation.infoCount !== 0) {
    throw new Error("HYBRID_100_RELEASE_VALIDATION_FAILED");
  }
  const freeze = verifyApprovedRelease(["--check"], repositoryRoot);
  if (freeze.status !== "APPROVED_RELEASE_ALREADY_MATERIALIZED" || freeze.releaseHash !== EXPECTED_RELEASE_HASH
    || freeze.releaseTreeFingerprint !== "35334eb7769c39029223d2d60311c6faab8c462efd0a340f262bed27543256ae"
    || freeze.rcUnchanged !== true || freeze.canaryUnchanged !== true) throw new Error("HYBRID_100_FROZEN_SOURCE_GATE_FAILED");

  const graph = loadPinnedMasterProjectionGraph(releaseRoot);
  const ownerDecisionSenses = graph.senses.map((sense) => {
    if (typeof sense.masterSenseId !== "string" || typeof sense.masterLexemeId !== "string") {
      throw new Error("RELEASE_SENSE_IDENTITY_INVALID");
    }
    return { masterSenseId: sense.masterSenseId, masterLexemeId: sense.masterLexemeId };
  });
  if (ownerDecisionSenses.length !== 100) throw new Error("HYBRID_100_SENSE_COUNT_MISMATCH");
  let releaseModeRows = 0;
  let releaseModeError: string | null = null;
  try {
    const result = runMasterVocabularyTransform({ datasetRoot: releaseRoot, mode: "RELEASE", writeOutputs: false });
    releaseModeRows = Array.isArray(result.vocabulary.records) ? result.vocabulary.records.length : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    releaseModeError = /^[A-Z][A-Z0-9_:.-]{2,120}$/.test(message) ? message : "RELEASE_TRANSFORM_FAILED";
  }
  const preview = runMasterVocabularyTransform({ datasetRoot: releaseRoot, mode: "PREVIEW", writeOutputs: false });
  const translationStatuses = summarizeTranslationStatuses(graph.senses);
  const projectionReady = releaseModeRows === 100 && releaseModeError === null
    && preview.vocabulary.artifactVersion === APP_IMPORT_CONTRACT_VERSION
    && preview.vocabulary.projectionContractVersion === RUNTIME_PROJECTION_CONTRACT_VERSION;
  return {
    releaseRoot,
    manifest,
    validation: { status: validation.status, errors: validation.errorCount, warnings: validation.warningCount, info: validation.infoCount },
    releaseTreeFingerprint: freeze.releaseTreeFingerprint,
    ownerDecisionSenses,
    frozenSourcesUnchanged: true,
    releaseModeRows,
    releaseModeError,
    previewRows: Array.isArray(preview.vocabulary.records) ? preview.vocabulary.records.length : 0,
    previewImportEligible: preview.vocabulary.importEligible === true,
    appImportContractVersion: preview.vocabulary.artifactVersion,
    projectionContractVersion: preview.vocabulary.projectionContractVersion,
    translationStatuses,
    projectionReady,
    topicCount: Array.isArray(preview.topics.records) ? preview.topics.records.length : 0,
    learningSetCount: Array.isArray(preview.learningSets.records) ? preview.learningSets.records.length : 0,
    learningSetItemCount: Array.isArray(preview.learningSetItems.records) ? preview.learningSetItems.records.length : 0,
    topicMembershipCount: Array.isArray(preview.topicMemberships.records) ? preview.topicMemberships.records.length : 0,
  };
}

async function inspectDevelopmentMigrationState(input: {
  url: string;
  target: ReturnType<typeof getConnectionTarget>;
  journalEntries: JournalEntry[];
  localEvidence: MigrationHashEvidence[];
}) {
  const sql = openSql(input.url);
  try {
    return await sql.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, input.target);
      const [session] = await tx<{ current_user: string; session_user: string; database_name: string }[]>`
        SELECT current_user::text AS current_user,
          session_user::text AS session_user,
          current_database()::text AS database_name
      `;
      if (!session || session.current_user !== input.target.roleName || session.session_user !== input.target.roleName
        || session.database_name !== input.target.databaseName) throw new Error("DEVELOPMENT_MIGRATION_SESSION_IDENTITY_MISMATCH");

      const [journalTable] = await tx<{ exists: boolean }[]>`
        SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists
      `;
      const migrationRows = journalTable?.exists
        ? await tx<DbMigrationRow[]>`
          SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at, id
        `
        : [];

      const tableNames = Object.keys(REQUIRED_BRIDGE_COLUMNS);
      const [schemaTables, columns, constraints, triggers] = await Promise.all([
        tx<{ table_name: string }[]>`
          SELECT table_name::text AS table_name FROM information_schema.tables
          WHERE table_schema::text = 'vocabflow_app' AND table_type::text = 'BASE TABLE'
            AND table_name::text = ANY(${tx.array(tableNames)}::text[])
          ORDER BY table_name
        `,
        tx<{ table_name: string; column_name: string }[]>`
          SELECT table_name::text AS table_name, column_name::text AS column_name
          FROM information_schema.columns
          WHERE table_schema::text = 'vocabflow_app' AND table_name::text = ANY(${tx.array(tableNames)}::text[])
          ORDER BY table_name, ordinal_position
        `,
        tx<{ conname: string }[]>`
          SELECT c.conname::text AS conname
          FROM pg_constraint c
          JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace
          WHERE n.nspname::text = 'vocabflow_app'
            AND c.conname::text = ANY(${tx.array(REQUIRED_COMPOSITE_CONSTRAINTS)}::text[])
          ORDER BY c.conname
        `,
        tx<{ tgname: string }[]>`
          SELECT t.tgname::text AS tgname
          FROM pg_trigger t
          JOIN pg_class c ON c.oid = t.tgrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname::text = 'vocabflow_app' AND NOT t.tgisinternal
            AND t.tgname::text = ANY(${tx.array(REQUIRED_WRITE_GUARD_TRIGGERS)}::text[])
          ORDER BY t.tgname
        `,
      ]);
      const expectedColumns = Object.entries(REQUIRED_BRIDGE_COLUMNS).flatMap(([table, names]) => names.map((column) => ({ table, column })));
      const presentColumnSet = new Set(columns.map((row) => `${row.table_name}.${row.column_name}`));
      const presentTables = schemaTables.map((row) => row.table_name);
      const presentTableSet = new Set(presentTables);
      const presentConstraints = constraints.map((row) => row.conname);
      const presentConstraintSet = new Set(presentConstraints);
      const presentWriteGuardTriggers = triggers.map((row) => row.tgname);
      const presentTriggerSet = new Set(presentWriteGuardTriggers);
      const schema: DbBridgeSchema = {
        tables: presentTables,
        missingTables: tableNames.filter((table) => !presentTableSet.has(table)),
        missingColumns: expectedColumns.filter((row) => !presentColumnSet.has(`${row.table}.${row.column}`)),
        presentConstraints,
        missingConstraints: REQUIRED_COMPOSITE_CONSTRAINTS.filter((name) => !presentConstraintSet.has(name)),
        presentWriteGuardTriggers,
        missingWriteGuardTriggers: REQUIRED_WRITE_GUARD_TRIGGERS.filter((name) => !presentTriggerSet.has(name)),
        ready: false,
      };
      schema.ready = schema.missingTables.length === 0 && schema.missingColumns.length === 0
        && schema.missingConstraints.length === 0 && schema.missingWriteGuardTriggers.length === 0;
      const history = assessMigrationHistory({
        entries: input.journalEntries,
        evidence: input.localEvidence,
        rows: migrationRows,
        tableExists: journalTable?.exists === true,
      });
      return {
        targetVerifiedAfterConnect: true,
        currentUser: session.current_user,
        sessionUser: session.session_user,
        databaseName: session.database_name,
        transaction: "REPEATABLE_READ_READ_ONLY",
        migrationJournalTableExists: journalTable?.exists === true,
        history,
        bridgeSchema: schema,
        migrationReady: history.current && schema.ready,
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function safeTarget(target: ReturnType<typeof getConnectionTarget>) {
  return {
    environment: target.environment,
    provider: target.provider,
    projectId: target.projectId,
    branchId: target.branchId,
    databaseName: target.databaseName,
    pooled: target.pooled,
    usage: target.usage,
    identityVersion: target.identityVersion,
    purpose: target.purpose,
    roleName: target.roleName,
  };
}

function writeJson(pathname: string, value: unknown) {
  mkdirSync(path.dirname(pathname), { recursive: true });
  if (existsSync(pathname)) {
    const existing = readJson<JsonObject>(pathname);
    if (existing.generatedBy !== "hybrid-100-development-reconciliation-preflight-v1") {
      throw new Error("PREFLIGHT_REFUSING_TO_OVERWRITE_NON_GENERATED_ARTIFACT");
    }
  }
  writeFileSync(pathname, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function renderReport(input: {
  generatedAt: string;
  release: ReturnType<typeof releasePreflight>;
  target: ReturnType<typeof getConnectionTarget>;
  migration: Awaited<ReturnType<typeof inspectDevelopmentMigrationState>>;
}) {
  const statusRows = Object.entries(input.release.translationStatuses.byStatus)
    .map(([status, count]) => `| ${status} | ${count} |`).join("\n");
  const missing = input.migration.history.missingMigrations.length
    ? input.migration.history.missingMigrations.join(", ") : "none";
  const hashDrift = input.migration.history.hashMismatches.map((row) => row.tag).join(", ") || "none";
  const projectionStatus = input.release.projectionReady ? "PASS" : "BLOCKED";
  return `# Hybrid-100 Development Runtime Reconciliation — Preflight\n\nGenerated: ${input.generatedAt}\n\n## Outcome\n\n**PHASE_2G1_READY = NO**. The read-only migration/bridge preflight completed, but the approved release does not produce an eligible RELEASE projection. Runtime vocabulary discovery and candidate planning were not run.\n\n## Frozen source and transform gate\n\n- Source: 2.2.0 / APPROVED; schema 2.0.1.\n- Release hash: \`${EXPECTED_RELEASE_HASH}\` (independently recomputed).\n- Release tree fingerprint: \`${input.release.releaseTreeFingerprint}\`; official frozen-source verifier passed before and after this preflight. RC 2.2.0-rc.1, Canary 2.1.0, canonical root, and taxonomy snapshots remained unchanged.\n- Dataset validator: PASS (0 errors, 0 warnings, 0 info).\n- App Import contract: \`${input.release.appImportContractVersion}\`; runtime projection contract: \`${input.release.projectionContractVersion}\`.\n- RELEASE transform: ${projectionStatus}; eligible projected Senses ${input.release.releaseModeRows}/100; error \`${input.release.releaseModeError ?? "none"}\`.\n- PREVIEW diagnostic: ${input.release.previewRows}/100 rows, importEligible=${input.release.previewImportEligible}; it is not an accepted release projection and was not used for runtime candidate analysis.\n- PREVIEW scope: ${input.release.topicCount} Topics, ${input.release.topicMembershipCount} Topic memberships, ${input.release.learningSetCount} Learning Sets, ${input.release.learningSetItemCount} Learning Set items.\n\nThe transform's RELEASE gate accepts only APPROVED nested Vietnamese Translation rows. The frozen Sense records contain ${input.release.translationStatuses.total} nested Vietnamese Translation rows: ${input.release.translationStatuses.releaseEligible} APPROVED and ${input.release.translationStatuses.releaseIneligible} not approved across ${input.release.translationStatuses.ineligibleSenseCount} Senses.\n\n| Translation row status | Count |\n| --- | ---: |\n${statusRows}\n\nNo release files were changed, no child status was inferred from its parent Sense, and no preview row was relabeled as RELEASE. The transformation gate must be resolved in a separately approved source revision before candidate identity analysis can be valid.\n\n## Development target and migration/bridge check\n\n- Configured Development target: Neon / project \`${input.target.projectId}\` / branch \`${input.target.branchId}\` / database \`${input.target.databaseName}\`.\n- Connected purpose/role: \`${input.target.purpose} / ${input.target.roleName}\`; provider and database identity verified.\n- Transaction: \`REPEATABLE READ, READ ONLY\`.\n- Migration journal: ${input.migration.history.appliedCount}/${input.migration.history.localMigrationCount} rows; latest \`${input.migration.history.latestApplied?.tag ?? "none"}\`.\n- Required current bridge tables, columns, composite constraints and write-guard triggers: ${input.migration.bridgeSchema.ready ? "PASS" : "FAIL"}.\n- Migration/bridge readiness: **${input.migration.migrationReady ? "READY" : "BLOCKED"}**.\n- Missing journal migrations: ${missing}; migration hash mismatch: ${hashDrift}.\n\n## Scan and write boundary\n\n- Runtime vocabulary catalog queried: NO.\n- Runtime Master mappings queried: NO.\n- Learner progress/review aggregates queried: NO.\n- Candidate rows / candidate artifact: not generated.\n- Owner decisions finalized: 0; unresolved template rows: 100.\n- DATABASE_CONNECTION = READ_ONLY_DEVELOPMENT (migration role only).\n- DATABASE_TRANSACTION = \`REPEATABLE_READ_READ_ONLY\`.\n- INSERT_COUNT = 0; UPDATE_COUNT = 0; DELETE_COUNT = 0; DDL_COUNT = 0.\n- IMPORT_APPLY_EXECUTED = NO; MIGRATIONS_EXECUTED = NONE; runtime IDs allocated = 0; bridge mappings created = 0; learner rows mutated = 0.\n- Production connection = NONE; production mutation = NO.\n\n## Next gate\n\nResolve the approved-release translation status/projection mismatch without editing the frozen 2.2.0 package. Then rerun the 100-Sense RELEASE projection and development candidate scan. The next reconciliation step remains owner review; this preflight does not authorize importer apply.\n`;
}

export async function runHybrid100DevelopmentReconciliationPreflight(repositoryRoot = process.cwd()) {
  const release = releasePreflight(repositoryRoot);
  const context = readContext();
  if (context.context !== "local-development" || context.environment !== "development"
    || process.env.TRUSTED_SOURCE !== "dev-launcher") throw new Error("DEVELOPMENT_PREFLIGHT_LOCAL_CONTEXT_REQUIRED");
  const migrationTarget = getConnectionTarget("development", "migration");
  const runtimeTarget = configuredCurationTarget("development");
  if (!matchesDevelopmentTarget(migrationTarget) || !matchesDevelopmentTarget(runtimeTarget)) {
    throw new Error("DEVELOPMENT_PREFLIGHT_TARGET_CONFIG_MISMATCH");
  }
  const authorized = assertCurationDatabaseAccess({
    executionContext: context.context,
    trustedSource: "dev-launcher" as TrustedSource,
    vocabularyEnvironment: context.environment,
    databaseEnvironment: process.env.DATABASE_ENV,
    requestedTarget: "development",
    resolvedTarget: runtimeTarget,
    mode: "dry-run",
  });
  if (authorized.branchId !== "br-square-grass-b3af0nte") throw new Error("DEVELOPMENT_PREFLIGHT_TARGET_POLICY_MISMATCH");

  // Provider verification resolves only the repository-configured migration-purpose URI.
  const connection = await assertResolvedTargetBeforeMutation({
    context: context.context,
    source: "dev-launcher",
    environment: context.environment,
    purpose: "migration",
    operation: "db-check",
    target: migrationTarget,
  });
  const journal = readJson<{ entries: JournalEntry[] }>(path.join(repositoryRoot, "drizzle/migrations/meta/_journal.json"));
  const journalEntries = [...journal.entries].sort((a, b) => a.idx - b.idx);
  const localEvidence = readMigrationHashEvidence(path.join(repositoryRoot, "drizzle/migrations"));
  const localByWhen = new Map(localEvidence.map((row) => [row.folderMillis, row]));
  if (localEvidence.length !== journalEntries.length || journalEntries.some((row) => !localByWhen.has(row.when))) {
    throw new Error("LOCAL_MIGRATION_JOURNAL_OR_HASH_INVALID");
  }
  const migration = await inspectDevelopmentMigrationState({
    url: connection.url,
    target: migrationTarget,
    journalEntries,
    localEvidence,
  });
  if (migration.targetVerifiedAfterConnect !== true) throw new Error("DEVELOPMENT_PREFLIGHT_POST_CONNECT_IDENTITY_FAILED");
  const freezeAfter = verifyApprovedRelease(["--check"], repositoryRoot);
  if (freezeAfter.status !== "APPROVED_RELEASE_ALREADY_MATERIALIZED" || freezeAfter.releaseHash !== EXPECTED_RELEASE_HASH
    || freezeAfter.releaseTreeFingerprint !== release.releaseTreeFingerprint || freezeAfter.rcUnchanged !== true
    || freezeAfter.canaryUnchanged !== true) throw new Error("HYBRID_100_FROZEN_SOURCE_CHANGED_DURING_PREFLIGHT");

  const generatedAt = new Date().toISOString();
  const targetArtifact = {
    generatedBy: "hybrid-100-development-reconciliation-preflight-v1",
    targetEnvironment: "development",
    configuredRuntimeTarget: safeTarget(runtimeTarget),
    verifiedConnectionTarget: safeTarget(migrationTarget),
    providerVerifiedBeforeConnect: true,
    databaseIdentityVerifiedAfterConnect: true,
    connectionPurpose: "migration",
    rawConnectionStringPersisted: false,
  };
  const sourceArtifacts = {
    artifactType: "HYBRID_100_RELEASE_TRANSFORM_PREFLIGHT",
    generatedBy: "hybrid-100-development-reconciliation-preflight-v1",
    sourceDatasetVersion: "2.2.0",
    sourceSchemaVersion: "2.0.1",
    sourceReleaseHash: EXPECTED_RELEASE_HASH,
    releaseTreeFingerprint: release.releaseTreeFingerprint,
    validation: release.validation,
    appImportContractVersion: release.appImportContractVersion,
    projectionContractVersion: release.projectionContractVersion,
    releaseMode: { rows: release.releaseModeRows, importEligible: release.projectionReady, error: release.releaseModeError },
    previewDiagnostic: { rows: release.previewRows, importEligible: release.previewImportEligible },
    nestedVietnameseTranslationStatuses: release.translationStatuses,
    frozenSourcesVerifiedBeforeAndAfter: true,
    unexpectedProjectionScope: {
      topicCount: release.topicCount,
      topicMembershipCount: release.topicMembershipCount,
      learningSetCount: release.learningSetCount,
      learningSetItemCount: release.learningSetItemCount,
    },
    runtimeCandidateScanPerformed: false,
  };
  const workspaceRoot = path.join(repositoryRoot, WORKSPACE_RELATIVE_ROOT);
  writeJson(path.join(workspaceRoot, "development-target.json"), targetArtifact);
  writeJson(path.join(workspaceRoot, "migration-state.json"), {
    generatedBy: "hybrid-100-development-reconciliation-preflight-v1",
    target: safeTarget(migrationTarget),
    ...migration,
  });
  writeJson(path.join(workspaceRoot, "projection", "transform-preflight-summary.json"), sourceArtifacts);
  const ownerDecisionTemplate = buildOwnerDecisionTemplate(release.ownerDecisionSenses);
  writeJson(path.join(workspaceRoot, "owner-decision-template.json"), ownerDecisionTemplate);
  const reportMarker = "<!-- generatedBy: hybrid-100-development-reconciliation-preflight-v1 -->";
  const report = `${reportMarker}\n\n${renderReport({ generatedAt, release, target: migrationTarget, migration })}`;
  const reportPath = path.join(repositoryRoot, REPORT_RELATIVE_PATH);
  if (existsSync(reportPath) && !readFileSync(reportPath, "utf8").includes(reportMarker)) {
    throw new Error("PREFLIGHT_REFUSING_TO_OVERWRITE_EXISTING_REPORT");
  }
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, "utf8");
  const summary = {
    artifactType: "HYBRID_100_DEVELOPMENT_RUNTIME_RECONCILIATION_PREFLIGHT",
    generatedAt,
    sourceReleaseHash: EXPECTED_RELEASE_HASH,
    releaseUnchanged: true,
    targetVerified: true,
    connectedDatabasePurpose: "migration",
    migrationReady: migration.migrationReady,
    releaseProjectionReady: release.projectionReady,
    runtimeCatalogScanned: false,
    ownerDecisionsFinalized: 0,
    ownerDecisionsUnresolved: ownerDecisionTemplate.decisions.length,
    databaseWrites: "NONE",
    importerApplyExecuted: false,
    productionConnection: "NONE",
    frozenSourcesVerifiedBeforeAndAfter: true,
    phase2G1Ready: false,
    report: REPORT_RELATIVE_PATH,
  };
  writeJson(path.join(workspaceRoot, "preflight-summary.json"), {
    generatedBy: "hybrid-100-development-reconciliation-preflight-v1",
    ...summary,
  });
  return summary;
}

function isMain() {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  runHybrid100DevelopmentReconciliationPreflight().then((summary) => {
    process.stdout.write(`${Object.entries(summary).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n")}\n`);
  }).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    process.stderr.write(`${/^[A-Z][A-Z0-9_:.-]{2,120}$/.test(message) ? message : "HYBRID_100_DEVELOPMENT_PREFLIGHT_FAILED"}\n`);
    process.exitCode = 1;
  });
}
