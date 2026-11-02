# 11: Khách chơi và tiếp tục ván với dữ liệu cục bộ

**What to build:** Khách chơi đủ các gợi ý, giữ ván qua reload trên thiết bị
và có kết quả riêng, không cần tài khoản hoặc sửa tiến độ học khách.

**Blocked by:** 09: Chơi liên tục đúng nguồn với ảnh/nghe/kết hợp; 10: Tạm dừng, tiếp tục và bắt đầu ván mới đúng tim/điểm

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 47. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Cùng luật tim/điểm/nguồn/cycling với tài khoản; lưu ván/kết quả trong
  namespace riêng và kiểm tra lỗi lưu, stale checkpoint, replay.
- [x] Reload không hồi tim/nhân điểm; không gửi private API writes hoặc tự nhập
  dữ liệu game vào tài khoản khi đăng nhập.
- [x] Thực hiện demo chơi → thoát → tiếp tục → thua, so sánh guest SRS/XP/chuỗi
  trước/sau và không để lộ ván của tài khoản dùng chung máy.

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

US80 ACCEPTED:all32 combined account-game/guest-game/guest-practice cases verified across runs (31 full-run pass; one existing corrupt-practice fixture now awaits its pending skip save, then4/4 focused rerun passes).7 guest game cases cover3 cues learned/NEW,2-heart/0-heart reload, storage failure, corrupt derived score, missing locks, two tabs and stale/account isolation. Main guest learning bytes unchanged, zero private writes.26 API regressions and lint/typecheck/build PASS. Mobile guest screenshot inspected. No migration/provider/account import.
