# US-04 — Vocabulary Content Seed & Read Foundation

- Status: IN PROGRESS
- Batch: BATCH 2 — Learning Content Foundation
- Owner: Project Owner
- Last updated: 2026-09-11
- Baseline commit: `0dd94d3c0149a5ec89648a98166c647a4a89c620`
- `DATASET_SOURCE`: VOCABFLOW_STARTER_V1
- `DATASET_PROVENANCE`: PROJECT_AUTHORED
- `DATASET_STATUS`: APPROVED

## 1. User Story

As an authenticated VocabFlow household context, I want to retrieve a
validated first slice of real shared vocabulary content from canonical
PostgreSQL so the next story can render a real flashcard without inventing
content or storage behavior.

## 2. Outcome

After the accepted US-03 handoff `learner-context-ready`, the authenticated
parent can pass the household-context authorization gate and retrieve the
canonical enabled vocabulary slice through `GET /api/vocabulary`. Vocabulary
content is shared application content, not learner-owned content: the selected
learner establishes product-flow continuity but does not filter the vocabulary
records.

The story reaches `vocabulary-content-ready` when:

- the approved `VocabFlow Starter Vocabulary v1` source contains exactly 30
  stable records;
- dataset validation passes before any database mutation;
- the first enabled slice is persisted canonically in PostgreSQL;
- the authenticated read API returns only enabled records in deterministic
  `id ASC` order;
- no learner progress, review, scheduler or study state is created; and
- the next story can consume a validated `VocabularyDto[]` for real flashcard
  rendering.

US-04 intentionally adds no production UI screen. API, dataset, database and
integration evidence establish the handoff; the next story owns Learner Home
and first real flashcard rendering.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#7--family-mvp-feature-scope)
  — default vocabulary set, flashcards and the 20–30 word first vertical slice.
- [Content, persistence and progress semantics](../product/product-spec.md#6--content-persistence--progress-semantics)
  — content tiers, data-quality rules and PostgreSQL canonical persistence.
- [Technical Architecture data architecture](../architecture/technical-architecture.md#5-data-architecture)
  — `vocabularies` schema, shared runtime content and media storage boundary.
- [Vocabulary content pipeline](../architecture/technical-architecture.md#7-vocabulary-content-pipeline)
  — validate source, produce versioned seed input, persist and read runtime content.
- [Technical API surface](../architecture/technical-architecture.md#10-api-surface-v1)
  — `GET /api/vocabulary`.
- [Migration and rollback rules](../architecture/technical-architecture.md#16-migration-deployment--rollback-rules)
  — additive forward-compatible migration behavior.
- [Implementation sequence](../architecture/technical-architecture.md#17-implementation-sequence--vertical-slice)
  — vocabulary seed/read precedes first real Flashcard rendering.
- [Testing strategy](../architecture/technical-architecture.md#14-testing-strategy)
  and [architecture acceptance gates](../architecture/technical-architecture.md#18-architecture-acceptance-gates).
- [Feature UI Specification](../design/feature-ui-spec.md#7--vocabulary-list--parent-actions)
  — vocabulary is a read-only content surface; no temporary production browser
  is introduced by this story.
- [User Flow](../flow/user-flow.md#3-luồng-học-flashcard)
  — selected learner precedes the later Home → Study flow.
- [US-03 Learner Profile Creation & Resolution](US-03-learner-profile-resolution.md)
  — accepted `learner-context-ready` input boundary.

## 4. Dependencies

- BATCH 0 Foundation is `ACCEPTED` and frozen.
- US-01 Parent Registration is `ACCEPTED`.
- US-02 Parent Login is `ACCEPTED`.
- US-03 Learner Profile Creation & Resolution is `ACCEPTED` and provides the
  `learner-context-ready` handoff.
- Better Auth remains the parent authentication/session authority.
- PostgreSQL remains the runtime source of truth; the dataset artifact is only
  validated seed input.
- `VocabFlow Starter Vocabulary v1` is owner-approved with project-authored
  provenance; implementation is in progress.

## 5. In Scope

- Additive `vocabflow_app.vocabularies` schema and one forward-compatible
  Drizzle migration during implementation.
- A controlled, validated first enabled slice of exactly 30 vocabulary records
  from the approved Starter v1 source.
- Dataset validation before mutation, including required fields, types,
  duplicate IDs, `enabled` and `contentVersion` checks.
- Deterministic, repeatable controlled content migration using stable IDs.
- Shared `VocabularyDto` and `{ vocabulary: VocabularyDto[] }` response
  contract.
- Authenticated `GET /api/vocabulary` with canonical household authorization
  context but no household- or learner-owned content filtering.
- Enabled-only `id ASC` ordering and a valid empty `200` response.
- Safe API error envelopes without SQL, provider, secret or internal-detail
  leakage.
- Dataset, contract, database/service, Worker/API, regression and Trusted DB
  acceptance evidence.

## 6. Out of Scope

- Learner Home.
- Flashcard rendering, card flip or study session.
- Audio playback, SpeechSynthesis fallback and media interaction behavior.
- Scheduler, learner progress, `learner_progress` writes or virtual NEW
  evaluation.
- Review queue, `review_events`, `POST /api/reviews`, reinforcement and session
  summary.
- Progress dashboard, vocabulary search/browser UI or temporary production UI
  added only to prove the API.
- Dexie vocabulary caching and all offline behavior.
- Admin CMS, learner PIN, AI-generated vocabulary, payments and gamification.
- Enabling the full 200–300 word MVP set.
- Creating or starting US-05.

## 7. Acceptance Criteria

- T04-01: `vocabflow_app.vocabularies` matches the approved schema contract:
  integer stable primary key; required `word` and `vietnamese`; nullable
  optional text/media fields; `enabled boolean NOT NULL DEFAULT false`;
  `content_version integer NOT NULL DEFAULT 1`; and timestamptz audit fields
  with `DEFAULT now()`.
- T04-02: The vocabulary table has no `learner_id` or `household_id`; media is
  represented by URL/key text only, never binary PostgreSQL content. No extra
  vocabulary index is required beyond the primary key used for deterministic
  `id ASC` reads.
- T04-03: `DATASET_SOURCE=VOCABFLOW_STARTER_V1` has
  `DATASET_PROVENANCE=PROJECT_AUTHORED` and `DATASET_STATUS=APPROVED`; the
  approved first slice contains exactly 30 enabled records with stable IDs
  `1` through `30`.
- T04-04: Validation runs before mutation and fails for missing `id`, `word` or
  Vietnamese meaning, duplicate IDs, invalid types, invalid `enabled`, or
  invalid `contentVersion`.
- T04-05: Duplicate normalized words, missing IPA, missing image and missing
  audio produce warnings only; missing definition and example are accepted.
  Optional absence never blocks seed/read success.
- T04-06: Stable IDs `1` through `30` are canonical identity, are never
  recycled for another word, and every v1 record has `contentVersion=1`.
  Additions use new IDs, content changes increment the version, and removing
  content from the active set uses `enabled=false`.
- T04-07: The controlled content migration is deterministic and safely
  repeatable where repository migration conventions require it; it does not
  delete future learner progress or review history.
- T04-08: A valid Better Auth parent session with canonical household
  membership can `GET /api/vocabulary` and receives `200` with exactly
  `{ "vocabulary": VocabularyDto[] }`.
- T04-09: The API returns only `enabled=true` records in deterministic `id ASC`
  order. Zero enabled records return `200` with an empty `vocabulary` array.
- T04-10: No session returns `401`; an authenticated user without canonical
  household membership returns `403 HOUSEHOLD_ACCESS_DENIED`.
- T04-11: `householdId` and `learnerId` are not accepted as API scope inputs;
  they cannot alter the result or authorization. Unsupported scope parameters
  return the existing safe `400 INVALID_REQUEST` envelope.
- T04-12: Vocabulary content is shared application content. The service does
  not filter by `household_id` or `learner_id`, does not join progress, and
  does not create learner progress, review state or scheduler state.
- T04-13: Internal failures return a safe `500`/`503` error envelope without
  SQL, provider, connection, stack-trace or secret details.
- T04-14: PostgreSQL is the runtime source of truth after the controlled seed;
  the runtime API does not read the dataset artifact as a second source.
- T04-15: US-01, US-02 and US-03 regression suites remain green, including the
  accepted auth, household, learner ownership and learner-context behavior.
- T04-16: Migration, controlled seed, reset and clean-migration verification
  pass on the trusted disposable/test target; Trusted DB Integration is
  required for acceptance.

## 8. UX/UI Contract

- No new user-facing production route or screen is introduced by US-04.
- `vocabulary-content-ready` is an API/data handoff for the next story, not a
  rendered success page.
- No Learner Home, vocabulary browser, flashcard, temporary debug screen or
  study CTA is added to prove the contract.
- Any future UI must use the accepted learner context, global design tokens,
  same-origin API boundary and the Feature UI Specification owned by the next
  story.

## 9. Domain and Business Rules

- Vocabulary is shared/global application content, not household-owned or
  learner-owned content.
- `enabled=true` controls whether content is available to the runtime read API.
- Stable `id` identifies a vocabulary item permanently; IDs are never reused.
- `contentVersion` starts at 1 and increments when canonical content changes.
- Missing optional media/content is valid and must not make content unavailable.
- Progress and review semantics begin only in later stories; US-04 performs no
  scheduler evaluation and no learning-state transition.

## 10. API Contract

### `GET /api/vocabulary`

- Requires a valid Better Auth parent session.
- The server establishes canonical household context through the accepted
  session → household membership chain. Household context is an authorization
  gate only; it is not a vocabulary ownership filter.
- The request accepts no `householdId` or `learnerId` scope input.
- `200` response shape:

  ```json
  { "vocabulary": [VocabularyDto] }
  ```

- The result includes only `enabled=true` records, ordered by `id ASC`.
- An empty enabled set is a valid `200` response with
  `{ "vocabulary": [] }`.
- No progress join, review state, scheduler calculation or write occurs.
- No session returns `401`.
- Authenticated user without canonical household membership returns `403`
  `HOUSEHOLD_ACCESS_DENIED`.
- Unsupported `householdId` or `learnerId` scope input returns safe `400`
  `INVALID_REQUEST` and cannot affect the result.
- Internal failure returns a safe `500`/`503` envelope without provider or
  database details.

## 11. Vocabulary DTO

The shared public DTO contains only fields required by the next flashcard story;
database audit timestamps are not exposed:

```ts
type VocabularyDto = {
  id: number;
  word: string;
  ipa: string | null;
  vietnamese: string;
  definitionEn: string | null;
  exampleEn: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
  topic: string | null;
  enabled: boolean;
  contentVersion: number;
};
```

The response contract is `z.object({ vocabulary: z.array(vocabularyDtoSchema) })`.
Database `snake_case` names map to the existing shared-contract `camelCase`
convention. `contentVersion` is an integer greater than or equal to 1.

## 12. Authorization and Security

- Better Auth owns parent authentication and session validity.
- The API must establish canonical household membership before serving content.
- Vocabulary is global content, so the resolved household ID is not used to
  filter vocabulary rows.
- Client-supplied `householdId` and `learnerId` are untrusted and unsupported.
- No query may expose SQL, stack traces, provider responses, connection
  details, cookies, sessions, secrets or raw dataset internals.
- The web layer never connects directly to PostgreSQL or Drizzle.

## 13. Data and Persistence Contract

`vocabflow_app.vocabularies` is the exact approved table shape:

| Column | PostgreSQL type | Null/default | Contract |
|---|---|---|---|
| `id` | `integer` | `PRIMARY KEY NOT NULL` | Stable dataset identity; never reused. |
| `word` | `text` | `NOT NULL` | English word. |
| `ipa` | `text` | `NULL` | Optional pronunciation. |
| `vietnamese` | `text` | `NOT NULL` | Required Vietnamese meaning. |
| `definition_en` | `text` | `NULL` | Optional definition. |
| `example_en` | `text` | `NULL` | Optional example. |
| `image_url` | `text` | `NULL` | URL/key only; no binary. |
| `audio_url` | `text` | `NULL` | URL/key only; no binary. |
| `topic` | `text` | `NULL` | Optional grouping. |
| `enabled` | `boolean` | `NOT NULL DEFAULT false` | Runtime availability. |
| `content_version` | `integer` | `NOT NULL DEFAULT 1` | Must remain `>= 1`. |
| `created_at` / `updated_at` | `timestamptz` | `NOT NULL DEFAULT now()` | Internal audit fields. |

The table has no `learner_id`, `household_id`, `learner_progress` or
`review_events` relationship in this story. One additive forward-compatible
Drizzle migration is required during implementation. The primary key is the
only locked vocabulary index; no enterprise index is invented.

## 14. Dataset and Seed Contract

- `DATASET_SOURCE = VOCABFLOW_STARTER_V1`.
- `DATASET_PROVENANCE = PROJECT_AUTHORED`.
- `DATASET_STATUS = APPROVED`.
- Dataset name: `VocabFlow Starter Vocabulary v1`.
- This is an internally curated VocabFlow starter dataset. It is not official
  CEFR A1 content and is not described as Oxford, Cambridge, Wiktionary-derived
  or copied dictionary content.
- The exact initial enabled set contains 30 records with stable IDs `1`–`30`.
  Every record has `enabled=true` and `contentVersion=1`.
- The allowed content claim is only “beginner starter vocabulary selected for
  the VocabFlow MVP”. No external copyrighted definitions, examples, images or
  audio are required.
- The validated record shape is:

  ```ts
  type VocabularySeedRecord = {
    id: number;
    word: string;
    vietnamese: string;
    enabled: boolean;
    contentVersion: number;
    ipa?: string | null;
    definitionEn?: string | null;
    exampleEn?: string | null;
    imageUrl?: string | null;
    audioUrl?: string | null;
    topic?: string | null;
  };
  ```

- US-04 chooses a controlled content migration rather than a new standalone
  seed command because the repository already has a Drizzle migration chain
  and custom migration executor, while no seed runner currently exists.
- The migration consumes only this approved, prevalidated source and uses
  stable-ID semantics. PostgreSQL becomes runtime source of truth after apply.
- Repeated application/reset behavior must be safe under repository migration
  conventions; future content changes use stable-ID updates, version bumps and
  `enabled=false` for removals rather than ID recycling or destructive history
  deletion.

## 15. Error and Recovery Matrix

| Situation | Expected behavior | Recovery |
|---|---|---|
| No session | `401` safe envelope | Sign in through accepted auth flow. |
| No canonical household membership | `403 HOUSEHOLD_ACCESS_DENIED` | Recover accepted household/bootstrap state. |
| Unsupported scope input | `400 INVALID_REQUEST`; no query scope change | Retry without `householdId`/`learnerId`. |
| No enabled vocabulary | `200` with empty array | Owner-approved seed/content update is required before later flashcard work. |
| Invalid dataset | Validation fails before mutation | Correct approved source and rerun validation. |
| Duplicate ID | Validation fails before mutation | Resolve stable-ID conflict; never recycle an ID. |
| Optional field absent | Warning or accepted condition | Persist `NULL`; read remains successful. |
| API/database failure | Safe `500`/`503`; no internals | Retry through the next story's API client; no local source fallback. |

## 16. Concurrency and Idempotency

- Reads are side-effect free.
- The controlled migration uses stable ID as canonical identity and is
  deterministic across clean migration/reset runs.
- A repeatable content application must not create duplicate IDs or recycle an
  ID for another word.
- Content updates increment `contentVersion`; removing an active item sets
  `enabled=false` rather than deleting historical data.
- US-04 introduces no progress/review concurrency behavior and no review
  idempotency key.

## 17. Test Plan

- **Dataset validation:** required fields, exact types, duplicate IDs,
  `enabled`, `contentVersion`, optional-field warnings and pre-mutation failure.
- **Shared contracts:** `VocabularyDto`, seed record shape and the exact
  `{ vocabulary: VocabularyDto[] }` response.
- **Database/schema:** table shape, primary key, defaults, nullability, no
  learner/household ownership columns and additive migration.
- **Seed/service:** exactly 30 enabled records, stable-ID behavior, deterministic
  ordering, enabled filtering, repeatable controlled application and no
  progress/review side effects.
- **Worker/API:** `200`, empty `200`, `401`, `403`, unsupported scope input,
  safe `500`/`503`, canonical household gate and no learner/household content
  filtering.
- **Regression:** US-01 registration, US-02 login/session/bootstrap and US-03
  learner resolution/ownership suites remain green.
- **Integration:** clean migration, app-only reset preservation, controlled seed
  verification and Trusted DB Integration on the verified test target.
- **Repository gates:** `pnpm lint`, `pnpm typecheck`, `pnpm test`,
  `pnpm build`, `pnpm test:e2e` and `git diff --check`.

## 18. Expected Files and Modules

Implementation areas changed in this story:

- `apps/api/src/db/schema.ts` for `vocabularies`.
- `apps/api/src/vocabulary.ts` and `apps/api/src/index.ts` for the service and
  `GET /api/vocabulary` route.
- `packages/contracts/src/index.ts` for `VocabularyDto` and response schemas.
- `drizzle/migrations/` for one additive controlled content migration.
- `scripts/validate-dataset.ts` and its tests for approved-source validation.
- API, database/service, contract and regression tests.

## 19. Implementation Sequence

1. Consume the owner-approved `VocabFlow Starter Vocabulary v1` source and its
   project-authored provenance.
2. Add the approved schema contract and additive forward-compatible migration.
3. Validate the approved dataset before any database mutation.
4. Apply the controlled content migration with stable-ID/version semantics.
5. Implement the authenticated, household-gated read service and API.
6. Add contract, database/service, Worker/API, regression and Trusted DB
   evidence.
7. Stop at `vocabulary-content-ready`; do not add Learner Home or a flashcard.

## 20. Definition of Done

- T04-01 through T04-16 pass with evidence.
- The owner-approved 30-record slice is validated and canonical in
  PostgreSQL.
- `GET /api/vocabulary` is authenticated, household-gated, enabled-only and
  deterministic, with no learner/progress/review side effects.
- No production UI, flashcard, scheduler, review queue or review write is
  introduced.
- Core CI, migration/reset checks and Trusted DB Integration pass.
- US-01/US-02/US-03 behavior remains regression-protected.
- The story is `IN PROGRESS`; implementation must use only this approved
  dataset contract. Acceptance remains pending Trusted DB evidence.

## 21. Open Questions and Blockers

- No contract blocker remains. `DATASET_SOURCE=VOCABFLOW_STARTER_V1` is
  approved with `DATASET_PROVENANCE=PROJECT_AUTHORED` and
  `DATASET_STATUS=APPROVED`.
- Implementation is underway; local evidence is being collected and final
  acceptance remains pending Trusted DB evidence.
- No other contract ambiguity remains after the owner selected Option A.
- US-05, Learner Home and first real flashcard integration remain unstarted.

## 22. Acceptance Evidence

Pre-Trusted-DB checkpoint. `VocabFlow Starter Vocabulary v1` remains approved
as a project-authored, exactly 30-record dataset with stable IDs 1–30; all v1
records are enabled with `contentVersion=1`, and optional fields are `NULL`.
The vocabulary schema, controlled migration/content insert, source artifact,
validator, shared DTO and authenticated read API are implemented locally.
Manual acceptance of the local read contract PASSed, and local validation is
complete. Trusted DB acceptance evidence remains pending; no live Neon call
was performed. The story is `IN PROGRESS` and must not be marked `ACCEPTED` yet.

### Manual acceptance checkpoint

Owner-provided manual acceptance PASS:

- Authenticated `GET /api/vocabulary`: `200`, exactly 30 records, IDs `1..30`,
  first word `apple`, last word `new`, every record `enabled=true` and
  `contentVersion=1`.
- Exact approved dataset content: PASS.
- All optional fields are `NULL`: PASS.
- Unsupported `householdId` and `learnerId` query inputs return
  `400 INVALID_REQUEST`: PASS.
- Unauthenticated access returns `401 UNAUTHORIZED`: PASS.
- `403 HOUSEHOLD_ACCESS_DENIED` is covered by automated tests; it was not
  manually forced by mutating the local database.

Local migration evidence: `DB_MIGRATE=PASS`. Trusted DB Integration remains
`PENDING ACCEPTANCE GATE`. The local Node runtime is `22.19.0` versus the
pinned `22.23.2`.

### T04 implementation checkpoint

- T04-01: PARTIAL; local schema contract test PASS; Trusted DB schema
  verification pending.
- T04-02: PARTIAL; local migration/schema inspection PASS; Trusted DB
  verification pending.
- T04-03: PASS; exact approved 30-record Starter v1 validator and manual
  dataset-content verification PASS.
- T04-04: IMPLEMENTED; required-field, type, duplicate-ID and version-failure
  tests PASS.
- T04-05: IMPLEMENTED; duplicate-word/media warnings and optional
  definition/example absence tests PASS.
- T04-06: IMPLEMENTED; stable IDs 1–30, version 1 and enabled semantics are
  encoded in the source artifact, migration and tests.
- T04-07: PARTIAL; controlled migration uses the existing migration executor
  and conflict-safe content insert; reset-cycle verification pending Trusted DB
  evidence.
- T04-08: PASS; authenticated household-gated `200` response contract passed
  manual acceptance and is covered by API/service tests.
- T04-09: PASS; the manual 30-record result confirmed enabled-only,
  deterministic `id ASC` behavior; empty-array behavior is covered by tests.
- T04-10: PARTIAL; unauthenticated `401 UNAUTHORIZED` passed manual acceptance
  and no-membership `403 HOUSEHOLD_ACCESS_DENIED` passed automated tests; the
  `403` path was not manually forced by mutating the local database.
- T04-11: IMPLEMENTED; `householdId` and `learnerId` query inputs return safe
  `400 INVALID_REQUEST` and cannot reach the service.
- T04-12: IMPLEMENTED; vocabulary query has no learner/household ownership
  filter or learning-state side effect.
- T04-13: IMPLEMENTED; unexpected service failures map to safe `503` output
  without internal details.
- T04-14: IMPLEMENTED; runtime API reads PostgreSQL only; source artifact is
  validation/migration input.
- T04-15: LOCAL PASS; the full 159-test regression suite remains green.
- T04-16: PARTIAL; local `DB_MIGRATE=PASS` and migration/schema/reset unit
  coverage PASS; Trusted DB Integration is `PENDING ACCEPTANCE GATE`.

Final story acceptance remains pending Trusted DB evidence; US-04 is not
`ACCEPTED`.

### Approved Starter v1 records

The following exact records are the only initial enabled dataset. The optional
fields `ipa`, `definitionEn`, `exampleEn`, `imageUrl`, `audioUrl` and `topic`
are all `NULL` for v1 unless a later approved enrichment populates them on the
same stable ID and increments `contentVersion`.

| ID | Word | Vietnamese | Enabled | Content version |
|---:|---|---|:---:|---:|
| 1 | apple | táo | true | 1 |
| 2 | book | sách | true | 1 |
| 3 | cat | mèo | true | 1 |
| 4 | dog | chó | true | 1 |
| 5 | family | gia đình | true | 1 |
| 6 | friend | bạn bè | true | 1 |
| 7 | home | nhà | true | 1 |
| 8 | school | trường học | true | 1 |
| 9 | teacher | giáo viên | true | 1 |
| 10 | student | học sinh | true | 1 |
| 11 | water | nước | true | 1 |
| 12 | food | thức ăn | true | 1 |
| 13 | morning | buổi sáng | true | 1 |
| 14 | night | ban đêm | true | 1 |
| 15 | today | hôm nay | true | 1 |
| 16 | go | đi | true | 1 |
| 17 | come | đến | true | 1 |
| 18 | eat | ăn | true | 1 |
| 19 | drink | uống | true | 1 |
| 20 | read | đọc | true | 1 |
| 21 | write | viết | true | 1 |
| 22 | speak | nói | true | 1 |
| 23 | listen | nghe | true | 1 |
| 24 | happy | vui | true | 1 |
| 25 | sad | buồn | true | 1 |
| 26 | big | lớn | true | 1 |
| 27 | small | nhỏ | true | 1 |
| 28 | good | tốt | true | 1 |
| 29 | bad | xấu | true | 1 |
| 30 | new | mới | true | 1 |

The allowed content claim is only “beginner starter vocabulary selected for the
VocabFlow MVP”. This dataset is not described as official CEFR A1, Oxford,
Cambridge, Wiktionary-derived or copied dictionary content. No external
copyrighted definitions, examples, images or audio are required.
