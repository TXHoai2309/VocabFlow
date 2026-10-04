import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import canonicalize from "canonicalize";
import { version as uuidVersion } from "uuid";
import { validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type Pin = JsonObject & { recordPath: string; contentHash: string };
type PlannedRecord = { path: string; record: JsonObject; contentHash: string };

export const APPROVED_DRAFT_FINGERPRINT = "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d";
export const SOURCE_PROOF_FINGERPRINT = "89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc";
export const PROMOTION_CREATED_AT = "2026-10-04T14:45:42Z";
const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-editorial-draft";
const MANIFEST_PATH = "vocabflow-dataset/dataset.json";
const APPROVAL_PATH = `${WORKSPACE}/canonical-promotion.json`;
const REGISTRY_PATH = `${WORKSPACE}/canonical-promotion-registry.json`;
const SUMMARY_PATH = `${WORKSPACE}/canonical-promotion-summary.json`;
const REPORT_PATH = "vocabflow-dataset/reports/hybrid-100-canonical-promotion.md";
const EXPECTED_REUSED_SENSES = new Set([
  "01a0fc13-09ef-75ac-b815-039ab337c01a",
  "01a0fc13-09ee-7768-9be6-d20fa32521ee",
]);
const EXPECTED_EXISTING_LEXEMES = new Set([
  "01a0fc13-09ee-7fd1-8ad8-a2026a7620e0",
  "01a0fc13-09ef-7e5d-b757-aa456f0cd969",
]);
const SOURCE_NAME = "VocabFlow Hybrid 100-Sense Editorial Authoring";
const AUTHORED_NOTES = "Project-authored during the owner-reviewed hybrid 100-Sense proof; external APKG sources were used only as local semantic reference and their text was not reused.";
const OWNER_REVIEW_SOURCE_NAME = "VocabFlow Hybrid 100-Sense Owner Review";

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalHash(value: unknown): string {
  const serialized = canonicalize(value as never);
  if (serialized === undefined) throw new Error("Value cannot be represented by RFC 8785 canonical JSON.");
  return sha256(serialized);
}

function rawSerializedHash(value: unknown): string {
  return sha256(`${JSON.stringify(value, null, 2)}\n`);
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function jsonBytes(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sortedFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort((a, b) => a.localeCompare(b, "en"));
}

function objectsEqual(left: unknown, right: unknown): boolean {
  return canonicalHash(left) === canonicalHash(right);
}

export function stableUuidV7(purposeKey: string, createdAt = PROMOTION_CREATED_AT): string {
  const timestamp = Date.parse(createdAt);
  if (!Number.isFinite(timestamp) || timestamp < 0 || timestamp > 0xffffffffffff) {
    throw new Error("Promotion timestamp is not a valid UUIDv7 millisecond timestamp.");
  }
  const timeHex = Math.trunc(timestamp).toString(16).padStart(12, "0");
  const digest = sha256(`vocabflow-hybrid-100-canonical-promotion-v1:${APPROVED_DRAFT_FINGERPRINT}:${purposeKey}`);
  const randA = digest.slice(0, 3);
  const randB = digest.slice(3, 19).split("");
  randB[0] = ((parseInt(randB[0], 16) & 0x3) | 0x8).toString(16);
  const hex = `${timeHex}7${randA}${randB.join("")}`;
  const value = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  if (uuidVersion(value) !== 7) throw new Error("Deterministic provenance ID is not RFC 9562 UUIDv7.");
  return value;
}

function fail(message: string): never {
  throw new Error(message);
}

export function assertApprovalEvidence(approval: JsonObject, actualDraftFingerprint: string, sourceProofFingerprint: string): void {
  if (approval.ownerApproved !== true || approval.canonicalPromotionAuthorized !== true) fail("OWNER_APPROVAL_PIN_INVALID: owner approval and canonical promotion authorization must both be true.");
  if (approval.ownerApprovalScope !== "CANONICAL_DRAFT_PROMOTION_ONLY") fail("OWNER_APPROVAL_SCOPE_INVALID: only canonical DRAFT promotion is permitted.");
  if (approval.approvedCandidateCount !== 100) fail("OWNER_APPROVAL_COUNT_INVALID: exactly 100 approved decisions are required.");
  if (approval.approvedDraftFingerprint !== APPROVED_DRAFT_FINGERPRINT || actualDraftFingerprint !== APPROVED_DRAFT_FINGERPRINT) fail("APPROVED_DRAFT_PIN_INVALID: the owner-approved draft fingerprint changed.");
  if (approval.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT || sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT) fail("SOURCE_PROOF_PIN_INVALID: the source proof fingerprint changed.");
}

export function stableAuthoredContent(record: JsonObject): JsonObject {
  if (Array.isArray(record)) return record.map((item) => (item && typeof item === "object" ? stableAuthoredContent(item) : item)) as unknown as JsonObject;
  if (!record || typeof record !== "object") return record;
  const result: JsonObject = {};
  for (const [key, value] of Object.entries(record)) {
    if (key === "provenanceIds") continue;
    result[key] = Array.isArray(value)
      ? value.map((item) => (item && typeof item === "object" ? stableAuthoredContent(item) : item))
      : value && typeof value === "object" ? stableAuthoredContent(value) : value;
  }
  return result;
}

export function assertSemanticContentPreserved(workspaceSense: JsonObject, canonicalSense: JsonObject): void {
  if (!objectsEqual(stableAuthoredContent(workspaceSense), stableAuthoredContent(canonicalSense))) fail(`APPROVED_DRAFT_CONTENT_CHANGED: ${workspaceSense.masterSenseId}`);
}

export function assertIdentityDecisionCounts(decisions: JsonObject[], lexemes: JsonObject[], senses: JsonObject[]): void {
  const counts = new Map<string, number>();
  for (const decision of decisions) counts.set(decision.identityDecision, (counts.get(decision.identityDecision) ?? 0) + 1);
  if (decisions.length !== 100 || counts.get("REUSE_EXISTING_SENSE") !== 2 || counts.get("NEW_SENSE_EXISTING_LEXEME") !== 3 || counts.get("NEW_SENSE_NEW_LEXEME") !== 95) fail("IDENTITY_DECISION_COUNTS_INVALID: expected 2 reuse, 3 existing-Lexeme, and 95 new-Lexeme decisions.");
  if (lexemes.length !== 84 || senses.length !== 98) fail(`DRAFT_RECORD_COUNT_INVALID: got ${lexemes.length} Lexemes / ${senses.length} Senses.`);
  const reusedIds = new Set(decisions.filter((item) => item.identityDecision === "REUSE_EXISTING_SENSE").map((item) => item.masterSenseId));
  if (reusedIds.size !== 2 || [...EXPECTED_REUSED_SENSES].some((id) => !reusedIds.has(id))) fail("EXISTING_SENSE_REUSE_PIN_INVALID: the exact two reviewed Sense identities are required.");
  const existingLexemeIds = new Set(decisions.filter((item) => item.identityDecision === "NEW_SENSE_EXISTING_LEXEME").map((item) => item.masterLexemeId));
  if (existingLexemeIds.size !== EXPECTED_EXISTING_LEXEMES.size || [...EXPECTED_EXISTING_LEXEMES].some((id) => !existingLexemeIds.has(id))) fail("EXISTING_LEXEME_PIN_INVALID: light and reservation are the only existing Lexemes receiving new Senses.");
}

export function assertCanarySnapshotUnchanged(before: JsonObject[], after: JsonObject[]): void {
  if (!objectsEqual(before, after)) fail("CANARY_V2_1_0_CHANGED: current canary tree differs from the pre-promotion snapshot.");
}

export function assertOutputPathAvailable(existing: unknown, planned: unknown, outputPath: string): void {
  if (!objectsEqual(existing, planned)) fail(`MASTER_ID_COLLISION: destination path already contains different content: ${outputPath}`);
}

export function assertSenseOrderAvailable(orders: Map<string, Set<number>>, masterLexemeId: string, senseOrder: number): void {
  const current = orders.get(masterLexemeId) ?? new Set<number>();
  if (current.has(senseOrder)) fail(`SENSE_ORDER_COLLISION: ${masterLexemeId} already uses senseOrder ${senseOrder}.`);
  current.add(senseOrder);
  orders.set(masterLexemeId, current);
}

export function makeProvenanceRecord(input: {
  provenanceId: string;
  subjectType: "SENSE" | "LINGUISTIC_CHILD";
  subjectId: string;
  fieldPath: string;
  sourceType: "PROJECT_AUTHORED" | "OWNER_REVIEW";
  candidateId?: string;
}): JsonObject {
  if (input.sourceType === "PROJECT_AUTHORED") {
    return {
      provenanceId: input.provenanceId,
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      fieldPath: input.fieldPath,
      sourceType: "PROJECT_AUTHORED",
      sourceName: SOURCE_NAME,
      authoredBy: "VocabFlow project",
      notes: AUTHORED_NOTES,
      createdAt: PROMOTION_CREATED_AT,
    };
  }
  if (!input.candidateId) fail("OWNER_REVIEW_PROVENANCE_MISSING_CANDIDATE");
  return {
    provenanceId: input.provenanceId,
    subjectType: "SENSE",
    subjectId: input.subjectId,
    fieldPath: "sense.editorialDecision",
    sourceType: "OWNER_REVIEW",
    sourceName: OWNER_REVIEW_SOURCE_NAME,
    authoredBy: "VocabFlow project owner",
    notes: `Owner approved candidate ${input.candidateId} for canonical DRAFT promotion only; this does not approve learner-facing content for release.`,
    createdAt: PROMOTION_CREATED_AT,
  };
}

function makeProvenanceKey(sourceType: string, subjectId: string, fieldPath: string, candidateId?: string): string {
  return sourceType === "OWNER_REVIEW"
    ? `${sourceType}|${subjectId}|${candidateId}`
    : `${sourceType}|${subjectId}|${fieldPath}`;
}

function readWorkspaceFingerprint(repoRoot: string, workspaceRoot: string): { fingerprint: string; lexemes: JsonObject[]; senses: JsonObject[]; decisions: JsonObject[]; audit: JsonObject[]; registry: JsonObject } {
  const editorial = readJson<JsonObject>(path.join(workspaceRoot, "editorial-decisions.json"));
  const identityRegistry = readJson<JsonObject>(path.join(workspaceRoot, "identity-registry.json"));
  const auditPackage = readJson<JsonObject>(path.join(workspaceRoot, "authorship-audit.json"));
  const candidateMap = readJson<JsonObject[]>(path.join(workspaceRoot, "candidate-master-map.json"));
  const lexemes = sortedFiles(path.join(workspaceRoot, "master", "lexemes")).map(readJson<JsonObject>);
  const senses = sortedFiles(path.join(workspaceRoot, "master", "senses")).map(readJson<JsonObject>);
  const audit = auditPackage.entries as JsonObject[];
  const pins = [
    ...lexemes.map((record) => ({ recordPath: `${WORKSPACE}/master/lexemes/${record.masterLexemeId}-r1.json`, contentHash: rawSerializedHash(record) })),
    ...senses.map((record) => ({ recordPath: `${WORKSPACE}/master/senses/${record.masterSenseId}-r1.json`, contentHash: rawSerializedHash(record) })),
  ].sort((a, b) => a.recordPath.localeCompare(b.recordPath, "en"));
  const payload = {
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    authoringContractVersion: "HYBRID-100-EDITORIAL-DRAFT-1",
    identityRegistry,
    candidateMasterMap: candidateMap,
    editorialDecisions: editorial.decisions,
    masterRecordPins: pins,
    authorshipAudit: audit,
  };
  const actualPaths = [
    ...lexemes.map((record) => path.join(workspaceRoot, "master", "lexemes", `${record.masterLexemeId}-r1.json`)),
    ...senses.map((record) => path.join(workspaceRoot, "master", "senses", `${record.masterSenseId}-r1.json`)),
  ];
  for (const filePath of actualPaths) {
    if (!existsSync(filePath)) fail(`APPROVED_DRAFT_FILE_MISSING: ${path.relative(repoRoot, filePath)}`);
  }
  return { fingerprint: canonicalHash(payload), lexemes, senses, decisions: editorial.decisions, audit, registry: identityRegistry };
}

function validateDraftArtifacts(repoRoot: string, workspaceRoot: string): {
  approval: JsonObject;
  ownerReview: JsonObject;
  workspaceManifest: JsonObject;
  datasetManifest: JsonObject;
  lexemes: JsonObject[];
  senses: JsonObject[];
  decisions: JsonObject[];
  reviewedEditorialDecisions: JsonObject[];
  audit: JsonObject[];
  registry: JsonObject;
  fingerprint: string;
} {
  const approval = readJson<JsonObject>(path.join(repoRoot, APPROVAL_PATH));
  const ownerReview = readJson<JsonObject>(path.join(workspaceRoot, "owner-review.json"));
  const workspaceManifest = readJson<JsonObject>(path.join(workspaceRoot, "manifest.json"));
  const validation = readJson<JsonObject>(path.join(workspaceRoot, "validation-summary.json"));
  const auditPackage = readJson<JsonObject>(path.join(workspaceRoot, "authorship-audit.json"));
  const reviewCounts = ownerReview.summary ?? {};
  const sourceOverlap = reviewCounts.sourceOverlap ?? {};
  const fingerprintData = readWorkspaceFingerprint(repoRoot, workspaceRoot);
  const candidateDecisions = ownerReview.candidateDecisions as JsonObject[];

  if (workspaceManifest.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT || ownerReview.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT || validation.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT) fail("SOURCE_PROOF_PIN_INVALID: workspace artifacts do not share the approved source proof.");
  if (workspaceManifest.draftPackageFingerprint !== APPROVED_DRAFT_FINGERPRINT || ownerReview.draftFingerprint !== APPROVED_DRAFT_FINGERPRINT || validation.draftPackageFingerprint !== APPROVED_DRAFT_FINGERPRINT || fingerprintData.fingerprint !== APPROVED_DRAFT_FINGERPRINT) fail(`APPROVED_DRAFT_PIN_INVALID: expected ${APPROVED_DRAFT_FINGERPRINT}, got ${fingerprintData.fingerprint}.`);
  assertApprovalEvidence(approval, fingerprintData.fingerprint, String(workspaceManifest.sourceProofFingerprint));
  if (workspaceManifest.sourceRightsVerified !== false || workspaceManifest.sourceReuseEligible !== false || workspaceManifest.mediaReuseEligible !== false) fail("SOURCE_RIGHTS_GATE_INVALID: external source or media reuse must remain ineligible.");
  if (validation.status !== "PASS" || validation.sourceOverlapGuard !== "PASS" || validation.sourceTextReused !== false) fail("DRAFT_QA_GATE_INVALID: Phase 2F.2 validation and overlap guard must pass.");
  if (sourceOverlap.exactEnglishDefinitionMatches !== 0 || sourceOverlap.exactEnglishExampleMatches !== 0 || sourceOverlap.candidatesWithContiguousOverlapAtLeastEightTokens !== 0 || sourceOverlap.highSimilarityUnresolved !== 0 || sourceOverlap.sourceTextReused !== false) fail("SOURCE_OVERLAP_GATE_INVALID: an overlap guard threshold is not satisfied.");
  if (reviewCounts.candidates !== 100 || reviewCounts.approveDraft !== 100 || reviewCounts.requestChanges !== 0 || reviewCounts.rejectIdentity !== 0 || reviewCounts.blocked !== 0) fail("OWNER_REVIEW_GATE_INVALID: expected exactly 100 APPROVE_DRAFT decisions.");
  if (reviewCounts.polysemyBlocksReviewed !== 12 || ownerReview.polysemyOwnerReview?.status !== "PASS" || ownerReview.polysemyOwnerReview?.blocksReviewed !== 12) fail("POLYSEMY_REVIEW_GATE_INVALID: all 12 polysemy blocks must pass.");
  if (candidateDecisions.length !== 100 || candidateDecisions.some((decision) => decision.editorialReviewStatus !== "APPROVE_DRAFT")) fail("OWNER_REVIEW_GATE_INVALID: each candidate decision must be APPROVE_DRAFT.");
  if (fingerprintData.decisions.length !== 100 || fingerprintData.decisions.some((decision) => decision.semanticReviewStatus !== "RESOLVED_FOR_DRAFT")) fail("DRAFT_DECISION_GATE_INVALID: incomplete semantic decisions.");
  const draftDecisionById = new Map(fingerprintData.decisions.map((decision) => [decision.candidateId, decision]));
  if (candidateDecisions.some((decision) => draftDecisionById.get(decision.candidateId)?.identityDecision !== decision.identityDecision)) fail("OWNER_REVIEW_DECISION_MISMATCH: owner decisions do not match the fingerprinted editorial rows.");
  if (fingerprintData.lexemes.length !== 84 || fingerprintData.senses.length !== 98) fail(`DRAFT_RECORD_COUNT_INVALID: got ${fingerprintData.lexemes.length} Lexemes / ${fingerprintData.senses.length} Senses.`);

  assertIdentityDecisionCounts(candidateDecisions, fingerprintData.lexemes, fingerprintData.senses);

  const childIds = new Set<string>();
  for (const sense of fingerprintData.senses) {
    if (sense.status !== "DRAFT") fail(`NEW_SENSE_STATUS_INVALID: ${sense.masterSenseId}`);
    const translation = sense.translations?.[0];
    const definition = sense.definitions?.[0];
    const example = sense.examples?.[0];
    const exampleTranslation = example?.exampleTranslations?.[0];
    if (sense.translations?.length !== 1 || sense.definitions?.length !== 1 || sense.examples?.length !== 1 || example?.exampleTranslations?.length !== 1) fail(`DRAFT_CHILD_CARDINALITY_INVALID: ${sense.masterSenseId}`);
    for (const child of [translation, definition, example, exampleTranslation]) {
      if (!child || child.status !== "DRAFT") fail(`NEW_CHILD_STATUS_INVALID: ${sense.masterSenseId}`);
      const id = child.translationId ?? child.definitionId ?? child.exampleTranslationId ?? child.exampleId;
      if (typeof id !== "string" || childIds.has(id)) fail(`DRAFT_CHILD_ID_DUPLICATE: ${id ?? sense.masterSenseId}`);
      childIds.add(id);
    }
    if ((sense.pronunciationOverrides ?? []).length !== 0 || (example.audioAssetIds ?? []).length !== 0) fail(`UNAUTHORIZED_MEDIA_REFERENCE: ${sense.masterSenseId}`);
  }
  for (const lexeme of fingerprintData.lexemes) {
    if (lexeme.status !== "DRAFT" || !Array.isArray(lexeme.pronunciations) || lexeme.pronunciations.length !== 0) fail(`NEW_LEXEME_STATUS_OR_MEDIA_INVALID: ${lexeme.masterLexemeId}`);
  }

  const identityRegistryPath = path.join(workspaceRoot, "identity-registry.json");
  if (sha256(readFileSync(identityRegistryPath)) !== reviewCounts.identityRegistrySha256 || reviewCounts.identityRegistryChanged !== false || reviewCounts.newUuidsAllocatedOnRerun !== 0 || reviewCounts.repeatFingerprintIdentical !== true) fail("FROZEN_IDENTITY_REGISTRY_INVALID: Phase 2F.2 allocation registry changed.");
  if (ownerReview.ownerFinalApproval !== "PENDING" || ownerReview.canonicalPromotionAuthorized !== false) fail("PHASE_2F2A_REVIEW_ARTIFACT_CHANGED: the frozen owner-review artifact must remain unchanged.");

  const datasetManifest = readJson<JsonObject>(path.join(repoRoot, MANIFEST_PATH));
  if (datasetManifest.status !== "DRAFT") fail("ROOT_MANIFEST_STATUS_INVALID: canonical promotion requires a DRAFT root manifest.");
  if (datasetManifest.releaseHash !== undefined || datasetManifest.releaseHashAlgorithm !== undefined || datasetManifest.releasedAt !== undefined) fail("ROOT_MANIFEST_RELEASE_FIELDS_INVALID: DRAFT manifests cannot carry release fields.");
  if (datasetManifest.datasetVersion !== "2.0.0" || datasetManifest.schemaVersion !== "2.0.1") fail("ROOT_MANIFEST_VERSION_CONFLICT: expected datasetVersion 2.0.0 / schemaVersion 2.0.1; stop instead of inventing a transition.");

  return { approval, ownerReview, workspaceManifest, datasetManifest, ...fingerprintData, reviewedEditorialDecisions: fingerprintData.decisions, decisions: candidateDecisions, audit: auditPackage.entries };
}

function refsFromReviewDecisions(decisions: JsonObject[]): JsonObject[] {
  const refs = new Map<string, JsonObject>();
  const add = (reference: JsonObject | null | undefined) => {
    if (!reference || typeof reference.recordPath !== "string" || typeof reference.contentHash !== "string") return;
    const key = reference.recordPath;
    const existing = refs.get(key);
    if (existing && existing.contentHash !== reference.contentHash) fail(`CANONICAL_BASE_STALE: conflicting reviewed hashes for ${key}`);
    refs.set(key, reference);
  };
  for (const decision of decisions) {
    const review = decision.existingMasterIdentityReview ?? {};
    add(review.canonicalLexeme);
    add(review.reusedCanonicalSense);
    for (const compared of review.comparedCanonicalSenses ?? []) add(compared);
  }
  return [...refs.values()].sort((a, b) => a.recordPath.localeCompare(b.recordPath, "en"));
}

export function assertDependencyHashes(repoRoot: string, datasetManifest: JsonObject, decisions: JsonObject[]): JsonObject[] {
  const refs = refsFromReviewDecisions(decisions);
  for (const reference of refs) {
    const prefix = "vocabflow-dataset/";
    if (!String(reference.recordPath).startsWith(prefix)) fail(`CANONICAL_BASE_STALE: noncanonical dependency path ${reference.recordPath}`);
    const relative = String(reference.recordPath).slice(prefix.length);
    if (path.isAbsolute(relative) || relative.split(/[\\/]/).includes("..")) fail(`CANONICAL_BASE_STALE: invalid dependency path ${reference.recordPath}`);
    const absolutePath = path.join(repoRoot, "vocabflow-dataset", relative);
    if (!existsSync(absolutePath)) fail(`CANONICAL_BASE_STALE: reviewed dependency missing ${reference.recordPath}`);
    const rawHash = sha256(readFileSync(absolutePath));
    if (rawHash !== reference.contentHash) fail(`CANONICAL_BASE_STALE: reviewed canonical bytes changed at ${reference.recordPath}`);
    const record = readJson<JsonObject>(absolutePath);
    const jcsHash = canonicalHash(record);
    if (reference.masterLexemeId) {
      const pin = datasetManifest.includedLexemes?.find((item: JsonObject) => item.masterLexemeId === reference.masterLexemeId && item.lexemeRevision === reference.revision);
      if (pin && (pin.contentHash !== jcsHash || pin.recordPath !== relative)) fail(`CANONICAL_BASE_STALE: root manifest no longer pins reviewed Lexeme ${reference.masterLexemeId} revision ${reference.revision}`);
    } else if (reference.masterSenseId) {
      const pin = datasetManifest.includedSenses?.find((item: JsonObject) => item.masterSenseId === reference.masterSenseId && item.senseRevision === reference.revision);
      if (pin && (pin.contentHash !== jcsHash || pin.recordPath !== relative)) fail(`CANONICAL_BASE_STALE: root manifest no longer pins reviewed Sense ${reference.masterSenseId} revision ${reference.revision}`);
    }
  }
  if (!refs.some((item) => item.masterSenseId === "01a0fc13-09ef-75ac-b815-039ab337c01a")
    || !refs.some((item) => item.masterSenseId === "01a0fc13-09ee-7768-9be6-d20fa32521ee")
    || !refs.some((item) => item.masterLexemeId === "01a0fc13-09ee-7fd1-8ad8-a2026a7620e0")
    || !refs.some((item) => item.masterLexemeId === "01a0fc13-09ef-7e5d-b757-aa456f0cd969")
    || !refs.some((item) => item.masterLexemeId === "01a0fc13-09ef-73b3-b970-1a8bd5d48a27")) fail("CANONICAL_BASE_STALE: the exact reviewed canonical dependencies are not represented.");
  return refs;
}

function deterministicProvenanceIdMap(records: JsonObject[], decisions: JsonObject[]): Record<string, string> {
  const result: Record<string, string> = {};
  const register = (sourceType: string, subjectId: string, fieldPath: string, candidateId?: string) => {
    const key = makeProvenanceKey(sourceType, subjectId, fieldPath, candidateId);
    result[key] = stableUuidV7(key);
  };
  for (const sense of records) {
    register("PROJECT_AUTHORED", sense.masterSenseId, "sense");
    for (const translation of sense.translations ?? []) register("PROJECT_AUTHORED", translation.translationId, "sense.translations");
    for (const definition of sense.definitions ?? []) register("PROJECT_AUTHORED", definition.definitionId, "sense.definitions");
    for (const example of sense.examples ?? []) {
      register("PROJECT_AUTHORED", example.exampleId, "sense.examples");
      for (const translation of example.exampleTranslations ?? []) register("PROJECT_AUTHORED", translation.exampleTranslationId, "example.exampleTranslations");
    }
  }
  for (const decision of decisions) {
    const key = makeProvenanceKey("OWNER_REVIEW", decision.masterSenseId, "sense.editorialDecision", decision.candidateId);
    result[key] = stableUuidV7(key);
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b, "en")));
}

function mergeProvenanceIds(record: JsonObject, provenanceId: string): void {
  const existing = Array.isArray(record.provenanceIds) ? record.provenanceIds : [];
  if (!existing.includes(provenanceId)) record.provenanceIds = [...existing, provenanceId].sort((a: string, b: string) => a.localeCompare(b, "en"));
}

function plannedRecords(workspaceSenses: JsonObject[], workspaceLexemes: JsonObject[], decisions: JsonObject[], provenanceIdMap: Record<string, string>): {
  lexemes: PlannedRecord[];
  senses: PlannedRecord[];
  provenance: PlannedRecord[];
} {
  const ownerReviewBySense = new Map<string, string[]>();
  const provenanceRecords: JsonObject[] = [];
  const makeAuthored = (subjectType: "SENSE" | "LINGUISTIC_CHILD", subjectId: string, fieldPath: string) => {
    const key = makeProvenanceKey("PROJECT_AUTHORED", subjectId, fieldPath);
    const provenanceId = provenanceIdMap[key];
    if (!provenanceId) fail(`PROMOTION_REGISTRY_MISSING_PURPOSE: ${key}`);
    provenanceRecords.push(makeProvenanceRecord({ provenanceId, subjectType, subjectId, fieldPath, sourceType: "PROJECT_AUTHORED" }));
    return provenanceId;
  };
  for (const decision of decisions) {
    const key = makeProvenanceKey("OWNER_REVIEW", decision.masterSenseId, "sense.editorialDecision", decision.candidateId);
    const provenanceId = provenanceIdMap[key];
    if (!provenanceId) fail(`PROMOTION_REGISTRY_MISSING_PURPOSE: ${key}`);
    provenanceRecords.push(makeProvenanceRecord({ provenanceId, subjectType: "SENSE", subjectId: decision.masterSenseId, fieldPath: "sense.editorialDecision", sourceType: "OWNER_REVIEW", candidateId: decision.candidateId }));
    ownerReviewBySense.set(decision.masterSenseId, [...(ownerReviewBySense.get(decision.masterSenseId) ?? []), provenanceId]);
  }

  const senses = workspaceSenses.map((workspaceSense) => {
    const record = structuredClone(workspaceSense) as JsonObject;
    mergeProvenanceIds(record, makeAuthored("SENSE", record.masterSenseId, "sense"));
    for (const child of record.translations) mergeProvenanceIds(child, makeAuthored("LINGUISTIC_CHILD", child.translationId, "sense.translations"));
    for (const child of record.definitions) mergeProvenanceIds(child, makeAuthored("LINGUISTIC_CHILD", child.definitionId, "sense.definitions"));
    for (const child of record.examples) {
      mergeProvenanceIds(child, makeAuthored("LINGUISTIC_CHILD", child.exampleId, "sense.examples"));
      for (const translation of child.exampleTranslations) mergeProvenanceIds(translation, makeAuthored("LINGUISTIC_CHILD", translation.exampleTranslationId, "example.exampleTranslations"));
    }
    for (const ownerReviewId of ownerReviewBySense.get(record.masterSenseId) ?? []) mergeProvenanceIds(record, ownerReviewId);
    const relativePath = `master/senses/${record.masterSenseId}-r${record.senseRevision}.json`;
    return { path: relativePath, record, contentHash: canonicalHash(record) };
  }).sort((a, b) => a.path.localeCompare(b.path, "en"));
  const lexemes = workspaceLexemes.map((record) => ({
    path: `master/lexemes/${record.masterLexemeId}-r${record.lexemeRevision}.json`,
    record: structuredClone(record) as JsonObject,
    contentHash: canonicalHash(record),
  })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  const provenance = provenanceRecords.map((record) => ({
    path: `provenance/${record.provenanceId}.json`,
    record,
    contentHash: canonicalHash(record),
  })).sort((a, b) => a.path.localeCompare(b.path, "en"));
  return { lexemes, senses, provenance };
}

function collectCanonicalPaths(repoRoot: string): string[] {
  const datasetRoot = path.join(repoRoot, "vocabflow-dataset");
  const directories = ["master", "provenance", "learning-sets", "media", "taxonomy"];
  const files: string[] = [];
  const visit = (absolute: string) => {
    if (!existsSync(absolute)) return;
    for (const entry of readdirSync(absolute, { withFileTypes: true })) {
      const target = path.join(absolute, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(target);
    }
  };
  for (const directory of directories) visit(path.join(datasetRoot, directory));
  return files;
}

function collectUuidValues(value: unknown, output: Set<string>): void {
  if (typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value)) output.add(value);
  else if (Array.isArray(value)) for (const item of value) collectUuidValues(item, output);
  else if (value && typeof value === "object") for (const child of Object.values(value)) collectUuidValues(child, output);
}

function canonicalIdIndex(repoRoot: string): Map<string, Set<string>> {
  const index = new Map<string, Set<string>>();
  for (const absolutePath of collectCanonicalPaths(repoRoot)) {
    const value = readJson<unknown>(absolutePath);
    const ids = new Set<string>();
    collectUuidValues(value, ids);
    const relative = path.relative(path.join(repoRoot, "vocabflow-dataset"), absolutePath).split(path.sep).join("/");
    for (const id of ids) {
      const paths = index.get(id) ?? new Set<string>();
      paths.add(relative);
      index.set(id, paths);
    }
  }
  return index;
}

export function assertNoUuidCollisions(existing: Map<string, Set<string>>, planned: PlannedRecord[]): void {
  const expected = new Map<string, Set<string>>();
  const definedIds = new Set<string>();
  const definitions: Array<{ id: string; path: string }> = [];
  for (const item of planned) {
    if (item.path.startsWith("master/lexemes/") && item.record.masterLexemeId) {
      definedIds.add(item.record.masterLexemeId);
      definitions.push({ id: item.record.masterLexemeId, path: item.path });
    }
    if (item.path.startsWith("master/senses/")) {
      if (item.record.masterSenseId) {
        definedIds.add(item.record.masterSenseId);
        definitions.push({ id: item.record.masterSenseId, path: item.path });
      }
      for (const translation of item.record.translations ?? []) {
        definedIds.add(translation.translationId);
        definitions.push({ id: translation.translationId, path: item.path });
      }
      for (const definition of item.record.definitions ?? []) {
        definedIds.add(definition.definitionId);
        definitions.push({ id: definition.definitionId, path: item.path });
      }
      for (const example of item.record.examples ?? []) {
        definedIds.add(example.exampleId);
        definitions.push({ id: example.exampleId, path: item.path });
        for (const translation of example.exampleTranslations ?? []) {
          definedIds.add(translation.exampleTranslationId);
          definitions.push({ id: translation.exampleTranslationId, path: item.path });
        }
      }
    }
    if (item.path.startsWith("provenance/") && item.record.provenanceId) {
      definedIds.add(item.record.provenanceId);
      definitions.push({ id: item.record.provenanceId, path: item.path });
    }
  }
  const identityPaths = new Map<string, string>();
  for (const definition of definitions) {
    const previous = identityPaths.get(definition.id);
    if (previous) fail(`MASTER_ID_COLLISION: duplicate planned identity ${definition.id} in ${previous} and ${definition.path}`);
    identityPaths.set(definition.id, definition.path);
  }
  for (const item of planned) {
    const referencedIds = new Set<string>();
    collectUuidValues(item.record, referencedIds);
    for (const id of referencedIds) {
      if (!definedIds.has(id)) continue;
      const paths = expected.get(id) ?? new Set<string>();
      paths.add(item.path);
      expected.set(id, paths);
    }
  }
  for (const [id, paths] of expected) {
    const actual = existing.get(id);
    if (!actual) continue;
    const allowed = paths;
    if ([...actual].some((existingPath) => !allowed.has(existingPath))) fail(`MASTER_ID_COLLISION: ${id} already occurs in ${[...actual].join(", ")}`);
  }
}

export function assertUniqueSenseOrders(existingManifest: JsonObject, plannedSenses: PlannedRecord[], repoRoot: string): void {
  const orders = new Map<string, Set<number>>();
  const plannedIds = new Set(plannedSenses.map((item) => item.record.masterSenseId));
  for (const pin of existingManifest.includedSenses as Pin[]) {
    if (plannedIds.has(pin.masterSenseId)) continue;
    const filePath = path.join(repoRoot, "vocabflow-dataset", pin.recordPath);
    const record = readJson<JsonObject>(filePath);
    assertSenseOrderAvailable(orders, record.masterLexemeId, record.senseOrder);
  }
  for (const planned of plannedSenses) {
    const sense = planned.record;
    assertSenseOrderAvailable(orders, sense.masterLexemeId, sense.senseOrder);
  }
}

export function upsertPins<T extends JsonObject>(existing: T[], additions: T[], idField: string): T[] {
  const byId = new Map<string, T>();
  const result = [...existing];
  for (const pin of existing) byId.set(String(pin[idField]), pin);
  for (const pin of additions) {
    const id = String(pin[idField]);
    const previous = byId.get(id);
    if (previous && !objectsEqual(previous, pin)) fail(`MANIFEST_PIN_COLLISION: ${id}`);
    if (!previous) {
      byId.set(id, pin);
      result.push(pin);
    }
  }
  return result;
}

export function assertDraftManifest(manifest: JsonObject): void {
  if (manifest.status !== "DRAFT") fail("ROOT_MANIFEST_STATUS_INVALID");
  if (manifest.releaseHash !== undefined || manifest.releaseHashAlgorithm !== undefined || manifest.releasedAt !== undefined) fail("ROOT_MANIFEST_RELEASE_FIELDS_INVALID");
}

function canarySnapshot(repoRoot: string): Array<{ path: string; sha256: string }> {
  const root = path.join(repoRoot, "vocabflow-dataset", "releases", "canary-v2.1.0");
  if (!existsSync(root)) fail("CANARY_SNAPSHOT_MISSING");
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile()) files.push(absolute);
    }
  };
  visit(root);
  return files.map((file) => ({ path: path.relative(repoRoot, file).split(path.sep).join("/"), sha256: sha256(readFileSync(file)) }))
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
}

function makeManifestPin(item: PlannedRecord, type: "lexeme" | "sense" | "provenance"): JsonObject {
  if (type === "lexeme") return { masterLexemeId: item.record.masterLexemeId, lexemeRevision: item.record.lexemeRevision, recordPath: item.path, contentHash: item.contentHash };
  if (type === "sense") return { masterSenseId: item.record.masterSenseId, senseRevision: item.record.senseRevision, recordPath: item.path, contentHash: item.contentHash };
  return { provenanceId: item.record.provenanceId, recordPath: item.path, contentHash: item.contentHash };
}

export function preparePlan(repoRoot: string): JsonObject {
  const workspaceRoot = path.join(repoRoot, WORKSPACE);
  const verified = validateDraftArtifacts(repoRoot, workspaceRoot);
  const dependencyPins = assertDependencyHashes(repoRoot, verified.datasetManifest, verified.reviewedEditorialDecisions);
  const provenanceIdMap = deterministicProvenanceIdMap(verified.senses, verified.decisions);
  const registry = existsSync(path.join(repoRoot, REGISTRY_PATH)) ? readJson<JsonObject>(path.join(repoRoot, REGISTRY_PATH)) : null;
  if (registry) {
    if (registry.approvedDraftFingerprint !== APPROVED_DRAFT_FINGERPRINT || registry.algorithm !== "RFC9562_UUIDV7_SHA256_PURPOSE_V1" || !objectsEqual(registry.provenancePurposeToId, provenanceIdMap)) fail("PROMOTION_REGISTRY_STALE: persisted provenance IDs do not match the approved plan.");
  }
  const records = plannedRecords(verified.senses, verified.lexemes, verified.decisions, provenanceIdMap);
  assertUniqueSenseOrders(verified.datasetManifest, records.senses, repoRoot);
  const allRecords = [...records.lexemes, ...records.senses, ...records.provenance];
  assertNoUuidCollisions(canonicalIdIndex(repoRoot), allRecords);
  const manifest = structuredClone(verified.datasetManifest) as JsonObject;
  manifest.includedLexemes = upsertPins(manifest.includedLexemes, records.lexemes.map((item) => makeManifestPin(item, "lexeme")), "masterLexemeId");
  manifest.includedSenses = upsertPins(manifest.includedSenses, records.senses.map((item) => makeManifestPin(item, "sense")), "masterSenseId");
  manifest.includedProvenance = upsertPins(manifest.includedProvenance, records.provenance.map((item) => makeManifestPin(item, "provenance")), "provenanceId");
  const summaryEn = "Promotes 100 owner-approved hybrid vocabulary decisions into canonical Master as DRAFT.";
  const summaryVi = "Bổ sung 100 quyết định từ vựng hybrid đã được chủ dự án phê duyệt vào Master ở trạng thái DRAFT.";
  const changes = Array.isArray(manifest.changeSummary) ? manifest.changeSummary : [];
  if (!changes.some((item: JsonObject) => item.language === "en" && item.text === summaryEn)) changes.push({ language: "en", text: summaryEn });
  if (!changes.some((item: JsonObject) => item.language === "vi" && item.text === summaryVi)) changes.push({ language: "vi", text: summaryVi });
  manifest.changeSummary = changes;
  assertDraftManifest(manifest);

  const manifestPins = {
    includedLexemes: [...manifest.includedLexemes].sort((a: JsonObject, b: JsonObject) => a.masterLexemeId.localeCompare(b.masterLexemeId, "en")),
    includedSenses: [...manifest.includedSenses].sort((a: JsonObject, b: JsonObject) => a.masterSenseId.localeCompare(b.masterSenseId, "en")),
    includedProvenance: [...manifest.includedProvenance].sort((a: JsonObject, b: JsonObject) => a.provenanceId.localeCompare(b.provenanceId, "en")),
  };
  const planPayload = {
    approvedDraftFingerprint: APPROVED_DRAFT_FINGERPRINT,
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    canonicalDependencyPins: dependencyPins,
    newLexemePins: records.lexemes.map((item) => ({ path: item.path, contentHash: item.contentHash })),
    newSensePins: records.senses.map((item) => ({ path: item.path, contentHash: item.contentHash })),
    provenanceRecords: records.provenance.map((item) => ({ path: item.path, provenanceId: item.record.provenanceId, contentHash: item.contentHash, subjectType: item.record.subjectType, subjectId: item.record.subjectId, fieldPath: item.record.fieldPath, sourceType: item.record.sourceType })),
    resultingManifestPinSet: manifestPins,
  };
  const promotionPlanFingerprint = canonicalHash(planPayload);
  if (verified.approval.promotionPlanFingerprint && verified.approval.promotionPlanFingerprint !== promotionPlanFingerprint) fail("PROMOTION_PLAN_FINGERPRINT_MISMATCH: stored promotion evidence does not match the current plan.");
  if (verified.approval.canonicalDependencyPins && !objectsEqual(verified.approval.canonicalDependencyPins, dependencyPins)) fail("PROMOTION_DEPENDENCY_PIN_MISMATCH: stored promotion evidence does not match current dependencies.");
  const canaryCurrent = canarySnapshot(repoRoot);
  const storedCanary = verified.approval.canaryTreeSnapshotBefore as JsonObject[] | undefined;
  if (storedCanary) {
    if (verified.approval.canaryTreeFingerprintBefore !== canonicalHash(storedCanary)) fail("CANARY_SNAPSHOT_PIN_INVALID: stored pre-apply snapshot hash does not match its file list.");
    assertCanarySnapshotUnchanged(storedCanary, canaryCurrent);
  }
  const canaryBefore = storedCanary ?? canaryCurrent;
  const writes: PlannedRecord[] = [...allRecords, { path: "dataset.json", record: manifest, contentHash: canonicalHash(manifest) }];
  let required = 0;
  for (const item of writes) {
    const absolute = path.join(repoRoot, "vocabflow-dataset", item.path);
    if (!existsSync(absolute)) { required += 1; continue; }
    const present = readJson<JsonObject>(absolute);
    if (item.path === "dataset.json") {
      if (canonicalHash(present) !== canonicalHash(item.record)) required += 1;
    } else if (canonicalHash(present) !== canonicalHash(item.record)) {
      assertOutputPathAvailable(present, item.record, item.path);
    }
  }
  const summary = {
    status: required === 0 ? "PROMOTION_ALREADY_MATERIALIZED" : "READY_TO_APPLY",
    approvedDraftFingerprint: APPROVED_DRAFT_FINGERPRINT,
    promotionPlanFingerprint,
    promotedLexemeCount: records.lexemes.length,
    promotedSenseCount: records.senses.length,
    provenanceCount: records.provenance.length,
    canonicalLexemeTotal: manifest.includedLexemes.length,
    canonicalSenseTotal: manifest.includedSenses.length,
    canonicalProvenanceTotal: manifest.includedProvenance.length,
    datasetManifestHashAfter: canonicalHash(manifest),
    canaryChanged: false,
    databaseWrites: "NONE",
    runtimeImportExecuted: false,
    sourceTypes: {
      PROJECT_AUTHORED: records.provenance.filter((item) => item.record.sourceType === "PROJECT_AUTHORED").length,
      OWNER_REVIEW: records.provenance.filter((item) => item.record.sourceType === "OWNER_REVIEW").length,
      LICENSED_SOURCE: 0,
      PUBLIC_DOMAIN_SOURCE: 0,
    },
  };
  return {
    verified,
    records,
    manifest,
    dependencyPins,
    registry: { artifactType: "HYBRID_100_CANONICAL_PROMOTION_ID_REGISTRY", algorithm: "RFC9562_UUIDV7_SHA256_PURPOSE_V1", approvedDraftFingerprint: APPROVED_DRAFT_FINGERPRINT, createdAt: PROMOTION_CREATED_AT, provenancePurposeToId: provenanceIdMap },
    promotionPlanFingerprint,
    planPayload,
    canaryBefore,
    required,
    summary,
    writes,
  };
}

function approvalArtifact(plan: JsonObject): JsonObject {
  return {
    artifactType: "HYBRID_100_CANONICAL_PROMOTION_DECISION",
    ownerApproved: true,
    canonicalPromotionAuthorized: true,
    ownerApprovalScope: "CANONICAL_DRAFT_PROMOTION_ONLY",
    approvedBy: "VocabFlow project owner",
    approvedAt: PROMOTION_CREATED_AT,
    approvedCandidateCount: 100,
    approvedDraftFingerprint: APPROVED_DRAFT_FINGERPRINT,
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    promotionPlanFingerprint: plan.promotionPlanFingerprint,
    canonicalDependencyPins: plan.dependencyPins,
    canaryTreeFingerprintBefore: canonicalHash(plan.canaryBefore),
    canaryTreeSnapshotBefore: plan.canaryBefore,
    scopeExclusions: ["APPROVED_RELEASE", "RUNTIME_IMPORT", "DEVELOPMENT_BULK_IMPORT", "PRODUCTION_MUTATION", "SOURCE_OR_MEDIA_REUSE", "CLASSIFICATION_PUBLICATION", "MEDIA_UPLOAD"],
  };
}

function promotionReport(plan: JsonObject, postValidation: JsonObject): string {
  const lines = [
    "# Hybrid 100-Sense Canonical Promotion",
    "",
    `- Owner approval: YES (${plan.verified.approval.ownerApprovalScope})`,
    `- Approved draft fingerprint: \`${APPROVED_DRAFT_FINGERPRINT}\``,
    `- Source proof fingerprint: \`${SOURCE_PROOF_FINGERPRINT}\``,
    `- Promotion plan fingerprint: \`${plan.promotionPlanFingerprint}\``,
    `- Promoted new Lexemes: ${plan.records.lexemes.length}`,
    `- Promoted new Senses: ${plan.records.senses.length}`,
    "- Existing Sense reuse: 2",
    "- New Senses on existing Lexemes: 3",
    "- New Senses on new Lexemes: 95",
    `- New canonical Provenance records: ${plan.records.provenance.length}`,
    `- Provenance types: PROJECT_AUTHORED ${plan.summary.sourceTypes.PROJECT_AUTHORED}; OWNER_REVIEW ${plan.summary.sourceTypes.OWNER_REVIEW}; LICENSED_SOURCE 0; PUBLIC_DOMAIN_SOURCE 0.`,
    "- External source and media rights: UNVERIFIED; no Oxford or APKG reuse rights are claimed.",
    `- Canonical totals in root manifest: ${plan.manifest.includedLexemes.length} Lexemes, ${plan.manifest.includedSenses.length} Senses, ${plan.manifest.includedProvenance.length} Provenance records.`,
    `- Root manifest: status DRAFT; datasetVersion ${plan.manifest.datasetVersion}; schemaVersion ${plan.manifest.schemaVersion}.`,
    "- Owner-approved learner-facing content preserved: YES.",
    "- Source overlap guard: PASS (exact definition matches 0; exact example matches 0; overlaps of 8 or more tokens 0; unresolved high similarity 0).",
    "- Source text reused: NO.",
    "- Classifications promoted: 0.",
    "- Media and pronunciation promoted: 0.",
    `- Canary v2.1.0 changed: ${canonicalHash(canarySnapshot(plan.verified.repoRoot)) === canonicalHash(plan.canaryBefore) ? "NO" : "YES"} (byte-identical to the pre-apply working-tree snapshot; pre-existing local changes were preserved).`,
    "- Database connection/writes: NONE.",
    "- Runtime bulk import: NOT STARTED.",
    `- Canonical validator: ${postValidation.status}; ${postValidation.errorCount} errors, ${postValidation.warningCount} warnings, ${postValidation.infoCount} informational notes.`,
    "- Production mutation: NO.",
    "",
  ];
  return `${lines.join("\n")}\n`;
}

function writeWorkspaceArtifacts(repoRoot: string, plan: JsonObject, validation: JsonObject): void {
  const summary = { ...plan.summary, status: "PASS", promotionPlanFingerprint: plan.promotionPlanFingerprint, datasetManifestHashAfter: canonicalHash(plan.manifest), canaryChanged: false, databaseWrites: "NONE", runtimeImportExecuted: false };
  writeFileSync(path.join(repoRoot, APPROVAL_PATH), jsonBytes(approvalArtifact(plan)), "utf8");
  writeFileSync(path.join(repoRoot, REGISTRY_PATH), jsonBytes(plan.registry), "utf8");
  writeFileSync(path.join(repoRoot, SUMMARY_PATH), jsonBytes(summary), "utf8");
  writeFileSync(path.join(repoRoot, REPORT_PATH), promotionReport({ ...plan, verified: { ...plan.verified, repoRoot } }, validation), "utf8");
}

function applyPlan(repoRoot: string, plan: JsonObject): JsonObject {
  if (plan.required === 0) return { status: "PASS", alreadyMaterialized: true, validation: validateMasterVocabularyV2({ datasetRoot: path.join(repoRoot, "vocabflow-dataset"), schemaRoot: path.join(repoRoot, "vocabflow-dataset", "schemas"), writeReport: false, validatedAt: PROMOTION_CREATED_AT }) };
  const datasetRoot = path.join(repoRoot, "vocabflow-dataset");
  const originalManifestBytes = readFileSync(path.join(datasetRoot, "dataset.json"));
  const stageRoot = path.join(datasetRoot, `.hybrid-100-promotion-staging-${process.pid}`);
  if (existsSync(stageRoot)) fail(`PROMOTION_STAGE_COLLISION: ${stageRoot}`);
  mkdirSync(stageRoot, { recursive: true });
  const addedPaths: string[] = [];
  let manifestReplaced = false;
  try {
    for (const item of [...plan.records.lexemes, ...plan.records.senses, ...plan.records.provenance]) {
      const staged = path.join(stageRoot, item.path);
      mkdirSync(path.dirname(staged), { recursive: true });
      writeFileSync(staged, jsonBytes(item.record), "utf8");
    }
    writeFileSync(path.join(stageRoot, "dataset.json"), jsonBytes(plan.manifest), "utf8");
    for (const item of [...plan.records.lexemes, ...plan.records.senses, ...plan.records.provenance]) {
      const destination = path.join(datasetRoot, item.path);
      if (existsSync(destination)) continue;
      mkdirSync(path.dirname(destination), { recursive: true });
      renameSync(path.join(stageRoot, item.path), destination);
      addedPaths.push(destination);
    }
    const manifestPath = path.join(datasetRoot, "dataset.json");
    renameSync(path.join(stageRoot, "dataset.json"), manifestPath);
    manifestReplaced = true;

    const validation = validateMasterVocabularyV2({ datasetRoot, schemaRoot: path.join(datasetRoot, "schemas"), writeReport: false, validatedAt: PROMOTION_CREATED_AT });
    if (validation.status !== "PASS" || validation.errorCount !== 0 || validation.warningCount !== 0) fail(`PROMOTION_VALIDATION_FAILED: ${validation.errorCount} errors, ${validation.warningCount} warnings.`);
    const afterCanary = canarySnapshot(repoRoot);
    assertCanarySnapshotUnchanged(plan.canaryBefore, afterCanary);
    for (const item of plan.records.senses) assertSemanticContentPreserved(readJson<JsonObject>(path.join(repoRoot, WORKSPACE, "master", "senses", `${item.record.masterSenseId}-r1.json`)), readJson<JsonObject>(path.join(datasetRoot, item.path)));
    writeWorkspaceArtifacts(repoRoot, plan, validation);
    return { status: "PASS", alreadyMaterialized: false, validation };
  } catch (error) {
    for (const absolutePath of addedPaths.reverse()) if (existsSync(absolutePath)) rmSync(absolutePath);
    if (manifestReplaced) writeFileSync(path.join(datasetRoot, "dataset.json"), originalManifestBytes);
    throw error;
  } finally {
    if (existsSync(stageRoot)) rmSync(stageRoot, { recursive: true, force: true });
  }
}

function ensureMaterializedArtifacts(repoRoot: string, plan: JsonObject): JsonObject {
  const validation = validateMasterVocabularyV2({ datasetRoot: path.join(repoRoot, "vocabflow-dataset"), schemaRoot: path.join(repoRoot, "vocabflow-dataset", "schemas"), writeReport: false, validatedAt: PROMOTION_CREATED_AT });
  if (validation.status !== "PASS" || validation.errorCount !== 0 || validation.warningCount !== 0) fail(`PROMOTION_VALIDATION_FAILED: ${validation.errorCount} errors, ${validation.warningCount} warnings.`);
  const currentManifest = readJson<JsonObject>(path.join(repoRoot, MANIFEST_PATH));
  if (!objectsEqual(currentManifest, plan.manifest)) fail("ROOT_MANIFEST_PINS_MISMATCH: current root DRAFT manifest differs from the reviewed promotion plan.");
  assertCanarySnapshotUnchanged(plan.canaryBefore, canarySnapshot(repoRoot));
  for (const item of [...plan.records.lexemes, ...plan.records.senses, ...plan.records.provenance]) {
    const absolute = path.join(repoRoot, "vocabflow-dataset", item.path);
    if (!existsSync(absolute) || canonicalHash(readJson<JsonObject>(absolute)) !== item.contentHash) fail(`CANONICAL_HASH_MISMATCH: ${item.path}`);
  }
  for (const item of plan.records.senses) assertSemanticContentPreserved(readJson<JsonObject>(path.join(repoRoot, WORKSPACE, "master", "senses", `${item.record.masterSenseId}-r1.json`)), readJson<JsonObject>(path.join(repoRoot, "vocabflow-dataset", item.path)));
  return validation;
}

function runCli(): void {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const mode = process.argv.slice(2).filter((item) => item.startsWith("--"));
  if (mode.length !== 1 || !["--check", "--apply"].includes(mode[0])) fail("Usage: pnpm vocab:hybrid-100-promote --check | --apply");
  const plan = preparePlan(repoRoot);
  if (mode[0] === "--check") {
    if (plan.required === 0) {
      const validation = ensureMaterializedArtifacts(repoRoot, plan);
      console.log(JSON.stringify({ ...plan.summary, status: "PROMOTION_ALREADY_MATERIALIZED", promotionAlreadyMaterialized: true, canonicalDiffRequired: 0, ownerApprovalPinValid: true, canonicalBaseCurrent: true, promotionPlanValid: true, canonicalHashesValid: true, rootManifestPinsMatch: true, provenanceValid: true, idempotentProvenanceIdsAllocated: 0, validation }, null, 2));
    } else {
      console.log(JSON.stringify({ ...plan.summary, status: "READY_TO_APPLY", promotionAlreadyMaterialized: false, canonicalDiffRequired: plan.required, ownerApprovalPinValid: true, canonicalBaseCurrent: true, promotionPlanValid: true, deterministicProvenanceIdsToPersist: existsSync(path.join(repoRoot, REGISTRY_PATH)) ? 0 : plan.records.provenance.length, databaseWrites: "NONE", runtimeImportExecuted: false }, null, 2));
    }
    return;
  }
  const result = applyPlan(repoRoot, plan);
  const validation = ensureMaterializedArtifacts(repoRoot, plan);
  writeWorkspaceArtifacts(repoRoot, plan, validation);
  console.log(JSON.stringify({ ...plan.summary, status: "PASS", promotionAlreadyMaterialized: result.alreadyMaterialized, canonicalDiffRequiredAfterApply: 0, ownerApprovalPinValid: true, canonicalBaseCurrent: true, promotionPlanValid: true, canonicalHashesValid: true, rootManifestPinsMatch: true, provenanceValid: true, idempotentProvenanceIdsAllocated: 0, validation }, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) runCli();
