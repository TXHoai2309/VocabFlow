# Ticket 04 — bản thảo pilot 30 từ đã đóng băng

Hoàn tất ngày **29/10/2026**, trong phạm vi **bản thảo offline** theo chỉ thị
tiếp tục sau 01–03. Đã tuyển chọn **30 nghĩa V2 hiện có**, biên tập nghĩa Việt
ngắn và viết 30 ví dụ song ngữ cho trẻ. **Không thêm từ mới vào kho** trong
bước này; 30 mục không được cộng vào mục tiêu khoảng 600 từ/cụm từ mới.

## Nội dung đã chọn

| Bộ tuyển chọn nháp | Số mục | Từ |
| --- | ---: | --- |
| Động vật quen thuộc | 8 | dog, bird, fish, duck, cow, horse, rabbit, sheep |
| Màu sắc quanh em | 8 | red, blue, green, yellow, black, white, orange, pink |
| Ở trường | 8 | book, pen, pencil, bag, desk, paper, school, classroom |
| Gia đình của em | 6 | mother, father, sister, brother, baby, family |

Đọc [toàn bộ nghĩa và ví dụ song ngữ](../../../vocabflow-dataset/workspaces/editorial-refresh-20261028/pilot-r0001/READABLE-DRAFT.md)
hoặc [JSON chung](../../../vocabflow-dataset/workspaces/editorial-refresh-20261028/pilot-r0001/manifest-r0001.json).
Các file này nằm trong thư mục Git ignore; gói bàn giao bên dưới mang đầy đủ
bản sao và checksum để phiên khác không cần tìm lại ở máy tác giả.

Mỗi mục giữ nguyên runtime ID/proposalKey/source content hash. Danh tính
Master Lexeme/Sense/Pronunciation/Example vẫn null, chờ hòa giải; UUID của lô,
job và bản diễn đạt chỉ là mã vận chuyển kỹ thuật. Ví dụ mới có draft reference
riêng, không mượn exampleKey của câu cũ. Không sửa bản gốc hoặc lịch sử học.

Đã quét 7.341 hàng runtime, 7.320 mục review queue, 5.004 record Oxford và
4.673 record Vocab4600 theo headword/display/source forms, biến thể và legacy.
Kết quả chỉ là ứng viên trùng, không tự hợp nhất nghĩa. `fish` chọn con cá,
`book` chọn sách, `orange` chọn tính từ màu cam; `green` và `pink` giữ POS danh
từ nên câu dùng “I like green/pink”. `cow` giữ rõ bò cái. `baby` không lấy
nghĩa em út đã trưởng thành.

Sáu nhóm tìm kiếm `cat`, `pig`, `chair`, `ruler`, `eraser`, `student` được lưu
riêng, **chưa phải khoảng trống mới đã xác minh**. Chẳng hạn tìm cả `seat`
và `pupil` phát hiện thêm ứng viên cho chair/student, trong khi cat/student
còn bản legacy. Không viết trùng hoặc xóa/merge những hàng đó.

## Placement và review

Đề xuất dùng nhóm **Từ đầu tiên**, với ví dụ nghe/đọc có người lớn hỗ trợ.
Đây là tuyển chọn biên tập, không suy từ CEFR. 27 mục được đề xuất phù hợp
cả lớp 1–2; classroom/sister/brother đề xuất lớp 2 vì cần giới thiệu thêm
our/quan hệ lớn-nhỏ. Mọi tuổi vẫn có thể tự chọn học, không ép thứ tự.
25 mục đang mang A1 và 5 mục chưa có CEFR trong baseline; giữ nguyên cả hai.
Không khẳng định bám sách hoặc chương trình chính thức.

Bốn nhóm trên là **bộ tuyển chọn nháp**, không phải bốn topic canonical đã
được tạo/duyệt. Động vật có ứng viên nhóm cha nature; gia đình có topic runtime
family; trường học cần mapping theo từng loại đồ vật/địa điểm. Màu sắc chưa
có topic phù hợp nên giữ chờ, không gán đại vào light. Review status hiện tại
của topic trong DB không được suy từ snapshot trước migration. Tất cả membership
đều đề xuất, chưa nhập runtime.

Phiên `/root/ticket04_independent_review` đã đọc đủ 30 mục, đối chiếu source/
crosswalk hashes và kiểm tra 90 work-order slots. **PASS_DRAFT_ONLY**, không
còn lỗi chặn. [Receipt riêng](../../../.vocabflow-local/editorial-refresh-20261028/ticket04-review/independent-review-r0001.json)
ghim từng sourceRowHash/presentationHash và 9 file đã đọc. Đây là review AI
độc lập cho bản thảo; duyệt của chủ sản phẩm, danh tính, media và phát hành
vẫn là các cổng riêng. Không khẳng định đã nhìn ảnh hoặc nghe audio.

## Bàn giao ảnh và TTS

Manifest có 90 slot: 30 ảnh, 30 âm từ và 30 âm ví dụ. **5 ảnh được OMIT** cho
mother/father/sister/brother/family vì ảnh không tự chứng minh được quan hệ.
Do đó có **85 yêu cầu media tiềm năng**, chưa phải job được phép chạy.

| Loại | Cần xem xét | Có ứng viên cũ | Đã được duyệt cho pilot |
| --- | ---: | ---: | ---: |
| Ảnh | 25 | 6 mục | 0 |
| Âm từ | 30 | 11 mục | 0 |
| Âm ví dụ mới | 30 | 0 binding exact hiện có | 0 |

Gói kèm **18 file media ứng viên**, tổng 321.435 bytes: 7 ảnh/11 audio; một
ảnh family được giữ làm bằng chứng nhưng slot đó đã OMIT. Hash/size bytes đã
kiểm tra; đúng nghĩa/phát âm/quyền và delivery vẫn cần review trước khi dùng.
Nếu cả 6 ảnh và 11 âm từ đều đạt thì còn khoảng **68 output mới**; nếu không
dùng lại được gì thì tối đa **85**, chưa kể retry. Đây là dự toán, không phải
lệnh tạo hoặc báo giá. Attestation APKG hiện có được giữ đúng phạm vi,
không yêu cầu duyệt lại quyết định cũ và không áp nó cho media sinh mới.

Mỗi job ghi rõ target, text/brief, dependency hash, đường dẫn output/receipt.
Ảnh nhận semantic brief riêng; TTS nhận headword và đúng câu tiếng Anh mới.
Chưa chọn locale/voice/provider/phoneme/style nên `providerRequestHash=null`,
`executionAllowed=false`. Khi chốt cấu hình ở 05/06 phải cấp work order mới;
không nhầm dependency hash với hash request provider hoàn chỉnh.

Tên file không dùng từ vựng. Worker ghi
`.vocabflow-local/editorial-refresh-20261028/runs/<runUuid>/<jobUuid>/attempt-0001/output.png`
hoặc `output.mp3`, kèm `receipt.json` riêng. Format/MIME phải khớp bytes thực;
định dạng khác cần work order mới. Asset đã kiểm tra mới được điều phối đưa
vào `assets/images|audio/<fullOutputSha256>.<extension>`. Worker không sửa JSON
đóng băng hoặc tự duyệt kết quả.

## Gói bàn giao và kiểm chứng

- [Gói độc lập](../../../.vocabflow-local/editorial-refresh-20261028/ticket04-handoff-v1/README.md):
  30 payload files cùng package manifest/sidecar, gồm bản thảo, source excerpts,
  dedup audit, receipt review, media ứng viên và tool verifier Node core.
- [Kết quả máy đọc được](ticket-04-frozen-pilot.result.json): đường dẫn và hash.
- [Bằng chứng kiểm tra](../../../.vocabflow-local/editorial-refresh-20261028/ticket04-validation-v1/report.json).

Manifest bản thảo SHA-256:
`17bea1e964a0003a000d77a64d0899c61a473bc7068e60ccf9b4bab5523400d1`.
Package manifest SHA-256:
`16b07298fa7096d2bbd3ea1b92b7415daa758a135aa4672919adafb898fce786`.
Gói thực đã được sao sang receiving workspace và verifier chạy độc lập PASS.
Source excerpts có pin nguồn; chạy lại tìm kiếm toàn kho cần thêm ZIP baseline
ticket 01, không khẳng định gói nhỏ chứa toàn bộ corpus.

```text
node --test scripts/editorial-pilot-v1.test.mjs
node scripts/editorial-pilot-v1.mjs verify-package .vocabflow-local/editorial-refresh-20261028/ticket04-handoff-v1
```

**11/11 guard/integration tests PASS**: đổi bytes, sai Sense, mượn exampleKey,
trôi CEFR/ID tiến độ, sai câu audio, job vượt gate, self/partial review, thiếu
media và di chuyển package đều được kiểm tra. Tests tạo fixture riêng, không
sửa bản thảo; checkout thiếu dữ liệu Git ignore sẽ báo skip rõ ràng. Đã xác
minh 9 input pins của review và hash/size toàn bộ gói/media. Không cần chạy
lại UI suites vì không thay application source, schema hoặc DB trong ticket04.

Ticket04 hoàn tất bản thảo; **05/06 đã hết dependency kỹ thuật và có thể chạy
song song khi được giao cùng cấu hình media cần thiết**. Chưa gọi provider,
truy cập DB, tạo ảnh/audio mới, kích hoạt bộ lọc nền tảng hoặc thay Production.
Backup ngoài máy vẫn chưa được chọn; Git không lưu các artifact bị ignore.
