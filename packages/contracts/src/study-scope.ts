export const MAX_STUDY_SETS = 50;
export type StudyQueueCapacity = 5 | 10 | 20 | 30;
export function parseStudyQueueCapacity(raw: string): StudyQueueCapacity | null {
  return ["5", "10", "20", "30"].includes(raw) ? Number(raw) as StudyQueueCapacity : null;
}
export type LearningSourceScope = { type: "pathway" } | { type: "all" } | { type: "custom"; ids: number[] };
export type StudyCatalogFilters = { level?: "GRADE_1" | "GRADE_2" | "GRADE_3" | "GRADE_4" | "GRADE_5" | "GENERAL"; cefr?: string };
export type CatalogStudyScope = (LearningSourceScope | { type: "topic" | "learning-set"; id: number }) & StudyCatalogFilters;

export function positiveStudyId(raw: string): number | null {
  const id = Number(raw);
  return /^\d+$/.test(raw) && Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** One bounded, comma-separated parameter; duplicates are rejected at the boundary. */
export function parseStudySetIds(raw: string): number[] | null {
  const ids = raw.split(",").map(positiveStudyId);
  if (!ids.length || ids.length > MAX_STUDY_SETS || ids.some((id) => id === null) || new Set(ids).size !== ids.length) return null;
  return (ids as number[]).sort((a, b) => a - b);
}
