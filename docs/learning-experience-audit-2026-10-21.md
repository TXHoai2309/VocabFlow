# Rà soát hiệu năng và trải nghiệm học — 21/10/2026

Trạng thái mới nhất: đợt 1 đã triển khai cục bộ trong
[US-59](stories/US-59-learning-catalog-consistency.md), còn tùy chỉnh hiển thị
đã triển khai cục bộ trong [US-60](stories/US-60-flashcard-display-preferences.md).
Tuyển chọn nội dung phù hợp lớp 1–2 vẫn là đợt 3. Chưa đo production,
truy cập DB, áp dụng migration hoặc triển khai website. Nội dung khảo sát bên
dưới được giữ làm bằng chứng trước thay đổi.

### Quyết định chủ sản phẩm đã chốt sau khảo sát

Ngày 21/10/2026, chủ sản phẩm trả lời “đồng ý cả 3” với đề xuất ba đợt:
đợt 1 trước; nội dung phù hợp lớp 1–2 chưa gắn sách cụ thể; mặc định Tự nhớ
và lưu tùy chỉnh theo hồ sơ, khách theo thiết bị. Xem `docs/decisions.md` và
`GLOSSARY.md`. Các mục “đề xuất/chưa chốt” bên dưới là lịch sử khảo sát; ba
quyết định trên đã được chốt, các chi tiết còn lại chưa mặc định được duyệt.

Hai quyết định tiếp theo cũng đã được chủ sản phẩm chốt: Q4 không đưa phân
loại suy luận chưa duyệt vào bộ lọc chính, Q5 chủ đề cha bao gồm chủ đề con và
lọc tiếp theo lớp học, không đếm trùng. Xem ADR-0001 và US-59 về cách triển khai
và kết quả kiểm chứng; tùy chỉnh hiển thị là đợt 2, tuyển chọn nội dung là đợt 3.

Khảo sát tiếp theo đã chốt lộ trình ban đầu là bộ chủ đề tự chọn, khoảng 30 từ
qua bốn chủ đề quen thuộc, không ép học theo thứ tự. Chỉ đưa từ vào sau khi đã
duyệt độ phù hợp tuổi, nghĩa Việt ngắn, ví dụ Anh–Việt dễ hiểu và quyền sử dụng
media. US-61 bổ sung bộ lọc lớp/chủ đề. US-62 ghi nhận tiền kiểm: chỉ mục V2
local hiện cung cấp 0 chủ đề đủ điều kiện và 0 gán lớp; các media lấy mẫu có
quyền UNKNOWN, nên chưa có từ lớp 1–2 nào được kích hoạt.

## Phạm vi đã xác nhận

Ứng dụng phục vụ mọi độ tuổi. Nội dung phù hợp lớp 1–2 là một lộ trình trong sản phẩm chung, không đổi toàn bộ ứng dụng thành sản phẩm chỉ dành cho tiểu học. Yêu cầu gồm tải dữ liệu nhanh hơn, kho từ gọn hơn, chủ đề nhất quán, tùy chỉnh nội dung thẻ học và liên kết lớp học với chủ đề.

## Phát hiện từ mã nguồn

| Phát hiện | Bằng chứng | Hướng cải thiện đề xuất |
| --- | --- | --- |
| Kho từ tải toàn bộ nội dung từ đã lưu chỉ để lấy ID | `apps/web/src/features/learners/vocabulary-list-page.tsx:240`; `apps/api/src/learner-saved-vocabulary.ts:165`; guest `apps/web/src/features/guest/learning-fetch.ts:174` | Trả trạng thái lưu trên trang hiện tại hoặc API ID nhẹ; tránh tải định nghĩa, ví dụ và media không sử dụng. |
| Mỗi lần browse chạy lại truy vấn metadata bộ lọc trên toàn dataset | `apps/api/src/learner-vocabulary-browse.ts:188,224–260` | Tách metadata khỏi trang dữ liệu; cache theo phiên bản dataset và chính sách hiển thị, có cơ chế invalidation. |
| Trang chủ phát 7 yêu cầu khi mount | `apps/web/src/features/home/home-page.tsx:57–90` | Đo waterfall; cân nhắc summary nhẹ dùng chung kiểm tra quyền và tải lịch sử khi cần. Không mặc định gộp mọi endpoint. |
| Setup học chờ danh sách bộ từ trước khi tải queue | `apps/web/src/features/study/study-setup-page.tsx:128–164` | Chạy song song ở scope không cần danh sách để xác định queue; giữ validation của lựa chọn tùy chỉnh. |
| Bộ lọc chủ đề gộp tên chuẩn, tên legacy và toàn bộ tags; DISTINCT chỉ loại trùng chuỗi | `apps/api/src/learner-vocabulary-browse.ts:235–259`; `apps/web/src/features/learners/vocabulary-list-page.tsx:340–343` | Dùng định danh chủ đề chuẩn, alias và tên Việt thống nhất; phân biệt nội dung suy luận và nội dung đã duyệt. Không gộp theo tên gần giống. |
| Mô tả pipeline xuất hiện như mô tả học tập | `apps/web/src/features/learners/topics-page.tsx:121`; `scripts/build-master-v2-development-learning-metadata-v1.mjs:269` | Mô tả ngắn dành cho người học; provenance nằm trong thông tin nguồn riêng. |
| Thẻ luôn hiện giải thích và nhiều metadata | `apps/web/src/features/learners/vocabulary-card.tsx:118–138`; `apps/web/src/features/study/flashcard.tsx` | Thẻ kho gọn; giải thích dài ở chi tiết; mặt học cho phép bật/tắt từng loại nội dung. |
| Notice ảnh dùng nhãn Development và fallback PROPOSED khi có master identity + ảnh | `apps/web/src/features/study/development-media.tsx:50–59`; `vocabulary-card.tsx:164` | Hiển thị nguồn theo trạng thái thực tế; không suy diễn tình trạng phát hành từ sự tồn tại của master identity. Bảo toàn quyền truy cập/media policy và bằng chứng nguồn. |
| Menu lớp học đã tồn tại, nguồn cũ không có phân loại lớp; pipeline metadata được kiểm tra ghi 0 schoolGradeAssignments | `docs/stories/US-26-vocabulary-grade-level.md`; `scripts/build-master-v2-development-learning-metadata-v1.mjs:287` | Cần tuyển chọn nội dung thật cho lớp 1–2. Không coi thêm option hoặc đổi CEFR thành lớp học là hoàn tất. |

Browse hiện đã có SQL pagination, debounce 300 ms, AbortController và ảnh lazy-load. Guest đã có scheduling index nhẹ, detail batch giới hạn và public cache. Không dùng kết quả audit cũ của full catalog để mô tả mã hiện tại.

## Phương án khảo sát ban đầu — quyết định đã chốt, phần biên tập còn lại ở US-62

1. Giữ visual system hiện có; giảm mật độ chữ, thống nhất vị trí nút nghe/lưu, phân cấp từ → nghĩa ngắn → thông tin phụ. Không thay theme chỉ vì đổi trải nghiệm học.
2. Kho từ: từ, IPA, loại từ, nghĩa ngắn, nút nghe/lưu; giải thích đầy đủ trong chi tiết. Không tự rút gọn bằng cách sửa nội dung nghĩa gốc.
3. Tùy chỉnh học: các cấu hình dễ làm quen, tự nhớ, chi tiết; công tắc nghĩa Việt, giải thích Việt, định nghĩa Anh, ví dụ và ảnh. Phải phân biệt nội dung hiện trước khi lật với nội dung hiện sau khi lật; tránh rò đáp án qua nhãn trợ năng.
4. Chủ đề: tên Việt nhất quán, cấu trúc cha–con, số từ theo bộ lọc hiện tại, trạng thái không có nội dung và hành động học chủ đề. Không sửa ID từ hay lịch sử học khi chuẩn hóa tên.
5. Lớp học, độ tuổi, CEFR và chủ đề là các chiều khác nhau theo taxonomy contract hiện có. Người lớn mới học vẫn có thể chọn nội dung nền tảng; A1 không tự động đồng nghĩa lớp 1.
6. Lộ trình lớp 1–2 cần từ và nghĩa cụ thể phù hợp trẻ, câu ngắn, hình/âm thanh phù hợp, kiểm tra chủ đề nhạy cảm. Một chủ đề rộng như Cơ thể có thể phù hợp nhưng không phải mọi từ trong chủ đề đó phù hợp trẻ.
7. Trang chủ nên ưu tiên một hành động tiếp tục học và lượng học hôm nay; tổng số từ toàn kho là thông tin khám phá, không phải khối lượng người học phải hoàn thành hôm nay.

Đã đọc UI UX Pro Max và chạy truy vấn React. Tra cứu progressive disclosure trả kết quả typography không phù hợp sau một lần thử lại; không coi kết quả đó là căn cứ. Thiết kế giảm thông tin trên thẻ ở trên là đề xuất dựa trên ảnh, mã và design system của repo.

## Thứ tự thực hiện đề xuất

1. Đo baseline guest/account, cold/warm: TTFB, bytes, số request, thời điểm thấy từ đầu tiên, p50/p95; tách ownership/page/count/filter/map/serialize nếu thêm Server-Timing.
2. Giảm tải saved words và metadata bộ lọc; kiểm tra cache không rò dữ liệu giữa người học. So sánh trước/sau trên cùng fixture.
3. Sửa presentation thẻ và thông tin nguồn; chuẩn hóa read model chủ đề có mapping rõ ràng.
4. Chốt và triển khai tùy chỉnh học, tính nhất quán giữa setup/thẻ/settings và lưu trữ guest/account.
5. Tuyển chọn bộ nội dung lớp 1–2, liên kết grade × topic × learning set, kiểm tra queue thực sự nhận cùng bộ lọc khi bấm học.

Chưa có bằng chứng định lượng để kết luận cold start Neon, region DB, index SQL hay media là nút thắt chính. Không thêm index hoặc bỏ sanitizer theo phỏng đoán.

## Điều kiện còn lại trước khi phát hành nội dung lớp 1–2

- Kiểm tra từng từ, nghĩa, câu Anh–Việt và phân lớp trên exact canonical ID.
- Cung cấp asset-level rights evidence hoặc tạo media first-party có semantic
  review; các tag `PROPOSED`/`UNKNOWN` không đủ điều kiện hiển thị công khai.
- Xác nhận bốn chủ đề cụ thể sau khi đối chiếu taxonomy đã duyệt; chỉ tạo chủ đề
  mới nếu các khái niệm hiện tại không diễn đạt đúng chủ đề học.

ADR-0001 ghi nhận chính sách chủ đề Q4/Q5. Display preset và quyền sở hữu đã
được chốt trong US-60. Nội dung lớp 1–2 vẫn phải qua US-62; không suy ra rằng
việc thêm bộ lọc đã hoàn thành phần dữ liệu.

## Khảo sát sâu lần 2 — theo yêu cầu tiếp tục khảo sát

### Liên kết kho từ với phiên học

Luồng chủ đề hiện có hoạt động ở mức mã nguồn: `topics-page.tsx:255` và
`guest-collection-page.tsx:44` tạo URL có `topicId`; setup giữ scope khi chuyển
sang trang học; account SQL kiểm tra bảng `vocabulary_topics`
(`apps/api/src/review-queue.ts:233–237`), guest chọn ID theo public index
(`apps/web/src/features/guest/learning-fetch.ts:67–82`).

Tuy nhiên, lớp học và CEFR chỉ lọc browse. Link từ kho sang `/topics` bỏ các
điều kiện hiện tại (`vocabulary-list-page.tsx:301`). Shared scope chưa có
grade/CEFR (`packages/contracts/src/study-scope.ts:6–7`), parser còn loại tổ hợp
topic + learning set (`study-queue.ts:29–34`). Vì vậy không thể thực hiện đúng
“học chủ đề Con vật, lớp 1” chỉ bằng đổi giao diện hoặc thêm query parameter.
Cần mở rộng contract, validation, count, SQL account và chọn ID guest cùng lúc.

Một nhãn lớp trên topic detail không phải bộ lọc: account chỉ suy ra nhãn khi
mọi từ trong chủ đề có cùng lớp (`topics-page.tsx:208–209`); guest truyền NULL.

### Phạm vi “Tất cả” có dấu hiệu không đồng nhất

Trong V2, account `source=all` đi vào nhánh EXISTS membership của bộ từ đang
bật (`review-queue.ts:243–250`); guest lấy toàn bộ ID đang bật từ public index
(`learning-fetch.ts:76–79`). Account V2 `pathway` lại có nhánh đặc biệt cho
toàn dataset (`review-queue.ts:232,465–466`). Đây là chênh lệch đã thấy ở mã,
chưa có kiểm thử parity chuyên biệt trong khảo sát này và chưa đối chiếu DB
deployed. Con số 594 từ ngoài bộ trong tài liệu lịch sử không phải số đếm mới.

Ưu tiên tạo fixture: một từ enabled có trong bộ, một từ enabled ngoài mọi bộ,
một từ disabled; so sánh guest/account cho all, pathway và collection scope.
Không sửa bằng cách gán đại mọi từ vào bộ hoặc thay lịch sử người học.

Tên “Học theo lộ trình” hiện chưa đảm bảo một trình tự nội dung theo tuổi,
trình độ hay chương trình. Cần chốt ý nghĩa sản phẩm trước khi quảng bá một
lộ trình lớp 1–2; người lớn mới bắt đầu vẫn cần lộ trình nền tảng riêng.

### Trang chủ còn thực hiện công việc có kết quả rỗng cố định

- `continue-learning.ts:169–176`: kiểm tra quyền rồi trả candidate NULL ở V2.
- `learning-sets.ts:302–304`: kiểm tra quyền rồi trả danh sách bộ đã gán rỗng ở V2.
- Home vẫn gọi cả hai. Do đó trạng thái “chưa có bộ từ” trên dashboard chưa đủ
  để kết luận kho không có bộ; service V2 đang chặn khả năng đọc đó.
- Activity summary nhóm sự kiện theo toàn bộ ngày học
  (`activity-summary.ts:149–164`); Home sau đó gọi history 7 ngày, đọc lại
  cùng nguồn sự kiện (`progress-history.ts:94–110`). Giữ ý nghĩa streak trên
  toàn lịch sử khi tối ưu; không tùy tiện giới hạn streak thành 7 ngày.
- Better Auth đã có cookie cache 60 giây (`auth.ts:15–18`). Không diễn giải
  7 HTTP requests thành 7 lần truy vấn session DB.

Hướng xử lý: dashboard read model nhẹ, dùng chung dữ liệu ngày/ownership khi
hợp lý, không phụ thuộc queue chứa DTO đầy đủ chỉ để vẽ số lượng; giữ lỗi cục
bộ của từng khối. Cần đo trước khi chọn gộp endpoint hay gom query bên trong.

Home gọi queue mặc định có thể lấy tới 20 due + 10 new với nội dung đầy đủ,
nhưng card tiếp tục học chỉ dùng candidate đầu tiên
(`home-dashboard-components.tsx:296–299`). Không thay bằng capacity=1 tùy
tiện: số nguồn, số candidate và hạn mức hôm nay phải giữ đúng ý nghĩa riêng.

Account còn có chuỗi session → resolveAccountLearning → dashboard
(`App.tsx:68–112`; `learner-context-provider.tsx:87–93`). Lựa chọn learner
trong localStorage không thay được canonical verification; nếu làm bootstrap
nhẹ hơn phải giữ nguyên kiểm tra quyền.

Setup tải queue preview rồi Study mount tải lại queue
(`study-setup-page.tsx:78–85,230`; `study-page.tsx:207,223`). Account lặp query;
guest chia sẻ promise nội dung. Có thể tách preview count khỏi queue học hoặc
handoff có freshness/version; không bỏ bước xác nhận revision vì muốn nhanh.

### Tải lần đầu và cache

- `apps/web/src/App.tsx:7–24` import trực tiếp các trang, gồm cả Study và
  Progress; chưa có route lazy loading trong file này. Tách theo route là
  ứng viên tối ưu tải lần đầu, cần đo bundle mới và tránh tạo waterfall mới.
- Public HTTP cache có max-age 60 giây và stale-while-revalidate 300 giây.
  Nhưng `public-learning-client.ts:7–43` giữ index promise và word promises
  trong bộ nhớ không có TTL. Chưa thấy production caller tự invalidation;
  khả năng nhìn nội dung cũ ở tab mở lâu cần kiểm tra khi đổi dataset/media.
  HTTP TTL không tự làm mới promise đã resolve.
- Audio chính chỉ được tạo và gán URL trong thao tác play
  (`pronunciation-audio.ts:82–124`); không có bằng chứng mọi thẻ đồng loạt tải
  audio chỉ vì hook có `preload=auto`.

### Tùy chỉnh học cần có chủ sở hữu rõ ràng

Source preference hiện lưu localStorage theo userId, không phải learnerId
(`study-source-preference.ts:7,16`). Hai hồ sơ trong cùng tài khoản có thể dùng
chung lựa chọn nguồn học. Không dùng nguyên khóa này cho tùy chỉnh thẻ mới.

Đề xuất đang mở: cài đặt hiển thị theo hồ sơ; khách theo trình duyệt; override
trong phiên chỉ tác động phiên đó. Đồng bộ account cần mở rộng API/settings,
guest cần schema/default/migration phù hợp; guest state hiện strict version 1
(`guest-store.ts:13–19`). Thêm field tùy tiện có thể làm dữ liệu cũ không parse.

“Hiện nghĩa Việt” cần tách ít nhất hai ý: hiện trước khi lật, và có hiện sau
khi lật hay không. Tương tự, giải thích Việt khác định nghĩa Anh; ví dụ Anh
khác bản dịch ví dụ. Preset là nhóm giá trị mặc định, không nên là một hệ cài
đặt cạnh tranh với các công tắc riêng.

### Thẻ học: hành vi và bố cục cần giữ

- Mặt trước hiện loại nội dung đáp án khỏi DOM, không chỉ giấu bằng CSS.
  Mặt sau có mô tả sr-only chứa nghĩa (`flashcard.tsx:85`); khi thêm tùy chọn
  ẩn nghĩa phải cập nhật cả mô tả này. Đây là yêu cầu cho feature mới, không
  phải kết luận mặt trước hiện tại đang lộ nghĩa.
- Toàn mặt sau hiện là nút lật. Nút cài đặt, nghe, mở giải thích và ví dụ phải
  nằm ngoài nút này để tránh lồng tương tác và thao tác nhầm.
- Phím đánh giá nhớ/chưa nhớ chỉ chạy sau khi lật. Giữ nguyên quy tắc lưu
  server xác nhận rồi mới tiến thẻ; cài đặt hiển thị không thay scheduler.
- Font từ lên tới 60px nhưng hình cao tối đa 144px (`styles.css:1329,1341`);
  nhiều lớp chú thích làm từ/ảnh/mẫu câu thiếu cân bằng. Đề xuất mặt gọn có
  một nghĩa và một ví dụ; phần chi tiết mở thêm. Số ví dụ hiển thị không được
  làm mất ví dụ gốc.
- Hover, focus và selected của topic đang dùng chung màu
  (`styles.css:967`), có thể tạo cảm giác nhiều chủ đề cùng được chọn trong
  ảnh. State React chỉ lưu một selectedTopicId; chưa có bằng chứng lỗi chọn
  nhiều. Cần phân biệt focus ring với selected fill khi chỉnh UI.

### Kế hoạch chia lát triển khai đề xuất

| Lát | Kết quả cần đạt | Bằng chứng nghiệm thu |
| --- | --- | --- |
| 1. Đo và sửa tải dư | Saved IDs nhẹ, metadata không tính lại theo page, bỏ request rỗng phù hợp khả năng V2 | So sánh bytes/request/timing cùng fixture, cache không rò người học, không đổi kết quả browse |
| 2. Đồng nhất nguồn học | All/pathway có ý nghĩa rõ, guest/account chọn cùng nội dung | Fixture enabled ngoài bộ; disabled luôn bị loại; scope hẹp không mở rộng |
| 3. Kho và chủ đề gọn | Không lộ ghi chú pipeline, alias chuẩn giữ đúng membership | Kiểm tra ảnh công khai đúng policy, keyboard, mobile; không mất nghĩa hay ID |
| 4. Tùy chỉnh thẻ | Preset + công tắc nhất quán, lưu theo chủ sở hữu đã chốt | Hồ sơ A/B cách ly, guest dữ liệu cũ đọc được, nội dung tắt không còn trong DOM/nhãn, save fail không tiến thẻ |
| 5. Nội dung lớp 1–2 | Bộ nội dung đã tuyển chọn, chủ đề và phiên học cùng giao tập từ | Topic × grade/pathway count khớp queue; empty không tự đổi sang toàn kho; kiểm tra ví dụ/ảnh/nghĩa từng từ |

Đây là kế hoạch đề xuất, không phải thay đổi baseline hay chấp thuận triển khai.

### Kiểm chứng đã chạy trong khảo sát

Lệnh: `pnpm exec vitest run apps/web/src/features/guest/guest-performance.test.ts apps/web/src/features/guest/public-learning-client.test.ts apps/web/src/features/study/flashcard.test.tsx apps/web/src/features/study/study-queue.test.ts`.

Kết quả: **4 test files / 71 tests PASS**. jsdom ghi các thông báo
HTMLMediaElement load/play/pause chưa được triển khai, nên kết quả không xác
nhận phát audio thật. Test guest có fixture 7.311 từ và giới hạn payload/batch;
đó không phải số từ hiện tại hay benchmark production. Chưa chạy browser
thực tế, build mới, EXPLAIN SQL, API account thật hoặc đo mạng production.
