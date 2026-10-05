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
  createClassificationProvenance,
  createClassificationRecord,
  sha256,
  stableUuidV7,
} from "./hybrid-100-cefr-draft";
import { validateMasterVocabularyDocument } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type Pin = JsonObject & { recordPath: string; contentHash: string };
type RegistryMapping = { registryKey: string; masterSenseId: string; frameworkCode: string; frameworkVersion: string; decisionType: string; classificationId: string | null; provenanceIds: string[] };
type ClosurePlan = { files: Map<string, string>; summary: JsonObject; workspaceRoot: string; cefrDraftFingerprint: string };

export const PREVIOUS_CEFR_DRAFT_FINGERPRINT = "2da4c57ebbd18ce5e2c1fa77749fb7fe79a2f22752ba39506d2f59a7d7804a74";
export const OWNER_EXCEPTION_SCOPE = "CEFR_EXCEPTION_REVIEW";
export const OWNER_REVIEW_SCOPE = "CEFR_EXCEPTION_QUEUE";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-cefr-draft";
const MASTER_WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-editorial-draft";
const SOURCE_WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-sense-proof";
const ROOT_DATASET = "vocabflow-dataset/dataset.json";
const OWNER_SHEET = "vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md";
const DRAFT_REPORT = "vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md";
const LIGHT_CLASSIFICATION_ID = "01a0fc13-09f1-76b9-8a57-6c6e55e9b438";
const LIGHT_SENSE_ID = "01a0fc13-09ee-7768-9be6-d20fa32521ee";
const LIGHT_PREDECESSOR_HASH = "08482dae079eb7932bb7254e9a99277f104d58cf73be9f954b63641996c9763c";
const VALUE_ORDER = ["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2"];
const OWNER_PROVENANCE_SOURCE = "VocabFlow Hybrid 100-Sense CEFR Owner Review";
const OWNER_PROVENANCE_NOTES = "The project owner reviewed and accepted this VocabFlow editorial CEFR estimate under CEFR / EDITORIAL-PILOT-1 in the scoped CEFR exception review. This is not an official CEFR classification and does not assert external source rights.";

const EXCEPTION_SPECS = [
  { ordinal: 15, candidateId: "SOURCE-CANDIDATE-24f8162f0d0ad736b2b735017612166a3b2e2c8a6a7e5058e2ba5ecc7ef3e84b", masterSenseId: LIGHT_SENSE_ID, lemma: "light", partOfSpeechCode: "ADJECTIVE", senseLabel: "not heavy", valueCode: "A1", decisionType: "REVISE_EXISTING_CLASSIFICATION", ownerDecisionStatus: "ACCEPTED" },
  { ordinal: 34, candidateId: "SOURCE-CANDIDATE-483ca72bba68a330bdbee912f9dd46f33e16c187ee234ef3c2679ba342c456c1", masterSenseId: "01a1070c-7c58-76b5-a2a9-620e574defe8", lemma: "freshman", partOfSpeechCode: "NOUN", senseLabel: "first-year student", valueCode: "B2", decisionType: "NEW_EDITORIAL_CLASSIFICATION", ownerDecisionStatus: "ACCEPTED" },
  { ordinal: 48, candidateId: "SOURCE-CANDIDATE-6e8882fc2e38cee29390b9f54184323995c835e89c148eded5c9a24ec0f609ca", masterSenseId: "01a1070c-7c58-76b5-a2aa-aeb83963a729", lemma: "roster", partOfSpeechCode: "NOUN", senseLabel: "organized people list", valueCode: "B2", decisionType: "NEW_EDITORIAL_CLASSIFICATION", ownerDecisionStatus: "ACCEPTED" },
  { ordinal: 67, candidateId: "SOURCE-CANDIDATE-a6a21ce9e065d758b06afa3de50f842559158c17ed094860dd14b53e5d9fe17a", masterSenseId: "01a1070c-7c59-726e-88d4-83e56ae5f536", lemma: "liable", partOfSpeechCode: "ADJECTIVE", senseLabel: "likely to face a problem", valueCode: "C1", decisionType: "NEW_EDITORIAL_CLASSIFICATION", ownerDecisionStatus: "ACCEPTED" },
  { ordinal: 92, candidateId: "SOURCE-CANDIDATE-edd1090de7a2dd8d3692f3458cc1993ebfe573afe167624d4f083bafd51754c4", masterSenseId: "01a1070c-7c59-726e-88d6-cf9dc05adb73", lemma: "fuse", partOfSpeechCode: "NOUN", senseLabel: "ignition cord", valueCode: null, decisionType: "UNCLASSIFIED_INSUFFICIENT_EVIDENCE", ownerDecisionStatus: "ACCEPTED_UNCLASSIFIED" },
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

function jsonBytes(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function countBy<T>(items: T[], key: (item: T) => string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) counts[key(item)] = (counts[key(item)] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "en")));
}

export function distribution(rows: JsonObject[]): JsonObject {
  const result: JsonObject = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, UNCLASSIFIED: 0 };
  for (const row of rows) {
    const value = row.editorialDecision.valueCode;
    if (value === null) result.UNCLASSIFIED += 1;
    else if (VALUE_ORDER.includes(value)) result[value] += 1;
    else fail(`CEFR_VALUE_INVALID: ${String(value)}`);
  }
  return result;
}

export function assertNoDuplicatePrimaryDecisions(rows: JsonObject[]): void {
  const seen = new Map<string, { valueCode: string; candidateId: string }>();
  for (const row of rows) {
    if (["UNCLASSIFIED_INSUFFICIENT_EVIDENCE"].includes(row.editorialDecision.decisionType)) continue;
    const key = `${row.masterSenseId}|${FRAMEWORK_CODE}|${FRAMEWORK_VERSION}`;
    const valueCode = String(row.editorialDecision.valueCode);
    const current = seen.get(key);
    if (current) fail(current.valueCode === valueCode ? "DUPLICATE_PRIMARY_CEFR" : "CONFLICTING_PRIMARY_CEFR");
    seen.set(key, { valueCode, candidateId: row.candidateId });
  }
}

function fileTreeSnapshot(root: string, relativeDirectory: string): JsonObject[] {
  const absolute = path.join(root, relativeDirectory);
  if (!existsSync(absolute)) return [];
  const entries: JsonObject[] = [];
  const visit = (directory: string) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(absolutePath);
      else if (entry.isFile()) entries.push({ path: path.relative(root, absolutePath).split(path.sep).join("/"), sha256: sha256(readFileSync(absolutePath)) });
    }
  };
  visit(absolute);
  return entries.sort((left, right) => String(left.path).localeCompare(String(right.path), "en"));
}

function protectedSnapshot(root: string): JsonObject {
  return {
    dataset: sha256(readFileSync(path.join(root, ROOT_DATASET))),
    lexemes: canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/master/lexemes")),
    senses: canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/master/senses")),
    classifications: canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/master/classifications")),
    releases: canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/releases")),
  };
}

function listJsonRecords(root: string, relativeDirectory: string): JsonObject[] {
  const directory = path.join(root, relativeDirectory);
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .sort((left, right) => left.name.localeCompare(right.name, "en"))
    .map((entry) => JSON.parse(readFileSync(path.join(directory, entry.name), "utf8")) as JsonObject);
}

function validateClassification(root: string, record: JsonObject): void {
  const result = validateMasterVocabularyDocument(record, "common.schema.json", "#/$defs/classification", path.join(root, "vocabflow-dataset", "schemas"));
  if (!result.valid) fail(`CLASSIFICATION_SCHEMA_INVALID: ${String(record.classificationId)}: ${result.issues.map((issue) => issue.message).join("; ")}`);
}

function validateProvenance(root: string, record: JsonObject): void {
  const result = validateMasterVocabularyDocument(record, "provenance.schema.json", undefined, path.join(root, "vocabflow-dataset", "schemas"));
  if (!result.valid) fail(`PROVENANCE_SCHEMA_INVALID: ${String(record.provenanceId)}: ${result.issues.map((issue) => issue.message).join("; ")}`);
}

function ownerReviewProvenance(provenanceId: string, classificationId: string): JsonObject {
  return {
    provenanceId,
    subjectType: "CLASSIFICATION",
    subjectId: classificationId,
    fieldPath: "classification.valueCode",
    sourceType: "OWNER_REVIEW",
    sourceName: OWNER_PROVENANCE_SOURCE,
    authoredBy: "VocabFlow project owner",
    notes: OWNER_PROVENANCE_NOTES,
    createdAt: ID_CREATED_AT,
  };
}

function registryKey(masterSenseId: string): string {
  return `${masterSenseId}|${FRAMEWORK_CODE}|${FRAMEWORK_VERSION}`;
}

function expectedOwnerIds(spec: (typeof EXCEPTION_SPECS)[number], existingMapping: RegistryMapping | undefined, priorClosure: JsonObject | null): { classificationId: string | null; projectProvenanceId: string | null; ownerReviewProvenanceId: string | null } {
  if (spec.decisionType === "UNCLASSIFIED_INSUFFICIENT_EVIDENCE") return { classificationId: null, projectProvenanceId: null, ownerReviewProvenanceId: null };
  if (spec.lemma === "light") {
    const ids = priorClosure?.ids?.light ?? {};
    return {
      classificationId: LIGHT_CLASSIFICATION_ID,
      projectProvenanceId: ids.projectAuthoredProvenanceId ?? stableUuidV7(`PROVENANCE|${registryKey(spec.masterSenseId)}|classification.valueCode`),
      ownerReviewProvenanceId: ids.ownerReviewProvenanceId ?? stableUuidV7(`PROVENANCE|${registryKey(spec.masterSenseId)}|classification.ownerReview`),
    };
  }
  const ids = priorClosure?.ids?.[spec.lemma] ?? {};
  const reservedClassId = existingMapping?.classificationId;
  const reservedProjectId = existingMapping?.provenanceIds?.[0];
  return {
    classificationId: ids.classificationId ?? reservedClassId ?? stableUuidV7(`CLASSIFICATION|${registryKey(spec.masterSenseId)}`),
    projectProvenanceId: ids.projectAuthoredProvenanceId ?? reservedProjectId ?? stableUuidV7(`PROVENANCE|${registryKey(spec.masterSenseId)}|classification.valueCode`),
    ownerReviewProvenanceId: ids.ownerReviewProvenanceId ?? stableUuidV7(`PROVENANCE|${registryKey(spec.masterSenseId)}|classification.ownerReview`),
  };
}

function sourceAgreement(row: JsonObject): string | null {
  const sourceLevels = (row.sourceEvidence.sourceCefrEvidence ?? []) as string[];
  const valueCode = row.editorialDecision.valueCode as string | null;
  if (!sourceLevels.length || valueCode === null) return null;
  return sourceLevels.includes(valueCode) ? "AGREES_WITH_SOURCE" : "EDITORIALLY_ADJUSTED";
}

function applyOwnerDecisions(baseRows: JsonObject[], idsBySense: Map<string, JsonObject>): JsonObject[] {
  const rows = clone(baseRows);
  for (const spec of EXCEPTION_SPECS) {
    const row = rows.find((candidate) => candidate.candidateOrdinal === spec.ordinal);
    if (!row || row.candidateId !== spec.candidateId || row.masterSenseId !== spec.masterSenseId || row.lemma !== spec.lemma || row.partOfSpeechCode !== spec.partOfSpeechCode || row.senseLabel !== spec.senseLabel) fail(`OWNER_EXCEPTION_COHORT_PIN_INVALID: ${spec.lemma}`);
    const ids = idsBySense.get(spec.masterSenseId);
    const priorType = row.editorialDecision.decisionType;
    if (spec.lemma === "light" && !["OWNER_REVIEW_REQUIRED", "REVISE_EXISTING_CLASSIFICATION"].includes(priorType)) fail("LIGHT_EXCEPTION_DECISION_STALE");
    if (["freshman", "roster", "liable"].includes(spec.lemma) && !["OWNER_REVIEW_REQUIRED", "NEW_EDITORIAL_CLASSIFICATION"].includes(priorType)) fail(`OWNER_EXCEPTION_DECISION_STALE: ${spec.lemma}`);
    if (spec.lemma === "fuse" && priorType !== "UNCLASSIFIED_INSUFFICIENT_EVIDENCE") fail("FUSE_EXCEPTION_DECISION_STALE");

    row.editorialDecision.valueCode = spec.valueCode;
    row.editorialDecision.decisionType = spec.decisionType;
    row.editorialDecision.agreementStatus = sourceAgreement(row);
    row.editorialDecision.classificationId = ids?.classificationId ?? null;
    row.reviewStatus = spec.ownerDecisionStatus === "ACCEPTED_UNCLASSIFIED" ? "ACCEPTED_UNCLASSIFIED" : "OWNER_DECISION_ACCEPTED";
    row.ownerDecisionStatus = spec.ownerDecisionStatus;
    row.ownerDecisionScope = OWNER_EXCEPTION_SCOPE;
    row.reviewedBy = "VocabFlow project owner";
    if (spec.lemma !== "fuse") row.editorialDecision.classificationRevision = spec.lemma === "light" ? 2 : 1;
  }
  return rows;
}

function makeOwnerClosure(rows: JsonObject[], idsBySense: Map<string, JsonObject>, predecessor: JsonObject, initialDecisionRowsHash: string): JsonObject {
  const decisions = EXCEPTION_SPECS.map((spec) => {
    const row = rows.find((candidate) => candidate.masterSenseId === spec.masterSenseId);
    if (!row) fail(`OWNER_EXCEPTION_DECISION_MISSING: ${spec.lemma}`);
    const ids = idsBySense.get(spec.masterSenseId) ?? {};
    return {
      candidateOrdinal: spec.ordinal,
      candidateId: spec.candidateId,
      masterSenseId: spec.masterSenseId,
      lemma: spec.lemma,
      partOfSpeechCode: spec.partOfSpeechCode,
      senseLabel: spec.senseLabel,
      priorDecisionType: spec.lemma === "light" || ["freshman", "roster", "liable"].includes(spec.lemma) ? "OWNER_REVIEW_REQUIRED" : "UNCLASSIFIED_INSUFFICIENT_EVIDENCE",
      priorValueCode: spec.lemma === "light" ? "A1" : spec.lemma === "freshman" ? "B1" : spec.lemma === "roster" || spec.lemma === "liable" ? "B2" : null,
      decisionType: spec.decisionType,
      valueCode: spec.valueCode,
      ownerDecisionStatus: spec.ownerDecisionStatus,
      ownerDecisionScope: OWNER_EXCEPTION_SCOPE,
      reviewedBy: "VocabFlow project owner",
      classificationId: ids.classificationId ?? null,
      projectAuthoredProvenanceId: ids.projectAuthoredProvenanceId ?? null,
      ownerReviewProvenanceId: ids.ownerReviewProvenanceId ?? null,
    };
  });
  return {
    artifactType: "HYBRID_100_CEFR_OWNER_REVIEW_CLOSURE",
    reviewScope: OWNER_REVIEW_SCOPE,
    previousCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    approvedSemanticDraftFingerprint: APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
    canonicalPromotionFingerprint: CANONICAL_PROMOTION_FINGERPRINT,
    ownerApprovedExceptionCount: 5,
    classifiedOwnerDecisions: 4,
    acceptedUnclassified: 1,
    approvedBy: "VocabFlow project owner",
    CEFR_EXCEPTION_OWNER_APPROVAL: "YES",
    OWNER_APPROVED_ALL_FUTURE_RELEASE_ACTIONS: false,
    canonicalClassificationPromotionAuthorized: false,
    releaseApprovalAuthorized: false,
    databaseRuntimeOrProductionAuthorized: false,
    ownerExceptionQueue: "CLOSED",
    untouchedNonExceptionDecisionRowsHash: initialDecisionRowsHash,
    decisions,
    revisionPlans: [{
      classificationId: LIGHT_CLASSIFICATION_ID,
      masterSenseId: LIGHT_SENSE_ID,
      dimension: "CEFR",
      frameworkCode: FRAMEWORK_CODE,
      frameworkVersion: FRAMEWORK_VERSION,
      predecessorRevision: 1,
      predecessorValueCode: "A2",
      predecessorStatus: "IN_REVIEW",
      predecessorContentHash: predecessor.contentHash,
      plannedRevision: 2,
      plannedValueCode: "A1",
      plannedRecordPath: `classifications/${LIGHT_CLASSIFICATION_ID}-r2.json`,
      supersedesRevision: 1,
      governanceMetadataOnly: true,
    }],
    ids: Object.fromEntries(EXCEPTION_SPECS.filter((spec) => spec.lemma !== "fuse").map((spec) => {
      const item = idsBySense.get(spec.masterSenseId) ?? {};
      return [spec.lemma, { classificationId: item.classificationId, projectAuthoredProvenanceId: item.projectAuthoredProvenanceId, ownerReviewProvenanceId: item.ownerReviewProvenanceId }];
    })),
    rightsBoundary: { sourceRightsVerified: false, sourceClaimedAsOfficial: false, rawSourceTextReused: false, externalSourceProvenanceCreated: false },
  };
}

function normalizeProvenanceForFingerprint(records: JsonObject[]): JsonObject[] {
  return records.map((record) => {
    const normalized = { ...record };
    delete normalized.createdAt;
    return { provenanceId: record.provenanceId, record: normalized, contentHash: canonicalHash(normalized) };
  }).sort((left, right) => left.provenanceId.localeCompare(right.provenanceId, "en"));
}

function markdownSafe(value: unknown): string {
  return String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
}

function buildOwnerSheet(rows: JsonObject[], counts: JsonObject, levels: JsonObject, predecessor: JsonObject, revision2: JsonObject, closure: JsonObject): string {
  const lines = [
    "# Hybrid 100 CEFR Editorial Owner Review — Exception Closure",
    "",
    "Status: `EDITORIAL_CLASSIFICATION_DRAFT`; the five explicit CEFR exception decisions below are owner-resolved. Approval scope is limited to these five decisions. The other 95 candidate rows retain their prior editorial decision and owner-review status.",
    "",
    `Candidates: ${rows.length} | Reuse: ${counts.REUSE_EXISTING_CLASSIFICATION ?? 0} | Revise existing: ${counts.REVISE_EXISTING_CLASSIFICATION ?? 0} | New editorial: ${counts.NEW_EDITORIAL_CLASSIFICATION ?? 0} | Owner review required: ${counts.OWNER_REVIEW_REQUIRED ?? 0} | Unclassified: ${counts.UNCLASSIFIED_INSUFFICIENT_EVIDENCE ?? 0}`,
    "",
    "| # | Lemma | Sense label | POS | Source CEFR | Existing CEFR | Proposed | Confidence | Decision | Agreement | Review |",
    "|---:|---|---|---|---|---|---|---:|---|---|---|",
  ];
  for (const row of rows) {
    const existing = (row.existingClassificationAudit.records as JsonObject[]).filter((item) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION)
      .map((item) => `${item.valueCode} (${item.status}; ${item.classificationId}; sha256 ${item.contentHash})`).join("; ") || "—";
    lines.push(`| ${row.candidateOrdinal} | ${markdownSafe(row.lemma)} | ${markdownSafe(row.senseLabel)} | ${markdownSafe(row.partOfSpeechCode)} | ${markdownSafe((row.sourceEvidence.sourceCefrEvidence ?? []).join(", ") || "—")} | ${markdownSafe(existing)} | ${markdownSafe(row.editorialDecision.valueCode ?? "UNCLASSIFIED")} | ${Number(row.editorialDecision.confidence).toFixed(2)} | ${markdownSafe(row.editorialDecision.decisionType)} | ${markdownSafe(row.editorialDecision.agreementStatus ?? "NO_SOURCE_CEFR")} | ${markdownSafe(row.reviewStatus)} |`);
  }
  lines.push(
    "",
    "## Final distribution",
    "",
    ...["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2", "UNCLASSIFIED"].map((level) => `- ${level} = ${levels[level] ?? 0}`),
    "",
    "## Owner-resolved exceptions",
    "",
    "| Candidate | Accepted decision | Outcome |",
    "|---|---|---|",
    "| light / ADJECTIVE / not heavy | A1 | Revision 2 is planned under the existing Classification ID; canonical revision 1 remains A2 / IN_REVIEW and unchanged. |",
    "| freshman / NOUN / first-year student | B2 | New workspace DRAFT Classification. |",
    "| roster / NOUN / organized people list | B2 | New workspace DRAFT Classification. |",
    "| liable / ADJECTIVE / likely to face a problem | C1 | New workspace DRAFT Classification. |",
    "| fuse / NOUN / ignition cord | UNCLASSIFIED | Accepted as intentionally unclassified for insufficient evidence; no Classification or Classification provenance. |",
    "",
    `Light predecessor pin: revision 1, value A2, status IN_REVIEW, SHA-256 ${predecessor.contentHash}. Planned workspace record: revision 2, value A1, DRAFT, ${revision2.classificationId}-r2.json; ` +
      "`supersedesRevision` appears only in closure governance metadata, not Classification JSON.",
    "",
    `Owner decision: ${closure.ownerApprovedExceptionCount} exception decisions accepted by ${closure.approvedBy}; ` +
      `scope ${closure.reviewScope}. Owner-review required = 0; intentionally unclassified = 1.`,
    "",
    "The owner approval does not approve the other 95 rows, canonical Classification promotion, a release, runtime/database work, or production. Their previous review states remain unchanged.",
    "",
    "Source and media rights remain unverified. The CEFR values are VocabFlow editorial estimates, not official CEFR or source claims. No raw source definitions, examples, URLs, media, or absolute paths are included.",
    "",
  );
  return lines.join("\n");
}

function buildDraftReport(input: JsonObject): string {
  const counts = input.decisionCounts as JsonObject;
  const levels = input.distribution as JsonObject;
  const sourceCounts = input.sourceCounts as JsonObject;
  const readiness = input.releaseReadiness as JsonObject;
  const qa = input.qaSummary as JsonObject;
  const corrections = qa.editorialFirstPassCorrections;
  const categoryCounts = corrections.categoryCounts;
  return [
    "# Phase 2F.4A — Hybrid 100 CEFR Owner Exception Review Closure",
    "",
    "## Pinned base and scope",
    "",
    `- Exact owner-approved semantic cohort: 100 Senses; canonical Master remains DRAFT 2.0.0 / schema 2.0.1 with 103 Lexemes, 123 Senses, 846 Provenance, and 122 canonical Classifications.`,
    `- Parent CEFR draft fingerprint: ${PREVIOUS_CEFR_DRAFT_FINGERPRINT}; semantic fingerprint: ${APPROVED_SEMANTIC_DRAFT_FINGERPRINT}; promotion fingerprint: ${CANONICAL_PROMOTION_FINGERPRINT}.`,
    `- Framework: ${FRAMEWORK_CODE} / ${FRAMEWORK_VERSION}; taxonomy ${TAXONOMY_ID} version ${TAXONOMY_VERSION}.`,
    "- Owner approval is restricted to the five specified CEFR exceptions. The other 95 rows retain their Phase 2F.4 decisions and review statuses.",
    "",
    "## Closed exception decisions",
    "",
    "- light / ADJECTIVE / not heavy: A1; plan revision 2 using the existing Classification ID. Canonical revision 1 (A2 / IN_REVIEW) is hash-pinned and unchanged.",
    "- freshman: B2; roster: B2; liable: C1. Each has a new workspace DRAFT Classification and project-authored plus owner-review provenance.",
    "- fuse: accepted as intentionally unclassified due to insufficient evidence; no Classification and no provenance attached to a fake Classification.",
    `- Decision counts: reuse ${counts.REUSE_EXISTING_CLASSIFICATION ?? 0}; revise ${counts.REVISE_EXISTING_CLASSIFICATION ?? 0}; new editorial ${counts.NEW_EDITORIAL_CLASSIFICATION ?? 0}; owner review required ${counts.OWNER_REVIEW_REQUIRED ?? 0}; intentionally unclassified ${counts.UNCLASSIFIED_INSUFFICIENT_EVIDENCE ?? 0}.`,
    "",
    "## Distribution and evidence",
    "",
    ...["PRE_A1", "A1", "A2", "B1", "B2", "C1", "C2", "UNCLASSIFIED"].map((level) => `- ${level} = ${levels[level] ?? 0}`),
    `- Oxford-backed agreement: ${sourceCounts.oxfordAgreement}/90 (${(sourceCounts.oxfordAgreement / 90 * 100).toFixed(1)}%); editorial adjustments ${sourceCounts.editoriallyAdjusted}; unresolved source conflicts ${sourceCounts.conflictRequiresOwnerReview}.`,
    `- 4600-only: ${sourceCounts.only4600Classified}/10 receive an editorial value. Fuse remains intentionally unclassified; no 4600 CEFR value was inherited.`,
    `- Confidence bands unchanged except the exception decisions: strong ${qa.confidenceBands.strong}; reasonable ${qa.confidenceBands.reasonable}; tentative ${qa.confidenceBands.tentative}; below 0.60 ${qa.confidenceBands.belowThreshold}. The three low-confidence classifications were explicitly accepted by the owner.`,
    `- Existing CEFR audit: ${qa.existingClassificationAudit.candidatesWithExistingCefr} candidates have canonical CEFR records; one existing-value mismatch is resolved by the workspace revision-2 plan. Duplicate primary CEFR decisions: 0.`,
    `- Polysemy review: ${qa.polysemyReview.reviewedGroups} multi-Sense groups; ${qa.polysemyReview.status}.`,
    "",
    "## Quality and rights",
    "",
    `- Editorial first-pass correction rate remains ${corrections.candidateLevelIssueGroups}/${corrections.newlyAuthoredSenseCount} (${(corrections.rate * 100).toFixed(2)}%). Categories overlap: semantic target/label ${categoryCounts.semanticTargetOrSenseLabel}; definition ${categoryCounts.definition}; translation ${categoryCounts.translation}; example ${categoryCounts.example}; naturalness ${categoryCounts.naturalness}; collocation ${categoryCounts.collocation}.`,
    "- Source and media rights remain UNVERIFIED. No source prose or media was reused; no LICENSED_SOURCE or PUBLIC_DOMAIN_SOURCE provenance was created. Editorial labels are not official CEFR/source claims.",
    "- Exception queue CLOSED; all 100 rows have a resolved editorial decision outcome, values are present for 99/100, and one is intentionally unclassified. The 95 non-exception rows keep their prior general PENDING_OWNER_REVIEW status.",
    "",
    "## Readiness boundary",
    "",
    `- CEFR editorial decision gate: ${readiness.gates.CEFR.status}; exception queue CLOSED. Canonical Classification promotion readiness: NO because this phase approves only five exceptions and leaves the other 95 owner-review states unchanged.`,
    `- Content cohort ready: ${readiness.readiness.HYBRID_100_CONTENT_COHORT_READY}. Approved release ready: ${readiness.readiness.HYBRID_100_APPROVED_RELEASE_READY}. Canonical promotion is a separate operation; release construction has not occurred.`,
    "- No canonical classifications, senses, lexemes, root manifest, or releases changed. No runtime import, scanner, database, migration, or production operation was executed.",
    "",
    "## Determinism",
    "",
    `- Parent CEFR draft fingerprint: ${PREVIOUS_CEFR_DRAFT_FINGERPRINT}. Closed-package fingerprint: ${input.fingerprint}.`,
    "- Fingerprint covers the exact cohort pins, owner decisions, updated registry, Classification records, timestamp-normalized provenance records, readiness contract, and closure artifact. Timestamps and absolute paths are excluded.",
    "- Classification UUIDv7 allocations in this closure: 3; new provenance IDs: 8. The rerun allocates 0 of each.",
    "",
  ].join("\n");
}

function buildQaSummary(rows: JsonObject[], baseQa: JsonObject, correctionMetrics: JsonObject, decisionCounts: JsonObject, levels: JsonObject, sourceCounts: JsonObject): JsonObject {
  const byLemma = new Map<string, JsonObject[]>();
  for (const row of rows) {
    const group = byLemma.get(row.lemma) ?? [];
    group.push(row);
    byLemma.set(row.lemma, group);
  }
  const polysemyGroups = [...byLemma.entries()].filter(([, members]) => members.length > 1).map(([lemma, members]) => {
    const levelsForLemma = [...new Set(members.map((row) => row.editorialDecision.valueCode).filter(Boolean))].sort((left, right) => VALUE_ORDER.indexOf(left) - VALUE_ORDER.indexOf(right));
    const positions = levelsForLemma.map((level) => VALUE_ORDER.indexOf(level));
    const levelRange = positions.length ? Math.max(...positions) - Math.min(...positions) : 0;
    return {
      lemma,
      candidateCount: members.length,
      senseDecisions: members.map((row) => ({ candidateId: row.candidateId, masterSenseId: row.masterSenseId, partOfSpeechCode: row.partOfSpeechCode, senseLabel: row.senseLabel, valueCode: row.editorialDecision.valueCode, decisionType: row.editorialDecision.decisionType, rationale: row.editorialDecision.rationale })),
      distinctLevels: levelsForLemma,
      levelRange,
      status: levelRange >= 3 ? "SIBLING_LEVEL_SUSPICIOUS" : "PASS",
      existingClassificationOwnerReview: members.some((row) => row.existingClassificationAudit.proposalConflicts && !row.ownerDecisionStatus),
      explanation: "Reviewed as separate teachable Senses; sibling levels are allowed when semantic scope differs.",
    };
  }).sort((left, right) => left.lemma.localeCompare(right.lemma, "en"));
  const sourceRows = rows.filter((row) => row.sourceEvidence.sourceCefrEvidence !== null);
  const sourceAgreementCounts = countBy(sourceRows, (row) => String(row.editorialDecision.agreementStatus));
  const flags = rows.flatMap((row) => {
    const source = (row.sourceEvidence.sourceCefrEvidence as string[] | null)?.[0];
    const value = row.editorialDecision.valueCode as string | null;
    const output: JsonObject[] = [];
    const resolution = row.ownerDecisionStatus ? { ownerDecisionStatus: row.ownerDecisionStatus, resolutionStatus: "CLOSED_BY_OWNER" } : {};
    if (source && value && source !== value) {
      const gap = Math.abs(VALUE_ORDER.indexOf(source) - VALUE_ORDER.indexOf(value));
      output.push({ code: "SOURCE_EDITORIAL_DISAGREEMENT", severity: "WARNING", candidateId: row.candidateId, sourceValue: source, editorialValue: value, ...resolution });
      if (gap >= 3) output.push({ code: "CEFR_OUTLIER_REVIEW", severity: row.ownerDecisionStatus ? "RESOLVED" : "WARNING", candidateId: row.candidateId, sourceValue: source, editorialValue: value, levelGap: gap, ...resolution });
    }
    if (value !== null && row.editorialDecision.confidence < 0.75) output.push({ code: "LOW_CONFIDENCE_CLASSIFICATION", severity: row.ownerDecisionStatus ? "RESOLVED" : "OWNER_REVIEW", candidateId: row.candidateId, confidence: row.editorialDecision.confidence, ...resolution });
    if (row.existingClassificationAudit.proposalConflicts) output.push({ code: "EXISTING_CLASSIFICATION_VALUE_CONFLICT", severity: row.ownerDecisionStatus ? "RESOLVED_BY_REVISION_PLAN" : "OWNER_REVIEW", candidateId: row.candidateId, existingValue: row.existingClassificationAudit.records.find((item: JsonObject) => item.frameworkCode === FRAMEWORK_CODE && item.frameworkVersion === FRAMEWORK_VERSION)?.valueCode, editorialValue: value, ...resolution });
    return output;
  });
  const oldAudit = clone(baseQa.existingClassificationAudit);
  const currentConflictCount = rows.filter((row) => row.existingClassificationAudit.proposalConflicts).length;
  const resolvedConflictCount = rows.filter((row) => row.existingClassificationAudit.proposalConflicts && row.ownerDecisionStatus).length;
  const polysemyStatus = polysemyGroups.every((group) => group.status === "PASS") ? "PASS" : "FAIL";
  return {
    ...clone(baseQa),
    artifactType: "HYBRID_100_CEFR_QA_SUMMARY",
    status: "PASS",
    candidateCount: 100,
    decisionCounts,
    proposedDistribution: levels,
    sourceAgreementCounts,
    sourceCoverageCounts: countBy(rows, (row) => row.sourceEvidence.sourceCoverage),
    sourceCounts,
    existingClassificationAudit: {
      ...oldAudit,
      editorialProposalConflicts: currentConflictCount,
      resolvedByOwnerRevisionPlan: resolvedConflictCount,
      remainingUnresolvedProposalConflicts: currentConflictCount - resolvedConflictCount,
      duplicatePrimary: 0,
    },
    ownerExceptionReview: { status: "CLOSED", requiredDecisionCount: 0, acceptedDecisionCount: 5, classifiedDecisionCount: 4, acceptedUnclassifiedCount: 1 },
    polysemyReview: { status: polysemyStatus, reviewedGroups: polysemyGroups.length, groups: polysemyGroups },
    flags,
    editorialFirstPassCorrections: correctionMetrics,
    rightsBoundary: { sourceRightsVerified: false, sourceClaimedAsOfficial: false, licensedSourceProvenanceCreated: false, publicDomainSourceProvenanceCreated: false, sourceTextReused: false, externalMediaReused: false },
    qualityGate: { cefrEditorialQa: "PASS", polysemyCefrQa: polysemyStatus, existingClassificationAudit: "PASS", duplicatePrimaryCefr: "PASS", ownerExceptionQueue: "CLOSED", warningsRemainExplicitForOwnerReview: true },
  };
}

function makeReadiness(base: JsonObject, counts: JsonObject, levels: JsonObject, sourceCounts: JsonObject, canaryFingerprint: string): JsonObject {
  const result = clone(base);
  delete result.cefrDraftFingerprint;
  result.artifactType = "HYBRID_100_RELEASE_READINESS_ASSESSMENT";
  result.assessmentStatus = "OFFLINE_ANALYSIS_ONLY";
  result.readiness = { HYBRID_100_CONTENT_COHORT_READY: "YES", HYBRID_100_APPROVED_RELEASE_READY: "NO" };
  result.gates.CEFR = {
    status: "PASS",
    editorialAssignmentsResolved: 100,
    editorialAssignmentPercent: 100,
    editorialValuesProposed: 99,
    editorialValuePercent: 99,
    intentionallyUnclassified: 1,
    ownerExceptionQueue: "CLOSED",
    ownerApprovedExceptionCount: 5,
    classifiedOwnerDecisionCount: 4,
    acceptedUnclassifiedCount: 1,
    unresolvedExistingClassificationConflicts: 0,
    existingValueMismatchResolvedByWorkspaceRevisionPlan: 1,
    remainingGeneralOwnerReviewCount: 95,
    canonicalClassificationPromotion: "NOT_STARTED",
    ownerApprovalScope: OWNER_EXCEPTION_SCOPE,
    CEFR_EXCEPTION_OWNER_APPROVAL: "YES",
  };
  result.gates.CANONICAL_CLASSIFICATION_PROMOTION = { status: "NOT_READY", reason: "This owner approval covers only the five CEFR exceptions; the other 95 rows retain their prior pending owner-review status." };
  result.gates.CANARY_RUNTIME = { ...result.gates.CANARY_RUNTIME, treeFingerprint: canaryFingerprint };
  result.releaseBlockers = [
    "Canonical Classification promotion is a separate operation and has not occurred.",
    "The five exception decisions are accepted, but this phase does not approve the other 95 pending owner-review decisions.",
    "An immutable approved release has not been built or reviewed.",
    "Runtime reconciliation for the 100-Sense cohort has not started.",
    "Production mutation is not authorized.",
  ];
  result.ownerApprovalScope = OWNER_EXCEPTION_SCOPE;
  result.CEFR_EXCEPTION_OWNER_APPROVAL = "YES";
  result.OWNER_APPROVED_ALL_FUTURE_RELEASE_ACTIONS = false;
  result.canonicalClassificationPromotionReady = false;
  result.noCanonicalClassificationMutation = true;
  result.noReleaseCreated = true;
  result.databaseWrites = "NONE";
  result.importApplyExecuted = false;
  result.productionMutation = false;
  result.finalDecisionCounts = counts;
  result.finalDistribution = levels;
  result.finalOxfordEvidenceSummary = { agreement: sourceCounts.oxfordAgreement, editorialAdjustments: sourceCounts.editoriallyAdjusted, unresolvedSourceConflicts: sourceCounts.conflictRequiresOwnerReview };
  return result;
}

function buildOwnerRows(rows: JsonObject[], exceptionIds: Map<string, JsonObject>): JsonObject[] {
  return rows.map((row) => {
    const spec = EXCEPTION_SPECS.find((candidate) => candidate.masterSenseId === row.masterSenseId);
    if (!spec) return row;
    const ids = exceptionIds.get(spec.masterSenseId) ?? {};
    return { ...row, editorialValueCode: row.editorialDecision.valueCode, agreementStatus: row.editorialDecision.agreementStatus, classificationId: ids.classificationId ?? null, ownerDecisionStatus: row.ownerDecisionStatus, ownerDecisionScope: row.ownerDecisionScope, reviewedBy: row.reviewedBy };
  });
}

export function buildClosurePlan(root: string, mode: "check" | "materialize" = "check"): ClosurePlan {
  const dataset = readJson<JsonObject>(root, ROOT_DATASET);
  const sourceManifest = readJson<JsonObject>(root, `${SOURCE_WORKSPACE}/manifest.json`);
  const promotion = readJson<JsonObject>(root, `${MASTER_WORKSPACE}/canonical-promotion.json`);
  const promotionSummary = readJson<JsonObject>(root, `${MASTER_WORKSPACE}/canonical-promotion-summary.json`);
  const ownerSemanticReview = readJson<JsonObject>(root, `${MASTER_WORKSPACE}/owner-review.json`);
  const baseManifest = readJson<JsonObject>(root, `${WORKSPACE}/manifest.json`);
  const priorClosurePath = path.join(root, WORKSPACE, "owner-review-closure.json");
  const priorClosure = existsSync(priorClosurePath) ? readJson<JsonObject>(root, `${WORKSPACE}/owner-review-closure.json`) : null;
  const baseDecisionDocument = readJson<JsonObject>(root, `${WORKSPACE}/cefr-decisions.json`);
  const originalRegistry = readJson<JsonObject>(root, `${WORKSPACE}/classification-registry.json`);
  const sourceSummaryBase = readJson<JsonObject>(root, `${WORKSPACE}/source-evidence-summary.json`);
  const baseQa = readJson<JsonObject>(root, `${WORKSPACE}/reports/qa-summary.json`);
  const baseReadiness = readJson<JsonObject>(root, `${WORKSPACE}/release-readiness.json`);
  const correctionMetrics = baseQa.editorialFirstPassCorrections as JsonObject;
  const rubric = readJson<JsonObject>(root, `${WORKSPACE}/rubric.json`);
  const originalRows = baseDecisionDocument.rows as JsonObject[];
  const parentFingerprint = baseManifest.parentCefrDraftFingerprint ?? baseManifest.cefrDraftFingerprint;
  if (parentFingerprint !== PREVIOUS_CEFR_DRAFT_FINGERPRINT) fail("CEFR_DRAFT_FINGERPRINT_STALE");
  if (priorClosure && (priorClosure.previousCefrDraftFingerprint !== PREVIOUS_CEFR_DRAFT_FINGERPRINT || priorClosure.reviewScope !== OWNER_REVIEW_SCOPE || priorClosure.ownerApprovedExceptionCount !== 5)) fail("OWNER_REVIEW_CLOSURE_PIN_INVALID");
  if (dataset.datasetVersion !== "2.0.0" || dataset.schemaVersion !== "2.0.1" || dataset.status !== "DRAFT" || dataset.includedLexemes.length !== 103 || dataset.includedSenses.length !== 123 || dataset.includedProvenance.length !== 846 || dataset.includedClassifications.length !== 122) fail("CANONICAL_SEMANTIC_BASE_STALE");
  if (canonicalHash(dataset) !== promotionSummary.datasetManifestHashAfter || promotionSummary.approvedDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT || promotionSummary.promotionPlanFingerprint !== CANONICAL_PROMOTION_FINGERPRINT) fail("CANONICAL_PROMOTION_PIN_STALE");
  if (promotion.ownerApproved !== true || promotion.canonicalPromotionAuthorized !== true || promotion.approvedDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT || promotion.promotionPlanFingerprint !== CANONICAL_PROMOTION_FINGERPRINT || ownerSemanticReview.draftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT) fail("SEMANTIC_OWNER_APPROVAL_PIN_STALE");
  if (sourceManifest.proofFingerprint !== SOURCE_PROOF_FINGERPRINT || baseManifest.sourceProofFingerprint !== SOURCE_PROOF_FINGERPRINT || baseManifest.approvedSemanticDraftFingerprint !== APPROVED_SEMANTIC_DRAFT_FINGERPRINT || baseManifest.canonicalPromotionFingerprint !== CANONICAL_PROMOTION_FINGERPRINT) fail("SOURCE_OR_COHORT_PIN_STALE");
  if (baseManifest.candidateCount !== 100 || originalRows.length !== 100 || new Set(originalRows.map((row) => row.candidateId)).size !== 100 || new Set(originalRows.map((row) => row.masterSenseId)).size !== 100) fail("HYBRID_COHORT_COUNT_INVALID");

  const taxonomyPin = baseManifest.taxonomyPin as Pin;
  const taxonomy = readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", taxonomyPin.recordPath));
  if (taxonomy.taxonomyId !== TAXONOMY_ID || taxonomy.taxonomyVersion !== TAXONOMY_VERSION || canonicalHash(taxonomy) !== taxonomyPin.contentHash || taxonomy.status !== "DRAFT") fail("TAXONOMY_PIN_STALE");
  const canaryFingerprint = canonicalHash(fileTreeSnapshot(root, "vocabflow-dataset/releases/canary-v2.1.0"));
  if (baseReadiness.gates?.CANARY_RUNTIME?.treeFingerprint && canaryFingerprint !== baseReadiness.gates.CANARY_RUNTIME.treeFingerprint) fail("CANARY_TREE_CHANGED_SINCE_PHASE_2F4");

  const decisionRowsHash = canonicalHash(originalRows.filter((row) => !EXCEPTION_SPECS.some((spec) => spec.masterSenseId === row.masterSenseId)));
  if (priorClosure && priorClosure.untouchedNonExceptionDecisionRowsHash !== decisionRowsHash) fail("NON_EXCEPTION_DECISION_ROWS_CHANGED");
  const baseIdentityCounts = baseManifest.identitySplit as JsonObject;
  if (baseIdentityCounts.REUSE_EXISTING_SENSE !== 2 || baseIdentityCounts.NEW_SENSE_EXISTING_LEXEME !== 3 || baseIdentityCounts.NEW_SENSE_NEW_LEXEME !== 95) fail("IDENTITY_COHORT_SPLIT_STALE");

  const lightPin = (dataset.includedClassifications as Pin[]).find((pin) => pin.classificationId === LIGHT_CLASSIFICATION_ID);
  if (!lightPin || lightPin.classificationRevision !== 1 || lightPin.contentHash !== LIGHT_PREDECESSOR_HASH || lightPin.recordPath !== `master/classifications/${LIGHT_CLASSIFICATION_ID}-r1.json`) fail("LIGHT_PREDECESSOR_PIN_INVALID");
  const lightPredecessor = readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", lightPin.recordPath));
  if (canonicalHash(lightPredecessor) !== lightPin.contentHash || lightPredecessor.masterSenseId !== LIGHT_SENSE_ID || lightPredecessor.dimension !== "CEFR" || lightPredecessor.frameworkCode !== FRAMEWORK_CODE || lightPredecessor.frameworkVersion !== FRAMEWORK_VERSION || lightPredecessor.valueCode !== "A2" || lightPredecessor.status !== "IN_REVIEW" || lightPredecessor.isPrimary !== true) fail("LIGHT_PREDECESSOR_CONTENT_INVALID");

  const mappings = originalRegistry.mappings as RegistryMapping[];
  if (mappings.length !== 100) fail("CLASSIFICATION_REGISTRY_COUNT_INVALID");
  const registryBySense = new Map(mappings.map((mapping) => [mapping.masterSenseId, mapping]));
  const idsBySense = new Map<string, JsonObject>();
  for (const spec of EXCEPTION_SPECS) {
    const mapping = registryBySense.get(spec.masterSenseId);
    if (!mapping) fail(`CLASSIFICATION_REGISTRY_ROW_MISSING: ${spec.lemma}`);
    const ids = expectedOwnerIds(spec, mapping, priorClosure);
    if (spec.lemma === "light" && mapping.classificationId && mapping.classificationId !== LIGHT_CLASSIFICATION_ID) fail("LIGHT_CLASSIFICATION_ID_CHANGED");
    if (["freshman", "roster", "liable"].includes(spec.lemma) && mapping.classificationId && ids.classificationId !== mapping.classificationId) fail(`RESERVED_CLASSIFICATION_ID_CHANGED: ${spec.lemma}`);
    idsBySense.set(spec.masterSenseId, {
      ...ids,
      projectAuthoredProvenanceId: ids.projectProvenanceId,
      ownerReviewProvenanceId: ids.ownerReviewProvenanceId,
    });
  }

  const finalRows = applyOwnerDecisions(originalRows, idsBySense);
  assertNoDuplicatePrimaryDecisions(finalRows);
  const decisionCounts = countBy(finalRows, (row) => row.editorialDecision.decisionType);
  const finalDistribution = distribution(finalRows);
  const expectedCounts = { REUSE_EXISTING_CLASSIFICATION: 1, REVISE_EXISTING_CLASSIFICATION: 1, NEW_EDITORIAL_CLASSIFICATION: 97, UNCLASSIFIED_INSUFFICIENT_EVIDENCE: 1 };
  if (canonicalHash(decisionCounts) !== canonicalHash(expectedCounts) || decisionCounts.OWNER_REVIEW_REQUIRED) fail("FINAL_DECISION_COUNTS_INVALID");
  const expectedDistribution = { PRE_A1: 0, A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, C2: 0, UNCLASSIFIED: 1 };
  if (canonicalHash(finalDistribution) !== canonicalHash(expectedDistribution)) fail("FINAL_CEFR_DISTRIBUTION_INVALID");
  const sourceRows = finalRows.filter((row) => row.sourceEvidence.sourceCefrEvidence !== null);
  const sourceAgreement = countBy(sourceRows, (row) => String(row.editorialDecision.agreementStatus));
  const sourceCoverage = countBy(finalRows, (row) => row.sourceEvidence.sourceCoverage);
  const sourceCounts = {
    oxfordBacked: sourceRows.length,
    only4600: finalRows.length - sourceRows.length,
    oxfordAgreement: sourceAgreement.AGREES_WITH_SOURCE ?? 0,
    editoriallyAdjusted: sourceAgreement.EDITORIALLY_ADJUSTED ?? 0,
    conflictRequiresOwnerReview: sourceAgreement.CONFLICT_REQUIRES_OWNER_REVIEW ?? 0,
    only4600Classified: finalRows.filter((row) => row.sourceEvidence.sourceCoverage === "4600_ONLY" && row.editorialDecision.valueCode !== null).length,
  };
  if (sourceCounts.oxfordBacked !== 90 || sourceCounts.only4600 !== 10 || sourceCounts.oxfordAgreement !== 49 || sourceCounts.editoriallyAdjusted !== 41 || sourceCounts.conflictRequiresOwnerReview !== 0 || sourceCounts.only4600Classified !== 9) fail("FINAL_SOURCE_EVIDENCE_SUMMARY_INVALID");

  const registry = clone(originalRegistry);
  const registryItems = registry.mappings as RegistryMapping[];
  for (const spec of EXCEPTION_SPECS) {
    const mapping = registryItems.find((candidate) => candidate.masterSenseId === spec.masterSenseId);
    const ids = idsBySense.get(spec.masterSenseId) ?? {};
    if (!mapping) fail(`CLASSIFICATION_REGISTRY_ROW_MISSING: ${spec.lemma}`);
    mapping.decisionType = spec.decisionType;
    mapping.classificationId = ids.classificationId ?? null;
    if (spec.lemma === "light") {
      const oldIds = [...(lightPredecessor.sourceProvenanceIds as string[]), ...(mapping.provenanceIds ?? [])];
      mapping.provenanceIds = [...new Set([...oldIds, ids.projectAuthoredProvenanceId, ids.ownerReviewProvenanceId].filter(Boolean))] as string[];
    } else if (["freshman", "roster", "liable"].includes(spec.lemma)) {
      mapping.provenanceIds = [ids.projectAuthoredProvenanceId, ids.ownerReviewProvenanceId];
    } else {
      mapping.provenanceIds = [];
    }
  }
  registry.mappings = registryItems.sort((left, right) => left.registryKey.localeCompare(right.registryKey, "en"));

  const classificationRecords = listJsonRecords(root, `${WORKSPACE}/classifications`);
  const provenanceRecords = listJsonRecords(root, `${WORKSPACE}/provenance`);
  const provenanceById = new Map(provenanceRecords.map((record) => [record.provenanceId, record]));
  const newProjectProvenanceIds: string[] = [];
  const newOwnerProvenanceIds: string[] = [];
  for (const spec of EXCEPTION_SPECS) {
    if (spec.lemma === "fuse") continue;
    const ids = idsBySense.get(spec.masterSenseId) ?? {};
    const classificationId = String(ids.classificationId);
    const projectId = String(ids.projectAuthoredProvenanceId);
    const ownerId = String(ids.ownerReviewProvenanceId);
    const projectRecord = createClassificationProvenance(projectId, classificationId);
    const ownerRecord = ownerReviewProvenance(ownerId, classificationId);
    if (!provenanceById.has(projectId)) newProjectProvenanceIds.push(projectId);
    if (!provenanceById.has(ownerId)) newOwnerProvenanceIds.push(ownerId);
    provenanceById.set(projectId, projectRecord);
    provenanceById.set(ownerId, ownerRecord);
  }
  const lightR2 = createClassificationRecord({
    classificationId: LIGHT_CLASSIFICATION_ID,
    masterSenseId: LIGHT_SENSE_ID,
    valueCode: "A1",
    confidence: Number(finalRows.find((row) => row.masterSenseId === LIGHT_SENSE_ID)?.editorialDecision.confidence),
    sourceProvenanceIds: registryItems.find((item) => item.masterSenseId === LIGHT_SENSE_ID)?.provenanceIds ?? [],
  });
  lightR2.classificationRevision = 2;
  const freshClassRecords: JsonObject[] = [lightR2];
  for (const spec of EXCEPTION_SPECS.filter((item) => ["freshman", "roster", "liable"].includes(item.lemma))) {
    const row = finalRows.find((candidate) => candidate.masterSenseId === spec.masterSenseId);
    const mapping = registryItems.find((candidate) => candidate.masterSenseId === spec.masterSenseId);
    if (!row || !mapping?.classificationId) fail(`OWNER_CLASSIFICATION_RECORD_INPUT_MISSING: ${spec.lemma}`);
    const record = createClassificationRecord({
      classificationId: mapping.classificationId,
      masterSenseId: spec.masterSenseId,
      valueCode: spec.valueCode as string,
      confidence: Number(row.editorialDecision.confidence),
      sourceProvenanceIds: mapping.provenanceIds,
    });
    freshClassRecords.push(record);
  }
  const finalClassificationMap = new Map<string, JsonObject>();
  for (const record of [...classificationRecords, ...freshClassRecords]) {
    const relativePath = `classifications/${record.classificationId}-r${record.classificationRevision}.json`;
    const previous = finalClassificationMap.get(relativePath);
    if (previous && canonicalHash(previous) !== canonicalHash(record)) fail(`DUPLICATE_CLASSIFICATION_REVISION: ${relativePath}`);
    finalClassificationMap.set(relativePath, record);
  }
  if (finalClassificationMap.size !== 98) fail("WORKSPACE_CLASSIFICATION_RECORD_COUNT_INVALID");
  const finalProvenanceRecords = [...provenanceById.values()].sort((left, right) => left.provenanceId.localeCompare(right.provenanceId, "en"));
  if (finalProvenanceRecords.length !== 102 || newProjectProvenanceIds.length > 4 || newOwnerProvenanceIds.length > 4) fail("WORKSPACE_PROVENANCE_RECORD_COUNT_INVALID");
  for (const record of finalClassificationMap.values()) validateClassification(root, record);
  for (const record of finalProvenanceRecords) validateProvenance(root, record);

  const sourceSummary = clone(sourceSummaryBase);
  sourceSummary.sourceCoverageCounts = sourceCoverage;
  sourceSummary.sourceCefrEvidenceCounts = countBy(sourceRows.flatMap((row) => row.sourceEvidence.sourceCefrEvidence as string[]), (value) => value);
  sourceSummary.sourceCounts = sourceCounts;
  sourceSummary.rows = finalRows.map((row) => ({
    candidateId: row.candidateId,
    masterSenseId: row.masterSenseId,
    sourceCoverage: row.sourceEvidence.sourceCoverage,
    sourcePackageSha256: row.sourceEvidence.sourcePackageSha256,
    sourceNoteReferenceHashes: row.sourceEvidence.sourceNoteReferenceHashes,
    sourceSenseGroupReference: row.sourceEvidence.sourceSenseGroupReference,
    sourceCefrEvidence: row.sourceEvidence.sourceCefrEvidence,
    editorialValueCode: row.editorialDecision.valueCode,
    agreementStatus: row.editorialDecision.agreementStatus,
  }));
  const releaseReadiness = makeReadiness(baseReadiness, decisionCounts, finalDistribution, sourceCounts, canaryFingerprint);
  const qaSummary = buildQaSummary(finalRows, baseQa, correctionMetrics, decisionCounts, finalDistribution, sourceCounts);
  const allClassFiles = [...finalClassificationMap.entries()].sort(([left], [right]) => left.localeCompare(right, "en"));
  const allProvenanceFiles = finalProvenanceRecords.map((record) => [`provenance/${record.provenanceId}.json`, record] as const);
  const classPinsForFingerprint = allClassFiles.map(([recordPath, record]) => ({ recordPath, contentHash: canonicalHash(record), record })).sort((left, right) => left.recordPath.localeCompare(right.recordPath, "en"));
  const closureDraft = makeOwnerClosure(finalRows, idsBySense, { ...lightPin, contentHash: lightPin.contentHash }, decisionRowsHash);
  const ownerRows = buildOwnerRows(finalRows, idsBySense);
  const ownerDecisionRows = ownerRows.map((row) => ({
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
    ...(row.ownerDecisionStatus ? { ownerDecisionStatus: row.ownerDecisionStatus, ownerDecisionScope: row.ownerDecisionScope, reviewedBy: row.reviewedBy } : {}),
  }));
  const ownerClosureForFingerprint = closureDraft;
  const cohortPins = finalRows.map((row) => {
    const pin = (dataset.includedSenses as Pin[]).find((candidate) => candidate.masterSenseId === row.masterSenseId);
    if (!pin) fail(`CANONICAL_SENSE_PIN_MISSING: ${row.masterSenseId}`);
    const sense = readJson<JsonObject>(root, path.posix.join("vocabflow-dataset", pin.recordPath));
    if (canonicalHash(sense) !== pin.contentHash) fail(`CANONICAL_SENSE_HASH_INVALID: ${row.masterSenseId}`);
    return { candidateId: row.candidateId, masterSenseId: row.masterSenseId, identityDecision: row.identityDecision, senseRevision: pin.senseRevision, recordPath: pin.recordPath, contentHash: pin.contentHash };
  }).sort((left, right) => left.candidateId.localeCompare(right.candidateId, "en"));
  const provenanceFingerprint = normalizeProvenanceForFingerprint(finalProvenanceRecords);
  const fingerprintInput = {
    fingerprintVersion: "HYBRID-100-CEFR-OWNER-CLOSURE-FINGERPRINT-1",
    cohortPins,
    parentCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    approvedSemanticDraftFingerprint: APPROVED_SEMANTIC_DRAFT_FINGERPRINT,
    canonicalPromotionFingerprint: CANONICAL_PROMOTION_FINGERPRINT,
    taxonomyPin,
    ownerExceptionDecisions: closureDraft.decisions,
    decisions: ownerDecisionRows,
    classificationRegistry: registry,
    classifications: classPinsForFingerprint,
    provenanceRecords: provenanceFingerprint,
    releaseReadiness,
    ownerReviewClosure: ownerClosureForFingerprint,
  };
  const cefrDraftFingerprint = canonicalHash(fingerprintInput);
  if (priorClosure && priorClosure.cefrOwnerClosureFingerprint !== cefrDraftFingerprint) fail(`OWNER_CLOSURE_FINGERPRINT_STALE: stored=${String(priorClosure.cefrOwnerClosureFingerprint)} computed=${cefrDraftFingerprint}`);

  const ownerClosure = { ...closureDraft, cefrOwnerClosureFingerprint: cefrDraftFingerprint };
  const manifest = {
    ...clone(baseManifest),
    status: "EDITORIAL_CLASSIFICATION_DRAFT",
    parentCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    cefrDraftFingerprint,
    ownerReviewClosureFingerprint: cefrDraftFingerprint,
    ownerExceptionQueue: "CLOSED",
    ownerApprovedExceptionCount: 5,
    classifiedOwnerDecisionCount: 4,
    acceptedUnclassifiedCount: 1,
    classificationDecisionCounts: decisionCounts,
    proposedCefrDistribution: finalDistribution,
    newClassificationCount: 97,
    plannedExistingRevisionCount: 1,
    workspaceClassificationRecordCount: 98,
    projectAuthoredClassificationProvenanceCount: 98,
    ownerReviewClassificationProvenanceCount: 4,
    closureAddedProvenanceCount: 8,
    newProvenanceCount: 102,
    workspaceProvenanceRecordCount: 102,
    sourceCounts,
    releaseReadiness: { HYBRID_100_CONTENT_COHORT_READY: "YES", HYBRID_100_APPROVED_RELEASE_READY: "NO" },
    canonicalClassificationPromotionReady: false,
    canonicalClassificationMutation: "NONE",
    canonicalSemanticMutation: "NONE",
    releaseCreated: false,
    CEFR_EXCEPTION_OWNER_APPROVAL: "YES",
    OWNER_APPROVED_ALL_FUTURE_RELEASE_ACTIONS: false,
    initialClosureClassificationUuidAllocationCount: 3,
    initialClosureProvenanceUuidAllocationCount: 8,
    classificationUuidAllocationsOnRerun: 0,
    provenanceUuidAllocationsOnRerun: 0,
  };
  const sourceSummaryFinal = { ...sourceSummary, cefrDraftFingerprint };
  const decisionsFinal = {
    ...clone(baseDecisionDocument),
    status: "EDITORIAL_CLASSIFICATION_DRAFT",
    ownerExceptionReviewStatus: "CLOSED",
    ownerReviewClosureFingerprint: cefrDraftFingerprint,
    candidateCount: 100,
    decisionCounts,
    proposedDistribution: finalDistribution,
    rows: ownerDecisionRows,
    cefrDraftFingerprint,
  };
  const validationSummary = {
    artifactType: "HYBRID_100_CEFR_OWNER_CLOSURE_VALIDATION_SUMMARY",
    status: "PASS",
    parentCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    exactCohortValidated: cohortPins.length === 100,
    ownerExceptionDecisionsValidated: 5,
    ownerReviewRequiredCount: 0,
    decisionsResolvedCount: 100,
    classificationValuesPresent: 99,
    intentionallyUnclassified: 1,
    classificationRecordCount: finalClassificationMap.size,
    newEditorialClassificationCount: decisionCounts.NEW_EDITORIAL_CLASSIFICATION,
    plannedRevisionCount: 1,
    provenanceRecordCount: finalProvenanceRecords.length,
    classificationSchemasValid: true,
    provenanceSchemasValid: true,
    lightRevisionPlanValid: true,
    lightPredecessorUnchanged: true,
    fuseIntentionallyUnclassified: true,
    noDuplicatePrimaryCefr: true,
    polysemyCefrQa: qaSummary.polysemyReview.status,
    sourceRightsBoundary: "PASS",
    officialCefrClaim: false,
    canonicalClassificationMutation: "NONE",
    canonicalSemanticMutation: "NONE",
    releaseCreated: false,
    canaryChanged: false,
    databaseWrites: "NONE",
    importApplyExecuted: false,
    repeatFingerprintIdentical: true,
    newClassificationUuidsAllocatedOnRerun: 0,
    newProvenanceUuidsAllocatedOnRerun: 0,
    canonicalClassificationPromotionReady: false,
    cefrDraftFingerprint,
  };
  const readme = [
    "# Hybrid 100 CEFR Editorial Draft — Owner Exception Review Closed",
    "",
    "Status: `EDITORIAL_CLASSIFICATION_DRAFT`. This is a workspace package, not canonical Master content and not an approved release.",
    "",
    `Parent CEFR draft fingerprint: \`${PREVIOUS_CEFR_DRAFT_FINGERPRINT}\`. Closed-package fingerprint: \`${cefrDraftFingerprint}\`.`,
    `Framework: \`${FRAMEWORK_CODE} / ${FRAMEWORK_VERSION}\`; taxonomy ${TAXONOMY_ID} version ${TAXONOMY_VERSION}.`,
    "",
    "Five supplied CEFR exceptions are owner-resolved: one existing-classification revision plan, three new DRAFT classifications, and one intentionally unclassified Sense. The other 95 decisions remain unchanged and retain their prior general owner-review state.",
    "",
    "Light revision 1 is pinned and unchanged; revision 2 is planned in this workspace under the same classificationId. No duplicate light Classifications are added to canonical Master.",
    "",
    "Source labels remain local review evidence only. Rights remain unverified. No source text/media was reused; no canonical classifications, dataset manifest, senses, lexemes, release, runtime, database, or production state changed.",
    "",
    "Canonical Classification promotion and release creation require a separate operation and authorization. This exception approval does not approve future release actions.",
    "",
    "Run `pnpm vocab:hybrid-100-cefr-owner-review-closure --check` to verify the closed package. The materializer allocates no new IDs on rerun.",
    "",
  ].join("\n");

  const files = new Map<string, string>();
  const addJson = (relativePath: string, value: unknown) => files.set(`${WORKSPACE}/${relativePath}`, jsonBytes(value));
  addJson("manifest.json", manifest);
  addJson("classification-registry.json", registry);
  addJson("cefr-decisions.json", decisionsFinal);
  addJson("source-evidence-summary.json", sourceSummaryFinal);
  addJson("release-readiness.json", { ...releaseReadiness, cefrDraftFingerprint });
  addJson("validation-summary.json", validationSummary);
  addJson("owner-review-closure.json", ownerClosure);
  addJson("rubric.json", rubric);
  addJson("reports/qa-summary.json", { ...qaSummary, cefrDraftFingerprint });
  for (const [relativePath] of allClassFiles) {
    const resolved = finalClassificationMap.get(relativePath);
    if (!resolved) fail(`CLASSIFICATION_FILE_PLAN_MISSING: ${relativePath}`);
    addJson(relativePath, resolved);
  }
  for (const [relativePath, record] of allProvenanceFiles) addJson(relativePath, record);
  files.set(`${WORKSPACE}/README.md`, readme);
  files.set(OWNER_SHEET, buildOwnerSheet(finalRows, decisionCounts, finalDistribution, { ...lightPredecessor, contentHash: lightPin.contentHash }, lightR2, ownerClosure));
  files.set(DRAFT_REPORT, buildDraftReport({ decisionCounts, distribution: finalDistribution, sourceCounts, releaseReadiness, qaSummary, fingerprint: cefrDraftFingerprint }));
  assertRightsSafe({ ownerDecisionRows, registry, classificationRecords: [...finalClassificationMap.values()], provenanceRecords: finalProvenanceRecords, releaseReadiness, ownerClosure, sourceSummaryFinal });

  const originalClassPaths = new Set(classificationRecords.map((record) => `classifications/${record.classificationId}-r${record.classificationRevision}.json`));
  const newClassificationRecordCount = freshClassRecords.filter((record) => !originalClassPaths.has(`classifications/${record.classificationId}-r${record.classificationRevision}.json`)).length;
  const priorFingerprintIdentical = Boolean(priorClosure && priorClosure.cefrOwnerClosureFingerprint === cefrDraftFingerprint);
  const thisRunClassIds = priorClosure ? 0 : 3;
  const thisRunProvenanceIds = priorClosure ? 0 : 8;
  const summary = {
    status: "PASS",
    cefrDraftFingerprint,
    parentCefrDraftFingerprint: PREVIOUS_CEFR_DRAFT_FINGERPRINT,
    candidateCount: 100,
    decisionCounts,
    distribution: finalDistribution,
    sourceCounts,
    newClassificationRecordCount,
    plannedRevisionCount: 1,
    workspaceClassificationRecordCount: finalClassificationMap.size,
    workspaceProvenanceRecordCount: finalProvenanceRecords.length,
    newClassificationUuidsAllocatedOnThisRun: mode === "materialize" ? thisRunClassIds : 0,
    newProvenanceUuidsAllocatedOnThisRun: mode === "materialize" ? thisRunProvenanceIds : 0,
    repeatFingerprintIdentical: priorFingerprintIdentical,
    ownerExceptionQueue: "CLOSED",
    CEFR_EXCEPTION_OWNER_APPROVAL: "YES",
    canonicalClassificationMutation: "NONE",
    canonicalSemanticMutation: "NONE",
    releaseCreated: false,
    canaryChanged: false,
    databaseWrites: "NONE",
    importApplyExecuted: false,
    releaseReadiness: releaseReadiness.readiness,
    canonicalClassificationPromotionReady: false,
  };
  return { files, summary, workspaceRoot: path.join(root, WORKSPACE), cefrDraftFingerprint };
}

function allowedOutput(relativePath: string): boolean {
  return relativePath.startsWith(`${WORKSPACE}/`) || relativePath === OWNER_SHEET || relativePath === DRAFT_REPORT;
}

export function materialize(plan: ClosurePlan, mode: "check" | "materialize"): void {
  const root = REPO_ROOT;
  const before = protectedSnapshot(root);
  for (const relativePath of plan.files.keys()) if (!allowedOutput(relativePath)) fail(`OUTPUT_PATH_FORBIDDEN: ${relativePath}`);
  const closurePath = path.join(plan.workspaceRoot, "owner-review-closure.json");
  if (mode === "check") {
    if (!existsSync(closurePath)) fail("OWNER_REVIEW_CLOSURE_NOT_MATERIALIZED");
    const differences: string[] = [];
    for (const [relativePath, contents] of plan.files) {
      const absolute = path.join(root, relativePath);
      if (!existsSync(absolute) || readFileSync(absolute, "utf8") !== contents) differences.push(relativePath);
    }
    const planned = new Set([...plan.files.keys()].filter((item) => item.startsWith(`${WORKSPACE}/classifications/`) || item.startsWith(`${WORKSPACE}/provenance/`)));
    for (const directory of [`${WORKSPACE}/classifications`, `${WORKSPACE}/provenance`]) {
      const absolute = path.join(root, directory);
      const actual = existsSync(absolute) ? readdirSync(absolute, { withFileTypes: true }).filter((entry) => entry.isFile()).map((entry) => `${directory}/${entry.name}`) : [];
      for (const item of actual) if (!planned.has(item)) differences.push(item);
    }
    if (differences.length) fail(`OWNER_REVIEW_CLOSURE_DIFF_REQUIRED: ${differences.sort().join(",")}`);
  } else {
    const oldManifestPath = path.join(root, WORKSPACE, "manifest.json");
    if (existsSync(closurePath)) {
      const prior = readJson<JsonObject>(root, `${WORKSPACE}/owner-review-closure.json`);
      if (prior.cefrOwnerClosureFingerprint !== plan.cefrDraftFingerprint) fail("OWNER_REVIEW_CLOSURE_CONFLICT");
    }
    for (const [relativePath, contents] of plan.files) {
      if (relativePath === `${WORKSPACE}/owner-review-closure.json`) continue;
      const absolute = path.join(root, relativePath);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, contents, "utf8");
    }
    const closureContents = plan.files.get(`${WORKSPACE}/owner-review-closure.json`);
    if (!closureContents) fail("OWNER_REVIEW_CLOSURE_ARTIFACT_MISSING");
    writeFileSync(closurePath, closureContents, "utf8");
    void oldManifestPath;
    const verified = buildClosurePlan(root, "check");
    if (verified.cefrDraftFingerprint !== plan.cefrDraftFingerprint) fail("OWNER_REVIEW_CLOSURE_POST_WRITE_FINGERPRINT_MISMATCH");
    materialize(verified, "check");
  }
  const after = protectedSnapshot(root);
  if (canonicalHash(before) !== canonicalHash(after)) fail("CANONICAL_OR_RELEASE_TREE_CHANGED_DURING_OWNER_REVIEW_CLOSURE");
}

export function validateCliMode(args: string[]): "check" | "materialize" {
  if (args.length !== 1 || !["--check", "--materialize"].includes(args[0] ?? "")) fail("Usage: pnpm vocab:hybrid-100-cefr-owner-review-closure --check|--materialize");
  return args[0] === "--check" ? "check" : "materialize";
}

export function main(args = process.argv.slice(2)): void {
  const mode = validateCliMode(args);
  const root = REPO_ROOT;
  const before = protectedSnapshot(root);
  const plan = buildClosurePlan(root, mode);
  materialize(plan, mode);
  if (canonicalHash(before) !== canonicalHash(protectedSnapshot(root))) fail("CANONICAL_OR_RELEASE_TREE_CHANGED_DURING_OWNER_REVIEW_CLOSURE");
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
