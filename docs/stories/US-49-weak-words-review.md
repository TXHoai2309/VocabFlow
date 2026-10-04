# US-49 — Weak Words / Need Review

- Status: `ACCEPTED` (implementation and acceptance evidence recorded,
  2026-10-04).
- Owner: Product owner.
- Depends on: US-06 scheduler, US-07 review persistence, US-08 review queue,
  US-21 learner isolation, US-27 vocabulary topics, US-28/29 learning-set
  membership, US-35/36 activity dates, and US-46 Saved Vocabulary voluntary
  review semantics.
- This story is authorized directly by the owner's Feature #12 request.
  Dataset V2, database mutation, migrations, production and deployment remain
  outside scope.

## 1. Sources of truth

- [Product Specification](../product/product-spec.md).
- [Technical Architecture](../architecture/technical-architecture.md).
- [Global Design System](../design/design-system.md).
- [Feature UI Specification](../design/feature-ui-spec.md#weak-words-us-49).
- [User Flow](../flow/user-flow.md#weak-words-extension-us-49).
- [DEC-024 Weak-word classification and study scope](../decisions.md#dec-024--weak-word-classification-and-study-scope).
- US-08, US-14, US-21, US-35/36, US-46, US-47, and US-48.

## 2. User story

As a learner in an active learner profile, I can find vocabulary that needs
attention and start a review of the actual weak words without searching for
them individually.

## 3. In scope

- Learner-authorized, read-only `GET /api/learners/:learnerId/weak-words` with
  English/Vietnamese search, Weak/Learning/Stable filter and bounded pagination.
- A `/weak-words` page with real aggregate summaries, accessible status and
  due indicators, media-safe vocabulary rows, loading/error/empty/no-result
  states and a bulk Study Setup action.
- A canonical review-queue `scope=weak` resolved on the server for the
  authorized learner. It contains Weak candidates only, orders truly due items
  before voluntary not-due Weak items, and never accepts vocabulary IDs from
  the client.
- Study Setup recognizes `weak=1`, shows the source and available queue size,
  and offers a review-only start action. Study and Session Summary preserve the
  scope. Every persisted answer continues through the existing review API and
  scheduler.
- Responsive layout, accessible text badges, runtime vocabulary links/media,
  deterministic ordering and regression coverage for existing scopes.

## 4. Out of scope

- Dataset V2 content, schemas, fixtures, reports, scripts and pipeline.
- New persistent weakness/scheduler state, migrations, database writes, review
  write variants, direct progress mutation, client-supplied ID lists, browser
  storage or a second scheduler.
- Topic/level filters, per-row single-word study target, advanced analytics,
  content authoring, Home/Progress redesign, production DB, deployment or merge.

## 5. Deterministic domain rules

- Accessible vocabulary is the distinct intersection of enabled runtime
  vocabulary and the learner's active assignments to enabled Learning Sets.
- Recent per-word evidence is the latest ten persisted `REMEMBERED` or
  `FORGOTTEN` review events whose household-local `review_date` falls in the
  inclusive 30-day window ending today. Order ties by `review_id` descending.
- `Weak`: at least two events in that window and exact accuracy
  `remembered / reviewCount < 60%`. Displayed percentages are rounded; the
  classification uses the exact ratio.
- `Learning`: current `learner_progress.status = LEARNING` and not Weak.
- `Stable`: current status is `MASTERED` and not Weak. Mastered may still be
  Due; that is an independent scheduler axis.
- The page contains progressed `LEARNING` or `MASTERED` words in the
  accessible domain. No-history and insufficient-history words cannot be Weak.
- Summary Due is the unique current accessible vocabulary with
  `next_review_date <= household-local today`. Recent summary accuracy uses all
  persisted valid events in the same inclusive 30-day window; it is null when
  the denominator is zero.
- Default order: Weak overdue, Weak due today, Weak not due; Learning overdue,
  due today, upcoming, unscheduled; Stable overdue, due today, upcoming,
  unscheduled. Within each group, lower recent accuracy first, then earlier
  scheduled date, then vocabulary ID. Missing accuracy sorts last.
- Study queue items with `next_review_date <= today` are `DUE`; Weak items with
  later or absent dates are `VOLUNTARY`. Both use the canonical review write.

## 6. API and authorization

- `GET /api/learners/:learnerId/weak-words?q=&status=&page=&pageSize=` returns
  `{ learnerId, reviewDate, summary, items, pagination }`.
- Search matches canonical English word or effective Vietnamese meaning.
  Status is `weak|learning|stable`; page defaults to 1, page size to 20 and is
  capped at 50. Unknown, duplicate or malformed query parameters return 400.
- Summary contains weak count, unique due count, recent accuracy (nullable),
  and valid review count. Rows contain canonical vocabulary, current learning
  state, weakness status, recent accuracy/counts, next review date, due state
  and days until due.
- Session authorization is followed by the canonical household-owned learner
  guard. Unauthenticated is 401; another household is 403. Errors are safe.
- One set-based SQL read aggregates the active domain, current progress and
  bounded-window review signals. No per-word query is issued. Existing
  learner/review indexes are reused.
- No persistence change; `MIGRATION_REQUIRED = NO` and database mutations = 0.

## 7. Study scope

- The page CTA opens `/study/setup?weak=1`.
- Study Setup starts at `/study?weak=1&count=N&content=all` after the learner
  chooses the amount. The server resolves the Weak words for that learner;
  the URL contains no vocabulary ID list.
- Only Weak records are admitted. Truly due items remain `DUE`; not-due records
  are `VOLUNTARY`. Due items precede voluntary ones. New mode and daily-New
  allowance do not apply.
- There is no per-row CTA in this slice. Session Summary “Học tiếp” preserves
  `weak=1`; setup resolves the then-current canonical candidates again. An
  empty scope returns a clear empty state without creating a session.

## 8. Acceptance criteria

- AC-01: No review history, one Forgotten review, or insufficient sample does
  not create a Weak classification. Two-or-more-review low accuracy does.
- AC-02: Classification is deterministic, recent-window bounded and uses
  exact ratio; strong histories classify only current `MASTERED` as Stable.
- AC-03: Learning remains independent of Weak; Stable remains independent of
  due. Weak overdue, due-today, future and unscheduled states are distinguishable.
- AC-04: Disabled and out-of-active-set vocabulary is excluded from summary,
  list and Weak queue. Another learner cannot access the endpoint.
- AC-05: Counts, event denominator, duplicate persisted event semantics,
  null accuracy and local-date window are correct.
- AC-06: Search covers English and Vietnamese, status filtering works, page
  size is bounded, and ordering/ties are deterministic.
- AC-07: API response is validated, learner-scoped and returns at most the
  requested page; failures leave AppShell intact.
- AC-08: Bulk CTA opens review-only Weak setup, which resolves learner-specific
  candidates server-side without passing IDs. DUE and VOLUNTARY types are
  truthful, and review writes remain canonical.
- AC-09: Study Setup, Study, and Session Summary preserve `weak=1`; when no
  Weak candidates remain, setup shows a useful empty state.
- AC-10: Existing global, Topic, Learning Set, Saved, New/Review/Mixed, Saved
  VOLUNTARY, Daily Goal and Continue Learning behavior remains unchanged.
- AC-11: Desktop and mobile layouts do not overflow; status is text-backed,
  audio controls are accessible, and loading, error and empty states are
  announced appropriately.
- AC-12: No migration or database mutation is performed; no Dataset V2 file is
  changed, staged or committed.

## 9. Validation plan

- API/classification, queue, Study Setup, Study, Summary and Weak Words page
  focused tests; regressions for Saved, Topic, Learning Set, Daily Goal,
  Continue Learning and Progress.
- `pnpm typecheck`, `pnpm build`, ESLint for changed TS/TSX, and
  `git diff --check`.
- If an unrelated Dataset V2 TypeScript file blocks root typecheck, stage only
  this story's feature files, stash only unstaged/untracked outside-scope files
  with `--keep-index -u`, validate, then restore and verify all user work.
- Stage only reviewed US-49 files. If all gates pass, commit as
  `feat: add weak words review` and push `TXH` to `origin`; no merge/deploy.

## 10. Implementation evidence

Implemented the learner-authorized Weak Words API and `/weak-words` page,
including search, status filtering, 20/50-bounded pagination, real summary and
review signals, responsive list rows, accessible media controls, and loading,
error, empty and no-result states. The UI's bulk action opens
`/study/setup?weak=1`; Setup and Session Summary preserve that scope, and the
server resolves up to 30 Weak candidates with true DUE/VOLUNTARY queue types.
Per-word “Ôn ngay” remains deferred; all reviews use the existing canonical
review endpoint and scheduler.

Audit confirmed `review_events.result` is `REMEMBERED` or `FORGOTTEN`, with
`review_date`, `reviewed_at`, `review_id`, `learner_id`, and `vocabulary_id`;
current progress is `LEARNING`/`MASTERED`; due is
`next_review_date <= household-local today`; active-set vocabulary is the
canonical Study domain. The read path runs three SQL statements (learner
authorization, household timezone, one set-based aggregate), with no
per-vocabulary query. It adds no persistence or migration and performs no
database mutation.

Validation: focused Weak Words/API/Study/Saved/Daily Goal/Continue Learning/
Progress regression suites passed (15 files, 152 tests), plus the focused
Weak Words AppShell route test (1 test). Feature TypeScript/TSX ESLint,
`pnpm typecheck`, `pnpm build`, and `git diff --check` passed. Build emitted
the existing Node engine mismatch and bundle-size/dynamic-import notices but
completed successfully. No Dataset V2 file was changed by this feature.
