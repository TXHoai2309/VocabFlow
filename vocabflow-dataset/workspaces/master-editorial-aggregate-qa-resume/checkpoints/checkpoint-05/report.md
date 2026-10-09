# Phase 2H.2I-R4 — additive checkpoint 05

Status: PARTIAL for the aggregate audit; all three bounded selections are completed. This is offline AI audit work, not owner approval.
Parent checkpoint 04: 524b064666d9538cb9774bd50f4a2bd63e82505e8f2a82232a4b59f4baf6724b. Remote parent: 9cac61f60b1c3dcff64fc66d3b3adf215aa0e29f.
REVIEW triage: 145 + 42 = 187/187; pending 0. Formal approval and rights clearance remain separate.
Sense coverage: 242 + 75 = 317/500; pending 183. Original warning identities preserved: 126. Exhaustive lexical coverage: false.
Dedicated grammar candidates: 83 + 24 = 107/107; pending 0. Actual batch Sense inspections: 197 across 24 full original batches.
Checkpoint-local grammar classification counts: {
  "CONFIRMED_PROCESS_COMMENTARY": 25,
  "VALID_LEARNER_GRAMMAR_NOTE": 172
}. These counts are not a prevalence estimate and do not certify all corpus grammar notes.
New findings: 23 exact unapplied field proposals; coverage gaps 0 confirmed / 0 possible; source metadata conflicts 0.
Rights remain UNKNOWN_REVIEW_REQUIRED; no formal approval, canonical ID, correction application, database access/write, Production operation, Master release, legacy or frozen authoring change. Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses.

## REVIEW assessments

- EDITORIAL_2H2H:whatever:anything-without-restriction: ['SOURCE_ORIGINALITY_UNCERTAIN'] — Nội dung “whatever remains” diễn đạt phần còn lại, còn ví dụ về whatever + danh từ và đại từ độc lập được phân biệt rõ. Tín hiệu trùng cụm trong meaningVi chỉ là heuristic, không chứng minh sao chép hay lỗi nghĩa. Next: Giữ nguyên DRAFT và REVIEW lịch sử; chỉ đánh giá provenance bằng quy trình riêng nếu cần, không đổi identity từ tín hiệu similarity.
- EDITORIAL_2H2H:fiery:full-of-strong-emotion: ['SENSE_BOUNDARY_UNCERTAIN'] — Định nghĩa và ví dụ hiện tại mô tả nghĩa cảm xúc của fiery nhất quán; evidence 4600 nêu nghĩa literal “đang cháy”, hiện chưa có trong Sense này. Phạm vi nghĩa chưa thể xem là đầy đủ. Next: Giữ nghĩa cảm xúc riêng; đối chiếu chính xác source literal trong một lượt coverage riêng và xin quyết định biên tập/owner trước khi thêm Sense.
- EDITORIAL_2H2H:downtown:central-city-area: ['SENSE_BOUNDARY_UNCERTAIN'] — Nghĩa danh từ “khu trung tâm” cùng trạng thái thường không đếm được là phù hợp; ví dụ phố và nhà hát đặt đúng khu vực downtown. POS/cấu trúc khu vực Bắc Mỹ chưa được owner chốt thành identity. Next: Giữ draft NOUN và nhãn REVIEW; chuyển ba cách dùng downtown sang quyết định taxonomy/identity riêng, không hợp nhất theo headword.
- EDITORIAL_2H2H:downtown:in-the-city-centre: ['SENSE_BOUNDARY_UNCERTAIN'] — “Downtown hotel” minh họa đúng tính từ đứng trước danh từ và thông tin vùng Bắc Mỹ được giới hạn rõ. Sự cùng headword với danh từ và trạng từ không xác lập canonical Sense. Next: Giữ draft ADJECTIVE; yêu cầu quyết định owner về phân loại các cấu trúc regional trước mọi liên kết identity.
- EDITORIAL_2H2H:downtown:to-or-in-the-centre: ['SENSE_BOUNDARY_UNCERTAIN'] — Ví dụ “went downtown” tự nhiên cho trạng từ chỉ đích/hướng; ghi chú nêu chính xác việc không dùng giới từ trong cấu trúc này. Quan hệ taxonomy với downtown NOUN/ADJECTIVE còn cần quyết định riêng. Next: Giữ draft ADVERB và regional qualifier; không gộp ba POS chỉ vì chung dạng chữ.
- EDITORIAL_2H2H:magnet:object-with-magnetic-attraction: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Định nghĩa giới hạn nam châm ở các vật liệu nhất định như sắt; ví dụ giấy được giữ trên cửa tủ lạnh phù hợp. Ghi chú chủ động tránh khẳng định sai rằng nam châm hút mọi kim loại. Next: Giữ nội dung hiện tại; không có thay đổi trường người học nào được chứng minh trong lần rà soát này.
- EDITORIAL_2H2H:o’clock:exact-hour-expression: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Giải thích o’clock cho giờ tròn và ví dụ nine o’clock khớp; cách viết apostrophe thẳng trong câu ví dụ là biến thể trình bày của apostrophe cong ở key. Form/canonical lexical identity vẫn tách khỏi đánh giá nội dung. Next: Giữ meaning, example và grammar note; nếu có chuẩn hóa display form sau này, xử lý theo quyết định form riêng.
- EDITORIAL_2H2H:upwards:towards-a-higher-position: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — “Upwards” nêu hướng lên cao, không phải nghĩa cận dưới số; ví dụ đèn lồng được gió nóng đưa lên dịch đúng. Phân biệt Anh-Anh/Anh-Mỹ được trình bày như xu hướng, không tuyệt đối hóa. Next: Giữ DRAFT; tín hiệu polarity đơn lẻ không cần sửa nội dung.
- EDITORIAL_2H2H:will:future-prediction: ['SENSE_BOUNDARY_UNCERTAIN'] — Will trong ví dụ là trợ động từ modal theo sau bởi base verb; ghi chú không gán biến tố động từ thường. Cách dùng dự đoán không đủ căn cứ để hợp nhất identity với lời hứa hoặc hai danh từ will. Next: Giữ từng POS/cách dùng riêng ở trạng thái DRAFT; chuyển identity giữa các cấu trúc sang owner review.
- EDITORIAL_2H2H:will:present-decision-or-promise: ['SENSE_BOUNDARY_UNCERTAIN'] — Ví dụ I will return biểu đạt cam kết/hành động người nói dự định; ghi chú đúng cấu trúc modal + base verb. Nó khác chức năng dự đoán nhưng không tự xác lập canonical Sense riêng. Next: Giữ draft và nghĩa promise/decision; không tạo identity hoặc inflection cho modal.
- EDITORIAL_2H2H:will:determination: ['SENSE_BOUNDARY_UNCERTAIN'] — Will mang nghĩa ý chí và kết hợp tự nhiên với will to finish; dùng uncountable là phù hợp. Cùng headword với modal và danh từ di chúc không chứng minh identity chung. Next: Giữ NOUN này riêng; yêu cầu quyết định identity có thẩm quyền trước liên kết với các Sense will khác.
- EDITORIAL_2H2H:will:document-about-inheritance: ['SENSE_BOUNDARY_UNCERTAIN'] — Định nghĩa di chúc và cụm in his will trong truyện khớp; ghi chú không khẳng định hiệu lực pháp lý. Cấu trúc danh từ này khác modal và “ý chí”, nhưng canonical identity vẫn chưa được duyệt. Next: Giữ DRAFT và giới hạn pháp lý hiện có; không coi nội dung ví dụ là đánh giá một di chúc thật.
- EDITORIAL_2H2H:content:information-in-a-work: ['SENSE_BOUNDARY_UNCERTAIN'] — Content là danh từ về thông tin/vật liệu trong tác phẩm; câu biên tập booklet minh họa đúng. Lịch sử nêu khác biệt stress và POS với adjective content, nên không đồng nhất bằng spelling. Next: Giữ noun/adjective tách biệt; để owner quyết định identity/canonical grouping.
- EDITORIAL_2H2H:content:satisfied-with-situation: ['SENSE_BOUNDARY_UNCERTAIN'] — Adjective content with a quiet evening diễn đạt hài lòng với tình huống; frame content with và stress được ghi đúng. Khác nghĩa/POS với danh từ content, không suy ra cùng identity từ chữ viết. Next: Giữ draft ADJECTIVE riêng khỏi noun; unresolved identity vẫn cần owner review.
- EDITORIAL_2H2H:fridge:refrigerated-storage-appliance: ['SOURCE_ORIGINALITY_UNCERTAIN'] — Fridge là danh từ đếm được chỉ thiết bị giữ lạnh; trình tự chờ súp nguội rồi cất vào tủ lạnh hợp lý. Gần trùng với refrigerator là quan hệ rút gọn từ vựng, không phải lỗi nội dung hay bằng chứng cần merge. Next: Giữ lemma fridge và freezer contrast; không gộp/xóa do near-duplicate signal.
- EDITORIAL_2H2H:instrumental:important-in-achieving-result: ['SENSE_BOUNDARY_UNCERTAIN'] — Instrumental in starting mô tả vai trò then chốt; nghĩa adjective âm nhạc “không lời” cũng được giữ riêng. Historical review còn ghi nhận source-supported NOUN “a piece of music” chưa được đại diện. Next: Giữ hai adjective hiện tại; chuyển source noun chưa đại diện vào lượt coverage riêng trước mọi quyết định bổ sung.
- EDITORIAL_2H2H:instrumental:music-without-vocals: ['SENSE_BOUNDARY_UNCERTAIN'] — Instrumental version là adjective về nhạc cụ/không lời và dịch phù hợp. Historical review ghi nhận danh từ chỉ một tác phẩm nhạc cụ riêng chưa được đại diện; tín hiệu polarity không biến thành lỗi hiện tại. Next: Giữ draft ADJECTIVE; xác minh source boundary NOUN trong coverage review và xin phê duyệt trước khi thêm.
- EDITORIAL_2H2H:fast:moving-quickly: ['SENSE_BOUNDARY_UNCERTAIN'] — Fast adjective chỉ tốc độ chuyển động/sự kiện; train chạy qua ga minh họa đúng. Dạng adjective không dùng fastly như ghi chú; nghĩa động từ nhịn ăn thuộc cấu trúc khác. Next: Giữ adjective riêng; giữ các POS sibling tách biệt tới khi có quyết định identity.
- EDITORIAL_2H2H:fast:at-high-speed: ['SENSE_BOUNDARY_UNCERTAIN'] — Fast ở vai trò trạng từ bổ nghĩa flowed và bản dịch “chảy nhanh” đúng. Cùng hình thức với adjective là flat adverb, không phải lỗi thiếu fastly hay identity tự động. Next: Giữ trạng từ và ví dụ; không chuẩn hóa thành fastly.
- EDITORIAL_2H2H:fast:go-without-food: ['SENSE_BOUNDARY_UNCERTAIN'] — Động từ fast mô tả kiêng ăn có chủ đích trong bối cảnh nhân vật hư cấu; ví dụ không khuyên thực hành. Khác nghĩa và POS với fast tốc độ. Next: Giữ wording mô tả và không biến thành hướng dẫn sức khỏe; identity giữa các POS cần quyết định riêng.
- EDITORIAL_2H2H:weave:interlace-material: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Định nghĩa dệt/đan và ví dụ giỏ từ nan tre khớp nhau; grammar note phân biệt wove/woven cho tạo tác với weaved cho chuyển động. Nguồn local hỗ trợ hai nghĩa nhưng chưa xác minh độc lập biến thể động từ chuyển động. Next: Giữ nguyên draft; yêu cầu corroboration từ nguồn ngôn ngữ được phép trước khi khẳng định mạnh hơn về conjugation.
- EDITORIAL_2H2H:weave:move-in-a-winding-route: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Weaved between the cones là chuyển động luồn lách và bản dịch Việt khớp; grammar note phân biệt mẫu này với wove khi dệt vật liệu. Bằng chứng local chưa tự giải quyết lựa chọn biến tố. Next: Giữ nghĩa, ví dụ và REVIEW; kiểm chứng lexical form ở bước riêng trước khi xuất bản, không sửa theo cảm tính.
- EDITORIAL_2H2H:forward:towards-the-front: ['SOURCE_POS_CONFLICT'] — Step forward là trạng từ chỉ hướng, grammar note forward/forwards có giới hạn vùng hợp lý. Evidence 4600 gắn nhãn PREPOSITION nhưng ví dụ nguồn là trạng từ; giữ nguyên POS draft, không tạo Sense mới từ nhãn lỗi. Next: Yêu cầu đối soát source POS/raw example trong quy trình editorial riêng; không chuyển canonical POS dựa riêng vào metadata xung đột.
- EDITORIAL_2H2H:forward:at-or-towards-the-front: ['SOURCE_POS_CONFLICT'] — Forward section minh họa tính từ vị trí trước danh từ; ghi chú giới hạn interpersonal boldness khỏi Sense này. Source 4600 có nhãn PREPOSITION không khớp các cấu trúc hướng trong bộ ví dụ liên quan. Next: Giữ draft ADJECTIVE; yêu cầu giải quyết metadata/source construction trước mọi taxonomy hoặc mapping.
- EDITORIAL_2H2H:intermittent:stopping-and-starting: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Intermittent rain và bản dịch “mưa lúc có lúc không” nêu đúng sự xuất hiện có quãng ngắt; trạng từ intermittently là ghi chú hữu ích. Polarity signal không chỉ ra lỗi ở nội dung này. Next: Giữ nguyên DRAFT; không cần sửa trường theo heuristic.
- EDITORIAL_2H2H:withdrawal:removing-from-a-situation: ['SENSE_BOUNDARY_UNCERTAIN'] — Withdrawal from the contest mô tả rút khỏi hoạt động; ví dụ đội thi rời cuộc thi không hàm ý hậu quả pháp lý. Đây là một cấu trúc danh từ khác rút tiền và triệu chứng sau khi ngừng chất. Next: Giữ ba ứng viên withdrawal riêng ở DRAFT; yêu cầu owner quyết định identity/coverage nếu cần.
- EDITORIAL_2H2H:withdrawal:taking-money-out: ['SENSE_BOUNDARY_UNCERTAIN'] — Withdrawal trên account record là khoản rút tiền; cụm make a withdrawal/cash withdrawal đúng cách dùng. Không gộp với việc rời hoạt động hay nghĩa sức khỏe chỉ do chung headword. Next: Giữ ví dụ mô tả tài khoản và không suy ra sản phẩm tài chính cụ thể; xử lý identity riêng.
- EDITORIAL_2H2H:withdrawal:effects-after-stopping-a-substance: ['SENSE_BOUNDARY_UNCERTAIN'] — Withdrawal symptoms được mô tả trong một tiểu thuyết; note nói tên hiện tượng, không hướng dẫn điều trị. Dùng uncountable trong nghĩa này là tự nhiên và cần giữ ranh giới y tế. Next: Giữ câu mô tả không chẩn đoán/khuyến nghị; xin quyết định owner cho boundary/rights trước mọi phát hành.
- EDITORIAL_2H2H:guilty:responsible-for-wrongdoing: ['SOURCE_POS_CONFLICT'] — Guilty of theft là tính từ về trách nhiệm và grammar frame đúng; source 4600 có nhãn NOUN nhưng ví dụ của source dùng felt guilty, không chứng minh danh từ. Next: Giữ ADJECTIVE; yêu cầu sửa/ghi nhận source metadata tại bước riêng, không tạo noun giả.
- EDITORIAL_2H2H:guilty:feeling-remorse: ['SOURCE_POS_CONFLICT'] — Felt guilty about forgetting là adjective về cảm giác có lỗi, không phải NOUN như source 4600 gắn nhãn. Bản dịch và phân biệt cảm xúc với trách nhiệm thực tế chính xác. Next: Giữ ADJECTIVE và ghi xung đột nguồn cho owner/source review; không đổi canonical POS.
- EDITORIAL_2H2H:million:one-thousand-thousand: ['SOURCE_POS_CONFLICT'] — Million trong ví dụ là NUMBER 1,000,000; quy tắc two million / millions of phân biệt đúng. Source label NOUN không được coi là quyết định phân loại canonical. Next: Giữ NUMBER; giải quyết metadata POS bằng review riêng, không đổi dựa trên nhãn đơn lẻ.
- EDITORIAL_2H2H:sentence:official-punishment: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Sentence trong ví dụ pháp lý hư cấu là hình phạt được tuyên; note tách nghĩa đơn vị ngữ pháp và verb sentence. Dấu polarity không biến ngữ liệu mô tả thành tư vấn pháp lý. Next: Giữ nội dung ở mức từ vựng và bối cảnh tiểu thuyết; không cần thay đổi hiện tại.
- EDITORIAL_2H2H:thus:as-a-result: ['SOURCE_POS_CONFLICT'] — Thus as a result dùng trạng từ nối mệnh đề với dấu chấm phẩy, tránh comma splice; source POS CONJUNCTION còn xung đột với phân tích hiện tại. Next: Giữ ADVERB và dấu câu; yêu cầu giải quyết POS taxonomy/source ngoài lượt này.
- EDITORIAL_2H2H:thus:in-this-way: ['SOURCE_POS_CONFLICT'] — Thus in this way là trạng từ chỉ cách thức và ví dụ mệnh lệnh + kết quả dễ hiểu; historical source vẫn mang nhãn CONJUNCTION không thống nhất. Next: Giữ Sense DRAFT hiện có; không đổi POS hay identity trước quyết định được duyệt.
- EDITORIAL_2H2H:might:uncertain-possibility: ['SENSE_BOUNDARY_UNCERTAIN'] — Might + base verb diễn đạt khả năng không chắc chắn; mệnh đề điều kiện về đường mở lại giữ đúng tính bất định. Đây là modal khác danh từ might chỉ sức mạnh. Next: Giữ modal riêng khỏi NOUN sibling; không suy ra canonical identity từ spelling.
- EDITORIAL_2H2H:might:great-power: ['SENSE_BOUNDARY_UNCERTAIN'] — Military might là danh từ không đếm được về sức mạnh trong truyện; ví dụ không cổ súy hoặc khẳng định sự kiện thực. POS khác modal might. Next: Giữ NOUN riêng; mọi liên kết giữa hai POS cần owner decision.
- EDITORIAL_2H2H:unlike:different-from: ['SOURCE_POS_CONFLICT'] — Unlike the old tent là preposition theo sau bởi noun phrase và nghĩa khác với dislike được ghi rõ. Source note gợi ADJECTIVE nhưng ví dụ hiện tại chỉ chứng minh PREPOSITION. Next: Giữ preposition; để source/content owner đánh giá adjective boundary bằng bằng chứng riêng, không suy diễn.
- EDITORIAL_2H2H:pound:british-currency-unit: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Pound tiền tệ Anh được minh họa với three pounds và ký hiệu £; nghĩa tách biệt với đơn vị cân nặng và động từ strike. Next: Giữ DRAFT; không diễn giải thành khẳng định về identity/rights.
- EDITORIAL_2H2H:pound:weight-unit: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Nghĩa đơn vị cân nặng có ví dụ một pound; grammar overlay được chấp nhận giới hạn quan hệ 16 ounces cho avoirdupois đời thường và nêu các hệ lịch sử khác. Nội dung hiệu lực đã được rà soát nhưng owner/rights vẫn mở. Next: Giữ overlay đã có, không ghi đè manuscript hoặc lặp correction; giữ unresolved approval riêng.
- EDITORIAL_2H2H:pound:strike-repeatedly: ['NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI'] — Pounded the peg into the ground diễn đạt đập lặp lại để đóng cọc; động từ có đối tượng và biến tố regular được ghi phù hợp. Khác cả hai nghĩa NOUN pound. Next: Giữ draft verb và bối cảnh; không suy ra mapping từ dạng chữ.
- EDITORIAL_2H2H:including:with-as-part-of-the-group: ['SOURCE_POS_CONFLICT'] — Including two new members đặt các thành viên bên trong tổng tám; đây là preposition trước noun phrase. Source 4600 label ADJECTIVE không phù hợp ví dụ/usage này. Next: Giữ PREPOSITION; yêu cầu xử lý source metadata độc lập, không coi nhãn là approval.
- EDITORIAL_2H2H:therefore:logical-result: ['SOURCE_POS_CONFLICT'] — Therefore nối kết quả bằng connecting adverb với semicolon, đúng ngữ pháp; source label CONJUNCTION vẫn không giải thích đầy đủ cấu trúc. Next: Giữ trạng từ và dấu câu; để owner/source editorial quyết định phân loại sau.

## Sense coverage assessments

- NORMALIZED_HEADWORD:wise: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Showing sound judgment based on understanding or experience. (VI: khôn ngoan; sáng suốt). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. khôn ngoan; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:design: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — A plan showing how something should look, be built, or function. (VI: bản thiết kế; thiết kế); VERB — To plan the appearance, structure, or operation of something before it is made. (VI: thiết kế). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. thiết kế, 1 v. thiết kế; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:happen: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To do or be something by chance rather than because it was arranged. (VI: tình cờ); VERB — To take place or occur. (VI: xảy ra). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. xảy ra, 1 v. tình cờ; 4600 verb (If someone happens to do something, he or she does it by chance.; xảy ra); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:memorable: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Special or striking enough to be remembered for a long time. (VI: đáng nhớ). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. đáng nhớ; 4600 adj (If something is memorable, then it is remembered for a special reason.; đáng nhớ); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:prohibit: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: VERB — To forbid an activity or prevent it through a rule or authority. (VI: cấm; không cho phép). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. cấm; 4600 verb (To prohibit something means to not allow it.; cấm, ngăn cản); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:ceremony: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — An event that includes formal or traditional actions to mark an occasion. (VI: buổi lễ; nghi lễ). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. buổi lễ, nghi lễ; 4600 noun (A ceremony is an event that happens on special occasions.; lễ nghi, nghi thức); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:exclude: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To prevent someone from entering or taking part in something. (VI: không cho tham gia; loại trừ); VERB — To leave someone or something out of a group, list, or calculation. (VI: không bao gồm; loại ra). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. không bao gồm, 1 v. loại trừ, không cho tham gia; 4600 verb (To exclude someone means to not accept them into a group. ; loại trừ); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:moving: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: ADJECTIVE — Causing strong feelings, especially sympathy or sadness. (VI: cảm động; gây xúc động); ADJECTIVE — Changing position rather than remaining still. (VI: đang chuyển động; đang di chuyển). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. cảm động, 1 adj. đang chuyển động; 4600 adj (causing strong, often sad, feelings about somebody/something); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:postpone: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: VERB — To arrange for something planned to happen later than originally intended. (VI: hoãn; dời lại). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. hoãn; 4600 verb (To postpone something is to make it happen later than planned.; hoãn lại); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:visit: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To go to a person or place in order to spend time there. (VI: đến thăm; ghé thăm); NOUN — An occasion when someone goes to a person or place and spends time there. (VI: chuyến thăm; lần ghé thăm). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. đến thăm, 1 n. chuyến thăm, lần thăm; 4600 verb (To visit is to go and spend time in another place or see another person.; thăm, viếng); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:zero: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NUMBER — The number representing no amount, or the point from which a scale is measured. (VI: không; số không). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 number không, số không; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:cold: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — A common illness often involving a runny or blocked nose and a sore throat. (VI: cảm lạnh); ADJECTIVE — Having a low temperature, or feeling a lack of warmth. (VI: lạnh). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. lạnh, 1 n. cảm lạnh; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:grace: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — Kind, courteous, and composed behaviour towards others, especially in a difficult situation. (VI: sự nhã nhặn; sự điềm đạm); NOUN — An attractive smoothness and control in the way someone moves. (VI: sự duyên dáng; vẻ thanh thoát). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. sự duyên dáng, 1 n. sự nhã nhặn; 4600 n (&nbsp;an attractive quality of movement that is smooth and done with control; a simple and beautiful); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:protester: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A person who publicly shows opposition to an action, policy, or situation. (VI: người biểu tình; người phản đối công khai). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. người biểu tình; 4600 n (a person who makes a public protest); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:drum: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A musical instrument played by striking a stretched surface, usually over a hollow body. (VI: trống). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. trống; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:fierce: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: ADJECTIVE — Showing strong aggression or appearing ready to attack. (VI: hung dữ; dữ tợn); ADJECTIVE — Very strong or intense, especially in force or competition. (VI: dữ dội; quyết liệt). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. dữ dội, khốc liệt, 1 adj. hung dữ; 4600 adj (A fierce person or animal is angry or violent.; hung dữ, hung tợn); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:largely: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADVERB — To a great extent or for the most part. (VI: chủ yếu; phần lớn). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adv. chủ yếu; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:reflection: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — Careful thought about an experience, question, or decision. (VI: sự suy ngẫm; sự cân nhắc); NOUN — An image of something seen in a mirror or another reflective surface. (VI: hình ảnh phản chiếu). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. hình ảnh phản chiếu, 1 n. sự suy ngẫm; 4600 noun (A reflection is an image that is seen in a mirror or other shiny surface.; ảnh phản chiếu, sự phản c); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:tax: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To require a person, income, or transaction to pay tax. (VI: đánh thuế); NOUN — Money that a public authority requires people or organizations to pay to fund public services or activities. (VI: thuế). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. thuế, 1 v. đánh thuế; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:any: COVERAGE_UNKNOWN — Đã đọc cả 4 Sense hiện hành: ADVERB — To even a small extent, especially with a comparison in a question or negative statement. (VI: chút nào; hơn chút nào); DETERMINER — Used to say that it does not matter which member of a group is chosen. (VI: bất kỳ; bất cứ); PRONOUN — One or some members of a group, without naming which. (VI: cái nào; một ít; bất kỳ cái nào); DETERMINER — Used for an unspecified amount or number, often in a question or negative statement. (VI: nào; chút nào). Oxford ordinals 0–2 thể hiện DET câu hỏi/phủ định, PRON bất kỳ, và ADV trong so sánh/phủ định; ví dụ current draft DET free-choice ‘any chair’ chưa có ordinal DET riêng tương ứng, dù cấu trúc có liên hệ với ví dụ PRON ‘any of these’. Vì vậy chưa đủ căn cứ để kết luận riêng boundary DET này đã được source coverage chứng minh hoặc là gap chắc chắn.
- NORMALIZED_HEADWORD:grateful: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Feeling or showing thanks for something helpful or beneficial. (VI: biết ơn; cảm kích). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. biết ơn; 4600 adj (A grateful person feels thankful about something.; biết ơn); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:liquid: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: ADJECTIVE — In a flowing physical state with a definite volume but no fixed shape. (VI: ở thể lỏng; dạng lỏng); NOUN — A form of matter that flows, keeps a definite volume, and changes shape to fit its container. (VI: chất lỏng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. chất lỏng, 1 adj. lỏng; 4600 noun (A liquid is a substance that is neither solid nor gas.; chất lỏng); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:performance: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — How well a person, machine, or system carries out an activity. (VI: hiệu suất; mức độ thực hiện); NOUN — An occasion when people present music, drama, or another artistic work to an audience. (VI: buổi biểu diễn; màn trình diễn). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. màn biểu diễn, 1 n. hiệu suất; 4600 noun (Performance is how well someone or something functions, works, etc.; hiệu suất, màn trình diễn); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:strand: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — One part or line of activity within a larger, interconnected whole. (VI: mảng; phần; nhánh nội dung); NOUN — A single thin length of something such as hair, thread, or wire. (VI: sợi). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. sợi, 1 n. khía cạnh, phần; 4600 n (a single thin piece of&nbsp;thread, wire, hair, etc.); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:whose: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 3 Sense hiệu lực: PRONOUN — Used to ask who owns something when the thing is already understood. (VI: của ai); DETERMINER — Used before a noun to ask which person owns or is associated with something. (VI: của ai); DETERMINER — Used to connect a person or thing with something belonging or related to it. (VI: có; mà của người đó hoặc vật đó). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 det. của ai, 1 pron. của ai, 2 det. có (quan hệ sở hữu); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:awful: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Extremely bad, unpleasant, or upsetting. (VI: rất tệ; kinh khủng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. rất tệ, khó chịu, kinh khủng; 4600 adj (An awful thing is very bad.; kinh khủng, tệ hại); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:gene: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A unit of inherited information carried in DNA that helps direct biological functions and characteristics. (VI: gen). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. gen; 4600 noun (A gene controls what it looks like, how an organism grows, and how it develops.; gien (sinh học)); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:introduction: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 3 Sense hiệu lực: NOUN — The act of making something available or putting it into use for the first time in a context. (VI: sự đưa vào; việc áp dụng); NOUN — The act of telling people who someone is so that they can become acquainted. (VI: sự giới thiệu làm quen); NOUN — The opening part of a text or talk that gives background and prepares the audience for what follows. (VI: phần mở đầu; phần giới thiệu). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. phần giới thiệu, 1 n. giới thiệu, 2 n. sự đưa vào, việc áp dụng; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:racist: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: ADJECTIVE — Showing prejudice or unfair treatment towards people because of their race or perceived racial identity. (VI: phân biệt chủng tộc); NOUN — A person who holds or expresses prejudice against people because of their race. (VI: người có tư tưởng hoặc hành vi phân biệt chủng tộc). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. phân biệt chủng tộc, 1 n. người phân biệt chủng tộc; 4600 adj (having the belief that some races of people are better than others or having general beliefs about o); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:stream: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — A continuing flow or sequence of people, things, or events. (VI: dòng liên tục; chuỗi liên tiếp); NOUN — A small natural flow of water through the land. (VI: suối; dòng nước nhỏ). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. suối, 1 n. dòng (liên tục); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:weakness: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — The state of having little strength or power. (VI: sự yếu đi; tình trạng yếu sức); NOUN — A fault or limitation that makes a person or thing less effective. (VI: điểm yếu; hạn chế). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. điểm yếu, 1 n. sự suy yếu; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:middle: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: ADJECTIVE — Situated between the outer parts or between the beginning and end. (VI: ở giữa; thuộc phần giữa); NOUN — The central part or position between the ends or sides of something. (VI: phần giữa; vị trí giữa). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. phần giữa, 1 adj. ở giữa; 4600 noun (The middle is nearest the center and with an equal number of things on each side.; ở giữa); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:port: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A place by the sea or another navigable waterway where ships stop to load or unload. (VI: cảng; bến cảng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. cảng; 4600 noun (A port is a place where ships stop to load and unload things.; bến cảng (biển)); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:welfare: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — Support provided through public systems for people who need help with basic living needs. (VI: trợ cấp xã hội; hỗ trợ an sinh); NOUN — The health, comfort, and good living conditions of a person or group. (VI: phúc lợi; sự an lành; đời sống tốt đẹp). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. phúc lợi, 1 n. trợ cấp xã hội; 4600 noun (Welfare is the health and happiness of a person or group.; phúc lợi, sự an lạc); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:frequent: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Happening often or at repeated short intervals. (VI: thường xuyên; hay xảy ra). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. thường xuyên; 4600 adj (If something is frequent, then it happens or is done often.; thường xuyên); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:sacrifice: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To give up something valuable for another person's benefit or for a goal considered important. (VI: hy sinh; đánh đổi); NOUN — The act of giving up something valuable, or the thing given up, to help someone or achieve another aim. (VI: sự hy sinh; điều phải đánh đổi). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. sự hy sinh, 1 v. hy sinh; 4600 verb (To sacrifice is to give up something in order to get something you want or do something else for som); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:warn: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: VERB — To tell someone about a possible danger or problem so that they can take care. (VI: cảnh báo; báo trước nguy cơ). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. cảnh báo; 4600 verb (To warn someone is to make them know of possible danger; cảnh báo); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:apparently: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADVERB — According to information received or to how a situation appears, without claiming certainty. (VI: nghe nói; có vẻ như). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adv. nghe nói, có vẻ như; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:human: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: ADJECTIVE — Relating to people rather than to other animals, machines, or things. (VI: thuộc con người; của con người); NOUN — A person; a member of the human species. (VI: con người; người). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. (thuộc) con người, 1 n. con người; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:intense: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Very strong in feeling, force, or degree. (VI: mãnh liệt; dữ dội; căng thẳng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. dữ dội, căng thẳng; 4600 adj (An intense thing is very strong.; mãnh liệt, dữ dội, cường độ lớn); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:privilege: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — An opportunity that someone feels honoured or fortunate to have. (VI: vinh dự; cơ hội đáng trân trọng); NOUN — A right or advantage available to a particular person or group rather than to everyone. (VI: đặc quyền; quyền lợi đặc biệt). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. đặc quyền, 1 n. vinh dự; 4600 noun (A privilege is a special right given only to a certain person or group of people.; đặc quyền, đặc ân); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:submit: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To accept someone else's control or a requirement instead of continuing to resist it. (VI: phục tùng; chịu khuất phục); VERB — To give a document or other material to someone so that it can be considered or assessed. (VI: nộp; gửi để xét duyệt). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. nộp, 1 v. phục tùng, chịu khuất phục; 4600 verb (to give a document, proposal, etc. to somebody in authority so that they can study or consider it.; ); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:workout: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A period of physical exercise intended to practise or improve fitness. (VI: buổi tập thể dục; buổi tập luyện). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. buổi tập thể dục; 4600 noun (A workout is an exercise routine that helps improve health.; tập thể dục); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:creative: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Using imagination to produce original ideas or things. (VI: sáng tạo; có óc sáng tạo). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. sáng tạo; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:medication: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — Medicine used to treat an illness or health condition. (VI: thuốc; thuốc điều trị). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. thuốc; 4600 noun (Medication is medicine or drugs given to people who are sick.; thuốc (nói chung)); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:ring: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 4 Sense hiệu lực: VERB — To make a clear sound like a bell, or cause a bell to make that sound. (VI: reo; rung chuông); NOUN — A circular band or an arrangement of things in a circle. (VI: vòng; vòng tròn); NOUN — A small band worn around a finger as jewellery. (VI: nhẫn); VERB — To telephone someone. (VI: gọi điện). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. nhẫn, 1 v. reo, rung (chuông), 2 v. gọi điện, 3 n. vòng; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:sceptical: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Not easily convinced that a statement or idea is true or useful. (VI: hoài nghi; chưa tin). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. hoài nghi; 4600 adj (having doubts that a claim or statement is true or that something will happen); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:weigh: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To have a particular weight. (VI: nặng; có trọng lượng); VERB — To measure the weight of a person or thing. (VI: cân; đo trọng lượng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. nặng, 1 v. cân; 4600 verb (To weigh something means to measure how heavy it is.; nặng (bao nhiêu)); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:contempt: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — Behaviour that shows disrespect for a court or disobeys its authority. (VI: hành vi coi thường tòa án; sự bất tuân đối với tòa án); NOUN — A strong feeling that someone or something deserves no respect. (VI: sự khinh miệt; sự coi thường). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. sự khinh miệt, 1 n. sự khinh thường tòa án; 4600 noun (Contempt is the feeling of having no respect for something.; khinh thường); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:eligible: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Meeting the conditions needed to receive something or take part in an activity. (VI: đủ điều kiện; có tư cách tham gia). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. đủ điều kiện; 4600 adj (If someone is eligible, then they are permitted to do or have something.; đủ điều kiện, đủ tư cách); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:inclusion: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — The act of putting something into a group, document, or other larger whole. (VI: sự đưa vào; việc bổ sung vào); NOUN — The practice of making people feel accepted and able to participate with others. (VI: sự hòa nhập; việc tạo điều kiện tham gia bình đẳng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. sự hòa nhập, 1 n. sự đưa vào, sự bao gồm; 4600 n (&nbsp;the fact of including somebody/something; the fact of being included); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:regain: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: VERB — To get something back after losing it. (VI: lấy lại; giành lại). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. lấy lại; 4600 v (&nbsp;to get back something you no longer have, especially an ability or a quality); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:school: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — An institution where children or other learners receive education. (VI: trường học; nhà trường); NOUN — The time during which regular classes take place at a school. (VI: giờ học; buổi học ở trường). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. trường, 1 n. giờ học; 4600 noun (A school is a place where children go to learn.; trường học); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:worth: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 3 Sense hiệu lực: ADJECTIVE — Good or useful enough to justify the effort, time, or attention involved. (VI: đáng; đáng bỏ công); ADJECTIVE — Having a financial value equal to a stated amount. (VI: trị giá; đáng giá); NOUN — The value or importance that someone or something has. (VI: giá trị; tầm quan trọng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. đáng giá, 1 n. giá trị, 2 adj. đáng (bỏ công, thời gian); 4600 adj (If something is worth an amount of money, it costs that amount.; đáng giá, giá trị); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:dramatic: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: ADJECTIVE — Large, sudden, or striking enough to attract attention. (VI: mạnh; rõ rệt; gây ấn tượng); ADJECTIVE — Relating to plays or theatrical performance. (VI: thuộc kịch; thuộc sân khấu). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. đột ngột, mạnh mẽ, 1 adj. thuộc kịch, sân khấu; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:foster: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To help a feeling, ability, or activity grow or develop. (VI: nuôi dưỡng; thúc đẩy); VERB — To care for another person's child in your home for a period without becoming the child's adoptive parent. (VI: nhận chăm sóc tạm thời; nuôi dưỡng trẻ theo hình thức chăm sóc thay thế). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. thúc đẩy, nuôi dưỡng, 1 v. nuôi dưỡng tạm thời (trẻ); 4600 verb (To foster is to help a skill, feeling, or idea develop over a period of time.; nuôi dưỡng, ấp ủ (một); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:mission: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — An important task or purpose that a person or group is expected to carry out. (VI: nhiệm vụ; sứ mệnh). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. nhiệm vụ; 4600 noun (A mission is an important job that is sometimes far away.; sứ mệnh, nhiệm vụ); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:page: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — One side of a sheet of paper in a book or document, or the information printed there. (VI: trang; trang giấy). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. trang; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:some: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: DETERMINER — An amount or number that is not stated exactly. (VI: một ít; một vài; một số); PRONOUN — An unspecified part of a group or amount already known from the context. (VI: một số; một ít trong số đó). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 det. một ít, một vài, 1 pron. một số, một ít; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:whether: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: CONJUNCTION — Used to introduce alternatives or uncertainty about which possibility is true. (VI: liệu; có hay không). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 conj. liệu; 4600 conj (You use whether when you must choose between two things.; liệu rằng); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:companion: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A person who spends time with someone or joins them in an activity or journey. (VI: bạn đồng hành; người cùng tham gia). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. bạn đồng hành; 4600 noun (A companion is a person that someone spends a lot of time with.; bạn đồng hành); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:fundamentally: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADVERB — In a way that concerns the essential nature or basic structure of something. (VI: về cơ bản; xét về bản chất). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adv. về cơ bản; 4600 adv (in every way that is important; completely); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:inclined: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Feeling willing to do something or tending to behave in a particular way. (VI: có xu hướng; muốn; thiên về). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. có xu hướng, thiên về; 4600 adj (inclined (to do something)&nbsp;wanting to do something); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:prison: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A place where people are kept as prisoners, especially as punishment after a court decision. (VI: nhà tù; trại giam). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. nhà tù; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:wedding: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A ceremony at which people marry, together with the celebrations connected with it. (VI: lễ cưới; đám cưới). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. lễ cưới; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:everything: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: PRONOUN — All the things being considered in a particular situation. (VI: mọi thứ; tất cả mọi việc). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 pron. tất cả mọi thứ; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:inhibit: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: VERB — To restrain an activity or make its progress more difficult. (VI: kìm hãm; hạn chế; cản trở). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. kìm hãm, ngăn cản; 4600 verb (When you inhibit something, you stop it from developing.; ức chế, ngăn cản); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:october: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — The tenth month of the year, between September and November. (VI: tháng Mười). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. tháng Mười; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:series: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: NOUN — A set of related events or things arranged or happening in succession. (VI: loạt; chuỗi); NOUN — A set of related television programmes sharing characters, a topic, or a continuing story. (VI: loạt chương trình truyền hình; bộ phim nhiều tập). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. loạt, 1 n. loạt phim; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:banner: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — A long strip of material or a sign that displays a message or symbol. (VI: biểu ngữ; băng rôn). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. biểu ngữ; 4600 n (a long piece of cloth with a message on it that is carried between two&nbsp;poles&nbsp;or hung in a ); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:lifelong: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: ADJECTIVE — Lasting throughout a person's life. (VI: suốt đời; cả đời). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 adj. suốt đời; 4600 adj (lasting or existing all through your life); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:park: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 2 Sense hiệu lực: VERB — To put a vehicle in a place and leave it there for a time. (VI: đỗ; đậu xe); NOUN — An area of open land where people can walk, relax, or enjoy outdoor activities. (VI: công viên). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. công viên, 1 v. đỗ xe; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:throw: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: VERB — To make something move through the air by moving your hand and letting it go. (VI: ném; quăng). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 v. ném; 4600 verb (To throw something is to use your hand to make it go through the air.; ném); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:college: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — An educational institution offering further, higher, or specialist education. (VI: trường cao đẳng; trường đại học; cơ sở đào tạo chuyên ngành). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. trường cao đẳng, trường đại học; ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.
- NORMALIZED_HEADWORD:extent: NO_IDENTIFIED_SOURCE_SUPPORTED_GAP — Rà soát 1 Sense hiệu lực: NOUN — The degree, size, or range of something. (VI: mức độ; phạm vi). Các source group đã cấu trúc khớp nội dung gồm Oxford ordinals 0 n. mức độ; 4600 noun (The extent of something is how large, important, or serious it is.; mức độ, khoảng rộng); ví dụ EN/VI, POS, collocation và grammar note được xem cùng nhau. Trong bằng chứng local đã đọc không thấy source-supported group nào trong phạm vi hồ sơ này bị bỏ sót.

## New correction proposals — exact BEFORE / AFTER

### 2H2I-R4-P001 / EDITORIAL_2H2C:cave:rock-chamber

Field: /content/grammarNotesEn; parent hash: 4557deb499215d6c9adc1c5ce06f62775ad09a634df94145b2ef5b487b253506.

BEFORE: Countable; cave entrance/mouth; no cave-in verb proposal.

AFTER (unapplied proposal): Countable; cave entrance/mouth.

Cụm “no cave-in verb proposal” ghi trạng thái quyết định editorial về Sense chưa đề xuất, không phải hướng dẫn grammar; phần danh từ đếm được và compound cave entrance/mouth là nội dung người học hữu ích.

### 2H2I-R4-P002 / EDITORIAL_2H2C:both:two-together-determiner

Field: /content/grammarNotesEn; parent hash: 311ba75d3343aba72c1afefb8b3ea0066c54c92ab33dfd2f61166ab2921e9852.

BEFORE: both + plural noun; shared meaning with pronoun, representation split pending.

AFTER (unapplied proposal): Both + plural noun; use a plural verb when both is the subject.

Cụm “representation split pending” mô tả trạng thái phân tách bản ghi; phần xác định từ hạn định + danh từ số nhiều được giữ và diễn đạt lại bằng quy tắc hòa hợp hữu ích.

### 2H2I-R4-P003 / EDITORIAL_2H2C:both:two-together-pronoun

Field: /content/grammarNotesEn; parent hash: d212d21bd602079f58c32a97894a09453c2a11ab5c9226f3cedb4d77cc13b21c.

BEFORE: both as a pronoun; grammatical-use distinction may coalesce with determiner.

AFTER (unapplied proposal): Use both without a following noun; as subject, it normally takes a plural verb.

“May coalesce with determiner” là phương án taxonomy đang chờ, không phải grammar. Thay bằng quy tắc đại từ và hòa hợp số phù hợp ví dụ both worked.

### 2H2I-R4-P004 / EDITORIAL_2H2C:bail:security-money

Field: /content/grammarNotesEn; parent hash: 0e7b3c06cc5aaacc5fb34297c3867f63f087ba98af7cf4f0b1b59f215ecfcfff.

BEFORE: Uncountable financial use; not all pretrial release requires money; legal scope needs human review.

AFTER (unapplied proposal): Usually uncountable when referring to money or security; bail arrangements vary by jurisdiction.

Câu “legal scope needs human review” là trạng thái workflow, không phải grammar; replacement giữ countability và giới hạn vùng pháp lý theo nghĩa từ vựng.

### 2H2I-R4-P005 / EDITORIAL_2H2C:editor:prepare-publication

Field: /content/grammarNotesEn; parent hash: 81242de187065a31d3e7f8e7da7b55658b126d183ca475e4f20402cf406f2036.

BEFORE: Countable; editorial role, not software editor in this proposal.

AFTER (unapplied proposal): Countable; an editor of a publication or recording.

“In this proposal” nói về phạm vi bản thảo thay vì cách dùng. Giữ countability và cung cấp frame editor of.

### 2H2I-R4-P006 / EDITORIAL_2H2C:inner:inside

Field: /content/grammarNotesEn; parent hash: 4c5034e3c112da4facc0ac9f8412796e1aa7e284de0ae37a94cc6c9eefcfe9ad.

BEFORE: Usually attributive; physical position, not private feelings in this proposal.

AFTER (unapplied proposal): Usually attributive; describes a position inside or nearer the centre.

“Not private feelings in this proposal” ghi phạm vi phân hoạch Sense của dự án. Có thể thay bằng usage/collocation mô tả tính từ vị trí.

### 2H2I-R4-P007 / EDITORIAL_2H2C:monkey:primate

Field: /content/grammarNotesEn; parent hash: 887bec53733fb4450512510f9b58321a4239e0b49e1c68e862e3a5b8e4523322.

BEFORE: Not all monkeys have visible tails; apes are a separate group; species review pending.

AFTER (unapplied proposal): Countable; a monkey, several monkeys. Apes are a separate primate group, and not all monkeys have visible tails.

“Species review pending” là trạng thái review chưa hoàn tất. Thay bằng ghi chú số nhiều/countability và giữ hai thông tin phân biệt sinh học hiện có.

### 2H2I-R4-P008 / EDITORIAL_2H2C:industry:economic-sector

Field: /content/grammarNotesEn; parent hash: 8ea5aeb47aad8ac4d6ba3553180088d45a092b4a2a4208e8b87d2166f746f67b.

BEFORE: Industry can include services; not restricted to factories; no diligence proposal without separate evidence.

AFTER (unapplied proposal): Industry can include services and is not restricted to factories.

“No diligence proposal without separate evidence” là chỉ dẫn quy trình/source, không phải ngữ pháp; giữ nghĩa bao gồm dịch vụ và loại trừ giới hạn chỉ nhà máy.

### 2H2I-R4-P009 / EDITORIAL_2H2C:mirror:reflecting-surface

Field: /content/grammarNotesEn; parent hash: 860cead53aa06698b493417600a6326cf7fa26a965e7977bf811a10e41fb4b44.

BEFORE: Countable; physical object only; history-linked identity not remapped.

AFTER (unapplied proposal): Countable; a physical reflective object.

“History-linked identity not remapped” nói về remap identity trong lịch sử dữ liệu; giữ hướng dẫn countability và mô tả vật thể.

### 2H2I-R4-P010 / EDITORIAL_2H2C:stand:tolerate

Field: /content/grammarNotesEn; parent hash: 219dbf19103b85616722b968dcafb775a34621aefc261f3233933d15ac80abe7.

BEFORE: Usually in negatives/questions; stand + noun/gerund; not stand to + infinitive in this proposal.

AFTER (unapplied proposal): Common in negatives and questions; stand + noun or gerund.

“In this proposal” là giới hạn biên tập, còn stand to + infinitive không được giải thích như một quy tắc learner. Bản đề xuất giữ frame thực sự minh họa.

### 2H2I-R4-P011 / EDITORIAL_2H2C:station:broadcast-organization

Field: /content/grammarNotesEn; parent hash: 9304515a8da8b61131c4784d7bc6cc56de59fe6e1f35b34c835dfc9958c2b3fa.

BEFORE: Institution/facility provisionally combined; not a railway station.

AFTER (unapplied proposal): Countable; common compounds include radio station and television station.

“Provisionally combined” mô tả quyết định grouping tạm thời. Bản đề xuất thay bằng countability và compound noun cho người học.

### 2H2I-R4-P012 / EDITORIAL_2H2C:subject:liable-to

Field: /content/grammarNotesEn; parent hash: a6aaad0b381682478632e62cd586cb11ee2d504466255312aba6cabb97b1b538.

BEFORE: subject to + noun; external-condition example; obligation/susceptibility boundary pending.

AFTER (unapplied proposal): Subject to + noun; it can describe exposure to a condition or an obligation imposed by a rule.

“Boundary pending” là trạng thái sense review, không phải grammar. Bản đề xuất ghi frame subject to và hai ngữ cảnh meaning có trong definition.

### 2H2I-R4-P013 / EDITORIAL_2H2C:straight:not-curved

Field: /content/grammarNotesEn; parent hash: 3cfb6f37081d15462b1833dd4e175935d2b6942320ae9d2e5019fab71e887ea8.

BEFORE: Attributive straight line; sensitive identity meanings not introduced.

AFTER (unapplied proposal): Attributive before a noun, as in a straight line.

“Sensitive identity meanings not introduced” là ghi chú phạm vi phân tích, không dạy grammar; replacement giữ construction tính từ đứng trước danh từ.

### 2H2I-R4-P014 / EDITORIAL_2H2C:wrong:not-working-properly

Field: /content/grammarNotesEn; parent hash: 257452d294c6474826a2abc0e33ad852563674a30a4b20fddc49cc389a90b012.

BEFORE: wrong with + noun; distinct issue-state use pending boundary review.

AFTER (unapplied proposal): Wrong with + noun; often used after be to describe a problem.

“Pending boundary review” ghi việc phân định nghĩa chưa hoàn tất; replacement giữ frame wrong with và cấu trúc be + adjective.

### 2H2I-R4-P015 / EDITORIAL_2H2C:worst:most-bad-things

Field: /content/grammarNotesEn; parent hash: ec067cd64cc1dd7eb4a7391136d9b00c779e4e8770317f2723b18b2d0e3c2851.

BEFORE: the worst as nominal use; representation relative to adjective unresolved.

AFTER (unapplied proposal): The worst can function as a noun phrase meaning the most serious possible outcome.

“Representation relative to adjective unresolved” là trạng thái quyết định POS/schema. Bản đề xuất chuyển thành mô tả learner về nominal use.

### 2H2I-R4-P016 / EDITORIAL_2H2D:ashore:land

Field: /content/grammarNotesEn; parent hash: 029b414595b2ccb107997ecaef61bb1f9332539086068e1a6bbdb752d4f480f5.

BEFORE: Adverb; source adjective label conflicts with construction.

AFTER (unapplied proposal): Used adverbially after a verb of movement, as in step ashore.

“Source adjective label conflicts with construction” là giải thích metadata cho auditor. Bản đề xuất nêu cách ashore theo sau động từ chuyển động bằng chính ví dụ.

### 2H2I-R4-P017 / EDITORIAL_2H2D:comprise:include

Field: /content/grammarNotesEn; parent hash: c14653a801d906c6c42c5a921f27d8fd1f05511098f72d1424fc7baa5ab651a5.

BEFORE: Whole comprises parts; source adjective label erroneous.

AFTER (unapplied proposal): The whole comprises its parts; the course comprises six modules.

“Source adjective label erroneous” là nhận xét metadata, không phải grammar. Bản đề xuất giữ whole comprises parts và thêm frame bám ví dụ.

### 2H2I-R4-P018 / EDITORIAL_2H2D:it:technology

Field: /content/grammarNotesEn; parent hash: 2ddb5680ee17c6c20e4200971808f9d246d1c22ebb59b064bf053773782b849e.

BEFORE: Display IT, uppercase; distinct lexical identity from it.

AFTER (unapplied proposal): Display IT in capitals for the field or department of information technology.

“Distinct lexical identity from it” là ghi chú đối chiếu identity dự án; hướng dẫn viết hoa IT là nội dung thực dụng cho người học.

### 2H2I-R4-P019 / EDITORIAL_2H2D:limitation:restriction

Field: /content/grammarNotesEn; parent hash: db71084ea8c10bee107645f23f833388a844252444d5c28d7625b0e310e49203.

BEFORE: Countable restriction in this proposal; the uncountable act of limiting needs separate boundary review before inclusion.

AFTER (unapplied proposal): Countable for a particular restriction; limitation on something names the constraint.

“In this proposal” và “needs separate boundary review before inclusion” nói về trạng thái inclusion/review. Replacement giữ countability và collocation limitation on.

### 2H2I-R4-P020 / EDITORIAL_2H2D:loyal:faithful

Field: /content/grammarNotesEn; parent hash: 3041b96145c88ff38b1b9699ae755f4e80d88b3a222674421c679930fe2a579d.

BEFORE: Loyal to; source noun label unsupported.

AFTER (unapplied proposal): Loyal to a person, group, or cause.

“Source noun label unsupported” báo xung đột metadata nguồn, không phải grammar; frame loyal to khớp ví dụ và nghĩa.

### 2H2I-R4-P021 / EDITORIAL_2H2D:scholar:researcher

Field: /content/grammarNotesEn; parent hash: f03d4414ec300ab2a5e126b668db3b36a0556aa5287136e8c79563ac6402253c.

BEFORE: Countable; Master overlap unresolved.

AFTER (unapplied proposal): Countable; a scholar of a subject or field.

“Master overlap unresolved” nói về canonical relationship; thay bằng countability và collocation scholar of.

### 2H2I-R4-P022 / EDITORIAL_2H2D:wool:fibre

Field: /content/grammarNotesEn; parent hash: 475fa0e366ee1fe75c8bf30a136f62d0d00fa559bf3acefb6c9929844b83a403.

BEFORE: Uncountable material; source core sheep fibre.

AFTER (unapplied proposal): Usually uncountable as a material noun; a wool blanket.

“Source core sheep fibre” là tóm tắt source, không phải hướng dẫn ngữ pháp. Bản mới nêu countability và compound wool blanket.

### 2H2I-R4-P023 / EDITORIAL_2H2H:further:greater-distance

Field: /content/grammarNotesEn; parent hash: b98d29471e3cb2a6fbea228832c12a464dc899e315863a770b9c62cf4a147878.

BEFORE: Adverb with movement or position; this draft concerns distance rather than an additional quantity.

AFTER (unapplied proposal): Used adverbially with movement; walk further along a route.

“This draft concerns distance rather than an additional quantity” ghi phạm vi Sense của bản thảo. Bản đề xuất thay bằng frame learner mô tả đúng ví dụ đi xa hơn dọc bờ.

## Full-batch grammar inspection

Every member of every original batch listed in the receipt was read and classified against its effective content revision. Candidate-level outcomes are preserved separately from total repeated batch-member inspections. Similarity and lexical heuristics do not establish copying, rights clearance, or identity.

## Handoff

REVIEW triage and the original dedicated grammar-candidate inventory are closed as AI audit inventories only. The Sense coverage audit remains PARTIAL with 183 groups pending. This does not close all grammar QA across the 1,563 Sense corpus.
Verification results record executed commands separately from deterministic assembly. Canonical pnpm is NOT_RUN unless the external receipt states otherwise.
STOP after scoped checkpoint-05 publication. No correction application, next checkpoint, new headword cohort, owner approval, rights clearance, canonical release, or database import.
