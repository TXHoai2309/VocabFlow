# 08: Làm quen chữ và âm qua một mô-đun nhỏ hoàn chỉnh

**What to build:** Một nhóm chữ đầu tiên chọn và học được bằng item model đã duyệt, phân biệt tên chữ với âm, trình bày và audio phù hợp.

**Blocked by:** 07 — satisfied: owner accepted the local pilot on 2026-10-29.

**Status:** in-progress — local implementation and18audio available across08/09;6isolated sounds pending.

**Execution authorized:** yes — owner explicitly resumed08/09on30/10/2026 (“vậy làm luôn cái đó đi”,then“làm tiếp cho tôi”). One session; dedicated local implementation and24planned audio,0images. No remote DB or deployment.

Latest30/10:chủ sản phẩm đã nghe và duyệt6audio tên chữ cùng12audio câu của09.
Đã áp dụng owner acceptance r0002,6name activities listeningReady. Ghi chú chờ
nghe duyệt bên dưới là lịch sử,đã thay thế. Sáu âm riêng vẫn thiếu file;ảnh vẫn0
theo scope ban đầu,chữ hiển thị trực tiếp. Xác nhận:
[owner listening](../../../docs/plans/editorial-refresh-2026-10-28/foundation-08-09-owner-listening-acceptance-r0001.json).

- [x] Item model riêng được giao triển khai;6parent letter UUID và12activity UUID đóng băng,không dùng Sense mạo từ làm chữ cái.
- [ ] Mục tiêu từng hoạt động rõ; tên chữ, âm và audio được đối chiếu riêng với locale đã chọn.
- [ ] Một nhóm nhỏ đi được xuyên chọn nội dung và học; scope/tiến độ hoạt động đúng với model riêng.
- [ ] Các chữ còn lại được chia lô tiếp theo và hạch toán trước mở rộng đủ 26 chữ; không tính chữ/âm thành từ mới trong chỉ tiêu 600.

## Hiện trạng30/10/2026

Có6audio tên chữ,JSON/receipt/path/hash và màn hình local dùng chung bộ chọn
5/10/20/30.12activity tách name/sound và tiến độ typed riêng;6sound chưa có
audio. Muse báo backend plain-text không hỗ trợ phoneme,canary /æ/UNSUPPORTED;
không thay bằng tên chữ/đọc IPA. Sáu tên chữ hiện có thể nghe thử/làm quen,
chưa chấm điểm nghe trong lúc audio mới chờ người dùng duyệt. Các lỗi lộ đáp
án được xử lý bằng attempt/options/audio handle riêng;reveal vô hiệu lượt chấm.
Chưa mở rộng20chữ còn lại;không có từ mới cộng vào chỉ tiêu600.

API/DB và component kiểm thử đã chạy;kiểm tra browser390/1440/playback đang
chờ quyền Local browser use. Không đánh dấu08done. Hợp đồng hiện hành:
[execution](../../../docs/plans/editorial-refresh-2026-10-28/foundation-08-09-execution-2026-10-30.md).
Các trạng thái deferred/contract-review bên dưới là lịch sử được thay thế.

## Readiness — 2026-10-29

07 is accepted; its local dependency is satisfied.08 remains planned until explicitly assigned; its separate letter/name/sound item model still needs to be made concrete and reviewed.

## Parallel manual-chat assignment — 2026-10-29

Owner selected this chat as coordinator and will open two worker chats and paste
the prepared prompts. Contract/offline draft brief: docs/plans/editorial-refresh-2026-10-28/parallel-08-09-r0001/worker-08.md.
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
