# US-28 — Learning Sets

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Depends on: US-25 full catalog and US-26/US-27 taxonomy foundations.
- Scope: deterministic, curated learning-set catalog with ordered vocabulary
  membership and authenticated browse/detail APIs and UI.

## Contract

Each enabled set has a stable slug, display name, description, nullable grade,
enabled flag and deterministic sort order. `learning_set_items` uses a
composite `(learning_set_id, vocabulary_id)` key and stores per-set order, so
one vocabulary row may be reused by multiple sets. Detail responses return
only enabled vocabulary in membership order. The canonical learner progress
key remains `(learner_id, vocabulary_id)`.

The forward-only migration seeds five explicit, project-curated sets:
`starter-vocabulary`, `grade-1-starter`, `family-basics`, `school-basics` and
`everyday-words`. The compatibility starter set contains all 30 enabled
starter vocabulary rows. No imported 1,994-row catalog entry is enabled,
classified by inference or silently added to a set.

## Acceptance evidence

- Schema, composite-key, seed and reset assertions are covered by the DB
  application-schema tests.
- Focused service/API tests cover authentication, catalog/detail ordering and
  unavailable-set handling; web tests cover catalog, detail and empty/error
  states.
- The Trusted DB suite verifies the seeded catalog, ordered 30-item default
  membership, duplicate membership protection and unchanged vocabulary,
  progress and review-event baselines.

## Out of scope

Parent authoring/CMS, arbitrary set editing, automatic grade classification,
LLM curation, bulk enabling of imported rows and US-30 recommendation logic.
