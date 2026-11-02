# US-75 — Luyện tự do cho khách (ticket 06)

- Status: ACCEPTED
- Assignment: owner sequential execution2026-11-01.
- Blockers03/04/05 all ACCEPTED (US72–74). Latest evidence32 tests/21 full browser
  flows +8 focused rechecks, SQL rollback; no provider/migration dependency.

## Contract before code

Use exactly the same config/source/generation/grading/first-result rules through
learning-domain. Fixed GUEST_ID transport routes locally, never to private API.
Read validated guest sparse progress/saved IDs, public enabled index and scoped
public detail batches only. New read-only practice index/detail helpers must not
invoke catalog reconciliation or mutate existing guest SRS. Index/set/CEFR and
saved/learned predicates filter IDs before content requests; no broadening.
Public media authorization remains server-owned. No account content borrowing.

Durable guest practice store is `vocabflow.practice.guest.v1`, separate from
`vocabflow.guest.v1` and account checkpoints. Validate version/private state and
bounded config/actions; store sessions with createdAt. Web Locks serialize the
read-modify-write, retry checks exact action and first outcome before committing.
Persist before returning success; failed/corrupt/unavailable storage does not
advance or wipe prior sessions. Missing Web Locks refuses mutation. Results and
session history persist now; history discovery/retry UI is ticket07.

Reuse the current practice UI and checkpoint lifecycle under guest namespace.
Source=learned reads only guest progress; set/level/saved remain explicit. Guest
summary says saved on this browser, not account sync; clearing browser data loses
it. Registration recommends account sync but does not auto-import this history.
Login/logout switches namespaces and never copies or merges guest data.

Freshness compares pinned public IDs/versions/hash/media on resume/new writes;
exact receipt replay remains possible without regrading. No scheduler/review/XP/
streak writes. No changes to existing guest persistence format. No new migration.

## Acceptance / verification

All four ticket06 criteria/common constraints apply. Browser matrix image/audio/
mixed × choice/type, source/count, reload/draft/first result, failed guest-store
write and replay, missing lock, account transition, no private API write, and exact
guest learning-state snapshot before/after. Bounded public I/O and corrupt store
tests; relevant existing guest regressions. Typecheck/lint/build before ACCEPTED.

## Evidence

READY FOR IMPLEMENTATION recorded before code.
Gate passed; now IN PROGRESS.

Acceptance: all12 guest browser scenarios verified (11 in the full run; the
account-entry fixture was corrected to await confirmed persistence, then both
account-entry and two-tab cases pass focused rerun). Includes all6 cue/mode
combinations, source-only details, no private writes, byte-identical scheduled
guest state, draft/reload, failed write, Web Locks refusal, corrupt-data
preservation and separate account namespace. Typecheck/build/changed-source
ESLint PASS. Public content and Audio are I/O fixtures; real app storage and
Web Locks are exercised, not mocked helpers. Group-A regression gates remain07.
