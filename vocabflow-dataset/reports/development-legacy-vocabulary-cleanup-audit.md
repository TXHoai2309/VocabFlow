# Phase 2G.3A — Development legacy vocabulary cleanup audit

**Status:** PASS — read-only inventory and offline classification complete.

**Target:** development / neon / shy-hill-72364426 / br-square-grass-b3af0nte / neondb / vocabflow_runtime.

**Transaction:** REPEATABLE READ, READ ONLY. **Database writes:** NONE. **Production:** NOT AUTHORIZED / UNTOUCHED.

## Inventory

- Runtime vocabulary rows: 2126.
- Master-managed: 108; legacy unmapped: 2018; runtime mapping anomalies: 0; orphan mapping rows without a runtime row: 0.
- Legacy rows with learner progress: 75; review events: 75; saved-word references: 0; favorites: NOT_PRESENT; topic/set references: 2018; any references: 2018; zero references: 0.
- Discovered reference columns: 8 across 8 tables: `vocabflow_app.learner_progress`, `vocabflow_app.learner_saved_vocabulary`, `vocabflow_app.learning_set_items`, `vocabflow_app.master_learning_set_memberships`, `vocabflow_app.master_vocabulary_mappings`, `vocabflow_app.master_vocabulary_topic_memberships`, `vocabflow_app.review_events`, `vocabflow_app.vocabulary_topics`. Database catalog is the primary truth; FK discovery and application-column references were cross-checked against Drizzle schema, migrations, API source and scripts.

| Schema.table.column | Constraint / referential action |
|---|---|
| `vocabflow_app.learner_progress.vocabulary_id` | `learner_progress_vocabulary_id_vocabularies_id_fk` (NO ACTION/NO ACTION) |
| `vocabflow_app.learner_saved_vocabulary.vocabulary_id` | `learner_saved_vocabulary_vocabulary_id_vocabularies_id_fk` (NO ACTION/NO ACTION) |
| `vocabflow_app.learning_set_items.vocabulary_id` | `learning_set_items_vocabulary_id_vocabularies_id_fk` (NO ACTION/NO ACTION) |
| `vocabflow_app.master_learning_set_memberships.vocabulary_id` | application-level column |
| `vocabflow_app.master_vocabulary_mappings.vocabulary_id` | `master_vocabulary_mappings_vocabulary_id_vocabularies_id_fk` (NO ACTION/NO ACTION) |
| `vocabflow_app.master_vocabulary_topic_memberships.vocabulary_id` | application-level column |
| `vocabflow_app.review_events.vocabulary_id` | `review_events_vocabulary_id_vocabularies_id_fk` (NO ACTION/NO ACTION) |
| `vocabflow_app.vocabulary_topics.vocabulary_id` | `vocabulary_topics_vocabulary_id_vocabularies_id_fk` (CASCADE/NO ACTION) |

## Cleanup classification (recommendations only)

| Class | Rows |
|---|---:|
| KEEP_MASTER_MANAGED | 108 |
| KEEP_REFERENCED_LEGACY | 2018 |
| LEGACY_MAPPING_REVIEW | 0 |
| LEGACY_DUPLICATE_REVIEW | 0 |
| DISABLE_CANDIDATE | 0 |
| DELETE_SAFE_CANDIDATE | 0 |
| ANOMALY_REVIEW_REQUIRED | 0 |

Candidate discovery checks exact normalized English lemmas as possible identity evidence. Alias and Vietnamese translation matches are labeled related, never same identity. No mapping is created. Owner-rejected collision IDs #1260, #944, #1463, #1482 and #405 are forced to conflict/review when they appear as unmapped candidates.

## Impact simulation

- Hypothetical DELETE_SAFE rows: 0; remaining runtime rows: 2126.
- Mapping references affected: 0; progress: 0; review events: 0; all other discovered references: 0.
- Disable candidates: 0; simulated aggregate references: 0; policy state: AUDIT_ONLY_NO_MUTATION. No row was disabled.

## Preserved checkpoints

- Hybrid-100: VERIFIED; matching import runs 1; mappings 100/100; new rows 97; reused rows 3; versions v1=97, v2=3; problems: none. Snapshot comparison: COMPATIBLE_ON_PINNED_HYBRID_COHORT_AND_KNOWN_HISTORY_TOTALS; full historical scanner fingerprint is not recomputed under the runtime-role-only boundary. The full historical scanner fingerprint was not recomputed because Phase 2G.3A is runtime-role-only.
- Current/known history totals: progress 87 / reference 87; review events 229 / reference 229.
- Historical post-apply snapshot reference: `5ebcadbfd95619e8b6e7a5c8cc4a4fca16600f7e947cda5932d1ff16bf4fc85a`.
- Runtime #11: progress 1, reviews 5. Runtime #284 booking mapping: unchanged.

## Authority

CLEANUP_AUTHORIZED = NO; DELETE_AUTHORIZED = NO; DISABLE_AUTHORIZED = NO; MERGE_AUTHORIZED = NO; MAPPING_WRITES_AUTHORIZED = NO.

No vocabulary was deleted or disabled; mappings and learner rows were not changed. The classification is an owner-review artifact only.

**LEGACY_AUDIT_SNAPSHOT_FINGERPRINT:** `6b3af8b7db4e8262b8a04751de8641a86bf4c5273baf8e07344d9e6687ab4c36`
