import { execFileSync } from "node:child_process";
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
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { assertCanaryRepositoryState } from "./hybrid-100-canary-integrity";
import { canonicalHash, sha256 } from "./hybrid-100-canonical-promote";
import {
  buildAppImportV2,
  loadPinnedMasterProjectionGraph,
  APP_IMPORT_CONTRACT_VERSION,
  RUNTIME_PROJECTION_CONTRACT_VERSION,
} from "./transform-master-vocabulary-v2";
import { validateMasterVocabularyV2, type ValidationReport } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- The pinned artifacts use JSON-defined domain shapes.
type JsonObject = Record<string, any>;
type FilePlan = Map<string, string>;

export const AUTHORIZED_BASELINE = "a5cb5a65135fb0d10bdc55d205a807dd4a69ebe0";
export const FIRST_EXECUTION_BASELINE = "bdc99b2d83df08f68cfc0e8dc36e8b2e407fdd63";
export const EXECUTION_BASELINE = "4e0e452f057ee38db0d97045a53dfe7dac732232";
export const REMOTE_ADVANCE_COMMITS = [
  { sha: FIRST_EXECUTION_BASELINE, classification: "UNRELATED_APP_UI_CHANGE" },
  { sha: EXECUTION_BASELINE, classification: "UNRELATED_APP_UI_CHANGE" },
] as const;
export const SOURCE_RELEASE_HASH = "c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d";
export const SOURCE_RELEASE_TREE = "35334eb7769c39029223d2d60311c6faab8c462efd0a340f262bed27543256ae";
export const SEMANTIC_DRAFT_FINGERPRINT = "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d";
export const TARGET_RELEASE_HASH_ALGORITHM = "sha256-canonical-json-v1";
export const RELEASE_RELATIVE = "vocabflow-dataset/releases/hybrid-100-v2.2.0";
export const TARGET_RELEASE_RELATIVE = "vocabflow-dataset/releases/hybrid-100-v2.2.1";
export const CLOSURE_WORKSPACE_RELATIVE = "vocabflow-dataset/workspaces/hybrid-100-runtime-eligibility-closure";
export const TARGET_COHORT = { lexemes: 87, senses: 100, classifications: 99, provenance: 799, taxonomy: 1, media: 0, mediaVersions: 0, learningSets: 0, relations: 0 };
export const EXPECTED_CEFR = { A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, UNCLASSIFIED: 1 };

const DATASET_RELATIVE = "vocabflow-dataset";
const REPORT_RELATIVE = `${DATASET_RELATIVE}/reports/hybrid-100-runtime-eligible-patch-release-2.2.1.md`;
const AUTHORIZATION_RELATIVE = `${CLOSURE_WORKSPACE_RELATIVE}/materialization-authorization.json`;
const PLAN_RELATIVE = `${CLOSURE_WORKSPACE_RELATIVE}/materialization-plan.json`;
const SUMMARY_RELATIVE = `${CLOSURE_WORKSPACE_RELATIVE}/summary.json`;
const VALIDATION_RELATIVE = `${CLOSURE_WORKSPACE_RELATIVE}/materialization-validation-summary.json`;
const RELEASE_EVIDENCE_RELATIVE = "reports/release-approval-evidence.json";
const RC_RELATIVE = `${DATASET_RELATIVE}/releases/hybrid-100-v2.2.0-rc.1`;
const RC_FINGERPRINT = "06b2a4dec2f54438416cae67788e0683fe94907cbce0a60fbb2d6469bc25b82c";
const RC_TREE_FINGERPRINT = "9d021e151d934a61c577289a4aff3ded8883858bac672e1c27ac546a335966a7";
const CANARY_TREE = "f5d4e502be5106da191b5b2ab807f5db12065831";
const CANARY_FINGERPRINT = "718c211b8e668d25ffe4ba0c893bda3e73ce8bd2bf578d276ce9216c08c78b2f";
const CANARY_LAST_COMMIT = "7ce73b7c8e0d2f14e4d7c34366bf6cd08544f847";
const DATASET_TREE = "954291058ed670359e2fd1c2d5168ba69d369d01";
const DATASET_MANIFEST_BLOB = "3e9f16ac1e9573441fe2ebe82f135e872a3eca9c";
const CANONICAL_MASTER_TREE = "ae720291e72cf359621c48a97b4df98eab3a6bfa";
const TAXONOMY_TREE = "dc0239fa0488bd1e1dda7dc78a837d9826de0e2d";
const SOURCE_RELEASE_GIT_TREE = "0162a4b893b47a1eb1e329090a27c8c24780dd3f";
const RC_GIT_TREE = "a0889edd94842eeae428db84d2920a19303a04a3";
const AUDIT_WORKSPACE_GIT_TREE = "8a7d08809cda2d44d0451263d66d6aea2c51b661";
const PREFLIGHT_WORKSPACE_GIT_TREE = "612ab3d6b219a4c0197b44023e9bf25145e71fd9";
const TAXONOMY_HASH = "64f5c98611e8bffca48c67ebfb25fb2d974d9d050df51d0122223a21e678a05c";
const TAXONOMY_ID = "01a0fc13-09e9-72dd-b49d-ffef077385dd";
const LIGHT_CLASSIFICATION_ID = "01a0fc13-09f1-76b9-8a57-6c6e55e9b438";
const WATER_CLASSIFICATION_ID = "01a0fc13-09f2-77bf-93db-1ceefb68082a";
const FUSE_SENSE_ID = "01a1070c-7c59-726e-88d6-cf9dc05adb73";
const SCHEMA_FILES = [
  "common.schema.json", "dataset.schema.json", "lexeme.schema.json", "sense.schema.json",
  "taxonomy.schema.json", "learning-set.schema.json", "media-asset.schema.json", "provenance.schema.json",
];
const CHILD_TYPES = ["TRANSLATION", "DEFINITION", "EXAMPLE", "EXAMPLE_TRANSLATION"] as const;
const CHILD_COLLECTIONS: Record<(typeof CHILD_TYPES)[number], { collection: string; idField: string }> = {
  TRANSLATION: { collection: "translations", idField: "translationId" },
  DEFINITION: { collection: "definitions", idField: "definitionId" },
  EXAMPLE: { collection: "examples", idField: "exampleId" },
  EXAMPLE_TRANSLATION: { collection: "exampleTranslations", idField: "exampleTranslationId" },
};

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function jsonText(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function abs(root: string, relative: string): string {
  return path.join(root, ...relative.split("/"));
}

function readJson<T>(root: string, relative: string): T {
  return JSON.parse(readFileSync(abs(root, relative), "utf8")) as T;
}

function recordArray(value: unknown): JsonObject[] {
  return Array.isArray(value) ? value.filter((item): item is JsonObject => Boolean(item) && typeof item === "object" && !Array.isArray(item)) : [];
}

function without(value: JsonObject, keys: string[]): JsonObject {
  const result = structuredClone(value) as JsonObject;
  for (const key of keys) delete result[key];
  return result;
}

function gitText(root: string, args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], windowsHide: true }).trim();
}

function gitBuffer(root: string, args: string[], input?: Buffer): Buffer {
  return execFileSync("git", args, { cwd: root, input, encoding: "buffer", stdio: ["pipe", "pipe", "pipe"], windowsHide: true, maxBuffer: 128 * 1024 * 1024 }) as Buffer;
}

function gitTreeFileHash(root: string, revision: string, relative: string): string {
  const content = gitBuffer(root, ["cat-file", "blob", `${revision}:${relative}`]);
  return sha256(content);
}

export function gitPackageTreeFingerprint(root: string, revision: string, packageRelative: string): string {
  const prefix = `${packageRelative}/`;
  const listing = gitBuffer(root, ["ls-tree", "-r", "-z", "--full-tree", revision, "--", packageRelative]).toString("utf8");
  const blobs = listing.split("\0").filter(Boolean).map((entry) => {
    const separator = entry.indexOf("\t");
    if (separator < 0) fail("GIT_TREE_ENTRY_INVALID", entry);
    const [objectType, objectId] = entry.slice(0, separator).split(" ").slice(1);
    const filePath = entry.slice(separator + 1);
    if (objectType !== "blob" || !objectId || !filePath.startsWith(prefix)) fail("GIT_TREE_BLOB_INVALID", entry);
    return { objectId, path: filePath.slice(prefix.length) };
  }).filter((item) => item.path !== RELEASE_EVIDENCE_RELATIVE && item.path !== "reports/release-candidate-evidence.json");
  const batchInput = Buffer.from(blobs.map((item) => item.objectId).join("\n") + "\n", "utf8");
  const batch = gitBuffer(root, ["cat-file", "--batch"], batchInput);
  let offset = 0;
  const entries: Array<{ path: string; sha256: string }> = [];
  for (const item of blobs) {
    const headerEnd = batch.indexOf(0x0a, offset);
    if (headerEnd < 0) fail("GIT_CAT_FILE_BATCH_HEADER_MISSING", item.path);
    const [objectId, objectType, sizeText] = batch.subarray(offset, headerEnd).toString("utf8").split(" ");
    const size = Number(sizeText);
    if (objectId !== item.objectId || objectType !== "blob" || !Number.isInteger(size) || size < 0) fail("GIT_CAT_FILE_BATCH_HEADER_INVALID", item.path);
    const contentStart = headerEnd + 1;
    const contentEnd = contentStart + size;
    if (batch[contentEnd] !== 0x0a) fail("GIT_CAT_FILE_BATCH_CONTENT_INVALID", item.path);
    entries.push({ path: item.path, sha256: sha256(batch.subarray(contentStart, contentEnd)) });
    offset = contentEnd + 1;
  }
  entries.sort((a, b) => a.path.localeCompare(b.path, "en"));
  return canonicalHash(entries);
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

function packageTreeFingerprint(packageRoot: string, excludedEvidence: string[] = [RELEASE_EVIDENCE_RELATIVE]): string {
  const excluded = new Set(excludedEvidence);
  const entries = directoryFiles(packageRoot)
    .filter((file) => !excluded.has(path.relative(packageRoot, file).split(path.sep).join("/")))
    .map((file) => {
      const content = readFileSync(file);
      const gitContent = content.includes(0) ? content : Buffer.from(content.toString("utf8").replace(/\r\n/g, "\n"), "utf8");
      return {
        path: path.relative(packageRoot, file).split(path.sep).join("/"),
        sha256: sha256(gitContent),
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path, "en"));
  return canonicalHash(entries);
}

export function buildSenseLifecycleRevision(predecessor: JsonObject, revision: number, timestamp: string, plannedTransitions: JsonObject[]): JsonObject {
  if (revision !== Number(predecessor.senseRevision) + 1) fail("SENSE_REVISION_NOT_NEXT", String(predecessor.masterSenseId));
  const next = structuredClone(predecessor) as JsonObject;
  const actual = currentChildRows(next);
  if (actual.length !== plannedTransitions.length) fail("CHILD_TRANSITION_COVERAGE_INVALID", String(predecessor.masterSenseId));
  for (const transition of plannedTransitions) {
    const child = actual.find((item) => item.type === transition.entityType && item.row[CHILD_COLLECTIONS[item.type].idField] === transition.childId);
    if (!child || child.row.status !== transition.from || transition.to !== "APPROVED" || !["DRAFT", "IN_REVIEW"].includes(String(transition.from))) {
      fail("CHILD_TRANSITION_STATUS_NOT_AUTHORIZED", `${String(transition.entityType)}:${String(transition.childId)}`);
    }
    child.row.status = "APPROVED";
  }
  next.senseRevision = revision;
  next.updatedAt = timestamp;
  if (next.status !== "APPROVED" || next.createdAt !== predecessor.createdAt || next.masterSenseId !== predecessor.masterSenseId
    || next.masterLexemeId !== predecessor.masterLexemeId || canonicalHash(withoutStatuses(predecessor)) !== canonicalHash(withoutStatuses(next))) {
    fail("SENSE_LIFECYCLE_ONLY_REVISION_MISMATCH", String(predecessor.masterSenseId));
  }
  return next;
}

function releaseHash(manifest: JsonObject): string {
  return canonicalHash(without(manifest, ["releaseHash"]));
}

function countPins(manifest: JsonObject): JsonObject {
  return {
    lexemes: manifest.includedLexemes?.length ?? 0,
    senses: manifest.includedSenses?.length ?? 0,
    classifications: manifest.includedClassifications?.length ?? 0,
    provenance: manifest.includedProvenance?.length ?? 0,
    taxonomy: manifest.includedTaxonomySnapshots?.length ?? 0,
    media: manifest.includedMediaAssets?.length ?? 0,
    mediaVersions: manifest.includedMediaAssetVersions?.length ?? 0,
    learningSets: manifest.includedLearningSets?.length ?? 0,
    relations: manifest.includedRelations?.length ?? 0,
  };
}

function canonicalTotals(manifest: JsonObject): JsonObject {
  return {
    lexemes: manifest.includedLexemes?.length ?? 0,
    senses: manifest.includedSenses?.length ?? 0,
    classifications: manifest.includedClassifications?.length ?? 0,
    provenance: manifest.includedProvenance?.length ?? 0,
    taxonomy: manifest.includedTaxonomySnapshots?.length ?? 0,
  };
}

function assertValidation(report: ValidationReport, label: string, expectedInfo: number): void {
  if (report.status !== "PASS" || report.errorCount !== 0 || report.warningCount !== 0 || report.infoCount !== expectedInfo) {
    fail(`${label}_VALIDATION_FAILED`, JSON.stringify({ status: report.status, errors: report.errorCount, warnings: report.warningCount, info: report.infoCount, issues: report.issues }));
  }
}

function validateSourceRelease(root: string): { manifest: JsonObject; treeFingerprint: string; validation: ValidationReport } {
  const sourceRoot = abs(root, RELEASE_RELATIVE);
  const manifest = readJson<JsonObject>(sourceRoot, "dataset.json");
  if (manifest.datasetVersion !== "2.2.0" || manifest.schemaVersion !== "2.0.1" || manifest.status !== "APPROVED") fail("SOURCE_RELEASE_IDENTITY_MISMATCH");
  const hashOne = releaseHash(manifest);
  const hashTwo = releaseHash(readJson<JsonObject>(sourceRoot, "dataset.json"));
  const treeOne = gitPackageTreeFingerprint(root, "HEAD", RELEASE_RELATIVE);
  const treeTwo = gitPackageTreeFingerprint(root, "origin/TXH", RELEASE_RELATIVE);
  if (hashOne !== SOURCE_RELEASE_HASH || hashTwo !== hashOne) fail("SOURCE_RELEASE_HASH_MISMATCH", hashOne);
  if (treeOne !== SOURCE_RELEASE_TREE || treeTwo !== treeOne) fail("SOURCE_RELEASE_TREE_MISMATCH", treeOne);
  if (canonicalHash(countPins(manifest)) !== canonicalHash(TARGET_COHORT)) fail("SOURCE_RELEASE_COHORT_MISMATCH");
  const validation = validateMasterVocabularyV2({ datasetRoot: sourceRoot, schemaRoot: path.join(sourceRoot, "schemas"), writeReport: false, validatedAt: manifest.releasedAt });
  assertValidation(validation, "SOURCE_RELEASE", 0);
  return { manifest, treeFingerprint: treeOne, validation };
}

function currentChildRows(sense: JsonObject): Array<{ type: (typeof CHILD_TYPES)[number]; row: JsonObject; exampleId?: string }> {
  const rows: Array<{ type: (typeof CHILD_TYPES)[number]; row: JsonObject; exampleId?: string }> = [];
  for (const type of CHILD_TYPES) {
    const spec = CHILD_COLLECTIONS[type];
    if (type === "EXAMPLE_TRANSLATION") {
      for (const example of recordArray(sense.examples)) {
        for (const row of recordArray(example.exampleTranslations)) rows.push({ type, row, exampleId: String(example.exampleId ?? "") });
      }
    } else {
      for (const row of recordArray(sense[spec.collection])) rows.push({ type, row });
    }
  }
  return rows;
}

function withoutStatuses(value: unknown, root = true): unknown {
  if (Array.isArray(value)) return value.map((item) => withoutStatuses(item, false));
  if (!value || typeof value !== "object") return value;
  const result: JsonObject = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "status") continue;
    if (root && ["senseRevision", "updatedAt"].includes(key)) continue;
    result[key] = withoutStatuses(item, false);
  }
  return result;
}

function collectProvenanceIds(value: unknown, result: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectProvenanceIds(item, result);
  } else if (value && typeof value === "object") {
    for (const [key, item] of Object.entries(value)) {
      if (key === "provenanceIds" && Array.isArray(item)) result.push(...item.filter((id): id is string => typeof id === "string"));
      else collectProvenanceIds(item, result);
    }
  }
  return result;
}

function ceFRSummary(root: string, manifest: JsonObject): JsonObject {
  const counts: JsonObject = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, UNCLASSIFIED: 0 };
  const records = recordArray(manifest.includedClassifications).map((pin) => readJson<JsonObject>(root, `${DATASET_RELATIVE}/${String(pin.recordPath)}`));
  const bySense = new Map(records.filter((row) => row.dimension === "CEFR").map((row) => [String(row.masterSenseId), row]));
  for (const sensePin of recordArray(manifest.includedSenses)) {
    const row = bySense.get(String(sensePin.masterSenseId));
    const value = row ? String(row.valueCode) : "UNCLASSIFIED";
    counts[value] = (counts[value] ?? 0) + 1;
  }
  for (const key of Object.keys(counts)) if (counts[key] === 0) delete counts[key];
  return counts;
}

function assertTaxonomyAndCefr(root: string, releaseManifest: JsonObject): JsonObject {
  const taxonomyPin = recordArray(releaseManifest.includedTaxonomySnapshots)[0];
  if (!taxonomyPin || taxonomyPin.taxonomyId !== TAXONOMY_ID || taxonomyPin.taxonomyVersion !== "2.0.1" || taxonomyPin.contentHash !== TAXONOMY_HASH) fail("TAXONOMY_PIN_MISMATCH");
  const taxonomy = readJson<JsonObject>(root, `${DATASET_RELATIVE}/${String(taxonomyPin.recordPath)}`);
  if (canonicalHash(taxonomy) !== TAXONOMY_HASH) fail("TAXONOMY_CONTENT_HASH_MISMATCH");
  const distribution = ceFRSummary(root, releaseManifest);
  if (canonicalHash(distribution) !== canonicalHash(EXPECTED_CEFR)) fail("CEFR_DISTRIBUTION_DRIFT", JSON.stringify(distribution));
  const light = recordArray(releaseManifest.includedClassifications).find((pin) => pin.classificationId === LIGHT_CLASSIFICATION_ID);
  const water = recordArray(releaseManifest.includedClassifications).find((pin) => pin.classificationId === WATER_CLASSIFICATION_ID);
  if (!light || light.classificationRevision !== 3 || !water || water.classificationRevision !== 2) fail("LIGHT_WATER_CLASSIFICATION_PIN_DRIFT");
  const lightRecord = readJson<JsonObject>(root, `${DATASET_RELATIVE}/${String(light.recordPath)}`);
  const waterRecord = readJson<JsonObject>(root, `${DATASET_RELATIVE}/${String(water.recordPath)}`);
  if (lightRecord.dimension !== "CEFR" || lightRecord.valueCode !== "A1" || waterRecord.dimension !== "CEFR" || waterRecord.valueCode !== "A2") fail("LIGHT_WATER_CEFR_DRIFT");
  if (recordArray(releaseManifest.includedClassifications).some((pin) => {
    const row = readJson<JsonObject>(root, `${DATASET_RELATIVE}/${String(pin.recordPath)}`);
    return row.masterSenseId === FUSE_SENSE_ID && row.dimension === "CEFR";
  })) fail("FUSE_MUST_REMAIN_UNCLASSIFIED");
  return distribution;
}

function rcState(root: string): { fingerprint: string; treeFingerprint: string } {
  const packageRoot = abs(root, RC_RELATIVE);
  const manifest = readJson<JsonObject>(packageRoot, "dataset.json");
  const pins: JsonObject[] = [];
  for (const field of ["includedLexemes", "includedSenses", "includedClassifications", "includedTaxonomySnapshots", "includedProvenance"]) {
    for (const pin of recordArray(manifest[field])) pins.push({ recordPath: pin.recordPath, contentHash: pin.contentHash });
  }
  pins.sort((a, b) => String(a.recordPath).localeCompare(String(b.recordPath), "en"));
  const schemaHashes = SCHEMA_FILES.map((file) => ({ path: `schemas/${file}`, sha256: gitTreeFileHash(root, "HEAD", `${RC_RELATIVE}/schemas/${file}`) }));
  const auth = readJson<JsonObject>(root, `${DATASET_RELATIVE}/workspaces/hybrid-100-release-candidate/authorization.json`);
  const rcSummary = readJson<JsonObject>(root, `${DATASET_RELATIVE}/workspaces/hybrid-100-release-candidate/summary.json`);
  const taxonomyPin = recordArray(manifest.includedTaxonomySnapshots)[0];
  const fingerprint = canonicalHash({
    artifactType: "RELEASE_CANDIDATE_FINGERPRINT",
    candidateManifest: manifest,
    candidateDataPins: pins,
    schemaHashes,
    taxonomyHash: taxonomyPin.contentHash,
    authorizationFingerprint: canonicalHash(auth),
    canonicalPromotionPlanFingerprint: rcSummary.canonicalPromotionPlanFingerprint,
  });
  return { fingerprint, treeFingerprint: gitPackageTreeFingerprint(root, "HEAD", RC_RELATIVE) };
}

function assertHistoricalImmutability(root: string): JsonObject {
  const rc = rcState(root);
  if (rc.fingerprint !== RC_FINGERPRINT || rc.treeFingerprint !== RC_TREE_FINGERPRINT) fail("RC_IMMUTABILITY_VIOLATION", JSON.stringify(rc));
  const canary = assertCanaryRepositoryState(root);
  if (canary.headCanaryGitTreeSha !== CANARY_TREE || canary.canaryCommittedTreeFingerprint !== CANARY_FINGERPRINT || canary.lastCanaryCommit !== CANARY_LAST_COMMIT) {
    fail("CANARY_IMMUTABILITY_VIOLATION", JSON.stringify(canary));
  }
  const taxonomy20Path = `${DATASET_RELATIVE}/taxonomy/${TAXONOMY_ID}-2.0.0.json`;
  const taxonomy20 = readJson<JsonObject>(root, taxonomy20Path);
  if (canonicalHash(taxonomy20) !== "67ecd13e49e756df6fce2def9f40fe11eb8831ef9a68097299d37324ac588b79") fail("TAXONOMY_2_0_0_IMMUTABILITY_VIOLATION");
  return { rcFingerprint: rc.fingerprint, rcTreeFingerprint: rc.treeFingerprint, canaryGitTree: canary.headCanaryGitTreeSha, canaryCommittedFingerprint: canary.canaryCommittedTreeFingerprint, taxonomy20Hash: canonicalHash(taxonomy20) };
}

function assertPreWriteBaseline(root: string): void {
  const head = gitText(root, ["rev-parse", "HEAD"]);
  const localRemote = gitText(root, ["rev-parse", "origin/TXH"]);
  const liveRemote = gitText(root, ["ls-remote", "origin", "refs/heads/TXH"]).split(/\s+/)[0];
  const parent = gitText(root, ["rev-parse", "HEAD^"]);
  const subject = gitText(root, ["show", "-s", "--format=%s", "HEAD"]);
  const firstExecutionParent = gitText(root, ["rev-parse", `${FIRST_EXECUTION_BASELINE}^`]);
  const firstExecutionSubject = gitText(root, ["show", "-s", "--format=%s", FIRST_EXECUTION_BASELINE]);
  const currentCommitFiles = gitText(root, ["diff-tree", "--no-commit-id", "--name-only", "-r", `${EXECUTION_BASELINE}^`, EXECUTION_BASELINE])
    .split(/\r?\n/).filter(Boolean).sort();
  const expectedCurrentCommitFiles = [
    "apps/web/src/features/search/global-search-palette.tsx",
    "apps/web/src/features/search/global-search.test.tsx",
  ].sort();
  if (head !== EXECUTION_BASELINE || localRemote !== EXECUTION_BASELINE || liveRemote !== EXECUTION_BASELINE
    || parent !== FIRST_EXECUTION_BASELINE || subject !== "fix: add clear search empty action"
    || firstExecutionParent !== AUTHORIZED_BASELINE || firstExecutionSubject !== "feat: standardize async states"
    || canonicalHash(currentCommitFiles) !== canonicalHash(expectedCurrentCommitFiles)) {
    fail("AUTHORIZED_BASELINE_MOVED", JSON.stringify({ head, parent, subject, firstExecutionParent, firstExecutionSubject, localRemote, liveRemote, currentCommitFiles }));
  }
  const expectedTrees: Record<string, string> = {
    [DATASET_RELATIVE]: DATASET_TREE,
    [`${DATASET_RELATIVE}/dataset.json`]: DATASET_MANIFEST_BLOB,
    [`${DATASET_RELATIVE}/master`]: CANONICAL_MASTER_TREE,
    [`${DATASET_RELATIVE}/taxonomy`]: TAXONOMY_TREE,
    [RELEASE_RELATIVE]: SOURCE_RELEASE_GIT_TREE,
    [RC_RELATIVE]: RC_GIT_TREE,
    [`${DATASET_RELATIVE}/releases/canary-v2.1.0`]: CANARY_TREE,
    [`${CLOSURE_WORKSPACE_RELATIVE}`]: AUDIT_WORKSPACE_GIT_TREE,
    [`${DATASET_RELATIVE}/workspaces/hybrid-100-runtime-reconciliation`]: PREFLIGHT_WORKSPACE_GIT_TREE,
  };
  for (const [treePath, expected] of Object.entries(expectedTrees)) {
    for (const revision of [AUTHORIZED_BASELINE, FIRST_EXECUTION_BASELINE, EXECUTION_BASELINE, "origin/TXH"]) {
      const actualTree = gitText(root, ["rev-parse", `${revision}:${treePath}`]);
      if (actualTree !== expected) fail("AUTHORIZED_DATASET_STATE_CHANGED", JSON.stringify({ revision, treePath, actualTree, expected }));
    }
  }
  const changedDatasetPaths = gitText(root, ["diff", "--name-only", "HEAD", "--", DATASET_RELATIVE]);
  const untrackedDatasetPaths = gitText(root, ["ls-files", "--others", "--exclude-standard", "--", DATASET_RELATIVE]);
  if (changedDatasetPaths || untrackedDatasetPaths) fail("AUTHORIZED_DATASET_WORKTREE_DIRTY", JSON.stringify({ changedDatasetPaths, untrackedDatasetPaths }));
}

function makeTraceIndex(trace: JsonObject): Map<string, JsonObject> {
  const result = new Map<string, JsonObject>();
  for (const sense of recordArray(trace.senses)) {
    for (const row of recordArray(sense.childRows)) {
      const key = `${String(row.entityType)}:${String(row.childId)}`;
      if (result.has(key)) fail("AUDITED_CHILD_ID_DUPLICATE", key);
      result.set(key, row);
    }
  }
  return result;
}

function verifyChildTraceMatch(sense: JsonObject, traceRow: JsonObject, type: string, child: JsonObject, exampleId?: string): void {
  const expectedId = String(traceRow.childId);
  const idField = CHILD_COLLECTIONS[type as (typeof CHILD_TYPES)[number]]?.idField;
  if (!idField || child[idField] !== expectedId) fail("AUDITED_CHILD_ID_SOURCE_MISMATCH", `${type}:${expectedId}`);
  const keys = type === "EXAMPLE_TRANSLATION"
    ? ["language", "text", "displayOrder", "isPreferred", "provenanceIds", "exampleId"]
    : ["masterSenseId", "language", "text", "displayOrder", "provenanceIds"];
  for (const key of keys) {
    if (traceRow[key] !== undefined && (child[key] === undefined || canonicalHash(child[key]) !== canonicalHash(traceRow[key]))) {
      fail("AUDITED_CHILD_FIELD_DRIFT", `${type}:${expectedId}:${key}`);
    }
  }
  if (type === "TRANSLATION" && child.translationKind !== traceRow.contentKind) fail("AUDITED_CHILD_FIELD_DRIFT", `${type}:${expectedId}:translationKind`);
  if (type === "DEFINITION" && child.definitionKind !== traceRow.contentKind) fail("AUDITED_CHILD_FIELD_DRIFT", `${type}:${expectedId}:definitionKind`);
  if (type === "EXAMPLE" && child.register !== traceRow.contentKind) fail("AUDITED_CHILD_FIELD_DRIFT", `${type}:${expectedId}:register`);
  if (traceRow.masterSenseId !== sense.masterSenseId || traceRow.masterLexemeId !== sense.masterLexemeId) fail("AUDITED_CHILD_OWNER_TRACE_DRIFT", `${type}:${expectedId}`);
  if (type === "DEFINITION" && traceRow.isPreferred !== null) fail("AUDITED_CHILD_TRACE_SHAPE_INVALID", `${type}:${expectedId}:isPreferred`);
  if (type === "EXAMPLE" && traceRow.isPreferred !== null) fail("AUDITED_CHILD_TRACE_SHAPE_INVALID", `${type}:${expectedId}:isPreferred`);
  if (child.status !== traceRow.currentStatus || traceRow.plannedStatus !== "APPROVED") fail("AUDITED_CHILD_STATUS_DRIFT", `${type}:${expectedId}`);
  if (exampleId && child.exampleId !== exampleId) fail("EXAMPLE_TRANSLATION_OWNER_DRIFT", expectedId);
  if (type !== "EXAMPLE_TRANSLATION" && child.masterSenseId !== sense.masterSenseId) fail("CHILD_SENSE_OWNER_DRIFT", expectedId);
}

interface BuildPlan {
  rootManifest: JsonObject;
  sourceManifest: JsonObject;
  nextRecords: Array<{ id: string; fromPath: string; toPath: string; record: JsonObject; sourceRecord: JsonObject; pin: JsonObject }>;
  targetRootManifest: JsonObject;
  releaseManifest: JsonObject;
  trace: JsonObject;
  simulation: JsonObject;
  revisionsPlan: JsonObject;
  patchPlan: JsonObject;
  cefr: JsonObject;
  invariants: JsonObject;
  timestamp: string;
}

function buildPlan(root: string, timestamp: string): BuildPlan {
  const { manifest: sourceManifest } = validateSourceRelease(root);
  const historicalManifest = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/manifest.json`);
  const validationSummary = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/validation-summary.json`);
  const trace = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/owner-review-trace.json`);
  const revisionsPlan = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/sense-revision-plan.json`);
  const patchPlan = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/patch-release-2.2.1-plan.json`);
  const simulation = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/runtime-projection-simulation.json`);
  if (historicalManifest.artifactType !== "HYBRID_100_RUNTIME_ELIGIBILITY_CLOSURE_MANIFEST"
    || historicalManifest.authorization?.nestedChildApprovalAuthorized !== false
    || historicalManifest.authorization?.senseRevisionMaterializationAuthorized !== false
    || historicalManifest.authorization?.patchRelease221BuildAuthorized !== false) fail("HISTORICAL_AUDIT_AUTHORIZATION_WAS_REWRITTEN");
  if (validationSummary.status !== "PASS" || validationSummary.phase2G1AReady !== true || validationSummary.runtimeEligibilityClosureTechnicallyReady !== true) fail("PHASE_2G1A_NOT_TECHNICALLY_READY");
  if (validationSummary.semanticDraftFingerprint?.verified !== true || validationSummary.semanticDraftFingerprint?.computed !== SEMANTIC_DRAFT_FINGERPRINT
    || historicalManifest.semanticDraftFingerprint !== SEMANTIC_DRAFT_FINGERPRINT || trace.semanticDraftFingerprint !== SEMANTIC_DRAFT_FINGERPRINT
    || revisionsPlan.learnerFacingDrift !== 0 || revisionsPlan.identityDrift !== 0 || revisionsPlan.provenanceDrift !== 0
    || revisionsPlan.orderingDrift !== 0 || revisionsPlan.preferredSelectionDrift !== 0) fail("SEMANTIC_SOURCE_OR_DRIFT_GATE_FAILED");
  if (trace.nestedChildApprovalAuthorized !== false) fail("HISTORICAL_CHILD_AUTHORIZATION_FLAG_MISMATCH");
  const traceSummary = trace.summary ?? {};
  if (trace.issues?.length !== 0 || traceSummary.childRowsTraced !== 400 || traceSummary.childRowsPassed !== 400 || traceSummary.childRowsBlocked !== 0
    || traceSummary.provenanceReferencesValidated !== 400 || traceSummary.uniqueChildIds !== 400) fail("OWNER_TRACE_NOT_400_OF_400");
  if (canonicalHash(traceSummary.childRowsByType) !== canonicalHash({ TRANSLATION: 100, DEFINITION: 100, EXAMPLE: 100, EXAMPLE_TRANSLATION: 100 })) fail("OWNER_TRACE_CHILD_TYPE_COUNTS_MISMATCH");
  if (revisionsPlan.exactSenseRevisionCount !== 100 || revisionsPlan.revisions?.length !== 100 || revisionsPlan.stableSenseIdsPreserved !== true
    || revisionsPlan.materializationAuthorized !== false) fail("SENSE_REVISION_PLAN_INVALID");
  if (patchPlan.plannedSenseRevisionCount !== 100 || patchPlan.plannedSenseRevisions?.length !== 100 || patchPlan.targetReleasePlan?.datasetVersion !== "2.2.1"
    || patchPlan.targetReleasePlan?.versionBump !== "PATCH" || patchPlan.targetReleasePlan?.created !== false
    || patchPlan.authorization?.nestedChildApprovalAuthorized !== false || patchPlan.authorization?.senseRevisionMaterializationAuthorized !== false
    || patchPlan.authorization?.patchReleaseBuildAuthorized !== false) fail("PATCH_RELEASE_PLAN_INVALID");
  if (simulation.inMemoryOnly !== true || simulation.generatedArtifactWritten !== false || simulation.importEligible !== true
    || simulation.projectedSenses !== 100 || simulation.skippedSenses !== 0
    || simulation.appImportContractVersion !== APP_IMPORT_CONTRACT_VERSION || simulation.projectionContractVersion !== RUNTIME_PROJECTION_CONTRACT_VERSION
    || canonicalHash(simulation.runtimeFieldCounts) !== canonicalHash({ vietnameseNonNull: 100, definitionEnNonNull: 100, exampleEnNonNull: 100, ipaNonNull: 0 })) fail("RUNTIME_SIMULATION_NOT_READY");
  const simInvariant = simulation.invariantChecks ?? {};
  if (["learnerFacingAndIdentityFingerprint", "childProvenanceReferenceFingerprint", "lexemePinFingerprint", "classificationPinFingerprint", "taxonomyFingerprint"]
    .some((key) => simInvariant[key]?.unchanged !== true || simInvariant[key]?.before !== simInvariant[key]?.after)) fail("AUDITED_RUNTIME_SIMULATION_DRIFT");
  const simRows = recordArray(simulation.perSense);
  if (simRows.length !== 100 || new Set(simRows.map((row) => row.masterSenseId)).size !== 100) fail("RUNTIME_SIMULATION_SENSE_COVERAGE_INVALID");

  const rootManifest = readJson<JsonObject>(root, `${DATASET_RELATIVE}/dataset.json`);
  if (rootManifest.datasetVersion !== "2.0.0" || rootManifest.schemaVersion !== "2.0.1" || rootManifest.status !== "DRAFT" || "releaseHash" in rootManifest) fail("CANONICAL_ROOT_IDENTITY_MISMATCH");
  if (canonicalHash(canonicalTotals(rootManifest)) !== canonicalHash({ lexemes: 103, senses: 123, classifications: 219, provenance: 1043, taxonomy: 1 })) fail("CANONICAL_ROOT_TOTALS_MISMATCH");
  if (canonicalHash(countPins(sourceManifest)) !== canonicalHash(TARGET_COHORT)) fail("SOURCE_RELEASE_COHORT_MISMATCH");
  const sourceSenses = recordArray(sourceManifest.includedSenses);
  const rootSensePins = recordArray(rootManifest.includedSenses);
  const rootPinById = new Map(rootSensePins.map((pin) => [String(pin.masterSenseId), pin]));
  const sourcePinById = new Map(sourceSenses.map((pin) => [String(pin.masterSenseId), pin]));
  const traceByKey = makeTraceIndex(trace);
  const nextRecords: BuildPlan["nextRecords"] = [];
  const revisionById = new Map(recordArray(revisionsPlan.revisions).map((row) => [String(row.masterSenseId), row]));
  if (revisionById.size !== 100 || sourcePinById.size !== 100) fail("SOURCE_SENSE_COHORT_NOT_100");
  const aggregateStatuses: Record<string, Record<string, number>> = {};

  for (const plannedSense of recordArray(trace.senses)) {
    const senseId = String(plannedSense.masterSenseId);
    const revisionRow = revisionById.get(senseId);
    const sourcePin = sourcePinById.get(senseId);
    const canonicalPin = rootPinById.get(senseId);
    if (!revisionRow || !sourcePin || !canonicalPin) fail("PLANNED_SENSE_PIN_MISSING", senseId);
    if (canonicalHash(sourcePin) !== canonicalHash(canonicalPin)) fail("SOURCE_AND_CANONICAL_SENSE_PIN_DIVERGENCE", senseId);
    const sourceRecord = readJson<JsonObject>(root, `${RELEASE_RELATIVE}/${String(sourcePin.recordPath)}`);
    const canonicalRecord = readJson<JsonObject>(root, `${DATASET_RELATIVE}/${String(canonicalPin.recordPath)}`);
    if (canonicalHash(sourceRecord) !== sourcePin.contentHash || canonicalHash(canonicalRecord) !== canonicalPin.contentHash
      || sourceRecord.masterSenseId !== senseId || sourceRecord.masterLexemeId !== plannedSense.masterLexemeId
      || sourceRecord.senseRevision !== revisionRow.currentSenseRevision || sourceRecord.status !== "APPROVED") fail("SOURCE_SENSE_PREDECESSOR_MISMATCH", senseId);
    if (revisionRow.masterLexemeId !== sourceRecord.masterLexemeId || revisionRow.plannedSenseRevision !== revisionRow.currentSenseRevision + 1
      || revisionRow.currentParentStatus !== "APPROVED" || revisionRow.plannedParentStatus !== "APPROVED" || revisionRow.learnerFacingDrift !== 0) fail("SENSE_REVISION_ROW_INVALID", senseId);
    if (plannedSense.sourceSenseRevision !== revisionRow.currentSenseRevision || plannedSense.nextSenseRevision !== revisionRow.plannedSenseRevision
      || plannedSense.ownerContentReviewPass !== true || plannedSense.parentSemanticMatch !== true) fail("OWNER_TRACE_SENSE_PLAN_MISMATCH", senseId);
    const actualChildren = currentChildRows(sourceRecord);
    const planTransitions = recordArray(revisionRow.childStatusTransitions);
    if (planTransitions.length !== 4 || actualChildren.length !== 4) fail("CHILD_TRANSITION_COVERAGE_INVALID", senseId);
    const transitionIds = new Set<string>();
    const expectedTypes = new Set<string>();
    for (const child of actualChildren) {
      const idField = CHILD_COLLECTIONS[child.type].idField;
      const childId = String(child.row[idField] ?? "");
      const key = `${child.type}:${childId}`;
      const auditRow = traceByKey.get(key);
      const plannedTransition = planTransitions.find((transition) => transition.entityType === child.type && transition.childId === childId);
      if (!auditRow || !plannedTransition || transitionIds.has(childId)) fail("AUDITED_CHILD_NOT_EXACTLY_PLANNED", key);
      verifyChildTraceMatch(sourceRecord, auditRow, child.type, child.row, child.exampleId);
      if (plannedTransition.from !== child.row.status || plannedTransition.to !== "APPROVED"
        || auditRow.currentStatus !== plannedTransition.from || auditRow.plannedStatus !== plannedTransition.to) fail("CHILD_TRANSITION_STATUS_NOT_AUTHORIZED", key);
      if (!["DRAFT", "IN_REVIEW"].includes(String(child.row.status))) fail("CHILD_STATUS_NOT_PROMOTABLE", key);
      (aggregateStatuses[child.type] ??= {})[String(child.row.status)] = ((aggregateStatuses[child.type] ??= {})[String(child.row.status)] ?? 0) + 1;
      transitionIds.add(childId);
      expectedTypes.add(child.type);
    }
    if (transitionIds.size !== 4 || expectedTypes.size !== 4) fail("PER_SENSE_CHILD_TRANSITIONS_NOT_EXACT", senseId);
    const next = buildSenseLifecycleRevision(sourceRecord, revisionRow.plannedSenseRevision, timestamp, planTransitions);
    if (canonicalHash(collectProvenanceIds(sourceRecord).sort()) !== canonicalHash(collectProvenanceIds(next).sort())) fail("SENSE_PROVENANCE_DRIFT", senseId);
    const targetPath = `master/senses/${senseId}-r${revisionRow.plannedSenseRevision}.json`;
    const actualCanonicalPin = rootPinById.get(senseId);
    if (targetPath !== `master/senses/${senseId}-r${Number(sourceRecord.senseRevision) + 1}.json` || !actualCanonicalPin) fail("NEXT_SENSE_REVISION_PATH_MISMATCH", senseId);
    nextRecords.push({ id: senseId, fromPath: String(sourcePin.recordPath), toPath: targetPath, record: next, sourceRecord, pin: sourcePin });
  }
  if (traceByKey.size !== 400 || nextRecords.length !== 100 || new Set(nextRecords.map((row) => row.id)).size !== 100) fail("AUDITED_TARGET_COVERAGE_MISMATCH");
  for (const type of CHILD_TYPES) {
    if (canonicalHash(aggregateStatuses[type] ?? {}) !== canonicalHash({ DRAFT: 98, IN_REVIEW: 2 })) fail("CHILD_STATUS_INVENTORY_MISMATCH", type);
  }
  const targetPathSet = new Set(nextRecords.map((row) => row.toPath));
  if (targetPathSet.size !== 100) fail("TARGET_REVISION_PATH_DUPLICATE");
  const releaseExists = existsSync(abs(root, TARGET_RELEASE_RELATIVE));
  const existingTargets = nextRecords.filter((row) => existsSync(abs(root, `${DATASET_RELATIVE}/${row.toPath}`)));
  const phaseArtifactsExist = [AUTHORIZATION_RELATIVE, PLAN_RELATIVE, SUMMARY_RELATIVE, VALIDATION_RELATIVE, REPORT_RELATIVE].some((file) => existsSync(abs(root, file)));
  if (releaseExists || existingTargets.length || phaseArtifactsExist) fail("MATERIALIZATION_ALREADY_PRESENT_OR_PARTIAL");

  const targetRootManifest = structuredClone(rootManifest) as JsonObject;
  const updates = new Map(nextRecords.map((row) => [row.id, row]));
  targetRootManifest.includedSenses = rootSensePins.map((pin) => {
    const next = updates.get(String(pin.masterSenseId));
    return next ? { ...pin, senseRevision: next.record.senseRevision, recordPath: next.toPath, contentHash: canonicalHash(next.record) } : pin;
  });
  if (canonicalHash(without(targetRootManifest, ["includedSenses"])) !== canonicalHash(without(rootManifest, ["includedSenses"]))) fail("CANONICAL_ROOT_NON_SENSE_CHANGE");
  const releaseManifest = structuredClone(sourceManifest) as JsonObject;
  releaseManifest.datasetVersion = "2.2.1";
  releaseManifest.status = "APPROVED";
  releaseManifest.createdAt = timestamp;
  releaseManifest.releasedAt = timestamp;
  releaseManifest.releaseHashAlgorithm = TARGET_RELEASE_HASH_ALGORITHM;
  releaseManifest.changeSummary = [
    { language: "en", text: "PATCH runtime-eligibility lifecycle closure for Hybrid-100: the same 87 Lexemes and 100 reviewed Senses retain the same learner-facing semantic content, the same 99 editorial CEFR classifications and taxonomy 2.0.1. Exactly 400 nested reviewed learner-facing child records are promoted to APPROVED, and 100 parent Sense revisions advance only to record that lifecycle closure. No pronunciation or media is bundled. Source rights remain unverified; no source prose or media is reused. No runtime import is included in this release." },
    { language: "vi", text: "Bản PATCH đóng vòng đời để Hybrid-100 đủ điều kiện chiếu runtime: giữ nguyên 87 Lexeme, 100 Sense đã rà soát, nội dung ngữ nghĩa hướng tới người học, 99 phân loại CEFR biên tập và taxonomy 2.0.1. Chính xác 400 bản ghi con hướng tới người học đã rà soát được chuyển sang APPROVED; 100 phiên bản Sense cha chỉ tăng để ghi nhận việc đóng vòng đời này. Không đóng gói phát âm hay media. Quyền đối với nguồn vẫn chưa được xác minh; không tái sử dụng văn bản hay media từ nguồn. Bản phát hành này không bao gồm nhập runtime." },
  ];
  const revisedPins = new Map(nextRecords.map((row) => [row.id, { masterSenseId: row.id, senseRevision: row.record.senseRevision, recordPath: row.toPath, contentHash: canonicalHash(row.record) }]));
  releaseManifest.includedSenses = recordArray(sourceManifest.includedSenses).map((pin) => {
    const revised = revisedPins.get(String(pin.masterSenseId));
    if (!revised) fail("RELEASE_SENSE_COHORT_ADDITION_OR_REMOVAL", String(pin.masterSenseId));
    return revised;
  });
  releaseManifest.releaseHash = releaseHash(releaseManifest);
  if (canonicalHash(countPins(releaseManifest)) !== canonicalHash(TARGET_COHORT)) fail("TARGET_RELEASE_COHORT_MISMATCH");
  const cefr = assertTaxonomyAndCefr(root, releaseManifest);
  const immutability = assertHistoricalImmutability(root);
  return {
    rootManifest,
    sourceManifest,
    nextRecords,
    targetRootManifest,
    releaseManifest,
    trace,
    simulation,
    revisionsPlan,
    patchPlan,
    cefr,
    invariants: immutability,
    timestamp,
  };
}

function projectionCheck(releaseRoot: string, simulation: JsonObject): JsonObject {
  const validation = validateMasterVocabularyV2({ datasetRoot: releaseRoot, schemaRoot: path.join(releaseRoot, "schemas"), writeReport: false, validatedAt: "2000-01-01T00:00:00Z" });
  assertValidation(validation, "TARGET_RELEASE", 0);
  const graph = loadPinnedMasterProjectionGraph(releaseRoot);
  const artifacts = buildAppImportV2(graph, "RELEASE");
  const projected = recordArray(artifacts.vocabulary.records);
  const expected = recordArray(simulation.perSense);
  const actualById = new Map(projected.map((row) => [String(row.masterSenseId), row]));
  if (projected.length !== 100 || actualById.size !== 100 || expected.length !== 100) fail("RUNTIME_RELEASE_PROJECTION_COUNT_MISMATCH");
  let vietnamese = 0;
  let definitionEn = 0;
  let exampleEn = 0;
  let ipa = 0;
  for (const expectedRow of expected) {
    const actual = actualById.get(String(expectedRow.masterSenseId));
    if (!actual || expectedRow.projected !== true) fail("RUNTIME_SIMULATION_SENSE_MISSING", String(expectedRow.masterSenseId));
    const runtime = actual.runtimeProjection as JsonObject;
    if (actual.masterProjectionFingerprint !== expectedRow.projectionFingerprint) fail("RUNTIME_PROJECTION_FINGERPRINT_DRIFT", String(expectedRow.masterSenseId));
    if ((typeof runtime.vietnamese === "string" && runtime.vietnamese.length > 0) !== expectedRow.vietnameseNonNull
      || (typeof runtime.definitionEn === "string" && runtime.definitionEn.length > 0) !== expectedRow.definitionEnNonNull
      || (typeof runtime.exampleEn === "string" && runtime.exampleEn.length > 0) !== expectedRow.exampleEnNonNull
      || (runtime.ipa !== null) !== expectedRow.ipaNonNull) fail("RUNTIME_PROJECTION_FIELD_DRIFT", String(expectedRow.masterSenseId));
    if (runtime.enabled !== true || runtime.imageUrl !== null || runtime.audioUrl !== null) fail("RUNTIME_RELEASE_BOUNDARY_OR_MEDIA_DRIFT", String(expectedRow.masterSenseId));
    if (runtime.vietnamese !== null) vietnamese += 1;
    if (runtime.definitionEn !== null) definitionEn += 1;
    if (runtime.exampleEn !== null) exampleEn += 1;
    if (runtime.ipa !== null) ipa += 1;
  }
  const importEligible = artifacts.report.includes("- importEligible: true");
  if (!importEligible || vietnamese !== 100 || definitionEn !== 100 || exampleEn !== 100 || ipa !== 0) fail("RUNTIME_RELEASE_READINESS_FAILED");
  return {
    appImportContractVersion: APP_IMPORT_CONTRACT_VERSION,
    projectionContractVersion: RUNTIME_PROJECTION_CONTRACT_VERSION,
    projectedSenses: projected.length,
    skippedSenses: 0,
    importEligible,
    runtimeFieldCounts: { vietnameseNonNull: vietnamese, definitionEnNonNull: definitionEn, exampleEnNonNull: exampleEn, ipaNonNull: ipa },
    matchesAuditedSimulation: true,
    semanticDrift: 0,
    projectionFingerprints: Object.fromEntries(projected.map((row) => [String(row.masterSenseId), row.masterProjectionFingerprint])),
    validator: { status: validation.status, errors: validation.errorCount, warnings: validation.warningCount, info: validation.infoCount },
  };
}

function releaseEvidence(plan: BuildPlan, treeFingerprint: string, projection: JsonObject): JsonObject {
  return {
    artifactType: "HYBRID_100_RUNTIME_ELIGIBLE_PATCH_RELEASE_EVIDENCE",
    datasetVersion: "2.2.1",
    status: "APPROVED",
    versionBump: "PATCH",
    sourceReleaseVersion: "2.2.0",
    sourceReleaseHash: SOURCE_RELEASE_HASH,
    sourceReleaseTreeFingerprint: SOURCE_RELEASE_TREE,
    phase2G1ABaseline: AUTHORIZED_BASELINE,
    ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE,
    firstExecutionBaseline: FIRST_EXECUTION_BASELINE,
    currentExecutionBaseline: EXECUTION_BASELINE,
    remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS,
    semanticDraftFingerprint: SEMANTIC_DRAFT_FINGERPRINT,
    nestedRowsAudited: 400,
    nestedRowsPromoted: 400,
    nestedRowsPromotedByType: { TRANSLATION: 100, DEFINITION: 100, EXAMPLE: 100, EXAMPLE_TRANSLATION: 100 },
    senseRevisionsCreated: 100,
    stableSenseIdsPreserved: true,
    stableChildIdsPreserved: true,
    newEntityIds: 0,
    newProvenanceIds: 0,
    learnerFacingSemanticDrift: 0,
    identityDrift: 0,
    provenanceDrift: 0,
    orderingDrift: 0,
    preferredSelectionDrift: 0,
    cefrDrift: 0,
    cefrDistribution: plan.cefr,
    taxonomyDrift: 0,
    taxonomyHash: TAXONOMY_HASH,
    runtimeReleaseProjectionReady: true,
    runtimeProjection: {
      appImportContractVersion: projection.appImportContractVersion,
      projectionContractVersion: projection.projectionContractVersion,
      projectedSenses: projection.projectedSenses,
      skippedSenses: projection.skippedSenses,
      importEligible: projection.importEligible,
      runtimeFieldCounts: projection.runtimeFieldCounts,
      matchesAuditedSimulation: projection.matchesAuditedSimulation,
      semanticDrift: projection.semanticDrift,
    },
    runtimeImportExecuted: false,
    runtimeImportAuthorized: false,
    databaseConnection: "NONE",
    databaseWrites: "NONE",
    productionConnection: "NONE",
    productionMutation: false,
    sourceRightsVerified: false,
    sourceTextReused: false,
    sourceMediaReused: false,
    releaseHashAlgorithm: TARGET_RELEASE_HASH_ALGORITHM,
    releaseHash: plan.releaseManifest.releaseHash,
    releaseTreeFingerprint: treeFingerprint,
    releaseTreeFingerprintExcludesSelfReferentialEvidenceFile: true,
    createdAt: plan.timestamp,
    releasedAt: plan.timestamp,
    canaryGitTree: plan.invariants.canaryGitTree,
    canaryCommittedFingerprint: plan.invariants.canaryCommittedFingerprint,
  };
}

interface StagedResult {
  files: FilePlan;
  manifest: JsonObject;
  evidence: JsonObject;
  releaseTreeFingerprint: string;
  releaseValidation: ValidationReport;
  rootValidation: ValidationReport;
  projection: JsonObject;
}

function stageAndValidate(root: string, plan: BuildPlan): StagedResult {
  const stagingParent = mkdtempSync(path.join(root, ".hybrid-100-v2.2.1-check-"));
  const stagedRelease = path.join(stagingParent, "release");
  const stagedDataset = path.join(stagingParent, "canonical-dataset");
  try {
    cpSync(abs(root, RELEASE_RELATIVE), stagedRelease, { recursive: true, errorOnExist: true, force: false });
    const manifest = structuredClone(plan.releaseManifest) as JsonObject;
    for (const row of plan.nextRecords) {
      const oldPath = path.join(stagedRelease, ...row.fromPath.split("/"));
      if (!existsSync(oldPath)) fail("SOURCE_SENSE_COPY_MISSING", row.fromPath);
      rmSync(oldPath);
      const newPath = path.join(stagedRelease, ...row.toPath.split("/"));
      mkdirSync(path.dirname(newPath), { recursive: true });
      writeFileSync(newPath, jsonText(row.record), "utf8");
    }
    writeFileSync(path.join(stagedRelease, "dataset.json"), jsonText(manifest), "utf8");
    const projection = projectionCheck(stagedRelease, plan.simulation);
    const treeOne = packageTreeFingerprint(stagedRelease);
    const treeTwo = packageTreeFingerprint(stagedRelease);
    if (treeOne !== treeTwo) fail("TARGET_RELEASE_TREE_NOT_DETERMINISTIC");
    const evidence = releaseEvidence(plan, treeOne, projection);
    mkdirSync(path.join(stagedRelease, "reports"), { recursive: true });
    writeFileSync(path.join(stagedRelease, RELEASE_EVIDENCE_RELATIVE), jsonText(evidence), "utf8");
    const releaseValidation = validateMasterVocabularyV2({ datasetRoot: stagedRelease, schemaRoot: path.join(stagedRelease, "schemas"), writeReport: false, validatedAt: plan.timestamp });
    assertValidation(releaseValidation, "TARGET_RELEASE", 0);
    const hashRecomputed = releaseHash(readJson<JsonObject>(stagedRelease, "dataset.json"));
    const treeAfterEvidenceOne = packageTreeFingerprint(stagedRelease);
    const treeAfterEvidenceTwo = packageTreeFingerprint(stagedRelease);
    if (manifest.releaseHash !== hashRecomputed || treeOne !== treeAfterEvidenceOne || treeAfterEvidenceOne !== treeAfterEvidenceTwo
      || evidence.releaseTreeFingerprint !== treeAfterEvidenceOne) fail("TARGET_RELEASE_HASH_OR_TREE_VERIFICATION_FAILED");

    cpSync(abs(root, DATASET_RELATIVE), stagedDataset, { recursive: true, errorOnExist: true, force: false });
    for (const row of plan.nextRecords) {
      const target = path.join(stagedDataset, ...row.toPath.split("/"));
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, jsonText(row.record), "utf8");
    }
    writeFileSync(path.join(stagedDataset, "dataset.json"), jsonText(plan.targetRootManifest), "utf8");
    const rootValidation = validateMasterVocabularyV2({ datasetRoot: stagedDataset, schemaRoot: path.join(stagedDataset, "schemas"), writeReport: false, validatedAt: plan.timestamp });
    assertValidation(rootValidation, "CANONICAL_ROOT", 1);

    const files: FilePlan = new Map();
    const targetReleaseFiles = directoryFiles(stagedRelease);
    for (const file of targetReleaseFiles) files.set(`${TARGET_RELEASE_RELATIVE}/${path.relative(stagedRelease, file).split(path.sep).join("/")}`, readFileSync(file, "utf8"));
    for (const row of plan.nextRecords) files.set(`${DATASET_RELATIVE}/${row.toPath}`, jsonText(row.record));
    files.set(`${DATASET_RELATIVE}/dataset.json`, jsonText(plan.targetRootManifest));
    files.set(AUTHORIZATION_RELATIVE, jsonText(makeAuthorization(plan.timestamp)));

    const planArtifact = makeMaterializationPlan(plan, manifest, treeAfterEvidenceOne, projection, releaseValidation, rootValidation);
    files.set(PLAN_RELATIVE, jsonText(planArtifact));
    files.set(SUMMARY_RELATIVE, jsonText(makeSummary(plan, planArtifact, projection)));
    files.set(VALIDATION_RELATIVE, jsonText(makeValidationSummary(plan, planArtifact, projection, releaseValidation, rootValidation)));
    files.set(REPORT_RELATIVE, renderReport(plan, manifest, planArtifact, projection, releaseValidation, rootValidation));
    return { files, manifest, evidence, releaseTreeFingerprint: treeAfterEvidenceOne, releaseValidation, rootValidation, projection };
  } finally {
    if (existsSync(stagingParent)) rmSync(stagingParent, { recursive: true, force: true });
  }
}

function makeAuthorization(timestamp: string): JsonObject {
  return {
    artifactType: "HYBRID_100_RUNTIME_ELIGIBILITY_MATERIALIZATION_AUTHORIZATION",
    authorizedBy: "VocabFlow project owner",
    authorizationSourceBaseline: AUTHORIZED_BASELINE,
    ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE,
    firstExecutionBaseline: FIRST_EXECUTION_BASELINE,
    currentExecutionBaseline: EXECUTION_BASELINE,
    remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS,
    executionBaseline: EXECUTION_BASELINE,
    remoteAdvanceClassification: "UNRELATED_APP_UI_CHANGE",
    authorizedDatasetStateUnchanged: true,
    sourceReleaseVersion: "2.2.0",
    sourceReleaseHash: SOURCE_RELEASE_HASH,
    semanticDraftFingerprint: SEMANTIC_DRAFT_FINGERPRINT,
    authorizationScope: [
      "APPROVE_AUDITED_400_NESTED_CHILD_ROWS",
      "MATERIALIZE_100_SENSE_REVISIONS",
      "UPDATE_CANONICAL_SENSE_PINS",
      "BUILD_PATCH_RELEASE_2_2_1",
      "GENERATE_RELEASE_HASH",
      "FREEZE_RELEASE_2_2_1",
    ],
    databaseConnectionAuthorized: false,
    databaseWriteAuthorized: false,
    runtimeImportAuthorized: false,
    migrationAuthorized: false,
    productionMutationAuthorized: false,
    materializationTimestamp: timestamp,
  };
}

function makeMaterializationPlan(plan: BuildPlan, manifest: JsonObject, tree: string, projection: JsonObject, releaseValidation: ValidationReport, rootValidation: ValidationReport): JsonObject {
  return {
    artifactType: "HYBRID_100_RUNTIME_ELIGIBLE_PATCH_RELEASE_MATERIALIZATION_PLAN",
    status: "MATERIALIZED_AND_FROZEN",
    authorizationSourceBaseline: AUTHORIZED_BASELINE,
    ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE,
    firstExecutionBaseline: FIRST_EXECUTION_BASELINE,
    currentExecutionBaseline: EXECUTION_BASELINE,
    remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS,
    executionBaseline: EXECUTION_BASELINE,
    remoteAdvanceClassification: "UNRELATED_APP_UI_CHANGE",
    authorizedDatasetStateUnchanged: true,
    sourceReleaseVersion: "2.2.0",
    sourceReleaseHash: SOURCE_RELEASE_HASH,
    sourceReleaseTreeFingerprint: SOURCE_RELEASE_TREE,
    semanticDraftFingerprint: SEMANTIC_DRAFT_FINGERPRINT,
    datasetVersion: "2.2.1",
    versionBump: "PATCH",
    releasedAt: plan.timestamp,
    createdAt: plan.timestamp,
    releaseHashAlgorithm: TARGET_RELEASE_HASH_ALGORITHM,
    releaseHash: manifest.releaseHash,
    releaseTreeFingerprint: tree,
    releaseHashIndependentRecompute: true,
    releaseTreeFingerprintRepeatIdentical: true,
    sourceSenseCount: 100,
    senseRevisionsCreated: plan.nextRecords.length,
    childRowsPromoted: 400,
    childRowsByType: { TRANSLATION: 100, DEFINITION: 100, EXAMPLE: 100, EXAMPLE_TRANSLATION: 100 },
    newEntityIds: 0,
    newProvenanceIds: 0,
    learnerFacingDrift: 0,
    identityDrift: 0,
    provenanceDrift: 0,
    orderingDrift: 0,
    preferredSelectionDrift: 0,
    cefrDrift: 0,
    taxonomyDrift: 0,
    canonicalRoot: { datasetVersion: "2.0.0", schemaVersion: "2.0.1", status: "DRAFT", totals: { lexemes: 103, senses: 123, classifications: 219, provenance: 1043 } },
    targetCohort: TARGET_COHORT,
    runtimeReleaseProjection: projection,
    releaseValidation: { status: releaseValidation.status, errors: releaseValidation.errorCount, warnings: releaseValidation.warningCount, info: releaseValidation.infoCount },
    canonicalValidation: { status: rootValidation.status, errors: rootValidation.errorCount, warnings: rootValidation.warningCount, info: rootValidation.infoCount },
    databaseConnection: "NONE",
    databaseWrites: "NONE",
    insertCount: 0,
    updateCount: 0,
    deleteCount: 0,
    ddlCount: 0,
    runtimeIdsAllocated: 0,
    bridgeMappingsCreated: 0,
    learnerRowsMutated: 0,
    runtimeImportExecuted: false,
    importApplyExecuted: false,
    migrationsExecuted: "NONE",
    productionConnection: "NONE",
    productionMutation: false,
  };
}

function makeSummary(plan: BuildPlan, materialization: JsonObject, projection: JsonObject): JsonObject {
  return {
    artifactType: "HYBRID_100_RUNTIME_ELIGIBLE_PATCH_RELEASE_SUMMARY",
    status: "PASS",
    authorizationBaseline: AUTHORIZED_BASELINE,
    ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE,
    firstExecutionBaseline: FIRST_EXECUTION_BASELINE,
    currentExecutionBaseline: EXECUTION_BASELINE,
    remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS,
    sourceReleaseVersion: "2.2.0",
    sourceReleaseHash: SOURCE_RELEASE_HASH,
    sourceReleaseTreeFingerprint: SOURCE_RELEASE_TREE,
    semanticDraftFingerprint: SEMANTIC_DRAFT_FINGERPRINT,
    nestedRowsAudited: 400,
    nestedRowsPromoted: 400,
    senseRevisionsMaterialized: 100,
    stableSenseIdsPreserved: true,
    stableChildIdsPreserved: true,
    newEntityIds: 0,
    newProvenanceIds: 0,
    semanticDrift: 0,
    cefrDrift: 0,
    taxonomyDrift: 0,
    canonicalTotals: { lexemes: 103, senses: 123, classifications: 219, provenance: 1043 },
    canonicalVersion: "2.0.0",
    canonicalStatus: "DRAFT",
    releaseVersion: "2.2.1",
    releaseStatus: "APPROVED",
    releaseHash: materialization.releaseHash,
    releaseTreeFingerprint: materialization.releaseTreeFingerprint,
    releasedAt: materialization.releasedAt,
    runtimeProjectionReady: projection.importEligible === true,
    runtimeImportExecuted: false,
    cefrDistribution: plan.cefr,
    databaseConnection: "NONE",
    databaseWrites: "NONE",
    productionMutation: false,
  };
}

function makeValidationSummary(plan: BuildPlan, materialization: JsonObject, projection: JsonObject, releaseValidation: ValidationReport, rootValidation: ValidationReport): JsonObject {
  return {
    artifactType: "HYBRID_100_RUNTIME_ELIGIBLE_PATCH_RELEASE_VALIDATION",
    status: "PASS",
    authorizationBaseline: AUTHORIZED_BASELINE,
    ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE,
    firstExecutionBaseline: FIRST_EXECUTION_BASELINE,
    currentExecutionBaseline: EXECUTION_BASELINE,
    remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS,
    sourceRelease: { datasetVersion: "2.2.0", releaseHash: SOURCE_RELEASE_HASH, releaseTreeFingerprint: SOURCE_RELEASE_TREE, unchanged: true },
    phase2G1A: { technicallyReady: true, historicalNestedChildApprovalAuthorized: false },
    semanticDraftFingerprint: { expected: SEMANTIC_DRAFT_FINGERPRINT, verified: true },
    lifecycle: { childRowsPassed: 400, childRowsPromoted: 400, childRowsBlocked: 0, senseRevisionsCreated: 100, stableSenseIdsPreserved: true, stableChildIdsPreserved: true },
    drift: { learnerFacing: 0, identity: 0, provenance: 0, ordering: 0, preferredSelection: 0, cefr: 0, taxonomy: 0 },
    canonicalRoot: { version: "2.0.0", status: "DRAFT", totals: { lexemes: 103, senses: 123, classifications: 219, provenance: 1043 }, validation: rootValidation },
    release: { version: "2.2.1", status: "APPROVED", cohort: TARGET_COHORT, releaseHash: materialization.releaseHash, releaseTreeFingerprint: materialization.releaseTreeFingerprint, validation: releaseValidation },
    runtimeReleaseProjection: projection,
    cefrDistribution: plan.cefr,
    historicalImmutability: plan.invariants,
    sideEffects: { databaseConnection: "NONE", databaseWrites: "NONE", inserts: 0, updates: 0, deletes: 0, ddl: 0, runtimeIdsAllocated: 0, bridgeMappingsCreated: 0, learnerRowsMutated: 0, runtimeImportExecuted: false, importerApplyExecuted: false, migrationsExecuted: "NONE", productionConnection: "NONE", productionMutation: false },
  };
}

function renderReport(plan: BuildPlan, manifest: JsonObject, materialization: JsonObject, projection: JsonObject, releaseValidation: ValidationReport, rootValidation: ValidationReport): string {
  return `# Hybrid-100 runtime-eligible PATCH release 2.2.1\n\n`
    + `- Owner authorization content baseline: \`${AUTHORIZED_BASELINE}\`; first execution baseline: \`${FIRST_EXECUTION_BASELINE}\`; current execution baseline: \`${EXECUTION_BASELINE}\`.\n`
    + `- Remote advancement commits: bdc99b2 and 4e0e452, both classified UNRELATED_APP_UI_CHANGE; authorized dataset state unchanged.\n`
    + `- Source release: 2.2.0 / \`${SOURCE_RELEASE_HASH}\`; tree \`${SOURCE_RELEASE_TREE}\` unchanged.\n`
    + `- Owner-reviewed semantic draft fingerprint: \`${SEMANTIC_DRAFT_FINGERPRINT}\`.\n`
    + `- Audited nested child rows: 400/400; promoted to APPROVED: 400 (100 Translation, 100 Definition, 100 Example, 100 ExampleTranslation).\n`
    + `- Immutable Sense revisions materialized: 100; stable Sense IDs and all 400 child IDs preserved.\n`
    + `- Learner-facing, identity, provenance, ordering, preferred-selection, CEFR and taxonomy drift: 0. New entity IDs and new Provenance IDs: 0.\n`
    + `- Canonical pins moved only for the 100 cohort Senses; root remains 2.0.0 / DRAFT with 103 Lexemes, 123 Senses, 219 Classifications and 1,043 Provenance records.\n`
    + `- Release: \`${TARGET_RELEASE_RELATIVE}/\`, 2.2.1 / APPROVED; cohort 87 Lexemes, 100 Senses, 99 Classifications, 799 Provenance, 1 Taxonomy, 0 media, 0 Learning Sets, 0 Relations.\n`
    + `- Runtime RELEASE projection: ${projection.projectedSenses}/100, ${projection.skippedSenses} skipped, importEligible=${projection.importEligible}; Vietnamese ${projection.runtimeFieldCounts.vietnameseNonNull}, definitionEn ${projection.runtimeFieldCounts.definitionEnNonNull}, exampleEn ${projection.runtimeFieldCounts.exampleEnNonNull}, IPA ${projection.runtimeFieldCounts.ipaNonNull}. Exact per-Sense projection fingerprints match the audited simulation.\n`
    + `- CEFR unchanged: A1 17, A2 28, B1 20, B2 27, C1 7, Unclassified 1. Light A1 / Classification r3; Water A2 / Classification r2; Fuse intentionally unclassified.\n`
    + `- releaseHashAlgorithm: ${TARGET_RELEASE_HASH_ALGORITHM}; releaseHash: \`${manifest.releaseHash}\`; independent recomputation: PASS.\n`
    + `- Release tree fingerprint: \`${materialization.releaseTreeFingerprint}\`; repeated calculation identical: YES. Release validator: ${releaseValidation.errorCount} errors / ${releaseValidation.warningCount} warnings / ${releaseValidation.infoCount} info. Canonical validator: ${rootValidation.errorCount} errors / ${rootValidation.warningCount} warnings.\n`
    + `- Release is immutable and reruns are NOOP. Source rights remain unverified; no source prose or media was reused; no pronunciation/media was bundled.\n`
    + `- DATABASE_CONNECTION=NONE; DATABASE_WRITES=NONE; runtime import authorized/executed: NO; runtime IDs allocated: 0; bridge mappings created: 0; production untouched. Runtime reconciliation candidate discovery remains pending.\n`
    + `- Materialization timestamp persisted: \`${plan.timestamp}\`.\n`;
}

export function verifyMaterializedRelease(root = REPO_ROOT): JsonObject {
  const releaseRoot = abs(root, TARGET_RELEASE_RELATIVE);
  if (!existsSync(releaseRoot)) fail("PATCH_RELEASE_2_2_1_NOT_MATERIALIZED");
  const materialization = readJson<JsonObject>(root, PLAN_RELATIVE);
  const authorization = readJson<JsonObject>(root, AUTHORIZATION_RELATIVE);
  const manifest = readJson<JsonObject>(releaseRoot, "dataset.json");
  const evidence = readJson<JsonObject>(releaseRoot, RELEASE_EVIDENCE_RELATIVE);
  if (materialization.status !== "MATERIALIZED_AND_FROZEN" || authorization.artifactType !== "HYBRID_100_RUNTIME_ELIGIBILITY_MATERIALIZATION_AUTHORIZATION"
    || authorization.authorizationSourceBaseline !== AUTHORIZED_BASELINE || authorization.ownerAuthorizationContentBaseline !== AUTHORIZED_BASELINE
    || authorization.firstExecutionBaseline !== FIRST_EXECUTION_BASELINE || authorization.currentExecutionBaseline !== EXECUTION_BASELINE
    || authorization.executionBaseline !== EXECUTION_BASELINE || canonicalHash(authorization.remoteAdvanceCommits) !== canonicalHash(REMOTE_ADVANCE_COMMITS)
    || authorization.remoteAdvanceClassification !== "UNRELATED_APP_UI_CHANGE"
    || authorization.authorizedDatasetStateUnchanged !== true || authorization.authorizedBy !== "VocabFlow project owner"
    || authorization.runtimeImportAuthorized !== false || authorization.databaseWriteAuthorized !== false || authorization.materializationTimestamp !== materialization.releasedAt) fail("MATERIALIZED_AUTHORIZATION_OR_PLAN_MISMATCH");
  if (manifest.datasetVersion !== "2.2.1" || manifest.schemaVersion !== "2.0.1" || manifest.status !== "APPROVED"
    || manifest.releaseHashAlgorithm !== TARGET_RELEASE_HASH_ALGORITHM || manifest.createdAt !== materialization.createdAt || manifest.releasedAt !== materialization.releasedAt) fail("FROZEN_RELEASE_MANIFEST_MISMATCH");
  const hashOne = releaseHash(manifest);
  const hashTwo = releaseHash(readJson<JsonObject>(releaseRoot, "dataset.json"));
  const treeOne = packageTreeFingerprint(releaseRoot);
  const treeTwo = packageTreeFingerprint(releaseRoot);
  if (hashOne !== manifest.releaseHash || hashTwo !== hashOne || hashOne !== materialization.releaseHash || hashOne !== evidence.releaseHash
    || treeOne !== treeTwo || treeOne !== materialization.releaseTreeFingerprint || treeOne !== evidence.releaseTreeFingerprint) fail("FROZEN_RELEASE_HASH_OR_TREE_MISMATCH");
  if (canonicalHash(countPins(manifest)) !== canonicalHash(TARGET_COHORT)) fail("FROZEN_RELEASE_COHORT_MISMATCH");
  const source = validateSourceRelease(root);
  const sourceManifest = source.manifest;
  for (const key of ["includedLexemes", "includedClassifications", "includedProvenance", "includedTaxonomySnapshots", "includedMediaAssets", "includedMediaAssetVersions", "includedLearningSets", "includedRelations"]) {
    if (canonicalHash(manifest[key] ?? []) !== canonicalHash(sourceManifest[key] ?? [])) fail("FROZEN_UNCHANGED_PIN_SET_MISMATCH", key);
  }
  const rootManifest = readJson<JsonObject>(root, `${DATASET_RELATIVE}/dataset.json`);
  if (rootManifest.datasetVersion !== "2.0.0" || rootManifest.schemaVersion !== "2.0.1" || rootManifest.status !== "DRAFT"
    || canonicalHash(canonicalTotals(rootManifest)) !== canonicalHash({ lexemes: 103, senses: 123, classifications: 219, provenance: 1043, taxonomy: 1 })) fail("FROZEN_CANONICAL_ROOT_MISMATCH");
  const sensePlans = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/sense-revision-plan.json`);
  const sourcePins = new Map(recordArray(sourceManifest.includedSenses).map((pin) => [String(pin.masterSenseId), pin]));
  const releasePins = new Map(recordArray(manifest.includedSenses).map((pin) => [String(pin.masterSenseId), pin]));
  const canonicalPins = new Map(recordArray(rootManifest.includedSenses).map((pin) => [String(pin.masterSenseId), pin]));
  const timestamp = String(materialization.releasedAt);
  const promoted = { TRANSLATION: 0, DEFINITION: 0, EXAMPLE: 0, EXAMPLE_TRANSLATION: 0 };
  const revisionRows = recordArray(sensePlans.revisions);
  if (revisionRows.length !== 100 || releasePins.size !== 100) fail("FROZEN_SENSE_COHORT_MISMATCH");
  for (const row of revisionRows) {
    const id = String(row.masterSenseId);
    const sourcePin = sourcePins.get(id);
    const releasePin = releasePins.get(id);
    const rootPin = canonicalPins.get(id);
    if (!sourcePin || !releasePin || !rootPin || releasePin.senseRevision !== Number(sourcePin.senseRevision) + 1
      || releasePin.recordPath !== `master/senses/${id}-r${releasePin.senseRevision}.json` || canonicalHash(releasePin) !== canonicalHash(rootPin)) fail("FROZEN_SENSE_PIN_MISMATCH", id);
    const before = readJson<JsonObject>(root, `${RELEASE_RELATIVE}/${String(sourcePin.recordPath)}`);
    const after = readJson<JsonObject>(releaseRoot, String(releasePin.recordPath));
    const canonicalAfter = readJson<JsonObject>(root, `${DATASET_RELATIVE}/${String(rootPin.recordPath)}`);
    if (canonicalHash(after) !== releasePin.contentHash || canonicalHash(canonicalAfter) !== rootPin.contentHash
      || after.masterSenseId !== id || after.masterLexemeId !== before.masterLexemeId || after.senseRevision !== Number(before.senseRevision) + 1
      || after.status !== "APPROVED" || after.createdAt !== before.createdAt || after.updatedAt !== timestamp
      || canonicalHash(withoutStatuses(before)) !== canonicalHash(withoutStatuses(after))) fail("FROZEN_SENSE_CONTENT_MISMATCH", id);
    for (const child of currentChildRows(after)) {
      if (child.row.status !== "APPROVED") fail("FROZEN_CHILD_NOT_APPROVED", `${child.type}:${String(child.row[CHILD_COLLECTIONS[child.type].idField])}`);
      promoted[child.type] += 1;
    }
  }
  if (canonicalHash(promoted) !== canonicalHash({ TRANSLATION: 100, DEFINITION: 100, EXAMPLE: 100, EXAMPLE_TRANSLATION: 100 })) fail("FROZEN_CHILD_COUNTS_MISMATCH");
  const cefr = assertTaxonomyAndCefr(root, manifest);
  const projection = projectionCheck(releaseRoot, readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/runtime-projection-simulation.json`));
  assertValidation(validateMasterVocabularyV2({ datasetRoot: path.join(root, DATASET_RELATIVE), schemaRoot: path.join(root, DATASET_RELATIVE, "schemas"), writeReport: false, validatedAt: timestamp }), "CANONICAL_ROOT", 1);
  const releaseValidation = validateMasterVocabularyV2({ datasetRoot: releaseRoot, schemaRoot: path.join(releaseRoot, "schemas"), writeReport: false, validatedAt: timestamp });
  assertValidation(releaseValidation, "TARGET_RELEASE", 0);
  const immutability = assertHistoricalImmutability(root);
  if (evidence.runtimeReleaseProjectionReady !== true || evidence.runtimeImportExecuted !== false || evidence.databaseWrites !== "NONE"
    || evidence.productionMutation !== false || evidence.newEntityIds !== 0 || evidence.newProvenanceIds !== 0
    || evidence.learnerFacingSemanticDrift !== 0 || evidence.cefrDrift !== 0 || evidence.taxonomyDrift !== 0) fail("RELEASE_EVIDENCE_BOUNDARY_MISMATCH");
  return {
    status: "NOOP_ALREADY_MATERIALIZED_AND_FROZEN",
    writesPerformed: false,
    releaseHash: hashOne,
    releaseTreeFingerprint: treeOne,
    releaseHashRepeatIdentical: true,
    releaseTreeFingerprintRepeatIdentical: true,
    releasedAt: materialization.releasedAt,
    senseRevisions: 100,
    childRowsApproved: 400,
    cefrDistribution: cefr,
    runtimeReleaseProjection: projection,
    releaseValidator: { status: releaseValidation.status, errors: releaseValidation.errorCount, warnings: releaseValidation.warningCount, info: releaseValidation.infoCount },
    historicalImmutability: immutability,
    databaseConnection: "NONE",
    databaseWrites: "NONE",
  };
}

function persistTransaction(root: string, files: FilePlan): void {
  const releaseTarget = abs(root, TARGET_RELEASE_RELATIVE);
  const tempParent = mkdtempSync(path.join(path.dirname(releaseTarget), ".hybrid-100-v2.2.1-staging-"));
  const tempRelease = path.join(tempParent, "release");
  const snapshots = new Map<string, Buffer | null>();
  mkdirSync(tempRelease, { recursive: true });
  for (const [relative, content] of files) {
    if (!relative.startsWith(`${TARGET_RELEASE_RELATIVE}/`)) continue;
    const target = path.join(tempRelease, ...relative.slice(`${TARGET_RELEASE_RELATIVE}/`.length).split("/"));
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, content, "utf8");
  }
  for (const relative of files.keys()) {
    if (relative.startsWith(`${TARGET_RELEASE_RELATIVE}/`)) continue;
    const target = abs(root, relative);
    snapshots.set(target, existsSync(target) ? readFileSync(target) : null);
  }
  let releasePublished = false;
  try {
    for (const [relative, content] of files) {
      if (relative.startsWith(`${TARGET_RELEASE_RELATIVE}/`)) continue;
      const target = abs(root, relative);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, content, "utf8");
    }
    if (existsSync(releaseTarget)) fail("PARTIAL_2G1B_MATERIALIZATION_DETECTED", TARGET_RELEASE_RELATIVE);
    renameSync(tempRelease, releaseTarget);
    releasePublished = true;
    verifyMaterializedRelease(root);
  } catch (error) {
    for (const [target, prior] of [...snapshots.entries()].reverse()) {
      if (prior === null) {
        if (existsSync(target)) rmSync(target, { force: true });
      } else {
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, prior);
      }
    }
    if (releasePublished && existsSync(releaseTarget)) rmSync(releaseTarget, { recursive: true, force: true });
    throw error;
  } finally {
    if (existsSync(tempParent)) rmSync(tempParent, { recursive: true, force: true });
  }
}

function detectExistingState(root: string): "ABSENT" | "COMPLETE" {
  const sensePlan = readJson<JsonObject>(root, `${CLOSURE_WORKSPACE_RELATIVE}/sense-revision-plan.json`);
  const targetPaths = recordArray(sensePlan.revisions).map((row) => `${DATASET_RELATIVE}/master/senses/${row.masterSenseId}-r${row.plannedSenseRevision}.json`);
  const expected = [TARGET_RELEASE_RELATIVE, AUTHORIZATION_RELATIVE, PLAN_RELATIVE, SUMMARY_RELATIVE, VALIDATION_RELATIVE, REPORT_RELATIVE, ...targetPaths];
  const present = expected.filter((file) => existsSync(abs(root, file))).length;
  if (present === 0) return "ABSENT";
  if (present !== expected.length) fail("PARTIAL_2G1B_MATERIALIZATION_DETECTED", `${present}/${expected.length}`);
  return "COMPLETE";
}

export function main(args = process.argv.slice(2), root = REPO_ROOT): JsonObject {
  if (args.length !== 1 || !["--check", "--apply"].includes(args[0] ?? "")) fail("USAGE", "pnpm vocab:hybrid-100-runtime-eligible-patch-release -- --check|--apply");
  const mode = args[0];
  const existing = detectExistingState(root);
  if (existing === "COMPLETE") {
    const result = verifyMaterializedRelease(root);
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  assertPreWriteBaseline(root);
  const historical = assertHistoricalImmutability(root);
  const plan = buildPlan(root, "2000-01-01T00:00:00.000Z");
  if (mode === "--check") {
    const result = {
      status: "PLAN_READY",
      writesPerformed: false,
      ownerAuthorizationContentBaseline: AUTHORIZED_BASELINE,
      firstExecutionBaseline: FIRST_EXECUTION_BASELINE,
      currentExecutionBaseline: EXECUTION_BASELINE,
      remoteAdvanceCommits: REMOTE_ADVANCE_COMMITS,
      executionBaseline: EXECUTION_BASELINE,
      remoteAdvanceClassification: "UNRELATED_APP_UI_CHANGE",
      authorizedDatasetStateUnchanged: true,
      authorizationSourceBaseline: AUTHORIZED_BASELINE,
      sourceReleaseHash: SOURCE_RELEASE_HASH,
      sourceReleaseTreeFingerprint: SOURCE_RELEASE_TREE,
      semanticDraftFingerprint: SEMANTIC_DRAFT_FINGERPRINT,
      auditedNestedRows: 400,
      plannedSenseRevisions: plan.nextRecords.length,
      stableSenseIdsPreserved: true,
      stableChildIdsPreserved: true,
      newEntityIds: 0,
      newProvenanceIds: 0,
      semanticDrift: 0,
      cefrDrift: 0,
      taxonomyDrift: 0,
      targetReleaseAbsent: true,
      allTargetPathsAbsent: true,
      historicalImmutability: historical,
      releasedAt: "ALLOCATED_ON_FIRST_APPLY_AND_PERSISTED",
      databaseConnection: "NONE",
      databaseWrites: "NONE",
    };
    console.log(JSON.stringify(result, null, 2));
    return result;
  }
  const timestamp = new Date().toISOString();
  const appliedPlan = buildPlan(root, timestamp);
  const staged = stageAndValidate(root, appliedPlan);
  persistTransaction(root, staged.files);
  const verification = verifyMaterializedRelease(root);
  const result = {
    status: "MATERIALIZED_AND_FROZEN",
    writesPerformed: true,
    releaseHash: verification.releaseHash,
    releaseTreeFingerprint: verification.releaseTreeFingerprint,
    releaseHashRepeatIdentical: verification.releaseHashRepeatIdentical,
    releaseTreeFingerprintRepeatIdentical: verification.releaseTreeFingerprintRepeatIdentical,
    releasedAt: verification.releasedAt,
    nestedRowsPromoted: 400,
    senseRevisionsMaterialized: 100,
    runtimeReleaseProjection: verification.runtimeReleaseProjection,
    releaseValidator: verification.releaseValidator,
    historicalImmutability: verification.historicalImmutability,
    databaseConnection: "NONE",
    databaseWrites: "NONE",
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "HYBRID_100_PATCH_RELEASE_FAILED";
    process.stderr.write(`${/^[A-Z0-9_:.-]{3,220}$/.test(message) ? message : "HYBRID_100_PATCH_RELEASE_FAILED"}\n`);
    process.exitCode = 1;
  }
}
