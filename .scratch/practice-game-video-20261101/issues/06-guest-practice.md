# 06: Khách luyện đầy đủ với lịch sử và tiếp tục trên thiết bị

**What to build:** Khách dùng các kiểu luyện đã có, lưu kết quả/cursor trên
thiết bị và tiếp tục mà không ghi dữ liệu riêng của tài khoản.

**Blocked by:** 03: Luyện nghe và luân phiên ảnh/nghe với lựa chọn từ; 04: Gõ từ tiếng Anh trong buổi luyện đã chọn; 05: Lưu và tiếp tục buổi luyện tài khoản trên cùng thiết bị

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 25, 26, 27. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Cùng quy tắc nguồn, số câu, cue, kiểu trả lời và tổng kết; nguồn đã học
  được hiểu từ trạng thái khách, không mượn tiến độ của tài khoản trước.
- [x] Lưu riêng kết quả luyện/checkpoint với dữ liệu học/ôn hiện hữu của khách;
  lỗi persistence giữ câu và hướng dẫn thử lại, không bỏ mất kết quả ngầm.
- [x] Reload tiếp tục, xóa dữ liệu máy không được hứa khôi phục; không có private
  API writes từ khách hoặc tự chuyển lịch sử khi đăng nhập.
- [x] Kiểm tra UI ở ảnh/nghe/kết hợp và chọn/gõ, đồng thời guest SRS/XP/chuỗi giữ nguyên.

## Bằng chứng thực thi

US75 ACCEPTED: 12 guest browser cases verified across full/focused runs, including
6 cue/response combinations and real storage/Web Locks. Guest learning state
byte-identical; no private API writes or account import. Typecheck/build/scoped
ESLint PASS. History discovery and full group gates continue in07.

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
