import { parseStudySetIds, type LearningSourceScope } from "@vocabflow/contracts";

export function readStudyPreference(userId?: string): { source: LearningSourceScope["type"]; ids: number[] } {
  const fallback = { source: "pathway" as const, ids: [] };
  if (!userId) return fallback;
  try {
    const value = JSON.parse(localStorage.getItem(`vocabflow.study-source.v1:${userId}`) ?? "null") as { source?: unknown; ids?: unknown } | null;
    if (!value || !["pathway", "custom", "all"].includes(String(value.source))) return fallback;
    const ids = Array.isArray(value.ids) ? parseStudySetIds(value.ids.join(",")) ?? [] : [];
    return { source: value.source as LearningSourceScope["type"], ids };
  } catch { return fallback; }
}

export function saveStudyPreference(userId: string | undefined, source: LearningSourceScope["type"], ids: number[]) {
  if (!userId) return;
  try { localStorage.setItem(`vocabflow.study-source.v1:${userId}`, JSON.stringify({ source, ids })); } catch { /* Preference storage is optional. */ }
}
