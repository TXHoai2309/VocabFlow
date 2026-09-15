# US-09 — Flashcard Session UX

- Status: IN PROGRESS
- Implementation: COMPLETE — READY FOR OWNER CHECK
- Batch: BATCH 7 — Flashcard Session UX
- Architecture step: Step 9
- Owner: Project Owner
- Last updated: 2026-09-15
- Scope: QUEUE_BACKED_FLASHCARD_SESSION
- Success boundary: `study-session-ready`

## 1. User Story

As an authenticated parent working with an authorized learner, I want a
focused flashcard session built from the learner's canonical review queue so
that I can answer cards, save scheduled reviews safely and see a session
summary without losing unsaved work.

## 2. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#3--core-learning-loop--session-rules)
  — due/new rules, scheduled versus reinforcement evaluation and lifecycle.
- [Technical Architecture — Client State & Cache Policy](../architecture/technical-architecture.md#11-client-state--cache-policy)
  — server-confirmed writes, retry and stale-revision recovery.
- [Technical Architecture — API Surface](../architecture/technical-architecture.md#10-api-surface-v1)
  — accepted review queue and `POST /api/reviews` boundaries.
- [Technical Architecture — Implementation Sequence](../architecture/technical-architecture.md#17-implementation-sequence--vertical-slice)
  — Step 9 Flashcard session UX.
- [Feature UI Specification — Study](../design/feature-ui-spec.md#4--study--flashcard)
  — focused layout, card content, recall actions and counter semantics.
- [Feature UI Specification — Study save, error and lifecycle](../design/feature-ui-spec.md#5--study-save-error--session-lifecycle)
  — pending/failed states, retry, stale recovery, reload and reinforcement.
- [User Flow — Flashcard](../flow/user-flow.md#3-luồng-học-flashcard)
  — queue, card, POST review and summary flow.
- [US-07 Scheduled Review Write](US-07-scheduled-review-write.md)
  — accepted scheduled-review write contract.
- [US-08 Review Queue](US-08-review-queue.md)
  — accepted canonical queue contract.

## 3. Boundaries

### Input boundary

```text
authenticated parent session
  + active learner resolved through household authorization
  + accepted GET /api/learners/:learnerId/review-queue
  + accepted POST /api/reviews
  → study-session-ready
```

The client does not author household identity, review date, scheduler output or
canonical progress. The queue is fetched when Study opens; the in-memory
session is not resumed after reload or close.

### Success boundary

The Study route presents a due-first queue, supports a flip-and-recall loop,
advances only after a server-confirmed scheduled review, supports bounded
session-local reinforcement and ends with an ephemeral summary.

## 4. In Scope

- Queue-backed Study route using the active authorized learner.
- Due-before-new presentation and the accepted 20 due / 10 new queue rules.
- English-only front; Vietnamese meaning on the back; optional IPA, media,
  definition and example handling.
- Manual audio playback with a non-crashing unavailable state.
- Remembered/Forgotten actions only after flip; no Skip action.
- Save-pending state that disables recall actions and holds the card.
- Retry of network/5xx failures with the same `reviewId` and exact request
  payload.
- `401`, `403`, stale revision and idempotency-conflict recovery using the
  accepted server contracts.
- Server-confirmed `x/N` session counter and ephemeral summary metrics.
- Forgotten scheduled cards reinserted as session-local reinforcement at most
  twice per item, with no extra API write or long-term scheduler change.
- Leave confirmation when a pending or failed answer could be lost.

## 5. Out of Scope

- New API routes, schema changes, migrations, reset changes or database writes
  outside the accepted US-07 endpoint.
- `study_sessions` persistence, resume after reload, offline write queues or
  client-authored progress.
- Progress dashboards, vocabulary management, reset UX or US-10.
- New scheduler semantics, review queue selection semantics or authorization
  rules.

## 6. Acceptance Criteria

- T09-01: Study fetches the active learner's canonical review queue and keeps
  due items before new items.
- T09-02: The front hides Vietnamese meaning; the flipped back presents the
  required meaning and optional content without crashing on missing media.
- T09-03: Recall actions are unavailable before flip and are mutually exclusive
  Remembered/Forgotten choices after flip.
- T09-04: Scheduled answers POST the accepted review request and advance only
  after HTTP 200/201 server confirmation.
- T09-05: Save-pending and save-failed states hold the card; retry reuses the
  same review identity and payload.
- T09-06: A stale revision reloads canonical queue state, does not count the
  rejected answer and requires re-answering a still-relevant card.
- T09-07: A Forgotten scheduled card may receive at most two session-local
  reinforcement attempts; reinforcement never calls `POST /api/reviews`.
- T09-08: The session counter and summary use only server-confirmed scheduled
  reviews plus session-local reinforcement metrics.
- T09-09: Auth/access failures have safe recovery paths and no cross-household
  disclosure.
- T09-10: Leaving with pending/failed work is guarded; reload does not resume
  the in-memory session.
- T09-11: Existing US-01 through US-08 behavior remains green and no US-10
  behavior is introduced.

## 7. Implementation and Validation Evidence

Implementation is in the web Study feature and its client adapters. Focused
US-09 tests cover queue ordering, front/back presentation, confirmed writes,
same-payload retry, stale recovery, reinforcement limits, empty state and
learner-context routing. The E2E study coverage uses the accepted queue and
review endpoints.

This is a UI/client-composition slice over accepted API contracts. It does not
change schema, migrations or real database behavior; therefore the Trusted DB
gate is **NOT REQUIRED** for US-09. Required local evidence is focused tests,
full tests, lint, typecheck, build, E2E, Drizzle check and `git diff --check`.

## 8. Closeout

Implementation and local validation are complete. US-09 is ready for owner
check; owner acceptance remains pending. US-10 has not started.
