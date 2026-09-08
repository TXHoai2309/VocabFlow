# Current Handoff Snapshot

- Project: VocabFlow Family MVP
- Current phase/batch: BATCH 1
- Current active story: US-01 Parent Registration
- Story status: IN PROGRESS
- Current Git branch: `TXH`
- Baseline HEAD before documentation pack: `24e4580`
- Documentation/agent pack status: finalized and approved for repository baseline
- Last accepted baseline: BATCH 0 Foundation, recorded in commit `24e4580`
  with implementation baseline `2429b0f`
- BATCH 0 CI status: Core CI PASS
- BATCH 0 database acceptance status: Trusted DB Integration PASS on Neon
  PostgreSQL 18
- US-01 acceptance CI/Trusted DB status: NOT VERIFIED from this environment
- Current implementation focus: US-01 T01-04 Better Auth signup and
  authenticated household bootstrap (implemented / pending acceptance)
- Last completed work: T01-04 registration integration, including the
  additive household migration, atomic `/api/bootstrap` service and safe UI
  recovery states; BATCH 0 Foundation remains accepted and frozen.
- Files/areas most recently changed: `apps/api/src/bootstrap.ts`,
  `apps/api/src/index.ts`, `apps/api/src/db/schema.ts`, the web auth feature,
  shared contracts, reset policy, additive Drizzle migration and US-01 docs.
  BATCH 0 infrastructure, CI and protected database code were not changed.
- Tests/evidence: targeted API/component/migration tests pass, including the
  serialized bootstrap query-shape regression. Final local validation:
  `pnpm lint` PASS, `pnpm typecheck` PASS, `pnpm test` PASS (13 files / 100
  tests), `pnpm build` PASS and `git diff --check` PASS. No live Neon call is
  permitted.
- Open blockers: External acceptance evidence is pending. The local E2E smoke
  endpoint was corrected from `/api/auth/session` to Better Auth 1.7.2's
  supported `/api/auth/get-session`; successful registration still includes
  authenticated Better Auth signup followed by idempotent `POST /api/bootstrap`.
- Frozen areas: BATCH 0 bootstrap, role model, database targets, schemas, reset
  policy, migration executor and CI behavior unless a proven regression appears.
- Next safe action: US-01 ACCEPTANCE TEST / REVIEW.
- Do NOT do next: Do not call live Neon directly; do not add learner/domain
  tables; do not reopen BATCH 0 infrastructure without regression evidence.
- Documents new agent must read first: `docs/README.md`,
  `docs/product/product-spec.md`, `docs/architecture/technical-architecture.md`,
  `docs/design/design-system.md`, `docs/design/feature-ui-spec.md`,
  `docs/flow/user-flow.md`, `docs/decisions.md`, `docs/roadmap.md`, the active
  story and this file.

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

- Better Auth 1.7.2 `signUp.email` requires `name`, `email` and `password`.
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

- Implemented the real Better Auth 1.7.2 signup path with the explicit parent
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
  `/api/auth/session` to Better Auth 1.7.2's supported
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
