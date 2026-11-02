import { useCallback, useEffect, useRef, useState } from "react";
import type { PracticeAction, PracticeConfig, PracticeSession } from "@vocabflow/contracts";
import { clearPracticeCheckpoint, readPracticeCheckpoint, writePracticeCheckpoint, PracticeCheckpointError, type PracticeCheckpoint } from "./practice-checkpoint";
import { practiceRequest, PracticeClientError, readPracticeSession, requestPracticeRetry } from "./practice-client";

export function usePracticeSession(userId: string, learnerId: string, initialSession?: PracticeSession) {
  // The owning workspace is keyed by account and learner. Read its synchronous
  // storage snapshot once at initialization; later retries are user actions.
  const [initial] = useState(() => {
    try {
      const value = readPracticeCheckpoint(userId, learnerId);
      const session = initialSession && value?.created && value.sessionId === initialSession.sessionId && initialSession.learnerId === learnerId ? initialSession : null;
      return { value, error: null, session };
    }
    catch (failure) { return { value: null, session: null, error: failure instanceof PracticeCheckpointError ? failure.code : "INVALID_PRACTICE_CHECKPOINT" }; }
  });
  const [session, setSession] = useState<PracticeSession | null>(initial.session);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initial.error);
  const [feedback, setFeedback] = useState(false);
  const loadingCheckpoint = false;
  const [offer, setOffer] = useState<PracticeCheckpoint | null>(initial.session ? null : initial.value);
  const [recovering, setRecovering] = useState(false);
  const [draft, setDraft] = useState<PracticeCheckpoint["draft"]>(initial.value?.draft ?? null);
  const checkpoint = useRef<PracticeCheckpoint | null>(initial.value);
  const creation = useRef<{ id: string; config: PracticeConfig } | null>(initial.value ? { id: initial.value.sessionId, config: initial.value.config } : null);
  const pending = useRef<PracticeAction | undefined>(initial.value?.pending ?? undefined);
  const draftRef = useRef<PracticeCheckpoint["draft"]>(initial.value?.draft ?? null);
  const lock = useRef(false);
  const mounted = useRef(true);
  const retryStep = useRef<"save" | "resume" | "next" | "new" | "read" | "reconcile">("read");
  const loadCheckpoint = useCallback(() => {
    retryStep.current = "read"; setError(null);
    try {
      const value = readPracticeCheckpoint(userId, learnerId);
      checkpoint.current = value; setOffer(value);
      if (value) { creation.current = { id: value.sessionId, config: value.config }; pending.current = value.pending ?? undefined; draftRef.current = value.draft; setDraft(value.draft); }
    } catch (failure) { setError(failure instanceof PracticeCheckpointError ? failure.code : "INVALID_PRACTICE_CHECKPOINT"); }
  }, [userId, learnerId]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  function persist(next: PracticeSession | null, action: PracticeAction | undefined, showFeedback: boolean, nextDraft = draftRef.current) {
    const id = next?.sessionId ?? creation.current?.id;
    const config = next?.config ?? creation.current?.config;
    if (!id || !config) throw new Error("CHECKPOINT_CONTEXT_REQUIRED");
    const value: PracticeCheckpoint = { version: 1, userId, learnerId, sessionId: id, config,
      created: Boolean(next) || checkpoint.current?.created === true, pending: action ?? null, feedback: showFeedback, draft: nextDraft,
      ...(checkpoint.current?.sessionId === id && checkpoint.current.retry ? { retry: checkpoint.current.retry } : {}) };
    try { writePracticeCheckpoint(value); } catch { throw new PracticeClientError("STORAGE_UNAVAILABLE"); }
    checkpoint.current = value;
  }
  async function save(action?: PracticeAction) {
    if (lock.current) return;
    retryStep.current = "save"; lock.current = true; pending.current = action; setBusy(true); setError(null);
    try {
      persist(session, action, false);
      const next = await practiceRequest(learnerId, session?.sessionId ?? creation.current!.id, action, session?.config ?? creation.current!.config);
      if (!mounted.current) return;
      if (next.emptyReason) { clearPracticeCheckpoint(userId, learnerId); checkpoint.current = null; }
      else persist(next, undefined, Boolean(action), action ? null : draftRef.current);
      setSession(next); setFeedback(Boolean(action)); pending.current = undefined;
      setRecovering(false); setOffer(null);
      if (action) { draftRef.current = null; setDraft(null); }
    } catch (failure) { if (mounted.current) setError(failure instanceof PracticeClientError ? failure.code : "PRACTICE_SAVE_FAILED"); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function start(config: PracticeConfig) {
    if (lock.current) return;
    creation.current = { id: crypto.randomUUID(), config };
    await save();
  }
  async function resume() {
    if (lock.current || !checkpoint.current) return;
    retryStep.current = "resume"; lock.current = true; setBusy(true); setError(null);
    const saved = checkpoint.current;
    try {
      let next: PracticeSession;
      try { next = await readPracticeSession(learnerId, saved.sessionId); }
      catch (failure) {
        if (failure instanceof PracticeClientError && failure.code === "STALE_PRACTICE_CONTENT" && saved.pending) {
          setOffer(null); setRecovering(true); setError("PENDING_ACTION"); retryStep.current = "save";
          return;
        }
        if (!(failure instanceof PracticeClientError) || failure.code !== "PRACTICE_NOT_FOUND" || saved.created) throw failure;
        next = saved.retry ? await requestPracticeRetry(learnerId, saved.retry.originalId, saved.sessionId, saved.retry.questionIds) : await practiceRequest(learnerId, saved.sessionId, undefined, saved.config);
      }
      if (!mounted.current) return;
      setSession(next); setOffer(null);
      pending.current = saved.pending ?? undefined;
      setRecovering(Boolean(saved.pending)); setFeedback(!saved.pending && saved.feedback && Boolean(next.feedback));
      if (saved.pending) { setError("PENDING_ACTION"); retryStep.current = "save"; }
      else persist(next, undefined, saved.feedback, saved.draft?.questionId === next.current?.questionId ? saved.draft : null);
    } catch (failure) { if (mounted.current) setError(failure instanceof PracticeClientError ? failure.code : "PRACTICE_SAVE_FAILED"); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  function next() {
    retryStep.current = "next";
    try { persist(session, undefined, false, null); setFeedback(false); setError(null); draftRef.current = null; setDraft(null); }
    catch { setError("STORAGE_UNAVAILABLE"); }
  }
  function newSession() {
    if (lock.current) return;
    retryStep.current = "new";
    try {
      clearPracticeCheckpoint(userId, learnerId); checkpoint.current = null;
      creation.current = null; pending.current = undefined; draftRef.current = null;
      setSession(null); setOffer(null); setDraft(null); setFeedback(false); setRecovering(false); setError(null);
    } catch { setError("STORAGE_UNAVAILABLE"); }
  }
  function writeDraft(questionId: string, text: string) {
    const value = { questionId, text }; draftRef.current = value; setDraft(value);
    try { persist(session, pending.current, feedback, value); }
    catch { setError("STORAGE_UNAVAILABLE"); retryStep.current = "save"; }
  }
  async function reconcile() {
    if (lock.current || !checkpoint.current) return;
    retryStep.current = "reconcile"; lock.current = true; setBusy(true); setError(null);
    try {
      const next = await readPracticeSession(learnerId, checkpoint.current.sessionId);
      if (!mounted.current) return;
      persist(next, undefined, Boolean(next.feedback), null);
      pending.current = undefined; draftRef.current = null; setDraft(null);
      setSession(next); setFeedback(Boolean(next.feedback)); setOffer(null); setRecovering(false);
    } catch (failure) { if (mounted.current) setError(failure instanceof PracticeClientError ? failure.code : "PRACTICE_SAVE_FAILED"); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  function retry() {
    if (retryStep.current === "read") loadCheckpoint();
    else if (retryStep.current === "resume") void resume();
    else if (retryStep.current === "next") next();
    else if (retryStep.current === "new") newSession();
    else if (retryStep.current === "reconcile") void reconcile();
    else void save(pending.current);
  }
  return { session, busy, error, feedback, loadingCheckpoint, offer, recovering, draft, start, save, resume, next, newSession, writeDraft, reconcile, retry };
}
