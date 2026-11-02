# US-87 — Điền từ theo đoạn video (ticket18)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01;17/US86 ACCEPTED.15/16 externally blocked; imported English path independent.

## Contract before code

Private `/api/learners/:learnerId/video-library/:videoId/practice-sessions` new
service composes existing library read/transcript for owner+household checks.
POST {sessionId,versionId,startMs,endMs}; GET id; POST id/actions. Immutable
source hash/version+segment+answer snapshot, separate video_practice_sessions
state/revision/createdAt with owned-video FK, additive0030 prepared only.
CAS and semantic receipt IDs from first write. No client grade or answer list.

Pure generation includes only cues fully within selected segment, valid English
speech content of at least3 tokens, excludes music/bracket-only/noise, overly
long cue. One unique source word per cue chosen deterministically by length/
position, preserves source spelling/form and entire remaining context; no AI,
synonyms or invented timestamps. Start response reports honest total;0 explains
no suitable cues and persists nothing. Public current has opaque questionId,
masked text and source start/end only, never full word/key; other unanswered
items aren't exposed. Returned source/rules pin remains stable on reload.

Actions answer(text),reveal,skip,technical-skip. Normalize NFKC/case/whitespace/
equivalent apostrophes, no fuzzy/plural/negation changes. Blank rejected. First
outcome only; reveal prior to submit permanently records revealed. Replay costs
nothing; technical errors separate. Summary correct/(correct+incorrect),null at0.
Feedback contains original text/answer after resolution; no translation call.
Freshness compares immutable transcript hash on GET/new action; receipt replay
before freshness. Existing version replacement never regrades old state.

Dedicated `/videos/:videoId/practice` page enters from selected segment with
query identity, displays original player and masked current cue. It does not
mount the full transcript/watch UI. Replay via canonical playback hook. Open
source/Xem hiểu button first saves reveal for unresolved current, only then
navigates; prior viewing before this session does not retroactively reveal all.
App text hidden until outcome; player/baked-in text may remain visible and this
limitation is stated. Saving locks further actions; error keeps text/stable
pending ID. Next follows saved feedback, final summary no understanding claim.
Same-device history/checkpoint extension comes20; private state already persists.

## Evidence before done

Browser130–170s excludes240s, masked preanswer, reveal-before-Xem hiểu, Unicode/
apostrophes/blank/first-result, media technical error, uncertain save replay,
real player reused. API401/403/404, forged grading/IDs, CAS race/replay/pins,
actualSQL rollback readback and unchanged SRS/rewards/catalog. Lint/typecheck/
tests/build/mobile/premium and synchronized story/tracker evidence.

READY FOR IMPLEMENTATION recorded before code.

Gate passed; now IN PROGRESS.

Acceptance:9 controlled video browser cases,17 API/schema cases, lint/typecheck/build/premium strict0 and actualSQL0030 rollback PASS. Segment-only/masked/source-form/normalization/first results/reveal/CAS/media error/no learning writes verified.
