# US-19 — Session Summary

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `72120022a483238f0d48cbb9a50c9cd9c1661bf0`
- Dependencies: accepted Study session, reinforcement, and save/retry lifecycle.

## User story

As a learner, I want a session summary so that I can understand what happened
in the study session and choose the next useful action.

## In scope

- Show canonical session metrics already produced by the Study flow.
- Keep summary metrics session-local and consistent with saved transitions.
- Provide the final CTA wording and navigation behavior.

## Out of scope

- New analytics storage, historical reports, or a new review algorithm.

## Task mapping

- T19-01: define summary metric semantics.
- T19-02: render the completed-session summary.
- T19-03: finalize CTA copy and next action.
- T19-04: test zero, partial, and completed session states.

## Acceptance criteria

- AC-19-01: summary metrics match the session's confirmed actions.
- AC-19-02: the CTA is clear and returns to the intended product surface.
- AC-19-03: summary presentation does not mutate progress/history.

## Authorization and persistence

Summary reads the active learner's session state; it creates no durable summary
row and does not broaden learner authorization.

## Test and evidence

Summary metrics had prior owner validation; the final implementation gap was
CTA wording. Focused, full, and E2E regression evidence passed at the commit.

## Known limitations

The summary is not a historical analytics dashboard.
