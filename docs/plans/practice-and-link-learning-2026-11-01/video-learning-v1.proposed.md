# Học qua video YouTube v1 — đặc tả sản phẩm đã xác nhận

Status: PRODUCT CONTRACT CONFIRMED — toàn bản đã được chủ sản phẩm chốt ở Q44.
Ngày: 2026-11-01. Đây là đặc tả sản phẩm, chưa phải story READY FOR IMPLEMENTATION.
Chưa yêu cầu code, provider call, trả phí, migration, commit hay deploy.

## 1. Mục tiêu và phạm vi đã chốt

Người học dán một link YouTube để xem hiểu và luyện nghe ngay trong ngữ cảnh
video, dùng giọng gốc. Hai cách dùng được chọn tự do, không bắt làm bài mỗi lần xem.

- Q35: YouTube trước, bài viết thiết kế sau.
- Q36: có Xem hiểu và Luyện sâu.
- Q37: dùng player YouTube hiển thị trong app; chưa tách/tải MP3 riêng.
- Q38: bản đầu có chọn/nghe lặp đoạn và nghe điền từ. Chép nguyên câu, bài nói
  theo có hướng dẫn, ghi âm/chấm phát âm chưa thuộc bản đầu.
- Q39: Xem hiểu mặc định hiện Anh, Việt mở khi cần; được chuyển song ngữ/ẩn lời.
- Q40: thiếu phụ đề Anh có timing thì xem video nếu phát được, hỗ trợ nhập SRT/VTT;
  chưa tự nhận dạng giọng nói. Thiếu Việt vẫn học với Anh và báo rõ chưa dịch.
- Q41: bài điền hiện câu khuyết, giấu lời đầy đủ/bản Việt trong app trước lần trả
  lời đầu; nghe lại tùy ý, không đếm ngược; đúng/sai lấy lần đầu, xem trước ghi riêng.
- Q42: dịch Việt theo đoạn được chọn trong quota đã xác minh, giữ kết quả để dùng
  lại; không tự dịch cả video dài. Lấy phụ đề Anh cũng có hạn mức cần kiểm tra.
- Q43: đăng nhập trước khi xử lý link/lưu học liệu; thư viện, đoạn khó, vị trí và
  kết quả riêng theo tài khoản. Buổi dở tiếp tục cùng thiết bị ở bản đầu. Không tự
  đổi SRS, XP, chuỗi hay số từ đã học của kho từ vựng.

Đặc tả này thay hướng chuyển nguồn thành flashcards trước đây. Không tạo thẻ hay
nghĩa mới vào kho chung từ thao tác xem/luyện. Giới hạn 30 thẻ cũ không áp dụng
cho thời lượng video, số dòng phụ đề hoặc đoạn học.

## 2. Luồng Xem hiểu

1. Đăng nhập bằng cơ chế hiện có, thêm một URL video YouTube.
2. Báo riêng trạng thái video và phụ đề: video phát được không đồng nghĩa đã có
   transcript; nguồn phụ đề chưa sẵn sàng không được hiển thị như đã lấy thành công.
3. Xem video gốc với bảng phụ đề cạnh/dưới player; đánh dấu dòng đang phát khi
   có timing hợp lệ. Chọn dòng để quay lại ngữ cảnh tương ứng.
4. Mặc định hiện Anh, mở Việt theo câu khi cần; chuyển song ngữ hoặc ẩn lời.
   Nếu đoạn chưa dịch, cho chọn đoạn/yêu cầu dịch rõ ràng trong hạn mức.
5. Chọn đoạn để nghe lại, đánh dấu đoạn khó hoặc chuyển sang Luyện sâu.
6. Lưu video, vị trí và các đoạn đã đánh dấu để quay lại. Chỉ xem không tự được
   tính là hoàn thành bài tập hoặc đã nghe hiểu.

Không hứa mọi video nhúng được hay đồng bộ chính xác từng âm tiết. Player tiếp
tục có điều khiển gốc; UI học không che player hay giả làm chức năng của YouTube.

## 3. Luồng Luyện sâu — nghe điền từ

1. Chọn một đoạn có phụ đề Anh và timing hợp lệ. Hiển thị danh sách/số câu thực
   có thể luyện trước khi bắt đầu; không tự lấy câu ngoài đoạn.
2. Nghe lặp đoạn hoặc chuyển vào bài điền. Trong bài hiện câu Anh có chỗ khuyết;
   giấu lời đầy đủ/bản Việt trong phần UI app để người học thử nghe trước.
3. Nghe lại tùy ý bằng giọng gốc, đổi tốc độ theo mức player hỗ trợ. Không có
   đồng hồ trả lời và không giới hạn lượt nghe.
4. Gửi đáp án, hoặc chủ động xem lời/đáp án, hoặc bỏ qua. Sau lần giải quyết câu
   đầu, hiện đối chiếu đáp án và bản Việt đã có; không bắt gọi dịch mới để xem điểm.
5. Cuối lượt, xem đúng/sai, đã xem, bỏ qua và lỗi kỹ thuật tách biệt; chọn đoạn
   còn khó để luyện lại. Kết quả lần luyện lại không sửa kết quả lần đầu.

Không đánh đồng luyện sau khi đã xem video với một bài thi nghe chưa tiếp xúc.
Lời có sẵn trong hình video hoặc phụ đề do người dùng bật trên player có thể vẫn
hiện; không hứa app xóa được chúng. Không dùng tỷ lệ bài điền để chứng nhận nghe hiểu.

## 4. Các mặc định cụ thể đã xác nhận cùng toàn bản

Những mục này bổ sung chi tiết cho Q35–Q43 và đã được chấp thuận khi chủ sản phẩm
chốt toàn bản ở Q44; không ghi nhận chúng thành các câu trả lời riêng trước Q44.

### Chọn câu và đáp án

- Lượt đầu mỗi câu có một chỗ khuyết là từ hoặc cụm ngắn; phần còn lại vẫn giữ
  lời nguồn. Không biến thành bài chép toàn bộ câu hoặc tự chế một câu khác.
- Chỉ lấy lời nói có thể dùng làm bài tập; bỏ cue âm thanh/nhạc/tiếng vỗ tay,
  cue rỗng và đoạn có timing không hợp lệ. Không có câu phù hợp thì báo rõ.
- Cue phụ đề không nhất thiết là câu hoàn chỉnh. Có thể ghép cue liền kề khi
  cần giữ ngữ cảnh, giữ nguồn/thời gian tương ứng và cho người học biết đoạn phát.
  Không bịa timing từng từ khi chỉ có timing theo cue.
- Nội dung chỗ khuyết dùng dạng thật trong lời nói; không tự đổi sang từ gốc
  hoặc thay từ đồng nghĩa rồi coi đó là điều video đã nói. Không cần AI soạn
  nghĩa/ảnh/TTS để tạo một bài điền từ từ transcript đã có.
- So khớp không phân biệt hoa/thường, chuẩn hóa Unicode, khoảng trắng và kiểu
  dấu nháy tương đương. Không tự bỏ phủ định, đổi số ít/số nhiều hoặc chấp nhận
  từ gần giống bằng sửa lỗi mơ hồ. Biến thể hợp lệ, nếu có, phải được ghi rõ
  trong đáp án câu; không dùng AI chấm ngẫu nhiên sau mỗi lần gửi.
- Nhập rỗng là lỗi nhập liệu, không phải lần trả lời sai. Một câu có một kết
  quả đầu: đúng, sai, đã xem, bỏ qua hoặc lỗi kỹ thuật; không tính nhiều lần vì
  double-click/retry. Sau trả lời có thể thử lại để học nhưng không sửa lịch sử.
- Độ chính xác = đúng/(đúng+sai). Đã xem/bỏ qua/lỗi tách riêng; mẫu số bằng 0
  thì không hiện tỷ lệ giả. Ghi rõ kết quả đối chiếu phụ đề, không đo hiểu toàn video.

### Quyền xem lời và phụ đề sai

- Trong bài điền, mở lời đầy đủ/bản Việt của câu đang làm trước khi nộp, kể cả
  quay sang bảng Xem hiểu trong app để mở câu ấy, ghi Đã xem. Việc từng xem video
  trước buổi luyện không bị hồi tố thành Đã xem cho mọi câu.
- Nhãn trợ năng, thông báo lỗi, tiêu đề hoặc phần gợi ý không tiết lộ chỗ khuyết.
  Không cố nhận biết/chặn nội dung nằm trong video gốc hoặc trình duyệt khác.
- Giữ nguồn và loại phụ đề khi biết: nhập thủ công, phụ đề nguồn/tự động; bản
  Việt AI được nhận diện là gợi ý dịch. Không gọi chúng là nội dung đã kiểm chứng.
- Cho báo câu sai/phụ đề lệch và loại câu khỏi lượt đang luyện; không tính lỗi
  nguồn là lỗi kiến thức. Giữ kết quả đã có gắn đúng bản phụ đề; không âm thầm
  thay đáp án rồi chấm lại các lượt cũ. Bản sửa cá nhân không ghi đè nguồn chung.

### Dịch và quota

- Người học chọn phạm vi dịch; cho biết phạm vi và hạn mức khả dụng trước khi
  gửi. Không tự chuyển sang dịch cả video hoặc nhận dạng giọng nói khi thiếu sub.
- Giữ bản Anh cùng bản Việt tương ứng; dịch theo ngữ cảnh và căn theo cue/đoạn
  nguồn, không ghép từng nghĩa từ riêng lẻ. Chất lượng bản dịch có thể cần sửa.
- Dùng lại bản dịch tương ứng đúng nguồn/ngôn ngữ/phiên bản. Đổi transcript
  không được ghép âm thầm với bản Việt của văn bản cũ. Không hứa gọi lại provider
  là miễn phí hoặc tải transcript toàn video luôn nằm trong quota.
- Quota không biết/hết/lỗi: dừng yêu cầu tự động, báo trạng thái; vẫn dùng được
  player nếu phát được, lời Anh và bản Việt đã có. Chỉ thử lại có chủ đích; không
  mua gói, tự nâng gói, dùng fallback trả phí hoặc tự chuyển sang AI transcription.
- Giới hạn độ dài/số cue/kích thước/nhịp gọi được xác minh với provider trước
  khi bật. Cho chọn phạm vi nhỏ hơn nếu vượt hạn mức, không cắt âm thầm. Video
  dài xem được không đồng nghĩa xử lý không giới hạn. Không áp lại mốc 30 thẻ.

### Lưu và khôi phục

- Thư viện, đoạn đánh dấu, bản nhập cá nhân và kết quả riêng theo tài khoản;
  API phải kiểm tra chủ sở hữu, không tin ID do client cung cấp. Dùng auth/phạm
  vi hồ sơ hiện có, không tạo một cơ chế đăng nhập mới.
- Lịch sử tài khoản được lưu để xem lại. Buổi đang làm tiếp tục cùng thiết bị,
  giữ câu/chỗ khuyết/kết quả đầu/đoạn đã chọn; chưa hứa nối buổi dở giữa hai máy.
- Đăng xuất/đổi tài khoản không để lộ bản nháp/đoạn học của tài khoản trước.
  Vị trí đã xem và trạng thái bài tập là dữ liệu khác nhau.
- Retry/refresh không tạo thêm kết quả hoặc yêu cầu dịch trùng. Việc thoát giữa
  buổi không tự tính những câu chưa làm là sai. Nếu dữ liệu tiếp tục không còn
  tương thích, báo và cho bắt đầu lượt mới, giữ lịch sử cũ thay vì đoán lại đáp án.
- Cho xóa video khỏi thư viện/đoạn đã lưu cùng dữ liệu học video liên quan của
  mình; không xóa video gốc, kho từ vựng, người dùng khác hay tiến độ SRS.
- Video bị xóa/chặn về sau: báo không phát được, có thể xem lại phần chữ đã lưu
  theo khả năng lưu trữ nguồn; không tự tạo TTS để giả thay giọng người nói gốc.

## 5. Các trường hợp lỗi và giới hạn bản đầu

- Thiếu timed transcript: player thường và nhập SRT/VTT; chưa đồng bộ/luyện theo
  câu cho tới khi có dữ liệu hợp lệ. Kiểm tra timing/ngôn ngữ, không coi file là lệnh.
- Lỗi video/media trong lúc luyện: retry hoặc bỏ qua do kỹ thuật, không chấm sai.
  Thiếu bản Việt không chặn bài nghe có lời Anh và giọng nguồn hợp lệ.
- Nhận một video tiếng Anh mỗi lần; không tự duyệt playlist/cả kênh, live stream
  chưa thuộc nguồn được cam kết. Bản đầu không có học qua bài viết, tải MP3/video,
  nghe nền, tạo ảnh/TTS, chép nguyên câu, ghi âm/chấm phát âm, câu hỏi hiểu nội dung,
  gợi ý CEFR tự động, bảng xếp hạng hoặc tạo thẻ từ tự động.
- Tra nghĩa cụm từ tại chỗ là ý tưởng mở rộng, chưa được chọn cho v1. Không âm
  thầm thêm một AI tutor hoặc bắt tạo bộ từ để có thể xem/nghe.

## 6. Ví dụ nghiệm thu sản phẩm

1. Dán video hỗ trợ: phát giọng gốc; Anh mặc định, mở Việt trong đoạn đã dịch;
   chọn câu nghe lại đúng ngữ cảnh trong độ chính xác player thực tế đã kiểm tra.
2. Chọn 02:10–02:50: các câu luyện đều thuộc đoạn; không tự chọn một câu ở 04:00.
3. Gửi đúng rồi gửi lại: một kết quả đúng. Gửi sai rồi sửa: lịch sử đầu vẫn sai.
4. Mở lời trước khi gửi: Đã xem, không tăng đúng/sai; replay không tạo đáp án.
5. Phụ đề sai hoặc media lỗi: có đường báo/bỏ qua lỗi, không kết luận người học sai.
6. Hết quota: không bắt đầu dịch/nhận dạng giọng nói mới, phần đã có vẫn dùng được.
7. Nhập SRT/VTT không có timing hợp lệ: báo vấn đề, không dựng đồng bộ giả.
8. Refresh/tiếp tục cùng thiết bị: giữ câu và kết quả; không nạp lại như chưa làm.
9. Tài khoản B không đọc/xóa nội dung riêng của A bằng cách thay ID.
10. Xem/luyện video không thay SRS, XP, chuỗi hoặc số từ đã học của kho từ vựng.

## 7. Điều kiện kỹ thuật trước khi cam kết đã triển khai

- Chọn/xác minh nguồn timed transcript và dịch, khóa/quota/chi phí/giới hạn và
  điều kiện lưu dùng lại. Chưa chọn provider, kiểm tra khóa hoặc gọi xử lý thật.
- Player và transcript là hai tích hợp riêng. Kiểm tra lỗi nhúng, phát trên mobile,
  tốc độ được hỗ trợ, quảng cáo/buffering và độ lệch seek/pause. Không coi mock
  hoặc bản thiết kế là bằng chứng nghe theo câu đã chạy tốt trên máy thật.
- Thiết kế version nguồn/câu/bài tập và quyền riêng tư trước API/schema; chặn
  URL/file không hợp lệ, dữ liệu quá lớn và xử lý nội dung nguồn như dữ liệu.
- Giữ riêng đường ghi kết quả video với scheduler/XP/chuỗi hiện hữu. Khi có yêu
  cầu triển khai, tạo story/hợp đồng kỹ thuật và chạy kiểm thử phù hợp trước phát hành.

Nghiên cứu nguồn đã ghi trong `video-learning.discovery.md`; không lặp lại một
giả định đã nghiên cứu thành cam kết provider miễn phí hay mọi URL đều hoạt động.

## 8. Xác nhận hoàn tất

Q44: chủ sản phẩm chọn “Chốt video v1 và kế hoạch ba phần”. Xác nhận bao gồm
toàn bộ video v1, các mặc định mục 4, trường hợp nghiệm thu và kế hoạch
Luyện tự do → Game → Học qua video. Phần phân tích bản đầu đã hoàn tất.
Chưa yêu cầu viết code hay phát hành. Giữ tên file `.proposed.md` để các liên kết
đã bàn giao không bị đổi; trạng thái đầu tài liệu là trạng thái hiện hành.
