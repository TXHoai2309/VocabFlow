# US-86 — Đoạn lặp, bookmark và vị trí riêng (ticket17)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01;14/US83 ACCEPTED.15/16 externally blocked, independent imported path proceeds.

## Contract before code

Use same private ownership for video and transcript. Segment = selected immutable
version plus start/end within its source timing (positive finite ordered,24h cap).
Cue selectors or seconds inputs select real boundaries; no new media. Store
bookmarks and explicit saved playback position in separate video_watch_states
JSON/revision triple owner+learner+video; additive0029 prepared only. Auth/no-store/
strict action IDs, semantic receipts and atomic CAS upsert prevent duplicate
bookmarks/position writes. Position is self-reported viewing convenience only,
not watched/comprehension/reward credit. No main-learning state changes.

GET/:id/watch-state and POST actions bookmark {versionId,startMs,endMs,label},
position {positionMs}. Bookmark ID=actionId, pinned transcript; replay immutable.
Version ownership checked before new bookmark, old bookmarks read with source
version, never remap to latest. Pagination20 bookmarks UI. Save errors retain
pending operation and exact action ID, don't claim save. Position restored only
by explicit seek after player ready. No auto playback on opening a bookmark.

Canonical playback hook uses original visible player, confirms seek within
750ms before play (bounded5s wait), then checks actual currentTime at250ms polls.
At end, pause or repeat selected interval while playback is active; buffering/
pause do not advance a synthetic timer. Seek outside segment stops loop and
explains; media error/unready controller stops retry with no grade. Expose stop
loop, replay, bookmark and position buttons with loading/error/keyboard/mobile.
No claim word-level accuracy; report measured seek error in one real public
player sample before acceptance, not a universal device promise.

## Evidence required

Browser select→bookmark→reopen→seek/replay, original source/version, position,
buffer/pause/seek/error/retry, mobile. API auth/owner/range/idempotency/CAS, actual
SQL rollback readback/private/grants/no SRS/XP/catalog writes. Lint/typecheck/
build/tests/premium and controlled I/O plus one real seek measurement.

READY FOR IMPLEMENTATION recorded before code.

Gate passed; now IN PROGRESS.

Acceptance:7 controlled video flows +1 real public YouTube seek/replay PASS; requested130s, observed2:10.000 at confirmation, only this desktop sample.15 API/schema cases, lint/typecheck/build, premium strict0 and local SQL0029 rollback PASS. Bookmark/position/private/CAS/replay/no learning changes verified.
