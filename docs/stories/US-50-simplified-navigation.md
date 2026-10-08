# US-50 — Simplified App Navigation (Feature #13)

## 2026-10-08 — Owner UI correction

Desktop Settings has one entry in primary navigation. Desktop account menu
contains Logout only; mobile keeps its sole Settings entry in the account menu.
Account trigger has no decorative chevron. Keyboard menu access is retained.


- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Owner: Project Owner
- Last updated: 2026-10-05
- Scope: simplify shared AppShell navigation while keeping secondary routes discoverable.

## 1. User Story

As a parent or learner, I want a small, consistent set of primary destinations
so I can find the main learning areas without scanning a crowded menu.

## 2. Outcome

Desktop uses a six-item sidebar; tablet and mobile use the five core items in a
fixed bottom navigation. Account and feature-specific destinations remain
available through existing contextual links and a compact account menu.

## 3. Source of Truth References

- [Product Specification — simplified navigation](../product/product-spec.md#simplified-navigation-extension-feature-13--us-50)
- [Feature UI Specification — simplified navigation](../design/feature-ui-spec.md#simplified-navigation-extension-feature-13--us-50)
- [Feature UI Specification — responsive and accessibility rules](../design/feature-ui-spec.md#8--responsive-accessibility--component-mapping)
- [User Flow — simplified navigation](../flow/user-flow.md#simplified-navigation-extension-feature-13--us-50)
- [DEC-025 — Simplified primary navigation](../decisions.md#dec-025--simplified-primary-navigation)
- [Global Design System](../design/design-system.md)
- [US-44 Study Session Focus Mode](US-44-study-session-focus-mode.md)

## 4. Dependencies

- Existing authenticated AppShell, route tree and active learner context.
- Existing Home, Vocabulary, Progress, Favorites, Settings and Study Setup routes.
- Existing contextual entry points to Topics, Learning Sets and Learners.

## 5. In Scope

- Exactly six desktop destinations: Trang chủ, Từ vựng, Học tập, Tiến trình,
  Yêu thích and Cài đặt; Settings follows a divider.
- Exactly five tablet/mobile bottom destinations: Trang chủ, Từ vựng, Học tập,
  Tiến trình and Yêu thích. At widths below 1024px the sidebar is replaced by a
  brand/account header and fixed bottom navigation.
- Học tập opens `/study/setup`; `/study` and `/study/exercises` keep it active.
- Active navigation only on the documented canonical paths; auxiliary routes
  do not claim an unrelated active item.
- An accessible account menu provides Người học and Cài đặt on desktop and
  mobile. Do not show a sign-out control without an existing canonical flow.
- Preserve all routes and provide contextual discovery for Weak Words, Topics,
  Learning Sets and Learners.
- Safe-area and content clearance for the fixed mobile/tablet navigation.

## 6. Out of Scope

- Home/dashboard redesign, notifications or new account/auth behavior.
- Route removal, API, scheduler, database, migration or Dataset V2 changes.
- New navigation API calls or learner-list fetches.

## 7. Auxiliary Route Entry Points

| Route | Entry point |
| --- | --- |
| `/weak-words` | Home “Cần ôn tập” stat card |
| `/topics` | Vocabulary topic browse link and Progress “Xem tất cả” |
| `/learning-sets` | Home Learning Sets “Xem tất cả” |
| `/learners` | Account menu and Home learner switcher |

## 8. Acceptance Criteria

- AC-01: Desktop renders the exact six primary destinations, with Settings
  separated; no Weak Words, Topics, Learning Sets or Learners primary links.
- AC-02: Tablet/mobile render exactly five bottom links, no Settings, with
  visible labels, 44px-or-larger targets, fixed positioning, safe-area support
  and content padding.
- AC-03: Active route semantics match the canonical primary destinations,
  including vocabulary detail and all three Study routes; auxiliary routes
  leave all primary destinations inactive.
- AC-04: The account menu button exposes `aria-expanded`, `aria-controls` and
  `aria-haspopup="menu"`; native keyboard activation, Escape, outside pointer
  dismissal and menu route links work without losing focus on Escape.
- AC-05: The account menu provides `/learners` and `/learner-settings` on both
  responsive shells. No fake sign-out action is introduced.
- AC-06: Auxiliary routes remain reachable using the entry points in §7; no
  route or Home dashboard section is removed.
- AC-07: Study navigation continues to `/study/setup`; session routes preserve
  the Học tập active state and shared shell.
- AC-08: No API, database, migration, scheduler, production deploy or Dataset V2
  changes are made.

## 9. Test Plan

- App routing/shell tests for exact destination sets, route active states,
  auxiliary paths, account menu, and mobile navigation route changes.
- Home, Vocabulary, Progress, Study Setup, Study, Saved, Weak Words, Topics,
  Learning Sets and Continue Learning regressions.
- Typecheck, production build, ESLint on changed TS/TSX and whitespace checks.
- Responsive viewport check near 1440px, 768px and 390px where browser tooling
  is available.

## 10. Acceptance Evidence

- AppShell exact desktop/mobile destination, canonical active-route, auxiliary
  route, account menu keyboard/outside-click, and route-following assertions
  pass in `apps/web/src/App.test.tsx`; the Home Weak Words entry point and
  Vocabulary Topics link have direct regression assertions.
- Focused regressions: 14 files / 207 tests PASS, including App, Home,
  Vocabulary, Study Setup, Study/Exercises, Saved, Weak Words, Progress,
  Topics/Topic Detail, Learner Settings, and Learning Sets.
- `pnpm typecheck`: PASS.
- `pnpm build`: PASS; the existing API dynamic-import and client chunk-size
  advisories remain non-fatal.
- Feature ESLint on changed TS/TSX files: PASS; `git diff --check`: PASS.
- Manual browser viewport check: 1440px shows sidebar only; 768px and 390px
  show the five-item fixed bottom navigation only. All three widths have no
  horizontal overflow; mobile/tablet content padding clears the nav, and the
  mobile account menu opens.
- No API, DB, migration, Dataset V2, production deploy or database mutation
  was performed. Unrelated pre-existing Dataset V2 working changes were not
  staged.
