# Current Handoff Snapshot

## 2026-09-21 — US-39 + US-40 XP, level and achievements

- Audit found no reward persistence, catalog or UI. Canonical review idempotency, household authorization, household-local daily activity, streak derivation and session-local reinforcement were reused.
- Added immutable `xp_events`, idempotently seeded achievements and immutable learner unlock records. Scheduled review and daily-goal rewards are safely coupled to the canonical review write; no XP backfill occurs.
- Exercise correct-bonus remains deferred because the current client-generated exercise flow has no trusted server-side exercise context. `.env.example`, `docs/decisions.md` and local data remain untouched.

## 2026-09-21 — US-39/US-40 fix-forward

- Trusted DB fixture teardown now explicitly removes learner-owned `learner_achievements` and `xp_events` before deleting learner profiles; the reference achievement catalog remains intact.
- The optional review exercise submission is server-verified against canonical vocabulary data. Correct scheduled exercises earn one `EXERCISE_CORRECT` ledger event worth 5 XP; mismatched client recall results are rejected, reinforcement remains reward-free, and raw typed input remains transient.

## 2026-09-21 — US-37 + US-38 weekly/daily and topic progress

- Audit classified US-37 historical aggregation/weekly UI and US-38 learner topic aggregation/UI as missing; canonical review history, household-local dates, sparse progress, topics, active learning-set eligibility and authorization were reusable.
- Added read-only range and topic APIs plus the Progress dashboard sections. `newLearned` is derived from immutable review-event `previous_status = NEW`, so reset-created lifecycles are represented without a schema change or fabricated backfill.
- Topic scope is current enabled vocabulary reachable through active assigned enabled sets. Imported mappings remain 1,994 and the 30 starter rows remain unmapped; no topic was guessed. `docs/decisions.md`, `.env.example` and local datasets remain untouched.

- Project: VocabFlow Family MVP
- Current phase/batch: Family MVP US-01..US-25 complete; Phase 2 / US-26 + US-27 + US-28 + US-29 + US-30 + US-31 + US-32 + US-33 + US-34 ready for owner check
- Current Git branch: `TXH`
- Current implementation baseline: commit `d5791c7` (`feat: add image and typing exercises`) on `TXH`, with protected local changes preserved
- US-24: `ACCEPTED / CLOSED`.
- US-25: `ACCEPTED / CLOSED` after recovery Core CI and Trusted DB passed.
- US-26 + US-27: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-28 + US-29: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-30: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-31 + US-32: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-33 + US-34: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-22: `IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK DEFERRED`.
- Catalog state after real import: 30 starter rows + 1,994 imported rows =
  2,024 total vocabulary rows.
- Imported catalog defaults: `enabled=false`; source identity is
  `(source_dataset, source_record_id)` and is separate from canonical DB ID.
- Real US-25 evidence: migration/import PASS; starter, learner_progress, and
  review_events modifications were 0; post-import idempotency dry run was
  INSERT_COUNT=0, UPDATE_COUNT=0, SKIP_COUNT=1994, DATABASE_MUTATIONS=0,
  STATUS=PASS.
- Core CI on the implementation baseline: `FAIL`, run `35250926587`, at Unit
  and component tests because a starter-enrichment test required gitignored
  `local-data/`.
- Trusted DB on the implementation baseline: `PASS`, run `35250926632`.
- Recovery fix in commit `60b384d`: deterministic tracked test fixtures replace
  the CI test's dependency on local generated/source data. Core CI run
  `35434440380` and Trusted DB run `35434440386` both passed.
- Protected: never modify, stage, restore, reset, clean, or commit
  `docs/decisions.md`. Preserve `.env.example` and `local-data.zip` changes.
- Final US-30 evidence: local validation passed; Core CI run `35443781349` and
  Trusted DB run `35443781278` both passed. Next safe action: request owner
  check for US-26 through US-32. US-22's manual owner check remains deferred.
- Documents new agents must read first: `docs/README.md`,
  `docs/product/product-spec.md`, `docs/architecture/technical-architecture.md`,
  `docs/design/design-system.md`, `docs/design/feature-ui-spec.md`,
  `docs/flow/user-flow.md`, `docs/roadmap.md`, the relevant story, and this file.

## 2026-09-19 — US-28 + US-29 implementation checkpoint

- Gap audit found no learning-set schema, normalized learner assignment,
  assignment UI or set-aware queue eligibility. Existing vocabulary IDs,
  household ownership and sparse progress primitives were retained.
- Added five deterministic curated sets, ordered memberships and the
  backward-compatible `starter-vocabulary` set containing all 30 enabled
  starter rows. Imported rows remain disabled and are not inferred into sets.
- Added household-authorized assignment APIs/UI. Existing learners receive the
  default assignment in migration and new learners receive it in the canonical
  learner-create path.
- Queue eligibility is now `enabled vocabulary ∩ union(active assigned sets)`;
  `EXISTS` keeps repeated membership deduplicated. Unassign preserves progress
  and review events; reassignment reuses progress.
- Focused tests, full tests, lint, typecheck, build, E2E, diff checks and the
  post-push Trusted DB gate pass. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-20 — US-33 + US-34 exercise implementation checkpoint

- Gap audit found the existing DTO media fields, Flashcard media safety,
  canonical review API and queue admission reusable; image interaction,
  typing interaction, strict answer normalization and exercise media fallback
  were missing.
- Added `IMAGE_TO_WORD` and `TYPE_WORD` to the same controlled exercise layer.
  Image mode requires a usable image plus four safe word choices and uses a
  neutral alt label. Typing uses deterministic Vietnamese-first cues, NFKC /
  trim / case-insensitive exact comparison and preserves meaningful spaces.
- Broken image or optional cue media uses one-way fallback without a review
  mutation. Canonical review, retry, reinforcement, summary, queue eligibility,
  daily New limits and learner isolation remain unchanged. No schema change;
  `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — US-26 + US-27 implementation checkpoint

- Gap audit found no existing canonical level model/filter or topic catalog,
  normalized mapping, API or browse UI.
- Added nullable `vocabulary_level` with six explicit values. The source
  dataset has no grade metadata, so all 2,024 catalog rows remain NULL and no
  inference or bulk assignment was performed.
- Added 17 source-backed canonical topics and normalized
  `vocabulary_topics` mappings. The migration maps 1,994 imported rows by
  exact source topic; 30 starter rows remain unmapped because their source
  topic is NULL. Imported rows remain disabled.
- Added optional level filters, topic APIs, topic browse UI, migration/schema
  assertions, focused API/UI tests and E2E coverage. Scheduler, progress and
  review-event paths were not changed semantically.
- Implementation commit: `d612e1a`.
- Local status: IMPLEMENTED / READY FOR OWNER CHECK. Final lint, typecheck,
  full tests, build, E2E, diff and Trusted DB gates are still being run.
- `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — Repository recovery checkpoint

- Confirmed documentation drift: canonical story index stopped at US-11 and
  current handoff/roadmap statements incorrectly said US-12 had not started.
- Confirmed Core CI root cause from GitHub run `35250926587`: the test
  `starter vocabulary enrichment safety > loads the real source...` failed
  with `ENRICHMENT_SOURCE_UNREADABLE` because `local-data/` is gitignored.
- The fix keeps real-data loading available to the manual enrichment tool and
  makes automated tests deterministic with in-repository fixtures.

## 2026-09-16 — starter enrichment tooling checkpoint

- Added a dry-run and guarded transactional apply tool for the owner-approved
  starter enrichment subset `1, 2, 7, 8, 9, 11, 18, 19`.
- The tool validates exact DB/source identity and explicit media-map
  resolution, preserves enabled state and learner history, and fails safe on
  unexpected database content or partial updates.
- The real database apply command was not run; US-12 remains unstarted and
  `docs/decisions.md` remains protected.

## 2026-09-16 — US-11 implementation checkpoint

- Confirmed the accepted reusable Flashcard remains answer-free before flip and
  now explicitly covers the post-flip IPA, meaning, optional content and
  image-accessibility contract.
- Study continues to render Remembered/Forgotten only after flip and retains
  the accepted US-09 review, reinforcement and summary flow.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-11
  is ready for owner check and US-12 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-16 — US-10 implementation checkpoint

- Extracted the Study presentation and media behavior into the reusable
  `Flashcard` component at `apps/web/src/features/study/flashcard.tsx`.
- The component keeps answer-bearing content out of the pre-flip DOM while
  preserving the accepted click/Space flip, media fallback and Study review
  controls.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-10
  is ready for owner check and US-11 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-15 — US-08 authorization harness expectation fix-forward

### Diagnosis and fix

- The failed candidate `9dad72447457b08327de2606e218d34c37af1912` remains
  `FAILED / RETIRED` after Trusted DB run `34950169177` failed in
  `us08-authorization-cases`.
- Diagnosis confirmed a harness-only expectation defect: the authorization
  test treated `allowed.queue.length !== 1` as an empty queue even though the
  migrated database contains 30 enabled global vocabulary rows and the
  production NEW selection is ordered by ID and capped at 10.
- `scripts/test-review-queue-db.ts` now independently derives the eligible
  global NEW prefix from migration-role state, compares the runtime response
  without sorting or normalizing the actual list, and logs expected/actual
  counts and vocabulary IDs. Positive and negative learner authorization
  evidence remains intact.

### Scope and gate status

- Product semantics, schema, migrations, workflow/orchestration and US-07
  behavior are unchanged. The old `42601` fixture INSERT fix is preserved.
- Local validation is complete and passing. No new immutable candidate was
  created, no external Trusted DB was rerun, and the failed candidate was not
  amended or reused. The next gate is narrow authorization-harness technical
  review.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-08
  remains `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md`
  remains protected local work.

## 2026-09-15 — US-08 queue-semantics harness fix-forward

### Diagnosis and fix

- Trusted DB run `34954397186` for immutable candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` passed target-SHA validation,
  authorization cases and the prior `42601` fixture path, then failed in
  `us08-queue-semantics` with `US08_DB_QUEUE_COUNTS`.
- Diagnosis confirmed a second harness-only expectation defect: the migrated
  database and earlier authorization fixtures leave enabled global vocabulary
  rows visible to the learner's NEW query. The queue-semantics fixture now
  inserts strict-future progress for pre-existing enabled rows, before adding
  its scenario-specific vocabulary, so only the intended sparse NEW rows are
  eligible.
- The diagnostic now reports expected/actual review date, DUE and NEW IDs,
  counts and complete queue IDs. Production code, schema, migrations,
  workflow/orchestration and US-07 behavior are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` remains `FAILED / RETIRED` and
  is not amended or reused. No external Trusted DB run or new candidate was
  created.
- Local validation is required before the narrow queue-semantics harness
  technical review. US-07 remains `IN PROGRESS / BLOCKED` with its known CAS
  P1 open; US-08 remains `IN PROGRESS / BLOCKED`; US-09 has not started.
- `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 consolidated cap/suppression harness fix-forward

### Diagnosis and fix

- Trusted DB run `34960083041` proved candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` through authorization and the
  queue-semantics isolation stage, then failed at
  `us08-caps-and-suppression` / `US08_DB_DUE_19_COUNTS`.
- Source diagnosis confirmed a systematic harness isolation defect: fresh cap
  learners saw globally enabled baseline and prior-fixture vocabulary as NEW,
  while the cap expectations assumed scenario-only vocabulary. The fix now
  captures enabled vocabulary before each cap fixture, gives only that fresh
  learner strict-future progress, and derives explicit 19/20/21 contracts.
- Cap diagnostics now report expected/actual counts, DUE/NEW IDs, queue IDs,
  review date and suppression state. Product semantics, schema, migrations,
  workflow/orchestration, US-07 and prior live-proven fixes are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` remains `FAILED / RETIRED` and
  will not be amended or reused. No external Trusted DB run or candidate #5
  was created.
- US-07 remains `IN PROGRESS / BLOCKED` with its CAS P1 open; US-08 remains
  `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md` remains
  protected local work.

## 2026-09-15 — US-08 Trusted DB harness fix-forward checkpoint

### Diagnosis and fix

- Trusted DB run `34941415887` reached the exact retired candidate
  `54a029f333dcee7abfa825e9991d8d61797e87e4` and failed with PostgreSQL
  SQLSTATE `42601` during `us08-authorization-cases` / `us08-fixture-auth-a`.
- The root cause was confirmed as a harness-only `vocabularies` fixture INSERT
  arity defect in `scripts/test-review-queue-db.ts`: five target columns were
  supplied with four expressions. The fixture now omits `content_version` from
  the target list so the canonical schema default `1` applies.
- The shared helper covers all US-08 fixture callers. No product behavior,
  schema, migration, workflow, US-07 code or US-07 CAS finding changed.

### Validation and gate status

- Focused US-08/harness/reset/preflight validation: `41/41` tests PASS across
  five files; full local tests: `251/251` PASS; E2E: `11/11` PASS.
- Lint, typecheck, build, Drizzle check, YAML parsing, workflow/preflight
  checks and `git diff --check` PASS. No reliable local PostgreSQL arity
  regression was added; real Trusted DB remains authoritative for SQL shape.
- The failed SHA remains `FAILED / RETIRED`. No new immutable candidate was
  created; future Core CI and scoped Trusted DB rerun remain pending after
  narrow technical review. US-08 remains `IN PROGRESS / BLOCKED`.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-09 has
  not started. `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 owner-override implementation checkpoint

### Discovery and gate override

- The owner explicitly authorized parallel US-08 work while US-07 remains
  `IN PROGRESS / BLOCKED` on the known PostgreSQL CAS P1. This does not mark
  US-07 accepted, close the CAS finding or authorize US-07 Trusted DB work.
- US-08 is the canonical `Review Queue` story for Architecture Step 8. No
  hard implementation blocker was found. Existing authentication, learner
  ownership, vocabulary DTOs and sparse progress are contract-stable
  dependencies; persisted review-flow acceptance remains acceptance-blocked
  by the unresolved US-07 database evidence.

### Implemented scope

- Added the strict review-queue response contract and a read-only
  `GET /api/learners/:learnerId/review-queue` service/route.
- Implemented household authorization, household-local server date, due-first
  ordering, due/new caps, sparse virtual `NEW`, deterministic ordering and
  safe error responses. No browser-to-Neon access, study-session UI,
  schema/migration/reset change or duplicate scheduler/persistence logic was
  added.
- Added focused API/service coverage and the active story at
  `docs/stories/US-08-review-queue.md`.

### Gate status

- US-08 remains `IN PROGRESS`; implementation evidence and local validation
  are pending completion before technical review.
- US-07 remains `IN PROGRESS / BLOCKED`; its diagnostic worktree and
  `docs/decisions.md` remain protected. No US-07 Trusted DB or Core CI run was
  performed.

## 2026-09-15 — US-08 acceptance evidence hardening checkpoint

### Evidence delta

- Implemented the five test-quality areas identified by technical review:
  queue-specific cross-household/disabled/missing authorization, explicit
  future progress exclusion, a UTC/local timezone boundary, ordering with
  19/20/21 due-cap fixtures, and queue-specific unsafe BIGINT revision
  handling. A narrow follow-up review found the due progress insertion order
  needed to be noncanonical as well; that P2-4 fix is now implemented and
  pending technical re-review.
- Added `scripts/test-review-queue-db.ts`, an independent real-PostgreSQL
  suite covering authorization, enabled vocabulary, due predicate and
  ordering, sparse NEW selection, MASTERED rows, caps/suppression, timezone,
  BIGINT revisions, read-only state and cleanup/reset behavior.
- Added an explicit `TRUSTED_DB_SUITE` selector. `full` remains the default
  and preserves the canonical US-07 Trusted DB path; `us08-review-queue` is
  an explicit scoped path and is never selected implicitly.
- Added only the corresponding manual workflow choice and environment
  forwarding. No product semantics, schema, migration, reset policy or
  US-07 diagnostic/CAS code was changed.

### Gate status

- Local evidence validation is being rerun after the hardening delta. Trusted
  DB has not run, so all PostgreSQL-dependent US-08 criteria remain pending.
- Core CI has not run. US-07 remains `IN PROGRESS / BLOCKED` with its known
  CAS P1 open; US-08 remains `IN PROGRESS`; US-09 has not started.
- No commit, push, exact-SHA creation, US-07 modification or owner acceptance
  was performed. `docs/decisions.md` remains protected.

## 2026-09-14 — US-07 implementation checkpoint

### Implemented scope

- Added the approved strict review request/response contracts, additive
  `learning_status`/`review_result` enums, `learner_progress` and
  `review_events` schema, migration `0004_scheduled_review_write`, reset
  ordering and `POST /api/reviews` service/route.
- Added server-authoritative authorization, vocabulary availability checks,
  sparse NEW revision `0 → 1`, deterministic fingerprints, replay/conflict
  handling, CAS writes, race reclassification, household-local dates and
  atomic progress/event persistence.
- Added focused review and schema/reset tests: `20/20` PASS; full repository
  tests are `231/231` PASS, E2E is `11/11` PASS, and lint, typecheck and build
  are PASS. US-07 remains `IN PROGRESS`; technical review, Core CI, Trusted DB
  and owner acceptance are pending.

### Scope guard

- No Review Queue, Study UI, reinforcement, US-08 work, seed change or
  CI/workflow change was added. `docs/decisions.md` remains an unrelated
  protected unstaged local modification.

## 2026-09-14 — US-07 fix-forward 1 checkpoint

### P1 findings resolved

- P1-H: review-event idempotency is now scoped to the server-authorized
  household, including pre-write lookup and post-race reclassification.
- P1-J: validated request UUIDs are canonicalized before fingerprinting,
  persistence comparison and response construction.
- P1-T: scheduler numeric persistence uses BIGINT with explicit safe-integer
  checks, safe database conversion and deterministic revision exhaustion
  handling; the US-06 scheduler remains unchanged.
- Focused US-07 service/API and schema/reset tests are now `27/27` PASS,
  including foreign-ID, UUID and numeric-boundary regressions.

### Gate status

- US-07 remains `IN PROGRESS`.
- Technical re-review is pending. Core CI and Trusted DB Integration remain
  pending; Trusted DB is required for final acceptance.
- No commit, push, Core CI run, Trusted DB run or US-08 work was performed.
- `docs/decisions.md` remains protected unrelated local work.

## 2026-09-14 — US-07 fix-forward 2 checkpoint

### Alignment scope

- Aligned the US-07 story's persistence and concurrency contract with the
  reviewed household-scoped `(household_id, review_id)` idempotency key.
- Documented BIGINT scheduler/revision storage, JavaScript safe-integer bounds,
  checked conversion and deterministic revision exhaustion behavior.
- Updated UUID regression fixtures to contain alphabetic hexadecimal characters,
  making uppercase/lowercase canonicalization coverage non-vacuous.
- Focused tests remain `27/27` PASS; full tests are `238/238` PASS; E2E is
  `11/11` PASS; lint, typecheck, build, Markdown links/anchors and
  `git diff --check` are PASS.

### Gate status

- US-07 remains `IN PROGRESS`; technical re-review is pending.
- Core CI and Trusted DB Integration remain pending; Trusted DB is required for
  final acceptance.
- No implementation redesign, commit, push, Core CI run, Trusted DB run or
  US-08 work was performed. `docs/decisions.md` remains protected local work.

## 2026-09-14 — US-07 contract owner approval

### Approved contract

- Owner approved the canonical response DTO, first materialized revision `1`,
  missing/disabled vocabulary `404 VOCABULARY_NOT_FOUND` behavior (or the
  established equivalent), authorization-before-replay and enabled-learner
  behavior.
- Fingerprint semantics, sparse virtual `NEW`, concurrent first-review
  handling, server-owned dates, immutable events and atomic progress/event
  persistence remain locked as documented in the story.
- US-07 was promoted to `READY FOR IMPLEMENTATION`; final acceptance requires
  Core CI and Trusted DB Integration. US-08 remains `NOT STARTED`.

### Scope guard

- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  an unrelated protected unstaged local modification.

## 2026-09-14 — US-07 story discovery / contract preparation

### Recommendation

- The correct next story is `US-07 — Scheduled Review Write`, aligned to
  Architecture Step 6 (`POST /api/reviews`). It is smaller and safer than
  combining review persistence with Review Queue or Study-session UX.
- Proposed success boundary: `scheduled-review-write-ready`, from the
  accepted `scheduler-domain-ready` boundary plus authenticated parent,
  authorized learner and approved sparse-progress architecture.
- Review Queue remains the later Architecture Step 8 milestone; reinforcement,
  session UX and progress presentation remain separate scope.

### Contract discovery

- The architecture fixes the strict request fields, server-owned scheduler
  computation, sparse virtual `NEW`, `reviewId` fingerprint semantics,
  `expectedRevision`, concurrent first-review race barrier, household-local
  review date, immutable event snapshot and atomic progress/event write.
- US-07 requires an additive application migration for `learning_status`,
  `review_result`, `learner_progress` and `review_events`, plus reset/index/
  privilege verification. Trusted DB Integration is therefore required for
  implementation acceptance.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains an
  unrelated protected unstaged local modification.

### Owner decisions required

- The exact successful response DTO is not specified by the repository; it
  must be approved before shared response contracts or `response_payload` are
  implemented.
- The first materialized revision is not explicitly specified. Recommended
  smallest choice: virtual `0` is consumed and first persisted/resulting
  revision is `1`.
- Confirm `404 NOT_FOUND` for missing/disabled vocabulary; no other critical
  source conflict was found.

US-06 remains `ACCEPTED / CLOSED`. US-07 implementation is now `IN PROGRESS`;
US-08 work has not started.

## 2026-09-13 — US-06 acceptance finalized

### Accepted evidence

- Owner approved US-06 final acceptance after the post-merge audit confirmed
  the exact reviewed implementation revision, no scope drift and no technical
  blocker.
- T06-01 through T06-17 are `PASS`; the success boundary
  `scheduler-domain-ready` is achieved.
- Focused learning-domain tests `51/51` PASS; full tests `218/218` PASS; E2E
  `11/11` PASS; lint, typecheck, build and `git diff --check` PASS.
- Technical re-review PASS. Core CI #32 PASS on reviewed commit
  `cc649d2dca4b233752e08f9c565ad384ea2f6816`; Core CI #33 PASS on merged main
  commit `b838f107a69830234202caded33f9b7ad0040c9e`.
- Trusted DB Integration #30 PASS is extra evidence only and was not required
  for this pure-domain story.

### Process and handoff

- PR #3 was merged before explicit Owner Acceptance. The audit verified the
  exact reviewed revision, green CI and no scope drift. Classification:
  `PROCESS-ORDER DEVIATION ONLY`; no revert was required.
- No API, persistence, review queue, session reinforcement, UI, schema,
  migration, dependency, CI/workflow or US-07 work was added by acceptance.
- US-07 has not started. `docs/decisions.md` remains an unrelated local
  modification and is excluded from acceptance work.

## 2026-09-11 — US-06 story discovery / contract preparation

### Completed

- Read the repository instructions, canonical Product/Architecture/Flow/UI
  sources, accepted US-01 through US-05 stories, progress/changelog records,
  current contracts/tests and the existing `packages/learning-domain` stub.
- Registered `US-06 — Learning Scheduler Domain` in BATCH 4 with status
  `READY FOR CONTRACT REVIEW`.
- Proposed the accepted upstream `first-flashcard-ready` handoff and the
  `scheduler-domain-ready` output boundary.
- Defined the pure scheduler input/output contract, virtual sparse `NEW`, all
  six scheduled transitions, 1/3/7/14/30 intervals, explicit local dates,
  no overdue bonus, typed invalid-input handling and persistence-owned
  revision/`reviewedAt` boundaries.

### Scope and handoff

- US-06 is pure learning-domain work only. `POST /api/reviews`,
  `learner_progress`, `review_events`, revision/idempotency, review queue,
  session reinforcement, UI, schema/migration, API and Trusted DB work remain
  out of scope.
- No application code, learning-domain implementation, schema, migration,
  API, dependency, CI/workflow or Neon operation was performed. No commit or
  push was performed.
- No source conflict was found; the remaining gate is owner review of the
  proposed contract. `docs/decisions.md` remains untouched and unstaged.
- US-07 has not started.

## 2026-09-11 — US-06 contract owner approval

### Approved contract

- Owner approved `US-06 — Learning Scheduler Domain` as a pure-domain story
  and promoted it from `READY FOR CONTRACT REVIEW` to `READY FOR
  IMPLEMENTATION`.
- Virtual `NEW` is an explicit canonical state object; `null` is not a valid
  scheduler state. The approved function receives `currentState`,
  `REMEMBERED`/`FORGOTTEN`, and explicit household-local `today`.
- The approved output is `scheduler-domain-ready`; it contains only canonical
  learning-domain values. Revision, `reviewedAt`, IDs, persistence and
  authorization remain outside the scheduler.
- Owner confirmed deterministic Gregorian calendar arithmetic, no overdue
  bonus, full transition/threshold coverage, typed validation and no UI/E2E
  requirement for this story.

### Handoff

- No learning-domain code, API, schema, migration, dependency, CI/workflow or
  Neon operation was performed. No commit or push was performed.
- The next permitted implementation scope is only the pure scheduler package
  and its exhaustive unit tests. `docs/decisions.md` remains untouched and
  unstaged.
- US-07 has not started.

## 2026-09-12 — US-06 implementation

### Completed

- Implemented `scheduleReview` in `packages/learning-domain` with explicit
  scheduler types, virtual `NEW`, state invariants, typed validation and
  synchronous deterministic transitions.
- Implemented Gregorian calendar validation/addition without system clock,
  timezone, UTC-instant, browser, storage or framework dependencies.
- Added 28 focused table-driven tests covering all transition classes,
  thresholds, date boundaries, overdue behavior, invalid input and
  non-mutation/determinism.
- Updated US-06 evidence: T06-01 through T06-16 PASS and T06-17 PASS locally;
  Core CI remains pending technical review.

### Validation and handoff

- `pnpm test` PASS (195/195), `pnpm lint` PASS, `pnpm typecheck` PASS,
  `pnpm build` PASS, `pnpm test:e2e` PASS (11/11), and `git diff --check` PASS.
- Trusted DB Integration is `NOT REQUIRED`; no API, DB/schema/migration,
  dependency, CI/workflow, UI or persistence change was made.
- US-06 remains `IN PROGRESS`; no acceptance finalization or US-07 work was
  started. `docs/decisions.md` remains untouched and unstaged.

## 2026-09-13 — US-06 fix-forward

### Completed

- Corrected the reviewed safe-integer overflow defect in scheduler counter
  increments. `totalCorrect`, `totalIncorrect` and incremented
  `consecutiveCorrect` now fail deterministically before an unsafe output can
  be returned.
- Added focused validation and transition coverage for overflow, fractional,
  NaN, Infinity and out-of-range numeric values; leap-year century rules;
  interval rollovers; large safe mastered counts; and full remembered outputs.
- Focused learning-domain tests now PASS at `51/51`; US-06 remains
  `IN PROGRESS` and no approved scheduler semantics changed.

### Validation and handoff

- No API, database/schema/migration, dependency, CI/workflow, UI, persistence
  or US-07 work was added. Trusted DB remains `NOT REQUIRED`.
- Technical re-review and Core CI remain pending. `docs/decisions.md` remains
  an unrelated unstaged local modification and was not changed.

## 2026-09-11 — US-05 implementation started

### Completed

- Moved US-05 to `IN PROGRESS` and implemented the owner-approved minimal
  learner-context → focused `/study` → first real vocabulary card flow.
- Reused the accepted `GET /api/vocabulary` contract with deterministic
  `vocabulary[0]` selection, keyboard/touch flipping and safe loading, empty,
  error, auth/403 and optional-field states.
- Added focused learner-context, Study UI/client and routing tests. No schema,
  migration, seed, write API, progress, scheduler, CI/workflow or US-06 work
  was added.

### Handoff

- Trusted DB remains inherited from accepted US-04 evidence; no new Trusted DB
  gate is proposed for this web-only story.
- `docs/decisions.md` remains an unrelated unstaged local change and is not
  part of the implementation scope.

### Validation checkpoint

- Focused US-05 tests PASS; full local test suite PASS at 167 tests.
- Lint, typecheck, build and `pnpm test:e2e` PASS (11/11) after the corrected
  Space-key interaction was revalidated.

## 2026-09-11 — US-05 pre-Core-CI manual acceptance checkpoint

### Owner evidence

- Manual owner acceptance PASS for resolved learner handoff through `Bắt đầu
  học`, real PostgreSQL-backed `/study`, first `apple` card from
  `vocabulary[0]`, front/back meaning visibility, pointer/touch and Space flip,
  Space scroll prevention, NULL optional fields, media safety, no fake review
  controls, safe `/api/vocabulary` error/retry, reload redirection and no
  active-learner persistence/guessing.
- Mobile owner verification at `375x812` for learner handoff and Study PASS with
  no horizontal overflow.
- T05-09 and T05-13 are now manual PASS; T05-10 and T05-11 remain accepted by
  automated coverage without fabricated database/content mutations. T05-12 is
  manual PASS.

### Gate and handoff

- T05-01 through T05-17 were locally PASS, subject to final Core CI evidence
  at this checkpoint; final acceptance is recorded below.
- US-05 was still `IN PROGRESS` at this pre-Core-CI checkpoint and was not
  accepted until Core CI passed.
- Trusted DB Integration is `NOT REQUIRED` for this web-only story. No schema,
  migration, seed, privilege, learning write, review write or database side
  effect was added.
- `docs/decisions.md` remains unrelated, unstaged, uncommitted and excluded.
- US-06 remains unstarted.

## 2026-09-11 — US-05 final acceptance

### Accepted evidence

- US-05 First Real Flashcard is `ACCEPTED`; T05-01 through T05-17 are `PASS`.
- Owner manual acceptance PASS for the learner handoff, `/study`, real
  `vocabulary[0]` `apple` card, front/back and flip interactions, NULL/media
  safety, no fake review controls, reload learner recovery, mobile 375x812,
  no horizontal overflow, safe API error and Retry recovery.
- Local evidence: `167/167` tests, E2E `11/11`, lint, typecheck, build and
  `git diff --check` PASS; no review/progress/scheduler/DB writes.
- Core CI #30 SUCCESS on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28 SUCCESS is incidental and is not a required
  US-05 gate. No schema, migration, seed, privilege or DB behavior changed.

### Handoff

- The local Node warning remains `22.19.0` versus pinned `22.23.2`; Core CI
  validated the pinned toolchain.
- `docs/decisions.md` remains preserved in its stash and was not changed by
  this acceptance commit.
- US-06 has not started.

## 2026-09-11 — US-04 contract preparation

### Completed

- Registered US-04 as `Vocabulary Content Seed & Read Foundation` with status
  `READY FOR CONTRACT REVIEW` before owner dataset approval.
- Locked Option A only: shared/global vocabulary schema, owner-approved 20–30
  word seed, validated controlled content migration and authenticated
  deterministic `GET /api/vocabulary`.
- Explicitly kept Learner Home, first flashcard rendering, study, scheduler,
  progress, review queue, review writes and US-05 out of scope.

### Blocker and handoff

- `DATASET_SOURCE=OWNER_APPROVAL_REQUIRED`; no vocabulary words or provenance
  were invented.
- No application code, migration, seed data, dependency, CI or Neon operation
  was performed.
- Next safe action: owner contract review and dataset-source approval. Do not
  move US-04 to `READY FOR IMPLEMENTATION` before that decision.

## 2026-09-11 — US-04 dataset source approved

### Completed

- Owner approved `VocabFlow Starter Vocabulary v1` with
  `DATASET_PROVENANCE=PROJECT_AUTHORED` and `DATASET_STATUS=APPROVED`.
- Locked the exact 30-record enabled set with stable IDs `1` through `30`,
  `contentVersion=1`, and `NULL` optional fields for v1.
- The only allowed claim is “beginner starter vocabulary selected for the
  VocabFlow MVP”; no official CEFR, Oxford, Cambridge, Wiktionary-derived or
  copied dictionary claim is permitted.
- Moved US-04 to `READY FOR IMPLEMENTATION`; no application code, migration,
  actual seed data, dependency, CI or Neon operation was performed.

### Handoff

- The next safe action is US-04 implementation from this approved contract.
- US-05 remains unstarted.

## 2026-09-11 — US-04 implementation started

### Completed

- Moved US-04 to `IN PROGRESS` and implemented the approved
  `vocabflow_app.vocabularies` schema with `content_version >= 1`.
- Added the controlled `0003` migration with the exact 30 Starter v1 records,
  the versioned JSON source artifact and pre-mutation dataset validator.
- Added shared `VocabularyDto`/response/seed contracts and
  `GET /api/vocabulary` with session → household membership authorization,
  enabled-only deterministic `id ASC` reads and strict query-scope rejection.
- Added targeted schema/reset, dataset, service and API tests. No UI, learner
  progress, review, scheduler, CI or US-05 work was added.

### Validation and handoff

- Dataset validation PASS; targeted US-04/schema/reset tests PASS; typecheck
  PASS. Full lint, tests, build and E2E remain to be run.
- Trusted DB Integration remains `PENDING ACCEPTANCE GATE`; no live Neon call
  was made.

## 2026-09-11 — US-04 pre-Trusted-DB acceptance checkpoint

### Completed

- Recorded owner manual acceptance PASS for authenticated `GET /api/vocabulary`:
  `200`, exactly 30 records, IDs `1..30`, first word `apple`, last word
  `new`, all `enabled=true`, all `contentVersion=1`.
- Recorded PASS for exact approved dataset content, all optional fields `NULL`,
  unsupported `householdId`/`learnerId` rejection as `400 INVALID_REQUEST`,
  and unauthenticated access as `401 UNAUTHORIZED`.
- Recorded local `DB_MIGRATE=PASS` plus dataset validation, lint, typecheck,
  tests, build, E2E, migration/schema/reset checks and `git diff --check` PASS.

### Gate and handoff

- US-04 remains `IN PROGRESS`; Trusted DB Integration remains
  `PENDING ACCEPTANCE GATE`.
- `403 HOUSEHOLD_ACCESS_DENIED` is automated-test evidence only; it was not
  manually forced by mutating the local database.
- The local Node runtime warning remains `22.19.0` versus pinned `22.23.2`.
- `docs/decisions.md` remains unrelated, unstaged and excluded; US-05 has not
  started.

## 2026-09-11 — US-04 acceptance finalized

### Accepted evidence

- US-04 Vocabulary Content Seed & Read Foundation is `ACCEPTED`.
- T04-01 through T04-16 are PASS with manual, local, migration/reset and
  Trusted DB evidence recorded in the story.
- Core CI #28 and Trusted DB Integration #26 both SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- US-05 remains unstarted; no next story was automatically started.

## 2026-09-11 — US-05 story discovery / contract preparation

### Recommendation

- Recommended title: `US-05 — First Real Flashcard`.
- Recommended scope: the smallest vertical slice from accepted
  `learner-context-ready` plus `vocabulary-content-ready` to one real,
  deterministic, flippable card.
- Recommended Learner Home decision: use only a minimal study-entry handoff;
  defer full due/new/progress metrics until their read contracts exist.
- Recommended output boundary: `first-flashcard-ready`.

### Contract handoff

- Reuse authenticated `GET /api/vocabulary`; select the first item in its
  deterministic `id ASC` order.
- Handle all Starter v1 optional fields as `NULL` without broken placeholders.
- Do not add schema, migration, dependency, API write, progress, scheduler,
  review or Trusted DB work.
- US-05 is `READY FOR CONTRACT REVIEW`; US-06 remains unstarted.

## 2026-09-11 — US-05 contract owner approval

### Approved boundary

- US-05 remains `First Real Flashcard` and is now `READY FOR IMPLEMENTATION`.
- Frozen input: `learner-context-ready` + `vocabulary-content-ready`.
- Frozen route: `/study`; frozen output: `first-flashcard-ready`.
- The minimal “Bắt đầu học” handoff is approved; full Learner Home metrics are
  deferred until progress/review read contracts exist.
- First selection is `vocabulary[0]` from accepted enabled-only `id ASC` API
  order. Space flips the focused card; no audio playback or review controls are
  added.

### Scope guard

- No schema, migration, dependency, API endpoint, database write, Trusted DB
  gate or US-06 work is authorized by this contract update.
- Implementation has not started.

## 2026-09-08 — Documentation and Agent Pack

### Goal

Create canonical Markdown documentation and a VocabFlow-specific AI-agent
operating contract before BATCH 1 implementation.

### Completed

- Audited the repository tree, package/configuration, apps, packages, Drizzle,
  scripts, workflows and current Git state.
- Converted six active canonical DOCX documents to Markdown.
- Added documentation index, source-baseline map, decisions, changelog,
  roadmap, story templates and US-01 contract.
- Added root `AGENTS.md` with VocabFlow scope, architecture, security, testing,
  documentation and Git rules.

### Decisions

- Family MVP remains the active product baseline; Personal MVP is historical.
- BATCH 0 is accepted and frozen.
- US-01 success boundary is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.

### Files changed

- Canonical Markdown files under `docs/product`, `docs/architecture`,
  `docs/design`, `docs/flow` and `docs/implementation`.
- Documentation governance files under `docs/`.
- Story system under `docs/stories/` and `docs/templates/`.
- Root `AGENTS.md`.

### Verification

- Textual parity check: all source paragraphs and table cells found in their
  Markdown counterpart.
- DOCX sources contain no embedded media or diagrams requiring binary export.
- Markdown link/fence validation: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS (10 files, 73 tests).
- `pnpm build`: PASS.
- `git diff --check`: PASS.
- Packaged DOCX renderer could not run because bundled LibreOffice was not
  available in this environment; no DOCX output was authored.

### Remaining / blockers

- No contract blocker remains; no feature implementation has started.

### Next safe action

- Begin US-01 implementation from `T01-01`; keep learner creation out of scope.

## 2026-09-08 — Finalize documentation governance and US-01 contract

### Goal

Resolve the documentation status gate and finalize the owner-approved US-01
registration boundary before feature implementation.

### Completed

- Aligned `docs/README.md`, `docs/stories/README.md` and `AGENTS.md` on the
  shared story status model.
- Set BATCH 1 and US-01 to `READY FOR IMPLEMENTATION`.
- Accepted success boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- Explicitly kept learner creation and new database schema/migration out of
  US-01.
- Corrected architecture conversion metadata to preserve source status
  `APPROVED FOR IMPLEMENTATION`.

### Verification

- Relative Markdown links and anchors: PASS.
- Vietnamese Unicode scan: PASS.
- No stale active DOCX links; remaining DOCX names are source-baseline/history
  references only.
- `git diff --check`: PASS.
- No application code, database code, migrations, CI or BATCH 0 changed.

### Remaining / blockers

- None for the accepted US-01 contract.
- Documentation/agent pack remains uncommitted by instruction.

### Next safe action

- Continue US-01 with T01-04 Better Auth + household bootstrap integration.

## 2026-09-08 — US-01 Phase 1 Register UI

### Completed

- Moved US-01 to `IN PROGRESS` and implemented T01-01/T01-02/T01-03.
- Added the `/register` focused auth screen, accessible email/password
  validation, password visibility toggle, Enter submit and autocomplete.
- Kept T01-04 (real Better Auth signup and authenticated household bootstrap)
  out of scope for this phase.

### Verification

- Component tests cover route rendering, validation, submit seam, keyboard
  submit, password toggle, autocomplete and error semantics.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- No database, migration, bootstrap, role-model, reset or CI changes.

### Next safe action

- Implement T01-04 Better Auth signup followed by idempotent `POST /api/bootstrap`.

## 2026-09-08 — US-01 Phase 1 checkpoint and contract correction

### Proven dependency

- The repository currently has `/api/auth/*` and Better Auth's four auth tables,
  but no `/api/bootstrap`, `households` or `household_members`; the only
  migration is the auth foundation migration.
- BATCH 0 TE-08 intentionally established Better Auth Foundation only and did
  not implement the Family household domain.

### Contract correction

- T01-04 may add the minimal additive BATCH 1 application migration for
  `vocabflow_app.households` and `vocabflow_app.household_members` using the
  approved Architecture contract.
- This does not reopen BATCH 0: role model, `vocabflow_meta`, target identity,
  bootstrap infrastructure, migration executor and reset architecture remain
  frozen.
- Learner profiles/creation and vocabulary, progress and review tables remain
  out of scope for US-01.

### Checkpoint

- Phase 1 (T01-01/T01-02/T01-03) is completed and checkpointed on branch `TXH`.
- Story status remains `IN PROGRESS`; T01-04 has not started.
- Next safe action: implement T01-04 signup plus household
  persistence/bootstrap.
- Do NOT do next: learner profile/learner UI or unrelated BATCH 0 changes.

## 2026-09-08 — Resolve Better Auth name contract blocker

### Proven blocker

- Better Auth 1.7.3 `signUp.email` requires `name`, `email` and `password`.
- The previous Phase 1 form exposed only email and password, so T01-04 could
  not safely call the pinned API without inventing a parent identity.

### Accepted resolution

- US-01 now explicitly collects `Tên phụ huynh`, `Email` and `Mật khẩu`.
- Name is required, trimmed before the Phase-1 seam, and accepts normal
  Vietnamese/Unicode text. It is the parent display/profile identity; learner
  name and learner creation remain out of scope, and household name remains
  server-owned.
- `US01_BLOCKED_BETTER_AUTH_NAME_CONTRACT` is RESOLVED.

### Checkpoint

- US-01 remains `IN PROGRESS`; T01-04 remains pending.
- No Better Auth signup request, `/api/bootstrap`, household migration or
  learner/domain implementation was started.
- BATCH 0 remains frozen.

### Next safe action

- Implement T01-04 Better Auth signup + household persistence/bootstrap.

## 2026-09-08 — US-01 T01-04 registration integration

### Completed

- Implemented the real Better Auth 1.7.3 signup path with the explicit parent
  `name`, `email` and `password` contract.
- Added the authenticated `POST /api/bootstrap` route and a server-owned,
  atomic/idempotent household resolver. Bootstrap ignores client owner input,
  uses the neutral default name `Gia đình VocabFlow`, and creates the canonical
  `OWNER` membership.
- Added only the additive `vocabflow_app.households` and
  `vocabflow_app.household_members` migration; no learner or learning-domain
  tables were introduced. Reset order is dependency-safe and preserves
  `vocabflow_meta`.
- Added signup/bootstrap loading, safe error, authenticated recovery/retry and
  completed states. Signup success alone is never presented as completed Family
  registration.
- Added API, component and migration/reset tests, including the serialized SQL
  and idempotent bootstrap contract.

### Checkpoint

- Story status: `IN PROGRESS`.
- T01-04 status: `IMPLEMENTED / PENDING ACCEPTANCE`.
- BATCH 0 remains `ACCEPTED` / frozen; no live Neon call was made.
- Acceptance review corrected the stale foundation smoke endpoint from
  `/api/auth/session` to Better Auth 1.7.3's supported
  `/api/auth/get-session`; `pnpm test:e2e` now passes locally. The test accepts
  `200 null` for a configured unauthenticated preview and `503` for secretless
  Core CI.
- Added a route-intercepted Playwright test for the native password-field
  Enter key: exactly one Better Auth signup, one bootstrap and completed state.
- Core CI and Trusted DB Integration statuses for the TXH commit are not
  available from this environment because the private repository cannot be
  queried without GitHub credentials and neither workflow runs on a TXH push.
  Do not mark US-01 accepted until those external gates are reviewed.

### Next safe action

- US-01 ACCEPTANCE TEST / REVIEW.

## 2026-09-08 — US-01 Trusted DB reset blocker

### Proven blocker

- Trusted DB reached the second migration after application reset and failed
  with SQLSTATE `42710`: `vocabflow_app.household_role` already existed.
- The reset removed application tables and migration history but left the enum
  type created by migration `0001_curious_miss_america.sql`.

### Fix scope

- Added `vocabflow_app.household_role` to the explicit application reset policy.
- Reset now drops application tables, then the enum type, then Drizzle history;
  clean-state validation fails early with `APPLICATION_ENUM_TYPES_PRESENT` if a
  type remains.
- Protected `vocabflow_meta`, the `drizzle` schema, roles and BATCH 0
  infrastructure remain untouched. Migration SQL was not made idempotent.

### Checkpoint

- US-01 remains `IN PROGRESS / PENDING ACCEPTANCE`.
- Local validation is required before the acceptance-fix commit; no live Neon
  call is made from this environment.

### Next safe action

- PR → Core CI → merge → Trusted DB Integration rerun. Do not start US-02.

## 2026-09-08 — US-01 acceptance finalized

### Accepted evidence

- US-01 Parent Registration is `ACCEPTED`.
- Core CI and Trusted DB Integration both PASS on merged main commit
  `6806e66`.
- Local lint, typecheck, 13-file/101-test suite, build and 2/2 Playwright E2E
  checks PASS; responsive checks at 375/768/1280px PASS.
- BATCH 0 remains `ACCEPTED / FROZEN`; BATCH 1 remains `IN PROGRESS`.

### Handoff

- There is no active next story.
- Next safe action: Project owner selects/reviews the next User Story.
- Do not automatically start US-02.

## 2026-09-19 — US-30 daily new word limit implementation checkpoint

- Gap audit found the existing Due-first queue, household-local date helper,
  sparse virtual New state, reset semantics, retry idempotency and US-29 set
  filtering already satisfied. Learner daily settings, daily consumption and
  parent controls were missing.
- Added `learner_profiles.daily_new_word_limit`, default 10, bounded to 0–100,
  with authorized GET/PATCH settings APIs and a learner-scoped parent UI.
- Queue allowance counts distinct current progress rows whose
  `first_learned_date` equals the household-local date. Due remains exempt and
  session caps remain independent. Atomic review writes serialize per learner
  and reject stale NEW writes after the allowance is consumed.
- Reset still deletes current progress while preserving review events; reset
  therefore makes the current lifecycle virtual New again without consulting
  all-time history.
- Focused validation is passing locally; full local and post-push Trusted DB
  gates remain pending at this checkpoint. `docs/decisions.md`, `.env.example`
  and `local-data.zip` remain protected.

## 2026-09-20 — US-35 + US-36 daily goal and learning streak

- Gap audit found the existing household-local date helper, persisted
  `review_events.review_date`, review idempotency, reset-history preservation and
  learner authorization reusable. Daily goal setting/status, unique activity
  aggregation, active-day derivation and streak UI/API were missing.
- Added `learner_profiles.daily_learning_goal` with default 10 and range 1–100.
  The existing `dailyNewWordLimit` remains an independent New-admission limit.
- Added learner-scoped `GET /api/learners/:learnerId/activity-summary`, deriving
  daily unique vocabulary and current/longest streak from persisted review
  history. Reinforcement, duplicate retry, remembered and forgotten reviews are
  handled by distinct vocabulary/date semantics; failed saves are absent.
- Progress now displays daily goal progress and streaks; parent settings can
  update both learner-scoped settings. Reset and learning-set unassignment do
  not erase historical activity. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-19 — US-31 + US-32 exercise implementation checkpoint

- Gap audit found the accepted queue, scheduler, review API, save-before-next,
  retry, reinforcement, summary and pronunciation hook were reusable; exercise
  generation, single-submit feedback, listening eligibility and safe media
  fallback were missing.
- Added a controlled `/study/exercises` route. Meaning and listening exercises
  generate four deterministic safe options from the admitted queue; insufficient
  distractors or broken audio fall back to Flashcard without changing queue
  eligibility or recording a review for media failure.
- Correct/incorrect answers use the existing `POST /api/reviews` path and map
  to `REMEMBERED`/`FORGOTTEN`. No database schema, progress semantics or
  scheduler intervals changed. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.
