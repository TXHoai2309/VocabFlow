import type { ReviewQueueItem, ReviewQueueResponse } from "@vocabflow/contracts";
import { requestLearningSet } from "../learning-sets/learning-sets-client";
import { requestTopicVocabulary } from "../learners/topics-client";
import { requestReviewQueue } from "./review-queue-client";

export type StudyScope = { type: "topic" | "learning-set"; id: number } | { type: "saved" } | { type: "invalid" };
export type StudyContentMode = "new" | "review" | "mixed";
export type StudySelection = { amount: 5 | 10 | 20 | 30; content: StudyContentMode };

export function studyScopeFromParams(searchParams: URLSearchParams): StudyScope | null {
  const topicId = searchParams.get("topicId");
  const learningSetId = searchParams.get("learningSetId");
  const savedValues = searchParams.getAll("saved");
  const saved = savedValues[0] ?? null;
  if ((topicId !== null && learningSetId !== null)
    || savedValues.length > 1
    || (saved !== null && (saved !== "1" || topicId !== null || learningSetId !== null))) return { type: "invalid" };
  if (saved === "1") return { type: "saved" };
  const type = topicId !== null ? "topic" : learningSetId !== null ? "learning-set" : null;
  if (!type) return null;
  const rawId = topicId ?? learningSetId;
  if (!rawId || !/^\d+$/.test(rawId)) return { type: "invalid" };
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? { type, id } : { type: "invalid" };
}

export function studySelectionFromParams(searchParams: URLSearchParams): StudySelection | null {
  const rawAmount = searchParams.get("count");
  const rawContent = searchParams.get("content");
  const amount = rawAmount === "5" || rawAmount === "10" || rawAmount === "20" || rawAmount === "30"
    ? Number(rawAmount) as StudySelection["amount"]
    : null;
  const content = rawContent === "new" || rawContent === "review" || rawContent === "mixed"
    ? rawContent
    : null;
  return amount && content ? { amount, content } : null;
}

export function selectStudyQueue(response: ReviewQueueResponse, selection: StudySelection): ReviewQueueResponse {
  const eligible = response.queue.filter((item) => selection.content === "mixed"
    || (selection.content === "new" ? item.queueType === "NEW" : item.queueType === "DUE"));
  const queue = eligible.slice(0, selection.amount);
  return {
    ...response,
    queue,
    dueCount: queue.filter((item) => item.queueType === "DUE").length,
    newCount: queue.filter((item) => item.queueType === "NEW").length
  };
}

function restrictQueueToVocabulary(response: ReviewQueueResponse, vocabularyIds: number[]): ReviewQueueResponse {
  const eligibleIds = new Set(vocabularyIds);
  const queue = response.queue.filter((item: ReviewQueueItem) => eligibleIds.has(item.vocabulary.id));
  return {
    ...response,
    queue,
    dueCount: queue.filter((item) => item.queueType === "DUE").length,
    newCount: queue.filter((item) => item.queueType === "NEW").length
  };
}

export async function requestScopedReviewQueue(
  learnerId: string,
  scope: StudyScope | null,
  scopedVocabularyIds?: Promise<number[]>
): Promise<ReviewQueueResponse> {
  if (!scope) return requestReviewQueue(learnerId);
  if (scope.type === "saved") return requestReviewQueue(learnerId, "saved");
  const response = await requestReviewQueue(learnerId);
  if (scope.type === "invalid") return { ...response, queue: [], dueCount: 0, newCount: 0 };

  const vocabularyIds = scopedVocabularyIds
    ? await scopedVocabularyIds
    : scope.type === "topic"
      ? (await requestTopicVocabulary(scope.id)).map((item) => item.id)
      : (await requestLearningSet(scope.id)).items.map((item) => item.vocabulary.id);
  return restrictQueueToVocabulary(response, vocabularyIds);
}
