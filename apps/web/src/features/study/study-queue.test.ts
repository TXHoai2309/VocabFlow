import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewQueueResponse } from "@vocabflow/contracts";
import { requestScopedReviewQueue, selectStudyQueue, studyContentModeFromParams, studyScopeFromParams, studySelectionFromParams, type StudyScope } from "./study-queue";

const learnerId = "00000000-0000-4000-8000-000000000010";

function queueResponse(): ReviewQueueResponse {
  return {
    learnerId,
    reviewDate: "2026-10-02",
    dueCount: 1,
    newCount: 1,
    queue: [
      { vocabulary: { id: 1, word: "apple", ipa: null, vietnamese: "quả táo", definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }, queueType: "DUE", status: "LEARNING", nextReviewDate: "2026-10-02", expectedRevision: 2 },
      { vocabulary: { id: 2, word: "book", ipa: null, vietnamese: "quyển sách", definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }, queueType: "NEW", status: "NEW", nextReviewDate: null, expectedRevision: 0 },
      { vocabulary: { id: 3, word: "cat", ipa: null, vietnamese: "mèo", definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }, queueType: "VOLUNTARY", status: "MASTERED", nextReviewDate: "2026-10-10", expectedRevision: 8 }
    ]
  };
}

describe("saved study scope", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("parses one explicit setup content mode for the shared study flow", () => {
    expect(studyContentModeFromParams(new URLSearchParams("content=review"))).toBe("review");
    expect(studyContentModeFromParams(new URLSearchParams("content=new"))).toBe("new");
    expect(studyContentModeFromParams(new URLSearchParams("content=mixed"))).toBe("mixed");
    expect(studyContentModeFromParams(new URLSearchParams("content=review&content=new"))).toBeNull();
    expect(studyContentModeFromParams(new URLSearchParams("content=all"))).toBeNull();
    expect(studyContentModeFromParams(new URLSearchParams())).toBeNull();
  });

  it("parses the saved scope and rejects conflicting or repeated scope parameters", () => {
    expect(studyScopeFromParams(new URLSearchParams("saved=1"))).toEqual({ type: "saved", all: false } satisfies StudyScope);
    expect(studyScopeFromParams(new URLSearchParams("saved=1&content=all"))).toEqual({ type: "saved", all: true });
    expect(studyScopeFromParams(new URLSearchParams("saved=1&topicId=7"))).toEqual({ type: "invalid" });
    expect(studyScopeFromParams(new URLSearchParams("saved=1&saved=1"))).toEqual({ type: "invalid" });
    expect(studyScopeFromParams(new URLSearchParams("saved=true"))).toEqual({ type: "invalid" });
    expect(studyScopeFromParams(new URLSearchParams("content=all"))).toEqual({ type: "invalid" });
    expect(studyScopeFromParams(new URLSearchParams("saved=1&content=all&content=all"))).toEqual({ type: "invalid" });
  });

  it("requests the learner-owned saved queue directly without client-side membership data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(queueResponse()), {
      headers: { "Content-Type": "application/json" }
    }));

    const queue = await requestScopedReviewQueue(learnerId, { type: "saved", all: false });

    expect(queue.queue.map((item) => item.vocabulary.word)).toEqual(["apple", "book", "cat"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerId}/review-queue?scope=saved`, { credentials: "include" });
  });

  it("requests the complete saved-all candidate set and applies the requested count without duplicates", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(queueResponse()), {
      headers: { "Content-Type": "application/json" }
    }));
    const scope = { type: "saved", all: true } as const;

    const response = await requestScopedReviewQueue(learnerId, scope);
    response.queue.push({ ...response.queue[0]! });
    const queue = selectStudyQueue(response, { amount: 10, content: "all" });

    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerId}/review-queue?scope=saved&content=all`, { credentials: "include" });
    expect(queue.queue.map((item) => item.vocabulary.word)).toEqual(["apple", "book", "cat"]);
    expect(new Set(queue.queue.map((item) => item.vocabulary.id)).size).toBe(3);
    expect(selectStudyQueue(response, { amount: 30, content: "all" }).queue).toHaveLength(3);
    expect(studySelectionFromParams(new URLSearchParams("count=10&content=all"), scope)).toEqual({ amount: 10, content: "all" });
    expect(studySelectionFromParams(new URLSearchParams("count=10&content=all"), { type: "saved", all: false })).toBeNull();
  });

  it("keeps New, Review, and Mixed semantics when a saved-all candidate set is available", () => {
    const response = queueResponse();
    expect(selectStudyQueue(response, { amount: 30, content: "new" }).queue.map((item) => item.queueType)).toEqual(["NEW"]);
    expect(selectStudyQueue(response, { amount: 30, content: "review" }).queue.map((item) => item.queueType)).toEqual(["DUE"]);
    expect(selectStudyQueue(response, { amount: 30, content: "mixed" }).queue.map((item) => item.queueType)).toEqual(["DUE", "NEW"]);
  });

  it("selects DUE first for Mixed and fills remaining slots with NEW", () => {
    const templates = queueResponse().queue;
    const dueTemplate = templates[0]!;
    const newTemplate = templates[1]!;
    const due = Array.from({ length: 12 }, (_, index) => ({
      ...dueTemplate,
      vocabulary: { ...dueTemplate.vocabulary, id: index + 100 }
    }));
    const newWords = Array.from({ length: 5 }, (_, index) => ({
      ...newTemplate,
      vocabulary: { ...newTemplate.vocabulary, id: index + 200 }
    }));
    const response: ReviewQueueResponse = {
      ...queueResponse(),
      dueCount: 36,
      newCount: 8,
      queue: [...due, ...newWords]
    };

    const tenWordMixed = selectStudyQueue(response, { amount: 10, content: "mixed" });
    expect(tenWordMixed.queue).toHaveLength(10);
    expect(tenWordMixed.queue.every((item) => item.queueType === "DUE")).toBe(true);
    expect(selectStudyQueue(response, { amount: 30, content: "mixed" }).queue.map((item) => item.queueType)).toEqual([
      ...Array.from({ length: 12 }, () => "DUE"),
      ...Array.from({ length: 5 }, () => "NEW")
    ]);
    expect(selectStudyQueue(response, { amount: 30, content: "review" }).queue.every((item) => item.queueType === "DUE")).toBe(true);
    expect(selectStudyQueue(response, { amount: 30, content: "new" }).queue.every((item) => item.queueType === "NEW")).toBe(true);
  });
});
