# US-78 — Game đúng nguồn, cue và chu kỳ (ticket09)

- Status: ACCEPTED
- Assignment: owner sequential execution2026-11-01; blockers03/US72 and08/US77 ACCEPTED.

## Contract before code

Extend game config already pinned by08 to learned/set/level/saved with optional
level intersection, and image/audio/mixed. Reuse read-only permitted content
reader, original media policy and source schema, no new table/migration/provider.
Server loads exactly that source at start; no implicit whole catalog fallback.
Snapshot includes learned status. First shuffle learned eligible words, then
unlearned eligible words from the SAME chosen source, then reshuffle that pool.
Single image/audio word cycles with fresh encounter IDs. No repeat within phase;
avoid boundary repeat when another eligible item exists. Mixed alternates cue,
requires both kinds in source and two targets; chooses only a matching remaining
target in current phase. If the phase cannot supply the next required cue,
pause/explain instead of repeating early or silently changing cue/source/order.
This resolves unbalanced media pools while respecting all approved constraints.

Technical skip excludes that failed target for the rest of the game; exhausting
valid media pauses with unchanged hearts/score, no endless automatic retry loop.
Pin/version/source retirement keeps the explicit stale-content recovery from08;
never regrade, silently swap a meaning, or charge a media error. Server and UI
retain separate feedback/first-result receipts. Replays do not resolve fish.
Audio uses existing pronunciation I/O hook with neutral controls and retry;
no vocabulary meaning/image fallback. Setup exposes exact source/cue and media
availability reasons; new settings create a new game, never merge old points.
Compatibility: old08 state defaults to learned phase/no excluded IDs.

## Acceptance / validation

All4 ticket/common criteria: web source scope and learned→new→cycle, audio/mixed
replay/technical media failure, empty and uneven cue phases, one-word continuity,
boundary no-repeat, no NEW progress promotion. API protects forged config/actions,
auth/ownership/idempotency and no main learning/reward writes. Local SQL source+
cue readback with unchanged snapshots, relevant lint/typecheck/tests/build/E2E.
No done before recorded evidence; docs/tracker/index/hash synchronized.

READY FOR IMPLEMENTATION recorded from approved ticket before code.

Gate passed; now IN PROGRESS.

Acceptance:7 Chromium flows,26 scoped API regressions, lint/typecheck/build and actual PostgreSQL rollback PASS. Source/cue/learned→NEW→cycles, boundary no-repeat, technical exhaustion and no learning promotion verified.
