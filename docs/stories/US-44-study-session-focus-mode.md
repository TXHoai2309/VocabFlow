# US-44 — Study Session Focus Mode

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Owner: Project Owner
- Last updated: 2026-10-02
- Baseline commit: `9b6163577f926ddaae2e7383c08b92c3abc774ed`
- Scope: focused presentation and answer interaction for the existing Study routes.

## 1. User Story

As a learner, I want one focused Study Session screen so I can answer, review
feedback and continue without losing the current queue or progress.

## 2. Outcome

The existing `/study` and `/study/exercises` routes keep the question flow
focused inside the shared AppShell; the canonical server queue, scheduling and
scope rules remain unchanged.

## 3. Source of Truth References

- [Product Specification — core learning loop](../product/product-spec.md#3--core-learning-loop--session-rules)
- [Technical Architecture — client state and cache policy](../architecture/technical-architecture.md#11-client-state--cache-policy)
- [Feature UI Specification — Study](../design/feature-ui-spec.md#4--study--flashcard)
- [Feature UI Specification — Study lifecycle](../design/feature-ui-spec.md#5--study-save-error--session-lifecycle)
- [User Flow — Flashcard](../flow/user-flow.md#3-luồng-học-flashcard)
- [US-09 Flashcard Session UX](US-09-flashcard-session-ux.md)
- [US-31 Multiple Choice Meaning](US-31-multiple-choice-meaning.md)
- [US-32 Listening Exercise](US-32-listening-exercise.md)
- [US-33 Image to Word Exercise](US-33-image-word-exercise.md)
- [US-34 Typing / Spelling Exercise](US-34-typing-spelling-exercise.md)

## 4. Dependencies

- Existing authorized learner context, review queue and `POST /api/reviews`.
- Existing Study Setup selection for amount, New/Review/Mixed and topic/set scope.
- Existing flashcard, exercise generator and pronunciation audio hook.

## 5. In Scope

- Focus-mode header, queue progress and centered question card on existing routes.
- Immediate answer feedback and in-page progression after a canonical review save.
- Desktop-only option, Enter and Z shortcuts; touch-friendly answer controls.
- Safe local undo before a scheduled answer is sent to the review API.
- Return navigation to the setup path and query used to begin the session.
- Responsive presentation, accessible labels and question state feedback.

## 6. Out of Scope

- New routes, APIs, scheduler behavior, queue admission rules or persistence.
- Database, migration or Dataset V2 changes.
- Persisted undo after the review API request begins.
- Session resume after reload or close.

## 7. Acceptance Criteria

- AC-01: `/study` and `/study/exercises` reuse their existing routes; the
  shared application navigation remains visible with Học tập active. The
  question content stays focused and centered without a session-specific
  sidebar. This navigation behavior follows the later US-50 AppShell contract.
- AC-02: The header and progress use the selected mode and canonical admitted
  queue count; progress advances only after the review response is confirmed.
- AC-03: Answers show concise feedback in place; no question transition reloads
  or navigates the page.
- AC-04: Scheduled answers are held locally until Next. Undo clears the pending
  answer without changing persisted progress. Next submits the existing
  review request and advances only after server confirmation; retry reuses the
  same review identity and payload.
- AC-05: Topic and Learning Set restrictions and New/Review/Mixed plus amount
  selection continue through the existing queue selection path.
- AC-06: Desktop keyboard shortcuts select available options, Enter continues
  only after answering and Z undoes only an unsent answer. Text entry and
  interactive controls do not trigger shortcuts. Shortcuts and their helper
  are unavailable below desktop width.
- AC-07: Audio remains manually triggered and is disabled without media while
  loading, after an error, or once the answer is locked.
- AC-08: Loading, error, empty and completion states remain available; leaving
  a pending or uncertain answer asks for confirmation.
- AC-09: No database, API contract, review scheduling or Dataset V2 files are
  changed.

## 8. UX/UI Contract

- Use the VocabFlow design tokens and primary color `#635BFF`.
- Keep a centered content column near 1000px with the progress bar above the
  question card, soft surfaces, clear feedback and no session-specific sidebar.
- Keep keyboard hints desktop-only and interactive targets at least 44px high.
- Use semantic question heading, progressbar values, pressed/disabled states,
  focus styling and polite live feedback.

## 9. Domain and Business Rules

- The server queue remains authoritative and is selected by existing setup
  parameters. Reinforcement remains session-local.
- `POST /api/reviews`, `reviewId` idempotency and `expectedRevision` checks
  remain the only persisted progress path.
- Undo is available only before the request is sent. The current API has no
  rollback action; once saving starts, the learner must retry or exit with the
  existing uncertainty warning.

## 10. Test Plan

- Study, Study Setup, exercise card/generator, queue scope and audio behavior.
- Correct/incorrect feedback, save/retry, safe local undo, keyboard shortcuts,
  keyboard suppression below desktop width and route return behavior.
- Typecheck, production build, feature ESLint and whitespace checks.

## 11. Acceptance Evidence

- Study feature tests: 85/85 pass.
- Study feature ESLint: pass.
- Web project typecheck (`tsc -b apps/web/tsconfig.json`): pass.
- Root `pnpm typecheck`: pass.
- Production build: pass.
- No API/database command or deployment was run.
