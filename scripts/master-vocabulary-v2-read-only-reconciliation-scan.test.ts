import { describe, expect, it } from "vitest";
import { emptySnapshot, type RuntimeVocabulary } from "./master-vocabulary-v2-import-planner";
import { scanMasterVocabularyV2ReadOnlySnapshot, type MasterRuntimeCandidate } from "./master-vocabulary-v2-read-only-reconciliation-scan";

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
      });
      expect(candidate.projectionDifferences).toEqual(expect.arrayContaining([
        expect.objectContaining({ field: "vietnamese", master: sense === report.senses[0] ? "ngân hàng" : "bờ sông", runtime: "ngân hàng của tôi" }),
        expect.objectContaining({ field: "definitionEn", master: "Master definition", runtime: "Old definition" }),
      ]));
      expect(candidate.projectionDifferences).not.toEqual(expect.arrayContaining([expect.objectContaining({ field: "imageUrl" })]));
    }
    expect(JSON.stringify(snapshot)).toBe(before);
  });
});
