import { fishGameConfigSchema, fishGameSessionSchema, fishGameHistorySchema, fishGameResultsSchema, fishGameFinishSchema, type FishGameAction, type FishGameConfig } from "@vocabflow/contracts";
import { GUEST_ID } from "../guest/guest-store";
import { actGuestGame, createGuestGame, readGuestGame, guestGameHistory, guestGameResults, finishGuestGame } from "./guest-game";
import { GameClientError } from "./game-errors";
export { GameClientError } from "./game-errors";
async function payload(response: Response): Promise<unknown> {
  if (!response.ok) { let code = "GAME_SAVE_FAILED"; try { code = (await response.json() as { error?: { code: string } }).error?.code ?? code; } catch { /* Safe generic response. */ } throw new GameClientError(code); }
  return response.json();
}
export async function readGameSession(learner: string, gameId: string) {
  if (learner === GUEST_ID) return readGuestGame(gameId);
  return fishGameSessionSchema.parse(await payload(await fetch(`/api/learners/${encodeURIComponent(learner)}/fish-games/${gameId}`, { credentials: "same-origin", cache: "no-store" })));
}
export async function gameRequest(learner: string, gameId: string, action?: FishGameAction, config?: FishGameConfig) {
  if (learner === GUEST_ID) return action ? actGuestGame(gameId, action) : createGuestGame(gameId, fishGameConfigSchema.parse(config ?? {}));
  const base = `/api/learners/${encodeURIComponent(learner)}/fish-games`;
  const response = await fetch(action ? `${base}/${gameId}/actions` : base, { method: "POST", credentials: "same-origin",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(action ?? { gameId, ...config }) });
  return fishGameSessionSchema.parse(await payload(response));
}
export async function requestGameHistory(learner: string, page: number, recordsPage: number) {
  if (learner === GUEST_ID) return guestGameHistory(page, recordsPage);
  return fishGameHistorySchema.parse(await payload(await fetch(`/api/learners/${encodeURIComponent(learner)}/fish-games?${new URLSearchParams({ page: String(page), recordsPage: String(recordsPage) })}`, { credentials: "same-origin", cache: "no-store" })));
}
export async function requestGameResults(learner: string, gameId: string, page: number) {
  if (learner === GUEST_ID) return guestGameResults(gameId, page);
  return fishGameResultsSchema.parse(await payload(await fetch(`/api/learners/${encodeURIComponent(learner)}/fish-games/${gameId}/results?page=${page}`, { credentials: "same-origin", cache: "no-store" })));
}
export async function requestGameFinish(learner: string, gameId: string, actionId: string) {
  const body = fishGameFinishSchema.parse({ actionId }); if (learner === GUEST_ID) return finishGuestGame(gameId, body.actionId);
  return fishGameSessionSchema.parse(await payload(await fetch(`/api/learners/${encodeURIComponent(learner)}/fish-games/${gameId}/finish`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })));
}
