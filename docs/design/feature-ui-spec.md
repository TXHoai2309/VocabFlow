# Family MVP Feature UI Specification v1.0.1

- Status: CURRENT FEATURE UI SOURCE OF TRUTH
- Version: v1.0.1
- Source baseline: `VocabFlow_Family_MVP_Feature_UI_Specification_v1.0.1.docx`
- Canonical format: Markdown
- Last synchronized: 2026-09-08

**VOCABFLOW**

**Family MVP Feature UI Specification v1.0.1**

**Screen behavior, states and responsive contracts for the Family MVP**

> **Vai trò của tài liệu**
> Tài liệu này cụ thể hóa từng feature/màn hình dựa trên Family MVP Product Specification v1.0, User Flow v1 và Global Design System v1.0.2. Nó không định nghĩa lại database/API internals hoặc design tokens.

| **Baseline** | **Vai trò** |
| --- | --- |
| Family MVP Product Specification v1.0 | Product semantics và phạm vi MVP. |
| Technical Architecture v1.0.3 | Auth, API, persistence, concurrency và backend invariants. |
| Global Design System v1.0.2 | Token, layout primitives, responsive, component và accessibility rules. |
| User Flow v1 | Đường đi tổng thể của parent/learner. |
| Feature UI Spec v1.0.1 | Screen composition, interaction, states, copy và responsive behavior. |

## Trạng thái

**APPROVED FOR UI IMPLEMENTATION — baseline đã khóa cho Family MVP UI implementation.**

# 1 · INFORMATION ARCHITECTURE & APP SHELL

## 1.1 Primary destinations

| **Destination** | **Mục đích** | **Learner context** |
| --- | --- | --- |
| Home | Tóm tắt hôm nay + CTA bắt đầu học. | Bắt buộc |
| Từ vựng | Xem danh sách enabled vocabulary và trạng thái của learner. | Bắt buộc |
| Tiến độ | Xem New / Learning / Mastered / Due / Learned. | Bắt buộc |
| Study | Focused task, truy cập từ CTA; không phải destination cố định. | Bắt buộc khi học |
| Learner selector | Chọn/tạo learner; mở từ login flow hoặc profile switcher. | Ngoài learner context |

## 1.2 Navigation contract

- Mobile: bottom navigation mặc định 3 item — Home / Từ vựng / Tiến độ. Study ẩn bottom navigation để giảm distraction.

- Desktop: sidebar dùng cùng 3 destinations; active learner hiển thị ở vùng đầu sidebar/header.

- Đổi learner nằm trong learner/profile switcher, không trở thành bottom-nav item thứ tư.

- Authentication screens không hiển thị app navigation.

```text
Mobile app shell
┌────────────────────────────┐
│ App bar: Learner + menu     │
├────────────────────────────┤
│                            │
│ Main feature content       │
│                            │
├────────────────────────────┤
│ Home   Từ vựng   Tiến độ   │
└────────────────────────────┘
```

```text
Desktop app shell
┌──────────────┬─────────────────────────────────┐
│ VocabFlow    │ Header / learner context        │
│ Home         ├─────────────────────────────────┤
│ Từ vựng     │ Main feature content            │
│ Tiến độ     │                                 │
│ Learner ▼    │                                 │
└──────────────┴─────────────────────────────────┘
```

> **Global rule**
> Mọi màn hình dùng tokens/layout/components từ Global Design System v1.0.2; Feature UI Spec không tạo màu, spacing hoặc component visual language mới.

# 2 · AUTHENTICATION

## 2.1 MVP auth scope

| **Feature** | v1.0.1 decision |
| --- | --- |
| Register | Tên phụ huynh + email + password, parent account. `Tên phụ huynh` là display/profile identity được lưu bởi Better Auth. |
| Login | Email + password. |
| Logout | Có trong parent/profile menu. |
| Social login | OUT v1.0. |
| Forgot password | DEFERRED trừ khi deployment requirement bắt buộc. |
| Email verification | Không phải UI flow bắt buộc trong v1.0; chỉ thêm nếu auth configuration yêu cầu. |

## 2.2 Layout & behavior

> **Auth — mobile/desktop cùng Focused Task pattern**
> [ VocabFlow ]
> Đăng nhập / Tạo tài khoản
> [ Tên phụ huynh                 ]
> [ Email                         ]
> [ Mật khẩu                      ]
> [        Primary action         ]
> Secondary link: đổi Login/Register

| **State** | **UI behavior** | **Recovery** |
| --- | --- | --- |
| Submitting | Disable submit + progress indicator; không gửi duplicate. | Chờ response. |
| Invalid credentials | Inline/global auth error; không nói quá chi tiết nguyên nhân security-sensitive. | Sửa email/password và thử lại. |
| Email already exists | Register hiển thị account-exists message. | Chuyển sang Login. |
| Network error | Không clear form; giữ email đã nhập và password theo browser policy. | Retry. |
| Auth success | Đi tiếp theo learner resolution rule. | — |
| Required fields | Tên phụ huynh, email và password required; validation message hiển thị gần field, không chỉ dựa vào placeholder. | Điền trường còn thiếu rồi submit lại. |
| Password visibility | Password field có show/hide control với accessible label; không làm mất giá trị đã nhập. | Toggle visibility. |
| Keyboard submit | Enter submit form khi field hợp lệ; trong lúc submitting không gửi duplicate request. | Chờ response hoặc sửa validation. |
| Autocomplete | Login dùng autocomplete=email + current-password; Register dùng name + email + new-password. | Browser/password manager hỗ trợ điền an toàn. |

Register thu thập tên hiển thị của phụ huynh vì Better Auth 1.7.3 yêu cầu
`name` cho `signUp.email`. Đây là danh tính profile của parent, không phải tên
learner; tên household vẫn do server quản lý theo bootstrap contract.

## 2.3 Post-login learner resolution

```text
Login success
↓
0 learner → Create Learner empty state
↓
1 learner → auto-select → Learner Home
↓
2+ learner → Learner Selector
```

> **Không tạo account cho learner**
> Learner profile không có email/password riêng trong Family MVP. Parent authentication là security boundary.

# 3 · LEARNER SELECTOR & LEARNER HOME

## 3.1 Learner Selector

| **Case** | **UI contract** |
| --- | --- |
| 0 learner | Empty state + primary CTA “Tạo hồ sơ học”. Không hiển thị list rỗng vô nghĩa. |
| 1 learner | Sau login auto-select; selector vẫn mở được từ profile switcher. |
| 2+ learner | Danh sách/card learner; tap chọn → Home của learner. |
| Create learner | Chỉ yêu cầu display name; avatar optional nếu UI đã có asset preset. |
| Create failed | Giữ input, hiển thị error + Retry; không tạo optimistic learner giả. |
| Learner list GET failed | Full-area error + Retry; không tự chọn learner không xác minh được. |

> **Learner Selector — mobile**
> Chọn người học
> [ An                         › ]
> [ Bình                       › ]
> [ Chi                        › ]
> [ + Tạo hồ sơ học ]

## 3.2 Learner Home

| Region | Nội dung |
| --- | --- |
| Context header | Tên learner + switcher; không hiển thị parent-management nặng. |
| Today status | Due count và New availability theo server/canonical state. |
| Primary CTA | “Bắt đầu học” khi có due/new; “Hôm nay đã xong” khi không có item. |
| Progress summary | Learned / Learning / Mastered / Due theo Progress semantics §6.2. |
| Secondary links | Từ vựng, Tiến độ. |

| **Home state** | **Behavior** |
| --- | --- |
| Có due | CTA ưu tiên bắt đầu queue với due trước. |
| Không due, có new | CTA vẫn “Bắt đầu học”; helper nói sẽ học từ mới. |
| Không due/new | Completed/empty state; không tạo session rỗng. |
| Summary API fail | Không hiển thị số giả; error vùng summary + Retry. |

> **Learner switching**
> Nếu đang ở Study, learner switcher không đổi context trực tiếp. User phải rời/kết thúc session trước, theo §5.4.

# 4 · STUDY / FLASHCARD

## 4.1 Layout pattern

> **Focused Task**
> Study dùng Focused Task pattern. Mobile ưu tiên flashcard + action zone; desktop giữ card ở readable width, không kéo full màn hình.

```text
Study — Front
← Thoát                 4 / 18
[ progress ━━━━━━━━━             ]
┌────────────────────────────┐
│ POWER              [Audio] │
│                            │
│      Chạm để lật thẻ       │
└────────────────────────────┘
```

```text
Study — Back
← Thoát                 4 / 18
[ progress ━━━━━━━━━             ]
┌────────────────────────────┐
│ POWER              [Audio] │
│ /ˈpaʊər/                    │
│ sức mạnh; quyền lực         │
│ [media/example nếu có]     │
└────────────────────────────┘
[ Chưa nhớ ]     [ Đã nhớ ]
```

## 4.2 Card content rules

| **Element** | **Front** | **Back** |
| --- | --- | --- |
| English word | YES — visual focus. | YES — header/context. |
| Audio | Manual play button; không autoplay mặc định. | Có thể phát lại. |
| IPA | NO. | Hiện nếu có. |
| Vietnamese meaning | NO. | Bắt buộc. |
| Image | NO. | Hiện nếu có; hỏng thì ẩn/fallback. |
| Example / definition | NO. | Hiện dưới core meaning nếu có; không chiếm ưu tiên hơn nghĩa Việt. |

## 4.3 Recall actions

- Buttons chỉ xuất hiện sau khi flip.

- Hai lựa chọn là Chưa nhớ / Đã nhớ; không có Skip trong scheduled evaluation.

- Khi submit: khóa cả hai nút, hiển thị save-pending state; chỉ chuyển card sau server success.

> **DS-EX-001 — Recall action group**
> Study có hai lựa chọn đánh giá loại trừ lẫn nhau và không nên bias learner về một câu trả lời. Cho phép hai action có kích thước/hierarchy tương đương trong scope Study, thay cho rule “one primary action”. Không áp dụng cho màn hình khác.

## 4.4 Session counter semantics

| **UI metric** | **Định nghĩa** |
| --- | --- |
| x / N | N = số base queue unique items lúc session bắt đầu; x = số scheduled evaluations đã server-confirmed. |
| Reinforcement | Không tăng N và không tăng x; card reinforcement có label “Ôn lại”. |
| Unique ceiling | Policy ceiling 30; selection rule hiện tại có thể tạo tối đa 29 unique items, không pad thêm. |

# 5 · STUDY SAVE, ERROR & SESSION LIFECYCLE

## 5.1 Save state machine

```text
Learner chọn Remembered/Forgotten
↓
SAVE_PENDING
↓
201/200 success → mark scheduled item complete → next card
↓
Network/5xx → SAVE_FAILED → giữ nguyên card → Retry cùng reviewId
```

| **State** | **UI behavior** |
| --- | --- |
| SAVE_PENDING | Disable recall buttons; không flip/ngắt context; spinner/text “Đang lưu…” nhẹ. |
| SAVE_FAILED | Giữ answer context và card; banner “Chưa lưu tiến trình”; CTA “Thử lại”. |
| Retry | Reuse cùng reviewId và cùng payload; không sinh reviewId mới cho cùng action. |
| IDEMPOTENCY_CONFLICT | Dừng action; error kỹ thuật nhẹ + reload canonical state; không auto-retry. |
| 401 / session expired | Dừng write; đưa về Login với return context; không đánh dấu card success. |
| 403 | Hiển thị access error và quay về learner resolution; không leak household khác. |

## 5.2 409 STALE_REVISION

| **Bước** | **Behavior** |
| --- | --- |
| **1** | Answer vừa gửi được coi là chưa persist; không tăng session counter. |
| **2** | Fetch canonical progress/review queue của active learner. |
| **3a** | Nếu current vocabulary vẫn relevant trong canonical queue: giữ/đưa lại card và yêu cầu learner chọn lại. |
| **3b** | Nếu item không còn relevant: bỏ item khỏi current queue, hiển thị notice “Tiến trình đã được cập nhật”, đi item canonical kế tiếp. |
| **4** | Không biến stale conflict thành success im lặng. |

## 5.3 Reload / Back / Close tab

| **Action** | **Behavior** |
| --- | --- |
| Reload | Session không resume. Server-confirmed reviews giữ nguyên; mở lại tạo queue mới từ canonical progress. |
| Close tab/browser | Giống reload; card chưa server-confirmed không được xem là saved. |
| Back / Thoát | Nếu không có pending/failed review: confirmation ngắn rồi về Home. Nếu có pending/failed review: cảnh báo rõ có thể mất câu trả lời chưa lưu. |
| After return | Không phục hồi vị trí session cũ vì study_sessions deferred. |

## 5.4 Learner switch while studying

> **Không switch trực tiếp**
> Profile switcher trong Study mở confirmation. Sau khi user xác nhận rời session, chuyển về Learner Selector; queue cũ bị bỏ, progress đã server-confirmed vẫn giữ.

## 5.5 Reinforcement UI

- Một item Forgotten có thể reinsert tối đa 2 lần; reinforcement card hiển thị label “Ôn lại”, không gọi POST /api/reviews, không đổi long-term scheduler và không làm session counter x/N tăng.

# 6 · SESSION SUMMARY & PROGRESS

## 6.1 Session Summary

| **Metric** | UI presentation definition |
| --- | --- |
| Đã review | Số scheduled reviews server-confirmed trong session. |
| Đã nhớ | Số scheduled review result = REMEMBERED. |
| Chưa nhớ | Số scheduled review result = FORGOTTEN. |
| Lượt ôn lại | Số reinforcement evaluations session-local. |

> **Session Summary**
> Hoàn thành phiên học
> Đã review      12
> Đã nhớ          9
> Chưa nhớ        3
> Lượt ôn lại     4
> [ Về trang chủ ]

> Metric ownership
> Các số liệu §6.1 (Đã review / Đã nhớ / Chưa nhớ / Lượt ôn lại) là UI presentation metrics derived from current session state; không phải long-term product progress metrics. New / Learning / Mastered / Due / Learned vẫn theo Family MVP Product Specification v1.0.
> 
> Persistence boundary
> study_sessions chưa tồn tại trong Architecture v1.0.3. Summary là ephemeral UI state; reload trang Summary có thể đưa user về Learner Home thay vì reconstruct session history.

## 6.2 Progress semantics

| **Label UI** | **Canonical definition** |
| --- | --- |
| New | Enabled vocabulary chưa có learner_progress row cho active learner. |
| Learning | Unique vocabulary có status = LEARNING. |
| Mastered | Unique vocabulary có status = MASTERED. |
| Due | Unique progress item có nextReviewDate <= today và vocabulary enabled. |
| Learned | Unique vocabulary đã materialize learner_progress row; không phải số review events. |

## 6.3 Progress screen

| **Region** | **Content** |
| --- | --- |
| Header | Tên learner + last refresh/help text nếu cần. |
| Summary cards | Learned / Learning / Mastered / Due. |
| Primary CTA | Học ngay nếu Due > 0 hoặc còn New. |
| Empty state | Chưa học từ nào → CTA bắt đầu học. |
| Error | Không hiển thị cached number như canonical nếu fetch fail; show stale label nếu dùng cache read-only. |

# 7 · VOCABULARY LIST & PARENT ACTIONS

## 7.1 Vocabulary list

| **Capability** | **v1.0 behavior** |
| --- | --- |
| Browse | List enabled vocabulary theo stable order. |
| Search | Search theo English word; client/server implementation tùy backlog. |
| Status | Chip New / Learning / Mastered; Due là secondary indicator nếu applicable. |
| Open item | Optional simple detail/read-only; không tạo edit flow. |
| Favorite / custom sets | OUT v1.0. |
| Content editing | OUT v1.0. |

| **State** | **Behavior** |
| --- | --- |
| Loading | Skeleton/list loading. |
| No enabled vocabulary | Content empty/error state; Study CTA disabled. |
| Search no result | “Không tìm thấy từ phù hợp”; clear-search action. |
| Optional media missing | Không ảnh hưởng row/list. |

## 7.2 Parent actions in MVP

| **Action** | **Scope** | **UI location** |
| --- | --- | --- |
| Create learner | YES | Learner Selector. |
| Select/switch learner | YES | Learner Selector / profile switcher. |
| View learner progress | YES | Progress screen. |
| Reset learner progress | P1 / CONDITIONAL — thuộc Family MVP nhưng không thuộc first vertical slice. | Chỉ enable sau khi có reset API contract + learner authorization contract + confirmation behavior được test. |
| Edit learner name/avatar | DEFERRED | Không expose control trong v1.0 baseline. |
| Disable/delete learner | OUT v1.0 | Không expose control. |

## 7.3 Reset progress

> Backend dependency / feature flag
> Technical Architecture v1.0.3 chưa liệt kê reset endpoint trong API Surface v1. Reset UI phải ẩn/disabled trong first vertical slice. Chỉ bật sau khi backlog bổ sung API contract, authorization contract và test destructive confirmation; Feature UI Spec không tự giả định endpoint.

| **Step** | **UI behavior** |
| --- | --- |
| **Open** | Từ parent/profile menu của active learner. |
| **Confirm** | Dialog: “Xóa toàn bộ tiến trình của [Learner]?” + giải thích content không bị xóa. |
| **Submit** | Destructive action disabled while saving. |
| **Success** | Tất cả vocabulary trở lại virtual New; về Learner Home và refresh canonical summary. |
| **Failure** | Giữ dialog/error; không giả vờ reset. |
| Precondition | Chỉ áp dụng sau first vertical slice và khi reset API + authorization contract đã PASS. |

# 8 · RESPONSIVE, ACCESSIBILITY & COMPONENT MAPPING

## 8.1 Feature → Global layout pattern

| **Feature** | **Global pattern** | **Mobile behavior** | **Desktop behavior** |
| --- | --- | --- | --- |
| Auth | Focused task | Single column | Centered narrow panel |
| Learner Selector | Single column / cards | Stacked list/cards | 2–3 column card grid if useful |
| Learner Home | Dashboard grid | Cards stack by priority | 2-column summary layout allowed |
| Study | Focused task | Card full-width + sticky recall zone | Centered readable card; optional side whitespace only |
| Summary | Focused task | Stacked metrics | Centered panel |
| Progress | Dashboard grid | Stacked summary cards | Grid allowed |
| Vocabulary | Single column/list | List + search | Wider list; no mandatory split view |

## 8.2 Mobile-specific rules

- Base viewport <640px: 16px gutter; no horizontal overflow.

- Study recall action zone có thể sticky phía dưới nhưng không che card content hoặc browser safe area.

- Bottom navigation 3 items, 44×44px minimum targets, icon + visible label.

- Long back-side flashcard content scrolls page naturally; không nhốt text trong card có fixed height.

- Dialogs trên mobile có thể dùng sheet/full-width modal theo Global Design System.

## 8.3 Accessibility specifics

| **Area** | **Requirement** |
| --- | --- |
| Flashcard | Card flip reachable by keyboard; flip control/region có semantics rõ. |
| Audio | Icon-only button có accessible name; no autoplay dependency. |
| Recall actions | Visible labels, not color-only; keyboard reachable. |
| Focus | Sau flip, focus không nhảy bất ngờ; sau save success focus theo card mới hợp lý. |
| Dialogs | Focus trap, Esc close khi safe, return focus to trigger, lock background interaction. |
| Errors | Announce important save/auth errors with accessible live region where appropriate. |
| Motion | Flip respects prefers-reduced-motion; fallback to instant/simple transition. |

## 8.4 Component ownership

| **Layer** | **Components** |
| --- | --- |
| Global primitives | Button, IconButton, Card, Badge/Chip, Input, Dialog/Sheet, Toast, ProgressBar. |
| Global composites | SearchField, EmptyState, ErrorState, LoadingState, Avatar/ProfileMenu. |
| Feature-owned | Flashcard, RecallActions, LearnerCard, LearnerSwitcher, SessionSummary, ProgressSummary, VocabularyRow. |

**Family UI vertical slice: 1 parent → 2 learners → mỗi learner review ≥1 từ → reload/login lại → progress và review queue của hai learner vẫn tách biệt.**

# 9 · FEATURE UI ACCEPTANCE GATES

| **Gate** | **Requirement** |
| --- | --- |
| **FUI-01** | Register/Login hoạt động với loading/error states và post-login learner resolution đúng. |
| **FUI-02** | 0/1/2+ learner cases có behavior rõ. Family vertical slice phải test 1 parent + 2 learner profiles; mỗi learner review ít nhất 1 từ và progress/review queue không bị trộn. |
| **FUI-03** | Learner Home không tạo session rỗng và hiển thị canonical due/new availability. |
| **FUI-04** | Study front không lộ nghĩa Việt; back ưu tiên IPA + nghĩa Việt + optional media. |
| **FUI-05** | Recall actions chỉ hiện sau flip; không có Skip cho scheduled review. |
| **FUI-06** | Card chỉ advance sau server-confirmed review success. |
| **FUI-07** | Save failure giữ nguyên card và Retry reuse cùng reviewId. |
| **FUI-08** | 409 stale không bị coi là success; canonical state được reload và answer cũ không được đếm. |
| **FUI-09** | Reload/close/back không làm mất review đã server-confirmed và không giả vờ lưu review pending. |
| **FUI-10** | Reinforcement được label “Ôn lại”, max 2/item và không tăng base session counter. |
| **FUI-11** | Session Summary chỉ dùng UI presentation metrics derived from current session state; không thay đổi long-term product progress semantics. |
| **FUI-12** | Progress metrics New/Learning/Mastered/Due/Learned khớp Product Spec v1.0. |
| **FUI-13** | Vocabulary list là read-only content surface; missing media không làm list/card crash. |
| **FUI-14** | Reset progress là P1/CONDITIONAL, không thuộc first vertical slice; UI chỉ bật khi reset API + authorization contract tồn tại và confirmation behavior đã test. |
| **FUI-15** | Mobile Study usable ở narrow viewport, không horizontal overflow, recall actions không che nội dung. |
| **FUI-16** | Keyboard/focus/audio/dialog behavior đạt Global Design System accessibility contract. |
| **FUI-17** | Study dùng DS-EX-001 cho hai recall actions; exception không lan sang feature khác. |
| **FUI-18** | Không implement deferred features: social login, learner login/PIN, edit/delete learner, streak/achievement, offline write sync. |

## 9.1 Deferred / not defined here

| **Item** | **Owner/source** |
| --- | --- |
| Exact API DTO/schema | Technical Architecture / contracts package. |
| Database tables/migrations | Technical Architecture. |
| Token values/colors/spacing | Global Design System v1.0.2. |
| Advanced parent dashboard | Deferred after core learning validation. |
| study_sessions / resume | Deferred Architecture decision. |
| Learner PIN | Deferred Architecture/Product decision. |

## 9.2 Approval statement

> APPROVED FOR UI IMPLEMENTATION
> Feature UI Specification v1.0.1 là baseline cho Family MVP UI implementation. Backlog/UI code phải bám screen states, interaction contracts, session behavior và responsive rules trong tài liệu này. Product semantics thay đổi phải quay về Family MVP Product Specification; visual language thay đổi phải quay về Global Design System; backend contract thay đổi phải quay về Technical Architecture/contracts.
