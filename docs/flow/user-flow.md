# User Flow v1

- Status: CURRENT FLOW BASELINE
- Version: v1
- Source baseline: `VocabFlow_User_Flow_v1.docx`
- Canonical format: Markdown
- Last synchronized: 2026-10-03

**VOCABFLOW**

## Continue Learning extension (US-47)

Active learner opens Home → the “Tiếp tục học” card requests one learner-scoped
summary → server selects an actually partial Topic, active assigned Learning
Set, or Saved collection using collection-local progress and latest review
activity as a heuristic (review events do not identify the source collection)
→ learner selects “Tiếp tục học” → Study Setup opens with the exact
Topic/Set/all-saved scope. When no partial collection exists, Home keeps its
queue-based “Bắt đầu phiên học” fallback. The application does not persist an
incomplete Study queue or mode, so this flow does not claim to resume an exact
session.

## Reward extension (US-39 / US-40)

Learner completes a persisted scheduled review → server evaluates immutable
rewards → learner later opens Progress to view level and badges. Retry and
reinforcement never add rewards. Reset returns current vocabulary state to New
but keeps historical rewards and unlocked badges.

For an exercise, the learner submits an answer → the server verifies it against
the canonical target → a matching scheduled review receives its one correct
exercise bonus; mismatched recall claims are rejected and reinforcement stays
session-local with zero XP.

## Progress detail extension (US-37 / US-38)

Parent selects a learner → opens Progress → sees current summary, daily goal
and streak → inspects the last seven household-local dates and current topic
state. A learner switch reloads every learner-scoped read model. Reset leaves
historical weekly activity intact while topic state returns to virtual New.

## Saved vocabulary extension (US-46)

Parent selects the active learner → saves or removes vocabulary from the
Catalog or Word Detail → opens `/saved` to search/filter that learner's saved
words → chooses “Học tất cả từ đã lưu” → Study Setup opens the explicit
`saved=1&content=all` collection → the server returns every enabled saved word
and classifies new, genuinely due, and voluntary not-due practice separately.
The ordinary New/Review/Mixed modes keep their existing New/Due behavior.
Learner switching reloads the saved relationship; Study and Summary continue
actions retain the all-saved intent.

**User Flow v1**

**Luồng người dùng ngắn gọn cho Family MVP**

| **Mục** | **Nội dung** |
| --- | --- |
| Status | FLOW BASELINE |
| Phạm vi | Parent account + learner profile + learning flow + progress + vocabulary taxonomy and learning-set browse/assignment |
| Mục tiêu | Đọc nhanh để hiểu người dùng đi qua hệ thống như thế nào |
| Không bao gồm | Chi tiết database, API, design token hoặc screen mockup |

Tài liệu này bổ sung cho Technical Architecture và Global Design System, không thay thế hai tài liệu đó.

# 1. Luồng tổng thể

```text
Overall User Flow
Phụ huynh mở VocabFlow
↓
Đăng ký / Đăng nhập
↓
Hệ thống bootstrap Household
↓
Chọn learner hiện có hoặc tạo learner mới
↓
Vào Home của learner
↓
Parent có thể mở Cài đặt learner → chỉnh giới hạn từ mới mỗi ngày
↓
Bắt đầu học
↓
Lưu review + cập nhật progress
↓
Xem kết quả / tiếp tục học
```

> **Nguyên tắc chính**
> Parent là tài khoản đăng nhập. Learner là hồ sơ học tập trong household và không cần email/password riêng trong Family MVP.

# 2. Luồng Parent & Learner

| **Tình huống** | **Luồng** |
| --- | --- |
| Parent lần đầu | Đăng ký → bootstrap household → tạo learner đầu tiên → vào learner home |
| Parent quay lại | Đăng nhập → danh sách learner → chọn learner → learner home |
| Có nhiều learner | Mỗi learner có progress độc lập; đổi learner phải đổi toàn bộ context học |
| Chưa có learner | Empty state → tạo learner → learner home |

- Không dùng chung progress giữa các learner.

- Đổi learner giữa lúc đang học phải thoát/kết thúc phiên hiện tại trước khi đổi context.

## 2.1 Vocabulary browse branch

```text
Learner Home
↓
Mở Từ vựng
↓
Tuỳ chọn lọc cấp độ (hoặc Tất cả cấp độ)
↓
Danh sách enabled vocabulary + trạng thái learner
↓
Duyệt theo chủ đề
↓
Chọn một topic canonical
↓
Xem enabled vocabulary được map vào topic
```

Level NULL remains visible under `Tất cả cấp độ`; the UI never infers a grade.
Topic browsing is read-only and does not create progress, review events or
change the Study queue.

## 2.2 Learning-set and assignment branch

```text
Learner Home hoặc Từ vựng
↓
Mở Bộ từ
↓
Xem danh sách curated learning sets
↓
Chọn một set
↓
Xem vocabulary enabled theo thứ tự membership
↓
Với active learner: mở Quản lý bộ từ
↓
Bật / tắt assignment từng set
↓
Queue lần sau = enabled vocabulary thuộc union các set đang bật
```

Existing learners receive the compatibility starter assignment during
migration; new learners receive it during canonical learner creation. Switching
learner reloads assignment state. Tắt set chỉ thay đổi eligibility, không xóa
progress hoặc review history; bật lại dùng lại progress hiện có.

# 3. Luồng học Flashcard

```text
Study Flow
Learner Home
↓
Bắt đầu phiên học
↓
Server tạo Review Queue
↓
Due trước → New sau
↓
Hiển thị mặt trước Flashcard
↓
Learner lật thẻ
↓
Hiển thị nghĩa / IPA / audio / ảnh dùng được nếu có; ảnh thiếu hoặc bị quarantine được ẩn
↓
Chọn ĐÃ NHỚ hoặc CHƯA NHỚ
↓
POST review
↓
Lưu thành công?
↙                 ↘
Có                 Không
↓                    ↓
Thẻ tiếp theo      Giữ nguyên thẻ + Retry
```

## 3.1 Quy tắc phiên học

| **Rule** | **Behavior** |
| --- | --- |
| Due >= 20 | Tối đa 20 due, không thêm new |
| 0 < Due < 20 | Toàn bộ due + tối đa 10 new |
| Due = 0 | Tối đa 10 new |
| Daily New allowance | New admission = min(session cap, allowance còn lại của learner trong household-local day); default 10, range 0–100. |
| Thứ tự | Due trước, New sau |
| Reinforcement | Có thể chèn lại từ chưa nhớ tối đa 2 lần trong phiên; không persist scheduler lần nữa |

## 3.2 Luồng bài tập có kiểm soát (US-31 through US-34)

```text
Learner Home
↓
Luyện bài tập trắc nghiệm
↓
Server tạo cùng Review Queue canonical
↓
Chọn loại bài deterministic sau khi queue admission hoàn tất
↙                 ↓                  ↘
Meaning choice   Image to word       Listening / Type word
↓                ↓                  ↓
Chọn nghĩa Việt  Nhìn hình → từ Anh  Audio → từ Anh / cue → gõ từ
↘                 ↓                  ↙
Feedback + khóa lựa chọn
↓
POST review canonical
↓
Lưu thành công → Tiếp tục
Lưu lỗi → giữ bài + Retry cùng reviewId
```

Exercise mode không bypass enabled vocabulary, learning-set assignment,
scheduler eligibility hoặc daily New limit. Thiếu distractor an toàn dùng
Flashcard; audio/image/cue thiếu, hỏng hoặc ảnh bị owner quarantine dùng
fallback an toàn và không tự ghi `FORGOTTEN`. Typing dùng spelling exact sau
NFKC/trim/case normalization, không fuzzy-match và không gửi raw input lên
review API.
`/study` vẫn là Flashcard path mặc định.

## 3.3 Kết thúc phiên

```text
Hết queue
↓
Session Summary
↓
Về Learner Home hoặc bắt đầu phiên tiếp theo
```

# 4. Luồng lưu tiến trình & lỗi chính

| **Tình huống** | **Hành vi UI** |
| --- | --- |
| Review lưu thành công | Nhận canonical result → cập nhật UI → chuyển thẻ |
| Network/save failed | Không chuyển thẻ; hiển thị “Chưa lưu tiến trình” + Retry |
| Retry | Dùng lại cùng `reviewId` |
| 409 stale revision | Reload canonical progress → thông báo nhẹ → tiếp tục từ state mới |
| Hết daily New allowance | Không thêm New; Due vẫn được học. Review write stale NEW bị server từ chối an toàn. |
| Session expired | Dừng write → yêu cầu đăng nhập lại → không giả vờ đã lưu |
| Audio lỗi/bị chặn | Flashcard vẫn dùng được; audio chuyển thành unavailable state |
| Không còn due/new | Hiển thị completed/empty state; không tạo phiên rỗng |
| GET lỗi nhưng có cache | Có thể hiển thị cache ở trạng thái stale/read-only; review mới vẫn cần server |

# 5. Luồng Progress

```text
Progress Flow
Learner Home
↓
Mở Progress
↓
Hiển thị progress của learner hiện tại
↓
Quay lại learner selector hoặc tiếp tục học
```

> **Metric boundary**
> Ý nghĩa cụ thể của “Đã học”, “Đã nhớ”, “Chưa nhớ”, “Tuần này”… phải được khóa trong Family MVP Feature UI Spec. User Flow chỉ xác định đường đi, không định nghĩa metric.

# 5.1 Daily goal và learning streak (US-35 / US-36)

```text
Learner Home
↓
Mở Progress
↓
GET activity-summary cho learner hiện tại
↙                                      ↘
Daily Goal: unique reviewed / goal      Streak: current / longest
↓                                      ↓
completed khi reviewedUnique >= goal    active day theo review_date local
```

Daily goal và streak là hai chỉ báo độc lập. Daily goal đếm distinct
`vocabularyId` từ review đã persist trong household-local date; reinforcement,
retry và nhiều learning set không nhân đôi. Remembered và Forgotten đều tính,
review lỗi không tính. Streak active khi ngày có ít nhất một review thành công;
nếu hôm nay chưa học nhưng hôm qua active thì current streak vẫn tiếp tục trong
ngày hiện tại. Cả hai giá trị được đọc lại từ server sau learner switch,
reload, logout/login và reset progress.

Parent mở learner settings để xem/chỉnh Daily New Limit và Daily Learning Goal;
hai setting không thay thế hoặc giới hạn lẫn nhau.

# 6. Flow Acceptance

| **ID** | **Điều kiện** |
| --- | --- |
| F1 | Parent lần đầu đi được từ đăng ký → tạo learner → bắt đầu học. |
| F2 | Parent quay lại chọn đúng learner và thấy đúng progress. |
| F3 | Mỗi learner có progress độc lập. |
| F4 | Review chỉ chuyển thẻ sau khi server xác nhận lưu thành công. |
| F5 | Retry không tạo review trùng. |
| F6 | Không có due/new thì không tạo phiên học rỗng. |
| F7 | Auth/network/stale đều có recovery path rõ. |
