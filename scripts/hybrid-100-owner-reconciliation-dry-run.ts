import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TrustedSource } from "@vocabflow/contracts";
import { getConnectionTarget } from "../config/database-targets";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { assertResolvedTargetBeforeMutation, assertMarkers } from "./runtime-validation";
import { assertCurationDatabaseAccess } from "./vocabulary-curation-access";
import { createPostgresMasterImportStore } from "./master-vocabulary-v2-import-store";
import {
  buildMasterVocabularyImportPlan,
  RUNTIME_RECONCILIATION_VERSION,
  type ImportArtifacts,
  type ImportPlan,
  type JsonRecord,
  type Reconciliation,
  type RuntimeSnapshot,
} from "./master-vocabulary-v2-import-planner";
import {
  HYBRID_100_2_2_1,
  HYBRID_100_READ_ONLY_TRANSACTION,
  isExactHybrid100DevelopmentTarget,
  runHybrid100DevelopmentReconciliationScan,
  verifyHybrid100SourceRelease,
} from "./hybrid-100-development-reconciliation-scan";
import { runMasterVocabularyTransform } from "./transform-master-vocabulary-v2";
import { canonicalJsonSha256 } from "./validate-master-vocabulary-v2";

export const PHASE_2G2B_BASELINE = "642e1f80a6c0236771d2c5bc4c93992faa982b28";
export const PHASE_2G2B_PREVIOUS_BASELINE = "349254178511a3ced1afafb8da370dbf719227bb";
export const APPROVED_PROPOSAL_FINGERPRINT = "6033cb0d217578aeab7b7e3fb750fda0476c2b880e9958f3865992604b2be6c0";
export const APPROVED_SOURCE_SNAPSHOT = "89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e";

export const HYBRID_100_APPROVED_MAPS = [
  { label: "deviate", masterSenseId: "01a1070c-7c58-76b5-a2a9-78fe16fc29bb", appVocabularyId: 1836 },
  { label: "pain-relief", masterSenseId: "01a1070c-7c58-76b5-a2aa-7e0812b069ae", appVocabularyId: 1461 },
  { label: "stand", masterSenseId: "01a1070c-7c59-726e-88d5-882b36643f4e", appVocabularyId: 948 },
] as const;

const OWNER_WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review";
const PROPOSAL_PATH = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review/owner-reconciliation-proposal.json";
const SOURCE_CANDIDATE_PATH = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/runtime-reconciliation-candidates-development.json";
const RELEASE_PATH = "vocabflow-dataset/releases/hybrid-100-v2.2.1";
const FRESH_SCAN_ARTIFACT_ROOT = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1";
const APP_ARTIFACT_FILES = {
  vocabulary: "vocabulary-import-v2.json",
  topics: "topics-import-v2.json",
  learningSets: "learning-sets-import-v2.json",
  learningSetItems: "learning-set-items-import-v2.json",
  topicMemberships: "topic-memberships-import-v2.json",
} as const;

export type ProposalSense = JsonRecord & {
  masterSenseId: string;
  lemma: string;
  reviewedMeaning: string;
  proposedDecision: string;
  proposedAppVocabularyId: number | null;
  proposedFirstAdoptionPolicy: string | null;
  runtimeCandidateIds: number[];
  ownerDecision: string;
};
type OwnerDecisionRow = {
  masterSenseId: string;
  decision: "CREATE_NEW" | "MAP_EXISTING";
  appVocabularyId: number | null;
  firstAdoptionPolicy?: "UPDATE_TO_MASTER";
};

function fail(code: string): never { throw new Error(code); }

function readJson<T>(filePath: string): T {
  try { return JSON.parse(readFileSync(filePath, "utf8")) as T; }
  catch { return fail("PHASE_2G2B_ARTIFACT_READ_FAILED"); }
}

function writeJson(filePath: string, value: unknown): void {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function safeTargetIdentity(target: ReturnType<typeof getConnectionTarget>): JsonRecord {
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

export function assertOwnerApprovedDevelopmentTarget(target: ReturnType<typeof getConnectionTarget>): void {
  if (!isExactHybrid100DevelopmentTarget(target)
    || target.environment !== "development"
    || target.provider !== "neon"
    || target.projectId !== "shy-hill-72364426"
    || target.branchId !== "br-square-grass-b3af0nte"
    || target.databaseName !== "neondb") fail("PHASE_2G2B_DEVELOPMENT_TARGET_MISMATCH");
}

function verifyProposal(root: string): { proposal: JsonRecord & { senses: ProposalSense[] }; fingerprint: string } {
  const proposal = readJson<JsonRecord & { senses: ProposalSense[] }>(path.join(root, PROPOSAL_PATH));
  const fingerprint = canonicalJsonSha256(proposal);
  if (fingerprint !== APPROVED_PROPOSAL_FINGERPRINT
    || proposal.artifactType !== "HYBRID_100_OWNER_RECONCILIATION_PROPOSAL"
    || proposal.senses.length !== HYBRID_100_2_2_1.senses
    || proposal.ownership?.analysisOnly !== true
    || proposal.ownership?.acceptedByImporter !== false
    || proposal.senses.some((sense) => sense.ownerDecision !== "UNRESOLVED")) {
    fail("PHASE_2G2B_APPROVED_PROPOSAL_PIN_MISMATCH");
  }
  const selected = proposal.senses.filter((sense) => sense.proposedDecision === "MAP_EXISTING");
  const selectedTuples = selected.map((sense) => `${sense.masterSenseId}:${sense.proposedAppVocabularyId}:${sense.proposedFirstAdoptionPolicy}`).sort();
  const expectedTuples = HYBRID_100_APPROVED_MAPS.map((row) => `${row.masterSenseId}:${row.appVocabularyId}:UPDATE_TO_MASTER`).sort();
  if (canonicalJsonSha256(selectedTuples) !== canonicalJsonSha256(expectedTuples)
    || proposal.senses.some((sense) => sense.proposedDecision !== "MAP_EXISTING" && sense.proposedDecision !== "CREATE_NEW")) {
    fail("PHASE_2G2B_PROPOSAL_DECISIONS_MISMATCH");
  }
  const emergencyRelief = proposal.senses.find((sense) => sense.masterSenseId === "01a1070c-7c5a-7542-a093-116a29fa3a72");
  if (!emergencyRelief || emergencyRelief.proposedDecision !== "CREATE_NEW" || emergencyRelief.proposedAppVocabularyId !== null) {
    fail("PHASE_2G2B_RELIEF_SENSE_IDENTITY_MISMATCH");
  }
  return { proposal, fingerprint };
}

export function materializeOwnerDecisionRows(proposalSenses: ProposalSense[]): OwnerDecisionRow[] {
  if (proposalSenses.length !== HYBRID_100_2_2_1.senses) fail("PHASE_2G2B_OWNER_DECISION_COUNT_MISMATCH");
  const proposalById = new Map(proposalSenses.map((sense) => [sense.masterSenseId, sense]));
  const rows = proposalSenses.map((sense): OwnerDecisionRow => {
    const approved = HYBRID_100_APPROVED_MAPS.find((map) => map.masterSenseId === sense.masterSenseId);
    if (!approved) return { masterSenseId: sense.masterSenseId, decision: "CREATE_NEW", appVocabularyId: null };
    if (sense.proposedDecision !== "MAP_EXISTING"
      || sense.proposedAppVocabularyId !== approved.appVocabularyId
      || sense.proposedFirstAdoptionPolicy !== "UPDATE_TO_MASTER"
      || !sense.runtimeCandidateIds.includes(approved.appVocabularyId)) fail("PHASE_2G2B_APPROVED_MAP_PROPOSAL_MISMATCH");
    return {
      masterSenseId: sense.masterSenseId,
      decision: "MAP_EXISTING",
      appVocabularyId: approved.appVocabularyId,
      firstAdoptionPolicy: "UPDATE_TO_MASTER",
    };
  });
  if (proposalById.size !== HYBRID_100_2_2_1.senses
    || rows.filter((row) => row.decision === "CREATE_NEW").length !== 97
    || rows.filter((row) => row.decision === "MAP_EXISTING").length !== 3
    || rows.filter((row) => row.decision === "MAP_EXISTING").some((row) => row.firstAdoptionPolicy !== "UPDATE_TO_MASTER")) {
    fail("PHASE_2G2B_FINAL_DECISION_SET_INVALID");
  }
  return rows;
}

export function makeOwnerAuthorization(input: {
  proposalFingerprint: string;
  freshScanFingerprints: string[];
  plannerSnapshotFingerprint?: string;
  snapshotStale: boolean;
  target: JsonRecord;
}) {
  const payload = {
    artifactType: "HYBRID_100_OWNER_AUTHORIZATION",
    artifactVersion: 1,
    ownerAuthorizationStatus: input.snapshotStale ? "APPROVED_SNAPSHOT_STALE" : "APPROVED",
    owner: "human",
    approvedSourceCommit: PHASE_2G2B_BASELINE,
    previousApprovedSourceCommit: PHASE_2G2B_PREVIOUS_BASELINE,
    approvedProposalFingerprint: input.proposalFingerprint,
    sourceRelease: {
      datasetVersion: HYBRID_100_2_2_1.datasetVersion,
      schemaVersion: HYBRID_100_2_2_1.schemaVersion,
      status: HYBRID_100_2_2_1.schemaStatus,
      releaseHash: HYBRID_100_2_2_1.releaseHash,
      releaseTreeFingerprint: HYBRID_100_2_2_1.releaseTreeFingerprint,
    },
    sourceSnapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
    freshDevelopmentSnapshotFingerprints: input.freshScanFingerprints,
    snapshotStale: input.snapshotStale,
    ...(input.plannerSnapshotFingerprint ? { plannerSnapshotFingerprint: input.plannerSnapshotFingerprint } : {}),
    target: input.target,
    decisions: {
      CREATE_NEW: 97,
      MAP_EXISTING: 3,
      SKIP: 0,
      UNRESOLVED: 0,
      maps: HYBRID_100_APPROVED_MAPS.map((row) => ({ ...row, firstAdoptionPolicy: "UPDATE_TO_MASTER" })),
    },
    authorizationScope: {
      allowed: ["materialize human-reviewed reconciliation", "Development read-only verification", "Development DRY_RUN planning"],
      forbidden: ["APPLY", "INSERT", "UPDATE", "DELETE", "DDL", "runtime ID allocation", "bridge mapping writes", "migration execution", "learner mutation", "Production access"],
      databaseWrites: "NONE",
      importerApplyAuthorized: false,
      productionAuthorized: false,
    },
  };
  const ownerAuthorizationFingerprint = canonicalJsonSha256(payload);
  return { ...payload, ownerAuthorizationFingerprint };
}

export function materializeFinalizedReconciliation(input: {
  artifacts: ImportArtifacts;
  decisions: OwnerDecisionRow[];
  ownerAuthorizationFingerprint: string;
  snapshotFingerprint: string;
  plannerSnapshotFingerprint: string;
  target: JsonRecord;
}): Reconciliation & JsonRecord {
  const source = input.artifacts.vocabulary;
  const reconciliation = {
    artifactVersion: RUNTIME_RECONCILIATION_VERSION,
    owner: "human-reviewed",
    generatedByTransform: false,
    analysisOnly: false,
    acceptedByImporter: true,
    appImportContractVersion: source.artifactVersion,
    projectionContractVersion: source.projectionContractVersion,
    sourceDatasetId: source.sourceDatasetId,
    sourceDatasetVersion: source.sourceDatasetVersion,
    sourceSchemaVersion: source.sourceSchemaVersion,
    sourceManifestContentHash: source.sourceManifestContentHash,
    sourceReleaseHash: source.sourceReleaseHash,
    snapshotFingerprint: input.snapshotFingerprint,
    plannerSnapshotFingerprint: input.plannerSnapshotFingerprint,
    target: input.target,
    allowPartialImport: false,
    ownerAuthorizationFingerprint: input.ownerAuthorizationFingerprint,
    vocabulary: input.decisions,
    topics: [],
    learningSets: [],
  };
  if (reconciliation.sourceDatasetVersion !== "2.2.1"
    || reconciliation.sourceSchemaVersion !== "2.0.1"
    || reconciliation.sourceReleaseHash !== HYBRID_100_2_2_1.releaseHash
    || reconciliation.appImportContractVersion !== "app-import-v3"
    || reconciliation.projectionContractVersion !== "runtime-vocabulary-projection-v2") fail("PHASE_2G2B_RECONCILIATION_SOURCE_MISMATCH");
  return reconciliation as Reconciliation & JsonRecord;
}

function artifactRoot(root: string): string { return path.join(root, OWNER_WORKSPACE); }

function materializeAppArtifacts(root: string): ImportArtifacts {
  const transformed = runMasterVocabularyTransform({
    datasetRoot: path.join(root, RELEASE_PATH), mode: "RELEASE", writeOutputs: false,
  });
  const artifacts: ImportArtifacts = {
    vocabulary: transformed.vocabulary as unknown as JsonRecord,
    topics: transformed.topics as unknown as JsonRecord,
    learningSets: transformed.learningSets as unknown as JsonRecord,
    learningSetItems: transformed.learningSetItems as unknown as JsonRecord,
    topicMemberships: transformed.topicMemberships as unknown as JsonRecord,
  };
  if (Array.isArray(artifacts.vocabulary.records) && artifacts.vocabulary.records.length !== 100) fail("PHASE_2G2B_PROJECTION_COUNT_MISMATCH");
  for (const [name, file] of Object.entries(APP_ARTIFACT_FILES)) writeJson(path.join(artifactRoot(root), "import", file), artifacts[name as keyof typeof APP_ARTIFACT_FILES]);
  return artifacts;
}

function summarizeFreshMigration(root: string): JsonRecord {
  const scanRoot = path.join(root, FRESH_SCAN_ARTIFACT_ROOT);
  const migration = readJson<JsonRecord>(path.join(scanRoot, "migration-state.json"));
  const history = migration.history as JsonRecord | undefined;
  const bridge = migration.bridgeSchema as JsonRecord | undefined;
  const latest = history?.latestApplied as JsonRecord | undefined;
  const hashMismatches = Array.isArray(history?.hashMismatches) ? history.hashMismatches.length : -1;
  const missingJournalRows = Array.isArray(history?.missingJournalRows) ? history.missingJournalRows.length : -1;
  const result = {
    current: history?.current === true,
    localMigrationCount: history?.localMigrationCount,
    appliedCount: history?.appliedCount,
    latestAppliedTag: latest?.tag,
    hashMismatchCount: hashMismatches,
    missingJournalRowCount: missingJournalRows,
    bridgeReady: bridge?.ready === true,
    missingBridgeTables: Array.isArray(bridge?.missingTables) ? bridge.missingTables.length : -1,
    missingBridgeColumns: Array.isArray(bridge?.missingColumns) ? bridge.missingColumns.length : -1,
    missingBridgeConstraints: Array.isArray(bridge?.missingConstraints) ? bridge.missingConstraints.length : -1,
    missingWriteGuards: Array.isArray(bridge?.missingWriteGuardTriggers) ? bridge.missingWriteGuardTriggers.length : -1,
  };
  if (result.current !== true || result.localMigrationCount !== 19 || result.appliedCount !== 19
    || result.latestAppliedTag !== "0018_panoramic_spirit" || result.hashMismatchCount !== 0
    || result.missingJournalRowCount !== 0 || result.bridgeReady !== true
    || result.missingBridgeTables !== 0 || result.missingBridgeColumns !== 0
    || result.missingBridgeConstraints !== 0 || result.missingWriteGuards !== 0) fail("PHASE_2G2B_MIGRATION_OR_BRIDGE_NOT_READY");
  return result;
}

function writeDevelopmentEvidence(root: string, evidence: JsonRecord): void {
  writeJson(path.join(artifactRoot(root), "development-revalidation.json"), evidence);
}

function writeBlockedReport(root: string, input: {
  reason: string;
  ownerAuthorizationFingerprint: string;
  freshFingerprints: string[];
  snapshotStale: boolean;
  target: JsonRecord;
  migrationReady: boolean;
}) {
  const lines = [
    "# Phase 2G.2B — Owner-approved Hybrid-100 Development DRY_RUN",
    "",
    "- Status: **BLOCKED**",
    `- Block reason: \`${input.reason}\``,
    `- Remote baseline: \`${PHASE_2G2B_BASELINE}\``,
    `- Approved proposal fingerprint: \`${APPROVED_PROPOSAL_FINGERPRINT}\``,
    `- Owner authorization fingerprint: \`${input.ownerAuthorizationFingerprint}\``,
    `- Source release: ${HYBRID_100_2_2_1.datasetVersion} / ${HYBRID_100_2_2_1.schemaStatus}`,
    `- Release hash: \`${HYBRID_100_2_2_1.releaseHash}\``,
    `- Owner-approved source snapshot: \`${APPROVED_SOURCE_SNAPSHOT}\``,
    `- Fresh Development snapshots: ${input.freshFingerprints.map((fingerprint) => `\`${fingerprint}\``).join(", ") || "unavailable"}`,
    `- OWNER_AUTHORIZATION_SNAPSHOT_STALE: **${input.snapshotStale ? "true" : "false"}**`,
    `- Development target: ${String(input.target.environment)} / ${String(input.target.provider)} / project \`${String(input.target.projectId)}\` / branch \`${String(input.target.branchId)}\` / database \`${String(input.target.databaseName)}\``,
    `- Migration and bridge readiness: **${input.migrationReady ? "READY" : "NOT READY"}**`,
    "- Importer readiness: **BLOCKED**",
    "- DRY_RUN plan fingerprint: not generated",
    "- Owner reconciliation approved: **YES**",
    "- DRY_RUN technically apply-ready: **NO**",
    "- Database APPLY authorized: **NO**",
    "- Production authorized: **NO**",
    "- Database connection: **READ_ONLY_DEVELOPMENT**",
    "- Database writes: **NONE**",
    "- Runtime IDs allocated: **0**",
    "- Bridge mappings created: **0**",
    "- Importer APPLY executed: **NO**",
    "- Production connection: **NONE**",
    "",
  ];
  writeFileSync(path.join(artifactRoot(root), "dry-run-report.md"), `${lines.join("\n")}\n`, "utf8");
}

async function captureDevelopmentPlannerSnapshot(): Promise<{ snapshot: RuntimeSnapshot; target: JsonRecord }> {
  const { context, environment } = readContext();
  const trustedSource: TrustedSource = process.env.GITHUB_ACTIONS === "true" ? "github-actions" : "dev-launcher";
  assertMarkers(context, trustedSource, environment);
  if (environment !== "development") fail("PHASE_2G2B_DEVELOPMENT_ENVIRONMENT_REQUIRED");
  const target = getConnectionTarget("development", "runtime");
  assertOwnerApprovedDevelopmentTarget(target);
  assertCurationDatabaseAccess({
    executionContext: context,
    trustedSource,
    vocabularyEnvironment: environment,
    databaseEnvironment: process.env.DATABASE_ENV,
    requestedTarget: "development",
    resolvedTarget: target,
    mode: "dry-run",
  });
  const connection = await assertResolvedTargetBeforeMutation({
    context,
    source: trustedSource,
    environment,
    purpose: "runtime",
    operation: "db-check",
    target,
    connectionString: process.env.DATABASE_URL,
  });
  const sql = openSql(connection.url);
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(HYBRID_100_READ_ONLY_TRANSACTION);
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, target);
      const [session] = await tx<Array<{
        current_user: string;
        session_user: string;
        database_name: string;
        transaction_isolation: string;
        transaction_read_only: string;
      }>>`
        SELECT current_user::text AS current_user, session_user::text AS session_user,
          current_database()::text AS database_name,
          current_setting('transaction_isolation')::text AS transaction_isolation,
          current_setting('transaction_read_only')::text AS transaction_read_only
      `;
      const [bridgeTables] = await tx<Array<{ ready: boolean }>>`
        SELECT to_regclass('vocabflow_app.master_vocabulary_mappings') IS NOT NULL
          AND to_regclass('vocabflow_app.master_topic_mappings') IS NOT NULL
          AND to_regclass('vocabflow_app.master_learning_set_mappings') IS NOT NULL AS ready
      `;
      if (!session || session.current_user !== target.roleName || session.session_user !== target.roleName
        || session.database_name !== target.databaseName || session.transaction_isolation !== "repeatable read"
        || session.transaction_read_only !== "on" || bridgeTables?.ready !== true) {
        fail("PHASE_2G2B_RUNTIME_SESSION_VERIFICATION_FAILED");
      }
    });
    const snapshot = await createPostgresMasterImportStore(sql).readSnapshot();
    return { snapshot, target: safeTargetIdentity(target) };
  } finally {
    await sql.end({ timeout: 5 });
  }
}

function actionCounts(plan: ImportPlan) {
  const actions = plan.vocabulary.map((row) => row.action);
  const mappings = plan.vocabulary.map((row) => row.mappingAction);
  return {
    CREATE: actions.filter((action) => action === "CREATE").length,
    UPDATE: actions.filter((action) => action === "UPDATE").length,
    NOOP: actions.filter((action) => action === "NOOP").length,
    SKIP: actions.filter((action) => action === "SKIP").length,
    CONFLICT: actions.filter((action) => action === "CONFLICT").length,
    BLOCKED: actions.filter((action) => action === "BLOCKED").length,
    CREATE_MAPPING: mappings.filter((action) => action === "CREATE_MAPPING").length,
    KEEP_MAPPING: mappings.filter((action) => action === "KEEP_MAPPING").length,
    MAPPING_CONFLICT: mappings.filter((action) => action === "CONFLICT").length,
  };
}

function selectedUpdateDetails(input: {
  plan: ImportPlan;
  snapshot: RuntimeSnapshot;
  decisionRows: OwnerDecisionRow[];
}): JsonRecord[] {
  return HYBRID_100_APPROVED_MAPS.map((approved) => {
    const action = input.plan.vocabulary.find((row) => row.masterSenseId === approved.masterSenseId);
    const decision = input.decisionRows.find((row) => row.masterSenseId === approved.masterSenseId);
    if (!action || !decision || action.action !== "UPDATE" || action.appVocabularyId !== approved.appVocabularyId
      || action.expectedContentVersion !== 1 || action.nextContentVersion !== 2) fail("PHASE_2G2B_APPROVED_UPDATE_PLAN_MISMATCH");
    const progressRefs = input.snapshot.progressVocabularyIds.filter((id) => id === approved.appVocabularyId).length;
    const reviewRefs = input.snapshot.reviewVocabularyIds.filter((id) => id === approved.appVocabularyId).length;
    const setFields = action.fieldOperations.filter((field) => field.action === "SET").map((field) => field.field);
    const preserveFields = action.fieldOperations.filter((field) => field.action === "PRESERVE").map((field) => field.field);
    if (!["ipa", "imageUrl", "audioUrl", "topic", "level"].every((field) => preserveFields.includes(field as never))
      || action.controlOperations.some((field) => field.action !== "PRESERVE")) fail("PHASE_2G2B_RUNTIME_ENRICHMENT_NOT_PRESERVED");
    return {
      label: approved.label,
      appVocabularyId: approved.appVocabularyId,
      currentContentVersion: action.expectedContentVersion,
      nextContentVersion: action.nextContentVersion,
      fieldsSet: setFields,
      fieldsPreserved: preserveFields,
      controlOperations: action.controlOperations.map((field) => ({ field: field.field, action: field.action })),
      learnerProgressRefs: progressRefs,
      reviewEventRefs: reviewRefs,
      firstAdoptionPolicy: decision.firstAdoptionPolicy,
    };
  });
}

export function buildOwnerApprovedDryRunPlan(input: {
  artifacts: ImportArtifacts;
  reconciliation: Reconciliation;
  snapshot: RuntimeSnapshot;
  targetIdentity: JsonRecord;
}): ImportPlan {
  return buildMasterVocabularyImportPlan({
    artifacts: input.artifacts,
    reconciliation: input.reconciliation,
    snapshot: input.snapshot,
    targetEnvironment: "development",
    expectedSnapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
    expectedPlannerSnapshotFingerprint: input.reconciliation.plannerSnapshotFingerprint,
    targetIdentity: input.targetIdentity,
    mode: "DRY_RUN",
  });
}

function validateFinalPlan(plan: ImportPlan): void {
  const counts = actionCounts(plan);
  if (plan.mode !== "DRY_RUN" || plan.targetEnvironment !== "development"
    || plan.vocabulary.length !== 100 || counts.CREATE !== 97 || counts.UPDATE !== 3
    || counts.NOOP !== 0 || counts.SKIP !== 0 || counts.CONFLICT !== 0 || counts.BLOCKED !== 0
    || counts.CREATE_MAPPING !== 100 || counts.KEEP_MAPPING !== 0 || counts.MAPPING_CONFLICT !== 0
    || plan.eligibility.canApply !== true || plan.eligibility.reconciliationComplete !== true
    || plan.issues.length !== 0 || plan.overrideConflicts.length !== 0
    || plan.historySafety.deletionsPlanned !== 0 || plan.historySafety.learnerAssignmentsChanged !== 0) {
    fail("PHASE_2G2B_DRY_RUN_PLAN_BLOCKED");
  }
}

function markdownList(values: string[]): string { return values.length ? values.map((value) => `\`${value}\``).join(", ") : "—"; }

function renderHumanReport(input: {
  ownerAuthorization: JsonRecord;
  reconciliationHash: string;
  plan: ImportPlan;
  counts: ReturnType<typeof actionCounts>;
  updates: JsonRecord[];
  target: JsonRecord;
  migration: JsonRecord;
  freshSnapshotFingerprint: string;
}) {
  const ownerFingerprint = String(input.ownerAuthorization.ownerAuthorizationFingerprint);
  const lines = [
    "# Phase 2G.2B — Owner-approved Hybrid-100 Development DRY_RUN",
    "",
    `- Remote baseline: \`${PHASE_2G2B_BASELINE}\``,
    `- Source release: ${input.plan.source.datasetVersion} / ${input.plan.source.manifestStatus}`,
    `- Release hash: \`${input.plan.source.releaseHash}\``,
    `- Owner authorization fingerprint: \`${ownerFingerprint}\``,
    `- Approved proposal fingerprint: \`${APPROVED_PROPOSAL_FINGERPRINT}\``,
    `- Source reconciliation snapshot: \`${APPROVED_SOURCE_SNAPSHOT}\``,
    `- Current Development snapshot: \`${input.freshSnapshotFingerprint}\``,
    `- Snapshot stale: **NO**`,
    `- Development target: ${String(input.target.environment)} / ${String(input.target.provider)} / project \`${String(input.target.projectId)}\` / branch \`${String(input.target.branchId)}\` / database \`${String(input.target.databaseName)}\``,
    `- Migration readiness: ${String(input.migration.appliedCount)}/${String(input.migration.localMigrationCount)} READY; latest \`${String(input.migration.latestAppliedTag)}\`; bridge READY`,
    `- Reconciliation hash: \`${input.reconciliationHash}\``,
    `- Planner snapshot fingerprint: \`${input.plan.snapshotFingerprint}\``,
    `- Plan fingerprint: \`${input.plan.planFingerprint}\``,
    "",
    "## Final owner decisions",
    "",
    "- CREATE_NEW: 97",
    "- MAP_EXISTING: 3",
    "- SKIP: 0",
    "- UNRESOLVED: 0",
    "",
    "## Vocabulary actions",
    "",
    `- CREATE: ${input.counts.CREATE}`,
    `- UPDATE: ${input.counts.UPDATE}`,
    `- NOOP: ${input.counts.NOOP}`,
    `- SKIP: ${input.counts.SKIP}`,
    `- CONFLICT: ${input.counts.CONFLICT}`,
    `- BLOCKED: ${input.counts.BLOCKED}`,
    "",
    "## Mapping actions",
    "",
    `- CREATE_MAPPING: ${input.counts.CREATE_MAPPING}`,
    `- KEEP_MAPPING: ${input.counts.KEEP_MAPPING}`,
    `- CONFLICT: ${input.counts.MAPPING_CONFLICT}`,
    "",
    "## Approved UPDATE rows",
    "",
    ...input.updates.flatMap((row) => [
      `### ${String(row.label)} / #${String(row.appVocabularyId)}`,
      `- contentVersion: ${String(row.currentContentVersion)} → ${String(row.nextContentVersion)}`,
      `- fields SET: ${markdownList(row.fieldsSet as string[])}`,
      `- fields PRESERVE: ${markdownList(row.fieldsPreserved as string[])}`,
      `- control operations: ${(row.controlOperations as Array<{ field: string; action: string }>).map((control) => `${control.field}=${control.action}`).join(", ") || "—"}`,
      `- learner progress refs: ${String(row.learnerProgressRefs)}; review event refs: ${String(row.reviewEventRefs)}`,
      "",
    ]),
    "## History safety",
    "",
    `- learnerProgressRows: ${input.plan.historySafety.learnerProgressRows}`,
    `- reviewEvents: ${input.plan.historySafety.reviewEvents}`,
    `- mappedProgressReferences: ${input.plan.historySafety.mappedProgressReferences}`,
    `- mappedReviewReferences: ${input.plan.historySafety.mappedReviewReferences}`,
    `- deletionsPlanned: ${input.plan.historySafety.deletionsPlanned}`,
    `- learnerAssignmentsChanged: ${input.plan.historySafety.learnerAssignmentsChanged}`,
    "",
    "## Authorization and execution state",
    "",
    "- Owner reconciliation approved: **YES**",
    `- DRY_RUN technically apply-ready: **${input.plan.eligibility.canApply ? "YES" : "NO"}**`,
    "- Database APPLY authorized: **NO**",
    "- Production authorized: **NO**",
    "- Database connection: **READ_ONLY_DEVELOPMENT**",
    "- Database writes: **NONE**",
    "- Runtime IDs allocated: **0**",
    "- Bridge mappings created: **0**",
    "- Import runs created: **0**",
    "- Importer APPLY executed: **NO**",
    "- Production connection: **NONE**",
    "",
  ];
  return `${lines.join("\n").trimEnd()}\n`;
}

export function parsePhase2G2BArgs(args: readonly string[]): { envFile?: string } {
  let envFile: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === "--env-file" && args[index + 1] && !args[index + 1]!.startsWith("--") && !envFile) {
      envFile = path.resolve(args[++index]!);
    } else fail("PHASE_2G2B_ARGUMENT_INVALID");
  }
  return envFile ? { envFile } : {};
}

export async function runPhase2G2BOwnerApprovedDryRun(root = process.cwd()) {
  const releaseBefore = verifyHybrid100SourceRelease(root);
  const { proposal, fingerprint: proposalFingerprint } = verifyProposal(root);
  const initialSourceEvidence = readJson<JsonRecord>(path.join(root, SOURCE_CANDIDATE_PATH));
  if (initialSourceEvidence.snapshotFingerprint !== APPROVED_SOURCE_SNAPSHOT) fail("PHASE_2G2B_SOURCE_SCAN_PIN_MISMATCH");
  const decisionRows = materializeOwnerDecisionRows(proposal.senses);
  const target = getConnectionTarget("development", "runtime");
  assertOwnerApprovedDevelopmentTarget(target);
  const targetIdentity = safeTargetIdentity(target);

  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "vocabflow-hybrid100-2g2b-scan-"));
  const tempRootResolved = path.resolve(tempRoot);
  const tempRootParent = `${path.resolve(os.tmpdir())}${path.sep}`;
  if (!tempRootResolved.startsWith(tempRootParent) || !path.basename(tempRootResolved).startsWith("vocabflow-hybrid100-2g2b-scan-")) {
    fail("PHASE_2G2B_TEMP_PATH_INVALID");
  }

  try {
    const firstScan = await runHybrid100DevelopmentReconciliationScan(root, { outputRoot: tempRoot });
    const firstFingerprint = firstScan.snapshotFingerprint;
    if (firstScan.status !== "CANDIDATES_READY_FOR_OWNER_REVIEW" || firstScan.targetVerified !== true
      || firstScan.migrationReady !== true || firstScan.transaction !== "REPEATABLE_READ_READ_ONLY"
      || firstFingerprint !== APPROVED_SOURCE_SNAPSHOT) {
      const ownerAuthorization = makeOwnerAuthorization({
        proposalFingerprint, freshScanFingerprints: [firstFingerprint], snapshotStale: firstFingerprint !== APPROVED_SOURCE_SNAPSHOT,
        target: targetIdentity,
      });
      writeJson(path.join(artifactRoot(root), "owner-authorization.json"), ownerAuthorization);
      const blockedEvidence = {
        status: "BLOCKED",
        ownerAuthorizationFingerprint: ownerAuthorization.ownerAuthorizationFingerprint,
        approvedProposalFingerprint: proposalFingerprint,
        sourceSnapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
        currentDevelopmentSnapshotFingerprint: firstFingerprint,
        OWNER_AUTHORIZATION_SNAPSHOT_STALE: firstFingerprint !== APPROVED_SOURCE_SNAPSHOT,
        migrationReady: firstScan.migrationReady === true,
        databaseConnection: "READ_ONLY_DEVELOPMENT",
        databaseWrites: "NONE",
        importerApplyExecuted: false,
        productionConnection: "NONE",
        blockedReason: firstScan.status === "CANDIDATES_READY_FOR_OWNER_REVIEW" ? "OWNER_AUTHORIZATION_SNAPSHOT_STALE" : "DEVELOPMENT_READINESS_FAILED",
      };
      writeDevelopmentEvidence(root, blockedEvidence);
      writeBlockedReport(root, {
        reason: String(blockedEvidence.blockedReason),
        ownerAuthorizationFingerprint: String(ownerAuthorization.ownerAuthorizationFingerprint),
        freshFingerprints: [firstFingerprint],
        snapshotStale: firstFingerprint !== APPROVED_SOURCE_SNAPSHOT,
        target: targetIdentity,
        migrationReady: firstScan.migrationReady === true,
      });
      return blockedEvidence;
    }

    const plannerCapture = await captureDevelopmentPlannerSnapshot();
    const plannerSnapshotFingerprint = canonicalJsonSha256(plannerCapture.snapshot);
    const secondScan = await runHybrid100DevelopmentReconciliationScan(root, { outputRoot: tempRoot });
    const secondFingerprint = secondScan.snapshotFingerprint;
    const snapshotStale = secondFingerprint !== APPROVED_SOURCE_SNAPSHOT || firstFingerprint !== secondFingerprint;
    if (secondScan.status !== "CANDIDATES_READY_FOR_OWNER_REVIEW" || secondScan.targetVerified !== true
      || secondScan.migrationReady !== true || secondScan.transaction !== "REPEATABLE_READ_READ_ONLY") {
      const ownerAuthorization = makeOwnerAuthorization({
        proposalFingerprint, freshScanFingerprints: [firstFingerprint, secondFingerprint ?? "UNAVAILABLE"],
        plannerSnapshotFingerprint, snapshotStale, target: targetIdentity,
      });
      writeJson(path.join(artifactRoot(root), "owner-authorization.json"), ownerAuthorization);
      const blockedEvidence = {
        status: "BLOCKED",
        ownerAuthorizationFingerprint: ownerAuthorization.ownerAuthorizationFingerprint,
        approvedProposalFingerprint: proposalFingerprint,
        sourceSnapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
        currentDevelopmentSnapshotFingerprint: secondFingerprint ?? null,
        plannerSnapshotFingerprint,
        OWNER_AUTHORIZATION_SNAPSHOT_STALE: snapshotStale,
        migrationReady: secondScan.migrationReady === true,
        importerReadiness: "BLOCKED",
        databaseConnection: "READ_ONLY_DEVELOPMENT",
        databaseWrites: "NONE",
        importerApplyExecuted: false,
        productionConnection: "NONE",
        blockedReason: snapshotStale ? "OWNER_AUTHORIZATION_SNAPSHOT_STALE" : "DEVELOPMENT_READINESS_FAILED",
      };
      writeDevelopmentEvidence(root, blockedEvidence);
      writeBlockedReport(root, {
        reason: String(blockedEvidence.blockedReason),
        ownerAuthorizationFingerprint: String(ownerAuthorization.ownerAuthorizationFingerprint),
        freshFingerprints: [firstFingerprint, secondFingerprint ?? "UNAVAILABLE"],
        snapshotStale,
        target: targetIdentity,
        migrationReady: secondScan.migrationReady === true,
      });
      return blockedEvidence;
    }
    const migration = summarizeFreshMigration(tempRoot);
    const liveTargetEvidence = readJson<JsonRecord>(path.join(tempRoot, FRESH_SCAN_ARTIFACT_ROOT, "development-target.json"));
    if (canonicalJsonSha256(liveTargetEvidence.target) !== canonicalJsonSha256(targetIdentity)) fail("PHASE_2G2B_DEVELOPMENT_TARGET_MISMATCH");
    const freshEvidence = {
      ownerAuthorizationSnapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
      firstReadOnlySnapshotFingerprint: firstFingerprint,
      secondReadOnlySnapshotFingerprint: secondFingerprint,
      plannerSnapshotFingerprint,
      snapshotStale,
      target: targetIdentity,
      migration,
      databaseConnection: "READ_ONLY_DEVELOPMENT",
      runtimeInspectionTransactions: [HYBRID_100_READ_ONLY_TRANSACTION],
      databaseWrites: "NONE",
      runtimeIdsAllocated: 0,
      bridgeMappingsCreated: 0,
      learnerIdentitiesQueried: false,
    };
    writeDevelopmentEvidence(root, freshEvidence);
    if (snapshotStale) {
      const ownerAuthorization = makeOwnerAuthorization({
        proposalFingerprint, freshScanFingerprints: [firstFingerprint, secondFingerprint], plannerSnapshotFingerprint,
        snapshotStale: true, target: targetIdentity,
      });
      writeJson(path.join(artifactRoot(root), "owner-authorization.json"), ownerAuthorization);
      const blockedEvidence = {
        status: "BLOCKED",
        ...freshEvidence,
        ownerAuthorizationFingerprint: ownerAuthorization.ownerAuthorizationFingerprint,
        OWNER_AUTHORIZATION_SNAPSHOT_STALE: true,
        blockedReason: "OWNER_AUTHORIZATION_SNAPSHOT_STALE",
        importerReadiness: "BLOCKED_UNTIL_OWNER_REVIEW_REFRESHED",
        importerApplyExecuted: false,
        productionConnection: "NONE",
      };
      writeDevelopmentEvidence(root, blockedEvidence);
      writeBlockedReport(root, {
        reason: String(blockedEvidence.blockedReason),
        ownerAuthorizationFingerprint: String(ownerAuthorization.ownerAuthorizationFingerprint),
        freshFingerprints: [firstFingerprint, secondFingerprint],
        snapshotStale: true,
        target: targetIdentity,
        migrationReady: true,
      });
      return blockedEvidence;
    }

    const artifacts = materializeAppArtifacts(root);
    const ownerAuthorization = makeOwnerAuthorization({
      proposalFingerprint,
      freshScanFingerprints: [firstFingerprint, secondFingerprint],
      plannerSnapshotFingerprint,
      snapshotStale: false,
      target: targetIdentity,
    });
    const reconciliation = materializeFinalizedReconciliation({
      artifacts,
      decisions: decisionRows,
      ownerAuthorizationFingerprint: String(ownerAuthorization.ownerAuthorizationFingerprint),
      snapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
      plannerSnapshotFingerprint,
      target: targetIdentity,
    });
    const reconciliationHash = canonicalJsonSha256(reconciliation);
    const reconciliationPath = path.join(artifactRoot(root), "import", "mappings", "runtime-reconciliation-v2.json");
    writeJson(reconciliationPath, reconciliation);
    writeJson(path.join(artifactRoot(root), "owner-authorization.json"), ownerAuthorization);

    const plan = buildOwnerApprovedDryRunPlan({
      artifacts,
      reconciliation,
      snapshot: plannerCapture.snapshot,
      targetIdentity,
    });
    validateFinalPlan(plan);
    if (plan.snapshotFingerprint !== plannerSnapshotFingerprint || plan.reconciliation.hash !== reconciliationHash) fail("PHASE_2G2B_PLAN_FINGERPRINT_INPUT_MISMATCH");
    const counts = actionCounts(plan);
    const updates = selectedUpdateDetails({ plan, snapshot: plannerCapture.snapshot, decisionRows });
    const finalRelease = verifyHybrid100SourceRelease(root);
    if (finalRelease.releaseHash !== releaseBefore.releaseHash
      || finalRelease.releaseTreeFingerprint !== releaseBefore.releaseTreeFingerprint) fail("PHASE_2G2B_FROZEN_RELEASE_CHANGED");
    const evidence = {
      status: "PASS",
      remoteBaseline: PHASE_2G2B_BASELINE,
      ownerAuthorizationStatus: "APPROVED",
      ownerAuthorizationFingerprint: ownerAuthorization.ownerAuthorizationFingerprint,
      approvedProposalFingerprint: proposalFingerprint,
      sourceRelease: {
        datasetVersion: HYBRID_100_2_2_1.datasetVersion,
        schemaVersion: HYBRID_100_2_2_1.schemaVersion,
        status: HYBRID_100_2_2_1.schemaStatus,
        releaseHash: String(finalRelease.manifest.releaseHash),
        releaseTreeFingerprint: finalRelease.releaseTreeFingerprint,
      },
      sourceSnapshotFingerprint: APPROVED_SOURCE_SNAPSHOT,
      currentDevelopmentSnapshotFingerprint: secondFingerprint,
      OWNER_AUTHORIZATION_SNAPSHOT_STALE: false,
      target: targetIdentity,
      migration,
      reconciliationPath: path.relative(root, reconciliationPath).replaceAll(path.sep, "/"),
      reconciliationHash,
      plannerSnapshotFingerprint,
      planFingerprint: plan.planFingerprint,
      planMode: plan.mode,
      plannerActions: counts,
      historySafety: plan.historySafety,
      plannedUpdates: updates,
      canApplyTechnically: plan.eligibility.canApply,
      ownerReconciliationApproved: true,
      databaseApplyAuthorized: false,
      productionAuthorized: false,
      databaseConnection: "READ_ONLY_DEVELOPMENT",
      databaseWrites: "NONE",
      runtimeIdsAllocated: 0,
      bridgeMappingsCreated: 0,
      importRunsCreated: 0,
      importerApplyExecuted: false,
      productionConnection: "NONE",
      unrelatedAppsWebFilesTouched: 0,
    };
    writeJson(path.join(artifactRoot(root), "dry-run-plan.json"), plan);
    writeJson(path.join(artifactRoot(root), "dry-run-evidence.json"), evidence);
    writeFileSync(path.join(artifactRoot(root), "dry-run-report.md"), renderHumanReport({
      ownerAuthorization,
      reconciliationHash,
      plan,
      counts,
      updates,
      target: targetIdentity,
      migration,
      freshSnapshotFingerprint: secondFingerprint,
    }), "utf8");
    return evidence;
  } finally {
    if (existsSync(tempRootResolved)
      && tempRootResolved.startsWith(tempRootParent)
      && path.basename(tempRootResolved).startsWith("vocabflow-hybrid100-2g2b-scan-")) {
      rmSync(tempRootResolved, { recursive: true, force: true });
    }
  }
}

function isMain(): boolean {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  try {
    const args = parsePhase2G2BArgs(process.argv.slice(2));
    if (args.envFile) process.loadEnvFile(args.envFile);
    runPhase2G2BOwnerApprovedDryRun().then((result) => {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      if (result.status !== "PASS") process.exitCode = 1;
    }).catch((error: unknown) => {
      const message = error instanceof Error && /^[A-Z][A-Z0-9_:.-]{2,160}$/.test(error.message)
        ? error.message : "PHASE_2G2B_EXECUTION_FAILED";
      process.stderr.write(`${message}\n`);
      process.exitCode = 1;
    });
  } catch {
    process.stderr.write("PHASE_2G2B_ARGUMENT_INVALID\n");
    process.exitCode = 1;
  }
}
