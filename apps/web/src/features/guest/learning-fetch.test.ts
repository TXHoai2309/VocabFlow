import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import * as contracts from "@vocabflow/contracts";
import { learningFetch, clearLearningCatalogCache, setGuestCatalogEnabled } from "./learning-fetch";
import { GUEST_ID, GUEST_STORAGE_KEY, readGuestState } from "./guest-store";

const word: contracts.VocabularyDto = { id: 1, word: "hello", vietnamese: "xin chào", ipa: null, definitionEn: null, exampleEn: null, imageUrl: null, audioUrl: null, topic: "Chào hỏi", level: null, enabled: true, contentVersion: 1 };
export const guestTestCatalog: contracts.PublicLearningCatalog = { vocabulary: [word, { ...word, id: 2, word: "bye" }],
  learningSets: [{ id: 1, slug: "starter", name: "Bắt đầu", description: "Từ cơ bản", grade: null, sortOrder: 0, enabled: true, vocabularyCount: 2, vocabularyIds: [1, 2] }],
  topics: [{ id: 1, slug: "greetings", name: "Chào hỏi", description: "Chào hỏi hằng ngày", enabled: true, sortOrder: 0, vocabularyIds: [1, 2] }] };
let network: ReturnType<typeof vi.fn>;
let lockTail = Promise.resolve();
beforeEach(() => {
  localStorage.clear(); clearLearningCatalogCache(); setGuestCatalogEnabled(true);
  network = vi.fn().mockImplementation(async (path: string) => {
    const url = new URL(path, "http://localhost");
    if (url.pathname === "/api/public/learning-index") return new Response(JSON.stringify({ ...guestTestCatalog, vocabulary: guestTestCatalog.vocabulary.map(({ id, level }) => ({ id, level })) }));
    if (url.pathname === "/api/public/vocabulary") return new Response(JSON.stringify({ vocabulary: guestTestCatalog.vocabulary.filter((word) => (url.searchParams.get("ids") ?? "").split(",").map(Number).includes(word.id)) }));
    if (url.pathname === "/api/public/vocabulary/browse") return new Response(JSON.stringify({ vocabulary: guestTestCatalog.vocabulary.map(({ definitionEn: _definition, exampleEn: _example, ...item }) => {
      return { ...item, status: "NEW", nextReviewDate: null };
    }), total: 2, page: 1, pageSize: 30, totalPages: 1, filters: { cefrOptions: [], topicOptions: ["Chào hỏi"] } }));
    return new Response(JSON.stringify(guestTestCatalog));
  });
  vi.stubGlobal("fetch", network);
  vi.stubGlobal("navigator", { locks: { request: (_name: string, callback: () => unknown) => {
    const next = lockTail.then(callback); lockTail = next.then(() => undefined, () => undefined); return next;
  } } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); setGuestCatalogEnabled(false); });
const path = (resource: string) => `/api/learners/${GUEST_ID}/${resource}`;
const get = async (resource: string) => (await learningFetch(path(resource))).json();
const review = (extra: Partial<contracts.ReviewRequest> = {}) => learningFetch("/api/reviews", { method: "POST", body: JSON.stringify({ reviewId: "00000000-0000-4000-8000-000000000001", learnerId: GUEST_ID, vocabularyId: 1, result: "REMEMBERED", expectedRevision: 0, ...extra }) });

describe("guest learning persistence and transport isolation", () => {
  it("persists a scheduled answer, restores after cache reload and deduplicates retries", async () => {
    const first = await review(); expect(first.ok).toBe(true);
    const answer = contracts.reviewResponseSchema.parse(await first.json());
    expect(answer.progress.intervalDays).toBe(1);
    clearLearningCatalogCache();
    expect(await (await review()).json()).toEqual(answer);
    expect(Object.keys(readGuestState().receipts)).toHaveLength(1);
    const restored = contracts.reviewQueueResponseSchema.parse(await get("review-queue?source=all"));
    expect(restored.queue.map((item) => item.vocabulary.id)).toEqual([2]);
    expect(network.mock.calls.every(([url]) => String(url).startsWith("/api/public/") && !String(url).includes("learning-catalog"))).toBe(true);
  });
  it("serializes competing tabs and rejects stale revisions", async () => {
    const responses = await Promise.all([review(), review({ reviewId: "00000000-0000-4000-8000-000000000002" })]);
    expect(responses.map((response) => response.status)).toEqual([200, 409]);
    expect(readGuestState().progress[1]?.revision).toBe(1);
  });
  it("replays an already confirmed local review without content or network", async () => {
    const first = await (await review()).json();
    clearLearningCatalogCache(); network.mockReset().mockRejectedValue(new Error("offline"));
    expect(await (await review()).json()).toEqual(first);
    expect(network).not.toHaveBeenCalled();
  });
  it("keeps an account review on the authenticated server transport", async () => {
    const accountId = "00000000-0000-4000-8000-000000000099";
    await review({ learnerId: accountId });
    expect(network).toHaveBeenCalledWith("/api/reviews", expect.objectContaining({ method: "POST" }));
    expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBeNull();
  });
  it("rejects conflicting idempotency keys and incorrect exercise assertions", async () => {
    await review();
    expect((await review({ result: "FORGOTTEN" })).status).toBe(409);
    expect((await review({ reviewId: "00000000-0000-4000-8000-000000000003", vocabularyId: 2, exerciseSubmission: { type: "TYPE_WORD", answer: "wrong" } })).status).toBe(400);
  });
  it("does not advance on quota failure, and keeps corrupt data for recovery", async () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("quota", "QuotaExceededError"); });
    expect((await review()).status).toBe(503); setItem.mockRestore();
    expect(Object.keys(readGuestState().progress)).toHaveLength(0);
    localStorage.setItem(GUEST_STORAGE_KEY, "corrupt");
    expect((await learningFetch(path("review-queue"))).status).toBe(503);
    expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBe("corrupt");
  });
  it("persists saved words and settings and enforces the daily new allowance", async () => {
    await learningFetch(path("saved-vocabulary/1"), { method: "PUT" });
    expect(contracts.learnerSavedVocabularyResponseSchema.parse(await get("saved-vocabulary")).savedVocabulary).toHaveLength(1);
    await learningFetch(path("settings"), { method: "PATCH", body: JSON.stringify({ dailyNewWordLimit: 0 }) });
    expect((await review()).status).toBe(409);
    expect(contracts.learnerSettingsResponseSchema.parse(await get("settings")).dailyNewWordLimit).toBe(0);
  });
  it("counts a same-day voluntary review separately from the first introduction", async () => {
    await review();
    await review({ reviewId: "00000000-0000-4000-8000-000000000002", expectedRevision: 1 });
    const result = contracts.activitySummaryResponseSchema.parse(await get("activity-summary"));
    expect(result.dailyGoal.newWords.completed).toBe(1);
    expect(result.dailyGoal.reviews.completed).toBe(1);
  });
  it("returns valid data for every guest screen, including after learning", async () => {
    await review();
    const resources = [
      ["vocabulary?id=1", contracts.learnerVocabularyListResponseSchema], ["vocabulary/browse", contracts.learnerVocabularyBrowseResponseSchema],
      ["progress-summary", contracts.progressSummaryResponseSchema], ["activity-summary", contracts.activitySummaryResponseSchema],
      ["progress-history", contracts.progressHistoryResponseSchema], ["topic-progress", contracts.topicProgressResponseSchema],
      ["continue-learning", contracts.continueLearningSummaryResponseSchema], ["learning-sets", contracts.learnerLearningSetListResponseSchema],
      ["gamification", contracts.gamificationResponseSchema], ["weak-words", contracts.weakWordsResponseSchema], ["search?q=hello", contracts.globalSearchResponseSchema]
    ] as const;
    for (const [resource, schema] of resources) expect(schema.safeParse(await get(resource)).success, resource).toBe(true);
  });
});
