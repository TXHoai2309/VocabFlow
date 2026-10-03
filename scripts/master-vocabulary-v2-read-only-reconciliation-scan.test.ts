import { describe, expect, it } from "vitest";
import { emptySnapshot, type RuntimeVocabulary } from "./master-vocabulary-v2-import-planner";
import {
  fingerprintDevelopmentReconciliationSnapshot,
  scanMasterVocabularyV2ReadOnlySnapshot,
  type MasterRuntimeCandidate,
  type ReadOnlySnapshot,
} from "./master-vocabulary-v2-read-only-reconciliation-scan";

function masterSense(masterSenseId: string, vietnamese: string): MasterRuntimeCandidate {
  return {
    masterLexemeId: "bank-lexeme",
    masterSenseId,
    lemma: "bank",
    normalizedLemma: "bank",
    projection: {
      word: "bank",
      ipa: "/bæŋk/",
      vietnamese,
      definitionEn: "Master definition",
      exampleEn: "Master example",
      imageUrl: null,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
    },
  };
}

describe("read-only Master V2 runtime candidate scanner", () => {
  it("shows exact row fields, overrides, history references and drift without mapping polysemy", () => {
    const snapshot = emptySnapshot();
    const row: RuntimeVocabulary = {
      id: 100,
      word: "bank",
      ipa: "/bæŋk/",
      vietnamese: "ngân hàng",
      vietnameseOverride: "ngân hàng của tôi",
      definitionEn: "Old definition",
      exampleEn: "Old example",
      imageUrl: "https://example.invalid/bank.png",
      imageQuarantined: true,
      audioUrl: null,
      topic: "Finance",
      level: null,
      enabled: true,
      contentVersion: 7,
    };
    snapshot.vocabularies.push(row);
    snapshot.progressVocabularyIds.push(100, 100);
    snapshot.reviewVocabularyIds.push(100);
    const before = JSON.stringify(snapshot);

    const report = scanMasterVocabularyV2ReadOnlySnapshot({
      snapshot,
      senses: [masterSense("bank-finance", "ngân hàng"), masterSense("bank-river", "bờ sông")],
    }) as { senses: Array<{ decision: string; runtimeCandidates: Array<Record<string, unknown>> }> };

    expect(report.senses).toHaveLength(2);
    expect(report.senses.every((sense) => sense.decision === "UNRESOLVED")).toBe(true);
    for (const sense of report.senses) {
      const candidate = sense.runtimeCandidates[0]!;
      expect(candidate).toMatchObject({
        appVocabularyId: 100,
        baseVietnamese: "ngân hàng",
        vietnameseOverride: "ngân hàng của tôi",
        effectiveVietnamese: "ngân hàng của tôi",
        imageQuarantined: true,
        effectiveImageUrl: null,
        contentVersion: 7,
        learnerProgressReferenceCount: 2,
        reviewEventReferenceCount: 1,
        decision: "UNRESOLVED",
        polysemyAmbiguous: true,
        candidateClassification: "PARTIAL_MATCH",
      });
      expect(candidate.projectionDifferences).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: "vietnamese", master: sense === report.senses[0] ? "ngân hàng" : "bờ sông", runtime: "ngân hàng của tôi" }),
        expect.objectContaining({ field: "definitionEn", master: "Master definition", runtime: "Old definition" }),
      ]));
      expect(candidate.projectionDifferences).not.toEqual(expect.arrayContaining([expect.objectContaining({ field: "imageUrl" })]));
    }
    expect(JSON.stringify(snapshot)).toBe(before);
  });

  it("flags a candidate already mapped to a different Master Sense", () => {
    const snapshot = emptySnapshot();
    snapshot.vocabularies.push({
      id: 102,
      word: "bank",
      ipa: null,
      vietnamese: "ngân hàng",
      vietnameseOverride: null,
      definitionEn: "A financial institution.",
      exampleEn: null,
      imageUrl: null,
      imageQuarantined: false,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
      contentVersion: 1,
    });
    snapshot.vocabularyMappings.push({
      masterSenseId: "another-sense",
      masterLexemeId: "another-lexeme",
      vocabularyId: 102,
      projectionContractVersion: "projection-v1",
      appliedProjectionFingerprint: "a".repeat(64),
      lastReleaseHash: "b".repeat(64),
    });
    const report = scanMasterVocabularyV2ReadOnlySnapshot({ snapshot, senses: [masterSense("bank-finance", "ngân hàng")] }) as {
      senses: Array<{ runtimeCandidates: Array<Record<string, unknown>> }>;
    };
    expect(report.senses[0]?.runtimeCandidates[0]).toMatchObject({
      candidateClassification: "CONFLICTING_MEANING",
      firstAdoptionAnalysis: "IDENTITY_REVIEW_REQUIRED",
      reconciliationFlags: ["EXISTING_MAPPING_IDENTITY_CONFLICT"],
      decision: "UNRESOLVED",
    });
  });

  it("fingerprints stable reconciliation state including history and Learning Set bridge memberships", () => {
    const snapshot = emptySnapshot() as ReadOnlySnapshot;
    snapshot.vocabularies.push({
      id: 101,
      word: "bank",
      ipa: "/bæŋk/",
      vietnamese: "ngân hàng",
      vietnameseOverride: null,
      definitionEn: "A financial institution.",
      exampleEn: "She went to the bank.",
      imageUrl: null,
      imageQuarantined: false,
      audioUrl: null,
      topic: null,
      level: null,
      enabled: true,
      contentVersion: 1,
    });
    snapshot.learningSets.push({ id: 9, slug: "technology-starter", name: "Technology Starter", description: "", grade: null, enabled: true, sortOrder: 0 });
    snapshot.learningSetItems.push({ learningSetId: 9, vocabularyId: 101, sortOrder: 0 });
    snapshot.masterLearningSetMemberships.push({
      masterLearningSetItemId: "item-1",
      masterLearningSetId: "set-1",
      masterSenseId: "bank-finance",
      learningSetId: 9,
      vocabularyId: 101,
      sortOrder: 0,
    });
    snapshot.learnerProgressCounts = [{ vocabularyId: 101, referenceCount: 2 }];
    snapshot.reviewEventCounts = [{ vocabularyId: 101, referenceCount: 3 }];
    snapshot.learningSetAssignmentCounts = [{ learningSetId: 9, learnerAssignmentCount: 4, activeLearnerAssignmentCount: 3 }];
    const scan = scanMasterVocabularyV2ReadOnlySnapshot({
      snapshot,
      senses: [masterSense("bank-finance", "ngân hàng")],
      learningSets: [{ masterLearningSetId: "set-1", code: "TECHNOLOGY_STARTER", slug: "technology-starter", name: "Technology Starter" }],
    });
    const input = {
      target: { environment: "development", provider: "neon", projectId: "project", branchId: "branch", databaseName: "neondb", roleName: "vocabflow_runtime", purpose: "runtime" },
      releaseHash: "a".repeat(64),
      snapshot,
      scan,
      appliedMigrations: [{ tag: "0017_example", hash: "b".repeat(64) }],
    };
    const fingerprint = fingerprintDevelopmentReconciliationSnapshot(input);
    expect(fingerprintDevelopmentReconciliationSnapshot(input)).toBe(fingerprint);
    expect((scan as { learningSets: Array<{ runtimeCandidates: Array<{ masterMemberships: unknown[]; decision: string }> }> }).learningSets[0]?.runtimeCandidates[0]).toMatchObject({
      masterMemberships: [expect.objectContaining({ masterLearningSetItemId: "item-1" })],
      decision: "UNRESOLVED",
    });

    snapshot.learnerProgressCounts = [{ vocabularyId: 101, referenceCount: 5 }];
    expect(fingerprintDevelopmentReconciliationSnapshot(input)).not.toBe(fingerprint);
  });
});
