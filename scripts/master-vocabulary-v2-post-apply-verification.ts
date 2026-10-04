import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TrustedSource } from "@vocabflow/contracts";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertCurationDatabaseAccess,
  configuredCurationTarget,
  resolveCurationTargetName,
} from "./vocabulary-curation-access";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import {
  buildMasterVocabularyImportPlan,
  type ImportArtifacts,
  type ImportPlan,
  type JsonRecord,
  type Reconciliation,
  type RuntimeSnapshot,
} from "./master-vocabulary-v2-import-planner";
import { createPostgresMasterImportStore } from "./master-vocabulary-v2-import-store";
import {
  databaseHashMatchesMigrationSource,
  readMigrationHashEvidence,
} from "./migration-hash-verification";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";
import { runMasterVocabularyTransform } from "./transform-master-vocabulary-v2";

const EXPECTED_RELEASE_HASH = "fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591";
const EXPECTED_RECONCILIATION_HASH = "75f67d20edc771c931e8cbf1d70118e339374c22f35a5d062160bca3f489efb2";
const EXPECTED_PLAN_FINGERPRINT = "4ffcb88ef47c9bdaf3d3dc7d36092fa55e7dec0d4a01417aac97c53d90d8718b";
const EXPECTED_IMPORT_RUN_ID = "de0b29c4-db84-4d76-abd4-398f17151099";
const EXPECTED_PRE_APPLY_SNAPSHOT = "d4e4c7cb4695790cbfa4b127afc0273f469a820a4cc2b8a572e646f5190235a0";
const EXPECTED_PRE_APPLY_PLANNER_SNAPSHOT = "18b80a1a12bdb211c78350b6701385d302be28511bffd405ba569b22e27257f4";
const RELEASE_ROOT = "vocabflow-dataset/releases/canary-v2.1.0";
const RECONCILIATION_PATH = "vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json";

type MigrationJournal = { entries: Array<{ idx: number; when: number; tag: string }> };
export type MigrationSummary = {
  current: boolean;
  appliedCount: number;
  localMigrationCount: number;
  latestTag: string | null;
  hashMismatchCount: number;
  missingJournalRows: number;
  unexpectedAppliedRows: number;
};
type LedgerRow = {
  id: string;
  planFingerprint: string;
  environment: string;
  targetBranchId: string;
};

export type PostApplyVerificationInput = {
  target: JsonRecord;
  migration: MigrationSummary;
  manifest: JsonRecord;
  artifacts: ImportArtifacts;
  reconciliation: Reconciliation;
  reconciliationHash: string;
  snapshot: RuntimeSnapshot;
  plan: ImportPlan;
  ledgerRows: LedgerRow[];
};

export type PostApplyVerificationResult = {
  checks: Record<string, boolean>;
  mappedIds: Record<string, number | null>;
  createdIds: Record<string, number | null>;
  learningSetId: number | null;
  importRunId: string | null;
  passed: boolean;
};

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readJson(filePath: string): JsonRecord {
  let value: unknown;
  try {
    value = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  } catch {
    throw new Error("POST_APPLY_ARTIFACT_READ_FAILED");
  }
  if (!isRecord(value)) throw new Error("POST_APPLY_ARTIFACT_INVALID");
  return value;
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function int(value: unknown): number | null {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(numberValue) ? numberValue : null;
}

function safeTargetIdentity(target: ReturnType<typeof configuredCurationTarget>): JsonRecord {
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

function expectedDevelopmentTarget(target: JsonRecord): boolean {
  return target.environment === "development"
    && target.provider === "neon"
    && target.projectId === "shy-hill-72364426"
    && target.branchId === "br-square-grass-b3af0nte"
    && target.databaseName === "neondb"
    && target.purpose === "runtime"
    && target.roleName === "vocabflow_runtime"
    && target.usage === "development";
}

function expectedDevelopmentMigrationTarget(target: ReturnType<typeof getConnectionTarget>): boolean {
  return target.environment === "development"
    && target.provider === "neon"
    && target.projectId === "shy-hill-72364426"
    && target.branchId === "br-square-grass-b3af0nte"
    && target.databaseName === "neondb"
    && target.purpose === "migration"
    && target.roleName === "vocabflow_migration"
    && target.usage === "development";
}

function readJournal(repositoryRoot: string): MigrationJournal {
  const journal = readJson(path.join(repositoryRoot, "drizzle/migrations/meta/_journal.json"));
  const entries = records(journal.entries).map((entry) => ({
    idx: int(entry.idx),
    when: int(entry.when),
    tag: string(entry.tag),
  }));
  if (entries.some((entry) => entry.idx === null || entry.when === null || !entry.tag)) {
    throw new Error("POST_APPLY_LOCAL_MIGRATION_JOURNAL_INVALID");
  }
  return { entries: entries as MigrationJournal["entries"] };
}

async function inspectDevelopmentMigrations(input: {
  url: string;
  target: ReturnType<typeof getConnectionTarget>;
  repositoryRoot: string;
}): Promise<MigrationSummary> {
  const journal = readJournal(input.repositoryRoot).entries;
  const evidence = readMigrationHashEvidence(path.join(input.repositoryRoot, "drizzle/migrations"));
  const evidenceByCreatedAt = new Map(evidence.map((item) => [item.folderMillis, item]));
  if (evidence.length !== journal.length || journal.some((entry) => !evidenceByCreatedAt.has(entry.when))) {
    throw new Error("POST_APPLY_LOCAL_MIGRATION_CHAIN_MISMATCH");
  }

  const sql = openSql(input.url);
  try {
    return await sql.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, input.target);
      const [identity] = await tx<{ current_user: string; session_user: string; database_name: string }[]>`
        SELECT current_user::text AS current_user, session_user::text AS session_user, current_database()::text AS database_name
      `;
      if (!identity || identity.current_user !== input.target.roleName
        || identity.session_user !== input.target.roleName
        || identity.database_name !== input.target.databaseName) {
        throw new Error("POST_APPLY_MIGRATION_TARGET_IDENTITY_MISMATCH");
      }
      const [table] = await tx<{ exists: boolean }[]>`
        SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists
      `;
      const rows = table?.exists
        ? await tx<{ id: number; hash: string; created_at: string | number | null }[]>`
            SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at, id
          `
        : [];
      const localByWhen = new Map(journal.map((entry) => [entry.when, evidenceByCreatedAt.get(entry.when)!]));
      const appliedByWhen = new Map<number, { id: number; hash: string }>();
      const unexpectedAppliedRows = rows.filter((row) => {
        const createdAt = row.created_at === null ? null : Number(row.created_at);
        if (createdAt === null || !localByWhen.has(createdAt)) return true;
        appliedByWhen.set(createdAt, { id: row.id, hash: row.hash });
        return false;
      }).length;
      const missingJournalRows = journal.filter((entry) => !appliedByWhen.has(entry.when)).length;
      const hashMismatchCount = journal.filter((entry) => {
        const applied = appliedByWhen.get(entry.when);
        const local = localByWhen.get(entry.when);
        return !applied || !local || !databaseHashMatchesMigrationSource(local, applied.hash);
      }).length;
      const latestApplied = [...rows].sort((left, right) =>
        Number(right.created_at ?? 0) - Number(left.created_at ?? 0) || right.id - left.id,
      )[0];
      const latestCreatedAt = latestApplied?.created_at === null || latestApplied?.created_at === undefined
        ? null
        : Number(latestApplied.created_at);
      const latestTag = latestCreatedAt === null
        ? null
        : journal.find((entry) => entry.when === latestCreatedAt)?.tag ?? null;
      const current = table?.exists === true
        && rows.length === journal.length
        && missingJournalRows === 0
        && unexpectedAppliedRows === 0
        && hashMismatchCount === 0
        && latestTag === "0018_panoramic_spirit";
      return {
        current,
        appliedCount: rows.length,
        localMigrationCount: journal.length,
        latestTag,
        hashMismatchCount,
        missingJournalRows,
        unexpectedAppliedRows,
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function releaseArtifacts(root: string): ImportArtifacts {
  return {
    vocabulary: readJson(path.join(root, "import/vocabulary-import-v2.json")),
    topics: readJson(path.join(root, "import/topics-import-v2.json")),
    learningSets: readJson(path.join(root, "import/learning-sets-import-v2.json")),
    learningSetItems: readJson(path.join(root, "import/learning-set-items-import-v2.json")),
    topicMemberships: readJson(path.join(root, "import/topic-memberships-import-v2.json")),
  };
}

function verifySavedTransform(root: string, artifacts: ImportArtifacts): void {
  const transformed = runMasterVocabularyTransform({ datasetRoot: root, mode: "RELEASE", writeOutputs: false });
  const pairs = [
    [artifacts.vocabulary, transformed.vocabulary],
    [artifacts.topics, transformed.topics],
    [artifacts.learningSets, transformed.learningSets],
    [artifacts.learningSetItems, transformed.learningSetItems],
    [artifacts.topicMemberships, transformed.topicMemberships],
  ] as const;
  if (pairs.some(([saved, current]) => canonicalJsonSha256(saved) !== canonicalJsonSha256(current))) {
    throw new Error("POST_APPLY_RELEASE_TRANSFORM_MISMATCH");
  }
}

function actionFor(plan: ImportPlan, word: string, definitionPart: string) {
  const normalized = definitionPart.toLocaleLowerCase("en-US");
  return plan.vocabulary.find((action) => {
    const projection = action.runtimeProjection;
    return projection?.word === word
      && typeof projection.definitionEn === "string"
      && projection.definitionEn.toLocaleLowerCase("en-US").includes(normalized);
  });
}

function runtimeVocabulary(snapshot: RuntimeSnapshot, id: number) {
  return snapshot.vocabularies.find((row) => row.id === id);
}

/** Pure canary-specific checks. Hardcoded runtime IDs are historical expectations only. */
export function verifyPostApplyState(input: PostApplyVerificationInput): PostApplyVerificationResult {
  const { target, migration, manifest, artifacts, reconciliation, reconciliationHash, snapshot, plan, ledgerRows } = input;
  const checks: Record<string, boolean> = {};
  const check = (name: string, value: unknown) => { checks[name] = value === true; };
  const releaseHash = string(manifest.releaseHash);
  const releaseVersion = string(manifest.datasetVersion);
  const releaseMappings = snapshot.vocabularyMappings.filter((mapping) => mapping.lastReleaseHash === releaseHash);
  const apple = actionFor(plan, "apple", "round fruit");
  const bankFinancial = actionFor(plan, "bank", "organization that keeps and lends money");
  const bankRiver = actionFor(plan, "bank", "sloping ground");
  const recordNoun = actionFor(plan, "record", "piece of music");
  const recordVerb = actionFor(plan, "record", "capture sound");
  const lookAfter = actionFor(plan, "look after", "take responsibility");
  const algorithm = actionFor(plan, "algorithm", "defined sequence of steps");
  const reservation = actionFor(plan, "reservation", "arrangement made in advance");
  const expectedSenses = [apple, bankFinancial, bankRiver, recordNoun, recordVerb, lookAfter, algorithm, reservation];
  const mappingFor = (action: typeof apple) => action
    ? releaseMappings.find((mapping) => mapping.masterSenseId === action.masterSenseId)
    : undefined;
  const appleMapping = mappingFor(apple);
  const bankFinancialMapping = mappingFor(bankFinancial);
  const bankRiverMapping = mappingFor(bankRiver);
  const recordNounMapping = mappingFor(recordNoun);
  const recordVerbMapping = mappingFor(recordVerb);
  const lookAfterMapping = mappingFor(lookAfter);
  const algorithmMapping = mappingFor(algorithm);
  const reservationMapping = mappingFor(reservation);
  const mappedIds = {
    apple: appleMapping?.vocabularyId ?? null,
    bankFinancial: bankFinancialMapping?.vocabularyId ?? null,
    reservation: reservationMapping?.vocabularyId ?? null,
  };
  const createdIds = {
    bankRiver: bankRiverMapping?.vocabularyId ?? null,
    recordNoun: recordNounMapping?.vocabularyId ?? null,
    recordVerb: recordVerbMapping?.vocabularyId ?? null,
    lookAfter: lookAfterMapping?.vocabularyId ?? null,
    algorithm: algorithmMapping?.vocabularyId ?? null,
  };

  check("development_target", expectedDevelopmentTarget(target));
  check("migration_chain_current", migration.current
    && migration.appliedCount === 19
    && migration.localMigrationCount === 19
    && migration.latestTag === "0018_panoramic_spirit"
    && migration.hashMismatchCount === 0
    && migration.missingJournalRows === 0
    && migration.unexpectedAppliedRows === 0);
  check("approved_release_identity", releaseVersion === "2.1.0"
    && manifest.schemaVersion === "2.0.1"
    && manifest.status === "APPROVED"
    && releaseHash === EXPECTED_RELEASE_HASH);
  check("reconciliation_identity", reconciliationHash === EXPECTED_RECONCILIATION_HASH
    && reconciliation.artifactVersion === "runtime-reconciliation-v3"
    && reconciliation.owner === "human-reviewed"
    && reconciliation.analysisOnly === false
    && reconciliation.acceptedByImporter === true
    && reconciliation.allowPartialImport === false
    && reconciliation.sourceReleaseHash === EXPECTED_RELEASE_HASH
    && reconciliation.sourceDatasetId === artifacts.vocabulary.sourceDatasetId
    && canonicalJsonSha256(reconciliation.target) === canonicalJsonSha256(target)
    && reconciliation.snapshotFingerprint === EXPECTED_PRE_APPLY_SNAPSHOT
    && reconciliation.plannerSnapshotFingerprint === EXPECTED_PRE_APPLY_PLANNER_SNAPSHOT);
  check("expected_senses_present", expectedSenses.every(Boolean) && plan.vocabulary.length === 8);
  const mappedSenseIds = releaseMappings.map((mapping) => mapping.masterSenseId);
  check("eight_master_mappings", releaseMappings.length === 8
    && new Set(mappedSenseIds).size === 8
    && expectedSenses.every((action) => action !== undefined
      && releaseMappings.filter((mapping) => mapping.masterSenseId === action.masterSenseId).length === 1));
  check("historical_mapping_ids", mappedIds.apple === 1
    && mappedIds.bankFinancial === 871
    && mappedIds.reservation === 284
    && createdIds.bankRiver === 2025
    && createdIds.recordNoun === 2026
    && createdIds.recordVerb === 2027
    && createdIds.lookAfter === 2028
    && createdIds.algorithm === 2029);

  const fingerprintMatches = expectedSenses.every((action) => {
    if (!action) return false;
    const matches = releaseMappings.filter((candidate) => candidate.masterSenseId === action.masterSenseId);
    const mapping = matches[0];
    return matches.length === 1 && !!mapping && typeof action.fingerprint === "string"
      && action.fingerprint.length === 64
      && mapping.appliedProjectionFingerprint === action.fingerprint;
  });
  check("effective_projection_fingerprints", fingerprintMatches);

  const expectedVersions = new Map<number, number>([[1, 3], [871, 2], [284, 2], [2025, 1], [2026, 1], [2027, 1], [2028, 1], [2029, 1]]);
  const runtimeRowsMatch = [...expectedVersions].every(([id, version]) => {
    const row = runtimeVocabulary(snapshot, id);
    return !!row && row.contentVersion === version;
  });
  const createdRows = [2025, 2026, 2027, 2028, 2029].map((id) => runtimeVocabulary(snapshot, id));
  check("runtime_rows_and_versions", runtimeRowsMatch
    && createdRows.every((row) => row?.enabled === true && row.imageUrl === null && row.audioUrl === null));
  check("master_effective_fields", expectedSenses.every((action) => {
    if (!action?.runtimeProjection) return false;
    const mapping = releaseMappings.find((candidate) => candidate.masterSenseId === action.masterSenseId);
    const row = mapping ? runtimeVocabulary(snapshot, mapping.vocabularyId) : undefined;
    const projection = action.runtimeProjection;
    return !!row && row.word === projection.word
      && row.vietnamese === projection.vietnamese
      && row.definitionEn === projection.definitionEn
      && row.exampleEn === projection.exampleEn
      && row.enabled === projection.enabled;
  }));

  const appleRow = runtimeVocabulary(snapshot, 1);
  check("apple_canonical_and_duplicate_unmapped", appleRow?.definitionEn === "A round fruit with firm flesh and skin that is usually red, green, or yellow."
    && appleRow.exampleEn === "She packed an apple for her afternoon snack."
    && !!runtimeVocabulary(snapshot, 295)
    && runtimeVocabulary(snapshot, 295)?.word === "apple"
    && runtimeVocabulary(snapshot, 295)?.contentVersion === 1
    && runtimeVocabulary(snapshot, 295)?.topic === "Food"
    && snapshot.learningSetItems.some((item) => item.vocabularyId === 295)
    && !snapshot.vocabularyMappings.some((mapping) => mapping.masterSenseId === apple?.masterSenseId && mapping.vocabularyId === 295));
  check("record_849_untouched_and_unmapped", runtimeVocabulary(snapshot, 849)?.word === "record"
    && runtimeVocabulary(snapshot, 849)?.contentVersion === 1
    && /vinyl/i.test(runtimeVocabulary(snapshot, 849)?.definitionEn ?? "")
    && !snapshot.vocabularyMappings.some((mapping) =>
      (mapping.masterSenseId === recordNoun?.masterSenseId || mapping.masterSenseId === recordVerb?.masterSenseId)
      && mapping.vocabularyId === 849));

  const setArtifact = records(artifacts.learningSets.records).find((record) => record.slug === "technology-starter");
  const setId = setArtifact
    ? snapshot.learningSetMappings.find((mapping) => mapping.masterLearningSetId === setArtifact.masterLearningSetId)?.learningSetId ?? null
    : null;
  const setRow = setId === null ? undefined : snapshot.learningSets.find((learningSet) => learningSet.id === setId);
  const ownedItems = setArtifact
    ? snapshot.masterLearningSetMemberships.filter((item) => item.masterLearningSetId === setArtifact.masterLearningSetId)
    : [];
  const setAction = setArtifact
    ? plan.learningSets.find((action) => action.masterId === setArtifact.masterLearningSetId)
    : undefined;
  check("technology_starter_identity_and_item", setId === 17
    && setRow?.slug === "technology-starter"
    && setRow.enabled === (setArtifact?.enabled === true)
    && ownedItems.length === 1
    && ownedItems[0]?.masterSenseId === algorithm?.masterSenseId
    && ownedItems[0]?.vocabularyId === createdIds.algorithm
    && ownedItems[0]?.sortOrder === 1
    && snapshot.learningSetItems.some((item) => item.learningSetId === setId
      && item.vocabularyId === createdIds.algorithm && item.sortOrder === 1)
    && setAction?.action === "NOOP");

  const ledger = ledgerRows[0];
  check("single_matching_import_run", ledgerRows.length === 1
    && ledger?.id === EXPECTED_IMPORT_RUN_ID
    && ledger.planFingerprint === EXPECTED_PLAN_FINGERPRINT
    && ledger.environment === "development"
    && ledger.targetBranchId === "br-square-grass-b3af0nte");
  check("post_apply_plan_noop", plan.mode === "DRY_RUN"
    && plan.targetEnvironment === "development"
    && plan.eligibility.reconciliationComplete
    && plan.issues.length === 0
    && plan.vocabulary.length === 8
    && plan.vocabulary.every((action) => action.action === "NOOP")
    && plan.summary.vocabularyNoops === 8
    && plan.summary.vocabularyCreates === 0
    && plan.summary.vocabularyUpdates === 0
    && plan.summary.contentVersionIncrements === 0
    && plan.learningSets.length === 1
    && plan.learningSets.every((action) => action.action === "NOOP")
    && plan.learningSetMemberships.length === 1
    && plan.learningSetMemberships.every((action) => action.action === "NOOP"));
  check("no_history_or_assignment_actions", plan.historySafety.deletionsPlanned === 0
    && plan.historySafety.learnerAssignmentsChanged === 0);

  const failures = Object.values(checks).some((passed) => !passed);
  return {
    checks,
    mappedIds,
    createdIds,
    learningSetId: setId,
    importRunId: ledger?.id ?? null,
    passed: !failures,
  };
}

export function classifyPostApplyScannerMismatch(
  errorCode: string,
  postApplyVerifierPassed: boolean,
): "EXPECTED_PRE_APPLY_EVIDENCE_STALE_AFTER_SUCCESSFUL_APPLY" | "UNEXPECTED" {
  return errorCode === "OWNER_PROPOSAL_CANDIDATE_SNAPSHOT_MISMATCH" && postApplyVerifierPassed
    ? "EXPECTED_PRE_APPLY_EVIDENCE_STALE_AFTER_SUCCESSFUL_APPLY"
    : "UNEXPECTED";
}

function loadRepositoryEnv(repositoryRoot: string): void {
  const envPath = path.join(repositoryRoot, ".env");
  if (existsSync(envPath)) {
    try { loadEnvFile(envPath); } catch { throw new Error("POST_APPLY_ENV_FILE_INVALID"); }
  }
}

function parseArgs(args: readonly string[]): void {
  if (args.length !== 2 || args[0] !== "--target" || args[1] !== "development") {
    throw new Error("POST_APPLY_USAGE:--target-development-only");
  }
}

async function main(): Promise<void> {
  parseArgs(process.argv.slice(2));
  const repositoryRoot = process.cwd();
  loadRepositoryEnv(repositoryRoot);
  const { context, environment } = readContext();
  if (context !== "local-development" || environment !== "development") {
    throw new Error("POST_APPLY_LOCAL_DEVELOPMENT_CONTEXT_REQUIRED");
  }
  const targetName = resolveCurationTargetName(context, "development");
  if (targetName !== "development") throw new Error("POST_APPLY_TARGET_MISMATCH");
  const source: TrustedSource = "dev-launcher";
  const runtimeTarget = configuredCurationTarget("development");
  assertCurationDatabaseAccess({
    executionContext: context,
    trustedSource: source,
    vocabularyEnvironment: environment,
    databaseEnvironment: process.env.DATABASE_ENV,
    requestedTarget: "development",
    resolvedTarget: runtimeTarget,
    mode: "dry-run",
  });
  const targetIdentity = safeTargetIdentity(runtimeTarget);
  if (!expectedDevelopmentTarget(targetIdentity)) throw new Error("POST_APPLY_TARGET_MISMATCH");

  const migrationTarget = getConnectionTarget("development", "migration");
  if (!expectedDevelopmentMigrationTarget(migrationTarget)) throw new Error("POST_APPLY_MIGRATION_TARGET_MISMATCH");
  const migrationConnection = await assertResolvedTargetBeforeMutation({
    context,
    source,
    environment,
    purpose: "migration",
    operation: "db-check",
    target: migrationTarget,
  });
  const migration = await inspectDevelopmentMigrations({
    url: migrationConnection.url,
    target: migrationTarget,
    repositoryRoot,
  });

  const releaseRoot = path.join(repositoryRoot, RELEASE_ROOT);
  const manifest = readJson(path.join(releaseRoot, "dataset.json"));
  const artifacts = releaseArtifacts(releaseRoot);
  verifySavedTransform(releaseRoot, artifacts);
  const reconciliation = readJson(path.join(repositoryRoot, RECONCILIATION_PATH)) as unknown as Reconciliation;
  const reconciliationHash = canonicalJsonSha256(reconciliation);
  if (manifest.datasetVersion !== "2.1.0"
    || manifest.schemaVersion !== "2.0.1"
    || manifest.status !== "APPROVED"
    || manifest.releaseHash !== EXPECTED_RELEASE_HASH
    || artifacts.vocabulary.sourceReleaseHash !== EXPECTED_RELEASE_HASH
    || artifacts.vocabulary.artifactVersion !== "app-import-v3"
    || artifacts.vocabulary.projectionContractVersion !== "runtime-vocabulary-projection-v2"
    || reconciliationHash !== EXPECTED_RECONCILIATION_HASH) {
    throw new Error("POST_APPLY_RELEASE_OR_RECONCILIATION_MISMATCH");
  }

  const runtimeConnection = await assertResolvedTargetBeforeMutation({
    context,
    source,
    environment,
    purpose: "runtime",
    operation: "db-check",
    target: runtimeTarget,
  });
  const runtimeSql = openSql(runtimeConnection.url);
  try {
    await runtimeSql.begin(async (tx) => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, runtimeTarget);
      const [identity] = await tx<{ current_user: string; session_user: string; database_name: string }[]>`
        SELECT current_user::text AS current_user, session_user::text AS session_user, current_database()::text AS database_name
      `;
      if (!identity || identity.current_user !== "vocabflow_runtime"
        || identity.session_user !== "vocabflow_runtime"
        || identity.database_name !== "neondb") {
        throw new Error("POST_APPLY_RUNTIME_TARGET_IDENTITY_MISMATCH");
      }
    });
    const store = createPostgresMasterImportStore(runtimeSql);
    const snapshot = await store.readSnapshot();
    const sourceDatasetId = string(artifacts.vocabulary.sourceDatasetId);
    const appImportContractVersion = string(artifacts.vocabulary.artifactVersion);
    const projectionContractVersion = string(artifacts.vocabulary.projectionContractVersion);
    if (!/^[0-9a-f-]{36}$/i.test(sourceDatasetId) || !appImportContractVersion || !projectionContractVersion) {
      throw new Error("POST_APPLY_RELEASE_IDENTITY_INVALID");
    }
    type LedgerDbRow = { id: string; plan_fingerprint: string; environment: string; target_branch_id: string };
    const ledgerRows = await runtimeSql.begin(async (tx): Promise<LedgerDbRow[]> => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`;
      const rows = await tx<LedgerDbRow[]>`
        SELECT id::text AS id, plan_fingerprint, environment, target_branch_id
        FROM "vocabflow_app"."master_vocabulary_import_runs"
        WHERE dataset_id = ${sourceDatasetId}::uuid
          AND release_hash = ${EXPECTED_RELEASE_HASH}
          AND app_import_contract_version = ${appImportContractVersion}
          AND projection_contract_version = ${projectionContractVersion}
          AND reconciliation_hash = ${EXPECTED_RECONCILIATION_HASH}
      `;
      return rows;
    });
    const plan = buildMasterVocabularyImportPlan({
      artifacts,
      reconciliation,
      snapshot,
      targetEnvironment: "development",
      targetIdentity,
      mode: "DRY_RUN",
    });
    const result = verifyPostApplyState({
      target: targetIdentity,
      migration,
      manifest,
      artifacts,
      reconciliation,
      reconciliationHash,
      snapshot,
      plan,
      ledgerRows: ledgerRows.map((row) => ({
        id: row.id,
        planFingerprint: row.plan_fingerprint,
        environment: row.environment,
        targetBranchId: row.target_branch_id,
      })),
    });
    for (const [name, passed] of Object.entries(result.checks)) {
      process.stdout.write(`CHECK_${name.toUpperCase()}=${passed ? "PASS" : "FAIL"}\n`);
    }
    process.stdout.write(`MIGRATIONS=${migration.appliedCount}/${migration.localMigrationCount};LATEST=${migration.latestTag};HASH_MISMATCHES=${migration.hashMismatchCount}\n`);
    process.stdout.write(`MAPPED_IDS=apple:${result.mappedIds.apple},bank_financial:${result.mappedIds.bankFinancial},reservation:${result.mappedIds.reservation}\n`);
    process.stdout.write(`CREATED_IDS=bank_river:${result.createdIds.bankRiver},record_noun:${result.createdIds.recordNoun},record_verb:${result.createdIds.recordVerb},look_after:${result.createdIds.lookAfter},algorithm:${result.createdIds.algorithm}\n`);
    process.stdout.write(`TECHNOLOGY_STARTER_ID=${result.learningSetId}\nIMPORT_RUN_ID=${result.importRunId}\n`);
    process.stdout.write("POST_APPLY_PLAN_NOOP=" + (result.checks.post_apply_plan_noop ? "YES" : "NO") + "\n");
    process.stdout.write("RELEASE_ALREADY_APPLIED=" + (result.checks.single_matching_import_run ? "YES" : "NO") + "\n");
    process.stdout.write("DATABASE_WRITES=NONE\nPRODUCTION_CONNECTION=NONE\n");
    process.stdout.write(`POST_APPLY_VERIFIER=${result.passed ? "PASS" : "FAIL"}\n`);
    const scannerMismatch = classifyPostApplyScannerMismatch(
      "OWNER_PROPOSAL_CANDIDATE_SNAPSHOT_MISMATCH",
      result.passed,
    );
    process.stdout.write(`SCANNER_POST_APPLY_MISMATCH=${scannerMismatch === "EXPECTED_PRE_APPLY_EVIDENCE_STALE_AFTER_SUCCESSFUL_APPLY" ? "EXPECTED" : "UNEXPECTED"}\n`);
    process.stdout.write(`POST_APPLY_VERIFIER_READY=${result.passed ? "YES" : "NO"}\n`);
    if (!result.passed) throw new Error("POST_APPLY_VERIFICATION_CHECK_FAILED");
  } finally {
    await runtimeSql.end({ timeout: 5 });
  }
}

function isMain(): boolean {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "";
    process.stderr.write(`${/^[A-Z][A-Z0-9_:.-]{2,140}$/.test(message) ? message : "POST_APPLY_VERIFICATION_FAILED"}\n`);
    process.exitCode = 1;
  });
}
