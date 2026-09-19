# US-36 — Learning Streak

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Dependencies: US-07 canonical review events, US-19 summary, US-20 progress,
  US-24 reset and household timezone.

## User story

Là learner, tôi muốn thấy số ngày học liên tiếp để duy trì thói quen.

## Gap audit

- `T36-01`–`T36-06`: `MISSING` ở product/API/UI; persisted `review_date` và
  household timezone đã sẵn sàng làm nền tảng.

## Canonical behavior

- Một local calendar date là active khi learner có ít nhất một canonical
  successful persisted review event trong ngày đó. Goal không quyết định active
  day.
- Activity dates dùng `review_events.review_date`, được server ghi theo
  household timezone; không group trực tiếp theo UTC date.
- `currentStreak`: nếu hôm nay active, đếm chuỗi kết thúc hôm nay; nếu hôm nay
  chưa active nhưng hôm qua active, tiếp tục hiển thị chuỗi kết thúc hôm qua;
  nếu cả hôm nay và hôm qua đều không active thì bằng `0`.
- `longestStreak` là chuỗi active local dates dài nhất trong toàn bộ review
  history. Nhiều review trong một date chỉ tính một ngày.
- Cả `REMEMBERED` và `FORGOTTEN` đều thể hiện participation; retry duplicate
  không làm tăng activity date.

## API and UI

`GET /api/learners/:learnerId/activity-summary` trả:

- local date hiện tại;
- daily goal progress;
- `currentStreak`, `longestStreak`, `todayActive`.

Progress page hiển thị chuỗi hiện tại và kỷ lục, tách biệt với trạng thái daily
goal, với loading/error, empty history, learner switch và safe retry.

## Persistence and limitations

- Streak là derived read model từ review history, không lưu mutable counters.
  Vì vậy reload/logout/login không làm mất streak.
- US-24 reset chỉ xóa `learner_progress`, giữ `review_events`; streak và daily
  history được giữ nguyên.
- Unassign learning set hoặc disable vocabulary hiện tại không retroactively
  xóa active dates lịch sử.
- `review_date` là local date được snapshot khi event được ghi. Nếu household
  timezone thay đổi, các event cũ không được rebucket lại theo timezone mới;
  local date mới dùng timezone hiện tại. Đây là limitation được giữ minh bạch
  cho MVP, không tạo timezone-history model trong story này.

## Acceptance evidence

Focused streak/date tests, review-history aggregation, reset/unassign regression,
full unit/component tests, E2E, lint, typecheck, build, diff check và Trusted DB
acceptance phải PASS trước owner check.
