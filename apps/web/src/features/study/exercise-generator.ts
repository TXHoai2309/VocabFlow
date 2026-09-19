import type { ReviewQueueItem } from "@vocabflow/contracts";

export const EXERCISE_OPTION_COUNT = 4 as const;
export const EXERCISE_TYPE = {
  MULTIPLE_CHOICE_MEANING: "MULTIPLE_CHOICE_MEANING",
  LISTENING_CHOICE: "LISTENING_CHOICE"
} as const;

export type ExerciseType = typeof EXERCISE_TYPE[keyof typeof EXERCISE_TYPE];

export type ExerciseOption = {
  optionId: string;
  vocabularyId: number;
  label: string;
};

export type ExerciseInstance = {
  exerciseId: string;
  exerciseType: ExerciseType;
  vocabularyId: number;
  audioUrl: string | null;
  prompt: string;
  options: ExerciseOption[];
  correctOptionId: string;
};

function normalizeText(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("vi-VN")
    .replace(/\s+/g, " ");
}

export function normalizeExerciseOption(value: string): string {
  return normalizeText(value);
}

function meaningSenses(value: string): string[] {
  return normalizeText(value)
    .split(/[;,/|]+/u)
    .map((sense) => sense.trim())
    .filter(Boolean);
}

export function meaningsOverlap(first: string, second: string): boolean {
  const firstFull = normalizeText(first);
  const secondFull = normalizeText(second);
  if (!firstFull || !secondFull) return true;
  if (firstFull === secondFull) return true;

  const firstSenses = meaningSenses(first);
  const secondSenses = meaningSenses(second);
  return firstSenses.some((firstSense) => secondSenses.some((secondSense) => {
    if (firstSense === secondSense) return true;
    // A conservative boundary for multi-sense data: only compare longer
    // senses, so short words such as “an” do not discard unrelated meanings.
    return firstSense.length >= 4
      && secondSense.length >= 4
      && (firstSense.includes(secondSense) || secondSense.includes(firstSense));
  }));
}

export function hasUsableAudio(audioUrl: string | null): boolean {
  return typeof audioUrl === "string" && audioUrl.trim().length > 0;
}

function stableHash(value: string): number {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicOrder<T extends { vocabulary: { id: number } }>(items: T[], seed: string): T[] {
  return [...items].sort((first, second) => {
    const firstRank = stableHash(`${seed}:${first.vocabulary.id}`);
    const secondRank = stableHash(`${seed}:${second.vocabulary.id}`);
    return firstRank - secondRank || first.vocabulary.id - second.vocabulary.id;
  });
}

function uniqueCandidates(
  target: ReviewQueueItem,
  pool: ReviewQueueItem[],
  valueOf: (item: ReviewQueueItem) => string,
  isSafe: (value: string) => boolean
): ReviewQueueItem[] {
  const seen = new Set<string>();
  return deterministicOrder(pool, `${target.vocabulary.id}:${valueOf(target)}`)
    .filter((item) => item.vocabulary.id !== target.vocabulary.id)
    .filter((item) => {
      const value = valueOf(item);
      const normalized = normalizeText(value);
      if (!isSafe(value) || !normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function optionOrder(
  target: ReviewQueueItem,
  distractors: ReviewQueueItem[],
  type: ExerciseType,
  labelOf: (item: ReviewQueueItem) => string
): ExerciseOption[] {
  const candidates = deterministicOrder([target, ...distractors], `${type}:${target.vocabulary.id}`);
  return candidates.map((item) => ({
    optionId: `${type}:${item.vocabulary.id}`,
    vocabularyId: item.vocabulary.id,
    label: labelOf(item)
  }));
}

export function createMeaningExercise(target: ReviewQueueItem, pool: ReviewQueueItem[]): ExerciseInstance | null {
  const correctMeaning = target.vocabulary.vietnamese;
  if (!normalizeText(correctMeaning)) return null;

  const distractors = uniqueCandidates(
    target,
    pool,
    (item) => item.vocabulary.vietnamese,
    (meaning) => !meaningsOverlap(correctMeaning, meaning)
  ).slice(0, EXERCISE_OPTION_COUNT - 1);
  if (distractors.length !== EXERCISE_OPTION_COUNT - 1) return null;

  const options = optionOrder(target, distractors, EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING, (item) => item.vocabulary.vietnamese);
  return {
    exerciseId: `meaning:${target.vocabulary.id}:${target.vocabulary.contentVersion}`,
    exerciseType: EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING,
    vocabularyId: target.vocabulary.id,
    audioUrl: null,
    prompt: target.vocabulary.word,
    options,
    correctOptionId: `${EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING}:${target.vocabulary.id}`
  };
}

export function createListeningExercise(target: ReviewQueueItem, pool: ReviewQueueItem[]): ExerciseInstance | null {
  if (!hasUsableAudio(target.vocabulary.audioUrl) || !normalizeText(target.vocabulary.word)) return null;

  const targetWord = normalizeText(target.vocabulary.word);
  const distractors = uniqueCandidates(
    target,
    pool,
    (item) => item.vocabulary.word,
    (word) => normalizeText(word) !== targetWord
  ).slice(0, EXERCISE_OPTION_COUNT - 1);
  if (distractors.length !== EXERCISE_OPTION_COUNT - 1) return null;

  const options = optionOrder(target, distractors, EXERCISE_TYPE.LISTENING_CHOICE, (item) => item.vocabulary.word);
  return {
    exerciseId: `listening:${target.vocabulary.id}:${target.vocabulary.contentVersion}`,
    exerciseType: EXERCISE_TYPE.LISTENING_CHOICE,
    vocabularyId: target.vocabulary.id,
    audioUrl: target.vocabulary.audioUrl?.trim() ?? null,
    prompt: "Nghe phát âm rồi chọn từ đúng.",
    options,
    correctOptionId: `${EXERCISE_TYPE.LISTENING_CHOICE}:${target.vocabulary.id}`
  };
}

export function createExercise(target: ReviewQueueItem, pool: ReviewQueueItem[]): ExerciseInstance | null {
  // Listening is the first exercise in the explicit exercise route when media
  // and a safe candidate set are available. Meaning remains the deterministic
  // fallback for words without usable audio.
  return createListeningExercise(target, pool) ?? createMeaningExercise(target, pool);
}
