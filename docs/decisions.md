# VocabFlow Project Decisions

These decisions are accepted baselines. Revisit one only when the stated
evidence condition is met and the affected source document is updated.

## DEC-001 — Family MVP supersedes Personal MVP

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The product pivoted from a personal, local-only experiment to a
  family web application.
- Decision: Family MVP v1.0 is the current product source of truth. Personal
  MVP v0.2.1 is archived/superseded.
- Consequences: Personal-only persistence, no-auth and no-cloud assumptions
  cannot override Family MVP requirements.
- Evidence/source: [Product Specification](product/product-spec.md#2--pivot-từ-personal--family)
- Revisit only if: The product owner approves a new product baseline.

## DEC-002 — Parent account is the authentication boundary

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Family MVP needs one account to manage a household and its learners.
- Decision: Parents authenticate; learners are profiles without independent
  email/password or PIN authentication in this MVP.
- Consequences: Learner-scoped authorization must resolve session user →
  household membership → learner household.
- Evidence/source: [Product Specification](product/product-spec.md#1--mục-tiêu-persona--phạm-vi),
  [Technical Architecture](architecture/technical-architecture.md#6-authentication-household-bootstrap--authorization)
- Revisit only if: A new learner security boundary is accepted as product scope.

## DEC-003 — PostgreSQL is the canonical runtime source of truth

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Progress must survive reload, logout/login and multiple devices.
- Decision: Neon PostgreSQL is canonical for account, household, learner,
  vocabulary runtime content, progress and review history. Local storage is
  cache/snapshot only.
- Consequences: Successful review means server-confirmed persistence.
- Evidence/source: [Product Specification](product/product-spec.md#6--content-persistence--progress-semantics),
  [Technical Architecture](architecture/technical-architecture.md#5-data-architecture)
- Revisit only if: A validated persistence architecture change is approved.

## DEC-004 — Frozen implementation stack

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The implementation baseline must not reopen stack choices during a
  vertical slice.
- Decision: React/Vite/TypeScript SPA, Hono API on Vercel Functions, Neon PostgreSQL, Drizzle,
  Better Auth and Zod are the pinned stack.
- Consequences: Framework/provider changes require a demonstrated blocker spike.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#2-frozen-technology-stack),
  `package.json`
- Revisit only if: A blocker is demonstrated by a focused spike/test.

## DEC-005 — Same-origin web and API boundary

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Cookie/session and deployment behavior should remain simple.
- Decision: React/Vite static assets and Hono `/api/*` run under the same origin.
- Consequences: Web code never connects directly to Neon.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#31-same-origin-routing),
  `vercel.json`, `api/[...route].ts`, `apps/api/src/index.ts`
- Revisit only if: Deployment constraints make same-origin impossible.

## DEC-006 — Dedicated schema boundaries

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Application objects, protected identity metadata and migration
  metadata require different ownership and reset policies.
- Decision: Use `vocabflow_app` for application tables, `vocabflow_meta` for
  protected identity metadata, and `drizzle` for migration metadata.
- Consequences: Application reset preserves protected metadata and schemas.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#5-data-architecture),
  [BATCH 0 Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md),
  `config/database-reset-policy.ts`, `apps/api/src/db/schema.ts`
- Revisit only if: A migration/reset contract explicitly changes.

## DEC-007 — Least-privilege database roles

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Bootstrap, identity provisioning, migration and runtime have
  different trust boundaries.
- Decision: Keep the frozen role model and protected metadata permissions from
  BATCH 0; application roles receive no broad database CREATE privilege.
- Consequences: Bootstrap is one-shot infrastructure work; normal migrations
  use the approved migration role.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#13-security-privacy--operational-safety),
  [BATCH 0 Execution Specification](implementation/batch0-foundation-execution-spec.md)
- Revisit only if: A proven PostgreSQL/Neon blocker or explicit security review
  requires a role-model change.

## DEC-008 — PostgreSQL 18 automatic membership is accepted

- Status: ACCEPTED
- Date: 2026-09-07
- Context: PostgreSQL 18 may retain an administrative membership when a
  non-superuser CREATEROLE role creates application roles.
- Decision: ADMIN-only automatic membership is acceptable when
  `admin=true`, `set=false`, `inherit=false`; effective SET/INHERIT access is
  forbidden.
- Consequences: Assertions inspect membership options, not row count alone.
- Evidence/source: commit `46d84f1` (Align bootstrap memberships with
  PostgreSQL 18), [BATCH 0 Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md)
- Revisit only if: PostgreSQL changes the behavior or a security test fails.

## DEC-009 — Least-privilege migration executor

- Status: ACCEPTED
- Date: 2026-09-08
- Context: Built-in Drizzle PostgreSQL migration creates the `drizzle` schema,
  which violates the migration role's no-database-CREATE contract.
- Decision: Use the repository executor that reads Drizzle migration files and
  maintains compatible `drizzle.__drizzle_migrations` history without issuing
  `CREATE SCHEMA`.
- Consequences: Bootstrap owns schema creation; migration validates existing
  infrastructure before applying artifacts.
- Evidence/source: commit `2429b0f`,
  `scripts/db-migration-executor.ts`,
  [Technical Architecture](architecture/technical-architecture.md#13-security-privacy--operational-safety)
- Revisit only if: Installed Drizzle metadata semantics change or executor
  compatibility tests fail.

## DEC-010 — No CREATE ON DATABASE for application roles

- Status: ACCEPTED
- Date: 2026-09-08
- Context: Schema administration belongs to bootstrap; application roles need
  only their schema-level rights.
- Decision: Do not grant database-level CREATE to migration, provision or
  runtime roles.
- Consequences: Application schema must already exist before normal migration.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#13-security-privacy--operational-safety),
  [BATCH 0 Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md)
- Revisit only if: A reviewed database-permission design replaces the current
  schema ownership model.

## DEC-011 — BATCH 0 is accepted and frozen

- Status: ACCEPTED
- Date: 2026-09-08
- Context: Core CI and Trusted DB Integration passed on Neon PostgreSQL 18.
- Decision: Stop debugging Foundation and begin work through explicit BATCH 1
  story contracts.
- Consequences: Do not alter bootstrap, role model, schemas, reset policy,
  migration executor or CI without a proven regression.
- Evidence/source: [BATCH 0 Foundation Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md),
  commit `24e4580`
- Revisit only if: A reproducible regression or approved new requirement exists.

## DEC-012 — No offline write queue in Family MVP

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The MVP prioritizes server-authoritative progress and a small
  vertical slice.
- Decision: IndexedDB may cache read data, but offline review writes and full
  conflict-resolution sync are out of scope.
- Consequences: Failed review saves show retry/error behavior; they are not
  silently queued.
- Evidence/source: [Product Specification](product/product-spec.md#3--core-learning-loop--session-rules),
  [Technical Architecture](architecture/technical-architecture.md#11-client-state--cache-policy)
- Revisit only if: Offline behavior becomes an explicitly validated product
  requirement.

## DEC-013 — Review writes are server-authoritative and idempotent

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Double-click, retry and concurrent requests must not create duplicate
  progress transitions.
- Decision: The backend authenticates and authorizes, computes scheduler state,
  and atomically persists progress plus review event using `reviewId` and
  `expectedRevision` safeguards.
- Consequences: The client advances only after server confirmation.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#9-review-write-architecture),
  [Product Specification](product/product-spec.md#6--content-persistence--progress-semantics)
- Revisit only if: A proven atomic-write limitation requires a reviewed design
  change.

## DEC-014 — US-01 registration includes household bootstrap

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: A parent account is not useful for Family MVP until its canonical
  default household is resolved.
- Decision: US-01 success is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved. Signup success
  alone is not the completed Family registration boundary.
- Consequences: Bootstrap failure preserves authenticated state and exposes safe
  retry/recovery; the idempotent/race-safe bootstrap contract is reused. Learner
  creation remains out of scope for US-01. T01-04 may add only the minimal
  additive `vocabflow_app.households` and `vocabflow_app.household_members`
  application migration required for canonical bootstrap; BATCH 0 database
  infrastructure remains frozen.
- Evidence/source: [Product Specification](product/product-spec.md#8--acceptance-validation--freeze),
  [Technical Architecture](architecture/technical-architecture.md#62-household-bootstrap-flow),
  [User Flow](flow/user-flow.md#2-luồng-parent--learner),
  [US-01 contract](stories/US-01-parent-registration.md)
- Revisit only if: The product owner explicitly changes the Family registration
  boundary or a validated implementation blocker requires a new contract.

## DEC-015 — US-01 registration collects parent display name

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Better Auth 1.7.3 `signUp.email` requires `name`, while the Phase 1
  Register contract previously collected only email and password.
- Decision: US-01 explicitly collects `name`, `email` and `password`. `name` is
  the parent's persisted display/profile identity; it is trimmed at the form
  boundary and passed directly to Better Auth. No fake constant, email-derived
  value or hidden generated name is allowed.
- Consequences: Learner profile naming and learner creation remain a later
  story. Household name remains server-owned by the bootstrap contract. This
  is a contract/UI clarification only and adds no learner or database schema.
- Evidence/source: Better Auth 1.7.3 signup runtime/type contract,
  [Feature UI Specification](design/feature-ui-spec.md#2--authentication),
  [US-01 contract](stories/US-01-parent-registration.md)
- Revisit only if: Better Auth is upgraded or the product owner explicitly
  changes the parent registration identity contract.

## DEC-016 — Server-owned default household name for US-01 bootstrap

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The first Family registration must resolve one canonical household,
  while learner naming and household customization are outside US-01.
- Decision: `POST /api/bootstrap` uses the neutral server-owned default name
  `Gia đình VocabFlow`; it never derives a household name from email or parent
  display name and never accepts a client-supplied owner id. The household and
  `OWNER` membership are resolved in one idempotent write keyed by the unique
  primary owner.
- Consequences: Signup success alone is not the Family registration boundary;
  a bootstrap failure stays recoverable without a second signup. Household
  naming customization can be introduced by a later reviewed story.
- Evidence/source: `apps/api/src/bootstrap.ts`,
  `apps/api/src/index.ts`, [US-01 contract](stories/US-01-parent-registration.md)
- Revisit only if: The product owner adds a household naming requirement or a
  proven persistence constraint requires a new contract.

## DEC-017 — Vercel is the V1.0 production hosting target

- Status: ACCEPTED
- Date: 2026-09-27
- Context: The owner changed the V1.0 hosting decision from Cloudflare to Vercel
  while keeping the existing React/Vite, Hono, Neon, Better Auth and Cloudinary
  architecture.
- Decision: Serve the Vite SPA as static output and run the existing Hono API as
  a same-origin Vercel Function. Do not migrate to Next.js or duplicate API
  routes/domain logic.
- Consequences: Vercel Preview auth trusts only the exact current
  `VERCEL_URL`; Preview requires development markers and must not use production
  credentials. Production uses the owner-selected canonical HTTPS
  `BETTER_AUTH_URL`. Cloudflare deployment configuration is no longer the V1.0
  production path.
- Follow-up: the manual normal-release operation mode recorded here is
  superseded by DEC-018; the Vercel hosting target and runtime boundaries are
  unchanged.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#3-system-context--deployment-topology),
  [V1.0.0 Release Runbook](releases/v1.0.0-release-runbook.md), `vercel.json`,
  `api/[...route].ts`, `apps/api/src/auth-production-config.ts`
- Revisit only if: The owner explicitly changes the V1.0 hosting target or a
  focused deployment spike proves Vercel cannot satisfy the accepted boundary.

## DEC-018 — Protected GitHub Actions production release pipeline

- Status: ACCEPTED
- Date: 2026-10-01
- Context: Manual production migration/deploy steps are easy to run against a
  different commit or in the wrong order; a migration failure must prevent the
  matching app deploy.
- Decision: A completed, successful `Core CI` push run for `main` in
  `TXHoai2309/VocabFlow` triggers `Production Release`. The release checks out
  and verifies that run's immutable `head_sha`, performs read-only production
  DB preflight and migration planning, applies only guarded forward-only
  migrations with the migration role and exact canonical confirmations, then
  deploys the same SHA via `pnpm deploy:production`. Any failed DB step stops
  before deployment. The workflow uses a serialized concurrency group and the
  GitHub Environment `production`; that environment must be configured with
  required reviewers and a `main` deployment-branch rule before its credentials
  are provisioned. Production DB/Vercel credentials must exist only in that
  Environment, not as repository- or organization-level secrets. Vercel Git
  integration must not independently auto-deploy Production.
- Boundaries: the workflow never bootstraps/resets Production, imports the
  vocabulary catalog, applies US-41 curation, or uses Trusted DB test
  credentials. `trusted-db.yml` remains a separate `ci-test` / `shared-ci`
  workflow. First-time bootstrap and owner-reviewed content operations remain
  separate operator procedures.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#15-cicd--environment-strategy),
  [Production Release Runbook](releases/v1.0.0-release-runbook.md),
  `.github/workflows/production-release.yml`,
  `scripts/production-release-safety.ts`.
- Revisit only if: A release-safety review finds a concrete workflow or
  provider limitation, or the owner explicitly changes the approved release
  boundary.
