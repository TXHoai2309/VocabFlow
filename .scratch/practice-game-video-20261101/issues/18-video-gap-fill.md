# 18: Luyện nghe điền từ trên đoạn video đã chọn

**What to build:** Người học chọn Đoạn học, xem số câu hợp lệ, nghe giọng
gốc và điền chỗ khuyết với kết quả riêng được lưu theo lần trả lời đầu.

**Blocked by:** 17: Chọn/nghe lặp và đánh dấu đoạn khó trong video

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 64, 65, 66, 67, 68, 69, 72, 84. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Chỉ câu thuộc đoạn, mỗi câu một chỗ khuyết từ/cụm ngắn đúng dạng lời nguồn;
  bỏ cue không phải lời nói/rỗng/timing sai, cho biết số thực có.
- [x] Trước lần đầu giấu lời đầy đủ/Việt trong app, nhãn trung tính; replay thoải
  mái, không đếm ngược. Mở câu trong Xem hiểu trước nộp ghi Đã xem; từng xem
  video trước buổi không hồi tố mọi câu thành Đã xem.
- [x] Chuẩn hóa đáp án đúng hợp đồng, không AI chấm ngẫu nhiên. Lần đầu/Đã xem/
  bỏ qua/lỗi tách biệt; nhập rỗng không sai, sửa sau không ghi đè lần đầu.
- [x] Lưu phiên/kết quả có auth/idempotency/pins transcript-đáp án ngay từ đầu;
  tổng kết tỷ lệ đúng chuẩn, không gọi dịch bắt buộc hoặc coi tỷ lệ là chứng nhận.
- [x] Có thể luyện với Anh từ 14, không bắt buộc 15/16. Bản Việt nếu sẵn tuân theo
  quyền xem câu; chữ nằm sẵn trong video/player không bị hứa xóa.
- [x] Demo đoạn 02:10–02:50 không có câu ở 04:00; test mở lời/retry/media error/
  chuẩn hóa và không ảnh hưởng SRS/XP/chuỗi/số từ đã học.

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

US87 ACCEPTED:9/9 controlled video browser cases PASS;17 API/schema cases incl selected130–170/no240, source masked until first outcome, Unicode/apostrophes, blank/forged grading, CAS/replay/auth PASS. ActualSQL0030 rollback verifies pinned keys/first-result/readback/private and unchanged SRS/reviews/XP/catalog. Lint/typecheck/build/premium strict0 PASS. Player errors disable answer and allow technical skip; Xem hiểu navigation commits reveal first. No provider required; player text limitation explicit.
