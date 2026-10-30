# Hai worker chat — quy trình chung

Chat gốc “Audit dữ liệu từ vựng” là điều phối. Chủ sản phẩm tự mở hai chat và dán prompt; việc soạn gói này chưa có nghĩa hai worker đã chạy. Đọc `coordination.json` và xác minh byte SHA256 các input trước khi nhận việc. Thư mục repo: `D:/hoctienganh/VocabFlow`.

1. Đọc AGENTS.md và các tài liệu bắt buộc theo gate của repo, rồi đọc brief riêng. Phạm vi hiện tại là hợp đồng + bản thảo offline. Tự nghiên cứu, đối chiếu và hoàn thiện các phương án trong phạm vi này; gom câu hỏi quyết định chung vào handoff để điều phối xử lý một lần.
2. Tạo `claim.json` bằng ghi mới trong đúng owned root: worker role, ticket, thời điểm UTC và work-order hash. Nếu đã có claim, đọc trạng thái hiện có trước khi ghi; một worker sở hữu mỗi root. Hai chat dùng chung checkout có nhiều thay đổi chưa commit.
3. Viết vào owned root của mình. Điều phối sở hữu tracker/index, campaign-plan, registry, toàn bộ apps/packages/drizzle và manifest tổng. Nếu cần thay đổi phần chung, ghi đề xuất đường dẫn/interface/diff trong `integration-proposal.md`, để điều phối ghép một lần. Giữ nguyên dữ liệu/runtime tiến độ hiện có và các input frozen.
4. Nguồn đầu tiên là baseline-v2/corpus.json (7.341 dòng), identity-crosswalk.json và source-index.json; đọc thêm foundation-planning-inventory.json, ticket04 dedup-audit khi đối chiếu. Một chuỗi không tìm thấy trong baseline chưa chứng minh là nghĩa mới. Những Master IDs chưa xác minh giữ null/PENDING_IDENTITY. Draft refs là namespace riêng, không được nhận là Master IDs. Bất kỳ phát biểu chuyên môn/ngữ âm nào cần bằng chứng: tra tài liệu nguồn chính thức và ghi URL/ngày/phạm vi hỗ trợ; ghi rõ phần còn chưa chắc.
5. Đề xuất JSON schema/version riêng cho itemType của nhánh, media bindings và progress identity. Phân biệt danh tính nội dung, placement, phiên bản biểu đạt và bytes media. Mỗi audio phải gắn đúng activity/text/locale, request/dependency hash; ảnh có brief độc lập. Worker chỉ viết prompt/spec ở đợt này; điều phối cấp work order sau khi đối chiếu hai hợp đồng. Muse UI do điều phối giữ lease để tránh hai chat cùng thao tác một trang.
6. Khi xong, ghi `handoff.json`: ticketId, status=READY_FOR_COORDINATOR_REVIEW, workOrderByteSha256, inputPinsVerified, counts (theo loại item và genuinelyNewLexicalSenses riêng), proposedContractVersion, unresolvedDecisions, proposedSharedEdits và artifacts[{repoRelativePath,byteSha256,byteLength}]. Tất cả artifact phải nằm trong owned root; hash tính từ bytes đã lưu. Các câu chưa chốt và media chưa sinh được ghi trung thực. Trả về đường dẫn handoff cùng tóm tắt ngắn, để chủ sản phẩm báo chat điều phối đọc.

Các tài liệu chỉ đọc khi nhánh cần:

- ID/version: docs/architecture/master-vocabulary-v2-identity-versioning-policy.md; docs/adr/0002-reuse-senses-across-school-placements.md.
- Media/JSON/receipt: docs/plans/editorial-refresh-2026-10-28/coordination-contract.md; ticket-03-manifest-canary.md; tickets-05-06-media-handoff.md.
- Hiện trạng local: ticket-07-local-pilot.md và pinned activeLocalPresentation r0002; bản r0001 là lịch sử. Hiện đủ30 audio từ +30 audio câu; cả5 file từng bị ASR nghi ngờ đã được chủ sản phẩm nghe và duyệt. Ticket07 DONE local.
- Đối chiếu UI/runtime: đọc packages/contracts, packages/learning-domain, apps/api/src/review-queue.ts và luồng guest/setup/study có liên quan. Chỉ đề xuất seam cần thay, không đổi scheduler/tiến độ để né model mới.

Hoàn tất đợt này khi có hợp đồng cụ thể, bộ bản thảo nhỏ kiểm tra được, đối chiếu trùng có bằng chứng và handoff đầy đủ. Điều phối sẽ thống nhất phần chung, đóng băng đầu vào rồi giao tiếp phần triển khai/media; worker không tự đánh DONE cho ticket toàn phần.
