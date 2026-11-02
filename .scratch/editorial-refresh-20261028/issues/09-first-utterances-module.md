# 09: Câu đầu tiên qua một mô-đun nhỏ hoàn chỉnh

**What to build:** Một nhóm tình huống giao tiếp ngắn chọn và học được, có nghĩa, dịch, ngữ cảnh và audio khớp câu đang hiện.

**Blocked by:** 07 — Pilot đầu tiên hoạt động đầy đủ trong học local.

**Status:** in-progress —12utterances/12audio and local self-recall implemented;listening/browser acceptance pending.

**Execution authorized:** yes — owner explicitly resumed08/09on30/10/2026 (“vậy làm luôn cái đó đi”,then“làm tiếp cho tôi”). One session; dedicated local runtime and Muse audio only. No remote DB or deployment.

Latest30/10:chủ sản phẩm đã nghe duyệt đủ12audio câu cùng6audio tên chữ của08.
Dataset/runtime metadata r0002đã ghi nhận;không hỏi duyệt lại cùng18clip.
Ghi chú listening pending bên dưới là lịch sử.09chưa tạo ảnh theo scope0ảnh
ban đầu;câu dùng ngữ cảnh bằng chữ. Đề xuất4tranh tình huống chưa thực thi.
Browser verification vẫn còn mở. Xác nhận:
[owner listening](../../../docs/plans/editorial-refresh-2026-10-28/foundation-08-09-owner-listening-acceptance-r0001.json).

- [ ] Nhóm nhỏ có mục tiêu giao tiếp/ngữ cảnh, câu song ngữ phù hợp và audio khớp exact text; đi được từ chọn nội dung tới học.
- [x] Chỉ12lượt nói đầy đủ;không có mẫu câu khuyết được giả thành câu đầy đủ.
- [x]12utterance có UUID/progress riêng,không ghi tiến độ từ thành phần;dùng lại giữa collections giữ chung owner.
- [x] Đếm12utterance riêng,0lexical additions;không cộng vào600từ mới.

## Hiện trạng30/10/2026

Có12câu thuộc4nhóm,12MP3 exact text đã tải/kiểm tra hash và giải mã. ASR toàn
18audio của08/09khớp18/18,không thay cho nghe duyệt. Local đọc ngữ cảnh trước,
reveal mới hiệnEN/VI/audio;chỉ tự đánh giá có chủ đích mới ghi progress. Account
lưu server có household authorization/idempotency/expectedRevision;guest dùng
namespace và Web Locks riêng,lỗi lưu không chuyển bài. Bộ chọn số lượng dùng
chung với setup đang có,không thêm quota ngày.

Chờ người dùng nghe duyệt audio mới và kiểm tra browser390/1440/playback sau
khi bật lại Local browser use. Không nhận full09done khi các bằng chứng đó
chưa có. Hợp đồng hiện hành:
[execution](../../../docs/plans/editorial-refresh-2026-10-28/foundation-08-09-execution-2026-10-30.md).
Các ghi chú deferred/contract-review bên dưới là lịch sử được thay thế.

## Parallel manual-chat assignment — 2026-10-29

Owner selected this chat as coordinator and will open two worker chats and paste
the prepared prompts. Contract/offline draft brief: docs/plans/editorial-refresh-2026-10-28/parallel-08-09-r0001/worker-09.md.
Prompt ready; worker not yet dispatched. Runtime/provider production remains
subject to the concrete shared item/media contract after coordinator review.

## Coordinator intake — 2026-10-29

Received verified worker handoff. Review: docs/plans/editorial-refresh-2026-10-28/parallel-08-09-review-r0001/review.md.
08requires correction C08-01;09draft content passed coordinator reading, shared
contract/media/runtime acceptance pending. New follow-up prompt is ready;
user will dispatch it manually. Originalworker artifacts remain immutable.

## Second coordinator review — 2026-10-29

Offline draft/compatibility review PASS.08C08-01resolved in r0002; coordinator
forward bridge updates09mapping to08r0002without changing audio dependencies.
Review: docs/plans/editorial-refresh-2026-10-28/parallel-08-09-review-r0002/review.md. New local implementation contract
is READY FOR CONTRACT REVIEW, not execution approval. Full ticket stays
in-progress; no runtime/media/DB changes or new lexical additions.
