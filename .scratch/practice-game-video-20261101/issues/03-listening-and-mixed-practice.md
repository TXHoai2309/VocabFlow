# 03: Luyện nghe và luân phiên ảnh/nghe với lựa chọn từ

**What to build:** Người học hoàn thành buổi nghe hoặc kết hợp bằng lựa chọn
từ, nghe lại và xử lý media lỗi mà giữ đúng chế độ đã chọn.

**Blocked by:** 02: Chọn nguồn và quy mô buổi luyện đúng phạm vi

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 6, 7, 15, 16, 18. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Nghe dùng audio đọc từ; kết hợp luân phiên ảnh/nghe trong nguồn và không
  lặp mục lượt đầu; không dùng nghĩa Việt để thay gợi ý lỗi.
- [x] Kết hợp cần đủ hai loại và hai mục khác nhau; không đủ thì người dùng chủ
  động đổi thiết lập. Không tự chạy thành buổi một loại hoặc nhân đôi một từ.
- [x] Nghe lại không phạt; tải lại/bỏ qua lỗi kỹ thuật tách khỏi sai/bỏ qua chủ động.
- [x] Kết quả gắn đúng loại cue, xuất hiện trong tổng kết và lưu/đọc lại được.
- [x] Kiểm tra phát lỗi, retry, thiếu một loại, nhãn trung tính và đường ghi riêng.

## Bằng chứng thực thi

US72 ACCEPTED: 29 scoped API/reader tests, 11 Chromium flows, typecheck/build/
changed-source ESLint and local rollback PostgreSQL cue/summary readback PASS.
Audio I/O controlled in browser tests; no provider call/media generation.

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
