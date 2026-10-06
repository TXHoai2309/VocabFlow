import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  assertCanaryRepositoryState,
  SUPERSEDED_DIRTY_WORKTREE_FINGERPRINT,
} from "./hybrid-100-canary-integrity";
import { canonicalHash } from "./hybrid-100-release-candidate";
import { validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
type EntityKind = "LEXEME" | "SENSE" | "CLASSIFICATION";
type PlanAction =
  | "ALREADY_APPROVED_REUSE"
  | "CREATE_APPROVED_NEXT_REVISION"
  | "BLOCKED_IDENTITY"
  | "BLOCKED_CONTENT"
  | "BLOCKED_PROVENANCE";

export const RC_VERSION = "2.2.0-rc.1";
export const REQUIRED_PHASE_2F6_BASELINE = "b3db6c38213cc05e0fa8437c42f4c236c671c629";
export const FINAL_RELEASE_RELATIVE = "vocabflow-dataset/releases/hybrid-100-v2.2.0";
export const APPROVED_TAXONOMY_VERSION = "2.0.1";
export const RC_FINGERPRINT = "06b2a4dec2f54438416cae67788e0683fe94907cbce0a60fbb2d6469bc25b82c";
export const RC_TREE_FINGERPRINT = "9d021e151d934a61c577289a4aff3ded8883858bac672e1c27ac546a335966a7";
export const AUTHORIZED_CEFR_FINGERPRINT = "d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622";
export const CANONICAL_PROMOTION_PLAN_FINGERPRINT = "969b5090a020b3f4793e6a77dcd78ce46fbb119036c45bfcf93bca81cc7a04db";
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
const RC_RELATIVE = DATASET + "/releases/hybrid-100-v2.2.0-rc.1";
const RC_WORKSPACE_RELATIVE = DATASET + "/workspaces/hybrid-100-release-candidate";
const SEMANTIC_WORKSPACE_RELATIVE = DATASET + "/workspaces/hybrid-100-editorial-draft";
const CEFR_WORKSPACE_RELATIVE = DATASET + "/workspaces/hybrid-100-cefr-draft";
const AUDIT_WORKSPACE_RELATIVE = DATASET + "/workspaces/hybrid-100-rc-final-review";
const AUDIT_REPORT_RELATIVE = DATASET + "/reports/hybrid-100-rc-final-review-2.2.0-rc.1.md";
const OWNER_DECISION_RELATIVE = DATASET + "/reports/hybrid-100-rc-final-owner-decision.md";
const TAXONOMY_POLICY_DECISION_RELATIVE = AUDIT_WORKSPACE_RELATIVE + "/taxonomy-version-policy-decision.json";
const TAXONOMY_DECISION_DATE = "2026-10-06";
export const TAXONOMY_SEMANTIC_PAYLOAD_FIELDS = [
  "taxonomyId",
  "cefrFrameworks",
  "topics",
  "domains",
  "exams",
  "curricula",
  "schoolLevels",
  "difficultyScales",
] as const;
export const TAXONOMY_APPROVAL_SNAPSHOT_METADATA_FIELDS = [
  "taxonomyVersion",
  "status",
  "createdAt",
  "updatedAt",
] as const;
const TAXONOMY_VERSION_POLICY = {
  PATCH: "Lifecycle/governance-only transitions or metadata-only corrections that preserve taxonomy semantic meaning, identifiers, values, and hierarchy.",
  MINOR: "Backward-compatible additive semantic taxonomy changes, such as adding a Topic, Domain, Framework, taxonomy value, or additive hierarchy/content extension.",
  MAJOR: "Breaking semantic taxonomy changes, such as incompatible interpretation, code/identity semantics, hierarchy semantics, or a release-line reset requiring migration.",
};
const EXPECTED_STATUS_KEYS = ["APPROVED", "IN_REVIEW", "DRAFT", "other"] as const;
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
const OUTPUTS = [
  AUDIT_WORKSPACE_RELATIVE + "/manifest.json",
  AUDIT_WORKSPACE_RELATIVE + "/rc-audit.json",
  AUDIT_WORKSPACE_RELATIVE + "/lifecycle-status-inventory.json",
  AUDIT_WORKSPACE_RELATIVE + "/approval-revision-plan.json",
  AUDIT_WORKSPACE_RELATIVE + "/taxonomy-approval-plan.json",
  AUDIT_WORKSPACE_RELATIVE + "/final-release-manifest-plan.json",
  AUDIT_WORKSPACE_RELATIVE + "/validation-summary.json",
  AUDIT_REPORT_RELATIVE,
  OWNER_DECISION_RELATIVE,
  TAXONOMY_POLICY_DECISION_RELATIVE,
] as const;

function fail(code: string, detail?: string): never {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function readJson<T>(root: string, relativePath: string): T {
  return JSON.parse(readFileSync(path.join(root, relativePath), "utf8")) as T;
}

function sha256Bytes(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

function jsonText(value: unknown): string {
  return JSON.stringify(value, null, 2) + "\n";
}

function readPackagedRecord(packageRoot: string, recordPath: string): JsonObject {
  const parts = recordPath.split("/");
  if (!recordPath || recordPath.includes("\\") || parts.some((part) => !part || part === "." || part === "..")) {
    fail("RECORD_PATH_INVALID", recordPath);
  }
  return readJson<JsonObject>(packageRoot, path.join(...parts));
}

function walkFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];
  const files: string[] = [];
  const visit = (current: string): void => {
    const entries = readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name, "en"));
    for (const entry of entries) {
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) visit(child);
      else if (entry.isFile()) files.push(child);
    }
  };
  visit(directory);
  return files.sort((left, right) => left.localeCompare(right, "en"));
}

function treeFingerprint(packageRoot: string): string {
  const rows = walkFiles(packageRoot)
    .filter((file) => !file.endsWith(path.join("reports", "release-candidate-evidence.json")))
    .map((file) => ({
      path: path.relative(packageRoot, file).split(path.sep).join("/"),
      sha256: sha256Bytes(readFileSync(file)),
    }))
    .sort((left, right) => left.path.localeCompare(right.path, "en"));
  return canonicalHash(rows);
}

function exactIdSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const sortedLeft = [...left].sort((a, b) => a.localeCompare(b, "en"));
  const sortedRight = [...right].sort((a, b) => a.localeCompare(b, "en"));
  return sortedLeft.every((id, index) => id === sortedRight[index]);
}

function countsByStatus(records: JsonObject[]): JsonObject {
  const counts: JsonObject = { APPROVED: 0, IN_REVIEW: 0, DRAFT: 0, other: 0 };
  for (const record of records) {
    const status = record.status;
    if (status === "APPROVED" || status === "IN_REVIEW" || status === "DRAFT") counts[status] += 1;
    else counts.other += 1;
  }
  return counts;
}

function inventoryByStatus(
  kind: EntityKind,
  records: JsonObject[],
  idField: string,
  revisionField: string,
  currentHashes: Map<string, string>,
  paths: Map<string, string>,
): JsonObject {
  const arrays: JsonObject = { APPROVED: [], IN_REVIEW: [], DRAFT: [], other: [] };
  for (const record of records) {
    const row = {
      entityType: kind,
      stableId: record[idField],
      currentRevision: record[revisionField],
      currentStatus: record.status,
      currentContentHash: currentHashes.get(String(record[idField])) ?? canonicalHash(record),
      recordPath: paths.get(String(record[idField])) ?? "",
    };
    const bucket = EXPECTED_STATUS_KEYS.includes(record.status as never) ? record.status : "other";
    arrays[bucket].push(row);
  }
  for (const key of EXPECTED_STATUS_KEYS) {
    arrays[key].sort((left: JsonObject, right: JsonObject) => String(left.stableId).localeCompare(String(right.stableId), "en"));
  }
  return { entityType: kind, counts: countsByStatus(records), recordsByStatus: arrays };
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

function semanticProjection(record: JsonObject, revisionField: string): JsonObject {
  const projection = JSON.parse(JSON.stringify(record)) as JsonObject;
  delete projection.status;
  delete projection[revisionField];
  return projection;
}

export function taxonomySemanticProjection(snapshot: JsonObject): JsonObject {
  const projection = JSON.parse(JSON.stringify(snapshot)) as JsonObject;
  for (const field of TAXONOMY_APPROVAL_SNAPSHOT_METADATA_FIELDS) delete projection[field];
  return projection;
}

function learnerFacingProjection(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(learnerFacingProjection);
  if (!value || typeof value !== "object") return value;
  const projection: JsonObject = {};
  for (const [key, child] of Object.entries(value as JsonObject)) {
    if (key === "status" || key === "provenanceIds") continue;
    projection[key] = learnerFacingProjection(child);
  }
  return projection;
}

function revisionSpec(kind: EntityKind): { folder: string; idField: string; revisionField: string } {
  if (kind === "LEXEME") return { folder: "lexemes", idField: "masterLexemeId", revisionField: "lexemeRevision" };
  if (kind === "SENSE") return { folder: "senses", idField: "masterSenseId", revisionField: "senseRevision" };
  return { folder: "classifications", idField: "classificationId", revisionField: "classificationRevision" };
}

function canonicalRevisionIndex(root: string): Map<string, number> {
  const result = new Map<string, number>();
  for (const kind of ["LEXEME", "SENSE", "CLASSIFICATION"] as const) {
    const spec = revisionSpec(kind);
    const directory = path.join(root, DATASET, "master", spec.folder);
    for (const file of walkFiles(directory).filter((candidate) => candidate.endsWith(".json"))) {
      try {
        const record = JSON.parse(readFileSync(file, "utf8")) as JsonObject;
        const stableId = String(record[spec.idField] ?? "");
        const revision = Number(record[spec.revisionField]);
        if (!stableId || !Number.isInteger(revision) || revision < 1) continue;
        const key = `${kind}:${stableId}`;
        result.set(key, Math.max(result.get(key) ?? 0, revision));
      } catch {
        // Invalid unrelated records are handled by the master dataset validator.
      }
    }
  }
  return result;
}

function makeApprovalRows(
  root: string,
  recordsByKind: Record<EntityKind, JsonObject[]>,
  provenanceIds: Set<string>,
  revisions: Map<string, number>,
): JsonObject[] {
  const rows: JsonObject[] = [];
  for (const kind of ["LEXEME", "SENSE", "CLASSIFICATION"] as const) {
    const spec = revisionSpec(kind);
    for (const record of recordsByKind[kind]) {
      const stableId = String(record[spec.idField]);
      const currentRevision = Number(record[spec.revisionField]);
      const currentStatus = String(record.status);
      const currentContentHash = canonicalHash(record);
      const currentRefs = collectProvenanceIds(record);
      const missingProvenance = [...currentRefs].filter((id) => !provenanceIds.has(id)).sort();
      let action: PlanAction;
      let targetRevision: number | null = null;
      let targetRecordPath: string | null = null;
      let targetContentHash: string | null = null;
      let targetSemanticContentHash: string | null = null;
      if (currentStatus === "APPROVED") {
        action = "ALREADY_APPROVED_REUSE";
      } else if (missingProvenance.length) {
        action = "BLOCKED_PROVENANCE";
      } else if (currentStatus !== "DRAFT" && currentStatus !== "IN_REVIEW") {
        action = "BLOCKED_CONTENT";
      } else {
        try {
          const maxRevision = revisions.get(`${kind}:${stableId}`);
          if (maxRevision === undefined || maxRevision < currentRevision) throw new Error("CANONICAL_REVISION_MISSING");
          targetRevision = maxRevision + 1;
          targetRecordPath = "master/" + spec.folder + "/" + stableId + "-r" + targetRevision + ".json";
          if (existsSync(path.join(root, DATASET, targetRecordPath))) {
            action = "BLOCKED_IDENTITY";
            targetRevision = null;
            targetRecordPath = null;
          } else {
            const target = { ...record, [spec.revisionField]: targetRevision, status: "APPROVED" };
            targetContentHash = canonicalHash(target);
            targetSemanticContentHash = canonicalHash(semanticProjection(target, spec.revisionField));
            if (targetSemanticContentHash !== canonicalHash(semanticProjection(record, spec.revisionField))) {
              action = "BLOCKED_CONTENT";
              targetRevision = null;
              targetRecordPath = null;
              targetContentHash = null;
              targetSemanticContentHash = null;
            } else {
              action = "CREATE_APPROVED_NEXT_REVISION";
            }
          }
        } catch {
          action = "BLOCKED_IDENTITY";
        }
      }
      rows.push({
        entityType: kind,
        stableId,
        currentRevision,
        currentStatus,
        currentContentHash,
        currentRecordPath: "master/" + spec.folder + "/" + stableId + "-r" + currentRevision + ".json",
        action,
        ...(action === "CREATE_APPROVED_NEXT_REVISION" ? {
          targetRevision,
          targetStatus: "APPROVED",
          targetRecordPath,
          targetContentHash,
          currentLearnerPayloadHash: canonicalHash(semanticProjection(record, spec.revisionField)),
          targetLearnerPayloadHash: targetSemanticContentHash,
          semanticContentChange: false,
          approvalOnlyTransition: true,
        } : {}),
        missingProvenanceIds: missingProvenance,
      });
    }
  }
  return rows.sort((left, right) => {
    const typeOrder = ["LEXEME", "SENSE", "CLASSIFICATION"];
    return typeOrder.indexOf(left.entityType) - typeOrder.indexOf(right.entityType)
      || String(left.stableId).localeCompare(String(right.stableId), "en");
  });
}

function compareOwnerApprovedSemanticContent(
  root: string,
  semanticMap: JsonObject[],
  lexemeRecords: JsonObject[],
  senseRecords: JsonObject[],
): JsonObject {
  const lexemeById = new Map(lexemeRecords.map((record) => [String(record.masterLexemeId), record]));
  const senseById = new Map(senseRecords.map((record) => [String(record.masterSenseId), record]));
  let lexemeMismatchCount = 0;
  let senseMismatchCount = 0;
  let sourceHashMismatchCount = 0;
  const issues: JsonObject[] = [];
  const lexemeSources = new Map<string, { recordPath: string; contentHash?: string }>();
  for (const row of semanticMap) {
    const lexemeSource = row.workspaceLexemeRecord
      ?? row.canonicalLexemeDependency
      ?? row.canonicalDependency;
    const sourcePath = lexemeSource?.recordPath ?? lexemeSource?.lexemeRecordPath;
    const sourceHash = lexemeSource?.contentHash ?? lexemeSource?.lexemeContentHash;
    if (sourcePath && !lexemeSources.has(String(row.masterLexemeId))) {
      lexemeSources.set(String(row.masterLexemeId), {
        recordPath: sourcePath,
        contentHash: sourceHash,
      });
    }
    const senseSource = row.workspaceSenseRecord ?? row.canonicalDependency;
    const sensePath = senseSource?.recordPath ?? senseSource?.senseRecordPath;
    const senseHash = senseSource?.contentHash ?? senseSource?.senseContentHash;
    const candidateSense = senseById.get(String(row.masterSenseId));
    if (!sensePath || !candidateSense) {
      senseMismatchCount += 1;
      issues.push({ entityType: "SENSE", stableId: row.masterSenseId, code: "OWNER_APPROVED_SOURCE_PATH_MISSING" });
    } else {
      const sourceBytes = readFileSync(path.join(root, sensePath));
      const source = JSON.parse(sourceBytes.toString("utf8")) as JsonObject;
      const expectedSourceHash = sha256Bytes(sourceBytes);
      if (senseHash && expectedSourceHash !== senseHash) {
        sourceHashMismatchCount += 1;
        issues.push({ entityType: "SENSE", stableId: row.masterSenseId, code: "OWNER_APPROVED_SOURCE_HASH_MISMATCH" });
      }
      if (canonicalHash(learnerFacingProjection(source)) !== canonicalHash(learnerFacingProjection(candidateSense))) {
        senseMismatchCount += 1;
        issues.push({ entityType: "SENSE", stableId: row.masterSenseId, code: "OWNER_APPROVED_CONTENT_DRIFT" });
      }
    }
  }
  for (const [stableId, sourceRef] of lexemeSources) {
    const candidateLexeme = lexemeById.get(stableId);
    if (!candidateLexeme) {
      lexemeMismatchCount += 1;
      issues.push({ entityType: "LEXEME", stableId, code: "OWNER_APPROVED_SOURCE_PIN_MISSING" });
      continue;
    }
    const sourceBytes = readFileSync(path.join(root, sourceRef.recordPath));
    const source = JSON.parse(sourceBytes.toString("utf8")) as JsonObject;
    const sourceHash = sha256Bytes(sourceBytes);
    if (sourceRef.contentHash && sourceHash !== sourceRef.contentHash) {
      sourceHashMismatchCount += 1;
      issues.push({ entityType: "LEXEME", stableId, code: "OWNER_APPROVED_SOURCE_HASH_MISMATCH" });
    }
    if (canonicalHash(learnerFacingProjection(source)) !== canonicalHash(learnerFacingProjection(candidateLexeme))) {
      lexemeMismatchCount += 1;
      issues.push({ entityType: "LEXEME", stableId, code: "OWNER_APPROVED_CONTENT_DRIFT" });
    }
  }
  if (lexemeSources.size !== lexemeRecords.length) {
    lexemeMismatchCount += Math.abs(lexemeSources.size - lexemeRecords.length);
    issues.push({ code: "LEXEME_SOURCE_SET_COUNT_MISMATCH", expected: lexemeRecords.length, actual: lexemeSources.size });
  }
  return {
    semanticDraftFingerprint: "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d",
    ownerApprovedSemanticFingerprintVerified: true,
    semanticComparisonExcludesOnlyLifecycleStatusAndProvenanceReferences: true,
    lexemeContentDrift: lexemeMismatchCount,
    senseContentDrift: senseMismatchCount,
    totalSemanticContentDrift: lexemeMismatchCount + senseMismatchCount,
    sourceHashMismatches: sourceHashMismatchCount,
    comparedLexemes: lexemeRecords.length,
    comparedSenses: senseRecords.length,
    issues,
  };
}

function countCefrDistribution(cefrRows: JsonObject[]): JsonObject {
  const counts: JsonObject = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, UNCLASSIFIED: 0 };
  for (const row of cefrRows) {
    const value = row.editorialDecision?.valueCode;
    if (value === null) counts.UNCLASSIFIED += 1;
    else if (typeof value === "string" && Object.hasOwn(counts, value)) counts[value] += 1;
    else fail("CEFR_VALUE_INVALID", String(value));
  }
  return counts;
}

function taxonomyHistory(root: string): JsonObject[] {
  const datasetRoot = path.join(root, DATASET);
  const snapshots: JsonObject[] = [];
  for (const file of walkFiles(datasetRoot).filter((candidate) => {
    const relativeParts = path.relative(datasetRoot, candidate).split(path.sep);
    return relativeParts.includes("taxonomy") && candidate.endsWith(".json");
  })) {
    try {
      const record = JSON.parse(readFileSync(file, "utf8")) as JsonObject;
      if (record.taxonomyId) {
        snapshots.push({
          path: path.relative(root, file).split(path.sep).join("/"),
          taxonomyId: record.taxonomyId,
          taxonomyVersion: record.taxonomyVersion,
          status: record.status,
          contentHash: canonicalHash(record),
        });
      }
    } catch {
      // Schema files and non-taxonomy JSON are not snapshot precedents.
    }
  }
  const unique = new Map(snapshots.map((row) => [row.path, row]));
  return [...unique.values()].sort((left, right) => String(left.path).localeCompare(String(right.path), "en"));
}

function runtimeArtifacts(packageRoot: string): JsonObject {
  const files = walkFiles(packageRoot);
  const pathHits = files.filter((file) => {
    const rel = path.relative(packageRoot, file).split(path.sep).join("/").toLowerCase();
    return rel.split("/").some((segment) => segment === "import" || segment === "vocabulary-import")
      || /runtime-reconciliation|runtime-mapping|runtime-content-version|sql-plan|\.sql$/u.test(rel);
  });
  const forbiddenKeys = new Set([
    "vocabularyImport",
    "runtimeReconciliation",
    "runtimeMapping",
    "runtimeContentVersion",
    "contentVersion",
    "sqlPlan",
  ]);
  const keyHits: string[] = [];
  const visit = (value: unknown, location: string): void => {
    if (Array.isArray(value)) return value.forEach((item, index) => visit(item, `${location}/${index}`));
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as JsonObject)) {
      if (forbiddenKeys.has(key)) keyHits.push(`${location}/${key}`);
      visit(child, `${location}/${key}`);
    }
  };
  for (const file of files.filter((candidate) => candidate.endsWith(".json"))) {
    try {
      visit(JSON.parse(readFileSync(file, "utf8")), path.relative(packageRoot, file).split(path.sep).join("/"));
    } catch {
      keyHits.push(path.relative(packageRoot, file).split(path.sep).join("/") + ":INVALID_JSON");
    }
  }
  return {
    runtimeImportDirectoryAbsent: !existsSync(path.join(packageRoot, "import")),
    runtimeArtifacts: pathHits.length + keyHits.length,
    pathHits: pathHits.map((file) => path.relative(packageRoot, file).split(path.sep).join("/")),
    forbiddenKeyHits: keyHits,
  };
}

function compareCefr(
  cefrRows: JsonObject[],
  classRecords: JsonObject[],
): JsonObject {
  const classificationsBySense = new Map<string, JsonObject[]>();
  const classificationsById = new Map(classRecords.map((record) => [String(record.classificationId), record]));
  for (const record of classRecords) {
    const current = classificationsBySense.get(String(record.masterSenseId)) ?? [];
    current.push(record);
    classificationsBySense.set(String(record.masterSenseId), current);
  }
  let valueDrift = 0;
  let classificationIdDrift = 0;
  let confidenceDrift = 0;
  let reusedClassificationRecordDrift = 0;
  let reusedClassificationCount = 0;
  let extraClassifications = 0;
  const issues: JsonObject[] = [];
  for (const row of cefrRows) {
    const expected = row.editorialDecision ?? {};
    const actualForSense = classificationsBySense.get(String(row.masterSenseId)) ?? [];
    if (expected.valueCode === null) {
      if (actualForSense.length !== 0) {
        extraClassifications += actualForSense.length;
        issues.push({ masterSenseId: row.masterSenseId, code: "CLASSIFICATION_FOR_UNCLASSIFIED_SENSE" });
      }
      continue;
    }
    const record = classificationsById.get(String(expected.classificationId));
    if (!record || record.masterSenseId !== row.masterSenseId) {
      classificationIdDrift += 1;
      issues.push({ masterSenseId: row.masterSenseId, code: "CLASSIFICATION_ID_DRIFT" });
      continue;
    }
    if (record.valueCode !== expected.valueCode) {
      valueDrift += 1;
      issues.push({ masterSenseId: row.masterSenseId, code: "CEFR_VALUE_DRIFT" });
    }
    if (expected.decisionType === "REUSE_EXISTING_CLASSIFICATION") {
      reusedClassificationCount += 1;
      const existing = (row.existingClassificationAudit?.records ?? [])
        .find((candidate: JsonObject) => candidate.classificationId === expected.classificationId);
      if (!existing || canonicalHash(record) !== existing.contentHash) {
        reusedClassificationRecordDrift += 1;
        issues.push({ masterSenseId: row.masterSenseId, code: "REUSED_CLASSIFICATION_RECORD_DRIFT" });
      }
    } else if (record.confidence !== expected.confidence) {
      confidenceDrift += 1;
      issues.push({ masterSenseId: row.masterSenseId, code: "CEFR_CONFIDENCE_DRIFT" });
    }
    if (record.frameworkCode !== FRAMEWORK_CODE || record.frameworkVersion !== FRAMEWORK_VERSION || record.dimension !== "CEFR") {
      valueDrift += 1;
      issues.push({ masterSenseId: row.masterSenseId, code: "CEFR_FRAMEWORK_DRIFT" });
    }
  }
  const primaryCounts = new Map<string, number>();
  for (const record of classRecords.filter((candidate) => candidate.isPrimary === true)) {
    const key = `${record.masterSenseId}|${record.dimension}|${record.frameworkCode ?? record.scaleId ?? ""}|${record.frameworkVersion ?? ""}`;
    primaryCounts.set(key, (primaryCounts.get(key) ?? 0) + 1);
  }
  const duplicatePrimaryCount = [...primaryCounts.values()].filter((count) => count > 1).length;
  return {
    classifiedCount: classRecords.length,
    unclassifiedCount: cefrRows.length - classRecords.length,
    distribution: countCefrDistribution(cefrRows),
    expectedDistribution: EXPECTED_DISTRIBUTION,
    distributionExact: canonicalHash(countCefrDistribution(cefrRows)) === canonicalHash(EXPECTED_DISTRIBUTION),
    cefrValueDrift: valueDrift,
    classificationIdDrift,
    confidenceDrift,
    reusedClassificationCount,
    reusedClassificationRecordDrift,
    reuseConfidenceExcludedFromRevisionComparison: true,
    extraClassificationsForUnclassified: extraClassifications,
    duplicatePrimaryCefrCount: duplicatePrimaryCount,
    frameworkCode: FRAMEWORK_CODE,
    frameworkVersion: FRAMEWORK_VERSION,
    issues,
  };
}

function findSpotChecks(lexemeRecords: JsonObject[], senseRecords: JsonObject[], semantic: JsonObject): JsonObject[] {
  const expectedWords = ["far", "acute", "toll", "hopefully", "textile", "crawl", "compelling"];
  const checks: JsonObject[] = [];
  for (const word of expectedWords) {
    const lexemes = lexemeRecords.filter((record) => String(record.lemma).toLocaleLowerCase("en-US") === word);
    const ids = new Set(lexemes.map((record) => String(record.masterLexemeId)));
    const senses = senseRecords.filter((record) => ids.has(String(record.masterLexemeId)));
    checks.push({
      lemma: word,
      masterLexemeIds: lexemes.map((record) => record.masterLexemeId).sort(),
      masterSenseIds: senses.map((record) => record.masterSenseId).sort(),
      present: lexemes.length > 0 && senses.length > 0,
      matchesOwnerReviewedPackage: lexemes.length > 0 && senses.length > 0 && semantic.totalSemanticContentDrift === 0,
    });
  }
  return checks;
}

function checkTaxonomyPlan(root: string, taxonomy: JsonObject): JsonObject {
  const targetRecordPath = "taxonomy/" + TAXONOMY_ID + "-" + APPROVED_TAXONOMY_VERSION + ".json";
  const targetExists = existsSync(path.join(root, DATASET, targetRecordPath));
  if (targetExists) fail("TAXONOMY_2_0_1_MUST_NOT_BE_CREATED_IN_PHASE_2F6A", targetRecordPath);
  if (taxonomy.taxonomyId !== TAXONOMY_ID || taxonomy.taxonomyVersion !== "2.0.0"
    || taxonomy.status !== "DRAFT"
    || canonicalHash(taxonomy) !== "67ecd13e49e756df6fce2def9f40fe11eb8831ef9a68097299d37324ac588b79") {
    fail("TAXONOMY_2_0_0_BASE_STALE");
  }
  const history = taxonomyHistory(root);
  const semanticPayloadFingerprint = canonicalHash(taxonomySemanticProjection(taxonomy));
  const current = {
    taxonomyId: taxonomy.taxonomyId,
    taxonomyVersion: taxonomy.taxonomyVersion,
    status: taxonomy.status,
    contentHash: canonicalHash(taxonomy),
    recordPath: "taxonomy/" + taxonomy.taxonomyId + "-" + taxonomy.taxonomyVersion + ".json",
  };
  const approvedPrecedents = history.filter((row) => row.status === "APPROVED");
  return {
    decision: "CREATE_NEW_APPROVED_TAXONOMY_SNAPSHOT",
    option: "A",
    taxonomyId: taxonomy.taxonomyId,
    currentTaxonomyVersion: taxonomy.taxonomyVersion,
    currentStatus: taxonomy.status,
    currentContentHash: canonicalHash(taxonomy),
    currentRecordMustRemainImmutable: true,
    currentSnapshotMustRemainImmutable: true,
    targetTaxonomyVersion: APPROVED_TAXONOMY_VERSION,
    targetStatus: "APPROVED",
    targetRecordPath,
    targetRecordCreated: false,
    proposedApprovedTaxonomyVersion: APPROVED_TAXONOMY_VERSION,
    versionBump: "PATCH",
    ownerArchitectureDecision: "APPROVED",
    ownerArchitectureDecisionDate: TAXONOMY_DECISION_DATE,
    frameworkCode: taxonomy.cefrFrameworks?.find((row: JsonObject) => row.frameworkCode === FRAMEWORK_CODE)?.frameworkCode ?? null,
    frameworkVersion: taxonomy.cefrFrameworks?.find((row: JsonObject) => row.frameworkCode === FRAMEWORK_CODE)?.frameworkVersion ?? null,
    semanticTaxonomyChangeRequired: false,
    semanticPayloadFields: TAXONOMY_SEMANTIC_PAYLOAD_FIELDS,
    semanticPayloadFingerprint: semanticPayloadFingerprint,
    approvalOnlySnapshotMetadataFields: TAXONOMY_APPROVAL_SNAPSHOT_METADATA_FIELDS,
    nestedSemanticLifecycleFieldsRemainInComparison: true,
    requiredSemanticDiff: 0,
    futureSemanticDiffValidationRequired: true,
    futureSemanticDiffCurrentlyVerified: false,
    taxonomyRevisionFieldUsed: false,
    evidence: {
      identityVersioningPolicy: [
        "docs/architecture/master-vocabulary-v2-identity-versioning-policy.md#taxonomy-snapshot-lifecycleversion-rule defines immutable taxonomy snapshots and lifecycle version bumps.",
        "docs/architecture/master-vocabulary-v2-identity-versioning-policy.md#taxonomy-snapshot-lifecycleversion-rule maps lifecycle-only, additive, and breaking taxonomy changes to PATCH, MINOR, and MAJOR.",
        "The reproducible release snapshot policy requires release pins to exact immutable taxonomy snapshots.",
        "The Phase 2F.6A owner architecture decision explicitly maps lifecycle/governance-only changes to PATCH, additive semantic changes to MINOR, and breaking semantic changes to MAJOR.",
      ],
      schema: "vocabflow-dataset/schemas/taxonomy.schema.json permits DRAFT or APPROVED and requires a semVer taxonomyVersion; it does not define a status-transition version increment.",
      validator: "scripts/validate-master-vocabulary-v2.ts:674-675 rejects a non-APPROVED taxonomy pin in an APPROVED release.",
      observedTaxonomySnapshots: history,
      approvedSnapshotPrecedents: approvedPrecedents,
      canaryHasTaxonomyPin: (readJson<JsonObject>(root, DATASET + "/releases/canary-v2.1.0/dataset.json").includedTaxonomySnapshots ?? []).length > 0,
      repositoryValidVersionBumpForApprovalOnlyStatusChange: "PATCH_BY_PHASE_2F6A_OWNER_DECISION",
      sameVersionArtifactCanBePinnedAlongsideCurrentSnapshot: false,
    },
    lifecycleOnlyStatusChangeWouldPreserveTaxonomySemanticFields: true,
    finalReleaseBlockedPendingOwnerArchitectureDecision: false,
    currentSnapshot: current,
    approvalTarget: {
      taxonomyId: taxonomy.taxonomyId,
      taxonomyVersion: APPROVED_TAXONOMY_VERSION,
      status: "APPROVED",
      recordPath: targetRecordPath,
      contentHash: null,
      snapshotCreated: false,
      frameworkCode: FRAMEWORK_CODE,
      frameworkVersion: FRAMEWORK_VERSION,
    },
  };
}

function buildAudit(root: string): JsonObject {
  const datasetRoot = path.join(root, DATASET);
  const rcPackageRoot = path.join(root, RC_RELATIVE);
  const previousAudit = readJson<JsonObject>(root, AUDIT_WORKSPACE_RELATIVE + "/rc-audit.json");
  const phase2F6Decision = previousAudit.historicalPhase2F6Decision ?? previousAudit.decision;
  if (previousAudit.rc?.fingerprint !== RC_FINGERPRINT
    || previousAudit.rc?.treeFingerprint !== RC_TREE_FINGERPRINT
    || phase2F6Decision?.rcFinalAuditPass !== true
    || phase2F6Decision?.contentCorrectionRequired !== false
    || phase2F6Decision?.nextRequiredRc !== "NONE"
    || phase2F6Decision?.taxonomyApprovalPolicyResolved !== false
    || phase2F6Decision?.approvedReleaseBuildTechnicallyReady !== false) {
    fail("PHASE_2F6_BASE_AUDIT_STALE");
  }
  try {
    execFileSync("git", ["merge-base", "--is-ancestor", REQUIRED_PHASE_2F6_BASELINE, "HEAD"], { cwd: root, stdio: "ignore" });
  } catch {
    fail("PHASE_2F6_BASELINE_NOT_IN_ANCESTRY", REQUIRED_PHASE_2F6_BASELINE);
  }
  if (existsSync(path.join(root, FINAL_RELEASE_RELATIVE))) fail("FINAL_RELEASE_MUST_NOT_EXIST_IN_PHASE_2F6A");
  const manifest = readJson<JsonObject>(rcPackageRoot, "dataset.json");
  const rcEvidence = readJson<JsonObject>(rcPackageRoot, "reports/release-candidate-evidence.json");
  const rcWorkspace = readJson<JsonObject>(root, RC_WORKSPACE_RELATIVE + "/summary.json");
  const authorization = readJson<JsonObject>(root, RC_WORKSPACE_RELATIVE + "/authorization.json");
  const promotionPlan = readJson<JsonObject>(root, RC_WORKSPACE_RELATIVE + "/canonical-promotion-plan.json");
  const semanticManifest = readJson<JsonObject>(root, SEMANTIC_WORKSPACE_RELATIVE + "/manifest.json");
  const semanticMap = readJson<JsonObject[]>(root, SEMANTIC_WORKSPACE_RELATIVE + "/candidate-master-map.json");
  const semanticOwnerReview = readJson<JsonObject>(root, SEMANTIC_WORKSPACE_RELATIVE + "/owner-review.json");
  const cefrManifest = readJson<JsonObject>(root, CEFR_WORKSPACE_RELATIVE + "/manifest.json");
  const cefrDecisions = readJson<JsonObject>(root, CEFR_WORKSPACE_RELATIVE + "/cefr-decisions.json");
  const cefrOwnerApproval = readJson<JsonObject>(root, CEFR_WORKSPACE_RELATIVE + "/full-owner-approval.json");
  const classificationRegistry = readJson<JsonObject>(root, CEFR_WORKSPACE_RELATIVE + "/classification-registry.json");

  if (manifest.datasetVersion !== RC_VERSION || manifest.status !== "IN_REVIEW") fail("RC_BASE_STALE", "version-or-status");
  const counts = {
    lexemes: (manifest.includedLexemes ?? []).length,
    senses: (manifest.includedSenses ?? []).length,
    classifications: (manifest.includedClassifications ?? []).length,
    provenance: (manifest.includedProvenance ?? []).length,
    taxonomySnapshots: (manifest.includedTaxonomySnapshots ?? []).length,
    media: (manifest.includedMediaAssets ?? []).length + (manifest.includedMediaAssetVersions ?? []).length,
    learningSets: (manifest.includedLearningSets ?? []).length,
    relations: (manifest.includedRelations ?? []).length,
  };
  const expectedCounts = { lexemes: 87, senses: 100, classifications: 99, provenance: 799, taxonomySnapshots: 1, media: 0, learningSets: 0, relations: 0 };
  if (canonicalHash(counts) !== canonicalHash(expectedCounts)) fail("RC_BASE_STALE", "candidate-counts");

  const treeFp = treeFingerprint(rcPackageRoot);
  if (treeFp !== RC_TREE_FINGERPRINT) fail("RC_IMMUTABILITY_VIOLATION", treeFp);
  const allPinGroups: Array<{ field: string; idField: string; revisionField?: string }> = [
    { field: "includedLexemes", idField: "masterLexemeId", revisionField: "lexemeRevision" },
    { field: "includedSenses", idField: "masterSenseId", revisionField: "senseRevision" },
    { field: "includedClassifications", idField: "classificationId", revisionField: "classificationRevision" },
    { field: "includedTaxonomySnapshots", idField: "taxonomyId", revisionField: "taxonomyVersion" },
    { field: "includedProvenance", idField: "provenanceId" },
  ];
  const candidateDataPins: JsonObject[] = [];
  const pinContentMismatches: JsonObject[] = [];
  for (const group of allPinGroups) {
    for (const pin of manifest[group.field] as JsonObject[]) {
      const record = readPackagedRecord(rcPackageRoot, String(pin.recordPath));
      const actualHash = canonicalHash(record);
      if (actualHash !== pin.contentHash || record[group.idField] !== pin[group.idField]
        || (group.revisionField && record[group.revisionField] !== pin[group.revisionField])) {
        pinContentMismatches.push({ field: group.field, id: pin[group.idField], recordPath: pin.recordPath });
      }
      candidateDataPins.push({ recordPath: pin.recordPath, contentHash: pin.contentHash });
    }
  }
  candidateDataPins.sort((left, right) => String(left.recordPath).localeCompare(String(right.recordPath), "en"));
  const schemaHashes = SCHEMA_FILES.map((file) => ({
    path: "schemas/" + file,
    sha256: sha256Bytes(readFileSync(path.join(rcPackageRoot, "schemas", file))),
  }));
  const taxonomyPin = (manifest.includedTaxonomySnapshots as JsonObject[])[0];
  const authorizationFingerprint = canonicalHash(authorization);
  const promotionFingerprint = rcWorkspace.canonicalPromotionPlanFingerprint;
  const candidateFingerprint = canonicalHash({
    artifactType: "RELEASE_CANDIDATE_FINGERPRINT",
    candidateManifest: manifest,
    candidateDataPins,
    schemaHashes,
    taxonomyHash: taxonomyPin.contentHash,
    authorizationFingerprint,
    canonicalPromotionPlanFingerprint: promotionFingerprint,
  });
  if (candidateFingerprint !== RC_FINGERPRINT || rcEvidence.candidateFingerprint !== candidateFingerprint
    || rcEvidence.candidateTreeFingerprint !== treeFp || rcEvidence.candidateManifestContentHash !== canonicalHash(manifest)) {
    fail("RC_BASE_STALE", "candidate-fingerprint");
  }
  if (authorizationFingerprint !== rcWorkspace.authorizationFingerprint
    || authorization.authorizedCefrFingerprint !== AUTHORIZED_CEFR_FINGERPRINT
    || promotionFingerprint !== CANONICAL_PROMOTION_PLAN_FINGERPRINT
    || promotionPlan.promotionPlanFingerprint !== CANONICAL_PROMOTION_PLAN_FINGERPRINT
    || semanticManifest.draftPackageFingerprint !== "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d"
    || semanticOwnerReview.draftFingerprint !== semanticManifest.draftPackageFingerprint
    || semanticOwnerReview.summary?.approveDraft !== 100
    || semanticOwnerReview.summary?.requestChanges !== 0
    || cefrManifest.cefrDraftFingerprint !== AUTHORIZED_CEFR_FINGERPRINT
    || cefrOwnerApproval.fullOwnerApprovedCefrFingerprint !== AUTHORIZED_CEFR_FINGERPRINT
    || cefrOwnerApproval.approvedCandidateCount !== 100
    || cefrManifest.taxonomyPin?.contentHash !== taxonomyPin.contentHash
    || cefrManifest.taxonomyPin?.taxonomyVersion !== taxonomyPin.taxonomyVersion) {
    fail("RC_BASE_STALE", "authorization-or-promotion-fingerprint");
  }

  const lexemeRecords = (manifest.includedLexemes as JsonObject[]).map((pin) => readPackagedRecord(rcPackageRoot, String(pin.recordPath)));
  const senseRecords = (manifest.includedSenses as JsonObject[]).map((pin) => readPackagedRecord(rcPackageRoot, String(pin.recordPath)));
  const classRecords = (manifest.includedClassifications as JsonObject[]).map((pin) => readPackagedRecord(rcPackageRoot, String(pin.recordPath)));
  const taxonomyRecord = readPackagedRecord(rcPackageRoot, String(taxonomyPin.recordPath));
  const provenanceRecords = (manifest.includedProvenance as JsonObject[]).map((pin) => readPackagedRecord(rcPackageRoot, String(pin.recordPath)));
  const provenancePins = manifest.includedProvenance as JsonObject[];
  const provenancePinById = new Map(provenancePins.map((pin) => [String(pin.provenanceId), pin]));
  const provenanceIds = new Set(provenancePinById.keys());
  const canonicalProvenanceMismatches: string[] = [];
  for (const pin of provenancePins) {
    const rcRecord = readPackagedRecord(rcPackageRoot, String(pin.recordPath));
    const canonicalPath = path.join(datasetRoot, String(pin.recordPath));
    if (!existsSync(canonicalPath)) {
      canonicalProvenanceMismatches.push(String(pin.provenanceId));
      continue;
    }
    const canonicalRecord = JSON.parse(readFileSync(canonicalPath, "utf8")) as JsonObject;
    if (canonicalHash(rcRecord) !== canonicalHash(canonicalRecord) || canonicalHash(canonicalRecord) !== pin.contentHash) {
      canonicalProvenanceMismatches.push(String(pin.provenanceId));
    }
  }
  const provenanceReferences = new Set<string>();
  for (const record of [...lexemeRecords, ...senseRecords, ...classRecords, taxonomyRecord]) {
    collectProvenanceIds(record).forEach((id) => provenanceReferences.add(id));
  }
  const danglingProvenance = [...provenanceReferences].filter((id) => !provenanceIds.has(id)).sort();
  const sourceTypeCounts: JsonObject = {};
  for (const record of provenanceRecords) sourceTypeCounts[record.sourceType] = (sourceTypeCounts[record.sourceType] ?? 0) + 1;
  const classificationsWithoutRequiredApprovalProvenance = classRecords
    .filter((record) => record.dimension === "CEFR" && (!Array.isArray(record.sourceProvenanceIds) || record.sourceProvenanceIds.length === 0))
    .map((record) => record.classificationId);
  const prohibitedRightsClaims = provenanceRecords
    .filter((record) => record.sourceType === "LICENSED_SOURCE" || record.sourceType === "PUBLIC_DOMAIN_SOURCE")
    .map((record) => ({ provenanceId: record.provenanceId, sourceType: record.sourceType, sourceName: record.sourceName ?? null }));

  const semanticCandidateIds = new Set(semanticMap.map((row) => String(row.masterSenseId)));
  const ownerSenseIds = new Set((semanticOwnerReview.candidateDecisions as JsonObject[])
    .filter((row) => row.editorialReviewStatus === "APPROVE_DRAFT")
    .map((row) => String(row.masterSenseId)));
  const ownerLexemeIds = [...new Set((semanticOwnerReview.candidateDecisions as JsonObject[])
    .filter((row) => row.editorialReviewStatus === "APPROVE_DRAFT")
    .map((row) => String(row.masterLexemeId)))];
  const rcSenseIds = (manifest.includedSenses as JsonObject[]).map((pin) => String(pin.masterSenseId));
  const rcLexemeIds = (manifest.includedLexemes as JsonObject[]).map((pin) => String(pin.masterLexemeId));
  const cohortExact = exactIdSet([...semanticCandidateIds], rcSenseIds)
    && exactIdSet([...ownerSenseIds], rcSenseIds)
    && exactIdSet(ownerLexemeIds, rcLexemeIds)
    && exactIdSet((manifest.includedLexemes as JsonObject[]).map((pin) => String(pin.masterLexemeId)), ownerLexemeIds);
  if (!cohortExact || semanticMap.length !== 100 || ownerSenseIds.size !== 100 || ownerLexemeIds.length !== 87) {
    fail("RC_COHORT_MISMATCH");
  }

  const semanticAudit = compareOwnerApprovedSemanticContent(root, semanticMap, lexemeRecords, senseRecords);
  const cefrRows = cefrDecisions.rows as JsonObject[];
  const cefrStatusRows = cefrRows.filter((row) => row.ownerDecisionStatus === "ACCEPTED" || row.ownerDecisionStatus === "ACCEPTED_UNCLASSIFIED");
  const registryBySense = new Map((classificationRegistry.mappings as JsonObject[]).map((row) => [String(row.masterSenseId), row]));
  const cefrAudit = compareCefr(cefrRows, classRecords);
  const classificationIdsFromDecision = cefrRows
    .filter((row) => row.editorialDecision?.valueCode !== null)
    .map((row) => String(row.editorialDecision?.classificationId));
  const classificationIdsFromRegistry = (classificationRegistry.mappings as JsonObject[])
    .filter((row) => row.classificationId)
    .map((row) => String(row.classificationId));
  const classIdDrift = exactIdSet(classificationIdsFromDecision, (manifest.includedClassifications as JsonObject[]).map((pin) => String(pin.classificationId)))
    && exactIdSet(classificationIdsFromRegistry, (manifest.includedClassifications as JsonObject[]).map((pin) => String(pin.classificationId)))
    ? 0
    : Math.abs(classificationIdsFromDecision.length - classRecords.length) + Math.abs(classificationIdsFromRegistry.length - classRecords.length) + 1;
  const light = classRecords.find((record) => record.classificationId === LIGHT_ID);
  const water = classRecords.find((record) => record.classificationId === WATER_ID);
  const fuseClassifications = classRecords.filter((record) => record.masterSenseId === FUSE_SENSE_ID && record.dimension === "CEFR");
  const lightFinalDecisionPreserved = light?.masterSenseId === LIGHT_SENSE_ID && light.classificationRevision === 2 && light.valueCode === "A1";
  const waterReusePreserved = water?.masterSenseId === WATER_SENSE_ID && water.classificationRevision === 1 && water.valueCode === "A2";
  const fuseUnclassifiedPreserved = fuseClassifications.length === 0
    && cefrRows.find((row) => row.masterSenseId === FUSE_SENSE_ID)?.editorialDecision?.valueCode === null;
  const spotChecks = findSpotChecks(lexemeRecords, senseRecords, semanticAudit);

  const lifecycleDefinitions: Array<{ kind: EntityKind; pins: JsonObject[]; records: JsonObject[]; idField: string; revisionField: string }> = [
    { kind: "LEXEME", pins: manifest.includedLexemes, records: lexemeRecords, idField: "masterLexemeId", revisionField: "lexemeRevision" },
    { kind: "SENSE", pins: manifest.includedSenses, records: senseRecords, idField: "masterSenseId", revisionField: "senseRevision" },
    { kind: "CLASSIFICATION", pins: manifest.includedClassifications, records: classRecords, idField: "classificationId", revisionField: "classificationRevision" },
  ];
  const inventories: JsonObject = {};
  const provenanceRefsByRecord = new Map<string, string[]>();
  for (const group of lifecycleDefinitions) {
    const hashes = new Map(group.pins.map((pin) => [String(pin[group.idField]), String(pin.contentHash)]));
    const paths = new Map(group.pins.map((pin) => [String(pin[group.idField]), String(pin.recordPath)]));
    inventories[group.kind] = inventoryByStatus(group.kind, group.records, group.idField, group.revisionField, hashes, paths);
    for (const record of group.records) provenanceRefsByRecord.set(`${group.kind}:${record[group.idField]}`, [...collectProvenanceIds(record)]);
  }
  const approvalRows = makeApprovalRows(root, {
    LEXEME: lexemeRecords,
    SENSE: senseRecords,
    CLASSIFICATION: classRecords,
  }, provenanceIds, canonicalRevisionIndex(root));
  const approvalActions: JsonObject = {};
  for (const row of approvalRows) approvalActions[row.entityType] = (approvalActions[row.entityType] ?? 0) + 1;
  const approvalPlanReady = approvalRows.every((row) => row.action === "CREATE_APPROVED_NEXT_REVISION" || row.action === "ALREADY_APPROVED_REUSE");
  const expectedLifecycleCounts = {
    LEXEME: { APPROVED: 0, IN_REVIEW: 3, DRAFT: 84, other: 0 },
    SENSE: { APPROVED: 0, IN_REVIEW: 2, DRAFT: 98, other: 0 },
    CLASSIFICATION: { APPROVED: 0, IN_REVIEW: 1, DRAFT: 98, other: 0 },
  };
  const expectedApprovalCounts = { LEXEME: 87, SENSE: 100, CLASSIFICATION: 99 };
  const actualApprovalCounts = {
    LEXEME: approvalRows.filter((row) => row.entityType === "LEXEME" && row.action === "CREATE_APPROVED_NEXT_REVISION").length,
    SENSE: approvalRows.filter((row) => row.entityType === "SENSE" && row.action === "CREATE_APPROVED_NEXT_REVISION").length,
    CLASSIFICATION: approvalRows.filter((row) => row.entityType === "CLASSIFICATION" && row.action === "CREATE_APPROVED_NEXT_REVISION").length,
  };
  const lifecycleCountsExact = canonicalHash({
    LEXEME: inventories.LEXEME.counts,
    SENSE: inventories.SENSE.counts,
    CLASSIFICATION: inventories.CLASSIFICATION.counts,
  }) === canonicalHash(expectedLifecycleCounts);
  const approvalCountsExact = canonicalHash(actualApprovalCounts) === canonicalHash(expectedApprovalCounts)
    && approvalPlanReady && approvalRows.length === 286;

  const taxonomyPlan = checkTaxonomyPlan(root, taxonomyRecord);
  const runtimeAudit = runtimeArtifacts(rcPackageRoot);
  const canaryRepositoryState = assertCanaryRepositoryState(root);
  const rcValidation = validateMasterVocabularyV2({
    datasetRoot: rcPackageRoot,
    schemaRoot: path.join(rcPackageRoot, "schemas"),
    writeReport: false,
    validatedAt: String(manifest.createdAt),
  });
  const canaryManifest = readJson<JsonObject>(root, DATASET + "/releases/canary-v2.1.0/dataset.json");
  const validationContract = {
    approvedReleaseManifestFields: {
      schemaPath: "vocabflow-dataset/schemas/dataset.schema.json:160",
      required: ["releasedAt", "releaseHash", "releaseHashAlgorithm"],
      releaseHashAlgorithm: "sha256-canonical-json-v1",
      validatorPath: "scripts/validate-master-vocabulary-v2.ts:411-420",
      releaseHashRule: "SHA-256 of RFC 8785/JCS canonical dataset manifest with releaseHash omitted.",
    },
    approvedRecordLifecycle:
      "scripts/validate-master-vocabulary-v2.ts:669-675 requires included Lexeme, Sense, Classification, Learning Set, Relation, and Taxonomy records to be APPROVED when manifest.status is APPROVED.",
    provenanceRule:
      "scripts/validate-master-vocabulary-v2.ts:498-503 resolves every supplied Provenance reference; line 586 requires non-empty sourceProvenanceIds for APPROVED CEFR/EXAM/SCHOOL_LEVEL Classifications. No OWNER_REVIEW-only sourceType rule is implemented.",
  };
  const rightsMetadataExplicit = semanticManifest.sourceRightsVerified === false
    && cefrManifest.sourceRightsVerified === false
    && rcEvidence.sourceRightsVerified === false;
  const sourceTextMetadataExplicit = semanticOwnerReview.summary?.sourceOverlap?.sourceTextReused === false
    && rcEvidence.sourceTextReused === false;
  const sourceMediaMetadataExplicit = rcEvidence.sourceMediaReused === false;
  const sourceRightsVerified = semanticManifest.sourceRightsVerified === true
    || cefrManifest.sourceRightsVerified === true
    || rcEvidence.sourceRightsVerified === true;
  const sourceTextReused = semanticOwnerReview.summary?.sourceOverlap?.sourceTextReused === true
    || rcEvidence.sourceTextReused === true;
  const sourceMediaReused = rcEvidence.sourceMediaReused === true || counts.media > 0;
  const auditPass = pinContentMismatches.length === 0
    && canonicalProvenanceMismatches.length === 0
    && danglingProvenance.length === 0
    && classificationsWithoutRequiredApprovalProvenance.length === 0
    && prohibitedRightsClaims.length === 0
    && cohortExact
    && lifecycleCountsExact
    && approvalCountsExact
    && semanticAudit.totalSemanticContentDrift === 0
    && semanticAudit.sourceHashMismatches === 0
    && cefrAudit.cefrValueDrift === 0
    && cefrAudit.classificationIdDrift === 0
    && cefrAudit.confidenceDrift === 0
    && cefrAudit.reusedClassificationRecordDrift === 0
    && classIdDrift === 0
    && cefrStatusRows.length === 100
    && cefrAudit.distributionExact
    && cefrAudit.duplicatePrimaryCefrCount === 0
    && lightFinalDecisionPreserved
    && waterReusePreserved
    && fuseUnclassifiedPreserved
    && runtimeAudit.runtimeArtifacts === 0
    && canaryRepositoryState.canaryWorkingTreeClean
    && canaryRepositoryState.headCanaryGitTreeSha === canaryRepositoryState.authoritativeCanaryGitTreeSha
    && canaryRepositoryState.remoteCanaryGitTreeSha === canaryRepositoryState.authoritativeCanaryGitTreeSha
    && rightsMetadataExplicit
    && sourceTextMetadataExplicit
    && sourceMediaMetadataExplicit
    && !sourceRightsVerified
    && !sourceTextReused
    && !sourceMediaReused
    && rcValidation.status === "PASS"
    && rcValidation.errorCount === 0
    && rcValidation.warningCount === 0;
  if (!auditPass) fail("RC_FINAL_AUDIT_FAILED", JSON.stringify({
    pinContentMismatches: pinContentMismatches.length,
    canonicalProvenanceMismatches: canonicalProvenanceMismatches.length,
    danglingProvenance: danglingProvenance.length,
    classificationsWithoutRequiredApprovalProvenance: classificationsWithoutRequiredApprovalProvenance.length,
    prohibitedRightsClaims: prohibitedRightsClaims.length,
    cohortExact,
    semanticDrift: semanticAudit.totalSemanticContentDrift,
    semanticSourceHashMismatches: semanticAudit.sourceHashMismatches,
    cefrValueDrift: cefrAudit.cefrValueDrift,
    cefrIdDrift: cefrAudit.classificationIdDrift,
    cefrConfidenceDrift: cefrAudit.confidenceDrift,
    reusedClassificationRecordDrift: cefrAudit.reusedClassificationRecordDrift,
    classIdDrift,
    cefrStatusRows: cefrStatusRows.length,
    distributionExact: cefrAudit.distributionExact,
    duplicatePrimary: cefrAudit.duplicatePrimaryCefrCount,
    lightFinalDecisionPreserved,
    waterReusePreserved,
    fuseUnclassifiedPreserved,
    runtimeArtifacts: runtimeAudit.runtimeArtifacts,
    canaryIntegrityValid: canaryRepositoryState.canaryWorkingTreeClean
      && canaryRepositoryState.headCanaryGitTreeSha === canaryRepositoryState.authoritativeCanaryGitTreeSha
      && canaryRepositoryState.remoteCanaryGitTreeSha === canaryRepositoryState.authoritativeCanaryGitTreeSha,
    rightsMetadataExplicit,
    sourceTextMetadataExplicit,
    sourceMediaMetadataExplicit,
    sourceRightsVerified,
    sourceTextReused,
    sourceMediaReused,
    validation: { status: rcValidation.status, errors: rcValidation.errorCount, warnings: rcValidation.warningCount },
    lifecycleCountsExact,
    approvalCountsExact,
    approvalPlanReady,
    actualApprovalCounts,
    approvalRows: approvalRows.length,
  }));

  const exactStatusCounts = {
    LEXEME: inventories.LEXEME.counts,
    SENSE: inventories.SENSE.counts,
    CLASSIFICATION: inventories.CLASSIFICATION.counts,
  };
  const audit = {
    artifactType: "HYBRID_100_RC_FINAL_AUDIT",
    status: "PASS",
    historicalPhase2F6Decision: {
      asOfDate: "2026-10-05",
      rcFinalAuditPass: true,
      contentCorrectionRequired: false,
      nextRequiredRc: "NONE",
      taxonomyApprovalPolicyResolved: false,
      approvedReleaseBuildTechnicallyReady: false,
      approvedReleaseAuthorized: false,
      recommendation: "APPROVE_RC_FOR_FINAL_RELEASE_BUILD",
      historicalTaxonomyDecision: "TAXONOMY_APPROVAL_POLICY_AMBIGUOUS",
    },
    phase2F6BaselineCommit: REQUIRED_PHASE_2F6_BASELINE,
    phase2F6BaselineAncestryVerified: true,
    rc: {
      version: manifest.datasetVersion,
      status: manifest.status,
      fingerprint: candidateFingerprint,
      treeFingerprint: treeFp,
      immutabilityValid: true,
      releaseHashPresent: false,
      counts,
      pinContentMismatches,
    },
    inputFingerprints: {
      authorizedCefrFingerprint: AUTHORIZED_CEFR_FINGERPRINT,
      semanticDraftFingerprint: semanticManifest.draftPackageFingerprint,
      cefrWorkspaceFingerprint: cefrManifest.cefrDraftFingerprint,
      canonicalPromotionPlanFingerprint: promotionFingerprint,
      authorizationFingerprint,
    },
    cohort: {
      senseCohortExact: true,
      lexemeCohortExact: true,
      approvedOwnerSenseCount: ownerSenseIds.size,
      approvedOwnerLexemeCount: ownerLexemeIds.length,
      candidateSenseCount: rcSenseIds.length,
      candidateLexemeCount: rcLexemeIds.length,
      noExtraRootSense: true,
      ownerDecisionStatusCount: cefrStatusRows.length,
    },
    semanticContent: {
      ...semanticAudit,
      semanticContentDrift: semanticAudit.totalSemanticContentDrift,
      knownEditorialSpotChecks: spotChecks,
      allKnownEditorialSpotChecksMatch: spotChecks.every((row) => row.present && row.matchesOwnerReviewedPackage),
    },
    cefr: {
      ...cefrAudit,
      classificationIdDrift: classIdDrift,
      lightFinalDecisionPreserved: lightFinalDecisionPreserved,
      light: light ? { classificationId: light.classificationId, revision: light.classificationRevision, valueCode: light.valueCode, status: light.status } : null,
      waterReusePreserved,
      water: water ? { classificationId: water.classificationId, revision: water.classificationRevision, valueCode: water.valueCode, status: water.status } : null,
      fuseUnclassifiedPreserved,
      fuseSenseId: FUSE_SENSE_ID,
      fuseClassificationCount: fuseClassifications.length,
    },
    provenance: {
      candidateProvenanceCount: provenanceRecords.length,
      sourceTypeCounts,
      danglingProvenance: danglingProvenance.length,
      danglingProvenanceIds: danglingProvenance,
      canonicalContentMismatches: canonicalProvenanceMismatches.length,
      canonicalContentMismatchIds: canonicalProvenanceMismatches,
      pinContentMismatches: pinContentMismatches.length,
      prohibitedRightsClaims,
      closureValid: provenanceRecords.length === 799 && danglingProvenance.length === 0
        && canonicalProvenanceMismatches.length === 0 && pinContentMismatches.length === 0
        && classificationsWithoutRequiredApprovalProvenance.length === 0,
      approvedCefrClassificationsWithoutSourceReferences: classificationsWithoutRequiredApprovalProvenance.length,
      approvedCefrClassificationIdsMissingSourceReferences: classificationsWithoutRequiredApprovalProvenance,
      additionalApprovalProvenanceRequiredByCurrentValidator: 0,
      rationale: "All existing references resolve inside the 799-record closure. The current validator requires non-empty Provenance specifically for approved CEFR, EXAM, and SCHOOL_LEVEL Classifications (line 586); all candidate CEFR Classifications already have sourceProvenanceIds, and those IDs are pinned. It does not require a new OWNER_REVIEW event for each lifecycle transition.",
    },
    sourceBoundary: {
      sourceRightsVerified,
      sourceTextReused,
      sourceMediaReused,
      rightsMetadataExplicit,
      sourceTextMetadataExplicit,
      sourceMediaMetadataExplicit,
      semanticOverlapAudit: {
        exactEnglishDefinitionMatches: semanticOwnerReview.summary?.sourceOverlap?.exactEnglishDefinitionMatches ?? null,
        exactEnglishExampleMatches: semanticOwnerReview.summary?.sourceOverlap?.exactEnglishExampleMatches ?? null,
        candidatesWithContiguousOverlapAtLeastEightTokens: semanticOwnerReview.summary?.sourceOverlap?.candidatesWithContiguousOverlapAtLeastEightTokens ?? null,
        unresolvedHighSimilarity: semanticOwnerReview.summary?.sourceOverlap?.highSimilarityUnresolved ?? null,
      },
      sourceRightsAloneIsNotBlocker: !sourceRightsVerified && !sourceTextReused && !sourceMediaReused,
      sourceTypesLicensedOrPublicDomain: prohibitedRightsClaims.length,
      mediaAssets: counts.media,
    },
    lifecycle: {
      currentStatusCounts: exactStatusCounts,
      expectedStatusCounts: expectedLifecycleCounts,
      approvalRevisionCounts: actualApprovalCounts,
      approvalPlanRowCount: approvalRows.length,
      stableIdsPreserved: approvalRows.every((row) => row.action === "CREATE_APPROVED_NEXT_REVISION" || row.action === "ALREADY_APPROVED_REUSE"),
      learnerFacingContentChangesRequired: approvalRows.some((row) => row.action === "BLOCKED_CONTENT"),
      lifecyclePlanReady: approvalPlanReady,
      newIdsAllocated: 0,
    },
    taxonomy: taxonomyPlan,
    finalReleasePlan: {
      datasetVersion: "2.2.0",
      status: "APPROVED",
      datasetId: manifest.datasetId,
      datasetCode: manifest.datasetCode,
      schemaVersion: manifest.schemaVersion,
      counts: {
        lexemes: counts.lexemes,
        senses: counts.senses,
        classifications: counts.classifications,
        taxonomySnapshots: counts.taxonomySnapshots,
        provenance: provenanceRecords.length,
        media: counts.media,
        learningSets: counts.learningSets,
        relations: counts.relations,
      },
      taxonomyVersion: APPROVED_TAXONOMY_VERSION,
      taxonomyStatus: "APPROVED",
      taxonomyVersionBump: "PATCH",
      taxonomySemanticDiffRequired: 0,
      taxonomySemanticDiffCurrentlyVerified: false,
      provenanceCountRecomputed: provenanceRecords.length,
      provenanceCountMayChangeIfFutureContractAddsApprovalEvidence: true,
      officialReleaseHashCreated: false,
      releaseHashAlgorithm: "sha256-canonical-json-v1",
      releaseHashRule: "SHA-256 over RFC 8785/JCS canonical JSON of the final APPROVED dataset manifest with releaseHash omitted; calculate only after all record/taxonomy/provenance pins and releasedAt are final.",
      releaseBuildTechnicallyReady: auditPass && approvalPlanReady && taxonomyPlan.decision === "CREATE_NEW_APPROVED_TAXONOMY_SNAPSHOT"
        && taxonomyPlan.ownerArchitectureDecision === "APPROVED" && taxonomyPlan.semanticTaxonomyChangeRequired === false,
      taxonomyPolicyDecisionFingerprint: null as string | null,
      buildAuthorization: "NOT_AUTHORIZED",
      blocker: null,
      releaseBuildAuthorization: "PENDING",
      releaseCreated: false,
    },
    validatorContract: validationContract,
    validation: {
      rcStatus: rcValidation.status,
      rcErrors: rcValidation.errorCount,
      rcWarnings: rcValidation.warningCount,
      rcInfo: rcValidation.infoCount,
      authoritativeCanaryGitTreeSha: canaryRepositoryState.authoritativeCanaryGitTreeSha,
      headCanaryGitTreeSha: canaryRepositoryState.headCanaryGitTreeSha,
      remoteCanaryGitTreeSha: canaryRepositoryState.remoteCanaryGitTreeSha,
      lastCanaryCommit: canaryRepositoryState.lastCanaryCommit,
      lastCanaryCommitTreeSha: canaryRepositoryState.lastCanaryCommitTreeSha,
      canaryWorkingTreeClean: canaryRepositoryState.canaryWorkingTreeClean,
      canaryCommittedTreeFingerprint: canaryRepositoryState.canaryCommittedTreeFingerprint,
      supersededHistoricalCanaryFingerprint: SUPERSEDED_DIRTY_WORKTREE_FINGERPRINT,
      canaryChanged: false,
      runtimeAudit,
    },
    decision: {
      rcFinalAuditPass: true,
      contentCorrectionRequired: false,
      nextRequiredRc: "NONE",
      taxonomyPolicyOwnerApproved: true,
      taxonomyApprovalPolicyResolved: true,
      approvedReleaseBuildTechnicallyReady: auditPass && approvalPlanReady && taxonomyPlan.decision === "CREATE_NEW_APPROVED_TAXONOMY_SNAPSHOT",
      approvedReleaseAuthorized: false,
      recommendation: "REQUEST_FINAL_RELEASE_BUILD_AUTHORIZATION",
      recommendationRationale: "The owner resolved lifecycle-only taxonomy versioning as a new immutable PATCH snapshot at 2.0.1. RC and approval-revision plans pass, so the approved-release build is technically ready; this phase does not authorize creating taxonomy 2.0.1, entity revisions, release 2.2.0, or its releaseHash.",
      runtimeImportAuthorized: false,
      productionMutationAuthorized: false,
      phaseReady: true,
    },
    auditInputState: {
      canonicalRootMutation: "NONE",
      releaseCandidateMutation: "NONE",
      databaseConnection: "NONE",
      databaseWrites: "NONE",
      reconciliationScanExecuted: "NO",
      importApplyExecuted: "NO",
      migrationsExecuted: "NONE",
      developmentRuntimeMutation: "NO",
      productionConnection: "NONE",
      productionMutation: "NO",
      sourceRightsVerified: false,
      sourceTextReused: false,
      sourceMediaReused: false,
    },
  };

  const plan = {
    audit,
    inventories,
    approvalRows,
    approvalActions,
    taxonomyPlan,
    manifest,
    taxonomyPin,
    taxonomyRecord,
    canaryManifest,
    validation: rcValidation,
    cefrRows,
    registryBySense: Object.fromEntries(registryBySense),
    provenanceRefsByRecord: Object.fromEntries(provenanceRefsByRecord),
    candidateDataPins,
    schemaHashes,
  };
  const taxonomyPolicyDecisionArtifact = buildTaxonomyVersionPolicyDecision(plan);
  audit.taxonomy.policyFingerprint = taxonomyPolicyDecisionArtifact.policyFingerprint;
  audit.finalReleasePlan.taxonomyPolicyDecisionFingerprint = taxonomyPolicyDecisionArtifact.policyFingerprint;
  audit.finalReleasePlan.buildAuthorization = "NOT_AUTHORIZED";
  return { ...plan, taxonomyPolicyDecisionArtifact };
}

function finalManifestPlan(plan: JsonObject): JsonObject {
  const rows = plan.approvalRows as JsonObject[];
  const provenancePins = (plan.candidateDataPins as JsonObject[])
    .filter((pin) => String(pin.recordPath).startsWith("provenance/"))
    .map((pin) => ({ recordPath: pin.recordPath, contentHash: pin.contentHash }));
  const counts = {
    lexemes: rows.filter((row) => row.entityType === "LEXEME").length,
    senses: rows.filter((row) => row.entityType === "SENSE").length,
    classifications: rows.filter((row) => row.entityType === "CLASSIFICATION").length,
    taxonomySnapshots: 1,
    provenance: provenancePins.length,
    media: Number(plan.audit.rc.counts.media),
    learningSets: Number(plan.audit.rc.counts.learningSets),
    relations: Number(plan.audit.rc.counts.relations),
  };
  const byKind = (kind: EntityKind): JsonObject[] => rows
    .filter((row) => row.entityType === kind)
    .map((row) => {
      if (row.action === "ALREADY_APPROVED_REUSE") {
        return {
          stableId: row.stableId,
          revision: row.currentRevision,
          recordPath: row.currentRecordPath,
          contentHash: row.currentContentHash,
          action: row.action,
        };
      }
      return {
        stableId: row.stableId,
        revision: row.targetRevision,
        recordPath: row.targetRecordPath,
        contentHash: row.targetContentHash,
        status: "APPROVED",
        action: row.action,
      };
    });
  return {
    artifactType: "PROPOSED_APPROVED_RELEASE_MANIFEST_PLAN",
    status: "PLAN_ONLY_NOT_A_MANIFEST",
    datasetId: plan.manifest.datasetId,
    datasetCode: plan.manifest.datasetCode,
    datasetVersion: "2.2.0",
    schemaVersion: plan.manifest.schemaVersion,
    targetStatus: "APPROVED",
    includedLexemes: byKind("LEXEME"),
    includedSenses: byKind("SENSE"),
    includedClassifications: byKind("CLASSIFICATION"),
    includedTaxonomySnapshots: [{
      taxonomyId: plan.taxonomyPin.taxonomyId,
      currentVersion: plan.taxonomyPin.taxonomyVersion,
      currentRecordPath: plan.taxonomyPin.recordPath,
      currentContentHash: plan.taxonomyPin.contentHash,
      targetVersion: APPROVED_TAXONOMY_VERSION,
      targetRecordPath: "taxonomy/" + TAXONOMY_ID + "-" + APPROVED_TAXONOMY_VERSION + ".json",
      targetContentHash: null,
      currentStatus: plan.taxonomyRecord.status,
      status: "APPROVED_REQUIRED",
      versionBump: "PATCH",
      semanticChangeRequired: false,
      semanticDiffRequired: 0,
      semanticDiffCurrentlyVerified: false,
      targetArtifactCreated: false,
      currentSnapshotMustRemainImmutable: true,
      approvalMechanism: "NEW_IMMUTABLE_SNAPSHOT",
    }],
    includedProvenanceCount: provenancePins.length,
    includedProvenancePins: provenancePins,
    includedMediaAssets: [],
    includedMediaAssetVersions: [],
    includedLearningSets: [],
    includedRelations: [],
    counts,
    releaseHash: null,
    releaseHashAlgorithm: "sha256-canonical-json-v1",
    releasedAt: "TO_BE_SET_ONLY_IN_A_SEPARATELY_AUTHORIZED_RELEASE_BUILD",
    releaseHashCalculation: "SHA-256 of RFC 8785/JCS canonical JSON of the final APPROVED manifest with releaseHash omitted, after all pins and releasedAt are final.",
    releaseCreated: false,
    officialReleaseHashCreated: false,
    taxonomyApprovalPolicyResolved: true,
    taxonomyPolicyDecision: "CREATE_NEW_APPROVED_TAXONOMY_SNAPSHOT",
    taxonomyPolicyFingerprint: plan.taxonomyPolicyDecisionArtifact?.policyFingerprint ?? null,
    approvedReleaseBuildTechnicallyReady: true,
    approvedReleaseAuthorization: "PENDING",
    runtimeImportAuthorized: false,
    productionMutationAuthorized: false,
    databaseWrites: "NONE",
  };
}

function buildTaxonomyVersionPolicyDecision(plan: JsonObject): JsonObject {
  const manifestPlan = finalManifestPlan(plan);
  delete manifestPlan.taxonomyPolicyFingerprint;
  const fingerprintPayload = {
    artifactType: "TAXONOMY_VERSION_POLICY_FINGERPRINT_PAYLOAD",
    ownerArchitectureDecision: "APPROVED",
    decision: "CREATE_NEW_APPROVED_TAXONOMY_SNAPSHOT",
    taxonomyId: TAXONOMY_ID,
    currentSnapshot: {
      taxonomyVersion: "2.0.0",
      status: "DRAFT",
      contentHash: "67ecd13e49e756df6fce2def9f40fe11eb8831ef9a68097299d37324ac588b79",
      immutable: true,
    },
    approvalTarget: {
      taxonomyVersion: APPROVED_TAXONOMY_VERSION,
      status: "APPROVED",
      versionBump: "PATCH",
      semanticChange: false,
      sameTaxonomyId: true,
      materialized: false,
    },
    versionPolicy: TAXONOMY_VERSION_POLICY,
    semanticEqualityContract: {
      includedFields: TAXONOMY_SEMANTIC_PAYLOAD_FIELDS,
      excludedTopLevelSnapshotMetadataFields: TAXONOMY_APPROVAL_SNAPSHOT_METADATA_FIELDS,
      nestedSemanticLifecycleFieldsIncluded: true,
      requiredSemanticDiff: 0,
    },
    framework: { frameworkCode: FRAMEWORK_CODE, frameworkVersion: FRAMEWORK_VERSION },
    rcFingerprint: RC_FINGERPRINT,
    rcTreeFingerprint: RC_TREE_FINGERPRINT,
    finalManifestPlanFingerprint: canonicalHash(manifestPlan),
  };
  const policyFingerprint = canonicalHash(fingerprintPayload);
  const repeatedPolicyFingerprint = canonicalHash(JSON.parse(JSON.stringify(fingerprintPayload)));
  if (policyFingerprint !== repeatedPolicyFingerprint) fail("TAXONOMY_POLICY_FINGERPRINT_NOT_DETERMINISTIC");
  return {
    artifactType: "TAXONOMY_VERSION_POLICY_OWNER_DECISION",
    decisionDate: TAXONOMY_DECISION_DATE,
    taxonomyId: TAXONOMY_ID,
    currentVersion: "2.0.0",
    currentVersionStatus: "DRAFT",
    currentContentHash: "67ecd13e49e756df6fce2def9f40fe11eb8831ef9a68097299d37324ac588b79",
    currentVersionImmutable: true,
    approvalTargetVersion: APPROVED_TAXONOMY_VERSION,
    approvalTargetStatus: "APPROVED",
    approvalTargetMaterialized: false,
    versionBump: "PATCH",
    semanticChange: false,
    policy: TAXONOMY_VERSION_POLICY,
    semanticEqualityContract: {
      includedFields: TAXONOMY_SEMANTIC_PAYLOAD_FIELDS,
      excludedTopLevelSnapshotMetadataFields: TAXONOMY_APPROVAL_SNAPSHOT_METADATA_FIELDS,
      nestedSemanticLifecycleFieldsIncluded: true,
      requiredFutureDiff: 0,
      futureDiffCurrentlyVerified: false,
    },
    frameworkCode: FRAMEWORK_CODE,
    frameworkVersion: FRAMEWORK_VERSION,
    authorizedBy: "VocabFlow project owner",
    ownerArchitectureDecision: "APPROVED",
    approvalTargetMaterializationAuthorized: false,
    finalReleaseBuildAuthorized: false,
    runtimeImportAuthorized: false,
    productionMutationAuthorized: false,
    newIdsAllocated: 0,
    rcFingerprint: RC_FINGERPRINT,
    rcTreeFingerprint: RC_TREE_FINGERPRINT,
    finalManifestPlanFingerprint: fingerprintPayload.finalManifestPlanFingerprint,
    fingerprintPayload,
    policyFingerprint,
    repeatedPolicyFingerprint,
    repeatIdentical: policyFingerprint === repeatedPolicyFingerprint,
  };
}

function lifecycleInventory(plan: JsonObject): JsonObject {
  const inventory = plan.inventories as JsonObject;
  return {
    artifactType: "HYBRID_100_RC_LIFECYCLE_STATUS_INVENTORY",
    rcFingerprint: RC_FINGERPRINT,
    lexemes: inventory.LEXEME,
    senses: inventory.SENSE,
    classifications: inventory.CLASSIFICATION,
    taxonomy: {
      taxonomyId: plan.taxonomyRecord.taxonomyId,
      taxonomyVersion: plan.taxonomyRecord.taxonomyVersion,
      currentStatus: plan.taxonomyRecord.status,
      statusCounts: { DRAFT: 1, APPROVED: 0, IN_REVIEW: 0, other: 0 },
      recordsByStatus: { DRAFT: [{ taxonomyId: plan.taxonomyRecord.taxonomyId, taxonomyVersion: plan.taxonomyRecord.taxonomyVersion, contentHash: canonicalHash(plan.taxonomyRecord), recordPath: plan.taxonomyPin.recordPath }], APPROVED: [], IN_REVIEW: [], other: [] },
    },
  };
}

function renderReport(plan: JsonObject): string {
  const audit = plan.audit;
  const lifecycle = audit.lifecycle;
  const statusTable = (["LEXEME", "SENSE", "CLASSIFICATION"] as const)
    .map((kind) => {
      const counts = lifecycle.currentStatusCounts[kind];
      return `| ${kind} | ${counts.APPROVED} | ${counts.IN_REVIEW} | ${counts.DRAFT} | ${counts.other} |`;
    }).join("\n");
  const distribution = Object.entries(audit.cefr.distribution)
    .map(([key, count]) => `${key} = ${count}`).join("; ");
  const sourceTypes = Object.entries(audit.provenance.sourceTypeCounts)
    .map(([key, count]) => `${key}=${count}`).join(", ");
  const taxonomyDecision = audit.taxonomy.decision;
  const historical = audit.historicalPhase2F6Decision;
  return [
    "# Hybrid-100 RC Final Audit — Current State after Phase 2F.6A",
    "",
    `RC fingerprint: ${audit.rc.fingerprint}`,
    `RC tree fingerprint: ${audit.rc.treeFingerprint}`,
    `Authorized CEFR fingerprint: ${audit.inputFingerprints.authorizedCefrFingerprint}`,
    `Canonical promotion plan fingerprint: ${audit.inputFingerprints.canonicalPromotionPlanFingerprint}`,
    "",
    "## Audit result",
    "",
    "- RC: 2.2.0-rc.1 / IN_REVIEW; immutable: YES; package tree and candidate fingerprint match their pinned values.",
    "- Exact cohort: 87/87 Lexemes and 100/100 Senses from the owner-approved map; 99 CEFR Classifications; no extra/missing cohort Sense.",
    `- Candidate counts: ${audit.rc.counts.lexemes} Lexemes, ${audit.rc.counts.senses} Senses, ${audit.rc.counts.classifications} Classifications, ${audit.rc.counts.provenance} Provenance, ${audit.rc.counts.taxonomySnapshots} Taxonomy snapshot; media ${audit.rc.counts.media}, sets ${audit.rc.counts.learningSets}, relations ${audit.rc.counts.relations}.`,
    `- Provenance closure: ${audit.provenance.candidateProvenanceCount}/${audit.provenance.candidateProvenanceCount}; dangling ${audit.provenance.danglingProvenance}; canonical hash/content mismatches ${audit.provenance.canonicalContentMismatches}; source types ${sourceTypes}. PASS.`,
    `- Semantic content drift: ${audit.semanticContent.semanticContentDrift}; CEFR value drift: ${audit.cefr.cefrValueDrift}; Classification ID drift: ${audit.cefr.classificationIdDrift}; confidence drift: ${audit.cefr.confidenceDrift}.`,
    `- CEFR reuse audit: ${audit.cefr.reusedClassificationCount} existing Classification reused; full record hash drift ${audit.cefr.reusedClassificationRecordDrift}. Water keeps its owner-reviewed existing A2 revision 1 record and confidence 0.55; the decision confidence 0.78 is editorial review metadata and does not rewrite a reused record.`,
    `- CEFR distribution: ${distribution}. Duplicate primary CEFR assignments: ${audit.cefr.duplicatePrimaryCefrCount}.`,
    "- Source rights remain UNVERIFIED; source text/media reused: NO. No LICENSED_SOURCE or PUBLIC_DOMAIN_SOURCE claim is present. The authored package reuses no source text/media, so unverified rights alone are not a blocker.",
    "- Spot checks far, acute, toll, hopefully, textile, crawl, and compelling match the owner-reviewed semantic package exactly; no editorial rewrite was performed.",
    `- Light: A1 revision 2 preserved (${audit.cefr.light?.classificationId}); Water: A2 revision 1 reused (${audit.cefr.water?.classificationId}); Fuse: intentionally unclassified (${audit.cefr.fuseSenseId}).`,
    "- RC contains no runtime import projection, reconciliation, mapping, contentVersion, or SQL plan. Canary fingerprint is unchanged.",
    "",
    "## Current lifecycle inventory",
    "",
    "| Entity | APPROVED | IN_REVIEW | DRAFT | other |",
    "|---|---:|---:|---:|---:|",
    statusTable,
    "",
    `- Approval-only next revisions required: ${lifecycle.approvalRevisionCounts.LEXEME} Lexemes, ${lifecycle.approvalRevisionCounts.SENSE} Senses, ${lifecycle.approvalRevisionCounts.CLASSIFICATION} Classifications (286 total). Stable IDs are preserved; target revisions change only revision/status fields; learner-facing content change required: NO. No record has been created.`,
    "- Existing owner-review and project-authored Provenance already close the approved-content references. The current validator requires resolvable Provenance references, not a new OWNER_REVIEW record for each lifecycle transition; no new IDs are planned.",
    "",
    "## Historical Phase 2F.6 decision (2026-10-05)",
    "",
    `- Historical decision: RC pass = ${historical.rcFinalAuditPass ? "YES" : "NO"}; content correction required = ${historical.contentCorrectionRequired ? "YES" : "NO"}; next required RC = ${historical.nextRequiredRc}.`,
    `- At that time, taxonomy policy resolved = ${historical.taxonomyApprovalPolicyResolved ? "YES" : "NO"}; approved release technically ready = ${historical.approvedReleaseBuildTechnicallyReady ? "YES" : "NO"}. The taxonomy approval version policy was unresolved then.`,
    "",
    "## Current state — Phase 2F.6A (2026-10-06)",
    "",
    "- Owner taxonomy architecture decision: APPROVED. Taxonomy policy is resolved; this decision authorizes the architecture only.",
    `- Taxonomy ${audit.taxonomy.taxonomyId}: 2.0.0 / DRAFT remains immutable (${audit.taxonomy.currentContentHash}); planned new snapshot 2.0.1 / APPROVED, PATCH, same taxonomyId, framework ${audit.taxonomy.frameworkCode} / ${audit.taxonomy.frameworkVersion}.`,
    `- Approval-only semantic projection fields: ${TAXONOMY_SEMANTIC_PAYLOAD_FIELDS.join(", ")}. Excluded only top-level snapshot metadata: ${TAXONOMY_APPROVAL_SNAPSHOT_METADATA_FIELDS.join(", ")}. Nested lifecycle fields remain in the comparison. Required future semantic diff = 0; actual 2.0.0→2.0.1 comparison is NOT YET VERIFIED because the target snapshot does not exist.`,
    `- Policy fingerprint: ${plan.taxonomyPolicyDecisionArtifact.policyFingerprint}; repeated canonical computation identical: ${plan.taxonomyPolicyDecisionArtifact.repeatIdentical ? "YES" : "NO"}.`,
    `- Version policy: PATCH = ${TAXONOMY_VERSION_POLICY.PATCH} MINOR = ${TAXONOMY_VERSION_POLICY.MINOR} MAJOR = ${TAXONOMY_VERSION_POLICY.MAJOR}`,
    "- The target snapshot is plan-only and was not materialized. No taxonomyRevision field is used.",
    "",
    "### Validator contract",
    "",
    "- `vocabflow-dataset/schemas/dataset.schema.json:160` requires `releasedAt`, `releaseHash`, and `releaseHashAlgorithm` for APPROVED manifests; algorithm is `sha256-canonical-json-v1`.",
    "- `scripts/validate-master-vocabulary-v2.ts:411-420` verifies SHA-256 over RFC 8785/JCS canonical manifest JSON with `releaseHash` omitted.",
    "- `scripts/validate-master-vocabulary-v2.ts:669-675` requires included Lexeme, Sense, Classification, Learning Set, Relation, and Taxonomy records to be APPROVED. Lines 498-503 require approved content's Provenance references to resolve.",
    `- Historical Phase 2F.6 taxonomy decision was ${historical.historicalTaxonomyDecision}; current resolved decision is ${taxonomyDecision}. Directly pinning the existing DRAFT snapshot in an APPROVED release fails the validator.`,
    "",
    "## Proposed final manifest plan (not created)",
    "",
    `- datasetId/code unchanged; datasetVersion 2.2.0; schemaVersion ${audit.finalReleasePlan.schemaVersion}; eventual status APPROVED.`,
    `- Planned exact pins: ${audit.finalReleasePlan.counts.lexemes} Lexemes, ${audit.finalReleasePlan.counts.senses} Senses, ${audit.finalReleasePlan.counts.classifications} Classifications, taxonomy ${APPROVED_TAXONOMY_VERSION} / APPROVED, ${audit.finalReleasePlan.provenanceCountRecomputed} Provenance, ${audit.finalReleasePlan.counts.media} Media, ${audit.finalReleasePlan.counts.learningSets} Learning Sets, ${audit.finalReleasePlan.counts.relations} Relations.`,
    `- Approval-only next revisions: ${audit.lifecycle.approvalRevisionCounts.LEXEME} Lexemes, ${audit.lifecycle.approvalRevisionCounts.SENSE} Senses, ${audit.lifecycle.approvalRevisionCounts.CLASSIFICATION} Classifications (${audit.lifecycle.approvalRevisionCounts.LEXEME + audit.lifecycle.approvalRevisionCounts.SENSE + audit.lifecycle.approvalRevisionCounts.CLASSIFICATION} total); stable IDs preserved; semantic content changes required: NO. Provenance closure is recomputed from pinned candidate data.`,
    "- Final release build is technically ready, but remains unauthorized. No target revisions or final package artifacts have been created.",
    "- The official releaseHash has not been created. In a separately authorized build, set releasedAt and all final pins first, then compute SHA-256/JCS with releaseHash omitted.",
    "",
    "## Decision",
    "",
    "- RC_FINAL_AUDIT_PASS = YES",
    "- CONTENT_CORRECTION_REQUIRED = NO",
    "- NEXT_REQUIRED_RC = NONE",
    "- TAXONOMY_POLICY_OWNER_APPROVED = YES",
    "- TAXONOMY_APPROVAL_POLICY_RESOLVED = YES",
    "- APPROVED_RELEASE_BUILD_TECHNICALLY_READY = YES",
    "- APPROVED_RELEASE_AUTHORIZED = NO; separate final-build authorization is pending.",
    "- Recommendation: REQUEST_FINAL_RELEASE_BUILD_AUTHORIZATION. This phase does not create or authorize the release build.",
    "- RUNTIME_IMPORT_AUTHORIZED = NO; PRODUCTION_MUTATION_AUTHORIZED = NO.",
    "",
    "## Execution boundary",
    "",
    "Database connection: NONE. Database writes: NONE. Reconciliation scan: NO. Import apply: NO. Migrations: NONE. Development runtime mutation: NO. Production connection/mutation: NO.",
    "No canonical records, lifecycle states, taxonomy 2.0.1, approved entity revisions, RC.1 files, release 2.2.0, or official releaseHash were modified or created.",
    "",
  ].join("\n");
}

function renderOwnerDecision(plan: JsonObject): string {
  const audit = plan.audit;
  return [
    "# Hybrid-100 RC Final Owner Decision — Current State after Phase 2F.6A",
    "",
    "RC: 2.2.0-rc.1",
    `Fingerprint: ${audit.rc.fingerprint}`,
    "",
    "- Audit result: PASS",
    "- Content changes required: NO",
    "- Taxonomy policy resolved: YES — owner-approved architecture decision recorded.",
    "- Taxonomy lineage plan: 2.0.0 / DRAFT remains immutable → 2.0.1 / APPROVED as PATCH; semantic change required: NO; future semantic diff must equal 0 and has not yet been verified because 2.0.1 is not created.",
    "- Framework: CEFR / EDITORIAL-PILOT-1.",
    "- Final release build technically ready: YES. Final build authorization: PENDING; this phase does not authorize execution.",
    "- Recommendation: REQUEST_FINAL_RELEASE_BUILD_AUTHORIZATION; no rc.2 is required for content.",
    "- Taxonomy 2.0.1 created: NO; approved entity revisions created: NO; release 2.2.0 created: NO; official releaseHash created: NO.",
    "- Runtime authorization: NO",
    "- Production authorization: NO",
    "- Database connection/writes: NONE; canonical mutation: NONE.",
    `- Taxonomy policy fingerprint: ${plan.taxonomyPolicyDecisionArtifact.policyFingerprint}`,
    "",
  ].join("\n");
}

function createOutputFiles(plan: JsonObject): Map<string, string> {
  const audit = plan.audit as JsonObject;
  const finalPlan = finalManifestPlan(plan);
  const inventory = lifecycleInventory(plan);
  const revisionPlan = {
    artifactType: "HYBRID_100_APPROVAL_REVISION_PLAN",
    planOnly: true,
    rcFingerprint: RC_FINGERPRINT,
    statusCounts: audit.lifecycle.currentStatusCounts,
    summary: {
      lexemes: audit.lifecycle.approvalRevisionCounts.LEXEME,
      senses: audit.lifecycle.approvalRevisionCounts.SENSE,
      classifications: audit.lifecycle.approvalRevisionCounts.CLASSIFICATION,
      total: audit.lifecycle.approvalRevisionCounts.LEXEME + audit.lifecycle.approvalRevisionCounts.SENSE + audit.lifecycle.approvalRevisionCounts.CLASSIFICATION,
      newIdsAllocated: 0,
      recordsCreated: 0,
      learnerFacingContentChangesRequired: false,
      approvalOnlyTransition: true,
      semanticContentChange: false,
      targetStatus: "APPROVED",
    },
    lifecyclePolicy: {
      lexeme: "Same masterLexemeId; create the next lexemeRevision; do not overwrite an existing revision file.",
      sense: "Same masterSenseId; create the next senseRevision; do not overwrite an existing revision file.",
      classification: "Same classificationId; create the next classificationRevision; do not overwrite an existing revision file.",
      taxonomy: "Not an entity revision; keep taxonomyId and create a new immutable taxonomyVersion snapshot. No taxonomyRevision field is used.",
    },
    rows: plan.approvalRows,
  };
  const validationSummary = {
    artifactType: "HYBRID_100_RC_FINAL_REVIEW_VALIDATION_SUMMARY",
    rcValidatorStatus: audit.validation.rcStatus,
    rcErrorCount: audit.validation.rcErrors,
    rcWarningCount: audit.validation.rcWarnings,
    rcInfoCount: audit.validation.rcInfo,
    rcFingerprint: RC_FINGERPRINT,
    rcTreeFingerprint: RC_TREE_FINGERPRINT,
    candidateRevalidationIsReadOnly: true,
    canonicalValidatorWasNotUsedToPromoteLifecycle: true,
    approvedReleaseValidationNotExecutedBecauseNoApprovedReleaseWasCreated: true,
    canaryCommittedTreeFingerprint: plan.audit.validation.canaryCommittedTreeFingerprint,
    runtimeArtifactCount: audit.validation.runtimeAudit.runtimeArtifacts,
  };
  const workspaceManifest = {
    artifactType: "HYBRID_100_RC_FINAL_REVIEW_WORKSPACE",
    phase: "2F.6A",
    reviewOnly: true,
    rcVersion: RC_VERSION,
    rcFingerprint: RC_FINGERPRINT,
    rcTreeFingerprint: RC_TREE_FINGERPRINT,
    authorizedCefrFingerprint: AUTHORIZED_CEFR_FINGERPRINT,
    canonicalPromotionPlanFingerprint: CANONICAL_PROMOTION_PLAN_FINGERPRINT,
    inputSemanticFingerprint: audit.inputFingerprints.semanticDraftFingerprint,
    inputCefrFingerprint: audit.inputFingerprints.cefrWorkspaceFingerprint,
    workspaceOutputs: [
      "manifest.json",
      "rc-audit.json",
      "lifecycle-status-inventory.json",
      "approval-revision-plan.json",
      "taxonomy-approval-plan.json",
      "taxonomy-version-policy-decision.json",
      "final-release-manifest-plan.json",
      "validation-summary.json",
    ],
    reportOutputs: [AUDIT_REPORT_RELATIVE, OWNER_DECISION_RELATIVE],
    auditResult: "PASS",
    taxonomyApprovalPolicyResolved: true,
    taxonomyPolicyFingerprint: plan.taxonomyPolicyDecisionArtifact.policyFingerprint,
    approvedReleaseBuildTechnicallyReady: true,
    approvedReleaseAuthorized: false,
    runtimeImportAuthorized: false,
    productionMutationAuthorized: false,
    newIdsAllocated: 0,
    canonicalMutation: "NONE",
    rcMutation: "NONE",
  };
  const files = new Map<string, string>();
  files.set(OUTPUTS[0], jsonText(workspaceManifest));
  files.set(OUTPUTS[1], jsonText(audit));
  files.set(OUTPUTS[2], jsonText(inventory));
  files.set(OUTPUTS[3], jsonText(revisionPlan));
  files.set(OUTPUTS[4], jsonText(plan.taxonomyPlan));
  files.set(OUTPUTS[5], jsonText(finalPlan));
  files.set(OUTPUTS[6], jsonText(validationSummary));
  files.set(OUTPUTS[7], renderReport(plan));
  files.set(OUTPUTS[8], renderOwnerDecision(plan));
  files.set(OUTPUTS[9], jsonText(plan.taxonomyPolicyDecisionArtifact));
  return files;
}

function writeAuditFiles(root: string, files: Map<string, string>): void {
  for (const [relativePath, contents] of files) {
    const absolutePath = path.join(root, relativePath);
    mkdirSync(path.dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, "utf8");
  }
}

export function buildFinalAudit(root = REPO_ROOT): JsonObject {
  const plan = buildAudit(root);
  const files = createOutputFiles(plan);
  const differences = [...files.entries()]
    .filter(([relativePath, contents]) => !existsSync(path.join(root, relativePath))
      || readFileSync(path.join(root, relativePath), "utf8") !== contents)
    .map(([relativePath]) => relativePath);
  return { ...plan, outputFiles: files, differences };
}

export function main(args = process.argv.slice(2), root = REPO_ROOT): JsonObject {
  const mode = args.includes("--write") ? "write" : "check";
  if (args.some((arg) => arg !== "--write" && arg !== "--check")) fail("UNKNOWN_ARGUMENT", args.join(" "));
  const plan = buildFinalAudit(root);
  const differences = plan.differences as string[];
  if (mode === "write") writeAuditFiles(root, plan.outputFiles as Map<string, string>);
  const result = {
    status: mode === "write" ? "AUDIT_MATERIALIZED" : differences.length ? "READY_TO_WRITE" : "ALREADY_MATERIALIZED",
    rcFingerprint: RC_FINGERPRINT,
    rcTreeFingerprint: RC_TREE_FINGERPRINT,
    rcFinalAuditPass: true,
    contentCorrectionRequired: false,
    nextRequiredRc: "NONE",
    taxonomyApprovalPolicyResolved: true,
    approvedReleaseBuildTechnicallyReady: true,
    approvedReleaseAuthorized: false,
    recommendation: "REQUEST_FINAL_RELEASE_BUILD_AUTHORIZATION",
    approvedRevisionsToPlan: { lexemes: 87, senses: 100, classifications: 99 },
    taxonomyDecision: "CREATE_NEW_APPROVED_TAXONOMY_SNAPSHOT",
    taxonomyPolicyFingerprint: plan.taxonomyPolicyDecisionArtifact.policyFingerprint,
    officialReleaseHashCreated: false,
    canaryChanged: false,
    databaseConnection: "NONE",
    databaseWrites: "NONE",
    productionMutation: "NO",
    differences,
  };
  console.log(JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main();
}
