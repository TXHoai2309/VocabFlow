# Biên tập toàn kho và mở rộng nội dung — phân tích 28/10/2026

Cập nhật kế hoạch: **29/10/2026**. [Ticket 01 đã hoàn tất](ticket-01-baseline.md)
với lần đọc DB local mới ngày 29/10; các bảng khảo sát bên dưới giữ mốc phân
tích 28/10 và đã được đối chiếu lại trong baseline. Không phải số Production
hoặc một lượt review ngữ nghĩa mới toàn kho.

Trạng thái: **01–04 hoàn tất local/bản thảo**: baseline chỉ đọc, schema tương thích,
canary bàn giao giả lập và pilot30 từ dùng lại đã review độc lập. Chủ sản phẩm đã chốt kiểm tra
toàn kho, giữ phần đúng/sửa có chọn lọc; mục tiêu khoảng **600 từ/cụm từ mới**,
biên dự kiến **500–800 sau đối chiếu trùng**, cùng khoảng **25–35 bộ học mới**.
Sơ đồ 15 nhóm việc và tracker Markdown local đã được duyệt và xuất ticket;
hợp đồng production vẫn đang nháp. Đợt phân tích ban đầu không sửa DB; theo
chỉ thị làm 02/03 sau đó đã áp dụng đúng ba migration local có sẵn, giữ nguyên
ID/nội dung/tiến độ. Theo chỉ thị tiếp tục,04 đã viết30 ví dụ song ngữ cho
bản thảo ngoài runtime; chưa tạo từ/ảnh/TTS mới, gọi provider hoặc phát hành.
Riêng skill `to-tickets` được cài vào repo theo yêu cầu trực tiếp.

Skill nằm tại `.agents/skills/to-tickets/`, sao chép nguyên bản từ plugin
`mattpocock-skills` phiên bản 1.3.1 đã có trên máy (gồm SKILL.md và cấu hình
agent). Không sửa policy của skill. Sau khi chủ sản phẩm chọn local, đã ghi
[cấu hình tracker cho chiến dịch](../../agents/issue-tracker.md) và trạng thái
ban đầu `planned`; việc xuất ticket không tự cho phép thực thi.

Các tài liệu đi kèm:

- [Hợp đồng điều phối các phiên](coordination-contract.md): ID, JSON chung,
  đường dẫn, tên file, kết quả, chống ghi đè và quy tắc làm lại.
- [JSON kế hoạch nháp](campaign-plan.draft.json): cấu hình và các phụ thuộc
  để các phiên sau cùng đọc; `executionAllowed=false`, chưa phải hàng đợi chạy.
- [15 nhóm việc đã duyệt và các việc chạy song song](tickets-proposed.md).
- [Tracker local: một file mỗi ticket](../../../.scratch/editorial-refresh-20261028/README.md)
  và [index cho các phiên](../../../.scratch/editorial-refresh-20261028/index.json).
- [Mẫu kiểm tra phủ nội dung nền tảng](foundation-planning-inventory.json):
  355 chuỗi mục tiêu minh bạch, có giới hạn rõ ràng.
- [Audit local có SELECT và quan hệ bảng](../../audits/local-content-audit-2026-10-28/README.md):
  mốc đo 28/10, tách với các đề xuất chiến dịch này.
- [Baseline mới của ticket 01](ticket-01-baseline.md) và
  [con trỏ/hash cho phiên sau](ticket-01-baseline.result.json): 148 lô, đủ
  7.341 ID và gói bàn giao có cả media bytes.
- [02 — local preview và bảo toàn DB](ticket-02-local-preview.md),
  [JSON kết quả](ticket-02-local-preview.result.json).
- [03 — manifest/receipt canary mock](ticket-03-manifest-canary.md),
  [JSON kết quả](ticket-03-manifest-canary.result.json).
- [04 — bản thảo pilot30 từ đã review](ticket-04-frozen-pilot.md),
  [JSON kết quả và gói bàn giao](ticket-04-frozen-pilot.result.json).

## 1. Những việc đã có phải tận dụng trước

### Kho local và đầu mục gốc

Đọc toàn bộ 7.311 projection V2 local cho các kiểm tra bề mặt và quan hệ ID/hash:

| Chỉ số | Kết quả |
| --- | ---: |
| Nghĩa đang bật | 7.311 |
| Chuỗi `word` hiển thị khác nhau | 6.114 |
| Chuỗi headword gốc khác nhau | 5.798 |
| Hàng có `word` khác headword gốc | 573 |
| Headword gốc có nhiều chuỗi hiển thị | 243 |

Ví dụ `rice` xuất hiện dưới dạng `rice as food`; `orange` có `orange in color`;
`air` có `mixture of gases`. Vì vậy 6.114 là số chuỗi hiển thị khác nhau, chưa
phải số Lexeme canonical đã duyệt. Chỉ tìm `word` sẽ báo thiếu giả và tạo trùng.
So khớp mở rộng cần headword gốc, alias/biến thể, POS và đúng Sense. ID cũ vẫn
được giữ, kể cả khi sửa lại cách hiển thị headword/nhãn nghĩa.

Quan hệ runtime đang có: `vocabularies.id` được projection V2, membership bộ,
liên kết chủ đề, tiến độ, lịch sử ôn và từ đã lưu tham chiếu. Hiện 5.594 nghĩa
nằm trong ít nhất một bộ đang bật, 1.717 ở ngoài mọi bộ; có 10 bộ chứa V2.
36 chủ đề có liên kết tới 1.604 nghĩa V2, nhưng schema restore thiếu trường
review để khẳng định số membership đã duyệt. Chưa có gán lớp/tuổi. Các bảng
bridge Master canonical đang rỗng; không nhầm 7.311 projection với 7.311 bản
ghi Sense canonical đầy đủ. Đây là lý do phải hòa giải crosswalk và tuyển chọn
membership, không sao chép nguyên bộ khi mở rộng cho nhóm học sinh.

### Có bản bổ sung CEFR chưa được phản ánh trong Docker

Đã so trực tiếp `proposalKey` và hash của cả 7.311 hàng local với bản enrichment
offline và với 7.311 PASS dispositions trong RC V9: tất cả khớp. RC có tổng
7.320 dispositions; 3 FAIL và 6 REVIEW_REQUIRED vẫn tách riêng, không tự nhập lại.

| CEFR | DB local hiện tại | Bản enrichment offline |
| --- | ---: | ---: |
| A1 | 1.008 | 1.017 |
| A2 | 905 | 929 |
| B1 | 740 | 784 |
| B2 | 1.424 | 1.580 |
| C1 | 1.462 | 1.778 |
| C2 | 0 | 606 |
| Chưa biết | 1.772 | 617 |

Enrichment giữ nguyên 5.539 nhãn cũ và bổ sung 1.155 nhãn từ bằng chứng đã ghim;
có 103 bất đồng nguồn thứ cấp được giữ làm bằng chứng. Đây là **nội dung file
offline đã đối chiếu**, chưa phải DB được cập nhật hay kết luận mọi nhãn đã qua
review mới của chiến dịch. C2 local bằng 0 là chênh lệch metadata; không nên
lập ngay công việc viết thêm 606 từ C2.

Nguồn trong `vocabflow-dataset/workspaces/master-v2-development-sync/`:

- `master-v2-release-candidate-v9.json`, byte SHA-256
  `4b9a1e7fce55218df12c7b8b813d731361fb802e2654308b70033df3b31b65ab`.
- `master-v2-development-learning-metadata-enrichment-v1.json`, byte SHA-256
  `29a790a58798a47e3770a70367ad7ea5715671ed4fc8aacfcb1cc3fe80f8aae9`.
- So RC bằng `senseDispositions[].effectiveContentHash` với decision PASS;
  không lấy `eligibleSenses` để suy ra quyền phát hành.

### Có media cũ; Docker cố ý không khôi phục media

`restore-master-v2-local-docker-v1.mjs` gán ba mảng ảnh/audio thành rỗng.
Không dùng tình trạng đó để yêu cầu sinh lại toàn bộ media.

| Bằng chứng offline lịch sử | Số được ghi nhận |
| --- | ---: |
| Upload map V2 cũ | 7.120 asset: 2.933 ảnh + 4.187 audio |
| Upload map source-backfill về sau | 13.977 asset: 4.669 ảnh + 9.308 audio |
| Mapping manifest cũ | 2.945 liên kết ảnh, 4.199 liên kết âm từ, 1 âm ví dụ khớp chính xác |

Các inventory này chồng lấp, không cộng lại. Chúng không chứng minh CDN hiện
còn hoạt động hoặc mọi asset hợp lệ với nội dung đang chọn. Mapping manifest
loại 4.673 clip ví dụ vì lệch câu và 36 liên kết ảnh vì hash mục tiêu cũ.
Cần đối chiếu lại bytes, ngữ nghĩa, phiên bản và quyền theo chính sách hiện có.

Đường dẫn chính xác và byte hash của ba inventory được ghim trong
`historicalMediaEvidencePins` của JSON kế hoạch. Phiên media đọc những input
này trước khi kết luận asset cần tạo mới; các hash không thay thế việc kiểm
tra quyền, ngữ nghĩa hoặc delivery hiện tại.

US-57 đã có canary 25 Sense: 24 yêu cầu ảnh, 28 âm từ và 25 âm ví dụ trong
kế hoạch. Đó chưa phải hệ thực thi cho toàn kho. Nhánh media sinh mới cũng cần
adapter rõ ràng vì DTO/public policy hiện được thiết kế quanh media APKG và
owner attestation, với namespace URL cụ thể. Không đổi trạng thái quyền cho
khớp một bộ kiểm tra cũ hoặc tái sử dụng nhầm attestation APKG cho ảnh mới.

## 2. “Đọc toàn kho” sẽ hoàn tất ở mức nào

Lần khảo sát này quét toàn bộ trường có cấu trúc và chỉ số bề mặt; **chưa phải
review ngữ nghĩa độc lập từng câu của cả 7.311 nghĩa**. Một số tín hiệu đo được:
175 nghĩa Việt dài hơn 60 ký tự; 324 ví dụ Anh dài hơn 12 từ; 1.144 ví dụ không
quá 7 từ. Chúng là tín hiệu review, không phải lỗi tự động.

Chiến dịch thực thi sẽ có một quyết định cho **mọi** danh tính trong baseline:
KEEP, REVISE, REVIEW_REQUIRED hoặc RETIRE_WITH_HISTORY. MISSING chỉ dùng cho
mục tiêu trong ma trận phủ chưa tìm được, không gán cho một hàng đang tồn tại.
Phải lưu người/lượt review, phiên bản/hash đã đọc và lý do. KEEP cũng có bằng
chứng kiểm tra, không lấy việc vượt qua schema làm bằng chứng đúng nghĩa.

Định nghĩa xong toàn kho: mọi ID gốc được hạch toán, mọi trường thay đổi có
nguồn/lý do và lượt kiểm tra độc lập; mục chưa chắc được để mở; số đã giữ,
đã sửa, bị loại và chờ xử lý cộng lại đúng baseline. Mỗi bản ghi vẫn giữ lịch
sử, provenance và tiến độ. Không viết lại đồng loạt những câu đã đúng.

## 3. Mở rộng khoảng bao nhiêu

**Đã chốt mức kế hoạch: khoảng 600 từ/cụm từ mới, cho phép 500–800 sau đối
chiếu; chưa phải một danh sách 600 mục đã xác minh thiếu.**

Phân bổ khởi đầu để lập ma trận, có thể chuyển giữa nhóm theo kết quả kiểm tra:

| Nhóm nhu cầu | Dự kiến từ/cụm từ mới |
| --- | ---: |
| Từ đầu tiên, đời sống trẻ và tiểu học đầu cấp | 200 |
| Trường học, gia đình, thiên nhiên cho tiểu học | 100 |
| Sinh hoạt, sức khỏe, giao tiếp cho THCS | 100 |
| Học tập, diễn đạt và cụm từ hữu ích cho THPT | 100 |
| Đời sống sinh viên, học thuật nhập môn, nghề nghiệp | 100 |
| Tổng mục tiêu | 600 |

Đây là kế hoạch phân bổ, không phải định mức chính thức theo lớp hoặc chương
trình sách. 25–35 bộ mới là **tuyển tập có mục đích** dùng lại nghĩa hiện có và
phần mới; không phải 25–35 dataset độc lập sao chép từ. Tên/gói dự kiến gồm
số–màu, gia đình, lớp học, đồ ăn, con vật, hành động, cơ thể–vệ sinh, sinh hoạt,
giao tiếp học đường, học tập–thi cử, đại học và công việc đầu tiên. Chỉ đóng
băng danh sách bộ sau khi có ma trận mục tiêu → đúng nghĩa → bản diễn đạt.

Đếm riêng, không tính vào 600 từ:

- 26 chữ cái; tên chữ và hoạt động âm có mục tiêu riêng, số hoạt động âm còn
  phụ thuộc thiết kế dạy học/giọng được chọn.
- Khoảng 100–150 mục câu/chức năng giao tiếp cho “Câu đầu tiên”, dự kiến để
  lập ma trận; số mục chốt sau khi loại trùng với cụm từ đã tính trong 600.
- Nghĩa mới của một headword cũ và biến thể trình bày sư phạm: báo riêng từng
  loại; không cộng thành “từ mới” để làm đẹp số lượng.

Mẫu 355 mục nền tảng hiện tìm được 257 mục khi xét cả headword gốc, còn 98
chuỗi chưa khớp. Trong đó 23 là câu/mẫu, năm mục đã có ở starter legacy, một
số là biến thể/biến hình. Vì vậy không coi 98 là 98 Lexeme cần viết mới.

## 4. Cách tăng tốc mà giảm việc làm lại

1. Đóng băng baseline sau hòa giải RC V9, enrichment, runtime và media cũ.
2. Hợp đồng chung được thử bằng ba mục nhỏ trước; sau đó dùng pilot khoảng
   30 từ/bốn chủ đề đã chốt để thử toàn bộ đường đi.
3. Chia nội dung theo nhóm headword và nghĩa liên quan, khoảng 50 nghĩa/lô
   review; viết mới 25–50 mục/lô. Các nghĩa anh em đi cùng ngữ cảnh để tránh
   hai phiên sửa hai phần của cùng một ranh giới nghĩa.
4. Đóng băng **từng lô** đã duyệt. Phiên biên tập làm lô N+1 trong khi phiên
   ảnh và TTS xử lý lô N. Không đợi sửa xong toàn kho mới làm media.
5. Mỗi job biết chính xác phần đầu vào nào khiến nó hết hạn. Sửa bản dịch Việt
   thường không buộc đọc lại câu Anh hoặc vẽ lại hình còn đúng nghĩa.
6. Một người/phiên tích hợp sở hữu registry, merge kết quả và thay đổi code
   dùng chung. Các phiên media ghi các thư mục/receipt riêng được giao.

Với 7.311 nghĩa và lô khoảng 50, cần khoảng 147–150 gói review tùy cách gom
headword; đây là gói kiểm tra, không phải từng ấy đợt viết lại. Chốt 500–800
mục mới có thể tạo thêm khoảng 10–32 gói tác giả tùy độ khó/cỡ lô. Số phiên
chạy đồng thời chọn theo tài nguyên thực tế; không hứa ETA khi chưa đo pilot.

## 5. Các quyết định còn mở

- Giọng TTS/locale và phạm vi ảnh: đang hỏi chủ sản phẩm; chưa đặt provider,
  tên voice/model hoặc hạn mức tiền. Không gọi dịch vụ trả phí trong phân tích.
- Sơ đồ 15 nhóm việc và tracker local đã được duyệt; 01–03 được giao và đã
  hoàn tất local. Các ticket 04–15 chưa được giao triển khai.
  Ticket 10–14 là mẫu lô; baseline đã đóng băng 148 shard bao đủ ID, nhưng cần
  tạo ticket instance/batchId và gán người sở hữu trước khi giao biên tập.
- Mô hình item cho chữ/âm/câu và adapter media sinh mới cần một lát thử đầy đủ
  trước khi tăng quy mô. Các mục chưa có bằng chứng không được bật tự động.

Đã xuất 15 Markdown riêng theo thứ tự phụ thuộc; 01–03 là `done`, 04–15 là
`planned`. JSON giữ `executionAllowed=false` cho việc chạy cả chiến dịch,
`items=[]`, `jobs=[]`; ủy quyền riêng cho 01–03 và con trỏ canary mock được ghi riêng.
Approval của breakdown/export không được hiểu thành lệnh tạo dữ liệu hoặc media.

## 6. Kiểm tra tài liệu ngày 29/10

Đã kiểm tra JSON parse, tổng CEFR hai nguồn đều 7.311, inventory 358 membership/
355 chuỗi duy nhất, đủ 15 số ticket khớp DAG, mọi dependency tồn tại và không
có chu trình, liên kết Markdown nội bộ, cùng hash hai file skill so với plugin
gốc. Hash các artifact offline được đối chiếu bytes hiện có trên máy.

Lần thử đọc lại Docker ngày 29/10 chưa kết nối được vì Docker engine không
chạy. Không thay nguồn bằng DB remote, không khởi tạo hay reset DB. Các số
local trong báo cáo giữ nguyên mốc 28/10; đây không phải kết quả SQL mới ngày
29/10. Chưa cần chạy test ứng dụng cho thay đổi chỉ gồm kế hoạch và skill.

Lượt thực thi 01 sau đó đã khởi động Docker, chụp lại DB chỉ đọc, đóng băng
baseline và kiểm tra cả archive. Bằng chứng mới và các kiểm tra guard nằm trong
báo cáo 01; không dùng lần kết nối thất bại trước đó làm mốc hiện tại.
