# US-48 — Progress Dashboard

- Status: `IN PROGRESS` (owner-requested Feature #11, 2026-10-04).
- Owner: Product owner.
- Depends on: US-20 Learner Progress Summary, US-21 Learner Progress Isolation,
  US-35 Daily Learning Goal, US-36 Learning Streak, US-37 Weekly / Daily
  Progress, US-38 Topic Progress, and US-26 Vocabulary Grade Level.
- No Dataset V2, migration, database mutation, or deployment is in scope.

## 1. User story

As a parent or learner viewing the active learner's progress, I can understand
the learner's persisted progress, review accuracy, study regularity, and
coverage by vocabulary level and started Topic without misleading comparisons.

## 2. In scope

- Replace the crowded Progress presentation with four summary metrics, at most
  two charts, and responsive level/Topic coverage panels.
- Keep the 7-day default and support 30 household-local dates with URL state
  `?period=7d|30d`.
- Reuse current learned/mastered, review-history, Topic, and streak sources.
- Extend Progress Summary with set-based `progressByLevel` over enabled
  vocabulary reachable through active assigned Learning Sets.
- Preserve the reset flow in a collapsed management disclosure.
- Keep loading, error, no-review, new-learner, and no-eligible-level/Topic
  states explicit and accessible.

## 3. Out of scope

- Fake period comparisons, historical progress snapshots, AI recommendations,
  new reward metrics, changes to Home charts, scheduler or study queues.
- Schema/migration changes, database mutations, Dataset V2, production DB,
  deployment, merge, or changes to other progress definitions.

## 4. Acceptance criteria

- AC-01: Learned remains the count of the active learner's unique materialized
  progress rows; Mastered remains current `MASTERED` state.
- AC-02: Accuracy uses persisted `REMEMBERED / (REMEMBERED + FORGOTTEN)` events
  in the selected period. With no valid reviews, show no percentage/chart.
- AC-03: Current streak reuses Activity Summary's household-local definition.
- AC-04: Daily activity displays unique vocabulary reviewed per
  household-local date, not a misleading count of words first learned.
- AC-05: Periods contain exactly 7 or 30 inclusive local dates; selection is
  encoded in the URL and history gaps are not forward-filled.
- AC-06: Level coverage uses only enabled vocabulary in active assigned
  Learning Sets, deduplicates repeated memberships, and sorts the canonical
  `GRADE_1`..`GRADE_5`, `GENERAL`, then unclassified taxonomy.
- AC-07: Topic coverage reuses the accessible active-set domain; show up to
  five started Topics, prioritize lower partial progress, omit untouched
  Topics, and label low coverage as progress rather than weakness.
- AC-08: Summary and breakdowns remain learner-authorized; API errors and
  empty/low-data cases do not crash the page or invent trends.
- AC-09: Charts include accessible titles/summaries and text values; progress
  bars expose min/max/current values. Layout is responsive without horizontal
  scrolling.
- AC-10: Daily Goal, Continue Learning, Topic progress, Study Setup, and Study
  session behavior remain unchanged.

## 5. Data and API contract

- Existing `GET /progress-summary` adds `progressByLevel`; original fields and
  semantics stay unchanged.
- Existing Activity Summary supplies household-local current date and streak.
- Progress History supplies persisted daily unique vocabulary and review
  outcomes for the selected inclusive date range.
- Topic Progress supplies current progress scoped to active assigned learning
  sets. No per-topic query is added.
- Dashboard avoids the legacy Gamification read path because achievement
  reconciliation has a write side effect.

## 6. Performance and persistence

- Level coverage is one grouped SQL query, independent of the number of levels;
  duplicate Learning Set membership is deduplicated before aggregate counts.
- Dashboard uses existing grouped/range read models; it adds no per-day or
  per-topic query loop, table, index, migration, or write path.
- `MIGRATION_REQUIRED = NO`; database mutations by this feature = 0.

## 7. Test plan

- Progress Summary API grouped level count, active-set eligibility,
  deduplication, authorization, and safe counts.
- Progress UI summary metrics, 7/30 URL periods, unique daily activity,
  outcome-based accuracy, no-review gaps, taxonomy order, Topic ranking,
  empty/error/reset states, and learner switch.
- Regress Activity Summary, Topic Progress, Home Daily Goal/Continue Learning,
  and Study Setup/queue behavior.
- Typecheck, build, related ESLint, and `git diff --check`.

## 8. Expected files and modules

- Progress Summary contract/service/tests; Progress page/tests/styles.
- Product, UI, flow and architecture progress extensions; roadmap, story,
  changelog, and `docs/ai-progress.md`.

## 9. Acceptance evidence

Implementation is ready for review, with the global typecheck gate blocked by an
untracked Dataset V2 script that is explicitly outside this story. Focused
validation passed: 10 test files / 107 tests (Progress Summary, Progress
History, Activity Summary, Topic Progress, Continue Learning API, Progress
page, Home, Continue Learning client, Study Setup, and Study page). Typecheck
for `apps/web`, `apps/api`, and `packages/contracts` passed using their project
references. `pnpm build`, ESLint for changed TS/TSX feature files, and
`git diff --check` passed. Root `pnpm typecheck` fails only in
`scripts/master-vocabulary-v2-post-apply-verification.ts` with two TS2367
literal comparison errors, TS1058, TS2345, and TS7006; that untracked Dataset
V2 file was not modified. Because the requested global validation gate is not
green, no feature files were staged or committed and no push was attempted.
No database mutation, merge, or deployment occurred.
