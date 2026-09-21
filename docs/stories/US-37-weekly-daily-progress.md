# US-37 — Weekly / Daily Progress

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-07 canonical reviews, US-24 reset, US-35 daily goal and US-36 streak.

## Gap audit

- T37-01, T37-02, T37-03, T37-04, T37-05 and T37-07: `MISSING` — the canonical review history and current Progress page existed, but no bounded date-range read model, zero-fill or weekly UI existed.
- T37-06: `PARTIAL` — learner ownership authorization existed and is reused; the historical aggregation was missing.

## Canonical behavior

`GET /api/learners/:learnerId/progress-history?from=YYYY-MM-DD&to=YYYY-MM-DD` is learner-scoped, same-household authorized, validates exact calendar dates and returns at most 90 consecutive dates in ascending order. It groups canonical persisted `review_events.review_date`, which is written using the household timezone. Dates with no events are explicitly zero-filled.

- `reviews`: persisted event count.
- `uniqueWords`: distinct `vocabulary_id` reviewed on that local date.
- `remembered` / `forgotten`: persisted event counts by canonical result.
- `newLearned`: distinct vocabulary whose persisted event has `previous_status = NEW` on that date. This is the truthful materialization transition for the current lifecycle; after a reset, a later virtual-New materialization counts again. It uses immutable review-event evidence, so it does not fabricate historical lifecycle state.

The Progress dashboard defaults to the last seven consecutive household-local dates, including today. It displays daily unique words and review counts; each day expands to show remembered, forgotten and new-learned counts.

## Interactions

Historical activity is never filtered by vocabulary's current enabled, assignment or topic state. Reset deletes current `learner_progress` but preserves review events, so this history, Daily Goal and streak remain available. Today's `uniqueWords` has the same `COUNT(DISTINCT vocabulary_id)` / `review_date` semantics as US-35; an active streak date is likewise a date where activity exists.

## Evidence

Focused API aggregation, range-validation, authorization, zero-fill, repeated-review, result-count, timezone and dashboard tests pass locally. No schema or migration changed.
