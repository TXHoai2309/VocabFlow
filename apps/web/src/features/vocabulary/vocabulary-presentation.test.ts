import { describe, expect, it } from "vitest";
import { formatInferredMetadataLabel, formatPartOfSpeech, formatVocabularyTopic, parseVocabularyExamples } from "./vocabulary-presentation";

describe("vocabulary presentation helpers", () => {
  it("localizes known POS values and keeps an understandable fallback", () => {
    expect(formatPartOfSpeech("NOUN")).toBe("Danh từ");
    expect(formatPartOfSpeech("NOUN_PHRASE")).toBe("Noun Phrase");
    expect(formatPartOfSpeech("  ")).toBeNull();
  });

  it.each([
    ["topic-inferred:computer-science", "Chủ đề · Tin học và khoa học máy tính"],
    ["topic-inferred:care-relationships", "Chủ đề · Quan hệ và chăm sóc"],
    ["topic-inferred:light", "Chủ đề · Ánh sáng"],
    ["topic-inferred:travel", "Chủ đề · Du lịch"],
    ["domain-inferred:travel", "Lĩnh vực · Du lịch"]
  ])("renders a human label for %s without changing the filter identity", (identity, label) => {
    expect(formatVocabularyTopic(identity)).toBe(label);
  });

  it("uses a friendly label for unknown inferred values and preserves catalog names", () => {
    expect(formatVocabularyTopic("topic-inferred:quantum-fields")).toBe("Chủ đề · Quantum Fields");
    expect(formatVocabularyTopic("Khoa học tự nhiên")).toBe("Khoa học tự nhiên");
    expect(formatVocabularyTopic("Animals")).toBe("Động vật");
    expect(formatInferredMetadataLabel("care-relationships", "TOPIC")).toBe("Quan hệ và chăm sóc");
  });

  it("keeps English and Vietnamese examples in separate fields without splitting combined text", () => {
    expect(parseVocabularyExamples([
      { exampleKey: "ex-1", en: "I recognized her accent.", vi: "Tôi nhận ra giọng của cô ấy." },
      { en: "One sentence only." },
      "Combined text. Không tự tách câu."
    ])).toEqual([
      { exampleKey: "ex-1", english: "I recognized her accent.", vietnamese: "Tôi nhận ra giọng của cô ấy." },
      { english: "One sentence only.", vietnamese: null }
    ]);
  });
});
