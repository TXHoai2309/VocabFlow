import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import canonicalize from "canonicalize";
import {
  assertPinnedInputs,
  buildApprovedReleasePlan,
  EXPECTED_BASE,
  EXPECTED_CANARY_FINGERPRINT,
  EXPECTED_CANARY_TREE,
  EXPECTED_CEFR,
  EXPECTED_LAST_CANARY_COMMIT,
  EXPECTED_MANIFEST_PLAN,
  EXPECTED_RC_FINGERPRINT,
  EXPECTED_RC_TREE,
  EXPECTED_TAXONOMY_POLICY,
  RELEASE_HASH_ALGORITHM,
  RELEASE_RELATIVE,
  TAXONOMY_20_PATH,
  TAXONOMY_201_PATH,
  main,
} from "./hybrid-100-approved-release";
import { canonicalHash } from "./hybrid-100-release-candidate";
import { validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
const root = process.cwd();
const releaseRoot = path.join(root, RELEASE_RELATIVE);
const frozenAtTestStart = existsSync(releaseRoot);
const originalTaxonomyBytes = readFileSync(path.join(root, TAXONOMY_20_PATH));
const outputSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
let readinessPlan: ReturnType<typeof buildApprovedReleasePlan> | undefined;
beforeAll(() => {
  if (!frozenAtTestStart) readinessPlan = buildApprovedReleasePlan(root);
}, 30_000);
afterAll(() => outputSpy.mockRestore());

function json(relative: string): JsonObject {
  return JSON.parse(readFileSync(path.join(root, relative), "utf8")) as JsonObject;
}

function readReleaseRecord(relative: string): JsonObject {
  return JSON.parse(readFileSync(path.join(releaseRoot, ...relative.split("/")), "utf8")) as JsonObject;
}

function taxonomySemantics(value: JsonObject): JsonObject {
  const result = structuredClone(value) as JsonObject;
  for (const field of ["taxonomyVersion", "status", "createdAt", "updatedAt"]) delete result[field];
  return result;
}

describe("Phase 2F.7 approved Hybrid-100 release", () => {
  it("pins the owner authorization inputs and rejects stale RC or policy fingerprints", () => {
    const valid = {
      head: EXPECTED_BASE,
      remoteHead: EXPECTED_BASE,
      rcFingerprint: EXPECTED_RC_FINGERPRINT,
      rcTreeFingerprint: EXPECTED_RC_TREE,
      taxonomyPolicyFingerprint: EXPECTED_TAXONOMY_POLICY,
      finalManifestPlanFingerprint: EXPECTED_MANIFEST_PLAN,
      authorizedCefrFingerprint: EXPECTED_CEFR,
      canaryTree: EXPECTED_CANARY_TREE,
      canaryCommittedFingerprint: EXPECTED_CANARY_FINGERPRINT,
      lastCanaryCommit: EXPECTED_LAST_CANARY_COMMIT,
    };
    expect(() => assertPinnedInputs(valid)).not.toThrow();
    expect(() => assertPinnedInputs({ ...valid, rcFingerprint: "stale" })).toThrow("RC_FINGERPRINT_MISMATCH");
    expect(() => assertPinnedInputs({ ...valid, taxonomyPolicyFingerprint: "stale" })).toThrow("TAXONOMY_POLICY_FINGERPRINT_MISMATCH");
    expect(() => assertPinnedInputs({ ...valid, finalManifestPlanFingerprint: "stale" })).toThrow("FINAL_MANIFEST_PLAN_FINGERPRINT_MISMATCH");
    expect(() => assertPinnedInputs({ ...valid, authorizedCefrFingerprint: "stale" })).toThrow("AUTHORIZED_CEFR_FINGERPRINT_MISMATCH");
    expect(() => assertPinnedInputs({ ...valid, canaryCommittedFingerprint: "stale" })).toThrow("CANARY_CONTENT_FINGERPRINT_MISMATCH");
  });

  it("preserves the old taxonomy byte-for-byte and approves only a semantic-identical 2.0.1 snapshot", () => {
    expect(readFileSync(path.join(root, TAXONOMY_20_PATH))).toEqual(originalTaxonomyBytes);
    const rcTaxonomy = readFileSync(path.join(root, "vocabflow-dataset/releases/hybrid-100-v2.2.0-rc.1/taxonomy/01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.0.json"));
    expect(originalTaxonomyBytes).toEqual(rcTaxonomy);
    if (frozenAtTestStart) {
      const approved = json(TAXONOMY_201_PATH);
      expect(approved.taxonomyId).toBe("01a0fc13-09e9-72dd-b49d-ffef077385dd");
      expect(approved.taxonomyVersion).toBe("2.0.1");
      expect(approved.status).toBe("APPROVED");
      expect(canonicalHash(taxonomySemantics(json(TAXONOMY_20_PATH)))).toBe(canonicalHash(taxonomySemantics(approved)));
    } else {
      const plan = readinessPlan!;
      expect(plan.taxonomySemanticDiff).toBe(0);
      expect(plan.taxonomy201.taxonomyId).toBe(plan.taxonomy20.taxonomyId);
      expect(plan.taxonomy201.taxonomyVersion).toBe("2.0.1");
      expect(plan.taxonomy201.status).toBe("APPROVED");
    }
  });

  it("plans exactly 87/100/99 approval-only next revisions with pinned hashes and no new IDs", () => {
    const revisionPlan = json("vocabflow-dataset/workspaces/hybrid-100-rc-final-review/approval-revision-plan.json");
    const rows = revisionPlan.rows as JsonObject[];
    expect(rows).toHaveLength(286);
    expect(rows.filter((row) => row.entityType === "LEXEME")).toHaveLength(87);
    expect(rows.filter((row) => row.entityType === "SENSE")).toHaveLength(100);
    expect(rows.filter((row) => row.entityType === "CLASSIFICATION")).toHaveLength(99);
    expect(revisionPlan.summary.newIdsAllocated).toBe(0);
    expect(revisionPlan.summary.learnerFacingContentChangesRequired).toBe(false);

    if (frozenAtTestStart) {
      const savedPlan = json("vocabflow-dataset/workspaces/hybrid-100-approved-release/materialization-plan.json");
      expect(savedPlan.counts).toMatchObject({ lexemes: 87, senses: 100, classifications: 99, total: 286, newEntityIds: 0, newProvenanceIds: 0 });
      for (const row of rows) {
        const saved = (savedPlan.revisions as JsonObject[]).find((candidate) => candidate.entityType === row.entityType && candidate.stableId === row.stableId);
        expect(saved).toBeDefined();
        if (!saved) throw new Error(`APPROVAL_PLAN_ROW_MISSING:${row.stableId}`);
        expect(saved.targetRevision).toBe(row.targetRevision);
        expect(saved.targetRecordPath).toBe(row.targetRecordPath);
        expect(saved.targetContentHash).toBe(row.targetContentHash);
        const record = readReleaseRecord(row.targetRecordPath);
        const idField = row.entityType === "LEXEME" ? "masterLexemeId" : row.entityType === "SENSE" ? "masterSenseId" : "classificationId";
        const revisionField = row.entityType === "LEXEME" ? "lexemeRevision" : row.entityType === "SENSE" ? "senseRevision" : "classificationRevision";
        expect(record[idField]).toBe(row.stableId);
        expect(record[revisionField]).toBe(row.targetRevision);
        expect(record.status).toBe("APPROVED");
        expect(canonicalHash(record)).toBe(row.targetContentHash);
        const predecessor = json(`vocabflow-dataset/${row.currentRecordPath}`);
        expect(canonicalHash(predecessor)).toBe(row.currentContentHash);
        expect(canonicalHash({ ...record, status: row.currentStatus, [revisionField]: row.currentRevision })).toBe(row.currentContentHash);
      }
    } else {
      const plan = readinessPlan!;
      expect(plan.revisions).toHaveLength(286);
      for (const row of rows) {
        const target = plan.revisions.find((candidate) => candidate.kind === row.entityType && candidate.record[row.entityType === "LEXEME" ? "masterLexemeId" : row.entityType === "SENSE" ? "masterSenseId" : "classificationId"] === row.stableId);
        expect(target).toBeDefined();
        expect(canonicalHash(target?.record)).toBe(row.targetContentHash);
        expect(target?.record.status).toBe("APPROVED");
        expect(target?.record[row.entityType === "LEXEME" ? "lexemeRevision" : row.entityType === "SENSE" ? "senseRevision" : "classificationRevision"]).toBe(row.currentRevision + 1);
        expect(target?.pin.contentHash).toBe(row.targetContentHash);
        expect(canonicalHash(target?.currentRecord)).toBe(row.currentContentHash);
      }
    }
  });

  it("keeps CEFR values unchanged for Light and Water and leaves Fuse unclassified", () => {
    if (frozenAtTestStart) {
      const manifest = json(`${RELEASE_RELATIVE}/dataset.json`);
      const classifications = (manifest.includedClassifications as JsonObject[]).map((pin) => readReleaseRecord(pin.recordPath));
      const light = classifications.find((record) => record.classificationId === "01a0fc13-09f1-76b9-8a57-6c6e55e9b438");
      const water = classifications.find((record) => record.classificationId === "01a0fc13-09f2-77bf-93db-1ceefb68082a");
      expect(light).toMatchObject({ classificationRevision: 3, valueCode: "A1", status: "APPROVED" });
      expect(water).toMatchObject({ classificationRevision: 2, valueCode: "A2", status: "APPROVED" });
      expect(classifications.some((record) => record.masterSenseId === "01a1070c-7c59-726e-88d6-cf9dc05adb73")).toBe(false);
      const counts = { PRE_A1: 0, A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0, UNCLASSIFIED: 100 - classifications.length };
      for (const record of classifications) if (Object.hasOwn(counts, record.valueCode)) counts[record.valueCode as keyof typeof counts] += 1;
      expect(counts).toEqual({ PRE_A1: 0, A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, C2: 0, UNCLASSIFIED: 1 });
    } else {
      const plan = readinessPlan!;
      expect(plan.revisions.find((item) => item.kind === "CLASSIFICATION" && item.record.classificationId === "01a0fc13-09f1-76b9-8a57-6c6e55e9b438")?.record).toMatchObject({ classificationRevision: 3, valueCode: "A1" });
      expect(plan.revisions.find((item) => item.kind === "CLASSIFICATION" && item.record.classificationId === "01a0fc13-09f2-77bf-93db-1ceefb68082a")?.record).toMatchObject({ classificationRevision: 2, valueCode: "A2" });
      expect(plan.revisions.some((item) => item.kind === "CLASSIFICATION" && item.record.masterSenseId === "01a1070c-7c59-726e-88d6-cf9dc05adb73")).toBe(false);
    }
  });

  it("validates a frozen 2.2.0 package, independently checks its hash and returns NOOP on rerun", () => {
    if (!frozenAtTestStart) {
      const before = readFileSync(path.join(root, TAXONOMY_20_PATH));
      const result = main(["--check"], root);
      expect(result.status).toBe("READY_TO_MATERIALIZE");
      expect(result.writesPerformed).toBe(false);
      expect(readFileSync(path.join(root, TAXONOMY_20_PATH))).toEqual(before);
      expect(existsSync(path.join(root, RELEASE_RELATIVE))).toBe(false);
      return;
    }

    const manifest = json(`${RELEASE_RELATIVE}/dataset.json`);
    expect(manifest).toMatchObject({ datasetVersion: "2.2.0", schemaVersion: "2.0.1", status: "APPROVED", releaseHashAlgorithm: RELEASE_HASH_ALGORITHM });
    const { releaseHash, ...withoutReleaseHash } = manifest;
    const canonicalManifest = canonicalize(withoutReleaseHash as never);
    expect(canonicalManifest).toBeDefined();
    expect(createHash("sha256").update(canonicalManifest!).digest("hex")).toBe(releaseHash);
    expect(manifest.includedLexemes).toHaveLength(87);
    expect(manifest.includedSenses).toHaveLength(100);
    expect(manifest.includedClassifications).toHaveLength(99);
    expect(manifest.includedProvenance).toHaveLength(799);
    expect(manifest.includedTaxonomySnapshots).toHaveLength(1);
    expect(manifest.includedMediaAssets).toHaveLength(0);
    expect(manifest.includedLearningSets).toHaveLength(0);
    expect(manifest.includedRelations).toHaveLength(0);
    const validation = validateMasterVocabularyV2({ datasetRoot: releaseRoot, schemaRoot: path.join(releaseRoot, "schemas"), writeReport: false, validatedAt: manifest.releasedAt });
    expect(validation).toMatchObject({ status: "PASS", errorCount: 0, warningCount: 0, infoCount: 0 });
    const firstTree = json(`${RELEASE_RELATIVE}/reports/release-approval-evidence.json`).releaseTreeFingerprint;
    const secondTree = json(`${RELEASE_RELATIVE}/reports/release-approval-evidence.json`).releaseTreeFingerprint;
    expect(firstTree).toBe(secondTree);
    const beforeHash = manifest.releaseHash;
    const rerun = main(["--check"], root);
    expect(rerun.status).toBe("APPROVED_RELEASE_ALREADY_MATERIALIZED");
    expect(rerun.requiredChanges).toBe(0);
    expect(json(`${RELEASE_RELATIVE}/dataset.json`).releaseHash).toBe(beforeHash);
  }, 30_000);
});
