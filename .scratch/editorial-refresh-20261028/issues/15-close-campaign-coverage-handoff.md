# 15: Đóng chiến dịch với coverage và gói bàn giao tái lập

**Cập nhật30/10/2026:** US64 đã thay kho local bằng đúng1.547mục đã chọn và tạo JSON/bằng chứng bàn giao riêng. Đây không phải đóng toàn chiến dịch: template10–13được supersede,14dừng tạo thêm,08–09còn sáu âm thiếu. Không tự chạy ticket15hoặc phát hành remote từ kết quả này.

**What to build:** Báo cáo toàn kho và gói nội dung/media tái lập, 25–35 bộ học tuyển chọn cùng mức mở rộng thực tế sau đối chiếu.

**Blocked by:** 08 — Làm quen chữ và âm qua một mô-đun nhỏ hoàn chỉnh; 09 — Câu đầu tiên qua một mô-đun nhỏ hoàn chỉnh; mọi instance thuộc 10, 11, 12, 13, 14 trong phạm vi chiến dịch đã chốt, gồm các lô legacy được hạch toán từ baseline.

**Status:** planned

**Execution authorized:** no — việc phát hành tách riêng khỏi hoàn tất local.

- [ ] Mọi ID baseline có disposition; tổng KEEP/sửa/chờ/retire khớp baseline. Không tuyên bố review toàn kho hoàn tất nếu còn lô chưa được kiểm tra.
- [ ] Báo số mở rộng thực tế so với mục tiêu khoảng 600, biên 500–800, và 25–35 bộ; không đếm trùng từ/cụm từ, nghĩa, biến thể hoặc membership.
- [ ] Có đường dẫn/hash và bằng chứng review/media đủ tái lập; chạy lại không nhân bản, có backup artifact bị Git ignore và giữ lịch sử/danh tính.
- [ ] Checklist đóng chiến dịch liệt kê đủ mọi instance, nhóm legacy và các lô chữ/âm/câu còn lại đã nằm trong phạm vi; ghi rõ phần mở/chưa giải quyết. Không chỉ đợi năm ticket mẫu rồi nhận cả kho đã xong.
