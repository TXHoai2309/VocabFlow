# Phase 2E.5 — Development canary APPLY verification

## Outcome

The approved Master V2 release was applied once to the verified development
runtime target. The importer returned `applied=true`, `idempotent=false`, and
`databaseMutations=COMMITTED`. No production, test/shared-CI, migration, or
learner-assignment mutation occurred.

## Approved inputs and pre-apply gates

| Item | Verified value |
| --- | --- |
| Target | development / Neon / `shy-hill-72364426` / `br-square-grass-b3af0nte` / `neondb` / runtime / `vocabflow_runtime` |
| Release | 2.1.0, schema 2.0.1, APPROVED |
| Release hash | `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591` |
| Source manifest content hash | `6c80ef29049f925c8e4c331642eba4fd0222b78fc249d144913f573de8f96b6c` |
| Contracts | `app-import-v3`; `runtime-vocabulary-projection-v2`; `runtime-reconciliation-v3` |
| Reconciliation JCS SHA-256 | `75f67d20edc771c931e8cbf1d70118e339374c22f35a5d062160bca3f489efb2` |
| Scanner snapshot | `d4e4c7cb4695790cbfa4b127afc0273f469a820a4cc2b8a572e646f5190235a0` |
| Scanner planner snapshot | `18b80a1a12bdb211c78350b6701385d302be28511bffd405ba569b22e27257f4` |
| Reviewed plan fingerprint | `4ffcb88ef47c9bdaf3d3dc7d36092fa55e7dec0d4a01417aac97c53d90d8718b` |
| Migrations | 19/19; latest `0018_panoramic_spirit`; 0 hash mismatches |

The final pre-apply dry run reported `reconciliationComplete=true`,
`canApply=true`, and 0 issues. It contained 3 mapped vocabulary updates, 5
vocabulary creates, 1 Learning Set create, and 1 item insert. The planned
content-version transitions were apple #1 2→3, bank #871 1→2, reservation
#284 1→2, and version 1 for each new vocabulary.

## Committed runtime identities

| Master Sense | Runtime vocabulary ID | Result |
| --- | ---: | --- |
| apple (fruit) | 1 | Updated; contentVersion 3 |
| bank (financial) | 871 | Updated; contentVersion 2 |
| reservation (booking) | 284 | Updated; contentVersion 2 |
| bank (river) | 2025 | Created; contentVersion 1 |
| record (music recording) | 2026 | Created; contentVersion 1 |
| record (verb) | 2027 | Created; contentVersion 1 |
| look after | 2028 | Created; contentVersion 1 |
| algorithm | 2029 | Created; contentVersion 1 |

Technology Starter was created as runtime Learning Set #17, enabled according
to the approved projection, with its single Master-owned item mapped to
algorithm #2029 at position 1. No learner assignment was created.

Import run ID: `de0b29c4-db84-4d76-abd4-398f17151099`. A read-only ledger query
found exactly one matching row for the release, contracts, reconciliation
hash, and reviewed plan fingerprint.

## Preservation and identity checks

- Apple #1 contains the approved definition and example. Bank #871 and
  reservation #284 match their approved Master projections and are enabled.
- For apple #1, bank #871, and reservation #284, the runtime values for IPA,
  image URL, audio URL, legacy topic, and level match the pre-apply dry-run
  preservation values. Image and audio URLs remain present; their values are
  intentionally omitted here.
- New vocabulary rows are enabled, have `contentVersion=1`, and have null image
  and audio URLs. Bank senses and record senses have distinct runtime IDs.
- Apple #295 still exists at contentVersion 1, remains unmapped, retains its
  Food topic membership and its existing Learning Set membership. Its runtime
  content matches the pre-apply candidate evidence. Apple consolidation remains
  future owner work.
- Record #849 still exists at contentVersion 1 with its original vinyl
  definition and remains unmapped to either approved record Sense. Its runtime
  content matches the pre-apply candidate evidence.

## Learner history and idempotency

The apply plan reported 87 learner-progress rows, 229 review events, zero
mapped history references, zero planned deletions, and zero learner-assignment
changes. Post-apply aggregate counts remained 87 and 229. The import adapter
reads learner-progress and review-event identifiers for safety checks but has
no write operation for either history table or for learner Learning Set
assignments. No learner IDs were selected for this verification.

A fresh read-only planner built from the verified current runtime snapshot
reported 8 vocabulary `NOOP` actions, 0 updates, 0 creates, 0 content-version
increments, and 0 issues. Its runtime snapshot fingerprint is
`4e98667da86b87cce4a966bf46b80d587630c6e80f3f3b3a82ebe34d531788f1`.

The post-apply scanner observed the changed snapshot
`34b4395967414883b23f7824b54ba8cfdb297cc0151e6ea8b15e8324a54c4296` and stopped
when the generated owner proposal no longer matched its pre-apply pin
(`OWNER_PROPOSAL_CANDIDATE_SNAPSHOT_MISMATCH`). Its planner snapshot was
`8e9fcb5723bf55826b29ff86c92f0b7e388fed8bbb485eda3d2566eba5252976`. The
human-owned reconciliation was not repinned or modified. The separate current
snapshot planner above completed read-only; no second APPLY was run.

The authenticated catalog API smoke request was not run because the local
catalog routes require an authenticated learner session. The direct
target-verified runtime store read verified all eight rows and the Learning Set
mapping without creating a session or assignment.

## Validation

- Focused importer, reconciliation, bridge, transform, validator, and migration
  suites: **PASS**, 7 files / 100 tests.
- `pnpm validate:master-vocab-v2`: **PASS**, 0 errors and 0 warnings.
- `git diff --check`: **PASS**.
- `pnpm typecheck`: **FAIL** on unrelated progress-dashboard work in
  `apps/web/src/features/learners/progress-page.tsx`,
  `apps/api/src/progress-summary.ts`, `apps/api/src/progress-summary.test.ts`,
  and `packages/contracts/src/index.ts` (`progressByLevel` type errors).
- `pnpm lint`: **FAIL** on unrelated uncommitted progress-dashboard work in
  `apps/web/src/features/learners/progress-page.tsx` (unused `localDateLabel`
  and React state-in-effect violations).
- Local Node is 22.19.0; the repository declares 22.23.2.
- No migrations were run. Database writes were limited to this development
  canary import transaction.
