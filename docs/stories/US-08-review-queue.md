# US-08 — Review Queue

- Status: ACCEPTED / CLOSED
- Batch: BATCH 6 — Review Queue
- Architecture step: Step 8
- Owner: Project Owner
- Last updated: 2026-09-15
- Scope: LEARNER_SCOPED_REVIEW_QUEUE_READ
- Gate note: ACCEPTANCE COMPLETE; US-07 is accepted and closed upstream

## 1. User Story

As an authenticated parent working with an authorized learner, I want the
server to return that learner's deterministic due-and-new review queue so that
later Study-session UX can begin from canonical progress rather than from the
global vocabulary list.

## 2. Problem and Outcome

The accepted US-05 Study slice reads the first enabled vocabulary item only.
That is sufficient for a first-card handoff, but it cannot honor due priority,
sparse progress or the daily session limits. US-08 adds the learner-scoped
read boundary that selects due items and virtual sparse `NEW` items from the
canonical PostgreSQL state.

The success boundary is:

```text
review-queue-ready
```

This story does not implement the Step 9 Study-session state machine. The
queue is an API/data foundation for that later story.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#3--core-learning-loop--session-rules)
  — due/new session rules and queue priority.
- [Family MVP Product Specification](../product/product-spec.md#6--content-persistence--progress-semantics)
  — canonical progress and New/Due semantics.
- [Technical Architecture — Learning Domain & Scheduler](../architecture/technical-architecture.md#8-learning-domain--scheduler)
  — server-owned date, due query, sparse `LEFT JOIN` and stable ordering.
- [Technical Architecture — API Surface](../architecture/technical-architecture.md#10-api-surface-v1)
  — `GET /api/learners/:id/review-queue`.
- [Technical Architecture — Authentication and Authorization](../architecture/technical-architecture.md#6-authentication-household-bootstrap--authorization)
  — authenticated household-to-learner authorization.
- [Technical Architecture — Client State & Cache Policy](../architecture/technical-architecture.md#11-client-state--cache-policy)
  — PostgreSQL remains canonical.
- [Technical Architecture — Implementation Sequence](../architecture/technical-architecture.md#17-implementation-sequence--vertical-slice)
  — Step 8 Review Queue; Step 9 owns Study-session UX.
- [Feature UI Specification — Learner Home](../design/feature-ui-spec.md#3-learner-selector--learner-home)
  — due/new availability and learner context.
- [Feature UI Specification — Progress semantics](../design/feature-ui-spec.md#6-session-summary--progress)
  — New and Due definitions.
- [User Flow — Flashcard](../flow/user-flow.md#3-luồng-học-flashcard)
  — queue precedes card presentation.
- [US-07 Scheduled Review Write](US-07-scheduled-review-write.md)
  — accepted progress/revision persistence contract.

## 4. Dependencies and Acceptance Ordering

- BATCH 0 through US-06 remain accepted baselines.
- US-07 is `ACCEPTED / CLOSED`; its public request/write contract,
  `learner_progress` schema and PostgreSQL CAS behavior are accepted.
- US-08 was accepted with the owner-authorized ordering recorded in the
  historical evidence below.

Dependency classification:

### CONTRACT-STABLE

- Existing authenticated-session and enabled-learner ownership seam.
- Existing enabled vocabulary DTO/content and `vocabularies` table.
- Existing sparse `learner_progress` schema, where missing means virtual `NEW`.
- Existing public revision semantics: a missing row is revision `0`; a stored
  row supplies its canonical revision.

### HISTORICAL ACCEPTANCE-BLOCKED CHECKPOINT

- The queue read is independently accepted, while the persisted review write
  remains governed by the accepted US-07 contract.

### HARD BLOCKERS

None for the Step 8 read/API implementation. The accepted US-07 CAS behavior
is consumed as an upstream contract and is not changed here.

## 5. Input Boundary

```text
authenticated parent session
  + enabled learner authorized through the parent's household
  + enabled vocabulary/progress tables
  + household timezone
  → review-queue-ready
```

The endpoint is:

```text
GET /api/learners/:learnerId/review-queue
```

The learner ID is a route lookup value only. Household identity and the local
review date are server-owned. The client cannot submit `householdId`, `today`,
progress state or queue limits.

## 6. Success Boundary and Response Contract

An authorized request returns HTTP `200`:

```json
{
  "learnerId": "uuid",
  "reviewDate": "YYYY-MM-DD",
  "dueCount": 3,
  "newCount": 10,
  "queue": [
    {
      "vocabulary": { "id": 123, "word": "..." },
      "queueType": "DUE",
      "status": "LEARNING",
      "nextReviewDate": "YYYY-MM-DD",
      "expectedRevision": 4
    }
  ]
}
```

The complete `vocabulary` object uses the existing `VocabularyDto` contract.
`dueCount` and `newCount` are total currently eligible counts; `queue` is the
selected bounded presentation list. A sparse new item has `status: "NEW"`,
`nextReviewDate: null` and `expectedRevision: 0`.

Selection rules:

- Due items are enabled vocabulary joined to progress for the requested
  learner with `next_review_date <= reviewDate`.
- Due order is `next_review_date ASC, vocabulary.id ASC`, capped at 20.
- New items are enabled vocabulary with no progress row for this learner,
  using a learner-scoped `LEFT JOIN`, ordered by `vocabulary.id ASC`, capped at
  10.
- Up to 20 due items are selected first, followed by up to 10 New items that
  remain within the learner's daily New allowance. A high due count does not
  suppress the New candidates.
- Study Setup keeps New enabled whenever the returned queue contains eligible
  New items, even when Due items exist. Review remains Due-only; Mixed takes the
  requested count from Due-first queue order.
- Missing progress is never treated as an error.

## 7. API and Authorization Contract

- No session returns `401 UNAUTHORIZED`.
- Missing, disabled or cross-household learner returns
  `403 HOUSEHOLD_ACCESS_DENIED` without disclosing another household.
- Database/date/serialization failures return the established safe `503
  INTERNAL_ERROR` envelope.
- Browser code never connects directly to PostgreSQL or Neon.
- The endpoint performs no writes and does not change US-07 idempotency, CAS,
  scheduler or persistence behavior.

## 8. UI Scope

US-08 adds no new Study-session interaction, reinforcement, summary or
browser-visible session state. Existing US-05 first-card UI remains the
accepted Step 4 slice. Step 9 will consume this queue for card progression,
save states, retry and reinforcement.

## 9. Data and Persistence Scope

- Read-only access to existing `vocabularies`, `learner_progress` and
  household timezone data.
- No schema change, migration, reset change, seed change or privilege change.
- No client-local progress is canonical.

The acceptance-evidence hardening change adds only test and Trusted DB
orchestration coverage. It does not change the queue product contract or the
US-07 write path. The canonical Trusted DB `full` suite remains the default;
the explicit `us08-review-queue` selector exists so US-08's PostgreSQL read
semantics can be validated independently while US-07's known CAS failure is
still open. Neither suite was run by this change.

## 10. Acceptance Criteria

- T08-01: The exact endpoint is an authenticated same-origin GET.
- T08-02: Learner authorization resolves session user → household membership →
  enabled learner before queue data is returned.
- T08-03: Cross-household, disabled and missing learners return safe `403`
  behavior without data disclosure.
- T08-04: The server derives one household-local `reviewDate`; the client does
  not provide date authority.
- T08-05: Due selection uses only the requested learner's progress and enabled
  vocabulary, with stable date/id ordering.
- T08-06: Sparse new selection uses a learner-scoped `LEFT JOIN`, stable ID
  ordering and virtual `NEW` revision `0`.
- T08-07: Due items precede New items; due is capped at 20 and New at 10; due
  count does not suppress otherwise quota-eligible New items.
- T08-08: The response exposes canonical learner ID, counts, queue type,
  vocabulary DTO, status, next review date and expected revision.
- T08-09: Empty due/new data returns a valid empty queue, not a synthetic
  session or error.
- T08-10: Malformed canonical database rows and date failures fail safely
  without leaking internals.
- T08-11: No schema/migration/US-07 write-path behavior changes are introduced.
- T08-12: Focused service/API tests and all repository local regression gates
  pass.

## 11. Test Strategy

- Shared contract parsing and response-shape coverage.
- API `401`, `403`, `200` and safe internal-error mapping.
- Due ordering, total counts and 20-item cap.
- Sparse new `LEFT JOIN`, virtual `NEW`, revision `0`, 10-item cap, due-first
  priority and New availability while Due exists.
- Household timezone boundary and deterministic date binding.
- Empty queue and malformed-row safety.
- Existing unit, E2E, lint, typecheck, build, Drizzle and diff checks.
- Trusted DB remains required for queue acceptance because PostgreSQL runtime
  semantics are part of the read contract. This hardening task adds explicit
  authorization, date-boundary, ordering/cap, sparse-NEW, BIGINT and
  read-only live fixtures, but does not run them.

## 12. Historical Acceptance Evidence Hardening Checkpoint

- P2-1 authorization coverage is closed with queue-specific cross-household,
  disabled-learner and missing-learner cases; the live suite uses distinct
  PostgreSQL fixtures for each outcome.
- P2-2 future-progress exclusion is asserted in the live queue fixture.
- P2-3 timezone coverage crosses the UTC/local-date boundary using
  `America/Los_Angeles` at `2026-09-15T01:00:00Z`.
- P2-4 ordering and cap coverage is implemented with real fixtures for 19, 20
  and 21 due items, including NEW overflow and suppression. A follow-up
  technical review identified that due progress insertion order must also be
  deliberately noncanonical to prove order-before-LIMIT; that narrow fix is
  now implemented and pending technical re-review.
- P2-5 queue-specific unsafe persisted BIGINT revision handling fails closed;
  the live fixture also proves ordinary large and `Number.MAX_SAFE_INTEGER`
  revisions round-trip without precision loss.
- The new `scripts/test-review-queue-db.ts` suite is selected only through
  `TRUSTED_DB_SUITE=us08-review-queue` or the matching manual workflow choice.
  The default `full` path preserves the existing US-07 suite and never
  silently skips it.
- This checkpoint is evidence preparation only: Trusted DB has not run, Core
  CI has not run, US-07 remains `IN PROGRESS / BLOCKED`, and US-08 remains
  `IN PROGRESS` pending evidence-delta technical re-review and owner
  acceptance.

### 12.1 Historical Trusted DB failure and harness fix-forward

- The first scoped Trusted DB run, `34941415887`, checked out immutable
  candidate `54a029f333dcee7abfa825e9991d8d61797e87e4` exactly, then failed
  with PostgreSQL SQLSTATE `42601` at
  `verify-us08-review-queue` / `us08-authorization-cases` /
  `us08-fixture-auth-a`.
- Diagnosis confirmed a harness-only `vocabularies` fixture INSERT arity
  defect in `seedFixture()`: `content_version` was listed as a target column
  without a matching expression. The local fix omits that target column and
  preserves the schema default `content_version = 1`.
- The failure occurred before `createReviewQueueService` or any queue
  assertion executed. Product live evidence was not reached. The failed
  candidate remains `FAILED / RETIRED`; it is not amended or reused.
- The harness fix is local only and has not produced a new candidate. Future
  technical review, Core CI and scoped Trusted DB evidence are required.
  US-08 remains `IN PROGRESS / BLOCKED`; US-07 remains blocked with its CAS
  P1 open, and US-09 has not started.

## 13. Explicit Out of Scope

- Any change to `POST /api/reviews`, scheduler, idempotency, CAS or event
  persistence.
- Study-session state machine, card progression, recall buttons, save-pending,
  retry, stale-revision recovery or reinforcement.
- Session summary, progress dashboard, vocabulary list UI or reset progress.
- Product schema/migration/seed/privilege changes. The Trusted DB workflow
  gained only the explicit suite selector needed to dispatch this evidence
  scope; it does not alter the canonical default path.
- Offline write queue, client-authored progress, study session persistence,
  learner authentication or US-07 CAS diagnosis.

## 14. Implementation Evidence

Implementation and local validation are recorded in `docs/ai-progress.md` and
`docs/changelog.md`. US-08 is accepted and closed at the
`review-queue-ready` boundary while the project still carries `UPSTREAM
US-07 CAS ACCEPTANCE DEBT`.

## 15. Acceptance Closeout

- Accepted candidate: `bb91e01073dd156602cddb5bb98948ce06659bbe`.
- Core CI: run `34970869460`, exact candidate SHA, PASS.
- Trusted DB: run `34971985883`, suite `us08-review-queue`, requested and
  checked-out SHA exactly equal to the accepted candidate, PASS.
- Owner Acceptance: `OWNER_ACCEPT_US08`.
- Final merge: PR #7 merged into `main` at
  `2e8dd0f30754969f86fb00933813dcebbbe342d5`, with the accepted candidate as
  the second parent.
- US-08 findings: P0 = 0, P1 = 0, P2 = 0.
- Success boundary: `review-queue-ready` achieved; US-08 is
  `ACCEPTED / CLOSED`.
- The reset evidence limitation remains explicit: all six fixture cleanup
  operations completed and `us08-reset` was invoked, but final reset state is
  not independently proven because no distinct reset-completion marker was
  emitted.
- US-07 is `ACCEPTED / CLOSED`. US-09 is the next active story at Architecture
  Step 9.
