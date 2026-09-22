# VocabFlow Changelog

This log records meaningful project milestones and accepted baselines.

## 2026-09-22 — US-41 content curation and activation

- Audited the 1,994 imported vocabulary records and tracked the deterministic
  `VOCABULARY_CURATION_V1` manifest with 220 reviewed rows: 100 Grade 1, 80
  Grade 2 and 40 Grade 3, grouped into eleven ordered learning sets.
- Added source-identity, canonical-topic, explicit-grade and image/audio media
  gates. The default `pnpm vocab:curate` command is read-only and reports
  `MANIFEST_RECORDS=220`, `STARTER_TOPIC_MAPPINGS=30`, `MEDIA_GATE=PASS
  checked=220` and `DB_MUTATIONS=0`.
- Added trusted-CI-only transactional activation with idempotent set/item
  upserts. Starter identity, learner assignments, progress, review history, XP,
  achievements and the daily New limit remain unchanged. US-42 is not started.
- Core CI #87 and Trusted DB Integration #81 both passed on candidate
  `4d76cfa946ccae94ec3e5deb690f0365ba579363`; owner review remains pending.

## 2026-09-21 — US-39 + US-40 learner rewards

- Added an immutable, learner-scoped XP ledger and derived 100-XP level rule. A successful scheduled review earns 10 XP once; daily-goal completion earns 20 XP once per local date.
- Added idempotent catalog-backed achievements with historical reconciliation for canonical evidence and responsive locked/unlocked Progress UI. Reset preserves XP and badges.
- Exercise-correct bonus is deferred: exercise type and correctness are not a server-trusted review signal, so no client label can farm rewards. Scheduler behavior is unchanged.

## 2026-09-21 — US-39/US-40 reward fix-forward

- Added server-derived exercise verification to the existing review write. A correct scheduled exercise earns one immutable `EXERCISE_CORRECT` event worth 5 XP; no client correctness boolean is accepted, typed input is transient, and no historical exercise XP is backfilled.
- Fixed Trusted DB fixture cleanup to remove XP and learner-achievement child rows before learner profiles, preserving the global achievement catalog and avoiding FK teardown failures.

## 2026-09-21 — US-37 + US-38 weekly, daily and topic progress

- Added learner-scoped, bounded 90-day progress-history aggregation from canonical review events with household-local dates, explicit zero-fill and review/unique/remembered/forgotten/current-lifecycle-new metrics.
- Progress now has a seven-day view and set-based current topic progress for enabled vocabulary reachable through active assigned sets. Topic Due remains an overlapping subset; unmapped starter words remain honestly uncategorized.
- No mutable analytics counters, schema changes or scheduler changes were added. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-20 — US-35 + US-36 daily goal and learning streak

- Added learner-scoped `daily_learning_goal` with default 10 and validation
  range 1–100. Settings GET/PATCH now returns and safely updates it alongside
  the separate daily New limit.
- Added canonical learner activity summary derived from persisted
  `review_events`: daily progress counts distinct vocabulary on the
  household-local review date, while remembered, forgotten, reinforcement and
  retry semantics remain canonical.
- Added derived current/longest learning streaks with local calendar-day
  boundaries and the not-active-today/active-yesterday continuation rule.
  Progress UI shows goal and streak indicators; reset and unassign preserve
  history. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-20 — US-33 + US-34 image and typing exercises

- Extended the existing `/study/exercises` route with deterministic
  `IMAGE_TO_WORD` and `TYPE_WORD` modes; Learner Home exposes image and typing
  entry links without creating a second exercise subsystem.
- Image mode requires a usable image and four safe English options, uses neutral
  non-answer-revealing alt text and performs a one-way safe fallback on broken
  media. Typing uses Vietnamese-first cues, strict Unicode NFKC/trim/
  case-insensitive comparison, preserves meaningful internal spaces and rejects
  fuzzy spelling.
- Correct/incorrect results continue through the canonical review API. One
  submission, save-before-next, safe retry, reinforcement, summary, queue
  eligibility, daily New limits and learner isolation remain unchanged. Raw
  keyboard input is not persisted; no DB or learner-progress schema changed.
- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-31 + US-32 exercise interaction layer

- Added an explicit `/study/exercises` route for deterministic
  `MULTIPLE_CHOICE_MEANING` and `LISTENING_CHOICE` exercises; `/study` keeps
  the existing Flashcard path.
- Meaning exercises use one correct Vietnamese meaning plus three normalized,
  non-duplicate distractors. Listening exercises require usable `audioUrl` and
  unique English candidates; both fall back to Flashcard when safe generation
  is not possible.
- Exercise submission maps correct/incorrect to `REMEMBERED`/`FORGOTTEN` via
  the existing review API, locks one submission, waits for save confirmation,
  preserves safe retry/reinforcement/summary behavior and never writes progress
  directly from the UI.
- Broken audio falls back without scheduler mutation; SpeechSynthesis is not
  used. No database schema, learner-progress schema or scheduler interval
  changed. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-30 daily new word limit

- Added learner-scoped `daily_new_word_limit` with default 10 and validation
  range 0–100, plus authorized settings API and parent UI.
- Review Queue now limits only virtual NEW admission by the remaining
  household-local daily allowance. Due remains first and exempt; existing
  session caps and progress-summary semantics are unchanged.
- Daily consumption uses the current progress lifecycle's
  `first_learned_date`; reset removes that lifecycle while preserving review
  events. Idempotent retries and reinforcement do not consume another NEW
  allowance, and concurrent first writes are serialized per learner.
- Added focused settings/queue/review/UI coverage, migration assertions and a
  Trusted DB US-30 suite. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-28 + US-29 learning sets and learner assignments

- Added five deterministic curated learning sets with ordered vocabulary
  membership and authenticated catalog/detail APIs and UI.
- Added normalized, household-authorized learner/set assignments. Existing
  learners and newly created learners receive the all-starter compatibility set
  through canonical paths.
- Review queue eligibility now requires enabled vocabulary in at least one
  active assigned enabled set; repeated vocabulary across sets is deduplicated.
- Unassignment preserves progress and review history, and reassignment reuses
  the canonical learner/vocabulary progress row. Imported rows remain disabled.
- Added forward-only migration/reset/schema assertions, focused API/UI/queue
  coverage and a Trusted DB US-28/29 suite. Status:
  `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-26 + US-27 vocabulary taxonomy implementation

- Implemented a nullable canonical vocabulary level model with optional API
  filters and a Vocabulary List level selector. No grade was inferred because
  the imported source contains no grade metadata; all current rows remain
  unclassified.
- Added 17 source-backed canonical topics and normalized
  `vocabulary_topics` many-to-many membership, plus authenticated topic APIs
  and a responsive topic browse screen.
- Preserved starter IDs, imported source identities, disabled imported rows,
  learner progress and review events. Study queue and scheduler behavior are
  unchanged.
- Added migration safety assertions, focused API/UI tests and Playwright E2E
  coverage. Implementation commit: `d612e1a`. Status: `IMPLEMENTED / READY FOR
  OWNER CHECK`.

## 2026-09-19 — Repository recovery: US-12 through US-25 backfill and Core CI closeout

- Backfilled retrospective story contracts for US-12 Audio Pronunciation,
  US-13 Recall/Scheduler Integration, US-14 Due/New Queue, US-15 Session
  Reinforcement, US-16 Save Before Next, US-17 Safe Retry, and US-18 Reload/Leave.
- Recorded closed US-19 Session Summary (`72120022`), US-20/US-21 Progress and
  Isolation (`ee9fd8a`), US-22 Vocabulary List (`e56940c`, manual owner check
  deferred), US-23 Missing Media, and US-24 Reset Progress (`101ccc1`).
- Recorded US-11 acceptance (`d5fea5e`), US-12 (`5988661`), US-13–US-15
  audited baseline (`c0b65f4`), US-16–US-18 closeout (`447d6e2`), and the
  existing media-manifest/Cloudinary foundation plus starter enrichment tooling.
- US-25 (`f17521b`) documents the schema/source-identity importer, real
  migration/import of 1,994 records, disabled imported rows, and the
  post-import idempotency result of 0 inserts, 0 updates, and 1,994 skips.
- GitHub Core CI run `35250926587` failed in Unit and component tests because
  `scripts/enrich-starter-vocabulary.test.ts` read gitignored `local-data/`;
  Trusted DB run `35250926632` passed. Recovery replaces that test dependency
  with deterministic tracked fixtures while retaining real-data manual tooling.
- Recovery commit `60b384dd1f53ca5a5472402292a450190446ba9e` passed Core CI run
  `35434440380` and Trusted DB Integration run `35434440386`; US-25 is now
  `ACCEPTED / CLOSED`.
- At that recovery checkpoint US-26 had not started. `docs/decisions.md`
  remains protected and is intentionally not changed.

## 2026-09-16 — Starter vocabulary enrichment tooling

- Added the dry-run-first `vocab:enrich-starter` command for the eight
  owner-approved rows `1, 2, 7, 8, 9, 11, 18, 19`.
- Added exact source/media identity checks, missing-source preservation,
  content-version idempotency and guarded single-transaction apply logic.
- No real database apply was run; student `10` and the remaining 21 starter
  rows remain excluded.

## 2026-09-16 — US-11 Flashcard Back Content & Recall Actions implementation

- Extended the reusable Flashcard presentation with explicit back-side IPA,
  Vietnamese meaning and available supporting content.
- Preserved optional image fallback, added meaningful image alternative text and
  kept absent optional fields out of the rendered back.
- Preserved Study-owned Remembered/Forgotten controls, review writes,
  reinforcement and summary behavior; controls remain unavailable before flip.
- No backend, schema, migration or database behavior changed. Trusted DB is not
  required for this UI-only refinement.
- US-11 implementation is ready for owner check; US-12 has not started.

## 2026-09-16 — US-10 Reusable Flashcard Front State implementation

- Extracted the Study card presentation and media fallback behavior into the
  reusable `Flashcard` component.
- The front now mounts only the English word, flip affordance and explicitly
  allowed manual audio; meaning and answer-bearing optional content are
  conditionally rendered only on the back.
- Preserved Study queue/review/reinforcement/summary behavior and responsive,
  keyboard and focus-visible interaction.
- No backend, schema, migration or database behavior changed. Trusted DB is not
  required for this UI-only refinement.
- US-10 implementation is ready for owner check; US-11 has not started.

## 2026-09-15 — US-09 Flashcard Session UX implementation

- Implemented the Architecture Step 9 queue-backed Study session over the
  accepted US-08 review queue and US-07 scheduled-review write APIs.
- Added due-first flashcard presentation, flip/back content, manual audio and
  media fallback, server-confirmed recall actions, exact-payload retry,
  stale-revision reconciliation, bounded session-local reinforcement and an
  ephemeral session summary.
- No schema, migration, API or database behavior changed. Trusted DB is not
  required for this UI/client-composition slice.
- Local implementation evidence is complete; US-09 is ready for owner check.
- `docs/decisions.md` remains protected and unchanged.

## 2026-09-15 — US-08 Review Queue accepted and merged

- Accepted immutable US-08 candidate
  `bb91e01073dd156602cddb5bb98948ce06659bbe` after technical review, Core CI
  run `34970869460` PASS, scoped Trusted DB run `34971985883` PASS for
  `us08-review-queue`, and Owner Acceptance `OWNER_ACCEPT_US08`.
- PR #7 merged the accepted candidate into `main` at
  `2e8dd0f30754969f86fb00933813dcebbbe342d5`, with merge parents
  `1a860ffc16e688b806299d4dafe4e8a064c0d1f2` and
  `bb91e01073dd156602cddb5bb98948ce06659bbe`.
- Real PostgreSQL evidence passed for authorization and household isolation,
  sparse NEW and revision `0`, due/new ordering and caps, NEW suppression,
  timezone ownership, BIGINT/revision read behavior, read-only queue behavior
  and runtime-role execution. US-07 write/CAS behavior remains separate.
- US-08 success boundary `review-queue-ready` is achieved and US-08 is now
  `ACCEPTED / CLOSED`. The reset evidence note remains: all six fixture cleanup
  operations completed and `us08-reset` was invoked, but the final reset state
  is not independently proven because no distinct reset-completion marker was
  emitted.
- Historical candidates #1 through #4 remain permanently `FAILED / RETIRED`;
  candidate #5 is the accepted candidate. US-07 remains `IN PROGRESS / BLOCKED`
  with its CAS P1 open, and US-09 has not started.

## 2026-09-15 — US-08 consolidated cap/suppression harness fix-forward

- Retained candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` as `FAILED / RETIRED` after
  Trusted DB run `34960083041` exposed the systematic cap-harness isolation
  defect at `US08_DB_DUE_19_COUNTS`.
- Updated the Trusted DB harness to isolate each fresh cap learner from
  pre-existing enabled vocabulary with strict-future progress, while keeping
  global vocabulary unchanged. The 19-DUE NEW-cap, 20-DUE suppression and
  21-DUE order-before-LIMIT contracts now derive explicit expected sets and
  emit detailed diagnostics.
- Product code, schema, migrations, workflow/orchestration, US-07 and the
  prior live-proven fixes remain unchanged. The fix is uncommitted; no
  Trusted DB rerun or candidate #5 was created.

## 2026-09-15 — US-08 queue-semantics harness fix-forward

- Retained immutable candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` as `FAILED / RETIRED` after
  Trusted DB run `34954397186` reached live authorization and old-`42601`
  evidence, then exposed the invalid queue-semantics count expectation.
- Updated only `scripts/test-review-queue-db.ts`: the queue-semantics learner
  now receives strict-future progress for enabled vocabulary that pre-existed
  the scenario, preserving the intended sparse NEW rows and deterministic
  DUE-first queue. Diagnostics include expected/actual review date, IDs and
  counts without normalizing the runtime response.
- Product code, schema, migrations, workflow/orchestration, US-07 and the
  prior authorization/`42601` fixes remain unchanged. The local fix is
  uncommitted; no external Trusted DB rerun or new candidate was created.

## 2026-09-15 — US-08 authorization harness expectation fix-forward

- Kept immutable candidate
  `9dad72447457b08327de2606e218d34c37af1912` as `FAILED / RETIRED` after
  Trusted DB run `34950169177` exposed the invalid exact-one authorization
  expectation.
- Updated only `scripts/test-review-queue-db.ts`: the positive authorization
  case now derives the eligible global NEW prefix independently from canonical
  migration-role state, enforces the existing order/cap/virtual-NEW contract,
  and emits expected/actual queue diagnostics.
- Confirmed no product, schema, migration, workflow, US-07 or US-09 scope
  changed. The old `42601` fixture fix remains closed. Local validation passes;
  external Trusted DB was not rerun and no new candidate was created.

## 2026-09-15 — US-08 Trusted DB harness fix-forward diagnosis

- Retired immutable candidate
  `54a029f333dcee7abfa825e9991d8d61797e87e4` after Trusted DB run
  `34941415887` failed with PostgreSQL SQLSTATE `42601` in the US-08
  authorization fixture setup.
- Confirmed a harness-only `vocabularies` INSERT arity defect: the shared
  fixture helper listed `content_version` without supplying a fifth value.
  The local fix removes that target column so the schema default `1` applies.
- Product semantics, schema, migration, workflow and US-07 behavior remain
  unchanged. Focused validation is `41/41`, full tests are `251/251`, E2E is
  `11/11`, and lint, typecheck, build, Drizzle and workflow/preflight checks
  pass.
- No new immutable candidate was created. Narrow technical review, future
  Core CI and the scoped Trusted DB rerun remain pending; US-08 remains
  `IN PROGRESS / BLOCKED`.

## 2026-09-15 — US-08 acceptance evidence hardening

- Implemented the five queue test-quality areas with queue-specific
  authorization, future-progress, UTC/local timezone, ordering/cap and
  unsafe-BIGINT coverage. A follow-up review found the due progress insertion
  order needed to be noncanonical to prove order-before-LIMIT; that P2-4 fix
  is now implemented and pending technical re-review.
- Added an independent `scripts/test-review-queue-db.ts` PostgreSQL suite for
  live queue semantics, read-only behavior, role use, cleanup/reset and
  household isolation.
- Added explicit `TRUSTED_DB_SUITE=us08-review-queue` orchestration while
  preserving `full` as the canonical default. Trusted DB and Core CI were not
  run; US-07 remains blocked on its known CAS P1 and US-08 remains in progress.

## 2026-09-15 — US-08 Review Queue owner-override implementation

- Started the owner-authorized US-08 `Review Queue` implementation on an
  isolated `us-08` branch from `origin/main` at
  `c3b2eb422bb5d922c5c2808ad2761674ba11b93a`.
- Added the strict queue contract and authenticated household-scoped read API
  for deterministic due-first and sparse-NEW selection, including
  household-local date and revision metadata, plus focused tests and the
  US-08 story.
- No schema, migration, reset, privilege, study-session UI, US-07 diagnostic
  or Trusted DB work was added. US-07 remains `IN PROGRESS / BLOCKED` with its
  known PostgreSQL CAS P1 open; the owner override does not imply acceptance.

## 2026-09-14 — US-07 Scheduled Review Write fix-forward 2

- Aligned the story contract with the reviewed household-scoped idempotency
  key `(household_id, review_id)`, BIGINT scheduler/revision persistence and
  JavaScript safe-integer/MAX_SAFE revision semantics.
- Replaced numeric-only UUID fixtures so uppercase/lowercase canonicalization
  coverage is non-vacuous. Focused tests remain `27/27` PASS and full tests are
  `238/238` PASS; US-07 remains `IN PROGRESS`.
- Technical re-review, Core CI and Trusted DB Integration remain pending. No
  implementation redesign, commit, push or US-08 work was performed.

## 2026-09-14 — US-07 Scheduled Review Write fix-forward 1

- Resolved the three technical-review P1 findings: household-scoped review
  idempotency, canonical UUID fingerprinting and safe BIGINT scheduler
  persistence with explicit JavaScript safe-integer boundaries.
- Added focused foreign-review-ID, case-normalization, numeric-boundary and
  migration-alignment regressions. Focused US-07/schema-reset tests are
  `27/27` PASS; US-07 remains `IN PROGRESS`.
- Technical re-review, Core CI and Trusted DB Integration remain pending;
  Trusted DB is required for final acceptance. No US-08 work was started.

## 2026-09-14 — US-07 Scheduled Review Write implementation checkpoint

- Started US-07 implementation under the approved scheduled-review contract.
- Added shared review DTOs, additive progress/event schema and migration
  `0004_scheduled_review_write`, reset support and `POST /api/reviews` with
  authorization, sparse NEW, scheduler, idempotency, CAS concurrency, atomic
  persistence and safe errors.
- Added focused API/service and schema/reset tests. US-07 remains `IN PROGRESS`;
  technical review, Core CI, Trusted DB and owner acceptance remain pending.
- Review Queue, Study UI, reinforcement, seed changes, CI/workflow changes and
  US-08 remain out of scope. `docs/decisions.md` remains protected local work.

## 2026-09-14 — US-07 Scheduled Review Write contract approved

- Owner approved US-07 for implementation with the canonical scheduled-review
  response DTO, first materialized revision `1`, missing/disabled vocabulary
  `404 VOCABULARY_NOT_FOUND` behavior (or the established equivalent),
  authorization-before-replay and enabled-learner rules.
- Preserved the server-authoritative idempotency, sparse `NEW`, optimistic
  concurrency, timezone, immutable event and atomic progress/event contracts.
- US-07 is `READY FOR IMPLEMENTATION`; Review Queue and US-08 remain out of
  scope. Final acceptance requires Core CI and Trusted DB Integration.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  protected unrelated local work.

## 2026-09-14 — US-07 Scheduled Review Write contract preparation

- Added US-07 at `READY FOR CONTRACT REVIEW` as the recommended next story
  after accepted US-06 and Architecture Step 6: `POST /api/reviews`.
- Locked the discovery scope around one scheduled server-authoritative write,
  sparse virtual `NEW` materialization, `reviewId` idempotency,
  `expectedRevision`, household-local dates and atomic progress plus immutable
  review-event persistence.
- Kept Review Queue (Architecture Step 8), reinforcement, Study-session UX,
  progress presentation and US-08 out of scope.
- Identified owner decisions required before implementation: exact response DTO,
  first materialized revision (`0` versus `1`) and confirmation of the
  missing/disabled vocabulary `404 NOT_FOUND` mapping.
- US-07 requires additive schema/migration and real DB concurrency validation,
  so Trusted DB Integration will be required for its later acceptance.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  protected unrelated local work.

## 2026-09-13 — US-06 Learning Scheduler Domain accepted

- US-06 is `ACCEPTED`; the `scheduler-domain-ready` success boundary was
  achieved and T06-01 through T06-17 are `PASS`.
- Focused learning-domain tests `51/51` PASS; full tests `218/218` PASS; E2E
  `11/11` PASS; lint, typecheck, build and `git diff --check` PASS; technical
  re-review PASS.
- Core CI #32 PASS on reviewed commit
  `cc649d2dca4b233752e08f9c565ad384ea2f6816`; Core CI #33 PASS on merged main
  commit `b838f107a69830234202caded33f9b7ad0040c9e`.
- Trusted DB Integration #30 PASS is extra evidence only and was not required
  for this pure-domain story. No API, persistence, review queue, session,
  schema, migration, dependency, UI or US-07 work was added.
- PR #3 was merged before explicit Owner Acceptance. The post-merge audit
  confirmed the exact reviewed revision, green CI and no scope drift;
  classification is `PROCESS-ORDER DEVIATION ONLY`, with no revert required.

US-07 remains not started.

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
