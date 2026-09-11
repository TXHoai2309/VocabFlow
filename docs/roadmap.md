# VocabFlow Roadmap and Batch Index

This roadmap promotes only work supported by the current product documents and
the supplied BATCH 1 backlog. It does not invent later user stories.

## BATCH 0 — Foundation

- Status: `ACCEPTED`
- Evidence: Core CI PASS; Trusted DB Integration PASS on Neon PostgreSQL 18.
- Scope: repository foundation, same-origin shell/API boundary, database
  identity/role model, protected metadata, schemas, migration/reset tooling and
  CI safety.
- Freeze: do not reopen without a reproducible regression or approved new
  requirement.

## BATCH 1 — Authentication and Family Entry

- Status: `IN PROGRESS`
- US-01 Parent Registration: `ACCEPTED`.
- US-02 Parent Login: `ACCEPTED`.
- US-03 Learner Profile Creation & Resolution: `ACCEPTED`.
- Active story: none; no next story is active.
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
- out of scope. No US-04 implementation has started.
- Acceptance evidence: owner manual core-flow PASS; local lint, typecheck, test,
  build, E2E, migration/schema/reset and diff checks PASS; Core CI #26 and
  Trusted DB Integration #24 SUCCESS on main commit
  `de6a8387da0f5e90faa62f19124df8ab4cb50157`.

## Later product scope

The Product Specification defines learner selector/create, Learner Home, Study,
Session Summary, Progress, Vocabulary and conditional reset as Family MVP
scope. They are not promoted to implementation batches here until a tracked
story contract is created. Product exclusions remain out of scope, including
learner own login/PIN, offline write queue, AI tutor/generated content,
gamification, admin CMS, payments and social features.
