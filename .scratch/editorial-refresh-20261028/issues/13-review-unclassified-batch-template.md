# 13: Xử lý một lô chưa phân loại bằng bằng chứng

**Ưu tiên mới30/10/2026:** template này được supersede cho kho local đang hoạt động bởi US64. Chủ sản phẩm đã chọn ba gói Muse1.547mục và loại kho cũ; không tuyên bố review toàn corpus hoàn tất. Phần bên dưới giữ lịch sử kế hoạch.

**What to build:** Khoảng 50 Sense được kiểm tra và có nhãn có căn cứ hoặc giữ Chưa phân loại với lý do rõ, hoạt động đúng trong bộ lọc và học local.

**Blocked by:** 07 — Pilot đầu tiên hoạt động đầy đủ trong học local.

**Status:** superseded-for-active-local-catalog

**Execution authorized:** no

**Batch scope:** Mẫu lô giới hạn; trước khi giao phải có batchId, danh sách ID/hash đóng băng và người sở hữu. Mỗi instance có ID riêng, không giao toàn bộ kho chưa phân loại trong một phiên.

- [ ] Ưu tiên enrichment đã khớp hash; không đổi unknown thành Nền tảng và không suy CEFR từ tuổi.
- [ ] Giữ Chưa phân loại nếu chưa có căn cứ; ghi rõ bất đồng, lý do và trạng thái chờ.
- [ ] Mọi ID được hạch toán; mọi thay đổi có review độc lập gắn với hash đã đọc.
- [ ] Bộ lọc và học local thể hiện đúng kết quả của lô, không mở rộng scope hoặc thay đổi danh tính/tiến độ.
