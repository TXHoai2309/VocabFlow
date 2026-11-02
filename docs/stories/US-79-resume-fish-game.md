# US-79 — Tiếp tục ván trên thiết bị (ticket10)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01. Blocker08/US77 ACCEPTED;09 also ACCEPTED.

## Contract before code

Reuse canonical game GET/create/actions and pinned queue/config/rulesVersion;
no new migration or reward write. Device checkpoint key includes authenticated
user+learner, stores only gameId/config/created/pending action/feedback/draft.
No client-authored hearts/points/queue. Reload offers canonical same game,
including2 hearts, partial queue, last feedback and0-heart finality. Confirmed
missing/incompatible checkpoint never recreates a game silently. Explicit new
game clears only pointer and starts a different ID at5/0; old state retained.

Persist pending ID/text before POST. Failed storage sends no write; uncertain
response replays the same action, including after reload. Creation uses stable
ID and config; created=false can recover through idempotent POST. Storage failure
after server commit leaves pending action for safe confirmation. Corrupt/unreadable
storage is explained and preserved, not auto-wiped. Draft remains visible and
recoverable. Explicit pause saves pointer/feedback/draft and returns resume offer;
server game remains in progress (no clock), so no finalized result is fabricated.
Changing source/cue requires new-game action and resets score/hearts; never merge.
Cross-account/learner namespaces do not expose old drafts. Competing stale action
offers canonical reconciliation instead of overwriting first outcome.

## Acceptance / evidence required

All4 ticket/common criteria. Browser2 hearts→reload still2, same fish/queue;
uncertain committed action→reload→one receipt; typed draft/feedback/lost summary,
pause/resume, explicit new cue/source at5/0, storage failures/corruption/account
isolation. API authoritative GET/replay/auth and SQL snapshot/readback remain
covered; relevant lint/typecheck/build/tests. No done without actual evidence.

READY FOR IMPLEMENTATION recorded before code.

Gate passed; now IN PROGRESS.

Acceptance:12 Chromium game scenarios, changed-source ESLint/typecheck/build and actual local PostgreSQL rollback PASS. Same-device canonical resume at2/0 hearts, draft/audio/pause, uncertain replay, new-source5/0, storage failure/corruption and account isolation verified.
