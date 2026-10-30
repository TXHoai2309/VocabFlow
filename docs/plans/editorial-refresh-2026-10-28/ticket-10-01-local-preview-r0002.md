# Ticket10-01 — Preview local 51 nghĩa đã rà

Chủ sản phẩm giao tiếp “oci làm 10 đi” ngày30/10/2026. Trạng thái:
`LOCAL_PREVIEW_VERIFIED_WITH_EXPLICIT_MEDIA_GAPS`,ready for owner review.
Phạm vi vẫn51ID trong manifest r0001;không mở rộng ra toàn A1/A2.

| Kết quả | Số lượng |
| --- | ---: |
| Nghĩa đã rà,KEEP |51 (27A1/24A2,35nhóm từ) |
| Bộ học native local |30,slug `editorial-a1-a2-local-0001` |
| Nghĩa có ít nhất một slot media |20 |
| Nghĩa học bằng chữ,chưa ghép media |31 |
| Ảnh/audio từ/audio câu đã ghép |19/20/17 |
| File media thực dùng |56,đúng hash/length/receipt |
| Từ mới/job provider mới |0/0 |

Giữ nguyên định nghĩa,nghĩa Việt,văn cảnh ví dụ,CEFR,proposal key,runtime ID,
contentVersion và tiến độ. Collection mới chỉ thêm placement cho các ID cũ;
không nhập thêm canonical Sense và không chuyển chúng vào Từ đầu tiên.
Namespace FIRST_WORDS,85file pilot07,các bộ CEFR và nội dung/progress08/09giữ
nguyên. Không sửa schema,migration,remote DB hay deploy.

17nghĩa dùng đủ3slot khớp nội dung gốc. Adult noun/afraid/afternoon dùng audio
từ;hai ảnh đầu chỉ minh họa nghĩa từ,không minh họa chính xác câu hiện tại.
Ảnh afternoon giữ offline vì cảnh chơi bóng ban ngày không xác định buổi chiều.
Ba clip câu khác nguyên văn không được gắn.26candidate mapping lịch sử chưa
được kích hoạt.31mục text-only là thiếu coverage được công khai,không phải
kết luận chúng không cần audio và không phải kho đã đầy đủ media.

Một câu accident vốn không có exampleKey. Shared selector chỉ cho phép ghép
keyless bằng đúng identity/hash/index/nguyên văn;không thêm key vào JSON nguồn,
không sửa câu để chạy theo audio. Flashcard và trang chi tiết dùng chung selector.
Audio vẫn mang nhãn PROPOSED/local;không tự nhận owner listening/expert review.

## Áp dụng và kiểm tra

- Plan r0002:120882bytes,SHA256
  `94b7a904599e7851b2dd7e38c528a5b111cdd885fa9d01d4446ac54af5e6aa1d`.
- Backup local trước ghi;UPDATE đúng20projection media,thêm1set/51memberships.
 36fingerprint gồm bảng bảo vệ và subset projection/collection không đổi.
 Rerun chỉ xác minh,`ALREADY_APPLIED_NO_WRITES`.
- Public detail cả51khớp chữ/hash/version/CEFR trước ghi. Index vẫn7311ID;
 FIRST_WORDS vẫn30. Browse phân trang/giao CEFR cho51/27/24/0đúng phạm vi.
-56asset GET đúngbytes/MIME;unknownfile404. Node Development entry cài riêng
 route `/api/local-editorial-batch-media/ticket10-a1-a2-batch-0001/:filename`.
 Worker build không chứa adapter;dedicated DB/loopback/plan/path/hash guards
 được test. Không nới allowlist hoặc namespace pilot07.
- Account services dùng đúng Drizzle PostgreSQL adapter như app;exact51ID,
 media/example parity,queue scope và household denial PASS. Không ghi progress
 hoặc xuất account/session rows;không đăng nhập browser để nhận vơ account E2E.
- Browser khách:collection51→setup10từ,đúngset30→study;thẻ text-only hiện
 bình thường. Trang accident tải ảnh và phát thực tế audio từ1.056s/câu3.24s,
 readyState4,errornull. Đây là thử playback,không phải expert phonetic review.
 Agent không chấm thẻ;phiên chuyển tới7/10giữa các lần quan sát và được giữ
 nguyên. Chỉ kiểm tra viewport hiện có;không nhận là matrix390/1440đầy đủ.
-151tests/6files PASS;API và web typecheck riêng,lint file đổi,build và static
 premium audit PASS. Build còn cảnh báo chunk/dynamic-import đã có.
 Root `pnpm typecheck` FAIL trong tooling ngoài thay đổi10:backfill production,
 resolve pending và foundation verification. Không báo root typecheck PASS.

## Bàn giao và phần còn lại

Artifact local nằm trong
`.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-runtime-r0002/`:
`integration-plan-r0002.json`,`application-result.json`,`verification-result.json`,
`browser-verification.json`,screenshots và backup riêng có dữ liệu tài khoản.
Common dataset/handoff nằm cùng data root r0001,được ghi thêm r0002;không đè
manifest/disposition/handoff/ZIP r0001. ZIP mới chỉ gồm source51mục,56asset dùng,
receipt,pins,tooling và kiểm tra;không chứa env,token,account rows hoặc DB dump,
không phải bản sao toàn media của3package nguồn.

Chưa đóng full10:đây là một lô51nghĩa,các lô A1/A2khác chưa được thực thi.
31mục chưa media còn trong backlog;ưu tiên đối chiếu audio từ dùng chung có
kiểm chứng trước khi tạo mới. Toàn kho/15và media coverage đầy đủ chưa hoàn tất.
Việc sinh thêm từ/ảnh/TTS vẫn dừng theo yêu cầu chủ sản phẩm.
