import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import postgres from "postgres";
import { assertResolvedTargetBeforeMutation, getTarget } from "./runtime-validation";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = "vocabflow-dataset/workspaces/legacy-vocabulary-cleanup-audit";
const REPORT = "vocabflow-dataset/reports/development-legacy-vocabulary-cleanup-audit.md";
const EXPECTED_REMOTE_BASELINE = "b8f2ef7e2f38d107d5f53bdca5b0b2b834e845ad";
const HYBRID_RELEASE_RELATIVE = "vocabflow-dataset/releases/hybrid-100-v2.2.1";
const CANARY_RELEASE_RELATIVE = "vocabflow-dataset/releases/canary-v2.1.0";
const EXPECTED_HYBRID_RELEASE_HASH = "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c";
const EXPECTED_HYBRID_PLAN = "7cb18d5c475d3f65538bb55e9bba5c4ad2b666bb7b2678a2e19d8b447b2f9929";
const EXPECTED_HYBRID_RUN_ID = "5062fc01-8615-48ab-80e6-ed91d6b77a60";
const EXPECTED_HYBRID_RECONCILIATION = "4c3d86eb3a4b06a04c68e870847f97fa432fdf247595c577eb758888d62315db";
const EXPECTED_POST_APPLY_SNAPSHOT = "5ebcadbfd95619e8b6e7a5c8cc4a4fca16600f7e947cda5932d1ff16bf4fc85a";
const EXPECTED_HYBRID_SENSE_COUNT = 100;
const PRESERVED_RUNTIME_IDS = new Set([11, 284]);
const SAFE_AUDIT_ERROR_CODES = new Set([
  "OWNER_REVIEW_PACKAGE_PIN_MISMATCH", "OWNER_REVIEW_DECISION_COVERAGE_INVALID", "OWNER_REVIEW_FINAL_DECISION_INVALID", "OWNER_REVIEW_CANDIDATE_ID_INVALID",
  "APPROVED_MASTER_LEXEME_INVALID", "APPROVED_MASTER_LEXEME_MISSING", "APPROVED_MASTER_RECORD_PATH_INVALID", "APPROVED_MASTER_RELEASE_PIN_MISMATCH", "APPROVED_MASTER_SENSE_INVALID",
  "AUDIT_FINGERPRINT_NOT_DETERMINISTIC", "BRANCH_NOT_FOUND", "CANARY_BOOKING_LEXEME_NOT_FOUND", "CANARY_BOOKING_SENSE_NOT_UNIQUE", "CLEANUP_CLASSIFICATION_NOT_EXACTLY_ONCE",
  "CONNECTION_TARGET_MISMATCH", "DATABASE_IDENTITY_MISMATCH", "DELETE_SAFE_CLASSIFICATION_HAS_REFERENCES", "DEVELOPMENT_RUNTIME_TARGET_MISMATCH", "HYBRID_100_STATE_BLOCKED",
  "HYBRID_RELEASE_COHORT_COUNT_MISMATCH", "INVALID_DATABASE_URL", "INVALID_ENVIRONMENT_MARKERS", "INVALID_TARGET_CONTEXT", "LOCAL_DEVELOPMENT_ENV_FILE_NOT_FOUND",
  "LOCAL_DEVELOPMENT_ENVIRONMENT_MARKER_MISMATCH", "LOCAL_SHARED_CI_TARGET_FORBIDDEN", "MASTER_MANAGED_CLASSIFICATION_MISMATCH", "MUTATION_OPTIONS_NOT_AUTHORIZED",
  "NON_READ_ONLY_SQL_REJECTED", "PRODUCTION_DB_MUTATION_OUT_OF_SCOPE", "PRODUCTION_RELEASE_GUARD_REQUIRED", "PROJECT_NOT_FOUND", "PROVIDER_AUTH_FAILED", "PROVIDER_RESPONSE_INVALID",
  "PROVIDER_UNAVAILABLE", "PROVIDER_VERIFICATION_REQUIRED", "READ_ONLY_DEVELOPMENT_TRANSACTION_IDENTITY_FAILED", "REFERENCE_TABLE_SELECT_PRIVILEGE_MISSING",
  "RUNTIME_11_HISTORY_PRESERVATION_FAILED", "RUNTIME_284_BOOKING_MAPPING_CHANGED", "RUNTIME_PARTITION_NOT_EXHAUSTIVE", "RUNTIME_DATABASE_URL_REQUIRED",
  "SKIPPED_NO_TEST_DATABASE_SECRET", "UNCONFIGURED_DATABASE_TARGET", "UNSUPPORTED_AUDIT_ARGUMENT"
]);

export const CLEANUP_CLASSES = [
  "KEEP_MASTER_MANAGED",
  "KEEP_REFERENCED_LEGACY",
  "LEGACY_MAPPING_REVIEW",
  "LEGACY_DUPLICATE_REVIEW",
  "DISABLE_CANDIDATE",
  "DELETE_SAFE_CANDIDATE",
  "ANOMALY_REVIEW_REQUIRED"
] as const;
export type CleanupClass = typeof CLEANUP_CLASSES[number];
export type CandidateRelation =
  | "OWNER_REVIEWED_NOT_SAME_IDENTITY"
  | "NO_MASTER_CANDIDATE"
  | "POSSIBLE_SAME_IDENTITY"
  | "SEMANTIC_RELATED_NOT_SAME_IDENTITY"
  | "HOMONYM_OR_POLYSEMY_CONFLICT"
  | "MULTIPLE_MASTER_CANDIDATES"
  | "EXISTING_MASTER_RUNTIME_DUPLICATE"
  | "REVIEW_REQUIRED";

type JsonObject = Record<string, unknown>;
type MasterCandidate = {
  masterSenseId: string;
  masterLexemeId: string;
  normalizedLemma: string;
  lemma: string;
  partOfSpeech: string;
  translations: string[];
  aliases: string[];
};
type ReferenceForeignKey = {
  constraint: string;
  deleteAction: string;
  updateAction: string;
  validated: boolean;
  referencedColumn: string;
};
type ReferenceDescriptor = {
  schema: string;
  table: string;
  column: string;
  columnType: string;
  applicationLevel: boolean;
  foreignKeys: ReferenceForeignKey[];
  canSelect: boolean;
  referenceCountByVocabularyId: Record<number, number>;
};
type MappingRow = {
  masterSenseId: string;
  masterLexemeId: string;
  runtimeVocabularyId: number;
  sourceDatasetId: string;
  sourceDatasetVersion: string;
  sourceSchemaVersion: string;
  projectionContractVersion: string;
  appliedProjectionFingerprint: string;
  appliedLexemeRevision: number;
  appliedSenseRevision: number;
  lastReleaseHash: string;
  lastImportRunId: string;
};
type ImportRunRow = {
  id: string;
  datasetId: string;
  datasetVersion: string;
  schemaVersion: string;
  projectionContractVersion: string;
  releaseHash: string;
  reconciliationHash: string;
  planFingerprint: string;
  environment: string;
  targetBranchId: string;
};
type RuntimeRow = {
  runtimeVocabularyId: number;
  word: string;
  normalizedWord: string;
  enabled: boolean;
  contentVersion: number;
  sourceDataset: string | null;
  sourceRecordId: number | null;
  mappings: MappingRow[];
  referenceCounts: Record<string, number>;
  totalReferenceCount: number;
  hasAnyReference: boolean;
  applicationReferenceCount: number;
  sourceIdentityObligation: boolean;
  runtimeDependencyDetected: boolean;
  topLevelPartition: "MASTER_MANAGED" | "LEGACY_UNMAPPED" | "MAPPING_ANOMALY";
  mappingAnomalyReasons: string[];
};
type CandidateEvidence = {
  masterSenseId: string;
  masterLexemeId: string;
  lemma: string;
  partOfSpeech: string;
  matchKind: "EXACT_CANONICAL_LEMMA" | "ALIAS_ONLY" | "TRANSLATION_ONLY" | "OWNER_REVIEWED_CANDIDATE";
  identityClaim: "POSSIBLE" | "NONE";
  ownerReviewedRelation?: "OWNER_REVIEWED_NOT_SAME_IDENTITY";
};
export type CandidateAnalysis = {
  runtimeVocabularyId: number;
  word: string;
  normalizedWord: string;
  relation: CandidateRelation;
  candidates: CandidateEvidence[];
  automaticMappingCreated: false;
  reviewRequired: boolean;
  exclusionReason?: string;
};
type ClassifiedRow = {
  runtimeVocabularyId: number;
  word: string;
  cleanupClass: CleanupClass;
  topLevelPartition: RuntimeRow["topLevelPartition"];
  candidateRelation: CandidateRelation;
  referenceCount: number;
  hasAnyReference: boolean;
  enabled: boolean;
  sourceIdentityObligation: boolean;
  runtimeDependencyDetected: boolean;
  reasons: string[];
};
type AuditSnapshot = {
  target: JsonObject;
  transaction: { isolation: string; readOnly: boolean };
  databaseIdentity: { environment: string; provider: string; projectId: string; branchId: string; databaseName: string; currentRole: string; transactionReadOnly: boolean; transactionIsolation: string };
  runtimeRows: RuntimeRow[];
  mappings: MappingRow[];
  importRuns: ImportRunRow[];
  references: ReferenceDescriptor[];
  schemaInventory: JsonObject;
  masterCandidates: MasterCandidate[];
  hybridSenseIds: Set<string>;
  hybridCheckpoint: JsonObject;
  orphanMappingCount: number;
  repositoryBaseline: string;
};

export function assertDevelopmentTarget(target: { environment: string; provider: string; projectId: string; branchId: string; databaseName: string; roleName: string }): void {
  if (target.environment !== "development" || target.provider !== "neon" || target.projectId !== "shy-hill-72364426" ||
      target.branchId !== "br-square-grass-b3af0nte" || target.databaseName !== "neondb" || target.roleName !== "vocabflow_runtime") {
    throw new Error("DEVELOPMENT_RUNTIME_TARGET_MISMATCH");
  }
}

export function rejectMutationOptions(args: string[]): void {
  const mutationOption = /^(--?)(apply|delete|disable|cleanup|merge|insert|update|write-db|migrate|production)(=|$)/i;
  if (args.some((arg) => mutationOption.test(arg))) throw new Error("MUTATION_OPTIONS_NOT_AUTHORIZED");
  if (args.length > 0) throw new Error("UNSUPPORTED_AUDIT_ARGUMENT");
}

export function assertReadOnlySql(statement: string): void {
  const normalized = statement.trim().replace(/;+\s*$/, "").trim();
  if (!/^SELECT\b/i.test(normalized) && !/^SET\s+TRANSACTION\s+ISOLATION\s+LEVEL\s+REPEATABLE\s+READ\s+READ\s+ONLY$/i.test(normalized)) {
    throw new Error("NON_READ_ONLY_SQL_REJECTED");
  }
}

export function normalizeWord(value: unknown): string {
  return typeof value === "string" ? value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en-US") : "";
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(",")}}`;
}

export function deterministicAuditFingerprint(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value), "utf8").digest("hex");
}

function safeRelativeRecordPath(root: string, releaseRelative: string, recordPath: string): string {
  const releaseRoot = path.resolve(root, releaseRelative);
  const absolute = path.resolve(releaseRoot, recordPath);
  if (!absolute.startsWith(`${releaseRoot}${path.sep}`) || !existsSync(absolute)) throw new Error("APPROVED_MASTER_RECORD_PATH_INVALID");
  return absolute;
}

function readJsonFile(absolute: string): JsonObject {
  return JSON.parse(readFileSync(absolute, "utf8")) as JsonObject;
}

function listValues(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object") : [];
}

function localizableTexts(value: unknown, language?: string): string[] {
  const items = Array.isArray(value) ? value : value && typeof value === "object" ? [value] : [];
  return items.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const record = entry as Record<string, unknown>;
    if (typeof record.text !== "string" || (language && record.language !== language)) return [];
    return [record.text];
  });
}

export function readApprovedMasterCorpus(root = ROOT): { candidates: MasterCandidate[]; hybridSenseIds: Set<string>; sources: JsonObject[] } {
  const releaseSpecs = [
    { relative: HYBRID_RELEASE_RELATIVE, expectedVersion: "2.2.1", expectedHash: EXPECTED_HYBRID_RELEASE_HASH, hybrid: true },
    { relative: CANARY_RELEASE_RELATIVE, expectedVersion: "2.1.0", expectedHash: undefined, hybrid: false }
  ];
  const bySense = new Map<string, MasterCandidate>();
  const hybridSenseIds = new Set<string>();
  const sources: JsonObject[] = [];
  for (const spec of releaseSpecs) {
    const manifest = readJsonFile(path.join(root, spec.relative, "dataset.json"));
    if (manifest.status !== "APPROVED" || manifest.datasetVersion !== spec.expectedVersion ||
        (spec.expectedHash && manifest.releaseHash !== spec.expectedHash)) throw new Error("APPROVED_MASTER_RELEASE_PIN_MISMATCH");
    const releaseRoot = path.resolve(root, spec.relative);
    const lexemes = new Map<string, JsonObject>();
    for (const ref of listValues(manifest.includedLexemes)) {
      const record = readJsonFile(safeRelativeRecordPath(root, spec.relative, String(ref.recordPath ?? "")));
      if (record.status !== "APPROVED" || typeof record.masterLexemeId !== "string") throw new Error("APPROVED_MASTER_LEXEME_INVALID");
      lexemes.set(record.masterLexemeId, record);
    }
    const senseRefs = listValues(manifest.includedSenses);
    if (spec.hybrid && senseRefs.length !== EXPECTED_HYBRID_SENSE_COUNT) throw new Error("HYBRID_RELEASE_COHORT_COUNT_MISMATCH");
    for (const ref of senseRefs) {
      const sense = readJsonFile(safeRelativeRecordPath(root, spec.relative, String(ref.recordPath ?? "")));
      if (sense.status !== "APPROVED" || typeof sense.masterSenseId !== "string" || typeof sense.masterLexemeId !== "string") {
        throw new Error("APPROVED_MASTER_SENSE_INVALID");
      }
      const lexeme = lexemes.get(sense.masterLexemeId);
      if (!lexeme || typeof lexeme.lemma !== "string" || typeof lexeme.normalizedLemma !== "string") throw new Error("APPROVED_MASTER_LEXEME_MISSING");
      const candidate: MasterCandidate = {
        masterSenseId: sense.masterSenseId,
        masterLexemeId: sense.masterLexemeId,
        normalizedLemma: normalizeWord(lexeme.normalizedLemma),
        lemma: lexeme.lemma,
        partOfSpeech: String(sense.partOfSpeechCode ?? "UNKNOWN"),
        translations: localizableTexts(sense.translations, "vi").map(normalizeWord).filter(Boolean),
        aliases: listValues(lexeme.aliases).flatMap((alias) => typeof alias.text === "string" ? [normalizeWord(alias.text)] : [])
      };
      const current = bySense.get(candidate.masterSenseId);
      if (!current || (candidate.masterLexemeId === current.masterLexemeId && spec.expectedVersion > "2.1.0")) bySense.set(candidate.masterSenseId, candidate);
      if (spec.hybrid) hybridSenseIds.add(candidate.masterSenseId);
    }
    sources.push({
      release: spec.relative,
      datasetId: manifest.datasetId,
      datasetVersion: manifest.datasetVersion,
      status: manifest.status,
      releaseHash: manifest.releaseHash ?? null,
      lexemeCount: listValues(manifest.includedLexemes).length,
      senseCount: senseRefs.length,
      releaseRootExists: existsSync(releaseRoot)
    });
  }
  return { candidates: [...bySense.values()].sort((a, b) => a.masterSenseId.localeCompare(b.masterSenseId)), hybridSenseIds, sources };
}

export type OwnerReviewedExclusion = {
  masterSenseId: string;
  masterLexemeId: string;
  runtimeVocabularyId: number;
  lemma: string;
  partOfSpeech: string;
  finalDecision: "CREATE_NEW";
  reason: string;
};

const OWNER_REVIEW = "vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review";
export function deriveOwnerReviewedExclusions(
  proposal: { senses: Array<{ masterSenseId: string; masterLexemeId: string; lemma: string; partOfSpeech: string; runtimeCandidateIds: number[]; evidence: { semanticIdentityReason: string } }> },
  finalized: { vocabulary: Array<{ masterSenseId: string; decision: string; appVocabularyId: number | null }> }
): OwnerReviewedExclusion[] {
  const decisions = new Map(finalized.vocabulary.map((row) => [row.masterSenseId, row]));
  if (decisions.size !== finalized.vocabulary.length || proposal.senses.length !== decisions.size || new Set(proposal.senses.map((row) => row.masterSenseId)).size !== decisions.size) throw new Error("OWNER_REVIEW_DECISION_COVERAGE_INVALID");
  return proposal.senses.flatMap((sense) => {
    const final = decisions.get(sense.masterSenseId);
    if (!final || !["CREATE_NEW", "MAP_EXISTING"].includes(final.decision) ||
        (final.decision === "CREATE_NEW" ? final.appVocabularyId !== null : !Number.isSafeInteger(final.appVocabularyId))) throw new Error("OWNER_REVIEW_FINAL_DECISION_INVALID");
    // Proposal recommendations are not authority: use only the finalized decision.
    if (final.decision !== "CREATE_NEW") return [];
    return [...new Set(sense.runtimeCandidateIds)].map((runtimeVocabularyId) => {
      if (!Number.isSafeInteger(runtimeVocabularyId) || runtimeVocabularyId <= 0) throw new Error("OWNER_REVIEW_CANDIDATE_ID_INVALID");
      return { masterSenseId: sense.masterSenseId, masterLexemeId: sense.masterLexemeId, runtimeVocabularyId,
        lemma: sense.lemma, partOfSpeech: sense.partOfSpeech, finalDecision: "CREATE_NEW" as const, reason: sense.evidence.semanticIdentityReason };
    });
  }).sort((a, b) => a.masterSenseId.localeCompare(b.masterSenseId) || a.runtimeVocabularyId - b.runtimeVocabularyId);
}

// Version 2 hashes persisted, sanitized evidence, including semantic candidates.
// It can be independently replayed without live DB access or raw translations.
export function semanticAuditFingerprintPayload(input: {
  target: JsonObject; runtimeVocabularyInventory: unknown; masterMappings: unknown;
  schemaReferenceInventory: unknown; cleanupClassification: unknown; candidateAnalysis: unknown;
  ownerReviewedExclusions: unknown; hybridCheckpoint: unknown; repositoryBaseline: string;
}): JsonObject {
  const { target, repositoryBaseline, ...evidence } = input;
  return { ...Object.fromEntries(Object.entries(evidence).map(([key, value]) => [key, deterministicAuditFingerprint(value)])), repositoryBaseline, fingerprintVersion: 2, target: Object.fromEntries(
    ["environment", "provider", "projectId", "branchId", "databaseName", "roleName"].map((key) => [key, target[key]])
  ) };
}

export function readOwnerReviewedExclusions(root = ROOT) {
  const proposalPath = `${OWNER_REVIEW}/owner-reconciliation-proposal.json`;
  const finalizedPath = `${OWNER_REVIEW}/import/mappings/runtime-reconciliation-v2.json`;
  const authorizationPath = `${OWNER_REVIEW}/owner-authorization.json`;
  const proposal = readJsonFile(path.join(root, proposalPath));
  const finalized = readJsonFile(path.join(root, finalizedPath));
  const authorization = readJsonFile(path.join(root, authorizationPath));
  const proposalFingerprint = deterministicAuditFingerprint(proposal);
  const reconciliationHash = deterministicAuditFingerprint(finalized);
  if (proposalFingerprint !== "6033cb0d217578aeab7b7e3fb750fda0476c2b880e9958f3865992604b2be6c0" ||
      proposalFingerprint !== authorization.approvedProposalFingerprint || reconciliationHash !== EXPECTED_HYBRID_RECONCILIATION ||
      authorization.ownerAuthorizationStatus !== "APPROVED" || authorization.sourceSnapshotFingerprint !== finalized.snapshotFingerprint ||
      authorization.ownerAuthorizationFingerprint !== finalized.ownerAuthorizationFingerprint || finalized.owner !== "human-reviewed" ||
      finalized.analysisOnly !== false || finalized.acceptedByImporter !== true || finalized.sourceReleaseHash !== EXPECTED_HYBRID_RELEASE_HASH) throw new Error("OWNER_REVIEW_PACKAGE_PIN_MISMATCH");
  const exclusions = deriveOwnerReviewedExclusions(proposal as unknown as Parameters<typeof deriveOwnerReviewedExclusions>[0], finalized as unknown as Parameters<typeof deriveOwnerReviewedExclusions>[1]);
  return { artifactType: "OWNER_REVIEWED_LEGACY_SEMANTIC_EXCLUSIONS", artifactVersion: 1,
    sources: { proposalPath, finalizedPath, authorizationPath, proposalFingerprint, reconciliationHash }, exclusions };
}

export function applyOwnerReviewedExclusions(analysis: CandidateAnalysis, exclusions: OwnerReviewedExclusion[]): CandidateAnalysis {
  const reviewed = exclusions.filter((pair) => pair.runtimeVocabularyId === analysis.runtimeVocabularyId);
  if (!reviewed.length) return analysis;
  const bySense = new Map(analysis.candidates.map((candidate) => [candidate.masterSenseId, { ...candidate }]));
  for (const pair of reviewed) {
    const existing = bySense.get(pair.masterSenseId);
    bySense.set(pair.masterSenseId, { masterSenseId: pair.masterSenseId, masterLexemeId: pair.masterLexemeId,
      lemma: pair.lemma, partOfSpeech: pair.partOfSpeech, matchKind: existing?.matchKind ?? "OWNER_REVIEWED_CANDIDATE",
      identityClaim: "NONE", ownerReviewedRelation: "OWNER_REVIEWED_NOT_SAME_IDENTITY" });
  }
  const candidates = [...bySense.values()].sort((a, b) => a.masterSenseId.localeCompare(b.masterSenseId));
  return { ...analysis, candidates, automaticMappingCreated: false, reviewRequired: true,
    relation: candidates.every((candidate) => candidate.ownerReviewedRelation) ? "OWNER_REVIEWED_NOT_SAME_IDENTITY" : "MULTIPLE_MASTER_CANDIDATES",
    exclusionReason: "Finalized owner CREATE_NEW rejects reuse of the reviewed runtime/Master Sense pairs; lexical, alias and translation heuristics cannot override these decisions" };
}

export function analyzeLegacyCandidate(row: RuntimeRow & { vietnameseForAnalysis: string }, masterCorpus: MasterCandidate[], mappedBySense: Map<string, MappingRow>, mappedWordsById: Map<number, string>, exclusions = readOwnerReviewedExclusions().exclusions): CandidateAnalysis {
  const exact = masterCorpus.filter((candidate) => candidate.normalizedLemma === row.normalizedWord);
  const alias = masterCorpus.filter((candidate) => candidate.aliases.includes(row.normalizedWord));
  const translated = masterCorpus.filter((candidate) => candidate.translations.includes(normalizeWord(row.vietnameseForAnalysis)));
  const evidenceFor = (candidates: MasterCandidate[], kind: CandidateEvidence["matchKind"], identityClaim: CandidateEvidence["identityClaim"]): CandidateEvidence[] =>
    candidates.map((candidate) => ({ masterSenseId: candidate.masterSenseId, masterLexemeId: candidate.masterLexemeId, lemma: candidate.lemma, partOfSpeech: candidate.partOfSpeech, matchKind: kind, identityClaim }));
  let candidates = evidenceFor(exact, "EXACT_CANONICAL_LEMMA", "POSSIBLE");
  let relation: CandidateRelation = "NO_MASTER_CANDIDATE";
  let exclusionReason: string | undefined;
  if (exact.length > 1) {
    relation = "MULTIPLE_MASTER_CANDIDATES";
  } else if (exact.length === 1) {
    const exactCandidate = exact[0];
    const existing = exactCandidate ? mappedBySense.get(exactCandidate.masterSenseId) : undefined;
    if (existing && existing.runtimeVocabularyId !== row.runtimeVocabularyId) {
      relation = "EXISTING_MASTER_RUNTIME_DUPLICATE";
      exclusionReason = `Same Master Sense already maps to runtime #${existing.runtimeVocabularyId}; no mapping was created`;
    } else {
      const sameLemmaMappedToOtherSense = [...mappedWordsById.entries()].some(([runtimeId, word]) => runtimeId !== row.runtimeVocabularyId && normalizeWord(word) === row.normalizedWord);
      relation = sameLemmaMappedToOtherSense ? "HOMONYM_OR_POLYSEMY_CONFLICT" : "POSSIBLE_SAME_IDENTITY";
    }
  } else {
    const related = new Map<string, { candidate: MasterCandidate; kind: CandidateEvidence["matchKind"] }>();
    for (const candidate of alias) related.set(candidate.masterSenseId, { candidate, kind: "ALIAS_ONLY" });
    for (const candidate of translated) related.set(candidate.masterSenseId, { candidate, kind: "TRANSLATION_ONLY" });
    candidates = [...related.values()].map(({ candidate, kind }) => ({ masterSenseId: candidate.masterSenseId, masterLexemeId: candidate.masterLexemeId, lemma: candidate.lemma, partOfSpeech: candidate.partOfSpeech, matchKind: kind, identityClaim: "NONE" }));
    if (candidates.length === 1) relation = "SEMANTIC_RELATED_NOT_SAME_IDENTITY";
    else if (candidates.length > 1) relation = "MULTIPLE_MASTER_CANDIDATES";
  }
  return applyOwnerReviewedExclusions({ runtimeVocabularyId: row.runtimeVocabularyId, word: row.word, normalizedWord: row.normalizedWord, relation, candidates, automaticMappingCreated: false, reviewRequired: relation !== "NO_MASTER_CANDIDATE", ...(exclusionReason ? { exclusionReason } : {}) }, exclusions);
}

// vietnamese is kept only in the in-memory candidate-analysis input and is never serialized.
type RuntimeRowWithAnalysis = RuntimeRow & { vietnameseForAnalysis: string };

export function classifyRuntimeVocabulary(input: {
  rows: RuntimeRow[];
  candidates: CandidateAnalysis[];
  referenceInventoryComplete: boolean;
  hybridRuntimeIds: Set<number>;
}): ClassifiedRow[] {
  const candidateById = new Map(input.candidates.map((item) => [item.runtimeVocabularyId, item]));
  const out: ClassifiedRow[] = input.rows.map((row) => {
    const candidate = candidateById.get(row.runtimeVocabularyId);
    const relation = candidate?.relation ?? "NO_MASTER_CANDIDATE";
    const reasons: string[] = [];
    let cleanupClass: CleanupClass;
    if (row.topLevelPartition === "MAPPING_ANOMALY" || row.mappingAnomalyReasons.length > 0) {
      cleanupClass = "ANOMALY_REVIEW_REQUIRED";
      reasons.push(...row.mappingAnomalyReasons);
    } else if (row.topLevelPartition === "MASTER_MANAGED") {
      cleanupClass = "KEEP_MASTER_MANAGED";
      reasons.push("VALID_MASTER_MAPPING_PRESENT");
      if (input.hybridRuntimeIds.has(row.runtimeVocabularyId)) reasons.push("HYBRID_100_CURRENT_COHORT");
    } else if (!input.referenceInventoryComplete) {
      cleanupClass = "ANOMALY_REVIEW_REQUIRED";
      reasons.push("REFERENCE_INVENTORY_INCOMPLETE");
    } else if (row.hasAnyReference) {
      cleanupClass = "KEEP_REFERENCED_LEGACY";
      reasons.push("ONE_OR_MORE_DATABASE_OR_APPLICATION_REFERENCES");
      if (candidate?.reviewRequired) reasons.push("MASTER_CANDIDATE_REQUIRES_SEPARATE_IDENTITY_REVIEW");
      if (PRESERVED_RUNTIME_IDS.has(row.runtimeVocabularyId)) reasons.push("OWNER_PRESERVED_HISTORICAL_RUNTIME_ID");
    } else if (relation === "OWNER_REVIEWED_NOT_SAME_IDENTITY" || relation === "EXISTING_MASTER_RUNTIME_DUPLICATE" || relation === "HOMONYM_OR_POLYSEMY_CONFLICT" || relation === "MULTIPLE_MASTER_CANDIDATES" || relation === "SEMANTIC_RELATED_NOT_SAME_IDENTITY" || relation === "REVIEW_REQUIRED") {
      cleanupClass = "LEGACY_DUPLICATE_REVIEW";
      reasons.push("SEMANTIC_OR_IDENTITY_AMBIGUITY_REQUIRES_OWNER_REVIEW");
    } else if (relation === "POSSIBLE_SAME_IDENTITY") {
      cleanupClass = "LEGACY_MAPPING_REVIEW";
      reasons.push("EXACT_CANONICAL_LEMMA_CANDIDATE_REQUIRES_OWNER_REVIEW");
    } else if (PRESERVED_RUNTIME_IDS.has(row.runtimeVocabularyId) || row.sourceIdentityObligation || row.runtimeDependencyDetected) {
      cleanupClass = "DISABLE_CANDIDATE";
      reasons.push("PRESERVATION_SOURCE_IDENTITY_OR_RUNTIME_POLICY_REVIEW_REQUIRED");
    } else if (row.enabled) {
      cleanupClass = "DISABLE_CANDIDATE";
      reasons.push("CURRENTLY_ENABLED; HARD_DELETE_NOT_CONSIDERED");
    } else {
      cleanupClass = "DELETE_SAFE_CANDIDATE";
      reasons.push("ZERO_REFERENCES; NO_MASTER_OR_SEMANTIC_CANDIDATE; DISABLED; NO_SOURCE_OR_RUNTIME_OBLIGATION");
    }
    return { runtimeVocabularyId: row.runtimeVocabularyId, word: row.word, cleanupClass, topLevelPartition: row.topLevelPartition, candidateRelation: relation,
      referenceCount: row.totalReferenceCount, hasAnyReference: row.hasAnyReference, enabled: row.enabled,
      sourceIdentityObligation: row.sourceIdentityObligation, runtimeDependencyDetected: row.runtimeDependencyDetected, reasons };
  }).sort((a, b) => a.runtimeVocabularyId - b.runtimeVocabularyId);
  return out;
}

export function simulateDeleteImpact(input: {
  candidates: Array<{ runtimeVocabularyId: number; cleanupClass: CleanupClass }>;
  references: ReferenceDescriptor[];
  totalRuntimeRows: number;
}): JsonObject {
  const deleteRows = input.candidates.filter((row) => row.cleanupClass === "DELETE_SAFE_CANDIDATE");
  const deleteIds = new Set(deleteRows.map((row) => row.runtimeVocabularyId));
  const referenceImpact = input.references.map((reference) => ({ schema: reference.schema, table: reference.table, column: reference.column,
    affectedRows: Object.entries(reference.referenceCountByVocabularyId).filter(([id]) => deleteIds.has(Number(id))).reduce((sum, [, count]) => sum + count, 0) }));
  const affected = referenceImpact.reduce((sum, reference) => sum + reference.affectedRows, 0);
  if (affected !== 0) throw new Error("DELETE_SAFE_CLASSIFICATION_HAS_REFERENCES");
  return { hypotheticalRowsRemoved: deleteRows.length, remainingRuntimeRows: input.totalRuntimeRows - deleteRows.length,
    allDiscoveredReferencesAffected: affected, referenceImpactByTable: referenceImpact };
}

export function classifySnapshot(snapshot: Pick<AuditSnapshot, "target" | "runtimeRows" | "mappings" | "references" | "schemaInventory" | "masterCandidates" | "hybridSenseIds" | "hybridCheckpoint" | "repositoryBaseline">, referenceInventoryComplete: boolean): JsonObject {
  const mappedBySense = new Map(snapshot.mappings.map((mapping) => [mapping.masterSenseId, mapping]));
  const mappedWordsById = new Map(snapshot.runtimeRows.filter((row) => row.mappings.length > 0).map((row) => [row.runtimeVocabularyId, row.word]));
  const candidateRows = snapshot.runtimeRows.filter((row) => row.topLevelPartition === "LEGACY_UNMAPPED") as RuntimeRowWithAnalysis[];
  const ownerReviewedExclusions = readOwnerReviewedExclusions();
  const candidates = candidateRows.map((row) => analyzeLegacyCandidate(row, snapshot.masterCandidates, mappedBySense, mappedWordsById, ownerReviewedExclusions.exclusions));
  const hybridRuntimeIds = new Set(snapshot.mappings.filter((mapping) => snapshot.hybridSenseIds.has(mapping.masterSenseId)).map((mapping) => mapping.runtimeVocabularyId));
  const classifications = classifyRuntimeVocabulary({ rows: snapshot.runtimeRows, candidates, referenceInventoryComplete, hybridRuntimeIds });
  const classCounts = Object.fromEntries(CLEANUP_CLASSES.map((cleanupClass) => [cleanupClass, classifications.filter((row) => row.cleanupClass === cleanupClass).length]));
  const legacyRows = snapshot.runtimeRows.filter((row) => row.topLevelPartition === "LEGACY_UNMAPPED");
  const refCountFor = (row: RuntimeRow, table: string): number => snapshot.references
    .filter((reference) => `${reference.schema}.${reference.table}` === table)
    .reduce((sum, reference) => sum + (reference.referenceCountByVocabularyId[row.runtimeVocabularyId] ?? 0), 0);
  const countLegacyWith = (predicate: (row: RuntimeRow) => boolean) => legacyRows.filter(predicate).length;
  const deleteRows = classifications.filter((row) => row.cleanupClass === "DELETE_SAFE_CANDIDATE");
  const deleteSimulation = simulateDeleteImpact({ candidates: classifications, references: snapshot.references, totalRuntimeRows: snapshot.runtimeRows.length });
  const deleteImpact = {
    masterMappingsAffected: deleteRows.reduce((sum, row) => sum + refCountFor(snapshot.runtimeRows.find((runtime) => runtime.runtimeVocabularyId === row.runtimeVocabularyId)!, "vocabflow_app.master_vocabulary_mappings"), 0),
    learnerProgressAffected: deleteRows.reduce((sum, row) => sum + refCountFor(snapshot.runtimeRows.find((runtime) => runtime.runtimeVocabularyId === row.runtimeVocabularyId)!, "vocabflow_app.learner_progress"), 0),
    reviewEventsAffected: deleteRows.reduce((sum, row) => sum + refCountFor(snapshot.runtimeRows.find((runtime) => runtime.runtimeVocabularyId === row.runtimeVocabularyId)!, "vocabflow_app.review_events"), 0),
    otherReferencesAffected: (deleteSimulation.referenceImpactByTable as Array<{ table: string; affectedRows: number }>).filter((reference) => !["master_vocabulary_mappings", "learner_progress", "review_events"].includes(reference.table)).reduce((sum, reference) => sum + reference.affectedRows, 0),
    ...deleteSimulation
  };
  if (Number(deleteSimulation.allDiscoveredReferencesAffected) !== 0) throw new Error("DELETE_SAFE_CLASSIFICATION_HAS_REFERENCES");
  const disableRows = classifications.filter((row) => row.cleanupClass === "DISABLE_CANDIDATE");
  const disableIdSet = new Set(disableRows.map((row) => row.runtimeVocabularyId));
  const disableReferenceCount = snapshot.runtimeRows.filter((row) => disableIdSet.has(row.runtimeVocabularyId)).reduce((sum, row) => sum + row.totalReferenceCount, 0);
  const apiFilterEvidence = { vocabularyCatalogEnabledFilter: true, learnerVocabularyCatalogEnabledFilter: true, studyQueueEnabledFilter: true };
  const disableImpact = {
    rows: disableRows.length,
    currentlyEnabledRows: disableRows.filter((row) => row.enabled).length,
    aggregateReferenceCount: disableReferenceCount,
    referencedRows: disableRows.filter((row) => row.referenceCount > 0).length,
    existingApiCatalogWouldHideDisabledRows: apiFilterEvidence,
    historyWouldRemainQueryable: disableReferenceCount === 0 ? "NO_REFERENCED_HISTORY_PRESENT" : "POLICY_REVIEW_REQUIRED; STORAGE_REMAINS_BUT_API_ACCESS_WAS_NOT_PROVEN",
    status: disableReferenceCount > 0 || disableRows.some((row) => row.sourceIdentityObligation || PRESERVED_RUNTIME_IDS.has(row.runtimeVocabularyId)) ? "DISABLE_POLICY_REVIEW_REQUIRED" : "AUDIT_ONLY_NO_MUTATION"
  };
  const partitionCounts = {
    MASTER_MANAGED: snapshot.runtimeRows.filter((row) => row.topLevelPartition === "MASTER_MANAGED").length,
    LEGACY_UNMAPPED: snapshot.runtimeRows.filter((row) => row.topLevelPartition === "LEGACY_UNMAPPED").length,
    MAPPING_ANOMALY: snapshot.runtimeRows.filter((row) => row.topLevelPartition === "MAPPING_ANOMALY").length
  };
  const namedReferenceTables = {
    learnerProgress: "vocabflow_app.learner_progress",
    reviewEvents: "vocabflow_app.review_events",
    savedVocabulary: "vocabflow_app.learner_saved_vocabulary",
    favorites: "NOT_PRESENT",
    topicMembership: "vocabflow_app.vocabulary_topics",
    learningSetItems: "vocabflow_app.learning_set_items"
  };
  const legacyReferences = {
    withLearnerProgress: countLegacyWith((row) => refCountFor(row, namedReferenceTables.learnerProgress) > 0),
    withReviewEvents: countLegacyWith((row) => refCountFor(row, namedReferenceTables.reviewEvents) > 0),
    withFavoriteOrSaveReferences: countLegacyWith((row) => refCountFor(row, namedReferenceTables.savedVocabulary) > 0),
    favoriteReferenceCount: "NOT_PRESENT",
    savedWordReferenceCount: legacyRows.reduce((sum, row) => sum + refCountFor(row, namedReferenceTables.savedVocabulary), 0),
    withTopicOrSetReferences: countLegacyWith((row) => refCountFor(row, namedReferenceTables.topicMembership) + refCountFor(row, namedReferenceTables.learningSetItems) > 0),
    withAnyReference: countLegacyWith((row) => row.hasAnyReference),
    zeroReference: countLegacyWith((row) => !row.hasAnyReference),
    learnerProgressReferenceTotal: legacyRows.reduce((sum, row) => sum + refCountFor(row, namedReferenceTables.learnerProgress), 0),
    reviewEventReferenceTotal: legacyRows.reduce((sum, row) => sum + refCountFor(row, namedReferenceTables.reviewEvents), 0),
    savedWordReferenceTotal: legacyRows.reduce((sum, row) => sum + refCountFor(row, namedReferenceTables.savedVocabulary), 0),
    topicMembershipReferenceTotal: legacyRows.reduce((sum, row) => sum + refCountFor(row, namedReferenceTables.topicMembership), 0),
    learningSetItemReferenceTotal: legacyRows.reduce((sum, row) => sum + refCountFor(row, namedReferenceTables.learningSetItems), 0)
  };
  const runtime11 = snapshot.runtimeRows.find((row) => row.runtimeVocabularyId === 11);
  const runtime284 = snapshot.runtimeRows.find((row) => row.runtimeVocabularyId === 284);
  const hybrid = snapshot.hybridCheckpoint;
  const unsafeMapping = runtime284?.mappings.length !== 1 || runtime284.mappings[0]?.masterSenseId !== hybrid.expectedBookingMasterSenseId;
  const runtime11History = { progress: refCountFor(runtime11 ?? ({} as RuntimeRow), namedReferenceTables.learnerProgress), reviews: refCountFor(runtime11 ?? ({} as RuntimeRow), namedReferenceTables.reviewEvents) };
  if (runtime11History.progress !== 1 || runtime11History.reviews !== 5) throw new Error("RUNTIME_11_HISTORY_PRESERVATION_FAILED");
  if (unsafeMapping || classifications.find((row) => row.runtimeVocabularyId === 284)?.cleanupClass !== "KEEP_MASTER_MANAGED") throw new Error("RUNTIME_284_BOOKING_MAPPING_CHANGED");
  if (partitionCounts.MASTER_MANAGED + partitionCounts.LEGACY_UNMAPPED + partitionCounts.MAPPING_ANOMALY !== snapshot.runtimeRows.length) throw new Error("RUNTIME_PARTITION_NOT_EXHAUSTIVE");
  if (classifications.length !== snapshot.runtimeRows.length || new Set(classifications.map((row) => row.runtimeVocabularyId)).size !== snapshot.runtimeRows.length) throw new Error("CLEANUP_CLASSIFICATION_NOT_EXACTLY_ONCE");
  if (classCounts.KEEP_MASTER_MANAGED !== partitionCounts.MASTER_MANAGED) throw new Error("MASTER_MANAGED_CLASSIFICATION_MISMATCH");
  if (hybrid.status !== "VERIFIED") throw new Error("HYBRID_100_STATE_BLOCKED");
  const fingerprintPayload = semanticAuditFingerprintPayload({
    target: snapshot.target,
    runtimeVocabularyInventory: sanitizeRuntimeRows(snapshot.runtimeRows),
    masterMappings: snapshot.mappings,
    schemaReferenceInventory: snapshot.schemaInventory,
    cleanupClassification: classifications,
    candidateAnalysis: candidates,
    ownerReviewedExclusions,
    hybridCheckpoint: hybrid,
    repositoryBaseline: snapshot.repositoryBaseline
  });
  return {
    partitionCounts,
    cleanupClassCounts: classCounts,
    classifications,
    candidateAnalysis: candidates,
    ownerReviewedExclusions,
    legacyReferenceCounts: legacyReferences,
    deleteImpact,
    disableImpact,
    runtime11History,
    runtime284: { mappingStatus: "UNCHANGED", masterSenseId: runtime284?.mappings[0]?.masterSenseId ?? null },
    hybridCheckpoint: hybrid,
    legacyAuditSnapshotFingerprint: deterministicAuditFingerprint(fingerprintPayload),
    fingerprintPayload
  };
}

function quoteIdentifier(value: string): string { return `"${value.replaceAll('"', '""')}"`; }
function safeNumber(value: unknown): number { const number = Number(value); return Number.isFinite(number) ? number : 0; }
function actionName(value: string): string { return ({ a: "NO ACTION", r: "RESTRICT", c: "CASCADE", n: "SET NULL", d: "SET DEFAULT" } as Record<string, string>)[value] ?? "UNKNOWN"; }

const FK_INVENTORY_SQL = `
SELECT child_ns.nspname AS schema_name, child_rel.relname AS table_name,
       child_att.attname AS column_name, fk.conname AS constraint_name,
       fk.confdeltype::text AS delete_action, fk.confupdtype::text AS update_action,
       fk.convalidated AS validated, parent_att.attname AS referenced_column,
       format_type(child_att.atttypid, child_att.atttypmod) AS column_type,
       has_table_privilege(current_user, child_rel.oid, 'SELECT') AS can_select
FROM pg_constraint AS fk
JOIN pg_class AS child_rel ON child_rel.oid = fk.conrelid
JOIN pg_namespace AS child_ns ON child_ns.oid = child_rel.relnamespace
JOIN pg_class AS parent_rel ON parent_rel.oid = fk.confrelid
JOIN pg_namespace AS parent_ns ON parent_ns.oid = parent_rel.relnamespace
JOIN LATERAL unnest(fk.conkey) WITH ORDINALITY AS child_key(attnum, ordinality) ON true
JOIN LATERAL unnest(fk.confkey) WITH ORDINALITY AS parent_key(attnum, ordinality) ON parent_key.ordinality = child_key.ordinality
JOIN pg_attribute AS child_att ON child_att.attrelid = child_rel.oid AND child_att.attnum = child_key.attnum
JOIN pg_attribute AS parent_att ON parent_att.attrelid = parent_rel.oid AND parent_att.attnum = parent_key.attnum
WHERE fk.contype = 'f' AND parent_ns.nspname = 'vocabflow_app' AND parent_rel.relname = 'vocabularies'
ORDER BY child_ns.nspname, child_rel.relname, child_att.attname, fk.conname`;

const APP_COLUMN_INVENTORY_SQL = `
SELECT n.nspname AS schema_name, c.relname AS table_name, a.attname AS column_name,
       format_type(a.atttypid, a.atttypmod) AS column_type,
       has_table_privilege(current_user, c.oid, 'SELECT') AS can_select
FROM pg_class AS c
JOIN pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_attribute AS a ON a.attrelid = c.oid
WHERE c.relkind IN ('r', 'p') AND a.attnum > 0 AND NOT a.attisdropped
  AND (a.attname = ANY(ARRAY['vocabulary_id','runtime_vocabulary_id','app_vocabulary_id']::text[])
       OR a.attname ILIKE '%vocab%id%' OR a.attname ILIKE '%word%id%')
  AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%'
ORDER BY n.nspname, c.relname, a.attname`;

function filesUnder(directory: string, suffix: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(absolute, suffix) : entry.isFile() && entry.name.endsWith(suffix) ? [absolute] : [];
  }).sort();
}

export function directTablesWithoutRuntimeCode(tables: string[], evidenceByTable: Record<string, string[]>): string[] {
  return tables.filter((table) => (evidenceByTable[table] ?? []).length === 0).sort();
}

function deriveRepositoryCrossCheck(root: string, databaseForeignKeys: ReferenceDescriptor[]): JsonObject {
  const schemaPath = path.join(root, "apps/api/src/db/schema.ts");
  const schemaSource = readFileSync(schemaPath, "utf8");
  const schemaDirectTables: string[] = [];
  const tableBlock = /export const (\w+)\s*=\s*vocabflowApp\.table\("([^"]+)"[\s\S]*?(?=\nexport const |$)/g;
  for (const match of schemaSource.matchAll(tableBlock)) if (match[1] && match[2] && match[0].includes(".references(() => vocabularies.id")) schemaDirectTables.push(match[2]);
  const migrations = filesUnder(path.join(root, "drizzle/migrations"), ".sql");
  const migrationDirectTables = new Set<string>();
  const migrationEvidence: string[] = [];
  const directRef = /ALTER TABLE\s+"vocabflow_app"\."([^"]+)"\s+ADD CONSTRAINT\s+"([^"]+)"\s+FOREIGN KEY\s+\("([^"]+)"\)\s+REFERENCES\s+"vocabflow_app"\."vocabularies"\("id"\)/gim;
  for (const file of migrations) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(directRef)) if (match[1] && match[2]) { migrationDirectTables.add(match[1]); migrationEvidence.push(`${path.relative(root, file).replaceAll("\\", "/")}#${match[2]}`); }
  }
  const appSourceFiles = filesUnder(path.join(root, "apps/api/src"), ".ts").filter((file) => !file.endsWith(".test.ts"));
  const toolSourceFiles = filesUnder(path.join(root, "scripts"), ".ts").filter((file) => !file.endsWith(".test.ts"));
  const runtimeCodeEvidence: Record<string, string[]> = {};
  const toolingCodeEvidence: Record<string, string[]> = {};
  for (const fk of databaseForeignKeys) {
    const qualified = fk.table;
    runtimeCodeEvidence[qualified] = appSourceFiles.filter((file) => readFileSync(file, "utf8").includes(qualified)).map((file) => path.relative(root, file).replaceAll("\\", "/"));
    toolingCodeEvidence[qualified] = toolSourceFiles.filter((file) => readFileSync(file, "utf8").includes(qualified)).map((file) => path.relative(root, file).replaceAll("\\", "/"));
  }
  const dbDirectTables = new Set(databaseForeignKeys.filter((fk) => fk.foreignKeys.some((foreignKey) => foreignKey.referencedColumn === "id")).map((fk) => fk.table));
  const schemaMatches = [...dbDirectTables].every((table) => schemaDirectTables.includes(table));
  const migrationMatches = [...dbDirectTables].every((table) => migrationDirectTables.has(table));
  const referenceTablesWithoutRuntimeCode = directTablesWithoutRuntimeCode([...dbDirectTables], runtimeCodeEvidence);
  return {
    drizzleSchema: { file: "apps/api/src/db/schema.ts", directVocabularyForeignKeyTables: [...new Set(schemaDirectTables)].sort(), databaseForeignKeyTablesCovered: schemaMatches },
    migrations: { directory: "drizzle/migrations", directVocabularyForeignKeyTables: [...migrationDirectTables].sort(), evidence: migrationEvidence.sort(), databaseForeignKeyTablesCovered: migrationMatches },
    runtimeCode: { source: "apps/api/src", evidenceByTable: runtimeCodeEvidence, directTablesWithoutRuntimeCode: referenceTablesWithoutRuntimeCode },
    toolingCode: { source: "scripts", evidenceByTable: toolingCodeEvidence },
    databaseCatalogIsPrimaryTruth: true
  };
}

async function queryJson<T extends Record<string, unknown>>(tx: ReturnType<typeof postgres>, sqlText: string, params?: unknown[]): Promise<T[]> {
  assertReadOnlySql(sqlText);
  return await tx.unsafe<T[]>(sqlText, params as never[] | undefined) as T[];
}

export async function captureDatabaseSnapshot(tx: ReturnType<typeof postgres>, target: ReturnType<typeof getTarget>, masterSource: ReturnType<typeof readApprovedMasterCorpus>): Promise<AuditSnapshot> {
  const transactionModeSql = "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY";
  assertReadOnlySql(transactionModeSql);
  await tx.unsafe(transactionModeSql);
  const [session] = await queryJson<{
    current_role: string; session_user: string; database_name: string; transaction_read_only: boolean; transaction_isolation: string;
  }>(tx, "SELECT current_user AS current_role, session_user AS session_user, current_database() AS database_name, current_setting('transaction_read_only') = 'on' AS transaction_read_only, current_setting('transaction_isolation') AS transaction_isolation");
  if (session?.current_role !== "vocabflow_runtime" || session.session_user !== "vocabflow_runtime" || session.database_name !== "neondb" || !session.transaction_read_only || session.transaction_isolation !== "repeatable read") throw new Error("READ_ONLY_DEVELOPMENT_TRANSACTION_IDENTITY_FAILED");
  const identityRows = await queryJson<{
    environment: string; provider: string; project_id: string; branch_id: string; identity_version: number;
  }>(tx, `SELECT environment, provider, project_id, branch_id, identity_version FROM "vocabflow_meta"."environment_identity" ORDER BY id`);
  if (identityRows.length !== 1 || identityRows[0]?.environment !== "development" || identityRows[0]?.provider !== "neon" || identityRows[0]?.project_id !== target.projectId || identityRows[0]?.branch_id !== target.branchId || identityRows[0]?.identity_version !== 1) throw new Error("DATABASE_IDENTITY_MISMATCH");
  const identity = identityRows[0]!;

  const fkRows = await queryJson<Record<string, unknown>>(tx, FK_INVENTORY_SQL);
  const appColumns = await queryJson<Record<string, unknown>>(tx, APP_COLUMN_INVENTORY_SQL);
  type MutableRef = Omit<ReferenceDescriptor, "referenceCountByVocabularyId">;
  const descriptors = new Map<string, MutableRef>();
  for (const row of fkRows) {
    const schema = String(row.schema_name); const table = String(row.table_name); const column = String(row.column_name);
    const key = `${schema}.${table}.${column}`;
    const current = descriptors.get(key) ?? { schema, table, column, columnType: String(row.column_type), applicationLevel: false, foreignKeys: [], canSelect: row.can_select === true };
    current.canSelect = current.canSelect && row.can_select === true;
    current.foreignKeys.push({ constraint: String(row.constraint_name), deleteAction: actionName(String(row.delete_action)), updateAction: actionName(String(row.update_action)), validated: row.validated === true, referencedColumn: String(row.referenced_column) });
    descriptors.set(key, current);
  }
  for (const row of appColumns) {
    const schema = String(row.schema_name); const table = String(row.table_name); const column = String(row.column_name);
    const key = `${schema}.${table}.${column}`;
    const current = descriptors.get(key) ?? { schema, table, column, columnType: String(row.column_type), applicationLevel: true, foreignKeys: [], canSelect: row.can_select === true };
    current.applicationLevel = current.applicationLevel || current.foreignKeys.length === 0;
    current.canSelect = current.canSelect && row.can_select === true;
    descriptors.set(key, current);
  }
  const referenceDescriptors = [...descriptors.values()].sort((a, b) => `${a.schema}.${a.table}.${a.column}`.localeCompare(`${b.schema}.${b.table}.${b.column}`));
  if (referenceDescriptors.some((descriptor) => !descriptor.canSelect)) throw new Error("REFERENCE_TABLE_SELECT_PRIVILEGE_MISSING");

  const runtimeDbRows = await queryJson<Record<string, unknown>>(tx,
    `SELECT id AS runtime_vocabulary_id, word, enabled, content_version, source_dataset, source_record_id, vietnamese FROM "vocabflow_app"."vocabularies" ORDER BY id`);
  const ids = runtimeDbRows.map((row) => safeNumber(row.runtime_vocabulary_id));
  const idStrings = ids.map(String);
  const [historyTotalsRow] = await queryJson<{ learner_progress_rows: string; review_event_rows: string }>(tx,
    `SELECT (SELECT count(*)::text FROM "vocabflow_app"."learner_progress") AS learner_progress_rows, (SELECT count(*)::text FROM "vocabflow_app"."review_events") AS review_event_rows`);
  const historyTotals = { learnerProgressRows: safeNumber(historyTotalsRow?.learner_progress_rows), reviewEventRows: safeNumber(historyTotalsRow?.review_event_rows) };
  const countsByRelation = new Map<string, Record<number, number>>();
  for (const descriptor of referenceDescriptors) {
    const relationKey = `${descriptor.schema}.${descriptor.table}.${descriptor.column}`;
    const query = `SELECT ${quoteIdentifier(descriptor.column)}::text AS vocabulary_id, count(*)::text AS reference_count FROM ${quoteIdentifier(descriptor.schema)}.${quoteIdentifier(descriptor.table)} WHERE ${quoteIdentifier(descriptor.column)}::text = ANY($1::text[]) GROUP BY ${quoteIdentifier(descriptor.column)}::text`;
    const rows = await queryJson<{ vocabulary_id: string; reference_count: string }>(tx, query, [idStrings]);
    const counts: Record<number, number> = {};
    for (const row of rows) counts[Number(row.vocabulary_id)] = safeNumber(row.reference_count);
    countsByRelation.set(relationKey, counts);
  }
  const mappingDbRows = await queryJson<Record<string, unknown>>(tx, `SELECT master_sense_id, master_lexeme_id, vocabulary_id AS runtime_vocabulary_id, source_dataset_id, source_dataset_version, source_schema_version, projection_contract_version, applied_projection_fingerprint, applied_lexeme_revision, applied_sense_revision, last_release_hash, last_import_run_id FROM "vocabflow_app"."master_vocabulary_mappings" ORDER BY master_sense_id, vocabulary_id`);
  const mappings: MappingRow[] = mappingDbRows.map((row) => ({ masterSenseId: String(row.master_sense_id), masterLexemeId: String(row.master_lexeme_id), runtimeVocabularyId: safeNumber(row.runtime_vocabulary_id), sourceDatasetId: String(row.source_dataset_id), sourceDatasetVersion: String(row.source_dataset_version), sourceSchemaVersion: String(row.source_schema_version), projectionContractVersion: String(row.projection_contract_version), appliedProjectionFingerprint: String(row.applied_projection_fingerprint), appliedLexemeRevision: safeNumber(row.applied_lexeme_revision), appliedSenseRevision: safeNumber(row.applied_sense_revision), lastReleaseHash: String(row.last_release_hash), lastImportRunId: String(row.last_import_run_id) }));
  const importRunDbRows = await queryJson<Record<string, unknown>>(tx, `SELECT id, dataset_id, dataset_version, schema_version, projection_contract_version, release_hash, reconciliation_hash, plan_fingerprint, environment, target_branch_id FROM "vocabflow_app"."master_vocabulary_import_runs" ORDER BY id`);
  const importRuns: ImportRunRow[] = importRunDbRows.map((row) => ({ id: String(row.id), datasetId: String(row.dataset_id), datasetVersion: String(row.dataset_version), schemaVersion: String(row.schema_version), projectionContractVersion: String(row.projection_contract_version), releaseHash: String(row.release_hash), reconciliationHash: String(row.reconciliation_hash), planFingerprint: String(row.plan_fingerprint), environment: String(row.environment), targetBranchId: String(row.target_branch_id) }));
  const runById = new Map(importRuns.map((run) => [run.id, run]));
  const runtimeIds = new Set(ids);
  const approvedMasterBySense = new Map(masterSource.candidates.map((candidate) => [candidate.masterSenseId, candidate]));
  const mappingsByRuntime = new Map<number, MappingRow[]>();
  for (const mapping of mappings) mappingsByRuntime.set(mapping.runtimeVocabularyId, [...(mappingsByRuntime.get(mapping.runtimeVocabularyId) ?? []), mapping]);
  const mappingReasonsByRuntime = new Map<number, string[]>();
  const addMappingReason = (runtimeId: number, reason: string) => mappingReasonsByRuntime.set(runtimeId, [...(mappingReasonsByRuntime.get(runtimeId) ?? []), reason]);
  const seenSense = new Set<string>();
  for (const mapping of mappings) {
    if (!runtimeIds.has(mapping.runtimeVocabularyId)) continue;
    const reasons: string[] = [];
    if (seenSense.has(mapping.masterSenseId)) reasons.push("DUPLICATE_MASTER_SENSE_ID");
    seenSense.add(mapping.masterSenseId);
    if (!/^[0-9a-f-]{36}$/i.test(mapping.masterSenseId) || !/^[0-9a-f-]{36}$/i.test(mapping.masterLexemeId) || !/^[0-9a-f-]{36}$/i.test(mapping.sourceDatasetId)) reasons.push("INVALID_MAPPING_UUID");
    if (!/^[0-9a-f]{64}$/.test(mapping.appliedProjectionFingerprint) || !/^[0-9a-f]{64}$/.test(mapping.lastReleaseHash)) reasons.push("INVALID_MAPPING_FINGERPRINT");
    if (mapping.appliedLexemeRevision < 1 || mapping.appliedSenseRevision < 1) reasons.push("INVALID_MAPPING_REVISION");
    const approvedSense = approvedMasterBySense.get(mapping.masterSenseId);
    if (!approvedSense) reasons.push("MASTER_SENSE_NOT_IN_CURRENT_APPROVED_CORPUS");
    else if (approvedSense.masterLexemeId !== mapping.masterLexemeId) reasons.push("MASTER_SENSE_LEXEME_IDENTITY_MISMATCH");
    const run = runById.get(mapping.lastImportRunId);
    if (!run || run.datasetId !== mapping.sourceDatasetId || run.datasetVersion !== mapping.sourceDatasetVersion || run.schemaVersion !== mapping.sourceSchemaVersion || run.projectionContractVersion !== mapping.projectionContractVersion || run.releaseHash !== mapping.lastReleaseHash) reasons.push("IMPORT_RUN_METADATA_MISMATCH");
    if (run && (run.environment !== "development" || run.targetBranchId !== target.branchId)) reasons.push("MAPPING_IMPORT_RUN_TARGET_MISMATCH");
    if (reasons.length) for (const reason of reasons) addMappingReason(mapping.runtimeVocabularyId, reason);
  }
  for (const [runtimeId, rows] of mappingsByRuntime) if (rows.length > 1) addMappingReason(runtimeId, "MULTIPLE_MASTER_IDENTITIES_CLAIM_RUNTIME_ROW");
  const orphanMappings = mappings.filter((mapping) => !runtimeIds.has(mapping.runtimeVocabularyId));

  const references: ReferenceDescriptor[] = referenceDescriptors.map((descriptor) => ({ ...descriptor, foreignKeys: descriptor.foreignKeys.sort((a, b) => a.constraint.localeCompare(b.constraint)), referenceCountByVocabularyId: countsByRelation.get(`${descriptor.schema}.${descriptor.table}.${descriptor.column}`) ?? {} }));
  const referenceCountsByRuntime = new Map<number, Record<string, number>>();
  for (const runtimeId of ids) {
    const rowCounts: Record<string, number> = {};
    for (const reference of references) rowCounts[`${reference.schema}.${reference.table}.${reference.column}`] = reference.referenceCountByVocabularyId[runtimeId] ?? 0;
    referenceCountsByRuntime.set(runtimeId, rowCounts);
  }
  const duplicateSourceIdentities = new Set<number>();
  const sourceKeyCounts = new Map<string, number>();
  for (const row of runtimeDbRows) {
    const sourceDataset = typeof row.source_dataset === "string" ? row.source_dataset : null;
    const sourceRecordId = row.source_record_id === null ? null : safeNumber(row.source_record_id);
    if (sourceDataset !== null && sourceRecordId !== null) {
      const key = `${sourceDataset}\u0000${sourceRecordId}`;
      sourceKeyCounts.set(key, (sourceKeyCounts.get(key) ?? 0) + 1);
    }
  }
  for (const row of runtimeDbRows) {
    const sourceDataset = typeof row.source_dataset === "string" ? row.source_dataset : null;
    const sourceRecordId = row.source_record_id === null ? null : safeNumber(row.source_record_id);
    const key = sourceDataset !== null && sourceRecordId !== null ? `${sourceDataset}\u0000${sourceRecordId}` : "";
    if (key && (sourceKeyCounts.get(key) ?? 0) > 1) duplicateSourceIdentities.add(safeNumber(row.runtime_vocabulary_id));
  }
  const runtimeRows: RuntimeRowWithAnalysis[] = runtimeDbRows.map((row) => {
    const runtimeVocabularyId = safeNumber(row.runtime_vocabulary_id);
    const mappingsForRow = mappingsByRuntime.get(runtimeVocabularyId) ?? [];
    const referenceCounts = referenceCountsByRuntime.get(runtimeVocabularyId) ?? {};
    const totalReferenceCount = Object.values(referenceCounts).reduce((sum, count) => sum + count, 0);
    const applicationReferenceCount = references.filter((reference) => reference.applicationLevel).reduce((sum, reference) => sum + (reference.referenceCountByVocabularyId[runtimeVocabularyId] ?? 0), 0);
    const sourceDataset = typeof row.source_dataset === "string" ? row.source_dataset : null;
    const sourceRecordId = row.source_record_id === null ? null : safeNumber(row.source_record_id);
    const reasons = [...new Set(mappingReasonsByRuntime.get(runtimeVocabularyId) ?? [])];
    if ((sourceDataset === null) !== (sourceRecordId === null)) reasons.push("PARTIAL_SOURCE_IDENTITY");
    if (duplicateSourceIdentities.has(runtimeVocabularyId)) reasons.push("DUPLICATE_SOURCE_IDENTITY");
    const topLevelPartition: RuntimeRow["topLevelPartition"] = reasons.length > 0 ? "MAPPING_ANOMALY" : mappingsForRow.length > 0 ? "MASTER_MANAGED" : "LEGACY_UNMAPPED";
    return {
      runtimeVocabularyId,
      word: String(row.word),
      normalizedWord: normalizeWord(row.word),
      enabled: row.enabled === true,
      contentVersion: safeNumber(row.content_version),
      sourceDataset,
      sourceRecordId,
      mappings: mappingsForRow,
      referenceCounts,
      totalReferenceCount,
      hasAnyReference: totalReferenceCount > 0,
      applicationReferenceCount,
      sourceIdentityObligation: sourceDataset !== null || sourceRecordId !== null,
      runtimeDependencyDetected: row.enabled === true,
      topLevelPartition,
      mappingAnomalyReasons: reasons,
      vietnameseForAnalysis: String(row.vietnamese ?? "")
    };
  });
  const run = runById.get(EXPECTED_HYBRID_RUN_ID);
  const matchingRuns = importRuns.filter((item) => item.id === EXPECTED_HYBRID_RUN_ID && item.environment === "development" && item.targetBranchId === target.branchId && item.releaseHash === EXPECTED_HYBRID_RELEASE_HASH && item.reconciliationHash === EXPECTED_HYBRID_RECONCILIATION && item.planFingerprint === EXPECTED_HYBRID_PLAN);
  const hybridMappings = mappings.filter((mapping) => masterSource.hybridSenseIds.has(mapping.masterSenseId));
  const runtimeById = new Map(runtimeRows.map((row) => [row.runtimeVocabularyId, row]));
  const hybridMappingProblems: string[] = [];
  if (matchingRuns.length !== 1 || !run) hybridMappingProblems.push("MATCHING_IMPORT_RUN_COUNT_NOT_ONE");
  if (hybridMappings.length !== EXPECTED_HYBRID_SENSE_COUNT || new Set(hybridMappings.map((mapping) => mapping.masterSenseId)).size !== EXPECTED_HYBRID_SENSE_COUNT) hybridMappingProblems.push("HYBRID_MAPPING_COUNT_OR_IDENTITY_MISMATCH");
  if (hybridMappings.some((mapping) => mapping.lastImportRunId !== EXPECTED_HYBRID_RUN_ID || mapping.lastReleaseHash !== EXPECTED_HYBRID_RELEASE_HASH || mapping.sourceDatasetVersion !== "2.2.1")) hybridMappingProblems.push("HYBRID_MAPPING_RELEASE_METADATA_MISMATCH");
  if (hybridMappings.some((mapping) => approvedMasterBySense.get(mapping.masterSenseId)?.masterLexemeId !== mapping.masterLexemeId)) hybridMappingProblems.push("HYBRID_MASTER_SENSE_LEXEME_IDENTITY_MISMATCH");
  const hybridRows = hybridMappings.map((mapping) => runtimeById.get(mapping.runtimeVocabularyId)).filter((row): row is RuntimeRowWithAnalysis => Boolean(row));
  if (hybridRows.length !== EXPECTED_HYBRID_SENSE_COUNT) hybridMappingProblems.push("HYBRID_MAPPING_RUNTIME_ROW_MISSING");
  if (hybridMappings.some((mapping) => {
    const runtime = runtimeById.get(mapping.runtimeVocabularyId);
    const master = approvedMasterBySense.get(mapping.masterSenseId);
    return !runtime || !master || runtime.normalizedWord !== master.normalizedLemma;
  })) hybridMappingProblems.push("HYBRID_RUNTIME_LEMMA_PROJECTION_MISMATCH");
  if (hybridRows.filter((row) => row.contentVersion === 1).length !== 97 || hybridRows.filter((row) => row.contentVersion === 2).length !== 3) hybridMappingProblems.push("HYBRID_CONTENT_VERSION_COUNTS_MISMATCH");
  const hybridExpectedWords = new Map([["deviate", 1836], ["stand", 948]]);
  for (const [word, runtimeId] of hybridExpectedWords) {
    const found = hybridRows.filter((row) => normalizeWord(row.word) === normalizeWord(word));
    if (found.length !== 1 || found[0]?.runtimeVocabularyId !== runtimeId || found[0]?.contentVersion !== 2) hybridMappingProblems.push(`HYBRID_REUSED_ROW_MISMATCH:${word}`);
  }
  const painReliefRuntime = hybridRows.find((row) => row.runtimeVocabularyId === 1461);
  const painReliefMapping = hybridMappings.find((mapping) => mapping.runtimeVocabularyId === 1461);
  if (!painReliefRuntime || painReliefRuntime.contentVersion !== 2 || normalizeWord(approvedMasterBySense.get(painReliefMapping?.masterSenseId ?? "")?.normalizedLemma) !== "relief") hybridMappingProblems.push("HYBRID_REUSED_ROW_MISMATCH:pain-relief");
  const hybridRuntimeIds = new Set(hybridRows.map((row) => row.runtimeVocabularyId));
  const expectedBookingMasterSenseId = findCanaryBookingSenseId(ROOT);
  const runtime284Mappings = mappings.filter((mapping) => mapping.runtimeVocabularyId === 284);
  const hybridCheckpoint = {
    status: hybridMappingProblems.length === 0 && runtime284Mappings.length === 1 && runtime284Mappings[0]?.masterSenseId === expectedBookingMasterSenseId ? "VERIFIED" : "BLOCKED",
    referencePostApplySnapshot: EXPECTED_POST_APPLY_SNAPSHOT,
    currentSnapshotComparison: historyTotals.learnerProgressRows === 87 && historyTotals.reviewEventRows === 229
      ? "COMPATIBLE_ON_PINNED_HYBRID_COHORT_AND_KNOWN_HISTORY_TOTALS; full historical scanner fingerprint is not recomputed under the runtime-role-only boundary"
      : `SNAPSHOT_DRIFT_ON_KNOWN_HISTORY_TOTALS; learnerProgressRows=${historyTotals.learnerProgressRows} (reference 87), reviewEventRows=${historyTotals.reviewEventRows} (reference 229); Hybrid mappings separately verified`,
    currentLearnerProgressRows: historyTotals.learnerProgressRows,
    currentReviewEventRows: historyTotals.reviewEventRows,
    referenceLearnerProgressRows: 87,
    referenceReviewEventRows: 229,
    matchingImportRuns: matchingRuns.length,
    hybridMasterMappings: hybridMappings.length,
    newlyCreatedRuntimeRows: hybridRows.filter((row) => ![1836, 1461, 948].includes(row.runtimeVocabularyId)).length,
    reusedRuntimeRows: [1836, 1461, 948].filter((runtimeId) => hybridRuntimeIds.has(runtimeId)).length,
    contentVersion1: hybridRows.filter((row) => row.contentVersion === 1).length,
    contentVersion2: hybridRows.filter((row) => row.contentVersion === 2).length,
    expectedReleaseHash: EXPECTED_HYBRID_RELEASE_HASH,
    expectedPlanFingerprint: EXPECTED_HYBRID_PLAN,
    expectedImportRunId: EXPECTED_HYBRID_RUN_ID,
    mappingProblems: hybridMappingProblems,
    orphanMappingCount: orphanMappings.length,
    expectedBookingMasterSenseId,
    runtime284MappingSenseId: runtime284Mappings[0]?.masterSenseId ?? null
  };
  const schemaInventory = buildSchemaReferenceInventory(references, deriveRepositoryCrossCheck(ROOT, references));
  const missingHybridRuntime = hybridMappings.some((mapping) => !runtimeIds.has(mapping.runtimeVocabularyId));
  if (missingHybridRuntime || hybridCheckpoint.status !== "VERIFIED") throw new Error("HYBRID_100_STATE_BLOCKED");
  return {
    target: { environment: target.environment, provider: target.provider, projectId: target.projectId, branchId: target.branchId, databaseName: target.databaseName, roleName: target.roleName },
    transaction: { isolation: session.transaction_isolation.toUpperCase().replaceAll(" ", "_"), readOnly: session.transaction_read_only },
    databaseIdentity: { environment: identity.environment, provider: identity.provider, projectId: identity.project_id, branchId: identity.branch_id, databaseName: session.database_name, currentRole: session.current_role, transactionReadOnly: session.transaction_read_only, transactionIsolation: session.transaction_isolation },
    runtimeRows,
    mappings,
    importRuns,
    references,
    schemaInventory,
    masterCandidates: masterSource.candidates,
    hybridSenseIds: masterSource.hybridSenseIds,
    hybridCheckpoint,
    orphanMappingCount: orphanMappings.length,
    repositoryBaseline: EXPECTED_REMOTE_BASELINE
  };
}

function findCanaryBookingSenseId(root: string): string {
  const manifest = readJsonFile(path.join(root, CANARY_RELEASE_RELATIVE, "dataset.json"));
  const lexemes = listValues(manifest.includedLexemes);
  let reservationLexemeId: string | undefined;
  for (const ref of lexemes) {
    const lexeme = readJsonFile(safeRelativeRecordPath(root, CANARY_RELEASE_RELATIVE, String(ref.recordPath ?? "")));
    if (normalizeWord(lexeme.lemma) === "reservation" || listValues(lexeme.aliases).some((alias) => normalizeWord(alias.text) === "booking")) reservationLexemeId = String(lexeme.masterLexemeId);
  }
  if (!reservationLexemeId) throw new Error("CANARY_BOOKING_LEXEME_NOT_FOUND");
  const matchingSenses = listValues(manifest.includedSenses).map((ref) => readJsonFile(safeRelativeRecordPath(root, CANARY_RELEASE_RELATIVE, String(ref.recordPath ?? "")))).filter((sense) => sense.masterLexemeId === reservationLexemeId);
  if (matchingSenses.length !== 1 || typeof matchingSenses[0]?.masterSenseId !== "string") throw new Error("CANARY_BOOKING_SENSE_NOT_UNIQUE");
  return matchingSenses[0].masterSenseId;
}

function buildSchemaReferenceInventory(references: ReferenceDescriptor[], crossCheck: JsonObject): JsonObject {
  return {
    runtimeVocabularyTable: "vocabflow_app.vocabularies",
    discoveredForeignKeyReferenceCount: references.filter((reference) => reference.foreignKeys.length > 0).length,
    discoveredApplicationColumnReferenceCount: references.filter((reference) => reference.applicationLevel).length,
    discoveredReferencingTableCount: new Set(references.map((reference) => `${reference.schema}.${reference.table}`)).size,
    namedReferenceCategories: {
      learnerProgress: "vocabflow_app.learner_progress",
      reviewEvents: "vocabflow_app.review_events",
      favorites: "NOT_PRESENT",
      savedWords: "vocabflow_app.learner_saved_vocabulary",
      topicMembership: "vocabflow_app.vocabulary_topics",
      learningSetItems: "vocabflow_app.learning_set_items"
    },
    tables: references.map((reference) => ({ schema: reference.schema, table: reference.table, column: reference.column, columnType: reference.columnType,
      referenceKind: reference.foreignKeys.length > 0 && reference.applicationLevel ? "FOREIGN_KEY_AND_APPLICATION_COLUMN" : reference.foreignKeys.length > 0 ? "FOREIGN_KEY" : "APPLICATION_LEVEL_COLUMN",
      applicationLevel: reference.applicationLevel,
      constraints: reference.foreignKeys.map((fk) => ({ constraint: fk.constraint, deleteAction: fk.deleteAction, updateAction: fk.updateAction, validated: fk.validated, referencedColumn: fk.referencedColumn })),
      canSelect: reference.canSelect
    })),
    crossCheck
  };
}

export function sanitizeRuntimeRows(rows: RuntimeRow[]): JsonObject[] {
  const countFor = (row: RuntimeRow, table: string) => Object.entries(row.referenceCounts)
    .filter(([name]) => name.startsWith(`${table}.`)).reduce((sum, [, count]) => sum + count, 0);
  return rows.map((row) => ({
    runtimeVocabularyId: row.runtimeVocabularyId,
    word: row.word,
    normalizedWord: row.normalizedWord,
    enabled: row.enabled,
    contentVersion: row.contentVersion,
    sourceDataset: row.sourceDataset,
    sourceRecordId: row.sourceRecordId,
    hasMasterMapping: row.mappings.length > 0,
    mappedMasterSenseId: row.mappings.length === 1 ? row.mappings[0]?.masterSenseId ?? null : null,
    mappedMasterLexemeId: row.mappings.length === 1 ? row.mappings[0]?.masterLexemeId ?? null : null,
    mappedMasterSenseIds: row.mappings.map((mapping) => mapping.masterSenseId),
    mappedMasterLexemeIds: row.mappings.map((mapping) => mapping.masterLexemeId),
    projectionContractVersion: row.mappings.length === 1 ? row.mappings[0]?.projectionContractVersion ?? null : null,
    lastReleaseHash: row.mappings.length === 1 ? row.mappings[0]?.lastReleaseHash ?? null : null,
    mappingMetadata: row.mappings.map((mapping) => ({ projectionContractVersion: mapping.projectionContractVersion, lastReleaseHash: mapping.lastReleaseHash, sourceDatasetVersion: mapping.sourceDatasetVersion })),
    mappingStatus: row.topLevelPartition,
    referenceCounts: row.referenceCounts,
    learnerProgressReferenceCount: countFor(row, "vocabflow_app.learner_progress"),
    reviewEventReferenceCount: countFor(row, "vocabflow_app.review_events"),
    favoriteReferenceCount: "NOT_PRESENT",
    savedWordReferenceCount: countFor(row, "vocabflow_app.learner_saved_vocabulary"),
    topicMembershipReferenceCount: countFor(row, "vocabflow_app.vocabulary_topics"),
    learningSetItemReferenceCount: countFor(row, "vocabflow_app.learning_set_items"),
    totalReferenceCount: row.totalReferenceCount,
    hasAnyReference: row.hasAnyReference,
    applicationReferenceCount: row.applicationReferenceCount,
    sourceIdentityObligation: row.sourceIdentityObligation
  }));
}

function sanitizeCandidateOutput(candidates: CandidateAnalysis[]): JsonObject[] {
  return candidates.map((candidate) => ({ ...candidate, candidates: candidate.candidates.map((match) => ({ ...match })) }));
}

function sanitizeMappingOutput(mappings: MappingRow[]): JsonObject[] {
  return mappings.map((mapping) => ({ ...mapping }));
}

function jsonText(value: unknown): string { return `${JSON.stringify(value, null, 2)}\n`; }

function renderReport(snapshot: AuditSnapshot, result: JsonObject): string {
  const partition = result.partitionCounts as Record<string, number>;
  const classes = result.cleanupClassCounts as Record<CleanupClass, number>;
  const refs = result.legacyReferenceCounts as Record<string, number | string>;
  const impact = result.deleteImpact as Record<string, unknown>;
  const hybrid = result.hybridCheckpoint as Record<string, unknown>;
  const history = result.runtime11History as Record<string, unknown>;
  const refsList = snapshot.references.map((reference) => `| \`${reference.schema}.${reference.table}.${reference.column}\` | ${reference.foreignKeys.map((fk) => `\`${fk.constraint}\` (${fk.deleteAction}/${fk.updateAction})`).join(", ") || "application-level column"} |`).join("\n");
  const referenceTableNames = [...new Set(snapshot.references.map((reference) => `${reference.schema}.${reference.table}`))].sort();
  const classList = CLEANUP_CLASSES.map((cleanupClass) => `| ${cleanupClass} | ${classes[cleanupClass]} |`).join("\n");
  const hybridProblems = Array.isArray(hybrid.mappingProblems) && hybrid.mappingProblems.length ? hybrid.mappingProblems.join(", ") : "none";
  return `# Phase 2G.3A — Development legacy vocabulary cleanup audit\n\n` +
    `**Status:** PASS — read-only inventory and offline classification complete.\n\n` +
    `**Target:** development / neon / shy-hill-72364426 / br-square-grass-b3af0nte / neondb / vocabflow_runtime.\n\n` +
    `**Transaction:** REPEATABLE READ, READ ONLY. **Database writes:** NONE. **Production:** NOT AUTHORIZED / UNTOUCHED.\n\n` +
    `## Inventory\n\n` +
    `- Runtime vocabulary rows: ${snapshot.runtimeRows.length}.\n` +
    `- Master-managed: ${partition.MASTER_MANAGED}; legacy unmapped: ${partition.LEGACY_UNMAPPED}; runtime mapping anomalies: ${partition.MAPPING_ANOMALY}; orphan mapping rows without a runtime row: ${snapshot.orphanMappingCount}.\n` +
    `- Legacy rows with learner progress: ${refs.withLearnerProgress}; review events: ${refs.withReviewEvents}; saved-word references: ${refs.withFavoriteOrSaveReferences}; favorites: NOT_PRESENT; topic/set references: ${refs.withTopicOrSetReferences}; any references: ${refs.withAnyReference}; zero references: ${refs.zeroReference}.\n` +
    `- Discovered reference columns: ${snapshot.references.length} across ${referenceTableNames.length} tables: ${referenceTableNames.map((name) => `\`${name}\``).join(", ")}. Database catalog is the primary truth; FK discovery and application-column references were cross-checked against Drizzle schema, migrations, API source and scripts.\n\n` +
    `| Schema.table.column | Constraint / referential action |\n|---|---|\n${refsList}\n\n` +
    `## Cleanup classification (recommendations only)\n\n| Class | Rows |\n|---|---:|\n${classList}\n\n` +
    `Finalized owner-reviewed CREATE_NEW decisions take precedence over exact lemma, duplicate, alias and translation heuristics for each reviewed runtime/Master Sense pair. Excluded candidates have relation OWNER_REVIEWED_NOT_SAME_IDENTITY and identityClaim=NONE. No mapping is created.\n\n` +
    `## Impact simulation\n\n` +
    `- Hypothetical DELETE_SAFE rows: ${String(impact.hypotheticalRowsRemoved)}; remaining runtime rows: ${String(impact.remainingRuntimeRows)}.\n` +
    `- Mapping references affected: ${String(impact.masterMappingsAffected)}; progress: ${String(impact.learnerProgressAffected)}; review events: ${String(impact.reviewEventsAffected)}; all other discovered references: ${String(impact.otherReferencesAffected)}.\n` +
    `- Disable candidates: ${(result.disableImpact as Record<string, unknown>).rows}; simulated aggregate references: ${(result.disableImpact as Record<string, unknown>).aggregateReferenceCount}; policy state: ${(result.disableImpact as Record<string, unknown>).status}. No row was disabled.\n\n` +
    `## Preserved checkpoints\n\n` +
    `- Hybrid-100: ${hybrid.status}; matching import runs ${hybrid.matchingImportRuns}; mappings ${hybrid.hybridMasterMappings}/100; new rows ${hybrid.newlyCreatedRuntimeRows}; reused rows ${hybrid.reusedRuntimeRows}; versions v1=${hybrid.contentVersion1}, v2=${hybrid.contentVersion2}; problems: ${hybridProblems}. Snapshot comparison: ${String(hybrid.currentSnapshotComparison)}. The full historical scanner fingerprint was not recomputed because Phase 2G.3A is runtime-role-only.\n` +
    `- Current/known history totals: progress ${String(hybrid.currentLearnerProgressRows)} / reference 87; review events ${String(hybrid.currentReviewEventRows)} / reference 229.\n` +
    `- Historical post-apply snapshot reference: \`${String(hybrid.referencePostApplySnapshot)}\`.\n` +
    `- Runtime #11: progress ${String(history.progress)}, reviews ${String(history.reviews)}. Runtime #284 booking mapping: unchanged.\n\n` +
    `## Authority\n\n` +
    `CLEANUP_AUTHORIZED = NO; DELETE_AUTHORIZED = NO; DISABLE_AUTHORIZED = NO; MERGE_AUTHORIZED = NO; MAPPING_WRITES_AUTHORIZED = NO.\n\n` +
    `No vocabulary was deleted or disabled; mappings and learner rows were not changed. The classification is an owner-review artifact only.\n\n` +
    `**LEGACY_AUDIT_SNAPSHOT_FINGERPRINT:** \`${String(result.legacyAuditSnapshotFingerprint)}\`\n`;
}

function writeArtifacts(snapshot: AuditSnapshot, result: JsonObject): string[] {
  const directory = path.join(ROOT, WORKSPACE);
  mkdirSync(directory, { recursive: true });
  const targetArtifact = { ...snapshot.target, providerPreconnectVerified: true, transaction: snapshot.transaction, databaseIdentity: snapshot.databaseIdentity, remoteBaseline: snapshot.repositoryBaseline, databaseConnection: "READ_ONLY_DEVELOPMENT", databaseWrites: "NONE", production: "NOT_AUTHORIZED / UNTOUCHED" };
  const schemaArtifact = snapshot.schemaInventory;
  const runtimeArtifact = { totalRuntimeVocabulary: snapshot.runtimeRows.length, rows: sanitizeRuntimeRows(snapshot.runtimeRows) };
  const mappingsArtifact = { mappings: sanitizeMappingOutput(snapshot.mappings), orphanMappingCount: snapshot.orphanMappingCount };
  const candidatesArtifact = { approvedMasterSources: readApprovedMasterCorpus(ROOT).sources, candidates: sanitizeCandidateOutput(result.candidateAnalysis as CandidateAnalysis[]) };
  const classificationArtifact = { partitionCounts: result.partitionCounts, cleanupClassCounts: result.cleanupClassCounts, classifications: result.classifications };
  const impactArtifact = { delete: result.deleteImpact, disable: result.disableImpact, authorizedMutation: false };
  const summaryArtifact = {
    status: "PASS", totalRuntimeVocabulary: snapshot.runtimeRows.length, orphanMappingCount: snapshot.orphanMappingCount,
    ...result.partitionCounts as object, cleanupClassCounts: result.cleanupClassCounts, legacyReferenceCounts: result.legacyReferenceCounts,
    hybridCheckpoint: result.hybridCheckpoint, runtime11History: result.runtime11History, runtime284: result.runtime284,
    transaction: snapshot.transaction, databaseWrites: "NONE", cleanupAuthorized: false, deleteAuthorized: false, disableAuthorized: false, mergeAuthorized: false, mappingWritesAuthorized: false,
    legacyAuditSnapshotFingerprint: result.legacyAuditSnapshotFingerprint,
    fingerprintRepeatIdentical: true,
    serializationPIIFieldsIncluded: false
  };
  const fingerprintPayload = result.fingerprintPayload;
  const manifestArtifact = {
    artifactType: "DEVELOPMENT_LEGACY_VOCABULARY_CLEANUP_AUDIT", artifactVersion: 1,
    sourceBaseline: snapshot.repositoryBaseline,
    target: targetArtifact,
    files: ["development-target.json", "schema-reference-inventory.json", "runtime-vocabulary-inventory.json", "master-mappings.json", "legacy-master-candidates.json", "cleanup-classification.json", "cleanup-impact-simulation.json", "validation-summary.json", "manifest.json", "owner-reviewed-exclusions.json", "semantic-fingerprint-payload.json", "../../reports/development-legacy-vocabulary-cleanup-audit.md"],
    legacyAuditSnapshotFingerprint: result.legacyAuditSnapshotFingerprint,
    fingerprintPayloadKeys: Object.keys(fingerprintPayload as object).sort(),
    outputSanitization: { learnerIds: false, householdIds: false, userIds: false, emails: false, sessions: false, connectionStrings: false },
    authorization: { cleanup: false, delete: false, disable: false, merge: false, mappingWrites: false }
  };
  const files = new Map<string, unknown>([
    ["owner-reviewed-exclusions.json", result.ownerReviewedExclusions],
    ["semantic-fingerprint-payload.json", result.fingerprintPayload],
    ["development-target.json", targetArtifact],
    ["schema-reference-inventory.json", schemaArtifact],
    ["runtime-vocabulary-inventory.json", runtimeArtifact],
    ["master-mappings.json", mappingsArtifact],
    ["legacy-master-candidates.json", candidatesArtifact],
    ["cleanup-classification.json", classificationArtifact],
    ["cleanup-impact-simulation.json", impactArtifact],
    ["validation-summary.json", summaryArtifact],
    ["manifest.json", manifestArtifact]
  ]);
  for (const [relative, value] of files) writeFileSync(path.join(directory, relative), jsonText(value), "utf8");
  const reportPath = path.join(ROOT, REPORT);
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, renderReport(snapshot, result), "utf8");
  return [...[...files.keys()].map((file) => `${WORKSPACE}/${file}`), REPORT];
}

export function loadLocalDevelopmentEnvironment(): void {
  if (!process.env.DATABASE_URL) {
    const envCandidates = [path.resolve(ROOT, "..", "VocabFlow", ".env"), path.resolve(ROOT, "..", ".env")];
    const envFile = envCandidates.find(existsSync);
    if (!envFile) throw new Error("LOCAL_DEVELOPMENT_ENV_FILE_NOT_FOUND");
    process.loadEnvFile(envFile);
  }
  const expected = { VOCABFLOW_ENV: "development", DATABASE_ENV: "development", EXECUTION_CONTEXT: "local-development", TRUSTED_SOURCE: "dev-launcher" };
  for (const [key, value] of Object.entries(expected)) {
    if (process.env[key] && process.env[key] !== value) throw new Error("LOCAL_DEVELOPMENT_ENVIRONMENT_MARKER_MISMATCH");
    process.env[key] = value;
  }
}

export async function runDevelopmentLegacyVocabularyCleanupAudit(args = process.argv.slice(2)): Promise<JsonObject> {
  rejectMutationOptions(args);
  loadLocalDevelopmentEnvironment();
  const target = getTarget("development", "runtime");
  assertDevelopmentTarget(target);
  const verifiedTarget = await assertResolvedTargetBeforeMutation({ context: "local-development", source: "dev-launcher", environment: "development", purpose: "runtime", operation: "db-check", target });
  const masterSource = readApprovedMasterCorpus(ROOT);
  const client = postgres(verifiedTarget.url, { max: 1, connect_timeout: 10, idle_timeout: 5, prepare: false, onnotice: () => undefined });
  try {
    const snapshot = await client.begin((tx) => captureDatabaseSnapshot(tx as unknown as ReturnType<typeof postgres>, target, masterSource));
    const crossCheck = snapshot.schemaInventory.crossCheck as Record<string, unknown>;
    const drizzleCrossCheck = crossCheck.drizzleSchema as Record<string, unknown>;
    const migrationCrossCheck = crossCheck.migrations as Record<string, unknown>;
    const referenceInventoryComplete = snapshot.references.every((reference) => reference.canSelect) && drizzleCrossCheck.databaseForeignKeyTablesCovered === true && migrationCrossCheck.databaseForeignKeyTablesCovered === true;
    const first = classifySnapshot(snapshot, referenceInventoryComplete);
    const second = classifySnapshot(snapshot, referenceInventoryComplete);
    if (canonicalJson(first) !== canonicalJson(second) || first.legacyAuditSnapshotFingerprint !== second.legacyAuditSnapshotFingerprint) throw new Error("AUDIT_FINGERPRINT_NOT_DETERMINISTIC");
    const filesChanged = writeArtifacts(snapshot, first);
    const runtime11History = first.runtime11History as Record<string, number>;
    console.log(JSON.stringify({ status: "PASS", runtimeVocabulary: snapshot.runtimeRows.length, partitionCounts: first.partitionCounts,
      cleanupClassCounts: first.cleanupClassCounts, legacyAuditSnapshotFingerprint: first.legacyAuditSnapshotFingerprint,
      hybrid100State: (first.hybridCheckpoint as Record<string, unknown>).status, runtime11History, filesChanged }, null, 2));
    return { status: "PASS", filesChanged, legacyAuditSnapshotFingerprint: first.legacyAuditSnapshotFingerprint };
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  runDevelopmentLegacyVocabularyCleanupAudit().catch((error: unknown) => {
    const databaseCode = error && typeof error === "object" && "code" in error && typeof error.code === "string" ? error.code : undefined;
    const messageCode = error instanceof Error && SAFE_AUDIT_ERROR_CODES.has(error.message) ? error.message : undefined;
    const code = messageCode ?? (databaseCode && /^[0-9A-Z]{5}$/.test(databaseCode) ? databaseCode : "AUDIT_BLOCKED");
    console.error(JSON.stringify({ status: "BLOCKED", code }));
    process.exitCode = 1;
  });
}
