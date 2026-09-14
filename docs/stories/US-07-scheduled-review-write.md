# US-07 — Scheduled Review Write

- Status: IN PROGRESS
- Batch: BATCH 5 — Scheduled Review Write
- Owner: Project Owner
- Last updated: 2026-09-14
- Baseline commit: `77da0208af433675d28647b12651ad7447287b1a`
- Scope: SCHEDULED_REVIEW_PERSISTENCE_ONLY

## 1. User Story

As an authenticated parent reviewing a vocabulary item for an authorized
learner, I want one scheduled `REMEMBERED` or `FORGOTTEN` evaluation to be
validated, computed by the accepted scheduler and persisted atomically so that
canonical progress and immutable review history remain correct across retries,
concurrency and reloads.

## 2. Outcome

US-07 is the smallest implementation-sized story after the accepted US-06
pure scheduler. It adds the server-authoritative scheduled review write
boundary only. A successful request materializes or advances one canonical
`learner_progress` row and appends one immutable `review_events` record in the
same database operation. A retry with the same semantic request returns the
stored canonical result without executing or persisting the scheduler twice.

The approved output boundary is:

```text
scheduled-review-write-ready
```

Review Queue, session reinforcement and the Study UI remain later stories.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#4--learning-engine)
  — scheduled learning-state transitions and interval rules.
- [Family MVP Product Specification](../product/product-spec.md#6--content-persistence--progress-semantics)
  — canonical PostgreSQL progress and server-confirmed review persistence.
- [Family MVP Product Specification](../product/product-spec.md#8--acceptance-validation--freeze)
  — vertical-slice acceptance and persistence expectations.
- [Technical Architecture — Data Architecture](../architecture/technical-architecture.md#5-data-architecture)
  — schema ownership, sparse progress, virtual `NEW` and constraints.
- [Technical Architecture — Learning Domain & Scheduler](../architecture/technical-architecture.md#8-learning-domain--scheduler)
  — accepted scheduler semantics and the Review Queue boundary that remains
  later.
- [Technical Architecture — Review Write Architecture](../architecture/technical-architecture.md#9-review-write-architecture)
  — request, read/compute/write sequence, idempotency, fingerprint,
  concurrency and atomicity.
- [Technical Architecture — API Surface](../architecture/technical-architecture.md#10-api-surface-v1)
  — `POST /api/reviews` and the stable error envelope.
- [Technical Architecture — Client State & Cache Policy](../architecture/technical-architecture.md#11-client-state--cache-policy)
  — server-confirmed save, retry and stale-revision behavior.
- [Technical Architecture — Testing Strategy](../architecture/technical-architecture.md#14-testing-strategy)
  — contract, service, database, Worker/API and security test layers.
- [Technical Architecture — Migration Rules](../architecture/technical-architecture.md#16-migration-deployment--rollback-rules)
  — additive migration and forward-compatible deployment rules.
- [Technical Architecture — Implementation Sequence](../architecture/technical-architecture.md#17-implementation-sequence--vertical-slice)
  — Step 6 is `POST /api/reviews`; Step 7 is the later cloud-persistence
  milestone; Step 8 is Review Queue.
- [Technical Architecture — Acceptance Gates](../architecture/technical-architecture.md#18-architecture-acceptance-gates)
  — A7 through A11 and A13 through A15.
- [User Flow — Flashcard](../flow/user-flow.md#3-luồng-học-flashcard)
  — scheduled review follows card recall and precedes the next card.
- [User Flow — Save and Error](../flow/user-flow.md#4-luồng-lưu-tiến-trình--lỗi-chính)
  — server confirmation, retry reuse and stale-revision recovery.
- [Feature UI Specification — Study Save](../design/feature-ui-spec.md#5--study-save-error--session-lifecycle)
  — client-visible save/error implications, without adding UI to this story.
- [DEC-003 PostgreSQL source of truth](../decisions.md#dec-003--postgresql-is-the-canonical-runtime-source-of-truth).
- [DEC-012 No offline write queue](../decisions.md#dec-012--no-offline-write-queue-in-family-mvp).
- [DEC-013 Server-authoritative review writes](../decisions.md#dec-013--review-writes-are-server-authoritative-and-idempotent).
- [US-06 Learning Scheduler Domain](US-06-learning-scheduler-domain.md)
  — accepted pure `scheduleReview` input/output and scheduler semantics.
- [US-05 First Real Flashcard](US-05-first-real-flashcard.md)
  — accepted Study handoff; this story adds the deferred save boundary only.

## 4. Dependencies and Input Boundary

- BATCH 0 Foundation is `ACCEPTED` and frozen.
- US-01 through US-05 are `ACCEPTED`.
- US-06 Learning Scheduler Domain is `ACCEPTED / CLOSED` at
  `scheduler-domain-ready`; `scheduleReview` remains pure and unchanged.
- Better Auth session resolution, household membership and the reusable
  learner-ownership seam already exist in `apps/api`.
- Accepted enabled vocabulary is the runtime content source.
- The approved sparse-progress schema and review-event schema are architecture
  contracts, but neither table exists in the current implementation yet.

The approved input boundary is:

```text
authenticated parent session
  + authorized enabled learner
  + enabled vocabulary item
  + scheduler-domain-ready
  + approved sparse-progress architecture
  → scheduled-review-write-ready
```

The endpoint does not require Review Queue to exist. A direct request against a
known enabled vocabulary ID is sufficient to prove the write contract.

## 5. In Scope

- One authenticated `POST /api/reviews` scheduled evaluation.
- Strict shared request validation for `reviewId`, `learnerId`,
  `vocabularyId`, `result` and `expectedRevision`.
- Server-side learner household authorization and enabled vocabulary lookup.
- Sparse missing-row reconciliation to virtual `NEW` with revision `0`.
- Invocation of the accepted US-06 `scheduleReview` function.
- Atomic existing-progress update plus event append.
- Atomic first-review progress insert plus event append.
- `reviewId` idempotency, stored response replay and fingerprint conflict.
- `expectedRevision` optimistic concurrency and stale-write handling.
- Household-local `review_date` and absolute `reviewed_at` ownership.
- Additive application schema/migration for progress, event history, enums,
  constraints and required indexes.
- Application reset and clean-migration participation for the new application
  objects, while preserving protected BATCH 0 metadata and role boundaries.
- Contract, Worker/API, service, database/concurrency and security tests.

## 6. Out of Scope

- Any change to `packages/learning-domain`; scheduler logic is consumed, not
  duplicated or moved into the persistence layer.
- Review Queue endpoint, due/new selection, ordering, limits or `LEFT JOIN`.
- Study-session UX, Recall buttons, save-pending UI, retry UI or E2E browser UI.
- Reinforcement evaluations, session reinsertion, session counters or summary.
- Learner Home metrics, progress dashboard, vocabulary list UI or reset-progress
  user action.
- `GET /api/learners/:id/progress` unless a separately approved read contract
  is required to prove a write response; no broad progress API is introduced.
- Offline write queue, cache conflict synchronization or client-authored state.
- Review-event editing/deletion, analytics or reporting.
- US-08 or any later story.

## 7. Architecture Ownership

| Boundary | Responsibility |
|---|---|
| `packages/learning-domain` | Pure `scheduleReview`; no IDs, revision, `reviewedAt`, HTTP or DB knowledge. |
| `packages/contracts` | Zod request/error/response DTOs after the response decision is approved; no DB implementation. |
| `apps/api` | Authenticate, validate, authorize learner, resolve vocabulary/household timezone, call scheduler and coordinate the write. |
| Drizzle/PostgreSQL | Canonical progress, immutable event history, uniqueness, revision race barriers and atomic commit/rollback. |
| `apps/web` | Out of scope; later Study work consumes the stable API contract. |

The client cannot submit `status`, `consecutiveCorrect`, `intervalDays`,
`firstLearnedDate`, `lastReviewedDate`, `nextReviewDate`, counters,
`reviewDate` or `reviewedAt` as authoritative values.

## 8. Persistence and Schema Contract

The implementation should add one additive application migration after the
accepted `0003` vocabulary migration. The migration tag/name is not frozen by
this discovery task. No seed content changes, protected-schema changes or
BATCH 0 role-model changes are authorized.

### Enums

- `vocabflow_app.learning_status`: `NEW`, `LEARNING`, `MASTERED`.
- `vocabflow_app.review_result`: `REMEMBERED`, `FORGOTTEN`.

### `vocabflow_app.learner_progress`

| Column | PostgreSQL type | Null/default | Contract |
|---|---|---|---|
| `learner_id` | `uuid` | NOT NULL | FK to `learner_profiles.id`; learner ownership is checked before write. |
| `vocabulary_id` | `integer` | NOT NULL | FK to `vocabularies.id`; disabled content is not reviewable. |
| `status` | `learning_status` | NOT NULL DEFAULT `NEW` | Canonical scheduler status. |
| `consecutive_correct` | `bigint` | NOT NULL DEFAULT `0` | Non-negative scheduler counter within the JavaScript safe-integer range. |
| `interval_days` | `bigint` | NOT NULL DEFAULT `0` | Non-negative scheduler interval within the JavaScript safe-integer range. |
| `first_learned_date` | `date` | NULL | Household-local calendar date. |
| `last_reviewed_date` | `date` | NULL | Household-local calendar date. |
| `next_review_date` | `date` | NULL | Household-local due date; NULL only for unscheduled virtual/default state. |
| `total_correct` | `bigint` | NOT NULL DEFAULT `0` | Non-negative scheduler counter within the JavaScript safe-integer range. |
| `total_incorrect` | `bigint` | NOT NULL DEFAULT `0` | Non-negative scheduler counter within the JavaScript safe-integer range. |
| `revision` | `bigint` | NOT NULL DEFAULT `0` | Optimistic-locking revision within the JavaScript safe-integer range. |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Server audit timestamp. |

Required objects:

- `UNIQUE (learner_id, vocabulary_id)` as the canonical progress key and
  concurrent first-review race barrier.
- `INDEX (learner_id, next_review_date)` for the later Review Queue.
- Non-cascading, explicit foreign-key delete behavior for progress/history;
  use the accepted `RESTRICT`/`NO ACTION` policy and never cascade away review
  history through ordinary profile/content operations.
- Checks for non-negative counters, interval and revision values compatible
  with the scheduler/domain invariants.

Scheduler and revision state uses PostgreSQL `BIGINT` so valid JavaScript safe
integers above the PostgreSQL `INTEGER` range remain persistable. The
application invariant is `0 <= value <= Number.MAX_SAFE_INTEGER` where
applicable. BIGINT values are range-checked before conversion to JavaScript
numbers; arbitrary PostgreSQL BIGINT values are not valid application state.

At the revision boundary, `Number.MAX_SAFE_INTEGER - 1` may advance
successfully to `Number.MAX_SAFE_INTEGER`. A write whose current revision is
already `Number.MAX_SAFE_INTEGER` fails closed before scheduler execution or
persistence can create an unsafe resulting revision. The pure scheduler
remains unaware of persistence revisions.

### `vocabflow_app.review_events`

| Column | PostgreSQL type | Null/default | Contract |
|---|---|---|---|
| `household_id` | `uuid` | NOT NULL | Server-owned FK to `households.id`, derived from the authorized learner household; not client-authored. |
| `review_id` | `uuid` | NOT NULL | Canonical client idempotency key within the household namespace. |
| `request_fingerprint` | `text` | NOT NULL | Canonical request fingerprint; `reviewId` is excluded. |
| `learner_id` | `uuid` | NOT NULL | FK to `learner_profiles.id`. |
| `vocabulary_id` | `integer` | NOT NULL | FK to `vocabularies.id`. |
| `result` | `review_result` | NOT NULL | Submitted scheduled result. |
| `previous_status` / `new_status` | `learning_status` | NOT NULL | Immutable transition snapshot. |
| `previous_interval` / `new_interval` | `bigint` | NOT NULL | Immutable transition snapshot within the JavaScript safe-integer range. |
| `expected_revision` / `resulting_revision` | `bigint` | NOT NULL | Concurrency snapshot within the JavaScript safe-integer range. |
| `review_date` | `date` | NOT NULL | Server-derived household-local date. |
| `reviewed_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Server event instant. |
| `response_payload` | `jsonb` | NOT NULL | Canonical response for replay. |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Immutable event audit timestamp. |

Required objects:

- Composite primary key `(household_id, review_id)`; `review_id` is not globally unique.
- `INDEX (learner_id, reviewed_at)` for later history/summary work.
- `INDEX (learner_id, vocabulary_id, reviewed_at)` for later per-word history.
- Immutable application behavior: no update/delete path is added by US-07.

The idempotency namespace is household-scoped. `household_id` is derived from
the already-authorized learner/household relationship, is absent from the
request DTO and semantic fingerprint, and is written only by the server. The
same canonical `reviewId` may therefore exist independently in different
households without collision or cross-household disclosure.

## 9. Sparse NEW and First-Review Contract

The absence of a `learner_progress` row is the canonical virtual `NEW` state:

```text
status = NEW
consecutiveCorrect = 0
intervalDays = 0
revision = 0
firstLearnedDate = null
lastReviewedDate = null
nextReviewDate = null
totalCorrect = 0
totalIncorrect = 0
```

For a missing row, only `expectedRevision = 0` is accepted. The server calls
`scheduleReview` with the virtual state and the household-local review date.
Both `NEW + REMEMBERED` and `NEW + FORGOTTEN` materialize a progress row with
status `LEARNING`, interval `1`, `first_learned_date = review_date`,
`last_reviewed_date = review_date` and `next_review_date = review_date + 1
calendar day`.

The first successful write consumes the virtual revision: with
`expectedRevision = 0`, the inserted progress row and event use resulting
`revision = 1`. Subsequent successful writes increment the current revision
exactly once.

## 10. Review Event Contract

Every successful new review writes one immutable event containing the exact
request identity, previous canonical state, scheduler result, revision
transition, server-owned dates and the canonical response payload. The event
is written in the same atomic operation as the corresponding progress write.

The request fingerprint contains exactly these canonical payload fields:

```text
learnerId + vocabularyId + result + expectedRevision
```

`reviewId` is deliberately not part of the fingerprint. The field order and
canonical encoding must be deterministic; no client-provided scheduler output,
timestamp, database value or extra field may enter the fingerprint.

The stored `response_payload` is authoritative for an idempotent replay, even
if the learner has progressed further by the time the replay arrives.

## 11. POST /api/reviews Request Contract

The request body is strict and contains exactly:

```json
{
  "reviewId": "uuid",
  "learnerId": "uuid",
  "vocabularyId": 123,
  "result": "REMEMBERED",
  "expectedRevision": 4
}
```

Contract rules:

- `reviewId` and `learnerId` are UUID strings.
- `vocabularyId` is an integer identifying accepted vocabulary content.
- `result` is exactly `REMEMBERED` or `FORGOTTEN`.
- `expectedRevision` is a non-negative JavaScript safe integer compatible with
  the persisted `BIGINT` revision type; unsafe or out-of-range values are
  rejected at the API boundary.
- Unknown fields and client-authored scheduler output are rejected with
  `400 INVALID_REQUEST`.
- The client never sends `today`, `reviewDate`, `reviewedAt` or canonical
  progress fields.

## 12. Response Contract

The owner-approved canonical successful response is one stable object with the
following semantic shape. Exact TypeScript/Zod identifiers follow repository
conventions without changing these fields or meanings:

```json
{
  "reviewId": "uuid",
  "learnerId": "uuid",
  "vocabularyId": 123,
  "result": "REMEMBERED",
  "progress": {
    "status": "LEARNING",
    "consecutiveCorrect": 1,
    "intervalDays": 1,
    "firstLearnedDate": "2026-09-14",
    "lastReviewedDate": "2026-09-14",
    "nextReviewDate": "2026-09-15",
    "totalCorrect": 1,
    "totalIncorrect": 0,
    "revision": 1
  }
}
```

Response rules:

- A newly committed review returns HTTP `201`.
- An idempotent replay of the same household-scoped `reviewId` and fingerprint
  returns HTTP `200` and the stored `response_payload` as the canonical JSON
  value.
- After persistence, `status` is `LEARNING` or `MASTERED`; `NEW` is never
  returned for a successful scheduled review.
- `revision` is the resulting persisted revision.
- Do not return `expectedRevision`, `requestFingerprint`, `householdId`,
  `reviewedAt` or internal event/database metadata.
- A stale/conflict response uses the stable error envelope, never the success
  DTO.

The exact response is stored in `review_events.response_payload` and is the
authoritative body for replay. The implementation must add the corresponding
shared Zod/TypeScript contracts using repository naming conventions.

## 13. Authentication and Authorization

The server performs the following ownership check:

```text
Better Auth session
  → session.user.id
  → household_members membership
  → learner_profiles.household_id
  → enabled learner match
  → allow or 403
```

- No usable session: HTTP `401`, error code `UNAUTHORIZED`.
- Authenticated parent with a missing, disabled or cross-household learner:
  HTTP `403`, error code `HOUSEHOLD_ACCESS_DENIED`, with no household detail
  disclosure. This follows the existing enabled-learner authorization seam.
- Knowing a learner UUID is never sufficient authorization.
- Vocabulary lookup is server-side and must not be used to bypass learner
  authorization.
- Authentication, authorization and HTTP error mapping remain in `apps/api`,
  not in `packages/learning-domain`.

## 14. Idempotency and Optimistic Concurrency

The Worker resolves idempotency before scheduler execution:

| Condition | HTTP | Required behavior |
|---|---:|---|
| New `reviewId` in the authorized household, canonical/virtual revision matches | 201 | Compute and atomically persist progress plus event. |
| Existing `reviewId` in the authorized household, same fingerprint | 200 | Return stored `response_payload`; do not run scheduler or write a second transition. |
| Existing `reviewId` in the authorized household, different fingerprint | 409 | Return `IDEMPOTENCY_CONFLICT`; do not overwrite the event. |
| Write loses race, same event now exists | 200 | Recheck event and replay its stored canonical response. |
| Write loses race, no same event exists | 409 | Return `STALE_REVISION`; client reloads canonical state. |

All idempotency lookups and race classifications use the authorized household
and canonical `reviewId`. A foreign-household event with the same `reviewId`
is observationally absent. Within one household, same `reviewId` plus the same
fingerprint replays, while a different fingerprint returns
`IDEMPOTENCY_CONFLICT`.

For an existing progress row, `expectedRevision` must equal the stored
revision. A successful update increments revision exactly once. Two different
review IDs in the same authorized household using the same expected revision
permit exactly one canonical transition/event; the loser receives
`STALE_REVISION`.

For a missing row, `expectedRevision = 0` is required and the unique
`(learner_id, vocabulary_id)` key is the first-materialization race barrier.

## 15. Concurrent First Review

Two different review requests for the same learner/vocabulary with
`expectedRevision = 0` may both read virtual `NEW` and compute in the Worker,
but only one may insert progress and event. The losing request must not write a
second event or re-run a transition after the race is resolved; it returns
`409 STALE_REVISION` unless its own canonical `reviewId` is found in the
authorized household with the same fingerprint, in which case it returns the
stored canonical `200` replay.

Two concurrent requests in the same authorized household with the same
canonical `reviewId` and same fingerprint may race; at most one
transition/event is committed, and the other resolves to the same stored
response. A same-household, same-ID different-payload race is
`IDEMPOTENCY_CONFLICT`. The same `reviewId` in another household does not
participate in either classification.

## 16. Timezone and Date Ownership

- `households.timezone` is the server-owned IANA timezone.
- The service derives one household-local `reviewDate` (`YYYY-MM-DD`) at the
  time of the scheduled write.
- The service passes that date as `today` to `scheduleReview`.
- `reviewDate`, `firstLearnedDate`, `lastReviewedDate` and `nextReviewDate` are
  calendar dates, not elapsed 24-hour instants.
- `reviewedAt` is a separate server-owned `timestamptz` event instant.
- The client cannot submit or override either date authority.
- An invalid stored household timezone fails safely as an internal service
  error; no stack, SQL, secret or database detail is returned.

## 17. Atomicity Strategy

The progress mutation and event append are one atomic PostgreSQL operation:

```text
existing progress UPDATE where revision = expectedRevision
  OR sparse first INSERT where row is absent and expectedRevision = 0
→ scheduler result persisted
→ exactly one review_event inserted
→ one COMMIT, or ROLLBACK of both writes
```

The implementation may use the accepted Neon HTTP driver with one SQL
statement/CTE or a database function. The architecture's CTE is a shape, not
frozen migration SQL. Interactive WebSocket transactions remain deferred unless
an implementation proves the approved HTTP atomic write is insufficient and a
new architecture decision is made.

If event insertion fails, including a duplicate scoped `(household_id,
review_id)` key, the progress
mutation must not remain committed. The operation must never return success for
a partially persisted transition.

## 18. Scheduler Integration Boundary

The service follows the accepted architecture sequence:

1. Authenticate the session.
2. Validate the strict request shape and enum/value ranges.
3. Authorize the learner through the authenticated household membership.
4. Verify the vocabulary exists and is enabled.
5. Pre-check `reviewId` and compare its fingerprint when present.
6. Load the learner/vocabulary progress row, or construct virtual `NEW` with
   revision `0` when absent.
7. Verify `expectedRevision` against the stored/virtual revision.
8. Resolve the household-local review date.
9. Call the accepted pure `scheduleReview` with canonical state, result and
   explicit date.
10. Atomically update/insert progress and append the immutable event.
11. Return the owner-approved canonical response, or replay the stored response
    for an idempotent retry.

The scheduler output is the only source for resulting status, counters,
interval and dates. The persistence adapter adds only authorized storage
metadata such as revision, review ID, event instant and identity fields.

## 19. Error Contract

Use the existing stable error envelope:

```json
{
  "error": {
    "code": "STALE_REVISION",
    "message": "Progress changed. Reload canonical state.",
    "details": { "currentRevision": 5 }
  }
}
```

| Situation | HTTP | Error code | Required behavior |
|---|---:|---|---|
| No authenticated session | 401 | `UNAUTHORIZED` | Reject before any write. |
| Malformed JSON, unknown field, invalid UUID/enum/id/revision | 400 | `INVALID_REQUEST` | Reject before scheduler or write. |
| Learner missing, disabled or outside the authenticated household | 403 | `HOUSEHOLD_ACCESS_DENIED` | Do not disclose cross-household state. |
| Vocabulary missing or disabled | 404 | `VOCABULARY_NOT_FOUND` (or established equivalent) | Use one safe outward behavior and do not disclose whether content is missing or disabled. |
| Same `reviewId` in the authorized household, different fingerprint | 409 | `IDEMPOTENCY_CONFLICT` | Do not overwrite or retry automatically. |
| Revision or first-materialization race lost | 409 | `STALE_REVISION` | Include current revision when safely known; client reloads canonical state. |
| Canonical persisted state fails scheduler validation | 500/503 | `INTERNAL_ERROR` | Fail closed with a safe message; do not expose domain/DB internals. |
| Database/transaction failure | 500/503 | `INTERNAL_ERROR` | Roll back the whole operation and return a safe message. |

The implementation must use the repository's established stable error naming
if it already provides an equivalent to `VOCABULARY_NOT_FOUND`; otherwise the
semantic contract name is `VOCABULARY_NOT_FOUND`. Internal service status
selection remains an implementation detail and must not leak SQL or stack
details.

## 20. Database, Migration and Trusted DB Decision

US-07 legitimately requires database work and therefore requires Trusted DB
Integration acceptance. The trusted workflow must validate the real verified
database target, migration role/runtime privileges and behavior after a clean
migration/reset lifecycle.

Required implementation impact:

- Add the two approved enum types, `learner_progress`, `review_events`, keys,
  checks, indexes and explicit non-cascading foreign keys in one additive
  application migration.
- Add the tables to Drizzle schema exports and the application reset allowlist
  in dependency-safe order; reset must preserve `vocabflow_meta`, identity,
  roles, schemas and migration infrastructure.
- Preserve existing `vocabflow_migration` and `vocabflow_runtime` role model.
  New tables should inherit the existing application-table default privileges;
  any required app-scope grant must not widen BATCH 0 permissions.
- No new seed data is required; existing vocabularies remain unchanged.
- Trusted CI must prove migration 0→latest, reset, migration 0→latest again,
  runtime access, atomic rollback and concurrent behavior on a verified test
  target.

No live Neon call or migration was performed during this contract-finalization
task.

## 21. Test Strategy

### Domain regression

- Keep all US-06 scheduler tests green, including virtual `NEW`, thresholds,
  calendar arithmetic, validation, overflow and non-mutation.
- Verify the adapter passes canonical stored/virtual state and explicit date
  without duplicating scheduler rules.

### Contracts and service/API

- Strict request DTO accepts exactly the approved fields and rejects unknown or
  client-authored computed fields.
- Validate UUIDs, integer ranges, result enum and unavailable vocabulary.
- Verify `401`, `403`, `400`, `404`, `409 IDEMPOTENCY_CONFLICT`, `409
  STALE_REVISION` and safe internal errors.
- Verify scheduler invocation happens only for a new canonical request, never
  for an idempotent replay.
- Verify the owner-approved response DTO and stored payload replay exactly.

### Database and concurrency

- Clean migration creates the exact enums/tables/indexes and runtime can use
  them without changing protected BATCH 0 objects.
- First `NEW + REMEMBERED` materializes one progress row and one event.
- First `NEW + FORGOTTEN` materializes the correct reset state and one event.
- Existing progress update increments revision once and appends one event.
- Progress and event commit together; forced event failure rolls back progress.
- Same household-scoped `reviewId` and same fingerprint replays stored response without a second
  transition.
- Same household-scoped `reviewId` and different fingerprint returns
  `IDEMPOTENCY_CONFLICT`.
- Different review IDs with the same revision yield one winner and one
  `STALE_REVISION`.
- Concurrent first reviews with expected revision `0` yield one progress row,
  one event and one deterministic loser.
- Concurrent same-ID retries yield at most one transition/event and canonical
  replay.
- Cross-household learner isolation and disabled learner/content behavior are
  covered without exposing other household data.
- Reset drops new application objects in dependency-safe order and preserves
  protected metadata; re-migration is reproducible.

### Regression and browser scope

- US-01 through US-06 unit/API/E2E and repository gates remain green.
- Browser E2E is not required for this API/DB-only story unless implementation
  adds UI, which this contract does not authorize.
- Trusted DB Integration is required because schema, migration, privilege
  inheritance and real concurrency behavior change.

## 22. Acceptance Criteria

- T07-01: The endpoint is a same-origin authenticated `POST /api/reviews` and
  the pure US-06 scheduler remains framework/storage agnostic.
- T07-02: The request is strict and accepts exactly `reviewId`, `learnerId`,
  `vocabularyId`, `result` and `expectedRevision`; computed scheduler fields
  are rejected.
- T07-03: Missing session returns `401 UNAUTHORIZED` without a write.
- T07-04: Learner authorization resolves session user → household membership →
  enabled learner; cross-household/disabled access returns `403
  HOUSEHOLD_ACCESS_DENIED`.
- T07-05: Missing or disabled vocabulary is rejected safely and deterministically
  with `404 VOCABULARY_NOT_FOUND` (or the repository's established equivalent),
  without revealing which condition occurred.
- T07-06: Missing progress maps to exact virtual `NEW` with revision `0`, and
  only expected revision `0` may materialize the first row.
- T07-07: First `NEW + REMEMBERED` and `NEW + FORGOTTEN` persist the exact
  accepted scheduler outputs and one matching immutable event.
- T07-08: Existing progress uses canonical stored state, calls `scheduleReview`
  once and increments revision exactly once on success.
- T07-09: Progress mutation and event append are atomic; any event failure
  leaves no partial progress mutation.
- T07-10: A new successful review returns `201`; the exact owner-approved
  canonical response is stored in `response_payload`.
- T07-11: The same canonical `reviewId` in the authorized household plus the
  same fingerprint returns `200` with the stored response and performs no
  second scheduler execution or transition.
- T07-12: The same canonical `reviewId` in the authorized household plus a
  different fingerprint returns `409 IDEMPOTENCY_CONFLICT` without overwriting
  history.
- T07-13: Competing different review IDs with the same expected revision permit
  one write and return `409 STALE_REVISION` to the loser, including safe current
  revision details when available.
- T07-14: Concurrent first reviews use the unique learner/vocabulary key as a
  race barrier and produce one progress row/event only.
- T07-15: Server derives household-local `review_date`, passes it to the
  scheduler and stores a separate server-owned `reviewed_at`; client dates are
  ignored/rejected.
- T07-16: Event snapshots contain the exact canonical request fingerprint,
  previous/resulting state, revision transition and stored canonical response;
  events have no update/delete path.
- T07-17: New tables, enums, constraints, indexes, reset behavior and runtime
  privileges pass clean migration/reset and Trusted DB validation without
  modifying protected BATCH 0 infrastructure.
- T07-18: US-01 through US-06 regression tests and required local/Core CI gates
  remain green; no Review Queue, reinforcement, Study UI or US-08 behavior is
  added.
- T07-19: The exact response DTO and first-materialized revision semantics are
  owner-approved and must be represented in shared contracts before
  implementation.

T07-19 is complete as a contract decision; implementation evidence remains
pending.

## 23. Implementation Sequence

1. Add shared request/error/approved response contracts and focused contract
   tests.
2. Add the additive enums/tables/constraints/indexes migration and Drizzle
   schema/reset coverage; do not alter BATCH 0 role infrastructure.
3. Add a service adapter that authenticates/authorizes, loads canonical or
   virtual state, resolves the household date and calls `scheduleReview`.
4. Implement atomic existing-update and sparse-first-insert branches with the
   review-event append and idempotency replay semantics.
5. Add Worker/API error mapping and no-leak tests.
6. Run local domain/API/DB tests and clean migration/reset checks.
7. Run trusted CI and stop at `scheduled-review-write-ready`.
8. Leave Review Queue and Study-session UX to later stories.

## 24. Definition of Done

- Owner has approved every previously unresolved contract item in this
  document.
- T07-01 through T07-19 pass with objective evidence.
- `POST /api/reviews` is server-authoritative, idempotent, revision-safe and
  atomically persists progress plus one immutable event.
- Sparse virtual `NEW` and concurrent first-review behavior match the approved
  contract.
- Clean migration, reset, runtime privilege and Trusted DB checks pass.
- Existing US-01 through US-06 regressions and required repository gates pass.
- No Review Queue, reinforcement, Study UI, offline queue or US-08 behavior is
  introduced.
- Story evidence and status documentation are updated after implementation and
  acceptance; implementation is now authorized, but acceptance still requires
  objective evidence and the Trusted DB gate.

## 25. Resolved Contract Decisions and Implementation Notes

1. **First materialized revision — OWNER APPROVED.** Virtual `revision = 0`
   is consumed on the first successful write; the first progress row and event
   use resulting revision `1`. Subsequent successful writes increment exactly
   once.
2. **Response DTO — OWNER APPROVED.** The canonical successful response
   contains `reviewId`, `learnerId`, `vocabularyId`, `result` and `progress`
   with the approved resulting scheduler fields and `revision`. The exact
   response is stored and replayed from `response_payload`; no request,
   household or internal event metadata is returned.
3. **Vocabulary availability — OWNER APPROVED.** Missing and disabled
   vocabulary both return HTTP `404` with `VOCABULARY_NOT_FOUND`, or the
   repository's established equivalent if one exists, without condition
   disclosure. Disabled content never reaches scheduling or persistence.
4. **Authorization before replay — OWNER APPROVED.** Learner authentication
   and enabled-household authorization occur before any `reviewId` replay
   lookup can disclose a stored response. Disabled learners use the existing
   `403 HOUSEHOLD_ACCESS_DENIED` behavior.
5. **Fingerprint and replay — OWNER APPROVED.** The deterministic fingerprint
   includes only learner ID, vocabulary ID, result and expected revision;
   `reviewId`, dates, timezone, scheduler output, resulting revision,
   timestamps and response payload are excluded.
6. **Fingerprint encoding is an implementation detail.** Deterministic
   serialization/hashing may be selected during implementation while
   preserving the locked semantic inputs.
7. **Atomic SQL mechanism is not a contract blocker.** The implementation may
   use one Neon HTTP SQL statement/CTE or a database function if all approved
   atomicity and race invariants pass.

The implementation is covered by the following evidence; no final acceptance,
commit, push or Trusted DB run has been performed. `docs/decisions.md` is
unrelated protected local work and is not part of US-07.

## 26. Contract Finalization Evidence

Owner approval resolved the response DTO, first materialized revision,
vocabulary-not-found behavior, authorization-before-replay and enabled-learner
rules on 2026-09-14. Implementation has now started and US-07 is `IN
PROGRESS`.

### Implemented

- Shared strict request/response/error contracts and deterministic semantic
  fingerprinting.
- Additive `learning_status` and `review_result` enums,
  `learner_progress`/`review_events` schema, migration
  `0004_scheduled_review_write`, indexes, checks and reset ordering.
- Thin `POST /api/reviews` route with authentication, enabled learner and
  vocabulary authorization, sparse NEW revision `0 → 1`, pure scheduler
  integration, replay/conflict handling, compare-and-set persistence, race
  reclassification, household-local dates and atomic progress/event writes.

### Fix-forward 1

- P1-H fixed with server-owned household-scoped review-event idempotency and
  scoped pre-write/post-race lookups; foreign-household review IDs are treated
  as fresh in the caller's authorized scope.
- P1-J fixed by canonicalizing validated UUIDs before fingerprinting,
  persistence comparisons and canonical response construction.
- P1-T fixed by widening scheduler numeric fields to PostgreSQL `BIGINT`,
  constraining persisted values to the JavaScript safe-integer range, safely
  handling string/bigint database values and failing closed at revision
  exhaustion without changing the US-06 scheduler.

### Fix-forward 2

- Aligned the contract tables and concurrency text with the reviewed
  household-scoped idempotency namespace `(household_id, review_id)`.
- Documented PostgreSQL `BIGINT` storage, JavaScript safe-integer bounds,
  range-checked conversion and fail-closed `Number.MAX_SAFE_INTEGER` revision
  behavior without changing the implementation.
- Replaced numeric-only UUID fixtures with alphabetic hexadecimal values so
  uppercase/lowercase canonicalization and replay coverage are non-vacuous.
- Focused tests remain `27/27` PASS; full tests are `238/238` PASS; E2E is
  `11/11` PASS; lint, typecheck, build, Markdown links/anchors and
  `git diff --check` are PASS.
- US-07 remains `IN PROGRESS`; technical re-review, Core CI, Trusted DB and
  owner acceptance remain pending.

### Local evidence

- Focused US-07 service/API and schema/reset tests: `27/27` PASS, including
  foreign review-ID isolation, UUID normalization/replay and safe-integer
  boundary coverage.
- Full repository tests: `238/238` PASS; E2E: `11/11` PASS.
- Lint, typecheck, build and `git diff --check`: PASS.
- Migration artifact and Drizzle schema/reset assertions: PASS.

### Remaining gates

- Technical re-review: PENDING.
- Core CI: PENDING.
- Trusted DB Integration: PENDING and required for US-07 acceptance.
- Owner acceptance: PENDING.

No final acceptance, commit, push or Trusted DB run has been performed by this
implementation task. `docs/decisions.md` remains unrelated protected local
work and is not part of US-07.
