# 05: Lưu và tiếp tục buổi luyện tài khoản trên cùng thiết bị

**What to build:** Người học thoát/tải lại rồi tiếp tục đúng câu, thiết lập
và kết quả lần đầu; lỗi mạng không làm mất hoặc nhân câu đã trả lời.

**Blocked by:** 02: Chọn nguồn và quy mô buổi luyện đúng phạm vi

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 26, 27. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Giữ nguồn/cấu hình/cue/đáp án đầu/vị trí và hành động chờ; không sinh lại
  bộ câu khác khi khôi phục cùng buổi.
- [x] Tải lại sau câu đã lưu không cho giải quyết lại để tăng đúng; retry sau
  mất phản hồi không ghi hai lần và chỉ tiến khi lưu thành công.
- [x] Dùng được với hợp đồng cue/kiểu trả lời của 02; nội dung stale hoặc dữ liệu
  tiếp tục không còn hợp lệ được báo rõ, không tự thay target.
- [x] Buổi hoàn tất không được mở thành buổi dở; đổi tài khoản không lộ checkpoint.
- [x] Kiểm tra lỗi lưu, reload và khôi phục; không hứa nối buổi dở giữa hai máy.

## Bằng chứng thực thi

US74 ACCEPTED: 32 scoped tests, 21 Chromium flows plus eight focused rechecks,
typecheck/build/changed-source ESLint and PostgreSQL rollback stale/retry checks
PASS. Browser pointer/draft/action scoped by account+learner; server content
pins and ownership remain authoritative. History is preserved on incompatibility.

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
