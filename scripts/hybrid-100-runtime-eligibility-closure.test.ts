import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadPinnedMasterProjectionGraph } from "./transform-master-vocabulary-v2";
import { buildHybrid100RuntimeEligibilityClosure } from "./hybrid-100-runtime-eligibility-closure";

const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_ROOT = path.join(REPOSITORY_ROOT, "vocabflow-dataset", "releases", "hybrid-100-v2.2.0");
const TARGET_RELEASE_ROOT = path.join(REPOSITORY_ROOT, "vocabflow-dataset", "releases", "hybrid-100-v2.2.1");
const OUTPUT_ROOT = path.join(REPOSITORY_ROOT, "vocabflow-dataset", "workspaces", "hybrid-100-runtime-eligibility-closure");
const REPORT_PATH = path.join(REPOSITORY_ROOT, "vocabflow-dataset", "reports", "hybrid-100-runtime-eligibility-closure-2.2.1.md");
const EXPECTED_RELEASE_HASH = "c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d";
const EXPECTED_RELEASE_TREE = "35334eb7769c39029223d2d60311c6faab8c462efd0a340f262bed27543256ae";
const EXPECTED_SEMANTIC_FINGERPRINT = "a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Test assertions inspect schema-validated generated JSON artifacts.
type JsonObject = Record<string, any>;

const result = buildHybrid100RuntimeEligibilityClosure(REPOSITORY_ROOT);
const artifacts = result.artifacts;
const validation = artifacts["validation-summary.json"] as JsonObject;
const inventory = artifacts["nested-lifecycle-inventory.json"] as JsonObject;
const ownerTrace = artifacts["owner-review-trace.json"] as JsonObject;
const revisionPlan = artifacts["sense-revision-plan.json"] as JsonObject;
const patchPlan = artifacts["patch-release-2.2.1-plan.json"] as JsonObject;
const simulation = artifacts["runtime-projection-simulation.json"] as JsonObject;
const graph = loadPinnedMasterProjectionGraph(RELEASE_ROOT);

describe("Phase 2G.1A Hybrid-100 runtime eligibility closure", () => {
  it("pins the exact valid frozen 2.2.0 source and preserves its tree", () => {
    expect(validation.sourceRelease).toMatchObject({
      datasetVersion: "2.2.0",
      releaseHash: EXPECTED_RELEASE_HASH,
      releaseTreeFingerprint: EXPECTED_RELEASE_TREE,
      unchanged: true,
    });
    expect(validation.sourceReleaseValidation).toEqual({ status: "PASS", errors: 0, warnings: 0, info: 0 });
    expect(validation.immutability.releaseTreeBefore).toBe(EXPECTED_RELEASE_TREE);
    expect(validation.immutability.releaseTreeAfter).toBe(EXPECTED_RELEASE_TREE);
    expect(existsSync(TARGET_RELEASE_ROOT)).toBe(false);
  });

  it("reports deterministic exact lifecycle counts for the full 100-Sense cohort", () => {
    expect(inventory.cohortSenseCount).toBe(100);
    expect(inventory.statusInventory.parentSenses).toMatchObject({ total: 100, approved: 100, inReview: 0, draft: 0, other: 0 });
    for (const childType of ["translations", "definitions", "examples", "exampleTranslations"]) {
      expect(inventory.statusInventory[childType]).toMatchObject({
        total: 100,
        approved: 0,
        inReview: 2,
        draft: 98,
        other: 0,
        byStatus: { DRAFT: 98, IN_REVIEW: 2 },
      });
    }
    expect(inventory.statusInventory.sensePronunciations).toMatchObject({ total: 0, approved: 0, inReview: 0, draft: 0, other: 0 });
    expect(inventory.statusInventory.lexemePronunciations).toMatchObject({ total: 0, approved: 0, inReview: 0, draft: 0, other: 0 });
    expect(Object.keys(inventory.statusInventory.translations.byStatus)).toEqual(["DRAFT", "IN_REVIEW"]);
  });

  it("traces every proposed child to the owner-reviewed semantic package without drift", () => {
    expect(validation.semanticDraftFingerprint).toEqual({
      expected: EXPECTED_SEMANTIC_FINGERPRINT,
      computed: EXPECTED_SEMANTIC_FINGERPRINT,
      verified: true,
    });
    expect(ownerTrace.summary).toMatchObject({
      ownerReviewedCandidateDecisions: 100,
      directlyAuthoredSenses: 98,
      reviewedReuseSenses: 2,
      childRowsTraced: 400,
      childRowsPassed: 400,
      childRowsBlocked: 0,
      provenanceReferencesValidated: 400,
      uniqueChildIds: 400,
    });
    expect(ownerTrace.issues).toEqual([]);
    expect(ownerTrace.senses).toHaveLength(100);
    const childRows = ownerTrace.senses.flatMap((sense: JsonObject) => sense.childRows);
    expect(childRows).toHaveLength(400);
    for (const child of childRows) {
      expect(child.ownerReviewedSource.semanticDraftFingerprint).toBe(EXPECTED_SEMANTIC_FINGERPRINT);
      expect(child.equality).toMatchObject({
        stableChildId: true,
        owningSenseAndLexeme: true,
        language: true,
        learnerFacingContent: true,
        orderingAndPreferredSelection: true,
        provenanceReferences: true,
        noSemanticDrift: true,
      });
      expect(child.currentStatus === "DRAFT" || child.currentStatus === "IN_REVIEW").toBe(true);
      expect(child.plannedStatus).toBe("APPROVED");
    }
    expect(inventory.proposedChildLifecyclePromotions).toMatchObject({
      translation: 100,
      definition: 100,
      example: 100,
      exampleTranslation: 100,
      sensePronunciation: 0,
      lexemePronunciation: 0,
      totalLearnerFacingRows: 400,
      blockedRows: 0,
    });
  });

  it("preserves Sense and child identities and calculates the next monotonic revisions", () => {
    const plannedSenseIds = revisionPlan.revisions.map((row: JsonObject) => row.masterSenseId).sort();
    const sourceSenseIds = graph.senses.map((sense: JsonObject) => sense.masterSenseId).sort();
    expect(revisionPlan.exactSenseRevisionCount).toBe(100);
    expect(revisionPlan.stableSenseIdsPreserved).toBe(true);
    expect(new Set(plannedSenseIds).size).toBe(100);
    expect(plannedSenseIds).toEqual(sourceSenseIds);
    for (const row of revisionPlan.revisions) {
      expect(row.requiresNewSenseRevision).toBe(true);
      expect(row.plannedSenseRevision).toBe(row.currentSenseRevision + 1);
      expect(row.masterSenseId).toBeTruthy();
      expect(row.currentParentStatus).toBe("APPROVED");
      expect(row.plannedParentStatus).toBe("APPROVED");
      expect(row.learnerFacingDrift).toBe(0);
      expect(row.childStatusTransitions.every((transition: JsonObject) => transition.to === "APPROVED")).toBe(true);
    }
  });

  it("plans a PATCH 2.2.1 with the exact unchanged cohort and no CEFR/taxonomy/provenance drift", () => {
    expect(patchPlan.sourceRelease.datasetVersion).toBe("2.2.0");
    expect(patchPlan.targetReleasePlan).toMatchObject({ datasetVersion: "2.2.1", versionBump: "PATCH", created: false });
    expect(patchPlan.expectedCohort).toMatchObject({
      lexemes: 87,
      senses: 100,
      classifications: 99,
      provenance: 799,
      taxonomy: 1,
      media: 0,
      learningSets: 0,
      relations: 0,
    });
    expect(patchPlan.unchangedPinSets).toEqual({
      lexemePins: true,
      classificationPins: true,
      taxonomySnapshot: true,
      provenanceIds: true,
      mediaPins: true,
      learningSetPins: true,
      relationPins: true,
    });
    expect(graph.taxonomy.taxonomyVersion).toBe("2.0.1");
    expect(validation.classificationPinFingerprint).toBeTruthy();
    expect(validation.taxonomyFingerprint).toBeTruthy();
    expect(validation.provenanceIdsFingerprint).toBeTruthy();
  });

  it("simulates RELEASE 100/100 in memory and preserves authored runtime fields", () => {
    expect(simulation).toMatchObject({
      inMemoryOnly: true,
      plannedDatasetVersion: "2.2.1",
      projectedSenses: 100,
      skippedSenses: 0,
      importEligible: true,
      generatedArtifactWritten: false,
      runtimeFieldCounts: {
        vietnameseNonNull: 100,
        definitionEnNonNull: 100,
        exampleEnNonNull: 100,
        ipaNonNull: 0,
      },
    });
    expect(simulation.appImportContractVersion).toBe("app-import-v3");
    expect(simulation.projectionContractVersion).toBe("runtime-vocabulary-projection-v2");
    const invariantChecks = Object.values(simulation.invariantChecks as Record<string, JsonObject>);
    expect(invariantChecks.every((check) => check.unchanged === true)).toBe(true);
    expect(inventory.pronunciationPolicy).toMatchObject({ sensePronunciationRows: 0, lexemePronunciationRows: 0, approvalReady: 0 });
  });

  it("keeps all authorization and side-effect flags closed and emits the review artifacts", () => {
    expect(validation.authorization).toEqual({
      nestedChildApprovalAuthorized: false,
      senseRevisionMaterializationAuthorized: false,
      patchRelease221BuildAuthorized: false,
      databaseWriteAuthorized: false,
      runtimeImportAuthorized: false,
      productionMutationAuthorized: false,
    });
    expect(validation.sideEffects).toEqual({
      databaseConnection: "NONE",
      databaseWrites: "NONE",
      migrations: "NONE",
      importerApply: "NO",
      runtimeIdsAllocated: 0,
      bridgeMappingsCreated: 0,
      learnerRowsMutated: 0,
      productionConnection: "NONE",
      productionMutation: "NO",
    });
    expect(validation.immutability.canonicalMasterTreeBefore).toBe(validation.immutability.canonicalMasterTreeAfter);
    expect(validation.immutability.canonicalDatasetStateBefore).toBe(validation.immutability.canonicalDatasetStateAfter);
    expect(validation.immutability.canonicalRevisionsCreated).toBe(false);
    expect(existsSync(TARGET_RELEASE_ROOT)).toBe(false);
    for (const [name, value] of Object.entries(artifacts)) {
      const artifactPath = path.join(OUTPUT_ROOT, name);
      expect(existsSync(artifactPath)).toBe(true);
      expect(JSON.parse(readFileSync(artifactPath, "utf8"))).toEqual(value);
    }
    expect(existsSync(REPORT_PATH)).toBe(true);
    expect(readFileSync(REPORT_PATH, "utf8")).toContain("PHASE_2G1A_READY = YES");
  });
});
