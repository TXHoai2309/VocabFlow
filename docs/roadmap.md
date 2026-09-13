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

- Status: `IN PROGRESS`.
- Dependency: BATCH 3 and US-05 are `ACCEPTED`.
- Active story: US-06 Learning Scheduler Domain.
- Scope: pure scheduler/date domain function in
  `packages/learning-domain`, virtual sparse `NEW`, existing-state
  transitions, exhaustive unit tests and deterministic invalid-input handling.
- Success boundary: `scheduler-domain-ready`.
- No `POST /api/reviews`, review queue, session reinforcement, progress/review
  persistence, schema, migration, API, UI or Trusted DB work is proposed.
- Owner contract approval is recorded; the pure scheduler implementation and
  local tests are complete, with Core CI review pending. US-07 has not started.

## Later product scope

The Product Specification defines learner selector/create, Learner Home, Study,
Session Summary, Progress, Vocabulary and conditional reset as Family MVP
scope. They are not promoted to implementation batches here until a tracked
story contract is created. Product exclusions remain out of scope, including
learner own login/PIN, offline write queue, AI tutor/generated content,
gamification, admin CMS, payments and social features.
