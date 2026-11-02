# US-80 — Khách chơi và tiếp tục ván (ticket11)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01;09/US78 and10/US79 ACCEPTED.

## Contract before code

Same game UI/domain/config/cycling/hearts and checkpoint lifecycle. Dispatch
GUEST_ID client transport to separate `vocabflow.game.guest.v1` store. Strict
schema and pure consistency validation for pinned pool/queue/current/receipts,
derived hearts/score/first-result chronology, identity and rule version. Read-only
guest learned/saved metadata and public index/fresh bounded details; never invoke
main guest catalog reconciliation or mutate `vocabflow.guest.v1`.

Serialize mutations via Web Locks; refuse unsafe writes without locks. Persist
before success; storage failure/corruption never wipes games or advances UI.
Fresh content/media guard for current fish on GET/new resolution; exact receipt
replay before freshness. No private API writes, automatic guest import or account
game reads. Namespace checkpoint by guest identity, preserve independent account
checkpoint/store. Changing account/learner remounts state; no draft disclosure.
No new migration or provider, no vocabulary/media/SRS/XP/streak writes.

## Acceptance before done

All3 ticket/common criteria: image/audio/mixed guest game→exit/reload→resume→loss,
same rules/cycles/source, local bytes snapshot for scheduled guest learning,
zero private writes, store-write failure/retry, corrupt state, missing lock,
stale content and two-window receipt race, account separation. Appropriate
lint/typecheck/build/browser regressions; docs/tracker/hash evidence synchronized.

READY FOR IMPLEMENTATION recorded before code.

Gate passed; now IN PROGRESS.

Acceptance:7 guest game scenarios PASS in combined run;3 cue cases rerun with0-heart reload/mobile also PASS. Account game12 and guest practice13 regressions verified (one fixture race corrected by awaiting committed feedback, then focused PASS).26 API checks, ESLint/typecheck/build PASS. Scheduled guest blob byte-identical, no private API writes, real Web Locks/storage exercised.
