# Đóng đợt sản xuất dữ liệu — 30/10/2026

**Trạng thái đợt sản xuất offline: DONE. Tạo thêm từ/ảnh/TTS: tạm dừng theo chủ sản phẩm.**

Chủ sản phẩm yêu cầu dừng tạo từ vựng ở đây và chuyển sang việc khác.
Không tự tạo lô mới, gọi Muse, chạy lại job thiếu cũ hoặc mở phiên khác.

Đã đối chiếu lại hash của ba JSON bàn giao đã chốt:

| Bộ | Mục học | Ảnh chọn | Audio từ | Audio câu |
| --- | ---: | ---: | ---: | ---: |
| EXPANSION-547 | 547 | 547 | 547 | 547 |
| BASIC-500 | 500 | 500 | 500 | 500 |
| BASIC-PLUS-500 | 500 | 500 | 500 | 500 |
| Tổng | 1.547 | 1.547 | 1.547 | 1.547 |

Đây là số mục trong các bộ bàn giao, không phải khẳng định đã tạo mới 1.547
bản ghi canonical. Các phần tái dùng giữ liên kết nghĩa cũ; các ứng viên mới
vẫn cần hòa giải danh tính. JSON, receipt, media và gói sao lưu đã có được giữ
nguyên. Không nhập DB hay thay đổi app trong bước đóng đợt này.

Đóng phần sản xuất không đánh dấu mẫu ticket14 hoặc ticket15 toàn chiến dịch
đã hoàn tất: đối chiếu canonical, phạm vi học local, các disposition còn lại
và phần08/09đã hoãn chưa được thực thi xong. Các cờ nghe đối chiếu vẫn giữ
nguyên; việc dừng sản xuất không phải bằng chứng đã nghe thủ công mọi clip.

**Khuyến nghị tiếp theo: ticket10 — rà soát một lô A1/A2 đang có, khoảng50
nghĩa.** Giữ phần đúng, sửa có chọn lọc, kiểm tra nghĩa/ví dụ và media; bảo
toàn ID/tiến độ, không tạo thêm từ hoặc tự sinh lại media. Cần chốt danh sách
ID/hash của lô trước khi thực thi. Hiện chỉ là đề xuất, chưa bắt đầu ticket10.

[Bằng chứng và hash máy đọc được](vocabulary-production-checkpoint-closure-2026-10-30.json).
