import { describe, expect, it } from "vitest";
import type { ReviewQueueItem, VocabularyDto } from "@vocabflow/contracts";
import {
  createExercise,
  createImageToWordExercise,
  createListeningExercise,
  createMeaningExercise,
  createTypeWordExercise,
  EXERCISE_OPTION_COUNT,
  EXERCISE_TYPE,
  hasUsableAudio,
  hasUsableImage,
  normalizeExerciseAnswer,
  normalizeExerciseOption
} from "./exercise-generator";

function item(
  id: number,
  word: string,
  vietnamese: string,
  audioUrl: string | null = null,
  imageUrl: string | null = null,
  definitionEn: string | null = null,
  exampleEn: string | null = null
): ReviewQueueItem {
  const vocabulary: VocabularyDto = {
    id,
    word,
    ipa: null,
    vietnamese,
    definitionEn,
    exampleEn,
    imageUrl,
    audioUrl,
    topic: null,
    level: null,
    enabled: true,
    contentVersion: 1
  };
  return {
    vocabulary,
    queueType: "NEW",
    status: "NEW",
    nextReviewDate: null,
    expectedRevision: 0
  };
}

describe("US-31 deterministic meaning exercises", () => {
  it("creates an English prompt with exactly one correct Vietnamese meaning", () => {
    const target = item(1, "apple", "quả táo");
    const exercise = createMeaningExercise(target, [
      target,
      item(2, "book", "quyển sách"),
      item(3, "house", "ngôi nhà"),
      item(4, "water", "nước"),
      item(5, "tree", "cây")
    ]);

    expect(exercise).toMatchObject({
      exerciseType: EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING,
      vocabularyId: 1,
      prompt: "apple"
    });
    expect(exercise?.options).toHaveLength(EXERCISE_OPTION_COUNT);
    expect(exercise?.options.filter((option) => option.optionId === exercise.correctOptionId)).toHaveLength(1);
    expect(exercise?.options.map((option) => normalizeExerciseOption(option.label))).toHaveLength(4);
    expect(new Set(exercise?.options.map((option) => normalizeExerciseOption(option.label))).size).toBe(4);
  });

  it("excludes duplicate, blank, overlapping and self distractors", () => {
    const target = item(1, "apple", "quả táo");
    const exercise = createMeaningExercise(target, [
      target,
      item(1, "apple", "quả táo"),
      item(2, "book", " QUẢ TÁO "),
      item(3, "green-apple", "quả táo xanh"),
      item(4, "empty", "   "),
      item(5, "water", "nước"),
      item(6, "house", "ngôi nhà"),
      item(7, "tree", "cây")
    ]);

    expect(exercise?.options.map((option) => option.vocabularyId)).not.toContain(2);
    expect(exercise?.options.map((option) => option.vocabularyId)).not.toContain(3);
    expect(exercise?.options.map((option) => option.vocabularyId)).not.toContain(4);
    expect(exercise?.options.filter((option) => option.vocabularyId === 1)).toHaveLength(1);
    expect(exercise?.options).toHaveLength(4);
  });

  it("returns no exercise instead of inventing unsafe distractors", () => {
    const target = item(1, "apple", "quả táo");
    expect(createMeaningExercise(target, [target, item(2, "book", "quyển sách")])).toBeNull();
  });
});

describe("US-32 deterministic listening exercises", () => {
  it("requires usable target audio and creates unique English candidates", () => {
    const target = item(1, "apple", "quả táo", " /audio/apple.mp3 ");
    const exercise = createListeningExercise(target, [
      target,
      item(2, "book", "quyển sách", "/audio/book.mp3"),
      item(3, "house", "ngôi nhà", "/audio/house.mp3"),
      item(4, "water", "nước", "/audio/water.mp3"),
      item(5, "APPLE", "táo", "/audio/other.mp3")
    ]);

    expect(exercise).toMatchObject({
      exerciseType: EXERCISE_TYPE.LISTENING_CHOICE,
      vocabularyId: 1,
      audioUrl: "/audio/apple.mp3",
      prompt: "Nghe phát âm rồi chọn từ đúng."
    });
    expect(exercise?.options).toHaveLength(4);
    expect(exercise?.options.filter((option) => option.optionId === exercise.correctOptionId)).toHaveLength(1);
    expect(new Set(exercise?.options.map((option) => normalizeExerciseOption(option.label))).size).toBe(4);
    expect(exercise?.options.map((option) => option.label)).not.toContain("APPLE");
  });

  it.each([null, "", "   "])("rejects missing audio %j", (audioUrl) => {
    expect(hasUsableAudio(audioUrl)).toBe(false);
    expect(createListeningExercise(item(1, "apple", "quả táo", audioUrl), [
      item(1, "apple", "quả táo", audioUrl),
      item(2, "book", "quyển sách", "/audio/book.mp3"),
      item(3, "house", "ngôi nhà", "/audio/house.mp3"),
      item(4, "water", "nước", "/audio/water.mp3")
    ])).toBeNull();
  });

  it("prefers listening when available and falls back to meaning otherwise", () => {
    const targetWithAudio = item(1, "apple", "quả táo", "/audio/apple.mp3");
    const pool = [targetWithAudio, item(2, "book", "quyển sách"), item(3, "house", "ngôi nhà"), item(4, "water", "nước")];
    expect(createExercise(targetWithAudio, pool)?.exerciseType).toBe(EXERCISE_TYPE.LISTENING_CHOICE);

    const targetWithoutAudio = item(1, "apple", "quả táo");
    expect(createExercise(targetWithoutAudio, [targetWithoutAudio, ...pool.slice(1)])?.exerciseType)
      .toBe(EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING);
  });
});

describe("US-33 deterministic image-to-word exercises", () => {
  it("creates four unique English choices with a neutral image prompt", () => {
    const target = item(1, "apple", "quả táo", null, " /images/apple.jpg ");
    const exercise = createImageToWordExercise(target, [
      target,
      item(2, "book", "quyển sách"),
      item(3, "house", "ngôi nhà"),
      item(4, "water", "nước")
    ]);

    expect(exercise).toMatchObject({
      exerciseType: EXERCISE_TYPE.IMAGE_TO_WORD,
      imageUrl: "/images/apple.jpg",
      prompt: "Nhìn hình rồi chọn từ tiếng Anh đúng."
    });
    expect(exercise?.options).toHaveLength(EXERCISE_OPTION_COUNT);
    expect(exercise?.options.filter((option) => option.vocabularyId === target.vocabulary.id)).toHaveLength(1);
    expect(new Set(exercise?.options.map((option) => normalizeExerciseOption(option.label))).size).toBe(4);
  });

  it.each([null, "", "   "])('rejects missing image %j', (imageUrl) => {
    expect(hasUsableImage(imageUrl)).toBe(false);
    expect(createImageToWordExercise(item(1, "apple", "quả táo", null, imageUrl), [
      item(1, "apple", "quả táo", null, imageUrl),
      item(2, "book", "quyển sách"),
      item(3, "house", "ngôi nhà"),
      item(4, "water", "nước")
    ])).toBeNull();
  });
});

describe("US-34 strict typing exercises", () => {
  it("uses the Vietnamese cue and keeps meaningful internal spaces strict", () => {
    const target = item(4, "ice cream", "kem", null, null, "a frozen dessert");
    const exercise = createTypeWordExercise(target);

    expect(exercise).toMatchObject({
      exerciseType: EXERCISE_TYPE.TYPE_WORD,
      cueType: "VIETNAMESE",
      cueText: "kem",
      correctAnswer: "ice cream"
    });
    expect(normalizeExerciseAnswer(" ＩＣＥ ＣＲＥＡＭ ")).toBe("ice cream");
    expect(normalizeExerciseAnswer("icecream")).not.toBe(normalizeExerciseAnswer("ice cream"));
  });

  it("routes an eligible no-media item to TYPE_WORD deterministically", () => {
    const target = item(4, "apple", "quả táo");
    const pool = [target, item(5, "book", "quyển sách"), item(6, "house", "ngôi nhà"), item(7, "water", "nước")];
    expect(createExercise(target, pool)?.exerciseType).toBe(EXERCISE_TYPE.TYPE_WORD);
  });
});
