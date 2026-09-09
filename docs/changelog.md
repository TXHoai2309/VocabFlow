# VocabFlow Changelog

This log records meaningful project milestones and accepted baselines.

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
