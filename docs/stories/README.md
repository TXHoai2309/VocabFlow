# VocabFlow User Story System

## Single-account learning baseline (2026-10-07)

This owner-approved baseline supersedes the earlier learner-management flow and
all historical create/select/switch instructions below.

- USER_MODEL: 1 authenticated account = 1 learning identity in the UX.
- INTERNAL_MODEL: learner_profile, household/membership, learner_id foreign keys
  and learner-scoped APIs remain for compatibility.
- MULTI_LEARNER_LEGACY: all existing profiles and their progress, reviews,
  saved words and settings remain intact; only one canonical ID is used in UI.
- CANONICAL_RESOLUTION: valid same-user legacy stored ID present and enabled in
  the canonical API list wins; otherwise earliest enabled createdAt, then ID.
  Persist the canonical DTO under vocabflow.activeLearner.v1 scoped by userId.
- FUTURE_MULTI_PROFILE: schema intentionally retained; no unique constraint,
  migration, cleanup, delete, disable, merge or learner-data reassignment.
- LOGOUT: supported through Better Auth signOut; clear internal storage only
  on success, then replace navigation with /login. Failure preserves the app
  and storage and displays “Không thể đăng xuất. Vui lòng thử lại.”

US-03 now implements internal account learning identity resolution and logout.
Its original multi-learner onboarding/management acceptance is historical;
current replacement is IMPLEMENTED / READY FOR OWNER CHECK. US-01/US-02 hand off
to Home with automatic internal resolution. Do not implement a selector from
older story text. See US-03 and ../ai-progress.md for current evidence.


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

- [US-54 Study Source Picker](US-54-study-source-picker.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.

- [US template](US-TEMPLATE.md)
- [US-01 Parent Registration](US-01-parent-registration.md) — `ACCEPTED`
- [US-02 Parent Login](US-02-parent-login.md) — `ACCEPTED`
- [US-03 Internal Account Learning Identity Resolution](US-03-learner-profile-resolution.md)
  — `IMPLEMENTED / READY FOR OWNER CHECK` (single-account replacement).
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
- [US-26 Vocabulary Grade Level](US-26-vocabulary-grade-level.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-27 Vocabulary Topics](US-27-vocabulary-topics.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-28 Learning Sets](US-28-learning-sets.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-29 Assign Learning Sets to Learners](US-29-assign-learning-sets.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-30 Daily New Word Limit](US-30-daily-new-word-limit.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-31 Multiple Choice Meaning](US-31-multiple-choice-meaning.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-32 Listening Exercise](US-32-listening-exercise.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-33 Image to Word Exercise](US-33-image-word-exercise.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-34 Typing / Spelling Exercise](US-34-typing-spelling-exercise.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-35 Daily Learning Goal](US-35-daily-learning-goal.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-36 Learning Streak](US-36-learning-streak.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-37 Weekly / Daily Progress](US-37-weekly-daily-progress.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-38 Topic Progress](US-38-topic-progress.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-39 XP & Learner Level](US-39-xp-learner-level.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-40 Achievements / Badges](US-40-achievements-badges.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-41 Content Curation & Activation](US-41-content-curation-activation.md) — `IMPLEMENTED / READY FOR OWNER CHECK`.
- [US-42 Protected Production Release Automation](US-42-production-release-automation.md) — `IN PROGRESS`.
- [US-43 Vocabulary Detail](US-43-vocabulary-detail.md) — `IMPLEMENTED / READY FOR OWNER CHECK` (owner-reprioritized while US-42 remained open).
- [US-44 Study Session Focus Mode](US-44-study-session-focus-mode.md) — `IMPLEMENTED / READY FOR OWNER CHECK` (owner-requested Study Session presentation and interaction update).
- [US-45 Master Vocabulary V2 Runtime Import Bridge](US-45-master-vocabulary-v2-runtime-import-bridge.md) — `IMPLEMENTED / DEVELOPMENT CANARY VERIFIED` (production remains unauthorized; owner acceptance is explicit).
- [US-46 Saved Vocabulary](US-46-saved-vocabulary.md) — `IN PROGRESS` (explicit owner reprioritization; learner-owned saved words, CRUD API, Saved Words page and scoped study queue).
- [US-47 Continue Learning](US-47-continue-learning.md) — `IN PROGRESS` (explicit owner reprioritization; one learner-scoped Home continuation candidate with real collection progress and review recency).
- [US-48 Progress Dashboard](US-48-progress-dashboard.md) — `IN PROGRESS` (owner-requested Feature #11; evidence-based active-learner dashboard with bounded period charts and level/Topic coverage).
- [US-49 Weak Words / Need Review](US-49-weak-words-review.md) — `ACCEPTED` (owner-requested Feature #12; review-evidence classification and server-resolved Weak study scope).
- [US-50 Simplified App Navigation](US-50-simplified-navigation.md) — `IMPLEMENTED / READY FOR OWNER CHECK` (Feature #13; six desktop destinations, five tablet/mobile destinations and contextual discovery of auxiliary routes).
- [US-51 Global Search](US-51-global-search.md) — `IMPLEMENTED / READY FOR OWNER CHECK` (Feature #14; learner-scoped Vocabulary, Topic and Learning Set search, command palette/mobile sheet and bounded local recent queries).
- [US-52 Loading / Empty / Error States](US-52-async-data-states.md) — `IMPLEMENTED / READY FOR OWNER CHECK` (Feature #15; shared accessible skeleton, empty, safe error and retry states across learner data pages and Global Search).

- [US-53 Toast & Feedback](US-53-toast-feedback.md) — `IMPLEMENTED / READY FOR OWNER CHECK` (Feature #16; shared mutation feedback, success toasts for normal actions and confirmation for destructive actions).

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
