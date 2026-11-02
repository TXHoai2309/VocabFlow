import { z } from "zod";
import { fishGameActionSchema, fishGameConfigSchema, fishGameStoredStateSchema, type FishGameAction, type FishGameConfig } from "@vocabflow/contracts";
import { applyFishGameAction, createFishGame, finishFishGame, fishGameHistoryPage, fishGameResults, fishGameConfigFingerprint, fishGameStateIsConsistent, presentFishGame, practiceQuestionPinsAreCurrent, PracticeRuleError, type FishGameState } from "@vocabflow/learning-domain";
import { GUEST_ID } from "../guest/guest-store";
import { requestFreshPublicWords } from "../guest/public-learning-client";
import { readGuestPracticeSource } from "../practice/guest-practice";
import { GameClientError } from "./game-errors";
export const GUEST_GAME_KEY = "vocabflow.game.guest.v1";
const schema = z.object({ version: z.literal(1), games: z.record(z.uuid(), z.object({ state: fishGameStoredStateSchema, createdAt: z.iso.datetime() }).strict()) }).strict();
export type GuestGameStore = z.infer<typeof schema>;
export function readGuestGameStore(): GuestGameStore {
  let raw: string | null; try { raw = localStorage.getItem(GUEST_GAME_KEY); } catch { throw new GameClientError("GUEST_GAME_STORAGE_UNAVAILABLE"); }
  if (!raw) return { version: 1, games: {} };
  try {
    if (raw.length > 10000000) throw new Error(); const store = schema.parse(JSON.parse(raw));
    if (Object.entries(store.games).some(([id, entry]) => entry.state.gameId !== id || entry.state.learnerId !== GUEST_ID || !fishGameStateIsConsistent(entry.state))) throw new Error();
    return store;
  } catch { throw new GameClientError("GUEST_GAME_CORRUPT"); }
}
function write(store: GuestGameStore) { try { localStorage.setItem(GUEST_GAME_KEY, JSON.stringify(schema.parse(store))); } catch { throw new GameClientError("GUEST_GAME_STORAGE_UNAVAILABLE"); } }
async function locked<T>(task: () => Promise<T>) {
  if (!navigator.locks) throw new GameClientError("GUEST_LOCK_UNAVAILABLE");
  return navigator.locks.request(GUEST_GAME_KEY, task).catch((failure: unknown) => { if (failure instanceof PracticeRuleError) throw new GameClientError(failure.code); throw failure; });
}
async function requireCurrent(state: FishGameState) {
  if (state.current && !practiceQuestionPinsAreCurrent([state.current], (await requestFreshPublicWords([state.current.vocabularyId])).filter(word => word.enabled))) throw new GameClientError("STALE_GAME_CONTENT");
}
export async function createGuestGame(gameId: string, config: FishGameConfig) {
  const parsed = fishGameConfigSchema.parse(config); if (!z.uuid().safeParse(gameId).success) throw new GameClientError("INVALID_REQUEST");
  return locked(async () => {
    const store = readGuestGameStore(); const existing = store.games[gameId];
    if (existing) { if (fishGameConfigFingerprint(existing.state.config) !== fishGameConfigFingerprint(parsed)) throw new GameClientError("IDEMPOTENCY_CONFLICT"); await requireCurrent(existing.state); return presentFishGame(existing.state); }
    const state = createFishGame(gameId, GUEST_ID, (await readGuestPracticeSource(parsed.source)).map(word => ({ ...word, learned: word.status !== "NEW" })), () => crypto.randomUUID(), Math.random, parsed);
    if (state.current) { store.games[gameId] = { state, createdAt: new Date().toISOString() }; write(store); }
    return presentFishGame(state);
  });
}
export async function readGuestGame(gameId: string) {
  const state = readGuestGameStore().games[gameId]?.state; if (!state) throw new GameClientError("GAME_NOT_FOUND"); await requireCurrent(state); return presentFishGame(state);
}
export async function actGuestGame(gameId: string, action: FishGameAction) {
  const parsed = fishGameActionSchema.parse(action);
  return locked(async () => {
    const store = readGuestGameStore(); const entry = store.games[gameId]; if (!entry) throw new GameClientError("GAME_NOT_FOUND");
    const next = applyFishGameAction(entry.state, parsed, new Date().toISOString(), () => crypto.randomUUID());
    if (next !== entry.state) { await requireCurrent(entry.state); entry.state = next; write(store); }
    return presentFishGame(next);
  });
}
export function guestGameHistory(page: number, recordsPage: number) { return fishGameHistoryPage(Object.values(readGuestGameStore().games), page, recordsPage); }
export function guestGameResults(gameId: string, page: number) { const row = readGuestGameStore().games[gameId]; if (!row) throw new GameClientError("GAME_NOT_FOUND"); return fishGameResults(row, page); }
export async function finishGuestGame(gameId: string, actionId: string) {
  if (!z.uuid().safeParse(actionId).success) throw new GameClientError("INVALID_REQUEST");
  return locked(async () => { const store = readGuestGameStore(), entry = store.games[gameId]; if (!entry) throw new GameClientError("GAME_NOT_FOUND");
    const next = finishFishGame(entry.state, actionId, new Date().toISOString()); if (next !== entry.state) { entry.state = next; write(store); } return presentFishGame(next); });
}
