import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
  CANONICAL_PROMOTION_FINGERPRINT,
  FRAMEWORK_CODE,
  FRAMEWORK_VERSION,
  ID_CREATED_AT,
  SOURCE_PROOF_FINGERPRINT,
  TAXONOMY_ID,
  TAXONOMY_VERSION,
  assertRightsSafe,
  canonicalHash,
  sha256,
  stableUuidV7,
} from "./hybrid-100-cefr-draft";
import { validateMasterVocabularyDocument } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type Pin = JsonObject & { recordPath: string; contentHash: string };
type RegistryMapping = { registryKey: string; masterSenseId: string; frameworkCode: string; frameworkVersion: string; decisionType: string; classificationId: string | null; provenanceIds: string[] };
type ApprovalPlan = { files: Map<string, string>; summary: JsonObject; workspaceRoot: string; fullOwnerApprovalFingerprint: string };

export const PARENT_OWNER_CLOSURE_FINGERPRINT = "ec0a6e34556a3d484dbdd608e592b912cb8c4ff2ceafdbe46b9cac02ea23b18f";
export const PREVIOUS_CEFR_DRAFT_FINGERPRINT = "2da4c57ebbd18ce5e2c1fa77749fb7fe79a2f22752ba39506d2f59a7d7804a74";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-cefr-draft";
const ROOT_DATASET = "vocabflow-dataset/dataset.json";
const OWNER_SHEET = "vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md";
const DRAFT_REPORT = "vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md";
const LIGHT_CLASSIFICATION_ID = "01a0fc13-09f1-76b9-8a57-6c6e55e9b438";
const LIGHT_SENSE_ID = "01a0fc13-09ee-7768-9be6-d20fa32521ee";
const WATER_SENSE_ID = "01a0fc13-09ef-75ac-b815-039ab337c01a";
const EXPECTED_DISTRIBUTION = { PRE_A1: 0, A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, C2: 0, UNCLASSIFIED: 1 };
const SOURCE_NAME = "VocabFlow Hybrid 100-Sense CEFR Full Owner Review";
const OWNER_NOTES = "Owner accepted the VocabFlow editorial CEFR estimate under CEFR / EDITORIAL-PILOT-1 for canonical DRAFT promotion review. This is an owner review record, not an official CEFR classification and not a claim of source approval, source license, or external authority.";

function fail(message: string): never {
  throw new Error(message);
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

function jsonBytes(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sorted<T>(values: T[], key: (value: T) => string): T[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right), "en"));
}

function listJsonRecords(root: string, relativeDirectory: string): JsonObject[] {
  const absolute = path.join(root, relativeDirectory);
  if (!existsSync(absolute)) return [];
  return readdirSync(absolute, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .map((entry) => JSON.parse(readFileSync(path.join(absolute, entry.name), "utf8")) as JsonObject);
}

function treeSnapshot(root: string, relativeDirectory: string): JsonObject[] {
  const absolute = path.join(root, relativeDirectory);
  if (!existsSync(absolute)) return [];
  const files: JsonObject[] = [];
  const visit = (directory: string) => {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) files.push({ path: path.relative(root, child).split(path.sep).join("/"), sha256: sha256(readFileSync(child)) });
    }
  };
  visit(absolute);
  return sorted(files, (entry) => String(entry.path));
}

function protectedSnapshot(root: string): JsonObject {
  return {
    dataset: sha256(readFileSync(path.join(root, ROOT_DATASET))),
    lexemes: canonicalHash(treeSnapshot(root, "vocabflow-dataset/master/lexemes")),
    senses: canonicalHash(treeSnapshot(root, "vocabflow-dataset/master/senses")),
    classifications: canonicalHash(treeSnapshot(root, "vocabflow-dataset/master/classifications")),
    releases: canonicalHash(treeSnapshot(root, "vocabflow-dataset/releases")),
  };
}

function validateClassification(root: string, record: JsonObject): void {
  const result = validateMasterVocabularyDocument(record, "common.schema.json", "#/$defs/classification", path.join(root, "vocabflow-dataset", "schemas"));
  if (!result.valid) fail(`CLASSIFICATION_SCHEMA_INVALID: ${String(record.classificationId)}: ${result.issues.map((issue) => issue.message).join("; ")}`);
}

function validateProvenance(root: string, record: JsonObject): void {
  const result = validateMasterVocabularyDocument(record, "provenance.schema.json", undefined, path.join(root, "vocabflow-dataset", "schemas"));
  if (!result.valid) fail(`PROVENANCE_SCHEMA_INVALID: ${String(record.provenanceId)}: ${result.issues.map((issue) => issue.message).join("; ")}`);
}

function ownerProvenance(provenanceId: string, classificationId: string): JsonObject {
  return {
    provenanceId,
    subjectType: "CLASSIFICATION",
    subjectId: classificationId,
    fieldPath: "classification.valueCode",
    sourceType: "OWNER_REVIEW",
    sourceName: SOURCE_NAME,
    authoredBy: "VocabFlow project owner",
    notes: OWNER_NOTES,
    createdAt: ID_CREATED_AT,
  };
}

function semanticPayload(row: JsonObject): JsonObject {
  return {
    candidateId: row.candidateId,
    masterSenseId: row.masterSenseId,
    valueCode: row.editorialDecision.valueCode,
    confidence: row.editorialDecision.confidence,
    decisionType: row.editorialDecision.decisionType,
    classificationId: row.editorialDecision.classificationId,
    rationale: row.editorialDecision.rationale,
    agreementStatus: row.editorialDecision.agreementStatus,
  };
}

function decisionIdentityHash(rows: JsonObject[]): string {
  return canonicalHash(sorted(rows.map((row) => ({ candidateId: row.candidateId, masterSenseId: row.masterSenseId, classificationId: row.editorialDecision.classificationId ?? null })), (row) => row.candidateId));
}

function distribution(rows: JsonObject[]): JsonObject {
  const counts: JsonObject = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, UNCLASSIFIED: 0 };
  for (const row of rows) {
    const level = row.editorialDecision.valueCode;
    if (level === null) counts.UNCLASSIFIED += 1;
    else if (Object.hasOwn(counts, level)) counts[level] += 1;
    else fail(`CEFR_VALUE_INVALID: ${String(level)}`);
  }
  return counts;
}

function decisionCounts(rows: JsonObject[]): JsonObject {
  const counts: JsonObject = {};
  for (const row of rows) {
    const decisionType = row.editorialDecision.decisionType;
    counts[decisionType] = (counts[decisionType] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")));
}

function validateBasePins(root: string): { dataset: JsonObject; manifest: JsonObject; decisionDocument: JsonObject; closure: JsonObject; lightPredecessor: JsonObject; lightPin: Pin; canaryFingerprint: string } {
  const dataset = readJson<JsonObject>(root, ROOT_DATASET);
  const manifest = readJson<JsonObject>(root, `${WORKSPACE}/manifest.json`);
  const decisionDocument = readJson<JsonObject>(root, `${WORKSPACE}/cefr-decisions.json`);
  const closure = readJson<JsonObject>(root, `${WORKSPACE}/owner-review-closure.json`);
  const fullApprovalPath = path.join(root, WORKSPACE, "full-owner-approval.json");
  const priorFullApproval = existsSync(fullApprovalPath) ? readJson<JsonObject>(root, `${WORKSPACE}/full-owner-approval.json`) : null;
  const inputFingerprint = priorFullApproval?.approvedPackageFingerprint ?? manifest.cefrDraftFingerprint;
  if (inputFingerprint !== PARENT_OWNER_CLOSURE_FINGERPRINT || closure.cefrOwnerClosureFingerprint !== PARENT_OWNER_CLOSURE_FINGERPRINT) fail("PARENT_OWNER_CLOSURE_FINGERPRINT_STALE");
  if (manifest.parentCefrDraftFingerprint !== PREVIOUS_CEFR_DRAFT_FINGERPRINT || closure.previousCefrDraftFingerprint !== PREVIOUS_CEFR_DRAFT_FINGERPRINT) fail("PREVIOUS_CEFR_DRAFT_FINGERPRINT_STALE");
  if (manifest.approvedSemanticDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT || closure.approvedSemanticDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT) fail("APPROVED_SEMANTIC_FINGERPRINT_STALE");
  if (manifest.canonicalPromotionFingerprint !== CANONICAL_PROMOTION_FINGERPRINT || closure.canonicalPromotionFingerprint !== CANONICAL_PROMOTION_FINGERPRINT) fail("CANONICAL_PROMOTION_FINGERPRINT_STALE");
  if (manifest.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT || dataset.status !== "DRAFT" || dataset.datasetVersion !== "2.0.0" || dataset.schemaVersion !== "2.0.1") fail("CANONICAL_SEMANTIC_BASE_STALE");
  if (decisionDocument.frameworkCode !== FRAMEWORK_CODE || decisionDocument.frameworkVersion !== FRAMEWORK_VERSION || decisionDocument.candidateCount !== 100 || decisionDocument.rows?.length !== 100) fail("CEFR_DECISION_COHORT_STALE");
  if (manifest.taxonomyPin?.taxonomyId !== TAXONOMY_ID || manifest.taxonomyPin?.taxonomyVersion !== TAXONOMY_VERSION) fail("TAXONOMY_CONTRACT_STALE");

  const taxonomyPin = manifest.taxonomyPin as Pin;
  const taxonomy = readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", taxonomyPin.recordPath));
  if (canonicalHash(taxonomy) !== taxonomyPin.contentHash || taxonomy.status !== "DRAFT" || !taxonomy.cefrFrameworks?.some((framework: JsonObject) => framework.frameworkCode === FRAMEWORK_CODE && framework.frameworkVersion === FRAMEWORK_VERSION && framework.status === "ACTIVE" && framework.labels?.some((label: JsonObject) => /editorial pilot estimates/i.test(label.text)))) fail("TAXONOMY_PIN_INVALID");

  const rows = decisionDocument.rows as JsonObject[];
  if (new Set(rows.map((row) => row.candidateId)).size !== 100 || new Set(rows.map((row) => row.masterSenseId)).size !== 100) fail("CEFR_COHORT_IDENTITY_INVALID");
  const expectedCounts = { NEW_EDITORIAL_CLASSIFICATION: 97, REUSE_EXISTING_CLASSIFICATION: 1, REVISE_EXISTING_CLASSIFICATION: 1, UNCLASSIFIED_INSUFFICIENT_EVIDENCE: 1 };
  if (canonicalHash(decisionCounts(rows)) !== canonicalHash(expectedCounts)) fail("DECISION_COUNTS_CHANGED_FROM_PHASE_2F4A");
  if (canonicalHash(distribution(rows)) !== canonicalHash(EXPECTED_DISTRIBUTION)) fail("DISTRIBUTION_CHANGED_FROM_PHASE_2F4A");
  if (rows.some((row) => row.editorialDecision.decisionType === "OWNER_REVIEW_REQUIRED")) fail("OWNER_REVIEW_REQUIRED_DECISION_EXISTS");

  const lightPin = (dataset.includedClassifications as Pin[]).find((pin) => pin.classificationId === LIGHT_CLASSIFICATION_ID);
  if (!lightPin || lightPin.classificationRevision !== 1 || lightPin.contentHash !== "08482dae079eb7932bb7254e9a99277f104d58cf73be9f954b63641996c9763c") fail("LIGHT_CANONICAL_PREDECESSOR_PIN_INVALID");
  const lightPredecessor = readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", lightPin.recordPath));
  if (canonicalHash(lightPredecessor) !== lightPin.contentHash || lightPredecessor.valueCode !== "A2" || lightPredecessor.status !== "IN_REVIEW") fail("LIGHT_CANONICAL_PREDECESSOR_CHANGED");

  const canaryFingerprint = canonicalHash(treeSnapshot(root, "vocabflow-dataset/releases/canary-v2.1.0"));
  const readiness = readJson<JsonObject>(root, `${WORKSPACE}/release-readiness.json`);
  if (readiness.gates?.CANARY_RUNTIME?.treeFingerprint !== canaryFingerprint) fail("CANARY_TREE_FINGERPRINT_STALE");
  return { dataset, manifest, decisionDocument, closure, lightPredecessor: { ...lightPredecessor }, lightPin, canaryFingerprint };
}

function renderOwnerSheet(rows: JsonObject[], lightPin: Pin, approval: JsonObject, counts: JsonObject, levels: JsonObject): string {
  const lines = [
    "# Hybrid 100 CEFR Editorial Owner Review — Full Cohort Approved",
    "",
    "Status: `FULL_OWNER_APPROVAL_CLOSED`; approval covers the exact 100 CEFR decision outcomes in the pinned Phase 2F.4A package. No CEFR values or Classification identities were changed during this review closure.",
    "",
    `TOTAL = ${rows.length}`,
    "OWNER APPROVED CLASSIFIED = 99",
    "OWNER APPROVED UNCLASSIFIED = 1",
    "PENDING OWNER REVIEW = 0",
    `Parent CEFR fingerprint = ${approval.approvedPackageFingerprint}`,
    `Full owner-approved CEFR fingerprint = ${approval.fullOwnerApprovedCefrFingerprint}`,
    "",
    `Decision counts: Reuse ${counts.REUSE_EXISTING_CLASSIFICATION ?? 0} | Revise existing ${counts.REVISE_EXISTING_CLASSIFICATION ?? 0} | New editorial ${counts.NEW_EDITORIAL_CLASSIFICATION ?? 0} | Intentionally unclassified ${counts.UNCLASSIFIED_INSUFFICIENT_EVIDENCE ?? 0}`,
    "",
    "| # | Lemma | Sense label | POS | Source CEFR | Existing CEFR | Proposed | Confidence | Decision | Agreement | Owner review |",
    "|---:|---|---|---|---|---|---|---:|---|---|---|",
  ];
  for (const row of rows) {
    const existing = (row.existingClassificationAudit.records as JsonObject[])
      .filter((item) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION)
      .map((item) => `${item.valueCode} (${item.status}; ${item.classificationId}; sha256 ${item.contentHash})`).join("; ") || "—";
    const ownerState = row.editorialDecision.valueCode === null ? "ACCEPTED_UNCLASSIFIED" : "OWNER_DECISION_ACCEPTED";
    lines.push(`| ${row.candidateOrdinal} | ${row.lemma} | ${row.senseLabel} | ${row.partOfSpeechCode} | ${(row.sourceEvidence.sourceCefrEvidence ?? []).join(", ") || "—"} | ${existing} | ${row.editorialDecision.valueCode ?? "UNCLASSIFIED"} | ${Number(row.editorialDecision.confidence).toFixed(2)} | ${row.editorialDecision.decisionType} | ${row.editorialDecision.agreementStatus ?? "NO_SOURCE_CEFR"} | ${ownerState} |`);
  }
  lines.push(
    "",
    "## Final distribution",
    "",
    ...["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2", "UNCLASSIFIED"].map((level) => `- ${level} = ${levels[level] ?? 0}`),
    "",
    "## Preserved owner decisions",
    "",
    "- light / ADJECTIVE / not heavy: A1, `REVISE_EXISTING_CLASSIFICATION`, same Classification ID; revision 2 remains a workspace DRAFT plan.",
    "- freshman: B2; roster: B2; liable: C1.",
    "- fuse / NOUN / ignition cord: accepted as intentionally unclassified for insufficient evidence; it has no Classification and no Classification provenance.",
    "- water / VERB / give plants water: existing canonical classification reused; workspace owner-review evidence references its ID without changing or attaching provenance to the canonical record.",
    "",
    `Light predecessor pin: revision 1, value A2, status IN_REVIEW, SHA-256 ${lightPin.contentHash}. Workspace revision 2 remains A1 / DRAFT.`,
    "",
    "All 100 CEFR decisions are owner-reviewed. The 94 newly approved editorial Classification records include their PROJECT_AUTHORED and OWNER_REVIEW provenance. Water reuse has workspace governance provenance only. Rights remain unverified; these are VocabFlow editorial estimates, not official CEFR, Oxford-approved, licensed, or externally authoritative classifications.",
    "",
    "Canonical Classification promotion is ready for a separate operation but has not occurred. No release has been created and no runtime, database, development, or production mutation is authorized or executed.",
    "",
  );
  return lines.join("\n");
}

function renderDraftReport(input: JsonObject): string {
  const counts = input.decisionCounts as JsonObject;
  const levels = input.distribution as JsonObject;
  const readiness = input.readiness as JsonObject;
  const approval = input.approval as JsonObject;
  return [
    "# Phase 2F.4B — Full Hybrid 100 CEFR Owner Approval",
    "",
    "## Scope and pins",
    "",
    `- Parent 2F.4A owner-closure fingerprint: ${PARENT_OWNER_CLOSURE_FINGERPRINT}.`,
    `- Prior CEFR draft fingerprint: ${PREVIOUS_CEFR_DRAFT_FINGERPRINT}. Semantic draft: ${APPROVED_SEMANTIC_DRAFT_FINGERPRINT}. Canonical semantic promotion: ${CANONICAL_PROMOTION_FINGERPRINT}.`,
    `- Approved package: 100 CEFR editorial decisions under ${FRAMEWORK_CODE} / ${FRAMEWORK_VERSION}; exact full-approval fingerprint: ${approval.fullOwnerApprovedCefrFingerprint}.`,
    "- No value, confidence, rationale, decision type, classification ID, Sense ID, or agreement status changed in this approval phase.",
    "",
    "## Final decisions",
    "",
    `- Reuse existing: ${counts.REUSE_EXISTING_CLASSIFICATION}; revise existing: ${counts.REVISE_EXISTING_CLASSIFICATION}; new editorial: ${counts.NEW_EDITORIAL_CLASSIFICATION}; intentionally unclassified: ${counts.UNCLASSIFIED_INSUFFICIENT_EVIDENCE}.`,
    "- Owner-approved decisions: 100/100; classified/reused values: 99; intentionally unclassified: 1; pending owner review: 0.",
    "- Fuse remains unclassified for insufficient evidence. No fallback CEFR value or synthetic Classification was created.",
    "",
    "## Distribution",
    "",
    ...["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2", "UNCLASSIFIED"].map((level) => `- ${level} = ${levels[level] ?? 0}`),
    "",
    "## Provenance and readiness",
    "",
    `- PROJECT_AUTHORED provenance: ${input.projectAuthoredProvenanceCount}; OWNER_REVIEW provenance: ${input.ownerReviewProvenanceCount}; total workspace provenance: ${input.totalProvenanceCount}. Owner-review coverage: 99/99.`,
    `- Canonical Classification promotion readiness: ${readiness.canonicalClassificationPromotionReady ? "YES" : "NO"}. Promotion has not happened; canonical mutation is NONE.`,
    `- Approved release ready: ${readiness.readiness.HYBRID_100_APPROVED_RELEASE_READY}; no immutable release has been created.`,
    "- Source/media rights remain unverified. No source text or media was reused, and no official CEFR, Oxford approval, license, or external authority is claimed.",
    "",
    "## Determinism and boundaries",
    "",
    `- Non-exception semantic decision payloads before/after approval have the same hash (${approval.nonExceptionDecisionPayloadHashBefore}); changed CEFR decision payload count: 0. Classification identity map unchanged; changed ID count: 0.`,
    "- Stable full-owner fingerprint repeats on check/materialize rerun; second run allocates 0 Classification IDs and 0 Provenance IDs.",
    "- Canonical Master, root manifest, workspace predecessor Classification r1, and canary/release tree were unchanged. No import, scanner, database, migration, development runtime, or production operation ran.",
    "",
  ].join("\n");
}

function normalizedProvenance(records: JsonObject[]): JsonObject[] {
  return sorted(records.map((record) => {
    const normalized = { ...record };
    delete normalized.createdAt;
    return { provenanceId: record.provenanceId, contentHash: canonicalHash(normalized), record: normalized };
  }), (record) => record.provenanceId);
}

export function buildFullOwnerApprovalPlan(root: string, mode: "check" | "materialize" = "check"): ApprovalPlan {
  const pinned = validateBasePins(root);
  const baseManifest = pinned.manifest;
  const decisionDocument = pinned.decisionDocument;
  const ownerClosure = pinned.closure;
  const fullApprovalPath = path.join(root, WORKSPACE, "full-owner-approval.json");
  const priorApproval = existsSync(fullApprovalPath) ? readJson<JsonObject>(root, `${WORKSPACE}/full-owner-approval.json`) : null;
  const currentRows = decisionDocument.rows as JsonObject[];
  const initialPendingRows = currentRows.filter((row) => row.reviewStatus === "PENDING_OWNER_REVIEW");
  const exceptionSenseIds = new Set((ownerClosure.decisions as JsonObject[]).map((row) => row.masterSenseId));
  const newlyApprovedRows = priorApproval
    ? (priorApproval.newlyApprovedDecisions as JsonObject[]).map((pin) => {
      const row = currentRows.find((candidate) => candidate.candidateId === pin.candidateId && candidate.masterSenseId === pin.masterSenseId);
      if (!row) fail(`FULL_APPROVAL_ROW_MISSING: ${String(pin.candidateId)}`);
      if (canonicalHash(semanticPayload(row)) !== pin.semanticPayloadHash || row.reviewStatus !== "OWNER_DECISION_ACCEPTED" || row.ownerDecisionStatus !== "ACCEPTED") fail(`FULL_APPROVAL_ROW_DRIFT: ${String(pin.candidateId)}`);
      return row;
    })
    : initialPendingRows;

  if (!priorApproval && (newlyApprovedRows.length !== 95 || newlyApprovedRows.some((row) => exceptionSenseIds.has(row.masterSenseId)))) fail("EXPECTED_95_PENDING_NON_EXCEPTION_ROWS_REQUIRED");
  if (priorApproval && priorApproval.approvedPackageFingerprint !== PARENT_OWNER_CLOSURE_FINGERPRINT) fail("FULL_OWNER_APPROVAL_PARENT_STALE");
  if (newlyApprovedRows.length !== 95 || newlyApprovedRows.some((row) => row.editorialDecision.decisionType === "OWNER_REVIEW_REQUIRED")) fail("FULL_OWNER_APPROVAL_SCOPE_INVALID");
  if (newlyApprovedRows.some((row) => row.editorialDecision.valueCode === null || !row.editorialDecision.classificationId && row.editorialDecision.decisionType !== "UNCLASSIFIED_INSUFFICIENT_EVIDENCE")) fail("APPROVAL_ROW_CLASSIFICATION_MISSING");
  if (newlyApprovedRows.filter((row) => row.editorialDecision.decisionType === "NEW_EDITORIAL_CLASSIFICATION").length !== 94 || newlyApprovedRows.filter((row) => row.editorialDecision.decisionType === "REUSE_EXISTING_CLASSIFICATION").length !== 1) fail("EXPECTED_94_NEW_AND_WATER_REUSE_REQUIRED");
  const waterRow = newlyApprovedRows.find((row) => row.masterSenseId === WATER_SENSE_ID);
  if (!waterRow || waterRow.lemma !== "water" || waterRow.partOfSpeechCode !== "VERB" || waterRow.editorialDecision.decisionType !== "REUSE_EXISTING_CLASSIFICATION") fail("WATER_REUSE_ROW_INVALID");

  const rowsFinal = clone(currentRows);
  const newlyApprovedIds = new Set(newlyApprovedRows.map((row) => row.candidateId));
  for (const row of rowsFinal) {
    if (!newlyApprovedIds.has(row.candidateId)) continue;
    row.reviewStatus = "OWNER_DECISION_ACCEPTED";
    row.ownerDecisionStatus = "ACCEPTED";
    row.ownerDecisionScope = "CEFR_FULL_COHORT_REVIEW";
    row.reviewedBy = "VocabFlow project owner";
  }
  const pendingCount = rowsFinal.filter((row) => row.reviewStatus === "PENDING_OWNER_REVIEW" || row.ownerDecisionStatus === "PENDING_OWNER_REVIEW").length;
  const classifiedCount = rowsFinal.filter((row) => row.editorialDecision.valueCode !== null).length;
  const unclassifiedRows = rowsFinal.filter((row) => row.editorialDecision.valueCode === null);
  const counts = decisionCounts(rowsFinal);
  const levels = distribution(rowsFinal);
  if (rowsFinal.length !== 100 || classifiedCount !== 99 || unclassifiedRows.length !== 1 || pendingCount !== 0 || unclassifiedRows[0]?.lemma !== "fuse" || canonicalHash(levels) !== canonicalHash(EXPECTED_DISTRIBUTION)) fail("FINAL_OWNER_APPROVAL_COUNTS_INVALID");
  const expectedDecisionCounts = { NEW_EDITORIAL_CLASSIFICATION: 97, REUSE_EXISTING_CLASSIFICATION: 1, REVISE_EXISTING_CLASSIFICATION: 1, UNCLASSIFIED_INSUFFICIENT_EVIDENCE: 1 };
  if (canonicalHash(counts) !== canonicalHash(expectedDecisionCounts)) fail("DECISION_TYPES_CHANGED_DURING_FULL_APPROVAL");

  const originalRegistry = readJson<JsonObject>(root, `${WORKSPACE}/classification-registry.json`);
  const registry = clone(originalRegistry);
  const registryItems = registry.mappings as RegistryMapping[];
  if (registryItems.length !== 100) fail("CLASSIFICATION_REGISTRY_SIZE_INVALID");
  const originalIdentityHash = decisionIdentityHash(currentRows);
  const finalIdentityHash = decisionIdentityHash(rowsFinal);
  if (originalIdentityHash !== finalIdentityHash) fail("CLASSIFICATION_IDS_CHANGED_DURING_APPROVAL");
  const mappingsBySense = new Map(registryItems.map((mapping) => [mapping.masterSenseId, mapping]));

  const classRecords = listJsonRecords(root, `${WORKSPACE}/classifications`);
  if (classRecords.length !== 98) fail("WORKSPACE_CLASSIFICATION_COUNT_STALE");
  const classById = new Map(classRecords.map((record) => [record.classificationId, record]));
  const provenanceRecords = listJsonRecords(root, `${WORKSPACE}/provenance`);
  if (provenanceRecords.length !== (priorApproval ? 197 : 102)) fail("WORKSPACE_PROVENANCE_COUNT_STALE");
  const provenanceById = new Map(provenanceRecords.map((record) => [record.provenanceId, record]));
  const ownerReviewBySubject = new Map<string, JsonObject[]>();
  for (const record of provenanceRecords.filter((item) => item.sourceType === "OWNER_REVIEW" && item.subjectType === "CLASSIFICATION")) {
    const records = ownerReviewBySubject.get(record.subjectId) ?? [];
    records.push(record);
    ownerReviewBySubject.set(record.subjectId, records);
  }
  const projectAuthoredBySubject = new Map<string, JsonObject[]>();
  for (const record of provenanceRecords.filter((item) => item.sourceType === "PROJECT_AUTHORED" && item.subjectType === "CLASSIFICATION")) {
    const records = projectAuthoredBySubject.get(record.subjectId) ?? [];
    records.push(record);
    projectAuthoredBySubject.set(record.subjectId, records);
  }
  const expectedOwnerReviewIds = new Map<string, string>();
  const newlyCreatedOwnerProvenance: string[] = [];
  for (const row of rowsFinal.filter((candidate) => candidate.editorialDecision.valueCode !== null)) {
    const mapping = mappingsBySense.get(row.masterSenseId);
    const classificationId = row.editorialDecision.classificationId;
    if (!mapping || !classificationId || mapping.classificationId !== classificationId) fail(`CLASSIFICATION_ID_MAPPING_CHANGED: ${row.lemma}`);
    const existingReviews = ownerReviewBySubject.get(classificationId) ?? [];
    if (existingReviews.length > 1) fail(`DUPLICATE_OWNER_REVIEW_PROVENANCE: ${classificationId}`);
    let provenanceId = existingReviews[0]?.provenanceId;
    if (!provenanceId) {
      const stableId = stableUuidV7(`PROVENANCE|${PARENT_OWNER_CLOSURE_FINGERPRINT}|full-owner-review|${row.masterSenseId}|${classificationId}`);
      if (provenanceById.has(stableId)) fail(`OWNER_PROVENANCE_ID_COLLISION: ${stableId}`);
      provenanceId = stableId;
      const record = ownerProvenance(provenanceId, classificationId);
      validateProvenance(root, record);
      provenanceById.set(provenanceId, record);
      ownerReviewBySubject.set(classificationId, [record]);
      newlyCreatedOwnerProvenance.push(provenanceId);
    }
    expectedOwnerReviewIds.set(row.masterSenseId, provenanceId);
    if (!mapping.provenanceIds.includes(provenanceId)) mapping.provenanceIds.push(provenanceId);

    const review = ownerReviewBySubject.get(classificationId) ?? [];
    if (review.length !== 1 || review[0]?.provenanceId !== provenanceId) fail(`OWNER_REVIEW_EVIDENCE_NOT_UNIQUE: ${row.lemma}`);
    if (row.editorialDecision.decisionType === "NEW_EDITORIAL_CLASSIFICATION") {
      const classification = classById.get(classificationId);
      if (!classification) fail(`WORKSPACE_CLASSIFICATION_MISSING: ${classificationId}`);
      const projectIds = classification.sourceProvenanceIds as string[];
      const projectEvidence = projectIds.map((id) => provenanceById.get(id)).filter((item) => item?.sourceType === "PROJECT_AUTHORED" && item.subjectId === classificationId);
      if (projectEvidence.length !== 1 || (projectAuthoredBySubject.get(classificationId) ?? []).length !== 1) fail(`PROJECT_AUTHORED_PROVENANCE_MISSING_OR_DUPLICATE: ${classificationId}`);
      if (!projectIds.includes(provenanceId)) projectIds.push(provenanceId);
      classification.sourceProvenanceIds = [...new Set(projectIds)];
    }
  }

  const allOwnerReviews = [...provenanceById.values()].filter((item) => item.sourceType === "OWNER_REVIEW" && item.subjectType === "CLASSIFICATION");
  if (allOwnerReviews.length !== 99 || ownerReviewBySubject.size !== 99) fail("OWNER_REVIEW_PROVENANCE_COVERAGE_INVALID");
  const fuse = rowsFinal.find((row) => row.lemma === "fuse");
  if (!fuse || fuse.editorialDecision.classificationId !== null || [...provenanceById.values()].some((record) => record.sourceType === "OWNER_REVIEW" && record.subjectId === fuse.editorialDecision.classificationId)) fail("FUSE_CLASSIFICATION_PROVENANCE_FORBIDDEN");
  for (const record of classById.values()) {
    const reviews = (record.sourceProvenanceIds as string[]).map((id) => provenanceById.get(id)).filter((item) => item?.sourceType === "OWNER_REVIEW");
    if (reviews.length !== 1 || reviews[0]?.subjectId !== record.classificationId) fail(`WORKSPACE_CLASSIFICATION_OWNER_EVIDENCE_INVALID: ${String(record.classificationId)}`);
    validateClassification(root, record);
  }

  const initialNonExceptionHash = priorApproval?.nonExceptionDecisionPayloadHashBefore ?? canonicalHash(sorted(newlyApprovedRows.map(semanticPayload), (row) => row.candidateId));
  const afterNonExceptionHash = canonicalHash(sorted(newlyApprovedRows.map(semanticPayload), (row) => row.candidateId));
  if (initialNonExceptionHash !== afterNonExceptionHash) fail("CEFR_VALUES_CHANGED_BY_FULL_OWNER_APPROVAL");
  const beforeIdentityHash = priorApproval?.classificationIdentityMapHashBefore ?? originalIdentityHash;
  if (beforeIdentityHash !== finalIdentityHash) fail("CLASSIFICATION_IDENTITIES_CHANGED_BY_FULL_OWNER_APPROVAL");
  const approvedRowsPins = sorted(newlyApprovedRows.map((row) => ({
    candidateId: row.candidateId,
    masterSenseId: row.masterSenseId,
    decisionType: row.editorialDecision.decisionType,
    classificationId: row.editorialDecision.classificationId,
    semanticPayloadHash: canonicalHash(semanticPayload(row)),
    ownerReviewProvenanceId: expectedOwnerReviewIds.get(row.masterSenseId),
  })), (row) => row.candidateId);
  if (priorApproval && canonicalHash(priorApproval.newlyApprovedDecisions) !== canonicalHash(approvedRowsPins)) fail("FULL_APPROVAL_DECISION_PINS_STALE");

  const finalProvenanceRecords = sorted([...provenanceById.values()], (record) => record.provenanceId);
  if (finalProvenanceRecords.length !== 197) fail("FINAL_PROVENANCE_COUNT_INVALID");
  const projectCount = finalProvenanceRecords.filter((record) => record.sourceType === "PROJECT_AUTHORED").length;
  const ownerCount = finalProvenanceRecords.filter((record) => record.sourceType === "OWNER_REVIEW").length;
  if (projectCount !== 98 || ownerCount !== 99) fail("FINAL_PROVENANCE_MODEL_INVALID");
  for (const record of finalProvenanceRecords) validateProvenance(root, record);

  const lightClass = classById.get(LIGHT_CLASSIFICATION_ID);
  if (!lightClass || lightClass.classificationRevision !== 2 || lightClass.masterSenseId !== LIGHT_SENSE_ID || lightClass.valueCode !== "A1" || lightClass.status !== "DRAFT") fail("LIGHT_REVISION_2_PLAN_INVALID");
  const waterMapping = mappingsBySense.get(WATER_SENSE_ID);
  const waterCanonicalId = waterRow?.editorialDecision.classificationId;
  if (!waterMapping || !waterRow || !waterCanonicalId || waterMapping.classificationId !== waterCanonicalId) fail("WATER_CLASSIFICATION_ID_CHANGED");
  const waterPin = (pinned.dataset.includedClassifications as Pin[]).find((pin) => pin.classificationId === waterCanonicalId);
  const waterCanonical = waterPin ? readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", waterPin.recordPath)) : null;
  if (!waterPin || !waterCanonical || canonicalHash(waterCanonical) !== waterPin.contentHash || waterCanonical.valueCode !== waterRow.editorialDecision.valueCode) fail("WATER_CANONICAL_CLASSIFICATION_CHANGED");

  const decisionFinal = {
    ...clone(decisionDocument),
    rows: rowsFinal,
    status: "EDITORIAL_CLASSIFICATION_DRAFT",
    fullOwnerApprovalStatus: "CLOSED",
    fullOwnerApprovalFingerprint: null,
    ownerApprovedDecisionCount: 100,
    ownerApprovedClassifiedCount: 99,
    ownerApprovedUnclassifiedCount: 1,
    pendingOwnerReviewCount: 0,
  };
  const releaseReadiness = readJson<JsonObject>(root, `${WORKSPACE}/release-readiness.json`);
  delete releaseReadiness.cefrDraftFingerprint;
  delete releaseReadiness.fullOwnerApprovalFingerprint;
  releaseReadiness.gates.CEFR = {
    ...releaseReadiness.gates.CEFR,
    status: "PASS",
    editorialAssignmentsResolved: 100,
    editorialAssignmentPercent: 100,
    ownerApprovedDecisions: 100,
    ownerApprovedClassified: 99,
    intentionallyUnclassified: 1,
    remainingGeneralOwnerReviewCount: 0,
    ownerApprovalScope: "FULL_HYBRID_100_CEFR_COHORT",
    fullOwnerApproval: "CLOSED",
  };
  releaseReadiness.gates.CANONICAL_CLASSIFICATION_PROMOTION = { status: "READY", reason: "All 100 CEFR decisions are owner-reviewed, the 99 classified outcomes have unique owner-review evidence, classification and provenance schemas pass, and the pinned canonical predecessor remains unchanged. Promotion has not occurred." };
  releaseReadiness.readiness = { HYBRID_100_CONTENT_COHORT_READY: "YES", HYBRID_100_APPROVED_RELEASE_READY: "NO" };
  releaseReadiness.canonicalClassificationPromotionReady = true;
  releaseReadiness.canonicalClassificationMutation = "NONE";
  releaseReadiness.noCanonicalClassificationMutation = true;
  releaseReadiness.noReleaseCreated = true;
  releaseReadiness.databaseWrites = "NONE";
  releaseReadiness.importApplyExecuted = false;
  releaseReadiness.ownerApprovedDecisionCount = 100;
  releaseReadiness.ownerApprovedClassifiedCount = 99;
  releaseReadiness.ownerApprovedUnclassifiedCount = 1;
  releaseReadiness.pendingOwnerReviewCount = 0;
  releaseReadiness.ownerReviewProvenanceCoverage = "99/99";
  releaseReadiness.canonicalPromotionAuthorized = false;
  releaseReadiness.releaseCreationAuthorized = false;
  releaseReadiness.runtimeAuthorized = false;
  releaseReadiness.productionAuthorized = false;

  const parentApprovalDraft = {
    artifactType: "HYBRID_100_CEFR_FULL_OWNER_APPROVAL",
    approvedPackageFingerprint: PARENT_OWNER_CLOSURE_FINGERPRINT,
    previousCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    approvedSemanticDraftFingerprint: APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
    canonicalPromotionFingerprint: CANONICAL_PROMOTION_FINGERPRINT,
    reviewScope: "FULL_HYBRID_100_CEFR_COHORT",
    approvedCandidateCount: 100,
    approvedClassifiedDecisionCount: 99,
    approvedUnclassifiedDecisionCount: 1,
    priorExceptionApprovalCount: 5,
    newlyApprovedPendingRows: 95,
    newlyApprovedDecisions: approvedRowsPins,
    approvedBy: "VocabFlow project owner",
    nonExceptionDecisionPayloadHashBefore: initialNonExceptionHash,
    nonExceptionDecisionPayloadHashAfter: afterNonExceptionHash,
    nonExceptionCefrValuesChanged: 0,
    classificationIdentityMapHashBefore: beforeIdentityHash,
    classificationIdentityMapHashAfter: finalIdentityHash,
    classificationIdsChanged: 0,
    ownerReviewProvenanceIdCount: newlyCreatedOwnerProvenance.length || priorApproval?.newOwnerReviewProvenanceIds?.length || 0,
    effectiveOwnerReviewProvenanceCount: ownerCount,
    projectAuthoredProvenanceCount: projectCount,
    totalWorkspaceProvenanceCount: finalProvenanceRecords.length,
    ownerReviewDecisionCoverage: "99/99",
    ownerReviewProvenanceIdsByClassifiedSense: Object.fromEntries([...expectedOwnerReviewIds.entries()].sort(([left], [right]) => left.localeCompare(right, "en"))),
    newOwnerReviewProvenanceIds: priorApproval?.newOwnerReviewProvenanceIds ?? newlyCreatedOwnerProvenance.sort(),
    canonicalPromotionReady: true,
    canonicalPromotionAuthorized: false,
    releaseCreationAuthorized: false,
    runtimeAuthorized: false,
    productionAuthorized: false,
    rightsBoundary: { sourceRightsVerified: false, mediaReuseEligible: false, sourceTextReused: false, sourceClaimedAsOfficial: false },
  };
  const classRecordsSorted = sorted([...classById.values()], (record) => `${record.classificationId}-r${record.classificationRevision}`);
  const classPins = classRecordsSorted.map((record) => ({ recordPath: `classifications/${record.classificationId}-r${record.classificationRevision}.json`, contentHash: canonicalHash(record), record }));
  const fingerprintInput = {
    fingerprintVersion: "HYBRID-100-CEFR-FULL-OWNER-APPROVAL-FINGERPRINT-1",
    parentOwnerClosureFingerprint: PARENT_OWNER_CLOSURE_FINGERPRINT,
    previousCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    approvedSemanticDraftFingerprint: APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
    canonicalPromotionFingerprint: CANONICAL_PROMOTION_FINGERPRINT,
    sourceProofFingerprint: SOURCE_PROOF_FINGERPRINT,
    taxonomyPin: baseManifest.taxonomyPin,
    parentOwnerClosure: ownerClosure,
    decisionRows: sorted(rowsFinal, (row) => row.candidateId),
    fullOwnerApproval: parentApprovalDraft,
    classificationRegistry: registry,
    classificationRecords: classPins,
    projectAuthoredProvenance: normalizedProvenance(finalProvenanceRecords.filter((record) => record.sourceType === "PROJECT_AUTHORED")),
    ownerReviewProvenance: normalizedProvenance(finalProvenanceRecords.filter((record) => record.sourceType === "OWNER_REVIEW")),
    lightRevisionPlan: ownerClosure.revisionPlans,
    releaseReadiness,
  };
  const fullOwnerApprovalFingerprint = canonicalHash(fingerprintInput);
  if (priorApproval && priorApproval.fullOwnerApprovedCefrFingerprint !== fullOwnerApprovalFingerprint) fail("FULL_OWNER_APPROVAL_FINGERPRINT_STALE");
  const approval = { ...parentApprovalDraft, fullOwnerApprovedCefrFingerprint: fullOwnerApprovalFingerprint };
  const decisionsWithFingerprint = { ...decisionFinal, fullOwnerApprovalFingerprint };
  const releaseReadinessFinal = { ...releaseReadiness, fullOwnerApprovalFingerprint };
  const manifest = {
    ...baseManifest,
    cefrDraftFingerprint: fullOwnerApprovalFingerprint,
    parentOwnerClosureFingerprint: PARENT_OWNER_CLOSURE_FINGERPRINT,
    fullOwnerApprovalFingerprint,
    fullOwnerApprovalStatus: "CLOSED",
    ownerApprovedDecisionCount: 100,
    ownerApprovedClassifiedCount: 99,
    ownerApprovedUnclassifiedCount: 1,
    pendingOwnerReviewCount: 0,
    projectAuthoredClassificationProvenanceCount: projectCount,
    ownerReviewClassificationProvenanceCount: ownerCount,
    newProvenanceCount: finalProvenanceRecords.length,
    newOwnerReviewProvenanceCount: parentApprovalDraft.newOwnerReviewProvenanceIds.length,
    workspaceProvenanceRecordCount: finalProvenanceRecords.length,
    canonicalClassificationPromotionReady: true,
    canonicalClassificationPromotionAuthorized: false,
    canonicalClassificationMutation: "NONE",
    canonicalSemanticMutation: "NONE",
    releaseCreated: false,
    releaseCreationAuthorized: false,
    runtimeAuthorized: false,
    productionAuthorized: false,
    sourceRightsVerified: false,
    mediaReuseEligible: false,
    CEFR_FULL_OWNER_APPROVAL: "YES",
    classificationUuidAllocationsInFullApproval: 0,
    provenanceUuidAllocationsInFullApproval: parentApprovalDraft.newOwnerReviewProvenanceIds.length,
    classificationUuidAllocationsOnRerun: 0,
    provenanceUuidAllocationsOnRerun: 0,
    releaseReadiness: { HYBRID_100_CONTENT_COHORT_READY: "YES", HYBRID_100_APPROVED_RELEASE_READY: "NO" },
  };
  const validationSummary = {
    artifactType: "HYBRID_100_CEFR_FULL_OWNER_APPROVAL_VALIDATION_SUMMARY",
    status: "PASS",
    parentOwnerClosureFingerprint: PARENT_OWNER_CLOSURE_FINGERPRINT,
    fullOwnerApprovedCefrFingerprint: fullOwnerApprovalFingerprint,
    decisionCount: 100,
    classifiedDecisionCount: 99,
    intentionallyUnclassifiedCount: 1,
    pendingOwnerReviewCount: 0,
    decisionCounts: counts,
    distribution: levels,
    noDuplicatePrimaryCefr: true,
    frameworkValid: true,
    taxonomyValid: true,
    classificationIdsStable: true,
    provenanceIdsStableOnRerun: true,
    ownerReviewProvenanceCoverage: "99/99",
    noDuplicateOwnerReviewProvenance: true,
    fuseIntentionallyUnclassified: true,
    fuseClassificationProvenance: false,
    waterReuseGovernanceProvenance: true,
    lightRevisionPlanValid: true,
    lightCanonicalPredecessorUnchanged: true,
    lightPredecessorContentHash: pinned.lightPin.contentHash,
    lightPredecessorHashRendered: true,
    classificationSchemasValid: true,
    provenanceSchemasValid: true,
    projectAuthoredProvenanceCount: projectCount,
    ownerReviewProvenanceCount: ownerCount,
    totalWorkspaceProvenanceCount: finalProvenanceRecords.length,
    nonExceptionCefrValuesChanged: 0,
    classificationIdsChanged: 0,
    sourceRightsVerified: false,
    mediaReuseEligible: false,
    sourceTextReused: false,
    sourceClaimedAsOfficial: false,
    canonicalClassificationPromotionReady: true,
    canonicalClassificationMutation: "NONE",
    rootManifestMutation: "NONE",
    releaseCreated: false,
    approvedReleaseReady: false,
    canaryChanged: false,
    runtimeImportStarted: false,
    databaseWrites: "NONE",
    productionMutation: false,
    repeatFingerprintIdentical: true,
    classificationUuidsAllocatedOnRerun: 0,
    provenanceUuidsAllocatedOnRerun: 0,
  };
  const qa = readJson<JsonObject>(root, `${WORKSPACE}/reports/qa-summary.json`);
  const sourceSummary = readJson<JsonObject>(root, `${WORKSPACE}/source-evidence-summary.json`);
  const sourceSummaryFinal = { ...sourceSummary, cefrDraftFingerprint: fullOwnerApprovalFingerprint };
  const qaFinal = {
    ...qa,
    fullOwnerApproval: { status: "CLOSED", approvedDecisions: 100, approvedClassified: 99, acceptedUnclassified: 1, pendingOwnerReview: 0, ownerReviewProvenanceCoverage: "99/99" },
    rightsBoundary: { sourceRightsVerified: false, sourceClaimedAsOfficial: false, licensedSourceProvenanceCreated: false, publicDomainSourceProvenanceCreated: false, sourceTextReused: false, externalMediaReused: false },
    qualityGate: { ...qa.qualityGate, cefrEditorialQa: "PASS", fullOwnerReview: "CLOSED", ownerReviewProvenanceCoverage: "PASS", duplicatePrimaryCefr: "PASS" },
    fullOwnerApprovalFingerprint,
  };
  const readme = [
    "# Hybrid 100 CEFR Editorial Draft — Full Owner Approval Closed",
    "",
    "Status: `EDITORIAL_CLASSIFICATION_DRAFT`. All 100 CEFR editorial decision outcomes are owner-reviewed; 99 have values and fuse is intentionally unclassified.",
    "",
    `Parent Phase 2F.4A fingerprint: ${PARENT_OWNER_CLOSURE_FINGERPRINT}. Full owner-approved fingerprint: ${fullOwnerApprovalFingerprint}.`,
    "",
    "No CEFR values, confidence, decision types, classification IDs, Sense IDs, rationales, or agreement statuses changed in Phase 2F.4B. The prior five exception outcomes are preserved. The 94 remaining new Classification decisions and the water reuse decision now have workspace owner-review provenance.",
    "",
    "Canonical Classification promotion is ready for a separate operation; it has not occurred. The light A1 revision-2 record remains a workspace DRAFT plan. No canonical record, dataset manifest, canary, or release changed, and no runtime, database, migration, or production operation occurred.",
    "",
    "Source/media rights remain unverified. These CEFR assignments are VocabFlow editorial estimates under `CEFR / EDITORIAL-PILOT-1`, not official classifications or claims of Oxford/source approval.",
    "",
    "Run `pnpm vocab:hybrid-100-cefr-full-owner-approval --check` to verify this closure. A repeat run allocates no Classification or Provenance IDs.",
    "",
  ].join("\n");

  const files = new Map<string, string>();
  const addJson = (relativePath: string, value: unknown) => files.set(`${WORKSPACE}/${relativePath}`, jsonBytes(value));
  addJson("manifest.json", manifest);
  addJson("cefr-decisions.json", decisionsWithFingerprint);
  addJson("classification-registry.json", registry);
  addJson("release-readiness.json", releaseReadinessFinal);
  addJson("full-owner-approval.json", approval);
  addJson("validation-summary.json", validationSummary);
  addJson("reports/qa-summary.json", qaFinal);
  addJson("source-evidence-summary.json", sourceSummaryFinal);
  files.set(`${WORKSPACE}/README.md`, readme);
  for (const record of classRecordsSorted) {
    const relativePath = `classifications/${record.classificationId}-r${record.classificationRevision}.json`;
    addJson(relativePath, record);
  }
  for (const record of finalProvenanceRecords) addJson(`provenance/${record.provenanceId}.json`, record);
  files.set(OWNER_SHEET, renderOwnerSheet(rowsFinal, pinned.lightPin, approval, counts, levels));
  files.set(DRAFT_REPORT, renderDraftReport({ approval, decisionCounts: counts, distribution: levels, readiness: releaseReadinessFinal, projectAuthoredProvenanceCount: projectCount, ownerReviewProvenanceCount: ownerCount, totalProvenanceCount: finalProvenanceRecords.length }));
  assertRightsSafe({ rowsFinal, registry, classifications: classRecordsSorted, provenanceRecords: finalProvenanceRecords, approval, releaseReadinessFinal });

  const newClassificationUuidCount = 0;
  const newProvenanceUuidCount = newlyCreatedOwnerProvenance.length;
  const summary = {
    status: "PASS",
    parentOwnerClosureFingerprint: PARENT_OWNER_CLOSURE_FINGERPRINT,
    previousCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    fullOwnerApprovedCefrFingerprint: fullOwnerApprovalFingerprint,
    candidateCount: 100,
    ownerApprovedDecisions: 100,
    ownerApprovedClassified: 99,
    ownerApprovedUnclassified: 1,
    pendingOwnerReview: 0,
    decisionCounts: counts,
    distribution: levels,
    previouslyPendingRowsApproved: 95,
    newlyApprovedNewClassifications: 94,
    newlyApprovedReusedClassifications: 1,
    newClassificationUuidsAllocatedOnThisRun: mode === "materialize" ? newClassificationUuidCount : 0,
    newOwnerReviewProvenanceIdsAllocatedOnThisRun: mode === "materialize" ? newProvenanceUuidCount : 0,
    projectAuthoredProvenanceCount: projectCount,
    ownerReviewProvenanceCount: ownerCount,
    totalWorkspaceProvenanceCount: finalProvenanceRecords.length,
    ownerReviewProvenanceCoverage: "99/99",
    lightPredecessorHash: pinned.lightPin.contentHash,
    reportPredecessorHashRendered: true,
    nonExceptionCefrValuesChanged: 0,
    classificationIdsChanged: 0,
    repeatFingerprintIdentical: Boolean(priorApproval),
    canonicalClassificationPromotionReady: true,
    canonicalClassificationMutation: "NONE",
    rootManifestMutation: "NONE",
    releaseCreated: false,
    approvedReleaseReady: false,
    canaryChanged: false,
    runtimeImportStarted: false,
    databaseWrites: "NONE",
    productionMutation: false,
    sourceRightsVerified: false,
    sourceClaimedAsOfficial: false,
  };
  return { files, summary, workspaceRoot: path.join(root, WORKSPACE), fullOwnerApprovalFingerprint };
}

function isAllowedOutput(relativePath: string): boolean {
  return relativePath.startsWith(`${WORKSPACE}/`) || relativePath === OWNER_SHEET || relativePath === DRAFT_REPORT;
}

export function materialize(plan: ApprovalPlan, mode: "check" | "materialize"): void {
  const root = REPO_ROOT;
  const before = protectedSnapshot(root);
  for (const relativePath of plan.files.keys()) if (!isAllowedOutput(relativePath)) fail(`OUTPUT_PATH_FORBIDDEN: ${relativePath}`);
  const approvalPath = path.join(plan.workspaceRoot, "full-owner-approval.json");
  if (mode === "check") {
    if (!existsSync(approvalPath)) fail("FULL_OWNER_APPROVAL_NOT_MATERIALIZED");
    const differences: string[] = [];
    for (const [relativePath, contents] of plan.files) {
      const absolute = path.join(root, relativePath);
      if (!existsSync(absolute) || readFileSync(absolute, "utf8") !== contents) differences.push(relativePath);
    }
    for (const directory of [`${WORKSPACE}/classifications`, `${WORKSPACE}/provenance`]) {
      const planned = new Set([...plan.files.keys()].filter((file) => file.startsWith(`${directory}/`)));
      const absolute = path.join(root, directory);
      const actual = existsSync(absolute) ? readdirSync(absolute, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => `${directory}/${entry.name}`) : [];
      for (const file of actual) if (!planned.has(file)) differences.push(file);
    }
    if (differences.length) fail(`FULL_OWNER_APPROVAL_DIFF_REQUIRED: ${sorted([...new Set(differences)], (file) => file).join(",")}`);
  } else {
    if (existsSync(approvalPath)) {
      const existing = readJson<JsonObject>(root, `${WORKSPACE}/full-owner-approval.json`);
      if (existing.fullOwnerApprovedCefrFingerprint !== plan.fullOwnerApprovalFingerprint) fail("FULL_OWNER_APPROVAL_CONFLICT");
    }
    for (const [relativePath, contents] of plan.files) {
      if (relativePath === `${WORKSPACE}/full-owner-approval.json`) continue;
      const absolute = path.join(root, relativePath);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, contents, "utf8");
    }
    const approvalContents = plan.files.get(`${WORKSPACE}/full-owner-approval.json`);
    if (!approvalContents) fail("FULL_OWNER_APPROVAL_ARTIFACT_MISSING");
    writeFileSync(approvalPath, approvalContents, "utf8");
    const verified = buildFullOwnerApprovalPlan(root, "check");
    if (verified.fullOwnerApprovalFingerprint !== plan.fullOwnerApprovalFingerprint) fail("FULL_OWNER_APPROVAL_POST_WRITE_FINGERPRINT_MISMATCH");
    materialize(verified, "check");
  }
  if (canonicalHash(before) !== canonicalHash(protectedSnapshot(root))) fail("CANONICAL_OR_RELEASE_TREE_CHANGED_DURING_FULL_OWNER_APPROVAL");
}

export function validateCliMode(args: string[]): "check" | "materialize" {
  if (args.length !== 1 || !["--check", "--materialize"].includes(args[0] ?? "")) fail("Usage: pnpm vocab:hybrid-100-cefr-full-owner-approval --check|--materialize");
  return args[0] === "--check" ? "check" : "materialize";
}

export function main(args = process.argv.slice(2)): void {
  const mode = validateCliMode(args);
  const before = protectedSnapshot(REPO_ROOT);
  const plan = buildFullOwnerApprovalPlan(REPO_ROOT, mode);
  materialize(plan, mode);
  if (canonicalHash(before) !== canonicalHash(protectedSnapshot(REPO_ROOT))) fail("CANONICAL_OR_RELEASE_TREE_CHANGED_DURING_FULL_OWNER_APPROVAL");
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
