import { parseStudySetIds, type LearningSourceScope, type ReviewQueueResponse } from "@vocabflow/contracts";
import { requestReviewQueue } from "./review-queue-client";

export type StudyScope = { type: "topic" | "learning-set"; id: number } | { type: "saved"; all: boolean } | { type: "weak" } | { type: "invalid" } | LearningSourceScope;
export type StudyContentMode = "new" | "review" | "mixed";
export type StudySelection = { amount: 5 | 10 | 20 | 30; content: StudyContentMode | "all" };

export function studyContentModeFromParams(searchParams: URLSearchParams): StudyContentMode | null {
  const values = searchParams.getAll("content");
  if (values.length !== 1 || !["new", "review", "mixed"].includes(values[0] ?? "")) return null;
  return values[0] as StudyContentMode;
}

export function studyScopeFromParams(searchParams: URLSearchParams): StudyScope | null {
  const scopeKeys = ["source", "setIds", "topicId", "learningSetId", "saved", "weak"];
  if (scopeKeys.some((key) => searchParams.getAll(key).length > 1)) return { type: "invalid" };
  const source = searchParams.get("source");
  if (source !== null || searchParams.has("setIds")) {
    if (["topicId", "learningSetId", "saved", "weak"].some((key) => searchParams.has(key)) || searchParams.get("content") === "all") return { type: "invalid" };
    if ((source === "pathway" || source === "all") && !searchParams.has("setIds")) return { type: source };
    const ids = parseStudySetIds(searchParams.get("setIds") ?? "");
    return source === "custom" && ids ? { type: "custom", ids } : { type: "invalid" };
  }
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

export function studyScopeParams(scope: StudyScope | null): URLSearchParams {
  const params = new URLSearchParams();
  if (scope?.type === "topic" || scope?.type === "learning-set") params.set(scope.type === "topic" ? "topicId" : "learningSetId", String(scope.id));
  if (scope?.type === "saved") { params.set("saved", "1"); if (scope.all) params.set("content", "all"); }
  if (scope?.type === "weak") params.set("weak", "1");
  if (scope?.type === "all" || scope?.type === "pathway" || scope?.type === "custom") {
    params.set("source", scope.type);
    if (scope.type === "custom") params.set("setIds", scope.ids.join(","));
  }
  return params;
}

export async function requestScopedReviewQueue(learnerId: string, scope: StudyScope | null): Promise<ReviewQueueResponse> {
  if (scope?.type === "invalid") throw new Error("INVALID_SCOPE");
  if (scope?.type === "weak") return requestReviewQueue(learnerId, "weak");
  if (scope?.type === "saved") return requestReviewQueue(learnerId, scope.all ? "saved-all" : "saved");
  return requestReviewQueue(learnerId, scope ?? undefined);
}
