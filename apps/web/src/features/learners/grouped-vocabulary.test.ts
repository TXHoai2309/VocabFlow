import { describe, expect, it } from "vitest";
import type { LearnerVocabularyBrowseItem } from "@vocabflow/contracts";
import { groupVocabularyByHeadword } from "./grouped-vocabulary";

function mockBrowseItem(id: number, word: string, partOfSpeech?: string, vietnamese = "nghĩa"): LearnerVocabularyBrowseItem {
  return {
    id,
    word,
    ipa: null,
    vietnamese,
    imageUrl: null,
    audioUrl: null,
    topic: null,
    level: "GENERAL",
    enabled: true,
    contentVersion: 1,
    status: "NEW",
    nextReviewDate: null,
    partOfSpeech
  };
}

describe("groupVocabularyByHeadword", () => {
  it("returns an empty array when given an empty list", () => {
    expect(groupVocabularyByHeadword([])).toEqual([]);
  });

  it("keeps single-sense words as 1-item groups", () => {
    const items = [
      mockBrowseItem(1, "apple", "NOUN"),
      mockBrowseItem(2, "banana", "NOUN")
    ];
    const grouped = groupVocabularyByHeadword(items);
    expect(grouped).toHaveLength(2);
    expect(grouped[0].headword).toBe("apple");
    expect(grouped[0].senseCount).toBe(1);
    expect(grouped[0].partOfSpeechLabels).toEqual(["Danh từ"]);
    expect(grouped[1].headword).toBe("banana");
    expect(grouped[1].senseCount).toBe(1);
  });

  it("consolidates multi-sense words (e.g. 6 senses of abuse) into a single group", () => {
    const items = [
      mockBrowseItem(1, "abundant", "ADJECTIVE", "dồi dào"),
      mockBrowseItem(2, "abuse", "NOUN", "sự đối xử tàn nhẫn"),
      mockBrowseItem(3, "abuse", "VERB", "đối xử tàn nhẫn"),
      mockBrowseItem(4, "abuse", "VERB", "dùng lời xúc phạm"),
      mockBrowseItem(5, "abuse", "NOUN", "lời xúc phạm"),
      mockBrowseItem(6, "abuse", "NOUN", "lạm dụng quyền lực"),
      mockBrowseItem(7, "abuse", "VERB", "lạm dụng"),
      mockBrowseItem(8, "abysmal", "ADJECTIVE", "tồi tệ")
    ];

    const grouped = groupVocabularyByHeadword(items);
    expect(grouped).toHaveLength(3);

    // 1st group: abundant
    expect(grouped[0].headword).toBe("abundant");
    expect(grouped[0].senseCount).toBe(1);

    // 2nd group: abuse (6 senses consolidated)
    expect(grouped[1].headword).toBe("abuse");
    expect(grouped[1].senseCount).toBe(6);
    expect(grouped[1].senses).toHaveLength(6);
    expect(grouped[1].partOfSpeechLabels).toContain("Danh từ");
    expect(grouped[1].partOfSpeechLabels).toContain("Động từ");

    // 3rd group: abysmal
    expect(grouped[2].headword).toBe("abysmal");
    expect(grouped[2].senseCount).toBe(1);
  });

  it("handles case-insensitive grouping (e.g. Abuse and abuse)", () => {
    const items = [
      mockBrowseItem(1, "Abuse", "NOUN"),
      mockBrowseItem(2, "abuse", "VERB")
    ];
    const grouped = groupVocabularyByHeadword(items);
    expect(grouped).toHaveLength(1);
    expect(grouped[0].senseCount).toBe(2);
  });
});
