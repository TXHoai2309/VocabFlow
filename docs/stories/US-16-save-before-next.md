# US-16 — Save Before Next

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Closeout/fix commit: `447d6e21e0fec21b037da765a3b3edba0d347310`
- Dependencies: US-13–US-15 and the accepted Study flow.

## User story

As a learner, I want a confirmed answer saved before the next card appears so
that I never lose a review by advancing too early.

## In scope

- Keep the current card while a review write is pending.
- Advance only after the server confirms the transition.
- Preserve pending, success, error, and retry states.

## Out of scope

- Offline writes, optimistic local progress, or new persistence structures.

## Task mapping

- T16-01: model the save-before-next state machine.
- T16-02: gate card advancement on confirmation.
- T16-03: retain safe retry and session metrics.
- T16-04: add regression coverage for pending and failed saves.

## Acceptance criteria

- AC-16-01: no next-card transition occurs before a successful save.
- AC-16-02: a failed save leaves the answer recoverable without false success.

## Authorization and persistence

The existing authenticated review endpoint remains the only persistence path;
no client-side durable progress is introduced.

## Test and evidence

Study/review tests, full tests, and E2E regression passed under the shared
closeout/fix commit. No separate owner manual evidence is recorded for this
isolated story.

## Known limitations

Network loss still requires the learner to retry the server-confirmed write.
