# 14-5000: Chuẩn bị và biên soạn đợt 5.000 mục để Muse tạo ảnh/TTS

## Current result — 2026-11-01

**Status:** bounded Production release complete — 4,997 new entries; 3 deferred.
Owner explicitly authorized publishing the complete entries and leaving the three
repairs for later. Production: 6,544 words, 438 sets, 123 topics. Added 362 lessons,
4,997 images and 9,994 MP3 files; existing 1,547 records/progress remain unchanged.
Development not updated. Frozen source/held UUIDs remain intact. No independent
Master PASS or full human listening acceptance is claimed. The original 5,000-item
target remains short by three, deferred by the owner; this does not close 08/09.
Evidence: `.vocabflow-local/editorial-refresh-20261101/expansion-4997-production-r0001/handoff.current.json`.
CI deploy token still needs renewal; the verified final release used a native
Vercel Git build from main with the existing owner login.

The dated checkpoints below describe earlier states, not the current publication.

## 2026-11-01 — Ticket14 media intake checkpoint

Five owner-delivered parts form a complete ZIP64; all frozen text/IDs unchanged.
Local draft: 5,000 items, 50 topics, 362 stable lesson drafts, 4,997 file-complete
items. Hold antihistamine/apiece for missing word audio and painter for truncated
PNG. 14,997 media decode successfully; no database/runtime/cloud publication.
Current evidence: `.vocabflow-local/editorial-refresh-20261101/expansion-5000-intake-r0001/handoff.current.json`.


**What to build:** Gói nội dung mới đối chiếu 1.547 mục giữ lại, có phần chữ
do Codex biên soạn và job media cố định. Người dùng giao Muse một lần, nhận
một ZIP cuối để điều phối kiểm tra, không phải duyệt/giao lại từng lô.

**Blocked by:** Không. Nguồn giữ lại 1.547 mục đã xác minh; không phụ thuộc 08–09.

**Status:** in-progress — media received; 4,997 file-complete, 3 held; local lesson drafts assembled.

**Execution authorized:** Soạn chữ theo yêu cầu 31/10 và nhận tệp, ghép bài theo
yêu cầu 01/11. Người dùng đã giao đủ 5 part ZIP do Muse tạo. Đã kiểm tra và
ghép bản local; chưa phát hành lên ứng dụng.

- [x] Xuất nguồn chống trùng, kế hoạch 50 chủ đề/100 lô và registry danh tính.
- [x] Schema, tên file, binding từ/câu/ảnh, hash và cơ chế checkpoint rõ ràng.
- [x] Prompt Muse chỉ tạo media, bàn giao đúng một ZIP64 và báo thiếu trung thực.
- [x] Kiểm tra gói chuẩn bị: CRC/bytes ZIP, UUIDv7, nguồn/đếm và chặn TEXT_NOT_READY.
- [x] Đủ5.000phần chữ được tác giả/điều phối kiểm tra,15.000job cố định; chưa nghiệm thu độc lập.
- [x] Đối chiếu trùng toàn bộ; nội dung được model tự review và điều phối rà mục tiêu, không nhận nghiệm thu độc lập.
- [x] Người dùng chuyển gói sang Muse và giao đủ 5 part của một ZIP64; phần chữ không đổi.
- [ ] Bổ sung 2 audio đọc từ và thay ảnh painter lỗi; chưa đủ 15.000 media.
- [ ] Điều phối kiểm tra toàn bộ output và trình nghiệm thu trước nhập kho.

## 2026-10-31 — Ticket14 text complete: 5,000 entries ready for Muse media

Owner requested the text and explicitly approved internal parallel workers in
this chat. Authored and froze5,000selected entries across50topics, each with an
original English definition, Vietnamese gloss, bilingual example and specific
image brief. Existing1,547selected items and all live data remain unchanged.
The main list excludes their normalized/variant forms and internal duplicates.
Coverage review prioritized50missing core function words (I/you/the/be/because,
etc.);50specialist drafts are preserved outside the main batch. Unpublished
proposal replacements have a ledger;300oldUUIDs remain reserved,300newUUIDs
were allocated, and no published identity/progress was changed.

Frozen JSON,50rawPSVfiles,reviewCSV, explicit three-job bindings per item,
15,000work orders and100batches of50items are packaged in one8,683,176-byte
Muse INPUT ZIP. Every ZIP member CRC/byte equality and input pin verifies;
all100batches exactly equal canonical5,000items/15,000jobs. Ten negative
identity/duplicate/CEFR/hash/runtime-ID cases are rejected. Six path-safety
cases also reject. Four singular-example alignment fixes, a verb/noun example
fix and letter/number visual clarifications were completed before freezing.

Actual level estimates: FIRST_WORDS14,A1 155,A2 645,B1 1,709,B2 1,994,C1 483,
C2 0. These are editorial judgments, not official CEFR assessments; targets
were not forced by relabeling. Text has author/coordinator model review;
independent human/linguistic and actual media acceptance are not claimed.
Muse only generates images/TTS. Provider calls0,actual media0,DB writes0,
no runtime import or deployment. Ticket14 remains open for media/intake.

Current handoff: `.vocabflow-local/editorial-refresh-20261031/ticket14-expansion-5000-r0001/handoff.current.json`.
Dataset: `vocabflow-dataset/workspaces/editorial-refresh-20261031/expansion-5000-r0001/dataset-text-r0001.json`.
Input ZIP SHA-256: `ad76f8354ecc84733acac025c7711e9ac0d6031d471861ec23865c90e50f64db`.

## 2026-11-01 — Ticket14: five Muse parts verified; local lesson draft assembled

The owner supplied parts 1–5 and asked to continue compiling lessons while busy.
They form one complete ZIP64 archive, read directly across the parts without a
second 4.9 GB archive copy. All 166 frozen input files are byte-identical to the
Codex source. All 14,998 returned media files pass ZIP CRC and match their own
receipt SHA-256/length and job/item/content/request/text bindings. No returned
script or document instruction was executed.

Independent local decoding passes 14,997 files: 4,999 PNG images at 768×768 and
9,998 audible MP3 files. The producer omitted word audio for antihistamine and
apiece. Coordinator decoding additionally found painter's PNG truncated within
IDAT, although its receipt hash matches. Preserve all three items and their UUIDs;
do not fill silence, fabricate pixels, remove source text, or mark full completion.
All 5,000 source records remain in the assembled draft; 4,997 are file-complete.

Partitioned into 362 stable lesson drafts across 50 topics, grouped by editorial
level and up to 20 planned items per lesson. Partition includes held identities
before filtering, so later media repairs do not move words between lessons.
Exported shared JSON bindings, topic lesson JSON, searchable local image/audio
review gallery, coverage CSV and a 3-job retry ZIP. Reviewed 60 sample entries
(59 readable images plus painter's decode error); this is not full semantic or
listening acceptance. Nine reported carrier-isolation word clips remain explicitly
flagged for listening. Model/provider identifiers were not supplied; retain nulls
and owner-provided Muse attribution rather than inventing them.

The producer checksum list omits 4,242 returned media entries. Every received
file nevertheless matches its individual receipt; generated a separate complete
received-media hash list and preserved the original. All 5 source parts remain
in Downloads. Existing 1,547 selected source records remain unchanged. No DB,
Cloudinary, application runtime or deployment write occurred; this is a local
lesson draft, not a published catalog. Eight multipart/archive safety tests pass,
including traversal, Windows devices/ambiguous names, links, duplicates, CRC
corruption, truncation and split-boundary reads; assembly partition/binding/hash
checks and generated gallery JavaScript syntax pass.

Current handoff: `.vocabflow-local/editorial-refresh-20261101/expansion-5000-intake-r0001/handoff.current.json`.
Archive SHA-256: `e4cc37570f3474dc17d9d7c4a1fa43ce1b7f3e6ccf531abf120f6451e3a60d2b`.
