# US-24 — Reset Learner Progress

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `101ccc104560787dc51c31cbee728837be5607bc`
- Dependencies: US-20 progress summary, US-21 isolation, and review persistence.

## User story

As a parent, I want to reset one learner's progress so that the learner can
start studying again without changing other learners or vocabulary content.

## In scope

- Require explicit confirmation for a learner-scoped reset.
- Clear that learner's materialized progress while preserving catalog rows and
  immutable review history according to the implementation contract.
- Refresh canonical summary/queue after reset.

## Out of scope

- Resetting a household, another learner, vocabulary content, or account data.

## Task mapping

- T24-01: add authorized learner-scoped reset boundary.
- T24-02: add confirmation and duplicate-submit protection.
- T24-03: refresh canonical progress UI after success.
- T24-04: cover isolation and review-history preservation regressions.

## Acceptance criteria

- AC-24-01: confirmation is required before reset.
- AC-24-02: only the selected learner's progress is affected.
- AC-24-03: summary returns to New=30, Learning=0, Mastered=0, Due=0,
  Learned=0 for the owner-verified case.

## Authorization and persistence

Reset requires authenticated parent household authorization and a learner in
that household. The operation is learner-scoped; review-history preservation is
covered by implementation/tests, not claimed as manual DB inspection here.

## Test and evidence

API/UI tests and E2E passed. Owner manually verified Hoài before reset:
New=10, Learning=20, Mastered=0, Due=19, Learned=20; after reset:
New=30, Learning=0, Mastered=0, Due=0, Learned=0, including the confirmation
dialog.

## Known limitations

This is not a global catalog reset or destructive database reset.
