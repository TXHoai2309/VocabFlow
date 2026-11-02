import { practiceConfigSchema, practiceSessionSchema, practiceHistorySchema, practiceResultsSchema, practiceRetryRequestSchema, type PracticeAction, type PracticeConfig } from "@vocabflow/contracts";
import { GUEST_ID } from "../guest/guest-store";
import { actGuestPractice, createGuestPractice, readGuestPractice, guestPracticeHistory, guestPracticeResults, retryGuestPractice } from "./guest-practice";
import { PracticeClientError } from "./practice-errors";
import { requestLearningSets } from "../learning-sets/learning-sets-client";
import { requestPracticePublicIndex } from "../guest/public-learning-client";
export { PracticeClientError } from "./practice-errors";
export async function requestPracticeSets(learnerId: string) {
  return learnerId === GUEST_ID ? (await requestPracticePublicIndex()).learningSets : requestLearningSets();
}
async function practicePayload(response: Response): Promise<unknown> {
  if (!response.ok) {
    let code = "PRACTICE_SAVE_FAILED";
    try { const body = await response.json() as { error?: { code?: string } }; code = body.error?.code ?? code; } catch { /* Safe generic error. */ }
    throw new PracticeClientError(code);
  }
  return response.json();
}
async function practiceResponse(response: Response) { return practiceSessionSchema.parse(await practicePayload(response)); }
export async function readPracticeSession(learnerId: string, sessionId: string) {
  if (learnerId === GUEST_ID) return readGuestPractice(sessionId);
  return practiceResponse(await fetch(`/api/learners/${encodeURIComponent(learnerId)}/practice-sessions/${sessionId}`, { credentials: "same-origin", cache: "no-store" }));
}

export async function practiceRequest(learnerId: string, sessionId: string, action?: PracticeAction, config?: PracticeConfig) {
  if (learnerId === GUEST_ID) return action ? actGuestPractice(sessionId, action) : createGuestPractice(sessionId, practiceConfigSchema.parse(config ?? {}));
  const base = `/api/learners/${encodeURIComponent(learnerId)}/practice-sessions`;
  const response = await fetch(action ? `${base}/${sessionId}/actions` : base, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(action ?? { sessionId, ...config })
  });
  return practiceResponse(response);
}
export async function requestPracticeHistory(learnerId: string, page: number, needsPage: number) {
  if (learnerId === GUEST_ID) return guestPracticeHistory(page, needsPage);
  return practiceHistorySchema.parse(await practicePayload(await fetch(`/api/learners/${encodeURIComponent(learnerId)}/practice-sessions?${new URLSearchParams({ page: String(page), needsPage: String(needsPage) })}`, { credentials: "same-origin", cache: "no-store" })));
}
export async function requestPracticeResults(learnerId: string, sessionId: string) {
  if (learnerId === GUEST_ID) return guestPracticeResults(sessionId);
  return practiceResultsSchema.parse(await practicePayload(await fetch(`/api/learners/${encodeURIComponent(learnerId)}/practice-sessions/${sessionId}/results`, { credentials: "same-origin", cache: "no-store" })));
}
export async function requestPracticeRetry(learnerId: string, originalId: string, sessionId: string, questionIds: string[]) {
  const body = practiceRetryRequestSchema.parse({ sessionId, questionIds });
  if (learnerId === GUEST_ID) return retryGuestPractice(originalId, sessionId, questionIds);
  return practiceResponse(await fetch(`/api/learners/${encodeURIComponent(learnerId)}/practice-sessions/${originalId}/retry`, {
    method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body)
  }));
}
