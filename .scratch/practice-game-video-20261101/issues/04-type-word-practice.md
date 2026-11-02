# 04: Gõ từ tiếng Anh trong buổi luyện đã chọn

**What to build:** Người học chọn gõ thay cho bốn lựa chọn và nhận phản hồi
đúng theo từ/biến thể hợp lệ; cơ chế áp dụng theo hợp đồng cue của buổi luyện.

**Blocked by:** 02: Chọn nguồn và quy mô buổi luyện đúng phạm vi

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 9, 17, 19. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Gõ có vòng trả lời/phản hồi/tổng kết/lưu hoàn chỉnh trên cue đã khả dụng;
  không phụ thuộc component lựa chọn hay nhận cờ đúng/sai từ client.
- [x] Chuẩn hóa hoa/thường, Unicode và khoảng trắng; không tự chấp nhận từ gần
  giống hoặc đồng nghĩa ngoài nguồn biến thể. Nhập rỗng không chấm sai.
- [x] Đúng/sai lần đầu, Đã xem và retry giữ cùng quy tắc với câu lựa chọn.
- [x] Ảnh và audio có cùng hợp đồng gợi ý; kiểm chứng cue audio ở biên I/O có
  điều khiển, ghép luồng nghe/kết hợp thực khi 03 có mặt. Không lộ đáp án qua UI.
- [x] Không thêm phụ thuộc 03 chỉ vì cả hai mở kiểu câu mới; thống nhất hợp đồng
  từ 02 trước khi triển khai hai nhánh, ghép kiểm tra đủ các tổ hợp ở nghiệm thu nhóm.

## Bằng chứng thực thi

US73 ACCEPTED: 31 scoped tests, 14 Chromium flows, typecheck/build/changed-source
ESLint and PostgreSQL rollback typed-result/idempotency readback PASS. No SRS
write or generated media. Source/cue contracts from02/03 are composed unchanged.

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
