# US-10 — Reusable Flashcard Front State

- Status: IN PROGRESS
- Implementation: COMPLETE — READY FOR OWNER CHECK
- Batch: BATCH 7 — Flashcard Session UX refinement
- Architecture slice: Step 9 — Flashcard session UX
- Owner: Project Owner
- Last updated: 2026-09-16
- Scope: REUSABLE_FLASHCARD_PRESENTATION
- Success boundary: `flashcard-ready`

## 1. User Story

As the active learner, I want to see the English word before seeing its
meaning so that I can recall it before flipping the card.

## 2. Source of Truth References

- [US-05 First Real Flashcard](US-05-first-real-flashcard.md) — accepted
  front/back content visibility and keyboard interaction.
- [US-09 Flashcard Session UX](US-09-flashcard-session-ux.md) — accepted Study
  flow, review controls, reinforcement and summary behavior.
- [Feature UI Specification — Study](../design/feature-ui-spec.md#4--study--flashcard)
  — focused layout and front/back content rules.
- [Global Design System](../design/design-system.md) — reusable domain
  component, mobile-first layout, focus-visible and responsive requirements.
- [User Flow — Flashcard](../flow/user-flow.md#3-luồng-học-flashcard) — flip
  before answer and Study card progression.

## 3. Boundaries

### Input boundary

```text
VocabularyDto from the accepted Study queue
  + controlled flipped state
  + flip callback
  → flashcard-ready
```

The component is presentation-only. It does not author learner, household,
review, scheduler or persistence state.

### Success boundary

Study renders the reusable Flashcard component. Before flip, the DOM contains
only the English word, the flip affordance and explicitly allowed manual audio.
After flip, the component renders the Vietnamese meaning and approved optional
content. Existing Study controls remain outside the component.

## 4. In Scope

- Reusable feature-owned `Flashcard` component consumed by Study.
- English word on the front; no Vietnamese meaning, definition, example, IPA,
  topic or image before flip.
- Manual audio affordance when an audio URL exists; no autoplay.
- Vietnamese meaning and non-empty approved optional content on the back.
- Existing click/touch and Space flip behavior, semantic labels and
  focus-visible styling.
- Existing optional image failure fallback and audio-unavailable state.
- Mobile/desktop responsive card structure using the existing Study layout
  tokens and classes.

## 5. Out of Scope

- Review queue selection, `POST /api/reviews`, scheduler, persistence,
  reinforcement, summary metrics or authorization changes.
- New backend routes, schema, migrations, database behavior or Trusted DB
  infrastructure.
- New content fields, audio/image assets, autoplay or US-11.

## 6. Acceptance Criteria

- T10-01: A reusable Flashcard component is created and used by Study.
- T10-02: The front shows the English word and only content explicitly allowed
  before flip.
- T10-03: Meaning/answer-bearing content is absent from the DOM before flip and
  appears only after the learner flips the card.
- T10-04: The component preserves mobile/desktop responsive structure,
  focus-visible accessibility and the existing Design System treatment.

## 7. Implementation and Validation Evidence

The presentation and media logic is extracted to
`apps/web/src/features/study/flashcard.tsx`. Focused tests cover front DOM
absence, back optional content, click/Space flip, image fallback, responsive
structural classes and Study composition. No backend or database code changed;
Trusted DB is not required.

## 8. Closeout

Implementation and local validation are complete. US-10 is ready for owner
check; US-11 has not started.
