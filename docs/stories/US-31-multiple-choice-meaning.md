# US-31 — Multiple Choice Meaning

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-14 queue, US-13 scheduler/review write, US-15 reinforcement,
  US-16 save-before-next, US-17 safe retry and US-19 session summary.
- Implementation: controlled `/study/exercises` mode; the existing `/study`
  Flashcard path remains unchanged.

## User story

As a learner, I want to choose the correct Vietnamese meaning for an English
word so that I can practice recognition.

## Gap audit

- `T31-01`–`T31-07`: `MISSING` — there was no exercise representation, option
  generator, single-submit UI or exercise feedback.
- `T31-08`: `ALREADY_SATISFIED` at the architecture boundary — the existing
  `POST /api/reviews` already owns recall mapping, authorization, revision,
  idempotency and atomic progress/event writes.

## Canonical behavior

- Exercise type is `MULTIPLE_CHOICE_MEANING`.
- The prompt is the English word and the exercise has exactly four Vietnamese
  options when safe candidates exist: one correct option and three deterministic
  distractors.
- Options are generated from the current server-admitted queue. Candidate
  meanings are normalized with Unicode normalization, whitespace folding and
  case folding. Blank values, the target vocabulary ID, exact normalized
  duplicates and conservative multi-sense overlaps are excluded.
- If three safe distractors cannot be found, the item falls back to the
  existing Flashcard interaction; duplicate or fabricated options are never
  created.
- The correct option identity stays in the exercise controller state and is
  not rendered as a pre-answer answer key or data attribute. This is a small
  client-side integrity boundary appropriate to the current architecture, not
  an anti-cheat system.

## Submission and scheduler mapping

- A selected option locks the options immediately and produces visible correct
  or incorrect feedback.
- Correct maps explicitly to `REMEMBERED`; incorrect maps to `FORGOTTEN`.
- The UI calls the existing `POST /api/reviews` path only. It never writes
  `learner_progress` directly.
- The card advances only after the canonical review response is saved. A save
  failure keeps the answer and retries the same `reviewId` and request payload.
- Forgotten items continue through the existing session-local reinforcement;
  reinforcement does not create a second scheduler write.

## Accessibility and known boundary

Options are native buttons inside a labelled fieldset with selected, disabled,
focus and text feedback states. The four-option layout remains readable on
mobile and desktop. Semantic ambiguity is handled conservatively by deterministic
normalization; human review is still required for meanings that are related but
not captured by the documented overlap rule.

## Evidence

Focused generator/card/Study tests, full tests, lint, typecheck, build and E2E
coverage are required before owner check. No database schema or progress
semantics change is part of this story.
