# Local issue tracker

## Phạm vi đã cấu hình

Chủ sản phẩm chọn ticket Markdown local cho chiến dịch
`editorial-refresh-20261028` ngày 29/10/2026. Ngày 01/11/2026, chủ sản phẩm
duyệt thêm tracker Markdown local cho nhóm `practice-game-video-20261101`.
Hai phạm vi có ID/index riêng; chưa chọn tracker mặc định cho các việc khác.

### Chiến dịch biên tập dữ liệu

- Entry point: [tracker chiến dịch](../../.scratch/editorial-refresh-20261028/README.md).
- Ticket: một Markdown mỗi việc trong `.scratch/editorial-refresh-20261028/issues/`.
- ID 01–15 giữ số theo dependency order đã duyệt. Blocked by dùng ID/title,
  không dựa vào thứ tự thư mục để suy điều kiện chạy.
- [index.json](../../.scratch/editorial-refresh-20261028/index.json) dùng để tra
  đường dẫn, dependencies và các mẫu lô. Nội dung/trạng thái từng Markdown là
  nguồn chuẩn; điều phối đồng bộ index và bảng mục lục khi thay đổi.
- Không có parent issue từ tracker bên ngoài cần sửa/đóng. Không gửi việc sang
  GitHub, Linear hoặc các chat khác trong bước xuất local.

### Luyện tự do, Game bắn cá và Học YouTube

- Entry point: [tracker tính năng](../../.scratch/practice-game-video-20261101/README.md).
- Một Markdown mỗi ticket trong `.scratch/practice-game-video-20261101/issues/`.
- ID 01–21 theo dependency order đã duyệt; không dùng ID để tham chiếu ticket
  biên tập cùng số. Luôn kèm tên phạm vi nếu giao việc ngoài tracker này.
- [index.json](../../.scratch/practice-game-video-20261101/index.json) tra đường
  dẫn, nguồn spec, AC, coverage và blocking edges. Nội dung/trạng thái từng
  Markdown là chuẩn; đồng bộ index/mục lục khi trạng thái thay đổi.
- Spec tổng hợp và sơ đồ 21 lát cắt đã được duyệt. User chọn “Duyệt, xuất Markdown
  local”, đồng thời duyệt xuất ở `planned`, `Execution authorized: no`. Đây là
  ngoại lệ rõ ràng với trạng thái mặc định ready-for-agent của skill.
- Thứ tự sản phẩm Luyện → Game → Video; cạnh kỹ thuật không thêm phụ thuộc giả.
  Frontier kỹ thuật 01/13 không có nghĩa đã giao cả hai. Ticket đề xuất làm đầu là 01.
- Chưa tạo issue trên dịch vụ ngoài, chưa giao agent code hoặc thay gate story.

## Giao việc

Quy tắc triage dùng cho cả hai tracker. Đoạn sau ghi lịch sử giao việc ban đầu
của chiến dịch biên tập; không áp các số/trạng thái lịch sử đó cho tracker tính năng.

Đọc [vocabulary triage](triage-labels.md) trước khi đặt trạng thái. Ban đầu user
duyệt xuất ticket, nên các ticket được tạo `planned`, `Execution authorized: no`.
Sau đó user giao 01, rồi 02/03 song song và tiếp tục04. 01–04 đã hoàn tất
local/bản thảo; 05–15 vẫn `planned`. Đây là ngoại lệ có chủ đích với mặc định `ready-for-agent` của skill;
không coi việc xuất ticket là story `READY FOR IMPLEMENTATION`.

Khi chủ sản phẩm giao thực thi, áp dụng phạm vi được giao và quy tắc story
trong AGENTS.md; chỉ lấy frontier có blocker đã hoàn tất. Không tự đổi gate
phát hành hay gọi provider từ một ticket tổng quan. Các cấu hình chưa chốt
được ghi trong JSON kế hoạch chung.

Ticket 10–14 là mẫu lô giới hạn. Sau baseline, điều phối tạo instance có ID
riêng, batchId, ID/hash đầu vào và phạm vi sở hữu. Mỗi instance có một file;
không ghi đè mẫu hoặc dùng lại ID cho hai lô. Việc 15 đợi mọi instance thuộc
phạm vi, không chỉ đợi năm mẫu. Các lô legacy phải được hạch toán theo baseline.
