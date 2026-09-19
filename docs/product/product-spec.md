# Family MVP Specification v1.0

- Status: CURRENT PRODUCT SOURCE OF TRUTH
- Version: v1.0
- Source baseline: `VocabFlow_Family_MVP_Product_Specification_v1.0.docx`
- Canonical format: Markdown
- Last synchronized: 2026-09-20

**VOCABFLOW**

**Family MVP Specification v1.0**

**Current product source of truth for the Family Learning MVP**

> **Product baseline đã chính thức chuyển từ Personal MVP sang Family MVP**
> Bản v1.0 supersedes VocabFlow Personal MVP Specification v0.2.1. Các learning rules của bản cũ chỉ còn hiệu lực khi được restate trong tài liệu này; các quyết định personal-only, IndexedDB canonical, no-auth và no-cloud đã bị thay thế.

| **Hạng mục** | **Quyết định đã khóa** |
| --- | --- |
| Primary account | Phụ huynh đăng ký/đăng nhập và quản lý household. |
| Learner model | Một household có nhiều learner profile; mỗi learner có progress độc lập. |
| Persistence | Cloud backend là canonical source of truth; PostgreSQL giữ progress lâu dài. |
| Core learning loop | Flashcard → nhớ/chưa nhớ → scheduler → review đúng từ đến hạn. |
| Dataset | Full 1.994 từ; MVP enabled set 200–300; vertical slice đầu 20–30 từ. |
| Device | Mobile-first webapp; desktop/tablet hỗ trợ đầy đủ. |
| Status | CURRENT PRODUCT SOURCE OF TRUTH. |

## Quan hệ với Personal MVP v0.2.1

Personal MVP v0.2.1 được giữ trong archive như historical baseline. Khi có xung đột, Family MVP v1.0 thắng.

# 1 · MỤC TIÊU, PERSONA & PHẠM VI

## 1. Mục tiêu sản phẩm

> **Cam kết của Family MVP**
> Giúp các thành viên trong một gia đình học từ vựng tiếng Anh theo vòng lặp spaced review đơn giản, trong khi phụ huynh có một tài khoản để tạo/chọn learner và theo dõi tiến trình cơ bản. Progress của mỗi learner phải tách biệt và tồn tại qua reload, đăng xuất và đăng nhập lại.

Family MVP vẫn là một hệ thống quản lý trạng thái ghi nhớ, không chỉ là trình xem flashcard. Definition of Done chỉ đạt khi một learner học, review được lưu lên backend, quay lại sau đó và nhận đúng Review Queue của chính learner đó.

## 2. Persona & vai trò

| **Vai trò** | **Nhu cầu chính** | **Quyền MVP** |
| --- | --- | --- |
| Parent | Thiết lập household, tạo learner, chọn learner, xem progress tối thiểu. | Đăng ký/đăng nhập; create/select learner; xem progress; logout. |
| Learner | Học nhanh trên mobile/tablet, ít thao tác, nhận đúng từ đến hạn. | Học flashcard trong learner context; không cần email/password riêng. |

- Age band chưa khóa hẹp ở v1.0; sản phẩm hướng tới learner trong gia đình có thể sử dụng webapp cơ bản, với phụ huynh hỗ trợ khi cần.

- Learner PIN/own login không thuộc Family MVP v1.0.

## 3. Scope Family MVP

| **Trong MVP** | **Ngoài MVP** |
| --- | --- |
| Parent authentication + default household | Co-parent invitation / household sharing nâng cao |
| Create/select nhiều learner profile | Learner email/password hoặc PIN security boundary |
| Per-learner cloud progress | Offline write queue / full PWA sync |
| Curated learning sets; default starter compatibility set; 200–300 enabled | User-created sets / marketplace |
| Flashcard + audio/image khi có | Nhiều mode Learn/Test/Game |
| Chưa nhớ / Đã nhớ + spaced scheduler | Leaderboard, achievement system, advanced gamification |
| Review Queue + session summary | AI tutor / generated content |
| Progress tối giản | Advanced analytics / reporting |
| Responsive mobile/tablet/desktop | Admin CMS / payment / social |

```text
Quy tắc phạm vi
Một feature chỉ thuộc MVP nếu bỏ nó sẽ làm hỏng một trong ba vòng lặp: parent → learner context, learner → review → persistence, hoặc quay lại → nhận đúng due queue.
```

# 2 · PIVOT TỪ PERSONAL → FAMILY

## 4. Decision inheritance matrix

| **Quyết định v0.2.1** | **Family v1.0** | **Trạng thái** |
| --- | --- | --- |
| Personal-only user | Parent account + multiple learner profiles | REPLACED |
| IndexedDB là persistence chính | Cloud PostgreSQL là canonical persistence; local cache chỉ phụ trợ | REPLACED |
| Không authentication | Parent authentication bắt buộc | REPLACED |
| Không cloud sync | Cloud persistence bắt buộc | REPLACED |
| Flashcard ẩn nghĩa đến khi flip | Giữ nguyên | INHERITED |
| Scheduler 1–3–7–14–30 | Giữ nguyên | INHERITED |
| Due trước New | Giữ nguyên | INHERITED |
| Reinforcement max 2 | Giữ nguyên | INHERITED |
| 20–30 word vertical slice | Giữ nguyên | INHERITED |
| Optional media không được làm crash card | Giữ nguyên | INHERITED |

## 5. Product model

```text
Parent account
↓
Default Household
↓
Learner A        Learner B        Learner C
↓
Mỗi learner có Review Queue + Progress độc lập
↓
Cloud persistence giữ canonical state
```

- Một learner không bao giờ nhìn/ghi progress của learner khác.

- Parent chọn learner trước khi vào learning context.

- Family MVP giả định một default household được bootstrap cho một owner account.

# 3 · CORE LEARNING LOOP & SESSION RULES

## 6. Luồng học hằng ngày

```text
Chọn learner
↓
Mở Learner Home
↓
Tạo Review Queue từ due + new
↓
Mặt trước: English word + audio nếu có
↓
Flip → IPA + nghĩa Việt + media nếu có
↓
Chọn Chưa nhớ / Đã nhớ
↓
Server xác nhận lưu canonical review
↓
Nếu cần: reinsert reinforcement card
↓
Hết queue hoặc learner chủ động thoát → Summary
```

## 7. Session rule đã khóa

| **Tình huống** | **Quy tắc** |
| --- | --- |
| Due ≥ 20 | Lấy tối đa 20 due; không thêm new. |
| 0 < Due < 20 | Lấy toàn bộ due; thêm tối đa 10 new. |
| Due = 0 | Lấy tối đa 10 new. |
| Daily New allowance | Mỗi learner mặc định được tối đa 10 vocabulary virtual-New materializations mỗi household-local day; setting 0..100 thay đổi được theo learner. |
| Unique-word ceiling | Policy ceiling là 30 unique words; với selection rule hiện tại thực tế tối đa 29, không pad thêm. |
| Ưu tiên | Due luôn đứng trước new. |
| Reinforcement | Một từ Chưa nhớ có thể reinsert tối đa 2 lần trong cùng session. |
| Presentation count | Không hard-cap toàn session ở v1.0; user có thể thoát bất kỳ lúc nào. Reinforcement cap per-word ngăn loop vô hạn. |
| Kết thúc | Hết queue hoặc user thoát; không ép hoàn thành quota. |

## 8. Flashcard interaction

- Mặt trước không hiện nghĩa Việt.

- Tap/click để flip; desktop hỗ trợ keyboard theo Feature UI Spec.

- Mặt sau ưu tiên IPA + nghĩa Việt; image/definition/example chỉ hiện khi có dữ liệu.

- Audio phát lại không thay đổi progress.

- Chưa nhớ / Đã nhớ chỉ xuất hiện sau khi flip.

- Chỉ server-confirmed scheduled review mới được coi là đã lưu progress.

## 8.1 Controlled exercise mode (US-31 through US-34)

Study keeps the accepted Flashcard flow at `/study`. Learner Home also exposes
an explicit `/study/exercises` route for four deterministic interaction types:

- `MULTIPLE_CHOICE_MEANING`: English prompt with one correct Vietnamese
  meaning and three deterministic safe distractors.
- `LISTENING_CHOICE`: usable pronunciation audio with one correct English word
  and three deterministic safe distractors. The target is not repeated in the
  prompt or answer-bearing Flashcard back content before submission.
- `IMAGE_TO_WORD`: a usable image with one correct English word and three
  deterministic safe distractors. Missing images are ineligible and the image
  alt text is neutral before submission.
- `TYPE_WORD`: a Vietnamese-first safe cue followed by image, audio or a
  non-answer-revealing definition/example. The learner must type the exact
  spelling after NFKC, outer-trim and case normalization; meaningful internal
  whitespace is preserved.

Exercise generation happens after queue admission and never changes enabled,
learning-set, scheduler or daily-New eligibility. Missing/ambiguous distractors
fall back to Flashcard. Broken audio, image or optional typing cues fall back
without creating a review, and SpeechSynthesis is not used.

Correct and incorrect answers map to the existing `REMEMBERED` and `FORGOTTEN`
actions through the canonical review API. One answer locks the exercise; the
card advances only after the server confirms save, preserving retry,
reinforcement, learner isolation and session-summary semantics. Exercises do
not introduce a second progress or scheduler model.

# 4 · LEARNING ENGINE

## 9. Trạng thái và lịch ôn

| **Correct liên tiếp** | **Interval tiếp theo** | **Status** |
| --- | --- | --- |
| 0 / Chưa nhớ | 1 ngày | LEARNING |
| 1 | 1 ngày | LEARNING |
| 2 | 3 ngày | LEARNING |
| 3 | 7 ngày | LEARNING |
| 4 | 14 ngày | MASTERED |
| 5+ | 30 ngày | MASTERED |

NEW là virtual state trước lần scheduled evaluation đầu tiên. Absence of learner progress row tương đương NEW. MASTERED không phải trạng thái vĩnh viễn.

## 10. Hai loại evaluation

| **Loại** | **Khi nào** | **Được thay đổi gì** |
| --- | --- | --- |
| Scheduled evaluation | Lần đánh giá persistent của một vocabulary item khi item xuất hiện từ due/new queue. | Cập nhật status, consecutiveCorrect, interval, nextReviewDate và counters. |
| Reinforcement evaluation | Item được đưa lại trong cùng session sau Chưa nhớ. | Session-only feedback; không tăng interval/consecutiveCorrect và không tiến scheduler dài hạn. |

## 11. State transition

- NEW + Chưa nhớ → LEARNING; consecutiveCorrect = 0; interval = 1; due ngày mai.

- NEW/LEARNING + Đã nhớ → tăng consecutiveCorrect một lần và áp interval tương ứng.

- MASTERED + Chưa nhớ → LEARNING; consecutiveCorrect = 0; interval = 1; due ngày mai.

- MASTERED + Đã nhớ → giữ MASTERED; interval tiến tối đa 30 ngày.

- Mọi Chưa nhớ ở scheduled evaluation đều reset consecutiveCorrect về 0.

# 5 · SESSION LIFECYCLE & EDGE CASES

## 12. Edge cases bắt buộc

| **Case** | **Hành vi đã khóa** |
| --- | --- |
| Chưa nhớ nhiều lần | Reinsert tối đa 2 lần/session; sau đó không reinsert thêm. |
| Đã nhớ ở reinforcement | Không đổi long-term scheduler; chỉ session feedback. |
| Chưa nhớ ở reinforcement | Giữ lịch đã reset từ scheduled evaluation; không tạo interval mới. |
| Quá hạn nhiều ngày | Vẫn DUE; Đã nhớ tiến từ interval hiện tại, không lateness bonus. |
| Không due nhưng còn new | Tối đa 10 new; không tự tăng quota. |
| Missing media | Ẩn/fallback; card không crash. |
| Learner switch | Không đổi learner trong cùng active study context; phải thoát/kết thúc session trước. |

## 13. Reload / Back / Close tab

| **Tình huống** | **Product behavior** |
| --- | --- |
| Reload / close tab | Current session không persist. Review đã được server xác nhận vẫn giữ; card chưa lưu bị bỏ. |
| Quay lại sau reload | Generate queue mới từ canonical progress của learner. |
| Back khi đang học | Feature UI phải có leave-confirmation khi việc rời trang có thể làm mất card chưa submit/pending. |
| Pending/failed review | Không được tự chuyển thẻ hoặc giả vờ đã lưu. |
| Force close khi review chưa lưu | Không giả định success; lần vào sau dựa hoàn toàn vào canonical backend. |

## 14. 409 stale revision

> **Không được nuốt quyết định của learner**
> Khi server trả stale revision, client reload canonical progress. Answer vừa gửi được coi là chưa persist. Không tự chuyển sang thẻ kế tiếp. Nếu vocabulary item vẫn còn relevant trong flow hiện tại, learner phải được yêu cầu đánh giá lại; UI chỉ hiển thị thông báo nhẹ, không biến stale conflict thành success.

# 6 · CONTENT, PERSISTENCE & PROGRESS SEMANTICS

## 15. Content tiers

| **Tầng** | **Quy mô** | **Mục đích** |
| --- | --- | --- |
| Full dataset | 1.994 từ | Nguồn nội dung đầy đủ; không cắt bỏ dữ liệu gốc. |
| MVP enabled set | 200–300 từ | Dùng sau khi core loop ổn định. |
| First vertical slice | 20–30 từ | Build/test end-to-end trước khi bật enabled set. |

### 15.1 Vocabulary taxonomy extension (US-26 / US-27)

Vocabulary may carry an optional canonical grade level (`GRADE_1`–`GRADE_5`
or `GENERAL`) and may belong to multiple canonical topics. Parents can filter
the read-only vocabulary catalog by level and browse enabled vocabulary by
topic. Missing source classification remains NULL/unmapped; the product must
not infer a grade or silently enable imported rows. This extension does not
change study queue, scheduler or learner-progress semantics.

### 15.2 Learning sets and learner assignment (US-28 / US-29)

The catalog exposes deterministic, project-curated learning sets with stable
ordering. A vocabulary item may belong to more than one set. Parents can view
set details and assign or unassign enabled sets for a learner in their own
household. The review queue is the enabled vocabulary union of active assigned
sets, with the existing due/new rules applied afterward; duplicate membership
does not duplicate a card. Unassigning a set never deletes learner progress or
review history, and reassignment reuses it.

The migration provides a compatibility `VocabFlow Starter` set containing all
30 enabled starter rows, plus curated Grade 1 Starter, Family Basics, School
Basics and Everyday Words sets. Imported rows remain disabled and are not
automatically classified or enabled.

### 15.3 Daily new word limit (US-30)

Each learner has a `dailyNewWordLimit`, default `10`, validated from `0` to
`100`. It limits only vocabulary that transitions from the current virtual NEW
state into a current `learner_progress` lifecycle on the household-local date.
Due vocabulary is always available and remains ahead of New; the existing
session selection cap is independent of this daily allowance.

The queue reads the server-side remaining allowance across sessions. A
materialized vocabulary, reinforcement, idempotent retry, duplicate set
membership and an unassign/reassign cycle do not consume another allowance.
Reset preserves `review_events` but deletes current progress, so the next
current lifecycle is virtual NEW again. Progress summary New remains the
global count of eligible vocabulary without current progress; it is not
reduced to today's allowance.

### 15.4 Daily learning goal and streak (US-35 / US-36)

Each learner has a separate `dailyLearningGoal`, default `10`, validated from
`1` to `100`. It is motivational read-only progress: it does not constrain
queue admission and is not the Daily New Limit.

Daily goal progress counts distinct vocabulary IDs from successful persisted
review events whose server-owned `review_date` is the current household-local
date. Reinforcement, repeated review and retry of one vocabulary count once;
both Remembered and Forgotten count as learning activity, while failed or
unsaved review requests do not count. Completion is derived when the unique
count reaches the configured goal and may exceed it.

An active learning day is any local date with at least one successful persisted
review event. Current streak counts consecutive active dates ending today, or
continues through yesterday when today is not active yet. Longest streak is the
maximum consecutive active-date run in review history. Streaks are learner
scoped, derived rather than mutable counters, and survive reload, logout/login,
reset progress and learning-set unassignment because review history remains
canonical.

## 16. Data quality gate

| **Kiểm tra** | **Kết quả** |
| --- | --- |
| Thiếu id / word / nghĩa Việt | FAIL: không đưa vào enabled set. |
| Duplicate id | FAIL. |
| Duplicate normalized word | WARN: review thủ công, không auto-merge. |
| Thiếu IPA | ACCEPT: ẩn IPA. |
| Thiếu audio | ACCEPT: fallback theo Feature UI Spec; không crash. |
| Thiếu image | ACCEPT: ẩn vùng ảnh. |
| Thiếu definition/example | ACCEPT: ẩn section. |
| Media path hỏng | ACCEPT có fallback; card không crash. |

## 17. Canonical persistence

- Backend database là source of truth cho vocabulary runtime và learner progress.

- IndexedDB/Dexie nếu dùng chỉ là cache/snapshot; không phải canonical progress.

- Review success chỉ được công nhận sau khi server xác nhận.

- Logout/reload/device revisit không được làm mất progress đã persist.

## 18. Progress semantics tối thiểu

| **Metric** | **Định nghĩa v1.0** |
| --- | --- |
| New | Enabled vocabulary chưa có learner_progress row cho learner hiện tại. |
| Learning | Unique vocabulary có status = LEARNING. |
| Mastered | Unique vocabulary có status = MASTERED. |
| Due | Unique progress item có nextReviewDate <= today và vocabulary còn enabled. |
| Learned | Unique vocabulary đã materialize progress row; không phải số review event. |

# 7 · FAMILY MVP FEATURE SCOPE

## 19. Feature tối thiểu

| **Feature** | **Hành vi tối thiểu** | **MVP** |
| --- | --- | --- |
| Authentication | Parent sign up / login / logout. | YES |
| Household bootstrap | Tạo default household idempotent cho owner. | YES |
| Learner selector | Hiển thị learner thuộc household và chọn active learner. | YES |
| Create learner | Tạo learner profile tối thiểu với display name. | YES |
| Edit learner | Rename/avatar polish. | DEFERRED |
| Disable/delete learner | Soft-disable/delete UX. | OUT v1.0 |
| Learner Home | Due/new availability + CTA bắt đầu học + progress summary. | YES |
| Study | Flashcard, flip, audio/media fallback, remember/forget. | YES |
| Exercise mode | Explicit meaning/listening route over the canonical queue and review API. | YES |
| Session Summary | Reviewed/remembered/forgotten/reinforcement summary. | YES |
| Progress | New/Learning/Mastered/Due theo active learner. | YES |
| Vocabulary list / learning sets | Danh sách enabled vocabulary + trạng thái learner tối thiểu; lọc cấp độ, browse theo chủ đề, xem set và gán set cho learner. | YES |
| Daily New settings | Parent xem/chỉnh giới hạn từ mới theo learner; Due exemption và trạng thái lưu được hiển thị rõ. | YES |
| Daily learning goal | Parent cấu hình goal 1–100; learner xem unique reviewed/goal và trạng thái hoàn thành theo local day. | YES |
| Learning streak | Learner xem current/longest streak theo household-local active days. | YES |
| Reset progress | Parent-confirmed reset per learner; có thể làm sau vertical slice nhưng vẫn thuộc MVP. | YES |

## 20. Family vertical slice

```text
Vertical slice đầu tiên
1 parent → 1 default household → 1 learner → 20–30 vocabulary → 1 study session → review lưu lên cloud → logout/reload → login lại → progress và due queue vẫn đúng.
```

- Không cần dashboard hoàn chỉnh, multi-parent, AI, gamification hoặc offline sync để pass vertical slice.

- Sau khi vertical slice PASS mới bật 200–300 enabled words và mở rộng UI polish.

# 8 · ACCEPTANCE, VALIDATION & FREEZE

## 21. Product acceptance criteria

| **ID** | **Yêu cầu** |
| --- | --- |
| **PR-01** | Parent có thể sign up/login và nhận đúng default household. |
| **PR-02** | Parent tạo được ít nhất một learner và chọn learner context. |
| **PR-03** | Hai learner không chia sẻ progress. |
| **PR-04** | 20–30 word vertical slice chạy end-to-end trước khi bật 200–300 từ. |
| **PR-05** | Mặt trước flashcard không hiện nghĩa Việt trước khi flip. |
| **PR-06** | Scheduled evaluation cập nhật đúng state và nextReviewDate. |
| **PR-07** | Reinforcement không tiến long-term scheduler. |
| **PR-08** | Một từ Chưa nhớ reinsert tối đa 2 lần/session. |
| **PR-09** | Due được ưu tiên; due ≥20 thì không thêm new. |
| **PR-10** | Due=0 chỉ lấy tối đa 10 new. |
| **PR-10A** | Daily New admission không vượt allowance còn lại của learner theo household-local day; Due không bị chặn. |
| **PR-11** | MASTERED + Chưa nhớ → LEARNING / 1 day. |
| **PR-12** | nextReviewDate <= today xuất hiện trong due queue của đúng learner. |
| **PR-13** | Review chỉ chuyển thẻ sau server-confirmed save. |
| **PR-14** | Retry cùng reviewId không tạo duplicate canonical transition. |
| **PR-15** | Reload/logout/login lại không làm mất progress đã persist. |
| **PR-16** | Missing optional media không làm card crash. |
| **PR-17** | Mobile/tablet/desktop không tràn ngang và dùng được bằng touch. |
| **PR-18** | Cross-household learner access bị chặn. |

## 22. Validation trong 14 ngày

| **Tiêu chí** | **Ngưỡng Family MVP pilot** |
| --- | --- |
| Pilot | Ít nhất 1 parent + 1 learner sử dụng thật. |
| Tần suất | Learner dùng app ít nhất 10/14 ngày. |
| Session | Ít nhất 8 learning/review sessions. |
| Persistence | Không mất progress sau reload/logout/login lại. |
| Scheduler | Review Queue trả đúng từ đến hạn ở các lần quay lại. |
| State lifecycle | Có ít nhất 1 từ NEW → LEARNING → MASTERED. |
| Review thực tế | Có review ở tối thiểu các mốc Day 1, Day 3 và Day 7. |
| Recall check | Sau 7 ngày, recall mục tiêu >=70% để tiếp tục thử nghiệm. |

*70% là validation threshold cho learning loop, không phải KPI thương mại hoặc cam kết hiệu quả học tập.*

## 23. Product Spec freeze

```text
Sau v1.0: freeze Family MVP Product Spec
Từ đây không quay lại Personal MVP làm source of truth. Tài liệu tiếp theo: Family MVP Feature UI Spec → Implementation Backlog/User Stories → Code. Chỉ sửa Product Spec khi có product contradiction, validated requirement change hoặc implementation blocker thực tế.
```

- Personal MVP v0.2.1: ARCHIVED / SUPERSEDED.

- Family MVP v1.0: CURRENT PRODUCT SOURCE OF TRUTH.

- Technical Architecture v1.0.7: technical source of truth, including the US-25
  canonical DB/source identity reconciliation, US-26/US-27 taxonomy and
  US-28/US-29 learning-set assignment model.

- Global Design System v1.0.2: global UI source of truth.

- User Flow v1: flow baseline.
