import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewQueueResponse } from "@vocabflow/contracts";
import { requestScopedReviewQueue, selectStudyQueue, studyContentModeFromParams, studyScopeFromParams, studyScopeParams, studySelectionFromParams, type StudyScope } from "./study-queue";

describe("catalog intersection scope", () => {
  it("round trips a topic, school grade and CEFR through setup and study", () => {
    const input = new URLSearchParams("topicId=7&level=GRADE_1&cefr=A1&count=10&content=mixed");
    const scope = studyScopeFromParams(input);
    expect(scope).toEqual({ type: "topic", id: 7, level: "GRADE_1", cefr: "A1" });
    expect(studyScopeFromParams(studyScopeParams(scope))).toEqual(scope);
  });
  it.each(["level=GRADE_9", "cefr=INVALID", "level=GRADE_1&level=GRADE_2", "saved=1&level=GRADE_1"])("fails closed for %s", (query) => {
    expect(studyScopeFromParams(new URLSearchParams(query))).toEqual({ type: "invalid" });
  });
  it("uses a broad source with explicit filters when no collection was selected", () => {
    expect(studyScopeFromParams(new URLSearchParams("level=GRADE_2"))).toEqual({ type: "all", level: "GRADE_2" });
  });
});

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

  it.each<StudyScope>([{ type: "pathway" }, { type: "all" }, { type: "custom", ids: [1, 2] }, { type: "topic", id: 7 }, { type: "learning-set", id: 4 }])("round trips $type through start/continue URLs and sends only server scope", async (scope) => {
    expect(studyScopeFromParams(studyScopeParams(scope))).toEqual(scope);
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(queueResponse())));
    await requestScopedReviewQueue(learnerId, scope);
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`/api/learners/${learnerId}/review-queue?${studyScopeParams(scope)}`, { credentials: "include" });
  });

  it.each(["source=custom&setIds=1,1", "source=custom&setIds=0", "source=all&source=pathway", "source=pathway&topicId=1", "source=custom&setIds=1&setIds=2", "learningSetId=1&learningSetId=2"])("rejects ambiguous scope %s", (query) => {
    expect(studyScopeFromParams(new URLSearchParams(query))).toEqual({ type: "invalid" });
  });

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

  it("balances Mixed while retaining DUE-first presentation and shortage fallback", () => {
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
    expect(tenWordMixed.dueCount).toBe(5);
    expect(tenWordMixed.newCount).toBe(5);
    expect(selectStudyQueue(response, { amount: 30, content: "mixed" }).queue.map((item) => item.queueType)).toEqual([
      ...Array.from({ length: 12 }, () => "DUE"),
      ...Array.from({ length: 5 }, () => "NEW")
    ]);
    expect(selectStudyQueue(response, { amount: 30, content: "review" }).queue.every((item) => item.queueType === "DUE")).toBe(true);
    expect(selectStudyQueue(response, { amount: 30, content: "new" }).queue.every((item) => item.queueType === "NEW")).toBe(true);
  });
  it.each([
    [5, 10, 10, 3, 2], [10, 45, 147, 5, 5], [20, 30, 30, 10, 10], [30, 30, 30, 15, 15],
    [10, 1, 50, 1, 9], [10, 50, 2, 8, 2], [10, 0, 20, 0, 10], [10, 20, 0, 10, 0],
    [10, 2, 3, 2, 3], [10, 20, 4, 6, 4], [10, 2, 4, 2, 4]
  ] as const)("Mixed %i with %i Due / %i eligible New produces %i/%i", (amount, dueAvailable, newAvailable, dueExpected, newExpected) => {
    const templates = queueResponse().queue;
    const due = Array.from({ length: dueAvailable }, (_, i) => ({ ...templates[0]!, vocabulary: { ...templates[0]!.vocabulary, id: i + 1 } }));
    const newWords = Array.from({ length: newAvailable }, (_, i) => ({ ...templates[1]!, vocabulary: { ...templates[1]!.vocabulary, id: i + 1000 } }));
    const response = { ...queueResponse(), queue: [...due, ...newWords, ...due, ...newWords] };
    const result = selectStudyQueue(response, { amount, content: "mixed" });
    expect(result.dueCount).toBe(dueExpected); expect(result.newCount).toBe(newExpected);
    expect(result.queue.map((item) => item.vocabulary.id)).toEqual([...due.slice(0, dueExpected), ...newWords.slice(0, newExpected)].map((item) => item.vocabulary.id));
    expect(selectStudyQueue({ ...response, queue: [...newWords, ...due] }, { amount, content: "mixed" })).toEqual(result);
  });
  it.each<StudyScope>([{ type: "pathway" }, { type: "all" }, { type: "custom", ids: [1, 2] }, { type: "topic", id: 7 }, { type: "learning-set", id: 4 }, { type: "saved", all: false }])("requests bounded capacity for $type", async (scope) => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(queueResponse())));
    await requestScopedReviewQueue(learnerId, scope, 30);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("capacity=30");
  });
});
