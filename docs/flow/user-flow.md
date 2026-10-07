# User Flow v1

## Single-account learning baseline (2026-10-07)

This owner-approved baseline supersedes the earlier learner-management flow and
all historical create/select/switch instructions below.

- USER_MODEL: 1 authenticated account = 1 learning identity in the UX.
- INTERNAL_MODEL: learner_profile, household/membership, learner_id foreign keys
  and learner-scoped APIs remain for compatibility.
- MULTI_LEARNER_LEGACY: all existing profiles and their progress, reviews,
  saved words and settings remain intact; only one canonical ID is used in UI.
- CANONICAL_RESOLUTION: valid same-user legacy stored ID present and enabled in
  the canonical API list wins; otherwise earliest enabled createdAt, then ID.
  Persist the canonical DTO under vocabflow.activeLearner.v1 scoped by userId.
- FUTURE_MULTI_PROFILE: schema intentionally retained; no unique constraint,
  migration, cleanup, delete, disable, merge or learner-data reassignment.
- LOGOUT: supported through Better Auth signOut; clear internal storage only
  on success, then replace navigation with /login. Failure preserves the app
  and storage and displays “Không thể đăng xuất. Vui lòng thử lại.”

Register → auth created → household bootstrap → / → resolving → ready Home.
Bootstrap failure retains “Thử lại thiết lập”; the app is entered after recovery.
Login → / → resolving → ready Home. Reload/deep-link → same requested route
and query → resolving → ready page; no intermediate /learners navigation.

Internal resolution: GET learners → choose canonical; if missing household,
bootstrap once → GET once; if empty, create → ready. Uncertain create → GET →
resolve existing or safe error. Error → explicit retry → fresh GET.

Account menu → Đăng xuất → pending → signOut success → clear internal storage
→ /login (replace). Failure → existing app and selection + error toast.
A subsequent account cannot reuse another account’s persisted identity.


## Mutation feedback extension (Feature #16 / US-53)

Parent or learner performs an ordinary reversible action → the control keeps
its immediate pending/state update → success is announced in a shared toast
that survives in-app route navigation. A mutation failure gives safe toast
feedback; correctable field validation remains beside the field. Favorites,
settings and Learning Set assignment use this path.
For destructive progress reset, the user first reviews and confirms the
consequence; only after the API succeeds does the dialog close and a success
toast appear. Page-data fetch failure stays in its page ErrorState, and
correct/incorrect Study feedback stays with the active learning interaction.

## Async data state extension (Feature #15 / US-52)

On any data-backed page, retain the current app navigation while the page read
is pending and show a skeleton matching the page's content shape → when a
successful read returns no applicable records, explain the empty or
no-match condition and offer a real next action when available → when a
retryable read fails, show safe guidance and retry that read with the current
learner, route, query and filters intact. Keep authentication/permission
recovery and resource 404/not-found on their established paths. No data state
starts a study session, mutates progress, or changes scheduler behavior.

## Global Search extension (Feature #14 / US-51)

From any non-session AppShell route, the learner opens search using the desktop
trigger or Ctrl/Cmd+K, or the compact mobile header icon → enters a trimmed
query → one learner-scoped request returns bounded Vocabulary, Topic and
Learning Set groups → the learner moves with Arrow Up/Down and presses Enter
or clicks a result → the recent query is saved locally, the dialog closes and
React Router opens /vocabulary/:id, /topics/:id or /learning-sets/:id.
With an empty query, up to five recent searches are shown; selecting one runs
that query. Search is unavailable during /study and /study/exercises.
Escape closes the palette; the original trigger regains focus.

- Status: CURRENT FLOW BASELINE
- Version: v1
- Source baseline: `VocabFlow_User_Flow_v1.docx`
- Canonical format: Markdown
- Last synchronized: 2026-10-06

**VOCABFLOW**

## Simplified navigation extension (Feature #13 / US-50)

On desktop, the parent or learner moves among Home, Vocabulary, Study Setup,
Progress, Favorites and Settings from the six-item sidebar. At widths below
1024px, the same primary routes are exposed through a fixed five-item bottom
bar; Settings moves to the compact account menu. Study Setup is the shared
entry point at `/study/setup`; `/study` and `/study/exercises` remain selected
as the Study destination while a session or exercise is active. Auxiliary
routes remain discoverable without becoming primary navigation: Home's due
stat opens `/weak-words`, Vocabulary and Progress link to `/topics`, Home links
to `/learning-sets`, and the account menu plus Home learner switcher open
`/learners`. Auxiliary routes do not claim a primary active state.

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

## Progress detail extension (US-37 / US-38 / US-48)

Parent selects a learner → opens Progress → sees learned and Mastered current
state, review accuracy for the selected period, and the existing current
household-local streak → inspects seven or thirty household-local dates in the
unique-word activity and persisted-outcome accuracy charts → reviews
vocabulary-level coverage and up to five started Topics in the active learning
domain. Period selection is reflected in the URL. Days without review outcomes
remain gaps; empty history gets explanatory copy. A learner switch reloads
every learner-scoped read model. Reset leaves historical activity intact while
current Topic and level state follows sparse learner progress.

## Saved vocabulary extension (US-46)

Parent selects the active learner → saves or removes vocabulary from the
Catalog or Word Detail → opens `/saved` to search/filter that learner's saved
words → chooses “Học tất cả từ đã lưu” → Study Setup opens the explicit
`saved=1&content=all` collection → the server returns every enabled saved word
and classifies new, genuinely due, and voluntary not-due practice separately.
The ordinary New/Review/Mixed modes use the learner-scoped New/Due queue. New
remains selectable while Due exists if New vocabulary and daily New quota
remain; Review stays Due-only, and Mixed selects Due first before filling any
remaining slots with New. The daily New hard limit is unchanged; Daily Goals do
not gate queue availability.
Learner switching reloads the saved relationship; Study and Summary continue
actions retain the all-saved intent.

## Weak Words extension (US-49)

Parent selects an active learner → opens `/weak-words` → server authorizes that
learner and derives Weak/Learning/Stable from enabled vocabulary in active
assigned Learning Sets and persisted review outcomes → learner searches or
filters and chooses “Ôn các từ yếu ngay” → Study Setup opens with `weak=1` and
shows the server-resolved available Weak queue → learner selects session size
and starts. Truly due Weak words enter as DUE; Weak words with a later or
missing next review date enter as VOLUNTARY. Both go through the existing
canonical review write and scheduler. Session Summary “Học tiếp” retains
`weak=1` and resolves current candidates again; if none remain, Setup shows an
empty state. No vocabulary IDs, weakness state or session queue are persisted
in the browser or database.

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
New / review counts and composite goal Streak: current / longest
↓                                      ↓
completed khi cả hai goal đạt           active day theo review_date local
```

Daily goal và streak là hai chỉ báo độc lập. Goal từ mới đếm distinct
`vocabularyId` đã chuyển khỏi `NEW`; goal ôn tập đếm distinct vocabulary có
trạng thái trước đó không phải `NEW`. Cả hai lấy từ review đã persist trong
household-local date; reinforcement, retry và nhiều learning set không nhân
đôi. Remembered và Forgotten đều tính, review lỗi không tính. Streak active khi
ngày có ít nhất một review thành công; nếu hôm nay chưa học nhưng hôm qua active
thì current streak vẫn tiếp tục trong ngày hiện tại. Cả hai giá trị được đọc lại
từ server sau learner switch, reload, logout/login và reset progress.

Parent mở learner settings để xem/chỉnh Daily New Limit, mục tiêu từ mới và mục
tiêu ôn tập. Hai goal là target UI/XP; Daily New Limit vẫn là hard cap của
scheduler cho từ NEW và không giới hạn due reviews.

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
