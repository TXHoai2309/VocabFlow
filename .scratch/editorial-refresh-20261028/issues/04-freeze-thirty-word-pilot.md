# 04: Đóng băng bản thảo pilot 30 từ, bốn chủ đề

**What to build:** Bản thảo tuyển chọn có thể đọc và review: đúng nghĩa, ngắn gọn, ví dụ song ngữ phù hợp trẻ, membership rõ và brief media riêng.

**Blocked by:** 03 — Chạy thử hợp đồng bàn giao với ba mục và kết quả giả lập.

**Status:** done

**Execution authorized:** yes — chỉ thị tiếp tục ngày 29/10/2026: bản thảo pilot offline và bàn giao media; không nhập DB, cấp Master ID, gọi provider hay kích hoạt.

- [x] Tuyển chọn khoảng 30 từ trong bốn chủ đề; tìm headword gốc, alias, biến thể và legacy trước khi viết mới.
- [x] Mỗi mục gắn đúng Sense, có nghĩa Việt ngắn, ví dụ song ngữ và membership phù hợp; không gán A1 thành lớp 1.
- [x] Có review độc lập và hash đầu vào đã đọc; mục thiếu bằng chứng giữ trạng thái chờ.
- [x] Đóng băng bản thảo cùng brief riêng và danh sách media dùng lại, tạo mới hoặc bỏ để ảnh và TTS nhận việc độc lập.

## Bàn giao — 29/10/2026

- [Báo cáo](../../../docs/plans/editorial-refresh-2026-10-28/ticket-04-frozen-pilot.md)
  và [JSON kết quả/hash](../../../docs/plans/editorial-refresh-2026-10-28/ticket-04-frozen-pilot.result.json).
- 30 nghĩa V2 dùng lại: động vật8, màu sắc8, trường học8, gia đình6. 30 ví dụ
  song ngữ mới; không tạo Lexeme/Sense/từ mới hoặc sửa ID/tiến độ.
- Review độc lập30/30 PASS_DRAFT_ONLY; Master UUIDs, human approval,
  topic/placement runtime và media approval vẫn pending. Các nhóm là bộ tuyển
  chọn nháp, không tự tạo topic hoặc suy lớp từ CEFR.
- 90 slot media,5 ảnh OMIT;85 yêu cầu tiềm năng,18 file ứng viên đã pin bytes
  để review trước tạo mới. Provider/voice/locale/style chưa chốt, job không chạy.
- 11/11 tests PASS, gói30 payload files được kiểm tra sau khi chuyển workspace.
  Không truy cập DB, gọi provider, sinh media mới hoặc kích hoạt nội dung.
- 05/06 hết dependency kỹ thuật, vẫn planned; có thể được giao song song.
