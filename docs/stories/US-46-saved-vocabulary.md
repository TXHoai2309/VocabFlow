# US-46 — Saved Vocabulary

- Status: `IN PROGRESS` (owner-requested Feature #8, 2026-10-02).
- Owner: Product owner.
- Depends on: US-21 learner progress isolation, US-22 Vocabulary List,
  US-25 Vocabulary Catalog, US-27 Topics, US-28 Learning Sets, US-08 Review
  Queue, US-30 Daily New Limit, and US-43 Vocabulary Detail.
- This story explicitly reprioritizes the earlier UI baseline that deferred
  favorites. It does not change the Master Vocabulary Dataset V2 boundary.

## 1. Sources of truth

- [Product Specification](../product/product-spec.md).
- [Technical Architecture](../architecture/technical-architecture.md).
- [Global Design System](../design/design-system.md).
- [Feature UI Specification](../design/feature-ui-spec.md#71e-saved-vocabulary-us-46).
- [User Flow](../flow/user-flow.md#saved-vocabulary-extension-us-46).
- [DEC-021 Learner-owned saved vocabulary](../decisions.md#dec-021--learner-owned-saved-vocabulary).
- US-08 Review Queue and US-21 Learner Progress Isolation.

## 2. User story

As a parent using an active learner profile, I can save vocabulary from the
Catalog or Word Detail, find and filter that learner's saved words, and start a
study session over the saved collection without confusing saved membership
with New or due Review eligibility.

## 3. In scope

- Add a learner-owned runtime relation between an existing learner and enabled
  runtime vocabulary, with save time and uniqueness by `(learnerId,
  vocabularyId)`.
- Authenticated learner-scoped list, explicit save, and explicit unsave API
  behavior with ownership enforcement and safe errors.
- `/saved`, active learner navigation, URL-backed English/Vietnamese search,
  runtime level/topic filters, no-result and empty states, and Study Setup CTA.
- Optimistic, rollback-capable save controls on Catalog, Detail, and Saved
  Words; audio/image behavior continues using existing shared components.
- Server-enforced saved collection and `scope=saved` Review Queue paths,
  retained through Study, Study Setup, and Session Summary. New, Review, and
  Mixed keep their existing New/Due semantics. An explicit all-saved intent
  includes every enabled saved word, classifying not-due existing progress as
  voluntary practice. Existing daily-New, idempotency, revision, and scheduler
  semantics remain canonical.
- Additive forward-only migration and offline schema/migration validation.

## 4. Out of scope

- Dataset V2 content, schemas, fixtures, validator, or content pipeline.
- Vocabulary snapshots, duplicated text/translations/media, browser storage,
  global account-level saved state, or arbitrary vocabulary IDs in URLs.
- Custom learning sets, vocabulary authoring, active-set assignment changes,
  review/progress resets, scheduler changes, and production DB/deployment work.
- New queue modes or removal of existing daily New limits.

## 5. Acceptance criteria

- AC-01: Saved state is persisted as a learner-vocabulary relation; duplicate
  POST saves are idempotent, DELETE of a missing relation succeeds, and list
  results expose canonical enabled vocabulary plus the real save timestamp.
- AC-02: Every API operation first authorizes the session user through the
  learner's household. Learner A's relation is never returned for learner B.
  Missing/disabled vocabulary cannot be saved.
- AC-03: `/saved` lists only the active learner's saved records and shows a
  dedicated empty state when none exist. Direct entry without an active learner
  returns through learner selection with the exact pathname and query string.
- AC-04: Search trims whitespace and matches English word or Vietnamese
  meaning case-insensitively. Level and topic choices come from actual runtime
  data; search and both filters combine using AND and are represented in the
  URL. Clearing them preserves unrelated query state.
- AC-05: Catalog, Detail and Saved Words bookmark controls reflect the saved
  relation with semantic accessible labels/pressed state. Mutations respond
  optimistically, prevent duplicate in-flight changes, and roll back with a
  safe error on failure. Audio does not trigger detail navigation.
- AC-06: Saved Words displays canonical content, audio, image fallbacks,
  runtime level/topic and actual save date. Successful unsave removes the row
  and updates the count without reload; failure restores the row.
- AC-07: The Study CTA opens Study Setup with `saved=1&content=all`, does not
  start a session immediately, and remains hidden for an empty list. The API
  applies saved membership in SQL and returns every enabled saved word, without
  including non-saved vocabulary. New progress remains NEW, genuinely due
  progress remains DUE, and existing not-due progress is marked VOLUNTARY; it
  is never represented as DUE/Review. The selected 5/10/20/30 session size is
  capped by the available saved collection, with duplicate vocabulary removed.
- AC-08: The normal saved `saved=1` New/Review/Mixed setup availability is
  derived from the saved New/Due queue and retains existing mode semantics.
  Explicit all-saved setup offers the saved collection directly. Study,
  leave/back, and Session Summary Continue preserve the selected saved intent;
  a learner switch reloads the saved queue. Voluntary practice writes still
  use the canonical review API, revision check, and scheduler; New writes still
  observe the existing daily New limit.
- AC-09: Migration 0017 is additive and forward-only, with composite
  uniqueness, learner/vocabulary foreign keys, and a learner/save-time index.
  Application reset ordering is dependency-safe. No Dataset V2 file changes.

## 6. API and persistence contract

- `GET /api/learners/:learnerId/saved-vocabulary` →
  `{ savedVocabulary: [{ vocabulary, savedAt }] }`.
- `POST /api/learners/:learnerId/saved-vocabulary/:vocabularyId` →
  `{ learnerId, vocabularyId, saved: true, savedAt }`.
- `DELETE /api/learners/:learnerId/saved-vocabulary/:vocabularyId` →
  `{ learnerId, vocabularyId, saved: false, savedAt: null }`.
- `GET /api/learners/:learnerId/review-queue?scope=saved` → canonical queue
  DTO restricted by the persisted relation for that same learner.
- `GET /api/learners/:learnerId/review-queue?scope=saved&content=all` → all
  enabled saved vocabulary for explicit collection study. Existing progress is
  classified as `NEW`, genuinely due `DUE`, or not-due `VOLUNTARY`.
- Relationship table: `vocabflow_app.learner_saved_vocabulary`, primary key
  `(learner_id, vocabulary_id)`, `created_at timestamptz NOT NULL DEFAULT now()`.
- No text, level, topic, status or media is duplicated in the relationship.

## 7. Error and concurrency behavior

- No session returns 401; cross-household learner access returns 403; invalid
  IDs and query parameters return 400; absent or disabled vocabulary returns
  404. Responses do not disclose SQL or secret values.
- Save uses a single conflict-safe insert and preserves original `created_at`
  on duplicate saves. Unsave is an idempotent relation delete.
- Client mutation handlers allow at most one in-flight change per vocabulary
  item and restore prior state on transport or response-validation failure.
- Queue scope parsing rejects malformed or conflicting topic/set/saved
  parameters. Existing server queue limits and review write authorization
  remain unchanged.

## 8. Test plan

- API/service: learner authorization, canonical list, enabled-only save,
  idempotency, safe missing unsave, and safe unavailable content.
- Queue: saved membership in New and Due SQL, all-saved collection membership,
  state classification for NEW/DUE/not-due LEARNING/MASTERED, scope parsing and
  route validation, deduplication/capping, and absence of active-set eligibility
  in saved scope.
- UI: Saved page rows/empty/search/filter/no-results/unsave rollback/learner
  switch/direct-route return; Catalog and Detail save/unsave/rollback/navigation;
  Study Setup New/Review/Mixed semantics and all-saved setup for empty, NEW,
  DUE, not-due LEARNING, and not-due MASTERED records; Study and Summary scope
  retention.
- Existing audio and image fallback regressions remain covered.
- Run focused tests, `pnpm typecheck`, `pnpm build`, feature ESLint,
  `git diff --check`, and the offline application schema/migration test. Never
  run production DB or deployment commands for this story.

## 9. Implementation evidence

- 2026-10-03 saved-all correction: focused Saved Words, Study Setup, queue API,
  review API, study queue, Study Session, and Summary tests pass (6 files / 97
  tests). `pnpm typecheck`, `pnpm build`, feature ESLint, and `git diff --check`
  pass. No learner database was queried or mutated. Build reports the existing
  dynamic-import and bundle-size warnings; local Node 22.19.0 is below the
  repository's 22.23.2 pin.
- Migration 0017 and offline schema checks are added; no live DB command has
  run.
- Focused API, saved queue, Saved Words, Catalog, Detail, Study Setup, Study
  Summary, and application-schema tests pass: 9 files / 104 tests.
- `pnpm typecheck`, feature ESLint, `pnpm build`, and `git diff --check` pass.
  Local Node is 22.19.0 against the repository's 22.23.2 pin; build completed
  with its existing dynamic-import and chunk-size warnings.
- No live database operation, Dataset V2 change, or production deployment was
  performed.
