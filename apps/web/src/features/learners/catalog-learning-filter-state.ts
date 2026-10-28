import type { VocabularyLevel } from "@vocabflow/contracts";

export const catalogGrades: VocabularyLevel[] = ["GRADE_1", "GRADE_2", "GRADE_3", "GRADE_4", "GRADE_5", "GENERAL"];
export function readCatalogLearningFilters(params: URLSearchParams) {
  const raw = params.get("level");
  const level = catalogGrades.includes(raw as VocabularyLevel) ? raw as VocabularyLevel : null;
  const cefr = /^[ABC][12]$/.test(params.get("cefr") ?? "") ? params.get("cefr") : null;
  return { level, cefr };
}
export function catalogLearningFilterParams(params: URLSearchParams) {
  const { level, cefr } = readCatalogLearningFilters(params);
  return new URLSearchParams({ ...(level ? { level } : {}), ...(cefr ? { cefr } : {}) });
}
