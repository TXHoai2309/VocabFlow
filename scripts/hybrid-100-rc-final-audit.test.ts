import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { buildFinalAudit } from "./hybrid-100-rc-final-audit";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET_ROOT = path.join(REPO_ROOT, "vocabflow-dataset");
const RC_ROOT = path.join(DATASET_ROOT, "releases", "hybrid-100-v2.2.0-rc.1");

interface ApprovalPlanRow {
  entityType: string;
  action: string;
  stableId: string;
  currentRevision: number;
  targetRevision?: number;
  targetStatus?: string;
  semanticContentChange?: boolean;
  approvalOnlyTransition?: boolean;
  targetRecordPath?: string;
  currentLearnerPayloadHash?: string;
  targetLearnerPayloadHash?: string;
}

describe("Hybrid-100 RC final audit", () => {
  let plan: ReturnType<typeof buildFinalAudit>;

  beforeAll(() => {
    plan = buildFinalAudit(REPO_ROOT);
  }, 120_000);

  it("pins the immutable rc.1 package and its approved cohort fingerprints", () => {
    expect(plan.audit.rc).toMatchObject({
      version: "2.2.0-rc.1",
      status: "IN_REVIEW",
      fingerprint: "06b2a4dec2f54438416cae67788e0683fe94907cbce0a60fbb2d6469bc25b82c",
      treeFingerprint: "9d021e151d934a61c577289a4aff3ded8883858bac672e1c27ac546a335966a7",
      immutabilityValid: true,
      releaseHashPresent: false,
      counts: { lexemes: 87, senses: 100, classifications: 99, provenance: 799, taxonomySnapshots: 1, media: 0, learningSets: 0, relations: 0 },
    });
    expect(plan.audit.inputFingerprints.authorizedCefrFingerprint).toBe("d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622");
    expect(plan.audit.inputFingerprints.canonicalPromotionPlanFingerprint).toBe("969b5090a020b3f4793e6a77dcd78ce46fbb119036c45bfcf93bca81cc7a04db");
    expect(existsSync(RC_ROOT)).toBe(true);
  });

  it("confirms the exact 87-Lexeme / 100-Sense cohort and CEFR outcomes", () => {
    expect(plan.audit.cohort).toMatchObject({
      senseCohortExact: true,
      lexemeCohortExact: true,
      approvedOwnerSenseCount: 100,
      approvedOwnerLexemeCount: 87,
      candidateSenseCount: 100,
      candidateLexemeCount: 87,
      noExtraRootSense: true,
      ownerDecisionStatusCount: 100,
    });
    expect(plan.audit.cefr).toMatchObject({
      classifiedCount: 99,
      unclassifiedCount: 1,
      distribution: { PRE_A1: 0, A1: 17, A2: 28, B1: 20, B2: 27, C1: 7, C2: 0, UNCLASSIFIED: 1 },
      cefrValueDrift: 0,
      classificationIdDrift: 0,
      confidenceDrift: 0,
      reusedClassificationRecordDrift: 0,
      duplicatePrimaryCefrCount: 0,
      lightFinalDecisionPreserved: true,
      waterReusePreserved: true,
      fuseUnclassifiedPreserved: true,
    });
    expect(plan.audit.semanticContent.semanticContentDrift).toBe(0);
    expect(plan.audit.semanticContent.sourceHashMismatches).toBe(0);
    expect(plan.audit.semanticContent.allKnownEditorialSpotChecksMatch).toBe(true);
  });

  it("verifies provenance closure, rights boundary and absence of runtime artifacts", () => {
    expect(plan.audit.provenance).toMatchObject({
      candidateProvenanceCount: 799,
      danglingProvenance: 0,
      canonicalContentMismatches: 0,
      pinContentMismatches: 0,
      closureValid: true,
      additionalApprovalProvenanceRequiredByCurrentValidator: 0,
    });
    expect(plan.audit.provenance.sourceTypeCounts).toMatchObject({ OWNER_REVIEW: 197, PROJECT_AUTHORED: 602 });
    expect(plan.audit.sourceBoundary).toMatchObject({
      sourceRightsVerified: false,
      sourceTextReused: false,
      sourceMediaReused: false,
      sourceRightsAloneIsNotBlocker: true,
      sourceTypesLicensedOrPublicDomain: 0,
      mediaAssets: 0,
    });
    expect(plan.audit.validation.runtimeAudit).toMatchObject({ runtimeImportDirectoryAbsent: true, runtimeArtifacts: 0 });
    expect(plan.audit.validation.canaryChanged).toBe(false);
  });

  it("inventories every lifecycle state and plans only immutable next revisions", () => {
    const revisionPlan = plan.outputFiles.get("vocabflow-dataset/workspaces/hybrid-100-rc-final-review/approval-revision-plan.json");
    expect(revisionPlan).toBeDefined();
    const rows = plan.approvalRows as ApprovalPlanRow[];
    expect(rows).toHaveLength(286);
    expect({
      LEXEME: rows.filter((row) => row.entityType === "LEXEME").length,
      SENSE: rows.filter((row) => row.entityType === "SENSE").length,
      CLASSIFICATION: rows.filter((row) => row.entityType === "CLASSIFICATION").length,
    }).toEqual({ LEXEME: 87, SENSE: 100, CLASSIFICATION: 99 });

    for (const [kind, expected] of Object.entries({
      LEXEME: { APPROVED: 0, IN_REVIEW: 3, DRAFT: 84, other: 0 },
      SENSE: { APPROVED: 0, IN_REVIEW: 2, DRAFT: 98, other: 0 },
      CLASSIFICATION: { APPROVED: 0, IN_REVIEW: 1, DRAFT: 98, other: 0 },
    })) {
      const inventory = plan.inventories[kind];
      expect(inventory.counts).toEqual(expected);
      for (const [status, count] of Object.entries(expected)) {
        expect(inventory.recordsByStatus[status]).toHaveLength(count);
      }
    }

    for (const row of rows) {
      expect(["CREATE_APPROVED_NEXT_REVISION", "ALREADY_APPROVED_REUSE"]).toContain(row.action);
      if (row.action !== "CREATE_APPROVED_NEXT_REVISION") continue;
      expect(row.targetRevision).toBeTypeOf("number");
      const targetRevision = row.targetRevision!;
      expect(targetRevision).toBeGreaterThan(row.currentRevision);
      expect(row.targetStatus).toBe("APPROVED");
      expect(row.semanticContentChange).toBe(false);
      expect(row.approvalOnlyTransition).toBe(true);
      expect(row.targetRecordPath).toContain(`${row.stableId}-r${targetRevision}.json`);
      expect(existsSync(path.join(DATASET_ROOT, row.targetRecordPath!))).toBe(false);
      expect(row.currentLearnerPayloadHash).toBe(row.targetLearnerPayloadHash);
    }
    expect(plan.audit.lifecycle.stableIdsPreserved).toBe(true);
    expect(plan.audit.lifecycle.learnerFacingContentChangesRequired).toBe(false);
    expect(plan.audit.lifecycle.newIdsAllocated).toBe(0);
  });

  it("blocks release construction on the ambiguous DRAFT taxonomy and creates no release hash", () => {
    expect(plan.taxonomyPlan).toMatchObject({
      decision: "TAXONOMY_APPROVAL_POLICY_AMBIGUOUS",
      option: "C",
      currentTaxonomyVersion: "2.0.0",
      currentStatus: "DRAFT",
      currentRecordMustRemainImmutable: true,
      proposedApprovedTaxonomyVersion: null,
      semanticTaxonomyChangeRequired: false,
      finalReleaseBlockedPendingOwnerArchitectureDecision: true,
    });
    expect(plan.audit.finalReleasePlan).toMatchObject({
      datasetVersion: "2.2.0",
      releaseBuildTechnicallyReady: false,
      officialReleaseHashCreated: false,
      blocker: "TAXONOMY_APPROVAL_POLICY_AMBIGUOUS",
    });
    const releasePlan = JSON.parse(plan.outputFiles.get("vocabflow-dataset/workspaces/hybrid-100-rc-final-review/final-release-manifest-plan.json")!);
    expect(releasePlan.status).toBe("PLAN_ONLY_NOT_A_MANIFEST");
    expect(releasePlan.releaseHash).toBeNull();
    expect(releasePlan.officialReleaseHashCreated).toBe(false);
    expect(plan.audit.decision.approvedReleaseAuthorized).toBe(false);
    expect(plan.audit.decision.runtimeImportAuthorized).toBe(false);
    expect(plan.audit.decision.productionMutationAuthorized).toBe(false);
  });

  it("keeps the audit offline and leaves canonical and RC inputs unchanged", () => {
    expect(plan.audit.auditInputState).toMatchObject({
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
    });
    expect(plan.audit.validation.rcStatus).toBe("PASS");
    expect(plan.audit.validation.rcErrors).toBe(0);
    expect(plan.audit.validation.rcWarnings).toBe(0);
    expect(plan.audit.decision).toMatchObject({
      rcFinalAuditPass: true,
      contentCorrectionRequired: false,
      nextRequiredRc: "NONE",
      taxonomyApprovalPolicyResolved: false,
      approvedReleaseBuildTechnicallyReady: false,
      approvedReleaseAuthorized: false,
    });
  });
});
