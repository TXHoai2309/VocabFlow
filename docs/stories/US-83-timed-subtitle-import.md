# US-83 — Nhập phụ đề Anh có thời gian (ticket14)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01;13/US82 ACCEPTED.

## Contract before code

Extend private video service, same owner+learner authorization. POST
`/:videoId/transcripts` strict {versionId UUID,format srt|vtt,language en,text}.
UTF8 max512KiB, up to5000 cues, each nonempty bounded2000 chars, valid finite
start/end within24h, start<end, chronological nondecreasing starts. Reject
malformed/missing timing, non-English declaration, predominantly non-Latin
content, no English word content, unsafe malformed text. Language is user-
declared English with conservative script checks, not claimed automatic language
recognition. Strip supported subtitle markup/entities to inert text only; no
HTML injection. Preserve actual cue intervals/overlap, never invent word timing.
SRT/VTT parser pure domain module; VTT metadata/style/note handled explicitly.
Do not silently drop bad timed cues. Clear inline parse reason/line to fix file.

Private immutable video_transcripts table references owned video triple, UUID
version PK and raw source text/format/language/cues/hash/createdAt. New version
does not overwrite old, translations or history. Idempotent version ID requires
same source hash/format, conflicts changed content. GET list+selected latest,
GET version owned; no shared publication. Prepare0028 and inventory only.

UI native file picker + editable paste text, declaredEnglish/format/size labels,
save progress/error/preserve input/stable versionId on uncertainty. Default
English transcript view, hide all app subtitle text, bilingual option explains
Vietnamese unavailable without calling translation. Select saved version,
paged100 cue rows while highlight/current cue follows player time, original
source/version labels. Clicking cue seeks its actual start; no fake boundaries.
Playback speed uses only getAvailablePlaybackRates(), no invented choices.
Poll player currentTime only when ready, distinguish buffering and paused time.
Controller is canonical YoutubePlayerView, no duplicate player or overlays.
Opening saved video restores latest imported version; no requirement to answer.

## Evidence before done

Browser file import→highlight/seek/speed/hide→reopen, valid SRT/VTT, invalid
timing/language/size, failed save exact retry, missing Vietnamese and buffering.
API owner/private/version ID/hash replay/strict input; actual SQL rollback
immutable versions/readback/grants and unchanged main learning/catalog snapshots.
Lint/typecheck/tests/build/browser/mobile/premium static checks, synced evidence.
No provider/ASR/translation/flashcards/media generation.

READY FOR IMPLEMENTATION recorded before code.

Gate passed; now IN PROGRESS.

Acceptance:6 video Chromium flows,14 API/schema cases, lint/typecheck/build and actual local SQL0028 rollback PASS. Script-checked declared English, source cue timing, immutable old version and retry/privacy preserved. Fixed actual-SQL metadata projection, then full rehearsal PASS. Premium textarea static check corrected without visual change.
