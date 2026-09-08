# US-01 — Parent Registration

- Status: IN PROGRESS
- Batch: BATCH 1
- Owner: Project Owner
- Last updated: 2026-09-08
- Baseline commit: `24e4580` (BATCH 0 acceptance evidence)
- T01-04 status: IMPLEMENTED / PENDING ACCEPTANCE

## 1. User Story

Là phụ huynh, tôi muốn đăng ký tài khoản để bắt đầu sử dụng VocabFlow cho gia
đình.

## 2. Outcome

Một parent có thể gửi form đăng ký bằng tên hiển thị, email và password, nhận
authenticated session từ Better Auth, rồi hoàn tất `POST /api/bootstrap` để
resolve canonical default household. Better Auth signup success alone **không
phải** completed Family registration boundary. Nếu bootstrap thất bại, không
được giả vờ đăng ký gia đình đã hoàn tất; phải giữ authenticated state và hiển
thị recovery/retry an toàn theo contract idempotent của server.

`Tên phụ huynh` là display/profile identity được lưu bởi Better Auth theo
contract `signUp.email`; nó không phải tên learner. Tên household vẫn do server
quản lý trong bootstrap contract. Thay đổi này chỉ giải quyết required `name`
của Better Auth và không thêm learner creation.

## 3. Source of Truth References

- [Family MVP Product Specification](../product/product-spec.md#7--family-mvp-feature-scope)
  — parent authentication, default household và vertical slice.
- [Technical Architecture](../architecture/technical-architecture.md#61-auth-ownership)
  và [household bootstrap flow](../architecture/technical-architecture.md#62-household-bootstrap-flow)
  — Better Auth ownership và `POST /api/bootstrap` idempotent/race-safe.
- [Feature UI Specification](../design/feature-ui-spec.md#21-mvp-auth-scope)
  — auth layout, fields, states, validation and accessibility.
- [User Flow](../flow/user-flow.md#2-luồng-parent--learner)
  — parent lần đầu: đăng ký → bootstrap household → tạo learner đầu tiên.
- [Global Design System](../design/design-system.md)
  — mobile-first tokens, focus, touch target và state rules.

## 4. Dependencies

- BATCH 0 Foundation is accepted and frozen.
- Better Auth configuration and its Drizzle adapter remain the auth boundary.
- Same-origin Hono `/api/auth/*` route is available.
- `POST /api/bootstrap` is the required post-signup boundary and is already
  idempotent/race-safe in the Architecture contract.

## 5. In Scope

- `T01-01`: Tạo Register screen theo Feature UI Specification.
- `T01-02`: Parent-name/email/password/required-field validation.
- `T01-03`: Password show/hide, Enter submit và autocomplete phù hợp.
- `T01-04`: Better Auth signup, loading/error state, giữ email khi lỗi và chống
  duplicate submit, followed by authenticated `POST /api/bootstrap`.
- T01-04 may add the minimal additive application migration for
  `vocabflow_app.households` and `vocabflow_app.household_members`, using the
  exact approved Technical Architecture types, constraints, ownership and
  timezone rules. This is BATCH 1 feature work, not a reopening of BATCH 0.
- Parent account only; learner không có email/password riêng.

## 6. Out of Scope

- Login, logout và forgot-password UI.
- Learner selector, learner creation hoặc study flow. Learner creation remains
  out of scope even though the resulting default household is required.
- Learner own login/PIN, social login và email verification UI nếu auth config
  không bắt buộc.
- Offline write queue, AI, gamification, payment, admin CMS và analytics.
- Learner profiles, vocabulary/progress/review tables and any BATCH 0 database
  infrastructure changes. BATCH 0 role model, protected metadata, targets,
  reset policy and migration executor remain frozen.

## 7. Acceptance Criteria

- AC-01: Register dùng Focused Task auth layout, một primary action và không
  hiển thị app navigation.
- AC-02: Form có visible labels cho tên phụ huynh, email/password và required
  messages gần field, không chỉ dùng placeholder.
- AC-03: Tên phụ huynh, email và password được validate trước submit; invalid
  form không gọi signup request.
- AC-04: Password có show/hide control với accessible label và không làm mất
  giá trị.
- AC-05: Register dùng `autocomplete="name"`, `autocomplete="email"` và
  `autocomplete="new-password"`; Enter submit khi form hợp lệ.
- AC-06: Khi submitting, primary action bị disable và có progress indicator;
  duplicate submit không tạo request thứ hai.
- AC-07: Better Auth signup creates an authenticated session, then the client
  invokes `POST /api/bootstrap`; signup success alone is not the completed
  Family registration boundary.
- AC-08: Email đã tồn tại hiển thị account-exists message an toàn và hướng
  người dùng sang Login khi flow Login đã có.
- AC-09: Network error giữ email đã nhập và không giả vờ signup thành công;
  người dùng có thể retry.
- AC-10: Auth errors không lộ stack trace, SQL, secret hoặc security-sensitive
  detail.
- AC-11: If signup succeeds but bootstrap fails, the UI does not claim Family
  registration completed; it preserves authenticated state, exposes safe retry/
  recovery behavior, and retries the idempotent bootstrap contract.
- AC-12: Flow dùng được bằng keyboard, có `focus-visible`, touch target tối
  thiểu 44px theo Global Design System và không tràn ngang trên mobile.
- AC-13: Test chứng minh empty/invalid/submitting/success/account-exists/
  network-error states.
- AC-14: Register thu thập và trim tên phụ huynh; tên rỗng/whitespace bị từ
  chối, còn tên Unicode hợp lệ được truyền nguyên vẹn tới signup seam.

## 8. UX/UI Contract

- Route: auth register route theo router contract hiện có; không tự tạo route
  API thay thế Better Auth.
- Layout: Focused Task, single-column trên mobile, centered narrow panel trên
  desktop.
- Components: semantic design tokens, visible labels, inline validation,
  accessible password toggle và một primary action.
- States: idle, invalid, submitting, success, account exists và network error.
- Responsive: mobile-first; không chỉ thu nhỏ desktop.
- Accessibility: keyboard submit, focus-visible, live announcement cho lỗi
  quan trọng và target tối thiểu 44px.
- Copy: lỗi ổn định, dễ hiểu, không tiết lộ nguyên nhân nhạy cảm.

## 9. Domain and Business Rules

- Parent là authentication boundary; learner profile không phải auth account.
- Một parent mới có default household theo Product/Architecture contract.
- Không client nào tự quyết định authorization hoặc canonical progress trong
  story này.

## 10. API Contract

- Better Auth xử lý signup qua Hono `/api/auth/*`; không tự fork password flow.
- Request/response field cụ thể phải bám Better Auth version đã pin và code
  adapter hiện có; không invent endpoint hoặc schema khác.
- Sau Better Auth signup success, gọi `POST /api/bootstrap` trong authenticated
  session. Chỉ khi canonical default household được resolve mới đạt Family
  registration success boundary.
- Bootstrap phải dùng contract idempotent/race-safe đã khóa trong Architecture.
- US-01 không sửa BATCH 0 database infrastructure. T01-04 được phép thêm
  migration application additive tối thiểu cho `vocabflow_app.households` và
  `vocabflow_app.household_members`; không thêm learner, vocabulary, progress
  hoặc review tables.

## 11. Authorization and Security

- Không có session hợp lệ thì không gọi các API authenticated tiếp theo.
- Auth error response không lộ SQL, stack trace, secret hay thông tin account
  quá chi tiết.
- Email/password không được log hoặc lưu trong client telemetry.
- Authentication không thay thế authorization; mọi learner/household API sau
  này phải kiểm tra membership ở server.

## 12. Data and Persistence Contract

- Better Auth owns `user`, `session`, `account`, `verification` theo adapter.
- Không tạo bảng auth cạnh tranh.
- Bootstrap household phải tạo/resolve canonical household bằng atomic
  idempotent write; registration không được coi là hoàn tất trước boundary đó.
- US-01 không sửa BATCH 0 database foundation. T01-04 có thể giới thiệu đúng
  hai application tables `households` và `household_members` trong
  `vocabflow_app` theo Architecture; learner profiles vẫn out of scope.

## 13. Error and Recovery Matrix

| Situation | Expected behavior | Recovery |
|---|---|---|
| Empty required field | Inline message gần field; không gửi request | Điền field và submit lại |
| Invalid email/password | Inline validation; không gửi request | Sửa input |
| Submitting | Disable duplicate action; giữ input | Chờ response |
| Email already exists | Safe account-exists message | Chuyển sang Login |
| Network/server error | Safe error; giữ email; không fake success | Retry |
| Auth error detail | Không hiển thị SQL/stack trace/secret | Dùng safe copy |
| Signup succeeds, bootstrap fails | Giữ authenticated state; không báo Family registration hoàn tất; hiển thị safe recovery | Retry `POST /api/bootstrap` theo contract idempotent |

## 14. Concurrency and Idempotency

- UI duplicate-submit protection là bắt buộc.
- Better Auth request không được gửi hai lần do Enter + click cùng lúc.
- `POST /api/bootstrap` phải idempotent tuần tự và đồng thời; một parent chỉ có
  canonical default household.

## 15. Test Plan

- Unit: parent-name/email/password/required-field validation và submit guard.
- Component: all UI states, password toggle, Enter submit, preserved input,
  accessible labels and live error region.
- API/Worker: Better Auth signup success, duplicate account và safe errors.
- Integration: authenticated signup → bootstrap success boundary; bootstrap
  retry/concurrency tests.
- E2E: mobile/desktop register flow, keyboard path, retry after network error.
- Accessibility: labels, focus-visible, keyboard and target-size checks.
- Responsive: no horizontal overflow and focused auth layout at supported
  viewport sizes.

## 16. Expected Files and Modules

Likely areas (not a mandatory implementation list):

- `apps/web/src/` register route/page/components/styles.
- `apps/api/src/auth.ts` or approved Better Auth integration boundary.
- `drizzle/` additive application migration for `households` and
  `household_members` only, when implementing T01-04.
- Shared contracts only if an actual API contract requires them.
- Relevant component/Worker/E2E tests and docs evidence.

## 17. Implementation Sequence

1. Confirm the route and Better Auth signup contract from the pinned integration.
2. Build the Register UI and states from the Feature UI Spec.
3. Add validation, keyboard/autocomplete and duplicate-submit guard.
4. Integrate signup, authenticated bootstrap and safe error/recovery handling.
5. Add tests and responsive/accessibility evidence.
6. Update this story, `docs/ai-progress.md` and `docs/changelog.md`.

## 18. Definition of Done

- All AC-01 through AC-14 pass with evidence.
- Better Auth signup and required household bootstrap boundaries are explicit
  and tested.
- Signup-only success is never presented as completed Family registration.
- No BATCH 0 database infrastructure, role model, protected metadata, target,
  reset policy or migration-executor diff; only the reviewed additive
  `vocabflow_app` household migration is allowed for T01-04.
- Relevant lint, typecheck, unit/component, API and E2E checks pass.
- Story status is updated to `ACCEPTED` only after review evidence is recorded.

## 19. Open Questions and Blockers

None. The owner-approved successful Family registration boundary is Better Auth
signup → authenticated session → `POST /api/bootstrap` → canonical default
household resolved. Learner creation remains out of scope for US-01.

## 20. Acceptance Evidence

- Phase 1 (T01-01/T01-02/T01-03) implemented in the web app:
  - `/register` uses the Focused Task auth layout with VocabFlow identity,
    visible parent-name/email/password labels and the required secondary Login
    link.
  - Parent-name, email and required-password validation run through the
    extracted registration validation seam; errors are inline and accessible.
  - Password visibility toggle, Enter submit, autocomplete and duplicate-submit
    protection are covered by component tests. The valid submission seam now
    passes `{ name, email, password }` with name and email trimmed.
- Better Auth 1.7.2 contract audit resolved blocker
  `US01_BLOCKED_BETTER_AUTH_NAME_CONTRACT`: `name` is required by
  `signUp.email`, so the approved Register contract explicitly collects the
  parent's display name. No fake, derived or hidden name is used.
- T01-04 implementation evidence:
  - Better Auth 1.7.2 signup is called directly with the required
    `{ name, email, password }` contract, then the authenticated client calls
    `POST /api/bootstrap`.
  - The additive migration `0001_curious_miss_america.sql` creates only
    `vocabflow_app.households` and `vocabflow_app.household_members`, with the
    approved UUID/FK/OWNER constraints. No learner or learning-domain tables
    were added.
  - Bootstrap uses one atomic, unique-owner-keyed write to resolve the
    server-owned neutral household name `Gia đình VocabFlow` and an `OWNER`
    membership. It is safe to retry after a partial client flow and does not
    accept a client-supplied owner id.
  - The UI covers signup-pending, bootstrap-pending, safe auth/bootstrap
    errors, authenticated bootstrap recovery and completed Family registration.
    A bootstrap failure never claims registration completed and the retry calls
    bootstrap only.
  - `config/database-reset-policy.ts` resets household members before
    households, then Better Auth tables; protected metadata remains outside
    the reset scope.
- T01-04 is implemented but remains pending owner acceptance evidence; this
  story stays `IN PROGRESS` until that review is complete.
- Targeted API/component/migration tests pass locally, including the atomic
  bootstrap query-shape regression tests. Full repository checks are recorded
  in the implementation handoff after they run.
- The known baseline Playwright preview mismatch remains unchanged: the
  existing `/api/auth/session` smoke expects `503` while the preview serves the
  route as `404`; this is not introduced by T01-04 and is not fixed in this
  story.
- The additive migration is limited to the two household tables above;
  BATCH 0 schema/role/bootstrap/reset/CI infrastructure remains frozen.
- Non-blocking review notes: `/login` does not exist yet and remains out of
  scope; the Enter-submit component test manually fires `submit` after
  `keyDown`, so final US-01 acceptance must include native keyboard E2E/manual
  evidence.

- Commit: pending T01-04 implementation checkpoint.
- CI/tests: implementation checks are pending final local validation; story
  acceptance remains pending owner review.
- Screenshots/manual evidence: local Playwright render checks passed at
  375px, 768px and 1280px; screenshots are retained outside the repository.
- Final status: IN PROGRESS (T01-04 IMPLEMENTED / PENDING ACCEPTANCE).
