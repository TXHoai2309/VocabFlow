# US-38 — Topic Progress

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-20 progress, US-27 topics and US-28/29 learner learning-set assignment.

## Gap audit

- T38-01, T38-02 and T38-06: `MISSING` — canonical topics/mappings and browse UI existed, but learner-scoped current-state aggregation and progress UI did not.
- T38-03: `PARTIAL` — the canonical M:N mapping already permits it; read-model aggregation was missing.
- T38-04 and T38-05: `PARTIAL` — global summary and ownership authorization exist independently; topic aggregation now preserves both boundaries.

## Canonical behavior

`GET /api/learners/:learnerId/topic-progress` returns every enabled canonical topic in stable `sort_order, id` order, including topics with zero eligible vocabulary. It is same-household authorized and uses one set-based query.

Its scope is current learner eligibility: vocabulary must be enabled and reachable through at least one active learner assignment to an enabled learning set. Repeated set membership is deduplicated before topic aggregation.

- `total`: distinct eligible vocabulary mapped to the topic.
- `newCount`: eligible mapped vocabulary with no learner-progress row.
- `learningCount` / `masteredCount`: eligible mapped vocabulary with that canonical status.
- `dueCount`: an overlapping subset with materialized `next_review_date <=` today in household-local time.

Therefore `new + learning + mastered = total`; Due must not be added to that equation. A vocabulary mapped to several topics counts once in each relevant topic, while global progress remains vocabulary-identity scoped and is not inferred by summing topic totals.

## Starter coverage and reset

The existing source-backed mapping contains 1,994 imported mappings; the 30 enabled starter rows have 0 topic mappings before and after this story. No assignments were invented. The dashboard explains the zero-eligible condition honestly.

Reset removes current learner progress, so eligible mapped vocabulary returns to New in this current-state read model. It does not change US-37 historical review activity.

## Evidence

Focused API, household authorization, set-dedup SQL, current-local-date and dashboard tests pass locally. No schema or migration changed.
