# US-17 — Safe Retry

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Closeout/fix commit: `447d6e21e0fec21b037da765a3b3edba0d347310`
- Dependencies: US-07 idempotent review writes and US-16 save-before-next.

## User story

As a learner, I want to retry a failed answer safely so that a network retry
does not duplicate the review or advance the session incorrectly.

## In scope

- Retry with the same request identity and canonical payload.
- Keep the card and action state recoverable until confirmation.
- Reconcile duplicate success, stale revision, and other server errors safely.

## Out of scope

- Background offline synchronization or automatic conflict resolution.

## Task mapping

- T17-01: preserve review request identity across retry.
- T17-02: distinguish idempotent replay from stale/conflicting requests.
- T17-03: prevent duplicate UI transitions and metrics.
- T17-04: test retry and error paths.

## Acceptance criteria

- AC-17-01: retrying the same request cannot create a duplicate event.
- AC-17-02: stale/conflicting responses do not appear as success.
- AC-17-03: the learner can recover without losing the current card.

## Authorization and persistence

Existing authentication, household authorization, fingerprint and revision
checks remain authoritative. Persistence is still one atomic progress/event
operation.

## Test and evidence

Review service, Study, and E2E regression tests passed under the shared
closeout/fix commit. No separate owner manual evidence is recorded for this
isolated story.

## Known limitations

This is safe online retry, not a durable offline write queue.
