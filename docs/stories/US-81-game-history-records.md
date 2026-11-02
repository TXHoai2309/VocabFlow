# US-81 — Lịch sử và kỷ lục game (ticket12)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01. Blocker11/US80 ACCEPTED.

## Contract before code

No new table/migration/provider. Existing fish_games state extends optional
finished receipt {actionId,at}, status ended, revision+1. POST `/:gameId/finish`
strict actionId only, household auth. Finishing an active/content-paused game
preserves hearts/points/results, hides unresolved fish, finalizes once. Lost
games already final; duplicate finish returns canonical state with no extra
write. Action ID colliding with an outcome receipt conflicts. Ended/lost games
refuse new resolutions; committed receipt replay never resurrects them.
Finish does not require currently usable media, so retired sources can close.
CAS serializes finish/resolution races. No review/progress/XP/streak changes.

Checkpoint optionally persists pending finish before POST; uncertain finalize
replays after retry/reload, never starts a replacement game. Pause remains in
progress and does not qualify for a record. Guest uses same pure finalize rules
under its own Web Lock/store and consistency validation (revision includes one
finish receipt), with no private write or account merge.

GET game base `?page=&recordsPage=` returns independently paged20 history items
and20 personal record groups plus totals. Group key is saved source including
level/set filter, cue and rulesVersion, not raw JSON field order. Only lost or
ended games qualify. Each group reports bestScore/bestGameId/finalizedGames;
never compares separate source/cue/rules as if equivalent. SQL queries bound
pages and aggregate groups rather than returning all private states.
GET `/:gameId/results?page=` returns20 resolved historical outcome snapshots,
summary and totalResolved. Never disclose current unanswered key; no freshness
gate on historical reads. Guest derives views locally with same projections.

UI `/game/history` lists source/cue/rules, score/catches/hearts/status; personal
records and resolved wrong/seen/skipped/technical details. Pagination/error/
loading/empty/focus/mobile included. Link from game; explicit finish button,
final summary and new-game action. Copy states score is game-only, not memory
or SRS achievement. No leaderboard, rewards or unapproved features.

## Acceptance / evidence required

All4 ticket/common criteria. Account+guest history/records/finalize web flows,
unfinished/paused exclusion, distinct groups, uncertain finalize/reload once,
post-final action rejection, resolved-only history after content retirement,
401/403 and forged fields, mobile/keyboard. Actual PostgreSQL rollback query+
finalize/readback and unchanged SRS/reviews/XP/catalog. GroupB scoped/browser
and root lint/typecheck/test/build gates; record actual failures honestly and
fix introduced regressions. No done before evidence and synchronized hashes.

READY FOR IMPLEMENTATION recorded before code.

Gate passed; now IN PROGRESS.

Acceptance:57/57 combined practice/game Chromium,12 game API cases,119 files/1399 root tests PASS. Root lint/typecheck/build, final scoped lint/typecheck/whitespace and secret/map scans PASS. Actual local SQL rollback validates history/results/pages, isolated record groups, finalize once including retired content, auth and unchanged SRS/reviews/XP/catalog. Desktop/mobile screenshots inspected. No persistent/cloud migration or provider.
