# US-90 — Private video management/deletion and groupC (ticket21)

- Status: ACCEPTED
- Assignment: owner21sequential; blockers19/20 ACCEPTED, allother20done.

## Contract before code

Private management inventory by kind video/version/segment/translation/practice,
20page opaqueIDs+labels (no unanswered keys). Server preview resolves owned target
and exact related counts. Version removes that transcript, its translations,
reports, pinned practice sessions and bookmarks; segment removes selectedbookmark
range bookmarks+sameversion/exactrange translation/practice, retains source/position.
Translation removes that saved translation only; practice removes that session only;
video removes all owned linked data/library. Other owners/SRS/catalog/media/YouTube
source untouched. Client never supplies counts or ownership. Explicit app-owned
confirmation before mutation, cancel/Escape/focus trap/return, busy/uncertain exact
retry, result navigation/paging, accessible errors/mobile. No browserconfirm prompt.

Add0035 video_library.data_revision and minimal private deletion receipts with
scope/counts/blocked video/version/session/request IDs, NO subtitle text/drafts.
Receipts survive source removal for exact retry and tombstone anti-resurrection.
Every video POST uses X-Video-Revision (default0 for existingclients atinitialepoch),
checked against owned video BEFORE provider/state work. DB writefences selectowned
video atsameepoch FOR SHARE on inserts/updates. Atomic SQL deletion locks video and
sources FORUPDATE, rechecks expectedepoch, captures targets and writes receipt,
clears related rows, updates watchstate/revision retaining bookmark receipts for
stale replay, increments epoch for partialdelete/removes video for full. One SQL
CTE statement supports NeonHTTP/Postgres without changing DB foundation. New child
writes locksameparent so can't race deletion. Repeated action+scope returns receipt,
changed scope conflicts; receipt requires learnerauth and sameowner namespace even
if video is gone. Known deleted IDs never reused by delayed retries with newepoch.
New explicit sessions/sourceUUIDs can use retained source after fresh read.
Pending processing interrupted by deletion shown uncertain, never silentlyresends.

Client remembers serverepoch from video read, emits it on allvideoPOSTs. Namespace
and cross-tab invalidation after delete remount/cancel late private resources,
clear matching active checkpoints/drafts. Storage failure reported, deleted session
can't load draft because server404. Post-delete lateoldreads cannot restoreUI.
Missing/blocked YouTube retains original playererror and savedtext where available;
no audio replacement, extraction or newautomaticproviderprocessing.

Acceptance: browser preview/cancel/confirm/uncertainretry and reload allscopes,
keyboard/mobile/focus, cross-tab staleoldwrites/late GET/oldaccount; API401/403/404,
forged scope/CAS/receipt/epoch/races; actualSQLrollback allscopes, preserved other
owner and full learning/catalog/media snapshots, delayed provider can't resurrect.
Final rootlint/typecheck/test/build/fullChromium/UIaudit/localSQL and separate
actual YouTube playback; actualSupadata/DeepL alreadyverified withinfreequota.
No commit/push/deploy/cloudapply or deletion of existing realdata by agent.

READY FOR IMPLEMENTATION recorded before code. Gate passed before implementation; current status is ACCEPTED.


Acceptance: all143Chromium including originalYouTube actualplayback/130s seek, latest120files1417release tests,26API/schema, rootlint/typecheck/build/secret+map scan, SQL35rollback and strictUIaudit0 PASS. Browser confirms all5scopes, keyboard/focus/cancel/mobile, uncertain full-delete reload/replay, checkpoint failure/corruption, cross-tab stale/late reads, definitive409 recovery and saved bilingual text during embed failure. API delayednative response afterdelete cannot recreate captions; ownership/auth/changedreceipt validated. SQL checks7newtable runtimegrants, all scopes, deleted-ID tombstones atnew epoch while freshwrites succeed, otherparentdata and SRS/reviews/XP/catalog preserved. No production/data/cloud release operations.
