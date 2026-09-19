# US-15 — Session Reinforcement

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: audited under `c0b65f4d0af7389156d89ef9d16d2561619a9d28`
- Dependencies: US-13 recall integration and US-14 due/new queue.

## User story

As a learner, I want a missed card to be reinforced in the same session so that
I can retry it immediately without corrupting the scheduler.

## In scope

- Keep session-local reinforcement cards separate from scheduled evaluation.
- Allow a real 10-card flow to continue with reinforcement and final metrics.
- Avoid creating a second persisted review for reinforcement alone.

## Out of scope

- New database tables, offline queues, or a second scheduler transition.

## Task mapping

- T15-01: model session-local reinforcement state.
- T15-02: return the learner to an eligible missed card.
- T15-03: keep progress/review writes server-confirmed and singular.
- T15-04: cover mixed 10-card sessions and summary metrics.

## Acceptance criteria

- AC-15-01: Forgotten can lead to same-session reinforcement.
- AC-15-02: reinforcement does not create an extra scheduled write.
- AC-15-03: the session remains bounded and reports truthful metrics.

## Authorization and persistence

Existing Study authorization and review-write rules apply. Reinforcement is
ephemeral; only scheduled evaluations persist to `learner_progress` and
`review_events`.

## Test and evidence

Study, review, queue, and E2E regression suites passed. Owner evidence exists
from a real 10-card session/reinforcement flow.

## Known limitations

Reinforcement is session-local and is not intended to survive reload or tab
close.
