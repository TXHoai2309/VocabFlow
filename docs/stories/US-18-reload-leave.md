# US-18 — Reload / Leave

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Closeout/fix commit: `447d6e21e0fec21b037da765a3b3edba0d347310`
- Dependencies: US-16 save-before-next and US-17 safe retry.

## User story

As a learner, I want reload/leave behavior to be safe so that confirmed review
history survives while an unsaved card is not falsely resumed.

## In scope

- Re-resolve learner and queue context after reload.
- Keep server-confirmed progress/history and discard only ephemeral session state.
- Avoid an incorrect leave warning after a successful save.

## Out of scope

- Persisting a current study session or adding offline recovery.

## Task mapping

- T18-01: define reload and leave lifecycle boundaries.
- T18-02: preserve confirmed server state.
- T18-03: suppress incorrect warnings after successful transition.
- T18-04: cover reload, close, back, and saved/unsaved paths.

## Acceptance criteria

- AC-18-01: a successful saved transition may leave Study without an incorrect warning.
- AC-18-02: reload generates a queue from canonical learner data.
- AC-18-03: an unsaved answer is not presented as persisted history.

## Authorization and persistence

Reload uses the existing authenticated learner resolution. Only confirmed API
writes persist; ephemeral Study state is not a new database record.

## Test and evidence

Lifecycle, Study, and E2E regression tests passed. Owner manually verified that
a successful saved transition may leave Study without an incorrect warning.

## Known limitations

An in-progress unsaved answer is intentionally not resumed after reload.
