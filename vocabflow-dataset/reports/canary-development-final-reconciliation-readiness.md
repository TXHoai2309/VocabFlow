# Canary Master V2 — Phase 2E.3 Final Reconciliation Readiness

Analysis-only checkpoint, 2026-10-03. No owner identity choice has been made. No APPLY or database mutation was run.

## Release and runtime snapshot

- Release: dataset 2.1.0, schema 2.0.1, APPROVED; release hash fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591.
- Approved scope remains 6 Lexemes, 8 Senses, 41 Provenance records, 1 Learning Set, 1 Learning Set item, 2 PLANNED media assets, and 0 media versions.
- Development target was provider-verified: Neon project shy-hill-72364426, branch br-square-grass-b3af0nte, database neondb.
- Scanner transaction: REPEATABLE READ, READ ONLY. Candidate universe: 8 Master Senses.
- Snapshot fingerprint: 464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b. It matches the Phase 2E.2 fingerprint, so SNAPSHOT_CHANGED=NO.

## Apple remains a human identity choice

Runtime #1 and #295 both represent apple = quả táo, both are enabled and reachable through current catalog/topic/learning flows. Both have LEARNING history. One learner has progress on both IDs (aggregate overlap 1; no learner IDs were selected). #1 has 3 progress rows and 8 reviews; #295 has 1 progress row and 1 review. Their Learning Set memberships differ, and both have the normalized Food Topic.

No option is ranked or selected:

- MAP_EXISTING #1: its history remains on #1; #295 remains with its separate history, source identity and grade-1-food membership. UPDATE_TO_MASTER would set contentVersion 2 → 3. It would clear #1's IPA, imageUrl, audioUrl and legacy topic, while updating definition/example.
- MAP_EXISTING #295: its history remains on #295; #1 remains with its separate history and three Learning Set memberships. UPDATE_TO_MASTER would set contentVersion 1 → 2. It would clear #295's IPA, imageUrl, audioUrl, legacy topic and GRADE_1 level, while updating definition/example.
- CREATE_NEW: creates a third apple runtime identity at APPLY time, contentVersion 1; IDs #1 and #295, their histories and memberships remain.

For either existing-ID choice, the non-selected row and its memberships do not disappear. The normalized Topic and Learning Set memberships are not deleted or transferred by UPDATE_TO_MASTER. Duplicate runtime identity and duplicate learner history still require a separate policy if the owner later wants consolidation. Details and the owner checkboxes are in the [decision sheet](canary-development-final-owner-decision-sheet.md) and [projection-loss audit](canary-development-projection-loss-audit.md).

## Non-Apple proposals and version calculation

The refreshed evidence supports the proposals below. These remain UNRESOLVED in the prepared artifact until the owner signs off.

| Master Sense | Evidence-backed proposal | Current / expected contentVersion |
| --- | --- | --- |
| bank — financial institution | MAP_EXISTING #871 + UPDATE_TO_MASTER | 1 → 2 |
| bank — river edge | CREATE_NEW; do not reuse financial #871 | 1 on creation |
| record — noun / music recording | CREATE_NEW; #849 is the physical grooved/vinyl disc | 1 on creation |
| record — verb | CREATE_NEW; do not reuse noun #849 | 1 on creation |
| look after | CREATE_NEW; no runtime candidate | 1 on creation |
| algorithm | CREATE_NEW; no runtime candidate | 1 on creation |
| reservation — booking | MAP_EXISTING #284 + UPDATE_TO_MASTER | 1 → 2 |

The Technology Starter set has no runtime candidate or exact slug/name collision among 16 inspected sets. Proposal: CREATE_NEW, no integer ID allocated and no learner assignment. Its algorithm membership would be inserted only by an eventual approved apply.

An in-memory/temporary planner simulation accepted the seven non-Apple decisions and left apple unresolved. It reported exactly one unresolved Sense (apple), no other planner issue, and no APPLY eligibility. Thus NON_APPLE_RECONCILIATION_STRUCTURALLY_READY=YES. The planner's current behavior is CREATE version 1, changed UPDATE version current + 1, and exact same fingerprint/effective projection NOOP at the same version. No CREATE integer ID was predicted.

## Reconciliation artifacts and planner gate

The true human-owned planner file is vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json. It remains unchanged. It is owner=human-reviewed but still describes dataset version 2.0.0, has no source release hash, and contains unresolved decisions outside the 2.1.0 release. A real development planner DRY_RUN against the 2.1.0 release returned reconciliationComplete=false and canApply=false, with source mismatch and unresolved/out-of-release decisions.

The scan proposal at runtime-reconciliation-proposal-development-v2.json is a separate analysis-only proposal shape; it has owner=analysis-only, acceptedByImporter=false, and all decisions unresolved. It is not itself the planner's reconciliation contract.

Prepared runtime-reconciliation-owner-ready-development-v2.json keeps the existing reconciliation-v2 core shape, exact release/source metadata, exact eight Master Sense IDs, current candidate runtime IDs and snapshot fingerprint. All decisions are UNRESOLVED; owner is owner-review-required and analysisOnly=true. A planner DRY_RUN against this file returned reconciliationComplete=false and canApply=false with RECONCILIATION_OWNERSHIP_INVALID. It is not human-owned and must not be used for APPLY.

The existing generated runtime-reconciliation-template-v2.json has sourceManifestContentHash 2b0da6b4e8128a894027bdbd08c9ffeaee4ffd913feddfad929290d75a886787, while the current RELEASE app-import artifacts require 6c80ef29049f925c8e4c331642eba4fd0222b78fc249d144913f573de8f96b6c. The new owner-ready artifact uses the latter value and the planner confirms no source-metadata mismatch for it. The existing template and approved release were not changed or rebuilt.

## Migration drift and importer invariants

- 18/18 migration ledger rows are present. Migrations 0015, 0016 and 0017 match their current local hashes exactly.
- Six older files differ: 0001, 0002, 0003, 0012, 0013 and 0014. Classification: HISTORICAL_MIGRATION_HASH_DRIFT.
- MIGRATION_DRIFT_BLOCKS_CURRENT_PLANNER=NO. The planner checks reconciliation/artifact metadata and snapshot mappings/content, but does not read or compare the Drizzle migration ledger in its canApply calculation. The migration drift remains a separate integrity issue; this does not establish that the drift is safe.
- Current importer CREATE omits the runtime vocabulary ID and lets the database allocate it. Mapped IDs cannot silently move between Master Senses, and one runtime ID cannot be assigned to multiple Senses in a reconciliation.
- Import writes do not delete or update learner_progress or review_events. They do not merge learner histories. Selecting an existing apple ID leaves the other ID and its history separate.

## Validation

- Refreshed development reconciliation scanner: PASS; target verified and read-only snapshot current.
- Human-owned reconciliation planner dry-run: reconciliationComplete=false; canApply=false.
- Analysis-only owner-ready planner dry-run: rejected with RECONCILIATION_OWNERSHIP_INVALID; canApply=false.
- Non-Apple hypothetical: no non-Apple structural issues; Apple remains unresolved; canApply=false.
- Focused suites: 6 files, 91 tests passed (scanner, proposal, planner, runtime bridge, transform, validator).
- pnpm typecheck: PASS.
- pnpm lint: PASS. Repository requires Node 22.23.2; local runtime is 22.19.0 and emitted the engine warning.

No database writes, migration, import APPLY, runtime ID allocation, learner-history merge, mapping decision, Cloudinary operation, production connection, or APKG use occurred.
