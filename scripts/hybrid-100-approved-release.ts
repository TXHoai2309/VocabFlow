import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import canonicalize from "canonicalize";
import { assertCanaryRepositoryState } from "./hybrid-100-canary-integrity";
import { buildFinalAudit, taxonomySemanticProjection } from "./hybrid-100-rc-final-audit";
import { canonicalHash, sha256 } from "./hybrid-100-release-candidate";
import { validateMasterVocabularyV2, type ValidationReport } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type EntityKind = "LEXEME" | "SENSE" | "CLASSIFICATION";
type FilePlan = Map<string, string>;

export const EXPECTED_BASE = "e29ffc7cfa09c2906b6a0604f670f1c8333df1e4";
export const EXPECTED_RC_FINGERPRINT = "06b2a4dec2f54438416cae67788e0683fe94907cbce0a60fbb2d6469bc25b82c";
export const EXPECTED_RC_TREE = "9d021e151d934a61c577289a4aff3ded8883858bac672e1c27ac546a335966a7";
export const EXPECTED_TAXONOMY_POLICY = "9596e407a8448a0aa4b6edb1944154ca4754ac396596501c06b9272318c2779b";
export const EXPECTED_MANIFEST_PLAN = "b004c752ea52bdfd732d3c5d44284829b7f9f3070b8c193aa23fca96a4e5f97b";
export const EXPECTED_CEFR = "d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622";
export const EXPECTED_CANARY_TREE = "f5d4e502be5106da191b5b2ab807f5db12065831";
export const EXPECTED_CANARY_FINGERPRINT = "718c211b8e668d25ffe4ba0c893bda3e73ce8bd2bf578d276ce9216c08c78b2f";
export const EXPECTED_LAST_CANARY_COMMIT = "7ce73b7c8e0d2f14e4d7c34366bf6cd08544f847";
export const RELEASE_RELATIVE = "vocabflow-dataset/releases/hybrid-100-v2.2.0";
export const WORKSPACE_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-approved-release";
export const APPROVAL_PLAN_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-rc-final-review/approval-revision-plan.json";
export const FINAL_MANIFEST_PLAN_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-rc-final-review/final-release-manifest-plan.json";
export const TAXONOMY_20_PATH = "vocabflow-dataset/taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.0.json";
export const TAXONOMY_201_PATH = "vocabflow-dataset/taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.1.json";
export const RELEASE_CREATED_AT = "2026-10-06T00:00:00Z";
export const RELEASE_HASH_ALGORITHM = "sha256-canonical-json-v1";
export const EXPECTED_COUNTS = { lexemes: 87, senses: 100, classifications: 99, total: 286 };
export const TAXONOMY_ID = "01a0fc13-09e9-72dd-b49d-ffef077385dd";
export const LIGHT_CLASSIFICATION_ID = "01a0fc13-09f1-76b9-8a57-6c6e55e9b438";
export const WATER_CLASSIFICATION_ID = "01a0fc13-09f2-77bf-93db-1ceefb68082a";
export const FUSE_SENSE_ID = "01a1070c-7c59-726e-88d6-cf9dc05adb73";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET = "vocabflow-dataset";
const RC_RELATIVE = `${DATASET}/releases/hybrid-100-v2.2.0-rc.1`;
const TAXONOMY_20_HASH = "67ecd13e49e756df6fce2def9f40fe11eb8831ef9a68097299d37324ac588b79";
const SCHEMA_FILES = [
  "common.schema.json", "dataset.schema.json", "lexeme.schema.json", "sense.schema.json",
  "taxonomy.schema.json", "learning-set.schema.json", "media-asset.schema.json", "provenance.schema.json",
];
const WORKSPACE_OUTPUTS = [
  `${WORKSPACE_RELATIVE}/authorization.json`,
  `${WORKSPACE_RELATIVE}/materialization-plan.json`,
  `${WORKSPACE_RELATIVE}/summary.json`,
  `${WORKSPACE_RELATIVE}/validation-summary.json`,
];
const REPORT_RELATIVE = `${DATASET}/reports/hybrid-100-approved-release-2.2.0.md`;
const CEFR_DISTRIBUTION = { PRE_A1: 0, A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, C2: 0, UNCLASSIFIED: 1 };

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function readJson<T>(root: string, relative: string): T {
  return JSON.parse(readFileSync(path.join(root, relative), "utf8")) as T;
}

function gitText(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }).trim();
}

function without(value: JsonObject, fields: string[]): JsonObject {
  const result = structuredClone(value) as JsonObject;
  for (const field of fields) delete result[field];
  return result;
}

function pinFields(kind: EntityKind): { collection: string; id: string; revision: string; folder: string } {
  if (kind === "LEXEME") return { collection: "includedLexemes", id: "masterLexemeId", revision: "lexemeRevision", folder: "lexemes" };
  if (kind === "SENSE") return { collection: "includedSenses", id: "masterSenseId", revision: "senseRevision", folder: "senses" };
  return { collection: "includedClassifications", id: "classificationId", revision: "classificationRevision", folder: "classifications" };
}

function countPins(manifest: JsonObject): JsonObject {
  return {
    lexemes: manifest.includedLexemes?.length ?? 0,
    senses: manifest.includedSenses?.length ?? 0,
    classifications: manifest.includedClassifications?.length ?? 0,
    provenance: manifest.includedProvenance?.length ?? 0,
    taxonomySnapshots: manifest.includedTaxonomySnapshots?.length ?? 0,
    media: (manifest.includedMediaAssets?.length ?? 0) + (manifest.includedMediaAssetVersions?.length ?? 0),
    learningSets: manifest.includedLearningSets?.length ?? 0,
    relations: manifest.includedRelations?.length ?? 0,
  };
}

function canonicalCounts(manifest: JsonObject): JsonObject {
  const counts = countPins(manifest);
  return {
    lexemes: counts.lexemes,
    senses: counts.senses,
    classifications: counts.classifications,
    provenance: counts.provenance,
    taxonomySnapshots: counts.taxonomySnapshots,
  };
}

function directoryFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const result: string[] = [];
  const visit = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, "en"))) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) result.push(child);
    }
  };
  visit(directory);
  return result.sort((a, b) => a.localeCompare(b, "en"));
}

function packageTreeFingerprint(packageRoot: string, excludeEvidence = true): string {
  const entries = directoryFiles(packageRoot)
    .filter((file) => {
      if (!excludeEvidence) return true;
      const relative = path.relative(packageRoot, file).split(path.sep).join("/");
      return relative !== "reports/release-approval-evidence.json" && relative !== "reports/release-candidate-evidence.json";
    })
    .map((file) => ({
      path: path.relative(packageRoot, file).split(path.sep).join("/"),
      sha256: sha256(readFileSync(file)),
    }))
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
  return canonicalHash(entries);
}

function rcFingerprintAndTree(root: string): { fingerprint: string; treeFingerprint: string } {
  const packageRoot = path.join(root, RC_RELATIVE);
  const manifest = readJson<JsonObject>(packageRoot, "dataset.json");
  const pins: JsonObject[] = [];
  for (const field of ["includedLexemes", "includedSenses", "includedClassifications", "includedTaxonomySnapshots", "includedProvenance"]) {
    for (const pin of manifest[field] as JsonObject[]) pins.push({ recordPath: pin.recordPath, contentHash: pin.contentHash });
  }
  pins.sort((a, b) => String(a.recordPath).localeCompare(String(b.recordPath), "en"));
  const schemaHashes = SCHEMA_FILES.map((file) => ({
    path: `schemas/${file}`,
    sha256: sha256(readFileSync(path.join(packageRoot, "schemas", file))),
  }));
  const auth = readJson<JsonObject>(root, `${DATASET}/workspaces/hybrid-100-release-candidate/authorization.json`);
  const rcSummary = readJson<JsonObject>(root, `${DATASET}/workspaces/hybrid-100-release-candidate/summary.json`);
  const taxonomyPin = (manifest.includedTaxonomySnapshots as JsonObject[])[0];
  const fingerprint = canonicalHash({
    artifactType: "RELEASE_CANDIDATE_FINGERPRINT",
    candidateManifest: manifest,
    candidateDataPins: pins,
    schemaHashes,
    taxonomyHash: taxonomyPin.contentHash,
    authorizationFingerprint: canonicalHash(auth),
    canonicalPromotionPlanFingerprint: rcSummary.canonicalPromotionPlanFingerprint,
  });
  return { fingerprint, treeFingerprint: packageTreeFingerprint(packageRoot, true) };
}

export function assertPinnedInputs(input: {
  head: string;
  remoteHead: string;
  rcFingerprint: string;
  rcTreeFingerprint: string;
  taxonomyPolicyFingerprint: string;
  finalManifestPlanFingerprint: string;
  authorizedCefrFingerprint: string;
  canaryTree: string;
  canaryCommittedFingerprint: string;
  lastCanaryCommit: string;
}): void {
  if (input.head !== EXPECTED_BASE || input.remoteHead !== EXPECTED_BASE) fail("BASELINE_MISMATCH", `${input.head}/${input.remoteHead}`);
  if (input.rcFingerprint !== EXPECTED_RC_FINGERPRINT) fail("RC_FINGERPRINT_MISMATCH", input.rcFingerprint);
  if (input.rcTreeFingerprint !== EXPECTED_RC_TREE) fail("RC_TREE_FINGERPRINT_MISMATCH", input.rcTreeFingerprint);
  if (input.taxonomyPolicyFingerprint !== EXPECTED_TAXONOMY_POLICY) fail("TAXONOMY_POLICY_FINGERPRINT_MISMATCH", input.taxonomyPolicyFingerprint);
  if (input.finalManifestPlanFingerprint !== EXPECTED_MANIFEST_PLAN) fail("FINAL_MANIFEST_PLAN_FINGERPRINT_MISMATCH", input.finalManifestPlanFingerprint);
  if (input.authorizedCefrFingerprint !== EXPECTED_CEFR) fail("AUTHORIZED_CEFR_FINGERPRINT_MISMATCH", input.authorizedCefrFingerprint);
  if (input.canaryTree !== EXPECTED_CANARY_TREE) fail("CANARY_TREE_MISMATCH", input.canaryTree);
  if (input.canaryCommittedFingerprint !== EXPECTED_CANARY_FINGERPRINT) fail("CANARY_CONTENT_FINGERPRINT_MISMATCH", input.canaryCommittedFingerprint);
  if (input.lastCanaryCommit !== EXPECTED_LAST_CANARY_COMMIT) fail("CANARY_LAST_COMMIT_MISMATCH", input.lastCanaryCommit);
}

interface FreshPlan {
  audit: JsonObject;
  rootManifest: JsonObject;
  rcManifest: JsonObject;
  finalManifestPlan: JsonObject;
  approvalRevisionPlan: JsonObject;
  taxonomy20: JsonObject;
  taxonomy201: JsonObject;
  revisions: Array<{ kind: EntityKind; pin: JsonObject; record: JsonObject; currentRecord: JsonObject; currentRecordPath: string }>;
  provenancePins: JsonObject[];
  rootUpdated: JsonObject;
  taxonomyHash: string;
  taxonomySemanticDiff: number;
  rcState: { fingerprint: string; treeFingerprint: string };
  outputPaths: string[];
}

export function buildApprovedReleasePlan(root = ROOT): FreshPlan {
  const head = gitText(root, ["rev-parse", "HEAD"]);
  const remoteHead = gitText(root, ["rev-parse", "origin/TXH"]);
  if (head !== EXPECTED_BASE || remoteHead !== EXPECTED_BASE) fail("BASELINE_MISMATCH", `${head}/${remoteHead}`);
  for (const requiredAncestor of ["7d8fd96ba8f6cc87cc9acdfb16941c3c175c21b8", "7ce73b7c8e0d2f14e4d7c34366bf6cd08544f847"]) {
    try {
      execFileSync("git", ["merge-base", "--is-ancestor", requiredAncestor, "HEAD"], { cwd: root, stdio: "ignore", windowsHide: true });
    } catch {
      fail("REQUIRED_ANCESTRY_MISSING", requiredAncestor);
    }
  }

  const auditPlan = buildFinalAudit(root);
  const audit = auditPlan.audit as JsonObject;
  const policyFingerprint = String(auditPlan.taxonomyPolicyDecisionArtifact.policyFingerprint);
  const manifestPlanPath = `${DATASET}/workspaces/hybrid-100-rc-final-review/final-release-manifest-plan.json`;
  const finalManifestPlan = readJson<JsonObject>(root, manifestPlanPath);
  const fingerprintableManifestPlan = without(finalManifestPlan, ["taxonomyPolicyFingerprint"]);
  const finalManifestPlanFingerprint = canonicalHash(fingerprintableManifestPlan);
  const cefrFingerprint = String(audit.inputFingerprints.authorizedCefrFingerprint);
  const rcState = rcFingerprintAndTree(root);
  const canary = assertCanaryRepositoryState(root);
  assertPinnedInputs({
    head,
    remoteHead,
    rcFingerprint: rcState.fingerprint,
    rcTreeFingerprint: rcState.treeFingerprint,
    taxonomyPolicyFingerprint: policyFingerprint,
    finalManifestPlanFingerprint,
    authorizedCefrFingerprint: cefrFingerprint,
    canaryTree: canary.headCanaryGitTreeSha,
    canaryCommittedFingerprint: canary.canaryCommittedTreeFingerprint,
    lastCanaryCommit: canary.lastCanaryCommit,
  });
  if (!canary.canaryWorkingTreeClean || canary.remoteCanaryGitTreeSha !== EXPECTED_CANARY_TREE) fail("CANARY_WORKTREE_NOT_CLEAN");
  if (audit.status !== "PASS" || audit.rc?.status !== "IN_REVIEW" || audit.rc?.immutabilityValid !== true
    || canonicalHash(audit.rc.counts) !== canonicalHash({ lexemes: 87, senses: 100, classifications: 99, provenance: 799, taxonomySnapshots: 1, media: 0, learningSets: 0, relations: 0 })
    || audit.validation?.rcStatus !== "PASS" || audit.validation?.rcErrors !== 0 || audit.validation?.rcWarnings !== 0
    || (auditPlan.validation as JsonObject)?.status !== "PASS" || (auditPlan.validation as JsonObject)?.errorCount !== 0 || (auditPlan.validation as JsonObject)?.warningCount !== 0) {
    fail("RC_FINAL_AUDIT_OR_VALIDATION_FAILED");
  }
  if (audit.cefr?.cefrValueDrift !== 0 || audit.cefr?.confidenceDrift !== 0 || audit.cefr?.duplicatePrimaryCefrCount !== 0
    || audit.cefr?.distributionExact !== true || audit.cefr?.lightFinalDecisionPreserved !== true
    || audit.cefr?.waterReusePreserved !== true || audit.cefr?.fuseUnclassifiedPreserved !== true
    || audit.provenance?.closureValid !== true || audit.provenance?.additionalApprovalProvenanceRequiredByCurrentValidator !== 0) {
    fail("RC_SEMANTIC_CEFR_OR_PROVENANCE_GATE_FAILED");
  }
  if (existsSync(path.join(root, TAXONOMY_201_PATH))) fail("TAXONOMY_2_0_1_ALREADY_EXISTS");
  if (existsSync(path.join(root, RELEASE_RELATIVE))) fail("APPROVED_RELEASE_IMMUTABILITY_VIOLATION", RELEASE_RELATIVE);

  const correction = readJson<JsonObject>(root, `${WORKSPACE_RELATIVE}/canary-baseline-correction.json`);
  if (correction.authoritativeCanaryGitTreeSha !== EXPECTED_CANARY_TREE
    || correction.canaryCommittedTreeFingerprint !== EXPECTED_CANARY_FINGERPRINT
    || correction.lastCanaryCommit !== EXPECTED_LAST_CANARY_COMMIT) fail("CANARY_CORRECTION_EVIDENCE_MISMATCH");

  const rootManifest = readJson<JsonObject>(root, `${DATASET}/dataset.json`);
  const rcManifest = readJson<JsonObject>(root, `${RC_RELATIVE}/dataset.json`);
  const approvalRevisionPlan = readJson<JsonObject>(root, APPROVAL_PLAN_RELATIVE);
  if (rootManifest.datasetVersion !== "2.0.0" || rootManifest.schemaVersion !== "2.0.1" || rootManifest.status !== "DRAFT") fail("CANONICAL_ROOT_IDENTITY_MISMATCH");
  if (canonicalHash(canonicalCounts(rootManifest)) !== canonicalHash({ lexemes: 103, senses: 123, classifications: 219, provenance: 1043, taxonomySnapshots: 1 })) fail("CANONICAL_ROOT_COUNTS_MISMATCH");
  if (canonicalHash(countPins(rcManifest)) !== canonicalHash(audit.rc.counts)) fail("RC_MANIFEST_AUDIT_COUNT_MISMATCH");
  if (!Array.isArray(approvalRevisionPlan.rows) || approvalRevisionPlan.rows.length !== 286) fail("APPROVAL_PLAN_ROW_COUNT_MISMATCH");

  const taxonomy20 = readJson<JsonObject>(root, TAXONOMY_20_PATH);
  const taxonomyHash = canonicalHash(taxonomy20);
  if (taxonomyHash !== TAXONOMY_20_HASH || taxonomyHash !== auditPlan.taxonomyPlan.currentContentHash) fail("TAXONOMY_2_0_0_HASH_MISMATCH", taxonomyHash);
  if (taxonomy20.taxonomyId !== TAXONOMY_ID || taxonomy20.taxonomyVersion !== "2.0.0" || taxonomy20.status !== "DRAFT") fail("TAXONOMY_2_0_0_IDENTITY_MISMATCH");
  const taxonomy201 = {
    ...structuredClone(taxonomy20),
    taxonomyVersion: "2.0.1",
    status: "APPROVED",
    createdAt: RELEASE_CREATED_AT,
    updatedAt: RELEASE_CREATED_AT,
  } as JsonObject;
  const taxonomySemanticDiff = canonicalHash(taxonomySemanticProjection(taxonomy20)) === canonicalHash(taxonomySemanticProjection(taxonomy201)) ? 0 : 1;
  if (taxonomySemanticDiff !== 0 || taxonomy201.taxonomyId !== taxonomy20.taxonomyId) fail("TAXONOMY_SEMANTIC_DIFF_NONZERO");
  const taxonomy201Hash = canonicalHash(taxonomy201);

  const finalReleasePlanRows = new Map<string, JsonObject>();
  for (const [kind, collection] of [["LEXEME", "includedLexemes"], ["SENSE", "includedSenses"], ["CLASSIFICATION", "includedClassifications"]] as const) {
    const rows = finalManifestPlan[collection] as JsonObject[];
    if (!Array.isArray(rows)) fail("FINAL_MANIFEST_PLAN_COLLECTION_MISSING", collection);
    for (const pin of rows) finalReleasePlanRows.set(`${kind}:${String(pin.stableId)}`, pin);
  }
  const expectedKindCounts: Record<EntityKind, number> = { LEXEME: 87, SENSE: 100, CLASSIFICATION: 99 };
  const revisions: FreshPlan["revisions"] = [];
  const seenTargets = new Set<string>();
  const rootPinsFor = (kind: EntityKind): JsonObject[] => rootManifest[pinFields(kind).collection] as JsonObject[];
  for (const row of approvalRevisionPlan.rows as JsonObject[]) {
    const kind = row.entityType as EntityKind;
    if (!(kind in expectedKindCounts) || row.action !== "CREATE_APPROVED_NEXT_REVISION" || row.targetStatus !== "APPROVED") fail("APPROVAL_PLAN_ACTION_INVALID", `${kind}:${row.action}`);
    const spec = pinFields(kind);
    const currentPath = String(row.currentRecordPath);
    const targetPath = String(row.targetRecordPath);
    if (Number(row.targetRevision) !== Number(row.currentRevision) + 1) fail("APPROVAL_REVISION_NOT_NEXT", targetPath);
    if (existsSync(path.join(root, DATASET, ...targetPath.split("/")))) fail("APPROVAL_TARGET_COLLISION", targetPath);
    if (seenTargets.has(targetPath)) fail("APPROVAL_TARGET_DUPLICATE", targetPath);
    seenTargets.add(targetPath);
    const currentRecord = readJson<JsonObject>(root, `${DATASET}/${currentPath}`);
    const currentHash = canonicalHash(currentRecord);
    if (currentHash !== row.currentContentHash || currentRecord[spec.id] !== row.stableId || currentRecord[spec.revision] !== row.currentRevision) fail("APPROVAL_PREDECESSOR_MISMATCH", currentPath);
    const priorRootPin = rootPinsFor(kind).find((pin) => pin[spec.id] === row.stableId);
    if (!priorRootPin || priorRootPin.recordPath !== currentPath || priorRootPin.contentHash !== currentHash || priorRootPin[spec.revision] !== row.currentRevision) fail("CANONICAL_CURRENT_PIN_MISMATCH", `${kind}:${row.stableId}`);
    const target = { ...structuredClone(currentRecord), [spec.revision]: row.targetRevision, status: "APPROVED" } as JsonObject;
    const targetHash = canonicalHash(target);
    if (targetHash !== row.targetContentHash) fail("APPROVAL_PLAN_NOT_MATERIALIZABLE_DETERMINISTICALLY", targetPath);
    const finalPin = finalReleasePlanRows.get(`${kind}:${String(row.stableId)}`);
    if (!finalPin || finalPin.recordPath !== targetPath || Number(finalPin.revision) !== Number(row.targetRevision)
      || finalPin.status !== "APPROVED" || finalPin.contentHash !== targetHash) fail("FINAL_MANIFEST_TARGET_PIN_MISMATCH", targetPath);
    const learnerHash = canonicalHash(without(currentRecord, ["status", spec.revision]));
    const targetLearnerHash = canonicalHash(without(target, ["status", spec.revision]));
    if (learnerHash !== targetLearnerHash || learnerHash !== row.currentLearnerPayloadHash || targetLearnerHash !== row.targetLearnerPayloadHash) fail("APPROVAL_LEARNER_SEMANTIC_DRIFT", targetPath);
    if (kind === "CLASSIFICATION") {
      const fields = ["dimension", "valueCode", "confidence", "frameworkCode", "frameworkVersion", "valueRef", "isPrimary", "sourceProvenanceIds"];
      if (canonicalHash(Object.fromEntries(fields.map((field) => [field, currentRecord[field]])))
        !== canonicalHash(Object.fromEntries(fields.map((field) => [field, target[field]])))) fail("CEFR_VALUE_OR_CONFIDENCE_DRIFT", targetPath);
    }
    revisions.push({ kind, pin: { ...finalPin }, record: target, currentRecord, currentRecordPath: currentPath });
  }
  const actualCounts = {
    LEXEME: revisions.filter((item) => item.kind === "LEXEME").length,
    SENSE: revisions.filter((item) => item.kind === "SENSE").length,
    CLASSIFICATION: revisions.filter((item) => item.kind === "CLASSIFICATION").length,
  };
  if (canonicalHash(actualCounts) !== canonicalHash({ LEXEME: 87, SENSE: 100, CLASSIFICATION: 99 }) || revisions.length !== 286) fail("APPROVAL_REVISION_COUNTS_MISMATCH");

  const provenancePins: JsonObject[] = [];
  const expectedProvenanceRows = finalManifestPlan.includedProvenancePins as JsonObject[];
  if (!Array.isArray(expectedProvenanceRows) || expectedProvenanceRows.length !== 799) fail("PROVENANCE_CLOSURE_COUNT_MISMATCH");
  const seenProvenance = new Set<string>();
  for (const expected of expectedProvenanceRows) {
    const record = readJson<JsonObject>(root, `${DATASET}/${String(expected.recordPath)}`);
    const hash = canonicalHash(record);
    if (!record.provenanceId || hash !== expected.contentHash || seenProvenance.has(String(record.provenanceId))) fail("PROVENANCE_PIN_MISMATCH", String(expected.recordPath));
    seenProvenance.add(String(record.provenanceId));
    provenancePins.push({ provenanceId: record.provenanceId, recordPath: expected.recordPath, contentHash: hash });
  }

  const rootUpdated = structuredClone(rootManifest) as JsonObject;
  for (const kind of ["LEXEME", "SENSE", "CLASSIFICATION"] as const) {
    const spec = pinFields(kind);
    const replacements = new Map(revisions.filter((item) => item.kind === kind).map((item) => [String(item.record[spec.id]), {
      [spec.id]: item.record[spec.id], [spec.revision]: item.record[spec.revision], recordPath: item.pin.recordPath, contentHash: item.pin.contentHash,
    }]));
    rootUpdated[spec.collection] = (rootUpdated[spec.collection] as JsonObject[]).map((pin) => replacements.get(String(pin[spec.id])) ?? pin);
  }
  if (!Array.isArray(rootUpdated.includedTaxonomySnapshots) || rootUpdated.includedTaxonomySnapshots.length !== 1
    || rootUpdated.includedTaxonomySnapshots[0].taxonomyId !== TAXONOMY_ID
    || rootUpdated.includedTaxonomySnapshots[0].taxonomyVersion !== "2.0.0"
    || rootUpdated.includedTaxonomySnapshots[0].contentHash !== TAXONOMY_20_HASH) fail("CANONICAL_TAXONOMY_PIN_MISMATCH");
  rootUpdated.includedTaxonomySnapshots = [{
    taxonomyId: TAXONOMY_ID,
    taxonomyVersion: "2.0.1",
    recordPath: "taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.1.json",
    contentHash: taxonomy201Hash,
  }];
  if (rootUpdated.datasetVersion !== "2.0.0" || rootUpdated.schemaVersion !== "2.0.1" || rootUpdated.status !== "DRAFT") fail("CANONICAL_ROOT_PROMOTION_FORBIDDEN");
  if (canonicalHash(canonicalCounts(rootUpdated)) !== canonicalHash({ lexemes: 103, senses: 123, classifications: 219, provenance: 1043, taxonomySnapshots: 1 })) fail("CANONICAL_ROOT_TOTALS_CHANGED");

  const light = revisions.find((item) => item.kind === "CLASSIFICATION" && item.record.classificationId === LIGHT_CLASSIFICATION_ID);
  const water = revisions.find((item) => item.kind === "CLASSIFICATION" && item.record.classificationId === WATER_CLASSIFICATION_ID);
  const fuse = (finalManifestPlan.includedSenses as JsonObject[]).find((pin) => pin.stableId === FUSE_SENSE_ID);
  const fuseClassifications = finalManifestPlan.includedClassifications as JsonObject[];
  if (!light || light.record.classificationRevision !== 3 || light.record.valueCode !== "A1") fail("LIGHT_APPROVED_A1_ASSERTION_FAILED");
  if (!water || water.record.classificationRevision !== 2 || water.record.valueCode !== "A2") fail("WATER_APPROVED_A2_ASSERTION_FAILED");
  if (!fuse || fuse.status !== "APPROVED" || revisions.some((item) => item.kind === "CLASSIFICATION" && item.record.masterSenseId === FUSE_SENSE_ID)
    || fuseClassifications.some((pin) => revisions.some((item) => item.kind === "CLASSIFICATION" && item.record.classificationId === pin.stableId && item.record.masterSenseId === FUSE_SENSE_ID))) fail("FUSE_UNCLASSIFIED_ASSERTION_FAILED");

  const outputPaths = [
    ...revisions.map((item) => `${DATASET}/${String(item.pin.recordPath)}`),
    TAXONOMY_201_PATH,
    `${DATASET}/dataset.json`,
    ...WORKSPACE_OUTPUTS,
    REPORT_RELATIVE,
    ...directoryFiles(path.join(root, RC_RELATIVE, "schemas")).map((file) => `${RELEASE_RELATIVE}/schemas/${path.basename(file)}`),
  ];
  if (outputPaths.length !== new Set(outputPaths).size) fail("OUTPUT_PATH_COLLISION");
  return {
    audit,
    rootManifest,
    rcManifest,
    finalManifestPlan,
    approvalRevisionPlan,
    taxonomy20,
    taxonomy201,
    revisions,
    provenancePins,
    rootUpdated,
    taxonomyHash,
    taxonomySemanticDiff,
    rcState,
    outputPaths,
  };
}

function taxonomyPin(target: JsonObject): JsonObject {
  return {
    taxonomyId: target.taxonomyId,
    taxonomyVersion: target.taxonomyVersion,
    recordPath: "taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.1.json",
    contentHash: canonicalHash(target),
  };
}

function createReleaseManifest(plan: FreshPlan, releasedAt: string): JsonObject {
  const mapEntityPins = (kind: EntityKind): JsonObject[] => plan.revisions.filter((item) => item.kind === kind).map((item) => {
    const spec = pinFields(kind);
    return {
      [spec.id]: item.record[spec.id],
      [spec.revision]: item.record[spec.revision],
      recordPath: item.pin.recordPath,
      contentHash: item.pin.contentHash,
    };
  });
  const manifest: JsonObject = {
    datasetId: plan.rcManifest.datasetId,
    datasetCode: plan.rcManifest.datasetCode,
    name: structuredClone(plan.rcManifest.name),
    datasetVersion: "2.2.0",
    schemaVersion: "2.0.1",
    status: "APPROVED",
    includedLexemes: mapEntityPins("LEXEME"),
    includedSenses: mapEntityPins("SENSE"),
    includedClassifications: mapEntityPins("CLASSIFICATION"),
    includedLearningSets: [],
    includedTaxonomySnapshots: [taxonomyPin(plan.taxonomy201)],
    includedMediaAssets: [],
    includedMediaAssetVersions: [],
    includedRelations: [],
    includedProvenance: structuredClone(plan.provenancePins),
    createdAt: RELEASE_CREATED_AT,
    releasedAt,
    releaseHashAlgorithm: RELEASE_HASH_ALGORITHM,
    changeSummary: [
      { language: "en", text: "First approved Hybrid-100 release: 100 reviewed Senses across 87 Lexemes, 99 editorial CEFR assignments and one intentionally unclassified Sense. Taxonomy snapshot 2.0.1 is approved. No source media is bundled; CEFR values are VocabFlow editorial estimates." },
      { language: "vi", text: "Bản phát hành Hybrid-100 được phê duyệt đầu tiên: 100 Sense đã rà soát thuộc 87 Lexeme, 99 phân loại CEFR biên tập và một Sense được chủ ý để chưa phân loại. Snapshot taxonomy 2.0.1 được phê duyệt. Không đóng gói media nguồn; giá trị CEFR là ước lượng biên tập của VocabFlow." },
    ],
  };
  const expected = { lexemes: 87, senses: 100, classifications: 99, provenance: 799, taxonomySnapshots: 1, media: 0, learningSets: 0, relations: 0 };
  if (canonicalHash(countPins(manifest)) !== canonicalHash(expected)) fail("RELEASE_COHORT_MISMATCH");
  return manifest;
}

function releaseHash(manifest: JsonObject): string {
  const payload = without(manifest, ["releaseHash"]);
  const canonical = canonicalize(payload as never);
  if (canonical === undefined) fail("RELEASE_HASH_CANONICALIZATION_FAILED");
  return createHash("sha256").update(canonical).digest("hex");
}

function writePlanFiles(directory: string, files: FilePlan): void {
  for (const [relative, contents] of files) {
    const target = path.join(directory, ...relative.split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, contents, "utf8");
  }
}

function createPackageFiles(root: string, plan: FreshPlan, manifest: JsonObject): FilePlan {
  const files: FilePlan = new Map();
  files.set("dataset.json", jsonText(manifest));
  for (const kind of ["LEXEME", "SENSE", "CLASSIFICATION"] as const) {
    for (const item of plan.revisions.filter((revision) => revision.kind === kind)) {
      files.set(String(item.pin.recordPath), jsonText(item.record));
    }
  }
  files.set(String(taxonomyPin(plan.taxonomy201).recordPath), jsonText(plan.taxonomy201));
  for (const pin of plan.provenancePins) {
    files.set(String(pin.recordPath), readFileSync(path.join(root, DATASET, String(pin.recordPath)), "utf8"));
  }
  for (const schema of SCHEMA_FILES) files.set(`schemas/${schema}`, readFileSync(path.join(root, RC_RELATIVE, "schemas", schema), "utf8"));
  return files;
}

function buildMaterializationArtifacts(root: string, plan: FreshPlan, releasedAt: string): {
  files: FilePlan;
  manifest: JsonObject;
  releaseTree: string;
  validationSummary: JsonObject;
  summary: JsonObject;
} {
  const manifest = createReleaseManifest(plan, releasedAt);
  manifest.releaseHash = releaseHash(manifest);
  if (releaseHash(manifest) !== manifest.releaseHash) fail("RELEASE_HASH_REPEAT_MISMATCH");

  const packageFiles = createPackageFiles(root, plan, manifest);
  const tempBase = mkdtempSync(path.join(os.tmpdir(), "vocabflow-2f7-"));
  const stageRelease = path.join(tempBase, "release");
  const stageDataset = path.join(tempBase, "dataset");
  try {
    writePlanFiles(stageRelease, packageFiles);
    const releaseValidation = validateMasterVocabularyV2({
      datasetRoot: stageRelease,
      schemaRoot: path.join(stageRelease, "schemas"),
      writeReport: false,
      validatedAt: releasedAt,
    });
    if (releaseValidation.status !== "PASS" || releaseValidation.errorCount !== 0 || releaseValidation.warningCount !== 0 || releaseValidation.infoCount !== 0) {
      fail("APPROVED_RELEASE_VALIDATION_FAILED", JSON.stringify({ status: releaseValidation.status, errors: releaseValidation.errorCount, warnings: releaseValidation.warningCount, info: releaseValidation.infoCount, issues: releaseValidation.issues }));
    }

    cpSync(path.join(root, DATASET), stageDataset, { recursive: true, errorOnExist: true, force: false });
    for (const item of plan.revisions) {
      const file = path.join(stageDataset, ...String(item.pin.recordPath).split("/"));
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, jsonText(item.record), "utf8");
    }
    writeFileSync(path.join(stageDataset, "taxonomy", path.basename(TAXONOMY_201_PATH)), jsonText(plan.taxonomy201), "utf8");
    writeFileSync(path.join(stageDataset, "dataset.json"), jsonText(plan.rootUpdated), "utf8");
    const rootValidation = validateMasterVocabularyV2({
      datasetRoot: stageDataset,
      schemaRoot: path.join(stageDataset, "schemas"),
      writeReport: false,
      validatedAt: releasedAt,
    });
    if (rootValidation.status !== "PASS" || rootValidation.errorCount !== 0 || rootValidation.warningCount !== 0) {
      fail("CANONICAL_ROOT_VALIDATION_FAILED", JSON.stringify({ status: rootValidation.status, errors: rootValidation.errorCount, warnings: rootValidation.warningCount, info: rootValidation.infoCount, issues: rootValidation.issues }));
    }

    const treeOne = packageTreeFingerprint(stageRelease);
    const treeTwo = packageTreeFingerprint(stageRelease);
    if (treeOne !== treeTwo) fail("RELEASE_TREE_FINGERPRINT_NOT_DETERMINISTIC");
    const evidence = {
      artifactType: "HYBRID_100_APPROVED_RELEASE_EVIDENCE",
      datasetVersion: "2.2.0",
      status: "APPROVED",
      sourceRcVersion: "2.2.0-rc.1",
      sourceRcFingerprint: EXPECTED_RC_FINGERPRINT,
      sourceRcTreeFingerprint: EXPECTED_RC_TREE,
      taxonomyPolicyFingerprint: EXPECTED_TAXONOMY_POLICY,
      finalManifestPlanFingerprint: EXPECTED_MANIFEST_PLAN,
      authorizedCefrFingerprint: EXPECTED_CEFR,
      taxonomyVersion: "2.0.1",
      taxonomy20Hash: plan.taxonomyHash,
      taxonomy201Hash: canonicalHash(plan.taxonomy201),
      taxonomySemanticDiff: plan.taxonomySemanticDiff,
      approvalRevisionCounts: { lexemes: 87, senses: 100, classifications: 99 },
      provenanceCount: 799,
      releaseHash: manifest.releaseHash,
      releaseHashAlgorithm: RELEASE_HASH_ALGORITHM,
      releaseTreeFingerprint: treeOne,
      releaseTreeFingerprintExcludesSelfReferentialEvidenceFile: true,
      sourceRightsVerified: false,
      sourceTextReused: false,
      sourceMediaReused: false,
      runtimeImportAuthorized: false,
      databaseWrites: "NONE",
      productionMutation: false,
      correctedCanaryGitTreeSha: EXPECTED_CANARY_TREE,
      correctedCanaryCommittedFingerprint: EXPECTED_CANARY_FINGERPRINT,
      supersededCanaryFingerprintAuthoritative: false,
      correctionArtifact: `${WORKSPACE_RELATIVE}/canary-baseline-correction.json`,
      releasedAt,
    };
    packageFiles.set("reports/release-approval-evidence.json", jsonText(evidence));
    writePlanFiles(stageRelease, new Map([["reports/release-approval-evidence.json", jsonText(evidence)]]));

    const rootCounts = countPins(plan.rootUpdated);
    const releaseCounts = countPins(manifest);
    const validationSummary: JsonObject = {
      artifactType: "HYBRID_100_APPROVED_RELEASE_VALIDATION_SUMMARY",
      status: "PASS",
      release: { ...releaseValidation, independentlyRecomputedReleaseHash: releaseHash(manifest), releaseHashValid: releaseHash(manifest) === manifest.releaseHash },
      canonicalRoot: rootValidation,
      assertions: {
        taxonomySemanticDiff: plan.taxonomySemanticDiff,
        stableEntityIdsPreserved: true,
        newEntityIdsAllocated: 0,
        newProvenanceIdsAllocated: 0,
        learnerFacingSemanticDrift: 0,
        cefrValueAndConfidenceDrift: 0,
        predecessorRevisionsUnchanged: true,
        approvedReleaseRecordsOnly: true,
        effectiveCefrDistribution: CEFR_DISTRIBUTION,
        lightApprovedA1Revision3: true,
        waterApprovedA2Revision2: true,
        fuseIntentionallyUnclassified: true,
        canonicalRootCounts: rootCounts,
        releaseCounts,
        rcUnchanged: true,
        canaryUnchanged: true,
        runtimeImportAuthorized: false,
        databaseConnection: "NONE",
        databaseWrites: "NONE",
        productionMutation: false,
      },
    };
    const summary: JsonObject = {
      artifactType: "HYBRID_100_APPROVED_RELEASE_MATERIALIZATION_SUMMARY",
      sourceRcFingerprint: EXPECTED_RC_FINGERPRINT,
      sourceRcTreeFingerprint: EXPECTED_RC_TREE,
      taxonomyPolicyFingerprint: EXPECTED_TAXONOMY_POLICY,
      finalManifestPlanFingerprint: EXPECTED_MANIFEST_PLAN,
      authorizedCefrFingerprint: EXPECTED_CEFR,
      taxonomy20Hash: plan.taxonomyHash,
      taxonomy201Hash: canonicalHash(plan.taxonomy201),
      taxonomySemanticDiff: plan.taxonomySemanticDiff,
      approvedLexemeRevisionCount: 87,
      approvedSenseRevisionCount: 100,
      approvedClassificationRevisionCount: 99,
      approvalRevisionCount: 286,
      newEntityIdsAllocated: 0,
      newProvenanceIdsAllocated: 0,
      learnerFacingSemanticDrift: 0,
      cefrValueDrift: 0,
      canonicalLexemeCount: rootCounts.lexemes,
      canonicalSenseCount: rootCounts.senses,
      canonicalClassificationCount: rootCounts.classifications,
      canonicalProvenanceCount: rootCounts.provenance,
      canonicalRootVersion: plan.rootUpdated.datasetVersion,
      canonicalRootStatus: plan.rootUpdated.status,
      releaseVersion: manifest.datasetVersion,
      releaseStatus: manifest.status,
      releaseLexemeCount: releaseCounts.lexemes,
      releaseSenseCount: releaseCounts.senses,
      releaseClassificationCount: releaseCounts.classifications,
      releaseProvenanceCount: releaseCounts.provenance,
      releaseTaxonomyCount: releaseCounts.taxonomySnapshots,
      releaseMediaCount: releaseCounts.media,
      releaseLearningSetCount: releaseCounts.learningSets,
      releaseRelationCount: releaseCounts.relations,
      releaseHashAlgorithm: RELEASE_HASH_ALGORITHM,
      releaseHash: manifest.releaseHash,
      releaseTreeFingerprint: treeOne,
      rcUnchanged: true,
      canaryUnchanged: true,
      runtimeImportAuthorized: false,
      databaseWrites: "NONE",
      productionMutation: false,
      releasedAt,
      frozen: true,
    };

    const files: FilePlan = new Map();
    for (const [relative, contents] of packageFiles) files.set(`${RELEASE_RELATIVE}/${relative}`, contents);
    files.set(`${DATASET}/dataset.json`, jsonText(plan.rootUpdated));
    for (const item of plan.revisions) files.set(`${DATASET}/${item.pin.recordPath}`, jsonText(item.record));
    files.set(TAXONOMY_201_PATH, jsonText(plan.taxonomy201));
    files.set(`${WORKSPACE_RELATIVE}/authorization.json`, jsonText({
      artifactType: "HYBRID_100_APPROVED_RELEASE_BUILD_AUTHORIZATION",
      sourceBaseline: EXPECTED_BASE,
      rcVersion: "2.2.0-rc.1",
      rcFingerprint: EXPECTED_RC_FINGERPRINT,
      rcTreeFingerprint: EXPECTED_RC_TREE,
      taxonomyPolicyFingerprint: EXPECTED_TAXONOMY_POLICY,
      finalManifestPlanFingerprint: EXPECTED_MANIFEST_PLAN,
      authorizedCefrFingerprint: EXPECTED_CEFR,
      authorizationScope: ["MATERIALIZE_TAXONOMY_2_0_1_APPROVED", "MATERIALIZE_APPROVAL_ONLY_ENTITY_REVISIONS", "BUILD_APPROVED_RELEASE_2_2_0", "GENERATE_OFFICIAL_RELEASE_HASH", "FREEZE_APPROVED_RELEASE"],
      authorizedBy: "VocabFlow project owner",
      runtimeImportAuthorized: false,
      databaseWriteAuthorized: false,
      productionMutationAuthorized: false,
      correctedCanaryGitTreeSha: EXPECTED_CANARY_TREE,
      correctedCanaryCommittedFingerprint: EXPECTED_CANARY_FINGERPRINT,
      canaryCorrectionArtifact: `${WORKSPACE_RELATIVE}/canary-baseline-correction.json`,
      releasedAt,
    }));
    files.set(`${WORKSPACE_RELATIVE}/materialization-plan.json`, jsonText({
      artifactType: "HYBRID_100_APPROVED_RELEASE_MATERIALIZATION_PLAN",
      status: "MATERIALIZED_AND_FROZEN",
      sourceBaseline: EXPECTED_BASE,
      sourceRcFingerprint: EXPECTED_RC_FINGERPRINT,
      sourceRcTreeFingerprint: EXPECTED_RC_TREE,
      taxonomyPolicyFingerprint: EXPECTED_TAXONOMY_POLICY,
      finalManifestPlanFingerprint: EXPECTED_MANIFEST_PLAN,
      authorizedCefrFingerprint: EXPECTED_CEFR,
      taxonomy: { oldPath: TAXONOMY_20_PATH, oldHash: plan.taxonomyHash, targetPath: TAXONOMY_201_PATH, targetHash: canonicalHash(plan.taxonomy201), semanticDiff: plan.taxonomySemanticDiff },
      revisions: plan.revisions.map((item) => ({ entityType: item.kind, stableId: item.record[pinFields(item.kind).id], currentRevision: item.currentRecord[pinFields(item.kind).revision], targetRevision: item.record[pinFields(item.kind).revision], currentRecordPath: item.currentRecordPath, targetRecordPath: item.pin.recordPath, targetContentHash: item.pin.contentHash, status: "APPROVED" })),
      counts: { lexemes: 87, senses: 100, classifications: 99, total: 286, provenance: 799, newEntityIds: 0, newProvenanceIds: 0 },
      createdAt: RELEASE_CREATED_AT,
      releasedAt,
      releaseHash: manifest.releaseHash,
      releaseTreeFingerprint: treeOne,
      outputPaths: [...files.keys()].sort((a, b) => a.localeCompare(b, "en")),
      noDatabaseOrRuntimeOperations: true,
    }));
    files.set(`${WORKSPACE_RELATIVE}/summary.json`, jsonText(summary));
    files.set(`${WORKSPACE_RELATIVE}/validation-summary.json`, jsonText(validationSummary));
    files.set(REPORT_RELATIVE, renderReport(manifest, plan, validationSummary, treeOne));

    return { files, manifest, releaseTree: treeOne, validationSummary, summary };
  } finally {
    rmSync(tempBase, { recursive: true, force: true });
  }
}

function renderReport(manifest: JsonObject, plan: FreshPlan, validation: JsonObject, tree: string): string {
  const report = validation.release as ValidationReport;
  const rootReport = validation.canonicalRoot as ValidationReport;
  return [
    "# Hybrid-100 Approved Release 2.2.0",
    "",
    "## Frozen release",
    "",
    `- Status: **${manifest.status}**; schema ${manifest.schemaVersion}.`,
    `- Source RC: 2.2.0-rc.1; fingerprint \`${EXPECTED_RC_FINGERPRINT}\`; tree \`${EXPECTED_RC_TREE}\`.`,
    `- Taxonomy policy: \`${EXPECTED_TAXONOMY_POLICY}\`; final manifest plan: \`${EXPECTED_MANIFEST_PLAN}\`; authorized CEFR: \`${EXPECTED_CEFR}\`.`,
    `- Taxonomy 2.0.0 remains immutable DRAFT (\`${plan.taxonomyHash}\`). Taxonomy 2.0.1 is APPROVED (\`${canonicalHash(plan.taxonomy201)}\`); semantic diff: ${plan.taxonomySemanticDiff}.`,
    "- Approval-only revisions: 87 Lexemes, 100 Senses, and 99 Classifications (286 total). Stable IDs are preserved; no entity or Provenance IDs were allocated.",
    "- Learner-facing semantic drift: 0. CEFR value/confidence drift: 0.",
    "- Canonical root remains 2.0.0 / DRAFT with 103 Lexemes, 123 Senses, 219 Classifications, and 1,043 Provenance records.",
    "- Release cohort: 87 Lexemes, 100 Senses, 99 Classifications, 799 Provenance records, one taxonomy snapshot, zero media, zero Learning Sets, and zero Relations.",
    "- CEFR: A1 17; A2 28; B1 20; B2 27; C1 7; intentionally unclassified 1. Light is A1 at Classification revision 3; Water is A2 at revision 2; Fuse has no Classification.",
    "- The 99 CEFR classifications are VocabFlow editorial estimates, not official CEFR alignment.",
    `- createdAt: ${manifest.createdAt}; releasedAt: ${manifest.releasedAt}.`,
    `- releaseHashAlgorithm: \`${RELEASE_HASH_ALGORITHM}\`; releaseHash: \`${manifest.releaseHash}\` (independently recomputed and verified).`,
    `- Release tree fingerprint: \`${tree}\` (same on repeated computation; approval-evidence file excluded to avoid self-reference).`,
    `- RC changed: NO. Corrected Canary Git tree: \`${EXPECTED_CANARY_TREE}\`; committed fingerprint: \`${EXPECTED_CANARY_FINGERPRINT}\`; old \`2c75…4547\` is not authoritative. Canary changed: NO.`,
    `- Release validator: ${report.status}; errors ${report.errorCount}; warnings ${report.warningCount}; info ${report.infoCount}. Canonical root validator: ${rootReport.status}; errors ${rootReport.errorCount}; warnings ${rootReport.warningCount}; info ${rootReport.infoCount}.`,
    "- Rights boundary: SOURCE_RIGHTS_VERIFIED=NO; SOURCE_TEXT_REUSED=NO; SOURCE_MEDIA_REUSED=NO. No source prose or media is bundled.",
    "- Runtime/database boundary: DATABASE_CONNECTION=NONE; DATABASE_WRITES=NONE; runtime reconciliation/import not authorized or executed; migrations NONE; development and production untouched.",
    "- Release is frozen. Any future correction requires a new dataset version.",
    "",
  ].join("\n");
}

function stageAndValidateRelease(files: FilePlan, releasedAt: string): { releaseValidation: ValidationReport; rootValidation: ValidationReport } {
  const temp = mkdtempSync(path.join(os.tmpdir(), "vocabflow-2f7-validate-"));
  const stage = path.join(temp, "release");
  try {
    const releaseFiles = new Map([...files.entries()].filter(([relative]) => relative.startsWith(`${RELEASE_RELATIVE}/`))
      .map(([relative, content]) => [relative.slice(`${RELEASE_RELATIVE}/`.length), content]));
    writePlanFiles(stage, releaseFiles);
    const releaseValidation = validateMasterVocabularyV2({ datasetRoot: stage, schemaRoot: path.join(stage, "schemas"), writeReport: false, validatedAt: releasedAt });
    if (releaseValidation.status !== "PASS" || releaseValidation.errorCount !== 0 || releaseValidation.warningCount !== 0 || releaseValidation.infoCount !== 0) {
      fail("APPROVED_RELEASE_VALIDATION_FAILED", JSON.stringify({ status: releaseValidation.status, errors: releaseValidation.errorCount, warnings: releaseValidation.warningCount, info: releaseValidation.infoCount, issues: releaseValidation.issues }));
    }
    const sourceDataset = path.join(ROOT, DATASET);
    const stagedDataset = path.join(temp, "dataset");
    cpSync(sourceDataset, stagedDataset, { recursive: true, errorOnExist: true, force: false });
    for (const [relative, content] of files) {
      if (relative === `${DATASET}/dataset.json` || relative.startsWith(`${DATASET}/master/`) || relative === TAXONOMY_201_PATH) {
        const target = path.join(stagedDataset, ...relative.slice(`${DATASET}/`.length).split("/"));
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, content, "utf8");
      }
    }
    const rootValidation = validateMasterVocabularyV2({ datasetRoot: stagedDataset, schemaRoot: path.join(stagedDataset, "schemas"), writeReport: false, validatedAt: releasedAt });
    if (rootValidation.status !== "PASS" || rootValidation.errorCount !== 0 || rootValidation.warningCount !== 0) {
      fail("CANONICAL_ROOT_VALIDATION_FAILED", JSON.stringify({ status: rootValidation.status, errors: rootValidation.errorCount, warnings: rootValidation.warningCount, info: rootValidation.infoCount, issues: rootValidation.issues }));
    }
    return { releaseValidation, rootValidation };
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

function verifyFrozenRelease(root: string): JsonObject {
  const releaseRoot = path.join(root, RELEASE_RELATIVE);
  if (!existsSync(releaseRoot)) fail("APPROVED_RELEASE_NOT_MATERIALIZED");
  const workspacePlan = readJson<JsonObject>(root, `${WORKSPACE_RELATIVE}/materialization-plan.json`);
  const manifest = readJson<JsonObject>(releaseRoot, "dataset.json");
  if (workspacePlan.status !== "MATERIALIZED_AND_FROZEN" || manifest.datasetVersion !== "2.2.0" || manifest.status !== "APPROVED") fail("APPROVED_RELEASE_IMMUTABILITY_VIOLATION", "frozen-state");
  const recomputedHash = releaseHash(manifest);
  if (manifest.releaseHash !== recomputedHash || manifest.releaseHashAlgorithm !== RELEASE_HASH_ALGORITHM || manifest.releaseHash !== workspacePlan.releaseHash) fail("APPROVED_RELEASE_IMMUTABILITY_VIOLATION", "release-hash");
  const treeOne = packageTreeFingerprint(releaseRoot);
  const treeTwo = packageTreeFingerprint(releaseRoot);
  const evidence = readJson<JsonObject>(releaseRoot, "reports/release-approval-evidence.json");
  if (treeOne !== treeTwo || treeOne !== workspacePlan.releaseTreeFingerprint || evidence.releaseTreeFingerprint !== treeOne) fail("APPROVED_RELEASE_IMMUTABILITY_VIOLATION", "release-tree");
  const validation = validateMasterVocabularyV2({ datasetRoot: releaseRoot, schemaRoot: path.join(releaseRoot, "schemas"), writeReport: false, validatedAt: manifest.releasedAt });
  if (validation.status !== "PASS" || validation.errorCount !== 0 || validation.warningCount !== 0 || validation.infoCount !== 0) fail("APPROVED_RELEASE_IMMUTABILITY_VIOLATION", "validator");
  const rootManifest = readJson<JsonObject>(root, `${DATASET}/dataset.json`);
  const rootValidation = validateMasterVocabularyV2({ datasetRoot: path.join(root, DATASET), schemaRoot: path.join(root, DATASET, "schemas"), writeReport: false, validatedAt: manifest.releasedAt });
  if (rootManifest.datasetVersion !== "2.0.0" || rootManifest.status !== "DRAFT"
    || canonicalHash(canonicalCounts(rootManifest)) !== canonicalHash({ lexemes: 103, senses: 123, classifications: 219, provenance: 1043, taxonomySnapshots: 1 })
    || rootValidation.status !== "PASS" || rootValidation.errorCount !== 0 || rootValidation.warningCount !== 0) fail("CANONICAL_ROOT_IMMUTABILITY_OR_VALIDATION_FAILURE");
  if (canonicalHash(readJson<JsonObject>(root, TAXONOMY_20_PATH)) !== TAXONOMY_20_HASH) fail("TAXONOMY_2_0_0_IMMUTABILITY_VIOLATION");
  const rcState = rcFingerprintAndTree(root);
  const canary = assertCanaryRepositoryState(root);
  if (rcState.fingerprint !== EXPECTED_RC_FINGERPRINT || rcState.treeFingerprint !== EXPECTED_RC_TREE
    || canary.headCanaryGitTreeSha !== EXPECTED_CANARY_TREE || canary.canaryCommittedTreeFingerprint !== EXPECTED_CANARY_FINGERPRINT
    || canary.lastCanaryCommit !== EXPECTED_LAST_CANARY_COMMIT || !canary.canaryWorkingTreeClean) fail("FROZEN_SOURCE_IMMUTABILITY_VIOLATION");
  return {
    status: "APPROVED_RELEASE_ALREADY_MATERIALIZED",
    releaseHash: manifest.releaseHash,
    releaseTreeFingerprint: treeOne,
    releaseHashRepeatIdentical: true,
    releaseTreeFingerprintRepeatIdentical: true,
    requiredChanges: 0,
    validator: { status: validation.status, errors: validation.errorCount, warnings: validation.warningCount, info: validation.infoCount },
    rcUnchanged: true,
    canaryUnchanged: true,
  };
}

function persistTransaction(root: string, files: FilePlan, verify?: () => void): void {
  const snapshots = new Map<string, Buffer | null>();
  const releaseTarget = path.join(root, RELEASE_RELATIVE);
  const tempParent = mkdtempSync(path.join(path.dirname(releaseTarget), ".hybrid-100-v2.2.0-staging-"));
  const tempRelease = path.join(tempParent, "release");
  mkdirSync(tempRelease, { recursive: true });
  const releaseFiles = new Map([...files.entries()]
    .filter(([relative]) => relative.startsWith(`${RELEASE_RELATIVE}/`))
    .map(([relative, content]) => [relative.slice(`${RELEASE_RELATIVE}/`.length), content]));
  writePlanFiles(tempRelease, releaseFiles);
  let releaseCreated = false;
  for (const relative of files.keys()) {
    if (relative.startsWith(`${RELEASE_RELATIVE}/`)) continue;
    const absolute = path.join(root, ...relative.split("/"));
    snapshots.set(absolute, existsSync(absolute) ? readFileSync(absolute) : null);
  }
  try {
    for (const [relative, content] of files) {
      if (relative.startsWith(`${RELEASE_RELATIVE}/`)) continue;
      const absolute = path.join(root, ...relative.split("/"));
      mkdirSync(path.dirname(absolute), { recursive: true });
      writeFileSync(absolute, content, "utf8");
    }
    if (existsSync(releaseTarget)) fail("APPROVED_RELEASE_IMMUTABILITY_VIOLATION", RELEASE_RELATIVE);
    renameSync(tempRelease, releaseTarget);
    releaseCreated = true;
    verify?.();
  } catch (error) {
    for (const [absolute, original] of [...snapshots.entries()].reverse()) {
      if (original === null) {
        if (existsSync(absolute)) rmSync(absolute, { force: true });
      } else {
        mkdirSync(path.dirname(absolute), { recursive: true });
        writeFileSync(absolute, original);
      }
    }
    if (releaseCreated && existsSync(releaseTarget)) rmSync(releaseTarget, { recursive: true, force: true });
    throw error;
  } finally {
    if (existsSync(tempParent)) rmSync(tempParent, { recursive: true, force: true });
  }
}

export function main(args = process.argv.slice(2), root = ROOT): JsonObject {
  if (args.length !== 1 || !["--check", "--apply"].includes(args[0] ?? "")) fail("USAGE", "pnpm vocab:hybrid-100-approved-release -- --check|--apply");
  const mode = args[0];
  if (existsSync(path.join(root, RELEASE_RELATIVE))) {
    const frozen = verifyFrozenRelease(root);
    console.log(JSON.stringify(frozen, null, 2));
    return frozen;
  }
  const plan = buildApprovedReleasePlan(root);
  if (mode === "--check") {
    const result = {
      status: "READY_TO_MATERIALIZE",
      writesPerformed: false,
      authorizationFingerprintsValid: true,
      correctedCanaryValid: true,
      rcValid: true,
      taxonomy201Absent: true,
      approvedReleaseAbsent: true,
      approvalRevisionCounts: { lexemes: 87, senses: 100, classifications: 99, total: 286 },
      allTargetPathsAbsent: true,
      taxonomySemanticDiff: plan.taxonomySemanticDiff,
      newEntityIds: 0,
      newProvenanceIds: 0,
      plannedFiles: plan.outputPaths.length,
      releasedAt: "ALLOCATED_ON_APPLY_AND_PERSISTED",
      databaseConnection: "NONE",
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const existingPlanPath = path.join(root, `${WORKSPACE_RELATIVE}/materialization-plan.json`);
  const existingExecution = existsSync(existingPlanPath) ? readJson<JsonObject>(root, `${WORKSPACE_RELATIVE}/materialization-plan.json`) : undefined;
  const releasedAt = typeof existingExecution?.releasedAt === "string" ? existingExecution.releasedAt : new Date().toISOString();
  const materialized = buildMaterializationArtifacts(root, plan, releasedAt);
  const validations = stageAndValidateRelease(materialized.files, releasedAt);
  // Rebuild validation details for the archived summary with deterministic validatedAt values.
  const summaryPath = `${WORKSPACE_RELATIVE}/validation-summary.json`;
  const validationSummary = JSON.parse(materialized.files.get(summaryPath) ?? "{}") as JsonObject;
  validationSummary.release = validations.releaseValidation;
  validationSummary.canonicalRoot = validations.rootValidation;
  materialized.files.set(summaryPath, jsonText(validationSummary));
  // Reports are generated after the exact staged validation results are known.
  materialized.files.set(REPORT_RELATIVE, renderReport(materialized.manifest, plan, validationSummary, materialized.releaseTree));
  persistTransaction(root, materialized.files, () => { verifyFrozenRelease(root); });
  const verified = verifyFrozenRelease(root);
  const result = {
    status: "APPROVED_RELEASE_MATERIALIZED_AND_FROZEN",
    releaseHash: verified.releaseHash,
    releaseTreeFingerprint: verified.releaseTreeFingerprint,
    releaseHashRepeatIdentical: verified.releaseHashRepeatIdentical,
    releaseTreeFingerprintRepeatIdentical: verified.releaseTreeFingerprintRepeatIdentical,
    requiredChanges: materialized.files.size,
    rcUnchanged: verified.rcUnchanged,
    canaryUnchanged: verified.canaryUnchanged,
    releaseValidator: verified.validator,
    releasedAt,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
