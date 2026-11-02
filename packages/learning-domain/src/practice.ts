import type { PracticeAction, PracticeOutcome, PracticeSession, PracticeConfig, PracticeHistory, PracticeHistoryEntry, PracticeNeedsMore, PracticeResults } from "@vocabflow/contracts";

export type PracticeWord = {
  id: number; word: string; vietnamese: string; contentVersion: number;
  imageUrl: string | null; imageMediaStatus?: string;
  audioUrl?: string | null;
  contentHash?: string;
};
export type PracticeQuestion = {
  questionId: string; vocabularyId: number; contentVersion: number; imageUrl: string | null; audioUrl: string | null; cueKind: "image" | "audio";
  answer: string; correctOptionId: string | null; options: { optionId: string; label: string }[];
  responseMode: "choice" | "type";
  contentHash?: string;
};
export type PracticeState = {
  sessionId: string; learnerId: string; revision: number;
  requestedCount: number; availableCount: number; emptyReason: PracticeSession["emptyReason"];
  questions: PracticeQuestion[];
  config: PracticeConfig;
  retryOf?: string; retryQuestionIds?: string[];
  results: { action: PracticeAction; outcome: PracticeOutcome; answer: string; cueKind: "image" | "audio"; answeredAt?: string }[];
};

export class PracticeRuleError extends Error {
  constructor(readonly code: "STALE_QUESTION" | "IDEMPOTENCY_CONFLICT" | "INVALID_OPTION" | "INVALID_REQUEST") { super(code); }
}
export function normalizePracticeText(value: string) {
  return value.normalize("NFKC").trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
}
function overlappingMeaning(a: string, b: string) {
  const aa = normalizePracticeText(a).split(/[;,/|]+/u).map(s => s.trim()).filter(Boolean);
  const bb = normalizePracticeText(b).split(/[;,/|]+/u).map(s => s.trim()).filter(Boolean);
  return !aa.length || !bb.length || aa.some(x => bb.some(y => x === y || (x.length >= 4 && y.length >= 4 && (x.includes(y) || y.includes(x)))));
}
function shuffle<T>(items: T[], random: () => number) {
  const values = [...items];
  for (let i = values.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [values[i], values[j]] = [values[j]!, values[i]!];
  }
  return values;
}
/** Source has already been authorized, learned-filtered and media-sanitized. */
export const defaultPracticeConfig: PracticeConfig = { count: 10, source: { kind: "learned" }, cue: "image", responseMode: "choice" };
export function practiceConfigFingerprint(config: PracticeConfig) {
  return JSON.stringify([config.count, config.cue, config.responseMode, config.source.kind, config.source.cefr ?? null, config.source.kind === "set" ? config.source.setId : null]);
}
export function practiceContentIsCurrent(state: PracticeState, words: PracticeWord[]) {
  return practiceQuestionPinsAreCurrent(state.questions.slice(state.results.length), words);
}
export function practiceQuestionPinsAreCurrent(questions: readonly PracticeQuestion[], words: PracticeWord[]) {
  const current = new Map(words.map(word => [word.id, word]));
  return questions.every(question => {
    const word = current.get(question.vocabularyId);
    return word && word.contentVersion === question.contentVersion
      && (word.contentHash ?? null) === (question.contentHash ?? null)
      && (question.cueKind === "image" ? word.imageMediaStatus !== "AMBIGUOUS" && word.imageUrl === question.imageUrl : word.audioUrl === question.audioUrl);
  });
}
export function createPracticeState(sessionId: string, learnerId: string, source: PracticeWord[], uuid: () => string, random = Math.random, config = defaultPracticeConfig, targetIds?: readonly number[]): PracticeState {
  const pool = [...new Map(source.map(word => [word.id, word])).values()];
  const ordered = shuffle(pool, random);
  const eligible: { target: PracticeWord; choices: PracticeWord[]; image: boolean; audio: boolean }[] = [];
  for (const target of ordered) {
    if (targetIds && !targetIds.includes(target.id)) continue;
    const image = Boolean(target.imageUrl?.trim()) && target.imageMediaStatus !== "AMBIGUOUS";
    const audio = Boolean(target.audioUrl?.trim());
    if ((!image && !audio) || !normalizePracticeText(target.word)) continue;
    const choices = [target];
    for (const candidate of config.responseMode === "choice" ? ordered : []) {
      if (choices.length === 4) break;
      if (!normalizePracticeText(candidate.word) || choices.some(other => other.id === candidate.id
        || normalizePracticeText(other.word) === normalizePracticeText(candidate.word)
        || overlappingMeaning(other.vietnamese, candidate.vietnamese))) continue;
      choices.push(candidate);
    }
    if (config.responseMode === "choice" && choices.length !== 4) continue;
    eligible.push({ target, choices, image, audio });
  }
  let availableCount = eligible.filter(item => config.cue === "audio" ? item.audio : item.image).length;
  if (config.cue === "mixed") {
    const imageCount = eligible.filter(item => item.image).length;
    const audioCount = eligible.filter(item => item.audio).length;
    availableCount = eligible.length;
    while (availableCount && (Math.ceil(availableCount / 2) > imageCount || Math.floor(availableCount / 2) > audioCount)) availableCount--;
    if (availableCount < 2) availableCount = 0;
  }
  const remaining = [...eligible];
  const questions: PracticeQuestion[] = [];
  for (let i = 0; i < Math.min(config.count, availableCount); i++) {
    const cueKind = config.cue === "audio" || (config.cue === "mixed" && i % 2 === 1) ? "audio" : "image";
    // Preserve flexible candidates until exclusive candidates are exhausted.
    let index = remaining.findIndex(item => item[cueKind] && (config.cue !== "mixed" || !item[cueKind === "image" ? "audio" : "image"]));
    if (index < 0) index = remaining.findIndex(item => item[cueKind]);
    const { target, choices } = remaining.splice(index, 1)[0]!;
    const options = config.responseMode === "choice" ? shuffle(choices, random).map(word => ({ optionId: uuid(), label: word.word })) : [];
    questions.push({ questionId: uuid(), vocabularyId: target.id, contentVersion: target.contentVersion, cueKind, responseMode: config.responseMode,
      ...(target.contentHash ? { contentHash: target.contentHash } : {}),
      imageUrl: cueKind === "image" ? target.imageUrl : null, audioUrl: cueKind === "audio" ? target.audioUrl! : null, answer: target.word,
      correctOptionId: options.find(option => option.label === target.word)?.optionId ?? null, options });
  }
  return { sessionId, learnerId, revision: 0, config, requestedCount: config.count, availableCount,
    emptyReason: !pool.length ? config.source.kind === "learned" ? "no-learned-words" : "empty-source" : !questions.length ? config.cue === "mixed" ? "insufficient-mixed-media" : "insufficient-media-or-options" : null,
    questions, results: [] };
}
export function applyPracticeAction(state: PracticeState, action: PracticeAction, answeredAt: string): PracticeState {
  const existing = state.results.find(result => result.action.actionId === action.actionId);
  if (existing) {
    // PostgreSQL JSONB may reorder object keys. Compare semantic fields only.
    const fingerprint = (value: PracticeAction) => JSON.stringify([value.actionId, value.questionId, value.kind, value.kind === "answer" ? value.optionId : value.kind === "type-answer" ? value.text : null]);
    if (fingerprint(existing.action) !== fingerprint(action)) throw new PracticeRuleError("IDEMPOTENCY_CONFLICT");
    return state;
  }
  const question = state.questions[state.results.length];
  if (!question || question.questionId !== action.questionId) throw new PracticeRuleError("STALE_QUESTION");
  if ((action.kind === "answer" && question.responseMode !== "choice") || (action.kind === "type-answer" && question.responseMode !== "type")) throw new PracticeRuleError("INVALID_REQUEST");
  if (action.kind === "type-answer" && !normalizePracticeText(action.text)) throw new PracticeRuleError("INVALID_REQUEST");
  if (action.kind === "answer" && !question.options.some(option => option.optionId === action.optionId)) throw new PracticeRuleError("INVALID_OPTION");
  const outcome: PracticeOutcome = action.kind === "answer" ? action.optionId === question.correctOptionId ? "correct" : "incorrect"
    : action.kind === "type-answer" ? normalizePracticeText(action.text) === normalizePracticeText(question.answer) ? "correct" : "incorrect"
    : action.kind === "reveal" ? "revealed" : action.kind === "skip" ? "skipped" : "technical";
  return { ...state, revision: state.revision + 1, results: [...state.results, { action, outcome, answer: question.answer, cueKind: question.cueKind, answeredAt }] };
}
export function selectPracticeRetryQuestions(state: PracticeState, questionIds?: readonly string[]) {
  const wrong = state.questions.filter((q, i) => state.results[i]?.outcome === "incorrect");
  const selected = questionIds ?? wrong.map(q => q.questionId);
  if (!selected.length || new Set(selected).size !== selected.length || selected.some(id => !wrong.some(q => q.questionId === id))) throw new PracticeRuleError("INVALID_REQUEST");
  return wrong.filter(q => selected.includes(q.questionId));
}
export function createPracticeRetryState(sessionId: string, original: PracticeState, questionIds: readonly string[] | undefined, source: PracticeWord[], uuid: () => string, random = Math.random) {
  if (sessionId === original.sessionId) throw new PracticeRuleError("INVALID_REQUEST");
  const selected = selectPracticeRetryQuestions(original, questionIds);
  const state = createPracticeState(sessionId, original.learnerId, source, uuid, random, original.config, selected.map(q => q.vocabularyId));
  return { ...state, requestedCount: selected.length, retryOf: original.sessionId, retryQuestionIds: selected.map(q => q.questionId).sort() };
}
export type PracticeHistoryRecord = { state: PracticeState; createdAt: string };
export function practiceHistoryEntry({ state, createdAt }: PracticeHistoryRecord): PracticeHistoryEntry {
  const view = presentPractice(state);
  return { sessionId: state.sessionId, createdAt, config: state.config, ...(state.retryOf ? { retryOf: state.retryOf } : {}),
    total: view.total, completed: view.completed, status: view.status, summary: view.summary };
}
export function practiceResults(record: PracticeHistoryRecord): PracticeResults {
  return { session: practiceHistoryEntry(record), results: record.state.results.map((result, i) => {
    const q = record.state.questions[i]!;
    const action = result.action;
    return { questionId: q.questionId, vocabularyId: q.vocabularyId, word: result.answer, outcome: result.outcome,
      cueKind: q.cueKind, responseMode: q.responseMode, contentVersion: q.contentVersion, contentHash: q.contentHash ?? null,
      submitted: action.kind === "type-answer" ? action.text : action.kind === "answer" ? q.options.find(option => option.optionId === action.optionId)?.label ?? null : null,
      answeredAt: result.answeredAt ?? null };
  }) };
}
export function practiceHistoryPage(records: readonly PracticeHistoryRecord[], page: number, needsPage: number): PracticeHistory {
  const sorted = [...records].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.state.sessionId.localeCompare(a.state.sessionId));
  const knowledge = new Map<number, PracticeNeedsMore & { outcome: "correct" | "incorrect" }>();
  for (const record of records) for (let i = 0; i < record.state.results.length; i++) {
    const result = record.state.results[i]!;
    if (result.outcome !== "correct" && result.outcome !== "incorrect") continue;
    const q = record.state.questions[i]!;
    const time = result.answeredAt ?? record.createdAt;
    const prior = knowledge.get(q.vocabularyId);
    const errors = (prior?.incorrectCount ?? 0) + (result.outcome === "incorrect" ? 1 : 0);
    const newer = !prior || time > prior.lastAnsweredAt || (time === prior.lastAnsweredAt && record.state.sessionId > prior.sessionId);
    knowledge.set(q.vocabularyId, newer ? { vocabularyId: q.vocabularyId, word: result.answer, incorrectCount: errors,
      lastAnsweredAt: time, sessionId: record.state.sessionId, outcome: result.outcome } : { ...prior, incorrectCount: errors });
  }
  const needs = [...knowledge.values()].filter(item => item.outcome === "incorrect").sort((a, b) => b.lastAnsweredAt.localeCompare(a.lastAnsweredAt) || a.word.localeCompare(b.word) || a.vocabularyId - b.vocabularyId);
  return { page, needsPage, pageSize: 20, totalSessions: sorted.length, needsTotal: needs.length,
    items: sorted.slice((page - 1) * 20, page * 20).map(practiceHistoryEntry),
    needsPractice: needs.slice((needsPage - 1) * 20, needsPage * 20).map(({ outcome: _outcome, ...item }) => item) };
}
export function presentPractice(state: PracticeState): PracticeSession {
  const counts = { correct: 0, incorrect: 0, revealed: 0, skipped: 0, technical: 0 };
  const byCue = { image: { ...counts }, audio: { ...counts } };
  for (const result of state.results) { counts[result.outcome]++; byCue[result.cueKind][result.outcome]++; }
  const answered = counts.correct + counts.incorrect;
  const question = state.questions[state.results.length];
  const last = state.results.at(-1);
  return { sessionId: state.sessionId, learnerId: state.learnerId, revision: state.revision,
    config: state.config,
    requestedCount: state.requestedCount, availableCount: state.availableCount, total: state.questions.length,
    completed: state.results.length, status: question ? "active" : "complete", emptyReason: state.emptyReason,
    current: question ? { questionId: question.questionId, responseMode: question.responseMode, cueKind: question.cueKind, imageUrl: question.imageUrl, audioUrl: question.audioUrl, options: question.options } : null,
    feedback: last ? { questionId: last.action.questionId, cueKind: last.cueKind, outcome: last.outcome, answer: last.answer } : null,
    summary: { ...counts, byCue, accuracy: answered ? Math.round(counts.correct / answered * 100) : null } };
}
