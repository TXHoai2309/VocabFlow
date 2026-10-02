import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMasterVocabularyV2CanaryArtifacts } from "./master-vocabulary-v2-canary-preparation";
import { runMasterVocabularyTransform } from "./transform-master-vocabulary-v2";
import { canonicalJsonSha256, validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

type JsonRecord = Record<string, unknown>;
type Pin = JsonRecord & { recordPath: string; contentHash: string };

const APPROVAL_ARTIFACT_VERSION = "vocabflow-master-v2-canary-owner-approval-v1";
const RELEASE_VERSION = "2.1.0";

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function array(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`APPROVAL_FIELD_REQUIRED:${label}`);
  return value;
}

function readJson(root: string, recordPath: string): JsonRecord {
  const parsed: unknown = JSON.parse(readFileSync(path.join(root, recordPath), "utf8"));
  if (!isRecord(parsed)) throw new Error(`RECORD_NOT_OBJECT:${recordPath}`);
  return parsed;
}

function sha256Text(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function writeJson(root: string, recordPath: string, value: unknown): void {
  const output = path.join(root, recordPath);
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function requireReviewedDate(value: unknown, label: string): string {
  const result = requiredString(value, label);
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/.test(result) || Number.isNaN(Date.parse(result))) {
    throw new Error(`APPROVAL_DATE_INVALID:${label}`);
  }
  return result.length === 10 ? `${result}T00:00:00Z` : result;
}

function requireFields(decisions: unknown, fields: Record<string, string>, label: string): void {
  if (!isRecord(decisions)) throw new Error(`APPROVAL_FIELD_DECISIONS_REQUIRED:${label}`);
  for (const [key, expected] of Object.entries(fields)) {
    if (decisions[key] !== expected) throw new Error(`APPROVAL_FIELD_NOT_EXPLICIT:${label}.${key}:${expected}`);
  }
}

function requireReview(review: JsonRecord, label: string): { reviewer: string; reviewedAt: string } {
  return {
    reviewer: requiredString(review.reviewer, `${label}.reviewer`),
    reviewedAt: requireReviewedDate(review.reviewedAt, `${label}.reviewedAt`),
  };
}

function findReview(rows: JsonRecord[], idField: string, id: unknown, label: string): JsonRecord {
  const found = rows.filter((row) => row[idField] === id);
  if (found.length !== 1) throw new Error(`APPROVAL_REVIEW_CARDINALITY:${label}:${String(id)}:${found.length}`);
  return found[0]!;
}

function compareSourcePin(actual: JsonRecord, expected: JsonRecord, label: string, keys = Object.keys(expected)): void {
  for (const key of keys) {
    if (JSON.stringify(actual[key]) !== JSON.stringify(expected[key])) throw new Error(`APPROVAL_SOURCE_STALE:${label}.${key}`);
  }
}

function newPin(idField: string, revisionField: string | undefined, value: JsonRecord, recordPath: string): Pin {
  return {
    [idField]: value[idField],
    ...(revisionField ? { [revisionField]: value[revisionField] } : {}),
    recordPath,
    contentHash: canonicalJsonSha256(value),
  };
}

function bumpRecord(root: JsonRecord, revisionField: string, reviewedAt: string): JsonRecord {
  const revision = root[revisionField];
  if (typeof revision !== "number" || !Number.isInteger(revision) || revision < 1) {
    throw new Error(`SOURCE_REVISION_INVALID:${revisionField}`);
  }
  return { ...root, [revisionField]: revision + 1, status: "APPROVED", updatedAt: reviewedAt };
}

function setSelectedSenseChildren(source: JsonRecord, review: JsonRecord, reviewedAt: string): JsonRecord {
  const selected = isRecord(review.selectedChildIds) ? review.selectedChildIds : {};
  const translationId = requiredString(selected.translationId, "selectedChildIds.translationId");
  const definitionId = requiredString(selected.definitionId, "selectedChildIds.definitionId");
  const exampleId = requiredString(selected.exampleId, "selectedChildIds.exampleId");
  const exampleTranslationId = requiredString(selected.exampleTranslationId, "selectedChildIds.exampleTranslationId");

  let translationFound = false;
  const translations = array(source.translations).map((child) => {
    if (child.translationId !== translationId) return child;
    translationFound = true;
    return { ...child, status: "APPROVED" };
  });
  let definitionFound = false;
  const definitions = array(source.definitions).map((child) => {
    if (child.definitionId !== definitionId) return child;
    definitionFound = true;
    return { ...child, status: "APPROVED" };
  });
  let exampleFound = false;
  let exampleTranslationFound = false;
  const examples = array(source.examples).map((example) => {
    if (example.exampleId !== exampleId) return example;
    exampleFound = true;
    const exampleTranslations = array(example.exampleTranslations).map((child) => {
      if (child.exampleTranslationId !== exampleTranslationId) return child;
      exampleTranslationFound = true;
      return { ...child, status: "APPROVED" };
    });
    if (!exampleTranslationFound) return { ...example, exampleTranslations };
    return { ...example, status: "APPROVED", exampleTranslations };
  });
  if (!translationFound || !definitionFound || !exampleFound || !exampleTranslationFound) {
    throw new Error(`APPROVED_CHILD_NOT_FOUND:${String(source.masterSenseId)}`);
  }

  const selectedPronunciationId = selected.pronunciationId;
  const pronunciationOverrides = array(source.pronunciationOverrides).map((pronunciation) =>
    selectedPronunciationId !== null && pronunciation.pronunciationId === selectedPronunciationId
      ? { ...pronunciation, status: "APPROVED" }
      : pronunciation);
  const updated = bumpRecord(source, "senseRevision", reviewedAt);
  return { ...updated, translations, definitions, examples, pronunciationOverrides };
}

function referencedIds(value: unknown, fields: Set<string>, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) referencedIds(item, fields, result);
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (fields.has(key) && Array.isArray(child)) {
        for (const id of child) if (typeof id === "string") result.add(id);
      } else if (fields.has(key) && typeof child === "string") {
        result.add(child);
      } else referencedIds(child, fields, result);
    }
  }
  return result;
}

function referencedMediaIds(value: unknown, result = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) referencedMediaIds(item, result);
  } else if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      if (["audioAssetId", "imageAssetId"].includes(key) && typeof child === "string") result.add(child);
      else if (key === "audioAssetIds" && Array.isArray(child)) {
        for (const id of child) if (typeof id === "string") result.add(id);
      } else referencedMediaIds(child, result);
    }
  }
  return result;
}

function buildUnresolvedReconciliation(manifest: JsonRecord, manifestHash: string, releaseHash: string): JsonRecord {
  return {
    artifactVersion: "runtime-reconciliation-v2",
    owner: "owner-review-required",
    generatedByTransform: true,
    sourceDatasetId: manifest.datasetId,
    sourceDatasetVersion: manifest.datasetVersion,
    sourceSchemaVersion: manifest.schemaVersion,
    sourceManifestContentHash: manifestHash,
    sourceReleaseHash: releaseHash,
    allowPartialImport: false,
    vocabulary: array(manifest.includedSenses).map((pin) => ({ masterSenseId: pin.masterSenseId, decision: "UNRESOLVED" })),
    topics: [],
    learningSets: array(manifest.includedLearningSets).map((pin) => ({ masterLearningSetId: pin.learningSetId, decision: "UNRESOLVED" })),
    reviewInstructions: "Generated with no runtime target. Replace only in this release workspace after a verified read-only staging snapshot and explicit owner decisions. This file is not human-reviewed and is rejected by the planner until owner review.",
  };
}

export interface PrepareCanaryReleaseOptions {
  datasetRoot: string;
  approvalFile: string;
  outputRoot: string;
}

export interface PreparedCanaryRelease {
  outputRoot: string;
  releaseHash: string;
  senseCount: number;
  lexemeCount: number;
  provenanceCount: number;
  learningSetCount: number;
  importEligible: boolean;
  validationErrorCount: number;
}

/**
 * Applies only explicit owner decisions into an isolated, immutable release workspace.
 * It never edits the source DRAFT package and never connects to a runtime database.
 */
export function prepareMasterVocabularyV2CanaryRelease(options: PrepareCanaryReleaseOptions): PreparedCanaryRelease {
  const datasetRoot = path.resolve(options.datasetRoot);
  const approvalFile = path.resolve(options.approvalFile);
  const outputRoot = path.resolve(options.outputRoot);
  if (existsSync(outputRoot)) throw new Error(`CANARY_WORKSPACE_ALREADY_EXISTS:${outputRoot}`);

  const sourceManifestText = readFileSync(path.join(datasetRoot, "dataset.json"), "utf8");
  const sourceManifest = JSON.parse(sourceManifestText) as JsonRecord;
  const sourceManifestHash = sha256Text(sourceManifestText);
  const approval = JSON.parse(readFileSync(approvalFile, "utf8")) as JsonRecord;
  if (!isRecord(approval) || approval.artifactVersion !== APPROVAL_ARTIFACT_VERSION) throw new Error("OWNER_APPROVAL_ARTIFACT_VERSION_INVALID");
  if (!isRecord(approval.sourceDataset)) throw new Error("OWNER_APPROVAL_SOURCE_DATASET_REQUIRED");
  if (approval.sourceDataset.datasetId !== sourceManifest.datasetId
    || approval.sourceDataset.datasetVersion !== sourceManifest.datasetVersion
    || approval.sourceDataset.schemaVersion !== sourceManifest.schemaVersion
    || approval.sourceDataset.manifestRawSha256 !== sourceManifestHash) {
    throw new Error("OWNER_APPROVAL_SOURCE_DATASET_STALE");
  }
  if (sourceManifest.status !== "DRAFT" || sourceManifest.datasetVersion !== "2.0.0") throw new Error("CANARY_SOURCE_MUST_BE_IMMUTABLE_2_0_0_DRAFT");
  if (!isRecord(approval.proposedRelease) || approval.proposedRelease.datasetVersion !== RELEASE_VERSION || approval.proposedRelease.semverBump !== "MINOR") {
    throw new Error("OWNER_APPROVAL_RELEASE_VERSION_INVALID");
  }
  const releaseApproval = isRecord(approval.releaseApproval) ? approval.releaseApproval : {};
  if (releaseApproval.decision !== "APPROVE") throw new Error("RELEASE_OWNER_APPROVAL_REQUIRED");
  const releaseReviewer = requiredString(releaseApproval.reviewer, "releaseApproval.reviewer");
  const releasedAt = requireReviewedDate(releaseApproval.reviewedAt, "releaseApproval.reviewedAt");

  const current = JSON.parse(buildMasterVocabularyV2CanaryArtifacts(datasetRoot).ownerApprovalTemplateJson) as JsonRecord;
  const currentSenseReviews = array(current.senseReviews);
  const sourceSenseReviews = array(approval.senseReviews);
  if (sourceSenseReviews.length !== currentSenseReviews.length) throw new Error("OWNER_APPROVAL_SENSE_SET_STALE");
  const sourceBySense = new Map(sourceSenseReviews.map((row) => [String(row.masterSenseId), row]));
  for (const expected of currentSenseReviews) {
    const actual = sourceBySense.get(String(expected.masterSenseId));
    if (!actual) throw new Error(`OWNER_APPROVAL_SENSE_MISSING:${String(expected.masterSenseId)}`);
    compareSourcePin(actual, expected, `sense.${String(expected.masterSenseId)}`, ["masterSenseId", "masterLexemeId", "sourceSenseRevision", "sourceSenseContentHash"]);
    if (JSON.stringify(actual.selectedChildIds) !== JSON.stringify(expected.selectedChildIds)) {
      throw new Error(`OWNER_APPROVAL_SELECTED_CHILDREN_STALE:${String(expected.masterSenseId)}`);
    }
    if (actual.decision === "PENDING") throw new Error(`OWNER_APPROVAL_SENSE_PENDING:${String(expected.masterSenseId)}`);
    if (!["APPROVE", "REQUEST_CHANGES", "EXCLUDE_FROM_CANARY"].includes(String(actual.decision))) {
      throw new Error(`OWNER_APPROVAL_SENSE_DECISION_INVALID:${String(expected.masterSenseId)}`);
    }
    requireReview(actual, `sense.${String(expected.masterSenseId)}`);
    if (actual.decision === "APPROVE") {
      requireFields(actual.fieldDecisions, {
        partOfSpeech: "APPROVED", translation: "APPROVED", definition: "APPROVED", example: "APPROVED",
        exampleTranslation: "APPROVED", pronunciation: "APPROVED", mediaRuntimeUrls: "ACCEPT_NULL_URLS",
      }, `sense.${String(expected.masterSenseId)}`);
      requireReview(actual, `sense.${String(expected.masterSenseId)}`);
    }
  }
  const decisions = currentSenseReviews.map((expected) => sourceBySense.get(String(expected.masterSenseId))!);
  const includedSenseIds = new Set(decisions.filter((row) => row.decision === "APPROVE").map((row) => String(row.masterSenseId)));
  if (includedSenseIds.size === 0) throw new Error("CANARY_HAS_NO_OWNER_APPROVED_SENSES");

  const currentLexemeReviews = array(current.lexemeReviews);
  const sourceLexemeReviews = array(approval.lexemeReviews);
  const lexemeReviewById = new Map(sourceLexemeReviews.map((row) => [String(row.masterLexemeId), row]));
  const currentSensePins = array(sourceManifest.includedSenses);
  const selectedSensePins = currentSensePins.filter((pin) => includedSenseIds.has(String(pin.masterSenseId)));
  const lexemeIds = new Set<string>();
  const selectedSenseRecords: Array<{ source: JsonRecord; reviewed: JsonRecord; pin: JsonRecord }> = [];
  for (const pin of selectedSensePins) {
    const source = readJson(datasetRoot, String(pin.recordPath));
    lexemeIds.add(String(source.masterLexemeId));
    const review = sourceBySense.get(String(pin.masterSenseId))!;
    const reviewedAt = requireReview(review, `sense.${String(pin.masterSenseId)}`).reviewedAt;
    selectedSenseRecords.push({ source, reviewed: setSelectedSenseChildren(source, review, reviewedAt), pin });
  }

  const currentLexemeById = new Map(currentLexemeReviews.map((row) => [String(row.masterLexemeId), row]));
  const sourceLexemePins = array(sourceManifest.includedLexemes);
  const selectedLexemePronunciationIds = new Map<string, Set<string>>();
  for (const record of selectedSenseRecords) {
    const selected = isRecord(record.reviewed) ? sourceBySense.get(String(record.reviewed.masterSenseId)) : undefined;
    const selectedChildren = isRecord(selected?.selectedChildIds) ? selected.selectedChildIds : {};
    const pronunciationId = selectedChildren.pronunciationId;
    if (typeof pronunciationId === "string") {
      const ids = selectedLexemePronunciationIds.get(String(record.source.masterLexemeId)) ?? new Set<string>();
      ids.add(pronunciationId);
      selectedLexemePronunciationIds.set(String(record.source.masterLexemeId), ids);
    }
  }
  const selectedLexemeRecords: Array<{ record: JsonRecord; sourcePin: JsonRecord }> = [];
  for (const lexemeId of lexemeIds) {
    const expected = currentLexemeById.get(lexemeId);
    const actual = lexemeReviewById.get(lexemeId);
    if (!expected || !actual) throw new Error(`OWNER_APPROVAL_LEXEME_MISSING:${lexemeId}`);
    compareSourcePin(actual, expected, `lexeme.${lexemeId}`, ["masterLexemeId", "sourceLexemeRevision", "sourceLexemeContentHash"]);
    if (actual.decision !== "APPROVE") throw new Error(`OWNER_APPROVAL_LEXEME_NOT_APPROVED:${lexemeId}`);
    requireFields(actual.fieldDecisions, { lemma: "APPROVED", lexicalUnitType: "APPROVED", pronunciation: "APPROVED" }, `lexeme.${lexemeId}`);
    const { reviewedAt } = requireReview(actual, `lexeme.${lexemeId}`);
    const sourcePin = sourceLexemePins.find((pin) => pin.masterLexemeId === lexemeId);
    if (!sourcePin) throw new Error(`SOURCE_LEXEME_PIN_MISSING:${lexemeId}`);
    const record = readJson(datasetRoot, String(sourcePin.recordPath));
    const selectedPronunciationIds = selectedLexemePronunciationIds.get(lexemeId) ?? new Set<string>();
    const updated = bumpRecord(record, "lexemeRevision", reviewedAt);
    updated.pronunciations = array(record.pronunciations).map((pronunciation) =>
      selectedPronunciationIds.has(String(pronunciation.pronunciationId))
        ? { ...pronunciation, status: "APPROVED" }
        : pronunciation);
    for (const pronunciationId of selectedPronunciationIds) {
      const found = array(record.pronunciations).some((pronunciation) => pronunciation.pronunciationId === pronunciationId)
        || selectedSenseRecords.some((entry) => entry.source.masterLexemeId === lexemeId
          && array(entry.reviewed.pronunciationOverrides).some((pronunciation) => pronunciation.pronunciationId === pronunciationId));
      if (!found) throw new Error(`SELECTED_PRONUNCIATION_NOT_FOUND:${pronunciationId}`);
    }
    selectedLexemeRecords.push({ record: updated, sourcePin });
  }

  const setReviews = array(approval.learningSetReviews);
  const chosenSetReview = setReviews.find((row) => row.decision === "APPROVE");
  let selectedSetRecord: { record: JsonRecord; sourcePin: JsonRecord } | undefined;
  if (chosenSetReview) {
    requireFields(chosenSetReview.fieldDecisions, { name: "APPROVED", description: "APPROVED", membership: "APPROVED" }, `learningSet.${String(chosenSetReview.learningSetId)}`);
    const { reviewedAt } = requireReview(chosenSetReview, `learningSet.${String(chosenSetReview.learningSetId)}`);
    const expected = array(current.learningSetReviews).find((row) => row.learningSetId === chosenSetReview.learningSetId);
    if (!expected) throw new Error(`OWNER_APPROVAL_SET_NOT_IN_CANARY:${String(chosenSetReview.learningSetId)}`);
    compareSourcePin(chosenSetReview, expected, `learningSet.${String(chosenSetReview.learningSetId)}`, ["learningSetId", "sourceLearningSetRevision", "sourceLearningSetContentHash"]);
    const itemReviews = array(chosenSetReview.items);
    const expectedItems = array(expected.items);
    if (itemReviews.length !== expectedItems.length) throw new Error("OWNER_APPROVAL_SET_MEMBERSHIP_STALE");
    for (const expectedItem of expectedItems) {
      const itemReview = findReview(itemReviews, "learningSetItemId", expectedItem.learningSetItemId, "learningSetItem");
      compareSourcePin(itemReview, expectedItem, `learningSetItem.${String(expectedItem.learningSetItemId)}`, ["learningSetItemId", "masterSenseId"]);
      if (itemReview.decision !== "APPROVE") throw new Error(`OWNER_APPROVAL_SET_ITEM_NOT_APPROVED:${String(expectedItem.learningSetItemId)}`);
      requireReview(itemReview, `learningSetItem.${String(expectedItem.learningSetItemId)}`);
      if (!includedSenseIds.has(String(itemReview.masterSenseId))) throw new Error(`APPROVED_SET_REFERENCES_EXCLUDED_SENSE:${String(itemReview.masterSenseId)}`);
    }
    const setPin = array(sourceManifest.includedLearningSets).find((pin) => pin.learningSetId === chosenSetReview.learningSetId);
    if (!setPin) throw new Error(`SOURCE_LEARNING_SET_PIN_MISSING:${String(chosenSetReview.learningSetId)}`);
    const sourceSet = readJson(datasetRoot, String(setPin.recordPath));
    const setRecord = bumpRecord(sourceSet, "learningSetRevision", reviewedAt);
    setRecord.items = array(sourceSet.items).map((item) => ({ ...item, status: "APPROVED" }));
    selectedSetRecord = { record: setRecord, sourcePin: setPin };
  }

  const usedProvenanceIds = new Set<string>();
  const usedMediaIds = new Set<string>();
  const allSelectedRecords = [
    ...selectedSenseRecords.map((entry) => entry.reviewed),
    ...selectedLexemeRecords.map((entry) => entry.record),
    ...(selectedSetRecord ? [selectedSetRecord.record] : []),
  ];
  for (const record of allSelectedRecords) {
    referencedIds(record, new Set(["provenanceIds", "sourceProvenanceIds", "selectionProvenanceIds"]), usedProvenanceIds);
    referencedMediaIds(record, usedMediaIds);
  }
  const sourceProvenancePins = array(sourceManifest.includedProvenance);
  const provenancePins = sourceProvenancePins.filter((pin) => usedProvenanceIds.has(String(pin.provenanceId)));
  if (provenancePins.length !== usedProvenanceIds.size) throw new Error("CANARY_PROVENANCE_CLOSURE_INCOMPLETE");

  const sourceMediaPins = array(sourceManifest.includedMediaAssets);
  const mediaPins = sourceMediaPins.filter((pin) => usedMediaIds.has(String(pin.mediaAssetId)));
  if (mediaPins.length !== usedMediaIds.size) throw new Error("CANARY_MEDIA_SLOT_CLOSURE_INCOMPLETE");
  for (const pin of mediaPins) {
    const asset = readJson(datasetRoot, String(pin.recordPath));
    if (asset.status !== "PLANNED" || (asset.currentMediaAssetVersion !== null && asset.currentMediaAssetVersion !== undefined)) {
      throw new Error(`CANARY_MEDIA_SLOT_NOT_PLANNED:${String(pin.mediaAssetId)}`);
    }
  }

  const tempParent = path.dirname(outputRoot);
  mkdirSync(tempParent, { recursive: true });
  const tempRoot = mkdtempSync(path.join(tempParent, ".canary-v2.1.0-"));
  try {
    cpSync(path.join(datasetRoot, "schemas"), path.join(tempRoot, "schemas"), { recursive: true });

    const lexemePins: Pin[] = [];
    for (const { record } of selectedLexemeRecords) {
      const revision = Number(record.lexemeRevision);
      const recordPath = `master/lexemes/${String(record.masterLexemeId)}-r${revision}.json`;
      writeJson(tempRoot, recordPath, record);
      lexemePins.push(newPin("masterLexemeId", "lexemeRevision", record, recordPath));
    }
    const sensePins: Pin[] = [];
    for (const { reviewed, source } of selectedSenseRecords) {
      const revision = Number(reviewed.senseRevision);
      const recordPath = `master/senses/${String(reviewed.masterSenseId)}-r${revision}.json`;
      writeJson(tempRoot, recordPath, reviewed);
      sensePins.push(newPin("masterSenseId", "senseRevision", reviewed, recordPath));

      const sourceReview = sourceBySense.get(String(source.masterSenseId));
      const selectedChildren = isRecord(sourceReview?.selectedChildIds) ? sourceReview.selectedChildIds : {};
      const selectedPronunciationId = selectedChildren.pronunciationId;
      const ownerLexeme = selectedLexemeRecords.find((item) => item.record.masterLexemeId === source.masterLexemeId)?.record;
      if (selectedPronunciationId !== null && selectedPronunciationId !== undefined && isRecord(ownerLexeme)) {
        const found = array(ownerLexeme.pronunciations).some((item) => item.pronunciationId === selectedPronunciationId && item.status === "APPROVED");
        const senseFound = array(reviewed.pronunciationOverrides).some((item) => item.pronunciationId === selectedPronunciationId && item.status === "APPROVED");
        if (!found && !senseFound) throw new Error(`SELECTED_PRONUNCIATION_NOT_APPROVED:${String(selectedPronunciationId)}`);
      }
    }
    const setPins: Pin[] = [];
    if (selectedSetRecord) {
      const record = selectedSetRecord.record;
      const recordPath = `learning-sets/${String(record.learningSetId)}-r${String(record.learningSetRevision)}.json`;
      writeJson(tempRoot, recordPath, record);
      setPins.push(newPin("learningSetId", "learningSetRevision", record, recordPath));
    }
    const provenanceOutputPins: Pin[] = [];
    for (const pin of provenancePins) {
      const record = readJson(datasetRoot, String(pin.recordPath));
      const recordPath = String(pin.recordPath);
      writeJson(tempRoot, recordPath, record);
      provenanceOutputPins.push(newPin("provenanceId", undefined, record, recordPath));
    }
    const mediaOutputPins: Pin[] = [];
    for (const pin of mediaPins) {
      const record = readJson(datasetRoot, String(pin.recordPath));
      const recordPath = String(pin.recordPath);
      writeJson(tempRoot, recordPath, record);
      mediaOutputPins.push(newPin("mediaAssetId", undefined, record, recordPath));
    }

    const releaseManifest: JsonRecord = {
      datasetId: sourceManifest.datasetId,
      datasetCode: sourceManifest.datasetCode,
      name: sourceManifest.name,
      ...(Array.isArray(sourceManifest.description) ? { description: sourceManifest.description } : {}),
      datasetVersion: RELEASE_VERSION,
      schemaVersion: sourceManifest.schemaVersion,
      status: "APPROVED",
      includedLexemes: lexemePins.sort((a, b) => String(a.masterLexemeId).localeCompare(String(b.masterLexemeId))),
      includedSenses: sensePins.sort((a, b) => String(a.masterSenseId).localeCompare(String(b.masterSenseId))),
      includedClassifications: [],
      includedLearningSets: setPins,
      includedTaxonomySnapshots: [],
      includedMediaAssets: mediaOutputPins.sort((a, b) => String(a.mediaAssetId).localeCompare(String(b.mediaAssetId))),
      includedMediaAssetVersions: [],
      includedRelations: [],
      includedProvenance: provenanceOutputPins.sort((a, b) => String(a.provenanceId).localeCompare(String(b.provenanceId))),
      releaseHashAlgorithm: "sha256-canonical-json-v1",
      createdAt: sourceManifest.createdAt,
      releasedAt,
      changeSummary: [
        { language: "en", text: `First approved canary snapshot: ${sensePins.length} reviewed Senses and ${lexemePins.length} Lexemes; no experimental classifications or runtime media versions.` },
        { language: "vi", text: `Bản canary được duyệt đầu tiên: ${sensePins.length} Sense và ${lexemePins.length} Lexeme đã được rà soát; không gồm phân loại thử nghiệm hoặc phiên bản media runtime.` },
      ],
    };
    releaseManifest.releaseHash = canonicalJsonSha256(releaseManifest);
    writeJson(tempRoot, "dataset.json", releaseManifest);

    const validation = validateMasterVocabularyV2({ datasetRoot: tempRoot, schemaRoot: path.join(tempRoot, "schemas"), writeReport: false, validatedAt: "2000-01-01T00:00:00Z" });
    if (validation.status !== "PASS" || validation.errorCount !== 0) {
      throw new Error(`CANARY_MASTER_VALIDATION_FAILED:${validation.errorCount}:${validation.issues.filter((issue) => issue.severity === "ERROR").map((issue) => issue.code).join(",")}`);
    }
    const transformed = runMasterVocabularyTransform({ datasetRoot: tempRoot, outputRoot: path.join(tempRoot, "import"), mode: "RELEASE", writeOutputs: true });
    if (transformed.vocabulary.importEligible !== true) throw new Error("CANARY_TRANSFORM_NOT_IMPORT_ELIGIBLE");

    const approvalHash = sha256Text(readFileSync(approvalFile, "utf8"));
    writeJson(tempRoot, "reports/canary-approval-evidence.json", {
      artifactVersion: "master-vocabulary-v2-canary-approval-evidence-v1",
      approvalArtifactSha256: approvalHash,
      sourceManifestRawSha256: sourceManifestHash,
      releaseHash: releaseManifest.releaseHash,
      releaseVersion: RELEASE_VERSION,
      releaseReviewer,
      releasedAt,
      approvedSenseIds: [...includedSenseIds].sort(),
      excludedSenseDecisions: decisions.filter((row) => row.decision !== "APPROVE").map((row) => ({ masterSenseId: row.masterSenseId, decision: row.decision })),
      approvalWasInferred: false,
      stagingTargetConfigured: false,
      runtimeSnapshotRead: false,
    });
    writeJson(tempRoot, "import/mappings/runtime-reconciliation-template-v2.json", buildUnresolvedReconciliation(releaseManifest, sourceManifestHash, String(releaseManifest.releaseHash)));

    renameSync(tempRoot, outputRoot);
    const finalValidation = validateMasterVocabularyV2({ datasetRoot: outputRoot, writeReport: false, validatedAt: "2000-01-01T00:00:00Z" });
    return {
      outputRoot,
      releaseHash: String(releaseManifest.releaseHash),
      senseCount: sensePins.length,
      lexemeCount: lexemePins.length,
      provenanceCount: provenanceOutputPins.length,
      learningSetCount: setPins.length,
      importEligible: transformed.vocabulary.importEligible === true,
      validationErrorCount: finalValidation.errorCount,
    };
  } catch (error) {
    if (existsSync(tempRoot)) rmSync(tempRoot, { recursive: true, force: true });
    throw error;
  }
}

function parseArgs(args: string[]): { datasetRoot: string; approvalFile: string; outputRoot: string } {
  let datasetRoot = path.join(process.cwd(), "vocabflow-dataset");
  let approvalFile: string | undefined;
  let outputRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--dataset-root" && args[index + 1]) datasetRoot = path.resolve(args[++index]!);
    else if (arg === "--approval-file" && args[index + 1]) approvalFile = path.resolve(args[++index]!);
    else if (arg === "--output-root" && args[index + 1]) outputRoot = path.resolve(args[++index]!);
    else throw new Error(`UNKNOWN_OR_INCOMPLETE_ARGUMENT:${arg}`);
  }
  if (!approvalFile) throw new Error("OWNER_APPROVAL_FILE_REQUIRED:--approval-file");
  const resolvedDatasetRoot = path.resolve(datasetRoot);
  return {
    datasetRoot: resolvedDatasetRoot,
    approvalFile,
    outputRoot: path.resolve(outputRoot ?? path.join(resolvedDatasetRoot, "releases", "canary-v2.1.0")),
  };
}

function isMain(): boolean {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  try {
    const result = prepareMasterVocabularyV2CanaryRelease(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify({ status: "PREPARED_LOCAL_ONLY", ...result }, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
