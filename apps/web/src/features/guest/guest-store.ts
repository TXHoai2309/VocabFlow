import { z } from "zod";
import { learnerSettingsResponseSchema, reviewRequestSchema, reviewResponseSchema, type LearnerDto } from "@vocabflow/contracts";

export const GUEST_ID = "00000000-0000-4000-8000-000000000058";
export const GUEST_STORAGE_KEY = "vocabflow.guest.v1";
export const GUEST_STORAGE_EVENT = "vocabflow:guest-storage";
export const guestLearner: LearnerDto = {
  id: GUEST_ID, householdId: GUEST_ID, displayName: "Bạn", avatarKey: null,
  enabled: true, createdAt: "2026-10-19T00:00:00.000Z", updatedAt: "2026-10-19T00:00:00.000Z"
};
const receiptSchema = z.object({ request: reviewRequestSchema, response: reviewResponseSchema, date: z.string(), isNew: z.boolean() });
const stateSchema = z.object({
  version: z.literal(1), revision: z.number().int().nonnegative(),
  progress: z.record(z.string(), reviewResponseSchema.shape.progress),
  receipts: z.record(z.string(), receiptSchema), saved: z.record(z.string(), z.string().datetime()),
  assignments: z.record(z.string(), z.boolean()), settings: learnerSettingsResponseSchema
}).strict();
export type GuestState = z.infer<typeof stateSchema>;
export function emptyGuestState(): GuestState {
  return { version: 1, revision: 0, progress: {}, receipts: {}, saved: {}, assignments: {},
    settings: { learnerId: GUEST_ID, dailyNewWordLimit: 10, dailyNewWordGoal: 10, dailyReviewWordGoal: 20 } };
}
let storageError = false;
export function hasGuestStorageError() { return storageError; }
function setStorageError(value: boolean) {
  storageError = value;
  window.dispatchEvent(new Event(GUEST_STORAGE_EVENT));
}
export function readGuestState(): GuestState {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? stateSchema.parse(JSON.parse(raw)) : emptyGuestState();
  } catch {
    setStorageError(true);
    throw new Error("GUEST_STORAGE_UNAVAILABLE");
  }
}

// Web Locks serializes read-modify-write across tabs. Without it, refuse writes
// instead of silently overwriting another tab's progress.
export async function mutateGuestState<T>(update: (state: GuestState) => T): Promise<T> {
  if (!navigator.locks) { setStorageError(true); throw new Error("GUEST_LOCK_UNAVAILABLE"); }
  return navigator.locks.request(GUEST_STORAGE_KEY, () => {
    const state = readGuestState();
    const result = update(state);
    state.revision += 1;
    try {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(stateSchema.parse(state)));
      setStorageError(false);
    } catch {
      setStorageError(true);
      throw new Error("GUEST_STORAGE_UNAVAILABLE");
    }
    return result;
  });
}

export function guestToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
