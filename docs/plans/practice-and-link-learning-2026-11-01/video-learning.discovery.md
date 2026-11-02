# Học tiếng Anh qua video — phát triển ý tưởng

Status: DISCOVERY COMPLETE — PRODUCT CONTRACT CONFIRMED Q44, 2026-11-01.
Đặc tả hiện hành: `video-learning-v1.proposed.md`. Chủ sản phẩm đã chốt cả kế hoạch
ba phần. Các đoạn đề xuất bên dưới giữ lịch sử phát triển ý tưởng; chỉ phạm vi trong
đặc tả đã chốt thuộc v1. Chưa yêu cầu triển khai.
Q34 là điều chỉnh hướng, không phải xác nhận bản import thẻ trước đó.

Q35–Q37 đã trả lời: ưu tiên YouTube, bài viết thiết kế sau; có cả Xem hiểu và
Luyện sâu do người dùng tự chọn; dùng giọng gốc qua player YouTube hiển thị trong
app, chưa tách/tải MP3 riêng. Đây là hướng sản phẩm đã chốt; phạm vi bản đầu và
các luật phụ đề/bài luyện bên dưới vẫn đang được phỏng vấn.

Q38–Q40 đã trả lời: bản đầu có chọn/nghe lặp đoạn và nghe điền từ; chép nguyên
câu và bài nói theo có hướng dẫn để sau. Trong Xem hiểu mặc định hiện Anh, Việt
mở khi cần, vẫn có lựa chọn song ngữ/ẩn lời. Thiếu phụ đề Anh có timing thì xem
video nếu phát được và có thể nhập SRT/VTT; chưa tự nhận dạng giọng nói. Thiếu
bản Việt thì vẫn học với Anh và báo rõ phần chưa dịch.

## Ý định đã rõ từ chủ sản phẩm

Người dùng dán link YouTube để học ngay với video, lời nói gốc và phụ đề Anh–Việt.
Cần nghe được nội dung video và xem có phụ đề để hiểu. Không lấy chuyển nguồn
thành flashcards làm luồng chính. Chủ sản phẩm muốn phát triển ý tưởng sâu trước
khi khóa phạm vi. Đặc tả luyện tự do và game đã xác nhận không đổi.

## Đề xuất trải nghiệm chủ đạo

Một video vừa có thể xem liền mạch, vừa trở thành bài luyện ngắn theo ngữ cảnh.
Q36 xác nhận người học chủ động chọn giữa xem hiểu và luyện sâu, không bị buộc làm
bài kiểm tra mỗi lần video phát. Các khả năng cụ thể dưới đây là đề xuất, chưa phải
toàn bộ bản đầu.

### 1. Xem hiểu

- Video gốc, kèm bảng phụ đề ngay bên cạnh hoặc phía dưới; đánh dấu câu đang nói.
- Q39: mặc định hiện Anh, mở bản Việt của câu đang vướng khi cần; vẫn chọn được
  Anh–Việt hoặc giấu phụ đề. Không che điều khiển player bằng lớp UI.
- Bấm câu phụ đề để quay lại ngữ cảnh tương ứng; nghe lại hoặc đổi tốc độ theo
  các mức player hỗ trợ. Không hứa canh chính xác từng âm tiết/khẩu hình.
- Tra một cụm như “put off” trong cả câu để giải thích nghĩa đang dùng, không
  mặc định tách thành nghĩa từng từ. Đây là trợ giúp hiểu video, không tự tạo thẻ.
- Đánh dấu đoạn khó hoặc câu thích để quay lại; không bắt dừng liên tục vì popup.

### 2. Luyện sâu một đoạn

Đề xuất cho người học chọn đoạn ngắn (ví dụ 30–90 giây, chưa phải giới hạn chốt).
Một vòng có thể gồm:

1. Nghe không nhìn phụ đề; tự thử hiểu nội dung. Nghe lại tùy ý.
2. Hiện tiếng Anh, đối chiếu chỗ nghe thiếu; lặp một câu hoặc cụm câu với ngữ cảnh
   trước/sau khi cần. Ranh giới phụ đề không phải lúc nào cũng là một câu trọn vẹn.
3. Mở tiếng Việt khi cần để hiểu ý, thay vì đánh đồng có bản dịch với đã nghe được.
4. Chọn bài tập: điền từ bị khuyết trước, chép cả câu khi muốn khó hơn; hoặc nghe
   và nói theo. Không ép cả ba việc cho mọi đoạn.
5. Nghe lại toàn đoạn, tự đánh dấu chỗ còn khó để luyện lần sau.

Đề xuất không chấm phát âm bằng AI ngay trong bản đầu. Nói theo đơn giản có thể
chỉ nghe → dừng → tự nói; ghi âm/so sánh và chấm phát âm là các quyết định riêng.
Không gọi tự đánh giá là kết quả hiểu nghe khách quan. Phụ đề có thể sai nên bài
chép lời cần cho báo lỗi, xem đáp án và xử lý dấu câu/biến thể một cách rõ ràng.

## Một ví dụ để đánh giá ý tưởng

Một video dài 8 phút có đoạn từ 02:10–02:50 người học nghe không rõ. Họ bấm một
câu để nghe lại giọng gốc, mở lời Anh, rồi mở bản Việt khi vẫn chưa hiểu. Sau đó
chọn luyện đoạn này: giấu lời, nghe lại, điền một cụm bị thiếu hoặc nói theo.
Hôm sau quay lại đúng đoạn đã lưu, không cần tìm video và kéo thời gian từ đầu.
Thời lượng và bài tập trong ví dụ là minh họa, chưa được chốt cho v1.

## Phần khiến tính năng đáng quay lại

- Thư viện video cá nhân: đang học, đã đánh dấu và lịch sử vị trí xem.
- Danh sách đoạn khó cần nghe lại, gắn với đúng video và mốc thời gian.
- Phân biệt đã xem, đã luyện và tự báo đã hiểu. Không biến phút xem thành số từ
  thuộc hay tự thay đổi lịch ôn từ vựng.
- Bản dịch theo ngữ cảnh cả cụm câu, vẫn giữ nguyên phụ đề Anh và nguồn bản dịch.
  Phân biệt phụ đề gốc, phụ đề tự động và bản dịch AI nếu có thông tin nguồn.
- Tùy khả năng: có người chỉ xem song ngữ, có người giấu Việt, có người chép lời.
  Không cần gán cứng phương pháp học theo tuổi hay giả vờ biết CEFR của mọi video.

Các mục này cần ưu tiên và phỏng vấn tiếp, chưa tạo story triển khai.

## Phân lớp phạm vi — Q38 đã chọn bản đầu

- Bản đầu đã chọn: Xem hiểu với player gốc/phụ đề và Luyện sâu bằng chọn/nghe
  lặp đoạn + nghe điền từ. Chi tiết bài điền, bản dịch/quota và lưu kết quả còn mở.
- Bước sau: chép nguyên câu và bài nói theo có hướng dẫn. Người xem vẫn có thể
  tự dừng và nói lại bằng điều khiển video, nhưng chưa có luồng bài nói theo riêng.
- Chưa chọn: ghi âm/chấm phát âm, câu hỏi hiểu nội dung, gợi ý video theo khả năng,
  bài luyện kết hợp nhiều đoạn. Không tự thêm AI tutor.
- Bài viết là nhánh khác cần khám phá sau; không dùng việc tách từ làm thay thế
  cho trải nghiệm video. Lưu từ/cụm tùy chọn nếu có cũng không phải đường bắt buộc.

## Khả năng kỹ thuật đã kiểm tra, chưa phải tích hợp đã hoạt động

- YouTube IFrame API hỗ trợ phát/dừng, thời gian hiện tại, seek và tốc độ được
  player hỗ trợ. Từ đó có thể thiết kế bảng phụ đề riêng đi theo thời gian phát.
  Điều này là suy luận thiết kế; cần thử trên web/mobile thực tế trước khi hứa
  độ chính xác lặp câu. Không khẳng định seek/pause chính xác từng mili giây.
- Nhúng video không tự cung cấp dữ liệu lời phụ đề. IFrame không có API xuất
  transcript; official captions.download cần quyền thích hợp với video. Có nguồn
  transcript bên thứ ba như Supadata cung cấp text/offset/duration, nhưng chưa
  chọn provider, thử khóa, xác minh quota hay gọi xử lý thật.
- Giọng gốc nghe trực tiếp qua player là khác với tải/tách MP3 để lưu Cloudinary.
  Q37 đã chọn bản đầu dùng player YouTube hiển thị bình thường. YouTube API policies
  hạn chế tải/lưu bản sao, tách audio và phát bằng player ẩn; vì vậy không lấy đường
  MP3 riêng hay nghe nền/tắt màn hình làm cam kết mặc định. File người dùng sở hữu
  hoặc có quyền sử dụng có thể là nhánh nguồn riêng nếu cần thảo luận về sau.
- Video có thể không cho nhúng, bị giới hạn, bị xóa, thiếu lời hoặc không đúng ngôn
  ngữ. Phụ đề tự động có thể sai/timing lệch. Phụ đề nhập không có timing không
  được giả vờ đồng bộ. Nếu chỉ có phụ đề Anh, dịch Việt là công việc riêng.
- Quota/chi phí chưa xác minh. Giữ yêu cầu không tự phát sinh phí; không âm thầm
  dịch cả video dài, dùng AI tạo transcript hay chuyển provider khi hết quota.
  Phạm vi đoạn dịch và giới hạn video sẽ cần thiết kế mới; ≤30 thẻ không áp dụng.

Nguồn chính thức đã đọc:

- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/data/reference/rest/v3/captions/download
- https://docs.supadata.ai/api-reference/endpoint/transcript/transcript

## Cây quyết định đang mở

Đã chốt:

- Q35: YouTube trước; bài viết thiết kế riêng sau.
- Q36: có cả Xem hiểu và Luyện sâu; người học tự chọn cách dùng. Chưa đồng nghĩa
  mọi dạng bài tập được mô tả đều phải có ngay bản đầu.
- Q37: giọng gốc qua player YouTube trong app, chưa tải/tách MP3 riêng.

- Q38: bản đầu gồm nghe lặp + điền từ. Chép nguyên câu và bài nói theo để sau.
- Q39: Xem hiểu mặc định Anh, Việt mở khi cần; vẫn chuyển được song ngữ/ẩn lời.
- Q40: xem/nhập SRT/VTT khi thiếu phụ đề; chưa tự nhận dạng giọng nói. Thiếu Việt
  tiếp tục dùng Anh; thiếu timing hợp lệ không có đồng bộ/bài luyện theo câu giả.

Q41–Q43 đã trả lời và đồng ý các đề xuất:

- Q41: bài nghe hiển thị câu Anh có chỗ trống; trước khi gửi lần đầu giấu lời đầy
  đủ và bản Việt trong app. Nghe lại tùy ý, không đếm ngược; xem lời/đáp án trước
  được ghi Đã xem, đúng/sai lấy lần trả lời đầu. Đây là luyện lại nội dung có thể
  đã xem trước đó, không phải bài thi nghe mới. Không hứa xóa chữ nằm sẵn trong video.
- Q42: có thể xem video dài, nhưng chỉ dịch Việt đoạn người học chọn trong quota
  đã xác minh; giữ bản dịch để dùng lại, không âm thầm dịch toàn video khi dán link.
  Lấy phụ đề Anh cũng phải tuân theo hạn mức nguồn; không giả định luôn miễn phí.
- Q43: giữ đăng nhập trước khi xử lý link/lưu học liệu; thư viện, đoạn khó, vị trí
  và kết quả thuộc riêng tài khoản. Bản đầu tiếp tục buổi đang làm trên cùng thiết
  bị; xem/luyện video không tự đổi SRS, XP, chuỗi hay số từ đã học của kho từ vựng.

Q44 đã chốt `video-learning-v1.proposed.md` cùng kế hoạch ba phần, bao gồm các
mặc định mục 4 về chọn/gộp câu, chuẩn hóa đáp án, lỗi phụ đề, vị trí đang xem so
với bài đang làm, phiên bản nguồn, riêng tư và khôi phục. Các mặc định được chấp
thuận tại Q44, không giả thành các câu trả lời riêng trước đó. Frontier sản phẩm
v1 đã đóng; xác minh provider/quota và thiết kế kỹ thuật là điều kiện triển khai.
Không yêu cầu chủ sản phẩm tự trả lời thông tin API hay chọn nhà cung cấp trước
khi có kết quả kiểm tra kỹ thuật. Phân tích hoàn tất; chưa có yêu cầu triển khai.
