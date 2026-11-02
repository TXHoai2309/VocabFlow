# 10-01: Rà soát 51 nghĩa A1/A2 đang có — lô đầu của ticket10

**Status:** superseded-local-preview — US64 đã thay kho local theo lựa chọn của chủ sản phẩm. Bản review/nguồn bên dưới giữ lịch sử; không còn mở bộ30 để học kho mới.

**Ưu tiên mới30/10:** kho mới1.547mục nằm trong bộ31/32/33; xem [US64](../../../docs/stories/US-64-owner-editorial-local-catalog.md).

**Lịch sử tiếp tục r0002:** chủ sản phẩm giao “oci làm 10 đi”. Bộ học local30có đúng51
nghĩa,19ảnh/20audio từ/17audio câu đã ghép vào20nghĩa;31nghĩa chỉ có chữ.
Giữ riêng3clip khác câu và ảnh afternoon không rõ buổi chiều. Học khách và
phát audio thật đã kiểm tra;dịch vụ tài khoản/ownership cũng PASS,không đăng
nhập tài khoản trên browser. KEEP51,0đổi ID/text/version/progress,0job mới.
151tests/API-web typecheck/changed lint/build PASS;root tooling typecheck còn
lỗi ngoài thay đổi10. Xem [bàn giao r0002](../../../docs/plans/editorial-refresh-2026-10-28/ticket-10-01-local-preview-r0002.md).

Các mục bên dưới ghi hiện trạng r0001 trước tích hợp;không ghi đè bản đóng băng.

**Execution authorized:** yes — chủ sản phẩm yêu cầu “rồi làm cho tôi ticker tiếp” ngày30/10/2026, sau khi dừng sản xuất từ/media mới.

**Blocked by:** 07 — đã được chủ sản phẩm nghiệm thu local.

**Owner:** current-coordinator; một phiên, không giao chat khác.

**Batch ID:** `ticket10-a1-a2-batch-0001`.

**Batch scope:** 51 nghĩa,35 nhóm từ,27A1/24A2. Chọn theo thứ tự headword,
lấy đủ nhóm “all” nên tăng từ50lên51. Danh sách ID/hash nằm trong
`vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001/input-manifest-r0001.json`,
SHA256 `9ead950dbcd9fafd5a4c25b8b9e099c4baddb15627f63135bf5f5c6d8ca327cd`.
Đây là subset có quyền sở hữu theo từng ID từ5shard nguồn; không sửa shard
nguồn hoặc giao lại51ID này cho lô khác. Không có nghĩa anh em ngoài phạm vi.

## Phạm vi đã thực hiện

- Đọc toàn bộ nghĩa Anh/Việt, ví dụ song ngữ và POS của51mục; KEEP51,không sửa chữ.
- Xác minh nội dung/hash/version/CEFR của51mục khớp DB Development và API thật.
- API learning-index có đủ51ID trong các bộ CEFR hiện có; không tạo bộ học mới.
- Mỗi mục có reviewer,note,hash nguồn và receipt review độc lập lịch sử đã đối chiếu.
  Không nhận là có review độc lập mới; không đánh giá lại CEFR hay gán lớp học.
- Ghi JSON đề xuất20ảnh+20audio từ+17audio câu khớp nguyên văn từ media đã lưu.
  Giữ riêng3clip khác câu của adult/afraid/afternoon,không gắn nhầm theo headword.
- Kiểm tra bytes của26mapping media lịch sử đã bỏ trùng; vẫn là ứng viên chưa
  được nghiệm thu ngữ nghĩa/phát âm mới. Ba ảnh biến thể chỉ là ứng viên minh họa
  nghĩa từ,khác cảnh câu nguồn; riêng afternoon không đủ để chấm phân biệt buổi.
- Đóng ZIP bàn giao168member,CRC và toàn bộ SHA/length khớp. Không sinh media,
  gọi Muse,ghi DB hay thay app.13fingerprint bảng nội dung/account/progress giữ nguyên.

## Acceptance criteria của lô đầy đủ

- [x] Mỗi ID có disposition,người rà,hash đã đọc; không có sửa đổi cần review mới.
- [x] Sở hữu đủ nhóm nghĩa và không ghi đè ngoài lô; giữ nguyên51ID/progress.
- [x] Xác minh membership CEFR hiện có và xuất đề xuất media có dependency chính xác.
- [ ] Áp dụng media phù hợp vào local runtime,kiểm tra từ/câu/ảnh trên luồng học thật.
- [ ] Đóng lô theo đầy đủ tiêu chí mẫu10 sau khi có bằng chứng runtime.

**Điểm còn lại:** API của cả51mục hiện trả media rỗng. Adapter/namespace
`editorialLocalPreview` đang dành cho pilot07 và tự gắn `EDITORIAL:FIRST_WORDS`;
không dùng namespace đó để biến51mục A1/A2 thành bộ30từ đầu tiên. Gallery mới
là bảng đối chiếu offline,không thay cho nghiệm thu luồng học. Không tạo thêm
từ/ảnh/TTS để lấp phần thiếu trong lúc chủ sản phẩm đang tạm dừng sản xuất.

**Bàn giao:** [báo cáo](../../../docs/plans/editorial-refresh-2026-10-28/ticket-10-01-existing-a1-a2-review.md).
JSON máy đọc: `vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001/handoff-r0001.json`.
Ticket10toàn nhóm và15toàn chiến dịch vẫn chưa hoàn tất.
