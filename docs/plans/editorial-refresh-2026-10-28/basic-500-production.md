# BASIC-500 — owner continuation, 2026-10-29

Owner requested another **500 basic words**, in the same Codex chat, after
accepting the preceding collection's sampled media and excluding its three
items without word audio. This is content/media production, not application UI
work or a DB import.

## Current scope and actual status

Portable selected-media package:
`.vocabflow-local/editorial-refresh-20261029/handoff/basic-500-complete-media-r0003-c59b6628499bc410.zip`,
1,051,810,241bytes /3,121 members, every member rehashed and verified. SHA
`fda302dfd0d36701559ea8e87c392a51353718ed9407fdfa0df92218303dca36`.
Contains built text/export, assets, original/correction receipts, work orders,
QA, gallery and tooling. Provider ZIP source copies and duplicate run/output
bytes remain separately preserved locally; baseline rebuild inputs remain in
the earlier text-source backup. Final gallery structure verifies500 cards,
500 images,1,000 audio controls and zero missing-image placeholders. Current
owner-review/canonical gates remain explicit.

Selected complete export is now **`dataset-complete-r0003.json`**,500 entries,
20 topics,500 selected images,500 word audio and500 example audio. Six images
were replaced and visually rechecked against the recorded findings. Original
and replacement files/receipts remain preserved. Selected export SHA:
`85c8d508270b8c9d857962e97efbd76de89be4c4cd26ec2d43dbc5458e174c9b`.
All1,500 selected assets and receipts verify;1,499 unique asset hashes because
chair/sit share the exact same example recording. State is media complete,
self-reviewed, **owner review and canonical reconciliation pending**. No
database/runtime change. Text/proposed-level/reuse counts remain unchanged.
The current gallery is built from this selected r0003 export, rather than the
original images. Original500 image files all decode at1600x1600; all six
replacements also decode at1600x1600. Previous partial-status sections below
are historical checkpoints only.

Current local intake is **all1,500 original media jobs** (500 images and1,000
audio), after receiving all13 authorized large image ZIPs. Provider429 for
09–11 cleared on a later request. Earlier partial-download checkpoints below
remain historical. Root screened all25 contact sheets and requested6 targeted
image replacements: comb/melon/shrimp/shoe/month/cool. Corrections use new UUID
job IDs and preserve the full original dataset snapshot and text/audio hashes.
Their3 small ZIPs should be private attachments. The existing public-link
authorization covers the original13 ZIPs only. Correction receipts and root
review are required before freezing selected export `dataset-complete-r0003.json`.

Owner has now explicitly answered **“Đồng ý cả 13 ZIP qua link công khai 48 giờ”**.
The permission below is resolved for exactly images40-01 through images40-13;
the confirmation was sent to Muse and the matching Allow prompts may proceed
without asking again. Evidence: `owner-public-links-authorization-r0001.json`
under the media root. Keep earlier checkpoints as history, not a current block.

Latest receipt-backed checkpoint: **1,000/1,000 audio and32/500 images local**,
1,032 exact jobs joined and hash-verified. All1,000 audio decode PASS; eight
low-average-level warnings require listening rather than automatic rejection.
Offline ASR risk sample36 clips:30 normalized matches, six differences
(aunt/noodle/gray/pupil word clips; walk/use examples). Recognition is fallible
and is not proof of spoken accuracy. No automatic audio regeneration.

Muse reports all500 images generated and verified on its side. Original tiny
image ZIPs02/03 do not download (02 twice). Provider repackaged the existing500
images into13 ZIPs `basic-500-r0002-images40-01.zip` through `...-13.zip`:
12 x40 images plus20, total reported957MB, individual42.6–86.2MB. Owner was
asked to approve **this concrete set** for public48-hour download links; answer
pending at this checkpoint. No public link has been created. Do not infer an
approval from elapsed time or earlier campaign ZIP approvals. Source evidence
is `provider-progress.current.json` under the media root.

Text/source backup: `.vocabflow-local/editorial-refresh-20261029/handoff/`
`basic-500-text-b996406e15fd33d0.zip`,7,546,635bytes,31 verified members,
SHA `dbf9deb282845afbcb705c18f6ab9414659e77c706750bd01c68f96187eba7a0`.
This backup precedes audio intake and contains no actual new media. Current
gallery includes all1,000 playable clips and placeholders for images not yet
received. Do not present it as media-complete.

Actual media checkpoint is preserved independently:
`basic-500-media1032-checkpoint-bbbaf3e607fafcba.zip` in the same handoff folder,
160,485,335bytes /2,151 verified members, SHA
`17282415ae9a6fb6d7e403eb8efc7ffaeb82fed54c5c9b057c0bf9add7902788`.
It contains1,000 audio jobs (999 unique audio byte hashes) and32 image jobs.
The one repeated audio hash is legitimate: chair and sit use the same exact
example, “Please sit on this chair.” Both retain separate exact job bindings;
the duplicate was explicitly reviewed in `audio-qa/duplicate-hash-review.json`.
Duplicate run/output bytes are omitted from the portable checkpoint; immutable
assets, source ZIPs and receipts remain included. Text/source backup is separate.
Active pointer: `vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-500-current.json`.

- 500 authored English–Vietnamese learning entries, 500 authored bilingual
  examples, 20 collections of 25 items. Zero normalized headword overlap with
  the separately preserved 547-item export.
- 405 entries propose reusing a specifically reviewed local runtime sense;
  **do not create 405 duplicate vocabulary records**. The existing runtime
  reference is retained; canonical master IDs remain unresolved/null.
- 82 entries lack a runtime form after explicit spelling aliases; 13 have a
  same-form runtime record but lack the chosen sense/POS. These 95 are
  **candidates requiring reconciliation**, not 95 proven globally new words.
  Thirteen of the 95 have a same-form occurrence in the pinned editorial queue.
- Proposed basic-track split: A1 393 / A2 107. This is an editorial proposal,
  not a certified CEFR result or a change to existing DB classification.
  Existing source CEFR is preserved separately (some differs). No school-grade
  equivalence is assigned.
- Active text revision: `basic-500-r0002`. Initial r0001 is retained as an
  unsubmitted pre-production snapshot. Five items were tightened to align
  definition/example with the exact reused sense before sending anything to
  Muse: give, tell, play, break, bad. Their media job IDs changed; item identity
  stayed stable. No r0001 media was produced or submitted.
- Frozen r0002 dataset SHA-256:
  `43d559f7ed983a5258585f04fc0f6ef28f5538c6dbc31eda874f642feaab6077`.
- 17,140 structural/source/reference/media-binding checks PASS. These checks
  do not substitute for semantic review or listening/viewing generated media.
- Media payload submitted in the logged-in Muse thread: 1,500 exact jobs,
  500 PNG + 500 word MP3 + 500 example MP3. Local progress begins at **0 actual
  outputs**. Receipt/hash verification is required before counting downloads.
- Muse instructed to preflight word+example audio for person, walk, read with
  the existing voice. If all fail, stop the bulk audio calls and continue image
  work. Do not retry the excluded eyelash/muffin tin/wake up jobs.

## Topics

Each topic contains 25 items:

| Topic code | Vietnamese label |
| --- | --- |
| people-family | Con người và gia đình |
| home-rooms | Nhà ở và các phòng |
| household-objects | Đồ dùng trong nhà |
| body-basics | Các bộ phận cơ thể |
| produce-basics | Rau củ và trái cây quen thuộc |
| meals-food | Thức ăn hằng ngày |
| drinks-ingredients | Đồ uống và nguyên liệu |
| animals-basics | Động vật quen thuộc |
| clothing-basics | Quần áo thường ngày |
| school-language | Trường học và ngôn ngữ |
| numbers-colors | Số đếm và màu sắc |
| time-calendar | Thời gian và lịch |
| nature-basics | Thiên nhiên quanh em |
| places-transport | Địa điểm và đi lại |
| actions-body | Hoạt động thường ngày |
| actions-routine | Đi lại và học tập |
| actions-social | Giao tiếp và trao đổi |
| actions-thinking | Suy nghĩ và thực hiện |
| size-properties | Kích thước và tính chất |
| feelings-quality | Cảm xúc và trạng thái |

## Locations and media contract

Paths are repository-relative here; user-facing links should use absolute paths.

- Authored inputs, dataset, readable review and validation report:
  `vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-500-r0002/`.
- Review: `review.html`, `review.csv`; source text: `authored-content.psv`;
  explicit sense decisions: `editorial-policy.json`.
- Active media root:
  `.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/`.
- Frozen control: `work-orders.json` plus `work-orders.sha256`;
  Muse upload: `muse-basic-500-request-r0002.json`.
- Filename: **media job UUID**, `.png` or `.mp3`; entry code is B500-0001 through
  B500-0500. Filename is not an English word or a canonical runtime ID.
- Every ZIP contains an exact `mapping.json` array with jobId, itemId, kind,
  headword, filename, exactText (null for image), actualVoice and actualModel
  (null when unexposed). Each job binds source draft SHA, item content SHA,
  request-spec SHA and exampleId where applicable.
- Requested voice: `avocado_v2:MAI_01`, en-US, speed 90. Reported provider
  metadata is not independently verified. Pronunciation guidance is not spoken
  text; read/wind/close/use require the intended grammatical pronunciation.
- Image teaching-text exceptions are explicit for weekdays, relative days,
  and the alphabet-letter concept. Other images must have no readable text.
  Counting images must show exactly the requested object count.
- ZIP prefix: `basic-500-r0002-images-XX.zip` (at most 40 PNG) or
  `basic-500-r0002-audio-XX.zip` (at most 100 MP3); smaller parts if needed.
  Request downloadable attachments; public sharing requires its actual
  permission handling and is not blanket-approved by earlier ZIP approvals.
- Intake stores `provider-bundles/<archive-sha>.zip`,
  `runs/<jobId>/attempt-0001/receipt.json` and immutable output, and
  `assets/images|audio/<content-sha>.<ext>`. Delete only the exact original
  downloaded ZIP after all copies/hashes verify, as previously requested.
- Mutable progress is `production-progress.current.json`; joined candidate is
  `dataset-with-media.current.json`. No generated file alone makes a dataset
  publishable or canonical.

## Resume commands

```powershell
python scripts/editorial-basic500-build-v1.py --revision r0002
python scripts/validate-editorial-basic500-v1.py --revision r0002
python scripts/editorial-basic500-media-v1.py 'D:/Download/basic-500-r0002-images-01.zip' --revision r0002 --cleanup-download
python scripts/editorial-basic500-media-v1.py --assemble --revision r0002
```

Do not invoke the old expansion-550 assembler for this campaign. The new intake
wrapper reuses its ZIP/security checks but selects a separate media root and
derives totals from the actual source dataset/work orders.

Next: download delivered ZIPs, verify exact mapping and bytes, decode/listen to
audio, inspect images (especially counting/calendar/color/ambiguous-sense
items), fix forward if needed, then create a complete joined export. Canonical
reconciliation and DB import remain separate unperformed work.
