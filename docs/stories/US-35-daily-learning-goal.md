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

- Learner có hai mục tiêu độc lập: `daily_new_word_goal` mặc định `10` và
  `daily_review_word_goal` mặc định `20`; cả hai là integer learner-scoped trong
  phạm vi `1..100`. Migration 0018 chỉ thêm cột/default/check, không backfill
  hay sửa progress/history.
- New completion đếm distinct vocabulary đã chuyển khỏi `NEW` trong canonical
  persisted `review_events` (`previous_status = NEW`, `new_status <> NEW`), theo
  household-local `review_date`.
- Review completion đếm distinct vocabulary có trạng thái trước đó khác `NEW`,
  theo cùng learner và household-local `review_date`. Một vocabulary lặp lại,
  reinforcement, retry hoặc xuất hiện qua nhiều learning set vẫn đóng góp đúng
  `1` cho category tương ứng.
- Cả `REMEMBERED` và `FORGOTTEN` đều là hoạt động học và đều được tính.
  Review thất bại hoặc chưa persist không được tính.
- Mỗi hàng progress dùng `remaining = max(0, goal - completed)` và
  `percent = min(100, round(completed / goal * 100))`. Overall percent là tổng
  số từ mới và từ ôn đã hoàn thành chia tổng hai mục tiêu, làm tròn và cap 100.
  Daily goal chỉ complete khi cả hai category đạt mục tiêu; count thật không bị
  cap.
- Daily goals khác hoàn toàn Daily New Limit: goal là mục tiêu UI/XP; New Limit
  vẫn là hard cap của scheduler cho số từ `NEW` được đưa vào queue. Due review
  vẫn được ưu tiên và không bị giới hạn bởi New Limit.
- Streak giữ nguyên nguồn và quy tắc hiện tại từ các ngày `review_date` có ít
  nhất một review thành công; timezone household là nguồn ngày canonical.

## API and UI

- `GET /api/learners/:learnerId/activity-summary` trả `localDate`, daily goal
  progress mới/ôn, overall progress và streak trong một read model
  learner-scoped.
- Settings GET/PATCH trả và cập nhật `dailyNewWordLimit`, `dailyNewWordGoal` và
  `dailyReviewWordGoal`; PATCH hỗ trợ cập nhật từng field, giữ authorization
  same-household và validation 400/403 hiện hữu.
- Home hiển thị progress ring tổng hợp, progress từng mục tiêu và streak thật.
  Progress page hiển thị count mới/ôn và overall percent. Parent settings có hai
  field goal riêng cùng field hard limit scheduler, validation, saving và
  success/error state.

## Persistence and interactions

- Không có mutable `goalCompleted` hoặc client counter.
- Reset progress không xóa `review_events`, nên daily history và streak không
  bị xóa. Unassign learning set cũng không xóa historical activity.
- Logout/reload đọc lại cùng canonical values từ API.

## Acceptance evidence

Focused API/service/UI tests, migration assertions, typecheck, build, feature
ESLint and diff check phải PASS trước owner check. Migration không được apply
trong lúc triển khai feature này.
