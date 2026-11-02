import { useRef, useState } from "react";
import type { VideoPracticeAction, VideoPracticeCreate, VideoPracticeSession } from "@vocabflow/contracts";
import { createVideoPracticeRequest, readVideoPracticeRequest, actVideoPracticeRequest } from "./video-practice-client";
import { readVideoCheckpoint, writeVideoCheckpoint, clearVideoCheckpoint, VideoCheckpointError, type VideoPracticeCheckpoint } from "./video-practice-checkpoint";
import { VideoClientError } from "./video-client";
const code = (failure: unknown) => failure instanceof VideoClientError || failure instanceof VideoCheckpointError ? failure.code : "VIDEO_PRACTICE_FAILED";
export function useVideoPractice(userId: string, learnerId: string, videoId: string) {
  const [initial] = useState(() => { try { return { cp: readVideoCheckpoint(userId, learnerId, videoId), error: null }; } catch (failure) { return { cp: null, error: code(failure) }; } });
  const [offer, setOffer] = useState(initial.cp), [error, setError] = useState<string | null>(initial.error), [session, setSession] = useState<VideoPracticeSession | null>(null), [feedback, setFeedback] = useState(false), [draft, setDraft] = useState<VideoPracticeCheckpoint["draft"]>(null), [busy, setBusy] = useState(false);
  const checkpoint = useRef<VideoPracticeCheckpoint | null>(initial.cp), pending = useRef<VideoPracticeCheckpoint | null>(null), lock = useRef(false);
  function persist(cp: VideoPracticeCheckpoint) { writeVideoCheckpoint(cp); checkpoint.current = cp; }
  async function execute(cp: VideoPracticeCheckpoint) {
    if (lock.current) return null; lock.current = true; setBusy(true); setError(null); pending.current = cp;
    try {
      persist(cp); const next = cp.pending ? await actVideoPracticeRequest(learnerId, videoId, cp.input.sessionId, cp.pending) : await createVideoPracticeRequest(learnerId, videoId, cp.input);
      if (next.total) persist({ ...cp, created: true, pending: null, feedback: Boolean(cp.pending), draft: null }); else { clearVideoCheckpoint(userId, learnerId, videoId); checkpoint.current = null; }
      setSession(next); setFeedback(Boolean(cp.pending)); setDraft(null); setOffer(null); pending.current = null; return next;
    } catch (failure) { setError(code(failure)); return null; } finally { lock.current = false; setBusy(false); }
  }
  async function start(input: VideoPracticeCreate) { return execute(pending.current ?? { version: 1, userId, learnerId, videoId, input, created: false, pending: null, feedback: false, draft: null }); }
  async function act(action: VideoPracticeAction) { if (!session || !checkpoint.current) return null; return execute(pending.current ?? { ...checkpoint.current, pending: action, feedback, draft }); }
  async function load(cp: VideoPracticeCheckpoint, reconcile = false) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null);
    try { const next = await readVideoPracticeRequest(learnerId, videoId, cp.input.sessionId), nextDraft = cp.draft?.questionId === next.current?.questionId ? cp.draft : null;
      persist({ ...cp, created: true, pending: null, feedback: reconcile ? Boolean(next.feedback) : cp.feedback, draft: nextDraft }); setSession(next); setFeedback(reconcile ? Boolean(next.feedback) : cp.feedback); setDraft(nextDraft); setOffer(null); pending.current = null;
    } catch (failure) { setError(code(failure)); } finally { lock.current = false; setBusy(false); }
  }
  async function resume() { let cp = offer ?? checkpoint.current; if (!cp) { try { cp = readVideoCheckpoint(userId, learnerId, videoId); } catch (failure) { setError(code(failure)); return; } } if (!cp) { setError(null); return; } if (!cp.created || cp.pending) await execute(cp); else await load(cp); }
  function next() { if (!checkpoint.current || lock.current) return; try { persist({ ...checkpoint.current, pending: null, feedback: false, draft: null }); setFeedback(false); setDraft(null); setError(null); } catch (failure) { setError(code(failure)); } }
  function writeDraft(questionId: string, text: string) { const value = { questionId, text }; setDraft(value); if (!checkpoint.current) return; try { persist({ ...checkpoint.current, draft: value }); } catch (failure) { setError(code(failure)); } }
  function newAttempt() { if (lock.current) return; try { clearVideoCheckpoint(userId, learnerId, videoId); checkpoint.current = null; pending.current = null; setOffer(null); setSession(null); setDraft(null); setFeedback(false); setError(null); } catch (failure) { setError(code(failure)); } }
  async function retry() { if (pending.current) return execute(pending.current); if (!session) return resume(); if (checkpoint.current) { try { persist({ ...checkpoint.current, draft, feedback }); setError(null); } catch (failure) { setError(code(failure)); } } return null; }
  async function reconcile() { if (checkpoint.current) await load(checkpoint.current, true); }
  return { session, feedback, draft, busy, error, offer, start, act, resume, next, writeDraft, newAttempt, retry, reconcile };
}
