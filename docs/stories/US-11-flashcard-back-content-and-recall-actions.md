# US-11 — Flashcard Back Content & Recall Actions

- Status: IN PROGRESS
- Implementation: COMPLETE — READY FOR OWNER CHECK
- Batch: BATCH 7 — Flashcard Session UX refinement
- Architecture step: Step 9 — Flashcard session UX
- Owner: Project Owner
- Last updated: 2026-09-16
- Scope: FLASHCARD_BACK_CONTENT_AND_RECALL_ACTIONS
- Success boundary: `flashcard-revealed`

## 1. User Story

As the active learner, I want to flip a flashcard to see its IPA, Vietnamese
meaning and supporting content when needed.

## 2. Source of Truth References

- [US-05 First Real Flashcard](US-05-first-real-flashcard.md) — accepted
  front/back content visibility, optional media and keyboard interaction.
- [US-09 Flashcard Session UX](US-09-flashcard-session-ux.md) — accepted Study
  flow, recall actions, reinforcement and summary behavior.
- [US-10 Reusable Flashcard Front State](US-10-reusable-flashcard-front-state.md)
  — accepted reusable component and answer-free front boundary.
- [Feature UI Specification — Study](../design/feature-ui-spec.md#4--study--flashcard)
  — card content rules and post-flip recall actions.
- [Global Design System](../design/design-system.md) — feature-owned component,
  responsive layout, focus-visible accessibility and touch targets.
- [Vocabulary contract](../../packages/contracts/src/index.ts) — nullable
  optional content fields and required Vietnamese meaning.

## 3. Boundaries

### Input boundary

```text
VocabularyDto from the accepted Study queue
  + controlled flipped state
  + existing Study flip callback and review state
  → flashcard-revealed
```

The Flashcard remains presentation-only. Study retains active learner context,
review writes, reinforcement, session metrics and recall-action ownership.

### Success boundary

After the learner flips, the reusable Flashcard renders the English word and
required/available back content. Study renders Remembered/Forgotten controls
only in the flipped state and preserves the accepted server-confirmed review
flow.

## 4. In Scope

- Front-to-back state of the reusable `Flashcard` component.
- English word remains visible on the back.
- IPA appears only when non-null and non-empty.
- Vietnamese meaning appears on the back.
- Definition, example, topic and image appear only when available; missing
  optional fields do not create empty placeholders.
- Failed optional images are hidden while preserving the back content, with
  meaningful alternative text for a loaded image.
- Remembered/Forgotten controls remain hidden before flip and visible only
  after flip, with existing Study disabled/pending and reinforcement behavior.
- Existing click/touch and Space flip, focus-visible accessibility and mobile /
  desktop responsive presentation.

## 5. Out of Scope

- Review queue selection, `POST /api/reviews`, scheduler, persistence,
  authorization or session metric redesign.
- New API routes, schema, migrations, vocabulary fields or database behavior.
- Autoplay, new media assets, offline writes or US-12.

## 6. Acceptance Criteria

- T11-01: The reusable Flashcard supports front → back state.
- T11-02: IPA and Vietnamese meaning appear on the back according to their
  availability/required contract.
- T11-03: Optional image, definition and example appear only when available,
  with image fallback/error handling preserved.
- T11-04: Remembered/Forgotten controls are absent before flip and available
  only after flip without duplicate review writes or flow changes.

## 7. Implementation and Validation Evidence

The reusable component at
`apps/web/src/features/study/flashcard.tsx` owns the front/back presentation
and optional media fallback. Study continues to own the recall controls and
accepted US-09 review/reinforcement flow. Focused tests cover front isolation,
back content, present/absent optional fields, image fallback, flip interaction,
post-flip controls and Study composition. No backend or database code changed;
Trusted DB is not required.

## 8. Closeout

Implementation and local validation are complete. US-11 is ready for owner
check; US-12 has not started.
