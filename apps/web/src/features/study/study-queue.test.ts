import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestScopedReviewQueue, studyScopeFromParams, type StudyScope } from "./study-queue";

const learnerId = "00000000-0000-4000-8000-000000000010";

function queueResponse() {
  return {
    learnerId,
    reviewDate: "2026-10-02",
    dueCount: 1,
    newCount: 1,
    queue: [
      { vocabulary: { id: 1, word: "apple", ipa: null, vietnamese: "quả táo", definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }, queueType: "DUE", status: "LEARNING", nextReviewDate: "2026-10-02", expectedRevision: 2 },
      { vocabulary: { id: 2, word: "book", ipa: null, vietnamese: "quyển sách", definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 }, queueType: "NEW", status: "NEW", nextReviewDate: null, expectedRevision: 0 }
    ]
  };
}

describe("saved study scope", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("parses the saved scope and rejects conflicting or repeated scope parameters", () => {
    expect(studyScopeFromParams(new URLSearchParams("saved=1"))).toEqual({ type: "saved" } satisfies StudyScope);
    expect(studyScopeFromParams(new URLSearchParams("saved=1&topicId=7"))).toEqual({ type: "invalid" });
    expect(studyScopeFromParams(new URLSearchParams("saved=1&saved=1"))).toEqual({ type: "invalid" });
    expect(studyScopeFromParams(new URLSearchParams("saved=true"))).toEqual({ type: "invalid" });
  });

  it("requests the learner-owned saved queue directly without client-side membership data", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(queueResponse()), {
      headers: { "Content-Type": "application/json" }
    }));

    const queue = await requestScopedReviewQueue(learnerId, { type: "saved" });

    expect(queue.queue.map((item) => item.vocabulary.word)).toEqual(["apple", "book"]);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalledWith(`/api/learners/${learnerId}/review-queue?scope=saved`, { credentials: "include" });
  });
});
