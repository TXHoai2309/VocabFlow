# Ticket 07 — bounded local pilot integration

Status: OWNER ACCEPTED — DONE for the local pilot (direct acceptance on 2026-10-29). Current revision: r0002, all 60 audio enabled after owner listening confirmation. Earlier counts/holds below describe the r0001 checkpoint. Owner directly requested the next step on 2026-10-29 after accepting gallery r0002. This authorizes the local pilot implementation described here; the original frozen draft remains unchanged.

The first integration is a reversible development presentation of 30 existing runtime vocabulary IDs. Four local learning sets reference those same IDs. No canonical Master entities are invented, and scheduler/progress identity remains the existing integer ID. This local pilot uses one shared presentation per selected Sense across local collections; per-collection variants remain a future model, not silently implemented here.

Store the preview in a namespaced source_provenance.editorialLocalPreview object alongside the original development projection. Keep baseline examples, definitions, CEFR, grade, tags, content hashes and original media columns unchanged. Shared SQL reads use the preview only in the dedicated vocabflow_dev database and when its source hash still matches. Source content hash continues to identify the original Sense; the separate integration plan hash identifies the new presentation. New example keys use the editorial-draft namespace, never a source example key or canonical MasterExample ID.

Discovery uses intro-first-words as a discovery token, not a stored CEFR. Equivalent database and guest tag predicates apply to browse/count/setup/queue; empty intersections stay empty. No grade mapping is published by this pilot. Four sets are collections, not new canonical topics.

Media is shown only as Development preview with the existing PROPOSED/unknown-rights labels. Owner gallery approval is recorded, but this is not commercial publication approval or complete human phonetic QA. Five uncertain isolated word recordings (duck, blue, white, pen, pencil) are withheld; all 30 sentence recordings remain available. Five relationship images are intentionally omitted. Preserve every source receipt and original provider-planning hash; integration bindings are forward records with exact receipt/asset hashes, not rewritten provenance.

Only the Node local-development host serves a fixed hash allowlist under /api/local-editorial-media. It validates the dedicated loopback database markers and plan/asset hashes. Worker/production routes do not serve these files. No remote DB write, CDN upload, deployment, account creation or canonical release is included.

Before DML: validate identity and source pins, save a fresh local backup and the exact prior 30 projection rows. Use one transaction, compare protected table fingerprints before/after, and save an idempotent application result. Preserve all preexisting collection memberships. Verify real APIs, guest/account selection consistency and browse → setup → study. Remaining listening/rights/canonical identity gates keep tickets 05/06 and public release open.

## Kết quả 29/10/2026

Đã áp dụng trong PostgreSQL Docker local, không gọi DB remote:

| Nội dung | Số lượng |
| --- | ---: |
| Nghĩa cũ dùng lại, giữ ID/progress | 30 |
| Bộ học mới ở local | 4 (8/8/8/6 mục) |
| Ảnh đang dùng | 25 |
| Audio từ đơn đang dùng | 25 |
| Audio câu ví dụ đang dùng | 30 |
| Audio từ đơn giữ riêng chờ nghe lại | 5 |
| Ảnh chủ đích bỏ trống | 5 |
| Từ/nghĩa mới thực sự tạo thêm | 0 |

Bộ học local: 26 Động vật quen thuộc, 27 Màu sắc quanh em, 28 Ở trường, 29 Gia đình của em. Tên chính xác trong DB theo nhãn frozen manifest; đây là collection, không phải topic canonical. Không gán lớp từ CEFR. Có 25 nghĩa đang nằm trong nhiều bộ; kiểm tra đọc từ bộ và đọc trực tiếp trả cùng ID/trạng thái/lịch ôn.

Khi thử trình duyệt phát hiện ba nhãn runtime mô tả nghĩa dài (`fish`, `orange`, `paper`), đã dùng headword đã có trong provenance cho phần hiển thị pilot, đồng thời giữ nguyên nguồn trong DB. Tìm `fish` trong pilot trả đúng nghĩa danh từ 34300. Câu mới dùng khóa `editorial-draft:<draftRef>` và audio được nối đúng khóa đó. Trong local, cùng một Sense dùng chung cách trình bày pilot; chưa triển khai biến thể khác nhau theo từng bộ.

Chọn **Mức học → Từ đầu tiên — Pilot local**, hoặc mở http://127.0.0.1:5173/vocabulary?cefr=intro-first-words rồi **Học nội dung đã chọn**. Đã đi xuyên browse → setup → study → lật thẻ, phát được audio từ; ảnh và ví dụ hiện đúng. Giao diện 390px/1440px không tràn ngang, ảnh tải thành công. Thông tin job/hash của audio nằm trong mục mở rộng, bản thử vẫn được ghi rõ.

## Nơi lưu và chạy tiếp

- JSON phối hợp: `.vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0001/integration-plan.json`.
- Ảnh/audio giữ tên theo SHA256 trong `.vocabflow-local/editorial-refresh-20261028/media-production-r0001/assets/images|audio/`; JSON nối filename ↔ job ↔ receipt hash ↔ runtimeVocabularyId ↔ draft example.
- Bản nguồn frozen, work orders và receipt gốc giữ nguyên. JSON tích hợp là bản ghi nối tiếp cho việc chọn media; không sửa hash kế hoạch provider cũ thành hash prompt Muse.
- Bản dump trước khi áp dụng: `ticket07-local-pilot-r0001/pre-pilot.dump`; hash/size trong `backup.json`. Không đóng gói dump hay tài khoản vào handoff media.
- 30 projection trước thay đổi: `prior-projections.json`. DML chỉ thêm namespace `editorialLocalPreview` và bốn bộ/các membership mới; các cột dữ liệu nguồn cũ giữ nguyên. Kết quả/fingerprint: `apply-result.json`.
- Khởi động từ repo: `node scripts/editorial-pilot-local-serve-v1.mjs` (đọc riêng env local; API 3002, web 5173).
- Xác minh không ghi: `node --import tsx scripts/editorial-pilot-local-verify-v1.mjs`.
- Kiểm tra áp dụng lại: `node scripts/editorial-pilot-local-apply-v1.mjs --apply`; đã PASS idempotence, không tạo bộ trùng.

Muốn hoàn tác cần kiểm tra namespace vẫn khớp integration plan, rồi phục hồi đúng `source_provenance` của 30 dòng từ prior-projections, chỉ gỡ các membership/bộ vừa tạo khi chưa có gán bộ học mới cần giữ. Không phục hồi đè toàn DB sau khi có hoạt động khác. Dump đã tạo, chưa thực hiện restore test trong ticket này.

## Kiểm tra và giới hạn

- 241 test liên quan PASS (189 API/scope + 52 UI/client), build PASS; API/web typecheck và lint các file TS/TSX thay đổi PASS.
- 11 kiểm tra DB/API thật PASS: 30 mục, bốn bộ, empty scope không nới rộng, quyền sở hữu account, cùng ID/progress, 80 asset đúng byte/MIME. Dịch vụ account được kiểm tra trực tiếp với dữ liệu local hiện có; không đăng nhập browser hoặc tạo tài khoản mới.
- Fingerprint 15 bảng bảo vệ + migration history trước/sau áp dụng giữ nguyên; kiểm tra đọc lại cũng giữ nguyên. Không ghi tiến độ tài khoản.
- `pnpm lint` toàn repo còn 59 lỗi ở các script/local file có trước; `pnpm typecheck` toàn repo còn lỗi trong backfill-production-v2-image-coverage.ts, editorial-local-compat-v1.mts, local-development-postgres.ts, resolve-master-v2-development-pending.ts. Không coi kiểm tra toàn repo là PASS. Log typecheck ở thư mục local của ticket.
- Detector giao diện báo 8 border accent có trước trong styles.css, không nằm trong CSS thêm cho pilot; đã giữ nguyên phần ngoài phạm vi.
- 05/06 vẫn chưa chốt toàn bộ nghiệm thu: 5 từ `duck`, `blue`, `white`, `pen`, `pencil` cần nghe lại; quyền phát hành thương mại và identity canonical chưa được suy ra từ duyệt gallery. 07 được duyệt DONE trong phạm vi pilot local; phạm vi phát hành vẫn riêng biệt. 08–15 chưa bắt đầu.

## Chủ sản phẩm duyệt ticket 07

Ngày 29/10/2026, chủ sản phẩm xác nhận **“ticker 07 tôi duyệt”**. Đóng ticket07 cho phạm vi local đã trình bày và xác minh. Điều kiện phụ thuộc của08 được đáp ứng; chưa tự bắt đầu08. Năm audio đang giữ riêng vẫn giữ nguyên. Biên bản chấp thuận: `ticket-07-owner-acceptance.json`; package đã đóng gói trước đó giữ nguyên như một checkpoint lịch sử.

## Cập nhật r0002 — chủ sản phẩm xác nhận 5 audio

Sau khi được đưa đúng5file `duck`, `blue`, `white`, `pen`, `pencil` để nghe,
chủ sản phẩm xác nhận **“tôi nghe thì khớp nghĩ mà”**. Ghi nhận kết quả nghe
trực tiếp, gỡ trạng thái giữ riêng và bật lại đúng5clip cũ. Không tạo lại audio,
không sửa kết quả ASR lịch sử, không thay ID/progress hay nội dung từ.

Pilot hiện có **25ảnh +30audio từ +30audio câu**, không còn audio chờ nghe lại
trong nhóm5này. JSON đang dùng là
`.vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0002/integration-plan.json`.
Bản r0001 và package trước đó giữ nguyên làm checkpoint. Biên bản nghe nằm ở
`ticket-06-owner-listening-acceptance.json` và thư mục r0002.

DML có backup mới và đối chiếu15bảng bảo vệ/migration history trước/sau;
không ghi tiến độ.11kiểm tra DB/API thật PASS, toàn bộ85asset khớp byte/MIME;
chạy lại amendment PASS idempotence. Dùng
`node scripts/editorial-pilot-audio-acceptance-v1.mjs` để xác minh áp dụng r0002;
script áp dụng r0001 sẽ dừng rõ ràng khi r0002 đã tồn tại.
