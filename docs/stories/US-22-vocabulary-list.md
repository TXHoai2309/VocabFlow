# US-22 — Vocabulary List

- Status: IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK DEFERRED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `e56940c801dbdf58c6708eac27c98848cb189b70`
- Dependencies: US-03 learner context, US-04 vocabulary API, and US-21 isolation.

## User story

As a learner, I want to browse vocabulary and see my status for each item so
that I can understand what I have learned.

## In scope

- Render the learner-scoped vocabulary list in deterministic order.
- Show New, Learning, and Mastered states using canonical learner progress.
- Handle loading, errors, empty content, missing media, and mobile layout.

## Out of scope

- Editing vocabulary, enabling catalog rows, search/filter redesign, or review writes.

## Task mapping

- T22-01: add learner-scoped list contract/query.
- T22-02: render vocabulary rows and status labels.
- T22-03: preserve optional-media and responsive behavior.
- T22-04: add component and E2E regression coverage.

## Acceptance criteria

- AC-22-01: the list shows enabled vocabulary with the active learner's status.
- AC-22-02: status values follow sparse-progress semantics.
- AC-22-03: missing media does not crash the list or row.

## Authorization and persistence

List reads require the active household/learner context and are read-only. No
progress or review history is changed by browsing.

## Test and evidence

Automated component/API/E2E and responsive tests pass. Manual owner check is
explicitly deferred and this story must not be called accepted/closed yet.

## Known limitation

The list is not a catalog administration or import UI.

## V2 vocabulary presentation follow-up — 2026-10-18

- Keep the canonical Vietnamese field labeled as a Vietnamese meaning; this
  release contract has no separate approved short gloss or Vietnamese
  explanation field. Keep the English definition in its own labeled section.
- Show the available POS beside IPA, format catalog and inferred topic values
  for learners while retaining their API filter identities, and place
  structured English/Vietnamese examples on separate labeled lines.
- Show a friendly missing-image state and remove pronunciation controls when no
  playable URL exists. A playback failure is shown as a non-interactive status.
- In Production, `mustWithholdV2Media` intentionally strips uncleared media
  URLs from the API response. This UI change preserves that rights guard and
  does not enable APKG media delivery.
- Focused component and helper coverage: 74 tests pass across the six targeted
  files. Full app typecheck, lint, and build status are recorded in the current
  `docs/ai-progress.md` entry.
