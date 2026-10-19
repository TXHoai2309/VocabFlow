# Audit hiệu năng tải dữ liệu — US-58

Ngày kiểm tra: 2026-10-19. Phạm vi: đọc mã nguồn và đo HTTP/Chromium trên
https://vocab-flow-steel.vercel.app ở chế độ chưa đăng nhập.

Bản đang chạy dùng `/assets/index-CC7GMvwk.js`, trùng asset của build đã publish
trong commit `7ff92c925e6498334738c809103c40f50b337a02`.

## Kết luận

Điểm nghẽn chính là kiến trúc tải dữ liệu của chế độ khách: mọi yêu cầu guest,
kể cả cài đặt/hoạt động chỉ cần localStorage, đều chờ tải và xác thực toàn bộ
catalog trước khi xử lý. Catalog gồm 7.311 từ với đầy đủ nội dung, ví dụ và URL
media. Đây là vấn đề của thay đổi US-58; kiểm thử chức năng với fixture 1–2 từ
không xác minh được hiệu năng với quy mô Production.

## Số đo thực tế

| Yêu cầu | Cache | Chờ byte đầu | Tổng thời gian |
| --- | --- | --- | --- |
| HTML `/` | HIT | 176 ms | 179 ms |
| `/api/health` | MISS | 142 ms | 144 ms |
| `/api/auth/get-session` không cookie | MISS | 97 ms | 99 ms |
| `/api/public/learning-catalog`, lần đầu | MISS | 8.602 ms | 9.407 ms |
| Cùng catalog, ngay sau đó | HIT | 94 ms | 508 ms |
| Cùng catalog, đo lại | STALE | 233 ms | 480 ms |

Catalog: **8.140.988 byte JSON giải nén**; Chromium đo khoảng **1.851.212 byte
response body đã nén**, không phải 8 MB thực truyền trên dây. Gồm 7.311 từ,
11 bộ từ và 21 chủ đề. Riêng mảng vocabulary chiếm 8.078.646 byte (99,2%).
Giá trị examples chiếm khoảng 1,48 MB; audio/image URL cộng lại khoảng 1,47 MB.
Các số theo trường chưa tính tên key và dấu phân cách JSON.

Đo Chromium với cache STALE và browser context mới:

- Home hiển thị số liệu sau 1.122 ms; API catalog tải trong 395 ms.
- Cài đặt hiển thị form sau 2.550 ms; vẫn tải catalog, mất 1.105 ms.
- Từ vựng hiển thị trang đầu sau 1.473 ms; vẫn tải toàn bộ 7.311 từ.

Đây là một số lần đo từ môi trường audit, không phải thống kê p95 hoặc phép
đo trên điện thoại/mạng di động. Không dùng số 9,4 giây làm cam kết cho mọi lần tải.

## Findings theo ưu tiên

### P1 — Catalog đầy đủ nằm trên đường chờ của mọi thao tác khách

`apps/web/src/features/guest/learning-fetch.ts:143` gọi `await catalog()` trước
khi phân nhánh theo resource. `settings`, `activity-summary`, `gamification`,
`reset-progress` và các thao tác lưu local cũng phụ thuộc dữ liệu/mạng.
Trang Vocabulary chỉ hiển thị 30 dòng nhưng phải nhận toàn bộ nội dung 7.311 từ.
Home dùng chung một Promise: không phải 7 lần HTTP tải catalog; vấn đề là tất
cả cùng chờ một gói dữ liệu quá lớn.

Khắc phục ưu tiên:

1. Xử lý resource thuần local trước khi tải catalog; không chặn Settings/activity
   bằng mạng. Các write cần nội dung chuẩn chỉ tải đúng vocabulary liên quan.
2. Tách index/bootstrap nhỏ (membership/ID và metadata cần để lập queue) khỏi
   full detail. Browse/search dùng API giới hạn/phân trang; Study lấy nội dung
   theo batch của phiên học, không tải toàn bộ kho.
3. Giữ guest progress riêng và áp dụng public-media policy trên endpoint mới.

### P2 — Route catalog làm nhiều việc lớn trước khi gửi byte đầu

`apps/api/src/public-learning-catalog.ts:13` chờ query toàn bộ vocabulary và
projection trước, rồi mới chạy hai query membership song song. Reader lấy
examples/development_media cho cả kho và validate từng DTO. Catalog được
validate lại. Middleware trong `apps/api/src/index.ts:345` đọc lại JSON
response, duyệt/lọc media rồi serialize lại trước khi gửi.

Cold-cache TTFB 8,6 giây xác nhận chi phí lớn trước byte đầu, nhưng route
không có Server-Timing cho SQL, DTO mapping, validation hay sanitizer.
Chưa thể kết luận Neon cold start, SQL hay JSON chiếm bao nhiêu.
Health và session nhanh trong cùng đợt đo: chưa có bằng chứng toàn server chậm.

Khắc phục: thêm timing theo giai đoạn, giảm projection/payload trước; sau đó mới
đánh giá index/query plan, vị trí DB và cold start. Giữ sanitizer tại đúng
boundary, không bỏ kiểm tra quyền media để đổi lấy tốc độ.

### P2 — Cache giảm triệu chứng, không loại bỏ tải toàn bộ kho

Promise cache chỉ sống trong trang hiện tại. Tab mới/reload phải đi lại luồng
fetch; HTTP/Vercel cache có thể trả nhanh khi có HIT/STALE. Cold edge vẫn phải
xây dựng gói lớn. TTL là 60 giây với stale-while-revalidate 300 giây ở origin;
Vercel xử lý phần stale nên client thấy Cache-Control max-age=60.
Không kết luận cứ sau 60 giây là phải chờ 9 giây: STALE đã đo trả nhanh.

Chọn index nhẹ có version/ETag/cache phù hợp; full detail phân trang/batch.
Chỉ tăng TTL của gói 8 MB chưa giải quyết chi phí tải trên mạng yếu.

### P2 — Xử lý browser lặp lại theo quy mô dữ liệu

`learning-fetch.ts:185` dựng lại toàn bộ danh sách với trạng thái cho nhiều
resource không dùng danh sách. Progress-summary/topic-progress lọc nhiều lượt;
guestToday tạo Intl.DateTimeFormat trong vòng lọc từ đã học.

Benchmark synthetic cục bộ (không phải điện thoại): progress-summary khoảng
6 ms khi chưa có tiến độ, 61 ms với 1.000 từ đã học và 228 ms với 5.000 từ.
Thấp hơn cold API nhưng tăng khi học lâu. Nên tính ngày một lần mỗi request,
tạo index dùng lại và tránh dựng DTO full khi chỉ cần count.

### P2 — Thiếu kiểm thử tải dữ liệu thật và ngân sách hiệu năng

Fixture unit chỉ 2 từ; browser guest fixture chỉ 1 từ. Các kiểm thử pass về
correctness nhưng không phát hiện payload 8 MB/TTFB cao. Cần fixture quy mô
Production hoặc dữ liệu tổng hợp tương đương; kiểm tra số byte/row trả về và
cold/warm browser timing. Đo riêng API, network và main-thread trước/sau sửa.

## Ranh giới audit

Chỉ public GET, browser headless và benchmark synthetic local. Không đăng nhập
tài khoản, không ghi progress vào Production, không truy vấn DB trực tiếp,
không đổi mã ứng dụng, không commit/push/deploy. Chưa đo đường tài khoản thật;
account requests vẫn đi API cũ theo mã nguồn. Metrics và response công khai
nằm trong thư mục local bị gitignore `.vocabflow-local/performance-audit-20261019/`.
