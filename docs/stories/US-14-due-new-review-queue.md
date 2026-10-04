# US-14 — Due / New Review Queue

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: audited under `c0b65f4d0af7389156d89ef9d16d2561619a9d28`
- Dependencies: US-06 scheduler, US-07 review persistence, and US-08 queue foundation.

## User story

As a learner, I want due vocabulary before new vocabulary so that a study
session follows the intended review priority.

## In scope

- Select due items for the current learner with deterministic ordering.
- Fill the remaining session capacity with enabled vocabulary lacking that
  learner's progress row.
- Preserve the due/new limits and learner isolation rules.

## Out of scope

- Persisting a queue or session, cross-learner recommendations, or catalog
  activation policy beyond `enabled` vocabulary.

## Task mapping

- T14-01: define due-first and sparse-NEW selection.
- T14-02: scope joins and ordering to the active learner.
- T14-03: integrate queue output with Study.
- T14-04: cover caps, ordering, empty, and authorization cases.

## Acceptance criteria

- AC-14-01: due items are selected first and capped deterministically.
- AC-14-02: new items are derived from missing progress for the active learner.
- AC-14-03: another learner's progress cannot suppress or add queue items.
- AC-14-04: Due priority is an ordering recommendation, not a hard gate; New
  remains selectable when enabled New vocabulary and daily New allowance remain.
- AC-14-05: Mixed uses DUE first, then fills remaining requested slots with
  quota-eligible NEW; Review and New modes remain type-exclusive.

## Authorization and persistence

Queue reads require the existing authenticated household/learner context. Queue
generation is read-only; it does not materialize progress or review events.

## Test and evidence

Queue, API, learner-isolation, Study, and E2E regression evidence passed under
the audited implementation baseline. There is no separate owner manual note
recorded for this story.

## Known limitations

Queue state is generated from canonical data and is not a durable session.
