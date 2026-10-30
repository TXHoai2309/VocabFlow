# Local issue tracker

## Phạm vi đã cấu hình

Chủ sản phẩm chọn ticket Markdown local cho chiến dịch
`editorial-refresh-20261028` ngày 29/10/2026. Quyết định này cung cấp tracker
cho skill to-tickets ở chiến dịch này; chưa chọn tracker mặc định cho các việc
khác trong repo.

- Entry point: [tracker chiến dịch](../../.scratch/editorial-refresh-20261028/README.md).
- Ticket: một Markdown mỗi việc trong `.scratch/editorial-refresh-20261028/issues/`.
- ID 01–15 giữ số theo dependency order đã duyệt. Blocked by dùng ID/title,
  không dựa vào thứ tự thư mục để suy điều kiện chạy.
- [index.json](../../.scratch/editorial-refresh-20261028/index.json) dùng để tra
  đường dẫn, dependencies và các mẫu lô. Nội dung/trạng thái từng Markdown là
  nguồn chuẩn; điều phối đồng bộ index và bảng mục lục khi thay đổi.
- Không có parent issue từ tracker bên ngoài cần sửa/đóng. Không gửi việc sang
  GitHub, Linear hoặc các chat khác trong bước xuất local.

## Giao việc

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
