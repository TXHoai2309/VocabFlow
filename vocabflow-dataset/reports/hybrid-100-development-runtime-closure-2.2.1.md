# Phase 2G.2D — Hybrid-100 Development Runtime Closure

STATUS: `BLOCKED` — runtime closure and consumer smoke passed; canonical
repository typecheck is blocked by existing errors in an unchanged script.

REMOTE_BASELINE: `53443aa7818b5fe6b5dc3fea30f8ac8967805e02`

## Source and applied state

- Source release: `2.2.1 / APPROVED`
- Release hash: `44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`
- Frozen release tree: `51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e` (check PASS)
- Owner reconciliation: finalized; 97 CREATE_NEW and 3 MAP_EXISTING + UPDATE_TO_MASTER decisions.
- Reused rows: `deviate -> #1836`, `pain-relief -> #1461`, `stand -> #948`.
- Reconciliation hash: `4c3d86eb3a4b06a04c68e870847f97fa432fdf247595c577eb758888d62315db`
- Development pre-apply dry-run: PASS. The authorized 2G.2C APPLY committed exactly once: 97 rows created, 3 reused rows updated, and 100 mappings created.
- Applied plan: `7cb18d5c475d3f65538bb55e9bba5c4ad2b666bb7b2678a2e19d8b447b2f9929`
- Import run: `5062fc01-8615-48ab-80e6-ed91d6b77a60`
- Post-apply Development reconciliation snapshot: `5ebcadbfd95619e8b6e7a5c8cc4a4fca16600f7e947cda5932d1ff16bf4fc85a`

## Development read-only verification

The 2G.2D checks used the authorized Development Neon runtime target in
`REPEATABLE READ, READ ONLY` transactions. The current reconciliation scanner
reproduced the pinned post-apply snapshot. It found exactly one matching import
run, 100 mappings, all 97 newly created rows at content version 1, and the
three adopted rows at content version 2. All 100 current Master projections
matched. Learner progress remained 87 rows and review events remained 229;
runtime #11 retained 1 progress and 5 review references. The #284 booking
mapping is unchanged.

## Runtime consumer smoke and availability

The existing `GET /api/vocabulary` and
`GET /api/learners/:learnerId/vocabulary` handlers/services returned all 100
mapped rows. The smoke covered newly created reservation doubt, water verb,
and the three Hybrid light Senses, plus the adopted rows deviate, pain-relief,
and stand. Returned learner-facing content matched the reviewed Master
projection. Catalog counts were 100 enabled, 0 disabled, 0 inaccessible or
unreadable, and 0 projection mismatches.

Collision safety checks passed: reservation doubt is not #284; water verb is
not #11 or #405; the three light Senses are not #1260; rock is not #944; exact
is not #1463; rally is not #1482. Each adopted row exposed all five preserved
enrichment fields (`audioUrl`, `imageUrl`, `ipa`, `level`, `topic`). The
in-process API smoke used the existing `readSession` injection seam with a
verified Development household member; Better Auth cookie issuance was not
exercised. No learner IDs or PII were serialized.

## Replay and history safety

The read-only Development DRY_RUN replay returned:

| Action | Count |
| --- | ---: |
| CREATE | 0 |
| UPDATE | 0 |
| NOOP | 100 |
| CONFLICT | 0 |
| BLOCKED | 0 |
| CREATE_MAPPING | 0 |
| KEEP_MAPPING | 100 |

No APPLY, learner mutation, migration, or database write occurred during this
phase. No second APPLY was run. Production remains `NOT AUTHORIZED / NOT
EXECUTED` and was not accessed.

## Validation

- Focused tests: **PASS**, 7 files / 94 tests. Command:
  `pnpm exec vitest run scripts/master-vocabulary-v2-import-planner.test.ts scripts/hybrid-100-owner-reconciliation-dry-run.test.ts scripts/hybrid-100-development-reconciliation-scan.test.ts scripts/master-vocabulary-v2-read-only-reconciliation-scan.test.ts scripts/master-vocabulary-v2-post-apply-verification.test.ts apps/api/src/vocabulary.test.ts apps/api/src/learner-vocabulary.test.ts`.
- Frozen Hybrid-100 2.2.1 release check: **PASS**.
- `pnpm exec tsc --noEmit -p tsconfig.json`: **PASS**.
- `git diff --check`: **PASS**.
- `pnpm typecheck` (`tsc -b`): **FAIL**, nine TS2339 diagnostics in unchanged
  `scripts/hybrid-100-owner-reconciliation-dry-run.ts` involving stale
  `analysisOnly`, `acceptedByImporter`, `snapshotFingerprint`, `targetVerified`,
  `transaction`, and `releaseHash` properties. This leaves Phase 2G.2D
  **BLOCKED** pending resolution of the repository typecheck issue; runtime
  and API verification remain **PASS**.
- Unrelated `apps/web` implementation changes: **0**.

Machine-readable evidence: [development-runtime-closure.json](../workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review/development-runtime-closure.json).
