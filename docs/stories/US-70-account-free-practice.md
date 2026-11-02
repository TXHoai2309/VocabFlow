# US-70 — Luyện ảnh chọn từ, kết quả tài khoản riêng

- Status: ACCEPTED
- Owner: Project Owner; assigned to this agent 2026-11-01 in the execution request for tickets 01–21.
- Tracker: `.scratch/practice-game-video-20261101/issues/01-account-image-choice.md`
- Gate: approved spec and ticket are the product authority; the owner explicitly authorizes creating the technical contract and implementing it without another interview.

## Outcome and dependencies

An authenticated learner opens `/practice`, starts image-choice practice from
their learned words, answers/reveals/skips, receives saved feedback and a summary.
Existing auth/household ownership, vocabulary/media readers and PostgreSQL are
available. No other feature ticket blocks 01. The existing exercise route writes
scheduled reviews and is not a free-practice implementation.

## Approved scope and acceptance

All five criteria and common constraints in ticket 01 apply. At most ten distinct
learned Sense IDs; display actual eligible count without expanding the source.
Four normalized distinct words with non-overlapping meanings, safe image mapping;
empty/insufficient sources explain the reason. First answer is authoritative;
revealed, skipped and technical outcomes stay separate. Accuracy is
correct/(correct+incorrect), null for no answers. No timer or SRS/XP/streak writes.
Source/count selection, listening, typing, browser resume, guests and history
discovery are subsequent tickets, not acceptance claims for this slice.

## Technical contract

- Shared Zod request/response DTOs in `packages/contracts`; pure generation,
  first-outcome and summary rules in `packages/learning-domain`.
- `POST /api/learners/:learnerId/practice-sessions` accepts only UUID sessionId.
  It snapshots the authorized learned source, eligible images, contentVersion,
  answer and opaque question/option IDs. Repeating creation returns that session.
- `GET /api/learners/:learnerId/practice-sessions/:sessionId` reads saved state.
- `POST .../:sessionId/actions` accepts UUID actionId/questionId and a strict
  answer/reveal/skip/technical-skip discriminated action. Client outcome, scores
  and progress fields are rejected. Only the current question can be resolved.
- Responses expose current question, neutral image cue, opaque options, counts,
  saved feedback and completion; never the answer key before resolution.
- Every operation requires Better Auth session (401), then existing household
  learner ownership (403). Foreign session IDs are absent (404); no shared cache.
- Additive migration 0025: `practice_sessions` composite learner/session PK,
  server JSON state, revision and created_at. No changes to existing content,
  media, auth or learning tables. Prepare migration for review; no cloud apply.
- First writes use INSERT ON CONFLICT; actions use revision compare-and-swap.
  Each question gets one outcome. Exact action replay returns saved state;
  reused action ID with a different payload or stale question is 409.
  Concurrent CAS loss re-reads before retry. No partial outcome/advance.
- Existing vocabulary/media sanitization runs before question eligibility,
  not merely on an outgoing response after a session has already started.

## UX and recovery

Focused task layout in the existing AppShell; entry from Study Setup. Reuse
styles.css buttons/card/choice styles and shared async-states. No new tokens.
Vietnamese copy, neutral alt, keyboard focus and 44px targets. Image load failure
blocks answering, offers reload or technical skip without incorrect result.
Save failure retains the exact pending action and question; retry resends it.
Busy locks duplicate submit; feedback is explicit text before Next. Account
context remount clears private in-memory state on logout/account change.

## Verification and completion gate

API tests exercise real service through Hono with persistence I/O boundary:
401/403/404, invalid forged input, first result, duplicate/concurrent actions,
empty/invalid media/options and snapshots of learning state before/after.
Browser tests exercise start → answers/reveal/skip/media failure → summary,
failed save/retry, keyboard and narrow viewport. Migration static checks and
repository lint/typecheck/test/build/E2E as appropriate. Trusted DB integration
only in trusted CI; do not substitute fixture success for live DB evidence.
ACCEPTED requires recorded evidence. No commit/push/cloud operation authorized.

## Evidence

2026-11-01: READY FOR IMPLEMENTATION contract recorded before code; moved to
IN PROGRESS after verifying dependencies. No acceptance claim yet.

2026-11-01 acceptance: 117/117 focused API/web regression tests; 5/5 Chromium
E2E (desktop, 390px mobile, keyboard, empty, media error, uncertain save/retry).
Root typecheck, production build and changed-file ESLint pass; diff whitespace
check passes. Local PostgreSQL rollback-only migration rehearsal passes actual
service create/action/retry/readback, 401/403, runtime grant inspection and exact
before/after progress/review/XP/catalog snapshots. It caught and fixed JSONB key
ordering in replay comparison. No persistent migration or cloud operation ran.
Screenshots: tracker `evidence/01-mobile.png`, `01-desktop.png`. Browser API tests
use real Hono/service/domain and an in-memory storage I/O boundary; PostgreSQL is
verified separately. Trusted CI DB migration remains a release gate, not claimed.
The optional external premium audit script disappeared when its plugin was
removed during this run; changed-source ESLint/browser/repo checks still ran.
