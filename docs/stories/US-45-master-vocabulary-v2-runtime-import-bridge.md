# US-45 — Master Vocabulary V2 Runtime Import Bridge

- Status: `IMPLEMENTED / DEVELOPMENT CANARY VERIFIED`; owner acceptance remains explicit.
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
15. Audit staging configuration and publish explicit Phase 2E gates. During
    the Phase 2D.1 preparation, no staging branch, database migration, import
    APPLY, or owner approval occurred. The later owner-approved offline canary
    is documented in the dated follow-up below.

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

## 2026-10-03 follow-up — owner-approved offline canary release

The owner explicitly approved all eight canary Senses, six required Lexemes,
the exact `TECHNOLOGY_STARTER` set/item, null runtime media URLs, and release
2.1.0. `vocabflow-dataset/releases/canary-v2.1.0` is an immutable
`APPROVED` release (schema 2.0.1; 8 Senses, 6 Lexemes, 41 Provenance records,
one Learning Set/item; no Classification or taxonomy snapshot). The Master
validator passes with zero issues; Phase 2C RELEASE projects all eight
vocabulary rows with `importEligible=true`.

The release-scoped reconciliation template remains non-human-reviewed and has
eight `UNRESOLVED` Sense decisions. No staging target/snapshot was used, so
runtime reconciliation, apply planning, and Phase 2E remain not ready. No
database/Neon, migration, import APPLY, runtime mapping, learner assignment,
or media operation occurred. See
[`canary release 2.1.0 report`](../../vocabflow-dataset/reports/canary-release-2.1.0-report.md)
and the current readiness snapshot in
[`Phase 2D.2 readiness`](../architecture/master-vocabulary-v2-phase-2d2-readiness.md).

## Phase 2E.2 follow-up — development owner reconciliation evidence

The approved canary was rechecked against the configured development Neon
target using provider verification and read-only transactions. The apple audit
found IDs 1 and 295 both represent the fruit Sense, both are reachable through
catalog/topic flows, and their Learning Set memberships differ. One learner
has progress on both rows; only the overlap count is retained. The owner report
lays out unranked ID 1, ID 295, and CREATE_NEW options. Seven other Sense
proposals and the Technology Starter CREATE_NEW proposal are evidence-backed,
but every `ownerDecision` remains `UNRESOLVED`; the final human-owned
reconciliation is unchanged.

The generated analysis-only proposal is rejected by the planner ownership
gate. Six older migration hashes still differ while all 18 migration rows and
the exact 0015–0017 hashes are present; this is documented as a separate
integrity concern because the current planner does not include migration
ledger comparison in `canApply`. No import APPLY, mutation, history merge,
mapping update, ID allocation, migration, Cloudinary operation, or API/UI
change occurred.

Review artifacts:
[`owner reconciliation review`](../../vocabflow-dataset/reports/canary-development-owner-reconciliation-review.md)
and
[`analysis-only proposal`](../../vocabflow-dataset/releases/canary-v2.1.0/import/mappings/runtime-reconciliation-proposal-development-v2.json).

## Phase 2E.3 — final owner reconciliation preparation

The development reconciliation scanner was rerun against the provider-verified
Neon target in a REPEATABLE READ / READ ONLY transaction. The target is
shy-hill-72364426 / br-square-grass-b3af0nte / neondb. The snapshot fingerprint
remains
464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b, matching
Phase 2E.2. Release 2.1.0, schema 2.0.1, APPROVED status, release hash and
approved scope are unchanged.

The owner decision sheet preserves the apple options #1, #295 and CREATE_NEW
without ranking or selecting them. A separate field audit records the exact
UPDATE_TO_MASTER projection losses for apple #1/#295, bank #871 and reservation
#284. All eight Sense decisions and the Technology Starter decision remain
unresolved in machine-readable owner-ready evidence.

The planner returns reconciliationComplete=false and canApply=false for the
current root human-owned reconciliation, which still targets 2.0.0. The
analysis-only owner-ready artifact is rejected by the planner's ownership gate.
A temporary simulation of the seven non-Apple decisions found no other
structural issue; Apple remains the sole unresolved Sense. No hypothetical
decision was saved as human-owned.

The migration scan reconfirms 18/18 rows, exact 0015–0017 hashes, and six
historical hash mismatches. Current planner code does not enforce historical
ledger hash equality in canApply, so the drift remains a separate integrity
concern. The generated release template also carries a sourceManifestContentHash
that differs from the current transformed app-import metadata; the new
owner-ready analysis file carries the matching metadata without changing the
approved release or existing template.

Focused scanner, proposal, planner, runtime bridge, transform and validator
suites pass (6 files / 91 tests), along with typecheck and repository ESLint.
No database mutation, import APPLY, migration, mapping decision, runtime ID
allocation, learner-history merge, Cloudinary operation, APKG use, or API/UI
change occurred.

Phase 2E.3 evidence:

- [`final reconciliation readiness`](../../vocabflow-dataset/reports/canary-development-final-reconciliation-readiness.md)
- [`final owner decision sheet`](../../vocabflow-dataset/reports/canary-development-final-owner-decision-sheet.md)
- [`projection-loss audit`](../../vocabflow-dataset/reports/canary-development-projection-loss-audit.md)
- [`analysis-only owner-ready artifact`](../../vocabflow-dataset/releases/canary-v2.1.0/import/mappings/runtime-reconciliation-owner-ready-development-v2.json)

## Phase 2E.4A — Runtime projection preservation policy

The runtime import contract now uses `app-import-v3`,
`runtime-vocabulary-projection-v2`, and `runtime-reconciliation-v3`. The
approved 2.1.0 release remains immutable at its Master content layer: pinned
records, dataset schema, and release hash are unchanged; only derived App
Import artifacts and generated template metadata were regenerated.

Field ownership is explicit. Master-authoritative fields are `word`, base
Vietnamese, definition, example, and `enabled`. Runtime enrichment fields are
IPA, image/audio URLs, legacy topic, and level. A concrete Master value is
`SET`; a null/absent enrichment value is `PRESERVE` for MAP_EXISTING and stays
null for CREATE_NEW. Master-authoritative null does not erase an existing
definition/example: a reviewed `clearFields` entry is required. The planner
reports before/raw-Master/operation/after for every mapped field and keeps
Vietnamese override and image quarantine as separate policy controls.

The source `masterProjectionFingerprint` remains distinct from the persisted
fingerprint of the planned API-visible effective projection. Master media uses
asset/version/byte-hash/availability identity; preserved legacy media uses its
effective URL identity; quarantined images remain hidden in the effective
fingerprint. `contentVersion` increments once when that effective projection
changes and remains stable for preservation-only changes. CREATE_NEW starts at
1. The same release/reconciliation is replay-idempotent.

Two provider-verified, read-only planner previews simulated apple #1 and apple
#295 separately. Neither is an owner choice. Both preserve current IPA, media,
legacy topic and (for #295) grade level; each still increments its version once
for Master definition/example changes. Bank #871 and reservation #284 update
their semantic Master fields and enabled state while preserving null-Master
enrichment. Five CREATE_NEW rows keep null image/audio values. The checked-in
human reconciliation remains unresolved and previews with `canApply=false`.

The fresh migration scanner saw 18/18 ledger rows but 17 local hash mismatches,
including 0015–0017, and stopped before catalog discovery. A separate planner
preview successfully read the development runtime in a REPEATABLE READ / READ
ONLY transaction;
the planner itself does not check migration ledger drift in its `canApply`
gate. No safety conclusion is drawn from that separation. The historical Phase
2E.3 loss audit and all unresolved owner artifacts remain available.

- [Runtime preservation preview](../../vocabflow-dataset/reports/canary-development-preservation-policy-preview.md)
- [Old/new projection comparison](../../vocabflow-dataset/reports/canary-development-projection-preservation-comparison.md)
- [Migration drift scan](../../vocabflow-dataset/reports/canary-development-migration-drift-scan-2026-10-04.md)

## Phase 2E.4B — Migration hash root-cause audit

Drizzle ORM 0.45.2 hashes the complete SQL text read from each working-tree
file. It does not normalize line endings, so `core.autocrlf=true` produced
different digests for identical Git migration blobs in the primary and isolated
worktrees. This explains the six mismatches in Phase 2E.3 and seventeen in
Phase 2E.4A; the database hash for each row matches the exact LF/CRLF/bare-CR
Drizzle digest of the same migration source. No historical migration content
drift remains, and no migration SQL or ledger row was changed.

The scanner now verifies those exact Drizzle representations while keeping
SQL edits, BOM changes, trailing content, and terminal-newline changes
hash-significant. The read-only development scan verified all 18 ledger rows,
including 0015–0017, and completed catalog discovery. Its Phase 2E.3-contract
snapshot fingerprint remains `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`.
The Phase 2E.4A planner fingerprint hashes a full `RuntimeSnapshot`, while the
Phase 2E.3/current reconciliation fingerprint uses a canary-focused aggregate
projection; their differing values do not establish a runtime-content change.

The current TXH head is newer than this isolated audit baseline and includes
migration 0018, while development still has 18 ledger rows. Phase 2E.4B did not
execute 0018; a new catalog scan against the current chain must stop at the
migration gate until the trusted migration process handles that pending file.

Canary Master release content and release hash remain immutable. The App
Import artifacts generated in Phase 2E.4A were not changed here; only
analysis-only candidate/proposal/review evidence was regenerated. Apple #1/#295
remain unresolved, the final human-owned reconciliation is unchanged, and the
planner remains `canApply=false`. No database write, migration, import APPLY,
or runtime mutation occurred.

Evidence: [`migration hash root-cause report`](../../vocabflow-dataset/reports/canary-development-migration-hash-root-cause.md)

## Phase 2E.6 — Development canary closure

The approved 2.1.0 / schema 2.0.1 development canary is verified with a
dedicated read-only verifier. It confirmed the current 19-migration chain,
eight runtime mappings and effective fingerprints, one matching import run,
Technology Starter #17 with algorithm at position 1, and a fresh all-NOOP
plan. The verifier does not change the human reconciliation or relax the
pre-apply snapshot guard.

Development canary: `VERIFIED`. Production: `NOT AUTHORIZED / NOT EXECUTED`.
Bulk ingestion: `NOT STARTED`. Apple #295: `OPEN FOLLOW-UP`. The 100-Sense
hybrid source proof was completed offline in Phase 2F.1; it does not authorize
bulk runtime import. No database write, APPLY, migration, or production
connection occurred in Phase 2E.6.

See the [sanitized canary closure report](../../vocabflow-dataset/reports/master-v2-development-canary-closure.md).

## Phase 2F.1 — Hybrid Oxford + 4600 source proof

Created the offline source-candidate package at
[`hybrid-100-sense-proof`](../../vocabflow-dataset/workspaces/hybrid-100-sense-proof/)
with its [source-proof report](../../vocabflow-dataset/reports/hybrid-100-sense-source-proof.md).
The exact sample contains 70 Oxford + 4600 headword candidates, 20 Oxford-only
candidates and 10 4600-only candidates that require later semantic authoring.
Oxford CEFR coverage is 18 per level. The selection contains 68 Senses from 55
multisense Lexemes, 12 paired Lexemes, 5 multiword candidates, and five
existing Master identity/meaning audit candidates.

The source proof fingerprint repeated exactly. Semantic alignment records
34 `ALIGNED`, 3 `HEADWORD_ONLY`, 33 `AMBIGUOUS` and 20 `NO_MATCH` Oxford
candidates; a matching headword alone never assigns Sense identity. The
sanitized media audit lists 99 technical candidates, but rights remain
`UNKNOWN_UNVERIFIED` and none are shippable. Raw note fields remain in the
ignored local cache. No canonical Master record/ID, release 2.1.0, runtime,
database, migration, development canary or production state changed. Bulk
runtime import and 100-Sense Master authoring have not started.

## Phase 2E.5 — Development canary APPLY and verification

The first real Master V2 runtime canary APPLY completed on the owner-approved
development Neon branch `br-square-grass-b3af0nte` for approved release 2.1.0.
The run used the exact reviewed reconciliation hash and plan fingerprint and
committed once. No migration, production/test/shared-CI operation, learner
assignment, or learner-history write was performed.

The import updated apple #1, bank-financial #871, and reservation #284; created
bank-river #2025, record-noun #2026, record-verb #2027, look-after #2028, and
algorithm #2029; and created Technology Starter #17 with algorithm at position
1. Runtime enrichment on the three mapped rows was preserved. Apple #295 and
record #849 remain unchanged and unmapped. Content versions are 3, 2, 2, and 1
for each newly created row.

A fresh read-only plan returned NOOP for all eight release Senses, and the
import ledger contains exactly one matching run. Progress and review aggregates
remained 87 and 229. The post-apply snapshot no longer matches the pre-apply
owner-proposal pin; the pin was left unchanged and no second APPLY was run.
Production readiness and Apple duplicate consolidation remain future work.

Focused validation passed (7 files / 100 tests), as did Master V2 validation
and `git diff --check`. Root typecheck and lint remain blocked by separate
progress-dashboard edits. See the [sanitized canary verification report](../../vocabflow-dataset/reports/canary-development-apply-verification.md).

## Phase 2F.1A — Hybrid source proof gate correction

The 2F.1 report/readiness contradiction was traced to two selected Oxford
note-level fallbacks: coverage used the internal structured-group bit, the
sanitized candidate output omitted that evidence, and the report hardcoded an
all-structured claim. The editorial-ready flag also depended only on the
100-candidate count. The two fallbacks were replaced deterministically while
keeping the 70/20/10 source split, CEFR quotas, POS distribution, polysemy
coverage, and five Master collision candidates. The sanitized candidate and
crosswalk records now expose a segmentation status distinct from the group
reference, under parser contract `APKG-SOURCE-PROOF-3`.

The repeated source fingerprint is
`89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc` with 90
structured Oxford candidates and zero fallbacks. Editorial authoring is ready;
source text/media reuse remains blocked by unknown rights. Ambiguous and
unmatched alignment remains valid only for independently authored content,
with human review for ambiguity. The existing Master audit still requires
compatible POS and semantic evidence for an existing Sense; an existing
Lexeme/new Sense decision reuses its Lexeme ID only in the later authoring
phase. No IDs were allocated and no database, canonical Master, migration,
import, or media state changed. See the
[sanitized source-proof report](../../vocabflow-dataset/reports/hybrid-100-sense-source-proof.md).

## Related Dataset Authoring Evidence — Phase 2F.3

The owner approved the 100/100 Phase 2F.2A editorial draft for canonical DRAFT
promotion only. Phase 2F.3 added 84 Lexemes, 98 Senses, and 590 provenance
records to the root authoring package. The root manifest remains DRAFT at
2.0.0/schema 2.0.1; no release was approved and no runtime import was started.
Classifications, media, and pronunciations were not promoted, and source/media
rights remain unverified. The development canary and existing local changes
were preserved; no database or production target was accessed.

Evidence: [Phase 2F.3 canonical promotion report](../../vocabflow-dataset/reports/hybrid-100-canonical-promotion.md)
and promotion plan fingerprint
`5c10618ee72fcc7b99b270764e412ebc51f286eadc750e45a6910830bb15e870`.
