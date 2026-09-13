# VocabFlow Changelog

This log records meaningful project milestones and accepted baselines.

## 2026-09-13 — US-06 Learning Scheduler Domain fix-forward checkpoint

- Corrected safe-integer overflow handling for scheduler counter increments;
  unsafe canonical results now fail deterministically with the existing domain
  validation error.
- Added focused coverage for numeric invalid values, result overflow, large
  mastered counts, leap-year century rules, interval rollover and complete
  remembered-transition outputs.
- Focused scheduler tests PASS (`51/51`). US-06 remains `IN PROGRESS`; no API,
  database/schema/migration, dependency, CI/workflow, UI, persistence or
  US-07 work was added. Technical re-review and Core CI remain pending.

## 2026-09-12 — US-06 Learning Scheduler Domain implementation checkpoint

- Moved US-06 to `IN PROGRESS` and implemented the approved pure
  `packages/learning-domain` `scheduleReview` contract.
- Added explicit virtual `NEW`, `LEARNING`/`MASTERED` invariants,
  `REMEMBERED`/`FORGOTTEN` transitions, 1/3/7/14/30 intervals, deterministic
  Gregorian calendar arithmetic, no overdue bonus and typed validation.
- Scheduler tests PASS (28 focused tests); repository tests PASS (195/195),
  lint, typecheck, build and existing E2E (11/11) PASS.
- No API, database/schema/migration, dependency, CI/workflow, Review Queue,
  persistence or UI behavior was added. Trusted DB is not required; Core CI is
  the remaining acceptance gate. US-07 has not started.

## 2026-09-11 — US-06 Learning Scheduler Domain contract approved

- Owner approved `US-06 — Learning Scheduler Domain` as a pure-domain story
  and promoted it to `READY FOR IMPLEMENTATION`.
- Confirmed explicit virtual `NEW` (never `null`), the `scheduleReview` input
  of `currentState` + `result` + explicit local `today`, and the
  `scheduler-domain-ready` success boundary.
- Confirmed the scheduler owns only deterministic state/date transformation;
  revision, `reviewedAt`, authorization, persistence, review queue and
  reinforcement remain later-layer concerns.
- No implementation, API, database/schema/migration, dependency, CI/workflow,
  commit, push or US-07 work started.

## 2026-09-11 — US-06 Learning Scheduler Domain contract preparation

- Added `US-06 — Learning Scheduler Domain` with status `READY FOR CONTRACT
  REVIEW` after US-05 acceptance.
- Proposed the `first-flashcard-ready` → `scheduler-domain-ready` boundary for
  a pure `packages/learning-domain` scheduled-evaluation function.
- Recorded virtual `NEW`, `LEARNING` and `MASTERED` transitions; the approved
  `REMEMBERED`/`FORGOTTEN` results; 1/3/7/14/30 intervals; explicit
  household-local calendar dates; no overdue bonus; and deterministic invalid
  input handling.
- Kept `POST /api/reviews`, revision/idempotency, persistence, review queue,
  session reinforcement, UI, schema/migration, API and Trusted DB work out of
  scope. No implementation, US-07 work, commit or push started.

## 2026-09-11 — US-05 First Real Flashcard accepted

- US-05 is `ACCEPTED`; T05-01 through T05-17 are `PASS` after owner manual
  acceptance of the learner handoff, real `apple` first card, flip behavior,
  optional/media safety, reload recovery, responsive layout and safe error/
  retry behavior.
- Local evidence is PASS: `167/167` tests, E2E `11/11`, lint, typecheck, build
  and `git diff --check`; no review, progress, scheduler or database write
  side effects were introduced.
- Core CI #30 SUCCESS on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28 SUCCESS is incidental and not a required US-05
  acceptance gate. No schema, migration, seed, privilege or DB behavior
  changed. US-06 has not started.

## 2026-09-11 — US-05 implementation started

- Moved US-05 to `IN PROGRESS` and implemented the approved minimal
  learner-context → focused `/study` → first real flashcard flow.
- Reused authenticated `GET /api/vocabulary`, selecting `vocabulary[0]` from
  the accepted deterministic response; added keyboard/touch flip behavior and
  safe loading, empty, error, auth/403 and optional-field states.
- Added focused UI/client/routing tests; the full local test suite is green at
  167 tests. No schema, migration, seed, write API, progress, scheduler,
  CI/workflow, Trusted DB or US-06 work was added.

## 2026-09-11 — US-05 manual acceptance checkpoint

- Owner manual acceptance PASS for the resolved learner handoff, real
  PostgreSQL-backed first `apple` card, front/back meaning behavior,
  pointer/touch and Space flip, safe NULL/media states, safe error/retry,
  reload learner-context recovery and 375x812 responsive behavior.
- T05-09, T05-12 and T05-13 now have manual PASS evidence; T05-10/T05-11 remain
  accepted through automated coverage without fabricated database/content
  mutations. T05-01 through T05-17 are locally PASS subject to final Core CI.
- US-05 remains `IN PROGRESS`. Trusted DB Integration is not required because
  US-05 adds no schema, migration, seed, privilege or database behavior.
- `docs/decisions.md` remains an unrelated local change and is excluded.

## 2026-09-11 — US-05 contract owner approval

- Owner approved `US-05 — First Real Flashcard` and promoted it to
  `READY FOR IMPLEMENTATION`.
- Frozen boundary: `learner-context-ready` + `vocabulary-content-ready` →
  focused `/study` → `first-flashcard-ready`.
- Approved the minimal “Bắt đầu học” handoff; full Learner Home metrics,
  scheduler, review queue and progress remain deferred.
- Frozen selection is `vocabulary[0]` from accepted enabled-only `id ASC`
  content. Space keyboard flip and optional-field safety are required; audio
  playback and fake review controls are excluded.
- No implementation, schema, migration, dependency, database/API write,
  Trusted DB or US-06 work started.

## 2026-09-11 — US-05 First Real Flashcard contract preparation

- Added the US-05 story in `READY FOR CONTRACT REVIEW` after US-04 acceptance.
- Recommended the smallest vertical slice: accepted learner context plus
  accepted vocabulary content → deterministic first card →
  `first-flashcard-ready`.
- Recommended a minimal study-entry handoff rather than a full Learner Home;
  due/new/progress metrics depend on later read contracts.
- Reuses authenticated `GET /api/vocabulary`; no schema, migration, dependency,
  write API, progress, scheduler, review or Trusted DB change is proposed.
- This is contract preparation only. No US-05 implementation or US-06 work
  started; `docs/decisions.md` remains unrelated and untouched.

## 2026-09-11 — US-04 Vocabulary Content Seed & Read Foundation accepted

- US-04 is `ACCEPTED` after owner manual acceptance of authenticated vocabulary
  read, the exact 30-record Starter v1 dataset, optional `NULL` fields,
  unsupported scope rejection and unauthenticated access; `403` behavior is
  covered by automated tests.
- T04-01 through T04-16 PASS. Dataset validation, lint, typecheck, tests,
  build, E2E, migration/schema/reset checks, `DB_MIGRATE=PASS` and
  `git diff --check` PASS.
- Core CI #28 and Trusted DB Integration #26 both SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- BATCH 2 is accepted; Learner Home, first flashcard rendering and US-05
  remain deferred and unstarted.

## 2026-09-11 — US-04 pre-Trusted-DB acceptance checkpoint

- Recorded owner manual acceptance PASS for authenticated
  `GET /api/vocabulary`: `200`, exactly 30 records, IDs `1..30`, first word
  `apple`, last word `new`, all `enabled=true` and `contentVersion=1`.
- Recorded PASS for the exact approved dataset content, all optional fields
  `NULL`, unsupported `householdId`/`learnerId` rejection as
  `400 INVALID_REQUEST`, and unauthenticated access as `401 UNAUTHORIZED`.
- Local `DB_MIGRATE=PASS`, dataset validation, lint, typecheck, tests, build,
  E2E, migration/schema/reset checks and `git diff --check` PASS.
- US-04 remains `IN PROGRESS`; Trusted DB Integration remains
  `PENDING ACCEPTANCE GATE`. The `403 HOUSEHOLD_ACCESS_DENIED` path is covered
  by automated tests only and was not manually forced by mutating local DB.
- No acceptance finalization or US-05 work was started.

## 2026-09-11 — US-04 implementation started

- Moved US-04 to `IN PROGRESS` and implemented the approved
  `vocabflow_app.vocabularies` schema, content-version check and reset-policy
  participation.
- Added the controlled `0003` migration with exactly 30 enabled Starter v1
  records, the versioned JSON source artifact, dataset validation and tests.
- Added shared `VocabularyDto`/response/seed contracts and authenticated
  `GET /api/vocabulary` with household authorization, enabled-only `id ASC`
  ordering, strict scope-input rejection and safe errors.
- No UI, learner progress, review, scheduler, CI/workflow or US-05 work was
  added. Trusted DB Integration remains pending; no live Neon call was made.

## 2026-09-11 — US-04 dataset source approved

- Approved `VocabFlow Starter Vocabulary v1` as
  `DATASET_SOURCE=VOCABFLOW_STARTER_V1` with
  `DATASET_PROVENANCE=PROJECT_AUTHORED` and `DATASET_STATUS=APPROVED`.
- Locked exactly 30 enabled records with stable IDs `1` through `30`,
  `contentVersion=1`, and nullable optional fields left `NULL` for v1.
- The allowed claim is only “beginner starter vocabulary selected for the
  VocabFlow MVP”; no official CEFR, Oxford, Cambridge, Wiktionary-derived or
  copied dictionary claim is permitted.
- Moved US-04 to `READY FOR IMPLEMENTATION`. No application code, schema,
  migration, actual seed data, dependency, CI or Neon operation was created;
  US-05 remains unstarted.

## 2026-09-11 — US-04 contract prepared for review

- Added `US-04 — Vocabulary Content Seed & Read Foundation` with status
  `READY FOR CONTRACT REVIEW` in new BATCH 2 Learning Content Foundation.
- Locked Option A only: shared/global `vocabularies` content, owner-approved
  20–30 word source, validated controlled content migration and authenticated
  deterministic `GET /api/vocabulary` ending at `vocabulary-content-ready`.
- Learner Home, first flashcard rendering, study, scheduler, progress, review
  queue, review writes, production UI and US-05 remain out of scope.
- Before owner approval, `DATASET_SOURCE=OWNER_APPROVAL_REQUIRED`; no dataset
  words, implementation, migration, dependency, CI or Neon operation was
  created in that preparation step.

## 2026-09-11 — US-03 Learner Profile Creation & Resolution accepted

- US-03 is `ACCEPTED` after owner manual acceptance of the zero-learner empty
  state, first learner creation, single-learner auto-resolution, 2+ learner
  selector, explicit selection, reload behavior, display-name validation,
  native Enter create and keyboard learner selection.
- Local lint, typecheck, tests, build, E2E, migration/schema/reset tests and
  `git diff --check` PASS.
- Core CI #26 and Trusted DB Integration #24 both SUCCESS on main commit
  `de6a8387da0f5e90faa62f19124df8ab4cb50157`.
- No US-04 implementation has started; no next story is active.

## 2026-09-10 — US-03 contract approved for implementation

- Owner approved the US-03 learner profile contract and its exact decisions for
  display-name validation, strict request fields, `learner-context-ready`,
  short-lived active learner state, nullable avatar behavior and network-
  uncertainty reconciliation.
- US-03 is now `READY FOR IMPLEMENTATION`; no feature code, schema, migration,
  dependency, BATCH 0 or US-04 work was started in the documentation task.

## 2026-09-10 — US-03 implementation started

- Promoted US-03 to `IN PROGRESS` and began the approved learner profile
  list/create and 0/1/2+ resolution slice.
- Local implementation gates currently pass: 137 Vitest tests and 9/9
  Playwright E2E tests, plus lint, typecheck and build.
- US-04, Learner Home, learning-domain behavior and BATCH 0 remain out of
  scope.

## 2026-09-10 — US-03 manual acceptance core-flow checkpoint

- Owner manual acceptance PASS: zero-learner empty state, first learner
  creation, one-learner auto-resolution, 2+ learner selector, explicit
  selection, one- and 2+ learner reload behavior, empty `displayName`
  validation, native Enter create, and Tab + Enter learner selection.
- US-03 remains `IN PROGRESS`; T03-17 remains `PARTIAL` and Trusted DB
  Integration remains the pending acceptance gate.

## 2026-09-09 — US-03 Learner Profile Creation & Resolution contract review

- Added the `US-03 — Learner Profile Creation & Resolution` story with status
  `READY FOR CONTRACT REVIEW`.
- Defined authorized learner list/create, 0/1/2+ resolution and the proposed
  `learner-context-ready` handoff; Learner Home and learning behavior remain
  out of scope.
- This is documentation-only preparation. No application code, schema,
  migration, dependency, BATCH 0 or US-04 work was started.

## 2026-09-09 — US-02 Parent Login acceptance

- US-02 Parent Login is `ACCEPTED` after owner manual acceptance and complete
  automated evidence.
- Valid Better Auth sign-in, authenticated session, idempotent
  `POST /api/bootstrap` and `authenticated-household-ready` handoff PASS.
- Lint, typecheck, 114-test suite, build, 5/5 E2E, responsive and diff checks
  PASS; no learner scope, migration, dependency or BATCH 0 changes were added.
- No next story is active; US-03 has not started.

## 2026-09-09 — US-02 Parent Login contract review

- Added the owner-defined `US-02 — Parent Login` story contract with status
  `READY FOR CONTRACT REVIEW`.
- Locked the success boundary at Better Auth sign-in → authenticated session →
  existing idempotent `POST /api/bootstrap` →
  `authenticated-household-ready`; learner profiles and learner UI remain out
  of scope.
- Reconciled active Better Auth documentation references with the repository's
  pinned `1.7.3` dependency.

## 2026-09-09 — US-02 Parent Login implementation

- Promoted US-02 to `IN PROGRESS` after owner approval.
- Implemented the `/login` Better Auth email/password slice, authenticated
  household handoff, safe retry/error states and acceptance tests.
- Learner schema/API/UI, migrations, dependencies and BATCH 0 infrastructure
  remain unchanged.

## 2026-09-08 — BATCH 0 Foundation acceptance

- Commit `24e4580`: documented BATCH 0 acceptance evidence.
- Core CI: PASS.
- Trusted DB Integration: PASS on Neon PostgreSQL 18.

## 2026-09-08 — Least-privilege migration executor

- Commit `2429b0f`: replaced the built-in Drizzle migration path that attempted
  to create the `drizzle` schema.
- The executor preserves the installed Drizzle journal/history semantics while
  requiring pre-provisioned schemas.

## 2026-09-07 — PostgreSQL 18 role-model acceptance

- Commit `46d84f1`: aligned membership assertions with PostgreSQL 18's
  ADMIN-only automatic CREATEROLE membership behavior.

## 2026-09-07 — Dedicated application schema

- Commit `db959cf`: moved application tables to `vocabflow_app` while keeping
  protected `vocabflow_meta` and separate `drizzle` metadata.

## 2026-09-08 — Documentation and agent pack

- Added canonical Markdown conversions, governance/index files, decision log,
  AI handoff, roadmap, story templates and VocabFlow-specific `AGENTS.md`.
- This documentation task does not implement US-01 and is intentionally not
  committed until reviewed.

## 2026-09-08 — Finalize BATCH 1 story gate

- Aligned the documentation and agent status gates so only `READY FOR
  IMPLEMENTATION` permits feature code.
- Accepted the US-01 boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- Kept learner creation, new schema and new migration out of US-01.
- BATCH 1 and US-01 are now `READY FOR IMPLEMENTATION`; no feature code has
  started.

## 2026-09-08 — US-01 Phase 1 Register UI

- Implemented the `/register` focused auth screen and form behavior for
  T01-01/T01-02/T01-03.
- Added accessible required-field/email validation, password show/hide,
  autocomplete and keyboard submit behavior.
- Real Better Auth signup and household bootstrap (T01-04) remain pending.

## 2026-09-08 — US-01 Phase 1 checkpoint and contract correction

- Checkpointed Phase 1 on the `TXH` branch without implementing T01-04.
- Corrected the proven dependency: canonical household bootstrap requires
  `vocabflow_app.households` and `vocabflow_app.household_members`, which are
  not present in the BATCH 0 Better Auth Foundation migration.
- T01-04 may add only that minimal additive application migration; BATCH 0
  database infrastructure remains frozen.

## 2026-09-08 — Resolve US-01 Better Auth name contract

- Reconfirmed Better Auth 1.7.3 requires `name`, `email` and `password` for
  `signUp.email`.
- Updated the canonical Register contract and Phase 1 UI to collect the
  parent's visible display name, with required/trimmed Unicode-safe validation.
- T01-04 Better Auth signup and household bootstrap remain pending; no
  application integration or database change was started.

## 2026-09-08 — US-01 T01-04 registration integration

- Implemented the real Better Auth 1.7.3 parent signup pipeline with the
  authenticated `POST /api/bootstrap` Family-registration boundary.
- Added the additive `vocabflow_app.households` and
  `vocabflow_app.household_members` migration, atomic/idempotent bootstrap
  persistence and dependency-safe application reset ordering.
- Added safe signup/bootstrap loading, error and authenticated recovery states;
  learner creation and all learning-domain tables remain out of scope.
- T01-04 is implemented / pending acceptance; US-01 remains `IN PROGRESS`.

## 2026-09-08 — US-01 acceptance review: Better Auth session smoke

- Corrected the stale foundation Playwright smoke from unsupported
  `/api/auth/session` to Better Auth 1.7.3's `/api/auth/get-session` endpoint.
- The smoke now passes in configured preview and secretless CI modes. US-01
  remains pending Core CI and Trusted DB Integration evidence.

## 2026-09-08 — US-01 Trusted DB application enum reset fix

- Trusted DB exposed SQLSTATE `42710` on the second migration because the
  app-only reset left `vocabflow_app.household_role` behind after dropping its
  dependent tables.
- The reset policy now explicitly removes the schema-qualified application enum
  before truncating Drizzle migration history, and state-zero validation detects
  leftover application enum artifacts.
- US-01 remains `IN PROGRESS / PENDING ACCEPTANCE` pending the trusted rerun.

## 2026-09-08 — US-01 Parent Registration acceptance

- US-01 is accepted after local validation plus Core CI and Trusted DB
  Integration PASS on merged main commit `6806e66`.
- The success boundary is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- `/login`, learner creation, learner selector and Learner Home remain deferred
  and out of scope for this story; BATCH 1 remains in progress.
