# 03: Chạy thử hợp đồng bàn giao với ba mục và kết quả giả lập

**What to build:** Biên tập, ảnh và TTS giao nhận ba mục hiện có bằng manifest chung và receipt riêng; người tích hợp xem được mục nào đủ, thiếu hoặc hết hạn.

**Blocked by:** 01 — Đóng băng baseline đối chiếu toàn kho.

**Status:** done

**Execution authorized:** yes — chủ sản phẩm giao ticket 02 và 03 ngày 29/10/2026. Chỉ local; 03 dùng media giả lập, không provider hoặc dữ liệu runtime mới.

- [x] Dùng ba mục đã xác minh danh tính, ghim manifest/input hashes; không gọi provider.
- [x] Từ chối sai hash, ID, đường dẫn, manifest và binding; thay input làm đúng job hết hạn.
- [x] Giao lặp không tạo trùng, hai worker hoàn tất đồng thời không mất kết quả; điều phối là bên duy nhất ghép trạng thái chung.
- [x] Bundle có đường dẫn và checksum, nhận được ở phiên/worktree khác kể cả input bị Git ignore.

**Evidence:** [Báo cáo manifest/receipt canary](../../../docs/plans/editorial-refresh-2026-10-28/ticket-03-manifest-canary.md).
Ba nghĩa hiện có, chín job/output/receipt giả lập; ảnh và TTS chạy hai tiến
trình độc lập. Tests 21/21 và portable verifier PASS. Tất cả output là JSON
giả lập, REVIEW_REQUIRED_MOCK, không đủ điều kiện runtime và không cấp Master IDs.
