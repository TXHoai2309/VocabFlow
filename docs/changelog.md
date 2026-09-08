# VocabFlow Changelog

This log records meaningful project milestones and accepted baselines.

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
