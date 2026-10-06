# Family MVP Feature UI Specification v1.0.7

- Status: CURRENT FEATURE UI SOURCE OF TRUTH
- Version: v1.0.7
- Source baseline: `VocabFlow_Family_MVP_Feature_UI_Specification_v1.0.1.docx`; this Markdown records the US-26/US-27 taxonomy browse, US-28/US-29 learning-set extension, US-30 daily New settings, US-31 through US-34 exercise mode, US-35/US-36 activity indicators, US-48 Progress Dashboard, US-50 simplified navigation and US-52 asynchronous data states.
- Canonical format: Markdown
- Last synchronized: 2026-10-06

**VOCABFLOW**

**Family MVP Feature UI Specification v1.0.7**

## Loading / Empty / Error states (Feature #15 / US-52)

Data-fetching pages keep their existing AppShell/navigation mounted and place a
layout-matched skeleton in the page content; the Study focus shell may use its
own lightweight skeleton. Loading containers expose `role="status"`,
`aria-busy="true"`, a concise screen-reader label and hide decorative skeleton
blocks from assistive technology. Skeletons fit the content shape (card grid,
rows, dashboard, detail, form/setup, chart or grouped search), do not contain
sample learner data and respect reduced-motion preferences.

Successful empty results use an illustrative icon, specific title, short
guidance and a real contextual action when one exists. Filter/search misses are
distinct from a genuinely empty collection. Retryable failures use a safe
error title and description plus “Thử lại”; retry repeats the relevant read
without resetting learner, route, query or filters. Authentication,
permission, and detail 404/not-found handling keep their existing recovery
semantics and are not converted to generic empty or retry states. Mutations
retain their existing inline pending/success/failure behavior. No state adds
polling, artificial delay, fabricated counts or domain/API changes.

## Global Search (US-51)

The shared AppShell adds one shell-level desktop search trigger above page
content and one icon trigger in the existing compact mobile header. No search
tab is added: desktop navigation remains six items and the mobile bottom bar
remains five. The trigger opens an accessible centered desktop command palette
or a full-screen mobile sheet; active /study and /study/exercises sessions
hide both triggers to preserve focus. The dialog autofocuses its query field,
shows up to five locally stored recent query strings when empty, and groups
real results under Từ vựng, Chủ đề and Bộ từ. Loading, no-result and safe retry
states are compact. Arrow keys move the active result, Enter opens it, Escape
closes the dialog, and Tab remains within the modal. At widths below 1024px the
desktop trigger is hidden and only the mobile trigger is shown.

## Simplified navigation extension (Feature #13 / US-50)

Desktop AppShell has exactly six primary destinations: Home (`/`), Từ vựng
(`/vocabulary`), Học tập (`/study/setup`), Tiến trình (`/progress`), Yêu thích
(`/saved`), and Cài đặt (`/learner-settings`). Settings follows a subtle
divider. At widths below 1024px, including tablet, the sidebar is replaced by
a compact brand/account header and a fixed five-item bottom bar: Home, Từ vựng,
Học tập, Tiến trình, and Yêu thích. The bottom bar has visible labels, at least
44px targets, safe-area padding and corresponding content clearance. Settings
is available from the account menu, not the bottom bar.

Học tập always opens Study Setup; `/study` and `/study/exercises` keep Học tập
active. Only exact primary paths activate a destination, except vocabulary
detail routes. Auxiliary `/weak-words`, `/topics`, `/learning-sets` and
`/learners` pages stay available through contextual links or the account menu;
these routes do not claim a primary active state. The compact account menu
contains Người học and Cài đặt. It supports Escape and outside-click dismissal.
No sign-out action is shown without an existing canonical sign-out flow.

## Reward extension (US-39 / US-40)

The Progress route provides non-blocking level/XP information and a compact,
responsive ordered badge list. Every badge visibly distinguishes locked from
unlocked; loading and safe error states do not interrupt Study.

Exercise feedback remains immediate, but the subsequent save submits answer
evidence rather than a client correctness claim. Server confirmation remains
the authority for the canonical result and any XP bonus; save failures do not
award rewards.

## Progress detail extension (US-37 / US-38)

The Progress route presents seven compact daily summaries (unique words and
reviews) with disclosure details for outcomes and materializations. It also
presents responsive topic rows showing mastered/total plus New, Learning,
Mastered and Due. Loading, safe error and zero-eligible states are explicit;
the latter explains that active words may not yet be categorized.

## Progress Dashboard extension (US-48)

The Progress route presents four real summary metrics (learned, currently
Mastered, review accuracy for the selected period, and the existing current
streak), followed by no more than two charts: unique words reviewed per local
day and review accuracy by day. The default period is seven days; a control
selects thirty days and persists it in `?period=7d|30d`. Accuracy excludes
non-review events and leaves days without outcomes blank. When there are no
review outcomes the metric and chart show explanatory empty copy instead of a
fabricated 0% line. Responsive breakdown panels show current vocabulary-level
coverage and at most five started Topics, with untouched Topics omitted and
the lowest partial coverage labeled as progress rather than weakness. The
panel copy, chart labels and accessible text explain the underlying counts.
No deltas, speculative recommendations or reward metrics are presented in
this dashboard. Reset remains available in a collapsed management disclosure.

## Weak Words (US-49)

`/weak-words` is a learner-scoped attention list that composes the existing
AppShell, card/surface, form-control and vocabulary media patterns. The header
shows the learner context, up to three real summary cards (Weak count, unique
Due count, and 30-local-day review accuracy), plus one primary “Ôn các từ yếu
ngay” action. Accuracy is “Chưa đủ dữ liệu” when the review denominator is
zero. Search covers English and Vietnamese; a status selector filters Tất cả,
Weak, Learning or Stable; the server page size defaults to 20 and never exceeds
50. The row shows word/meaning, optional image/audio/topic/level, text status,
real accuracy/history and a separate due label. Due is not merged into status.

Weak rows sort by Weak overdue, Weak due today, Weak not due, Learning overdue,
Learning due today/upcoming/unscheduled, then Stable overdue/due today/
upcoming/unscheduled. Within a group, lower recent accuracy appears first,
then earlier review date, then vocabulary ID. The bulk CTA opens
`/study/setup?weak=1`; Setup shows the “Từ yếu” source, available queue size and
a review-only start action. Mobile uses stacked rows/cards with wrapped
metadata and full-width actions; horizontal table scrolling is not used.
Loading, retryable error, no Weak candidate, empty list and no-search-match
states are explicit. Badge text, not color alone, communicates classification;
the icon-only audio control has a word-specific accessible name and is disabled
when audio is absent, loading or failed.

**Screen behavior, states and responsive contracts for the Family MVP**

> **Vai trò của tài liệu**
> Tài liệu này cụ thể hóa từng feature/màn hình dựa trên Family MVP Product Specification v1.0, User Flow v1 và Global Design System v1.0.2. Nó không định nghĩa lại database/API internals hoặc design tokens.

| **Baseline** | **Vai trò** |
| --- | --- |
| Family MVP Product Specification v1.0 | Product semantics và phạm vi MVP. |
| Technical Architecture v1.0.7 | Auth, API, persistence, concurrency và backend invariants. |
| Global Design System v1.0.2 | Token, layout primitives, responsive, component và accessibility rules. |
| User Flow v1 | Đường đi tổng thể của parent/learner. |
| Feature UI Spec v1.0.5 | Screen composition, interaction, states, copy và responsive behavior. |

## Trạng thái

**APPROVED FOR UI IMPLEMENTATION — baseline đã khóa cho Family MVP UI implementation; Feature #13 updates AppShell hierarchy and is implemented per US-50.**

# 1 · INFORMATION ARCHITECTURE & APP SHELL

## 1.1 Primary destinations

| **Destination** | **Mục đích** | **Learner context** |
| --- | --- | --- |
| Home (`/`) | Tóm tắt hôm nay + CTA bắt đầu học. | Bắt buộc |
| Từ vựng (`/vocabulary`) | Danh sách vocabulary; contextual link mở Topics. | Bắt buộc |
| Học tập (`/study/setup`) | Study Setup và canonical learning flow. | Bắt buộc khi học |
| Tiến trình (`/progress`) | Xem New / Learning / Mastered / Due / Learned; contextual link mở Topics. | Bắt buộc |
| Yêu thích (`/saved`) | Saved vocabulary và saved-scope learning. | Active learner |
| Cài đặt (`/learner-settings`) | Parent chỉnh learning preferences. | Parent + learner context |
| Routes phụ | Weak Words, Topics, Learning Sets và Learners vẫn có contextual/account entry points. | Theo route |

## 1.2 Navigation contract

- Desktop (>=1024px): sidebar có đúng sáu primary item Home / Từ vựng / Học tập / Tiến trình / Yêu thích / Cài đặt; Settings đứng sau divider.

- Tablet và mobile (<1024px): không hiện sidebar; dùng brand/account header và fixed bottom navigation đúng năm item Home / Từ vựng / Học tập / Tiến trình / Yêu thích. Học tập trỏ `/study/setup`; Settings nằm trong account menu.

- Study routes `/study` và `/study/exercises` giữ Học tập active. Từ vựng active cả ở `/vocabulary/:id`; routes phụ không được gán active state tùy tiện.

- Menu tài khoản tối giản có Người học (`/learners`) và Cài đặt (`/learner-settings`); native button hỗ trợ Enter/Space, `aria-expanded`, Escape, focus return và click ngoài để đóng. Không thêm sign-out giả.

- Weak Words đi từ Home stat “Cần ôn tập”; Topics từ Vocabulary và Progress; Learning Sets từ Home; Learners từ account menu và learner switcher.

- Bottom bar hỗ trợ `env(safe-area-inset-bottom)` và content có khoảng đệm đủ để không bị che.

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
│ Home Vocab Study Progress ♥ │
└────────────────────────────┘
```

```text
Desktop app shell
┌──────────────┬─────────────────────────────────┐
│ VocabFlow    │ Header / learner context        │
│ Home         ├─────────────────────────────────┤
│ Từ vựng     │ Main feature content            │
│ Học tập     │                                 │
│ Tiến trình  │                                 │
│ Yêu thích   │                                 │
│ ─ Cài đặt   │                        User ▼   │
└──────────────┴─────────────────────────────────┘
```

> **Global rule**
> Mọi màn hình dùng tokens/layout/components từ Global Design System v1.0.2; Feature UI Spec không tạo màu, spacing hoặc component visual language mới.

# 2 · AUTHENTICATION

## 2.1 MVP auth scope

| **Feature** | v1.0.5 decision |
| --- | --- |
| Register | Tên phụ huynh + email + password, parent account. `Tên phụ huynh` là display/profile identity được lưu bởi Better Auth. |
| Login | Email + password. |
| Logout | Chỉ hiển thị nếu ứng dụng có canonical sign-out flow; hiện chưa có entry point UI. |
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

### Continue Learning card (US-47)

- Replace content only inside the existing “Tiếp tục học” card. Keep the Home
  hero, stats, learning-set list, progress chart, recent activity, and AppShell
  unchanged.
- Show one in-progress Topic, active assigned Learning Set, or Saved
  collection, with that collection's real `learned / total` count, semantic
  progress bar, and rounded percentage.
- Show “Hoạt động gần nhất” with the latest review-event time only when present;
  it is a vocabulary-level heuristic and does not imply collection provenance.
  Omit mode because runtime does not persist it.
- “Tiếp tục học” enters Study Setup with the selected Topic, Set, or explicit
  all-saved scope. It continues the collection, not an exact prior queue.
- If there is no candidate or the summary cannot load, retain the existing
  queue fallback (“Bắt đầu phiên học” or the compact empty state).
- Exact session resume is unavailable; do not infer it from frontend state or
  browser storage. Stack the content/action on small viewports.

> **Learner switching**
> Nếu đang ở Study, learner switcher không đổi context trực tiếp. User phải rời/kết thúc session trước, theo §5.4.

# 4 · STUDY / FLASHCARD

## 4.1 Layout pattern

> **Focused Task**
> Study dùng Focused Task pattern cho question/action content. Shared AppShell navigation vẫn hiện: desktop sidebar hoặc tablet/mobile bottom navigation; Học tập active xuyên suốt session. Không có sidebar riêng bên trong Study task.

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

## 4.5 Controlled exercise mode (US-31 through US-34)

Learner Home exposes a secondary `Luyện bài tập trắc nghiệm` CTA to
`/study/exercises`; the primary `/study` CTA continues to open Flashcard.

| **Exercise** | **Pre-answer UI** | **Options** | **Fallback** |
| --- | --- | --- | --- |
| Multiple choice meaning | English word + instruction | Four Vietnamese meanings | Flashcard when fewer than three safe distractors exist |
| Listening choice | Generic audio control + instruction | Four English words; target is not repeated in the prompt | Flashcard when audio is missing, broken or candidates are insufficient |
| Image to word | Neutral image + instruction | Four English words; target is not in prompt or image alt text | One-way safe alternative, then Flashcard when image fails or candidates are insufficient |
| Typing / spelling | Safe cue + labelled text input | Exact English word typed by learner | Alternative safe cue or Flashcard when no cue is available |

Exercise options are native keyboard-accessible buttons inside a labelled
fieldset. After one selection, options are disabled, selected/focus state stays
visible and feedback uses text as well as color. Correct/incorrect feedback is
shown before the `Tiếp tục` action becomes available; `Tiếp tục` is only shown
after the canonical review save succeeds. Save failure keeps the answer locked
and exposes the existing Retry action.

Listening uses a generic audio label so the control does not reveal the target
word. Existing one-active-audio, transition cleanup, unmount cleanup and
no-SpeechSynthesis rules remain in force. The four-option grid collapses to a
single readable column on small screens. Image exercises use neutral alt text;
typing accepts NFKC/outer-trim/case normalization, preserves meaningful
internal spaces, rejects fuzzy spelling, locks after one submit and exposes
text feedback. `/study/exercises?type=IMAGE_TO_WORD` and
`/study/exercises?type=TYPE_WORD` select the corresponding preferred mode when
the admitted vocabulary is eligible.

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
| Favorites / saved words | Learner-owned favorites are in scope under US-46; custom sets remain a separate capability. |
| Content editing | OUT v1.0. |

| **State** | **Behavior** |
| --- | --- |
| Loading | Skeleton/list loading. |
| No enabled vocabulary | Content empty/error state; Study CTA disabled. |
| Search no result | “Không tìm thấy từ phù hợp”; clear-search action. |
| Optional media missing | Không ảnh hưởng row/list. |

## 7.1e Saved vocabulary (US-46)

| **Capability** | **Behavior** |
| --- | --- |
| Saved page | `/saved` lists only the active learner's persisted saved vocabulary. |
| Search | Trimmed, case-insensitive English word and Vietnamese meaning search. |
| Filters | Runtime vocabulary levels and topics from saved records; search, level and topic combine with AND and remain in URL parameters. |
| Save controls | Catalog, detail and saved rows expose a semantic bookmark with a learner-specific pressed state. Save/unsave is optimistic, blocks duplicate requests and rolls back with an accessible error on failure. |
| Study action | “Học tất cả từ đã lưu” opens Study Setup with `saved=1&content=all`; this explicit mode studies the enabled saved collection, capped to the chosen session size. Not-due existing progress is voluntary practice, not Review. The regular New/Review/Mixed choices retain their normal meaning. |
| Empty states | No saved records offers a link to Vocabulary; filter mismatch offers a clear-filters action. |
| Learner change | Changing active learner reloads the saved relation and never reuses another learner's state. |

## 7.1a Vocabulary taxonomy browse

| **Capability** | **Behavior** |
| --- | --- |
| Level filter | Select with `Tất cả cấp độ`, `Lớp 1`–`Lớp 5` and `Chung`; changing it reloads the canonical learner vocabulary read. |
| Unclassified level | `Tất cả cấp độ` includes NULL levels; the UI does not invent a label or assign a grade. |
| Topic entry | A `Duyệt theo chủ đề` link opens the topic browse route without changing active learner progress. |
| Topic list | Show enabled topics in canonical `sortOrder`; each item includes name and description. |
| Topic vocabulary | Selecting a topic shows enabled mapped vocabulary in stable order; no learner status is required on this read-only surface. |
| Topic states | Loading, request error with retry-capable error state, no-topic empty state, no-vocabulary empty state and selected-topic state are explicit. |

Topic browse is read-only. Missing media, NULL level and disabled vocabulary
must remain safe states; disabled vocabulary is never rendered by a topic
result.

## 7.1b Learning set catalog and assignment

| **Capability** | **Behavior** |
| --- | --- |
| Set catalog | Show enabled curated sets in canonical `sortOrder`, with name, description, optional grade and enabled vocabulary count. |
| Set detail | Show enabled vocabulary in the server-provided `learning_set_items.sortOrder`; display a stable position number, word and Vietnamese meaning. |
| Assignment entry | From learner home or set catalog, open the active learner's assignment screen. |
| Assignment toggle | Each set shows `Gán bộ từ` or `Đã gán`; PUT/DELETE has a per-set busy state and does not block unrelated page navigation longer than necessary. |
| Learner switch | Assignment screen is keyed by learner identity and reloads the full canonical assignment list; no previous learner's toggles or success state remain. |
| States | Catalog/detail/assignment each expose loading, error/retry, empty and save success/error states with live-region messaging. |
| Queue meaning | Copy explains that queue content is the enabled union of active assigned sets; unassigning does not delete progress or review history. |

Learning-set screens are read-only for set content. Parents cannot author or
edit sets in this slice. Cross-household learners must show the safe forbidden
state returned by the canonical API.

## 7.1c Daily New settings (US-30)

| **Capability** | **Behavior** |
| --- | --- |
| Learner identity | The settings screen clearly names the active learner and is keyed by learner ID. |
| Current value | Load the canonical `dailyNewWordLimit` before enabling the form; default is 10. |
| Validation | Accept integer values 0–100 only; show inline validation without sending malformed input. |
| Save | Disable duplicate submits, show saving state, refresh the canonical saved value and show success/error feedback. |
| Semantics copy | Explain that the setting limits only New words for the household-local day; Due remains available and first. |
| Learner switch | Changing learner remounts the screen and clears the previous value, status and messages before loading. |
| States | Loading, API error/retry, validation error, saving and success are explicit and mobile-safe. |

## 7.1d Daily learning goal and streak (US-35 / US-36)

| **Capability** | **Behavior** |
| --- | --- |
| Daily goal setting | Parent sees and edits `dailyNewWordGoal` (default 10) and `dailyReviewWordGoal` (default 20) for the active learner; both integers 1–100. |
| Separate semantics | Copy distinguishes both learning targets from `dailyNewWordLimit`, the scheduler's hard cap for NEW admission; due reviews remain first and are not capped. |
| Home progress | Home shows a composite progress ring, separate new/review counts and progress bars, plus the persisted streak. Completion requires both goals; actual counts are not capped. |
| Daily progress | Progress screen shows new count, review count and overall percent for the household-local date; per-category percentage caps at 100 and completion is derived. |
| Current streak | Show “N ngày liên tiếp”; today-active streak ends today, while inactive today may continue from an active yesterday. |
| Longest streak | Show “Kỷ lục: N ngày”; it is separate from goal completion and accuracy. |
| Canonical source | Loading reads the learner activity-summary API; no client counter or local persistence is authoritative. |
| Learner switch | Goal, progress, streak and messages clear/remount by learner ID before loading the next learner. |
| States | Loading, API error/retry, empty history, active day, yesterday continuation, broken streak, saving and validation are explicit and mobile-safe. |

## 7.2 Parent actions in MVP

| **Action** | **Scope** | **UI location** |
| --- | --- | --- |
| Create learner | YES | Learner Selector. |
| Select/switch learner | YES | Learner Selector / profile switcher. |
| View learner progress | YES | Progress screen. |
| Reset learner progress | P1 / CONDITIONAL — thuộc Family MVP nhưng không thuộc first vertical slice. | Chỉ enable sau khi có reset API contract + learner authorization contract + confirmation behavior được test. |
| View and assign learning sets | YES | Learning-set catalog/detail and active learner assignment screen. |
| Edit daily New limit | YES | Active learner settings screen. |
| Edit daily learning goals | YES | Active learner settings screen. |
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
| Vocabulary | Single column/list; filter stacks above list | List + search/filter | Wider list with level filter and topic browse affordance |
| Topic browse | Topic buttons stack above selected vocabulary | Topic list + selected results | Two-column topic navigation and results |

## 8.2 Mobile-specific rules

- Base viewport <640px: 16px gutter; no horizontal overflow.

- Study recall action zone có thể sticky phía dưới nhưng không che card content hoặc browser safe area.

- Bottom navigation 5 items — Home, Từ vựng, Học tập, Tiến trình, Yêu thích; touch target tối thiểu 44×44px, icon + visible label, safe-area inset và content clearance.

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
| Feature-owned | Flashcard, RecallActions, LearnerCard, LearnerSwitcher, SessionSummary, ProgressSummary, VocabularyRow, VocabularyLevelFilter, TopicBrowse. |

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
| **FUI-18** | Không implement deferred features: social login, learner login/PIN, edit/delete learner, leaderboard/achievement, offline write sync. |
| **FUI-19** | Learning-set catalog/detail renders deterministic ordered enabled content with explicit loading/error/empty states. |
| **FUI-20** | Assignment toggles are learner-scoped, show save feedback, reject cross-household access safely and never imply progress/history deletion. |
| **FUI-21** | Progress Dashboard metrics reuse canonical progress/streak and persisted review outcomes; selected 7/30-day activity, accuracy gaps, enabled-level coverage and active-set Topic coverage are truthful and accessible. |
| **FUI-22** | Fetch states use layout-matched accessible skeletons, contextual empty guidance, safe retry for retryable failures, and preserve AppShell plus learner/query/filter context; 404/auth/permission and mutation states remain distinct. |

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
> Feature UI Specification v1.0.7 là baseline cho Family MVP UI implementation. Backlog/UI code phải bám screen states, interaction contracts, session behavior và responsive rules trong tài liệu này. Product semantics thay đổi phải quay về Family MVP Product Specification; visual language thay đổi phải quay về Global Design System; backend contract thay đổi phải quay về Technical Architecture/contracts.
