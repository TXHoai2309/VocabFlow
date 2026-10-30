# Ticket 03 — bàn giao manifest/receipt đã chạy thử

Trạng thái: **HOÀN TẤT — MOCK ONLY**. Chủ sản phẩm giao 02/03 cùng lúc ngày
29/10/2026. Ticket 03 không kết nối DB, mạng hoặc provider; không sinh ảnh,
audio, danh tính canonical hoặc nội dung được phép nhập runtime.

## Đầu ra thực tế

Đọc ba nghĩa hiện có của `apple`, `blue`, `dog` từ baseline-v2 đã ghim. Mỗi
mục có ba job: IMAGE, WORD_AUDIO và EXAMPLE_AUDIO, tổng cộng **9 job**. Hai
tiến trình worker chạy đồng thời: ảnh trả 3 receipt, TTS trả 6 receipt; chỉ
điều phối ghép snapshot chung. Không còn job thiếu receipt trong canary hoàn tất.

Tất cả output là **`output.fake.json`, MIME `application/json`** với cờ
`mockOnly=true`, `runtimeEligible=false`. Không đổi đuôi JSON thành PNG/MP3 hoặc
để app hiển thị nó như media. Trạng thái nhận kết quả là REVIEW_REQUIRED_MOCK,
không phải ACCEPTED hoặc đã duyệt ngữ nghĩa.

- [Kết quả máy đọc được](ticket-03-manifest-canary.result.json) ghim input,
  output, tool và package hashes cho phiên sau.
- [Manifest ba mục](../../../.vocabflow-local/editorial-refresh-20261028/ticket03-canary-v1/input/manifest-r0001.json).
- [Snapshot tổng hợp](../../../.vocabflow-local/editorial-refresh-20261028/ticket03-canary-v1/results/snapshot-0001.json).
- [Gói bàn giao độc lập](../../../.vocabflow-local/editorial-refresh-20261028/ticket03-handoff-v1/README.md).

Gói bàn giao có **33 file được pin** cộng package manifest và sidecar,
SHA-256 của package manifest:
`e9069b44b26dbcb30d4f3af03d13ce852d8991f3f761312ce184f278fa66d0c6`.
Nó có cả tool verifier dùng Node core; không cần file baseline bị Git ignore
ở đường dẫn cũ. Đã kiểm tra sau di chuyển sang workspace khác.

## Cách các phiên nhận và ghi công việc

```text
ticket03-canary-v1/
  input/manifest-r0001.json
  coordination-state.json
  claims/<jobId>/<attemptId>.json
  runs/<workerId>/<jobId>/attempt-0001/
    output.fake.json
    receipt.json
  results/snapshot-0001.json
```

Manifest là bản bất biến chứa baseline pin, batchId, danh tính runtime/proposal,
ví dụ, brief và work orders với request hash. Master Lexeme/Sense/Example và
Pronunciation IDs vẫn null/chờ xác minh. Ví dụ chưa có `exampleKey` dùng
baselineExampleRef có phạm vi snapshot; không gọi đó là Master ID mới.

Điều phối cấp attempt/lease riêng cho worker, giữ registry trạng thái và khóa
ghi khi merge/retry/revision. Worker ghi claim, output và receipt riêng;
không sửa JSON tổng. Receipt ghim manifest, job, attempt, lease, worker,
target, request, output bytes/hash/length và trạng thái mock. Cùng attempt
khác bytes bị từ chối; giao/merge lặp cùng kết quả không tạo snapshot thừa.

## Sửa gì thì job nào hết hạn

| Chỉnh sửa thử | Kết quả đã kiểm tra |
| --- | --- |
| Chỉ đổi bản diễn đạt nghĩa Việt | Giữ cả ba request media khi ngữ nghĩa/brief giữ nguyên |
| Đổi câu tiếng Anh của một ví dụ | Chỉ audio của ví dụ đó thành STALE_INPUT |
| Đổi brief ảnh | Chỉ ảnh tương ứng thành STALE_INPUT |
| Đổi phoneme | Chỉ âm từ tương ứng thành STALE_INPUT |
| Đổi cấu hình voice của một mục | Âm từ và âm ví dụ của mục đó hết hạn |

Đây là thử nghiệm dependency bằng dữ liệu giả lập. Source content hash của
baseline giữ nguyên để nhận diện gốc; revision canary không phải một bản sửa
nghĩa canonical đã duyệt. Khi sửa bản chất nghĩa phải theo policy editorial
riêng, không áp dụng quy tắc giữ media chỉ vì hash canary chưa đổi.

## Kiểm tra và giới hạn

**21/21 tests đạt**, bao gồm process concurrency thực, input pins, sai job/
target/manifest/output, thiếu kết quả, xung đột, replay, retry lease, field-level
stale, khóa điều phối, traversal/Windows ADS/junction và package relocation.

```text
node --test scripts/editorial-canary-v1.test.mjs
node scripts/editorial-canary-v1.mjs verify-bundle .vocabflow-local/editorial-refresh-20261028/ticket03-handoff-v1
```

Trong workspace nhận gói, chạy tool có sẵn bên trong thư mục đã nhận:

```text
node <received-folder>/tools/editorial-canary-v1.mjs verify-bundle <received-folder>
```

Không chạy lại `demo` lên thư mục đã có; nó từ chối ghi đè. Các tests dùng
thư mục fixture riêng, không sửa canary đã đóng gói. Gói đã pin không được
worker cập nhật tại chỗ; kết quả/revision mới tạo checkpoint bàn giao mới.

Đây là hợp đồng canary nhỏ, không phải hệ provider production, cơ chế phân
quyền filesystem hay chứng nhận chất lượng phát âm/ảnh. Worker chạy cùng máy
theo nhiệm vụ được giao; production credentials, API idempotency, voice/locale,
style và policy asset thật vẫn chưa chọn. Tất cả output mock bị loại khỏi
runtime; phần tiếp theo là ticket 04 biên tập pilot khi được giao.
