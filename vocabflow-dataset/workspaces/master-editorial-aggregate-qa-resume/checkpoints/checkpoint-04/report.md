# Phase 2H.2I-R3 — additive checkpoint 04

Status: PARTIAL at aggregate scope; bounded selection is complete. This is offline audit-only work. All effective records remain NONCANONICAL DRAFT.

Checkpoint 03: `d5e87509822821b74b0588a5d99f2168a5db47c59299192d540ace84315b0b71`. Checkpoint 02: `7d462d7bfb2f957c4c1809de18a22a126b8f85194763f90d863551edb15be34d`. Original aggregate: `3d29083983cf033b4463d33c7a8ea3bd9337c209e0a5f236167c116a0852b5ce`. Remote parent: `09e0c4b684f2f81028680d5a78ad5bd680224a7b`.

REVIEW: 105 + 40 = 145 / 187 triaged; 42 pending.
Coverage: 167 + 75 = 242 / 500 assessed; 258 pending. All 126 originally warned identities remain preserved; no exhaustive lexical coverage claim.
Grammar: 58 + 25 = 83 / 107 dedicated candidate identities inspected; 24 pending. 126 actual complete-batch members across 13 whole authored batches.
Grammar results: {
  "CONFIRMED_PROCESS_COMMENTARY": 38,
  "POSSIBLE_PROCESS_COMMENTARY": 3,
  "VALID_LEARNER_GRAMMAR_NOTE": 85
}; 35 new exact field proposals, none applied. The batch sample is purposive and supports no prevalence estimate.
Coverage findings: {
  "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP": 75
}. Confirmed gaps: 0; possible gaps: 0; source metadata conflicts: 0; boundary proposals: 0.
Proposal totals: 117 field and 7 boundary proposals. Prior 82 / 7 are retained through immutable parent references.

## New REVIEW findings

- `EDITORIAL_2H2H:rope:thick-strong-cord` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Bản dịch hiện tại truyền đạt mái trú làm bằng vải bạt và dây thừng dùng để cố định; overlay đã bỏ cấu trúc lặp “bằng”, phần còn lại hiểu được và không làm sai tình huống. Đây là đánh giá nội dung hiệu lực, không xóa REVIEW lịch sử. Next: Giữ overlay hiện tại; nếu biên tập tiếng Việt toàn batch sau này, có thể cân nhắc câu tự nhiên hơn nhưng chưa đủ căn cứ để coi là lỗi bắt buộc.
- `EDITORIAL_2H2H:yet:up-to-now` — HEURISTIC_SIGNAL_ONLY: Yet đứng cuối câu hỏi hiện tại hoàn thành và “đã … chưa” giữ đúng câu hỏi về việc xảy ra đến nay; conjunction ở ordinal khác không bị nhập vào nghĩa trạng từ. Tín hiệu polarity không phải mâu thuẫn thực. Next: Giữ hai ranh giới theo cấu trúc câu và không coi polarity heuristic là lỗi; historical triage vẫn được lưu.
- `EDITORIAL_2H2H:unemployed:without-a-job` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Definition hiệu lực “without a paid job” đã bỏ qualifier thống kê hẹp ở bản trước; tình huống đóng nhà máy và thời gian thất nghiệp khớp cả EN/VI. Next: Giữ overlay hiệu lực; không suy diễn định nghĩa thống kê chính thức hoặc trạng thái lao động pháp lý.
- `EDITORIAL_2H2H:exactly:with-full-precision` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: “Bằng nhau hoàn toàn” tự nhiên hơn và vẫn khẳng định hai tấm ván cùng chiều dài; overlay giải quyết đúng điểm dịch cũ mà không thay đổi mức độ chính xác. Next: Giữ overlay; duy trì tham chiếu REVIEW ban đầu thay vì chuyển lịch sử sang PASS.
- `EDITORIAL_2H2H:reportedly:according-to-reports` — SOURCE_ORIGINALITY_UNCERTAIN: Ví dụ statue được đặt trong private collection là tình huống khác painting thất lạc trong source; bản dịch theo nguồn tin giữ sắc thái chưa xác nhận. Bốn cửa sổ tám token tương đồng là dấu hiệu để đọc lại, không phải bằng chứng đạo văn hay clearance. Next: Lưu phạm vi similarity; nếu cần, người phụ trách rights/originality đối chiếu toàn passage và nguồn quyền sử dụng riêng.
- `EDITORIAL_2H2H:carriage:railway-passenger-car` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Sense toa tàu dùng train và carriage cuối chuyến; lỗi “nằm cạnh” trong historical note nói về vật trưng bày xe ngựa ở ordinal kế cận, không áp dụng cho bản ghi này. Next: Giữ distinct railway/horse vehicle identities; không sao chép correction lịch sử sang Sense toa tàu.
- `EDITORIAL_2H2H:carriage:horse-drawn-vehicle` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Bản dịch “được đặt cạnh ảnh” hiện phù hợp xe ngựa phục chế như vật trưng bày; overlay đã sửa chính xác động từ vị trí, không ảnh hưởng nghĩa carriage. Next: Giữ overlay và liên kết correction lịch sử với đúng horse-drawn Sense.
- `EDITORIAL_2H2H:bible:christian-scripture` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Bible được viết hoa trong ví dụ và note phân biệt collection “the Bible” với một bản sách “a Bible”; overlay sửa display form mà không thay normalized key. Next: Giữ casing có căn cứ; mọi canonical key/display identity vẫn chờ quy trình riêng.
- `EDITORIAL_2H2H:quite:moderately` — SOURCE_POS_CONFLICT: Oxford ordinal 0 là trạng từ chỉ mức khá và ví dụ spacious khớp; 4600 gắn POS adjective cho mục quite. Bản nháp giữ POS adverb có lý do theo cấu trúc, nhưng xung đột metadata giữa hai nguồn chưa phải phê duyệt canonical. Next: Giữ REVIEW và cờ bất đồng nguồn; yêu cầu quyết định metadata/identity có thẩm quyền trước canonical mapping.
- `EDITORIAL_2H2H:quite:completely` — SOURCE_POS_CONFLICT: Ordinal Oxford 1 dùng quite với agree theo mức hoàn toàn, đúng trạng từ; nguồn 4600 vẫn gắn adjective cho lemma. Ví dụ parcel/correct hợp nghĩa, nhưng không thể xem khác POS nguồn đã được owner duyệt. Next: Giữ bản DRAFT và ghi xung đột POS cho adjudication; không đổi POS theo một nguồn đơn lẻ.
- `EDITORIAL_2H2H:freight:transported-goods` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Grammar note hiện giải thích freight không đếm được, collocation freight train và đối lập hàng hóa/hành khách; câu canonical-identity cũ đã được overlay thay bằng nội dung học ngôn ngữ. Next: Giữ note hiệu lực và lưu finding cũ như đã được giải quyết qua overlay.
- `EDITORIAL_2H2H:double:two-part` — SENSE_BOUNDARY_UNCERTAIN: Ordinal Oxford 0 và nghĩa adjective hai phần tương đồng được thể hiện riêng; ví dụ double door không lẫn phép nhân. Câu hỏi còn lại là ranh giới determiner/pronoun/adverb trong inventory và cách hệ thống hóa POS, không phải lỗi dịch ở Sense này. Next: Giữ REVIEW cho taxonomy/identity review; không gộp Senses chỉ để ép khớp nhãn POS nguồn.
- `EDITORIAL_2H2H:double:twice-quantity-before-noun` — SENSE_BOUNDARY_UNCERTAIN: “Double the amount” có danh từ theo sau, đúng cấu trúc determiner và khác dùng độc lập ở sibling. Tất cả năm ordinal của Oxford được thể hiện, nhưng cách phân loại det/pronoun/adverb trong nguồn vẫn cần adjudication. Next: Giữ ranh giới theo cấu trúc ví dụ và chờ quyết định taxonomy trước canonical identity.
- `EDITORIAL_2H2H:double:twice-quantity-alone` — SENSE_BOUNDARY_UNCERTAIN: Double đứng thay cho lượng đã nêu trong hai hộp dụng cụ, minh họa cách dùng không có danh từ theo sau; bản dịch giữ phép nhân. Vấn đề còn lại là thuật ngữ pronoun và identity theo taxonomy, không phải thiếu nội dung ví dụ. Next: Bảo toàn bản nháp độc lập; yêu cầu quyết định POS/taxonomy có thẩm quyền trước canonical hóa.
- `EDITORIAL_2H2H:double:become-twice` — SENSE_BOUNDARY_UNCERTAIN: Động từ doubled its membership diễn đạt số thành viên tăng gấp đôi và grammar note nêu cả transitive/intransitive. Oxford có ordinal động từ riêng nên ranh giới nghĩa được hỗ trợ; chỉ taxonomy tổng quát của lemma còn trong REVIEW. Next: Giữ verb Sense riêng; không áp nhãn từ nguồn 4600 adjective cho cấu trúc động từ được chứng thực.
- `EDITORIAL_2H2H:double:pay-twice` — SENSE_BOUNDARY_UNCERTAIN: Pay double bổ nghĩa động từ, khác determiner trước noun và pronoun đứng thế lượng; ví dụ thời điểm tính phí làm nghĩa dễ nhận. Quyết định hệ thống POS/identity toàn lemma vẫn chưa được human review. Next: Duy trì phân biệt theo phân bố cú pháp; không coi AI review là duyệt canonical taxonomy.
- `EDITORIAL_2H2H:better:higher-quality` — SENSE_BOUNDARY_UNCERTAIN: Better as adjective đánh giá lựa chọn phù hợp hơn, có đối tượng so sánh rõ; Oxford adjective ordinal khớp. Không có cơ sở trong bản ghi này để tách count noun “a better”. Next: Giữ comparative adjective tách biệt với adverb và constructional noun; chuyển identity question chung sang owner review.
- `EDITORIAL_2H2H:better:more-effectively` — SENSE_BOUNDARY_UNCERTAIN: Better modifies worked và diễn đạt hiệu quả hơn; Oxford adverb ordinal corroborates. Definition và tiếng Việt nhất quán, nhưng đối chiếu identity toàn họ good/well vẫn thuộc owner. Next: Giữ adverb Sense theo cấu trúc; không nhập vào adjective chỉ vì cùng dạng comparative.
- `EDITORIAL_2H2H:better:improvement` — SENSE_BOUNDARY_UNCERTAIN: “A change for the better” là danh từ trừu tượng trong construction nguồn “expect better”, không được bản nháp khái quát thành danh từ đếm được thông thường. Meaning và ví dụ nêu giới hạn hữu ích nhưng identity với good/well cần người duyệt. Next: Giữ giới hạn construction và chờ owner quyết định phạm vi lemma/phrase trước canonical allocation.
- `EDITORIAL_2H2H:humid:moist-air` — HEURISTIC_SIGNAL_ONLY: Definition nói hơi nước trong không khí; example dịch “không khí … ẩm” sau mưa phù hợp, không nhầm bề mặt ướt. Note giữ đúng giới hạn nghĩa và cảnh báo heuristic polarity không xác định dịch sai. Next: Giữ nguyên Sense; không coi cờ polarity là defect khi ngữ cảnh đang mô tả độ ẩm.
- `EDITORIAL_2H2H:rust:iron-corrosion-material` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Rust là chất nâu đỏ trên sắt/thép; ví dụ bản lề hỗ trợ nghĩa vật liệu. Note hiện nói đúng countability và đối chiếu rusty/rusts hữu ích; câu về POS proposal trước đây không còn trong nội dung hiệu lực. Next: Giữ overlay learner-facing; để historical process finding ở audit log.
- `EDITORIAL_2H2H:youth:young-period-of-life` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Nghĩa thời kỳ sống và ví dụ in her youth khớp nhau; VI “thời trẻ” không gán giới tính. Đây là ordinal riêng với người trẻ và tập thể thanh niên. Next: Giữ ba boundary ở trạng thái draft riêng; không suy rộng một identity từ POS noun chung.
- `EDITORIAL_2H2H:youth:young-person` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Ordinal Oxford định nghĩa youth là boy/young man; EN và VI “một thanh niên” đã cùng thể hiện giới tính/ngữ nghĩa nguồn sau correction overlays. Next: Giữ overlay và không đổi bản dịch đã kiểm tra; identity/canonical choice vẫn độc lập.
- `EDITORIAL_2H2H:youth:young-people-collectively` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Local youth ở đây là nhóm người trẻ được mời thảo luận; bản dịch giới trẻ tự nhiên và khác nghĩa thời kỳ sống hoặc một người youth. Oxford ordinal chỉ collective/local youth nên hỗ trợ boundary hiện tại. Next: Giữ collective Sense; xử lý identity gộp/tách riêng bằng quyết định có thẩm quyền.
- `EDITORIAL_2H2H:idle:not-active` — HEURISTIC_SIGNAL_ONLY: Máy may idle vì chờ linh kiện là tạm không hoạt động, không phải lười; bản dịch và grammar note phân biệt thiết bị với đánh giá con người. Polarity flag không biểu thị lỗi. Next: Giữ ví dụ và xem heuristic như false positive đã giải thích, không xóa lịch sử máy.
- `EDITORIAL_2H2H:lot:quantity-before-noun` — SENSE_BOUNDARY_UNCERTAIN: Sense “a lot of/lots of” trước danh từ có ví dụ và subject-verb note phù hợp. Lemma key chuẩn hóa lot trong khi nội dung là multiword expression; việc có nên định danh phrase riêng chưa được quyết định. Next: Giữ nguyên proposal key/content DRAFT; owner xử lý lexical identity và phrase normalization trước canonical hóa.
- `EDITORIAL_2H2H:lot:quantity-without-noun` — SENSE_BOUNDARY_UNCERTAIN: A lot đứng thay danh từ đã rõ trong ngữ cảnh, ví dụ some seedlings … a lot died làm rõ pronominal use. Nội dung hữu ích nhưng normalized key lot không tự cấp identity cho cụm a lot. Next: Giữ cấu trúc hiện tại và chuyển câu hỏi phrase/lemma sang identity review.
- `EDITORIAL_2H2H:lot:degree-or-frequency` — SENSE_BOUNDARY_UNCERTAIN: A lot theo sau động từ biểu thị mức độ/tần suất, ví dụ đạp xe thường xuyên, đúng ordinal adverb. Đây vẫn là cụm hai từ; không khẳng định nó là một canonical sense riêng của token lot. Next: Giữ nội dung draft, chờ quyết định phrase identity và không gộp adverb với quantity determiner.
- `EDITORIAL_2H2H:offense:punishable-act` — SOURCE_ORIGINALITY_UNCERTAIN: Tình huống trường học hư cấu đổi thiết bị/khung cảnh so với ví dụ 4600 ăn cắp xe; nội dung pháp lý được giới hạn ở luật hoặc quy tắc. Một cửa sổ VI tương đồng tám token cần lưu kiểm tra, không đủ kết luận copy. Next: Nếu rights/originality review yêu cầu, so sánh cả passage và xác nhận quyền riêng; không xóa ví dụ chỉ dựa trên heuristic.
- `EDITORIAL_2H2H:offense:hurt-or-insult` — SOURCE_ORIGINALITY_UNCERTAIN: Ví dụ joke gây phật lòng khác tình huống ăn cắp xe ở nguồn và tách rõ nghĩa cảm xúc với hành vi phạm luật. Một shared window tiếng Việt là tín hiệu nhẹ, không chứng minh trùng lặp. Next: Giữ historical similarity flag và chuyển rights/originality sang review riêng nếu cần.
- `EDITORIAL_2H2H:all:whole-quantity-before-noun` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Determiner all đứng trước blue folders và bao phủ các thành viên; hiện không dùng câu all dry mơ hồ vốn thuộc adverb sibling. Bản ghi này không cần overlay lịch sử của Sense khác. Next: Giữ bản determiner; ghi nhận historical finding về câu khăn không áp vào identity này.
- `EDITORIAL_2H2H:all:whole-quantity-standing-alone` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: All thay nhóm ghế đã biết, theo sau là plural agreement are; đây là pronoun use tự nhiên. Ambiguity của all dry ở lịch sử nhắm adverb ordinal chứ không phải bản ghi này. Next: Giữ ví dụ và không chuyển correction sibling lên pronoun Sense.
- `EDITORIAL_2H2H:all:complete-degree` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Câu singular “the towel was all dry” và “khô hoàn toàn” giờ diễn đạt degree, không phải “mọi chiếc khăn”; hai overlay CP05 giải quyết điểm mơ hồ lịch sử. Next: Giữ corrections CP05 theo đúng thứ tự và không đổi những artifact trước.
- `EDITORIAL_2H2H:intrigue:arouse-curiosity` — HEURISTIC_SIGNAL_ONLY: Lá thư không chữ ký làm researcher tò mò, đúng transitive intrigue someone; VI không thêm ý âm mưu hay sợ hãi. Polarity flag là heuristic không phù hợp sắc thái câu cụ thể. Next: Giữ ví dụ trung tính và lịch sử false-positive được giải thích.
- `EDITORIAL_2H2H:stubborn:refusing-to-change` — HEURISTIC_SIGNAL_ONLY: Người tổ chức kiên quyết không đổi quyết định, đúng adjective về ý kiến/hành động; bản dịch giữ mức phê bình nhưng không tự thêm nghĩa vết bẩn. Cờ polarity không chỉ ra đảo nghĩa. Next: Giữ example cùng phân biệt với nghĩa vật thể; không cần correction proposal.
- `EDITORIAL_2H2H:ton:large-weight-unit` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Definition thừa nhận các hệ đo cho ton khác nhau, example nói rõ hồ sơ không nêu hệ thống; note phân biệt short ton, long ton và tonne khi cần độ chính xác. Không có phép quy đổi bị bịa. Next: Giữ cảnh báo không xác định đơn vị; đơn vị cụ thể chỉ bổ sung khi source/owner có evidence.
- `EDITORIAL_2H2H:wicked:morally-bad` — SENSE_BOUNDARY_UNCERTAIN: Bản nháp chỉ bao quát nghĩa đạo đức xấu theo source; câu chuyện hư cấu minh họa cruel, không khẳng định colloquial “excellent” hay nghĩa khác. Một record đúng không chứng minh lemma đã exhaustive. Next: Giữ scope DRAFT này; giao coverage tổng thể cho audit của group và không tự tạo thêm Sense ngoài selection.
- `EDITORIAL_2H2H:around:in-the-vicinity` — HEURISTIC_SIGNAL_ONLY: Around đứng không có noun complement và hỏi cửa hàng gần đây, khớp Oxford adverb ordinal; ordinal preposition đi với lake riêng. Cờ polarity không phản ánh lỗi nội dung. Next: Giữ hai cấu trúc quanh/vicinity riêng trong DRAFT; không dùng heuristic thay phân tích bổ ngữ.
- `EDITORIAL_2H2H:harness:put-energy-to-use` — SENSE_BOUNDARY_UNCERTAIN: Harness energy phù hợp định nghĩa kiểm soát/khai thác nguồn lực và ví dụ thiết bị dùng ánh nắng; source 4600 còn nêu to harness a horse, một boundary verb khác. Audit này chỉ review record đã chọn nên chưa kết luận coverage group đầy đủ. Next: Giữ Sense năng lượng; kiểm kê các nghĩa source khác trong coverage review có thẩm quyền trước khi quyết định có Sense riêng.
- `EDITORIAL_2H2H:fond:feeling-affection-or-liking` — SOURCE_POS_CONFLICT: Oxford gắn adjective cho fond of music/puzzles; 4600 raw POS “verb” nhưng chính definition “be fond of” là cấu trúc adjective. Ví dụ tomatoes và grammar note đúng adjective, xung đột nhãn nguồn không tạo verb Sense. Next: Giữ adjective DRAFT cùng bằng chứng hai nguồn; yêu cầu giải quyết metadata trước canonical POS.

## New coverage findings

- `NORMALIZED_HEADWORD:matter` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The three effective Senses cover Oxford ordinal 0 issue/topic, ordinal 1 matter as important (verb), and ordinal 2 physical substance. 4600 evidence corroborates the material noun; countability and POS distinctions are explicit.
- `NORMALIZED_HEADWORD:melody` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One countable noun Sense matches the Oxford tune and the 4600 series-of-notes definition. The example contrasts melody with accompaniment; the local evidence gives no supported second boundary.
- `NORMALIZED_HEADWORD:mental` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adjective and puzzle-effort example align with both Oxford ordinal usage and 4600 mind-related evidence. No additional POS or source-supported Sense is shown.
- `NORMALIZED_HEADWORD:optimistic` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The sole adjective Sense covers expectation of a good outcome and matches both sources; about-complement is shown. It does not overstate a guaranteed result.
- `NORMALIZED_HEADWORD:over` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: All three effective records map in order to Oxford above, across/over an obstacle, and visit-nearby adverb. Complements and movement/visit contexts keep boundaries distinct.
- `NORMALIZED_HEADWORD:overwhelm` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Three transitive verb Senses correspond to source emotional impact, exceeding capacity, and competitive defeat. Their objects/examples separate the boundaries without unsupported extra POS.
- `NORMALIZED_HEADWORD:palace` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The one countable building Sense matches the royal residence source and tourist example. The inspected evidence does not support another distinct local meaning.
- `NORMALIZED_HEADWORD:participation` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The uncountable activity noun aligns with Oxford and 4600 taking-part evidence; participation by/in distinctions explain arguments rather than adding a Sense.
- `NORMALIZED_HEADWORD:prepare` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The transitive make-ready Sense is supported by both examples and source. The note also records intransitive prepare for/to patterns, so no unsupported POS expansion is needed.
- `NORMALIZED_HEADWORD:protection` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One uncountable safety/protection noun matches Oxford and examples; from/against patterns explain the relation to harm. Local evidence does not show a missing boundary.
- `NORMALIZED_HEADWORD:recycle` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: A transitive process-again verb maps to both Oxford examples and the 4600 reuse-as-material definition. No additional source-supported sense appears in these records.
- `NORMALIZED_HEADWORD:reform` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The noun for a policy/system change and verb for changing a system map to Oxford ordinals 0/1; countability distinguishes a particular reform from reform generally.
- `NORMALIZED_HEADWORD:responsibility` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Both effective noun Senses distinguish being accountable for an action from a duty assigned to someone. Oxford examples and 4600 duty evidence support those related uses.
- `NORMALIZED_HEADWORD:river` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The single countable watercourse noun matches the Oxford bridge/depth uses. The ordinary evidence reviewed here supplies no separate source-supported sense.
- `NORMALIZED_HEADWORD:sailor` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The one person noun includes both ship-crew and skilled sailing roles, consistent with Oxford and bilingual example. They are not evidenced as separate boundaries in the local source grouping.
- `NORMALIZED_HEADWORD:satisfied` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adjective Sense expresses contentment when expectations are met; source examples and satisfied with construction agree. No source-supported alternate POS is present.
- `NORMALIZED_HEADWORD:shelter` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The noun place and transitive verb protect are separately represented, matching the two Oxford POS groups; 4600 supports the place. Grammar notes distinguish protection generally from a shelter.
- `NORMALIZED_HEADWORD:shore` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The land-edge noun covers sea/lake usage in both sources; example is natural and no separate POS or supported meaning boundary is missing.
- `NORMALIZED_HEADWORD:so-called` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The attributive adjective introduces a label and records possible doubt without asserting that every use is sarcastic. Oxford and 4600 examples support this pragmatic scope.
- `NORMALIZED_HEADWORD:society` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The two noun Senses separate society as a community/system from a named interest organization, matching Oxford ordinals 0/1. Countability and contexts are clear.
- `NORMALIZED_HEADWORD:soup` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The one food noun Sense fits Oxford examples. The draft notes food use vs countable variety/serving; the local source does not show another POS.
- `NORMALIZED_HEADWORD:speech` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The address and ability/expression Senses map to Oxford ordinals 0/1; the uncountable note separates ordinary speaking from an audience address.
- `NORMALIZED_HEADWORD:suffer` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adverse harm/worsening verb and experiencing pain/distress verb correspond to Oxford ordinals 1/0 respectively. Example subjects and arguments make their distinction understandable.
- `NORMALIZED_HEADWORD:surprised` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One adjective covers the feeling triggered by an unexpected event and is supported by both source sets. Its at/by/to/that patterns are usage variants, not separate local meanings.
- `NORMALIZED_HEADWORD:testing` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The uncountable process noun for checking function/requirements matches Oxford and 4600 activity evidence. No separate countable result or test item is evidenced in this group.
- `NORMALIZED_HEADWORD:theatre` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The building and performing-art Senses map to Oxford ordinals 0/1. Countability and theatre studies distinguish venue from art form; British spelling is retained.
- `NORMALIZED_HEADWORD:united` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One adjective expresses joining/agreement toward a shared aim; Oxford examples agree. Source evidence gives no additional POS or distinct boundary here.
- `NORMALIZED_HEADWORD:vary` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two verb records separate differences occurring across cases from deliberately changing something; Oxford and 4600 support the inflection/argument contrast.
- `NORMALIZED_HEADWORD:warehouse` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The countable storage-building noun matches both sources. The definition gives goods/storage purpose without making the example or role a new Sense.
- `NORMALIZED_HEADWORD:waste` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Four records cover Oxford ordinals for discarded material (noun), poor use (noun), use carelessly (verb), and discarded-material adjective. The local example under poor-use noun has a confirmed Vietnamese sentence-start omission; proposal is separate from coverage and unapplied.
- `NORMALIZED_HEADWORD:weekly` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One adjective means happening once each week; source and example support it. The note explicitly avoids reclassifying this record as the adverb.
- `NORMALIZED_HEADWORD:weight` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One noun meaning heaviness/measured property matches both source definitions. Its parcel example is concrete and no other POS appears in the local evidence.
- `NORMALIZED_HEADWORD:well-being` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One abstract noun meaning general health/welfare fits Oxford and 4600 evidence. The note appropriately avoids turning a possible benefit into a medical guarantee.
- `NORMALIZED_HEADWORD:whereby` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One formal linking adverb/relative connector means by which; Oxford and 4600 examples support a system/scheme plus clause pattern. No further source meaning is indicated.
- `NORMALIZED_HEADWORD:white` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Adjective colour and noun colour are separate and align to Oxford ordinals 0/1. Definitions/examples avoid importing unrelated human-category meanings.
- `NORMALIZED_HEADWORD:widely` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adverb describing broad distribution/usage matches Oxford examples. “Widely” is explicitly not claimed to mean universally or in every country.
- `NORMALIZED_HEADWORD:willing` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adjective and willing to-infinitive pattern fit Oxford source. The draft separates choice/readiness from ability, which avoids an unsupported entailment.
- `NORMALIZED_HEADWORD:willingness` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The uncountable noun is supported by Oxford and 4600; to plus infinitive is illustrated. No separate POS or boundary is present in local evidence.
- `NORMALIZED_HEADWORD:wish` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The verb desire, noun desire, and plural goodwill-message Senses correspond to Oxford ordinals 0–2. Examples distinguish wishing a situation from sending best wishes.
- `NORMALIZED_HEADWORD:withdraw` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Three verb Senses map to Oxford withdrawal of money, leaving/withdrawing, and taking back a claim/request; examples and transitivity keep these distinct.
- `NORMALIZED_HEADWORD:witness` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The person noun and transitive seeing-event verb correspond to Oxford ordinals 0/1. The note distinguishes witness an event from be a witness to it.
- `NORMALIZED_HEADWORD:wolf` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One countable wild-animal noun matches Oxford examples. The note frames group hunting as a tendency, not a universal biological claim.
- `NORMALIZED_HEADWORD:tongue` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The body part and language Senses cover Oxford ordinals 0/1. The example and note separate native/mother tongue from the mouth organ.
- `NORMALIZED_HEADWORD:web` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Spider structure and online web are separate noun records matching Oxford ordinals 0/1; 4600 supports the spider sense. No unrelated network meaning is inferred.
- `NORMALIZED_HEADWORD:motorcycle` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One countable two-wheel powered road vehicle noun agrees with Oxford evidence; ride is the ordinary example construction. Local evidence does not support another boundary.
- `NORMALIZED_HEADWORD:pleasant` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One adjective describes an enjoyable/comfortable stimulus; the breeze example and sources agree. The note keeps the experience/stimulus distinction clear.
- `NORMALIZED_HEADWORD:site` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The physical location and website noun Senses map to Oxford ordinals 0/1; the factory-land and online-charity examples disambiguate use.
- `NORMALIZED_HEADWORD:worldwide` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adjective before noun and adverb after/with a verb cover Oxford ordinals 0/1. Neither example nor note implies literal coverage of every person/country.
- `NORMALIZED_HEADWORD:crowd` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One countable gathered-people noun aligns with Oxford and 4600 definitions. The example illustrates location/event rather than adding an abstract usage.
- `NORMALIZED_HEADWORD:music` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One normally uncountable sound-art noun matches Oxford and 4600. Piece of music is a useful countable construction; local sources show no distinct extra meaning.
- `NORMALIZED_HEADWORD:september` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The month noun matches Oxford dates and has an overlay for capitalized September. In/on usage note is a usage distinction, not another sense.
- `NORMALIZED_HEADWORD:whenever` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two conjunction records distinguish any chosen/available time from repeated every-time conditions; Oxford examples support both clause relations.
- `NORMALIZED_HEADWORD:engineering` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The uncountable technical field/work noun is supported by Oxford and example; engineering project is correctly treated as application, not mass noun countability.
- `NORMALIZED_HEADWORD:nod` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two verbs cover nodding to signal agreement/recognition and a sleepy head drop, corresponding to Oxford ordinals 0/1; the examples distinguish intent/context.
- `NORMALIZED_HEADWORD:width` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One noun means side-to-side measurement and matches Oxford and 4600. Measurement phrases do not require a separate meaning.
- `NORMALIZED_HEADWORD:alarm` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Warning device/sound noun, fear noun, and worry-causing verb map to Oxford ordinals 0/2/1. Examples and POS separate related senses.
- `NORMALIZED_HEADWORD:forth` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two adverb uses cover the fixed phrase and so forth and the more formal outward/emergent direction; both Oxford ordinals are represented, with phrase limitation stated.
- `NORMALIZED_HEADWORD:increase` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Verb and noun Senses map to Oxford ordinal 0/1; increase by/to note distinguishes amount of change from final level.
- `NORMALIZED_HEADWORD:return` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two verb Senses and one noun cover Oxford ordinals 0–2: going back, giving back, and the act of coming back. Complement/object patterns make them distinct.
- `NORMALIZED_HEADWORD:trace` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Four Senses cover Oxford verb tracking, noun sign, noun tiny amount, and verb copying an outline; local meanings, examples and POS align to ordinals 0–3.
- `NORMALIZED_HEADWORD:warming` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The noun process Sense is source-supported for ocean/global warming and ordinary temperature increase; the example is not limited to climate change.
- `NORMALIZED_HEADWORD:driver` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The countable vehicle-operator noun matches Oxford; passengers and helpers are distinguished in definition. No source-supported extra POS appears.
- `NORMALIZED_HEADWORD:radio` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Draft distinguishes the broadcast medium from the receiving device; Oxford’s radio grouping/example supports ordinary radio usage but does not uniquely settle a canonical split. Treat the current local distinction as plausible editorial organization, not an approved identity boundary.
- `NORMALIZED_HEADWORD:self` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The noun sense of personal identity is supported by Oxford true/old self examples. The note correctly distinguishes this noun from reflexive pronouns.
- `NORMALIZED_HEADWORD:wooden` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The material adjective matches Oxford and 4600; note flags a figurative stiff/unexpressive use as outside this assessed record. No supported conflict found in evidence shown.
- `NORMALIZED_HEADWORD:councillor` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The local-government member noun matches both sources; British/American spelling and counsellor contrast are accurate usage notes.
- `NORMALIZED_HEADWORD:evaluate` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The transitive assess/judge verb is supported by Oxford and 4600. Example and definition concern assessing quality/effectiveness rather than merely assigning a numerical score.
- `NORMALIZED_HEADWORD:leading` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adjective means among the important/influential in a field; source supports it. Note correctly avoids literal front position or claiming sole leadership.
- `NORMALIZED_HEADWORD:observation` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two noun records distinguish careful watching from a comment noticed/made, corresponding to Oxford ordinals 0/1. The paired examples show the semantic contrast.
- `NORMALIZED_HEADWORD:thirteen` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The number item is the value after twelve and source examples use plural noun agreement; no additional lexical POS is indicated.
- `NORMALIZED_HEADWORD:write` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One verb covers forming text through writing/typing, matching Oxford and 4600. To-recipient pattern is usage information, not an omitted meaning.
- `NORMALIZED_HEADWORD:accident` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two countable noun senses distinguish unintended chance from harmful/unwanted event, corresponding to Oxford ordinals 1/0. “By accident” is correctly kept separate as a phrase.
- `NORMALIZED_HEADWORD:federal` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: The adjective ties the central authority to constituent states and is supported by Oxford/4600. Fictional-country example avoids implying a particular country’s constitutional facts.
- `NORMALIZED_HEADWORD:rugby` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: One sport noun matches the source; the note distinguishes it from American football without claiming a different rugby code.
- `NORMALIZED_HEADWORD:sensitive` — NO_IDENTIFIED_SOURCE_SUPPORTED_GAP: Two adjective senses separate emotional response from responsiveness to a stimulus; Oxford ordinals 0/1, 4600 person/thing usage, and examples support both. “Personal information” is mentioned in source but is a contextual application, not evidence here for another independent sense.

## Field proposals — unapplied

### 2H2I-R3-P001: EDITORIAL_2H2H:waste:poor-use

BEFORE: In cùng một tài liệu hai lần là sự lãng phí giấy.

AFTER: Việc in cùng một tài liệu hai lần là sự lãng phí giấy.

Bản hiện tại bắt đầu bằng động từ “In cùng một tài liệu hai lần” nhưng thiếu chủ thể/danh từ hóa, làm câu không tự nhiên. “Việc in…” tạo chủ đề rõ, giữ nguyên nội dung lãng phí giấy và không thay nghĩa English.

### 2H2I-R3-P002: EDITORIAL_2H2C:fluid:flowing-substance

BEFORE: Liquids are a subset; source liquid/fluid groups provisionally coalesced; scientific review pending.

AFTER: Liquids are one kind of fluid; gases are fluids too. Fluid can be countable when it means a type or amount of substance.

The final clause records a provisional merger and pending scientific review, which is workflow/taxonomy state rather than learner grammar. English definition, countable/plural example and Oxford two-noun-sense evidence do not need that clause.

### 2H2I-R3-P003: EDITORIAL_2H2C:fluid:changing

BEFORE: Predicative adjective; 4600 POS evidence; does not mean literally liquid.

AFTER: Predicative or attributive: the timetable is fluid; a fluid plan can still change.

“4600 POS evidence” exposes provenance and the fluid label is not a usage rule. The schedule example supports an adjective describing a situation that can change.

### 2H2I-R3-P004: EDITORIAL_2H2C:exact:precise

BEFORE: exact time/amount; Master lemma overlap needs independent identity review.

AFTER: Before a noun: the exact time or amount. Exact emphasizes full precision rather than an estimate.

The Master-overlap and identity-review sentence documents curation, not the adjective’s grammar. Oxford and 4600 both support exact meaning precise/correct.

### 2H2I-R3-P005: EDITORIAL_2H2C:happy:pleased-feeling

BEFORE: Source joyful/satisfied groups provisionally coalesced; happy with/about.

AFTER: Happy with or about something expresses satisfaction; happy to see someone can express pleasure.

“Source groups provisionally coalesced; owner may split” is an unresolved editorial boundary, not a learner-facing usage note. Happy with the painting provides a clear satisfaction construction.

### 2H2I-R3-P006: EDITORIAL_2H2C:far:at-distance

BEFORE: Distance adverb; not far + comparative intensification here.

AFTER: Far can follow movement verbs or appear in far from a place: travel far; live far from town.

The phrase “here” evaluates the current proposal and the note incorrectly labels the example’s “not walk far” as comparative intensification. The draft example is a distance adverb, so replace the process-like, mismatched text with a usable pattern.

### 2H2I-R3-P007: EDITORIAL_2H2C:go:travel-leave

BEFORE: go, went, gone; source go/leave coalesced for review; go to + destination.

AFTER: Go to + destination; go can also mean leave. Irregular forms: go, went, gone.

“Source go/leave coalesced for review” is unresolved source-boundary workflow. Destination and irregular-form guidance are useful, while Oxford lists both go-to-a-place and leave uses.

### 2H2I-R3-P008: EDITORIAL_2H2C:creature:living-being

BEFORE: Countable; compare pinned Master meaning without asserting Sense identity.

AFTER: Countable; creature is useful when the exact kind of animal or living being is not named.

“Compare pinned Master meaning without asserting Sense identity” refers to an internal reference and approval boundary, not English grammar. Countability is learner-relevant, and the source permits animals or people.

### 2H2I-R3-P009: EDITORIAL_2H2C:can:ability

BEFORE: Modal can + bare infinitive; no third-person s; VERB is schema-compatible proposal.

AFTER: Can is followed by the base verb: can swim. It has no third-person -s form.

“VERB is schema-compatible proposal” is a data-model comment. The remaining modal rule is useful, but the current note should describe the non-inflected form directly.

### 2H2I-R3-P010: EDITORIAL_2H2C:desk:work-table

BEFORE: Countable; history-linked runtime identity remains preserved, no mapping.

AFTER: Countable: a desk, two desks. Work at a desk; put something on a desk.

“History-linked runtime identity remains preserved, no mapping” describes technical mapping and history, not grammar. The draft definition and lamp example support ordinary countable noun usage.

### 2H2I-R3-P011: EDITORIAL_2H2C:low:small-height-level

BEFORE: Comparative lower; physical example anchors a broader scalar proposal; exact boundaries pending.

AFTER: Before a noun or after a linking verb: a low wall; the wall is low. Lower is the comparative form.

“Scalar proposal; exact boundaries pending” explicitly marks an unresolved editorial proposal. It gives no learner guidance despite the adjective’s usable physical-height example.

### 2H2I-R3-P012: EDITORIAL_2H2C:leg:furniture-support

BEFORE: Countable; leg of a chair/table; identity metaphor needs owner review.

AFTER: Countable: a leg of a chair or table. One leg of the stool was shorter than the others.

“Identity metaphor needs owner review” is an internal decision/status note. The example shows ordinary countable leg of furniture construction.

### 2H2I-R3-P013: EDITORIAL_2H2B:abuse:insults-noun

BEFORE: verbal abuse; no offensive quotation is needed for teaching.

AFTER: Usually uncountable in verbal abuse; verbal abuse is directed at a person.

“No offensive quotation is needed for teaching” is an authoring instruction, not a grammar rule. A learner-facing note can instead show the supported verbal abuse construction without quoting insults.

### 2H2I-R3-P014: EDITORIAL_2H2B:accessory:extra-item

BEFORE: Countable; legal accessory use is not proposed from this evidence.

AFTER: Countable: an accessory for a camera or outfit; plural accessories.

“Legal accessory use is not proposed from this evidence” is a scope/proposal status note. The product accessory example supports countable use and with/for constructions.

### 2H2I-R3-P015: EDITORIAL_2H2B:accommodation:place-to-stay

BEFORE: Usually uncountable in British English; review American plural usage separately.

AFTER: Usually uncountable in British English: student accommodation or accommodation for visitors.

“Review American plural usage separately” is an unfinished audit task, not learner guidance. The selected evidence supports accommodation as a place/arrangement, commonly uncountable in the example.

### 2H2I-R3-P016: EDITORIAL_2H2B:ache:continuous-pain

BEFORE: Intransitive; a body part aches. Noun use requires a separate proposal if later supported.

AFTER: Usually intransitive: a body part aches; my shoulders ached after exercise.

“Noun use requires a separate proposal if later supported” describes proposal workflow and distracts from the inspected verb. The example shows an intransitive body-part subject and past form.

### 2H2I-R3-P017: EDITORIAL_2H2C:embassy:diplomatic-office

BEFORE: Countable institution/building use combined; no visa or legal advice.

AFTER: Countable; embassy can refer to a country’s diplomatic office or the building where it operates.

“Institution/building use combined; no visa or legal advice” states editorial grouping and a service disclaimer. The definition/example support the organization and its premises as countable uses.

### 2H2I-R3-P018: EDITORIAL_2H2C:goodbye:parting-word

BEFORE: Direct parting expression; exclamation source maps provisionally to INTERJECTION.

AFTER: Used alone or before a name when parting: Goodbye! Goodbye, Linh.

“Exclamation source maps provisionally to INTERJECTION” is an unresolved POS mapping note, not usage. The current example is a direct farewell expression.

### 2H2I-R3-P019: EDITORIAL_2H2C:goodbye:parting-event

BEFORE: Countable goodbye/goodbyes; grammatical representation may coalesce with interjection.

AFTER: Countable: say goodbye or say your goodbyes when parting from someone.

“Grammatical representation may coalesce with interjection” is an unresolved taxonomy decision. The noun example and plural form can be described directly.

### 2H2I-R3-P020: EDITORIAL_2H2C:resident:living-in-place

BEFORE: Attributive resident population; grammatical boundary with noun pending.

AFTER: Usually before a noun: a resident population or resident artist.

“Grammatical boundary with noun pending” records an unresolved taxonomy decision. The example supports the attributive adjective resident population.

### 2H2I-R3-P021: EDITORIAL_2H2C:peer:equal-status

BEFORE: Age/status source groups coalesced provisionally; not British noble-title use.

AFTER: A peer may be similar in age or equal in rank; peers at school or professional peers.

“Source groups provisionally coalesced” is editorial boundary status, and the noble-title exclusion is not grammar for this peer sense. The example supports plural peer with a possessive relation.

### 2H2I-R3-P022: EDITORIAL_2H2C:neither:not-one-of-two-determiner

BEFORE: neither + singular noun; representation relation to pronoun unresolved.

AFTER: Neither comes before a singular noun: neither key fits. Neither ... nor links two alternatives.

“Representation relation to pronoun unresolved” is an internal POS-boundary status. The example directly supports determiner neither before a singular noun.

### 2H2I-R3-P023: EDITORIAL_2H2C:neither:not-one-of-two-pronoun

BEFORE: Pronoun neither; neither of + plural phrase has variable agreement in actual usage, no fabricated final convention.

AFTER: Neither can stand alone or be followed by of + a plural noun phrase; agreement varies in actual usage.

“No fabricated final convention” is audit commentary. Keep the useful observation about agreement but express the actual construction as a usage note.

### 2H2I-R3-P024: EDITORIAL_2H2C:teacher:educator

BEFORE: Countable; preserved history-linked runtime identity, no automatic reuse.

AFTER: Countable: a teacher teaches a subject, skill or class; plural teachers.

“Preserved history-linked runtime identity, no automatic reuse” describes system identity reuse, not grammar. The example shows countable teacher and a complement describing a class.

### 2H2I-R3-P025: EDITORIAL_2H2C:small:little-amount

BEFORE: Scalar amount/chance; provisional distinction from physical size.

AFTER: Before a noun naming amount or degree: a small amount, a small chance. A small chance means low probability.

“Provisional distinction from physical size” discloses an unsettled editorial boundary. The small chance example and Oxford ordinal support amount/probability use.

### 2H2I-R3-P026: EDITORIAL_2H2C:substantially:considerably

BEFORE: Adverb modifies reduced; source ADJECTIVE conflict needs correction review, no adjective proposed.

AFTER: Substantially modifies verbs and comparatives: substantially reduce costs; substantially better.

“Source ADJECTIVE conflict needs correction review, no adjective proposed” is unresolved source-taxonomy/proposal commentary. Oxford/4600 examples and the adverb position support degree modification.

### 2H2I-R3-P027: EDITORIAL_2H2C:whereas:contrast

BEFORE: Joins clauses; contrast rather than simultaneous-time while in this proposal.

AFTER: Whereas joins contrasting clauses: the front room is sunny, whereas the back room is cool.

“In this proposal” points to editorial status rather than learner usage. The contrast between the two clauses is useful and is supported by both sources.

### 2H2I-R3-P028: EDITORIAL_2H2C:wound:physical-injury

BEFORE: Countable; noun pronounced /wu:nd/, not the past tense of wind; no care instructions.

AFTER: Countable noun: a wound, two wounds. Wound is pronounced /wuːnd/, unlike the past tense of wind.

“No care instructions” is editorial safety scope, not grammar. The countable noun and pronunciation contrast can be stated without that disclaimer.

### 2H2I-R3-P029: EDITORIAL_2H2C:wound:hurt-feelings

BEFORE: Figurative transitive use; distinct from physical injury; no mental-health diagnosis.

AFTER: Figurative and transitive: a remark can wound someone’s pride or feelings.

“No mental-health diagnosis” is a disclaimer rather than a grammar rule. The example supports figurative transitive use with an emotional object.

### 2H2I-R3-P030: EDITORIAL_2H2C:whisper:soft-voice

BEFORE: Countable; voice/utterance provisionally combined.

AFTER: Countable for an utterance (a whisper); uncountable when referring to a very soft voice.

“Voice/utterance provisionally combined” records an unresolved editorial boundary. The noun can instead teach countability across the two ordinary constructions.

### 2H2I-R3-P031: EDITORIAL_2H2C:wild:not-cultivated

BEFORE: Plant use; animal/plant source groups may coalesce under non-domesticated meaning.

AFTER: Before a noun or after grow: wild flowers; flowers grow wild when they are not cultivated.

“Animal/plant source groups may coalesce” is a pending source-boundary decision. The flower example supports the plant-specific adjective use directly.

### 2H2I-R3-P032: EDITORIAL_2H2D:second:ordinal

BEFORE: Ordinal numeral functioning before noun; NUMBER framework unresolved.

AFTER: Ordinal determiner before a noun: the second exit. Second follows first in an ordered series.

“NUMBER framework unresolved” reports schema taxonomy rather than ordinal grammar. The example identifies a second item before its noun.

### 2H2I-R3-P033: EDITORIAL_2H2D:seven:number

BEFORE: Cardinal numeral; source NUMBER not available in proposal POS enum.

AFTER: Cardinal number before a plural noun: seven chairs; the noun is plural after seven.

“Source NUMBER not available in proposal POS enum” is a data-schema limitation, not grammar. The plural-noun example supports cardinal number use.

### 2H2I-R3-P034: EDITORIAL_2H2D:wholesale:trade

BEFORE: Noun proposal; source construction also supports adjective use requiring review.

AFTER: Usually uncountable when naming the trade: work in wholesale; wholesale trade contrasts with retail.

“Noun proposal; source construction also supports adjective use requiring review” reports unresolved POS adjudication. The exact note gives no noun usage; current example contrasts wholesale with retail as a trade.

### 2H2I-R3-P035: EDITORIAL_2H2D:avail:benefit

BEFORE: Fixed phrase to no avail; source in no avail is defective.

AFTER: Usually in the fixed phrase to no avail, meaning that an effort produces no useful result.

“Source in no avail is defective” evaluates source quality rather than teaching current usage. The example correctly uses the fixed phrase to no avail.

## Cumulative remediation priorities

{
  "P0": 0,
  "P1": 7,
  "P2": 65,
  "P3": 139
}
Historical items remain linked through the original aggregate, checkpoint 02 and checkpoint 03 queue references. Rights and identity blockers remain unresolved independently of AI linguistic review.

## Reusable authoring QA lesson

- Keep provenance, source ordinal, canonical identity, owner approval, taxonomy and proposal status in provenance/QA fields, not learner-facing grammar notes.
- Use grammar notes to explain a real English construction or usage distinction; verify the grammar claim against the effective definition, POS and examples.
- Preserve clear, natural Vietnamese meanings and example translations; inspect paired EN/VI fields together.
- Review source-supported Sense boundaries before adding meanings; an ordinal or keyword is evidence, not automatic identity approval.
- Compare source similarity as a review signal, inspect actual passages and record scope; neither a match nor a heuristic alone proves copying or clears rights.

## Handoff

Pending identities remain PENDING in cumulative review, coverage and grammar inventories; use those exact keys and hashes for any separately authorized continuation.
Verification results list actual command exits separately from the deterministic assembler. Canonical pnpm is NOT_RUN unless the external receipt states otherwise.
Rights UNKNOWN_REVIEW_REQUIRED; owner approvals 0; canonical IDs 0; correction applications 0; database access/writes NONE; Development and Production untouched; Master release and legacy unchanged. Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses.
STOP after checkpoint 04 publication. No checkpoint 05, correction application, authoring cohort, canonical approval, rights clearance, or database import.
