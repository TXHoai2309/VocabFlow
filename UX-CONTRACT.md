# VocabFlow interaction ownership

Business authority: docs/product/product-spec.md, docs/architecture/technical-architecture.md,
docs/decisions.md and docs/stories/US-58-guest-learning.md. Guest access is an
explicit exception to the historical account-required entry and server-only
persistence baseline. Account authorization and writes retain that baseline.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | Native select | docs/design/feature-ui-spec.md | OS-owned source/filter selection; custom set picker uses existing dialog | Study source E2E and keyboard |
| Form | Existing auth/settings forms and contract schemas | docs/design/design-system.md | Account forms; guest settings share the same validation | Component tests |
| Scrollbar | apps/web/src/styles.css | docs/design/design-system.md | Existing document and picker scrolling | Browser inspection |
| Toast | components/toast | docs/design/design-system.md | Info, success, error | Toast component tests |
| CRUD | Existing page clients through learning-fetch | US-58; current authenticated APIs | Guest durable local writes; server account writes | Guest persistence and existing regression tests |

## Guest flow ledger

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

The premium audit covers production UI source folders. The untracked development
media editor and historical local release copies are outside the production app.
