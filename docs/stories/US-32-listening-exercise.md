# US-32 — Listening Exercise

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-12 audio pronunciation, US-14 queue, US-13 scheduler/review
  write, US-15 reinforcement, US-16 save-before-next, US-17 safe retry and
  US-19 session summary.
- Implementation: controlled `/study/exercises` mode; the existing `/study`
  Flashcard and audio behavior remain supported.

## User story

As a learner, I want to hear a pronunciation and choose the matching English
word so that I can practice listening.

## Gap audit

- `T32-01`–`T32-04`: `MISSING` — there was no listening exercise type, hidden
  target presentation or candidate generator.
- `T32-05`–`T32-07`: `PARTIAL` — `audioUrl` and robust Flashcard audio cleanup
  already existed, but exercise eligibility, broken-media fallback and the
  explicit no-SpeechSynthesis contract did not.

## Canonical behavior

- Exercise type is `LISTENING_CHOICE`.
- The pre-answer presentation contains only an accessible generic audio
  control, instruction and four English candidate buttons. The target word,
  meaning, IPA and other answer-revealing Flashcard back content are not shown
  in the prompt. The target is necessarily one of the candidate choices.
- A target is eligible only when `audioUrl.trim()` is non-empty and three safe,
  unique word distractors are available from the current queue. Missing or
  insufficient media/candidates falls back to Flashcard.
- Candidate words are normalized for uniqueness and the target vocabulary ID
  is never used as its own distractor.

## Media behavior

- Playback reuses the accepted pronunciation audio hook: one active audio at a
  time, previous playback is stopped before new playback, and transition or
  unmount cleanup stops the active element.
- A playback error is non-destructive. The item changes to the existing
  Flashcard presentation, with no review submission and no automatic
  `FORGOTTEN` result. The learner is not trapped.
- `SpeechSynthesis` is not used. No fabricated or text-to-speech fallback is
  introduced.

## Submission and scheduler mapping

- One selected option locks the exercise and shows feedback. Correct maps to
  `REMEMBERED`; incorrect maps to `FORGOTTEN` through the existing
  `POST /api/reviews` path.
- The exercise waits for the canonical review save before showing Continue.
  Save failure preserves the selected answer and reuses existing idempotency
  retry semantics. Forgotten continues through existing session-local
  reinforcement and existing summary metrics.
- No `exercise_progress`, exercise interval or parallel mastery state is
  created. Queue admission remains enabled vocabulary plus assigned learning
  set plus scheduler eligibility plus daily New limit.

## Accessibility and evidence

The audio control has a generic accessible label that does not reveal the
target. Options are native keyboard-accessible buttons with visible selected,
disabled and text feedback states. Focused generator/card/Study tests and E2E
coverage include missing audio, broken audio fallback, mapping, save failure,
retry and learner-scoped review behavior.
