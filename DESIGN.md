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

Catalog cards use a compact word-first hierarchy; full explanations and source
evidence belong to detail/review contexts. Main topic navigation uses published
canonical concepts and reviewed memberships. Native grade/CEFR filters preserve
study scope; focus and selected-topic states remain visually distinct (US-59).
Study cards offer `Tự nhớ`, `Dễ làm quen` and `Chi tiết`; keep the selected
Vietnamese hint level clear while preserving the shared flip control and
independent pronunciation audio (US-60).
Use component tests, guest persistence tests and browser E2E at desktop/mobile
widths, plus repository lint/typecheck/build. No new font or token adapter.

Guest collection pagination reuses existing button/card/search tokens and keeps
the shared collection layout. Its metadata/counts refer to the entire collection;
only list cards are paged. See UX-CONTRACT.md and the US-58 correction contract.
## Foundation08/09 local extension — 2026-10-30

Preserve the existing shell,tokens and study setup hierarchy. Local vocabulary
Mức học routes the two typed foundation levels to `/foundation/learn`;grade,
topic and search scopes cannot silently turn into a foundation scope. The same
`features/study/session-capacity.tsx` owner renders5/10/20/30 with the unit
“hoạt động” or “câu”. Native collection select and existing loading/error/empty
owners remain canonical. No new font,token values or image decoration.

Context precedes utterance reveal;letter listening delivery contains no answer
metadata. Pending names support unscored practice,sounds with no audio cannot
start,and only saved self-assessment advances to the next utterance. Explicit
retry preserves reviewId after uncertain/failed save. Desktop/mobile visual and
real playback verification remains pending while Local browser use is disabled;
component/API checks alone do not establish rendered correctness.


## Owner-published first words — US65, prepared 2026-10-30

Keep the existing native Mức học selectors and visual tokens. FIRST_WORDS
availability follows actual CEFR facet/tag evidence in both production and
local catalogs; it must not depend on DEV or show a Pilot local suffix on
published content. Unavailable letters/utterances stay disabled on Production
until their separate runtime exists. This changes availability, not typography,
layout or progression rules. UI/browser verification remains separately recorded.
