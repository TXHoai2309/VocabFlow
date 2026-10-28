import type { LearningSetSummary, VocabularyLevel } from "@vocabflow/contracts";
import { catalogGrades } from "../learners/catalog-learning-filter-state";

export type LearningSetCatalogFilters = {
  grade: VocabularyLevel | null;
  topicId: number | null;
  query: string;
};

export function readLearningSetCatalogFilters(params: URLSearchParams): LearningSetCatalogFilters {
  const rawGrade = params.get("level");
  const rawTopicId = Number(params.get("topicId"));
  return {
    grade: catalogGrades.includes(rawGrade as VocabularyLevel) ? rawGrade as VocabularyLevel : null,
    topicId: Number.isSafeInteger(rawTopicId) && rawTopicId > 0 ? rawTopicId : null,
    query: params.get("q")?.trim() ?? ""
  };
}

function normalized(text: string) {
  return text.normalize("NFKC").toLocaleLowerCase("vi-VN");
}

export function filterLearningSets(sets: LearningSetSummary[], filters: LearningSetCatalogFilters) {
  const query = normalized(filters.query);
  return sets.filter((learningSet) => {
    if (filters.grade && learningSet.grade !== filters.grade) return false;
    if (filters.topicId && !learningSet.topics?.some((topic) => topic.id === filters.topicId)) return false;
    if (!query) return true;
    return [learningSet.name, learningSet.description, ...(learningSet.topics ?? []).map((topic) => topic.name)]
      .some((value) => normalized(value).includes(query));
  });
}
