# Phase 2H.2I — Aggregate editorial QA / coverage: PARTIAL

Bàn giao một checkpoint audit có giới hạn do ngân sách thực thi. Không tuyên bố hoàn tất toàn bộ 187 REVIEW hay 500 nhóm coverage. Dữ liệu gốc và mọi lịch sử QA/correction được giữ nguyên; đề xuất chưa áp dụng.

Remote parent: `a8015440d41ca4c33c43dbc723fd400e4fc6e8f0`. Checkpoint 05: `2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44`.

## Inventory and actual inspection

```json
{
  "additionalBoundaryProposals": 5,
  "cohortGroupsContentInspected": 91,
  "cohortGroupsIndexed": 500,
  "cohortSensesContentInspected": 107,
  "cohortSensesIndexed": 750,
  "confirmedContentDefects": 20,
  "confirmedGrammarSyntaxDefects": 0,
  "confirmedMissingMeaningGroups": 5,
  "confirmedTranslationDefects": 0,
  "corpusGroupsIndexed": 1020,
  "corpusSensesIndexed": 1563,
  "correctionProposalsCreated": 20,
  "coverageGroupsAssessed": 17,
  "coverageGroupsPending": 483,
  "coverageUnknownGroupsAssessed": 0,
  "coverageWarningGroups": 126,
  "coverageWarningGroupsPending": 109,
  "heuristicOnlyFindings": 14,
  "identityPosUncertaintiesInTriagedReviews": 5,
  "noStructuredOrdinalMetadataGroups": 111,
  "originalReviewRecords": 187,
  "passCalibrationDefectsFound": 2,
  "passCalibrationSampleSize": 60,
  "possibleMissingMeaningGroups": 1,
  "priorCorpusSampleSize": 20,
  "priorSampleDefectsFound": 16,
  "queueCounts": {
    "P0": 0,
    "P1": 5,
    "P2": 15,
    "P3": 38
  },
  "reviewRecordsPending": 162,
  "reviewRecordsTriaged": 25,
  "rightsClearanceViolationsConfirmed": 0,
  "rightsPendingCorpusRecords": 1563,
  "sourcePosConflictGroups": 11
}
```

Indexed không đồng nghĩa audited. cohortGroupsContentInspected/cohortSensesContentInspected là hợp các khóa có đánh giá nội dung thực sự, gồm triage, sample và coverage; chỉ 17 nhóm đã có quyết định coverage. Các danh sách PENDING đầy đủ nằm trong queue và các artifact audit.

## REVIEW triage — preserved original findings

- `EDITORIAL_2H2H:law:rule` — HEURISTIC_SIGNAL_ONLY: Quy tắc do cơ quan có thẩm quyền đặt ra và ví dụ nhãn thực phẩm khớp bản dịch. Similarity chỉ là tín hiệu từ văn bản; chưa chứng minh sao chép hay quyền sử dụng. Không đề nghị sửa nghĩa.
- `EDITORIAL_2H2H:participation:taking-part` — HEURISTIC_SIGNAL_ONLY: Participation in/by đúng cấu trúc; open to all staff được chuyển tự nhiên thành mọi nhân viên có thể tham gia. Việc diễn đạt lại không đảo nghĩa; cần xem phạm vi similarity riêng, không tự đổi PASS.
- `EDITORIAL_2H2H:whereby:by-which` — SENSE_BOUNDARY_UNCERTAIN: Whereby nối lại hệ thống vừa nêu; theo đó và đổi ca qua mạng khớp nhau. Nhãn ADVERB so với relative linker cần đối chiếu quy ước taxonomy; không suy ra thêm nghĩa chỉ vì khác tên loại.
- `EDITORIAL_2H2H:matter:be-important` — HEURISTIC_SIGNAL_ONLY: Matters là động từ nội động chỉ tầm quan trọng; cách chọn từ khi xin lỗi được giữ trong câu Việt. Chưa có lỗi nội dung do tín hiệu trùng cụm từ.
- `EDITORIAL_2H2H:education:learning-process` — HEURISTIC_SIGNAL_ONLY: Education rộng hơn việc đến trường; aims to improve vẫn là mục tiêu trong tiếng Việt. Ghi chú an education không khẳng định mọi cách dùng đều không đếm được.
- `EDITORIAL_2H2H:over:across` — HEURISTIC_SIGNAL_ONLY: Over đi qua hàng rào có danh ngữ bổ ngữ, đúng PREPOSITION; câu Việt giữ chuyển động nhảy qua. Không gộp với vị trí above hay adverb thăm nhà.
- `EDITORIAL_2H2H:last:final-in-order` — CONFIRMED_CONTENT_DEFECT: Nghĩa cuối trong thứ tự và câu chuyến xe cuối đều đúng. Ghi chú chứa nội dung quy trình Source label retained as evidence, không phù hợp trường grammar dành cho người học; đề xuất tách sang metadata. Nhãn determiner có bằng chứng từ điển, không xác nhận là sai.
- `EDITORIAL_2H2H:last:most-recently` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Last saw mô tả lần gần nhất trước hiện tại; câu Việt giữ thời điểm hội chợ, không biến thành lần cuối mãi mãi. REVIEW ở cấp nhóm không chứng minh lỗi ở nghĩa adverb này.
- `EDITORIAL_2H2H:last:final-person` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: The last to leave chỉ người cuối rời phòng; câu Việt đúng người và hành động. Phân tích noun/pronoun cần quy ước riêng, không tự đổi nội dung hay identity.
- `EDITORIAL_2H2H:last:continue` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Lasted longer diễn tả kéo dài, nội động và for/duration đúng. Câu Việt không thay thời lượng bằng chất lượng; REVIEW ban đầu liên quan nhãn của nghĩa khác trong nhóm.
- `EDITORIAL_2H2H:society:community-system` — HEURISTIC_SIGNAL_ONLY: Society trong ví dụ thư viện chỉ đời sống xã hội, không phải câu lạc bộ cụ thể. Nghĩa và bản dịch khớp; trùng cụm ngắn chưa đủ chứng minh sao chép.
- `EDITORIAL_2H2H:to:destination` — CONFIRMED_CONTENT_DEFECT: Destination PREPOSITION và đi tới ga đúng. Ghi chú this record là bình luận triển khai, nên thay bằng hướng dẫn phân biệt to + địa điểm với to + động từ. Ordinal mục đích còn thiếu thuộc coverage, không làm nghĩa hiện tại sai.
- `EDITORIAL_2H2H:speech:speaking` — HEURISTIC_SIGNAL_ONLY: Speech ở đây là lời nói rõ của diễn viên, không phải một bài diễn văn. Câu Việt giữ even at the back; không có suy diễn chẩn đoán.
- `EDITORIAL_2H2H:well-being:health-comfort` — HEURISTIC_SIGNAL_ONLY: Can support vẫn là khả năng; tiếng Việt giữ sức khỏe thể chất và tinh thần, không thành cam kết y tế. Similarity không tự động là vi phạm bản quyền; quyền vẫn chưa được xác minh.
- `EDITORIAL_2H2H:advise:recommend` — HEURISTIC_SIGNAL_ONLY: Advise us to carry và advise doing đúng bổ ngữ; bản dịch giữ lời khuyên thêm nước cho chuyến đi, không biến thành mệnh lệnh bắt buộc.
- `EDITORIAL_2H2H:mental:mind-related` — HEURISTIC_SIGNAL_ONLY: Mental effort trong giải câu đố là nỗ lực trí óc; nghĩa và bản dịch đúng, không nhầm với bệnh tâm thần. Tín hiệu trùng nguồn cần kiểm chứng riêng.
- `EDITORIAL_2H2H:further:additional` — SOURCE_POS_CONFLICT: Further details là adjective thêm thông tin; nguồn 4600 gắn PREPOSITION nhưng ví dụ của chính nó không chứng minh giới từ. Không dựng thêm Sense giới từ để khớp metadata.
- `EDITORIAL_2H2H:further:greater-distance` — SOURCE_POS_CONFLICT: Walked further along the bank là adverb khoảng cách; câu Việt giữ đi xa hơn để tìm bóng mát. Xung đột PREPOSITION ở nguồn không khiến ví dụ này sai.
- `EDITORIAL_2H2H:september:calendar-month` — NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI: Overlay hiển thị September đã sửa đúng viết hoa; definition tháng sau August trước October, ví dụ in September và tiếng Việt tháng Chín đều đúng. Finding viết hoa là lịch sử đã sửa, không tự xóa REVIEW.
- `EDITORIAL_2H2H:warming:getting-warmer` — HEURISTIC_SIGNAL_ONLY: Warming diễn tả quá trình tăng nhiệt; heater came on được giữ đúng sau khi máy sưởi bật, gradual thành ấm dần. Không thêm kết luận khí hậu.
- `EDITORIAL_2H2H:indifferent:uninterested` — HEURISTIC_SIGNAL_ONLY: Indifferent to đúng cấu trúc và seemed được giữ bằng có vẻ. Không quan tâm trong tiếng Việt là phủ định cần thiết, không phải polarity reversal.
- `EDITORIAL_2H2H:thirteen:number` — LEXICAL_IDENTITY_UNRESOLVED: Thirteen đúng 12+1, cả hai câu giữ 13 ghế. NUMBER là đề xuất cục bộ; unresolved phân loại không phải lỗi phép tính hay lý do đổi thành danh từ.
- `EDITORIAL_2H2H:exclude:not-include` — HEURISTIC_SIGNAL_ONLY: Excludes delivery nghĩa không tính giao hàng trong giá; câu Việt giữ phạm vi địa chỉ xa. Không bao gồm là phủ định đúng của exclude, không phải lỗi đổi polarity.
- `EDITORIAL_2H2H:exclude:bar-participation` — HEURISTIC_SIGNAL_ONLY: Exclude children from activity là ngăn tham gia; không cho trong tiếng Việt đúng nghĩa. Không gộp việc cấm tham gia với chi phí không nằm trong giá.
- `EDITORIAL_2H2H:decent:adequate` — SOURCE_POS_CONFLICT: Decent room là chất lượng khá tốt, không nhất thiết excellent; tiếng Việt trong khả năng chi trả khớp budget. NOUN trong 4600 mâu thuẫn ví dụ decent job, chưa có nghĩa danh từ được hỗ trợ.

Similarity/polarity là tín hiệu, không tự chứng minh lỗi. Indifferent cần nghĩa không quan tâm; exclude cần phủ định. September đã được overlay sửa viết hoa, nhưng REVIEW lịch sử không bị xóa. Nhãn last determiner có [bằng chứng Cambridge](https://dictionary.cambridge.org/dictionary/learner-english/last?q=last_2); không tự coi đây là lỗi POS.

## Source-supported coverage assessment

- `NORMALIZED_HEADWORD:hail` — CONFIRMED_GAP: Danh từ mưa đá có cả 4600 noun và ví dụ hail from storm; ba nghĩa hiện tại đều VERB. Đây là chức năng danh từ thiếu thật, không chỉ lỗi nhãn.
- `NORMALIZED_HEADWORD:to` — CONFIRMED_GAP: Oxford ordinal 1 ghi infinitive marker chỉ mục đích; destination ordinal 0 chưa bao phủ. Cần proposal chức năng marker và quyết định taxonomy trước author/import; không đổi thành PREPOSITION.
- `NORMALIZED_HEADWORD:harness` — CONFIRMED_GAP: Nguồn 4600 ví dụ harness a horse và nghĩa thắng ngựa, Oxford entry corroborates harnessing animal. Nghĩa tận dụng năng lượng hiện tại không bao phủ gắn bộ dây kéo.
- `NORMALIZED_HEADWORD:fiery` — CONFIRMED_GAP: 4600 nghĩa burning strongly và Cambridge literal flame corroboration; fiery speech hiện tại chỉ cường độ cảm xúc, thiếu nghĩa liên quan lửa.
- `NORMALIZED_HEADWORD:instrumental` — CONFIRMED_GAP: 4600 noun có plural instrumentals và Cambridge countable noun. Hai Sense adjective hiện tại không đại diện bản nhạc không lời như danh từ.
- `NORMALIZED_HEADWORD:further` — SOURCE_METADATA_CONFLICT: 4600 prep không có bổ ngữ chứng minh giới từ; Oxford additional adjective/distance adverb đều đã có. Không tạo nghĩa giới từ từ nhãn.
- `NORMALIZED_HEADWORD:decent` — SOURCE_METADATA_CONFLICT: 4600 noun nhưng decent person và decent job có chức năng adjective; hai nguồn nghĩa quality/behaviour đã đại diện.
- `NORMALIZED_HEADWORD:whoever` — SOURCE_METADATA_CONFLICT: 4600 noun nhưng whoever says clause sử dụng pronoun; Oxford pronoun và Sense any person hiện tại tương thích.
- `NORMALIZED_HEADWORD:quite` — SOURCE_METADATA_CONFLICT: 4600 adjective không chứng minh nghĩa tính từ; Oxford hai adverb degree/completeness đều có, strength phụ thuộc context/variety.
- `NORMALIZED_HEADWORD:fond` — SOURCE_METADATA_CONFLICT: 4600 verb mô tả be fond of, fond vẫn adjective; Oxford đúng adjective. Không tạo verb chỉ vì be là động từ.
- `NORMALIZED_HEADWORD:forward` — SOURCE_METADATA_CONFLICT: 4600 prep nhưng crawled forward to her là adverb kèm to-phrase; Oxford hai chức năng adjective/adverb đã có.
- `NORMALIZED_HEADWORD:guilty` — SOURCE_METADATA_CONFLICT: 4600 noun nhưng felt guilty là predicative adjective; responsibility/remorse hiện tại đều có. Không thay cảm giác guilt noun vào key guilty.
- `NORMALIZED_HEADWORD:million` — SOURCE_METADATA_CONFLICT: NUMBER/NOUN là phân tích khác nhau của numeral và nominal patterns; giá trị triệu đúng. Chưa chứng minh nghĩa mới từ nhãn noun.
- `NORMALIZED_HEADWORD:thus` — SOURCE_METADATA_CONFLICT: 4600 conjunction nhưng nối kết result không biến thành and; adverb consequence/manner có đủ source ordinals. Không chấp nhận comma splice.
- `NORMALIZED_HEADWORD:unlike` — POSSIBLE_GAP: Nguồn 4600 ví dụ unlike brother thực tế hỗ trợ preposition; từ điển cũng có adjective. Cần quyết định boundary/syntax theo entry đầy đủ trước kết luận thêm Sense riêng.
- `NORMALIZED_HEADWORD:including` — SOURCE_METADATA_CONFLICT: 4600 adjective nhưng including cat là cụm giới từ; Oxford preposition và ví dụ 8 người trong đó 2 mới đúng tổng.
- `NORMALIZED_HEADWORD:therefore` — SOURCE_METADATA_CONFLICT: 4600 conjunction là nhãn khác với connecting adverb trong Oxford; meaning consequence đã đủ, hai mệnh đề nối semicolon đúng.

Hail noun có [Cambridge](https://dictionary.cambridge.org/us/dictionary/english/hail); harness động từ thắng ngựa có [Oxford](https://www.oxfordlearnersdictionaries.com/definition/english/harness_2); fiery literal có [Cambridge](https://dictionary.cambridge.org/dictionary/english/fiery); instrumental noun có [Cambridge](https://dictionary.cambridge.org/us/dictionary/english/instrumental?topic=types-of-music). Chỉ nội dung search thực tế và nguồn local được ghim đã được dùng; không tuyên bố full-page verification hoặc quyền tái sử dụng. To dùng chỉ mục đích có local Oxford ordinal 1, cần quyết định taxonomy riêng.

111 nhóm thiếu structured ordinal là thiếu metadata; không tự gán CONFIRMED_GAP hay tuyên bố đã kiểm tra exhaustive. 0 COVERAGE_UNKNOWN đã kết luận trong 17 nhóm không có nghĩa 483 nhóm còn lại đã đầy đủ. Unlike vẫn POSSIBLE_GAP: khác phân tích adjective/preposition chưa đủ chứng minh phải có Sense riêng.

## Content-bound correction proposals: BEFORE / AFTER

20 lỗi nhỏ: bình luận về quy trình nằm trong grammar cho người học. Không xác nhận lỗi dịch hay lỗi ngữ pháp cú pháp. Mỗi đề xuất giữ parent hash, field hashes, rationale VI và yêu cầu full-batch re-review; chưa áp dụng.

### 2H2I-P001 — EDITORIAL_2H2H:last:final-in-order

Parent: `3b90b6036ec9ab1d61e76282b27f84cd519318457910ad7654579b0c4e36dcad`; field `/content/grammarNotesEn`.

**BEFORE:** Source label DETERMINER retained as evidence; last before a noun often takes the, while last week does not.

**AFTER (proposal only):** Before a noun, last often follows the: the last bus. Use last week without the when referring to the preceding week.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P002 — EDITORIAL_2H2H:to:destination

Parent: `4d0f7da3aee73f0de8dfa60f9c96b9ea4605e15ec0a8b99048162d3bf55ce33c`; field `/content/grammarNotesEn`.

**BEFORE:** Preposition followed by a destination noun phrase; this record does not treat the infinitive marker as a preposition.

**AFTER (proposal only):** Use to before a destination noun phrase: walk to the station. Before a base verb, to instead marks an infinitive: to walk.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P003 — EDITORIAL_2H2H:aggregate:combined-total

Parent: `31422e649ef345905db7c0030c5708bb283d023fc83070630427b550ff6f7ccf`; field `/content/grammarNotesEn`.

**BEFORE:** Usually before a noun such as cost or total; this record proposes the adjective rather than the related noun or verb.

**AFTER (proposal only):** Usually before a noun: aggregate cost, aggregate total. The adjective describes amounts considered together.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P004 — EDITORIAL_2H2H:weekly:each-week

Parent: `8d38a2a353ed83b376e1cea70a6a581b28774d5c3bf61f3700ef22fd9e8e4db6`; field `/content/grammarNotesEn`.

**BEFORE:** Adjective before a noun or after a linking verb; in this record weekly is not an adverb modifying a verb.

**AFTER (proposal only):** Adjective before a noun: a weekly market. Weekly can also be an adverb, as in the club meets weekly.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P005 — EDITORIAL_2H2B:have to:necessity

Parent: `687880e1f1d9079c04a4a057eb37a3c445ed29facc77659e8aa2e38d0de4dbbe`; field `/content/grammarNotesEn`.

**BEFORE:** have to + base verb; don't have to means no necessity, not prohibition. The negative source group is treated as a polarity pattern, not automatically a new Sense.

**AFTER (proposal only):** Have to plus base verb; has to with he, she or it. Do not have to means that an action is unnecessary, whereas must not expresses prohibition.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P006 — EDITORIAL_2H2B:billion:large-number

Parent: `96b87dee7056863d363bf2b7c981f6e27df5d7df9a46c8347e226e9c3f471e11`; field `/content/grammarNotesEn`.

**BEFORE:** Source NUMBER has no direct Master POS enum; OTHER is a local review proposal, not an approved noun conversion. Use billion after exact numbers without plural s.

**AFTER (proposal only):** Use billion without plural -s after an exact number: two billion dollars. Use billions of for an unspecified very large quantity.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P007 — EDITORIAL_2H2B:abstract:not-concrete

Parent: `697273a6008fa1aa2bb11e0bce364057d3a0b5f93a31750526c22b5948b95f9d`; field `/content/grammarNotesEn`.

**BEFORE:** This is the conceptual adjective; an article summary is a separate noun use not supported by this source grouping.

**AFTER (proposal only):** An abstract idea or quality is not a physical object. Contrast the adjective in an abstract concept with the noun in an abstract of an article.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P008 — EDITORIAL_2H2C:per cent:per-hundred

Parent: `a4df43539de2c285c031a39d82c971a666f4e619eec8b8391ed45241ec3c3da9`; field `/content/grammarNotesEn`.

**BEFORE:** Number expression; source NOUN/ADJECTIVE/ADVERB analysis unresolved. OTHER is a temporary local proposal, not a new approved numeral enum.

**AFTER (proposal only):** Use a number before per cent and of before the whole being measured: twenty per cent of the tickets. Percent is a common one-word spelling, especially in American English.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P009 — EDITORIAL_2H2C:visible (adj):can-be-seen

Parent: `bfe7e40396018616df711d7d7bb83edd6126f8fec799303d76a4bc35469f3b5c`; field `/content/grammarNotesEn`.

**BEFORE:** Proposed display visible; (adj) is a source annotation, not part of the lexical unit; no silent source-key merge.

**AFTER (proposal only):** Visible from a place identifies a viewing location; visible to someone identifies the observer. Invisible is the opposite adjective.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P010 — EDITORIAL_2H2B:at the onset:at-beginning

Parent: `c62d1274ee96a0ac69e9bb9ff1544b48bd6e0d7957f360bf415cdcd4863dccac`; field `/content/grammarNotesEn`.

**BEFORE:** at the onset of + noun; phrase-level adverbial prepositional construction, not the source-tagged noun onset by itself.

**AFTER (proposal only):** Use at the onset of plus a noun: at the onset of winter. Onset names the beginning of an event or process.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P011 — EDITORIAL_2H2B:academic:education-research

Parent: `79a5a571d6d922fb4f45c37fbf0da27445ddcdc0d2809ffed3b4c335887baa03`; field `/content/grammarNotesEn`.

**BEFORE:** Source study and scholarship groups are provisionally combined; owner may split educational performance from research use.

**AFTER (proposal only):** Usually before a noun: academic work, academic achievement, an academic journal. Academically is the related adverb.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P012 — EDITORIAL_2H2C:plenty:more-than-enough

Parent: `a2cec872a9c8c6360f3f578a6d2b05a00797f13711cfc7f9bf67982e24152974`; field `/content/grammarNotesEn`.

**BEFORE:** plenty of + plural count noun/uncountable noun; PRONOUN is source convention, nominal analysis also needs review.

**AFTER (proposal only):** Plenty of plus a plural countable noun or an uncountable noun: plenty of chairs, plenty of time. Plenty can stand alone when the thing is understood.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P013 — EDITORIAL_2H2B:aboard:on-transport

Parent: `6693d6af7d6e3ec82f575461b209dfc9af316e3372e5cbb22031c20c784e79b4`; field `/content/grammarNotesEn`.

**BEFORE:** aboard + vehicle; an adverbial use also exists but is outside this source POS proposal.

**AFTER (proposal only):** Aboard plus a vehicle noun phrase: aboard the ferry. It can also stand alone when the vehicle is understood: welcome aboard.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P014 — EDITORIAL_2H2B:acute:rapid-onset

Parent: `d3af89e76f5b7b49f06e772cd8dab9cb54d6b55b4a3a071bb50dd9e89860a015`; field `/content/grammarNotesEn`.

**BEFORE:** Medical terminology draft only; not a diagnosis or treatment claim. Human terminology review required.

**AFTER (proposal only):** An acute condition; acute pain. Contrast acute with chronic when describing the course of a condition; acute can have other meanings in nonmedical contexts.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P015 — EDITORIAL_2H2B:book:written-volume

Parent: `2238b7b7dcbd0cfb9adde0ad5624edf84cdfa5f5af9e67e3669a1d82aeef8886`; field `/content/grammarNotesEn`.

**BEFORE:** Countable; do not infer identity with an existing booking Sense from the same spelling.

**AFTER (proposal only):** Countable; a book about a subject, borrow a book from a library. Book can name a printed volume or an electronic work.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P016 — EDITORIAL_2H2C:warming (n):becoming-warmer

Parent: `89c10bb6194482da729de08f473062b62353a733c8fdc89376e870ff1ad0cd05`; field `/content/grammarNotesEn`.

**BEFORE:** Proposed display warming; (n) is source metadata. General temperature process, no automatic climate-topic classification.

**AFTER (proposal only):** Usually uncountable for a temperature process: the warming of a lake. Warming can also modify a noun in a warming effect.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P017 — EDITORIAL_2H2B:above:higher-than

Parent: `cfeef90b455e21fdba7a46b2ee8c96a53fdb7dba1f975eb7cb444088ed131eb3`; field `/content/grammarNotesEn`.

**BEFORE:** above + noun phrase; do not inherit the conflicting source adjective tag automatically.

**AFTER (proposal only):** Above plus a noun phrase: above the door. Above can also stand alone when the reference point is understood.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P018 — EDITORIAL_2H2B:alone:independently

Parent: `2b6c86d7f9b80a930330c1770b33d2e9fcf6041fad814f8fec8c8d1167bf2e74`; field `/content/grammarNotesEn`.

**BEFORE:** Modifies an action; no noun identity is inferred from the conflicting source tag.

**AFTER (proposal only):** Alone can modify an action: walk alone, work alone. On your own is a common alternative in this use.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P019 — EDITORIAL_2H2C:thereby:as-a-result

Parent: `0c19f9f8d2b01767698fe310d3176a6a645a287432829121a2de2e7f912b6748`; field `/content/grammarNotesEn`.

**BEFORE:** Linking adverb, often thereby + participle; conflicting CONJUNCTION source tag not accepted automatically.

**AFTER (proposal only):** Often thereby plus an -ing participle: thereby making the task easier. It connects an action with a result or means.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

### 2H2I-P020 — EDITORIAL_2H2B:banana:fruit

Parent: `27703c06dc727d7af39b64df11e1c663d432b231399f2f15578d4bcbe9f9623c`; field `/content/grammarNotesEn`.

**BEFORE:** Countable fruit; review word choice for local varieties without changing identity automatically.

**AFTER (proposal only):** Countable; a banana, ripe bananas. A bunch of bananas names several fruits attached together.

Tách bình luận về bản ghi, nguồn, taxonomy hoặc quyết định biên tập khỏi trường grammar; giữ cấu trúc thực hành hữu ích và không đổi nghĩa/ví dụ.

## Additional boundary proposals — not new canonical Senses

- `NORMALIZED_HEADWORD:hail` / NOUN: Small pieces of ice that fall from clouds as precipitation. — mưa đá; hạt mưa đá Example: Hail rattled against the shed roof during the storm. / Mưa đá gõ lộp bộp lên mái nhà kho trong cơn bão.
- `NORMALIZED_HEADWORD:harness` / VERB: To fit an animal with straps and equipment that connect it to something it will pull. — đóng bộ dây kéo cho vật nuôi; thắng ngựa Example: The farmer harnessed the horse to the empty cart. / Người nông dân thắng ngựa vào chiếc xe kéo trống.
- `NORMALIZED_HEADWORD:fiery` / ADJECTIVE: Burning strongly or showing the heat or bright appearance of fire. — bốc cháy dữ dội; rực như lửa Example: A fiery glow rose above the furnace opening. / Một quầng sáng rực như lửa bốc lên trên miệng lò.
- `NORMALIZED_HEADWORD:instrumental` / NOUN: A piece of music performed with instruments and without singing. — bản nhạc không lời Example: The trio played a short instrumental before the singer returned. / Nhóm tam tấu chơi một bản nhạc không lời ngắn trước khi ca sĩ trở lại.
- `NORMALIZED_HEADWORD:to` / INFINITIVE_MARKER_REQUIRES_TAXONOMY_REVIEW: Used before a base verb to introduce the purpose of an action. — để; dùng trước động từ nguyên mẫu chỉ mục đích Example: She moved the chair to make room for the table. / Cô ấy chuyển chiếc ghế để chừa chỗ cho chiếc bàn.

## PASS calibration and escalation

60 cohort PASS từ 5 checkpoint, A1–C2, 10 POS và 3 source-membership strata; chọn có chủ đích theo receipt đã ghim, không ngẫu nhiên. Đã đọc definition, nghĩa VI, example EN/VI và grammar của từng Sense. Có 2 minor content-hygiene findings (aggregate / weekly). 20 Sense trước đó dùng bản effective mới nhất; 16 có process commentary, 4 chưa thấy lỗi nội dung trong phạm vi đọc. Thành công của successfully sau 2H.2G được giữ nguyên. Acute có điểm cần kiểm tra phạm vi nghĩa lâm sàng, chưa đủ bằng chứng kết luận lỗi semantic.

No final cohort PASS carries an actual source-similarity flag because flags promote to REVIEW; such risks require REVIEW triage, not relabelling a PASS sample.

Lặp lại process commentary kích hoạt mở rộng review batch gốc và các ghi chú tương tự. Việc mở rộng vẫn PENDING, do đó PARTIAL và không suy rộng tỷ lệ lỗi cho corpus. Assessment này là AI content inspection, không phải independent human calibration.

## Pending work and handoff

162 REVIEW chưa triage; 483 nhóm chưa kết luận coverage, gồm 109 nhóm warning. Hoàn tất các phần này và expanded batch review trước khi đóng full aggregate audit. Sau đó đề xuất targeted DRAFT remediation cho 20 field proposals / 5 source-supported boundaries, với owner review khi cần. Chưa áp dụng correction và chưa bắt đầu mở rộng 5,123 nhóm còn lại.

All 1,563 effective Senses and checkpoints 01–05 remain byte-identical through accepted-input-pins.json. All original QA findings / correction histories remain pinned and referenced. Hybrid-100 v2.2.1 stays 87 Lexemes / 100 Senses; no Master release, legacy, mapping or runtime modifications.

DRAFT; rights UNKNOWN_REVIEW_REQUIRED. Owner approvals / canonical IDs / applied corrections: 0. Database access/writes: NONE/NONE. Production: UNTOUCHED. External tests/typecheck/lint/replay evidence appears only in verification-results.json after actual execution; the deterministic generator does not claim to run them.

STOP after this verified PARTIAL publication. No new cohort, formal approval cycle or database import.
