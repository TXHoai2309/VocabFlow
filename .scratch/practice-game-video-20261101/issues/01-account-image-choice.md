# 01: Hoàn thành một buổi luyện ảnh chọn từ cho tài khoản

**What to build:** Người có từ đã học mở một buổi luyện ảnh 10 câu, chọn từ,
xem phản hồi và tổng kết; kết quả riêng được ghi mà tiến độ học/ôn giữ nguyên.

**Blocked by:** None (không có blocker kỹ thuật; đã được giao 2026-11-01).

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 1, 2, 5, 8, 11, 12, 17, 19, 20, 21, 22, 26, 28. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Dùng nguồn đã học, tối đa 10 mục không lặp; hiện số thực có, không lấy mục
  khác để lấp. Nguồn rỗng báo rõ, không tự tạo buổi hoặc gọi toàn kho.
- [x] Câu ảnh có bốn từ rõ ràng; không tạo câu nếu lựa chọn/media không hợp lệ.
  Đúng/sai lần đầu, Đã xem và bỏ qua được phân biệt, có tổng kết tỷ lệ đúng chuẩn.
- [x] Có lát cắt lưu riêng cho tài khoản và API có thẩm quyền; submit/retry không
  ghi trùng, lỗi lưu giữ hành động chờ. Không gọi đường ghi review để lưu kết quả.
- [x] Tách tối thiểu phần dùng lại bị gắn SRS, không đổi đường học/ôn hiện có;
  kiểm tra API quyền hạn và trạng thái học chính trước/sau buổi.
- [x] Demo từ mở buổi đến tổng kết/lưu; có E2E hành vi, không chỉ kiểm thử bộ sinh câu.

## Bằng chứng thực thi

- Story/contract: `docs/stories/US-70-account-free-practice.md` — ACCEPTED.
- 117/117 focused tests; 5/5 Chromium E2E; typecheck/build/changed-file ESLint pass.
- PostgreSQL localhost rehearsal PASS: migration rollback-only, saved result
  readback, retry, ownership and unchanged SRS/reviews/XP/catalog snapshots.
- No cloud migration, commit, push or deploy. Migration 0025 prepared for review.

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
