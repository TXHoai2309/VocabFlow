# 02: Chọn nguồn và quy mô buổi luyện đúng phạm vi

**What to build:** Người học chọn nguồn đã học/bộ học/mức học/từ đã lưu và
5/10/20/30 câu; buổi ảnh thực sự dùng đúng phần giao và số mục đủ điều kiện.

**Blocked by:** 01: Hoàn thành một buổi luyện ảnh chọn từ cho tài khoản

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 3, 4, 10, 13, 14. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Mặc định đã học, 10 câu; chưa có từ đã học thì chọn rõ nguồn khác để bắt đầu.
- [x] Lọc nguồn và điều kiện đủ nội dung trước tạo buổi; hiển thị số thực có,
  không mở rộng nguồn hay đổi kiểu trả lời khi ít lựa chọn.
- [x] Lưu nguồn/cấu hình/danh tính nội dung với buổi; API không nhận ID nằm ngoài
  nguồn đã được phục vụ hoặc chỉ tin danh sách target do client tự gửi.
- [x] Hợp đồng câu hỏi/nguồn phân biệt gợi ý và kiểu trả lời đủ rõ để mở ảnh,
  nghe, kết hợp và gõ ở các lát cắt sau mà không gắn lại với review queue writer.
- [x] E2E nguồn sáu mục/yêu cầu mười, giao nguồn rỗng, từ đã lưu và mức không
  phù hợp cho kết quả thật trên UI và bản lưu.

## Bằng chứng thực thi

US71 ACCEPTED: 27 scoped API/reader tests, 8 Chromium flows, typecheck/build/
changed-source ESLint PASS. Local PostgreSQL rollback rehearsal verifies source
SQL and unchanged learning state. Config/source/content pins persist privately;
duplicate session ID with changed config is rejected. No cloud migration.

## Ràng buộc chung

- UI → API/luật có thẩm quyền → lưu/đọc lại → kiểm thử hành vi đi cùng lát cắt;
  trường hợp chỉ ảnh hưởng phía khách vẫn kiểm chứng qua UI và lưu cục bộ.
- Dữ liệu riêng kiểm tra auth/quyền sở hữu hiện hữu; không tin ID hoặc điểm/
  tim/đúng-sai do client tự nhận. Logout/đổi tài khoản không lộ dữ liệu trước đó.
- Luyện/game/video không thay ngày ôn, revision học chính, số từ đã học, XP,
  chuỗi hoặc từ yếu/lịch sử của Ôn theo lịch. Kiểm tra tác dụng phụ ở API khi có ghi.
- Không lộ đáp án qua nhãn/alt/trợ năng; mobile, bàn phím, focus và các trạng
  thái loading/error/empty/success thuộc tính năng, không dồn sang ticket cuối.
- Retry/save cần idempotency ngay khi bắt đầu ghi dữ liệu; không hoãn quyền
  truy cập/chống ghi trùng đến một ticket hardening sau cùng.
- Web/API là seam nghiệm thu đã duyệt; mock provider/player ở biên I/O, không
  mock từng helper. Provider live chỉ được xác minh trong quota đã kiểm tra,
  không gọi trả phí hoặc tuyên bố mock pass là tích hợp thật hoàn tất.
- Mỗi ticket cập nhật story/bằng chứng và các tài liệu bàn giao cần thiết. Không
  tự commit/push/deploy, chạy migration cloud hoặc tạo media mới từ đề xuất này.
