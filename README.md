# VocabFlow BATCH 0 Foundation

This repository contains the implementation-only foundation for the Family MVP. Product authentication, household, learner, study, vocabulary and progress UI are intentionally out of scope for BATCH 0.

## Toolchain

- Node.js `22.23.2`
- pnpm `11.17.0`
- React + Vite + React Router
- Hono + Cloudflare Vite Plugin
- Neon PostgreSQL + Drizzle + Better Auth

## Local commands

```text
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Database commands are fail-closed until the non-secret project/branch IDs in `config/database-targets.ts` and purpose-specific secrets in `.env` are configured. Local runtime uses `DATABASE_URL`; migrations use `DATABASE_MIGRATION_URL`; identity provisioning uses `DATABASE_IDENTITY_PROVISION_URL`; bootstrap uses `BOOTSTRAP_DATABASE_URL`. Trusted CI uses separate `NEON_TEST_*` role URLs. Copy `.env.example` as a starting point; never commit real secrets.

The application migration contains only Better Auth-owned tables. Protected `vocabflow_meta` metadata is bootstrapped separately and is never owned by application migrations or reset commands.
