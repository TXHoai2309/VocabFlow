import type { ReviewQueueItem } from "@vocabflow/contracts";

export const EXERCISE_OPTION_COUNT = 4 as const;
export const EXERCISE_TYPE = {
  MULTIPLE_CHOICE_MEANING: "MULTIPLE_CHOICE_MEANING",
  LISTENING_CHOICE: "LISTENING_CHOICE",
  IMAGE_TO_WORD: "IMAGE_TO_WORD",
  TYPE_WORD: "TYPE_WORD"
} as const;

export type ExerciseType = typeof EXERCISE_TYPE[keyof typeof EXERCISE_TYPE];

export const TYPE_WORD_CUE = {
  VIETNAMESE: "VIETNAMESE",
  IMAGE: "IMAGE",
  AUDIO: "AUDIO",
  DEFINITION: "DEFINITION",
  EXAMPLE: "EXAMPLE"
} as const;

export type TypeWordCue = typeof TYPE_WORD_CUE[keyof typeof TYPE_WORD_CUE];

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
  imageUrl?: string | null;
  prompt: string;
  cueType?: TypeWordCue | null;
  cueText?: string | null;
  options: ExerciseOption[];
  correctOptionId: string | null;
  correctAnswer?: string | null;
};

export type ExerciseGenerationOptions = {
  preferredType?: ExerciseType;
  preferredTypes?: readonly ExerciseType[];
  blockedTypes?: readonly ExerciseType[];
  blockedCues?: readonly TypeWordCue[];
};

export const TYPE_WORD_SUBMISSION = `${EXERCISE_TYPE.TYPE_WORD}:SUBMITTED`;

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

export function normalizeExerciseAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("vi-VN");
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

export function hasUsableAudio(audioUrl: string | null | undefined): boolean {
  return typeof audioUrl === "string" && audioUrl.trim().length > 0;
}

export function hasUsableImage(imageUrl: string | null | undefined): boolean {
  return typeof imageUrl === "string" && imageUrl.trim().length > 0;
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

function createWordChoiceExercise(
  target: ReviewQueueItem,
  pool: ReviewQueueItem[],
  exerciseType: ExerciseType,
  prompt: string,
  imageUrl: string | null,
  audioUrl: string | null
): ExerciseInstance | null {
  const targetWord = normalizeText(target.vocabulary.word);
  if (!targetWord) return null;

  const distractors = uniqueCandidates(
    target,
    pool,
    (item) => item.vocabulary.word,
    (word) => normalizeText(word) !== targetWord
  ).slice(0, EXERCISE_OPTION_COUNT - 1);
  if (distractors.length !== EXERCISE_OPTION_COUNT - 1) return null;

  const options = optionOrder(target, distractors, exerciseType, (item) => item.vocabulary.word.trim());
  return {
    exerciseId: `${exerciseType.toLocaleLowerCase("en-US")}:${target.vocabulary.id}:${target.vocabulary.contentVersion}`,
    exerciseType,
    vocabularyId: target.vocabulary.id,
    audioUrl,
    imageUrl,
    prompt,
    cueType: null,
    cueText: null,
    options,
    correctOptionId: `${exerciseType}:${target.vocabulary.id}`,
    correctAnswer: null
  };
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
    imageUrl: null,
    prompt: target.vocabulary.word,
    cueType: null,
    cueText: null,
    options,
    correctOptionId: `${EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING}:${target.vocabulary.id}`,
    correctAnswer: null
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

  const options = optionOrder(target, distractors, EXERCISE_TYPE.LISTENING_CHOICE, (item) => item.vocabulary.word.trim());
  return {
    exerciseId: `listening:${target.vocabulary.id}:${target.vocabulary.contentVersion}`,
    exerciseType: EXERCISE_TYPE.LISTENING_CHOICE,
    vocabularyId: target.vocabulary.id,
    audioUrl: target.vocabulary.audioUrl?.trim() ?? null,
    imageUrl: null,
    prompt: "Nghe phát âm rồi chọn từ đúng.",
    cueType: null,
    cueText: null,
    options,
    correctOptionId: `${EXERCISE_TYPE.LISTENING_CHOICE}:${target.vocabulary.id}`,
    correctAnswer: null
  };
}

export function createImageToWordExercise(target: ReviewQueueItem, pool: ReviewQueueItem[]): ExerciseInstance | null {
  if (!hasUsableImage(target.vocabulary.imageUrl)) return null;
  const imageUrl = target.vocabulary.imageUrl?.trim() ?? null;
  if (!imageUrl) return null;
  return createWordChoiceExercise(
    target,
    pool,
    EXERCISE_TYPE.IMAGE_TO_WORD,
    "Nhìn hình rồi chọn từ tiếng Anh đúng.",
    imageUrl,
    null
  );
}

function safeCueText(value: string | null, targetWord: string): string | null {
  if (typeof value !== "string") return null;
  const normalizedValue = normalizeExerciseAnswer(value);
  const normalizedTarget = normalizeExerciseAnswer(targetWord);
  if (!normalizedValue || !normalizedTarget || normalizedValue.includes(normalizedTarget)) return null;
  return value.trim();
}

export function createTypeWordExercise(
  target: ReviewQueueItem,
  _pool: ReviewQueueItem[] = [],
  options: { blockedCues?: readonly TypeWordCue[] } = {}
): ExerciseInstance | null {
  const targetWord = target.vocabulary.word.trim();
  if (!normalizeExerciseAnswer(targetWord)) return null;
  const blockedCues = new Set(options.blockedCues ?? []);
  const vietnamese = !blockedCues.has(TYPE_WORD_CUE.VIETNAMESE)
    ? safeCueText(target.vocabulary.vietnamese, targetWord)
    : null;
  const imageUrl = !blockedCues.has(TYPE_WORD_CUE.IMAGE) && hasUsableImage(target.vocabulary.imageUrl)
    ? target.vocabulary.imageUrl?.trim() ?? null
    : null;
  const audioUrl = !blockedCues.has(TYPE_WORD_CUE.AUDIO) && hasUsableAudio(target.vocabulary.audioUrl)
    ? target.vocabulary.audioUrl?.trim() ?? null
    : null;
  const definition = !blockedCues.has(TYPE_WORD_CUE.DEFINITION)
    ? safeCueText(target.vocabulary.definitionEn, targetWord)
    : null;
  const example = !blockedCues.has(TYPE_WORD_CUE.EXAMPLE)
    ? safeCueText(target.vocabulary.exampleEn, targetWord)
    : null;

  const cue = vietnamese
    ? { cueType: TYPE_WORD_CUE.VIETNAMESE, cueText: vietnamese, imageUrl: null, audioUrl: null }
    : imageUrl
      ? { cueType: TYPE_WORD_CUE.IMAGE, cueText: null, imageUrl, audioUrl: null }
      : audioUrl
        ? { cueType: TYPE_WORD_CUE.AUDIO, cueText: null, imageUrl: null, audioUrl }
        : definition
          ? { cueType: TYPE_WORD_CUE.DEFINITION, cueText: definition, imageUrl: null, audioUrl: null }
          : example
            ? { cueType: TYPE_WORD_CUE.EXAMPLE, cueText: example, imageUrl: null, audioUrl: null }
            : null;
  if (!cue) return null;

  return {
    exerciseId: `typing:${target.vocabulary.id}:${target.vocabulary.contentVersion}:${cue.cueType.toLocaleLowerCase("en-US")}`,
    exerciseType: EXERCISE_TYPE.TYPE_WORD,
    vocabularyId: target.vocabulary.id,
    audioUrl: cue.audioUrl,
    imageUrl: cue.imageUrl,
    prompt: "Gõ từ tiếng Anh tương ứng.",
    cueType: cue.cueType,
    cueText: cue.cueText,
    options: [],
    correctOptionId: null,
    correctAnswer: targetWord
  };
}

export function createExercise(
  target: ReviewQueueItem,
  pool: ReviewQueueItem[],
  options: ExerciseGenerationOptions = {}
): ExerciseInstance | null {
  const blockedTypes = new Set(options.blockedTypes ?? []);
  const preferredTypes = options.preferredTypes
    ?? (options.preferredType === EXERCISE_TYPE.IMAGE_TO_WORD
      ? [EXERCISE_TYPE.IMAGE_TO_WORD, EXERCISE_TYPE.TYPE_WORD, EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING]
      : options.preferredType === EXERCISE_TYPE.TYPE_WORD
        ? [EXERCISE_TYPE.TYPE_WORD, EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING]
        : options.preferredType === EXERCISE_TYPE.LISTENING_CHOICE
          ? [EXERCISE_TYPE.LISTENING_CHOICE, EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING]
          : options.preferredType === EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING
            ? [EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING]
            : null);
  const hasImage = hasUsableImage(target.vocabulary.imageUrl);
  const hasAudio = hasUsableAudio(target.vocabulary.audioUrl);
  // Keep the established meaning route for most no-media cards while making
  // TYPE_WORD discoverable in the default session through a stable rotation.
  const typingRotation = target.vocabulary.id % 4 === 0;
  const defaultTypes = hasAudio
    ? [EXERCISE_TYPE.LISTENING_CHOICE, EXERCISE_TYPE.IMAGE_TO_WORD, EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING]
    : hasImage
      ? [EXERCISE_TYPE.IMAGE_TO_WORD, EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING]
      : typingRotation
        ? [EXERCISE_TYPE.TYPE_WORD, EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING]
        : [EXERCISE_TYPE.MULTIPLE_CHOICE_MEANING];
  const types = preferredTypes
    ? [...preferredTypes]
    : defaultTypes;

  for (const type of types) {
    if (blockedTypes.has(type)) continue;
    const exercise = type === EXERCISE_TYPE.IMAGE_TO_WORD
      ? createImageToWordExercise(target, pool)
      : type === EXERCISE_TYPE.LISTENING_CHOICE
        ? createListeningExercise(target, pool)
        : type === EXERCISE_TYPE.TYPE_WORD
          ? createTypeWordExercise(target, pool, { blockedCues: options.blockedCues })
          : createMeaningExercise(target, pool);
    if (exercise) return exercise;
  }
  return null;
}
