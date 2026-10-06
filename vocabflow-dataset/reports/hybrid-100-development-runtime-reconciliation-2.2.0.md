<!-- generatedBy: hybrid-100-development-reconciliation-preflight-v1 -->

# Hybrid-100 Development Runtime Reconciliation — Preflight

Generated: 2026-10-06T05:09:38.503Z

## Outcome

**PHASE_2G1_READY = NO**. The read-only migration/bridge preflight completed, but the approved release does not produce an eligible RELEASE projection. Runtime vocabulary discovery and candidate planning were not run.

## Frozen source and transform gate

- Source: 2.2.0 / APPROVED; schema 2.0.1.
- Release hash: `c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d` (independently recomputed).
- Release tree fingerprint: `35334eb7769c39029223d2d60311c6faab8c462efd0a340f262bed27543256ae`; official frozen-source verifier passed before and after this preflight. RC 2.2.0-rc.1, Canary 2.1.0, canonical root, and taxonomy snapshots remained unchanged.
- Dataset validator: PASS (0 errors, 0 warnings, 0 info).
- App Import contract: `app-import-v3`; runtime projection contract: `runtime-vocabulary-projection-v2`.
- RELEASE transform: BLOCKED; eligible projected Senses 0/100; error `RELEASE_PROJECTION_INCOMPLETE:100`.
- PREVIEW diagnostic: 100/100 rows, importEligible=false; it is not an accepted release projection and was not used for runtime candidate analysis.
- PREVIEW scope: 0 Topics, 0 Topic memberships, 0 Learning Sets, 0 Learning Set items.

The transform's RELEASE gate accepts only APPROVED nested Vietnamese Translation rows. The frozen Sense records contain 100 nested Vietnamese Translation rows: 0 APPROVED and 100 not approved across 100 Senses.

| Translation row status | Count |
| --- | ---: |
| DRAFT | 98 |
| IN_REVIEW | 2 |

No release files were changed, no child status was inferred from its parent Sense, and no preview row was relabeled as RELEASE. The transformation gate must be resolved in a separately approved source revision before candidate identity analysis can be valid.

## Development target and migration/bridge check

- Configured Development target: Neon / project `shy-hill-72364426` / branch `br-square-grass-b3af0nte` / database `neondb`.
- Connected purpose/role: `migration / vocabflow_migration`; provider and database identity verified.
- Transaction: `REPEATABLE READ, READ ONLY`.
- Migration journal: 19/19 rows; latest `0018_panoramic_spirit`.
- Required current bridge tables, columns, composite constraints and write-guard triggers: PASS.
- Migration/bridge readiness: **READY**.
- Missing journal migrations: none; migration hash mismatch: none.

## Scan and write boundary

- Runtime vocabulary catalog queried: NO.
- Runtime Master mappings queried: NO.
- Learner progress/review aggregates queried: NO.
- Candidate rows / candidate artifact: not generated.
- Owner decisions finalized: 0; unresolved template rows: 100.
- DATABASE_CONNECTION = READ_ONLY_DEVELOPMENT (migration role only).
- DATABASE_TRANSACTION = `REPEATABLE_READ_READ_ONLY`.
- INSERT_COUNT = 0; UPDATE_COUNT = 0; DELETE_COUNT = 0; DDL_COUNT = 0.
- IMPORT_APPLY_EXECUTED = NO; MIGRATIONS_EXECUTED = NONE; runtime IDs allocated = 0; bridge mappings created = 0; learner rows mutated = 0.
- Production connection = NONE; production mutation = NO.

## Next gate

Resolve the approved-release translation status/projection mismatch without editing the frozen 2.2.0 package. Then rerun the 100-Sense RELEASE projection and development candidate scan. The next reconciliation step remains owner review; this preflight does not authorize importer apply.
