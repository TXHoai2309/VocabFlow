# US-55 — Verified short Vietnamese meanings for V2

- Status: PORTABLE OFFLINE ARTIFACT READY; DEVELOPMENT SYNC PENDING PREFLIGHT
- Owner: Project Owner
- Last updated: 2026-10-18
- Baseline commit: `c5bb54a316162df85eb2dfc2a742a3d63dc47109`

## User Story

As a VocabFlow learner, I want a concise Vietnamese gloss for the exact V2
Sense, with the existing explanation still available, so that I can learn the
meaning without confusing homographs or neighboring senses.

## In Scope

- A hash-pinned Development overlay keyed by vocabulary ID and stable Master
  Sense identity.
- Versioned input/result artifacts with one result for each of 7,311 current
  V2 Senses, including explicit `REVIEW_REQUIRED` and `UNRESOLVED` outcomes.
- Reuse only source evidence attached to the exact Sense. No paid AI calls.
- A shared contract/presentation helper used by Vocabulary, detail, Search,
  Study/Flashcards, Review Queue, topics, saved words, weak words and learning
  sets.
- Idempotent Development-only sync; canonical content, rights, media, SRS and
  learner history remain unchanged.

## Acceptance Criteria

- AC-01: Only a gloss marked `VERIFIED` for the current content hash is shown
  as `Nghĩa tiếng Việt`.
- AC-02: Without such a gloss, the existing Vietnamese content is shown as
  `Giải thích nghĩa`, without duplicating it or borrowing another Sense.
- AC-03: The artifact covers exactly 7,311 unique current Sense identities
  and pins every row to its current content hash.
- AC-04: Neon sync is idempotent and verifies the Development project,
  branch, and database identity before writing.
- AC-05: Canonical content fingerprints, media, rights, progress, review
  events, legacy vocabulary, Production, and publication status are unchanged.

## Blockers and Acceptance Evidence

- Paid AI authoring was explicitly declined by the owner.
- The prior and current read-only Neon preflights returned the provider error
  `Your account or project has exceeded the quota.` No further Neon calls were
  made after the current failure; migration application and Development sync
  remain blocked by quota.
- A local pinned Development dump and frozen runtime artifacts were available
  offline. The exact 7,311-identity fingerprint was verified, and a
  receipt-enriched artifact now contains 5,402 VERIFIED glosses, 397
  REVIEW_REQUIRED rows, and 1,512 UNRESOLVED rows. Exactly 255 new glosses
  were verified from existing independent PASS receipts; the previous 5,147
  VERIFIED rows were left unchanged. All 1,909 pending rows include the
  current definition, explanation, examples, provenance and receipt pins.
- The portable artifact bundle is stored at
  `vocabflow-dataset/artifacts/short-meanings-v2-final-reviewed-v3/`. Its source
  archive SHA-256 is:
  `41258717a13dad47d804ec7cb605738a6ded42a334b2a158bf3fe9cf5679845f`.
- The parent manifest/results are bundled and hash-pinned so replay confirms
  that all prior 5,147 VERIFIED rows remain byte-for-byte unchanged. A
  portable verifier checks the result, queue, evidence, archive, and parent
  hashes without depending on the previous worktree. The original full-source
  verification also passed before packaging: 16 receipt files and 6 source
  file pins were checked.
- Additive migration `0019_light_penance.sql` is prepared but its live ledger
  state could not be rechecked during this run. No Neon writes, Preview
  changes, or Production changes were made. No paid AI was called.
- Receipt enrichment unit tests pass (3/3); focused Vocabulary, Detail,
  Search, Flashcard and API tests pass (96/96); `pnpm typecheck`, `pnpm build`,
  deterministic replay, and artifact readback verification pass. Build
  reports the existing dynamic-import, large-chunk, and Node engine-version
  warnings.

## TXH consolidation — 2026-10-18

- The release/UI code and short-meaning overlay are present on `TXH`. The
  portable artifact defaults are repository-relative; no script points to the
  former `VocabFlow-study-media-ux-20261018` worktree.
- This bundle is offline data, not canonical vocabulary content. It preserves
  current content hashes and independent review status; only the 5,402
  evidenced short glosses are marked VERIFIED.
