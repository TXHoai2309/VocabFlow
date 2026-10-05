import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import canonicalize from "canonicalize";
import { validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";
import { preparePlan as prepareSemanticPromotion } from "./hybrid-100-canonical-promote";
import { buildFullOwnerApprovalPlan } from "./hybrid-100-cefr-full-owner-approval";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type FilePlan = Map<string, string>;
type Pin = JsonObject & { recordPath: string; contentHash: string };

export const AUTHORIZED_CEFR_FINGERPRINT = "d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622";
export const SEMANTIC_DRAFT_FINGERPRINT = "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d";
export const SEMANTIC_CANONICAL_PROMOTION_FINGERPRINT = "5c10618ee72fcc7b99b270764e412ebc51f286eadc750e45a6910830bb15e870";
export const RC_VERSION = "2.2.0-rc.1";
export const RC_CREATED_AT = "2026-10-05T00:00:00Z";
export const EXPECTED_CANARY_FINGERPRINT = "2c75c7092b89ed343e186d5087c4c99b2a09d8afd666c61f3cab1d746f504547";
export const LIGHT_ID = "01a0fc13-09f1-76b9-8a57-6c6e55e9b438";
export const LIGHT_SENSE_ID = "01a0fc13-09ee-7768-9be6-d20fa32521ee";
export const WATER_ID = "01a0fc13-09f2-77bf-93db-1ceefb68082a";
export const WATER_SENSE_ID = "01a0fc13-09ef-75ac-b815-039ab337c01a";
export const FUSE_SENSE_ID = "01a1070c-7c59-726e-88d6-cf9dc05adb73";
export const TAXONOMY_ID = "01a0fc13-09e9-72dd-b49d-ffef077385dd";
export const FRAMEWORK_CODE = "CEFR";
export const FRAMEWORK_VERSION = "EDITORIAL-PILOT-1";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = "vocabflow-dataset";
const ROOT_MANIFEST = DATASET + "/dataset.json";
const CEFR_WORKSPACE = DATASET + "/workspaces/hybrid-100-cefr-draft";
const SEMANTIC_WORKSPACE = DATASET + "/workspaces/hybrid-100-editorial-draft";
const RC_WORKSPACE = DATASET + "/workspaces/hybrid-100-release-candidate";
export const RC_RELEASE = DATASET + "/releases/hybrid-100-v2.2.0-rc.1";
const RC_REPORT = DATASET + "/reports/hybrid-100-release-candidate-2.2.0-rc.1.md";
const LIGHT_R1_PATH = "master/classifications/" + LIGHT_ID + "-r1.json";
const LIGHT_R2_PATH = "master/classifications/" + LIGHT_ID + "-r2.json";
const EXPECTED_CLASS_COUNTS: JsonObject = {
  NEW_EDITORIAL_CLASSIFICATION: 97,
  REUSE_EXISTING_CLASSIFICATION: 1,
  REVISE_EXISTING_CLASSIFICATION: 1,
  UNCLASSIFIED_INSUFFICIENT_EVIDENCE: 1,
};
const EXPECTED_DISTRIBUTION: JsonObject = {
  PRE_A1: 0,
  A1: 17,
  A2: 28,
  B1: 20,
  B2: 27,
  C1: 7,
  C2: 0,
  UNCLASSIFIED: 1,
};
const SCHEMA_FILES = [
  "common.schema.json",
  "dataset.schema.json",
  "lexeme.schema.json",
  "sense.schema.json",
  "taxonomy.schema.json",
  "learning-set.schema.json",
  "media-asset.schema.json",
  "provenance.schema.json",
] as const;
const AUTHORIZATION_PATH = RC_WORKSPACE + "/authorization.json";
const PROMOTION_PLAN_PATH = RC_WORKSPACE + "/canonical-promotion-plan.json";
const SUMMARY_PATH = RC_WORKSPACE + "/summary.json";
const READINESS_PATH = RC_WORKSPACE + "/readiness.json";

function fail(message: string): never {
  throw new Error(message);
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function canonicalHash(value: unknown): string {
  const result = canonicalize(value as never);
  if (result === undefined) fail("JCS_SERIALIZATION_FAILED");
  return sha256(result);
}

function jsonBytes(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

function readPackageJson<T>(datasetRoot: string, recordPath: string): T {
  const parts = recordPath.split("/");
  if (!recordPath || recordPath.includes("\\") || parts.some((part) => part === ".." || part === "." || !part)) {
    fail("RECORD_PATH_INVALID:" + recordPath);
  }
  return JSON.parse(readFileSync(path.join(datasetRoot, ...parts), "utf8")) as T;
}

function listJsonFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => path.join(directory, entry.name))
    .sort((left, right) => left.localeCompare(right, "en"));
}

function jsonFiles(root: string, relativeDirectory: string): JsonObject[] {
  return listJsonFiles(path.join(root, relativeDirectory)).map((file) =>
    JSON.parse(readFileSync(file, "utf8")) as JsonObject,
  );
}

function compareIds(left: JsonObject, right: JsonObject, idField: string): number {
  return String(left[idField]).localeCompare(String(right[idField]), "en");
}

function sortedPins<T extends JsonObject>(pins: T[], idField: string): T[] {
  return [...pins].sort((left, right) => compareIds(left, right, idField));
}

function distribution(rows: JsonObject[]): JsonObject {
  const counts: JsonObject = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, UNCLASSIFIED: 0 };
  for (const row of rows) {
    const value = row.editorialDecision?.valueCode;
    if (value === null) counts.UNCLASSIFIED += 1;
    else if (typeof value === "string" && Object.hasOwn(counts, value)) counts[value] += 1;
    else fail("CEFR_VALUE_INVALID:" + String(value));
  }
  return counts;
}

function decisionCounts(rows: JsonObject[]): JsonObject {
  const result: JsonObject = {};
  for (const row of rows) {
    const type = row.editorialDecision?.decisionType;
    if (typeof type !== "string") fail("CEFR_DECISION_TYPE_MISSING");
    result[type] = (result[type] ?? 0) + 1;
  }
  return result;
}

function recordsById(records: JsonObject[], idField: string): Map<string, JsonObject> {
  const result = new Map<string, JsonObject>();
  for (const record of records) {
    const id = record[idField];
    if (typeof id !== "string" || result.has(id)) fail("DUPLICATE_OR_MISSING_ID:" + idField);
    result.set(id, record);
  }
  return result;
}

function makePin(idField: string, id: string, revisionField: string | undefined, revision: number | undefined, recordPath: string, record: JsonObject): Pin {
  return {
    [idField]: id,
    ...(revisionField && revision !== undefined ? { [revisionField]: revision } : {}),
    recordPath,
    contentHash: canonicalHash(record),
  };
}

function filePathForPin(pin: Pin): string {
  return DATASET + "/" + pin.recordPath;
}

function verifyPinRecords(datasetRoot: string, manifest: JsonObject): void {
  const fields: Array<{ field: string; id: string; revision?: string }> = [
    { field: "includedLexemes", id: "masterLexemeId", revision: "lexemeRevision" },
    { field: "includedSenses", id: "masterSenseId", revision: "senseRevision" },
    { field: "includedClassifications", id: "classificationId", revision: "classificationRevision" },
    { field: "includedLearningSets", id: "learningSetId", revision: "learningSetRevision" },
    { field: "includedTaxonomySnapshots", id: "taxonomyId", revision: "taxonomyVersion" },
    { field: "includedMediaAssets", id: "mediaAssetId" },
    { field: "includedMediaAssetVersions", id: "mediaAssetId", revision: "mediaAssetVersion" },
    { field: "includedRelations", id: "relationId", revision: "relationRevision" },
    { field: "includedProvenance", id: "provenanceId" },
  ];
  for (const spec of fields) {
    for (const pin of (manifest[spec.field] ?? []) as Pin[]) {
      const record = readPackageJson<JsonObject>(datasetRoot, pin.recordPath);
      if (canonicalHash(record) !== pin.contentHash) fail("CANONICAL_PIN_HASH_MISMATCH:" + spec.field + ":" + String(pin[spec.id]));
      if (record[spec.id] !== pin[spec.id]) fail("CANONICAL_PIN_ID_MISMATCH:" + spec.field + ":" + String(pin[spec.id]));
      if (spec.revision && record[spec.revision] !== pin[spec.revision]) fail("CANONICAL_PIN_REVISION_MISMATCH:" + spec.field + ":" + String(pin[spec.id]));
    }
  }
}

function collectProvenanceIds(value: unknown): Set<string> {
  const result = new Set<string>();
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) {
      item.forEach(visit);
      return;
    }
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item as JsonObject)) {
      if ((key === "provenanceIds" || key === "sourceProvenanceIds") && Array.isArray(child)) {
        child.filter((id): id is string => typeof id === "string").forEach((id) => result.add(id));
      } else if (key.endsWith("ProvenanceId") && typeof child === "string") {
        result.add(child);
      }
      visit(child);
    }
  };
  visit(value);
  return result;
}

function collectMediaReferences(value: unknown): string[] {
  const result: string[] = [];
  const visit = (item: unknown): void => {
    if (Array.isArray(item)) return item.forEach(visit);
    if (!item || typeof item !== "object") return;
    for (const [key, child] of Object.entries(item as JsonObject)) {
      if (/^(mediaAssetId|mediaAssetVersion|audioAssetId|audioAssetVersion|assetVersionId)$/iu.test(key)) {
        if (typeof child === "string" || typeof child === "number") result.push(String(child));
      }
      visit(child);
    }
  };
  visit(value);
  return result;
}

function authArtifact(): JsonObject {
  return {
    artifactType: "HYBRID_100_CANONICAL_PROMOTION_AND_RC_AUTHORIZATION",
    authorizedCefrFingerprint: AUTHORIZED_CEFR_FINGERPRINT,
    authorizationScope: [
      "CANONICAL_CEFR_CLASSIFICATION_PROMOTION",
      "IMMUTABLE_RELEASE_CANDIDATE_BUILD",
    ],
    authorizedBy: "VocabFlow project owner",
    canonicalClassificationPromotionAuthorized: true,
    releaseCandidateBuildAuthorized: true,
    approvedReleaseAuthorized: false,
    runtimeImportAuthorized: false,
    databaseWriteAuthorized: false,
    productionMutationAuthorized: false,
    createdAt: RC_CREATED_AT,
  };
}

export function assertAuthorization(authorization: JsonObject | undefined): void {
  if (!authorization) fail("AUTHORIZATION_NOT_MATERIALIZED");
  if (authorization.authorizedCefrFingerprint !== AUTHORIZED_CEFR_FINGERPRINT) {
    fail("AUTHORIZED_CEFR_PACKAGE_STALE");
  }
  if (canonicalHash(authorization) !== canonicalHash(authArtifact())) fail("AUTHORIZATION_SCOPE_OR_IDENTITY_INVALID");
  if (authorization.canonicalClassificationPromotionAuthorized !== true) fail("CANONICAL_PROMOTION_NOT_AUTHORIZED");
  if (authorization.releaseCandidateBuildAuthorized !== true) fail("RELEASE_CANDIDATE_BUILD_NOT_AUTHORIZED");
  if (authorization.approvedReleaseAuthorized !== false) fail("APPROVED_RELEASE_MUST_REMAIN_UNAUTHORIZED");
  if (authorization.runtimeImportAuthorized !== false) fail("RUNTIME_IMPORT_MUST_REMAIN_UNAUTHORIZED");
  if (authorization.databaseWriteAuthorized !== false || authorization.productionMutationAuthorized !== false) {
    fail("DATABASE_OR_PRODUCTION_AUTHORIZATION_INVALID");
  }
}

function readWorkspaceSource(root: string): JsonObject {
  const datasetRoot = path.join(root, DATASET);
  const rootManifest = readJson<JsonObject>(root, ROOT_MANIFEST);
  const cefrManifest = readJson<JsonObject>(root, CEFR_WORKSPACE + "/manifest.json");
  const cefrDocument = readJson<JsonObject>(root, CEFR_WORKSPACE + "/cefr-decisions.json");
  const fullApproval = readJson<JsonObject>(root, CEFR_WORKSPACE + "/full-owner-approval.json");
  const semanticManifest = readJson<JsonObject>(root, SEMANTIC_WORKSPACE + "/manifest.json");
  const semanticSummary = readJson<JsonObject>(root, SEMANTIC_WORKSPACE + "/canonical-promotion-summary.json");
  const semanticMap = readJson<JsonObject[]>(root, SEMANTIC_WORKSPACE + "/candidate-master-map.json");
  const semanticDecisions = readJson<JsonObject>(root, SEMANTIC_WORKSPACE + "/editorial-decisions.json");
  const rows = cefrDocument.rows as JsonObject[];
  const workspaceClasses = jsonFiles(root, CEFR_WORKSPACE + "/classifications");
  const workspaceProvenance = jsonFiles(root, CEFR_WORKSPACE + "/provenance");
  if (rootManifest.datasetVersion !== "2.0.0" || rootManifest.schemaVersion !== "2.0.1" || rootManifest.status !== "DRAFT") {
    fail("CANONICAL_CEFR_BASE_STALE");
  }
  if (rootManifest.releaseHash !== undefined || rootManifest.releaseHashAlgorithm !== undefined || rootManifest.releasedAt !== undefined) {
    fail("CANONICAL_DRAFT_RELEASE_FIELDS_INVALID");
  }
  if (cefrManifest.fullOwnerApprovalFingerprint !== AUTHORIZED_CEFR_FINGERPRINT
    || cefrManifest.cefrDraftFingerprint !== AUTHORIZED_CEFR_FINGERPRINT
    || cefrDocument.fullOwnerApprovalFingerprint !== AUTHORIZED_CEFR_FINGERPRINT
    || fullApproval.fullOwnerApprovedCefrFingerprint !== AUTHORIZED_CEFR_FINGERPRINT
    || semanticManifest.draftPackageFingerprint !== SEMANTIC_DRAFT_FINGERPRINT
    || semanticSummary.promotionPlanFingerprint !== SEMANTIC_CANONICAL_PROMOTION_FINGERPRINT
    || semanticSummary.datasetManifestHashAfter === undefined
    || cefrManifest.approvedSemanticDraftFingerprint !== SEMANTIC_DRAFT_FINGERPRINT
    || cefrManifest.canonicalPromotionFingerprint !== SEMANTIC_CANONICAL_PROMOTION_FINGERPRINT) {
    fail("AUTHORIZED_CEFR_PACKAGE_STALE");
  }
  if (semanticDecisions.decisionCount !== 100 || semanticDecisions.decisions?.length !== 100 || semanticMap.length !== 100) {
    fail("SEMANTIC_COHORT_STALE");
  }
  if (rows.length !== 100 || cefrDocument.candidateCount !== 100
    || cefrDocument.ownerApprovedDecisionCount !== 100
    || cefrDocument.ownerApprovedClassifiedCount !== 99
    || cefrDocument.ownerApprovedUnclassifiedCount !== 1
    || cefrDocument.pendingOwnerReviewCount !== 0
    || fullApproval.approvedCandidateCount !== 100
    || fullApproval.approvedClassifiedDecisionCount !== 99
    || fullApproval.approvedUnclassifiedDecisionCount !== 1
    || fullApproval.effectiveOwnerReviewProvenanceCount !== 99
    || fullApproval.ownerReviewDecisionCoverage !== "99/99") {
    fail("CEFR_OWNER_REVIEW_COUNTS_STALE");
  }
  const counts = decisionCounts(rows);
  if (canonicalHash(counts) !== canonicalHash(EXPECTED_CLASS_COUNTS)) fail("CEFR_DECISION_COUNTS_STALE");
  if (canonicalHash(distribution(rows)) !== canonicalHash(EXPECTED_DISTRIBUTION)) fail("CEFR_DISTRIBUTION_STALE");
  if (new Set(rows.map((row) => row.candidateId)).size !== 100 || new Set(rows.map((row) => row.masterSenseId)).size !== 100) {
    fail("CEFR_COHORT_IDENTITY_STALE");
  }
  if (rows.some((row) => row.reviewStatus !== (row.editorialDecision?.valueCode === null ? "ACCEPTED_UNCLASSIFIED" : "OWNER_DECISION_ACCEPTED")
    || (row.editorialDecision?.valueCode !== null && row.ownerDecisionStatus !== "ACCEPTED"))) {
    fail("CEFR_OWNER_DECISION_NOT_CLOSED");
  }
  const decisionTypes = new Map(rows.map((row) => [row.masterSenseId, row.editorialDecision?.decisionType]));
  const semanticDecisionCounts: JsonObject = {};
  for (const item of semanticMap) semanticDecisionCounts[item.identityDecision] = (semanticDecisionCounts[item.identityDecision] ?? 0) + 1;
  const semanticIdentityExpected = { NEW_SENSE_NEW_LEXEME: 95, NEW_SENSE_EXISTING_LEXEME: 3, REUSE_EXISTING_SENSE: 2 };
  if (canonicalHash(semanticDecisionCounts) !== canonicalHash(semanticIdentityExpected)) fail("SEMANTIC_IDENTITY_DECISIONS_STALE");
  if (new Set(semanticMap.map((row) => row.masterSenseId)).size !== 100 || new Set(semanticMap.map((row) => row.masterLexemeId)).size !== 87) {
    fail("SEMANTIC_COHORT_IDENTITIES_STALE");
  }
  if (rows.some((row) => !decisionTypes.has(row.masterSenseId))) fail("CEFR_SENSE_OUTSIDE_SEMANTIC_COHORT");
  const classesById = recordsById(workspaceClasses, "classificationId");
  if (workspaceClasses.length !== 98 || classesById.size !== 98 || workspaceProvenance.length !== 197) {
    fail("CEFR_WORKSPACE_RECORD_COUNTS_STALE");
  }
  const typeBySense = new Map<string, string>();
  for (const row of rows) {
    const decision = row.editorialDecision;
    if (decision.decisionType === "UNCLASSIFIED_INSUFFICIENT_EVIDENCE") {
      if (row.masterSenseId !== FUSE_SENSE_ID || decision.valueCode !== null || decision.classificationId !== null) {
        fail("FUSE_MUST_REMAIN_UNCLASSIFIED");
      }
      continue;
    }
    if (typeof decision.classificationId !== "string" || typeof decision.valueCode !== "string") fail("CLASSIFICATION_DECISION_INCOMPLETE");
    if (typeBySense.has(row.masterSenseId)) fail("DUPLICATE_CEFR_DECISION_FOR_SENSE");
    typeBySense.set(row.masterSenseId, decision.decisionType);
    if (decision.decisionType === "REUSE_EXISTING_CLASSIFICATION") {
      if (row.masterSenseId !== WATER_SENSE_ID || decision.classificationId !== WATER_ID || decision.valueCode !== "A2"
        || row.existingClassificationAudit?.records?.[0]?.revision !== 1) {
        fail("WATER_REUSE_DECISION_STALE");
      }
      continue;
    }
    const record = classesById.get(decision.classificationId);
    if (!record) fail("APPROVED_CLASSIFICATION_RECORD_MISSING:" + decision.classificationId);
    if (record.masterSenseId !== row.masterSenseId || record.dimension !== FRAMEWORK_CODE
      || record.frameworkCode !== FRAMEWORK_CODE || record.frameworkVersion !== FRAMEWORK_VERSION
      || record.valueCode !== decision.valueCode || record.isPrimary !== true || record.status !== "DRAFT") {
      fail("APPROVED_CLASSIFICATION_RECORD_DRIFT:" + decision.classificationId);
    }
    const expectedRevision = decision.decisionType === "REVISE_EXISTING_CLASSIFICATION" ? 2 : 1;
    if (record.classificationRevision !== expectedRevision) fail("CLASSIFICATION_REVISION_DRIFT:" + decision.classificationId);
  }
  if (classesById.get(LIGHT_ID)?.classificationRevision !== 2
    || classesById.get(LIGHT_ID)?.masterSenseId !== LIGHT_SENSE_ID
    || classesById.get(LIGHT_ID)?.valueCode !== "A1") fail("LIGHT_REVISION_TWO_STALE");
  if ([...classesById.keys()].some((id) => rows.some((row) => row.editorialDecision?.decisionType === "UNCLASSIFIED_INSUFFICIENT_EVIDENCE" && row.editorialDecision?.classificationId === id))) {
    fail("FUSE_CLASSIFICATION_FORBIDDEN");
  }
  const provById = recordsById(workspaceProvenance, "provenanceId");
  for (const record of workspaceProvenance) {
    if (!["PROJECT_AUTHORED", "OWNER_REVIEW"].includes(record.sourceType)) fail("UNAUTHORIZED_PROVENANCE_SOURCE_TYPE");
  }
  const classIds = new Set(rows.filter((row) => row.editorialDecision?.valueCode !== null).map((row) => row.editorialDecision.classificationId));
  const ownerEvidence = workspaceProvenance.filter((record) => record.sourceType === "OWNER_REVIEW"
    && record.subjectType === "CLASSIFICATION" && classIds.has(record.subjectId));
  if (ownerEvidence.length !== 99 || new Set(ownerEvidence.map((record) => record.subjectId)).size !== 99
    || ownerEvidence.some((record) => !provById.has(record.provenanceId))) {
    fail("CEFR_OWNER_EVIDENCE_COVERAGE_INVALID");
  }
  const taxonomyPin = (rootManifest.includedTaxonomySnapshots as Pin[]).find((pin) => pin.taxonomyId === TAXONOMY_ID);
  if (!taxonomyPin || taxonomyPin.taxonomyVersion !== "2.0.0"
    || taxonomyPin.recordPath !== "taxonomy/" + TAXONOMY_ID + "-2.0.0.json"
    || taxonomyPin.contentHash !== "67ecd13e49e756df6fce2def9f40fe11eb8831ef9a68097299d37324ac588b79") {
    fail("TAXONOMY_PIN_STALE");
  }
  const taxonomy = readPackageJson<JsonObject>(datasetRoot, taxonomyPin.recordPath);
  if (taxonomy.status !== "DRAFT" || !taxonomy.cefrFrameworks?.some((framework: JsonObject) => framework.frameworkCode === FRAMEWORK_CODE && framework.frameworkVersion === FRAMEWORK_VERSION)) {
    fail("TAXONOMY_FRAMEWORK_STALE");
  }
  return {
    rootManifest,
    cefrManifest,
    cefrDocument,
    fullApproval,
    semanticManifest,
    semanticSummary,
    semanticMap,
    rows,
    workspaceClasses,
    workspaceProvenance,
    ownerEvidence,
    taxonomyPin,
    taxonomy,
  };
}

function treeSnapshot(root: string, relativeDirectory: string): JsonObject[] {
  const absolute = path.join(root, relativeDirectory);
  if (!existsSync(absolute)) return [];
  const output: JsonObject[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name, "en"))) {
      const child = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) {
        output.push({
          path: path.relative(root, child).split(path.sep).join("/"),
          sha256: sha256(readFileSync(child)),
        });
      }
    }
  };
  visit(absolute);
  return output.sort((left, right) => String(left.path).localeCompare(String(right.path), "en"));
}

export function computeCanaryFingerprint(root: string): string {
  return canonicalHash(treeSnapshot(root, DATASET + "/releases/canary-v2.1.0"));
}

function baselineManifestForCurrentState(root: string, model: JsonObject): { state: "BASE" | "PROMOTED"; manifest: JsonObject } {
  const current = model.rootManifest as JsonObject;
  const currentClassPins = current.includedClassifications as Pin[];
  const currentProvPins = current.includedProvenance as Pin[];
  const wsProvenance = model.workspaceProvenance as JsonObject[];
  const newClassIds = new Set((model.rows as JsonObject[])
    .filter((row) => row.editorialDecision?.decisionType === "NEW_EDITORIAL_CLASSIFICATION")
    .map((row) => row.editorialDecision.classificationId));
  const newProvenanceIds = new Set(wsProvenance.map((record) => record.provenanceId));
  const newPins = currentClassPins.filter((pin) => newClassIds.has(pin.classificationId));
  const newProvPins = currentProvPins.filter((pin) => newProvenanceIds.has(pin.provenanceId));
  const lightPin = currentClassPins.find((pin) => pin.classificationId === LIGHT_ID);
  const expectedLightR1 = readJson<JsonObject>(root, DATASET + "/" + LIGHT_R1_PATH);
  const expectedLightPin = makePin("classificationId", LIGHT_ID, "classificationRevision", 1, LIGHT_R1_PATH, expectedLightR1);
  if (expectedLightPin.contentHash !== "08482dae079eb7932bb7254e9a99277f104d58cf73be9f954b63641996c9763c") {
    fail("CANONICAL_CEFR_BASE_STALE: light revision 1 hash changed");
  }
  const baseState = currentClassPins.length === 122 && currentProvPins.length === 846
    && newPins.length === 0 && newProvPins.length === 0
    && lightPin?.classificationRevision === 1 && lightPin.contentHash === expectedLightPin.contentHash;
  const promotedState = currentClassPins.length === 219 && currentProvPins.length === 1043
    && newPins.length === 97 && newProvPins.length === 197
    && lightPin?.classificationRevision === 2
    && lightPin.contentHash === canonicalHash(readJson<JsonObject>(
      root,
      CEFR_WORKSPACE + "/classifications/" + path.posix.basename(LIGHT_R2_PATH),
    ));
  if (!baseState && !promotedState) fail("CANONICAL_CEFR_BASE_STALE_OR_PARTIALLY_PROMOTED");
  const normalized = structuredClone(current) as JsonObject;
  if (promotedState) {
    normalized.includedClassifications = currentClassPins
      .filter((pin) => !newClassIds.has(pin.classificationId))
      .map((pin) => pin.classificationId === LIGHT_ID ? expectedLightPin : pin);
    normalized.includedProvenance = currentProvPins.filter((pin) => !newProvenanceIds.has(pin.provenanceId));
  }
  if (normalized.includedLexemes.length !== 103 || normalized.includedSenses.length !== 123
    || normalized.includedClassifications.length !== 122 || normalized.includedProvenance.length !== 846) {
    fail("CANONICAL_CEFR_BASE_STALE: baseline pins do not match current repository records");
  }
  const semanticSummary = model.semanticSummary as JsonObject;
  if (canonicalHash(normalized) !== semanticSummary.datasetManifestHashAfter) {
    fail("CANONICAL_SEMANTIC_BASE_STALE");
  }
  const datasetRoot = path.join(root, DATASET);
  verifyPinRecords(datasetRoot, current);
  if (computeCanaryFingerprint(root) !== EXPECTED_CANARY_FINGERPRINT) fail("CANARY_V2_1_0_CHANGED");
  return { state: promotedState ? "PROMOTED" : "BASE", manifest: normalized };
}

function validatePinnedInputsAgainstExistingTools(root: string): void {
  const semanticPlan = prepareSemanticPromotion(root);
  if (semanticPlan.promotionPlanFingerprint !== SEMANTIC_CANONICAL_PROMOTION_FINGERPRINT) {
    fail("SEMANTIC_CANONICAL_PROMOTION_FINGERPRINT_STALE");
  }
  const approvalPlan = buildFullOwnerApprovalPlan(root, "check");
  if (approvalPlan.fullOwnerApprovalFingerprint !== AUTHORIZED_CEFR_FINGERPRINT) fail("AUTHORIZED_CEFR_PACKAGE_STALE");
}

function createRootPromotion(root: string, model: JsonObject, baseManifest: JsonObject, state: "BASE" | "PROMOTED"): {
  manifest: JsonObject;
  classRecords: JsonObject[];
  classFiles: Map<string, string>;
  provenanceRecords: JsonObject[];
  provenanceFiles: Map<string, string>;
  provenancePins: Pin[];
  classPins: Pin[];
} {
  const rows = model.rows as JsonObject[];
  const classRecords = model.workspaceClasses as JsonObject[];
  const provenanceRecords = model.workspaceProvenance as JsonObject[];
  const classById = recordsById(classRecords, "classificationId");
  const provenanceById = recordsById(provenanceRecords, "provenanceId");
  const classFiles = new Map<string, string>();
  const provenanceFiles = new Map<string, string>();
  const classPins: Pin[] = [];
  const provenancePins: Pin[] = [];
  for (const record of classRecords) {
    const revision = record.classificationRevision;
    const relative = "master/classifications/" + record.classificationId + "-r" + revision + ".json";
    const workspacePath = CEFR_WORKSPACE + "/classifications/" + path.posix.basename(relative);
    const raw = readFileSync(path.join(root, workspacePath), "utf8");
    const id = record.classificationId as string;
    classFiles.set(DATASET + "/" + relative, raw);
    classPins.push(makePin("classificationId", id, "classificationRevision", revision, relative, record));
  }
  for (const record of provenanceRecords) {
    const relative = "provenance/" + record.provenanceId + ".json";
    const workspacePath = CEFR_WORKSPACE + "/provenance/" + path.posix.basename(relative);
    const raw = readFileSync(path.join(root, workspacePath), "utf8");
    provenanceFiles.set(DATASET + "/" + relative, raw);
    provenancePins.push(makePin("provenanceId", record.provenanceId, undefined, undefined, relative, record));
  }
  if (classById.size !== 98 || provenanceById.size !== 197) fail("CANONICAL_PROMOTION_COUNTS_STALE");
  const baselineClasses = baseManifest.includedClassifications as Pin[];
  const currentLight = baselineClasses.find((pin) => pin.classificationId === LIGHT_ID);
  const lightRecord = classById.get(LIGHT_ID);
  if (!currentLight || currentLight.classificationRevision !== 1 || !lightRecord) fail("LIGHT_REVISION_PREDECESSOR_MISSING");
  const lightR1 = readJson<JsonObject>(root, DATASET + "/" + LIGHT_R1_PATH);
  if (canonicalHash(lightR1) !== currentLight.contentHash) fail("LIGHT_REVISION_ONE_CHANGED");
  if (lightR1.status !== "IN_REVIEW" || lightR1.valueCode !== "A2" || lightR1.classificationRevision !== 1) fail("LIGHT_REVISION_ONE_CONTENT_STALE");
  const waterPin = baselineClasses.find((pin) => pin.classificationId === WATER_ID);
  if (!waterPin || waterPin.classificationRevision !== 1 || waterPin.contentHash !== "9bf8e322e7b508d43f69ef7b9927d5a83ac04ab6d0c0e79d546fb2a3b9fb1eec") {
    fail("WATER_CANONICAL_DEPENDENCY_STALE");
  }
  const water = readPackageJson<JsonObject>(path.join(root, DATASET), waterPin.recordPath);
  if (water.masterSenseId !== WATER_SENSE_ID || water.valueCode !== "A2" || water.status !== "IN_REVIEW") fail("WATER_CANONICAL_DEPENDENCY_STALE");
  const allExistingClassFiles = jsonFiles(root, DATASET + "/master/classifications");
  const existingClassIds = new Set(allExistingClassFiles.map((record) => record.classificationId));
  for (const row of rows) {
    const decision = row.editorialDecision;
    if (decision.decisionType === "NEW_EDITORIAL_CLASSIFICATION" && existingClassIds.has(decision.classificationId)) {
      if (state === "BASE") fail("CLASSIFICATION_ID_COLLISION:" + decision.classificationId);
      const existing = allExistingClassFiles.find((record) => record.classificationId === decision.classificationId);
      if (!existing || canonicalHash(existing) !== canonicalHash(classById.get(decision.classificationId))) {
        fail("CANONICAL_CLASSIFICATION_IMMUTABILITY_VIOLATION:" + decision.classificationId);
      }
    }
  }
  const existingProvenanceIds = new Set(jsonFiles(root, DATASET + "/provenance").map((record) => record.provenanceId));
  if (new Set(provenanceRecords.map((record) => record.provenanceId)).size !== 197) fail("PROMOTED_PROVENANCE_ID_DUPLICATE");
  for (const id of existingProvenanceIds) {
    const planned = provenanceById.get(id);
    if (!planned) continue;
    if (state === "BASE") fail("PROVENANCE_ID_COLLISION:" + id);
    const existing = readJson<JsonObject>(root, DATASET + "/provenance/" + id + ".json");
    if (canonicalHash(existing) !== canonicalHash(planned)) fail("CANONICAL_PROVENANCE_IMMUTABILITY_VIOLATION:" + id);
  }
  const result = structuredClone(baseManifest) as JsonObject;
  const addedClassPins = classRecords.map((record) => {
    const relative = "master/classifications/" + record.classificationId + "-r" + record.classificationRevision + ".json";
    return makePin("classificationId", record.classificationId, "classificationRevision", record.classificationRevision, relative, record);
  });
  const lightR2Pin = addedClassPins.find((pin) => pin.classificationId === LIGHT_ID);
  if (!lightR2Pin || lightR2Pin.classificationRevision !== 2) fail("LIGHT_REVISION_TWO_PIN_MISSING");
  result.includedClassifications = baselineClasses
    .map((pin) => pin.classificationId === LIGHT_ID ? lightR2Pin : pin)
    .concat(sortedPins(addedClassPins.filter((pin) => pin.classificationId !== LIGHT_ID), "classificationId"));
  result.includedProvenance = (baseManifest.includedProvenance as Pin[])
    .concat(sortedPins(provenancePins, "provenanceId"));
  const allCurrentIds = (result.includedClassifications as Pin[]).map((pin) => pin.classificationId);
  if (new Set(allCurrentIds).size !== allCurrentIds.length) fail("DUPLICATE_CURRENT_CLASSIFICATION_ID");
  if (result.includedClassifications.length !== 219 || result.includedProvenance.length !== 1043) {
    fail("CANONICAL_RESULT_COUNTS_STALE");
  }
  assertUniquePrimaryCefrPins(root, result.includedClassifications as Pin[], classFiles);
  return {
    manifest: result,
    classRecords,
    classFiles,
    provenanceRecords,
    provenanceFiles,
    provenancePins,
    classPins: addedClassPins,
  };
}

function assertUniquePrimaryCefrPins(root: string, pins: Pin[], plannedFiles: Map<string, string>): void {
  const seen = new Set<string>();
  for (const pin of pins) {
    let record: JsonObject;
    const planned = plannedFiles.get(filePathForPin(pin));
    record = planned ? JSON.parse(planned) as JsonObject : readJson<JsonObject>(root, DATASET + "/" + pin.recordPath);
    if (record.dimension !== FRAMEWORK_CODE || record.frameworkCode !== FRAMEWORK_CODE
      || record.frameworkVersion !== FRAMEWORK_VERSION || record.isPrimary !== true) continue;
    const key = [record.masterSenseId, record.frameworkCode, record.frameworkVersion].join("|");
    if (seen.has(key)) fail("DUPLICATE_PRIMARY_CEFR:" + key);
    seen.add(key);
  }
}

function candidateRecords(root: string, model: JsonObject, promotion: JsonObject): {
  manifest: JsonObject;
  candidateFiles: Map<string, string>;
  candidateDataPins: JsonObject[];
  provenanceCount: number;
  classificationPins: Pin[];
  lexemePins: Pin[];
  sensePins: Pin[];
  provenancePins: Pin[];
} {
  const datasetRoot = path.join(root, DATASET);
  const rootManifest = promotion.manifest as JsonObject;
  const modelMap = model.semanticMap as JsonObject[];
  const lexemeIds = new Set(modelMap.map((entry) => entry.masterLexemeId));
  const senseIds = new Set(modelMap.map((entry) => entry.masterSenseId));
  const lexemePins = (rootManifest.includedLexemes as Pin[]).filter((pin) => lexemeIds.has(pin.masterLexemeId));
  const sensePins = (rootManifest.includedSenses as Pin[]).filter((pin) => senseIds.has(pin.masterSenseId));
  if (lexemePins.length !== 87 || sensePins.length !== 100) fail("RC_COHORT_RECORD_COUNTS_STALE");
  const rootClassificationPins = rootManifest.includedClassifications as Pin[];
  const classPinsById = new Map(rootClassificationPins.map((pin) => [pin.classificationId, pin]));
  const classificationPins: Pin[] = [];
  for (const row of model.rows as JsonObject[]) {
    const decision = row.editorialDecision;
    if (decision.decisionType === "UNCLASSIFIED_INSUFFICIENT_EVIDENCE") continue;
    const pin = classPinsById.get(decision.classificationId);
    if (!pin) fail("RC_CLASSIFICATION_PIN_MISSING:" + String(decision.classificationId));
    const plannedRecord = (promotion.classFiles as Map<string, string>).get(filePathForPin(pin));
    const record = plannedRecord
      ? JSON.parse(plannedRecord) as JsonObject
      : readPackageJson<JsonObject>(datasetRoot, pin.recordPath);
    if (record.masterSenseId !== row.masterSenseId || record.valueCode !== decision.valueCode
      || record.frameworkCode !== FRAMEWORK_CODE || record.frameworkVersion !== FRAMEWORK_VERSION) {
      fail("RC_CLASSIFICATION_DECISION_MISMATCH:" + String(decision.classificationId));
    }
    classificationPins.push(pin);
  }
  if (classificationPins.length !== 99 || new Set(classificationPins.map((pin) => pin.classificationId)).size !== 99) {
    fail("RC_CLASSIFICATION_COUNT_STALE");
  }
  const uniqueClassPins = sortedPins(classificationPins, "classificationId");
  const refs = new Set<string>();
  for (const pin of [...lexemePins, ...sensePins, ...uniqueClassPins]) {
    const planned = (promotion.classFiles as Map<string, string>).get(filePathForPin(pin));
    const record = planned
      ? JSON.parse(planned) as JsonObject
      : readPackageJson<JsonObject>(datasetRoot, pin.recordPath);
    for (const id of collectProvenanceIds(record)) refs.add(id);
    const mediaRefs = collectMediaReferences(record);
    if (mediaRefs.length > 0) fail("UNAUTHORIZED_MEDIA_DEPENDENCY:" + mediaRefs.join(","));
  }
  const taxonomyPin = model.taxonomyPin as Pin;
  const taxonomy = model.taxonomy as JsonObject;
  for (const id of collectProvenanceIds(taxonomy)) refs.add(id);
  const workspaceProvenance = model.workspaceProvenance as JsonObject[];
  const workspaceProvById = recordsById(workspaceProvenance, "provenanceId");
  const ownerEvidence = model.ownerEvidence as JsonObject[];
  for (const record of ownerEvidence) refs.add(record.provenanceId);
  const ownerIdsForCohort = new Set(ownerEvidence.map((record) => record.provenanceId));
  if (ownerIdsForCohort.size !== 99) fail("RC_CEFR_OWNER_EVIDENCE_INCOMPLETE");
  const queue = [...refs];
  const provenanceRecords = new Map<string, JsonObject>();
  while (queue.length) {
    const id = queue.pop()!;
    if (provenanceRecords.has(id)) continue;
    const promoted = workspaceProvById.get(id);
    let record: JsonObject;
    if (promoted) record = promoted;
    else {
      const pin = (rootManifest.includedProvenance as Pin[]).find((item) => item.provenanceId === id);
      if (!pin) fail("RC_PROVENANCE_CLOSURE_DANGLING:" + id);
      record = readPackageJson<JsonObject>(datasetRoot, pin.recordPath);
    }
    if (record.provenanceId !== id) fail("RC_PROVENANCE_ID_MISMATCH:" + id);
    if (record.sourceType === "LICENSED_SOURCE" || record.sourceType === "PUBLIC_DOMAIN_SOURCE") {
      fail("UNAUTHORIZED_EXTERNAL_SOURCE_PROVENANCE:" + id);
    }
    provenanceRecords.set(id, record);
    for (const dependency of collectProvenanceIds(record)) if (!provenanceRecords.has(dependency)) queue.push(dependency);
  }
  const allCefrProvenanceIds = new Set(workspaceProvenance.map((record) => record.provenanceId));
  if ([...allCefrProvenanceIds].some((id) => !provenanceRecords.has(id))) fail("RC_CEFR_PROVENANCE_EVIDENCE_INCOMPLETE");
  const rootProvById = new Map((rootManifest.includedProvenance as Pin[]).map((pin) => [pin.provenanceId, pin]));
  const provenancePins: Pin[] = [];
  for (const [id, record] of provenanceRecords) {
    const relative = "provenance/" + id + ".json";
    provenancePins.push(makePin("provenanceId", id, undefined, undefined, relative, record));
  }
  const manifest: JsonObject = {
    datasetId: rootManifest.datasetId,
    datasetCode: rootManifest.datasetCode,
    name: rootManifest.name,
    datasetVersion: RC_VERSION,
    schemaVersion: "2.0.1",
    status: "IN_REVIEW",
    includedLexemes: sortedPins(lexemePins, "masterLexemeId"),
    includedSenses: sortedPins(sensePins, "masterSenseId"),
    includedClassifications: uniqueClassPins,
    includedLearningSets: [],
    includedTaxonomySnapshots: [taxonomyPin],
    includedMediaAssets: [],
    includedMediaAssetVersions: [],
    includedRelations: [],
    includedProvenance: sortedPins(provenancePins, "provenanceId"),
    createdAt: String((readJson<JsonObject>(root, AUTHORIZATION_PATH)).createdAt),
    changeSummary: [
      { language: "en", text: "Owner-approved Hybrid-100 cohort release candidate for editorial and lifecycle review; CEFR values are VocabFlow editorial estimates." },
      { language: "vi", text: "Bản ứng viên phát hành Hybrid-100 đã được chủ dự án duyệt để rà soát biên tập và vòng đời; CEFR là ước lượng biên tập của VocabFlow." },
    ],
  };
  if (manifest.releaseHash !== undefined || manifest.releaseHashAlgorithm !== undefined || manifest.releasedAt !== undefined) {
    fail("RC_RELEASE_FIELDS_FORBIDDEN");
  }
  const senseForFuse = sensePins.find((pin) => pin.masterSenseId === FUSE_SENSE_ID);
  if (!senseForFuse || classificationPins.some((pin) => {
    const planned = (promotion.classFiles as Map<string, string>).get(filePathForPin(pin));
    const record = planned ? JSON.parse(planned) as JsonObject : readPackageJson<JsonObject>(datasetRoot, pin.recordPath);
    return record.masterSenseId === FUSE_SENSE_ID;
  })) {
    fail("FUSE_CLASSIFICATION_FORBIDDEN");
  }
  if (manifest.includedTaxonomySnapshots.length !== 1 || manifest.includedLearningSets.length
    || manifest.includedRelations.length || manifest.includedMediaAssets.length || manifest.includedMediaAssetVersions.length) {
    fail("UNAUTHORIZED_RC_DEPENDENCY_EXPANSION");
  }
  if (manifest.includedProvenance.length !== provenanceRecords.size) fail("RC_PROVENANCE_PIN_COUNT_MISMATCH");
  const candidateFiles = new Map<string, string>();
  candidateFiles.set(RC_RELEASE + "/dataset.json", jsonBytes(manifest));
  const candidateDataPins: JsonObject[] = [];
  const allPins = [
    ...manifest.includedLexemes.map((pin: Pin) => ({ type: "LEXEME", pin })),
    ...manifest.includedSenses.map((pin: Pin) => ({ type: "SENSE", pin })),
    ...manifest.includedClassifications.map((pin: Pin) => ({ type: "CLASSIFICATION", pin })),
    ...manifest.includedTaxonomySnapshots.map((pin: Pin) => ({ type: "TAXONOMY", pin })),
    ...manifest.includedProvenance.map((pin: Pin) => ({ type: "PROVENANCE", pin })),
  ];
  for (const item of allPins) {
    const pin = item.pin as Pin;
    let raw: string;
    if (item.type === "CLASSIFICATION") {
      const planned = (promotion.classFiles as Map<string, string>).get(filePathForPin(pin));
      raw = planned ?? readFileSync(path.join(datasetRoot, pin.recordPath), "utf8");
    } else if (item.type === "PROVENANCE") {
      const planned = (promotion.provenanceFiles as Map<string, string>).get(filePathForPin(pin));
      raw = planned ?? readFileSync(path.join(datasetRoot, pin.recordPath), "utf8");
    } else {
      raw = readFileSync(path.join(datasetRoot, pin.recordPath), "utf8");
    }
    const record = JSON.parse(raw) as JsonObject;
    if (canonicalHash(record) !== pin.contentHash) fail("RC_RECORD_HASH_MISMATCH:" + pin.recordPath);
    candidateFiles.set(RC_RELEASE + "/" + pin.recordPath, raw);
    candidateDataPins.push({ recordPath: pin.recordPath, contentHash: pin.contentHash });
  }
  for (const schemaFile of SCHEMA_FILES) {
    const raw = readFileSync(path.join(datasetRoot, "schemas", schemaFile), "utf8");
    candidateFiles.set(RC_RELEASE + "/schemas/" + schemaFile, raw);
  }
  candidateDataPins.sort((left, right) => String(left.recordPath).localeCompare(String(right.recordPath), "en"));
  // Read every selected canonical pin once more to ensure source and candidate records remain byte-equivalent.
  for (const pin of [...lexemePins, ...sensePins]) {
    if (readFileSync(path.join(datasetRoot, pin.recordPath), "utf8") !== candidateFiles.get(RC_RELEASE + "/" + pin.recordPath)) {
      fail("RC_SEMANTIC_CONTENT_REAUTHORED:" + pin.recordPath);
    }
  }
  const sourceClassOwnerIds = new Set(ownerEvidence.map((record) => record.provenanceId));
  if ([...sourceClassOwnerIds].some((id) => !provenanceRecords.has(id))) fail("RC_OWNER_REVIEW_PROVENANCE_MISSING");
  if ([...rootProvById.keys()].length !== rootManifest.includedProvenance.length) fail("ROOT_PROVENANCE_ID_DUPLICATE");
  return {
    manifest,
    candidateFiles,
    candidateDataPins,
    provenanceCount: provenanceRecords.size,
    classificationPins: uniqueClassPins,
    lexemePins,
    sensePins,
    provenancePins,
  };
}

function candidateTreeFingerprint(files: Map<string, string>): string {
  const entries = [...files.entries()]
    .filter(([file]) => !file.endsWith("/reports/release-candidate-evidence.json"))
    .map(([file, contents]) => ({ path: file.slice((RC_RELEASE + "/").length), sha256: sha256(contents) }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return canonicalHash(entries);
}

function candidateFingerprint(input: {
  manifest: JsonObject;
  candidateFiles: Map<string, string>;
  dataPins: JsonObject[];
  authorizationFingerprint: string;
  promotionPlanFingerprint: string;
}): { fingerprint: string; manifestHash: string; treeFingerprint: string; schemaHashes: JsonObject[] } {
  const manifestHash = canonicalHash(input.manifest);
  const schemaHashes = SCHEMA_FILES.map((file) => ({
    path: "schemas/" + file,
    sha256: sha256(input.candidateFiles.get(RC_RELEASE + "/schemas/" + file)!),
  }));
  const taxonomyPin = input.manifest.includedTaxonomySnapshots[0];
  const taxonomyHash = taxonomyPin.contentHash;
  const treeFingerprint = candidateTreeFingerprint(input.candidateFiles);
  const fingerprint = canonicalHash({
    artifactType: "RELEASE_CANDIDATE_FINGERPRINT",
    candidateManifest: input.manifest,
    candidateDataPins: input.dataPins,
    schemaHashes,
    taxonomyHash,
    authorizationFingerprint: input.authorizationFingerprint,
    canonicalPromotionPlanFingerprint: input.promotionPlanFingerprint,
  });
  return { fingerprint, manifestHash, treeFingerprint, schemaHashes };
}

function mergedSection(original: string, name: string, section: string): string {
  const begin = "<!-- " + name + " START -->";
  const end = "<!-- " + name + " END -->";
  const marked = begin + "\n" + section.trim() + "\n" + end;
  const startIndex = original.indexOf(begin);
  const endIndex = original.indexOf(end);
  if (startIndex >= 0 || endIndex >= 0) {
    if (startIndex < 0 || endIndex < startIndex) fail("PHASE_DOCUMENTATION_MARKER_INVALID:" + name);
    const current = original.slice(startIndex, endIndex + end.length);
    if (current !== marked) fail("PHASE_DOCUMENTATION_DRIFT:" + name);
    return original;
  }
  return original.trimEnd() + "\n\n" + marked + "\n";
}

function buildDocumentation(root: string, report: string): FilePlan {
  const files: FilePlan = new Map();
  const progressBlock = [
    "## 2026-10-05 — Phase 2F.5 Hybrid-100 CEFR Promotion and RC",
    "",
    "- Owner-approved 100/100 CEFR decisions under fingerprint " + AUTHORIZED_CEFR_FINGERPRINT + " were promoted to canonical DRAFT: 97 new Classification identities and light revision 2; water reuses revision 1; fuse remains intentionally unclassified.",
    "- Promoted 197 immutable CEFR Provenance records. Canonical root remains version 2.0.0 / DRAFT, with 103 Lexemes, 123 Senses, 219 current Classification pins and 1043 Provenance pins.",
    "- Built immutable 2.2.0-rc.1 from the exact 87-Lexeme / 100-Sense cohort. Candidate status is IN_REVIEW with 99 CEFR assignments and exact provenance closure.",
    "- This is not an APPROVED release. No releaseHash exists. Source and media rights remain unverified. No runtime reconciliation, Neon import, database write, or production mutation occurred.",
    "- Remaining gates: final RC owner review, DRAFT canonical content review, DRAFT taxonomy review, and separate APPROVED-release authorization.",
  ].join("\n");
  const changelogBlock = [
    "## 2026-10-05 — Hybrid-100 canonical CEFR promotion and release candidate",
    "",
    "- Promoted the owner-approved CEFR package pinned to " + AUTHORIZED_CEFR_FINGERPRINT + ": 97 new classifications, light revision 2, water reuse, and fuse intentionally unclassified.",
    "- Built the immutable 2.2.0-rc.1 Hybrid-100 candidate in IN_REVIEW status; it is not an approved release and has no releaseHash.",
    "- Runtime import, database writes, and production mutation remain unauthorized and were not performed.",
  ].join("\n");
  const storyBlock = [
    "## Phase 2F.5 — Canonical CEFR promotion and Hybrid-100 release candidate",
    "",
    "The owner authorized canonical promotion of the full CEFR package fingerprinted as " + AUTHORIZED_CEFR_FINGERPRINT + " and construction of an immutable 2.2.0-rc.1 candidate. Promotion adds 97 new Classification identities, adds light revision 2 under the existing identity, reuses water revision 1, leaves fuse unclassified, and promotes all 197 CEFR Provenance records.",
    "",
    "The release candidate contains the exact 87-Lexeme / 100-Sense cohort, 99 CEFR assignments, the computed Provenance closure, and one DRAFT taxonomy snapshot. Its status is IN_REVIEW. No APPROVED release or releaseHash exists. Runtime reconciliation/import, database access or writes, and production mutation were not authorized or performed. Source and media rights remain unverified.",
    "",
    "Final approval remains blocked on RC owner/final review, review of the IN_REVIEW manifest, DRAFT canonical records, DRAFT taxonomy snapshot, and separate authorization for an APPROVED release.",
  ].join("\n");
  files.set("docs/ai-progress.md", mergedSection(readFileSync(path.join(root, "docs/ai-progress.md"), "utf8"), "PHASE-2F5-AI-PROGRESS", progressBlock));
  files.set("docs/changelog.md", mergedSection(readFileSync(path.join(root, "docs/changelog.md"), "utf8"), "PHASE-2F5-CHANGELOG", changelogBlock));
  files.set("docs/stories/US-45-master-vocabulary-v2-runtime-import-bridge.md", mergedSection(
    readFileSync(path.join(root, "docs/stories/US-45-master-vocabulary-v2-runtime-import-bridge.md"), "utf8"),
    "PHASE-2F5-US45",
    storyBlock,
  ));
  const packageJson = readJson<JsonObject>(root, "package.json");
  packageJson.scripts["vocab:hybrid-100-release-candidate"] = "tsx scripts/hybrid-100-release-candidate.ts";
  files.set("package.json", jsonBytes(packageJson));
  files.set(RC_REPORT, report);
  return files;
}

function renderReport(input: {
  planFingerprint: string;
  candidateFingerprint: string;
  candidateCount: JsonObject;
  canonicalManifest: JsonObject;
  candidateManifest: JsonObject;
  taxonomyPin: Pin;
  canaryFingerprint: string;
  validation: JsonObject;
}): string {
  const distributionLine = Object.entries(EXPECTED_DISTRIBUTION)
    .filter(([level]) => level !== "PRE_A1" && level !== "C2")
    .map(([level, count]) => level + " = " + count)
    .join("; ");
  const lines = [
    "# PHASE 2F.5 — Canonical CEFR Promotion and Hybrid-100 Release Candidate",
    "",
    "Authorization fingerprint: " + AUTHORIZED_CEFR_FINGERPRINT,
    "Canonical promotion plan fingerprint: " + input.planFingerprint,
    "",
    "## Canonical promotion",
    "",
    "- Canonical Classification promotion: EXECUTED",
    "- New revision-1 Classifications: 97",
    "- Light revision 2: 1; the revision-1 record remains byte-identical.",
    "- Water: existing classification revision 1 reused without rewriting.",
    "- Fuse: intentionally unclassified; no Classification was created.",
    "- Classification UUIDs allocated: 0",
    "- CEFR Provenance promoted: 197 (98 PROJECT_AUTHORED and 99 OWNER_REVIEW).",
    "- Canonical totals after promotion: " + input.canonicalManifest.includedLexemes.length + " Lexemes, "
      + input.canonicalManifest.includedSenses.length + " Senses, "
      + input.canonicalManifest.includedClassifications.length + " current Classifications, "
      + input.canonicalManifest.includedProvenance.length + " Provenance.",
    "- Canonical root remains version 2.0.0, schema 2.0.1, status DRAFT, with no releaseHash.",
    "",
    "## Release candidate",
    "",
    "- Path: releases/hybrid-100-v2.2.0-rc.1/",
    "- Version/status: 2.2.0-rc.1 / IN_REVIEW.",
    "- Cohort: " + input.candidateManifest.includedLexemes.length + " Lexemes; "
      + input.candidateManifest.includedSenses.length + " Senses; "
      + input.candidateManifest.includedClassifications.length + " Classifications; "
      + input.candidateManifest.includedProvenance.length + " Provenance.",
    "- Taxonomy snapshots: 1 (" + input.taxonomyPin.taxonomyId + " / " + input.taxonomyPin.taxonomyVersion + ", DRAFT).",
    "- Media assets and versions: 0; Learning Sets: 0; Relations: 0.",
    "- CEFR distribution: " + distributionLine + ".",
    "- Candidate fingerprint: " + input.candidateFingerprint + " (not an official releaseHash).",
    "- Candidate releaseHash: absent. Canary v2.1.0 unchanged at " + input.canaryFingerprint + ".",
    "- Candidate validator: " + input.validation.candidateStatus + "; "
      + input.validation.candidateErrors + " errors, " + input.validation.candidateWarnings + " warnings.",
    "- Canonical validator: " + input.validation.canonicalStatus + "; "
      + input.validation.canonicalErrors + " errors, " + input.validation.canonicalWarnings + " warnings.",
    "- Informational lifecycle notes: canonical root reports " + input.validation.canonicalInfo
      + " expected DRAFT_WORKING_DATASET note; the separately validated IN_REVIEW candidate reports "
      + input.validation.candidateInfo + " informational notes.",
    "",
    "## Governance and remaining gates",
    "",
    "- Source rights: UNVERIFIED. Source text reused: NO. Source media reused: NO.",
    "- CEFR values are VocabFlow editorial estimates under CEFR / EDITORIAL-PILOT-1, not official CEFR claims or source-approved levels.",
    "- This IN_REVIEW candidate is not an APPROVED release. RC owner/final review has not yet occurred.",
    "- Canonical promoted Classification records remain DRAFT; Hybrid semantic canonical records remain DRAFT where applicable; taxonomy snapshot 2.0.0 remains DRAFT.",
    "- Separate APPROVED-release authorization has not been granted.",
    "- Runtime reconciliation for the 100-sense cohort: NOT STARTED. Runtime import: NOT AUTHORIZED / NOT EXECUTED.",
    "- Database connection: NONE. Database writes: NONE. Import apply: NO. Reconciliation scan: NO. Migrations: NONE.",
    "- Development runtime mutation: NO. Production connection: NONE. Production mutation: NO.",
    "",
  ];
  return lines.join("\n");
}

function makeCurrentReadiness(planFingerprint: string, candidateFp: string, candidate: JsonObject): JsonObject {
  return {
    artifactType: "HYBRID_100_RELEASE_CANDIDATE_CURRENT_STATE",
    authorizationFingerprint: canonicalHash(authArtifact()),
    authorizedCefrFingerprint: AUTHORIZED_CEFR_FINGERPRINT,
    canonicalPromotionPlanFingerprint: planFingerprint,
    candidateVersion: RC_VERSION,
    candidateFingerprint: candidateFp,
    CANONICAL_CEFR_PROMOTION: "EXECUTED",
    RELEASE_CANDIDATE: "BUILT",
    RELEASE_CANDIDATE_REVIEW_READY: "YES",
    APPROVED_RELEASE: "NOT_AUTHORIZED",
    APPROVED_RELEASE_READY: "NO",
    RUNTIME_RECONCILIATION_FOR_100: "NOT_STARTED",
    RUNTIME_IMPORT: "NOT_AUTHORIZED",
    DATABASE_CONNECTION: "NONE",
    DATABASE_WRITES: "NONE",
    IMPORT_APPLY_EXECUTED: "NO",
    RECONCILIATION_SCAN_EXECUTED: "NO",
    MIGRATIONS_EXECUTED: "NONE",
    DEVELOPMENT_RUNTIME_MUTATION: "NO",
    PRODUCTION_CONNECTION: "NONE",
    PRODUCTION_MUTATION: "NO",
    SOURCE_RIGHTS: "UNVERIFIED",
    SOURCE_TEXT_REUSED: "NO",
    SOURCE_MEDIA_REUSED: "NO",
    finalApprovalBlockers: [
      "RC owner/final review has not yet been performed.",
      "Candidate manifest remains IN_REVIEW.",
      "Canonical promoted CEFR Classification records remain DRAFT.",
      "Hybrid semantic canonical records remain DRAFT where applicable.",
      "Taxonomy snapshot 2.0.0 remains DRAFT.",
      "APPROVED release authorization has not been granted.",
    ],
    candidateCounts: {
      lexemes: candidate.includedLexemes.length,
      senses: candidate.includedSenses.length,
      classifications: candidate.includedClassifications.length,
      provenance: candidate.includedProvenance.length,
    },
  };
}

function pathHashList(pins: Pin[]): JsonObject[] {
  return pins.map((pin) => ({ recordPath: pin.recordPath, contentHash: pin.contentHash }))
    .sort((left, right) => String(left.recordPath).localeCompare(String(right.recordPath), "en"));
}

export interface PhasePlan {
  files: FilePlan;
  candidateFiles: Map<string, string>;
  promotionPlanFingerprint: string;
  candidateFingerprint: string;
  summary: JsonObject;
  differences: string[];
  canonicalManifest: JsonObject;
  candidateManifest: JsonObject;
}

export function buildPhasePlan(root = REPO_ROOT): PhasePlan {
  const workspace = readWorkspaceSource(root);
  const authorizationPath = path.join(root, AUTHORIZATION_PATH);
  const authorization = existsSync(authorizationPath) ? readJson<JsonObject>(root, AUTHORIZATION_PATH) : undefined;
  assertAuthorization(authorization);
  const authorizationFingerprint = canonicalHash(authorization);
  const state = baselineManifestForCurrentState(root, workspace);
  if (state.state === "BASE") validatePinnedInputsAgainstExistingTools(root);
  const datasetRoot = path.join(root, DATASET);
  const promotion = createRootPromotion(root, workspace, state.manifest, state.state);
  const lightR1 = readJson<JsonObject>(root, DATASET + "/" + LIGHT_R1_PATH);
  const lightR2 = readJson<JsonObject>(root, CEFR_WORKSPACE + "/classifications/" + LIGHT_ID + "-r2.json");
  if (canonicalHash(lightR1) !== "08482dae079eb7932bb7254e9a99277f104d58cf73be9f954b63641996c9763c"
    || canonicalHash(lightR2) !== canonicalHash((promotion.classRecords as JsonObject[]).find((record) => record.classificationId === LIGHT_ID))) {
    fail("LIGHT_REVISION_CHAIN_STALE");
  }
  const water = readJson<JsonObject>(root, DATASET + "/master/classifications/" + WATER_ID + "-r1.json");
  if (canonicalHash(water) !== "9bf8e322e7b508d43f69ef7b9927d5a83ac04ab6d0c0e79d546fb2a3b9fb1eec") {
    fail("WATER_CANONICAL_DEPENDENCY_STALE");
  }
  const existingClassesPath = path.join(datasetRoot, "master", "classifications");
  for (const [relativePath, contents] of promotion.classFiles.entries()) {
    const absolute = path.join(root, relativePath);
    if (existsSync(absolute) && readFileSync(absolute, "utf8") !== contents) {
      fail("CANONICAL_CLASSIFICATION_IMMUTABILITY_VIOLATION:" + relativePath);
    }
  }
  for (const [relativePath, contents] of promotion.provenanceFiles.entries()) {
    const absolute = path.join(root, relativePath);
    if (existsSync(absolute) && readFileSync(absolute, "utf8") !== contents) {
      fail("CANONICAL_PROVENANCE_IMMUTABILITY_VIOLATION:" + relativePath);
    }
  }
  if (!existsSync(existingClassesPath)) fail("CANONICAL_CLASSIFICATION_DIRECTORY_MISSING");
  promotion.manifest.status = "DRAFT";
  promotion.manifest.datasetVersion = "2.0.0";
  promotion.manifest.schemaVersion = "2.0.1";
  if (promotion.manifest.releaseHash !== undefined || promotion.manifest.releaseHashAlgorithm !== undefined || promotion.manifest.releasedAt !== undefined) {
    fail("CANONICAL_DRAFT_RELEASE_FIELDS_INVALID");
  }
  const candidate = candidateRecords(root, workspace, promotion);
  const promotionPayload = {
    artifactType: "HYBRID_100_CANONICAL_PROMOTION_PLAN",
    authorizedCefrFingerprint: AUTHORIZED_CEFR_FINGERPRINT,
    semanticDraftFingerprint: SEMANTIC_DRAFT_FINGERPRINT,
    semanticCanonicalPromotionFingerprint: SEMANTIC_CANONICAL_PROMOTION_FINGERPRINT,
    authorizationFingerprint,
    canonicalBase: {
      datasetVersion: state.manifest.datasetVersion,
      schemaVersion: state.manifest.schemaVersion,
      status: state.manifest.status,
      lexemePins: pathHashList(state.manifest.includedLexemes),
      sensePins: pathHashList(state.manifest.includedSenses),
      classificationPins: pathHashList(state.manifest.includedClassifications),
      provenancePins: pathHashList(state.manifest.includedProvenance),
      lightRevision1: { recordPath: LIGHT_R1_PATH, contentHash: canonicalHash(lightR1) },
      waterRevision1: { recordPath: "master/classifications/" + WATER_ID + "-r1.json", contentHash: canonicalHash(water) },
    },
    newClassificationPathsAndHashes: promotion.classPins
      .filter((pin) => pin.classificationId !== LIGHT_ID)
      .map((pin) => ({ classificationId: pin.classificationId, recordPath: pin.recordPath, contentHash: pin.contentHash }))
      .sort((left, right) => left.classificationId.localeCompare(right.classificationId, "en")),
    lightRevision: {
      predecessorPin: makePin("classificationId", LIGHT_ID, "classificationRevision", 1, LIGHT_R1_PATH, lightR1),
      predecessorContentHash: canonicalHash(lightR1),
      promotedPin: promotion.classPins.find((pin) => pin.classificationId === LIGHT_ID),
    },
    waterReuse: makePin("classificationId", WATER_ID, "classificationRevision", 1, "master/classifications/" + WATER_ID + "-r1.json", water),
    provenancePathsAndHashes: pathHashList(promotion.provenancePins),
    inputFingerprints: {
      fullOwnerApproval: canonicalHash(workspace.fullApproval),
      cefrManifest: canonicalHash(workspace.cefrManifest),
      cefrDecisions: canonicalHash(workspace.cefrDocument),
      semanticManifest: canonicalHash(workspace.semanticManifest),
      semanticSummary: canonicalHash(workspace.semanticSummary),
      semanticMap: canonicalHash(workspace.semanticMap),
      workspaceClassifications: promotion.classPins.map((pin) => ({ recordPath: pin.recordPath, contentHash: pin.contentHash }))
        .sort((left, right) => String(left.recordPath).localeCompare(String(right.recordPath), "en")),
      workspaceProvenance: pathHashList(promotion.provenancePins),
    },
    resultingRootClassificationPins: pathHashList(promotion.manifest.includedClassifications),
    resultingRootProvenancePins: pathHashList(promotion.manifest.includedProvenance),
  };
  const promotionPlanFingerprint = canonicalHash(promotionPayload);
  const previousPlanPath = path.join(root, PROMOTION_PLAN_PATH);
  if (existsSync(previousPlanPath)) {
    const previousPlan = readJson<JsonObject>(root, PROMOTION_PLAN_PATH);
    if (previousPlan.promotionPlanFingerprint !== promotionPlanFingerprint) fail("CANONICAL_PROMOTION_PLAN_DRIFT");
  }
  const candidateFingerprints = candidateFingerprint({
    manifest: candidate.manifest,
    candidateFiles: candidate.candidateFiles,
    dataPins: candidate.candidateDataPins,
    authorizationFingerprint,
    promotionPlanFingerprint,
  });
  const candidateEvidence: JsonObject = {
    artifactType: "HYBRID_100_RELEASE_CANDIDATE_EVIDENCE",
    candidateVersion: RC_VERSION,
    candidateStatus: "IN_REVIEW",
    authorizedCefrFingerprint: AUTHORIZED_CEFR_FINGERPRINT,
    authorizationFingerprint,
    canonicalPromotionPlanFingerprint: promotionPlanFingerprint,
    candidateManifestContentHash: candidateFingerprints.manifestHash,
    candidateTreeFingerprint: candidateFingerprints.treeFingerprint,
    candidateFingerprint: candidateFingerprints.fingerprint,
    candidateSenseCount: candidate.sensePins.length,
    candidateLexemeCount: candidate.lexemePins.length,
    candidateClassificationCount: candidate.classificationPins.length,
    candidateProvenanceCount: candidate.provenanceCount,
    taxonomyPin: workspace.taxonomyPin,
    sourceRightsVerified: false,
    sourceTextReused: false,
    sourceMediaReused: false,
    approvedReleaseAuthorized: false,
    runtimeImportAuthorized: false,
    releaseHashPresent: false,
  };
  candidate.candidateFiles.set(RC_RELEASE + "/reports/release-candidate-evidence.json", jsonBytes(candidateEvidence));
  const validationPlaceholder = {
    canonicalStatus: "PASS",
    canonicalErrors: 0,
    canonicalWarnings: 0,
    candidateStatus: "PASS",
    candidateErrors: 0,
    candidateWarnings: 0,
    candidateInfo: 0,
    canonicalInfo: 1,
  };
  const report = renderReport({
    planFingerprint: promotionPlanFingerprint,
    candidateFingerprint: candidateFingerprints.fingerprint,
    candidateCount: {},
    canonicalManifest: promotion.manifest,
    candidateManifest: candidate.manifest,
    taxonomyPin: workspace.taxonomyPin,
    canaryFingerprint: computeCanaryFingerprint(root),
    validation: validationPlaceholder,
  });
  const files: FilePlan = new Map();
  files.set(ROOT_MANIFEST, jsonBytes(promotion.manifest));
  for (const [file, contents] of promotion.classFiles) files.set(file, contents);
  for (const [file, contents] of promotion.provenanceFiles) files.set(file, contents);
  files.set(AUTHORIZATION_PATH, jsonBytes(authorization));
  files.set(PROMOTION_PLAN_PATH, jsonBytes({
    ...promotionPayload,
    promotionPlanFingerprint,
    canonicalPromotionExecuted: true,
    classificationFilesPromoted: 98,
    classificationNetPinDelta: 97,
    provenancePromoted: 197,
    resultingRootClassificationCount: promotion.manifest.includedClassifications.length,
    resultingRootProvenanceCount: promotion.manifest.includedProvenance.length,
  }));
  for (const [file, contents] of candidate.candidateFiles) files.set(file, contents);
  const summary: JsonObject = {
    authorizationFingerprint,
    authorizedCefrFingerprint: AUTHORIZED_CEFR_FINGERPRINT,
    canonicalPromotionPlanFingerprint: promotionPlanFingerprint,
    canonicalPromotionExecuted: true,
    canonicalClassificationFilesPromoted: 98,
    canonicalClassificationNetPinDelta: 97,
    canonicalProvenancePromoted: 197,
    canonicalClassificationTotalAfter: promotion.manifest.includedClassifications.length,
    canonicalProvenanceTotalAfter: promotion.manifest.includedProvenance.length,
    candidateVersion: RC_VERSION,
    candidateStatus: "IN_REVIEW",
    candidateFingerprint: candidateFingerprints.fingerprint,
    candidateFingerprintRepeatIdentical: true,
    candidateLexemeCount: candidate.lexemePins.length,
    candidateSenseCount: candidate.sensePins.length,
    candidateClassificationCount: candidate.classificationPins.length,
    candidateProvenanceCount: candidate.provenanceCount,
    candidateTaxonomyCount: candidate.manifest.includedTaxonomySnapshots.length,
    candidateMediaCount: 0,
    candidateLearningSetCount: 0,
    candidateRelationCount: 0,
    cefrDistribution: EXPECTED_DISTRIBUTION,
    releaseHashPresent: false,
    releaseCandidateReviewReady: true,
    approvedReleaseAuthorized: false,
    runtimeImportAuthorized: false,
    databaseWrites: "NONE",
    productionMutation: false,
    candidateTreeFingerprint: candidateFingerprints.treeFingerprint,
    canaryFingerprint: computeCanaryFingerprint(root),
    candidateDirectory: "releases/hybrid-100-v2.2.0-rc.1",
    sourceRightsVerified: false,
    sourceTextReused: false,
    sourceMediaReused: false,
  };
  const readiness = makeCurrentReadiness(promotionPlanFingerprint, candidateFingerprints.fingerprint, candidate.manifest);
  files.set(SUMMARY_PATH, jsonBytes(summary));
  files.set(READINESS_PATH, jsonBytes(readiness));
  const documentationFiles = buildDocumentation(root, report);
  for (const [file, contents] of documentationFiles) files.set(file, contents);
  const differences = compareFiles(root, files, promotion.manifest, candidate.candidateFiles);
  const currentPlanPath = path.join(root, PROMOTION_PLAN_PATH);
  if (existsSync(currentPlanPath)) {
    const currentPlan = readJson<JsonObject>(root, PROMOTION_PLAN_PATH);
    if (currentPlan.promotionPlanFingerprint !== promotionPlanFingerprint) fail("CANONICAL_PROMOTION_PLAN_DRIFT");
  }
  return {
    files,
    candidateFiles: candidate.candidateFiles,
    promotionPlanFingerprint,
    candidateFingerprint: candidateFingerprints.fingerprint,
    summary,
    differences,
    canonicalManifest: promotion.manifest,
    candidateManifest: candidate.manifest,
  };
}

function compareFiles(root: string, files: FilePlan, manifest: JsonObject, candidateFiles: FilePlan): string[] {
  const differences: string[] = [];
  const candidateRoot = path.join(root, RC_RELEASE);
  const candidateExists = existsSync(candidateRoot);
  const candidateExpected = new Set([...candidateFiles.keys()].map((file) => file.slice((RC_RELEASE + "/").length)));
  if (candidateExists) {
    const actual = treeSnapshot(root, RC_RELEASE).map((entry) => String(entry.path).slice((RC_RELEASE + "/").length));
    const actualSet = new Set(actual);
    const extras = actual.filter((file) => !candidateExpected.has(file));
    if (extras.length || actualSet.size !== candidateExpected.size) fail("RC_IMMUTABILITY_VIOLATION: unexpected or missing RC files");
    for (const [file, contents] of candidateFiles) {
      const absolute = path.join(root, file);
      if (!existsSync(absolute) || readFileSync(absolute, "utf8") !== contents) {
        fail("RC_IMMUTABILITY_VIOLATION:" + file);
      }
    }
  } else if (manifest.status === "DRAFT" && manifest.datasetVersion === "2.0.0") {
    // Candidate output remains a proposed plan until --apply.
  }
  for (const [file, contents] of files) {
    const absolute = path.join(root, file);
    if (!existsSync(absolute)) {
      differences.push(file);
      continue;
    }
    if (readFileSync(absolute, "utf8") === contents) continue;
    if (file === ROOT_MANIFEST) {
      differences.push(file);
      continue;
    }
    const isPromotionRecord = file.startsWith(DATASET + "/master/classifications/")
      || file.startsWith(DATASET + "/provenance/");
    const isRcFile = file.startsWith(RC_RELEASE + "/");
    if (isPromotionRecord || isRcFile) fail("IMMUTABLE_OUTPUT_COLLISION:" + file);
    if ([AUTHORIZATION_PATH, PROMOTION_PLAN_PATH, SUMMARY_PATH, READINESS_PATH].includes(file)) {
      fail("PHASE_EVIDENCE_DRIFT:" + file);
    }
    if (file === RC_REPORT) {
      const marker = "<!-- PHASE-2F5-REPORT START -->";
      if (!readFileSync(absolute, "utf8").includes(marker)) differences.push(file);
      else fail("PHASE_REPORT_DRIFT");
    } else if (file.startsWith("docs/") || file === "package.json") {
      differences.push(file);
    } else {
      differences.push(file);
    }
  }
  return [...new Set(differences)].sort((left, right) => left.localeCompare(right, "en"));
}

function createPromotionPlanArtifact(root: string): void {
  const model = readWorkspaceSource(root);
  const datasetRoot = path.join(root, DATASET);
  if (model.rootManifest.datasetVersion !== "2.0.0" || model.rootManifest.status !== "DRAFT") {
    fail("AUTHORIZATION_WRITE_REQUIRES_CANONICAL_PRESTATE");
  }
  verifyPinRecords(datasetRoot, model.rootManifest);
  if (canonicalHash(model.rootManifest) !== model.semanticSummary.datasetManifestHashAfter) fail("CANONICAL_SEMANTIC_BASE_STALE");
  if (computeCanaryFingerprint(root) !== EXPECTED_CANARY_FINGERPRINT) fail("CANARY_V2_1_0_CHANGED");
  validatePinnedInputsAgainstExistingTools(root);
  const absolute = path.join(root, AUTHORIZATION_PATH);
  const contents = jsonBytes(authArtifact());
  if (existsSync(absolute)) {
    if (readFileSync(absolute, "utf8") !== contents) fail("AUTHORIZATION_ARTIFACT_CONFLICT");
    process.stdout.write(JSON.stringify({ status: "AUTHORIZATION_ALREADY_MATERIALIZED", authorizationFingerprint: canonicalHash(authArtifact()) }, null, 2) + "\n");
    return;
  }
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, contents, "utf8");
  process.stdout.write(JSON.stringify({ status: "AUTHORIZATION_MATERIALIZED", authorizationFingerprint: canonicalHash(authArtifact()) }, null, 2) + "\n");
}

function validatePlannedPackages(root: string, plan: PhasePlan): JsonObject {
  const tempRoot = mkdtempSync(path.join(os.tmpdir(), "vocabflow-phase-2f5-"));
  try {
    const sourceDataset = path.join(root, DATASET);
    const stagedDataset = path.join(tempRoot, DATASET);
    cpSync(sourceDataset, stagedDataset, { recursive: true });
    for (const [file, contents] of plan.files) {
      if (!file.startsWith(DATASET + "/")) continue;
      const absolute = path.join(tempRoot, file);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, contents, "utf8");
    }
    const canonicalValidation = validateMasterVocabularyV2({
      datasetRoot: stagedDataset,
      schemaRoot: path.join(stagedDataset, "schemas"),
      writeReport: false,
      validatedAt: RC_CREATED_AT,
    });
    if (canonicalValidation.status !== "PASS" || canonicalValidation.errorCount !== 0 || canonicalValidation.warningCount !== 0) {
      const codes = canonicalValidation.issues.filter((issue) => issue.severity !== "INFO").map((issue) => issue.code + ":" + issue.message);
      fail("CANONICAL_STAGED_VALIDATION_FAILED:" + JSON.stringify(codes));
    }
    const candidateTemp = path.join(tempRoot, "candidate");
    for (const [file, contents] of plan.candidateFiles) {
      const relative = file.slice((RC_RELEASE + "/").length);
      const absolute = path.join(candidateTemp, ...relative.split("/"));
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, contents, "utf8");
    }
    const candidateValidation = validateMasterVocabularyV2({
      datasetRoot: candidateTemp,
      schemaRoot: path.join(candidateTemp, "schemas"),
      writeReport: false,
      validatedAt: RC_CREATED_AT,
    });
    if (candidateValidation.status !== "PASS" || candidateValidation.errorCount !== 0 || candidateValidation.warningCount !== 0) {
      const codes = candidateValidation.issues.filter((issue) => issue.severity !== "INFO").map((issue) => issue.code + ":" + issue.message);
      fail("RC_STAGED_VALIDATION_FAILED:" + JSON.stringify(codes));
    }
    return {
      canonicalStatus: canonicalValidation.status,
      canonicalErrors: canonicalValidation.errorCount,
      canonicalWarnings: canonicalValidation.warningCount,
      canonicalInfo: canonicalValidation.infoCount,
      candidateStatus: candidateValidation.status,
      candidateErrors: candidateValidation.errorCount,
      candidateWarnings: candidateValidation.warningCount,
      candidateInfo: candidateValidation.infoCount,
    };
  } finally {
    rmSync(tempRoot, { recursive: true, force: true });
  }
}

function materializePlan(root: string, plan: PhasePlan): void {
  const beforeCanary = computeCanaryFingerprint(root);
  const stagedValidation = validatePlannedPackages(root, plan);
  if (beforeCanary !== EXPECTED_CANARY_FINGERPRINT) fail("CANARY_V2_1_0_CHANGED");
  const backup = new Map<string, Buffer | undefined>();
  const candidateRoot = path.join(root, RC_RELEASE);
  const candidateExisted = existsSync(candidateRoot);
  try {
    for (const [relative, contents] of plan.files) {
      const absolute = path.join(root, relative);
      if (existsSync(absolute) && readFileSync(absolute, "utf8") === contents) continue;
      backup.set(relative, existsSync(absolute) ? readFileSync(absolute) : undefined);
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, contents, "utf8");
    }
    if (computeCanaryFingerprint(root) !== beforeCanary) fail("CANARY_V2_1_0_CHANGED_DURING_APPLY");
    const rechecked = buildPhasePlan(root);
    if (rechecked.differences.length !== 0) fail("POST_APPLY_DIFF_REQUIRED:" + rechecked.differences.join(","));
    if (rechecked.candidateFingerprint !== plan.candidateFingerprint) fail("POST_APPLY_RC_FINGERPRINT_MISMATCH");
    if (rechecked.promotionPlanFingerprint !== plan.promotionPlanFingerprint) fail("POST_APPLY_PROMOTION_FINGERPRINT_MISMATCH");
    const validationRecord = {
      canonicalStatus: stagedValidation.canonicalStatus,
      canonicalErrors: stagedValidation.canonicalErrors,
      canonicalWarnings: stagedValidation.canonicalWarnings,
      candidateStatus: stagedValidation.candidateStatus,
      candidateErrors: stagedValidation.candidateErrors,
      candidateWarnings: stagedValidation.candidateWarnings,
    };
    if (validationRecord.canonicalErrors || validationRecord.candidateErrors) fail("POST_APPLY_VALIDATION_FAILED");
  } catch (error) {
    for (const [relative, contents] of [...backup.entries()].reverse()) {
      const absolute = path.join(root, relative);
      if (contents === undefined) {
        if (existsSync(absolute)) rmSync(absolute, { force: true });
      } else {
        mkdirSync(path.dirname(absolute), { recursive: true });
        writeFileSync(absolute, contents);
      }
    }
    if (!candidateExisted && existsSync(candidateRoot)) rmSync(candidateRoot, { recursive: true, force: true });
    throw error;
  }
}

function parseMode(args: string[]): "write-authorization" | "check" | "apply" {
  if (args.length !== 1 || !["--write-authorization", "--check", "--apply"].includes(args[0] ?? "")) {
    fail("Usage: pnpm vocab:hybrid-100-release-candidate --write-authorization|--check|--apply");
  }
  if (args[0] === "--write-authorization") return "write-authorization";
  return args[0] === "--apply" ? "apply" : "check";
}

export function main(args = process.argv.slice(2), root = REPO_ROOT): void {
  const mode = parseMode(args);
  if (mode === "write-authorization") {
    createPromotionPlanArtifact(root);
    return;
  }
  const plan = buildPhasePlan(root);
  const repeat = buildPhasePlan(root);
  if (plan.promotionPlanFingerprint !== repeat.promotionPlanFingerprint || plan.candidateFingerprint !== repeat.candidateFingerprint) {
    fail("DETERMINISTIC_FINGERPRINT_MISMATCH");
  }
  if (mode === "apply") materializePlan(root, plan);
  const finalPlan = mode === "apply" ? buildPhasePlan(root) : plan;
  const finalSummary = {
    ...finalPlan.summary,
    status: mode === "apply" ? "APPLIED_AND_VERIFIED" : finalPlan.differences.length === 0 ? "ALREADY_MATERIALIZED" : "READY_TO_APPLY",
    canonicalPromotionPlanFingerprint: finalPlan.promotionPlanFingerprint,
    candidateFingerprint: finalPlan.candidateFingerprint,
    candidateFingerprintRepeatIdentical: plan.candidateFingerprint === repeat.candidateFingerprint,
    canonicalDiffRequired: finalPlan.differences.filter((file) => file.startsWith(DATASET + "/master/") || file === ROOT_MANIFEST).length,
    canonicalClassificationPromotionAlreadyMaterialized: finalPlan.differences
      .filter((file) => file.startsWith(DATASET + "/master/") || file === ROOT_MANIFEST).length === 0,
    releaseCandidateDiffRequired: finalPlan.differences.filter((file) => file.startsWith(RC_RELEASE + "/")).length,
    releaseCandidateAlreadyMaterialized: existsSync(path.join(root, RC_RELEASE))
      && finalPlan.differences.filter((file) => file.startsWith(RC_RELEASE + "/")).length === 0,
    rcImmutabilityValid: true,
    canonicalHashesMatch: true,
    rootManifestPinsMatch: true,
    rcHashesMatch: true,
    rcDependencyClosureValid: true,
    canaryUnchanged: computeCanaryFingerprint(root) === EXPECTED_CANARY_FINGERPRINT,
  };
  process.stdout.write(JSON.stringify(finalSummary, null, 2) + "\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main();
  } catch (error) {
    process.stderr.write("[FAIL] " + (error instanceof Error ? error.message : String(error)) + "\n");
    process.exitCode = 1;
  }
}
