# VocabFlow AI Agent Rules

These rules apply to the VocabFlow repository. They are derived from the
current Family MVP documents, accepted BATCH 0 implementation and repository
configuration. Do not import rules from another project.

## 1. Mandatory reading before implementation

Before feature code, read:

1. `docs/README.md`
2. `docs/product/product-spec.md`
3. `docs/architecture/technical-architecture.md`
4. `docs/design/design-system.md` for UI work
5. `docs/design/feature-ui-spec.md` for feature UI
6. `docs/flow/user-flow.md`
7. `docs/decisions.md`
8. `docs/roadmap.md`
9. The current story under `docs/stories/`
10. `docs/ai-progress.md`

No agent may code from chat context alone.

## 2. One active vertical slice

- Keep one active User Story by default.
- Acceptance criteria, dependencies and out-of-scope behavior must be clear.
- `DRAFT` is not ready for review.
- `READY FOR CONTRACT REVIEW` means the owner must review the contract; it is
  not permission to implement.
- `READY FOR IMPLEMENTATION` is the only status that permits implementation.
- `IN PROGRESS` means implementation has started; `BLOCKED` means it cannot
  safely continue; `ACCEPTED` requires implementation and acceptance evidence.
- `SUPERSEDED` and `ARCHIVED` are historical, not active.
- Do not start another story before the current one is accepted unless the
  owner explicitly reprioritizes it.

**READY FOR CONTRACT REVIEW IS NOT PERMISSION TO IMPLEMENT.**

## 3. Scope control

Family MVP exclusions include learner own login/PIN, social login, advanced
analytics, AI tutor/generated content, leaderboard/gamification, admin CMS,
payments, full offline write queue/PWA sync and other exclusions explicitly
listed in the Product Specification.

Do not silently add a feature, endpoint, role, migration or persistence mode.

## 4. Architecture boundaries

The current repository boundaries are:

- `apps/web`: React/Vite SPA, routing, UI and client state. Never connect
  directly to Neon or Drizzle.
- `apps/api`: Hono Worker, Better Auth and API/authz boundaries.
- `packages/learning-domain`: pure scheduler/session/domain rules; no React,
  Hono, Drizzle or Neon.
- `packages/contracts`: Zod/shared DTOs and contracts; no UI/DB implementation.
- `drizzle`: schema and migration artifacts.
- `scripts` and `config`: database identity, validation, migration/reset and
  trusted tooling.

Respect the same-origin `/api/*` boundary and current Worker runtime.

## 5. Authentication and authorization

- Parent authentication is owned by Better Auth.
- Learners are profiles, not independent authentication accounts.
- Authentication alone is never authorization.
- Learner-scoped APIs must resolve `session.user.id` → household membership →
  learner household.
- No session is `401`; cross-household access is `403`.
- Client-supplied `learnerId` is untrusted.
- Do not manually fork Better Auth password/session behavior.

## 6. Database rules

Reflect accepted BATCH 0 exactly:

- PostgreSQL is the canonical source of truth.
- `vocabflow_app` is the dedicated application schema.
- `vocabflow_meta` contains protected identity metadata.
- `drizzle` contains migration metadata.
- Keep the least-privilege role model and no broad `CREATE ON DATABASE` grants
  to application roles.
- The custom least-privilege migration executor is the current migration path;
  it assumes bootstrap-provisioned schemas and preserves Drizzle history.
- Reset may clear application state but must preserve protected metadata,
  identity, roles and schema infrastructure.
- Production destructive operations are prohibited unless explicitly approved.
- BATCH 0 database foundation is frozen unless a proven regression or new
  requirement requires a reviewed change.

## 7. Better Auth rules

- Better Auth owns `user`, `session`, `account` and `verification`.
- Do not create competing auth tables or manually fork generated schema.
- Auth UI errors must not leak sensitive internals.
- Duplicate write submits must be blocked.

## 8. Learning-domain rules

Keep these product/architecture invariants intact:

- sparse progress and virtual `NEW`;
- due-before-new queue selection;
- 1/3/7/14/30 scheduler intervals;
- forgotten reset to `LEARNING` with one-day interval;
- reinforcement is session-local;
- review writes are server-authoritative;
- `reviewId` idempotency and `expectedRevision` protection;
- clients cannot author scheduler state;
- the UI advances only after server-confirmed save.

Do not move these rules into React components or client-authored payloads.

## 9. API and validation

- Validate external inputs at the server boundary.
- Use shared Zod contracts where appropriate.
- Return stable typed errors, not SQL/stack traces.
- Never expose secrets or database details to clients.
- Keep business rules out of presentational React components.

## 10. UI implementation

Use the VocabFlow Global Design System:

- mobile-first responsive layout;
- approved layout pattern and semantic tokens;
- visible labels and inline validation;
- `focus-visible` and keyboard support;
- interactive targets of at least 44×44px where required;
- loading, error, empty and success states as part of the feature;
- no color-only state communication;
- no invented visual language or unreviewed primitive.

## 11. Testing

Use the repository commands:

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Run Trusted DB Integration only for changes that actually touch database
foundation, permissions or migration behavior and only through trusted CI
secrets. Do not call live Neon during ordinary local feature work. Do not claim
UI correctness without relevant component/E2E/manual evidence.

## 12. Documentation updates required

Before completing meaningful work:

- update `docs/ai-progress.md`;
- update the current story;
- update `docs/changelog.md` for meaningful change;
- update `docs/decisions.md` if a durable decision changed;
- update product/architecture/design only when the approved baseline truly
  changed.

## 13. Git safety

- Preserve unrelated user changes.
- Never use hard reset or rewrite history.
- Do not commit, push or deploy unless explicitly requested.
- Inspect `git diff` and `git status` before handoff.
- Never commit secrets, generated build output or raw local datasets.

## 14. Secrets

Never log, document or commit `.env` values, Neon URLs/passwords, API keys,
Better Auth secrets, cookies or tokens. If a secret appears in logs or user
input, do not repeat it.

## 15. Definition of Done

A task is not done until:

- acceptance criteria pass;
- authorization/security invariants are covered;
- required UI states exist;
- relevant tests pass;
- story and `docs/ai-progress.md` are updated;
- no unrelated diff or secret is present;
- remaining blockers are explicitly handed off.
