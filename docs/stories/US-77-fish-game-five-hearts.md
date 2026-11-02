# US-77 — Ván bắn cá 5 tim (ticket08)

- Status: ACCEPTED
- Assignment: owner sequential execution2026-11-01; no worker/commit/cloud.
- Blocker04/US73 ACCEPTED. US76 feature acceptance is complete; only this story now starts.

## Technical contract to ready before code

Account-only `/game` starts an image/type game using the learned source. Later
tickets explicitly extend sources/cues/resume/guest/history. A new game has5
hearts,0 points and rulesVersion1. No timer, aiming, escape, combo, healing or
bonus correction. Correct normalized English typing resolves the fish once and
adds10; incorrect/reveal/active skip costs1 heart. Empty input, typing, replay,
media retry and technical skip cost0. Zero hearts yields final feedback/loss;
no further fish or score. Image stage includes a decorative fish with reduced
motion support, neutral cue/alt and keyboard-labelled typed form.

Contracts/domain own strict create/actions/state/DTO. API under existing auth:
`/api/learners/:learnerId/fish-games`, POST create, GET id, POST id/actions.
Client submits IDs/text/actions only, never grade/hearts/points. Every route
resolves parent→household→learner; no-store/same-origin. Server projects permitted
learned content/media, pins source and meaning/version/hash. A shuffled queue
cycles that pool, avoiding immediate repeat when another item is available;
one-word image source can repeat. Each encounter has a fresh questionId.
Pure first-result rules and semantic action fingerprints persist receipts;
PostgreSQL CAS prevents racing distinct requests or double loss. Freshness
checked before new resolution; exact committed receipt replay precedes freshness.
Public DTO hides current answer and vocabulary identity. UI advances only after
confirmed save; error keeps typed text/pending ID and offers exact retry.

Separate `fish_games` JSONB state/revision/created_at, composite learner+game PK,
FK learner, standard application schema/grants/migration path and registry.
Prepare additive migration0026 for review; no persistent/cloud migration.
Never write vocabulary/media, learner progress/reviews/XP/streak or use review API.
The state stores source/config/pinned queue/receipts so09/10 can extend the same
contract without fabricating fixed rounds. No arbitrary completion after N fish.

## Acceptance before ACCEPTED

Full five ticket criteria/common rules: browser one correct+10 followed by five
losses; no further fish after0; blanks/characters/media cost0; uncertain save
retry same action once, mobile/reduced motion/keyboard. API401/403, forged score/
hearts/grade, content stale, replay and first-action race; real local SQL rollback
readback/CAS and unchanged progress/review/XP/catalog snapshots. Appropriate
lint/typecheck/tests/build and migration inventory regression. Story/tracker/
progress/changelog/hash synchronized only after evidence.

READY FOR IMPLEMENTATION recorded before code against approved ticket08 scope.
Gate passed; implementation started sequentially.

Acceptance evidence:4 Chromium flows,24 API practice/game cases,26 source/schema cases PASS; changed-source ESLint/typecheck/build PASS. Actual local PostgreSQL rollback proves game readback/replay/auth/5-heart finality and unchanged SRS/reviews/XP/catalog. Additive0026 prepared only.
