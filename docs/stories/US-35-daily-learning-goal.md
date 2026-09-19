# US-35 — Daily Learning Goal

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-19 session summary, US-20 progress summary, US-24 reset,
  US-30 daily New settings and canonical `POST /api/reviews`.

## User story

Là learner, tôi muốn có mục tiêu học hàng ngày để biết hôm nay mình đã hoàn
thành kế hoạch hay chưa.

## Gap audit

- `T35-01`, `T35-04`, `T35-05`, `T35-06`: `MISSING` — chưa có setting, API,
  derived status hoặc parent UI.
- `T35-02`, `T35-03`: `PARTIAL` — review history đã có `review_date`, retry
  idempotency và event persistence; chưa có phép đếm unique/API/UI.

## Canonical behavior

- `learner_profiles.daily_learning_goal` là integer learner-scoped, default
  `10`, range `1..100`. Migration chỉ thêm cột/default/check và không backfill
  hay sửa progress/history.
- Daily progress lấy từ canonical persisted `review_events`, theo
  household-local `review_date`, với `COUNT(DISTINCT vocabulary_id)` cho learner
  và ngày hiện tại.
- Một vocabulary được review nhiều lần, reinforcement, retry hoặc xuất hiện
  qua nhiều learning set vẫn đóng góp đúng `1`.
- Cả `REMEMBERED` và `FORGOTTEN` đều là hoạt động học và đều được tính.
  Review thất bại hoặc chưa persist không được tính.
- `completed = reviewedUnique >= goal`; `remaining = max(0, goal -
  reviewedUnique)`. Giá trị `reviewedUnique` không bị cap, nên có thể hiển thị
  `14 / 10`.
- Daily Learning Goal khác hoàn toàn Daily New Limit: goal đo số vocabulary
  unique đã review; New Limit chỉ giới hạn số vocabulary NEW được giới thiệu.

## API and UI

- `GET /api/learners/:learnerId/activity-summary` trả `localDate`, daily goal
  status và streak trong một read model learner-scoped.
- Settings GET/PATCH trả và cập nhật `dailyNewWordLimit` và
  `dailyLearningGoal`; PATCH hỗ trợ từng field hoặc cả hai, giữ authorization
  same-household và validation 400/403 hiện hữu.
- Progress page hiển thị `reviewedUnique / goal`, trạng thái hoàn thành, loading,
  error và learner switch. Parent settings có hai field, validation, saving và
  success/error state.

## Persistence and interactions

- Không có mutable `goalCompleted` hoặc client counter.
- Reset progress không xóa `review_events`, nên daily history và streak không
  bị xóa. Unassign learning set cũng không xóa historical activity.
- Logout/reload đọc lại cùng canonical values từ API.

## Acceptance evidence

Focused API/service/UI tests, migration assertions, full unit/component tests,
E2E, lint, typecheck, build, diff check và Trusted DB acceptance phải PASS
trước owner check.
