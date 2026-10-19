# VocabFlow design context

## Product
Vietnamese vocabulary learning for individual learners, including public guests.
The primary job is to begin or resume daily study with minimal friction.

## Visual direction
Preserve the established calm learning workspace and existing shell. Do not
introduce a new visual theme for guest access. Canonical references are
docs/design/design-system.md and docs/design/feature-ui-spec.md.

## Runtime ownership
apps/web/src/styles.css owns all runtime colors, typography, spacing, controls
and responsive rules. Reuse its semantic classes; this file adds no token values.
Shared owners: components/app-shell.tsx (navigation/account), components/toast
(transient feedback), components/async-states.tsx (resource states).

## Guest behavior
See docs/stories/US-58-guest-learning.md for business authority. One shared,
dismissible in-flow notice recommends registration; no blocking signup dialog.
Keep registration/login available after dismissal. Clearly distinguish device
storage from account synchronization and expose storage failures accessibly.

## Verification
Use component tests, guest persistence tests and browser E2E at desktop/mobile
widths, plus repository lint/typecheck/build. No new font or token adapter.

Guest collection pagination reuses existing button/card/search tokens and keeps
the shared collection layout. Its metadata/counts refer to the entire collection;
only list cards are paged. See UX-CONTRACT.md and the US-58 correction contract.
