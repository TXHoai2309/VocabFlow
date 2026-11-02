# 12: Lịch sử và kỷ lục game riêng theo nguồn/kiểu gợi ý

**What to build:** Tài khoản và khách xem tổng kết/lịch sử/kỷ lục đúng điều
kiện ván, biết từ sai/đã xem mà không coi điểm game là mức ghi nhớ SRS.

**Blocked by:** 11: Khách chơi và tiếp tục ván với dữ liệu cục bộ

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 43, 46, 51. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Tài khoản đồng bộ riêng, khách đọc cục bộ; nhóm kỷ lục theo nguồn, kiểu
  cue và phiên bản luật, không so một bộ nhỏ với toàn kho.
- [x] Ván dừng tạm vẫn đang dở, ván thua hoặc chủ động kết thúc có kết quả cuối;
  finalize/retry chỉ một lần, không tính kết quả sau trạng thái kết thúc.
- [x] Lịch sử hiển thị điểm/cá bắt/từ sai/Đã xem phù hợp, không gắn nhãn đã
  thuộc từ. Không leaderboard/XP/chuỗi hoặc hợp nhất lịch sử khách ngầm.
- [x] Nghiệm thu nhóm B ghép cue/cycling/resume/guest, kiểm tra private access,
  double-submit, mobile và giữ nguyên toàn bộ tiến độ học chính.

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

US81 ACCEPTED/groupB:57/57 combined practice+game Chromium flows PASS,12 game API cases PASS, root119 test files/1399 tests PASS, root lint/typecheck/build and final changed-source lint/typecheck/whitespace/secret/map checks PASS. Account/guest finalize retry/reload and record grouping verified; retired content still permits historical reads and explicit finish. Actual PostgreSQL rollback confirms bounded history/records/pages, one finalize revision, auth/readback, same first outcomes, unchanged SRS/review/XP/catalog snapshots. Screenshots12-game-history desktop/mobile inspected. No cloud/durable migration/deploy/provider.
