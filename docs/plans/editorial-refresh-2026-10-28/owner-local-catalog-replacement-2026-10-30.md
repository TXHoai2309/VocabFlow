# Kho local mới: 1.547 mục đã chọn từ ba bộ Muse

Ngày30/10/2026, chủ sản phẩm chốt: “giữ lại các từ hôm qua đến nay bắt đầu
soạn mới qua muse, xóa sạch những data cũ đi”. Việc thay kho đã áp dụng vào
PostgreSQL local `vocabflow_dev`; chưa thay DB remote hoặc triển khai web.
Không tạo thêm từ, ảnh hay TTS trong đợt thay kho này.

## Kết quả và phạm vi xóa

- Giữ đúng ba gói EXPANSION547, BASIC500, BASICPLUS500: **1.547 mục**, không
  trùng headword giữa ba gói. Không tính chữ cái/câu giao tiếp08–09 vào tổng này.
- Kho trước có7.341 dòng. Giữ905ID tương ứng các mục đã chọn, bổ sung642ID
  local, xóa6.436 dòng còn lại. Không cấp danh tính canonical Master mới.
- Dựng lại73chủ đề và76bộ học: ba bộ tổng547/500/500 và73bộ theo chủ đề.
  Quan hệ nhiều bộ–một mục và danh sách thành viên nằm trong JSON chung.
- Mỗi mục có ảnh, audio từ và audio câu ví dụ:4.641binding tới4.640file.
  `chair` và `sit` dùng chung audio cho đúng một câu ví dụ giống hệt nhau.
- Giữ tài khoản, hộ gia đình, hồ sơ người học, cài đặt, dữ liệu/tiến độ08–09,
  quyền DB, metadata bảo vệ và lịch sử migration cũ. Giữ tiến độ của905ID
  được giữ; chỉ bỏ progress/review/bookmark của từ bị loại.
- Theo phạm vi thay bộ học, xóa một assignment bộ cũ. Trong DB có một progress
  và một review thuộc từ bị loại đã được bỏ. Bản sao lưu trước thay kho giữ
  dữ liệu cũ; không xóa các gói nguồn hoặc bàn giao lịch sử trên ổ đĩa.

| Mức từ vựng hiện có | Số mục |
| --- | ---: |
| Từ đầu tiên, được tuyển chọn riêng |139|
| Sơ cấp A1 |731|
| Cơ bản A2 |544|
| Trung cấp B1 |132|
| Trên trung cấp B2 |1|
| Nâng cao C1 |0|
| Chuyên sâu C2 |0|
| **Tổng** |**1.547**|

139mục Từ đầu tiên không bị gán CEFR hoặc lớp học tùy tiện. Chữ/âm và Câu đầu
tiên là nội dung riêng08–09:18audio đã được chủ sản phẩm nghe duyệt, sáu âm
đơn vẫn thiếu bản ghi phù hợp. Đợt thay kho này giữ nguyên trạng thái đó.

## JSON chung, tên file và đường dẫn

Thư mục dữ liệu:
`vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001/`.

- `current.json`: con trỏ bản hiện hành, pin JSON/handoff/index ZIP.
- `catalog-complete-r0001.json`: đủ1.547mục chữ, ví dụ song ngữ, mức, chủ đề,
 76bộ học, ID local, bằng chứng nguồn và mọi binding media.
- `catalog-plan-r0001.json`: danh sách giữ/xóa/cấp ID và kế hoạch đã áp dụng,
 SHA256 `09c1dcf07f9e9b76e3d45bfbf758b0171d92cae57d3ba15b52eebd8c1b68eef3`.
- `owner-selection-r0001.json`: quyết định giữ ba gói và xác nhận sử dụng media
 từ chủ sản phẩm; không tạo receipt Master PASS giả.
- `handoff-r0001.json`, `archive-index-r0001.json`: số lượng, bằng chứng kiểm tra
 và hash/length của gói bàn giao.

Khóa nối ổn định: `itemId`, `proposalKey`, `runtimeVocabularyId`; mỗi
`mediaEvidence` có `kind`, `jobId`, `asset`, `receipt`. File ảnh/audio giữ tên
`<sha256>.png` / `<sha256>.mp3`. `assets[].repoRelativePath` tính từ thư mục
VocabFlow là vị trí thật; `content.media` là URL phục vụ trong app local.
Không dựa vào thứ tự file hoặc tên từ để đoán quan hệ. Bản xuất giữ pin của
JSON nguồn và receipt gốc, đủ phân biệt cùng từ nhưng khác nội dung/audio.

Ảnh/TTS vẫn ở ba thư mục media gốc28–29/10, không nhân bản thêm gần3GB.
ZIP `owner-catalog-1547-manifests-r0001.zip` chứa JSON/bằng chứng/ảnh chụp màn
hình, **không chứa byte media**; dùng đường dẫn trong JSON để lấy file gốc.
ZIP không có `.env`, thông tin tài khoản hoặc dump DB.

547định nghĩa tiếng Anh giữ nguồn và giấy phép Open English WordNet; văn bản
tái sử dụng giữ lineage biên tập gốc. Nguồn tạo media được ghi Muse và quyết
định nghe/xem của chủ sản phẩm được giữ, không đổi thành review độc lập.

## Khôi phục và kiểm chứng

Backup riêng tư:
`.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001/backup.json`.
Dump4.409.188byte, SHA256
`bc1902263e73ac2aa0def2c9bfa5877ce784d66ace99b90c755ee623a5c5bc9a`.
Đã khôi phục thử vào DB scratch riêng, so fingerprint đủ34bảng trước thay
kho và xóa DB scratch sau kiểm tra. Không khôi phục đè DB đang dùng.

Migration0023thêm projection local riêng với metadata `OWNER_SELECTED_LOCAL`.
Chế độ `owner-local` chỉ hoạt động ở Node Development với DB loopback đã
chốt. Media chỉ được phục vụ qua allowlist/hash/length và không có route này
trong production runtime. Không sửa source Master hoặc gán PASS độc lập.

Bằng chứng tại cùng thư mục local:

- `application-result.json`: apply atomic, số dòng xóa, bộ học và fingerprint
 bảo vệ. Chạy lại apply trả `ALREADY_APPLIED_NO_WRITES`.
- `verification.current.json`: API đúng1.547ID, toàn bộ chữ/media/version,
 76bộ học, giao mức học, trường hợp rỗng, dịch vụ tài khoản và household boundary.
- `focused-tests.current.json`: **221test/15file PASS**. API/web typecheck riêng,
 lint TypeScript đã đổi, syntax scripts, build/secret scan/source-map scan PASS.
- `browser-verification-r0001.json`: khách mở bộ547→setup→học5từ→lật thẻ,
 ảnh backpack1600×1600, audio từ/câu phát thật, câu2,52giây không lỗi.
 Đã sửa thanh audio câu bị co về0px; sau sửa rộng260px, không tràn ngang ở
 viewport nhỏ. Khôi phục viewport mặc định; không chấm thẻ hoặc ghi tiến độ thử.
- Trang chủ profile khách đang có1.544từ mới +3từ đã học =1.547. State khách
 được sao lưu trước khi lọc những ID đã loại, dưới Web Lock; giữ cài đặt.

`pnpm typecheck` toàn repo còn lỗi trong tooling backfill/pending/compat/
foundation ngoài US64; danh sách nằm ở `checks.current.json`. Không báo toàn
repo typecheck/test/lint PASS. Không chạy lại premium audit cũ khi công cụ đó
không còn sẵn trong phiên này. Đây là kiểm tra kỹ thuật và chọn kho local,
không phải tuyên bố nghe lại mọi file hoặc hoàn thành review toàn corpus.

## Ticket và bước tiếp nối

US64 đã triển khai local, sẵn sàng chủ sản phẩm kiểm tra. Preview bộ30của
10-01được thay bởi bộ31/32/33; kết quả biên tập và archive10-01vẫn giữ lịch sử.
Các template rà soát kho cũ10–13được supersede cho kho local đang hoạt động,
không đánh dấu “đã review xong”. Ticket14tiếp tục dừng tạo thêm theo yêu cầu.
Ticket15toàn chiến dịch và phần08–09còn thiếu không tự nhận hoàn tất từ việc
thay kho này. Không tự bắt đầu đợt tạo tiếp theo hoặc phát hành remote.
