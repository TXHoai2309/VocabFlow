import { z } from "zod";
import { foundationAttemptResponseSchema, foundationCatalogSchema, foundationGradeResponseSchema, foundationProgressSchema, foundationQueueResponseSchema, foundationReviewRequestSchema, foundationReviewResponseSchema, foundationTeachingSchema, type FoundationAttempt, type FoundationQueueItem, type FoundationReviewRequest } from "@vocabflow/contracts";
import { scheduleReview, selectFoundationQueue } from "@vocabflow/learning-domain";
import { GUEST_ID } from "../guest/guest-store";

export const FOUNDATION_GUEST_KEY = "vocabflow.foundation-guest.v1";
const guestSchema = z.object({ version: z.literal(1), guestId: z.string().uuid(), progress: z.record(z.string().regex(/^(LETTER_ACTIVITY|UTTERANCE):[a-f0-9-]{36}$/), foundationProgressSchema), receipts: z.record(z.string().uuid(), z.object({ request: foundationReviewRequestSchema, response: foundationReviewResponseSchema }).strict()) }).strict();
type GuestState = z.infer<typeof guestSchema>;
export class FoundationClientError extends Error { constructor(readonly code: string, readonly status = 0) { super(code); } }
export function readFoundationGuest(): GuestState {
  try {
    const raw = localStorage.getItem(FOUNDATION_GUEST_KEY);
    if (raw !== null) return guestSchema.parse(JSON.parse(raw));
    const state: GuestState = { version: 1, guestId: crypto.randomUUID(), progress: {}, receipts: {} };
    localStorage.setItem(FOUNDATION_GUEST_KEY, JSON.stringify(state));
    return state;
  } catch { throw new FoundationClientError("GUEST_STORAGE_UNAVAILABLE"); }
}
const typedKey = (item: Pick<FoundationQueueItem, "targetId" | "itemType">) => `${item.itemType}:${item.targetId}`;
export async function persistFoundationGuest(rawRequest: FoundationReviewRequest, grade: z.infer<typeof foundationGradeResponseSchema>) {
  const request = foundationReviewRequestSchema.parse(rawRequest);
  if (!navigator.locks) throw new FoundationClientError("GUEST_LOCK_UNAVAILABLE");
  return navigator.locks.request(FOUNDATION_GUEST_KEY, async () => {
    const state = readFoundationGuest();
    if (state.guestId !== request.guestId) throw new FoundationClientError("GUEST_CHANGED", 409);
    const old = state.receipts[request.reviewId];
    if (old) { if (JSON.stringify(old.request) !== JSON.stringify(request)) throw new FoundationClientError("IDEMPOTENCY_CONFLICT", 409); return old.response; }
    const key = typedKey(grade); const current = state.progress[key];
    if ((current?.revision ?? 0) !== request.expectedRevision) throw new FoundationClientError("STALE_REVISION", 409);
    if (grade.reviewId !== request.reviewId) throw new FoundationClientError("INVALID_REVIEW_RESPONSE");
    const before = current?.state ?? { status: "NEW" as const, consecutiveCorrect: 0 as const, intervalDays: 0 as const, firstLearnedDate: null, lastReviewedDate: null, nextReviewDate: null, totalCorrect: 0 as const, totalIncorrect: 0 as const };
    const response = foundationReviewResponseSchema.parse({ ...grade, progress: { revision: request.expectedRevision + 1, state: scheduleReview({ currentState: before, result: grade.result, today: grade.date }) } });
    const next = guestSchema.parse({ ...state, progress: { ...state.progress, [key]: response.progress }, receipts: { ...state.receipts, [request.reviewId]: { request, response } } });
    try { localStorage.setItem(FOUNDATION_GUEST_KEY, JSON.stringify(next)); } catch { throw new FoundationClientError("GUEST_STORAGE_UNAVAILABLE"); }
    return response;
  });
}

export async function foundationFetch<T>(schema: z.ZodType<T>, url: string, body?: unknown): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...(body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {}) });
  const result: unknown = await response.json();
  if (!response.ok) {
    const error = z.object({ error: z.object({ code: z.string() }) }).safeParse(result);
    throw new FoundationClientError(error.success ? error.data.error.code : "FOUNDATION_UNAVAILABLE", response.status);
  }
  return schema.parse(result);
}
export const foundationCatalog = () => foundationFetch(foundationCatalogSchema, "/api/public/foundation/catalog");
const prefix = (learnerId: string) => learnerId === GUEST_ID ? "/api/public/foundation" : `/api/learners/${learnerId}/foundation`;
const guestIdentity = (learnerId: string) => learnerId === GUEST_ID ? { guestId: readFoundationGuest().guestId } : {};
export async function foundationQueue(learnerId: string, collection: string, capacity: number, mode: "new" | "review" | "mixed") {
  const guest = learnerId === GUEST_ID;
  const query = new URLSearchParams({ collection, capacity: guest ? "30" : String(capacity), mode: guest ? "mixed" : mode });
  const result = await foundationFetch(foundationQueueResponseSchema, `${prefix(learnerId)}/queue?${query}`);
  if (!guest) return result;
  const state = readFoundationGuest();
  const candidates = result.items.map((item, order) => { const p = state.progress[typedKey(item)] ?? item.progress; return { ...item, progress: p, id: item.targetId, order, status: p.state.status, nextReviewDate: p.state.nextReviewDate }; });
  return { ...result, items: selectFoundationQueue(candidates, result.date, capacity, mode) };
}
export function foundationAttempt(learnerId: string, item: FoundationQueueItem) {
  return foundationFetch(foundationAttemptResponseSchema, `${prefix(learnerId)}/attempts`, { ...guestIdentity(learnerId), targetId: item.targetId, pins: item.pins, expectedRevision: item.progress.revision, mode: item.itemType === "LETTER_ACTIVITY" && !item.listeningReady ? "PRACTICE" : "ASSESS" });
}
export function foundationReveal(learnerId: string, attempt: FoundationAttempt) {
  return foundationFetch(foundationTeachingSchema, `${prefix(learnerId)}/reveal`, { ...guestIdentity(learnerId), attemptRef: attempt.attemptRef });
}
export function foundationReviewRequest(learnerId: string, attempt: FoundationAttempt, answer: FoundationReviewRequest["answer"]): FoundationReviewRequest {
  return foundationReviewRequestSchema.parse({ ...guestIdentity(learnerId), reviewId: crypto.randomUUID(), attemptRef: attempt.attemptRef, expectedRevision: attempt.expectedRevision, pins: attempt.pins, answer });
}
export async function foundationReview(learnerId: string, request: FoundationReviewRequest) {
  if (learnerId !== GUEST_ID) return foundationFetch(foundationReviewResponseSchema, `${prefix(learnerId)}/reviews`, request);
  const grade = await foundationFetch(foundationGradeResponseSchema, `${prefix(learnerId)}/reviews`, request);
  return persistFoundationGuest(request, grade);
}
