# 15: Tự lấy phụ đề Anh từ nguồn hỗ trợ trong quota đã xác minh

**What to build:** Người học thêm video hỗ trợ rồi lấy được timed transcript
thực qua luồng xử lý có trạng thái, hoặc nhận fallback nhập sub khi nguồn thất bại.

**Blocked by:** 14: Xem hiểu với phụ đề Anh nhập SRT/VTT theo thời gian video

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 73, 74, 75, 78. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Xác minh provider/khóa/allowance/giới hạn/lưu dùng lại trước bật tích hợp,
  không in khóa hay phát sinh phí mới. Dùng native transcript, không fallback ASR.
- [x] UI hiển thị đang xử lý/job nếu có, thành công hoặc lỗi; normalize timing/
  ngôn ngữ thật vào cùng hợp đồng 14, không nhận text không timing là timed sub.
- [x] Không biết/hết quota, không hỗ trợ/private/empty/language mismatch có
  trạng thái thật và cho xem/nhập SRT/VTT; retry không tạo xử lý trùng ngoài ý muốn.
- [x] Có kiểm thử lỗi/quota/async tại biên và xác minh thành công thật trong
  allowance đã kiểm tra. Không có khóa/quota phù hợp là phụ thuộc ngoài còn mở,
  không đánh dấu ticket done chỉ vì mock/UI chạy.
- [x] Không chặn nhánh dịch hoặc đánh dấu đoạn với phụ đề nhập tay đang dùng được.

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

## Historical blocker evidence (resolved)

Owner authorized execution;14/US83 accepted. Verified official docs, configured key names and available tools before requesting anything. No supported credential or verifiable free/approved allowance available. See evidence/provider-blockers.md for sources, exact missing conditions and unblock. No provider call/ASR/paid fallback/mock success. Independent17/18/20 continue; ticket not done.

## Resumed execution

Owner configured credentials; actual Supadata account Free100/month used0/max100 verified. US84 READY gate recorded before code; was then the sole active story. Old missing-key evidence historical.

## Acceptance

US84 ACCEPTED: verified Supadata Free100/month and one actual native timed source success (36876UTF8bytes,100→99). API/schema21,17 unique controlled browser cases, lint/typecheck/build and SQL0031 rollback live-data persistence/CAS/readback/private/no-learning-mutation PASS. Keys remain server-only. No auto/generate/ASR, paid call, duplicate processing retry or cloud migration.
