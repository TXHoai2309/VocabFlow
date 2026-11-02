# 19: Báo phụ đề sai và thay phiên bản mà giữ lịch sử đúng nguồn

**What to build:** Người học báo câu sai/lệch để loại câu lỗi khỏi lượt luyện,
thay phụ đề cá nhân và vẫn xem được kết quả/bản dịch đúng phiên bản đã dùng.

**Blocked by:** 15: Tự lấy phụ đề Anh từ nguồn hỗ trợ trong quota đã xác minh; 16: Dịch đoạn được chọn và xem phụ đề Anh–Việt có dùng lại; 18: Luyện nghe điền từ trên đoạn video đã chọn

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 70, 71, 77. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Báo lỗi qua UI, nhận diện lỗi nguồn riêng; không coi media/phụ đề sai là
  lỗi kiến thức hoặc âm thầm sửa kết quả đầu đã ghi.
- [x] Thay nguồn/cập nhật phụ đề tạo phiên bản mới; nguồn tự lấy, nhập tay,
  bản Việt và câu khuyết không bị ghép nhầm. Không sửa phụ đề chung từ bản riêng.
- [x] Bài đang dở dùng pin cũ hợp lệ hoặc báo không tiếp tục được; không chấm
  theo đáp án mới sau reload. Lịch sử cũ giữ bản đã dùng.
- [x] Kiểm chứng luồng đổi sub thực sự với bản dịch đã có và bài đã nộp; immutable
  identity có từ 14/18, ticket này hoàn thiện trải nghiệm báo/sửa/quản lý phiên bản.

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

15/16/18 ACCEPTED, including actual native/translation providers within verified free quota. Initial missing-key blockers are resolved; current provider evidence is in evidence/provider-blockers.md.

## Resumed execution

15/16/18 ACCEPTED with live native/translation evidence. US89 concrete READY contract recorded before code; was then the only active story. Previous dependency blocker is historical.

## Acceptance

US89 ACCEPTED:22 controlledvideo/24API-schema/typecheck/lint/build/localSQL34rollback PASS. Current report uses servercue and technical outcome, exactreceipt retry; newattempt excludes badcue only. Replacementaftertranslation/submission preserves oldEN/VI/firstresult and reportannotation. Newsource neverreceivesoldVI; private/noSRSrewardcatalog writes verified.
