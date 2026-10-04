# Current Handoff Snapshot

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1A source-proof gate correction

- The prior proof had a real contradiction: coverage evaluated the internal
  `_structuredGroup` bit and found two selected Oxford note-level fallbacks,
  while the generated report hardcoded an “all structured” claim. Candidate
  sanitization omitted the bit, so the stable `sourceSenseGroupReference`
  could not distinguish true structured groups from generated fallback refs.
  Separately, the editorial-ready flag depended only on the 100-candidate
  count.
- Replaced the two verified fallback candidates deterministically in their
  existing Oxford+4600 / CEFR cells. POS distribution, Master collision
  status, polysemy membership, and lexical-unit type were preserved. The
  remaining 88 Oxford selections and 10 4600-only candidates are unchanged.
  New candidate IDs: `SOURCE-CANDIDATE-616c853e98fddfbade0001ee43b364e6b5ef6b6ad73efcee81897818e81720b5`
  and `SOURCE-CANDIDATE-9778e99282e13db6006303903ab40a2205f4940ea2b8333cb59b2da97111783c`.
- Sanitized candidates and crosswalks now include `senseSegmentationStatus`;
  parser contract `APKG-SOURCE-PROOF-3` versions this proof change. Readiness
  requires source/APKG verification, 100 candidates, 90 structured Oxford
  candidates, polysemy/media/dedup/selection gates, deterministic repeat, no
  committed raw content, zero allocated Master IDs, no canonical mutation,
  and zero database writes. Rights remain NO and block source reuse, but do
  not block independently authored editorial content. Alignment need not be
  100%; ambiguous cases require human/editorial review.
- Real source proof fingerprint repeated as
  `89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc`.
  Coverage: 90 structured / 0 fallback; 70/20/10 source split; 18 per CEFR;
  12 polysemy pairs; 55 multi-sense Lexemes; five Master collision candidates.
  Editorial authoring and Phase 2F.1A gates are YES. Source/media reuse remain
  NO; no database, Master, or media mutation occurred.
- Verification: focused source-proof tests 15/15; Master validator PASS (0
  errors, 0 warnings, 1 informational DRAFT issue); typecheck PASS; lint PASS;
  and `git diff --check` PASS. pnpm reports local Node `22.19.0` versus the
  declared `22.23.2` engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.2A editorial QA

- Reviewed all 100 candidate decisions and all 98 authored Sense drafts against
  semantic target, POS, labels, Vietnamese equivalents, definitions, examples,
  translations, sibling meanings, and language quality. Resolved 24
  candidate-level issue groups, including the five requested checks plus two
  additional source-target mismatches found in crawl and compelling.
- Rechecked all 90 Oxford-backed candidates against their pinned structured
  groups in the ignored raw cache, including POS, and reviewed the ten
  4600-only meanings as independent coherent senses. Confirmed 2/2 exact-enough
  existing Sense reuse decisions, 3/3 distinct new Senses on existing Lexemes,
  and all 12 polysemy blocks.
- Re-ran materialization twice. Draft fingerprint is
  a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d;
  the identity registry hash is unchanged and rerun UUID allocation is zero.
  Source overlap passes: zero exact English matches, zero overlaps of eight or
  more contiguous tokens, and zero unresolved high-similarity cases.
- The owner decision sheet recommends APPROVE_DRAFT for 100/100 candidate
  decisions. This is a Codex recommendation only:
  OWNER_FINAL_APPROVAL = PENDING and canonical promotion is not authorized.
  The canonical Master, root dataset manifest, and canary release are
  unchanged; no database, import, migration, production, or media operation
  occurred.
- Verification: focused Phase 2F.2/2F.2A tests 16/16, workspace validator
  PASS, root Master validator PASS (0 errors, 0 warnings, 1 informational
  DRAFT issue), typecheck PASS, full ESLint PASS, and git diff --check PASS.
  Local Node is 22.19.0 versus the declared 22.23.2 engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1 hybrid 100-Sense source proof

- Added a dependency-free Python APKG parser and synthetic fixture suite. It
  recomputes source identities from the local Oxford and 4600 packages, reads
  Anki collection/model/note/card metadata and the media map, and keeps complete
  raw note fields only in the ignored `.vocabflow-local` cache.
- Generated the separate sanitized
  `vocabflow-dataset/workspaces/hybrid-100-sense-proof` package and report.
  The exact sample is 70 Oxford + 4600 headword matches, 20 Oxford-only and 10
  4600-only authoring candidates; the 90 Oxford-backed Senses are 18 per CEFR
  level. The sample meets POS minima and has 68 Senses from 55 multisense
  Lexemes, including 12 paired Lexemes, plus 5 multiword candidates.
- Semantic alignment remains evidence-based: 34 `ALIGNED`, 3
  `HEADWORD_ONLY`, 33 `AMBIGUOUS`, 20 `NO_MATCH`; all 10 4600-only candidates
  require later semantic authoring. The selected sample references five
  existing Master candidates by identity and meaning audit; no new Master IDs
  were allocated.
- Recorded 99 selected technical media candidates with sanitized member
  references, sizes, SHA-256 values and detected/declared types. Example audio
  has a separate Example candidate; images receive a Sense target only after
  semantic alignment. Source/media rights remain unknown and every media item
  is non-shippable.
- Two independent real-source passes produced fingerprint
  `276a2c39e311cb9f434976dd4b22f06d2db2f335b8b882b0bdfb2e6af3eb6323` both
  times. The canonical Master is unchanged; the development canary remains
  `VERIFIED`; production is unchanged and bulk runtime import has not started.
- Verification: synthetic fixtures 10/10, Master validator 0 errors / 0
  warnings / 1 informational DRAFT issue, typecheck PASS, lint PASS, and
  `git diff --check` PASS. Local Node is 22.19.0 versus the declared 22.23.2.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.6 development canary closure

- Added a dedicated read-only post-apply verifier. The target-verified
  development run passed all checks: 19/19 migrations through
  `0018_panoramic_spirit`, eight exact Master mappings and fingerprints, the
  Technology Starter #17 algorithm membership, one matching import ledger row,
  and an all-NOOP current plan with zero issues.
- Frozen release 2.1.0 / schema 2.0.1, reconciliation JCS hash, pre-apply plan
  fingerprint, and import run remain unchanged. The scanner's post-apply
  snapshot mismatch is classified as stale pre-apply evidence only after the
  dedicated verifier passes; the importer's pre-apply stale-snapshot guard is
  unchanged.
- Apple #295 and record #849 remain unmapped and untouched. The prior canary
  evidence records preserved runtime enrichment and unchanged learner history.
  This phase performed no database writes, APPLY, migrations, or production
  connection. Production import remains unauthorized; bulk ingestion has not
  started. The 100-Sense hybrid proof gate authorizes only offline package work.
- The sanitized closure report is
  `vocabflow-dataset/reports/master-v2-development-canary-closure.md`.
- Focused validation passed: 8 test files / 83 tests, Master V2 validation
  (0 errors, 0 warnings), root typecheck, lint, and `git diff --check`. The
  local Node 22.19.0 version is below the repository's declared 22.23.2.

## 2026-10-04 — Feature #11 Progress Dashboard

- Progress Dashboard implementation is in progress. The prior audit confirmed
  learned = unique materialized learner progress rows; Mastered = current
  `MASTERED`; accuracy = persisted `REMEMBERED / (REMEMBERED + FORGOTTEN)` by
  household-local `review_date`; current streak reuses Activity Summary.
- `/progress` now has four evidence-based metrics, 7/30-day URL period
  selection, grouped activity/accuracy charts with blank no-review dates, and
  active-learning-set level coverage plus started Topic coverage.
- Progress Summary adds a set-based `progressByLevel` aggregate. The dashboard
  no longer calls the Gamification GET path because achievement reconciliation
  writes. No migration or database mutation is part of this change.
- Focused validation passed: 10 test files / 107 tests, the `apps/web`,
  `apps/api` and `packages/contracts` project-reference typecheck, production
  build, feature-file ESLint and `git diff --check`.
- Root `pnpm typecheck` initially exposed five errors in the new
  `scripts/master-vocabulary-v2-post-apply-verification.ts`; Phase 2E.6 fixed
  them, and the final root typecheck passes. The dashboard edits remain
  unrelated and are excluded from the Phase 2E.6 commit.
- Do not stage, commit, or alter unrelated unstaged/untracked Dataset V2 work
  and do not alter stashes.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.5 development canary APPLY

- Executed exactly one owner-authorized APPLY against the verified development
  Neon target `shy-hill-72364426 / br-square-grass-b3af0nte / neondb`, using the
  runtime role. No production, test/shared-CI target, migration, or learner
  assignment was touched.
- Release `2.1.0` remained immutable at
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`. The
  reviewed reconciliation JCS hash remained
  `75f67d20edc771c931e8cbf1d70118e339374c22f35a5d062160bca3f489efb2`; the
  exact pre-apply scan and plan fingerprints were `d4e4c7cb…0235a0`,
  `18b80a1a…7257f4`, and `4ffcb88e…d8718b` respectively.
- The committed import updated apple #1, bank-financial #871, and reservation
  #284; created bank-river #2025, record-noun #2026, record-verb #2027,
  look-after #2028, and algorithm #2029; and created Technology Starter #17
  with algorithm at position 1. Versions are 3, 2, 2, and 1 for each new row.
- Post-apply verification found 8/8 release mappings and a fresh read-only plan
  with 8/8 vocabulary actions `NOOP`. Import run
  `de0b29c4-db84-4d76-abd4-398f17151099` is recorded once. Runtime enrichment
  was preserved. Apple #295 and vinyl record #849 remain unmapped and unchanged;
  Apple consolidation remains future owner work.
- Progress and review aggregates stayed at 87 and 229. The apply plan reports
  zero mapped history references, deletions, or learner assignment changes;
  the import adapter has no write path for learner progress, review events, or
  learner Learning Set assignments. No API smoke request was made because the
  catalog routes require an authenticated learner session; direct read-only
  runtime catalog verification passed.
- Post-apply scan observed the expected changed runtime snapshot
  (`34b43959…54c4296`) and refused the old owner-proposal snapshot pin. The
  human-owned reconciliation was left unchanged; a separate read-only planner
  against the verified live snapshot returned 8 NOOP actions. No second APPLY
  was run.
- Focused validation passed: 7 test files / 100 tests, Master V2 validation,
  and `git diff --check`. Root typecheck and lint report errors in unrelated,
  concurrent progress-dashboard edits under `apps/api`, `apps/web`, and
  `packages/contracts`; these files were not included in the canary evidence.
- Sanitized evidence:
  `vocabflow-dataset/reports/canary-development-apply-verification.md`.
  Generated scanner artifacts and APKG analysis files remain unstaged.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4D final reconciliation V3

- Reverified the development Neon target, 19/19 migration rows through
  `0018_panoramic_spirit`, and zero migration hash mismatches. The scanner and
  importer used read-only repeatable-read snapshots.
- Re-reviewed the pinned scan change: the refreshed candidate evidence adds one
  review event to duplicate Apple #295 (count 1 → 2); the explicit owner choice
  continues to map Apple to #1 and leaves #295 untouched. Repeat scans before
  and after the final planner returned the same current fingerprint.
- Finalized the human-owned V3 artifact at the architecture's stable path,
  `vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json`, pinned to
  the current target, source contracts, release hashes, and scan fingerprints.
  Added release-root resolution and development snapshot evidence checks to
  the importer so the release artifacts and package-level owner file work
  together and stale evidence blocks planning.
- Final DRY_RUN: 3 mapped updates, 5 vocabulary creates, 1 Learning Set create,
  1 algorithm membership insert; `reconciliationComplete=true`, `canApply=true`,
  0 issues. Plan fingerprint:
  `4ffcb88ef47c9bdaf3d3dc7d36092fa55e7dec0d4a01417aac97c53d90d8718b`.
  Mapped runtime enrichment is preserved. #295/#849 are unchanged; no history,
  learner assignment, runtime ID, or run-ledger mutation is planned.
- Validation: 8 focused files / 93 tests, typecheck, lint, base and release
  dataset validation passed. No DB writes, migration execution, or import APPLY.
  The APKG analysis files remain untouched and excluded.
- Full plan and preservation audit:
  `vocabflow-dataset/reports/canary-development-final-apply-plan.md`.

## 2026-10-04 — Due-first study queue without a New-mode hard gate

- Removed the backend gate in `apps/api/src/review-queue.ts` that suppressed
  NEW items once at least 20 items were due. Available NEW items now accompany
  DUE items up to the remaining `daily_new_word_limit`; DUE remains first in
  mixed ordering. Daily Goal columns are not read for queue admission.
- Study Setup already derives mode availability from the scoped queue, so the
  API fix enables New beside due reviews without changing the UI or default
  mode. Review remains DUE-only; New remains NEW-only. Saved-all retains every
  item and its NEW/DUE/VOLUNTARY classification, ordered DUE → NEW → VOLUNTARY.
- Updated US-08/US-14, product, architecture and flow documentation. Regression
  tests cover due/new availability, hard quota, mode filters, mixed priority,
  Saved VOLUNTARY and existing Study/Continue Learning/Daily Goal behavior.
- Validation passed: 9 focused test files / 131 tests, `pnpm typecheck`,
  `pnpm build`, ESLint on changed TypeScript feature files, and
  `git diff --check`. No migration, database mutation, or deployment occurred.
  Dataset V2 changes remain separate and unstaged.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4C migration 0018 preflight

- Used the clean local worktree at `c15dff2`; the primary local `TXH` checkout
  remained at `d9012af` with its two unrelated APKG analysis files untouched.
- The protected Neon development target and post-connect identity matched the
  configured project, branch, database, and `vocabflow_migration` role. Ledger,
  schema, and aggregate learner count were read in one `REPEATABLE READ, READ
  ONLY` transaction. No personal learner fields were selected.
- Development already has all 19 migrations through `0018_panoramic_spirit`.
  Every ledger digest matches canonical source SQL; the 0018 ledger row is the
  accepted CRLF serialization of the same source. Its current-worktree Drizzle
  hash is `eec77c49abbad9a2ea0a69fead9409e0b817978fd3ff3df95b09a55575b114ed`.
- Both daily goal columns and their defaults, NOT NULL properties, and 1–100
  checks match the application schema. The migration is additive and does not
  touch Master V2 runtime tables. The aggregate learner profile count was 8.
- Pre-apply decision: `0018` is already applied, with no pending migrations or
  schema/ledger drift. Do not apply it again. Accordingly, the exact-pending
  preflight gate and `PHASE_2E4C_READY` are NO. Database writes, migration
  execution, and import APPLY by this phase were none. Canary 2.1.0 validated
  offline with zero errors or warnings. Details and test results are in
  `vocabflow-dataset/reports/canary-development-migration-0018-preflight.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4B migration hash audit

- Confirmed Drizzle ORM 0.45.2 hashes each complete migration file as UTF-8
  text from the checked-out working tree. It preserves line endings, a terminal
  newline, and a UTF-8 BOM. Git SQL blobs did not change from `7e76daa` to
  `b5b22e3`.
- The 2E.3 six mismatches and 2E.4A seventeen mismatches were caused by
  worktree CRLF conversion. All 18 ledger hashes match one exact Drizzle hash
  representation of the same source (LF for 17, CRLF for 0004); no historical
  SQL-content mismatch remains. The verifier now checks LF, CRLF, and bare-CR
  serializations while preserving every other content byte.
- Re-ran the verified development scan in REPEATABLE READ / READ ONLY mode:
  18/18 migration rows present, 0015–0017 verified, catalog discovery and
  runtime snapshot ready. The comparable Phase 2E.3 fingerprint is unchanged
  at `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`;
  the 2E.4A full-snapshot planner hash uses a different snapshot shape.
- The current `TXH` head also contains migration 0018 from a later daily-goals
  commit; the development ledger remains at 18 rows. This audit used the
  isolated `b5b22e3` 18-migration baseline and did not execute 0018. A new scan
  against the current TXH chain must stop before catalog discovery until that
  migration is handled through the trusted process.
- Canary release content and release hash remain unchanged. App Import files
  from 2E.4A remain unchanged; only analysis-only candidate/proposal/review
  evidence was regenerated.
  Apple #1/#295 remain unresolved, the human-owned reconciliation is untouched,
  and `canApply=false`.
- Added regression coverage for line-ending equivalence, SQL edits, appended
  content, terminal newline, and BOM. Focused migration/scanner checks,
  typecheck, lint, and diff check pass. No migration, DB write, import APPLY,
  runtime mutation, production connection, or Cloudinary operation occurred.
  See `vocabflow-dataset/reports/canary-development-migration-hash-root-cause.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4A runtime preservation policy

- Implemented `app-import-v3`, `runtime-vocabulary-projection-v2`, and
  `runtime-reconciliation-v3` without changing the dataset schema, Master
  identity/revisions, or 2.1.0 release hash. App Import distinguishes the raw
  `masterProjectionFingerprint` from the planner's effective runtime
  fingerprint.
- Added field ownership and `SET` / `PRESERVE` / explicit `CLEAR` operations.
  Null/absent IPA, image, audio, legacy topic, and level preserve existing
  runtime enrichment on mapped rows. CREATE_NEW starts from the exact Master
  projection. `clearFields` can clear only nullable fields when Master is null
  or absent. Vietnamese override and image quarantine retain their separate
  explicit policies.
- The plan now shows before, raw Master, operation, after, API-visible
  `effectiveProjection`, and deterministic outcomes. The persisted JCS
  fingerprint describes that effective result; `contentVersion` increments
  once only if that result changes. Added explicit preservation, clear,
  override/quarantine, create, version and replay regressions.
- Regenerated only the derived App Import projections and generated
  reconciliation-template metadata for immutable canary release 2.1.0. Its
  source `dataset.json`, pinned Master records, schema version and release hash
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591` remain
  unchanged.
- Read-only planner previews used development target
  shy-hill-72364426 / br-square-grass-b3af0nte / neondb; snapshot fingerprint
  `fa8941ef8a458b58b6c2b548a50a1db5618221d4115d4d6f6ef914c2931c5d5d`.
  Temporary apple #1 and #295 scenarios both preserve their existing runtime
  enrichment and remain alternatives, not owner decisions. The checked-in
  human reconciliation still returns `canApply=false` and all eight Sense
  decisions remain unresolved.
- A fresh migration read-only check found 18/18 ledger entries but 17 local
  migration hash mismatches, including 0015–0017; it stopped before catalog
  discovery. The planner's code path does not read this ledger when computing
  `canApply`, which does not classify the drift as safe. The prior Phase 2E.3
  field-loss audit remains intact.
- Focused planner, transform and release-builder suites pass: 3 files / 50
  tests. `pnpm typecheck`, `pnpm lint`, and `git diff --check` pass. Local Node
  22.19.0 emits the repository's Node 22.23.2 engine warning. No database
  write, APPLY, migration, owner choice, APKG access or media operation
  occurred. See the preservation preview, policy comparison, and migration
  drift scan in `vocabflow-dataset/reports/`.
## 2026-10-04 — Feature #10 configurable daily learning goals

- Replaced the active single aggregate goal with learner-specific persisted
  targets: 10 new words and 20 review words by default. The existing scheduler
  hard cap remains unchanged; due reviews remain uncapped.
- Activity Summary derives distinct new/review counts from persisted review
  events by household-local review date; overall completion requires both
  targets. Home shows category progress, composite ring and the existing
  persisted streak. Settings API/UI save and reload per learner.
- Added additive migration `0018_panoramic_spirit.sql`; it has not been applied.
  No database mutation or production connection was made.
- Focused validation passed: 11 files / 153 tests. Contracts/API/web project
  typecheck, production build, feature ESLint and `git diff --check` passed.
- Repository-wide `pnpm typecheck` is blocked by 9 missing projection fields
  in the separately changing Dataset V2 planner. That file and Dataset V2
  reports remain untouched and unstaged; commit/push were withheld because the
  full validation gate did not pass.
- Migration remains unapplied; no database mutation, production access or
  deployment occurred.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.3 final owner reconciliation preparation

- Re-ran the development reconciliation scanner through provider/target
  verification and a REPEATABLE READ / READ ONLY snapshot. Target remains
  shy-hill-72364426 / br-square-grass-b3af0nte / neondb; fingerprint
  464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b matches
  Phase 2E.2. The approved 2.1.0 release identity and scope are unchanged.
- Apple #1 and #295 remain the same fruit Sense with separate history and
  memberships; the overlapping learner count is 1. Apple choice remains
  unresolved. Added an owner decision sheet and a field-by-field projection
  loss audit, including nulling existing IPA/media/legacy-topic fields under
  UPDATE_TO_MASTER.
- Added a contract-shaped, analysis-only owner-ready file with current release
  metadata, snapshot fingerprint and runtime candidate IDs. All decisions stay
  unresolved and the planner rejects it at the ownership gate. The root
  human-owned reconciliation remains unchanged and is still for 2.0.0.
- A temporary planner simulation accepted the seven non-Apple proposals and
  left Apple unresolved: no non-Apple structural issues were found. The current
  planner returns canApply=false until the owner completes reconciliation.
- Reconfirmed 18/18 migration rows, exact 0015–0017 hashes, and six historical
  hash mismatches. The planner does not enforce historical ledger hash
  equality; this remains a separate integrity concern, not a safety finding.
- Focused Dataset V2 suites pass 91/91; typecheck and repository ESLint pass.
  Local Node 22.19.0 emits the repository's Node 22.23.2 engine warning.
  No database mutation, import APPLY, migration, history merge, ID allocation,
  Cloudinary operation, APKG use, or API/UI change occurred.
- Evidence: vocabflow-dataset/reports/canary-development-final-reconciliation-readiness.md,
  canary-development-final-owner-decision-sheet.md, and
  canary-development-projection-loss-audit.md.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.2 owner reconciliation review

- Re-verified the approved 2.1.0 release against the development Neon target and
  refreshed the snapshot in REPEATABLE READ / READ ONLY transactions. The
  targeted apple audit found both rows reachable through current catalog/topic
  flows, distinct Learning Set memberships, and one learner with progress on
  both IDs (`DUPLICATE_LEARNER_HISTORY`). No learner identifiers were selected.
- Added the analysis-only owner proposal and detailed review report. Apple
  options A/B/C remain unranked; the other seven Sense proposals and
  Technology Starter CREATE_NEW proposal remain `ownerDecision=UNRESOLVED`.
  The human-owned reconciliation file and all runtime/API data remain
  unchanged.
- Reconfirmed six historical migration hash mismatches with all 18 rows present
  and 0015–0017 matching. The planner does not check this ledger when computing
  `canApply`; the drift remains a separate unresolved integrity concern, not
  classified as harmless.
- No database mutation, import APPLY, migration, history merge, mapping change,
  ID allocation, Cloudinary operation, or Study UI/API change occurred. Focused
  scanner/proposal/planner tests: 26 passing. Master validator, TypeScript,
  repository ESLint, and `git diff --check` pass; validator reports 0 errors,
  0 warnings, and one informational DRAFT issue.

## 2026-10-03 — Continue Learning Home card (US-47)

- Audit: the previous Home card previewed `reviewQueue.queue[0]` and linked to
  unscoped Study Setup. Study queue/index/mode are in-memory React state only;
  there is no runtime persisted incomplete session or exact-resume endpoint.
- Added one authenticated, read-only learner summary API. It selects a
  partially learned active assigned Learning Set, eligible Topic, or Saved
  scope using that scope's own enabled vocabulary and learner statuses. Topic
  membership now intersects enabled Topic words with active-set vocabulary,
  matching Study Setup's actual scope. Latest `review_events.reviewed_at` ranks
  candidates heuristically; source collection is not persisted. Deterministic
  Set → Topic → Saved/sort-order/ID ordering breaks ties and missing timestamps.
- Home changes are isolated to the existing Continue card and its styling. Its
  CTA preserves Topic/Set/all-saved scope in Study Setup; no mode or exact
  session is fabricated. When there is no candidate or the summary fails, the
  card keeps the queue fallback and has a local retry. Home requests no
  vocabulary catalog for this block.
- Focused regressions pass: 9 files / 92 tests. `pnpm typecheck`, `pnpm build`,
  ESLint on changed Home/API/contracts TypeScript, and `git diff --check` pass.
  Build has existing dynamic-import and bundle-size warnings; local Node is
  22.19.0 versus pin 22.23.2.
- Dataset V2 and other unrelated changes in the shared workspace were left
  untouched and will remain unstaged. No database mutation, merge, or
  deployment.

### 2026-10-03 — Continue Learning Topic-domain correction

- Confirmed Study Setup obtains the learner's default review queue (active
  Learning Set membership), then intersects queue vocabulary IDs with Topic
  membership. The former Continue Learning query only checked that a Topic had
  one active-set word, then counted every enabled Topic word (for example,
  3/23 instead of 3/5).
- Topic candidate members now use enabled Topic vocabulary ∩ enabled active-set
  vocabulary. Learner status is aggregated only over that intersection, so
  outside-set progress cannot create or distort a Topic candidate.
- Latest review events are pre-aggregated once per learner vocabulary and then
  joined to collection members; the existing learner/vocabulary/reviewed-at
  index is used, with no migration. This time is still only a heuristic because
  events do not store collection provenance. Home now says “Hoạt động gần
  nhất”; exact session/source resume remains unsupported.
- Focused Home, Topic/progress, Learning Set, Study Setup/queue and Continue API
  tests pass: 9 files / 95 tests. `pnpm typecheck`, `pnpm build`, feature
  ESLint, and `git diff --check` pass. No DB mutation or deployment.
- Dataset V2 changes in the shared working tree were preserved and not staged.

## 2026-10-03 — Saved Vocabulary all-saved study scope (US-46)

- Root cause: the Saved Words CTA entered the ordinary saved queue, which
  correctly returned only NEW and genuinely DUE records. Saved LEARNING or
  MASTERED records with future review dates were therefore excluded, leaving
  Study Setup empty for a saved collection containing only those states.
- Added an explicit `saved=1&content=all` Study Setup intent backed by a
  learner-authorized saved collection query. All enabled saved words are
  candidates; NEW and DUE keep their real classifications and not-due existing
  progress is VOLUNTARY practice. Normal New/Review/Mixed semantics and the
  canonical revision-checked review scheduler remain intact. Study and Summary
  Continue preserve the all-saved intent, and selection is capped/deduplicated.
- Focused Saved Words, Study Setup, queue API, review API, study queue, Study
  Session, and Summary tests pass: 6 files / 97 tests. `pnpm typecheck`,
  `pnpm build`, feature ESLint, and `git diff --check` pass. Build reports the
  repository's existing dynamic-import and bundle-size warnings; local Node is
  22.19.0 versus the 22.23.2 pin.
- No learner database was queried or mutated. Commit/push results will be
  recorded after completion.

## 2026-10-03 — Master Vocabulary V2 canary editorial correction

- Created Sense revision 2 for apple — fruit, record — noun/music recording,
  and reservation — booking. Stable Sense and corrected child IDs are retained;
  revision 1 files remain unchanged. The DRAFT manifest pins the new JCS hashes,
  and the App Import preview, review package, approval template, release plan,
  and reconciliation candidates were regenerated offline.
- The five other canary Senses were verified unchanged. All owner decisions are
  still `PENDING`; the human-owned runtime reconciliation file is unchanged.
- Master validator: 0 errors, 0 warnings, 1 informational DRAFT issue;
  validator tests pass 30/30. Transform tests pass 23/23 in isolation;
  canary preparation/release-builder tests pass 2/2. Eleven Phase 2D.1 bridge
  tests pass with the known stale migration-index assertion skipped. TypeScript
  and ESLint pass. The broader focused run reported 63 passing tests, one stale
  migration-index assertion (expects 0016 while this branch now includes 0017),
  and a transform timeout under concurrent load; the isolated transform rerun
  passed. No runtime, database, Neon, migration, media, reconciliation
  decision, or Study UI change was made.

## 2026-10-02 — Saved Vocabulary (US-46)

- Owner explicitly started Feature #8. Audit found no prior persistence, API,
  or favorite state; learner ownership is the existing progress boundary.
- Implemented a new learner-to-vocabulary relation, additive migration 0017,
  authenticated list/save/unsave endpoints, a server-enforced saved queue
  scope, Saved Words route, and bookmark controls on Catalog and Detail.
- Search/level/topic state is URL-backed. The saved queue applies membership
  in SQL before existing New/Due limits; Review writes and progress semantics
  remain unchanged. No browser storage or Dataset V2 content is used.
- Focused Saved Words, API, queue, Catalog, Detail, Study Setup, Summary and
  application-schema tests pass (9 files / 104 tests). `pnpm typecheck`,
  feature ESLint, `pnpm build`, and `git diff --check` pass. Local Node is
  22.19.0 while the repo pins 22.23.2; build completes with existing dynamic-
  import and bundle-size warnings.
- Migration validation is offline. No live database operation, Dataset V2
  change, or production deployment was performed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2A validator

- Added `scripts/validate-master-vocabulary-v2.ts` and
  `pnpm validate:master-vocab-v2`. The validator uses the manifest as the only
  release boundary, validates pinned documents with Draft 2020-12 schemas, then
  checks typed references, scoped uniqueness, taxonomy graphs, learning sets,
  media, Relations, Provenance, JCS record hashes, and the release hash.
- Added synthetic approved graph fixtures generated in temp directories,
  Phase 1 schema fixture assertions, machine report output, and the stable issue
  catalog at `docs/architecture/master-vocabulary-v2-validation-contract.md`.
  The checked-in `dataset.json` remains an empty DRAFT; no real vocabulary,
  media bytes, or pilot data were added.
- Focused validator tests: 21 passing at the last run; targeted script typecheck
  and final checks are in progress. Full application tests were not run. Runtime/UI, database,
  Neon, importer, and Cloudinary paths were not changed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 1 schema package

- Patched the V2 data dictionary, identity/versioning policy, and taxonomy
  contract. Dataset releases now pin exact Lexeme, Sense, Classification,
  Learning Set, taxonomy, relation, media-version, and Provenance artifacts;
  `releaseHash` uses the `sha256-canonical-json-v1` contract. Pronunciation
  ownership is XOR, classification values are dimension-typed, and semantic
  child state advances its owning Lexeme/Sense revision as specified.
- Added the Draft 2020-12 schema package under `vocabflow-dataset/` and
  synthetic valid/invalid schema fixtures. The initial `dataset.json` is an
  empty `DRAFT` manifest; no vocabulary pilot or runtime/database/media change
  was made. Cross-file graph, identity, revision-history, and byte checks were
  documented for Phase 2A. All 8 schemas pass Draft 2020-12 meta-
  schema checks and all 18 fixture expectations match under `jsonschema`.
- No matching active user story covers this architecture/schema-only work;
  unrelated US-43 remains untouched. Application tests and database/media
  operations were not run.

## 2026-10-02 — Vocabulary Detail (US-43)

- Owner explicitly reprioritized the read-only Vocabulary Detail page while
  US-42 remains open. Added `/vocabulary/:vocabularyId` on the shared AppShell,
  using the existing active-learner vocabulary endpoint, image/audio fields,
  pronunciation hook and `/study` route. List rows now link to detail.
- Missing Vietnamese definition/example translations, POS, synonyms/antonyms,
  per-word review counts, last-studied date, mastery percentage, and save state
  are not present in the current model; the page uses neutral empty states and
  disables unsupported save behavior.
- Focused route/detail tests pass (27 tests). Full lint, typecheck, test suite
  (65 files / 753 tests), build and `git diff --check` pass. Build used local
  Node 22.19.0 while the project pins 22.23.2; the package manager emitted its
  engine warning. Owner review remains pending. No backend/database command,
  commit, push, or deployment work.

## 2026-10-01 — Production Release #8 artifact scan policy

- Split PostgreSQL URI counts by artifact boundary. Client/static URIs remain a
  hard failure; Vercel function URI-shaped examples are counted for diagnostics
  only; matches outside public/function roots fail closed.
- Added exact-value scans for the project's known secret environment variables
  across every artifact file. Secret assignments, provider/token patterns,
  local environment files, public source maps and out-of-root database URIs
  remain blocking. Diagnostics contain counts only.
- The production deploy step provides its release DB/provider secret values to
  the verifier, and the Vercel CLI subprocess receives a sanitized environment.
  Focused tests (54), lint, typecheck, full tests (64 files / 748 tests), build,
  and `git diff --check` pass. The static client artifact scan reports zero
  value matches. One slow source-control diagnostic test's timeout was raised
  after it timed out under full-suite load but passed by itself.
- No DB/migration command, deployment, commit or push was performed. Local Node
  is 22.19.0 against the repository's 22.23.2 pin.

## 2026-10-01 — Production Release #7 Vercel API boundary fix

- Moved the Vercel entrypoint tests and their TypeScript project from root
  `/api` to `tests/api`; root TypeScript references still typecheck the tests.
  Root `/api` now contains only `handler.ts`, `package.json` and its production
  `tsconfig.json`.
- Added a recursive production-build guard rejecting `.test` and `.spec`
  TypeScript entrypoints under `/api`. Credential and source-map scanners were
  not relaxed.
- Focused boundary/API tests pass (20); `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (64 files / 734 tests), `pnpm build`, and `git diff --check`
  pass. The static client artifact scan reports `value_hits=0`.
  `vercel build --prod` was skipped because the local Node is 22.19.0 (required
  22.23.2) and the release wrapper requires a clean source tree; the requested
  changes remain uncommitted. No production DB operation, deployment, commit
  or push occurred.

## 2026-10-01 — Protected Production Release automation (US-42)

- Added `.github/workflows/production-release.yml`, triggered only after Core
  CI completes successfully for a same-repository `main` push. It checks out
  `workflow_run.head_sha`, verifies the checkout, runs read-only production DB
  preflight and migration plan, applies guarded forward-only migrations, then
  repeats read-only DB verification and requires zero pending migrations
  before calling `pnpm deploy:production` for the same SHA. Steps are
  sequential and serialized; migration/verification failure prevents deployment.
- Added the `ci-production-release` execution context and production
  authorization bound to the GitHub event payload's Core CI name, conclusion,
  push event, main branch, repository and exact SHA. Generic database URL and
  mutation paths reject this context; `ci-test` remains test-only.
- Production secrets are step-scoped. Workflow also generates ignored
  `.vercel/project.json` ephemerally for the existing safe Vercel project guard.
  Trusted DB Integration was not changed; bootstrap, catalog import and US-41
  curation are outside this workflow.
- Local validation and owner review are pending. GitHub Environment
  `production` still needs required reviewers, a `main` branch rule, and the
  listed secrets/variables. No production DB connection/mutation, deploy,
  commit or push was performed.

## 2026-10-01 — Vietnamese catalog metadata audit

- Added forward migration `0014_vietnamese_catalog_metadata` for catalog
  display strings: five compatibility sets, eleven US-41 sets, 17 topics and
  four achievement descriptions. Statements update only names/descriptions by
  stable slug or achievement code; IDs, slugs, source classifications,
  ordering, enabled/grade values, relationships and learning history remain
  untouched.
- Updated the US-41 curation source and manifest metadata to keep future
  curation applications from restoring English set labels. Owner-selected
  vocabulary, topics, grades and set memberships are unchanged. API and
  learning behavior are unchanged.
- Updated API, web and browser-test fixtures to use Vietnamese catalog display
  metadata while retaining English vocabulary and raw source-topic examples.
- Validation: focused catalog/migration/API/web tests pass (10 files / 72
  tests); `drizzle-kit check` passes; final `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (62 files / 683 tests), focused learning-set E2E (3/3),
  `pnpm build` and `git diff --check` pass. The production-build test that
  exceeded its 5-second limit once during concurrent checks passes by itself;
  the full suite also passes without competing checks. Updated the focused E2E
  auth mock and stale Vietnamese accessible-name locator. Local Node is
  22.19.0 versus the pinned 22.23.2.
  No database connection or migration execution, deployment, commit or push
  has been performed.

## 2026-09-30 — Shared authenticated application shell

- Replaced the Home-owned sidebar with one nested shared app shell for the
  authenticated Home, Study, Vocabulary, Topics, Learning Sets, Progress,
  Learners and learner Settings routes. Desktop keeps a sticky 248px sidebar;
  tablet uses the compact horizontal nav; mobile uses a 44px menu button and
  48px navigation targets. Login/Register and the existing foundation route
  remain outside this shell.
- Home retains its own greeting, active-learner switcher and approved dashboard
  content. The existing Home → `/learners` return intent and direct Learners
  behavior are unchanged. The pre-existing Continue Learning CSS refinement is
  preserved.
- Added App routing tests for shared-shell persistence, active parent paths,
  direct Learners, mobile navigation, auth isolation and no return loop.
- `pnpm lint`, `pnpm typecheck`, focused routing/Home tests (32), full tests
  (61 files / 677 tests), `pnpm build`, and `git diff --check` pass. Local Node
  is 22.19.0 versus the pinned 22.23.2. No backend/database/auth/scheduler
  changes, deployment, commit or push were performed.
- No active user story covered this explicitly requested layout refactor; no
  new feature story or product/architecture decision was introduced.

## 2026-09-28 — Guarded production vocabulary catalog import

- Added explicit production target parsing for `vocab:import-catalog` while
  preserving the existing no-argument / `--apply` development and test CLI.
  Production uses `authorizeProductionRelease` and
  `resolveProductionConnection({ purpose: "runtime" })`, selecting only
  `PRODUCTION_DATABASE_URL` and requiring Neon project/branch proof.
- Production dry-run checks the canonical protected identity and catalog plan
  inside a PostgreSQL `READ ONLY` transaction. Apply requires `--apply`, exact
  production and branch confirmations, repeats release authorization, and
  validates identity inside the write transaction before catalog operations.
  Existing import safety rules are unchanged; no owner/migration credential,
  extra grant, or execution-context guard bypass was added.
- Focused tests pass (29 tests); full `pnpm test` passes (59 files / 623
  tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
  pass. Local Node is 22.19.0 versus pinned 22.23.2. No real DB connection,
  mutation, deploy, push, or commit was performed. `.env.example`,
  `docs/decisions.md`, and existing unrelated workspace edits remain
  untouched.

## 2026-09-28 — Least-privilege production preflight

- Split `db:production-preflight` into two provider-verified read-only
  connections. `vocabflow_runtime` now independently validates connectivity
  and canonical protected identity; `vocabflow_migration` independently
  validates the same identity and reads `drizzle.__drizzle_migrations`.
- Both use read-only transactions. The bootstrap grants, protected metadata
  model, runtime-to-migration membership rules, and Vercel/database settings
  are unchanged. Added a mock regression test that fails with the reported
  schema-permission error if runtime accesses the Drizzle ledger.
- Focused tests pass (31 tests); full `pnpm test` passes (58 files / 615
  tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
  pass. Local Node is 22.19.0 versus pinned 22.23.2. No database connection,
  mutation, deploy, or push was performed. Existing unrelated edits,
  including `docs/decisions.md`, remain untouched and unstaged.

## 2026-09-28 — Guarded fresh-production database bootstrap

- Added `pnpm db:production-bootstrap` as a read-only-by-default, explicit
  production-only path for the confirmed fresh Neon branch. Apply requires
  `--apply`, `--confirm-target production`, and the exact configured branch;
  Neon API project/branch proof and the explicit `neondb_owner` operator URL
  are checked before database work. Catalog checks allow only fresh state or
  a complete bootstrap-only state; partial/unexpected roles, schemas,
  relations, types, identity or app tables stop safely.
- Reused `bootstrapProtectedMetadata` and its existing role/least-privilege
  checks, with parameterized bootstrap-principal membership handling. Added
  distinct operator-only bootstrap and identity-provision URL resolution;
  Vercel runtime lookup remains `DATABASE_URL` only. Production identity is
  provisioned and verified with the canonical identity role immediately after
  bootstrap. The runbook distinguishes this one-time flow from later releases.
- Regression coverage confirms the fresh owner-only bootstrap path does not
  require `vocabflow_identity_bootstrap`, wrong/development targets fail
  closed, the canonical application roles remain unchanged, and the one-shot
  owner is not granted runtime membership. The runbook now labels the legacy
  bootstrap role as development/test-only.
- Focused tests pass (58 tests); `pnpm lint`, `pnpm typecheck`, full `pnpm
  test` (57 files / 613 tests), `pnpm build`, and `git diff --check` pass.
  The workstation uses Node 22.19.0 while the repo pins 22.23.2. No database
  command/connection, database mutation, Vercel deploy or main push was run.

## 2026-09-28 — Vercel ESM directory import fix

- The latest Preview error proved Node reached the ESM Function but rejected
  the handler's `../apps/api/src` directory import. `apps/api/src/index.ts` is
  the existing app entrypoint; no API package export/public alias exists.
- Replaced app and runtime-binding value/type specifiers with explicit `.js`
  paths, matching Vercel's observed emitted `apps/api/src/index.js`. Added a
  native Node ESM test against a transpiled handler fixture and preserved
  actual-app health, auth, nested-path and JSON-404 tests; added explicit
  sign-in dispatch coverage through the existing Better Auth seam.
- Focused module/routing/auth tests pass (28 tests); full suite passes (54
  files / 582 tests), as do lint, typecheck, Vite build and `git diff --check`.
  Local Node is 22.19.0 rather than the pinned 22.23.2. No Vercel CLI/deploy or
  DB access was used.
- Next safe action: commit and push this module-resolution fix to `TXH` only.
  Owner may then create one Preview retry to verify emitted runtime behavior.

## 2026-09-28 — Vercel Preview Function ESM compatibility fix

- Confirmed from the live Preview stack and repository package scopes that the
  `/api/handler` boundary was emitted/executed as CommonJS while loading the
  ESM-scoped `apps/api/src/index.js`. The root package has no `type` marker and
  `api/` had no local `package.json`; `apps/api/` is already ESM.
- Added only an `api/package.json` ESM boundary and a subprocess test that
  starts Node with `tsx`, imports the actual handler under that package scope,
  and calls `/api/health`. Source checks reject `require()` in the handler.
- Existing tests continue to cover Better Auth route dispatch, nested path
  restoration, API JSON 404, and the Vercel SPA rewrite exclusion. Business
  logic, DB/auth behavior, environment markers, production guards and routing
  configuration are unchanged.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (54 files / 579 tests),
  `pnpm build`, and `git diff --check` pass. The local runtime is Node 22.19.0
  versus the pinned 22.23.2. No Vercel CLI/deploy or DB connection was used.
- Next safe action: commit/push this fix to `TXH` only, then owner may create
  exactly one Preview deployment and verify `/api/health` plus auth smoke.

## 2026-09-27 — Vercel Preview API route integration fix

- The live Preview returned Vercel `NOT_FOUND` for nested Better Auth requests.
  Source inspection confirmed the Hono `POST /api/auth/*` mount and other API
  routes already existed, but the Vite deployment had no explicit Vercel route
  from nested `/api/*` paths to a statically named Function.
- Replaced the implicit catch-all filename with `api/handler.ts` and an explicit
  Vercel route/path transform that dispatches `/api` and `/api/*` to the same
  Hono app while restoring the original URL path. The SPA rewrite still excludes
  API paths. Better Auth logic, auth configuration, DB schema/data and release
  source guard are unchanged.
- Focused routing/auth/artifact tests pass. Full local validation and exactly
  one Preview deployment are pending.

## 2026-09-27 — V1.0 hosting pivot: Cloudflare to Vercel

- Replaced the V1.0 deployment layer with a root Vercel project: Vite static
  output plus a thin Hono Web `fetch` Function at `/api/*`; the existing Hono
  routes/business logic remain the single implementation. Added exact-origin
  Preview auth using the current `VERCEL_URL`, with development-only markers
  and no wildcard Vercel trust.
- Kept production DB identity/preflight, migration and US-41 guards, reset
  block, shared-CI isolation, forward-only SQL policy, release SHA/toolchain
  gates and artifact secret/source-map scanning. Removed the Worker/Wrangler
  deployment implementation; BATCH 0 Cloudflare docs remain explicitly
  historical.
- Updated the current architecture, V1.0 release runbook, decision log and
  handoff/changelog for Vercel. Vercel project IDs and production origin remain
  owner inputs; Preview auth/API smoke stays restricted until a separate
  owner-approved non-production database is provisioned.
- No Vercel link/pull/build/deploy, Cloudflare deploy, production Neon
  connection, migration or curation apply was executed. Existing local edits in
  `.env.example` and the prior DEC-018 link correction are preserved and are
  not part of this pivot commit.
- Local verification: frozen-lockfile install, 10 focused files / 106 tests,
  full suite 54 files / 544 tests, lint, typecheck, Vite build, 26 Playwright
  E2E tests, and `git diff --check` pass. Artifact checks found no secret
  values, DB/provider credentials, local env files or source maps; one
  `BETTER_AUTH_SECRET` key-name string is from Better Auth's browser package,
  not a configured value.
- The guarded `build:production` was not executed: this workstation is Node
  22.19.0 rather than pinned 22.23.2 and the worktree contains preserved
  pre-existing edits. Remote verification for implementation SHA
  `5fd0515c4d3ae2cd4cc0a15ec407aca13d2f04ad`: Core CI run `36300948885`
  PASS; Trusted DB run `36300948861` PASS on trusted `shared-ci`. Vercel
  project/org IDs and canonical production origin remain owner inputs.

## 2026-09-27 — Historical Cloudflare production release preparation (superseded)

- Added a guarded production migration dry-run/apply path with an explicit
  canonical target, exact target/branch confirmations, provider proof, a
  read-only migration plan, and forward-only/destructive-SQL checks. Production
  curation now has explicit read-only and confirmed apply paths using separate
  production runtime credentials. `db:reset` and reset-capable Trusted DB
  tooling refuse production markers.
- Production Better Auth requires matching production markers and an
  owner-supplied canonical HTTPS origin; secure cookies and a single trusted
  origin are enforced. The Worker build artifact receives production markers,
  SPA and `/api/*` routing, an owner-supplied custom route, and
  `workers.dev=false` only after the guarded production build finalizes it.
- Added pinned Wrangler CLI, clean-source/toolchain/SHA gates, local environment
  file exclusion, a client/artifact secret scan and digest check, safe CLI error
  codes, production preflight/build/deploy commands, and the
  [v1.0.0 release runbook](releases/v1.0.0-release-runbook.md).
- Repository config defines production Neon target branch
  `br-rough-silence-b3gbqjcb`; no Neon API or database connection was used to
  verify it during this task. Production hostname/zone remain
  `OWNER_INPUT_REQUIRED`. Worker production secrets and operator migration/
  runtime credentials must be provisioned separately; no credential values
  are documented.
- Local verification: full suite 52 files / 527 tests, lint, typecheck,
  manifest-only curation dry-run (213 selected rows, no DB access), build
  (dev-vars removed; client secret-value scan and source-map scan pass),
  Playwright E2E (26), Wrangler 4.129.0 dry-run (no upload), and final diff
  check. Local Node is 22.19.0; the guarded production build intentionally
  requires 22.23.2 and a completely clean release checkout.
- Production migration/apply, curation apply, Worker/web deploy, account/user
  creation, and `v1.0.0` tagging were not performed. Core CI and Trusted DB
  must be green on the exact pushed SHA before any production preflight or
  mutation.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  is part of this task or its commit.

## 2026-09-25 — US-41 explicit development-target safety path

- Added an explicit `--target development` read-only DB snapshot/planning path.
  It verifies the canonical configured Neon identity, checks selected source
  identities, words and Vietnamese meanings, and runs the DB plan in a
  PostgreSQL `READ ONLY` transaction. It prints non-secret target metadata and
  reports zero DB mutations.
- Local development apply now requires `--target development --apply`,
  `--confirm-target development`, and `--confirm-branch` equal to the
  configured development branch. Production remains blocked; Trusted DB keeps
  its existing `ci-test`/`test` → `shared-ci` path. Generic bypass flags do not
  exist.
- Local validation passes: focused safety tests (38), full suite (494), lint,
  typecheck, build, 26 Playwright E2E tests and `git diff --check`.
- No development dry run, development apply or production DB operation was run.
  The owner commands remain separate manual actions after the required remote
  gates; this implementation does not invoke them.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  is part of this implementation.

## 2026-09-24 — US-41 final content remediation

- Kept all 213 curated imported rows. Added eight source-bound image
  quarantines and five exact owner-approved Vietnamese meaning overrides to
  the tracked curation manifest; no raw source dataset values or unrelated
  meanings were changed, and no LLM/API classification or translation was used.
- Added durable `image_quarantined` and `vietnamese_override` columns. Runtime
  vocabulary, topic, set, queue and review-answer reads use canonical meanings
  and hide quarantined images. Catalog re-import refreshes raw source columns
  without clearing owner metadata. Migration: `0012_us41_owner_content_overrides`.
- Final local dataset dry run PASS: 213 selected (100/73/40 by grade), 202
  media PASS, 3 missing-image WARN, 8 quarantined-image WARN, 0 BLOCK and 11
  effective image-ineligible rows. Duplicate identities/words, expected-word
  mismatches and missing meanings are all 0. `DATABASE_MUTATIONS=0` and
  `REAL_NEON_APPLY=NOT_RUN`.
- Regenerated ignored owner-review CSVs, summary and original-image contact
  sheet. The review has 15 findings, zero activation blockers, eight
  `SAFE_WITH_LIMITATION` quarantines with `IMAGE_TO_WORD=NO`, and six corrected
  meanings assessed OK; cousin and love remain unchanged.
- Local validation PASS: 17 focused files / 175 tests; full suite 47 files /
  476 tests; lint, typecheck, build, 26 E2E and `git diff --check`. Core CI
  run #93 (`35964700073`) and Trusted DB Integration run #88, attempt 3
  (`35964700003`), passed on implementation SHA
  `0cc10dd9ded1564a860d605b196939a25dce1d1d`.
- Trusted DB used only the configured CI test target. Earlier attempt 1 stopped
  at the runtime protected-identity check; attempt 2 passed US-41, then hit the
  existing US-07 same-review-ID replay-race assertion. Attempt 3 passed the
  full suite. No real Neon apply was run.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  belongs in the remediation commit.

## 2026-09-23 — US-41 owner-refined final curation

- Applied only the owner's explicit 11 source-record replacements and seven
  no-replacement deferrals to the tracked allow-list. V1 now contains 213 rows:
  Grade 1 = 100, Grade 2 = 73, Grade 3 = 40. Grade 2 Feelings has 13 rows;
  nothing was added to pad it back to 20.
- Narrowed image availability policy: a missing image is a visible WARN and
  does not block activation. Usable audio, required word/meaning, source
  identity and the existing known-unusable/corrupt media block remain intact.
  `IMAGE_TO_WORD` still requires a usable image; exercise fallback, scheduling,
  progress and rewards are unchanged.
- Local real-dataset dry run PASS: 1,994 source rows; 213 curated; media 210
  PASS / 3 WARN / 0 BLOCK (`anger`, `sadness`, `joy`); 30 starter-topic
  mappings; `DB_MUTATIONS=0`. Real Neon apply was not run.
- Focused curation, importer and exercise-generator tests PASS (34 tests).
  Full local validation PASS: lint, typecheck, 457 unit/component tests, build,
  and 26 E2E tests. Commit `760c0c04d7498a3b6e27b15ee47e4cee0c305aed` was
  pushed to `TXH` and fast-forwarded to `main`; Core CI run `35840195766` and
  Trusted DB Integration run `35840195673` both PASS on that exact SHA.
- Owner review CSV and summary are regenerated under ignored
  `local-data/generated/`; manifest and story record `love`'s source meaning
  and romantic English definition without rewriting it, and note that
  `despair` → `fear` is a set-level replacement, not a synonym claim.
- Follow-up Trusted DB runs `35841107601` and `35842150875` failed at US-41
  apply with PostgreSQL `XX000: cache lookup failed for type 590564`. The
  trusted test reset drops/recreates application enums; `scripts/db-core.ts`
  now disables prepared statements to prevent stale enum OIDs, with a focused
  regression test. Core CI `35843693211` and Trusted DB `35843693265` both PASS
  on fix commit `2ef6166dcc9c3475773f2385626001f2d897cc43`.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes. Do not
  stage or commit either file; `docs/decisions.md` remains untouched.
- `REAL_NEON_APPLY=NOT_RUN`; Trusted DB used only the configured CI test target.

## 2026-09-22 — US-41 content curation and activation

- Audited the 1,994 imported source records and generated media report:
  1,979 image references, 1,993 audio references, 15 missing images, 1
  missing audio and no invalid media records.
- Added tracked `VOCABULARY_CURATION_V1` manifest with 220 explicitly reviewed
  rows: 100 Grade 1, 80 Grade 2 and 40 Grade 3, in 11 ordered learning sets.
  Every row records source identity, expected word, canonical topics, set
  membership and activation decision.
- Added deterministic dry-run-first curation tooling. It maps all 30 starter
  rows to canonical topics, leaves unreviewed imported rows disabled, and has a
  trusted-CI-only transactional `--apply` path that preserves starter
  identity, learner assignments, progress, reviews, XP and achievements.
- Local dry run PASS: `MANIFEST_RECORDS=220`, `LEARNING_SET_COUNT=11`,
  `STARTER_TOPIC_MAPPINGS=30`, `MEDIA_GATE=PASS checked=220`,
  `DB_MUTATIONS=0`.
- Current phase/batch: Phase 2 / US-41 implemented and ready for owner check;
  US-42 has not started. Core CI #87 and Trusted DB Integration #81 both passed
  on commit `4d76cfa946ccae94ec3e5deb690f0365ba579363`; only owner review of
  the manifest and dry-run report remains.

## 2026-09-21 — US-39 + US-40 XP, level and achievements

- Audit found no reward persistence, catalog or UI. Canonical review idempotency, household authorization, household-local daily activity, streak derivation and session-local reinforcement were reused.
- Added immutable `xp_events`, idempotently seeded achievements and immutable learner unlock records. Scheduled review and daily-goal rewards are safely coupled to the canonical review write; no XP backfill occurs.
- Exercise correct-bonus remains deferred because the current client-generated exercise flow has no trusted server-side exercise context. `.env.example`, `docs/decisions.md` and local data remain untouched.

## 2026-09-21 — US-39/US-40 fix-forward

- Trusted DB fixture teardown now explicitly removes learner-owned `learner_achievements` and `xp_events` before deleting learner profiles; the reference achievement catalog remains intact.
- The optional review exercise submission is server-verified against canonical vocabulary data. Correct scheduled exercises earn one `EXERCISE_CORRECT` ledger event worth 5 XP; mismatched client recall results are rejected, reinforcement remains reward-free, and raw typed input remains transient.

## 2026-09-21 — US-37 + US-38 weekly/daily and topic progress

- Audit classified US-37 historical aggregation/weekly UI and US-38 learner topic aggregation/UI as missing; canonical review history, household-local dates, sparse progress, topics, active learning-set eligibility and authorization were reusable.
- Added read-only range and topic APIs plus the Progress dashboard sections. `newLearned` is derived from immutable review-event `previous_status = NEW`, so reset-created lifecycles are represented without a schema change or fabricated backfill.
- Topic scope is current enabled vocabulary reachable through active assigned enabled sets. Imported mappings remain 1,994 and the 30 starter rows remain unmapped; no topic was guessed. `docs/decisions.md`, `.env.example` and local datasets remain untouched.

- Project: VocabFlow Family MVP
- Current phase/batch: Family MVP US-01..US-25 complete; Phase 2 / US-26 through US-41 implemented and ready for owner check
- Current Git branch: `TXH`
- Current implementation baseline: commit `d5791c7` (`feat: add image and typing exercises`) on `TXH`, with protected local changes preserved
- US-24: `ACCEPTED / CLOSED`.
- US-25: `ACCEPTED / CLOSED` after recovery Core CI and Trusted DB passed.
- US-26 + US-27: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-28 + US-29: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-30: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-31 + US-32: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-33 + US-34: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-22: `IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK DEFERRED`.
- Catalog state after real import: 30 starter rows + 1,994 imported rows =
  2,024 total vocabulary rows. The owner-refined US-41 manifest selects 213
  imported rows; the remaining imported rows stay disabled.
- Imported catalog identity is `(source_dataset, source_record_id)` and is
  separate from canonical DB ID. Grade is NULL for unreviewed rows and explicit
  only where the tracked curation manifest assigns it.
- Real US-25 evidence: migration/import PASS; starter, learner_progress, and
  review_events modifications were 0; post-import idempotency dry run was
  INSERT_COUNT=0, UPDATE_COUNT=0, SKIP_COUNT=1994, DATABASE_MUTATIONS=0,
  STATUS=PASS.
- Core CI on the implementation baseline: `FAIL`, run `35250926587`, at Unit
  and component tests because a starter-enrichment test required gitignored
  `local-data/`.
- Trusted DB on the implementation baseline: `PASS`, run `35250926632`.
- Recovery fix in commit `60b384d`: deterministic tracked test fixtures replace
  the CI test's dependency on local generated/source data. Core CI run
  `35434440380` and Trusted DB run `35434440386` both passed.
- Protected: never modify, stage, restore, reset, clean, or commit
  `docs/decisions.md`. Preserve `.env.example` and `local-data.zip` changes.
- Final US-30 evidence: local validation passed; Core CI run `35443781349` and
  Trusted DB run `35443781278` both passed. US-39/40 fix-forward baseline is
  `b057f70897859004de9659b1780c9f098915ac0c`; US-41 candidate
  `4d76cfa946ccae94ec3e5deb690f0365ba579363` passed same-commit Core CI #87
  and Trusted DB #81 and is awaiting owner review. US-22's manual owner check
  remains deferred.
- Documents new agents must read first: `docs/README.md`,
  `docs/product/product-spec.md`, `docs/architecture/technical-architecture.md`,
  `docs/design/design-system.md`, `docs/design/feature-ui-spec.md`,
  `docs/flow/user-flow.md`, `docs/roadmap.md`, the relevant story, and this file.

## 2026-09-19 — US-28 + US-29 implementation checkpoint

- Gap audit found no learning-set schema, normalized learner assignment,
  assignment UI or set-aware queue eligibility. Existing vocabulary IDs,
  household ownership and sparse progress primitives were retained.
- Added five deterministic curated sets, ordered memberships and the
  backward-compatible `starter-vocabulary` set containing all 30 enabled
  starter rows. Imported rows remain disabled and are not inferred into sets.
- Added household-authorized assignment APIs/UI. Existing learners receive the
  default assignment in migration and new learners receive it in the canonical
  learner-create path.
- Queue eligibility is now `enabled vocabulary ∩ union(active assigned sets)`;
  `EXISTS` keeps repeated membership deduplicated. Unassign preserves progress
  and review events; reassignment reuses progress.
- Focused tests, full tests, lint, typecheck, build, E2E, diff checks and the
  post-push Trusted DB gate pass. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-20 — US-33 + US-34 exercise implementation checkpoint

- Gap audit found the existing DTO media fields, Flashcard media safety,
  canonical review API and queue admission reusable; image interaction,
  typing interaction, strict answer normalization and exercise media fallback
  were missing.
- Added `IMAGE_TO_WORD` and `TYPE_WORD` to the same controlled exercise layer.
  Image mode requires a usable image plus four safe word choices and uses a
  neutral alt label. Typing uses deterministic Vietnamese-first cues, NFKC /
  trim / case-insensitive exact comparison and preserves meaningful spaces.
- Broken image or optional cue media uses one-way fallback without a review
  mutation. Canonical review, retry, reinforcement, summary, queue eligibility,
  daily New limits and learner isolation remain unchanged. No schema change;
  `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — US-26 + US-27 implementation checkpoint

- Gap audit found no existing canonical level model/filter or topic catalog,
  normalized mapping, API or browse UI.
- Added nullable `vocabulary_level` with six explicit values. The source
  dataset has no grade metadata, so all 2,024 catalog rows remain NULL and no
  inference or bulk assignment was performed.
- Added 17 source-backed canonical topics and normalized
  `vocabulary_topics` mappings. The migration maps 1,994 imported rows by
  exact source topic; 30 starter rows remain unmapped because their source
  topic is NULL. Imported rows remain disabled.
- Added optional level filters, topic APIs, topic browse UI, migration/schema
  assertions, focused API/UI tests and E2E coverage. Scheduler, progress and
  review-event paths were not changed semantically.
- Implementation commit: `d612e1a`.
- Local status: IMPLEMENTED / READY FOR OWNER CHECK. Final lint, typecheck,
  full tests, build, E2E, diff and Trusted DB gates are still being run.
- `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — Repository recovery checkpoint

- Confirmed documentation drift: canonical story index stopped at US-11 and
  current handoff/roadmap statements incorrectly said US-12 had not started.
- Confirmed Core CI root cause from GitHub run `35250926587`: the test
  `starter vocabulary enrichment safety > loads the real source...` failed
  with `ENRICHMENT_SOURCE_UNREADABLE` because `local-data/` is gitignored.
- The fix keeps real-data loading available to the manual enrichment tool and
  makes automated tests deterministic with in-repository fixtures.

## 2026-09-16 — starter enrichment tooling checkpoint

- Added a dry-run and guarded transactional apply tool for the owner-approved
  starter enrichment subset `1, 2, 7, 8, 9, 11, 18, 19`.
- The tool validates exact DB/source identity and explicit media-map
  resolution, preserves enabled state and learner history, and fails safe on
  unexpected database content or partial updates.
- The real database apply command was not run; US-12 remains unstarted and
  `docs/decisions.md` remains protected.

## 2026-09-16 — US-11 implementation checkpoint

- Confirmed the accepted reusable Flashcard remains answer-free before flip and
  now explicitly covers the post-flip IPA, meaning, optional content and
  image-accessibility contract.
- Study continues to render Remembered/Forgotten only after flip and retains
  the accepted US-09 review, reinforcement and summary flow.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-11
  is ready for owner check and US-12 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-16 — US-10 implementation checkpoint

- Extracted the Study presentation and media behavior into the reusable
  `Flashcard` component at `apps/web/src/features/study/flashcard.tsx`.
- The component keeps answer-bearing content out of the pre-flip DOM while
  preserving the accepted click/Space flip, media fallback and Study review
  controls.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-10
  is ready for owner check and US-11 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-15 — US-08 authorization harness expectation fix-forward

### Diagnosis and fix

- The failed candidate `9dad72447457b08327de2606e218d34c37af1912` remains
  `FAILED / RETIRED` after Trusted DB run `34950169177` failed in
  `us08-authorization-cases`.
- Diagnosis confirmed a harness-only expectation defect: the authorization
  test treated `allowed.queue.length !== 1` as an empty queue even though the
  migrated database contains 30 enabled global vocabulary rows and the
  production NEW selection is ordered by ID and capped at 10.
- `scripts/test-review-queue-db.ts` now independently derives the eligible
  global NEW prefix from migration-role state, compares the runtime response
  without sorting or normalizing the actual list, and logs expected/actual
  counts and vocabulary IDs. Positive and negative learner authorization
  evidence remains intact.

### Scope and gate status

- Product semantics, schema, migrations, workflow/orchestration and US-07
  behavior are unchanged. The old `42601` fixture INSERT fix is preserved.
- Local validation is complete and passing. No new immutable candidate was
  created, no external Trusted DB was rerun, and the failed candidate was not
  amended or reused. The next gate is narrow authorization-harness technical
  review.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-08
  remains `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md`
  remains protected local work.

## 2026-09-15 — US-08 queue-semantics harness fix-forward

### Diagnosis and fix

- Trusted DB run `34954397186` for immutable candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` passed target-SHA validation,
  authorization cases and the prior `42601` fixture path, then failed in
  `us08-queue-semantics` with `US08_DB_QUEUE_COUNTS`.
- Diagnosis confirmed a second harness-only expectation defect: the migrated
  database and earlier authorization fixtures leave enabled global vocabulary
  rows visible to the learner's NEW query. The queue-semantics fixture now
  inserts strict-future progress for pre-existing enabled rows, before adding
  its scenario-specific vocabulary, so only the intended sparse NEW rows are
  eligible.
- The diagnostic now reports expected/actual review date, DUE and NEW IDs,
  counts and complete queue IDs. Production code, schema, migrations,
  workflow/orchestration and US-07 behavior are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` remains `FAILED / RETIRED` and
  is not amended or reused. No external Trusted DB run or new candidate was
  created.
- Local validation is required before the narrow queue-semantics harness
  technical review. US-07 remains `IN PROGRESS / BLOCKED` with its known CAS
  P1 open; US-08 remains `IN PROGRESS / BLOCKED`; US-09 has not started.
- `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 consolidated cap/suppression harness fix-forward

### Diagnosis and fix

- Trusted DB run `34960083041` proved candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` through authorization and the
  queue-semantics isolation stage, then failed at
  `us08-caps-and-suppression` / `US08_DB_DUE_19_COUNTS`.
- Source diagnosis confirmed a systematic harness isolation defect: fresh cap
  learners saw globally enabled baseline and prior-fixture vocabulary as NEW,
  while the cap expectations assumed scenario-only vocabulary. The fix now
  captures enabled vocabulary before each cap fixture, gives only that fresh
  learner strict-future progress, and derives explicit 19/20/21 contracts.
- Cap diagnostics now report expected/actual counts, DUE/NEW IDs, queue IDs,
  review date and suppression state. Product semantics, schema, migrations,
  workflow/orchestration, US-07 and prior live-proven fixes are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` remains `FAILED / RETIRED` and
  will not be amended or reused. No external Trusted DB run or candidate #5
  was created.
- US-07 remains `IN PROGRESS / BLOCKED` with its CAS P1 open; US-08 remains
  `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md` remains
  protected local work.

## 2026-09-15 — US-08 Trusted DB harness fix-forward checkpoint

### Diagnosis and fix

- Trusted DB run `34941415887` reached the exact retired candidate
  `54a029f333dcee7abfa825e9991d8d61797e87e4` and failed with PostgreSQL
  SQLSTATE `42601` during `us08-authorization-cases` / `us08-fixture-auth-a`.
- The root cause was confirmed as a harness-only `vocabularies` fixture INSERT
  arity defect in `scripts/test-review-queue-db.ts`: five target columns were
  supplied with four expressions. The fixture now omits `content_version` from
  the target list so the canonical schema default `1` applies.
- The shared helper covers all US-08 fixture callers. No product behavior,
  schema, migration, workflow, US-07 code or US-07 CAS finding changed.

### Validation and gate status

- Focused US-08/harness/reset/preflight validation: `41/41` tests PASS across
  five files; full local tests: `251/251` PASS; E2E: `11/11` PASS.
- Lint, typecheck, build, Drizzle check, YAML parsing, workflow/preflight
  checks and `git diff --check` PASS. No reliable local PostgreSQL arity
  regression was added; real Trusted DB remains authoritative for SQL shape.
- The failed SHA remains `FAILED / RETIRED`. No new immutable candidate was
  created; future Core CI and scoped Trusted DB rerun remain pending after
  narrow technical review. US-08 remains `IN PROGRESS / BLOCKED`.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-09 has
  not started. `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 owner-override implementation checkpoint

### Discovery and gate override

- The owner explicitly authorized parallel US-08 work while US-07 remains
  `IN PROGRESS / BLOCKED` on the known PostgreSQL CAS P1. This does not mark
  US-07 accepted, close the CAS finding or authorize US-07 Trusted DB work.
- US-08 is the canonical `Review Queue` story for Architecture Step 8. No
  hard implementation blocker was found. Existing authentication, learner
  ownership, vocabulary DTOs and sparse progress are contract-stable
  dependencies; persisted review-flow acceptance remains acceptance-blocked
  by the unresolved US-07 database evidence.

### Implemented scope

- Added the strict review-queue response contract and a read-only
  `GET /api/learners/:learnerId/review-queue` service/route.
- Implemented household authorization, household-local server date, due-first
  ordering, due/new caps, sparse virtual `NEW`, deterministic ordering and
  safe error responses. No browser-to-Neon access, study-session UI,
  schema/migration/reset change or duplicate scheduler/persistence logic was
  added.
- Added focused API/service coverage and the active story at
  `docs/stories/US-08-review-queue.md`.

### Gate status

- US-08 remains `IN PROGRESS`; implementation evidence and local validation
  are pending completion before technical review.
- US-07 remains `IN PROGRESS / BLOCKED`; its diagnostic worktree and
  `docs/decisions.md` remain protected. No US-07 Trusted DB or Core CI run was
  performed.

## 2026-09-15 — US-08 acceptance evidence hardening checkpoint

### Evidence delta

- Implemented the five test-quality areas identified by technical review:
  queue-specific cross-household/disabled/missing authorization, explicit
  future progress exclusion, a UTC/local timezone boundary, ordering with
  19/20/21 due-cap fixtures, and queue-specific unsafe BIGINT revision
  handling. A narrow follow-up review found the due progress insertion order
  needed to be noncanonical as well; that P2-4 fix is now implemented and
  pending technical re-review.
- Added `scripts/test-review-queue-db.ts`, an independent real-PostgreSQL
  suite covering authorization, enabled vocabulary, due predicate and
  ordering, sparse NEW selection, MASTERED rows, caps/suppression, timezone,
  BIGINT revisions, read-only state and cleanup/reset behavior.
- Added an explicit `TRUSTED_DB_SUITE` selector. `full` remains the default
  and preserves the canonical US-07 Trusted DB path; `us08-review-queue` is
  an explicit scoped path and is never selected implicitly.
- Added only the corresponding manual workflow choice and environment
  forwarding. No product semantics, schema, migration, reset policy or
  US-07 diagnostic/CAS code was changed.

### Gate status

- Local evidence validation is being rerun after the hardening delta. Trusted
  DB has not run, so all PostgreSQL-dependent US-08 criteria remain pending.
- Core CI has not run. US-07 remains `IN PROGRESS / BLOCKED` with its known
  CAS P1 open; US-08 remains `IN PROGRESS`; US-09 has not started.
- No commit, push, exact-SHA creation, US-07 modification or owner acceptance
  was performed. `docs/decisions.md` remains protected.

## 2026-09-14 — US-07 implementation checkpoint

### Implemented scope

- Added the approved strict review request/response contracts, additive
  `learning_status`/`review_result` enums, `learner_progress` and
  `review_events` schema, migration `0004_scheduled_review_write`, reset
  ordering and `POST /api/reviews` service/route.
- Added server-authoritative authorization, vocabulary availability checks,
  sparse NEW revision `0 → 1`, deterministic fingerprints, replay/conflict
  handling, CAS writes, race reclassification, household-local dates and
  atomic progress/event persistence.
- Added focused review and schema/reset tests: `20/20` PASS; full repository
  tests are `231/231` PASS, E2E is `11/11` PASS, and lint, typecheck and build
  are PASS. US-07 remains `IN PROGRESS`; technical review, Core CI, Trusted DB
  and owner acceptance are pending.

### Scope guard

- No Review Queue, Study UI, reinforcement, US-08 work, seed change or
  CI/workflow change was added. `docs/decisions.md` remains an unrelated
  protected unstaged local modification.

## 2026-09-14 — US-07 fix-forward 1 checkpoint

### P1 findings resolved

- P1-H: review-event idempotency is now scoped to the server-authorized
  household, including pre-write lookup and post-race reclassification.
- P1-J: validated request UUIDs are canonicalized before fingerprinting,
  persistence comparison and response construction.
- P1-T: scheduler numeric persistence uses BIGINT with explicit safe-integer
  checks, safe database conversion and deterministic revision exhaustion
  handling; the US-06 scheduler remains unchanged.
- Focused US-07 service/API and schema/reset tests are now `27/27` PASS,
  including foreign-ID, UUID and numeric-boundary regressions.

### Gate status

- US-07 remains `IN PROGRESS`.
- Technical re-review is pending. Core CI and Trusted DB Integration remain
  pending; Trusted DB is required for final acceptance.
- No commit, push, Core CI run, Trusted DB run or US-08 work was performed.
- `docs/decisions.md` remains protected unrelated local work.

## 2026-09-14 — US-07 fix-forward 2 checkpoint

### Alignment scope

- Aligned the US-07 story's persistence and concurrency contract with the
  reviewed household-scoped `(household_id, review_id)` idempotency key.
- Documented BIGINT scheduler/revision storage, JavaScript safe-integer bounds,
  checked conversion and deterministic revision exhaustion behavior.
- Updated UUID regression fixtures to contain alphabetic hexadecimal characters,
  making uppercase/lowercase canonicalization coverage non-vacuous.
- Focused tests remain `27/27` PASS; full tests are `238/238` PASS; E2E is
  `11/11` PASS; lint, typecheck, build, Markdown links/anchors and
  `git diff --check` are PASS.

### Gate status

- US-07 remains `IN PROGRESS`; technical re-review is pending.
- Core CI and Trusted DB Integration remain pending; Trusted DB is required for
  final acceptance.
- No implementation redesign, commit, push, Core CI run, Trusted DB run or
  US-08 work was performed. `docs/decisions.md` remains protected local work.

## 2026-09-14 — US-07 contract owner approval

### Approved contract

- Owner approved the canonical response DTO, first materialized revision `1`,
  missing/disabled vocabulary `404 VOCABULARY_NOT_FOUND` behavior (or the
  established equivalent), authorization-before-replay and enabled-learner
  behavior.
- Fingerprint semantics, sparse virtual `NEW`, concurrent first-review
  handling, server-owned dates, immutable events and atomic progress/event
  persistence remain locked as documented in the story.
- US-07 was promoted to `READY FOR IMPLEMENTATION`; final acceptance requires
  Core CI and Trusted DB Integration. US-08 remains `NOT STARTED`.

### Scope guard

- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  an unrelated protected unstaged local modification.

## 2026-09-14 — US-07 story discovery / contract preparation

### Recommendation

- The correct next story is `US-07 — Scheduled Review Write`, aligned to
  Architecture Step 6 (`POST /api/reviews`). It is smaller and safer than
  combining review persistence with Review Queue or Study-session UX.
- Proposed success boundary: `scheduled-review-write-ready`, from the
  accepted `scheduler-domain-ready` boundary plus authenticated parent,
  authorized learner and approved sparse-progress architecture.
- Review Queue remains the later Architecture Step 8 milestone; reinforcement,
  session UX and progress presentation remain separate scope.

### Contract discovery

- The architecture fixes the strict request fields, server-owned scheduler
  computation, sparse virtual `NEW`, `reviewId` fingerprint semantics,
  `expectedRevision`, concurrent first-review race barrier, household-local
  review date, immutable event snapshot and atomic progress/event write.
- US-07 requires an additive application migration for `learning_status`,
  `review_result`, `learner_progress` and `review_events`, plus reset/index/
  privilege verification. Trusted DB Integration is therefore required for
  implementation acceptance.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains an
  unrelated protected unstaged local modification.

### Owner decisions required

- The exact successful response DTO is not specified by the repository; it
  must be approved before shared response contracts or `response_payload` are
  implemented.
- The first materialized revision is not explicitly specified. Recommended
  smallest choice: virtual `0` is consumed and first persisted/resulting
  revision is `1`.
- Confirm `404 NOT_FOUND` for missing/disabled vocabulary; no other critical
  source conflict was found.

US-06 remains `ACCEPTED / CLOSED`. US-07 implementation is now `IN PROGRESS`;
US-08 work has not started.

## 2026-09-13 — US-06 acceptance finalized

### Accepted evidence

- Owner approved US-06 final acceptance after the post-merge audit confirmed
  the exact reviewed implementation revision, no scope drift and no technical
  blocker.
- T06-01 through T06-17 are `PASS`; the success boundary
  `scheduler-domain-ready` is achieved.
- Focused learning-domain tests `51/51` PASS; full tests `218/218` PASS; E2E
  `11/11` PASS; lint, typecheck, build and `git diff --check` PASS.
- Technical re-review PASS. Core CI #32 PASS on reviewed commit
  `cc649d2dca4b233752e08f9c565ad384ea2f6816`; Core CI #33 PASS on merged main
  commit `b838f107a69830234202caded33f9b7ad0040c9e`.
- Trusted DB Integration #30 PASS is extra evidence only and was not required
  for this pure-domain story.

### Process and handoff

- PR #3 was merged before explicit Owner Acceptance. The audit verified the
  exact reviewed revision, green CI and no scope drift. Classification:
  `PROCESS-ORDER DEVIATION ONLY`; no revert was required.
- No API, persistence, review queue, session reinforcement, UI, schema,
  migration, dependency, CI/workflow or US-07 work was added by acceptance.
- US-07 has not started. `docs/decisions.md` remains an unrelated local
  modification and is excluded from acceptance work.

## 2026-09-11 — US-06 story discovery / contract preparation

### Completed

- Read the repository instructions, canonical Product/Architecture/Flow/UI
  sources, accepted US-01 through US-05 stories, progress/changelog records,
  current contracts/tests and the existing `packages/learning-domain` stub.
- Registered `US-06 — Learning Scheduler Domain` in BATCH 4 with status
  `READY FOR CONTRACT REVIEW`.
- Proposed the accepted upstream `first-flashcard-ready` handoff and the
  `scheduler-domain-ready` output boundary.
- Defined the pure scheduler input/output contract, virtual sparse `NEW`, all
  six scheduled transitions, 1/3/7/14/30 intervals, explicit local dates,
  no overdue bonus, typed invalid-input handling and persistence-owned
  revision/`reviewedAt` boundaries.

### Scope and handoff

- US-06 is pure learning-domain work only. `POST /api/reviews`,
  `learner_progress`, `review_events`, revision/idempotency, review queue,
  session reinforcement, UI, schema/migration, API and Trusted DB work remain
  out of scope.
- No application code, learning-domain implementation, schema, migration,
  API, dependency, CI/workflow or Neon operation was performed. No commit or
  push was performed.
- No source conflict was found; the remaining gate is owner review of the
  proposed contract. `docs/decisions.md` remains untouched and unstaged.
- US-07 has not started.

## 2026-09-11 — US-06 contract owner approval

### Approved contract

- Owner approved `US-06 — Learning Scheduler Domain` as a pure-domain story
  and promoted it from `READY FOR CONTRACT REVIEW` to `READY FOR
  IMPLEMENTATION`.
- Virtual `NEW` is an explicit canonical state object; `null` is not a valid
  scheduler state. The approved function receives `currentState`,
  `REMEMBERED`/`FORGOTTEN`, and explicit household-local `today`.
- The approved output is `scheduler-domain-ready`; it contains only canonical
  learning-domain values. Revision, `reviewedAt`, IDs, persistence and
  authorization remain outside the scheduler.
- Owner confirmed deterministic Gregorian calendar arithmetic, no overdue
  bonus, full transition/threshold coverage, typed validation and no UI/E2E
  requirement for this story.

### Handoff

- No learning-domain code, API, schema, migration, dependency, CI/workflow or
  Neon operation was performed. No commit or push was performed.
- The next permitted implementation scope is only the pure scheduler package
  and its exhaustive unit tests. `docs/decisions.md` remains untouched and
  unstaged.
- US-07 has not started.

## 2026-09-12 — US-06 implementation

### Completed

- Implemented `scheduleReview` in `packages/learning-domain` with explicit
  scheduler types, virtual `NEW`, state invariants, typed validation and
  synchronous deterministic transitions.
- Implemented Gregorian calendar validation/addition without system clock,
  timezone, UTC-instant, browser, storage or framework dependencies.
- Added 28 focused table-driven tests covering all transition classes,
  thresholds, date boundaries, overdue behavior, invalid input and
  non-mutation/determinism.
- Updated US-06 evidence: T06-01 through T06-16 PASS and T06-17 PASS locally;
  Core CI remains pending technical review.

### Validation and handoff

- `pnpm test` PASS (195/195), `pnpm lint` PASS, `pnpm typecheck` PASS,
  `pnpm build` PASS, `pnpm test:e2e` PASS (11/11), and `git diff --check` PASS.
- Trusted DB Integration is `NOT REQUIRED`; no API, DB/schema/migration,
  dependency, CI/workflow, UI or persistence change was made.
- US-06 remains `IN PROGRESS`; no acceptance finalization or US-07 work was
  started. `docs/decisions.md` remains untouched and unstaged.

## 2026-09-13 — US-06 fix-forward

### Completed

- Corrected the reviewed safe-integer overflow defect in scheduler counter
  increments. `totalCorrect`, `totalIncorrect` and incremented
  `consecutiveCorrect` now fail deterministically before an unsafe output can
  be returned.
- Added focused validation and transition coverage for overflow, fractional,
  NaN, Infinity and out-of-range numeric values; leap-year century rules;
  interval rollovers; large safe mastered counts; and full remembered outputs.
- Focused learning-domain tests now PASS at `51/51`; US-06 remains
  `IN PROGRESS` and no approved scheduler semantics changed.

### Validation and handoff

- No API, database/schema/migration, dependency, CI/workflow, UI, persistence
  or US-07 work was added. Trusted DB remains `NOT REQUIRED`.
- Technical re-review and Core CI remain pending. `docs/decisions.md` remains
  an unrelated unstaged local modification and was not changed.

## 2026-09-11 — US-05 implementation started

### Completed

- Moved US-05 to `IN PROGRESS` and implemented the owner-approved minimal
  learner-context → focused `/study` → first real vocabulary card flow.
- Reused the accepted `GET /api/vocabulary` contract with deterministic
  `vocabulary[0]` selection, keyboard/touch flipping and safe loading, empty,
  error, auth/403 and optional-field states.
- Added focused learner-context, Study UI/client and routing tests. No schema,
  migration, seed, write API, progress, scheduler, CI/workflow or US-06 work
  was added.

### Handoff

- Trusted DB remains inherited from accepted US-04 evidence; no new Trusted DB
  gate is proposed for this web-only story.
- `docs/decisions.md` remains an unrelated unstaged local change and is not
  part of the implementation scope.

### Validation checkpoint

- Focused US-05 tests PASS; full local test suite PASS at 167 tests.
- Lint, typecheck, build and `pnpm test:e2e` PASS (11/11) after the corrected
  Space-key interaction was revalidated.

## 2026-09-11 — US-05 pre-Core-CI manual acceptance checkpoint

### Owner evidence

- Manual owner acceptance PASS for resolved learner handoff through `Bắt đầu
  học`, real PostgreSQL-backed `/study`, first `apple` card from
  `vocabulary[0]`, front/back meaning visibility, pointer/touch and Space flip,
  Space scroll prevention, NULL optional fields, media safety, no fake review
  controls, safe `/api/vocabulary` error/retry, reload redirection and no
  active-learner persistence/guessing.
- Mobile owner verification at `375x812` for learner handoff and Study PASS with
  no horizontal overflow.
- T05-09 and T05-13 are now manual PASS; T05-10 and T05-11 remain accepted by
  automated coverage without fabricated database/content mutations. T05-12 is
  manual PASS.

### Gate and handoff

- T05-01 through T05-17 were locally PASS, subject to final Core CI evidence
  at this checkpoint; final acceptance is recorded below.
- US-05 was still `IN PROGRESS` at this pre-Core-CI checkpoint and was not
  accepted until Core CI passed.
- Trusted DB Integration is `NOT REQUIRED` for this web-only story. No schema,
  migration, seed, privilege, learning write, review write or database side
  effect was added.
- `docs/decisions.md` remains unrelated, unstaged, uncommitted and excluded.
- US-06 remains unstarted.

## 2026-09-11 — US-05 final acceptance

### Accepted evidence

- US-05 First Real Flashcard is `ACCEPTED`; T05-01 through T05-17 are `PASS`.
- Owner manual acceptance PASS for the learner handoff, `/study`, real
  `vocabulary[0]` `apple` card, front/back and flip interactions, NULL/media
  safety, no fake review controls, reload learner recovery, mobile 375x812,
  no horizontal overflow, safe API error and Retry recovery.
- Local evidence: `167/167` tests, E2E `11/11`, lint, typecheck, build and
  `git diff --check` PASS; no review/progress/scheduler/DB writes.
- Core CI #30 SUCCESS on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28 SUCCESS is incidental and is not a required
  US-05 gate. No schema, migration, seed, privilege or DB behavior changed.

### Handoff

- The local Node warning remains `22.19.0` versus pinned `22.23.2`; Core CI
  validated the pinned toolchain.
- `docs/decisions.md` remains preserved in its stash and was not changed by
  this acceptance commit.
- US-06 has not started.

## 2026-09-11 — US-04 contract preparation

### Completed

- Registered US-04 as `Vocabulary Content Seed & Read Foundation` with status
  `READY FOR CONTRACT REVIEW` before owner dataset approval.
- Locked Option A only: shared/global vocabulary schema, owner-approved 20–30
  word seed, validated controlled content migration and authenticated
  deterministic `GET /api/vocabulary`.
- Explicitly kept Learner Home, first flashcard rendering, study, scheduler,
  progress, review queue, review writes and US-05 out of scope.

### Blocker and handoff

- `DATASET_SOURCE=OWNER_APPROVAL_REQUIRED`; no vocabulary words or provenance
  were invented.
- No application code, migration, seed data, dependency, CI or Neon operation
  was performed.
- Next safe action: owner contract review and dataset-source approval. Do not
  move US-04 to `READY FOR IMPLEMENTATION` before that decision.

## 2026-09-11 — US-04 dataset source approved

### Completed

- Owner approved `VocabFlow Starter Vocabulary v1` with
  `DATASET_PROVENANCE=PROJECT_AUTHORED` and `DATASET_STATUS=APPROVED`.
- Locked the exact 30-record enabled set with stable IDs `1` through `30`,
  `contentVersion=1`, and `NULL` optional fields for v1.
- The only allowed claim is “beginner starter vocabulary selected for the
  VocabFlow MVP”; no official CEFR, Oxford, Cambridge, Wiktionary-derived or
  copied dictionary claim is permitted.
- Moved US-04 to `READY FOR IMPLEMENTATION`; no application code, migration,
  actual seed data, dependency, CI or Neon operation was performed.

### Handoff

- The next safe action is US-04 implementation from this approved contract.
- US-05 remains unstarted.

## 2026-09-11 — US-04 implementation started

### Completed

- Moved US-04 to `IN PROGRESS` and implemented the approved
  `vocabflow_app.vocabularies` schema with `content_version >= 1`.
- Added the controlled `0003` migration with the exact 30 Starter v1 records,
  the versioned JSON source artifact and pre-mutation dataset validator.
- Added shared `VocabularyDto`/response/seed contracts and
  `GET /api/vocabulary` with session → household membership authorization,
  enabled-only deterministic `id ASC` reads and strict query-scope rejection.
- Added targeted schema/reset, dataset, service and API tests. No UI, learner
  progress, review, scheduler, CI or US-05 work was added.

### Validation and handoff

- Dataset validation PASS; targeted US-04/schema/reset tests PASS; typecheck
  PASS. Full lint, tests, build and E2E remain to be run.
- Trusted DB Integration remains `PENDING ACCEPTANCE GATE`; no live Neon call
  was made.

## 2026-09-11 — US-04 pre-Trusted-DB acceptance checkpoint

### Completed

- Recorded owner manual acceptance PASS for authenticated `GET /api/vocabulary`:
  `200`, exactly 30 records, IDs `1..30`, first word `apple`, last word
  `new`, all `enabled=true`, all `contentVersion=1`.
- Recorded PASS for exact approved dataset content, all optional fields `NULL`,
  unsupported `householdId`/`learnerId` rejection as `400 INVALID_REQUEST`,
  and unauthenticated access as `401 UNAUTHORIZED`.
- Recorded local `DB_MIGRATE=PASS` plus dataset validation, lint, typecheck,
  tests, build, E2E, migration/schema/reset checks and `git diff --check` PASS.

### Gate and handoff

- US-04 remains `IN PROGRESS`; Trusted DB Integration remains
  `PENDING ACCEPTANCE GATE`.
- `403 HOUSEHOLD_ACCESS_DENIED` is automated-test evidence only; it was not
  manually forced by mutating the local database.
- The local Node runtime warning remains `22.19.0` versus pinned `22.23.2`.
- `docs/decisions.md` remains unrelated, unstaged and excluded; US-05 has not
  started.

## 2026-09-11 — US-04 acceptance finalized

### Accepted evidence

- US-04 Vocabulary Content Seed & Read Foundation is `ACCEPTED`.
- T04-01 through T04-16 are PASS with manual, local, migration/reset and
  Trusted DB evidence recorded in the story.
- Core CI #28 and Trusted DB Integration #26 both SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- US-05 remains unstarted; no next story was automatically started.

## 2026-09-11 — US-05 story discovery / contract preparation

### Recommendation

- Recommended title: `US-05 — First Real Flashcard`.
- Recommended scope: the smallest vertical slice from accepted
  `learner-context-ready` plus `vocabulary-content-ready` to one real,
  deterministic, flippable card.
- Recommended Learner Home decision: use only a minimal study-entry handoff;
  defer full due/new/progress metrics until their read contracts exist.
- Recommended output boundary: `first-flashcard-ready`.

### Contract handoff

- Reuse authenticated `GET /api/vocabulary`; select the first item in its
  deterministic `id ASC` order.
- Handle all Starter v1 optional fields as `NULL` without broken placeholders.
- Do not add schema, migration, dependency, API write, progress, scheduler,
  review or Trusted DB work.
- US-05 is `READY FOR CONTRACT REVIEW`; US-06 remains unstarted.

## 2026-09-11 — US-05 contract owner approval

### Approved boundary

- US-05 remains `First Real Flashcard` and is now `READY FOR IMPLEMENTATION`.
- Frozen input: `learner-context-ready` + `vocabulary-content-ready`.
- Frozen route: `/study`; frozen output: `first-flashcard-ready`.
- The minimal “Bắt đầu học” handoff is approved; full Learner Home metrics are
  deferred until progress/review read contracts exist.
- First selection is `vocabulary[0]` from accepted enabled-only `id ASC` API
  order. Space flips the focused card; no audio playback or review controls are
  added.

### Scope guard

- No schema, migration, dependency, API endpoint, database write, Trusted DB
  gate or US-06 work is authorized by this contract update.
- Implementation has not started.

## 2026-09-08 — Documentation and Agent Pack

### Goal

Create canonical Markdown documentation and a VocabFlow-specific AI-agent
operating contract before BATCH 1 implementation.

### Completed

- Audited the repository tree, package/configuration, apps, packages, Drizzle,
  scripts, workflows and current Git state.
- Converted six active canonical DOCX documents to Markdown.
- Added documentation index, source-baseline map, decisions, changelog,
  roadmap, story templates and US-01 contract.
- Added root `AGENTS.md` with VocabFlow scope, architecture, security, testing,
  documentation and Git rules.

### Decisions

- Family MVP remains the active product baseline; Personal MVP is historical.
- BATCH 0 is accepted and frozen.
- US-01 success boundary is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.

### Files changed

- Canonical Markdown files under `docs/product`, `docs/architecture`,
  `docs/design`, `docs/flow` and `docs/implementation`.
- Documentation governance files under `docs/`.
- Story system under `docs/stories/` and `docs/templates/`.
- Root `AGENTS.md`.

### Verification

- Textual parity check: all source paragraphs and table cells found in their
  Markdown counterpart.
- DOCX sources contain no embedded media or diagrams requiring binary export.
- Markdown link/fence validation: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS (10 files, 73 tests).
- `pnpm build`: PASS.
- `git diff --check`: PASS.
- Packaged DOCX renderer could not run because bundled LibreOffice was not
  available in this environment; no DOCX output was authored.

### Remaining / blockers

- No contract blocker remains; no feature implementation has started.

### Next safe action

- Begin US-01 implementation from `T01-01`; keep learner creation out of scope.

## 2026-09-08 — Finalize documentation governance and US-01 contract

### Goal

Resolve the documentation status gate and finalize the owner-approved US-01
registration boundary before feature implementation.

### Completed

- Aligned `docs/README.md`, `docs/stories/README.md` and `AGENTS.md` on the
  shared story status model.
- Set BATCH 1 and US-01 to `READY FOR IMPLEMENTATION`.
- Accepted success boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- Explicitly kept learner creation and new database schema/migration out of
  US-01.
- Corrected architecture conversion metadata to preserve source status
  `APPROVED FOR IMPLEMENTATION`.

### Verification

- Relative Markdown links and anchors: PASS.
- Vietnamese Unicode scan: PASS.
- No stale active DOCX links; remaining DOCX names are source-baseline/history
  references only.
- `git diff --check`: PASS.
- No application code, database code, migrations, CI or BATCH 0 changed.

### Remaining / blockers

- None for the accepted US-01 contract.
- Documentation/agent pack remains uncommitted by instruction.

### Next safe action

- Continue US-01 with T01-04 Better Auth + household bootstrap integration.

## 2026-09-08 — US-01 Phase 1 Register UI

### Completed

- Moved US-01 to `IN PROGRESS` and implemented T01-01/T01-02/T01-03.
- Added the `/register` focused auth screen, accessible email/password
  validation, password visibility toggle, Enter submit and autocomplete.
- Kept T01-04 (real Better Auth signup and authenticated household bootstrap)
  out of scope for this phase.

### Verification

- Component tests cover route rendering, validation, submit seam, keyboard
  submit, password toggle, autocomplete and error semantics.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- No database, migration, bootstrap, role-model, reset or CI changes.

### Next safe action

- Implement T01-04 Better Auth signup followed by idempotent `POST /api/bootstrap`.

## 2026-09-08 — US-01 Phase 1 checkpoint and contract correction

### Proven dependency

- The repository currently has `/api/auth/*` and Better Auth's four auth tables,
  but no `/api/bootstrap`, `households` or `household_members`; the only
  migration is the auth foundation migration.
- BATCH 0 TE-08 intentionally established Better Auth Foundation only and did
  not implement the Family household domain.

### Contract correction

- T01-04 may add the minimal additive BATCH 1 application migration for
  `vocabflow_app.households` and `vocabflow_app.household_members` using the
  approved Architecture contract.
- This does not reopen BATCH 0: role model, `vocabflow_meta`, target identity,
  bootstrap infrastructure, migration executor and reset architecture remain
  frozen.
- Learner profiles/creation and vocabulary, progress and review tables remain
  out of scope for US-01.

### Checkpoint

- Phase 1 (T01-01/T01-02/T01-03) is completed and checkpointed on branch `TXH`.
- Story status remains `IN PROGRESS`; T01-04 has not started.
- Next safe action: implement T01-04 signup plus household
  persistence/bootstrap.
- Do NOT do next: learner profile/learner UI or unrelated BATCH 0 changes.

## 2026-09-08 — Resolve Better Auth name contract blocker

### Proven blocker

- Better Auth 1.7.3 `signUp.email` requires `name`, `email` and `password`.
- The previous Phase 1 form exposed only email and password, so T01-04 could
  not safely call the pinned API without inventing a parent identity.

### Accepted resolution

- US-01 now explicitly collects `Tên phụ huynh`, `Email` and `Mật khẩu`.
- Name is required, trimmed before the Phase-1 seam, and accepts normal
  Vietnamese/Unicode text. It is the parent display/profile identity; learner
  name and learner creation remain out of scope, and household name remains
  server-owned.
- `US01_BLOCKED_BETTER_AUTH_NAME_CONTRACT` is RESOLVED.

### Checkpoint

- US-01 remains `IN PROGRESS`; T01-04 remains pending.
- No Better Auth signup request, `/api/bootstrap`, household migration or
  learner/domain implementation was started.
- BATCH 0 remains frozen.

### Next safe action

- Implement T01-04 Better Auth signup + household persistence/bootstrap.

## 2026-09-08 — US-01 T01-04 registration integration

### Completed

- Implemented the real Better Auth 1.7.3 signup path with the explicit parent
  `name`, `email` and `password` contract.
- Added the authenticated `POST /api/bootstrap` route and a server-owned,
  atomic/idempotent household resolver. Bootstrap ignores client owner input,
  uses the neutral default name `Gia đình VocabFlow`, and creates the canonical
  `OWNER` membership.
- Added only the additive `vocabflow_app.households` and
  `vocabflow_app.household_members` migration; no learner or learning-domain
  tables were introduced. Reset order is dependency-safe and preserves
  `vocabflow_meta`.
- Added signup/bootstrap loading, safe error, authenticated recovery/retry and
  completed states. Signup success alone is never presented as completed Family
  registration.
- Added API, component and migration/reset tests, including the serialized SQL
  and idempotent bootstrap contract.

### Checkpoint

- Story status: `IN PROGRESS`.
- T01-04 status: `IMPLEMENTED / PENDING ACCEPTANCE`.
- BATCH 0 remains `ACCEPTED` / frozen; no live Neon call was made.
- Acceptance review corrected the stale foundation smoke endpoint from
  `/api/auth/session` to Better Auth 1.7.3's supported
  `/api/auth/get-session`; `pnpm test:e2e` now passes locally. The test accepts
  `200 null` for a configured unauthenticated preview and `503` for secretless
  Core CI.
- Added a route-intercepted Playwright test for the native password-field
  Enter key: exactly one Better Auth signup, one bootstrap and completed state.
- Core CI and Trusted DB Integration statuses for the TXH commit are not
  available from this environment because the private repository cannot be
  queried without GitHub credentials and neither workflow runs on a TXH push.
  Do not mark US-01 accepted until those external gates are reviewed.

### Next safe action

- US-01 ACCEPTANCE TEST / REVIEW.

## 2026-09-08 — US-01 Trusted DB reset blocker

### Proven blocker

- Trusted DB reached the second migration after application reset and failed
  with SQLSTATE `42710`: `vocabflow_app.household_role` already existed.
- The reset removed application tables and migration history but left the enum
  type created by migration `0001_curious_miss_america.sql`.

### Fix scope

- Added `vocabflow_app.household_role` to the explicit application reset policy.
- Reset now drops application tables, then the enum type, then Drizzle history;
  clean-state validation fails early with `APPLICATION_ENUM_TYPES_PRESENT` if a
  type remains.
- Protected `vocabflow_meta`, the `drizzle` schema, roles and BATCH 0
  infrastructure remain untouched. Migration SQL was not made idempotent.

### Checkpoint

- US-01 remains `IN PROGRESS / PENDING ACCEPTANCE`.
- Local validation is required before the acceptance-fix commit; no live Neon
  call is made from this environment.

### Next safe action

- PR → Core CI → merge → Trusted DB Integration rerun. Do not start US-02.

## 2026-09-08 — US-01 acceptance finalized

### Accepted evidence

- US-01 Parent Registration is `ACCEPTED`.
- Core CI and Trusted DB Integration both PASS on merged main commit
  `6806e66`.
- Local lint, typecheck, 13-file/101-test suite, build and 2/2 Playwright E2E
  checks PASS; responsive checks at 375/768/1280px PASS.
- BATCH 0 remains `ACCEPTED / FROZEN`; BATCH 1 remains `IN PROGRESS`.

### Handoff

- There is no active next story.
- Next safe action: Project owner selects/reviews the next User Story.
- Do not automatically start US-02.

## 2026-09-19 — US-30 daily new word limit implementation checkpoint

- Gap audit found the existing Due-first queue, household-local date helper,
  sparse virtual New state, reset semantics, retry idempotency and US-29 set
  filtering already satisfied. Learner daily settings, daily consumption and
  parent controls were missing.
- Added `learner_profiles.daily_new_word_limit`, default 10, bounded to 0–100,
  with authorized GET/PATCH settings APIs and a learner-scoped parent UI.
- Queue allowance counts distinct current progress rows whose
  `first_learned_date` equals the household-local date. Due remains exempt and
  session caps remain independent. Atomic review writes serialize per learner
  and reject stale NEW writes after the allowance is consumed.
- Reset still deletes current progress while preserving review events; reset
  therefore makes the current lifecycle virtual New again without consulting
  all-time history.
- Focused validation is passing locally; full local and post-push Trusted DB
  gates remain pending at this checkpoint. `docs/decisions.md`, `.env.example`
  and `local-data.zip` remain protected.

## 2026-09-20 — US-35 + US-36 daily goal and learning streak

- Gap audit found the existing household-local date helper, persisted
  `review_events.review_date`, review idempotency, reset-history preservation and
  learner authorization reusable. Daily goal setting/status, unique activity
  aggregation, active-day derivation and streak UI/API were missing.
- Added `learner_profiles.daily_learning_goal` with default 10 and range 1–100.
  The existing `dailyNewWordLimit` remains an independent New-admission limit.
- Added learner-scoped `GET /api/learners/:learnerId/activity-summary`, deriving
  daily unique vocabulary and current/longest streak from persisted review
  history. Reinforcement, duplicate retry, remembered and forgotten reviews are
  handled by distinct vocabulary/date semantics; failed saves are absent.
- Progress now displays daily goal progress and streaks; parent settings can
  update both learner-scoped settings. Reset and learning-set unassignment do
  not erase historical activity. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-19 — US-31 + US-32 exercise implementation checkpoint

- Gap audit found the accepted queue, scheduler, review API, save-before-next,
  retry, reinforcement, summary and pronunciation hook were reusable; exercise
  generation, single-submit feedback, listening eligibility and safe media
  fallback were missing.
- Added a controlled `/study/exercises` route. Meaning and listening exercises
  generate four deterministic safe options from the admitted queue; insufficient
  distractors or broken audio fall back to Flashcard without changing queue
  eligibility or recording a review for media failure.
- Correct/incorrect answers use the existing `POST /api/reviews` path and map
  to `REMEMBERED`/`FORGOTTEN`. No database schema, progress semantics or
  scheduler intervals changed. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-10-02 — US-44 Study Session focus mode

- Reused `/study` and `/study/exercises`, hid the shared shell navigation in
  focus mode, and aligned the session header, progress, question, feedback and
  controls with the VocabFlow design system.
- Kept answers pending in client state until Next, so Undo clears an unsent
  answer without pretending to roll back persisted progress. Confirmed saves,
  retry identity, topic/set restrictions and session-local reinforcement stay
  on the existing queue/review flow.
- Study feature tests pass (85/85), feature ESLint passes, web-project and root
  typechecks pass, the production build passes, and `git diff --check` passes.
- No API/database command or deployment was run. Concurrent Dataset V2 and
  database workflow changes in the shared working tree are outside this Study
  scope and excluded from its commit.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D runtime bridge

- Added additive integer-ID bridge, import-run ledger, Topic/Set mappings,
  managed-membership ownership, and local transaction write guards. Created
  the human-maintained `runtime-reconciliation-v2.json`; transform output does
  not overwrite it.
- Added a pure deterministic planner, Postgres transaction adapter, dry-run
  CLI/report, target identity checks, explicit baseline/override/quarantine
  policies, stale-plan protection, and production release authorization.
- Offline current-pilot report confirms DRAFT / ineligible, 25 unresolved
  Senses, 18 unresolved Topics, 7 unresolved Learning Sets, and zero planned
  vocabulary creates/deletions/learner assignments. Synthetic approved adapter
  coverage allocates a new runtime integer in-transaction and verifies replay
  leaves the vocabulary and mapping unchanged.
- Additive migration `0015_clean_yellowjacket.sql` is generated and statically
  checked but unapplied. No Neon/shared DB or Cloudinary operation occurred.
  Focused checks completed: validator PASS (0 errors/warnings), 82 Phase 2C/2D
  tests passing, root TypeScript and repository ESLint PASS, and Drizzle reports
  no schema drift. `git diff --check` passes. The full test run also reports
  unrelated US-44 Study UI expectation failures (App shell headings and a
  Flashcard audio pause assertion); the focused dataset/transform/schema suite
  passes independently, and no UI files were changed in this task. Local Node
  is 22.19.0; package engine pins 22.23.2. No DB migration/import or Cloudinary
  mutation occurred.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.1

- Confirmed the Phase 2D membership ledger gap: independent Master/runtime FKs
  did not enforce exact identity pairs. Added three candidate unique keys and
  four composite membership foreign keys in Drizzle schema plus additive
  migration `0016_nostalgic_mattie_franklin.sql`; retained migration 0015.
- Added offline schema/migration mismatch tests, write-guard adoption transition
  tests, and deterministic canary package generation. The focused dataset/schema
  suite passes 100/100 tests; Master validation passes with 0 errors and 0
  warnings; root typecheck and ESLint pass. Drizzle regeneration reports no
  further schema changes, and `git diff --check` passes.
- The full repository run with two Vitest workers passes 909/912 tests. Its
  three failures are the existing US-44 Study shell heading/mobile navigation
  expectations in `apps/web/src/App.test.tsx`; the Study UI file remains
  untouched. Local Node is 22.19.0 while `package.json` requires 22.23.2.
- Generated an owner content review package for 8 Senses / 6 Lexemes and a
  subset release plan with 40 exact Provenance pins and the one-item
  `TECHNOLOGY_STARTER` Learning Set. Optional Topic classifications remain
  outside the subset because they are `IN_REVIEW` and the taxonomy snapshot is
  `DRAFT`; CEFR/difficulty/domain/age/school-level pilot data remain outside
  the release without changing provenance rules.
- Generated a separate reconciliation candidates report. No safe staging
  target exists; candidate search was not run, runtime visibility is unknown,
  and all eight Sense decisions remain `UNRESOLVED`. The canonical manifest
  and `runtime-reconciliation-v2.json` remain unchanged.
- Recommended a dedicated isolated staging/canary target in a later explicitly
  authorized step. No database, branch, learner state, review events, or media
  services were mutated.
- Final Phase 2E gates: `BRIDGE_DB_INVARIANTS_READY = YES`,
  `STAGING_TARGET_READY = NO`, `CANARY_CONTENT_REVIEW_READY = YES`,
  `CANARY_RELEASE_READY = NO`, `RUNTIME_RECONCILIATION_READY = NO`,
  `MIGRATION_APPLY_READY = NO`, and
  `PHASE_2E_STAGING_CANARY_READY = NO`.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.2

- Added the explicit pending owner approval artifact, including per-Sense
  learner fields, separate Lexeme/Pronunciation review, optional Learning Set
  and item decisions, and release-level sign-off. Added a deterministic
  release builder which verifies the raw source manifest hash and exact pins,
  writes new immutable entity revisions into an isolated `2.1.0` workspace,
  closes Provenance/media-slot references, validates the release, and runs the
  offline RELEASE transform. No source DRAFT record is changed.
- Added the pure read-only runtime snapshot scanner. Exact matching is only a
  discovery hint; every result stays `UNRESOLVED`. It reports override and
  quarantine semantics, projection differences, history counts, source
  identity fields, Topic/Set collisions, and flags a runtime ID shared by
  multiple polysemous Senses.
- Allowed an approved release with no pinned taxonomy only when it also has no
  pinned Classification. The synthetic builder test confirms eight eligible
  projection rows, null media URLs/Topic/Level, valid release/content hashes,
  and an unresolved reconciliation template. The test workspace is temporary
  and removed; no real canary release was created.
- The real owner template is still `PENDING`; `2.0.0` remains DRAFT. There is
  no dedicated staging branch or staging CLI target, so no target was added,
  no runtime snapshot was read, and no DB or migration command was run. The
  canonical root manifest and human-owned reconciliation file are unchanged.
- Node `v22.23.2`, pnpm `11.17.0`; Master validator PASS (0 errors, 0 warnings,
  1 informational DRAFT issue); focused Dataset V2 suite PASS (7 files,
  95/95 tests); root typecheck and ESLint PASS; Drizzle generation reports no
  schema changes. Final `git diff --check` is recorded with this change.
- A full-repository Vitest run was interrupted after the output identified
  three failures in `apps/web/src/App.test.tsx` and then produced no further
  progress for over two minutes. The displayed failures are the US-44 Study
  shell-heading/mobile-navigation expectations; the Study files were not
  touched. The complete current full-suite count is therefore unknown.
- Readiness gates are recorded in
  [`Phase 2D.2 readiness`](architecture/master-vocabulary-v2-phase-2d2-readiness.md).

## 2026-10-04 — Feature #12 Weak Words / Need Review

- Completed US-49 with a learner-authorized Weak/Learning/Stable read model,
  review-evidence search/filter/pagination, responsive `/weak-words` UI and a
  server-resolved weak Study scope. Classification and due state are separate;
  DUE/VOLUNTARY and Session Summary scope preservation use the existing review
  queue and canonical scheduler.
- Rule: latest 10 valid persisted review events per word in the inclusive
  30-household-local-date window; minimum 2 reviews and exact accuracy below
  60% is Weak. Non-Weak `LEARNING` is Learning; non-Weak `MASTERED` is Stable.
- No schema or migration changes, database mutation, deployment, merge or
  Dataset V2 file changes. Per-word Study target remains deferred.
- Validation PASS: 15 focused regression files / 152 tests plus one focused
  AppShell route test; feature TypeScript/TSX ESLint; `pnpm typecheck`;
  `pnpm build`; `git diff --check`. Local Node is 22.19.0 while the package
  requests 22.23.2; build completed with existing bundler notices.
- Evidence: [US-49](stories/US-49-weak-words-review.md),
  [DEC-024](decisions.md#dec-024--weak-word-classification-and-study-scope).

## 2026-10-03 — Owner-approved Master Vocabulary V2 canary 2.1.0

- Recorded the owner's explicit approval for all eight canary Senses, the six
  required Lexemes, the exact one-item `TECHNOLOGY_STARTER` Learning Set, null
  runtime media URLs, and release 2.1.0. Experimental classifications were not
  approved.
- Built the immutable `APPROVED` release at
  `vocabflow-dataset/releases/canary-v2.1.0`: schema 2.0.1, 8 Senses, 6
  Lexemes, 41 Provenance records, 1 Learning Set/item, 2 planned media assets,
  no media versions, and no classifications/taxonomy. Release hash:
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.
- Master validator PASS (0 errors/warnings); Phase 2C RELEASE transform PASS
  (8 projections, `importEligible=true`). The generated release-scoped
  reconciliation has eight `UNRESOLVED` Sense decisions and remains
  non-human-reviewed/non-importable. Runtime reconciliation and Phase 2E stay
  not ready; no target or runtime snapshot was used.
- Focused Dataset V2, preparation, transform, planner, reconciliation scan,
  and schema suite PASS (7 files, 91/91). TypeScript, ESLint, and
  `git diff --check` PASS. Bridge-hardening has one existing stale migration
  index assertion (expected 16, current journal 17); its other 11 tests pass.
- No database/Neon connection, migration, import APPLY, runtime identity
  decision, ID allocation, learner assignment change, Cloudinary operation, or
  Study UI file change occurred. The release report is
  `vocabflow-dataset/reports/canary-release-2.1.0-report.md`.

## 2026-10-04 — Master Vocabulary Dataset V2 Phase 2F.2

- Materialized 100 pinned candidate decisions in the offline
  `hybrid-100-editorial-draft` workspace: 2 existing Sense reuses, 3 new
  Senses on existing Lexemes, and 95 new Senses on 84 new Lexemes. The 98 new
  Senses each have project-authored English definitions/examples and
  Vietnamese translations; all records remain DRAFT.
- Reviewed five existing-Master collisions, 12 polysemy groups, and ten
  4600-only meanings. Stable UUIDv7 identity registry contains 574 new IDs;
  rerun allocation is zero and the draft package fingerprint is
  `ae0c6877f5f91e7225dcfa28c8fb98daed6ae235302b7e5daa19406c7b9ed152`.
- Source exact-match and eight-token overlap checks pass. No source text or
  media was reused. Source/media rights remain unverified; CEFR stays in
  editorial evidence and no Classification or Provenance records were added.
- Canonical Master, root dataset manifest, and canary release are unchanged.
  The development canary remains verified. No runtime bulk import has begun;
  there were no database writes, migrations, production connections, or media
  operations. Owner/editor review and any promotion decision are next.
- Root Master validator PASS (0 errors, 0 warnings, 1 informational DRAFT
  issue); root typecheck PASS; focused Phase 2F.2 tests PASS (10/10); focused
  ESLint and `git diff --check` PASS. Full repository ESLint reports one error
  in the unrelated, uncommitted `apps/web/src/features/learners/weak-words-page.tsx`
  effect at line 111. The local Node runtime is 22.19.0; the package engine
  requests 22.23.2.
