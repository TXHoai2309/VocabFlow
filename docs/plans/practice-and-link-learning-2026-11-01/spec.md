# VocabFlow — Luyện tự do, Bắn cá điền từ và Học qua YouTube v1

Ngày: 2026-11-01.

**Product status:** CONFIRMED — tổng hợp phạm vi đã duyệt ở Q14, Q24 và Q44.
**Testing approach:** CONFIRMED — chủ sản phẩm đồng ý nghiệm thu qua luồng web,
bổ sung kiểm tra API cho riêng tư/idempotency và không thay đổi SRS/XP/chuỗi.
**Execution authorized:** yes — chủ sản phẩm giao thực thi 01–21 tuần tự ngày
2026-11-01 trong chat triển khai; không commit/push/deploy hoặc migration cloud.
**Tracker publication:** chủ sản phẩm đã duyệt tracker Markdown local riêng cho
nhóm tính năng và xuất 21 ticket `planned`, `Execution authorized: no`. Cấu hình
đã được mở thêm theo phản hồi này; không áp ready-for-agent hoặc tạo issue ngoài.

## Problem Statement

Người học VocabFlow cần nhiều cách thực hành phù hợp với nội dung và sở thích:
nhận biết từ qua ảnh, nghe giọng đọc, gõ từ, chơi một trò chơi đơn giản và học
tiếng Anh từ video mình chọn. Hiện ứng dụng có các bài tập dùng ảnh, nghe và gõ,
nhưng đường nộp bài hiện hữu thuộc học/ôn theo lịch. Luyện lặp hoặc chơi nhiều
lần không nên tự đẩy ngày ôn ra xa, cộng XP hay thay đổi chuỗi học hiện có.

Người học cũng muốn nghe người nói thật trong video YouTube, theo dõi phụ đề
Anh–Việt, nghe lại chỗ chưa rõ và luyện ngay trên đoạn đó. Mục tiêu này cần trải
nghiệm học trong video; chuyển lời thoại thành flashcards không đáp ứng luồng
chính. Việc đã xem hết video không đồng nghĩa đã nghe hiểu hoặc đã học các từ
trong video. Dữ liệu học từ nguồn cá nhân cần riêng tư, có thể quay lại và có
giới hạn xử lý rõ ràng.

## Solution

Phát triển ba phần theo thứ tự **Luyện tự do → Bắn cá điền từ → Học qua YouTube**.

**Luyện tự do:** người học chọn nguồn từ, luyện ảnh/nghe/luân phiên hai dạng,
chọn đáp án hoặc gõ từ. Mỗi buổi có số câu rõ ràng, phản hồi và lịch sử riêng;
cho luyện thêm mà không thay đổi Ôn theo lịch.

**Bắn cá điền từ:** người học gõ từ theo gợi ý để tự động bắn trúng cá. Ván bắt
đầu với 5 tim, chơi liên tục trong nguồn đã chọn, đúng được +10 điểm, sai/xem
đáp án/bỏ qua mất 1 tim. Không cần ngắm bắn, không có hạn trả lời; điểm/kỷ lục
riêng và không đi vào XP, chuỗi hay lịch ôn.

**Học qua YouTube:** người đã đăng nhập thêm một video, nghe giọng gốc qua
player YouTube và tự chọn Xem hiểu hoặc Luyện sâu. Xem hiểu dùng phụ đề Anh mặc
định, mở Việt khi cần, chuyển được song ngữ/ẩn lời. Luyện sâu cho chọn/nghe lặp
đoạn và nghe điền từ. Bản dịch làm theo đoạn được chọn trong quota đã xác minh,
giữ kết quả dùng lại. Thư viện, đoạn khó và kết quả thuộc riêng tài khoản.

Các luồng hiện có tiếp tục phục vụ học và Ôn theo lịch. Giữ nguyên kho từ đã
biên tập; tính năng mới sử dụng danh tính nội dung đang có, không tạo lại dữ
liệu, tự công bố nội dung từ video hoặc tự sinh ảnh/TTS.

## User Stories

Các mục 1–29 thuộc Luyện tự do, 30–51 thuộc game, 52–85 thuộc video; 86–90 là
hành vi chung. Đây là danh sách nhu cầu trong một spec tổng hợp, không phải 90
ticket đã được giao hoặc 90 story triển khai đồng thời.

1. Là người học, tôi muốn mở Luyện tự do riêng với Ôn theo lịch, để được thực hành thêm mà không đổi lịch ghi nhớ.
2. Là người học, tôi muốn nguồn mặc định là từ đã học, để ưu tiên củng cố nội dung mình đã tiếp xúc.
3. Là người chưa có từ đã học, tôi muốn được hướng dẫn chọn một nguồn cụ thể, để bắt đầu luyện mà không bị lấy từ ngoài ý muốn.
4. Là người học, tôi muốn chọn rõ bộ học, mức học hoặc từ đã lưu, để luyện đúng nội dung mình cần.
5. Là người học, tôi muốn luyện dựa trên hình minh họa, để nhận biết và nhớ lại từ qua ảnh.
6. Là người học, tôi muốn luyện dựa trên âm thanh đọc từ, để nhận ra từ tiếng Anh khi nghe.
7. Là người học, tôi muốn Luyện kết hợp luân phiên câu ảnh và câu nghe, để thực hành cả hai cách trong một buổi.
8. Là người mới bắt đầu, tôi muốn chọn một trong bốn từ tiếng Anh, để có cách trả lời dễ tiếp cận làm mặc định.
9. Là người muốn tự nhớ từ, tôi muốn gõ đáp án tiếng Anh, để luyện nhớ lại mà không dựa vào các lựa chọn.
10. Là người học, tôi muốn chọn 5/10/20/30 câu với mặc định 10, để bố trí buổi luyện theo thời gian của mình.
11. Là người học, tôi muốn buổi luyện không đếm ngược, để trả lời theo tốc độ phù hợp.
12. Là người học, tôi muốn mỗi từ chỉ xuất hiện một lần ở lượt đầu, để số câu phản ánh số mục thực sự được luyện.
13. Là người học, tôi muốn biết số nội dung hợp lệ thực có khi nguồn ít hơn số câu yêu cầu, để không bị âm thầm thêm từ ngoài nguồn.
14. Là người học, tôi muốn được báo khi không tạo được bốn lựa chọn rõ ràng, để tự đổi thiết lập thay vì nhận câu hỏi mơ hồ.
15. Là người học, tôi muốn được báo khi nguồn không đủ cả ảnh và âm thanh cho Luyện kết hợp, để tự chọn chế độ khác.
16. Là người học, tôi muốn tải lại hoặc bỏ qua khi media lỗi mà không bị tính sai, để kết quả phản ánh việc học của mình.
17. Là người dùng bàn phím hoặc công nghệ trợ năng, tôi muốn lời nhắc dễ sử dụng và không tiết lộ đáp án, để luyện công bằng và thuận tiện.
18. Là người luyện nghe, tôi muốn nghe lại thoải mái, để tập trung nhận ra âm thanh mà không bị phạt.
19. Là người học, tôi muốn kết quả lấy lần trả lời đầu tiên, để thấy khả năng nhớ ban đầu của mình.
20. Là người học, tôi muốn chủ động xem đáp án và được ghi riêng Đã xem, để học tiếp mà không làm tăng số câu đúng hoặc sai.
21. Là người học, tôi muốn phân biệt bỏ qua chủ động, xem đáp án và lỗi kỹ thuật, để hiểu đúng vì sao một câu không có kết quả trả lời.
22. Là người học, tôi muốn xem tổng kết và tỷ lệ đúng chỉ trên các câu đã trả lời, để các câu chưa làm không làm sai lệch kết quả.
23. Là người học, tôi muốn luyện lại câu sai mà không sửa lịch sử lượt đầu, để vừa thực hành thêm vừa giữ được kết quả ban đầu.
24. Là người có tài khoản, tôi muốn lịch sử luyện được lưu và đồng bộ riêng, để xem lại các buổi và từ cần luyện thêm.
25. Là khách, tôi muốn lưu lịch sử luyện trên thiết bị, để sử dụng kho công khai mà chưa cần tài khoản.
26. Là người học, tôi muốn lỗi lưu giữ nguyên câu trả lời và cho thử lại, để không mất kết quả hoặc ghi hai lần.
27. Là người học, tôi muốn tiếp tục buổi dở trong cùng trình duyệt/thiết bị, để không phải bắt đầu lại khi thoát hoặc tải lại trang.
28. Là người học, tôi muốn luyện lặp không đổi ngày ôn, XP, chuỗi hay số từ đã học, để việc thực hành không làm sai tiến độ học chính.
29. Là người học, tôi muốn danh sách cần luyện thêm tách với lịch sử/từ yếu của Ôn theo lịch, để hiểu hai loại kết quả khác nhau.
30. Là người chơi, tôi muốn gõ đúng từ thì tự bắn trúng cá, để thao tác học từ quyết định kết quả.
31. Là người chơi, tôi muốn không cần ngắm bắn hoặc đua thời gian với cá, để chơi được theo tốc độ gõ của mình.
32. Là người chơi, tôi muốn ván mới bắt đầu với 5 tim, để có giới hạn sai rõ ràng.
33. Là người chơi, tôi muốn gửi sai mất 1 tim rồi xem đáp án và sang từ khác, để biết lỗi và tiếp tục ván.
34. Là người chơi, tôi muốn xem đáp án hoặc bỏ qua chủ động cũng mất 1 tim, để luật chơi nhất quán.
35. Là người chơi, tôi muốn gõ từng ký tự, nghe lại và gửi ô trống không làm mất tim, để chỉ hành động trả lời hợp lệ mới ảnh hưởng ván.
36. Là người chơi, tôi muốn lỗi ảnh/audio và bỏ qua vì lỗi kỹ thuật không mất tim, để không thua do media.
37. Là người chơi, tôi muốn mỗi lần gõ đúng được +10 điểm, để điểm thể hiện số mục giải quyết đúng theo luật ván.
38. Là người chơi, tôi muốn về 0 tim kết thúc thua ngay, để không phát sinh câu hoặc điểm sau khi ván đã kết thúc.
39. Là người chơi, tôi muốn gửi lại cùng một hành động chỉ ghi một lần, để không nhân điểm hoặc trừ tim hai lần.
40. Là người chơi, tôi muốn dùng nguồn từ và gợi ý ảnh/nghe/luân phiên như phần luyện, để chơi trên nội dung mình chọn.
41. Là người chơi, tôi muốn dùng hết từ đã học rồi đến từ chưa học trong cùng nguồn, sau đó trộn lại nguồn ấy, để chơi liên tục mà không bị mở rộng toàn kho.
42. Là người chơi, tôi muốn từ chưa học gặp trong game vẫn giữ trạng thái học chính, để tiếp xúc trong game không tự được tính là đã học.
43. Là người chơi, tôi muốn kỷ lục riêng theo cùng nguồn và kiểu gợi ý, để không so điểm của những ván có điều kiện khác nhau.
44. Là người chơi, tôi muốn chọn chơi lại tạo ván mới với 5 tim và 0 điểm, để phân biệt khởi động lại với tiếp tục ván.
45. Là người chơi, tôi muốn tải lại vẫn giữ tim, điểm, từ hiện tại và hàng đợi, để không hồi tim ngoài luật.
46. Là người chơi có tài khoản, tôi muốn lịch sử và kỷ lục riêng được đồng bộ, để xem lại kết quả của mình.
47. Là khách chơi game, tôi muốn kết quả lưu trên thiết bị và không tự nhập vào tài khoản khi đăng nhập, để dữ liệu hai ngữ cảnh được phân biệt.
48. Là người chơi, tôi muốn đổi nguồn hoặc kiểu gợi ý tạo một ván mới, để điểm hiện tại không bị ghép với luật/nguồn khác.
49. Là người chơi, tôi muốn hết nội dung hợp lệ thì ván tạm dừng và giải thích, để không bị trừ tim hoặc mắc vòng lặp lỗi.
50. Là người nhạy cảm với chuyển động, tôi muốn giảm chuyển động của cá mà giữ nguyên luật, để vẫn chơi được thoải mái.
51. Là người chơi, tôi muốn điểm game, tim và kết quả riêng với Ôn theo lịch, để chơi không sửa SRS, XP, chuỗi hay lịch sử học chính.
52. Là người đã đăng nhập, tôi muốn thêm một link YouTube, để học ngay với video mình chọn.
53. Là người học video, tôi muốn nghe đúng giọng gốc qua player YouTube trong app, để học cách người nói thực sự sử dụng tiếng Anh.
54. Là người học video, tôi muốn tự chọn Xem hiểu hoặc Luyện sâu, để không bị buộc làm bài mỗi lần xem.
55. Là người Xem hiểu, tôi muốn phụ đề Anh hiện mặc định, để theo dõi lời nói trước khi đọc bản dịch.
56. Là người Xem hiểu, tôi muốn mở bản Việt của câu khi cần, để được trợ giúp đúng chỗ đang vướng.
57. Là người Xem hiểu, tôi muốn chuyển song ngữ hoặc ẩn phụ đề, để điều chỉnh hỗ trợ theo cách học của mình.
58. Là người học video, tôi muốn biết dòng phụ đề đang được nói, để theo dõi nội dung theo thời gian phát.
59. Là người học video, tôi muốn bấm một câu để quay lại đoạn tương ứng, để không phải tự kéo thanh thời gian tìm lại.
60. Là người học video, tôi muốn nghe lại và đổi tốc độ được player hỗ trợ, để nghe ở tốc độ phù hợp.
61. Là người học video, tôi muốn chọn và nghe lặp một đoạn, để tập trung vào phần chưa nghe rõ.
62. Là người học video, tôi muốn đánh dấu đoạn khó, để quay lại luyện vào lần sau.
63. Là người học video, tôi muốn lưu video và vị trí đang xem, để tiếp tục mà không phải tìm lại từ đầu.
64. Là người Luyện sâu, tôi muốn thấy danh sách/số câu hợp lệ trong đoạn đã chọn, để biết mình sắp luyện những gì.
65. Là người Luyện sâu, tôi muốn nghe và điền một từ/cụm ngắn bị khuyết trong lời nguồn, để luyện nhận ra lời nói trong ngữ cảnh.
66. Là người Luyện sâu, tôi muốn tính lần trả lời đầu và được thử lại để học, để việc sửa sau không ghi đè kết quả ban đầu.
67. Là người Luyện sâu, tôi muốn mở lời đầy đủ/bản Việt trước khi trả lời được ghi Đã xem, để hỗ trợ đọc không bị tính thành nghe đúng.
68. Là người đã xem video trước đó, tôi muốn vẫn luyện được mà không bị tự gắn Đã xem cho mọi câu, để luyện lại nội dung quen thuộc.
69. Là người điền từ, tôi muốn khác hoa/thường, Unicode, khoảng trắng hoặc dấu nháy tương đương không gây sai, để kết quả dựa vào nội dung đáp án.
70. Là người Luyện sâu, tôi muốn kết quả gắn với bản phụ đề và đáp án đã dùng, để cập nhật lời nguồn không âm thầm chấm lại lịch sử.
71. Là người học video, tôi muốn báo phụ đề sai/lệch và loại câu lỗi khỏi lượt luyện, để lỗi nguồn không bị coi là lỗi kiến thức.
72. Là người học video, tôi muốn lỗi phát hoặc media có tải lại/bỏ qua kỹ thuật, để không bị tính trả lời sai.
73. Là người có video thiếu phụ đề Anh, tôi muốn vẫn xem nếu phát được và nhập SRT/VTT, để tiếp tục khi có dữ liệu thay thế phù hợp.
74. Là người nhập phụ đề, tôi muốn được báo timing/ngôn ngữ không hợp lệ, để không nhận đồng bộ hoặc bài tập giả.
75. Là người học video chưa có bản Việt, tôi muốn tiếp tục với lời Anh, để thiếu bản dịch không chặn toàn bộ việc học.
76. Là người học video, tôi muốn chọn đoạn cần dịch và biết hạn mức trước khi gửi, để chủ động phạm vi xử lý.
77. Là người học video, tôi muốn dùng lại bản dịch tương ứng đúng nguồn/phiên bản, để không xử lý lại nội dung đã có hoặc đọc nhầm bản dịch.
78. Là người học video, tôi muốn hết hoặc chưa biết quota thì dừng xử lý tự động mà vẫn dùng phần đã có, để không phát sinh phí mới.
79. Là người có tài khoản, tôi muốn thư viện, phụ đề nhập, đoạn đánh dấu và kết quả video riêng tư, để người không được phép không đọc hoặc xóa dữ liệu của mình.
80. Là người Luyện sâu, tôi muốn tiếp tục buổi dở cùng thiết bị với đúng câu/chỗ khuyết/kết quả đã có, để tải lại không biến câu đã làm thành câu mới.
81. Là người có thư viện video, tôi muốn xóa video/đoạn học cùng dữ liệu liên quan của mình, để quản lý thư viện mà không xóa kho từ hoặc nguồn YouTube gốc.
82. Là người dùng chung thiết bị, tôi muốn đăng xuất/đổi tài khoản không lộ bản nháp của người trước, để giữ riêng dữ liệu cá nhân.
83. Là người có video về sau bị xóa/chặn, tôi muốn biết nguồn không phát được và xem phần chữ còn lưu được, để không nhầm TTS hoặc nguồn thay thế là giọng gốc.
84. Là người học video, tôi muốn phân biệt đã xem với đã làm bài và kết quả điền từ, để không coi xem hết là chứng nhận nghe hiểu.
85. Là người học video, tôi muốn việc xem/luyện không tự tạo flashcards hoặc từ mới vào kho chung, để trải nghiệm đúng mục tiêu học trong video.
86. Là người dùng điện thoại hoặc bàn phím, tôi muốn các luồng dễ thao tác và có nhãn trung tính, để sử dụng thuận tiện mà không lộ đáp án.
87. Là người học, tôi muốn thấy rõ trạng thái đang tải, rỗng, lỗi và đã lưu, để biết có thể tiếp tục hay cần thử lại.
88. Là người học, tôi muốn thử lại không nhân kết quả hoặc yêu cầu xử lý dịch trùng, để lỗi kết nối không làm sai tiến độ hay tốn quota ngoài ý muốn.
89. Là người đang học theo lịch, tôi muốn các luồng mới không làm đổi cách học/ôn hiện có, để tiếp tục sử dụng ứng dụng ổn định.
90. Là chủ sản phẩm, tôi muốn phát triển lần lượt Luyện tự do, game rồi video, để mỗi phần có thể được nghiệm thu trước khi mở rộng phần sau.

## Implementation Decisions

**Ngôn ngữ và ranh giới miền.** Dùng thống nhất Nghĩa học, Bộ học, Mức học, Ôn
theo lịch, Luyện tự do, Buổi luyện, Đã xem đáp án, Ván chơi, Tim, Điểm game,
Nguồn học, Xem hiểu, Luyện sâu, Đoạn học và Lịch sử học video. Một lần dùng lại
nghĩa trong bộ học không tạo một danh tính từ mới. ADR 0004 giữ kết quả luyện/
game/video tách khỏi lịch ôn; ADR 0005 giữ nội dung từ nguồn cá nhân riêng tư.

**Phạm vi hiện trạng và phần phải làm.** Có các bài tập chọn nghĩa, ảnh, nghe
và gõ trong ứng dụng. Chúng đang đi qua kết quả học/ôn chuẩn; không đổi nhãn
màn hình rồi xem như đã có Luyện tự do. Tái dùng hiển thị, media và chọn nguồn
phù hợp; tách đường ghi kết quả. Chưa có bằng chứng tích hợp YouTube/phụ đề/dịch
đã hoạt động. Không gọi các phần mới là hoàn tất chỉ vì primitive hoặc spec tồn tại.

**Kiến trúc.** Giữ web React/Vite, API Hono cùng origin, auth hiện có, hợp đồng
dữ liệu dùng chung và luật miền tách UI/DB. Không cho web nối trực tiếp DB.
Luật chọn nguồn, tính kết quả, tim/điểm và vòng đời phiên không đặt trong thành
phần hiển thị. Không chọn thêm game engine/framework hoặc thay kiến trúc auth.

**Nguồn và điều kiện đủ media.** Giữ đúng nguồn được chọn và danh tính nội dung/
phiên bản. Lọc media trước khi tạo phiên. Ảnh/nghe không tự chuyển sang nghĩa
Việt khi media lỗi. Lựa chọn cần bốn đáp án khác biệt, không mơ hồ. Luyện kết
hợp luân phiên ảnh/nghe; buổi Luyện tự do cần cả hai loại và ít nhất hai mục
khác nhau để không lặp từ lượt đầu. Không đủ thì giải thích, cho đổi thiết lập
có chủ đích. Nghe từ vựng dùng audio đọc từ, không tự thành chép câu.

**Luật Luyện tự do.** Mặc định 10 câu, chọn 5/10/20/30, không đếm ngược; lượt
đầu không lặp mục, số thực có thấp hơn yêu cầu phải được báo. Không có từ đã
học thì hướng dẫn chọn nguồn, không lấy toàn kho ngầm. Lần trả lời đầu quyết
định đúng/sai; xem trước, bỏ qua và lỗi kỹ thuật là các trạng thái riêng. Độ
chính xác = đúng/(đúng+sai); mẫu số 0 không hiện phần trăm giả. Luyện lại sai
tạo kết quả luyện mới, không ghi đè lần đầu.

**Đáp án từ vựng.** Chuẩn hóa hoa/thường, Unicode và khoảng trắng theo hợp đồng
đã duyệt; không tự chấp nhận lỗi chính tả hoặc từ đồng nghĩa ngoài nguồn biến
thể được định nghĩa. Đáp án không rò qua nhãn ảnh, tên nút hay lời nhắc trợ năng.
Nghe lại không tạo lần trả lời. Danh sách cần luyện thêm chỉ từ kết quả luyện,
không viết lại từ yếu/lịch sử học chính.

**Luật game.** Một cá là một mục từ. Gõ đúng tự bắn, không ngắm riêng; chuyển
động chỉ trang trí và không tạo hạn trả lời. Ván mới có 5 tim/0 điểm. Áp dụng:

| Hành động giải quyết một cá | Điểm | Tim | Tiếp theo |
| --- | ---: | ---: | --- |
| Gửi đúng | +10 một lần | Giữ | Cá tiếp theo |
| Gửi sai | 0 | −1 | Hiện đáp án, cá tiếp theo nếu còn tim |
| Xem đáp án hoặc bỏ qua chủ động | 0 | −1 | Hiện đáp án, cá tiếp theo nếu còn tim |
| Lỗi media/tải lại/bỏ qua kỹ thuật | 0 | Giữ | Khôi phục hoặc bỏ qua kỹ thuật |
| Gõ ký tự/nghe lại/gửi ô trống | 0 | Giữ | Chưa giải quyết cá |

Đến 0 tim hiển thị phản hồi cuối rồi kết thúc thua; không có điểm/cá mới sau
đó. Không combo/hồi tim/+5 sau sửa sai. Một hành động chỉ giải quyết cá một lần.
Mỗi lần gặp lại sau chu kỳ nguồn là lượt cá mới, không phải request trùng.

**Hàng đợi game.** Dùng hết từ đã học trong nguồn, đến từ chưa học trong cùng
nguồn, rồi trộn lại chính nguồn đó. Không lặp trong giai đoạn khi còn mục khác;
tránh lặp ngay tại biên nếu có lựa chọn. Nguồn một từ ở dạng ảnh hoặc nghe có
thể lặp để chơi liên tục. Nếu nguồn được chọn không có từ đã học, có thể bắt
đầu bằng từ chưa học thuộc nguồn ấy. Không còn nội dung hợp lệ thì tạm dừng,
không trừ tim vì thiếu dữ liệu. Đổi nguồn/kiểu gợi ý tạo ván mới. Kỷ lục riêng
theo nguồn và kiểu gợi ý, kèm phiên bản luật để không ghép điểm khác điều kiện.

**Vòng đời và lưu kết quả.** Tài khoản lưu/đồng bộ lịch sử luyện và game; khách
lưu trên thiết bị theo phân biệt khách/tài khoản hiện có. Không tự nhập lịch
sử khách khi đăng nhập. Buổi/ván đang làm tiếp tục cùng trình duyệt/ngữ cảnh
lưu trữ; không hứa khôi phục sau xóa dữ liệu máy hoặc nối buổi dở giữa thiết bị.
Game giữ tim/điểm/mục hiện tại/hàng đợi; buổi luyện giữ kết quả đầu và vị trí.
Lỗi lưu giữ hành động chờ, thử lại không nhân kết quả hay tiến hai câu. Không
dùng việc hoàn tất/khôi phục phiên để tự ghi vào Ôn theo lịch.

**Giao tiếp và lưu trữ mới.** Cần hợp đồng cho tạo/tiếp tục phiên, nộp/hiện đáp
án/bỏ qua, tổng kết/lịch sử, ván game và thư viện/bài video. Chưa chọn tên
endpoint, bảng, cột, DTO cụ thể hoặc số migration. Thiết kế chúng trong lát cắt
triển khai, theo các kết quả/ownership/idempotency ở spec này. Tài khoản dùng
API kiểm tra nội dung và trạng thái có thẩm quyền, không tin cờ đúng/sai, điểm,
tim hoặc trạng thái kết thúc do client tự nhận. Khách giữ namespace dữ liệu riêng
với học/ôn hiện có; không thay cấu trúc lịch học chỉ để thêm điểm game.

**Quyền riêng tư.** Dùng đăng nhập và quyền tài khoản/hồ sơ hiện có; kiểm tra
chủ sở hữu và phạm vi được cấp ở API. ID từ client không đủ để truy cập dữ liệu
riêng. Không tạo hệ auth độc lập; không thay quyền hiện hữu bằng điều kiện chỉ
cần đã đăng nhập. Logout/đổi tài khoản không lộ phiên/bản nháp người trước.

**Nguồn video.** Bản đầu nhận một video YouTube tiếng Anh, phát bằng player gốc
hiển thị trong app. Không tải/tách MP3, giấu player hoặc hứa nghe nền. Điều khiển
phát/dừng/chuyển mốc/tốc độ theo khả năng player. Tách trạng thái phát video,
lấy timed transcript và dịch; nhúng player không đồng nghĩa đã có nội dung sub.
Bảng phụ đề cạnh/dưới video không che điều khiển gốc. Đồng bộ dựa timing thực,
không hứa chính xác từng âm tiết hay từng từ.

**Xem hiểu.** Phụ đề Anh mặc định, Việt mở khi cần; người học chuyển song ngữ
hoặc ẩn. Tô dòng đang nói khi có timing, bấm câu để quay lại, chọn/lặp đoạn,
đánh dấu đoạn khó và lưu vị trí. Không bắt làm bài để tiếp tục xem. Đã xem và
đã làm bài là trạng thái khác; không coi phút xem hoặc hết video là đã nghe hiểu.

**Luyện sâu.** Người học chọn Đoạn học có lời Anh/timing hợp lệ, thấy danh sách/
số câu thực có. Chỉ dùng câu thuộc đoạn. Mỗi câu lượt đầu có một chỗ khuyết là
từ/cụm ngắn trong lời nguồn. Bỏ cue nhạc/tiếng động/rỗng/timing sai; có thể ghép
cue liền kề để giữ ngữ cảnh nhưng không bịa mốc từng từ. Không tự đổi dạng từ
hay thay đồng nghĩa trong lời video. Không cần AI soạn nội dung mới để tạo
chỗ trống từ transcript có sẵn. Không có câu hợp lệ thì báo rõ.

**Quyền xem và chấm bài video.** Giấu lời đầy đủ/bản Việt trong UI app trước
lần trả lời đầu; replay không giới hạn và không đếm ngược. Mở lời/bản Việt
của câu đang làm trước khi nộp, kể cả qua Xem hiểu trong app, ghi Đã xem.
Từng xem video trước buổi không hồi tố Đã xem cho mọi câu. Chữ trong hình video
hoặc phụ đề bật trên player có thể vẫn hiện; không hứa xóa/nhận biết mọi cách
xem lời. Đây là luyện nội dung có thể đã tiếp xúc, không phải kỳ thi nghe mới.

**Đối chiếu lời video.** Tính đúng/sai theo lần đầu; rỗng là lỗi nhập. Chuẩn hóa
hoa/thường, Unicode, khoảng trắng và dấu nháy tương đương. Không tự bỏ phủ định,
đổi số ít/nhiều hoặc nhận lỗi gần giống; biến thể phải có trong đáp án câu.
Không dùng AI chấm ngẫu nhiên mỗi lần. Sau giải quyết câu, hiện đối chiếu và
bản Việt đã có, không buộc gọi dịch để xem điểm. Đúng/(đúng+sai), mẫu số 0 không
hiện tỷ lệ; Đã xem/bỏ qua/lỗi tách riêng. Luyện lại không sửa kết quả lượt đầu.

**Phụ đề sai và phiên bản.** Lưu nguồn/loại phụ đề khi biết, nhận diện bản dịch
AI là gợi ý thay vì nội dung đã kiểm chứng. Cho báo sai/lệch, loại câu lỗi và
không coi lỗi nguồn là lỗi kiến thức. Mỗi kết quả gắn bản phụ đề/đáp án đã dùng;
thay nguồn không chấm lại lịch sử hoặc ghép âm thầm bản Việt cũ. Sửa riêng không
ghi đè nguồn chung. Không dùng tỷ lệ điền từ làm chứng nhận hiểu toàn video.

**Phụ đề thay thế.** Nếu video phát được nhưng không lấy được timed transcript,
vẫn cho xem và nhập SRT/VTT. Kiểm tra ngôn ngữ, kích thước và timing; không có
timing hợp lệ thì không dựng đồng bộ/bài nghe theo câu giả. Chưa tự nhận dạng
giọng nói để lấp chỗ thiếu. Thiếu Việt không chặn bài nghe có lời Anh và nguồn
phát hợp lệ. Media lỗi có retry/bỏ qua kỹ thuật, không chấm sai.

**Dịch và quota.** Đăng nhập trước xử lý link/lưu học liệu. Người học chọn phạm
vi dịch, thấy phạm vi và hạn mức trước khi gửi. Dịch theo ngữ cảnh, giữ quan hệ
với lời Anh và timing; lưu dùng lại đúng nguồn/ngôn ngữ/phiên bản. Không tự dịch
cả video khi dán link. Không biết/hết/lỗi quota thì dừng xử lý tự động; player
nếu phát được và dữ liệu đã có vẫn dùng được. Không tự mua/nâng gói, đổi provider
trả phí hoặc bật AI transcription. Xác minh hạn mức lấy phụ đề lẫn dịch trước
khi bật. Video dài xem được không đồng nghĩa xử lý không giới hạn. Nếu vượt giới
hạn, báo và cho chọn phạm vi nhỏ hơn, không cắt âm thầm; không áp giới hạn 30 thẻ.

**Thư viện và tiếp tục video.** Lưu riêng video, vị trí, đoạn khó, phụ đề nhập,
bản dịch và kết quả theo tài khoản; không tự công bố kho chung. Buổi dở cùng
thiết bị giữ đoạn/câu/chỗ khuyết/kết quả đầu. Retry/refresh không nhân kết quả
hay yêu cầu dịch; thoát không biến câu chưa làm thành sai. Dữ liệu tiếp tục
không còn tương thích thì báo, giữ lịch sử và cho bắt đầu lượt mới. Cho xóa video/
đoạn cùng dữ liệu học liên quan của mình mà không xóa nguồn gốc/kho từ/SRS.
Video bị xóa/chặn thì báo thật và cho xem phần chữ còn lưu theo khả năng nguồn;
không tạo TTS giả thay giọng gốc.

**UI và nội dung không đáng tin.** Giữ hệ thiết kế hiện tại, mobile-first, bàn
phím/focus và nhãn trung tính; loading/error/empty/success đầy đủ. Có thể giảm
chuyển động mà không đổi luật game. Dữ liệu URL/phụ đề/bản dịch được kiểm tra
và xử lý như nội dung, không phải chỉ dẫn; giới hạn kích thước/redirect/phạm vi
fetch, không gửi thông tin đăng nhập app tới URL do người dùng cung cấp.

**Trình tự triển khai.** Một lát cắt dọc đang hoạt động theo quy tắc repo; làm
Luyện tự do trước, game tái dùng nguồn/gợi ý đã ổn định, rồi video. Từng phần
cần story, hợp đồng kỹ thuật và nghiệm thu. Xác minh provider/quota có thể là
việc nghiên cứu độc lập, không tự đổi thứ tự phát hành hoặc gọi xử lý trả phí.
Không tạo/giao ticket hay migration từ việc tổng hợp spec này.

## Testing Decisions

**Đã được chủ sản phẩm xác nhận trong lượt to-spec.** Seam nghiệm thu chính là
hành vi quan sát được qua web và API công khai của ứng dụng: thiết lập → tương
tác → kết quả → tải lại/tiếp tục. Ưu tiên tận dụng Playwright/Vitest và biên app
hiện hữu; không thêm API test-only hoặc mock từng helper để chứng minh các hàm
được gọi theo thứ tự. Chỉ bổ sung kiểm tra API có thẩm quyền khi cần chứng minh
quyền riêng tư, idempotency và không ảnh hưởng tiến độ học chính.

- **Một kiểm thử tốt** có hành động người dùng/đầu vào công khai, kết quả quan
  sát được và điều kiện lỗi quan trọng. Không khóa tên component/hàm, số lần
  render, cấu trúc SQL nội bộ hoặc ảnh snapshot toàn trang để thay thế hành vi.
- **Luyện tự do:** kiểm tra nguồn học, ít nội dung hơn yêu cầu, loại media thiếu,
  kết hợp luân phiên, bốn lựa chọn rõ ràng, gõ chuẩn hóa, lần đầu/Đã xem/bỏ qua,
  tổng kết, lỗi lưu và tiếp tục. Chứng minh nguồn sáu mục/yêu cầu mười không tự
  lấy bốn mục khác; nguồn một mục không bị nhân đôi trong lượt luyện kết hợp.
- **Game:** kiểm tra đúng +10, năm lần mất tim kết thúc, replay/ô trống/lỗi media
  không trừ, request trùng không nhân điểm/tim, reload không hồi tim. Kiểm tra
  học rồi chưa học rồi trộn lại trong cùng nguồn, nguồn một từ, hết media, thay
  thiết lập, giảm chuyển động và kỷ lục không ghép khác điều kiện.
- **Video:** kiểm tra đăng nhập, trạng thái player/sub riêng, Anh mặc định/Việt
  mở khi cần, lựa chọn thời gian, replay và điền từ. Kiểm tra chọn 02:10–02:50
  không sinh câu ở 04:00; mở lời trước ghi Đã xem; đáp án chuẩn hóa; cue không
  hợp lệ; đổi phiên bản; bản Việt sai nguồn không được dùng lại.
- **Provider/video I/O:** kiểm thử tự động dùng player có thời gian/sự kiện điều
  khiển được và phản hồi transcript/dịch giả lập ở biên I/O. Không cần tách thêm
  biên cho từng dòng phụ đề hay thành phần hiển thị. Thử timeout, không cho nhúng,
  thiếu transcript, thiếu Việt, timing sai, quota hết/không biết, retry và nguồn
  bị mất. Không gọi dịch vụ trả phí hoặc dựa vào mạng YouTube để quyết định CI.
- **Tích hợp thật riêng:** khi nguồn/quota đã xác minh, kiểm tra video thật trên
  web/mobile, mức tốc độ có sẵn, quảng cáo/buffering và độ lệch seek/pause. Mock
  pass không phải bằng chứng đồng bộ giọng gốc thực tế. Chỉ cam kết phạm vi nguồn
  và độ chính xác đã kiểm tra, không hứa mọi URL hoặc timing từng âm tiết.
- **API/quyền truy cập:** thử không đăng nhập, đổi ID nội dung/phiên, tài khoản
  không được phép, giả điểm/tim/đúng-sai, nội dung stale và submit lặp. Với kết
  quả tài khoản, kiểm tra trạng thái được xác nhận bởi API; không tin client tự
  báo đúng hoặc tự gán tim. Kiểm tra dữ liệu cá nhân không lộ qua response/cache.
- **Không ảnh hưởng SRS/XP/chuỗi:** lưu trạng thái học chính trước/sau ở API hoặc
  service boundary phù hợp; luyện/chơi/xem nhiều lần, đúng từ chưa học và retry
  vẫn giữ ngày ôn, revision học chính, XP, chuỗi và số từ đã học. Chỉ quan sát
  UI không gọi đường review là chưa đủ để chứng minh server không có tác dụng phụ.
- **Khách/tài khoản và lưu máy:** kiểm tra reload, lỗi lưu cục bộ, đăng xuất/đổi
  tài khoản; khách không ghi API riêng và không tự nhập lịch sử khi đăng nhập.
  Không hứa khôi phục sau xóa storage hoặc giữa thiết bị khi chưa có tính năng đó.
- **Prior art trong repo:** bộ kiểm thử trình duyệt US31–32 đã thực hiện bài tập
  qua UI và theo dõi review API; bộ component Exercise Study dùng router/learner
  context và giả lập fetch; US07 review orchestration có validation, quyền hạn,
  authoritative grading và replay; kiểm thử guest có reload, lỗi persistence và
  theo dõi private writes; gamification API có kiểm tra auth và cô lập XP.
  Tái dùng cách dựng fixture/quan sát này, không tái dùng đường ghi review cho
  kết quả mới hay sao chép các assertion SQL chỉ vì prior art đang có.
- **Seam phụ chỉ khi cần:** các luật trạng thái thuần có nhiều tổ hợp như tim,
  hành động trùng hoặc chuẩn hóa đáp án có thể được kiểm thử qua giao diện công
  khai của luật miền. Chỉ thêm khi giúp kiểm chứng trường hợp khó ở seam chính;
  không tạo một mạng các mock nội bộ hoặc kiểm thử phản chiếu triển khai.
- **Các cổng kiểm tra khi triển khai:** lint, typecheck, test, build và các E2E
  liên quan; kiểm thử DB/migration tin cậy chỉ khi thực sự có thay đổi cần nó.
  Không chạy live Neon cho tổng hợp spec. Không tuyên bố UI, provider, DB hay
  feature đã pass khi mới kiểm tra văn bản hoặc fixture.

## Out of Scope

- Thay đổi scheduler, lịch Ôn theo lịch, tiến độ từ vựng, XP, chuỗi hoặc lịch sử
  từ yếu bởi luyện/game/video; sửa toàn bộ luồng học hiện hữu.
- Đếm ngược cho luyện/game, cá thoát vì gõ chậm, ngắm bắn riêng, combo, hồi tim,
  bảng xếp hạng, kinh tế phần thưởng hoặc game thứ hai.
- Nối buổi/ván dở giữa thiết bị, phục hồi sau xóa dữ liệu trình duyệt, tự nhập
  lịch sử khách vào tài khoản hoặc full offline/PWA synchronization.
- Học qua bài viết/web, lấy từ cả website/playlist/kênh hoặc cam kết live stream.
- Chuyển link thành flashcards làm luồng chính, tự tạo nghĩa/bộ từ từ video,
  công bố nguồn cá nhân vào kho chung hoặc đặt giới hạn video theo 30 thẻ cũ.
- Tải/tách/lưu MP3/video YouTube, phát bằng player ẩn, nghe nền/tắt màn hình,
  tự sinh ảnh/TTS hoặc thay giọng gốc bằng giọng tổng hợp.
- Chép nguyên câu, bài nói theo có hướng dẫn, thu âm/so sánh/chấm phát âm, câu
  hỏi hiểu nội dung, dịch từng từ để thay dịch ngữ cảnh hoặc một AI tutor.
- Tra nghĩa cụm tại chỗ, gợi ý video theo khả năng, tự gán CEFR và karaoke theo
  từng từ khi chưa có dữ liệu/kiểm chứng; đây là ý tưởng phát triển sau.
- Tự nhận dạng giọng nói khi thiếu phụ đề, dịch toàn video khi dán link, mua/
  nâng gói hoặc chuyển dịch vụ trả phí. Chưa chọn provider/plan/API key cụ thể.
- Cam kết mọi video nhúng/lấy phụ đề được, phụ đề/bản dịch đúng tuyệt đối hoặc
  độ chính xác điền từ là chứng nhận nghe hiểu.
- Tạo tài khoản/OAuth mới, redesign toàn bộ điều hướng, chọn game engine mới,
  biên tập/mở rộng dữ liệu hay thay đổi schema nền tảng không liên quan.
- Triển khai, phát hành, chạy migration, ghi DB/cloud hoặc commit/push từ việc
  tổng hợp/xuất ticket; không tự giao thực thi sau khi kế hoạch được xuất.

## Further Notes

- **Truy vết quyết định:** Q14 chốt Luyện tự do; Q24 chốt game 5 tim liên tục;
  Q34 sửa hướng video, không duyệt đề xuất tạo thẻ; Q35–43 chốt chi tiết video;
  Q44 chốt toàn bộ video v1 và kế hoạch ba phần. Lượt to-spec tiếp theo xác nhận
  seam nghiệm thu web/API và mock I/O rồi kiểm tra tích hợp thật riêng.
- **Vị trí của bản tổng hợp:** đây là spec thống nhất cho phạm vi hiện tại; các
  brief đã duyệt và lịch sử phỏng vấn được giữ làm bằng chứng. Các đề xuất cũ
  như game không tim/fixed round, +5 sau sửa sai, chuyển YouTube thành bộ thẻ
  và giới hạn 30 thẻ không quay lại phạm vi qua việc tổng hợp.
- **Quy tắc nhất quán giữa ba phần:** luyện từ vựng kết hợp là luân phiên ảnh/
  nghe, không phải mỗi câu có cả hai; game dùng quy tắc tim riêng; video dùng
  giọng nguồn và timing phụ đề, không mượn audio từ vựng để giả ngữ cảnh nguồn.
- **Các ý tưởng để sau đã được ghi nhận:** học qua bài viết, tra cụm trong ngữ
  cảnh, chép câu, nói theo/ghi âm và hỗ trợ chọn video. Chưa có phạm vi v1 hoặc
  cam kết lịch phát hành cho các ý tưởng này; không được coi là việc bị bỏ sót.
- **Điều kiện kỹ thuật còn phải xác minh:** nguồn transcript/dịch, quyền và điều
  kiện lưu dùng lại, khóa/quota/hạn mức thật, xử lý bất đồng bộ, tốc độ/độ chính
  xác player thực tế; các hợp đồng/schema/API mới. Đây là phụ thuộc kỹ thuật,
  không yêu cầu chủ sản phẩm trả lời lại các quyết định đã chốt hoặc cấp phí ngầm.
- **Quan hệ baseline:** đây là mở rộng sản phẩm được chủ sản phẩm xác nhận sau
  phạm vi MVP ban đầu. Khi triển khai, cập nhật hợp đồng/story/baseline liên
  quan có truy vết; không âm thầm xóa các ranh giới kiến trúc và quyền hiện có.
- **Phát hành theo lát cắt:** spec bao trùm ba phần nhưng không bật ba story
  triển khai đồng thời. Hợp đồng và kiểm thử cho phần đang làm được hoàn thiện
  trước; mỗi phần nghiệm thu độc lập theo thứ tự đã chốt.
- **Xuất bản ticket:** sau lượt to-spec, chủ sản phẩm gọi to-tickets và duyệt
  sơ đồ 21 lát cắt cùng tracker Markdown local riêng. Trạng thái xuất được
  duyệt là `planned`, `Execution authorized: no`, thay mặc định ready-for-agent
  của skill. Chưa tạo issue ngoài hoặc giao code. Nhãn tracker không thay thế
  gate story READY FOR IMPLEMENTATION hoặc chỉ thị triển khai.
- **Bằng chứng hiện tại:** đã tổng hợp/đối chiếu tài liệu và kiểm tra văn bản;
  chưa xây tính năng, chạy kiểm thử tính năng mới hay xác minh provider live.
