# US-60 — Flashcard display preferences

- Status: IMPLEMENTED / READY FOR OWNER CHECK
- Owner: Project Owner
- Last updated: 2026-10-21
- Reprioritized after local implementation of US-59; its owner check and migration rollout remain pending.

## Authority and outcome

The owner asked to continue the next phase of the all-ages learning experience
and accepted per-learner display preferences, with a device-local preference
for guests. Use three named choices so learners can choose how much help a card
shows. This changes presentation only; review answers and scheduler behavior
remain unchanged.

## Scope

- Add `Tự nhớ` as the default: hide Vietnamese meaning until flip, then show the
  primary Vietnamese meaning and at most one example.
- Add `Dễ làm quen`: show the primary Vietnamese meaning on the front and at
  most one example on the back.
- Add `Chi tiết`: keep the front answer-free and show all available meaning,
  definition, examples, topic and image details on the back.
- Make the choice visible and editable on the existing `Cài đặt học tập` page.
- Persist authenticated choices on the selected learner profile and guest
  choices in the existing versioned local store. Old guest data defaults safely
  to `Tự nhớ`.
- Use the selected style for ordinary flashcards and exercise fallback cards.

## Boundaries

No new study mode, learner identity, review/scheduler rule, content mutation,
automatic meaning translation, deployment, or live database operation.
Existing word audio remains available independent of the selected style.

## Acceptance

- AC1: A learner can select one of the three labeled display choices with
  keyboard or pointer on the existing settings page and save it.
- AC2: The authenticated preference is household-authorized, learner-scoped,
  validated at the API boundary and defaults to `SELF_RECALL` for existing
  profiles.
- AC3: Guest preference reads and writes use local storage. Existing v1 guest
  snapshots without the new preference continue to load as `SELF_RECALL`.
- AC4: `SELF_RECALL` hides meaning before flip and limits the back to one
  example. `EASY_INTRO` exposes the Vietnamese meaning before flip and one
  example after flip. `DETAILED` exposes the full available back content and
  hides the meaning before flip.
- AC5: The selected mode survives navigation/reload and is used by both regular
  flashcards and flashcard fallback during exercises.
- AC6: Saving the presentation choice never changes queue scope, answer
  evaluation, review payload, revision, idempotency or scheduler state.
- AC7: Preserve the existing VocabFlow tokens, responsive shell, accessible
  labels, loading/error handling and separate audio controls.

## Implementation record

The existing learner settings service is the account persistence boundary;
guest settings extend the v1 local snapshot with a backward-compatible
`SELF_RECALL` fallback. Study loads the preference alongside the queue so the
first card uses the learner's choice. The shared flashcard applies the chosen
projection without changing the review payload. Migration 0021 adds the
validated account preference and is not run against a live database in this
task.

## Verification and rollout

Production build, web/API TypeScript checks and ESLint on changed source files
pass. Focused settings, flashcard and study-flow verification passes 157 tests
across seven files; the two study-flow suites pass 39/39 after their settings
client is isolated from queue/review fetch fixtures. Local browser inspection
confirms the three choices and `Tự nhớ` default on `/learner-settings`.
Browser E2E and authenticated save/reload against a migrated database were not
run. Do not deploy code that reads the new column before migrations 0020–0021
have been applied in order through the trusted migration path. No production
database, learner history or content operation is included.
