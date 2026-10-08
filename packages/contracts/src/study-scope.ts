export const MAX_STUDY_SETS = 50;
export type LearningSourceScope = { type: "pathway" } | { type: "all" } | { type: "custom"; ids: number[] };
export type CatalogStudyScope = LearningSourceScope | { type: "topic" | "learning-set"; id: number };

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
