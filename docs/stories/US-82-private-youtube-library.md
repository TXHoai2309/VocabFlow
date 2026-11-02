# US-82 — Thư viện YouTube riêng và player gốc (ticket13)

- Status: ACCEPTED
- Assignment: owner sequential2026-11-01; no technical blocker. GroupA/B01–12 ACCEPTED.

## Contract before code

Account-only `/videos` library and `/videos/:id`. Use existing authenticated
parent and active learner. API `/api/learners/:learnerId/video-library` additionally
scopes every query to session.user.id: household membership→learner authorization
AND row owner required; another parent/profile cannot read guessed IDs. Guest
gets login entry before processing/saving a link. No competing auth or role.

POST strict {videoId UUID,url bounded2048}; server parses one video URL with an
exact YouTube host whitelist, validated11-character video ID and supported watch/
youtu.be/shorts/embed path. Reject credentials, foreign host, playlists/channels,
duplicate video parameters and malformed IDs. Canonical stored link is fixed
https://www.youtube.com/watch?v=ID. Never fetch arbitrary submitted URL or send
app credentials to it. No oEmbed/metadata/transcript/translation service needed.
UI identifies source by its actual YouTube ID, not invented title/language data.

Repository list20/page, find owned ID/source, insert. Composite owner+learner+id
PK and unique owner+learner+YouTube ID keep retries and simultaneous duplicate
links canonical. Replaying created ID with changed source conflicts; duplicate
source resolves existing owned item. Add only private video_library table/FKs/
created time via prepared0027 migration and standard application inventory;
no durable/cloud migration, no shared vocabulary/media or learning/reward write.
GET base list+total; GET/:id owned detail. Auth401/foreign learner403/foreign
owned-source404, no-store, same-origin writes, bounded body and safe typed errors.

Visible original YouTube IFrame API player, native controls, no autoplay/hidden
audio/MP3/TTS or overlays. Official script and generated embed use validated ID,
origin and strict-origin-when-cross-origin referrer; minimum200×200 viewport,
responsive16:9. Lifetime cleanup destroys player on logout/account/video change.
Separate loading/ready/playing/paused/buffering/ended/error/autoplay-blocked state,
retry on script/player errors and clear source/embed messages (100/101/150/153).
Do not claim subtitle availability or synchronization. Link save works without
caption provider; video playback is the source voice only. Script/player objects
are the controlled E2E I/O boundary; attempt one public official-demo live player
check without API key/paid API and record any external restriction honestly.

## Official implementation references checked2026-11-01

- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/terms/required-minimum-functionality

IFrame reference specifies native control/state/error methods and minimum player
size. Required functionality specifies Referer identification and no overlays.
These are the implementation sources, not an authorization to call Data API or
extract captions. Available connectors contain no transcript/translation tool;
provider configuration key-name-only inspection found none in .env/.env.local/
local-development env/process.15/16 will verify allowance separately, after14.

## Evidence required before done

Browser add→library→open/reopen visible player, duplicate save/error/retry,
controlled playback/error/buffering, mobile/keyboard/logout/account isolation.
API URL/SSRF boundary, owner/private/profile auth, canonical idempotency, SQL
readback/constraints/permissions in local rollback and unchanged main-learning/
catalog snapshot. Relevant lint/typecheck/tests/build, real-player attempt noted.
No done based only on UI or provider mocks; docs/tracker/hash synchronized.

READY FOR IMPLEMENTATION recorded before code from approved ticket13 scope.

Gate passed; now IN PROGRESS.

Acceptance:4 controlled-player browser flows plus1 actual public official-demo live playback PASS; screenshots13 desktop/mobile/live inspected.12 API/schema cases, lint/typecheck/build and SQL0027 rollback PASS. Other parent cannot read owned video; duplicate source/id canonical; no SRS/rewards/catalog writes. Premium strict static audit0 findings; no provider transcript or durable migration.
