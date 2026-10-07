# Phase 2G.2C — Development Apply & Post-Apply Verification

STATUS: PASS

REMOTE_BASELINE: `19f529e4b32cb743f541cefd622547050f295635`

BASELINE_DRIFT_REVIEW: `CLEARED_UNRELATED_TO_DATASET_RUNTIME`

APPS_WEB_FILES_CHANGED_BY_PHASE_2G2C: `0`

## Authorized apply

- Runtime: Node `v22.23.2`; pnpm `11.17.0`
- Target: Development / Neon / project `shy-hill-72364426` / branch `br-square-grass-b3af0nte` / database `neondb`
- Source: Hybrid-100 `2.2.1 / APPROVED`; release hash `44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`
- Reconciliation hash: `4c3d86eb3a4b06a04c68e870847f97fa432fdf247595c577eb758888d62315db`
- Pre-apply reconciliation snapshot: `89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e`
- Pre-apply planner snapshot: `4e98667da86b87cce4a966bf46b80d587630c6e80f3f3b3a82ebe34d531788f1`
- Authorized and locked plan fingerprint: `7cb18d5c475d3f65538bb55e9bba5c4ad2b666bb7b2678a2e19d8b447b2f9929` — MATCH
- Apply: executed once through the existing importer transaction; committed; `applied=true`, `idempotent=false`
- Mutations: 97 vocabulary CREATE, 3 vocabulary UPDATE, 100 Master mappings, 1 import-run ledger row, 0 deletions
- Existing mappings: `deviate -> #1836`, `pain-relief -> #1461`, `stand -> #948`
- Updated content versions: `#1836/#1461/#948` are version 2; 97 new rows are version 1
- Import run: `5062fc01-8615-48ab-80e6-ed91d6b77a60`
- The 97 database-allocated runtime IDs keyed by Master Sense ID are in [post-apply-verification.json](./post-apply-verification.json).

## Post-apply checks

- Post-apply read-only Development snapshot: `5ebcadbfd95619e8b6e7a5c8cc4a4fca16600f7e947cda5932d1ff16bf4fc85a` (repeat identical)
- Mappings: 100/100; 97 new runtime IDs; exact three approved existing mappings
- Runtime projections and preserved enrichment/control fields: PASS
- #284 remains mapped to its pre-existing booking Sense; #11 remains the water noun with 1 progress reference and 5 review references
- Learner progress rows: 87 before / 87 after; review events: 229 before / 229 after; learner assignments changed: 0
- Reserved collision IDs `#1260/#944/#1463/#1482`: not reused for the reviewed Hybrid senses
- Read-only replay plan `9e64db5193be745b6fe9fdc9deaa102a07a307bff8007775e3c5101e55fcf8f8`: 100 NOOP, 100 KEEP_MAPPING, zero CREATE/UPDATE/CREATE_MAPPING, zero issues; no second APPLY was executed
- Frozen release check: PASS; Production connection/mutation: NONE
- `git diff --check`: PASS; apps/web paths changed by this phase: 0

The importer expects a dataset manifest alongside its import artifacts. Its read-only plan and the single APPLY therefore used a temporary external input tree assembled from the exact frozen 2.2.1 release and owner-reviewed import files, with a compatibility evidence envelope derived from the fixed read-only scanner output. This temporary staging did not modify repository source, the frozen release, owner decisions, or Production.

## Evidence files

- `development-apply-authorization.json`
- `development-apply-result.json` (sanitized)
- `post-apply-verification.json` (includes the 97-ID allocation map)
- `post-apply-report.md`

No database credentials, connection URLs, learner identifiers, or PII are included.
