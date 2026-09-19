# US-33 — Image to Word Exercise

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Scope: extend the existing `/study/exercises` interaction layer; no second
  exercise subsystem or progress store.

## User story

As a learner, I want to see an image and choose the matching English word so I
can practise recognizing vocabulary from visual cues.

## Contract

- Exercise type is `IMAGE_TO_WORD`.
- The target must have a nonblank `imageUrl` and three safe English distractors
  from the admitted queue. Candidate labels are normalized-unique, nonblank,
  non-self and deterministically ordered; the correct word appears once.
- Before submission the UI shows the image, a neutral instruction and the
  candidate words. The image uses neutral alt text (`Vocabulary exercise image`)
  and never exposes the target through alt text, prompt or metadata.
- Missing image or insufficient candidates never selects `IMAGE_TO_WORD`.
- A broken image performs one deterministic fallback to `TYPE_WORD` with a
  non-image cue, then to meaning choice or Flashcard if needed. It does not
  create a review or mark the item `FORGOTTEN`.
- One answer locks the choice. A correct/incorrect answer is written through
  the canonical review API as `REMEMBERED`/`FORGOTTEN`; save-before-next,
  retry, reinforcement, summary and learner isolation remain unchanged.

## Out of scope

- Image upload, catalog editing, image download or provider-specific storage.
- A separate exercise-results table, scheduler rule or learner-progress model.
