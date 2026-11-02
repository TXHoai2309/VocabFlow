# 16: Dịch đoạn được chọn và xem phụ đề Anh–Việt có dùng lại

**What to build:** Người học chọn đoạn phụ đề, yêu cầu dịch trong hạn mức,
mở Việt theo câu hoặc song ngữ và dùng lại đúng bản dịch đã lưu.

**Blocked by:** 14: Xem hiểu với phụ đề Anh nhập SRT/VTT theo thời gian video

**Status:** done

**Execution authorized:** yes — owner assigned 2026-11-01

**Spec stories:** 56, 57, 75, 76, 77, 78, 88. Các mục 86–90 áp dụng theo phạm vi chung.

- [x] Luồng UI chọn phạm vi → thấy quota/phạm vi → xử lý → hiện/lưu Việt hoạt
  động với nguồn nhập từ 14; không bắt buộc đã có tự lấy phụ đề ở 15.
- [x] Xác minh nguồn dịch/khóa/allowance và điều kiện dùng lại; không tự dịch
  toàn video, nâng gói hoặc gọi fallback trả phí. Giới hạn thật được báo trước.
- [x] Dịch theo ngữ cảnh, giữ cue/lang/nguồn/phiên bản và nhãn gợi ý AI khi dùng;
  mở câu hoặc song ngữ không ghép bản Việt từ transcript cũ.
- [x] Dùng lại bản có sẵn; retry không tạo yêu cầu trùng ngoài kiểm soát. Quota
  hết/không biết/lỗi vẫn dùng Anh/bản Việt đã có, không giả thành dịch xong.
- [x] Kiểm thử/cache isolation và một đường dịch thật trong quota đã xác minh;
  nếu chưa có allowance phù hợp thì ghi phụ thuộc, không coi mock là hoàn tất.

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

Actual DeepL usage0/1000000 and EN/VI stable verified; provider retention/nonpersonal/reuse conditions reviewed. US85 concrete READY contract recorded, was then the only active story. Previous credential blocker is historical.

## Acceptance

US85 ACCEPTED: actualFree EN→VI33char success, remaining999967; selected-only/preview/quota/PII-review/providerretention/attribution/cache/exactretry/version/resolved-onlyfeedback.20 unique controlledbrowser/23API-schema/typecheck/lint/build/premium0 and actualSQL33 rollback/readback/unique/private/no learning changes PASS. No new provider calls on reads/resume, no paid endpoints/cloud apply.
