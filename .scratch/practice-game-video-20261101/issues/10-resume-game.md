# 10: Tạm dừng, tiếp tục và bắt đầu ván mới đúng tim/điểm

**What to build:** Người chơi tải lại/thoát rồi tiếp tục cùng ván với nguyên
tim, điểm và mục hiện tại; chơi lại hoặc đổi thiết lập tạo ván mới rõ ràng.

**Blocked by:** 08: Chơi một ván bắn cá 5 tim bằng ảnh và gõ từ

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 44, 45, 48. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Checkpoint giữ tim/điểm/mục/hàng đợi/nguồn/luật, không hồi tim khi reload.
- [x] Hành động chờ được thử lại idempotent; ván thua không khôi phục thành ván
  đang chơi. Chủ động chơi lại là ván khác, 5 tim/0 điểm.
- [x] Đổi nguồn/cue bắt đầu ván mới, không ghép điểm cũ; tương thích hợp đồng
  hàng đợi từ 08 và mở rộng 09, không hard-code một cue trong checkpoint.
- [x] Lưu tài khoản có auth, lỗi lưu không làm mất ván; demo hai tim → reload
  vẫn hai tim, kiểm tra 0 tim/submit trùng/đổi thiết lập.

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

US79 ACCEPTED:12/12 game Chromium flows PASS including2-heart reload/pause/draft, uncertain committed action replay after reload,0-heart finality/new5/0 with changed source, audio checkpoint, failed checkpoint writes and account isolation/corruption. Lint/typecheck/build/secret scans PASS. Canonical2/0-heart readback added to actual local SQL rollback; no SRS/reviews/XP/catalog changes.
