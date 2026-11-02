# 09: Chơi liên tục đúng nguồn với ảnh/nghe/kết hợp

**What to build:** Người chơi chọn nguồn và gợi ý, dùng hết từ đã học rồi
đến từ chưa học trong nguồn ấy, sau đó trộn lại để chơi liên tục.

**Blocked by:** 03: Luyện nghe và luân phiên ảnh/nghe với lựa chọn từ; 08: Chơi một ván bắn cá 5 tim bằng ảnh và gõ từ

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 36, 40, 41, 42, 49. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Nguồn/bộ/mức/từ đã lưu rõ ràng; không mở rộng toàn kho. Không có từ đã
  học trong nguồn chọn thì có thể dùng từ chưa học của nguồn đó.
- [x] Không lặp trong giai đoạn khi còn mục khác, tránh lặp ngay tại biên khi
  có lựa chọn; nguồn một từ dạng ảnh/nghe vẫn có thể chơi liên tục.
- [x] Gợi ý ảnh/nghe/kết hợp dùng đúng media; replay/lỗi/retry/bỏ qua kỹ thuật
  không mất tim. Thiếu loại cue phải đổi thiết lập có chủ đích.
- [x] Hết nội dung hợp lệ thì tạm dừng/báo rõ; gặp đúng từ chưa học trong game
  không biến nó thành đã học. Có UI, hàng đợi lưu đúng nguồn và kiểm thử biên chu kỳ.

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

## Evidence

US78 ACCEPTED:7/7 Chromium game flows;26 game/practice API cases; lint/typecheck/build/secret scans PASS. Real local PostgreSQL rollback confirms selected set learned→NEW→cycles, alternating cues, score readback, no NEW progress promotion, exhausted media pause with5 hearts, and unchanged global SRS/review/XP/catalog snapshots. No new migration/provider; no cloud/durable writes.
