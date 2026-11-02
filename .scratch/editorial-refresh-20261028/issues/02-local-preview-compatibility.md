# 02: Làm cho local preview đọc đúng baseline và giữ lịch sử

**What to build:** Một phạm vi local đại diện đi được browse → setup → study bằng schema tương thích với app hiện tại, có quy trình kiểm tra trước thay đổi.

**Blocked by:** 01 — Đóng băng baseline đối chiếu toàn kho.

**Status:** done

**Execution authorized:** yes — chủ sản phẩm giao ticket 02 và 03 ngày 29/10/2026. 02 chỉ local: snapshot, ba migration có sẵn qua executor hiện hành và kiểm tra preview; không reset, import hoặc provider.

- [x] Xác minh đúng DB local chuyên dụng; có snapshot và khả năng phục hồi trước thay đổi được duyệt.
- [x] Chỉ áp dụng thay đổi schema đã duyệt, không reset lịch sử và không truy cập DB remote.
- [x] Giữ nguyên ID, số lượng trong scope và tiến độ cũ; có bằng chứng trước/sau.
- [x] Phạm vi đại diện hoạt động xuyên browse, setup và study bằng schema tương thích; sai lệch còn lại được ghi rõ.

**Evidence:** [Báo cáo local compatibility và preview](../../../docs/plans/editorial-refresh-2026-10-28/ticket-02-local-preview.md).
30 bảng cũ bảo toàn; thêm đúng migration 0019–0021. Backup custom được decode
đầy đủ, có recovery procedure; chưa restore. Guard tests 9/9, migration tests
21/21, API thật 4 checks và guest browser 2 flow desktop/mobile PASS. Không
claim đã kiểm tra account ghi review hoặc đã chạy CI/Production.
