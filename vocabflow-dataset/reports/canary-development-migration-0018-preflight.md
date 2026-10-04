# Development Migration 0018 Preflight — Phase 2E.4C

Date: 2026-10-04

## Repository and method

- Audited the clean local worktree at `c15dff2542a44a84852ceb89394c8ce75b75c1df`, matching the then-current `origin/TXH` baseline. The primary local checkout remained on `TXH` at `d9012af`; its unrelated untracked APKG analysis JSON/Markdown files were preserved.
- Development target verification used the repository's Neon provider verifier and post-connect protected identity check. No credential values were logged or included here.
- Ledger, schema metadata, constraints, migration role privileges, and aggregate learner count were read in one PostgreSQL `REPEATABLE READ, READ ONLY` transaction.
- No reconciliation scan, import planning, import APPLY, migration executor, or dataset projection regeneration was run.

## Development target

| Field | Verified value |
| --- | --- |
| Environment / provider | `development / neon` |
| Neon project / branch | `shy-hill-72364426 / br-square-grass-b3af0nte` |
| Database | `neondb` |
| Migration role | `vocabflow_migration` |
| Provider and protected identity | PASS |
| Transaction | `REPEATABLE READ, READ ONLY` |

The connected `current_user` and `session_user` were both `vocabflow_migration`. The role had `USAGE` and `CREATE` on `drizzle` and `vocabflow_app`, and no `CREATE` privilege on the database, matching the migration executor's privilege checks.

## Migration chain and ledger

| Check | Result |
| --- | --- |
| Local migration count | 19 (`0000` through `0018`) |
| Latest local migration | `0018_panoramic_spirit` |
| Current-worktree Drizzle hash for 0018 | `eec77c49abbad9a2ea0a69fead9409e0b817978fd3ff3df95b09a55575b114ed` |
| Canonical migration chain | PASS |
| Development ledger count | 19 |
| Latest database migration | `0018_panoramic_spirit` |
| Pending migrations | 0; none |
| Ledger/source hashes | 19/19 matched canonical SQL |

All hashes were checked with the Phase 2E.4B worktree-independent verifier and Drizzle 0.45.2 migration reader semantics. The `0004` and `0018` ledger digests use the accepted CRLF representation; the other rows use LF. No SQL-content mismatch was found. The development database had already recorded 0018 by the time of this read-only preflight.

## Migration 0018 SQL and schema

The unchanged migration adds only these columns and checks to `vocabflow_app.learner_profiles`:

- `daily_new_word_goal integer NOT NULL DEFAULT 10`, constrained to `1..100`.
- `daily_review_word_goal integer NOT NULL DEFAULT 20`, constrained to `1..100`.

It contains no `DROP`, `DELETE`, `TRUNCATE`, `UPDATE`, vocabulary or Master mapping change, progress/review-event change, or reference to a Master V2 runtime table. Its statements are `ALTER TABLE ... ADD COLUMN` and `ALTER TABLE ... ADD CONSTRAINT` only.

The live schema inspection found both columns as integer, NOT NULL, with defaults `10` and `20`; both named range checks were present and validated. The existing `daily_new_word_limit` remains a separate integer column, with its own default `10` and `0..100` check. Application Drizzle schema, contracts, and US-35 describe the same goal fields and `1..100` range.

```text
MIGRATION_0018_ADDITIVE_ONLY = YES
MIGRATION_0018_SCHEMA_STATE = APPLIED
APPLICATION_SCHEMA_MATCH = YES
MASTER_V2_RUNTIME_TABLES_AFFECTED_BY_0018 = NONE
```

## Existing learner rows

- Aggregate learner profile count at inspection: **8**. No IDs, names, or personal fields were selected.
- When the migration adds these constant-default columns, existing rows observe `10` and `20` without an application-level `UPDATE` or backfill statement. Values currently stored on learner rows were not queried; they may have been changed after the migration.

## Approved canary integrity

The `canary-v2.1.0` release validated offline with `writeReport: false`: status `PASS`, zero errors, zero warnings. Its manifest remains release `2.1.0`, schema `2.0.1`, status `APPROVED`, hash `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.

## Trusted mutation path (not run)

```text
pnpm db:migrate
```

The guarded local path requires `VOCABFLOW_ENV=development`, `DATABASE_ENV=development`, `EXECUTION_CONTEXT=local-development`, `purpose=migration`, Neon provider verification, and post-connect protected identity verification. It was not invoked. Because 0018 is already present in the verified ledger and schema, it must not be applied again.

## Safety assessment

| Gate | Result | Evidence |
| --- | --- | --- |
| `TARGET_VERIFICATION_READY` | YES | Neon provider and protected identity matched the configured development target. |
| `MIGRATION_ROLE_READY` | YES | Verified role identity and schema/database privileges matched executor policy. |
| `MIGRATION_FORWARD_ONLY` | YES | Additive columns and constraints only; no destructive or existing-data update statement. |
| `APPLICATION_SCHEMA_MATCH` | YES | Live columns/defaults/nullability/checks match Drizzle, contracts, and US-35. |
| `PENDING_SET_EXACT` | NO | There are no pending migrations; 0018 is already recorded. |
| `LEDGER_CONSISTENT` | YES | 19 ledger rows match local canonical source; latest is 0018. |
| `CURRENT_SCHEMA_PRECONDITION_VALID` | NO | The pre-apply state no longer holds: both columns and the 0018 ledger row exist. State is `APPLIED`, not drift. |

The pre-apply decision is **do not apply**. The migration is already applied and verified, so rerunning the pre-apply operation is not ready or necessary.

```text
DEVELOPMENT_TARGET_VERIFIED = YES
MIGRATION_LEDGER_VERIFIED = YES
CANONICAL_HASH_CHAIN_VERIFIED = YES
PENDING_MIGRATION_IS_EXACTLY_0018 = NO
MIGRATION_0018_SCHEMA_PRECONDITION_VALID = NO (already applied)
MASTER_V2_RUNTIME_TABLES_UNAFFECTED = YES
DEVELOPMENT_MIGRATION_APPLY_READY = NO (already applied; no pending migrations)

APPLE_OWNER_DECISION_REQUIRED = YES
OWNER_RECONCILIATION_FINALIZED = NO
IMPORT_PLAN_CAN_APPLY = NO
DATABASE_WRITES = NONE
MIGRATIONS_EXECUTED_BY_THIS_PREFLIGHT = NONE
IMPORT_APPLY_EXECUTED = NO
PHASE_2E4C_READY = NO (pending set is not exactly 0018)
```

## Verification

- Focused tests: 7 files, 56 tests passed, covering migration hash verification, migration executor, application schema/0018 assertions, development target/provider verification, protected database identity, and daily-goal settings.
- `pnpm typecheck`: PASS.
- `pnpm lint`: PASS.
- `git diff --check`: PASS.
- pnpm reported Node `22.19.0` while the package requests `22.23.2`; the checks nevertheless exited successfully.

Database writes: **NONE**. Migration execution by this phase: **NONE**. Import APPLY: **NO**.
