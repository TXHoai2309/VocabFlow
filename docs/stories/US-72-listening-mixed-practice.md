# US-72 — Nghe và kết hợp (ticket 03)

- Status: ACCEPTED
- Assignment: owner request 2026-11-01; no workers or cloud migration.
- Dependency: US71/ticket02 ACCEPTED, 27 scoped tests + 8 browser flows + SQL
  source rehearsal pass. Approved ticket03 and consolidated spec are authority.

## Scope and contract before code

Extend cue=image|audio|mixed independently of responseMode=choice. Word-audio
only, use existing media authority; no sentence cue/TTS/meaning fallback.
Snapshot cueKind and permitted URL per question; do not deliver the other cue.
Generate four safe choices within selected source as before. Mixed chooses a
maximum alternating sequence starting image then audio, with distinct targets;
pick image-only/audio-only candidates before flexible candidates so media-rich
items do not consume the only viable next cue. At least two distinct questions
and both cue kinds; otherwise return insufficient-mixed-media without creating
a one-type session. Report actual maximum eligible sequence and requested cap.
Audio choice requires a user-initiated successful play before answering; replay
is unlimited, no result or penalty. Failed load/play blocks answer and provides
retry or technical skip. Use shared pronunciation audio lifecycle with neutral
identity and label. Never expose answer in audio accessibility metadata.

Results retain question cueKind; summary includes counts by actual cue. Existing
auth/CAS/idempotency/first-result/scope/SRS isolation apply unchanged. No new table
or migration. Image and audio technical outcomes remain distinct in feedback
copy, both excluded from accuracy. UI: native cue select in practice setup,
shared buttons/focus/media frame; fail and retry preserve selected cue/session.

## Acceptance / verification

All five ticket criteria and common constraints apply. Test real API flow and
browser audio I/O boundary: audio replay, mixed alternation without repeated
targets, unavailable one-kind/one-target source, failed play/retry/technical skip,
neutral labels and preserved saved cue/summary. Extend rollback SQL rehearsal,
typecheck/lint/build and focused regression. No acceptance without evidence.

## Evidence

READY FOR IMPLEMENTATION contract recorded before feature code.
Gate verified, moved to IN PROGRESS before implementation.

Acceptance: 29/29 scoped API/reader tests, 11/11 Chromium practice flows,
typecheck/build and changed-source ESLint PASS. SQL rollback rehearsal confirms
saved alternating cues and cue-specific summaries with unchanged learning data.
Browser audio is controlled at the Audio I/O object, including src assignment;
no live pronunciation/provider claim is made by that fixture. Media retry/replay,
technical skip, missing-audio rejection and complete mixed workflow pass.
