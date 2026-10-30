# Ticket10-01 — Rà soát lô đầu 51 nghĩa đang có

Ngày30/10/2026,chủ sản phẩm giao ticket tiếp theo sau khi dừng tạo thêm từ và
media. Đã hoàn tất phần biên tập chữ và kiểm tra hiện trạng cho51nghĩa A1/A2.
Trạng thái máy đọc: `EDITORIAL_REVIEW_COMPLETE_RUNTIME_MEDIA_BINDING_PENDING`.
Lô đầy đủ vẫn `in-progress` vì chưa áp dụng media vào luồng học local.

## Phạm vi và kết quả

| Nội dung | Kết quả |
| --- | --- |
| Nghĩa sở hữu |51 thuộc35nhóm từ,27A1/24A2 |
| Cách chọn | Headword theo alphabet,từ a/an đến all; giữ trọn nhóm nghĩa |
| Nội dung chữ |51KEEP;0sửa,0từ mới |
| DB local/API |51ID/hash/text/examples/CEFR/version khớp baseline |
| Bộ học hiện có | Cả51có membership:27trong CEFR A1,24trong CEFR A2;1còn thuộc gợi ý Business English |
| Media API hiện tại |51mục chưa có ảnh/audio được trả về |
| Gói đã có khớp đủ nội dung |17nghĩa từ BASIC-PLUS500 |
| Cùng nghĩa,khác câu đơn giản |3nghĩa từ BASIC500:adult noun,afraid,afternoon |
| Đề xuất dùng lại |20ảnh,20audio từ,17audio câu;chưa kích hoạt |
| Audio giữ riêng |3clip câu khác nguyên văn;không gắn vào câu hiện tại |
| Media lịch sử |52mapping nguồn,rút còn26mapping ID/kind/hash;bytes đều khớp,không coi là nghiệm thu mới |
| Tác động |0ghi DB,0provider,0job mới,0đổi app/ID/tiến độ |

Đã đọc nghĩa song ngữ,vị trí từ loại và ví dụ của từng mục. Các nhóm đa nghĩa
accept/accident/across/act/action/against/age/agree/all được giữ riêng;“a,an”
là mạo từ,không chuyển thành bài chữ cái. Giữ source CEFR,không quy đổi sang
lớp học và không coi toàn bộ lô là nội dung tuyển chọn cho trẻ nhỏ.

Receipt review độc lập cũ đã được kiểm tra đúng proposalKey/hash/PASS của51mục.
Lần này là review của điều phối,không nhận là một review độc lập mới. Không
sửa chữ nên không phát sinh nội dung mới cần receipt độc lập.

## Ba trường hợp cần giữ đúng binding

| Nghĩa | Câu hiện có | Clip sẵn có được giữ riêng |
| --- | --- | --- |
| adult NOUN31365 |Two adults volunteered to help the children paint. |An adult helps the children cross the road. |
| afraid30833 |The child was afraid of the loud thunder. |The child is afraid of the loud noise. |
| afternoon30834 |We spent the afternoon repairing the garden fence. |We play football in the afternoon. |

Không thay câu gốc để khớp audio chỉ vì tên từ giống nhau. Ba ảnh tương ứng
đã được điều phối xem lại:tranh minh họa nghĩa từ ở bối cảnh đơn giản,không
minh họa chính xác ba câu hiện có. Ảnh afternoon chỉ thể hiện chơi bóng ban
ngày,không đủ làm đáp án nhận biết riêng buổi chiều. Các slot này vẫn là đề
xuất offline,chưa phải media đã được áp dụng hoặc nghiệm thu luồng học.

## Hiện trạng runtime và bước còn lại

API public vocabulary trả đúng51ID và API learning-index xác nhận membership
CEFR đang có. Không tạo collection51mục mới.13bảng content/collection/auth/
progress có fingerprint không đổi trong lần capture read-only;không xuất
account/session rows. Toàn bộ truy cập DB dùng container Development cũ tại
loopback,chế độ transaction read-only;không có migration/reset/import.

Namespace media hiện tại của pilot07 tự gắn FIRST_WORDS và dùng allowlist
riêng85asset. Gắn thẳng51mục vào đó sẽ làm sai phân loại pilot. Phần còn lại
của10-01là xử lý binding media sẵn có cho đúng51ID/hash trong namespace phù
hợp và xác minh luồng học. Không có thay đổi UI,adapter hay DB trong lần rà này.
Các nghĩa còn thiếu media chỉ được ghi nhận;không gọi lại Muse khi sản xuất
đang tạm dừng. Không đánh dấu hoàn tất cả mẫu10 hoặc toàn chiến dịch15.

## Artifact và kiểm tra

Data root:
`vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001/`.

- `input-manifest-r0001.json`:51ID,nội dung đầu vào và pin nguồn;SHA256
  `9ead950dbcd9fafd5a4c25b8b9e099c4baddb15627f63135bf5f5c6d8ca327cd`.
- `editorial-dispositions-r0001.json` và `review-r0001.csv`:note riêng từng nghĩa.
- `media-reuse-proposal-r0001.json`:job/item/path/hash/receipt và dependency từng slot.
- `variant-image-context-review-r0001.json`:giới hạn ngữ cảnh ba ảnh biến thể.
- `handoff-r0001.json`:kết quả và checksum toàn bộ bàn giao.

Local evidence root:
`.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001/`.
Có live capture/verification,membership observation và `review-gallery-r0001.html`.
Gallery có51card,20ảnh và37audio control;đây là bảng đối chiếu offline,không
phải bằng chứng media đang hoạt động trong học thật.

ZIP `ticket10-a1-a2-51-review-handoff-r0001.zip`:60,051,535bytes,168member,
SHA256 `e8f8a50954e128832592b8ef37581c6ef0c5a98e3344ac60cf60824b8f9b1297`.
Đã kiểm tra CRC và hash từng member. Gồm nội dung51mục,nguồn JSON được ghim,
media/receipt dùng làm bằng chứng và tooling;không phải backup toàn bộ media
của các bộ500/547nguồn. Ba gói hoàn tất trước đó giữ nguyên.

Kiểm tra phù hợp phạm vi:đối chiếu51nội dung DB/API,51membership,source pins,
receipt/hash/length tất cả slot đề xuất,từ chối ghép3clip khác câu,bảo toàn
13fingerprint và archive168member. Không tuyên bố nghe lại toàn bộ audio,
đánh giá CEFR mới hoặc kiểm thử UI. Không chạy lại bộ build/E2E của app vì
không thay mã ứng dụng.
