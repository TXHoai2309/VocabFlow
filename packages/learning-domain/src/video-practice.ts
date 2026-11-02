import type { VideoTranscript, VideoPracticeAction, VideoPracticeCreate, VideoPracticeSession, VideoPracticeHistory, VideoPracticeResults, PracticeOutcome } from "@vocabflow/contracts";
import { PracticeRuleError } from "./practice.js";
export type VideoGapQuestion = { questionId: string; cueId: string; startMs: number; endMs: number; text: string; maskedText: string; answer: string };
export type VideoPracticeState = { sessionId: string; videoId: string; versionId: string; transcriptHash: string; startMs: number; endMs: number; revision: number; questions: VideoGapQuestion[]; results: { action: VideoPracticeAction; outcome: PracticeOutcome; answeredAt: string }[] };
export const normalizeVideoAnswer = (text: string) => text.normalize("NFKC").replace(/[’‘ʼ`]/gu, "'").trim().toLocaleLowerCase("en-US").replace(/\s+/gu, " ");
export function createVideoPractice(videoId: string, input: VideoPracticeCreate, transcript: VideoTranscript, uuid: () => string): VideoPracticeState {
  const questions: VideoGapQuestion[] = [];
  for (const cue of transcript.cues) {
    if (cue.startMs < input.startMs || cue.endMs > input.endMs || cue.text.length > 400 || /^\s*(?:\[.*\]|\(.*\)|[♪♫].*)\s*$/.test(cue.text)) continue;
    const tokens = [...cue.text.matchAll(/[A-Za-z]+(?:['’‘ʼ][A-Za-z]+)*/g)];
    if (tokens.length < 3) continue;
    const target = tokens.filter(token => token[0].length >= 3 && tokens.filter(other => normalizeVideoAnswer(other[0]) === normalizeVideoAnswer(token[0])).length === 1).sort((a, b) => b[0].length - a[0].length || a.index - b.index)[0];
    if (!target) continue;
    questions.push({ questionId: uuid(), cueId: cue.id, startMs: cue.startMs, endMs: cue.endMs, text: cue.text, answer: target[0], maskedText: cue.text.slice(0, target.index) + "_____" + cue.text.slice(target.index + target[0].length) });
  }
  return { sessionId: input.sessionId, videoId, versionId: input.versionId, transcriptHash: transcript.sha256, startMs: input.startMs, endMs: input.endMs, revision: 0, questions, results: [] };
}
function fingerprint(action: VideoPracticeAction) { return JSON.stringify([action.actionId, action.questionId, action.kind, action.kind === "answer" ? action.text : action.kind === "report-source" ? action.reason : null]); }
export function applyVideoPractice(state: VideoPracticeState, action: VideoPracticeAction, at: string, sourceInvalid = false): VideoPracticeState {
  const existing = state.results.find(result => result.action.actionId === action.actionId);
  if (existing) { if (fingerprint(existing.action) !== fingerprint(action)) throw new PracticeRuleError("IDEMPOTENCY_CONFLICT"); return state; }
  const q = state.questions[state.results.length]; if (!q || q.questionId !== action.questionId) throw new PracticeRuleError("STALE_QUESTION");
  if (action.kind === "answer" && !normalizeVideoAnswer(action.text)) throw new PracticeRuleError("INVALID_REQUEST");
  const outcome = sourceInvalid || action.kind === "report-source" ? "technical" : action.kind === "answer" ? normalizeVideoAnswer(action.text) === normalizeVideoAnswer(q.answer) ? "correct" : "incorrect" : action.kind === "reveal" ? "revealed" : action.kind === "skip" ? "skipped" : "technical";
  return { ...state, revision: state.revision + 1, results: [...state.results, { action, outcome, answeredAt: at }] };
}
export function presentVideoPractice(state: VideoPracticeState): VideoPracticeSession {
  const summary = { correct: 0, incorrect: 0, revealed: 0, skipped: 0, technical: 0, accuracy: null as number | null };
  for (const result of state.results) summary[result.outcome]++;
  if (summary.correct + summary.incorrect) summary.accuracy = Math.round(summary.correct / (summary.correct + summary.incorrect) * 100);
  const q = state.questions[state.results.length], last = state.results.at(-1), resolved = last ? state.questions[state.results.length - 1]! : null;
  return { sessionId: state.sessionId, videoId: state.videoId, versionId: state.versionId, transcriptHash: state.transcriptHash, startMs: state.startMs, endMs: state.endMs, revision: state.revision,
    total: state.questions.length, completed: state.results.length, status: q ? "active" : "complete", current: q ? { questionId: q.questionId, maskedText: q.maskedText, startMs: q.startMs, endMs: q.endMs } : null,
    feedback: last && resolved ? { questionId: resolved.questionId, text: resolved.text, answer: resolved.answer, outcome: last.outcome } : null, summary };
}
export type VideoPracticeHistoryRow = { state: VideoPracticeState; createdAt: string };
export function videoPracticeHistoryEntry(row: VideoPracticeHistoryRow) {
  const view = presentVideoPractice(row.state);
  return { sessionId: view.sessionId, videoId: view.videoId, versionId: view.versionId, transcriptHash: view.transcriptHash, startMs: view.startMs, endMs: view.endMs, revision: view.revision, total: view.total, completed: view.completed, status: view.status, summary: view.summary, createdAt: row.createdAt };
}
export function videoPracticeHistoryPage(rows: VideoPracticeHistoryRow[], page: number): VideoPracticeHistory { return { page, pageSize: 20, total: rows.length, items: [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.state.sessionId.localeCompare(a.state.sessionId)).slice((page - 1) * 20, page * 20).map(videoPracticeHistoryEntry) }; }
export function videoPracticeResults(row: VideoPracticeHistoryRow, page: number): VideoPracticeResults {
  return { session: videoPracticeHistoryEntry(row), page, pageSize: 20, items: row.state.results.slice((page - 1) * 20, page * 20).map((result, index) => { const q = row.state.questions[(page - 1) * 20 + index]!; return { ...q, outcome: result.outcome, submitted: result.action.kind === "answer" ? result.action.text : null, answeredAt: result.answeredAt }; }) };
}
