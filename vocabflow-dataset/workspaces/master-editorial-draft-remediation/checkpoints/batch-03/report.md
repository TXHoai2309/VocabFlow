# Phase 2H.2J-R3 — Targeted DRAFT Remediation Batch 03

Status: PARTIAL_WITH_REVIEW_ITEMS_AND_PRESERVED_REGRESSION_FAILURE.
Parent Batch 02 fingerprint: `b3d1335e717ab307d0f5b14dcc811c4e5217f94bd98f26898add9eea68dca84e`.
Parent Phase 2H.2I audit fingerprint: `9c90d8c2f2b964e128e19c5db807336d754573467f7f783a8a666e54a242ed77`; handoff `862be642a7223396f43664ca8604d986a5c1f5cbad91c9ab295492f819ff4ed8`.
New checkpoint fingerprint: `bound in manifest.json`.

## Gate A — bulk-500 UTF-8 diagnosis

The tracked checkpoint-02 receipt is valid UTF-8 and byte-identical at the Batch 02 parent, HEAD, index, and worktree. The two test errors occur after the test writes its Unicode receipt with `Path.write_text()` and no encoding; under the observed Windows cp1258 default, U+2019 becomes byte 0x92 and the production helper's strict UTF-8 reader rejects the temporary file at offset 12585. The same parent test/helper blobs reproduce it. No fixture, test, or decoder was changed. Result remains FAIL (35 tests, 2 errors); this is an isolated environment-specific test fixture encoding defect, not malformed tracked Dataset data.

## Selection and review

Selected all 22 unreviewed proposals in original batch 05, the highest-density source batch. The entire original batch contains 20 headword groups and 37 Senses.

- `2H2I-P005` — **APPLY_ELIGIBLE**: Câu gốc dùng have to + động từ nguyên mẫu để diễn tả nghĩa vụ; bản dịch 'phải đi sớm' giữ đúng sắc thái. AFTER phân biệt đúng has to ở ngôi thứ ba số ít và sự không cần thiết với cấm đoán; ví dụ have to leave remains consistent. Không sửa POS hay mở Sense mới.
- `2H2I-P006` — **APPLY_ELIGIBLE**: Cách dùng two billion dollars và billions of diễn tả đúng dạng số xác định/không xác định; ví dụ more than a billion dollars và bản dịch 'hơn một tỷ đô la' giữ cùng lượng. Chỉ thay grammar note; partOfSpeech OTHER cùng cảnh báo phân loại NUMBER vẫn được giữ nguyên trong hồ sơ nguồn/QA, không phê duyệt đổi POS.
- `2H2I-P015` — **APPLY_ELIGIBLE**: Định nghĩa bao gồm tác phẩm in và nội dung số; borrow a book about birds cùng bản dịch cuốn sách về chim thể hiện danh từ đếm được. AFTER chỉ thay bình luận so sánh identity bằng mẫu countable và nêu lại hai dạng đã có trong definition; không kết luận danh tính với Sense book/booking nào.
- `2H2I-R2-P001` — **APPLY_ELIGIBLE**: Va li không vừa chỗ ngồi minh họa kích thước lớn, khớp nghĩa và bản dịch. AFTER nêu đúng vị trí trước danh từ/sau linking verb và dạng so sánh big/bigger/biggest; không trộn với nghĩa figurative big decision ở Sense anh em.
- `2H2I-R2-P002` — **DEFER_SEMANTIC_RISK**: Definition hiện hành chọn khoảng cách dọc phố, nhưng source draft trước đây gộp khu phố và độ dài một cạnh; thay BEFORE còn giữ cảnh báo Sense diện tích và ranh giới đó. AFTER bỏ cảnh báo này, đồng thời khẳng định độ dài thay đổi theo phố/thành phố. Cần owner/nguồn quyết định phạm vi trước khi xóa ghi chú; chưa áp dụng.
- `2H2I-R2-P003` — **APPLY_ELIGIBLE**: Cành cây chặn lối đi, bản dịch nêu cùng vật cản và lối bị chắn. AFTER cung cấp object chuyển tiếp road/path/entrance cùng biến tố regular, không thêm nghĩa phố hay ảnh hưởng Sense danh từ block.
- `2H2I-R2-P004` — **APPLY_ELIGIBLE**: Đặt bàn cho sáu người khớp cấu trúc đặt trước và câu tiếng Việt. AFTER cho khung ngoại động book a ticket/room/table; cụm for a date/number of people được câu hiện tại làm ví dụ, không đổi nghĩa reserve.
- `2H2I-R2-P005` — **APPLY_ELIGIBLE**: Bát là vật đếm được; pour soup into a bowl khớp ví dụ và bản dịch. AFTER giữ countability, collocation a bowl of soup/into a bowl và số nhiều bowls; không đưa động từ thi đấu bowl vào nghĩa này.
- `2H2I-R2-P006` — **DEFER_SEMANTIC_RISK**: Ví dụ broadly applicable across departments phù hợp nghĩa áp dụng trên nhiều lĩnh vực. AFTER còn bổ sung broadly supported và 'acceptance' cùng người, trong khi nguồn/định nghĩa hiện tại không chứng minh collocation hay sắc thái chấp nhận đó; ranh giới với broadly speaking/generally cũng còn mở. Giữ nguyên note hiện tại cho tới khi có rà soát từ vựng sâu hơn.
- `2H2I-R2-P007` — **APPLY_ELIGIBLE**: Ví dụ five bucks là danh từ đếm được khẩu ngữ và bản dịch giữ giá năm đô la nhưng không tự gán quốc gia/loại dollar. AFTER diễn tả đúng số ít/số nhiều và giữ yêu cầu dựa vào ngữ cảnh để biết loại tiền; không thêm nghĩa con vật/động từ.
- `2H2I-R2-P008` — **APPLY_ELIGIBLE**: Cáp nối màn hình với máy tính khớp định nghĩa bó dây truyền tín hiệu, ví dụ và bản dịch. AFTER thêm mẫu danh từ đếm được, connecting two devices và with a cable; không mở rộng sang dây chịu lực.
- `2H2I-R2-P009` — **APPLY_ELIGIBLE**: Definition và bản dịch nêu nhất quán CO₂; câu ví dụ nói thực vật sử dụng khí này. AFTER chỉ hướng dẫn danh từ thường không đếm được và dùng molecule khi đếm từng đơn vị, không sửa hay mở rộng khẳng định khoa học trong definition. Cảnh báo subject-review và provenance vẫn được lưu riêng.
- `2H2I-R2-P010` — **DEFER_POS_OR_IDENTITY**: AFTER phân tích cosmopolitan city như một noun phrase và số nhiều cosmopolitan cities, nhưng chính BEFORE ghi owner chưa quyết định đây là Lexeme hay construction/example. Dù câu mẫu đúng, dùng AFTER sẽ ngầm chốt cách biểu diễn lexical; cần owner quyết định trước.
- `2H2I-R2-P011` — **REJECT_INCORRECT_AFTER**: AFTER có câu 'Gas emissions names substances released into the air' sai hòa hợp chủ-vị (emissions name) và nói về emission chứ không phải grammar/collocation của greenhouse gas. Không áp dụng; giữ nguyên Sense DRAFT và ghi nhận cần một đề xuất khác có nội dung đúng.
- `2H2I-R2-P012` — **DEFER_POS_OR_IDENTITY**: Định nghĩa và ví dụ lamp/light khớp danh từ đếm được, nhưng source identity cho nhóm light còn owner-reviewed exclusion và nghĩa anh em chưa được xử lý. AFTER xóa dấu vết đối chiếu Master khỏi trường hiện tại. Dù metadata sẽ còn nguyên, chưa gộp xử lý identity vào pilot này.
- `2H2I-R2-P013` — **DEFER_POS_OR_IDENTITY**: Ví dụ lit the candle khớp nghĩa ngoại động 'thắp nến'; dạng lit/lighted là biến thể được đề xuất hợp lý. Tuy nhiên nhóm light vẫn mang owner-reviewed exclusion/identity review đang mở. Giữ nguyên nội dung và decision trail đến khi identity scope được rà soát cùng nhóm anh em.
- `2H2I-R2-P014` — **DEFER_INSUFFICIENT_EVIDENCE**: Câu record an interview hỗ trợ ngoại động, nhưng AFTER đưa khẳng định trọng âm danh từ/động từ trong khi chính BEFORE yêu cầu pronunciation review và source evidence không cung cấp pronunciation. Không suy ra trọng âm từ đây; không áp dụng một phần vì proposal là một field thay thế nguyên khối.
- `2H2I-R2-P015` — **APPLY_ELIGIBLE**: Office keeps a record of every equipment repair cùng bản dịch chỉ hồ sơ lưu về mỗi lần sửa chữa. AFTER nêu countable record, plural records và of + đối tượng thông tin; câu cuối là learner-facing complement guidance, không đưa Sense đĩa ghi âm vào nội dung.
- `2H2I-R2-P016` — **DEFER_SEMANTIC_RISK**: Ví dụ generator ran quietly là ngoại động? Ở đây run dùng nội động, khớp máy phát điện tự chạy. AFTER thêm run a program là khung chuyển tiếp, có thể làm mờ khác biệt operation/function đã được ghi là cần boundary review; chưa đưa cấu trúc ấy vào grammar note.
- `2H2I-R2-P017` — **APPLY_ELIGIBLE**: Gia đình điều hành tiệm bánh khớp nghĩa quản lý tổ chức và bản dịch. AFTER giữ tân ngữ business/organization và nêu đúng bất quy tắc run–ran–run; không gộp với Sense di chuyển nhanh hay Sense máy hoạt động.
- `2H2I-R2-P018` — **DEFER_POS_OR_IDENTITY**: Ví dụ fill a glass with water và bản dịch xác nhận nghĩa chất lỏng không đếm được. Tuy nhiên BEFORE chứa quyết định owner-reviewed rằng runtime #11 không đồng nhất với cặp Master bị loại trừ; việc xóa câu đó khỏi note lúc này cần re-review chung cặp noun/verb. Không đổi #11 hoặc identity state.
- `2H2I-R2-P019` — **DEFER_POS_OR_IDENTITY**: We watered the young trees khớp nghĩa tưới cây, bản dịch và khung ngoại động. Nhưng ghi chú hiện tại lưu rõ cặp verb này từng được owner loại khỏi quan hệ Master cụ thể; không thay nội dung có thể che mờ nghĩa của quyết định đó trước khi rà soát cặp. Không cấp hay thay identity.

## Cumulative DRAFT overlay

- Applied 12 field corrections across 12 Senses; cumulative applied corrections: 18 across 18 revised Senses.
- Projection remains 1,563 Senses / 1,020 authored groups. The other 1,551 rows are byte-content-hash unchanged from Batch 02.
- Re-reviewed the complete original batch: 37 Senses, 19 PASS, 18 REVIEW, 0 FAIL. All 12 edited fields individually passed the bounded AI DRAFT content review.
- The 9 deferred and 1 rejected proposal remain unapplied. The three prior lot/waste/aggregate deferrals and six prior applied corrections are preserved.
- Historical QA, all 141 original proposal records and all eight boundary proposals remain unchanged.

## Preserved limits and validation

All content remains DRAFT, rights UNKNOWN_REVIEW_REQUIRED, content approval PENDING, and release eligibility NO. No owner approval, canonical ID, rights clearance, database access/write, Production operation, Master release change, or legacy mutation occurred.
The known v2.2.0 release-tree diagnostic remains 4/5; Hybrid-100 v2.2.1 is checked independently. The bulk-500 regression remains FAIL/2 errors pending separate test-fixture encoding authorization.

## Next recommendation

Continue only with a separately authorized bounded DRAFT remediation checkpoint after review of this overlay and the outstanding queue. Do not repair the protected bulk-500 fixture or start a new authoring cohort under this checkpoint.
