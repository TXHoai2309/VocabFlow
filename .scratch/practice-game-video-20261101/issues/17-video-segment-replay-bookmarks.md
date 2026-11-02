# 17: Chọn/nghe lặp và đánh dấu đoạn khó trong video

**What to build:** Người học chọn đoạn bằng thời gian/cue, nghe lặp giọng
gốc và lưu đoạn khó/vị trí xem để mở lại đúng ngữ cảnh.

**Blocked by:** 14: Xem hiểu với phụ đề Anh nhập SRT/VTT theo thời gian video

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 61, 62, 63. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Chọn đoạn có đầu/cuối hợp lệ trong video/sub đã phục vụ; replay không
  bị hiểu là trả lời bài tập hoặc tự tính đã nghe hiểu.
- [x] Lưu/đọc bookmark và vị trí riêng, chọn lại từ thư viện; không cần bản Việt
  hay provider tự lấy sub để dùng được với dữ liệu 14.
- [x] Handle seek/pause/buffering/mất video trung thực; kiểm tra độ lệch thực tế
  trước cam kết, không hứa timing từng từ hoặc bắt đầu phát ngoài đoạn âm thầm.
- [x] Demo đánh dấu → mở lại → nghe lặp; có auth, mobile/bàn phím và test I/O.

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

US86 ACCEPTED:7 controlled video browser flows +1 actual official-demo seek/replay PASS. Actual130s target measured2:10.000 at play confirmation (single desktop sample,750ms admission tolerance/250ms poll; no universal timing promise).15 API/schema cases PASS; local SQL0029 rollback verifies bookmark/position CAS/replay/private/readback and unchanged learning/catalog. Lint/typecheck/build/premium strict0 findings. Bookmark reopen/source version, loop/pause/buffering/mobile and failed save retry verified. No provider needed.
