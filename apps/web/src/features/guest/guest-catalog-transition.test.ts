import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { emptyGuestState, GUEST_ID, GUEST_STORAGE_KEY, readGuestState, reconcileGuestCatalog } from "./guest-store";
import { clearPublicLearningCache, requestPublicLearningIndex } from "./public-learning-client";
import { learningFetch } from "./learning-fetch";

const identity = "owner-editorial-1547-20261030-r0001";
const catalog = { catalogIdentity: identity, vocabulary: Array.from({ length: 1547 }, (_, i) => ({ id: i + 1 })), learningSets: [{ id: 99 }] };
const progress = { status: "LEARNING" as const, consecutiveCorrect: 1, intervalDays: 1, firstLearnedDate: "2026-10-30", lastReviewedDate: "2026-10-30", nextReviewDate: "2026-10-31", totalCorrect: 1, totalIncorrect: 0, revision: 1 };
let tail = Promise.resolve();
beforeEach(() => {
  localStorage.clear(); clearPublicLearningCache(); tail = Promise.resolve();
  vi.stubGlobal("navigator", { locks: { request: (_name: string, callback: () => unknown) => { const next = tail.then(callback); tail = next.then(() => undefined, () => undefined); return next; } } });
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
function seed() {
  const state = emptyGuestState(); state.progress = { 1: progress, 9000: progress };
  state.saved = { 1: "2026-10-30T00:00:00Z", 9000: "2026-10-30T00:00:00Z" }; state.assignments = { 99: true, 4: true };
  for (const [id, vocabularyId] of [[1, 1], [2, 9000]]) {
    const reviewId = `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`;
    state.receipts[reviewId] = { request: { reviewId, learnerId: GUEST_ID, vocabularyId, result: "REMEMBERED", expectedRevision: 0 }, response: { reviewId, learnerId: GUEST_ID, vocabularyId, result: "REMEMBERED", progress }, date: "2026-10-30", isNew: true };
  }
  state.settings.dailyNewWordLimit = 20;
  localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(state)); return state;
}
describe("owner-authorized guest catalog transition", () => {
  it("backs up the Production-origin state before its separately authorized replacement", async () => {
    const before = seed();
    const productionId = "owner-production-1547-20261030-r0001";
    await reconcileGuestCatalog({ ...catalog, catalogIdentity: productionId });
    expect(readGuestState().catalogIdentity).toBe(productionId);
    expect(Object.keys(readGuestState().progress)).toEqual(["1"]);
    expect(JSON.parse(localStorage.getItem(`${GUEST_STORAGE_KEY}.before.${productionId}`)!)).toEqual(before);
  });
  it("admits first-time and legacy guests to the additive Production catalog", async () => {
    const productionId = "owner-production-1547-20261030-r0001";
    const expanded = { ...catalog, catalogIdentity: productionId,
      vocabulary: Array.from({ length: 6544 }, (_, i) => ({ id: i + 1 })) };
    await reconcileGuestCatalog(expanded);
    expect(readGuestState().catalogIdentity).toBe(productionId);
    expect(readGuestState().progress).toEqual({});
    localStorage.clear();
    const before = seed();
    await reconcileGuestCatalog(expanded);
    expect(readGuestState().progress).toEqual({ 1: progress });
    expect(readGuestState().settings).toEqual(before.settings);
    expect(readGuestState().assignments).toEqual({ 99: true });
  });
  it("does not rewrite transitioned guest progress or assignments when Production grows", async () => {
    const productionId = "owner-production-1547-20261030-r0001";
    const before = seed(); before.catalogIdentity = productionId;
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(before));
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    await reconcileGuestCatalog({ ...catalog, catalogIdentity: productionId,
      vocabulary: Array.from({ length: 6544 }, (_, i) => ({ id: i + 1 })) });
    expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBe(raw);
  });
  it("retains the exact local pilot guard and rejects undersized Production transitions", async () => {
    const before = seed(); const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    await expect(reconcileGuestCatalog({ ...catalog, vocabulary: Array.from({ length: 6544 }, (_, i) => ({ id: i + 1 })) }))
      .rejects.toThrow("GUEST_CATALOG_INCOMPLETE");
    await expect(reconcileGuestCatalog({ ...catalog, catalogIdentity: "owner-production-1547-20261030-r0001", vocabulary: catalog.vocabulary.slice(1) }))
      .rejects.toThrow("GUEST_CATALOG_INCOMPLETE");
    expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBe(raw);
    expect(readGuestState().settings).toEqual(before.settings);
  });
  it("backs up before pruning retired words and preserves retained progress/settings", async () => {
    const before = seed(); await reconcileGuestCatalog(catalog); const after = readGuestState();
    expect(Object.keys(after.progress)).toEqual(["1"]); expect(Object.keys(after.saved)).toEqual(["1"]);
    expect(Object.keys(after.receipts)).toHaveLength(1); expect(after.assignments).toEqual({ 99: true });
    expect(after.settings).toEqual(before.settings); expect(after.catalogIdentity).toBe(identity);
    expect(JSON.parse(localStorage.getItem(`${GUEST_STORAGE_KEY}.before.${identity}`)!)).toEqual(before);
  });
  it("does not write again, including concurrent tabs after the lock", async () => {
    seed(); await Promise.all([reconcileGuestCatalog(catalog), reconcileGuestCatalog(catalog)]);
    expect(readGuestState().revision).toBe(1); const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    await reconcileGuestCatalog(catalog); expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBe(raw);
  });
  it("leaves the old catalog alone and rejects an incomplete replacement", async () => {
    seed(); const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    await reconcileGuestCatalog({ ...catalog, catalogIdentity: undefined }); expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBe(raw);
    await expect(reconcileGuestCatalog({ ...catalog, vocabulary: [{ id: 1 }] })).rejects.toThrow("GUEST_CATALOG_INCOMPLETE");
    expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBe(raw);
  });
  it("does not prune if the backup cannot be saved", async () => {
    seed(); const raw = localStorage.getItem(GUEST_STORAGE_KEY); const original = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, key, value) {
      if (key.includes(".before.")) throw new Error("quota"); original.call(this, key, value);
    });
    await expect(reconcileGuestCatalog(catalog)).rejects.toThrow("quota"); expect(localStorage.getItem(GUEST_STORAGE_KEY)).toBe(raw);
  });
  it("waits for a pending catalog transition before reading dashboard history", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-10-30T07:00:00Z"));
    seed();
    let complete!: (response: Response) => void;
    vi.stubGlobal("fetch", vi.fn(() => new Promise<Response>(resolve => { complete = resolve; })));
    const index = requestPublicLearningIndex();
    const history = learningFetch(`/api/learners/${GUEST_ID}/activity-summary`);
    complete(new Response(JSON.stringify({ catalogIdentity: identity, vocabulary: catalog.vocabulary.map(x => ({ ...x, level: null })), learningSets: [], topics: [] })));
    await index;
    const body = await (await history).json();
    expect(body.dailyGoal.newWords.completed).toBe(1);
    expect(Object.keys(readGuestState().receipts)).toHaveLength(1);
  });
});
