import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Environment, ExecutionContext, TrustedSource } from "@vocabflow/contracts";
import { getConnectionTarget, SHARED_CI_TARGET } from "../config/database-targets";
import { assertPostConnectIdentity, openSql } from "./db-core";
import {
  assessMigrationHistory,
  matchesDevelopmentTarget,
} from "./hybrid-100-development-reconciliation-preflight";
import { main as verifyHybrid100Release } from "./hybrid-100-runtime-eligible-patch-release";
import {
  fingerprintDevelopmentReconciliationSnapshot,
  scanMasterVocabularyV2ReadOnlySnapshot,
  type MasterRuntimeCandidate,
  type ReadOnlySnapshot,
} from "./master-vocabulary-v2-read-only-reconciliation-scan";
import type { RuntimeVocabulary, RuntimeVocabularyMapping, RuntimeSnapshot } from "./master-vocabulary-v2-import-planner";
import {
  readMigrationHashEvidence,
  type MigrationHashEvidence,
} from "./migration-hash-verification";
import {
  assertResolvedTargetBeforeMutation,
  assertMarkers,
} from "./runtime-validation";
import { assertCurationDatabaseAccess } from "./vocabulary-curation-access";
import {
  APP_IMPORT_CONTRACT_VERSION,
  RUNTIME_PROJECTION_CONTRACT_VERSION,
  loadPinnedMasterProjectionGraph,
  runMasterVocabularyTransform,
} from "./transform-master-vocabulary-v2";
import { canonicalJsonSha256, validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

type JsonObject = Record<string, unknown>;
type JournalEntry = { idx: number; when: number; tag: string };
type MigrationRow = { id: number; hash: string; created_at: string | number | Date | null };
type RuntimeMappingWithRevisions = RuntimeVocabularyMapping & {
  appliedLexemeRevision: number;
  appliedSenseRevision: number;
};
type SourceSense = MasterRuntimeCandidate & {
  partOfSpeech: string;
  reviewedMeaning: string | null;
  lexemeRevision: number;
  senseRevision: number;
};
type RuntimeSourceRow = RuntimeVocabulary & {
  sourceDataset?: string | null;
  sourceRecordId?: number | null;
};
type CandidateRow = JsonObject & {
  appVocabularyId: number;
  candidateClassification: "EXACT_EFFECTIVE_MATCH" | "PARTIAL_MATCH" | "SEMANTIC_CANDIDATE" | "CONFLICTING_MEANING";
  matchingSignals: string[];
  projectionDifferences: Array<{ field: string; master: unknown; runtime: unknown }>;
  vietnameseOverrideStatus: string;
  imageQuarantineStatus: string;
  polysemyAmbiguous: boolean;
  decision: "UNRESOLVED";
};
type SenseScanRow = JsonObject & {
  masterLexemeId: string;
  masterSenseId: string;
  runtimeCandidates: CandidateRow[];
  decision: "UNRESOLVED";
  mappingAnomalies: string[];
  exactWordConflictingMeaningCandidateIds: number[];
  lemma: string;
  normalizedLemma: string;
  partOfSpeech: string | null;
  reviewedMeaning: string | null;
  analysisRecommendation: string;
  existingMasterMapping: JsonObject | null;
};

export const HYBRID_100_2_2_1 = {
  datasetVersion: "2.2.1",
  schemaVersion: "2.0.1",
  releaseHash: "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c",
  releaseTreeFingerprint: "51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e",
  releaseHashAlgorithm: "sha256-canonical-json-v1",
  schemaStatus: "APPROVED",
  appImportContract: "app-import-v3",
  projectionContract: "runtime-vocabulary-projection-v2",
  futureReconciliationContract: "runtime-reconciliation-v3",
  senses: 100,
  lexemes: 87,
  classifications: 99,
  provenance: 799,
  taxonomy: 1,
  media: 0,
  learningSets: 0,
  relations: 0,
} as const;

export const HYBRID_100_READ_ONLY_TRANSACTION = "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY";
const RUNTIME_ENRICHMENT_FIELDS = new Set(["ipa", "imageUrl", "audioUrl", "topic", "level"]);

const RELEASE_RELATIVE_ROOT = "vocabflow-dataset/releases/hybrid-100-v2.2.1";
const WORKSPACE_RELATIVE_ROOT = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1";
const REPORT_RELATIVE_PATH = "vocabflow-dataset/reports/hybrid-100-development-runtime-reconciliation-2.2.1.md";
const GENERATED_BY = "hybrid-100-development-reconciliation-scan-2.2.1-v1";
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

function fail(code: string): never {
  throw new Error(code);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US") : "";
}

export function isExactHybrid100DevelopmentTarget(target: ReturnType<typeof getConnectionTarget>): boolean {
  return matchesDevelopmentTarget(target)
    && target.environment === "development"
    && target.provider === "neon"
    && target.projectId === "shy-hill-72364426"
    && target.branchId === "br-square-grass-b3af0nte"
    && target.databaseName === "neondb"
    && target.usage === "development"
    && String(target.branchId) !== String(SHARED_CI_TARGET.branchId);
}

function assertFrozenRelease(root: string): JsonObject {
  const oldLog = console.log;
  let verification: JsonObject;
  try {
    console.log = () => undefined;
    verification = verifyHybrid100Release(["--check"], root) as JsonObject;
  } finally {
    console.log = oldLog;
  }
  if (verification.status !== "NOOP_ALREADY_MATERIALIZED_AND_FROZEN"
    || verification.writesPerformed !== false
    || verification.releaseHash !== HYBRID_100_2_2_1.releaseHash
    || verification.releaseTreeFingerprint !== HYBRID_100_2_2_1.releaseTreeFingerprint
    || verification.releaseHashRepeatIdentical !== true
    || verification.releaseTreeFingerprintRepeatIdentical !== true) {
    fail("HYBRID_100_FROZEN_SOURCE_GATE_FAILED");
  }
  return verification;
}

export function verifyHybrid100SourceRelease(root: string) {
  const releaseRoot = path.resolve(root, RELEASE_RELATIVE_ROOT);
  const manifest = readJson<JsonObject>(path.join(releaseRoot, "dataset.json"));
  if (manifest.datasetVersion !== HYBRID_100_2_2_1.datasetVersion
    || manifest.schemaVersion !== HYBRID_100_2_2_1.schemaVersion
    || manifest.status !== HYBRID_100_2_2_1.schemaStatus
    || manifest.releaseHashAlgorithm !== HYBRID_100_2_2_1.releaseHashAlgorithm
    || manifest.releaseHash !== HYBRID_100_2_2_1.releaseHash) fail("HYBRID_100_RELEASE_IDENTITY_MISMATCH");
  const unhashedManifest = { ...manifest };
  delete unhashedManifest.releaseHash;
  if (canonicalJsonSha256(unhashedManifest) !== HYBRID_100_2_2_1.releaseHash) fail("HYBRID_100_RELEASE_HASH_MISMATCH");

  const releaseValidation = validateMasterVocabularyV2({
    datasetRoot: releaseRoot,
    writeReport: false,
    validatedAt: "2000-01-01T00:00:00Z",
  });
  if (releaseValidation.status !== "PASS" || releaseValidation.errorCount !== 0
    || releaseValidation.warningCount !== 0 || releaseValidation.infoCount !== 0) fail("HYBRID_100_RELEASE_VALIDATION_FAILED");

  const frozenBefore = assertFrozenRelease(root);
  const graph = loadPinnedMasterProjectionGraph(releaseRoot);
  if (graph.lexemes.length !== HYBRID_100_2_2_1.lexemes
    || graph.senses.length !== HYBRID_100_2_2_1.senses
    || graph.classifications.length !== HYBRID_100_2_2_1.classifications
    || graph.mediaAssets.length !== HYBRID_100_2_2_1.media
    || graph.learningSets.length !== HYBRID_100_2_2_1.learningSets
    || !Array.isArray(manifest.includedProvenance) || manifest.includedProvenance.length !== HYBRID_100_2_2_1.provenance
    || !Array.isArray(manifest.includedTaxonomySnapshots) || manifest.includedTaxonomySnapshots.length !== HYBRID_100_2_2_1.taxonomy
    || !Array.isArray(manifest.includedRelations) || manifest.includedRelations.length !== HYBRID_100_2_2_1.relations) fail("HYBRID_100_RELEASE_COUNTS_MISMATCH");
  const graphLexemes = new Map(graph.lexemes.map((row) => [String(row.masterLexemeId), row]));
  const graphSenses = new Map(graph.senses.map((row) => [String(row.masterSenseId), row]));
  const projection = runMasterVocabularyTransform({ datasetRoot: releaseRoot, mode: "RELEASE", writeOutputs: false });
  const records = projection.vocabulary.records as Array<JsonObject>;
  const topics = projection.topics.records as unknown[];
  const topicMemberships = projection.topicMemberships.records as unknown[];
  const learningSets = projection.learningSets.records as unknown[];
  const learningSetItems = projection.learningSetItems.records as unknown[];
  if (projection.vocabulary.artifactVersion !== APP_IMPORT_CONTRACT_VERSION
    || projection.vocabulary.artifactVersion !== HYBRID_100_2_2_1.appImportContract
    || projection.vocabulary.projectionContractVersion !== RUNTIME_PROJECTION_CONTRACT_VERSION
    || projection.vocabulary.projectionContractVersion !== HYBRID_100_2_2_1.projectionContract
    || projection.vocabulary.importEligible !== true
    || records.length !== HYBRID_100_2_2_1.senses
    || !projection.report.includes("## Skips\n\n- None")) fail("HYBRID_100_RELEASE_PROJECTION_MISMATCH");
  if (topics.length !== 0 || topicMemberships.length !== 0 || learningSets.length !== 0 || learningSetItems.length !== 0) {
    fail("HYBRID_100_UNEXPECTED_RUNTIME_SCOPE");
  }
  const projectedSenseIds = new Set<string>();
  const sources: SourceSense[] = records.map((record) => {
    const masterSenseId = String(record.masterSenseId);
    const masterLexemeId = String(record.masterLexemeId);
    const sense = graphSenses.get(masterSenseId);
    const lexeme = graphLexemes.get(masterLexemeId);
    const runtimeProjection = record.runtimeProjection as MasterRuntimeCandidate["projection"] | undefined;
    if (!sense || !lexeme || !runtimeProjection || String(sense.masterLexemeId) !== masterLexemeId || projectedSenseIds.has(masterSenseId)) {
      fail("HYBRID_100_RELEASE_SENSE_IDENTITY_INVALID");
    }
    projectedSenseIds.add(masterSenseId);
    const reviewedMeaning = Array.isArray(sense.definitions)
      ? String((sense.definitions.find((row) => (row as JsonObject).language === "en") as JsonObject | undefined)?.text ?? "") || null
      : null;
    return {
      masterLexemeId,
      masterSenseId,
      lemma: String(lexeme.lemma),
      normalizedLemma: String(lexeme.normalizedLemma),
      partOfSpeech: String(sense.partOfSpeechCode ?? "UNSPECIFIED"),
      reviewedMeaning,
      lexemeRevision: Number(record.sourceRevisions && (record.sourceRevisions as JsonObject).lexemeRevision),
      senseRevision: Number(record.sourceRevisions && (record.sourceRevisions as JsonObject).senseRevision),
      projection: runtimeProjection,
    };
  });
  if (projectedSenseIds.size !== 100) fail("HYBRID_100_SENSE_COUNT_MISMATCH");
  const fieldCounts = {
    vietnameseNonNull: records.filter((row) => Boolean((row.runtimeProjection as JsonObject | undefined)?.vietnamese)).length,
    definitionEnNonNull: records.filter((row) => Boolean((row.runtimeProjection as JsonObject | undefined)?.definitionEn)).length,
    exampleEnNonNull: records.filter((row) => Boolean((row.runtimeProjection as JsonObject | undefined)?.exampleEn)).length,
    ipaNonNull: records.filter((row) => (row.runtimeProjection as JsonObject | undefined)?.ipa !== null).length,
  };
  if (fieldCounts.vietnameseNonNull !== 100 || fieldCounts.definitionEnNonNull !== 100
    || fieldCounts.exampleEnNonNull !== 100 || fieldCounts.ipaNonNull !== 0) fail("HYBRID_100_RELEASE_FIELD_COUNTS_MISMATCH");

  return {
    releaseRoot,
    manifest,
    graph,
    sources,
    projection,
    releaseValidation: { status: releaseValidation.status, errors: releaseValidation.errorCount, warnings: releaseValidation.warningCount, info: releaseValidation.infoCount },
    releaseTreeFingerprint: String(frozenBefore.releaseTreeFingerprint),
    frozenBefore,
    projected: records.length,
    skipped: 0,
    importEligible: true,
    fieldCounts,
    projectionScope: {
      appImportContract: projection.vocabulary.artifactVersion,
      projectionContract: projection.vocabulary.projectionContractVersion,
      topics: topics.length,
      topicMemberships: topicMemberships.length,
      learningSets: learningSets.length,
      learningSetItems: learningSetItems.length,
    },
  };
}

export function nullEnrichmentDisposition(field: string, masterValue: unknown): "PRESERVE" | "COMPARE" {
  return (masterValue === null || masterValue === undefined) && RUNTIME_ENRICHMENT_FIELDS.has(field) ? "PRESERVE" : "COMPARE";
}

function markPreservedEnrichmentDifferences(
  differences: Array<{ field: string; master: unknown; runtime: unknown }>,
): Array<{ field: string; master: unknown; runtime: unknown; action: "PRESERVE" | "COMPARE" }> {
  return differences.map((difference) => ({
    ...difference,
    action: nullEnrichmentDisposition(difference.field, difference.master),
  }));
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

function buildSourceCandidates(rows: RuntimeSourceRow[], sources: SourceSense[]): { snapshot: ReadOnlySnapshot; candidates: SourceSense[] } {
  const base: RuntimeSnapshot = {
    vocabularies: rows,
    vocabularyMappings: [],
    topics: [], topicMappings: [], learningSets: [], learningSetMappings: [],
    vocabularyTopics: [], masterVocabularyTopicMemberships: [], learningSetItems: [], masterLearningSetMemberships: [],
    progressVocabularyIds: [], reviewVocabularyIds: [], appliedRuns: [],
  };
  return { snapshot: base as ReadOnlySnapshot, candidates: sources };
}

function candidateSet(scan: JsonObject): Set<number> {
  const ids = new Set<number>();
  const senses = Array.isArray(scan.senses) ? scan.senses as JsonObject[] : [];
  for (const sense of senses) {
    const candidates = Array.isArray(sense.runtimeCandidates) ? sense.runtimeCandidates as JsonObject[] : [];
    for (const row of candidates) if (Number.isSafeInteger(row.appVocabularyId)) ids.add(Number(row.appVocabularyId));
  }
  return ids;
}

function makeMappedCandidate(master: SourceSense, runtime: RuntimeSourceRow, mapping: RuntimeMappingWithRevisions, owners: string[]): CandidateRow {
  const effectiveVietnamese = runtime.vietnameseOverride ?? runtime.vietnamese;
  const effectiveImageUrl = runtime.imageQuarantined ? null : runtime.imageUrl;
  const projectionEntries: Array<[string, unknown, unknown]> = [
    ["word", master.projection.word, runtime.word], ["ipa", master.projection.ipa, runtime.ipa],
    ["vietnamese", master.projection.vietnamese, effectiveVietnamese],
    ["definitionEn", master.projection.definitionEn, runtime.definitionEn],
    ["exampleEn", master.projection.exampleEn, runtime.exampleEn], ["imageUrl", master.projection.imageUrl, effectiveImageUrl],
    ["audioUrl", master.projection.audioUrl, runtime.audioUrl], ["topic", master.projection.topic, runtime.topic],
    ["level", master.projection.level, runtime.level], ["enabled", master.projection.enabled, runtime.enabled],
  ];
  const differences = markPreservedEnrichmentDifferences(projectionEntries.filter(([, left, right]) => left !== right)
    .map(([field, masterValue, runtimeValue]) => ({ field, master: masterValue, runtime: runtimeValue })));
  const actionableDifferences = differences.filter((difference) => difference.action !== "PRESERVE");
  const mappingConflict = mapping.masterSenseId !== master.masterSenseId || mapping.masterLexemeId !== master.masterLexemeId;
  const polysemyAmbiguous = owners.filter((id) => id !== master.masterSenseId).length > 0;
  const sameMeaning = normalize(master.projection.vietnamese) === normalize(effectiveVietnamese)
    || normalize(master.projection.definitionEn) === normalize(runtime.definitionEn)
    || normalize(master.projection.exampleEn) === normalize(runtime.exampleEn);
  const candidateClassification: CandidateRow["candidateClassification"] = mappingConflict
    ? "CONFLICTING_MEANING"
    : actionableDifferences.length === 0 ? "EXACT_EFFECTIVE_MATCH"
      : sameMeaning ? "PARTIAL_MATCH" : "CONFLICTING_MEANING";
  const vietnameseOverrideStatus = runtime.vietnameseOverride === null
    ? "NONE"
    : normalize(runtime.vietnameseOverride) === normalize(master.projection.vietnamese) ? "MATCHES_MASTER" : "CONFLICTS_WITH_MASTER";
  const imageQuarantineStatus = !runtime.imageQuarantined
    ? "FALSE"
    : master.projection.imageUrl === null ? "TRUE_NO_MASTER_IMAGE" : "TRUE_CONFLICT";
  return {
    appVocabularyId: runtime.id,
    word: runtime.word,
    ipa: runtime.ipa,
    vietnamese: runtime.vietnamese,
    baseVietnamese: runtime.vietnamese,
    vietnameseOverride: runtime.vietnameseOverride,
    effectiveVietnamese,
    definitionEn: runtime.definitionEn,
    definition: runtime.definitionEn,
    exampleEn: runtime.exampleEn,
    example: runtime.exampleEn,
    imageUrl: runtime.imageUrl,
    imageQuarantined: runtime.imageQuarantined,
    effectiveImageUrl,
    audioUrl: runtime.audioUrl,
    topic: runtime.topic,
    legacyTopic: runtime.topic,
    level: runtime.level,
    enabled: runtime.enabled,
    contentVersion: runtime.contentVersion,
    sourceDataset: runtime.sourceDataset ?? null,
    sourceRecordId: runtime.sourceRecordId ?? null,
    learnerProgressCount: 0,
    learnerProgressReferenceCount: 0,
    reviewEventCount: 0,
    reviewEventReferenceCount: 0,
    existingMasterSenseMapping: {
      masterSenseId: mapping.masterSenseId,
      masterLexemeId: mapping.masterLexemeId,
      appVocabularyId: mapping.vocabularyId,
      appliedProjectionFingerprint: mapping.appliedProjectionFingerprint,
      projectionContractVersion: mapping.projectionContractVersion,
      lastReleaseHash: mapping.lastReleaseHash,
      appliedLexemeRevision: mapping.appliedLexemeRevision,
      appliedSenseRevision: mapping.appliedSenseRevision,
    },
    masterSenseMapping: {
      masterSenseId: mapping.masterSenseId,
      masterLexemeId: mapping.masterLexemeId,
      appVocabularyId: mapping.vocabularyId,
      appliedProjectionFingerprint: mapping.appliedProjectionFingerprint,
      projectionContractVersion: mapping.projectionContractVersion,
      lastReleaseHash: mapping.lastReleaseHash,
      appliedLexemeRevision: mapping.appliedLexemeRevision,
      appliedSenseRevision: mapping.appliedSenseRevision,
    },
    matchingSignals: [],
    candidateBasis: "EXISTING_MASTER_MAPPING",
    projectionEqualsMaster: actionableDifferences.length === 0,
    candidateClassification,
    vietnameseOverrideStatus,
    imageQuarantineStatus,
    firstAdoptionAnalysis: mappingConflict || polysemyAmbiguous ? "IDENTITY_REVIEW_REQUIRED" : "EXISTING_MAPPING_PRESENT",
    firstAdoptionPolicy: null,
    firstAdoptionReview: actionableDifferences.length === 0 ? "POSSIBLE_BASELINE_AFTER_OWNER_REVIEW" : "DRIFT_REVIEW_REQUIRED",
    projectionDifferences: differences,
    sameRuntimeIdCandidateForMasterSenses: owners,
    polysemyAmbiguous,
    reconciliationFlags: [
      ...(polysemyAmbiguous ? ["AMBIGUOUS_RUNTIME_IDENTITY"] : []),
      ...(mappingConflict ? ["EXISTING_MAPPING_IDENTITY_CONFLICT"] : []),
    ],
    existingMasterMapping: true,
    decision: "UNRESOLVED",
  };
}

function ensureMappedRows(scanValue: JsonObject, snapshot: ReadOnlySnapshot, sources: SourceSense[]): JsonObject {
  const scan = structuredClone(scanValue) as JsonObject;
  const rows = Array.isArray(scan.senses) ? scan.senses as SenseScanRow[] : [];
  const sourceById = new Map(sources.map((source) => [source.masterSenseId, source]));
  const mappings = snapshot.vocabularyMappings as RuntimeMappingWithRevisions[];
  const runtimeById = new Map(snapshot.vocabularies.map((row) => [row.id, row as RuntimeSourceRow]));
  const ownersById = new Map<number, string[]>();
  for (const mapping of mappings) ownersById.set(mapping.vocabularyId, [...(ownersById.get(mapping.vocabularyId) ?? []), mapping.masterSenseId]);
  for (const row of rows) {
    const master = sourceById.get(row.masterSenseId);
    if (!master) continue;
    const mapping = mappings.find((candidate) => candidate.masterSenseId === row.masterSenseId);
    if (!mapping) continue;
    const runtime = runtimeById.get(mapping.vocabularyId);
    if (!runtime) continue;
    const candidates = row.runtimeCandidates;
    const existing = candidates.find((candidate) => candidate.appVocabularyId === mapping.vocabularyId);
    if (existing) {
      existing.existingMasterSenseMapping = {
        masterSenseId: mapping.masterSenseId, masterLexemeId: mapping.masterLexemeId, appVocabularyId: mapping.vocabularyId,
        appliedProjectionFingerprint: mapping.appliedProjectionFingerprint, projectionContractVersion: mapping.projectionContractVersion,
        lastReleaseHash: mapping.lastReleaseHash, appliedLexemeRevision: mapping.appliedLexemeRevision, appliedSenseRevision: mapping.appliedSenseRevision,
      };
      existing.masterSenseMapping = existing.existingMasterSenseMapping;
      continue;
    }
    candidates.push(makeMappedCandidate(master, runtime, mapping, [...new Set(ownersById.get(mapping.vocabularyId) ?? [])].sort()));
  }
  return scan;
}

function applyAggregates(scanValue: JsonObject, snapshot: ReadOnlySnapshot): JsonObject {
  const scan = structuredClone(scanValue) as JsonObject;
  const progress = new Map((snapshot.learnerProgressCounts ?? []).map((row) => [row.vocabularyId, row.referenceCount]));
  const reviews = new Map((snapshot.reviewEventCounts ?? []).map((row) => [row.vocabularyId, row.referenceCount]));
  const rows = Array.isArray(scan.senses) ? scan.senses as SenseScanRow[] : [];
  for (const sense of rows) {
    sense.runtimeCandidates = sense.runtimeCandidates.map((candidate) => ({
      ...candidate,
      learnerProgressCount: progress.get(candidate.appVocabularyId) ?? 0,
      learnerProgressReferenceCount: progress.get(candidate.appVocabularyId) ?? 0,
      reviewEventCount: reviews.get(candidate.appVocabularyId) ?? 0,
      reviewEventReferenceCount: reviews.get(candidate.appVocabularyId) ?? 0,
    }));
  }
  return scan;
}

function hasFlag(candidate: CandidateRow, flag: string): boolean {
  return Array.isArray(candidate.reconciliationFlags) && (candidate.reconciliationFlags as string[]).includes(flag);
}

function mappingIsConsistent(sense: SenseScanRow, mapping: RuntimeMappingWithRevisions, snapshot: ReadOnlySnapshot): string[] {
  const anomalies: string[] = [];
  if (mapping.masterLexemeId !== sense.masterLexemeId) anomalies.push("MAPPING_LEXEME_PAIR_MISMATCH");
  if (!snapshot.vocabularies.some((row) => row.id === mapping.vocabularyId)) anomalies.push("MAPPED_RUNTIME_ROW_MISSING");
  const idOwners = (snapshot.vocabularyMappings as RuntimeMappingWithRevisions[]).filter((row) => row.vocabularyId === mapping.vocabularyId);
  if (idOwners.some((row) => row.masterSenseId !== mapping.masterSenseId || row.masterLexemeId !== mapping.masterLexemeId)) anomalies.push("MAPPING_RUNTIME_ID_MULTIPLE_OWNERS");
  if (!/^[0-9a-f]{64}$/i.test(mapping.appliedProjectionFingerprint)) anomalies.push("APPLIED_PROJECTION_FINGERPRINT_INVALID");
  if (!mapping.projectionContractVersion) anomalies.push("PROJECTION_CONTRACT_MISSING");
  if (!Number.isSafeInteger(mapping.appliedLexemeRevision) || !Number.isSafeInteger(mapping.appliedSenseRevision)) anomalies.push("APPLIED_REVISION_INVALID");
  return anomalies;
}

function decorateSenseRows(scanValue: JsonObject, sources: SourceSense[], snapshot: ReadOnlySnapshot): JsonObject {
  const scan = structuredClone(scanValue) as JsonObject;
  const rows = Array.isArray(scan.senses) ? scan.senses as SenseScanRow[] : [];
  const sourceById = new Map(sources.map((source) => [source.masterSenseId, source]));
  const mappings = snapshot.vocabularyMappings as RuntimeMappingWithRevisions[];
  const mappingGroups = new Map<string, RuntimeMappingWithRevisions[]>();
  for (const mapping of mappings) mappingGroups.set(mapping.masterSenseId, [...(mappingGroups.get(mapping.masterSenseId) ?? []), mapping]);

  const candidateOwners = new Map<number, string[]>();
  for (const sense of rows) for (const candidate of sense.runtimeCandidates) {
    candidateOwners.set(candidate.appVocabularyId, [...(candidateOwners.get(candidate.appVocabularyId) ?? []), sense.masterSenseId]);
  }
  for (const sense of rows) {
    const source = sourceById.get(sense.masterSenseId);
    const ownMappings = mappingGroups.get(sense.masterSenseId) ?? [];
    const mapping = ownMappings[0];
    const mappingAnomalies = mapping ? mappingIsConsistent(sense, mapping, snapshot) : [];
    const competingCandidates: CandidateRow[] = [];
    sense.runtimeCandidates = sense.runtimeCandidates.map((candidate) => {
      const owners = [...new Set(candidateOwners.get(candidate.appVocabularyId) ?? [])].sort();
      const ambiguous = owners.length > 1;
      const flags = Array.isArray(candidate.reconciliationFlags) ? candidate.reconciliationFlags as string[] : [];
      const finalFlags = [
        ...flags.filter((flag) => flag !== "AMBIGUOUS_RUNTIME_IDENTITY"),
        ...(ambiguous ? ["AMBIGUOUS_RUNTIME_IDENTITY"] : []),
        ...(mappingAnomalies.length > 0 && candidate.appVocabularyId === mapping?.vocabularyId ? mappingAnomalies : []),
      ];
      const markedDifferences = markPreservedEnrichmentDifferences(candidate.projectionDifferences);
      const actionableDifferences = markedDifferences.filter((difference) => difference.action !== "PRESERVE");
      const decorated = {
        ...candidate,
        projectionDifferences: markedDifferences,
        projectionEqualsMaster: actionableDifferences.length === 0,
        ownerDecision: "UNRESOLVED",
        sameRuntimeIdCandidateForMasterSenses: owners,
        polysemyAmbiguous: ambiguous,
        reconciliationFlags: [...new Set(finalFlags)].sort(),
        existingMasterSenseMapping: candidate.appVocabularyId === mapping?.vocabularyId ? {
          masterSenseId: mapping.masterSenseId,
          masterLexemeId: mapping.masterLexemeId,
          appVocabularyId: mapping.vocabularyId,
          appliedProjectionFingerprint: mapping.appliedProjectionFingerprint,
          projectionContractVersion: mapping.projectionContractVersion,
          lastReleaseHash: mapping.lastReleaseHash,
          appliedLexemeRevision: mapping.appliedLexemeRevision,
          appliedSenseRevision: mapping.appliedSenseRevision,
        } : candidate.existingMasterSenseMapping,
      } as CandidateRow;
      if (ambiguous || hasFlag(decorated, "EXISTING_MAPPING_IDENTITY_CONFLICT")) {
        decorated.candidateClassification = "CONFLICTING_MEANING";
      } else if (actionableDifferences.length === 0) {
        decorated.candidateClassification = "EXACT_EFFECTIVE_MATCH";
      } else if (decorated.matchingSignals.includes("EXACT_WORD") && source) {
        const viConflict = normalize(source.projection.vietnamese) !== "" && normalize(decorated.effectiveVietnamese) !== ""
          && normalize(source.projection.vietnamese) !== normalize(decorated.effectiveVietnamese);
        const definitionConflict = normalize(source.projection.definitionEn) !== "" && normalize(decorated.definitionEn) !== ""
          && normalize(source.projection.definitionEn) !== normalize(decorated.definitionEn);
        if (viConflict && definitionConflict) decorated.candidateClassification = "CONFLICTING_MEANING";
      }
      if (candidateOwners.get(candidate.appVocabularyId)?.some((owner) => owner !== sense.masterSenseId)) competingCandidates.push(decorated);
      return decorated;
    });
    const exactWordConflicts = sense.runtimeCandidates.filter((candidate) => candidate.matchingSignals.includes("EXACT_WORD")
      && candidate.candidateClassification === "CONFLICTING_MEANING");
    const recommendation = ownMappings.length > 1 || mappingAnomalies.length > 0
      ? "BLOCKED"
      : sense.runtimeCandidates.some((candidate) => candidate.imageQuarantined === true)
        ? "QUARANTINE_REVIEW_REQUIRED"
        : sense.runtimeCandidates.some((candidate) => candidate.vietnameseOverrideStatus === "CONFLICTS_WITH_MASTER")
          ? "RUNTIME_OVERRIDE_REVIEW_REQUIRED"
          : sense.runtimeCandidates.some((candidate) => candidate.polysemyAmbiguous || candidate.candidateClassification === "CONFLICTING_MEANING")
            ? "IDENTITY_REVIEW_REQUIRED"
            : mapping
              ? sense.runtimeCandidates.some((candidate) => candidate.appVocabularyId === mapping.vocabularyId && candidate.projectionEqualsMaster === true
                && mapping.projectionContractVersion === HYBRID_100_2_2_1.projectionContract
                && mapping.lastReleaseHash === HYBRID_100_2_2_1.releaseHash
                && mapping.appliedLexemeRevision === source?.lexemeRevision
                && mapping.appliedSenseRevision === source?.senseRevision)
                ? "EXISTING_MAPPING_NOOP_CANDIDATE"
                : "EXISTING_MAPPING_UPDATE_REVIEW_REQUIRED"
              : sense.runtimeCandidates.length === 0
                ? "CREATE_NEW_CANDIDATE"
                : sense.runtimeCandidates.length > 1
                  ? "IDENTITY_REVIEW_REQUIRED"
                  : "MAP_EXISTING_CANDIDATE";
    Object.assign(sense, {
      lemma: source?.lemma ?? String(sense.lemma ?? ""),
      normalizedLemma: source?.normalizedLemma ?? normalize(sense.lemma),
      partOfSpeech: source?.partOfSpeech ?? null,
      reviewedMeaning: source?.reviewedMeaning ?? (source?.projection.definitionEn ?? null),
      reviewedVietnamese: source?.projection.vietnamese ?? null,
      definitionEn: source?.projection.definitionEn ?? null,
      exampleEn: source?.projection.exampleEn ?? null,
      runtimeProjection: source?.projection ?? sense.masterProjection,
      existingMasterMapping: mapping ? {
        masterSenseId: mapping.masterSenseId,
        masterLexemeId: mapping.masterLexemeId,
        vocabularyId: mapping.vocabularyId,
        appliedProjectionFingerprint: mapping.appliedProjectionFingerprint,
        projectionContractVersion: mapping.projectionContractVersion,
        lastReleaseHash: mapping.lastReleaseHash,
        appliedLexemeRevision: mapping.appliedLexemeRevision,
        appliedSenseRevision: mapping.appliedSenseRevision,
      } : null,
      mappingAnomalies,
      identityReviewCompetingSenseIds: [...new Set(competingCandidates.flatMap((candidate) => candidate.sameRuntimeIdCandidateForMasterSenses as string[]))].filter((id) => id !== sense.masterSenseId).sort(),
      exactWordConflictingMeaningCandidateIds: exactWordConflicts.map((candidate) => candidate.appVocabularyId).sort((a, b) => a - b),
      analysisRecommendation: recommendation,
      ownerDecision: "UNRESOLVED",
      decision: "UNRESOLVED",
    });
  }
  return scan;
}

function summarizeCollisions(scan: JsonObject, snapshot: ReadOnlySnapshot): JsonObject {
  const senses = Array.isArray(scan.senses) ? scan.senses as SenseScanRow[] : [];
  const candidateOwners = new Map<number, Set<string>>();
  const candidateRows = new Map<number, CandidateRow[]>();
  for (const sense of senses) for (const candidate of sense.runtimeCandidates) {
    const owners = candidateOwners.get(candidate.appVocabularyId) ?? new Set<string>();
    owners.add(sense.masterSenseId);
    candidateOwners.set(candidate.appVocabularyId, owners);
    candidateRows.set(candidate.appVocabularyId, [...(candidateRows.get(candidate.appVocabularyId) ?? []), candidate]);
  }
  const polysemy = [...candidateOwners.entries()].filter(([, owners]) => owners.size > 1).map(([id, owners]) => ({
    appVocabularyId: id, masterSenseIds: [...owners].sort(),
  })).sort((a, b) => a.appVocabularyId - b.appVocabularyId);
  const duplicateMasterLemmas = new Map<string, Set<string>>();
  for (const sense of senses) {
    const key = normalize(String(sense.normalizedLemma ?? sense.lemma));
    if (key) duplicateMasterLemmas.set(key, new Set([...(duplicateMasterLemmas.get(key) ?? []), sense.masterSenseId]));
  }
  const duplicateRuntimeWords = new Map<string, Set<number>>();
  for (const [id, rows] of candidateRows) {
    const key = normalize(String(rows[0]?.word ?? ""));
    if (key) duplicateRuntimeWords.set(key, new Set([...(duplicateRuntimeWords.get(key) ?? []), id]));
  }
  const mappings = snapshot.vocabularyMappings as RuntimeMappingWithRevisions[];
  const runtimeIds = new Set(snapshot.vocabularies.map((row) => row.id));
  const missingMappedRows = mappings.filter((mapping) => !runtimeIds.has(mapping.vocabularyId)).map((mapping) => ({
    masterSenseId: mapping.masterSenseId, masterLexemeId: mapping.masterLexemeId, appVocabularyId: mapping.vocabularyId,
  }));
  const mappingBySense = new Map<string, RuntimeMappingWithRevisions[]>();
  const mappingByRuntime = new Map<number, RuntimeMappingWithRevisions[]>();
  for (const mapping of mappings) {
    mappingBySense.set(mapping.masterSenseId, [...(mappingBySense.get(mapping.masterSenseId) ?? []), mapping]);
    mappingByRuntime.set(mapping.vocabularyId, [...(mappingByRuntime.get(mapping.vocabularyId) ?? []), mapping]);
  }
  const bridgeIdentityConflicts = [
    ...[...mappingBySense.entries()].filter(([, rows]) => rows.length > 1).map(([masterSenseId, rows]) => ({ kind: "SENSE_HAS_MULTIPLE_MAPPINGS", masterSenseId, appVocabularyIds: rows.map((row) => row.vocabularyId).sort((a, b) => a - b) })),
    ...[...mappingByRuntime.entries()].filter(([, rows]) => new Set(rows.map((row) => row.masterSenseId)).size > 1).map(([appVocabularyId, rows]) => ({ kind: "RUNTIME_ID_HAS_MULTIPLE_MASTERS", appVocabularyId, masterSenseIds: [...new Set(rows.map((row) => row.masterSenseId))].sort() })),
    ...senses.flatMap((sense) => sense.mappingAnomalies.length ? [{ kind: "MAPPING_ROW_INCONSISTENT", masterSenseId: sense.masterSenseId, anomalies: sense.mappingAnomalies }] : []),
  ];
  const exactWordConflictingMeaning = senses.flatMap((sense) => sense.exactWordConflictingMeaningCandidateIds.map((appVocabularyId: number) => ({
    masterSenseId: sense.masterSenseId, lemma: sense.lemma, appVocabularyId,
  })));
  const sourceIdentityMap = new Map<string, number[]>();
  for (const candidateId of candidateRows.keys()) {
    const runtime = snapshot.vocabularies.find((row) => row.id === candidateId) as RuntimeSourceRow | undefined;
    if (!runtime?.sourceDataset || runtime.sourceRecordId === null || runtime.sourceRecordId === undefined) continue;
    const key = `${runtime.sourceDataset}\u0000${runtime.sourceRecordId}`;
    sourceIdentityMap.set(key, [...(sourceIdentityMap.get(key) ?? []), runtime.id]);
  }
  const sourceIdentityCollisions = [...sourceIdentityMap.entries()].filter(([, ids]) => new Set(ids).size > 1).map(([key, ids]) => {
    const [sourceDataset, sourceRecordId] = key.split("\u0000");
    return { sourceDataset, sourceRecordId: Number(sourceRecordId), appVocabularyIds: [...new Set(ids)].sort((a, b) => a - b) };
  });
  const contentVersionAnomalies = [...candidateRows.keys()].flatMap((appVocabularyId) => {
    const row = snapshot.vocabularies.find((candidate) => candidate.id === appVocabularyId);
    return !row || !Number.isSafeInteger(row.contentVersion) || row.contentVersion < 1
      ? [{ appVocabularyId, contentVersion: row?.contentVersion ?? null }]
      : [];
  });
  return {
    oneRuntimeIdCandidateForMultipleMasterSenses: polysemy,
    duplicateNormalizedMasterLemmaGroups: [...duplicateMasterLemmas.entries()].filter(([, ids]) => ids.size > 1).map(([normalizedLemma, ids]) => ({ normalizedLemma, masterSenseIds: [...ids].sort() })),
    duplicateNormalizedRuntimeWordGroups: [...duplicateRuntimeWords.entries()].filter(([, ids]) => ids.size > 1).map(([normalizedWord, ids]) => ({ normalizedWord, appVocabularyIds: [...ids].sort((a, b) => a - b) })),
    existingMappingToMissingRuntimeRow: missingMappedRows,
    bridgeIdentityConflicts,
    exactWordWithConflictingMeaning: exactWordConflictingMeaning,
    sourceIdentityCollisions,
    contentVersionAnomalies,
  };
}

function summaryCounts(scan: JsonObject, audit: JsonObject, snapshot: ReadOnlySnapshot): JsonObject {
  const senses = Array.isArray(scan.senses) ? scan.senses as SenseScanRow[] : [];
  const candidateCount = senses.map((sense) => sense.runtimeCandidates.length);
  const allCandidates = senses.flatMap((sense) => sense.runtimeCandidates);
  const countBy = (key: string) => allCandidates.filter((candidate) => candidate.candidateClassification === key).length;
  const recommendations = [
    "EXISTING_MAPPING_NOOP_CANDIDATE", "EXISTING_MAPPING_UPDATE_REVIEW_REQUIRED", "MAP_EXISTING_CANDIDATE",
    "CREATE_NEW_CANDIDATE", "IDENTITY_REVIEW_REQUIRED", "RUNTIME_OVERRIDE_REVIEW_REQUIRED",
    "QUARANTINE_REVIEW_REQUIRED", "BLOCKED",
  ];
  const recommendationCounts = Object.fromEntries(recommendations.map((key) => [key, senses.filter((sense) => sense.analysisRecommendation === key).length]));
  const candidateIds = [...new Set(allCandidates.map((candidate) => candidate.appVocabularyId))];
  const progressCountById = new Map((snapshot.learnerProgressCounts ?? []).map((row) => [row.vocabularyId, row.referenceCount]));
  const reviewCountById = new Map((snapshot.reviewEventCounts ?? []).map((row) => [row.vocabularyId, row.referenceCount]));
  return {
    masterSensesScanned: senses.length,
    existingMasterMappings: senses.filter((sense) => sense.existingMasterMapping !== null).length,
    unmappedMasterSenses: senses.filter((sense) => sense.existingMasterMapping === null).length,
    zeroRuntimeCandidates: candidateCount.filter((count) => count === 0).length,
    exactlyOneCandidate: candidateCount.filter((count) => count === 1).length,
    multipleCandidates: candidateCount.filter((count) => count > 1).length,
    totalRuntimeCandidateRows: allCandidates.length,
    EXACT_EFFECTIVE_MATCH: countBy("EXACT_EFFECTIVE_MATCH"),
    PARTIAL_MATCH: countBy("PARTIAL_MATCH"),
    SEMANTIC_CANDIDATE: countBy("SEMANTIC_CANDIDATE"),
    CONFLICTING_MEANING: countBy("CONFLICTING_MEANING"),
    analysisRecommendations: recommendationCounts,
    candidateIdsWithLearnerProgress: candidateIds.filter((id) => (progressCountById.get(id) ?? 0) > 0).length,
    candidateIdsWithReviewEvents: candidateIds.filter((id) => (reviewCountById.get(id) ?? 0) > 0).length,
    polysemyCollisionGroups: (audit.oneRuntimeIdCandidateForMultipleMasterSenses as unknown[]).length,
    vietnameseOverrideReviewCount: [...new Set(allCandidates.filter((candidate) => candidate.vietnameseOverrideStatus === "CONFLICTS_WITH_MASTER").map((candidate) => candidate.appVocabularyId))].length,
    imageQuarantineReviewCount: [...new Set(allCandidates.filter((candidate) => candidate.imageQuarantined === true).map((candidate) => candidate.appVocabularyId))].length,
    ownerDecisionsFinalized: 0,
    ownerDecisionsUnresolved: senses.length,
  };
}

export function buildHybrid100OwnerDecisionTemplate(senses: Array<{ masterSenseId: string; masterLexemeId: string; candidateAppVocabularyIds: number[] }>) {
  return {
    artifactType: "HYBRID_100_OWNER_DECISION_TEMPLATE",
    generatedBy: GENERATED_BY,
    analysisOnly: true,
    ownerReviewed: false,
    acceptedByImporter: false,
    sourceDatasetVersion: HYBRID_100_2_2_1.datasetVersion,
    sourceSchemaVersion: HYBRID_100_2_2_1.schemaVersion,
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    targetEnvironment: "development",
    decisions: senses.map((sense) => ({
      masterSenseId: sense.masterSenseId,
      masterLexemeId: sense.masterLexemeId,
      ownerDecision: "UNRESOLVED",
      candidateAppVocabularyIds: [...new Set(sense.candidateAppVocabularyIds)].sort((a, b) => a - b),
      possibleDecision: ["MAP_EXISTING", "CREATE_NEW", "SKIP", "UNRESOLVED"],
      appVocabularyId: null,
      firstAdoptionPolicy: null,
      clearFields: [],
    })),
  };
}

export function redactSensitiveReconciliationValue(value: string): string {
  const redact = (urlText: string) => {
    if (/^postgres(?:ql)?:\/\//i.test(urlText)) return "[REDACTED_DATABASE_URL]";
    try {
      const url = new URL(urlText);
      if (url.protocol === "http:" || url.protocol === "https:") return `${url.protocol}//${url.hostname}/[REDACTED_PATH]`;
    } catch {
      return "[REDACTED_URL]";
    }
    return "[REDACTED_URL]";
  };
  return value.replace(/(?:postgres(?:ql)?:\/\/|https?:\/\/)[^\s"'<>]+/ig, (match) => {
    const trailing = match.match(/[),.;!?]+$/)?.[0] ?? "";
    const core = trailing ? match.slice(0, -trailing.length) : match;
    return `${redact(core)}${trailing}`;
  });
}

function secureArtifactString(value: unknown): unknown {
  if (typeof value === "string") {
    return redactSensitiveReconciliationValue(value);
  }
  if (Array.isArray(value)) return value.map(secureArtifactString);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as JsonObject).filter(([key]) => !/^(?:learnerId|learner_id|householdId|household_id)$/i.test(key))
      .map(([key, entry]) => [key, secureArtifactString(entry)]));
  }
  return value;
}

function writeJsonArtifact(filePath: string, value: unknown): void {
  if (existsSync(filePath)) {
    const existing = readJson<JsonObject>(filePath);
    if (existing.generatedBy !== GENERATED_BY) fail("SCAN_REFUSING_TO_OVERWRITE_NON_GENERATED_ARTIFACT");
  }
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${JSON.stringify(secureArtifactString(value), null, 2)}\n`, "utf8");
}

function writeReport(report: string, outputRoot: string, reportPath?: string): void {
  const filePath = reportPath ? path.resolve(reportPath) : path.join(outputRoot, REPORT_RELATIVE_PATH);
  const marker = `<!-- generatedBy: ${GENERATED_BY} -->`;
  if (existsSync(filePath) && !readFileSync(filePath, "utf8").includes(marker)) fail("SCAN_REFUSING_TO_OVERWRITE_NON_GENERATED_REPORT");
  mkdirSync(path.dirname(filePath), { recursive: true });
  const sanitizedReport = secureArtifactString(report);
  if (typeof sanitizedReport !== "string") fail("REPORT_SANITIZATION_FAILED");
  writeFileSync(filePath, `${marker}\n\n${sanitizedReport}`, "utf8");
}

function renderReport(input: {
  target: ReturnType<typeof getConnectionTarget>;
  migrationReady: boolean;
  history?: JsonObject;
  bridge?: JsonObject;
  projection: JsonObject;
  fingerprint?: string;
  counts?: JsonObject;
  scan?: JsonObject;
  blockedReason?: string;
}): string {
  const migration = input.history;
  const count = input.counts ?? {};
  const recommendations = (count.analysisRecommendations ?? {}) as JsonObject;
  const lines = [
    "# Hybrid-100 Development Runtime Reconciliation — 2.2.1",
    "",
    `**Outcome:** ${input.blockedReason ? "BLOCKED — runtime candidate discovery was not run" : "CANDIDATES DISCOVERED — owner decisions remain unresolved"}.`,
    "",
    "## Source and projection gates",
    "",
    `- Source: 2.2.1 / APPROVED; schema 2.0.1; releaseHash \`${HYBRID_100_2_2_1.releaseHash}\`.`,
    `- Release tree fingerprint: \`${HYBRID_100_2_2_1.releaseTreeFingerprint}\`; independent release hash and frozen-source builder checks passed before and after the scan.`,
    `- Runtime projection: \`${HYBRID_100_2_2_1.appImportContract}\` / \`${HYBRID_100_2_2_1.projectionContract}\`; RELEASE projected ${String(input.projection.projected)}/100, skipped ${String(input.projection.skipped)}, importEligible=${String(input.projection.importEligible)}.`,
    `- Projected non-null fields: Vietnamese ${String((input.projection.fieldCounts as JsonObject).vietnameseNonNull)}, definitionEn ${String((input.projection.fieldCounts as JsonObject).definitionEnNonNull)}, exampleEn ${String((input.projection.fieldCounts as JsonObject).exampleEnNonNull)}, IPA ${String((input.projection.fieldCounts as JsonObject).ipaNonNull)}.`,
    `- Topics, topic memberships, Learning Sets and Learning Set items: 0 / 0 / 0 / 0. CEFR remains Master-only; runtime level is not inferred.`,
    "",
    "## Development target and migration/bridge state",
    "",
    `- Neon Development: project \`${input.target.projectId}\`, branch \`${input.target.branchId}\`, database \`${input.target.databaseName}\`, role \`${input.target.roleName}\`. Connection URLs and credentials are not stored.`,
    `- Migration journal: ${String(migration?.appliedCount ?? "not inspected")}/${String(migration?.localMigrationCount ?? "not inspected")}; latest \`${String((migration?.latestApplied as JsonObject | null)?.tag ?? "none")}\`.`,
    `- Required bridge tables, columns, composite constraints and write guards: ${String((input.bridge as JsonObject | undefined)?.ready ?? "not inspected")}. Migration/bridge readiness: **${input.migrationReady ? "READY" : "BLOCKED"}**.`,
    ...(input.blockedReason ? [`- Block reason: \`${input.blockedReason}\`.`, "- Runtime vocabulary catalog, mappings and history aggregates were not queried."] : []),
  ];
  if (input.scan && input.counts) {
    const scanRows = Array.isArray(input.scan.senses) ? input.scan.senses as JsonObject[] : [];
    lines.push(
      "",
      "## Candidate summary",
      "",
      `- Master Senses scanned: ${String(count.masterSensesScanned)}; mappings present ${String(count.existingMasterMappings)}; unmapped ${String(count.unmappedMasterSenses)}.`,
      `- Runtime candidates: zero ${String(count.zeroRuntimeCandidates)}, one ${String(count.exactlyOneCandidate)}, multiple ${String(count.multipleCandidates)}; rows ${String(count.totalRuntimeCandidateRows)}.`,
      `- Classifications: EXACT_EFFECTIVE_MATCH ${String(count.EXACT_EFFECTIVE_MATCH)}, PARTIAL_MATCH ${String(count.PARTIAL_MATCH)}, SEMANTIC_CANDIDATE ${String(count.SEMANTIC_CANDIDATE)}, CONFLICTING_MEANING ${String(count.CONFLICTING_MEANING)}.`,
      `- Recommendations: EXISTING_MAPPING_NOOP_CANDIDATE ${String(recommendations.EXISTING_MAPPING_NOOP_CANDIDATE)}, EXISTING_MAPPING_UPDATE_REVIEW_REQUIRED ${String(recommendations.EXISTING_MAPPING_UPDATE_REVIEW_REQUIRED)}, MAP_EXISTING_CANDIDATE ${String(recommendations.MAP_EXISTING_CANDIDATE)}, CREATE_NEW_CANDIDATE ${String(recommendations.CREATE_NEW_CANDIDATE)}, IDENTITY_REVIEW_REQUIRED ${String(recommendations.IDENTITY_REVIEW_REQUIRED)}, RUNTIME_OVERRIDE_REVIEW_REQUIRED ${String(recommendations.RUNTIME_OVERRIDE_REVIEW_REQUIRED)}, QUARANTINE_REVIEW_REQUIRED ${String(recommendations.QUARANTINE_REVIEW_REQUIRED)}, BLOCKED ${String(recommendations.BLOCKED)}.`,
      `- Candidate IDs with learner progress > 0: ${String(count.candidateIdsWithLearnerProgress)}; review events > 0: ${String(count.candidateIdsWithReviewEvents)}. Polysemy groups ${String(count.polysemyCollisionGroups)}; override review ${String(count.vietnameseOverrideReviewCount)}; quarantine review ${String(count.imageQuarantineReviewCount)}.`,
      `- Snapshot fingerprint: \`${String(input.fingerprint)}\`; computed twice from the same captured repeatable-read snapshot and identical.`,
      "- History evidence is aggregate-only. Learner IDs and learner row contents were neither queried nor serialized.",
      "",
      "## Per-Sense owner review",
      "",
      "| Lemma / POS | Reviewed meaning | Master Sense ID | Candidate IDs | Classification | Key field differences | Progress / reviews | Override / quarantine | Analysis recommendation | Owner decision |",
      "| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |",
    );
    for (const sense of scanRows) {
      const candidates = Array.isArray(sense.runtimeCandidates) ? sense.runtimeCandidates as CandidateRow[] : [];
      const candidateIds = candidates.map((candidate) => String(candidate.appVocabularyId)).join(", ") || "—";
      const classifications = candidates.map((candidate) => `${candidate.appVocabularyId}: ${candidate.candidateClassification}`).join("; ") || "—";
      const differences = candidates.flatMap((candidate) => candidate.projectionDifferences.slice(0, 3).map((diff) => `${candidate.appVocabularyId}.${diff.field}`));
      const progressById = new Map(candidates.map((candidate) => [candidate.appVocabularyId, Number(candidate.learnerProgressReferenceCount) || 0]));
      const reviewById = new Map(candidates.map((candidate) => [candidate.appVocabularyId, Number(candidate.reviewEventReferenceCount) || 0]));
      const progress = [...progressById.values()].reduce((sum, value) => sum + value, 0);
      const reviews = [...reviewById.values()].reduce((sum, value) => sum + value, 0);
      const override = candidates.some((candidate) => candidate.vietnameseOverrideStatus === "CONFLICTS_WITH_MASTER") ? "review" : candidates.some((candidate) => candidate.vietnameseOverrideStatus === "MATCHES_MASTER") ? "matches" : "none";
      const quarantine = candidates.some((candidate) => candidate.imageQuarantined === true) ? "quarantined" : "none";
      lines.push(`| ${String(sense.lemma)} / ${String(sense.partOfSpeech)} | ${String(sense.reviewedMeaning ?? "—").replaceAll("|", "\\|")} | \`${String(sense.masterSenseId)}\` | ${candidateIds} | ${classifications} | ${differences.join(", ") || "none"} | ${progress} / ${reviews} | ${override} / ${quarantine} | ${String(sense.analysisRecommendation)} | UNRESOLVED |`);
    }
  }
  lines.push(
    "",
    "## Ownership and no-write evidence",
    "",
    "- Every owner decision is UNRESOLVED; finalized 0, unresolved 100. No importer-accepted reconciliation artifact was created.",
    "- Master null/absent runtime enrichment means PRESERVE. No clearFields decision is authorized. Existing mappings retain their runtime integer identity; candidate similarity does not establish identity.",
    "- DATABASE_CONNECTION = READ_ONLY_DEVELOPMENT; DATABASE_TRANSACTION = REPEATABLE_READ_READ_ONLY.",
    "- INSERT_COUNT = 0; UPDATE_COUNT = 0; DELETE_COUNT = 0; DDL_COUNT = 0; RUNTIME_IDS_ALLOCATED = 0; BRIDGE_MAPPINGS_CREATED = 0; LEARNER_ROWS_MUTATED = 0.",
    "- IMPORT_APPLY_EXECUTED = NO; MIGRATIONS_EXECUTED = NONE; PRODUCTION_CONNECTION = NONE; PRODUCTION_MUTATION = NO.",
    "- Owner reconciliation is required. Runtime import remains unauthorized.",
    "",
  );
  return `${lines.join("\n").trimEnd()}\n`;
}

async function inspectMigrationState(input: {
  url: string;
  target: ReturnType<typeof getConnectionTarget>;
  entries: JournalEntry[];
  localEvidence: MigrationHashEvidence[];
}) {
  const sql = openSql(input.url);
  try {
    return await sql.begin(async (tx) => {
      await tx.unsafe(HYBRID_100_READ_ONLY_TRANSACTION);
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, input.target);
      const [session] = await tx<{ current_user: string; session_user: string; database_name: string; transaction_isolation: string; transaction_read_only: string }[]>`
        SELECT current_user::text AS current_user, session_user::text AS session_user,
          current_database()::text AS database_name,
          current_setting('transaction_isolation')::text AS transaction_isolation,
          current_setting('transaction_read_only')::text AS transaction_read_only
      `;
      if (!session || session.current_user !== input.target.roleName || session.session_user !== input.target.roleName
        || session.database_name !== input.target.databaseName || session.transaction_isolation !== "repeatable read"
        || session.transaction_read_only !== "on") fail("DEVELOPMENT_MIGRATION_SESSION_IDENTITY_MISMATCH");
      const [journal] = await tx<{ exists: boolean }[]>`SELECT to_regclass('drizzle.__drizzle_migrations') IS NOT NULL AS exists`;
      const migrationRows = journal?.exists ? await tx<MigrationRow[]>`
        SELECT id, hash, created_at FROM "drizzle"."__drizzle_migrations" ORDER BY created_at, id
      ` : [];
      const tableNames = Object.keys(REQUIRED_BRIDGE_COLUMNS);
      const [tables, columns, constraints, triggers] = await Promise.all([
        tx<{ table_name: string }[]>`
          SELECT table_name::text AS table_name FROM information_schema.tables
          WHERE table_schema::text = 'vocabflow_app' AND table_type::text = 'BASE TABLE'
            AND table_name::text = ANY(${tx.array(tableNames)}::text[]) ORDER BY table_name
        `,
        tx<{ table_name: string; column_name: string }[]>`
          SELECT table_name::text AS table_name, column_name::text AS column_name FROM information_schema.columns
          WHERE table_schema::text = 'vocabflow_app' AND table_name::text = ANY(${tx.array(tableNames)}::text[])
          ORDER BY table_name, ordinal_position
        `,
        tx<{ conname: string }[]>`
          SELECT c.conname::text AS conname FROM pg_constraint c JOIN pg_class t ON t.oid = c.conrelid
          JOIN pg_namespace n ON n.oid = t.relnamespace WHERE n.nspname::text = 'vocabflow_app'
            AND c.conname::text = ANY(${tx.array(REQUIRED_COMPOSITE_CONSTRAINTS)}::text[]) ORDER BY c.conname
        `,
        tx<{ tgname: string }[]>`
          SELECT t.tgname::text AS tgname FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname::text = 'vocabflow_app'
            AND NOT t.tgisinternal AND t.tgname::text = ANY(${tx.array(REQUIRED_WRITE_GUARD_TRIGGERS)}::text[]) ORDER BY t.tgname
        `,
      ]);
      const expectedColumns = Object.entries(REQUIRED_BRIDGE_COLUMNS).flatMap(([table, names]) => names.map((column) => ({ table, column })));
      const presentColumns = new Set(columns.map((row) => `${row.table_name}.${row.column_name}`));
      const presentTables = tables.map((row) => row.table_name);
      const presentTableSet = new Set(presentTables);
      const presentConstraints = constraints.map((row) => row.conname);
      const presentTriggers = triggers.map((row) => row.tgname);
      const bridgeSchema = {
        tables: presentTables,
        missingTables: tableNames.filter((table) => !presentTableSet.has(table)),
        missingColumns: expectedColumns.filter((row) => !presentColumns.has(`${row.table}.${row.column}`)),
        presentConstraints,
        missingConstraints: REQUIRED_COMPOSITE_CONSTRAINTS.filter((name) => !presentConstraints.includes(name)),
        presentWriteGuardTriggers: presentTriggers,
        missingWriteGuardTriggers: REQUIRED_WRITE_GUARD_TRIGGERS.filter((name) => !presentTriggers.includes(name)),
      };
      const bridgeReady = bridgeSchema.missingTables.length === 0 && bridgeSchema.missingColumns.length === 0
        && bridgeSchema.missingConstraints.length === 0 && bridgeSchema.missingWriteGuardTriggers.length === 0;
      const history = assessMigrationHistory({
        entries: input.entries,
        evidence: input.localEvidence,
        rows: migrationRows.map((row) => ({ ...row, created_at: row.created_at === null ? null : Number(row.created_at) })),
        tableExists: journal?.exists === true,
      });
      return {
        targetVerifiedAfterConnect: true,
        currentUser: session.current_user,
        sessionUser: session.session_user,
        databaseName: session.database_name,
        transaction: "REPEATABLE_READ_READ_ONLY",
        migrationJournalTableExists: journal?.exists === true,
        history,
        bridgeSchema: { ...bridgeSchema, ready: bridgeReady },
        migrationReady: history.current && bridgeReady,
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function captureRuntimeSnapshot(input: {
  url: string;
  target: ReturnType<typeof getConnectionTarget>;
  sources: SourceSense[];
}) {
  const sql = openSql(input.url);
  try {
    return await sql.begin(async (tx) => {
      await tx.unsafe(HYBRID_100_READ_ONLY_TRANSACTION);
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, input.target);
      const [session] = await tx<{ current_user: string; session_user: string; database_name: string; transaction_isolation: string; transaction_read_only: string }[]>`
        SELECT current_user::text AS current_user, session_user::text AS session_user,
          current_database()::text AS database_name,
          current_setting('transaction_isolation')::text AS transaction_isolation,
          current_setting('transaction_read_only')::text AS transaction_read_only
      `;
      if (!session || session.current_user !== input.target.roleName || session.session_user !== input.target.roleName
        || session.database_name !== input.target.databaseName || session.transaction_isolation !== "repeatable read"
        || session.transaction_read_only !== "on") fail("DEVELOPMENT_RUNTIME_SESSION_IDENTITY_MISMATCH");
      const vocabularyRows = await tx<Array<{
        id: number; word: string; vietnamese: string; vietnamese_override: string | null; definition_en: string | null;
        example_en: string | null; ipa: string | null; image_url: string | null; image_quarantined: boolean;
        audio_url: string | null; topic: string | null; level: string | null; enabled: boolean; content_version: number;
        source_dataset: string | null; source_record_id: number | null;
      }>>`
        SELECT id, word, vietnamese, vietnamese_override, definition_en, example_en, ipa, image_url,
          image_quarantined, audio_url, topic, level, enabled, content_version, source_dataset, source_record_id
        FROM "vocabflow_app"."vocabularies" ORDER BY id
      `;
      const runtimeRows: RuntimeSourceRow[] = vocabularyRows.map((row) => ({
        id: Number(row.id), word: String(row.word), vietnamese: String(row.vietnamese), vietnameseOverride: row.vietnamese_override,
        definitionEn: row.definition_en, exampleEn: row.example_en, ipa: row.ipa, imageUrl: row.image_url,
        imageQuarantined: row.image_quarantined === true, audioUrl: row.audio_url, topic: row.topic, level: row.level,
        enabled: row.enabled === true, contentVersion: Number(row.content_version), sourceDataset: row.source_dataset,
        sourceRecordId: row.source_record_id === null ? null : Number(row.source_record_id),
      }));
      const seed = buildSourceCandidates(runtimeRows, input.sources);
      const initialScan = scanMasterVocabularyV2ReadOnlySnapshot({ snapshot: seed.snapshot, senses: seed.candidates }) as JsonObject;
      const initialCandidateIds = [...candidateSet(initialScan)].sort((a, b) => a - b);
      const sourceSenseIds = input.sources.map((sense) => sense.masterSenseId);
      const mappingRows = await tx<Array<{
        master_sense_id: string; master_lexeme_id: string; vocabulary_id: number; projection_contract_version: string;
        applied_projection_fingerprint: string; last_release_hash: string; applied_lexeme_revision: number; applied_sense_revision: number;
      }>>`
        SELECT master_sense_id::text AS master_sense_id, master_lexeme_id::text AS master_lexeme_id, vocabulary_id,
          projection_contract_version, applied_projection_fingerprint, last_release_hash,
          applied_lexeme_revision, applied_sense_revision
        FROM "vocabflow_app"."master_vocabulary_mappings"
        WHERE master_sense_id = ANY(${tx.array(sourceSenseIds)}::uuid[])
          OR vocabulary_id = ANY(${tx.array(initialCandidateIds)}::integer[])
        ORDER BY master_sense_id, vocabulary_id
      `;
      const mappings: RuntimeMappingWithRevisions[] = mappingRows.map((row) => ({
        masterSenseId: String(row.master_sense_id), masterLexemeId: String(row.master_lexeme_id), vocabularyId: Number(row.vocabulary_id),
        projectionContractVersion: String(row.projection_contract_version), appliedProjectionFingerprint: String(row.applied_projection_fingerprint),
        lastReleaseHash: String(row.last_release_hash), appliedLexemeRevision: Number(row.applied_lexeme_revision),
        appliedSenseRevision: Number(row.applied_sense_revision),
      }));
      const mappingSnapshot = { ...seed.snapshot, vocabularyMappings: mappings } as ReadOnlySnapshot;
      const mappedScan = ensureMappedRows(scanMasterVocabularyV2ReadOnlySnapshot({ snapshot: mappingSnapshot, senses: seed.candidates }) as JsonObject, mappingSnapshot, input.sources);
      const candidateIds = [...candidateSet(mappedScan)].sort((a, b) => a - b);
      const [progressRows, reviewRows] = candidateIds.length === 0
        ? [[], []] as [Array<{ vocabulary_id: number; reference_count: string }>, Array<{ vocabulary_id: number; reference_count: string }>]
        : await Promise.all([
          tx<Array<{ vocabulary_id: number; reference_count: string }>>`
            SELECT vocabulary_id, count(*)::text AS reference_count FROM "vocabflow_app"."learner_progress"
            WHERE vocabulary_id = ANY(${tx.array(candidateIds)}::integer[]) GROUP BY vocabulary_id ORDER BY vocabulary_id
          `,
          tx<Array<{ vocabulary_id: number; reference_count: string }>>`
            SELECT vocabulary_id, count(*)::text AS reference_count FROM "vocabflow_app"."review_events"
            WHERE vocabulary_id = ANY(${tx.array(candidateIds)}::integer[]) GROUP BY vocabulary_id ORDER BY vocabulary_id
          `,
        ]);
      const snapshot: ReadOnlySnapshot = {
        ...mappingSnapshot,
        learnerProgressCounts: progressRows.map((row) => ({ vocabularyId: Number(row.vocabulary_id), referenceCount: Number(row.reference_count) })),
        reviewEventCounts: reviewRows.map((row) => ({ vocabularyId: Number(row.vocabulary_id), referenceCount: Number(row.reference_count) })),
        progressVocabularyIds: [],
        reviewVocabularyIds: [],
      };
      const pureScan = scanMasterVocabularyV2ReadOnlySnapshot({ snapshot, senses: input.sources }) as JsonObject;
      const withMapped = ensureMappedRows(pureScan, snapshot, input.sources);
      const withAggregates = applyAggregates(withMapped, snapshot);
      const finalScan = decorateSenseRows(withAggregates, input.sources, snapshot);
      return {
        session: {
          currentUser: session.current_user,
          sessionUser: session.session_user,
          databaseName: session.database_name,
          transactionIsolation: session.transaction_isolation,
          transactionReadOnly: session.transaction_read_only,
          mode: "REPEATABLE_READ_READ_ONLY",
        },
        snapshot,
        scan: finalScan,
        candidateIds,
        catalogCount: runtimeRows.length,
      };
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export function fingerprintHybrid100Snapshot(input: {
  target: ReturnType<typeof getConnectionTarget>;
  snapshot: ReadOnlySnapshot;
  scan: JsonObject;
  appliedMigrations: Array<{ tag: string; hash: string }>;
  sourceSenseIdentities: Array<{
    masterLexemeId: string; masterSenseId: string; lemma: string; normalizedLemma: string;
    partOfSpeech: string; lexemeRevision: number; senseRevision: number;
  }>;
  migrationState: JsonObject;
}) {
  const target = safeTarget(input.target);
  const appliedMigrations = input.appliedMigrations;
  const base = fingerprintDevelopmentReconciliationSnapshot({
    target,
    releaseHash: HYBRID_100_2_2_1.releaseHash,
    snapshot: input.snapshot,
    scan: input.scan,
    appliedMigrations,
  });
  const sourceSenseIdentities = [...input.sourceSenseIdentities].sort((a, b) => a.masterSenseId.localeCompare(b.masterSenseId));
  const binding = {
    fingerprintVersion: "hybrid-100-development-reconciliation-snapshot-v1",
    baseSnapshotFingerprint: base,
    target,
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    sourceSenseIdentities,
    migrationState: input.migrationState,
    projectionMetadata: {
      datasetVersion: HYBRID_100_2_2_1.datasetVersion,
      schemaVersion: HYBRID_100_2_2_1.schemaVersion,
      appImportContract: HYBRID_100_2_2_1.appImportContract,
      projectionContract: HYBRID_100_2_2_1.projectionContract,
      futureReconciliationContract: HYBRID_100_2_2_1.futureReconciliationContract,
    },
  };
  const first = canonicalJsonSha256(binding);
  const second = canonicalJsonSha256(binding);
  if (first !== second) fail("SNAPSHOT_FINGERPRINT_NOT_REPEATABLE");
  return { fingerprint: first, repeatIdentical: true, baseFingerprint: base };
}

function buildSnapshotFingerprint(input: {
  target: ReturnType<typeof getConnectionTarget>;
  source: ReturnType<typeof verifyHybrid100SourceRelease>;
  migration: Awaited<ReturnType<typeof inspectMigrationState>>;
  snapshot: ReadOnlySnapshot;
  scan: JsonObject;
}) {
  const history = input.migration.history;
  return fingerprintHybrid100Snapshot({
    target: input.target,
    snapshot: input.snapshot,
    scan: input.scan,
    appliedMigrations: history.appliedMigrationsForFingerprint,
    sourceSenseIdentities: input.source.sources.map((sense) => ({
      masterLexemeId: sense.masterLexemeId,
      masterSenseId: sense.masterSenseId,
      lemma: sense.lemma,
      normalizedLemma: sense.normalizedLemma,
      partOfSpeech: sense.partOfSpeech,
      lexemeRevision: sense.lexemeRevision,
      senseRevision: sense.senseRevision,
    })),
    migrationState: {
      localMigrationCount: history.localMigrationCount,
      appliedCount: history.appliedCount,
      current: history.current,
      migrationReady: input.migration.migrationReady,
      missingMigrations: history.missingMigrations,
      missingJournalRows: history.missingJournalRows,
      hashMismatches: history.hashMismatches,
      bridgeSchema: input.migration.bridgeSchema,
    },
  });
}

export function finalizeHybrid100CandidateScan(snapshot: ReadOnlySnapshot, sources: SourceSense[]): JsonObject {
  const pure = scanMasterVocabularyV2ReadOnlySnapshot({ snapshot, senses: sources }) as JsonObject;
  return decorateSenseRows(applyAggregates(ensureMappedRows(pure, snapshot, sources), snapshot), sources, snapshot);
}

function makeCandidateArtifact(input: {
  scan: JsonObject;
  counts: JsonObject;
  target: ReturnType<typeof getConnectionTarget>;
  fingerprint: string;
}) {
  const senses = Array.isArray(input.scan.senses) ? input.scan.senses as SenseScanRow[] : [];
  return {
    artifactType: "HYBRID_100_RUNTIME_RECONCILIATION_CANDIDATES",
    generatedBy: GENERATED_BY,
    analysisOnly: true,
    generatedByTransform: false,
    ownerReviewed: false,
    acceptedByImporter: false,
    sourceDatasetVersion: HYBRID_100_2_2_1.datasetVersion,
    sourceSchemaVersion: HYBRID_100_2_2_1.schemaVersion,
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    appImportContract: HYBRID_100_2_2_1.appImportContract,
    projectionContract: HYBRID_100_2_2_1.projectionContract,
    futureReconciliationContract: HYBRID_100_2_2_1.futureReconciliationContract,
    targetEnvironment: "development",
    target: safeTarget(input.target),
    snapshotFingerprint: input.fingerprint,
    ...input.counts,
    senses: senses.map((sense) => ({
      ...sense,
      runtimeCandidates: sense.runtimeCandidates.map((candidate) => ({
        ...candidate,
        ownerDecision: "UNRESOLVED",
      })),
    })),
  };
}

function assertOwnerTemplate(template: ReturnType<typeof buildHybrid100OwnerDecisionTemplate>): void {
  if (template.decisions.length !== HYBRID_100_2_2_1.senses
    || template.decisions.some((row) => row.ownerDecision !== "UNRESOLVED" || row.appVocabularyId !== null || row.clearFields.length !== 0)
    || template.ownerReviewed !== false || template.acceptedByImporter !== false) fail("OWNER_DECISION_TEMPLATE_INVALID");
}

function readJournal(root: string): JournalEntry[] {
  const journal = readJson<{ entries: Array<{ when: number; tag: string }> }>(path.join(root, "drizzle", "migrations", "meta", "_journal.json"));
  return journal.entries.map((entry, idx) => ({ idx, when: entry.when, tag: entry.tag }));
}

function safeWriteBlockedReport(repositoryRoot: string, target: ReturnType<typeof getConnectionTarget>, source: ReturnType<typeof verifyHybrid100SourceRelease>, migration: Awaited<ReturnType<typeof inspectMigrationState>>, blockedReason: string, outputRoot = repositoryRoot, reportPath?: string) {
  const workspace = path.join(outputRoot, WORKSPACE_RELATIVE_ROOT);
  const generatedAt = new Date().toISOString();
  writeJsonArtifact(path.join(workspace, "manifest.json"), {
    artifactType: "HYBRID_100_DEVELOPMENT_RUNTIME_RECONCILIATION_BLOCKED",
    generatedBy: GENERATED_BY,
    generatedAt,
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    targetEnvironment: "development",
    target: safeTarget(target),
    migrationReady: false,
    runtimeCatalogScanned: false,
    candidateDiscoveryPerformed: false,
    blockedReason,
    ownerDecisionsFinalized: 0,
  });
  writeJsonArtifact(path.join(workspace, "development-target.json"), { generatedBy: GENERATED_BY, target: safeTarget(target), targetVerified: true });
  writeJsonArtifact(path.join(workspace, "migration-state.json"), { generatedBy: GENERATED_BY, ...migration });
  writeJsonArtifact(path.join(workspace, "projection-summary.json"), {
    generatedBy: GENERATED_BY,
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    releaseTreeFingerprint: source.releaseTreeFingerprint,
    projected: source.projected,
    skipped: source.skipped,
    importEligible: source.importEligible,
    projectionScope: source.projectionScope,
  });
  writeJsonArtifact(path.join(workspace, "validation-summary.json"), {
    generatedBy: GENERATED_BY,
    status: "BLOCKED_BEFORE_RUNTIME_DISCOVERY",
    blockedReason,
    runtimeCatalogScanned: false,
    databaseWrites: "NONE",
    importApplyExecuted: false,
    migrationsExecuted: "NONE",
    productionConnection: "NONE",
  });
  writeReport(renderReport({ target, migrationReady: false, history: migration.history as unknown as JsonObject, bridge: migration.bridgeSchema as unknown as JsonObject, projection: source as unknown as JsonObject, blockedReason }), outputRoot, reportPath);
  return { status: "BLOCKED", migrationReady: false, blockedReason, report: REPORT_RELATIVE_PATH };
}

export function parseHybrid100ScannerArgs(args: readonly string[]): { envFile?: string; outputRoot?: string; reportPath?: string } {
  let envFile: string | undefined;
  let outputRoot: string | undefined;
  let reportPath: string | undefined;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--env-file" && args[i + 1] && !args[i + 1]!.startsWith("--") && !envFile) {
      envFile = args[i + 1];
      i += 1;
    } else if (args[i] === "--output-root" && args[i + 1] && !args[i + 1]!.startsWith("--") && !outputRoot) {
      outputRoot = path.resolve(args[++i]!);
    } else if (args[i] === "--report" && args[i + 1] && !args[i + 1]!.startsWith("--") && !reportPath) {
      reportPath = path.resolve(args[++i]!);
    } else {
      fail("SCANNER_ARGUMENT_INVALID");
    }
  }
  return {
    ...(envFile ? { envFile } : {}),
    ...(outputRoot ? { outputRoot } : {}),
    ...(reportPath ? { reportPath } : {}),
  };
}

export async function runHybrid100DevelopmentReconciliationScan(
  repositoryRoot = process.cwd(),
  options: { outputRoot?: string; reportPath?: string } = {},
) {
  const outputRoot = path.resolve(options.outputRoot ?? repositoryRoot);
  const source = verifyHybrid100SourceRelease(repositoryRoot);
  const context = (process.env.EXECUTION_CONTEXT ?? "local-development") as ExecutionContext;
  const environment = (process.env.VOCABFLOW_ENV ?? "development") as Environment;
  const trustedSource = process.env.TRUSTED_SOURCE as TrustedSource;
  assertMarkers(context, trustedSource, environment);
  const migrationTarget = getConnectionTarget("development", "migration");
  const runtimeTarget = getConnectionTarget("development", "runtime");
  if (!isExactHybrid100DevelopmentTarget(migrationTarget) || !isExactHybrid100DevelopmentTarget(runtimeTarget)) fail("HYBRID_100_DEVELOPMENT_TARGET_MISMATCH");

  const migrationConnection = await assertResolvedTargetBeforeMutation({
    context, source: trustedSource, environment, purpose: "migration", operation: "db-check", target: migrationTarget,
    connectionString: process.env.DATABASE_MIGRATION_URL,
  });
  const runtimeConnection = await assertResolvedTargetBeforeMutation({
    context, source: trustedSource, environment, purpose: "runtime", operation: "db-check", target: runtimeTarget,
    connectionString: process.env.DATABASE_URL,
  });
  assertCurationDatabaseAccess({
    executionContext: context,
    trustedSource,
    vocabularyEnvironment: environment,
    databaseEnvironment: process.env.DATABASE_ENV,
    requestedTarget: "development",
    resolvedTarget: runtimeTarget,
    mode: "dry-run",
  });

  const localEvidence = readMigrationHashEvidence(path.join(repositoryRoot, "drizzle", "migrations"));
  const journalEntries = readJournal(repositoryRoot);
  const migration = await inspectMigrationState({
    url: migrationConnection.url,
    target: migrationTarget,
    entries: journalEntries,
    localEvidence,
  });
  if (!migration.migrationReady) {
    assertFrozenRelease(repositoryRoot);
    return safeWriteBlockedReport(repositoryRoot, runtimeTarget, source, migration, "MIGRATION_OR_BRIDGE_STATE_NOT_CURRENT", outputRoot, options.reportPath);
  }

  const runtime = await captureRuntimeSnapshot({ url: runtimeConnection.url, target: runtimeTarget, sources: source.sources });
  const fingerprint = buildSnapshotFingerprint({ target: runtimeTarget, source, migration, snapshot: runtime.snapshot, scan: runtime.scan });
  const collisionAudit = summarizeCollisions(runtime.scan, runtime.snapshot);
  const counts = summaryCounts(runtime.scan, collisionAudit, runtime.snapshot);
  const candidateArtifact = makeCandidateArtifact({ scan: runtime.scan, counts, target: runtimeTarget, fingerprint: fingerprint.fingerprint }) as JsonObject;
  const decisions = (runtime.scan.senses as SenseScanRow[]).map((sense) => ({
    masterSenseId: sense.masterSenseId,
    masterLexemeId: sense.masterLexemeId,
    candidateAppVocabularyIds: sense.runtimeCandidates.map((candidate) => candidate.appVocabularyId),
  }));
  const ownerTemplate = buildHybrid100OwnerDecisionTemplate(decisions);
  assertOwnerTemplate(ownerTemplate);
  if ((candidateArtifact.senses as unknown[]).length !== HYBRID_100_2_2_1.senses
    || Number(counts.ownerDecisionsUnresolved) !== HYBRID_100_2_2_1.senses
    || Number(counts.ownerDecisionsFinalized) !== 0) fail("CANDIDATE_ARTIFACT_SCOPE_INVALID");
  if (source.projectionScope.topics !== 0 || source.projectionScope.topicMemberships !== 0
    || source.projectionScope.learningSets !== 0 || source.projectionScope.learningSetItems !== 0) fail("HYBRID_100_UNEXPECTED_RUNTIME_SCOPE");

  const frozenAfter = assertFrozenRelease(repositoryRoot);
  if (frozenAfter.releaseHash !== source.frozenBefore.releaseHash
    || frozenAfter.releaseTreeFingerprint !== source.frozenBefore.releaseTreeFingerprint) fail("HYBRID_100_FROZEN_SOURCE_CHANGED_DURING_SCAN");

  const workspace = path.join(outputRoot, WORKSPACE_RELATIVE_ROOT);
  const generatedAt = new Date().toISOString();
  writeJsonArtifact(path.join(workspace, "manifest.json"), {
    artifactType: "HYBRID_100_DEVELOPMENT_RUNTIME_RECONCILIATION",
    generatedBy: GENERATED_BY,
    generatedAt,
    sourceDatasetVersion: HYBRID_100_2_2_1.datasetVersion,
    sourceSchemaVersion: HYBRID_100_2_2_1.schemaVersion,
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    releaseTreeFingerprint: HYBRID_100_2_2_1.releaseTreeFingerprint,
    targetEnvironment: "development",
    migrationReady: true,
    candidateDiscoveryPerformed: true,
    snapshotFingerprint: fingerprint.fingerprint,
    fingerprintRepeatIdentical: fingerprint.repeatIdentical,
    ownerDecisionsFinalized: 0,
    ownerDecisionsUnresolved: HYBRID_100_2_2_1.senses,
    databaseConnection: "READ_ONLY_DEVELOPMENT",
    databaseTransaction: "REPEATABLE_READ_READ_ONLY",
    databaseWrites: "NONE",
    runtimeImportAuthorized: false,
  });
  writeJsonArtifact(path.join(workspace, "development-target.json"), {
    generatedBy: GENERATED_BY,
    target: safeTarget(runtimeTarget),
    targetVerified: true,
    connectedPurpose: "runtime",
    connectedRole: runtime.session.currentUser,
    databaseName: runtime.session.databaseName,
  });
  writeJsonArtifact(path.join(workspace, "migration-state.json"), { generatedBy: GENERATED_BY, ...migration });
  writeJsonArtifact(path.join(workspace, "projection-summary.json"), {
    generatedBy: GENERATED_BY,
    sourceDatasetVersion: HYBRID_100_2_2_1.datasetVersion,
    sourceSchemaVersion: HYBRID_100_2_2_1.schemaVersion,
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    releaseTreeFingerprint: HYBRID_100_2_2_1.releaseTreeFingerprint,
    projected: source.projected,
    skipped: source.skipped,
    importEligible: source.importEligible,
    fieldCounts: source.fieldCounts,
    projectionScope: source.projectionScope,
  });
  writeJsonArtifact(path.join(workspace, "runtime-snapshot-summary.json"), {
    generatedBy: GENERATED_BY,
    targetEnvironment: "development",
    snapshotFingerprint: fingerprint.fingerprint,
    fingerprintRepeatIdentical: fingerprint.repeatIdentical,
    catalogRowsRead: runtime.catalogCount,
    candidateRuntimeIds: [...candidateSet(runtime.scan)].sort((a, b) => a - b),
    runtimeRowsSerialized: (runtime.scan.senses as SenseScanRow[]).reduce((sum, sense) => sum + sense.runtimeCandidates.length, 0),
    historyEvidence: "AGGREGATE_COUNTS_ONLY",
    learnerIdentitiesQueried: false,
  });
  writeJsonArtifact(path.join(workspace, "runtime-reconciliation-candidates-development.json"), candidateArtifact);
  writeJsonArtifact(path.join(workspace, "collision-audit.json"), { generatedBy: GENERATED_BY, ...collisionAudit });
  writeJsonArtifact(path.join(workspace, "owner-decision-template.json"), ownerTemplate);
  writeJsonArtifact(path.join(workspace, "validation-summary.json"), {
    generatedBy: GENERATED_BY,
    status: "PASS",
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    releaseTreeFingerprint: HYBRID_100_2_2_1.releaseTreeFingerprint,
    releaseUnchanged: true,
    canonicalRootUnchanged: true,
    canaryUnchanged: true,
    rcUnchanged: true,
    sourceSenses: HYBRID_100_2_2_1.senses,
    projected: source.projected,
    skipped: source.skipped,
    importEligible: source.importEligible,
    targetVerified: true,
    migrationReady: true,
    runtimeTransaction: runtime.session.mode,
    fingerprintRepeatIdentical: fingerprint.repeatIdentical,
    ownerDecisionsFinalized: 0,
    ownerDecisionsUnresolved: HYBRID_100_2_2_1.senses,
    runtimeIdsAllocated: 0,
    bridgeMappingsCreated: 0,
    databaseWrites: "NONE",
    importerApplyExecuted: false,
    migrationsExecuted: "NONE",
    productionConnection: "NONE",
    productionMutation: false,
  });
  writeReport(renderReport({
    target: runtimeTarget,
    migrationReady: true,
    history: migration.history as unknown as JsonObject,
    bridge: migration.bridgeSchema as unknown as JsonObject,
    projection: source as unknown as JsonObject,
    fingerprint: fingerprint.fingerprint,
    counts,
    scan: runtime.scan,
  }), outputRoot, options.reportPath);
  return {
    status: "CANDIDATES_READY_FOR_OWNER_REVIEW",
    sourceReleaseHash: HYBRID_100_2_2_1.releaseHash,
    targetVerified: true,
    migrationReady: true,
    transaction: runtime.session.mode,
    snapshotFingerprint: fingerprint.fingerprint,
    fingerprintRepeatIdentical: fingerprint.repeatIdentical,
    counts,
      candidateArtifact: path.join(outputRoot, WORKSPACE_RELATIVE_ROOT, "runtime-reconciliation-candidates-development.json"),
      ownerDecisionTemplate: path.join(outputRoot, WORKSPACE_RELATIVE_ROOT, "owner-decision-template.json"),
      report: options.reportPath ? path.resolve(options.reportPath) : path.join(outputRoot, REPORT_RELATIVE_PATH),
    databaseWrites: "NONE",
    importerApplyExecuted: false,
    migrationsExecuted: "NONE",
    productionConnection: "NONE",
  };
}

export async function runHybrid100DevelopmentReconciliationScanCli(
  cliArgs: readonly string[],
  dependencies: {
    repositoryRoot?: string;
    loadEnvFile?: (filePath: string) => void;
    runScan?: (repositoryRoot: string, options: { outputRoot?: string; reportPath?: string }) => Promise<unknown>;
  } = {},
): Promise<unknown> {
  const parsed = parseHybrid100ScannerArgs(cliArgs);
  const { envFile, ...scanOptions } = parsed;
  if (envFile) (dependencies.loadEnvFile ?? ((filePath) => process.loadEnvFile(filePath)))(envFile);
  const runScan = dependencies.runScan ?? runHybrid100DevelopmentReconciliationScan;
  return runScan(dependencies.repositoryRoot ?? process.cwd(), scanOptions);
}

function isMain(): boolean {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  runHybrid100DevelopmentReconciliationScanCli(process.argv.slice(2)).then((result) => {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }).catch((error: unknown) => {
    const message = error instanceof Error && /^[A-Z][A-Z0-9_:.-]{2,120}$/.test(error.message) ? error.message : "HYBRID_100_SCAN_FAILED";
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  });
}
