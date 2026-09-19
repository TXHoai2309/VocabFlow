# User Flow v1

- Status: CURRENT FLOW BASELINE
- Version: v1
- Source baseline: `VocabFlow_User_Flow_v1.docx`
- Canonical format: Markdown
- Last synchronized: 2026-09-08

**VOCABFLOW**

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
Hiển thị nghĩa / IPA / audio / image nếu có
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
| Thứ tự | Due trước, New sau |
| Reinforcement | Có thể chèn lại từ chưa nhớ tối đa 2 lần trong phiên; không persist scheduler lần nữa |

## 3.2 Kết thúc phiên

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
