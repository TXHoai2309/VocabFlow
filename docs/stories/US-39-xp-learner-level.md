# US-39 — XP & Learner Level

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: canonical review write, US-15 reinforcement, US-17 retry, US-35 daily goal.

## Gap audit

- T39-01, T39-02, T39-06, T39-07 and T39-08: `MISSING` — no XP evidence, level read model, learner-scoped API or UI existed.
- T39-03: `IMPLEMENTED` — persisted review and daily-goal evidence existed; the fix-forward adds server-verifiable optional exercise submission evidence and completes the bonus without trusting a client boolean.
- T39-04 and T39-05: `PARTIAL` — canonical retry and session-local reinforcement existed; reward-layer guarantees were missing.

## Canonical behavior

`xp_events` is the immutable reward ledger. It has a learner foreign key, positive bounded points and unique `(source_type, source_key)`. No mutable learner XP total or level is stored.

- `REVIEW`, `review:<reviewId>`, 10 XP: one successful canonical scheduled review, for both Remembered and Forgotten.
- `EXERCISE_CORRECT`, `exercise-correct:<reviewId>`, 5 XP: one successful scheduled exercise whose submitted evidence the server independently verifies as correct.
- `DAILY_GOAL`, `daily-goal:<learnerId>:<reviewDate>`, 20 XP: when that newly persisted review makes both household-local distinct new and review vocabulary reach the learner's two daily goals.
- Reinforcement has no persisted review event and earns 0 XP. Failed writes and idempotent replay insert no ledger row.
- The optional `exerciseSubmission` is discriminated by exercise type: meaning and typing submit text; listening and image submit a vocabulary ID. The server compares it with canonical target vocabulary data, rejects a recall-result mismatch, and never accepts `correct=true`. TYPE_WORD input is transient: it is not stored in review events, XP events, response payloads or fingerprints.

The review and ledger inserts are coupled in the existing atomic write statement. The database unique constraint is the final duplicate/concurrency guard. Existing review history receives no XP backfill.

Level is derived: `level = floor(totalXp / 100) + 1`; `xpIntoLevel = totalXp % 100`; `xpToNextLevel = 100 - xpIntoLevel`. Reset deletes neither XP events nor level evidence.

## API and UI

`GET /api/learners/:learnerId/gamification` is same-household authorized and returns learner-scoped XP, derived level progress and achievement catalog state. Progress displays loading, error, zero-XP, level progress and learner-switch states.
