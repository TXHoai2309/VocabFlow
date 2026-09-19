# US-21 — Learner Progress Isolation

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation commit: `ee9fd8aaa8785d7f8aae28e26767b0acd6c4396c`
- Dependencies: US-03 learner context and US-20 progress summary.

## User story

As a parent managing more than one learner, I want each learner's progress to
remain isolated so that switching learners never leaks state.

## In scope

- Scope progress, queue, summary, and vocabulary status to the active learner.
- Refetch canonical data when learner context changes.
- Preserve isolation across reload and learner switching.

## Out of scope

- Learner accounts/PINs, household-wide analytics, or data migration.

## Task mapping

- T21-01: enforce learner scope in read queries and DTOs.
- T21-02: refresh UI context on learner switching.
- T21-03: verify no cross-learner progress joins or cached leakage.
- T21-04: cover switching, reload, and summary/queue regressions.

## Acceptance criteria

- AC-21-01: learner A cannot see learner B's progress or statuses.
- AC-21-02: switching learner reloads the canonical selected-learner data.
- AC-21-03: existing review persistence remains learner-scoped.

## Authorization and persistence

Household authorization and selected learner identity are required for every
read/write. Canonical rows remain keyed by learner and vocabulary; no duplicate
or copied progress is created by switching.

## Test and evidence

API/UI isolation tests and E2E switching evidence passed. Owner evidence:
Hoài New=10, Learning=20, Mastered=0, Due=19, Learned=20; Ngọc New=30,
Learning=0, Mastered=0, Due=0, Learned=0.

## Known limitations

The Family MVP still uses parent-managed learner profiles rather than separate
learner authentication.
