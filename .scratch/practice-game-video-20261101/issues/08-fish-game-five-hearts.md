# 08: Chơi một ván bắn cá 5 tim bằng ảnh và gõ từ

**What to build:** Tài khoản chơi được một ván theo ảnh, gõ đúng tự bắn và
cộng điểm, sai/xem/bỏ qua mất tim, về 0 kết thúc với tổng kết riêng.

**Blocked by:** 04: Gõ từ tiếng Anh trong buổi luyện đã chọn

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 30, 31, 32, 33, 34, 35, 37, 38, 39, 50, 51. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Ván mới 5 tim/0 điểm; đúng +10 một lần, sai/xem/bỏ qua chủ động −1 tim
  rồi hiện đáp án và chuyển mục nếu còn tim; không +5 sửa sai/combo/hồi tim.
- [x] Không ngắm riêng/đếm ngược/cá thoát vì gõ chậm; có giảm chuyển động.
  Gõ ký tự, replay và ô trống không giải quyết cá hoặc mất tim.
- [x] API kiểm tra luật/trạng thái/nội dung tài khoản; không tin điểm/tim do
  client tự nhận. Retry không nhân điểm, tim hoặc kết thúc thua.
- [x] Cơ chế chọn/cycling tối thiểu giữ trong nguồn đã học của ván để chơi liên
  tục; 09 mở đầy đủ nguồn/âm thanh/thứ tự đã học → chưa học, không tạo luật ván cố định.
- [x] Tổng kết ván đúng trạng thái, không có cá/điểm sau 0 tim; private writes
  riêng, không SRS/XP/chuỗi. Có demo và kiểm thử thắng một cá/năm lần mất tim.

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

US77 ACCEPTED:4/4 Chromium flows (one correct +5 losses, uncertain committed retry, blank/media/mobile/reduced motion, stale→explicit new game),7 game API cases +17 practice regressions,26 source/schema cases PASS. Lint/typecheck/build/secret/map scans PASS. Actual localhost PostgreSQL rollback rehearses0025/0026, game state readback,401/403, JSONB replay,5 losses and unchanged progress/reviews/XP/catalog. Screenshots08-game-summary/mobile inspected. No durable migration/cloud/provider changes.
