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
- Active story: US-01 Parent Registration.
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

Register contract: `Tên phụ huynh` → `Email` → `Mật khẩu`. Parent display name
is collected explicitly because Better Auth 1.7.2 requires `name` for
`signUp.email`; learner naming and learner creation remain out of scope.

The complete story contract is in
[`docs/stories/US-01-parent-registration.md`](stories/US-01-parent-registration.md).

## Later product scope

The Product Specification defines learner selector/create, Learner Home, Study,
Session Summary, Progress, Vocabulary and conditional reset as Family MVP
scope. They are not promoted to implementation batches here until a tracked
story contract is created. Product exclusions remain out of scope, including
learner own login/PIN, offline write queue, AI tutor/generated content,
gamification, admin CMS, payments and social features.
