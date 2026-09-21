# US-40 — Achievements / Badges

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-07 reviews, US-20 progress, US-24 reset, US-35 daily goal and US-36 streak.

## Gap audit

- T40-01 through T40-06: `MISSING` — no catalog, immutable learner unlock record, deterministic evaluator, API or UI existed.
- T40-07: `ALREADY_SATISFIED` — gamification remains outside scheduler state; the new implementation preserves that boundary.

## Catalog and unlock behavior

The idempotently seeded catalog contains `FIRST_REVIEW`, `TEN_WORDS_LEARNED`, `FIFTY_WORDS_LEARNED`, `SEVEN_DAY_STREAK`, and `DAILY_GOAL_COMPLETED`.

- First Review: any persisted canonical review event.
- Ten/Fifty Words: current `learner_progress` contains at least 10/50 materialized rows.
- Seven Day Streak: canonical historical longest streak is at least seven local dates.
- Daily Goal Completed: a canonical post-US-39 daily-goal XP event exists.

`learner_achievements` records `(learner_id, achievement_id, unlocked_at)` with a composite primary key. Reconciliation is server-side on gamification reads and uses `INSERT … ON CONFLICT DO NOTHING`; catalog rows are deterministic and ordered. Existing canonical history may unlock First Review, learned-word and streak badges on first reconciliation. XP is never backfilled.

Reset preserves both XP and unlocked achievements. Current-progress unlock conditions may become unmet after reset, but existing achievement rows are never revoked. No achievement changes queue eligibility, recall result, scheduling or due dates.

## UI

The Progress dashboard shows every enabled badge in deterministic order, explicitly labelled locked or unlocked. Unlocked badges include an unlock indicator; loading, error, zero-unlock, responsive and learner-switch states are supported.
