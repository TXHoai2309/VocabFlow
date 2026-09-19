# US-26 — Vocabulary Grade Level

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Implementation commit: `d612e1a`
- Batch: Phase 2 — Vocabulary taxonomy
- Dependencies: US-25 Full Vocabulary Catalog
- Sources: Product Specification, Technical Architecture, Feature UI
  Specification, User Flow

## User story

Là phụ huynh, tôi muốn lọc vocabulary theo cấp độ lớp để duyệt nội dung phù
hợp, trong khi các vocabulary chưa có source classification vẫn được giữ ở
trạng thái chưa phân loại.

## Scope

- Add nullable canonical level `GRADE_1` through `GRADE_5` or `GENERAL`.
- Expose optional `level` filtering on `GET /api/vocabulary` and
  `GET /api/learners/:learnerId/vocabulary`.
- Add a Vocabulary List level filter with an explicit all-level option.
- Preserve source identity, enabled state, learner progress and review events.
- Keep scheduler, queue selection and progress semantics unchanged.

Out of scope: inferred/LLM grade assignment, bulk enabling imported rows,
assignment changes, scheduler changes and US-28.

## Data contract

`vocabularies.level` is a nullable PostgreSQL `vocabulary_level` enum. The
allowed values are `GRADE_1`, `GRADE_2`, `GRADE_3`, `GRADE_4`, `GRADE_5` and
`GENERAL`; the migration has no default. The imported dataset contains no
grade-level field, so no row is classified by inference: all 2,024 current
catalog rows remain `NULL`.

## Acceptance evidence

- T26-01: nullable enum and DTO field implemented.
- T26-02: no fabricated default or bulk classification; existing rows remain
  unclassified.
- T26-03: level filtering is optional and preserves enabled/id ordering.
- T26-04: learner authorization and level filtering coexist on the learner
  endpoint.
- T26-05: Vocabulary List exposes all-level and six canonical options.
- T26-06: API, component, schema/migration, full-suite and E2E coverage added.
- Migration `0006_sticky_risque.sql` is additive and contains no DROP,
  TRUNCATE or DELETE operation.

## Validation record

Focused tests: `apps/api/src/vocabulary.test.ts`,
`apps/api/src/learner-vocabulary.test.ts` and
`apps/web/src/features/learners/vocabulary-list-page.test.tsx`.

Owner manual check remains pending; status is therefore READY FOR OWNER CHECK,
not ACCEPTED/CLOSED.

## Known limitations

The current source dataset supplies no grade metadata, so the feature exposes
the model and filters without classifying existing rows. Level assignment and
learning-set selection remain later product work.
