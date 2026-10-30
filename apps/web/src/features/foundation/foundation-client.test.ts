import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FoundationReviewRequest } from "@vocabflow/contracts";
import { FOUNDATION_GUEST_KEY, persistFoundationGuest, readFoundationGuest } from "./foundation-client";

function review(result: "REMEMBERED" | "FORGOTTEN" = "REMEMBERED", itemType: "LETTER_ACTIVITY" | "UTTERANCE" = "UTTERANCE", targetId = crypto.randomUUID()) {
  const state = readFoundationGuest();
  const request: FoundationReviewRequest = { guestId: state.guestId, reviewId: crypto.randomUUID(), attemptRef: crypto.randomUUID(), expectedRevision: 0, pins: { targetRevision: 1, presentationRevision: 1, pronunciationRevision: null }, answer: { kind: "SELF_RECALL", result } };
  return { request, grade: { reviewId: request.reviewId, targetId, itemType, result, date: "2026-10-30" } };
}
beforeEach(() => {
  vi.restoreAllMocks(); localStorage.clear();
  vi.stubGlobal("navigator", { locks: { request: async (_key: string, callback: () => unknown) => callback() } });
});
describe("separate durable foundation guest state", () => {
  it("preserves vocabulary state and isolates typed owners even if UUID matches", async () => {
    localStorage.setItem("vocabflow.guest.v1", "unchanged-vocabulary-state");
    const id = crypto.randomUUID(); const utterance = review("REMEMBERED", "UTTERANCE", id); const letter = review("FORGOTTEN", "LETTER_ACTIVITY", id);
    await persistFoundationGuest(utterance.request, utterance.grade); await persistFoundationGuest(letter.request, letter.grade);
    const state = readFoundationGuest();
    expect(state.progress[`UTTERANCE:${id}`].state.totalCorrect).toBe(1);
    expect(state.progress[`LETTER_ACTIVITY:${id}`].state.totalIncorrect).toBe(1);
    expect(localStorage.getItem("vocabflow.guest.v1")).toBe("unchanged-vocabulary-state");
  });
  it("replays exact reviewId once before stale checks and refuses changed payload", async () => {
    const { request, grade } = review(); const first = await persistFoundationGuest(request, grade);
    expect(await persistFoundationGuest(request, grade)).toEqual(first);
    expect(Object.keys(readFoundationGuest().receipts)).toHaveLength(1);
    await expect(persistFoundationGuest({ ...request, answer: { kind: "SELF_RECALL", result: "FORGOTTEN" } }, grade)).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
  });
  it("does not advance durable progress after quota failure; exact request can retry", async () => {
    const { request, grade } = review(); const old = localStorage.getItem(FOUNDATION_GUEST_KEY);
    vi.spyOn(Storage.prototype, "setItem").mockImplementationOnce(() => { throw new DOMException("full", "QuotaExceededError"); });
    await expect(persistFoundationGuest(request, grade)).rejects.toMatchObject({ code: "GUEST_STORAGE_UNAVAILABLE" });
    expect(localStorage.getItem(FOUNDATION_GUEST_KEY)).toBe(old);
    const saved = await persistFoundationGuest(request, grade); expect(saved.progress.revision).toBe(1);
  });
  it("rejects races with stale expectedRevision and never overwrites corrupt storage", async () => {
    const first = review(); await persistFoundationGuest(first.request, first.grade);
    const second = review("REMEMBERED", "UTTERANCE", first.grade.targetId);
    await expect(persistFoundationGuest(second.request, second.grade)).rejects.toMatchObject({ code: "STALE_REVISION" });
    localStorage.setItem(FOUNDATION_GUEST_KEY, "corrupt");
    expect(() => readFoundationGuest()).toThrow(); expect(localStorage.getItem(FOUNDATION_GUEST_KEY)).toBe("corrupt");
  });
  it("fails explicitly when cross-tab locking is unavailable", async () => {
    const { request, grade } = review(); vi.stubGlobal("navigator", {});
    await expect(persistFoundationGuest(request, grade)).rejects.toMatchObject({ code: "GUEST_LOCK_UNAVAILABLE" });
  });
});
