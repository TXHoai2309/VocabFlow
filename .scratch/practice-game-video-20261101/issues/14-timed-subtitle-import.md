# 14: Xem hiểu với phụ đề Anh nhập SRT/VTT theo thời gian video

**What to build:** Người học nhập timed subtitles, xem Anh mặc định, giấu
lời hoặc chọn câu để nghe lại trong video; có nền Xem hiểu thực trước provider.

**Blocked by:** 13: Thêm video vào thư viện riêng và xem bằng player gốc

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 55, 58, 59, 60, 73, 74, 75. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Nhập SRT/VTT qua UI, kiểm tra kích thước/ngôn ngữ/timing; lưu lời nguồn/
  phiên bản bất biến và nguồn nhập cá nhân để dùng lại, không ghi đè nguồn chung.
- [x] Bảng sub cạnh/dưới player, tô cue theo thời gian, click seek, tốc độ theo
  khả năng player. Mặc định Anh, giấu được; thiếu Việt vẫn dùng Anh và báo rõ.
- [x] Cue không phải câu trọn vẹn/timing sai không bị giả thành mốc từng từ;
  file lỗi giải thích được, video vẫn phát nếu nguồn hoạt động.
- [x] Không tự nhận dạng giọng nói/gọi dịch; quyền riêng tư, version và cơ chế
  chọn cue là hợp đồng ổn định cho các nhánh 15/16/17 sau này.
- [x] Demo import → xem theo sub → chọn câu → đóng/mở lại; kiểm thử timing/
  buffering/seek qua I/O giả lập, không hứa mọi thiết bị chính xác từng âm tiết.

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

US83 ACCEPTED:6 browser video flows PASS (SRT/VTT/file validation/seek/highlight/speed/hide/reopen/immutable versions/pending retry/mobile/buffering),14 API/schema tests PASS. Lint/typecheck/build PASS. Actual SQL0028 rollback validates immutable source/hash/cues, exact retry/conflict/version reads, co-parent404 and unchanged SRS/reviews/XP/catalog. SQL found/fixed strict metadata projection error; re-run PASS. Language is declared English with conservative script checks, not automatic recognition. No provider/translation/ASR.
