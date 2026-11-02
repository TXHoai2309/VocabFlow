# US-71 — Nguồn và số câu Luyện tự do (ticket 02)

- Status: ACCEPTED
- Assignment: owner execution request 2026-11-01, all 21 tickets sequentially.
- Dependency: ticket 01 / US70 ACCEPTED; 117 focused tests, 5 browser flows,
  local PostgreSQL rollback rehearsal. No technical blocker remains.
- Authority: approved consolidated spec and ticket 02; no product re-interview.

## Scope / acceptance

Default learned source, 10 questions; explicit source selection: learned, one
enabled learning set, one learning level, or saved words. Optional level filter
intersects learned/saved/set sources. Choose 5/10/20/30; show actual eligible
number and never widen or repeat to fill. Empty learned source retains setup so
another source can be chosen. The five ticket criteria/common constraints apply.
Listening, mixed, typing, guests, resume/history are not accepted by this slice.

## Technical contract (before code)

Extend strict create request with count (default10), source (default learned),
cue=image and response=choice. Model cue and response separately to extend later.
Source union: learned/saved with optional cefr; set with positive setId and optional
cefr; level with required canonical CefrFilter including explicit Unclassified
and first-words tag. No arbitrary target list, client correctness, or fallback.
Server uses existing authorized vocabulary projection/media sanitizer; new
server-only factory scope predicates intersect learned progress, enabled set
membership, saved ownership and existing catalogCefrFilter before DTO conversion.
Set existence/enabled is checked server-side; invalid/retired set returns 400.
All options come from the same scope. Snapshot config, contentVersion and content
hash in private state. Exact creation replay requires the same config or 409.
Existing learner/session PK and CAS JSON state suffice; no additional migration.
Return source/config with the actual eligible/requested counts, preserving first
answers. Existing 401/403/no-store/same-origin protections apply to every route.

## UI / recovery

Use `/practice` setup and shared SessionCapacityControl (unit=câu), native source,
set and Mức học selects with visible labels and existing learningLevelLabel.
Learning-set options reuse the existing client; loading/error/retry independent
from empty eligibility. Explicit configuration change creates a new session ID.
Failed creation retry preserves exact ID/config; no alteration until resolved.
Choosing another scope after an honest empty result creates a fresh ID. The
session displays its saved source label and count. Same focused task styles,
keyboard, neutral media and shared errors as US70; no new visual tokens.

## Tests / evidence gate

API boundary: six-in-source/request-ten, fewer than four safe options, empty
intersection, saved-only, set-only, mismatched level, invalid/client-forged source,
same ID/different config, no learning writes. Browser: source/count controls,
empty learned → explicit alternative, saved and incompatible levels, persisted
config/readback. Extend local rollback rehearsal for actual SQL scopes. Run
focused tests, typecheck/lint/build/browser; ACCEPTED only after evidence.

## Evidence

Contract recorded READY FOR IMPLEMENTATION before code; implementation pending.

Gate passed and moved to IN PROGRESS after the contract and blocker evidence.

Acceptance: 27/27 scoped API/reader tests, 8/8 Chromium practice flows, root
typecheck/build and changed-source ESLint pass. Local PostgreSQL rollback
rehearsal validates saved-only, three-item set rejection without broadening,
empty saved/A1 intersection, invalid set, explicit Unclassified, config replay
conflict and unchanged learning snapshots. The browser covers six-item set /
request-ten, four saved / request-twenty and no-learned → explicit A1 source.
No new migration/cloud/data/media operation. Existing source readers retain
their original behavior unless the internal practiceSource option is supplied.
