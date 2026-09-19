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
- [US-06 Learning Scheduler Domain](US-06-learning-scheduler-domain.md)
  — `ACCEPTED`.
- [US-07 Scheduled Review Write](US-07-scheduled-review-write.md)
  — `ACCEPTED / CLOSED`.
- [US-08 Review Queue](US-08-review-queue.md)
  — `ACCEPTED / CLOSED`.
- [US-09 Flashcard Session UX](US-09-flashcard-session-ux.md)
  — `ACCEPTED / CLOSED`.
- [US-10 Reusable Flashcard Front State](US-10-reusable-flashcard-front-state.md)
  — `ACCEPTED / CLOSED`.
- [US-11 Flashcard Back Content & Recall Actions](US-11-flashcard-back-content-and-recall-actions.md)
  — `ACCEPTED / CLOSED`.
- [US-12 Audio Pronunciation](US-12-audio-pronunciation.md) — `ACCEPTED / CLOSED`.
- [US-13 Recall / Scheduler Integration](US-13-recall-scheduler-integration.md) — `ACCEPTED / CLOSED`.
- [US-14 Due / New Review Queue](US-14-due-new-review-queue.md) — `ACCEPTED / CLOSED`.
- [US-15 Session Reinforcement](US-15-session-reinforcement.md) — `ACCEPTED / CLOSED`.
- [US-16 Save Before Next](US-16-save-before-next.md) — `ACCEPTED / CLOSED`.
- [US-17 Safe Retry](US-17-safe-retry.md) — `ACCEPTED / CLOSED`.
- [US-18 Reload / Leave](US-18-reload-leave.md) — `ACCEPTED / CLOSED`.
- [US-19 Session Summary](US-19-session-summary.md) — `ACCEPTED / CLOSED`.
- [US-20 Learner Progress Summary](US-20-learner-progress-summary.md) — `ACCEPTED / CLOSED`.
- [US-21 Learner Progress Isolation](US-21-learner-progress-isolation.md) — `ACCEPTED / CLOSED`.
- [US-22 Vocabulary List](US-22-vocabulary-list.md) — `IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK DEFERRED`.
- [US-23 Missing Media / Dataset Vertical Slice](US-23-missing-media-data-foundation.md) — `ACCEPTED / CLOSED`.
- [US-24 Reset Learner Progress](US-24-reset-learner-progress.md) — `ACCEPTED / CLOSED`.
- [US-25 Full Vocabulary Catalog](US-25-full-vocabulary-catalog.md) — `ACCEPTED / CLOSED`.

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
