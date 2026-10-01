# US-42 — Protected Production Release Automation

- Status: `IN PROGRESS`
- Owner request: 2026-10-01 production-release pipeline contract.
- Sources: [Product Specification](../product/product-spec.md),
  [Technical Architecture](../architecture/technical-architecture.md#15-cicd--environment-strategy),
  [Project Decisions](../decisions.md#dec-018--protected-github-actions-production-release-pipeline),
  [Production Release Runbook](../releases/v1.0.0-release-runbook.md).

## User story

As the release owner, I want a protected, immutable-SHA production release
workflow so that a successful main-branch Core CI run verifies and migrates the
canonical production database before deploying that exact commit.

## Scope

In scope:

- Add `ci-production-release` as a dedicated GitHub Actions / production
  execution context without making `ci-test` production-capable.
- Authorize the CI release path only from the successful same-repository Core
  CI `workflow_run` for a `main` push, and bind it to the event's full SHA.
- Run read-only production DB preflight and migration planning, then apply only
  explicitly confirmed forward-only migrations through `pnpm db:migrate`.
- Repeat read-only production verification after apply and require zero
  migrations pending before deployment.
- Deploy the identical SHA only after all DB steps succeed, using the existing
  `pnpm deploy:production` safety wrapper and ephemeral linked Vercel metadata.
- Keep Trusted DB Integration test-only and separate.

Out of scope:

- First-production bootstrap, identity provisioning, catalog import or US-41
  curation.
- Production data changes other than the existing forward migration scripts.
- Changing the database role model, Vercel runtime auth/configuration, or the
  Trusted DB workflow.
- Actually running a production migration or deployment as part of this story's
  implementation.

## Acceptance criteria

1. `Core CI` completion is the only workflow trigger; only successful,
   same-repository `push` runs on `main` may proceed.
2. Checkout and release markers use `workflow_run.head_sha`; the job verifies
   `git rev-parse HEAD` exactly matches before any production check.
3. The dedicated context maps to `github-actions` / `production` but is
   rejected by generic database URL and mutation paths. Existing local
   operator, `ci-test`, and Vercel runtime contexts keep their boundaries.
4. Production authorization validates GitHub Actions metadata and the Core CI
   event payload, including repository, workflow, branch, event conclusion and
   exact SHA; `ci-test`, PR code and arbitrary branches fail closed.
5. DB preflight uses the runtime role only for read-only connectivity/identity
   and the migration role for ledger inspection; migration plan/apply retain
   provider verification, post-connect identity checks, exact target
   confirmation and the existing forward-only executor.
6. DB steps, including post-apply verification for zero pending migrations,
   fail closed and run before deployment. Deployment uses the same SHA through
   `pnpm deploy:production`; no raw Vercel production deploy path is introduced.
7. Production credentials are step-scoped to GitHub Environment `production`;
   linked Vercel metadata is ephemeral and is not committed. No `NEON_TEST_*`
   credential or Trusted DB behavior is changed.
8. Tests cover execution-context mapping, allowed/rejected authorization
   metadata, confirmation guards, workflow gate/SHA/order/environment and the
   absence of production deployment after failed DB steps.
9. Public client/static artifacts reject all PostgreSQL credential-shaped
   URIs. Private function URI matches are diagnostic only, while exact known
   secret values, secret assignments, provider/token credentials, local env
   files, and database URI matches outside recognized roots remain blocking.
   Exact known secret values are scanned across all artifact files.
10. Local lint, typecheck, focused and full tests, build, and diff checks pass;
    no real production DB operation, deployment, commit or push occurs.

## Owner setup still required

Configure GitHub Environment `production` with required reviewers and a
`main`-only deployment branch rule, then add the production secrets and
variables documented in the runbook. Vercel direct Git Production
auto-deployment must remain disabled. Configuration is not performed by this
implementation.

## Acceptance evidence

Public/static PostgreSQL URI matches remain blocking. Private function URI
matches are diagnostic, while out-of-root URI matches fail closed. Exact values
from the known secret-variable allowlist are scanned across every artifact
file; assignment, provider/token, local-env-file and source-map policies remain
in force. The deploy verifier receives release database/provider secret values
and removes known secret variables before spawning the Vercel CLI. Artifact
diagnostics print counts only.

Focused artifact/deployment/workflow tests pass (54); `pnpm lint`,
`pnpm typecheck`, `pnpm test` (64 files / 748 tests), `pnpm build`, and
`git diff --check` pass. The static client scan reports `value_hits=0`. A
source-control diagnostic test timed out under full-suite load at its old
5-second limit, passed alone, then passed in the full suite after its limit was
raised to 15 seconds. Local Node is 22.19.0 rather than the repository's
22.23.2 pin. No DB/migration command, deployment, commit or push was executed.
Owner review remains pending.
