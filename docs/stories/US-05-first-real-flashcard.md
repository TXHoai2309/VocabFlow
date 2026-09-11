# US-05 — First Real Flashcard

- Status: ACCEPTED
- Batch: BATCH 3 — First Study Experience
- Owner: Project Owner
- Last updated: 2026-09-11
- Baseline commit: `3a515df66e469f0a4ee7ffce73ffde19ab05b27e`
- Scope: MINIMAL_FIRST_CARD_SLICE — OWNER APPROVED

## 1. User Story

As an authenticated parent with a resolved learner context, I want to start a
focused study surface and see one real vocabulary card from the accepted
Starter v1 content so the product can prove the first learning interaction
without inventing progress, scheduler or review behavior.

## 2. Problem and Outcome

US-03 ends at the short-lived `learner-context-ready` handoff and US-04 ends
at the accepted `vocabulary-content-ready` data handoff. The repository does
not yet have a Learner Home, review queue, progress read model or review write
API. US-05 therefore proves the smallest useful bridge from those accepted
handoffs to one real, readable and flippable flashcard.

The story reaches `first-flashcard-ready` when:

- the authenticated user has a currently resolved learner context;
- the client consumes the accepted `GET /api/vocabulary` contract;
- the first enabled vocabulary DTO in deterministic API order is selected;
- the real English word is rendered on the card front;
- flipping reveals the Vietnamese meaning and any available optional content;
- missing optional fields render as intentional absence, never broken
  placeholders or a crash; and
- no learner progress, scheduler, review event or study session is written.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#3--core-learning-loop--session-rules)
  — flashcard front/back behavior, optional media and the later review boundary.
- [Family MVP Product Specification](../product/product-spec.md#7--family-mvp-feature-scope)
  — Learner Home and Study are MVP features, while progress/review semantics
  remain separate contracts.
- [Technical Architecture implementation sequence](../architecture/technical-architecture.md#17-implementation-sequence--vertical-slice)
  — Step 4 is rendering one real Flashcard; scheduler, reviews and queue are
  later steps.
- [Technical API surface](../architecture/technical-architecture.md#10-api-surface-v1)
  — reuse `GET /api/vocabulary`; no new read or write endpoint is required.
- [Client state and cache policy](../architecture/technical-architecture.md#11-client-state--cache-policy)
  — PostgreSQL-backed runtime vocabulary is canonical; no offline write queue.
- [Media Architecture](../architecture/technical-architecture.md#12-media-architecture)
  — media is optional and missing media must not break the card.
- [Global Design System](../design/design-system.md#4-navigation--page-composition)
  — Focused Task pattern, mobile-first layout and reusable components.
- [Feature UI Specification](../design/feature-ui-spec.md#3--learner-selector--learner-home)
  — learner-context entry and the full Learner Home contract.
- [Feature UI Specification](../design/feature-ui-spec.md#4--study--flashcard)
  — Study card content, flip interaction and optional media behavior.
- [Feature UI Specification](../design/feature-ui-spec.md#8--responsive-accessibility--component-mapping)
  — responsive and accessibility requirements for Study.
- [User Flow](../flow/user-flow.md#2-luồng-parent--learner)
  — learner selection precedes learner learning context.
- [User Flow](../flow/user-flow.md#3-luồng-học-flashcard)
  — Learner Home precedes Study; review persistence is a later boundary.
- [US-03 Learner Profile Creation & Resolution](US-03-learner-profile-resolution.md)
  — accepted short-lived `learner-context-ready` input.
- [US-04 Vocabulary Content Seed & Read Foundation](US-04-vocabulary-content-foundation.md)
  — accepted `vocabulary-content-ready` input and `VocabularyDto` contract.

## 4. Dependencies and Input Boundary

- BATCH 0 Foundation is `ACCEPTED` and frozen.
- US-01 Parent Registration, US-02 Parent Login and US-03 Learner Profile
  Creation & Resolution are `ACCEPTED`.
- US-04 Vocabulary Content Seed & Read Foundation is `ACCEPTED` with Core CI
  #28 and Trusted DB Integration #26 SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- Better Auth remains the parent authentication/session authority.
- PostgreSQL remains the runtime source of truth for vocabulary.

The exact input boundary is:

```text
authenticated parent session
  + canonical household context
  + learner-context-ready
  + vocabulary-content-ready
```

`learner-context-ready` supplies a server-resolved learner for product-flow
continuity. It is short-lived client/navigation context, not a new persisted
active-learner record and not authorization by itself. Any later learner-
scoped API must re-authorize from the authenticated session. `GET
/api/vocabulary` remains shared-content access and does not receive a client
learner ID.

## 5. Success Boundary

The single approved output boundary is:

```text
first-flashcard-ready
```

This means one enabled `VocabularyDto` has been fetched from the accepted
PostgreSQL-backed API contract, selected deterministically and rendered in the
Study card front state. It does not mean a study session was persisted, a
review was submitted, or a learner progress row exists.

## 6. In Scope

- A minimal learner-context-to-study-entry handoff required to reach the first
  card.
- A focused Study surface using the approved Focused Task layout pattern.
- Reuse of authenticated `GET /api/vocabulary` and the existing
  `VocabularyDto`/`VocabularyListResponse` contracts.
- Deterministic selection of one enabled vocabulary record.
- Front/back flashcard rendering with pointer/touch and keyboard flip.
- English word on the front; Vietnamese meaning hidden until the card flips.
- Back-side rendering of the word, required Vietnamese meaning and optional
  IPA, definition, example and image only when values are present.
- Optional media safety only; no audio playback control or SpeechSynthesis
  fallback is required in US-05.
- Loading, empty-vocabulary, authentication, authorization, malformed-response,
  network/API error and retry states.
- Short-lived route/navigation context behavior consistent with US-03.
- Mobile, tablet and desktop responsive behavior with no horizontal overflow.
- Accessible labels, semantics, focus-visible behavior, keyboard interaction
  and reduced-motion-safe flip behavior.
- Regression coverage for accepted US-01, US-02, US-03 and US-04 behavior.

## 7. Out of Scope

- A full Learner Home dashboard with due/new counts, progress summary or
  progress metrics.
- Review Queue, due/new prioritization, `learner_progress` reads or virtual
  `NEW` evaluation.
- `Chưa nhớ` / `Đã nhớ` persistence, scheduler execution or reinforcement.
- `review_events`, `POST /api/reviews`, `reviewId`, `expectedRevision` or
  session summary.
- Any database table, migration, seed-content change, privilege change or
  database reset change.
- Any new vocabulary endpoint or write API.
- Random session generation, queue generation or learner-specific vocabulary
  filtering.
- Persistent active-learner storage, `localStorage`, `sessionStorage` or a
  learner ID encoded as durable URL state.
- Dexie vocabulary caching or offline behavior in this first slice.
- Adding audio/image assets, SpeechSynthesis policy expansion or content
  enrichment; the accepted Starter v1 remains unchanged.
- Vocabulary browser/search, progress screen, parent dashboard, edit/delete
  learner, learner PIN, admin CMS, payments, gamification or social features.
- Starting US-06 or any later scheduler/review story.

## 8. Learner Home Decision

### Owner-approved decision: A — minimal navigation/handoff surface

US-05 should include only the smallest entry surface needed to move from the
resolved learner context to the first card. It should not implement the full
Learner Home dashboard.

The full Home contract in the Feature UI Specification requires canonical
due/new availability and progress summary. Those values depend on later
progress and review-queue contracts that are not present in the accepted
repository state. Fabricating counts or a fake due/new state would violate the
PostgreSQL source-of-truth and server-authoritative learning rules.

The approved handoff is a single “Bắt đầu học” action after a valid learner
context is resolved. The action enters the focused Study route. A later story
may own the complete Learner Home once its read contracts exist.

## 9. Route and UI Contract

### Approved route shape

- Reuse the existing React Router and same-origin SPA boundary.
- Add one focused Study route at `/study`.
- The learner-resolution surface supplies the short-lived in-memory/navigation
  context required by the route; no durable learner ID is stored.
- Opening or reloading `/study` without a current learner context returns the
  user to `/learners` to resolve the canonical learner context again.
- Do not add `/dashboard`, `/home`, `/progress`, `/review` or a session-route
  hierarchy for this story.
- Study hides persistent app navigation where the Feature UI Specification
  requires a distraction-reduced focused task.

### Entry, loading and error states

- Session pending: show a neutral loading status; do not render a card.
- No authenticated session: use the existing safe auth boundary and return to
  `/login` as appropriate; do not expose session internals.
- No resolved learner: redirect to `/learners`; do not invent a learner.
- Vocabulary loading: show a focused loading/skeleton state.
- Empty vocabulary: show an intentional empty state and no dead recall controls;
  do not create a session or pretend a card exists.
- `401`: follow the existing safe login/re-auth recovery path.
- `403 HOUSEHOLD_ACCESS_DENIED`: leave the study surface and recover through
  learner resolution; do not expose household details.
- Network, `503`, invalid JSON or contract validation failure: show a safe
  error with Retry; do not render partial or fabricated card data.

### Front state

- The English `word` is the primary visual content.
- Vietnamese meaning, IPA, definition, example and image are not visible on
  the front.
- US-05 does not implement audio playback. When `audioUrl` is `NULL`, no audio
  control is rendered; a future story may define playback for non-null media.
- No `Chưa nhớ`, `Đã nhớ` or other persistence-looking controls appear before
  or after flip in this story.

### Back state

- Keep the English word visible as card context.
- Show required Vietnamese meaning.
- Show IPA only when non-null.
- Show definition and example only when non-null/non-empty.
- Show image only when `imageUrl` exists; missing or failed image hides the
  optional region without breaking layout.
- `topic` is not rendered by this first-card slice; its `NULL` value has no
  effect on card usability.

### Interaction and accessibility

- Pointer/touch activation flips the card.
- A semantic button/control or keyboard-reachable card region supports Space
  activation without double-toggle behavior. Enter may activate through the
  native accessible button/control semantics.
- Space activation prevents inappropriate page scrolling while the focused
  Study control is handling the flip.
- The flip state has a clear accessible label and is announced by state text;
  meaning remains unavailable to assistive technology before flip.
- Focus remains predictable after flip and does not jump unexpectedly.
- Flip animation respects `prefers-reduced-motion`; an instant state change is
  valid.
- Interactive targets are at least 44×44px; content remains readable at the
  mobile 16px gutter and at tablet/desktop readable widths.
- The focused Study surface has no horizontal overflow. Long back-side content
  flows naturally rather than being clipped in a fixed-height card.

### Reload and exit behavior

- Reloading or directly opening `/study` without an active learner context does
  not resume a prior card/session or guess a learner.
- The current short-lived learner context is re-resolved through `/learners`;
  no active learner or card position is persisted in `localStorage`,
  `sessionStorage`, IndexedDB, cookies, backend learner preference or durable
  URL learner state.
- Exiting Study returns to the learner entry/context surface without a review
  confirmation because this story has no pending review write.

## 10. Data and API Contract

US-05 reuses the accepted endpoint without changing its contract:

```text
GET /api/vocabulary
```

- Request uses the authenticated same-origin session with credentials.
- No `householdId` or `learnerId` query parameter is sent.
- The API remains household-gated for authorization but returns shared content
  without learner-owned filtering.
- Response is `{ vocabulary: VocabularyDto[] }`.
- Runtime content comes from PostgreSQL through the API; the browser never
  reads the JSON seed artifact or connects to Drizzle/Neon.
- No new endpoint, request schema, response field, database write or storage
  contract is required.

## 11. Content Selection Rule

The client selects `vocabulary[0]` from the already accepted deterministic
`GET /api/vocabulary` response. US-04 guarantees enabled-only `id ASC`
ordering, so this is the smallest deterministic first-card rule.

US-05 must not add randomization, due/new prioritization, learner-progress
joins, scheduler logic, session queue generation or content fallback from the
source artifact. If the response is empty, the UI remains in an intentional
empty state.

## 12. API and Security Rules

- Better Auth remains the authentication authority.
- The API remains the authorization boundary; client learner context never
  authorizes access by itself.
- No user-controlled learner/household scope is sent to the shared vocabulary
  endpoint.
- No SQL, stack trace, provider response, connection detail, cookie, token or
  secret is rendered or logged by the feature.
- Error copy uses stable safe error handling; UI logic does not parse private
  server messages.
- No client-side write, optimistic progress state or fake saved state exists.

## 13. Acceptance Criteria

- T05-01: An authenticated user with an accepted resolved learner can enter
  `/study` from the minimal “Bắt đầu học” handoff.
- T05-02: Study consumes real accepted `GET /api/vocabulary` content and does
  not read seed files or connect to the database directly.
- T05-03: The first card is selected deterministically as `vocabulary[0]` from
  the API's enabled-only `id ASC` response.
- T05-04: The front displays the English word without exposing Vietnamese
  meaning.
- T05-05: Pointer/touch activation flips the card and reveals the back.
- T05-06: The focused card/study control supports Space flip, with visible
  keyboard focus and no inappropriate page scroll.
- T05-07: The back reveals Vietnamese meaning and valid real content, keeping
  the English word visible.
- T05-08: NULL optional fields render without broken or empty placeholder
  regions; the current Starter v1 card remains intentional with word + meaning.
- T05-09: Missing image/audio produces no broken media UI or dead control; no
  audio playback or SpeechSynthesis fallback is required.
- T05-10: Loading state does not fabricate vocabulary content.
- T05-11: Empty vocabulary produces a safe empty state with no fallback card.
- T05-12: API failure produces a safe retryable error state.
- T05-13: Mobile/desktop layouts have no horizontal overflow and usable
  touch/focus targets.
- T05-14: No progress/review/scheduler/database side effects occur.
- T05-15: Reload/direct Study entry without active learner context returns to
  learner resolution instead of persisting or guessing learner identity.
- T05-16: No functional-looking Remembered/Forgotten workflow is introduced.
- T05-17: US-01/02/03/04 regressions and repository gates remain green.

No criterion in this story evaluates scheduler correctness, review persistence,
due/new queue ordering or session-summary metrics.

## 14. Test Plan

- **Client/API contract:** validate the existing `VocabularyListResponse` and
  `VocabularyDto` parsing, credentials behavior and safe error mapping without
  changing shared contracts.
- **Component tests:** entry handoff, loading, first-card selection, front/back
  visibility, null optional fields, present media fixtures, empty response,
  401/403/API error and Retry.
- **Accessibility tests:** semantic flip control, accessible state/name,
  keyboard Space/Enter behavior, focus-visible behavior, scroll prevention and
  reduced-motion fallback.
- **Responsive/manual tests:** verify 375px, 768px and 1280px behavior, no
  horizontal overflow, readable long back-side content and touch activation.
- **E2E:** authenticated learner resolution → minimal study entry → real API
  vocabulary response → first card → flip; direct/reload Study without context
  returns to learner resolution; API failure and empty states recover safely.
- **Regression:** US-01 registration, US-02 login/bootstrap, US-03 learner
  resolution and US-04 vocabulary API behavior remain green.
- **Security review:** no SQL, database URL, cookie, token, secret, internal
  error or unauthorized learner scope leaks to UI/logs.
- **Repository gates:** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`, `pnpm test:e2e` and `git diff --check`.

## 15. Expected Files and Modules

Implementation areas for this story:

- `apps/web/src/App.tsx` for the focused Study route and existing navigation
  boundary.
- `apps/web/src/features/` for the learner-to-study handoff, vocabulary client
  and Flashcard feature component.
- `apps/web/src/styles.css` for approved responsive/token-based presentation.
- Existing `packages/contracts` vocabulary DTO/response contract; no schema
  change is expected.
- Component, API-client, accessibility, responsive and Playwright tests.

No `apps/api`, `drizzle`, `config`, `scripts`, dependency or CI/workflow file is
expected to change for this story.

## 16. Implementation Sequence

1. Implement only after this owner-approved contract is on
   `READY FOR IMPLEMENTATION`.
2. Confirm the existing learner-context handoff can provide short-lived
   navigation context without persistence or URL-owned authorization.
3. Add the minimal study-entry route/surface and reuse the existing vocabulary
   API client boundary.
4. Implement deterministic first-card rendering, flip interaction and safe
   optional-field/media states.
5. Add component, accessibility, responsive, E2E and regression evidence.
6. Promote the story only after the owner and Core CI acceptance evidence pass.

## 17. Definition of Done

- T05-01 through T05-17 pass with evidence.
- `first-flashcard-ready` is reachable from accepted learner and vocabulary
  handoffs.
- The first card uses real API content, deterministic selection and safe
  optional-field behavior.
- Study is keyboard/touch accessible, responsive and free of horizontal
  overflow.
- No progress, scheduler, review or database state is written.
- Core CI, local repository gates, E2E and owner manual UI acceptance pass.
- No new Trusted DB gate is required because US-05 changes no schema,
  migration, privilege or database behavior; it relies on accepted US-04
  database evidence.
- US-06 remains unstarted. This story is `ACCEPTED` after owner manual
  acceptance, local gates and Core CI evidence.

## 18. Open Questions and Blockers

- Owner approval has frozen the title, minimal Learner Home decision, `/study`
  route, input boundary and `first-flashcard-ready` handoff name.
- The full Learner Home remains a later scope decision because its due/new and
  progress metrics depend on contracts not yet implemented.
- No implementation blocker is known for the minimal first-card slice.
- Trusted DB is not a new mandatory gate for this story under the repository
  policy because there is no schema, migration, privilege or DB behavior
  change.

## 19. Acceptance Evidence

Final acceptance record. US-05 is `ACCEPTED`; the implementation remains
limited to the approved web route, short-lived learner context, vocabulary read
client, first-card UI and tests. No schema, migration, dependency,
CI/workflow or Neon operation was performed.

### Discovery evidence

- Architecture Step 4 identifies rendering one real Flashcard as the next
  milestone after US-04 vocabulary content.
- US-04 provides accepted `vocabulary-content-ready` and the deterministic
  `GET /api/vocabulary`/`VocabularyDto` boundary.
- US-03 provides accepted short-lived `learner-context-ready` context.
- Full Learner Home metrics are not implementable without later progress and
  review-queue contracts, so the approved slice is the minimal handoff.

### Required final acceptance gates

- Owner-approved contract recorded before implementation.
- Owner manual UI acceptance for the criteria above.
- Local lint, typecheck, tests, build, E2E and `git diff --check` PASS.
- Core CI PASS.
- No new Trusted DB Integration gate unless implementation later changes
  schema, migration, privilege or database behavior.

### Final owner manual acceptance — 2026-09-11

Manual owner acceptance is PASS for the approved core flow:

- T05-01: resolved learner handoff through `Bắt đầu học` → `/study` PASS.
- T05-02/T05-03: real PostgreSQL-backed API read and deterministic first card
  `vocabulary[0]` (`apple`) PASS.
- T05-04: front shows `apple` and hides Vietnamese meaning PASS.
- T05-05/T05-06: pointer/touch flip, Space flip and Space scroll prevention
  PASS.
- T05-07: back shows `apple` + `táo` PASS.
- T05-08/T05-09: nullable optional fields render cleanly; no broken image
  region or dead audio control; no fake Remembered/Forgotten controls PASS.
- T05-12: unavailable `/api/vocabulary` shows safe error; Retry refetches the
  canonical API response and restores the real card PASS.
- T05-13: desktop/mobile owner verification at 375x812 PASS with no horizontal
  overflow.
- T05-14: production scan confirms no learning/DB write side effects PASS.
- T05-15: reload/direct `/study` without active learner context returns to
  `/learners`; active learner is not persisted or guessed PASS.
- T05-10/T05-11: loading and empty states remain accepted through automated
  coverage; no database/content mutation was fabricated for manual evidence.
- T05-16: no functional-looking review controls PASS.
- T05-17: regression and repository gates PASS; Core CI #30 SUCCESS on the
  validated main commit `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.

The owner-provided manual evidence covers the learner-context-ready handoff,
`/study`, the real `vocabulary[0]` card, flip interactions, optional/media
safety, reload recovery, responsive/mobile behavior, safe API error handling
and Retry recovery. T05-01 through T05-17 are all `PASS`.

### Automated/local and CI evidence

- Focused Study/client/routing and learner handoff tests PASS; the full local
  suite is green at 167 tests.
- `pnpm lint` PASS, `pnpm typecheck` PASS, `pnpm build` PASS and
  `pnpm test:e2e` PASS (11/11) after the Space-key flip correction.
- Full automated suite: `167/167` tests PASS.
- `git diff --check` PASS; production scan found no review, progress,
  scheduler or database write side effects.
- Core CI #30: SUCCESS on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28: SUCCESS, recorded as incidental evidence only;
  it is not a required US-05 acceptance gate.
- The E2E path covers authenticated learner resolution → `Bắt đầu học` →
  `/study` → accepted vocabulary read → first card → Space flip, with no
  review write request.
- No implementation path uses `localStorage`, `sessionStorage`, IndexedDB,
  cookies, durable learner URL state, `SpeechSynthesis` or a review endpoint.

### Final acceptance result

- US-05 is `ACCEPTED` and T05-01 through T05-17 are `PASS`.
- Trusted DB Integration is `NOT REQUIRED` for US-05 because no schema,
  migration, seed, privilege or database behavior changed; the successful #28
  run does not change that gate classification.
- The local Node warning remains `22.19.0` versus pinned `22.23.2`; Core CI
  validated the repository-pinned toolchain.

US-06 has not started.
