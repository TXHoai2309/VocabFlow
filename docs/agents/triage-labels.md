# Trạng thái và triage cho tracker local

Áp dụng cho [chiến dịch biên tập](issue-tracker.md). Không có label ở dịch vụ
ngoài; ghi bằng trường Markdown và index local. Thứ tự ưu tiên hoặc nhãn
không tự cho phép triển khai.

| Status | Ý nghĩa |
| --- | --- |
| planned | Ticket đã xuất, chưa được giao thực thi. Đây là trạng thái ban đầu của cả 15 ticket. |
| ready-for-agent | Đã được phép thực thi trong phạm vi giao, hợp đồng/story đủ điều kiện và blocker đã hoàn tất. |
| in-progress | Phiên được giao đã bắt đầu; ghi người sở hữu, batchId nếu có và bằng chứng đang làm. |
| blocked | Đã được giao nhưng có blocker cụ thể; ghi lý do và điều kiện gỡ. |
| done | Đủ acceptance criteria, có bằng chứng kiểm tra và bàn giao; không đồng nghĩa đã phát hành. |

`Execution authorized` ban đầu là `no`. Chỉ cập nhật theo chỉ thị thực thi của
chủ sản phẩm; việc duyệt breakdown/export được ghi riêng. Các gate story của
AGENTS.md vẫn áp dụng. Không chuyển `planned` sang `ready-for-agent` chỉ vì
không có cạnh Blocked by.

`Batch scope` phân biệt ticket mẫu 10–14 với instance được gắn danh sách ID.
Không đánh dấu mẫu done để đại diện cho mọi lô của cả kho. Các nhãn/ưu tiên
khác chỉ thêm khi có nhu cầu rõ, không tự tạo một taxonomy triage mới.
