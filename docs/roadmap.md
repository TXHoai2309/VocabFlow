# VocabFlow Roadmap and Batch Index

This roadmap promotes only work supported by the current product documents and
the accepted/backfilled user-story evidence. US-26 through US-36 are
implemented and awaiting owner check. US-37 and US-38 extend the learner progress
read model and are also `IMPLEMENTED / READY FOR OWNER CHECK`.
US-39 and US-40 complete the reward layer and are `IMPLEMENTED / READY FOR
OWNER CHECK`. US-41 adds the reviewed catalog activation boundary and is also
`IMPLEMENTED / READY FOR OWNER CHECK`.

## BATCH 0 — Foundation

- Status: `ACCEPTED`
- Evidence: Core CI PASS; Trusted DB Integration PASS on Neon PostgreSQL 18.
- Scope: repository foundation, same-origin shell/API boundary, database
  identity/role model, protected metadata, schemas, migration/reset tooling and
  CI safety.
- Freeze: do not reopen without a reproducible regression or approved new
  requirement.

## BATCH 1 — Authentication and Family Entry

- Status: `ACCEPTED`
- US-01 Parent Registration: `ACCEPTED`.
- US-02 Parent Login: `ACCEPTED`.
- US-03 Learner Profile Creation & Resolution: `ACCEPTED`.
- Active story: none; BATCH 1 is complete.
- Dependency: BATCH 0 accepted.
- Success boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- T01-04 may add only the minimal additive `vocabflow_app.households` and
  `vocabflow_app.household_members` migration required by that boundary. This
  does not reopen BATCH 0 infrastructure or add learner/domain tables.

### US-01 — Parent Registration

User story: Là phụ huynh, tôi muốn đăng ký tài khoản để bắt đầu sử dụng
VocabFlow cho gia đình.

Current task contract:

- `T01-01` — Tạo Register screen theo Family MVP Feature UI Specification.
- `T01-02` — Parent-name/email/password/required-field validation.
- `T01-03` — Password show/hide, Enter submit, correct autocomplete.
- `T01-04` — Better Auth signup, loading/error state, preserve email on error,
  duplicate-submit protection, then required idempotent household bootstrap.

Implementation checkpoint: `T01-01` through `T01-04` are `ACCEPTED`.
Family registration succeeds only after Better Auth signup, an authenticated
session, `POST /api/bootstrap` and canonical default household resolution.
Bootstrap uses the server-owned neutral name `Gia đình VocabFlow`; learner
creation remains out of scope.

Register contract: `Tên phụ huynh` → `Email` → `Mật khẩu`. Parent display name
is collected explicitly because Better Auth 1.7.3 requires `name` for
`signUp.email`; learner naming and learner creation remain out of scope.

The complete story contract is in
[`docs/stories/US-01-parent-registration.md`](stories/US-01-parent-registration.md).

### US-02 — Parent Login

- Status: `ACCEPTED`.
- Contract: [`docs/stories/US-02-parent-login.md`](stories/US-02-parent-login.md).
- Scope: parent email/password login through Better Auth, existing-session
  handling, safe retry/error states and the authenticated household handoff.
- Success boundary: Better Auth sign-in → authenticated session → existing
  idempotent `POST /api/bootstrap` → `authenticated-household-ready`.
- Learner profiles, learner APIs, learner selector/home and all learning-domain
  behavior remain out of scope for US-02.
- Acceptance evidence: owner manual acceptance PASS; `pnpm lint`,
  `pnpm typecheck`, `pnpm test` (114 tests), `pnpm build`, `pnpm test:e2e`
  (5/5), responsive checks and `git diff --check` PASS.
- US-02 ends at `authenticated-household-ready`; learner profiles, learner
  APIs, selector/home and learning-domain behavior remain out of scope.

### US-03 — Learner Profile Creation & Resolution

- Status: `ACCEPTED`.
- Contract: [`docs/stories/US-03-learner-profile-resolution.md`](stories/US-03-learner-profile-resolution.md).
- Scope: additive learner profile persistence, authorized learner list/create,
  first-learner empty state and 0/1/2+ resolution through the canonical
  `learner-context-ready` handoff. Implementation and acceptance are complete
  within this scope.
- Learner Home, progress, vocabulary, review and learner authentication remain
  out of scope for US-03; US-04 was not started at the US-03 checkpoint.
- Acceptance evidence: owner manual core-flow PASS; local lint, typecheck, test,
  build, E2E, migration/schema/reset and diff checks PASS; Core CI #26 and
  Trusted DB Integration #24 SUCCESS on main commit
  `de6a8387da0f5e90faa62f19124df8ab4cb50157`.

## BATCH 2 — Learning Content Foundation

- Status: `ACCEPTED`.
- Dependency: BATCH 1 and US-03 are `ACCEPTED`.
- Active story: none; US-04 Vocabulary Content Seed & Read Foundation is
  `ACCEPTED`.
- Scope: approved VocabFlow Starter Vocabulary v1 with exactly 30 records,
  canonical PostgreSQL content,
  validated dataset contract and authenticated deterministic read API.
- Learner Home, first flashcard rendering, study session, scheduler, progress,
  review queue and review writes remain later scope. US-05 has not started.
- Dataset source: `VOCABFLOW_STARTER_V1`, project-authored, approved;
  implementation and Trusted DB acceptance are complete.

### US-04 — Vocabulary Content Seed & Read Foundation

- Contract: [`docs/stories/US-04-vocabulary-content-foundation.md`](stories/US-04-vocabulary-content-foundation.md).
- Input: `learner-context-ready`; selected learner provides product-flow
  continuity, not vocabulary ownership.
- Success boundary: `vocabulary-content-ready`.
- No production UI is added; the next story owns Learner Home and first real
  flashcard rendering.
- Acceptance evidence: owner manual acceptance PASS; dataset validation, lint,
  typecheck, tests, build, E2E, migration/schema/reset checks, `DB_MIGRATE=PASS`
  and `git diff --check` PASS; Core CI #28 and Trusted DB Integration #26
  SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.

## BATCH 3 — First Study Experience

- Status: `ACCEPTED`.
- Dependency: BATCH 2 and US-04 are `ACCEPTED`.
- Active story: none; US-05 First Real Flashcard is `ACCEPTED`.
- Owner-approved scope: minimal learner-context-to-first-card handoff using
  the accepted vocabulary API; do not fabricate a full Learner Home dashboard.
- Success boundary: `first-flashcard-ready`.
- No new schema, migration, privilege, read/write API or Trusted DB gate is
  proposed. US-06 and later scheduler/review work have not started.

### US-05 — First Real Flashcard

- Contract: [`docs/stories/US-05-first-real-flashcard.md`](stories/US-05-first-real-flashcard.md).
- Input: authenticated session + `learner-context-ready` +
  `vocabulary-content-ready`.
- Route: focused `/study` handoff with short-lived navigation context;
  reload re-resolves learner context instead of resuming a card.
- Selection: first enabled `VocabularyDto` in the accepted
  deterministic `id ASC` API response.
- Manual owner acceptance: PASS for the learner handoff, real first `apple`
  card, flip/accessibility behavior, NULL/media safety, error/retry, reload
  recovery and 375x812 responsive verification.
- T05-01 through T05-17: `PASS`.
- Core CI #30: `SUCCESS` on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28: `SUCCESS` as incidental evidence, not a required
  US-05 acceptance gate; US-05 makes no schema, migration, seed, privilege or
  database behavior change.
- Learner Home, due/new metrics, progress, review queue, scheduler and review
  writes remain out of scope for this implementation story.

## BATCH 4 — Learning Scheduler Domain

- Status: `ACCEPTED`.
- Dependency: BATCH 3 and US-05 are `ACCEPTED`.
- Active story: none; US-06 Learning Scheduler Domain is `ACCEPTED`.
- Scope: pure scheduler/date domain function in
  `packages/learning-domain`, virtual sparse `NEW`, existing-state
  transitions, exhaustive unit tests and deterministic invalid-input handling.
- Success boundary: `scheduler-domain-ready`.
- No `POST /api/reviews`, review queue, session reinforcement, progress/review
  persistence, schema, migration, API, UI or Trusted DB work is proposed.
- Owner contract approval, implementation, technical re-review and owner
  acceptance are complete. T06-01 through T06-17 are `PASS`; focused tests are
  `51/51`, full tests are `218/218`, E2E is `11/11`, and lint, typecheck,
  build and `git diff --check` are PASS. Core CI #32 and #33 are PASS on the
  reviewed revision and merged main commit respectively. Trusted DB #30 is
  extra evidence only and was not required. US-07 has not started.

## BATCH 5 — Scheduled Review Write

- Status: `ACCEPTED`.
- Dependency: BATCH 4 and US-06 are `ACCEPTED`.
- Active story: none; US-07 Scheduled Review Write is `ACCEPTED / CLOSED`.
- Scope: the smallest server-authoritative `POST /api/reviews` boundary for
  one scheduled evaluation, sparse first materialization, idempotency,
  optimistic revision and atomic progress/event persistence.
- Input boundary: authenticated parent + authorized enabled learner + enabled
  vocabulary + `scheduler-domain-ready`.
- Success boundary: `scheduled-review-write-ready`.
- Trusted DB Integration is required because this story proposes additive
  application schema, migration, runtime persistence, reset participation and
  real concurrency behavior.
- Review Queue, due/new selection, session reinforcement, Study-session UX,
  progress dashboards and US-08 remain out of scope. Review Queue is the later
  Architecture Step 8 milestone.
- Owner-approved contract decisions lock the exact response DTO, first
  materialized revision `1`, missing/disabled vocabulary `404` behavior,
  authorization-before-replay and enabled-learner rules. The accepted fix
  closed the PostgreSQL CAS finding and the story is now closed.

## BATCH 6 — Review Queue

- Status: `ACCEPTED`.
- Dependency: Architecture Step 8 and the accepted vocabulary, learner and
  sparse-progress foundations. US-07 is now accepted and closed.
- Active story: none; US-08 Review Queue is `ACCEPTED / CLOSED`.
- Scope: authenticated, household-authorized
  `GET /api/learners/:learnerId/review-queue` with deterministic due-first and
  sparse-NEW selection, server-owned household-local review date and
  revision-aware queue items.
- No new schema, migration, reset, privilege or study-session UX is included.
  Architecture Step 9 owns the later Study session experience.
- Acceptance evidence: technical re-review PASS; Core CI run `34970869460`
  PASS on accepted candidate `bb91e01073dd156602cddb5bb98948ce06659bbe`;
  Trusted DB run `34971985883` PASS for `us08-review-queue` on the same exact
  requested and checked-out SHA; Owner Acceptance `OWNER_ACCEPT_US08`; PR #7
  merged into main at `2e8dd0f30754969f86fb00933813dcebbbe342d5`.
- The live evidence covered PostgreSQL `LEFT JOIN`/`NULL`, date, ordering, cap,
  BIGINT read semantics, authorization, household isolation and read-only
  behavior. The evidence-hardening delta preserved the canonical `full` suite
  default and did not change product schema or US-07 behavior.
- The reset note remains truthful: fixture cleanup completed and `us08-reset`
  was invoked, but final reset state is not independently proven because no
  distinct reset-completion marker was emitted.
- US-07 is `ACCEPTED / CLOSED`; its CAS acceptance is an upstream dependency
  already satisfied.

## FAMILY MVP — US-01 through US-24

- Status: `ACCEPTED` with one explicit deferred manual check.
- US-11 Flashcard Back Content & Recall Actions through US-21 Learner Progress
  Isolation are `ACCEPTED / CLOSED`.
- US-22 Vocabulary List is `IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK
  DEFERRED`.
- US-23 Missing Media / Dataset Vertical Slice and US-24 Reset Learner Progress
  are `ACCEPTED / CLOSED`.
- The backfilled contracts and evidence are indexed in
  [`docs/stories/README.md`](stories/README.md).
- Family MVP scope remains the learner selector/home, Study, session summary,
  progress, vocabulary list, and learner-scoped reset. No catalog activation
  policy is implied by this boundary.

### US-12 through US-18 — Study and lifecycle hardening

US-12 pronunciation, US-13 recall/scheduler integration, US-14 due/new queue,
US-15 session reinforcement, and US-16–US-18 save/retry/reload behavior are
closed under their documented commits and owner evidence where recorded.

### US-19 through US-21 — Summary and learner isolation

US-19 session summary and US-20/US-21 progress summary/isolation are closed.
The owner-verified Hoài/Ngọc metric snapshots are recorded in US-20 and US-21.

## PHASE 2 — Catalog Expansion

### US-25 — Full Vocabulary Catalog

- Status: `ACCEPTED / CLOSED` after the recovery Core CI and Trusted DB gates.
- Implementation: `f17521bd41738db6dd5e8f7f72a170ed08c22bf3`.
- Recovery fix: `60b384dd1f53ca5a5472402292a450190446ba9e`.
- Scope: additive source identity, safe 1,994-row import/reconciliation, media
  reuse, disabled imported rows, stable starter IDs, and no progress/history
  reinterpretation.
- Evidence: real migration/import produced 30 starter plus 1,994 imported rows;
  the post-import idempotency dry run reported 0 inserts, 0 updates, 1,994
  skips, 0 database mutations, and PASS.
- Closeout evidence: Core CI run `35434440380` PASS and Trusted DB Integration
  run `35434440386` PASS on the recovery commit. At this historical checkpoint
  US-26 had not started; it was opened in the later taxonomy batch.

### US-26 + US-27 — Vocabulary Taxonomy

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Implementation: `d612e1a`.
- Contracts: [`US-26 Vocabulary Grade Level`](stories/US-26-vocabulary-grade-level.md)
  and [`US-27 Vocabulary Topics`](stories/US-27-vocabulary-topics.md).
- US-26 adds a nullable, source-honest level enum and optional API/UI filters;
  no current row is auto-classified because the source dataset has no grade
  metadata.
- US-27 adds 17 source-backed canonical topics, normalized vocabulary-topic
  mappings, authenticated browse APIs and a topic browse UI.
- Imported rows remain disabled; starter IDs, source identities, progress and
  review history are preserved. Scheduler and review behavior are unchanged.
- Local implementation evidence is ready for owner check. US-28 and US-29 are
  the next implementation batch below.

### US-28 + US-29 — Learning Sets and Learner Assignment

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Contracts: [`US-28 Learning Sets`](stories/US-28-learning-sets.md) and
  [`US-29 Assign Learning Sets to Learners`](stories/US-29-assign-learning-sets.md).
- US-28 adds deterministic curated sets and ordered many-to-many vocabulary
  membership. US-29 adds household-authorized learner assignment and makes the
  queue the enabled union of active assigned sets.
- The default compatibility set contains all 30 enabled starter rows; existing
  learners are assigned during migration and new learners are assigned through
  the canonical create path. Imported rows remain disabled and untouched.

### US-30 — Daily New Word Limit

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Contract: [`US-30 Daily New Word Limit`](stories/US-30-daily-new-word-limit.md).
- Adds a learner-scoped integer limit from 0 through 100, default 10, with a
  parent settings API/UI. Due remains exempt and ordered first.
- Daily consumption is based on distinct current progress rows materialized on
  the household-local date. Learning-set eligibility, sparse New semantics,
  reset history preservation and review retry behavior remain unchanged.

### US-31 + US-32 — Multiple Choice Meaning and Listening Exercise

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Contracts: [`US-31 Multiple Choice Meaning`](stories/US-31-multiple-choice-meaning.md)
  and [`US-32 Listening Exercise`](stories/US-32-listening-exercise.md).
- Added an explicit `/study/exercises` route while preserving `/study` as the
  accepted Flashcard path. Exercises are a presentation layer over the current
  queue, not a second scheduler or progress model.
- Meaning exercises use four deterministic safe options and fall back to
  Flashcard when distractors are insufficient. Listening exercises require
  usable audio, use four English options, and fall back safely on missing or
  broken audio without auto-recording Forgotten.
- Both exercise outcomes call the existing review API and preserve daily New,
  learning-set, authorization, save-before-next, retry, reinforcement and
  summary semantics. No database schema change is required.

### US-33 + US-34 — Image to Word and Typing / Spelling Exercises

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Contracts: [`US-33 Image to Word Exercise`](stories/US-33-image-word-exercise.md)
  and [`US-34 Typing / Spelling Exercise`](stories/US-34-typing-spelling-exercise.md).
- Extended the same `/study/exercises` layer with deterministic
  `IMAGE_TO_WORD` and `TYPE_WORD` modes. Learner Home exposes explicit image
  and typing entry links while `/study` and the default exercise route retain
  their accepted behavior.
- Image exercises require a usable image and four safe English options. Typing
  uses a deterministic safe cue, strict NFKC/trim/case normalization and no
  fuzzy spelling. Broken or missing media falls back without a review write.
- Both modes use the canonical review API and preserve queue admission, daily
  New limits, learner isolation, retry, reinforcement and summary semantics.
  No database or learner-progress schema change is required.

### US-35 + US-36 — Daily Learning Goal and Learning Streak

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Contracts: [`US-35 Daily Learning Goal`](stories/US-35-daily-learning-goal.md)
  and [`US-36 Learning Streak`](stories/US-36-learning-streak.md).
- Added learner-scoped `dailyLearningGoal` with default 10 and range 1–100;
  it remains separate from the daily New admission limit.
- Added a canonical learner activity summary derived from persisted review
  history. Daily progress counts distinct vocabulary per household-local
  `review_date`; remembered, forgotten and reinforcement events count once per
  vocabulary.
- Added derived current/longest local-date streaks. Reset, logout/reload and
  learning-set unassignment preserve historical activity because review events
  remain canonical. No mutable streak counter or parallel progress state was
  introduced.

### US-39 + US-40 — XP, Level and Achievements

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Immutable learner-scoped rewards remain outside the scheduler. Scheduled
  reviews earn 10 XP, server-verified correct scheduled exercises earn an
  additional 5 XP, and daily goal completion earns 20 XP once per local date.
- Exercise submissions carry evidence, never a trusted correctness boolean;
  retry uniqueness, reinforcement zero-XP behavior and no historical XP
  backfill remain intact. Trusted DB fixture cleanup removes reward children
  before learner fixtures.

### US-41 — Content Curation and Activation

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Contract: [`US-41 Content Curation & Activation`](stories/US-41-content-curation-activation.md).
- The owner-refined `VOCABULARY_CURATION_V1` manifest selects 213 imported
  rows (100 Grade 1, 73 Grade 2, 40 Grade 3), validates source identity,
  canonical topics and required media/text, and assigns eleven ordered
  learning sets. Missing images are WARN and may activate; usable audio remains
  required and known unusable/corrupt media blocks. Activation does not imply
  `IMAGE_TO_WORD` eligibility, which still requires a usable image.
- The default `pnpm vocab:curate` command is local and read-only. The guarded
  `--apply` path is trusted-CI-only, transactional and idempotent. It enables
  only reviewed rows, preserves starter ids and learner state, adds no learner
  assignments, and leaves daily-New, review, progress, XP and achievement
  semantics unchanged.
- The next action is the same-commit Core CI and Trusted DB gate, followed by
  owner review of the manifest and dry-run report. Production release
  automation is tracked separately in US-42.

### US-42 — Protected Production Release Automation

- Status: `IN PROGRESS`.
- Contract: [`US-42 Protected Production Release Automation`](stories/US-42-production-release-automation.md).
- A successful same-repository Core CI push run on `main` triggers a
  serialized release pinned to its immutable `head_sha`. Read-only production
  preflight and migration planning precede explicitly confirmed forward-only
  migrations; a second read-only check requires an empty pending set before
  `pnpm deploy:production` runs for that same SHA.
- GitHub Environment `production` must be configured with required reviewers,
  a main-only branch rule, and the documented purpose-specific secrets and
  variables. The workflow does not bootstrap/reset production, import the
  catalog, run US-41 curation, or change Trusted DB Integration.
- Local implementation checks and owner review are pending; no production DB
  connection, migration or deployment has been performed.

## Later product scope

The Product Specification defines learner selector/create, Learner Home, Study,
Session Summary, Progress, Vocabulary and conditional reset as Family MVP
scope. Untracked later work is not promoted to implementation batches until a
tracked story contract is created. Product exclusions remain out of scope,
including
learner own login/PIN, offline write queue, AI tutor/generated content,
gamification, admin CMS, payments and social features.
