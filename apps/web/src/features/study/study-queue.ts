import type { ReviewQueueItem, ReviewQueueResponse } from "@vocabflow/contracts";
import { requestLearningSet } from "../learning-sets/learning-sets-client";
import { requestTopicVocabulary } from "../learners/topics-client";
import { requestReviewQueue } from "./review-queue-client";

export type StudyScope = { type: "topic" | "learning-set"; id: number } | { type: "saved"; all: boolean } | { type: "weak" } | { type: "invalid" };
export type StudyContentMode = "new" | "review" | "mixed";
export type StudySelection = { amount: 5 | 10 | 20 | 30; content: StudyContentMode | "all" };

export function studyScopeFromParams(searchParams: URLSearchParams): StudyScope | null {
  const topicId = searchParams.get("topicId");
  const learningSetId = searchParams.get("learningSetId");
  const savedValues = searchParams.getAll("saved");
  const weakValues = searchParams.getAll("weak");
  const contentValues = searchParams.getAll("content");
  const saved = savedValues[0] ?? null;
  if ((topicId !== null && learningSetId !== null)
    || savedValues.length > 1
    || weakValues.length > 1
    || (saved !== null && (saved !== "1" || topicId !== null || learningSetId !== null || weakValues.length > 0))
    || (weakValues.length > 0 && (weakValues[0] !== "1" || topicId !== null || learningSetId !== null))) return { type: "invalid" };
  if (saved === "1") {
    if (contentValues.length > 1) return { type: "invalid" };
    const content = contentValues[0];
    if (content && !["all", "new", "review", "mixed"].includes(content)) return { type: "invalid" };
    return { type: "saved", all: content === "all" };
  }
  if (weakValues.length === 1) {
    if (contentValues.length > 1 || (contentValues.length === 1 && contentValues[0] !== "all")) return { type: "invalid" };
    return { type: "weak" };
  }
  if (contentValues.includes("all")) return { type: "invalid" };
  const type = topicId !== null ? "topic" : learningSetId !== null ? "learning-set" : null;
  if (!type) return null;
  const rawId = topicId ?? learningSetId;
  if (!rawId || !/^\d+$/.test(rawId)) return { type: "invalid" };
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? { type, id } : { type: "invalid" };
}

export function studySelectionFromParams(searchParams: URLSearchParams, scope?: StudyScope | null): StudySelection | null {
  const rawAmount = searchParams.get("count");
  const rawContent = searchParams.get("content");
  if (searchParams.getAll("count").length > 1 || searchParams.getAll("content").length > 1) return null;
  const amount = rawAmount === "5" || rawAmount === "10" || rawAmount === "20" || rawAmount === "30"
    ? Number(rawAmount) as StudySelection["amount"]
    : null;
  const content = rawContent === "all" && ((scope?.type === "saved" && scope.all) || scope?.type === "weak")
    ? "all"
    : rawContent === "new" || rawContent === "review" || rawContent === "mixed"
    ? rawContent
    : null;
  return amount && content ? { amount, content } : null;
}

export function selectStudyQueue(response: ReviewQueueResponse, selection: StudySelection): ReviewQueueResponse {
  const source = selection.content === "all"
    ? [...new Map(response.queue.map((item) => [item.vocabulary.id, item])).values()]
    : response.queue;
  const eligible = source.filter((item) => selection.content === "all"
    || (selection.content === "mixed" ? item.queueType === "NEW" || item.queueType === "DUE"
      : selection.content === "new" ? item.queueType === "NEW" : item.queueType === "DUE"));
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
  if (scope.type === "weak") return requestReviewQueue(learnerId, "weak");
  if (scope.type === "saved") return requestReviewQueue(learnerId, scope.all ? "saved-all" : "saved");
  const response = await requestReviewQueue(learnerId);
  if (scope.type === "invalid") return { ...response, queue: [], dueCount: 0, newCount: 0 };

  const vocabularyIds = scopedVocabularyIds
    ? await scopedVocabularyIds
    : scope.type === "topic"
      ? (await requestTopicVocabulary(scope.id)).map((item) => item.id)
      : (await requestLearningSet(scope.id)).items.map((item) => item.vocabulary.id);
  return restrictQueueToVocabulary(response, vocabularyIds);
}
