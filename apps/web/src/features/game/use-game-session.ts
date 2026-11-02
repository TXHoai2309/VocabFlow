import { useRef, useState } from "react";
import type { FishGameAction, FishGameConfig, FishGameSession } from "@vocabflow/contracts";
import { GameClientError, gameRequest, readGameSession, requestGameFinish } from "./game-client";
import { clearGameCheckpoint, GameCheckpointError, readGameCheckpoint, writeGameCheckpoint, type GameCheckpoint } from "./game-checkpoint";
const errorCode = (error: unknown) => error instanceof GameClientError || error instanceof GameCheckpointError ? error.code : "GAME_SAVE_FAILED";
export function useGameSession(userId: string, learnerId: string) {
  const [initial] = useState(() => { try { return { offer: readGameCheckpoint(userId, learnerId), error: null }; } catch (error) { return { offer: null, error: errorCode(error) }; } });
  const [offer, setOffer] = useState<GameCheckpoint | null>(initial.offer), [error, setError] = useState<string | null>(initial.error);
  const [session, setSession] = useState<FishGameSession | null>(null), [feedback, setFeedback] = useState(false), [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<GameCheckpoint["draft"]>(null);
  const checkpoint = useRef<GameCheckpoint | null>(initial.offer), pending = useRef<GameCheckpoint | null>(null), lock = useRef(false);
  function persist(cp: GameCheckpoint) { writeGameCheckpoint(cp); checkpoint.current = cp; }
  async function execute(cp: GameCheckpoint) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null); pending.current = cp;
    try {
      persist(cp);
      const next = cp.finish ? await requestGameFinish(learnerId, cp.gameId, cp.finish.actionId) : await gameRequest(learnerId, cp.gameId, cp.pending ?? undefined, cp.config);
      if (next.emptyReason && next.status !== "paused-content") { clearGameCheckpoint(userId, learnerId); checkpoint.current = null; }
      else persist({ ...cp, created: true, pending: null, finish: undefined, feedback: Boolean(cp.pending), draft: null });
      setSession(next); setOffer(null); setFeedback(Boolean(cp.pending)); setDraft(null); pending.current = null;
    } catch (failure) { setError(errorCode(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function save(action?: FishGameAction, config?: FishGameConfig) {
    if (lock.current) return;
    const cp: GameCheckpoint = pending.current ?? { version: 1, userId, learnerId, gameId: action ? session!.gameId : crypto.randomUUID(),
      config: action ? session!.config : config ?? { source: { kind: "learned" }, cue: "image" }, created: Boolean(action), pending: action ?? null, feedback, draft };
    await execute(cp);
  }
  async function load(cp: GameCheckpoint, showFeedback: boolean) {
    if (lock.current) return; lock.current = true; setBusy(true); setError(null);
    try {
      const next = await readGameSession(learnerId, cp.gameId);
      const nextDraft = cp.draft?.questionId === next.current?.questionId ? cp.draft : null;
      persist({ ...cp, created: true, pending: null, feedback: showFeedback && Boolean(next.feedback), draft: nextDraft });
      setSession(next); setFeedback(showFeedback && Boolean(next.feedback)); setDraft(nextDraft); setOffer(null); pending.current = null;
    } catch (failure) { setError(errorCode(failure)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function resume() {
    let cp = offer ?? checkpoint.current;
    if (!cp) { try { cp = readGameCheckpoint(userId, learnerId); } catch (failure) { setError(errorCode(failure)); return; } }
    if (!cp) { setError(null); return; }
    if (!cp.created || cp.pending || cp.finish) await execute(cp); else await load(cp, cp.feedback);
  }
  async function retry() {
    if (pending.current) return execute(pending.current);
    if (offer || !session) return resume();
    try { persist({ version: 1, userId, learnerId, gameId: session.gameId, config: session.config, created: true, pending: null, feedback, draft }); setError(null); }
    catch (failure) { setError(errorCode(failure)); }
  }
  function writeDraft(questionId: string, text: string) {
    const next = { questionId, text }; setDraft(next);
    if (!session) return;
    try { persist({ version: 1, userId, learnerId, gameId: session.gameId, config: session.config, created: true, pending: null, feedback, draft: next }); }
    catch (failure) { setError(errorCode(failure)); }
  }
  function pause() {
    if (!session || lock.current || pending.current) return;
    const cp: GameCheckpoint = { version: 1, userId, learnerId, gameId: session.gameId, config: session.config, created: true, pending: null, feedback, draft };
    try { persist(cp); setOffer(cp); setSession(null); setFeedback(false); setError(null); }
    catch (failure) { setError(errorCode(failure)); }
  }
  function next() {
    if (!session || lock.current) return;
    try { persist({ version: 1, userId, learnerId, gameId: session.gameId, config: session.config, created: true, pending: null, feedback: false, draft: null }); setFeedback(false); setDraft(null); }
    catch (failure) { setError(errorCode(failure)); }
  }
  function newSession() {
    if (lock.current) return;
    try { clearGameCheckpoint(userId, learnerId); checkpoint.current = null; pending.current = null; setSession(null); setOffer(null); setFeedback(false); setDraft(null); setError(null); }
    catch (failure) { setError(errorCode(failure)); }
  }
  async function reconcile() { const cp = checkpoint.current; if (cp) await load(cp, true); }
  async function finish() { if (!session || lock.current || pending.current) return; await execute({ version: 1, userId, learnerId, gameId: session.gameId, config: session.config, created: true, pending: null, finish: { actionId: crypto.randomUUID() }, feedback: false, draft: null }); }
  return { session, offer, feedback, busy, error, draft, save, retry, resume, pause, next, newSession, writeDraft, reconcile, finish };
}
