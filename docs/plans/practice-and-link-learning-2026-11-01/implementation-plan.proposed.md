# Kế hoạch phát triển luyện tập, game và học từ link

Status: CONFIRMED PLAN — Q44; IMPLEMENTATION NOT REQUESTED.
Thứ tự: Luyện tự do → Bắn cá điền từ → Học qua video YouTube.
Đây là kế hoạch, không phải yêu cầu bắt đầu code, gọi API, migration hay deploy.

Bản spec thống nhất theo yêu cầu to-spec: [spec.md](spec.md). Spec gom toàn bộ
phạm vi đã duyệt, các ý tưởng để sau và cách nghiệm thu web/API đã được xác nhận;
không biến việc tổng hợp thành giao triển khai. Tracker Markdown local riêng cho
nhóm tính năng đã được chủ sản phẩm duyệt trong lượt to-tickets sau đó.

Theo yêu cầu to-tickets sau đó, [tickets-proposed.md](tickets-proposed.md) đề xuất
21 lát cắt với AC, phụ thuộc, nhánh độc lập và độ phủ spec. Chủ sản phẩm đã duyệt
xuất từng ticket `planned`, chưa giao thực thi. Mục lục tại
[tracker local](../../../.scratch/practice-game-video-20261101/README.md).

## 1. Luyện tự do — đặc tả đã xác nhận Q14

- Chốt ranh giới câu hỏi/nguồn/media với chức năng học đang có. Dùng lại phần
  phù hợp, nhưng giữ đúng kiểu luyện và không đi vào đường ghi kết quả SRS.
- Làm luồng luyện độc lập, lưu kết quả/lịch sử và tiếp tục cùng thiết bị. Thiết kế
  hợp đồng API/dữ liệu sau khi kiểm tra schema hiện tại; không đoán tên bảng/ID.
- Làm chọn nguồn, ảnh/nghe/kết hợp, chọn đáp án/gõ từ, buổi luyện và tổng kết.
- Gate: lỗi media/đáp án đã xem được tách; thử lại không ghi trùng; tài khoản riêng
  tư, khách lưu máy; SRS, XP, chuỗi và số từ đã học không đổi vì luyện tự do.

## 2. Bắn cá điền từ — đặc tả đã xác nhận Q24

- Dùng lại nguồn/câu hỏi/media hợp lệ của luyện, thêm vòng đời ván và luật game riêng.
- Gõ đúng tự bắn, 5 tim, chơi liên tục; mất tim đúng các hành động đã chốt; hết
  từ đã học mới lấy từ chưa học trong nguồn, rồi trộn lại nguồn đó.
- Làm điểm 10/0, kỷ lục riêng, tạm dừng/tiếp tục và tổng kết; không combo/hồi tim,
  không ghi XP/chuỗi/SRS. Hình thức chuyển động không tạo hạn trả lời.
- Gate: refresh không hồi tim; submit trùng không nhân điểm/mất tim; 0 tim chỉ
  kết thúc một lần; không mở rộng nguồn âm thầm hay lộ đáp án trước khi trả lời.

## 3. Học qua video — đặc tả toàn bộ đã xác nhận Q44

- Q35–Q37 đã chốt YouTube trước/bài viết sau, hai cách dùng Xem hiểu/Luyện sâu
  tự chọn, và giọng gốc qua player YouTube hiển thị; bản đầu chưa tách MP3 riêng.
- Q38–Q40 chốt chọn/nghe lặp đoạn + điền từ cho bản đầu, Anh mặc định/Việt mở
  khi cần và nhập phụ đề thay thế khi thiếu. Chép nguyên câu/nói theo để sau;
  không tự chạy nhận dạng giọng nói.
- Q41–Q43 chốt câu khuyết/giấu lời và bản Việt trước lần đầu, tách Đã xem, dịch
  theo đoạn trong quota, đăng nhập/lưu riêng và tiếp tục cùng thiết bị. Không
  tự đổi SRS, XP, chuỗi hay số từ đã học.
- Chủ sản phẩm sửa hướng ở Q34: học với video/giọng gốc và phụ đề Anh–Việt,
  không lấy chuyển link thành thẻ từ làm luồng chính. Bản import trước là lịch sử.
- Đặc tả sản phẩm đầy đủ ở `video-learning-v1.proposed.md`; nghiên cứu và lịch sử
  ở `video-learning.discovery.md`. Phát player gốc và lấy phụ đề có timestamp
  là hai năng lực riêng; không coi nhúng player là đã có transcript.
- Q44 đã xác nhận toàn bộ đặc tả, gồm mặc định chọn câu/chấm/lỗi nguồn/version/
  khôi phục và ví dụ nghiệm thu. Không nhập các ý tưởng ngoài đặc tả vào v1.
- Xác minh nguồn phụ đề, chất lượng/ngôn ngữ/timing, dịch theo ngữ cảnh, player
  thực tế và quota trước khi chốt hợp đồng kỹ thuật. Không hứa mọi URL đều chạy,
  không tự tách MP3 hoặc gọi dịch vụ trả phí.
- Giữ nguyên kế hoạch luyện/game đã chốt. Giới hạn ≤30 thẻ trước đây không được
  áp cho phụ đề hay thời lượng video. Bài viết và kết nối từ vựng sẽ xét riêng.

## Cách chia việc khi được yêu cầu triển khai

- Đóng hợp đồng và quyền ghi trước khi chia UI/API. Khi hợp đồng ổn định, UI với
  fixture và phần API/domain có thể làm song song; ghép và kiểm thử trước khi chốt.
- Nghiên cứu quota/provider ở phần 3 có thể chạy song song với phần 1 mà không
  gọi tác vụ trả phí. Không cần để phần này làm thay đổi ưu tiên phát hành đã chốt.
- Luật game có thể tách thành phần kiểm thử độc lập sau khi hợp đồng câu hỏi/nguồn
  ổn định. Không giao hai phiên cùng sửa một bảng migration/hợp đồng đang thay đổi.
- Mỗi phần cần story/hợp đồng triển khai rõ, đọc kiến trúc/thiết kế hiện hành,
  kiểm thử phù hợp và nghiệm thu riêng. Đã xuất kế hoạch ticket, chưa tự giao worker code.
- Triển khai/deploy/migration là bước riêng khi chủ sản phẩm yêu cầu; giữ các thay
  đổi đang có trong workspace và không sửa lịch sử Git.

## Tài liệu chính

- `practice-v1.proposed.md`: hợp đồng luyện tự do đã xác nhận.
- `game-v1.proposed.md`: hợp đồng game đã xác nhận.
- `video-learning-v1.proposed.md`: hợp đồng video đã xác nhận Q44.
- `video-learning.discovery.md`: lịch sử phát triển ý tưởng video, phân tích đã chốt.
- `link-learning-v1.proposed.md`: đề xuất chuyển nguồn thành thẻ, đã bị thay hướng.
- `discovery.md`: cây quyết định, lịch sử câu trả lời và nguồn kỹ thuật đã kiểm tra.
- `GLOSSARY.md`, ADR 0004/0005: thuật ngữ và ranh giới SRS/nội dung cá nhân.

Chưa ước lượng ngày công hay chi phí provider khi chưa có thiết kế kỹ thuật và
quota được xác minh. Không đánh dấu chức năng đã làm chỉ vì tài liệu đã được chốt.
