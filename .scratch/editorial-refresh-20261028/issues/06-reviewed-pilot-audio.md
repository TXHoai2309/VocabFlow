# 06: Audio pilot có phát âm và câu ví dụ chính xác

**What to build:** Playlist pilot nghe được, tách âm từ và âm ví dụ, dùng lại clip khớp chính xác hoặc tạo mới theo cấu hình được chốt.

**Blocked by:** 04 — Đóng băng bản thảo pilot 30 từ, bốn chủ đề.

**Status:** done — chủ sản phẩm nghiệm thu ngày 30/10/2026.

**Execution authorized:** yes — owner explicitly requested05/06 real generation/downloads on29/10/2026; no DB activation.

- [x] Chủ sản phẩm nghiệm thu âm từ/âm ví dụ theo cấu hình Muse thực dùng; giữ bằng chứng Example ID, exact text và binding đã kiểm tra.
- [x] Kiểm tra clip cũ trước tạo mới; không dùng chung cách đọc sai cho homograph.
- [x] Receipt/hash/duration và binding đã có; chủ sản phẩm duyệt review nghe và playlist hiện tại.
- [x] Retry có đối chiếu trạng thái provider khi kết quả chưa rõ, không sinh trùng không kiểm soát; sửa câu chỉ làm hết hạn audio phụ thuộc.

## Nghiệm thu cuối — 30/10/2026

Chủ sản phẩm xác nhận đã review, yêu cầu duyệt và chốt nguồn Muse/quyền sử
dụng. Đóng 06 với 30 audio từ và 30 audio câu đã được bật trong pilot local.
Năm clip từng bị ASR cảnh báo đã được chủ sản phẩm nghe và duyệt trước đó.
Đã kiểm tra lại hash/length của 85 asset và hash 85 receipt trong toàn pilot.
Giữ nguyên báo cáo ASR và metadata gốc; không nhận là vừa nghe tay toàn bộ
60 clip hoặc có một review độc lập mới. Không tạo lại audio.

Bằng chứng hiện hành:
[owner acceptance](../../../docs/plans/editorial-refresh-2026-10-28/tickets-05-06-owner-acceptance-r0001.json).
Các ghi chú pending bên dưới là lịch sử, đã được nghiệm thu này thay thế.

## Historical production checkpoint — 29/10/2026

Generation/downloadcomplete:25selectedimages/5OMIT and60TTSfiles across05/06.
Finalreviewacceptancepending; keepin-progress, notdone.
[Evidence](../../../docs/plans/editorial-refresh-2026-10-28/tickets-05-06-media-handoff.md).

## Owner listening follow-up — 2026-10-29

Owner listened to the five exact isolated recordings and confirmed they match:
“tôi nghe thì khớp nghĩ mà”. duck/blue/white/pen/pencil are accepted for local
playback; no uncertain recordings remain withheld. All30word+30exampleaudio
are now enabled in local pilot revision2. Original ASR/receipts unchanged;
no regeneration/progress writes. Evidence: docs/plans/editorial-refresh-2026-10-28/ticket-06-owner-listening-acceptance.json.
