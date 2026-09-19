# US-27 — Vocabulary Topics

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Batch: Phase 2 — Vocabulary taxonomy
- Dependencies: US-25 Full Vocabulary Catalog
- Sources: Product Specification, Technical Architecture, Feature UI
  Specification, User Flow

## User story

Là phụ huynh, tôi muốn duyệt vocabulary theo các chủ đề canonical để tìm một
nhóm từ dễ hơn, với nhiều chủ đề có thể gắn cho cùng một vocabulary và không
làm thay đổi study/progress flow.

## Scope

- Add enabled canonical `topics` with stable `id`, `slug`, `name`,
  `description` and `sortOrder`.
- Add normalized many-to-many `vocabulary_topics` with composite primary key
  and foreign keys.
- Add authenticated `GET /api/topics` and
  `GET /api/topics/:topicId/vocabulary`.
- Add a topic browse route with loading, error, empty and responsive states.
- Preserve starter/imported vocabulary IDs, source identities, enabled values,
  learner progress and review events.

Out of scope: topic editing UI, arbitrary user-created taxonomies, enabling
imported catalog rows, scheduler/queue changes and US-28.

## Data contract and provenance

The migration creates 17 enabled canonical topics from the imported dataset's
raw `topic` values. Each topic retains the exact raw value in `source_topic`;
the normalized slug is presentation/API identity. Existing imported rows are
mapped by exact `(source_dataset, source_record_id, topic)` source data. Starter
rows have no source topic and remain unmapped.

Topic vocabulary reads return enabled vocabulary in stable `id ASC` order and
do not join or mutate learner progress. Disabled vocabulary is excluded.

## Acceptance evidence

- T27-01: canonical topic catalog and enabled semantics implemented.
- T27-02: normalized M:N mapping, composite key, foreign keys and index
  implemented.
- T27-03: authenticated topic list and topic vocabulary endpoints implemented.
- T27-04: household authorization, invalid ID and unavailable-topic handling
  covered.
- T27-05: topic browse UI covers loading/error/empty/selection states.
- T27-06: source mapping, migration safety, API/UI and E2E tests added.
- Migration `0006_sticky_risque.sql` is forward-only and contains no DROP,
  TRUNCATE or DELETE operation.

## Validation record

Focused tests: `apps/api/src/topics.test.ts`,
`apps/web/src/features/learners/topics-page.test.tsx` and
`e2e/us26-27-vocabulary-taxonomy.spec.ts`.

Owner manual check remains pending; status is therefore READY FOR OWNER CHECK,
not ACCEPTED/CLOSED.
