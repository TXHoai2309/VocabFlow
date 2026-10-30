# 08/09 — Thực thi local theo chỉ thị ngày 30/10/2026

Latest30/10/2026:owner listened and accepted all18existing clips. The forward
[listening acceptance](foundation-08-09-owner-listening-acceptance-r0001.json)
supersedes older pending-listening notes below. Dataset/runtime seed r0002and
gallery r0002are current. Local DB changed18target acceptance metadata rows,
preserving33other table fingerprints;6names now listeningReady and12utterance
audio accepted. No new media/IDs/text revisions. Six isolated sounds are still
missing;images remain intentionally0. Actual browser checks remain outstanding.

Status: IN PROGRESS, after READY FOR IMPLEMENTATION from the direct owner
request “vậy làm luôn cái đó đi”. This supersedes deferred execution and the
old contract-review-only gate for this bounded wave. One session; no workers.

## Outcome and scope

Use the reviewed08r0002/09r0001 drafts:6letters A/I/M/S/F/T,12letter activities
(name/sound separate) and12contextual utterances. Existing shell/design and
5/10/20/30session capacity are reused. No vocabulary identities/progress or
daily word goals change. This is24foundation targets,0new lexical senses,
24planned audio,0images. No public deployment or remote DB operation.

Frozen execution manifest:
`vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001/execution-manifest-r0001.json`,
SHA256 `4236cc7a50dc6f646ddba7d436dff58c1bfcaa71baf6692e793ed8cb54b7e1da`.
It allocates stable UUIDv7 foundation target/parent identities and fresh job IDs
once. Draft references and existing integer vocabulary IDs remain separate.
Original draft/worker artifacts are unchanged.

## Media capability result

Muse delivered2canary files (A-name/Hello) and16remaining name/utterance files.
All18downloaded, exact target/dependency/request mapping checked, decode PASS.
Exact ZIPs and source mapping retained; downloaded originals cleaned only after
durable byte verification. Provider reports avocado_v2:MAI_01,en-US,speed90;
actualModel remains null where the provider did not supply separate metadata.
No fabricated model evidence or listening acceptance.

Muse reports plain-text TTS without SSML/phoneme input. A-sound /æ/ canary is
UNSUPPORTED with no file. The other5isolated sounds are not submitted because
the required provider capability is absent. All6sound targets stay pending,
not replaced by letter names or spoken IPA and not eligible for listening
assessment. Preserve the source audio dependencies for later recordings.

## Concrete local boundary

Add separate foundation target,collection/membership,media,attempt,progress and
review records under the existing application schema through the trusted
migration executor. Keep existing tables and scheduler untouched. Seed only
the frozen foundation identities. Back up and compare protected fingerprints
before/after; use only the dedicated loopback Development container.

The Node local entry installs `/api/public/foundation/*` and authorized
`/api/learners/:learnerId/foundation/*`. No Worker/Production route is enabled.
Reuse Better Auth and the existing household ownership check. Public endpoints
never read learner progress. Failed authentication/ownership yields401/403.
State changes validate same-origin local requests and strict shared DTOs.

Authority issues opaque attempts/options/audio handles. Before a letter answer,
no correct target glyph/IPA/anchor/answer key is present in delivery metadata,
audio filename or accessibility labels. Teaching reveal invalidates assessed
attempts. Missing/unreviewed audio cannot start a scored listening attempt.
Utterances show context first; reveal and listening are not reviews. Only
deliberate self-recall writes progress; audio may be offered as local preview
while spoken-content acceptance remains pending.

Account reviews serialize target state, verify served pins/expectedRevision,
derive correctness, save review receipt and progress atomically. Identical
reviewId replay precedes stale checks; changed requests conflict. Guests use
the separate validated `vocabflow.foundation-guest.v1` namespace and Web Locks;
save before advancing, no automatic account transfer. Both reuse the existing
1/3/7/14/30scheduler with sparse NEW and due-before-new queues, exact scopes and
one progress owner per typed target across collections. No added daily quota.

## Acceptance

Verify source/media pins,24target IDs,18received files/6pending sounds, exact
scope/counts, distinct name/sound/utterance/vocabulary ownership, household
boundaries, idempotency/conflict/stale/save-failure behavior and no pre-answer
leaks. Check real local API and desktop/mobile rendering/playback. Update
tracker with actual evidence; do not mark08complete while6required sounds lack
audio or claim owner approval of new media from the old05/06acceptance.

## Verified implementation checkpoint

Trusted local migration/seed PASS:24targets,8collections,48memberships;28old
tables retain exact fingerprints. Pre-migration pg_dump4,379,007bytes has SHA256
`67f8471cee9d86ca79c16f629c9cbbe7194ffe75f08d22e44fea45c09dda30b8`.
It is a private local recovery backup,excluded from the media/source handoff.
The apply tool returns ALREADY_APPLIED_NO_WRITES on checkpoint replay.

189focused component/domain/account/lexical regressions PASS.32real PostgreSQL+
Hono checks PASS cover household ownership,typed progress,idempotency,reveal,
stale/content pins,scope and media boundaries;session identity is injected into
the test-only Hono seam,not an actual browser login. Disposable fixture rows
are removed,andall28preexisting fingerprints match. Build,API/web typechecks,
focused changed-source lint PASS. Impeccable detector returns0findings.

18audio decode+exact mapping PASS and unprompted cached-model ASR18/18matches.
Actual listening acceptance is still pending. Work browser permission became
disabled before new screens could be inspected;async user question is pending.
No390/1440rendering/playback acceptance claim from component tests. Current
screens/collections expose the pending states explicitly. Six additional sound
files remain unavailable. Preserve these limits when handing off08/09.

Selected common JSON:
`vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001/dataset-selected-r0001.json`.
It joins target identity/content/revisions/source dependencies to every exact
media job,receipt,path/hash and missing-state entry. It is private authoring
data and must not be served as the public pre-answer DTO. Review gallery:
`.vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001/review-gallery-r0001.html`.
Local routes:
`http://127.0.0.1:5173/foundation/learn?module=letters` and
`http://127.0.0.1:5173/foundation/learn?module=utterances`.
