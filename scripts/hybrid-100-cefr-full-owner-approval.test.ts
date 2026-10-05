import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { canonicalHash, sha256 } from "./hybrid-100-cefr-draft";
import { buildFullOwnerApprovalPlan, materialize, PARENT_OWNER_CLOSURE_FINGERPRINT } from "./hybrid-100-cefr-full-owner-approval";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-cefr-draft";
const OWNER_REPORT = "vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md";
const LIGHT_ID = "01a0fc13-09f1-76b9-8a57-6c6e55e9b438";
const LIGHT_SENSE = "01a0fc13-09ee-7768-9be6-d20fa32521ee";
const WATER_SENSE = "01a0fc13-09ef-75ac-b815-039ab337c01a";
const LIGHT_PREDECESSOR_HASH = "08482dae079eb7932bb7254e9a99277f104d58cf73be9f954b63641996c9763c";
const plan = buildFullOwnerApprovalPlan(REPO_ROOT, "check");
const plannedJson = <T,>(relativePath: string): T => {
  const contents = plan.files.get(`${WORKSPACE}/${relativePath}`);
  if (!contents) throw new Error(`Missing planned artifact: ${relativePath}`);
  return JSON.parse(contents) as T;
};
const approval = plannedJson<JsonObject>("full-owner-approval.json");
const decisions = plannedJson<{ rows: JsonObject[]; decisionCounts: JsonObject }>("cefr-decisions.json");
const readiness = plannedJson<JsonObject>("release-readiness.json");
const manifest = plannedJson<JsonObject>("manifest.json");
const registry = plannedJson<{ mappings: JsonObject[] }>("classification-registry.json");
const workspaceProvenance = [...plan.files.entries()]
  .filter(([file]) => file.startsWith(`${WORKSPACE}/provenance/`))
  .map(([, contents]) => JSON.parse(contents) as JsonObject);
const workspaceClassifications = [...plan.files.entries()]
  .filter(([file]) => file.startsWith(`${WORKSPACE}/classifications/`))
  .map(([, contents]) => JSON.parse(contents) as JsonObject);
const byCandidate = new Map(decisions.rows.map((row) => [row.candidateId, row]));
const semanticPayload = (row: JsonObject) => ({
  candidateId: row.candidateId,
  masterSenseId: row.masterSenseId,
  valueCode: row.editorialDecision.valueCode,
  confidence: row.editorialDecision.confidence,
  decisionType: row.editorialDecision.decisionType,
  classificationId: row.editorialDecision.classificationId,
  rationale: row.editorialDecision.rationale,
  agreementStatus: row.editorialDecision.agreementStatus,
});

describe("Phase 2F.4B full CEFR owner approval", () => {
  it("approves all 95 remaining rows without changing their CEFR decision payloads or IDs", () => {
    expect(approval.newlyApprovedDecisions).toHaveLength(95);
    for (const pin of approval.newlyApprovedDecisions as JsonObject[]) {
      const row = byCandidate.get(pin.candidateId)!;
      expect(row).toMatchObject({ reviewStatus: "OWNER_DECISION_ACCEPTED", ownerDecisionStatus: "ACCEPTED", ownerDecisionScope: "CEFR_FULL_COHORT_REVIEW", reviewedBy: "VocabFlow project owner" });
      expect(canonicalHash(semanticPayload(row))).toBe(pin.semanticPayloadHash);
      expect(row.masterSenseId).toBe(pin.masterSenseId);
      expect(row.editorialDecision.classificationId).toBe(pin.classificationId);
    }
    expect(approval.nonExceptionCefrValuesChanged).toBe(0);
    expect(approval.nonExceptionDecisionPayloadHashBefore).toBe(approval.nonExceptionDecisionPayloadHashAfter);
    expect(approval.classificationIdsChanged).toBe(0);
    expect(approval.classificationIdentityMapHashBefore).toBe(approval.classificationIdentityMapHashAfter);
  });

  it("keeps the five Phase 2F.4A outcomes, including fuse, intact", () => {
    const closure = JSON.parse(readFileSync(path.join(REPO_ROOT, WORKSPACE, "owner-review-closure.json"), "utf8")) as JsonObject;
    expect(closure.cefrOwnerClosureFingerprint).toBe(PARENT_OWNER_CLOSURE_FINGERPRINT);
    const byLemma = (lemma: string) => decisions.rows.find((row) => row.lemma === lemma)!;
    const lightException = decisions.rows.find((row) => row.masterSenseId === LIGHT_SENSE)!;
    expect(lightException.editorialDecision).toMatchObject({ valueCode: "A1", decisionType: "REVISE_EXISTING_CLASSIFICATION", classificationId: LIGHT_ID, classificationRevision: 2 });
    expect(byLemma("freshman").editorialDecision).toMatchObject({ valueCode: "B2", decisionType: "NEW_EDITORIAL_CLASSIFICATION" });
    expect(byLemma("roster").editorialDecision).toMatchObject({ valueCode: "B2", decisionType: "NEW_EDITORIAL_CLASSIFICATION" });
    expect(byLemma("liable").editorialDecision).toMatchObject({ valueCode: "C1", decisionType: "NEW_EDITORIAL_CLASSIFICATION" });
    expect(byLemma("fuse").editorialDecision).toMatchObject({ valueCode: null, classificationId: null, decisionType: "UNCLASSIFIED_INSUFFICIENT_EVIDENCE" });
    expect(byLemma("fuse").reviewStatus).toBe("ACCEPTED_UNCLASSIFIED");
  });

  it("has exactly 100 approved decisions, 99 values, no pending review, and the unchanged distribution", () => {
    expect(approval).toMatchObject({ approvedCandidateCount: 100, approvedClassifiedDecisionCount: 99, approvedUnclassifiedDecisionCount: 1, priorExceptionApprovalCount: 5, newlyApprovedPendingRows: 95 });
    expect(decisions.rows).toHaveLength(100);
    expect(decisions.rows.filter((row) => row.editorialDecision.valueCode !== null)).toHaveLength(99);
    expect(decisions.rows.filter((row) => row.reviewStatus === "PENDING_OWNER_REVIEW" || row.ownerDecisionStatus === "PENDING_OWNER_REVIEW")).toHaveLength(0);
    expect(decisions.rows.filter((row) => row.reviewStatus === "OWNER_DECISION_ACCEPTED")).toHaveLength(99);
    expect(decisions.rows.filter((row) => row.reviewStatus === "ACCEPTED_UNCLASSIFIED")).toHaveLength(1);
    expect(decisions.decisionCounts).toEqual({ NEW_EDITORIAL_CLASSIFICATION: 97, REUSE_EXISTING_CLASSIFICATION: 1, REVISE_EXISTING_CLASSIFICATION: 1, UNCLASSIFIED_INSUFFICIENT_EVIDENCE: 1 });
    expect(plannedJson<JsonObject>("manifest.json").proposedCefrDistribution).toEqual({ PRE_A1: 0, A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, C2: 0, UNCLASSIFIED: 1 });
  });

  it("adds exactly 95 unique owner-review IDs and achieves 99/99 classified decision coverage", () => {
    const addedIds = approval.newOwnerReviewProvenanceIds as string[];
    expect(addedIds).toHaveLength(95);
    expect(new Set(addedIds).size).toBe(95);
    const ownerReviews = workspaceProvenance.filter((record) => record.sourceType === "OWNER_REVIEW" && record.subjectType === "CLASSIFICATION");
    expect(ownerReviews).toHaveLength(99);
    expect(new Set(ownerReviews.map((record) => record.subjectId)).size).toBe(99);
    expect(approval.ownerReviewDecisionCoverage).toBe("99/99");
    for (const id of addedIds) {
      expect(ownerReviews.filter((record) => record.provenanceId === id)).toHaveLength(1);
    }
  });

  it("does not attach provenance to fuse and records water reuse in the workspace registry", () => {
    const fuse = decisions.rows.find((row) => row.lemma === "fuse")!;
    expect(workspaceClassifications.some((record) => record.masterSenseId === fuse.masterSenseId)).toBe(false);
    expect(workspaceProvenance.some((record) => record.subjectId === fuse.editorialDecision.classificationId)).toBe(false);
    const water = decisions.rows.find((row) => row.masterSenseId === WATER_SENSE)!;
    const waterOwnerId = approval.ownerReviewProvenanceIdsByClassifiedSense[WATER_SENSE];
    const record = workspaceProvenance.find((item) => item.provenanceId === waterOwnerId)!;
    const mapping = registry.mappings.find((item) => item.masterSenseId === WATER_SENSE)!;
    expect(water.editorialDecision.decisionType).toBe("REUSE_EXISTING_CLASSIFICATION");
    expect(record).toMatchObject({ sourceType: "OWNER_REVIEW", subjectType: "CLASSIFICATION", subjectId: water.editorialDecision.classificationId });
    expect(mapping.provenanceIds).toContain(waterOwnerId);
    expect(workspaceClassifications.some((item) => item.masterSenseId === WATER_SENSE)).toBe(false);
  });

  it("preserves the light predecessor, fixes report hash rendering, and keeps revision 2 as a plan", () => {
    const dataset = JSON.parse(readFileSync(path.join(REPO_ROOT, "vocabflow-dataset", "dataset.json"), "utf8")) as JsonObject;
    const pin = dataset.includedClassifications.find((item: JsonObject) => item.classificationId === LIGHT_ID);
    const predecessorPath = path.join(REPO_ROOT, "vocabflow-dataset", pin.recordPath);
    const predecessor = JSON.parse(readFileSync(predecessorPath, "utf8")) as JsonObject;
    expect(canonicalHash(predecessor)).toBe(LIGHT_PREDECESSOR_HASH);
    expect(predecessor).toMatchObject({ classificationId: LIGHT_ID, classificationRevision: 1, valueCode: "A2", status: "IN_REVIEW" });
    const revision2 = workspaceClassifications.find((record) => record.masterSenseId === LIGHT_SENSE)!;
    expect(revision2).toMatchObject({ classificationId: LIGHT_ID, classificationRevision: 2, valueCode: "A1", status: "DRAFT" });
    const report = plan.files.get(OWNER_REPORT)!;
    expect(report).toContain(`SHA-256 ${pin.contentHash}`);
    expect(report).not.toContain("SHA-256 undefined");
  });

  it("marks classification promotion ready while approved release remains NO", () => {
    expect(readiness.canonicalClassificationPromotionReady).toBe(true);
    expect(readiness.gates.CANONICAL_CLASSIFICATION_PROMOTION.status).toBe("READY");
    expect(readiness.readiness).toEqual({ HYBRID_100_CONTENT_COHORT_READY: "YES", HYBRID_100_APPROVED_RELEASE_READY: "NO" });
    expect(readiness.canonicalPromotionAuthorized).toBe(false);
    expect(manifest).toMatchObject({ canonicalClassificationPromotionReady: true, canonicalClassificationPromotionAuthorized: false, canonicalClassificationMutation: "NONE", releaseCreated: false, CEFR_FULL_OWNER_APPROVAL: "YES" });
  });

  it("retains stable IDs and provenance coverage on rerun with no ID allocations", () => {
    expect(plan.summary.fullOwnerApprovedCefrFingerprint).toBe(approval.fullOwnerApprovedCefrFingerprint);
    expect(plan.summary.repeatFingerprintIdentical).toBe(true);
    expect(plan.summary.newClassificationUuidsAllocatedOnThisRun).toBe(0);
    expect(plan.summary.newOwnerReviewProvenanceIdsAllocatedOnThisRun).toBe(0);
    expect(manifest.provenanceUuidAllocationsOnRerun).toBe(0);
    expect(manifest.newOwnerReviewProvenanceCount).toBe(95);
  });

  it("keeps source-rights claims and canonical writes out of scope", () => {
    expect(approval.rightsBoundary).toEqual({ sourceRightsVerified: false, mediaReuseEligible: false, sourceTextReused: false, sourceClaimedAsOfficial: false });
    expect(plan.summary).toMatchObject({ canonicalClassificationMutation: "NONE", rootManifestMutation: "NONE", releaseCreated: false, runtimeImportStarted: false, databaseWrites: "NONE", productionMutation: false, sourceRightsVerified: false, sourceClaimedAsOfficial: false });
    const datasetPath = path.join(REPO_ROOT, "vocabflow-dataset", "dataset.json");
    const masterClassifications = path.join(REPO_ROOT, "vocabflow-dataset", "master", "classifications");
    const releases = path.join(REPO_ROOT, "vocabflow-dataset", "releases");
    const canaryDataset = path.join(releases, "canary-v2.1.0", "dataset.json");
    const water = decisions.rows.find((row) => row.masterSenseId === WATER_SENSE)!;
    const waterPin = JSON.parse(readFileSync(datasetPath, "utf8")).includedClassifications.find((item: JsonObject) => item.classificationId === water.editorialDecision.classificationId);
    const waterPath = path.join(REPO_ROOT, "vocabflow-dataset", waterPin.recordPath);
    const hashesBefore = [datasetPath, path.join(masterClassifications, `${LIGHT_ID}-r1.json`), waterPath, canaryDataset]
      .map((file) => sha256(readFileSync(file)));
    materialize(plan, "check");
    const hashesAfter = [datasetPath, path.join(masterClassifications, `${LIGHT_ID}-r1.json`), waterPath, canaryDataset]
      .map((file) => sha256(readFileSync(file)));
    expect(hashesAfter).toEqual(hashesBefore);
  });
});
