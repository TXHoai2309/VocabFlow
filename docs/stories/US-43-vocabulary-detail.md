# US-43 — Vocabulary Detail

- Status: IN PROGRESS
- Priority: Owner-reprioritized for implementation on 2026-10-02 while US-42 remains open; US-42 work resumes after this review.
- Owner: Project Owner
- Last updated: 2026-10-02
- Baseline commit: `ecba98126e6ea7629e720c4c2a881a45a6b1d409`

## 1. User Story

As a parent or learner using the active learner context, I want to open an
enabled vocabulary item and review its available content and learning status so
that I can understand the word and continue to the existing study flow.

## 2. Outcome

An authenticated, responsive, read-only vocabulary detail page uses the current
learner vocabulary read model and the established AppShell. It does not create
parallel content, learning metrics, or persistence behavior.

## 3. Source of Truth References

- Product Specification, vocabulary and learner progress behavior.
- Technical Architecture, authenticated learner-scoped vocabulary reads.
- Global Design System, tokens, split view, responsive and accessibility rules.
- Feature UI Specification §6 and §7.
- User Flow, vocabulary list and study routes.
- US-22 Vocabulary List and US-23 Missing Media / Dataset Vertical Slice.

## 4. Dependencies

- US-22 Vocabulary List (`IMPLEMENTED`).
- Existing `/api/learners/:learnerId/vocabulary` read endpoint.
- Existing active learner context, AppShell, pronunciation audio hook and
  `/study` route.

## 5. In Scope

- Add `/vocabulary/:vocabularyId` inside the authenticated AppShell and provide
  a link to it from each vocabulary list row.
- Render available word, IPA, Vietnamese meaning, English definition/example,
  image, audio, topic, grade and active learner status/review date.
- Derive related words only from returned vocabulary with the same topic.
- Keep absent media and unsupported content visibly safe.
- Match the provided detail-screen reference using existing design tokens.

## 6. Out of Scope

- API or database changes, vocabulary authoring, favorite/save persistence,
  translations for examples, synonym/antonym content, POS metadata, per-word
  review counts, last-studied timestamps or mastery percentages.
- New topic-specific or vocabulary-specific study route semantics.

## 7. Acceptance Criteria

- AC-01: A valid item in the active learner's enabled vocabulary list renders at
  `/vocabulary/:vocabularyId`; invalid, disabled, or unavailable ids show a
  recoverable not-found state.
- AC-02: The page stays inside the shared authenticated AppShell, marks
  Vocabulary active, and its back action returns to `/vocabulary`.
- AC-03: Displayed content and related items come from the learner vocabulary
  response. Related words share the current word's topic.
- AC-04: Missing optional fields use explicit empty states; no sample data or
  derived mastery/review counts are presented as real learner facts.
- AC-05: Pronunciation uses the existing audio hook; study action uses the
  existing `/study` route. Save is visibly unavailable because favorites are
  outside the accepted product scope.
- AC-06: Desktop uses a hero/content column and contextual right column;
  tablet stacks the contextual cards and mobile stacks all content without
  horizontal overflow. Controls remain keyboard accessible with visible focus.

## 8. UX/UI Contract

- Route: `/vocabulary/:vocabularyId`.
- Layout: AppShell + responsive split view; detail content is read-only.
- Tokens: canonical `--color-primary`, surface, border, spacing, typography,
  card radius, and focus tokens.
- Loading, request error/retry, not-found, missing-media, and missing-content
  states are explicit.

## 9. Domain and Business Rules

- The existing learner vocabulary endpoint is canonical for item visibility,
  learner status and next review date.
- Only words returned for the active learner may render or appear as related.
- Same-topic matching uses existing `topic` values; no synonym or POS inference.
- A next-review date is not a last-studied date, review count, or mastery score.

## 10. API Contract

- Read only: `GET /api/learners/:learnerId/vocabulary` with session credentials.
- No new endpoint, request field, response field, or error code.

## 11. Authorization and Security

- Preserve the existing session and household/learner ownership enforcement in
  the canonical API. No client-side API data is treated as authority for other
  learners.

## 12. Data and Persistence Contract

- No schema or persistence changes. Favorites and per-word metrics remain
  unavailable and are not simulated.

## 13. Error and Recovery Matrix

| Situation | Expected behavior | Recovery |
|---|---|---|
| API loading | Show status text | Wait for response |
| API request fails | Show safe error | Retry the same learner-scoped request |
| Item absent from response | Show not-found state | Return to vocabulary list |
| Missing image/audio/text | Use a neutral placeholder/empty state or disable the unavailable action | Continue reviewing other available content |

## 14. Concurrency and Idempotency

Read-only; no mutation semantics apply.

## 15. Test Plan

- Page rendering, available and missing data, related-topic filtering, request
  error/retry, invalid id, and authenticated route/AppShell navigation.
- Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and
  `git diff --check`.

## 16. Expected Files and Modules

- `apps/web/src/App.tsx`.
- `apps/web/src/features/learners/vocabulary-list-page.tsx`.
- New vocabulary detail page and focused tests.
- `apps/web/src/styles.css`.
- Story index, roadmap, changelog and AI progress record.

## 17. Implementation Sequence

1. Add the route and learner-scoped data read.
2. Compose the detail screen from current AppShell and design tokens.
3. Add safe missing-data and related-word states.
4. Verify focused behavior, then run full project validation.

## 18. Definition of Done

- Acceptance criteria pass with no backend or database changes.
- Focused and full validation complete; no commit, push, or deployment.

## 19. Open Questions and Blockers

- Owner review may decide whether future vocabulary content should add
  Vietnamese definitions/translations, part of speech, synonyms/antonyms,
  favorites, or per-word progress metrics.

## 20. Acceptance Evidence

- Focused tests: 27 passed across the detail and application route suites.
- Full checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (65 files / 753
  tests), `pnpm build`, and `git diff --check` pass.
- Owner review pending. No commit, push, deployment, or database command.
