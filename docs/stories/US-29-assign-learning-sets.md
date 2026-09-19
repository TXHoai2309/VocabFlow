# US-29 — Assign Learning Sets to Learners

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Depends on: US-03 learner ownership, US-08 queue, US-28 learning sets and
  canonical sparse progress/review persistence.
- Scope: household-authorized assignment management and queue eligibility.

## Contract

`learner_learning_sets` normalizes learner/set assignment with a unique
`(learner_id, learning_set_id)` key and an `active` flag. The assignment API
uses the existing learner ownership seam: a parent may only assign a learner
in their own household; cross-household access returns 403. PUT is idempotent
and reactivates an existing row; DELETE removes only the assignment row.

Queue eligibility is the union of vocabulary in at least one active assignment
to an enabled learning set, intersected with `vocabularies.enabled = true`.
The queue uses `EXISTS`, so vocabulary repeated across sets is returned once.
Due/new ordering, caps, scheduler semantics and canonical progress identity are
unchanged. Unassigning does not delete progress or review events; reassigning
reuses the existing `(learner_id, vocabulary_id)` progress row.

Existing learners receive the enabled `starter-vocabulary` assignment during
the migration. New learners receive the same assignment in the canonical
learner-create SQL path. This keeps existing learner access compatible without
an ambiguous permanent queue fallback.

## Acceptance evidence

- Focused API/service tests cover authentication, assignment state,
  idempotent PUT, DELETE, ownership and safe errors.
- Web tests cover loading, current assignment state, save success/error and
  learner-keyed state isolation.
- Queue tests and the Trusted DB suite cover enabled-set eligibility, union
  deduplication, due/new behavior, unassign preservation and reassignment.

## Out of scope

Learner self-authentication, set authoring, bulk assignment across households,
progress reset changes, scheduler changes and recommendation logic.
