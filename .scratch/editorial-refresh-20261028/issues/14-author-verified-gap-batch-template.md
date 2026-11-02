# 14: Mở rộng thêm khoảng 5.000 mục mới — Codex soạn chữ, Muse tạo media

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


## Chỉ thị hiện hành — 01/11/2026

**Status:** in-progress — đã nhận 5 part; ghép 4.997 mục đủ file, giữ chờ 3 mục; chưa phát hành.

**Execution authorized:** yes, chuẩn bị và biên soạn theo chỉ thị trực tiếp.
Người dùng đã giao đủ 5 part ZIP do Muse tạo. Điều phối đã kiểm tra và ghép
bản local; chưa ghi DB hoặc phát hành lên ứng dụng.

Giữ nguyên 1.547 mục đang có. Mục tiêu thêm khoảng 5.000 từ/cụm từ thực sự
khác, dự kiến tổng 6.547 nếu đủ nghiệm thu. Codex chịu trách nhiệm toàn bộ từ,
nghĩa, định nghĩa, ví dụ song ngữ, phân loại và brief ảnh. Người dùng tái xác
nhận Muse CHỈ tạo ảnh và TTS; không được giao Muse viết phần chữ để lấp chỗ trống.

50 nhóm chủ đề, 100 lô nội bộ × 50 mục. Mỗi mục có một PNG, một MP3 từ và một
MP3 câu ví dụ: dự kiến 15.000 job. Một ZIP64 cuối duy nhất chứa JSON và toàn bộ
media thật, mapping/hash/checkpoint; không tự chia ZIP khi gặp giới hạn tải.
Hợp đồng chi tiết: [contract](../../../docs/plans/editorial-refresh-2026-10-28/ticket14-5000-r0001/contract.md).

- [x] Đối chiếu nguồn giữ lại đúng 1.547 mục, xuất baseline không tài khoản/media.
- [x] Chuẩn bị ma trận chủ đề/cấp độ, registry UUIDv7, schema, prompt và kiểm tra readiness.
- [x] Codex soạn đủ5.000mục chính; kiểm tra trùng/biến thể và rà nội dung, 50mục khác giữ dự phòng.
- [x] Dataset đóng băng,15.000job gắn đúng hash/text; READY_FOR_MUSE_MEDIA đã kiểm tra.
- [x] Người dùng giao đủ 5 part của một ZIP thật; đã kiểm tra bytes/hash/decode/mapping.
- [ ] Bổ sung antihistamine/apiece WORD_AUDIO và thay IMAGE painter bị cụt.
- [ ] Điều phối và chủ sản phẩm nghiệm thu, tích hợp ở bước tiếp theo.

**Blocked by:** Không còn phụ thuộc rà lại kho cũ của 10–13. Baseline hiện tại
là 1.547 mục đã xác minh trên prod/dev. 08–09 là các mô-đun riêng, vẫn chưa done;
không lấy số chữ/âm/câu đó để cộng vào mục tiêu từ vựng này.

## Mẫu lô lịch sử — đã thay bằng phạm vi trên

**What to build:** Những từ/cụm từ được xác minh thiếu từ ma trận phủ trở thành nội dung học hoàn chỉnh, có bộ tuyển chọn và media cần thiết.

**Blocked by:** 07 — Pilot đầu tiên hoạt động đầy đủ trong học local.

**Historical status:** planned

**Historical execution authorized:** no

**Batch scope:** Mẫu lô 25–50 mục; trước khi giao phải có batchId, danh sách mục tiêu/nguồn đã đóng băng và người sở hữu. Mỗi instance có ID riêng; mục tiêu khoảng 600 không phải một ticket khổng lồ.

- [ ] Xác minh thiếu sau khi tìm canonical headword, alias, biến hình, đúng Sense và starter; không nhân bản nghĩa hiện có.
- [ ] Cấp ID mới một lần qua điều phối; nội dung nguyên tác có provenance và 100% phần mới được review độc lập.
- [ ] Báo riêng Lexeme/Sense/phrase/variant; không đếm membership hoặc biến thể trình bày thành từ mới.
- [ ] Mỗi mục mới hoàn chỉnh về copy, membership và media cần thiết; vượt kiểm tra scope và media local trước khi được tính hoàn thành.

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
