# VocabFlow interaction ownership

Business authority: docs/product/product-spec.md, docs/architecture/technical-architecture.md,
docs/decisions.md and docs/stories/US-58-guest-learning.md. Guest access is an
explicit exception to the historical account-required entry and server-only
persistence baseline. Account authorization and writes retain that baseline.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select | docs/design/feature-ui-spec.md | OS-owned source/filter selection; custom set picker uses existing dialog | Study source E2E and keyboard |
| Learning-level discovery | Shared learning-level labels/predicates + native catalog selectors | US-63; docs/design/feature-ui-spec.md | Nine levels, unavailable introductory items, explicit Unclassified | Catalog/guest/API tests and mobile/desktop E2E |
| Form | Existing auth/settings forms and contract schemas | docs/design/design-system.md | Account forms; guest settings share the same validation | Component tests |
| Flashcard display mode | Learner settings service + shared Flashcard | US-60; docs/design/feature-ui-spec.md | Self Recall default, Easy Intro, Detailed; guest stores locally | Settings and study flow |
| Scrollbar | apps/web/src/styles.css | docs/design/design-system.md | Existing document and picker scrolling | Browser inspection |
| Toast | components/toast | docs/design/design-system.md | Info, success, error | Toast component tests |
| CRUD | Existing page clients through learning-fetch | US-58; current authenticated APIs | Guest durable local writes; server account writes | Guest persistence and existing regression tests |

## Guest flow ledger

- Catalog study filters: canonical topic ID, school grade and CEFR survive
  browse → setup → session in both modes. Empty intersections do not widen.
- Vocabulary prioritizes Mức học; school grade/topic live under Lọc bổ sung,
  opened for active supplementary constraints. The six named CEFR levels retain
  their identity into study. Unclassified means missing/blank CEFR, never All.
  The three introductory levels remain unavailable until reviewed content exists;
  selecting a learning level is not a proficiency assessment or progression lock.
- Parent topics include published descendants via reviewed memberships; unique
  words are counted once. Inferred evidence never becomes approval by renaming.
- Browse bookmarks use the current page's saved flag; no full saved-word
  content request is required to enable the control. Private flags are not
  stored in shared public metadata caches.

- No session: same shell/routes with one local learning identity; no account provisioning.
- Account session error: retry or explicitly continue as guest; never mutate account data.
- Registration suggestion: shared in-flow notice, dismiss for this browser tab's session.
  Registration/login remain reachable in the sidebar and mobile account menu.
- Durable save: scheduler result commits to localStorage under a cross-tab Web Lock
  before the card advances. Failed storage keeps the answer retryable and shows
  a persistent accessible notice. Cross-tab stale answers use existing reconciliation.
- Account entry: guest state remains separate and is not automatically uploaded.
- Guest reset: existing explicit progress-reset confirmation; retains preferences
  and saved words while clearing local progress and review history.
- Native selects keep platform-owned popup geometry, locale and keyboard behavior.
- Flashcard display choices belong to the learner; guests keep the same choice
  in their device-local settings. Each mode preserves the single flip target;
  pronunciation audio stays independent.

The premium audit covers production UI source folders. The untracked development
media editor and historical local release copies are outside the production app.

## Guest performance correction (owner request, 2026-10-19)

- Home “Từ mới” counts distinct unseen words in the current source; the daily
  hero uses the separate remaining allowance. Goal, limit and session amount
  retain their existing distinct meanings. Source: US-58 correction contract.
- Guest collection detail is a named paginated variant of CollectionDetailView:
  30 rows, URL page/query, cancelable debounced search and explicit previous/next
  actions. Collection totals and progress refer to the whole collection.
- Settings and local history work without content requests; resource errors
  remain inline. Public word detail loads only requested IDs.
## Foundation08/09 local learning

Session Capacity owner: `apps/web/src/features/study/session-capacity.tsx`,
options/types in `session-capacity-options.ts`;vocabulary and foundation compose
the same control,with explicit accessible amount/unit labels. Foundation
collection selection remains native;async resource states use async-states.tsx.
No additional modal/notification system,global visual token or daily quota.

Navigation preserves exact foundation collection/mode/capacity;unsupported
grade/CEFR/topic combinations are empty/unavailable. Public pre-answer delivery
contains context/neutral instructions and opaque options/attempt/audio handles,
never authoring answer keys. Reveal invalidates scored letter attempts. Saving
progress requires an explicit action;duplicate submits are locked,errors retain
the current item and the exact reviewId,stale state offers reload. Guest writes
use Web Locks and durable storage before success;account writes use server
transactions. Other lexical guest state,goals and schedules are unchanged.
