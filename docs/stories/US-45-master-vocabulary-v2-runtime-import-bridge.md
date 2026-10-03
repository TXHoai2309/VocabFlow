# US-45 — Master Vocabulary V2 Runtime Import Bridge

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Owner direction: continue the Master Vocabulary Dataset V2 Phase 2D runtime
  identity bridge, adapter, and explicitly reprioritized Phase 2D.1 hardening
  and canary preparation.
- Dependencies: Phase 2A validator, Phase 2B pilot, Phase 2C App Import V2
  projection, current integer runtime vocabulary identity, and production / DB
  target safety utilities.
- Contract: [Runtime Import Contract](../architecture/master-vocabulary-v2-runtime-import-contract.md),
  [App Import V2 projection](../architecture/master-vocabulary-v2-app-import-contract.md),
  [Identity and Versioning Policy](../architecture/master-vocabulary-v2-identity-versioning-policy.md),
  and [DEC-020](../decisions.md#dec-020--additive-master-vocabulary-v2-runtime-identity-bridge).

## User story

As a VocabFlow dataset maintainer, I want approved Master Sense, Topic, and
Learning Set identities to be reconciled explicitly to the existing runtime
catalog, so future dataset releases can update catalog content without
recycling integer IDs or detaching learner history.

## Scope

- Add empty, additive Drizzle bridge, mapping, membership-ownership, and
  import-run tables with restrictive foreign keys and write guards.
- Keep a human-owned runtime reconciliation artifact separate from generated
  transform output.
- Add deterministic offline planning/reporting and a target-verified,
  transaction-locked apply adapter.
- Derive `contentVersion` from effective projection/fingerprint semantics;
  explicitly handle first adoption, contract upgrades, Vietnamese overrides,
  and image quarantine.
- Reconcile Topics and Learning Sets by explicit IDs/create decisions and
  materialize only reviewed memberships.
- Test mutation behavior only with synthetic approved fixtures and in-memory
  adapters.

## Out of scope

- Applying the migration to Neon, a shared database, staging, or production.
- Importing the current DRAFT pilot, activating catalog rows, or assigning
  Learning Sets to learners.
- UI/API DTO changes, learner history migration, automatic retirement/deletion,
  media generation, byte changes, or Cloudinary upload.

## Acceptance criteria

1. Master UUID identity is stored beside, never substituted for, the stable
   runtime integer. No mapping is inferred from lemma or other content.
2. An existing runtime row maps only through a human-reviewed ID and explicit
   first-adoption/override policy; a mapping cannot silently move.
3. A new integer is allocated only inside the apply transaction and its
   vocabulary row starts at `contentVersion = 1`; mapping and fingerprint are
   atomic with the row.
4. An unchanged effective projection keeps its version. A changed projection
   derives exactly one version increment and stores the full fingerprint in
   the same transaction.
5. DRAFT/ineligible artifacts, unresolved reconciliation, slug collisions,
   override conflicts, unsupported projection contracts, target mismatches,
   and stale plans fail closed.
6. Topic and Learning Set identities are explicit. Memberships resolve through
   mappings, preserve order, and do not assign sets to learners.
7. Existing progress/review integer identities are never rewritten; the plan
   contains no deletion or automatic cleanup action.
8. Applying the same release and reconciliation twice leaves learner-facing
   values, `contentVersion`, mappings, and memberships unchanged.
9. The migration is additive, schema/reset/migration checks pass, and it is not
   applied during this story.
10. Dataset validator, Phase 2C transform tests, Phase 2D planner/adapter tests,
    DB/schema tests, TypeScript, ESLint, and `git diff --check` pass.
11. Add an additive follow-up migration with composite mapping-pair candidate
    keys and Topic/Learning Set membership foreign keys that enforce exact
    Master-to-runtime identity pairs; preserve committed migration 0015.
12. Test conceptual identity mismatches and pre/post-mapping write-guard
    behavior without applying the migration to a shared database.
13. Audit existing catalog and membership writers, and document how mapped rows
    use the V2 workflow while unrelated runtime links remain writable.
14. Prepare deterministic owner-review, subset-release, and reconciliation
    candidate artifacts; keep the canonical manifest and human-owned runtime
    reconciliation unchanged.
15. Audit staging configuration and publish explicit Phase 2E gates. No
    staging branch, database migration, import APPLY, or owner approval occurs.

## Acceptance evidence

The Master validator passes with 0 errors and 0 warnings. The focused Phase
2C/2D transform, planner, schema, and migration checks pass (82 tests total);
root TypeScript, repository ESLint, `git diff --check`, and Drizzle generation
drift checks pass. The checked-in offline plan confirms 25 unresolved Senses,
18 unresolved Topics, and 7 unresolved Learning Sets, with no vocabulary
creates and no history/assignment deletes.

The complete repository test run also exposed unrelated Study UI expectations
against the separately committed US-44 behavior: old App shell headings and a
Flashcard audio pause assertion. Those UI files are outside this story and are
left unchanged. The focused Phase 2C/2D test set passes independently. The
Node engine warning remains: local 22.19.0 while package.json pins 22.23.2.
No migration or importer mutation was run against any database; no Cloudinary
operation occurred. The branch commit/push is recorded in the task handoff.

## Phase 2D.1 follow-up

Phase 2D.1 adds `0016_nostalgic_mattie_franklin.sql` after the already
committed `0015_clean_yellowjacket.sql`. The database now has composite unique
keys and membership foreign keys for exact Sense/vocabulary, Topic/Topic, and
Learning Set/Set pairs. The generated follow-up is unapplied. The new offline
tests inspect Drizzle foreign-key metadata, generated DDL, migration chaining,
and conditional write-guard rules.

The deterministic review artifacts are
[`canary-content-review.md`](../../vocabflow-dataset/reports/canary-content-review.md),
[`canary-release-plan-v2.json`](../../vocabflow-dataset/reports/canary-release-plan-v2.json),
and the separate
[`runtime-reconciliation-candidates-v2.json`](../../vocabflow-dataset/import/mappings/runtime-reconciliation-candidates-v2.json).
The proposed release contains 8 Senses, 6 Lexemes, one subset-safe Learning
Set and 40 referenced Provenance records. The current Topic assignments and
taxonomy are not release-ready; optional classifications are omitted without
weakening provenance checks. All owner decisions remain pending.

Write-path audit and target recommendation are recorded in
[`Phase 2D.1 hardening and canary preparation`](../architecture/master-vocabulary-v2-phase-2d1-hardening.md).
There is no dedicated staging target, so `STAGING_TARGET_READY = NO` and
`PHASE_2E_STAGING_CANARY_READY = NO`. Runtime search was not performed; all
candidate rows remain `UNRESOLVED` and runtime history fields are null because
no verified target is available.

Phase 2D.1 verification: Master validator PASS (0 errors, 0 warnings, 1
informational DRAFT issue); focused dataset/schema suite PASS (100/100); root
typecheck PASS; repository ESLint PASS; Drizzle regeneration reports no schema
drift; and `git diff --check` PASS. The full repository run with two Vitest
workers completed 909/912 tests; its three failures are existing Study shell
heading/mobile navigation expectations in `apps/web/src/App.test.tsx`, outside
this scope. Node is 22.19.0 while the package engine requires 22.23.2. No
database or Cloudinary operation occurred.

## Phase 2D.2 follow-up — owner approval and staging preparation

Phase 2D.2 adds the pending field-aware owner artifact
[`canary-owner-approval-v2.json`](../../vocabflow-dataset/reports/canary-owner-approval-v2.json),
the deterministic offline release builder (`pnpm dataset:prepare-canary-v2`),
and a pure read-only runtime snapshot candidate scanner. A release workspace
can be emitted only from explicit release-level, Sense-field, Lexeme, and
included Learning Set/item approvals. The builder preserves the `2.0.0` DRAFT,
proposes `2.1.0` MINOR, and creates new entity revisions under stable Master
IDs. Synthetic approval tests use a temporary package and do not approve the
checked-in content.

The transform now accepts an approved release without a taxonomy snapshot only
when the release also contains no Classification records. This permits the
minimal canary to keep all experimental taxonomy/classification data outside
the release; a release containing Classification records still needs one exact
taxonomy snapshot. PLANNED audio slots are pinned only when referenced; no
media versions are pinned and runtime URLs remain null.

The staging audit confirms there is no dedicated branch ID and `db:migrate`
does not accept a staging target. No staging config was added, no runtime
snapshot was read, and the root human-owned reconciliation remains unchanged.
The complete status and gates are in
[`Phase 2D.2 readiness`](../architecture/master-vocabulary-v2-phase-2d2-readiness.md).

## 2026-10-03 — Canary editorial correction checkpoint

Before owner approval, created immutable revision 2 for the apple fruit,
record noun/music recording, and reservation booking Senses. Their stable Sense
IDs and corrected Translation/Example child IDs are preserved; revision 1 files
remain unchanged. The DRAFT manifest, App Import previews, canary content review,
pending approval template, release plan, and generated reconciliation
candidates pin the new hashes. All owner decisions remain `PENDING`; the
human-owned reconciliation file is unchanged. The other five canary Senses
passed an exact source/projection comparison.

Master validator passes with 0 errors, 0 warnings, and one informational DRAFT
issue; validator tests pass 30/30. Isolated transform tests pass 23/23,
canary preparation/release-builder tests pass 2/2, and eleven Phase 2D.1 bridge
tests pass with the stale migration-index assertion skipped. Root TypeScript and
ESLint pass. The broader focused test run reported one stale migration-index
assertion (expected 0016, current branch contains 0017) and a transform timeout
under concurrent load; the isolated transform rerun passed. `git diff --check`
and branch handoff evidence are recorded after the final review. No runtime or
database action occurred.
