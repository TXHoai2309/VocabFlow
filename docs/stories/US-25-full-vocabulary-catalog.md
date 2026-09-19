# US-25 — Full Vocabulary Catalog

- Status: BLOCKED FOR CLOSEOUT — Core CI recovery gate pending
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `f17521bd41738db6dd5e8f7f72a170ed08c22bf3`
- Dependencies: US-04 content foundation, US-23 media foundation, and US-24 safety baseline.

## User story

As a parent or learner, I want a larger vocabulary catalog so that the system
supports long-term learning beyond the 30-row starter slice.

## In scope

- Extend vocabulary identity with nullable `source_dataset` and
  `source_record_id` plus composite uniqueness.
- Keep canonical numeric DB IDs independent from external source IDs.
- Import the 1,994-row dataset through a default dry-run catalog importer and
  explicit `--apply` mode.
- Preserve starter IDs 1–30, learner progress, and review history.
- Reconcile inserts/updates/skips idempotently, default new rows to
  `enabled=false`, and reuse the existing media manifest/map.

## Out of scope

- US-26 activation/classification policy, automatic production import, media
  re-upload, starter-ID reinterpretation, or normalized-word merging.

## Task mapping

- T25-01: additive schema and identity migration.
- T25-02: source identity and dataset validation.
- T25-03: dry-run/apply importer and reconciliation plan.
- T25-04: starter/progress/review safety invariants.
- T25-05: media resolution and machine-readable report.
- T25-06: focused, migration, full, E2E, and trusted-DB validation.

## Acceptance criteria

- AC-25-01: source identity is `(source_dataset, source_record_id)` and is
  unique without replacing `vocabularies.id`.
- AC-25-02: source records validate before mutation; duplicate normalized words
  are warnings, not merges.
- AC-25-03: default run performs zero database writes; `--apply` is explicit.
- AC-25-04: imported rows receive new DB IDs, start disabled, and re-import is
  idempotent without resetting intentionally enabled rows.
- AC-25-05: starter IDs/words and learner progress/review events are unchanged.

## Authorization and security

The importer is a local operational tool with runtime-target preflight. It must
not infer production authority from a URL and must never auto-apply the real
Neon catalog. Source/media reports must not print credentials.

## Persistence semantics

Legacy/starter rows have nullable source identity. Imported rows use stable
dataset identity and generated canonical DB IDs. `learner_progress.vocabulary_id`
and `review_events.vocabulary_id` continue to reference canonical DB IDs.

## Test and evidence

Migration/import/full tests, lint, typecheck, build, and E2E passed locally.
Real migration/import evidence recorded 30 starter + 1,994 imported rows;
post-import idempotency dry run reported INSERT_COUNT=0, UPDATE_COUNT=0,
SKIP_COUNT=1994, DATABASE_MUTATIONS=0, STATUS=PASS. Starter, progress, and
review-event modifications were zero. Trusted DB on the implementation commit
passed, while the Core CI run on that commit failed because a test depended on
gitignored `local-data/`; the recovery fix is tracked separately.

## Known limitation / closeout gate

US-25 must remain blocked until the new Core CI run for the recovery fix passes.
No US-26 work is started by this story.
