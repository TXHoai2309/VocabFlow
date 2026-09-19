# US-12 — Audio Pronunciation

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `5988661f985e71e48806136a042bacea01126bb8`
- Dependencies: US-04 vocabulary content, US-05 flashcard, and the accepted Study flow.

## User story

As the active learner, I want to hear a word's pronunciation so that I can
practice listening and speaking while studying.

## In scope

- Play the vocabulary `audioUrl` when pronunciation is available.
- Support replay and stop/cleanup when the card changes or the component leaves.
- Keep the card usable when audio is absent or unavailable.

## Out of scope

- SpeechSynthesis, generated fallback audio, new uploads, or a new persistence
  contract.
- Changes to scheduler, learner progress, or review history.

## Task mapping

- T12-01: expose the existing audio URL through the flashcard contract.
- T12-02: implement play, replay, stop and card-transition cleanup.
- T12-03: preserve missing-audio fallback and accessibility behavior.
- T12-04: add focused component and E2E regression coverage.

## Acceptance criteria

- AC-12-01: an available pronunciation can be played and replayed.
- AC-12-02: audio is stopped/cleaned up on card transition.
- AC-12-03: missing audio does not crash the card or create a fake fallback.

## Authorization and persistence

The feature uses the already authorized Study vocabulary DTO. It adds no route,
authorization rule, schema, learner-progress write, or review-event write.

## Test and evidence

- Focused flashcard pronunciation tests and repository gates passed.
- Owner manually checked real audio playback, replay, and stop-on-card-transition.

## Known limitations

Only media URLs already supplied by the vocabulary contract are used; media
availability remains optional.
