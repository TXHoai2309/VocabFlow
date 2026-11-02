# 13: Thêm video vào thư viện riêng và xem bằng player gốc

**What to build:** Người đã đăng nhập thêm một link video YouTube, thấy nó
trong thư viện riêng và phát giọng gốc trong app, có lỗi nguồn/nhúng rõ ràng.

**Blocked by:** None (không có blocker kỹ thuật; đã được giao2026-11-01).

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 52, 53, 54, 79, 85. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Dùng đăng nhập/quyền hiện có; kiểm tra URL một video, không nhận playlist/
  cả kênh. Lưu video thuộc chủ sở hữu, xem lại thư viện và mở video được.
- [x] Player gốc hiển thị, có điều khiển; không tách MP3, player ẩn hoặc lấy
  TTS thay giọng. Không cần transcript provider để demo việc xem video.
- [x] Tách trạng thái player và dữ liệu phụ đề; không hiển thị đồng bộ/bài nghe
  giả khi mới nhúng. Xem được mà không bắt làm bài hay tạo flashcards.
- [x] Kiểm tra tài khoản không được phép đọc/thay dữ liệu, lỗi nhúng/nguồn mất,
  logout. Kiểm thử player I/O có điều khiển; chưa nhận là đồng bộ sub đã chạy.

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

US82 ACCEPTED:4/4 controlled-player Chromium +1/1 actual public official-demo YouTube playback PASS (13-live-youtube.png).12 API/schema checks, lint/typecheck/build PASS. Actual localhost SQL rollback0027 verifies owned-source idempotency/readback,401/403/404 incl other parent in same household, runtime grants and unchanged learning/rewards/catalog. Player visible/native controls/origin/Referer, source errors/retry, mobile200px minimum and logout cleanup verified. Premium strict static audit0 findings; actual workflow remains evidence. No transcript/translation/media extraction, paid provider or durable/cloud migration.
