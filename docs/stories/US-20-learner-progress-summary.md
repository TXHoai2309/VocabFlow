# US-20 — Learner Progress Summary

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `ee9fd8aaa8785d7f8aae28e26767b0acd6c4396c`
- Dependencies: learner context, sparse progress, review queue, and review history.

## User story

As a parent or learner, I want a progress summary for the active learner so
that I can see New, Learning, Mastered, Due, and Learned totals.

## In scope

- Read and display canonical progress metrics for the selected learner.
- Keep virtual New and materialized Learned semantics consistent with the
  product and architecture contracts.
- Provide loading, error, empty, and mobile-safe states.

## Out of scope

- Cross-learner aggregation, advanced analytics, or progress mutation.

## Task mapping

- T20-01: define metric semantics and DTO.
- T20-02: implement learner-scoped API/query and UI cards.
- T20-03: preserve sparse-progress and due-date rules.
- T20-04: cover loading, metrics, errors, and responsive layout.

## Acceptance criteria

- AC-20-01: the dashboard renders all canonical metrics for the active learner.
- AC-20-02: counts derive from canonical progress and enabled vocabulary.
- AC-20-03: the page remains usable on the supported mobile viewport.

## Authorization and persistence

The API authorizes the selected learner through the household context. This is
read-only; no progress or review event is created.

## Test and evidence

Progress API/UI tests and E2E passed. Owner evidence included Hoài's displayed
metrics: New=10, Learning=20, Mastered=0, Due=19, Learned=20.

## Known limitations

The summary is learner-scoped and intentionally does not provide family-wide
analytics.
