# 20: Lịch sử luyện video và tiếp tục buổi dở cùng thiết bị

**What to build:** Người học xem lịch sử video/đoạn đã luyện, tải lại để
tiếp tục đúng câu/chỗ khuyết và giữ kết quả lần đầu.

**Blocked by:** 18: Luyện nghe điền từ trên đoạn video đã chọn

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 63, 80, 84, 88. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Lịch sử tài khoản riêng qua API, phân biệt đã xem/đã làm bài/kết quả; không
  biến thời gian xem thành nghe hiểu hoặc số từ đã học.
- [x] Cùng thiết bị khôi phục đoạn/câu/chỗ khuyết/kết quả đầu/hành động chờ;
  retry không nhân kết quả, thoát không chấm câu chưa làm là sai.
- [x] Pin không còn tương thích được báo, giữ lịch sử và cho lượt mới; không
  đoán lại chỗ khuyết. Không hứa tiếp tục buổi dở giữa hai thiết bị.
- [x] Demo làm bài → thoát → mở lại từ thư viện → tiếp tục → lịch sử mới, có
  auth, save failure và không tự gọi lại dịch khi chỉ tiếp tục bài.

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

US88 ACCEPTED: full existing+new Chromium126PASS/1 live skipped; latest video14PASS plus actual original YouTube player/130s seek1PASS. Same gap/draft/library resume, pending reload exactly once, completion, immutable history/new attempts, corrupt/storage/account isolation, incompatible pins and direct Xem hiểu reveal confirmed. Feedback→Xem hiểu leaves future questions untouched. API/schema18PASS; realSQL0030 rollback verifies history22 distinct attempts20+2 paging, private ownership, replay/readback and unchanged scheduled progress/review/XP/catalog. Root lint/typecheck120files1409tests/build, latest scoped ESLint, strict UI audit0 and diff check PASS. Details evidence/final-verification.md. No provider call/cloud migration/release.
