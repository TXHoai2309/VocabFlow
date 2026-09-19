# US-13 — Recall / Scheduler Integration

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `c0b65f4d0af7389156d89ef9d16d2561619a9d28`
- Dependencies: US-06 scheduler domain, US-07 scheduled review write, and US-08 review queue.

## User story

As a learner, I want Remembered and Forgotten to update my schedule so that
future reviews reflect my recall result.

## In scope

- Connect Study recall actions to the server-authoritative review contract.
- Apply the scheduler transition and show the confirmed result.
- Preserve request identity, revision checks, and atomic progress/event writes.

## Out of scope

- A new scheduling algorithm, offline writes, learner authentication, or a
  second progress store.

## Task mapping

- T13-01: send canonical recall results from Study.
- T13-02: consume the confirmed scheduler/progress response.
- T13-03: preserve authorization, idempotency, stale-revision, and error rules.
- T13-04: cover Remembered/Forgotten transitions and regressions.

## Acceptance criteria

- AC-13-01: Remembered and Forgotten produce the correct server-confirmed
  transition.
- AC-13-02: only authorized enabled learners and vocabulary can be reviewed.
- AC-13-03: progress and immutable review history remain atomic and retry-safe.

## Authorization and persistence

The API remains household/learner scoped. `learner_progress` is canonical
learner state and `review_events` is immutable history; the client cannot author
household ownership or bypass revision checks.

## Test and evidence

- API, domain, persistence-contract, and Study regression tests passed.
- Owner manually checked real Remembered/Forgotten Study transitions.

## Known limitations

This story does not expand the product into offline conflict resolution or
advanced scheduling.
