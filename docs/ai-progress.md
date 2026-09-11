# Current Handoff Snapshot

- Project: VocabFlow Family MVP
- Current phase/batch: BATCH 2 — Learning Content Foundation (accepted)
- Current active story: none; US-04 Vocabulary Content Seed & Read Foundation
  is accepted
- Story status: ACCEPTED
- Current Git branch: `TXH`
- Baseline HEAD before documentation pack: `24e4580`
- Documentation/agent pack status: finalized and approved for repository baseline
- Last accepted baseline: BATCH 0 Foundation, recorded in commit `24e4580`
  with implementation baseline `2429b0f`
- BATCH 0 CI status: Core CI PASS
- BATCH 0 database acceptance status: Trusted DB Integration PASS on Neon
  PostgreSQL 18
- US-01 acceptance CI status: Core CI PASS on merged main `6806e66`
- US-01 Trusted DB Integration status: PASS on merged main `6806e66`
- Current implementation focus: none; US-04 vocabulary schema, controlled
  Starter v1 migration/content, validator and authenticated read API are
  accepted.
- Last completed work: US-04 Vocabulary Content Seed & Read Foundation,
  including the vocabulary schema/migration, controlled Starter v1 content,
  authenticated read API and final Trusted DB acceptance; BATCH 0, BATCH 1 and
  BATCH 2 remain accepted/frozen.
- Files/areas most recently changed: US-04 schema, migration, source artifact,
  validator, shared contracts, API service/routes and tests. `docs/decisions.md`
  remains unrelated and untouched.
- Evidence: manual authenticated `GET /api/vocabulary` acceptance PASS
  (200/30 records, IDs 1–30, `apple` → `new`, enabled/version checks), exact
  dataset, optional-NULL, unsupported-scope `400` and unauthenticated `401`
  checks PASS; `403` is covered by automated tests. Dataset validation, lint,
  typecheck, 159 tests, build, 9/9 E2E, migration/schema/reset checks,
  `DB_MIGRATE=PASS` and `git diff --check` PASS. Core CI #28 and Trusted DB
  Integration #26 SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- Dataset contract: `DATASET_SOURCE=VOCABFLOW_STARTER_V1`,
  `DATASET_PROVENANCE=PROJECT_AUTHORED`, `DATASET_STATUS=APPROVED`; exactly 30
  stable IDs (1–30) are approved, all enabled with `contentVersion=1`.
- Frozen areas: BATCH 0 bootstrap, role model, database targets, schemas, reset
  policy, migration executor and CI behavior unless a proven regression appears.
- Next safe action: owner selects and reviews the next User Story.
- Do NOT do next: Do not automatically start US-05, modify CI/workflows or
  reopen accepted infrastructure without regression evidence.
- Documents new agent must read first: `docs/README.md`,
  `docs/product/product-spec.md`, `docs/architecture/technical-architecture.md`,
  `docs/design/design-system.md`, `docs/design/feature-ui-spec.md`,
  `docs/flow/user-flow.md`, `docs/decisions.md`, `docs/roadmap.md`, the active
  story and this file.

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
