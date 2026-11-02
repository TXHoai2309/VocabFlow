# 07: Xem lịch sử, từ cần luyện thêm và luyện lại câu sai

**What to build:** Tài khoản và khách xem lại buổi luyện, chọn câu sai để
luyện tiếp, có lịch sử lượt mới và giữ nguyên kết quả ban đầu.

**Blocked by:** 06: Khách luyện đầy đủ với lịch sử và tiếp tục trên thiết bị

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 23, 24, 29. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Tài khoản lưu/đọc lịch sử riêng qua API; khách đọc bản lưu máy; kiểm tra
  quyền truy cập và không tự hợp nhất hai ngữ cảnh.
- [x] Tổng kết tách đúng/sai/Đã xem/bỏ qua/lỗi, mẫu số 0 không có phần trăm giả.
  Danh sách cần luyện thêm xuất phát từ kết quả luyện, không sửa từ yếu SRS.
- [x] Luyện lại sai giữ nguồn và kiểu luyện phù hợp, tạo lượt mới; không ghi
  đè kết quả đầu. Nội dung nghỉ phục vụ/media thiếu phải được báo rõ.
- [x] Demo từ lịch sử → lượt luyện lại → lịch sử mới, có account/guest và lỗi lưu.
- [x] Nghiệm thu nhóm A bao gồm ghép các tổ hợp đã xây, reload, mobile/trợ năng,
  auth và không có tác dụng phụ lên SRS/XP/chuỗi; không tạo ticket kiểm thử rỗng riêng.

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

US76 ACCEPTED:35 combined Chromium flows +5 focused final history/reload/stale checks PASS;35 scoped API/source tests and8 schema/inventory tests PASS. Root lint/typecheck/build/secret scans PASS. Real localhost PostgreSQL rollback verifies history/retry/readback and unchanged originals/SRS/reviews/XP/catalog. Full release regression was launched and remains tracked; its observed0025 inventory failure was fixed and8/8 focused rerun passes. No claim that the still-running full regression has passed. Screenshots07-history-desktop/mobile inspected. No cloud/persistent migration/provider calls.
