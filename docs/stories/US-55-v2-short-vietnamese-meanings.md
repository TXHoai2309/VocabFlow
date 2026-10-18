# US-55 — Verified short Vietnamese meanings for V2

- Status: OFFLINE ARTIFACT COMPLETE; DEVELOPMENT SYNC PENDING QUOTA
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
- The repo-local ignored `.env` contains Development/migration configuration,
  but the single read-only Neon preflight returned the provider error that the
  account or project has exceeded quota. The Vercel Preview env file contains
  a redacted `[SENSITIVE]` placeholder and is not usable as a database URL.
- A local pinned Development dump and frozen runtime artifacts were available
  offline. The exact 7,311-identity fingerprint was verified, and a
  receipt-enriched artifact now contains 5,402 VERIFIED glosses, 397
  REVIEW_REQUIRED rows, and 1,512 UNRESOLVED rows. Exactly 255 new glosses
  were verified from existing independent PASS receipts; the previous 5,147
  VERIFIED rows were left unchanged. All 1,909 pending rows include the
  current definition, explanation, examples, provenance and receipt pins.
- The artifact is at
  `.vocabflow-local/short-meanings-v2-final-reviewed-v3/` and has a tested
  external archive at
  `D:\hoctienganh\offline-artifact-backups\vocabflow-short-meanings-v2-reviewed-20261018.zip`.
  Archive SHA-256:
  `41258717a13dad47d804ec7cb605738a6ded42a334b2a158bf3fe9cf5679845f`.
- The additive migration is prepared but has not been applied. Neon sync and
  Preview remain blocked by quota; no Neon writes or Production changes were
  made. No paid AI was called.
- Receipt enrichment unit tests pass (3/3); focused Vocabulary, Detail,
  Search, Flashcard and API tests pass (96/96); `pnpm typecheck`, `pnpm build`,
  deterministic replay, and artifact readback verification pass. Build
  reports the existing dynamic-import, large-chunk, and Node engine-version
  warnings.
