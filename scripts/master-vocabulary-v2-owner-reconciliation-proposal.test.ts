import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildMasterVocabularyImportPlan, type ImportArtifacts, type Reconciliation } from "./master-vocabulary-v2-import-planner";
import {
  buildOwnerReconciliationProposal,
  proposalHasOnlyUnresolvedOwnerDecisions,
  renderOwnerReconciliationReview,
  type AppleIdentityAudit,
} from "./master-vocabulary-v2-owner-reconciliation-proposal";

const ids = {
  apple: "01a0fc13-09ed-70b4-801b-408be3b771e9",
  bankFinancial: "01a0fc13-09ee-7211-8e5a-784c689a0c7a",
  bankRiver: "01a0fc13-09ee-7584-a480-e313e359f744",
  recordNoun: "01a0fc13-09ee-71ff-9a0a-a96e48ef7dac",
  recordVerb: "01a0fc13-09ee-7823-95fc-5d1d76f13fa5",
  lookAfter: "01a0fc13-09ee-79c7-85ff-cbe0fc14a249",
  algorithm: "01a0fc13-09ef-710c-8e76-753a5cfea69c",
  reservation: "01a0fc13-09ef-7d37-a50f-d05db6b1a89c",
  technologyStarter: "01a0fc13-09f2-7709-a32d-5bef5b1f7a51",
} as const;

function runtimeCandidate(id: number, extra: Record<string, unknown> = {}) {
  return {
    appVocabularyId: id,
    word: "apple",
    ipa: "ˈæpəl",
    effectiveVietnamese: "quả táo",
    vietnameseOverrideStatus: "NONE",
    imageQuarantineStatus: "FALSE",
    definition: "A fruit.",
    example: "Example.",
    imageUrl: "https://res.cloudinary.com/example/image.png",
    audioUrl: "https://res.cloudinary.com/example/audio.mp3",
    topic: "Food",
    level: null,
    enabled: true,
    contentVersion: 1,
    sourceDataset: null,
    sourceRecordId: null,
    learnerProgressCount: 1,
    reviewEventCount: 1,
    projectionEqualsMaster: false,
    projectionDifferences: [
      { field: "imageUrl", master: null, runtime: "https://res.cloudinary.com/example/image.png" },
      { field: "audioUrl", master: null, runtime: "https://res.cloudinary.com/example/audio.mp3" },
      { field: "topic", master: null, runtime: "Food" },
    ],
    ...extra,
  };
}

function sense(masterSenseId: string, lemma: string, candidates: Record<string, unknown>[]) {
  return { masterSenseId, lemma, masterProjection: { word: lemma, vietnamese: "meaning", imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true }, runtimeCandidates: candidates };
}

const audit: AppleIdentityAudit = {
  vocabularyIds: [1, 295],
  learningSetMemberships: [{ vocabularyId: 1, learningSetId: 6, slug: "food-set", name: "Food", enabled: true, sortOrder: 2 }],
  normalizedTopicMemberships: [{ vocabularyId: 1, topicId: 4, slug: "food", name: "Food", enabled: true }],
  progressStateCounts: [
    { vocabularyId: 1, status: "LEARNING", count: 1 },
    { vocabularyId: 295, status: "MASTERED", count: 1 },
  ],
  reviewSummary: [
    { vocabularyId: 1, count: 2, earliest: "2026-01-01 00:00:00+00", latest: "2026-02-01 00:00:00+00" },
    { vocabularyId: 295, count: 1, earliest: "2026-02-01 00:00:00+00", latest: "2026-02-01 00:00:00+00" },
  ],
  overlappingLearnerCount: 1,
  learningSetAssignmentCounts: [{ learningSetId: 6, assignmentCount: 7, activeAssignmentCount: 5 }],
  technologyStarterExactCollisions: [],
  runtimeLearningSetCount: 16,
};

const candidateArtifact = {
  owner: "analysis-only",
  analysisOnly: true,
  sourceReleaseHash: "fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591",
  snapshotFingerprint: "a".repeat(64),
  target: { environment: "development", projectId: "shy-hill-72364426", branchId: "br-square-grass-b3af0nte", databaseName: "neondb" },
  migrationState: {
    current: true,
    appliedCount: 18,
    localMigrationCount: 18,
    historicalHashMismatches: Array.from({ length: 6 }, (_, index) => ({ tag: `old_${index}` })),
    requiredMigrations: [{ applied: true }, { applied: true }, { applied: true }],
  },
  senses: [
    sense(ids.apple, "apple", [runtimeCandidate(1), runtimeCandidate(295, { level: "GRADE_1", sourceDataset: "2000_COMMON_ENGLISH_VOCABULARY_V1", sourceRecordId: 265 })]),
    sense(ids.bankFinancial, "bank", [runtimeCandidate(871, { word: "bank", effectiveVietnamese: "Ngân hàng", learnerProgressCount: 0, reviewEventCount: 0, imageUrl: "https://res.cloudinary.com/example/bank.png", audioUrl: "https://res.cloudinary.com/example/bank.mp3", topic: "casual", enabled: false })]),
    sense(ids.bankRiver, "bank", [runtimeCandidate(871, { word: "bank", effectiveVietnamese: "Ngân hàng" })]),
    sense(ids.recordNoun, "record", [runtimeCandidate(849, { word: "record", effectiveVietnamese: "Đĩa", definition: "Physical vinyl disc", learnerProgressCount: 0, reviewEventCount: 0 })]),
    sense(ids.recordVerb, "record", [runtimeCandidate(849, { word: "record", effectiveVietnamese: "Đĩa", learnerProgressCount: 0, reviewEventCount: 0 })]),
    sense(ids.lookAfter, "look after", []),
    sense(ids.algorithm, "algorithm", []),
    sense(ids.reservation, "reservation", [runtimeCandidate(284, { word: "reservation", effectiveVietnamese: "Đặt chỗ", learnerProgressCount: 0, reviewEventCount: 0, enabled: false, topic: "CommonPlace" })]),
  ],
  learningSets: [{ masterLearningSetId: ids.technologyStarter, runtimeCandidates: [] }],
};

describe("analysis-only owner reconciliation proposal", () => {
  it("keeps owner decisions unresolved and describes duplicate history without learner identifiers", () => {
    const proposal = buildOwnerReconciliationProposal({ candidateArtifact, appleIdentityAudit: audit, scannedAt: "2026-10-03T00:00:00.000Z" });
    expect(proposalHasOnlyUnresolvedOwnerDecisions(proposal)).toBe(true);
    expect(proposal.senses.map((entry) => entry.ownerDecision)).toEqual(Array(8).fill("UNRESOLVED"));
    expect(proposal.learningSets[0]?.ownerDecision).toBe("UNRESOLVED");
    expect(proposal.acceptedByImporter).toBe(false);
    const apple = proposal.senses[0]!;
    expect(apple.proposedDecision).toBe("OWNER_CHOICE_REQUIRED");
    expect(apple.duplicateLearnerHistory).toBe(true);
    expect(apple.overlappingLearnerCount).toBe(1);
    expect(apple.ownerOptions).toMatchObject([
      { option: "A", appVocabularyId: 1, progressRowsPreservedOnChosenId: 1, progressRowsRemainingOnOtherId: 1 },
      { option: "B", appVocabularyId: 295, progressRowsPreservedOnChosenId: 1, progressRowsRemainingOnOtherId: 1 },
      { option: "C", decision: "CREATE_NEW", initialContentVersion: 1 },
    ]);
    const serialized = JSON.stringify(proposal);
    expect(serialized).not.toMatch(/learner_?id|overlappingLearnerIds/i);
    expect(serialized).not.toContain("https://res.cloudinary.com");
    expect(renderOwnerReconciliationReview(proposal)).toContain("DUPLICATE_LEARNER_HISTORY");
  });

  it("proposes the requested map/create actions and highlights projection-owned media fields", () => {
    const proposal = buildOwnerReconciliationProposal({ candidateArtifact, appleIdentityAudit: audit, scannedAt: "2026-10-03T00:00:00.000Z" });
    expect(proposal.senses.map((entry) => [entry.lemma, entry.proposedDecision, entry.proposedAppVocabularyId, entry.proposedFirstAdoptionPolicy])).toEqual([
      ["apple", "OWNER_CHOICE_REQUIRED", null, null],
      ["bank", "MAP_EXISTING", 871, "UPDATE_TO_MASTER"],
      ["bank", "CREATE_NEW", null, null],
      ["record", "CREATE_NEW", null, null],
      ["record", "CREATE_NEW", null, null],
      ["look after", "CREATE_NEW", null, null],
      ["algorithm", "CREATE_NEW", null, null],
      ["reservation", "MAP_EXISTING", 284, "UPDATE_TO_MASTER"],
    ]);
    expect(proposal.learningSets[0]).toMatchObject({ proposedDecision: "CREATE_NEW", exactSlugOrNameCollisionCount: 0 });
    expect(proposal.senses[1]?.firstAdoptionProjectionImpact).toMatchObject({ projectionDiffers: true, currentContentVersion: 1, expectedNextContentVersion: 2 });
    expect(proposal.senses[7]?.firstAdoptionProjectionImpact).toMatchObject({ projectionDiffers: true, currentContentVersion: 1, expectedNextContentVersion: 2 });
    const report = renderOwnerReconciliationReview(proposal);
    expect(report).toContain("Cloudinary URL present");
    expect(report).toContain("contentVersion");
    expect(proposal.migrationAssessment).toMatchObject({ classification: "HISTORICAL_MIGRATION_HASH_DRIFT", historicalHashMismatchCount: 6 });
  });

  it("reports no historical hash drift when all ledger rows match the migration source", () => {
    const artifactWithoutDrift = {
      ...candidateArtifact,
      migrationState: {
        ...candidateArtifact.migrationState,
        historicalHashMismatches: [],
      },
    };
    const proposal = buildOwnerReconciliationProposal({
      candidateArtifact: artifactWithoutDrift,
      appleIdentityAudit: audit,
      scannedAt: "2026-10-04T00:00:00.000Z",
    });

    expect(proposal.migrationAssessment).toMatchObject({
      classification: "ALL_MIGRATION_HASHES_MATCH",
      appliedRows: 18,
      localRows: 18,
      historicalHashMismatchCount: 0,
      mismatchedTags: [],
    });
    expect(proposal.migrationAssessment.importPlannerGate).toContain("no historical content mismatch was found");
    expect(renderOwnerReconciliationReview(proposal)).toContain("ALL_MIGRATION_HASHES_MATCH");
    expect(renderOwnerReconciliationReview(proposal)).toContain("0 content-hash mismatches");
  });

  it("rejects a scan from the wrong target or release", () => {
    expect(() => buildOwnerReconciliationProposal({
      candidateArtifact: { ...candidateArtifact, target: { ...candidateArtifact.target, environment: "production" } },
      appleIdentityAudit: audit,
      scannedAt: "2026-10-03T00:00:00.000Z",
    })).toThrow("OWNER_PROPOSAL_SOURCE_OR_TARGET_MISMATCH");
  });

  it("is rejected by the import planner as analysis-only, not human-owned reconciliation", () => {
    const proposal = buildOwnerReconciliationProposal({ candidateArtifact, appleIdentityAudit: audit, scannedAt: "2026-10-03T00:00:00.000Z" });
    const root = path.join(process.cwd(), "vocabflow-dataset/releases/canary-v2.1.0/import");
    const artifacts = {
      vocabulary: JSON.parse(readFileSync(path.join(root, "vocabulary-import-v2.json"), "utf8")),
      topics: JSON.parse(readFileSync(path.join(root, "topics-import-v2.json"), "utf8")),
      learningSets: JSON.parse(readFileSync(path.join(root, "learning-sets-import-v2.json"), "utf8")),
      learningSetItems: JSON.parse(readFileSync(path.join(root, "learning-set-items-import-v2.json"), "utf8")),
      topicMemberships: JSON.parse(readFileSync(path.join(root, "topic-memberships-import-v2.json"), "utf8")),
    } as ImportArtifacts;
    const humanTemplate = JSON.parse(readFileSync(path.join(root, "mappings/runtime-reconciliation-template-v2.json"), "utf8")) as Record<string, unknown>;
    const shapedAnalysisArtifact = {
      ...humanTemplate,
      artifactVersion: proposal.artifactVersion,
      owner: proposal.owner,
      generatedByTransform: proposal.generatedByScan,
      analysisOnly: proposal.analysisOnly,
    };
    const plan = buildMasterVocabularyImportPlan({ artifacts, reconciliation: shapedAnalysisArtifact as unknown as Reconciliation });
    expect(plan.issues.map((issue) => issue.code)).toContain("RECONCILIATION_OWNERSHIP_INVALID");
    expect(plan.eligibility.canApply).toBe(false);
  });
});
