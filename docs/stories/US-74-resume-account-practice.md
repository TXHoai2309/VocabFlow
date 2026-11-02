# US-74 — Tiếp tục Luyện tự do trên thiết bị (ticket 05)

- Status: ACCEPTED
- Assignment: owner sequential execution 2026-11-01.
- Blocker02 ACCEPTED; current03/04 also accepted, 31 tests/14 browser flows and
  SQL rollback evidence. No provider dependency; no cloud migration.

## Contract before code

Use existing authenticated GET session, with a browser checkpoint containing
version,userId,learnerId,sessionId,config,pendingAction and transient feedback/
typed-draft identity. Namespace by account AND learner; no answer key/whole
private server state in browser persistence. Validate checkpoint with shared
schemas and exact account scope before any read. No cross-device active-session
lookup; only explicit same-device pointer restores. Completed session shows
completion/summary, not a new active question; new start gets new ID.

Server GET and new action validate unanswered content pins (enabled ID,
contentVersion/hash and permitted cue URL) against current authorized content.
It must not silently substitute source/content. Already committed action replay
precedes freshness checking so retry cannot become a second result; old history
remains immutable. Source membership is snapshotted, so later unsaving/reordering
does not replace the queue. Incompatible content gives typed409
STALE_PRACTICE_CONTENT; historical results remain stored and UI offers explicit
new start. Foreign ownership remains403 and no cache.

Before sending a write, persist session/config/pending action to localStorage;
storage failure stops the request and leaves the action retryable. After server
confirmation, update pointer/feedback, retaining pending action if that local
write fails; replay reconciles without another result. Restore canonical session
first; pending action is retried explicitly with its original ID. Reload never
regenerates IDs/queue. Typed drafts save independently with questionId and are
discarded only when a different canonical question is served. Explicit new start
replaces this device pointer only, preserving account history.

UI reuses current focus/loading/error/feedback; bootstrap checkpoint loading is
honest. Corrupt/unavailable/incompatible local data is explained; no silent wipe.
Logout/account switch unmounts UI; account namespace prevents another user seeing
the checkpoint. Resume only after same authenticated context is resolved.

## Verification gate

All five criteria/common constraints apply. API: changed pins, exact replay after
change, foreign IDs. Browser: reload after answer, pending failed response,
typed draft, completion, storage failure, corrupt checkpoint, account isolation
and incompatible content. Typecheck/lint/build and focused regressions, extend
local PostgreSQL rehearsal. No ACCEPTED status before recorded evidence.

## Evidence

READY FOR IMPLEMENTATION contract recorded before code.
Gate passed; now IN PROGRESS.

Acceptance: 32 scoped API/reader tests; 21 full Chromium flows PASS. After fixing
the React lint finding with a synchronous lazy storage initializer, all eight
relevant reload/checkpoint/source-intersection browser cases re-pass. Latest
typecheck, changed-source ESLint and build PASS. PostgreSQL rollback rehearsal
checks stale pins/new-write rejection and exact committed replay, plus unchanged
progress/review/XP/full vocabulary-row hash. No persistent migration/cloud action.
Checkpoint I/O failures, corrupt data, account namespace isolation, pending replay,
typed drafts and completed-summary restore are covered through the browser.
