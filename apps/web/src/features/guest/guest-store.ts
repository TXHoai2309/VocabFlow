import { z } from "zod";
import { FLASHCARD_DISPLAY_MODE, learnerSettingsResponseSchema, reviewRequestSchema, reviewResponseSchema, type LearnerDto } from "@vocabflow/contracts";

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
  catalogIdentity: z.string().optional(),
  progress: z.record(z.string(), reviewResponseSchema.shape.progress),
  receipts: z.record(z.string(), receiptSchema), saved: z.record(z.string(), z.string().datetime()),
  assignments: z.record(z.string(), z.boolean()), settings: learnerSettingsResponseSchema
}).strict();
export type GuestState = z.infer<typeof stateSchema>;
export function emptyGuestState(): GuestState {
  return { version: 1, revision: 0, progress: {}, receipts: {}, saved: {}, assignments: {},
    settings: {
      learnerId: GUEST_ID,
      dailyNewWordLimit: 10,
      dailyNewWordGoal: 10,
      dailyReviewWordGoal: 20,
      flashcardDisplayMode: FLASHCARD_DISPLAY_MODE.SELF_RECALL
    } };
}
let storageError = false;
let cachedRaw: string | null = null;
let cachedState: GuestState | undefined;
const SKIP_GUEST_WRITE = Symbol("skip-guest-write");
export function hasGuestStorageError() { return storageError; }
function setStorageError(value: boolean) {
  storageError = value;
  window.dispatchEvent(new Event(GUEST_STORAGE_EVENT));
}
export function readGuestState(): GuestState {
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    if (!raw) { cachedRaw = null; cachedState = undefined; return emptyGuestState(); }
    if (raw === cachedRaw && cachedState) return cachedState;
    const state = stateSchema.parse(JSON.parse(raw));
    cachedRaw = raw; cachedState = state;
    return state;
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
    // The cached read snapshot remains unchanged if persistence fails.
    const state = structuredClone(readGuestState());
    const result = update(state);
    if (result === SKIP_GUEST_WRITE) return result;
    state.revision += 1;
    try {
      const validated = stateSchema.parse(state);
      const raw = JSON.stringify(validated);
      localStorage.setItem(GUEST_STORAGE_KEY, raw);
      cachedRaw = raw; cachedState = validated;
      setStorageError(false);
    } catch {
      setStorageError(true);
      throw new Error("GUEST_STORAGE_UNAVAILABLE");
    }
    return result;
  });
}

/** Owner explicitly retires a previous vocabulary catalog. Back up first. */
export async function reconcileGuestCatalog(catalog: { catalogIdentity?: string; vocabulary: { id: number }[]; learningSets: { id: number }[] }) {
  const identity = catalog.catalogIdentity;
  if (!identity || !["owner-editorial-1547-20261030-r0001", "owner-production-1547-20261030-r0001"].includes(identity)
    || readGuestState().catalogIdentity === identity) return;
  const allowed = new Set(catalog.vocabulary.map(x => x.id));
  const sets = new Set(catalog.learningSets.map(x => x.id));
  if (allowed.size !== 1547) throw new Error("GUEST_CATALOG_INCOMPLETE");
  await mutateGuestState(state => {
    if (state.catalogIdentity === identity) return SKIP_GUEST_WRITE;
    const backup = `${GUEST_STORAGE_KEY}.before.${identity}`;
    if (!localStorage.getItem(backup)) localStorage.setItem(backup, JSON.stringify(state));
    state.progress = Object.fromEntries(Object.entries(state.progress).filter(([id]) => allowed.has(Number(id))));
    state.saved = Object.fromEntries(Object.entries(state.saved).filter(([id]) => allowed.has(Number(id))));
    state.receipts = Object.fromEntries(Object.entries(state.receipts).filter(([, receipt]) => allowed.has(receipt.request.vocabularyId)));
    state.assignments = Object.fromEntries(Object.entries(state.assignments).filter(([id]) => sets.has(Number(id))));
    state.catalogIdentity = identity;
  });
}

export function guestToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
