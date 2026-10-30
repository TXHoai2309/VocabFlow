# Ticket 02 — local tương thích và preview học thật

Trạng thái: **HOÀN TẤT LOCAL**. Chủ sản phẩm giao riêng 02 và 03 ngày 29/10/2026.
02 đưa schema Docker hiện có lên đúng các migration đã có trong repo, có
snapshot trước thay đổi và kiểm tra toàn vẹn sau đó. Không sửa app runtime,
không chạy migration remote, không reset/import/đổi ID hoặc viết từ mới.

## Thay đổi đã áp dụng

Target xác minh trước và sau kết nối: `127.0.0.1:55432/vocabflow_dev`, role
migration chuyên dụng, protected local identity `docker-local/development`.
Không nạp `.env` của app hoặc Neon. Bộ thực thi dùng đường đi local có sẵn,
giữ nguyên các ràng buộc least privilege và lịch sử Drizzle.

| Migration đã có trong repo | Thay đổi |
| --- | --- |
| 0019_light_penance | Thêm bảng nghĩa Việt ngắn; bảng mới vẫn rỗng, không nhập nghĩa ngắn |
| 0020_learning_topic_review | Thêm review status và quan hệ chủ đề cha, cùng backfill metadata có điều kiện đã viết trong migration |
| 0021_flashcard_display_mode | Thêm tùy chọn hiển thị với mặc định SELF_RECALL |

Không tạo SQL migration mới hoặc giả lịch sử. Ba migration có timestamp mới
hơn prefix đã có. Một dòng lịch sử cũ `0019_lucky_ironclad` có trong bản local
nhưng không còn SQL gốc được giữ **nguyên vẹn**, không đánh đồng với 0019 mới.
Hash và nguồn lịch sử của dòng đó được ghi trong plan/backup evidence.

## Snapshot và bảo toàn

- Dump PostgreSQL custom trước thay đổi: **4.335.081 bytes**, SHA-256
  `85293117ddfb1c1d46ce63f474e7fc42b9a51bb0a2472a7ce2ffd25c4d3e432b`.
- Có bản globals không chứa mật khẩu role. Dump đầy đủ có dữ liệu DB local,
  nên nằm trong thư mục bị Git ignore; không đưa dump vào Git hoặc log.
- Đã kiểm tra TOC và decode mọi section bằng `pg_restore --file=/dev/null`.
  Đây là kiểm tra đọc archive, **chưa thực hiện restore vào DB**.
- Có quy trình recovery vào DB local cách ly, không dùng `--clean` đè trực
  tiếp DB đang chạy vì dump cũ không có các object mới.
- Fingerprint **30 bảng cũ** trong app/protected schema giữ nguyên, chỉ bỏ
  qua đúng các cột additive mới khi so sánh. Role, grant schema, sequence app
  và toàn bộ prefix lịch sử migration đều không đổi; lịch sử thêm đúng ba dòng.

| Dữ liệu được bảo toàn | Trước | Sau |
| --- | ---: | ---: |
| Runtime vocabulary | 7.341 | 7.341 |
| V2 projection | 7.311 | 7.311 |
| Learner progress | 1 | 1 |
| Review event | 1 | 1 |

Kiểm tra lại sau browser smoke vẫn đạt tất cả fingerprint. Không xuất payload
hàng account/learner vào báo cáo; snapshot evidence chỉ có count/hash.

## Luồng app thật đã kiểm tra

Chạy API source hiện tại và Vite trên loopback, bindings chỉ lấy từ file local
chuyên dụng. Không giả response API; Chromium đọc chính DB Docker sau migration.
Browser chặn mọi API mutation và request ngoài origin local; không tạo account.

| Kiểm tra | Kết quả |
| --- | --- |
| Learning index | Đúng 7.311 V2 IDs của baseline |
| Browse A1 | Đúng 1.008 nghĩa |
| Browse Chưa phân loại | Đúng 1.772 nghĩa |
| A1 × lớp 1 chưa có placement | Rỗng, không mở rộng scope |
| Desktop 1440px, A1 | Vocabulary → Setup → Study → lật thẻ, đúng ID/phạm vi |
| Mobile 390px, Chưa phân loại | Cùng luồng, đúng ID/phạm vi, không tràn ngang |

Không bấm ghi kết quả review trên account. Hai flow guest chỉ mở/lật thẻ,
không thay dữ liệu PostgreSQL. Các mức nền tảng vẫn disabled vì chưa có item
được tuyển chọn. Local media vẫn trống theo baseline, nên không có ảnh/audio
hiện là hành vi đúng; việc phục hồi hoặc sinh media thuộc các ticket sau.

Screenshot desktop browse và mobile study đã được xem trực tiếp. Lượt smoke
cuối cùng PASS, không page error, không API mutation, không request ra ngoài.
Các lần thử đầu được giữ trong local evidence: một lần timeout khi thư viện
khởi động chậm, một lần assertion helper trên option native; helper đã sửa và
lượt cuối đạt. Không có thay đổi UI/product để xử lý hai lỗi của harness này.

## Bằng chứng và kiểm tra lại

- [JSON kết quả](ticket-02-local-preview.result.json) ghim plan, before/after,
  applied receipt, backup decode và báo cáo browser/screenshot cuối cùng.
- [Recovery notes local](../../../.vocabflow-local/editorial-refresh-20261028/ticket02-local-compat-v1/recovery-notes.md).
- [Báo cáo browser thật](../../../.vocabflow-local/editorial-refresh-20261028/ticket02-preview/514bd87d-e932-443f-b7d8-f3d79c19fb47/report.json).

Các lệnh chỉ đọc/kiểm tra, chạy từ gốc repo:

```text
node --import tsx scripts/editorial-local-compat-v1.mts verify
node --import tsx --test scripts/editorial-local-compat-v1.test.mjs
node scripts/editorial-preview-smoke-v1.mjs
```

Harness cuối tự chạy server mình sở hữu trên 3002/5173 và dừng chúng khi xong;
nếu cổng đang bận thì từ chối dùng nhầm server. Không chạy lại `apply`: việc
apply cùng plan đã xong sẽ bị từ chối để tránh ghi lặp.

**9/9 guard tests** đạt. Bốn suite migration liên quan đạt **21/21**.
Browser thật có **4 kiểm tra API + 2 flow PASS**; verify fingerprint sau browser
PASS. Đây là xác minh local, không thay thế Trusted DB CI hoặc kiểm tra account
ghi review; không có deployment hoặc thay đổi Production.
