import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publicLearningIndexSchema, reviewQueueResponseSchema, type PublicLearningIndex, type VocabularyDto } from "@vocabflow/contracts";
import { GUEST_ID, GUEST_STORAGE_KEY, emptyGuestState, guestToday } from "./guest-store";
import { learningFetch, clearLearningCatalogCache, setGuestCatalogEnabled } from "./learning-fetch";

const ids = Array.from({ length: 7311 }, (_, offset) => offset + 1);
const index: PublicLearningIndex = {
  vocabulary: ids.map((id) => ({ id, level: null })),
  learningSets: [{ id: 1, slug: "classified", name: "Đã phân cấp", description: "Từ đã có bộ", grade: null, enabled: true, sortOrder: 0, vocabularyCount: 6717, vocabularyIds: ids.slice(0, 6717) }],
  topics: [{ id: 1, slug: "sample", name: "Chủ đề", description: "Chủ đề mẫu", enabled: true, sortOrder: 0, vocabularyIds: [1, 6718] }]
};
const word = (id: number): VocabularyDto => ({ id, word: `word-${id}`, vietnamese: `nghĩa-${id}`, ipa: null, definitionEn: null, exampleEn: null, audioUrl: null, imageUrl: null, topic: null, level: null, enabled: true, contentVersion: 1 });
type PublicFetch = (path: string) => Promise<Response>;
let network: ReturnType<typeof vi.fn<PublicFetch>>;
beforeEach(() => {
  localStorage.clear(); clearLearningCatalogCache(); setGuestCatalogEnabled(true);
  network = vi.fn(async (path: string) => {
    const url = new URL(path, "http://localhost");
    if (url.pathname === "/api/public/learning-index") return new Response(JSON.stringify(index));
    if (url.pathname === "/api/public/vocabulary") {
      const requested = (url.searchParams.get("ids") ?? "").split(",").map(Number);
      return new Response(JSON.stringify({ vocabulary: requested.map(word) }));
    }
    throw new Error(`Unexpected catalog request: ${url.pathname}`);
  });
  vi.stubGlobal("fetch", network);
  vi.stubGlobal("navigator", { locks: { request: (_key: string, action: () => unknown) => Promise.resolve().then(action) } });
});
afterEach(() => { setGuestCatalogEnabled(false); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const path = (resource: string) => `/api/learners/${GUEST_ID}/${resource}`;
const getQueue = async (query = "source=all&capacity=30") => reviewQueueResponseSchema.parse(await (await learningFetch(path(`review-queue?${query}`))).json());
function learnedTen(date = guestToday()) {
  const state = emptyGuestState(); state.settings = { ...state.settings, dailyNewWordGoal: 100, dailyNewWordLimit: 100 };
  for (const id of ids.slice(0, 10)) {
    const progress = { status: "LEARNING" as const, consecutiveCorrect: 1, intervalDays: 1, firstLearnedDate: date, lastReviewedDate: date, nextReviewDate: "2099-12-31", totalCorrect: 1, totalIncorrect: 0, revision: 1 };
    const reviewId = `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
    state.progress[id] = progress;
    state.receipts[reviewId] = {
      request: { reviewId, learnerId: GUEST_ID, vocabularyId: id, expectedRevision: 0, result: "REMEMBERED" },
      response: { reviewId, learnerId: GUEST_ID, vocabularyId: id, result: "REMEMBERED", progress }, date, isNew: true
    };
  }
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
  return state;
}
describe("guest scale, local availability and uncapped New counts", () => {
  it("selects missing and blank CEFR only, intersecting the same grade and topic scope", async () => {
    const fixture = { ...index, vocabulary: [
      { id: 1, level: "GRADE_1", cefr: "A1" },
      { id: 6718, level: "GRADE_1" },
      { id: 7000, level: "GRADE_1", cefr: " " },
      { id: 7001, level: "GRADE_2", cefr: "C1" }
    ] };
    const original = network.getMockImplementation()!;
    network.mockImplementation((url: string) => url === "/api/public/learning-index"
      ? Promise.resolve(new Response(JSON.stringify(fixture))) : original(url));
    const broad = await getQueue("source=all&cefr=UNCLASSIFIED&capacity=5");
    expect(broad.queue.map((item) => item.vocabulary.id)).toEqual([6718, 7000]);
    expect(broad.newCount).toBe(2);
    const scoped = await getQueue("topicId=1&level=GRADE_1&cefr=UNCLASSIFIED&capacity=5");
    expect(scoped.queue.map((item) => item.vocabulary.id)).toEqual([6718]);
    const empty = await getQueue("topicId=1&level=GRADE_2&cefr=UNCLASSIFIED&capacity=5");
    expect(empty.queue).toEqual([]);
    expect(empty.newCount).toBe(0);
  });
  it("intersects a topic with school grade and CEFR without falling back to broad content", async () => {
    const fixture = { ...index, vocabulary: [
      { id: 1, level: "GRADE_1", cefr: "A1" },
      { id: 6718, level: "GRADE_2", cefr: "A1" },
      { id: 7000, level: "GRADE_1", cefr: "A1" }
    ] };
    const original = network.getMockImplementation()!;
    network.mockImplementation((url: string) => url === "/api/public/learning-index"
      ? Promise.resolve(new Response(JSON.stringify(fixture))) : original(url));
    const result = await getQueue("topicId=1&level=GRADE_1&cefr=A1&capacity=5");
    expect(result.queue.map((item) => item.vocabulary.id)).toEqual([1]);
    expect(result.newCount).toBe(1);
    const empty = await getQueue("topicId=1&level=GRADE_1&cefr=B2&capacity=5");
    expect(empty.queue).toEqual([]); expect(empty.newCount).toBe(0);
  });
  it("marks bookmarks from local state without requesting saved word content", async () => {
    const state = emptyGuestState(); state.saved[5000] = new Date().toISOString();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    network.mockImplementationOnce(async () => new Response(JSON.stringify({
      vocabulary: [{ ...word(5000), definitionEn: undefined, exampleEn: undefined, status: "NEW", nextReviewDate: null }],
      total: 1, page: 1, pageSize: 30, totalPages: 1, filters: { cefrOptions: [], topicOptions: [] }
    })));
    const result = await (await learningFetch(path("vocabulary/browse"))).json();
    expect(result.vocabulary[0].isSaved).toBe(true);
    expect(network).toHaveBeenCalledOnce();
  });
  it.each(["", "source=pathway", "source=all"])("includes all 594 unassigned words for the broad source %s", async (query) => {
    const state = learnedTen();
    state.assignments[1] = false;
    for (const id of ids.slice(10, 6717)) state.progress[id] = state.progress[1]!;
    state.progress[7311] = { ...state.progress[1]!, nextReviewDate: guestToday() };
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    const result = await getQueue(query);
    expect(result.newCount).toBe(593);
    expect(result.dueCount).toBe(1);
    expect(result.queue[0]?.vocabulary.id).toBe(7311);
    expect(result.queue.find((item) => item.queueType === "NEW")?.vocabulary.id).toBe(6718);
    expect(result.dailyNewRemaining).toBe(90);
  });
  it.each([["learningSetId=1", 6707], ["source=custom&setIds=1", 6707], ["topicId=1", 1]] as const)("preserves explicit collection scope %s", async (query, expected) => {
    learnedTen();
    const result = await getQueue(query);
    expect(result.newCount).toBe(expected);
    expect(result.queue.every((item) => query.startsWith("topicId") ? item.vocabulary.id === 6718 : item.vocabulary.id <= 6717)).toBe(true);
  });
  it("keeps count/index payload bounded with 7,311 words", () => {
    expect(publicLearningIndexSchema.safeParse(index).success).toBe(true);
    expect(new TextEncoder().encode(JSON.stringify(index)).byteLength).toBeLessThan(300_000);
    expect(JSON.stringify(index)).not.toMatch(/vietnamese|definitionEn|audioUrl|examples/);
  });
  it("shows 7,301 unseen words, keeps 90 daily allowance, and loads only 30 candidates", async () => {
    learnedTen();
    const result = await getQueue();
    expect(result.newCount).toBe(7301);
    expect(result.dailyNewRemaining).toBe(90);
    expect(result.queue).toHaveLength(30);
    expect(result.queue[0]?.vocabulary.id).toBe(11);
    const calls = network.mock.calls.map(([url]) => new URL(String(url), "http://localhost"));
    expect(calls.some((url) => url.pathname.includes("learning-catalog"))).toBe(false);
    const detail = calls.filter((url) => url.pathname === "/api/public/vocabulary");
    expect(detail).toHaveLength(1);
    expect(detail[0]!.searchParams.get("ids")!.split(",")).toHaveLength(30);
  });
  it("does not hide unseen words when the daily allowance is exhausted", async () => {
    const state = learnedTen(); state.settings.dailyNewWordLimit = 10;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    const result = await getQueue();
    expect(result.newCount).toBe(7301); expect(result.dailyNewRemaining).toBe(0); expect(result.queue).toHaveLength(0);
    expect(network.mock.calls).toHaveLength(1);
  });
  it("resets today's usage without subtracting words learned on earlier dates", async () => {
    learnedTen("2026-01-01");
    const result = await getQueue();
    expect(result.newCount).toBe(7301); expect(result.dailyNewRemaining).toBe(100);
  });
  it("selects unseen IDs rather than skipping an offset equal to learned count", async () => {
    const state = learnedTen();
    state.progress[5000] = state.progress[10]!; delete state.progress[10];
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    const result = await getQueue();
    expect(result.newCount).toBe(7301);
    expect(result.queue[0]?.vocabulary.id).toBe(10);
    expect(result.queue.some((item) => item.vocabulary.id === 5000)).toBe(false);
  });
  it("can load and save Settings, history and activity with no network", async () => {
    network.mockRejectedValue(new Error("offline"));
    for (const resource of ["settings", "activity-summary", "progress-history", "gamification"]) expect((await learningFetch(path(resource))).status, resource).toBe(200);
    expect((await learningFetch(path("settings"), { method: "PATCH", body: JSON.stringify({ dailyNewWordLimit: 100 }) })).status).toBe(200);
    expect((await learningFetch(path("reset-progress"), { method: "POST" })).status).toBe(200);
    expect(network).not.toHaveBeenCalled();
  });
  it("removes a saved word locally while offline", async () => {
    const state = emptyGuestState(); state.saved[5000] = new Date().toISOString();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state)); network.mockRejectedValue(new Error("offline"));
    expect((await learningFetch(path("saved-vocabulary/5000"), { method: "DELETE" })).status).toBe(200);
    expect(network).not.toHaveBeenCalled();
  });
  it("loads detail and saved words by exact IDs, without loading the scheduling index", async () => {
    const state = emptyGuestState(); state.saved[5000] = new Date().toISOString();
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    expect((await learningFetch(path("vocabulary?id=5000"))).status).toBe(200);
    expect((await learningFetch(path("saved-vocabulary"))).status).toBe(200);
    expect(network.mock.calls).toHaveLength(1);
    expect(network.mock.calls[0]?.[0]).toBe("/api/public/vocabulary?ids=5000");
  });
  it("paginates browse without requesting the full index or catalog", async () => {
    network.mockImplementationOnce(async () => new Response(JSON.stringify({
      vocabulary: [], total: 7311, page: 2, pageSize: 30, totalPages: 244, filters: { cefrOptions: [], topicOptions: [] }
    })));
    const response = await learningFetch(path("vocabulary/browse?page=2&pageSize=30"));
    expect(response.status).toBe(200);
    expect(network).toHaveBeenCalledWith("/api/public/vocabulary/browse?page=2&pageSize=30", expect.any(Object));
    expect(network).toHaveBeenCalledOnce();
  });
  it("finds a local attention word beyond the first global search page", async () => {
    const state = learnedTen(); state.progress[5000] = state.progress[1]!;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state));
    const original = network.getMockImplementation()!;
    network.mockImplementation((url: string) => url.startsWith("/api/public/vocabulary/matches?")
      ? Promise.resolve(new Response(JSON.stringify({ ids: [5000] }))) : original(url));
    const response = await learningFetch(path("weak-words?status=learning&q=rare"));
    const result = await response.json() as { items: { vocabulary: { id: number } }[] };
    expect(result.items.map((item) => item.vocabulary.id)).toEqual([5000]);
  });
});
