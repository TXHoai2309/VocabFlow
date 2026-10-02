# US-45 — Master Vocabulary V2 Runtime Import Bridge

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Owner direction: continue the Master Vocabulary Dataset V2 Phase 2D runtime
  identity bridge and import adapter.
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
