# VocabFlow User Story System

One story is one implementation contract for one vertical slice. Only one
story is active by default, and its status controls whether implementation may
begin.

Every story must:

- reference the Product, Architecture, UI and Flow sources that govern it;
- state dependencies, in-scope and out-of-scope behavior;
- define observable acceptance criteria;
- cover relevant authorization, errors, persistence, concurrency and tests;
- record acceptance evidence after implementation.

No agent may silently expand a story because a neighboring feature appears
convenient. Reprioritization or a new story must be explicit.

## Files

- [US template](US-TEMPLATE.md)
- [US-01 Parent Registration](US-01-parent-registration.md) — `ACCEPTED`
- [US-02 Parent Login](US-02-parent-login.md) — `ACCEPTED`
- [US-03 Learner Profile Creation & Resolution](US-03-learner-profile-resolution.md)
  — `ACCEPTED`.
- [US-04 Vocabulary Content Seed & Read Foundation](US-04-vocabulary-content-foundation.md)
  — `ACCEPTED`.
- [US-05 First Real Flashcard](US-05-first-real-flashcard.md)
  — `ACCEPTED`.
- US-06 has not started; no next story is active.

## Story status gate

- `DRAFT`: the story is being written and is not ready for review.
- `READY FOR CONTRACT REVIEW`: the owner must review and resolve the story
  contract; it is not implementation permission.
- `READY FOR IMPLEMENTATION`: dependencies, scope and acceptance criteria are
  explicit; implementation is allowed.
- `IN PROGRESS`: implementation has started.
- `BLOCKED`: implementation cannot safely continue until the blocker is
  resolved.
- `ACCEPTED`: implementation and acceptance evidence are complete.
- `SUPERSEDED` / `ARCHIVED`: historical status; the story is not active.

**READY FOR CONTRACT REVIEW IS NOT PERMISSION TO IMPLEMENT.** Only `READY FOR
IMPLEMENTATION` may enter implementation.
