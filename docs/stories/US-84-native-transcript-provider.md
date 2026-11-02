# US-84 — Native transcript provider (ticket15)

- Status: ACCEPTED
- Assignment: owner all21 sequential; now securely configured keys in.env, no values logged.
- Blocker14/US83 ACCEPTED. Live read-only Supadata /v1/me confirms Free(100/mo), used0/max100; DeepL read-only0/1m and EN/VI stable checked for later16.

## Technical contract before code

Server-only Supadata key runtime binding; quota GET /v1/me requires Free plan and
remaining>=1, otherwise fail closed. Only canonical owned YouTube URL, lang=en,
mode=native,text=false. No ASR,auto,paid plan/recharge/fallback. Strict response
bounds, English language and timed cues normalized using existing subtitle parser,
immutable source marked supadata-native (not manual). Original visible player unchanged.
Provider terms/pricing reviewed: free100 cap, no recharge; source IP stays creator,
no shared publication/resale. Private learning only with permitted source rights.

Additive0031 source_kind on video_transcripts plus private native_transcript_runs:
one per owned video, stable request/version identity, revision CAS, persisted
processing BEFORE provider dispatch. Concurrent starts coalesce; completed cached;
ambiguous delivery never auto redispatches. Explicit poll only same server-held
provider job, boundedID, no client job/score/source trust. Async200/202 job
results normalized; full source is never used if partial206/empty/missing timing/
nonEnglish/oversize. Quota/unavailable/unknown/timeout states distinguish processing,
waiting,success,failed,uncertain and allow existing text/player/manual import.
Unauthorized401/cross household403/other samehousehold owner404 BEFORE provider calls.

GET private /native-transcript returns quota+status only. POST start{requestId}
claims once; POST /poll uses CAS and same job. Safe generic reason codes, no provider
raw error/credentials in responses. Failed processing does not alter SRS/reviews/XP/
learned/catalog/media. No migration cloud/durable apply. UI retains stable startID,
loads existing job on reopen, shows quota before start/pending/success/fallback.
Successful imported version updates canonical viewer, immutable history stays pinned.

## Acceptance

Actual Hono/service/domain with provider fetch only mocked at I/O; browser quota→
start→timed cues, replay/concurrent/errors/async/unknown quota/mismatch, private API,
realSQL rollback/no learning mutations. One real native fetch in verified free quota
via actual adapter and normalize/persist readback. Lint/typecheck/build/browser;
final full gates after group. No done from mock-only or partial transcript.

READY FOR IMPLEMENTATION gate recorded before code.

Gate passed. Status: IN PROGRESS (only active story).

Acceptance: actualSupadata native public-demo transcript36876UTF8bytes, Free100→99 credits; actualSQL0031 rollback stores/readbacks this live source/metadata, no duplicate call/other-parent404/unchanged SRS/review/XP/catalog.21 API/schema checks PASS.17 controlled browser scenarios pass (16 fullrun+1 corrected exact-string locator rerun), live player already verified. Quota-before-start/native-only/timed/lang/async/private/cas/replay/unavailable/manual fallback verified. Typecheck/ESLint/build+secret/map scans PASS. No paid call or migrationcloud. Final regression after remaining group.
