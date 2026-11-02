# US-88 — Lịch sử và tiếp tục bài video (ticket20)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01.18/US87 ACCEPTED with full gate evidence.

## Contract to ready before code

Extend existing private video practice service/repository (no migration) with
GET base?page=20 bounded entries and GET id/results?page=20 resolved-only source
snapshots/first outcomes. Historical reads don't require live player or current
transcript availability; retain pinned hash/version/answers. Existing session
GET/new answers require matching source pin; replacement never regenerates gaps.
History labels distinguish viewed position/bookmarks from attempted/resolved
practice. Watched time never produces comprehension/progress credit.

Same-device checkpoint under user+learner+video holds sessionId/creation config,
created flag, pending action, feedback and typed draft. Save pending before any
POST; failure retains pointer/input, reload canonical GET plus exact replay;
missing known-created/stale pin explains and offers explicit new attempt while
preserving history. Uncertain creation retries same ID/pins. Completion remains
complete. Explicit retry is new session ID, never overwrites first outcomes.
No cross-device active-session promise and no provider/translation call on resume.

Library→video offers resume/link to history for this device, including draft
and fixed gap; no current source text displayed until user chooses Xem hiểu.
Opening Xem hiểu while a device session has unresolved current question saves
reveal with a stable pending ID before mounting full subtitle text. This covers
back/direct same-device navigation and a second tab. Completed feedback remains
historical; full-view exposure affects only current unresolved question.
Failed reveal keeps text hidden with retry; no source bypass on error.
Account/learner namespace remount+cancel old reads prevents prior draft leakage.
Checkpoint corruption/storage failures explained/preserved, new attempt explicit.

## Acceptance before done

Full4 ticket/common criteria. Browser gap→exit/library→resume same gap/draft,
uncertain action→reload→one result, same first outcomes/history/new attempt,
source replacement and pin failure, storage failure/account isolation. API
private paging/resolved-only snapshots and actual SQL history/readback/no SRS/
rewards/catalog side effects. Final root lint/typecheck/test/build and complete
relevant Chromium suites; existing E2E regression as feasible. No done without
recorded evidence; provider15/16 blockers and dependent19/21 remain explicit.

READY FOR IMPLEMENTATION recorded before code.

Gate passed; IN PROGRESS recorded before implementation.

## Acceptance evidence

Full Chromium126PASS/1 intentionally skipped live case; final video14PASS and separate actual public YouTube playback/130s seek1PASS. Draft→library→same-device resume, pending save→reload→one outcome, completion and immutable first history/new session, storage/corrupt/account/pin failures, direct-source guard/retry and feedback without future reveals verified. Desktop/mobile screenshots inspected. Video API+schema18PASS. Local PostgreSQL rollback through0030 verifies private first results/readback/replay/history22 rows20+2 paging and unchanged full scheduled-progress/review/XP/catalog hashes. Root lint, final sequential typecheck, release120files1409tests, final build/secret+map scan, scoped ESLint and strict UI audit0 PASS. Prepared changes only; no durable/cloud migration or release. Full evidence `.scratch/practice-game-video-20261101/evidence/final-verification.md`.
