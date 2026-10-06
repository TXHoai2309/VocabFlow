# VocabFlow Changelog

This log records meaningful project milestones and accepted baselines.

## 2026-10-06 — Master Vocabulary V2 Phase 2F.6A taxonomy policy closure

- Resolved taxonomy approval versioning by owner decision: immutable 2.0.0
  remains DRAFT; a new immutable 2.0.1 APPROVED snapshot is planned as a PATCH
  with no semantic taxonomy change. PATCH is lifecycle/governance-only, MINOR
  is additive semantic content, and MAJOR is breaking semantic content.
- Defined the approval semantic equality contract: compare the full taxonomy
  payload while excluding only top-level snapshot metadata (`taxonomyVersion`,
  `status`, `createdAt`, `updatedAt`). Nested lifecycle state remains semantic.
  The future 2.0.0→2.0.1 diff must be zero and is not yet verified because the
  target snapshot remains uncreated.
- Recomputed the final 2.2.0 plan against the unchanged RC: 87 Lexemes, 100
  Senses, 99 Classifications, one planned taxonomy pin, and the current
  Provenance closure. Technical readiness is YES; final build authorization is
  still pending. No taxonomy snapshot, approved entity revisions, final
  release, releaseHash, database/runtime, or production changes were created.
- Verification: focused audit regressions 7/7, Master validator 0 errors / 0
  warnings, two deterministic audit checks with no differences, Phase 2F.6A
  script ESLint, and `git diff --check` pass. Root typecheck/lint report errors
  in concurrent, uncommitted `apps/web` global-search edits; those files are
  outside this phase and were left untouched. The local Node 22.19.0 runtime
  warns against the package's 22.23.2 engine requirement.

## 2026-10-05 — Simplified App Navigation (Feature #13 / US-50)

- Replaced the crowded shared navigation with six desktop destinations and a
  fixed five-item tablet/mobile bottom bar. Settings is separated on desktop
  and available from a compact accessible account menu; Study opens Setup and
  stays active throughout the Study routes.
- Preserved Weak Words, Topics, Learning Sets and Learners routes with
  contextual/account entry points. Home's due stat now links to Weak Words;
  Vocabulary and Progress expose Topics, Home exposes Learning Sets, and the
  account menu/Home switcher expose Learners.
- Updated route-active and account-menu tests, the Vocabulary Topics entry
  assertion, navigation UI contract, story, decision and project flow records.
- Validation: focused regressions 14 files / 207 tests PASS; global typecheck,
  production build, feature ESLint and `git diff --check` PASS. Manual checks at
  1440px, 768px and 390px confirmed the desktop/sidebar breakpoint, five mobile
  items, no horizontal overflow and working mobile account menu.
- No API, database, migration, scheduler or Dataset V2 change; no database
  mutation or production deployment.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4C readiness metadata consistency

- Aligned root and CEFR gate owner-approval scope with the completed full
  cohort, and rebuilt stale release blockers and recommendation wording.
  Canonical Classification promotion remains ready but unauthorized; release
  readiness remains NO.
- No CEFR values, decision states, Classification IDs, or Provenance IDs
  changed. The deterministic full-owner fingerprint now supersedes the
  previous fingerprint because release-readiness metadata is covered by its
  fingerprint contract. Canonical, release, runtime, database, and production
  state remain unchanged. Validator, 11 focused tests, typecheck, ESLint,
  approval `--check`, and `git diff --check` pass.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4B full CEFR owner approval

- Owner-approved all 95 remaining decisions from the pinned Phase 2F.4A
  package. The full cohort now has 100/100 owner decisions resolved, with 99
  classified and fuse intentionally unclassified. Counts remain 1 reuse, 1
  revision, 97 new editorial classifications, and 1 unclassified; the CEFR
  distribution is unchanged.
- Added 95 stable owner-review provenance IDs (zero new Classification IDs).
  Workspace totals are 98 project-authored and 99 owner-review records, with
  99/99 classified decision coverage. Water receives workspace-only reuse
  governance evidence. Canonical promotion is ready, but has not occurred;
  approved release readiness remains NO and no release was created.
- Corrected the light predecessor hash report from pinned metadata and added
  deterministic closure tests. No canonical, runtime, database, or production
  mutation occurred. Source/media rights remain unverified and assignments
  remain VocabFlow editorial estimates, not official CEFR claims.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4A CEFR owner exception closure

- Closed the five explicit CEFR exception decisions in the offline workspace:
  light A1 as a planned revision under the existing Classification ID,
  freshman B2, roster B2, liable C1, and fuse intentionally unclassified.
  The other 95 rows remain unchanged with their prior general owner-review
  status.
- The closed outcome has 1 reuse, 1 revision plan, 97 new editorial decisions,
  1 intentional unclassified result, and no exception-queue remainder. The
  distribution is A1 17, A2 28, B1 20, B2 27, C1 7, and unclassified 1.
  Three Classification UUIDv7 IDs and eight provenance IDs were added; the
  stable fingerprint is
  `ec0a6e34556a3d484dbdd608e592b912cb8c4ff2ceafdbe46b9cac02ea23b18f`.
- CEFR editorial decision gate PASS; content cohort ready YES, while
  canonical Classification promotion and approved release readiness remain
  NO. Canonical Master, release, runtime, database, and production state were
  not changed. Rights remain unverified and no official CEFR claim is made.
- Focused regression tests (9/9), Master validator, typecheck, ESLint, and
  `git diff --check` PASS. See the [owner review closure report](../vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md)
  and [owner review sheet](../vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md).

## 2026-10-04 — Master Vocabulary V2 Phase 2F.4 CEFR editorial draft

- Added a repeatable offline `CEFR / EDITORIAL-PILOT-1` classification draft
  and owner review sheet for the approved 100-Sense cohort. The decision set
  contains 1 reused classification, 94 new workspace DRAFT classifications,
  4 owner-review decisions, and 1 unclassified Sense. Source CEFR tags remain
  evidence only; source/media rights remain unverified.
- Root semantic promotion remains DRAFT at 2.0.0/schema 2.0.1. No canonical
  classifications were added, no release was created, no runtime import or
  database write occurred, and production was untouched.
- Deterministic fingerprint repeated with zero IDs allocated on rerun. The
  100-Sense content cohort is ready to continue dataset work; an approved
  release is not ready. The focused suite passed (13/13), as did the Master
  validator, typecheck, full ESLint, and `git diff --check`. See the
  [classification draft report](../vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md).

## 2026-10-04 — Master Vocabulary V2 Phase 2F.3 canonical DRAFT promotion

- Recorded owner authorization for canonical DRAFT promotion of the exact
  Phase 2F.2A draft fingerprint. Promoted 84 Lexemes and 98 Senses using the
  already allocated Master and child IDs; the two reused Senses and existing
  light/reservation Lexeme records were not rewritten.
- Added 490 `PROJECT_AUTHORED` provenance records for authored content and 100
  `OWNER_REVIEW` records for the 100 reviewed decisions. No external source
  license or public-domain rights were asserted.
- Canonical dataset changes were limited to the root DRAFT manifest and
  canonical authoring records. Version
  remains 2.0.0 / schema 2.0.1. No Classification, media, pronunciation,
  approved release, runtime import, database, migration or production change.
- Canonical validation passed with 0 errors and 0 warnings. The follow-up
  promotion check is idempotent with zero required canonical diffs.
- See the [promotion report](../vocabflow-dataset/reports/hybrid-100-canonical-promotion.md).

## 2026-10-04 — Weak Words / Need Review (Feature #12)

- Added the learner-scoped `/weak-words` page and API with deterministic
  review-history classification, due status, real summary metrics, search,
  status filtering and bounded pagination. The page includes responsive,
  accessible word rows and a bulk review action; per-word Study targeting is
  deferred.
- Added the server-resolved `weak=1` Study scope. Due Weak items remain DUE,
  not-yet-due Weak items are VOLUNTARY, and Study Setup and Session Summary
  preserve the scope while all writes stay on the canonical review flow.
- No migration or database mutation. Dataset V2 remains outside the feature.
- Focused Weak Words/API/Study/Saved/Daily Goal/Continue Learning/Progress
  regressions PASS (15 files, 152 tests), plus the focused AppShell route test
  PASS (1 test). Changed-feature ESLint, typecheck, build and diff check PASS.
- See [US-49](stories/US-49-weak-words-review.md) and
  [DEC-024](decisions.md#dec-024--weak-word-classification-and-study-scope).

## 2026-10-04 — Master Vocabulary V2 Phase 2F.2A editorial QA

- Corrected 24 candidate-level editorial issue groups in the offline hybrid
  draft, including natural adjective use for far, a single aligned sense for
  acute and hopefully, the death-and-injury meaning for toll, countability
  for textile, and source-target alignment for crawl and compelling.
- Added the 100-row owner review JSON, readable decision sheet, repeatable
  review generator, and focused regression tests. Codex recommends
  APPROVE_DRAFT for all 100; human owner approval remains pending.
- Confirmed the 90 pinned Oxford groups against local raw-cache references,
  all ten 4600-only meanings, 2/2 reuse decisions, 3/3 new-on-existing-Lexeme
  distinctions, and 12/12 polysemy blocks. The identity registry is unchanged,
  reruns allocate no UUIDs, and source-overlap gates pass.
- All new records remain DRAFT. Canonical Master, root dataset manifest,
  canary release, and database remain unchanged; no import, migration,
  production connection, or media operation occurred.
- Focused tests passed (16/16), as did workspace validation, the root Master
  validator, typecheck, full ESLint, and git diff --check.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1A source-proof gate correction

- Corrected a source-proof contradiction: two of the selected 90 Oxford
  candidates were note-level fallbacks, despite a hardcoded report claim that
  every selected candidate used a structured source group. A deterministic
  repair replaced exactly those two candidates while preserving their source
  and CEFR cells, POS distribution, Master collision status, polysemy
  membership, and lexical-unit type.
- Added sanitized per-candidate/crosswalk segmentation status and bumped the
  parser contract to `APKG-SOURCE-PROOF-3`. Editorial readiness now requires
  all source, parsing, segmentation, selection, polysemy, media, dedup, safety,
  and deterministic-repeat gates. Rights remain unverified and block source
  reuse while allowing independent editorial authoring.
- Repeated fingerprint:
  `89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc`;
  selected Oxford segmentation is 90 structured / 0 fallback. The 100-item
  source split remains 70/20/10. No Master IDs, database writes, migrations,
  import apply, canonical mutations, or media uploads occurred.
- Focused tests passed (15/15), the Master validator passed (0 errors, 0
  warnings, 1 informational DRAFT issue), and typecheck, lint, and
  `git diff --check` passed. Local Node is 22.19.0 versus required 22.23.2.
- See `vocabflow-dataset/reports/hybrid-100-sense-source-proof.md` and
  `docs/ai-progress.md` for the sanitized proof and validation record.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1 hybrid 100-Sense source proof

- Added an offline stdlib APKG extractor, deterministic 100-Sense source
  selector, sanitized candidate/crosswalk/media audit package, and synthetic
  APKG tests. Raw note data stays in the ignored local cache; source files and
  media bytes are not committed.
- Verified the 70/20/10 Oxford-plus/Oxford-only/4600-only split, 18 candidates
  per Oxford CEFR band, minimum POS/polysemy coverage, 5 multiword candidates,
  and five existing Master identity/meaning candidates. The 4600 alignment
  retains ambiguous cases and never broadcasts one note across senses.
- Repeated source proof fingerprints match. Source and media rights remain
  unverified; all 99 technical media candidates are non-shippable. No Master
  content, IDs, database, release, canary, production or runtime import changed.
- The development canary remains `VERIFIED`; production remains unchanged and
  bulk runtime import has not started. See
  `vocabflow-dataset/reports/hybrid-100-sense-source-proof.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.6 development canary closure

- Added a target-verified, read-only post-apply verifier and package command.
  Its development run confirmed 19/19 migrations, 8/8 Master Sense mappings,
  matching effective-projection fingerprints, Technology Starter #17 with
  algorithm at position 1, one matching import run, and a clean all-NOOP plan.
- Preserved the approved release, human reconciliation, and reviewed APPLY
  fingerprint as historical evidence. Documented why the post-apply scanner
  mismatch is expected stale pre-apply evidence while retaining the APPLY
  stale-snapshot guard.
- Closed the development canary. Production remains unauthorized and
  untouched; bulk ingestion has not started. The 100-Sense gate covers offline
  package preparation only. No database writes or migrations were performed.
- Evidence: `vocabflow-dataset/reports/master-v2-development-canary-closure.md`.

## 2026-10-04 — Feature #11 Progress Dashboard

- Replaced the crowded Progress page with four canonical metrics, household-
  local 7/30-day activity and persisted review-accuracy charts, plus level and
  learner-accessible Topic coverage. Accuracy gaps remain empty; no fake deltas
  or unsupported recommendations are shown.
- Extended Progress Summary with a grouped level aggregate over enabled
  vocabulary in the learner's active assigned Learning Sets. The aggregate
  deduplicates repeated membership and keeps the existing learned/mastered
  definitions.
- Removed the dashboard's Gamification read because achievement
  reconciliation has a write side effect. No schema/migration or database
  mutation was introduced; Dataset V2 remains outside this feature.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.5 development canary

- Ran one target-verified development APPLY for the approved 2.1.0 release with
  the owner-reviewed reconciliation and exact plan fingerprint. No production,
  test/shared-CI, migration, or learner assignment mutation occurred.
- Updated apple #1, bank #871, and reservation #284; created five new vocabulary
  rows and Technology Starter with algorithm at position 1. Runtime enrichment
  was preserved, and Apple #295 plus record #849 remain unchanged.
- Read-only verification confirmed 8/8 mappings, the one import ledger row,
  correct content versions, unchanged history aggregates, and 8/8 post-apply
  planner NOOP actions. This is a development canary and does not establish
  production readiness.
- Evidence: `vocabflow-dataset/reports/canary-development-apply-verification.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4D final reconciliation V3

- Finalized the human-owned runtime reconciliation for approved release 2.1.0.
  Apple maps to runtime #1 with `UPDATE_TO_MASTER`; duplicate #295 remains an
  independent runtime row with its own history. The other seven Sense decisions
  and Technology Starter membership follow the explicit owner decision sheet.
- Reverified all 19 development migrations through 0018 and refreshed the
  read-only runtime snapshot. The only changed candidate evidence since the
  pinned scan was one new #295 review event; the current scan fingerprint was
  stable across repeat scans. The reconciliation is repinned to that snapshot.
- Updated the importer to resolve the package-level canonical reconciliation
  when planning from a release directory and to reject mismatched ownership,
  contracts, target, or scan evidence. Final DRY_RUN produced 3 mapped updates,
  5 vocabulary creates, 1 set create and 1 algorithm membership insert;
  `canApply=true`. No runtime IDs were allocated.
- Focused validation passed: 8 test files / 93 tests, typecheck, lint, and
  dataset validation. Runtime enrichment is preserved. No database writes,
  migration execution, learner-history changes, run-ledger writes, or import
  APPLY occurred. See the final apply-plan report for fingerprints and details.

## 2026-10-04 — Due-first study queue without a New-mode hard gate

- Removed the review-queue service rule that omitted eligible NEW vocabulary
  whenever at least 20 items were due. The queue continues to place DUE before
  quota-eligible NEW, while `daily_new_word_limit` remains the hard cap.
- Saved-all queues now order DUE, NEW and VOLUNTARY items while preserving all
  saved items and their existing classifications. Daily Goals remain progress
  targets and do not gate scheduler availability.
- Added regressions for Study Setup availability, mixed ordering, daily quota,
  review/new mode exclusivity and Saved VOLUNTARY preservation. Focused
  validation passed: 9 test files / 131 tests, global typecheck, build and
  feature ESLint. No migration or database mutation was required.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4B migration hash verification

- Audited Drizzle's actual SHA-256 contract and proved both reported mismatch
  counts came from checkout line endings: six CRLF files in the Phase 2E.3
  worktree, then seventeen in the Phase 2E.4A worktree. Migration Git blobs
  were unchanged; the database rows match LF digests for 17 files and CRLF for
  `0004_scheduled_review_write`.
- Added a deterministic verifier that accepts exact Drizzle hashes of LF,
  CRLF, or bare-CR serializations of the same SQL source. SQL content, BOM, and
  terminal newline changes still fail verification. Updated owner analysis to
  report zero historical hash mismatches accurately.
- The read-only development scan verified all 18 ledger rows and migrations
  0015–0017, then completed catalog discovery. The Phase 2E.3 comparison
  fingerprint remains unchanged; the planner's full-snapshot fingerprint uses
  a different contract.
- The later current TXH head adds migration 0018 while development remains at
  18 applied rows; the Phase 2E.4B scan is scoped to its isolated 18-migration
  baseline. No migration was executed, and a new scan on current TXH must stop
  before catalog discovery until 0018 is handled through the trusted process.
- Release 2.1.0 Master content and release hash remain unchanged. Phase 2E.4A
  App Import files were not changed; analysis-only candidate/proposal/review
  outputs were regenerated. Apple decisions remain unresolved and
  `canApply=false`. No database writes, migration execution, or import APPLY.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4A runtime preservation

- Versioned the projection null policy as App Import v3, runtime projection v2
  and reconciliation v3. Master-present values are set; null/absent runtime
  enrichment is preserved for mapped rows; explicit `clearFields` is required
  to clear a nullable value.
- Planner previews now expose field operations, effective runtime projection
  and effective fingerprint. `contentVersion` changes only when the
  API-visible projection changes; replay remains idempotent.
- Preserved the 2.1.0 source release and release hash while regenerating its
  derived App Import artifacts. Added read-only development previews and a
  comparison report; apple #1/#295 remain unresolved.
- Fresh migration verification found 17 hash mismatches among 18 present
  ledger entries, including 0015–0017. No migration or database write was run.
- Focused suites pass: 3 files / 50 tests. Typecheck, lint and `git diff
  --check` pass. Human reconciliation remains unresolved and the checked-in
  plan is not applyable.
## 2026-10-04 — Feature #10 configurable daily learning goals

- Added learner-specific daily targets for new words (default 10) and review
  words (default 20), with persisted Settings API/UI and a derived Home progress
  ring, category counts and existing streak.
- Activity counts come from distinct persisted review events on the household
  local date. The combined goal completes only when both targets are reached;
  the scheduler's existing daily New hard cap and streak definition are
  unchanged. The legacy aggregate goal column is retained without cleanup.
- Added additive migration 0018; it was generated and inspected but not applied.
- Focused API/UI/schema tests pass (11 files, 153 tests); contracts/API/web
  project typecheck, production build, feature ESLint and `git diff --check` pass.
- Repository-wide `pnpm typecheck` remains blocked by 9 missing projection
  fields in the separate, concurrently changing Dataset V2 planner. That file
  was left untouched; commit/push were withheld because the full validation gate
  did not pass. No database mutation, production access or deployment occurred.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.3 owner reconciliation preparation

- Refreshed development runtime reconciliation evidence in a verified
  REPEATABLE READ / READ ONLY snapshot; its fingerprint is unchanged from
  Phase 2E.2. The approved release and development target remain unchanged.
- Added the final owner decision sheet, projection-loss audit, readiness report,
  and an unresolved analysis-only owner-ready artifact. Apple #1/#295 remain
  unranked; owner decisions for all Senses and Technology Starter are
  unresolved.
- Planner dry-runs reject the existing stale 2.0.0 human reconciliation for
  release 2.1.0 and reject the analysis-only owner-ready file at the ownership
  gate. A temporary non-Apple simulation found no other structural issue.
- Migration ledger remains 18/18 rows present with 0015–0017 exact and six
  historical hash mismatches. The planner does not currently compare that
  ledger when calculating canApply; the drift remains a separate integrity
  concern.
- Focused Dataset V2 suites pass (6 files / 91 tests), typecheck and repository
  ESLint pass. No database write, APPLY, migration, runtime ID allocation,
  learner-history merge, Cloudinary operation, APKG use, or API/UI change.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.2 owner reconciliation review

- Added a targeted, read-only apple identity audit with Learning Set and
  normalized Topic memberships, assignment aggregates, progress-state counts,
  review ranges, and same-learner overlap count. Learner IDs are not selected or
  emitted; the one-row overlap is flagged `DUPLICATE_LEARNER_HISTORY`.
- Added an analysis-only reconciliation proposal and owner review report for
  the eight canary Senses and Technology Starter. All owner decisions remain
  unresolved, the human-owned reconciliation file is unchanged, and the
  proposal is rejected by the import planner's ownership gate.
- Verified legacy migration hash drift separately from identity review. No
  database or runtime mutation, import APPLY, migration, learner history merge,
  ID allocation, media operation, or API/UI change.

## 2026-10-03 — Align Continue Learning Topic scope

- Restricted Topic candidate progress to enabled Topic vocabulary intersected
  with the active learner's enabled active-set vocabulary, matching the domain
  Study Setup can queue. Learning Set and Saved membership remain unchanged.
- Pre-aggregated latest review time per learner/vocabulary before joining the
  collections, preventing review-event row multiplication. Since event rows do
  not persist collection provenance, the card now says “Hoạt động gần nhất”.
- Added regressions for a 23-word Topic with 5 active eligible words and 3
  learned, exclusion of out-of-scope progress, unchanged Set/Saved behavior,
  deterministic ranking, Topic CTA scope, fallback, and wording.
- Focused validation passes: 9 files / 95 tests, typecheck, build, feature
  ESLint, and `git diff --check`. No migration or database mutation.

## 2026-10-03 — Continue Learning (US-47)

- Replaced only the Home “Tiếp tục học” card's next-review-queue preview with
  one real partially learned collection candidate and scope-preserving Study
  Setup action. Candidate progress is collection-local and recency comes from
  `review_events.reviewed_at`; mode and exact session resume are omitted because
  neither is persisted.
- Added an authenticated learner-scoped read-only API summary. No full
  vocabulary catalog request, database schema/migration change, database
  mutation, or Dataset V2 change is part of the feature.
- Focused Home, Topic, Learning Set, Study Setup/queue, and API tests pass
  (9 files / 92 tests); `pnpm typecheck`, `pnpm build`, feature ESLint, and
  `git diff --check` pass. Build retains existing dynamic-import and bundle
  size warnings. Commit/push results are recorded after implementation.

## 2026-10-03 — Saved Vocabulary all-saved study scope

- Fixed “Học tất cả từ đã lưu” so its explicit Study Setup scope contains all
  enabled saved vocabulary, including existing progress that is not yet due.
- Not-due existing progress is voluntary practice and still uses the canonical
  revision-checked review scheduler. New, Review, Mixed, and daily-New behavior
  remain unchanged; Study and Summary Continue preserve the collection scope.
- Focused regression tests pass (6 files / 97 tests), along with typecheck,
  feature ESLint, build, and diff check. No learner DB mutation or deployment.

## 2026-10-03 — Master Vocabulary V2 canary editorial correction

- Added immutable Sense revision 2 pins for apple fruit, record noun/music
  recording, and reservation booking, preserving stable Sense and child IDs.
- Regenerated the App Import preview and canary review, pending owner approval,
  release plan, and read-only reconciliation candidates from the DRAFT source.
  Five other canary Senses and the human-owned reconciliation remain unchanged.
- Validator (0 errors/0 warnings/1 informational DRAFT issue; tests 30/30),
  isolated transform tests (23/23), canary preparation/release-builder tests
  (2/2), eleven Phase 2D.1 bridge checks, TypeScript, and ESLint pass. The
  broader focused run exposed a stale migration-index assertion for 0016 versus
  current 0017 and a transform timeout under load; the transform rerun passed
  in isolation. The known stale assertion was skipped in the focused bridge
  rerun.
- No runtime, database, Neon, migration apply, media, reconciliation decision,
  or Study UI change occurred.

## 2026-10-03 — Saved vocabulary (US-46)

- Added learner-owned saved words with an additive relation table and explicit
  list/save/unsave APIs. Vocabulary content stays canonical and learner
  ownership is checked on every request.
- Added bookmark controls in Catalog and Detail, plus `/saved` with runtime
  search/filter options, optimistic rollback, and a Study Setup action whose
  server queue includes saved words only. No Dataset V2 content changed.
- Focused tests (9 files / 104 tests), typecheck, feature ESLint, build, and
  diff check pass. Migration validation is offline; no live DB or production
  deployment was performed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.2 readiness

- Added a field-aware, explicit owner approval template and deterministic
  release builder for a new `2.1.0` MINOR subset snapshot. It creates immutable
  revisions in an isolated workspace, validates/hashes the candidate, and runs
  the offline RELEASE transform only after release-level and content decisions
  are explicitly supplied.
- Added a pure read-only snapshot reconciliation scanner. It reports exact
  field drift, overrides, quarantine, history references, and polysemy ID
  ambiguity while leaving all decisions unresolved.
- The real approval template remains pending; no approved release workspace,
  staging target, runtime snapshot, reconciliation, or applicable import plan
  exists. No database or remote operation was performed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D runtime bridge

- Added additive Master Sense, Topic, Learning Set, membership-ownership and
  import-run bridge tables, plus migration `0015_clean_yellowjacket.sql`.
- Added human-owned runtime reconciliation, deterministic offline plan/report,
  and target-gated transactional importer. Existing integer IDs, progress and
  review references remain stable; overrides and image quarantine require
  explicit conflict resolution.
- The current pilot stays DRAFT and ineligible (25 Sense, 18 Topic, and 7 Set
  identities unresolved). Synthetic approved fixtures cover transaction-time
  ID allocation and exact-release replay. The migration remains unapplied; no
  Neon, other remote database, or Cloudinary mutation was performed.

## 2026-10-02 — Study Session focus mode

- Refined `/study` and `/study/exercises` into a responsive focus-mode screen
  with queue-backed progress, immediate answer feedback, desktop keyboard
  shortcuts and an in-page next-question flow.
- Answers stay local until Next, allowing Undo before the existing review API
  is called. Server-confirmed saves, retry identity, queue scopes and
  reinforcement behavior remain unchanged. No API, database or Dataset V2
  changes were made.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2A validator

- Added a two-stage Draft 2020-12 schema and cross-file validator rooted at the
  exact pins in `vocabflow-dataset/dataset.json`. Added RFC 8785 JCS content and
  release hash verification, typed references, ownership/cardinality checks,
  taxonomy cycles/scope, Learning Set eligibility, media compatibility,
  Relation semantics, Provenance closure, and a stable machine report.
- Added synthetic cross-file test datasets and coverage for valid release
  hashes, warnings, required invalid graphs/pins, and all existing Phase 1
  schema fixture expectations. No production vocabulary, runtime, database,
  importer, or media operation was added.
- Generated validation reports carry a run timestamp and are git-ignored to
  keep source changes reproducible.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 1 schema package

- Made V2 releases reproducible by pinning exact entity revisions, immutable
  record paths/content hashes, taxonomy snapshots, Learning Set revisions,
  media versions/byte hashes, relations, and Provenance; specified a canonical
  release hash.
- Clarified Pronunciation owner XOR, classification value shape by dimension,
  and Lexeme/Sense semantic revision ownership. Added Draft 2020-12 document
  schemas and synthetic fixtures under `vocabflow-dataset/`. The package has
  no production vocabulary content and does not change runtime or persistence.
  All 8 schemas pass Draft 2020-12 meta-schema checks and all 18 fixture
  expectations match under the local JSON Schema validator.

## 2026-10-02 — Vocabulary Detail implementation

- Started owner-reprioritized US-43. Adds an authenticated detail route using
  the existing learner vocabulary API, shared AppShell, and pronunciation hook;
  unsupported vocabulary details and learning metrics remain explicit empty
  states. No backend, database, commit, push, or deployment changes.

## 2026-10-01 — Production Release #8 artifact scan policy

- Kept generic PostgreSQL URI matches blocking in public/static and
  unclassified artifact files while making private Vercel function URI counts
  diagnostic. Added exact known-secret scans across every artifact file and
  retained global assignment, provider/token, local-env-file, and source-map
  checks.
- Passed the release database/provider values only to the artifact verifier;
  the Vercel CLI subprocess receives a sanitized environment.

## 2026-10-01 — Production Release #7 Vercel API boundary fix

- Moved the Vercel entrypoint tests and test TypeScript project out of root
  `/api`, retaining them in the root `tsc -b` references.
- Added a recursive guard to the production build so Vercel's function
  discovery directory cannot contain `.test` or `.spec` TypeScript files.
  Existing artifact credential scanners remain strict.

## 2026-10-01 — Protected Production Release automation

- Added a third GitHub Actions workflow that starts only after successful Core
  CI completion for a same-repository `main` push, checks out the triggering
  run's immutable SHA, verifies production DB identity and migration state,
  applies guarded forward-only migrations, verifies no migrations remain
  pending, then deploys that exact SHA through the existing safe Vercel wrapper.
- Added dedicated `ci-production-release` authorization bound to GitHub's
  workflow-run event metadata. Generic CI/database paths and `ci-test` cannot
  use production credentials; the existing Trusted DB workflow remains
  test-only and unchanged.
- No production connection, migration, deployment, commit or push was run.
  GitHub Environment reviewer/branch protections and the documented secrets
  and variables remain owner setup.

## 2026-10-01 — Vietnamese catalog metadata

- Added forward-only migration `0014_vietnamese_catalog_metadata` to localize
  the five compatibility learning sets, eleven US-41 learning sets, all 17
  topics, and achievement descriptions that were mixed or awkward Vietnamese.
  Updates are keyed by stable slugs/codes and preserve IDs, source topics,
  ordering, grades, enabled flags, relationships and learner history.
- Updated the US-41 curation source and manifest display metadata so later
  curation applies retain Vietnamese names/descriptions; vocabulary selection,
  English learning content and API shape are unchanged.

## 2026-09-30 — Shared authenticated application shell

- Moved the existing Home sidebar/navigation into one persistent layout route
  shared by Home, Study, Vocabulary, Topics, Learning Sets, Progress, Learners
  and learner Settings. Nested routes retain their parent destination's active
  navigation state; login and registration remain standalone.
- Replaced the centered Home-only outer card with a full-viewport desktop shell,
  compact tablet navigation and a mobile menu. Home keeps its greeting and
  approved dashboard content; learner-selection return navigation is unchanged.
- Added routing coverage for shell reuse, direct Learners visits, nested active
  links, auth screens and the Home return flow. No backend, data, auth or
  scheduler behavior changed.

## 2026-09-28 — Guarded production vocabulary catalog import

- Added a separate explicit production release-operator path to
  `vocab:import-catalog`; local development and CI test invocations retain
  their existing CLI and environment guards.
- Production preflights use the provider-verified `vocabflow_runtime`
  credential, enforce canonical post-connect identity, and keep dry-run inside
  a read-only transaction. Apply needs the explicit target/apply/branch
  confirmations. No owner/migration credential, DB privilege, or Vercel
  runtime path was added.
- The release runbook now places catalog import before US-41 curation.

## 2026-09-28 — Least-privilege production DB preflight

- Production preflight now validates `vocabflow_runtime` separately from
  `vocabflow_migration`: both perform canonical post-connect identity checks
  in read-only transactions, while only migration reads the Drizzle ledger.
- No runtime Drizzle grant, runtime-to-migration membership, protected
  metadata privilege change, or database mutation was introduced. Regression
  tests reproduce the prior runtime-role ledger permission failure.

## 2026-09-28 — Guarded first-production database bootstrap

- Added an explicit, read-only-by-default first-production bootstrap command
  for the confirmed fresh Neon production branch. It requires provider-side
  project/branch proof and an explicit one-shot `neondb_owner` URL, and refuses
  unexpected or partial VocabFlow state before mutation.
- Reused the established role/schema/privilege bootstrap implementation and
  added separate operator-only URLs for bootstrap and canonical identity
  provisioning. Vercel runtime credential resolution remains unchanged; no
  production database connection, mutation or deployment was performed.
- Updated the release runbook to separate one-time initialization from normal
  future releases. The owner-authorized follow-up is scoped to TXH; main remains
  excluded.
- Added regression coverage proving fresh bootstrap resolves the owner-only
  Neon principal without requiring `vocabflow_identity_bootstrap`, rejects
  wrong/development targets, and keeps runtime/migration roles canonical. The
  runbook now explicitly labels `vocabflow_identity_bootstrap` as
  development/test-only. No live DB was accessed.

## 2026-09-28 — Vercel API ESM explicit module paths

- Preview confirmed the ESM Function no longer failed with `ERR_REQUIRE_ESM`,
  but Node ESM rejected the directory import `../apps/api/src`.
- The handler now imports the existing `index.js` and runtime-bindings `.js`
  module paths explicitly. TypeScript's Bundler resolution maps those paths to
  the tracked `.ts` sources; the observed Vercel output already contains
  `apps/api/src/index.js`.
- Added native Node ESM coverage for the transpiled handler boundary and
  expanded Better Auth sign-in forwarding coverage. No app business logic,
  route configuration, SPA fallback, DB/auth settings or schema changed.
- Focused module/routing/auth tests pass (28 tests); full suite passes (54
  files / 582 tests), as do lint, typecheck, Vite build and `git diff --check`.
  No Vercel CLI/deploy or DB was used. Runtime confirmation of the Preview fix
  remains for the owner's single retry.

## 2026-09-28 — Vercel Function ESM module-scope fix

- The Preview runtime trace showed the CommonJS function boundary requiring
  `apps/api/src/index.js`, which belongs to the app's ESM package scope. The
  repository root has no ESM marker and `api/` had no package boundary.
- Added `api/package.json` with `type: module` so the thin Vercel Function
  boundary uses ESM without changing the root package scope or duplicating the
  existing Hono app. A Node + tsx subprocess test loads the handler, calls the
  Hono health route, and rejects `ERR_REQUIRE_ESM` / CommonJS `require()`.
- Existing Better Auth dispatch, nested API path restoration, API JSON 404 and
  SPA routing remain covered and unchanged. No DB/auth schema or configuration
  behavior changed; no Vercel CLI, deployment or database was used.
- Local lint, typecheck, all 579 tests, Vite build and `git diff --check` pass.
  Local Node is 22.19.0 rather than the repository-pinned 22.23.2.

## 2026-09-27 — Vercel Preview API route integration

- Added an explicit `/api` and `/api/*` route to the statically named
  `api/handler.ts` Vercel Function, restoring each original API pathname before
  dispatch to the existing Hono app. This covers Better Auth and non-auth API
  endpoints without duplicating application routes.
- Preserved the SPA fallback exclusion for API paths and tightened release
  artifact verification to require the packaged handler Function.
- Added focused tests proving GET/POST auth requests reach the existing Hono /
  Better Auth boundary, API routing is distinct from SPA fallback, and the
  expected Function artifact is required. No DB/auth schema or source guard
  policy changed.

## 2026-09-27 — V1.0 hosting pivot: Cloudflare to Vercel

- Made Vercel the V1.0 production host without changing React/Vite, Hono,
  Neon, Better Auth or Cloudinary. The root project serves the static SPA and
  routes `/api/*` to the existing Hono app as a Node.js Function; SPA fallback
  explicitly excludes API paths.
- Added an allowlisted process-environment boundary, canonical Production auth
  origin checks and exact-current-deployment Preview auth. Production database
  migrations and US-41 curation remain separate, manually approved steps.
- Retained platform-independent DB release/reset/shared-CI guards and clean
  SHA/toolchain/artifact checks; removed the Cloudflare/Vite Worker plugin,
  Wrangler config and deploy helper. Historical BATCH 0 Cloudflare records are
  labeled as such.
- No Vercel or Cloudflare deployment and no production database connection or
  mutation was performed in this preparation.
- Local verification: frozen-lockfile install, 544 unit/component tests, lint,
  typecheck, Vite build, 26 Playwright E2E tests and `git diff --check` pass.
  The guarded production build remains gated on pinned Node 22.23.2 and a clean
  release checkout.
- Core CI run `36300948885` and Trusted DB run `36300948861` both pass on
  implementation SHA `5fd0515c4d3ae2cd4cc0a15ec407aca13d2f04ad`; Trusted DB
  targets `shared-ci`, not Production.

## 2026-09-27 — Historical Cloudflare production deployment preparation (superseded)

- Added a production release runbook and guarded production preflight,
  migration, and US-41 curation paths. Production migration/apply requires
  explicit target/branch confirmation, provider proof, and forward-only SQL;
  reset tooling remains blocked. No production database was connected or
  mutated.
- Added canonical HTTPS Better Auth origin enforcement, secure production
  cookies/trusted origin, Cloudflare production Worker route finalization,
  clean SHA/toolchain checks, local env-file exclusion, artifact secret/source
  map scanning, and a deploy-time artifact digest check.
- The repository's canonical production branch is
  `br-rough-silence-b3gbqjcb`; the hostname/zone are owner inputs. The
  development acceptance facts in the runbook are owner-provided baseline, not
  a new Trusted DB run. Production migration, US-41 apply, deploy, user
  creation, and `v1.0.0` tag remain unexecuted.
- Local validation on this change: 527 tests, lint, typecheck, manifest-only
  curation dry-run, build with dev-vars cleanup and artifact scan, 26 E2E tests,
  and Wrangler dry-run. Production build requires Node 22.23.2 and a clean
  release checkout; the current local runtime is 22.19.0.

## 2026-09-25 — US-41 explicit development-target safety path

- Added an explicit read-only development target snapshot and activation plan,
  protected by configured Neon identity checks and a database-enforced
  `READ ONLY` transaction. Output includes only non-secret target metadata.
- Development apply requires the explicit development target, apply flag,
  target confirmation and exact configured branch confirmation. Production
  remains blocked, and Trusted DB remains isolated to the shared CI test target.
- Tooling/docs/tests only; no development or production database operation was
  executed and no curation manifest selection changed.

## 2026-09-24 — US-41 final content remediation

- Kept the full 213-row curated corpus and added eight explicit source-bound
  image quarantines plus five exact Vietnamese meaning overrides. Source
  images remain preserved for audit but are masked in learner-facing content;
  quarantined rows stay enabled candidates and cannot enter `IMAGE_TO_WORD`.
- Added durable schema-backed overrides with raw-import precedence, updated
  vocabulary/topic/set/queue/review reads, and extended curation dry-run
  reporting. No local source dataset or unrelated translation was changed; no
  LLM/API content rewriting was used.
- Final local dry run: 202 media PASS, 3 missing-image WARN, 8
  quarantined-image WARN, 0 BLOCK, 11 image-ineligible; 5 meaning overrides;
  all duplicate, mismatch and missing-meaning counts are zero.
- Local full validation: 476 tests, lint, typecheck, build and 26 E2E tests
  pass. Core CI run [#93](https://github.com/TXHoai2309/VocabFlow/actions/runs/35964700073)
  and Trusted DB Integration run [#88, attempt 3](https://github.com/TXHoai2309/VocabFlow/actions/runs/35964700003)
  pass on implementation SHA `0cc10dd9ded1564a860d605b196939a25dce1d1d`.
  Trusted DB used its configured CI test target. Real Neon apply was not
  performed.

## 2026-09-23 — US-41 owner-refined final curation

- Applied the owner's exact source identities for 11 replacements and removed
  seven deferred terms with no replacements. The reviewed manifest now has 213
  rows (100 Grade 1, 73 Grade 2, 40 Grade 3); Grade 2 Feelings has 13 rows and
  was not padded back to 20.
- Missing image references now report WARN and may activate. Usable audio,
  required text and source identity remain mandatory; known unusable/corrupt
  media still blocks. This does not grant `IMAGE_TO_WORD` eligibility or
  change exercise fallback, study queue, progress, XP, achievements or daily
  New behavior.
- Local dry run: media 210 PASS / 3 WARN / 0 BLOCK (`anger`, `sadness`, `joy`),
  30 starter mappings and `DB_MUTATIONS=0`. No real Neon apply was performed.
- Lint, typecheck, all 457 tests, build and 26 E2E tests pass locally. Core CI
  run `35840195766` and Trusted DB Integration run `35840195673` both pass on
  commit `760c0c04d7498a3b6e27b15ee47e4cee0c305aed`; Trusted DB used the
  configured CI test target only.
- The documentation-only follow-up SHA `6d2675f2` failed Trusted DB runs
  `35841107601` and `35842150875` at curated apply with `XX000: cache lookup
  failed for type 590564`. The shared test reset drops/recreates enum types;
  DB script connections now use `prepare: false` to avoid stale prepared-query
  type OIDs. The focused regression passes; Core CI `35843693211` and Trusted
  DB `35843693265` both PASS on fix commit
  `2ef6166dcc9c3475773f2385626001f2d897cc43`. No real Neon apply was run.

## 2026-09-22 — US-41 content curation and activation

- Audited the 1,994 imported vocabulary records and tracked the deterministic
  `VOCABULARY_CURATION_V1` manifest with 220 reviewed rows: 100 Grade 1, 80
  Grade 2 and 40 Grade 3, grouped into eleven ordered learning sets.
- Added source-identity, canonical-topic, explicit-grade and image/audio media
  gates. The default `pnpm vocab:curate` command is read-only and reports
  `MANIFEST_RECORDS=220`, `STARTER_TOPIC_MAPPINGS=30`, `MEDIA_GATE=PASS
  checked=220` and `DB_MUTATIONS=0`.
- Added trusted-CI-only transactional activation with idempotent set/item
  upserts. Starter identity, learner assignments, progress, review history, XP,
  achievements and the daily New limit remain unchanged. US-42 is not started.
- Core CI #87 and Trusted DB Integration #81 both passed on candidate
  `4d76cfa946ccae94ec3e5deb690f0365ba579363`; owner review remains pending.

## 2026-09-21 — US-39 + US-40 learner rewards

- Added an immutable, learner-scoped XP ledger and derived 100-XP level rule. A successful scheduled review earns 10 XP once; daily-goal completion earns 20 XP once per local date.
- Added idempotent catalog-backed achievements with historical reconciliation for canonical evidence and responsive locked/unlocked Progress UI. Reset preserves XP and badges.
- Exercise-correct bonus is deferred: exercise type and correctness are not a server-trusted review signal, so no client label can farm rewards. Scheduler behavior is unchanged.

## 2026-09-21 — US-39/US-40 reward fix-forward

- Added server-derived exercise verification to the existing review write. A correct scheduled exercise earns one immutable `EXERCISE_CORRECT` event worth 5 XP; no client correctness boolean is accepted, typed input is transient, and no historical exercise XP is backfilled.
- Fixed Trusted DB fixture cleanup to remove XP and learner-achievement child rows before learner profiles, preserving the global achievement catalog and avoiding FK teardown failures.

## 2026-09-21 — US-37 + US-38 weekly, daily and topic progress

- Added learner-scoped, bounded 90-day progress-history aggregation from canonical review events with household-local dates, explicit zero-fill and review/unique/remembered/forgotten/current-lifecycle-new metrics.
- Progress now has a seven-day view and set-based current topic progress for enabled vocabulary reachable through active assigned sets. Topic Due remains an overlapping subset; unmapped starter words remain honestly uncategorized.
- No mutable analytics counters, schema changes or scheduler changes were added. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-20 — US-35 + US-36 daily goal and learning streak

- Added learner-scoped `daily_learning_goal` with default 10 and validation
  range 1–100. Settings GET/PATCH now returns and safely updates it alongside
  the separate daily New limit.
- Added canonical learner activity summary derived from persisted
  `review_events`: daily progress counts distinct vocabulary on the
  household-local review date, while remembered, forgotten, reinforcement and
  retry semantics remain canonical.
- Added derived current/longest learning streaks with local calendar-day
  boundaries and the not-active-today/active-yesterday continuation rule.
  Progress UI shows goal and streak indicators; reset and unassign preserve
  history. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-20 — US-33 + US-34 image and typing exercises

- Extended the existing `/study/exercises` route with deterministic
  `IMAGE_TO_WORD` and `TYPE_WORD` modes; Learner Home exposes image and typing
  entry links without creating a second exercise subsystem.
- Image mode requires a usable image and four safe English options, uses neutral
  non-answer-revealing alt text and performs a one-way safe fallback on broken
  media. Typing uses Vietnamese-first cues, strict Unicode NFKC/trim/
  case-insensitive comparison, preserves meaningful internal spaces and rejects
  fuzzy spelling.
- Correct/incorrect results continue through the canonical review API. One
  submission, save-before-next, safe retry, reinforcement, summary, queue
  eligibility, daily New limits and learner isolation remain unchanged. Raw
  keyboard input is not persisted; no DB or learner-progress schema changed.
- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-31 + US-32 exercise interaction layer

- Added an explicit `/study/exercises` route for deterministic
  `MULTIPLE_CHOICE_MEANING` and `LISTENING_CHOICE` exercises; `/study` keeps
  the existing Flashcard path.
- Meaning exercises use one correct Vietnamese meaning plus three normalized,
  non-duplicate distractors. Listening exercises require usable `audioUrl` and
  unique English candidates; both fall back to Flashcard when safe generation
  is not possible.
- Exercise submission maps correct/incorrect to `REMEMBERED`/`FORGOTTEN` via
  the existing review API, locks one submission, waits for save confirmation,
  preserves safe retry/reinforcement/summary behavior and never writes progress
  directly from the UI.
- Broken audio falls back without scheduler mutation; SpeechSynthesis is not
  used. No database schema, learner-progress schema or scheduler interval
  changed. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-30 daily new word limit

- Added learner-scoped `daily_new_word_limit` with default 10 and validation
  range 0–100, plus authorized settings API and parent UI.
- Review Queue now limits only virtual NEW admission by the remaining
  household-local daily allowance. Due remains first and exempt; existing
  session caps and progress-summary semantics are unchanged.
- Daily consumption uses the current progress lifecycle's
  `first_learned_date`; reset removes that lifecycle while preserving review
  events. Idempotent retries and reinforcement do not consume another NEW
  allowance, and concurrent first writes are serialized per learner.
- Added focused settings/queue/review/UI coverage, migration assertions and a
  Trusted DB US-30 suite. Status: `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-28 + US-29 learning sets and learner assignments

- Added five deterministic curated learning sets with ordered vocabulary
  membership and authenticated catalog/detail APIs and UI.
- Added normalized, household-authorized learner/set assignments. Existing
  learners and newly created learners receive the all-starter compatibility set
  through canonical paths.
- Review queue eligibility now requires enabled vocabulary in at least one
  active assigned enabled set; repeated vocabulary across sets is deduplicated.
- Unassignment preserves progress and review history, and reassignment reuses
  the canonical learner/vocabulary progress row. Imported rows remain disabled.
- Added forward-only migration/reset/schema assertions, focused API/UI/queue
  coverage and a Trusted DB US-28/29 suite. Status:
  `IMPLEMENTED / READY FOR OWNER CHECK`.

## 2026-09-19 — US-26 + US-27 vocabulary taxonomy implementation

- Implemented a nullable canonical vocabulary level model with optional API
  filters and a Vocabulary List level selector. No grade was inferred because
  the imported source contains no grade metadata; all current rows remain
  unclassified.
- Added 17 source-backed canonical topics and normalized
  `vocabulary_topics` many-to-many membership, plus authenticated topic APIs
  and a responsive topic browse screen.
- Preserved starter IDs, imported source identities, disabled imported rows,
  learner progress and review events. Study queue and scheduler behavior are
  unchanged.
- Added migration safety assertions, focused API/UI tests and Playwright E2E
  coverage. Implementation commit: `d612e1a`. Status: `IMPLEMENTED / READY FOR
  OWNER CHECK`.

## 2026-09-19 — Repository recovery: US-12 through US-25 backfill and Core CI closeout

- Backfilled retrospective story contracts for US-12 Audio Pronunciation,
  US-13 Recall/Scheduler Integration, US-14 Due/New Queue, US-15 Session
  Reinforcement, US-16 Save Before Next, US-17 Safe Retry, and US-18 Reload/Leave.
- Recorded closed US-19 Session Summary (`72120022`), US-20/US-21 Progress and
  Isolation (`ee9fd8a`), US-22 Vocabulary List (`e56940c`, manual owner check
  deferred), US-23 Missing Media, and US-24 Reset Progress (`101ccc1`).
- Recorded US-11 acceptance (`d5fea5e`), US-12 (`5988661`), US-13–US-15
  audited baseline (`c0b65f4`), US-16–US-18 closeout (`447d6e2`), and the
  existing media-manifest/Cloudinary foundation plus starter enrichment tooling.
- US-25 (`f17521b`) documents the schema/source-identity importer, real
  migration/import of 1,994 records, disabled imported rows, and the
  post-import idempotency result of 0 inserts, 0 updates, and 1,994 skips.
- GitHub Core CI run `35250926587` failed in Unit and component tests because
  `scripts/enrich-starter-vocabulary.test.ts` read gitignored `local-data/`;
  Trusted DB run `35250926632` passed. Recovery replaces that test dependency
  with deterministic tracked fixtures while retaining real-data manual tooling.
- Recovery commit `60b384dd1f53ca5a5472402292a450190446ba9e` passed Core CI run
  `35434440380` and Trusted DB Integration run `35434440386`; US-25 is now
  `ACCEPTED / CLOSED`.
- At that recovery checkpoint US-26 had not started. `docs/decisions.md`
  remains protected and is intentionally not changed.

## 2026-09-16 — Starter vocabulary enrichment tooling

- Added the dry-run-first `vocab:enrich-starter` command for the eight
  owner-approved rows `1, 2, 7, 8, 9, 11, 18, 19`.
- Added exact source/media identity checks, missing-source preservation,
  content-version idempotency and guarded single-transaction apply logic.
- No real database apply was run; student `10` and the remaining 21 starter
  rows remain excluded.

## 2026-09-16 — US-11 Flashcard Back Content & Recall Actions implementation

- Extended the reusable Flashcard presentation with explicit back-side IPA,
  Vietnamese meaning and available supporting content.
- Preserved optional image fallback, added meaningful image alternative text and
  kept absent optional fields out of the rendered back.
- Preserved Study-owned Remembered/Forgotten controls, review writes,
  reinforcement and summary behavior; controls remain unavailable before flip.
- No backend, schema, migration or database behavior changed. Trusted DB is not
  required for this UI-only refinement.
- US-11 implementation is ready for owner check; US-12 has not started.

## 2026-09-16 — US-10 Reusable Flashcard Front State implementation

- Extracted the Study card presentation and media fallback behavior into the
  reusable `Flashcard` component.
- The front now mounts only the English word, flip affordance and explicitly
  allowed manual audio; meaning and answer-bearing optional content are
  conditionally rendered only on the back.
- Preserved Study queue/review/reinforcement/summary behavior and responsive,
  keyboard and focus-visible interaction.
- No backend, schema, migration or database behavior changed. Trusted DB is not
  required for this UI-only refinement.
- US-10 implementation is ready for owner check; US-11 has not started.

## 2026-09-15 — US-09 Flashcard Session UX implementation

- Implemented the Architecture Step 9 queue-backed Study session over the
  accepted US-08 review queue and US-07 scheduled-review write APIs.
- Added due-first flashcard presentation, flip/back content, manual audio and
  media fallback, server-confirmed recall actions, exact-payload retry,
  stale-revision reconciliation, bounded session-local reinforcement and an
  ephemeral session summary.
- No schema, migration, API or database behavior changed. Trusted DB is not
  required for this UI/client-composition slice.
- Local implementation evidence is complete; US-09 is ready for owner check.
- `docs/decisions.md` remains protected and unchanged.

## 2026-09-15 — US-08 Review Queue accepted and merged

- Accepted immutable US-08 candidate
  `bb91e01073dd156602cddb5bb98948ce06659bbe` after technical review, Core CI
  run `34970869460` PASS, scoped Trusted DB run `34971985883` PASS for
  `us08-review-queue`, and Owner Acceptance `OWNER_ACCEPT_US08`.
- PR #7 merged the accepted candidate into `main` at
  `2e8dd0f30754969f86fb00933813dcebbbe342d5`, with merge parents
  `1a860ffc16e688b806299d4dafe4e8a064c0d1f2` and
  `bb91e01073dd156602cddb5bb98948ce06659bbe`.
- Real PostgreSQL evidence passed for authorization and household isolation,
  sparse NEW and revision `0`, due/new ordering and caps, NEW suppression,
  timezone ownership, BIGINT/revision read behavior, read-only queue behavior
  and runtime-role execution. US-07 write/CAS behavior remains separate.
- US-08 success boundary `review-queue-ready` is achieved and US-08 is now
  `ACCEPTED / CLOSED`. The reset evidence note remains: all six fixture cleanup
  operations completed and `us08-reset` was invoked, but the final reset state
  is not independently proven because no distinct reset-completion marker was
  emitted.
- Historical candidates #1 through #4 remain permanently `FAILED / RETIRED`;
  candidate #5 is the accepted candidate. US-07 remains `IN PROGRESS / BLOCKED`
  with its CAS P1 open, and US-09 has not started.

## 2026-09-15 — US-08 consolidated cap/suppression harness fix-forward

- Retained candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` as `FAILED / RETIRED` after
  Trusted DB run `34960083041` exposed the systematic cap-harness isolation
  defect at `US08_DB_DUE_19_COUNTS`.
- Updated the Trusted DB harness to isolate each fresh cap learner from
  pre-existing enabled vocabulary with strict-future progress, while keeping
  global vocabulary unchanged. The 19-DUE NEW-cap, 20-DUE suppression and
  21-DUE order-before-LIMIT contracts now derive explicit expected sets and
  emit detailed diagnostics.
- Product code, schema, migrations, workflow/orchestration, US-07 and the
  prior live-proven fixes remain unchanged. The fix is uncommitted; no
  Trusted DB rerun or candidate #5 was created.

## 2026-09-15 — US-08 queue-semantics harness fix-forward

- Retained immutable candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` as `FAILED / RETIRED` after
  Trusted DB run `34954397186` reached live authorization and old-`42601`
  evidence, then exposed the invalid queue-semantics count expectation.
- Updated only `scripts/test-review-queue-db.ts`: the queue-semantics learner
  now receives strict-future progress for enabled vocabulary that pre-existed
  the scenario, preserving the intended sparse NEW rows and deterministic
  DUE-first queue. Diagnostics include expected/actual review date, IDs and
  counts without normalizing the runtime response.
- Product code, schema, migrations, workflow/orchestration, US-07 and the
  prior authorization/`42601` fixes remain unchanged. The local fix is
  uncommitted; no external Trusted DB rerun or new candidate was created.

## 2026-09-15 — US-08 authorization harness expectation fix-forward

- Kept immutable candidate
  `9dad72447457b08327de2606e218d34c37af1912` as `FAILED / RETIRED` after
  Trusted DB run `34950169177` exposed the invalid exact-one authorization
  expectation.
- Updated only `scripts/test-review-queue-db.ts`: the positive authorization
  case now derives the eligible global NEW prefix independently from canonical
  migration-role state, enforces the existing order/cap/virtual-NEW contract,
  and emits expected/actual queue diagnostics.
- Confirmed no product, schema, migration, workflow, US-07 or US-09 scope
  changed. The old `42601` fixture fix remains closed. Local validation passes;
  external Trusted DB was not rerun and no new candidate was created.

## 2026-09-15 — US-08 Trusted DB harness fix-forward diagnosis

- Retired immutable candidate
  `54a029f333dcee7abfa825e9991d8d61797e87e4` after Trusted DB run
  `34941415887` failed with PostgreSQL SQLSTATE `42601` in the US-08
  authorization fixture setup.
- Confirmed a harness-only `vocabularies` INSERT arity defect: the shared
  fixture helper listed `content_version` without supplying a fifth value.
  The local fix removes that target column so the schema default `1` applies.
- Product semantics, schema, migration, workflow and US-07 behavior remain
  unchanged. Focused validation is `41/41`, full tests are `251/251`, E2E is
  `11/11`, and lint, typecheck, build, Drizzle and workflow/preflight checks
  pass.
- No new immutable candidate was created. Narrow technical review, future
  Core CI and the scoped Trusted DB rerun remain pending; US-08 remains
  `IN PROGRESS / BLOCKED`.

## 2026-09-15 — US-08 acceptance evidence hardening

- Implemented the five queue test-quality areas with queue-specific
  authorization, future-progress, UTC/local timezone, ordering/cap and
  unsafe-BIGINT coverage. A follow-up review found the due progress insertion
  order needed to be noncanonical to prove order-before-LIMIT; that P2-4 fix
  is now implemented and pending technical re-review.
- Added an independent `scripts/test-review-queue-db.ts` PostgreSQL suite for
  live queue semantics, read-only behavior, role use, cleanup/reset and
  household isolation.
- Added explicit `TRUSTED_DB_SUITE=us08-review-queue` orchestration while
  preserving `full` as the canonical default. Trusted DB and Core CI were not
  run; US-07 remains blocked on its known CAS P1 and US-08 remains in progress.

## 2026-09-15 — US-08 Review Queue owner-override implementation

- Started the owner-authorized US-08 `Review Queue` implementation on an
  isolated `us-08` branch from `origin/main` at
  `c3b2eb422bb5d922c5c2808ad2761674ba11b93a`.
- Added the strict queue contract and authenticated household-scoped read API
  for deterministic due-first and sparse-NEW selection, including
  household-local date and revision metadata, plus focused tests and the
  US-08 story.
- No schema, migration, reset, privilege, study-session UI, US-07 diagnostic
  or Trusted DB work was added. US-07 remains `IN PROGRESS / BLOCKED` with its
  known PostgreSQL CAS P1 open; the owner override does not imply acceptance.

## 2026-09-14 — US-07 Scheduled Review Write fix-forward 2

- Aligned the story contract with the reviewed household-scoped idempotency
  key `(household_id, review_id)`, BIGINT scheduler/revision persistence and
  JavaScript safe-integer/MAX_SAFE revision semantics.
- Replaced numeric-only UUID fixtures so uppercase/lowercase canonicalization
  coverage is non-vacuous. Focused tests remain `27/27` PASS and full tests are
  `238/238` PASS; US-07 remains `IN PROGRESS`.
- Technical re-review, Core CI and Trusted DB Integration remain pending. No
  implementation redesign, commit, push or US-08 work was performed.

## 2026-09-14 — US-07 Scheduled Review Write fix-forward 1

- Resolved the three technical-review P1 findings: household-scoped review
  idempotency, canonical UUID fingerprinting and safe BIGINT scheduler
  persistence with explicit JavaScript safe-integer boundaries.
- Added focused foreign-review-ID, case-normalization, numeric-boundary and
  migration-alignment regressions. Focused US-07/schema-reset tests are
  `27/27` PASS; US-07 remains `IN PROGRESS`.
- Technical re-review, Core CI and Trusted DB Integration remain pending;
  Trusted DB is required for final acceptance. No US-08 work was started.

## 2026-09-14 — US-07 Scheduled Review Write implementation checkpoint

- Started US-07 implementation under the approved scheduled-review contract.
- Added shared review DTOs, additive progress/event schema and migration
  `0004_scheduled_review_write`, reset support and `POST /api/reviews` with
  authorization, sparse NEW, scheduler, idempotency, CAS concurrency, atomic
  persistence and safe errors.
- Added focused API/service and schema/reset tests. US-07 remains `IN PROGRESS`;
  technical review, Core CI, Trusted DB and owner acceptance remain pending.
- Review Queue, Study UI, reinforcement, seed changes, CI/workflow changes and
  US-08 remain out of scope. `docs/decisions.md` remains protected local work.

## 2026-09-14 — US-07 Scheduled Review Write contract approved

- Owner approved US-07 for implementation with the canonical scheduled-review
  response DTO, first materialized revision `1`, missing/disabled vocabulary
  `404 VOCABULARY_NOT_FOUND` behavior (or the established equivalent),
  authorization-before-replay and enabled-learner rules.
- Preserved the server-authoritative idempotency, sparse `NEW`, optimistic
  concurrency, timezone, immutable event and atomic progress/event contracts.
- US-07 is `READY FOR IMPLEMENTATION`; Review Queue and US-08 remain out of
  scope. Final acceptance requires Core CI and Trusted DB Integration.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  protected unrelated local work.

## 2026-09-14 — US-07 Scheduled Review Write contract preparation

- Added US-07 at `READY FOR CONTRACT REVIEW` as the recommended next story
  after accepted US-06 and Architecture Step 6: `POST /api/reviews`.
- Locked the discovery scope around one scheduled server-authoritative write,
  sparse virtual `NEW` materialization, `reviewId` idempotency,
  `expectedRevision`, household-local dates and atomic progress plus immutable
  review-event persistence.
- Kept Review Queue (Architecture Step 8), reinforcement, Study-session UX,
  progress presentation and US-08 out of scope.
- Identified owner decisions required before implementation: exact response DTO,
  first materialized revision (`0` versus `1`) and confirmation of the
  missing/disabled vocabulary `404 NOT_FOUND` mapping.
- US-07 requires additive schema/migration and real DB concurrency validation,
  so Trusted DB Integration will be required for its later acceptance.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  protected unrelated local work.

## 2026-09-13 — US-06 Learning Scheduler Domain accepted

- US-06 is `ACCEPTED`; the `scheduler-domain-ready` success boundary was
  achieved and T06-01 through T06-17 are `PASS`.
- Focused learning-domain tests `51/51` PASS; full tests `218/218` PASS; E2E
  `11/11` PASS; lint, typecheck, build and `git diff --check` PASS; technical
  re-review PASS.
- Core CI #32 PASS on reviewed commit
  `cc649d2dca4b233752e08f9c565ad384ea2f6816`; Core CI #33 PASS on merged main
  commit `b838f107a69830234202caded33f9b7ad0040c9e`.
- Trusted DB Integration #30 PASS is extra evidence only and was not required
  for this pure-domain story. No API, persistence, review queue, session,
  schema, migration, dependency, UI or US-07 work was added.
- PR #3 was merged before explicit Owner Acceptance. The post-merge audit
  confirmed the exact reviewed revision, green CI and no scope drift;
  classification is `PROCESS-ORDER DEVIATION ONLY`, with no revert required.

US-07 remains not started.

## 2026-09-13 — US-06 Learning Scheduler Domain fix-forward checkpoint

- Corrected safe-integer overflow handling for scheduler counter increments;
  unsafe canonical results now fail deterministically with the existing domain
  validation error.
- Added focused coverage for numeric invalid values, result overflow, large
  mastered counts, leap-year century rules, interval rollover and complete
  remembered-transition outputs.
- Focused scheduler tests PASS (`51/51`). US-06 remains `IN PROGRESS`; no API,
  database/schema/migration, dependency, CI/workflow, UI, persistence or
  US-07 work was added. Technical re-review and Core CI remain pending.

## 2026-09-12 — US-06 Learning Scheduler Domain implementation checkpoint

- Moved US-06 to `IN PROGRESS` and implemented the approved pure
  `packages/learning-domain` `scheduleReview` contract.
- Added explicit virtual `NEW`, `LEARNING`/`MASTERED` invariants,
  `REMEMBERED`/`FORGOTTEN` transitions, 1/3/7/14/30 intervals, deterministic
  Gregorian calendar arithmetic, no overdue bonus and typed validation.
- Scheduler tests PASS (28 focused tests); repository tests PASS (195/195),
  lint, typecheck, build and existing E2E (11/11) PASS.
- No API, database/schema/migration, dependency, CI/workflow, Review Queue,
  persistence or UI behavior was added. Trusted DB is not required; Core CI is
  the remaining acceptance gate. US-07 has not started.

## 2026-09-11 — US-06 Learning Scheduler Domain contract approved

- Owner approved `US-06 — Learning Scheduler Domain` as a pure-domain story
  and promoted it to `READY FOR IMPLEMENTATION`.
- Confirmed explicit virtual `NEW` (never `null`), the `scheduleReview` input
  of `currentState` + `result` + explicit local `today`, and the
  `scheduler-domain-ready` success boundary.
- Confirmed the scheduler owns only deterministic state/date transformation;
  revision, `reviewedAt`, authorization, persistence, review queue and
  reinforcement remain later-layer concerns.
- No implementation, API, database/schema/migration, dependency, CI/workflow,
  commit, push or US-07 work started.

## 2026-09-11 — US-06 Learning Scheduler Domain contract preparation

- Added `US-06 — Learning Scheduler Domain` with status `READY FOR CONTRACT
  REVIEW` after US-05 acceptance.
- Proposed the `first-flashcard-ready` → `scheduler-domain-ready` boundary for
  a pure `packages/learning-domain` scheduled-evaluation function.
- Recorded virtual `NEW`, `LEARNING` and `MASTERED` transitions; the approved
  `REMEMBERED`/`FORGOTTEN` results; 1/3/7/14/30 intervals; explicit
  household-local calendar dates; no overdue bonus; and deterministic invalid
  input handling.
- Kept `POST /api/reviews`, revision/idempotency, persistence, review queue,
  session reinforcement, UI, schema/migration, API and Trusted DB work out of
  scope. No implementation, US-07 work, commit or push started.

## 2026-09-11 — US-05 First Real Flashcard accepted

- US-05 is `ACCEPTED`; T05-01 through T05-17 are `PASS` after owner manual
  acceptance of the learner handoff, real `apple` first card, flip behavior,
  optional/media safety, reload recovery, responsive layout and safe error/
  retry behavior.
- Local evidence is PASS: `167/167` tests, E2E `11/11`, lint, typecheck, build
  and `git diff --check`; no review, progress, scheduler or database write
  side effects were introduced.
- Core CI #30 SUCCESS on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28 SUCCESS is incidental and not a required US-05
  acceptance gate. No schema, migration, seed, privilege or DB behavior
  changed. US-06 has not started.

## 2026-09-11 — US-05 implementation started

- Moved US-05 to `IN PROGRESS` and implemented the approved minimal
  learner-context → focused `/study` → first real flashcard flow.
- Reused authenticated `GET /api/vocabulary`, selecting `vocabulary[0]` from
  the accepted deterministic response; added keyboard/touch flip behavior and
  safe loading, empty, error, auth/403 and optional-field states.
- Added focused UI/client/routing tests; the full local test suite is green at
  167 tests. No schema, migration, seed, write API, progress, scheduler,
  CI/workflow, Trusted DB or US-06 work was added.

## 2026-09-11 — US-05 manual acceptance checkpoint

- Owner manual acceptance PASS for the resolved learner handoff, real
  PostgreSQL-backed first `apple` card, front/back meaning behavior,
  pointer/touch and Space flip, safe NULL/media states, safe error/retry,
  reload learner-context recovery and 375x812 responsive behavior.
- T05-09, T05-12 and T05-13 now have manual PASS evidence; T05-10/T05-11 remain
  accepted through automated coverage without fabricated database/content
  mutations. T05-01 through T05-17 are locally PASS subject to final Core CI.
- US-05 remains `IN PROGRESS`. Trusted DB Integration is not required because
  US-05 adds no schema, migration, seed, privilege or database behavior.
- `docs/decisions.md` remains an unrelated local change and is excluded.

## 2026-09-11 — US-05 contract owner approval

- Owner approved `US-05 — First Real Flashcard` and promoted it to
  `READY FOR IMPLEMENTATION`.
- Frozen boundary: `learner-context-ready` + `vocabulary-content-ready` →
  focused `/study` → `first-flashcard-ready`.
- Approved the minimal “Bắt đầu học” handoff; full Learner Home metrics,
  scheduler, review queue and progress remain deferred.
- Frozen selection is `vocabulary[0]` from accepted enabled-only `id ASC`
  content. Space keyboard flip and optional-field safety are required; audio
  playback and fake review controls are excluded.
- No implementation, schema, migration, dependency, database/API write,
  Trusted DB or US-06 work started.

## 2026-09-11 — US-05 First Real Flashcard contract preparation

- Added the US-05 story in `READY FOR CONTRACT REVIEW` after US-04 acceptance.
- Recommended the smallest vertical slice: accepted learner context plus
  accepted vocabulary content → deterministic first card →
  `first-flashcard-ready`.
- Recommended a minimal study-entry handoff rather than a full Learner Home;
  due/new/progress metrics depend on later read contracts.
- Reuses authenticated `GET /api/vocabulary`; no schema, migration, dependency,
  write API, progress, scheduler, review or Trusted DB change is proposed.
- This is contract preparation only. No US-05 implementation or US-06 work
  started; `docs/decisions.md` remains unrelated and untouched.

## 2026-09-11 — US-04 Vocabulary Content Seed & Read Foundation accepted

- US-04 is `ACCEPTED` after owner manual acceptance of authenticated vocabulary
  read, the exact 30-record Starter v1 dataset, optional `NULL` fields,
  unsupported scope rejection and unauthenticated access; `403` behavior is
  covered by automated tests.
- T04-01 through T04-16 PASS. Dataset validation, lint, typecheck, tests,
  build, E2E, migration/schema/reset checks, `DB_MIGRATE=PASS` and
  `git diff --check` PASS.
- Core CI #28 and Trusted DB Integration #26 both SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- BATCH 2 is accepted; Learner Home, first flashcard rendering and US-05
  remain deferred and unstarted.

## 2026-09-11 — US-04 pre-Trusted-DB acceptance checkpoint

- Recorded owner manual acceptance PASS for authenticated
  `GET /api/vocabulary`: `200`, exactly 30 records, IDs `1..30`, first word
  `apple`, last word `new`, all `enabled=true` and `contentVersion=1`.
- Recorded PASS for the exact approved dataset content, all optional fields
  `NULL`, unsupported `householdId`/`learnerId` rejection as
  `400 INVALID_REQUEST`, and unauthenticated access as `401 UNAUTHORIZED`.
- Local `DB_MIGRATE=PASS`, dataset validation, lint, typecheck, tests, build,
  E2E, migration/schema/reset checks and `git diff --check` PASS.
- US-04 remains `IN PROGRESS`; Trusted DB Integration remains
  `PENDING ACCEPTANCE GATE`. The `403 HOUSEHOLD_ACCESS_DENIED` path is covered
  by automated tests only and was not manually forced by mutating local DB.
- No acceptance finalization or US-05 work was started.

## 2026-09-11 — US-04 implementation started

- Moved US-04 to `IN PROGRESS` and implemented the approved
  `vocabflow_app.vocabularies` schema, content-version check and reset-policy
  participation.
- Added the controlled `0003` migration with exactly 30 enabled Starter v1
  records, the versioned JSON source artifact, dataset validation and tests.
- Added shared `VocabularyDto`/response/seed contracts and authenticated
  `GET /api/vocabulary` with household authorization, enabled-only `id ASC`
  ordering, strict scope-input rejection and safe errors.
- No UI, learner progress, review, scheduler, CI/workflow or US-05 work was
  added. Trusted DB Integration remains pending; no live Neon call was made.

## 2026-09-11 — US-04 dataset source approved

- Approved `VocabFlow Starter Vocabulary v1` as
  `DATASET_SOURCE=VOCABFLOW_STARTER_V1` with
  `DATASET_PROVENANCE=PROJECT_AUTHORED` and `DATASET_STATUS=APPROVED`.
- Locked exactly 30 enabled records with stable IDs `1` through `30`,
  `contentVersion=1`, and nullable optional fields left `NULL` for v1.
- The allowed claim is only “beginner starter vocabulary selected for the
  VocabFlow MVP”; no official CEFR, Oxford, Cambridge, Wiktionary-derived or
  copied dictionary claim is permitted.
- Moved US-04 to `READY FOR IMPLEMENTATION`. No application code, schema,
  migration, actual seed data, dependency, CI or Neon operation was created;
  US-05 remains unstarted.

## 2026-09-11 — US-04 contract prepared for review

- Added `US-04 — Vocabulary Content Seed & Read Foundation` with status
  `READY FOR CONTRACT REVIEW` in new BATCH 2 Learning Content Foundation.
- Locked Option A only: shared/global `vocabularies` content, owner-approved
  20–30 word source, validated controlled content migration and authenticated
  deterministic `GET /api/vocabulary` ending at `vocabulary-content-ready`.
- Learner Home, first flashcard rendering, study, scheduler, progress, review
  queue, review writes, production UI and US-05 remain out of scope.
- Before owner approval, `DATASET_SOURCE=OWNER_APPROVAL_REQUIRED`; no dataset
  words, implementation, migration, dependency, CI or Neon operation was
  created in that preparation step.

## 2026-09-11 — US-03 Learner Profile Creation & Resolution accepted

- US-03 is `ACCEPTED` after owner manual acceptance of the zero-learner empty
  state, first learner creation, single-learner auto-resolution, 2+ learner
  selector, explicit selection, reload behavior, display-name validation,
  native Enter create and keyboard learner selection.
- Local lint, typecheck, tests, build, E2E, migration/schema/reset tests and
  `git diff --check` PASS.
- Core CI #26 and Trusted DB Integration #24 both SUCCESS on main commit
  `de6a8387da0f5e90faa62f19124df8ab4cb50157`.
- No US-04 implementation has started; no next story is active.

## 2026-09-10 — US-03 contract approved for implementation

- Owner approved the US-03 learner profile contract and its exact decisions for
  display-name validation, strict request fields, `learner-context-ready`,
  short-lived active learner state, nullable avatar behavior and network-
  uncertainty reconciliation.
- US-03 is now `READY FOR IMPLEMENTATION`; no feature code, schema, migration,
  dependency, BATCH 0 or US-04 work was started in the documentation task.

## 2026-09-10 — US-03 implementation started

- Promoted US-03 to `IN PROGRESS` and began the approved learner profile
  list/create and 0/1/2+ resolution slice.
- Local implementation gates currently pass: 137 Vitest tests and 9/9
  Playwright E2E tests, plus lint, typecheck and build.
- US-04, Learner Home, learning-domain behavior and BATCH 0 remain out of
  scope.

## 2026-09-10 — US-03 manual acceptance core-flow checkpoint

- Owner manual acceptance PASS: zero-learner empty state, first learner
  creation, one-learner auto-resolution, 2+ learner selector, explicit
  selection, one- and 2+ learner reload behavior, empty `displayName`
  validation, native Enter create, and Tab + Enter learner selection.
- US-03 remains `IN PROGRESS`; T03-17 remains `PARTIAL` and Trusted DB
  Integration remains the pending acceptance gate.

## 2026-09-09 — US-03 Learner Profile Creation & Resolution contract review

- Added the `US-03 — Learner Profile Creation & Resolution` story with status
  `READY FOR CONTRACT REVIEW`.
- Defined authorized learner list/create, 0/1/2+ resolution and the proposed
  `learner-context-ready` handoff; Learner Home and learning behavior remain
  out of scope.
- This is documentation-only preparation. No application code, schema,
  migration, dependency, BATCH 0 or US-04 work was started.

## 2026-09-09 — US-02 Parent Login acceptance

- US-02 Parent Login is `ACCEPTED` after owner manual acceptance and complete
  automated evidence.
- Valid Better Auth sign-in, authenticated session, idempotent
  `POST /api/bootstrap` and `authenticated-household-ready` handoff PASS.
- Lint, typecheck, 114-test suite, build, 5/5 E2E, responsive and diff checks
  PASS; no learner scope, migration, dependency or BATCH 0 changes were added.
- No next story is active; US-03 has not started.

## 2026-09-09 — US-02 Parent Login contract review

- Added the owner-defined `US-02 — Parent Login` story contract with status
  `READY FOR CONTRACT REVIEW`.
- Locked the success boundary at Better Auth sign-in → authenticated session →
  existing idempotent `POST /api/bootstrap` →
  `authenticated-household-ready`; learner profiles and learner UI remain out
  of scope.
- Reconciled active Better Auth documentation references with the repository's
  pinned `1.7.3` dependency.

## 2026-09-09 — US-02 Parent Login implementation

- Promoted US-02 to `IN PROGRESS` after owner approval.
- Implemented the `/login` Better Auth email/password slice, authenticated
  household handoff, safe retry/error states and acceptance tests.
- Learner schema/API/UI, migrations, dependencies and BATCH 0 infrastructure
  remain unchanged.

## 2026-09-08 — BATCH 0 Foundation acceptance

- Commit `24e4580`: documented BATCH 0 acceptance evidence.
- Core CI: PASS.
- Trusted DB Integration: PASS on Neon PostgreSQL 18.

## 2026-09-08 — Least-privilege migration executor

- Commit `2429b0f`: replaced the built-in Drizzle migration path that attempted
  to create the `drizzle` schema.
- The executor preserves the installed Drizzle journal/history semantics while
  requiring pre-provisioned schemas.

## 2026-10-03 — Owner-approved Master Vocabulary V2 canary 2.1.0

- Recorded explicit owner approval and generated immutable approved release
  `vocabflow-dataset/releases/canary-v2.1.0` with 8 Senses, 6 Lexemes, 41
  Provenance records, and the approved one-item Technology Starter set.
- Validated the release and generated Phase 2C RELEASE projections. Runtime
  media URLs remain null, experimental classifications remain excluded, and
  release-scoped reconciliation decisions remain unresolved.
- Added the canary release report and updated Phase 2D readiness and US-45
  progress documentation. No runtime/database/Neon/migration or learner-state
  mutation occurred.

## 2026-09-07 — PostgreSQL 18 role-model acceptance

- Commit `46d84f1`: aligned membership assertions with PostgreSQL 18's
  ADMIN-only automatic CREATEROLE membership behavior.

## 2026-09-07 — Dedicated application schema

- Commit `db959cf`: moved application tables to `vocabflow_app` while keeping
  protected `vocabflow_meta` and separate `drizzle` metadata.

## 2026-09-08 — Documentation and agent pack

- Added canonical Markdown conversions, governance/index files, decision log,
  AI handoff, roadmap, story templates and VocabFlow-specific `AGENTS.md`.
- This documentation task does not implement US-01 and is intentionally not
  committed until reviewed.

## 2026-09-08 — Finalize BATCH 1 story gate

- Aligned the documentation and agent status gates so only `READY FOR
  IMPLEMENTATION` permits feature code.
- Accepted the US-01 boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- Kept learner creation, new schema and new migration out of US-01.
- BATCH 1 and US-01 are now `READY FOR IMPLEMENTATION`; no feature code has
  started.

## 2026-09-08 — US-01 Phase 1 Register UI

- Implemented the `/register` focused auth screen and form behavior for
  T01-01/T01-02/T01-03.
- Added accessible required-field/email validation, password show/hide,
  autocomplete and keyboard submit behavior.
- Real Better Auth signup and household bootstrap (T01-04) remain pending.

## 2026-09-08 — US-01 Phase 1 checkpoint and contract correction

- Checkpointed Phase 1 on the `TXH` branch without implementing T01-04.
- Corrected the proven dependency: canonical household bootstrap requires
  `vocabflow_app.households` and `vocabflow_app.household_members`, which are
  not present in the BATCH 0 Better Auth Foundation migration.
- T01-04 may add only that minimal additive application migration; BATCH 0
  database infrastructure remains frozen.

## 2026-09-08 — Resolve US-01 Better Auth name contract

- Reconfirmed Better Auth 1.7.3 requires `name`, `email` and `password` for
  `signUp.email`.
- Updated the canonical Register contract and Phase 1 UI to collect the
  parent's visible display name, with required/trimmed Unicode-safe validation.
- T01-04 Better Auth signup and household bootstrap remain pending; no
  application integration or database change was started.

## 2026-09-08 — US-01 T01-04 registration integration

- Implemented the real Better Auth 1.7.3 parent signup pipeline with the
  authenticated `POST /api/bootstrap` Family-registration boundary.
- Added the additive `vocabflow_app.households` and
  `vocabflow_app.household_members` migration, atomic/idempotent bootstrap
  persistence and dependency-safe application reset ordering.
- Added safe signup/bootstrap loading, error and authenticated recovery states;
  learner creation and all learning-domain tables remain out of scope.
- T01-04 is implemented / pending acceptance; US-01 remains `IN PROGRESS`.

## 2026-09-08 — US-01 acceptance review: Better Auth session smoke

- Corrected the stale foundation Playwright smoke from unsupported
  `/api/auth/session` to Better Auth 1.7.3's `/api/auth/get-session` endpoint.
- The smoke now passes in configured preview and secretless CI modes. US-01
  remains pending Core CI and Trusted DB Integration evidence.

## 2026-09-08 — US-01 Trusted DB application enum reset fix

- Trusted DB exposed SQLSTATE `42710` on the second migration because the
  app-only reset left `vocabflow_app.household_role` behind after dropping its
  dependent tables.
- The reset policy now explicitly removes the schema-qualified application enum
  before truncating Drizzle migration history, and state-zero validation detects
  leftover application enum artifacts.
- US-01 remains `IN PROGRESS / PENDING ACCEPTANCE` pending the trusted rerun.

## 2026-09-08 — US-01 Parent Registration acceptance

- US-01 is accepted after local validation plus Core CI and Trusted DB
  Integration PASS on merged main commit `6806e66`.
- The success boundary is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- `/login`, learner creation, learner selector and Learner Home remain deferred
  and out of scope for this story; BATCH 1 remains in progress.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.1 bridge hardening

- Added migration `0016_nostalgic_mattie_franklin.sql` with composite Master/runtime candidate keys and membership foreign keys; preserved committed migration 0015.
- Added offline regression coverage for exact identity pairs, migration-chain integrity, and mapped/unmapped write-guard behavior.
- Added deterministic owner review, subset release plan, and separate unresolved/no-target reconciliation candidate artifacts. The canonical manifest and human-owned reconciliation remain unchanged.
- Audited existing import, enrichment, curation and read paths; documented the missing dedicated staging target and recommended a later isolated, explicitly configured canary branch.
- No database, Neon branch, learner/review, production, or media mutation occurred.

## 2026-10-04 — Master Vocabulary Dataset V2 Phase 2F.2 editorial draft

- Added an offline two-pass authoring workspace for the pinned 100-candidate
  proof and 98 project-authored DRAFT Senses, with 84 DRAFT Lexemes.
- Added stable UUIDv7 identity allocation, a tracked identity registry,
  canonical-schema and cross-file validation, deterministic package
  fingerprinting, local-cache source-overlap audit, and focused regression
  tests. The five identity collisions and 12 multi-sense groups are recorded
  for editorial review.
- The canonical Master, root dataset manifest, canary release, runtime, and
  database remain unchanged. Source/media rights are unverified; no import,
  migration, classification, provenance, or media operation occurred.
- Root Master validation, typecheck, focused tests, and `git diff --check`
  pass. Full-repository ESLint is blocked by one unrelated uncommitted
  weak-words page effect warning.

<!-- PHASE-2F5-CHANGELOG START -->
## 2026-10-05 — Hybrid-100 canonical CEFR promotion and release candidate

- Promoted the owner-approved CEFR package pinned to d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622: 97 new classifications, light revision 2, water reuse, and fuse intentionally unclassified.
- Built the immutable 2.2.0-rc.1 Hybrid-100 candidate in IN_REVIEW status; it is not an approved release and has no releaseHash.
- Runtime import, database writes, and production mutation remain unauthorized and were not performed.
<!-- PHASE-2F5-CHANGELOG END -->

## 2026-10-05 — Hybrid-100 RC final audit and release planning

- Audited the immutable 2.2.0-rc.1 package: exact owner-approved cohort,
  CEFR decisions, source-content freeze, provenance closure, and canary
  fingerprint all pass. No content correction is required.
- Added a read-only audit CLI, focused regression tests, exhaustive lifecycle
  inventory, approval-only revision plan, taxonomy decision plan, and proposed
  2.2.0 manifest. No canonical revisions, release, or official releaseHash
  were created.
- The taxonomy 2.0.0 approval-version rule remains ambiguous and blocks final
  release construction pending an owner architecture decision. Owner release
  authorization is pending; runtime import and production mutation remain
  unauthorized.
- Audit regression 6/6, Master validator (0 errors/warnings, 1 informational
  DRAFT issue), typecheck, global ESLint, and `git diff --check` pass. Local
  Node 22.19.0 emits the package engine warning (requested 22.23.2).

## 2026-10-06 — Global Search (Feature #14 / US-51)

- Added one learner-scoped search API and typed Vocabulary, Topic and Learning
  Set results with deterministic ranking, escaped parameterized matching and
  per-group result caps. Enabled Learning Sets retain the existing catalog
  discovery scope, while Vocabulary and Topic results stay in the active
  learner's accessible content domain.
- Added the AppShell desktop command palette and responsive mobile search
  sheet, Ctrl/Cmd+K, arrow/Enter/Escape controls and localStorage recent
  searches. Existing primary navigation remains six desktop items and five
  mobile items; active Study sessions hide the search trigger.
- No migration, persisted history, scheduler change, database mutation or
  production deployment was introduced.
