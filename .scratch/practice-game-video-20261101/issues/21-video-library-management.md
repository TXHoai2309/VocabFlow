# 21: Quản lý/xóa dữ liệu video riêng và xử lý nguồn không còn phát được

**What to build:** Người học quản lý thư viện hoàn chỉnh, xóa video/đoạn cùng
dữ liệu của mình và nhận trạng thái rõ khi video mất, kể cả sau nhiều buổi học.

**Blocked by:** 19: Báo phụ đề sai và thay phiên bản mà giữ lịch sử đúng nguồn; 20: Lịch sử luyện video và tiếp tục buổi dở cùng thiết bị

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 79, 81, 82, 83. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Xóa video/đoạn/bản nhập/bản dịch/kết quả liên quan theo phạm vi đã xác
  nhận, không xóa YouTube gốc/kho chung/SRS hoặc dữ liệu người khác.
- [x] Logout/đổi tài khoản dọn quyền nhìn bản nháp/cursor; request trễ không
  làm tái xuất dữ liệu đã xóa hoặc dữ liệu người trước.
- [x] Video bị xóa/chặn có trạng thái thật, cho xem phần chữ còn lưu theo điều
  kiện nguồn; không thay TTS/MP3 khác và tự gọi lại xử lý để giả phục hồi.
- [x] Nghiệm thu nhóm C ghép nguồn/sub/dịch/đoạn/bài/history, kiểm tra auth,
  quota, version, mobile và nguồn thật. Provider chưa xác minh không được
  che bằng kết quả mock hoặc tuyên bố nhóm đã phát hành.

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

## Dependency resolution

19/20 ACCEPTED; Supadata/DeepL live credentials, free quota and reuse conditions verified. Previous missing-key blockers are resolved.

## Resumed execution

19/20 accepted; US90 concrete READY contract recorded before code.21 only active, all other20ticketsdone. Previous dependencyblocker historical. No destructive realdata/production operation authorized or run; synthetic tests rollback only.


## Acceptance evidence

US90 ACCEPTED. All five owned deletion scopes verified through UI and actualSQL35 rollback; preview/cancel/Escape/Tab/focus/mobile, uncertaincommit→reload→exactreceipt, storagefailure/corruptpointer, cross-tab lateGET/oldwrites, definitive staleconfirmation recovery. Delayed native callback cannot resurrect source. Blocked original player retains saved bilingual text with no automatic provider processing.

Final root120files/1417tests, all143Chromium (including actualYouTube playback/130s seek), lint/typecheck/build+secret/map scans,26API/schema, SQL35 runtimegrants/ownership/replay/new-epoch tombstones/no learning/catalog changes and strictUIaudit0 PASS. See evidence/final-verification.md. All21ticketsdone; migrations0025–0035 prepared only, no commit/push/cloudapply/deploy.
