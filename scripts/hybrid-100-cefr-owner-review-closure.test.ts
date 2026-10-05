import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { version as uuidVersion } from "uuid";
import { canonicalHash, sha256 } from "./hybrid-100-cefr-draft";
import { buildClosurePlan, materialize, PREVIOUS_CEFR_DRAFT_FINGERPRINT } from "./hybrid-100-cefr-owner-review-closure";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonObject = Record<string, any>;
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORKSPACE = "vocabflow-dataset/workspaces/hybrid-100-cefr-draft";
const LIGHT_CLASSIFICATION_ID = "01a0fc13-09f1-76b9-8a57-6c6e55e9b438";
const LIGHT_SENSE_ID = "01a0fc13-09ee-7768-9be6-d20fa32521ee";
const LIGHT_PREDECESSOR_HASH = "08482dae079eb7932bb7254e9a99277f104d58cf73be9f954b63641996c9763c";
const fullOwnerApprovalExists = existsSync(path.join(REPO_ROOT, WORKSPACE, "full-owner-approval.json"));
const plan = fullOwnerApprovalExists ? null : buildClosurePlan(REPO_ROOT, "check");
const plannedJson = <T,>(relativePath: string): T => {
  const contents = plan?.files.get(`${WORKSPACE}/${relativePath}`);
  if (contents) return JSON.parse(contents) as T;
  return JSON.parse(readFileSync(path.join(REPO_ROOT, WORKSPACE, relativePath), "utf8")) as T;
};
const decisions = plannedJson<{ rows: JsonObject[]; decisionCounts: Record<string, number>; proposedDistribution: Record<string, number> }>("cefr-decisions.json");
const closure = plannedJson<JsonObject>("owner-review-closure.json");
const manifest = plannedJson<JsonObject>("manifest.json");
const registry = plannedJson<{ mappings: JsonObject[] }>("classification-registry.json");
const workspaceClassifications = plan
  ? [...plan.files.entries()].filter(([relativePath]) => relativePath.startsWith(`${WORKSPACE}/classifications/`)).map(([, contents]) => JSON.parse(contents) as JsonObject)
  : readdirSync(path.join(REPO_ROOT, WORKSPACE, "classifications")).map((name) => JSON.parse(readFileSync(path.join(REPO_ROOT, WORKSPACE, "classifications", name), "utf8")) as JsonObject);
const workspaceProvenance = plan
  ? [...plan.files.entries()].filter(([relativePath]) => relativePath.startsWith(`${WORKSPACE}/provenance/`)).map(([, contents]) => JSON.parse(contents) as JsonObject)
  : readdirSync(path.join(REPO_ROOT, WORKSPACE, "provenance")).map((name) => JSON.parse(readFileSync(path.join(REPO_ROOT, WORKSPACE, "provenance", name), "utf8")) as JsonObject);
const byLemma = (lemma: string) => decisions.rows.find((row) => row.lemma === lemma)!;
const classForSense = (masterSenseId: string) => workspaceClassifications.find((record) => record.masterSenseId === masterSenseId);

describe.skipIf(fullOwnerApprovalExists)("Phase 2F.4A CEFR owner exception closure", () => {
  it("plans light revision 2 under the existing Classification ID", () => {
    const revision2 = classForSense(LIGHT_SENSE_ID)!;
    expect(revision2).toMatchObject({
      classificationId: LIGHT_CLASSIFICATION_ID,
      classificationRevision: 2,
      masterSenseId: LIGHT_SENSE_ID,
      dimension: "CEFR",
      frameworkCode: "CEFR",
      frameworkVersion: "EDITORIAL-PILOT-1",
      valueCode: "A1",
      isPrimary: true,
      status: "DRAFT",
    });
    expect(revision2).not.toHaveProperty("supersedesRevision");
    expect(closure.revisionPlans[0]).toMatchObject({
      classificationId: LIGHT_CLASSIFICATION_ID,
      predecessorRevision: 1,
      predecessorValueCode: "A2",
      predecessorStatus: "IN_REVIEW",
      predecessorContentHash: LIGHT_PREDECESSOR_HASH,
      plannedRevision: 2,
      plannedValueCode: "A1",
      supersedesRevision: 1,
      governanceMetadataOnly: true,
    });
  });

  it("keeps canonical light revision 1 unchanged and adds only one workspace light revision", () => {
    const predecessorPath = path.join(REPO_ROOT, "vocabflow-dataset", "master", "classifications", `${LIGHT_CLASSIFICATION_ID}-r1.json`);
    const predecessor = JSON.parse(readFileSync(predecessorPath, "utf8")) as JsonObject;
    expect(canonicalHash(predecessor)).toBe(LIGHT_PREDECESSOR_HASH);
    expect(predecessor).toMatchObject({ classificationId: LIGHT_CLASSIFICATION_ID, classificationRevision: 1, valueCode: "A2", status: "IN_REVIEW" });
    expect(workspaceClassifications.filter((record) => record.masterSenseId === LIGHT_SENSE_ID)).toHaveLength(1);
    expect(workspaceClassifications.filter((record) => record.classificationId === LIGHT_CLASSIFICATION_ID)).toHaveLength(1);
  });

  it("resolves freshman, roster, and liable to their owner-selected values", () => {
    expect(byLemma("freshman")).toMatchObject({ ownerDecisionStatus: "ACCEPTED", ownerDecisionScope: "CEFR_EXCEPTION_REVIEW", editorialDecision: { valueCode: "B2", decisionType: "NEW_EDITORIAL_CLASSIFICATION" } });
    expect(byLemma("roster")).toMatchObject({ ownerDecisionStatus: "ACCEPTED", ownerDecisionScope: "CEFR_EXCEPTION_REVIEW", editorialDecision: { valueCode: "B2", decisionType: "NEW_EDITORIAL_CLASSIFICATION" } });
    expect(byLemma("liable")).toMatchObject({ ownerDecisionStatus: "ACCEPTED", ownerDecisionScope: "CEFR_EXCEPTION_REVIEW", editorialDecision: { valueCode: "C1", decisionType: "NEW_EDITORIAL_CLASSIFICATION" } });
    for (const lemma of ["freshman", "roster", "liable"]) {
      const row = byLemma(lemma);
      const record = workspaceClassifications.find((item) => item.classificationId === row.editorialDecision.classificationId)!;
      expect(record).toMatchObject({ classificationId: row.editorialDecision.classificationId, masterSenseId: row.masterSenseId, valueCode: row.editorialDecision.valueCode, status: "DRAFT" });
      expect(uuidVersion(record.classificationId)).toBe(7);
    }
  });

  it("keeps fuse intentionally unclassified without a Classification or fake provenance", () => {
    const row = byLemma("fuse");
    expect(row).toMatchObject({ ownerDecisionStatus: "ACCEPTED_UNCLASSIFIED", ownerDecisionScope: "CEFR_EXCEPTION_REVIEW", editorialDecision: { valueCode: null, classificationId: null, decisionType: "UNCLASSIFIED_INSUFFICIENT_EVIDENCE" } });
    expect(workspaceClassifications.some((record) => record.masterSenseId === row.masterSenseId)).toBe(false);
    expect(workspaceProvenance.some((record) => record.subjectId === row.masterSenseId)).toBe(false);
  });

  it("reports the requested final decision counts, distribution, and closed owner queue", () => {
    expect(decisions.decisionCounts).toEqual({
      NEW_EDITORIAL_CLASSIFICATION: 97,
      REUSE_EXISTING_CLASSIFICATION: 1,
      REVISE_EXISTING_CLASSIFICATION: 1,
      UNCLASSIFIED_INSUFFICIENT_EVIDENCE: 1,
    });
    expect(decisions.decisionCounts.OWNER_REVIEW_REQUIRED ?? 0).toBe(0);
    expect(decisions.proposedDistribution).toEqual({ PRE_A1: 0, A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, C2: 0, UNCLASSIFIED: 1 });
    expect(closure).toMatchObject({ reviewScope: "CEFR_EXCEPTION_QUEUE", ownerExceptionQueue: "CLOSED", ownerApprovedExceptionCount: 5, classifiedOwnerDecisions: 4, acceptedUnclassified: 1 });
  });

  it("records OWNER_REVIEW provenance for each classified exception", () => {
    for (const lemma of ["light", "freshman", "roster", "liable"]) {
      const provenanceId = closure.ids[lemma].ownerReviewProvenanceId;
      const record = workspaceProvenance.find((item) => item.provenanceId === provenanceId)!;
      expect(record).toMatchObject({ sourceType: "OWNER_REVIEW", sourceName: "VocabFlow Hybrid 100-Sense CEFR Owner Review", subjectType: "CLASSIFICATION", authoredBy: "VocabFlow project owner" });
      expect(uuidVersion(provenanceId)).toBe(7);
    }
    expect(workspaceProvenance.filter((record) => record.sourceType === "OWNER_REVIEW")).toHaveLength(4);
  });

  it("allocates no additional IDs on rerun and preserves registry IDs", () => {
    const summary = plan!.summary;
    expect(summary.parentCefrDraftFingerprint).toBe(PREVIOUS_CEFR_DRAFT_FINGERPRINT);
    expect(summary.repeatFingerprintIdentical).toBe(true);
    expect(summary.newClassificationUuidsAllocatedOnThisRun).toBe(0);
    expect(summary.newProvenanceUuidsAllocatedOnThisRun).toBe(0);
    expect(summary.newClassificationRecordCount).toBe(0);
    expect(summary.cefrDraftFingerprint).toBe(closure.cefrOwnerClosureFingerprint);
    expect(manifest).toMatchObject({ newClassificationCount: 97, newProvenanceCount: 102, workspaceClassificationRecordCount: 98, workspaceProvenanceRecordCount: 102, closureAddedProvenanceCount: 8 });
    for (const lemma of ["light", "freshman", "roster", "liable"]) {
      const exception = closure.decisions.find((item: JsonObject) => item.lemma === lemma)!;
      const mapping = registry.mappings.find((item) => item.masterSenseId === exception.masterSenseId)!;
      expect(mapping.classificationId).toBe(closure.ids[lemma].classificationId);
    }
  });

  it("keeps source-rights and CEFR authority claims explicitly unverified", () => {
    expect(closure).toMatchObject({
      CEFR_EXCEPTION_OWNER_APPROVAL: "YES",
      OWNER_APPROVED_ALL_FUTURE_RELEASE_ACTIONS: false,
      canonicalClassificationPromotionAuthorized: false,
      releaseApprovalAuthorized: false,
      databaseRuntimeOrProductionAuthorized: false,
      rightsBoundary: { sourceRightsVerified: false, sourceClaimedAsOfficial: false, rawSourceTextReused: false, externalSourceProvenanceCreated: false },
    });
    expect(plan!.summary.releaseCreated).toBe(false);
    expect(plan!.summary.canonicalClassificationMutation).toBe("NONE");
    expect(plan!.summary.canonicalSemanticMutation).toBe("NONE");
    expect(plan!.summary.databaseWrites).toBe("NONE");
  });

  it("limits planned writes to the CEFR workspace and review reports", () => {
    expect([...plan!.files.keys()].every((item) => item.startsWith(`${WORKSPACE}/`) || item === "vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md" || item === "vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md")).toBe(true);
    const datasetPath = path.join(REPO_ROOT, "vocabflow-dataset", "dataset.json");
    const lightPath = path.join(REPO_ROOT, "vocabflow-dataset", "master", "classifications", `${LIGHT_CLASSIFICATION_ID}-r1.json`);
    const datasetBefore = sha256(readFileSync(datasetPath));
    const lightBefore = sha256(readFileSync(lightPath));
    materialize(plan!, "check");
    expect(sha256(readFileSync(datasetPath))).toBe(datasetBefore);
    expect(sha256(readFileSync(lightPath))).toBe(lightBefore);
  });
});
