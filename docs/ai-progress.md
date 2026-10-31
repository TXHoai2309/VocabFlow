# Current Handoff Snapshot

## 2026-11-01 — US67 owner-authorized additive production expansion

Prepare 4,997 complete entries for additive production publication, retaining
all 1,547 existing words and progress. Hold three incomplete proposals. Deploy
exact namespace and additive guest/index compatibility before DB publication.
32 runtime/guest tests and 23 additive guard tests pass; typecheck/build pass.
Cloudinary upload and canonical DB release are in progress, not yet complete.
See `docs/stories/US-67-additive-owner-expansion-production.md`.


## 2026-10-31 — US66 Dev sync and old-data purge in progress

Owner now requests only the exact 1,547 Muse items, synchronization into Neon
Development, deletion of the remaining old Cloudinary assets including the 206
non-VocabFlow assets (latest correction), and deletion of old backups. The old
backup-retention policy is explicitly superseded. Keep accounts/settings and
retained-word history. Dev inventory is 7,311 words; all 900 retained source
identities match and no new-ID collision exists. Its three additive migrations
have applied without lexical changes. Explicit canonical Dev publication guard
and deployed-media checks pass (75 targeted tests); lint and typecheck pass.
Preview flag is configured for the next compatible build. No old cloud deletion
or Dev lexical replacement has run at this checkpoint. Production remains live.

## 2026-10-30 — US65 Production replacement completed

Production now serves exactly **1,547 words, 76 sets and 73 topics** from the
selected Muse packages. PR #10 / main `253e382f630eac32db7430af5cbc402c3944e30e`
passed Core CI, Trusted DB and Production Release. Atomic apply retained 900
IDs, added 647 and removed 6,411 retired rows. Protected account/settings/XP,
identity/migration history and retained-word history fingerprints match.
All 4,641 media bindings, levels and live authenticated UI verify; Home shows
1,539 new + 8 retained learned words, and First words shows 139 results.

Deleted all 9,168 backed-up, unreferenced old Cloudinary assets. Final provider
inventory confirms they are absent, all 4,640 new originals remain unchanged,
and all 8,722 shared Development plus 206 unrelated resources are intact.
Development Neon was not changed. Its later cutover and shared-media retirement
remain explicitly deferred. Backup originals and the restore-tested DB dump are
retained. The prepared checkpoints below are historical.

Common production data and operation ledger:
`.vocabflow-local/editorial-refresh-20261030/owner-production-r0001/dataset-production-complete-r0001.json`
and `handoff.current.json` in that directory. See US65 for the executed operator
proof and JSON driver configuration; no fabricated Master PASS is claimed.


## 2026-10-30 — US65 Production catalog is live; cloud retirement running

Owner-approved PR #10 is merged and deployed at main SHA253e382f630eac32db7430af5cbc402c3944e30e.
Matching Core CI, Trusted DB and Production Release all pass. Atomic content
cutover leaves exactly1,547selected words/76sets/73topics;900IDs and their
retained history are preserved,647IDs added,6,411old rows retired. All4,641
media bindings verify through live API;18original samples match SHA/length.
Authenticated browser confirms1,539new +8learned, visible images and139first
words. Accounts/settings/XP/protected identity fingerprints match. No test
reviews/settings writes and no Development Neon writes.9,168backed-up unused
old assets are being retired;8,722shared dev and206unrelated resources remain
protected. See US65 live checkpoint for detached-main proof and JSON-driver
operator correction; aborted attempts did not commit partial data.


## 2026-10-30 — US65 release authorized; CI repair and PR #10 in progress

Owner explicitly authorized commit/push, CI repair and completion of Production.
PR #10 publishes the separate owner catalog/runtime and operational safeguards.
Full lint/typecheck pass. Active catalog integrity passes with platform-neutral
LF source hashes; the progress empty-state test now waits for completed history.
Public owner-production responses disable HTTP caching across the atomic catalog
switch so a fresh index cannot be paired with a cached retired word/media record.
Trusted DB checks run only through GitHub against the new isolated empty test
project; no Production/Development data was copied into it. See ADR0003 for the
explicit retired authoring-test scope. Prior prepared checkpoint is historical;
live migration/deployment/content replacement and cloud retirement are pending.

## 2026-10-30 — US65 Production replacement prepared; live catalog unchanged

Owner explicitly requests Production first and Cloudinary retirement, Development
later. Uploaded all4,640selected media originals (3,009,529,461bytes) to a new
owner-publication namespace, with byte/MD5 checks and source SHA/receipt pins.
18live original GETs match exact source bytes. No fresh generation.

Real Production has7,311rows/4,537enabled. Source-record identity crosswalk keeps
900IDs (not local905), adds647and retires6,411. Catalog plan has exact1,547words,
73topics/76sets and complete HTTPS media. Production private7,437,657byte backup
restored28/28tables with deterministic UTC/C fingerprints. Exact PostgreSQL18
full rehearsal passes rollback, atomic apply, no-write idempotent rerun, public
index/levels, deployed Hono media middleware and actual account read/ownership
checks.8retained progress and8reviews remain;27progress/36reviews retire only
in rehearsal so far. Auth/settings/XP/protected data fingerprints match.

Cloudinary has8,722old assets shared by current Production/Development,206other
assets protected, and9,168unreferenced candidates. All9,168have verified local
original backups (241,783,727bytes). Earlier8,679shared count was corrected for
43malformed legacy raw-GIF URLs. No old cloud deletion has occurred.

New explicit owner-production runtime, additive0024publication/compatibility
view and exact published-media allowlist are prepared. Compatibility keeps V2
readable until content apply. FIRST_WORDS now works from real content in a
production build; guest backup/reconciliation uses a separate production catalog
identity. Fixed native Node ESM exports and existing tooling types; root typecheck,
build/scans, changed-source lint,962app tests and release/boundary suites pass.
Strict premium audit0findings. Full-repo test historical artifacts/pins and10
existing dev-staging/foundation lint errors still prevent a full CI-pass claim.
Browser preview is pending because Local browser use was disabled on attempt.

**Production DB/schema/content writes0; Development Neon writes0; old Cloudinary
deletes0; commits/push/deploy0.** New Cloudinary uploads are the only external
writes. Source remains uncommitted; AGENTS13/DEC018release boundary requires
explicit commit/push authorization and valid release gates. Prepared apply
refuses to write until matching READY main deployment and compatible runtime
header are live. Retirement additionally rechecks both DBs and asset versions.

[Detailed checkpoint](plans/editorial-refresh-2026-10-28/owner-production-replacement-2026-10-30.md). Operational/common JSON:
`.vocabflow-local/editorial-refresh-20261030/owner-production-r0001/prepared-handoff-r0001.json`.
This supersedes current priority US64 without changing its completed local data.
No campaign15or Production completion is claimed.

## 2026-10-30 — US64 owner-selected local catalog: 1,547 active entries

The owner explicitly selected the three Muse packages and retired all other
local vocabulary. Applied atomically after a full backup/restore rehearsal:
7,341 before = 905 retained IDs + 6,436 retired; 642 new local IDs yield 1,547.
Exactly 547 + 500 + 500 selected entries, 73 topics and 76 learning sets.
All have image/word/example audio: 4,641 bindings, 4,640 byte-pinned files.
One identical chair/sit example audio is intentionally shared.
Levels: FIRST_WORDS 139, A1 731, A2 544, B1 132, B2 1, C1/C2 0. No forced
CEFR/grade mapping. Owner-selected local review is separate from Master PASS;
WordNet attribution and reused text provenance remain in the common JSON.

Removed only lexical rows/related progress outside the keep set and replaced
lexical collections/memberships. Preserved protected account/settings/foundation
fingerprints and progress for retained IDs. Guest backup + cross-tab-locked
reconciliation keeps settings and retained progress. The browser now shows
1,544 new + 3 learned. A dashboard race with catalog reconciliation was fixed.
Migration0023 and Node-only pinned media use a separate owner-local authority;
production legacy/V2 routing remains independent. Apply rerun wrote nothing.

221 focused tests/15 files, API/web typecheck, changed TypeScript lint, syntax,
build and client secret/source-map checks PASS. Real API and account-service
checks cover all IDs/collections/level counts, 18 byte-exact media requests and
household denial without account writes. Guest browser collection→setup→5-word
study, image and word/sentence playback verified. Fixed the sentence audio's
zero-width grid track; 260px after fix, no horizontal overflow at small viewport.
No agent ratings. Root typecheck still fails in existing unrelated tooling;
no repository-wide test/lint PASS or all-file human-listening claim.

Common export/handoff: `vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001/current.json`.
Private backup/restore index: `.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001/backup.json`.
[Replacement report](plans/editorial-refresh-2026-10-28/owner-local-catalog-replacement-2026-10-30.md). Three original media roots and historical artifacts
remain intact. Small manifest ZIP references existing media; it excludes media
bytes, secrets and the private DB dump. Preview collection30 is superseded by
31/32/33; old10–13 review templates are superseded for the active local catalog,
not completed corpus reviews. Further generation remains paused; foundation
08/09's 18 accepted clips and 6 missing sounds remain unchanged. Campaign15
is not declared complete. No remote DB, provider jobs, commit, push or deploy.

Everything below is historical unless explicitly carried into this snapshot.

## 2026-10-30 — Ticket10-01 local preview, 51 existing A1/A2 senses

Owner reprioritized10: “oci làm 10 đi”. Continue only the frozen51-ID batch,
one session; further lexical/image/TTS generation stays paused. KEEP51; no
content,CEFR,ID or contentVersion edits. Native local collection30 contains
exactly51existing IDs,27A1/24A2; original CEFR collections remain intact.

20projection media fields now bind19existing PNG,20word MP3 and17exact sentence
MP3. Afternoon image withheld because it cannot distinguish the time of day;
3variant sentence clips remain withheld.31senses remain explicitly text-only.
No claim of complete media coverage or fresh owner/expert audio acceptance.
Separate Node-only pinned media route leaves the accepted FIRST_WORDS overlay,
85pilot assets,and08/09foundation data untouched. A shared exact sense/hash/
index/text fallback renders accident's keyless source example without editing
its frozen JSON. No UI redesign.

Backup and atomic apply verified36protected fingerprints; rerun returns
ALREADY_APPLIED_NO_WRITES. Real public/account-service checks pass,including
51/27/24/0collection/CEFR intersections and household denial. Browser guest
collection/setup/study checked; actual word+sentence playback decoded without
errors. No ratings submitted by agent; user session advanced independently.
Account browser login and all-file human listening were not performed.

151focused tests pass; API/web scoped typecheck,changed-file lint,build and
strict premium static audit pass. Root `pnpm typecheck` fails in existing
out-of-scope tooling scripts (backfill/pending/foundation verification); do not
report repository-wide typecheck PASS. Bounded10-01is ready for owner review
with explicit media gaps,not completion of all A1/A2or campaign15. See
[local continuation](plans/editorial-refresh-2026-10-28/ticket-10-01-local-preview-r0002.md).
Foundation08/09acceptance and pending6sounds remain unchanged; no new provider
job,remote DB access,commit,push or deployment.

## 2026-10-30 — Owner accepts all18 foundation audio clips

Direct owner statement:“tôi nghe ok rồi mà chưa có hình ảnh hả”. Recorded exact
18file/receipt acceptance in
`docs/plans/editorial-refresh-2026-10-28/foundation-08-09-owner-listening-acceptance-r0001.json`.
Forward dataset/runtime-seed r0002sets6name+12utterance clips OWNER_ACCEPTED;
18target acceptance metadata rows updated in dedicated local DB after backup.
All33other application tables,including foundation progress/reviews/attempts
and memberships,retain fingerprints. No audio bytes,IDs or spoken revisions
change. Real API confirms6names listeningReady and12utterance audio accepted.

Current dataset SHA `a30fd9e285227c28703a21b5e621489ed525c4586083d0c7bb0ab884a087e918`.
Current pointer `vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001/current.json`;
gallery `review-gallery-r0002.html`/`review-gallery.current.html` in media root.
Forward acceptance archive667,159bytes,10members verified,SHA
`cf96113fc3590827ecd638799cf49975201544eee7edf50fd5c97d535d48dda5`.
Old handoff/receipts remain historical and unchanged. Do not reopen listening
approval from earlier pending labels. No fresh independent expert review claimed.

Images remain intentionally0:08uses live text glyph pairs,09uses contextual
text. Owner asked about images but has not instructed image generation in this
message. Suggested optional09enhancement:4situation illustrations;not started.
Six sound audio files remain missing;browser rendering/playback checks remain
unperformed. Owner hearing approval does not automatically close full08/09.

## 2026-10-30 — Foundation08/09 resumed and implemented locally

Owner explicitly resumed both tickets,then requested continuation. One session,
no worker dispatch. Frozen UUIDv7 registry has6letter parents,12letter activities
and12utterances;0lexical additions,0images. Muse generated6letter-name+12utterance
MP3.18/18receipt bindings/hash/length/decode and unprompted cached-model ASR match.
Exact provider ZIPs retained;downloaded originals removed after verification.
Muse plain-text TTS does not support the required isolated phonemes:/æ/canary
UNSUPPORTED,no file;other5sound jobs not submitted. Six sound activities stay
pending and unassessable. No phoneme substitute,provider switch or extra spend.

Trusted additive0022migration applied only to dedicated Development PostgreSQL,
with fresh4,379,007-byte pg_dump backup/TOC before mutation.24targets,8collections,
48memberships seeded;all28preexisting table fingerprints and migration prefix
preserved,zero lexical progress/account changes. Re-running apply is a no-write
checkpoint replay. Backup lives separately from the media handoff because it
contains account data;no env/account rows/DB dump are copied into the media ZIP.

Node local entry alone installs foundation endpoints. Account Better Auth+
household authorization,transactional progress/receipts,strict DTOs,opaque
attempt/options/audio,and idempotent replay/stale/content/reveal checks. Public
queue never reads account progress. Guest foundation state uses separate
validated Web Locks storage and durable save-before-advance. Lexical state,
word quotas/goals and current scheduler remain unchanged. Session capacity
5/10/20/30 is a shared existing-study control with typed unit labels.

Local routes `/foundation/learn?module=letters` and `?module=utterances` are linked
from Mức học.12utterances have contextual reveal/audio/self-recall.6names have
unscored practice while new audio awaits listening acceptance. No new-media
owner acceptance inferred from05/06. Six absent sounds never enter active queue.

Validation:189focused component/domain/legacy regression tests PASS;32real local
PostgreSQL/Hono checks PASS using injected session identity and actual household
authorization with disposable fixtures cleaned;not a real browser login.
API+web typecheck,changed-source ESLint,build PASS. Impeccable mechanical detector
0findings. Build reports existing dynamic-import/chunk-size warnings. Actual
390/1440rendering and media playback verification remain PENDING:browser Work
permission now says Local browser use disabled;async question sent,await response.
Do not bypass through other automation or claim rendered UI from component tests.

Current contract/result location:
`docs/plans/editorial-refresh-2026-10-28/foundation-08-09-execution-2026-10-30.md`.
Dataset: `vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001/dataset-selected-r0001.json`.
08/09remain IN PROGRESS for missing sounds/listening/browser evidence;10-01review
preserved,05/06/07remain done. No remote DB,commit,push or deployment.

## 2026-10-30 — Owner closes media tickets05/06

Direct owner instruction: review is acceptable, approve it; Muse generation
source and usage/ownership rights are confirmed by the owner. Recorded final
acceptance in `docs/plans/editorial-refresh-2026-10-28/tickets-05-06-owner-acceptance-r0001.json`.
Both tickets and tracker are DONE, with no remaining05/06 acceptance gates.
Selected pilot remains25 images+30 word+30 sentence audio and5 intentional
image omissions. Rechecked all85 asset hashes/lengths and85 receipt hashes.
No new independent/full phonetic review or external legal verification claimed;
acceptance is based on the owner's explicit review and rights attestation.
Original source receipts, ASR and historical checkpoint JSON remain unchanged.
Old pending review/provider/rights labels are superseded for these exact assets;
do not ask for the same approval again. No DB/app/media changes or deployment.
Ticket10-01 remains the active batch; other tickets are not closed by this record.

## 2026-10-30 — Ticket10 first bounded existing A1/A2 review

Owner explicitly assigned the next ticket after stopping new vocabulary/media.
One-session instance10-01 freezes51existing runtime IDs/35headword groups,
27A1/24A2;alphabetic selection retains all sibling senses. Read all definitions,
bilingual examples and POS:51KEEP,zero text/CEFR/ID changes. Historical independent
content receipts match exact51hashes;no fresh independent or CEFR assessment claim.
Dedicated old Development Docker container restarted;read-only capture matches
all51live DB rows and real API responses.13protected table fingerprints unchanged.
Learning-index confirms all51existing CEFR memberships,no new collection.

All51API rows currently have empty media. Existing selected packages supply
17exact complete sense/example matches plus3same-sense simplified variants.
Offline JSON proposes20images+20word+17exact sentence recordings;three different
sentence clips withheld. Three variant image context limits recorded explicitly.
26deduplicated historical binding candidates have valid bytes but no new semantic/
phonetic acceptance. No provider,new media,DB write or app change. Pilot07 namespace
would wrongly tag these as FIRST_WORDS;do not use it to force integration.

Editorial/text checkpoint complete;instance remains IN PROGRESS for correct media
binding and learner runtime validation. Full10family and15campaign NOT complete.
Result: `docs/plans/editorial-refresh-2026-10-28/ticket-10-01-existing-a1-a2-review.md`.
Data handoff: `vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001/handoff-r0001.json`.
Subset backup168members/60,051,535bytes,all CRC/member hashes verified,SHA256
`e8f8a50954e128832592b8ef37581c6ef0c5a98e3344ac60cf60824b8f9b1297`.
Actual gallery remains offline comparison,not learner-runtime media acceptance.

## 2026-10-30 — Owner stops further vocabulary production

Direct owner request: stop creating vocabulary here and move to another task.
Completed offline production/packaging checkpoint is CLOSED/DONE. Do not create
new lexical/media jobs, call Muse, retry old omitted jobs or dispatch chats.
Verified frozen JSON pins for selected547+500+500 learning entries; not a claim
of1547new canonical records. Keep exports/backups/receipts and listening flags
unchanged. No DB import or app changes. Closure record:
`docs/plans/editorial-refresh-2026-10-28/vocabulary-production-checkpoint-closure-2026-10-30.json`.

Local tracker/index reflect closed production and owner-paused further authoring.
Original14template and full15campaign NOT marked done.08/09runtime remains
deferred. Recommended next:10,one existing A1/A2 batch about50senses, no new
words/provider jobs; recommendation only, no batch assigned/started yet.

## 2026-10-30 — BASIC-PLUS-500 complete selected dataset

Supersedes the historical in-progress snapshot below. All13 owner-approved
image ZIPs downloaded/hash-intaked;500 original PNG+1000MP3, zero missing base
jobs or duplicate asset hashes. Exact downloaded ZIPs cleaned after verified
copies. Full500-image screen across25sheets found1 readable-writing issue in
phrase; fresh correction job downloaded and full-resolution reviewed PASS.
Original image retained. Final selected media remains500PNG+1000MP3.

Selected export in `.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001/`:
`dataset-complete-r0003.json`,4,095,375bytes,SHA
`979623530945044b8bf832a78e93fd8186b374d1584b39fa2993501ad4b1cb9f`.
Active pointer `vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-plus-500-current.json`.
Source meanings/examples/source levels remain exact;500 existing local senses,
207A1/293A2,20curated topics×25, zero overlap with prior547+500 exports and
zero net new canonical records. Raw topic pins preserved; supplementary
memberships explicitly swap social movement/lifetime display placement.

All1000audio decode PASS; six low-level warnings. ASR sample36 has29 matches,
3 spelling variants,4 listening-review flags; no automatic rejection/recreation.
Gallery includes direct links to those4clips. This is technical+image self-review,
not all1000 spoken-content human review or owner acceptance. No DB/runtime/app
changes, imports, commits or deployment. Complete archive verified CRC plus
every member SHA/length:3,124 members,1,257,148,678bytes:
`handoff/basic-plus-500-complete-media-r0003-aa356cf2b3b83385.zip`,SHA
`497ec611655b7b31f927945c31ae5e0934ffab2b65eec14df07f51990f259b41`.
Active pointer links this result. No remaining production/packaging work.
Gallery500cards/500images/1000audio controls and25sheet hashes match selected
JSON; correction image included, original phrase excluded from selected view.
Opened gallery through Codex panel; tab title/URL confirmed in inventory.
CUA file-URL policy prevents DOM rendering inspection of this local page;
do not bypass it. Local HTML/media/index validation PASS. Owner review pending.

## Historical — Additional BASIC-PLUS-500 production snapshot, superseded above

Latest local receipt-backed count: **4 images+1000 audio =1004 jobs**. First4
images root-reviewed as appropriate watercolor/sense, not owner acceptance.
Decode checkpoint covers ALL1000 received audio PASS, six low-average-level warnings;
ASR sample36 has29 normalized matches,3 spelling variants and4 listening checks
(athlete/jewellery/can word clips, route example). No automatic regeneration.
ASR difference alone does not indicate incorrect speech. All1000 decoding is
technical verification, not all1000 spoken-content review or owner approval.
Muse reports complete500PNG; local has4 until new image ZIP links approved.
All10 audio ZIPs hash-intaked; exact download originals cleaned after verified copies.

Latest actual-media backup: `handoff/basic-plus-500-media1004-c777d0bf22ec024a.zip`,
45,033,408bytes/2,087 verified members,SHA
`5b3934acf8d64d4e2eb3d4200f84926b785ea87ba8db88b615097fd314c1021a`.
Readable500-entry topic-sorted CSV: `review-by-topic-r0001.csv` in data root.

OWNER APPROVED2026-10-30: new public48h sharing for exact13 files
`basic-plus-500-r0001-images40-01.zip` through13,500PNG,provider-reported
1,094.6MB summed (question used approximate1.11GB). Prepared file list and
screenshot saved in media root as `muse-sharing-proposal-r0001.json` and
`muse-images-sharing-proposal.png`. Direct owner reply approves all13 files.
Consent sent through Muse; proof and structured consent saved as
`muse-sharing-consent-proof.png`/`muse-sharing-consent-r0001.json`.
Receive links, intake13archives, inspect25 image sheets, correct forward if
needed, then freeze. No additional sharing confirmation within this same set.

Actual504-media backup verified1,058 members/34,052,849 bytes:
`handoff/basic-plus-500-media504-3a17857ea3ef96c0.zip`,SHA
`03356a271fe0649852b423aa8d80b89bf7ab978ec42734618091ecb861977c68`.
Audio06/07/08/09/10 subsequently intaked with archive/asset hashes verified and exact
downloaded ZIPs cleaned. Full source ZIPs remain under provider-bundles.

Offline finalizer prepared as `scripts/editorial-basic-plus500-finalize-v1.py`.
It requires1500 receipts/assets and1000 matching successful decode results,
preserves raw content pins and attaches curated display memberships separately.
Not run yet because media is incomplete; no completed export claim.

Preserved text/source/contracts backup29members /1,662,014bytes:
`handoff/basic-plus-500-text-efcb70b54461ddc5.zip`,SHA
`6e9eab69c0ada4c5d50258625c81386d938fcee83534b9542838df7db9707406`.
Actual first104 media checkpoint239members /22,317,981bytes:
`handoff/basic-plus-500-first104-37de74052e54f54b.zip`,SHA
`2293a39bb013cb4deee1e1903d05f7efb5807da4fe4b3a79640f8b7ecba37126`.
Paths are under `.vocabflow-local/editorial-refresh-20261029/`.

Selection review and `collection-memberships-r0001.json` record a display-topic swap: movement
is the social-movement sense, so show under community-life; life is a lifetime,
so show under health-body. Preserve exact source text/hash/media bindings and
record supplementary collection placement explicitly rather than rewriting a
source sense as bodily motion. Gallery uses the supplementary display membership;
all20 groups retain25 entries. Frozen topic/hash/media pins unchanged.

Owner asks another500. Same chat, no subagents. Curated500 headwords in20groups
of25, zero normalized overlap with prior547+500 exports. All500 reference exact
existing local senses and reuse exact Vietnamese/English definitions and first
bilingual example; **0 net new canonical records**. Explained this distinction
in commentary. Explicit homograph selection map, historical source PASS pinned;
preserved A1 207/A2 293, no grade inference. Previous selected export untouched.

Data root `vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-plus-500-r0001/`;
media root `.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001/`.
Frozen dataset SHA `6f8ca8736cdfcbd1f2555c48c9dbbed1556c4350b4ee32b53597de7ff2072d04`.
15,017 source/identity/media-binding checks PASS. Uploaded request JSON and
sent full1,500-job request through logged-in Muse UI:500PNG+1,000MP3. Actual
local received count at submission0. Requests first4 image private pilot,
10privateaudio ZIPs and13preparedimage ZIPs. **No public sharing approved for
this new collection**; old BASIC-500 approval only covered its named13ZIPs.
Wait for actual file names/sizes before asking new permission, continue useful
audio/private pilot intake while images are generated. No DB/runtime changes.

Use `editorial-basic-plus500-media-v1.py` to intake/assemble, plus review and
validation scripts with same prefix. Do not invoke old campaign CLIs against
new files. See plans/editorial-refresh-2026-10-28/basic-plus-500-production.md.

## 2026-10-29 — BASIC-500 complete selected offline export

Complete portable package verified3,121 members /1,051,810,241bytes:
`handoff/basic-500-complete-media-r0003-c59b6628499bc410.zip` under the new local
campaign. SHA `fda302dfd0d36701559ea8e87c392a51353718ed9407fdfa0df92218303dca36`.
Contains built text/export and actual assets/receipts/QA/tooling, excludes
duplicate run outputs and separately preserved provider ZIP copies. Gallery
validation500cards/500images/1,000audio/zero missing placeholders PASS; final
gallery SHA `1dd026a0609fc08f5265c2283d7d880f0367616eab4b5fd3dbe02a47255733d2`.
No basic-500 ZIPs remain in Downloads after verified cleanup. Active pointer
also names the complete package. Owner acceptance/canonical DB import remain
pending. Do not resume obsolete download-generation actions from earlier notes.

Created media-complete `dataset-complete-r0003.json` in
`.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/`, SHA
`85c8d508270b8c9d857962e97efbd76de89be4c4cd26ec2d43dbc5458e174c9b`.
500 entries/20 topics,500 selected images+1,000audio; all1,500 selected
asset+receipt hashes and identity/text bindings verified. Selected1,499 unique
asset hashes because two exact same examples share audio bytes intentionally.

All six corrections downloaded via three small private ZIPs, hash-verified and
visually inspected by root: comb/melon/shrimp/shoe/month/cool now address the
recorded concept errors. Original assets untouched, no text/audio modifications.
`image-corrections-r0001/visual-review-r0001.json` records the review; month has
a decorative mascot but calendar concept remains clear. Gallery rebuilt from
selected r0003, active pointer updated. All500 original images decode1600x1600;
six replacements also decode1600x1600. All1,000 audio decode; ASR sample and
eight audibility warnings remain explicitly owner-review items, not hidden.

**No owner acceptance or canonical import inferred.** Reconciliation remains:
405 proposed existing-sense references,95 pending candidates; A1/A2 proposals
preserve source CEFR. User can inspect complete gallery now. No more generation
needed unless review identifies a specific correction.

## 2026-10-29 — BASIC-500 full media intake; six image corrections

Owner approved all13 public48-hour image ZIP links. Downloaded/intaked all13
large ZIPs with exact mapping/source/asset checks, removing only exact original
Downloads ZIPs after verified archive and asset copies. After an initial429,
09–11 succeeded on a later authorized request. Local counts now **500 images,
500 word audio,500 example audio =1,500 job bindings**, no missing jobs.

Root screened all500 images across25 contact sheets. Number counts0–10,
ordinal positions, color swatches and weekday highlights match. Six semantic
corrections requested with new UUID jobs: comb (brush), melon (watermelon),
shrimp (large claws), shoe (open anatomically implausible sneaker), month
(annual seasonal wheel), cool (cold/snow/blanket). Original images retained;
text and1,000 audio unchanged. Muse acknowledged exactly6 replacement PNGs,
3 private downloadable ZIPs of2, no new public-link permission. Source/request
and findings are in basic media root `image-corrections-r0001/` and
`visual-review-r0001.json`. Do not mark the corrections accepted before actual
download and root review.

New offline finalizer `scripts/editorial-basic500-finalize-v1.py` requires all
original1,500 receipts plus6 corrected receipts and a correction review record,
then freezes `dataset-complete-r0003.json`. It does not authorize DB/runtime
import or infer owner acceptance. Review builder accepts `--source` for the
selected complete export. Text validation17,140 checks still PASS. Audio
decode1,000PASS and ASR36-sample limitations from prior checkpoint still apply.

## 2026-10-29 — BASIC-500 authored and submitted to Muse

Owner subsequently approves all13 prepared images40 ZIPs for public48-hour
links. Confirmation sent to Muse; matching file-specific Allow prompts are
authorized, no repeated owner confirmation required. Evidence is
`owner-public-links-authorization-r0001.json` in the media root. Resume creating
links/downloading/intaking and reviewing500 images; previous pending-approval
paragraphs below describe the earlier checkpoint only.

Latest: **1,000 audio+32 images locally received**,1,032 exact job/source/asset
bindings verified. All1,000 audio decode PASS; eight low-average-level warnings.
36-clip offline ASR risk sample:30 normalized matches, six differences requiring
listening (not automatic regeneration). Review gallery and two image contact
sheets generated; root visually reviewed the32 received images as a sample,
not all500. Melon uses a watermelon rendering; generic meaning permits it, but
distinct melon imagery would be clearer beside the separate watermelon entry.

Provider reports all500 images ready. Prepared13 larger ZIPs (40x12+20),
`basic-500-r0002-images40-01.zip` through `...-13.zip`,42.6–86.2MB each,
957MB total. Original tiny ZIP02 timed out twice,03 once; no local files for
those failed attempts. Awaiting owner's async answer for public48-hour links
covering this exact13-ZIP set. **Do not click Allow/send sharing authorization
until the actual answer arrives.** Independent local authoring/audio/review
work can continue; no new images/audio should be regenerated for repackaging.

Current gallery:
`.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/review-gallery.current.html`.
Text/source backup31 members,7.55MB at
`.vocabflow-local/editorial-refresh-20261029/handoff/basic-500-text-b996406e15fd33d0.zip`;
SHA `dbf9deb282845afbcb705c18f6ab9414659e77c706750bd01c68f96187eba7a0`.
It has no actual new media; protect actual received audio/images separately.

Protected actual1,032 media jobs in
`handoff/basic-500-media1032-checkpoint-bbbaf3e607fafcba.zip` under the new local
campaign:160,485,335bytes /2,151 verified members, SHA
`17282415ae9a6fb6d7e403eb8efc7ffaeb82fed54c5c9b057c0bf9add7902788`.
Audio has999 unique byte hashes for1,000 job bindings: chair/sit intentionally
share the identical example text, explicitly reviewed as legitimate. Canonical
IDs/progress remain separate. Active dataset pointer is
`vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-500-current.json`.

Owner requests another 500 basic entries, same chat. Active text is
`vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-500-r0002/`:
500 entries/500 bilingual examples, 20 topics x25, zero normalized form
overlap with the preceding547 export. 405 reviewed existing-runtime sense
references, 82 missing runtime forms, 13 missing chosen senses. These are
500 curated entries, not500 proven new canonical words. Of95 pending
candidates,13 already have same-form editorial-queue occurrences. Proposed
A1 393/A2 107; retain original source CEFR separately, no DB reclassification.

17,140 offline binding/source checks PASS; reused ZIP security tests8/8 PASS.
Frozen text SHA `43d559f7ed983a5258585f04fc0f6ef28f5538c6dbc31eda874f642feaab6077`.
No r0001 media was submitted; pre-production r0002 tightens five sense/example
bindings with fresh media job IDs, retaining the initial snapshot.

Submitted `muse-basic-500-request-r0002.json` via logged-in UI to the existing
Muse thread: 500 PNG +1000 MP3 exact jobs. Submission evidence/screenshot and
separate work orders live under
`.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/`.
Muse visibly preparing folders; actual downloads at this checkpoint **0**.
Preflight six audio jobs (person/walk/read) before bulk TTS; if backend still
fails, continue images and stop repeated failing audio calls. Do not retry the
old excluded three items. No blanket public-sharing permission for new ZIPs.

Resume with `scripts/editorial-basic500-media-v1.py` (not old550 assembler).
Source ZIP goes to hashed provider-bundles, exact UUID job receipts and hashed
asset paths; cleanup only after verified copies. Intake totals derive from
actual source/jobs. No runtime/UI changes or DB import.
See `plans/editorial-refresh-2026-10-28/basic-500-production.md`.

## 2026-10-29 — Owner omits three missing-TTS items; current export is547

Owner allows removing the three items without word TTS. Created
`dataset-547-r0004.json` and `review-gallery-547-r0004.html` under the expansion
production root. Selected547 items in33 topics, each with one image, wordaudio
and exampleaudio:1641 distinct output hashes, all receipt/text bindings
verified. Omitted eyelash/muffin tin/wake up only from this export; original
550-item drafts/media remain intact. All retained item payloads unchanged.
No more retry of these three jobs is required for this selected export.
Previous sampled owner acceptance is pinned. Canonical reconciliation/full
speech review remain unfinished; no database writes or import performed.
Current source of truth: `selection-547-r0004.result.json`, dataset SHA
`153f5dfed457145e1c8c9febffb22a0cf0b33e5c8ad01a743f144baf47e9fdfb`.

## 2026-10-29 — Owner accepts sampled r0003 content, images and listening

Owner stated “tôi nghe thử nội dung và ảng ok r” while viewing the r0003
gallery. Saved `owner-sampled-acceptance-r0003.json`, pinned to dataset SHA
`4ac63bafa658ad2a79d165cf7fa24096b10c57b45d1b1723355766ded14068ab`.
The sampled subset is unspecified; this is not evidence of individually
listening to all recordings or a completed independent semantic audit.
Three word recordings remain absent: eyelash, muffin tin, wake up.
No import, promotion or mutation of the pinned dataset follows from this
preview acceptance. Continue from the current r0003 production checkpoint.

## 2026-10-29 — r0003 joins13 corrected images; only three audio outputs absent

Downloaded the four small correction ZIPs, verified13 new job/content hashes,
visually self-reviewed and joined them without mutating original assets.
Current550-item JSON selects550 images,547 wordaudio,550 exampleaudio:1647
distinct hashes with exact receipt/text bindings verified. Six definition
sense corrections preserved in forward amendment. Missing eyelash/muffin tin/
wake up wordaudio after same-voice backend retry failure. Full speech/semantic
review remains unfinished (ASR interrupted at247); no canonical/database import.
Current gallery `review-gallery-r0003.html` and result
`checkpoint-r0003.result.json` are under the expansion production root.
Base media checkpoint plus correction delta archived/verified. See
[production status](plans/editorial-refresh-2026-10-28/expansion-550-production.md).

## 2026-10-29 — 1,647 original media jobs verified; editorial corrections in progress

All550 original images,547 wordaudio and550 exampleaudio downloaded and
hash-bound. All1097 audio decode; one low-level warning. Missing only original
wordaudio eyelash/muffin tin/wake up; Muse's same-voice retry still fails with
empty/truncated backend output. Screened550 images at contact-sheet scale,
flagged13; corrected six editor-selected dictionary sense errors in a new
snapshot without mutating pinned originals or changing audio text. Sent13
replacement image briefs with new jobIDs; Muse acknowledged production.
ASR screening interrupted at247, incomplete. No canonical promotion/import.
See [current production](plans/editorial-refresh-2026-10-28/expansion-550-production.md).

## 2026-10-29 — First 54 expansion media files archived; remaining jobs sent

Downloaded 4 images and 50 audio files; exact intake bindings/hashes verified,
source downloads cleaned after verified copying. Four images visually
self-reviewed. All audio decodes; unprompted offline ASR matches 46/50 and
flags four differences, without automatic rejection or acceptance. JSON binds
54 actual outputs; no canonical imports. Submitted all remaining 1,596 media
jobs to Muse and observed image generation. Media checkpoint ZIP and local
review gallery are recorded in the [production status](plans/editorial-refresh-2026-10-28/expansion-550-production.md).

## 2026-10-29 — Owner reprioritizes 550-word expansion; Muse access restored

One chat owns vocabulary authoring and media production. 08/09 runtime work
is deferred by owner direction. Authored 550 lexical candidates, 33 topics,
550 bilingual examples; classification is an editorial estimate. Prepared
1,650 exact media jobs. Muse browser connection now works: uploaded and sent
images-0001 (4 jobs) plus audio-0001 (50 jobs); provider processing observed.
No expansion media downloaded/verified yet; no canonical imports or runtime
changes. See [production status](plans/editorial-refresh-2026-10-28/expansion-550-production.md).

## 2026-10-29 — Existing setup quantity retained for08/09

Owner rejected duplicating quantity controls. Updated the foundation contract
to reuse existing setup session capacity; withdrew proposed10+10daily quotas.
Capacity is not a daily allowance. Vocabulary limits/goals remain unchanged;
no runtime/DB/media work follows from this documentation correction.


## 2026-10-29 — 08/09 offline review passes; local implementation contract ready

Received08r0002and09compat-r0001. Verified44artifact hashes/lengths and71input
pins; reran08core231checks/70negative cases and09canaries28PASS. C08-01resolved
in offline pre-answer projection.09adapter still pins historical08r0001;
coordinator forward mapping now pins08r0002,24targets,111bridge checksPASS,
unchanged audio target dependencies. No canonical IDs/runtime/DB/media changes.
Prepared concrete next local implementation contract: typed target/progress,
separate guest persistence, proposed10/10New limits,24audio/0image and capability
canary, parallel file ownership. READY FOR CONTRACT REVIEW; full08/09notDONE.
See [review/contract](plans/editorial-refresh-2026-10-28/parallel-08-09-review-r0002/implementation-contract.md).


## 2026-10-29 — Coordinator reviews both08/09worker handoffs

Verified27artifact byte hashes/lengths and12input pins; reran08validator120PASS,
09validator14PASS/12negativecases rejected. Found C08-01: all12letter activity
instructions disclose the answer before a listening-choice response.08requires
revision2with neutral instructions/post-answer teaching and leakage checks.
09's12EN/VI/context pairs have no blocking wording issue identified in this
review. Shared target/progress proposal and separate follow-up prompts prepared;
workers not yet dispatched for follow-up. No runtime/DB/media changes or new
lexical Senses. Both full tickets remain in-progress. See
[coordinator review](plans/editorial-refresh-2026-10-28/parallel-08-09-review-r0001/review.md).


## 2026-10-29 — Two manual worker chats prepared

Owner chose this chat as coordinator and will open two chats/paste prompts.
Prepared separate08letter/sound and09utterance contract/offline-draft briefs,
shared pinned coordination JSON, exclusive output roots and handoff contract.
Workers are NOT yet dispatched; no runtime/DB/provider work started. Shared
registry/app integration and Muse UI lease remain coordinator-owned. Read
[parallel setup](plans/editorial-refresh-2026-10-28/parallel-08-09-r0001/coordination.json).


## 2026-10-29 — Owner listening clears five isolated audio holds

After hearing the exact duck/blue/white/pen/pencil files, owner confirmed they
match. Saved exact-file acceptance; enabled the same five clips in local pilot
r0002. Current counts25images/30wordaudio/30exampleaudio; no regeneration or
progress writes. Original draft, source receipts, ASR output and r0001 plan
remain immutable.11real local checksPASS,85asset hashes/MIMEsPASS and amendment
idempotencePASS.07 remains owner-accepted/DONE;08 not started.


## 2026-10-29 — Owner accepts ticket07 local pilot

Owner explicitly stated “ticker 07 tôi duyệt”. Ticket07 is DONE for the
verified local pilot; its dependency for08 is satisfied. Saved acceptance
bound to the prior result and exact integration/verification pins. Five
isolated word recordings remain withheld. No DB/media/runtime change or
production release follows from this acceptance.08 remains planned, with
its separate letter/name/sound item model still to be reviewed when assigned.
See [acceptance](plans/editorial-refresh-2026-10-28/ticket-07-owner-acceptance.json).


## 2026-10-29 — Ticket07 local pilot verified

Owner requested the next step after gallery acceptance. Applied a reversible
30-Sense development presentation and four local sets (8/8/8/6), preserving
runtime IDs, original content columns, account progress and migration history.
Local FIRST_WORDS filter now reaches setup/study with exact child examples;
25images/25wordaudio/30exampleaudio are served by a hash allowlist. Five isolated
recordings remain withheld. 241focused tests/build/API+web typecheck/scoped lint
PASS; repository lint/typecheck retain preexisting script errors. Real DB/API
checks11PASS; browser390/1440, flip/image/audio verified.07 remains in-progress
for final05/06/canonical public gates;08–15 not started. See
[07 evidence](plans/editorial-refresh-2026-10-28/ticket-07-local-pilot.md).


## 2026-10-29 — Owner accepts pilot media gallery

Owner directly stated “tôi thấy ok rồi đó” for galleryr0002. Saved exact
approval with gallery/snapshot hashes;60audio/25selectedimages/5OMIT accepted
at gallery-review scope. No repeat gallery approval needed. Technical
listening uncertainties and provider/receipt gates retained honestly;
no new license or runtime/DB activation inferred.


## 2026-10-29 — 05/06 all real outputs downloaded; acceptance pending

Browser access restored. DownloadedMusebatch3/4/5/6, includingcorrectedcow/orange.
Saved60audio+25selectedimages,5OMIT; oldimageattempts preserved. Updatedgallery
review-gallery-r0002.html andcoordinator-snapshot-r0002.json. Cleanedall6ZIP
sessiondownloadcopies afterhashverification. 23focusedtestsPASS. All30example
ASRmatch;5isolatedwordsstillneedlistening. NoDBactivation. Finalreview/rights/
executionamendmentacceptance pending;05/06notmarkedDONE. See
`docs/plans/editorial-refresh-2026-10-28/tickets-05-06-media-handoff.md`.


## 2026-10-29 — Tickets05/06 real media production checkpoint

Owner authorized real TTS in logged-in Muse, image generation and downloads;
then requested batch Muse generation and cleanup of verified download copies.
05/06 are in-progress, not complete. No DB import/activation or Production operation.

- Frozen04 draft unchanged. Production work orders and single run are under
  `.vocabflow-local/editorial-refresh-20261028/media-production-r0001/`.
-60 real MP3 files downloaded:30 word +30 exact example sentences. All60 receipt
  bindings and decodes pass; independent offline unprompted ASR matches55/60,
  including30/30 sentences. duck/blue/white/pen/pencil isolated words require
  listening; ASR mismatch is not proof that audio is wrong. No human listening claimed.
-12 images saved:4 built-in(dog,bird,fish,duck),8 Muse(cow,horse,rabbit,sheep,
  red,blue,green,yellow). Built-in4 independently visually reviewed by root;
  independent Muse review7PASS and cowCHANGES_REQUIRED (anatomy).5 relationship
  images OMIT.13 remaining image slots lack local output. Muse has generated
  additional batches3/4, batch5 submitted; actual downloads still required.
- Preserved originals and source ZIPs, exact mapping and per-job receipts.
  Removed only3 session MP3 downloads and2 session ZIP downloads after hashes
  verified at durable destinations; no unrelated Download files removed.
- Known provenance correction: original image order config names built-in provider;
  actual Muse receipts honestly identify Muse, but original planning hash is not
  exact Muse execution hash. Forward amendment required; originals remain sealed.
- Muse voice avocado_v2:MAI_01/Aria/en-US/speed90 is provider-reported, not
  independently proven. Muse SupplementalTerms read logged-in (updated8Sep2026)
  and MetaAI Terms read (effective13May2026); generic ownership/responsibility
  provisions do not establish per-voice commercial clearance. Rights pending.
- Local review-gallery.html and coordinator-snapshot-r0001.json preserve30-item
  mapping/status. QA10tests and archive13tests passed. No media is runtime eligible.
- Current blocker: CUA reports Local browser use disabled in Work settings, even
  after owner says enabled. Do not bypass this setting via another automation
  interface. Resume exact same Muse thread when capability is restored; do not
  regenerate completed audio. Need downloadbatches3/4/5, makebaby, repaircow/orange,
  finalize execution amendment, visual/listening/rights review and portable handoff.


## 2026-10-29 — Ticket04 complete: frozen 30-word editorial draft

- Owner requested continuation after01–03. Completed next frontier04 offline:
  30 existing V2 Senses across animals8/colours8/school8/family6, concise Vietnamese
  meanings and30 new bilingual example drafts. No new Lexeme/Sense/word is counted
  toward the ~600 expansion target. No DB access, application source changes,
  provider calls, image/audio generation, import or activation.
- Scanned all7341 runtime/7320 review-queue entries and5004 Oxford/4673 Vocab4600
  records for supplied headword/display/variant/legacy candidates; six deferred
  searches are not verified gaps. Preserved exact runtime/proposal/hash identity,
  source examples and learner progress keys; Master entity IDs remain null.
- Draft placements: Từ đầu tiên,27 items Grade1 and30 Grade2, explicitly editorial
  with adult support;25 A1/5 unknown labels unchanged. Four groups are draft sets,
  not newly approved canonical topics. Human/identity/runtime placement gates remain.
- Independent reviewer `/root/ticket04_independent_review` checked30/30 exact
  items and90 media slots, PASS_DRAFT_ONLY with0 blockers and9 read input pins.
  Source/presentation hashes recorded per item; no visual/listening review claimed.
- Five relationship images OMIT;85 potential outputs remain. Existing candidates:
  images for6 active slots, word audio for11;18 exact-byte files included (one
  family image retained as unused evidence).30 new sentences need exact audio;
  generation range68–85 only if later authorized, before retries.
- Sealed shared manifest SHA17bea1e964a0003a000d77a64d0899c61a473bc7068e60ccf9b4bab5523400d1;
  portable package30 pinned payload files, manifest SHA
  16b07298fa7096d2bbd3ea1b92b7415daa758a135aa4672919adafb898fce786.
  Actual package verifies after receiving-workspace relocation;11/11 guard tests
  pass, ESLint and whitespace checks pass. No UI verification claim for this data-only step.
- Report and next-session hashes: `docs/plans/editorial-refresh-2026-10-28/ticket-04-frozen-pilot.md`
  and `.result.json`. Tracker01–04 done;05–15 planned.05/06 can be assigned in
  parallel after media config/work orders; providerRequestHash remains null and
  every slot non-executable. Off-machine backup and activation remain pending.

## 2026-10-29 — Tickets 02 and 03 complete locally, in parallel

- Owner explicitly requested 02 and 03. 02 used dedicated local env/identity,
  full pre-migration custom dump plus password-free globals and per-table
  hashes, then applied only existing 0019/0020/0021 through the existing local
  migration entrypoint/trusted executor. Backup TOC and full decode PASS;
  recovery procedure exists, no restore was executed.
- Preserved all 30 pre-existing app/protected table fingerprints, role/schema
  security, app sequences and entire historical migration prefix. Added three
  history rows; the known extra old row remains verbatim. Counts unchanged:
  7,341 vocabularies, 7,311 V2, one progress, one review. No short-meaning import
  or content/media activation. Post-browser read-only verify also PASS.
- Real local API + current Vite source + Chromium: index7311 IDs, A1=1008,
  unclassified1772, A1×grade1 empty. Guest browse/setup/study/flip flows PASS at
  1440/A1 and390/unclassified, screenshots inspected; no API mocks, account
  mutations, external requests or page errors. Early harness startup/native
  option assertion failures were fixed and retained in local evidence.
- 02 guard tests9/9 PASS; related migration suites4 files/21 tests PASS. No
  application UI/runtime code was changed, and no remote DB/CI/deploy executed.
  Exact scope, backup limits and hashes: ticket-02-local-preview.md/result.json.
- 03 completed three existing items (apple/blue/dog), nine fake jobs and nine
  receipts. Separate image/TTS processes finish concurrently; single coordinator
  merges, catches wrong/stale/conflicting inputs and handles replay/retry.
  Tests21/21 PASS, including dependency-specific invalidation and portable
  relocation. Package33 pinned files, manifest SHA-256
  e9069b44b26dbcb30d4f3af03d13ce852d8991f3f761312ce184f278fa66d0c6.
- Outputs are output.fake.json/application-json, REVIEW_REQUIRED_MOCK, never
  image/audio or runtime eligible. No Master IDs minted, provider/voice chosen,
  content approved or provider called. Production contract remains draft.
- Tracker:01–03 done,04–15 planned. 04 now has its technical dependency met;
  this instruction did not authorize authoring the pilot or further tickets.

## 2026-10-29 — Ticket 01 complete: frozen read-only baseline and full handoff

- Owner explicitly requested only ticket 01. Started existing Docker Desktop/
  development container and captured the dedicated local DB in a read-only,
  repeatable-read transaction at 01:46:50 UTC. No remote env/DB, learner rows,
  migrations, data activation, provider spend or generation.
- Selected immutable baseline-v2 under the editorial campaign workspace:
  manifest SHA-256 `eef748df5dda27086c19f071ad6e3601f474b4494e07822fd844eda75f6365b2`.
  All 7,311 V2 keys/hashes/learner fields and historical receipt bindings match
  RC V9 plus replayed overlays; 30 legacy rows are retained separately.
- Crosswalk preserves runtime/proposal IDs with pending Master IDs. Created
  148 exclusive headword/sibling shards covering all 7,341 IDs exactly once,
  unassigned and unauthorized for later editing. Coverage sample: 355 targets,
  262 candidate matches, 93 requiring further search; no auto-approved gaps.
- Verified 13,977 local media assets against exact size/hash and joined old/
  latest mapping generations to current runtime IDs. Added latest backfill
  evidence; old 7,120 assets are a subset, not additional coverage. Kept
  semantic/pronunciation/policy review pending; no media activated.
- Packaged 51 operational source entries, including three recovered exact-byte
  inputs. Historical OEWN raw archive/member/record evidence remains partial
  and explicitly disclosed; this is current-content reproducibility, not
  full historical primary-source replay or fresh semantic review.
- Full portable local ZIP: 665,093,401 bytes, SHA-256
  `144c8a01d7d1754cb0af66ab58438b913e6cdda30c5642159d8c142a6f19806b`.
  Verified every one of 14,045 archive entries, including all media bytes.
  JSON result and handoff paths: `docs/plans/editorial-refresh-2026-10-28/ticket-01-baseline.result.json`.
- Added guarded collector/verifier and packager tools. Node guard integration
  tests 9/9 PASS; offline sealed-baseline verification PASS; independent
  structural review PASS. Ticket 01 done; 02–15 remain planned. 02/03 have
  their baseline dependency satisfied, but were not started by this instruction.

## 2026-10-29 — Approved breakdown published as 15 local tickets

- Owner explicitly approved the 15-ticket breakdown/edges and local Markdown
  storage, with the question specifying publication only, not implementation.
  Published one file per ticket in `.scratch/editorial-refresh-20261028/issues/`,
  plus the entry README and machine-readable index. No existing ticket was
  overwritten; this is the first local publication of this campaign.
- All statuses are `planned`, execution authorization is false. This follows
  the owner's limited scope rather than the skill's default ready-for-agent.
  Added campaign-scoped tracker/triage docs under `docs/agents/`; unrelated
  tracker defaults and AGENTS.md are unchanged.
- JSON plan records approved graph/publication while retaining the draft
  implementation contract, `executionAllowed=false` and empty items/jobs.
  Templates 10–14 need bounded batch IDs, pinned inputs and ownership before
  assignment; 15 waits for every included instance, not just the templates.
- No DB access, schema/app changes, generation/provider calls or worker
  dispatch in this publication step. US-62 remains editorial preflight.
- Publication validation: 14/14 structural checks PASS, including every ticket
  title/status/authorization, four criteria per ticket, exact approved blocker
  edges, dependency ordering, acyclic graph, all local links, five input byte
  pins and unchanged skill. JSONs parse; tracked diff whitespace check passes.

## 2026-10-29 — Whole-corpus editorial campaign analysis; no execution

- Owner approved whole-corpus review with selective corrections, approximately
  600 genuinely new words/lexical phrases (500–800 after deduplication), and
  approximately 25–35 curated sets. This is a planning envelope, not 600
  verified gaps. Letters, utterance items and new Senses of old headwords have
  separate counts. No generation or import is authorized by this analysis.
- Compared all 7,311 local V2 proposal keys/content hashes to RC V9 PASS
  dispositions and offline CEFR enrichment: all match. Enrichment adds 1,155
  labels, including 606 C2, leaving 617 unclassified; not applied locally.
  Runtime has 6,114 distinct display strings but 5,798 provenance headword
  strings; 573 rows differ. Do not deduplicate or detect gaps by display alone.
- The Docker restore deliberately empties media arrays. Historical media
  inventories overlap and require exact binding/hash/policy checks before
  reuse; local emptiness is not a regeneration backlog. Full structural scan
  is complete, independent semantic review of every Sense is still future work.
- Added the owner's requested repo-local to-tickets skill unchanged from
  installed plugin 1.3.1; source/destination byte hashes verified. Tracker is
  not configured by installing the skill. Planning documents are under
  `docs/plans/editorial-refresh-2026-10-28/`: corpus findings, scope, immutable
  batch JSON/worker receipt proposal, and 15 numbered ticket families with
  bounded parallel batches. JSON is non-executable, with no items/jobs.
- Pending: owner review of breakdown/edges/tracker, TTS locale/voice/provider,
  image policy and later implementation/spend authorization. No ready tickets,
  schema/code/data changes, media generation, remote access or deployment in
  this campaign analysis. US-62 remains editorial preflight; US-63 unchanged.
- Documentation checks pass: JSONs, source byte pins, inventory cardinality,
  dependency DAG, internal links and unchanged installed skill bytes. A fresh
  local SELECT attempt on 29 October failed because the Docker engine is off;
  no evidence artifact was written for that attempt. Local counts explicitly
  retain the 28 October observation; no remote fallback was attempted.

## 2026-10-28 — US-63 nine learning levels implemented locally

- Owner confirmed all nine levels. Vocabulary now uses one main Mức học
  selector; grade/topic are supplementary and still survive into study.
  Introductory groups are visibly unavailable, never inferred from missing
  CEFR. Initial metadata failure is distinguished from no content.
- Unclassified is an explicit query filter with shared validation. Account
  browse/count and queue use one SQL predicate; guest queue and topic/collection
  summaries use the matching shared function. All/progression/SRS behavior and
  content identities are unchanged.
- Targeted Vitest: nine files 242/242 PASS; final affected browse suite 30/30
  PASS after adding one metadata-failure case. Final Chromium run 4/4 PASS for
  account/guest at 375/1440px, including native-menu keyboard, loading/error/
  retry/no-results/reload and scope through setup/study. Screenshots inspected.
- Web/API TypeScript, changed-source ESLint, build and diff checks PASS.
  Strict premium audit zero findings, Impeccable detector empty. Existing build
  bundle/import notices remain. Exact evidence is in US-63 and its QA report.
- US-63: IMPLEMENTED / READY FOR OWNER CHECK. US-62 remains editorial preflight.
  Next data work needs the foundational item/placement contract and draft
  content; do not auto-classify unknown CEFR. Audited Docker schema remains
  behind the current app and was not migrated by this change. No DB writes,
  generation/provider spend, commit/push or deployment.

## 2026-10-28 — Local content audit and level-discovery discussion

- Read the repo and queried only Docker `127.0.0.1:55432/vocabflow_dev` with
  read-only repeatable-read transactions. Started the existing local container;
  did not use the remote app `.env`, apply migrations, import content or call TTS.
- Evidence and rerunnable guarded script:
  `docs/audits/local-content-audit-2026-10-28/`. Current local V2: 7,311 enabled
  Sense rows, 6,114 normalized headwords, 0 grade/age assignments; CEFR A1 1,008,
  A2 905, B1 740, B2 1,424, C1 1,462, unknown 1,772, no C2/Pre-A1.
  There are 30 separate legacy starter rows and 10 sets with V2 content.
- Local restore is behind current schema: no short-meaning table, topic review/
  hierarchy fields or flashcard display field. Media arrays/URLs and IPA are
  empty locally. These are not production findings. Nine enumerated reference
  checks have no orphan rows; semantic review was sampled, not exhaustive.
- Owner accepted reusing exact suitable Senses, authoring only missing content,
  separate introductory letter/sound content and multi-grade/set reuse with
  shared identity/progress. Recorded ADR-0002, glossary and decisions; no new
  placement/variant schema is implemented. US-62 pilot remains editorial preflight.
- Owner prefers learner-friendly levels and confirmed nine levels after the
  four/seven-level proposals: letter/sound introduction, first words, first
  utterances, then named A1–C2 groups, plus a separate unclassified state.
  US-63 implements the discovery slice, with introductory levels unavailable
  until curated content exists. Do not implement the earlier grade-primary or
  four/seven-level layouts. The foundation item/placement model and content
  generation remain separate future work, without data writes in this slice.
- Removed the explicitly requested Vocabulary header “Duyệt theo chủ đề”
  navigation, unused URL construction and dedicated CSS, preserving taxonomy
  and study scopes. Existing component suite 27/27 and catalog E2E 2/2 pass;
  inspected screenshots at 375/1440px. Web TypeScript, changed-source ESLint,
  build and diff checks pass; Impeccable detector has no findings. Build keeps
  the existing large-bundle/ineffective-dynamic-import notices. No commit,
  push, deployment, remote DB access, media generation or provider spend.

## 2026-10-28 — UI/UX Pro Max polish for Vocabulary Browse & Study Flashcard

- Executed grill-with-docs and aligned on UI/UX Pro Max improvements with project owner:
  - Vocabulary Browse (`/vocabulary`): streamlined cards by removing redundant labels ("Nghĩa tiếng Việt", long explanation text moved to detail), polished filter toolbar layout from 2 fragmented rows into a unified responsive grid, added subtle card resting elevation, enhanced CEFR and POS badges, and elevated thumbnail/bookmark aesthetics.
  - Flashcard Study (`/study`): elevated card elevation and padding, added speaker icon to pronunciation button, styled high-contrast primary meaning, organized bilingual examples into soft-surface callouts with clean tag pills, styled image containers with subtle borders and shadows, and hid technical provenance notices (`.development-media-notice`) from learner view while preserving test/DOM semantics.
  - Study Actions: modernized "Chưa nhớ" (warm soft rose tone with retry icon and `[1]` shortcut badge) and "Đã nhớ" (solid emerald green with checkmark icon and `[2]` shortcut badge) with 52px touch-friendly targets and tactile active states.
- Verification: 54/54 focused tests PASS (`vocabulary-card`, `flashcard`, `study-page`), TypeScript `tsc` PASS (0 errors), ESLint on modified files PASS (0 warnings/errors), production bundle `pnpm build` PASS.

## 2026-10-21 — US-61 catalog discovery; US-62 content preflight

- Added URL-backed grade/topic filters for learning sets, approved topic facets,
  topic deep links and a regression for global search/import review status.
  Focused catalog/API/guest tests pass 63/63; web/API TypeScript checks, changed
  source lint and production build pass. Local visual inspection covered the
  set catalog and learner settings.
- Local public index: 4,537 words, 11 sets, zero eligible topic facets and zero
  grade assignments. It is 204,315 UTF-8 JSON bytes; local server timing was 376 ms on
  the first request and 94–96 ms on two warm requests. This is not a production
  benchmark.
- User-approved Grade 1–2 pilot scope is recorded in US-62. Sampled beginner
  records/media remain drafts with unknown rights, so no words, topic rows,
  media, database or migrations were activated. This is a content/rights gate,
  not an absent UI filter.
- Focused settings/flashcard/study verification passes 157/157 tests after
  isolating the settings client in study-flow fixtures. The 39 study-flow tests
  pass across two files. `pnpm build` passes; Node 22.19.0 is below the project
  engine requirement 22.23.2, and Vite reports the existing 646 kB main chunk.
- No commit, push, deployment, live database operation or migration execution.

## 2026-10-21 — US-60 local implementation, owner check pending

- Owner reprioritized phase 2 after US-59's local implementation. US-60 adds
  learner-scoped `Tự nhớ` (default), `Dễ làm quen` and `Chi tiết` preferences to
  Settings and the shared flashcard flow. Guest v1 state remains readable with
  a safe `Tự nhớ` fallback.
- Production build, web/API typechecks and changed-source lint pass. Focused
  settings/flashcard/study-flow tests now pass 157/157. Browser E2E and live
  account save/reload remain pending. Migration 0021, owner check and US-59
  rollout remain pending. No live database, deployment, learner history or
  content operation.

## 2026-10-21 — US-59 local implementation, owner check pending

- Implemented phase 1 after final Q4/Q5 approval: consistent V2 broad source,
  grade/CEFR intersection through study, reviewed topic policy and descendants,
  compact cards, page-local saved flags, public metadata cache and smaller Home
  candidate queue. Added migration 0020; it has NOT been applied to any DB.
- 331 relevant tests + 63 import/curation tests PASS; Chromium E2E 2/2 PASS at
  375/1440px, screenshots inspected. Build, web/API TypeScript and changed-file
  lint PASS. Full test/lint/typecheck remain non-green on historical fixtures
  and unrelated local scripts; exact evidence and rollout limits are in US-59.
- No content approval, grade backfill, commit, push, live DB read/write or deploy.
  At this handoff phase 2 display preferences and phase 3 curated beginner/grade
  content remained; US-60 now handles phase 2.

## 2026-10-21 — Owner accepted improvement direction

- Owner accepted phase 1 first, curated grade 1–2 suitability without textbook
  claims, and future Self Recall default with learner-scoped display preferences
  (guest device-local). Recorded in decisions, audit and new root glossary.
- Remaining design questions: visibility of unreviewed inferred topics and
  parent-topic descendant inclusion. No feature code or data changes in this
  documentation turn. No tests rerun; `git diff --check` used for document edits.

## 2026-10-21 — Learning experience and loading audit (design discussion)

- Follow-up survey: topic scope reaches study but grade/CEFR browse filters do
  not. Static V2 All scope differs between account membership SQL and guest
  enabled-index selection; needs a dedicated parity fixture before correction.
- Identified fixed-empty V2 dashboard service calls, eager page imports,
  non-expiring in-memory guest promises and user-scoped browser source
  preferences. Expanded the audit with a proposed five-slice plan; no product
  choices marked accepted and no feature implementation performed.
- Focused offline verification: 4 Vitest files / 71 tests PASS (guest scale,
  bounded transport, flashcard and study queue). No production timing or real
  browser/audio validation; jsdom reported unimplemented media methods.

- Read-only source audit requested with `grill-with-docs` and UI UX Pro Max;
  findings and proposed priorities are in
  `docs/learning-experience-audit-2026-10-21.md`.
- Owner clarified that the app serves all ages; grade 1–2 is a pathway within
  the shared product. Display defaults, preference persistence and grade content
  criteria remain open. No new product decision is marked accepted.
- Confirmed redundant saved-word detail loading, repeated browse filter SQL,
  mixed-source topic options and learner-facing editorial metadata. Existing
  browse pagination/debounce/abort and guest bounded loading are acknowledged.
- No feature code, database access, content mutation, deployment or tests in
  this audit. Timing impact is unmeasured; implementation awaits the explicit
  shared-understanding step of the invoked grilling workflow.

## 2026-10-20 — One-Sense-Per-Lemma Dataset Cleansing (4,537 Canonical Words)

- Cleansed 592 polysemous lemmas on both Development and Production Neon branches (`br-cold-shadow-a17yg4k2` and `br-cool-sea-a1ifkf95`).
- For every lemma with multiple senses, evaluated candidate senses by authentic image/audio availability, verified Vietnamese short meaning, CEFR level (A1 > A2 > B1 > B2 > C1 > C2), and primary part-of-speech ranking to retain the single most representative sense.
- Disabled 819 secondary/duplicate senses (`enabled = false`) across both databases.
- Result: exactly 4,537 active words remain; 0 duplicate words remain in the entire active catalog. Study sessions, flashcards, and vocabulary browse now present exactly 1 distinct sense per English word.
- Production preflight verified: `PRODUCTION_DB_PREFLIGHT=PASS`, `MIGRATION_LEDGER_ROWS=21`, `DATABASE_MUTATIONS=0`.

## 2026-10-20 — Multi-Sense Headword Grouping & Slide-Over Drawer on Vocabulary Browse

- Grouped vocabulary browse items by normalized headword/lemma (`groupVocabularyByHeadword`),
  consolidating multi-sense words (e.g. 6 senses of `abuse`, 6 of `bow`, 5 of `fine`/`key`) into
  a single distinct card on the vocabulary browse grid instead of multiple duplicate cards.
- Added visual multi-sense pill badge (`{N} nét nghĩa • {POS list}`) on the vocabulary card.
- Implemented accessible `MultiSenseDrawer` slide-over sheet triggered by `Xem {N} nghĩa →` on multi-sense cards:
  - Accessible dialog (`role="dialog"`, `aria-modal="true"`, focus management, Escape key support).
  - Displays word title, IPA, pronunciation audio player, and authentic image (if available).
  - Groups senses by Part of Speech (`Danh từ`, `Động từ`, etc.) with index, CEFR tag, primary meaning, explanation,
    individual bookmark button, and direct link to the full detail view (`/vocabulary/:id`).
- Enhanced `VocabularyDetailPage` to display an accordion/card listing all other senses of the word (`Các nét nghĩa khác của từ này`),
  enabling seamless switching between senses for polysemous words.
- Vitest coverage: 56/56 tests PASS across 5 test suites (added `grouped-vocabulary.test.ts` and `multi-sense-drawer.test.tsx`).
- TypeScript (`tsc -p apps/web/tsconfig.json`) PASS with 0 errors; ESLint on `apps/web/src/features/learners` PASS with 0 warnings/errors.

## 2026-10-19 — Review Queue contract schema fix for backfilled media metadata

- Resolved `INTERNAL_ERROR` 500 failure on `/api/learners/:learnerId/review-queue`
  caused by `.strict()` in `packages/contracts/src/index.ts` rejecting backfilled
  provenance metadata (`mappingKey`, `sourceNoteId`, `byteLength`, etc.) present in
  `master_v2_development_projections.development_media`.
- Switched `developmentMedia` object and array schemas (`images`, `wordAudio`, `exampleAudio`)
  to `.passthrough()` while preserving required type/format assertions on known fields.
- Rebuilt workspace packages (`build:workspace-packages`).
- Added regression test verifying ReviewQueueService accepts rows with backfilled media
  metadata. All 74 review-queue tests pass; workspace build and TypeScript checks pass.

## 2026-10-19 — Production V2 image coverage backfill

- On the verified Neon V2 Production branch `br-cool-sea-a1ifkf95`, backfill
  3,937 identity/content-hash-pinned image references for 3,936 of 7,311
  current PASS/DRAFT Senses. The source inventory has 4,669 image assets;
  3,932 unique hashes are used by these mappings and 737 inventory hashes are
  not used by a selected mapping. Source bytes were reused; no Cloudinary
  upload occurred.
- All new references remain `PROPOSED`, rights remain
  `UNKNOWN_REVIEW_REQUIRED`, and visual review remains `NOT_PERFORMED`.
  Ambiguous hashes and mismatched source evidence remain unresolved. Content
  fingerprint, vocabulary identity count, taxonomy, learning-set membership,
  learner progress and review-event counts were preserved. A second dry run
  planned zero updates.
- The API serves an image only when a current exact Sense identity and content
  hash pin exists, duplicates refer to one physical hash, the authenticated
  Cloudinary URL and MIME are valid, and the exact owner public-media
  attestation is configured. Detail hides an empty image panel and uses a
  compact fallback for a failed delivery.
- Focused tests: 7 files / 47 tests PASS; Web TypeScript check PASS; full
  workspace build PASS. Full workspace `pnpm typecheck` remains blocked by
  existing errors in unrelated local scripts. Node 22.19.0 is below the
  repository's requested 22.23.2; existing chunk-size and dynamic-import
  warnings remain.
- No Git push or deployment was performed. Vercel project environment
  attestation could not be verified because the connected Vercel scope denied
  the environment query; Production browser smoke therefore remains pending.
- Required samples: `banana` and `abolish` have proposed exact target/hash
  images; `advertise` retains its proposed image. `ahead` remains unmapped
  because its source POS is adjective while the target Sense is adverb. The
  historical-period `age` Sense has no matching source meaning; the years-lived
  `age` Sense remains below the minimum semantic-match threshold. No sample was
  auto-reviewed or rights-cleared.

## 2026-10-18 — V2 final release candidate

Owner accepts discarding V1 test users/accounts/sessions/progress/reviews and waives a V1 backup for cutover; this does not authorize deleting Neon V1 or Cloudinary V1. Do not retry V1 SQL after PostgreSQL 53000.
- The staged V2 Production branch remains `silent-sky-84582895 / br-cool-sea-a1ifkf95 / neondb`, starting with no auth or learner-history rows. New Production accounts will be created through Better Auth.
- The release candidate keeps uncleared media URLs out of deployed API responses. Preview is configured for the V2 Development database; Production variables and deployment remain unchanged pending owner GO.
- Rollback can restore the prior Vercel deployment, but V1 database availability is not verified and cannot be promised while quota-blocked. V1 resources remain retained.

## 2026-10-08 — Balanced New/Due Mixed Study fix

Owner-authorized bug fix on TXH, remote baseline
70b085b115f14ff45a8c57d1fcd4d83100ca0918. Preserved concurrently created
Dataset approval-gate scripts/reports/workspaces and old stashes.
Root cause: DUE-first frontend truncation consumed the whole Mixed amount,
and the default server pool could never supply 15 NEW for amount=30.

Single allocator in selectStudyQueue now uses ceil(N/2) DUE + floor(N/2) NEW,
then fills shortages from remaining eligible NEW, followed by DUE. Deduplicates
IDs, preserves each type's canonical order, and presents DUE first. NEW and
Review only select their own type; Saved-all/Weak retain their special rules.
Setup summary uses this allocator and canonical eligible candidates.

Optional API capacity=5|10|20|30 bounds each candidate query, preserving default
20 DUE/10 NEW and raw availability counts. Membership EXISTS precedes LIMIT;
the same parallel usage/Due/New reads remain, with no N+1 or extra round-trip.
Setup fetches at most 30 per type per source so controls do not refetch; Study
and reconcile request the selected amount. At most 60 candidates return, often
fewer after the canonical daily New allowance. No queue/progress cache across
accounts. Atomic review-write checks, scheduler, idempotency and XP unchanged.
Reconcile uses the same scope/mode/capacity, removes confirmed answer IDs and
allocates only the remaining budget. Manual concurrent writes can shorten the
actual session; backend candidates and writes remain canonical.

Validation:
- Focused queue/API/Setup/Study/Summary/review writes: 6 files / 194 tests PASS.
- Broader full web, queue/review/Weak/Saved/set/settings/app and learning-domain
  regression: 40 files / 582 tests PASS (the final added ownership test also
  passes in the focused run). No unrelated assertions were weakened.
- Chromium: 15 tests PASS, six complete NEW/Review/Mixed sessions including
  Mixed 5/10/20/30 and exact 15-set Custom IDs, counts and continuation; nine
  existing picker tests cover mobile, account isolation and stale sources.
- pnpm typecheck, pnpm build, pnpm lint and task diff check PASS. Client secret
  and source-map scans PASS. Existing Node 22.19 vs 22.23.2 / chunk-size / API
  import warnings remain. Earlier focused failures were old URL assertions,
  updated to assert the new bounded capacity requests exactly.
- SQL/service tests use generated SQL and mocked rows, not live PostgreSQL.
  Full historical E2E suite and real mobile/device/live Preview checks were
  not run. No benchmark or live Neon query plan is claimed; candidate payload
  can grow from 30 to 60 maximum, with existing query count and parallel reads.

No Production deployment, DB migration or Dataset edit by this task.

## 2026-10-08 — US-54 bulk learning-set selection

Owner-authorized feature and commit/push on TXH, remote baseline
6c06e99ae8f40020d826c7aa140b4da1a107a6c2 (Dataset-only advance from the known
UI fix). Native bulk checkbox below search exposes checked/unchecked/mixed
state and supports Space. It selects/deselects enabled matches only, retaining
hidden selections and showing the total count beside Apply(N). Empty results
disable bulk selection. Set union deduplicates IDs; over-50 attempts reject
atomically with inline guidance, including 47 existing plus 5 new matches.
Individual selection keeps the 50 limit and deselection remains available.

Only picker draft/UI/styles and tests changed. Setup architecture, cached
catalog request, focus trap/restore, scroll lock, entrance animation and
source persistence remain intact. Cancel paths discard bulk drafts; changed
Apply persists once, unchanged Apply does not fetch again. Mocked Chromium
counts catalog/queue reads and preference writes, preserves URL/Setup DOM,
and verifies Start serializes all applied IDs. Dataset/scripts edits appearing
concurrently in the shared checkout remain outside this task and its staging.

Validation: focused picker + Setup 2 files / 42 tests PASS; full web regression
32 files / 371 tests PASS; Chromium Study source picker 9 tests PASS at
320/390/768/1440px, including Space toggle, visible footer and no horizontal
overflow. pnpm typecheck, pnpm build, pnpm lint and task diff check PASS.
Client secret and source-map scans PASS. Existing Node version, chunk-size and
API import build warnings remain. No live API/DB,
physical-device verification, migration, Dataset edit by this task, old stash
restore, main merge, force push or Production deployment.

## 2026-10-08 — Small scoped Study picker jank fix

Owner-authorized patch on TXH, baseline
8eca81e84d896fd0449aed04ce646465d4dd4b9b. Source/modal actions previously
navigated and changed the scope key, remounting Setup and reloading catalog and
queue. These actions now use local React state. URL serialization happens at
Start; amount/mode and background DOM/scroll remain stable. Direct scoped links,
session summary and continuation keep their existing serialization contract.

Custom opens before catalog completion with internal loading/error/retry states.
Catalog data and its in-flight promise are reused through the Setup lifecycle.
Cancel/X/Escape/backdrop discard without preference or queue changes. Changed
Apply saves the account preference once and refreshes scoped availability;
unchanged Apply only closes. Pathway/All commit locally. Async cancellation
guards reject stale availability. Modal focus restore prevents scrolling and
scroll lock compensates scrollbar width; 180ms desktop / 200ms mobile entrance
animations respect reduced motion.

Verification:
- Focused Setup/dialog/Study: 3 files / 60 tests PASS.
- Full web regression: 32 files / 365 tests PASS with one worker. An earlier
  run hit an existing Study audio pause timing assertion; the focused rerun
  and full final rerun passed without changing that test.
- Chromium picker: 8 tests PASS, covering 320/390/768/1440px, stable DOM/amount,
  URL unchanged until Start, lazy catalog shell, cancel/reopen request reuse,
  focus/Escape, exact Start scope, account isolation and stale responses.
- pnpm typecheck, pnpm build, pnpm lint and git diff --check PASS; client secret
  and source-map scans PASS. Existing Node version/chunk-size/API import
  warnings remain. No live API/DB or physical-device acceptance is claimed.

Only Setup, picker, styles, focused tests and required handoff docs changed.
No backend/review/SRS change, Dataset edit, migration, old stash restoration,
main merge, force push or Production deployment.

## 2026-10-08 — US-54 compact Study Setup sources and server-scoped queues

Status: IMPLEMENTED / READY FOR OWNER CHECK. Owner explicitly approved this
slice and commit/push to TXH. Initial remote baseline was
6a1fe9889162cfec3e7bc102aa64a84da2b1bc73. While implementation was in progress,
remote advanced only in Dataset/docs; non-overlapping fast-forward adopted
final baseline a2f4f54eefc6734eb7da805f80ff8a9c6ebd4690 without stashing or
rewriting task files. Historical stashes, including
59c6655f4aa0924cd7b9a8fd6215c61bb852b135, remain intact.

Compact source dropdown defaults to Pathway and has exactly Pathway/Custom/All.
Custom uses a searchable draft dialog, 560px desktop and a mobile bottom sheet,
independently scrolling list, fixed footer, safe-area padding, explicit zero
validation, focus trap/restore and all cancel paths. Summary shows source,
actual planned count and mode. Removed verbose tips and repeated note.
Changing source keeps controls usable while availability loads; late results
from canceled effects cannot replace the current source. No selection toast.

Queue filtering moved from client vocabulary-ID filtering to parameterized
server EXISTS predicates before LIMIT. Pathway selects earliest enabled set
with canonical sparse NEW by sort_order then ID; previously studied Due stays
eligible across enabled sets, with no mastery gate. Custom/All union enabled-set
words without assignment mutation or duplicate membership rows. Exact set,
Topic (preserving assignment access), Saved-all and Weak scopes survive Start,
reconcile, exit and Summary Học tiếp. Account-scoped local source/ID preferences
are validated against fresh summaries; queues/progress/history are not stored.
Daily New allowance and 20 Due / 10 New presentation bounds remain; review write,
idempotency/revision, scheduler, reinforcement and XP code are unchanged.

Verification:
- Final Study/API/component suite: 11 files / 178 tests PASS.
- Broader relevant apps/API/contracts/domain regression: 54 files / 638 tests
  PASS. Expanded study/review/XP/navigation/search/state/toast run: 19 files /
  265 tests PASS. Final identity/preference regression: 23 tests PASS.
- Chromium: 16/16 PASS, including widths 320/390/768/1440, modal/footer bounds,
  keyboard/draft cancellation, reload, stale-ID pruning, account B isolation,
  delayed old-source response and login/logout. No assignment write requests.
- pnpm typecheck, pnpm build, pnpm lint and git diff --check PASS. Client secret
  and source-map scans PASS. Existing warnings: Node 22.19.0 vs requested
  22.23.2, >500kB JS chunk, API dynamic-import warning.
- API SQL tests inspect generated SQL and mocked database rows; no live Neon or
  new Trusted DB execution was performed. Pathway is dataset sort_order, not
  an invented CEFR/grade roadmap. Review queues remain unreserved reads.
- Historical seven unrelated E2E failures documented in the single-account
  verification remain unclaimed: us05 summary labels, us20 old learner heading,
  us22 (2) obsolete status/grid markers, us26-27 (2) local-filter expectation /
  missing canonical identity fixture, us28-29 obsolete catalog fixture/markers.
  They were not rerun or weakened in this slice.
- Manual Preview still needed: live authenticated catalog/queue/write flow and
  real mobile onscreen keyboard / device safe-area behavior. Mocked Chromium
  evidence does not claim Production or live PostgreSQL acceptance.

No assignment mutation, schema/migration, Dataset modification by this task,
main merge, force push, old stash restoration or Production deployment.
See [US-54](stories/US-54-study-source-picker.md) for contract and changed files.


## Phase 2H.2A candidate preparation (2026-10-08)

READY FOR OWNER REVIEW. Remote/local baseline
6a1fe9889162cfec3e7bc102aa64a84da2b1bc73; accepted Phase 2H.1 input fingerprint
58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53.
The Phase 2H.1 correction was subsequently committed and pushed at that baseline;
its earlier no-commit/no-push handoff below is historical.

The offline pipeline produces 6143 unique source-headword groups, zero missing
or duplicate keys, exact references to all 9677 notes/GUIDs/record hashes and
8092 Oxford source sense groups, and preserves discoverability of all 4170
accepted review groups. Candidate keys are source grouping keys, never Master
UUIDs. No raw source definition/example/media payload is copied into Master.
The report documents the existing Lexeme/Sense, POS, pronunciation, linguistic
children, Classification, taxonomy, Provenance, UUIDv7/revision and release-pin
contracts. No parallel Master schema or approved identity is introduced.

Source counts remain Oxford 5004/5001/3; 4600 4673/4654/19; overlap 3512,
Oxford-only 1489, 4600-only 1142, union 6143; polysemy 2191, POS conflicts 61,
CEFR conflicts 96. Existing approved Master lemma overlap is 87, not Sense proof.
Overlapping ledger dependencies: 58 history groups, 708 product groups.
734 legacy rows link to source groups; 1284 remain unmatched, without implying
invalid content. All 75 history identities remain protected: 58 linked,
17 unmatched. #11 retains 1 progress / 5 reviews; #295 duplicate, #849 ambiguous
and prior owner-excluded pairs remain non-identity. The pinned offline Hybrid
checkpoint is 100 mappings; #284 retains its booking Sense reference. No live
database checkpoint is claimed.

Disjoint processing counts: existing Master 87; history 57; product 646;
complex review 1950; clean both-source lexical 1677; Oxford-only 717; 4600-only
1009. The dimension/intersection matrix is separate from this 6143 partition.
The pilot has exactly 100 unique groups: 5 structural patterns; then 10 each
for Master overlap, history, product, POS conflict, CEFR conflict, multiword,
polysemy, Oxford-only and 4600-only; finally 5 straightforward overlaps.
All quota shortfalls are zero. Selection is sorted and deterministic; every
owner decision defaults to UNRESOLVED. Overlapping pilot strata include Master
13, history 11, product 24, POS 10, CEFR 13, polysemy 37, multiword 11,
Oxford-only 25 and 4600-only 19.

Text/media rights remain UNKNOWN_REVIEW_REQUIRED for all groups. Oxford lacks
an explicit canonical English definition; 4600 Meaning text remains heuristic.
New content needs genuine original definitions/examples, verified Vietnamese
translations/pronunciations, authorship provenance and rights disposition.
School grade, CEFR, difficulty, age, topic/domain, exam and Learning Set remain
independent decisions. Unresolved identities 6143; currently materializable 0;
owner-approved for authoring 0; Master IDs/runtime mappings/media published 0.

PHASE_2H2A_FINGERPRINT:
5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff.
Generated PASS covers computed offline accounting/pin checks only. External
results below are actual separate executions, outside fingerprinted artifacts.
Working directory D:\hoctienganh\VocabFlow-phase-2g3a1; PowerShell, portable Node
v22.23.2, pnpm 11.17.0, Python 3.13.1. No dependencies installed or module purge.

| Exact command | Exit | Result |
|---|---:|---|
| `python -B -c "import ast,pathlib; [ast.parse(pathlib.Path(p).read_text(encoding='utf-8'), filename=p) for p in ['scripts/phase-2h2a-master-expansion.py','scripts/phase-2h2a-master-expansion-test.py']]"` | 0 | Syntax PASS, no bytecode written |
| `python -B scripts/phase-2h2a-master-expansion-test.py` | 0 | 21/21 PASS |
| `python -B scripts/phase-2h2a-master-expansion.py --check` | 0 | Offline replay PASS, identical fingerprint |
| `pnpm typecheck` | 1 | WRAPPER_BLOCKED_BY_ENVIRONMENT: ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY |
| `node node_modules/typescript/bin/tsc -b` | 0 | Direct typecheck PASS |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | 0 | Repository lint PASS |
| `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | 0 | Frozen release PASS; NOOP_ALREADY_MATERIALIZED_AND_FROZEN, writesPerformed=false |

The canonical wrapper did not reach TypeScript and is not PASS. The direct CLI
is separate evidence. Frozen hash remains
44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c;
tree remains 51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e.
Both repeated calculations are identical. All Phase 2H.1 inputs, Phase 2G.3C
evidence, schemas and frozen release bytes are unchanged.

Evidence: [planning report](../vocabflow-dataset/reports/full-master-expansion-candidate-preparation.md)
and [dedicated workspace](../vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation/).
No apps/web, apps/api, migrations, Master authoring/apply, live Neon queries,
DB writes, media publication, relationship mutation, disable/delete or Production
operation. Existing untracked bytecode and all seven stashes remain preserved.
No commit/push. Next: owner review of materialization contract and pilot before
any separately authorized Phase 2H.2B. Phase 2H.3 has not started.

## 2026-10-08 — Remove duplicate Settings and account chevron

Desktop Settings remains only in the primary sidebar; the account menu shows
Logout. Mobile retains its sole Settings entry in the account menu. Removed
the decorative account chevron and its unused styles. Logout behavior is intact.
Validation: 30 App tests and 6 focused Chromium E2E PASS; typecheck, build,
changed-file ESLint and diff check PASS.


## 2026-10-07 — Auth logout/login session boundary

Root cause: LoginPage performed bootstrap both after sign-in and when it saw an
existing session, duplicating provider-owned household/learner provisioning.
Removed LoginPage bootstrap/recovery states. Authenticated `/login` and valid
sign-in now replace-route directly to Home. Successful logout clears the
account-scoped active identity and calls `window.location.replace('/login')`;
failed sign-out keeps UI/storage and shows the existing safe toast. This forces
LoginPage to start with a fresh Better Auth session cache.

Validation: 333 web tests across 29 files PASS; focused auth/App/provider run
57 tests PASS and the final Login/App rerun passed 36 tests. Chromium auth,
registration, account-resolution and logout: 10/10 PASS. Typecheck, changed-file
ESLint and build PASS; `git diff --check` PASS. Build warnings: Node 22.19 vs
22.23.2, >500kB JS chunk, ineffective API dynamic import.

Dataset work was preserved in stash `temp-before-auth-logout-session-fix`
(59c6655f4aa0924cd7b9a8fd6215c61bb852b135). The incoming `origin/TXH` commit
changed the same dirty report/mapping paths, so the exact stash remains
recoverable and was not reapplied over newer Dataset outputs. No
migration/schema/API changes, main merge or production deploy.

## Single-account learning baseline (2026-10-07)

This owner-approved baseline supersedes the earlier learner-management flow and
all historical create/select/switch instructions below.

- USER_MODEL: 1 authenticated account = 1 learning identity in the UX.
- INTERNAL_MODEL: learner_profile, household/membership, learner_id foreign keys
  and learner-scoped APIs remain for compatibility.
- MULTI_LEARNER_LEGACY: all existing profiles and their progress, reviews,
  saved words and settings remain intact; only one canonical ID is used in UI.
- CANONICAL_RESOLUTION: valid same-user legacy stored ID present and enabled in
  the canonical API list wins; otherwise earliest enabled createdAt, then ID.
  Persist the canonical DTO under vocabflow.activeLearner.v1 scoped by userId.
- FUTURE_MULTI_PROFILE: schema intentionally retained; no unique constraint,
  migration, cleanup, delete, disable, merge or learner-data reassignment.
- LOGOUT: supported through Better Auth signOut; clear internal storage only
  on success, then replace navigation with /login. Failure preserves the app
  and storage and displays “Không thể đăng xuất. Vui lòng thử lại.”

TXH was fast-forwarded to da4aa11 after stashing unrelated Dataset/report work
under temp-before-single-account-refactor (exact object
 d16020455c208e3530e3333f9a901173bad321e2). Restore only after successful push.
No live database access, migration, dataset edit, main merge or deployment.

Implementation is complete; live-account owner manual acceptance is pending.
Automated acceptance uses mocked APIs and component fixtures, so database row
preservation is supported by unchanged backend/schema and absence of cleanup
requests, rather than a new live-database inspection. Current validation
results follow in the verification subsection below.


### Verification — single-account replacement

- Focused auth/provider/routing/logout plus broader web regression: 29 files /
  339 tests PASS. Final personal-copy checks: Home + Weak Words 22/22 PASS.
  Typecheck, build, changed TS/TSX ESLint and diff check PASS.
  Stale management tests were replaced with
  observable automatic resolution, preserved-route and mutation-request checks.
  Internal context changes still test refreshed feature data and proper IDs;
  the removed selector is not reintroduced in the product.
- Focused Chromium signup/login/resolution/logout E2E: 10/10 PASS. Broader probe
  of 22 tests: 15 PASS, 7 FAIL on historical assertions/fixtures outside this
  flow. These failures are not a green E2E claim:
  - us05-study: historical summary labels “Đã ôn tập” / “Lượt ôn lại”.
  - us20-progress: historical heading “Tiến trình của An”.
  - us22-vocabulary (2): obsolete status text / vocabulary-list grid marker.
  - us26-27-vocabulary-taxonomy (2): expects server filter instead of current
    local filtering; topic fixture omits canonical authenticated learner read.
  - us28-29-learning-sets: catalog fixture omits canonical learner read and uses
    obsolete list/detail markers.
  The obsolete learner prerequisite was removed from direct Study entry; it
  now passes with exactly one queue read and no write requests. Learning Set
  assignment and Settings mutation toasts match current personal copy and pass.
- Automated legacy-row preservation uses three distinct profiles, same-user
  stored choice and reload; fixture data stays identical and no create, delete,
  disable, merge or reassignment request occurs. No live DB acceptance claimed.
- No schema/API/migration/authz/scheduler/domain/dataset changes. Existing
  account-scoped storage is an internal detail, removed only after successful
  logout. Pending resolution cannot continue provisioning or repersist an old
  account after identity changes/logout.
- Build warnings remain Node 22.19.0 vs 22.23.2, >500kB chunk, and ineffective
  API dynamic import; build and client secret/source-map checks succeed.

### Auth session reset verification

- Login tests cover enabled unauthenticated form, no provisioning recovery copy,
  authenticated-session redirect, direct sign-in redirect, and retryable safe
  credential/network errors. In both authenticated cases requestBootstrap is
  never called. Registration still bootstraps.
- Logout unit tests assert one signOut, persistence removal then hard page
  replacement, failure without replacement/storage clearing, and double-click
  lock. Chromium E2E observes a new session check after logout navigation.
- The current remote TXH Dataset update overlaps all four local dirty tracked
  Dataset files. Those four and three untracked user artifacts remain preserved
  in the exact new stash; none are staged or included in this fix.

## 2026-10-07 — Phase 2H.1 full source inventory / normalization / dedupe

Initially generated on da4aa11ed9d41623f41e8a6da591d0cbb71bc567;
reconciled and revalidated on origin/TXH
23d88be687f0fa460e1f239fa589355d92628357.
Oxford: 5004 source notes, 5001 unique normalized headwords, 3 repeated groups,
8092 structured source sense/example groups, POS and CEFR evidence on 5004 notes,
no explicit English definition field. English Vocab: 4673 notes, 4654 unique
normalized headwords, 19 repeated groups, POS on 4670 notes, CEFR evidence on
4673, 4664 heuristic English text segments in its mixed Meaning field.

NFC/visible text/whitespace/casefold yields 3512 overlapping headwords, 1489
Oxford-only, 1142 4600-only, union 6143. POS-compatible candidates 3450;
61 POS conflicts after recognized alias normalization; 96 CEFR conflicts;
2191 possible polysemy groups, 22 multiple-record groups and zero punctuation
normalization collisions. Definition/content review=19, example variants=3510,
Vietnamese meaning variants=1993, human review queue=4170, including 24 multiword/phrasal source-only
review cases. These are review signals only; headword matching does not establish Lexeme or Sense identity.
All raw note fields, source IDs/GUIDs, models, tags, card/deck IDs, structured
source group evidence and media references remain traceable. Source rights stay
UNKNOWN / REVIEW_REQUIRED. The approved Hybrid-100 v2.2.1 remains 87 Lexemes /
100 Senses, release hash 44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c.
Legacy coverage is read-only over 2018 rows: 440 possible, 294 ambiguous,
1284 without exact source headword coverage.

Original fingerprint: db21e13f409a3873478962db13841b42d1fc13d49399f21c628809cf3019d3a1,
now SUPERSEDED_BY_VALIDATION_PROVENANCE_CORRECTION. Original external checks
were run outside the generator. The direct TypeScript and ESLint CLIs passed;
the pnpm typecheck wrapper was blocked by a non-TTY module-purge guard. Generated
PASS fields were not execution evidence and have been corrected as described below.
No DB access/writes, authoring, apply, mappings, legacy mutations or Production access.

## Phase 2H.1 validation provenance closure (2026-10-08)

Initially implemented on bd3778876cb7ff8f5e6ae8716c479714a1b308ab;
reconciled and revalidated on origin/TXH / local HEAD
11156900a472f8eb8cd36644d03ada131e52b941. The auth/logout code, latest account-menu
implementation and their documentation entries are preserved. Owner review of the inventory semantics
is unchanged; review queue 4170 includes the 24 multiword/phrasal source-only cases.

The generated validation summary now separates deterministicChecks from
externalVerification. PASS means only inventory/accounting checks computed by
the generator. External commands are NOT_EXECUTED_BY_GENERATOR /
EXTERNAL_VERIFICATION_REQUIRED, with required commands and a link to this evidence.
The declared Hybrid release manifest hash is checked against its pin and loaded
inventory counts are checked; release hash/tree validation is an external check.
Frozen fingerprint constants are explicitly pinned expectations, not recomputations.
The --check path only rebuilds and compares deterministic artifacts; it neither
runs external tools nor writes files. Generation skips unchanged output files.

Corrected fingerprint:
58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53.
Previous fingerprint:
db21e13f409a3873478962db13841b42d1fc13d49399f21c628809cf3019d3a1
(SUPERSEDED_BY_VALIDATION_PROVENANCE_CORRECTION).
Reason: validation provenance correction only. The 11 other semantic JSON
artifacts remain byte-identical, and both APKG hashes remain unchanged.
Oxford 5004/5001/3; 4600 4673/4654/19; overlap/Oxford-only/4600-only/union
3512/1489/1142/6143; POS-compatible/conflicts/CEFR conflicts/polysemy/review
3450/61/96/2191/4170. Legacy 440/294/1284=2018; Master lemma alignment 87,
Sense identity unconfirmed; rights UNKNOWN / REVIEW_REQUIRED.

### Separately executed external closure verification

All commands below were rerun after reconciliation on baseline
11156900a472f8eb8cd36644d03ada131e52b941 on 2026-10-08; these are current-baseline
outcomes, not reused execution evidence from the earlier bd377887 pass.

Working directory: D:\hoctienganh\VocabFlow-phase-2g3a1. PowerShell with piped
non-interactive input; PATH prefixed by
D:\hoctienganh\.tools\node-v22.23.2-win-x64; Node v22.23.2, pnpm 11.17.0,
Python 3.13.1; PYTHONDONTWRITEBYTECODE=1 for Python test/replay runs. CI was unset
for the canonical wrapper. These are actual command outcomes recorded outside
the generator and outside the inventory fingerprint.

| Check | Exact command | Exit code | Result |
|---|---|---:|---|
| Python syntax | `python -m py_compile scripts/phase-2h1-source-inventory.py scripts/phase-2h1-source-inventory-test.py` | 0 | PASS |
| Focused tests | `python -B scripts/phase-2h1-source-inventory-test.py` | 0 | PASS, 13/13 |
| Canonical typecheck wrapper | `pnpm typecheck` | 1 | WRAPPER_BLOCKED_BY_ENVIRONMENT |
| Direct typecheck | `node node_modules/typescript/bin/tsc -b` | 0 | PASS |
| Direct repository lint | `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | 0 | PASS |
| Dataset validator | `node node_modules/tsx/dist/cli.mjs scripts/validate-dataset.ts` | 0 | PASS, 30 records |
| Master V2 validator | `node node_modules/tsx/dist/cli.mjs scripts/validate-master-vocabulary-v2.ts` | 0 | PASS, 0 errors / 0 warnings / 1 info |
| Frozen Hybrid validator | `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | 0 | PASS, NOOP_ALREADY_MATERIALIZED_AND_FROZEN |
| Offline artifact replay | `python -B scripts/phase-2h1-source-inventory.py --check` | 0 | PASS, artifactComparison PASS, corrected fingerprint identical |

pnpm typecheck invoked its pre-run dependency-install path and stopped with
ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY. It did not run TypeScript and is not
reported as PASS. The cleanup guard was retained; no node_modules deletion or
dependency installation was authorized. The canonical lint/dataset/Master pnpm
wrappers were not run through the same blocked pre-run gate; the exact direct
commands above provide their separate evidence.
Dataset gaps remain 30 missing IPA, 30 image and 30 audio warnings.
Frozen release output has writesPerformed=false, hash
44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c,
tree 51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e,
and both repeat-identical flags true. Phase 2G.3C manifest pins remain
d60ea07432633de6ab4bb0516ce9401252c6d03982c77710f0b2a71c0968ac09,
5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea,
04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1.
No accepted Phase 2G or frozen release artifact is modified.

Database access/writes, Master authoring/apply, runtime mapping writes, legacy
cleanup and relationship migration NONE; Production untouched. No apps/web diff.
Python bytecode remains untracked and unstaged; backup stashes are preserved.
Reconciliation used a new include-untracked stash
6d3a8df4a2242f7e3a84167556ef903ee65b98fc, a dedicated branch
phase-2h1-provenance-closure from origin/TXH, and application of that stash only.
Both overlapping documentation files merged cleanly; no historical entry was
removed. The new stash and all earlier backup stashes remain available.
Implementation is ready for owner review; no corrective commit or push created.
Phase 2H.2 has not started.

## 2026-10-07 — Phase 2G.3C legacy content disposition / Master expansion planning

Planning complete on origin/TXH baseline ad1aa6813628c73504baa016e9059a9d165a53be.
A fresh Development capture used vocabflow_runtime, REPEATABLE READ / READ ONLY.
All 2018 legacy rows are assigned once: 2005 provisional Master expansion
candidates, 13 identity-review cases, zero retirement/history-only/undecided
cases. History protection is independent and preserves all 75 runtime identities.
#11 retains 1 progress / 5 reviews; #295 duplicate and #849 noun/verb ambiguity
remain review gates. Reviewed non-identity pairs remain NONE. #284 stays outside
legacy planning; total/Master/legacy remains 2126/108/2018, Hybrid 100/100.

The new workspace and report preserve current Vietnamese/overrides, available
English definitions/examples, topics, set order, source identities and grades.
School grades are not CEFR; repeated lemmas are not proven polysemy. No evidence
supports treating disabled/unmapped content as obsolete. A/B/C/D review cohorts
are 75/166/1777/0, with 11 bounded batches: 75, 166, eight of 200, and 177.
Each batch records lexical estimates, topic/set impact, source obligations,
content gaps and human review order. All retirement dependencies remain unresolved.

Planning fingerprint: d60ea07432633de6ab4bb0516ce9401252c6d03982c77710f0b2a71c0968ac09.
Accepted semantic and retirement fingerprints are unchanged. Offline replay uses
`pnpm plan:legacy-master-expansion --check`. Master authoring/apply, relationship
migration, disable, delete and Production authorization all remain NO. No Master
IDs, mappings, canonical content or import artifacts were created. Database
writes NONE; Production untouched. Learner-management application files unchanged.

## 2026-10-07 — Learner management flow correction

- Synced TXH by fast-forward after preserving unrelated Dataset/report and
  Python cache work in a task-specific stash; restore follows successful push.
- Removed the legacy completed/handoff panel and auto-resolving state. Every
  loaded learner count retains creation; one/multiple profiles remain visible,
  with “Đang dùng” and aria-current for the active row. Creation resets the form,
  adds/selects the canonical DTO and retains the Feature #16 success toast.
- Safe returnTo preserves pathname/query on explicit selection or creation;
  direct management remains on /learners. Persisted active selection is
  reconciled with canonical list responses using the existing account-scoped key.
- Missing household reads/definitively rejected creates call existing bootstrap
  once and retry the operation once per attempt. Bootstrap/retry failures exit
  normally. Network failures do not bootstrap; uncertain creates reconcile
  without replay. Signup bootstrap remains unchanged.
- Automated web regressions: 20 files / 248 tests PASS; two additional App
  returnTo regressions PASS (updated App suite 48/48). Relevant coverage includes
  auth/signup bootstrap, active context persistence, Home, Progress, Vocabulary,
  Study Setup, AppShell/navigation, async states and toast feedback.
- Focused Chromium learner/auth E2E: 9 tests PASS, including missing-household
  recovery, first/second creation, keyboard switching, reload and mobile width.
  These use mocked APIs; live-account manual acceptance remains pending.
- Broader historical E2E probe: 8/17 passed, 9 fail on pre-existing stale
  expectations/fixtures outside this learner correction: Study summary copy,
  Progress heading, Vocabulary status/grid markers, taxonomy filter/read and
  missing authenticated learner context, Learning Set context/toast copy.
  Legacy panel references in those tests were migrated; unrelated feature
  implementations and historical assertions were not changed.
- Global typecheck/build and changed-file ESLint PASS; diff check PASS. Local
  Node is 22.19.0 versus requested 22.23.2; build completes with existing chunk
  and API dynamic-import warnings. No Dataset edit, live database operation,
  API/migration change, main merge or production deployment.

## 2026-10-07 — Phase 2G.3B legacy reference decomposition / retirement planning

- Verified `origin/TXH` and local HEAD exactly match
  `bc421abf51ddeb0e0213b5f3b7364c11f57c008a` before implementation and again
  before the Development scan. Provider identity and database identity verified
  Development / shy-hill-72364426 / br-square-grass-b3af0nte / neondb /
  vocabflow_runtime; the transaction was REPEATABLE READ, READ ONLY.
- Fresh read-only evidence matches the accepted 2126-row inventory byte-for-byte
  at canonical JSON content level: 108 Master-managed, 2018 legacy, zero mapping
  anomalies. Legacy totals remain 84 progress, 221 reviews, 0 saved words,
  2026 topic memberships, 279 set items, zero Master/unknown references.
- Exact progress/review intersection: 75 rows; progress-only and review-only:
  zero. All 75 history rows have topic and set links. Topic-only: 1777;
  topic+set: 241; set-only: zero. A=75, B=1943, C1=2005, C2=13, D=1943.
  C2 retains eleven owner-excluded rows, #295 duplicate review and #849 ambiguity.
- S0: no zero-reference legacy rows. S1: removing only product links offline
  leaves 1943 zero-reference rows and 305 history references on 75 rows. S2
  additionally assumes future approved disposition, but resolves no source or
  preservation obligation. S3 disable-only still yields zero hypothetical
  delete candidates; its fully conditioned branch assumes source resolution,
  approved disposition, separate disable and cleared preservation policy,
  yielding E=1943 as a theoretical ceiling only. Current DELETE_SAFE remains 0.
- All 1943 no-history rows have source identity obligations; 1989 total legacy
  rows do. #11 retains 1 progress / 5 reviews; #284 booking remains mapped;
  Hybrid checkpoint remains 100/100. No learner history or relationship moves.
- Corrected the runtime-code cross-check's unqualified/qualified key mismatch
  and added a regression. The new workspace includes sanitized decomposition,
  product relationship enumeration, overlap matrix, semantic cross-tab, schema
  constraints/readiness, S0–S3 scenarios and deterministic replay evidence.
  Accepted 2G.3A/2G.3A.1 artifacts and fingerprint remain unchanged.
- LEGACY_RETIREMENT_PLANNING_FINGERPRINT:
  `04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1`.
  [Report](../vocabflow-dataset/reports/development-legacy-vocabulary-retirement-planning.md).
- Validation: 79/79 focused tests, root typecheck, focused lint and offline
  artifact replay pass. All seven authorization flags remain NO. No database
  writes, cleanup, mapping creation, relationship migration or Master expansion;
  Production was never connected, queried, mutated or deployed.
- Commit/push to `origin/TXH` is explicitly authorized for this phase. No merge,
  rebase, force push, or deletion phase is part of this work.

## 2026-10-07 — Phase 2G.3A.1 owner-reviewed semantic exclusion closure

- Implemented on the verified `origin/TXH` baseline
  `b8f2ef7e2f38d107d5f53bdca5b0b2b834e845ad` in an isolated local checkout.
- Joined the pinned Hybrid-100 proposal candidate IDs to authoritative finalized
  owner CREATE_NEW decisions: 15 exclusions, affecting 11 legacy rows. Removed
  the collision-ID heuristic; each reviewed pair now has
  `OWNER_REVIEWED_NOT_SAME_IDENTITY`, `identityClaim=NONE`, no automatic mapping.
  Mixed candidates retain independent treatment for unreviewed Senses.
- Replayed only semantic evidence offline. Inventory remains 2126 / 108
  Master-managed / 2018 referenced legacy / zero mapping anomalies or delete
  candidates. #11 retains 1 progress and 5 review references; #284 booking,
  #295 apple, and #849 record treatment remain unchanged. Historical owner
  artifacts, finalized reconciliation, releases and accepted inventory are untouched.
- Fingerprint v2 pins canonical content hashes of sanitized evidence, including
  candidate claims and exclusions. Corrected fingerprint:
  `5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea`.
  Offline replay command: `pnpm audit:legacy-semantic-exclusion-closure --check`.
- The implementation made no database connection, mutation, cleanup, mapping
  creation or Production deployment operation. The closure was subsequently
  committed as `bc421abf51ddeb0e0213b5f3b7364c11f57c008a` and pushed to
  `origin/TXH`; Vercel Preview succeeded (owner-confirmed). Production remains
  untouched. See the [corrected audit report](../vocabflow-dataset/reports/development-legacy-vocabulary-cleanup-audit.md).
- Verification: final focused regression PASS (48/48), root TypeScript PASS,
  focused ESLint PASS, repeated offline `--check` PASS, `git diff --check` PASS.
  Broader owner-package suites: 93/94 pass; the historical Phase 2G.2A assertion
  comparing apps/web to the older Phase 2G.1C baseline fails on pre-existing
  UI commits in b8f2ef7. This task has zero apps/web changes. API runtime build
  was generated locally to satisfy typecheck's declaration dependency; ignored
  build output is not part of the change.

## 2026-10-07 — Phase 2G.2D Hybrid-100 Development runtime closure PASS

- Closed the 2G.2B/2G.2C rollout against remote baseline
  `53443aa7818b5fe6b5dc3fea30f8ac8967805e02`. Owner reconciliation was finalized
  for the frozen 2.2.1 release: 97 CREATE_NEW and three MAP_EXISTING +
  UPDATE_TO_MASTER decisions (`deviate` #1836, `pain-relief` #1461, `stand`
  #948). The pre-apply Development dry-run passed; the authorized APPLY was
  committed exactly once (97 creates, 3 updates, 100 mappings) as recorded in
  the 2G.2C evidence.
- Rechecked only the authorized Development target using read-only transactions.
  The existing reconciliation scanner reproduced post-apply snapshot
  `5ebcadbfd95619e8b6e7a5c8cc4a4fca16600f7e947cda5932d1ff16bf4fc85a`. There
  is one matching import run, all 100 mappings remain, 97 new rows are content
  version 1, and the three adopted rows are version 2. Master projection
  matches are 100/100.
- Exercised the existing `GET /api/vocabulary` and
  `GET /api/learners/:learnerId/vocabulary` Hono handlers/services with a
  verified Development household member held in memory. Both returned all 100
  mapped Hybrid rows. Catalog availability: 100 enabled, 0 disabled, 0
  unreadable, 0 projection mismatches. Reservation doubt, water verb, all
  three light Senses, rock, exact, and rally resolve away from the rejected
  collision IDs. All five preserved enrichment fields for each adopted row
  remain readable. The smoke used the existing `readSession` injection seam;
  Better Auth cookie issuance was not part of this smoke.
- A live-snapshot planner replay returned 100 NOOP / 100 KEEP_MAPPING, with
  zero CREATE, UPDATE, conflict, blocked action, mapping creation, or issue.
  Learner history remains 87 progress rows / 229 review events; runtime #11
  retains 1 progress and 5 review references, and the #284 booking mapping is
  unchanged. No learner IDs or PII were serialized.
- Official frozen 2.2.1 release verification passed. No Development writes,
  second APPLY, migration, Production connection, or Production mutation
  occurred. Development runtime is VERIFIED; Production remains NOT
  AUTHORIZED / NOT EXECUTED.
- Phase 2G.2D.1 closed the typecheck blocker with runtime guards for proposal
  ownership and scanner results, plus a pre/post comparison of the verified
  manifest release hash and frozen tree. Canonical `pnpm typecheck` (`tsc -b`)
  passes on Node `v22.23.2` / pnpm `11.17.0`. The focused type-safety suite
  passes 3 files / 69 tests; the original runtime closure suite remains 7 files
  / 94 tests. Frozen release check and `git diff --check` pass. Phase 2G.2D
  closure: PASS; Development runtime: VERIFIED; Production: NOT AUTHORIZED /
  NOT EXECUTED.
- Evidence: [sanitized closure report](../vocabflow-dataset/reports/hybrid-100-development-runtime-closure-2.2.1.md)
  and [machine-readable closure](../vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review/development-runtime-closure.json).

## 2026-10-07 — Toast & Feedback (Feature #16 / US-53) implemented

- Audited alert/confirm and dialog usage plus success/error/pending states
  before implementation. Favorites, Saved Words, learner Settings, learner
  creation and reversible Learning Set assignment now use shared toasts.
  Progress reset remains destructive and confirmed; leaving Study with
  unsaved answers retains native confirmation. Global Search remains a
  command palette, not a feedback modal.
- Focused feedback suite: 8 files / 98 tests PASS. Relevant AppShell/navigation,
  Global Search, Home, vocabulary, Weak Words, Topics, learner persistence,
  Study and async-state regressions: 12 files / 166 tests PASS.
- Global `pnpm typecheck`, `pnpm build`, changed-file ESLint and
  `git diff --check` PASS. Page-read errors remain Feature #15 ErrorState.
- No new dependency, API, scheduler, migration, database mutation, Dataset V2,
  main merge or production deployment.

## 2026-10-07 — Phase 2G.2A Hybrid-100 owner reconciliation proposal

- Built a proposal from the checked-in Phase 2G.1C scan only. Recomputed the
  frozen 2.2.1 / APPROVED releaseHash and ran the official release `--check`:
  releaseHash `44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`,
  tree `51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e`.
- Proposal covers 100 Senses: 97 CREATE_NEW, 3 MAP_EXISTING with
  UPDATE_TO_MASTER (deviate/#1836, relief pain/#1461, stand/#948), and 0
  OWNER_CHOICE_REQUIRED. Every actual ownerDecision remains UNRESOLVED.
- Rejected lexical/semantic candidates conservatively, including exact/precise,
  rally/muster, rock/kick, fuse's electrical sense, the shared light/#1260
  candidate, emergency relief/#1461, reservation/#284, water/#11/#405,
  struggle's three candidates, and mixed-sense liable/#1796. The proposal
  records #11's 1 progress / 5 review references and preserves #284's existing
  mapping to its other Master Sense. Runtime enrichment is marked PRESERVE
  under the projection contract.
- Added an offline deterministic proposal generator, JSON owner-review
  artifact, exhaustive grouped report, and 17 focused tests. The artifact is
  analysisOnly=true, acceptedByImporter=false, and requiresHumanDecision=true.
- No Phase 2G.1C evidence or frozen release files changed. This phase used no
  database connection and made no writes, mappings, IDs, migrations, or
  learner-row changes; importer APPLY and production were untouched.
- Evidence: [proposal report](../vocabflow-dataset/reports/hybrid-100-owner-reconciliation-proposal-2.2.1.md),
  [machine-readable proposal](../vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review/owner-reconciliation-proposal.json),
  and [generator](../scripts/hybrid-100-owner-reconciliation-proposal.ts).
- Verification: proposal generator `--check`; official frozen-release builder
  `--check`; focused tests 17/17; scoped ESLint; typecheck; `git diff --check`.
  Local Node 22.19.0 is below the repository's declared 22.23.2 engine.
- At the time this proposal closed, the next gate was owner review; Phase 2G.2B
  later finalized those decisions, and Phase 2G.2C performed the separately
  authorized Development APPLY.

## 2026-10-06 — Phase 2G.1C Hybrid-100 Development candidate discovery

- Verified only the frozen `2.2.1 / APPROVED` source: releaseHash
  `44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`, tree
  fingerprint `51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e`.
  The existing release builder check, independent release hash, release
  validator, and normal RELEASE transform all passed: 100 projected, 0 skipped,
  `importEligible=true`, 100 Vietnamese / English definition / English example
  fields, 0 IPA, and no Topics, Learning Sets, memberships, or items.
- Verified the configured Neon Development target. The migration role was
  inspected first in a `REPEATABLE READ, READ ONLY` transaction: 19/19 local
  migrations match, latest `0018_panoramic_spirit`; required bridge tables,
  columns, constraints, and write guards are present. Candidate discovery then
  used one runtime `REPEATABLE READ, READ ONLY` snapshot.
- Scanned exactly 100 release Senses. Existing Master mappings: 0; unmapped:
  100; zero/one/multiple candidates: 85/13/2; candidate rows: 18. Candidate
  classifications: 0 exact effective, 1 partial, 4 semantic, 13 conflicting
  meaning. Analysis recommendations: 0 mapping no-op, 0 mapping update review,
  4 map-existing candidate, 85 create-new candidate, 11 identity review, 0
  override review, 0 quarantine review, and 0 blocked. Two polysemy groups were
  flagged. One candidate ID has learner-progress references and one has review
  event references; only aggregate counts were queried.
- Snapshot fingerprint:
  `89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e`; repeated
  from the same in-memory snapshot with an identical result. No learner
  identities or rows were serialized. URLs in candidate artifacts have their
  paths redacted.
- Generated the source-specific workspace and report:
  [candidate workspace](../vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/),
  [Development reconciliation report](../vocabflow-dataset/reports/hybrid-100-development-runtime-reconciliation-2.2.1.md),
  and [scanner](../scripts/hybrid-100-development-reconciliation-scan.ts).
  All 100 owner decisions remain `UNRESOLVED`; no importer-accepted artifact,
  mapping choice, clearFields decision, or runtime ID was created.
- The 2.2.1 release and tree, 2.2.0, RC, Canary, canonical root, and taxonomy
  passed the pre/post frozen-source checks. Database writes, IDs allocated,
  mappings created, learner mutations, importer apply, migrations, production
  connection, and production mutation are all zero/none.
- Verification: focused 2G.1C tests 10/10; `pnpm validate:master-vocab-v2`
  passes with 0 errors, 0 warnings, and 1 info issue; `pnpm typecheck`,
  `pnpm lint`, and `git diff --check` pass. pnpm reports local Node 22.19.0
  below the repository's declared 22.23.2 engine.
- Next step: owner review of the candidate/decision template. Runtime import is
  still unauthorized.

## 2026-10-06 — Phase 2G.1A nested lifecycle audit and 2.2.1 plan

- Re-audited frozen `2.2.0 / APPROVED` offline: releaseHash
  `c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d` and
  release-tree fingerprint
  `35334eb7769c39029223d2d60311c6faab8c462efd0a340f262bed27543256ae` are
  unchanged. The owner-reviewed semantic draft fingerprint independently
  recomputes to `a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d`.
- Exact nested status inventory for 100 Senses: Translation, Definition,
  Example, and ExampleTranslation each have 98 `DRAFT`, 2 `IN_REVIEW`, 0
  `APPROVED`; Sense and Lexeme Pronunciation counts are both zero. Parent Sense
  status is 100 `APPROVED`.
- All 400 existing learner-facing rows trace to the owner-reviewed semantic
  package or an immutable pinned Sense-reuse decision. Child and parent IDs,
  languages, text, ordering, preferred selection, and Provenance references
  match; drift is zero and no rows are blocked. The planned next Sense revision
  count is exactly 100, derived from the 100 parents with status transitions.
- An in-memory-only `app-import-v3` / `runtime-vocabulary-projection-v2`
  simulation projects 100/100 Senses with 0 skipped and `importEligible=true`.
  It retains 100 Vietnamese translations, 100 English definitions, and 100
  English examples; IPA is 0. The future immutable release plan is `2.2.1`
  `PATCH`, with the cohort unchanged: 87 Lexemes, 100 Senses, 99
  Classifications, 799 Provenance records, taxonomy 2.0.1, and no media, sets,
  or relations.
- The publication validator allows a valid APPROVED Master release whose
  nested review statuses do not make the current RELEASE projection complete;
  the transform correctly filters those children. Recommendation: retain
  separate release-approval and runtime-readiness gates. No validator contract
  was changed.
- This phase only audited and planned. No nested statuses or canonical records
  changed, no new revisions or Provenance IDs were created, no 2.2.1 directory
  was created, and there was no database connection, write, migration, importer
  apply, or production mutation. All owner authorization flags remain false.
- Evidence: [audit report](../vocabflow-dataset/reports/hybrid-100-runtime-eligibility-closure-2.2.1.md),
  [machine-readable workspace](../vocabflow-dataset/workspaces/hybrid-100-runtime-eligibility-closure/),
  and [US-45 runtime-import story](stories/US-45-master-vocabulary-v2-runtime-import-bridge.md).
- Verification: focused Phase 2G.1A tests pass (7/7); `pnpm
  validate:master-vocab-v2` passes with 0 errors, 0 warnings, and 1 info issue;
  `pnpm typecheck`, `pnpm lint`, and `git diff --check` pass. pnpm reports the
  local Node 22.19.0 is below the package's declared 22.23.2 engine. The next
  action requiring authority is nested child approval and patch release
  materialization; neither is authorized by this audit.

## 2026-10-06 — Phase 2G.1 Hybrid-100 Development reconciliation preflight

- Verified the frozen `2.2.0 / APPROVED` release and its JCS release hash
  (`c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d`);
  the release validator passes with 0 errors, warnings, or informational issues.
- A read-only connection verified the configured Neon Development target and
  migration/bridge readiness: all 19 current migrations and hashes match, and
  required bridge tables, columns, constraints, and write guards are present.
- Candidate discovery is **blocked before runtime catalog reads**. The
  transform's RELEASE projection emits 0/100 eligible Senses because the 100
  nested Vietnamese Translation rows are not APPROVED (98 DRAFT, 2 IN_REVIEW).
  PREVIEW emits 100 diagnostic rows but is ineligible and was not used for
  identity analysis. No child status was inferred and the frozen release was
  not changed.
- Runtime vocabulary, mappings, and learner aggregates were not queried. No
  owner decisions or candidate rows were generated. The owner template keeps
  all 100 decisions unresolved. The migration-only transaction was
  `REPEATABLE READ, READ ONLY`; no write, migration, apply, or production
  connection occurred. RC, Canary, canonical root, and taxonomy snapshots
  passed pre/post immutability checks.
- Evidence: [Phase 2G.1 preflight report](../vocabflow-dataset/reports/hybrid-100-development-runtime-reconciliation-2.2.0.md),
  [summary](../vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation/preflight-summary.json),
  [projection gate](../vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation/projection/transform-preflight-summary.json),
  and [migration state](../vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation/migration-state.json).
- Next gate: resolve the Translation lifecycle/projection mismatch in an
  separately approved source revision, then rerun the RELEASE projection and
  Development candidate scan. Owner reconciliation review remains later; this
  preflight does not authorize importer apply.

## 2026-10-06 — Master Vocabulary V2 Phase 2F.7 approved release freeze

- Materialized and froze the first official Hybrid-100 dataset release as
  `2.2.0 / APPROVED`, using the owner-authorized 2.2.0-rc.1 source, exact
  taxonomy-policy and final-manifest-plan fingerprints, and the approved CEFR
  fingerprint. The release contains 87 Lexemes, 100 Senses, 99 editorial CEFR
  Classifications, 799 Provenance records, and taxonomy snapshot 2.0.1.
- Materialized exactly 286 lifecycle-only approval revisions while preserving
  stable IDs and learner-facing content. Taxonomy 2.0.0 remains byte-identical
  and DRAFT; 2.0.1 is APPROVED with zero semantic diff. The canonical root stays
  `2.0.0 / DRAFT` with 103 Lexemes, 123 Senses, 219 Classifications, and 1,043
  Provenance records.
- The immutable RC 2.2.0-rc.1 remains unchanged. Canary 2.1.0 remains pinned to
  Git tree `f5d4e502be5106da191b5b2ab807f5db12065831` and committed-content
  fingerprint `718c211b8e668d25ffe4ba0c893bda3e73ce8bd2bf578d276ce9216c08c78b2f`;
  the earlier `2c75…4547` value is superseded evidence only. The official
  releaseHash and package tree fingerprint are frozen in release evidence.
- Rights remain unverified; no source text or media was reused and no media is
  bundled. At the time of this Phase 2F.7 freeze, runtime reconciliation/import
  had not begun. The later Phase 2G.1 preflight connected to Development in a
  migration-only read-only transaction and stopped before runtime scans. No
  production connection or mutation occurred. The runtime-import bridge story
  remains open.
- Evidence: [approved release report](../vocabflow-dataset/reports/hybrid-100-approved-release-2.2.0.md),
  [frozen package](../vocabflow-dataset/releases/hybrid-100-v2.2.0/), and
  [materialization summary](../vocabflow-dataset/workspaces/hybrid-100-approved-release/summary.json).

## 2026-10-06 — Master Vocabulary V2 Phase 2F.6A taxonomy policy closure

- Recorded the owner's taxonomy approval architecture decision: taxonomy
  `01a0fc13-09e9-72dd-b49d-ffef077385dd` version 2.0.0 remains immutable
  `DRAFT`; approval is planned as a new immutable 2.0.1 `APPROVED` snapshot
  using a `PATCH` bump. Semantic taxonomy change is prohibited and the future
  full-payload comparison must have zero diff; 2.0.1 has not been created, so
  that future comparison is not yet verified.
- Added taxonomy-specific PATCH/MINOR/MAJOR version policy and the exact
  approval semantic projection rule. Only top-level `taxonomyVersion`,
  `status`, `createdAt`, and `updatedAt` are excluded; nested child lifecycle
  statuses remain in the comparison.
- Pinned the unchanged 2.2.0-rc.1 fingerprints. The 87 Lexeme / 100 Sense / 99
  Classification next-revision plan and recomputed Provenance closure remain
  approval-only; final 2.2.0 is technically ready but final build authorization
  is still pending.
- No taxonomy 2.0.1, approved entity revisions, release 2.2.0, releaseHash,
  runtime import, database access/write, migration, or production mutation was
  performed. The Phase 2F.6A focused suite passes (7/7); the dataset validator
  passes (0 errors, 0 warnings, 1 informational issue); the deterministic
  audit reports ALREADY_MATERIALIZED twice with the same policy fingerprint;
  targeted ESLint and `git diff --check` pass. Root `pnpm typecheck` and
  `pnpm lint` report errors only in concurrent, uncommitted global-search UI
  files under `apps/web`; these changes are outside this phase and were left
  untouched. Root typecheck also required rebuilding the existing workspace
  contract declarations from the concurrent `packages/contracts` source edit.
  The local Node 22.19.0 runtime emits the package's Node 22.23.2 engine warning.

## 2026-10-05 — Simplified App Navigation (Feature #13 / US-50)

- Replaced the oversized primary nav with exactly six desktop destinations:
  Trang chủ, Từ vựng, Học tập, Tiến trình, Yêu thích, Cài đặt. Below 1024px,
  the sidebar is replaced with a fixed bottom bar containing the first five.
- Added responsive account controls on the sidebar/header with Người học and
  Cài đặt menu links, keyboard focus/arrow/Escape handling and outside-click
  dismissal. Study Setup is the Học tập link; active state covers `/study` and
  `/study/exercises`, while auxiliary routes have no unrelated active item.
- Preserved auxiliary paths. Weak Words is linked from Home's due stat; Topics
  from Vocabulary and Progress; Learning Sets from Home; Learners from the
  account menu and existing Home learner switcher. No Home redesign or API
  request was introduced.
- Updated US-44's older instruction to hide AppShell navigation during Study;
  the question/task remains focused inside the shared shell.
- Validation: focused regressions 14 files / 207 tests PASS; `pnpm typecheck`,
  `pnpm build`, changed-feature ESLint and `git diff --check` PASS. Browser
  checks at 1440px/768px/390px confirmed the responsive model, bottom-nav
  clearance, no horizontal overflow and mobile account-menu open.
- No Dataset V2 file staged or edited for this feature. No API, DB, migration,
  database mutation or deployment performed. Feature files await final
  owner-check/commit workflow.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4C readiness metadata consistency

- Corrected the full CEFR release-readiness generator so root and CEFR gate
  owner scopes both state `FULL_HYBRID_100_CEFR_COHORT`. Rebuilt the four
  blockers and recommendation for the completed 100/100 review; no blocker now
  says 95 decisions remain pending or asks to resolve the closed review queue.
- Promotion readiness remains YES while canonical promotion authorization,
  release authorization, runtime authorization, production authorization, and
  approved-release readiness remain NO. No CEFR values, decision states,
  Classification IDs, or Provenance IDs changed.
- The full CEFR fingerprint is now
  `d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622`.
  It supersedes `5c2132d01b43a7539d1b7745bf4d65bafe498c13e5fc332437c9ab0b46812dfd`
  because release-readiness metadata is an input to the fingerprint; only the
  root scope, blockers, and recommendation were corrected.
- Master validator PASS (0 errors, 0 warnings, 1 informational DRAFT issue);
  focused Phase 2F.4B/2F.4C tests PASS (11/11; the historical 2F.4A-only suite
  is skipped after full closure); approval `--check`, typecheck, ESLint, and
  `git diff --check` PASS. Local Node is 22.19.0 while the package requests
  22.23.2. Canonical Master, root dataset manifest, releases, runtime,
  database, and production were not mutated.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4B full CEFR owner approval

- Owner-approved the exact 95 rows pending from the pinned Phase 2F.4A
  closure. All 100 decisions are now resolved: 99 classified and fuse remains
  intentionally unclassified. Final decisions are 1 reuse, 1 revision plan,
  97 new editorial classifications, and 1 unclassified; distribution remains
  A1 17, A2 28, B1 20, B2 27, C1 7, unclassified 1.
- Added 95 stable workspace `OWNER_REVIEW` provenance IDs and no Classification
  IDs. Workspace provenance totals are 98 `PROJECT_AUTHORED` and 99
  `OWNER_REVIEW` (197 total), covering all 99 classified/reused outcomes.
  Water reuse has workspace governance evidence without a canonical rewrite;
  fuse has no Classification provenance. Full owner-approved fingerprint:
  `5c2132d01b43a7539d1b7745bf4d65bafe498c13e5fc332437c9ab0b46812dfd`.
- Canonical Classification promotion readiness is YES; canonical promotion
  has NOT occurred and approved release readiness remains NO. No release,
  runtime import, database operation, or production change occurred. The
  Phase 2F.4A light predecessor report now renders its pinned SHA-256 from
  metadata. Source/media rights remain unverified; no official CEFR claim is
  made.
- Master validator PASS (0 errors, 0 warnings, 1 informational DRAFT issue),
  Phase 2F.4B focused regression tests PASS (9/9), typecheck PASS, ESLint PASS,
  deterministic rerun PASS, and `git diff --check` PASS. Local Node is
  22.19.0 while the package requests 22.23.2.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4A CEFR owner exception closure

- Closed exactly five owner-reviewed CEFR exceptions in the workspace: light
  A1 as a revision-2 plan under its existing Classification ID, freshman B2,
  roster B2, liable C1, and fuse intentionally unclassified for insufficient
  evidence. The other 95 editorial decisions and their general
  `PENDING_OWNER_REVIEW` statuses remain unchanged.
- Final outcomes: 1 reused classification, 1 planned revision, 97 new
  editorial classification decisions, 1 intentionally unclassified, and 0
  exception-queue items awaiting owner review. Values are present for 99/100;
  distribution is A1 17, A2 28, B1 20, B2 27, C1 7, unclassified 1.
- Added three stable UUIDv7 Classification IDs and eight provenance IDs
  (four project-authored and four `OWNER_REVIEW`). Light revision 1 remains
  byte/content pinned at A2 / `IN_REVIEW`; revision 2 is a workspace-only
  DRAFT plan. Closed-package fingerprint
  `ec0a6e34556a3d484dbdd608e592b912cb8c4ff2ceafdbe46b9cac02ea23b18f`
  repeated with zero new IDs allocated on rerun.
- CEFR editorial decision gate PASS; the exact cohort has 100 resolved
  outcomes and 99 values. Content cohort ready YES; canonical Classification
  promotion readiness NO; approved release ready NO. Source/media rights
  remain unverified and no official CEFR/source claim is made.
- No canonical classifications, semantic records, dataset manifest, or
  releases changed. No runtime/import scanner, database, migration, or
  production operation occurred. Master validation PASS (0 errors, 0
  warnings, 1 informational DRAFT issue); Phase 2F.4A regression tests PASS
  (9/9), typecheck, full ESLint, and `git diff --check` PASS. Local Node is
  22.19.0 while the package requests 22.23.2.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.4 CEFR editorial draft

- Added a deterministic, offline CEFR classification workspace for the exact
  owner-approved 100-Sense semantic cohort under `CEFR / EDITORIAL-PILOT-1`.
  The package audits existing classifications, reuses the matching water A2
  record, holds four assignments for owner review, leaves one 4600-only Sense
  unclassified, and drafts 94 new Classification/PROJECT_AUTHORED provenance
  records. All new records remain workspace-only DRAFT artifacts.
- CEFR proposal distribution: A1 17, A2 28, B1 21, B2 27, C1 6, unclassified
  1. Oxford-backed evidence agrees with 48/90 proposals (53.3%); 39 are
  editorial adjustments and 3 require owner review. The 4600-only row with a
  defensible estimate was decided independently of source CEFR.
- Fingerprint `2da4c57ebbd18ce5e2c1fa77749fb7fe79a2f22752ba39506d2f59a7d7804a74`
  repeated; rerun allocated zero IDs. Semantic promotion remains canonical
  DRAFT at 2.0.0/schema 2.0.1 (103 Lexemes / 123 Senses / 846 Provenance).
  No canonical classifications were added, no release was created, no runtime
  import or database write occurred, and production was untouched. Source and
  media rights remain unverified.
- Readiness: content cohort YES; approved release NO. Recommend building a
  100-Sense release candidate only after owner review, then assess expansion to
  500. This is analysis, not execution. First-pass corrections remain 24/98
  (24.49%), so the larger authoring batch should follow the 100-Sense release
  workflow review.
- Evidence: [classification draft report](../vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md),
  [owner review sheet](../vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md),
  [Phase 2F.4 workspace](../vocabflow-dataset/workspaces/hybrid-100-cefr-draft/).
- Verification: focused regression tests 13/13 PASS; workspace materialize and
  `--check` PASS with the same fingerprint and zero rerun IDs; Master validator
  PASS (0 errors, 0 warnings, 1 informational DRAFT issue); typecheck, full
  ESLint, and `git diff --check` PASS. Local Node is 22.19.0 versus the
  package's 22.23.2 engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.3 canonical promotion

- Recorded the owner's explicit approval for the exact 100/100 Phase 2F.2A
  draft fingerprint `a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d`,
  scoped to canonical DRAFT promotion only. The prior owner-review artifact and
  frozen identity registry remain unchanged.
- Promoted 84 new Lexemes and 98 new Senses with the existing allocated IDs.
  Two existing Sense decisions remain reuse-only; three new Senses attach to
  the existing light/reservation Lexemes without rewriting them. All promoted
  records and linguistic children remain DRAFT.
- Added 590 provenance records: 490 `PROJECT_AUTHORED` records covering Sense
  labels and learner-facing children, plus 100 `OWNER_REVIEW` records for the
  candidate decisions. No `LICENSED_SOURCE` or `PUBLIC_DOMAIN_SOURCE` records
  were added; external source/media rights remain unverified.
- Root dataset remains DRAFT at datasetVersion 2.0.0 / schemaVersion 2.0.1.
  Canonical manifest totals are 103 Lexemes, 123 Senses, and 846 Provenance
  records. No Classification, media, pronunciation, release, runtime import,
  database, migration, or production change was made.
- Promotion plan fingerprint:
  `5c10618ee72fcc7b99b270764e412ebc51f286eadc750e45a6910830bb15e870`.
  The post-apply `--check` reports materialized, zero canonical diff, and zero
  provenance IDs to allocate on rerun. Source-overlap evidence and semantic
  content match the approved workspace. The local canary tree was byte-identical
  before and after this promotion; existing local canary edits were preserved.
- Validation: canonical Master validator PASS (0 errors, 0 warnings, 1
  informational DRAFT note); focused promotion tests 14/14 PASS. Typecheck,
  ESLint, and `git diff --check` are recorded with the final commit. Local Node
  is 22.19.0 while package.json requests 22.23.2.
- Evidence: [canonical promotion report](../vocabflow-dataset/reports/hybrid-100-canonical-promotion.md)
  and [US-45](stories/US-45-master-vocabulary-v2-runtime-import-bridge.md).

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1A source-proof gate correction

- The prior proof had a real contradiction: coverage evaluated the internal
  `_structuredGroup` bit and found two selected Oxford note-level fallbacks,
  while the generated report hardcoded an “all structured” claim. Candidate
  sanitization omitted the bit, so the stable `sourceSenseGroupReference`
  could not distinguish true structured groups from generated fallback refs.
  Separately, the editorial-ready flag depended only on the 100-candidate
  count.
- Replaced the two verified fallback candidates deterministically in their
  existing Oxford+4600 / CEFR cells. POS distribution, Master collision
  status, polysemy membership, and lexical-unit type were preserved. The
  remaining 88 Oxford selections and 10 4600-only candidates are unchanged.
  New candidate IDs: `SOURCE-CANDIDATE-616c853e98fddfbade0001ee43b364e6b5ef6b6ad73efcee81897818e81720b5`
  and `SOURCE-CANDIDATE-9778e99282e13db6006303903ab40a2205f4940ea2b8333cb59b2da97111783c`.
- Sanitized candidates and crosswalks now include `senseSegmentationStatus`;
  parser contract `APKG-SOURCE-PROOF-3` versions this proof change. Readiness
  requires source/APKG verification, 100 candidates, 90 structured Oxford
  candidates, polysemy/media/dedup/selection gates, deterministic repeat, no
  committed raw content, zero allocated Master IDs, no canonical mutation,
  and zero database writes. Rights remain NO and block source reuse, but do
  not block independently authored editorial content. Alignment need not be
  100%; ambiguous cases require human/editorial review.
- Real source proof fingerprint repeated as
  `89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc`.
  Coverage: 90 structured / 0 fallback; 70/20/10 source split; 18 per CEFR;
  12 polysemy pairs; 55 multi-sense Lexemes; five Master collision candidates.
  Editorial authoring and Phase 2F.1A gates are YES. Source/media reuse remain
  NO; no database, Master, or media mutation occurred.
- Verification: focused source-proof tests 15/15; Master validator PASS (0
  errors, 0 warnings, 1 informational DRAFT issue); typecheck PASS; lint PASS;
  and `git diff --check` PASS. pnpm reports local Node `22.19.0` versus the
  declared `22.23.2` engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.2A editorial QA

- Reviewed all 100 candidate decisions and all 98 authored Sense drafts against
  semantic target, POS, labels, Vietnamese equivalents, definitions, examples,
  translations, sibling meanings, and language quality. Resolved 24
  candidate-level issue groups, including the five requested checks plus two
  additional source-target mismatches found in crawl and compelling.
- Rechecked all 90 Oxford-backed candidates against their pinned structured
  groups in the ignored raw cache, including POS, and reviewed the ten
  4600-only meanings as independent coherent senses. Confirmed 2/2 exact-enough
  existing Sense reuse decisions, 3/3 distinct new Senses on existing Lexemes,
  and all 12 polysemy blocks.
- Re-ran materialization twice. Draft fingerprint is
  a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d;
  the identity registry hash is unchanged and rerun UUID allocation is zero.
  Source overlap passes: zero exact English matches, zero overlaps of eight or
  more contiguous tokens, and zero unresolved high-similarity cases.
- The owner decision sheet recommends APPROVE_DRAFT for 100/100 candidate
  decisions. This is a Codex recommendation only:
  OWNER_FINAL_APPROVAL = PENDING and canonical promotion is not authorized.
  The canonical Master, root dataset manifest, and canary release are
  unchanged; no database, import, migration, production, or media operation
  occurred.
- Verification: focused Phase 2F.2/2F.2A tests 16/16, workspace validator
  PASS, root Master validator PASS (0 errors, 0 warnings, 1 informational
  DRAFT issue), typecheck PASS, full ESLint PASS, and git diff --check PASS.
  Local Node is 22.19.0 versus the declared 22.23.2 engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1 hybrid 100-Sense source proof

- Added a dependency-free Python APKG parser and synthetic fixture suite. It
  recomputes source identities from the local Oxford and 4600 packages, reads
  Anki collection/model/note/card metadata and the media map, and keeps complete
  raw note fields only in the ignored `.vocabflow-local` cache.
- Generated the separate sanitized
  `vocabflow-dataset/workspaces/hybrid-100-sense-proof` package and report.
  The exact sample is 70 Oxford + 4600 headword matches, 20 Oxford-only and 10
  4600-only authoring candidates; the 90 Oxford-backed Senses are 18 per CEFR
  level. The sample meets POS minima and has 68 Senses from 55 multisense
  Lexemes, including 12 paired Lexemes, plus 5 multiword candidates.
- Semantic alignment remains evidence-based: 34 `ALIGNED`, 3
  `HEADWORD_ONLY`, 33 `AMBIGUOUS`, 20 `NO_MATCH`; all 10 4600-only candidates
  require later semantic authoring. The selected sample references five
  existing Master candidates by identity and meaning audit; no new Master IDs
  were allocated.
- Recorded 99 selected technical media candidates with sanitized member
  references, sizes, SHA-256 values and detected/declared types. Example audio
  has a separate Example candidate; images receive a Sense target only after
  semantic alignment. Source/media rights remain unknown and every media item
  is non-shippable.
- Two independent real-source passes produced fingerprint
  `276a2c39e311cb9f434976dd4b22f06d2db2f335b8b882b0bdfb2e6af3eb6323` both
  times. The canonical Master is unchanged; the development canary remains
  `VERIFIED`; production is unchanged and bulk runtime import has not started.
- Verification: synthetic fixtures 10/10, Master validator 0 errors / 0
  warnings / 1 informational DRAFT issue, typecheck PASS, lint PASS, and
  `git diff --check` PASS. Local Node is 22.19.0 versus the declared 22.23.2.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.6 development canary closure

- Added a dedicated read-only post-apply verifier. The target-verified
  development run passed all checks: 19/19 migrations through
  `0018_panoramic_spirit`, eight exact Master mappings and fingerprints, the
  Technology Starter #17 algorithm membership, one matching import ledger row,
  and an all-NOOP current plan with zero issues.
- Frozen release 2.1.0 / schema 2.0.1, reconciliation JCS hash, pre-apply plan
  fingerprint, and import run remain unchanged. The scanner's post-apply
  snapshot mismatch is classified as stale pre-apply evidence only after the
  dedicated verifier passes; the importer's pre-apply stale-snapshot guard is
  unchanged.
- Apple #295 and record #849 remain unmapped and untouched. The prior canary
  evidence records preserved runtime enrichment and unchanged learner history.
  This phase performed no database writes, APPLY, migrations, or production
  connection. Production import remains unauthorized; bulk ingestion has not
  started. The 100-Sense hybrid proof gate authorizes only offline package work.
- The sanitized closure report is
  `vocabflow-dataset/reports/master-v2-development-canary-closure.md`.
- Focused validation passed: 8 test files / 83 tests, Master V2 validation
  (0 errors, 0 warnings), root typecheck, lint, and `git diff --check`. The
  local Node 22.19.0 version is below the repository's declared 22.23.2.

## 2026-10-04 — Feature #11 Progress Dashboard

- Progress Dashboard implementation is in progress. The prior audit confirmed
  learned = unique materialized learner progress rows; Mastered = current
  `MASTERED`; accuracy = persisted `REMEMBERED / (REMEMBERED + FORGOTTEN)` by
  household-local `review_date`; current streak reuses Activity Summary.
- `/progress` now has four evidence-based metrics, 7/30-day URL period
  selection, grouped activity/accuracy charts with blank no-review dates, and
  active-learning-set level coverage plus started Topic coverage.
- Progress Summary adds a set-based `progressByLevel` aggregate. The dashboard
  no longer calls the Gamification GET path because achievement reconciliation
  writes. No migration or database mutation is part of this change.
- Focused validation passed: 10 test files / 107 tests, the `apps/web`,
  `apps/api` and `packages/contracts` project-reference typecheck, production
  build, feature-file ESLint and `git diff --check`.
- Root `pnpm typecheck` initially exposed five errors in the new
  `scripts/master-vocabulary-v2-post-apply-verification.ts`; Phase 2E.6 fixed
  them, and the final root typecheck passes. The dashboard edits remain
  unrelated and are excluded from the Phase 2E.6 commit.
- Do not stage, commit, or alter unrelated unstaged/untracked Dataset V2 work
  and do not alter stashes.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.5 development canary APPLY

- Executed exactly one owner-authorized APPLY against the verified development
  Neon target `shy-hill-72364426 / br-square-grass-b3af0nte / neondb`, using the
  runtime role. No production, test/shared-CI target, migration, or learner
  assignment was touched.
- Release `2.1.0` remained immutable at
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`. The
  reviewed reconciliation JCS hash remained
  `75f67d20edc771c931e8cbf1d70118e339374c22f35a5d062160bca3f489efb2`; the
  exact pre-apply scan and plan fingerprints were `d4e4c7cb…0235a0`,
  `18b80a1a…7257f4`, and `4ffcb88e…d8718b` respectively.
- The committed import updated apple #1, bank-financial #871, and reservation
  #284; created bank-river #2025, record-noun #2026, record-verb #2027,
  look-after #2028, and algorithm #2029; and created Technology Starter #17
  with algorithm at position 1. Versions are 3, 2, 2, and 1 for each new row.
- Post-apply verification found 8/8 release mappings and a fresh read-only plan
  with 8/8 vocabulary actions `NOOP`. Import run
  `de0b29c4-db84-4d76-abd4-398f17151099` is recorded once. Runtime enrichment
  was preserved. Apple #295 and vinyl record #849 remain unmapped and unchanged;
  Apple consolidation remains future owner work.
- Progress and review aggregates stayed at 87 and 229. The apply plan reports
  zero mapped history references, deletions, or learner assignment changes;
  the import adapter has no write path for learner progress, review events, or
  learner Learning Set assignments. No API smoke request was made because the
  catalog routes require an authenticated learner session; direct read-only
  runtime catalog verification passed.
- Post-apply scan observed the expected changed runtime snapshot
  (`34b43959…54c4296`) and refused the old owner-proposal snapshot pin. The
  human-owned reconciliation was left unchanged; a separate read-only planner
  against the verified live snapshot returned 8 NOOP actions. No second APPLY
  was run.
- Focused validation passed: 7 test files / 100 tests, Master V2 validation,
  and `git diff --check`. Root typecheck and lint report errors in unrelated,
  concurrent progress-dashboard edits under `apps/api`, `apps/web`, and
  `packages/contracts`; these files were not included in the canary evidence.
- Sanitized evidence:
  `vocabflow-dataset/reports/canary-development-apply-verification.md`.
  Generated scanner artifacts and APKG analysis files remain unstaged.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4D final reconciliation V3

- Reverified the development Neon target, 19/19 migration rows through
  `0018_panoramic_spirit`, and zero migration hash mismatches. The scanner and
  importer used read-only repeatable-read snapshots.
- Re-reviewed the pinned scan change: the refreshed candidate evidence adds one
  review event to duplicate Apple #295 (count 1 → 2); the explicit owner choice
  continues to map Apple to #1 and leaves #295 untouched. Repeat scans before
  and after the final planner returned the same current fingerprint.
- Finalized the human-owned V3 artifact at the architecture's stable path,
  `vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json`, pinned to
  the current target, source contracts, release hashes, and scan fingerprints.
  Added release-root resolution and development snapshot evidence checks to
  the importer so the release artifacts and package-level owner file work
  together and stale evidence blocks planning.
- Final DRY_RUN: 3 mapped updates, 5 vocabulary creates, 1 Learning Set create,
  1 algorithm membership insert; `reconciliationComplete=true`, `canApply=true`,
  0 issues. Plan fingerprint:
  `4ffcb88ef47c9bdaf3d3dc7d36092fa55e7dec0d4a01417aac97c53d90d8718b`.
  Mapped runtime enrichment is preserved. #295/#849 are unchanged; no history,
  learner assignment, runtime ID, or run-ledger mutation is planned.
- Validation: 8 focused files / 93 tests, typecheck, lint, base and release
  dataset validation passed. No DB writes, migration execution, or import APPLY.
  The APKG analysis files remain untouched and excluded.
- Full plan and preservation audit:
  `vocabflow-dataset/reports/canary-development-final-apply-plan.md`.

## 2026-10-04 — Due-first study queue without a New-mode hard gate

- Removed the backend gate in `apps/api/src/review-queue.ts` that suppressed
  NEW items once at least 20 items were due. Available NEW items now accompany
  DUE items up to the remaining `daily_new_word_limit`; DUE remains first in
  mixed ordering. Daily Goal columns are not read for queue admission.
- Study Setup already derives mode availability from the scoped queue, so the
  API fix enables New beside due reviews without changing the UI or default
  mode. Review remains DUE-only; New remains NEW-only. Saved-all retains every
  item and its NEW/DUE/VOLUNTARY classification, ordered DUE → NEW → VOLUNTARY.
- Updated US-08/US-14, product, architecture and flow documentation. Regression
  tests cover due/new availability, hard quota, mode filters, mixed priority,
  Saved VOLUNTARY and existing Study/Continue Learning/Daily Goal behavior.
- Validation passed: 9 focused test files / 131 tests, `pnpm typecheck`,
  `pnpm build`, ESLint on changed TypeScript feature files, and
  `git diff --check`. No migration, database mutation, or deployment occurred.
  Dataset V2 changes remain separate and unstaged.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4C migration 0018 preflight

- Used the clean local worktree at `c15dff2`; the primary local `TXH` checkout
  remained at `d9012af` with its two unrelated APKG analysis files untouched.
- The protected Neon development target and post-connect identity matched the
  configured project, branch, database, and `vocabflow_migration` role. Ledger,
  schema, and aggregate learner count were read in one `REPEATABLE READ, READ
  ONLY` transaction. No personal learner fields were selected.
- Development already has all 19 migrations through `0018_panoramic_spirit`.
  Every ledger digest matches canonical source SQL; the 0018 ledger row is the
  accepted CRLF serialization of the same source. Its current-worktree Drizzle
  hash is `eec77c49abbad9a2ea0a69fead9409e0b817978fd3ff3df95b09a55575b114ed`.
- Both daily goal columns and their defaults, NOT NULL properties, and 1–100
  checks match the application schema. The migration is additive and does not
  touch Master V2 runtime tables. The aggregate learner profile count was 8.
- Pre-apply decision: `0018` is already applied, with no pending migrations or
  schema/ledger drift. Do not apply it again. Accordingly, the exact-pending
  preflight gate and `PHASE_2E4C_READY` are NO. Database writes, migration
  execution, and import APPLY by this phase were none. Canary 2.1.0 validated
  offline with zero errors or warnings. Details and test results are in
  `vocabflow-dataset/reports/canary-development-migration-0018-preflight.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4B migration hash audit

- Confirmed Drizzle ORM 0.45.2 hashes each complete migration file as UTF-8
  text from the checked-out working tree. It preserves line endings, a terminal
  newline, and a UTF-8 BOM. Git SQL blobs did not change from `7e76daa` to
  `b5b22e3`.
- The 2E.3 six mismatches and 2E.4A seventeen mismatches were caused by
  worktree CRLF conversion. All 18 ledger hashes match one exact Drizzle hash
  representation of the same source (LF for 17, CRLF for 0004); no historical
  SQL-content mismatch remains. The verifier now checks LF, CRLF, and bare-CR
  serializations while preserving every other content byte.
- Re-ran the verified development scan in REPEATABLE READ / READ ONLY mode:
  18/18 migration rows present, 0015–0017 verified, catalog discovery and
  runtime snapshot ready. The comparable Phase 2E.3 fingerprint is unchanged
  at `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`;
  the 2E.4A full-snapshot planner hash uses a different snapshot shape.
- The current `TXH` head also contains migration 0018 from a later daily-goals
  commit; the development ledger remains at 18 rows. This audit used the
  isolated `b5b22e3` 18-migration baseline and did not execute 0018. A new scan
  against the current TXH chain must stop before catalog discovery until that
  migration is handled through the trusted process.
- Canary release content and release hash remain unchanged. App Import files
  from 2E.4A remain unchanged; only analysis-only candidate/proposal/review
  evidence was regenerated.
  Apple #1/#295 remain unresolved, the human-owned reconciliation is untouched,
  and `canApply=false`.
- Added regression coverage for line-ending equivalence, SQL edits, appended
  content, terminal newline, and BOM. Focused migration/scanner checks,
  typecheck, lint, and diff check pass. No migration, DB write, import APPLY,
  runtime mutation, production connection, or Cloudinary operation occurred.
  See `vocabflow-dataset/reports/canary-development-migration-hash-root-cause.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4A runtime preservation policy

- Implemented `app-import-v3`, `runtime-vocabulary-projection-v2`, and
  `runtime-reconciliation-v3` without changing the dataset schema, Master
  identity/revisions, or 2.1.0 release hash. App Import distinguishes the raw
  `masterProjectionFingerprint` from the planner's effective runtime
  fingerprint.
- Added field ownership and `SET` / `PRESERVE` / explicit `CLEAR` operations.
  Null/absent IPA, image, audio, legacy topic, and level preserve existing
  runtime enrichment on mapped rows. CREATE_NEW starts from the exact Master
  projection. `clearFields` can clear only nullable fields when Master is null
  or absent. Vietnamese override and image quarantine retain their separate
  explicit policies.
- The plan now shows before, raw Master, operation, after, API-visible
  `effectiveProjection`, and deterministic outcomes. The persisted JCS
  fingerprint describes that effective result; `contentVersion` increments
  once only if that result changes. Added explicit preservation, clear,
  override/quarantine, create, version and replay regressions.
- Regenerated only the derived App Import projections and generated
  reconciliation-template metadata for immutable canary release 2.1.0. Its
  source `dataset.json`, pinned Master records, schema version and release hash
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591` remain
  unchanged.
- Read-only planner previews used development target
  shy-hill-72364426 / br-square-grass-b3af0nte / neondb; snapshot fingerprint
  `fa8941ef8a458b58b6c2b548a50a1db5618221d4115d4d6f6ef914c2931c5d5d`.
  Temporary apple #1 and #295 scenarios both preserve their existing runtime
  enrichment and remain alternatives, not owner decisions. The checked-in
  human reconciliation still returns `canApply=false` and all eight Sense
  decisions remain unresolved.
- A fresh migration read-only check found 18/18 ledger entries but 17 local
  migration hash mismatches, including 0015–0017; it stopped before catalog
  discovery. The planner's code path does not read this ledger when computing
  `canApply`, which does not classify the drift as safe. The prior Phase 2E.3
  field-loss audit remains intact.
- Focused planner, transform and release-builder suites pass: 3 files / 50
  tests. `pnpm typecheck`, `pnpm lint`, and `git diff --check` pass. Local Node
  22.19.0 emits the repository's Node 22.23.2 engine warning. No database
  write, APPLY, migration, owner choice, APKG access or media operation
  occurred. See the preservation preview, policy comparison, and migration
  drift scan in `vocabflow-dataset/reports/`.
## 2026-10-04 — Feature #10 configurable daily learning goals

- Replaced the active single aggregate goal with learner-specific persisted
  targets: 10 new words and 20 review words by default. The existing scheduler
  hard cap remains unchanged; due reviews remain uncapped.
- Activity Summary derives distinct new/review counts from persisted review
  events by household-local review date; overall completion requires both
  targets. Home shows category progress, composite ring and the existing
  persisted streak. Settings API/UI save and reload per learner.
- Added additive migration `0018_panoramic_spirit.sql`; it has not been applied.
  No database mutation or production connection was made.
- Focused validation passed: 11 files / 153 tests. Contracts/API/web project
  typecheck, production build, feature ESLint and `git diff --check` passed.
- Repository-wide `pnpm typecheck` is blocked by 9 missing projection fields
  in the separately changing Dataset V2 planner. That file and Dataset V2
  reports remain untouched and unstaged; commit/push were withheld because the
  full validation gate did not pass.
- Migration remains unapplied; no database mutation, production access or
  deployment occurred.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.3 final owner reconciliation preparation

- Re-ran the development reconciliation scanner through provider/target
  verification and a REPEATABLE READ / READ ONLY snapshot. Target remains
  shy-hill-72364426 / br-square-grass-b3af0nte / neondb; fingerprint
  464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b matches
  Phase 2E.2. The approved 2.1.0 release identity and scope are unchanged.
- Apple #1 and #295 remain the same fruit Sense with separate history and
  memberships; the overlapping learner count is 1. Apple choice remains
  unresolved. Added an owner decision sheet and a field-by-field projection
  loss audit, including nulling existing IPA/media/legacy-topic fields under
  UPDATE_TO_MASTER.
- Added a contract-shaped, analysis-only owner-ready file with current release
  metadata, snapshot fingerprint and runtime candidate IDs. All decisions stay
  unresolved and the planner rejects it at the ownership gate. The root
  human-owned reconciliation remains unchanged and is still for 2.0.0.
- A temporary planner simulation accepted the seven non-Apple proposals and
  left Apple unresolved: no non-Apple structural issues were found. The current
  planner returns canApply=false until the owner completes reconciliation.
- Reconfirmed 18/18 migration rows, exact 0015–0017 hashes, and six historical
  hash mismatches. The planner does not enforce historical ledger hash
  equality; this remains a separate integrity concern, not a safety finding.
- Focused Dataset V2 suites pass 91/91; typecheck and repository ESLint pass.
  Local Node 22.19.0 emits the repository's Node 22.23.2 engine warning.
  No database mutation, import APPLY, migration, history merge, ID allocation,
  Cloudinary operation, APKG use, or API/UI change occurred.
- Evidence: vocabflow-dataset/reports/canary-development-final-reconciliation-readiness.md,
  canary-development-final-owner-decision-sheet.md, and
  canary-development-projection-loss-audit.md.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.2 owner reconciliation review

- Re-verified the approved 2.1.0 release against the development Neon target and
  refreshed the snapshot in REPEATABLE READ / READ ONLY transactions. The
  targeted apple audit found both rows reachable through current catalog/topic
  flows, distinct Learning Set memberships, and one learner with progress on
  both IDs (`DUPLICATE_LEARNER_HISTORY`). No learner identifiers were selected.
- Added the analysis-only owner proposal and detailed review report. Apple
  options A/B/C remain unranked; the other seven Sense proposals and
  Technology Starter CREATE_NEW proposal remain `ownerDecision=UNRESOLVED`.
  The human-owned reconciliation file and all runtime/API data remain
  unchanged.
- Reconfirmed six historical migration hash mismatches with all 18 rows present
  and 0015–0017 matching. The planner does not check this ledger when computing
  `canApply`; the drift remains a separate unresolved integrity concern, not
  classified as harmless.
- No database mutation, import APPLY, migration, history merge, mapping change,
  ID allocation, Cloudinary operation, or Study UI/API change occurred. Focused
  scanner/proposal/planner tests: 26 passing. Master validator, TypeScript,
  repository ESLint, and `git diff --check` pass; validator reports 0 errors,
  0 warnings, and one informational DRAFT issue.

## 2026-10-03 — Continue Learning Home card (US-47)

- Audit: the previous Home card previewed `reviewQueue.queue[0]` and linked to
  unscoped Study Setup. Study queue/index/mode are in-memory React state only;
  there is no runtime persisted incomplete session or exact-resume endpoint.
- Added one authenticated, read-only learner summary API. It selects a
  partially learned active assigned Learning Set, eligible Topic, or Saved
  scope using that scope's own enabled vocabulary and learner statuses. Topic
  membership now intersects enabled Topic words with active-set vocabulary,
  matching Study Setup's actual scope. Latest `review_events.reviewed_at` ranks
  candidates heuristically; source collection is not persisted. Deterministic
  Set → Topic → Saved/sort-order/ID ordering breaks ties and missing timestamps.
- Home changes are isolated to the existing Continue card and its styling. Its
  CTA preserves Topic/Set/all-saved scope in Study Setup; no mode or exact
  session is fabricated. When there is no candidate or the summary fails, the
  card keeps the queue fallback and has a local retry. Home requests no
  vocabulary catalog for this block.
- Focused regressions pass: 9 files / 92 tests. `pnpm typecheck`, `pnpm build`,
  ESLint on changed Home/API/contracts TypeScript, and `git diff --check` pass.
  Build has existing dynamic-import and bundle-size warnings; local Node is
  22.19.0 versus pin 22.23.2.
- Dataset V2 and other unrelated changes in the shared workspace were left
  untouched and will remain unstaged. No database mutation, merge, or
  deployment.

### 2026-10-03 — Continue Learning Topic-domain correction

- Confirmed Study Setup obtains the learner's default review queue (active
  Learning Set membership), then intersects queue vocabulary IDs with Topic
  membership. The former Continue Learning query only checked that a Topic had
  one active-set word, then counted every enabled Topic word (for example,
  3/23 instead of 3/5).
- Topic candidate members now use enabled Topic vocabulary ∩ enabled active-set
  vocabulary. Learner status is aggregated only over that intersection, so
  outside-set progress cannot create or distort a Topic candidate.
- Latest review events are pre-aggregated once per learner vocabulary and then
  joined to collection members; the existing learner/vocabulary/reviewed-at
  index is used, with no migration. This time is still only a heuristic because
  events do not store collection provenance. Home now says “Hoạt động gần
  nhất”; exact session/source resume remains unsupported.
- Focused Home, Topic/progress, Learning Set, Study Setup/queue and Continue API
  tests pass: 9 files / 95 tests. `pnpm typecheck`, `pnpm build`, feature
  ESLint, and `git diff --check` pass. No DB mutation or deployment.
- Dataset V2 changes in the shared working tree were preserved and not staged.

## 2026-10-03 — Saved Vocabulary all-saved study scope (US-46)

- Root cause: the Saved Words CTA entered the ordinary saved queue, which
  correctly returned only NEW and genuinely DUE records. Saved LEARNING or
  MASTERED records with future review dates were therefore excluded, leaving
  Study Setup empty for a saved collection containing only those states.
- Added an explicit `saved=1&content=all` Study Setup intent backed by a
  learner-authorized saved collection query. All enabled saved words are
  candidates; NEW and DUE keep their real classifications and not-due existing
  progress is VOLUNTARY practice. Normal New/Review/Mixed semantics and the
  canonical revision-checked review scheduler remain intact. Study and Summary
  Continue preserve the all-saved intent, and selection is capped/deduplicated.
- Focused Saved Words, Study Setup, queue API, review API, study queue, Study
  Session, and Summary tests pass: 6 files / 97 tests. `pnpm typecheck`,
  `pnpm build`, feature ESLint, and `git diff --check` pass. Build reports the
  repository's existing dynamic-import and bundle-size warnings; local Node is
  22.19.0 versus the 22.23.2 pin.
- No learner database was queried or mutated. Commit/push results will be
  recorded after completion.

## 2026-10-03 — Master Vocabulary V2 canary editorial correction

- Created Sense revision 2 for apple — fruit, record — noun/music recording,
  and reservation — booking. Stable Sense and corrected child IDs are retained;
  revision 1 files remain unchanged. The DRAFT manifest pins the new JCS hashes,
  and the App Import preview, review package, approval template, release plan,
  and reconciliation candidates were regenerated offline.
- The five other canary Senses were verified unchanged. All owner decisions are
  still `PENDING`; the human-owned runtime reconciliation file is unchanged.
- Master validator: 0 errors, 0 warnings, 1 informational DRAFT issue;
  validator tests pass 30/30. Transform tests pass 23/23 in isolation;
  canary preparation/release-builder tests pass 2/2. Eleven Phase 2D.1 bridge
  tests pass with the known stale migration-index assertion skipped. TypeScript
  and ESLint pass. The broader focused run reported 63 passing tests, one stale
  migration-index assertion (expects 0016 while this branch now includes 0017),
  and a transform timeout under concurrent load; the isolated transform rerun
  passed. No runtime, database, Neon, migration, media, reconciliation
  decision, or Study UI change was made.

## 2026-10-02 — Saved Vocabulary (US-46)

- Owner explicitly started Feature #8. Audit found no prior persistence, API,
  or favorite state; learner ownership is the existing progress boundary.
- Implemented a new learner-to-vocabulary relation, additive migration 0017,
  authenticated list/save/unsave endpoints, a server-enforced saved queue
  scope, Saved Words route, and bookmark controls on Catalog and Detail.
- Search/level/topic state is URL-backed. The saved queue applies membership
  in SQL before existing New/Due limits; Review writes and progress semantics
  remain unchanged. No browser storage or Dataset V2 content is used.
- Focused Saved Words, API, queue, Catalog, Detail, Study Setup, Summary and
  application-schema tests pass (9 files / 104 tests). `pnpm typecheck`,
  feature ESLint, `pnpm build`, and `git diff --check` pass. Local Node is
  22.19.0 while the repo pins 22.23.2; build completes with existing dynamic-
  import and bundle-size warnings.
- Migration validation is offline. No live database operation, Dataset V2
  change, or production deployment was performed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2A validator

- Added `scripts/validate-master-vocabulary-v2.ts` and
  `pnpm validate:master-vocab-v2`. The validator uses the manifest as the only
  release boundary, validates pinned documents with Draft 2020-12 schemas, then
  checks typed references, scoped uniqueness, taxonomy graphs, learning sets,
  media, Relations, Provenance, JCS record hashes, and the release hash.
- Added synthetic approved graph fixtures generated in temp directories,
  Phase 1 schema fixture assertions, machine report output, and the stable issue
  catalog at `docs/architecture/master-vocabulary-v2-validation-contract.md`.
  The checked-in `dataset.json` remains an empty DRAFT; no real vocabulary,
  media bytes, or pilot data were added.
- Focused validator tests: 21 passing at the last run; targeted script typecheck
  and final checks are in progress. Full application tests were not run. Runtime/UI, database,
  Neon, importer, and Cloudinary paths were not changed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 1 schema package

- Patched the V2 data dictionary, identity/versioning policy, and taxonomy
  contract. Dataset releases now pin exact Lexeme, Sense, Classification,
  Learning Set, taxonomy, relation, media-version, and Provenance artifacts;
  `releaseHash` uses the `sha256-canonical-json-v1` contract. Pronunciation
  ownership is XOR, classification values are dimension-typed, and semantic
  child state advances its owning Lexeme/Sense revision as specified.
- Added the Draft 2020-12 schema package under `vocabflow-dataset/` and
  synthetic valid/invalid schema fixtures. The initial `dataset.json` is an
  empty `DRAFT` manifest; no vocabulary pilot or runtime/database/media change
  was made. Cross-file graph, identity, revision-history, and byte checks were
  documented for Phase 2A. All 8 schemas pass Draft 2020-12 meta-
  schema checks and all 18 fixture expectations match under `jsonschema`.
- No matching active user story covers this architecture/schema-only work;
  unrelated US-43 remains untouched. Application tests and database/media
  operations were not run.

## 2026-10-02 — Vocabulary Detail (US-43)

- Owner explicitly reprioritized the read-only Vocabulary Detail page while
  US-42 remains open. Added `/vocabulary/:vocabularyId` on the shared AppShell,
  using the existing active-learner vocabulary endpoint, image/audio fields,
  pronunciation hook and `/study` route. List rows now link to detail.
- Missing Vietnamese definition/example translations, POS, synonyms/antonyms,
  per-word review counts, last-studied date, mastery percentage, and save state
  are not present in the current model; the page uses neutral empty states and
  disables unsupported save behavior.
- Focused route/detail tests pass (27 tests). Full lint, typecheck, test suite
  (65 files / 753 tests), build and `git diff --check` pass. Build used local
  Node 22.19.0 while the project pins 22.23.2; the package manager emitted its
  engine warning. Owner review remains pending. No backend/database command,
  commit, push, or deployment work.

## 2026-10-01 — Production Release #8 artifact scan policy

- Split PostgreSQL URI counts by artifact boundary. Client/static URIs remain a
  hard failure; Vercel function URI-shaped examples are counted for diagnostics
  only; matches outside public/function roots fail closed.
- Added exact-value scans for the project's known secret environment variables
  across every artifact file. Secret assignments, provider/token patterns,
  local environment files, public source maps and out-of-root database URIs
  remain blocking. Diagnostics contain counts only.
- The production deploy step provides its release DB/provider secret values to
  the verifier, and the Vercel CLI subprocess receives a sanitized environment.
  Focused tests (54), lint, typecheck, full tests (64 files / 748 tests), build,
  and `git diff --check` pass. The static client artifact scan reports zero
  value matches. One slow source-control diagnostic test's timeout was raised
  after it timed out under full-suite load but passed by itself.
- No DB/migration command, deployment, commit or push was performed. Local Node
  is 22.19.0 against the repository's 22.23.2 pin.

## 2026-10-01 — Production Release #7 Vercel API boundary fix

- Moved the Vercel entrypoint tests and their TypeScript project from root
  `/api` to `tests/api`; root TypeScript references still typecheck the tests.
  Root `/api` now contains only `handler.ts`, `package.json` and its production
  `tsconfig.json`.
- Added a recursive production-build guard rejecting `.test` and `.spec`
  TypeScript entrypoints under `/api`. Credential and source-map scanners were
  not relaxed.
- Focused boundary/API tests pass (20); `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (64 files / 734 tests), `pnpm build`, and `git diff --check`
  pass. The static client artifact scan reports `value_hits=0`.
  `vercel build --prod` was skipped because the local Node is 22.19.0 (required
  22.23.2) and the release wrapper requires a clean source tree; the requested
  changes remain uncommitted. No production DB operation, deployment, commit
  or push occurred.

## 2026-10-01 — Protected Production Release automation (US-42)

- Added `.github/workflows/production-release.yml`, triggered only after Core
  CI completes successfully for a same-repository `main` push. It checks out
  `workflow_run.head_sha`, verifies the checkout, runs read-only production DB
  preflight and migration plan, applies guarded forward-only migrations, then
  repeats read-only DB verification and requires zero pending migrations
  before calling `pnpm deploy:production` for the same SHA. Steps are
  sequential and serialized; migration/verification failure prevents deployment.
- Added the `ci-production-release` execution context and production
  authorization bound to the GitHub event payload's Core CI name, conclusion,
  push event, main branch, repository and exact SHA. Generic database URL and
  mutation paths reject this context; `ci-test` remains test-only.
- Production secrets are step-scoped. Workflow also generates ignored
  `.vercel/project.json` ephemerally for the existing safe Vercel project guard.
  Trusted DB Integration was not changed; bootstrap, catalog import and US-41
  curation are outside this workflow.
- Local validation and owner review are pending. GitHub Environment
  `production` still needs required reviewers, a `main` branch rule, and the
  listed secrets/variables. No production DB connection/mutation, deploy,
  commit or push was performed.

## 2026-10-01 — Vietnamese catalog metadata audit

- Added forward migration `0014_vietnamese_catalog_metadata` for catalog
  display strings: five compatibility sets, eleven US-41 sets, 17 topics and
  four achievement descriptions. Statements update only names/descriptions by
  stable slug or achievement code; IDs, slugs, source classifications,
  ordering, enabled/grade values, relationships and learning history remain
  untouched.
- Updated the US-41 curation source and manifest metadata to keep future
  curation applications from restoring English set labels. Owner-selected
  vocabulary, topics, grades and set memberships are unchanged. API and
  learning behavior are unchanged.
- Updated API, web and browser-test fixtures to use Vietnamese catalog display
  metadata while retaining English vocabulary and raw source-topic examples.
- Validation: focused catalog/migration/API/web tests pass (10 files / 72
  tests); `drizzle-kit check` passes; final `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (62 files / 683 tests), focused learning-set E2E (3/3),
  `pnpm build` and `git diff --check` pass. The production-build test that
  exceeded its 5-second limit once during concurrent checks passes by itself;
  the full suite also passes without competing checks. Updated the focused E2E
  auth mock and stale Vietnamese accessible-name locator. Local Node is
  22.19.0 versus the pinned 22.23.2.
  No database connection or migration execution, deployment, commit or push
  has been performed.

## 2026-09-30 — Shared authenticated application shell

- Replaced the Home-owned sidebar with one nested shared app shell for the
  authenticated Home, Study, Vocabulary, Topics, Learning Sets, Progress,
  Learners and learner Settings routes. Desktop keeps a sticky 248px sidebar;
  tablet uses the compact horizontal nav; mobile uses a 44px menu button and
  48px navigation targets. Login/Register and the existing foundation route
  remain outside this shell.
- Home retains its own greeting, active-learner switcher and approved dashboard
  content. The existing Home → `/learners` return intent and direct Learners
  behavior are unchanged. The pre-existing Continue Learning CSS refinement is
  preserved.
- Added App routing tests for shared-shell persistence, active parent paths,
  direct Learners, mobile navigation, auth isolation and no return loop.
- `pnpm lint`, `pnpm typecheck`, focused routing/Home tests (32), full tests
  (61 files / 677 tests), `pnpm build`, and `git diff --check` pass. Local Node
  is 22.19.0 versus the pinned 22.23.2. No backend/database/auth/scheduler
  changes, deployment, commit or push were performed.
- No active user story covered this explicitly requested layout refactor; no
  new feature story or product/architecture decision was introduced.

## 2026-09-28 — Guarded production vocabulary catalog import

- Added explicit production target parsing for `vocab:import-catalog` while
  preserving the existing no-argument / `--apply` development and test CLI.
  Production uses `authorizeProductionRelease` and
  `resolveProductionConnection({ purpose: "runtime" })`, selecting only
  `PRODUCTION_DATABASE_URL` and requiring Neon project/branch proof.
- Production dry-run checks the canonical protected identity and catalog plan
  inside a PostgreSQL `READ ONLY` transaction. Apply requires `--apply`, exact
  production and branch confirmations, repeats release authorization, and
  validates identity inside the write transaction before catalog operations.
  Existing import safety rules are unchanged; no owner/migration credential,
  extra grant, or execution-context guard bypass was added.
- Focused tests pass (29 tests); full `pnpm test` passes (59 files / 623
  tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
  pass. Local Node is 22.19.0 versus pinned 22.23.2. No real DB connection,
  mutation, deploy, push, or commit was performed. `.env.example`,
  `docs/decisions.md`, and existing unrelated workspace edits remain
  untouched.

## 2026-09-28 — Least-privilege production preflight

- Split `db:production-preflight` into two provider-verified read-only
  connections. `vocabflow_runtime` now independently validates connectivity
  and canonical protected identity; `vocabflow_migration` independently
  validates the same identity and reads `drizzle.__drizzle_migrations`.
- Both use read-only transactions. The bootstrap grants, protected metadata
  model, runtime-to-migration membership rules, and Vercel/database settings
  are unchanged. Added a mock regression test that fails with the reported
  schema-permission error if runtime accesses the Drizzle ledger.
- Focused tests pass (31 tests); full `pnpm test` passes (58 files / 615
  tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
  pass. Local Node is 22.19.0 versus pinned 22.23.2. No database connection,
  mutation, deploy, or push was performed. Existing unrelated edits,
  including `docs/decisions.md`, remain untouched and unstaged.

## 2026-09-28 — Guarded fresh-production database bootstrap

- Added `pnpm db:production-bootstrap` as a read-only-by-default, explicit
  production-only path for the confirmed fresh Neon branch. Apply requires
  `--apply`, `--confirm-target production`, and the exact configured branch;
  Neon API project/branch proof and the explicit `neondb_owner` operator URL
  are checked before database work. Catalog checks allow only fresh state or
  a complete bootstrap-only state; partial/unexpected roles, schemas,
  relations, types, identity or app tables stop safely.
- Reused `bootstrapProtectedMetadata` and its existing role/least-privilege
  checks, with parameterized bootstrap-principal membership handling. Added
  distinct operator-only bootstrap and identity-provision URL resolution;
  Vercel runtime lookup remains `DATABASE_URL` only. Production identity is
  provisioned and verified with the canonical identity role immediately after
  bootstrap. The runbook distinguishes this one-time flow from later releases.
- Regression coverage confirms the fresh owner-only bootstrap path does not
  require `vocabflow_identity_bootstrap`, wrong/development targets fail
  closed, the canonical application roles remain unchanged, and the one-shot
  owner is not granted runtime membership. The runbook now labels the legacy
  bootstrap role as development/test-only.
- Focused tests pass (58 tests); `pnpm lint`, `pnpm typecheck`, full `pnpm
  test` (57 files / 613 tests), `pnpm build`, and `git diff --check` pass.
  The workstation uses Node 22.19.0 while the repo pins 22.23.2. No database
  command/connection, database mutation, Vercel deploy or main push was run.

## 2026-09-28 — Vercel ESM directory import fix

- The latest Preview error proved Node reached the ESM Function but rejected
  the handler's `../apps/api/src` directory import. `apps/api/src/index.ts` is
  the existing app entrypoint; no API package export/public alias exists.
- Replaced app and runtime-binding value/type specifiers with explicit `.js`
  paths, matching Vercel's observed emitted `apps/api/src/index.js`. Added a
  native Node ESM test against a transpiled handler fixture and preserved
  actual-app health, auth, nested-path and JSON-404 tests; added explicit
  sign-in dispatch coverage through the existing Better Auth seam.
- Focused module/routing/auth tests pass (28 tests); full suite passes (54
  files / 582 tests), as do lint, typecheck, Vite build and `git diff --check`.
  Local Node is 22.19.0 rather than the pinned 22.23.2. No Vercel CLI/deploy or
  DB access was used.
- Next safe action: commit and push this module-resolution fix to `TXH` only.
  Owner may then create one Preview retry to verify emitted runtime behavior.

## 2026-09-28 — Vercel Preview Function ESM compatibility fix

- Confirmed from the live Preview stack and repository package scopes that the
  `/api/handler` boundary was emitted/executed as CommonJS while loading the
  ESM-scoped `apps/api/src/index.js`. The root package has no `type` marker and
  `api/` had no local `package.json`; `apps/api/` is already ESM.
- Added only an `api/package.json` ESM boundary and a subprocess test that
  starts Node with `tsx`, imports the actual handler under that package scope,
  and calls `/api/health`. Source checks reject `require()` in the handler.
- Existing tests continue to cover Better Auth route dispatch, nested path
  restoration, API JSON 404, and the Vercel SPA rewrite exclusion. Business
  logic, DB/auth behavior, environment markers, production guards and routing
  configuration are unchanged.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (54 files / 579 tests),
  `pnpm build`, and `git diff --check` pass. The local runtime is Node 22.19.0
  versus the pinned 22.23.2. No Vercel CLI/deploy or DB connection was used.
- Next safe action: commit/push this fix to `TXH` only, then owner may create
  exactly one Preview deployment and verify `/api/health` plus auth smoke.

## 2026-09-27 — Vercel Preview API route integration fix

- The live Preview returned Vercel `NOT_FOUND` for nested Better Auth requests.
  Source inspection confirmed the Hono `POST /api/auth/*` mount and other API
  routes already existed, but the Vite deployment had no explicit Vercel route
  from nested `/api/*` paths to a statically named Function.
- Replaced the implicit catch-all filename with `api/handler.ts` and an explicit
  Vercel route/path transform that dispatches `/api` and `/api/*` to the same
  Hono app while restoring the original URL path. The SPA rewrite still excludes
  API paths. Better Auth logic, auth configuration, DB schema/data and release
  source guard are unchanged.
- Focused routing/auth/artifact tests pass. Full local validation and exactly
  one Preview deployment are pending.

## 2026-09-27 — V1.0 hosting pivot: Cloudflare to Vercel

- Replaced the V1.0 deployment layer with a root Vercel project: Vite static
  output plus a thin Hono Web `fetch` Function at `/api/*`; the existing Hono
  routes/business logic remain the single implementation. Added exact-origin
  Preview auth using the current `VERCEL_URL`, with development-only markers
  and no wildcard Vercel trust.
- Kept production DB identity/preflight, migration and US-41 guards, reset
  block, shared-CI isolation, forward-only SQL policy, release SHA/toolchain
  gates and artifact secret/source-map scanning. Removed the Worker/Wrangler
  deployment implementation; BATCH 0 Cloudflare docs remain explicitly
  historical.
- Updated the current architecture, V1.0 release runbook, decision log and
  handoff/changelog for Vercel. Vercel project IDs and production origin remain
  owner inputs; Preview auth/API smoke stays restricted until a separate
  owner-approved non-production database is provisioned.
- No Vercel link/pull/build/deploy, Cloudflare deploy, production Neon
  connection, migration or curation apply was executed. Existing local edits in
  `.env.example` and the prior DEC-018 link correction are preserved and are
  not part of this pivot commit.
- Local verification: frozen-lockfile install, 10 focused files / 106 tests,
  full suite 54 files / 544 tests, lint, typecheck, Vite build, 26 Playwright
  E2E tests, and `git diff --check` pass. Artifact checks found no secret
  values, DB/provider credentials, local env files or source maps; one
  `BETTER_AUTH_SECRET` key-name string is from Better Auth's browser package,
  not a configured value.
- The guarded `build:production` was not executed: this workstation is Node
  22.19.0 rather than pinned 22.23.2 and the worktree contains preserved
  pre-existing edits. Remote verification for implementation SHA
  `5fd0515c4d3ae2cd4cc0a15ec407aca13d2f04ad`: Core CI run `36300948885`
  PASS; Trusted DB run `36300948861` PASS on trusted `shared-ci`. Vercel
  project/org IDs and canonical production origin remain owner inputs.

## 2026-09-27 — Historical Cloudflare production release preparation (superseded)

- Added a guarded production migration dry-run/apply path with an explicit
  canonical target, exact target/branch confirmations, provider proof, a
  read-only migration plan, and forward-only/destructive-SQL checks. Production
  curation now has explicit read-only and confirmed apply paths using separate
  production runtime credentials. `db:reset` and reset-capable Trusted DB
  tooling refuse production markers.
- Production Better Auth requires matching production markers and an
  owner-supplied canonical HTTPS origin; secure cookies and a single trusted
  origin are enforced. The Worker build artifact receives production markers,
  SPA and `/api/*` routing, an owner-supplied custom route, and
  `workers.dev=false` only after the guarded production build finalizes it.
- Added pinned Wrangler CLI, clean-source/toolchain/SHA gates, local environment
  file exclusion, a client/artifact secret scan and digest check, safe CLI error
  codes, production preflight/build/deploy commands, and the
  [v1.0.0 release runbook](releases/v1.0.0-release-runbook.md).
- Repository config defines production Neon target branch
  `br-rough-silence-b3gbqjcb`; no Neon API or database connection was used to
  verify it during this task. Production hostname/zone remain
  `OWNER_INPUT_REQUIRED`. Worker production secrets and operator migration/
  runtime credentials must be provisioned separately; no credential values
  are documented.
- Local verification: full suite 52 files / 527 tests, lint, typecheck,
  manifest-only curation dry-run (213 selected rows, no DB access), build
  (dev-vars removed; client secret-value scan and source-map scan pass),
  Playwright E2E (26), Wrangler 4.129.0 dry-run (no upload), and final diff
  check. Local Node is 22.19.0; the guarded production build intentionally
  requires 22.23.2 and a completely clean release checkout.
- Production migration/apply, curation apply, Worker/web deploy, account/user
  creation, and `v1.0.0` tagging were not performed. Core CI and Trusted DB
  must be green on the exact pushed SHA before any production preflight or
  mutation.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  is part of this task or its commit.

## 2026-09-25 — US-41 explicit development-target safety path

- Added an explicit `--target development` read-only DB snapshot/planning path.
  It verifies the canonical configured Neon identity, checks selected source
  identities, words and Vietnamese meanings, and runs the DB plan in a
  PostgreSQL `READ ONLY` transaction. It prints non-secret target metadata and
  reports zero DB mutations.
- Local development apply now requires `--target development --apply`,
  `--confirm-target development`, and `--confirm-branch` equal to the
  configured development branch. Production remains blocked; Trusted DB keeps
  its existing `ci-test`/`test` → `shared-ci` path. Generic bypass flags do not
  exist.
- Local validation passes: focused safety tests (38), full suite (494), lint,
  typecheck, build, 26 Playwright E2E tests and `git diff --check`.
- No development dry run, development apply or production DB operation was run.
  The owner commands remain separate manual actions after the required remote
  gates; this implementation does not invoke them.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  is part of this implementation.

## 2026-09-24 — US-41 final content remediation

- Kept all 213 curated imported rows. Added eight source-bound image
  quarantines and five exact owner-approved Vietnamese meaning overrides to
  the tracked curation manifest; no raw source dataset values or unrelated
  meanings were changed, and no LLM/API classification or translation was used.
- Added durable `image_quarantined` and `vietnamese_override` columns. Runtime
  vocabulary, topic, set, queue and review-answer reads use canonical meanings
  and hide quarantined images. Catalog re-import refreshes raw source columns
  without clearing owner metadata. Migration: `0012_us41_owner_content_overrides`.
- Final local dataset dry run PASS: 213 selected (100/73/40 by grade), 202
  media PASS, 3 missing-image WARN, 8 quarantined-image WARN, 0 BLOCK and 11
  effective image-ineligible rows. Duplicate identities/words, expected-word
  mismatches and missing meanings are all 0. `DATABASE_MUTATIONS=0` and
  `REAL_NEON_APPLY=NOT_RUN`.
- Regenerated ignored owner-review CSVs, summary and original-image contact
  sheet. The review has 15 findings, zero activation blockers, eight
  `SAFE_WITH_LIMITATION` quarantines with `IMAGE_TO_WORD=NO`, and six corrected
  meanings assessed OK; cousin and love remain unchanged.
- Local validation PASS: 17 focused files / 175 tests; full suite 47 files /
  476 tests; lint, typecheck, build, 26 E2E and `git diff --check`. Core CI
  run #93 (`35964700073`) and Trusted DB Integration run #88, attempt 3
  (`35964700003`), passed on implementation SHA
  `0cc10dd9ded1564a860d605b196939a25dce1d1d`.
- Trusted DB used only the configured CI test target. Earlier attempt 1 stopped
  at the runtime protected-identity check; attempt 2 passed US-41, then hit the
  existing US-07 same-review-ID replay-race assertion. Attempt 3 passed the
  full suite. No real Neon apply was run.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  belongs in the remediation commit.

## 2026-09-23 — US-41 owner-refined final curation

- Applied only the owner's explicit 11 source-record replacements and seven
  no-replacement deferrals to the tracked allow-list. V1 now contains 213 rows:
  Grade 1 = 100, Grade 2 = 73, Grade 3 = 40. Grade 2 Feelings has 13 rows;
  nothing was added to pad it back to 20.
- Narrowed image availability policy: a missing image is a visible WARN and
  does not block activation. Usable audio, required word/meaning, source
  identity and the existing known-unusable/corrupt media block remain intact.
  `IMAGE_TO_WORD` still requires a usable image; exercise fallback, scheduling,
  progress and rewards are unchanged.
- Local real-dataset dry run PASS: 1,994 source rows; 213 curated; media 210
  PASS / 3 WARN / 0 BLOCK (`anger`, `sadness`, `joy`); 30 starter-topic
  mappings; `DB_MUTATIONS=0`. Real Neon apply was not run.
- Focused curation, importer and exercise-generator tests PASS (34 tests).
  Full local validation PASS: lint, typecheck, 457 unit/component tests, build,
  and 26 E2E tests. Commit `760c0c04d7498a3b6e27b15ee47e4cee0c305aed` was
  pushed to `TXH` and fast-forwarded to `main`; Core CI run `35840195766` and
  Trusted DB Integration run `35840195673` both PASS on that exact SHA.
- Owner review CSV and summary are regenerated under ignored
  `local-data/generated/`; manifest and story record `love`'s source meaning
  and romantic English definition without rewriting it, and note that
  `despair` → `fear` is a set-level replacement, not a synonym claim.
- Follow-up Trusted DB runs `35841107601` and `35842150875` failed at US-41
  apply with PostgreSQL `XX000: cache lookup failed for type 590564`. The
  trusted test reset drops/recreates application enums; `scripts/db-core.ts`
  now disables prepared statements to prevent stale enum OIDs, with a focused
  regression test. Core CI `35843693211` and Trusted DB `35843693265` both PASS
  on fix commit `2ef6166dcc9c3475773f2385626001f2d897cc43`.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes. Do not
  stage or commit either file; `docs/decisions.md` remains untouched.
- `REAL_NEON_APPLY=NOT_RUN`; Trusted DB used only the configured CI test target.

## 2026-09-22 — US-41 content curation and activation

- Audited the 1,994 imported source records and generated media report:
  1,979 image references, 1,993 audio references, 15 missing images, 1
  missing audio and no invalid media records.
- Added tracked `VOCABULARY_CURATION_V1` manifest with 220 explicitly reviewed
  rows: 100 Grade 1, 80 Grade 2 and 40 Grade 3, in 11 ordered learning sets.
  Every row records source identity, expected word, canonical topics, set
  membership and activation decision.
- Added deterministic dry-run-first curation tooling. It maps all 30 starter
  rows to canonical topics, leaves unreviewed imported rows disabled, and has a
  trusted-CI-only transactional `--apply` path that preserves starter
  identity, learner assignments, progress, reviews, XP and achievements.
- Local dry run PASS: `MANIFEST_RECORDS=220`, `LEARNING_SET_COUNT=11`,
  `STARTER_TOPIC_MAPPINGS=30`, `MEDIA_GATE=PASS checked=220`,
  `DB_MUTATIONS=0`.
- Current phase/batch: Phase 2 / US-41 implemented and ready for owner check;
  US-42 has not started. Core CI #87 and Trusted DB Integration #81 both passed
  on commit `4d76cfa946ccae94ec3e5deb690f0365ba579363`; only owner review of
  the manifest and dry-run report remains.

## 2026-09-21 — US-39 + US-40 XP, level and achievements

- Audit found no reward persistence, catalog or UI. Canonical review idempotency, household authorization, household-local daily activity, streak derivation and session-local reinforcement were reused.
- Added immutable `xp_events`, idempotently seeded achievements and immutable learner unlock records. Scheduled review and daily-goal rewards are safely coupled to the canonical review write; no XP backfill occurs.
- Exercise correct-bonus remains deferred because the current client-generated exercise flow has no trusted server-side exercise context. `.env.example`, `docs/decisions.md` and local data remain untouched.

## 2026-09-21 — US-39/US-40 fix-forward

- Trusted DB fixture teardown now explicitly removes learner-owned `learner_achievements` and `xp_events` before deleting learner profiles; the reference achievement catalog remains intact.
- The optional review exercise submission is server-verified against canonical vocabulary data. Correct scheduled exercises earn one `EXERCISE_CORRECT` ledger event worth 5 XP; mismatched client recall results are rejected, reinforcement remains reward-free, and raw typed input remains transient.

## 2026-09-21 — US-37 + US-38 weekly/daily and topic progress

- Audit classified US-37 historical aggregation/weekly UI and US-38 learner topic aggregation/UI as missing; canonical review history, household-local dates, sparse progress, topics, active learning-set eligibility and authorization were reusable.
- Added read-only range and topic APIs plus the Progress dashboard sections. `newLearned` is derived from immutable review-event `previous_status = NEW`, so reset-created lifecycles are represented without a schema change or fabricated backfill.
- Topic scope is current enabled vocabulary reachable through active assigned enabled sets. Imported mappings remain 1,994 and the 30 starter rows remain unmapped; no topic was guessed. `docs/decisions.md`, `.env.example` and local datasets remain untouched.

- Project: VocabFlow Family MVP
- Current phase/batch: Family MVP US-01..US-25 complete; Phase 2 / US-26 through US-41 implemented and ready for owner check
- Current Git branch: `TXH`
- Current implementation baseline: commit `d5791c7` (`feat: add image and typing exercises`) on `TXH`, with protected local changes preserved
- US-24: `ACCEPTED / CLOSED`.
- US-25: `ACCEPTED / CLOSED` after recovery Core CI and Trusted DB passed.
- US-26 + US-27: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-28 + US-29: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-30: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-31 + US-32: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-33 + US-34: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-22: `IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK DEFERRED`.
- Catalog state after real import: 30 starter rows + 1,994 imported rows =
  2,024 total vocabulary rows. The owner-refined US-41 manifest selects 213
  imported rows; the remaining imported rows stay disabled.
- Imported catalog identity is `(source_dataset, source_record_id)` and is
  separate from canonical DB ID. Grade is NULL for unreviewed rows and explicit
  only where the tracked curation manifest assigns it.
- Real US-25 evidence: migration/import PASS; starter, learner_progress, and
  review_events modifications were 0; post-import idempotency dry run was
  INSERT_COUNT=0, UPDATE_COUNT=0, SKIP_COUNT=1994, DATABASE_MUTATIONS=0,
  STATUS=PASS.
- Core CI on the implementation baseline: `FAIL`, run `35250926587`, at Unit
  and component tests because a starter-enrichment test required gitignored
  `local-data/`.
- Trusted DB on the implementation baseline: `PASS`, run `35250926632`.
- Recovery fix in commit `60b384d`: deterministic tracked test fixtures replace
  the CI test's dependency on local generated/source data. Core CI run
  `35434440380` and Trusted DB run `35434440386` both passed.
- Protected: never modify, stage, restore, reset, clean, or commit
  `docs/decisions.md`. Preserve `.env.example` and `local-data.zip` changes.
- Final US-30 evidence: local validation passed; Core CI run `35443781349` and
  Trusted DB run `35443781278` both passed. US-39/40 fix-forward baseline is
  `b057f70897859004de9659b1780c9f098915ac0c`; US-41 candidate
  `4d76cfa946ccae94ec3e5deb690f0365ba579363` passed same-commit Core CI #87
  and Trusted DB #81 and is awaiting owner review. US-22's manual owner check
  remains deferred.
- Documents new agents must read first: `docs/README.md`,
  `docs/product/product-spec.md`, `docs/architecture/technical-architecture.md`,
  `docs/design/design-system.md`, `docs/design/feature-ui-spec.md`,
  `docs/flow/user-flow.md`, `docs/roadmap.md`, the relevant story, and this file.

## 2026-09-19 — US-28 + US-29 implementation checkpoint

- Gap audit found no learning-set schema, normalized learner assignment,
  assignment UI or set-aware queue eligibility. Existing vocabulary IDs,
  household ownership and sparse progress primitives were retained.
- Added five deterministic curated sets, ordered memberships and the
  backward-compatible `starter-vocabulary` set containing all 30 enabled
  starter rows. Imported rows remain disabled and are not inferred into sets.
- Added household-authorized assignment APIs/UI. Existing learners receive the
  default assignment in migration and new learners receive it in the canonical
  learner-create path.
- Queue eligibility is now `enabled vocabulary ∩ union(active assigned sets)`;
  `EXISTS` keeps repeated membership deduplicated. Unassign preserves progress
  and review events; reassignment reuses progress.
- Focused tests, full tests, lint, typecheck, build, E2E, diff checks and the
  post-push Trusted DB gate pass. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-20 — US-33 + US-34 exercise implementation checkpoint

- Gap audit found the existing DTO media fields, Flashcard media safety,
  canonical review API and queue admission reusable; image interaction,
  typing interaction, strict answer normalization and exercise media fallback
  were missing.
- Added `IMAGE_TO_WORD` and `TYPE_WORD` to the same controlled exercise layer.
  Image mode requires a usable image plus four safe word choices and uses a
  neutral alt label. Typing uses deterministic Vietnamese-first cues, NFKC /
  trim / case-insensitive exact comparison and preserves meaningful spaces.
- Broken image or optional cue media uses one-way fallback without a review
  mutation. Canonical review, retry, reinforcement, summary, queue eligibility,
  daily New limits and learner isolation remain unchanged. No schema change;
  `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — US-26 + US-27 implementation checkpoint

- Gap audit found no existing canonical level model/filter or topic catalog,
  normalized mapping, API or browse UI.
- Added nullable `vocabulary_level` with six explicit values. The source
  dataset has no grade metadata, so all 2,024 catalog rows remain NULL and no
  inference or bulk assignment was performed.
- Added 17 source-backed canonical topics and normalized
  `vocabulary_topics` mappings. The migration maps 1,994 imported rows by
  exact source topic; 30 starter rows remain unmapped because their source
  topic is NULL. Imported rows remain disabled.
- Added optional level filters, topic APIs, topic browse UI, migration/schema
  assertions, focused API/UI tests and E2E coverage. Scheduler, progress and
  review-event paths were not changed semantically.
- Implementation commit: `d612e1a`.
- Local status: IMPLEMENTED / READY FOR OWNER CHECK. Final lint, typecheck,
  full tests, build, E2E, diff and Trusted DB gates are still being run.
- `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — Repository recovery checkpoint

- Confirmed documentation drift: canonical story index stopped at US-11 and
  current handoff/roadmap statements incorrectly said US-12 had not started.
- Confirmed Core CI root cause from GitHub run `35250926587`: the test
  `starter vocabulary enrichment safety > loads the real source...` failed
  with `ENRICHMENT_SOURCE_UNREADABLE` because `local-data/` is gitignored.
- The fix keeps real-data loading available to the manual enrichment tool and
  makes automated tests deterministic with in-repository fixtures.

## 2026-09-16 — starter enrichment tooling checkpoint

- Added a dry-run and guarded transactional apply tool for the owner-approved
  starter enrichment subset `1, 2, 7, 8, 9, 11, 18, 19`.
- The tool validates exact DB/source identity and explicit media-map
  resolution, preserves enabled state and learner history, and fails safe on
  unexpected database content or partial updates.
- The real database apply command was not run; US-12 remains unstarted and
  `docs/decisions.md` remains protected.

## 2026-09-16 — US-11 implementation checkpoint

- Confirmed the accepted reusable Flashcard remains answer-free before flip and
  now explicitly covers the post-flip IPA, meaning, optional content and
  image-accessibility contract.
- Study continues to render Remembered/Forgotten only after flip and retains
  the accepted US-09 review, reinforcement and summary flow.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-11
  is ready for owner check and US-12 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-16 — US-10 implementation checkpoint

- Extracted the Study presentation and media behavior into the reusable
  `Flashcard` component at `apps/web/src/features/study/flashcard.tsx`.
- The component keeps answer-bearing content out of the pre-flip DOM while
  preserving the accepted click/Space flip, media fallback and Study review
  controls.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-10
  is ready for owner check and US-11 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-15 — US-08 authorization harness expectation fix-forward

### Diagnosis and fix

- The failed candidate `9dad72447457b08327de2606e218d34c37af1912` remains
  `FAILED / RETIRED` after Trusted DB run `34950169177` failed in
  `us08-authorization-cases`.
- Diagnosis confirmed a harness-only expectation defect: the authorization
  test treated `allowed.queue.length !== 1` as an empty queue even though the
  migrated database contains 30 enabled global vocabulary rows and the
  production NEW selection is ordered by ID and capped at 10.
- `scripts/test-review-queue-db.ts` now independently derives the eligible
  global NEW prefix from migration-role state, compares the runtime response
  without sorting or normalizing the actual list, and logs expected/actual
  counts and vocabulary IDs. Positive and negative learner authorization
  evidence remains intact.

### Scope and gate status

- Product semantics, schema, migrations, workflow/orchestration and US-07
  behavior are unchanged. The old `42601` fixture INSERT fix is preserved.
- Local validation is complete and passing. No new immutable candidate was
  created, no external Trusted DB was rerun, and the failed candidate was not
  amended or reused. The next gate is narrow authorization-harness technical
  review.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-08
  remains `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md`
  remains protected local work.

## 2026-09-15 — US-08 queue-semantics harness fix-forward

### Diagnosis and fix

- Trusted DB run `34954397186` for immutable candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` passed target-SHA validation,
  authorization cases and the prior `42601` fixture path, then failed in
  `us08-queue-semantics` with `US08_DB_QUEUE_COUNTS`.
- Diagnosis confirmed a second harness-only expectation defect: the migrated
  database and earlier authorization fixtures leave enabled global vocabulary
  rows visible to the learner's NEW query. The queue-semantics fixture now
  inserts strict-future progress for pre-existing enabled rows, before adding
  its scenario-specific vocabulary, so only the intended sparse NEW rows are
  eligible.
- The diagnostic now reports expected/actual review date, DUE and NEW IDs,
  counts and complete queue IDs. Production code, schema, migrations,
  workflow/orchestration and US-07 behavior are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` remains `FAILED / RETIRED` and
  is not amended or reused. No external Trusted DB run or new candidate was
  created.
- Local validation is required before the narrow queue-semantics harness
  technical review. US-07 remains `IN PROGRESS / BLOCKED` with its known CAS
  P1 open; US-08 remains `IN PROGRESS / BLOCKED`; US-09 has not started.
- `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 consolidated cap/suppression harness fix-forward

### Diagnosis and fix

- Trusted DB run `34960083041` proved candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` through authorization and the
  queue-semantics isolation stage, then failed at
  `us08-caps-and-suppression` / `US08_DB_DUE_19_COUNTS`.
- Source diagnosis confirmed a systematic harness isolation defect: fresh cap
  learners saw globally enabled baseline and prior-fixture vocabulary as NEW,
  while the cap expectations assumed scenario-only vocabulary. The fix now
  captures enabled vocabulary before each cap fixture, gives only that fresh
  learner strict-future progress, and derives explicit 19/20/21 contracts.
- Cap diagnostics now report expected/actual counts, DUE/NEW IDs, queue IDs,
  review date and suppression state. Product semantics, schema, migrations,
  workflow/orchestration, US-07 and prior live-proven fixes are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` remains `FAILED / RETIRED` and
  will not be amended or reused. No external Trusted DB run or candidate #5
  was created.
- US-07 remains `IN PROGRESS / BLOCKED` with its CAS P1 open; US-08 remains
  `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md` remains
  protected local work.

## 2026-09-15 — US-08 Trusted DB harness fix-forward checkpoint

### Diagnosis and fix

- Trusted DB run `34941415887` reached the exact retired candidate
  `54a029f333dcee7abfa825e9991d8d61797e87e4` and failed with PostgreSQL
  SQLSTATE `42601` during `us08-authorization-cases` / `us08-fixture-auth-a`.
- The root cause was confirmed as a harness-only `vocabularies` fixture INSERT
  arity defect in `scripts/test-review-queue-db.ts`: five target columns were
  supplied with four expressions. The fixture now omits `content_version` from
  the target list so the canonical schema default `1` applies.
- The shared helper covers all US-08 fixture callers. No product behavior,
  schema, migration, workflow, US-07 code or US-07 CAS finding changed.

### Validation and gate status

- Focused US-08/harness/reset/preflight validation: `41/41` tests PASS across
  five files; full local tests: `251/251` PASS; E2E: `11/11` PASS.
- Lint, typecheck, build, Drizzle check, YAML parsing, workflow/preflight
  checks and `git diff --check` PASS. No reliable local PostgreSQL arity
  regression was added; real Trusted DB remains authoritative for SQL shape.
- The failed SHA remains `FAILED / RETIRED`. No new immutable candidate was
  created; future Core CI and scoped Trusted DB rerun remain pending after
  narrow technical review. US-08 remains `IN PROGRESS / BLOCKED`.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-09 has
  not started. `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 owner-override implementation checkpoint

### Discovery and gate override

- The owner explicitly authorized parallel US-08 work while US-07 remains
  `IN PROGRESS / BLOCKED` on the known PostgreSQL CAS P1. This does not mark
  US-07 accepted, close the CAS finding or authorize US-07 Trusted DB work.
- US-08 is the canonical `Review Queue` story for Architecture Step 8. No
  hard implementation blocker was found. Existing authentication, learner
  ownership, vocabulary DTOs and sparse progress are contract-stable
  dependencies; persisted review-flow acceptance remains acceptance-blocked
  by the unresolved US-07 database evidence.

### Implemented scope

- Added the strict review-queue response contract and a read-only
  `GET /api/learners/:learnerId/review-queue` service/route.
- Implemented household authorization, household-local server date, due-first
  ordering, due/new caps, sparse virtual `NEW`, deterministic ordering and
  safe error responses. No browser-to-Neon access, study-session UI,
  schema/migration/reset change or duplicate scheduler/persistence logic was
  added.
- Added focused API/service coverage and the active story at
  `docs/stories/US-08-review-queue.md`.

### Gate status

- US-08 remains `IN PROGRESS`; implementation evidence and local validation
  are pending completion before technical review.
- US-07 remains `IN PROGRESS / BLOCKED`; its diagnostic worktree and
  `docs/decisions.md` remain protected. No US-07 Trusted DB or Core CI run was
  performed.

## 2026-09-15 — US-08 acceptance evidence hardening checkpoint

### Evidence delta

- Implemented the five test-quality areas identified by technical review:
  queue-specific cross-household/disabled/missing authorization, explicit
  future progress exclusion, a UTC/local timezone boundary, ordering with
  19/20/21 due-cap fixtures, and queue-specific unsafe BIGINT revision
  handling. A narrow follow-up review found the due progress insertion order
  needed to be noncanonical as well; that P2-4 fix is now implemented and
  pending technical re-review.
- Added `scripts/test-review-queue-db.ts`, an independent real-PostgreSQL
  suite covering authorization, enabled vocabulary, due predicate and
  ordering, sparse NEW selection, MASTERED rows, caps/suppression, timezone,
  BIGINT revisions, read-only state and cleanup/reset behavior.
- Added an explicit `TRUSTED_DB_SUITE` selector. `full` remains the default
  and preserves the canonical US-07 Trusted DB path; `us08-review-queue` is
  an explicit scoped path and is never selected implicitly.
- Added only the corresponding manual workflow choice and environment
  forwarding. No product semantics, schema, migration, reset policy or
  US-07 diagnostic/CAS code was changed.

### Gate status

- Local evidence validation is being rerun after the hardening delta. Trusted
  DB has not run, so all PostgreSQL-dependent US-08 criteria remain pending.
- Core CI has not run. US-07 remains `IN PROGRESS / BLOCKED` with its known
  CAS P1 open; US-08 remains `IN PROGRESS`; US-09 has not started.
- No commit, push, exact-SHA creation, US-07 modification or owner acceptance
  was performed. `docs/decisions.md` remains protected.

## 2026-09-14 — US-07 implementation checkpoint

### Implemented scope

- Added the approved strict review request/response contracts, additive
  `learning_status`/`review_result` enums, `learner_progress` and
  `review_events` schema, migration `0004_scheduled_review_write`, reset
  ordering and `POST /api/reviews` service/route.
- Added server-authoritative authorization, vocabulary availability checks,
  sparse NEW revision `0 → 1`, deterministic fingerprints, replay/conflict
  handling, CAS writes, race reclassification, household-local dates and
  atomic progress/event persistence.
- Added focused review and schema/reset tests: `20/20` PASS; full repository
  tests are `231/231` PASS, E2E is `11/11` PASS, and lint, typecheck and build
  are PASS. US-07 remains `IN PROGRESS`; technical review, Core CI, Trusted DB
  and owner acceptance are pending.

### Scope guard

- No Review Queue, Study UI, reinforcement, US-08 work, seed change or
  CI/workflow change was added. `docs/decisions.md` remains an unrelated
  protected unstaged local modification.

## 2026-09-14 — US-07 fix-forward 1 checkpoint

### P1 findings resolved

- P1-H: review-event idempotency is now scoped to the server-authorized
  household, including pre-write lookup and post-race reclassification.
- P1-J: validated request UUIDs are canonicalized before fingerprinting,
  persistence comparison and response construction.
- P1-T: scheduler numeric persistence uses BIGINT with explicit safe-integer
  checks, safe database conversion and deterministic revision exhaustion
  handling; the US-06 scheduler remains unchanged.
- Focused US-07 service/API and schema/reset tests are now `27/27` PASS,
  including foreign-ID, UUID and numeric-boundary regressions.

### Gate status

- US-07 remains `IN PROGRESS`.
- Technical re-review is pending. Core CI and Trusted DB Integration remain
  pending; Trusted DB is required for final acceptance.
- No commit, push, Core CI run, Trusted DB run or US-08 work was performed.
- `docs/decisions.md` remains protected unrelated local work.

## 2026-09-14 — US-07 fix-forward 2 checkpoint

### Alignment scope

- Aligned the US-07 story's persistence and concurrency contract with the
  reviewed household-scoped `(household_id, review_id)` idempotency key.
- Documented BIGINT scheduler/revision storage, JavaScript safe-integer bounds,
  checked conversion and deterministic revision exhaustion behavior.
- Updated UUID regression fixtures to contain alphabetic hexadecimal characters,
  making uppercase/lowercase canonicalization coverage non-vacuous.
- Focused tests remain `27/27` PASS; full tests are `238/238` PASS; E2E is
  `11/11` PASS; lint, typecheck, build, Markdown links/anchors and
  `git diff --check` are PASS.

### Gate status

- US-07 remains `IN PROGRESS`; technical re-review is pending.
- Core CI and Trusted DB Integration remain pending; Trusted DB is required for
  final acceptance.
- No implementation redesign, commit, push, Core CI run, Trusted DB run or
  US-08 work was performed. `docs/decisions.md` remains protected local work.

## 2026-09-14 — US-07 contract owner approval

### Approved contract

- Owner approved the canonical response DTO, first materialized revision `1`,
  missing/disabled vocabulary `404 VOCABULARY_NOT_FOUND` behavior (or the
  established equivalent), authorization-before-replay and enabled-learner
  behavior.
- Fingerprint semantics, sparse virtual `NEW`, concurrent first-review
  handling, server-owned dates, immutable events and atomic progress/event
  persistence remain locked as documented in the story.
- US-07 was promoted to `READY FOR IMPLEMENTATION`; final acceptance requires
  Core CI and Trusted DB Integration. US-08 remains `NOT STARTED`.

### Scope guard

- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  an unrelated protected unstaged local modification.

## 2026-09-14 — US-07 story discovery / contract preparation

### Recommendation

- The correct next story is `US-07 — Scheduled Review Write`, aligned to
  Architecture Step 6 (`POST /api/reviews`). It is smaller and safer than
  combining review persistence with Review Queue or Study-session UX.
- Proposed success boundary: `scheduled-review-write-ready`, from the
  accepted `scheduler-domain-ready` boundary plus authenticated parent,
  authorized learner and approved sparse-progress architecture.
- Review Queue remains the later Architecture Step 8 milestone; reinforcement,
  session UX and progress presentation remain separate scope.

### Contract discovery

- The architecture fixes the strict request fields, server-owned scheduler
  computation, sparse virtual `NEW`, `reviewId` fingerprint semantics,
  `expectedRevision`, concurrent first-review race barrier, household-local
  review date, immutable event snapshot and atomic progress/event write.
- US-07 requires an additive application migration for `learning_status`,
  `review_result`, `learner_progress` and `review_events`, plus reset/index/
  privilege verification. Trusted DB Integration is therefore required for
  implementation acceptance.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains an
  unrelated protected unstaged local modification.

### Owner decisions required

- The exact successful response DTO is not specified by the repository; it
  must be approved before shared response contracts or `response_payload` are
  implemented.
- The first materialized revision is not explicitly specified. Recommended
  smallest choice: virtual `0` is consumed and first persisted/resulting
  revision is `1`.
- Confirm `404 NOT_FOUND` for missing/disabled vocabulary; no other critical
  source conflict was found.

US-06 remains `ACCEPTED / CLOSED`. US-07 implementation is now `IN PROGRESS`;
US-08 work has not started.

## 2026-09-13 — US-06 acceptance finalized

### Accepted evidence

- Owner approved US-06 final acceptance after the post-merge audit confirmed
  the exact reviewed implementation revision, no scope drift and no technical
  blocker.
- T06-01 through T06-17 are `PASS`; the success boundary
  `scheduler-domain-ready` is achieved.
- Focused learning-domain tests `51/51` PASS; full tests `218/218` PASS; E2E
  `11/11` PASS; lint, typecheck, build and `git diff --check` PASS.
- Technical re-review PASS. Core CI #32 PASS on reviewed commit
  `cc649d2dca4b233752e08f9c565ad384ea2f6816`; Core CI #33 PASS on merged main
  commit `b838f107a69830234202caded33f9b7ad0040c9e`.
- Trusted DB Integration #30 PASS is extra evidence only and was not required
  for this pure-domain story.

### Process and handoff

- PR #3 was merged before explicit Owner Acceptance. The audit verified the
  exact reviewed revision, green CI and no scope drift. Classification:
  `PROCESS-ORDER DEVIATION ONLY`; no revert was required.
- No API, persistence, review queue, session reinforcement, UI, schema,
  migration, dependency, CI/workflow or US-07 work was added by acceptance.
- US-07 has not started. `docs/decisions.md` remains an unrelated local
  modification and is excluded from acceptance work.

## 2026-09-11 — US-06 story discovery / contract preparation

### Completed

- Read the repository instructions, canonical Product/Architecture/Flow/UI
  sources, accepted US-01 through US-05 stories, progress/changelog records,
  current contracts/tests and the existing `packages/learning-domain` stub.
- Registered `US-06 — Learning Scheduler Domain` in BATCH 4 with status
  `READY FOR CONTRACT REVIEW`.
- Proposed the accepted upstream `first-flashcard-ready` handoff and the
  `scheduler-domain-ready` output boundary.
- Defined the pure scheduler input/output contract, virtual sparse `NEW`, all
  six scheduled transitions, 1/3/7/14/30 intervals, explicit local dates,
  no overdue bonus, typed invalid-input handling and persistence-owned
  revision/`reviewedAt` boundaries.

### Scope and handoff

- US-06 is pure learning-domain work only. `POST /api/reviews`,
  `learner_progress`, `review_events`, revision/idempotency, review queue,
  session reinforcement, UI, schema/migration, API and Trusted DB work remain
  out of scope.
- No application code, learning-domain implementation, schema, migration,
  API, dependency, CI/workflow or Neon operation was performed. No commit or
  push was performed.
- No source conflict was found; the remaining gate is owner review of the
  proposed contract. `docs/decisions.md` remains untouched and unstaged.
- US-07 has not started.

## 2026-09-11 — US-06 contract owner approval

### Approved contract

- Owner approved `US-06 — Learning Scheduler Domain` as a pure-domain story
  and promoted it from `READY FOR CONTRACT REVIEW` to `READY FOR
  IMPLEMENTATION`.
- Virtual `NEW` is an explicit canonical state object; `null` is not a valid
  scheduler state. The approved function receives `currentState`,
  `REMEMBERED`/`FORGOTTEN`, and explicit household-local `today`.
- The approved output is `scheduler-domain-ready`; it contains only canonical
  learning-domain values. Revision, `reviewedAt`, IDs, persistence and
  authorization remain outside the scheduler.
- Owner confirmed deterministic Gregorian calendar arithmetic, no overdue
  bonus, full transition/threshold coverage, typed validation and no UI/E2E
  requirement for this story.

### Handoff

- No learning-domain code, API, schema, migration, dependency, CI/workflow or
  Neon operation was performed. No commit or push was performed.
- The next permitted implementation scope is only the pure scheduler package
  and its exhaustive unit tests. `docs/decisions.md` remains untouched and
  unstaged.
- US-07 has not started.

## 2026-09-12 — US-06 implementation

### Completed

- Implemented `scheduleReview` in `packages/learning-domain` with explicit
  scheduler types, virtual `NEW`, state invariants, typed validation and
  synchronous deterministic transitions.
- Implemented Gregorian calendar validation/addition without system clock,
  timezone, UTC-instant, browser, storage or framework dependencies.
- Added 28 focused table-driven tests covering all transition classes,
  thresholds, date boundaries, overdue behavior, invalid input and
  non-mutation/determinism.
- Updated US-06 evidence: T06-01 through T06-16 PASS and T06-17 PASS locally;
  Core CI remains pending technical review.

### Validation and handoff

- `pnpm test` PASS (195/195), `pnpm lint` PASS, `pnpm typecheck` PASS,
  `pnpm build` PASS, `pnpm test:e2e` PASS (11/11), and `git diff --check` PASS.
- Trusted DB Integration is `NOT REQUIRED`; no API, DB/schema/migration,
  dependency, CI/workflow, UI or persistence change was made.
- US-06 remains `IN PROGRESS`; no acceptance finalization or US-07 work was
  started. `docs/decisions.md` remains untouched and unstaged.

## 2026-09-13 — US-06 fix-forward

### Completed

- Corrected the reviewed safe-integer overflow defect in scheduler counter
  increments. `totalCorrect`, `totalIncorrect` and incremented
  `consecutiveCorrect` now fail deterministically before an unsafe output can
  be returned.
- Added focused validation and transition coverage for overflow, fractional,
  NaN, Infinity and out-of-range numeric values; leap-year century rules;
  interval rollovers; large safe mastered counts; and full remembered outputs.
- Focused learning-domain tests now PASS at `51/51`; US-06 remains
  `IN PROGRESS` and no approved scheduler semantics changed.

### Validation and handoff

- No API, database/schema/migration, dependency, CI/workflow, UI, persistence
  or US-07 work was added. Trusted DB remains `NOT REQUIRED`.
- Technical re-review and Core CI remain pending. `docs/decisions.md` remains
  an unrelated unstaged local modification and was not changed.

## 2026-09-11 — US-05 implementation started

### Completed

- Moved US-05 to `IN PROGRESS` and implemented the owner-approved minimal
  learner-context → focused `/study` → first real vocabulary card flow.
- Reused the accepted `GET /api/vocabulary` contract with deterministic
  `vocabulary[0]` selection, keyboard/touch flipping and safe loading, empty,
  error, auth/403 and optional-field states.
- Added focused learner-context, Study UI/client and routing tests. No schema,
  migration, seed, write API, progress, scheduler, CI/workflow or US-06 work
  was added.

### Handoff

- Trusted DB remains inherited from accepted US-04 evidence; no new Trusted DB
  gate is proposed for this web-only story.
- `docs/decisions.md` remains an unrelated unstaged local change and is not
  part of the implementation scope.

### Validation checkpoint

- Focused US-05 tests PASS; full local test suite PASS at 167 tests.
- Lint, typecheck, build and `pnpm test:e2e` PASS (11/11) after the corrected
  Space-key interaction was revalidated.

## 2026-09-11 — US-05 pre-Core-CI manual acceptance checkpoint

### Owner evidence

- Manual owner acceptance PASS for resolved learner handoff through `Bắt đầu
  học`, real PostgreSQL-backed `/study`, first `apple` card from
  `vocabulary[0]`, front/back meaning visibility, pointer/touch and Space flip,
  Space scroll prevention, NULL optional fields, media safety, no fake review
  controls, safe `/api/vocabulary` error/retry, reload redirection and no
  active-learner persistence/guessing.
- Mobile owner verification at `375x812` for learner handoff and Study PASS with
  no horizontal overflow.
- T05-09 and T05-13 are now manual PASS; T05-10 and T05-11 remain accepted by
  automated coverage without fabricated database/content mutations. T05-12 is
  manual PASS.

### Gate and handoff

- T05-01 through T05-17 were locally PASS, subject to final Core CI evidence
  at this checkpoint; final acceptance is recorded below.
- US-05 was still `IN PROGRESS` at this pre-Core-CI checkpoint and was not
  accepted until Core CI passed.
- Trusted DB Integration is `NOT REQUIRED` for this web-only story. No schema,
  migration, seed, privilege, learning write, review write or database side
  effect was added.
- `docs/decisions.md` remains unrelated, unstaged, uncommitted and excluded.
- US-06 remains unstarted.

## 2026-09-11 — US-05 final acceptance

### Accepted evidence

- US-05 First Real Flashcard is `ACCEPTED`; T05-01 through T05-17 are `PASS`.
- Owner manual acceptance PASS for the learner handoff, `/study`, real
  `vocabulary[0]` `apple` card, front/back and flip interactions, NULL/media
  safety, no fake review controls, reload learner recovery, mobile 375x812,
  no horizontal overflow, safe API error and Retry recovery.
- Local evidence: `167/167` tests, E2E `11/11`, lint, typecheck, build and
  `git diff --check` PASS; no review/progress/scheduler/DB writes.
- Core CI #30 SUCCESS on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28 SUCCESS is incidental and is not a required
  US-05 gate. No schema, migration, seed, privilege or DB behavior changed.

### Handoff

- The local Node warning remains `22.19.0` versus pinned `22.23.2`; Core CI
  validated the pinned toolchain.
- `docs/decisions.md` remains preserved in its stash and was not changed by
  this acceptance commit.
- US-06 has not started.

## 2026-09-11 — US-04 contract preparation

### Completed

- Registered US-04 as `Vocabulary Content Seed & Read Foundation` with status
  `READY FOR CONTRACT REVIEW` before owner dataset approval.
- Locked Option A only: shared/global vocabulary schema, owner-approved 20–30
  word seed, validated controlled content migration and authenticated
  deterministic `GET /api/vocabulary`.
- Explicitly kept Learner Home, first flashcard rendering, study, scheduler,
  progress, review queue, review writes and US-05 out of scope.

### Blocker and handoff

- `DATASET_SOURCE=OWNER_APPROVAL_REQUIRED`; no vocabulary words or provenance
  were invented.
- No application code, migration, seed data, dependency, CI or Neon operation
  was performed.
- Next safe action: owner contract review and dataset-source approval. Do not
  move US-04 to `READY FOR IMPLEMENTATION` before that decision.

## 2026-09-11 — US-04 dataset source approved

### Completed

- Owner approved `VocabFlow Starter Vocabulary v1` with
  `DATASET_PROVENANCE=PROJECT_AUTHORED` and `DATASET_STATUS=APPROVED`.
- Locked the exact 30-record enabled set with stable IDs `1` through `30`,
  `contentVersion=1`, and `NULL` optional fields for v1.
- The only allowed claim is “beginner starter vocabulary selected for the
  VocabFlow MVP”; no official CEFR, Oxford, Cambridge, Wiktionary-derived or
  copied dictionary claim is permitted.
- Moved US-04 to `READY FOR IMPLEMENTATION`; no application code, migration,
  actual seed data, dependency, CI or Neon operation was performed.

### Handoff

- The next safe action is US-04 implementation from this approved contract.
- US-05 remains unstarted.

## 2026-09-11 — US-04 implementation started

### Completed

- Moved US-04 to `IN PROGRESS` and implemented the approved
  `vocabflow_app.vocabularies` schema with `content_version >= 1`.
- Added the controlled `0003` migration with the exact 30 Starter v1 records,
  the versioned JSON source artifact and pre-mutation dataset validator.
- Added shared `VocabularyDto`/response/seed contracts and
  `GET /api/vocabulary` with session → household membership authorization,
  enabled-only deterministic `id ASC` reads and strict query-scope rejection.
- Added targeted schema/reset, dataset, service and API tests. No UI, learner
  progress, review, scheduler, CI or US-05 work was added.

### Validation and handoff

- Dataset validation PASS; targeted US-04/schema/reset tests PASS; typecheck
  PASS. Full lint, tests, build and E2E remain to be run.
- Trusted DB Integration remains `PENDING ACCEPTANCE GATE`; no live Neon call
  was made.

## 2026-09-11 — US-04 pre-Trusted-DB acceptance checkpoint

### Completed

- Recorded owner manual acceptance PASS for authenticated `GET /api/vocabulary`:
  `200`, exactly 30 records, IDs `1..30`, first word `apple`, last word
  `new`, all `enabled=true`, all `contentVersion=1`.
- Recorded PASS for exact approved dataset content, all optional fields `NULL`,
  unsupported `householdId`/`learnerId` rejection as `400 INVALID_REQUEST`,
  and unauthenticated access as `401 UNAUTHORIZED`.
- Recorded local `DB_MIGRATE=PASS` plus dataset validation, lint, typecheck,
  tests, build, E2E, migration/schema/reset checks and `git diff --check` PASS.

### Gate and handoff

- US-04 remains `IN PROGRESS`; Trusted DB Integration remains
  `PENDING ACCEPTANCE GATE`.
- `403 HOUSEHOLD_ACCESS_DENIED` is automated-test evidence only; it was not
  manually forced by mutating the local database.
- The local Node runtime warning remains `22.19.0` versus pinned `22.23.2`.
- `docs/decisions.md` remains unrelated, unstaged and excluded; US-05 has not
  started.

## 2026-09-11 — US-04 acceptance finalized

### Accepted evidence

- US-04 Vocabulary Content Seed & Read Foundation is `ACCEPTED`.
- T04-01 through T04-16 are PASS with manual, local, migration/reset and
  Trusted DB evidence recorded in the story.
- Core CI #28 and Trusted DB Integration #26 both SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- US-05 remains unstarted; no next story was automatically started.

## 2026-09-11 — US-05 story discovery / contract preparation

### Recommendation

- Recommended title: `US-05 — First Real Flashcard`.
- Recommended scope: the smallest vertical slice from accepted
  `learner-context-ready` plus `vocabulary-content-ready` to one real,
  deterministic, flippable card.
- Recommended Learner Home decision: use only a minimal study-entry handoff;
  defer full due/new/progress metrics until their read contracts exist.
- Recommended output boundary: `first-flashcard-ready`.

### Contract handoff

- Reuse authenticated `GET /api/vocabulary`; select the first item in its
  deterministic `id ASC` order.
- Handle all Starter v1 optional fields as `NULL` without broken placeholders.
- Do not add schema, migration, dependency, API write, progress, scheduler,
  review or Trusted DB work.
- US-05 is `READY FOR CONTRACT REVIEW`; US-06 remains unstarted.

## 2026-09-11 — US-05 contract owner approval

### Approved boundary

- US-05 remains `First Real Flashcard` and is now `READY FOR IMPLEMENTATION`.
- Frozen input: `learner-context-ready` + `vocabulary-content-ready`.
- Frozen route: `/study`; frozen output: `first-flashcard-ready`.
- The minimal “Bắt đầu học” handoff is approved; full Learner Home metrics are
  deferred until progress/review read contracts exist.
- First selection is `vocabulary[0]` from accepted enabled-only `id ASC` API
  order. Space flips the focused card; no audio playback or review controls are
  added.

### Scope guard

- No schema, migration, dependency, API endpoint, database write, Trusted DB
  gate or US-06 work is authorized by this contract update.
- Implementation has not started.

## 2026-09-08 — Documentation and Agent Pack

### Goal

Create canonical Markdown documentation and a VocabFlow-specific AI-agent
operating contract before BATCH 1 implementation.

### Completed

- Audited the repository tree, package/configuration, apps, packages, Drizzle,
  scripts, workflows and current Git state.
- Converted six active canonical DOCX documents to Markdown.
- Added documentation index, source-baseline map, decisions, changelog,
  roadmap, story templates and US-01 contract.
- Added root `AGENTS.md` with VocabFlow scope, architecture, security, testing,
  documentation and Git rules.

### Decisions

- Family MVP remains the active product baseline; Personal MVP is historical.
- BATCH 0 is accepted and frozen.
- US-01 success boundary is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.

### Files changed

- Canonical Markdown files under `docs/product`, `docs/architecture`,
  `docs/design`, `docs/flow` and `docs/implementation`.
- Documentation governance files under `docs/`.
- Story system under `docs/stories/` and `docs/templates/`.
- Root `AGENTS.md`.

### Verification

- Textual parity check: all source paragraphs and table cells found in their
  Markdown counterpart.
- DOCX sources contain no embedded media or diagrams requiring binary export.
- Markdown link/fence validation: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS (10 files, 73 tests).
- `pnpm build`: PASS.
- `git diff --check`: PASS.
- Packaged DOCX renderer could not run because bundled LibreOffice was not
  available in this environment; no DOCX output was authored.

### Remaining / blockers

- No contract blocker remains; no feature implementation has started.

### Next safe action

- Begin US-01 implementation from `T01-01`; keep learner creation out of scope.

## 2026-09-08 — Finalize documentation governance and US-01 contract

### Goal

Resolve the documentation status gate and finalize the owner-approved US-01
registration boundary before feature implementation.

### Completed

- Aligned `docs/README.md`, `docs/stories/README.md` and `AGENTS.md` on the
  shared story status model.
- Set BATCH 1 and US-01 to `READY FOR IMPLEMENTATION`.
- Accepted success boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- Explicitly kept learner creation and new database schema/migration out of
  US-01.
- Corrected architecture conversion metadata to preserve source status
  `APPROVED FOR IMPLEMENTATION`.

### Verification

- Relative Markdown links and anchors: PASS.
- Vietnamese Unicode scan: PASS.
- No stale active DOCX links; remaining DOCX names are source-baseline/history
  references only.
- `git diff --check`: PASS.
- No application code, database code, migrations, CI or BATCH 0 changed.

### Remaining / blockers

- None for the accepted US-01 contract.
- Documentation/agent pack remains uncommitted by instruction.

### Next safe action

- Continue US-01 with T01-04 Better Auth + household bootstrap integration.

## 2026-09-08 — US-01 Phase 1 Register UI

### Completed

- Moved US-01 to `IN PROGRESS` and implemented T01-01/T01-02/T01-03.
- Added the `/register` focused auth screen, accessible email/password
  validation, password visibility toggle, Enter submit and autocomplete.
- Kept T01-04 (real Better Auth signup and authenticated household bootstrap)
  out of scope for this phase.

### Verification

- Component tests cover route rendering, validation, submit seam, keyboard
  submit, password toggle, autocomplete and error semantics.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- No database, migration, bootstrap, role-model, reset or CI changes.

### Next safe action

- Implement T01-04 Better Auth signup followed by idempotent `POST /api/bootstrap`.

## 2026-09-08 — US-01 Phase 1 checkpoint and contract correction

### Proven dependency

- The repository currently has `/api/auth/*` and Better Auth's four auth tables,
  but no `/api/bootstrap`, `households` or `household_members`; the only
  migration is the auth foundation migration.
- BATCH 0 TE-08 intentionally established Better Auth Foundation only and did
  not implement the Family household domain.

### Contract correction

- T01-04 may add the minimal additive BATCH 1 application migration for
  `vocabflow_app.households` and `vocabflow_app.household_members` using the
  approved Architecture contract.
- This does not reopen BATCH 0: role model, `vocabflow_meta`, target identity,
  bootstrap infrastructure, migration executor and reset architecture remain
  frozen.
- Learner profiles/creation and vocabulary, progress and review tables remain
  out of scope for US-01.

### Checkpoint

- Phase 1 (T01-01/T01-02/T01-03) is completed and checkpointed on branch `TXH`.
- Story status remains `IN PROGRESS`; T01-04 has not started.
- Next safe action: implement T01-04 signup plus household
  persistence/bootstrap.
- Do NOT do next: learner profile/learner UI or unrelated BATCH 0 changes.

## 2026-09-08 — Resolve Better Auth name contract blocker

### Proven blocker

- Better Auth 1.7.3 `signUp.email` requires `name`, `email` and `password`.
- The previous Phase 1 form exposed only email and password, so T01-04 could
  not safely call the pinned API without inventing a parent identity.

### Accepted resolution

- US-01 now explicitly collects `Tên phụ huynh`, `Email` and `Mật khẩu`.
- Name is required, trimmed before the Phase-1 seam, and accepts normal
  Vietnamese/Unicode text. It is the parent display/profile identity; learner
  name and learner creation remain out of scope, and household name remains
  server-owned.
- `US01_BLOCKED_BETTER_AUTH_NAME_CONTRACT` is RESOLVED.

### Checkpoint

- US-01 remains `IN PROGRESS`; T01-04 remains pending.
- No Better Auth signup request, `/api/bootstrap`, household migration or
  learner/domain implementation was started.
- BATCH 0 remains frozen.

### Next safe action

- Implement T01-04 Better Auth signup + household persistence/bootstrap.

## 2026-09-08 — US-01 T01-04 registration integration

### Completed

- Implemented the real Better Auth 1.7.3 signup path with the explicit parent
  `name`, `email` and `password` contract.
- Added the authenticated `POST /api/bootstrap` route and a server-owned,
  atomic/idempotent household resolver. Bootstrap ignores client owner input,
  uses the neutral default name `Gia đình VocabFlow`, and creates the canonical
  `OWNER` membership.
- Added only the additive `vocabflow_app.households` and
  `vocabflow_app.household_members` migration; no learner or learning-domain
  tables were introduced. Reset order is dependency-safe and preserves
  `vocabflow_meta`.
- Added signup/bootstrap loading, safe error, authenticated recovery/retry and
  completed states. Signup success alone is never presented as completed Family
  registration.
- Added API, component and migration/reset tests, including the serialized SQL
  and idempotent bootstrap contract.

### Checkpoint

- Story status: `IN PROGRESS`.
- T01-04 status: `IMPLEMENTED / PENDING ACCEPTANCE`.
- BATCH 0 remains `ACCEPTED` / frozen; no live Neon call was made.
- Acceptance review corrected the stale foundation smoke endpoint from
  `/api/auth/session` to Better Auth 1.7.3's supported
  `/api/auth/get-session`; `pnpm test:e2e` now passes locally. The test accepts
  `200 null` for a configured unauthenticated preview and `503` for secretless
  Core CI.
- Added a route-intercepted Playwright test for the native password-field
  Enter key: exactly one Better Auth signup, one bootstrap and completed state.
- Core CI and Trusted DB Integration statuses for the TXH commit are not
  available from this environment because the private repository cannot be
  queried without GitHub credentials and neither workflow runs on a TXH push.
  Do not mark US-01 accepted until those external gates are reviewed.

### Next safe action

- US-01 ACCEPTANCE TEST / REVIEW.

## 2026-09-08 — US-01 Trusted DB reset blocker

### Proven blocker

- Trusted DB reached the second migration after application reset and failed
  with SQLSTATE `42710`: `vocabflow_app.household_role` already existed.
- The reset removed application tables and migration history but left the enum
  type created by migration `0001_curious_miss_america.sql`.

### Fix scope

- Added `vocabflow_app.household_role` to the explicit application reset policy.
- Reset now drops application tables, then the enum type, then Drizzle history;
  clean-state validation fails early with `APPLICATION_ENUM_TYPES_PRESENT` if a
  type remains.
- Protected `vocabflow_meta`, the `drizzle` schema, roles and BATCH 0
  infrastructure remain untouched. Migration SQL was not made idempotent.

### Checkpoint

- US-01 remains `IN PROGRESS / PENDING ACCEPTANCE`.
- Local validation is required before the acceptance-fix commit; no live Neon
  call is made from this environment.

### Next safe action

- PR → Core CI → merge → Trusted DB Integration rerun. Do not start US-02.

## 2026-09-08 — US-01 acceptance finalized

### Accepted evidence

- US-01 Parent Registration is `ACCEPTED`.
- Core CI and Trusted DB Integration both PASS on merged main commit
  `6806e66`.
- Local lint, typecheck, 13-file/101-test suite, build and 2/2 Playwright E2E
  checks PASS; responsive checks at 375/768/1280px PASS.
- BATCH 0 remains `ACCEPTED / FROZEN`; BATCH 1 remains `IN PROGRESS`.

### Handoff

- There is no active next story.
- Next safe action: Project owner selects/reviews the next User Story.
- Do not automatically start US-02.

## 2026-09-19 — US-30 daily new word limit implementation checkpoint

- Gap audit found the existing Due-first queue, household-local date helper,
  sparse virtual New state, reset semantics, retry idempotency and US-29 set
  filtering already satisfied. Learner daily settings, daily consumption and
  parent controls were missing.
- Added `learner_profiles.daily_new_word_limit`, default 10, bounded to 0–100,
  with authorized GET/PATCH settings APIs and a learner-scoped parent UI.
- Queue allowance counts distinct current progress rows whose
  `first_learned_date` equals the household-local date. Due remains exempt and
  session caps remain independent. Atomic review writes serialize per learner
  and reject stale NEW writes after the allowance is consumed.
- Reset still deletes current progress while preserving review events; reset
  therefore makes the current lifecycle virtual New again without consulting
  all-time history.
- Focused validation is passing locally; full local and post-push Trusted DB
  gates remain pending at this checkpoint. `docs/decisions.md`, `.env.example`
  and `local-data.zip` remain protected.

## 2026-09-20 — US-35 + US-36 daily goal and learning streak

- Gap audit found the existing household-local date helper, persisted
  `review_events.review_date`, review idempotency, reset-history preservation and
  learner authorization reusable. Daily goal setting/status, unique activity
  aggregation, active-day derivation and streak UI/API were missing.
- Added `learner_profiles.daily_learning_goal` with default 10 and range 1–100.
  The existing `dailyNewWordLimit` remains an independent New-admission limit.
- Added learner-scoped `GET /api/learners/:learnerId/activity-summary`, deriving
  daily unique vocabulary and current/longest streak from persisted review
  history. Reinforcement, duplicate retry, remembered and forgotten reviews are
  handled by distinct vocabulary/date semantics; failed saves are absent.
- Progress now displays daily goal progress and streaks; parent settings can
  update both learner-scoped settings. Reset and learning-set unassignment do
  not erase historical activity. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-19 — US-31 + US-32 exercise implementation checkpoint

- Gap audit found the accepted queue, scheduler, review API, save-before-next,
  retry, reinforcement, summary and pronunciation hook were reusable; exercise
  generation, single-submit feedback, listening eligibility and safe media
  fallback were missing.
- Added a controlled `/study/exercises` route. Meaning and listening exercises
  generate four deterministic safe options from the admitted queue; insufficient
  distractors or broken audio fall back to Flashcard without changing queue
  eligibility or recording a review for media failure.
- Correct/incorrect answers use the existing `POST /api/reviews` path and map
  to `REMEMBERED`/`FORGOTTEN`. No database schema, progress semantics or
  scheduler intervals changed. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-10-02 — US-44 Study Session focus mode

- Reused `/study` and `/study/exercises`, hid the shared shell navigation in
  focus mode, and aligned the session header, progress, question, feedback and
  controls with the VocabFlow design system.
- Kept answers pending in client state until Next, so Undo clears an unsent
  answer without pretending to roll back persisted progress. Confirmed saves,
  retry identity, topic/set restrictions and session-local reinforcement stay
  on the existing queue/review flow.
- Study feature tests pass (85/85), feature ESLint passes, web-project and root
  typechecks pass, the production build passes, and `git diff --check` passes.
- No API/database command or deployment was run. Concurrent Dataset V2 and
  database workflow changes in the shared working tree are outside this Study
  scope and excluded from its commit.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D runtime bridge

- Added additive integer-ID bridge, import-run ledger, Topic/Set mappings,
  managed-membership ownership, and local transaction write guards. Created
  the human-maintained `runtime-reconciliation-v2.json`; transform output does
  not overwrite it.
- Added a pure deterministic planner, Postgres transaction adapter, dry-run
  CLI/report, target identity checks, explicit baseline/override/quarantine
  policies, stale-plan protection, and production release authorization.
- Offline current-pilot report confirms DRAFT / ineligible, 25 unresolved
  Senses, 18 unresolved Topics, 7 unresolved Learning Sets, and zero planned
  vocabulary creates/deletions/learner assignments. Synthetic approved adapter
  coverage allocates a new runtime integer in-transaction and verifies replay
  leaves the vocabulary and mapping unchanged.
- Additive migration `0015_clean_yellowjacket.sql` is generated and statically
  checked but unapplied. No Neon/shared DB or Cloudinary operation occurred.
  Focused checks completed: validator PASS (0 errors/warnings), 82 Phase 2C/2D
  tests passing, root TypeScript and repository ESLint PASS, and Drizzle reports
  no schema drift. `git diff --check` passes. The full test run also reports
  unrelated US-44 Study UI expectation failures (App shell headings and a
  Flashcard audio pause assertion); the focused dataset/transform/schema suite
  passes independently, and no UI files were changed in this task. Local Node
  is 22.19.0; package engine pins 22.23.2. No DB migration/import or Cloudinary
  mutation occurred.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.1

- Confirmed the Phase 2D membership ledger gap: independent Master/runtime FKs
  did not enforce exact identity pairs. Added three candidate unique keys and
  four composite membership foreign keys in Drizzle schema plus additive
  migration `0016_nostalgic_mattie_franklin.sql`; retained migration 0015.
- Added offline schema/migration mismatch tests, write-guard adoption transition
  tests, and deterministic canary package generation. The focused dataset/schema
  suite passes 100/100 tests; Master validation passes with 0 errors and 0
  warnings; root typecheck and ESLint pass. Drizzle regeneration reports no
  further schema changes, and `git diff --check` passes.
- The full repository run with two Vitest workers passes 909/912 tests. Its
  three failures are the existing US-44 Study shell heading/mobile navigation
  expectations in `apps/web/src/App.test.tsx`; the Study UI file remains
  untouched. Local Node is 22.19.0 while `package.json` requires 22.23.2.
- Generated an owner content review package for 8 Senses / 6 Lexemes and a
  subset release plan with 40 exact Provenance pins and the one-item
  `TECHNOLOGY_STARTER` Learning Set. Optional Topic classifications remain
  outside the subset because they are `IN_REVIEW` and the taxonomy snapshot is
  `DRAFT`; CEFR/difficulty/domain/age/school-level pilot data remain outside
  the release without changing provenance rules.
- Generated a separate reconciliation candidates report. No safe staging
  target exists; candidate search was not run, runtime visibility is unknown,
  and all eight Sense decisions remain `UNRESOLVED`. The canonical manifest
  and `runtime-reconciliation-v2.json` remain unchanged.
- Recommended a dedicated isolated staging/canary target in a later explicitly
  authorized step. No database, branch, learner state, review events, or media
  services were mutated.
- Final Phase 2E gates: `BRIDGE_DB_INVARIANTS_READY = YES`,
  `STAGING_TARGET_READY = NO`, `CANARY_CONTENT_REVIEW_READY = YES`,
  `CANARY_RELEASE_READY = NO`, `RUNTIME_RECONCILIATION_READY = NO`,
  `MIGRATION_APPLY_READY = NO`, and
  `PHASE_2E_STAGING_CANARY_READY = NO`.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.2

- Added the explicit pending owner approval artifact, including per-Sense
  learner fields, separate Lexeme/Pronunciation review, optional Learning Set
  and item decisions, and release-level sign-off. Added a deterministic
  release builder which verifies the raw source manifest hash and exact pins,
  writes new immutable entity revisions into an isolated `2.1.0` workspace,
  closes Provenance/media-slot references, validates the release, and runs the
  offline RELEASE transform. No source DRAFT record is changed.
- Added the pure read-only runtime snapshot scanner. Exact matching is only a
  discovery hint; every result stays `UNRESOLVED`. It reports override and
  quarantine semantics, projection differences, history counts, source
  identity fields, Topic/Set collisions, and flags a runtime ID shared by
  multiple polysemous Senses.
- Allowed an approved release with no pinned taxonomy only when it also has no
  pinned Classification. The synthetic builder test confirms eight eligible
  projection rows, null media URLs/Topic/Level, valid release/content hashes,
  and an unresolved reconciliation template. The test workspace is temporary
  and removed; no real canary release was created.
- The real owner template is still `PENDING`; `2.0.0` remains DRAFT. There is
  no dedicated staging branch or staging CLI target, so no target was added,
  no runtime snapshot was read, and no DB or migration command was run. The
  canonical root manifest and human-owned reconciliation file are unchanged.
- Node `v22.23.2`, pnpm `11.17.0`; Master validator PASS (0 errors, 0 warnings,
  1 informational DRAFT issue); focused Dataset V2 suite PASS (7 files,
  95/95 tests); root typecheck and ESLint PASS; Drizzle generation reports no
  schema changes. Final `git diff --check` is recorded with this change.
- A full-repository Vitest run was interrupted after the output identified
  three failures in `apps/web/src/App.test.tsx` and then produced no further
  progress for over two minutes. The displayed failures are the US-44 Study
  shell-heading/mobile-navigation expectations; the Study files were not
  touched. The complete current full-suite count is therefore unknown.
- Readiness gates are recorded in
  [`Phase 2D.2 readiness`](architecture/master-vocabulary-v2-phase-2d2-readiness.md).

## 2026-10-04 — Feature #12 Weak Words / Need Review

- Completed US-49 with a learner-authorized Weak/Learning/Stable read model,
  review-evidence search/filter/pagination, responsive `/weak-words` UI and a
  server-resolved weak Study scope. Classification and due state are separate;
  DUE/VOLUNTARY and Session Summary scope preservation use the existing review
  queue and canonical scheduler.
- Rule: latest 10 valid persisted review events per word in the inclusive
  30-household-local-date window; minimum 2 reviews and exact accuracy below
  60% is Weak. Non-Weak `LEARNING` is Learning; non-Weak `MASTERED` is Stable.
- No schema or migration changes, database mutation, deployment, merge or
  Dataset V2 file changes. Per-word Study target remains deferred.
- Validation PASS: 15 focused regression files / 152 tests plus one focused
  AppShell route test; feature TypeScript/TSX ESLint; `pnpm typecheck`;
  `pnpm build`; `git diff --check`. Local Node is 22.19.0 while the package
  requests 22.23.2; build completed with existing bundler notices.
- Evidence: [US-49](stories/US-49-weak-words-review.md),
  [DEC-024](decisions.md#dec-024--weak-word-classification-and-study-scope).

## 2026-10-03 — Owner-approved Master Vocabulary V2 canary 2.1.0

- Recorded the owner's explicit approval for all eight canary Senses, the six
  required Lexemes, the exact one-item `TECHNOLOGY_STARTER` Learning Set, null
  runtime media URLs, and release 2.1.0. Experimental classifications were not
  approved.
- Built the immutable `APPROVED` release at
  `vocabflow-dataset/releases/canary-v2.1.0`: schema 2.0.1, 8 Senses, 6
  Lexemes, 41 Provenance records, 1 Learning Set/item, 2 planned media assets,
  no media versions, and no classifications/taxonomy. Release hash:
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.
- Master validator PASS (0 errors/warnings); Phase 2C RELEASE transform PASS
  (8 projections, `importEligible=true`). The generated release-scoped
  reconciliation has eight `UNRESOLVED` Sense decisions and remains
  non-human-reviewed/non-importable. Runtime reconciliation and Phase 2E stay
  not ready; no target or runtime snapshot was used.
- Focused Dataset V2, preparation, transform, planner, reconciliation scan,
  and schema suite PASS (7 files, 91/91). TypeScript, ESLint, and
  `git diff --check` PASS. Bridge-hardening has one existing stale migration
  index assertion (expected 16, current journal 17); its other 11 tests pass.
- No database/Neon connection, migration, import APPLY, runtime identity
  decision, ID allocation, learner assignment change, Cloudinary operation, or
  Study UI file change occurred. The release report is
  `vocabflow-dataset/reports/canary-release-2.1.0-report.md`.

## 2026-10-04 — Master Vocabulary Dataset V2 Phase 2F.2

- Materialized 100 pinned candidate decisions in the offline
  `hybrid-100-editorial-draft` workspace: 2 existing Sense reuses, 3 new
  Senses on existing Lexemes, and 95 new Senses on 84 new Lexemes. The 98 new
  Senses each have project-authored English definitions/examples and
  Vietnamese translations; all records remain DRAFT.
- Reviewed five existing-Master collisions, 12 polysemy groups, and ten
  4600-only meanings. Stable UUIDv7 identity registry contains 574 new IDs;
  rerun allocation is zero and the draft package fingerprint is
  `ae0c6877f5f91e7225dcfa28c8fb98daed6ae235302b7e5daa19406c7b9ed152`.
- Source exact-match and eight-token overlap checks pass. No source text or
  media was reused. Source/media rights remain unverified; CEFR stays in
  editorial evidence and no Classification or Provenance records were added.
- Canonical Master, root dataset manifest, and canary release are unchanged.
  The development canary remains verified. No runtime bulk import has begun;
  there were no database writes, migrations, production connections, or media
  operations. Owner/editor review and any promotion decision are next.
- Root Master validator PASS (0 errors, 0 warnings, 1 informational DRAFT
  issue); root typecheck PASS; focused Phase 2F.2 tests PASS (10/10); focused
  ESLint and `git diff --check` PASS. Full repository ESLint reports one error
  in the unrelated, uncommitted `apps/web/src/features/learners/weak-words-page.tsx`
  effect at line 111. The local Node runtime is 22.19.0; the package engine
  requests 22.23.2.

<!-- PHASE-2F5-AI-PROGRESS START -->
## 2026-10-05 — Phase 2F.5 Hybrid-100 CEFR Promotion and RC

- Owner-approved 100/100 CEFR decisions under fingerprint d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622 were promoted to canonical DRAFT: 97 new Classification identities and light revision 2; water reuses revision 1; fuse remains intentionally unclassified.
- Promoted 197 immutable CEFR Provenance records. Canonical root remains version 2.0.0 / DRAFT, with 103 Lexemes, 123 Senses, 219 current Classification pins and 1043 Provenance pins.
- Built immutable 2.2.0-rc.1 from the exact 87-Lexeme / 100-Sense cohort. Candidate status is IN_REVIEW with 99 CEFR assignments and exact provenance closure.
- This is not an APPROVED release. No releaseHash exists. Source and media rights remain unverified. No runtime reconciliation, Neon import, database write, or production mutation occurred.
- Remaining gates: final RC owner review, DRAFT canonical content review, DRAFT taxonomy review, and separate APPROVED-release authorization.
<!-- PHASE-2F5-AI-PROGRESS END -->

## 2026-10-05 — Phase 2F.6 Hybrid-100 RC final audit

- Offline audit PASS: immutable 2.2.0-rc.1 retains the pinned fingerprint and
  exact 87-Lexeme / 100-Sense cohort, 99 CEFR assignments, and 799-record
  provenance closure. Learner-facing semantic drift is zero; no content
  correction or rc.2 is required.
- The release plan calls for approval-only next revisions for 87 Lexemes,
  100 Senses, and 99 Classifications. No records or IDs were created.
- Taxonomy 2.0.0 remains an immutable DRAFT snapshot. Repository policy does
  not define a lifecycle-only approval version step, so option C is recorded:
  an owner architecture decision is required before release 2.2.0 can be
  built. No APPROVED release or releaseHash was created; final owner release
  authorization remains pending.
- Runtime import and production mutation remain unauthorized. No database,
  reconciliation, runtime, canonical lifecycle, or RC mutation occurred.
- Focused audit regression: 6/6 PASS; audit `--check` reports all artifacts
  materialized with no differences. Master validator, typecheck, global ESLint,
  and `git diff --check` PASS. pnpm reports the local Node 22.19.0 is below the
  package's requested 22.23.2 engine; the listed checks completed successfully.
- Evidence: [final audit report](../vocabflow-dataset/reports/hybrid-100-rc-final-review-2.2.0-rc.1.md),
  [owner decision](../vocabflow-dataset/reports/hybrid-100-rc-final-owner-decision.md),
  and [machine-readable review plan](../vocabflow-dataset/workspaces/hybrid-100-rc-final-review/).

## 2026-10-06 — Global Search (Feature #14 / US-51)

- Added a learner-scoped, read-only global search API for enabled Vocabulary,
  accessible Topics and enabled Learning Sets, plus a shared typed result
  contract. Search is bounded to five results per group by default, ranks
  matches deterministically, uses parameterized SQL, and performs one grouped
  search read after the canonical ownership guard.
- Added the desktop Ctrl/Cmd+K command palette and compact-header mobile
  full-screen search, accessible grouped results, keyboard navigation and up
  to five deduplicated local recent query strings. Study focus routes keep
  search hidden; existing desktop/mobile navigation counts remain unchanged.
- Added API, web, recent-search and AppShell tests. No migration, scheduler
  change, database mutation or production deployment was made.

## 2026-10-06 — Phase 2F.7A canary baseline correction

- Phase 2F.7 correctly stopped before writing release data after its clean
  worktree did not match the historical canary fingerprint. That fingerprint
  came from non-authoritative dirty working-tree bytes and is superseded for
  current-state checks; prior Phase 2F.6 artifacts retain it as historical
  evidence.
- The committed canary Git tree is
  `f5d4e502be5106da191b5b2ab807f5db12065831` at both the last canary-changing
  commit `7ce73b7c8e0d2f14e4d7c34366bf6cd08544f847` and the approved baseline.
  The guard now checks the pinned Git tree at HEAD and origin/TXH, the last
  canary-changing commit, tracked working-tree status, and untracked files.
- The committed-content SHA-256 is recorded in the correction artifact.
  Canary files, RC/CEFR content, taxonomy plans, approval-only revision plans,
  and release data were not changed. No taxonomy 2.0.1, approval revisions, or
  release 2.2.0 were created; no database, runtime reconciliation, or
  production access occurred.
- Phase 2F.7 owner authorization remains valid. Resume it only after this
  correction is reviewed remotely.
# Current Handoff Snapshot

## 2026-10-06 — Master Vocabulary V2 Phase 2F.6A taxonomy policy closure

- Recorded the owner's taxonomy approval architecture decision: taxonomy
  `01a0fc13-09e9-72dd-b49d-ffef077385dd` version 2.0.0 remains immutable
  `DRAFT`; approval is planned as a new immutable 2.0.1 `APPROVED` snapshot
  using a `PATCH` bump. Semantic taxonomy change is prohibited and the future
  full-payload comparison must have zero diff; 2.0.1 has not been created, so
  that future comparison is not yet verified.
- Added taxonomy-specific PATCH/MINOR/MAJOR version policy and the exact
  approval semantic projection rule. Only top-level `taxonomyVersion`,
  `status`, `createdAt`, and `updatedAt` are excluded; nested child lifecycle
  statuses remain in the comparison.
- Pinned the unchanged 2.2.0-rc.1 fingerprints. The 87 Lexeme / 100 Sense / 99
  Classification next-revision plan and recomputed Provenance closure remain
  approval-only; final 2.2.0 is technically ready but final build authorization
  is still pending.
- No taxonomy 2.0.1, approved entity revisions, release 2.2.0, releaseHash,
  runtime import, database access/write, migration, or production mutation was
  performed. The Phase 2F.6A focused suite passes (7/7); the dataset validator
  passes (0 errors, 0 warnings, 1 informational issue); the deterministic
  audit reports ALREADY_MATERIALIZED twice with the same policy fingerprint;
  targeted ESLint and `git diff --check` pass. Root `pnpm typecheck` and
  `pnpm lint` report errors only in concurrent, uncommitted global-search UI
  files under `apps/web`; these changes are outside this phase and were left
  untouched. Root typecheck also required rebuilding the existing workspace
  contract declarations from the concurrent `packages/contracts` source edit.
  The local Node 22.19.0 runtime emits the package's Node 22.23.2 engine warning.

## 2026-10-05 — Simplified App Navigation (Feature #13 / US-50)

- Replaced the oversized primary nav with exactly six desktop destinations:
  Trang chủ, Từ vựng, Học tập, Tiến trình, Yêu thích, Cài đặt. Below 1024px,
  the sidebar is replaced with a fixed bottom bar containing the first five.
- Added responsive account controls on the sidebar/header with Người học and
  Cài đặt menu links, keyboard focus/arrow/Escape handling and outside-click
  dismissal. Study Setup is the Học tập link; active state covers `/study` and
  `/study/exercises`, while auxiliary routes have no unrelated active item.
- Preserved auxiliary paths. Weak Words is linked from Home's due stat; Topics
  from Vocabulary and Progress; Learning Sets from Home; Learners from the
  account menu and existing Home learner switcher. No Home redesign or API
  request was introduced.
- Updated US-44's older instruction to hide AppShell navigation during Study;
  the question/task remains focused inside the shared shell.
- Validation: focused regressions 14 files / 207 tests PASS; `pnpm typecheck`,
  `pnpm build`, changed-feature ESLint and `git diff --check` PASS. Browser
  checks at 1440px/768px/390px confirmed the responsive model, bottom-nav
  clearance, no horizontal overflow and mobile account-menu open.
- No Dataset V2 file staged or edited for this feature. No API, DB, migration,
  database mutation or deployment performed. Feature files await final
  owner-check/commit workflow.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4C readiness metadata consistency

- Corrected the full CEFR release-readiness generator so root and CEFR gate
  owner scopes both state `FULL_HYBRID_100_CEFR_COHORT`. Rebuilt the four
  blockers and recommendation for the completed 100/100 review; no blocker now
  says 95 decisions remain pending or asks to resolve the closed review queue.
- Promotion readiness remains YES while canonical promotion authorization,
  release authorization, runtime authorization, production authorization, and
  approved-release readiness remain NO. No CEFR values, decision states,
  Classification IDs, or Provenance IDs changed.
- The full CEFR fingerprint is now
  `d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622`.
  It supersedes `5c2132d01b43a7539d1b7745bf4d65bafe498c13e5fc332437c9ab0b46812dfd`
  because release-readiness metadata is an input to the fingerprint; only the
  root scope, blockers, and recommendation were corrected.
- Master validator PASS (0 errors, 0 warnings, 1 informational DRAFT issue);
  focused Phase 2F.4B/2F.4C tests PASS (11/11; the historical 2F.4A-only suite
  is skipped after full closure); approval `--check`, typecheck, ESLint, and
  `git diff --check` PASS. Local Node is 22.19.0 while the package requests
  22.23.2. Canonical Master, root dataset manifest, releases, runtime,
  database, and production were not mutated.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4B full CEFR owner approval

- Owner-approved the exact 95 rows pending from the pinned Phase 2F.4A
  closure. All 100 decisions are now resolved: 99 classified and fuse remains
  intentionally unclassified. Final decisions are 1 reuse, 1 revision plan,
  97 new editorial classifications, and 1 unclassified; distribution remains
  A1 17, A2 28, B1 20, B2 27, C1 7, unclassified 1.
- Added 95 stable workspace `OWNER_REVIEW` provenance IDs and no Classification
  IDs. Workspace provenance totals are 98 `PROJECT_AUTHORED` and 99
  `OWNER_REVIEW` (197 total), covering all 99 classified/reused outcomes.
  Water reuse has workspace governance evidence without a canonical rewrite;
  fuse has no Classification provenance. Full owner-approved fingerprint:
  `5c2132d01b43a7539d1b7745bf4d65bafe498c13e5fc332437c9ab0b46812dfd`.
- Canonical Classification promotion readiness is YES; canonical promotion
  has NOT occurred and approved release readiness remains NO. No release,
  runtime import, database operation, or production change occurred. The
  Phase 2F.4A light predecessor report now renders its pinned SHA-256 from
  metadata. Source/media rights remain unverified; no official CEFR claim is
  made.
- Master validator PASS (0 errors, 0 warnings, 1 informational DRAFT issue),
  Phase 2F.4B focused regression tests PASS (9/9), typecheck PASS, ESLint PASS,
  deterministic rerun PASS, and `git diff --check` PASS. Local Node is
  22.19.0 while the package requests 22.23.2.

## 2026-10-05 — Master Vocabulary V2 Phase 2F.4A CEFR owner exception closure

- Closed exactly five owner-reviewed CEFR exceptions in the workspace: light
  A1 as a revision-2 plan under its existing Classification ID, freshman B2,
  roster B2, liable C1, and fuse intentionally unclassified for insufficient
  evidence. The other 95 editorial decisions and their general
  `PENDING_OWNER_REVIEW` statuses remain unchanged.
- Final outcomes: 1 reused classification, 1 planned revision, 97 new
  editorial classification decisions, 1 intentionally unclassified, and 0
  exception-queue items awaiting owner review. Values are present for 99/100;
  distribution is A1 17, A2 28, B1 20, B2 27, C1 7, unclassified 1.
- Added three stable UUIDv7 Classification IDs and eight provenance IDs
  (four project-authored and four `OWNER_REVIEW`). Light revision 1 remains
  byte/content pinned at A2 / `IN_REVIEW`; revision 2 is a workspace-only
  DRAFT plan. Closed-package fingerprint
  `ec0a6e34556a3d484dbdd608e592b912cb8c4ff2ceafdbe46b9cac02ea23b18f`
  repeated with zero new IDs allocated on rerun.
- CEFR editorial decision gate PASS; the exact cohort has 100 resolved
  outcomes and 99 values. Content cohort ready YES; canonical Classification
  promotion readiness NO; approved release ready NO. Source/media rights
  remain unverified and no official CEFR/source claim is made.
- No canonical classifications, semantic records, dataset manifest, or
  releases changed. No runtime/import scanner, database, migration, or
  production operation occurred. Master validation PASS (0 errors, 0
  warnings, 1 informational DRAFT issue); Phase 2F.4A regression tests PASS
  (9/9), typecheck, full ESLint, and `git diff --check` PASS. Local Node is
  22.19.0 while the package requests 22.23.2.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.4 CEFR editorial draft

- Added a deterministic, offline CEFR classification workspace for the exact
  owner-approved 100-Sense semantic cohort under `CEFR / EDITORIAL-PILOT-1`.
  The package audits existing classifications, reuses the matching water A2
  record, holds four assignments for owner review, leaves one 4600-only Sense
  unclassified, and drafts 94 new Classification/PROJECT_AUTHORED provenance
  records. All new records remain workspace-only DRAFT artifacts.
- CEFR proposal distribution: A1 17, A2 28, B1 21, B2 27, C1 6, unclassified
  1. Oxford-backed evidence agrees with 48/90 proposals (53.3%); 39 are
  editorial adjustments and 3 require owner review. The 4600-only row with a
  defensible estimate was decided independently of source CEFR.
- Fingerprint `2da4c57ebbd18ce5e2c1fa77749fb7fe79a2f22752ba39506d2f59a7d7804a74`
  repeated; rerun allocated zero IDs. Semantic promotion remains canonical
  DRAFT at 2.0.0/schema 2.0.1 (103 Lexemes / 123 Senses / 846 Provenance).
  No canonical classifications were added, no release was created, no runtime
  import or database write occurred, and production was untouched. Source and
  media rights remain unverified.
- Readiness: content cohort YES; approved release NO. Recommend building a
  100-Sense release candidate only after owner review, then assess expansion to
  500. This is analysis, not execution. First-pass corrections remain 24/98
  (24.49%), so the larger authoring batch should follow the 100-Sense release
  workflow review.
- Evidence: [classification draft report](../vocabflow-dataset/reports/hybrid-100-cefr-classification-draft.md),
  [owner review sheet](../vocabflow-dataset/reports/hybrid-100-cefr-owner-review.md),
  [Phase 2F.4 workspace](../vocabflow-dataset/workspaces/hybrid-100-cefr-draft/).
- Verification: focused regression tests 13/13 PASS; workspace materialize and
  `--check` PASS with the same fingerprint and zero rerun IDs; Master validator
  PASS (0 errors, 0 warnings, 1 informational DRAFT issue); typecheck, full
  ESLint, and `git diff --check` PASS. Local Node is 22.19.0 versus the
  package's 22.23.2 engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.3 canonical promotion

- Recorded the owner's explicit approval for the exact 100/100 Phase 2F.2A
  draft fingerprint `a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d`,
  scoped to canonical DRAFT promotion only. The prior owner-review artifact and
  frozen identity registry remain unchanged.
- Promoted 84 new Lexemes and 98 new Senses with the existing allocated IDs.
  Two existing Sense decisions remain reuse-only; three new Senses attach to
  the existing light/reservation Lexemes without rewriting them. All promoted
  records and linguistic children remain DRAFT.
- Added 590 provenance records: 490 `PROJECT_AUTHORED` records covering Sense
  labels and learner-facing children, plus 100 `OWNER_REVIEW` records for the
  candidate decisions. No `LICENSED_SOURCE` or `PUBLIC_DOMAIN_SOURCE` records
  were added; external source/media rights remain unverified.
- Root dataset remains DRAFT at datasetVersion 2.0.0 / schemaVersion 2.0.1.
  Canonical manifest totals are 103 Lexemes, 123 Senses, and 846 Provenance
  records. No Classification, media, pronunciation, release, runtime import,
  database, migration, or production change was made.
- Promotion plan fingerprint:
  `5c10618ee72fcc7b99b270764e412ebc51f286eadc750e45a6910830bb15e870`.
  The post-apply `--check` reports materialized, zero canonical diff, and zero
  provenance IDs to allocate on rerun. Source-overlap evidence and semantic
  content match the approved workspace. The local canary tree was byte-identical
  before and after this promotion; existing local canary edits were preserved.
- Validation: canonical Master validator PASS (0 errors, 0 warnings, 1
  informational DRAFT note); focused promotion tests 14/14 PASS. Typecheck,
  ESLint, and `git diff --check` are recorded with the final commit. Local Node
  is 22.19.0 while package.json requests 22.23.2.
- Evidence: [canonical promotion report](../vocabflow-dataset/reports/hybrid-100-canonical-promotion.md)
  and [US-45](stories/US-45-master-vocabulary-v2-runtime-import-bridge.md).

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1A source-proof gate correction

- The prior proof had a real contradiction: coverage evaluated the internal
  `_structuredGroup` bit and found two selected Oxford note-level fallbacks,
  while the generated report hardcoded an “all structured” claim. Candidate
  sanitization omitted the bit, so the stable `sourceSenseGroupReference`
  could not distinguish true structured groups from generated fallback refs.
  Separately, the editorial-ready flag depended only on the 100-candidate
  count.
- Replaced the two verified fallback candidates deterministically in their
  existing Oxford+4600 / CEFR cells. POS distribution, Master collision
  status, polysemy membership, and lexical-unit type were preserved. The
  remaining 88 Oxford selections and 10 4600-only candidates are unchanged.
  New candidate IDs: `SOURCE-CANDIDATE-616c853e98fddfbade0001ee43b364e6b5ef6b6ad73efcee81897818e81720b5`
  and `SOURCE-CANDIDATE-9778e99282e13db6006303903ab40a2205f4940ea2b8333cb59b2da97111783c`.
- Sanitized candidates and crosswalks now include `senseSegmentationStatus`;
  parser contract `APKG-SOURCE-PROOF-3` versions this proof change. Readiness
  requires source/APKG verification, 100 candidates, 90 structured Oxford
  candidates, polysemy/media/dedup/selection gates, deterministic repeat, no
  committed raw content, zero allocated Master IDs, no canonical mutation,
  and zero database writes. Rights remain NO and block source reuse, but do
  not block independently authored editorial content. Alignment need not be
  100%; ambiguous cases require human/editorial review.
- Real source proof fingerprint repeated as
  `89d6477c3c1a32a0eb1e367f09df37238554f762b3b378c0f590525f3d0a4ccc`.
  Coverage: 90 structured / 0 fallback; 70/20/10 source split; 18 per CEFR;
  12 polysemy pairs; 55 multi-sense Lexemes; five Master collision candidates.
  Editorial authoring and Phase 2F.1A gates are YES. Source/media reuse remain
  NO; no database, Master, or media mutation occurred.
- Verification: focused source-proof tests 15/15; Master validator PASS (0
  errors, 0 warnings, 1 informational DRAFT issue); typecheck PASS; lint PASS;
  and `git diff --check` PASS. pnpm reports local Node `22.19.0` versus the
  declared `22.23.2` engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.2A editorial QA

- Reviewed all 100 candidate decisions and all 98 authored Sense drafts against
  semantic target, POS, labels, Vietnamese equivalents, definitions, examples,
  translations, sibling meanings, and language quality. Resolved 24
  candidate-level issue groups, including the five requested checks plus two
  additional source-target mismatches found in crawl and compelling.
- Rechecked all 90 Oxford-backed candidates against their pinned structured
  groups in the ignored raw cache, including POS, and reviewed the ten
  4600-only meanings as independent coherent senses. Confirmed 2/2 exact-enough
  existing Sense reuse decisions, 3/3 distinct new Senses on existing Lexemes,
  and all 12 polysemy blocks.
- Re-ran materialization twice. Draft fingerprint is
  a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d;
  the identity registry hash is unchanged and rerun UUID allocation is zero.
  Source overlap passes: zero exact English matches, zero overlaps of eight or
  more contiguous tokens, and zero unresolved high-similarity cases.
- The owner decision sheet recommends APPROVE_DRAFT for 100/100 candidate
  decisions. This is a Codex recommendation only:
  OWNER_FINAL_APPROVAL = PENDING and canonical promotion is not authorized.
  The canonical Master, root dataset manifest, and canary release are
  unchanged; no database, import, migration, production, or media operation
  occurred.
- Verification: focused Phase 2F.2/2F.2A tests 16/16, workspace validator
  PASS, root Master validator PASS (0 errors, 0 warnings, 1 informational
  DRAFT issue), typecheck PASS, full ESLint PASS, and git diff --check PASS.
  Local Node is 22.19.0 versus the declared 22.23.2 engine.

## 2026-10-04 — Master Vocabulary V2 Phase 2F.1 hybrid 100-Sense source proof

- Added a dependency-free Python APKG parser and synthetic fixture suite. It
  recomputes source identities from the local Oxford and 4600 packages, reads
  Anki collection/model/note/card metadata and the media map, and keeps complete
  raw note fields only in the ignored `.vocabflow-local` cache.
- Generated the separate sanitized
  `vocabflow-dataset/workspaces/hybrid-100-sense-proof` package and report.
  The exact sample is 70 Oxford + 4600 headword matches, 20 Oxford-only and 10
  4600-only authoring candidates; the 90 Oxford-backed Senses are 18 per CEFR
  level. The sample meets POS minima and has 68 Senses from 55 multisense
  Lexemes, including 12 paired Lexemes, plus 5 multiword candidates.
- Semantic alignment remains evidence-based: 34 `ALIGNED`, 3
  `HEADWORD_ONLY`, 33 `AMBIGUOUS`, 20 `NO_MATCH`; all 10 4600-only candidates
  require later semantic authoring. The selected sample references five
  existing Master candidates by identity and meaning audit; no new Master IDs
  were allocated.
- Recorded 99 selected technical media candidates with sanitized member
  references, sizes, SHA-256 values and detected/declared types. Example audio
  has a separate Example candidate; images receive a Sense target only after
  semantic alignment. Source/media rights remain unknown and every media item
  is non-shippable.
- Two independent real-source passes produced fingerprint
  `276a2c39e311cb9f434976dd4b22f06d2db2f335b8b882b0bdfb2e6af3eb6323` both
  times. The canonical Master is unchanged; the development canary remains
  `VERIFIED`; production is unchanged and bulk runtime import has not started.
- Verification: synthetic fixtures 10/10, Master validator 0 errors / 0
  warnings / 1 informational DRAFT issue, typecheck PASS, lint PASS, and
  `git diff --check` PASS. Local Node is 22.19.0 versus the declared 22.23.2.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.6 development canary closure

- Added a dedicated read-only post-apply verifier. The target-verified
  development run passed all checks: 19/19 migrations through
  `0018_panoramic_spirit`, eight exact Master mappings and fingerprints, the
  Technology Starter #17 algorithm membership, one matching import ledger row,
  and an all-NOOP current plan with zero issues.
- Frozen release 2.1.0 / schema 2.0.1, reconciliation JCS hash, pre-apply plan
  fingerprint, and import run remain unchanged. The scanner's post-apply
  snapshot mismatch is classified as stale pre-apply evidence only after the
  dedicated verifier passes; the importer's pre-apply stale-snapshot guard is
  unchanged.
- Apple #295 and record #849 remain unmapped and untouched. The prior canary
  evidence records preserved runtime enrichment and unchanged learner history.
  This phase performed no database writes, APPLY, migrations, or production
  connection. Production import remains unauthorized; bulk ingestion has not
  started. The 100-Sense hybrid proof gate authorizes only offline package work.
- The sanitized closure report is
  `vocabflow-dataset/reports/master-v2-development-canary-closure.md`.
- Focused validation passed: 8 test files / 83 tests, Master V2 validation
  (0 errors, 0 warnings), root typecheck, lint, and `git diff --check`. The
  local Node 22.19.0 version is below the repository's declared 22.23.2.

## 2026-10-04 — Feature #11 Progress Dashboard

- Progress Dashboard implementation is in progress. The prior audit confirmed
  learned = unique materialized learner progress rows; Mastered = current
  `MASTERED`; accuracy = persisted `REMEMBERED / (REMEMBERED + FORGOTTEN)` by
  household-local `review_date`; current streak reuses Activity Summary.
- `/progress` now has four evidence-based metrics, 7/30-day URL period
  selection, grouped activity/accuracy charts with blank no-review dates, and
  active-learning-set level coverage plus started Topic coverage.
- Progress Summary adds a set-based `progressByLevel` aggregate. The dashboard
  no longer calls the Gamification GET path because achievement reconciliation
  writes. No migration or database mutation is part of this change.
- Focused validation passed: 10 test files / 107 tests, the `apps/web`,
  `apps/api` and `packages/contracts` project-reference typecheck, production
  build, feature-file ESLint and `git diff --check`.
- Root `pnpm typecheck` initially exposed five errors in the new
  `scripts/master-vocabulary-v2-post-apply-verification.ts`; Phase 2E.6 fixed
  them, and the final root typecheck passes. The dashboard edits remain
  unrelated and are excluded from the Phase 2E.6 commit.
- Do not stage, commit, or alter unrelated unstaged/untracked Dataset V2 work
  and do not alter stashes.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.5 development canary APPLY

- Executed exactly one owner-authorized APPLY against the verified development
  Neon target `shy-hill-72364426 / br-square-grass-b3af0nte / neondb`, using the
  runtime role. No production, test/shared-CI target, migration, or learner
  assignment was touched.
- Release `2.1.0` remained immutable at
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`. The
  reviewed reconciliation JCS hash remained
  `75f67d20edc771c931e8cbf1d70118e339374c22f35a5d062160bca3f489efb2`; the
  exact pre-apply scan and plan fingerprints were `d4e4c7cb…0235a0`,
  `18b80a1a…7257f4`, and `4ffcb88e…d8718b` respectively.
- The committed import updated apple #1, bank-financial #871, and reservation
  #284; created bank-river #2025, record-noun #2026, record-verb #2027,
  look-after #2028, and algorithm #2029; and created Technology Starter #17
  with algorithm at position 1. Versions are 3, 2, 2, and 1 for each new row.
- Post-apply verification found 8/8 release mappings and a fresh read-only plan
  with 8/8 vocabulary actions `NOOP`. Import run
  `de0b29c4-db84-4d76-abd4-398f17151099` is recorded once. Runtime enrichment
  was preserved. Apple #295 and vinyl record #849 remain unmapped and unchanged;
  Apple consolidation remains future owner work.
- Progress and review aggregates stayed at 87 and 229. The apply plan reports
  zero mapped history references, deletions, or learner assignment changes;
  the import adapter has no write path for learner progress, review events, or
  learner Learning Set assignments. No API smoke request was made because the
  catalog routes require an authenticated learner session; direct read-only
  runtime catalog verification passed.
- Post-apply scan observed the expected changed runtime snapshot
  (`34b43959…54c4296`) and refused the old owner-proposal snapshot pin. The
  human-owned reconciliation was left unchanged; a separate read-only planner
  against the verified live snapshot returned 8 NOOP actions. No second APPLY
  was run.
- Focused validation passed: 7 test files / 100 tests, Master V2 validation,
  and `git diff --check`. Root typecheck and lint report errors in unrelated,
  concurrent progress-dashboard edits under `apps/api`, `apps/web`, and
  `packages/contracts`; these files were not included in the canary evidence.
- Sanitized evidence:
  `vocabflow-dataset/reports/canary-development-apply-verification.md`.
  Generated scanner artifacts and APKG analysis files remain unstaged.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4D final reconciliation V3

- Reverified the development Neon target, 19/19 migration rows through
  `0018_panoramic_spirit`, and zero migration hash mismatches. The scanner and
  importer used read-only repeatable-read snapshots.
- Re-reviewed the pinned scan change: the refreshed candidate evidence adds one
  review event to duplicate Apple #295 (count 1 → 2); the explicit owner choice
  continues to map Apple to #1 and leaves #295 untouched. Repeat scans before
  and after the final planner returned the same current fingerprint.
- Finalized the human-owned V3 artifact at the architecture's stable path,
  `vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json`, pinned to
  the current target, source contracts, release hashes, and scan fingerprints.
  Added release-root resolution and development snapshot evidence checks to
  the importer so the release artifacts and package-level owner file work
  together and stale evidence blocks planning.
- Final DRY_RUN: 3 mapped updates, 5 vocabulary creates, 1 Learning Set create,
  1 algorithm membership insert; `reconciliationComplete=true`, `canApply=true`,
  0 issues. Plan fingerprint:
  `4ffcb88ef47c9bdaf3d3dc7d36092fa55e7dec0d4a01417aac97c53d90d8718b`.
  Mapped runtime enrichment is preserved. #295/#849 are unchanged; no history,
  learner assignment, runtime ID, or run-ledger mutation is planned.
- Validation: 8 focused files / 93 tests, typecheck, lint, base and release
  dataset validation passed. No DB writes, migration execution, or import APPLY.
  The APKG analysis files remain untouched and excluded.
- Full plan and preservation audit:
  `vocabflow-dataset/reports/canary-development-final-apply-plan.md`.

## 2026-10-04 — Due-first study queue without a New-mode hard gate

- Removed the backend gate in `apps/api/src/review-queue.ts` that suppressed
  NEW items once at least 20 items were due. Available NEW items now accompany
  DUE items up to the remaining `daily_new_word_limit`; DUE remains first in
  mixed ordering. Daily Goal columns are not read for queue admission.
- Study Setup already derives mode availability from the scoped queue, so the
  API fix enables New beside due reviews without changing the UI or default
  mode. Review remains DUE-only; New remains NEW-only. Saved-all retains every
  item and its NEW/DUE/VOLUNTARY classification, ordered DUE → NEW → VOLUNTARY.
- Updated US-08/US-14, product, architecture and flow documentation. Regression
  tests cover due/new availability, hard quota, mode filters, mixed priority,
  Saved VOLUNTARY and existing Study/Continue Learning/Daily Goal behavior.
- Validation passed: 9 focused test files / 131 tests, `pnpm typecheck`,
  `pnpm build`, ESLint on changed TypeScript feature files, and
  `git diff --check`. No migration, database mutation, or deployment occurred.
  Dataset V2 changes remain separate and unstaged.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4C migration 0018 preflight

- Used the clean local worktree at `c15dff2`; the primary local `TXH` checkout
  remained at `d9012af` with its two unrelated APKG analysis files untouched.
- The protected Neon development target and post-connect identity matched the
  configured project, branch, database, and `vocabflow_migration` role. Ledger,
  schema, and aggregate learner count were read in one `REPEATABLE READ, READ
  ONLY` transaction. No personal learner fields were selected.
- Development already has all 19 migrations through `0018_panoramic_spirit`.
  Every ledger digest matches canonical source SQL; the 0018 ledger row is the
  accepted CRLF serialization of the same source. Its current-worktree Drizzle
  hash is `eec77c49abbad9a2ea0a69fead9409e0b817978fd3ff3df95b09a55575b114ed`.
- Both daily goal columns and their defaults, NOT NULL properties, and 1–100
  checks match the application schema. The migration is additive and does not
  touch Master V2 runtime tables. The aggregate learner profile count was 8.
- Pre-apply decision: `0018` is already applied, with no pending migrations or
  schema/ledger drift. Do not apply it again. Accordingly, the exact-pending
  preflight gate and `PHASE_2E4C_READY` are NO. Database writes, migration
  execution, and import APPLY by this phase were none. Canary 2.1.0 validated
  offline with zero errors or warnings. Details and test results are in
  `vocabflow-dataset/reports/canary-development-migration-0018-preflight.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4B migration hash audit

- Confirmed Drizzle ORM 0.45.2 hashes each complete migration file as UTF-8
  text from the checked-out working tree. It preserves line endings, a terminal
  newline, and a UTF-8 BOM. Git SQL blobs did not change from `7e76daa` to
  `b5b22e3`.
- The 2E.3 six mismatches and 2E.4A seventeen mismatches were caused by
  worktree CRLF conversion. All 18 ledger hashes match one exact Drizzle hash
  representation of the same source (LF for 17, CRLF for 0004); no historical
  SQL-content mismatch remains. The verifier now checks LF, CRLF, and bare-CR
  serializations while preserving every other content byte.
- Re-ran the verified development scan in REPEATABLE READ / READ ONLY mode:
  18/18 migration rows present, 0015–0017 verified, catalog discovery and
  runtime snapshot ready. The comparable Phase 2E.3 fingerprint is unchanged
  at `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`;
  the 2E.4A full-snapshot planner hash uses a different snapshot shape.
- The current `TXH` head also contains migration 0018 from a later daily-goals
  commit; the development ledger remains at 18 rows. This audit used the
  isolated `b5b22e3` 18-migration baseline and did not execute 0018. A new scan
  against the current TXH chain must stop before catalog discovery until that
  migration is handled through the trusted process.
- Canary release content and release hash remain unchanged. App Import files
  from 2E.4A remain unchanged; only analysis-only candidate/proposal/review
  evidence was regenerated.
  Apple #1/#295 remain unresolved, the human-owned reconciliation is untouched,
  and `canApply=false`.
- Added regression coverage for line-ending equivalence, SQL edits, appended
  content, terminal newline, and BOM. Focused migration/scanner checks,
  typecheck, lint, and diff check pass. No migration, DB write, import APPLY,
  runtime mutation, production connection, or Cloudinary operation occurred.
  See `vocabflow-dataset/reports/canary-development-migration-hash-root-cause.md`.

## 2026-10-04 — Master Vocabulary V2 Phase 2E.4A runtime preservation policy

- Implemented `app-import-v3`, `runtime-vocabulary-projection-v2`, and
  `runtime-reconciliation-v3` without changing the dataset schema, Master
  identity/revisions, or 2.1.0 release hash. App Import distinguishes the raw
  `masterProjectionFingerprint` from the planner's effective runtime
  fingerprint.
- Added field ownership and `SET` / `PRESERVE` / explicit `CLEAR` operations.
  Null/absent IPA, image, audio, legacy topic, and level preserve existing
  runtime enrichment on mapped rows. CREATE_NEW starts from the exact Master
  projection. `clearFields` can clear only nullable fields when Master is null
  or absent. Vietnamese override and image quarantine retain their separate
  explicit policies.
- The plan now shows before, raw Master, operation, after, API-visible
  `effectiveProjection`, and deterministic outcomes. The persisted JCS
  fingerprint describes that effective result; `contentVersion` increments
  once only if that result changes. Added explicit preservation, clear,
  override/quarantine, create, version and replay regressions.
- Regenerated only the derived App Import projections and generated
  reconciliation-template metadata for immutable canary release 2.1.0. Its
  source `dataset.json`, pinned Master records, schema version and release hash
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591` remain
  unchanged.
- Read-only planner previews used development target
  shy-hill-72364426 / br-square-grass-b3af0nte / neondb; snapshot fingerprint
  `fa8941ef8a458b58b6c2b548a50a1db5618221d4115d4d6f6ef914c2931c5d5d`.
  Temporary apple #1 and #295 scenarios both preserve their existing runtime
  enrichment and remain alternatives, not owner decisions. The checked-in
  human reconciliation still returns `canApply=false` and all eight Sense
  decisions remain unresolved.
- A fresh migration read-only check found 18/18 ledger entries but 17 local
  migration hash mismatches, including 0015–0017; it stopped before catalog
  discovery. The planner's code path does not read this ledger when computing
  `canApply`, which does not classify the drift as safe. The prior Phase 2E.3
  field-loss audit remains intact.
- Focused planner, transform and release-builder suites pass: 3 files / 50
  tests. `pnpm typecheck`, `pnpm lint`, and `git diff --check` pass. Local Node
  22.19.0 emits the repository's Node 22.23.2 engine warning. No database
  write, APPLY, migration, owner choice, APKG access or media operation
  occurred. See the preservation preview, policy comparison, and migration
  drift scan in `vocabflow-dataset/reports/`.
## 2026-10-04 — Feature #10 configurable daily learning goals

- Replaced the active single aggregate goal with learner-specific persisted
  targets: 10 new words and 20 review words by default. The existing scheduler
  hard cap remains unchanged; due reviews remain uncapped.
- Activity Summary derives distinct new/review counts from persisted review
  events by household-local review date; overall completion requires both
  targets. Home shows category progress, composite ring and the existing
  persisted streak. Settings API/UI save and reload per learner.
- Added additive migration `0018_panoramic_spirit.sql`; it has not been applied.
  No database mutation or production connection was made.
- Focused validation passed: 11 files / 153 tests. Contracts/API/web project
  typecheck, production build, feature ESLint and `git diff --check` passed.
- Repository-wide `pnpm typecheck` is blocked by 9 missing projection fields
  in the separately changing Dataset V2 planner. That file and Dataset V2
  reports remain untouched and unstaged; commit/push were withheld because the
  full validation gate did not pass.
- Migration remains unapplied; no database mutation, production access or
  deployment occurred.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.3 final owner reconciliation preparation

- Re-ran the development reconciliation scanner through provider/target
  verification and a REPEATABLE READ / READ ONLY snapshot. Target remains
  shy-hill-72364426 / br-square-grass-b3af0nte / neondb; fingerprint
  464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b matches
  Phase 2E.2. The approved 2.1.0 release identity and scope are unchanged.
- Apple #1 and #295 remain the same fruit Sense with separate history and
  memberships; the overlapping learner count is 1. Apple choice remains
  unresolved. Added an owner decision sheet and a field-by-field projection
  loss audit, including nulling existing IPA/media/legacy-topic fields under
  UPDATE_TO_MASTER.
- Added a contract-shaped, analysis-only owner-ready file with current release
  metadata, snapshot fingerprint and runtime candidate IDs. All decisions stay
  unresolved and the planner rejects it at the ownership gate. The root
  human-owned reconciliation remains unchanged and is still for 2.0.0.
- A temporary planner simulation accepted the seven non-Apple proposals and
  left Apple unresolved: no non-Apple structural issues were found. The current
  planner returns canApply=false until the owner completes reconciliation.
- Reconfirmed 18/18 migration rows, exact 0015–0017 hashes, and six historical
  hash mismatches. The planner does not enforce historical ledger hash
  equality; this remains a separate integrity concern, not a safety finding.
- Focused Dataset V2 suites pass 91/91; typecheck and repository ESLint pass.
  Local Node 22.19.0 emits the repository's Node 22.23.2 engine warning.
  No database mutation, import APPLY, migration, history merge, ID allocation,
  Cloudinary operation, APKG use, or API/UI change occurred.
- Evidence: vocabflow-dataset/reports/canary-development-final-reconciliation-readiness.md,
  canary-development-final-owner-decision-sheet.md, and
  canary-development-projection-loss-audit.md.

## 2026-10-03 — Master Vocabulary V2 Phase 2E.2 owner reconciliation review

- Re-verified the approved 2.1.0 release against the development Neon target and
  refreshed the snapshot in REPEATABLE READ / READ ONLY transactions. The
  targeted apple audit found both rows reachable through current catalog/topic
  flows, distinct Learning Set memberships, and one learner with progress on
  both IDs (`DUPLICATE_LEARNER_HISTORY`). No learner identifiers were selected.
- Added the analysis-only owner proposal and detailed review report. Apple
  options A/B/C remain unranked; the other seven Sense proposals and
  Technology Starter CREATE_NEW proposal remain `ownerDecision=UNRESOLVED`.
  The human-owned reconciliation file and all runtime/API data remain
  unchanged.
- Reconfirmed six historical migration hash mismatches with all 18 rows present
  and 0015–0017 matching. The planner does not check this ledger when computing
  `canApply`; the drift remains a separate unresolved integrity concern, not
  classified as harmless.
- No database mutation, import APPLY, migration, history merge, mapping change,
  ID allocation, Cloudinary operation, or Study UI/API change occurred. Focused
  scanner/proposal/planner tests: 26 passing. Master validator, TypeScript,
  repository ESLint, and `git diff --check` pass; validator reports 0 errors,
  0 warnings, and one informational DRAFT issue.

## 2026-10-03 — Continue Learning Home card (US-47)

- Audit: the previous Home card previewed `reviewQueue.queue[0]` and linked to
  unscoped Study Setup. Study queue/index/mode are in-memory React state only;
  there is no runtime persisted incomplete session or exact-resume endpoint.
- Added one authenticated, read-only learner summary API. It selects a
  partially learned active assigned Learning Set, eligible Topic, or Saved
  scope using that scope's own enabled vocabulary and learner statuses. Topic
  membership now intersects enabled Topic words with active-set vocabulary,
  matching Study Setup's actual scope. Latest `review_events.reviewed_at` ranks
  candidates heuristically; source collection is not persisted. Deterministic
  Set → Topic → Saved/sort-order/ID ordering breaks ties and missing timestamps.
- Home changes are isolated to the existing Continue card and its styling. Its
  CTA preserves Topic/Set/all-saved scope in Study Setup; no mode or exact
  session is fabricated. When there is no candidate or the summary fails, the
  card keeps the queue fallback and has a local retry. Home requests no
  vocabulary catalog for this block.
- Focused regressions pass: 9 files / 92 tests. `pnpm typecheck`, `pnpm build`,
  ESLint on changed Home/API/contracts TypeScript, and `git diff --check` pass.
  Build has existing dynamic-import and bundle-size warnings; local Node is
  22.19.0 versus pin 22.23.2.
- Dataset V2 and other unrelated changes in the shared workspace were left
  untouched and will remain unstaged. No database mutation, merge, or
  deployment.

### 2026-10-03 — Continue Learning Topic-domain correction

- Confirmed Study Setup obtains the learner's default review queue (active
  Learning Set membership), then intersects queue vocabulary IDs with Topic
  membership. The former Continue Learning query only checked that a Topic had
  one active-set word, then counted every enabled Topic word (for example,
  3/23 instead of 3/5).
- Topic candidate members now use enabled Topic vocabulary ∩ enabled active-set
  vocabulary. Learner status is aggregated only over that intersection, so
  outside-set progress cannot create or distort a Topic candidate.
- Latest review events are pre-aggregated once per learner vocabulary and then
  joined to collection members; the existing learner/vocabulary/reviewed-at
  index is used, with no migration. This time is still only a heuristic because
  events do not store collection provenance. Home now says “Hoạt động gần
  nhất”; exact session/source resume remains unsupported.
- Focused Home, Topic/progress, Learning Set, Study Setup/queue and Continue API
  tests pass: 9 files / 95 tests. `pnpm typecheck`, `pnpm build`, feature
  ESLint, and `git diff --check` pass. No DB mutation or deployment.
- Dataset V2 changes in the shared working tree were preserved and not staged.

## 2026-10-03 — Saved Vocabulary all-saved study scope (US-46)

- Root cause: the Saved Words CTA entered the ordinary saved queue, which
  correctly returned only NEW and genuinely DUE records. Saved LEARNING or
  MASTERED records with future review dates were therefore excluded, leaving
  Study Setup empty for a saved collection containing only those states.
- Added an explicit `saved=1&content=all` Study Setup intent backed by a
  learner-authorized saved collection query. All enabled saved words are
  candidates; NEW and DUE keep their real classifications and not-due existing
  progress is VOLUNTARY practice. Normal New/Review/Mixed semantics and the
  canonical revision-checked review scheduler remain intact. Study and Summary
  Continue preserve the all-saved intent, and selection is capped/deduplicated.
- Focused Saved Words, Study Setup, queue API, review API, study queue, Study
  Session, and Summary tests pass: 6 files / 97 tests. `pnpm typecheck`,
  `pnpm build`, feature ESLint, and `git diff --check` pass. Build reports the
  repository's existing dynamic-import and bundle-size warnings; local Node is
  22.19.0 versus the 22.23.2 pin.
- No learner database was queried or mutated. Commit/push results will be
  recorded after completion.

## 2026-10-03 — Master Vocabulary V2 canary editorial correction

- Created Sense revision 2 for apple — fruit, record — noun/music recording,
  and reservation — booking. Stable Sense and corrected child IDs are retained;
  revision 1 files remain unchanged. The DRAFT manifest pins the new JCS hashes,
  and the App Import preview, review package, approval template, release plan,
  and reconciliation candidates were regenerated offline.
- The five other canary Senses were verified unchanged. All owner decisions are
  still `PENDING`; the human-owned runtime reconciliation file is unchanged.
- Master validator: 0 errors, 0 warnings, 1 informational DRAFT issue;
  validator tests pass 30/30. Transform tests pass 23/23 in isolation;
  canary preparation/release-builder tests pass 2/2. Eleven Phase 2D.1 bridge
  tests pass with the known stale migration-index assertion skipped. TypeScript
  and ESLint pass. The broader focused run reported 63 passing tests, one stale
  migration-index assertion (expects 0016 while this branch now includes 0017),
  and a transform timeout under concurrent load; the isolated transform rerun
  passed. No runtime, database, Neon, migration, media, reconciliation
  decision, or Study UI change was made.

## 2026-10-02 — Saved Vocabulary (US-46)

- Owner explicitly started Feature #8. Audit found no prior persistence, API,
  or favorite state; learner ownership is the existing progress boundary.
- Implemented a new learner-to-vocabulary relation, additive migration 0017,
  authenticated list/save/unsave endpoints, a server-enforced saved queue
  scope, Saved Words route, and bookmark controls on Catalog and Detail.
- Search/level/topic state is URL-backed. The saved queue applies membership
  in SQL before existing New/Due limits; Review writes and progress semantics
  remain unchanged. No browser storage or Dataset V2 content is used.
- Focused Saved Words, API, queue, Catalog, Detail, Study Setup, Summary and
  application-schema tests pass (9 files / 104 tests). `pnpm typecheck`,
  feature ESLint, `pnpm build`, and `git diff --check` pass. Local Node is
  22.19.0 while the repo pins 22.23.2; build completes with existing dynamic-
  import and bundle-size warnings.
- Migration validation is offline. No live database operation, Dataset V2
  change, or production deployment was performed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2A validator

- Added `scripts/validate-master-vocabulary-v2.ts` and
  `pnpm validate:master-vocab-v2`. The validator uses the manifest as the only
  release boundary, validates pinned documents with Draft 2020-12 schemas, then
  checks typed references, scoped uniqueness, taxonomy graphs, learning sets,
  media, Relations, Provenance, JCS record hashes, and the release hash.
- Added synthetic approved graph fixtures generated in temp directories,
  Phase 1 schema fixture assertions, machine report output, and the stable issue
  catalog at `docs/architecture/master-vocabulary-v2-validation-contract.md`.
  The checked-in `dataset.json` remains an empty DRAFT; no real vocabulary,
  media bytes, or pilot data were added.
- Focused validator tests: 21 passing at the last run; targeted script typecheck
  and final checks are in progress. Full application tests were not run. Runtime/UI, database,
  Neon, importer, and Cloudinary paths were not changed.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 1 schema package

- Patched the V2 data dictionary, identity/versioning policy, and taxonomy
  contract. Dataset releases now pin exact Lexeme, Sense, Classification,
  Learning Set, taxonomy, relation, media-version, and Provenance artifacts;
  `releaseHash` uses the `sha256-canonical-json-v1` contract. Pronunciation
  ownership is XOR, classification values are dimension-typed, and semantic
  child state advances its owning Lexeme/Sense revision as specified.
- Added the Draft 2020-12 schema package under `vocabflow-dataset/` and
  synthetic valid/invalid schema fixtures. The initial `dataset.json` is an
  empty `DRAFT` manifest; no vocabulary pilot or runtime/database/media change
  was made. Cross-file graph, identity, revision-history, and byte checks were
  documented for Phase 2A. All 8 schemas pass Draft 2020-12 meta-
  schema checks and all 18 fixture expectations match under `jsonschema`.
- No matching active user story covers this architecture/schema-only work;
  unrelated US-43 remains untouched. Application tests and database/media
  operations were not run.

## 2026-10-02 — Vocabulary Detail (US-43)

- Owner explicitly reprioritized the read-only Vocabulary Detail page while
  US-42 remains open. Added `/vocabulary/:vocabularyId` on the shared AppShell,
  using the existing active-learner vocabulary endpoint, image/audio fields,
  pronunciation hook and `/study` route. List rows now link to detail.
- Missing Vietnamese definition/example translations, POS, synonyms/antonyms,
  per-word review counts, last-studied date, mastery percentage, and save state
  are not present in the current model; the page uses neutral empty states and
  disables unsupported save behavior.
- Focused route/detail tests pass (27 tests). Full lint, typecheck, test suite
  (65 files / 753 tests), build and `git diff --check` pass. Build used local
  Node 22.19.0 while the project pins 22.23.2; the package manager emitted its
  engine warning. Owner review remains pending. No backend/database command,
  commit, push, or deployment work.

## 2026-10-01 — Production Release #8 artifact scan policy

- Split PostgreSQL URI counts by artifact boundary. Client/static URIs remain a
  hard failure; Vercel function URI-shaped examples are counted for diagnostics
  only; matches outside public/function roots fail closed.
- Added exact-value scans for the project's known secret environment variables
  across every artifact file. Secret assignments, provider/token patterns,
  local environment files, public source maps and out-of-root database URIs
  remain blocking. Diagnostics contain counts only.
- The production deploy step provides its release DB/provider secret values to
  the verifier, and the Vercel CLI subprocess receives a sanitized environment.
  Focused tests (54), lint, typecheck, full tests (64 files / 748 tests), build,
  and `git diff --check` pass. The static client artifact scan reports zero
  value matches. One slow source-control diagnostic test's timeout was raised
  after it timed out under full-suite load but passed by itself.
- No DB/migration command, deployment, commit or push was performed. Local Node
  is 22.19.0 against the repository's 22.23.2 pin.

## 2026-10-01 — Production Release #7 Vercel API boundary fix

- Moved the Vercel entrypoint tests and their TypeScript project from root
  `/api` to `tests/api`; root TypeScript references still typecheck the tests.
  Root `/api` now contains only `handler.ts`, `package.json` and its production
  `tsconfig.json`.
- Added a recursive production-build guard rejecting `.test` and `.spec`
  TypeScript entrypoints under `/api`. Credential and source-map scanners were
  not relaxed.
- Focused boundary/API tests pass (20); `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (64 files / 734 tests), `pnpm build`, and `git diff --check`
  pass. The static client artifact scan reports `value_hits=0`.
  `vercel build --prod` was skipped because the local Node is 22.19.0 (required
  22.23.2) and the release wrapper requires a clean source tree; the requested
  changes remain uncommitted. No production DB operation, deployment, commit
  or push occurred.

## 2026-10-01 — Protected Production Release automation (US-42)

- Added `.github/workflows/production-release.yml`, triggered only after Core
  CI completes successfully for a same-repository `main` push. It checks out
  `workflow_run.head_sha`, verifies the checkout, runs read-only production DB
  preflight and migration plan, applies guarded forward-only migrations, then
  repeats read-only DB verification and requires zero pending migrations
  before calling `pnpm deploy:production` for the same SHA. Steps are
  sequential and serialized; migration/verification failure prevents deployment.
- Added the `ci-production-release` execution context and production
  authorization bound to the GitHub event payload's Core CI name, conclusion,
  push event, main branch, repository and exact SHA. Generic database URL and
  mutation paths reject this context; `ci-test` remains test-only.
- Production secrets are step-scoped. Workflow also generates ignored
  `.vercel/project.json` ephemerally for the existing safe Vercel project guard.
  Trusted DB Integration was not changed; bootstrap, catalog import and US-41
  curation are outside this workflow.
- Local validation and owner review are pending. GitHub Environment
  `production` still needs required reviewers, a `main` branch rule, and the
  listed secrets/variables. No production DB connection/mutation, deploy,
  commit or push was performed.

## 2026-10-01 — Vietnamese catalog metadata audit

- Added forward migration `0014_vietnamese_catalog_metadata` for catalog
  display strings: five compatibility sets, eleven US-41 sets, 17 topics and
  four achievement descriptions. Statements update only names/descriptions by
  stable slug or achievement code; IDs, slugs, source classifications,
  ordering, enabled/grade values, relationships and learning history remain
  untouched.
- Updated the US-41 curation source and manifest metadata to keep future
  curation applications from restoring English set labels. Owner-selected
  vocabulary, topics, grades and set memberships are unchanged. API and
  learning behavior are unchanged.
- Updated API, web and browser-test fixtures to use Vietnamese catalog display
  metadata while retaining English vocabulary and raw source-topic examples.
- Validation: focused catalog/migration/API/web tests pass (10 files / 72
  tests); `drizzle-kit check` passes; final `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (62 files / 683 tests), focused learning-set E2E (3/3),
  `pnpm build` and `git diff --check` pass. The production-build test that
  exceeded its 5-second limit once during concurrent checks passes by itself;
  the full suite also passes without competing checks. Updated the focused E2E
  auth mock and stale Vietnamese accessible-name locator. Local Node is
  22.19.0 versus the pinned 22.23.2.
  No database connection or migration execution, deployment, commit or push
  has been performed.

## 2026-09-30 — Shared authenticated application shell

- Replaced the Home-owned sidebar with one nested shared app shell for the
  authenticated Home, Study, Vocabulary, Topics, Learning Sets, Progress,
  Learners and learner Settings routes. Desktop keeps a sticky 248px sidebar;
  tablet uses the compact horizontal nav; mobile uses a 44px menu button and
  48px navigation targets. Login/Register and the existing foundation route
  remain outside this shell.
- Home retains its own greeting, active-learner switcher and approved dashboard
  content. The existing Home → `/learners` return intent and direct Learners
  behavior are unchanged. The pre-existing Continue Learning CSS refinement is
  preserved.
- Added App routing tests for shared-shell persistence, active parent paths,
  direct Learners, mobile navigation, auth isolation and no return loop.
- `pnpm lint`, `pnpm typecheck`, focused routing/Home tests (32), full tests
  (61 files / 677 tests), `pnpm build`, and `git diff --check` pass. Local Node
  is 22.19.0 versus the pinned 22.23.2. No backend/database/auth/scheduler
  changes, deployment, commit or push were performed.
- No active user story covered this explicitly requested layout refactor; no
  new feature story or product/architecture decision was introduced.

## 2026-09-28 — Guarded production vocabulary catalog import

- Added explicit production target parsing for `vocab:import-catalog` while
  preserving the existing no-argument / `--apply` development and test CLI.
  Production uses `authorizeProductionRelease` and
  `resolveProductionConnection({ purpose: "runtime" })`, selecting only
  `PRODUCTION_DATABASE_URL` and requiring Neon project/branch proof.
- Production dry-run checks the canonical protected identity and catalog plan
  inside a PostgreSQL `READ ONLY` transaction. Apply requires `--apply`, exact
  production and branch confirmations, repeats release authorization, and
  validates identity inside the write transaction before catalog operations.
  Existing import safety rules are unchanged; no owner/migration credential,
  extra grant, or execution-context guard bypass was added.
- Focused tests pass (29 tests); full `pnpm test` passes (59 files / 623
  tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
  pass. Local Node is 22.19.0 versus pinned 22.23.2. No real DB connection,
  mutation, deploy, push, or commit was performed. `.env.example`,
  `docs/decisions.md`, and existing unrelated workspace edits remain
  untouched.

## 2026-09-28 — Least-privilege production preflight

- Split `db:production-preflight` into two provider-verified read-only
  connections. `vocabflow_runtime` now independently validates connectivity
  and canonical protected identity; `vocabflow_migration` independently
  validates the same identity and reads `drizzle.__drizzle_migrations`.
- Both use read-only transactions. The bootstrap grants, protected metadata
  model, runtime-to-migration membership rules, and Vercel/database settings
  are unchanged. Added a mock regression test that fails with the reported
  schema-permission error if runtime accesses the Drizzle ledger.
- Focused tests pass (31 tests); full `pnpm test` passes (58 files / 615
  tests); `pnpm lint`, `pnpm typecheck`, `pnpm build`, and `git diff --check`
  pass. Local Node is 22.19.0 versus pinned 22.23.2. No database connection,
  mutation, deploy, or push was performed. Existing unrelated edits,
  including `docs/decisions.md`, remain untouched and unstaged.

## 2026-09-28 — Guarded fresh-production database bootstrap

- Added `pnpm db:production-bootstrap` as a read-only-by-default, explicit
  production-only path for the confirmed fresh Neon branch. Apply requires
  `--apply`, `--confirm-target production`, and the exact configured branch;
  Neon API project/branch proof and the explicit `neondb_owner` operator URL
  are checked before database work. Catalog checks allow only fresh state or
  a complete bootstrap-only state; partial/unexpected roles, schemas,
  relations, types, identity or app tables stop safely.
- Reused `bootstrapProtectedMetadata` and its existing role/least-privilege
  checks, with parameterized bootstrap-principal membership handling. Added
  distinct operator-only bootstrap and identity-provision URL resolution;
  Vercel runtime lookup remains `DATABASE_URL` only. Production identity is
  provisioned and verified with the canonical identity role immediately after
  bootstrap. The runbook distinguishes this one-time flow from later releases.
- Regression coverage confirms the fresh owner-only bootstrap path does not
  require `vocabflow_identity_bootstrap`, wrong/development targets fail
  closed, the canonical application roles remain unchanged, and the one-shot
  owner is not granted runtime membership. The runbook now labels the legacy
  bootstrap role as development/test-only.
- Focused tests pass (58 tests); `pnpm lint`, `pnpm typecheck`, full `pnpm
  test` (57 files / 613 tests), `pnpm build`, and `git diff --check` pass.
  The workstation uses Node 22.19.0 while the repo pins 22.23.2. No database
  command/connection, database mutation, Vercel deploy or main push was run.

## 2026-09-28 — Vercel ESM directory import fix

- The latest Preview error proved Node reached the ESM Function but rejected
  the handler's `../apps/api/src` directory import. `apps/api/src/index.ts` is
  the existing app entrypoint; no API package export/public alias exists.
- Replaced app and runtime-binding value/type specifiers with explicit `.js`
  paths, matching Vercel's observed emitted `apps/api/src/index.js`. Added a
  native Node ESM test against a transpiled handler fixture and preserved
  actual-app health, auth, nested-path and JSON-404 tests; added explicit
  sign-in dispatch coverage through the existing Better Auth seam.
- Focused module/routing/auth tests pass (28 tests); full suite passes (54
  files / 582 tests), as do lint, typecheck, Vite build and `git diff --check`.
  Local Node is 22.19.0 rather than the pinned 22.23.2. No Vercel CLI/deploy or
  DB access was used.
- Next safe action: commit and push this module-resolution fix to `TXH` only.
  Owner may then create one Preview retry to verify emitted runtime behavior.

## 2026-09-28 — Vercel Preview Function ESM compatibility fix

- Confirmed from the live Preview stack and repository package scopes that the
  `/api/handler` boundary was emitted/executed as CommonJS while loading the
  ESM-scoped `apps/api/src/index.js`. The root package has no `type` marker and
  `api/` had no local `package.json`; `apps/api/` is already ESM.
- Added only an `api/package.json` ESM boundary and a subprocess test that
  starts Node with `tsx`, imports the actual handler under that package scope,
  and calls `/api/health`. Source checks reject `require()` in the handler.
- Existing tests continue to cover Better Auth route dispatch, nested path
  restoration, API JSON 404, and the Vercel SPA rewrite exclusion. Business
  logic, DB/auth behavior, environment markers, production guards and routing
  configuration are unchanged.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` (54 files / 579 tests),
  `pnpm build`, and `git diff --check` pass. The local runtime is Node 22.19.0
  versus the pinned 22.23.2. No Vercel CLI/deploy or DB connection was used.
- Next safe action: commit/push this fix to `TXH` only, then owner may create
  exactly one Preview deployment and verify `/api/health` plus auth smoke.

## 2026-09-27 — Vercel Preview API route integration fix

- The live Preview returned Vercel `NOT_FOUND` for nested Better Auth requests.
  Source inspection confirmed the Hono `POST /api/auth/*` mount and other API
  routes already existed, but the Vite deployment had no explicit Vercel route
  from nested `/api/*` paths to a statically named Function.
- Replaced the implicit catch-all filename with `api/handler.ts` and an explicit
  Vercel route/path transform that dispatches `/api` and `/api/*` to the same
  Hono app while restoring the original URL path. The SPA rewrite still excludes
  API paths. Better Auth logic, auth configuration, DB schema/data and release
  source guard are unchanged.
- Focused routing/auth/artifact tests pass. Full local validation and exactly
  one Preview deployment are pending.

## 2026-09-27 — V1.0 hosting pivot: Cloudflare to Vercel

- Replaced the V1.0 deployment layer with a root Vercel project: Vite static
  output plus a thin Hono Web `fetch` Function at `/api/*`; the existing Hono
  routes/business logic remain the single implementation. Added exact-origin
  Preview auth using the current `VERCEL_URL`, with development-only markers
  and no wildcard Vercel trust.
- Kept production DB identity/preflight, migration and US-41 guards, reset
  block, shared-CI isolation, forward-only SQL policy, release SHA/toolchain
  gates and artifact secret/source-map scanning. Removed the Worker/Wrangler
  deployment implementation; BATCH 0 Cloudflare docs remain explicitly
  historical.
- Updated the current architecture, V1.0 release runbook, decision log and
  handoff/changelog for Vercel. Vercel project IDs and production origin remain
  owner inputs; Preview auth/API smoke stays restricted until a separate
  owner-approved non-production database is provisioned.
- No Vercel link/pull/build/deploy, Cloudflare deploy, production Neon
  connection, migration or curation apply was executed. Existing local edits in
  `.env.example` and the prior DEC-018 link correction are preserved and are
  not part of this pivot commit.
- Local verification: frozen-lockfile install, 10 focused files / 106 tests,
  full suite 54 files / 544 tests, lint, typecheck, Vite build, 26 Playwright
  E2E tests, and `git diff --check` pass. Artifact checks found no secret
  values, DB/provider credentials, local env files or source maps; one
  `BETTER_AUTH_SECRET` key-name string is from Better Auth's browser package,
  not a configured value.
- The guarded `build:production` was not executed: this workstation is Node
  22.19.0 rather than pinned 22.23.2 and the worktree contains preserved
  pre-existing edits. Remote verification for implementation SHA
  `5fd0515c4d3ae2cd4cc0a15ec407aca13d2f04ad`: Core CI run `36300948885`
  PASS; Trusted DB run `36300948861` PASS on trusted `shared-ci`. Vercel
  project/org IDs and canonical production origin remain owner inputs.

## 2026-09-27 — Historical Cloudflare production release preparation (superseded)

- Added a guarded production migration dry-run/apply path with an explicit
  canonical target, exact target/branch confirmations, provider proof, a
  read-only migration plan, and forward-only/destructive-SQL checks. Production
  curation now has explicit read-only and confirmed apply paths using separate
  production runtime credentials. `db:reset` and reset-capable Trusted DB
  tooling refuse production markers.
- Production Better Auth requires matching production markers and an
  owner-supplied canonical HTTPS origin; secure cookies and a single trusted
  origin are enforced. The Worker build artifact receives production markers,
  SPA and `/api/*` routing, an owner-supplied custom route, and
  `workers.dev=false` only after the guarded production build finalizes it.
- Added pinned Wrangler CLI, clean-source/toolchain/SHA gates, local environment
  file exclusion, a client/artifact secret scan and digest check, safe CLI error
  codes, production preflight/build/deploy commands, and the
  [v1.0.0 release runbook](releases/v1.0.0-release-runbook.md).
- Repository config defines production Neon target branch
  `br-rough-silence-b3gbqjcb`; no Neon API or database connection was used to
  verify it during this task. Production hostname/zone remain
  `OWNER_INPUT_REQUIRED`. Worker production secrets and operator migration/
  runtime credentials must be provisioned separately; no credential values
  are documented.
- Local verification: full suite 52 files / 527 tests, lint, typecheck,
  manifest-only curation dry-run (213 selected rows, no DB access), build
  (dev-vars removed; client secret-value scan and source-map scan pass),
  Playwright E2E (26), Wrangler 4.129.0 dry-run (no upload), and final diff
  check. Local Node is 22.19.0; the guarded production build intentionally
  requires 22.23.2 and a completely clean release checkout.
- Production migration/apply, curation apply, Worker/web deploy, account/user
  creation, and `v1.0.0` tagging were not performed. Core CI and Trusted DB
  must be green on the exact pushed SHA before any production preflight or
  mutation.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  is part of this task or its commit.

## 2026-09-25 — US-41 explicit development-target safety path

- Added an explicit `--target development` read-only DB snapshot/planning path.
  It verifies the canonical configured Neon identity, checks selected source
  identities, words and Vietnamese meanings, and runs the DB plan in a
  PostgreSQL `READ ONLY` transaction. It prints non-secret target metadata and
  reports zero DB mutations.
- Local development apply now requires `--target development --apply`,
  `--confirm-target development`, and `--confirm-branch` equal to the
  configured development branch. Production remains blocked; Trusted DB keeps
  its existing `ci-test`/`test` → `shared-ci` path. Generic bypass flags do not
  exist.
- Local validation passes: focused safety tests (38), full suite (494), lint,
  typecheck, build, 26 Playwright E2E tests and `git diff --check`.
- No development dry run, development apply or production DB operation was run.
  The owner commands remain separate manual actions after the required remote
  gates; this implementation does not invoke them.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  is part of this implementation.

## 2026-09-24 — US-41 final content remediation

- Kept all 213 curated imported rows. Added eight source-bound image
  quarantines and five exact owner-approved Vietnamese meaning overrides to
  the tracked curation manifest; no raw source dataset values or unrelated
  meanings were changed, and no LLM/API classification or translation was used.
- Added durable `image_quarantined` and `vietnamese_override` columns. Runtime
  vocabulary, topic, set, queue and review-answer reads use canonical meanings
  and hide quarantined images. Catalog re-import refreshes raw source columns
  without clearing owner metadata. Migration: `0012_us41_owner_content_overrides`.
- Final local dataset dry run PASS: 213 selected (100/73/40 by grade), 202
  media PASS, 3 missing-image WARN, 8 quarantined-image WARN, 0 BLOCK and 11
  effective image-ineligible rows. Duplicate identities/words, expected-word
  mismatches and missing meanings are all 0. `DATABASE_MUTATIONS=0` and
  `REAL_NEON_APPLY=NOT_RUN`.
- Regenerated ignored owner-review CSVs, summary and original-image contact
  sheet. The review has 15 findings, zero activation blockers, eight
  `SAFE_WITH_LIMITATION` quarantines with `IMAGE_TO_WORD=NO`, and six corrected
  meanings assessed OK; cousin and love remain unchanged.
- Local validation PASS: 17 focused files / 175 tests; full suite 47 files /
  476 tests; lint, typecheck, build, 26 E2E and `git diff --check`. Core CI
  run #93 (`35964700073`) and Trusted DB Integration run #88, attempt 3
  (`35964700003`), passed on implementation SHA
  `0cc10dd9ded1564a860d605b196939a25dce1d1d`.
- Trusted DB used only the configured CI test target. Earlier attempt 1 stopped
  at the runtime protected-identity check; attempt 2 passed US-41, then hit the
  existing US-07 same-review-ID replay-race assertion. Attempt 3 passed the
  full suite. No real Neon apply was run.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes; neither
  belongs in the remediation commit.

## 2026-09-23 — US-41 owner-refined final curation

- Applied only the owner's explicit 11 source-record replacements and seven
  no-replacement deferrals to the tracked allow-list. V1 now contains 213 rows:
  Grade 1 = 100, Grade 2 = 73, Grade 3 = 40. Grade 2 Feelings has 13 rows;
  nothing was added to pad it back to 20.
- Narrowed image availability policy: a missing image is a visible WARN and
  does not block activation. Usable audio, required word/meaning, source
  identity and the existing known-unusable/corrupt media block remain intact.
  `IMAGE_TO_WORD` still requires a usable image; exercise fallback, scheduling,
  progress and rewards are unchanged.
- Local real-dataset dry run PASS: 1,994 source rows; 213 curated; media 210
  PASS / 3 WARN / 0 BLOCK (`anger`, `sadness`, `joy`); 30 starter-topic
  mappings; `DB_MUTATIONS=0`. Real Neon apply was not run.
- Focused curation, importer and exercise-generator tests PASS (34 tests).
  Full local validation PASS: lint, typecheck, 457 unit/component tests, build,
  and 26 E2E tests. Commit `760c0c04d7498a3b6e27b15ee47e4cee0c305aed` was
  pushed to `TXH` and fast-forwarded to `main`; Core CI run `35840195766` and
  Trusted DB Integration run `35840195673` both PASS on that exact SHA.
- Owner review CSV and summary are regenerated under ignored
  `local-data/generated/`; manifest and story record `love`'s source meaning
  and romantic English definition without rewriting it, and note that
  `despair` → `fear` is a set-level replacement, not a synonym claim.
- Follow-up Trusted DB runs `35841107601` and `35842150875` failed at US-41
  apply with PostgreSQL `XX000: cache lookup failed for type 590564`. The
  trusted test reset drops/recreates application enums; `scripts/db-core.ts`
  now disables prepared statements to prevent stale enum OIDs, with a focused
  regression test. Core CI `35843693211` and Trusted DB `35843693265` both PASS
  on fix commit `2ef6166dcc9c3475773f2385626001f2d897cc43`.
- Preserve pre-existing `.env.example` and `docs/decisions.md` changes. Do not
  stage or commit either file; `docs/decisions.md` remains untouched.
- `REAL_NEON_APPLY=NOT_RUN`; Trusted DB used only the configured CI test target.

## 2026-09-22 — US-41 content curation and activation

- Audited the 1,994 imported source records and generated media report:
  1,979 image references, 1,993 audio references, 15 missing images, 1
  missing audio and no invalid media records.
- Added tracked `VOCABULARY_CURATION_V1` manifest with 220 explicitly reviewed
  rows: 100 Grade 1, 80 Grade 2 and 40 Grade 3, in 11 ordered learning sets.
  Every row records source identity, expected word, canonical topics, set
  membership and activation decision.
- Added deterministic dry-run-first curation tooling. It maps all 30 starter
  rows to canonical topics, leaves unreviewed imported rows disabled, and has a
  trusted-CI-only transactional `--apply` path that preserves starter
  identity, learner assignments, progress, reviews, XP and achievements.
- Local dry run PASS: `MANIFEST_RECORDS=220`, `LEARNING_SET_COUNT=11`,
  `STARTER_TOPIC_MAPPINGS=30`, `MEDIA_GATE=PASS checked=220`,
  `DB_MUTATIONS=0`.
- Current phase/batch: Phase 2 / US-41 implemented and ready for owner check;
  US-42 has not started. Core CI #87 and Trusted DB Integration #81 both passed
  on commit `4d76cfa946ccae94ec3e5deb690f0365ba579363`; only owner review of
  the manifest and dry-run report remains.

## 2026-09-21 — US-39 + US-40 XP, level and achievements

- Audit found no reward persistence, catalog or UI. Canonical review idempotency, household authorization, household-local daily activity, streak derivation and session-local reinforcement were reused.
- Added immutable `xp_events`, idempotently seeded achievements and immutable learner unlock records. Scheduled review and daily-goal rewards are safely coupled to the canonical review write; no XP backfill occurs.
- Exercise correct-bonus remains deferred because the current client-generated exercise flow has no trusted server-side exercise context. `.env.example`, `docs/decisions.md` and local data remain untouched.

## 2026-09-21 — US-39/US-40 fix-forward

- Trusted DB fixture teardown now explicitly removes learner-owned `learner_achievements` and `xp_events` before deleting learner profiles; the reference achievement catalog remains intact.
- The optional review exercise submission is server-verified against canonical vocabulary data. Correct scheduled exercises earn one `EXERCISE_CORRECT` ledger event worth 5 XP; mismatched client recall results are rejected, reinforcement remains reward-free, and raw typed input remains transient.

## 2026-09-21 — US-37 + US-38 weekly/daily and topic progress

- Audit classified US-37 historical aggregation/weekly UI and US-38 learner topic aggregation/UI as missing; canonical review history, household-local dates, sparse progress, topics, active learning-set eligibility and authorization were reusable.
- Added read-only range and topic APIs plus the Progress dashboard sections. `newLearned` is derived from immutable review-event `previous_status = NEW`, so reset-created lifecycles are represented without a schema change or fabricated backfill.
- Topic scope is current enabled vocabulary reachable through active assigned enabled sets. Imported mappings remain 1,994 and the 30 starter rows remain unmapped; no topic was guessed. `docs/decisions.md`, `.env.example` and local datasets remain untouched.

- Project: VocabFlow Family MVP
- Current phase/batch: Family MVP US-01..US-25 complete; Phase 2 / US-26 through US-41 implemented and ready for owner check
- Current Git branch: `TXH`
- Current implementation baseline: commit `d5791c7` (`feat: add image and typing exercises`) on `TXH`, with protected local changes preserved
- US-24: `ACCEPTED / CLOSED`.
- US-25: `ACCEPTED / CLOSED` after recovery Core CI and Trusted DB passed.
- US-26 + US-27: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-28 + US-29: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-30: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-31 + US-32: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-33 + US-34: `IMPLEMENTED / READY FOR OWNER CHECK`.
- US-22: `IMPLEMENTED / AUTOMATED PASS — MANUAL OWNER CHECK DEFERRED`.
- Catalog state after real import: 30 starter rows + 1,994 imported rows =
  2,024 total vocabulary rows. The owner-refined US-41 manifest selects 213
  imported rows; the remaining imported rows stay disabled.
- Imported catalog identity is `(source_dataset, source_record_id)` and is
  separate from canonical DB ID. Grade is NULL for unreviewed rows and explicit
  only where the tracked curation manifest assigns it.
- Real US-25 evidence: migration/import PASS; starter, learner_progress, and
  review_events modifications were 0; post-import idempotency dry run was
  INSERT_COUNT=0, UPDATE_COUNT=0, SKIP_COUNT=1994, DATABASE_MUTATIONS=0,
  STATUS=PASS.
- Core CI on the implementation baseline: `FAIL`, run `35250926587`, at Unit
  and component tests because a starter-enrichment test required gitignored
  `local-data/`.
- Trusted DB on the implementation baseline: `PASS`, run `35250926632`.
- Recovery fix in commit `60b384d`: deterministic tracked test fixtures replace
  the CI test's dependency on local generated/source data. Core CI run
  `35434440380` and Trusted DB run `35434440386` both passed.
- Protected: never modify, stage, restore, reset, clean, or commit
  `docs/decisions.md`. Preserve `.env.example` and `local-data.zip` changes.
- Final US-30 evidence: local validation passed; Core CI run `35443781349` and
  Trusted DB run `35443781278` both passed. US-39/40 fix-forward baseline is
  `b057f70897859004de9659b1780c9f098915ac0c`; US-41 candidate
  `4d76cfa946ccae94ec3e5deb690f0365ba579363` passed same-commit Core CI #87
  and Trusted DB #81 and is awaiting owner review. US-22's manual owner check
  remains deferred.
- Documents new agents must read first: `docs/README.md`,
  `docs/product/product-spec.md`, `docs/architecture/technical-architecture.md`,
  `docs/design/design-system.md`, `docs/design/feature-ui-spec.md`,
  `docs/flow/user-flow.md`, `docs/roadmap.md`, the relevant story, and this file.

## 2026-09-19 — US-28 + US-29 implementation checkpoint

- Gap audit found no learning-set schema, normalized learner assignment,
  assignment UI or set-aware queue eligibility. Existing vocabulary IDs,
  household ownership and sparse progress primitives were retained.
- Added five deterministic curated sets, ordered memberships and the
  backward-compatible `starter-vocabulary` set containing all 30 enabled
  starter rows. Imported rows remain disabled and are not inferred into sets.
- Added household-authorized assignment APIs/UI. Existing learners receive the
  default assignment in migration and new learners receive it in the canonical
  learner-create path.
- Queue eligibility is now `enabled vocabulary ∩ union(active assigned sets)`;
  `EXISTS` keeps repeated membership deduplicated. Unassign preserves progress
  and review events; reassignment reuses progress.
- Focused tests, full tests, lint, typecheck, build, E2E, diff checks and the
  post-push Trusted DB gate pass. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-20 — US-33 + US-34 exercise implementation checkpoint

- Gap audit found the existing DTO media fields, Flashcard media safety,
  canonical review API and queue admission reusable; image interaction,
  typing interaction, strict answer normalization and exercise media fallback
  were missing.
- Added `IMAGE_TO_WORD` and `TYPE_WORD` to the same controlled exercise layer.
  Image mode requires a usable image plus four safe word choices and uses a
  neutral alt label. Typing uses deterministic Vietnamese-first cues, NFKC /
  trim / case-insensitive exact comparison and preserves meaningful spaces.
- Broken image or optional cue media uses one-way fallback without a review
  mutation. Canonical review, retry, reinforcement, summary, queue eligibility,
  daily New limits and learner isolation remain unchanged. No schema change;
  `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — US-26 + US-27 implementation checkpoint

- Gap audit found no existing canonical level model/filter or topic catalog,
  normalized mapping, API or browse UI.
- Added nullable `vocabulary_level` with six explicit values. The source
  dataset has no grade metadata, so all 2,024 catalog rows remain NULL and no
  inference or bulk assignment was performed.
- Added 17 source-backed canonical topics and normalized
  `vocabulary_topics` mappings. The migration maps 1,994 imported rows by
  exact source topic; 30 starter rows remain unmapped because their source
  topic is NULL. Imported rows remain disabled.
- Added optional level filters, topic APIs, topic browse UI, migration/schema
  assertions, focused API/UI tests and E2E coverage. Scheduler, progress and
  review-event paths were not changed semantically.
- Implementation commit: `d612e1a`.
- Local status: IMPLEMENTED / READY FOR OWNER CHECK. Final lint, typecheck,
  full tests, build, E2E, diff and Trusted DB gates are still being run.
- `docs/decisions.md`, `.env.example` and `local-data.zip` remain protected.

## 2026-09-19 — Repository recovery checkpoint

- Confirmed documentation drift: canonical story index stopped at US-11 and
  current handoff/roadmap statements incorrectly said US-12 had not started.
- Confirmed Core CI root cause from GitHub run `35250926587`: the test
  `starter vocabulary enrichment safety > loads the real source...` failed
  with `ENRICHMENT_SOURCE_UNREADABLE` because `local-data/` is gitignored.
- The fix keeps real-data loading available to the manual enrichment tool and
  makes automated tests deterministic with in-repository fixtures.

## 2026-09-16 — starter enrichment tooling checkpoint

- Added a dry-run and guarded transactional apply tool for the owner-approved
  starter enrichment subset `1, 2, 7, 8, 9, 11, 18, 19`.
- The tool validates exact DB/source identity and explicit media-map
  resolution, preserves enabled state and learner history, and fails safe on
  unexpected database content or partial updates.
- The real database apply command was not run; US-12 remains unstarted and
  `docs/decisions.md` remains protected.

## 2026-09-16 — US-11 implementation checkpoint

- Confirmed the accepted reusable Flashcard remains answer-free before flip and
  now explicitly covers the post-flip IPA, meaning, optional content and
  image-accessibility contract.
- Study continues to render Remembered/Forgotten only after flip and retains
  the accepted US-09 review, reinforcement and summary flow.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-11
  is ready for owner check and US-12 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-16 — US-10 implementation checkpoint

- Extracted the Study presentation and media behavior into the reusable
  `Flashcard` component at `apps/web/src/features/study/flashcard.tsx`.
- The component keeps answer-bearing content out of the pre-flip DOM while
  preserving the accepted click/Space flip, media fallback and Study review
  controls.
- No backend, schema, migration or real database behavior changed. Trusted DB
  is not required for this UI-only refinement.
- Focused and repository-wide local validation is recorded at closeout; US-10
  is ready for owner check and US-11 has not started.
- `docs/decisions.md` remains protected and untouched.

## 2026-09-15 — US-08 authorization harness expectation fix-forward

### Diagnosis and fix

- The failed candidate `9dad72447457b08327de2606e218d34c37af1912` remains
  `FAILED / RETIRED` after Trusted DB run `34950169177` failed in
  `us08-authorization-cases`.
- Diagnosis confirmed a harness-only expectation defect: the authorization
  test treated `allowed.queue.length !== 1` as an empty queue even though the
  migrated database contains 30 enabled global vocabulary rows and the
  production NEW selection is ordered by ID and capped at 10.
- `scripts/test-review-queue-db.ts` now independently derives the eligible
  global NEW prefix from migration-role state, compares the runtime response
  without sorting or normalizing the actual list, and logs expected/actual
  counts and vocabulary IDs. Positive and negative learner authorization
  evidence remains intact.

### Scope and gate status

- Product semantics, schema, migrations, workflow/orchestration and US-07
  behavior are unchanged. The old `42601` fixture INSERT fix is preserved.
- Local validation is complete and passing. No new immutable candidate was
  created, no external Trusted DB was rerun, and the failed candidate was not
  amended or reused. The next gate is narrow authorization-harness technical
  review.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-08
  remains `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md`
  remains protected local work.

## 2026-09-15 — US-08 queue-semantics harness fix-forward

### Diagnosis and fix

- Trusted DB run `34954397186` for immutable candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` passed target-SHA validation,
  authorization cases and the prior `42601` fixture path, then failed in
  `us08-queue-semantics` with `US08_DB_QUEUE_COUNTS`.
- Diagnosis confirmed a second harness-only expectation defect: the migrated
  database and earlier authorization fixtures leave enabled global vocabulary
  rows visible to the learner's NEW query. The queue-semantics fixture now
  inserts strict-future progress for pre-existing enabled rows, before adding
  its scenario-specific vocabulary, so only the intended sparse NEW rows are
  eligible.
- The diagnostic now reports expected/actual review date, DUE and NEW IDs,
  counts and complete queue IDs. Production code, schema, migrations,
  workflow/orchestration and US-07 behavior are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `191bda880b43d22a9ca050a66507a400cc32fcdd` remains `FAILED / RETIRED` and
  is not amended or reused. No external Trusted DB run or new candidate was
  created.
- Local validation is required before the narrow queue-semantics harness
  technical review. US-07 remains `IN PROGRESS / BLOCKED` with its known CAS
  P1 open; US-08 remains `IN PROGRESS / BLOCKED`; US-09 has not started.
- `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 consolidated cap/suppression harness fix-forward

### Diagnosis and fix

- Trusted DB run `34960083041` proved candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` through authorization and the
  queue-semantics isolation stage, then failed at
  `us08-caps-and-suppression` / `US08_DB_DUE_19_COUNTS`.
- Source diagnosis confirmed a systematic harness isolation defect: fresh cap
  learners saw globally enabled baseline and prior-fixture vocabulary as NEW,
  while the cap expectations assumed scenario-only vocabulary. The fix now
  captures enabled vocabulary before each cap fixture, gives only that fresh
  learner strict-future progress, and derives explicit 19/20/21 contracts.
- Cap diagnostics now report expected/actual counts, DUE/NEW IDs, queue IDs,
  review date and suppression state. Product semantics, schema, migrations,
  workflow/orchestration, US-07 and prior live-proven fixes are unchanged.

### Checkpoint

- The fix is implemented locally and remains uncommitted. Candidate
  `21db8578c6bb15fe9fb6639fd692d7942340498d` remains `FAILED / RETIRED` and
  will not be amended or reused. No external Trusted DB run or candidate #5
  was created.
- US-07 remains `IN PROGRESS / BLOCKED` with its CAS P1 open; US-08 remains
  `IN PROGRESS / BLOCKED`; US-09 has not started. `docs/decisions.md` remains
  protected local work.

## 2026-09-15 — US-08 Trusted DB harness fix-forward checkpoint

### Diagnosis and fix

- Trusted DB run `34941415887` reached the exact retired candidate
  `54a029f333dcee7abfa825e9991d8d61797e87e4` and failed with PostgreSQL
  SQLSTATE `42601` during `us08-authorization-cases` / `us08-fixture-auth-a`.
- The root cause was confirmed as a harness-only `vocabularies` fixture INSERT
  arity defect in `scripts/test-review-queue-db.ts`: five target columns were
  supplied with four expressions. The fixture now omits `content_version` from
  the target list so the canonical schema default `1` applies.
- The shared helper covers all US-08 fixture callers. No product behavior,
  schema, migration, workflow, US-07 code or US-07 CAS finding changed.

### Validation and gate status

- Focused US-08/harness/reset/preflight validation: `41/41` tests PASS across
  five files; full local tests: `251/251` PASS; E2E: `11/11` PASS.
- Lint, typecheck, build, Drizzle check, YAML parsing, workflow/preflight
  checks and `git diff --check` PASS. No reliable local PostgreSQL arity
  regression was added; real Trusted DB remains authoritative for SQL shape.
- The failed SHA remains `FAILED / RETIRED`. No new immutable candidate was
  created; future Core CI and scoped Trusted DB rerun remain pending after
  narrow technical review. US-08 remains `IN PROGRESS / BLOCKED`.
- US-07 remains `IN PROGRESS / BLOCKED` with its known CAS P1 open; US-09 has
  not started. `docs/decisions.md` remains protected local work.

## 2026-09-15 — US-08 owner-override implementation checkpoint

### Discovery and gate override

- The owner explicitly authorized parallel US-08 work while US-07 remains
  `IN PROGRESS / BLOCKED` on the known PostgreSQL CAS P1. This does not mark
  US-07 accepted, close the CAS finding or authorize US-07 Trusted DB work.
- US-08 is the canonical `Review Queue` story for Architecture Step 8. No
  hard implementation blocker was found. Existing authentication, learner
  ownership, vocabulary DTOs and sparse progress are contract-stable
  dependencies; persisted review-flow acceptance remains acceptance-blocked
  by the unresolved US-07 database evidence.

### Implemented scope

- Added the strict review-queue response contract and a read-only
  `GET /api/learners/:learnerId/review-queue` service/route.
- Implemented household authorization, household-local server date, due-first
  ordering, due/new caps, sparse virtual `NEW`, deterministic ordering and
  safe error responses. No browser-to-Neon access, study-session UI,
  schema/migration/reset change or duplicate scheduler/persistence logic was
  added.
- Added focused API/service coverage and the active story at
  `docs/stories/US-08-review-queue.md`.

### Gate status

- US-08 remains `IN PROGRESS`; implementation evidence and local validation
  are pending completion before technical review.
- US-07 remains `IN PROGRESS / BLOCKED`; its diagnostic worktree and
  `docs/decisions.md` remain protected. No US-07 Trusted DB or Core CI run was
  performed.

## 2026-09-15 — US-08 acceptance evidence hardening checkpoint

### Evidence delta

- Implemented the five test-quality areas identified by technical review:
  queue-specific cross-household/disabled/missing authorization, explicit
  future progress exclusion, a UTC/local timezone boundary, ordering with
  19/20/21 due-cap fixtures, and queue-specific unsafe BIGINT revision
  handling. A narrow follow-up review found the due progress insertion order
  needed to be noncanonical as well; that P2-4 fix is now implemented and
  pending technical re-review.
- Added `scripts/test-review-queue-db.ts`, an independent real-PostgreSQL
  suite covering authorization, enabled vocabulary, due predicate and
  ordering, sparse NEW selection, MASTERED rows, caps/suppression, timezone,
  BIGINT revisions, read-only state and cleanup/reset behavior.
- Added an explicit `TRUSTED_DB_SUITE` selector. `full` remains the default
  and preserves the canonical US-07 Trusted DB path; `us08-review-queue` is
  an explicit scoped path and is never selected implicitly.
- Added only the corresponding manual workflow choice and environment
  forwarding. No product semantics, schema, migration, reset policy or
  US-07 diagnostic/CAS code was changed.

### Gate status

- Local evidence validation is being rerun after the hardening delta. Trusted
  DB has not run, so all PostgreSQL-dependent US-08 criteria remain pending.
- Core CI has not run. US-07 remains `IN PROGRESS / BLOCKED` with its known
  CAS P1 open; US-08 remains `IN PROGRESS`; US-09 has not started.
- No commit, push, exact-SHA creation, US-07 modification or owner acceptance
  was performed. `docs/decisions.md` remains protected.

## 2026-09-14 — US-07 implementation checkpoint

### Implemented scope

- Added the approved strict review request/response contracts, additive
  `learning_status`/`review_result` enums, `learner_progress` and
  `review_events` schema, migration `0004_scheduled_review_write`, reset
  ordering and `POST /api/reviews` service/route.
- Added server-authoritative authorization, vocabulary availability checks,
  sparse NEW revision `0 → 1`, deterministic fingerprints, replay/conflict
  handling, CAS writes, race reclassification, household-local dates and
  atomic progress/event persistence.
- Added focused review and schema/reset tests: `20/20` PASS; full repository
  tests are `231/231` PASS, E2E is `11/11` PASS, and lint, typecheck and build
  are PASS. US-07 remains `IN PROGRESS`; technical review, Core CI, Trusted DB
  and owner acceptance are pending.

### Scope guard

- No Review Queue, Study UI, reinforcement, US-08 work, seed change or
  CI/workflow change was added. `docs/decisions.md` remains an unrelated
  protected unstaged local modification.

## 2026-09-14 — US-07 fix-forward 1 checkpoint

### P1 findings resolved

- P1-H: review-event idempotency is now scoped to the server-authorized
  household, including pre-write lookup and post-race reclassification.
- P1-J: validated request UUIDs are canonicalized before fingerprinting,
  persistence comparison and response construction.
- P1-T: scheduler numeric persistence uses BIGINT with explicit safe-integer
  checks, safe database conversion and deterministic revision exhaustion
  handling; the US-06 scheduler remains unchanged.
- Focused US-07 service/API and schema/reset tests are now `27/27` PASS,
  including foreign-ID, UUID and numeric-boundary regressions.

### Gate status

- US-07 remains `IN PROGRESS`.
- Technical re-review is pending. Core CI and Trusted DB Integration remain
  pending; Trusted DB is required for final acceptance.
- No commit, push, Core CI run, Trusted DB run or US-08 work was performed.
- `docs/decisions.md` remains protected unrelated local work.

## 2026-09-14 — US-07 fix-forward 2 checkpoint

### Alignment scope

- Aligned the US-07 story's persistence and concurrency contract with the
  reviewed household-scoped `(household_id, review_id)` idempotency key.
- Documented BIGINT scheduler/revision storage, JavaScript safe-integer bounds,
  checked conversion and deterministic revision exhaustion behavior.
- Updated UUID regression fixtures to contain alphabetic hexadecimal characters,
  making uppercase/lowercase canonicalization coverage non-vacuous.
- Focused tests remain `27/27` PASS; full tests are `238/238` PASS; E2E is
  `11/11` PASS; lint, typecheck, build, Markdown links/anchors and
  `git diff --check` are PASS.

### Gate status

- US-07 remains `IN PROGRESS`; technical re-review is pending.
- Core CI and Trusted DB Integration remain pending; Trusted DB is required for
  final acceptance.
- No implementation redesign, commit, push, Core CI run, Trusted DB run or
  US-08 work was performed. `docs/decisions.md` remains protected local work.

## 2026-09-14 — US-07 contract owner approval

### Approved contract

- Owner approved the canonical response DTO, first materialized revision `1`,
  missing/disabled vocabulary `404 VOCABULARY_NOT_FOUND` behavior (or the
  established equivalent), authorization-before-replay and enabled-learner
  behavior.
- Fingerprint semantics, sparse virtual `NEW`, concurrent first-review
  handling, server-owned dates, immutable events and atomic progress/event
  persistence remain locked as documented in the story.
- US-07 was promoted to `READY FOR IMPLEMENTATION`; final acceptance requires
  Core CI and Trusted DB Integration. US-08 remains `NOT STARTED`.

### Scope guard

- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains
  an unrelated protected unstaged local modification.

## 2026-09-14 — US-07 story discovery / contract preparation

### Recommendation

- The correct next story is `US-07 — Scheduled Review Write`, aligned to
  Architecture Step 6 (`POST /api/reviews`). It is smaller and safer than
  combining review persistence with Review Queue or Study-session UX.
- Proposed success boundary: `scheduled-review-write-ready`, from the
  accepted `scheduler-domain-ready` boundary plus authenticated parent,
  authorized learner and approved sparse-progress architecture.
- Review Queue remains the later Architecture Step 8 milestone; reinforcement,
  session UX and progress presentation remain separate scope.

### Contract discovery

- The architecture fixes the strict request fields, server-owned scheduler
  computation, sparse virtual `NEW`, `reviewId` fingerprint semantics,
  `expectedRevision`, concurrent first-review race barrier, household-local
  review date, immutable event snapshot and atomic progress/event write.
- US-07 requires an additive application migration for `learning_status`,
  `review_result`, `learner_progress` and `review_events`, plus reset/index/
  privilege verification. Trusted DB Integration is therefore required for
  implementation acceptance.
- No application code, API route, schema, migration, dependency, CI/workflow,
  Neon operation, commit or push was performed. `docs/decisions.md` remains an
  unrelated protected unstaged local modification.

### Owner decisions required

- The exact successful response DTO is not specified by the repository; it
  must be approved before shared response contracts or `response_payload` are
  implemented.
- The first materialized revision is not explicitly specified. Recommended
  smallest choice: virtual `0` is consumed and first persisted/resulting
  revision is `1`.
- Confirm `404 NOT_FOUND` for missing/disabled vocabulary; no other critical
  source conflict was found.

US-06 remains `ACCEPTED / CLOSED`. US-07 implementation is now `IN PROGRESS`;
US-08 work has not started.

## 2026-09-13 — US-06 acceptance finalized

### Accepted evidence

- Owner approved US-06 final acceptance after the post-merge audit confirmed
  the exact reviewed implementation revision, no scope drift and no technical
  blocker.
- T06-01 through T06-17 are `PASS`; the success boundary
  `scheduler-domain-ready` is achieved.
- Focused learning-domain tests `51/51` PASS; full tests `218/218` PASS; E2E
  `11/11` PASS; lint, typecheck, build and `git diff --check` PASS.
- Technical re-review PASS. Core CI #32 PASS on reviewed commit
  `cc649d2dca4b233752e08f9c565ad384ea2f6816`; Core CI #33 PASS on merged main
  commit `b838f107a69830234202caded33f9b7ad0040c9e`.
- Trusted DB Integration #30 PASS is extra evidence only and was not required
  for this pure-domain story.

### Process and handoff

- PR #3 was merged before explicit Owner Acceptance. The audit verified the
  exact reviewed revision, green CI and no scope drift. Classification:
  `PROCESS-ORDER DEVIATION ONLY`; no revert was required.
- No API, persistence, review queue, session reinforcement, UI, schema,
  migration, dependency, CI/workflow or US-07 work was added by acceptance.
- US-07 has not started. `docs/decisions.md` remains an unrelated local
  modification and is excluded from acceptance work.

## 2026-09-11 — US-06 story discovery / contract preparation

### Completed

- Read the repository instructions, canonical Product/Architecture/Flow/UI
  sources, accepted US-01 through US-05 stories, progress/changelog records,
  current contracts/tests and the existing `packages/learning-domain` stub.
- Registered `US-06 — Learning Scheduler Domain` in BATCH 4 with status
  `READY FOR CONTRACT REVIEW`.
- Proposed the accepted upstream `first-flashcard-ready` handoff and the
  `scheduler-domain-ready` output boundary.
- Defined the pure scheduler input/output contract, virtual sparse `NEW`, all
  six scheduled transitions, 1/3/7/14/30 intervals, explicit local dates,
  no overdue bonus, typed invalid-input handling and persistence-owned
  revision/`reviewedAt` boundaries.

### Scope and handoff

- US-06 is pure learning-domain work only. `POST /api/reviews`,
  `learner_progress`, `review_events`, revision/idempotency, review queue,
  session reinforcement, UI, schema/migration, API and Trusted DB work remain
  out of scope.
- No application code, learning-domain implementation, schema, migration,
  API, dependency, CI/workflow or Neon operation was performed. No commit or
  push was performed.
- No source conflict was found; the remaining gate is owner review of the
  proposed contract. `docs/decisions.md` remains untouched and unstaged.
- US-07 has not started.

## 2026-09-11 — US-06 contract owner approval

### Approved contract

- Owner approved `US-06 — Learning Scheduler Domain` as a pure-domain story
  and promoted it from `READY FOR CONTRACT REVIEW` to `READY FOR
  IMPLEMENTATION`.
- Virtual `NEW` is an explicit canonical state object; `null` is not a valid
  scheduler state. The approved function receives `currentState`,
  `REMEMBERED`/`FORGOTTEN`, and explicit household-local `today`.
- The approved output is `scheduler-domain-ready`; it contains only canonical
  learning-domain values. Revision, `reviewedAt`, IDs, persistence and
  authorization remain outside the scheduler.
- Owner confirmed deterministic Gregorian calendar arithmetic, no overdue
  bonus, full transition/threshold coverage, typed validation and no UI/E2E
  requirement for this story.

### Handoff

- No learning-domain code, API, schema, migration, dependency, CI/workflow or
  Neon operation was performed. No commit or push was performed.
- The next permitted implementation scope is only the pure scheduler package
  and its exhaustive unit tests. `docs/decisions.md` remains untouched and
  unstaged.
- US-07 has not started.

## 2026-09-12 — US-06 implementation

### Completed

- Implemented `scheduleReview` in `packages/learning-domain` with explicit
  scheduler types, virtual `NEW`, state invariants, typed validation and
  synchronous deterministic transitions.
- Implemented Gregorian calendar validation/addition without system clock,
  timezone, UTC-instant, browser, storage or framework dependencies.
- Added 28 focused table-driven tests covering all transition classes,
  thresholds, date boundaries, overdue behavior, invalid input and
  non-mutation/determinism.
- Updated US-06 evidence: T06-01 through T06-16 PASS and T06-17 PASS locally;
  Core CI remains pending technical review.

### Validation and handoff

- `pnpm test` PASS (195/195), `pnpm lint` PASS, `pnpm typecheck` PASS,
  `pnpm build` PASS, `pnpm test:e2e` PASS (11/11), and `git diff --check` PASS.
- Trusted DB Integration is `NOT REQUIRED`; no API, DB/schema/migration,
  dependency, CI/workflow, UI or persistence change was made.
- US-06 remains `IN PROGRESS`; no acceptance finalization or US-07 work was
  started. `docs/decisions.md` remains untouched and unstaged.

## 2026-09-13 — US-06 fix-forward

### Completed

- Corrected the reviewed safe-integer overflow defect in scheduler counter
  increments. `totalCorrect`, `totalIncorrect` and incremented
  `consecutiveCorrect` now fail deterministically before an unsafe output can
  be returned.
- Added focused validation and transition coverage for overflow, fractional,
  NaN, Infinity and out-of-range numeric values; leap-year century rules;
  interval rollovers; large safe mastered counts; and full remembered outputs.
- Focused learning-domain tests now PASS at `51/51`; US-06 remains
  `IN PROGRESS` and no approved scheduler semantics changed.

### Validation and handoff

- No API, database/schema/migration, dependency, CI/workflow, UI, persistence
  or US-07 work was added. Trusted DB remains `NOT REQUIRED`.
- Technical re-review and Core CI remain pending. `docs/decisions.md` remains
  an unrelated unstaged local modification and was not changed.

## 2026-09-11 — US-05 implementation started

### Completed

- Moved US-05 to `IN PROGRESS` and implemented the owner-approved minimal
  learner-context → focused `/study` → first real vocabulary card flow.
- Reused the accepted `GET /api/vocabulary` contract with deterministic
  `vocabulary[0]` selection, keyboard/touch flipping and safe loading, empty,
  error, auth/403 and optional-field states.
- Added focused learner-context, Study UI/client and routing tests. No schema,
  migration, seed, write API, progress, scheduler, CI/workflow or US-06 work
  was added.

### Handoff

- Trusted DB remains inherited from accepted US-04 evidence; no new Trusted DB
  gate is proposed for this web-only story.
- `docs/decisions.md` remains an unrelated unstaged local change and is not
  part of the implementation scope.

### Validation checkpoint

- Focused US-05 tests PASS; full local test suite PASS at 167 tests.
- Lint, typecheck, build and `pnpm test:e2e` PASS (11/11) after the corrected
  Space-key interaction was revalidated.

## 2026-09-11 — US-05 pre-Core-CI manual acceptance checkpoint

### Owner evidence

- Manual owner acceptance PASS for resolved learner handoff through `Bắt đầu
  học`, real PostgreSQL-backed `/study`, first `apple` card from
  `vocabulary[0]`, front/back meaning visibility, pointer/touch and Space flip,
  Space scroll prevention, NULL optional fields, media safety, no fake review
  controls, safe `/api/vocabulary` error/retry, reload redirection and no
  active-learner persistence/guessing.
- Mobile owner verification at `375x812` for learner handoff and Study PASS with
  no horizontal overflow.
- T05-09 and T05-13 are now manual PASS; T05-10 and T05-11 remain accepted by
  automated coverage without fabricated database/content mutations. T05-12 is
  manual PASS.

### Gate and handoff

- T05-01 through T05-17 were locally PASS, subject to final Core CI evidence
  at this checkpoint; final acceptance is recorded below.
- US-05 was still `IN PROGRESS` at this pre-Core-CI checkpoint and was not
  accepted until Core CI passed.
- Trusted DB Integration is `NOT REQUIRED` for this web-only story. No schema,
  migration, seed, privilege, learning write, review write or database side
  effect was added.
- `docs/decisions.md` remains unrelated, unstaged, uncommitted and excluded.
- US-06 remains unstarted.

## 2026-09-11 — US-05 final acceptance

### Accepted evidence

- US-05 First Real Flashcard is `ACCEPTED`; T05-01 through T05-17 are `PASS`.
- Owner manual acceptance PASS for the learner handoff, `/study`, real
  `vocabulary[0]` `apple` card, front/back and flip interactions, NULL/media
  safety, no fake review controls, reload learner recovery, mobile 375x812,
  no horizontal overflow, safe API error and Retry recovery.
- Local evidence: `167/167` tests, E2E `11/11`, lint, typecheck, build and
  `git diff --check` PASS; no review/progress/scheduler/DB writes.
- Core CI #30 SUCCESS on main commit
  `712d8bb42fbb46704e7c4da6e1a1fd791f61e331`.
- Trusted DB Integration #28 SUCCESS is incidental and is not a required
  US-05 gate. No schema, migration, seed, privilege or DB behavior changed.

### Handoff

- The local Node warning remains `22.19.0` versus pinned `22.23.2`; Core CI
  validated the pinned toolchain.
- `docs/decisions.md` remains preserved in its stash and was not changed by
  this acceptance commit.
- US-06 has not started.

## 2026-09-11 — US-04 contract preparation

### Completed

- Registered US-04 as `Vocabulary Content Seed & Read Foundation` with status
  `READY FOR CONTRACT REVIEW` before owner dataset approval.
- Locked Option A only: shared/global vocabulary schema, owner-approved 20–30
  word seed, validated controlled content migration and authenticated
  deterministic `GET /api/vocabulary`.
- Explicitly kept Learner Home, first flashcard rendering, study, scheduler,
  progress, review queue, review writes and US-05 out of scope.

### Blocker and handoff

- `DATASET_SOURCE=OWNER_APPROVAL_REQUIRED`; no vocabulary words or provenance
  were invented.
- No application code, migration, seed data, dependency, CI or Neon operation
  was performed.
- Next safe action: owner contract review and dataset-source approval. Do not
  move US-04 to `READY FOR IMPLEMENTATION` before that decision.

## 2026-09-11 — US-04 dataset source approved

### Completed

- Owner approved `VocabFlow Starter Vocabulary v1` with
  `DATASET_PROVENANCE=PROJECT_AUTHORED` and `DATASET_STATUS=APPROVED`.
- Locked the exact 30-record enabled set with stable IDs `1` through `30`,
  `contentVersion=1`, and `NULL` optional fields for v1.
- The only allowed claim is “beginner starter vocabulary selected for the
  VocabFlow MVP”; no official CEFR, Oxford, Cambridge, Wiktionary-derived or
  copied dictionary claim is permitted.
- Moved US-04 to `READY FOR IMPLEMENTATION`; no application code, migration,
  actual seed data, dependency, CI or Neon operation was performed.

### Handoff

- The next safe action is US-04 implementation from this approved contract.
- US-05 remains unstarted.

## 2026-09-11 — US-04 implementation started

### Completed

- Moved US-04 to `IN PROGRESS` and implemented the approved
  `vocabflow_app.vocabularies` schema with `content_version >= 1`.
- Added the controlled `0003` migration with the exact 30 Starter v1 records,
  the versioned JSON source artifact and pre-mutation dataset validator.
- Added shared `VocabularyDto`/response/seed contracts and
  `GET /api/vocabulary` with session → household membership authorization,
  enabled-only deterministic `id ASC` reads and strict query-scope rejection.
- Added targeted schema/reset, dataset, service and API tests. No UI, learner
  progress, review, scheduler, CI or US-05 work was added.

### Validation and handoff

- Dataset validation PASS; targeted US-04/schema/reset tests PASS; typecheck
  PASS. Full lint, tests, build and E2E remain to be run.
- Trusted DB Integration remains `PENDING ACCEPTANCE GATE`; no live Neon call
  was made.

## 2026-09-11 — US-04 pre-Trusted-DB acceptance checkpoint

### Completed

- Recorded owner manual acceptance PASS for authenticated `GET /api/vocabulary`:
  `200`, exactly 30 records, IDs `1..30`, first word `apple`, last word
  `new`, all `enabled=true`, all `contentVersion=1`.
- Recorded PASS for exact approved dataset content, all optional fields `NULL`,
  unsupported `householdId`/`learnerId` rejection as `400 INVALID_REQUEST`,
  and unauthenticated access as `401 UNAUTHORIZED`.
- Recorded local `DB_MIGRATE=PASS` plus dataset validation, lint, typecheck,
  tests, build, E2E, migration/schema/reset checks and `git diff --check` PASS.

### Gate and handoff

- US-04 remains `IN PROGRESS`; Trusted DB Integration remains
  `PENDING ACCEPTANCE GATE`.
- `403 HOUSEHOLD_ACCESS_DENIED` is automated-test evidence only; it was not
  manually forced by mutating the local database.
- The local Node runtime warning remains `22.19.0` versus pinned `22.23.2`.
- `docs/decisions.md` remains unrelated, unstaged and excluded; US-05 has not
  started.

## 2026-09-11 — US-04 acceptance finalized

### Accepted evidence

- US-04 Vocabulary Content Seed & Read Foundation is `ACCEPTED`.
- T04-01 through T04-16 are PASS with manual, local, migration/reset and
  Trusted DB evidence recorded in the story.
- Core CI #28 and Trusted DB Integration #26 both SUCCESS on main commit
  `1435170ed944c3fb8632fab376817a7bbe63ed55`.
- US-05 remains unstarted; no next story was automatically started.

## 2026-09-11 — US-05 story discovery / contract preparation

### Recommendation

- Recommended title: `US-05 — First Real Flashcard`.
- Recommended scope: the smallest vertical slice from accepted
  `learner-context-ready` plus `vocabulary-content-ready` to one real,
  deterministic, flippable card.
- Recommended Learner Home decision: use only a minimal study-entry handoff;
  defer full due/new/progress metrics until their read contracts exist.
- Recommended output boundary: `first-flashcard-ready`.

### Contract handoff

- Reuse authenticated `GET /api/vocabulary`; select the first item in its
  deterministic `id ASC` order.
- Handle all Starter v1 optional fields as `NULL` without broken placeholders.
- Do not add schema, migration, dependency, API write, progress, scheduler,
  review or Trusted DB work.
- US-05 is `READY FOR CONTRACT REVIEW`; US-06 remains unstarted.

## 2026-09-11 — US-05 contract owner approval

### Approved boundary

- US-05 remains `First Real Flashcard` and is now `READY FOR IMPLEMENTATION`.
- Frozen input: `learner-context-ready` + `vocabulary-content-ready`.
- Frozen route: `/study`; frozen output: `first-flashcard-ready`.
- The minimal “Bắt đầu học” handoff is approved; full Learner Home metrics are
  deferred until progress/review read contracts exist.
- First selection is `vocabulary[0]` from accepted enabled-only `id ASC` API
  order. Space flips the focused card; no audio playback or review controls are
  added.

### Scope guard

- No schema, migration, dependency, API endpoint, database write, Trusted DB
  gate or US-06 work is authorized by this contract update.
- Implementation has not started.

## 2026-09-08 — Documentation and Agent Pack

### Goal

Create canonical Markdown documentation and a VocabFlow-specific AI-agent
operating contract before BATCH 1 implementation.

### Completed

- Audited the repository tree, package/configuration, apps, packages, Drizzle,
  scripts, workflows and current Git state.
- Converted six active canonical DOCX documents to Markdown.
- Added documentation index, source-baseline map, decisions, changelog,
  roadmap, story templates and US-01 contract.
- Added root `AGENTS.md` with VocabFlow scope, architecture, security, testing,
  documentation and Git rules.

### Decisions

- Family MVP remains the active product baseline; Personal MVP is historical.
- BATCH 0 is accepted and frozen.
- US-01 success boundary is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.

### Files changed

- Canonical Markdown files under `docs/product`, `docs/architecture`,
  `docs/design`, `docs/flow` and `docs/implementation`.
- Documentation governance files under `docs/`.
- Story system under `docs/stories/` and `docs/templates/`.
- Root `AGENTS.md`.

### Verification

- Textual parity check: all source paragraphs and table cells found in their
  Markdown counterpart.
- DOCX sources contain no embedded media or diagrams requiring binary export.
- Markdown link/fence validation: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS (10 files, 73 tests).
- `pnpm build`: PASS.
- `git diff --check`: PASS.
- Packaged DOCX renderer could not run because bundled LibreOffice was not
  available in this environment; no DOCX output was authored.

### Remaining / blockers

- No contract blocker remains; no feature implementation has started.

### Next safe action

- Begin US-01 implementation from `T01-01`; keep learner creation out of scope.

## 2026-09-08 — Finalize documentation governance and US-01 contract

### Goal

Resolve the documentation status gate and finalize the owner-approved US-01
registration boundary before feature implementation.

### Completed

- Aligned `docs/README.md`, `docs/stories/README.md` and `AGENTS.md` on the
  shared story status model.
- Set BATCH 1 and US-01 to `READY FOR IMPLEMENTATION`.
- Accepted success boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- Explicitly kept learner creation and new database schema/migration out of
  US-01.
- Corrected architecture conversion metadata to preserve source status
  `APPROVED FOR IMPLEMENTATION`.

### Verification

- Relative Markdown links and anchors: PASS.
- Vietnamese Unicode scan: PASS.
- No stale active DOCX links; remaining DOCX names are source-baseline/history
  references only.
- `git diff --check`: PASS.
- No application code, database code, migrations, CI or BATCH 0 changed.

### Remaining / blockers

- None for the accepted US-01 contract.
- Documentation/agent pack remains uncommitted by instruction.

### Next safe action

- Continue US-01 with T01-04 Better Auth + household bootstrap integration.

## 2026-09-08 — US-01 Phase 1 Register UI

### Completed

- Moved US-01 to `IN PROGRESS` and implemented T01-01/T01-02/T01-03.
- Added the `/register` focused auth screen, accessible email/password
  validation, password visibility toggle, Enter submit and autocomplete.
- Kept T01-04 (real Better Auth signup and authenticated household bootstrap)
  out of scope for this phase.

### Verification

- Component tests cover route rendering, validation, submit seam, keyboard
  submit, password toggle, autocomplete and error semantics.
- `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- No database, migration, bootstrap, role-model, reset or CI changes.

### Next safe action

- Implement T01-04 Better Auth signup followed by idempotent `POST /api/bootstrap`.

## 2026-09-08 — US-01 Phase 1 checkpoint and contract correction

### Proven dependency

- The repository currently has `/api/auth/*` and Better Auth's four auth tables,
  but no `/api/bootstrap`, `households` or `household_members`; the only
  migration is the auth foundation migration.
- BATCH 0 TE-08 intentionally established Better Auth Foundation only and did
  not implement the Family household domain.

### Contract correction

- T01-04 may add the minimal additive BATCH 1 application migration for
  `vocabflow_app.households` and `vocabflow_app.household_members` using the
  approved Architecture contract.
- This does not reopen BATCH 0: role model, `vocabflow_meta`, target identity,
  bootstrap infrastructure, migration executor and reset architecture remain
  frozen.
- Learner profiles/creation and vocabulary, progress and review tables remain
  out of scope for US-01.

### Checkpoint

- Phase 1 (T01-01/T01-02/T01-03) is completed and checkpointed on branch `TXH`.
- Story status remains `IN PROGRESS`; T01-04 has not started.
- Next safe action: implement T01-04 signup plus household
  persistence/bootstrap.
- Do NOT do next: learner profile/learner UI or unrelated BATCH 0 changes.

## 2026-09-08 — Resolve Better Auth name contract blocker

### Proven blocker

- Better Auth 1.7.3 `signUp.email` requires `name`, `email` and `password`.
- The previous Phase 1 form exposed only email and password, so T01-04 could
  not safely call the pinned API without inventing a parent identity.

### Accepted resolution

- US-01 now explicitly collects `Tên phụ huynh`, `Email` and `Mật khẩu`.
- Name is required, trimmed before the Phase-1 seam, and accepts normal
  Vietnamese/Unicode text. It is the parent display/profile identity; learner
  name and learner creation remain out of scope, and household name remains
  server-owned.
- `US01_BLOCKED_BETTER_AUTH_NAME_CONTRACT` is RESOLVED.

### Checkpoint

- US-01 remains `IN PROGRESS`; T01-04 remains pending.
- No Better Auth signup request, `/api/bootstrap`, household migration or
  learner/domain implementation was started.
- BATCH 0 remains frozen.

### Next safe action

- Implement T01-04 Better Auth signup + household persistence/bootstrap.

## 2026-09-08 — US-01 T01-04 registration integration

### Completed

- Implemented the real Better Auth 1.7.3 signup path with the explicit parent
  `name`, `email` and `password` contract.
- Added the authenticated `POST /api/bootstrap` route and a server-owned,
  atomic/idempotent household resolver. Bootstrap ignores client owner input,
  uses the neutral default name `Gia đình VocabFlow`, and creates the canonical
  `OWNER` membership.
- Added only the additive `vocabflow_app.households` and
  `vocabflow_app.household_members` migration; no learner or learning-domain
  tables were introduced. Reset order is dependency-safe and preserves
  `vocabflow_meta`.
- Added signup/bootstrap loading, safe error, authenticated recovery/retry and
  completed states. Signup success alone is never presented as completed Family
  registration.
- Added API, component and migration/reset tests, including the serialized SQL
  and idempotent bootstrap contract.

### Checkpoint

- Story status: `IN PROGRESS`.
- T01-04 status: `IMPLEMENTED / PENDING ACCEPTANCE`.
- BATCH 0 remains `ACCEPTED` / frozen; no live Neon call was made.
- Acceptance review corrected the stale foundation smoke endpoint from
  `/api/auth/session` to Better Auth 1.7.3's supported
  `/api/auth/get-session`; `pnpm test:e2e` now passes locally. The test accepts
  `200 null` for a configured unauthenticated preview and `503` for secretless
  Core CI.
- Added a route-intercepted Playwright test for the native password-field
  Enter key: exactly one Better Auth signup, one bootstrap and completed state.
- Core CI and Trusted DB Integration statuses for the TXH commit are not
  available from this environment because the private repository cannot be
  queried without GitHub credentials and neither workflow runs on a TXH push.
  Do not mark US-01 accepted until those external gates are reviewed.

### Next safe action

- US-01 ACCEPTANCE TEST / REVIEW.

## 2026-09-08 — US-01 Trusted DB reset blocker

### Proven blocker

- Trusted DB reached the second migration after application reset and failed
  with SQLSTATE `42710`: `vocabflow_app.household_role` already existed.
- The reset removed application tables and migration history but left the enum
  type created by migration `0001_curious_miss_america.sql`.

### Fix scope

- Added `vocabflow_app.household_role` to the explicit application reset policy.
- Reset now drops application tables, then the enum type, then Drizzle history;
  clean-state validation fails early with `APPLICATION_ENUM_TYPES_PRESENT` if a
  type remains.
- Protected `vocabflow_meta`, the `drizzle` schema, roles and BATCH 0
  infrastructure remain untouched. Migration SQL was not made idempotent.

### Checkpoint

- US-01 remains `IN PROGRESS / PENDING ACCEPTANCE`.
- Local validation is required before the acceptance-fix commit; no live Neon
  call is made from this environment.

### Next safe action

- PR → Core CI → merge → Trusted DB Integration rerun. Do not start US-02.

## 2026-09-08 — US-01 acceptance finalized

### Accepted evidence

- US-01 Parent Registration is `ACCEPTED`.
- Core CI and Trusted DB Integration both PASS on merged main commit
  `6806e66`.
- Local lint, typecheck, 13-file/101-test suite, build and 2/2 Playwright E2E
  checks PASS; responsive checks at 375/768/1280px PASS.
- BATCH 0 remains `ACCEPTED / FROZEN`; BATCH 1 remains `IN PROGRESS`.

### Handoff

- There is no active next story.
- Next safe action: Project owner selects/reviews the next User Story.
- Do not automatically start US-02.

## 2026-09-19 — US-30 daily new word limit implementation checkpoint

- Gap audit found the existing Due-first queue, household-local date helper,
  sparse virtual New state, reset semantics, retry idempotency and US-29 set
  filtering already satisfied. Learner daily settings, daily consumption and
  parent controls were missing.
- Added `learner_profiles.daily_new_word_limit`, default 10, bounded to 0–100,
  with authorized GET/PATCH settings APIs and a learner-scoped parent UI.
- Queue allowance counts distinct current progress rows whose
  `first_learned_date` equals the household-local date. Due remains exempt and
  session caps remain independent. Atomic review writes serialize per learner
  and reject stale NEW writes after the allowance is consumed.
- Reset still deletes current progress while preserving review events; reset
  therefore makes the current lifecycle virtual New again without consulting
  all-time history.
- Focused validation is passing locally; full local and post-push Trusted DB
  gates remain pending at this checkpoint. `docs/decisions.md`, `.env.example`
  and `local-data.zip` remain protected.

## 2026-09-20 — US-35 + US-36 daily goal and learning streak

- Gap audit found the existing household-local date helper, persisted
  `review_events.review_date`, review idempotency, reset-history preservation and
  learner authorization reusable. Daily goal setting/status, unique activity
  aggregation, active-day derivation and streak UI/API were missing.
- Added `learner_profiles.daily_learning_goal` with default 10 and range 1–100.
  The existing `dailyNewWordLimit` remains an independent New-admission limit.
- Added learner-scoped `GET /api/learners/:learnerId/activity-summary`, deriving
  daily unique vocabulary and current/longest streak from persisted review
  history. Reinforcement, duplicate retry, remembered and forgotten reviews are
  handled by distinct vocabulary/date semantics; failed saves are absent.
- Progress now displays daily goal progress and streaks; parent settings can
  update both learner-scoped settings. Reset and learning-set unassignment do
  not erase historical activity. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-09-19 — US-31 + US-32 exercise implementation checkpoint

- Gap audit found the accepted queue, scheduler, review API, save-before-next,
  retry, reinforcement, summary and pronunciation hook were reusable; exercise
  generation, single-submit feedback, listening eligibility and safe media
  fallback were missing.
- Added a controlled `/study/exercises` route. Meaning and listening exercises
  generate four deterministic safe options from the admitted queue; insufficient
  distractors or broken audio fall back to Flashcard without changing queue
  eligibility or recording a review for media failure.
- Correct/incorrect answers use the existing `POST /api/reviews` path and map
  to `REMEMBERED`/`FORGOTTEN`. No database schema, progress semantics or
  scheduler intervals changed. `docs/decisions.md`, `.env.example` and
  `local-data.zip` remain protected.

## 2026-10-02 — US-44 Study Session focus mode

- Reused `/study` and `/study/exercises`, hid the shared shell navigation in
  focus mode, and aligned the session header, progress, question, feedback and
  controls with the VocabFlow design system.
- Kept answers pending in client state until Next, so Undo clears an unsent
  answer without pretending to roll back persisted progress. Confirmed saves,
  retry identity, topic/set restrictions and session-local reinforcement stay
  on the existing queue/review flow.
- Study feature tests pass (85/85), feature ESLint passes, web-project and root
  typechecks pass, the production build passes, and `git diff --check` passes.
- No API/database command or deployment was run. Concurrent Dataset V2 and
  database workflow changes in the shared working tree are outside this Study
  scope and excluded from its commit.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D runtime bridge

- Added additive integer-ID bridge, import-run ledger, Topic/Set mappings,
  managed-membership ownership, and local transaction write guards. Created
  the human-maintained `runtime-reconciliation-v2.json`; transform output does
  not overwrite it.
- Added a pure deterministic planner, Postgres transaction adapter, dry-run
  CLI/report, target identity checks, explicit baseline/override/quarantine
  policies, stale-plan protection, and production release authorization.
- Offline current-pilot report confirms DRAFT / ineligible, 25 unresolved
  Senses, 18 unresolved Topics, 7 unresolved Learning Sets, and zero planned
  vocabulary creates/deletions/learner assignments. Synthetic approved adapter
  coverage allocates a new runtime integer in-transaction and verifies replay
  leaves the vocabulary and mapping unchanged.
- Additive migration `0015_clean_yellowjacket.sql` is generated and statically
  checked but unapplied. No Neon/shared DB or Cloudinary operation occurred.
  Focused checks completed: validator PASS (0 errors/warnings), 82 Phase 2C/2D
  tests passing, root TypeScript and repository ESLint PASS, and Drizzle reports
  no schema drift. `git diff --check` passes. The full test run also reports
  unrelated US-44 Study UI expectation failures (App shell headings and a
  Flashcard audio pause assertion); the focused dataset/transform/schema suite
  passes independently, and no UI files were changed in this task. Local Node
  is 22.19.0; package engine pins 22.23.2. No DB migration/import or Cloudinary
  mutation occurred.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.1

- Confirmed the Phase 2D membership ledger gap: independent Master/runtime FKs
  did not enforce exact identity pairs. Added three candidate unique keys and
  four composite membership foreign keys in Drizzle schema plus additive
  migration `0016_nostalgic_mattie_franklin.sql`; retained migration 0015.
- Added offline schema/migration mismatch tests, write-guard adoption transition
  tests, and deterministic canary package generation. The focused dataset/schema
  suite passes 100/100 tests; Master validation passes with 0 errors and 0
  warnings; root typecheck and ESLint pass. Drizzle regeneration reports no
  further schema changes, and `git diff --check` passes.
- The full repository run with two Vitest workers passes 909/912 tests. Its
  three failures are the existing US-44 Study shell heading/mobile navigation
  expectations in `apps/web/src/App.test.tsx`; the Study UI file remains
  untouched. Local Node is 22.19.0 while `package.json` requires 22.23.2.
- Generated an owner content review package for 8 Senses / 6 Lexemes and a
  subset release plan with 40 exact Provenance pins and the one-item
  `TECHNOLOGY_STARTER` Learning Set. Optional Topic classifications remain
  outside the subset because they are `IN_REVIEW` and the taxonomy snapshot is
  `DRAFT`; CEFR/difficulty/domain/age/school-level pilot data remain outside
  the release without changing provenance rules.
- Generated a separate reconciliation candidates report. No safe staging
  target exists; candidate search was not run, runtime visibility is unknown,
  and all eight Sense decisions remain `UNRESOLVED`. The canonical manifest
  and `runtime-reconciliation-v2.json` remain unchanged.
- Recommended a dedicated isolated staging/canary target in a later explicitly
  authorized step. No database, branch, learner state, review events, or media
  services were mutated.
- Final Phase 2E gates: `BRIDGE_DB_INVARIANTS_READY = YES`,
  `STAGING_TARGET_READY = NO`, `CANARY_CONTENT_REVIEW_READY = YES`,
  `CANARY_RELEASE_READY = NO`, `RUNTIME_RECONCILIATION_READY = NO`,
  `MIGRATION_APPLY_READY = NO`, and
  `PHASE_2E_STAGING_CANARY_READY = NO`.

## 2026-10-02 — Master Vocabulary Dataset V2 Phase 2D.2

- Added the explicit pending owner approval artifact, including per-Sense
  learner fields, separate Lexeme/Pronunciation review, optional Learning Set
  and item decisions, and release-level sign-off. Added a deterministic
  release builder which verifies the raw source manifest hash and exact pins,
  writes new immutable entity revisions into an isolated `2.1.0` workspace,
  closes Provenance/media-slot references, validates the release, and runs the
  offline RELEASE transform. No source DRAFT record is changed.
- Added the pure read-only runtime snapshot scanner. Exact matching is only a
  discovery hint; every result stays `UNRESOLVED`. It reports override and
  quarantine semantics, projection differences, history counts, source
  identity fields, Topic/Set collisions, and flags a runtime ID shared by
  multiple polysemous Senses.
- Allowed an approved release with no pinned taxonomy only when it also has no
  pinned Classification. The synthetic builder test confirms eight eligible
  projection rows, null media URLs/Topic/Level, valid release/content hashes,
  and an unresolved reconciliation template. The test workspace is temporary
  and removed; no real canary release was created.
- The real owner template is still `PENDING`; `2.0.0` remains DRAFT. There is
  no dedicated staging branch or staging CLI target, so no target was added,
  no runtime snapshot was read, and no DB or migration command was run. The
  canonical root manifest and human-owned reconciliation file are unchanged.
- Node `v22.23.2`, pnpm `11.17.0`; Master validator PASS (0 errors, 0 warnings,
  1 informational DRAFT issue); focused Dataset V2 suite PASS (7 files,
  95/95 tests); root typecheck and ESLint PASS; Drizzle generation reports no
  schema changes. Final `git diff --check` is recorded with this change.
- A full-repository Vitest run was interrupted after the output identified
  three failures in `apps/web/src/App.test.tsx` and then produced no further
  progress for over two minutes. The displayed failures are the US-44 Study
  shell-heading/mobile-navigation expectations; the Study files were not
  touched. The complete current full-suite count is therefore unknown.
- Readiness gates are recorded in
  [`Phase 2D.2 readiness`](architecture/master-vocabulary-v2-phase-2d2-readiness.md).

## 2026-10-04 — Feature #12 Weak Words / Need Review

- Completed US-49 with a learner-authorized Weak/Learning/Stable read model,
  review-evidence search/filter/pagination, responsive `/weak-words` UI and a
  server-resolved weak Study scope. Classification and due state are separate;
  DUE/VOLUNTARY and Session Summary scope preservation use the existing review
  queue and canonical scheduler.
- Rule: latest 10 valid persisted review events per word in the inclusive
  30-household-local-date window; minimum 2 reviews and exact accuracy below
  60% is Weak. Non-Weak `LEARNING` is Learning; non-Weak `MASTERED` is Stable.
- No schema or migration changes, database mutation, deployment, merge or
  Dataset V2 file changes. Per-word Study target remains deferred.
- Validation PASS: 15 focused regression files / 152 tests plus one focused
  AppShell route test; feature TypeScript/TSX ESLint; `pnpm typecheck`;
  `pnpm build`; `git diff --check`. Local Node is 22.19.0 while the package
  requests 22.23.2; build completed with existing bundler notices.
- Evidence: [US-49](stories/US-49-weak-words-review.md),
  [DEC-024](decisions.md#dec-024--weak-word-classification-and-study-scope).

## 2026-10-03 — Owner-approved Master Vocabulary V2 canary 2.1.0

- Recorded the owner's explicit approval for all eight canary Senses, the six
  required Lexemes, the exact one-item `TECHNOLOGY_STARTER` Learning Set, null
  runtime media URLs, and release 2.1.0. Experimental classifications were not
  approved.
- Built the immutable `APPROVED` release at
  `vocabflow-dataset/releases/canary-v2.1.0`: schema 2.0.1, 8 Senses, 6
  Lexemes, 41 Provenance records, 1 Learning Set/item, 2 planned media assets,
  no media versions, and no classifications/taxonomy. Release hash:
  `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.
- Master validator PASS (0 errors/warnings); Phase 2C RELEASE transform PASS
  (8 projections, `importEligible=true`). The generated release-scoped
  reconciliation has eight `UNRESOLVED` Sense decisions and remains
  non-human-reviewed/non-importable. Runtime reconciliation and Phase 2E stay
  not ready; no target or runtime snapshot was used.
- Focused Dataset V2, preparation, transform, planner, reconciliation scan,
  and schema suite PASS (7 files, 91/91). TypeScript, ESLint, and
  `git diff --check` PASS. Bridge-hardening has one existing stale migration
  index assertion (expected 16, current journal 17); its other 11 tests pass.
- No database/Neon connection, migration, import APPLY, runtime identity
  decision, ID allocation, learner assignment change, Cloudinary operation, or
  Study UI file change occurred. The release report is
  `vocabflow-dataset/reports/canary-release-2.1.0-report.md`.

## 2026-10-04 — Master Vocabulary Dataset V2 Phase 2F.2

- Materialized 100 pinned candidate decisions in the offline
  `hybrid-100-editorial-draft` workspace: 2 existing Sense reuses, 3 new
  Senses on existing Lexemes, and 95 new Senses on 84 new Lexemes. The 98 new
  Senses each have project-authored English definitions/examples and
  Vietnamese translations; all records remain DRAFT.
- Reviewed five existing-Master collisions, 12 polysemy groups, and ten
  4600-only meanings. Stable UUIDv7 identity registry contains 574 new IDs;
  rerun allocation is zero and the draft package fingerprint is
  `ae0c6877f5f91e7225dcfa28c8fb98daed6ae235302b7e5daa19406c7b9ed152`.
- Source exact-match and eight-token overlap checks pass. No source text or
  media was reused. Source/media rights remain unverified; CEFR stays in
  editorial evidence and no Classification or Provenance records were added.
- Canonical Master, root dataset manifest, and canary release are unchanged.
  The development canary remains verified. No runtime bulk import has begun;
  there were no database writes, migrations, production connections, or media
  operations. Owner/editor review and any promotion decision are next.
- Root Master validator PASS (0 errors, 0 warnings, 1 informational DRAFT
  issue); root typecheck PASS; focused Phase 2F.2 tests PASS (10/10); focused
  ESLint and `git diff --check` PASS. Full repository ESLint reports one error
  in the unrelated, uncommitted `apps/web/src/features/learners/weak-words-page.tsx`
  effect at line 111. The local Node runtime is 22.19.0; the package engine
  requests 22.23.2.

<!-- PHASE-2F5-AI-PROGRESS START -->
## 2026-10-05 — Phase 2F.5 Hybrid-100 CEFR Promotion and RC

- Owner-approved 100/100 CEFR decisions under fingerprint d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622 were promoted to canonical DRAFT: 97 new Classification identities and light revision 2; water reuses revision 1; fuse remains intentionally unclassified.
- Promoted 197 immutable CEFR Provenance records. Canonical root remains version 2.0.0 / DRAFT, with 103 Lexemes, 123 Senses, 219 current Classification pins and 1043 Provenance pins.
- Built immutable 2.2.0-rc.1 from the exact 87-Lexeme / 100-Sense cohort. Candidate status is IN_REVIEW with 99 CEFR assignments and exact provenance closure.
- This is not an APPROVED release. No releaseHash exists. Source and media rights remain unverified. No runtime reconciliation, Neon import, database write, or production mutation occurred.
- Remaining gates: final RC owner review, DRAFT canonical content review, DRAFT taxonomy review, and separate APPROVED-release authorization.
<!-- PHASE-2F5-AI-PROGRESS END -->

## 2026-10-05 — Phase 2F.6 Hybrid-100 RC final audit

- Offline audit PASS: immutable 2.2.0-rc.1 retains the pinned fingerprint and
  exact 87-Lexeme / 100-Sense cohort, 99 CEFR assignments, and 799-record
  provenance closure. Learner-facing semantic drift is zero; no content
  correction or rc.2 is required.
- The release plan calls for approval-only next revisions for 87 Lexemes,
  100 Senses, and 99 Classifications. No records or IDs were created.
- Taxonomy 2.0.0 remains an immutable DRAFT snapshot. Repository policy does
  not define a lifecycle-only approval version step, so option C is recorded:
  an owner architecture decision is required before release 2.2.0 can be
  built. No APPROVED release or releaseHash was created; final owner release
  authorization remains pending.
- Runtime import and production mutation remain unauthorized. No database,
  reconciliation, runtime, canonical lifecycle, or RC mutation occurred.
- Focused audit regression: 6/6 PASS; audit `--check` reports all artifacts
  materialized with no differences. Master validator, typecheck, global ESLint,
  and `git diff --check` PASS. pnpm reports the local Node 22.19.0 is below the
  package's requested 22.23.2 engine; the listed checks completed successfully.
- Evidence: [final audit report](../vocabflow-dataset/reports/hybrid-100-rc-final-review-2.2.0-rc.1.md),
  [owner decision](../vocabflow-dataset/reports/hybrid-100-rc-final-owner-decision.md),
  and [machine-readable review plan](../vocabflow-dataset/workspaces/hybrid-100-rc-final-review/).

## 2026-10-06 — Global Search (Feature #14 / US-51)

- Added a learner-scoped, read-only global search API for enabled Vocabulary,
  accessible Topics and enabled Learning Sets, plus a shared typed result
  contract. Search is bounded to five results per group by default, ranks
  matches deterministically, uses parameterized SQL, and performs one grouped
  search read after the canonical ownership guard.
- Added the desktop Ctrl/Cmd+K command palette and compact-header mobile
  full-screen search, accessible grouped results, keyboard navigation and up
  to five deduplicated local recent query strings. Study focus routes keep
  search hidden; existing desktop/mobile navigation counts remain unchanged.
- Added API, web, recent-search and AppShell tests. No migration, scheduler
  change, database mutation or production deployment was made.

## 2026-10-06 — Loading / Empty / Error States (Feature #15 / US-52)

- Audited Home, AppShell/routing, Vocabulary, Saved, Weak Words, Progress,
  Topics/Topic Detail, Learning Sets/assignment, Learners/Settings, Study
  Setup/session and Global Search for loading, empty, error, retry and blank
  screen behavior. Kept AppShell mounted on normal page routes; Study retains
  its focus shell.
- Added shared accessible LoadingState, EmptyState and ErrorState components
  with card, row, dashboard/metric, hero/goal/chart, detail, form/setup, study
  and grouped-search skeleton shapes. Decorative blocks are hidden from
  assistive technology and animation respects reduced-motion.
- Migrated learner pages and Global Search to truthful empty states and safe
  retry states. Home dashboard section errors can be recovered via dashboard
  retry; Continue Learning, page reads, Settings and Study Setup retry their
  current read. Existing auth, permission, 404, mutation, scheduler and progress
  semantics remain unchanged.
- Focused regression PASS: 18 files / 249 tests. Global typecheck PASS;
  production build PASS; changed-file ESLint PASS; final `git diff --check` PASS.
  No API, database, migration, Dataset V2 or production
  deployment change; database mutations: 0.


## Phase 2H.2B editorial draft pilot (2026-10-08)

RECONCILED / DRAFT COMPLETENESS READY FOR OWNER REVIEW. Editorial acceptance
remains pending. All 155 drafts remain EDITORIAL DRAFT - NOT APPROVED.

Git reconciliation parent: 8eca81e84d896fd0449aed04ce646465d4dd4b9b, direct
child of accepted source artifact baseline a2f4f54eefc6734eb7da805f80ff8a9c6ebd4690.
Branch: phase-2h2b-editorial-reconciled. Fetch matched the authorized parent;
merge-base before switching was a2f4f54eefc6734eb7da805f80ff8a9c6ebd4690.
Created a verified filesystem safety copy of all 16 actual untracked editorial
files before `git switch -c phase-2h2b-editorial-reconciled origin/TXH`.
Untracked files carried forward without collisions; every one of the 16 SHA-256
hashes matched after switching. No stash/rebase/merge/reset or staging operation.
Safety backup: D:/hoctienganh/phase-2h2b-editorial-safety-20261008/;
file-hashes.json inventories every path and raw byte hash, stash-backups.txt
records all seven retained stashes, unrelated-pyc-hashes.json records the two
retained pre-existing pycs. The backup is outside the Git repository.

Accepted input pins are unchanged:
- Phase 2H.1: 58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53.
- Phase 2H.2A: 5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff.
- Phase 2H.2B: a42e4c25cebdf98cdd24f9e9231be81fff36bbdd571496eeff2886b4d1f1bdad.

The generated remoteBaseline field continues to mean accepted source artifact
baseline a2f4f54..., not the current Git parent. No fingerprinted field or input
pin was changed. All five authored PSV hashes are byte-identical; no draft
prose was overwritten or regenerated. External observations and owner samples
are additive documentation, outside the accepted draft fingerprint.

Accounting: 100 distinct pilot groups / 100 with substantive proposals / 0
blocked; 100 lexical proposal groups, 155 Sense drafts, 37 multi-Sense groups.
155 English definitions, 155 English examples, 155 Vietnamese meanings and 155
Vietnamese example translations. Actual pilot membership, key uniqueness,
source references, draft/group/lexeme links and examples were validated.
QA PASS/REVIEW/FAIL = 0/155/0, POS review pending 155, CEFR pending 155.
Existing Master identity review: 13 groups / 29 drafts. Owner approvals 0;
canonical IDs 0; publication eligibility 0. GENERATED field authorship records
actual AI composition and text hashes; no fictional human author/reviewer/date,
license or clearance. Both corpora retain UNKNOWN_REVIEW_REQUIRED.

The original [full reading report](../vocabflow-dataset/reports/master-editorial-draft-pilot.md)
and eight JSON/five prose sources are preserved. A separate owner review
companion section in [US-45](stories/US-45-master-vocabulary-v2-runtime-import-bridge.md#phase-2h2b-owner-readable-samples)
shows 15 unique groups: bank, record, light, run, water; a, an; abnormal; ability;
above; acre; acute; apple; according to; academic; attorney. Every selected
Sense includes actual generated EN/VI definition/meaning and example/translation,
source pointers, CEFR uncertainty, QA, Master/legacy considerations and a pending
owner decision. No raw APKG learner text is copied into the samples.

All new remote Study Setup/queue/application changes and US-54 documentation
remain intact. Local task scope is the 16 editorial files plus three append-only
handoff documents (19 intended files); no apps/web, apps/api, contracts, E2E,
CSS or unrelated product/architecture/flow/roadmap/decision changes. US-45 is
not marked fully ACCEPTED and this handoff grants no content approval.

Materialization is blocked on human content QA, Lexeme/Sense identity proof,
reviewed splits/coalescences, rights disposition, classification decisions and
separate canonical/release authorization. Hybrid 2.2.1 remains 87 Lexemes /100
Senses. All 2018 legacy rows, 75 historical identities, #11/#284/#295/#849 and
owner-excluded non-identity pairs stay protected under pinned offline evidence;
no live snapshot recapture is claimed. Database access/writes NONE/NONE,
Production UNTOUCHED; no maps, migration, disable/delete or Master authoring.
Commit NOT CREATED; push NOT PERFORMED. Next: remote-independent owner review
of actual prose, Sense boundaries, provenance, rights and QA findings.

### Raw authored file hashes preserved

| Authored file | SHA-256 (raw bytes) |
|---|---|
| `batch-01.psv` | `da0ebcaa6b0300ddadcd0881b479c77440e0e8b6e154afb44fd6de94561a27b5` |
| `batch-02.psv` | `5402a9dc50e0eb6c14991134029bf6c14817ca84d54bbc0a2ce3f6ba0ca457ef` |
| `batch-03.psv` | `cd081319739ace2ac40901d32559158ce251747cf67745ed6845459af57001af` |
| `batch-04.psv` | `bf2d0cb29eed2aae57d2fa658a91aa91d7821b3746c4e577fab240ee48963639` |
| `batch-05.psv` | `c0ce1ebd0d625a245c7bf5a6037ea74375f133ca44b26edf000d528691e937df` |

### Editorial quality observations and unresolved decisions

The AI assistant inspected all 155 definition/meaning pairs and example pairs;
this is an AI screening, not human editorial acceptance. Exact definition and
English-example duplicates are zero, and no three-word example opening repeats.
The persisted source-passage/eight-token screen compares both complete corpora
(9677 notes) and flags zero matches. These finite checks do not establish
originality, semantic equivalence, grammatical correctness or rights clearance.
All 155 Sense drafts remain QA REVIEW; all bilingual, grammar/POS, boundaries,
CEFR, generated authorship and rights findings remain pending.

Suspected issues are recorded here without altering the persisted prose:

- academic combines source ordinals 0 and 2 into one education/research adjective;
  have to combines affirmative/negative patterns 0 and 1. Owner must decide
  whether coalescence preserves meaning; no approved source-to-Sense mapping.
- bank keeps financial and river-edge meanings separate. record distinguishes
  best-result/stored-information nouns and capture-information verb, but sound,
  image and information capture may need finer boundaries. run separates motion,
  machine operation, management and an exercise noun; transitive operation and
  other unsupported senses remain outside the proposed scope.
- light separates illumination, lamp, weight, ignition and colour. Weight wording
  also asserts ease of carrying, which may overconstrain the meaning. Existing
  noun/verb Master pins require independent comparison and identity proof.
- water noun and verb remain separate. Runtime #11 history and its owner-excluded
  Master verb pair remain NONE. A new verb draft cannot reverse that decision.
- arm:weapons uses the singular headword arm while its example uses arms. Owner
  must review plural-only weapons usage, lexical form and identity granularity.
- billion uses local OTHER because source NUMBER has no direct Master POS enum;
  at the onset is a whole construction using OTHER rather than blindly copying
  the noun tag for onset. about:approximately and above:higher-place need usage-
  level POS analysis; source tags do not prove the proposed POS.
- acute:rapid-onset needs subject terminology review of onset versus duration.
  acre omits a conversion/size explanation, which may limit learner usefulness.
  acquire:gain restricts acquisition to learning/experience while including
  possessions; owner should review definition scope versus its example.
- bad:spoiled-food's smelled bad example can also express an unpleasant odour
  without proving spoilage. absurd's empty-package delivery-fee example depends
  on context; owner should evaluate whether it clearly teaches unreasonable.
- attorney has EXAMPLE_POLARITY_MISMATCH: English unclear corresponds to
  Vietnamese chua ro, but the heuristic recognizes only explicit English
  not/never. Likely false positive, still UNRESOLVED; no flag was cleared.
- CEFR is preserved as source/headword evidence only. Conflicting bands, e.g.
  acre, remain null as a single proposed band. Any unique candidate is still
  unverified for this Sense; school/age/difficulty/topic/domain/exam/sets remain
  independent. Scientific and sensitive terms need subject/audience review.

Each draft key supports independent correction, deferment or rejection. No
meaningful count, QA finding, owner decision or license was improved for reporting.

### External validation on the reconciled baseline

Commands ran with Python 3.13.1 and portable Node 22.23.2 on Git HEAD
8eca81e84d896fd0449aed04ce646465d4dd4b9b. External command evidence is
recorded here, outside generated validation/fingerprints.

| Command | Actual result | Exit |
|---|---|---|
| `python -B scripts/phase-2h2b-editorial-draft-test.py` | 23/23 PASS | 0 |
| `python -B scripts/phase-2h2a-master-expansion-test.py` | 21/21 PASS | 0 |
| `python -B scripts/phase-2h1-source-inventory-test.py` | 13/13 PASS | 0 |
| `python -B scripts/phase-2h2b-editorial-draft.py --check` | PASS; persisted prose replay, fingerprint unchanged | 0 |
| `node node_modules/typescript/bin/tsc -b` | PASS | 0 |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | PASS | 0 |
| `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | NOOP_ALREADY_MATERIALIZED_AND_FROZEN; writesPerformed=false | 0 |
| `pnpm typecheck` | WRAPPER_BLOCKED_BY_ENVIRONMENT: ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY | 1 |

The pnpm wrapper attempted its installation check and aborted at the non-TTY
purge guard. No bypass, install retry or node_modules removal was performed;
direct TypeScript CLI PASS is independent evidence. Frozen release hash:
44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c;
tree: 51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e.


### Reconciliation integrity and final Git scope

All 16 safety-copy hashes still match after documentation closure, including
all five authored PSV byte hashes. Seven stash entries and both pre-existing
pyc byte hashes match the saved inventory. The three handoff documents retain
the complete remote version as their prefix; appended observations/samples
preserve Study source picker documentation. The companion contains 15 unique
sample groups / 30 Sense drafts, copied verbatim from existing draft fields.

Actual intended inventory: 19 files (16 new editorial files plus three tracked
handoff documents). No staged file or staged pyc; no local app/API/contracts/
E2E/CSS/product/architecture/flow/roadmap/decision diff. `git diff --check`
PASS, exit 0; a separate read-only whitespace check covers all untracked
editorial text too. Initial trailing blank lines in newly appended documentation
were removed; no editorial file changed. The safety inventory records all exact
paths and SHA-256 values; Git diff alone was not used to inventory new files.


## Phase 2H.2B-QA1 editorial corrections (2026-10-08)

EDITORIAL CORRECTIONS PROPOSED - OWNER REVIEW PENDING. Remote/local baseline
8eca81e84d896fd0449aed04ce646465d4dd4b9b on phase-2h2b-editorial-reconciled.
The 19 prior intended files remain; changes are confined to a dedicated correction
workspace, two new Python scripts, one new report and additive handoff sections.
Original scripts, report, five PSV files and eight generated artifacts retain
all 16 safety-copy byte hashes. All seven stashes, safety backups and unrelated
pycs remain. No app/API/contracts/E2E/UI/product/architecture/decision edits.

Independent AI review JSON/Markdown files were not found by exact-name searches
of D:/hoctienganh and C:/Users/User/.codex/attachments, including hidden/ignored
files. Used the complete 22 findings in Section 5 of the user request, exactly
as authorized; preserved its exact bytes in review-intake/qa1-request.txt with
SHA-256. No unavailable review file was claimed as loaded. Original-file byte
pins copied from the existing external safety backup into review intake.

Original Phase 2H.1 fingerprint:
58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53.
Original Phase 2H.2A fingerprint:
5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff.
Original Phase 2H.2B fingerprint:
a42e4c25cebdf98cdd24f9e9231be81fff36bbdd571496eeff2886b4d1f1bdad.
All three remain unchanged. Independent correction fingerprint: b75b0522e64db5d61cff4adbccd2fb553c72f5d475d6e4370b2075e656b6a40d.
Accepted source baseline remains a2f4f54eefc6734eb7da805f80ff8a9c6ebd4690,
distinct from the Git reconciliation parent. No source repin or original rewrite.

22 findings: 17 revised preview drafts, 4 explicitly deferred identity cases,
1 scoped false-positive rejection. Dispositions: ACCEPT_CORRECTION_PROPOSAL 13,
MODIFY_CORRECTION_PROPOSAL 4 (about/acquire/acute/block), DEFER_IDENTITY_DECISION
4, REJECT_FINDING_WITH_REASON 1 (attorney). These are AI recommendations only.
134 retained triage drafts include attorney; four additional identity cases also
retain their text, giving 138 unchanged preview drafts. All 155 keys, 100 groups,
37 multi-Sense groups and complete bilingual fields remain. Updated fields:
9 English definitions, 4 English examples, 12 Vietnamese meanings, 6 Vietnamese
example translations, 1 POS proposal. Old/new six-field snapshots record coupled
meaning/label/POS/definition/translation/example review; grammar-note changes and
field-level GENERATED hashes are also retained. AI review is not human acceptance.

All 155 remain QA REVIEW and identity UNRESOLVED; 15 explicit identity-issue
records include the four mandatory cases and correction-related blockers.
No canonical IDs/owner approvals/publication eligibility. Rights remain
UNKNOWN_REVIEW_REQUIRED; no human author, review date, reviewer or license invented.
Source evidence/CEFR proposals and Master pins remain unchanged, with reassessment
required for revised scope/POS. Runtime #11/history and owner exclusions remain
non-identity; #284/#295/#849 protected under accepted offline pins, without live
checks. Approved Hybrid 2.2.1 still has 87 Lexemes/100 Senses, release hash
44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c and tree
51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e.

[Owner side-by-side report](../vocabflow-dataset/reports/master-editorial-quality-corrections.md)
shows the actual six fields BEFORE/AFTER for all 17 revisions, four representation
reviews and attorney's unchanged pair. Raw polarity warning is retained in audit
history; only that exact original pair receives an AI rejection rationale.
Full-corpus source ngram screening reports zero similarity signals, but neither
this nor QA completeness clears rights or proves linguistic originality.
External verification sources in the report support pregnancy-termination scope,
CO2 formula and conflicting approximate-about POS analyses. NHS page was read;
PubChem search evidence verified CO2 but full page showed a browser challenge;
Cambridge excerpt/search and publisher grammar discussion supplied the differing
labels, while the direct dictionary page returned 403. No licensed wording was
copied or permission inferred. Subject/grammar review remains pending.

Scaling is CONDITIONAL, plan only. Actual pilot has 73 a-initial groups, so it
is not a representative statistical corpus sample. Propose 120 new groups,
20 each across b-d/e-h/i-m/n-r/s-v/w-z, stratified by source/POS/CEFR/risk and
hash-ranked with a fixed seed to avoid first-n alphabetic bias. Batches <=20,
<=10 identity-heavy, <=5 sensitive/high-polysemy. Explicit identity review always
covers Master/history/exclusions, form/construction and split/merge ambiguity.
Low-risk audit at least 10 per batch or 20 percent, whichever is greater;
critical defects trigger full stratum review; two substantive grammar/translation
defects trigger full batch review. Sampling never grants owner/identity/rights
approval. No full-corpus authoring or actual next-batch selection has begun.

### External validation

Commands executed on the verified baseline with Python 3.13.1 / Node 22.23.2.
These results are outside deterministic artifact validation/fingerprints.

| Command | Actual result | Exit |
|---|---|---|
| `python -B scripts/phase-2h2b-qa1-corrections-test.py` | 19/19 PASS | 0 |
| `python -B scripts/phase-2h2b-editorial-draft-test.py` | 23/23 PASS | 0 |
| `python -B scripts/phase-2h2a-master-expansion-test.py` | 21/21 PASS | 0 |
| `python -B scripts/phase-2h1-source-inventory-test.py` | 13/13 PASS | 0 |
| `python -B scripts/phase-2h2b-qa1-corrections.py --check` | PASS; deterministic persisted overlay replay | 0 |
| `node node_modules/typescript/bin/tsc -b` | PASS | 0 |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | PASS | 0 |
| `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | NOOP_ALREADY_MATERIALIZED_AND_FROZEN; writesPerformed=false | 0 |
| `pnpm typecheck` | WRAPPER_BLOCKED_BY_ENVIRONMENT: ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY | 1 |

The pnpm wrapper's non-TTY guard aborted before modules removal. No bypass,
node_modules modification or installation retry. Direct tsc evidence is separate.
Generated validation covers assembly/structural checks only. Database access/writes
NONE/NONE, Production UNTOUCHED; no mappings, migrations, cleanup, canonical
materialization, media or release promotion. No staging, commit or push authorized.
Next: owner review correction proposals, Sense boundaries, provenance, rights
and stratified scaling gates before separately authorizing the next phase.


QA1 final Git gate: fetch succeeded and origin/TXH/HEAD remain exactly
8eca81e84d896fd0449aed04ce646465d4dd4b9b. `git diff --check` PASS, exit 0;
read-only whitespace verification also covers all untracked text. Actual inventory
has 15 new QA1 files plus the retained 16 original editorial files and three
handoff documents: 34 intended files total, zero staged files. All original 16
byte hashes, seven stash entries, two unrelated pyc hashes and safety backups
match; remote application and documentation prefixes are preserved. No commit
or push. Owner may now review the correction report and conditional scaling plan.


## Phase 2H.2B-QA1 draft artifact publication gate (2026-10-08)

Owner subsequently authorized only a scoped 34-file commit and non-force push
to origin/TXH with expected parent 8eca81e84d896fd0449aed04ce646465d4dd4b9b.
Earlier no-commit/no-push statements describe their respective completed phases.
This publication gate grants no human content/identity approval, source copyright
clearance, learner-content publication, Master release or Development apply.
No vocabulary prose, original artifact or accepted fingerprint was changed.
QA1 intake still accurately identifies prompt Section 5 fallback; no external
independent JSON/Markdown review file was loaded or hash-verified.

Final verification commands executed again on the expected parent:

| Command | Actual result | Exit |
|---|---|---|
| `python -B scripts/phase-2h2b-qa1-corrections-test.py` | 19/19 PASS | 0 |
| `python -B scripts/phase-2h2b-qa1-corrections.py --check` | PASS; QA1 fingerprint b75b0522e64db5d61cff4adbccd2fb553c72f5d475d6e4370b2075e656b6a40d | 0 |
| `python -B scripts/phase-2h2b-editorial-draft-test.py` | 23/23 PASS | 0 |
| `python -B scripts/phase-2h2b-editorial-draft.py --check` | PASS; original fingerprint a42e4c25cebdf98cdd24f9e9231be81fff36bbdd571496eeff2886b4d1f1bdad | 0 |
| `python -B scripts/phase-2h2a-master-expansion-test.py` | 21/21 PASS | 0 |
| `python -B scripts/phase-2h1-source-inventory-test.py` | 13/13 PASS | 0 |
| `node node_modules/typescript/bin/tsc -b` | PASS | 0 |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | PASS | 0 |
| `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | NOOP_ALREADY_MATERIALIZED_AND_FROZEN; writesPerformed=false | 0 |

The canonical pnpm typecheck wrapper is not claimed PASS; its previously observed
noninteractive installation guard remains documented. No dependency or modules
change was made. Original 16 files/five PSV byte hashes match the protected safety
copy. Scope is 16 original editorial files, 15 correction files and three additive
handoff documents; unrelated pycs, seven stashes and safety backups are retained.
All 155 original/corrected keys and 100 pilot groups remain DRAFT/REVIEW,
identity UNRESOLVED, approvals/allocated IDs/runtime maps zero, source rights
UNKNOWN_REVIEW_REQUIRED. Hybrid 2.2.1 and legacy/history/exclusion pins unchanged;
DB access/writes NONE, Production UNTOUCHED. Next Phase 2H.2C 120-group authoring
requires separate authorization; publication alone does not start it.

Staging verification: exactly 34 intended paths. All 31 new editorial/intake
files in the index match their accepted working bytes; original 16 match backup.
The plain cached whitespace check exits 1 because hash-pinned intake CRLF is
classified as trailing whitespace. `git -c core.whitespace=cr-at-eol diff --cached --check`
exits 0; an independent line check finds no trailing spaces/tabs. CRLF bytes were
preserved with per-command core.autocrlf=false for the new files; no persistent
Git configuration changed. The three additive docs use normal LF index content.


## Phase 2H.2B + QA1 safe publication reconciliation (2026-10-08)

Publication worktree/branch phase-2h2b-qa1-publish-4e59 starts at
4e59c8da980e8ae8bd5bf1fe9fdd705d41949efa. The original staged worktree
is preserved. All 31 Dataset/script/report/intake files retain exact staged
SHA-256 bytes; three additive Dataset documentation deltas are appended to
remote documents. Remote Study picker/scoped queue/jank fix sections are intact.
Historical input fingerprints and Git pins are unchanged.

Safety snapshot (34 byte copies, hashes, binary patch, old/new Git pins, stash
and bytecode inventory): D:/hoctienganh/phase-2h2b-qa1-publication-backup-20261008-152102.

Validation on the new baseline:

| Command | Exit/result |
|---|---|
| `python -B scripts/phase-2h2b-qa1-corrections-test.py` | 0 |
| `python -B scripts/phase-2h2b-qa1-corrections.py --check` | 0 |
| `python -B scripts/phase-2h2b-editorial-draft-test.py` | 0 |
| `python -B scripts/phase-2h2b-editorial-draft.py --check` | 0 |
| `python -B scripts/phase-2h2a-master-expansion-test.py` | 0 |
| `python -B scripts/phase-2h1-source-inventory-test.py` | 0 |
| `node node_modules/typescript/bin/tsc -b` | 2 initially: missing ignored apps/api/dist/vercel-runtime.mjs; final rerun 0 after runtime build-output preparation |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | 0 |
| `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | 0 |

Focused suites: 19 + 23 + 21 + 13 = 76 PASS. Both offline replays PASS.
A new ignored node_modules junction points to existing installed dependencies;
no reinstall/removal or dependency changes. Existing ignored API dist output
was copied after confirming API/contracts/learning-domain source trees identical
between old/new baselines. Direct typecheck rerun exits 0. The canonical pnpm
wrapper is not claimed PASS. Lint and frozen Hybrid check exit 0; frozen check
NOOP_ALREADY_MATERIALIZED_AND_FROZEN, no writes.

34-file staged scope and exact immutable bytes are verified. Plain cached
whitespace checker reports CRLF-only intake lines; cr-at-eol checker exits 0,
with no actual trailing spaces/tabs or merge markers. No persistent whitespace
configuration change. No owner approvals, IDs, mappings, DB access/writes,
legacy changes or Production operation. All drafts remain REVIEW/noncanonical,
rights UNKNOWN_REVIEW_REQUIRED; QA1 independent external review files were not
loaded. This authorizes draft Git publication only; Phase 2H.2C remains separate.

New publication index: regular `git diff --cached --check` returns exit 2
(677 CRLF-only intake diagnostics); CRLF-aware check returns exit 0.


## Phase 2H.2C — stratified 120-group editorial drafts (2026-10-08)

IMPLEMENTED OFFLINE / READY FOR OWNER CHECK; human editorial, identity and
rights decisions PENDING. This owner instruction separately authorizes 120 NEW
groups and scoped draft publication; it does not mark US-45 as ACCEPTED or grant
canonical materialization, runtime mapping, Development apply or Production.

Existing local TXH checkout used, no branch/worktree created. Started from
6c06e99ae8f40020d826c7aa140b4da1a107a6c2 after safe fast-forward. Concurrent
Study/UI commit 7f01d22860386836c90188af0adb841c1b3de15f is retained. No app/API/contracts/E2E/schema
changes are part of this Dataset task. All prior handoff sections retained.

120 selected/new groups, 0 pilot overlap, six buckets of 20; 187 original
bilingual Sense drafts, 48 multi-Sense groups; all 120 groups have drafts,
0 blocked. Exactly 187 each definitions, EN examples, VI meanings/translations.
24 batches of five; all 120 groups fully AI-self-reviewed across 13 dimensions,
78 high-risk groups explicitly flagged. No independent human review claimed.
35 new tests and 76 upstream tests PASS.

Source strata: Oxford-only 36 / 4600-only 20 / both 64. Draft POS group coverage
(overlapping): noun 70, verb 24, adjective 31, adverb 17. Source CEFR evidence
A1 31 / A2 27 / B1 12 / B2 27 / C1 20 / C2 13; no Sense classification assigned.
Polysemy signals 49, POS conflicts 10, CEFR conflicts 10, Master overlaps 10,
history dependencies 10. Source multiword signals 10; actual multiword units 8.
visible (adj) and warming (n) are deck annotations, not phrases: real-unit
target short by two, cohort remains frozen. Missing CEFR evidence quota has
zero capacity in the eligible pool. Do not claim all linguistic quotas met.

QA status PASS/REVIEW/FAIL = 0/187/0. AI review found two scope/translation
clarifications and five initial source-wording collisions; 11 changed fields
across seven Sense drafts are recorded BEFORE/AFTER. A critical potential-copy
signal conservatively escalated SOURCE_SIMILARITY; full-source/full-AI-stratum
review completed. Final exact-five-token/eight-token source scan has zero
flags, not rights clearance. Semantic boundaries, grammatical representations,
translation naturalness, specialist claims and CEFR remain pending human review.
All 187 identities unresolved; owner approvals/IDs/maps zero. Rights
UNKNOWN_REVIEW_REQUIRED; GENERATED field hashes, no invented author/license.

Selection fingerprint: 2d380a64570532fd3afce23b5b84bd9a63dc525d2d56b67453b38f4418456a79
Editorial fingerprint: a84e173137c48a1f9258c9c74d84b63f642b15651f8bd1f72378c72fe825a935
All four previous fingerprints unchanged; no historical Git/source repin.

[Full bilingual preview, corrections and evidence](../vocabflow-dataset/reports/master-editorial-stratified-120.md).

Final commands actually executed:

| Command | Exit |
|---|---|
| `python -B scripts/phase-2h2c-stratified-editorial-test.py` | 0 |
| `python -B scripts/phase-2h2c-stratified-editorial.py --check` | 0 |
| `python -B scripts/phase-2h2b-qa1-corrections-test.py` | 0 |
| `python -B scripts/phase-2h2b-qa1-corrections.py --check` | 0 |
| `python -B scripts/phase-2h2b-editorial-draft-test.py` | 0 |
| `python -B scripts/phase-2h2b-editorial-draft.py --check` | 0 |
| `python -B scripts/phase-2h2a-master-expansion-test.py` | 0 |
| `python -B scripts/phase-2h1-source-inventory-test.py` | 0 |
| `node node_modules/typescript/bin/tsc -b` | 0 |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | 0 |
| `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | 0 |
| `git diff --check` | 0 |

During development a regression test used the wrong QA1 preview key; corrected
to senseProposals. Cross-process replay then exposed unordered statistic keys;
sorted serialization fixes it, with a distinct PYTHONHASHSEED regression test.
Final 35/35 rerun and --check pass; no prose regeneration used to fix replay.
Canonical pnpm wrapper is not claimed PASS; no dependency reinstall/removal.

Windows checkout initially smudged accepted pilot LF blobs to CRLF. Exact
published Git bytes were restored only after backing up all 31 prior editorial
files; accepted pins and content unchanged, no old artifact diff committed.
Local stat refresh removed false dirty indications without staging old files.
New workspace JSON/PSV files pin LF locally for raw authoring hash replay.
Safety inventory and command outputs: D:/hoctienganh/phase-2h2c-safety-20261008-153818.
Seven historical stashes/older worktrees and backups preserved.

Hybrid 2.2.1 / APPROVED, 87 Lexemes / 100 Senses remains frozen; exact release
hash/tree retained. Legacy 2018, history 75, #11/#284/#295/#849 and owner
exclusions preserved under accepted offline evidence; no live DB query.
Database access/writes NONE/NONE; Production UNTOUCHED. Canonical release BLOCKED
pending rights, identity, content/classification and separate release permission.
Next recommendation: separate annotation from multiword signals before selecting
future cohorts; scale small reviewed bilingual batches with independent human
QA. Do not restart inventory or automatically author the next batch.


## Phase 2H.2D — 300-group bulk editorial and owner-review queue (2026-10-08)

Offline noncanonical deliverables completed on TXH, baseline
477bb5c087b0ede7f50045054aabe92505c78bba. Scoped commit/push is explicitly
owner-authorized; no canonical publication or Development operation authorized.

Exactly 300 new groups (50 per alphabet bucket) outside the prior 220 are frozen
under PHASE_2H2D_BULK_300_V1. All source/POS/CEFR quota targets achieved;
three source annotation groups excluded before freeze. 60 persisted batches of
five groups, each with exact byte receipt and Sense accounting. 300 authored,
zero blocked; 471 new Senses, including 115 multi-Sense groups. Exactly 471 each
English definitions/examples and Vietnamese meanings/example translations.
Total 520 groups / 813 Senses; 5623 groups remain undrafted. Hybrid-100 is separate.

Source groups: Oxford-only 85 / 4600-only 66 / both 149. Overlapping source POS:
noun 161, verb 85, adjective 67, adverb 38. Draft Sense POS: noun 194, verb 115,
adjective 80, adverb 49, other grammatical proposals 33. CEFR evidence groups:
A1 60 / A2 45 / B1 30 / B2 63 / C1 70 / C2 45; no verified Sense CEFR assigned.
All supported Oxford ordinals represented; second coalesces its two ordinal
classification records. Coverage does not establish exhaustive dictionary identity.

AI self-review covers all 471 Senses, not independent human acceptance.
35 field corrections across 20 Senses are overlays; original PSV files and hashes
remain unchanged. These include example/source-wording collisions, least POS
example ambiguity, natural Vietnamese for way, and display capitals/IT acronym.
Initial display validation was insufficient for Sunday/Valentine's Day/IT;
explicit correction findings preserve the frozen group keys, not silent replacement.
Source POS defects and the numeral policy for seven remain owner-review findings.
Final source scan: no example collisions; 18 short conventional gloss similarities
remain visible for human review and never imply rights clearance.
All 471 new identities/content approvals remain pending; structural errors zero.
Human reviewed 0, owner approved 0, IDs/maps/release-ready Senses 0.

Consolidated queue includes corrected QA1 155 + 2H.2C 187 + new 471 = 813,
without duplicate proposal keys. Existing corrected content remains exact.
41 Markdown exports contain at most 20 Senses each, plus a CSV decision template.
KEEP / REVISE / MERGE / SPLIT / DEFER / REJECT are requested decisions only.
Priority tiers 1–6: 237 / 13 / 46 / 432 / 43 / 42. Rights UNKNOWN_REVIEW_REQUIRED
for all 813, independent of content-review ordering. Every record has content,
source/CEFR evidence, Master overlap, legacy dependencies, QA, provenance and
separate readiness axes. Rights checklist is evidence requirements, not clearance.

Selection fingerprint: 63894bd46027524528c01c44a57e45af99b54cf48910c3f605219d2fd9faf388
Editorial fingerprint: 6d9b4c758c0be6f60ee4feb3a38c90dacce7dd053488fc7ff6a680b19f080e85
Owner-review queue fingerprint: 53fb17292af49e1c2c144a13630275386c7bdd7edc5a4d7e6c5e8ba8aa9b107e

[Full bilingual drafts and BEFORE/AFTER](../vocabflow-dataset/reports/master-editorial-bulk-300.md).
[Owner review workspace](../vocabflow-dataset/workspaces/master-editorial-owner-review-queue/manifest.json).

Actually executed verification (generator does not run these external commands):

| Command | Exit |
|---|---|
| `python -B scripts/phase-2h2d-bulk-editorial-test.py` (41 tests) | 0 |
| `python -B scripts/phase-2h2c-stratified-editorial-test.py` | 0 |
| `python -B scripts/phase-2h2c-stratified-editorial.py --check` | 0 |
| `python -B scripts/phase-2h2b-qa1-corrections-test.py` | 0 |
| `python -B scripts/phase-2h2b-qa1-corrections.py --check` | 0 |
| `python -B scripts/phase-2h2b-editorial-draft-test.py` | 0 |
| `python -B scripts/phase-2h2b-editorial-draft.py --check` | 0 |
| `python -B scripts/phase-2h2a-master-expansion-test.py` | 0 |
| `python -B scripts/phase-2h1-source-inventory-test.py` | 0 |
| `node node_modules/typescript/bin/tsc -b` | 0 |
| `node node_modules/eslint/bin/eslint.js . --max-warnings=0` | 0 |
| `node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check` | 0 |
| `git diff --check` | 0 |

Prior regression suites: 2H.1 13, 2H.2A 21, 2H.2B 23, QA1 19, 2H.2C 35;
111 accepted regressions plus 41 new tests = 152 PASS. New replay includes a
separate process with PYTHONHASHSEED=117 and mutation-CLI rejection. Previous
four fingerprints plus 2H.2C selection/editorial and all accepted Dataset/tooling
byte pins remain unchanged. Direct tsc exit 0 is separate evidence; canonical
pnpm typecheck wrapper limitation remains documented and is not claimed PASS.
No dependency reinstall or module removal. Frozen release command was --check.

QA found the owner queue initially interpreted an empty Master metadata envelope
as a collision. The helper now checks the actual overlap signal and a regression
keeps dancer in tier 1; generic human-review warnings do not erase low-risk order.

All seven historical stashes, worktrees, staged older pilot backups and unrelated
files preserved. Safety inventory/logs: D:/hoctienganh/phase-2h2d-safety.
Only the two new workspaces, phase script/tests, report and three handoff docs
belong to this publication. No apps/web, migrations, raw decks/media or pyc files.
Hybrid 2.2.1 remains APPROVED 87 Lexemes/100 Senses; release
44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c;
tree 51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e.
Legacy 2018/history 75/#11/#284/#295/#849/owner exclusions pinned offline;
no live database verification claimed. Database access/writes NONE/NONE;
Production UNTOUCHED. Next gate is actual owner content/identity decisions,
independent linguistic QA and documented rights disposition, followed only by a
separately authorized canonical release and Development dry-run/apply. Stop here;
no new bulk batch, canonical materialization, DB apply or legacy cleanup.


### 2026-10-08 — Phase 2H.2E offline editorial approval and rights gate

Technical package complete; human acceptance remains pending. Audited 813 Sense
proposals in 520 groups without changing the accepted 2H.2D queue. Reclassified
103 risk tiers: LOW 193 / MEDIUM 25 / HIGH 588 / CRITICAL 7. The overlooked
`a, an` alias and `abnormal` legacy link are HIGH; preserved identity blockers
survive wording corrections. Reviewed all 18 short-gloss signals without merges.

Frozen cohort: 40 Senses, 10 each noun/verb/adjective/adverb, three source
memberships and A1-C1 evidence represented. AI self-review covers 14 dimensions,
finds 7 issues and proposes 8 immutable field overlays. Four 10-Sense bilingual
review packs and six CSV templates support resumable owner review. Partial
validate/import checks exact revision, actual authorized human reviewer/date,
independent identity/classification/rights evidence, idempotency and conflict
preservation. Empty files and pending/DEFER states are valid. AI output and KEEP
alone never grant approval or rights. Trusted reviewer registry and real ledger
remain empty: human decisions, identity resolved, classification reviewed, rights
resolved, canonical-ready and release-ready all 0. Preview has 40 noncanonical
records; no IDs, runtime mappings or published Master release.

Accepted queue fingerprint:
`53fb17292af49e1c2c144a13630275386c7bdd7edc5a4d7e6c5e8ba8aa9b107e`.
Approval gate fingerprint: `7b81c06de08b75412039cb28b1b72490da51e0a82595d68fb54de33c57740e18`.
71 focused + 152 previous Phase 2H regressions PASS (223 total). Direct `tsc -b`,
ESLint, offline replay (including PYTHONHASHSEED=987), frozen Hybrid check and
accepted byte pins PASS. External commands/log hashes are separate from generator
checks in `master-editorial-approval-gate/verification-results.json`; canonical
`pnpm typecheck` historical non-TTY limitation remains, not claimed PASS.

Hybrid 2.2.1 APPROVED 87/100 is unchanged, as are all original drafts, canonical
contracts, 2018 legacy rows/history75/#11/#284/#295/#849/owner exclusions (offline
pins, no live query). Database access/writes NONE/NONE; Production UNTOUCHED.
Existing stashes/worktrees/backups and concurrent Study/API changes preserved.
Only this offline workspace, script/tests, report and these handoff additions
belong to this publication. Owner workflow:
`vocabflow-dataset/reports/master-editorial-approval-gate.md`.
Next: actual owner content/identity/classification decisions and documented
intended-publication rights, then a separately authorized canonical materialization
and Development planning phase. Stop after scoped commit/push; no DB apply.


### 2026-10-08 — Phase 2H.2F owner session 01 prepared; OWNER_INPUT_PENDING

Reviewed exactly the frozen first 10 Senses with substantive AI linguistic
analysis: 7 KEEP recommendations, 3 REVISE, 4 proposed field corrections.
BEFORE/AFTER covers relatively's standalone comparator gloss, successfully's
unsupported completed-action restriction, and fully's minimum-threshold gloss
and tooling comment in grammar notes. No accepted content or hash was changed.
Cambridge search extracts were actually returned for all 10 entries; attempted
direct-page 403s are not claimed successful. Five source/dictionary CEFR label
disagreements remain review evidence, not automatic classification changes.

Vietnamese owner table, exact keys/hashes, boundary/classification assessment,
provenance/rights notes and existing-gate recomputation are additive under
`vocabflow-dataset/workspaces/master-editorial-approval-gate/owner-session-01/`.
The existing 2H.2E validator/ledger is reused, not rebuilt. No actual owner
submission or independently owner-verified bundle has arrived. Owner decisions
received/validated/imported, content human-approved, identity/POS/classification,
similarity/rights and canonical-ready counts all 0. Original decision CSV remains
blank; no trust bundle, human approval or receipt was fabricated. New correction
refs are unregistered proposals; existing intake rejects them until an explicit
owner-authorized revision/correction registration preserves the old snapshot.

35 session tests + 223 existing Phase 2H regressions PASS (258 total). An initial
2H.2E suite initialization hit MemoryError under concurrent corpus jobs (0 tests,
exit 5); unchanged suite rerun serially passed 71/71. Both attempts are recorded.
Direct tsc -b, ESLint, deterministic offline replay (PYTHONHASHSEED=987), frozen
Hybrid check and 6,278 accepted byte pins PASS. External commands/exit codes and
log hashes remain separate in session `verification-results.json`. Canonical
pnpm typecheck was not run/not claimed PASS; historical non-TTY limitation retained.

Accepted 2H.2E fingerprint unchanged:
`7b81c06de08b75412039cb28b1b72490da51e0a82595d68fb54de33c57740e18`.
Session fingerprint: `e99b806bf48de54eec3f9f468b2cbf73f72d52e47709be187990a718fbd260f9`.
Hybrid 2.2.1 APPROVED 87/100, release hash
`44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`,
2018 legacy rows/history75/#11/#284/#295/#849/protected exclusions and mappings
remain unchanged (offline pins; no live query). Canonical IDs allocated 0;
Master release/schema/runtime mappings unchanged. DB access/writes NONE/NONE;
Production UNTOUCHED. Stashes, worktrees, backups and unrelated work preserved.

Next owner action: read `owner-session-01/owner-review-10.md`, submit actual
decisions/rationale and review scope for these 10, with actual reviewer/evidence
and independent owner authorization. KEEP content does not approve identity,
CEFR, rights or release. Stop after publishing this verified offline package;
no next pack, canonical materialization or Development apply.


## 2026-10-08 — Phase 2H.2G owner-authorized DRAFT V2 corrections

The latest owner instruction supersedes the earlier wording-preservation preference
for relatively, successfully and fully. Exactly four 2H.2F correction fields are
applied in the additive master-editorial-draft-v2-session-01 workspace. The exact
original hashes, BEFORE/AFTER text, field provenance and parent revision are
verified. This authorizes draft editing only, not formal human content approval.

Effective lookup preserves QA1 → 2H.2C → 2H.2D → 2H.2E preview layers before the
new overlay. 813 effective entries: 810 unchanged, three revised, four changed
fields, no additions/deletions/key changes or canonical IDs. The seven reviewed
KEEP records remain content/hash-equivalent. All ten remain available with EN/VI
definitions/examples and grammar in the new human-readable report.

Use `python -B scripts/phase-2h2g-draft-v2.py --lookup EXACT_PROPOSAL_KEY` for the
latest draft; `--check` verifies deterministic offline replay. Existing files are
never overwritten with differing output. Hashing reuses the accepted noncanonical
editorial revision algorithm; it does not allocate canonical Sense revisions.

New V2 regression: 29 PASS. Existing Phase 2H suites: 258 PASS (287 total), run
serially. External typecheck/lint/frozen/replay results are recorded separately
in the new workspace verification-results.json, not fabricated by the generator.
Accepted 2H.2E/2H.2F fingerprints remain unchanged. DRAFT V2 fingerprint:
`6633405d49aa0e211265d38be37b074e99cd783d787681d4a25909843a7fe071`.

AI QA verifies exact corrected meanings/grammar against preserved definitions,
examples and POS; the accepted F replay recomputes full pinned corpus similarity.
This is not independent human acceptance or exhaustive web originality evidence.
Original source PSV/JSON/frozen review artifacts and human decision pipeline/ledger
are untouched. No human content/identity approvals, rights clearance or canonical
IDs are added; rights remain UNKNOWN_REVIEW_REQUIRED. Hybrid 2.2.1 APPROVED 87/100,
legacy 2018/history75/exclusions and reference evidence remain protected offline.
Database access/writes NONE/NONE; Production UNTOUCHED; no media/migration/release.

Publish only the scoped offline draft package to origin/TXH. Preserve all seven
stashes, eleven existing worktrees and backups; no new branch/worktree. Stop after
this phase. Next recommendation: scale the improved editorial pipeline to the
remaining 5,623 headword groups with risk-based QA and separate publication gates.
Do not start another approval cycle, canonical materialization or Development apply.

Final external validation PASS: direct Node 22.23.2 `tsc -b`, ESLint with zero
warnings, offline V2 replay at PYTHONHASHSEED=987 and frozen Hybrid release
validation. All 6,278 accepted byte pins unchanged. Canonical `pnpm typecheck`
was not run/not claimed PASS; the historical non-TTY limitation remains recorded.

### Phase 2H.2H — bulk 500 PARTIAL editorial checkpoint (2026-10-08)

Owner authorizes offline draft authoring and scoped Git publication. Baseline
`fb8b3c21207534442d13352dec97bf1852dc4792`; branch TXH, no new worktree. This
checkpoint is PARTIAL, not the requested completed 500-group corpus expansion.

Frozen selection: 500 distinct keys, no overlap with previous 520 groups, seed
`PHASE_2H2H_BULK_500_V1`. Alphabet allocation 80/80/85/85/85/85 is feasible.
Stable scarce-quota rotation and SHA256 ranking preserve source/POS/CEFR,
polysemy, conflict, Master and legacy evidence. Multiword quota is unmet with
zero eligible capacity in the remaining ledger; no fabricated lexical units.

Actual prose: 100 groups / 147 Senses across 20 persisted five-group batches,
32 multiple-Sense groups. EN definitions/examples and VI meanings/translations:
147 each. Authored source coverage: Oxford-only 25 / 4600-only 15 / both 60.
Remaining selected groups: 400 PENDING_AUTHORING, zero genuine evidence blockers.
The context/execution budget checkpoint does not count pending as authored.
Corpus totals: 620 groups / 960 effective drafts / 5,523 still undrafted.

All new records remain DRAFT, noncanonical, identity unresolved, rights
UNKNOWN_REVIEW_REQUIRED. Explicit AI author self-review checks 14 dimensions
(the inherited 13 grouped dimensions plus lexical identity) and binds the exact
effective content hash. 131 AI PASS / 16 REVIEW / 0 FAIL. Source similarity and
construction signals remain review findings, not false proof of error or rights
clearance. Near-duplicate scan against prior/new drafts finds no long-field
token-set overlap >=0.85. Human approvals and canonical IDs remain zero.

An unnatural legislative example context was found during second-pass review.
Two coupled EN/VI example fields now use students in their civics lesson rather
than a committee. Exact original parent, before/after field hashes, full batch
018 re-review and effective review hashes are preserved in an additive overlay;
the original PSV and original review receipt are unchanged.

The compact effective index keeps QA1 -> 2H2C -> 2H2D -> 2H2E preview -> 2H2G
DRAFT V2 lookup hierarchy, then adds the new drafts. All 813 prior effective
hashes, the three DRAFT V2 revisions and earlier input fingerprints/bytes remain
unchanged. 6,440 accepted scripts/dataset files are byte-pinned. Hybrid 2.2.1
87 Lexemes / 100 Senses, legacy 2018/history75/exclusions/mappings remain
protected offline; no live verification, Neon access or database writes.
Production UNTOUCHED. No branch/worktree/stash manipulation.

Selection fingerprint:
`ed303558ab029cdf24f49ca9226b2910bd4beb79d41b6d1d27edb5f4dfc52076`.
Editorial checkpoint fingerprint:
`e265662b54119ec242aabcf5935770161c87133ad07d9a03dc2132744670509d`.
Accepted 2H.2G remains:
`6633405d49aa0e211265d38be37b074e99cd783d787681d4a25909843a7fe071`.

Replay: `python -B scripts/phase-2h2h-bulk-500.py --check`; reads persisted prose
without regeneration or writes. External tests/typecheck/lint/frozen checks are
recorded independently in the new workspace verification-results.json. Direct
typecheck uses Node 22.23.2 `tsc -b`; canonical pnpm typecheck is not claimed PASS
and its historical non-TTY limitation remains documented.

Next: continue the 400 pending keys in the unchanged cohort using additive
checkpoint versioning and bounded authoring/review batches. Do not reselect,
start a manual approval cycle, allocate canonical IDs or apply to Development.

Final external verification: 48 new focused tests plus 287 prior Phase 2H
regressions PASS (335 total; zero failed/skipped). Direct tsc -b, ESLint,
frozen Hybrid release and hash-seed 271828 offline replay PASS. Replay changed
or created zero workspace/report files. All 6,440 accepted byte pins remain
unchanged; seven stashes and eleven existing worktrees are preserved.


## 2026-10-08 — Phase 2H.2H-R1 frozen bulk-500 continuation

Resume the exact first 100 pending keys from the accepted original checkpoint,
without selection or ranking. Persist 20 batches (021–040), each five groups,
with original bilingual prose, batch receipts and content-bound AI self-review.
New output: 100 groups / 148 Sense drafts, including 40 multi-Sense groups.
Cumulative cohort: 200 authored / 300 pending; full corpus: 720 authored groups,
5,423 remaining groups and 1,108 effective Sense drafts (960 prior + 148 new).

AI QA: 121 PASS / 27 REVIEW / 0 FAIL. Four additive field corrections improve
rupture grammar, September capitalization and both liquid definitions; original
manuscripts are retained. Gene, liquid, grapefruit, rugby and cold factual checks
are recorded with primary source links in authored/fact-verification.json.
Unresolved Sense identity, CEFR evidence and rights remain review obligations.
AI author self-review does not constitute independent human review or approval.

All 6,520 accepted byte pins are preserved, including the original 100 groups /
147 Senses, prior 813 effective drafts, 2H.2G DRAFT V2 revisions and Hybrid 2.2.1.
Original selection fingerprint:
`ed303558ab029cdf24f49ca9226b2910bd4beb79d41b6d1d27edb5f4dfc52076`.
Original editorial checkpoint fingerprint:
`e265662b54119ec242aabcf5935770161c87133ad07d9a03dc2132744670509d`.
New additive checkpoint fingerprint:
`d9a2fbaf95ae482131051e9bb755304c146f56437d22e311026d961d1f338363`.

Continuation artifacts live under master-editorial-bulk-500-resume/checkpoints/
checkpoint-02. The new report includes real bilingual previews and unresolved QA
findings. External commands/results are recorded separately in verification-results.json;
the generator does not claim to execute external tests, typecheck or lint.
Direct Node 22.23.2 tsc -b and ESLint passed. Canonical pnpm typecheck was not run;
the historical non-TTY wrapper limitation remains documented, without a PASS claim.

The additive tool validates the full parent chain, hashes and exact record inheritance.
Only a separately authorized next run may invoke --prepare --checkpoint 3, then
write batches 041–060 and substantive reviews before --seal-batch. Preparation
freezes keys only; sealing requires explicit assessments and never authors prose
or invents semantic PASS. No checkpoint-03 files have been created in this run.

Owner approvals: 0; canonical IDs: 0; rights UNKNOWN_REVIEW_REQUIRED.
No database access/writes, Neon operations, Master publication, legacy changes,
runtime/UI changes or Production operations. Hybrid 2.2.1 stays frozen at 87/100.

Final verification: 35 new focused + 335 prior tests PASS (370 total, zero failed/skipped).
Original and cumulative replay PASS with hash seed 314159; 153 workspace/report files
unchanged before/after each replay. Direct typecheck, lint and frozen Hybrid PASS.
All 6,520 accepted byte pins, seven stashes and the eleven initial worktrees preserved.
A concurrent VocabFlow-us55 worktree was observed and left untouched; this run creates none.


## 2026-10-09 — Phase 2H.2H-R2 checkpoint 03

Continue the accepted frozen bulk-500 cohort from checkpoint 02 without
reselection: exact next 100 pending keys, batches 041–060, five groups per batch.
The first five are intense, privilege, submit, workout and creative. Persist
original bilingual manuscripts, substantive review notes, explicit AI decisions,
CLI-sealed receipts and content-bound 14-dimension effective reviews.

Actual new output: 100 groups / 140 Sense drafts, including 32 multi-Sense groups.
Cumulative: 300/500 cohort groups authored, 200 pending; 820 corpus groups authored,
5,323 undrafted; 1,248 effective Senses (1,108 exact parent records + 140 new).
Source groups: 30 Oxford-only, 13 4600-only, 57 shared. CEFR remains source evidence,
not a reviewed Sense classification. AI QA: 83 PASS / 57 REVIEW / 0 FAIL, comprising
47 explicitly retained author REVIEW assessments plus 10 generated signals.

Apply 14 exact-parent field overlays and re-review all Senses in eight affected
batches. Corrections address foster translation, October display capitalization,
deforestation scope, wreck/cultivate/electronics grammar, orchestra tuning,
aisle example location, early wording, craft translation and competence fidelity.
Original manuscripts and review notes are retained; revised content hashes,
BEFORE/AFTER field hashes and correction references are bound to effective review.
Primary fact/lexical verification is recorded separately from content ownership
and rights clearance in authored/fact-verification.json.

Checkpoint-02's 27 REVIEW objects and all 148 assessments remain exact in the
additive qa-history.json, separately from checkpoint-03 findings. Earlier QA and
DRAFT V2 corrections remain accessible via pinned evidence paths. None of the
prior 1,108 content or metadata records is modified or newly approved. Original
checkpoint, checkpoint 02, the frozen cohort, human approval ledgers and Hybrid
2.2.1 remain unchanged.

Frozen selection fingerprint:
`ed303558ab029cdf24f49ca9226b2910bd4beb79d41b6d1d27edb5f4dfc52076`.
Parent checkpoint 02:
`d9a2fbaf95ae482131051e9bb755304c146f56437d22e311026d961d1f338363`.
Core checkpoint 03:
`7f29d6e83de770a5b2825fe9a1bf30dc164736fa2744b993e501a08cf8593b2c`.
Additive QA handoff fingerprint:
`7d423683adaee9e587355c0722e0d1e745728e91f338c089086476eac591bb02`.

The accepted continuation script is unchanged. A prior regression test now
asserts zero file writes by comparing actual before/after hashes, rather than
assuming the subsequently authorized checkpoint-03 directory must be absent.
This is the only prior tooling-source exception; all 6,597 other script/dataset
byte pins remain unchanged. The additive handoff verifies exact old/new QA
separation and pins the source exception with before/after hashes.

Reports and artifacts are versioned within master-editorial-bulk-500-resume/
checkpoints/checkpoint-03. report.md contains actual bilingual previews;
editorial-handoff.md contains unresolved findings, fingerprints, fact links and
the full ordered 200-key pending list. External command evidence is recorded
separately in verification-results.json; generators do not execute external checks.
Direct Node 22.23.2 tsc -b and ESLint passed. Canonical pnpm typecheck was not run;
the historical non-TTY wrapper limitation remains documented without a PASS claim.

No owner approvals, canonical UUIDs, source media, runtime/API/UI changes,
Master publication, legacy operations, Neon access, database writes or Production
operations. All new content stays DRAFT, rights UNKNOWN_REVIEW_REQUIRED.
Hybrid 2.2.1 remains frozen at 87 Lexemes / 100 Senses. Existing stashes and
worktrees, including VocabFlow-us55, remain untouched.

After separate authorization, --prepare --checkpoint 4 freezes the next 100
pending keys; write/review/seal batches 061–080, then assemble/check checkpoint 04.
This run does not prepare or author checkpoint 04 and starts no new selection.

Final verification: 33 new R2 tests + 370 previous Dataset tests PASS (403 total,
zero failed/skipped). Original, checkpoint-02, checkpoint-03 and QA-handoff replay
PASS with hash seed 20261009; each compared 6,698 script/dataset files before/after
and wrote none. Direct typecheck, lint and frozen Hybrid checks PASS. All 6,597
parent byte pins and seven stashes preserved. All twelve worktree paths retained;
VocabFlow-us55 advanced concurrently to 3213aaa3c0bce8a53b2bbaeb2228193c14c673a3
and was not modified by this run. No branch/worktree or checkpoint-04 was created.

Publication source-hash closure: normalize one trailing CRLF in the modified
regression source to its Git-index LF bytes. Re-run 33 R2 + 35 continuation tests
PASS and the final QA-handoff replay PASS, comparing 6,699 files with zero writes.
Core checkpoint 03 and all semantic content remain unchanged; only the additive
handoff fingerprint changes with the corrected source pin. Full Dataset total
remains 403 passing tests; typecheck/lint/frozen checks remain applicable.


## Phase 2H.2H-R3 — frozen bulk-500 checkpoint 04 (2026-10-09)

Author exactly the next 100 checkpoint-03 pending groups, batches 061–080,
without reselection. New content: 142 bilingual Sense drafts, 27 multi-Sense
groups; cumulative cohort 400/500, pending 100, corpus 920 groups / 1,390
effective Senses, remaining corpus 5,223 groups. AI self-review is 112 PASS /
30 REVIEW / zero FAIL, with no human approval inferred.

Preserve all prior 1,248 exact records and every earlier QA assessment, including
original 16, checkpoint-02 27 and checkpoint-03 57 REVIEW objects. New QA history
records reason categories separately: FORM 1, GRAMMAR 3, LEXICAL_IDENTITY 3,
POLARITY_CONTEXT_SIGNAL 5, POS_CLASSIFICATION 7, SEMANTICS 1, SENSE_BOUNDARY 2,
SOURCE_SIMILARITY 1 and TRANSLATION 7. These are nonexclusive counts retaining
historical corrected findings, not independent statistical quality estimates.

Apply 12 exact-parent field overlays and re-review all Senses in nine affected
batches. Preserve manuscripts and initial notes. Corrections improve Vietnamese
rope/equality/carriage phrasing, everyday unemployed scope, Bible display,
learner grammar for war/freight/rust, stricken register and countable youth.
Accessible lexical evidence supersedes the initial youth gender-neutral
recommendation: countable youth is a boy/young man, unlike collective youth.
No unavailable full dictionary page is claimed as read; actual search-returned
lexical evidence and failed 403 opens are recorded in fact-verification.json.

Frozen selection: ed303558ab029cdf24f49ca9226b2910bd4beb79d41b6d1d27edb5f4dfc52076.
Parent checkpoint 03: 7f29d6e83de770a5b2825fe9a1bf30dc164736fa2744b993e501a08cf8593b2c.
Checkpoint 04: 94166e0c8a0586317a82047c717895ae25968b522fa2a37ca342b1f5da9f7560.
QA handoff: e2d794086c6214cca16b1182f8aa73d14c56af4b9fb6d1e057efa0c3daa30d18.

Artifacts and concrete bilingual handoff are additive under
vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-04.
Generic continuation and checkpoint-03 handoff remain unchanged. The sole prior
source exception removes a stale checkpoint-04 absence assertion from a test;
its actual before/after file-hash comparison still verifies zero writes.
All 6,696 remaining prior script/Dataset byte pins are preserved.

All new records remain DRAFT / UNKNOWN_REVIEW_REQUIRED. No owner approvals,
canonical IDs, runtime mappings, Master release changes, legacy modifications,
database access/writes or Production operations. Hybrid 2.2.1 remains frozen at
87 Lexemes / 100 Senses. Existing seven stashes and twelve worktree paths,
including VocabFlow-us55, are preserved. External command results are reported
separately in verification-results.json after actual execution; deterministic
assembly does not run tests, typecheck or lint. Canonical pnpm wrapper NOT_RUN.

After separate Phase 2H.2H-R4 authorization, --prepare --checkpoint 5 freezes
the final 100 keys; then author/review/seal batches 081–100. No checkpoint 05
is prepared or authored in this run.


Executed R3 validation: 403 previous + 28 new Dataset tests PASS (431 total,
zero failed/skipped). Original, checkpoint-02, checkpoint-03, checkpoint-03
handoff, checkpoint-04 and checkpoint-04 QA-history replay PASS with hash seed
20261010 and before/after byte comparisons proving zero writes. Direct Node
22.23.2 typecheck and ESLint PASS; frozen Hybrid check is a zero-write NOOP.
Canonical pnpm wrapper NOT_RUN. All 6,696 prior byte pins, seven stashes and
twelve worktree paths preserved. Final evidence: checkpoint-04/verification-results.json.


## Phase 2H.2H-R4 — terminal frozen bulk-500 checkpoint 05 (2026-10-09)

Complete exactly checkpoint-04's final 100 pending groups in frozen order,
batches 081–100; no reselection or reranking. New content: 173 bilingual DRAFT
Senses, 47 multi-Sense groups. Cohort 500/500, pending zero; corpus 1,020 groups
and 1,563 effective Senses, with 5,123 corpus groups not yet authored. All previous
1,390 records remain exact. Checkpoints 01–04, all earlier manuscripts,
corrections and QA history remain byte-identical.

Content-bound 14-dimension AI author self-review: 116 PASS / 57 REVIEW / 0 FAIL.
Generated flags remain REVIEW: seven source-similarity, nine polarity-context
and one near-duplicate signal (nonexclusive). These are review signals, not
proof of copying, semantic identity or a translation defect. Three exact-parent
field overlays retain originals: singular all-degree example and Vietnamese;
avoirdupois-pound grammar qualification. All Senses in batches 082 and 099
were rereviewed; no human approval or cleared-rights claim is manufactured.

Final integrity handoff covers all 500 groups / 750 cohort Sense drafts,
with cumulative QA 563 PASS / 187 REVIEW / 0 FAIL. All 187 unresolved REVIEW
records are included verbatim with their original checkpoint and source hash.
Sense Coverage warnings affect 126 groups; source ordinals, POS conflicts and
absent structured boundaries do not prove exhaustive lexical coverage. Explicit
new gaps remain for fiery literal burning and harness horse-equipment use.
Source-only POS conflicts for fond, guilty, forward, including, thus/therefore
and million are retained rather than made into unsupported Senses.

Frozen selection: ed303558ab029cdf24f49ca9226b2910bd4beb79d41b6d1d27edb5f4dfc52076.
Remote parent: 24b1774c60d5fb3bfe5eadf0eada9f3d5dc77660.
Checkpoint 04: 94166e0c8a0586317a82047c717895ae25968b522fa2a37ca342b1f5da9f7560.
Checkpoint 05: 2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44.
Final handoff: 1360ce278597e16cdb33192bae4454d2a5a799d8055eff8521c829fc7f5a3c07.

Executed validation: 431 previous + 32 new Dataset tests PASS (463 total,
zero failed/skipped). All eight accepted/core/handoff replays PASS with hash
seed 20261011 and actual before/after byte comparisons proving zero writes.
Original and checkpoint-02–04 replays also passed before authoring. Direct
Node 22.23.2 TypeScript build typecheck and ESLint PASS. Canonical pnpm wrapper
NOT_RUN; no claim that its previously documented limitation is fixed.
Frozen Hybrid 2.2.1 check PASS / zero-write NOOP, still 87 Lexemes / 100 Senses.

Preserve 6,795 prior script/Dataset byte pins. Sole source exception: replace
obsolete checkpoint-05 absence assertion in checkpoint-04 regression test with
actual read-only parent before/after hashes. No checkpoint artifacts or generic
resume/handoff source change. Seven stashes, twelve worktree paths, prior backups
and VocabFlow-us55 preserved; existing TXH only. No database access/writes,
Production, Master release, legacy or runtime changes. All new content remains
DRAFT / UNKNOWN_REVIEW_REQUIRED; approvals and canonical IDs added zero.

Final artifacts: vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/
checkpoints/checkpoint-05/final-cohort-handoff.md, cohort-integrity.json,
cumulative-qa-history.json and verification-results.json. The generic unchanged
report contains inapplicable checkpoint-06 continuation boilerplate; checkpoint
05 has nextCheckpointNumber=null, and the CLI rejects 6. This terminal handoff
is authoritative. Stop after scoped commit/push. Proposed next phase only:
2H.2I — Aggregate QA and Sense Coverage Audit; not authorized or started here.


## Phase 2H.2I — aggregate linguistic QA: PARTIAL checkpoint (2026-10-09)

Owner-authorized offline aggregate audit and scoped Git publication. This run
uses the partial execution policy; it does not close the full 750-Sense audit.
Index all 1,563 effective DRAFT Senses / 1,020 authored groups against checkpoint
05. Content inspected: 107 cohort Senses / 91 groups, plus 20 prior Senses using
the latest corrected projection. All original 187 REVIEW records are preserved;
25 triaged with content-bound Vietnamese reasoning, 162 remain PENDING.
Coverage inventory accounts for all 500 groups / 126 warnings; 17 groups assessed,
483 PENDING, including 109 warning groups. Source ordinal absence is metadata
uncertainty, not a confirmed gap or proof of complete lexical coverage.

Findings: 20 minor learner-content hygiene defects (implementation commentary
in grammar), not confirmed mistranslations or syntax defects. 20 exact-parent
BEFORE/AFTER field proposals; 5 additional boundary proposals for hail noun,
harness horse-equipment verb, fiery literal, instrumental noun, and to purpose
infinitive marker. To requires taxonomy review; no canonical POS enum changed.
11 source POS conflicts retained as metadata conflicts, unlike remains POSSIBLE.
No correction applied; no Sense key or canonical ID allocated. Existing
September capitalization overlay and 2H.2G successfully correction preserved.

Purposive calibration: 60 cohort PASS Senses across 5 checkpoints, A1–C2, 10 POS
and 3 source memberships; 2 minor hygiene findings. Prior sample 20: 16 hygiene
findings. Samples are not a prevalence estimate or independent human review.
Source-similarity flags promote REVIEW, so no flagged final PASS stratum exists;
actual signals are examined in triage, not fabricated into the PASS sample.
Repeated process commentary triggers expanded original-batch inspection, still
PENDING. Queue P0/P1/P2/P3: 0/5/15/38; rights remain separately gated. Each item
has identity, severity, evidence, proposed action, overlay feasibility and
unresolved dependencies. One compact taxonomy shortlist; no approval cycle.

Index separates AI author notes, raw deterministic QA flags, exact historical
QA/correction references, effective revision hashes and field provenance.
Original author notes do not imply current content approval. All 6,896 prior
script/Dataset files, checkpoint 01–05 snapshots, all 1,563 effective records,
previous corrections and QA history remain byte-identical. Hybrid-100 v2.2.1
remains 87 Lexemes / 100 Senses. No Master release, legacy or runtime changes.

Remote parent: a8015440d41ca4c33c43dbc723fd400e4fc6e8f0.
Input checkpoint 05: 2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44.
Aggregate QA fingerprint: 3d29083983cf033b4463d33c7a8ea3bd9337c209e0a5f236167c116a0852b5ce.

Actual final checks: 463 previous Dataset regressions + 31 focused tests PASS
(494 total, zero failed/skipped). Eight accepted checkpoint/core/handoff replays
PASS with before/after byte comparisons; latest aggregate replay PASS zero-write
under two different hash seeds. Direct Node 22.23.2 TypeScript typecheck and
ESLint PASS. Canonical pnpm wrapper NOT_RUN; its prior documented limitation is
not claimed fixed. Frozen release check PASS, NOOP / zero writes. Earlier invalid
measurement interval and corrected counting-helper test failure are disclosed
in verification-results.json; old documentation is not used as new PASS evidence.

Seven stashes and twelve worktrees preserved, including other worktree HEADs
and VocabFlow-us55. Existing TXH only; no reset, stash, clean, force push or
backup deletion. DRAFT / UNKNOWN_REVIEW_REQUIRED. Owner approvals, rights
clearances, canonical IDs and corrections applied: 0. No database access/writes
or Production operations.

Handoff: vocabflow-dataset/reports/master-editorial-aggregate-qa.md and
vocabflow-dataset/workspaces/master-editorial-aggregate-qa/. Complete 162 pending
REVIEW decisions, 483 coverage assessments and expanded batch inspection before
full audit closure; then separately authorize targeted DRAFT remediation for
confirmed issues, followed later by expansion of remaining 5,123 groups.
STOP after verified PARTIAL publication; no new selection, formal approval
cycle, automatic correction application or database import.


## 2026-10-09 — Phase 2H.2I-R1 additive aggregate-QA checkpoint 02

Bounded continuation targets completed; full aggregate audit remains PARTIAL.
Read and persist the next 40 original REVIEW records (ordinals 25–64):
25 previous + 40 new = 65 triaged, 122 pending of 187. Preserve historical
REVIEW separately from AI triage; no human approval or automatic PASS promotion.
Read all drafts and source evidence for the next 75 deterministically prioritized
coverage groups: 17 previous + 75 new = 92 assessed, 408 pending of 500.
All 126 warning identities preserved; 34 flagged groups remain pending.

New coverage: 2 confirmed gaps (condensed liquid adjective; elastic material noun),
1 possible gap (inferior capacity versus rank), 2 source metadata conflicts,
2 coverage-unknown and 68 with no identified source-supported gap. These findings
do not establish exhaustive lexical coverage, source ordinals, CEFR or rights.

Scan all 1,563 notes: 107 unique candidates under original and supplementary
patterns. Actually inspect 38 Senses across five entire original authored batches:
10 confirmed minor process-commentary defects, 28 valid learner notes. Preserve
parent calibration evidence; 23 candidates had prior dedicated inspection, 9 have
new dedicated inspection, and 75 await dedicated classification. The purposive
sample provides no statistical prevalence claim. Persist 10 actionable field
proposals and 2 original bilingual boundary proposals; apply none. Keep source
originality uncertainty for foster/mission separate from copyright clearance.

Accepted parent fingerprint: 3d29083983cf033b4463d33c7a8ea3bd9337c209e0a5f236167c116a0852b5ce.
Remote parent: 3ad14d262e56dd09883ec67a51e7b1a407ecea0e.
New checkpoint fingerprint: 7d462d7bfb2f957c4c1809de18a22a126b8f85194763f90d863551edb15be34d.
All 6,921 accepted script/Dataset files, all 1,563 Senses, previous 25 triage and
17 coverage decisions, 20 field proposals, 5 boundary proposals and historical
corrections remain byte-identical. Parent workspace is never regenerated.

Actual checks: 494 previous regressions + 25 new focused tests = 519 PASS,
zero failures/skips. Eight original checkpoint/core/handoff replays plus parent
aggregate replay PASS with before/after byte comparison. Final checkpoint replay
PASS with zero writes under two different hash seeds. Direct Node 22.23.2 tsc -b,
ESLint and frozen Hybrid release check PASS. Canonical pnpm wrapper NOT_RUN;
the prior wrapper limitation is not claimed fixed. External command receipts
are separate from generator checks in verification-results.json.

Seven stashes and twelve worktrees preserved; VocabFlow-us55 unchanged. Existing
local TXH only. DRAFT / UNKNOWN_REVIEW_REQUIRED; corrections applied, owner
approvals, rights clearances and canonical IDs: 0. No database access/writes,
Production operation, Master release, legacy change or new authoring cohort.
Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses.

Handoff: vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-02/report.md.
Continue the remaining 122 REVIEW / 408 coverage assessments and bounded grammar
inspection only in a separately authorized additive checkpoint. STOP after
scoped publication; no correction application, formal approval or import.

## 2026-10-09 — Phase 2H.2I-R2 checkpoint 03: bounded aggregate audit continuation

Existing TXH continues from remote parent 29a84a268606a4a816c45008e4605da55db803b4.
Additive checkpoint 03 completes the authorized 40 next REVIEW records, 75 next
coverage groups and 26 previously uninspected dedicated grammar candidates.
Full aggregate scope remains PARTIAL: REVIEW 65 + 40 = 105/187, 82 pending;
coverage 92 + 75 = 167/500, 333 pending; grammar 32 + 26 = 58/107, 49 pending.
All 34 remaining original warning groups were assessed; all 126 historical
warning identities remain available. No exhaustive lexical completeness claim.

Read all 126 Senses in four entire original pilot batches: 62 confirmed grammar
process-commentary findings (10 previously proposed), 62 valid learner notes and
2 possible disclaimer notes. The sample is purposive; no prevalence estimate.
Persist 52 new exact, unapplied grammarNotesEn field proposals. Prior 30 field
and 7 boundary proposals retain exact versioned references: cumulative 82 field
and 7 boundary proposals, 0 applied. Candidate inventory remains 107; full-batch
findings outside keyword matches do not silently rewrite that inventory.

Coverage: 69 no identified source-supported gap, 4 possible gaps (sideways,
lump, mist, laundry), 2 source metadata conflicts (stricken, last), 0 confirmed
new gaps and 0 new boundary proposals. Source surface/air scope, clean/dirty
laundry scope, and previous-period POS are unresolved evidence questions;
they do not allocate canonical identities. REVIEW originality uncertainty for
inequality/severe remains separate from linguistic correctness and rights.

Original aggregate fingerprint:
3d29083983cf033b4463d33c7a8ea3bd9337c209e0a5f236167c116a0852b5ce.
Accepted checkpoint 02 fingerprint:
7d462d7bfb2f957c4c1809de18a22a126b8f85194763f90d863551edb15be34d.
New checkpoint 03 fingerprint: d5e87509822821b74b0588a5d99f2168a5db47c59299192d540ace84315b0b71.
All 6,939 accepted script/Dataset files and all 1,563 effective Sense DRAFTs /
1,020 corpus groups remain byte-identical. Frozen cohort: 500 groups / 750 Senses.
Parent generators/scripts, calibration, original checkpoints, QA history and
earlier corrections remain unchanged. No original generator write mode used.

Actual validation: 519 inherited + 31 focused tests = 550 PASS, no failures or
skips. Eight authoring core/handoff replays, original aggregate, checkpoint 02,
and checkpoint 03 PASS with before/after byte comparisons. Checkpoint 03 also
PASS under a second explicit hash seed, zero writes. Direct Node 22.23.2 tsc -b,
ESLint --max-warnings=0 and frozen Hybrid release --check PASS. Canonical pnpm
NOT_RUN; previous wrapper limitation is not claimed repaired. Actual command
receipts are stored separately in checkpoint-03/verification-results.json.

Seven stashes and twelve worktrees preserved, including VocabFlow-us55; no new
branch/worktree. Content remains DRAFT / UNKNOWN_REVIEW_REQUIRED. New owner
approvals, rights clearances, canonical IDs and applied corrections: 0. No Neon
access/write, Production operation, Master release, legacy/runtime/schema
change or new authoring cohort. Hybrid-100 v2.2.1: 87 Lexemes / 100 Senses.

Handoff: vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-03/report.md.
Remaining identities are explicit in the cumulative inventories and report.
Resume only with separate owner authorization using the additive inspection
protocol. STOP after scoped commit/push; no checkpoint 04, correction application,
formal approval, new cohort, canonical release or database import.

## Phase 2H.2I-R3 — aggregate QA checkpoint 04

This additive checkpoint supersedes the prior checkpoint-03 handoff's “no checkpoint 04” stop: that stop applied to the earlier run, and the owner later authorized this bounded R3 continuation. R3 completed its selected targets; the aggregate audit remains PARTIAL and stops here.

Checkpoint 04 fingerprint: `524b064666d9538cb9774bd50f4a2bd63e82505e8f2a82232a4b59f4baf6724b`; parent checkpoint 03: `d5e87509822821b74b0588a5d99f2168a5db47c59299192d540ace84315b0b71`.

The new 40 review records were triaged, bringing the cumulative inventory to 145/187 with 42 pending. The next 75 coverage groups were assessed, bringing coverage to 242/500 with 258 pending; all 126 original warning groups remain present and coverage is explicitly non-exhaustive. No new source-supported coverage gap was confirmed. Full-manuscript inspection covered 126 Senses across 13 complete batches and evaluated 25 additional grammar candidates: cumulative classification is 38 confirmed process-commentary, 3 possible, and 85 valid learner grammar notes; 24 of 107 dedicated candidates remain pending. Four confirmed items already had a prior proposal; 34 new grammar-note proposals and one Vietnamese example proposal were added, for 35 new unapplied field proposals. Cumulative proposals are 117 field and 7 boundary; applied corrections remain zero. No historical REVIEW was relabeled PASS, and no owner decision, rights clearance, or canonical ID was inferred.

The authoring lesson is to keep provenance, taxonomy, identity, approvals, and proposal workflow out of learner-facing grammar notes; verify grammar against definitions, POS, and examples; review paired EN/VI fields; inspect Sense boundaries before expansion; and treat similarity only as a review signal, not proof of copying or rights clearance. The lesson is a recommendation for separately authorized future cohorts and does not change the workflow.

Validation evidence: 550 inherited regression tests and 37 focused R3 tests PASS. Eleven parent/authoring replays, a second-seed checkpoint-03 replay, and checkpoint-04 `--check` replays with hash seeds `20261011` and `20261012` PASS with zero writes. Direct TypeScript build, ESLint with zero warnings, and frozen Hybrid release check PASS; canonical `pnpm` wrapper was NOT_RUN. Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses. Seven stashes and twelve worktrees were preserved, including VocabFlow-us55; no new branch or worktree was created. Existing 1,020 groups and 1,563 effective Sense drafts remain preserved.

All content remains DRAFT and rights remain `UNKNOWN_REVIEW_REQUIRED`. No approval, rights clearance, canonical ID, or correction application was added. No database/Neon access or write, Production operation, Master release, legacy mutation, or new authoring cohort occurred. The prior checkpoint-03 stop wording above describes that earlier run only; R3 ends after its scoped checkpoint-04 publication. Handoff: `vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-04/report.md`. Do not start checkpoint 05, correction application, formal approval, a new cohort, or import.

## Phase 2H.2I-R4 — aggregate QA checkpoint 05 (2026-10-09)

Checkpoint 05 adds an offline, content-bound continuation on parent checkpoint 04 `524b064666d9538cb9774bd50f4a2bd63e82505e8f2a82232a4b59f4baf6724b`. Its fingerprint is `4a3a5d0f48a07dcdd7e5e2f1d7ca2aa2af58709bae174a02f77d84814bbd078f`.

- REVIEW triage is complete for the original 187 records (145 previous + 42 newly triaged); historical REVIEW outcomes remain immutable, and formal approval/rights review remain separate.
- Sense coverage is 317/500 (242 previous + 75 assessed), with 183 pending. `NORMALIZED_HEADWORD:any` remains `COVERAGE_UNKNOWN`; no exhaustive coverage is claimed.
- The original dedicated grammar inventory is closed at 107/107. This checkpoint inspected 197 Sense entries in 24 complete source batches: 25 contain confirmed process commentary and 172 notes were retained as learner grammar. It records 23 new exact, unapplied grammar-field proposals; two matching prior proposals were referenced without duplication.
- Dataset totals remain 1,020 authored groups and 1,563 effective DRAFT Senses. The frozen bulk-500 checkpoint remains 500/500 at fingerprint `2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44`. Hybrid-100 v2.2.1 remains unchanged at 87 Lexemes / 100 Senses.
- Focused and accepted audit regression suites passed (165 tests total), and the current v2.2.1 frozen runtime-patch release tests passed (8/8); direct TypeScript typecheck and ESLint passed. A separate legacy Phase 2F.7 v2.2.0 test passed 4/5 and failed its frozen release-tree assertion; no release files changed, and v2.2.1 was verified separately. Four accepted parent replays and two checkpoint-05 hash-seed replays passed zero-write verification.
- Corrections applied: 0; owner approvals and canonical IDs: 0; database access/writes: none; Production: untouched. Rights remain `UNKNOWN_REVIEW_REQUIRED`.

The aggregate audit remains PARTIAL because 183 coverage groups are pending. See `vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-05/report.md` and `verification-results.json` for bounded findings and executed-command receipts. No later checkpoint or correction application is authorized by this entry.

## Phase 2H.2I-R5 — aggregate QA checkpoint 06 (2026-10-09)

Checkpoint 06 continues from parent checkpoint 05 `4a3a5d0f48a07dcdd7e5e2f1d7ca2aa2af58709bae174a02f77d84814bbd078f` and the verified `TXH` baseline `7072cf62c310ab9c724745502d446111c14b9943`. It assessed exactly the next 100 pending headword groups in original inventory order, inspecting and hashing all 153 effective DRAFT Senses in those groups.

- New coverage assessments: 95 `NO_IDENTIFIED_SOURCE_SUPPORTED_GAP`, 2 `POSSIBLE_GAP`, 2 `SOURCE_METADATA_CONFLICT`, and 1 `CONFIRMED_GAP`. The confirmed adjective distinction for `high` is recorded only as one unapplied, noncanonical boundary proposal; no Sense was added to the effective projection.
- Coverage is now 417/500, with 83 pending. The original 126 warning identities, 187/187 REVIEW triage records, 107/107 grammar inspections, 140 field proposals, and seven parent boundary proposals remain preserved. Total boundary proposals: 8; corrections applied: 0. Corpus totals remain 1,020 groups and 1,563 effective Senses.
- The new checkpoint tests passed 16/16; checkpoint-05 regression tests passed 26/26; Hybrid-100 v2.2.1 tests passed 8/8. Direct TypeScript typecheck and ESLint passed. All accepted parent zero-write replays passed. The legacy v2.2.0 suite remains `LEGACY_V2_2_0_RELEASE_TREE_DIAGNOSTIC_UNRESOLVED` (4/5): raw Windows CRLF worktree bytes mismatch the recorded LF fingerprint, while LF-normalized tracked inputs reproduce it. No release or test files were changed.
- Content remains DRAFT with rights `UNKNOWN_REVIEW_REQUIRED`. No owner approvals, canonical IDs, corrections, database access/writes, Production operation, Master release change, or legacy change occurred.

The aggregate audit remains PARTIAL. See `vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-06/report.md` and `verification-results.json`. A separately authorized checkpoint 07 may assess the final 83 pending groups; no further checkpoint or remediation is started here.

## Phase 2H.2I-R6 — final aggregate Sense coverage checkpoint 07 (2026-10-09)

Checkpoint 07 continues from checkpoint 06 `5c80c010f6c83fee24614f07831a3016185471d8953e6a6aefa471e5f73e2766` on the verified `TXH` baseline `c4f45c5265f73780a51ecfb7aacea76b7f53b965`. It assesses all 83 remaining pending groups in the accepted inventory order. The checkpoint fingerprint is `9c90d8c2f2b964e128e19c5db807336d754573467f7f783a8a666e54a242ed77`; the final audit handoff fingerprint is `862be642a7223396f43664ca8604d986a5c1f5cbad91c9ab295492f819ff4ed8`.

- Aggregate AI audit inventories are COMPLETE: 500/500 unique groups assessed, 0 pending. Cumulative classes are 8 `CONFIRMED_GAP`, 8 `POSSIBLE_GAP`, 18 `SOURCE_METADATA_CONFLICT`, 5 `COVERAGE_UNKNOWN`, and 461 `NO_IDENTIFIED_SOURCE_SUPPORTED_GAP`. The 126 original warning identities remain preserved; these bounded findings do not establish exhaustive dictionary coverage.
- All 1,563 effective Sense drafts and previous 417 decisions remain preserved. REVIEW is 187/187 triaged; dedicated grammar candidates are 107/107 inspected. The eight earlier noncanonical boundary proposals remain; checkpoint 07 adds zero boundaries and one unapplied field correction proposal. Total field proposals: 141; corrections applied: 0.
- Focused aggregate/checkpoint Python regressions passed 190/190 across the seven suites. Accepted parent replays passed zero-write checks; checkpoint 07 replayed with identical fingerprints under two `PYTHONHASHSEED` values and `zeroWrites: true`. Direct TypeScript build/typecheck and ESLint passed. Hybrid-100 v2.2.1 passed 8/8; frozen v2.2.0 remains 4/5 with the unresolved `APPROVED_RELEASE_IMMUTABILITY_VIOLATION:release-tree` diagnostic, which is recorded rather than hidden.
- Content remains DRAFT; content approval is PENDING; rights remain `UNKNOWN_REVIEW_REQUIRED`; release eligibility is NO. Owner approvals, canonical IDs, rights clearance, and applied corrections are zero. Database access/writes: none; Production: untouched; Master release and legacy data: unchanged.

See `vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-07/report.md`, `final-audit-handoff.md`, and `verification-results.json` for the findings, remediation inventory, fingerprints, and executed validation evidence. The next recommendation is a separately authorized targeted DRAFT remediation, followed by controlled expansion of the remaining 5,123 corpus groups.


## Phase 2H.2J-R1 — targeted DRAFT remediation pilot 01 (2026-10-09)

The owner-authorized pilot verified the accepted Phase 2H.2I checkpoint 07 (`9c90d8c2f2b964e128e19c5db807336d754573467f7f783a8a666e54a242ed77`) and handoff (`862be642a7223396f43664ca8604d986a5c1f5cbad91c9ab295492f819ff4ed8`). The live TXH baseline matched `f0fb9bb7b5013b6c8240eed6bb2a111e572165b0`; the accepted audit retains its own earlier recorded baseline as pinned provenance.

Four unique proposals were selected. The mandatory `lot` example proposal was independently reviewed and deferred: “were collected” fixes the English finite verb but may add a human agent inconsistent with Vietnamese “lá tụ lại”. Three low-risk grammar-note proposals for `inflate`, `prescribe`, and `peel` were applied as additive revisions in a new offline DRAFT layer. No original manuscript, accepted audit proposal or prior checkpoint was changed.

The remediated projection retains 1,563 Senses across 1,020 authored groups; exactly three Sense content hashes changed and 1,560 remain unchanged. Original authored batches 068, 072 and 081 were fully re-reviewed: 24/24 Senses, 20 PASS / 4 REVIEW / 0 FAIL. The four existing REVIEW states remain REVIEW. All 141 field proposal references and eight noncanonical boundary proposals are preserved; both historical priority scopes remain distinct.

Pilot fingerprint: `7b7e93bd26bcbac1d18e02b52b929e382722223c67bbe7455bbf9caf1d3a4283`. The new focused suite passed 33/33; accepted Phase 2H.2G overlay tests passed 29/29; all accepted Phase 2H.2I parent replays passed zero-write checks. Direct TypeScript typecheck and ESLint passed. The frozen Hybrid-100 v2.2.0 test remains 4/5 with its known Windows `APPROVED_RELEASE_IMMUTABILITY_VIOLATION:release-tree` diagnostic; v2.2.1 independently passed 8/8 and remains 87 Lexemes / 100 Senses. The pilot replay passed zero-write checks under `PYTHONHASHSEED=1` and `8675309`.

Content remains DRAFT; rights remain `UNKNOWN_REVIEW_REQUIRED`; owner approvals and canonical IDs added: 0; release eligible: NO. Database access/writes: NONE; Production: UNTOUCHED; Master release and legacy data: unchanged. Handoff: `vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/pilot-01/`. Recommend a separately authorized DRAFT remediation batch after review of this pilot; do not infer owner approval, rights clearance, a new Sense boundary, or release readiness.

## Phase 2H.2J-R2 — targeted DRAFT remediation Batch 02 (2026-10-09)

Batch 02 continued from the accepted Pilot 01 fingerprint `7b7e93bd26bcbac1d18e02b52b929e382722223c67bbe7455bbf9caf1d3a4283` and Phase 2H.2I checkpoint 07. It selected five unapplied proposals across four authored batches. Three grammar-note edits were independently assessed as eligible and added to the downstream DRAFT layer; two proposals were deferred for insufficient evidence. The previously deferred `lot` proposal remains untouched.

All 29 Senses in the four affected source batches were re-reviewed: 25 PASS / 4 REVIEW / 0 FAIL. The four REVIEW states remain visible. The cumulative projection retains 1,563 Senses across 1,020 authored groups, all three Pilot 01 changes, all 141 historical field proposals and all eight boundary proposals. Batch 02 fingerprint: `b3d1335e717ab307d0f5b14dcc811c4e5217f94bd98f26898add9eea68dca84e`.

Batch 02 focused tests passed 16/16; Pilot 01 tests 33/33; Phase 2H.2G overlay tests 29/29; direct TypeScript typecheck and ESLint passed. The frozen Hybrid-100 v2.2.1 suite passed 8/8 (87 Lexemes / 100 Senses). The legacy v2.2.0 suite remains 4/5 with the known `APPROVED_RELEASE_IMMUTABILITY_VIOLATION:release-tree` Windows line-ending diagnostic. A separate bulk-500 regression run reported two UTF-8 decode errors in the unchanged checkpoint-02 resume-selection fixture; this is recorded as a regression-suite issue, not a pass. Batch 02's 17 artifacts rebuilt identically under `PYTHONHASHSEED=1` and `271828`, with zero writes. The canonical `pnpm typecheck` wrapper was not run.

Content remains DRAFT, rights `UNKNOWN_REVIEW_REQUIRED`, content approval PENDING, and release eligibility NO. No canonical IDs, owner approvals, database operations, Master release changes, legacy changes or Production operations occurred. See `vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-02/report.md` and `verification-results.json`. Recommend owner review of the batch and remaining queue before separately authorizing another remediation batch.

## Phase 2H.2J-R3 — targeted DRAFT remediation Batch 03 (2026-10-10)

Batch 03 continues from Batch 02 fingerprint
`b3d1335e717ab307d0f5b14dcc811c4e5217f94bd98f26898add9eea68dca84e`, Pilot 01
`7b7e93bd26bcbac1d18e02b52b929e382722223c67bbe7455bbf9caf1d3a4283`, and the
accepted aggregate audit/handoff. The Batch 03 fingerprint is
`1da5da50c648995491f16523ca0d3da3d8965c59e4d30dd8ebfab72ddd381eb1`.

- Gate A confirms the tracked bulk-500 receipt is valid UTF-8 and byte-identical
  to its parent, HEAD and index. The two historical test errors arise when a
  temporary fixture is written using Windows cp1258 default encoding and then
  read strictly as UTF-8; the fixture and decoder were not changed.
- Reconcile all 141 proposal IDs without loss or duplication. Select the 22
  unreviewed proposals in original batch 05, the highest-density batch (22 vs
  17 in batch 04). Apply 12 field-local corrections; defer nine and reject one.
  The full 37-Sense batch review is 19 PASS / 18 REVIEW / 0 FAIL. The billion
  grammar-note field passes independently while the full Sense remains REVIEW
  for its unresolved POS classification.
- The cumulative projection retains 1,563 Senses and 1,020 authored groups;
  exactly 12 new Sense hashes change, bringing cumulative corrections to 18.
  All six parent corrections, 141 historical proposals, eight boundary
  proposals, and the `lot`, `waste`, and `aggregate` deferrals remain preserved.
- Pilot 01, Batch 02 and aggregate checkpoint 07 parent replays passed their
  pinned fingerprints with zero writes. The focused R3 suite passed 28/28. Two
  Batch 03 replays with `PYTHONHASHSEED=20261010` and `271828` produced identical
  outputs and fingerprint with zero writes; final `--check` also passed.
  Hybrid-100 v2.2.1 is verified 8/8. The existing bulk-500 two-error decode
  regression and v2.2.0 release-tree diagnostic (4/5) remain explicitly
  preserved, not repaired in this checkpoint.

Content remains DRAFT, rights remain `UNKNOWN_REVIEW_REQUIRED`, and release
eligibility is NO. No owner approval, canonical ID, rights clearance, database
access/write, Production change, Master release edit, or legacy mutation
occurred. The two existing R3 `.pyc` files were preserved unchanged as the
owner-approved baseline exception. See
`vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-03/`.
### Phase 2H.2J-R4 — targeted DRAFT remediation Batch 04

- Continue from the accepted Batch 03 fingerprint
  `1da5da50c648995491f16523ca0d3da3d8965c59e4d30dd8ebfab72ddd381eb1`.
  Reconcile 141 proposals and select 29 candidates from two authored batches;
  apply 22 independently verified grammar-note corrections and defer seven.
- Re-review all 55 Senses in the affected authored batches (39 PASS / 16 REVIEW /
  0 FAIL). Keep the 1,563-Sense / 1,020-group projection, all 18 prior
  corrections, 141 historical proposals, eight boundary proposals, and all
  unresolved/deferred decisions intact. Batch 04 fingerprint:
  `bb669bee71f2dfc6c53b8b9ec3511caae9dc31b13be342044829d674a22ddb82`.
- Focused tests passed 11/11; accepted Pilot 01, Batch 02 and Batch 03 parent
  replays passed zero-write checks. Persisted Batch 04 replay passed under
  `PYTHONHASHSEED=20261010` and `271828` with identical fingerprint and zero
  writes. Typecheck and lint passed; preserved diagnostics remain documented in
  the detached verification receipt.
- The batch remains additive DRAFT work. Rights remain
  `UNKNOWN_REVIEW_REQUIRED`, release eligibility remains NO, and the known
  default-code-page bulk-500 decode errors and v2.2.0 release-tree diagnostic
  remain recorded. No database, Production, approval, canonical-ID, or release
  operation occurred. Preserve the two existing R3 `.pyc` baseline exceptions.

### Phase 2H.2J-R4P.3 — published Batch 04 integrity

- Add an independent read-only verifier and 26 focused mutation tests; keep all
  historical builders and checkpoints unchanged. Reconcile 1,031 references into
  488 unique pins: 486 exact matches and exactly two owner-authorized EOL
  representations. Retain distinct Git-content and accepted working hashes.
- Verify the accepted Batch 04 fingerprint, 16 artifact hashes, 11 source hashes,
  Git ancestry, all four persisted overlays and provenance, 1,563 Senses, 1,020
  authored groups, 40 corrections/40 revised Senses, 141 original field proposals
  and eight boundary proposals. Rights remain UNKNOWN_REVIEW_REQUIRED.
- Newly executed: focused tests 26/26; zero-write --check under seeds 20261010
  and 271828 with identical verification fingerprint
  bf902b322460203c3ac8d1c7bcc404154c22672977a7063272b6b711b00d00b8;
  SHA256/status snapshots of all tracked and untracked files unchanged by replay.
  Seven TypeScript projects passed tsc -p --noEmit --incremental false
  --composite false; pnpm lint passed (existing Node engine version warning).
- Original R4 --check was run and stopped at its obsolete prepublication HEAD
  assertion. Postpublication integrity passes with two explicit EOL equivalences;
  independent R4 builder regeneration is NOT_INDEPENDENTLY_REESTABLISHED.
  Historical diagnostics, not rerun here: bulk-500 UTF-8 35/35; Windows default
  two errors; Hybrid v2.2.0 4/5; Hybrid v2.2.1 8/8.
- Evidence: vocabflow-dataset/workspaces/master-editorial-draft-remediation/
  verifications/postpublish-r4p3/. No database, Production, release, approval,
  canonical-ID or Batch 05 operation. Preserve two cache files, seven stashes
  and twelve worktrees including VocabFlow-us55.

### Phase 2H.2K — high-throughput checkpoint 01

- Freeze complete 6,143-group inventory, exact 1,020-group authored exclusion and 5,123-group remaining inventory; select 500 new groups deterministically with source evidence and no overlap.
- Seal five original bilingual PSV manuscripts/review receipts: 100 groups / 103 Senses, 90 PASS / 13 REVIEW / 0 FAIL. Separate editorial second pass is by the same assistant, not another model or human approval. Append to the preserved parent to reach 1,120 groups / 1,666 DRAFT Senses.
- Preserve sealed bytes; resolve one cross-corpus Vietnamese example overlap by a hash-bound forward-only post-QA revision. Final screen covers all 9,677 source records with zero long overlaps / exact English example copies; four short evidence entries remain for rights review. No eligible multiword phrases remain in the source pool; report zero rather than fabricate coverage.
- Newly executed: focused tests 21/21, seven TypeScript projects, lint, two-seed deterministic zero-write replay and 488-pin R4P.3 verification. Evidence and limits: vocabflow-dataset/workspaces/master-editorial-high-throughput-500/reports/checkpoint-01-validation.md. Preserve two untracked cache files, seven stashes and twelve worktrees.
- Offline DRAFT only, rights UNKNOWN_REVIEW_REQUIRED, no approval/canonical IDs/database/Production/release. Stop after checkpoint 01 publication; checkpoint 02 and remediation Batch 05 require separate authorization.

### Phase 2H.2K-R1 — Reviewer B integration, recheck pending

- Import four owner-supplied review files byte-for-byte. Verify original report SHA256, exact 103-row TSV/JSON consistency and original local content hashes; retain 92 PASS / 11 REVIEW / 0 FAIL and cross-review matrix 82/8/10/3. Independence is declared by the supplied reviewer session, not authenticated by transport.
- Add a versioned R1 overlay for four field corrections (large, also, purse, rainforest), preserving sealed manuscripts, original checkpoint, cohort and neighbor revision. All four revised hashes await Reviewer B recheck; F01/F02 still gate publication. Retain all 13 Author A review concerns and all original Reviewer B judgments without rebinding them.
- Adjudicate six deferred coverage candidates: five strong candidates, chemist pharmacist needs more evidence; possible remains a boundary review, not a silently inserted Sense. Preserve sixty DRAFT NUMBER. No new Sense added: 1,563 previous + 103 new = 1,666 Senses / 1,120 groups; all 40 prior corrections preserved.
- Newly executed: R1 tests 14/14, authoring tests 21/21, seven-project typecheck, lint, two-seed deterministic zero-write R1 replay, original checkpoint replay and 488-pin R4P.3 verification PASS. Four short-match observations preserved; effective long overlaps/exact English copies zero.
- Report: vocabflow-dataset/workspaces/master-editorial-high-throughput-500/reports/checkpoint-01-r1-integration.md. Recheck request and full-context JSON are under checkpoints/checkpoint-01/revisions/reviewer-b-r1/assembled/. No commit/push pending independent recheck, no checkpoint 02, database, Production, approval, canonical IDs or release. Preserve two cache files, seven stashes and twelve worktrees.

### Phase 2H.2K-R1C - final independent review integration

- Import the owner-supplied R1B receipt byte-for-byte (SHA256 fd9ddfe5dce8839acd08304e69c198fddb426574d9c00459cc465035f3fee151). Verify four PASS verdicts against exact R1 changed fields and original/revised hashes; independence is a supplied session declaration, not cryptographic identity authentication.
- Add an immutable R1C review integration layer. Final Reviewer B counts: 96 PASS / 7 REVIEW / 0 FAIL; original A 90/13 and B 92/11 histories retained. Preserve seven remaining findings, six deferred candidates, sixty DRAFT NUMBER, 99 unaffected new records, 1,563 inherited Senses and all 40 historical corrections. Effective totals remain 100 new groups / 103 new Senses; 1,120 groups / 1,666 DRAFT Senses.
- Newly executed prepublication checks: 48 focused tests (21 authoring + 14 R1 + 13 final binding), seven-project typecheck, ESLint, two-seed deterministic zero-write final replay and accepted 488-pin R4P.3 verification PASS. Effective long overlaps/exact English example copies zero; four conventional short-match observations retained.
- Report: vocabflow-dataset/workspaces/master-editorial-high-throughput-500/reports/checkpoint-01-r1c-publication-validation.md. Git DRAFT publication is explicitly authorized after staged-scope/remote checks; final commit/push and postpublication results are provided in the handoff. No human approval, canonical IDs, rights clearance, Master release, database or Production operation. Stop after checkpoint 01; no checkpoint 02 or Batch 05.

### Phase 2H.2K - checkpoint 02

- Author exact frozen orders 101-200: five source-planned/sealed bilingual micro-batches, 100 groups / 104 Senses; inherit final R1C 1666 records unchanged for cumulative 1220 groups / 1770 DRAFT Senses, remaining 4923 groups. Four multi-Sense groups: football, event, agree, understand.
- Three isolated AI review contexts supply blind source/content-bound review and rechecks. Preserve first-pass 89 PASS / 15 REVIEW, apply 18 forward field revisions across 14 Senses, final 102 PASS / 2 nonblocking REVIEW / 0 FAIL. Fifty taxonomy and cathedral direct-source limitation remain visible; no human approval, canonical IDs or rights clearance.
- New focused tests 12/12, seven-project no-write typecheck, lint and two-seed deterministic replay PASS. R1C and 488-pin R4P.3 checks PASS. Complete 9677-record copying screen has zero long overlaps/exact English example copies, with 33 short observations / 24 distinct findings retained.
- Evidence: vocabflow-dataset/workspaces/master-editorial-high-throughput-500/checkpoints/checkpoint-02/report.md. Authoritative manuscripts/planning/seals remain immutable; two revision layers retain BEFORE/AFTER hashes and original reviews. Preserve two untracked caches, seven stashes and twelve worktrees.
- Owner authorizes scoped normal origin/TXH DRAFT publication after staging and remote checks; final commit/push result is in the handoff. Stop after checkpoint 02. No checkpoint 03, Batch 05, CP01 deferred-Sense application, database, runtime, release or Production work.


### Phase 2H.2K - checkpoint 03

- Author exact frozen orders 201-300: five source-planned/sealed bilingual micro-batches, 100 groups / 105 Senses. Append to exact published CP02 parent: 1320 groups / 1875 DRAFT Senses; remaining 4823. Five multi-Sense groups: success, style, art, jealousy, sun.
- Three isolated blind AI contexts independently review all new Senses. Preserve original 94 PASS / 8 REVIEW / 3 FAIL; nine forward field revisions across seven Senses receive fresh hash-bound rechecks. Final 101 PASS / 4 nonblocking REVIEW / 0 FAIL. Retain five boundary concerns and two deferred freshwater/coral candidates, with planning and review duplicates counted once.
- Newly executed: 17 focused integrity tests, seven-project no-write typecheck, lint, exact parent/source checks, two-seed zero-write replay and all three accepted ancestor verifiers PASS. Source screen covers all 9677 records with zero long overlaps/exact English example copies; 24 sealed short observations remain visible. Fingerprint: 3c1aa8e8266e95810474408727412f96187e3649adb5132c9c35ae32dd448cf7.
- Evidence: vocabflow-dataset/workspaces/master-editorial-high-throughput-500/checkpoints/checkpoint-03/report.md. Preserve all 1770 inherited records, unresolved CP01/CP02 items, historical corrections, two untracked cache exceptions, seven stashes and twelve worktrees. No root EOL-rule change, approval, canonical IDs, rights clearance, DB, Production, runtime or release operation.
- Owner authorizes normal scoped origin/TXH DRAFT Git publication only after all gates; final commit/remote and postpublication checks are reported in the handoff. Stop after checkpoint 03; do not begin checkpoint 04, old Batch 05 or deferred-Sense application.


### Phase 2H.2K - checkpoint 04

- Author exact frozen orders 301-400: five planned/sealed bilingual micro-batches, 100 groups / 102 Senses. Preserve all 1875 CP03 records; cumulative 1420 groups / 1977 DRAFT Senses, remaining 4723 groups. Foreign and extinction receive source-supported splits; classical/orbit candidates remain deferred with five explicit boundary items.
- Preserve isolated independent first-pass review (94 PASS / 7 REVIEW / 1 FAIL). Two forward exampleVi corrections receive fresh PASS rechecks; unchanged orbit receives a separate nonblocking REVIEW disposition recheck. Final 96 PASS / 6 REVIEW / 0 FAIL; no human approval, canonical IDs or rights clearance.
- Validation PASS: 17 focused tests, seven-project no-write typecheck, lint, four accepted ancestor verifiers and two-seed zero-write replay. Source screen covers all 9677 records, zero long overlaps/exact English example copies and seven sealed short observations. Fingerprint: 88c810c9c831f08e9a6d2e16c1874e12e5b8fb38bf62a346e97cea48a70e23ef.
- Evidence: vocabflow-dataset/workspaces/master-editorial-high-throughput-500/checkpoints/checkpoint-04/report.md. Publication scope is CP04 plus append-only progress/changelog. Preserve historical records, two cache exceptions, seven stashes and twelve worktrees; no database, Production, runtime or release operation.
- Owner authorizes normal scoped origin/TXH DRAFT Git publication after all gates; actual commit/remote and postpublication results are reported in the handoff. Stop after checkpoint 04; do not start checkpoint 05, historical Batch 05 or deferred-Sense application.


### Phase 2H.2K - checkpoint 05 and cohort 500 completion

- Complete exact frozen orders 401-500: five planned/sealed micro-batches, 100 groups / 104 Senses. Preserve all 1977 CP04 records; cumulative 1520 groups / 2081 DRAFT Senses, remaining 4623. Four source-supported multi-Sense groups: depend, environment, system, particular.
- Isolated blind AI review covers every new Sense. Preserve first-pass 87 PASS / 17 REVIEW / 0 FAIL; two forward field corrections receive independent hash-bound PASS rechecks. Final 89 PASS / 15 nonblocking REVIEW / 0 FAIL. Retain six deferred affected proposals and seventeen boundary identities, deduplicated across planning/review.
- Data-derived additive cohort report verifies exactly 500 unique selected/authored groups, correct five-way partition and accepted parent prefixes; actual cohort total 518 new Senses. Cohort authoring complete, release approval and database import remain NO.
- Newly executed: 23 focused tests, seven-project no-write typecheck, lint, five ancestor verifiers and two-seed zero-write replay PASS. Full 9677-record source screen has zero long overlaps/exact English example copies; 76 sealed short observations remain visible. Fingerprint: 6d66f021b215ddddf3d2f5eb325835fd536f86bf83a392b208dc0ef40edce1fc.
- Evidence: checkpoint-05/report.md and reports/cohort-500-completion.md under master-editorial-high-throughput-500. Scope is CP05, additive cohort report and append-only progress/changelog. Preserve historical findings, cache exceptions, seven stashes and twelve worktrees; no DB, Production, runtime or release changes. Owner authorizes normal scoped origin/TXH DRAFT publication after gates; actual commit/remote/postpublication checks are in the handoff. Stop after CP05; further corpus expansion requires separate authorization.

## 2026-10-11 — Phase 2H.2L Cohort 500-02 Checkpoint 01

- Resume the frozen second 500-group cohort without recreating earlier work. Preserve the exact cohort fingerprint 9710a47fda875f70412c7440b2969c031dc6eb3c076140a42007aed4f83cf59c and inherit all 2,081 accepted CP05 parent Senses unchanged.
- Complete the first 100 frozen groups across five sealed micro-batches: 145 original bilingual DRAFT Senses, including 37 multi-Sense groups. The cumulative projection contains 1,620 authored groups / 2,226 Senses, with 4,523 groups remaining.
- Preserve all blind first-pass review history (128 PASS / 16 REVIEW / 1 FAIL). Twenty-three additive field revisions across 15 Senses have hash-bound lineage and independent rechecks; final effective review is 143 PASS / 2 nonblocking REVIEW / 0 FAIL. The two unresolved boundaries (freely label scope and payment’s action/amount split) remain explicit; no missing candidates or publication blockers remain.
- The all-source screen covers 9,677 source records and finds no eight-word overlaps. Twenty-four short conventional overlaps remain recorded for rights review; rights remain UNKNOWN_REVIEW_REQUIRED.
- Validation: five focused integrity tests, cohort freeze check, CP05 parent check, typecheck, ESLint, and two-seed deterministic zero-write replay pass. The two protected historical cache files, seven stashes and twelve worktrees remain unchanged. Checkpoint fingerprint: 4b968558eb6f2506e1c83c5ca4ebc783e5f01265394f01d6f8ee15abe4fbb773.
- Content remains offline AI_GENERATED_EDITORIAL_DRAFT. No database or Production access, human approval, canonical ID allocation, rights clearance or Checkpoint 02 work.


## 2026-10-11 — Phase 2H.2L Cohort 500-02 Checkpoint 02

- Continue exact frozen cohortOrder 101–200 (checkpoint-local authoringOrder 1–100), without reselection or rewriting CP01. Five source-planned, sealed micro-batches add 100 groups / 158 original bilingual DRAFT Senses, including 44 multi-Sense groups. All 2,226 inherited records remain exactly equal; cumulative inventory is 1,720 groups / 2,384 Senses, with 4,423 groups remaining.
- Add a read-only CP01 postpublication verifier: validate accepted commit ancestry and all 79 published workspace blobs, eight assembled hashes, 60 raw hashes, source byte pins, cohort fingerprint, content hashes and review bindings; replay the historical content validators. The original freeze tool's exact prepublication HEAD/remote guard is obsolete for descendant replay, remains unchanged, and is not reported PASS.
- Preserve blind first pass (148 PASS / 7 REVIEW / 3 FAIL). Five forward field corrections across five Senses resolve the fraction definition, driving/incredulous/superb Vietnamese examples and compromise label; five current-hash independent rechecks PASS. A separate unchanged-hash athletic recheck corrects an inaccurate regional-evidence rationale while preserving its nonblocking REVIEW. Final independent QA: 153 PASS / 5 REVIEW / 0 FAIL.
- Keep five unresolved proposal identities explicit (overuse, fiscal, office service-place, athletic sport-related, keep maintain-state). The one source-supported missing keep intransitive-state candidate stays deferred; no historical deferred candidate is applied. Author A QA: 149 PASS / 9 REVIEW / 0 FAIL. Meaning candidates examined: 159, comprising 158 authored candidates plus the deferred candidate.
- All-source screen covers 9,677 records with zero eight-word overlaps or exact copied English examples. Seventy-three short conventional overlap observations remain visible for rights review. Fifteen focused no-write integrity/negative tests, seven-project TypeScript noEmit checks, ESLint and AST syntax checks PASS. Two-seed replay and publication verification are reported in the final handoff.
- CP02 fingerprint: 965e252cf641eb40111eeb113fd213c0588b240b9a5f3e6386e185fd5e3b945b. Evidence: vocabflow-dataset/workspaces/master-editorial-high-throughput-500-02/checkpoints/checkpoint-02/assembled/report.md. Authorized scope is additive CP02 content/tooling, the additive CP01 verifier and append-only progress/changelog.
- Preserve accepted source inventories, both cohorts' prior review/correction lineage, two cache exceptions, seven stashes and twelve worktrees including VocabFlow-us55. Offline DRAFT; rights UNKNOWN_REVIEW_REQUIRED; no human approval, canonical IDs, DB, Production, runtime or release activity. Normal scoped origin/TXH publication authorized after gates. Stop after CP02; CP03 not started.


## 2026-10-11 — Phase 2H.2L Cohort 500-02 Checkpoint 03

- Author exact frozen cohortOrder 201–300 and checkpoint-local authoringOrder 1–100 across five source-planned, sealed micro-batches. Add 100 groups / 163 original bilingual DRAFT Senses, including 43 multi-Sense groups. Preserve all 2,384 inherited CP02 record objects; cumulative inventory is 1,820 groups / 2,547 Senses, with 4,323 source groups remaining.
- Use an additive CP03 adapter with independent module instances. Verify accepted CP02 ancestry, 142 workspace byte pins, eight artifacts, 51 raw inputs and full parent replay; the accepted CP01 verifier and all historical tooling remain unchanged. Focused tests prove that CP03 selection does not redirect CP02 module state.
- Preserve isolated blind first pass: 133 PASS / 27 REVIEW / 3 FAIL. Four forward field corrections across four Senses address excitement arrival timing, post-war definition originality, pretend sibling-age inference and penny singular monetary wording. All four current-hash independent rechecks PASS; final review is 137 PASS / 26 nonblocking REVIEW / 0 FAIL. Author A QA: 128 PASS / 35 REVIEW / 0 FAIL.
- Keep three missing candidate identities deferred: filter optical use, adopt manner/expression, native adjective about human place of origin. Preserve 21 unresolved boundary identities and all inherited reviews/deferred candidates, including CP02 keep. Source meaning candidates examined: 166 (163 planned authored candidates plus three deferred affected identities); limited evidence review does not claim exhaustive dictionary coverage.
- The effective-content copy screen scans all 9,677 source records without eight-word overlaps or exact copied English examples; sealed short observations remain available for rights review. Unsealed overlap failures were resolved before sealing; immutable manuscripts and first-pass receipts were never replaced.
- Newly executed: 17 focused no-write integrity/negative tests, first-cohort CP05 replay, CP01/CP02 parent replay, seven-project TypeScript noEmit checks, ESLint and AST syntax checks PASS. Two-seed replay, actual scoped commit/push and postpublication byte/pin verification are reported in the final handoff. CP03 fingerprint: d409f7844c9ef2b1d91b464e20d669da27360e0f4d3de4ba443a0b2612d53436.
- Evidence: vocabflow-dataset/workspaces/master-editorial-high-throughput-500-02/checkpoints/checkpoint-03/assembled/report.md. Scope is additive CP03 files/tooling and append-only progress/changelog. Preserve two cache exceptions, seven stashes and twelve worktrees including US55. Offline DRAFT; rights UNKNOWN_REVIEW_REQUIRED; no human approvals, canonical IDs, DB, Production, runtime or release activity. Stop after CP03; CP04 not started.


### 2026-10-11 — Phase 2H.2L authorized 500-group run: CP04 blocked

- Verified local and origin/TXH baseline b2fb8e5ebb7570c0f90a440f58d34089b974b1ae; CP03 zero-write replay PASS.
- Mandatory blocker: frozen cohort500-02 order368 NORMALIZED_HEADWORD:whip (v) has normalizedPosCandidates=[] (source record4670, /records/4670/sourcePosRaw). Existing checkpoint-01 parser requires POS membership and complete frozen-group coverage. No valid manuscript row can satisfy both assertions without a contract decision. Frozen selection and historical verifier were preserved.
- CP04 partial unsealed work retained locally: Micro01 20groups/35Senses and Micro03 20groups/33Senses, with Author A self-reviews; Micro02 decisions and Micro05 planning persisted. These are not independently reviewed, assembled, published or counted in accepted totals.
- No new checkpoint completed; accepted totals remain1820groups/2547DRAFT Senses,4323remaining. No commit/push, CP05 or new cohort started. Next action: owner review of explicit missing-POS handling contract before resuming retained CP04 work.
- Both cache exceptions unchanged;7stashes and12worktrees byte-equivalent to baseline inventory. Database access/writes NONE/NONE; Production untouched; rights UNKNOWN_REVIEW_REQUIRED.


### 2026-10-11 — Phase 2H.2L CP04 POS resolution and publication gates

- Owner policy024a8647-e7be-4097-a910-1fd88c2ef0a3 implemented as a pinned additive POS overlay. Order368 whip (v) resolves to VERB from verified raw tag(v), record4670 SHA2568dab954deef740c2b25b2382f59f07140309e079fd41c2bc819013a87137632e. Frozen/source/CP01–03 bytes unchanged. Audit200orders301–500 found1emptyPOS,1eligible resolution,0ambiguous/conflicting/insufficient cases; CP05empty0.
- CP04 completes100groups/168Senses,44multisensegroups; projection1920groups/2715Senses,4223remaining. Existing40groups/68Senses and original manuscripts preserved byte-for-byte.
- Blind first pass147PASS/15REVIEW/6FAIL; six additive field corrections independently rechecked5PASS/1nonblockingREVIEW/0FAIL. Final152PASS/16nonblockingREVIEW/0FAIL,0missing candidates,16unresolved identities retained. Author A156PASS/12REVIEW/0FAIL.
- Original chief example copying failure retained as diagnostic evidence; full9677-source screen applies to all corrected effective records, with0eight-word overlaps. No copying exception granted. New CP04 workflow requires complete current-hash independent review/rechecks before seals. Accepted parent tooling unchanged.
- Fingerprint19cad301827b8f5214a8d93c92c60b1f99125e1b2ad0e1a2311902b851c338ed. POS15tests/focused19testsPASS;7typechecks/lintPASS; two-seed1/8675309zero-write replayPASS over8018visiblefiles with stdoutSHA256ad4520a30b53beb5cea34adae1c158fa3ecc39fa7a0a3593c258ce7a6665d193.
- Publication is gated on explicit-path staging, normal origin/TXH push and post-publication remote/pin/descendant replay verification. Continue CP05 automatically only after that verification under the existing500-group authorization.
- CONTENT_STATUS=DRAFT; RIGHTS=UNKNOWN_REVIEW_REQUIRED; HUMAN_APPROVALS=0; CANONICAL_IDS_ALLOCATED=0; DATABASE_ACCESS/WRITES=NONE/NONE; Production untouched. Protected cache/stashes/worktrees preserved.


### 2026-10-11 — Phase 2H.2L Cohort 500-03 CP02: EOL and baseline gates

- Start from the accepted `TXH` / `origin/TXH` HEAD
  `d1ad7c45ac4d156f79152d052eb9bc0bcc8157ab`. Preserve the 100-group / 154-
  Sense unpublished CP02 draft, five existing handoffs, 40 CP02 artifacts, two
  cache files, seven stashes, twelve worktrees, and all unrelated files.
- Add the owner-approved scoped LF checkout contract. In isolated checkouts
  with `core.autocrlf=true` and `false`, `git check-attr` changed exactly the
  intended 3,367 tracked JSON files under `vocabflow-dataset/releases/` plus
  seven exact semantic-closure artifacts; the release Markdown diagnostic was
  not matched. Fresh index materialization reproduced Git blob bytes for all
  3,374 targets, including the previously examined 1,103-file set. No accepted
  blob, release manifest, or fingerprint changed.
- Validation in an isolated LF checkout: semantic closure `--check` PASS at
  fingerprint `5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea`;
  frozen approved-release integrity tests PASS 5/5. The approved-release test
  was run with Node 22.23.2, Vitest 5.0.0, thread pool, one worker, and no file
  parallelism; the initial run took 46.44s and two bounded repeats took 9.01s
  and 8.82s, each PASS 5/5.
- The previously controlled full suite remains `FAIL`: baseline 1,409 PASS / 18
  FAIL / 17 PENDING; candidate 1,411 PASS / 16 FAIL / 17 PENDING. Failure
  identity comparison found 15 matching failures, three baseline-only failures,
  and one candidate-only 30-second approved-release timeout. The timeout did
  not recur in the three focused runs, but the full-suite observation remains
  visible. The signature comparison does not establish that every common
  historical release/identity failure is harmless; no blanket waiver is
  claimed. `BASELINE_NON_REGRESSION=UNPROVEN`, not PASS. The scoped policy is
  documented in DEC-027 and is not a blanket waiver.
- Independent reviewer availability: none in this session. Review remains
  0/154; no independent semantic review, corrections, rechecks, seals,
  assembly, or publication occurred. CP02 publication eligibility is NO until
  154/154 independent review and every remaining gate pass.
- Rights remain `UNKNOWN_REVIEW_REQUIRED`; content remains offline DRAFT;
  approvals/canonical IDs are zero. Database access/writes: NONE/NONE;
  Production untouched. No push or deployment was attempted.

### 2026-10-18 — V2 release candidate Preview follow-up

- Create local release commit 37e9dc0d53c78f1d75c42d3512b6217a5c18954e (release(v2): prepare production cutover) after staging only the approved runtime delta; preserve other local working-tree files. Push only that SHA to v2-release-candidate-20261018; main remains 17b1c761a97bfd2fbabcdb04fa43478677dbe749.
- Exact-SHA clean-clone pnpm build:production with Node 22.23.2 and pnpm 11.17.0 passes, including runtime/client secret and source-map scans. Focused runtime suite and typechecks pass.
- Vercel Preview initially failed because Vercel removes the tracked vocabflow-dataset/ path listed in .vercelignore, which the build mutation guard counted as dirty. Fix the guard to exclude only that deployment-ignored path while continuing to block edits in deployed sources; add a regression test. Focused production-build tests pass 71/71. A follow-up Preview build is still required.
- No Production environment, alias, database, media rights, or deployment changed. V1 backup remains owner-waived; V1 database rollback is unverified. Keep the Production GO gate closed until a READY Preview and required smoke checks pass.

### 2026-10-18 — Vocabulary UI presentation hotfix

- Based on release SHA `1587090a2f5f7470d31722465bf4703b319cf006` on local
  branch `fix/v2-vocabulary-ui-prod-20261018`. Keep canonical V2 content and
  hashes unchanged; the DTO exposes one Vietnamese meaning field, an English
  definition, and structured bilingual example fields.
- Vocabulary cards/detail/flashcards now label meaning and definition
  distinctly, display POS beside IPA, separate EN/VI example lines, and render
  friendly topic labels while preserving stable filter values. Search result
  subtitles identify Vietnamese meaning; image/audio fallbacks are explicit.
- Production media absence traces to the intentional V2 rights guard:
  production requests strip uncleared media URLs. The guard was not changed.
  No Cloudinary or Neon operations were performed.
- Safe Git archive:
  `D:\hoctienganh\VocabFlow-workspace-archive-20261018-1792264171904-d6151`;
  archived files were SHA256 verified before cleanup. The detached release
  worktree remains preserved.
- Focused tests pass 74/74 across six files when excluding `.vocabflow-local`
  release checkouts from Vitest discovery. Web TypeScript (`tsc -p
  apps/web/tsconfig.json --noEmit`) and focused ESLint pass. `pnpm build` passes;
  Node 22.19.0 is below the repository-pinned 22.23.2 and Vite reports an
  existing API dynamic-import warning plus the web chunk-size warning.
- Full `pnpm typecheck` remains blocked by nine diagnostics in two pre-existing
  untracked development scripts (`scripts/local-development-postgres.ts` and
  `scripts/resolve-master-v2-development-pending.ts`); the changed web project
  itself typechecks cleanly. No unrelated script was edited.
- Archive verification passes for all 1,927 pre-existing untracked files, but
  the host rejected the bulk per-file workspace cleanup command. No archived
  workspace files were removed; the exact remaining list is preserved in the
  archive disposition manifest. No push, database operation, Cloudinary
  operation, or deployment.

### 2026-10-18 — V2 public media owner-attested release

- Continue from the UI hotfix commit `11d56345fd2703c44b66218efef05bbfe8fb7088`
  in the isolated `VocabFlow-release-37e9dc0` checkout; leave the root working
  tree and its 1,926 untracked files untouched.
- Record the owner's V2 APKG public-display authorization as an
  `OWNER_ATTESTED_FOR_PUBLIC_DISPLAY` audit record, distinct from third-party
  license evidence. Keep Neon `UNKNOWN_REVIEW_REQUIRED` and all mapping review
  states unchanged.
- Implement a deployment sanitizer requiring the exact attestation ID and a
  current V2 PASS/DRAFT identity/content hash. It accepts only unique,
  non-ambiguous signed Cloudinary V2 URLs, requires pronunciation evidence and
  exact IPA matching for word audio, and attaches accepted example audio only
  through a matching stable example key. Deployed DTOs omit Development mapping
  metadata. Add example playback controls to Vocabulary detail and Flashcards.
- Focused tests: 39/39 pass. API typecheck, Web typecheck and focused ESLint
  pass. Local Neon readback is blocked because Vercel CLI does not inject the
  Preview/Production Secret values into local commands; no credentials were
  exposed. Cloudinary data-sample and live-browser checks remain outstanding.
- No Neon, Cloudinary asset, learner-history, canonical Sense, or V1 resource
  has been modified. No commit, push, environment update, or deployment yet.

### 2026-10-18 — Source gloss and media availability UI release

- Carry `sourceMeaningVi` from pinned Master V2 projection provenance through
  vocabulary APIs and render it separately from the Sense-specific study
  meaning. Keep review-answer validation on the Sense-specific value.
- Update missing Production media labels to identify the rights hold. Preserve
  the owner-attested runtime's signed-URL and current-mapping checks.
- No Production database import/backfill or Cloudinary upload is included.
  Focused checks and the production build run are recorded after this entry is
  prepared for release.

### 2026-10-18 — Study flashcard and missing-thumbnail hotfix

- Work from isolated branch `fix/v2-study-media-ux-20261018`, based directly on
  verified main `6b2410a20fda7b5cedeafd83eb2346ec3e44baaa`; the root workspace and
  its pre-existing untracked files were left untouched.
- Production read-only browse showed 30 first-page rows and no image URLs in
  that response; no CDN image request failed. Production does not expose enough
  mapping metadata to distinguish unassigned images from URLs withheld by the
  public-media guard. Search returned safe image URLs for advertise/equivalent;
  abandon had word audio, while detail and browse differed on image availability.
  `about` ADVERB and PREPOSITION remain distinct; the ADVERB queue row has no
  source gloss or media, so presentation uses its complete Sense-specific
  Vietnamese meaning and does not borrow another Sense's gloss.
- Vocabulary cards hide missing thumbnails, compactly report failed loads, and
  reset failure state per identity/URL. Study cards keep answers on the back,
  use a shared source-gloss fallback, separate EN/VI example lines, and render
  exact-sentence audio outside the flip control. Review Queue sanitizer and
  serializer regression tests protect source gloss, stable Sense identity,
  hashes, and permitted media fields.
- Focused tests: 152/152 pass across 7 files. Web/API typecheck and production
  build pass. Build ran with Node 22.19.0 instead of pinned 22.23.2 and reported
  existing dynamic-import and chunk-size warnings. No canonical content, Neon,
  Cloudinary, media mapping, rights, SRS, Production configuration, or runtime
  data changed. Pushed hotfix commit `7cc0f1191f2e9bcfd77ee85dd7dfacc04d11be6a`;
  Vercel created a Ready Preview at
  `https://vocab-flow-p1anh6cbr-to-xuan-hoai-s-projects.vercel.app` from that
  exact commit. Authenticated browser smoke passed: first page remained 30 rows
  with no empty image icons; search `tear` returned two results; Study opened
  answer-free, audio did not flip the card, and its back showed the Sense
  meaning, definition and separate EN/VI example lines. No review answer was
  submitted. `advertise` image and `equivalent` example audio rendered/played;
  `abandon` word audio played. `about` ADVERB retained its own meaning/example
  and showed no media under the current rights guard. Production remains
  unchanged.
# 2026-10-18 — V2 short Vietnamese meaning overlay

- Add one shared presentation rule: only `shortMeaningStatus=VERIFIED` may be
  shown as a short gloss. Otherwise preserve the current Sense translation and
  label it `Giải thích nghĩa`. A previously carried `sourceMeaningVi` alone no
  longer upgrades itself to a verified gloss.
- Add the hash-pinned `master_v2_short_meanings` overlay schema and minimal
  additive migration. The generated migration was narrowed because older
  V2 projection/import tables exist in the live schema but are absent from the
  previous Drizzle snapshot; only the new overlay table is created.
- Add deterministic snapshot/result and idempotent sync scripts. They require
  the protected Neon identity to match V2 Development and never call AI.
  Short `sourceMeaningVi` values are candidates marked `REVIEW_REQUIRED`, not
  silently approved; missing evidence produces `UNRESOLVED`.
- Wire the verified-only overlay through Vocabulary, detail, browse, Search,
  learner, Review Queue, topic, learning-set, saved, and weak-word APIs and
  displays. Canonical content, rights, media, SRS, and progress are untouched.
- Owner declined paid AI. The repo-local ignored `.env` has Development and
  migration settings, but the one read-only Neon preflight returned the
  provider error that the account or project has exceeded quota. The pulled
  Preview env contains `[SENSITIVE]`, not a usable connection string. No live
  snapshot, migration, Neon sync, or Preview could be run; no credentials were
  printed and no retry/write followed the quota error.
- Focused tests: 236/236 passed across 16 files. Workspace packages,
  `pnpm typecheck`, and `pnpm build` passed under Node 22.19.0 (repository pins
  22.23.2); focused ESLint passed. Build retained existing dynamic-import and
  large-chunk warnings.
  Database-dependent acceptance evidence remains pending a usable local
  Development connection.
- Offline receipt enrichment used the existing 16 SHA-pinned independent
  content-review receipts. It promoted 255 single-candidate source glosses
  only where the PASS receipt matched the exact current content fields and
  hash, verified the source-record pin, and cited the relevant gloss. The
  original 5,147 verified rows were left unchanged; totals are now 5,402
  VERIFIED, 397 REVIEW_REQUIRED, and 1,512 UNRESOLVED. A 1,909-row contextual
  queue and receipt evidence are stored in the ignored local artifact folder
  and backed up outside the workspace. Neon remains untouched.


### 2026-10-19 — US-58 public guest learning

- Owner explicitly reprioritized public initial-phase access, optional accounts
  and localStorage persistence. Added US-58 and updated product/architecture/flow,
  decisions/changelog and UI ownership docs to record the guest-only exception.
- No-session users enter the existing app shell/routes with a local identity.
  Desktop and mobile retain account entry; a dismissible shared notice recommends
  registration and honestly describes device storage, clearing and no auto-import.
  Session-service errors also permit explicit guest continuation.
- Public catalog uses the enabled dataset reader and set/topic memberships, with
  the deployed media sanitizer even locally. It never reads/provisions private
  learner data. Existing private APIs retain authentication/household boundaries.
- A shared web transport routes only the fixed guest identity locally. Guest
  reviews validate shared DTOs, derive exercise correctness, reuse scheduleReview,
  check revision/idempotency and commit localStorage under a cross-tab Web Lock.
  Failed/corrupt/unavailable storage does not advance the card or wipe old data.
  Saved words, settings, activity and study preferences persist separately.
- Final focused checks: 74 tests pass; exercise study suite 14/14 passes on an
  isolated rerun after an intermittent shortcut assertion in a combined run.
  Six guest browser E2E pass, including actual concurrent tabs and typing exercise.
  Expanded auth/browser smoke: 11/12, with inherited US-05 old summary-label
  assertions failing. Broad web/API/domain suite: 810 pass, one failure in the
  pre-existing untracked development preview duplicate-text assertion.
- Web/API typecheck, changed-file ESLint, pnpm build, strict production-UI audit
  and git diff --check pass. Root typecheck still has 10 diagnostics in unrelated
  scripts; root lint has 46 existing tooling/development/script errors. Node is
  22.19.0 versus pinned 22.23.2; build retains existing chunk/dynamic-import warnings.
- Browser/API checks use mocked public content; live DB/public catalog readback
  remains an owner/deployment check. No DB migration/write, commit, push or deploy.
  All pre-existing untracked datasets/scripts/development UI remain untouched.


### 2026-10-19 — US-58 branch publication authorization

- Owner requested publishing the completed guest-learning change to TXH, dev and
  main. Fresh remote inspection found all three at 05a624ff04dbedc064fbd38a283a7c80e909a74c.
- Stage only the feature and its documentation/test artifacts. Preserve unrelated
  untracked development UI, scripts, datasets and migration files. Publish one
  commit through normal fast-forward updates; the existing main CI/release
  pipeline remains the release authority. No standalone deployment or DB command.

### 2026-10-19 — US-58 deployed loading performance audit

- Owner requested a read-only audit after deployment. Public catalog MISS was
  9,407 ms (8,602 ms TTFB), then HIT 508 ms / STALE 480 ms. Payload: 7,311 words,
  8,140,988 decoded JSON bytes and about 1.85 MB compressed response body.
- Confirmed every guest resource waits for the full catalog, including local
  Settings. This US-58 bootstrap regression escaped the 1–2-word test fixtures.
- Findings, measurements and limitations are recorded in
  docs/qa/US-58-loading-performance-audit-2026-10-19.md. No application fix made.
  SQL/Neon/serialization attribution needs per-stage Server-Timing; no direct DB
  query or authenticated-account performance claim was made.
- Production was read only. No progress write, environment change, commit,
  push or deployment. Public response samples and metrics are local/gitignored.

### 2026-10-19 — US-58 performance and New-count fix, owner-authorized publication

- Owner requested fixing the audit and the screenshot's 100 minus 10 New metric,
  then pushing to Git. Continue the same TXH/dev/main publication scope.
- Public startup now reads an enabled dataset ID/level/membership index via
  three parallel queries. Detail batches accept at most 60 IDs, with at most
  two concurrent browser batches. Browse and guest collections page in SQL;
  weak-word search transfers IDs rather than whole word content. Preserve the
  existing public-media sanitizer and private API authorization.
- Settings/activity/history/rewards/reset/unsave are independent of content
  reads. Reuse validated storage snapshots; clone before locked writes so a
  persistence failure cannot mutate the cached snapshot. Confirmed review
  retries replay locally without fetching content. Stored format remains v1.
- New count is the true unseen source total; today's allowance and session
  candidates remain separate. Exclude learned IDs, not a learned-count offset.
  The 7,311-word / 10-learned / limit-100 fixture reports 7,301 New, 90 eligible
  today and 30 capacity-bounded candidates. Older-day history does not reduce
  today's allowance. Existing scheduler, due ordering and account flows remain.
- Same-data public payload projection: 8,140,988 decoded bytes before versus
  252,429-byte index + 11,074 bytes for ten details = 263,503 (96.8% reduction).
  This is a size projection, not a post-deployment timing claim.
- Final verification: 833/833 production web/API/domain tests (63 files);
  27/27 Chromium E2E for guests, login, picker and allocation; Web/API typechecks,
  changed-file ESLint, pnpm build and strict production UI audit pass. The
  unrelated untracked development preview suite remains outside this regression
  run. Existing root local-tooling/script check debt was not modified.
- No direct Neon/DB write, migration, environment or learner-history operation.
  Preserve unrelated untracked data/scripts/development UI. Publish one normal
  fast-forward commit; the existing main CI/Vercel pipeline controls deployment.

### 2026-10-19 — US-58 guest/account dataset parity

- Owner requested fixing guest Home showing 6,707 while the signed-in account
  includes the full catalog. Public index confirms 7,311 enabled rows, 6,717
  distinct rows in enabled sets and 594 outside. Guest default/Pathway/All
  incorrectly used set memberships; authenticated V2 uses the enabled dataset.
- Broad guest queues now select the complete index vocabulary. Explicit custom
  sets, single sets, topics, saved and weak filters are preserved. Due-before-New,
  daily admission, capacity, local storage and bounded detail requests remain.
- Scale fixtures now contain 594 unassigned rows. Regression cases exercise
  all broad sources, due/new outside sets, ignored assignments for broad V2,
  and explicit collection filtering. Browser fixtures cover no-set learning,
  persistence and Home showing 7,301 unseen / 90 remaining after ten learned.
- No database backfill, CEFR edit, migration, environment change or account-data
  operation. Preserve all unrelated untracked development tooling/datasets.
- Verification: 28/28 guest unit tests and 24/24 Chromium guest/source-picker/
  allocation E2E pass. Web typecheck, changed-code/test ESLint, production build
  and diff whitespace checks pass. Existing Node pin/chunk warnings remain.
  Publish through the previously authorized TXH/dev/main fast-forward scope.
