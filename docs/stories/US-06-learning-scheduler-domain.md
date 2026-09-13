# US-06 — Learning Scheduler Domain

- Status: ACCEPTED
- Batch: BATCH 4 — Learning Scheduler Domain
- Owner: Project Owner
- Last updated: 2026-09-13
- Baseline commit: `d4bdf4fb934950cd6a90c91b981871fdc8fbb078`
- Scope: PURE_SCHEDULER_DOMAIN

## 1. User Story

As the learning backend, I want a deterministic scheduler domain function that
evaluates a scheduled `REMEMBERED` or `FORGOTTEN` result so that later review
writes can persist one server-authoritative learning transition for the
correct learner and vocabulary item.

## 2. Problem and Outcome

US-05 ends at the accepted `first-flashcard-ready` handoff. The repository now
needs the smallest domain-only step that gives the later review API a tested
learning transition without introducing a write path, queue, session or UI.

US-06 reaches `scheduler-domain-ready` when `packages/learning-domain` exports
an explicit, deterministic scheduled-evaluation function, all virtual-`NEW`
and existing-state transitions are covered by exhaustive tests, calendar dates
are explicit inputs, and invalid domain values fail deterministically. The
function returns scheduler-owned canonical progress values only; a later API
story remains responsible for authorization, revision checks and persistence.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#4--learning-engine)
  — learning states, intervals, scheduled versus reinforcement evaluation and
  state transitions.
- [Family MVP Product Specification](../product/product-spec.md#5--session-lifecycle--edge-cases)
  — no overdue bonus and the session-local reinforcement boundary.
- [Technical Architecture — Learning Domain & Scheduler](../architecture/technical-architecture.md#8-learning-domain--scheduler)
  — pure-function boundary, virtual `NEW`, exact transitions and household
  calendar-date ownership.
- [Technical Architecture — Review Write Architecture](../architecture/technical-architecture.md#9-review-write-architecture)
  — later API read/compute/write boundary, sparse first-review persistence and
  revision/idempotency ownership.
- [Technical Architecture — Learning Domain Testing](../architecture/technical-architecture.md#14-testing-strategy)
  — required learning-domain and timezone test coverage.
- [Technical Architecture — Implementation Sequence](../architecture/technical-architecture.md#17-implementation-sequence--vertical-slice)
  — Step 5 is the scheduler package and exhaustive unit-test milestone.
- [User Story System](README.md)
  — `READY FOR CONTRACT REVIEW` is a review gate, not implementation
  permission.
- [US-05 First Real Flashcard](US-05-first-real-flashcard.md)
  — accepted `first-flashcard-ready` upstream handoff and explicit exclusion
  of scheduler/review behavior.

## 4. Dependencies and Input Boundary

- BATCH 0 Foundation is `ACCEPTED` and frozen.
- US-01 Parent Registration, US-02 Parent Login, US-03 Learner Profile
  Creation & Resolution, US-04 Vocabulary Content Seed & Read Foundation and
  US-05 First Real Flashcard are `ACCEPTED`.
- The upstream product handoff is `first-flashcard-ready`. It proves that the
  accepted vocabulary and learner-context flow exists; it does not provide
  scheduler state or authorize a review.
- The approved learning-state rules in Product Specification and Technical
  Architecture are the second contract input. No client-authored next state is
  accepted.

The scheduler input is deliberately independent of learner/vocabulary IDs,
HTTP, sessions and storage. `currentState` is always an explicit domain state;
the later sparse-progress adapter maps a missing database row to the canonical
virtual `NEW` object before calling the scheduler:

```ts
type LocalDate = string; // runtime-valid YYYY-MM-DD calendar date
type LearningStatus = "NEW" | "LEARNING" | "MASTERED";
type ReviewResult = "REMEMBERED" | "FORGOTTEN";

type SchedulerInput = {
  currentState: SchedulerState;
  result: ReviewResult;
  today: LocalDate;
};
```

Virtual `NEW` is represented explicitly by `status: "NEW"`; `null` is not a
valid scheduler state. A missing row is not created by this story. `today` is
supplied by the trusted later service after resolving the
household-local calendar date; the scheduler never reads a system clock or
browser timezone.

## 5. Success Boundary

The single approved output boundary is:

```text
scheduler-domain-ready
```

This means a later server review-write story can call the domain function with
canonical state, a scheduled result and an explicit local date, receive a
validated next state, and then persist it. It does not mean that a review was
accepted, a progress row was written, a review event was created or a session
queue was changed.

## 6. In Scope

- A pure `packages/learning-domain` scheduler function and its domain types.
- `NEW`, `LEARNING` and `MASTERED` state semantics, including sparse virtual
  `NEW`.
- Scheduled `REMEMBERED` and `FORGOTTEN` transitions for NEW and existing
  states.
- Exact 1/3/7/14/30-day interval selection and status thresholds.
- Counter, first/last/next calendar-date and deterministic output rules.
- Explicit valid-date parsing and calendar-day addition, including date
  rollover behavior.
- Deterministic invalid-input handling with domain errors, not HTTP errors.
- Exhaustive table-driven unit tests and regression coverage.

## 7. Out of Scope

- `POST /api/reviews`, any API route, request/response HTTP contract or API
  error envelope.
- Authentication, household authorization, learner/vocabulary identity,
  `reviewId`, `expectedRevision`, request fingerprints and idempotency.
- `learner_progress` or `review_events` schema, migration, seed, query,
  transaction or write behavior.
- Review Queue due/new selection, ordering, limits or sparse `LEFT JOIN`.
- Session state, session summary, card reinsertion or reinforcement queue
  behavior.
- React/UI/browser work, flashcard controls, route changes and browser date
  or timezone access.
- Learner progress reads, parent progress summaries, analytics or dashboard
  behavior.
- Offline writes, cache synchronization, media behavior and any US-07 work.

## 8. Pure-Function Boundary

The implementation belongs in `packages/learning-domain`. It may use only
TypeScript/JavaScript standard-library behavior needed for domain validation
and calendar arithmetic. It must not import or know about React, Hono,
Drizzle, Neon, Better Auth, HTTP, cookies, sessions, database transactions or
environment variables.

The function must be referentially transparent: identical valid input values
produce deeply equal output values and no observable side effects. It must not
generate IDs, read the current time, derive a timezone, access storage or
mutate the supplied state object.

## 9. Domain Input and Output Contract

The following is the owner-approved domain contract. It is a domain snapshot,
not a database DTO:

```ts
type LocalDate = string; // exactly YYYY-MM-DD and a real calendar date
type ReviewResult = "REMEMBERED" | "FORGOTTEN";

type VirtualNewState = {
  status: "NEW";
  consecutiveCorrect: 0;
  intervalDays: 0;
  firstLearnedDate: null;
  lastReviewedDate: null;
  nextReviewDate: null;
  totalCorrect: 0;
  totalIncorrect: 0;
};

type ExistingLearningState = {
  status: "LEARNING" | "MASTERED";
  consecutiveCorrect: number;
  intervalDays: number;
  firstLearnedDate: LocalDate;
  lastReviewedDate: LocalDate;
  nextReviewDate: LocalDate;
  totalCorrect: number;
  totalIncorrect: number;
};

type SchedulerState = VirtualNewState | ExistingLearningState;

type SchedulerInput = {
  currentState: SchedulerState;
  result: ReviewResult;
  today: LocalDate;
};

type SchedulerOutput = {
  status: "LEARNING" | "MASTERED";
  consecutiveCorrect: number;
  intervalDays: 1 | 3 | 7 | 14 | 30;
  firstLearnedDate: LocalDate;
  lastReviewedDate: LocalDate;
  nextReviewDate: LocalDate;
  totalCorrect: number;
  totalIncorrect: number;
};

function scheduleReview(input: SchedulerInput): SchedulerOutput;
```

Runtime validation is part of the domain boundary even when TypeScript types
are present. `currentState.status === "NEW"` is the canonical virtual state;
the normal successful output always materializes a non-`NEW` state. The later
persistence adapter may insert the first row.

No existing scheduler export naming convention exists in the current package;
`scheduleReview` is the approved function name for this contract.

The scheduler does not accept or return `learnerId`, `vocabularyId`,
`reviewId`, `expectedRevision`, `revision`, `reviewedAt`, request fingerprints,
database timestamps or other storage-only fields. A later service maps this
domain output into its authorized atomic persistence operation.

## 10. Valid State Invariants

The scheduler rejects a malformed cross-field state rather than silently
repairing it:

- `NEW` is exactly the virtual state: zero counters, zero interval and all
  three dates `null`.
- `LEARNING` has a non-negative integer `consecutiveCorrect` in the
  `0..3` range and `intervalDays >= 1`.
- `MASTERED` has an integer `consecutiveCorrect >= 4` and `intervalDays >= 14`.
- Existing `LEARNING`/`MASTERED` states have valid non-null calendar dates for
  `firstLearnedDate`, `lastReviewedDate` and `nextReviewDate`.
- `totalCorrect`, `totalIncorrect`, `consecutiveCorrect` and `intervalDays`
  are finite integers in their allowed non-negative ranges.
- Status and result values are restricted to the approved enums. No `EASY`,
  `HARD`, `AGAIN`, `SKIP` or confidence score is introduced.

The scheduler does not require the current `nextReviewDate` to be on or before
`today`; due eligibility belongs to the later review-queue/service boundary.
Regardless of lateness, the resulting interval is selected only from the
current scheduler progression.

## 11. State Transition Matrix

Each scheduled evaluation sets `lastReviewedDate = today` and computes
`nextReviewDate = today + resulting interval`. `firstLearnedDate` is set to
`today` only for virtual `NEW`; it is preserved for every existing state.

| Current state | Result | Next status | Next consecutive correct | Next interval | Counter change |
|---|---|---|---:|---:|---|
| virtual `NEW` | `REMEMBERED` | `LEARNING` | 1 | 1 day | `totalCorrect + 1`; incorrect unchanged at 0 |
| virtual `NEW` | `FORGOTTEN` | `LEARNING` | 0 | 1 day | `totalIncorrect + 1`; correct unchanged at 0 |
| `LEARNING` | `REMEMBERED` | `LEARNING` for 1–3, then `MASTERED` at 4 | current + 1 | interval table | `totalCorrect + 1`; incorrect unchanged |
| `LEARNING` | `FORGOTTEN` | `LEARNING` | 0 | 1 day | `totalIncorrect + 1`; correct unchanged |
| `MASTERED` | `REMEMBERED` | `MASTERED` | current + 1 | 30 days at the valid resulting `5+` | `totalCorrect + 1`; incorrect unchanged |
| `MASTERED` | `FORGOTTEN` | `LEARNING` | 0 | 1 day | `totalIncorrect + 1`; correct unchanged |

For every row, counters not named as changed are preserved. `firstLearnedDate`
is preserved for existing `LEARNING` and `MASTERED` states, including a
mastered-to-learning regression. `lastReviewedDate` and `nextReviewDate` are
replaced as stated above.

## 12. Interval and Status Rules

For `REMEMBERED`, increment `consecutiveCorrect` exactly once and select the
interval from the resulting value:

| Resulting consecutive correct | Interval | Status |
|---:|---:|---|
| 1 | 1 day | `LEARNING` |
| 2 | 3 days | `LEARNING` |
| 3 | 7 days | `LEARNING` |
| 4 | 14 days | `MASTERED` |
| 5 or greater | 30 days | `MASTERED` |

For `FORGOTTEN`, reset `consecutiveCorrect` to `0`, choose a one-day
interval, and set status to `LEARNING` regardless of whether the prior state
was `NEW`, `LEARNING` or `MASTERED`.

An overdue review receives no lateness bonus. For example, a card whose
`nextReviewDate` is several days before `today` still uses only the resulting
consecutive-correct bucket and schedules from `today`.

## 13. Date and Timezone Ownership

- `today`, `firstLearnedDate`, `lastReviewedDate` and `nextReviewDate` are
  household-local calendar dates represented as valid `YYYY-MM-DD` values.
- The later authenticated service resolves `today` from the household's IANA
  timezone. The client cannot author the canonical date and the scheduler does
  not inspect the browser or host timezone.
- The scheduler adds calendar days, not elapsed 24-hour durations. Tests cover
  month-end, year-end and leap-year rollover.
- `reviewedAt` is an actual event instant owned by the later persistence/event
  layer and is intentionally absent from this function's input/output.

## 14. Reinforcement Boundary

This function evaluates scheduled reviews only. Product-defined reinforcement
after `FORGOTTEN` is session-local and remains outside US-06. It must not call
the scheduler, increment long-term `consecutiveCorrect` or interval, update
canonical counters, or create a review event. A later session story owns
reinsertion and reinforcement feedback.

## 15. Revision and Server Authority

`revision` is an optimistic-locking persistence field, not scheduler state.
The later review service reads the canonical/virtual state, checks
`expectedRevision`, calls this pure function and atomically persists the
result with `revision = current revision + 1` plus its `review_event`. US-06
does not accept a client-authored revision and does not perform concurrency or
idempotency writes.

## 16. Invalid Input and Error Contract

Invalid domain input is rejected deterministically with a typed domain error;
the function does not return a partial state and does not invent HTTP status
codes. The error surface must distinguish at least:

- malformed or nonexistent `LocalDate` values;
- unsupported status or review-result values;
- negative/non-integer counters;
- invalid interval values;
- contradictory status/interval/consecutive-count combinations; and
- missing or contradictory dates for an existing state.

The package must not add Zod, HTTP envelopes or database error types to the
learning-domain boundary. External request parsing, when introduced later,
belongs in `packages/contracts`/the API boundary and must not let a client
author the scheduler output.

## 17. Acceptance Criteria

- T06-01: `scheduleReview` is a pure, deterministic function with no
  React, Hono, Drizzle, Neon, Better Auth, HTTP, cookie, session or storage
  dependency.
- T06-02: The domain exposes only `NEW`, `LEARNING`, `MASTERED`,
  `REMEMBERED` and `FORGOTTEN`; canonical virtual `NEW` is an explicit state
  object and does not require a database row.
- T06-03: Virtual `NEW + REMEMBERED` produces `LEARNING`, consecutive `1`,
  interval `1`, first/last/next dates from `today`, and correct counter `1`.
- T06-04: Virtual `NEW + FORGOTTEN` produces `LEARNING`, consecutive `0`,
  interval `1`, first/last/next dates from `today`, and incorrect counter `1`.
- T06-05: `LEARNING + REMEMBERED` increments once and applies the exact
  1/3/7/14/30 threshold table, including promotion at consecutive `4`.
- T06-06: `LEARNING + FORGOTTEN` resets to `LEARNING`, consecutive `0` and
  interval `1`, while preserving first-learned date and correct counter.
- T06-07: `MASTERED + REMEMBERED` remains `MASTERED`, increments once and
  uses the 30-day interval because every valid mastered input has resulting
  consecutive correctness `5+` after the increment.
- T06-08: `MASTERED + FORGOTTEN` falls to `LEARNING` with consecutive `0` and
  interval `1`, preserving first-learned date and prior correct counter.
- T06-09: Every scheduled result updates last-reviewed date to `today`, sets
  next-review date from `today + interval`, and changes only the specified
  counters.
- T06-10: Calendar addition is explicit and correct across month-end,
  year-end and leap-year boundaries; no system clock or timezone is read.
- T06-11: An overdue current state receives no lateness bonus; only scheduler
  progression determines the resulting interval.
- T06-12: Malformed dates, unsupported enums, invalid counters/intervals and
  contradictory state invariants fail deterministically with typed domain
  errors and no partial output.
- T06-13: Scheduler input/output exclude learner/vocabulary identity,
  `reviewId`, `expectedRevision`, `revision`, `reviewedAt`, HTTP fields and
  persistence side effects.
- T06-14: Exhaustive table-driven tests cover every transition row and every
  interval threshold, including repeated `MASTERED + REMEMBERED` inputs.
- T06-15: Repeated identical inputs produce deeply equal results and do not
  mutate the supplied state or access external state.
- T06-16: The package remains framework-agnostic and its strict TypeScript
  exports are usable by a later API/service adapter without changing the
  scheduler contract.
- T06-17: US-01 through US-05 regression suites and required repository gates
  remain green. No browser E2E or fake UI is added for this domain-only story.

No acceptance criterion authorizes `POST /api/reviews`, review persistence,
queue generation, session reinforcement or schema/migration work.

## 18. Test Plan

- **Domain unit tests:** table-driven tests for all six transition rows,
  explicit canonical virtual `NEW`, counter
  preservation/increments, status transitions, first-date preservation and
  last/next date output.
- **Threshold tests:** resulting consecutive values `1`, `2`, `3`, `4`, `5`
  and a value greater than `5`, including repeated mastered reviews.
- **Calendar tests:** explicit `today` values at month end, year end and leap
  day; verify calendar addition rather than elapsed-time arithmetic.
- **Overdue tests:** several-day-late `nextReviewDate` with each relevant
  result; verify no lateness bonus and no dependence on current date except the
  explicit `today` input.
- **Validation tests:** malformed/nonexistent dates, invalid enums, negative
  and fractional counters, invalid intervals, impossible status combinations,
  and missing existing-state dates.
- **Determinism/side-effect tests:** repeat identical calls, freeze the input
  object for mutation detection and verify no system clock, timezone, DB/API or
  browser access exists.
- **Regression:** run the existing US-01 through US-05 unit/component/API/E2E
  suites and standard local repository gates. Browser E2E is not added for
  scheduler behavior.

## 19. Expected Files and Modules

Likely implementation areas, not a permission to implement:

- `packages/learning-domain/src/` for domain types, date arithmetic, validation
  and scheduler exports.
- `packages/learning-domain/src/*.test.ts` or the repository's equivalent
  Vitest location for exhaustive table-driven tests.
- `packages/learning-domain/package.json` only if an actual package export or
  test-discovery requirement is proven; no new dependency is proposed.

No `apps/web`, `apps/api`, `packages/contracts`, `drizzle`, `scripts`,
`config`, CI/workflow or dependency file is expected to change for the
contract-only preparation or for the pure-domain implementation boundary
described here.

## 20. Implementation Sequence

1. Implement the pure date/value validation and scheduler function in
   `packages/learning-domain`.
2. Add exhaustive unit/table tests for transitions, thresholds, calendar
   boundaries, overdue behavior, invalid input and determinism.
3. Run the existing US-01 through US-05 regressions and repository gates.
4. Stop at `scheduler-domain-ready`; do not add the review API or persistence.
5. Record implementation evidence before any later review-write story is
   prepared.

## 21. Definition of Done

- T06-01 through T06-17 pass with implementation evidence.
- The scheduler is deterministic, framework-agnostic and fully covered by
  exhaustive unit tests.
- Virtual `NEW`, existing-state transitions, intervals, counters, dates,
  validation and no-overdue-bonus behavior match this contract.
- No API, database, migration, review-event, queue, session or UI behavior is
  introduced.
- Core CI and local repository gates pass; no Trusted DB gate is required for
  a pure-domain change.
- US-06 is promoted to `ACCEPTED` after owner acceptance and the required Core
  CI evidence; `READY FOR CONTRACT REVIEW` alone is not acceptance.

## 22. Open Questions and Blockers

No source-of-truth conflict remains for interval thresholds, status
transitions, explicit virtual `NEW`, overdue handling, date ownership,
reinforcement or revision ownership. The reviewed fix-forward is complete
within the approved pure-domain scope. Technical re-review, Core CI and owner
acceptance are complete. PR #3 was merged before explicit Owner Acceptance;
the post-merge audit confirmed the exact reviewed revision, green CI and no
scope drift. This was a process-order deviation only and required no revert.

US-07 has not started. `docs/decisions.md` is unrelated local work and is not
part of this story.

## 23. Discovery Evidence

- Architecture Step 4 is accepted through US-05's `first-flashcard-ready`
  handoff; Architecture Step 5 names the scheduler package and exhaustive
  unit tests as the next milestone.
- Product and Technical Architecture agree on the `1/3/7/14/30` intervals,
  virtual sparse `NEW`, scheduled result enum, forgotten reset, mastered
  behavior and no overdue bonus.
- The current `packages/learning-domain` implementation now provides the
  approved scheduler contract; no pre-existing scheduler behavior needed to
  be preserved.
- The architecture's review-write section assigns authorization, revision,
  idempotency and atomic persistence to the later Worker/API boundary; this
  story keeps those concerns out of the pure function.

## 24. Acceptance Evidence

### Implementation checkpoint — 2026-09-12

US-06 is `IN PROGRESS`. The approved pure-domain implementation is complete
locally, but the story is not `ACCEPTED` until technical review and the required
Core CI evidence are complete.

Implementation evidence:

- `packages/learning-domain/src/index.ts` exports the synchronous,
  side-effect-free `scheduleReview` function, scheduler input/output types,
  explicit virtual `NEW` state and typed `SchedulerValidationError`.
- Gregorian calendar validation and calendar-day addition are implemented
  without `Date.now()`, `new Date()`, system/browser timezone access or UTC
  instant arithmetic.
- The implementation does not import React, Hono, Drizzle, Neon, Better Auth,
  HTTP/fetch, cookies/session, database or environment-variable modules.
- No learner/vocabulary IDs, revision, `reviewedAt`, audit timestamps or
  persistence metadata enter or leave the scheduler boundary.

Acceptance-criteria checkpoint:

| Criterion | Evidence status |
|---|---|
| T06-01 | PASS — pure deterministic scheduler with no framework/storage dependency. |
| T06-02 | PASS — explicit NEW/LEARNING/MASTERED and REMEMBERED/FORGOTTEN values; NEW is an object. |
| T06-03 | PASS — NEW + REMEMBERED transition. |
| T06-04 | PASS — NEW + FORGOTTEN transition. |
| T06-05 | PASS — LEARNING remembered thresholds 1/3/7/14/30. |
| T06-06 | PASS — LEARNING forgotten reset and first-date preservation. |
| T06-07 | PASS — MASTERED remembered progression remains MASTERED with 30-day result. |
| T06-08 | PASS — MASTERED forgotten regression to LEARNING/1 day. |
| T06-09 | PASS — counters and last/next calendar dates are updated correctly. |
| T06-10 | PASS — normal, month-end, year-end and leap-year calendar tests. |
| T06-11 | PASS — overdue input receives no lateness bonus. |
| T06-12 | PASS — invalid dates, enums, counters, intervals and state invariants reject before transition. |
| T06-13 | PASS — scheduler excludes IDs, revision, reviewedAt, HTTP and persistence fields. |
| T06-14 | PASS — exhaustive table-driven transition and threshold tests. |
| T06-15 | PASS — repeated calls are equal and frozen input remains unchanged. |
| T06-16 | PASS — strict TypeScript package exports remain framework-agnostic. |
| T06-17 | PASS locally — all repository tests/gates and US-01 through US-05 regressions pass; Core CI pending. |

Test evidence:

- `packages/learning-domain/src/index.test.ts`: 28 scheduler tests PASS,
  including all transition rows, threshold boundaries, calendar rollover,
  overdue behavior, invalid states and non-mutation/determinism.
- `pnpm test`: 195/195 tests PASS across 20 test files.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm build`: PASS.
- `pnpm test:e2e`: PASS — 11/11 existing regression E2E tests.
- `git diff --check`: PASS.

### Fix-forward checkpoint — 2026-09-13

Technical review found and the implementation corrected one P1 defect: a
valid `Number.MAX_SAFE_INTEGER` counter could overflow when incremented. All
resulting counter increments now fail deterministically with
`SchedulerValidationError` instead of returning an unsafe canonical value.

Focused coverage was expanded without changing approved scheduler semantics:

- 51 scheduler tests PASS, including remembered/forgotten result overflow,
  consecutive-correct overflow, fractional/NaN/Infinity/out-of-range numeric
  rejection, Gregorian century rules for 2000/2100, all 1/3/7/14/30-day
  rollover representatives, large safe mastered state behavior and full
  remembered-transition output assertions.
- US-06 remains `IN PROGRESS`; technical re-review and Core CI remain pending.

Data and gate evidence:

- No schema, migration, database query/write, API route, `POST /api/reviews`,
  Review Queue, Study UI, dependency or CI/workflow change was made.
- Trusted DB Integration is `NOT REQUIRED` for this pure-domain story.
- Core CI is the remaining technical acceptance gate; US-06 remains
  `IN PROGRESS`.
- US-07 has not started and `docs/decisions.md` remains unrelated local work,
  untouched by this implementation.

### Final acceptance — 2026-09-13

US-06 is `ACCEPTED`. The owner approved finalization after the technical
re-review, Core CI validation and post-merge audit completed. The approved
success boundary was achieved:

```text
scheduler-domain-ready
```

Acceptance-criteria result:

| Criterion | Evidence status |
|---|---|
| T06-01 | PASS |
| T06-02 | PASS |
| T06-03 | PASS |
| T06-04 | PASS |
| T06-05 | PASS |
| T06-06 | PASS |
| T06-07 | PASS |
| T06-08 | PASS |
| T06-09 | PASS |
| T06-10 | PASS |
| T06-11 | PASS |
| T06-12 | PASS |
| T06-13 | PASS |
| T06-14 | PASS |
| T06-15 | PASS |
| T06-16 | PASS |
| T06-17 | PASS |

Final validation evidence:

- Focused learning-domain tests: `51/51` PASS.
- Full tests: `218/218` PASS.
- E2E: `11/11` PASS.
- Lint: PASS.
- Typecheck: PASS.
- Build: PASS.
- `git diff --check`: PASS.
- Technical re-review: PASS.

Core CI evidence:

- Core CI #32: PASS on the reviewed implementation commit
  `cc649d2dca4b233752e08f9c565ad384ea2f6816`.
- Core CI #33: PASS on merged main commit
  `b838f107a69830234202caded33f9b7ad0040c9e`.
- Trusted DB Integration #30: PASS as extra evidence only; it was not a
  required gate for this pure-domain story.

The accepted semantics remain explicit virtual `NEW`, the canonical
`NEW`/`LEARNING`/`MASTERED` transitions, `REMEMBERED`/`FORGOTTEN`,
1/3/7/14/30-day intervals, deterministic household-local calendar arithmetic,
safe-integer validation and no overdue bonus. No API, persistence, review
queue, session reinforcement, UI, schema, migration or dependency behavior
was added.

Process note: PR #3 was merged before explicit Owner Acceptance. The
post-merge audit proved that the exact reviewed revision was merged, Core CI
passed and no scope drift was present. Classification: `PROCESS-ORDER
DEVIATION ONLY`; no revert was required.

US-07 has not started. `docs/decisions.md` remains unrelated local work and is
not part of this acceptance.
