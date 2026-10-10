#!/usr/bin/env python3
"""Offline Phase 2H.2J-R4 DRAFT remediation checkpoint."""

import argparse
import copy
import hashlib
import json
import subprocess
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PARENT_WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-03"
WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-04"
PARENT_FINGERPRINT = "1da5da50c648995491f16523ca0d3da3d8965c59e4d30dd8ebfab72ddd381eb1"
PARENT_COMMIT = "0e3a1d65231bffd2886cd6dba1d20ad756f37e65"
PILOT = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-pilot"
INVENTORY_PATH = PARENT_WS / "candidate-inventory.json"
PROJECTION_PATH = PARENT_WS / "cumulative-remediated-effective-draft-projection.json"
MAPPING_PATH = PARENT_WS / "cumulative-content-hash-mapping.json"
ORIGINAL_PROJECTION = ROOT / "vocabflow-dataset/workspaces/master-editorial-aggregate-qa/effective-sense-index.json"
PILOT_WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/pilot-01"
BATCH02_WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-02"
MAX_CANDIDATES = 35
MAX_BATCHES = 3
MAX_APPLIED = 25
SELECTED_BATCH_KEYS = {
    "master-editorial-draft-pilot:1",
    "master-editorial-draft-pilot:4",
}
AUTH = {
    "phase": "2H.2J-R4",
    "contentStatus": "DRAFT",
    "ownerApprovalsAdded": 0,
    "canonicalIdsAllocated": 0,
    "rightsClearanceAdded": 0,
    "rights": "UNKNOWN_REVIEW_REQUIRED",
    "databaseAccess": "NONE",
    "databaseWrites": "NONE",
    "masterReleaseChanged": False,
    "legacyModified": False,
    "production": "UNTOUCHED",
    "publicationEligible": False,
}

# Selection is immutable after --select. Every selected proposal is adjudicated
# below; a defer never triggers substitution from another original batch.
DECISIONS = {
    "2H2I-P010": ("APPLY_ELIGIBLE", "Ghi chú hiện tại trộn nhận xét về nguồn với cấu trúc cần học. AFTER cho mẫu at the onset of + danh từ và ví dụ at the onset of winter, khớp định nghĩa 'vào lúc bắt đầu' và bản dịch hiện có. Từ onset chỉ được giải thích trong ghi chú; không đổi POS OTHER, nội dung nghĩa, ví dụ hay ranh giới."),
    "2H2I-P020": ("APPLY_ELIGIBLE", "Nghĩa quả chuối, ví dụ thái một quả chuối vào cháo và bản dịch đều thống nhất. AFTER nêu đúng tính đếm được và mẫu a bunch of bananas; không gán loại chuối theo vùng hay quyết định identity."),
    "2H2I-R2-P020": ("APPLY_ELIGIBLE", "Ví dụ mang một quả táo và bánh mì cho chuyến đi khớp danh từ quả táo đếm được; AFTER nêu a/two apples và slice/piece of apple tự nhiên. Cụm 'not a company-name identity' bị bỏ nhưng không thay đổi quyết định danh tính hay nghĩa."),
    "2H2I-R2-P021": ("APPLY_ELIGIBLE", "Định nghĩa bể trong suốt nuôi sinh vật nước, ví dụ bể cá cạnh cửa sổ và bản dịch đều khớp. AFTER dạy số ít/số nhiều và giới từ in; không thêm nghĩa địa điểm tham quan vốn được ghi rõ là khả năng riêng."),
    "2H2I-R2-P022": ("APPLY_ELIGIBLE", "Nghĩa động từ trang bị vũ khí, ví dụ báo cáo về kế hoạch trang bị cho lực lượng bảo vệ và bản dịch nhất quán. AFTER giữ động từ ngoại động, bổ sung dạng bị động thường gặp nhưng không đưa hướng dẫn thao tác hay đổi tác thể/nghĩa."),
    "2H2I-R2-P023": ("DEFER_POS_OR_IDENTITY", "Ví dụ sale of arms khớp danh từ số nhiều về vũ khí, nhưng AFTER bỏ câu yêu cầu chủ sở hữu quyết định arms là lexical form riêng hay quan hệ dạng từ của arm. Vì vậy thay ghi chú sẽ ngầm giải quyết quan hệ identity đang mở; giữ nguyên BEFORE."),
    "2H2I-R2-P024": ("APPLY_ELIGIBLE", "Ví dụ diễn đạt lo ngại của nhóm trong cuộc họp và bản dịch trình bày rõ lo ngại khớp động từ ngoại động articulate. AFTER đưa khung động từ và các dạng đều đặn; không chuyển sang adjective articulate và không đổi POS."),
    "2H2I-R2-P025": ("APPLY_ELIGIBLE", "Ví dụ articulate speaker cùng bản dịch diễn đạt rõ ràng khớp tính từ chỉ khả năng diễn đạt. AFTER minh họa vị trí trước danh từ và sau be, hữu ích cho người học; không phân loại lại POS hay phê duyệt tách identity."),
    "2H2I-R2-P026": ("APPLY_ELIGIBLE", "Ví dụ bảo tàng tăng an ninh sau vụ tấn công và bản dịch khớp danh từ một hành động gây hại. AFTER nêu danh từ đếm được và attack on + đối tượng; không gộp các nghĩa bệnh tật."),
    "2H2I-R2-P027": ("APPLY_ELIGIBLE", "Ví dụ con chó tấn công hàng rào thay vì người và bản dịch khớp động từ gây hại; AFTER nêu mẫu ngoại động và dạng quá khứ/tiếp diễn đều đặn. Nội dung chỉ là ví dụ trung tính, không phải chỉ dẫn bạo lực."),
    "2H2I-R2-P028": ("APPLY_ELIGIBLE", "Định nghĩa luật sư đại diện khách hàng, ví dụ giải thích hợp đồng và bản dịch nhất quán. AFTER giữ dấu hiệu especially American English, thêm số nhiều và khung act for a client; không đưa tư vấn pháp lý hay khẳng định điều kiện hành nghề theo khu vực."),
    "2H2I-R2-P029": ("APPLY_ELIGIBLE", "Cổng tự động mở cho xe giao hàng khớp nghĩa thiết bị hoạt động không cần điều khiển từng bước và bản dịch. AFTER minh họa tính từ trước danh từ/sau linking verb; ghi chú riêng về phản ứng thói quen của con người vẫn không được biến thành nghĩa mới."),
    "2H2I-R2-P030": ("APPLY_ELIGIBLE", "View was awesome và bản dịch thật tuyệt vời thể hiện lời khen thân mật. AFTER giữ nhãn Informal, minh họa cả vị trí trước danh từ và sau be; không nhập nghĩa awe-inspiring cũ."),
    "2H2I-R2-P031": ("APPLY_ELIGIBLE", "Sữa bị hỏng và bản dịch đã bị hỏng khớp tính từ trong ngữ cảnh thực phẩm. AFTER dạy go bad ở hiện tại hoàn thành/quá khứ hoàn thành; không biến mùi thành phép thử an toàn thực phẩm và không đổi polarity."),
    "2H2I-R2-P032": ("APPLY_ELIGIBLE", "Bóng bay vàng lơ lửng trên bàn tiệc khớp vật thể vỏ mỏng chứa khí và bản dịch. AFTER nêu số đếm cùng inflate/float tự nhiên; không thêm nghĩa balloon dùng để di chuyển."),
    "2H2I-R2-P033": ("APPLY_ELIGIBLE", "Ví dụ đến ngân hàng mở tài khoản tiết kiệm khớp định nghĩa tổ chức tài chính và bản dịch. AFTER nêu số nhiều và collocation open an account at; không lẫn với bank là bờ sông trong Sense anh em."),
    "2H2I-R2-P034": ("APPLY_ELIGIBLE", "Quần áo gấp được đặt trong giỏ và bản dịch cùng khớp vật chứa dùng mang đồ. AFTER đưa số nhiều và mẫu put in/a basket of tự nhiên; không thêm giỏ mua sắm ảo."),
    "2H2I-P007": ("DEFER_POS_OR_IDENTITY", "AFTER đưa noun use an abstract of an article vào ghi chú của adjective abstract, dù nguồn đã nói noun use không thuộc nhóm này. Đây là so sánh vượt POS/ranh giới và không cần để học nghĩa hiện có; giữ nguyên BEFORE, không tạo hoặc phê duyệt Sense."),
    "2H2I-P013": ("DEFER_POS_OR_IDENTITY", "AFTER thêm welcome aboard, một cách dùng đứng độc lập/adverbial ngoài POS PREPOSITION của đề xuất. Dù aboard the ferry đúng, thay đổi sẽ mở rộng phạm vi POS mà chưa có quyết định; giữ nguyên BEFORE."),
    "2H2I-P017": ("DEFER_POS_OR_IDENTITY", "AFTER thêm cách dùng above đứng độc lập khi điểm quy chiếu được hiểu, trong khi candidate này là PREPOSITION + noun phrase và source adjective tag còn xung đột. Cần xử lý POS/identity ở lượt khác; không đưa phần đó vào ghi chú."),
    "2H2I-R2-P044": ("APPLY_ELIGIBLE", "Ví dụ an envelope dưới a chair minh họa đúng quy tắc dựa trên âm đầu, và tiếng Việt giữ một người/vật cùng danh từ đếm được số ít. AFTER thêm hai ví dụ tối thiểu, không nói a/an là cùng canonical identity và không đổi determiner."),
    "2H2I-R2-P045": ("APPLY_ELIGIBLE", "Ví dụ chó bị bỏ rơi bên đường khớp nghĩa bỏ mặc người/con vật cần hỗ trợ và bản dịch. AFTER giữ bị động, thêm abandoned animal cùng dạng abandoned/abandoning đúng quy tắc; Sense bỏ kế hoạch vẫn riêng."),
    "2H2I-R2-P046": ("DEFER_SEMANTIC_RISK", "AFTER chuyển ghi chú sang mẫu dịch vụ và danh từ đếm được nhưng bỏ phân biệt induced abortion với spontaneous pregnancy loss cùng cảnh báo cần chuyên môn về thuật ngữ/phạm vi. Ví dụ access to services không đủ làm căn cứ bỏ các giới hạn y khoa; giữ nguyên BEFORE."),
    "2H2I-R2-P047": ("DEFER_POS_OR_IDENTITY", "Ví dụ about forty minutes xác nhận nghĩa xấp xỉ, nhưng BEFORE ghi rõ bất đồng phân loại ADVERB/PREPOSITION và yêu cầu chọn quy ước POS. AFTER loại bỏ cảnh báo này mà không giải quyết tranh chấp; giữ nguyên BEFORE."),
    "2H2I-R2-P048": ("DEFER_POS_OR_IDENTITY", "Ví dụ the room above có thể phân tích là adjective hậu vị, còn AFTER tiếp tục nêu above đứng độc lập và cách dùng không có bổ ngữ. Những cách đó vượt hoặc làm mờ POS của Sense ADVERB; giữ nguyên BEFORE cho đến khi xử lý ranh giới/POS."),
    "2H2I-R2-P049": ("APPLY_ELIGIBLE", "Abrupt change và the change was abrupt đều minh họa đúng tính từ chỉ thay đổi đột ngột; bản dịch Sự chuyển chủ đề đột ngột giữ nghĩa. AFTER dạy vị trí trước danh từ/sau linking verb, không áp nghĩa curt manner chưa có bằng chứng."),
    "2H2I-R2-P050": ("APPLY_ELIGIBLE", "Absolute silence trong ví dụ phòng thí nghiệm và bản dịch im lặng tuyệt đối phù hợp nghĩa complete, không điều kiện. AFTER cho hai collocation tự nhiên và giải nghĩa complete; không mở rộng sang toán học."),
    "2H2I-R2-P051": ("APPLY_ELIGIBLE", "Absolutely right về trang bị thiếu khớp nghĩa nhấn mạnh tính đúng hoàn toàn và bản dịch hoàn toàn đúng. AFTER nêu vị trí trước adjective và ví dụ degree phù hợp; giữ trạng từ, không thay mức độ trong ví dụ."),
    "2H2I-R2-P052": ("APPLY_ELIGIBLE", "Khăn thấm nước trái cây bị đổ minh họa chính xác chất lỏng được hút vào vật liệu, bản dịch dùng thấm phù hợp. AFTER cho cấu trúc ngoại động và dạng động từ đều đặn; không suy diễn sang quá trình vật lý khác."),
}

FULL_REVIEW_REVIEW_KEYS = {
    "EDITORIAL_2H2B:aboard:on-transport",
    "EDITORIAL_2H2B:abortion:end-pregnancy",
    "EDITORIAL_2H2B:about:approximately",
    "EDITORIAL_2H2B:above:higher-place",
    "EDITORIAL_2H2B:above:higher-than",
    "EDITORIAL_2H2B:abstract:not-concrete",
    "EDITORIAL_2H2B:aquarium:tank",
    "EDITORIAL_2H2B:arm:body-part",
    "EDITORIAL_2H2B:arm:provide-weapons",
    "EDITORIAL_2H2B:arm:weapons",
    "EDITORIAL_2H2B:articulate:eloquent",
    "EDITORIAL_2H2B:articulate:express",
    "EDITORIAL_2H2B:at the onset:at-beginning",
    "EDITORIAL_2H2B:attorney:lawyer",
    "EDITORIAL_2H2B:awesome:excellent",
    "EDITORIAL_2H2B:balloon:inflated-object",
}

# Content-specific review notes are kept separate from inherited QA state. The
# current QA audit stays REVIEW/PENDING_HUMAN_REVIEW for every Sense.
FULL_REVIEW_NOTES = {
    "EDITORIAL_2H2B:a, an:indefinite": "Envelope/chair minh họa đúng lựa chọn mạo từ theo âm đầu; bản dịch phong bì và ghế khớp. Ghi chú không giải quyết việc quản trị identity của hai dạng, vì vậy lịch sử QA vẫn REVIEW.",
    "EDITORIAL_2H2B:abandon:leave-without-care": "Con chó bị bỏ rơi bên đường khớp định nghĩa thiếu hỗ trợ/bảo vệ và bản dịch bỏ rơi; dạng bị động trong ghi chú phù hợp. Tách khỏi abandon a plan, không gộp ranh giới.",
    "EDITORIAL_2H2B:abandon:stop-plan": "Kế hoạch picnic bị từ bỏ khi bão đến khớp quyết định không tiếp tục hoạt động; tiếng Việt giữ cùng nguyên nhân/thời điểm. Khác Sense bỏ mặc con vật.",
    "EDITORIAL_2H2B:ability:capacity": "Khả năng giải thích ý khó là năng lực thực hiện, bản dịch cũng nêu khả năng; khung ability to + verb phù hợp và không đồng nhất với permission.",
    "EDITORIAL_2H2B:able:can-do": "Sau khi nghỉ, người nói hoàn thành quãng đi bộ; be able to + verb diễn đạt khả năng đạt được và bản dịch giữ kết quả quá khứ.",
    "EDITORIAL_2H2B:able:competent": "Able assistant mô tả năng lực làm việc, bản dịch có năng lực phù hợp; cách dùng trước danh từ phân biệt với construction be able to.",
    "EDITORIAL_2H2B:abnormal:unusual": "Cảm biến phát hiện mức tăng nhiệt bất thường, đúng một quan sát lệch kỳ vọng; bản dịch không biến từ này thành đánh giá con người.",
    "EDITORIAL_2H2B:aboard:on-transport": "Bước lên phà minh họa nghĩa lên phương tiện và bản dịch tương ứng; tuy nhiên các cách dùng đứng độc lập/POS khác chưa được giải quyết, nên giữ REVIEW và không đổi phạm vi.",
    "EDITORIAL_2H2B:abolish:officially-end": "Hội đồng bỏ quy định đỗ xe bằng quyết định chính thức; bản dịch bãi bỏ khớp động từ abolish + rule, không suy rộng thành remove một đồ vật.",
    "EDITORIAL_2H2B:abortion:end-pregnancy": "Báo cáo về tiếp cận dịch vụ và bản dịch dịch vụ phá thai phù hợp chủ đề của định nghĩa; thuật ngữ y khoa, phân biệt tình trạng tự nhiên và phạm vi chuyên môn vẫn cần reviewer đủ chuyên môn.",
    "EDITORIAL_2H2B:about:approximately": "About forty minutes và bản dịch khoảng bốn mươi phút khớp nghĩa xấp xỉ; cách phân tích ADVERB hay PREPOSITION vẫn phụ thuộc quy ước POS chưa được chủ sở hữu chốt.",
    "EDITORIAL_2H2B:about:around": "Wandered about trong khi xếp túi thể hiện di chuyển quanh/nhiều nơi; bản dịch quanh quẩn cùng thời gian đồng thời phù hợp, khác nghĩa xấp xỉ.",
    "EDITORIAL_2H2B:about:topic": "Talked about the new library và bản dịch nói về thư viện cùng chỉ quan hệ chủ đề; khung about + noun phù hợp, không lẫn hai Sense about còn lại.",
    "EDITORIAL_2H2B:above:higher-place": "Tiếng bước chân từ room above minh họa vị trí phía trên và bản dịch cùng tham chiếu; cách phân tích above sau danh từ có thể giao với adjective hậu vị, cần giữ REVIEW.",
    "EDITORIAL_2H2B:above:higher-than": "Đồng hồ treo phía trên cửa bếp minh họa above + noun phrase rõ ràng; tiếng Việt giữ quan hệ vị trí, nhưng xung đột source adjective tag chưa được giải quyết.",
    "EDITORIAL_2H2B:abroad:foreign-country": "Study abroad và du học diễn đạt học tại nước khác; abroad không cần giới từ trong construction này, nội dung và ghi chú nhất quán.",
    "EDITORIAL_2H2B:abrupt:sudden": "Thay đổi chủ đề đột ngột khiến mọi người ngạc nhiên; bản dịch giữ sudden rather than gradual. Sense thái độ curt được nêu riêng, chưa nhập vào định nghĩa.",
    "EDITORIAL_2H2B:absence:lack": "Thiếu hướng dẫn rõ ràng làm dự án chậm, đúng nghĩa absence of một điều cần có; bản dịch xác nhận thiếu vắng, khác việc một người không dự họp.",
    "EDITORIAL_2H2B:absence:not-present": "Giải thích sự vắng mặt khỏi cuộc họp khớp nghĩa không có mặt tại nơi/sự kiện mong đợi; bản dịch giữ danh từ việc vắng mặt.",
    "EDITORIAL_2H2B:absent:missing": "Kết luận rõ ràng không có trong bài luận, khớp feature absent from; bản dịch nói bài luận thiếu kết luận, khác người không tham dự.",
    "EDITORIAL_2H2B:absent:not-there": "Hai học sinh vắng buổi thực hành diễn đạt không có mặt tại sự kiện, bản dịch tương đương; absent from + event phù hợp.",
    "EDITORIAL_2H2B:absolute:complete": "Absolute silence trong phòng thí nghiệm diễn đạt sự im lặng hoàn toàn theo điều kiện ví dụ; bản dịch tuyệt đối phù hợp tính từ trước danh từ.",
    "EDITORIAL_2H2B:absolutely:completely": "Absolutely right đánh giá trang bị thiếu là hoàn toàn đúng, khớp bản dịch; vị trí bổ nghĩa adjective và sắc thái nhấn mạnh phù hợp.",
    "EDITORIAL_2H2B:absorb:learn-information": "Cần thời gian để absorb instructions trước khi bắt đầu khớp tiếp thu/ghi nhớ thông tin; bản dịch dùng tiếp thu, khác nghĩa hấp thụ chất lỏng.",
    "EDITORIAL_2H2B:absorb:take-in-liquid": "Khăn khô hút phần nước trái cây bị đổ vào vật liệu; bản dịch thấm đúng nghĩa, và Sense tiếp thu thông tin vẫn riêng.",
    "EDITORIAL_2H2B:abstract:not-concrete": "Freedom là khái niệm trừu tượng và bản dịch khái niệm trừu tượng phù hợp; không dùng nghĩa noun abstract of an article để nới ranh giới adjective.",
    "EDITORIAL_2H2B:absurd:unreasonable": "Phí giao một gói rỗng có vẻ vô lý đến mức khó xem nghiêm túc; bản dịch vô lý giữ lực đánh giá, adjective predicative dùng tự nhiên.",
    "EDITORIAL_2H2B:abundance:plenty": "Khu vườn cho lượng cà chua dồi dào; an abundance of + noun và bản dịch nhiều hơn mức cần thiết phù hợp định nghĩa.",
    "EDITORIAL_2H2B:any more:no-longer": "Không còn dùng lối vào cũ nữa minh họa any more trong câu phủ định; bản dịch không còn tiếp diễn tương đương, được phân biệt với lượng bổ sung.",
    "EDITORIAL_2H2B:apart:into-pieces": "Tháo món đồ chơi để thay pin là take something apart, đúng chuyển vật thành phần rời; bản dịch tháo ra giữ hành động hoàn tất.",
    "EDITORIAL_2H2B:apart:separated": "Hai ngày lễ cách nhau gần một tháng minh họa khoảng thời gian + apart; tiếng Việt giữ chính xác khoảng cách thời gian, không phải tháo rời.",
    "EDITORIAL_2H2B:apple:fruit": "Một quả táo được chuẩn bị cùng sandwich xác nhận danh từ quả đếm được; bản dịch giữ số lượng và không đưa tên công ty vào nghĩa.",
    "EDITORIAL_2H2B:aquarium:tank": "Bể nhỏ cạnh cửa sổ lớp học phù hợp định nghĩa tank có thành trong suốt và bản dịch bể cá; nghĩa địa điểm tham quan là boundary possibility chưa có chứng cứ ở Sense này.",
    "EDITORIAL_2H2B:architect:building-designer": "Kiến trúc sư đưa cửa sổ vào bản thiết kế nhà khớp vai trò chuyên môn và bản dịch; nghĩa figurative architect of a plan vẫn ngoài phạm vi.",
    "EDITORIAL_2H2B:arm:body-part": "Giơ cánh tay để hỏi là bộ phận từ vai tới bàn tay, bản dịch giơ tay phù hợp; nghĩa vũ khí và động từ trang bị được giữ thành Sense khác.",
    "EDITORIAL_2H2B:arm:provide-weapons": "Báo cáo về kế hoạch trang bị cho bảo vệ đúng động từ arm someone, bản dịch giữ chủ thể/hành động; không có hướng dẫn sử dụng vũ khí, nhưng họ identity trong nhóm arm còn cần giữ REVIEW.",
    "EDITORIAL_2H2B:arm:weapons": "Sale of arms khớp vũ khí ở dạng số nhiều và bản dịch; câu hỏi arms là lexical form riêng hay quan hệ dạng từ với arm vẫn chưa được chủ sở hữu quyết định.",
    "EDITORIAL_2H2B:articulate:eloquent": "Articulate speaker và bản dịch người diễn thuyết diễn đạt rõ cùng mô tả adjective; source/POS relationship với động từ articulate chưa được quyết định.",
    "EDITORIAL_2H2B:articulate:express": "Articulated the team's concerns diễn đạt rõ lo ngại bằng lời, bản dịch trình bày rõ cùng hành động; cấu trúc động từ ngoại động tự nhiên, POS sibling vẫn được giữ riêng.",
    "EDITORIAL_2H2B:at the onset:at-beginning": "At the onset of winter và bản dịch vào đầu mùa đông diễn đạt thời điểm một quá trình bắt đầu; cụm construction OTHER vẫn cần giữ tách khỏi noun onset.",
    "EDITORIAL_2H2B:attack:assault-noun": "Vụ tấn công vào tòa nhà dẫn đến tăng an ninh, bản dịch cùng nêu một sự kiện gây hại; danh từ đếm được và attack on + target phù hợp.",
    "EDITORIAL_2H2B:attack:assault-verb": "Con chó tấn công hàng rào thay vì người là ví dụ ngoại động nhẹ, bản dịch khớp hành động; không biến thành hướng dẫn và tách khỏi noun attack.",
    "EDITORIAL_2H2B:attorney:lawyer": "Attorney giải thích câu chữ hợp đồng phù hợp định nghĩa lawyer acting for a client, bản dịch luật sư nhất quán; dùng thuật ngữ vùng miền, không thay cho đánh giá pháp lý theo thẩm quyền.",
    "EDITORIAL_2H2B:automatic:self-operating": "Cổng tự động mở cho xe giao hàng biểu thị hoạt động không cần điều khiển thủ công từng bước; bản dịch cổng tự động phù hợp, còn phản ứng tự động của người được giữ ngoài Sense.",
    "EDITORIAL_2H2B:automatically:without-manual-control": "Máy tính tự lưu tài liệu sau mỗi vài phút phù hợp trạng từ bổ nghĩa quy trình; bản dịch tự động lưu cùng nghĩa, ghi chú không hứa hệ thống không thể lỗi.",
    "EDITORIAL_2H2B:awesome:excellent": "View from the hill was awesome và bản dịch thật tuyệt vời khớp lời khen thân mật; nghĩa awe-inspiring lịch sử vẫn là boundary cần review riêng.",
    "EDITORIAL_2H2B:bad:poor-quality": "Kết nối kém làm gián đoạn cuộc gọi thể hiện chất lượng/hiệu quả xấu, bản dịch kém tương ứng; khác nghĩa thức ăn bị hỏng.",
    "EDITORIAL_2H2B:bad:spoiled-food": "Sữa bị hỏng nên bị đổ đi, bản dịch giữ kết quả và lý do; cấu trúc go bad đúng, ghi chú không coi mùi là kiểm tra an toàn đầy đủ.",
    "EDITORIAL_2H2B:balloon:inflated-object": "Bóng bay vàng lơ lửng trên bàn tiệc khớp vật mỏng chứa khí và bản dịch; balloon dùng để di chuyển vẫn là nghĩa riêng chưa xét.",
    "EDITORIAL_2H2B:banana:fruit": "Thái một quả chuối vào cháo và bản dịch cùng chỉ trái cây đếm được; AFTER nêu bunch of bananas tự nhiên, không quyết định biến thể địa phương.",
    "EDITORIAL_2H2B:bank:financial-institution": "Đến ngân hàng mở tài khoản tiết kiệm khớp tổ chức tài chính, bản dịch nhất quán; giữ tách bank là bờ sông.",
    "EDITORIAL_2H2B:bank:river-edge": "Ngồi trên bờ cỏ nhìn thuyền qua lại khớp vùng đất ven sông; bản dịch bờ sông rõ ràng, khác tổ chức tài chính.",
    "EDITORIAL_2H2B:basis:foundation": "Các cuộc phỏng vấn làm cơ sở cho báo cáo khớp basis of + noun; bản dịch tạo cơ sở cùng quan hệ, số nhiều bases được ghi đúng.",
    "EDITORIAL_2H2B:basket:container": "Quần áo gấp được đặt vào giỏ khớp vật chứa mang đồ, bản dịch giỏ phù hợp; basket of clothes tự nhiên và không nhập nghĩa giỏ mua sắm ảo.",
    "EDITORIAL_2H2B:bed:sleeping-furniture": "Giường hẹp cạnh cửa sổ trong phòng khách khớp đồ nội thất dùng ngủ/nghỉ, bản dịch giữ giường. in bed là construction có thể bỏ mạo từ; flower bed vẫn là nghĩa khác.",
}


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def sha_bytes(value):
    return hashlib.sha256(value).hexdigest()


def sha_file(path):
    return sha_bytes(Path(path).read_bytes())


def digest(value):
    return sha_bytes(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                separators=(",", ":")).encode("utf-8"))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def parent_state():
    manifest = read(PARENT_WS / "manifest.json")
    core = dict(manifest)
    fingerprint = core.pop("fingerprint", None)
    require(fingerprint == PARENT_FINGERPRINT == digest(core),
            "Accepted Batch 03 manifest fingerprint mismatch")
    require(manifest.get("parentCommit") == "2ac4c996c18ea0a54f876692894f8bd6ca7de45f"
            and manifest.get("cumulativeAppliedCorrectionCount") == 18
            and manifest.get("cumulativeRevisedSenseCount") == 18
            and manifest.get("effectiveDraftSenseCount") == 1563
            and manifest.get("authoredGroupCount") == 1020,
            "Accepted Batch 03 manifest state mismatch")
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, check=True,
                          capture_output=True, text=True).stdout.strip()
    require(head == PARENT_COMMIT, "R4 parent commit is not the verified TXH baseline")
    projection = read(PROJECTION_PATH)
    records = projection["records"]
    require(len(records) == 1563
            and len({row["proposalKey"] for row in records}) == 1563
            and len({row["candidateGroupKey"] for row in records}) == 1020,
            "Batch 03 effective projection identity/count mismatch")
    mapping = read(MAPPING_PATH)
    require(mapping["cumulativeChangedSenseCount"] == 18
            and len(mapping["records"]) == 1563,
            "Batch 03 cumulative mapping mismatch")
    original_pin = read(PARENT_WS / "accepted-parent-pins.json")["frozenOriginalProjection"]
    require(sha_file(ORIGINAL_PROJECTION) == original_pin["sha256"]
            and original_pin["records"] == 1563,
            "Frozen original effective projection drift")
    return manifest, projection, records


def accepted_parent_pins(manifest):
    prior_pins = read(PARENT_WS / "accepted-parent-pins.json")
    return {
        "phase": "2H.2J-R4",
        "status": "PINNED_BEFORE_CANDIDATE_EVALUATION",
        "parentCommit": PARENT_COMMIT,
        "remoteBaseline": PARENT_COMMIT,
        "batch03": {
            "path": (PARENT_WS / "manifest.json").relative_to(ROOT).as_posix(),
            "sha256": sha_file(PARENT_WS / "manifest.json"),
            "fingerprint": manifest["fingerprint"],
            "projection": {
                "path": PROJECTION_PATH.relative_to(ROOT).as_posix(),
                "sha256": sha_file(PROJECTION_PATH),
                "records": 1563,
                "authoredGroups": 1020,
            },
            "mapping": {
                "path": MAPPING_PATH.relative_to(ROOT).as_posix(),
                "sha256": sha_file(MAPPING_PATH),
            },
        },
        "acceptedEarlierParents": prior_pins,
        "historicalProposalSources": read(INVENTORY_PATH)["originalSourceProposalFiles"],
        "sourceScriptPins": {
            name: sha_file(ROOT / "scripts" / name)
            for name in [
                "phase-2h2j-draft-remediation-pilot-01.py",
                "phase-2h2j-draft-remediation-batch-02.py",
                "phase-2h2j-draft-remediation-batch-03.py",
                "phase-2h2j-draft-remediation-batch-03-test.py",
            ]
        },
        "authorization": AUTH,
    }


def batch_metadata():
    batches = read(PILOT / "editorial-draft-batches.json")["batches"]
    result = {}
    for batch in batches:
        number = int(batch["batchKey"].rsplit("_", 1)[1])
        result[f"master-editorial-draft-pilot:{number}"] = batch
    return result


def historical_status_sets(inventory):
    applied = set()
    for checkpoint in (PILOT_WS, BATCH02_WS, PARENT_WS):
        artifact = read(checkpoint / "applied-draft-corrections.json")
        applied.update(row["correctionProposalId"] for row in artifact["corrections"])
    dispositions = read(PARENT_WS / "deferred-and-rejected-proposals.json")
    deferred = set(dispositions["previouslyDeferredPreserved"])
    deferred.update(row["correctionProposalId"] for row in dispositions["batch03Deferred"])
    rejected = {row["correctionProposalId"] for row in dispositions["batch03Rejected"]}
    require(len(applied) == 18 and len(deferred) == 12 and len(rejected) == 1,
            "Accepted prior correction/defer/reject ledger counts changed")
    return applied, deferred, rejected, dispositions


def pointer_get(row, pointer):
    require(pointer.startswith("/"), "Only absolute JSON pointers are supported")
    current = row
    for raw in pointer[1:].split("/"):
        key = raw.replace("~1", "/").replace("~0", "~")
        current = current[int(key)] if isinstance(current, list) else current[key]
    return current


def pointer_set(row, pointer, replacement):
    parts = [part.replace("~1", "/").replace("~0", "~")
             for part in pointer[1:].split("/")]
    current = row
    for key in parts[:-1]:
        current = current[int(key)] if isinstance(current, list) else current[key]
    if isinstance(current, list):
        current[int(parts[-1])] = replacement
    else:
        current[parts[-1]] = replacement


def current_inventory(inventory, records):
    parent_by_key = {row["proposalKey"]: row for row in records}
    applied, deferred, rejected, prior_dispositions = historical_status_sets(inventory)
    selected_r4 = {proposal_id: decision[0] for proposal_id, decision in DECISIONS.items()}
    rows = []
    for source in inventory["records"]:
        row = copy.deepcopy(source)
        proposal_id = row["correctionProposalId"]
        current = parent_by_key[row["proposalKey"]]
        current_field = pointer_get(current, row["field"])
        current_hash = current["effectiveContentHash"]
        if proposal_id in applied:
            state = "ALREADY_APPLIED"
        elif proposal_id in deferred:
            state = "PREVIOUSLY_DEFERRED"
        elif proposal_id in rejected:
            state = "PREVIOUSLY_REJECTED"
        elif (current_hash != row["currentEffectiveContentHash"]
              or current_field != row["before"]):
            state = "STALE_OR_CONFLICTING"
        elif row["inventoryCategory"] == "REQUIRES_IDENTITY_OR_BOUNDARY":
            state = "REQUIRES_IDENTITY_OR_BOUNDARY"
        elif row["inventoryCategory"] == "UNREVIEWED_CANDIDATE":
            state = "UNREVIEWED_CANDIDATE"
        elif row["inventoryCategory"] == "POTENTIALLY_SAFE_FOR_DRAFT":
            raise ValueError("A potentially safe prior proposal is neither applied nor deferred")
        else:
            raise ValueError("Proposal lacks an evidence-supported current state: " + proposal_id)
        row["startingState"] = state
        row["currentParentEffectiveContentHash"] = current_hash
        row["currentParentFieldSha256"] = sha_bytes(str(current_field).encode("utf-8"))
        row["currentParentFieldValue"] = current_field
        decision = selected_r4.get(proposal_id)
        row["batch04Disposition"] = decision
        if decision == "APPLY_ELIGIBLE":
            row["postBatch04State"] = "ALREADY_APPLIED"
        elif decision is not None:
            row["postBatch04State"] = "PREVIOUSLY_DEFERRED"
        else:
            row["postBatch04State"] = state
        rows.append(row)
    require(len(rows) == 141 and len({row["correctionProposalId"] for row in rows}) == 141,
            "Batch 04 historical proposal inventory is not exhaustive and unique")
    start_counts = Counter(row["startingState"] for row in rows)
    post_counts = Counter(row["postBatch04State"] for row in rows)
    require(sum(start_counts.values()) == sum(post_counts.values()) == 141,
            "Batch 04 proposal state accounting is not exhaustive")
    return rows, dict(sorted(start_counts.items())), dict(sorted(post_counts.items())), prior_dispositions


def selection_receipt(inventory, records):
    current_rows, start_counts, _, _ = current_inventory(inventory, records)
    unreviewed = [row for row in current_rows
                  if row["startingState"] == "UNREVIEWED_CANDIDATE"]
    counts = Counter(
        f"{row['originalAuthoredBatch']['sourceCheckpoint']}:{row['originalAuthoredBatch']['batch']}"
        for row in unreviewed
    )
    batch_pins = batch_metadata()
    ranked = sorted(counts, key=lambda key: (-counts[key], key))
    require(ranked[:2] == ["master-editorial-draft-pilot:4",
                           "master-editorial-draft-pilot:1"],
            "Highest-density candidate batches changed")
    require(set(SELECTED_BATCH_KEYS) == set(ranked[:2]),
            "R4 selection must use the first two current density-ranked batches")
    selected = [row for row in unreviewed
                if f"{row['originalAuthoredBatch']['sourceCheckpoint']}:{row['originalAuthoredBatch']['batch']}"
                in SELECTED_BATCH_KEYS]
    require(len(selected) == 29 and len(selected) <= MAX_CANDIDATES,
            "Selected proposal count exceeds the bounded R4 cohort")
    selected_batches = []
    for key in sorted(SELECTED_BATCH_KEYS, key=lambda item: (-counts[item], item)):
        number = int(key.rsplit(":", 1)[1])
        source = batch_pins[key]
        authored = PILOT / source["authoredSource"]
        authored_sense_count = sum(1 for line in authored.read_text(encoding="utf-8").splitlines()
                                   if line.strip())
        batch_rows = [row for row in records
                      if row["candidateGroupKey"] in source["groupKeys"]]
        require(len(batch_rows) == authored_sense_count,
                "Source authored batch sense count differs from parent projection: " + key)
        selected_batches.append({
            "sourceCheckpoint": "master-editorial-draft-pilot",
            "batch": number,
            "groupKeys": sorted(source["groupKeys"]),
            "groupCount": source["groupCount"],
            "senseCount": authored_sense_count,
            "sourceReferences": {
                "batchInventory": {
                    "path": (PILOT / "editorial-draft-batches.json").relative_to(ROOT).as_posix(),
                    "sha256": sha_file(PILOT / "editorial-draft-batches.json"),
                },
                "authoredPsv": {
                    "path": authored.relative_to(ROOT).as_posix(),
                    "sha256": sha_file(authored),
                },
            },
            "currentUnreviewedProposalCount": counts[key],
        })
    require(sum(item["senseCount"] for item in selected_batches) <= 100,
            "Full-batch review workload exceeds the documented practical limit")
    candidates = []
    selected.sort(key=lambda row: (
        -counts[f"{row['originalAuthoredBatch']['sourceCheckpoint']}:{row['originalAuthoredBatch']['batch']}"],
        row["correctionProposalId"],
    ))
    for rank, row in enumerate(selected, 1):
        evidence = row.get("evidence", {})
        batch_key = (f"{row['originalAuthoredBatch']['sourceCheckpoint']}:"
                     f"{row['originalAuthoredBatch']['batch']}")
        candidates.append({
            "selectionRank": rank,
            "correctionProposalId": row["correctionProposalId"],
            "proposalKey": row["proposalKey"],
            "candidateGroupKey": row["candidateGroupKey"],
            "originalAuthoredBatch": row["originalAuthoredBatch"],
            "currentEffectiveContentHash": row["currentEffectiveContentHash"],
            "fieldPointer": row["field"],
            "before": row["before"],
            "after": row["after"],
            "beforeFieldSha256": row["beforeFieldSha256"],
            "afterFieldSha256": row["afterFieldSha256"],
            "sourceEvidenceReference": {
                "proposalFile": {"path": row["sourceCheckpoint"],
                                 "sha256": row["sourceProposalSha256"]},
                "sourceEvidence": evidence.get("sourceEvidence", []),
                "historicalQaReferences": evidence.get("pinnedHistoricalQaReferences", []),
            },
            "historicalQaReference": evidence.get("pinnedHistoricalQaReferences", []),
            "selectionRationale": (
                "Selected by deterministic density ranking after reconciling all historical states against "
                f"the Batch 03 effective parent; this batch has {counts[batch_key]} current unreviewed "
                "proposals. Complete-batch workload remains within 100 Senses. Selection does not imply eligibility."
            ),
        })
    selected_ids = {row["correctionProposalId"] for row in selected}
    exclusions = []
    for row in current_rows:
        if row["correctionProposalId"] in selected_ids:
            continue
        state = row["startingState"]
        if state == "UNREVIEWED_CANDIDATE":
            reason = "Not selected after deterministic top-two density cohort; remains queued without evaluation."
        elif state == "ALREADY_APPLIED":
            reason = "Already applied in an accepted prior overlay; excluded from reapplication."
        elif state == "PREVIOUSLY_DEFERRED":
            reason = "Previously deferred; preserved without reopening."
        elif state == "PREVIOUSLY_REJECTED":
            reason = "Previously rejected; preserved without reopening."
        elif state == "REQUIRES_IDENTITY_OR_BOUNDARY":
            reason = "Requires identity or boundary review; outside field-only remediation scope."
        else:
            reason = "Current parent state is stale or conflicting; excluded fail-closed."
        exclusions.append({"correctionProposalId": row["correctionProposalId"],
                           "proposalKey": row["proposalKey"],
                           "inventoryCategory": row["inventoryCategory"],
                           "currentState": state,
                           "reason": reason})
    return {
        "phase": "2H.2J-R4",
        "batch": "TARGETED_DRAFT_REMEDIATION_BATCH_04",
        "status": "SELECTION_LOCKED_BEFORE_SEMANTIC_REVIEW",
        "selectionMethod": "DETERMINISTIC_TOP_DENSITY_AUTHORED_BATCHES_THEN_PROPOSAL_ID",
        "selectionPolicy": [
            "Reconcile candidates against the accepted Batch 03 effective projection.",
            "Exclude applied, deferred, rejected, stale/conflicting, identity and boundary states.",
            "Rank original batches by actual unreviewed proposal count descending, lexical batch key as tie-breaker.",
            f"Select all candidates in the first two current densest batches ({counts[ranked[0]]} and {counts[ranked[1]]} proposals).",
            "Review every Sense in both complete authored batches (27 plus 28 = 55).",
            "Selection does not imply eligibility; independently evaluate exact BEFORE/AFTER later.",
        ],
        "selectedCandidateCount": len(candidates),
        "selectedBatchCount": len(selected_batches),
        "fullBatchSenseInspectionEstimate": sum(x["senseCount"] for x in selected_batches),
        "candidateCountsByOriginalBatch": dict(sorted(counts.items())),
        "startingStateCounts": start_counts,
        "selectedOriginalBatches": selected_batches,
        "candidateIdsInStableOrder": [x["correctionProposalId"] for x in candidates],
        "candidates": candidates,
        "explicitExclusionCount": len(exclusions),
        "explicitExclusions": exclusions,
        "previouslyAppliedExcluded": sorted(row["correctionProposalId"] for row in current_rows
                                             if row["startingState"] == "ALREADY_APPLIED"),
        "previouslyDeferredExcluded": sorted(row["correctionProposalId"] for row in current_rows
                                               if row["startingState"] == "PREVIOUSLY_DEFERRED"),
        "boundaryProposalCountExcluded": inventory["boundaryProposalCount"],
        "unselectedPotentialCandidateCount": len(unreviewed) - len(selected),
        "selectionWorkloadEstimate": {"senses": sum(x["senseCount"] for x in selected_batches),
                                      "limit": 100, "withinLimit": True},
        "parentBatch03Fingerprint": PARENT_FINGERPRINT,
        "authorization": AUTH,
    }


def persist_selection():
    manifest, projection, records = parent_state()
    inventory = read(INVENTORY_PATH)
    pins = accepted_parent_pins(manifest)
    receipt = selection_receipt(inventory, records)
    outputs = {
        "accepted-parent-pins.json": encode(pins),
        "batch-selection-receipt.json": encode(receipt),
    }
    allowed_existing = {WS / name for name in outputs}
    existing_files = {path for path in WS.rglob("*") if path.is_file()}
    require(existing_files.issubset(allowed_existing),
            "Unexpected Batch 04 file exists before the selection receipt")
    refreshed = False
    for name, content in outputs.items():
        path = WS / name
        if path.exists() and path.read_bytes().replace(b"\r\n", b"\n") != content.encode("utf-8"):
            if name == "batch-selection-receipt.json":
                old = read(path)
                require(old.get("candidateIdsInStableOrder") == receipt["candidateIdsInStableOrder"]
                        and old.get("parentBatch03Fingerprint") == PARENT_FINGERPRINT
                        and old.get("status") == "SELECTION_LOCKED_BEFORE_SEMANTIC_REVIEW",
                        "Refusing to change the locked R4 candidate cohort")
                refreshed = True
            else:
                raise ValueError("Refusing to overwrite R4 parent pins: " + name)
    for name, content in outputs.items():
        path = WS / name
        if not path.exists() or path.read_bytes().replace(b"\r\n", b"\n") != content.encode("utf-8"):
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(content.encode("utf-8"))
    return {"status": "SELECTION_LOCKED_BEFORE_SEMANTIC_REVIEW",
            "selected": receipt["selectedCandidateCount"],
            "batches": receipt["selectedBatchCount"],
            "fullBatchSenses": receipt["fullBatchSenseInspectionEstimate"],
            "selectionReceiptRefreshed": refreshed,
            "zeroWrites": False}


def load_r4_context():
    manifest, projection, records = parent_state()
    inventory = read(INVENTORY_PATH)
    selected = read(WS / "batch-selection-receipt.json")
    pinned = read(WS / "accepted-parent-pins.json")
    require(encode(pinned) == encode(accepted_parent_pins(manifest)),
            "Accepted parent pins changed after selection")
    expected_selection = selection_receipt(inventory, records)
    require(encode(selected) == encode(expected_selection),
            "Persisted selection receipt no longer matches current parent inventory")
    by_id = {row["correctionProposalId"]: row for row in inventory["records"]}
    selected_ids = set(selected["candidateIdsInStableOrder"])
    require(selected_ids == set(DECISIONS) and len(selected_ids) == 29,
            "Every locked candidate must have exactly one independent decision")
    for source in inventory["originalSourceProposalFiles"]:
        path = ROOT / source["path"]
        require(path.is_file() and sha_file(path) == source["sha256"],
                "Historical proposal source hash drift: " + source["path"])
    queue = read(PARENT_WS / "remaining-remediation-queue.json")
    require(inventory["boundaryProposals"] == queue["boundaryProposals"]
            and len(inventory["boundaryProposals"]) == 8,
            "Historical boundary proposals changed")
    require(all(row["historicalProposalStillUnappliedInSource"] is True
                for row in inventory["records"]),
            "Historical proposal file records must remain unapplied")
    current_rows, starting_counts, post_counts, prior_dispositions = current_inventory(inventory, records)
    current_by_id = {row["correctionProposalId"]: row for row in current_rows}
    require(starting_counts == selected["startingStateCounts"],
            "Selection state counts differ from the current inventory")
    for candidate in selected["candidates"]:
        row = current_by_id[candidate["correctionProposalId"]]
        current = next(item for item in records if item["proposalKey"] == row["proposalKey"])
        require(row["startingState"] == "UNREVIEWED_CANDIDATE"
                and row["currentParentEffectiveContentHash"] == candidate["currentEffectiveContentHash"]
                and current["effectiveContentHash"] == candidate["currentEffectiveContentHash"]
                and pointer_get(current, candidate["fieldPointer"]) == candidate["before"]
                and sha_bytes(candidate["before"].encode("utf-8")) == candidate["beforeFieldSha256"]
                and sha_bytes(candidate["after"].encode("utf-8")) == candidate["afterFieldSha256"],
                "Selected candidate parent/field hash changed: " + candidate["correctionProposalId"])
    return {
        "manifest": manifest,
        "projection": projection,
        "parentRows": {row["proposalKey"]: row for row in records},
        "inventory": inventory,
        "currentInventory": current_rows,
        "startingStateCounts": starting_counts,
        "postStateCounts": post_counts,
        "selection": selected,
        "inventoryById": by_id,
        "currentInventoryById": current_by_id,
        "priorDispositions": prior_dispositions,
    }


def review_context(row, parent_rows):
    siblings = []
    for sibling in sorted((item for item in parent_rows.values()
                           if item["candidateGroupKey"] == row["candidateGroupKey"]
                           and item["proposalKey"] != row["proposalKey"]),
                          key=lambda item: item["proposalKey"]):
        siblings.append({
            "proposalKey": sibling["proposalKey"],
            "partOfSpeech": sibling["partOfSpeech"],
            "definitionEn": sibling["content"]["definitionEn"],
            "meaningVi": sibling["content"]["meaningVi"],
            "effectiveContentHash": sibling["effectiveContentHash"],
        })
    return {
        "proposalKey": row["proposalKey"],
        "candidateGroupKey": row["candidateGroupKey"],
        "headword": row["headword"],
        "partOfSpeech": row["partOfSpeech"],
        "effectiveContentHash": row["effectiveContentHash"],
        "content": copy.deepcopy(row["content"]),
        "siblingSenses": siblings,
        "sourceEvidence": copy.deepcopy(row.get("sourceEvidence", [])),
        "historicalQaReferences": [
            {"path": ref["path"], "sha256": ref["sha256"],
             "jsonPointer": ref.get("jsonPointer"),
             "historicalStatus": ref.get("exactRecord", {}).get("status"),
             "linguisticReview": ref.get("exactRecord", {}).get("linguisticReview")}
            for ref in row.get("pinnedHistoricalQaReferences", [])
        ],
        "historicalAiReview": copy.deepcopy(row.get("effectiveAiReview")),
        "rights": row.get("rights"),
    }


def eligibility_assessments(context):
    parent_rows = context["parentRows"]
    assessments = []
    for selected in context["selection"]["candidates"]:
        proposal_id = selected["correctionProposalId"]
        status, explanation = DECISIONS[proposal_id]
        parent = parent_rows[selected["proposalKey"]]
        siblings = [item for item in parent_rows.values()
                    if item["candidateGroupKey"] == selected["candidateGroupKey"]
                    and item["proposalKey"] != selected["proposalKey"]]
        pos_review = ("REVIEW_DEFERRED_NO_POS_OR_IDENTITY_DECISION"
                      if status == "DEFER_POS_OR_IDENTITY" else "PASS_NO_POS_FIELD_CHANGE")
        semantic_review = ("REVIEW_MEDICAL_SCOPE_EVIDENCE"
                           if proposal_id == "2H2I-R2-P046" else "PASS")
        assessments.append({
            "correctionProposalId": proposal_id,
            "proposalKey": selected["proposalKey"],
            "candidateGroupKey": selected["candidateGroupKey"],
            "originalAuthoredBatch": selected["originalAuthoredBatch"],
            "currentParentRevision": "DRAFT_REMEDIATION_BATCH_03_EFFECTIVE_PROJECTION",
            "currentParentEffectiveContentHash": selected["currentEffectiveContentHash"],
            "fieldPointer": selected["fieldPointer"],
            "before": selected["before"],
            "after": selected["after"],
            "beforeFieldSha256": selected["beforeFieldSha256"],
            "afterFieldSha256": selected["afterFieldSha256"],
            "eligibilityStatus": status,
            "reviewKind": "INDEPENDENT_AI_LINGUISTIC_REVIEW_NOT_OWNER_APPROVAL",
            "independentReviewDimensions": {
                "originalDefectIsReal": "CONFIRMED_NONLEARNER_PROCESS_COMMENTARY"
                if status == "APPLY_ELIGIBLE" else "PARTIAL_OR_RISK_REQUIRES_DEFERRAL",
                "afterGrammarAndUsage": "PASS",
                "learnerUsefulness": "PASS",
                "englishMeaningPreserved": "PASS",
                "vietnameseMeaningAndExamples": "PASS_UNCHANGED_AND_CONTEXT_CHECKED",
                "unsupportedCollocationIntroduced": "NO",
                "agencyTenseCountabilityPolarityDrift": "NO",
                "posIdentityBoundary": pos_review,
                "medicalOrSubjectScope": semantic_review,
                "sameSenseConflict": "PASS_NO_DUPLICATE_FIELD_APPLICATION",
                "currentParentHash": "PASS_EXACT_BATCH_03_PARENT",
                "siblingSenseCount": len(siblings),
            },
            "reviewedSenseContext": review_context(parent, parent_rows),
            "sourceEvidenceReference": copy.deepcopy(selected["sourceEvidenceReference"]),
            "historicalQaReference": copy.deepcopy(selected["historicalQaReference"]),
            "reviewExplanationVi": explanation,
            "historicalProposalAppliedFlagRemainsFalse": True,
            "ownerApproval": False,
            "rightsClearanceAdded": False,
            "canonicalIdAllocated": False,
        })
    status_counts = Counter(row["eligibilityStatus"] for row in assessments)
    require(len(assessments) == 29 and status_counts == Counter({
        "APPLY_ELIGIBLE": 22,
        "DEFER_POS_OR_IDENTITY": 6,
        "DEFER_SEMANTIC_RISK": 1,
    }), "Batch 04 decision counts or selection coverage changed")
    return {"phase": "2H.2J-R4",
            "status": "COMPLETE_SELECTED_CANDIDATE_ASSESSMENTS",
            "reviewKind": "INDEPENDENT_AI_LINGUISTIC_REVIEW_NOT_OWNER_APPROVAL",
            "selectedCandidateCount": len(assessments),
            "decisionCounts": dict(sorted(status_counts.items())),
            "records": assessments,
            "authorization": AUTH}


def application_decisions(eligibility):
    decisions = []
    for item in eligibility["records"]:
        status = item["eligibilityStatus"]
        apply = status == "APPLY_ELIGIBLE"
        decisions.append({
            "correctionProposalId": item["correctionProposalId"],
            "proposalKey": item["proposalKey"],
            "candidateGroupKey": item["candidateGroupKey"],
            "currentParentEffectiveContentHash": item["currentParentEffectiveContentHash"],
            "fieldPointer": item["fieldPointer"],
            "before": item["before"],
            "after": item["after"],
            "eligibilityStatus": status,
            "decision": "APPLY_TO_CUMULATIVE_DRAFT_LAYER" if apply else "DEFER_NO_REVISION",
            "applicationLayer": "DRAFT_REMEDIATION_BATCH_04" if apply else None,
            "decisionRationaleVi": item["reviewExplanationVi"],
            "ownerApproval": False,
            "rightsClearanceAdded": False,
            "canonicalIdAllocated": False,
            "publicationEligible": False,
        })
    require(sum(row["decision"] == "APPLY_TO_CUMULATIVE_DRAFT_LAYER"
                for row in decisions) == 22,
            "Application decisions do not match independent eligibility")
    return {"phase": "2H.2J-R4", "status": "DECIDED_WITH_EXPLICIT_DEFERRALS",
            "records": decisions, "authorization": AUTH}


def apply_corrections(context, eligibility, application):
    assessment_by_id = {row["correctionProposalId"]: row for row in eligibility["records"]}
    decision_by_id = {row["correctionProposalId"]: row for row in application["records"]}
    grouped = defaultdict(list)
    seen_fields = set()
    for item in eligibility["records"]:
        if item["eligibilityStatus"] != "APPLY_ELIGIBLE":
            continue
        proposal_id = item["correctionProposalId"]
        key = (item["proposalKey"], item["fieldPointer"])
        require(key not in seen_fields, "Duplicate Batch 04 field application: " + proposal_id)
        seen_fields.add(key)
        current = context["parentRows"][item["proposalKey"]]
        require(current["effectiveContentHash"] == item["currentParentEffectiveContentHash"]
                and pointer_get(current, item["fieldPointer"]) == item["before"],
                "Stale Batch 03 content or BEFORE value: " + proposal_id)
        grouped[item["proposalKey"]].append(proposal_id)
    revisions = []
    revised = {}
    corrections = []
    for proposal_key in sorted(grouped):
        original = context["parentRows"][proposal_key]
        clone = copy.deepcopy(original)
        field_revisions = []
        for proposal_id in grouped[proposal_key]:
            assessment = assessment_by_id[proposal_id]
            pointer_set(clone, assessment["fieldPointer"], assessment["after"])
            field_revision = {
                "correctionProposalId": proposal_id,
                "historicalCorrectionId": proposal_id,
                "proposalKey": proposal_key,
                "candidateGroupKey": original["candidateGroupKey"],
                "currentParentRevision": "DRAFT_REMEDIATION_BATCH_03_EFFECTIVE_PROJECTION",
                "parentEffectiveContentHash": original["effectiveContentHash"],
                "fieldPointer": assessment["fieldPointer"],
                "before": assessment["before"],
                "after": assessment["after"],
                "beforeFieldSha256": assessment["beforeFieldSha256"],
                "afterFieldSha256": assessment["afterFieldSha256"],
                "historicalProposalReference": {
                    "path": context["inventoryById"][proposal_id]["sourceCheckpoint"],
                    "sha256": context["inventoryById"][proposal_id]["sourceProposalSha256"],
                },
                "sourceEvidenceReference": copy.deepcopy(assessment["sourceEvidenceReference"]),
                "historicalQaReference": copy.deepcopy(assessment["historicalQaReference"]),
                "eligibilityStatus": "APPLY_ELIGIBLE",
                "applicationDecision": decision_by_id[proposal_id]["decision"],
                "postApplicationFieldReviewStatus": "PASS",
                "postApplicationReviewExplanationVi": assessment["reviewExplanationVi"],
                "contentStatus": "DRAFT",
                "rights": "UNKNOWN_REVIEW_REQUIRED",
                "ownerApproval": False,
                "canonicalIdAllocated": False,
            }
            field_revisions.append(field_revision)
        revised_hash = digest({
            "proposalKey": clone["proposalKey"],
            "candidateGroupKey": clone["candidateGroupKey"],
            "headword": clone["headword"],
            "partOfSpeechProposal": clone["partOfSpeech"],
            "content": clone["content"],
        })
        clone["effectiveContentHash"] = revised_hash
        require({key: value for key, value in clone.items()
                 if key not in {"content", "effectiveContentHash"}}
                == {key: value for key, value in original.items()
                    if key not in {"content", "effectiveContentHash"}},
                "Batch 04 modified fields outside content and effective hash")
        upstream = [layer for layer in read(MAPPING_PATH)["records"]
                    if layer["proposalKey"] == proposal_key][0]["revisionLayers"]
        revision = {
            "revisionId": "DRAFT_REMEDIATION_BATCH_04:" + proposal_key,
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_04",
            "draftRevision": 4,
            "status": "AI_REVIEWED_DRAFT_FIELD_CORRECTION",
            "contentStatus": "DRAFT",
            "publicationEligible": False,
            "proposalKey": proposal_key,
            "candidateGroupKey": original["candidateGroupKey"],
            "currentParentRevision": "DRAFT_REMEDIATION_BATCH_03_EFFECTIVE_PROJECTION",
            "previousEffectiveContentHash": original["effectiveContentHash"],
            "revisedContentHash": revised_hash,
            "correctionProposalIds": grouped[proposal_key],
            "fieldRevisions": field_revisions,
            "upstreamRevisionReferences": copy.deepcopy(upstream),
            "eligibilityAssessments": [assessment_by_id[item] for item in grouped[proposal_key]],
            "applicationDecisions": [decision_by_id[item] for item in grouped[proposal_key]],
            "originalProvenance": {
                name: copy.deepcopy(original.get(name)) for name in [
                    "editorialFieldProvenance", "reviewFieldProvenance",
                    "pinnedCorrectionLineage", "appliedCorrectionReferences",
                    "sourceEvidence", "sourceMembership", "historicalQaFindings",
                    "rawEffectiveQaFindings",
                ]
            },
            "rights": "UNKNOWN_REVIEW_REQUIRED",
            "ownerApproval": False,
            "canonicalIdAllocated": False,
            "record": clone,
        }
        revisions.append(revision)
        revised[proposal_key] = clone
        corrections.extend(field_revisions)
    require(len(corrections) == 22 and len(revised) == 22
            and len(corrections) <= MAX_APPLIED,
            "Batch 04 application count or distinct Sense count changed")
    return revisions, revised, corrections


def full_batch_review(context, revised_rows):
    all_rows = dict(context["parentRows"])
    all_rows.update(revised_rows)
    reviews = []
    selected_groups = []
    for batch in context["selection"]["selectedOriginalBatches"]:
        keys = set(batch["groupKeys"])
        rows = sorted((row for row in all_rows.values()
                       if row["candidateGroupKey"] in keys),
                      key=lambda row: row["proposalKey"])
        require(len(rows) == batch["senseCount"],
                "Full-batch review does not cover every source Sense")
        selected_groups.extend(sorted(keys))
        for row in rows:
            proposal_key = row["proposalKey"]
            require(proposal_key in FULL_REVIEW_NOTES,
                    "Missing authored full-batch content review: " + proposal_key)
            status = "REVIEW" if proposal_key in FULL_REVIEW_REVIEW_KEYS else "PASS"
            source_refs = [
                {"corpus": item.get("corpus"), "artifact": item.get("artifact"),
                 "recordIndex": item.get("recordIndex"),
                 "recordEvidenceSha256": item.get("recordEvidenceSha256")}
                for item in row.get("sourceEvidence", [])
            ]
            history_refs = [
                {"path": ref["path"], "sha256": ref["sha256"],
                 "jsonPointer": ref.get("jsonPointer"),
                 "historicalStatus": ref.get("exactRecord", {}).get("status"),
                 "linguisticReview": ref.get("exactRecord", {}).get("linguisticReview")}
                for ref in row.get("pinnedHistoricalQaReferences", [])
            ]
            reviews.append({
                "proposalKey": proposal_key,
                "candidateGroupKey": row["candidateGroupKey"],
                "originalAuthoredBatch": {
                    "sourceCheckpoint": "master-editorial-draft-pilot",
                    "batch": next(batch_pin["batch"] for batch_pin in context["selection"]["selectedOriginalBatches"]
                                  if row["candidateGroupKey"] in batch_pin["groupKeys"]),
                },
                "parentEffectiveContentHash": context["parentRows"][proposal_key]["effectiveContentHash"],
                "reviewedContentHash": row["effectiveContentHash"],
                "reviewedContentSnapshot": copy.deepcopy(row["content"]),
                "partOfSpeech": row["partOfSpeech"],
                "siblingSenseReferences": [
                    {"proposalKey": sibling["proposalKey"],
                     "partOfSpeech": sibling["partOfSpeech"],
                     "definitionEn": sibling["content"]["definitionEn"],
                     "effectiveContentHash": sibling["effectiveContentHash"]}
                    for sibling in sorted((s for s in all_rows.values()
                                           if s["candidateGroupKey"] == row["candidateGroupKey"]
                                           and s["proposalKey"] != proposal_key),
                                          key=lambda s: s["proposalKey"])
                ],
                "sourceEvidenceReferences": source_refs,
                "historicalQaReferences": history_refs,
                "historicalAuditStatus": "REVIEW",
                "historicalReviewRetained": True,
                "reviewStatus": status,
                "reviewKind": "AI_FULL_AUTHORED_BATCH_CONTENT_RE_REVIEW_NOT_OWNER_APPROVAL",
                "reviewDimensions": {
                    "englishMeaning": "PASS",
                    "vietnameseFaithfulness": "PASS",
                    "exampleNaturalness": "PASS",
                    "posAndGrammaticalUsage": "REVIEW" if status == "REVIEW" else "PASS",
                    "siblingSenseBoundaries": "REVIEW" if status == "REVIEW" else "PASS",
                    "sourceEvidence": "REVIEW_SOURCE_RIGHTS_AND_CEFR_NOT_CLEARED",
                    "historicalQa": "REVIEW_RETAINED",
                    "rightsAndOriginality": "REVIEW_UNKNOWN_REVIEW_REQUIRED",
                    "overlayLineage": "PASS",
                },
                "reviewExplanationVi": FULL_REVIEW_NOTES[proposal_key],
                "reviewerApproval": False,
                "rightsClearanceAdded": False,
            })
    counts = Counter(row["reviewStatus"] for row in reviews)
    require(len(reviews) == 55 and len({row["proposalKey"] for row in reviews}) == 55
            and counts == Counter({"PASS": 39, "REVIEW": 16}),
            "Batch 04 full-batch review coverage or decision totals changed")
    require(set(selected_groups) == {
        key for batch in context["selection"]["selectedOriginalBatches"] for key in batch["groupKeys"]
    }, "Full-batch review group coverage is incomplete")
    return {
        "phase": "2H.2J-R4",
        "status": "COMPLETE_WITH_REVIEW_ITEMS",
        "reviewKind": "AI_FULL_AUTHORED_BATCH_CONTENT_RE_REVIEW_NOT_OWNER_APPROVAL",
        "affectedOriginalBatches": [
            f"master-editorial-draft-pilot:{batch['batch']}"
            for batch in context["selection"]["selectedOriginalBatches"]
        ],
        "fullBatchesReviewed": 2,
        "reviewedSenseCount": len(reviews),
        "pass": counts["PASS"],
        "review": counts["REVIEW"],
        "fail": counts["FAIL"],
        "historicalReviewConvertedToPass": False,
        "reviews": reviews,
        "authorization": AUTH,
    }


def artifact_inventory(context, eligibility):
    rows, starting_counts, post_counts, prior = current_inventory(
        context["inventory"], list(context["parentRows"].values()))
    selected_decisions = {row["correctionProposalId"]: row["eligibilityStatus"]
                          for row in eligibility["records"]}
    for row in rows:
        if row["correctionProposalId"] in selected_decisions:
            row["batch04Disposition"] = selected_decisions[row["correctionProposalId"]]
        row["historicalProposalAppliedFlagRemainsFalse"] = True
    require(starting_counts == {
        "ALREADY_APPLIED": 18,
        "PREVIOUSLY_DEFERRED": 12,
        "PREVIOUSLY_REJECTED": 1,
        "REQUIRES_IDENTITY_OR_BOUNDARY": 4,
        "UNREVIEWED_CANDIDATE": 106,
    }, "Batch 04 parent inventory status totals changed")
    require(post_counts == {
        "ALREADY_APPLIED": 40,
        "PREVIOUSLY_DEFERRED": 19,
        "PREVIOUSLY_REJECTED": 1,
        "REQUIRES_IDENTITY_OR_BOUNDARY": 4,
        "UNREVIEWED_CANDIDATE": 77,
    }, "Batch 04 cumulative inventory status totals changed")
    return rows, starting_counts, post_counts, prior


def cumulative_outputs(context, revisions, revised_rows):
    parent_rows = context["parentRows"]
    effective_rows = [copy.deepcopy(revised_rows.get(row["proposalKey"], row))
                      for row in context["projection"]["records"]]
    require(len(effective_rows) == 1563
            and len({row["proposalKey"] for row in effective_rows}) == 1563
            and len({row["candidateGroupKey"] for row in effective_rows}) == 1020,
            "Cumulative Batch 04 projection identity/count changed")
    changed_keys = {key for key, row in revised_rows.items()
                    if parent_rows[key]["effectiveContentHash"] != row["effectiveContentHash"]}
    require(changed_keys == set(revised_rows) and len(changed_keys) == 22,
            "Batch 04 changed an unexpected Sense or omitted an applied revision")
    original_mapping = read(MAPPING_PATH)
    mapping_by_key = {row["proposalKey"]: copy.deepcopy(row)
                      for row in original_mapping["records"]}
    revised_keys_from_original = {
        row["proposalKey"] for row in mapping_by_key.values()
        if row["originalEffectiveContentHash"] != row["cumulativeEffectiveContentHash"]
    }
    require(len(revised_keys_from_original) == 18,
            "The accepted Batch 03 18-Sense cumulative overlay drifted")
    for revision in revisions:
        item = mapping_by_key[revision["proposalKey"]]
        require(item["cumulativeEffectiveContentHash"] == revision["previousEffectiveContentHash"],
                "Cumulative mapping parent hash differs from Batch 03")
        item["batch03EffectiveContentHash"] = item["cumulativeEffectiveContentHash"]
        item["cumulativeEffectiveContentHash"] = revision["revisedContentHash"]
        item["revisionLayers"].append({
            "revisionId": revision["revisionId"],
            "revisionLayer": revision["revisionLayer"],
            "revisedContentHash": revision["revisedContentHash"],
        })
        item["latestRevisionLayer"] = "DRAFT_REMEDIATION_BATCH_04"
    mapping_rows = [mapping_by_key[row["proposalKey"]] for row in effective_rows]
    cumulative_changed = sum(row["originalEffectiveContentHash"]
                             != row["cumulativeEffectiveContentHash"] for row in mapping_rows)
    require(cumulative_changed == 40 and revised_keys_from_original.isdisjoint(changed_keys),
            "Cumulative unique revised Sense count is not 40")
    projection = {
        "schemaVersion": "OFFLINE_CUMULATIVE_EFFECTIVE_DRAFT_PROJECTION_V1",
        "contentStatus": "DRAFT",
        "count": 1563,
        "authoredGroupCount": 1020,
        "records": effective_rows,
        "baseProjection": {
            "path": PROJECTION_PATH.relative_to(ROOT).as_posix(),
            "sha256": sha_file(PROJECTION_PATH),
            "batch03Fingerprint": PARENT_FINGERPRINT,
        },
        "latestOverlay": "draft-revisions.json",
        "publicationEligible": False,
        "authorization": AUTH,
    }
    mapping = {
        "method": "SHA256(canonical UTF-8 JSON of proposalKey, candidateGroupKey, headword, partOfSpeechProposal, content)",
        "count": len(mapping_rows),
        "records": mapping_rows,
        "changedInBatch04SenseCount": 22,
        "cumulativeChangedSenseCount": cumulative_changed,
        "retainedParentBatch03RevisionCount": 18,
        "unchangedFromBatch03SenseCount": 1541,
    }
    return projection, mapping


def build():
    context = load_r4_context()
    eligibility = eligibility_assessments(context)
    application = application_decisions(eligibility)
    revisions, revised_rows, corrections = apply_corrections(context, eligibility, application)
    review = full_batch_review(context, revised_rows)
    inventory_rows, starting_counts, post_counts, prior = artifact_inventory(context, eligibility)
    projection, mapping = cumulative_outputs(context, revisions, revised_rows)
    original_inventory = context["inventory"]
    parent_applied = []
    for checkpoint in (PILOT_WS, BATCH02_WS, PARENT_WS):
        parent_applied.extend(read(checkpoint / "applied-draft-corrections.json")["corrections"])
    require(len(parent_applied) == 18
            and len({row["correctionProposalId"] for row in parent_applied}) == 18,
            "All 18 accepted historical correction records must be retained")
    baseline_mapping = read(MAPPING_PATH)
    baseline_changed_keys = {row["proposalKey"] for row in baseline_mapping["records"]
                             if row["originalEffectiveContentHash"] != row["cumulativeEffectiveContentHash"]}
    require(baseline_changed_keys.isdisjoint(revised_rows),
            "A Batch 04 correction overlaps an already revised Sense")
    boundary = copy.deepcopy(original_inventory["boundaryProposals"])
    old_deferred = [row for row in inventory_rows if row["startingState"] == "PREVIOUSLY_DEFERRED"]
    old_rejected = [row for row in inventory_rows if row["startingState"] == "PREVIOUSLY_REJECTED"]
    batch04_deferred = [row for row in eligibility["records"]
                        if row["eligibilityStatus"].startswith("DEFER_")]
    batch04_rejected = [row for row in eligibility["records"]
                        if row["eligibilityStatus"].startswith("REJECT_")]
    require(len(old_deferred) == 12 and len(old_rejected) == 1
            and len(batch04_deferred) == 7 and not batch04_rejected,
            "Prior and current defer/reject states were not preserved")
    source_group = {key for pin in context["selection"]["selectedOriginalBatches"]
                    for key in pin["groupKeys"]}
    require(len(source_group) == 40, "Selected authored groups are not disjoint and complete")
    post_categories = Counter(row["postBatch04State"] for row in inventory_rows)
    disposition_counts = Counter(row["batch04Disposition"] for row in inventory_rows
                                 if row.get("batch04Disposition"))
    post_unreviewed = [row for row in inventory_rows
                       if row["postBatch04State"] == "UNREVIEWED_CANDIDATE"]
    residual_density = Counter(
        f"{row['originalAuthoredBatch']['sourceCheckpoint']}:{row['originalAuthoredBatch']['batch']}"
        for row in post_unreviewed
    )
    top_remaining = [{"originalAuthoredBatch": key, "unreviewedCandidateCount": count}
                     for key, count in sorted(residual_density.items(),
                                              key=lambda item: (-item[1], item[0]))[:10]]
    parent_manifest = context["manifest"]
    pilot_manifest = read(PILOT_WS / "manifest.json")
    batch02_manifest = read(BATCH02_WS / "manifest.json")
    frozen_pin = read(PARENT_WS / "accepted-parent-pins.json")["frozenOriginalProjection"]
    projection_unchanged = sha_file(ORIGINAL_PROJECTION) == frozen_pin["sha256"]
    validation = {
        "phase": "2H.2J-R4",
        "status": "PARTIAL_WITH_REVIEW_ITEMS_AND_PRESERVED_REGRESSION_DIAGNOSTICS",
        "parentBatch03Fingerprint": PARENT_FINGERPRINT,
        "parentPilot01Fingerprint": pilot_manifest["fingerprint"],
        "parentBatch02Fingerprint": batch02_manifest["fingerprint"],
        "parentAuditFingerprint": parent_manifest["parentAggregateAuditFingerprint"],
        "parentFinalHandoffFingerprint": parent_manifest["parentFinalHandoffFingerprint"],
        "historicalFieldProposals": 141,
        "historicalBoundaryProposals": 8,
        "startingProposalStateCounts": starting_counts,
        "postBatch04ProposalStateCounts": dict(sorted(post_categories.items())),
        "candidatesSelected": 29,
        "candidatesEligible": 22,
        "candidatesDeferred": 7,
        "candidatesRejected": 0,
        "newCorrectionsApplied": len(corrections),
        "cumulativeCorrectionsApplied": len(parent_applied) + len(corrections),
        "distinctNewlyRevisedSenses": len(revised_rows),
        "cumulativeRevisedSenses": mapping["cumulativeChangedSenseCount"],
        "effectiveDraftSenses": len(projection["records"]),
        "authoredGroups": projection["authoredGroupCount"],
        "affectedOriginalBatches": [
            f"master-editorial-draft-pilot:{pin['batch']}"
            for pin in context["selection"]["selectedOriginalBatches"]
        ],
        "fullBatchesReviewed": review["fullBatchesReviewed"],
        "fullBatchSensesReviewed": review["reviewedSenseCount"],
        "postRemediationQa": {"PASS": review["pass"], "REVIEW": review["review"],
                              "FAIL": review["fail"]},
        "newlyRevisedFieldReview": {"PASS": 22, "REVIEW": 0, "FAIL": 0},
        "originalProjectionUnchanged": projection_unchanged,
        "parentBatch03ProjectionUnchanged": True,
        "parentBatch03ArtifactsUnchanged": True,
        "previousOverlayLayersPreserved": True,
        "allHistoricalProposalsPreserved": len(original_inventory["records"]) == 141,
        "allHistoricalBoundaryProposalsPreserved": boundary
            == read(PARENT_WS / "remaining-remediation-queue.json")["boundaryProposals"],
        "lotWasteAggregateDeferred": True,
        "allNineBatch03DeferredPreserved": len(prior["batch03Deferred"]) == 9,
        "greenhouseGasAfterRejectionPreserved": any(
            row["proposalKey"] == "EDITORIAL_2H2B:greenhouse gas:heat-trapping-gas"
            for row in prior["batch03Rejected"]),
        "bulk500Regression": {
            "defaultMode": "FAIL_PRESERVED_2_UNICODE_DECODE_ERRORS",
            "utf8Mode": "PASS_35_TESTS",
            "fixtureModified": False,
        },
        "legacyV220": "KNOWN_FAIL_PRESERVED_4_OF_5_RELEASE_TREE_DIAGNOSTIC",
        "hybridV221": "SEE_VERIFICATION_RESULTS_JSON",
        "databaseAccess": "NONE",
        "databaseWrites": "NONE",
        "production": "UNTOUCHED",
        "rights": "UNKNOWN_REVIEW_REQUIRED",
        "contentApprovalStatus": "PENDING",
        "releaseEligible": False,
        "masterReleaseChanged": False,
        "canonicalIdsAllocated": 0,
        "ownerApprovalsAdded": 0,
        "remainingUnreviewedCandidateCount": len(post_unreviewed),
        "remainingUnreviewedBatchDensity": top_remaining,
        "authorization": AUTH,
    }
    remaining_queue = {
        "phase": "2H.2J-R4",
        "status": "RECONCILED_AFTER_BATCH_04_WITH_PENDING_ITEMS",
        "historicalPriorityAccounting": read(PARENT_WS / "remaining-remediation-queue.json")
            .get("historicalPriorityAccounting"),
        "fieldProposalCount": len(inventory_rows),
        "startingStateCounts": starting_counts,
        "categoryCounts": dict(sorted(post_categories.items())),
        "batch04DispositionCounts": dict(sorted(disposition_counts.items())),
        "fieldProposals": inventory_rows,
        "boundaryProposalCount": len(boundary),
        "boundaryProposals": boundary,
        "previousCorrectionsApplied": len(parent_applied),
        "newCorrectionsApplied": len(corrections),
        "cumulativeCorrectionsApplied": len(parent_applied) + len(corrections),
        "remainingUnreviewedCandidateCount": len(post_unreviewed),
        "remainingUnreviewedBatchDensity": top_remaining,
        "protectedDeferredGroups": ["lot", "waste", "aggregate"],
        "batch03DeferredPreserved": copy.deepcopy(prior["batch03Deferred"]),
        "greenhouseGasRejectedProposalPreserved": copy.deepcopy(prior["batch03Rejected"]),
        "authorization": AUTH,
    }
    deferred_artifact = {
        "status": "PRESERVED_WITHOUT_REOPENING_PRIOR_DECISIONS",
        "previouslyDeferredPreserved": old_deferred,
        "protectedDeferredGroups": ["lot", "waste", "aggregate"],
        "batch03DeferredPreserved": copy.deepcopy(prior["batch03Deferred"]),
        "batch04Deferred": batch04_deferred,
        "previouslyRejectedPreserved": old_rejected,
        "batch04Rejected": batch04_rejected,
        "boundaryProposalsPreserved": boundary,
        "authorization": AUTH,
    }
    post_audit = {
        "phase": "2H.2J-R4",
        "status": "COMPLETE_WITH_REVIEW_ITEMS",
        "reviewKind": "AI_POST_REMEDIATION_FULL_BATCH_REVIEW_NOT_OWNER_APPROVAL",
        "affectedOriginalBatches": review["affectedOriginalBatches"],
        "fullBatchesReviewed": review["fullBatchesReviewed"],
        "sensesReviewed": review["reviewedSenseCount"],
        "pass": review["pass"],
        "review": review["review"],
        "fail": review["fail"],
        "newCorrectionsApplied": len(corrections),
        "cumulativeDraftCorrectionsApplied": len(parent_applied) + len(corrections),
        "newlyRevisedSenseCount": len(revised_rows),
        "cumulativeRevisedSenseCount": mapping["cumulativeChangedSenseCount"],
        "newlyRevisedFieldReview": {"PASS": 22, "REVIEW": 0, "FAIL": 0},
        "historicalReviewConvertedToPass": False,
        "originalProjectionUnchanged": projection_unchanged,
        "unselectedSensesPreserved": True,
        "rights": "UNKNOWN_REVIEW_REQUIRED",
        "ownerApproval": False,
        "releaseEligible": False,
        "authorization": AUTH,
    }
    inventory_artifact = {
        "phase": "2H.2J-R4",
        "status": "COMPLETE_CURRENT_PARENT_RECONCILIATION",
        "parentBatch03Fingerprint": PARENT_FINGERPRINT,
        "fieldProposalCount": len(inventory_rows),
        "uniqueCorrectionProposalIds": len({row["correctionProposalId"] for row in inventory_rows}),
        "startingStateCounts": starting_counts,
        "postBatch04StateCounts": dict(sorted(post_categories.items())),
        "records": inventory_rows,
        "boundaryProposalCount": len(boundary),
        "boundaryProposals": boundary,
        "originalSourceProposalFiles": original_inventory["originalSourceProposalFiles"],
        "authorization": AUTH,
    }
    applied_artifact = {
        "schemaVersion": "OFFLINE_CUMULATIVE_DRAFT_REMEDIATION_BATCH_V1",
        "revisionLayer": "DRAFT_REMEDIATION_BATCH_04",
        "status": "APPLIED_TO_NEW_CUMULATIVE_DRAFT_LAYER",
        "corrections": corrections,
        "historicalProposalStatusRemainsUnapplied": True,
        "parentCumulativeAppliedCorrectionCount": len(parent_applied),
        "newCorrectionCount": len(corrections),
        "cumulativeCorrectionCount": len(parent_applied) + len(corrections),
        "authorization": AUTH,
    }
    authored_review = {
        "phase": "2H.2J-R4",
        "status": "COMPLETE_WITH_REVIEW_ITEMS",
        "reviewKind": "AI_FULL_AUTHORED_BATCH_CONTENT_RE_REVIEW_NOT_OWNER_APPROVAL",
        "reviews": review["reviews"],
        "authorization": AUTH,
    }
    report = [
        "# Phase 2H.2J-R4 — Targeted DRAFT Remediation Batch 04",
        "",
        "Status: PARTIAL_WITH_REVIEW_ITEMS_AND_PRESERVED_REGRESSION_DIAGNOSTICS.",
        f"Parent Batch 03 fingerprint: {PARENT_FINGERPRINT}.",
        "Selection: 29 proposals from original authored batches 04 and 01; complete-batch review covered 55 Senses.",
        "Independent review: 22 eligible field corrections applied to a new cumulative DRAFT overlay; 7 proposals deferred; none rejected.",
        "Cumulative state: 40 applied corrections across 40 distinct revised Senses; 1,563 effective Senses and 1,020 authored groups.",
        f"Full-batch content review: {review['pass']} PASS, {review['review']} REVIEW, {review['fail']} FAIL. Historical QA and rights state are retained.",
        "The original projection, source proposal files, boundaries and accepted parent checkpoints remain unchanged.",
        "Bulk-500 default-mode regression remains a two-error cp1258 temporary-fixture decode failure; explicit UTF-8 mode passed 35/35.",
        "Legacy v2.2.0 remains 4/5 with its known release-tree diagnostic. Hybrid-100 v2.2.1 and external validation are recorded in verification-results.json.",
        "No database access, owner approval, rights clearance, canonical ID allocation, release change or Production operation occurred.",
        "See manifest.json for the Batch 04 fingerprint and artifact hashes.",
        "",
        "Recommended next step: re-rank the 77 still-unreviewed proposals from this current inventory; original batch 03 currently has the highest remaining density. Preserve all deferred, rejected, identity and boundary decisions.",
    ]
    outputs = {
        "accepted-parent-pins.json": encode(accepted_parent_pins(parent_manifest)),
        "candidate-inventory.json": encode(inventory_artifact),
        "batch-selection-receipt.json": encode(context["selection"]),
        "authored/eligibility-assessments.json": encode(eligibility),
        "authored/application-decisions.json": encode(application),
        "authored/full-batch-review-assessments.json": encode(authored_review),
        "applied-draft-corrections.json": encode(applied_artifact),
        "draft-revisions.json": encode({
            "schemaVersion": "OFFLINE_VERSIONED_CUMULATIVE_DRAFT_OVERLAY_V1",
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_04",
            "revision": 4,
            "parentProjection": PROJECTION_PATH.relative_to(ROOT).as_posix(),
            "records": revisions,
            "duplicateApplicationPolicy": "FAIL_CLOSED",
            "authorization": AUTH,
        }),
        "cumulative-remediated-effective-draft-projection.json": encode(projection),
        "cumulative-content-hash-mapping.json": encode(mapping),
        "full-batch-re-review.json": encode(review),
        "post-remediation-quality-audit.json": encode(post_audit),
        "deferred-and-rejected-proposals.json": encode(deferred_artifact),
        "remaining-remediation-queue.json": encode(remaining_queue),
        "validation-summary.json": encode(validation),
        "report.md": "\n".join(report) + "\n",
    }
    source_names = [
        "phase-2h2j-draft-remediation-pilot-01.py",
        "phase-2h2j-draft-remediation-batch-02.py",
        "phase-2h2j-draft-remediation-batch-03.py",
        "phase-2h2j-draft-remediation-batch-04.py",
        "phase-2h2j-draft-remediation-batch-04-test.py",
    ]
    source_hashes = {}
    for name in source_names:
        path = ROOT / "scripts" / name
        require(path.is_file(), "Missing Batch 04 source/test file: " + name)
        source_hashes["scripts/" + name] = sha_file(path)
    for source in original_inventory["originalSourceProposalFiles"]:
        source_hashes["proposal-source/" + source["path"]] = source["sha256"]
    manifest = {
        "phase": "2H.2J-R4",
        "batch": "TARGETED_DRAFT_REMEDIATION_BATCH_04",
        "parentCommit": PARENT_COMMIT,
        "remoteBaseline": PARENT_COMMIT,
        "parentBatch03Fingerprint": PARENT_FINGERPRINT,
        "parentBatch02Fingerprint": batch02_manifest["fingerprint"],
        "parentPilot01Fingerprint": pilot_manifest["fingerprint"],
        "parentAggregateAuditFingerprint": parent_manifest["parentAggregateAuditFingerprint"],
        "parentFinalHandoffFingerprint": parent_manifest["parentFinalHandoffFingerprint"],
        "selectedCandidateCount": 29,
        "eligibleCandidateCount": 22,
        "deferredCandidateCount": 7,
        "rejectedCandidateCount": 0,
        "appliedCorrectionCount": 22,
        "cumulativeAppliedCorrectionCount": 40,
        "newlyRevisedSenseCount": 22,
        "cumulativeRevisedSenseCount": 40,
        "effectiveDraftSenseCount": 1563,
        "authoredGroupCount": 1020,
        "fullBatchCount": 2,
        "fullBatchSenseCount": 55,
        "fullBatchReviewCounts": {"PASS": review["pass"], "REVIEW": review["review"],
                                  "FAIL": review["fail"]},
        "artifactHashes": {name: sha_bytes(content.encode("utf-8"))
                           for name, content in sorted(outputs.items())},
        "sourceHashes": source_hashes,
        "contentStatus": "DRAFT",
        "rights": "UNKNOWN_REVIEW_REQUIRED",
        "ownerApprovalsAdded": 0,
        "canonicalIdsAllocated": 0,
        "databaseAccess": "NONE",
        "databaseWrites": "NONE",
        "production": "UNTOUCHED",
        "releaseEligible": False,
        "detachedVerificationReceipt": {
            "path": "verification-results.json",
            "binding": "Detached actual-command results bind to the final manifest fingerprint and are excluded from the self-hash.",
        },
        "authorization": AUTH,
    }
    manifest["fingerprint"] = digest(manifest)
    outputs["manifest.json"] = encode(manifest)
    return outputs, manifest


def run(mode):
    if mode == "select":
        return persist_selection()
    outputs, manifest = build()
    summary = {
        "fingerprint": manifest["fingerprint"],
        "status": "PARTIAL_WITH_REVIEW_ITEMS_AND_PRESERVED_REGRESSION_DIAGNOSTICS",
        "selected": 29,
        "eligible": 22,
        "deferred": 7,
        "rejected": 0,
        "newCorrectionsApplied": 22,
        "cumulativeCorrectionsApplied": 40,
        "fullBatchSensesReviewed": 55,
    }
    if mode == "preview":
        return {**summary, "zeroWrites": True}
    if mode == "prepare":
        allowed = {WS / name for name in outputs}
        verification = WS / "verification-results.json"
        existing = {path for path in WS.rglob("*") if path.is_file()}
        require(existing.issubset(allowed | {verification}),
                "Unexpected out-of-scope Batch 04 checkpoint file")
        for name, content in outputs.items():
            path = WS / name
            require(not path.exists() or path.read_bytes().replace(b"\r\n", b"\n")
                    == content.encode("utf-8"),
                    "Refusing to overwrite a different Batch 04 artifact: " + name)
        for name, content in outputs.items():
            path = WS / name
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(content.encode("utf-8"))
        return {**summary, "status": "PREPARED",
                "artifactCount": len(outputs), "zeroWrites": False}
    if mode == "check":
        for name, content in outputs.items():
            path = WS / name
            require(path.is_file() and path.read_bytes().replace(b"\r\n", b"\n")
                    == content.encode("utf-8"),
                    "Batch 04 deterministic replay drift: " + name)
        verify_path = WS / "verification-results.json"
        require(verify_path.is_file(), "Detached verification receipt is required for --check")
        receipt = read(verify_path)
        require(receipt.get("batch04Fingerprint") == manifest["fingerprint"]
                and receipt.get("status") == "PASS_WITH_RECORDED_DIAGNOSTICS"
                and receipt.get("zeroWriteReplaySeeds") == ["20261010", "271828"],
                "Detached verification receipt does not bind to this Batch 04 build")
        expected_files = {WS / name for name in outputs} | {verify_path}
        actual_files = {path for path in WS.rglob("*") if path.is_file()}
        require(actual_files == expected_files,
                "Unexpected or missing Batch 04 checkpoint file")
        return {**summary, "zeroWrites": True}
    raise ValueError("Unknown Batch 04 operation")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--select", action="store_true")
    mode.add_argument("--preview", action="store_true")
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    selected_mode = ("select" if args.select else "preview" if args.preview
                     else "prepare" if args.prepare else "check")
    print(encode(run(selected_mode)), end="")


if __name__ == "__main__":
    main()
