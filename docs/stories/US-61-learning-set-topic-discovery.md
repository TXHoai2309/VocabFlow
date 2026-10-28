# US-61 — Find learning sets by grade and reviewed topic

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Owner: Project Owner
- Last updated: 2026-10-21
- Dependency: US-59 reviewed catalog policy and US-60 display preferences.

## Outcome

As a learner of any age, I can find a learning set by its explicit school grade
and approved topic, and follow a topic into study without changing either
filter. School grade, CEFR and topic remain separate dimensions. Sets are
standalone choices; this feature does not require a fixed lesson order.

## Scope

- Add search plus grade/topic filters to the public learning-set catalog. Filters
  intersect and are reflected in the URL; clearing filters preserves useful
  search behavior.
- Return reviewed topic facets only on the explicit `includeTopics=1` request.
  Derive them from the same enabled, dataset-eligible vocabulary and reviewed
  memberships as the set count. Include reviewed ancestors once and avoid
  multiplying set counts.
- Deep-link topic selection from the set catalog to Topics and provide a
  back-link to matching sets that retains grade and canonical topic ID.
- Keep inferred-only labels and pipeline/provenance notices out of learner
  filters and cards. Show an honest empty state when the active data has no
  approved topic or matching grade.
- Preserve the default learning-set response shape for existing clients.

## Boundaries

No topic or grade data is created, approved, imported or activated by this
story. It does not make CEFR imply a school grade, alter assignment order, add a
forced curriculum, or execute migration 0020. The filter can be empty when the
runtime has no reviewed classifications.

## Acceptance

- AC1: Search matches set name, description and reviewed topic names.
- AC2: Grade and topic filters intersect, survive refresh/share through URL
  parameters, and never widen the study scope when the result is empty.
- AC3: Set topic chips come only from enabled dataset rows with approved topic
  membership; parent topics include reviewed descendants once.
- AC4: Topic detail links back with the same grade and canonical topic ID.
- AC5: Default API clients do not receive an additive topic payload unless
  explicitly requested; the enriched catalog does not issue per-set queries.
- AC6: Loading, empty, filtered-empty, keyboard focus and responsive layouts
  remain accessible and use the existing VocabFlow visual system.
- AC7: Catalog and search regressions, typechecks, build and local visual
  inspection are recorded below.

## Implementation and verification

The account list API adds an opt-in topic facet query with the same eligible
dataset and `topicClosure()` policy as the existing catalog. Guest catalog
facets derive from the already cached public learning index through a reverse
set-to-topic mapping. The UI uses deferred text matching and query-state filters
without an additional word-detail fetch. Approved topic search uses the same
eligible vocabulary predicate and reviewed-membership predicate as the other
catalog reads. Approved importer/adoption paths update exact existing
memberships after the reviewed ledger write.

- 63 focused catalog/API/guest/topic tests pass across seven files.
- 39 focused study-flow tests pass across two files; API and web TypeScript
  checks, changed-source ESLint and `pnpm build` pass.
- Local browser inspection of `/learning-sets` and `/learner-settings` confirms
  the filter layout, accurate no-reviewed-topic text and the three display
  choices. Existing catalog Chromium E2E from US-59 passes 2/2 at mobile and
  desktop widths; this story did not add a new browser E2E.
- Local read-only measurement: public learning index is 204,315 UTF-8 JSON
  bytes; API `index_total` was 376.2 ms on the first request and 94.1–95.6 ms
  on two subsequent requests. This is one local development run, not a
  production latency claim; wire compression is not included in the byte count.
- The current local public index contains 4,537 words, 11 sets, zero eligible
  topic facets and zero explicit grade assignments. The page therefore shows
  CEFR/industry sets and truthful empty topic facets; no Grade 1–2 content has
  been seeded.
- No migration was executed, no live database was changed, and no production
  data or deployment was touched. Migration 0020 remains a rollout dependency
  for code paths that read reviewed topic fields.
