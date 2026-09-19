# US-30 — Daily New Word Limit

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-14 due/new queue, US-20 progress semantics, US-24 reset,
  US-28 learning sets and US-29 learner assignments.
- Implementation commit: recorded at closeout.

## User story

As a parent, I want to limit how many genuinely new words a learner receives
in one household-local day so that study remains manageable.

## Gap audit

- `T30-01`–`T30-02`: `MISSING` — learners had no daily-new setting or default.
- `T30-03`: `ALREADY_SATISFIED` — existing queue orders Due before New.
- `T30-04`–`T30-06`: `MISSING` — New selection had a per-request cap only and
  did not account for current-day materialization or learner timezone.
- `T30-07`: `MISSING` — no settings API or parent control existed.

## Canonical behavior

- `learner_profiles.daily_new_word_limit` is a non-negative integer from `0`
  through `100`; the default is `10` for existing and new learners.
- Consumption is the count of distinct current `learner_progress` rows for the
  learner whose `first_learned_date` equals the current household-local date.
  This is the current progress lifecycle, not all-time `review_events`.
- Due items remain available regardless of the setting. Due is ordered before
  New, and the existing session selection cap remains independent of the daily
  allowance.
- New queue candidates still require enabled vocabulary in the union of the
  learner's active assigned learning sets and no current progress row.
- Reset deletes current progress but preserves review events. After reset, a
  vocabulary is virtual NEW again and can consume the current day's allowance;
  preserved history does not suppress it.
- Idempotent review replay and reinforcement operate on materialized progress
  and do not consume another New allowance.
- Queue reads are server-authoritative. Review materialization also checks the
  allowance atomically under a per-learner PostgreSQL advisory lock, preventing
  concurrent NEW writes from bypassing the limit. The queue itself remains a
  non-reserved, read-only list.

## API and UI

- `GET /api/learners/:learnerId/settings`
- `PATCH /api/learners/:learnerId/settings` with strict
  `{ dailyNewWordLimit: number }` validation.
- The shared settings endpoint now also carries the separate US-35
  `dailyLearningGoal`; the US-30 queue allowance remains unchanged and is not
  reused as a learning goal.
- Parent-only learner ownership is reused; cross-household access returns 403.
- Learner settings are available from the learner home and refresh when the
  active learner changes. Loading, validation, saving, error and success states
  prevent duplicate submits and never reset progress.

## Acceptance evidence

- Focused API, queue, review, schema, settings UI and E2E tests pass locally.
- Full unit tests, lint, typecheck, build, E2E and Trusted DB acceptance are
  required before owner check.
