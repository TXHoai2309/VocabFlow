# US-51 — Global Search

- Status: IMPLEMENTED / READY FOR OWNER CHECK.
- Feature: #14.

## User story

As a learner, I want one global search entry point for words, topics and
learning sets, so I can find learning content without navigating through each
catalog.

## Contract

- Desktop AppShell provides a command-palette trigger and Ctrl+K / Cmd+K
  shortcut. Tablet/mobile uses the existing header and a full-screen search
  sheet. Active Study sessions hide global search.
- Search covers exactly enabled Vocabulary in the active learner's active
  assigned enabled Learning Sets, enabled Topics containing at least one such
  word, and all enabled Learning Sets as allowed by the existing browseable
  catalog semantics.
- Query text is trimmed, NFC-normalized, case-insensitive, 1–100 Unicode code
  points, strict against duplicate/unknown query parameters, and SQL
  parameterized. Default limit is five independently per entity; explicit
  limits are 1–10.
- Ranking is deterministic: exact, prefix, substring, then Vietnamese meaning
  for Vocabulary or description for Topics/Learning Sets; ties use canonical
  sort order when present, normalized title and ID.
- Empty query shows no network results and up to five recent query strings.
  Recent queries are localStorage-only under
  vocabflow.recentSearches.v1, case-insensitively deduplicated and clearable.
- Selecting a result records its query, closes the palette and performs
  client-side navigation: Vocabulary → /vocabulary/:id, Topic →
  /topics/:id, Learning Set → /learning-sets/:id.
- Loading, no-result and safe retryable error states are accessible. Arrow
  keys select across groups, Enter opens, Escape closes and focus returns to
  the trigger.
- The API reuses session authentication and canonical learner ownership
  authorization. The guard and one unified parameterized SQL read use two
  database round trips total; there is no N+1 query or write path.
- No database migration, search-history persistence or scheduler change.

## Acceptance evidence

- API tests cover authentication, learner ownership, query validation,
  parameterization, entity scope, ranking, result caps, deterministic ordering
  and read-only bounded query behavior.
- Web tests cover debounce, stale response cancellation, loading/empty/error,
  recent query normalization and clearing, keyboard selection, client-side
  result routes, AppShell navigation counts and Study focus-mode visibility.
- Validation: API tests 15/15; web and regression tests 221/221 across 16
  files; global typecheck, production build, feature ESLint and
  git diff --check pass. Browser checks at desktop, tablet and 320px/390px
  confirm grouped search/navigation, keyboard behavior, preserved 6/5 nav
  counts, one mobile account trigger and no horizontal overflow. No
  production deployment or database mutation occurred.
