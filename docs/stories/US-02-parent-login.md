# US-02 — Parent Login

- Status: ACCEPTED
- Batch: BATCH 1
- Owner: Project Owner
- Last updated: 2026-09-09
- Baseline commit: `5b415068199f5f693bb1084c8c69a3f8db2d99ad` (current TXH baseline)

## 1. User Story

Là phụ huynh đã có tài khoản, tôi muốn đăng nhập bằng email và password để
tiếp tục sử dụng VocabFlow cho gia đình.

## 2. Outcome

Một parent có thể mở `/login`, gửi email và password qua Better Auth, nhận hoặc
khôi phục authenticated session, rồi gọi `POST /api/bootstrap` để resolve/ensure
canonical default household. Chỉ khi session và household boundary cùng hoàn
tất mới đạt **US-02 login success**.

US-02 kết thúc tại handoff state `authenticated-household-ready`: parent đã xác
thực và household canonical đã được server xác nhận. State này là boundary để
story learner tiếp theo tiếp quản; US-02 không tạo, tải, chọn hoặc xác nhận
learner profile và không giả vờ rằng learner context đã được chọn.

Nếu bootstrap sau login thất bại, authenticated state được giữ lại, UI hiển
thị recovery/retry an toàn và chỉ retry bootstrap theo contract idempotent/race-safe
đã được chấp nhận. Không gửi lại login chỉ để retry bootstrap.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#7--family-mvp-feature-scope)
  — parent authentication, default household và Family vertical slice.
- [Technical Architecture](../architecture/technical-architecture.md#61-auth-ownership)
  và [household bootstrap flow](../architecture/technical-architecture.md#62-household-bootstrap-flow)
  — Better Auth ownership, same-origin API và bootstrap idempotent/race-safe.
- [Technical API surface](../architecture/technical-architecture.md#10-api-surface-v1)
  — Better Auth routes và existing `POST /api/bootstrap` boundary.
- [Feature UI Specification](../design/feature-ui-spec.md#21-mvp-auth-scope)
  và [auth layout/behavior](../design/feature-ui-spec.md#22-layout--behavior)
  — login fields, states, keyboard và accessibility.
- [User Flow](../flow/user-flow.md#2-luồng-parent--learner)
  — parent quay lại bắt đầu bằng đăng nhập; learner handoff thuộc flow sau đó.
- [Global Design System](../design/design-system.md)
  — mobile-first layout, semantic states, focus-visible và touch targets.
- [DEC-002 Parent account boundary](../decisions.md#dec-002--parent-account-is-the-authentication-boundary)
  và [DEC-014 household bootstrap](../decisions.md#dec-014--us-01-registration-includes-household-bootstrap).
- [US-01 Parent Registration](US-01-parent-registration.md)
  — accepted Better Auth/session/bootstrap implementation boundary.

## 4. Dependencies

- BATCH 0 Foundation is `ACCEPTED` and frozen.
- US-01 Parent Registration is `ACCEPTED`.
- Better Auth `1.7.3` owns parent email/password authentication and session
  lifecycle through the existing same-origin `/api/auth/*` route.
- The existing authenticated `POST /api/bootstrap` route and its canonical
  household response are available, idempotent and race-safe.
- `vocabflow_app.households` and `vocabflow_app.household_members` already
  exist from the accepted US-01 application migration.
- No learner schema, learner endpoint or learner UI is a dependency of this
  login slice.

## 5. In Scope

- `/login` parent login screen.
- Email + password login through Better Auth `signIn.email`.
- Existing authenticated-session detection and handoff behavior.
- Duplicate-submit prevention.
- Idle, validation, submitting, invalid-credentials, network/server-error,
  bootstrap-pending, bootstrap-recovery and success states.
- Safe auth errors with no stack trace, SQL, secret, cookie or database detail.
- After a successful sign-in, call the existing `POST /api/bootstrap` boundary
  to resolve/ensure the canonical household.
- Define the `authenticated-household-ready` handoff for the next learner story;
  do not implement learner profiles, selectors or learner routing here.
- Redirect/guard behavior for an already-authenticated parent when the existing
  Better Auth session client can resolve that session.
- Native Enter submission, keyboard/focus behavior, accessibility and
  mobile-first responsive behavior required by the design system.
- Unit, component, Worker/API seam, E2E, accessibility and manual acceptance
  coverage for this login slice.

## 6. Out of Scope

- `learner_profiles` schema or migration.
- `GET /api/learners` or `POST /api/learners`.
- Learner creation, learner selector, learner home or learner context selection.
- Learner PIN/login or any independent learner authentication account.
- Learner progress, vocabulary, review queue, scheduler or study flow.
- Advanced parent dashboard.
- Social login.
- Password reset unless a later approved product/deployment requirement makes
  it mandatory for this slice.
- Custom password verification, competing auth tables or a custom auth route.
- BATCH 0 role model, protected metadata, schema, migration executor, reset or
  CI changes.

## 7. Acceptance Criteria

- T02-01: Parent can open `/login` and see a Focused Task email/password form
  with visible labels and one primary action.
- T02-02: A valid email/password submission calls Better Auth `signIn.email`
  through the existing same-origin `/api/auth/*` boundary; no custom password
  verification is introduced.
- T02-03: Valid credentials create or restore a Better Auth authenticated
  session; the client does not claim login success before the session result is
  successful.
- T02-04: Invalid credentials show a safe inline error with stable user-facing
  copy and do not expose raw Better Auth, SQL, stack-trace or security-sensitive
  detail.
- T02-05: While login or the post-login bootstrap is pending, the primary
  action is disabled and duplicate submit cannot create a second login or
  bootstrap request.
- T02-06: Network or server failure produces a retryable UI state, preserves the
  usable email value, and does not claim authentication or household success.
- T02-07: After a successful sign-in, the client calls `POST /api/bootstrap` with
  the authenticated session; only a valid canonical household response reaches
  the `authenticated-household-ready` boundary.
- T02-08: Repeating login or bootstrap for the same parent does not create a
  duplicate household or membership; retry reuses the accepted idempotent
  bootstrap contract and does not repeat password submission unnecessarily.
- T02-09: If an authenticated parent opens `/login`, the existing Better Auth
  session is detected when supported by the client and the parent is handed to
  `authenticated-household-ready` without re-entering credentials.
- T02-10: Login supports native Enter submission, keyboard-only operation,
  `focus-visible`, visible labels, accessible error announcements and touch
  targets required by the Global Design System.
- T02-11: Login uses `autocomplete="email"` and
  `autocomplete="current-password"`; password visibility behavior, if exposed,
  has an accessible label and does not clear the value.
- T02-12: Bootstrap `401`, invalid response, network failure and server failure
  preserve authenticated recovery semantics: no fake learner handoff, no
  duplicate household creation and a safe retry path that retries bootstrap
  only.
- T02-13: No client UI, browser console log, telemetry payload or test output
  records password, session token, cookie, connection string, secret, SQL or
  internal auth error detail.
- T02-14: Automated and manual acceptance coverage proves the login form,
  validation, success/session, already-authenticated, duplicate-submit,
  bootstrap recovery, keyboard/accessibility and responsive behavior.

## 8. UX/UI Contract

- Route: `/login`; use the existing auth routing/client boundary and do not
  create a replacement auth endpoint.
- Layout: Focused Task, single column on mobile and centered narrow panel on
  desktop; no authenticated app navigation while entering credentials.
- Fields: visible Email and Password labels; `autocomplete="email"` and
  `autocomplete="current-password"`; required validation before submission.
- Primary action: one clear “Đăng nhập” action, disabled while the login or
  bootstrap sequence is pending.
- States: idle, invalid, submitting, invalid credentials, network/server error,
  bootstrap pending, bootstrap recovery and authenticated-household-ready.
- Already-authenticated behavior: do not show a needless credential form when
  the existing Better Auth session client has already resolved a session.
- Handoff: success means household-ready only. Learner selector/home and any
  learner route are owned by the next story.
- Responsive/accessibility: mobile-first, no horizontal overflow,
  keyboard-submit, focus-visible, live error/status announcement and approved
  minimum target size.
- Copy: stable Vietnamese user-facing errors; raw provider/internal detail is
  never rendered.

## 9. Domain and Business Rules

- Parent authentication is the security boundary; learner profiles are not
  authentication accounts.
- Better Auth is authoritative for password and session behavior.
- The canonical household is resolved by the server-owned idempotent bootstrap
  contract, not by client-provided household or user identifiers.
- US-02 does not select or create a learner. The next learner story receives
  an authenticated parent plus resolved household boundary.

## 10. API Contract

- Login: use the pinned Better Auth client
  `authClient.signIn.email({ email, password })`, which uses the existing
  same-origin `/api/auth/*` handler. Do not add a custom password endpoint or
  manually verify hashes.
- Existing-session check: use the Better Auth client/session seam; do not parse
  cookies or session tokens in React.
- Household handoff: after successful sign-in, call the existing
  `POST /api/bootstrap` with `credentials: "include"` and the established empty
  JSON body. Do not send a client-selected household id.
- Bootstrap success: validate the existing
  `householdBootstrapResponseSchema`; a valid canonical household response is
  the only input to `authenticated-household-ready`.
- Bootstrap failure: preserve the session, show safe recovery and retry only
  `POST /api/bootstrap`. A `401` means the session is no longer usable and must
  return to safe auth recovery; other failures remain retryable without a new
  password submission.
- No new US-02 API endpoint or learner DTO is introduced.

## 11. Authorization and Security

- Better Auth owns authentication, session cookies and password behavior.
- No authenticated session must be treated as login success.
- The bootstrap route remains server-authoritative and returns `401` without a
  valid session; its existing safe error envelope is preserved.
- The client never accesses Neon/Drizzle and never decides household ownership.
- No password, session token, cookie, secret, database URL, SQL or provider
  error detail may be logged or returned to the user.
- Learner-scoped authorization remains a later-story server invariant:
  `session.user.id → household_members → learner_profiles.household_id`.

## 12. Data and Persistence Contract

- Better Auth continues to own `user`, `session`, `account` and `verification`.
- Existing household tables and bootstrap persistence are reused unchanged.
- Login may resolve the existing canonical household through `POST /api/bootstrap`
  but introduces no new table, column, enum, migration or reset behavior.
- `learner_profiles` and all learning-domain persistence remain out of scope.

## 13. Error and Recovery Matrix

| Situation | Expected behavior | Recovery |
|---|---|---|
| Empty email/password | Inline required validation; no auth request | Correct the fields and submit again |
| Invalid email format | Inline validation; no auth request | Correct the email |
| Invalid credentials | Safe inline auth error; no raw provider detail | Correct credentials and retry |
| Login pending | Disable primary action and show progress/status | Wait for response |
| Duplicate submit | Only one login request and one bootstrap attempt in flight | Continue the original attempt |
| Auth network/server failure | Safe error; preserve usable email; no fake success | Retry login |
| Auth succeeds, bootstrap pending | Keep authenticated state and show setup progress | Wait for bootstrap |
| Bootstrap `401` | Do not claim household-ready; return to safe auth recovery | Re-authenticate, then retry |
| Bootstrap network/server/invalid response | Preserve authenticated state; safe recovery state | Retry bootstrap only |
| Already-authenticated parent opens `/login` | Skip unnecessary password entry | Resolve/ensure household and use the same handoff |

## 14. Concurrency and Idempotency

- UI duplicate-submit protection is mandatory across both sign-in and bootstrap
  phases.
- At most one login attempt and one bootstrap attempt may be active for a given
  form submission.
- A bootstrap retry reuses the accepted idempotent server contract and never
  creates a second canonical household or OWNER membership.
- Repeated login by the same parent must resolve the same household; US-02 does
  not add a new client-side race barrier or database mechanism.

## 15. Test Plan

- Unit: email/password required and format validation, safe error mapping,
  duplicate-submit guard and login/bootstrap state transitions.
- Component: form labels, autocomplete, password visibility if present,
  invalid/submitting/invalid-credentials/network/bootstrap-recovery/success
  states, preserved email and authenticated-session handoff.
- Worker/API seam: Better Auth success/error boundary, existing-session path,
  bootstrap `401`, safe bootstrap error envelope and no custom auth route.
- Integration: successful sign-in followed by authenticated bootstrap; repeated
  login/bootstrap resolves one canonical household and membership.
- E2E: `/login`, native Enter, invalid credentials, retry after failure,
  already-authenticated redirect/handoff and no learner screen claim.
- Accessibility: visible labels, keyboard-only path, focus-visible, live status
  or error region and required target size.
- Responsive/manual: verify 375px, 768px and 1280px; verify no horizontal
  overflow and that the authenticated-household-ready handoff is explicit.
- Security review: confirm no password/session/cookie/secret/SQL/internal error
  appears in UI, console, telemetry or test output.

## 16. Expected Files and Modules

Likely areas, not a mandatory implementation list:

- `apps/web/src/features/auth/login-page.tsx` and login form/schema/tests.
- `apps/web/src/App.tsx` for the `/login` route and existing-session guard.
- Existing `apps/web/src/features/auth/auth-client.ts` and bootstrap client seam.
- Existing `apps/api/src/index.ts` and Better Auth integration only if the
  approved boundary needs an integration test; no custom login API is expected.
- Existing shared household bootstrap contract; no learner DTO or migration.
- Relevant component, Worker/API, E2E and responsive/accessibility tests.

## 17. Implementation Sequence

1. Confirm the pinned Better Auth `1.7.3` `signIn.email` and existing-session
   client contract; do not invent a password flow.
2. Build `/login` using the approved Focused Task layout, fields, validation,
   keyboard behavior and safe states.
3. Integrate Better Auth sign-in and the existing authenticated bootstrap call.
4. Add already-authenticated guard and the explicit
   `authenticated-household-ready` handoff without learner UI.
5. Add unit/component/Worker/E2E/accessibility/responsive evidence.
6. Update this story, `docs/ai-progress.md` and `docs/changelog.md` only after
   implementation and acceptance evidence exist.

## 18. Definition of Done

- T02-01 through T02-14 pass with evidence.
- Better Auth owns all password/session behavior; no custom verification exists.
- Login reaches only the authenticated-household-ready boundary and does not
  claim learner selection or creation.
- Bootstrap retry and repeated login remain idempotent and safe.
- No learner schema/API/migration, BATCH 0 or dependency change is included.
- Relevant lint, typecheck, unit/component, Worker/API, E2E, accessibility and
  responsive checks pass.
- Story status changes to `ACCEPTED` only after implementation evidence is
  recorded.

## 19. Open Questions and Blockers

- No product-scope blocker remains after the owner decision defining US-02 as
  Parent Login.
- The concrete learner entry route is intentionally deferred to the next
  learner story; US-02 exposes the explicit
  `authenticated-household-ready` boundary instead of inventing a selector or
  learner route.
- This document is `ACCEPTED`. The owner manual acceptance evidence and the
  automated validation evidence below are complete. The learner entry route is
  intentionally deferred to the next story.

## 20. Acceptance Evidence

Final owner acceptance:

- T02-01: PASS — `/login` renders the labeled email/password form.
- T02-02: PASS — valid submission uses Better Auth `signIn.email` through the
  existing same-origin auth boundary.
- T02-03: PASS — Better Auth authenticated session is established/restored.
- T02-04: PASS — invalid password shows a safe inline error.
- T02-05: PASS — duplicate submit is blocked while login/bootstrap is pending.
- T02-06: PASS — network/server failure is retryable and preserves safe state.
- T02-07: PASS — successful login performs `POST /api/bootstrap` and reaches
  `authenticated-household-ready`.
- T02-08: PASS — the existing household is reused; no duplicate household or
  membership was observed.
- T02-09: PASS — browser reload and local server restart preserve the
  authenticated session without needless credential entry.
- T02-10: PASS — native Enter submission, keyboard focus behavior and
  focus-visible/accessibility behavior work as specified.
- T02-11: PASS — email/password autocomplete and password-field behavior are
  covered by the implementation and tests.
- T02-12: PASS — bootstrap/auth recovery remains safe and retryable without a
  fake learner handoff.
- T02-13: PASS — no password, session, cookie, database or internal auth
  detail is exposed in client errors or logs.
- T02-14: PASS — automated, E2E, responsive and manual acceptance coverage is
  complete.

Manual acceptance evidence:

- Valid parent login: PASS.
- Better Auth authenticated session: PASS.
- `POST /api/bootstrap` handoff: PASS.
- `authenticated-household-ready` state: PASS.
- Invalid password safe error: PASS.
- Native Enter submission: PASS.
- Browser reload preserves authenticated session: PASS.
- Restarting the local dev server preserves authenticated session: PASS.
- No learner profile/selector scope introduced: PASS.
- Existing household reused; no duplicate household behavior observed: PASS.

Automated and responsive evidence:

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS — 14 files / 114 tests.
- `pnpm build`: PASS.
- `pnpm test:e2e`: PASS — 5/5, including US-01 regression and US-02 login,
  invalid-credentials and existing-session flows.
- `git diff --check`: PASS.
- Rendered login checks at 375px and 1280px: PASS.
- No learner schema/API/UI, migration, dependency or BATCH 0 change was made.

Final story status: `ACCEPTED`.
