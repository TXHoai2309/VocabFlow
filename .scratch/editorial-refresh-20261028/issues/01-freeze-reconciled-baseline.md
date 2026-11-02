# 01: Đóng băng baseline đối chiếu toàn kho

**What to build:** Gói baseline tái lập được, giải thích runtime/RC/enrichment/legacy/media và ma trận mục tiêu cần biên tập; tách baseline khỏi đề xuất sửa.

**Blocked by:** None — không có ticket chặn về kỹ thuật.

**Status:** done

**Execution authorized:** yes — chủ sản phẩm yêu cầu “giờ làm 01 trước” ngày 29/10/2026. Phạm vi: đọc DB local/offline, tạo gói baseline và chia shard; không sửa DB, nhập nội dung hoặc gọi provider.

**Owner:** phiên điều phối hiện tại; các nhánh khảo sát chỉ đọc, không sở hữu quyền sửa kho.

- [x] Hạch toán đủ 7.311 ID V2 và 30 legacy, không kích hoạt dữ liệu hoặc sửa lịch sử.
- [x] Đối chiếu 1.155 nhãn CEFR bổ sung, gồm 606 C2, trước quyết định áp dụng; không xem Docker thiếu nhãn là bằng chứng thiếu từ.
- [x] Có crosswalk danh tính, hash nguồn, các trạng thái chưa rõ và quyền sở hữu từng shard để các phiên không sửa trùng.
- [x] Bàn giao baseline bất biến, ma trận mục tiêu và inventory media đủ tái kiểm tra; ghi rõ mốc quan sát và dữ liệu chưa xác minh.

**Evidence:** [Báo cáo baseline và gói bàn giao](../../../docs/plans/editorial-refresh-2026-10-28/ticket-01-baseline.md).
7.341 ID, 148 lô độc quyền, 355 mục tiêu phủ; 13.977 asset khớp bytes/hash.
Baseline và archive được kiểm tra toàn vẹn, 9/9 guard tests đạt và review cấu
trúc độc lập đạt. Master IDs/semantic review còn chờ được ghi rõ, không tự duyệt.
