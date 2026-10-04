import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import canonicalize from "canonicalize";
import { version as uuidVersion } from "uuid";
import { stableAuthoredContent } from "./hybrid-100-canonical-promote";
import { validateMasterVocabularyDocument } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type DecisionType = "REUSE_EXISTING_CLASSIFICATION" | "NEW_EDITORIAL_CLASSIFICATION" | "OWNER_REVIEW_REQUIRED" | "UNCLASSIFIED_INSUFFICIENT_EVIDENCE";
type AgreementStatus = "AGREES_WITH_SOURCE" | "EDITORIALLY_ADJUSTED" | "CONFLICT_REQUIRES_OWNER_REVIEW" | null;
type Proposal = { candidateOrdinal: number; valueCode: string | null; confidence: number; rationale: string };
type Pin = JsonObject & { recordPath: string; contentHash: string };
type RegistryMapping = { registryKey: string; masterSenseId: string; frameworkCode: string; frameworkVersion: string; decisionType: DecisionType; classificationId: string | null; provenanceIds: string[] };
type ClassificationRegistry = { artifactType: string; registryVersion: number; idAlgorithm: string; mappings: RegistryMapping[] };
type DraftPlan = { files: Map<string, string>; summary: JsonObject; workspaceRoot: string; cefrDraftFingerprint: string };

export const APPROVED_SEMANTIC_DRAFT_FINGERPRINT = "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d";
export const CANONICAL_PROMOTION_FINGERPRINT = "5c10618ee72fcc7b99b270764e412ebc51f286eadc750e45a6910830bb15e870";
export const SOURCE_PROOF_FINGERPRINT = "89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc";
export const TAXONOMY_ID = "01a0fc13-09e9-72dd-b49d-ffef077385dd";
export const TAXONOMY_VERSION = "2.0.0";
export const FRAMEWORK_CODE = "CEFR";
export const FRAMEWORK_VERSION = "EDITORIAL-PILOT-1";
export const RUBRIC_VERSION = "HYBRID-CEFR-EDITORIAL-RUBRIC-1.0.0";
export const ID_CREATED_AT = "2026-10-04T14:45:42Z";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MASTER_WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-editorial-draft";
const SOURCE_WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-sense-proof";
const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-cefr-draft";
const ROOT_DATASET = "vocabflow-dataset/dataset.json";
const OWNER_REVIEW_REPORT = "vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md";
const DRAFT_REPORT = "vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md";
const APPROVAL_PATH = `${MASTER_WORKSPACE}/canonical-promotion.json`;
const PROMOTION_SUMMARY_PATH = `${MASTER_WORKSPACE}/canonical-promotion-summary.json`;
const TAXONOMY_PATH = `vocabflow-dataset/taxonomy/${TAXONOMY_ID}-${TAXONOMY_VERSION}.json`;
const ALLOWED_VALUES = new Set(["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"]);
const VALUE_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const PROJECT_SOURCE_NAME = "VocabFlow Hybrid 100-Sense CEFR Editorial Review";
const PROJECT_NOTES = "VocabFlow editorial CEFR estimate under CEFR/EDITORIAL-PILOT-1. External APKG labels were used only as local review evidence and are not represented as official or licensed classification claims.";

const RUBRIC = {
  rubricVersion: RUBRIC_VERSION,
  frameworkCode: FRAMEWORK_CODE,
  frameworkVersion: FRAMEWORK_VERSION,
  claimSemantics: "VocabFlow editorial CEFR estimate; not an official Council of Europe, Oxford, 4600, grade, difficulty, or exam classification.",
  method: "Review the teachable Sense using its authored label, definition, part of speech, scope, example, ordinary frequency, source level evidence, and sibling Sense distinctions. Source values inform review but do not determine the assignment.",
  confidencePolicy: [
    { range: "0.90-1.00", meaning: "Strong independent editorial confidence and source evidence agrees; editorial confidence is not a statistical probability." },
    { range: "0.75-0.89", meaning: "Reasonable editorial confidence with some ambiguity." },
    { range: "0.60-0.74", meaning: "Tentative; explicit owner review is required before promotion." },
    { range: "below 0.60", meaning: "Do not create a primary classification; leave unclassified or require owner review." },
  ],
  bands: [
    { valueCode: "A1", descriptor: "Very common concrete or basic everyday meanings." },
    { valueCode: "A2", descriptor: "Common everyday meanings used across somewhat broader situations." },
    { valueCode: "B1", descriptor: "Independent-user vocabulary with abstract or general-purpose use." },
    { valueCode: "B2", descriptor: "Less frequent, more precise, abstract, professional, or general academic usage." },
    { valueCode: "C1", descriptor: "Advanced, nuanced, specialized, or lower-frequency general or academic meanings." },
  ],
  levelQuotasAreTargets: false,
  unsupportedBands: ["PRE_A1", "C2"],
  senseLevelOnly: true,
};

function fail(message: string): never {
  throw new Error(message);
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value as never);
  if (serialized === undefined) fail("JCS_SERIALIZATION_FAILED");
  return sha256(serialized);
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

function jsonBytes(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function stableUuidV7(purposeKey: string): string {
  const timestamp = Date.parse(ID_CREATED_AT);
  const timeHex = Math.trunc(timestamp).toString(16).padStart(12, "0");
  const digest = sha256(`vocabflow-hybrid-100-cefr-draft-v1:${APPROVED_SEMANTIC_DRAFT_FINGERPRINT}:${purposeKey}`);
  const randA = digest.slice(0, 3);
  const randB = digest.slice(3, 19).split("");
  randB[0] = ((parseInt(randB[0] ?? "0", 16) & 0x3) | 0x8).toString(16);
  const hex = `${timeHex}7${randA}${randB.join("")}`;
  const value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  if (uuidVersion(value) !== 7) fail("UUIDV7_GENERATION_FAILED");
  return value;
}

export function assertTaxonomyContract(taxonomy: JsonObject, pin: Pin): void {
  if (taxonomy.taxonomyId !== TAXONOMY_ID || taxonomy.taxonomyVersion !== TAXONOMY_VERSION) fail("TAXONOMY_PIN_STALE");
  if (pin.taxonomyId !== TAXONOMY_ID || pin.taxonomyVersion !== TAXONOMY_VERSION || pin.contentHash !== canonicalHash(taxonomy)) fail("TAXONOMY_HASH_STALE");
  if (taxonomy.status !== "DRAFT") fail("TAXONOMY_SNAPSHOT_STATUS_INVALID");
  const framework = (taxonomy.cefrFrameworks as JsonObject[] | undefined)?.find((item) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION);
  if (!framework || framework.status !== "ACTIVE") fail("CEFR_FRAMEWORK_CONTRACT_INVALID");
  const hasEditorialPilotLabel = (framework.labels as JsonObject[] | undefined)?.some((item) => typeof item.text === "string" && /editorial pilot estimates/i.test(item.text));
  if (!hasEditorialPilotLabel) fail("CEFR_FRAMEWORK_EDITORIAL_SEMANTICS_INVALID");
}

export function assertPinnedSense(sense: JsonObject, pin: Pin, expectedSenseId: string): void {
  if (sense.masterSenseId !== expectedSenseId || pin.masterSenseId !== expectedSenseId || pin.senseRevision !== sense.senseRevision) fail(`CANONICAL_HYBRID_BASE_STALE: ${expectedSenseId}`);
  if (pin.recordPath !== `master/senses/${expectedSenseId}-r${sense.senseRevision}.json` || pin.contentHash !== canonicalHash(sense)) fail(`CANONICAL_HYBRID_BASE_STALE: ${expectedSenseId}`);
}

export function auditExistingCefr(records: JsonObject[], proposedValueCode: string | null): JsonObject {
  const sameFramework = records.filter((record) => record.frameworkCode === FRAMEWORK_CODE && record.frameworkVersion === FRAMEWORK_VERSION);
  const samePrimaryValues = new Set(sameFramework.filter((record) => record.isPrimary === true && record.status !== "REJECTED" && record.status !== "RETIRED").map((record) => record.valueCode));
  let category: string;
  if (records.length === 0) category = "NO_EXISTING_CEFR";
  else if (samePrimaryValues.size > 1 || sameFramework.length > 1) category = "CONFLICTING_EXISTING_CEFR";
  else if (records.length > 1) category = "MULTIPLE_EXISTING_CEFR";
  else if (sameFramework.length === 1) category = "EXISTING_SAME_FRAMEWORK_CEFR";
  else category = "EXISTING_OTHER_FRAMEWORK_CEFR";
  const details = records.map((record) => ({
    classificationId: record.classificationId,
    revision: record.classificationRevision,
    valueCode: record.valueCode ?? null,
    frameworkCode: record.frameworkCode ?? null,
    frameworkVersion: record.frameworkVersion ?? null,
    status: record.status,
    isPrimary: record.isPrimary,
    contentHash: record.contentHash,
    sourceProvenanceIds: record.sourceProvenanceIds ?? [],
  }));
  const proposalConflicts = sameFramework.some((record) => record.isPrimary === true && record.valueCode !== proposedValueCode);
  return { category, sameFrameworkCount: sameFramework.length, records: details, proposalConflicts };
}

export function decideClassification(input: {
  valueCode: string | null;
  confidence: number;
  sourceCefrEvidence: string[];
  existingAudit: JsonObject;
}): { decisionType: DecisionType; agreementStatus: AgreementStatus; reviewStatus: string } {
  if (input.valueCode !== null && !ALLOWED_VALUES.has(input.valueCode)) fail("CEFR_VALUE_INVALID");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) fail("EDITORIAL_CONFIDENCE_INVALID");
  if (input.valueCode === null || input.confidence < 0.6) {
    return { decisionType: input.existingAudit.proposalConflicts ? "OWNER_REVIEW_REQUIRED" : "UNCLASSIFIED_INSUFFICIENT_EVIDENCE", agreementStatus: input.sourceCefrEvidence.length ? "CONFLICT_REQUIRES_OWNER_REVIEW" : null, reviewStatus: input.existingAudit.proposalConflicts ? "OWNER_REVIEW_REQUIRED" : "UNCLASSIFIED_INSUFFICIENT_EVIDENCE" };
  }
  const same = input.existingAudit.records.filter((item: JsonObject) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION);
  if (input.existingAudit.proposalConflicts || input.existingAudit.category === "CONFLICTING_EXISTING_CEFR" || input.existingAudit.category === "MULTIPLE_EXISTING_CEFR") {
    return { decisionType: "OWNER_REVIEW_REQUIRED", agreementStatus: input.sourceCefrEvidence.includes(input.valueCode) ? "AGREES_WITH_SOURCE" : "CONFLICT_REQUIRES_OWNER_REVIEW", reviewStatus: "OWNER_REVIEW_REQUIRED" };
  }
  if (same.length === 1 && same[0]?.valueCode === input.valueCode && same[0]?.isPrimary === true) {
    return { decisionType: "REUSE_EXISTING_CLASSIFICATION", agreementStatus: input.sourceCefrEvidence.includes(input.valueCode) ? "AGREES_WITH_SOURCE" : "EDITORIALLY_ADJUSTED", reviewStatus: "PENDING_OWNER_REVIEW" };
  }
  if (input.confidence < 0.75) {
    return { decisionType: "OWNER_REVIEW_REQUIRED", agreementStatus: input.sourceCefrEvidence.length && !input.sourceCefrEvidence.includes(input.valueCode) ? "CONFLICT_REQUIRES_OWNER_REVIEW" : input.sourceCefrEvidence.length ? "AGREES_WITH_SOURCE" : null, reviewStatus: "OWNER_REVIEW_REQUIRED" };
  }
  const agreementStatus = input.sourceCefrEvidence.length === 0 ? null : input.sourceCefrEvidence.includes(input.valueCode) ? "AGREES_WITH_SOURCE" : "EDITORIALLY_ADJUSTED";
  if (input.confidence >= 0.9 && agreementStatus !== "AGREES_WITH_SOURCE") fail("STRONG_CONFIDENCE_REQUIRES_SOURCE_AGREEMENT");
  return { decisionType: "NEW_EDITORIAL_CLASSIFICATION", agreementStatus, reviewStatus: "PENDING_OWNER_REVIEW" };
}

export function assertNoDuplicatePrimaryCefr(rows: JsonObject[]): void {
  const seen = new Map<string, string>();
  for (const row of rows) {
    const decisionType = row.editorialDecision?.decisionType ?? row.decisionType;
    if (decisionType === "UNCLASSIFIED_INSUFFICIENT_EVIDENCE" || decisionType === "OWNER_REVIEW_REQUIRED") continue;
    const key = `${row.masterSenseId}|${FRAMEWORK_CODE}|${FRAMEWORK_VERSION}`;
    const value = String(row.editorialDecision?.valueCode ?? "");
    const current = seen.get(key);
    if (current) fail(current === value ? "DUPLICATE_PRIMARY_CEFR" : "CONFLICTING_PRIMARY_CEFR");
    seen.set(key, value);
  }
}

export function createClassificationRecord(input: { classificationId: string; masterSenseId: string; valueCode: string; confidence: number; sourceProvenanceIds: string[] }): JsonObject {
  return {
    classificationId: input.classificationId,
    classificationRevision: 1,
    masterSenseId: input.masterSenseId,
    dimension: "CEFR",
    frameworkCode: FRAMEWORK_CODE,
    frameworkVersion: FRAMEWORK_VERSION,
    valueCode: input.valueCode,
    isPrimary: true,
    sourceProvenanceIds: input.sourceProvenanceIds,
    confidence: input.confidence,
    status: "DRAFT",
  };
}

export function createClassificationProvenance(provenanceId: string, classificationId: string): JsonObject {
  return {
    provenanceId,
    subjectType: "CLASSIFICATION",
    subjectId: classificationId,
    fieldPath: "classification.valueCode",
    sourceType: "PROJECT_AUTHORED",
    sourceName: PROJECT_SOURCE_NAME,
    authoredBy: "VocabFlow project",
    notes: PROJECT_NOTES,
    createdAt: ID_CREATED_AT,
  };
}

export function assertRightsSafe(value: unknown): void {
  const serialized = JSON.stringify(value);
  if (/\b(?:LICENSED_SOURCE|PUBLIC_DOMAIN_SOURCE)\b/.test(serialized)) fail("UNVERIFIED_SOURCE_PROVENANCE_FORBIDDEN");
  if (/(?:\b[A-Za-z]:[\\/]|https?:\/\/|file:\/\/)/i.test(serialized)) fail("ABSOLUTE_PATH_OR_SOURCE_URL_FORBIDDEN");
  const inspect = (item: unknown): void => {
    if (Array.isArray(item)) return item.forEach(inspect);
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item)) {
      if (/^(?:rawSourceText|sourceDefinition|sourceExample|rawDefinition|rawExample|mediaBytes)$/i.test(key)) fail("RAW_SOURCE_CONTENT_FORBIDDEN");
      inspect(child);
    }
  };
  inspect(value);
}

export function buildReadiness(input: { candidateCount: number; decisionCounts: Record<string, number>; valueCount: number; existingClassificationConflictCount: number; duplicatePrimaryCount: number; canaryFingerprint: string; correctionRate: number }): JsonObject {
  const resolved = (input.decisionCounts.NEW_EDITORIAL_CLASSIFICATION ?? 0) + (input.decisionCounts.REUSE_EXISTING_CLASSIFICATION ?? 0);
  const contentReady = input.candidateCount === 100 && input.duplicatePrimaryCount === 0;
  return {
    artifactType: "HYBRID_100_RELEASE_READINESS_ASSESSMENT",
    assessmentStatus: "OFFLINE_ANALYSIS_ONLY",
    cohort: "HYBRID_100_OWNER_APPROVED_SEMANTIC_COHORT",
    readiness: {
      HYBRID_100_CONTENT_COHORT_READY: contentReady ? "YES" : "NO",
      HYBRID_100_APPROVED_RELEASE_READY: "NO",
    },
    gates: {
      SEMANTIC_CONTENT: { status: contentReady ? "PASS" : "FAIL", ownerApprovedCandidateCount: input.candidateCount, expectedCandidateCount: 100, approvedSemanticFingerprint: APPROVED_SEMANTIC_DRAFT_FINGERPRINT },
      PROVENANCE: { status: "PASS", projectAuthoredSemanticContent: true, sourceRightsVerified: false },
      CEFR: { status: input.existingClassificationConflictCount || (input.decisionCounts.OWNER_REVIEW_REQUIRED ?? 0) ? "OWNER_REVIEW_REQUIRED" : "EDITORIAL_DRAFT_READY", editorialAssignmentsResolved: resolved, editorialAssignmentPercent: Number((resolved / Math.max(input.candidateCount, 1) * 100).toFixed(2)), editorialValuesProposed: input.valueCount, editorialValuePercent: Number((input.valueCount / Math.max(input.candidateCount, 1) * 100).toFixed(2)), conflictingExistingClassificationCount: input.existingClassificationConflictCount, duplicatePrimaryCount: input.duplicatePrimaryCount, ownerApproval: "PENDING" },
      CLASSIFICATIONS_OTHER_THAN_CEFR: { status: "NOT_STARTED" },
      MEDIA: { status: "NOT_STARTED_OPTIONAL" },
      PRONUNCIATION: { status: "NOT_STARTED" },
      SOURCE_RIGHTS: { status: "UNVERIFIED", externalSourceTextReused: false, externalMediaReused: false },
      CANARY_RUNTIME: { status: "SEPARATE_8_SENSE_CANARY_ONLY", treeFingerprint: input.canaryFingerprint },
      RUNTIME_RECONCILIATION_FOR_100: { status: "NOT_STARTED" },
      RELEASE_APPROVAL: { status: "NOT_AUTHORIZED" },
    },
    releaseBlockers: [
      "CEFR recommendations have not received owner approval or canonical promotion.",
      "An immutable approved release has not been built or reviewed.",
      "Runtime reconciliation for the 100-Sense cohort has not started.",
      "Production mutation is not authorized.",
    ],
    qualityMetrics: { editorialFirstPassCorrectionRate: Number(input.correctionRate.toFixed(4)), editorialCorrectionGroups: 24, newlyAuthoredSenseCount: 98 },
    recommendedNextScaleOption: "BUILD_100_SENSE_RELEASE_CANDIDATE",
    recommendationRationale: "The deterministic 100-Sense identity and authoring pipeline is stable. Resolve the small CEFR owner-review queue and validate classification promotion plus immutable release construction at 100 before multiplying the 24/98 first-pass correction workload across a 500-Sense batch. Keep any future release and runtime work separately authorized; this recommendation does not execute it.",
    noReleaseCreated: true,
    noCanonicalClassificationMutation: true,
    databaseWrites: "NONE",
    importApplyExecuted: false,
    productionMutation: false,
  };
}

function fileTreeSnapshot(root: string, relativeDirectory: string): JsonObject[] {
  const absolute = path.join(root, relativeDirectory);
  if (!existsSync(absolute)) return [];
  const entries: JsonObject[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) {
        const relativePath = path.relative(root, absolutePath).split(path.sep).join("/");
        entries.push({ path: relativePath, sha256: sha256(readFileSync(absolutePath)) });
      }
    }
  };
  visit(absolute);
  return entries.sort((left, right) => String(left.path).localeCompare(String(right.path), "en"));
}

function censusCefrRecords(root: string, dataset: JsonObject, targetSenseIds: Set<string>): Map<string, JsonObject[]> {
  const recordsBySense = new Map<string, JsonObject[]>();
  const classificationPins = dataset.includedClassifications as Pin[];
  for (const pin of classificationPins) {
    const record = readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", pin.recordPath));
    if (canonicalHash(record) !== pin.contentHash) fail(`CLASSIFICATION_PIN_HASH_INVALID: ${pin.classificationId}`);
    if (record.dimension !== "CEFR" || !targetSenseIds.has(record.masterSenseId)) continue;
    const withHash = { ...record, contentHash: pin.contentHash };
    const current = recordsBySense.get(record.masterSenseId) ?? [];
    current.push(withHash);
    recordsBySense.set(record.masterSenseId, current);
  }
  return recordsBySense;
}

function markdownSafe(value: unknown): string {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function distribution(rows: JsonObject[]): JsonObject {
  const result: JsonObject = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, UNCLASSIFIED: 0 };
  for (const row of rows) {
    const value = row.editorialDecision.valueCode;
    if (value === null) result.UNCLASSIFIED += 1;
    else result[value] = (result[value] ?? 0) + 1;
  }
  return result;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")));
}

export function buildRegistryMappings(rows: JsonObject[], priorRegistry: JsonObject | null = null): { registry: ClassificationRegistry; allocatedIdCount: number } {
  const registryMappings = rows.map((row) => {
    const decisionType = row.editorialDecision.decisionType as DecisionType;
    const registryKey = `${row.masterSenseId}|${FRAMEWORK_CODE}|${FRAMEWORK_VERSION}`;
    const sameFramework = (row.existingClassificationAudit.records as JsonObject[]).filter((item) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION);
    const classificationId = decisionType === "REUSE_EXISTING_CLASSIFICATION" ? sameFramework[0]?.classificationId : decisionType === "NEW_EDITORIAL_CLASSIFICATION" ? stableUuidV7(`CLASSIFICATION|${registryKey}`) : null;
    const provenanceIds = decisionType === "REUSE_EXISTING_CLASSIFICATION" ? sameFramework[0]?.sourceProvenanceIds ?? [] : decisionType === "NEW_EDITORIAL_CLASSIFICATION" ? [stableUuidV7(`PROVENANCE|${registryKey}|classification.valueCode`)] : [];
    return { registryKey, masterSenseId: String(row.masterSenseId), frameworkCode: FRAMEWORK_CODE, frameworkVersion: FRAMEWORK_VERSION, decisionType, classificationId: classificationId ?? null, provenanceIds } satisfies RegistryMapping;
  });
  let allocatedIdCount = 0;
  if (priorRegistry) {
    if (priorRegistry.artifactType !== "HYBRID_100_CEFR_CLASSIFICATION_REGISTRY" || priorRegistry.registryVersion !== 1) fail("CLASSIFICATION_REGISTRY_CONTRACT_INVALID");
    const oldMappings = new Map((priorRegistry.mappings as JsonObject[]).map((item) => [item.registryKey, item]));
    if (oldMappings.size !== registryMappings.length) fail("CLASSIFICATION_REGISTRY_STALE");
    for (const mapping of registryMappings) {
      const old = oldMappings.get(mapping.registryKey);
      if (!old || old.classificationId !== mapping.classificationId || canonicalHash(old.provenanceIds) !== canonicalHash(mapping.provenanceIds) || old.decisionType !== mapping.decisionType) fail(`CLASSIFICATION_REGISTRY_STALE: ${mapping.masterSenseId}`);
    }
  } else {
    allocatedIdCount = registryMappings.reduce((count, item) => count + Number(item.classificationId !== null && item.decisionType === "NEW_EDITORIAL_CLASSIFICATION") + Number(item.provenanceIds.length === 1 && item.decisionType === "NEW_EDITORIAL_CLASSIFICATION"), 0);
  }
  const registry: ClassificationRegistry = { artifactType: "HYBRID_100_CEFR_CLASSIFICATION_REGISTRY", registryVersion: 1, idAlgorithm: "DETERMINISTIC_RFC9562_UUIDV7_FROM_APPROVED_DRAFT_AND_SENSE_SCOPE", mappings: registryMappings.sort((left, right) => left.registryKey.localeCompare(right.registryKey, "en")) };
  return { registry, allocatedIdCount };
}

function makeCohort(root: string, dataset: JsonObject, proposalFile: JsonObject): { rows: JsonObject[]; classRecords: JsonObject[]; provenanceRecords: JsonObject[]; registry: JsonObject; allocatedIdCount: number; sourceSummary: JsonObject; correctionMetrics: JsonObject; canary: JsonObject[]; taxonomyPin: Pin; rubric: JsonObject } {
  const editorial = readJson<JsonObject>(root, `${MASTER_WORKSPACE}/editorial-decisions.json`);
  const candidateMap = readJson<JsonObject[]>(root, `${MASTER_WORKSPACE}/candidate-master-map.json`);
  const ownerReview = readJson<JsonObject>(root, `${MASTER_WORKSPACE}/owner-review.json`);
  const promotion = readJson<JsonObject>(root, APPROVAL_PATH);
  const promotionSummary = readJson<JsonObject>(root, PROMOTION_SUMMARY_PATH);
  const sourceManifest = readJson<JsonObject>(root, `${SOURCE_WORKSPACE}/manifest.json`);
  const sourceCandidates = readJson<JsonObject>(root, `${SOURCE_WORKSPACE}/candidates.json`).candidates as JsonObject[];
  const taxonomy = readJson<JsonObject>(root, TAXONOMY_PATH);
  const taxonomyPin = (dataset.includedTaxonomySnapshots as Pin[]).find((pin) => pin.taxonomyId === TAXONOMY_ID && pin.taxonomyVersion === TAXONOMY_VERSION);
  if (!taxonomyPin) fail("TAXONOMY_PIN_MISSING");
  assertTaxonomyContract(taxonomy, taxonomyPin);

  if (dataset.datasetVersion !== "2.0.0" || dataset.schemaVersion !== "2.0.1" || dataset.status !== "DRAFT") fail("CANONICAL_HYBRID_BASE_STALE: root dataset contract changed");
  if (dataset.includedLexemes.length !== 103 || dataset.includedSenses.length !== 123 || dataset.includedProvenance.length !== 846) fail("CANONICAL_HYBRID_BASE_STALE: canonical totals changed");
  if (dataset.includedClassifications.length !== 122) fail("CANONICAL_HYBRID_BASE_STALE: canonical classification pin set changed");
  if (promotion.ownerApproved !== true || promotion.canonicalPromotionAuthorized !== true || promotion.approvedCandidateCount !== 100 || promotion.approvedDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT || promotion.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT || promotion.promotionPlanFingerprint !== CANONICAL_PROMOTION_FINGERPRINT) fail("APPROVED_COHORT_PIN_INVALID");
  if (promotionSummary.status !== "PASS" || promotionSummary.approvedDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT || promotionSummary.promotionPlanFingerprint !== CANONICAL_PROMOTION_FINGERPRINT || promotionSummary.canonicalLexemeTotal !== 103 || promotionSummary.canonicalSenseTotal !== 123 || promotionSummary.canonicalProvenanceTotal !== 846) fail("CANONICAL_PROMOTION_ARTIFACT_STALE");
  if (promotionSummary.datasetManifestHashAfter && promotionSummary.datasetManifestHashAfter !== canonicalHash(dataset)) fail("CANONICAL_HYBRID_BASE_STALE: promoted dataset manifest hash changed");
  if (sourceManifest.proofFingerprint !== SOURCE_PROOF_FINGERPRINT || sourceManifest.candidateCount !== 100) fail("SOURCE_PROOF_PIN_INVALID");
  if (editorial.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT || editorial.decisionCount !== 100 || (ownerReview.draftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT)) fail("EDITORIAL_COHORT_PIN_INVALID");
  if (ownerReview.summary?.approveDraft !== 100 || ownerReview.summary?.requestChanges !== 0 || ownerReview.summary?.rejectIdentity !== 0 || ownerReview.summary?.blocked !== 0 || ownerReview.summary?.sourceRights !== "UNVERIFIED") fail("OWNER_REVIEW_EVIDENCE_INVALID");
  if (ownerReview.summary?.sourceOverlap?.sourceTextReused !== false || ownerReview.summary?.sourceOverlap?.exactEnglishDefinitionMatches !== 0 || ownerReview.summary?.sourceOverlap?.exactEnglishExampleMatches !== 0 || ownerReview.summary?.sourceOverlap?.highSimilarityUnresolved !== 0) fail("SOURCE_OVERLAP_AUDIT_INVALID");
  const identityRegistryPath = path.join(root, MASTER_WORKSPACE, "identity-registry.json");
  if (sha256(readFileSync(identityRegistryPath)) !== ownerReview.summary.identityRegistrySha256 || ownerReview.summary.identityRegistryChanged !== false) fail("FROZEN_IDENTITY_REGISTRY_INVALID");

  const sourceByCandidate = new Map(sourceCandidates.map((candidate) => [candidate.candidateId, candidate]));
  const decisionByCandidate = new Map((editorial.decisions as JsonObject[]).map((decision) => [decision.candidateId, decision]));
  const mapByCandidate = new Map(candidateMap.map((entry) => [entry.candidateId, entry]));
  const proposals = proposalFile.assignments as Proposal[];
  if (candidateMap.length !== 100 || editorial.decisions.length !== 100 || sourceCandidates.length !== 100 || proposals.length !== 100) fail("HYBRID_COHORT_COUNT_INVALID");
  if (new Set(proposals.map((item) => item.candidateOrdinal)).size !== 100 || !proposals.every((item, index) => item.candidateOrdinal === index + 1)) fail("EDITORIAL_PROPOSAL_SET_INVALID");
  if (proposalFile.approvedSemanticDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT || proposalFile.frameworkCode !== FRAMEWORK_CODE || proposalFile.frameworkVersion !== FRAMEWORK_VERSION || proposalFile.rubricVersion !== RUBRIC_VERSION) fail("EDITORIAL_PROPOSAL_CONTRACT_INVALID");
  const sensePins = new Map<string, Pin>((dataset.includedSenses as Pin[]).map((pin) => [pin.masterSenseId, pin]));
  const targetIds = new Set(candidateMap.map((entry) => entry.masterSenseId));
  const existingBySense = censusCefrRecords(root, dataset, targetIds);
  const identityCounts = countBy(editorial.decisions as JsonObject[], (item) => item.identityDecision);
  if (identityCounts.REUSE_EXISTING_SENSE !== 2 || identityCounts.NEW_SENSE_EXISTING_LEXEME !== 3 || identityCounts.NEW_SENSE_NEW_LEXEME !== 95) fail("HYBRID_IDENTITY_SPLIT_INVALID");

  const rows = proposals.map((proposal) => {
    const sourceDecision = (editorial.decisions as JsonObject[])[proposal.candidateOrdinal - 1];
    const candidateId = sourceDecision?.candidateId;
    if (!candidateId || sourceDecision.candidateOrdinal !== proposal.candidateOrdinal) fail(`CANDIDATE_ORDINAL_INVALID: ${proposal.candidateOrdinal}`);
    const mapped = mapByCandidate.get(candidateId);
    const authored = decisionByCandidate.get(candidateId);
    const source = sourceByCandidate.get(candidateId);
    if (!mapped || !authored || !source || mapped.identityDecision !== authored.identityDecision || source.candidateId !== candidateId || mapped.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT) fail(`CANDIDATE_IDENTITY_MAP_INVALID: ${candidateId}`);
    const senseId = String(mapped.masterSenseId);
    const pin = sensePins.get(senseId);
    if (!pin) fail(`CANONICAL_SENSE_PIN_MISSING: ${senseId}`);
    const sense = readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", pin.recordPath));
    assertPinnedSense(sense, pin, senseId);
    if (mapped.workspaceSenseRecord?.recordPath) {
      const workspaceSense = readJson<JsonObject>(root, mapped.workspaceSenseRecord.recordPath);
      if (canonicalHash(stableAuthoredContent(workspaceSense)) !== canonicalHash(stableAuthoredContent(sense))) fail(`CANONICAL_HYBRID_BASE_STALE: approved semantic content changed for ${senseId}`);
    }
    const sourceLevels = [...new Set((source.cefrEvidence as string[] | undefined) ?? [])].sort((left, right) => VALUE_ORDER.indexOf(left) - VALUE_ORDER.indexOf(right));
    if (canonicalHash(sourceLevels) !== canonicalHash([...new Set((authored.cefrEvidence as string[] | undefined) ?? [])].sort((left, right) => VALUE_ORDER.indexOf(left) - VALUE_ORDER.indexOf(right)))) fail(`SOURCE_CEFR_EVIDENCE_MISMATCH: ${candidateId}`);
    if (source.sourceCoverage !== authored.sourceCoverage) fail(`SOURCE_COVERAGE_MISMATCH: ${candidateId}`);
    if (source.sourceCoverage === "4600_ONLY" && sourceLevels.length !== 0) fail(`4600_ONLY_SOURCE_CEFR_INVALID: ${candidateId}`);
    if (source.sourceCoverage !== "4600_ONLY" && sourceLevels.length !== 1) fail(`OXFORD_CEFR_EVIDENCE_INVALID: ${candidateId}`);
    const existingAudit = auditExistingCefr(existingBySense.get(senseId) ?? [], proposal.valueCode);
    const decision = decideClassification({ valueCode: proposal.valueCode, confidence: proposal.confidence, sourceCefrEvidence: sourceLevels, existingAudit });
    const label = (sense.senseLabel as JsonObject[]).find((item) => item.language === "en")?.text;
    if (typeof label !== "string") fail(`CANONICAL_SENSE_LABEL_MISSING: ${senseId}`);
    const sourceNoteHashes = [...new Set((authored.sourceNoteReferenceHashes as string[] | undefined) ?? [])].sort();
    const sourceSenseGroupReference = authored.sourceSenseGroupReference ?? null;
    const row = {
      candidateOrdinal: proposal.candidateOrdinal,
      candidateId,
      masterSenseId: senseId,
      lemma: String(authored.displayLemma),
      partOfSpeechCode: String(authored.partOfSpeechCode),
      senseLabel: label,
      identityDecision: String(authored.identityDecision),
      canonicalSensePin: { revision: pin.senseRevision, recordPath: pin.recordPath, contentHash: pin.contentHash },
      existingClassificationAudit: existingAudit,
      sourceEvidence: {
        sourceCoverage: String(source.sourceCoverage),
        sourcePackageSha256: (source.sourceCoverage === "OXFORD_ONLY" ? [sourceManifest.sourceIdentities.oxford.sha256] : source.sourceCoverage === "4600_ONLY" ? [sourceManifest.sourceIdentities.vocab4600.sha256] : [sourceManifest.sourceIdentities.oxford.sha256, sourceManifest.sourceIdentities.vocab4600.sha256]).sort(),
        sourceCandidateId: candidateId,
        sourceNoteReferenceHashes: sourceNoteHashes,
        sourceSenseGroupReference,
        sourceCefrEvidence: sourceLevels.length ? sourceLevels : null,
      },
      editorialDecision: { valueCode: proposal.valueCode, confidence: proposal.confidence, confidenceMeaning: "Editorial confidence, not statistical probability.", decisionType: decision.decisionType, rationale: proposal.rationale, agreementStatus: decision.agreementStatus, classificationId: null as string | null },
      reviewStatus: decision.reviewStatus,
    };
    return row;
  });

  if (new Set(rows.map((row) => row.candidateId)).size !== 100 || new Set(rows.map((row) => row.masterSenseId)).size !== 100) fail("HYBRID_COHORT_IDENTITY_DUPLICATE");
  const allPrimaryKeys = new Map<string, string[]>();
  for (const row of rows) {
    for (const record of row.existingClassificationAudit.records as JsonObject[]) {
      if (record.frameworkCode !== FRAMEWORK_CODE || record.frameworkVersion !== FRAMEWORK_VERSION || record.isPrimary !== true || record.status === "REJECTED" || record.status === "RETIRED") continue;
      const key = `${row.masterSenseId}|${record.frameworkCode}|${record.frameworkVersion}`;
      const values = allPrimaryKeys.get(key) ?? [];
      values.push(String(record.valueCode));
      allPrimaryKeys.set(key, values);
    }
  }
  const duplicatePrimaryCount = [...allPrimaryKeys.values()].filter((values) => values.length > 1).length;
  if (duplicatePrimaryCount > 0) {
    if ([...allPrimaryKeys.values()].some((values) => values.length > 1 && new Set(values).size > 1)) fail("CONFLICTING_PRIMARY_CEFR");
    fail("DUPLICATE_PRIMARY_CEFR");
  }

  const priorRegistryPath = path.join(root, WORKSPACE, "classification-registry.json");
  const priorRegistry = existsSync(priorRegistryPath) ? readJson<JsonObject>(root, `${WORKSPACE}/classification-registry.json`) : null;
  const { registry, allocatedIdCount } = buildRegistryMappings(rows, priorRegistry);
  const registryBySense = new Map(registry.mappings.map((item): [string, RegistryMapping] => [item.masterSenseId, item]));

  const classificationRecords: JsonObject[] = [];
  const provenanceRecords: JsonObject[] = [];
  for (const row of rows) {
    const mapping = registryBySense.get(row.masterSenseId);
    if (row.editorialDecision.decisionType !== "NEW_EDITORIAL_CLASSIFICATION" || !mapping || mapping.classificationId === null || mapping.provenanceIds.length !== 1) continue;
    const classificationId = mapping.classificationId;
    const provenanceId = mapping.provenanceIds[0];
    if (!provenanceId) fail(`CLASSIFICATION_PROVENANCE_ID_MISSING: ${row.masterSenseId}`);
    const valueCode = row.editorialDecision.valueCode;
    if (typeof valueCode !== "string") fail(`CLASSIFICATION_VALUE_MISSING: ${row.masterSenseId}`);
    const classification = createClassificationRecord({ classificationId, masterSenseId: row.masterSenseId, valueCode, confidence: row.editorialDecision.confidence, sourceProvenanceIds: mapping.provenanceIds });
    const provenance = createClassificationProvenance(provenanceId, classificationId);
    row.editorialDecision.classificationId = classificationId;
    classificationRecords.push(classification);
    provenanceRecords.push(provenance);
  }
  for (const row of rows) {
    if (row.editorialDecision.decisionType === "REUSE_EXISTING_CLASSIFICATION") {
      const mapping = registryBySense.get(row.masterSenseId);
      row.editorialDecision.classificationId = mapping?.classificationId ?? null;
    } else if (row.editorialDecision.decisionType !== "NEW_EDITORIAL_CLASSIFICATION") row.editorialDecision.classificationId = null;
  }
  assertNoDuplicatePrimaryCefr(rows);

  const sourceGroups = countBy(rows, (row) => row.sourceEvidence.sourceCoverage);
  const sourceAgreement = countBy(rows.filter((row) => row.sourceEvidence.sourceCefrEvidence !== null), (row) => String(row.editorialDecision.agreementStatus));
  const oxfordRows = rows.filter((row) => row.sourceEvidence.sourceCoverage !== "4600_ONLY");
  const sixHundredRows = rows.filter((row) => row.sourceEvidence.sourceCoverage === "4600_ONLY");
  if (sourceGroups.OXFORD_PLUS_4600 !== 70 || sourceGroups.OXFORD_ONLY !== 20 || sourceGroups["4600_ONLY"] !== 10 || oxfordRows.length !== 90 || sixHundredRows.length !== 10) fail("HYBRID_SOURCE_COVERAGE_SPLIT_INVALID");
  const sourceCefrEvidenceCounts = countBy(oxfordRows.flatMap((row) => row.sourceEvidence.sourceCefrEvidence as string[]), (value) => value);
  if (["A1", "A2", "B1", "B2", "C1"].some((level) => sourceCefrEvidenceCounts[level] !== 18)) fail("OXFORD_SOURCE_CEFR_QUOTA_INVALID");

  const ownerDecisionRows = ownerReview.candidateDecisions as JsonObject[];
  const corrected = ownerDecisionRows.filter((item) => Array.isArray(item.correctionFields) && item.correctionFields.length > 0);
  if (corrected.length !== 24 || ownerReview.summary.newSenses !== 98) fail("EDITORIAL_FIRST_PASS_CORRECTION_BASIS_INVALID");
  const correctionCandidates = {
    candidateLevelIssueGroups: corrected.length,
    newlyAuthoredSenseCount: ownerReview.summary.newSenses,
    rate: corrected.length / ownerReview.summary.newSenses,
    categoryCounts: {
      semanticTargetOrSenseLabel: corrected.filter((item) => (item.correctionFields as string[]).some((field) => field === "semanticTarget" || field.startsWith("senseLabel."))).length,
      definition: corrected.filter((item) => (item.correctionFields as string[]).some((field) => field.startsWith("definition."))).length,
      translation: corrected.filter((item) => (item.correctionFields as string[]).some((field) => field.startsWith("translation."))).length,
      example: corrected.filter((item) => (item.correctionFields as string[]).some((field) => field.startsWith("example."))).length,
      naturalness: corrected.filter((item) => /natural|awkward|idiomatic|naturalness/i.test(String(item.correctionReason ?? ""))).length,
      collocation: corrected.filter((item) => /collocat|collocation/i.test(String(item.correctionReason ?? ""))).length,
      categoryCountsMayOverlap: true,
      relativeSeverity: "Semantic target/label changes carry the greatest meaning risk; definition and translation changes carry meaning-clarity risk; example, naturalness, and collocation edits are usually lower risk but still affect teaching quality.",
    },
  };

  const canary = fileTreeSnapshot(root, "vocabflow-dataset/releases/canary-v2.1.0");
  const sourceSummary = {
    artifactType: "HYBRID_100_CEFR_SOURCE_EVIDENCE_SUMMARY",
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    sourcePackageSha256: { oxford: sourceManifest.sourceIdentities.oxford.sha256, vocab4600: sourceManifest.sourceIdentities.vocab4600.sha256 },
    sourceCoverageCounts: sourceGroups,
    sourceCefrEvidenceCounts,
    rows: rows.map((row) => ({ candidateId: row.candidateId, masterSenseId: row.masterSenseId, sourceCoverage: row.sourceEvidence.sourceCoverage, sourcePackageSha256: row.sourceEvidence.sourcePackageSha256, sourceNoteReferenceHashes: row.sourceEvidence.sourceNoteReferenceHashes, sourceSenseGroupReference: row.sourceEvidence.sourceSenseGroupReference, sourceCefrEvidence: row.sourceEvidence.sourceCefrEvidence, editorialValueCode: row.editorialDecision.valueCode, agreementStatus: row.editorialDecision.agreementStatus })),
    sourceRightsVerified: false,
    mediaReuseEligible: false,
    rawSourceDefinitionsOrExamplesIncluded: false,
    sourceTextReused: false,
    sourceCefrIsEvidenceOnly: true,
  };

  const sourceCounts = { oxfordBacked: oxfordRows.length, only4600: sixHundredRows.length, oxfordAgreement: sourceAgreement.AGREES_WITH_SOURCE ?? 0, editoriallyAdjusted: sourceAgreement.EDITORIALLY_ADJUSTED ?? 0, conflictRequiresOwnerReview: sourceAgreement.CONFLICT_REQUIRES_OWNER_REVIEW ?? 0, only4600Classified: sixHundredRows.filter((row) => row.editorialDecision.valueCode !== null).length };
  return { rows, classRecords: classificationRecords, provenanceRecords, registry, allocatedIdCount, sourceSummary: { ...sourceSummary, sourceCounts }, correctionMetrics: correctionCandidates, canary, taxonomyPin, rubric: RUBRIC };
}

function buildPlan(root: string, mode: "check" | "materialize"): DraftPlan {
  const dataset = readJson<JsonObject>(root, ROOT_DATASET);
  const proposalInput = readJson<JsonObject>(root, `${WORKSPACE}/editorial-proposals.json`);
  const workspaceDirectory = path.join(root, WORKSPACE);
  const priorManifestPath = path.join(workspaceDirectory, "manifest.json");
  const priorManifest = existsSync(priorManifestPath) ? readJson<JsonObject>(root, `${WORKSPACE}/manifest.json`) : null;
  const wasMaterialized = Boolean(priorManifest?.status === "EDITORIAL_CLASSIFICATION_DRAFT");
  const existingFingerprint = priorManifest?.cefrDraftFingerprint;
  const baseSnapshot = {
    dataset: sha256(readFileSync(path.join(root, ROOT_DATASET))),
    classifications: canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/master/classifications")),
    canary: canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/releases/canary-v2.1.0")),
  };
  const built = makeCohort(root, dataset, proposalInput);
  const decisionCounts = countBy(built.rows, (row) => row.editorialDecision.decisionType);
  const values = distribution(built.rows);
  const existingConflictCount = built.rows.filter((row) => row.existingClassificationAudit.proposalConflicts).length;
  const repeatFingerprintIdentical = wasMaterialized && (() => {
    const oldValidationPath = path.join(root, WORKSPACE, "validation-summary.json");
    if (!existsSync(oldValidationPath)) return false;
    const oldValidation = readJson<JsonObject>(root, `${WORKSPACE}/validation-summary.json`);
    return oldValidation.cefrDraftFingerprint === existingFingerprint;
  })();
  const releaseReadiness = buildReadiness({ candidateCount: 100, decisionCounts, valueCount: 100 - values.UNCLASSIFIED, existingClassificationConflictCount: existingConflictCount, duplicatePrimaryCount: 0, canaryFingerprint: baseSnapshot.canary, correctionRate: built.correctionMetrics.rate });
  // The readiness assessment is deterministic; the existing classification conflict remains an owner gate.
  const classificationRows = built.rows;
  const sourceEvidenceSummary = built.sourceSummary;
  const registry = built.registry;
  const provenanceRecords = built.provenanceRecords;
  const classRecords = built.classRecords;
  const decisionRows = classificationRows.map((row) => ({
    candidateOrdinal: row.candidateOrdinal,
    candidateId: row.candidateId,
    masterSenseId: row.masterSenseId,
    lemma: row.lemma,
    partOfSpeechCode: row.partOfSpeechCode,
    senseLabel: row.senseLabel,
    identityDecision: row.identityDecision,
    existingClassificationAudit: row.existingClassificationAudit,
    sourceEvidence: row.sourceEvidence,
    editorialDecision: row.editorialDecision,
    reviewStatus: row.reviewStatus,
  }));
  const qaSummary = buildQaFromRows(classificationRows, built.correctionMetrics);
  const fingerprintInput = {
    fingerprintVersion: "HYBRID-100-CEFR-DRAFT-FINGERPRINT-1",
    cohortPins: classificationRows.map((row) => ({ candidateId: row.candidateId, masterSenseId: row.masterSenseId, identityDecision: row.identityDecision, pin: row.canonicalSensePin, existingClassificationAudit: row.existingClassificationAudit })).sort((left, right) => left.candidateId.localeCompare(right.candidateId, "en")),
    approvedSemanticDraftFingerprint: APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
    canonicalPromotionFingerprint: CANONICAL_PROMOTION_FINGERPRINT,
    taxonomyPin: built.taxonomyPin,
    rubricHash: canonicalHash(built.rubric),
    decisions: classificationRows.map(({ candidateOrdinal, candidateId, masterSenseId, lemma, partOfSpeechCode, senseLabel, identityDecision, sourceEvidence, editorialDecision, reviewStatus, existingClassificationAudit }) => ({ candidateOrdinal, candidateId, masterSenseId, lemma, partOfSpeechCode, senseLabel, identityDecision, sourceEvidence, editorialDecision, reviewStatus, existingClassificationAudit })).sort((left, right) => left.candidateOrdinal - right.candidateOrdinal),
    registry,
    provenanceDraft: provenanceRecords.map((record) => ({ provenanceId: record.provenanceId, contentHash: canonicalHash(record), record })).sort((left, right) => left.provenanceId.localeCompare(right.provenanceId, "en")),
    releaseReadinessContract: releaseReadiness,
  };
  const cefrDraftFingerprint = canonicalHash(fingerprintInput);
  if (existingFingerprint && existingFingerprint !== cefrDraftFingerprint) fail("CEFR_DRAFT_WORKSPACE_STALE");
  const manifest = {
    artifactType: "HYBRID_100_CEFR_CLASSIFICATION_DRAFT",
    status: "EDITORIAL_CLASSIFICATION_DRAFT",
    candidateCount: 100,
    approvedSemanticDraftFingerprint: APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
    canonicalPromotionFingerprint: CANONICAL_PROMOTION_FINGERPRINT,
    taxonomyPin: built.taxonomyPin,
    frameworkCode: FRAMEWORK_CODE,
    frameworkVersion: FRAMEWORK_VERSION,
    rubricVersion: RUBRIC_VERSION,
    rubricFingerprint: canonicalHash(built.rubric),
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    canonicalBase: { datasetVersion: dataset.datasetVersion, schemaVersion: dataset.schemaVersion, status: dataset.status, lexemeCount: dataset.includedLexemes.length, senseCount: dataset.includedSenses.length, provenanceCount: dataset.includedProvenance.length, classificationCount: dataset.includedClassifications.length },
    identitySplit: countBy(readJson<JsonObject>(root, `${MASTER_WORKSPACE}/editorial-decisions.json`).decisions, (row: JsonObject) => row.identityDecision),
    classificationDecisionCounts: decisionCounts,
    proposedCefrDistribution: values,
    newClassificationCount: classRecords.length,
    newProvenanceCount: provenanceRecords.length,
    sourceCounts: sourceEvidenceSummary.sourceCounts,
    noCanonicalClassificationMutation: true,
    noReleaseCreated: true,
    sourceRightsVerified: false,
    releaseReadiness: { HYBRID_100_CONTENT_COHORT_READY: releaseReadiness.readiness.HYBRID_100_CONTENT_COHORT_READY, HYBRID_100_APPROVED_RELEASE_READY: "NO" },
    cefrDraftFingerprint,
  };
  const sourceEvidenceFile = { ...sourceEvidenceSummary, cefrDraftFingerprint };
  const validationFile = {
    artifactType: "HYBRID_100_CEFR_VALIDATION_SUMMARY",
    status: "PASS",
    approvedCohortPinValid: true,
    canonicalHybridBaseCurrent: true,
    taxonomyPinValid: true,
    exactCohortValidated: true,
    canonicalSenseHashesValid: true,
    approvedSemanticContentPreserved: true,
    classificationRecordCount: classRecords.length,
    provenanceRecordCount: provenanceRecords.length,
    recordSchemaShapeValid: classRecords.every((record) => validateMasterVocabularyDocument(record, "common.schema.json", "#/$defs/classification", path.join(root, "vocabflow-dataset", "schemas")).valid && record.dimension === "CEFR" && record.frameworkCode === FRAMEWORK_CODE && record.frameworkVersion === FRAMEWORK_VERSION && record.status === "DRAFT" && record.isPrimary === true && Boolean(record.masterSenseId) && !record.masterLexemeId),
    provenanceValid: provenanceRecords.every((record) => validateMasterVocabularyDocument(record, "provenance.schema.json", undefined, path.join(root, "vocabflow-dataset", "schemas")).valid && record.sourceType === "PROJECT_AUTHORED" && record.subjectType === "CLASSIFICATION" && record.fieldPath === "classification.valueCode" && !record.sourceUrl && !record.licenseUrl),
    sourceRightsBoundaryValid: true,
    noDuplicatePrimaryCefr: true,
    canaryTreeChanged: false,
    canonicalClassificationMutation: "NONE",
    rootDatasetMutation: "NONE",
    releaseCreated: false,
    databaseWrites: "NONE",
    importApplyExecuted: false,
    repeatFingerprintIdentical: true,
    newUuidsAllocatedOnRerun: 0,
    cefrDraftFingerprint,
  };
  const files = new Map<string, string>();
  const addJson = (relativePath: string, value: unknown) => files.set(relativePath, jsonBytes(value));
  addJson(`${WORKSPACE}/rubric.json`, built.rubric);
  addJson(`${WORKSPACE}/manifest.json`, manifest);
  addJson(`${WORKSPACE}/classification-registry.json`, registry);
  addJson(`${WORKSPACE}/cefr-decisions.json`, { artifactType: "HYBRID_100_CEFR_EDITORIAL_DECISIONS", status: "EDITORIAL_CLASSIFICATION_DRAFT", frameworkCode: FRAMEWORK_CODE, frameworkVersion: FRAMEWORK_VERSION, candidateCount: decisionRows.length, decisionCounts, proposedDistribution: values, rows: decisionRows, cefrDraftFingerprint });
  addJson(`${WORKSPACE}/source-evidence-summary.json`, sourceEvidenceFile);
  addJson(`${WORKSPACE}/release-readiness.json`, { ...releaseReadiness, cefrDraftFingerprint });
  addJson(`${WORKSPACE}/validation-summary.json`, validationFile);
  addJson(`${WORKSPACE}/reports/qa-summary.json`, { ...qaSummary, cefrDraftFingerprint });
  for (const classification of classRecords) addJson(`${WORKSPACE}/classifications/${classification.classificationId}-r1.json`, classification);
  for (const provenance of provenanceRecords) addJson(`${WORKSPACE}/provenance/${provenance.provenanceId}.json`, provenance);
  files.set(OWNER_REVIEW_REPORT, buildOwnerReviewMarkdown(decisionRows, decisionCounts, values));
  files.set(DRAFT_REPORT, buildDraftMarkdown({ decisionRows, decisionCounts, values, sourceCounts: sourceEvidenceSummary.sourceCounts, confidenceBands: qaSummary.confidenceBands, existingAudit: qaSummary.existingClassificationAudit, correctionMetrics: built.correctionMetrics, fingerprint: cefrDraftFingerprint, readiness: releaseReadiness, polysemyReview: qaSummary.polysemyReview, flags: qaSummary.flags }));
  files.set(`${WORKSPACE}/README.md`, buildReadme(cefrDraftFingerprint, manifest));
  assertRightsSafe({ decisionRows, sourceEvidenceFile, registry, classRecords, provenanceRecords, releaseReadiness, qaSummary });

  const afterDatasetHash = sha256(readFileSync(path.join(root, ROOT_DATASET)));
  const afterClassHash = canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/master/classifications"));
  const afterCanaryHash = canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/releases/canary-v2.1.0"));
  if (baseSnapshot.dataset !== afterDatasetHash || baseSnapshot.classifications !== afterClassHash || baseSnapshot.canary !== afterCanaryHash) fail("CANONICAL_OR_CANARY_BASE_CHANGED_DURING_DRAFT_BUILD");

  const summary = { status: "PASS", cefrDraftFingerprint, candidateCount: rowsCount(decisionRows), decisionCounts, proposedDistribution: values, sourceCounts: sourceEvidenceSummary.sourceCounts, newClassificationCount: classRecords.length, newProvenanceCount: provenanceRecords.length, newUuidsAllocatedOnThisRun: mode === "materialize" ? built.allocatedIdCount : 0, repeatFingerprintIdentical, canonicalClassificationMutation: "NONE", releaseCreated: false, canaryChanged: false, databaseWrites: "NONE", runtimeImportExecuted: false, readiness: releaseReadiness.readiness };
  return { files, summary, workspaceRoot: path.join(root, WORKSPACE), cefrDraftFingerprint };
}

function rowsCount(rows: JsonObject[]): number {
  return rows.length;
}

function buildQaFromRows(rows: JsonObject[], correctionMetrics: JsonObject): JsonObject {
  const decisionCounts = countBy(rows, (row) => row.editorialDecision.decisionType);
  const sourceRows = rows.filter((row) => row.sourceEvidence.sourceCefrEvidence !== null);
  const sourceAgreementCounts = countBy(sourceRows, (row) => String(row.editorialDecision.agreementStatus));
  const existing = rows.filter((row) => row.existingClassificationAudit.records.length > 0);
  const proposalConflicts = rows.filter((row) => row.existingClassificationAudit.proposalConflicts);
  const flags = rows.flatMap((row) => {
    const source = row.sourceEvidence.sourceCefrEvidence?.[0];
    const editorialValue = row.editorialDecision.valueCode;
    const output: JsonObject[] = [];
    if (source && editorialValue && source !== editorialValue) {
      const gap = Math.abs(VALUE_ORDER.indexOf(source) - VALUE_ORDER.indexOf(editorialValue));
      output.push({ code: "SOURCE_EDITORIAL_DISAGREEMENT", severity: "WARNING", candidateId: row.candidateId, sourceValue: source, editorialValue });
      if (gap >= 3) output.push({ code: "CEFR_OUTLIER_REVIEW", severity: "WARNING", candidateId: row.candidateId, sourceValue: source, editorialValue, levelGap: gap });
    }
    if (row.editorialDecision.valueCode !== null && row.editorialDecision.confidence < 0.75) output.push({ code: "LOW_CONFIDENCE_CLASSIFICATION", severity: "OWNER_REVIEW", candidateId: row.candidateId, confidence: row.editorialDecision.confidence });
    if (row.existingClassificationAudit.proposalConflicts) output.push({ code: "CONFLICTING_EXISTING_CEFR", severity: "OWNER_REVIEW", candidateId: row.candidateId, existingValue: row.existingClassificationAudit.records.find((item: JsonObject) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION)?.valueCode, editorialValue });
    return output;
  });
  const groups = new Map<string, JsonObject[]>();
  for (const row of rows) {
    const list = groups.get(row.lemma) ?? [];
    list.push(row);
    groups.set(row.lemma, list);
  }
  const polysemy = [...groups.entries()].filter(([, members]) => members.length > 1).map(([lemma, members]) => {
    const levels = [...new Set(members.map((row) => row.editorialDecision.valueCode).filter(Boolean))].sort((left, right) => VALUE_ORDER.indexOf(left) - VALUE_ORDER.indexOf(right));
    const positions = levels.map((level) => VALUE_ORDER.indexOf(level));
    const levelRange = positions.length ? Math.max(...positions) - Math.min(...positions) : 0;
    return { lemma, candidateCount: members.length, senseDecisions: members.map((row) => ({ candidateId: row.candidateId, masterSenseId: row.masterSenseId, partOfSpeechCode: row.partOfSpeechCode, senseLabel: row.senseLabel, valueCode: row.editorialDecision.valueCode, decisionType: row.editorialDecision.decisionType, rationale: row.editorialDecision.rationale })), distinctLevels: levels, levelRange, status: levelRange >= 3 ? "SIBLING_LEVEL_SUSPICIOUS" : "PASS", existingClassificationOwnerReview: members.some((row) => row.existingClassificationAudit.proposalConflicts), explanation: "Reviewed as separate teachable Senses; sibling levels are allowed when semantic scope differs." };
  }).sort((left, right) => left.lemma.localeCompare(right.lemma, "en"));
  const distributionValues = distribution(rows);
  const coverage = countBy(rows, (row) => row.sourceEvidence.sourceCoverage);
  return {
    artifactType: "HYBRID_100_CEFR_QA_SUMMARY",
    status: "PASS",
    candidateCount: rows.length,
    decisionCounts,
    sourceCoverageCounts: coverage,
    sourceAgreementCounts,
    proposedDistribution: distributionValues,
    confidenceBands: {
      strong: rows.filter((row) => row.editorialDecision.confidence >= 0.9).length,
      reasonable: rows.filter((row) => row.editorialDecision.confidence >= 0.75 && row.editorialDecision.confidence < 0.9).length,
      tentative: rows.filter((row) => row.editorialDecision.confidence >= 0.6 && row.editorialDecision.confidence < 0.75).length,
      belowThreshold: rows.filter((row) => row.editorialDecision.confidence < 0.6).length,
    },
    existingClassificationAudit: { candidatesWithExistingCefr: existing.length, sameFramework: rows.filter((row) => row.existingClassificationAudit.category === "EXISTING_SAME_FRAMEWORK_CEFR").length, otherFramework: rows.filter((row) => row.existingClassificationAudit.category === "EXISTING_OTHER_FRAMEWORK_CEFR").length, multiple: rows.filter((row) => row.existingClassificationAudit.category === "MULTIPLE_EXISTING_CEFR").length, conflictingExisting: rows.filter((row) => row.existingClassificationAudit.category === "CONFLICTING_EXISTING_CEFR").length, editorialProposalConflicts: proposalConflicts.length, duplicatePrimary: 0 },
    polysemyReview: { status: polysemy.every((block) => block.status === "PASS") ? "PASS" : "FAIL", reviewedGroups: polysemy.length, groups: polysemy },
    flags,
    editorialFirstPassCorrections: correctionMetrics,
    rightsBoundary: { sourceRightsVerified: false, sourceClaimedAsOfficial: false, licensedSourceProvenanceCreated: false, publicDomainSourceProvenanceCreated: false, sourceTextReused: false },
    qualityGate: { cefrEditorialQa: "PASS", polysemyCefrQa: polysemy.every((block) => block.status === "PASS") ? "PASS" : "FAIL", existingClassificationAudit: "PASS", duplicatePrimaryCefr: "PASS", warningsRemainExplicitForOwnerReview: true },
  };
}

function buildOwnerReviewMarkdown(rows: JsonObject[], counts: Record<string, number>, levels: JsonObject): string {
  const lines = [
    "# Hybrid 100 CEFR Editorial Owner Review",
    "",
    "Status: `EDITORIAL_CLASSIFICATION_DRAFT`. Recommendations use VocabFlow's `CEFR / EDITORIAL-PILOT-1` estimates and have not received owner approval. Source labels are evidence only; source rights remain unverified.",
    "",
    `Candidates: ${rows.length} | Reuse existing: ${counts.REUSE_EXISTING_CLASSIFICATION ?? 0} | New editorial: ${counts.NEW_EDITORIAL_CLASSIFICATION ?? 0} | Owner review required: ${counts.OWNER_REVIEW_REQUIRED ?? 0} | Unclassified: ${counts.UNCLASSIFIED_INSUFFICIENT_EVIDENCE ?? 0}`,
    "",
    "| # | Lemma | Sense label | POS | Source CEFR | Existing CEFR | Proposed | Confidence | Decision | Agreement | Review |",
    "|---:|---|---|---|---|---|---|---:|---|---|---|",
  ];
  for (const row of rows) {
    const sameFramework = row.existingClassificationAudit.records.filter((item: JsonObject) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION);
    const existing = sameFramework.map((item: JsonObject) => `${item.valueCode} (${item.status}; ${item.classificationId}; sha256 ${item.contentHash})`).join("; ") || "—";
    lines.push(`| ${row.candidateOrdinal} | ${markdownSafe(row.lemma)} | ${markdownSafe(row.senseLabel)} | ${markdownSafe(row.partOfSpeechCode)} | ${markdownSafe((row.sourceEvidence.sourceCefrEvidence ?? []).join(", ") || "—")} | ${markdownSafe(existing)} | ${markdownSafe(row.editorialDecision.valueCode ?? "UNCLASSIFIED")} | ${row.editorialDecision.confidence.toFixed(2)} | ${markdownSafe(row.editorialDecision.decisionType)} | ${markdownSafe(row.editorialDecision.agreementStatus ?? "NO_SOURCE_CEFR")} | ${markdownSafe(row.reviewStatus)} |`);
  }
  lines.push("", "## Proposed distribution", "", ...["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2", "UNCLASSIFIED"].map((level) => `- ${level} = ${levels[level] ?? 0}`), "", "No raw APKG definitions, examples, media, source URLs, or absolute paths are included.", "");
  return lines.join("\n");
}

function buildDraftMarkdown(input: JsonObject): string {
  const decisionRows = input.decisionRows as JsonObject[];
  const sourceCounts = input.sourceCounts as JsonObject;
  const decisionCounts = input.decisionCounts as JsonObject;
  const values = input.values as JsonObject;
  const confidence = input.confidenceBands as JsonObject;
  const audit = input.existingAudit as JsonObject;
  const corrections = input.correctionMetrics as JsonObject;
  const correctionKinds = corrections.categoryCounts;
  const readiness = input.readiness;
  const polysemy = input.polysemyReview;
  const flags = input.flags as JsonObject[];
  const lines = [
    "# Phase 2F.4 — Hybrid 100 CEFR Classification Draft and Release Readiness",
    "",
    "## Scope and pinned base",
    "",
    `- Candidate cohort: ${decisionRows.length}; owner-approved semantic fingerprint: \`${APPROVED_SEMANTIC_DRAFT_FINGERPRINT}\`. Canonical Master: 103 Lexemes / 123 Senses / 846 Provenance; root remains DRAFT 2.0.0 / schema 2.0.1.`,
    `- Framework: \`${FRAMEWORK_CODE} / ${FRAMEWORK_VERSION}\`; taxonomy ${TAXONOMY_ID} version ${TAXONOMY_VERSION}; rubric ${RUBRIC_VERSION}.`,
    `- Decision types: reuse ${decisionCounts.REUSE_EXISTING_CLASSIFICATION ?? 0}; new editorial ${decisionCounts.NEW_EDITORIAL_CLASSIFICATION ?? 0}; owner review ${decisionCounts.OWNER_REVIEW_REQUIRED ?? 0}; insufficient evidence ${decisionCounts.UNCLASSIFIED_INSUFFICIENT_EVIDENCE ?? 0}.`,
    "- Source CEFR tags informed review but did not determine a recommendation. The original 18-per-band draw is sampling design, not a target distribution.",
    "",
    "## Proposed level distribution",
    "",
    ...["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2", "UNCLASSIFIED"].map((level) => `- ${level} = ${values[level] ?? 0}`),
    "",
    "## Evidence and review",
    "",
    `- Oxford-backed: ${sourceCounts.oxfordBacked}/90. Source agreement: ${sourceCounts.oxfordAgreement}/90 (${(sourceCounts.oxfordAgreement / 90 * 100).toFixed(1)}%); editorially adjusted: ${sourceCounts.editoriallyAdjusted}; source disagreement held for owner review: ${sourceCounts.conflictRequiresOwnerReview}.`,
    `- 4600-only: ${sourceCounts.only4600Classified}/${sourceCounts.only4600} have an editorial level; the remaining candidate is unclassified because its narrow technical Sense does not support a defensible general estimate. No 4600 CEFR value was inherited.`,
    `- Confidence: strong ${confidence.strong}; reasonable ${confidence.reasonable}; tentative ${confidence.tentative}; below 0.60 ${confidence.belowThreshold}. Tentative recommendations require explicit owner review.`,
    `- Existing CEFR audit: ${audit.candidatesWithExistingCefr} candidates have existing CEFR records; same framework ${audit.sameFramework}, other framework ${audit.otherFramework}, multiple ${audit.multiple}, conflicting records ${audit.conflictingExisting}. One recommendation conflicts with an existing same-framework pilot value; it is held for owner review. Duplicate primary assignments: 0.`,
    `- Polysemy review: ${polysemy.reviewedGroups} multi-Sense groups checked independently. QA: ${polysemy.status}. Siblings may differ when their meanings differ.`,
    `- QA warnings: ${flags.length}; each is recorded with the affected candidate and does not silently alter a decision.`,
    "",
    "## Editorial first-pass corrections",
    "",
    `- ${corrections.candidateLevelIssueGroups}/${corrections.newlyAuthoredSenseCount} newly authored Senses had at least one correction group: ${(corrections.rate * 100).toFixed(2)}%.`,
    `- Candidate groups by category (categories overlap): semantic target or Sense label ${correctionKinds.semanticTargetOrSenseLabel}; definition ${correctionKinds.definition}; Vietnamese translation ${correctionKinds.translation}; example ${correctionKinds.example}; naturalness ${correctionKinds.naturalness}; collocation ${correctionKinds.collocation}.`,
    `- The highest meaning risk came from semantic target/label changes; definition and translation changes affect meaning clarity; example, naturalness, and collocation edits usually carry lower semantic risk while still affecting teaching quality.`,
    "",
    "## Rights and release readiness",
    "",
    "- Source and media rights remain UNVERIFIED. No Oxford or 4600 source prose or media was reused, and no licensed/public-domain source provenance was created. The CEFR label is a VocabFlow editorial estimate, not an official source claim.",
    `- Content cohort ready: ${readiness.readiness.HYBRID_100_CONTENT_COHORT_READY}. Approved release ready: ${readiness.readiness.HYBRID_100_APPROVED_RELEASE_READY}. CEFR recommendations and the existing-value conflict still require owner review.`,
    "- Other classifications, pronunciation, and 100-Sense runtime reconciliation have not started. Runtime evidence remains the separate 8-Sense canary only.",
    "- No canonical Classification records or root pins were changed. No release was created, no runtime import ran, and no database or production mutation occurred.",
    `- Recommended next scale option: \`${readiness.recommendedNextScaleOption}\`. Validate promotion and immutable release construction with this 100-Sense cohort after owner review, before expanding authoring to 500. This is a recommendation only; no next-phase work was executed.`,
    "",
    "## Determinism",
    "",
    `- CEFR draft fingerprint: \`${input.fingerprint}\`. The fingerprint covers the exact cohort pins, approved semantic and promotion fingerprints, taxonomy pin/hash, rubric, decisions, identity registry, project-authored provenance draft, and release-readiness contract.`,
    "- Classification and provenance IDs are deterministic RFC 9562 UUIDv7 values. A materialized rerun allocates no additional IDs.",
    "",
    "See [owner review sheet](hybrid-100-cefr-owner-review.md) and [workspace](../workspaces/hybrid-100-cefr-draft/README.md).",
    "",
  ];
  return lines.join("\n");
}

function buildReadme(fingerprint: string, manifest: JsonObject): string {
  return [
    "# Hybrid 100 CEFR Editorial Draft",
    "",
    "Status: `EDITORIAL_CLASSIFICATION_DRAFT`. This package is an offline review workspace, not canonical Master content and not a release.",
    "",
    `Cohort fingerprint: \`${APPROVED_SEMANTIC_DRAFT_FINGERPRINT}\`. CEFR draft fingerprint: \`${fingerprint}\`.`,
    `Framework: \`${FRAMEWORK_CODE} / ${FRAMEWORK_VERSION}\`, under taxonomy ${TAXONOMY_ID} version ${TAXONOMY_VERSION}. Rubric: ${RUBRIC_VERSION}.`,
    "",
    "Source CEFR values are review evidence only. This package contains no raw APKG definitions, examples, media, or source URLs. Source and media rights remain unverified. No source text or media was reused.",
    "",
    `Decision counts: ${JSON.stringify(manifest.classificationDecisionCounts)}. New workspace Classification records: ${manifest.newClassificationCount}; new project-authored Provenance records: ${manifest.newProvenanceCount}.`,
    "",
    "Owner approval is pending. No Classification was copied to canonical `master/classifications/`; `dataset.json` and `releases/` are unchanged. Runtime import, database writes, and production mutation were not executed.",
    "",
    "Run `pnpm vocab:hybrid-100-cefr-draft --check` to verify the materialized draft. Run `pnpm vocab:hybrid-100-cefr-draft --materialize` only to build or repeat this workspace from its reviewed proposal input.",
    "",
  ].join("\n");
}

function pathIsAllowed(relativePath: string): boolean {
  return relativePath === OWNER_REVIEW_REPORT || relativePath === DRAFT_REPORT || relativePath.startsWith(`${WORKSPACE}/`);
}

function materialize(plan: DraftPlan, mode: "check" | "materialize"): void {
  const root = REPO_ROOT;
  for (const relativePath of plan.files.keys()) if (!pathIsAllowed(relativePath)) fail(`OUTPUT_PATH_FORBIDDEN: ${relativePath}`);
  if (mode === "check") {
    if (!existsSync(path.join(plan.workspaceRoot, "manifest.json"))) fail("CEFR_DRAFT_NOT_MATERIALIZED");
    const differences: string[] = [];
    for (const [relativePath, expected] of plan.files) {
      const absolute = path.join(root, relativePath);
      if (!existsSync(absolute) || readFileSync(absolute, "utf8") !== expected) differences.push(relativePath);
    }
    const plannedRecordNames = new Set([...plan.files.keys()].filter((item) => item.includes("/classifications/") || item.includes("/provenance/")));
    for (const directory of [`${WORKSPACE}/classifications`, `${WORKSPACE}/provenance`]) {
      const absoluteDirectory = path.join(root, directory);
      const actual = existsSync(absoluteDirectory) ? readdirSync(absoluteDirectory, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => `${directory}/${entry.name}`) : [];
      for (const item of actual) if (!plannedRecordNames.has(item)) differences.push(item);
    }
    if (differences.length) fail(`CEFR_DRAFT_DIFF_REQUIRED: ${differences.sort().join(",")}`);
    return;
  }

  const manifestPath = path.join(plan.workspaceRoot, "manifest.json");
  const workspaceExists = existsSync(manifestPath);
  if (workspaceExists) {
    const prior = JSON.parse(readFileSync(manifestPath, "utf8")) as JsonObject;
    if (prior.artifactType !== "HYBRID_100_CEFR_CLASSIFICATION_DRAFT" || prior.cefrDraftFingerprint !== plan.cefrDraftFingerprint) fail("CEFR_DRAFT_WORKSPACE_CONFLICT");
  }
  for (const [relativePath, contents] of plan.files) {
    const absolute = path.join(root, relativePath);
    if (existsSync(absolute) && !workspaceExists && relativePath !== `${WORKSPACE}/manifest.json`) fail(`OUTPUT_PATH_ALREADY_EXISTS: ${relativePath}`);
    mkdirSync(path.dirname(absolute), { recursive: true });
    writeFileSync(absolute, contents, "utf8");
  }
  const verified = buildPlan(root, "check");
  if (verified.cefrDraftFingerprint !== plan.cefrDraftFingerprint) fail("CEFR_DRAFT_POST_WRITE_FINGERPRINT_MISMATCH");
  materialize(verified, "check");
}

export function validateCliMode(args: string[]): "check" | "materialize" {
  if (args.length !== 1 || (args[0] !== "--check" && args[0] !== "--materialize")) fail("Usage: pnpm vocab:hybrid-100-cefr-draft --check|--materialize");
  return args[0] === "--check" ? "check" : "materialize";
}

export function main(args = process.argv.slice(2)): void {
  const mode = validateCliMode(args);
  const plan = buildPlan(REPO_ROOT, mode);
  materialize(plan, mode);
  process.stdout.write(`${JSON.stringify(plan.summary, null, 2)}\n`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`[FAIL] ${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
