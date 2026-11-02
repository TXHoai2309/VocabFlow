import { z } from "zod";
import { matchesCefrFilter, practiceActionSchema, practiceConfigSchema, practiceStoredStateSchema, type PracticeAction, type PracticeConfig, type LearnerVocabularyDto, type PracticeSource } from "@vocabflow/contracts";
import { applyPracticeAction, createPracticeState, createPracticeRetryState, practiceConfigFingerprint, practiceContentIsCurrent, practiceQuestionPinsAreCurrent, practiceHistoryPage, practiceResults, selectPracticeRetryQuestions, presentPractice, PracticeRuleError, type PracticeState } from "@vocabflow/learning-domain";
import { GUEST_ID, readGuestState } from "../guest/guest-store";
import { requestFreshPublicWords, requestPracticePublicIndex } from "../guest/public-learning-client";
import { PracticeClientError } from "./practice-errors";

export const GUEST_PRACTICE_KEY = "vocabflow.practice.guest.v1";
const storeSchema = z.object({ version: z.literal(1), sessions: z.record(z.uuid(), z.object({ createdAt: z.iso.datetime(), state: practiceStoredStateSchema }).strict()) }).strict();
export type GuestPracticeStore = z.infer<typeof storeSchema>;
export function readGuestPracticeStore(): GuestPracticeStore {
  let raw: string | null;
  try { raw = localStorage.getItem(GUEST_PRACTICE_KEY); } catch { throw new PracticeClientError("STORAGE_UNAVAILABLE"); }
  if (!raw) return { version: 1, sessions: {} };
  try {
    const store = storeSchema.parse(JSON.parse(raw));
    if (Object.entries(store.sessions).some(([id, value]) => value.state.sessionId !== id || value.state.learnerId !== GUEST_ID)) throw new Error("GUEST_SESSION_CONTEXT_INVALID");
    return store;
  } catch { throw new PracticeClientError("GUEST_PRACTICE_CORRUPT"); }
}
function write(store: GuestPracticeStore) {
  try { localStorage.setItem(GUEST_PRACTICE_KEY, JSON.stringify(storeSchema.parse(store))); }
  catch { throw new PracticeClientError("STORAGE_UNAVAILABLE"); }
}
async function locked<T>(task: () => Promise<T>) {
  if (!navigator.locks) throw new PracticeClientError("GUEST_LOCK_UNAVAILABLE");
  return navigator.locks.request(GUEST_PRACTICE_KEY, task);
}
export async function readGuestPracticeSource(source: PracticeSource): Promise<LearnerVocabularyDto[]> {
  const guest = readGuestState();
  if (source.kind === "learned" && !Object.keys(guest.progress).length) return [];
  if (source.kind === "saved" && !Object.keys(guest.saved).length) return [];
  const index = await requestPracticePublicIndex();
  const set = source.kind === "set" ? index.learningSets.find(set => set.id === source.setId && set.enabled) : undefined;
  if (source.kind === "set" && !set) throw new PracticeClientError("INVALID_REQUEST");
  const members = set ? new Set(set.vocabularyIds) : undefined;
  const ids = index.vocabulary.filter(word => matchesCefrFilter(word.cefr, source.cefr, word.tags)
    && (source.kind !== "learned" || Boolean(guest.progress[word.id]))
    && (source.kind !== "saved" || Boolean(guest.saved[word.id])) && (!members || members.has(word.id))).map(word => word.id);
  return (await requestFreshPublicWords(ids)).filter(word => word.enabled).map(word => ({ ...word, status: guest.progress[word.id]?.status ?? "NEW", nextReviewDate: guest.progress[word.id]?.nextReviewDate ?? null }));
}
async function requireCurrent(state: PracticeState) {
  const ids = state.questions.slice(state.results.length).map(q => q.vocabularyId);
  if (ids.length && !practiceContentIsCurrent(state, (await requestFreshPublicWords(ids)).filter(word => word.enabled))) throw new PracticeClientError("STALE_PRACTICE_CONTENT");
}
export async function createGuestPractice(sessionId: string, config: PracticeConfig) {
  const parsedConfig = practiceConfigSchema.parse(config);
  if (!z.uuid().safeParse(sessionId).success) throw new PracticeClientError("INVALID_REQUEST");
  return locked(async () => {
    const store = readGuestPracticeStore();
    const existing = store.sessions[sessionId];
    if (existing) {
      if (practiceConfigFingerprint(existing.state.config) !== practiceConfigFingerprint(parsedConfig)) throw new PracticeClientError("IDEMPOTENCY_CONFLICT");
      await requireCurrent(existing.state);
      return presentPractice(existing.state);
    }
    const state = createPracticeState(sessionId, GUEST_ID, await readGuestPracticeSource(parsedConfig.source), () => crypto.randomUUID(), Math.random, parsedConfig);
    if (state.questions.length) { store.sessions[sessionId] = { state, createdAt: new Date().toISOString() }; write(store); }
    return presentPractice(state);
  });
}
export async function readGuestPractice(sessionId: string) {
  const state = readGuestPracticeStore().sessions[sessionId]?.state;
  if (!state) throw new PracticeClientError("PRACTICE_NOT_FOUND");
  await requireCurrent(state); return presentPractice(state);
}
export async function actGuestPractice(sessionId: string, action: PracticeAction) {
  const parsed = practiceActionSchema.parse(action);
  return locked(async () => {
    const store = readGuestPracticeStore(); const entry = store.sessions[sessionId];
    if (!entry) throw new PracticeClientError("PRACTICE_NOT_FOUND");
    const next = applyPracticeAction(entry.state, parsed, new Date().toISOString());
    if (next !== entry.state) { await requireCurrent(entry.state); entry.state = next; write(store); }
    return presentPractice(next);
  }).catch((failure: unknown) => { if (failure instanceof PracticeRuleError) throw new PracticeClientError(failure.code); throw failure; });
}
export function guestPracticeHistory(page = 1, needsPage = 1) {
  return practiceHistoryPage(Object.values(readGuestPracticeStore().sessions), page, needsPage);
}
export function guestPracticeResults(sessionId: string) {
  const record = readGuestPracticeStore().sessions[sessionId];
  if (!record) throw new PracticeClientError("PRACTICE_NOT_FOUND");
  return practiceResults(record);
}
export async function retryGuestPractice(originalId: string, sessionId: string, questionIds?: string[]) {
  if (originalId === sessionId) throw new PracticeClientError("INVALID_REQUEST");
  return locked(async () => {
    const store = readGuestPracticeStore(); const original = store.sessions[originalId]?.state;
    if (!original) throw new PracticeClientError("PRACTICE_NOT_FOUND");
    const selected = selectPracticeRetryQuestions(original, questionIds);
    const ids = selected.map(q => q.questionId).sort();
    const existing = store.sessions[sessionId];
    if (existing) {
      if (existing.state.retryOf !== originalId || JSON.stringify(existing.state.retryQuestionIds) !== JSON.stringify(ids)) throw new PracticeClientError("IDEMPOTENCY_CONFLICT");
      await requireCurrent(existing.state); return presentPractice(existing.state);
    }
    if (!practiceQuestionPinsAreCurrent(selected, (await requestFreshPublicWords(selected.map(q => q.vocabularyId))).filter(word => word.enabled))) throw new PracticeClientError("STALE_PRACTICE_CONTENT");
    const state = createPracticeRetryState(sessionId, original, ids, await readGuestPracticeSource(original.config.source), () => crypto.randomUUID());
    if (state.questions.length) { store.sessions[sessionId] = { state, createdAt: new Date().toISOString() }; write(store); }
    return presentPractice(state);
  }).catch((failure: unknown) => { if (failure instanceof PracticeRuleError) throw new PracticeClientError(failure.code); throw failure; });
}
