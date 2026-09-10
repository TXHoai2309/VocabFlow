# US-03 — Learner Profile Creation & Resolution

- Status: IN PROGRESS
- Batch: BATCH 1
- Owner: Project Owner
- Last updated: 2026-09-10
- Baseline commit: `06f85d356844b45a0b87fa87ea3b79c8ed104a18`

## 1. User Story

Là phụ huynh đã đăng nhập và có household canonical, tôi muốn tạo hoặc chọn
hồ sơ learner trong household để tiếp tục vào learning context đúng người,
không trộn dữ liệu giữa các learner.

## 2. Outcome

Sau handoff `authenticated-household-ready` của US-01/US-02, parent có thể
đọc các learner profile đang enabled thuộc household của mình. Nếu chưa có
learner, parent tạo learner đầu tiên; nếu có một learner thì hệ thống tự resolve;
nếu có từ hai learner trở lên thì parent chọn rõ một profile. Story kết thúc ở
handoff `learner-context-ready` với một learner đã được server xác nhận thuộc
household. Learner Home, progress và learning flow thuộc story tiếp theo.

`learner-context-ready` là context tạm thời ở React/client/navigation cho
handoff; không phải một cột hay bản ghi active learner trong PostgreSQL, URL
persistence, `localStorage` hay `sessionStorage`. Active learner không cần sống
qua F5/reload hoặc logout/login. Sau reload/login, client refetches canonical
learner list: 0 learner về empty/create, 1 learner auto-resolve, 2+ learner mở
lại selector.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#7--family-mvp-feature-scope)
  — parent tạo/chọn nhiều learner profile và progress độc lập.
- [Technical Architecture](../architecture/technical-architecture.md#5-data-architecture)
  — PostgreSQL, `vocabflow_app`, schema shape và soft-disable semantics.
- [Auth, bootstrap and authorization](../architecture/technical-architecture.md#6-authentication-household-bootstrap--authorization)
  — parent auth, canonical household và ownership chain.
- [API surface](../architecture/technical-architecture.md#10-api-surface-v1)
  — `GET /api/learners` và `POST /api/learners`.
- [Global Design System](../design/design-system.md#4-navigation--page-composition)
  — layout patterns, mobile-first và navigation composition.
- [Feature UI Specification](../design/feature-ui-spec.md#3--learner-selector--learner-home)
  — 0/1/2+ learner behavior, Learner Selector và component rules.
- [User Flow](../flow/user-flow.md#2-luồng-parent--learner)
  — parent tạo/chọn learner trước khi vào learner home.
- [DEC-002 Parent account boundary](../decisions.md#dec-002--parent-account-is-the-authentication-boundary)
  và [DEC-003 PostgreSQL source of truth](../decisions.md#dec-003--postgresql-is-the-canonical-runtime-source-of-truth).
- [US-01 Parent Registration](US-01-parent-registration.md) và
  [US-02 Parent Login](US-02-parent-login.md) — accepted auth + household-ready
  boundary.

## 4. Dependencies

- BATCH 0 Foundation is `ACCEPTED` and frozen.
- US-01 Parent Registration is `ACCEPTED`; signup creates the authenticated
  session and canonical household.
- US-02 Parent Login is `ACCEPTED`; login restores the session and reaches
  `authenticated-household-ready` through idempotent `POST /api/bootstrap`.
- Better Auth remains the parent authentication/session authority.
- `vocabflow_app.households` and `vocabflow_app.household_members` already
  exist; learner implementation is active only within this approved story.

## 5. In Scope

- Additive `vocabflow_app.learner_profiles` schema/migration, after this
  contract is approved.
- Shared learner DTO and validation contracts where needed.
- Authenticated `GET /api/learners` for the current canonical household.
- Authenticated `POST /api/learners` for creating the first or a later profile.
- Server-derived household ownership; client household IDs are never trusted.
- Enabled learner list with deterministic ordering.
- Empty state and first-learner creation.
- 0 / 1 / 2+ learner resolution and explicit selection.
- Short-lived active learner context sufficient for the next-story handoff.
- Loading, validation, submitting, API/network error and retry states.
- Duplicate-submit prevention at the UI boundary.
- Keyboard, focus-visible, touch-target and responsive behavior from the approved
  design system.
- Authorization, safe error envelopes and regression coverage for US-01/US-02.

## 6. Out of Scope

- Learner email/password, Better Auth account, PIN or social login.
- Learner Home functionality beyond the `learner-context-ready` handoff.
- Edit, rename, avatar selection, disable or delete controls. `enabled` is a
  server field for future soft-disable behavior; US-03 only reads enabled rows.
- Learner progress, vocabulary, review queue, flashcards, scheduler or review
  writes.
- Parent progress dashboard, advanced analytics or gamification.
- Offline write queue/sync, admin CMS, payments and other US-04+ behavior.
- Persistent active-learner state or a new active-learner database table/column.
- Enterprise idempotency for repeated create requests. The UI locks duplicate
  submits; a later request after a completed response is a new create operation.

## 7. Acceptance Criteria

- T03-01: An authenticated parent can `GET /api/learners` and receives only
  enabled learner profiles belonging to the server-resolved canonical household.
- T03-02: `GET /api/learners` without a valid Better Auth session returns `401`
  with the existing safe error envelope.
- T03-03: `POST /api/learners` without a valid session returns `401`; no row is
  written.
- T03-04: The server derives `household_id` from
  `session.user.id → household_members → household_id`; a client-supplied
  `householdId` is rejected with `400 INVALID_REQUEST` and cannot redirect
  creation elsewhere.
- T03-05: A valid `{ displayName }` creates a server-generated UUID learner,
  persists it in PostgreSQL with `enabled=true`, and returns `201` plus the
  canonical learner DTO.
- T03-06: `displayName` is trimmed and must contain 1–80 characters; blank,
  overlong or malformed `displayName` returns `400
  LEARNER_DISPLAY_NAME_INVALID`, while unknown/extra request fields return
  `400 INVALID_REQUEST`, without a database write. Duplicate display names are
  allowed.
- T03-07: A successful create followed by a fresh GET returns the learner in
  deterministic `created_at ASC, id ASC` order; an empty list is a valid `200`
  response.
- T03-08: With zero enabled learners, the UI shows an explicit empty state and
  “Tạo hồ sơ học” CTA; successful first creation resolves that sole learner and
  reaches `learner-context-ready`.
- T03-09: With exactly one enabled learner, the UI auto-resolves it after the
  canonical list is loaded and reaches `learner-context-ready` without an
  unnecessary selection step.
- T03-10: With two or more enabled learners, the UI presents an accessible
  selector; parent must explicitly select one before `learner-context-ready`.
- T03-11: Disabled learners are omitted from GET and cannot be auto-selected or
  selected by the US-03 UI.
- T03-12: While create or resolution is pending, duplicate submit/selection is
  blocked; no optimistic learner or fake handoff is shown.
- T03-13: List/create network or server failure preserves usable input where
  applicable, shows a safe retryable state and does not claim learner context.
  If a create request was dispatched but the client cannot determine whether
  it committed, the client must not automatically replay POST; it first
  refetches GET `/api/learners`, shows the canonical result and only then
  permits an explicit new create attempt.
- T03-14: Learner creation/selection supports native keyboard operation,
  visible labels, `focus-visible`, accessible status/error announcements and
  touch targets of at least 44×44px; learner-focused create CTA may use 48px.
- T03-15: A reusable server-side learner-ownership authorization seam resolves
  `session.user.id → household_members → household_id →
  learner_profiles.household_id`; a learner in the authenticated household is
  `ALLOW`, a learner in another household is `FORBIDDEN`, a learner UUID alone
  is insufficient, and the API boundary maps the forbidden result to `403
  HOUSEHOLD_ACCESS_DENIED`. No new public learner-by-id endpoint is introduced
  solely for this test.
- T03-16: No client UI, console log, telemetry or error response exposes SQL,
  stack traces, cookies, sessions, secrets, database URLs or internal details.
- T03-17: US-01 registration, US-02 login/session/bootstrap, clean migration,
  and the learner schema/API/UI acceptance suites remain green. Trusted DB
  Integration is required for acceptance because US-03 adds the learner table,
  FK, deterministic index, migration, runtime/migration privilege expectations
  and app-only reset behavior; migration and trusted DB evidence are recorded
  before implementation acceptance.

## 8. UX/UI Contract

- Entry: `authenticated-household-ready` hands off to learner resolution; the
  next story owns the learner-home route after `learner-context-ready`.
- Learner Selector uses the approved Single column/cards pattern: stacked cards
  on mobile and an optional 2–3 column grid on wider screens.
- States: loading, empty/zero learners, one-learner auto-resolving, multiple
  learners, validation, submitting, API/network error, retry and success handoff.
- Empty state has one clear primary “Tạo hồ sơ học” action and no meaningless
  empty list. Create asks only for display name in US-03.
- Cards are semantic buttons/links with visible learner names, clear selected
  state, keyboard order and focus-visible ring. Disabled profiles are not shown.
- Form errors sit near the field and are announced without color-only meaning;
  raw provider/database details never render.
- Mobile is the base layout with 16px gutter and no horizontal overflow;
  tablet/desktop may use the documented grid. Interactive targets are at least
  44×44px; the learner-focused CTA is 48px when applicable.

## 9. Domain and Business Rules

- Learners are profiles, not authentication identities. Parent Better Auth is the
  only auth boundary.
- A profile belongs to exactly one household. `enabled=false` is soft-disabled
  state; US-03 does not mutate it.
- `avatar_key` is nullable in the persisted model but is not accepted by the
  US-03 create form/API because no approved avatar asset/preset contract exists.
- Display names are household-local labels; no uniqueness rule is introduced
  by this story, so two profiles may have the same display name.
- The active learner is short-lived client/navigation context only. The server
  re-authorizes any future learner-scoped operation from the session and learner
  ID; the client selection is never an authorization decision.

## 10. API Contract

### `GET /api/learners`

- Requires a valid Better Auth session; no session returns `401`.
- Resolve the canonical household from the authenticated parent membership; do
  not accept a household ID query parameter. An authenticated user without the
  required household ownership returns `403` with a safe error.
- Query `vocabflow_app.learner_profiles` for `enabled=true`, ordered by
  `created_at ASC, id ASC`.
- `200` response: `{ "learners": LearnerDto[] }`; an empty array is valid.

### `POST /api/learners`

- Requires the same authenticated household resolution; no session returns
  `401`, missing/unauthorized household returns `403`.
- Strict request body: `{ "displayName": string }`. `householdId`, `learnerId`,
  `avatarKey` and unknown fields are not accepted; any such extra property
  returns `400 INVALID_REQUEST`.
- Trim and validate `displayName` at the API boundary (1–80 characters); the
  server generates the UUID, sets `enabled=true`, leaves `avatar_key=NULL`,
  and persists the resolved household ID.
- `201` response returns the canonical `LearnerDto`:
  `{ id, householdId, displayName, avatarKey: null, enabled, createdAt,
  updatedAt }`. The client may use the DTO for handoff but cannot grant access.
- Stable safe errors: `UNAUTHORIZED` (401), `HOUSEHOLD_ACCESS_DENIED` (403),
  `LEARNER_DISPLAY_NAME_INVALID` (400), `INVALID_REQUEST` (400), and
  `INTERNAL_ERROR` (500/503 as established by the Worker boundary). Error
  messages contain no SQL/provider detail.
- Create is not an enterprise idempotent operation in this story. UI locking
  prevents duplicate in-flight submits; a later deliberate POST may create a
  separate profile, including one with the same display name.

## 11. Authorization and Security

- Authorization is server-side and follows exactly:
  `session.user.id → household_members → household_id →
  learner_profiles.household_id`.
- The client never accesses Neon/Drizzle and never chooses the authorized
  household. A known learner UUID alone is not authorization.
- No session → `401`; authenticated but not a member/owner of the required
  household or cross-household learner → `403`.
- Any future learner-scoped endpoint must apply the same chain; the GET list
  itself has no learner ID, so the cross-household `403` test belongs to the
  service/authorization seam and the first learner-scoped endpoint, not to an
  invented US-03 list parameter.
- Do not log or return passwords, session/cookie values, SQL, connection
  strings, stack traces or secrets.

## 12. Data and Persistence Contract

`vocabflow_app.learner_profiles` is added by one forward-compatible Drizzle
migration after approval:

| Column | Contract |
|---|---|
| `id` | `uuid` primary key, server-generated |
| `household_id` | `uuid NOT NULL`, FK to `vocabflow_app.households(id)` with `ON DELETE RESTRICT` |
| `display_name` | `text NOT NULL`, API-trimmed 1–80 character label |
| `avatar_key` | nullable `text`; remains `NULL` in US-03 creates |
| `enabled` | `boolean NOT NULL DEFAULT true`; soft-disable flag |
| `created_at`, `updated_at` | `timestamptz NOT NULL DEFAULT now()` |

Add the deterministic lookup index `(household_id, enabled, created_at, id)`.
Do not add display-name uniqueness,
active-learner storage, progress tables, learner delete cascades or unrelated
schema changes. App-only reset must preserve `vocabflow_meta`, bootstrap
metadata and protected identity; the new application table is resettable only
under the existing app-only reset policy.

## 13. Error and Recovery Matrix

| Situation | Expected behavior | Recovery |
|---|---|---|
| No session | `401`, no list/create | Sign in through accepted auth flow |
| No authorized household | `403`, safe error | Re-run accepted bootstrap or recover account state |
| Empty learner list | Explicit empty state + CTA | Submit a valid display name |
| Invalid/blank/overlong name | Inline `400`, preserve usable input | Correct and retry |
| Unknown/extra request property | `400 INVALID_REQUEST`, no write | Remove the extra property and retry |
| Create pending | Disable submit/status | Wait for response |
| Duplicate submit | One in-flight create only | Continue original attempt |
| List/create network or 5xx | Safe error, no fake learner/context | Retry the read; for uncertain create, refetch GET first and only then explicitly create again |
| Disabled learner | Omit from list/selection | No action in US-03 |
| Cross-household learner | `403`, no existence detail | Return to authorized resolution |
| Malformed API response | Safe failure, no handoff | Retry/refetch canonical list |

## 14. Concurrency and Idempotency

- The server remains authoritative for household ownership and learner
  persistence. The UI must prevent duplicate in-flight creates.
- US-03 does not add an idempotency key or client retry that can silently create
  a second profile. A failed create can be retried explicitly; a completed POST
  is not replayed automatically. If the client cannot determine whether a
  dispatched POST committed, it must refetch GET `/api/learners` first and show
  the canonical result before allowing an explicit new create attempt.
- Two identical POST requests that genuinely reach the server concurrently are
  not deduplicated; two profiles may be created. This is accepted MVP behavior.
- GET ordering is deterministic, so concurrent reloads cannot change the
  learner-resolution result for the same committed rows.
- The existing BATCH 0 advisory lock/role architecture is untouched.

## 15. Test Plan

- **Contracts/schema:** Zod tests for `LearnerDto`, strict create input,
  stable errors and UUID/date serialization.
- **DB/service:** migration creates the table/index/FK in `vocabflow_app`; own
  household list/create, enabled filtering, deterministic order, trim/limits,
  strict rejection of client household IDs, and reusable learner-ownership
  authorization seam tests proving same-household `ALLOW`, cross-household
  `FORBIDDEN`, and learner UUID alone insufficient.
- **Worker/API:** `401`, `403`, validation `400`, `201`, empty `200`, safe
  `500/503`, `INVALID_REQUEST` for extra fields, mapping forbidden seam results
  to `403 HOUSEHOLD_ACCESS_DENIED`, and no sensitive error leakage.
- **React component:** loading, empty, create validation/submitting/success,
  duplicate-submit lock, one auto-resolution, multiple selector, disabled
  omission, API error/retry, keyboard/focus and accessible announcements.
- **Playwright E2E:** accepted signup/login/bootstrap → zero learner create →
  handoff; one learner auto-resolution; two learners explicit selection;
  reload/refetch; invalid/retry and responsive 375/768/1280 checks.
- **Regression:** US-01 registration and US-02 login/session/bootstrap remain
  green.
- **Trusted DB Integration:** required for US-03 because it adds a PostgreSQL
  schema/migration, FK/index, runtime/migration privilege expectations and
  reset/clean-migration behavior. It was not run during the earlier
  documentation-only preparation and remains the required acceptance gate.
  Core CI remains required as usual.

## 16. Expected Files and Modules

Likely areas, not a mandatory implementation list:

- `apps/api/src/db/schema.ts`, learner service/route and related Worker tests.
- `packages/contracts/src/index.ts` for DTO/error schemas.
- `apps/web/src/features/learners/` and route/shell handoff wiring.
- `drizzle/` migration and reset/test fixtures, only after approval.
- Component/API/E2E/accessibility/responsive tests and this story's evidence.

These areas are the active implementation surface for this story; no unrelated
application, BATCH 0 or US-04 area is in scope.

## 17. Implementation Sequence

1. Owner-approved contract is the implementation baseline; no further scope
   decisions are required before implementation.
2. Add the additive learner schema/migration and shared contracts; verify clean
   migration and app-only reset preservation in Trusted DB Integration.
3. Implement authorized GET/POST routes and service tests.
4. Implement learner resolution/create/selector UI and safe states.
5. Add API/component/E2E/accessibility/responsive and US-01/US-02 regression
   evidence.
6. Only after all gates pass, promote the story to `ACCEPTED`.

## 18. Definition of Done

- T03-01 through T03-17 pass with evidence.
- PostgreSQL remains canonical and all learner-scoped access uses the ownership
  chain; no learner auth identity is introduced.
- Additive migration, app-only reset and Trusted DB Integration pass.
- 0/1/2+ resolution and `learner-context-ready` handoff work without Learner
  Home/learning scope leakage.
- Core CI, Trusted DB Integration, API/component/E2E/accessibility/responsive
  checks pass; no secrets or unrelated BATCH 0 changes exist.
- Story status changes to `ACCEPTED` only after implementation evidence.

## 19. Open Questions and Blockers

- Owner decisions are locked: `displayName` is trimmed and validated at 1–80
  characters; duplicate display names are allowed; extra request fields return
  `400 INVALID_REQUEST`; `learner-context-ready` is the canonical handoff;
  active learner is short-lived client/navigation state; and US-03 creates keep
  `avatar_key=NULL`.
- The reusable learner-ownership authorization seam is required, while the
  first learner-scoped endpoint remains a later-story responsibility.
- No technical blocker remains. Implementation is in progress within the
  approved learner schema/API/UI scope; no US-04 implementation has started.

## 20. Acceptance Evidence

Implementation checkpoint (not final acceptance): learner schema/migration,
server-derived list/create service and routes, authorization seam, and
0/1/2+ learner resolution UI have been added. Automated evidence is being
completed locally; the story remains `IN PROGRESS` until all T03-01–T03-17
gates, including Trusted DB Integration, are accepted by the owner.

Local implementation validation so far: `pnpm lint` PASS,
`pnpm typecheck` PASS, `pnpm test` PASS (137 tests), `pnpm build` PASS and
`pnpm test:e2e` PASS (9/9, including US-01/US-02 regression coverage). These
results are implementation evidence only; Trusted DB Integration remains the
required acceptance gate before this story can become `ACCEPTED`.

Manual acceptance core-flow checkpoint (owner review, 2026-09-10):

- PASS — zero-learner empty state.
- PASS — create first learner.
- PASS — one-learner auto-resolution.
- PASS — 2+ learner selector.
- PASS — explicit learner selection.
- PASS — reload with one learner.
- PASS — reload with 2+ learners returns the selector.
- PASS — empty `displayName` validation.
- PASS — native Enter create.
- PASS — keyboard Tab + Enter learner selection.

This manual checkpoint does not complete the story. `T03-17` remains `PARTIAL`,
Trusted DB Integration remains `PENDING ACCEPTANCE GATE`, and the story status
remains `IN PROGRESS`.

Acceptance-criteria checkpoint:

| Criterion | Current evidence status |
|---|---|
| T03-01 | PASS — authenticated household-scoped enabled list service/API tests. |
| T03-02 | PASS — unauthenticated GET returns 401. |
| T03-03 | PASS — unauthenticated POST returns 401 without service invocation. |
| T03-04 | PASS — server household resolution and strict client-field rejection tests. |
| T03-05 | PASS — server UUID, enabled=true, avatar=NULL and 201 DTO tests. |
| T03-06 | PASS — trim/1–80 validation and strict extra-field tests. |
| T03-07 | PASS — deterministic ordering contract and empty 200 response tests. |
| T03-08 | PASS — zero-learner create and first context handoff component/E2E tests. |
| T03-09 | PASS — one-learner auto-resolution component/E2E tests. |
| T03-10 | PASS — multiple-learner keyboard selector component/E2E tests. |
| T03-11 | PASS — enabled filtering in service and defensive UI filtering tests. |
| T03-12 | PASS — duplicate create/selection locking tests. |
| T03-13 | PASS — safe failure, retry and uncertain-create reconciliation tests. |
| T03-14 | PASS — labeled native form, keyboard, focus-visible and responsive coverage. |
| T03-15 | PASS — reusable same-household ALLOW/cross-household FORBIDDEN seam tests. |
| T03-16 | PASS — safe error-envelope and no sensitive-detail leakage tests. |
| T03-17 | PARTIAL — local regression/migration/schema/reset and E2E gates pass; Trusted DB Integration is pending acceptance. |
