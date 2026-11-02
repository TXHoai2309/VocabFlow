import type { FishGameAction, FishGameConfig, FishGameSession, FishGameHistoryEntry, FishGameRecord, FishGameHistory, FishGameResults, PracticeOutcome } from "@vocabflow/contracts";
import { normalizePracticeText, practiceQuestionPinsAreCurrent, PracticeRuleError, type PracticeQuestion, type PracticeWord } from "./practice.js";

export type FishGameWord = PracticeWord & { learned: boolean };
export type FishGameReceipt = { action: FishGameAction; question: PracticeQuestion; outcome: PracticeOutcome; answeredAt: string };
export type FishGameState = {
  gameId: string; learnerId: string; rulesVersion: 1; config: FishGameConfig; revision: number;
  hearts: number; score: number; status: "active" | "lost" | "paused-content" | "ended"; cycle: number;
  finished?: { actionId: string; at: string };
  phase?: "learned" | "new" | "cycle"; unseen?: number[]; excludedIds?: number[];
  pool: FishGameWord[]; remaining: number[]; current: PracticeQuestion | null;
  receipts: FishGameReceipt[]; emptyReason: FishGameSession["emptyReason"];
};
export function fishGameConfigFingerprint(config: FishGameConfig) {
  return JSON.stringify([config.cue, config.source.kind, config.source.cefr ?? null, config.source.kind === "set" ? config.source.setId : null]);
}
function shuffled(ids: number[], random: () => number, previous?: number) {
  const queue = [...ids];
  for (let i = queue.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [queue[i], queue[j]] = [queue[j]!, queue[i]!]; }
  if (queue.length > 1 && queue[0] === previous) [queue[0], queue[1]] = [queue[1]!, queue[0]!];
  return queue;
}
function question(word: FishGameWord, cueKind: "image" | "audio", uuid: () => string): PracticeQuestion {
  return { questionId: uuid(), vocabularyId: word.id, contentVersion: word.contentVersion, ...(word.contentHash ? { contentHash: word.contentHash } : {}),
    cueKind, imageUrl: cueKind === "image" ? word.imageUrl : null, audioUrl: cueKind === "audio" ? word.audioUrl! : null, answer: word.word, responseMode: "type", options: [], correctOptionId: null };
}
const hasImage = (word: FishGameWord) => Boolean(word.imageUrl?.trim()) && word.imageMediaStatus !== "AMBIGUOUS";
const hasAudio = (word: FishGameWord) => Boolean(word.audioUrl?.trim());
function advance(state: FishGameState, uuid: () => string, random: () => number, previous?: number, previousCue?: "image" | "audio") {
  const excluded = new Set(state.excludedIds ?? []), pool = state.pool.filter(word => !excluded.has(word.id));
  if (!pool.length) return { ...state, remaining: [], unseen: [], current: null, status: "paused-content" as const, emptyReason: "no-valid-media" as const };
  let remaining = state.remaining.filter(id => !excluded.has(id)), unseen = (state.unseen ?? []).filter(id => !excluded.has(id)), phase = state.phase ?? "learned", cycle = state.cycle;
  if (!remaining.length) {
    if (phase === "learned" && unseen.length) { remaining = unseen; unseen = []; phase = "new"; }
    else { remaining = shuffled(pool.map(word => word.id), random, previous); phase = "cycle"; cycle++; }
  }
  const cueKind = state.config.cue === "audio" ? "audio" : state.config.cue === "image" ? "image"
    : previousCue ? previousCue === "image" ? "audio" : "image" : remaining.some(id => hasImage(pool.find(word => word.id === id)!)) ? "image" : "audio";
  const eligible = remaining.filter(id => { const word = pool.find(word => word.id === id); return word && (cueKind === "image" ? hasImage(word) : hasAudio(word)); });
  const id = eligible.find(id => id !== previous) ?? eligible[0];
  if (id === undefined) return { ...state, remaining, unseen, phase, cycle, current: null, status: "paused-content" as const,
    emptyReason: pool.length ? "insufficient-next-cue" as const : "no-valid-media" as const };
  remaining.splice(remaining.indexOf(id), 1);
  return { ...state, remaining, unseen, phase, cycle, current: question(pool.find(word => word.id === id)!, cueKind, uuid), status: "active" as const, emptyReason: null };
}
export function createFishGame(gameId: string, learnerId: string, source: FishGameWord[], uuid: () => string, random = Math.random,
  config: FishGameConfig = { source: { kind: "learned" }, cue: "image" }): FishGameState {
  let pool = [...new Map(source.filter(word => (config.source.kind !== "learned" || word.learned) && (config.cue === "image" ? hasImage(word) : config.cue === "audio" ? hasAudio(word) : hasImage(word) || hasAudio(word)) && normalizePracticeText(word.word)).map(word => [word.id, word])).values()].map(word => ({
    id: word.id, word: word.word, vietnamese: word.vietnamese, contentVersion: word.contentVersion, learned: word.learned,
    imageUrl: word.imageUrl, audioUrl: word.audioUrl ?? null, ...(word.contentHash ? { contentHash: word.contentHash } : {}), ...(word.imageMediaStatus ? { imageMediaStatus: word.imageMediaStatus } : {})
  }));
  const missingMixed = config.cue === "mixed" && (pool.length < 2 || !pool.some(hasImage) || !pool.some(hasAudio));
  if (missingMixed) pool = [];
  const learned = shuffled(pool.filter(word => word.learned).map(word => word.id), random), fresh = shuffled(pool.filter(word => !word.learned).map(word => word.id), random);
  const state: FishGameState = { gameId, learnerId, rulesVersion: 1, config, revision: 0, hearts: 5, score: 0, status: "active", cycle: 1,
    pool, remaining: learned.length ? learned : fresh, unseen: learned.length ? fresh : [], phase: learned.length ? "learned" : "new", excludedIds: [], current: null, receipts: [],
    emptyReason: pool.length ? null : !source.length ? config.source.kind === "learned" ? "no-learned-words" : "empty-source" : missingMixed ? "insufficient-mixed-media" : "insufficient-media" };
  return pool.length ? advance(state, uuid, random) : state;
}
function actionFingerprint(action: FishGameAction) { return JSON.stringify([action.actionId, action.questionId, action.kind, action.kind === "type-answer" ? action.text : null]); }
function resolveOutcome(current: PracticeQuestion, action: FishGameAction): PracticeOutcome {
  return action.kind === "type-answer" ? normalizePracticeText(action.text) === normalizePracticeText(current.answer) ? "correct" : "incorrect"
    : action.kind === "reveal" ? "revealed" : action.kind === "skip" ? "skipped" : "technical";
}
export function fishGameStateIsConsistent(state: FishGameState) {
  let hearts = 5, score = 0; const actions = new Set<string>(), questions = new Set<string>(); const ids = new Set(state.pool.map(word => word.id));
  if (ids.size !== state.pool.length || state.revision !== state.receipts.length + (state.finished ? 1 : 0) || (state.status === "ended") !== Boolean(state.finished)) return false;
  const validQueue = (queue: number[]) => new Set(queue).size === queue.length && queue.every(id => ids.has(id));
  if (!validQueue(state.remaining) || !validQueue(state.unseen ?? []) || !validQueue(state.excludedIds ?? []) || state.remaining.some(id => state.unseen?.includes(id))) return false;
  for (const receipt of state.receipts) {
    const { action, question, outcome } = receipt;
    if (!hearts || actions.has(action.actionId) || questions.has(question.questionId) || action.questionId !== question.questionId || question.responseMode !== "type"
      || !ids.has(question.vocabularyId) || !practiceQuestionPinsAreCurrent([question], state.pool) || outcome !== resolveOutcome(question, action)) return false;
    actions.add(action.actionId); questions.add(question.questionId);
    if (outcome === "correct") score += 10; else if (outcome !== "technical") hearts--;
  }
  return state.hearts === hearts && state.score === score && (state.status === "lost") === (hearts === 0)
    && (!state.finished || !actions.has(state.finished.actionId))
    && (state.status === "active" ? Boolean(state.current && !questions.has(state.current.questionId) && state.current.responseMode === "type" && practiceQuestionPinsAreCurrent([state.current], state.pool)) : state.current === null);
}
export function finishFishGame(state: FishGameState, actionId: string, at: string): FishGameState {
  if (state.receipts.some(receipt => receipt.action.actionId === actionId)) throw new PracticeRuleError("IDEMPOTENCY_CONFLICT");
  if (state.status === "lost" || state.status === "ended") return state;
  return { ...state, status: "ended", current: null, emptyReason: null, revision: state.revision + 1, finished: { actionId, at } };
}
export type FishGameHistoryRow = { state: FishGameState; createdAt: string };
export function fishGameHistoryEntry({ state, createdAt }: FishGameHistoryRow): FishGameHistoryEntry {
  const view = presentFishGame(state);
  return { gameId: state.gameId, createdAt, endedAt: state.finished?.at ?? (state.status === "lost" ? state.receipts.at(-1)?.answeredAt ?? null : null),
    config: state.config, rulesVersion: state.rulesVersion, score: state.score, hearts: state.hearts, status: state.status, resolved: view.resolved, summary: view.summary };
}
export function fishGameResults(row: FishGameHistoryRow, page: number): FishGameResults {
  return { game: fishGameHistoryEntry(row), page, pageSize: 20, totalResolved: row.state.receipts.length,
    items: row.state.receipts.slice((page - 1) * 20, page * 20).map(receipt => ({ questionId: receipt.question.questionId, word: receipt.question.answer,
      outcome: receipt.outcome, cueKind: receipt.question.cueKind, submitted: receipt.action.kind === "type-answer" ? receipt.action.text : null,
      contentVersion: receipt.question.contentVersion, contentHash: receipt.question.contentHash ?? null, answeredAt: receipt.answeredAt })) };
}
export function fishGameHistoryPage(rows: FishGameHistoryRow[], page: number, recordsPage: number): FishGameHistory {
  const ordered = [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.state.gameId.localeCompare(a.state.gameId));
  const groups = new Map<string, FishGameRecord>();
  for (const { state } of ordered) {
    if (state.status !== "lost" && state.status !== "ended") continue;
    const key = `${state.rulesVersion}:${fishGameConfigFingerprint(state.config)}`, prior = groups.get(key);
    if (!prior) groups.set(key, { config: state.config, rulesVersion: state.rulesVersion, bestScore: state.score, bestGameId: state.gameId, finalizedGames: 1 });
    else groups.set(key, { ...prior, ...(state.score > prior.bestScore ? { bestScore: state.score, bestGameId: state.gameId } : {}), finalizedGames: prior.finalizedGames + 1 });
  }
  const records = [...groups.values()].sort((a, b) => b.bestScore - a.bestScore || b.bestGameId.localeCompare(a.bestGameId));
  return { page, recordsPage, pageSize: 20, totalGames: ordered.length, totalRecords: records.length,
    items: ordered.slice((page - 1) * 20, page * 20).map(fishGameHistoryEntry), records: records.slice((recordsPage - 1) * 20, recordsPage * 20) };
}
export function applyFishGameAction(state: FishGameState, action: FishGameAction, answeredAt: string, uuid: () => string, random = Math.random): FishGameState {
  const receipt = state.receipts.find(item => item.action.actionId === action.actionId);
  if (receipt) { if (actionFingerprint(receipt.action) !== actionFingerprint(action)) throw new PracticeRuleError("IDEMPOTENCY_CONFLICT"); return state; }
  const current = state.current;
  if (!current || state.status !== "active" || current.questionId !== action.questionId) throw new PracticeRuleError("STALE_QUESTION");
  if (action.kind === "type-answer" && !normalizePracticeText(action.text)) throw new PracticeRuleError("INVALID_REQUEST");
  const outcome = resolveOutcome(current, action);
  const hearts = state.hearts - (outcome === "incorrect" || outcome === "revealed" || outcome === "skipped" ? 1 : 0);
  const next: FishGameState = { ...state, hearts, score: state.score + (outcome === "correct" ? 10 : 0), revision: state.revision + 1,
    excludedIds: outcome === "technical" ? [...new Set([...(state.excludedIds ?? []), current.vocabularyId])] : state.excludedIds,
    status: hearts === 0 ? "lost" : "active", current: null,
    receipts: [...state.receipts, { action, question: current, outcome, answeredAt }] };
  return hearts === 0 ? next : advance(next, uuid, random, current.vocabularyId, current.cueKind);
}
export function presentFishGame(state: FishGameState): FishGameSession {
  const summary = { correct: 0, incorrect: 0, revealed: 0, skipped: 0, technical: 0 };
  for (const receipt of state.receipts) summary[receipt.outcome]++;
  const q = state.current, last = state.receipts.at(-1);
  return { gameId: state.gameId, learnerId: state.learnerId, rulesVersion: state.rulesVersion, config: state.config, revision: state.revision,
    hearts: state.hearts, score: state.score, status: state.status, cycle: state.cycle, resolved: state.receipts.length, emptyReason: state.emptyReason,
    current: q ? { questionId: q.questionId, cueKind: q.cueKind, imageUrl: q.imageUrl, audioUrl: q.audioUrl } : null,
    feedback: last ? { questionId: last.question.questionId, answer: last.question.answer, outcome: last.outcome } : null, summary };
}
