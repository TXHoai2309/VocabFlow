# Ticket 01 — baseline local đã đối chiếu

Trạng thái: **HOÀN TẤT TICKET 01**. Chủ sản phẩm giao
riêng ticket 01 ngày 29/10/2026. Phạm vi gồm đọc DB local, đối chiếu artifact
offline, tạo snapshot/crosswalk/shard/inventory; không sửa DB hoặc tạo nội dung.

## Gói được chọn

- Baseline: `vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2/`.
- Manifest SHA-256: `eef748df5dda27086c19f071ad6e3601f474b4494e07822fd844eda75f6365b2`.
- Thời điểm SQL: **29/10/2026 08:46:50 giờ Việt Nam** (`01:46:50 UTC`).
- Target: Docker `127.0.0.1:55432/vocabflow_dev`; PostgreSQL xác nhận
  `read_only=on`, `repeatable read`. Không đọc remote `.env` hoặc DB Neon.
- [Kết quả máy đọc được](ticket-01-baseline.result.json) ghi đường dẫn, hash
  và trạng thái bàn giao; các phiên dùng con trỏ này, không tự chọn thư mục.

Baseline-v2 là checkpoint được chọn sau kiểm tra độc lập. Checkpoint trước đó
được giữ nguyên; không ghi đè file đã đóng băng. Raw data và media vẫn bị Git
ignore, nên chỉ clone/worktree sẽ không có đầy đủ gói này.

## Những gì đã hạch toán

| Nội dung | Kết quả |
| --- | ---: |
| Tổng ID runtime | 7.341 |
| Nghĩa V2 / mục legacy | 7.311 / 30 |
| Chuỗi hiển thị V2 / headword gốc chuẩn hóa | 6.114 / 5.798 |
| Hiển thị khác headword sau chuẩn hóa | 573 |
| Khác chuỗi nguyên bản, gồm khác hoa/thường | 599 |
| Lô review độc quyền | 148, mỗi lô 39–50 hàng |
| Mục tiêu mẫu / có ứng viên / cần tìm tiếp | 355 / 262 / 93 |
| Media local khớp bytes/hash | 13.977: 4.669 ảnh + 9.308 audio |
| Liên kết media qua cả hai thế hệ inventory | 15.328, giữ nguồn riêng, không cộng thành coverage duy nhất |
| PASS/hash/review-receipt của V2 đối chiếu thành công | 7.311 |

Mỗi ID thuộc đúng một lô. Các nghĩa cùng headword và legacy có cùng headword
được gom cùng lô; các lô có ownership slot riêng, **chưa gán worker và chưa cho
phép biên tập**. Không tạo 148 ticket thực thi trong bước này.

Trong 93 mục chưa có khớp chính xác, 70 là ứng viên từ/cụm từ và 23 là câu/mẫu.
Chúng còn cần kiểm tra alias, biến hình, kho nguồn và đúng nghĩa. Không coi đây
là 93 từ mới đã xác minh thiếu; 262 mục có ứng viên cũng chưa được duyệt phù
hợp trẻ. Đây là mẫu phủ nền tảng, chưa phải danh sách 600 từ sẽ viết.

## File nào phục vụ phiên nào

| File trong baseline | Dùng để làm gì |
| --- | --- |
| `local-capture.json` | Snapshot nội dung, quan hệ bộ/chủ đề, schema và SELECT; không xuất hàng dữ liệu học viên |
| `corpus.json` | Toàn bộ nội dung đang có, hash/version và disposition ban đầu UNREVIEWED |
| `identity-crosswalk.json` | Runtime ID ↔ proposalKey/sourceGroupKey; Example key đang có; Master IDs chưa xác minh giữ null |
| `review-shards.json` | Danh sách ID từng lô và slot sở hữu, tránh hai phiên sửa cùng nhóm nghĩa |
| `coverage-target-matrix.json` | Mục tiêu → ứng viên trong V2/legacy và trạng thái cần kiểm tra |
| `excluded-rc-identities.json` | 3 FAIL, 6 REVIEW_REQUIRED và phạm vi ngoài universe RC được giữ riêng |
| `media/media-inventory.assets.json` | Toàn bộ đường dẫn, kích thước và hash media local đã đọc bytes |
| `media/current-runtime-bindings.json` | Mapping ảnh/âm từ/âm ví dụ nối lại với đúng ID/hash của snapshot hiện tại |
| `source-index.json` và `sources/` | Nguồn operational, hash, vị trí gốc và bản bytes được đóng gói |
| `summary.json`, `baseline-manifest.json` | Tổng số, vấn đề còn mở và danh sách file/hash bất biến |

Có 7.313 ví dụ V2, 5.913 có `exampleKey` cũ. Không tự tạo Master Example UUID
cho những mục thiếu. Một clip ví dụ hiện có đã nối khớp key và exact English
text của runtime; pronunciation/semantic review cho media vẫn là việc tiếp theo.

## CEFR và media được đối chiếu, chưa áp dụng

Enrichment giữ 5.539 nhãn cũ, bổ sung 1.155 nhãn, có 606 C2 và còn 617 unknown;
103 bất đồng nguồn thứ cấp được giữ. Cả 7.311 key/hash khớp với local và RC V9.
Đã phát lại đúng chuỗi chín overlay và kiểm tra 16 file receipt của các PASS.

Ba input Oxford/Vocab4600/taxonomy bị thiếu ở đường dẫn khai báo được tìm lại
trong bản lưu cũ, kiểm tra hash bằng đúng pin, rồi đóng gói nguyên bytes.
Nguồn operational có 51 entry, baseline có 65 file được hash-pin. Việc này
cho phép tái lập nội dung snapshot và các bước đối chiếu hiện tại.

Media cũ và backfill chồng lấp: 7.120 asset cũ là tập con của 13.977 asset sau.
Inventory mới nhất có ứng viên ảnh cho 2.979 nghĩa, âm từ cho 4.691 nghĩa, một
mapping âm ví dụ khớp. Mọi mapping vẫn giữ trạng thái PROPOSED/UNSPECIFIED;
khớp hash không tự duyệt ngữ nghĩa, phát âm, quyền hoặc CDN hiện tại.

## Giới hạn cần bàn giao rõ

- Chưa có Master UUID mapping được xác minh cho các hàng này; giữ nguyên
  runtime/proposal identity, không mượn registry cũ theo chữ hoặc integer ID.
- Mọi hàng bắt đầu UNREVIEWED trong chiến dịch; kiểm tra cấu trúc và receipt
  lịch sử không phải review ngữ nghĩa mới toàn kho.
- Bằng chứng archive/member/record lịch sử của 573 hàng OEWN chưa được replay
  đầy đủ. Queue/provenance giữ nguyên claim; không tuyên bố toàn bộ chuỗi bằng
  chứng raw ban đầu đã khép kín. Giới hạn này được ghi trong baseline.
- Schema local còn thiếu bảng nghĩa ngắn và trường topic/display; ticket 02
  xử lý tương thích. Ticket 01 không chạy migration/reset.
- Archive bàn giao local là gói di chuyển giữa các phiên; nơi backup ngoài
  máy vẫn chưa chọn. Bản DB không chứa hoặc xuất account/learner records.

## Kiểm tra và tái kiểm tra

Node **v22.19.0**, Python **3.13.1**. Từ gốc repo:

```text
node scripts/editorial-baseline-v1.mjs verify vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2
node --test scripts/editorial-baseline-v1.test.mjs
python scripts/package-editorial-baseline-v1.py verify
```

Đã đạt 9/9 kiểm tra: baseline hợp lệ, cấm ghi đè capture/baseline, bắt sửa byte,
bắt sửa manifest, file dư, traversal và junction/symlink. Lượt kiểm tra độc lập
thứ hai xác nhận 65 hash, 51 nguồn, toàn bộ ID/shard, overlay/receipt và coverage.

Gói ZIP chứa `baseline-v2/` và `media-bytes/{images|audio}/<hash>.<extension>`.
Trong phiên nhận, dùng `source-index.packagePath` tương đối theo baseline và
media hash để tìm bytes trong bundle; đường dẫn local gốc được giữ làm dấu vết,
không yêu cầu file phải còn ở đường dẫn cũ. `handoff-manifest.json` mô tả layout.
Trạng thái kiểm tra archive được ghi trong JSON kết quả khi đóng gói xong.

Archive đã kiểm tra đủ **14.045 entry**, gồm 67 file baseline (có manifest và
sidecar) và 13.977 media cùng handoff manifest. Dung lượng ZIP **665.093.401
bytes**, SHA-256 `144c8a01d7d1754cb0af66ab58438b913e6cdda30c5642159d8c142a6f19806b`.
[Gói bàn giao ZIP](../../../.vocabflow-local/editorial-refresh-20261028/handoff/baseline-v2-eef748df5dda27086c19f071ad6e3601f474b4494e07822fd844eda75f6365b2.zip)
và [receipt](../../../.vocabflow-local/editorial-refresh-20261028/handoff/baseline-v2-eef748df5dda27086c19f071ad6e3601f474b4494e07822fd844eda75f6365b2.receipt.json)
đang ở local; không phải backup ngoài máy hoặc nội dung đã phát hành.
