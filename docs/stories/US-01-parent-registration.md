# US-01 — Parent Registration

- Status: IN PROGRESS
- Batch: BATCH 1
- Owner: Project Owner
- Last updated: 2026-09-08
- Baseline commit: `24e4580` (BATCH 0 acceptance evidence)

## 1. User Story

Là phụ huynh, tôi muốn đăng ký tài khoản để bắt đầu sử dụng VocabFlow cho gia
đình.

## 2. Outcome

Một parent có thể gửi form đăng ký bằng email và password, nhận authenticated
session từ Better Auth, rồi hoàn tất `POST /api/bootstrap` để resolve canonical
default household. Better Auth signup success alone **không phải** completed
Family registration boundary. Nếu bootstrap thất bại, không được giả vờ đăng
ký gia đình đã hoàn tất; phải giữ authenticated state và hiển thị recovery/retry
an toàn theo contract idempotent của server.

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
- `T01-02`: Email/password/required-field validation.
- `T01-03`: Password show/hide, Enter submit và autocomplete phù hợp.
- `T01-04`: Better Auth signup, loading/error state, giữ email khi lỗi và chống
  duplicate submit, followed by authenticated `POST /api/bootstrap`.
- Parent account only; learner không có email/password riêng.

## 6. Out of Scope

- Login, logout và forgot-password UI.
- Learner selector, learner creation hoặc study flow. Learner creation remains
  out of scope even though the resulting default household is required.
- Learner own login/PIN, social login và email verification UI nếu auth config
  không bắt buộc.
- Offline write queue, AI, gamification, payment, admin CMS và analytics.
- Bất kỳ database schema/role/migration thay đổi nào thuộc BATCH 0.

## 7. Acceptance Criteria

- AC-01: Register dùng Focused Task auth layout, một primary action và không
  hiển thị app navigation.
- AC-02: Form có visible labels cho email/password và required messages gần
  field, không chỉ dùng placeholder.
- AC-03: Email và password được validate trước submit; invalid form không gọi
  signup request.
- AC-04: Password có show/hide control với accessible label và không làm mất
  giá trị.
- AC-05: Register dùng `autocomplete="email"` và
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
- Bootstrap phải dùng contract idempotent/race-safe đã khóa trong Architecture;
  không tạo schema hoặc migration mới cho US-01.

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
- US-01 không giới thiệu database schema hoặc migration mới.

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

- Unit: email/password/required-field validation và submit guard.
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

- All AC-01 through AC-13 pass with evidence.
- Better Auth signup and required household bootstrap boundaries are explicit
  and tested.
- Signup-only success is never presented as completed Family registration.
- No unrelated BATCH 0/database/migration diff.
- Relevant lint, typecheck, unit/component, API and E2E checks pass.
- Story status is updated to `ACCEPTED` only after review evidence is recorded.

## 19. Open Questions and Blockers

None. The owner-approved successful Family registration boundary is Better Auth
signup → authenticated session → `POST /api/bootstrap` → canonical default
household resolved. Learner creation remains out of scope for US-01.

## 20. Acceptance Evidence

- Phase 1 (T01-01/T01-02/T01-03) implemented in the web app:
  - `/register` uses the Focused Task auth layout with VocabFlow identity,
    visible email/password labels and the required secondary Login link.
  - Email and required-password validation run through the extracted
    registration validation seam; errors are inline and accessible.
  - Password visibility toggle, Enter submit, autocomplete and duplicate-submit
    protection are covered by component tests.
- T01-04 (Better Auth signup, authenticated bootstrap and recovery states) is
  still pending and remains the next implementation slice.
- Tests: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- No database schema, migration, bootstrap, role-model, reset or CI changes.

- Commit: pending implementation.
- CI/tests: Phase 1 local checks recorded above; full story acceptance remains
  pending T01-04.
- Screenshots/manual evidence: local Playwright render checks passed at
  375px, 768px and 1280px; screenshots are retained outside the repository.
- Final status: IN PROGRESS.
