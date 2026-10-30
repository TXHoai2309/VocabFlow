export const cefrCodes = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export const unclassifiedCefrFilter = "UNCLASSIFIED" as const;
export const firstWordsFilter = "intro-first-words" as const;
export const firstWordsTag = "EDITORIAL:FIRST_WORDS" as const;
export const cefrFilterValues = [...cefrCodes, unclassifiedCefrFilter, firstWordsFilter] as const;
export type CefrFilter = (typeof cefrFilterValues)[number];

/** Discovery labels only; these never assess a learner's proficiency. */
export const cefrLearningLevels = [
  { value: "A1", label: "Sơ cấp" },
  { value: "A2", label: "Cơ bản" },
  { value: "B1", label: "Trung cấp" },
  { value: "B2", label: "Trên trung cấp" },
  { value: "C1", label: "Nâng cao" },
  { value: "C2", label: "Chuyên sâu" }
] as const;

/** No foundation items are published by the current vocabulary contract. */
export const introductoryLearningLevels = [
  { value: "intro-letters-sounds", label: "Làm quen chữ và âm" },
  { value: "intro-first-words", label: "Từ đầu tiên" },
  { value: "intro-first-utterances", label: "Câu đầu tiên" }
] as const;

export function isCefrFilter(value: string): value is CefrFilter {
  return cefrFilterValues.some((code) => code === value);
}

export function matchesCefrFilter(value: string | null | undefined, filter: string | null | undefined, tags?: readonly string[]): boolean {
  if (!filter) return true;
  if (filter === firstWordsFilter) return tags?.includes(firstWordsTag) ?? false;
  return filter === unclassifiedCefrFilter ? !value?.trim() : value === filter;
}

export function learningLevelLabel(value: string): string {
  if (value === firstWordsFilter) return "Từ đầu tiên";
  if (value === unclassifiedCefrFilter) return "Chưa phân loại";
  const level = cefrLearningLevels.find((item) => item.value === value);
  return level ? `${level.label} (${level.value})` : value;
}
