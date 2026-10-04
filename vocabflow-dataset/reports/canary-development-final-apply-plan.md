# Phase 2E.4D — Final Human Reconciliation V3

**Decision artifact and plan:** review complete; DRY_RUN only. No import APPLY
was executed.

## Approved release and verified target

- Dataset/schema/status: `2.1.0 / 2.0.1 / APPROVED`
- Release hash: `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`
- Source manifest content hash: `6c80ef29049f925c8e4c331642eba4fd0222b78fc249d144913f573de8f96b6c`
- Contracts: `app-import-v3`, `runtime-vocabulary-projection-v2`,
  `runtime-reconciliation-v3`
- Verified target: development / Neon project `shy-hill-72364426` / branch
  `br-square-grass-b3af0nte` / database `neondb` / runtime role
  `vocabflow_runtime`
- Migration ledger: **19/19**, latest `0018_panoramic_spirit`, zero hash
  mismatches and zero missing rows. Migration and runtime snapshots used
  `REPEATABLE READ, READ ONLY` transactions.

## Snapshot re-review

The checked-in scan pinned
`bc888e2b615efe3c1380a39a130cc0323340f433e341fb833d412e7ad46abce5`. The
fresh scan returned
`d4e4c7cb4695790cbfa4b127afc0273f469a820a4cc2b8a572e646f5190235a0`. Comparing
the checked-in and refreshed candidate evidence showed one changed runtime
history fact: Apple duplicate `#295` gained one review event (1 → 2); its latest
event is `2026-10-04 05:06:59.917304+00`. Its runtime ID, content version,
progress count, memberships, override and quarantine state remain as reviewed.
The reviewed Apple mapping still targets `#1`; the new event remains on `#295`.

The fresh scanner fingerprint was identical on repeat scans before and after
the final planner. The human artifact was repinned to the fresh fingerprint and
the verified target. This re-review carries forward the explicit owner choice
of `#1` while preserving `#295` and all of its history. The scanner's
`plannerSnapshotFingerprint` is
`18b80a1a12bdb211c78350b6701385d302be28511bffd405ba569b22e27257f4`.
The final importer plan reports its own `snapshotFingerprint` as
`a521640de16759ad7c9f2460942e8788f7c246f1d9f198ad6fcb344af4366707`; this
hash is over the import store's `RuntimeSnapshot` shape, while the scanner hash
also captures target, release, migration and aggregate discovery evidence.
These fingerprints cover different serialized inputs.

## Human-owned decisions

The canonical location remains
`vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json`; its content
is now `runtime-reconciliation-v3`, as required by the architecture contract.
It pins the source release, both contracts, current target and fresh scan
fingerprint. All eight Senses and the Learning Set are resolved, with
`allowPartialImport: false`.

| Master Sense | Decision | Runtime identity |
| --- | --- | --- |
| apple — fruit | `MAP_EXISTING`, `UPDATE_TO_MASTER` | #1 |
| bank — financial institution | `MAP_EXISTING`, `UPDATE_TO_MASTER` | #871 |
| bank — river edge | `CREATE_NEW` | allocated only during a future APPLY |
| record — noun / music recording | `CREATE_NEW` | #849 remains untouched |
| record — verb | `CREATE_NEW` | allocated only during a future APPLY |
| look after | `CREATE_NEW` | allocated only during a future APPLY |
| algorithm | `CREATE_NEW` | allocated only during a future APPLY |
| reservation — booking | `MAP_EXISTING`, `UPDATE_TO_MASTER` | #284 |

Technology Starter (`01a0fc13-09f2-7709-a32d-5bef5b1f7a51`) is
`CREATE_NEW`. Its exact Master-owned item is algorithm at position 1. No
runtime ID was allocated and no learner was assigned.

Apple duplicate follow-up:

```text
APPLE_DUPLICATE_RUNTIME_ROW = #295
Canary action = NONE
Future work = separate owner-reviewed duplicate consolidation
```

## Final DRY_RUN

- Mode/target: `DRY_RUN / development`
- Reconciliation complete: **true**
- `canApply`: **true**
- Plan issues: **0**
- Reconciliation hash:
  `75f67d20edc771c931e8cbf1d70118e339374c22f35a5d062160bca3f489efb2`
- Plan fingerprint for the next APPLY phase:
  `4ffcb88ef47c9bdaf3d3dc7d36092fa55e7dec0d4a01417aac97c53d90d8718b`

The plan contains three mapped vocabulary updates (#1, #871, #284), five new
vocabulary rows, one new Learning Set, and one set-item insert for algorithm.
All five new vocabulary actions have `appVocabularyId: null` and
`contentVersion: 1`; the new set and its runtime ID also remain unallocated.

Content version transitions:

- Apple #1: `2 → 3`
- Bank financial #871: `1 → 2`
- Reservation #284: `1 → 2`
- Five new vocabulary rows: `1`

### Projection preservation

For each mapped row (#1, #871 and #284), the plan sets `word`, `vietnamese`,
`definitionEn`, `exampleEn` and `enabled`. It preserves `ipa`, `imageUrl`,
`audioUrl`, legacy `topic` and `level`. `clearFields` is omitted, which means
there are no explicit clears. Existing image and audio values are recorded as
**Cloudinary URL present**; no URL is included in this report. No media or
enrichment field is projected to null.

### Learner history and import ledger

- `learner_progress` deletes/updates: `0 / 0`
- `review_events` deletes/updates: `0 / 0`
- History merges: `0`
- Learner assignments changed: `0`
- `master_vocabulary_import_runs` writes: `0` during DRY_RUN
- Apple #295 and its review event remain attached to #295.

The import store's dry-run path only reads the runtime snapshot; writes occur
inside the separate APPLY transaction path. No runtime catalog write, ID
allocation, migration execution, or run-ledger write was performed.

## Validation

- Focused suites: **8 files / 93 tests passed** (planner and import store,
  reconciliation ownership, release scan, transform, canary release, migration
  hash verification and validator).
- `pnpm typecheck`: passed.
- `pnpm lint`: passed.
- `pnpm validate:master-vocab-v2`: passed, 0 errors, 0 warnings, 1 info.
- Approved canary release validation: passed, 0 errors, 0 warnings, 0 info.
- `git diff --check`: passed.

Older projection-loss wording is superseded by
`runtime-vocabulary-projection-v2` preservation semantics.

Database writes: **none**. Migrations executed: **none**. Import APPLY:
**not executed**.
