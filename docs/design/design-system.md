# Global Design System WebApp UI Rules v1.0.2

- Status: CURRENT GLOBAL UI SOURCE OF TRUTH
- Version: v1.0.2
- Source baseline: `VocabFlow_Global_Design_System_WebApp_UI_Rules_v1.0.2.docx`
- Canonical format: Markdown
- Last synchronized: 2026-09-08

**VOCABFLOW**

**Global Design System & WebApp UI Rules v1.0.2**

**Scalable rules for every current and future screen**

| **Status** | APPROVED GLOBAL DESIGN BASELINE |
| --- | --- |
| **Version** | 1.0.2 |
| **Owner** | VocabFlow Project Owner |
| **Approval authority** | VocabFlow Project Owner |
| **Target** | Family Learning WebApp |
| **Scope** | Tokens, shell, layouts, components, responsive, interaction, accessibility, governance |

Rulebook toàn cục cho giao diện VocabFlow. Tài liệu này không thiết kế sẵn từng trang và không chứa product semantics riêng của từng feature.

# 0. Design Governance

| **Mục** | **Quy tắc** |
| --- | --- |
| Source of truth | Tài liệu này là baseline toàn cục cho UI/UX. Feature UI Spec chỉ được cụ thể hóa, không được tạo visual language song song. |
| Owner | VocabFlow Project Owner. |
| Approval authority | Mọi thay đổi token/component/global rule cần Project Owner approve. |
| Review trigger | Review khi có thay đổi cross-feature, accessibility requirement mới, hoặc implementation blocker; không review theo lịch chỉ để tạo thay đổi. |
| Change policy | Token/component rule chỉ thay đổi khi có lý do sản phẩm, accessibility hoặc platform constraint có bằng chứng. |
| Extension rule | Feature mới phải compose tokens/components/layout patterns hiện có trước khi yêu cầu primitive/variant mới. |
| Naming rule | Tên token/component/variant phải semantic; không đặt theo màu/vị trí tạm thời. |
| Feature-spec boundary | Độ tuổi, learning-content density, metric semantics và state transition của từng màn nằm ở Product/Feature Spec. |
| Existing UI migration | Existing UI may remain temporarily. Whenever an existing screen or component is materially changed, it must conform to the current Global Design System. |
| Material change definition | Material change includes layout redesign, interaction-pattern change, significant feature addition, or replacement/rebuild of a shared component. Typo/copy-only edits and bug fixes that do not change UI structure do not trigger mandatory migration. |

## 0.1 Exception process

| **Field** | **Required content** |
| --- | --- |
| Exception ID | DS-EX-### |
| Requested by | Người/feature yêu cầu ngoại lệ |
| Rule being bypassed | Rule/token/component contract cụ thể |
| Reason | Lý do kỹ thuật/sản phẩm có thể kiểm chứng |
| Scope | Feature/component/page được phép áp dụng |
| Expiration / review condition | Khi nào ngoại lệ hết hiệu lực hoặc phải review lại |
| Approved by | VocabFlow Project Owner |

> **Exception invariant**
> Ngoại lệ không tự tạo precedent. Nếu một exception lặp lại ở nhiều feature, phải xem xét nâng thành thay đổi chính thức của Design System.

# 1. Core Design Principles

| **ID** | **Principle** | **Rule** |
| --- | --- | --- |
| **P1** | Compact, not cramped | Webapp phải thon gọn nhưng không hy sinh khả năng đọc hoặc touch target. |
| **P2** | Mobile-first | Mobile là base layout; tablet/desktop chỉ mở rộng khả năng trình bày. |
| **P3** | Content first | Nội dung học luôn ưu tiên hơn navigation, decoration hoặc gamification. |
| **P4** | One primary action | Mỗi context chỉ có một hành động chính nổi bật. |
| **P5** | Consistent > clever | Ưu tiên pattern quen thuộc, hành vi ổn định và reusable composition. |
| **P6** | Positive learning feedback | Không dùng visual/copy mang tính phạt cho trạng thái chưa nhớ. |
| **P7** | Accessible by default | Contrast, keyboard, focus, touch size và reduced motion là default. |
| **P8** | Scalable by composition | Trang mới xây từ shell + layout primitives + reusable components. |

> **Design direction**
> Clean • compact • friendly • modern webapp • soft rounded surfaces • high readability • minimal decoration • strong responsive behavior.

# 2. Canonical Design Token Contract

> **Token source of truth**
> Các giá trị dưới đây là canonical v1.0.2. Khi code, map trực tiếp sang CSS variables/Tailwind theme. Không tự chọn giá trị khác mà vẫn gọi cùng token.

## 2.1 Color tokens — Light theme

| **Token** | **Light value** | **Usage** | **Contrast pair** | **Future dark** |
| --- | --- | --- | --- | --- |
| --color-primary | #635BFF | CTA chính, active nav | white text only when contrast passes | Reserved |
| --color-primary-hover | #5148E5 | Primary hover/pressed | white | Reserved |
| --color-primary-soft | #F0EFFF | Selected/soft emphasis | #3730A3 | Reserved |
| --color-bg | #F8FAFC | App background | #0F172A | Reserved |
| --color-surface | #FFFFFF | Card/panel/menu | #0F172A | Reserved |
| --color-surface-muted | #F1F5F9 | Grouped/subtle area | #334155 | Reserved |
| --color-text | #0F172A | Primary text | #FFFFFF / light surfaces | Reserved |
| --color-text-muted | #64748B | Metadata/helper | #FFFFFF / #F8FAFC | Reserved |
| --color-border | #E2E8F0 | Borders/separators | N/A | Reserved |
| --color-success-bg | #DCFCE7 | Soft success state | #166534 | Reserved |
| --color-success-text | #166534 | Success foreground | #DCFCE7 / white | Reserved |
| --color-warning-bg | #FEF3C7 | Soft warning/needs attention | #92400E | Reserved |
| --color-warning-text | #92400E | Warning foreground | #FEF3C7 / white | Reserved |
| --color-danger | #DC2626 | Destructive/error | white where AA passes | Reserved |
| --color-focus | #4F46E5 | Focus ring | Adjacent neutral surfaces | Reserved |

## 2.2 Typography tokens

| **Token** | **Size** | **Line-height** | **Weight** | **Usage** |
| --- | --- | --- | --- | --- |
| --text-display | 40px | 48px | 700 | Hero learning word / key content |
| --text-h1 | 30px | 36px | 700 | Primary page title |
| --text-h2 | 24px | 32px | 600 | Section title |
| --text-h3 | 20px | 28px | 600 | Card/subsection title |
| --text-body | 16px | 24px | 400 | Default readable content |
| --text-small | 14px | 20px | 400 | Helper/metadata |
| --text-caption | 12px | 16px | 500 | Passive labels/captions |

- Font family v1: `Inter`, fallback `system-ui, -apple-system, Segoe UI, sans-serif`.

- Mobile display override: `--text-display` = 32px / 40px / 700 dưới 640px; các token còn lại giữ nguyên trừ Feature Spec có reason rõ.

## 2.3 Spacing tokens

| **Token** | **Value** | **Typical usage** |
| --- | --- | --- |
| --space-1 | 4px | Micro gap |
| --space-2 | 8px | Control/item gap |
| --space-3 | 12px | Control/item gap |
| --space-4 | 16px | Component padding/gap |
| --space-6 | 24px | Card/section spacing |
| --space-8 | 32px | Card/section spacing |
| --space-12 | 48px | Large section/page spacing |
| --space-16 | 64px | Large section/page spacing |

## 2.4 Radius, border & elevation tokens

| **Token** | **Value** | **Usage** |
| --- | --- | --- |
| --radius-control | 12px | Button, input, compact control |
| --radius-card | 16px | Default card/panel |
| --radius-feature | 20px | Learning/feature surface |
| --radius-dialog | 20px | Modal/sheet |
| --radius-pill | 999px | Chip/status only |
| --border-default | 1px solid #E2E8F0 | Default surface separation |
| --shadow-card | 0 4px 16px rgb(15 23 42 / 0.06) | Focused card only |
| --shadow-floating | 0 12px 32px rgb(15 23 42 / 0.12) | Dialog/menu/floating layer |

# 3. Global WebApp Layout Rules

## 3.1 App shell

```text
Desktop / wide:
[Side navigation] [Main content] [Optional contextual panel]

Tablet:
[Compact nav or drawer] [Main content]

Mobile:
[Top app bar]
[Main content]
[Optional sticky primary-action zone]
[Bottom navigation only when primary destinations <= 5]
```

- Sidebar không bắt buộc trên mobile.

- Context panel phải collapse/remove trước khi làm hẹp main learning content.

- Không kéo nội dung đọc/học vô hạn trên ultrawide; dùng readable max-width theo layout pattern.

## 3.2 Responsive breakpoints

| **Range** | **Canonical behavior** |
| --- | --- |
| **< 640px** | Mobile: single column; 16px horizontal gutter; touch-first; sticky action khi task yêu cầu. |
| **640–1023px** | Tablet: 24px gutter; selective 2-column; drawer/compact navigation ưu tiên. |
| **>= 1024px** | Desktop: 32px gutter; sidebar/context panels allowed; main content giữ readable width. |

## 3.3 Grid & sizing rules

- 4px base grid; spacing chỉ dùng canonical tokens.

- Không dùng absolute positioning cho primary page layout.

- Không fixed-height content nếu text/data có thể tăng.

- Mobile base styles trước; breakpoint chỉ enhance.

- Page container mặc định không vượt 1440px; focused content thường hẹp hơn theo Feature Spec.

# 4. Navigation & Page Composition

## 4.1 Navigation hierarchy

| **Level** | **Pattern** | **Rule** |
| --- | --- | --- |
| Global | Sidebar / bottom nav / top nav | Chỉ chứa primary destinations ổn định. |
| Section | Tabs / segmented / local nav | Subviews trong cùng context. |
| Contextual | Menu / action group | Temporary actions; không đẩy vào global nav. |
| Back | Browser/back affordance | Không thay bằng custom flow khó dự đoán. |

## 4.2 Approved page layout patterns

| **Pattern** | **When to use** | **Mobile behavior** |
| --- | --- | --- |
| Focused task | Study/review/onboarding/action-centric flow | Single-column; primary action near thumb zone |
| Single column | Settings/forms/content detail | Natural document flow |
| List → detail | Vocabulary/learner/history | List then routed/detail sheet |
| Dashboard grid | Parent summary/metrics | Cards stack; priority order preserved |
| Split view | Desktop contextual detail | Collapse to single-column |

> **Page invariant**
> Trang mới phải chọn một approved pattern. Nếu không pattern nào phù hợp, phải cập nhật Design System hoặc ghi exception trước khi implementation.

# 5. Component System Rules

## 5.1 Hierarchy

```text
Primitives
  Button / IconButton / Input / Select / Checkbox / Dialog / Toast

Composites
  SearchField / EmptyState / ErrorState / ProgressSummary / AvatarMenu

Domain components
  Flashcard / RecallActions / LearnerCard / VocabularyRow / ProgressCard

Page compositions
  Compose from the layers above; do not duplicate internal styling per page.
```

## 5.2 Allowed baseline variants

| **Component** | **Variants** |
| --- | --- |
| Button | primary, secondary, ghost, destructive |
| IconButton | default, ghost |
| Card | default, interactive, selected, muted |
| Badge/Chip | neutral, info, success, warning |
| Input | default, error, disabled |
| Toast | info, success, warning, error |

- Không tạo `purpleButton`, `smallBlueCard`, `mobileOnlyButton`.

- Variant phải biểu đạt semantic/action state.

- Component mới chỉ tạo khi có domain behavior rõ hoặc pattern lặp lại; shared primitive mới cần reason cross-feature.

## 5.3 Control sizing

| **Control** | **Canonical minimum** |
| --- | --- |
| Touch/click target | 44 × 44px |
| Primary/secondary button height | 44px; 48px cho learner-focused CTA |
| Text input height | 44px |
| Icon visual size | 20px default; 24px khi emphasis |
| Mobile horizontal gutter | 16px |

# 6. Interaction & State Rules

| **State** | **Required treatment** |
| --- | --- |
| Default | Readable; affordance rõ. |
| Hover | Desktop enhancement only; không chứa thông tin độc quyền. |
| Pressed | Immediate visual/tactile feedback. |
| Focus-visible | 2px focus ring using `--color-focus`; không remove outline mà không thay thế. |
| Disabled | Lower emphasis + blocked behavior; vẫn readable. |
| Loading | Prevent duplicate action khi write/action đang xử lý. |
| Success | Xác nhận canonical completion. |
| Error | Nói rõ failure + recovery action. |

## 6.1 Feedback language

- Ưu tiên hướng dẫn tích cực; không dùng 'Sai!' như default learner feedback.

- Không truyền state bằng màu đơn thuần.

- Save/network failure phải nói rõ trạng thái dữ liệu.

- Toast dùng cho transient feedback; issue tồn tại dùng inline/banner.

## 6.2 Motion tokens

| **Token / motion** | **Value / rule** |
| --- | --- |
| --motion-fast | 120ms |
| --motion-default | 200ms |
| --motion-slow | 280ms |
| Easing | cubic-bezier(0.2, 0, 0, 1) |
| Reduced motion | Respect `prefers-reduced-motion`; remove non-essential transforms |

# 7. Content, Forms & Data Density

## 7.1 Content hierarchy

- Một vùng chỉ có một heading nổi trội.

- Helper text không cạnh tranh với primary content.

- Metadata dùng `--color-text-muted` nhưng vẫn phải đạt contrast requirement.

- Nội dung học quan trọng phải wrap và xem được đầy đủ.

## 7.2 Forms

| **Rule** | **Contract** |
| --- | --- |
| Label | Field quan trọng phải có visible label; placeholder không thay label. |
| Validation | Inline gần field; message nói cách sửa. |
| Submit | Một primary action trong logical form group. |
| Mobile keyboard | Dùng input type phù hợp email/numeric/search. |
| Destructive | Explicit confirmation cho thao tác xóa dữ liệu/progress. |

## 7.3 Density modes

| **Context** | **Density contract** |
| --- | --- |
| Learner-facing | Comfortable: tap target lớn, ít secondary metadata, hierarchy mạnh. |
| Parent-facing | Compact/comfortable: table/grid allowed nhưng mobile vẫn usable. |
| Future admin | Compact allowed; vẫn dùng cùng tokens/components. |

# 8. Accessibility Contract

| **ID** | **Area** | **Contract** |
| --- | --- | --- |
| **A11Y-1** | Keyboard | Mọi interactive control dùng được bằng keyboard. |
| **A11Y-2** | Focus | Focus-visible luôn hiện rõ; 2px ring + offset khi cần. |
| **A11Y-3** | Contrast | WCAG AA baseline:<br>Normal text/action: >= 4.5:1.<br>Large text: >= 3:1.<br>UI/focus indicators: >= 3:1 against adjacent background. |
| **A11Y-4** | Touch | Interactive target >= 44×44px. |
| **A11Y-5** | Semantics | Dùng semantic button/link/input; không dùng clickable div cho control. |
| **A11Y-6** | Icon | Icon-only control phải có accessible name. |
| **A11Y-7** | Motion | Tôn trọng reduced motion. |
| **A11Y-8** | Color | Critical state không được truyền bằng màu đơn thuần. |

# 9. Responsive Component Behavior

| **Component type** | **Mobile** | **Desktop** |
| --- | --- | --- |
| Navigation | Bottom nav/drawer/top app bar | Sidebar/top nav allowed |
| Dialog | Sheet/full-width modal khi hẹp | Centered modal |
| Table | Card/list preferred; horizontal scroll only when necessary | Full table |
| Action group | Stack when constrained | Inline allowed |
| Cards | 1 column default | 2–4 columns based on content |
| Context panel | Below/collapse/remove | Right panel allowed |
| Filters | Drawer/popover | Inline toolbar allowed |

> **Mobile invariant**
> Không 'thu nhỏ desktop'. Mobile có layout behavior riêng nhưng dùng cùng token, component và interaction language.

# 10. Future Expansion Rules

## 10.1 Adding a new page

```text
1. Choose one approved layout pattern
2. Reuse AppShell + global navigation
3. Use canonical tokens
4. Compose existing components
5. Add a component only if domain-specific or justified for reuse
6. Define loading / empty / error / permission states
7. Define mobile behavior first
8. Pass accessibility + responsive gates
```

## 10.2 Adding a new component/token

| **Change type** | **Required before implementation** |
| --- | --- |
| New shared component | Problem statement + >=3 plausible cross-feature use cases OR clear foundational primitive need |
| New domain component | Feature ownership + state/responsive contract |
| New variant | Semantic reason; cannot be represented by existing variant |
| New token | Cross-feature semantic need or accessibility/platform requirement |
| Arbitrary value | Not allowed unless documented exception exists |

# 11. Implementation Rules for Code

| **Area** | **Implementation contract** |
| --- | --- |
| Tokens | Canonical values exposed as CSS variables and mapped into Tailwind theme. |
| Spacing | Use named spacing tokens/classes; arbitrary values need exception. |
| Colors | Components use semantic tokens, not raw hex when a token exists. |
| Typography | Use tokenized text styles; do not hand-pick font sizes per page. |
| Components | Shared primitives centralized; domain components feature-owned. |
| Responsive | Mobile base styles; enhance with breakpoints. |
| Icons | One icon library; default 20px, consistent stroke. |
| Focus | Never remove focus indicator without accessible replacement. |
| Dark mode | Deferred; structure tokens so future dark values can be supplied without page rewrites. |

## 11.1 Canonical CSS-variable shape

```text
:root {
  /* Brand & semantic colors */
  --color-primary: #635BFF;
  --color-primary-hover: #5148E5;
  --color-primary-soft: #F0EFFF;
  --color-bg: #F8FAFC;
  --color-surface: #FFFFFF;
  --color-surface-muted: #F1F5F9;
  --color-text: #0F172A;
  --color-text-muted: #64748B;
  --color-border: #E2E8F0;
  --color-success-bg: #DCFCE7;
  --color-success-text: #166534;
  --color-warning-bg: #FEF3C7;
  --color-warning-text: #92400E;
  --color-danger: #DC2626;
  --color-focus: #4F46E5;

  /* Typography */
  --font-sans: Inter, system-ui, -apple-system, "Segoe UI", sans-serif;
  --text-display: 40px;
  --leading-display: 48px;
  --weight-display: 700;
  --text-h1: 30px;
  --leading-h1: 36px;
  --weight-h1: 700;
  --text-h2: 24px;
  --leading-h2: 32px;
  --weight-h2: 600;
  --text-h3: 20px;
  --leading-h3: 28px;
  --weight-h3: 600;
  --text-body: 16px;
  --leading-body: 24px;
  --weight-body: 400;
  --text-small: 14px;
  --leading-small: 20px;
  --weight-small: 400;
  --text-caption: 12px;
  --leading-caption: 16px;
  --weight-caption: 500;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-6: 24px;
  --space-8: 32px;
  --space-12: 48px;
  --space-16: 64px;

  /* Shape & elevation */
  --radius-control: 12px;
  --radius-card: 16px;
  --radius-feature: 20px;
  --radius-dialog: 20px;
  --radius-pill: 999px;
  --border-default: 1px solid #E2E8F0;
  --shadow-card: 0 4px 16px rgb(15 23 42 / 0.06);
  --shadow-floating: 0 12px 32px rgb(15 23 42 / 0.12);

  /* Motion */
  --motion-fast: 120ms;
  --motion-default: 200ms;
  --motion-slow: 280ms;
  --motion-easing: cubic-bezier(0.2, 0, 0, 1);
}

@media (max-width: 639px) {
  :root {
    --text-display: 32px;
    --leading-display: 40px;
  }
}
```

- Đoạn :root ở trên là canonical token contract đầy đủ cho v1.0.2, không phải abbreviated example. File `tokens.css` / Tailwind theme trong repo phải mirror 1:1 các token và giá trị này. Nếu code và tài liệu khác nhau, cùng PR phải cập nhật cả hai hoặc ghi exception theo §0.1.

# 12. Global Design Acceptance Gates

| **Gate** | **Requirement** |
| --- | --- |
| **D1** | UI dùng canonical semantic tokens; không random color/spacing. |
| **D2** | Screen mới dùng một approved page layout pattern. |
| **D3** | Mobile không horizontal overflow ở viewport hẹp. |
| **D4** | Touch target đạt >= 44×44px. |
| **D5** | Primary/secondary action hierarchy rõ. |
| **D6** | Keyboard + focus-visible hoạt động. |
| **D7** | Loading/empty/error và domain-specific edge states được Feature Spec định nghĩa trước khi ship. |
| **D8** | Critical state không dựa vào color-only; contrast đạt WCAG AA theo context. |
| **D9** | Navigation/panel/action-group có responsive behavior rõ. |
| **D10** | Reuse component trước khi tạo variant/component mới. |
| **D11** | Learner-facing density giữ comfortable/simple. |
| **D12** | Parent-facing density có thể compact nhưng vẫn mobile usable. |
| **D13** | Motion tôn trọng reduced-motion và không cản trở learning. |
| **D14** | Page-specific CSS không tạo visual language song song. |
| **D15** | Token/component mới có reason, scope và approval/exception record khi cần. |

# 13. Do / Don't Summary

| **Do** | **Don't** |
| --- | --- |
| Reuse canonical semantic tokens | Hard-code random hex/spacing per page |
| Design mobile-first | Shrink desktop layout |
| Compose existing components | Duplicate components for every feature |
| Keep one main action | Show several equally strong CTAs |
| Use positive learner feedback | Use harsh red/error language for 'not remembered' |
| Define states before shipping | Design only happy path |
| Preserve readable width | Stretch learning content across ultrawide |
| Use one shell/navigation language | Invent new nav patterns per feature |

# 14. Approval & Change Control

| **Item** | **Value** |
| --- | --- |
| Baseline status | APPROVED GLOBAL DESIGN BASELINE |
| Version | 1.0.2 |
| Owner | VocabFlow Project Owner |
| Approval authority | VocabFlow Project Owner |
| Effective scope | All VocabFlow WebApp UI implemented after approval |
| Next review | Only when a cross-feature requirement, accessibility issue, platform constraint or implementation blocker requires it |
| Existing UI policy | Grandfather temporarily; migrate to current Global Design System when the screen/component is materially changed. |

> **APPROVED GLOBAL DESIGN BASELINE**
> Tài liệu này là rulebook toàn cục cho VocabFlow WebApp. Feature UI Specs được phép cụ thể hóa layout/content/state của từng feature nhưng không được tự tạo màu, spacing, typography, navigation hoặc component language mới. Mọi exception phải theo §0.1 và được Project Owner approve.
