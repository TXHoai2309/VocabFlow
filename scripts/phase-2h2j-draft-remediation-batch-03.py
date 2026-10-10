#!/usr/bin/env python3
"""Offline, additive Phase 2H.2J-R3 DRAFT remediation checkpoint."""

import argparse
import codecs
import copy
import hashlib
import importlib.util
import json
import locale
import os
import subprocess
import sys
import tempfile
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-03"
B2_WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-02"
PILOT_WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/pilot-01"
AUDIT = ROOT / "vocabflow-dataset/workspaces/master-editorial-aggregate-qa"
CP07 = ROOT / "vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-07"
PARENT_COMMIT = "2ac4c996c18ea0a54f876692894f8bd6ca7de45f"
PARENT_B2_FINGERPRINT = "b3d1335e717ab307d0f5b14dcc811c4e5217f94bd98f26898add9eea68dca84e"
PARENT_PILOT_FINGERPRINT = "7b7e93bd26bcbac1d18e02b52b929e382722223c67bbe7455bbf9caf1d3a4283"
PARENT_AUDIT_FINGERPRINT = "9c90d8c2f2b964e128e19c5db807336d754573467f7f783a8a666e54a242ed77"
PARENT_HANDOFF_FINGERPRINT = "862be642a7223396f43664ca8604d986a5c1f5cbad91c9ab295492f819ff4ed8"
FROZEN_COHORT = "2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44"
ORIGINAL_INDEX = AUDIT / "effective-sense-index.json"
DECODE_FIXTURE = ROOT / "vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-02/resume-selection-receipt.json"
DECODE_TEST = ROOT / "scripts/phase-2h2h-bulk-500-resume-test.py"
DECODE_SCRIPT = ROOT / "scripts/phase-2h2h-bulk-500-resume.py"
VERIFY_FILE = "verification-results.json"

APPLIED_BEFORE = {
    "2H2I-R1-P008", "2H2I-R1-P009", "2H2I-R1-P010",
    "2H2I-R1-P005", "2H2I-R1-P006", "2H2I-R1-P007",
}
PREVIOUSLY_DEFERRED = {"2H2I-R6-P001", "2H2I-P003", "2H2I-R3-P001"}
SELECTED_IDS = [
    "2H2I-P005", "2H2I-P006", "2H2I-P015",
    "2H2I-R2-P001", "2H2I-R2-P002", "2H2I-R2-P003",
    "2H2I-R2-P004", "2H2I-R2-P005", "2H2I-R2-P006",
    "2H2I-R2-P007", "2H2I-R2-P008", "2H2I-R2-P009",
    "2H2I-R2-P010", "2H2I-R2-P011", "2H2I-R2-P012",
    "2H2I-R2-P013", "2H2I-R2-P014", "2H2I-R2-P015",
    "2H2I-R2-P016", "2H2I-R2-P017", "2H2I-R2-P018",
    "2H2I-R2-P019",
]
APPLY_IDS = {
    "2H2I-P005", "2H2I-P006", "2H2I-P015",
    "2H2I-R2-P001", "2H2I-R2-P003", "2H2I-R2-P004",
    "2H2I-R2-P005", "2H2I-R2-P007", "2H2I-R2-P008",
    "2H2I-R2-P009", "2H2I-R2-P015", "2H2I-R2-P017",
}
DEFER_SEMANTIC = {"2H2I-R2-P002", "2H2I-R2-P006", "2H2I-R2-P016"}
DEFER_IDENTITY = {
    "2H2I-R2-P010", "2H2I-R2-P012", "2H2I-R2-P013",
    "2H2I-R2-P018", "2H2I-R2-P019",
}
DEFER_EVIDENCE = {"2H2I-R2-P014"}
REJECT_AFTER = {"2H2I-R2-P011"}
MAX_CANDIDATES = 40
MAX_APPLIED = 25
MAX_BATCHES = 10

REVIEW_DIMENSIONS = [
    "grammar", "meaningPreservation", "englishNaturalness",
    "vietnameseFaithfulness", "posAndConstruction", "sourceEvidence",
    "priorCorrectionLineage", "historicalQa", "siblingSenseConsistency",
    "rightsAndOriginalitySignals",
]
FIELD_REVIEW_DIMENSIONS = [
    "grammar", "meaningPreservation", "englishNaturalness",
    "vietnameseFaithfulness", "posAndConstruction", "sourceEvidence",
    "noOtherFieldRequired", "noBoundaryOrIdentityChange",
]
AUTH = {
    "phase": "2H.2J-R3", "contentStatus": "DRAFT",
    "ownerApprovalsAdded": 0, "canonicalIdsAllocated": 0,
    "rightsClearanceAdded": 0, "rights": "UNKNOWN_REVIEW_REQUIRED",
    "databaseAccess": "NONE", "databaseWrites": "NONE",
    "masterReleaseChanged": False, "legacyModified": False,
    "production": "UNTOUCHED", "publicationEligible": False,
}

# Each assessment records a concrete linguistic decision, not a generic AI PASS.
ELIGIBILITY_DECISIONS = {
    "2H2I-P005": ("APPLY_ELIGIBLE", "Câu gốc dùng have to + động từ nguyên mẫu để diễn tả nghĩa vụ; bản dịch 'phải đi sớm' giữ đúng sắc thái. AFTER phân biệt đúng has to ở ngôi thứ ba số ít và sự không cần thiết với cấm đoán; ví dụ have to leave remains consistent. Không sửa POS hay mở Sense mới."),
    "2H2I-P006": ("APPLY_ELIGIBLE", "Cách dùng two billion dollars và billions of diễn tả đúng dạng số xác định/không xác định; ví dụ more than a billion dollars và bản dịch 'hơn một tỷ đô la' giữ cùng lượng. Chỉ thay grammar note; partOfSpeech OTHER cùng cảnh báo phân loại NUMBER vẫn được giữ nguyên trong hồ sơ nguồn/QA, không phê duyệt đổi POS."),
    "2H2I-P015": ("APPLY_ELIGIBLE", "Định nghĩa bao gồm tác phẩm in và nội dung số; borrow a book about birds cùng bản dịch cuốn sách về chim thể hiện danh từ đếm được. AFTER chỉ thay bình luận so sánh identity bằng mẫu countable và nêu lại hai dạng đã có trong definition; không kết luận danh tính với Sense book/booking nào."),
    "2H2I-R2-P001": ("APPLY_ELIGIBLE", "Va li không vừa chỗ ngồi minh họa kích thước lớn, khớp nghĩa và bản dịch. AFTER nêu đúng vị trí trước danh từ/sau linking verb và dạng so sánh big/bigger/biggest; không trộn với nghĩa figurative big decision ở Sense anh em."),
    "2H2I-R2-P002": ("DEFER_SEMANTIC_RISK", "Definition hiện hành chọn khoảng cách dọc phố, nhưng source draft trước đây gộp khu phố và độ dài một cạnh; thay BEFORE còn giữ cảnh báo Sense diện tích và ranh giới đó. AFTER bỏ cảnh báo này, đồng thời khẳng định độ dài thay đổi theo phố/thành phố. Cần owner/nguồn quyết định phạm vi trước khi xóa ghi chú; chưa áp dụng."),
    "2H2I-R2-P003": ("APPLY_ELIGIBLE", "Cành cây chặn lối đi, bản dịch nêu cùng vật cản và lối bị chắn. AFTER cung cấp object chuyển tiếp road/path/entrance cùng biến tố regular, không thêm nghĩa phố hay ảnh hưởng Sense danh từ block."),
    "2H2I-R2-P004": ("APPLY_ELIGIBLE", "Đặt bàn cho sáu người khớp cấu trúc đặt trước và câu tiếng Việt. AFTER cho khung ngoại động book a ticket/room/table; cụm for a date/number of people được câu hiện tại làm ví dụ, không đổi nghĩa reserve."),
    "2H2I-R2-P005": ("APPLY_ELIGIBLE", "Bát là vật đếm được; pour soup into a bowl khớp ví dụ và bản dịch. AFTER giữ countability, collocation a bowl of soup/into a bowl và số nhiều bowls; không đưa động từ thi đấu bowl vào nghĩa này."),
    "2H2I-R2-P006": ("DEFER_SEMANTIC_RISK", "Ví dụ broadly applicable across departments phù hợp nghĩa áp dụng trên nhiều lĩnh vực. AFTER còn bổ sung broadly supported và 'acceptance' cùng người, trong khi nguồn/định nghĩa hiện tại không chứng minh collocation hay sắc thái chấp nhận đó; ranh giới với broadly speaking/generally cũng còn mở. Giữ nguyên note hiện tại cho tới khi có rà soát từ vựng sâu hơn."),
    "2H2I-R2-P007": ("APPLY_ELIGIBLE", "Ví dụ five bucks là danh từ đếm được khẩu ngữ và bản dịch giữ giá năm đô la nhưng không tự gán quốc gia/loại dollar. AFTER diễn tả đúng số ít/số nhiều và giữ yêu cầu dựa vào ngữ cảnh để biết loại tiền; không thêm nghĩa con vật/động từ."),
    "2H2I-R2-P008": ("APPLY_ELIGIBLE", "Cáp nối màn hình với máy tính khớp định nghĩa bó dây truyền tín hiệu, ví dụ và bản dịch. AFTER thêm mẫu danh từ đếm được, connecting two devices và with a cable; không mở rộng sang dây chịu lực."),
    "2H2I-R2-P009": ("APPLY_ELIGIBLE", "Definition và bản dịch nêu nhất quán CO₂; câu ví dụ nói thực vật sử dụng khí này. AFTER chỉ hướng dẫn danh từ thường không đếm được và dùng molecule khi đếm từng đơn vị, không sửa hay mở rộng khẳng định khoa học trong definition. Cảnh báo subject-review và provenance vẫn được lưu riêng."),
    "2H2I-R2-P010": ("DEFER_POS_OR_IDENTITY", "AFTER phân tích cosmopolitan city như một noun phrase và số nhiều cosmopolitan cities, nhưng chính BEFORE ghi owner chưa quyết định đây là Lexeme hay construction/example. Dù câu mẫu đúng, dùng AFTER sẽ ngầm chốt cách biểu diễn lexical; cần owner quyết định trước."),
    "2H2I-R2-P011": ("REJECT_INCORRECT_AFTER", "AFTER có câu 'Gas emissions names substances released into the air' sai hòa hợp chủ-vị (emissions name) và nói về emission chứ không phải grammar/collocation của greenhouse gas. Không áp dụng; giữ nguyên Sense DRAFT và ghi nhận cần một đề xuất khác có nội dung đúng."),
    "2H2I-R2-P012": ("DEFER_POS_OR_IDENTITY", "Định nghĩa và ví dụ lamp/light khớp danh từ đếm được, nhưng source identity cho nhóm light còn owner-reviewed exclusion và nghĩa anh em chưa được xử lý. AFTER xóa dấu vết đối chiếu Master khỏi trường hiện tại. Dù metadata sẽ còn nguyên, chưa gộp xử lý identity vào pilot này."),
    "2H2I-R2-P013": ("DEFER_POS_OR_IDENTITY", "Ví dụ lit the candle khớp nghĩa ngoại động 'thắp nến'; dạng lit/lighted là biến thể được đề xuất hợp lý. Tuy nhiên nhóm light vẫn mang owner-reviewed exclusion/identity review đang mở. Giữ nguyên nội dung và decision trail đến khi identity scope được rà soát cùng nhóm anh em."),
    "2H2I-R2-P014": ("DEFER_INSUFFICIENT_EVIDENCE", "Câu record an interview hỗ trợ ngoại động, nhưng AFTER đưa khẳng định trọng âm danh từ/động từ trong khi chính BEFORE yêu cầu pronunciation review và source evidence không cung cấp pronunciation. Không suy ra trọng âm từ đây; không áp dụng một phần vì proposal là một field thay thế nguyên khối."),
    "2H2I-R2-P015": ("APPLY_ELIGIBLE", "Office keeps a record of every equipment repair cùng bản dịch chỉ hồ sơ lưu về mỗi lần sửa chữa. AFTER nêu countable record, plural records và of + đối tượng thông tin; câu cuối là learner-facing complement guidance, không đưa Sense đĩa ghi âm vào nội dung."),
    "2H2I-R2-P016": ("DEFER_SEMANTIC_RISK", "Ví dụ generator ran quietly là ngoại động? Ở đây run dùng nội động, khớp máy phát điện tự chạy. AFTER thêm run a program là khung chuyển tiếp, có thể làm mờ khác biệt operation/function đã được ghi là cần boundary review; chưa đưa cấu trúc ấy vào grammar note."),
    "2H2I-R2-P017": ("APPLY_ELIGIBLE", "Gia đình điều hành tiệm bánh khớp nghĩa quản lý tổ chức và bản dịch. AFTER giữ tân ngữ business/organization và nêu đúng bất quy tắc run–ran–run; không gộp với Sense di chuyển nhanh hay Sense máy hoạt động."),
    "2H2I-R2-P018": ("DEFER_POS_OR_IDENTITY", "Ví dụ fill a glass with water và bản dịch xác nhận nghĩa chất lỏng không đếm được. Tuy nhiên BEFORE chứa quyết định owner-reviewed rằng runtime #11 không đồng nhất với cặp Master bị loại trừ; việc xóa câu đó khỏi note lúc này cần re-review chung cặp noun/verb. Không đổi #11 hoặc identity state."),
    "2H2I-R2-P019": ("DEFER_POS_OR_IDENTITY", "We watered the young trees khớp nghĩa tưới cây, bản dịch và khung ngoại động. Nhưng ghi chú hiện tại lưu rõ cặp verb này từng được owner loại khỏi quan hệ Master cụ thể; không thay nội dung có thể che mờ nghĩa của quyết định đó trước khi rà soát cặp. Không cấp hay thay identity."),
}

# Full original-batch review notes are written individually after inspecting every
# Sense, bilingual example, note, POS, source evidence and sibling in batch 05.
FULL_REVIEW = {
    "EDITORIAL_2H2B:big:important": ("PASS", "Moving to a new city as a big decision supports the figurative effect/importance sense; the Vietnamese sentence says the move was an important decision. It remains distinct from the physical-size adjective."),
    "EDITORIAL_2H2B:big:large": ("PASS", "The suitcase example and Vietnamese translation both concern physical size. The revised adjective-position and comparative forms are grammatical and do not intrude on the separate figurative decision sense."),
    "EDITORIAL_2H2B:billion:large-number": ("REVIEW", "The numerical definition, dollar example and Vietnamese billion meaning align, and the applied note's usage statement is correct. Keep REVIEW because the source NUMBER versus local OTHER/Master POS classification remains unresolved; no POS conversion was made."),
    "EDITORIAL_2H2B:bite:injury": ("PASS", "The insect mark at the ankle and Vietnamese bite/sting wording match the injury sense; the countable note avoids diagnosis or treatment claims and stays apart from a mouthful."),
    "EDITORIAL_2H2B:bite:small-mouthful": ("PASS", "A bite of sandwich and the Vietnamese one-piece eating action match the small portion sense; the note's of-construction preserves its boundary from a wound."),
    "EDITORIAL_2H2B:bite:use-teeth": ("PASS", "The puppy biting the cushion is a physical teeth action in both languages; bite–bit–bitten is correct and the note separates action from injury and food portion."),
    "EDITORIAL_2H2B:block:obstruct": ("PASS", "A fallen branch physically obstructs a narrow path; the Vietnamese sentence names the same branch and route. The revised transitive objects and regular forms fit this verb sense, separate from noun block."),
    "EDITORIAL_2H2B:block:solid-piece": ("PASS", "A block of wood is a solid material piece, and the Vietnamese khối gỗ matches. The of + material pattern preserves the distinction from street distance."),
    "EDITORIAL_2H2B:block:street-section": ("REVIEW", "The current Sense and its two-blocks example use distance between intersections, with a faithful Vietnamese explanation. Source history also covered an enclosed town area; the deferred correction retains this boundary uncertainty for owner/source review."),
    "EDITORIAL_2H2B:book:reserve": ("PASS", "Booking a table for six matches arranging a restaurant place in advance; Vietnamese đặt trước a table with the same number. The new object and for-phrase patterns fit without assigning a canonical identity."),
    "EDITORIAL_2H2B:book:written-volume": ("PASS", "Borrowing a book about birds matches the written-volume definition and cuốn sách in Vietnamese; printed/digital scope remains in the definition. Countability is correct and no booking identity is inferred."),
    "EDITORIAL_2H2B:bowl:dish": ("PASS", "The soup is poured into a blue bowl and the Vietnamese describes the same container. Countable a bowl, bowl of soup and regular bowls plural are consistent with the noun sense."),
    "EDITORIAL_2H2B:bread:baked-food": ("PASS", "Fresh bread at family breakfast and bánh mì in the translation match the food sense; loaf/slice correctly offer count units while the substance remains ordinarily uncountable."),
    "EDITORIAL_2H2B:broadly:in-general": ("PASS", "Broadly speaking introduces a summary of two plans rather than spatial width; the Vietnamese mở đầu nói một cách khái quát preserves that discourse use."),
    "EDITORIAL_2H2B:broadly:widely": ("REVIEW", "Broadly applicable across departments and the Vietnamese rộng rãi ở nhiều phòng ban support wide scope. The proposed expansion with broadly supported and acceptance is deferred because collocational and boundary evidence is insufficient."),
    "EDITORIAL_2H2B:buck:dollar": ("PASS", "Five bucks for a notebook is an informal countable dollar use; Vietnamese năm đô la retains amount without inventing which national currency. The revised singular/plural note is accurate."),
    "EDITORIAL_2H2B:cable:wire-bundle": ("PASS", "The damaged cable connects screen and computer; the Vietnamese names the same connection. Countable noun, connecting phrase and with a cable pattern fit the defined wire/fibre bundle."),
    "EDITORIAL_2H2B:carbon dioxide:gas": ("REVIEW", "The plant-use example and Vietnamese translation agree on carbon dioxide, and the applied note addresses uncountability without altering chemistry. Preserve REVIEW because scientific subject review for the inherited definition/formula remains pending."),
    "EDITORIAL_2H2B:coral reef:marine-formation": ("PASS", "Fish shelter in the coral reef in both languages; the ridge/structure definition describes the marine formation rather than one living coral animal, matching the countable compound note."),
    "EDITORIAL_2H2B:cosmopolitan city:diverse-city": ("REVIEW", "The port-city example and Vietnamese translation convey multiple cultural communities. The expression remains compositional and the Lexeme-versus-construction identity decision is unresolved; the note proposal is deferred."),
    "EDITORIAL_2H2B:fossil fuel:ancient-organic-fuel": ("PASS", "Coal, oil and natural gas fit the fuel category formed from ancient organic matter; the factory's fossil-fuels sentence and Vietnamese wording agree on reducing dependence."),
    "EDITORIAL_2H2B:greenhouse gas:heat-trapping-gas": ("REVIEW", "Methane as a greenhouse gas is consistent with the definition and translation. The proposed replacement was rejected for subject–verb agreement and relevance; scientific subject review stays pending and the field is unchanged."),
    "EDITORIAL_2H2B:have to:necessity": ("REVIEW", "The early departure example and Vietnamese 'phải đi sớm' express obligation; the revised note correctly distinguishes lack of necessity from prohibition. Keep REVIEW because the historical semi-modal/polarity grouping decision remains open and unchanged."),
    "EDITORIAL_2H2B:light:illumination": ("REVIEW", "Morning light entering through a window and ánh sáng buổi sáng match illumination, distinct from the lamp device. The owner-reviewed identity exclusions for the light family remain unresolved, so no group-level identity is inferred."),
    "EDITORIAL_2H2B:light:lamp": ("REVIEW", "Switch off the hallway light and tắt đèn hành lang identify a countable lighting device. The proposed note is deferred; owner-reviewed source exclusions across light senses remain intact."),
    "EDITORIAL_2H2B:light:low-weight": ("REVIEW", "The empty basket is light enough to carry and the Vietnamese says it is light in weight; this adjective remains distinct from pale colour. Preserve the unresolved owner-reviewed family identity state."),
    "EDITORIAL_2H2B:light:ignite": ("REVIEW", "Lighting the candle matches thắp nến and the transitive cause-to-burn definition. The field proposal is deferred with the family identity issue; no hazardous procedure or identity mapping is added."),
    "EDITORIAL_2H2B:light:pale-colour": ("REVIEW", "Light blue shirt and áo sơ mi xanh nhạt consistently express pale colour, not low weight. The sibling boundary is clear in content, while owner-reviewed light-family identity exclusions stay pending."),
    "EDITORIAL_2H2B:record:best-result": ("REVIEW", "Set a school record and lập kỷ lục mới refer to an achieved best result; set/break collocations fit. Master identity candidates for the broader record family remain unresolved."),
    "EDITORIAL_2H2B:record:capture-information": ("REVIEW", "Recording the interview with permission and ghi âm cuộc phỏng vấn match storing sound for later use. The proposal's stress claim lacks pronunciation evidence, and information-capture subtypes remain under review."),
    "EDITORIAL_2H2B:record:stored-information": ("REVIEW", "A record of every equipment repair and the Vietnamese hồ sơ về mỗi lần sửa chữa fit stored information; the revised count and of-pattern are grammatical. Keep REVIEW because the broader record family still has unresolved Master candidates."),
    "EDITORIAL_2H2B:run:move-fast": ("PASS", "Children ran across a field to meet a teacher and the Vietnamese says they ran; irregular run/ran/run and the motion sense remain distinct from managing a business."),
    "EDITORIAL_2H2B:run:operate": ("REVIEW", "The generator running quietly and its Vietnamese machine-running translation are intransitive operation. The selected replacement is deferred because it adds a transitive program construction while the source boundary remains open."),
    "EDITORIAL_2H2B:run:manage": ("PASS", "A family runs a bakery matches organizing its work and the Vietnamese điều hành a bakery. The applied note gives the transitive organization frame and run–ran–run without merging physical motion."),
    "EDITORIAL_2H2B:run:exercise-session": ("PASS", "Their Sunday run ending beside a lighthouse is an outing/session, and the Vietnamese buổi chạy matches; go for a run is countable and distinct from the verb siblings."),
    "EDITORIAL_2H2B:water:liquid": ("REVIEW", "Water from a jug fills a glass and the Vietnamese identifies nước; uncountability and a glass of water fit. Preserve the owner-reviewed exclusion involving runtime #11 and the Master verb pair."),
    "EDITORIAL_2H2B:water:give-water": ("REVIEW", "Watering young trees is a transitive plant-care action, faithfully translated; the proposed forms/object examples are linguistically sound. The paired owner-reviewed #11 exclusion remains unresolved, so no identity disposition is inferred."),
}


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


def sha_file(path):
    return sha_bytes(Path(path).read_bytes())


def stable_sha(path):
    return sha_bytes(Path(path).read_bytes().replace(b"\r\n", b"\n"))


def digest(value):
    return sha_bytes(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                separators=(",", ":")).encode("utf-8"))


def text_sha(value):
    return sha_bytes(value.encode("utf-8"))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def git_bytes(*args):
    return subprocess.run(["git", *args], cwd=ROOT, check=True,
                          stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout


def git_text(*args):
    return git_bytes(*args).decode("utf-8").strip()


def invalid_utf8_offsets(data):
    try:
        data.decode("utf-8", errors="strict")
        return []
    except UnicodeDecodeError as exc:
        return [exc.start]


def diagnose_decode_fixture():
    rel = DECODE_FIXTURE.relative_to(ROOT).as_posix()
    tracked = DECODE_FIXTURE.read_bytes()
    parent = git_bytes("show", f"{PARENT_COMMIT}:{rel}")
    head = git_bytes("show", f"HEAD:{rel}")
    index = git_bytes("cat-file", "blob", f":{rel}")
    parent_blob = git_text("rev-parse", f"{PARENT_COMMIT}:{rel}")
    head_blob = git_text("rev-parse", f"HEAD:{rel}")
    index_blob = git_text("rev-parse", f":{rel}")
    require(tracked == parent == head == index,
            "Protected bulk-500 fixture bytes differ from Batch 02 parent/index/HEAD")
    fixture_invalid = invalid_utf8_offsets(tracked)
    require(not fixture_invalid, "Tracked checkpoint-02 receipt is not valid UTF-8")

    locale_encoding = locale.getpreferredencoding(False)
    with tempfile.TemporaryDirectory(prefix="vocabflow-r3-decode-") as temp:
        probe = Path(temp) / "resume-selection-receipt.json"
        probe.write_text(tracked.decode("utf-8"))
        probe_bytes = probe.read_bytes()
        probe_invalid = invalid_utf8_offsets(probe_bytes)
        try:
            probe.read_text(encoding="utf-8")
            raised = None
        except UnicodeDecodeError as exc:
            raised = {"byteOffset": exc.start, "byte": probe_bytes[exc.start],
                      "reason": exc.reason}
    require(locale_encoding.casefold() != "utf-8" and raised is not None
            and raised["byte"] == 0x92 and raised["byteOffset"] == 12585,
            "Environment-specific cp1258 decode reproduction changed; fail closed")
    cp1252_character = bytes([0x92]).decode("cp1252")
    require(cp1252_character == "\u2019", "Diagnostic single-byte interpretation changed")
    return {
        "gate": "A", "outcome": "ENVIRONMENT_SPECIFIC_DECODING_DEFECT_CONFIRMED",
        "observedFailure": {
            "command": "python -B scripts/phase-2h2h-bulk-500-resume-test.py",
            "result": "35 tests; 2 errors; both UnicodeDecodeError",
            "affectedTests": [
                {"method": "test_unreviewed_batch_cannot_seal", "testFileLine": 156,
                 "failingCall": "r.seal_batch(2,21)"},
                {"method": "test_seal_respects_declared_review_and_binds_decisions",
                 "testFileLine": 167, "failingCall": "r.seal_batch(2,21)"},
            ],
            "stack": [
                "phase-2h2h-bulk-500-resume-test.py: fixture writes r.encode(self.receipt) with Path.write_text and no encoding",
                "phase-2h2h-bulk-500-resume.py: seal_batch(2,21) reads resume-selection-receipt.json",
                "phase-2h2b-editorial-draft.py:25: load() calls path.read_text(encoding='utf-8')",
                "UnicodeDecodeError: byte 0x92 at absolute offset 12585 in the temporary locale-encoded fixture",
            ],
        },
        "trackedFixture": {
            "path": rel, "byteLength": len(tracked), "sha256": sha_bytes(tracked),
            "gitBlobAtBatch02Parent": parent_blob, "gitBlobAtCurrentHead": head_blob,
            "gitBlobInIndex": index_blob, "workingTreeEqualsIndexHeadAndParent": True,
            "strictUtf8Valid": True, "invalidUtf8ByteOffsets": fixture_invalid,
            "encoding": "UTF-8",
        },
        "temporaryDefaultEncodingReproduction": {
            "pythonVersion": sys.version.split()[0],
            "localePreferredEncoding": locale_encoding,
            "utf8Mode": sys.flags.utf8_mode,
            "pathWriteTextEncodingArgument": "omitted; runtime default",
            "temporaryFileStrictUtf8InvalidOffsets": probe_invalid,
            "strictReaderError": raised,
            "diagnosticWindows1252InterpretationOf0x92": cp1252_character,
            "sourceFormatWasNotChanged": True,
        },
        "parentRegressionComparison": {
            "parentCommit": PARENT_COMMIT,
            "testGitBlobAtParent": git_text("rev-parse", f"{PARENT_COMMIT}:scripts/phase-2h2h-bulk-500-resume-test.py"),
            "testGitBlobAtHead": git_text("rev-parse", "HEAD:scripts/phase-2h2h-bulk-500-resume-test.py"),
            "resumeScriptGitBlobAtParent": git_text("rev-parse", f"{PARENT_COMMIT}:scripts/phase-2h2h-bulk-500-resume.py"),
            "resumeScriptGitBlobAtHead": git_text("rev-parse", "HEAD:scripts/phase-2h2h-bulk-500-resume.py"),
            "helperGitBlobAtParent": git_text("rev-parse", f"{PARENT_COMMIT}:scripts/phase-2h2b-editorial-draft.py"),
            "helperGitBlobAtHead": git_text("rev-parse", "HEAD:scripts/phase-2h2b-editorial-draft.py"),
            "sameParentInputsAndCodeReproduceFailure": True,
            "classification": "tracked fixture valid UTF-8; temporary test fixture is encoded with Windows default cp1258 before a strict UTF-8 read",
        },
        "mutations": {"repositoryFixtureModified": False, "testOrSourceModified": False,
                      "replacementCharacterDecodingAdded": False},
        "interpretation": "The byte 0x92 is absent from every tracked receipt offset; it is introduced by the test's omitted encoding argument under the observed cp1258 locale. Batch-02 parent source and fixture reproduce the same failure.",
    }


def verify_parent_replays():
    pilot = module("r3_pilot01_parent", ROOT / "scripts/phase-2h2j-draft-remediation-pilot-01.py")
    pilot_result = pilot.run(True)
    require(pilot_result["fingerprint"] == PARENT_PILOT_FINGERPRINT
            and pilot_result["zeroWrites"] is True,
            "Pilot 01 replay failed")
    b2 = module("r3_batch02_parent", ROOT / "scripts/phase-2h2j-draft-remediation-batch-02.py")
    b2_result = b2.run(True)
    require(b2_result["fingerprint"] == PARENT_B2_FINGERPRINT
            and b2_result["zeroWrites"] is True,
            "Batch 02 replay failed")
    audit = module("r3_aggregate_parent", ROOT / "scripts/phase-2h2i-aggregate-qa-checkpoint-07.py")
    audit_result = audit.run(True)
    require(audit_result["fingerprint"] == PARENT_AUDIT_FINGERPRINT
            and audit_result["finalHandoffFingerprint"] == PARENT_HANDOFF_FINGERPRINT
            and audit_result["zeroWrites"] is True,
            "Aggregate checkpoint-07 replay failed")
    b2_manifest = read(B2_WS / "manifest.json")
    pilot_manifest = read(PILOT_WS / "manifest.json")
    audit_manifest = read(CP07 / "manifest.json")
    handoff = read(CP07 / "final-handoff-manifest.json")
    require(b2_manifest["fingerprint"] == PARENT_B2_FINGERPRINT
            and b2_manifest["cumulativeAppliedCorrectionCount"] == 6
            and pilot_manifest["fingerprint"] == PARENT_PILOT_FINGERPRINT
            and audit_manifest["fingerprint"] == PARENT_AUDIT_FINGERPRINT
            and handoff["fingerprint"] == PARENT_HANDOFF_FINGERPRINT,
            "Accepted parent manifest fingerprints or cumulative ledger drift")
    return {"pilot01": pilot_result, "batch02": b2_result,
            "aggregateCheckpoint07": audit_result}


def source_inventory(b2):
    """Pin the 1,020 original author groups across 2B, 2C, 2D and 2H cohorts."""
    indexed = defaultdict(list)
    pins = []

    def add(label, batch_number, group_keys, sense_count, references):
        item = {"sourceCheckpoint": label, "batch": batch_number,
                "groupKeys": sorted(group_keys), "groupCount": len(set(group_keys)),
                "senseCount": sense_count, "sourceReferences": references}
        pins.append(item)
        for group in set(group_keys):
            indexed[group].append(item)

    # Phase 2H.2B original editorial pilot has five explicitly frozen batches.
    pilot_base = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-pilot"
    pilot_batches_path = pilot_base / "editorial-draft-batches.json"
    pilot_batches = read(pilot_batches_path)
    for batch in pilot_batches["batches"]:
        number = int(batch["batchKey"].rsplit("_", 1)[1])
        authored = pilot_base / batch["authoredSource"]
        keys = batch["groupKeys"]
        sense_count = sum(
            1 for line in authored.read_text(encoding="utf-8").splitlines() if line.strip()
        )
        add("master-editorial-draft-pilot", number, keys, sense_count, {
            "batchInventory": {"path": pilot_batches_path.relative_to(ROOT).as_posix(),
                               "sha256": sha_file(pilot_batches_path)},
            "authoredPsv": {"path": authored.relative_to(ROOT).as_posix(),
                            "sha256": sha_file(authored)},
        })

    # Stratified-120 batch membership is reconstructed from the accepted authored PSV files.
    c_base = ROOT / "vocabflow-dataset/workspaces/master-editorial-stratified-120"
    cohort_path = c_base / "selected-cohort.json"
    cohort = read(cohort_path)
    group_by_headword = {item["normalizedHeadword"]: item["candidateGroupKey"]
                         for item in cohort["groups"]}
    for authored in sorted((c_base / "authored").glob("batch-*.psv")):
        rows = [line.split("|") for line in authored.read_text(encoding="utf-8").splitlines()
                if line.strip()]
        keys = sorted({group_by_headword[parts[0].strip()] for parts in rows})
        add("master-editorial-stratified-120", int(authored.stem.split("-")[1]),
            keys, len(rows), {
                "selectedCohort": {"path": cohort_path.relative_to(ROOT).as_posix(),
                                   "sha256": sha_file(cohort_path)},
                "manifest": {"path": (c_base / "manifest.json").relative_to(ROOT).as_posix(),
                             "sha256": sha_file(c_base / "manifest.json")},
                "qualityAudit": {"path": (c_base / "quality-audit.json").relative_to(ROOT).as_posix(),
                                 "sha256": sha_file(c_base / "quality-audit.json")},
                "authoredPsv": {"path": authored.relative_to(ROOT).as_posix(),
                                "sha256": sha_file(authored)},
            })

    # Bulk-300 batches pin their own group manifest and authored source.
    d_base = ROOT / "vocabflow-dataset/workspaces/master-editorial-bulk-300"
    d_cohort_path = d_base / "selected-cohort.json"
    for authored_json in sorted((d_base / "authored").glob("batch-*.json")):
        batch_data = read(authored_json)
        authored_psv = authored_json.with_suffix(".psv")
        add("master-editorial-bulk-300", batch_data["batch"], batch_data["groupKeys"],
            batch_data["senseCount"], {
                "selectedCohort": {"path": d_cohort_path.relative_to(ROOT).as_posix(),
                                   "sha256": sha_file(d_cohort_path)},
                "manifest": {"path": (d_base / "manifest.json").relative_to(ROOT).as_posix(),
                             "sha256": sha_file(d_base / "manifest.json")},
                "qualityAudit": {"path": (d_base / "quality-audit.json").relative_to(ROOT).as_posix(),
                                 "sha256": sha_file(d_base / "quality-audit.json")},
                "authoredBatchJson": {"path": authored_json.relative_to(ROOT).as_posix(),
                                      "sha256": sha_file(authored_json)},
                "authoredPsv": {"path": authored_psv.relative_to(ROOT).as_posix(),
                                "sha256": sha_file(authored_psv)},
            })

    # The R2 parent already pins each original 2H batch at its introducing checkpoint.
    for key, batch in b2["batchPins"].items():
        add(batch["checkpoint"], batch["batch"], batch["groupKeys"],
            batch["senseCount"], {
                name: copy.deepcopy(batch[name])
                for name in ["qualityAudit", "effectiveProjection", "manifest",
                             "authoredJson", "authoredPsv", "reviewPsv"]
            })

    all_groups = {row["candidateGroupKey"] for row in b2["parentRows"].values()}
    require(len(indexed) == 1020 and set(indexed) == all_groups,
            "Original 1,020 group batch mapping is incomplete or out of scope")
    require(all(len(matches) == 1 for matches in indexed.values()),
            "An authored group maps to multiple original batches")
    return {key: matches[0] for key, matches in indexed.items()}, pins


def proposal_pointer_get(row, pointer):
    require(pointer.startswith("/"), "Only absolute JSON pointers are supported")
    current = row
    for raw in pointer[1:].split("/"):
        key = raw.replace("~1", "/").replace("~0", "~")
        current = current[int(key)] if isinstance(current, list) else current[key]
    return current


def proposal_pointer_set(row, pointer, value):
    parts = [part.replace("~1", "/").replace("~0", "~")
             for part in pointer[1:].split("/")]
    current = row
    for part in parts[:-1]:
        current = current[int(part)] if isinstance(current, list) else current[part]
    if isinstance(current, list):
        current[int(parts[-1])] = value
    else:
        current[parts[-1]] = value


def current_hash(row, pilot):
    return pilot.current_hash(row)


def load_context():
    parent_module = module("r3_batch02_helpers", ROOT / "scripts/phase-2h2j-draft-remediation-batch-02.py")
    parent = parent_module.load_context()
    proposal_rows = parent["proposals"]
    batch02_rows = read(B2_WS / "cumulative-remediated-effective-draft-projection.json")["records"]
    batch02_queue = read(B2_WS / "remaining-remediation-queue.json")
    require(len(batch02_rows) == 1563
            and len({row["proposalKey"] for row in batch02_rows}) == 1563
            and len({row["candidateGroupKey"] for row in batch02_rows}) == 1020,
            "Accepted Batch 02 cumulative parent projection identity/count drift")
    require(len(batch02_queue["boundaryProposals"]) == 8,
            "Accepted Batch 02 boundary proposal inventory drift")
    parent["parentRows"] = {row["proposalKey"]: row for row in batch02_rows}
    parent["boundaries"] = batch02_queue["boundaryProposals"]
    current_rows = parent["parentRows"]
    original_rows = parent["originalRows"]
    source_map, batch_sources = source_inventory(parent)
    require(isinstance(proposal_rows, list) and len(proposal_rows) == 141
            and len({row["correctionProposalId"] for row in proposal_rows}) == 141
            and len(parent["boundaries"]) == 8,
            "Historical proposal/boundary inventory drift")
    require(set(APPLIED_BEFORE).isdisjoint(SELECTED_IDS)
            and set(PREVIOUSLY_DEFERRED).isdisjoint(SELECTED_IDS),
            "A previously applied/deferred proposal was selected")
    require(set(SELECTED_IDS) == set(ELIGIBILITY_DECISIONS)
            and len(SELECTED_IDS) == len(set(SELECTED_IDS))
            and APPLY_IDS.isdisjoint(DEFER_SEMANTIC | DEFER_IDENTITY | DEFER_EVIDENCE | REJECT_AFTER)
            and set(SELECTED_IDS) == APPLY_IDS | DEFER_SEMANTIC | DEFER_IDENTITY | DEFER_EVIDENCE | REJECT_AFTER,
            "Authored selection/decision inventory is not exhaustive")
    for key, row in current_rows.items():
        require(current_hash(row, parent["pilot"]) == row["effectiveContentHash"],
                "Batch 02 current projection hash mismatch: " + key)
    return parent_module, parent, source_map, batch_sources


def category_for(proposal_id, proposal, row, source_batch, duplicate_keys,
                 prior_inventory_status):
    if proposal_id in APPLIED_BEFORE:
        return "ALREADY_APPLIED"
    if proposal_id in PREVIOUSLY_DEFERRED:
        return "PREVIOUSLY_DEFERRED"
    if row["effectiveContentHash"] != proposal["originalEffectiveContentHash"]:
        return "STALE_PARENT_REVISION"
    if duplicate_keys[(proposal["proposalKey"], proposal["field"])] > 1:
        return "CONFLICTING_FIELD_PROPOSALS"
    if proposal_id in APPLY_IDS:
        return "POTENTIALLY_SAFE_FOR_DRAFT"
    if proposal_id in REJECT_AFTER or proposal_id in DEFER_EVIDENCE:
        return "UNSUPPORTED_AFTER_TEXT"
    if proposal_id in DEFER_SEMANTIC | DEFER_IDENTITY:
        return "REQUIRES_IDENTITY_OR_BOUNDARY"
    if prior_inventory_status == "REQUIRES_BOUNDARY_OR_IDENTITY_DECISION":
        return "REQUIRES_IDENTITY_OR_BOUNDARY"
    require(source_batch is not None, "Historical proposal lacks pinned authored batch")
    return "UNREVIEWED_CANDIDATE"


def build_candidate_inventory(parent, source_map):
    by_id = parent["inventory"]["records"]
    proposal_rows = parent["proposals"]
    proposals = {row["correctionProposalId"]: row for row in proposal_rows}
    require(len(proposals) == len(proposal_rows),
            "Historical proposal IDs are not unique")
    duplicate_keys = Counter((p["proposalKey"], p["field"]) for p in proposal_rows)
    records = []
    for proposal_id, proposal in proposals.items():
        row = parent["parentRows"][proposal["proposalKey"]]
        original_batch = source_map.get(row["candidateGroupKey"])
        old = next(x for x in by_id if x["correctionProposalId"] == proposal_id)
        category = category_for(proposal_id, proposal, row, original_batch,
                                duplicate_keys, old["inventoryStatus"])
        if proposal_id not in APPLIED_BEFORE | PREVIOUSLY_DEFERRED:
            require(row["effectiveContentHash"] == proposal["originalEffectiveContentHash"],
                    "Unapplied proposal has stale parent hash: " + proposal_id)
            require(proposal_pointer_get(row, proposal["field"]) == proposal["before"],
                    "Unapplied proposal BEFORE differs from current parent: " + proposal_id)
        prior_disposition = (
            "ALREADY_APPLIED_IN_PRIOR_LAYER" if proposal_id in APPLIED_BEFORE
            else "PREVIOUSLY_DEFERRED_PRESERVED" if proposal_id in PREVIOUSLY_DEFERRED
            else "SELECTED_FOR_INDEPENDENT_REVIEW" if proposal_id in SELECTED_IDS
            else "PENDING_IDENTITY_OR_BOUNDARY_REVIEW"
            if category == "REQUIRES_IDENTITY_OR_BOUNDARY"
            else "UNSELECTED_PENDING_REVIEW"
        )
        records.append({
            **copy.deepcopy(old),
            "originalAuthoredBatch": copy.deepcopy(original_batch),
            "currentEffectiveContentHash": row["effectiveContentHash"],
            "currentFieldSha256": text_sha(proposal_pointer_get(row, proposal["field"])),
            "inventoryCategory": category,
            "historicalInventoryStatus": old["inventoryStatus"],
            "batch03Disposition": prior_disposition,
            "historicalProposalStillUnappliedInSource": proposal.get("applied") is False,
        })
    records.sort(key=lambda x: x["correctionProposalId"])
    categories = Counter(row["inventoryCategory"] for row in records)
    require(len(records) == 141 and sum(categories.values()) == 141,
            "Batch 03 proposal inventory is not exhaustive")
    expected = {
        "ALREADY_APPLIED": 6, "PREVIOUSLY_DEFERRED": 3,
        "UNREVIEWED_CANDIDATE": 106, "STALE_PARENT_REVISION": 0,
        "CONFLICTING_FIELD_PROPOSALS": 0, "REQUIRES_IDENTITY_OR_BOUNDARY": 12,
        "UNSUPPORTED_AFTER_TEXT": 2, "POTENTIALLY_SAFE_FOR_DRAFT": 12,
    }
    actual_counts = {name: categories.get(name, 0) for name in expected}
    require(set(categories).issubset(expected) and actual_counts == expected,
            "Batch 03 proposal disposition counts changed: " + repr(dict(categories)))
    return {
        "phase": "2H.2J-R3", "status": "COMPLETE_CURRENT_PARENT_RECONCILIATION",
        "parentBatch02Fingerprint": PARENT_B2_FINGERPRINT,
        "fieldProposalCount": 141, "uniqueCorrectionProposalIds": 141,
        "categoryCounts": dict(sorted(actual_counts.items())), "records": records,
        "boundaryProposalCount": 8,
        "boundaryProposals": copy.deepcopy(parent["boundaries"]),
        "originalSourceProposalFiles": copy.deepcopy(parent["inventory"]["sourceProposalFiles"]),
        "authorization": AUTH,
    }


def selection_receipt(inventory, source_map, batch_sources):
    candidate_by_id = {row["correctionProposalId"]: row for row in inventory["records"]}
    selected = [candidate_by_id[item] for item in SELECTED_IDS]
    require(all(x["inventoryCategory"] == "POTENTIALLY_SAFE_FOR_DRAFT"
                or x["inventoryCategory"] in {
                    "REQUIRES_IDENTITY_OR_BOUNDARY", "UNSUPPORTED_AFTER_TEXT"
                } for x in selected), "Selected cohort includes ineligible historical state")
    batch_key = "master-editorial-draft-pilot:5"
    selected_batch = source_map[selected[0]["candidateGroupKey"]]
    require(selected_batch["sourceCheckpoint"] == "master-editorial-draft-pilot"
            and selected_batch["batch"] == 5 and len(selected_batch["groupKeys"]) == 20
            and selected_batch["senseCount"] == 37,
            "Highest-density batch-05 original source pin drift")
    candidate_counts = Counter(
        row["originalAuthoredBatch"]["sourceCheckpoint"] + ":" +
        str(row["originalAuthoredBatch"]["batch"])
        for row in inventory["records"]
        if row["historicalInventoryStatus"] == "CANDIDATE_NOT_YET_REVIEWED"
        and row["correctionProposalId"] not in APPLIED_BEFORE | PREVIOUSLY_DEFERRED
    )
    # Count every unreviewed proposal in its original batch, including risky
    # proposals selected for explicit defer/reject disposition.
    require(candidate_counts[batch_key] == len(SELECTED_IDS)
            and candidate_counts.most_common(1)[0] == (batch_key, 22),
            "Stable highest-density batch selection changed")
    candidates = []
    for rank, row in enumerate(selected, 1):
        candidates.append({
            "selectionRank": rank, "selectionScore": 100,
            "scoreComponents": {"highestSingleBatchDensity": 40,
                                "fieldLocalGrammarProposal": 25,
                                "sourceBatchReviewAmortization": 20,
                                "stableHistoricalInventoryOrder": 15},
            "correctionProposalId": row["correctionProposalId"],
            "proposalKey": row["proposalKey"],
            "candidateGroupKey": row["candidateGroupKey"],
            "field": row["field"], "parentEffectiveContentHash": row["currentEffectiveContentHash"],
            "before": row["before"], "after": row["after"],
            "beforeFieldSha256": row["beforeFieldSha256"],
            "afterFieldSha256": row["afterFieldSha256"],
            "originalAuthoredBatch": copy.deepcopy(row["originalAuthoredBatch"]),
            "sourceProposalReference": {"path": row["sourceCheckpoint"],
                                        "sha256": row["sourceProposalSha256"]},
            "selectionBasis": "Highest number of still-unreviewed proposals in one original batch (22); review one whole 20-group/37-Sense batch. Risky proposals are included for explicit disposition, not promised for application.",
        })
    selected_ids = set(SELECTED_IDS)
    excluded = [{
        "correctionProposalId": row["correctionProposalId"],
        "proposalKey": row["proposalKey"],
        "inventoryCategory": row["inventoryCategory"],
        "reason": (
            "Previously applied or deferred; explicit R3 exclusion."
            if row["correctionProposalId"] in APPLIED_BEFORE | PREVIOUSLY_DEFERRED
            else "Protected identity/boundary dependency is outside this field-remediation cohort."
            if row["inventoryCategory"] == "REQUIRES_IDENTITY_OR_BOUNDARY"
            else "Not selected because this checkpoint maximizes one complete original-batch review; candidate remains queued for a later bounded cohort."
        ),
    } for row in inventory["records"] if row["correctionProposalId"] not in selected_ids]
    return {
        "phase": "2H.2J-R3", "batch": "TARGETED_DRAFT_REMEDIATION_BATCH_03",
        "status": "SELECTED_FOR_SEMANTIC_REVIEW",
        "selectionMethod": "DETERMINISTIC_HIGHEST_SINGLE_BATCH_DENSITY_THEN_STABLE_SOURCE_ORDER",
        "selectionPolicy": [
            "Exclude all six previously applied corrections and the three explicit prior deferrals.",
            "Exclude the eight Sense-boundary proposals from field remediation.",
            "Rank original batches by count of current unreviewed field proposals, descending.",
            "Select the entire highest-density batch 05 (22 proposals), preserving historical inventory order.",
            "Selection does not imply eligibility; every selected BEFORE/AFTER receives independent review.",
        ],
        "selectedCandidateCount": len(candidates), "selectedBatchCount": 1,
        "fullBatchSenseInspectionEstimate": 37,
        "candidateCountsByOriginalBatch": dict(sorted(candidate_counts.items())),
        "selectedOriginalBatches": [copy.deepcopy(selected_batch)],
        "candidateIdsInStableOrder": SELECTED_IDS,
        "candidates": candidates,
        "explicitExclusionCount": len(excluded), "explicitExclusions": excluded,
        "previouslyAppliedExcluded": sorted(APPLIED_BEFORE),
        "previouslyDeferredExcluded": sorted(PREVIOUSLY_DEFERRED),
        "boundaryProposalCountExcluded": 8,
        "unselectedPotentialCandidateCount": 106,
        "selectionAlgorithmUnderutilization": False,
        "underutilizationExplanation": "Twenty-two current proposals exist in the densest original batch; all 22 were selected for review. The cap of 40 is not a quota, and the remaining 106 are explicitly queued rather than split across 20+ low-density batches.",
        "parentBatch02Fingerprint": PARENT_B2_FINGERPRINT,
        "authorization": AUTH,
    }


def authored_eligibility(parent, inventory, selection):
    inv = {row["correctionProposalId"]: row for row in inventory["records"]}
    selected = {row["correctionProposalId"]: row for row in selection["candidates"]}
    proposal_by_id = {row["correctionProposalId"]: row for row in parent["proposals"]}
    records = []
    for proposal_id in SELECTED_IDS:
        indexed = inv[proposal_id]
        source = proposal_by_id[proposal_id]
        row = parent["parentRows"][source["proposalKey"]]
        status, explanation = ELIGIBILITY_DECISIONS[proposal_id]
        expected_status = (
            "APPLY_ELIGIBLE" if proposal_id in APPLY_IDS
            else "DEFER_SEMANTIC_RISK" if proposal_id in DEFER_SEMANTIC
            else "DEFER_POS_OR_IDENTITY" if proposal_id in DEFER_IDENTITY
            else "DEFER_INSUFFICIENT_EVIDENCE" if proposal_id in DEFER_EVIDENCE
            else "REJECT_INCORRECT_AFTER"
        )
        require(status == expected_status, "Selected proposal decision code drift: " + proposal_id)
        siblings = sorted(
            [candidate for candidate in parent["parentRows"].values()
             if candidate["candidateGroupKey"] == row["candidateGroupKey"]],
            key=lambda item: item["proposalKey"],
        )
        field_value = proposal_pointer_get(row, source["field"])
        require(field_value == source["before"] and row["effectiveContentHash"] == indexed["currentEffectiveContentHash"],
                "Independent-review BEFORE/hash no longer matches Batch 02 parent: " + proposal_id)
        records.append({
            "correctionProposalId": proposal_id, "proposalKey": source["proposalKey"],
            "candidateGroupKey": row["candidateGroupKey"],
            "eligibilityStatus": status,
            "currentParentEffectiveContentHash": row["effectiveContentHash"],
            "fieldPointer": source["field"], "before": source["before"], "after": source["after"],
            "beforeFieldSha256": text_sha(source["before"]),
            "afterFieldSha256": text_sha(source["after"]),
            "independentReviewDimensions": {
                "grammar": True, "meaningPreservation": True,
                "englishNaturalness": True, "vietnameseFaithfulness": True,
                "posAndConstruction": True, "sourceEvidence": True,
                "priorCorrectionLineage": True, "historicalQa": True,
                "siblingSenseConsistency": True, "noOtherFieldRequired": True,
                "noBoundaryOrIdentityChange": True,
            },
            "reviewExplanationVi": explanation,
            "reviewedSenseContext": {
                "headword": row["headword"], "partOfSpeech": row["partOfSpeech"],
                "content": copy.deepcopy(row["content"]),
                "sourceEvidence": copy.deepcopy(row.get("sourceEvidence", [])),
                "sourcePosEvidence": copy.deepcopy(row.get("sourcePosEvidence", [])),
                "identityUncertainty": copy.deepcopy(row.get("identityUncertainty")),
                "legacyIdentityDependencies": copy.deepcopy(row.get("legacyIdentityDependencies", [])),
                "historicalQaFindings": copy.deepcopy(row.get("historicalQaFindings", [])),
                "rawEffectiveQaFindings": copy.deepcopy(row.get("rawEffectiveQaFindings", {})),
                "pinnedHistoricalQaReferences": copy.deepcopy(row.get("pinnedHistoricalQaReferences", [])),
                "pinnedCorrectionLineage": copy.deepcopy(row.get("pinnedCorrectionLineage", [])),
                "appliedCorrectionReferences": copy.deepcopy(row.get("appliedCorrectionReferences", [])),
                "siblingProposalKeys": [sibling["proposalKey"] for sibling in siblings],
                "siblingContentHashes": {sibling["proposalKey"]: sibling["effectiveContentHash"]
                                          for sibling in siblings},
            },
            "sourceProposalReference": {"path": source["_sourcePath"],
                                        "sha256": source["_sourceSha256"]},
            "historicalProposalStillUnapplied": source.get("applied") is False,
            "ownerApproval": False, "rightsClearanceAdded": False,
            "canonicalIdentityDecision": False,
        })
    require(len(records) == len(SELECTED_IDS)
            and len({r["correctionProposalId"] for r in records}) == len(records),
            "Selected proposal assessment inventory is not unique/exhaustive")
    return {"phase": "2H.2J-R3", "reviewKind": "AI_INDEPENDENT_FIELD_REVIEW_NOT_OWNER_APPROVAL",
            "records": records, "count": len(records), "authorization": AUTH}


def application_decisions(eligibility):
    records = []
    for item in eligibility["records"]:
        status = item["eligibilityStatus"]
        decision = ("APPLY_TO_CUMULATIVE_DRAFT_LAYER" if status == "APPLY_ELIGIBLE"
                    else "REJECT_NO_REVISION" if status == "REJECT_INCORRECT_AFTER"
                    else "DEFER_NO_REVISION")
        records.append({
            "correctionProposalId": item["correctionProposalId"],
            "proposalKey": item["proposalKey"], "fieldPointer": item["fieldPointer"],
            "eligibilityStatus": status, "decision": decision,
            "parentEffectiveContentHash": item["currentParentEffectiveContentHash"],
            "reviewExplanationVi": item["reviewExplanationVi"],
            "applicationLayer": "DRAFT_REMEDIATION_BATCH_03" if decision.startswith("APPLY") else None,
            "historicalProposalArtifactMutated": False,
            "formalOwnerApproval": False, "rightsClearance": False,
            "canonicalIdentityChanged": False,
        })
    return {"phase": "2H.2J-R3", "records": records,
            "count": len(records), "authorization": AUTH}


def apply_corrections(parent, eligibility, application):
    proposal_by_id = {row["correctionProposalId"]: row for row in parent["proposals"]}
    elig = {x["correctionProposalId"]: x for x in eligibility["records"]}
    decisions = {x["correctionProposalId"]: x for x in application["records"]}
    grouped = defaultdict(list)
    seen_fields = set()
    for proposal_id in SELECTED_IDS:
        if elig[proposal_id]["eligibilityStatus"] != "APPLY_ELIGIBLE":
            continue
        candidate = elig[proposal_id]
        field_key = (candidate["proposalKey"], candidate["fieldPointer"])
        require(field_key not in seen_fields, "Duplicate field application rejected: " + proposal_id)
        seen_fields.add(field_key)
        require(proposal_id not in APPLIED_BEFORE | PREVIOUSLY_DEFERRED,
                "Previously applied or deferred proposal cannot be reapplied")
        proposal = proposal_by_id[proposal_id]
        row = parent["parentRows"][candidate["proposalKey"]]
        require(row["effectiveContentHash"] == candidate["currentParentEffectiveContentHash"],
                "Stale Batch 02 parent hash: " + proposal_id)
        require(proposal_pointer_get(row, candidate["fieldPointer"]) == candidate["before"],
                "Exact BEFORE mismatch: " + proposal_id)
        require(candidate["beforeFieldSha256"] == text_sha(candidate["before"])
                and candidate["afterFieldSha256"] == text_sha(candidate["after"]),
                "Field hash mismatch: " + proposal_id)
        grouped[candidate["proposalKey"]].append(proposal_id)
    revisions, revised = [], {}
    for proposal_key in sorted(grouped):
        original = parent["parentRows"][proposal_key]
        clone = copy.deepcopy(original)
        field_revisions = []
        for proposal_id in grouped[proposal_key]:
            decision = elig[proposal_id]
            proposal = proposal_by_id[proposal_id]
            proposal_pointer_set(clone, decision["fieldPointer"], decision["after"])
            field_revisions.append({
                "correctionProposalId": proposal_id, "proposalKey": proposal_key,
                "candidateGroupKey": original["candidateGroupKey"],
                "fieldPointer": decision["fieldPointer"], "before": decision["before"],
                "after": decision["after"], "beforeFieldSha256": text_sha(decision["before"]),
                "afterFieldSha256": text_sha(decision["after"]),
                "previousEffectiveContentHash": original["effectiveContentHash"],
                "historicalProposalReference": {"path": proposal["_sourcePath"],
                                                "sha256": proposal["_sourceSha256"]},
                "eligibilityStatus": "APPLY_ELIGIBLE",
                "applicationDecision": decisions[proposal_id]["decision"],
                "postApplicationFieldReviewStatus": "PASS",
                "postApplicationReviewExplanationVi": decision["reviewExplanationVi"],
            })
        new_hash = current_hash(clone, parent["pilot"])
        clone["effectiveContentHash"] = new_hash
        revision = {
            "revisionId": "DRAFT_REMEDIATION_BATCH_03:" + proposal_key,
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_03", "draftRevision": 3,
            "status": "AI_REVIEWED_DRAFT_FIELD_CORRECTION",
            "contentStatus": "DRAFT", "publicationEligible": False,
            "proposalKey": proposal_key, "candidateGroupKey": original["candidateGroupKey"],
            "sourceAuditCheckpoint": "PHASE_2H.2I_FINAL_CHECKPOINT_07",
            "parentLayer": "DRAFT_REMEDIATION_BATCH_02_CUMULATIVE_PROJECTION",
            "previousEffectiveContentHash": original["effectiveContentHash"],
            "revisedContentHash": new_hash,
            "correctionProposalIds": grouped[proposal_key],
            "fieldRevisions": field_revisions,
            "upstreamRevisionReferences": [],
            "eligibilityAssessments": [elig[i] for i in grouped[proposal_key]],
            "applicationDecisions": [decisions[i] for i in grouped[proposal_key]],
            "originalProvenance": {
                key: copy.deepcopy(original.get(key)) for key in [
                    "editorialFieldProvenance", "reviewFieldProvenance",
                    "pinnedCorrectionLineage", "appliedCorrectionReferences",
                    "sourceEvidence", "sourceMembership", "historicalQaFindings",
                    "rawEffectiveQaFindings",
                ]
            },
            "rights": "UNKNOWN_REVIEW_REQUIRED", "ownerApproval": False,
            "canonicalIdAllocated": False, "record": clone,
        }
        require({k: v for k, v in clone.items() if k not in {"content", "effectiveContentHash"}}
                == {k: v for k, v in original.items() if k not in {"content", "effectiveContentHash"}},
                "Overlay changed identity/provenance outside the authorized content field")
        revisions.append(revision)
        revised[proposal_key] = clone
    require(len(seen_fields) == len(APPLY_IDS) <= MAX_APPLIED,
            "Batch 03 application cap or target count failed")
    return revisions, revised


def full_batch_review(parent, source_map, revised_rows, eligibility):
    source_batch = source_map["NORMALIZED_HEADWORD:big"]
    require(source_batch["sourceCheckpoint"] == "master-editorial-draft-pilot"
            and source_batch["batch"] == 5 and source_batch["senseCount"] == 37,
            "Selected original batch pin changed")
    projection = {**parent["parentRows"], **revised_rows}
    expected = sorted([row for row in projection.values()
                       if row["candidateGroupKey"] in set(source_batch["groupKeys"])],
                      key=lambda row: row["proposalKey"])
    require(len(expected) == 37 and len(FULL_REVIEW) == 37
            and set(FULL_REVIEW) == {row["proposalKey"] for row in expected},
            "Full review must cover exactly all 37 original batch-05 Senses")
    assessments = []
    for row in expected:
        status, explanation = FULL_REVIEW[row["proposalKey"]]
        is_revised = row["proposalKey"] in revised_rows
        dimensions = {key: True for key in REVIEW_DIMENSIONS}
        if status == "REVIEW":
            if row["proposalKey"] in {
                "EDITORIAL_2H2B:billion:large-number",
            }:
                dimensions["posAndConstruction"] = False
            elif row["proposalKey"] == "EDITORIAL_2H2B:block:street-section":
                dimensions["siblingSenseConsistency"] = False
            elif row["proposalKey"] == "EDITORIAL_2H2B:broadly:widely":
                dimensions["siblingSenseConsistency"] = False
            elif row["proposalKey"] == "EDITORIAL_2H2B:cosmopolitan city:diverse-city":
                dimensions["posAndConstruction"] = False
            elif row["proposalKey"] in {
                "EDITORIAL_2H2B:carbon dioxide:gas",
                "EDITORIAL_2H2B:greenhouse gas:heat-trapping-gas",
            }:
                dimensions["sourceEvidence"] = False
            elif row["proposalKey"].startswith("EDITORIAL_2H2B:light:"):
                dimensions["siblingSenseConsistency"] = False
            elif row["proposalKey"].startswith("EDITORIAL_2H2B:record:"):
                dimensions["priorCorrectionLineage"] = True
                dimensions["sourceEvidence"] = False
            elif row["proposalKey"] == "EDITORIAL_2H2B:have to:necessity":
                dimensions["siblingSenseConsistency"] = False
            elif row["proposalKey"] == "EDITORIAL_2H2B:run:operate":
                dimensions["posAndConstruction"] = False
            elif row["proposalKey"].startswith("EDITORIAL_2H2B:water:"):
                dimensions["siblingSenseConsistency"] = False
        if is_revised:
            # The field-level check is independently PASS even when a separate
            # unchanged identity/POS/science decision keeps the whole Sense REVIEW.
            applied_for_sense = [item for item in eligibility.values()
                                 if item["proposalKey"] == row["proposalKey"]
                                 and item["eligibilityStatus"] == "APPLY_ELIGIBLE"]
            require(bool(applied_for_sense),
                    "A revised record has no independently eligible field correction")
            require(all(dimensions[k] for k in ["grammar", "meaningPreservation",
                                                "englishNaturalness", "vietnameseFaithfulness"]),
                    "Applied field has a critical unresolved content dimension")
            if not dimensions["posAndConstruction"]:
                # The billion note's number-phrase guidance passes independently;
                # the inherited NUMBER/OTHER classification remains unresolved.
                require(row["proposalKey"] == "EDITORIAL_2H2B:billion:large-number"
                        and status == "REVIEW"
                        and parent["parentRows"][row["proposalKey"]]["partOfSpeech"]
                        == row["partOfSpeech"]
                        and all(item["fieldPointer"] == "/content/grammarNotesEn"
                                for item in applied_for_sense),
                        "Unresolved POS state is not an allowed field-level review exception")
        assessments.append({
            "proposalKey": row["proposalKey"], "candidateGroupKey": row["candidateGroupKey"],
            "parentEffectiveContentHash": parent["parentRows"][row["proposalKey"]]["effectiveContentHash"],
            "reviewedContentHash": row["effectiveContentHash"],
            "reviewStatus": status, "reviewKind": "AI_FULL_BATCH_CONTENT_REVIEW_NOT_OWNER_APPROVAL",
            "reviewDimensions": dimensions, "reviewExplanationVi": explanation,
            "reviewedContentSnapshot": {
                "headword": row["headword"], "partOfSpeech": row["partOfSpeech"],
                "content": copy.deepcopy(row["content"]),
                "sourceEvidence": copy.deepcopy(row.get("sourceEvidence", [])),
                "historicalQaFindings": copy.deepcopy(row.get("historicalQaFindings", [])),
                "pinnedHistoricalQaReferences": copy.deepcopy(row.get("pinnedHistoricalQaReferences", [])),
            },
            "historicalReviewStatePreserved": copy.deepcopy(row.get("rawEffectiveQaFindings", {})),
            "newFieldReview": "PASS" if is_revised else None,
        })
    statuses = Counter(item["reviewStatus"] for item in assessments)
    require(statuses["FAIL"] == 0 and statuses["PASS"] + statuses["REVIEW"] == 37,
            "Full-batch review found FAIL or is incomplete")
    batches = [{
        "sourceCheckpoint": source_batch["sourceCheckpoint"], "batch": source_batch["batch"],
        "groupKeys": source_batch["groupKeys"], "senseCount": 37,
        "sourceReferences": source_batch["sourceReferences"],
        "reviewedProposalKeys": [row["proposalKey"] for row in expected],
        "reviewedContentHashes": {row["proposalKey"]: row["effectiveContentHash"] for row in expected},
        "priorFullBatchReview": "ORIGINAL_2H2B_BATCH_05_AUTHORED_DRAFT; owner review pending",
        "reviewStatusCounts": {key: statuses.get(key, 0) for key in ["PASS", "REVIEW", "FAIL"]},
    }]
    return {"batches": batches, "reviews": assessments,
            "reviewedSenseCount": 37, "pass": statuses["PASS"],
            "review": statuses["REVIEW"], "fail": statuses["FAIL"],
            "criticalDefectFound": False, "formalOwnerApproval": False,
            "historicalReviewConvertedToPass": False,
            "reviewKind": "AI_FULL_AUTHORED_BATCH_RE_REVIEW_NOT_OWNER_APPROVAL",
            "status": "COMPLETE_WITH_REVIEW_ITEMS"}


def parent_pins(parent, batch_sources, decode_diagnostic):
    original_hash = sha_file(ORIGINAL_INDEX)
    require(original_hash == parent["originalProjectionPin"]["sha256"],
            "Frozen original effective index changed")
    b2_projection = B2_WS / "cumulative-remediated-effective-draft-projection.json"
    pilot_projection = PILOT_WS / "remediated-effective-draft-projection.json"
    return {
        "phase": "2H.2J-R3", "parentCommit": PARENT_COMMIT,
        "remoteParentBaseline": PARENT_COMMIT,
        "parentBatch02Fingerprint": PARENT_B2_FINGERPRINT,
        "parentPilot01Fingerprint": PARENT_PILOT_FINGERPRINT,
        "parentAggregateAuditFingerprint": PARENT_AUDIT_FINGERPRINT,
        "parentFinalHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
        "frozenAuthoringCohortFingerprint": FROZEN_COHORT,
        "parentBatch02Manifest": {"path": (B2_WS / "manifest.json").relative_to(ROOT).as_posix(),
                                   "sha256": sha_file(B2_WS / "manifest.json"),
                                   "fingerprint": PARENT_B2_FINGERPRINT},
        "parentBatch02Projection": {"path": b2_projection.relative_to(ROOT).as_posix(),
                                    "sha256": sha_file(b2_projection), "records": 1563,
                                    "authoredGroups": 1020},
        "parentPilot01Projection": {"path": pilot_projection.relative_to(ROOT).as_posix(),
                                    "sha256": sha_file(pilot_projection), "records": 1563},
        "frozenOriginalProjection": {"path": ORIGINAL_INDEX.relative_to(ROOT).as_posix(),
                                     "sha256": original_hash, "records": 1563},
        "aggregateAudit": {"manifest": {"path": (CP07 / "manifest.json").relative_to(ROOT).as_posix(),
                                         "sha256": sha_file(CP07 / "manifest.json"),
                                         "fingerprint": PARENT_AUDIT_FINGERPRINT},
                           "handoff": {"path": (CP07 / "final-handoff-manifest.json").relative_to(ROOT).as_posix(),
                                       "sha256": sha_file(CP07 / "final-handoff-manifest.json"),
                                       "fingerprint": PARENT_HANDOFF_FINGERPRINT}},
        "historicalFieldProposalSources": copy.deepcopy(parent["proposalSources"]),
        "historicalBoundaryProposalSources": copy.deepcopy(parent["boundarySources"]),
        "allOriginalAuthoredBatches": batch_sources,
        "decodeFixture": decode_diagnostic["trackedFixture"],
        "decodeFixtureDiagnostic": {"path": "regression-decode-diagnostic.json",
                                    "outcome": decode_diagnostic["outcome"]},
        "authorization": AUTH,
    }


def build():
    parent_replays = verify_parent_replays()
    decode_diagnostic = diagnose_decode_fixture()
    pilot_module, parent, source_map, batch_sources = load_context()
    inventory = build_candidate_inventory(parent, source_map)
    selection = selection_receipt(inventory, source_map, batch_sources)
    eligibility = authored_eligibility(parent, inventory, selection)
    application = application_decisions(eligibility)
    revisions, revised_rows = apply_corrections(parent, eligibility, application)
    batch_review = full_batch_review(parent, source_map, revised_rows,
                                     {x["correctionProposalId"]: x for x in eligibility["records"]})

    # The six accepted parent corrections are split across Pilot 01 and Batch 02.
    pilot_applied = read(PILOT_WS / "applied-draft-corrections.json")["corrections"]
    parent_applied = read(B2_WS / "applied-draft-corrections.json")["corrections"]
    pilot_applied_ids = {x["correctionProposalId"] for x in pilot_applied}
    batch02_applied_ids = {x["correctionProposalId"] for x in parent_applied}
    require(len(pilot_applied) == len(pilot_applied_ids) == 3
            and pilot_applied_ids == {"2H2I-R1-P008", "2H2I-R1-P009", "2H2I-R1-P010"}
            and len(parent_applied) == len(batch02_applied_ids) == 3
            and batch02_applied_ids == {"2H2I-R1-P005", "2H2I-R1-P006", "2H2I-R1-P007"}
            and pilot_applied_ids.isdisjoint(batch02_applied_ids)
            and pilot_applied_ids | batch02_applied_ids == APPLIED_BEFORE,
            "Accepted Pilot 01 plus Batch 02 six-correction parent ledger drift")
    original_rows = read(ORIGINAL_INDEX)["records"]
    parent_rows = parent["parentRows"]
    changed_from_original = {row["proposalKey"] for row in original_rows
                             if row["effectiveContentHash"] != parent_rows[row["proposalKey"]]["effectiveContentHash"]}
    require(len(changed_from_original) == 6,
            "Batch 02 parent no longer contains exactly six revised Sense identities")

    effective_rows, mapping = [], []
    original_by_key = {r["proposalKey"]: r for r in original_rows}
    previous_mapping = {r["proposalKey"]: r for r in read(B2_WS / "cumulative-content-hash-mapping.json")["records"]}
    b2_revisions = read(B2_WS / "draft-revisions.json")["records"]
    r1_revisions = read(PILOT_WS / "draft-revisions.json")["records"]
    for key, original in original_by_key.items():
        b2_row = parent_rows[key]
        current = copy.deepcopy(revised_rows.get(key, b2_row))
        effective_rows.append(current)
        prior_layers = []
        for revision in [*r1_revisions, *b2_revisions]:
            if revision["proposalKey"] == key:
                prior_layers.append({"revisionId": revision["revisionId"],
                                     "revisionLayer": revision["revisionLayer"],
                                     "revisedContentHash": revision["revisedContentHash"]})
        new_layers = [{"revisionId": revision["revisionId"],
                       "revisionLayer": revision["revisionLayer"],
                       "revisedContentHash": revision["revisedContentHash"]}
                      for revision in revisions if revision["proposalKey"] == key]
        mapping.append({
            "proposalKey": key, "candidateGroupKey": original["candidateGroupKey"],
            "originalEffectiveContentHash": original["effectiveContentHash"],
            "pilot01EffectiveContentHash": previous_mapping[key]["pilot01EffectiveContentHash"],
            "batch02EffectiveContentHash": b2_row["effectiveContentHash"],
            "cumulativeEffectiveContentHash": current["effectiveContentHash"],
            "revisionLayers": prior_layers + new_layers,
            "latestRevisionLayer": ("DRAFT_REMEDIATION_BATCH_03" if new_layers else
                                    previous_mapping[key].get("latestRevisionLayer")),
        })
    require(len(effective_rows) == 1563 and len(mapping) == 1563
            and len({r["proposalKey"] for r in effective_rows}) == 1563
            and len({r["candidateGroupKey"] for r in effective_rows}) == 1020,
            "Cumulative effective projection identity/count changed")
    changed_in_batch = {m["proposalKey"] for m in mapping
                        if m["batch02EffectiveContentHash"] != m["cumulativeEffectiveContentHash"]}
    require(changed_in_batch == set(revised_rows) and len(changed_in_batch) == 12,
            "Unexpected cumulative content change outside the 12 selected fields")
    require(sum(m["originalEffectiveContentHash"] != m["cumulativeEffectiveContentHash"]
                for m in mapping) == 18,
            "Cumulative revised Sense count is not six parent plus twelve new")

    correction_records = []
    for revision in revisions:
        for field in revision["fieldRevisions"]:
            correction_records.append({
                **field, "revisionId": revision["revisionId"],
                "revisionLayer": revision["revisionLayer"],
                "revisedContentHash": revision["revisedContentHash"],
                "sourceAuditCheckpoint": revision["sourceAuditCheckpoint"],
                "rights": "UNKNOWN_REVIEW_REQUIRED", "contentStatus": "DRAFT",
                "ownerApproval": False, "canonicalIdAllocated": False,
            })
    require(len(correction_records) == 12
            and {r["correctionProposalId"] for r in correction_records} == APPLY_IDS,
            "Applied correction ledger is incomplete or contains an ineligible proposal")

    disposition_by_id = {r["correctionProposalId"]: r for r in inventory["records"]}
    for assessment in eligibility["records"]:
        item = disposition_by_id[assessment["correctionProposalId"]]
        item["batch03Disposition"] = assessment["eligibilityStatus"]
        item["batch03ReviewExplanationVi"] = assessment["reviewExplanationVi"]
    # Source proposal files remain immutable and all 141 historical records remain unapplied.
    require(all(proposal.get("applied") is False for proposal in parent["proposals"]),
            "A historical proposal artifact claims applied=true")

    categories = Counter(r["inventoryCategory"] for r in inventory["records"])
    dispositions = Counter(r["batch03Disposition"] for r in inventory["records"])
    priorities = read(CP07 / "prioritized-remediation-queue.json")
    pins = parent_pins(parent, batch_sources, decode_diagnostic)
    post_qa = {
        "phase": "2H.2J-R3", "status": "PASS_WITH_REVIEW_ITEMS",
        "reviewKind": "AI_POST_REMEDIATION_FULL_BATCH_REVIEW_NOT_OWNER_APPROVAL",
        "affectedOriginalBatches": ["master-editorial-draft-pilot:5"],
        "fullBatchesReviewed": 1, "sensesReviewed": 37,
        "pass": batch_review["pass"], "review": batch_review["review"],
        "fail": batch_review["fail"], "newCorrectionsApplied": 12,
        "cumulativeDraftCorrectionsApplied": 18,
        "newlyRevisedSenseCount": 12, "cumulativeRevisedSenseCount": 18,
        "newlyRevisedFieldReview": {"PASS": 12, "REVIEW": 0, "FAIL": 0},
        "historicalReviewConvertedToPass": False,
        "checks": {
            "grammar": "PASS_FOR_12_APPLIED_FIELDS",
            "meaningPreservation": "PASS_FOR_12_APPLIED_FIELDS",
            "englishNaturalness": "PASS_FOR_12_APPLIED_FIELDS",
            "vietnameseFaithfulness": "PASS_FOR_12_APPLIED_FIELDS",
            "posAndConstruction": "PASS_FOR_12_APPLIED_FIELDS; NO POS FIELD CHANGED",
            "sourceProvenancePreserved": True,
            "sourceOriginalitySignals": "REVIEWED_WITHIN_PINNED_SCOPE; NO RIGHTS CLEARANCE INFERRED",
            "externalRightsOrOriginalityClearance": "NOT_PERFORMED",
            "senseBoundaryStability": "PASS_NO_BOUNDARY_CHANGES",
            "fieldCompleteness": "PASS_FOR_APPLIED_FIELDS",
            "duplicateContent": "CHECKED_WITHIN_COMPLETE_BATCH_05",
            "historicalQaPreserved": True,
        },
        "reviewedSenseReferences": [{"proposalKey": item["proposalKey"],
            "candidateGroupKey": item["candidateGroupKey"],
            "parentEffectiveContentHash": item["parentEffectiveContentHash"],
            "reviewedContentHash": item["reviewedContentHash"],
            "reviewStatus": item["reviewStatus"]}
            for item in batch_review["reviews"]],
        "rights": "UNKNOWN_REVIEW_REQUIRED", "ownerApproval": False,
        "releaseEligible": False,
    }
    artifacts = {
        "accepted-parent-pins.json": pins,
        "regression-decode-diagnostic.json": decode_diagnostic,
        "candidate-inventory.json": inventory,
        "batch-selection-receipt.json": selection,
        "authored/eligibility-assessments.json": eligibility,
        "authored/application-decisions.json": application,
        "authored/full-batch-review-assessments.json": batch_review,
        "applied-draft-corrections.json": {
            "schemaVersion": "OFFLINE_CUMULATIVE_DRAFT_REMEDIATION_BATCH_V1",
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_03",
            "status": "APPLIED_TO_NEW_CUMULATIVE_DRAFT_LAYER",
            "corrections": correction_records,
            "historicalProposalStatusRemainsUnapplied": True,
            "parentCumulativeAppliedCorrectionCount": 6,
            "authorization": AUTH,
        },
        "draft-revisions.json": {
            "schemaVersion": "OFFLINE_VERSIONED_CUMULATIVE_DRAFT_OVERLAY_V1",
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_03", "revision": 3,
            "parentProjection": (B2_WS / "cumulative-remediated-effective-draft-projection.json").relative_to(ROOT).as_posix(),
            "records": revisions, "duplicateApplicationPolicy": "FAIL_CLOSED",
            "authorization": AUTH,
        },
        "cumulative-remediated-effective-draft-projection.json": {
            "schemaVersion": "OFFLINE_CUMULATIVE_EFFECTIVE_DRAFT_PROJECTION_V1",
            "contentStatus": "DRAFT", "count": 1563, "authoredGroupCount": 1020,
            "records": effective_rows,
            "baseProjection": {"path": (B2_WS / "cumulative-remediated-effective-draft-projection.json").relative_to(ROOT).as_posix(),
                               "sha256": sha_file(B2_WS / "cumulative-remediated-effective-draft-projection.json"),
                               "batch02Fingerprint": PARENT_B2_FINGERPRINT},
            "latestOverlay": "draft-revisions.json", "publicationEligible": False,
            "authorization": AUTH,
        },
        "cumulative-content-hash-mapping.json": {
            "method": "SHA256(canonical UTF-8 JSON of proposalKey, candidateGroupKey, headword, partOfSpeechProposal, content)",
            "count": 1563, "records": mapping,
            "changedInBatch03SenseCount": 12,
            "cumulativeChangedSenseCount": 18,
            "retainedParentBatch02RevisionCount": 6,
            "unchangedFromBatch02SenseCount": 1551,
        },
        "full-batch-re-review.json": batch_review,
        "post-remediation-quality-audit.json": post_qa,
        "deferred-and-rejected-proposals.json": {
            "previouslyDeferredPreserved": sorted(PREVIOUSLY_DEFERRED),
            "batch03Deferred": [x for x in eligibility["records"] if x["eligibilityStatus"].startswith("DEFER_")],
            "batch03Rejected": [x for x in eligibility["records"] if x["eligibilityStatus"].startswith("REJECT_")],
            "status": "PRESERVED_WITHOUT_REWRITING_HISTORICAL_PROPOSALS",
        },
        "remaining-remediation-queue.json": {
            "historicalPriorityAccounting": {
                "cumulativePriorityCounts": priorities["cumulativePriorityCounts"],
                "deduplicatedInventoryPriorityCounts": priorities["deduplicatedInventoryPriorityCounts"],
            },
            "categoryCounts": dict(sorted(categories.items())),
            "batch03DispositionCounts": dict(sorted(dispositions.items())),
            "fieldProposalCount": 141,
            "fieldProposals": inventory["records"],
            "boundaryProposalCount": 8,
            "boundaryProposals": inventory["boundaryProposals"],
            "batch03Selected": 22, "batch03Eligible": 12,
            "batch03Deferred": 9, "batch03Rejected": 1,
            "newCorrectionsApplied": 12, "cumulativeCorrectionsApplied": 18,
            "unreviewedCandidateCount": 106,
            "nextBoundaryGroups": ["condensed", "hail", "to", "elastic", "high", "harness", "fiery", "instrumental"],
            "authorization": AUTH,
        },
        "validation-summary.json": {
            "phase": "2H.2J-R3", "status": "PARTIAL_WITH_REVIEW_ITEMS_AND_PRESERVED_REGRESSION_FAILURE",
            "parentBatch02Fingerprint": PARENT_B2_FINGERPRINT,
            "parentPilot01Fingerprint": PARENT_PILOT_FINGERPRINT,
            "parentAggregateAuditFingerprint": PARENT_AUDIT_FINGERPRINT,
            "utf8DiagnosticStatus": decode_diagnostic["outcome"],
            "historicalFieldProposals": 141, "historicalBoundaryProposals": 8,
            "previousAppliedCorrections": 6,
            "selected": 22, "eligible": 12, "deferred": 9, "rejected": 1,
            "newCorrectionsApplied": 12, "cumulativeCorrectionsApplied": 18,
            "newlyRevisedSenses": 12, "cumulativeRevisedSenses": 18,
            "effectiveDraftSenses": 1563, "authoredGroups": 1020,
            "affectedOriginalBatches": ["master-editorial-draft-pilot:5"],
            "fullBatchesReviewed": 1, "fullBatchSensesReviewed": 37,
            "postRemediationQa": {"PASS": batch_review["pass"],
                                   "REVIEW": batch_review["review"], "FAIL": batch_review["fail"]},
            "newFieldReview": {"PASS": 12, "REVIEW": 0, "FAIL": 0},
            "unselectedSensesPreserved": True,
            "originalProjectionUnchanged": True, "pilot01ProjectionUnchanged": True,
            "batch02ProjectionUnchanged": True, "qaHistoryPreserved": True,
            "originalProposalsPreserved": 141, "originalBoundariesPreserved": 8,
            "ownerApprovalsAdded": 0, "canonicalIdsAllocated": 0,
            "rights": "UNKNOWN_REVIEW_REQUIRED", "contentApprovalStatus": "PENDING",
            "releaseEligible": False, "masterReleaseChanged": False,
            "legacyModified": False, "databaseAccess": "NONE", "databaseWrites": "NONE",
            "production": "UNTOUCHED", "parentReplays": parent_replays,
            "bulk500Regression": "FAIL_2_UNCHANGED_CP1258_TEMP_FIXTURE_DECODE_ERRORS",
            "legacyV220Diagnostic": "APPROVED_RELEASE_IMMUTABILITY_VIOLATION:release-tree; historical 4/5",
            "hybridV221": "REQUIRES_EXTERNAL_VALIDATION_RECEIPT",
            "authorization": AUTH,
        },
    }
    report = render_report(artifacts)
    artifact_text = {name: encode(value) for name, value in artifacts.items()}
    artifact_text["report.md"] = report
    manifest = {
        "phase": "2H.2J-R3", "batch": "TARGETED_DRAFT_REMEDIATION_BATCH_03",
        "parentCommit": PARENT_COMMIT, "remoteBaseline": PARENT_COMMIT,
        "parentBatch02Fingerprint": PARENT_B2_FINGERPRINT,
        "parentPilot01Fingerprint": PARENT_PILOT_FINGERPRINT,
        "parentAggregateAuditFingerprint": PARENT_AUDIT_FINGERPRINT,
        "parentFinalHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
        "frozenAuthoringCohortFingerprint": FROZEN_COHORT,
        "decodeGateOutcome": decode_diagnostic["outcome"],
        "selectedCandidateCount": 22, "eligibleCandidateCount": 12,
        "deferredCandidateCount": 9, "rejectedCandidateCount": 1,
        "appliedCorrectionCount": 12, "cumulativeAppliedCorrectionCount": 18,
        "newlyRevisedSenseCount": 12, "cumulativeRevisedSenseCount": 18,
        "effectiveDraftSenseCount": 1563, "authoredGroupCount": 1020,
        "fullBatchCount": 1, "fullBatchSenseCount": 37,
        "artifactHashes": {name: sha_bytes(text.encode("utf-8"))
                            for name, text in artifact_text.items()},
        "authoredInputHashes": {
            "eligibilityAssessments": sha_bytes(artifact_text["authored/eligibility-assessments.json"].encode("utf-8")),
            "applicationDecisions": sha_bytes(artifact_text["authored/application-decisions.json"].encode("utf-8")),
            "fullBatchReviewAssessments": sha_bytes(artifact_text["authored/full-batch-review-assessments.json"].encode("utf-8")),
        },
        "sourceHashes": {
            name: stable_sha(ROOT / "scripts" / name) for name in [
                "phase-2h2j-draft-remediation-batch-03.py",
                "phase-2h2j-draft-remediation-batch-03-test.py",
                "phase-2h2j-draft-remediation-batch-02.py",
                "phase-2h2j-draft-remediation-batch-02-test.py",
                "phase-2h2j-draft-remediation-pilot-01.py",
                "phase-2h2i-aggregate-qa-checkpoint-07.py",
            ]
        },
        "rights": "UNKNOWN_REVIEW_REQUIRED", "ownerApprovalsAdded": 0,
        "canonicalIdsAllocated": 0, "databaseAccess": "NONE",
        "databaseWrites": "NONE", "production": "UNTOUCHED",
        "detachedVerificationReceipt": {
            "path": VERIFY_FILE,
            "binding": "Detached actual-command results bind to the manifest fingerprint and are excluded from the self-hash.",
        },
        "authorization": AUTH,
    }
    manifest["fingerprint"] = digest(manifest)
    artifact_text["manifest.json"] = encode(manifest)
    return artifact_text, manifest


def render_report(artifacts):
    summary = artifacts["validation-summary.json"]
    selection = artifacts["batch-selection-receipt.json"]
    eligibility = {x["correctionProposalId"]: x
                   for x in artifacts["authored/eligibility-assessments.json"]["records"]}
    lines = [
        "# Phase 2H.2J-R3 — Targeted DRAFT Remediation Batch 03", "",
        "Status: PARTIAL_WITH_REVIEW_ITEMS_AND_PRESERVED_REGRESSION_FAILURE.",
        f"Parent Batch 02 fingerprint: `{PARENT_B2_FINGERPRINT}`.",
        f"Parent Phase 2H.2I audit fingerprint: `{PARENT_AUDIT_FINGERPRINT}`; handoff `{PARENT_HANDOFF_FINGERPRINT}`.",
        f"New checkpoint fingerprint: `{artifacts.get('manifest.json', {}).get('fingerprint', 'bound in manifest.json')}`.", "",
        "## Gate A — bulk-500 UTF-8 diagnosis", "",
        "The tracked checkpoint-02 receipt is valid UTF-8 and byte-identical at the Batch 02 parent, HEAD, index, and worktree. The two test errors occur after the test writes its Unicode receipt with `Path.write_text()` and no encoding; under the observed Windows cp1258 default, U+2019 becomes byte 0x92 and the production helper's strict UTF-8 reader rejects the temporary file at offset 12585. The same parent test/helper blobs reproduce it. No fixture, test, or decoder was changed. Result remains FAIL (35 tests, 2 errors); this is an isolated environment-specific test fixture encoding defect, not malformed tracked Dataset data.", "",
        "## Selection and review", "",
        "Selected all 22 unreviewed proposals in original batch 05, the highest-density source batch. The entire original batch contains 20 headword groups and 37 Senses.", "",
    ]
    for candidate in selection["candidates"]:
        row = eligibility[candidate["correctionProposalId"]]
        lines.append(f"- `{row['correctionProposalId']}` — **{row['eligibilityStatus']}**: {row['reviewExplanationVi']}")
    lines += [
        "", "## Cumulative DRAFT overlay", "",
        f"- Applied 12 field corrections across 12 Senses; cumulative applied corrections: 18 across 18 revised Senses.",
        "- Projection remains 1,563 Senses / 1,020 authored groups. The other 1,551 rows are byte-content-hash unchanged from Batch 02.",
        f"- Re-reviewed the complete original batch: 37 Senses, {summary['postRemediationQa']['PASS']} PASS, {summary['postRemediationQa']['REVIEW']} REVIEW, 0 FAIL. All 12 edited fields individually passed the bounded AI DRAFT content review.",
        "- The 9 deferred and 1 rejected proposal remain unapplied. The three prior lot/waste/aggregate deferrals and six prior applied corrections are preserved.",
        "- Historical QA, all 141 original proposal records and all eight boundary proposals remain unchanged.",
        "", "## Preserved limits and validation", "",
        "All content remains DRAFT, rights UNKNOWN_REVIEW_REQUIRED, content approval PENDING, and release eligibility NO. No owner approval, canonical ID, rights clearance, database access/write, Production operation, Master release change, or legacy mutation occurred.",
        "The known v2.2.0 release-tree diagnostic remains 4/5; Hybrid-100 v2.2.1 is checked independently. The bulk-500 regression remains FAIL/2 errors pending separate test-fixture encoding authorization.",
        "", "## Next recommendation", "",
        "Continue only with a separately authorized bounded DRAFT remediation checkpoint after review of this overlay and the outstanding queue. Do not repair the protected bulk-500 fixture or start a new authoring cohort under this checkpoint.", "",
    ]
    return "\n".join(lines)


def validate_detached_verification(path, fingerprint):
    require(path.is_file(), "Detached verification-results.json is missing")
    result = read(path)
    require(result.get("batch03Fingerprint") == fingerprint
            and result.get("parentBatch02Fingerprint") == PARENT_B2_FINGERPRINT
            and result.get("status") in {"PASS_WITH_REVIEW_ITEMS", "PARTIAL"}
            and result.get("databaseAccess") == "NONE"
            and result.get("databaseWrites") == "NONE"
            and result.get("production") == "UNTOUCHED",
            "Detached Batch 03 verification receipt is stale or outside authorization")
    replays = result.get("newBatchReplay", [])
    require(len(replays) >= 2 and len({str(x["pythonHashSeed"]) for x in replays}) >= 2
            and all(x["exitCode"] == 0 and x["fingerprint"] == fingerprint
                    and x["zeroWrites"] is True for x in replays),
            "Batch 03 needs two successful zero-write, different-hash-seed replays")
    require(result.get("bulk500Regression", {}).get("status") == "FAIL_PRESERVED"
            and result.get("legacyV2_2_0", {}).get("status") == "FAIL_PRESERVED"
            and result.get("hybridV2_2_1", {}).get("status") == "PASS",
            "Known legacy regressions or Hybrid-100 verification are misreported")


def validate_provisional_checkpoint_for_rebuild(outputs):
    manifest_path = WS / "manifest.json"
    require(manifest_path.is_file() and not (WS / VERIFY_FILE).exists(),
            "Only an unverified provisional Batch 03 checkpoint may be rebuilt")
    previous = read(manifest_path)
    previous_fingerprint = previous.get("fingerprint")
    previous_core = copy.deepcopy(previous)
    previous_core.pop("fingerprint", None)
    hashes = previous.get("artifactHashes")
    expected_names = set(outputs) - {"manifest.json"}
    require(previous_fingerprint == digest(previous_core)
            and isinstance(hashes, dict) and set(hashes) == expected_names
            and previous.get("parentCommit") == PARENT_COMMIT
            and previous.get("parentBatch02Fingerprint") == PARENT_B2_FINGERPRINT
            and previous.get("rights") == "UNKNOWN_REVIEW_REQUIRED"
            and previous.get("ownerApprovalsAdded") == 0
            and previous.get("canonicalIdsAllocated") == 0
            and previous.get("databaseAccess") == "NONE"
            and previous.get("databaseWrites") == "NONE"
            and previous.get("production") == "UNTOUCHED",
            "Existing Batch 03 checkpoint is not a valid unverified provisional build")
    for name, expected_hash in hashes.items():
        path = WS / name
        require(path.is_file() and sha_file(path) == expected_hash,
                "Provisional Batch 03 artifact hash drift: " + name)


def run(check=False):
    outputs, manifest = build()
    provisional_rebuild = False
    if not check and (WS / "manifest.json").is_file() and not (WS / VERIFY_FILE).exists():
        validate_provisional_checkpoint_for_rebuild(outputs)
        provisional_rebuild = True
    for name, text in outputs.items():
        path = WS / name
        expected = text.encode("utf-8")
        if check:
            require(path.is_file() and path.read_bytes().replace(b"\r\n", b"\n") == expected,
                    "Batch 03 deterministic replay drift: " + name)
        else:
            require(not path.exists() or path.read_bytes().replace(b"\r\n", b"\n") == expected
                    or provisional_rebuild,
                    "Refusing to overwrite immutable Batch 03 artifact: " + name)
    if not check:
        for name, text in outputs.items():
            path = WS / name
            expected = text.encode("utf-8")
            if not path.exists() or path.read_bytes().replace(b"\r\n", b"\n") != expected:
                require(path.resolve().is_relative_to(WS.resolve()), "Unsafe Batch 03 output path")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(expected)
    if check:
        validate_detached_verification(WS / VERIFY_FILE, manifest["fingerprint"])
    return {"fingerprint": manifest["fingerprint"],
            "status": "PARTIAL_WITH_REVIEW_ITEMS_AND_PRESERVED_REGRESSION_FAILURE",
            "zeroWrites": check, "selected": 22, "eligible": 12,
            "deferred": 9, "rejected": 1, "newCorrectionsApplied": 12,
            "cumulativeCorrectionsApplied": 18, "effectiveSenses": 1563,
            "fullBatchSensesReviewed": 37}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    print(encode(run(args.check)), end="")


if __name__ == "__main__":
    main()
