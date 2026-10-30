# Expansion 550 — current production status

## Current selected export:547 items, revision4

Owner requested omitting the three items without word TTS. The current export
is `dataset-547-r0004.json`, with `review-gallery-547-r0004.html` for viewing.
It selects547 items in33 topics,547 images,547 word recordings and547 example
recordings. All1641 output hashes are distinct and reverified with their
receipt/item/text bindings. Topic/level totals were recalculated. Retained
item payloads are unchanged from r0003.

Omitted eyelash, muffin tin and wake up from this export. The original550-item
drafts and media remain preserved. These three missing outputs no longer block
media completeness of the selected547-item export; no further retries are
required for it. Historical original-job progress still shows three missing
jobs and must not be confused with the current export selection.

`selection-547-r0004.result.json` records verification. Dataset SHA-256:
`153f5dfed457145e1c8c9febffb22a0cf0b33e5c8ad01a743f144baf47e9fdfb`.
The earlier owner sampled acceptance remains linked; it is not converted to
full listening/independent review. Canonical reconciliation and database import
have not been performed. No physical source media were deleted by selection.

## Owner sampled-preview acceptance — 2026-10-29

Owner listened to samples and viewed the r0003 content/images, reporting they
are satisfactory. Exact statement and dataset hash are saved in production
root `owner-sampled-acceptance-r0003.json`. The sampled subset was not named;
do not convert this into a claim that all audio was individually listened to.
This supersedes the earlier absence of owner feedback on the preview, while
preserving the three missing word-audio outputs and unfinished full review.
No database import or canonical promotion was performed.

## Current authoritative checkpoint: r0003

The 13 correction images were delivered successfully as four small ZIPs after
the single ZIP failed to download. Intake verified all new job/item/content
bindings, hashes and PNG types, then cleaned the four source downloads.
Viewed the downloaded correction contact sheet: corrected senses and contexts
are represented, and the unwanted readable labels are removed. This is editor
self-review, not independent review or owner acceptance.

`dataset-review-r0003.json` selects the thirteen replacement images and retains
550 total image bindings,547 word recordings and550 example recordings.
All1,647 selected media hashes are unique and reverified against their receipts.
All original assets and receipts remain preserved. The only missing original
outputs remain WORD_AUDIO eyelash/muffin tin/wake up. Muse confirmed another
same-voice retry still fails with empty/truncated audio; no empty output was
accepted. No need to repeat generation of already downloaded media.

Use `review-gallery-r0003.html` for the current local gallery and
`checkpoint-r0003.result.json` for the selected-output verification result.
The previous r0002 gallery/checkpoint remains historical. Full speech and
semantic review are unfinished; this checkpoint is not an accepted release
and has no canonical/database import.

Portable corrections delta (requires the base archive documented below):
`.vocabflow-local/editorial-refresh-20261028/handoff/expansion-550-corrections-r0003-f1662045bcaa9ac1.zip`
SHA-256 `2e50795cab25a5744eb752d2b8c166d352abfdc25dd20618430520453353fa67`.

## Latest checkpoint: all 550 original images downloaded; content fixes pending

Downloaded and intake-verified all sixteen image ZIPs from r0001, plus the
initial four images. Current original-job coverage is 1,647/1,650: 550 images,
547 word recordings and all 550 example recordings. All 1,647 output hashes
are distinct. Download ZIPs were deleted only after archived copies and
per-job asset copies were rehashed. All 1,097 audio files decode, with one
low-level warning; decoding does not prove correct spoken content.

Only three original jobs lack output: WORD_AUDIO for eyelash
(`01a18748-333e-7194-9df6-bc425de36a46`), muffin tin
(`01a18748-3340-71fb-a3ce-eb01a5edea03`) and wake up
(`01a18748-3347-76d2-812d-11891f0a12b8`). Muse reported another unsuccessful
same-voice retry, with truncated/empty TTS output, and stopped retrying.
No empty file was imported or treated as complete.

Visual screening covered all 550 original images at contact-sheet scale.
Thirteen require correction. This screening is editorial self-review, not
independent or owner acceptance. It also exposed six mistaken dictionary
sense selections: window seat, trowel, wallpaper, bookmark, landfill and
student union. These are corrected in a forward-only editorial snapshot;
original pinned drafts, work orders and receipts remain unchanged. No audio
text changed. Existing recordings keep their original receipts with an
explicit amendment/reuse relationship, pending content review.

The thirteen image corrections have separate new job IDs, exact original
item IDs, and specific corrected briefs. Muse received
`image-corrections-r0002/muse-correction-request-r0002.json` and acknowledged
production. Outputs remain pending until downloaded and reviewed. These
replacement jobs do not add vocabulary or increase the 550-item target.

Current files under the production root:

- `dataset-review-checkpoint-r0002.json`: 550 items, six definition fixes,
  thirteen image holds, existing asset bindings and pending review gates.
- `editorial-amendments-r0002.json`: old/new field values and hashes.
- `image-screening-all550-r0001.json`: per-image screening and findings.
- `production-progress.current.json`: original-job coverage only.
- `review-gallery-r0002.html`: current local review gallery.
- `audio-decode-1097-r0001.json`: actual decode statistics.

The expanded dataset is not yet approved, canonically reconciled or imported.
ASR screening was interrupted after 247 files; it is incomplete and must be
resumed before reporting a full-corpus result. Do not infer speech quality
from counts or transport verification.

Portable asset/receipt checkpoint (does not bundle original provider ZIPs):
`.vocabflow-local/editorial-refresh-20261028/handoff/expansion-550-media1647-review-43a4072be668c755.zip`
SHA-256 `daa070e28f7c33734a84034dfc77cfb641e18166886514a7299c842e794c100a`,
804,558,619 bytes. Verified every packaged member against its manifest.
Original provider ZIPs remain archived separately. The 13 replacement images
are not in this checkpoint. Muse reported them produced, but its single ZIP
download timed out twice; requested reattachment as four smaller ZIPs without
regeneration or new public links.

## Latest checkpoint: first 54 media files downloaded

Downloaded 4 PNG images and 50 MP3 files from Muse. Exact mapping, filenames,
request text, MIME, output hashes and archived source copies pass intake.
The two original downloads were removed only after verified copies were saved.
All four actual PNGs were visually self-reviewed for intended subject and
visible text. All 50 audio files decode successfully; offline unprompted ASR
matches 46 exact normalized texts and flags 4 differences for review. One is
the spelling variant `paper clip`/`paperclip`; none of these findings alone is
proof of wrong speech. Human listening has not been performed for this batch.

Submitted all remaining 1,596 requests (546 images and 1,050 audio files) in
`production-remaining-1596-r0001.json`, SHA-256
`4e496eeb811ac10d1f4a1340e44259d69b41af75d4a0c91e57a11dc757e52392`.
Muse visibly acknowledged the request and is generating images. Those outputs
are pending, not counted as completed. The joined JSON currently binds 54
actual outputs; runtime eligibility remains false and canonical imports zero.

Local gallery: `.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001/review-gallery-first54-r0001.html`.
Verified portable checkpoint:
`.vocabflow-local/editorial-refresh-20261028/handoff/expansion-550-first54-59af14ca6bc7bbbd.zip`
(SHA-256 `6bf46f502f57eacffbea4f69e1e659d6837ed82e86a81da3620c178d101af422`).

## Initial authoring and submission record

2026-10-29. Owner explicitly reprioritized this chat to vocabulary authoring
and Muse media production, in one session. The proposed 08/09 runtime work is
deferred. No new learning interface is part of this work.

The text draft contains 550 lexical candidates across 33 topics, with 550
individually authored bilingual example pairs. Definitions comprise 419
attributed Open English WordNet definitions and 131 editorial definitions.
The draft checks normalized headwords against the frozen local corpus and
authoring queue; this is not final canonical sense reconciliation.

Learning levels are editorial estimates: FIRST_WORDS 139, A1 131, A2 146,
B1 133 and B2 1. C1/C2 contain no additions in this draft. These labels are
not an official CEFR assessment. No school-grade conversion is made.

Text source: `vocabflow-dataset/workspaces/editorial-refresh-20261028/expansion-550-r0001/`.
Production source: `.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001/`.
The production root contains exact work orders and 160 prepared prompt files.
Each item has separate image, word audio and example audio jobs, for 1,650
planned outputs. Authoring UUIDs are not canonical database IDs.

Browser access was restored and verified against the logged-in Muse thread.
Submitted `images-0001.txt` (4 images) and `audio-0001.txt` (50 audio files)
through its visible attachment UI. Muse visibly received both files and
started processing. Submission does not mean output completion. At this
checkpoint no output has been downloaded or verified for this expansion.

Muse only produces media. The editor owns wording, translations, examples,
classification and JSON. Archive intake binds exact job/item IDs, requested
filenames, audio text and content hashes before copying or cleaning downloads.
Generated media still requires content review. No database imports or runtime
changes have been made.

Text/binding validation passed 7,889 deterministic checks. Eight isolated
archive intake tests passed. These checks do not certify semantic quality,
pronunciation, image accuracy or readiness for publication.

Portable text/request snapshot:
`.vocabflow-local/editorial-refresh-20261028/handoff/expansion-550-text-6cc65ea7d9622a50.zip`
(SHA-256 `43ee49dfa9b723ec889bbbd0de7835b4892c0ede60d5b419ff87c89b23ea3181`).
This package contains no generated media and is not an offline copy of the
complete dictionary dependency. The dictionary archive remains pinned locally.

Next: download actual Muse outputs; validate mappings, hashes and media;
continue only missing jobs; assemble JSON from verified receipts; finish
canonical identity and editorial review before an import can be considered.
