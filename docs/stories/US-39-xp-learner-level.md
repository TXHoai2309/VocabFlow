# US-39 — XP & Learner Level

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: canonical review write, US-15 reinforcement, US-17 retry, US-35 daily goal.

## Gap audit

- T39-01, T39-02, T39-06, T39-07 and T39-08: `MISSING` — no XP evidence, level read model, learner-scoped API or UI existed.
- T39-03: `PARTIAL` — persisted review and daily-goal evidence existed. Scheduled review and daily-goal rewards are implemented; exercise-correct bonus is deferred because exercise type/correctness is client-local and not a trusted server signal.
- T39-04 and T39-05: `PARTIAL` — canonical retry and session-local reinforcement existed; reward-layer guarantees were missing.

## Canonical behavior

`xp_events` is the immutable reward ledger. It has a learner foreign key, positive bounded points and unique `(source_type, source_key)`. No mutable learner XP total or level is stored.

- `REVIEW`, `review:<reviewId>`, 10 XP: one successful canonical scheduled review, for both Remembered and Forgotten.
- `DAILY_GOAL`, `daily-goal:<learnerId>:<reviewDate>`, 20 XP: when that newly persisted review makes household-local distinct reviewed vocabulary reach the learner's daily goal.
- Reinforcement has no persisted review event and earns 0 XP. Failed writes and idempotent replay insert no ledger row.
- Correct-exercise bonus is deliberately not awarded: the server receives no trusted exercise context or answer-verification evidence. No client-provided label is used to manufacture rewards.

The review and ledger inserts are coupled in the existing atomic write statement. The database unique constraint is the final duplicate/concurrency guard. Existing review history receives no XP backfill.

Level is derived: `level = floor(totalXp / 100) + 1`; `xpIntoLevel = totalXp % 100`; `xpToNextLevel = 100 - xpIntoLevel`. Reset deletes neither XP events nor level evidence.

## API and UI

`GET /api/learners/:learnerId/gamification` is same-household authorized and returns learner-scoped XP, derived level progress and achievement catalog state. Progress displays loading, error, zero-XP, level progress and learner-switch states.
