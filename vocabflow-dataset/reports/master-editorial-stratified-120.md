# Phase 2H.2C — Stratified 120-group editorial drafts

AUTHORED DRAFTS / AI SELF-REVIEW COMPLETE; HUMAN CONTENT, IDENTITY AND RIGHTS REVIEW PENDING.

Source/pipeline input pins are historical and immutable. Publication began on TXH at 6c06e99ae8f40020d826c7aa140b4da1a107a6c2. No canonical Master, DB or runtime operation.

Selection fingerprint: `2d380a64570532fd3afce23b5b84bd9a63dc525d2d56b67453b38f4418456a79`.
Editorial fingerprint: `a84e173137c48a1f9258c9c74d84b63f642b15651f8bd1f72378c72fe825a935`.

## Accounting

```json
{
  "actualMultiwordUnits": 8,
  "canonicalIdsAllocated": 0,
  "cefrEvidenceGroupCoverage": {
    "A1": 31,
    "A2": 27,
    "B1": 12,
    "B2": 27,
    "C1": 20,
    "C2": 13
  },
  "correctedSenseDrafts": 7,
  "draftPosGroupCoverage": {
    "ADJECTIVE": 31,
    "ADVERB": 17,
    "CONJUNCTION": 1,
    "DETERMINER": 3,
    "INTERJECTION": 1,
    "NOUN": 70,
    "OTHER": 1,
    "PREPOSITION": 1,
    "PRONOUN": 5,
    "VERB": 24
  },
  "englishDefinitions": 187,
  "englishExamples": 187,
  "fullAiReviewedGroups": 120,
  "groupsBlocked": 0,
  "groupsWithDrafts": 120,
  "highRiskGroups": 78,
  "humanReviewedGroups": 0,
  "identityPending": 187,
  "multiSenseGroups": 48,
  "newGroupsSelected": 120,
  "originalWordingCorrections": 11,
  "overlapWithPilot": 0,
  "ownerApproved": 0,
  "previousPilotGroups": 100,
  "qa": {
    "REVIEW": 187
  },
  "runtimeMappings": 0,
  "senseDrafts": 187,
  "sourceGroupsTotal": 6143,
  "sourceMultiwordFlags": 10,
  "sourceSimilaritySenses": 0,
  "sourceStrataGroups": {
    "BOTH": 64,
    "OXFORD_ONLY": 36,
    "VOCAB4600_ONLY": 20
  },
  "vietnameseExampleTranslations": 187,
  "vietnameseMeanings": 187
}
```

## Selection and quota limitations

Fixed seed QA1_STRATIFIED_EXTENSION_120; exact-key SHA-256 rank, scarce-quota rotation, stable bucket fill and deterministic repair. Cohort frozen before drafting, never changed to avoid a difficult word. Each of six buckets contains 20 groups. Source POS membership is an overlapping evidence signal, not an approved primary POS count.

```json
{
  "achieved": {
    "OXFORD_ONLY": 36,
    "VOCAB4600_ONLY": 20,
    "BOTH": 64,
    "NOUN": 72,
    "VERB": 26,
    "ADJECTIVE": 35,
    "ADVERB": 18,
    "POSSIBLE_POLYSEMY": 49,
    "MULTIWORD_PHRASAL": 10,
    "POS_CONFLICT": 10,
    "CEFR_CONFLICT": 10,
    "EXISTING_MASTER_LEMMA": 10,
    "LEGACY_HISTORY": 10,
    "CEFR_A1": 31,
    "CEFR_A2": 27,
    "CEFR_B1": 12,
    "CEFR_B2": 27,
    "CEFR_C1": 20,
    "CEFR_MISSING": 0
  },
  "shortages": [
    {
      "quota": "CEFR_MISSING",
      "target": 1,
      "available": 0,
      "achieved": 0,
      "shortage": 1,
      "reason": "INSUFFICIENT_ELIGIBLE_CAPACITY"
    }
  ]
}
```

Missing CEFR evidence has zero eligible capacity in this accepted pool. C2 evidence is also retained. Source multiword flags reach 10, but linguistic review identifies only eight actual multiword units: visible (adj) and warming (n) contain metadata. The actual-unit target is short by two; do not claim all linguistic quotas met. Freeze is preserved and annotation/form identity remains unresolved.

## QA process and limitations

24 batches of five groups, below every ordinary/identity/sensitive size cap. All 120 groups and all persisted Senses were read and self-reviewed by the AI author across 13 dimensions; linguistic-review.psv contains group-specific actual judgments. This is not an independent human review. Requested low-risk sample minimum 10 exceeds each five-group batch, so full batch review replaces sampling. Source/POS/CEFR coverage is explicitly recorded; no nonexistent sample groups are invented.

A critical meaning/identity/rights finding escalates its entire stratum; two substantive grammar/translation findings escalate the batch. All batches and strata already receive full AI review; human review is still pending. Similarity warnings remain visible and never confer permission. No rights clearance, owner approval or Master promotion.

## Actual BEFORE/AFTER corrections

### EDITORIAL_2H2C:monkey:primate

BEFORE: An animal belonging to a group of primates that commonly have tails and can climb.

AFTER (DRAFT): A primate, distinct from an ape, that usually has a tail and can use its hands to hold things.

Initial definition did not explicitly exclude apes and could overgeneralize primates. Smithsonian concept check supports most-visible-tail caveat; field clarified without a universal tail claim.

### EDITORIAL_2H2C:intriguing:interesting-mysterious

BEFORE: hấp dẫn, khiến người ta tò mò muốn tìm hiểu thêm

AFTER (DRAFT): gợi sự tò mò, khiến người ta muốn tìm hiểu thêm

Hấp dẫn alone may suggest general attractiveness; Vietnamese draft narrowed to curiosity. Example remains an intriguing hidden note; owner naturalness review pending.

### EDITORIAL_2H2C:dwell:live-in-place

BEFORE: To live in a particular place.

AFTER (DRAFT): To make one's home in a place, usually for a long time.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:combine:join-together

BEFORE: To join two or more things so that they work or form something together.

AFTER (DRAFT): To bring separate things together into a single mixture, arrangement or activity.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:combine:join-together

BEFORE: kết hợp hai hay nhiều thứ để chúng cùng hoạt động hoặc tạo thành một thứ

AFTER (DRAFT): kết hợp những thứ riêng rẽ thành một hỗn hợp, cách sắp xếp hoặc hoạt động chung

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:even:divisible-by-two

BEFORE: Eight is an even number.

AFTER (DRAFT): The teacher asked us to name an even number larger than ten.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:even:divisible-by-two

BEFORE: Tám là một số chẵn.

AFTER (DRAFT): Giáo viên yêu cầu chúng tôi nêu một số chẵn lớn hơn mười.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:nature:essential-character

BEFORE: We need to understand the nature of the problem.

AFTER (DRAFT): The workshop explored the nature of trust between neighbours.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:nature:essential-character

BEFORE: Chúng ta cần hiểu bản chất của vấn đề.

AFTER (DRAFT): Buổi thảo luận tìm hiểu bản chất của sự tin tưởng giữa những người hàng xóm.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:terminal:transport-building

BEFORE: Our flight leaves from the smaller airport terminal.

AFTER (DRAFT): My boarding pass shows the terminal on the east side of the airport.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

### EDITORIAL_2H2C:terminal:transport-building

BEFORE: Chuyến bay của chúng tôi khởi hành từ nhà ga sân bay nhỏ hơn.

AFTER (DRAFT): Thẻ lên máy bay của tôi ghi nhà ga nằm ở phía đông sân bay.

Full-source exact/8-token screen found overlap in the initial draft or its paired field. AI revised original wording and rechecked bilingual equivalence. A similarity signal is not a legal conclusion; no license or owner approval inferred.

## External fact checks — concept evidence, no text reuse license

- [NIH immune-system overview](https://research.nih.gov/research-at-nih/immune-system): Network of cells, tissues and organs; no diagnostic inference.
- [US Courts glossary for journalists](https://www.mied.uscourts.gov/PDFFIles/JournalistGuideFederalCourts.pdf): Bail release versus possible bond-money sense; jurisdiction caveat retained.
- [Cambridge percent](https://dictionary.cambridge.org/dictionary/english/percent): Per-hundred numerical concept and spelling variant; no automatic source POS approval.
- [Cambridge fluid](https://dictionary.cambridge.org/us/dictionary/english/fluid?q=fluid_3): Changing-plans adjective checked separately from physical flowing-substance noun.
- [Smithsonian gibbons and monkey tails](https://nationalzoo.si.edu/animals/news/how-long-are-gibbons-arms-and-more-gibbon-facts): Most monkeys have visible tails; exceptions disclosed; apes excluded in ordinary lexical description.
- [NCI terminal cancer](https://www.cancer.gov/publications/dictionaries/cancer-terms/def/terminal-cancer): End-stage prognosis concept; does not establish an individual outcome or restrict the draft solely to cancer.

## Complete bilingual draft preview

### EDITORIAL_2H2C:breakdown:machine-failure

breakdown / NOUN / WORD (all proposals)

Label: a machine stops working

Definition EN: A failure that prevents a machine or vehicle from working.

Meaning VI: sự hỏng hóc khiến máy móc hoặc xe không hoạt động được

Example EN: A breakdown left our bus beside the road.

Example VI: Một sự cố hỏng hóc khiến xe buýt của chúng tôi nằm lại bên đường.

Grammar/boundary: Countable; a breakdown of a vehicle, not an itemized list.

AI review: Three contexts distinguish machine failure, failed communication and itemized costs; no emotional-diagnosis Sense. Each Vietnamese example retains its event and participants.

Source pointers: oxford-normalized-inventory.json#/records/4151, vocab4600-normalized-inventory.json#/records/2671.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:breakdown:relationship-failure

breakdown / NOUN / WORD (all proposals)

Label: a relationship or process fails

Definition EN: A failure of communication, cooperation or an organized process.

Meaning VI: sự đổ vỡ trong giao tiếp, hợp tác hoặc một quá trình có tổ chức

Example EN: The talks ended after a breakdown in communication.

Example VI: Các cuộc đàm phán kết thúc sau khi việc trao đổi thông tin bị đổ vỡ.

Grammar/boundary: a breakdown in communication; relationship/process boundary needs review.

AI review: Three contexts distinguish machine failure, failed communication and itemized costs; no emotional-diagnosis Sense. Each Vietnamese example retains its event and participants.

Source pointers: oxford-normalized-inventory.json#/records/4151, vocab4600-normalized-inventory.json#/records/2671.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:breakdown:itemized-analysis

breakdown / NOUN / WORD (all proposals)

Label: information divided into parts

Definition EN: An explanation that separates a total or subject into its individual parts.

Meaning VI: bảng hoặc phần phân tích tách một tổng thể thành các mục riêng

Example EN: The invoice includes a breakdown of the delivery costs.

Example VI: Hóa đơn có phần phân tích chi tiết các chi phí giao hàng.

Grammar/boundary: a breakdown of costs; not a mechanical failure.

AI review: Three contexts distinguish machine failure, failed communication and itemized costs; no emotional-diagnosis Sense. Each Vietnamese example retains its event and participants.

Source pointers: oxford-normalized-inventory.json#/records/4151, vocab4600-normalized-inventory.json#/records/2671.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:behaviour:way-of-acting

behaviour / NOUN / WORD (all proposals)

Label: how someone acts

Definition EN: The way a person or animal acts in a situation.

Meaning VI: cách một người hoặc động vật hành động trong một tình huống

Example EN: The trainer watched the dog's behaviour around strangers.

Example VI: Người huấn luyện quan sát cách con chó phản ứng khi ở gần người lạ.

Grammar/boundary: Usually uncountable in this everyday use; behaviour is British spelling, behavior American.

AI review: Animal behaviour example is neutral; uncountable noun and UK spelling noted. The translation renders observed reactions without adding a motive.

Source pointers: oxford-normalized-inventory.json#/records/1336.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:captive:held-person

captive / NOUN / WORD (all proposals)

Label: a person held prisoner

Definition EN: A person who is held and is not allowed to leave.

Meaning VI: người bị giam giữ và không được phép rời đi

Example EN: The guards moved the captive to another room.

Example VI: Những người canh gác chuyển người bị giam sang một phòng khác.

Grammar/boundary: Countable noun; no assumption about lawful detention; adjective use not evidenced here.

AI review: Noun prisoner scope matches the evidence; no lawful-detention inference. The transfer event and guards remain in Vietnamese.

Source pointers: vocab4600-normalized-inventory.json#/records/3111.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:contingent:subgroup

contingent / NOUN / WORD (all proposals)

Label: a group within a larger gathering

Definition EN: A group of people representing one organization or place within a larger group.

Meaning VI: nhóm người đại diện cho một tổ chức hoặc nơi trong một tập thể lớn hơn

Example EN: A small contingent from our club joined the parade.

Example VI: Một nhóm nhỏ từ câu lạc bộ của chúng tôi tham gia cuộc diễu hành.

Grammar/boundary: a contingent from/of; this noun is distinct from adjective contingent on.

AI review: A representative subgroup is supported; adjective contingency not drafted. Parade example demonstrates membership, not uncertainty.

Source pointers: vocab4600-normalized-inventory.json#/records/2695.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:deprive:take-away

deprive / VERB / WORD (all proposals)

Label: deny someone something

Definition EN: To take something away from someone or prevent them from having it.

Meaning VI: tước đi hoặc ngăn ai có được điều gì

Example EN: The long power cut deprived the village of clean water.

Example VI: Đợt mất điện kéo dài khiến ngôi làng không có nước sạch.

Grammar/boundary: deprive someone of something; transitive object required.

AI review: Object plus of-complement explicitly reviewed; village/water deprivation stays causally tied to the power cut.

Source pointers: oxford-normalized-inventory.json#/records/4976, vocab4600-normalized-inventory.json#/records/2961.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:cave:rock-chamber

cave / NOUN / WORD (all proposals)

Label: a natural space in rock

Definition EN: A natural hollow space in rock, often large enough for a person to enter.

Meaning VI: hang tự nhiên trong đá, thường đủ lớn để người đi vào

Example EN: We saw bats near the mouth of the cave.

Example VI: Chúng tôi thấy dơi ở gần cửa hang.

Grammar/boundary: Countable; cave entrance/mouth; no cave-in verb proposal.

AI review: Natural hollow in rock excludes buildings; bats are context, not a required feature. Vietnamese keeps the location near the entrance.

Source pointers: oxford-normalized-inventory.json#/records/3303, vocab4600-normalized-inventory.json#/records/2693.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:dwell:live-in-place

dwell / VERB / WORD (all proposals)

Label: live somewhere

Definition EN: To make one's home in a place, usually for a long time.

Meaning VI: sống hoặc cư trú ở một nơi

Example EN: The story describes people who dwell beside a remote lake.

Example VI: Câu chuyện miêu tả những người sống bên một hồ nước hẻo lánh.

Grammar/boundary: dwell in/at; formal or literary; dwelt/dwelled; dwell on is another construction.

AI review: Live-in-place source supports a literary verb; dwell on is not included. Formal register and intransitive preposition are disclosed.

Source pointers: vocab4600-normalized-inventory.json#/records/2924.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:both:two-together-determiner

both / DETERMINER / WORD (all proposals)

Label: the two together

Definition EN: Used before a plural noun to include each of two people or things.

Meaning VI: cả hai người hoặc vật, dùng trước danh từ số nhiều

Example EN: Both windows were open during the lesson.

Example VI: Cả hai cửa sổ đều mở trong giờ học.

Grammar/boundary: both + plural noun; shared meaning with pronoun, representation split pending.

AI review: Shared two-member meaning has two grammatical proposals; possible coalescence is pending. Plural noun versus standalone pronoun checked in the paired examples.

Source pointers: oxford-normalized-inventory.json#/records/128.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:both:two-together-pronoun

both / PRONOUN / WORD (all proposals)

Label: each of the two

Definition EN: The two people or things already mentioned, considered together.

Meaning VI: cả hai người hoặc vật đã được nhắc đến

Example EN: I tried the two pens, and both worked well.

Example VI: Tôi thử hai chiếc bút, và cả hai đều viết tốt.

Grammar/boundary: both as a pronoun; grammatical-use distinction may coalesce with determiner.

AI review: Shared two-member meaning has two grammatical proposals; possible coalescence is pending. Plural noun versus standalone pronoun checked in the paired examples.

Source pointers: oxford-normalized-inventory.json#/records/128.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:disease:illness

disease / NOUN / WORD (all proposals)

Label: an illness affecting a body

Definition EN: An illness or disorder that affects how a body normally works.

Meaning VI: bệnh hoặc rối loạn ảnh hưởng đến hoạt động bình thường của cơ thể

Example EN: The lesson discussed how some diseases spread between people.

Example VI: Bài học thảo luận về cách một số bệnh lây truyền giữa người với người.

Grammar/boundary: Countable for particular diseases; not all diseases are infectious; no diagnosis.

AI review: Definition avoids equating all disease with infection. Some diseases in the example is faithfully limited in Vietnamese; specialist verification remains pending.

Source pointers: oxford-normalized-inventory.json#/records/1189, vocab4600-normalized-inventory.json#/records/2710.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:bail:conditional-release

bail / NOUN / WORD (all proposals)

Label: release while awaiting trial

Definition EN: Permission for an accused person to remain out of custody while awaiting trial under stated conditions.

Meaning VI: việc cho người bị buộc tội tại ngoại trong khi chờ xét xử với các điều kiện nhất định

Example EN: The court released him on bail until the next hearing.

Example VI: Tòa án cho anh ấy tại ngoại cho đến phiên điều trần tiếp theo.

Grammar/boundary: on bail; conditions vary by jurisdiction; not proof of innocence or a guarantee of acquittal.

AI review: Release and security-money uses are related but contextually distinct. Financial conditions are not universal; US court evidence checks the concept, not global legal uniformity.

Source pointers: oxford-normalized-inventory.json#/records/4304, vocab4600-normalized-inventory.json#/records/4159.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:bail:security-money

bail / NOUN / WORD (all proposals)

Label: money linked to pretrial release

Definition EN: Money or security required as a condition of release from custody before trial.

Meaning VI: tiền hoặc tài sản bảo đảm được yêu cầu để cho tại ngoại trước xét xử

Example EN: Her family helped provide the bail set by the court.

Example VI: Gia đình cô ấy giúp cung cấp khoản bảo đảm tại ngoại do tòa ấn định.

Grammar/boundary: Uncountable financial use; not all pretrial release requires money; legal scope needs human review.

AI review: Release and security-money uses are related but contextually distinct. Financial conditions are not universal; US court evidence checks the concept, not global legal uniformity.

Source pointers: oxford-normalized-inventory.json#/records/4304, vocab4600-normalized-inventory.json#/records/4159.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:combine:join-together

combine / VERB / WORD (all proposals)

Label: bring things together

Definition EN: To bring separate things together into a single mixture, arrangement or activity.

Meaning VI: kết hợp những thứ riêng rẽ thành một hỗn hợp, cách sắp xếp hoặc hoạt động chung

Example EN: We combined the two small tables to make a longer desk.

Example VI: Chúng tôi ghép hai chiếc bàn nhỏ thành một bàn làm việc dài hơn.

Grammar/boundary: combine A and B; combine A with B; intransitive combine possible.

AI review: Transitive object and joined result match; objects remain tables in both languages. Other valencies are usage notes, not automatic new Senses.

Source pointers: oxford-normalized-inventory.json#/records/2284, vocab4600-normalized-inventory.json#/records/2331.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:clearly:easy-to-understand

clearly / ADVERB / WORD (all proposals)

Label: in an understandable way

Definition EN: In a way that is easy to hear, see or understand.

Meaning VI: một cách rõ ràng, dễ nghe, nhìn hoặc hiểu

Example EN: Please explain the meeting point clearly to the visitors.

Example VI: Hãy giải thích rõ điểm hẹn cho khách.

Grammar/boundary: Modifies explain here; inference use meaning obviously is not separately drafted.

AI review: Understandable manner is demonstrated by explain, not inferred obviousness. The command and recipients remain in translation.

Source pointers: oxford-normalized-inventory.json#/records/1172.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:capitalist:economic-system

capitalist / ADJECTIVE / WORD (all proposals)

Label: related to capitalism

Definition EN: Related to an economic system in which businesses and property are mainly privately owned.

Meaning VI: thuộc hệ thống kinh tế mà doanh nghiệp và tài sản chủ yếu thuộc sở hữu tư nhân

Example EN: The essay compares two capitalist economies.

Example VI: Bài luận so sánh hai nền kinh tế tư bản.

Grammar/boundary: Attributive adjective; neutral description, not an endorsement of an economic system.

AI review: Adjective system and noun investor require POS review. Neutral economy description and investor example avoid implying every supporter owns capital.

Source pointers: oxford-normalized-inventory.json#/records/4644, vocab4600-normalized-inventory.json#/records/3011.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:capitalist:owner-investor

capitalist / NOUN / WORD (all proposals)

Label: an owner or investor of capital

Definition EN: A person who owns or invests money in businesses to make a profit.

Meaning VI: người sở hữu hoặc đầu tư vốn vào doanh nghiệp để kiếm lợi nhuận

Example EN: The factory attracted several wealthy capitalists.

Example VI: Nhà máy thu hút một số nhà tư bản giàu có.

Grammar/boundary: Countable noun supported by 4600 POS evidence; ideological-supporter use not assumed.

AI review: Adjective system and noun investor require POS review. Neutral economy description and investor example avoid implying every supporter owns capital.

Source pointers: oxford-normalized-inventory.json#/records/4644, vocab4600-normalized-inventory.json#/records/3011.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:charm:appeal

charm / NOUN / WORD (all proposals)

Label: an attractive personal quality

Definition EN: A quality that makes a person or place pleasant and attractive.

Meaning VI: nét duyên hoặc sức hấp dẫn khiến người hay nơi chốn dễ mến

Example EN: The little bookshop has a quiet charm of its own.

Example VI: Hiệu sách nhỏ có nét cuốn hút yên bình riêng.

Grammar/boundary: Usually uncountable in this use; not a magical object.

AI review: Place appeal and believed lucky object have distinct references. Belief is attributed, not claimed true; the unsupported verb is left for later evidence review.

Source pointers: oxford-normalized-inventory.json#/records/4124, vocab4600-normalized-inventory.json#/records/2559.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:charm:lucky-object

charm / NOUN / WORD (all proposals)

Label: an object believed to bring luck

Definition EN: A small object that someone believes brings luck or protection.

Meaning VI: vật nhỏ được tin là đem lại may mắn hoặc sự bảo vệ

Example EN: She kept a wooden charm in her travel bag.

Example VI: Cô ấy giữ một chiếc bùa gỗ trong túi du lịch.

Grammar/boundary: Countable; belief is attributed to a person, not stated as fact.

AI review: Place appeal and believed lucky object have distinct references. Belief is attributed, not claimed true; the unsupported verb is left for later evidence review.

Source pointers: oxford-normalized-inventory.json#/records/4124, vocab4600-normalized-inventory.json#/records/2559.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:drink:liquid-for-drinking

drink / NOUN / WORD (all proposals)

Label: a liquid to drink

Definition EN: A liquid intended for someone to swallow, or a serving of it.

Meaning VI: đồ uống hoặc một phần đồ uống

Example EN: He chose a cold fruit drink from the menu.

Example VI: Anh ấy chọn một đồ uống trái cây lạnh trong thực đơn.

Grammar/boundary: Countable serving; alcohol-specific use is not inferred.

AI review: Noun beverage versus verb swallowing distinguished. Water example is not alcohol use; irregular forms and transitivity checked.

Source pointers: oxford-normalized-inventory.json#/records/575, vocab4600-normalized-inventory.json#/records/3654.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:drink:swallow-liquid

drink / VERB / WORD (all proposals)

Label: take liquid into the body

Definition EN: To take liquid into the mouth and swallow it.

Meaning VI: uống chất lỏng vào miệng rồi nuốt

Example EN: The children stopped to drink water after the walk.

Example VI: Các em nhỏ dừng lại uống nước sau cuộc đi bộ.

Grammar/boundary: drink, drank, drunk; transitive drink water or intransitive drink.

AI review: Noun beverage versus verb swallowing distinguished. Water example is not alcohol use; irregular forms and transitivity checked.

Source pointers: oxford-normalized-inventory.json#/records/575, vocab4600-normalized-inventory.json#/records/3654.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:closet:storage-space

closet / NOUN / WORD (all proposals)

Label: a cupboard or small storage space

Definition EN: A cupboard or small enclosed space used to keep clothes or other things.

Meaning VI: tủ hoặc không gian kín nhỏ để cất quần áo hay đồ dùng

Example EN: We put the spare blankets in the hallway closet.

Example VI: Chúng tôi cất những chiếc chăn dự phòng trong tủ ở hành lang.

Grammar/boundary: Countable; especially American English; no figurative disclosure construction here.

AI review: Cupboard/storage room boundary combined provisionally. Blankets preserve a real storage use; figurative closeted identity not inferred.

Source pointers: oxford-normalized-inventory.json#/records/1619, vocab4600-normalized-inventory.json#/records/1270.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:creature:living-being

creature / NOUN / WORD (all proposals)

Label: an animal or other living being

Definition EN: An animal or another living being, especially when its kind is not named.

Meaning VI: động vật hoặc sinh vật khác, nhất là khi không nêu rõ loài

Example EN: A tiny creature moved beneath the wet leaves.

Example VI: Một sinh vật nhỏ xíu di chuyển dưới những chiếc lá ướt.

Grammar/boundary: Countable; compare pinned Master meaning without asserting Sense identity.

AI review: Unnamed living being is supported. Wet-leaf example and Vietnamese sinh vật correspond; Master overlap is no identity proof.

Source pointers: oxford-normalized-inventory.json#/records/2880, vocab4600-normalized-inventory.json#/records/1247.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:deviate:leave-course

deviate / VERB / WORD (all proposals)

Label: move away from an expected course

Definition EN: To move away from a usual, planned or accepted course of action.

Meaning VI: đi chệch khỏi đường hướng thông thường, đã định hoặc được chấp nhận

Example EN: The route deviates from the river near the bridge.

Example VI: Tuyến đường rời xa hướng men theo sông ở gần cây cầu.

Grammar/boundary: deviate from something; no transitive direct object in this use.

AI review: Deviate from checked; a route can diverge spatially. Proper course in source does not require an ethical judgment in the draft.

Source pointers: vocab4600-normalized-inventory.json#/records/2108.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:can:ability

can / VERB / WORD (all proposals)

Label: be able to do something

Definition EN: Used to say that someone is able to do something.

Meaning VI: có thể hoặc biết làm một việc

Example EN: My younger sister can swim across the pool.

Example VI: Em gái tôi có thể bơi qua bể.

Grammar/boundary: Modal can + bare infinitive; no third-person s; VERB is schema-compatible proposal.

AI review: Ability, permission and container distinguished. Modal morphology and bare infinitive reviewed; permission example is not mistaken for ability.

Source pointers: oxford-normalized-inventory.json#/records/35, vocab4600-normalized-inventory.json#/records/690.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:can:permission

can / VERB / WORD (all proposals)

Label: be allowed to do something

Definition EN: Used to ask for or give permission to do something.

Meaning VI: được phép làm một việc, hoặc dùng để xin phép

Example EN: You can borrow my ruler during the test.

Example VI: Bạn được phép mượn thước của tôi trong bài kiểm tra.

Grammar/boundary: Modal + bare infinitive; can permission is distinct from ability in context.

AI review: Ability, permission and container distinguished. Modal morphology and bare infinitive reviewed; permission example is not mistaken for ability.

Source pointers: oxford-normalized-inventory.json#/records/35, vocab4600-normalized-inventory.json#/records/690.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:can:metal-container

can / NOUN / WORD (all proposals)

Label: a metal container

Definition EN: A metal container used for food, drink or other products.

Meaning VI: lon hoặc hộp kim loại dùng để chứa thực phẩm, đồ uống hay sản phẩm khác

Example EN: She opened a can of beans for lunch.

Example VI: Cô ấy mở một hộp đậu để ăn trưa.

Grammar/boundary: Countable; can of + contents; British tin often corresponds.

AI review: Ability, permission and container distinguished. Modal morphology and bare infinitive reviewed; permission example is not mistaken for ability.

Source pointers: oxford-normalized-inventory.json#/records/35, vocab4600-normalized-inventory.json#/records/690.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:desk:work-table

desk / NOUN / WORD (all proposals)

Label: a table for work or study

Definition EN: A table used for writing, studying or doing office work.

Meaning VI: bàn dùng để viết, học tập hoặc làm việc văn phòng

Example EN: A lamp stood on the corner of his desk.

Example VI: Một chiếc đèn đặt ở góc bàn làm việc của anh ấy.

Grammar/boundary: Countable; history-linked runtime identity remains preserved, no mapping.

AI review: Work/study table has a concrete location example. History linkage remains an identity blocker, not reuse permission.

Source pointers: oxford-normalized-inventory.json#/records/791, vocab4600-normalized-inventory.json#/records/1366.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:furthermore:additional-point

furthermore / ADVERB / WORD (all proposals)

Label: adding another point

Definition EN: Used to introduce an additional fact or reason that supports what was just said.

Meaning VI: hơn nữa, dùng để bổ sung một thông tin hoặc lý do

Example EN: The room is bright; furthermore, it overlooks the garden.

Example VI: Căn phòng sáng sủa; hơn nữa, nó nhìn ra khu vườn.

Grammar/boundary: Formal linking adverb; punctuation separates clauses.

AI review: Linking adverb adds a supporting fact; semicolon connects independent clauses. Vietnamese hơn nữa preserves addition.

Source pointers: oxford-normalized-inventory.json#/records/2842, vocab4600-normalized-inventory.json#/records/1569.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:exceptional:outstanding

exceptional / ADJECTIVE / WORD (all proposals)

Label: unusually good

Definition EN: Much better than what is usual or expected.

Meaning VI: xuất sắc hơn nhiều so với mức thông thường hoặc mong đợi

Example EN: Her exceptional memory helped her learn the lines quickly.

Example VI: Trí nhớ xuất sắc giúp cô ấy học lời thoại nhanh chóng.

Grammar/boundary: Evaluative use; exceptional ability or performance.

AI review: Outstanding versus unusual distinguished; unusual circumstances are not automatically beneficial. Memory example demonstrates outstanding quality.

Source pointers: oxford-normalized-inventory.json#/records/4238, vocab4600-normalized-inventory.json#/records/1802.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:exceptional:unusual

exceptional / ADJECTIVE / WORD (all proposals)

Label: outside the usual pattern

Definition EN: Very unusual and different from ordinary circumstances.

Meaning VI: rất khác thường, nằm ngoài hoàn cảnh thông thường

Example EN: The museum opened late because of exceptional circumstances.

Example VI: Bảo tàng mở cửa muộn do những hoàn cảnh đặc biệt.

Grammar/boundary: exceptional circumstances; unusual does not necessarily mean good.

AI review: Outstanding versus unusual distinguished; unusual circumstances are not automatically beneficial. Memory example demonstrates outstanding quality.

Source pointers: oxford-normalized-inventory.json#/records/4238, vocab4600-normalized-inventory.json#/records/1802.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:editor:prepare-publication

editor / NOUN / WORD (all proposals)

Label: a person who prepares published material

Definition EN: A person who checks and changes written or recorded material before it is published.

Meaning VI: người kiểm tra và chỉnh sửa nội dung viết hoặc ghi lại trước khi công bố

Example EN: The editor asked for a clearer opening paragraph.

Example VI: Biên tập viên đề nghị viết đoạn mở đầu rõ hơn.

Grammar/boundary: Countable; editorial role, not software editor in this proposal.

AI review: Human publication role limited deliberately; software-editor Sense needs other evidence. Paragraph revision has matching participants.

Source pointers: oxford-normalized-inventory.json#/records/1970.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:full:filled-capacity

full / ADJECTIVE / WORD (all proposals)

Label: containing as much as it can hold

Definition EN: Containing as much as there is room for.

Meaning VI: đầy, chứa đến mức không còn chỗ

Example EN: The box was full of old photographs.

Example VI: Chiếc hộp đầy những bức ảnh cũ.

Grammar/boundary: full of + contents; not necessarily heavy.

AI review: Container capacity and satiation are separately contextualized. Full of and predicative full constructions checked; translations preserve the contrast.

Source pointers: oxford-normalized-inventory.json#/records/199.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:full:not-hungry

full / ADJECTIVE / WORD (all proposals)

Label: having eaten enough

Definition EN: Feeling that one has eaten enough and does not want more food.

Meaning VI: no, cảm thấy đã ăn đủ và không muốn ăn thêm

Example EN: I am full, but I will save the cake for later.

Example VI: Tôi no rồi, nhưng tôi sẽ để dành bánh ăn sau.

Grammar/boundary: Predicative full; distinct bodily state from a filled container.

AI review: Container capacity and satiation are separately contextualized. Full of and predicative full constructions checked; translations preserve the contrast.

Source pointers: oxford-normalized-inventory.json#/records/199.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:finger:hand-part

finger / NOUN / WORD (all proposals)

Label: one of the long parts of a hand

Definition EN: One of the long parts of a hand used for touching and holding things.

Meaning VI: ngón tay dùng để chạm hoặc cầm nắm

Example EN: He pointed at the map with one finger.

Example VI: Anh ấy chỉ vào bản đồ bằng một ngón tay.

Grammar/boundary: Countable; whether thumb is included depends on everyday/anatomical convention.

AI review: Hand-part meaning retained without resolving thumb conventions. Pointing with one finger supplies the physical use.

Source pointers: oxford-normalized-inventory.json#/records/1472.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:grade:assessment-mark

grade / NOUN / WORD (all proposals)

Label: a mark for schoolwork

Definition EN: A mark or rating showing how well someone did in a piece of schoolwork.

Meaning VI: điểm hoặc mức đánh giá kết quả một bài học hay bài làm

Example EN: She received a higher grade for her second essay.

Example VI: Cô ấy được điểm cao hơn cho bài luận thứ hai.

Grammar/boundary: Countable; letter or number depends on school system.

AI review: School mark, quality rank, school year and grading action reviewed as distinct proposals. Fourth grade remains source-context school year, not a Vietnamese curriculum classification.

Source pointers: oxford-normalized-inventory.json#/records/1869, vocab4600-normalized-inventory.json#/records/46.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:grade:quality-level

grade / NOUN / WORD (all proposals)

Label: a level of quality

Definition EN: A level used to classify the quality or type of a product.

Meaning VI: hạng dùng để phân loại chất lượng hoặc loại sản phẩm

Example EN: The shop sells two grades of rice.

Example VI: Cửa hàng bán gạo thuộc hai hạng chất lượng.

Grammar/boundary: Countable grade; product-quality classification, not a school mark.

AI review: School mark, quality rank, school year and grading action reviewed as distinct proposals. Fourth grade remains source-context school year, not a Vietnamese curriculum classification.

Source pointers: oxford-normalized-inventory.json#/records/1869, vocab4600-normalized-inventory.json#/records/46.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:grade:school-year

grade / NOUN / WORD (all proposals)

Label: a school year level

Definition EN: A level or year of study in a school system.

Meaning VI: lớp hoặc bậc năm học trong một hệ thống giáo dục

Example EN: His daughter is in the fourth grade.

Example VI: Con gái anh ấy đang học lớp bốn.

Grammar/boundary: Especially American English; no automatic mapping to Vietnamese curriculum.

AI review: School mark, quality rank, school year and grading action reviewed as distinct proposals. Fourth grade remains source-context school year, not a Vietnamese curriculum classification.

Source pointers: oxford-normalized-inventory.json#/records/1869, vocab4600-normalized-inventory.json#/records/46.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:grade:mark-work

grade / VERB / WORD (all proposals)

Label: give schoolwork a mark

Definition EN: To examine schoolwork and give it a mark or rating.

Meaning VI: chấm điểm hoặc đánh giá bài làm của học sinh

Example EN: The teacher will grade the projects on Friday.

Example VI: Giáo viên sẽ chấm các bài dự án vào thứ Sáu.

Grammar/boundary: Transitive grade + work; especially American English.

AI review: School mark, quality rank, school year and grading action reviewed as distinct proposals. Fourth grade remains source-context school year, not a Vietnamese curriculum classification.

Source pointers: oxford-normalized-inventory.json#/records/1869, vocab4600-normalized-inventory.json#/records/46.

Oxford ordinals considered: [3]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:entrance:way-in

entrance / NOUN / WORD (all proposals)

Label: a place to enter

Definition EN: A door, gate or other opening through which someone enters a place.

Meaning VI: cửa, cổng hoặc lối để đi vào một nơi

Example EN: The entrance is behind the large tree.

Example VI: Lối vào nằm phía sau cây lớn.

Grammar/boundary: Countable; way-in meaning, not admission or an arrival event.

AI review: Physical opening, not admission fee or dramatic arrival. Behind the tree remains a location and does not shift the noun meaning.

Source pointers: oxford-normalized-inventory.json#/records/2146, vocab4600-normalized-inventory.json#/records/634.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:entirely:completely

entirely / ADVERB / WORD (all proposals)

Label: completely

Definition EN: Completely, with no part left out or exception made.

Meaning VI: hoàn toàn, không bỏ sót phần nào hoặc có ngoại lệ

Example EN: The final choice is entirely yours.

Example VI: Quyết định cuối cùng hoàn toàn là của bạn.

Grammar/boundary: Degree adverb; modifies yours here.

AI review: Complete scope is expressed by entirely yours; Vietnamese retains ownership of the decision. No partial hedge introduced.

Source pointers: oxford-normalized-inventory.json#/records/2523.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:embassy:diplomatic-office

embassy / NOUN / WORD (all proposals)

Label: a country's diplomatic office abroad

Definition EN: The official office of a country's diplomatic representatives in another country.

Meaning VI: cơ quan chính thức của đại diện ngoại giao một nước tại nước khác

Example EN: The visitors waited outside the embassy for their appointment.

Example VI: Các vị khách chờ bên ngoài đại sứ quán đến giờ hẹn.

Grammar/boundary: Countable institution/building use combined; no visa or legal advice.

AI review: Institution/building uses coalesced provisionally. Waiting outside illustrates the physical office; no consular-service promise or immigration advice.

Source pointers: oxford-normalized-inventory.json#/records/4109, vocab4600-normalized-inventory.json#/records/4279.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:goodbye:parting-word

goodbye / INTERJECTION / WORD (all proposals)

Label: a word used when parting

Definition EN: Used when leaving someone or ending a conversation.

Meaning VI: lời nói khi chia tay hoặc kết thúc cuộc trò chuyện

Example EN: Goodbye, Linh! See you after the holidays.

Example VI: Tạm biệt Linh! Hẹn gặp lại sau kỳ nghỉ.

Grammar/boundary: Direct parting expression; exclamation source maps provisionally to INTERJECTION.

AI review: Expression and nominal parting-use distinguished for representation review. Interjection mapping is a schema-compatible proposal; same core meaning may coalesce.

Source pointers: oxford-normalized-inventory.json#/records/824.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:goodbye:parting-event

goodbye / NOUN / WORD (all proposals)

Label: a parting word or act

Definition EN: A word or action that marks someone leaving or parting from others.

Meaning VI: lời hoặc hành động đánh dấu việc chia tay

Example EN: They said their goodbyes at the station.

Example VI: Họ nói lời chia tay ở nhà ga.

Grammar/boundary: Countable goodbye/goodbyes; grammatical representation may coalesce with interjection.

AI review: Expression and nominal parting-use distinguished for representation review. Interjection mapping is a schema-compatible proposal; same core meaning may coalesce.

Source pointers: oxford-normalized-inventory.json#/records/824.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:fully:completely

fully / ADVERB / WORD (all proposals)

Label: to the complete extent

Definition EN: To the complete or greatest relevant extent.

Meaning VI: đầy đủ hoặc hoàn toàn đến mức cần thiết

Example EN: The two students fully understood the instructions.

Example VI: Hai học sinh hiểu đầy đủ các hướng dẫn.

Grammar/boundary: Degree modifier; no promise that understood is objectively verified outside the example.

AI review: Degree modifier of understand reviewed; two students and instructions retained. Completeness is narrative, not a claimed external validation.

Source pointers: oxford-normalized-inventory.json#/records/2464.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:figure:number

figure / NOUN / WORD (all proposals)

Label: a number in information

Definition EN: A number that represents an amount or measurement.

Meaning VI: con số thể hiện số lượng hoặc phép đo

Example EN: The report gives separate figures for each village.

Example VI: Báo cáo đưa ra số liệu riêng cho từng ngôi làng.

Grammar/boundary: Usually plural for data; not a person's body shape.

AI review: Number data, role-person, body outline and calculated amount reviewed separately. Source understand/figure out group remains unrepresented, not erased or silently merged.

Source pointers: oxford-normalized-inventory.json#/records/1072, vocab4600-normalized-inventory.json#/records/517.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:figure:important-person

figure / NOUN / WORD (all proposals)

Label: a person with a particular role

Definition EN: A person who has a particular role or is important in an area of activity.

Meaning VI: nhân vật có vai trò nhất định hoặc quan trọng trong một lĩnh vực

Example EN: She became a familiar figure in local theatre.

Example VI: Cô ấy trở thành một gương mặt quen thuộc trong sân khấu địa phương.

Grammar/boundary: Countable; the role is provided by context.

AI review: Number data, role-person, body outline and calculated amount reviewed separately. Source understand/figure out group remains unrepresented, not erased or silently merged.

Source pointers: oxford-normalized-inventory.json#/records/1072, vocab4600-normalized-inventory.json#/records/517.

Oxford ordinals considered: [3]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:figure:body-shape

figure / NOUN / WORD (all proposals)

Label: the shape of a body

Definition EN: The shape or outline of a person's body.

Meaning VI: vóc dáng hoặc đường nét cơ thể của một người

Example EN: The coat hid the outline of his figure.

Example VI: Chiếc áo khoác che đi đường nét vóc dáng của anh ấy.

Grammar/boundary: Countable; neutral description without ideal-body claims.

AI review: Number data, role-person, body outline and calculated amount reviewed separately. Source understand/figure out group remains unrepresented, not erased or silently merged.

Source pointers: oxford-normalized-inventory.json#/records/1072, vocab4600-normalized-inventory.json#/records/517.

Oxford ordinals considered: [4]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:figure:calculate

figure / VERB / WORD (all proposals)

Label: calculate an amount

Definition EN: To calculate or estimate an amount from available information.

Meaning VI: tính toán hoặc ước tính một lượng từ thông tin có sẵn

Example EN: We figured the total cost before ordering the wood.

Example VI: Chúng tôi tính tổng chi phí trước khi đặt gỗ.

Grammar/boundary: Transitive figure + amount; especially American English; figure out is a related construction pending review.

AI review: Number data, role-person, body outline and calculated amount reviewed separately. Source understand/figure out group remains unrepresented, not erased or silently merged.

Source pointers: oxford-normalized-inventory.json#/records/1072, vocab4600-normalized-inventory.json#/records/517.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:effectively:with-good-result

effectively / ADVERB / WORD (all proposals)

Label: with the intended result

Definition EN: In a way that achieves the intended result.

Meaning VI: một cách có hiệu quả, đạt kết quả dự định

Example EN: The new sign directs visitors effectively.

Example VI: Biển báo mới chỉ đường cho khách một cách hiệu quả.

Grammar/boundary: Modifies directs; distinguish from effectively meaning in practice.

AI review: Successful action differs from in-practice isolation. The closed bridge and practical consequence remain coupled in Vietnamese.

Source pointers: oxford-normalized-inventory.json#/records/2067.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:effectively:in-practice

effectively / ADVERB / WORD (all proposals)

Label: in practice

Definition EN: In practice, even if not officially or exactly stated that way.

Meaning VI: trên thực tế, dù không được nói chính thức hoặc chính xác như vậy

Example EN: With the only bridge closed, the village was effectively cut off.

Example VI: Khi cây cầu duy nhất đóng cửa, ngôi làng coi như bị cô lập.

Grammar/boundary: Sentence/degree use; does not assert a formal administrative closure.

AI review: Successful action differs from in-practice isolation. The closed bridge and practical consequence remain coupled in Vietnamese.

Source pointers: oxford-normalized-inventory.json#/records/2067.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:even:unexpected-inclusion

even / ADVERB / WORD (all proposals)

Label: including something surprising

Definition EN: Used to emphasize that something unexpected is included or true.

Meaning VI: ngay cả, dùng để nhấn mạnh một điều bất ngờ cũng có thật

Example EN: Even the youngest child recognized the tune.

Example VI: Ngay cả đứa trẻ nhỏ tuổi nhất cũng nhận ra giai điệu.

Grammar/boundary: Focus adverb before the emphasized phrase.

AI review: Unexpected inclusion, number parity and flat surface distinguished. Zero/negative whole numbers are not excluded; youngest-child focus retained.

Source pointers: oxford-normalized-inventory.json#/records/94.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:even:divisible-by-two

even / ADJECTIVE / WORD (all proposals)

Label: a number divisible by two

Definition EN: Describing a whole number that can be divided by two with no remainder.

Meaning VI: chẵn, nói về số nguyên chia hết cho hai

Example EN: The teacher asked us to name an even number larger than ten.

Example VI: Giáo viên yêu cầu chúng tôi nêu một số chẵn lớn hơn mười.

Grammar/boundary: even number; includes zero and negative even integers; no arbitrary positive-only rule.

AI review: Unexpected inclusion, number parity and flat surface distinguished. Zero/negative whole numbers are not excluded; youngest-child focus retained.

Source pointers: oxford-normalized-inventory.json#/records/94.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:even:level-surface

even / ADJECTIVE / WORD (all proposals)

Label: level and smooth

Definition EN: Level or smooth, without uneven rises or dips.

Meaning VI: phẳng hoặc đều, không có chỗ nhô lên hay lõm xuống

Example EN: The carpenter made the tabletop even.

Example VI: Người thợ mộc làm mặt bàn phẳng đều.

Grammar/boundary: Physical surface; not mathematical parity.

AI review: Unexpected inclusion, number parity and flat surface distinguished. Zero/negative whole numbers are not excluded; youngest-child focus retained.

Source pointers: oxford-normalized-inventory.json#/records/94.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:fat:body-fat

fat / NOUN / WORD (all proposals)

Label: a substance stored in the body or found in food

Definition EN: A substance found in foods and stored by the body as a source of energy.

Meaning VI: chất béo có trong thức ăn và được cơ thể dự trữ làm nguồn năng lượng

Example EN: The label lists the amount of fat in each serving.

Example VI: Nhãn ghi lượng chất béo trong mỗi khẩu phần.

Grammar/boundary: Usually uncountable here; no dietary or medical advice.

AI review: Food/body substance and animal-body adjective distinguished. Label example is descriptive; animal context avoids pejorative person labeling.

Source pointers: oxford-normalized-inventory.json#/records/601, vocab4600-normalized-inventory.json#/records/1894.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:fat:thick-body

fat / ADJECTIVE / WORD (all proposals)

Label: having much body fat

Definition EN: Having a large amount of body fat.

Meaning VI: béo, có nhiều mỡ trong cơ thể

Example EN: The farmer drew a fat pig beside the barn.

Example VI: Người nông dân vẽ một con lợn béo bên cạnh nhà kho.

Grammar/boundary: May be insulting when applied to people; animal example avoids labeling a person.

AI review: Food/body substance and animal-body adjective distinguished. Label example is descriptive; animal context avoids pejorative person labeling.

Source pointers: oxford-normalized-inventory.json#/records/601, vocab4600-normalized-inventory.json#/records/1894.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:fluid:flowing-substance

fluid / NOUN / WORD (all proposals)

Label: a substance that flows

Definition EN: A substance, such as a liquid or gas, that can flow and change shape.

Meaning VI: chất lưu như chất lỏng hoặc chất khí, có thể chảy và thay đổi hình dạng

Example EN: Air and water are both fluids.

Example VI: Không khí và nước đều là chất lưu.

Grammar/boundary: Liquids are a subset; source liquid/fluid groups provisionally coalesced; scientific review pending.

AI review: Liquid and gas coalesced in one inclusive physical definition. Changing-timetable adjective is abstract; source POS/meaning ambiguity remains pending.

Source pointers: oxford-normalized-inventory.json#/records/3972, vocab4600-normalized-inventory.json#/records/2313.

Oxford ordinals considered: [0, 1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:fluid:changing

fluid / ADJECTIVE / WORD (all proposals)

Label: able to change

Definition EN: Able to change easily rather than staying fixed.

Meaning VI: linh hoạt hoặc dễ thay đổi, không cố định

Example EN: The timetable is still fluid while repairs continue.

Example VI: Lịch trình vẫn còn có thể thay đổi trong khi việc sửa chữa tiếp diễn.

Grammar/boundary: Predicative adjective; 4600 POS evidence; does not mean literally liquid.

AI review: Liquid and gas coalesced in one inclusive physical definition. Changing-timetable adjective is abstract; source POS/meaning ambiguity remains pending.

Source pointers: oxford-normalized-inventory.json#/records/3972, vocab4600-normalized-inventory.json#/records/2313.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:exact:precise

exact / ADJECTIVE / WORD (all proposals)

Label: completely precise

Definition EN: Correct in every detail, without approximation.

Meaning VI: chính xác trong mọi chi tiết, không chỉ là gần đúng

Example EN: Please write the exact time shown on the clock.

Example VI: Hãy ghi đúng giờ được hiển thị trên đồng hồ.

Grammar/boundary: exact time/amount; Master lemma overlap needs independent identity review.

AI review: Precision without approximation is demonstrated by the clock instruction. No automatic Master identity or Sense CEFR from lemma matching.

Source pointers: oxford-normalized-inventory.json#/records/1450, vocab4600-normalized-inventory.json#/records/3073.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:happy:pleased-feeling

happy / ADJECTIVE / WORD (all proposals)

Label: feeling pleasure

Definition EN: Feeling pleasure or satisfaction about something.

Meaning VI: vui hoặc hài lòng về điều gì

Example EN: She was happy with the painting she had finished.

Example VI: Cô ấy hài lòng với bức tranh mình vừa hoàn thành.

Grammar/boundary: Source joyful/satisfied groups provisionally coalesced; happy with/about.

AI review: Joy/satisfaction coalesced, willingness separate. Happy with and happy to constructions align with their Vietnamese pairs.

Source pointers: oxford-normalized-inventory.json#/records/289.

Oxford ordinals considered: [0, 1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:happy:willing

happy / ADJECTIVE / WORD (all proposals)

Label: willing to do something

Definition EN: Willing to do something, often with pleasure.

Meaning VI: sẵn lòng làm một việc, thường với thái độ vui vẻ

Example EN: I am happy to carry the lighter bag.

Example VI: Tôi sẵn lòng mang chiếc túi nhẹ hơn.

Grammar/boundary: happy to + infinitive; willingness is not identical to emotional happiness.

AI review: Joy/satisfaction coalesced, willingness separate. Happy with and happy to constructions align with their Vietnamese pairs.

Source pointers: oxford-normalized-inventory.json#/records/289.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:far:at-distance

far / ADVERB / WORD (all proposals)

Label: a long distance away

Definition EN: At or over a large distance.

Meaning VI: xa hoặc trên một quãng đường dài

Example EN: We did not walk far before finding a bench.

Example VI: Chúng tôi chưa đi xa thì đã tìm thấy một chiếc ghế dài.

Grammar/boundary: Distance adverb; not far + comparative intensification here.

AI review: Distance adverb and attributive far end distinguished. Negative did not walk far remains negative in Vietnamese.

Source pointers: oxford-normalized-inventory.json#/records/217, vocab4600-normalized-inventory.json#/records/182.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:far:distant-side

far / ADJECTIVE / WORD (all proposals)

Label: more distant

Definition EN: At the more distant side or end of a place.

Meaning VI: ở phía hoặc đầu xa hơn của một nơi

Example EN: A red gate stood at the far end of the field.

Example VI: Một chiếc cổng đỏ nằm ở đầu xa của cánh đồng.

Grammar/boundary: Usually attributive far end/side; relative distance.

AI review: Distance adverb and attributive far end distinguished. Negative did not walk far remains negative in Vietnamese.

Source pointers: oxford-normalized-inventory.json#/records/217, vocab4600-normalized-inventory.json#/records/182.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:go:travel-leave

go / VERB / WORD (all proposals)

Label: move or travel to a place

Definition EN: To move or travel to another place, including leaving the present place.

Meaning VI: đi hoặc di chuyển đến nơi khác, bao gồm rời nơi hiện tại

Example EN: We will go to the market after breakfast.

Example VI: Chúng tôi sẽ đi chợ sau bữa sáng.

Grammar/boundary: go, went, gone; source go/leave coalesced for review; go to + destination.

AI review: Travel/leaving coalesced; an activity attempt is separate. Irregular morphology and go to versus a go at checked.

Source pointers: oxford-normalized-inventory.json#/records/87.

Oxford ordinals considered: [0, 1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:go:attempt-turn

go / NOUN / WORD (all proposals)

Label: an attempt or turn

Definition EN: An attempt to do something or a turn at an activity.

Meaning VI: lần thử làm một việc hoặc lượt tham gia hoạt động

Example EN: May I have a go at the puzzle?

Example VI: Tôi có thể thử giải câu đố một lượt không?

Grammar/boundary: a go at + noun/gerund; countable; not a travel event.

AI review: Travel/leaving coalesced; an activity attempt is separate. Irregular morphology and go to versus a go at checked.

Source pointers: oxford-normalized-inventory.json#/records/87.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:inner:inside

inner / ADJECTIVE / WORD (all proposals)

Label: on the inside

Definition EN: Situated inside something or closer to its centre.

Meaning VI: ở bên trong hoặc gần phần trung tâm hơn

Example EN: The inner pocket has a small zip.

Example VI: Túi phía trong có một khóa kéo nhỏ.

Grammar/boundary: Usually attributive; physical position, not private feelings in this proposal.

AI review: Physical inside position, not private thoughts. Inner pocket and zipper preserve the exact relation.

Source pointers: oxford-normalized-inventory.json#/records/2669.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:idiom:fixed-expression

idiom / NOUN / WORD (all proposals)

Label: an expression with a special meaning

Definition EN: An established expression whose meaning cannot be worked out simply from its separate words.

Meaning VI: thành ngữ có nghĩa không thể suy ra chỉ từ từng từ riêng lẻ

Example EN: The teacher explained the idiom break the ice.

Example VI: Giáo viên giải thích thành ngữ break the ice, nghĩa là phá tan sự ngại ngùng ban đầu.

Grammar/boundary: Countable; an expression need not be an idiom merely because it has several words.

AI review: Established nonliteral expression distinguished from any multiword string. Break the ice example includes a Vietnamese explanation without claiming a source lexical mapping.

Source pointers: vocab4600-normalized-inventory.json#/records/579.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:monkey:primate

monkey / NOUN / WORD (all proposals)

Label: a primate commonly having a tail

Definition EN: A primate, distinct from an ape, that usually has a tail and can use its hands to hold things.

Meaning VI: khỉ, động vật thuộc một nhóm linh trưởng thường có đuôi và có thể leo trèo

Example EN: A monkey reached for fruit on a high branch.

Example VI: Một con khỉ với lấy quả trên cành cao.

Grammar/boundary: Not all monkeys have visible tails; apes are a separate group; species review pending.

AI review: Primate description excludes apes and avoids universal tail claims. Fruit-reaching is neutral; species boundary still warrants specialist review.

Source pointers: oxford-normalized-inventory.json#/records/1638.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:kind:considerate

kind / ADJECTIVE / WORD (all proposals)

Label: caring about others

Definition EN: Showing care for others and a wish to help them.

Meaning VI: tốt bụng, quan tâm và muốn giúp người khác

Example EN: It was kind of you to bring soup to our neighbour.

Example VI: Bạn thật tốt bụng khi mang súp cho hàng xóm của chúng ta.

Grammar/boundary: kind of someone to do something; evaluative description.

AI review: Consideration adjective versus type noun distinguished. Kind of you differs from what kind of paper, with matching Vietnamese constructions.

Source pointers: oxford-normalized-inventory.json#/records/236.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:kind:type

kind / NOUN / WORD (all proposals)

Label: a type of something

Definition EN: A type or category of people or things that share a feature.

Meaning VI: loại hoặc nhóm người hay vật có chung đặc điểm

Example EN: What kind of paper do we need for the cards?

Example VI: Chúng ta cần loại giấy nào để làm những tấm thiệp?

Grammar/boundary: a kind of + noun; kinds of; distinct from adjective kindness.

AI review: Consideration adjective versus type noun distinguished. Kind of you differs from what kind of paper, with matching Vietnamese constructions.

Source pointers: oxford-normalized-inventory.json#/records/236.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:intriguing:interesting-mysterious

intriguing / ADJECTIVE / WORD (all proposals)

Label: arousing curiosity

Definition EN: Interesting in a way that makes someone curious to learn more.

Meaning VI: gợi sự tò mò, khiến người ta muốn tìm hiểu thêm

Example EN: An intriguing note was hidden inside the old book.

Example VI: Một mảnh giấy ghi lời nhắn đầy hấp dẫn được giấu trong cuốn sách cũ.

Grammar/boundary: Describes what arouses interest; not intrigued, which describes the person's response.

AI review: Stimulus adjective, not a person's intrigued state. Hidden-note example creates curiosity; translation preserves an appealing mystery.

Source pointers: oxford-normalized-inventory.json#/records/4757, vocab4600-normalized-inventory.json#/records/4388.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:importance:significance

importance / NOUN / WORD (all proposals)

Label: how much something matters

Definition EN: The degree to which something matters or has a significant effect.

Meaning VI: tầm quan trọng hoặc mức độ có ảnh hưởng đáng kể

Example EN: The guide explained the importance of keeping the path clear.

Example VI: Người hướng dẫn giải thích tầm quan trọng của việc giữ lối đi thông thoáng.

Grammar/boundary: Uncountable; the importance of + noun/gerund.

AI review: Uncountable significance noun; importance of keeping the path clear checked. Vietnamese retains the action as its complement.

Source pointers: oxford-normalized-inventory.json#/records/2023, vocab4600-normalized-inventory.json#/records/1761.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:industry:economic-sector

industry / NOUN / WORD (all proposals)

Label: a branch of economic activity

Definition EN: The businesses involved in producing a particular kind of goods or providing a particular service.

Meaning VI: ngành gồm các doanh nghiệp sản xuất một loại hàng hóa hoặc cung cấp một loại dịch vụ

Example EN: The fishing industry supports many families along the coast.

Example VI: Ngành đánh bắt cá nuôi sống nhiều gia đình ven biển.

Grammar/boundary: Industry can include services; not restricted to factories; no diligence proposal without separate evidence.

AI review: Sector can include services, not only factories. Fishing example matches the economic sense; diligence not invented.

Source pointers: oxford-normalized-inventory.json#/records/1012, vocab4600-normalized-inventory.json#/records/2998.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:managerial:management-related

managerial / ADJECTIVE / WORD (all proposals)

Label: related to managing an organization

Definition EN: Related to the work of directing people or organizing a business.

Meaning VI: thuộc công việc quản lý con người hoặc tổ chức hoạt động doanh nghiệp

Example EN: She took a course to improve her managerial skills.

Example VI: Cô ấy học một khóa để nâng cao kỹ năng quản lý.

Grammar/boundary: Attributive managerial role/skills; no implied seniority level.

AI review: Management-related adjective supported. Skills example does not impose an executive rank or job classification.

Source pointers: vocab4600-normalized-inventory.json#/records/2999.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:implicate:link-to-wrongdoing

implicate / VERB / WORD (all proposals)

Label: show involvement in wrongdoing

Definition EN: To provide evidence that suggests someone is involved in a crime or other wrongdoing.

Meaning VI: đưa ra bằng chứng gợi ý ai có liên quan đến tội phạm hoặc hành vi sai trái

Example EN: The documents implicated an official in the illegal sale.

Example VI: Những tài liệu cho thấy một quan chức có thể liên quan đến vụ bán hàng trái phép.

Grammar/boundary: implicate someone in something; implication is not a conviction or proof of guilt.

AI review: Evidence suggests involvement, not proven guilt. Revised definition and Vietnamese example retain uncertainty; legal reasoning not offered.

Source pointers: vocab4600-normalized-inventory.json#/records/3096.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:mandarin:chinese-language

Mandarin / NOUN / WORD (all proposals)

Label: Mandarin Chinese

Definition EN: A group of Chinese varieties, including the variety used as the basis of Standard Chinese.

Meaning VI: tiếng Quan thoại, gồm các phương ngữ làm cơ sở cho tiếng Trung tiêu chuẩn

Example EN: Her evening class teaches Mandarin through everyday conversations.

Example VI: Lớp buổi tối của cô ấy dạy tiếng Quan thoại qua các hội thoại hằng ngày.

Grammar/boundary: Display form Mandarin; language name capitalized; deck claim about two main languages is oversimplified. Fruit/official meanings not supported here.

AI review: Capitalized language display proposed without merging the source key. Mandarin varieties and Standard Chinese relationship checked; source two-language simplification not reused.

Source pointers: vocab4600-normalized-inventory.json#/records/2317.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:lodge:rural-holiday-building

lodge / NOUN / WORD (all proposals)

Label: a rural building used for stays

Definition EN: A building in the countryside or mountains where visitors stay, often for outdoor activities.

Meaning VI: nhà nghỉ ở vùng nông thôn hoặc miền núi, thường dành cho hoạt động ngoài trời

Example EN: The walking group spent the night at a mountain lodge.

Example VI: Nhóm đi bộ đường dài nghỉ đêm tại một nhà nghỉ trên núi.

Grammar/boundary: Countable; accommodation use; not the verb lodge a complaint.

AI review: Rural/mountain accommodation noun only. Overnight walking-group context does not require every lodge to serve hunters exclusively.

Source pointers: vocab4600-normalized-inventory.json#/records/1216.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:low:small-height-level

low / ADJECTIVE / WORD (all proposals)

Label: not high in position or level

Definition EN: Not high in height, position or amount.

Meaning VI: thấp về chiều cao, vị trí hoặc mức độ

Example EN: The low wall allowed us to see the garden.

Example VI: Bức tường thấp cho phép chúng tôi nhìn thấy khu vườn.

Grammar/boundary: Comparative lower; physical example anchors a broader scalar proposal; exact boundaries pending.

AI review: Scalar adjective, manner/position adverb and a minimum-level nominal use distinguished. Source enum mappings and possible usage coalescence remain pending.

Source pointers: oxford-normalized-inventory.json#/records/974, vocab4600-normalized-inventory.json#/records/1901.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:low:at-small-height

low / ADVERB / WORD (all proposals)

Label: at a low height

Definition EN: At or to a position near the ground or below the usual level.

Meaning VI: ở hoặc xuống vị trí thấp, gần mặt đất hoặc dưới mức thông thường

Example EN: The bird flew low over the field.

Example VI: Con chim bay thấp trên cánh đồng.

Grammar/boundary: Adverb modifies flew; distinguish from adjective before a noun.

AI review: Scalar adjective, manner/position adverb and a minimum-level nominal use distinguished. Source enum mappings and possible usage coalescence remain pending.

Source pointers: oxford-normalized-inventory.json#/records/974, vocab4600-normalized-inventory.json#/records/1901.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:low:minimum-level

low / NOUN / WORD (all proposals)

Label: a low point or level

Definition EN: A point or level that is lower than others in a period.

Meaning VI: điểm hoặc mức thấp hơn những mức khác trong một khoảng thời gian

Example EN: The temperature reached a new low last night.

Example VI: Nhiệt độ xuống một mức thấp mới đêm qua.

Grammar/boundary: Countable a low; literal temperature example, not emotional diagnosis.

AI review: Scalar adjective, manner/position adverb and a minimum-level nominal use distinguished. Source enum mappings and possible usage coalescence remain pending.

Source pointers: oxford-normalized-inventory.json#/records/974, vocab4600-normalized-inventory.json#/records/1901.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:leg:body-part

leg / NOUN / WORD (all proposals)

Label: a limb used for standing and movement

Definition EN: One of the body parts that support a person or animal and help it stand or move.

Meaning VI: chân, bộ phận nâng đỡ cơ thể và giúp đứng hoặc di chuyển

Example EN: He stretched his legs after the long journey.

Example VI: Anh ấy duỗi chân sau chuyến đi dài.

Grammar/boundary: Countable; human/animal limb; distinct from a furniture support.

AI review: Body limb and furniture support are separately demonstrated. Same metaphorical relationship does not justify canonical identity reuse.

Source pointers: oxford-normalized-inventory.json#/records/700, vocab4600-normalized-inventory.json#/records/170.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:leg:furniture-support

leg / NOUN / WORD (all proposals)

Label: a support on furniture

Definition EN: One of the supports that hold a piece of furniture above the ground.

Meaning VI: chân của đồ nội thất, dùng để đỡ đồ vật trên mặt đất

Example EN: One leg of the stool was shorter than the others.

Example VI: Một chân của chiếc ghế đẩu ngắn hơn những chân còn lại.

Grammar/boundary: Countable; leg of a chair/table; identity metaphor needs owner review.

AI review: Body limb and furniture support are separately demonstrated. Same metaphorical relationship does not justify canonical identity reuse.

Source pointers: oxford-normalized-inventory.json#/records/700, vocab4600-normalized-inventory.json#/records/170.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:listen:pay-attention-to-sound

listen / VERB / WORD (all proposals)

Label: pay attention to sound

Definition EN: To pay attention to a sound or to what someone is saying.

Meaning VI: lắng nghe âm thanh hoặc lời ai đang nói

Example EN: Please listen to the announcement before leaving.

Example VI: Hãy nghe thông báo trước khi rời đi.

Grammar/boundary: listen to + source; no direct object listen the announcement; hearing can occur without listening.

AI review: Listen to complement mandatory in example; deliberate attention not mere hearing. Vietnamese command targets the same announcement.

Source pointers: oxford-normalized-inventory.json#/records/480, vocab4600-normalized-inventory.json#/records/695.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:mayor:city-leader

mayor / NOUN / WORD (all proposals)

Label: a city's leading official

Definition EN: An official who leads or represents the local government of a town or city.

Meaning VI: thị trưởng, quan chức đứng đầu hoặc đại diện chính quyền một thị trấn hay thành phố

Example EN: The mayor welcomed the visiting students at the town hall.

Example VI: Thị trưởng đón các học sinh đến thăm tại tòa thị chính.

Grammar/boundary: Countable; duties and appointment methods vary by jurisdiction; not necessarily always elected.

AI review: Municipal official description accommodates jurisdiction variation. Town-hall welcome is descriptive and not evidence of appointment method.

Source pointers: oxford-normalized-inventory.json#/records/1382, vocab4600-normalized-inventory.json#/records/1297.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:martial art:combat-discipline

martial art / NOUN / MULTIWORD_EXPRESSION (all proposals)

Label: a trained fighting discipline

Definition EN: A system of trained fighting techniques practiced as a sport or for self-defence.

Meaning VI: môn võ gồm hệ thống kỹ thuật chiến đấu được tập luyện như thể thao hoặc để tự vệ

Example EN: Judo is a martial art that my brother studies.

Example VI: Judo là một môn võ mà anh trai tôi theo học.

Grammar/boundary: Countable martial art; plural martial arts; no fighting instruction.

AI review: Countable discipline, not an instruction in combat. Judo example illustrates membership; singular/plural convention disclosed.

Source pointers: vocab4600-normalized-inventory.json#/records/2887.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:immune system:body-defences

immune system / NOUN / MULTIWORD_EXPRESSION (all proposals)

Label: the body's network of defences

Definition EN: The body's network of cells, tissues and organs that helps defend it against harmful agents.

Meaning VI: hệ miễn dịch, mạng lưới tế bào, mô và cơ quan giúp cơ thể chống tác nhân gây hại

Example EN: The class drew a diagram of the immune system.

Example VI: Lớp học vẽ sơ đồ hệ miễn dịch.

Grammar/boundary: A network, not a single organ; defence is not a guarantee against every illness; no treatment advice.

AI review: Network of cells/tissues/organs checked against NIH overview; no single-organ or guaranteed-cure claim. Diagram example contains no medical guidance.

Source pointers: vocab4600-normalized-inventory.json#/records/2034.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:mirror:reflecting-surface

mirror / NOUN / WORD (all proposals)

Label: a surface that reflects an image

Definition EN: A surface, usually made of coated glass, in which a person can see a reflected image.

Meaning VI: gương, bề mặt thường bằng kính tráng có thể phản chiếu hình ảnh

Example EN: She checked her scarf in the mirror by the door.

Example VI: Cô ấy chỉnh lại khăn khi nhìn vào chiếc gương cạnh cửa.

Grammar/boundary: Countable; physical object only; history-linked identity not remapped.

AI review: Reflective object only; scarf checking is natural and faithfully paired. No figurative verb or history reassignment.

Source pointers: oxford-normalized-inventory.json#/records/1481, vocab4600-normalized-inventory.json#/records/107.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:ice cream:frozen-dessert

ice cream / NOUN / MULTIWORD_EXPRESSION (all proposals)

Label: a sweet frozen dessert

Definition EN: A sweet frozen food, often made from milk or cream, eaten as a dessert.

Meaning VI: kem, món tráng miệng ngọt đông lạnh thường làm từ sữa hoặc kem sữa

Example EN: They shared a bowl of mango ice cream.

Example VI: Họ cùng ăn một bát kem xoài.

Grammar/boundary: Usually uncountable substance; an ice cream can mean a serving; ingredients vary.

AI review: Frozen dessert allows varying ingredients; not an absolute dairy rule. Shared mango serving is unchanged in translation.

Source pointers: oxford-normalized-inventory.json#/records/778.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:junk food:low-nutrient-food

junk food / NOUN / MULTIWORD_EXPRESSION (all proposals)

Label: food with little nutritional value

Definition EN: Food typically high in fat, sugar or salt and low in useful nutrients.

Meaning VI: đồ ăn thường nhiều chất béo, đường hoặc muối nhưng ít dưỡng chất có ích

Example EN: The lesson compared junk food with a balanced packed lunch.

Example VI: Bài học so sánh đồ ăn ít dưỡng chất với một bữa trưa mang theo cân đối.

Grammar/boundary: Usually uncountable; not all snacks or quickly prepared food are junk food; no personalized diet advice.

AI review: Draft corrected away from equating every quick snack with junk food. Nutrient-based usual pattern is descriptive; personalized diet advice absent.

Source pointers: vocab4600-normalized-inventory.json#/records/3536.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:repair:fix-damage

repair / VERB / WORD (all proposals)

Label: make something work again

Definition EN: To fix damage or a fault so that something works or can be used again.

Meaning VI: sửa hư hỏng hoặc lỗi để một vật hoạt động hay dùng được trở lại

Example EN: He repaired the broken handle with a new screw.

Example VI: Anh ấy sửa chiếc tay cầm bị gãy bằng một con vít mới.

Grammar/boundary: Transitive repair + object; not merely maintain something undamaged.

AI review: Fixing damage action and repair work noun distinguished. Handle/screw and roof-before-rainy-season examples preserve their separate references.

Source pointers: oxford-normalized-inventory.json#/records/1522, vocab4600-normalized-inventory.json#/records/1010.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:repair:fixing-work

repair / NOUN / WORD (all proposals)

Label: work that fixes damage

Definition EN: Work done to fix a damaged or faulty thing.

Meaning VI: việc sửa chữa một vật bị hỏng hoặc có lỗi

Example EN: The roof needs repair before the rainy season.

Example VI: Mái nhà cần được sửa chữa trước mùa mưa.

Grammar/boundary: Uncountable repair here; plural repairs can refer to individual jobs.

AI review: Fixing damage action and repair work noun distinguished. Handle/screw and roof-before-rainy-season examples preserve their separate references.

Source pointers: oxford-normalized-inventory.json#/records/1522, vocab4600-normalized-inventory.json#/records/1010.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:reduce:make-less

reduce / VERB / WORD (all proposals)

Label: make an amount smaller

Definition EN: To make an amount, size or degree smaller.

Meaning VI: làm giảm số lượng, kích thước hoặc mức độ

Example EN: The new lamps reduced electricity use in the hall.

Example VI: Những chiếc đèn mới làm giảm lượng điện sử dụng trong hội trường.

Grammar/boundary: reduce something by an amount or to a level; do not confuse by and to.

AI review: Make-less meaning with electricity-use object reviewed. By/to distinction is usage guidance, not an unsupported new classification.

Source pointers: oxford-normalized-inventory.json#/records/1311, vocab4600-normalized-inventory.json#/records/2739.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:precede:come-before

precede / VERB / WORD (all proposals)

Label: come before something

Definition EN: To come before something in time, order or position.

Meaning VI: đứng trước hoặc diễn ra trước về thời gian, thứ tự hay vị trí

Example EN: A short welcome speech preceded the concert.

Example VI: Một bài phát biểu chào mừng ngắn diễn ra trước buổi hòa nhạc.

Grammar/boundary: Transitive precede + noun; not precede to; distinguish proceed.

AI review: Direct object, order before, no to-complement. Welcome speech before concert matches Vietnamese timing.

Source pointers: oxford-normalized-inventory.json#/records/3714, vocab4600-normalized-inventory.json#/records/3196.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:restaurant:food-business

restaurant / NOUN / WORD (all proposals)

Label: a place serving meals

Definition EN: A business where people can buy meals prepared for them to eat.

Meaning VI: nhà hàng, nơi bán các bữa ăn được chế biến sẵn cho khách

Example EN: The restaurant serves lunch until two o'clock.

Example VI: Nhà hàng phục vụ bữa trưa đến hai giờ.

Grammar/boundary: Countable; does not require table service in every case.

AI review: Meal business not restricted to waiter service. Lunch deadline retained; no imported cuisine taxonomy.

Source pointers: oxford-normalized-inventory.json#/records/690, vocab4600-normalized-inventory.json#/records/347.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:pier:waterside-platform

pier / NOUN / WORD (all proposals)

Label: a structure extending over water

Definition EN: A structure built from the shore out over water, used for boats or for people to walk on.

Meaning VI: cầu tàu hoặc công trình từ bờ vươn ra mặt nước để tàu thuyền sử dụng hay người đi lại

Example EN: We watched the boats from the end of the pier.

Example VI: Chúng tôi ngắm các con thuyền từ cuối cầu tàu.

Grammar/boundary: Countable; can be recreational or used by boats; not a bridge spanning both banks.

AI review: Projects from shore over water, does not require a second-bank span. Boat-viewing example supports recreational use without making it exclusive.

Source pointers: vocab4600-normalized-inventory.json#/records/3639.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:resident:person-living-there

resident / NOUN / WORD (all proposals)

Label: a person living in a place

Definition EN: A person who lives in a particular place.

Meaning VI: cư dân, người sống ở một nơi nhất định

Example EN: Local residents helped clean the park.

Example VI: Các cư dân địa phương giúp dọn công viên.

Grammar/boundary: Countable; not proof of immigration status.

AI review: Person noun and residential adjective share core living-place meaning. Local/longer-term residence is not a legal immigration status determination.

Source pointers: oxford-normalized-inventory.json#/records/2753.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:resident:living-in-place

resident / ADJECTIVE / WORD (all proposals)

Label: living in a particular place

Definition EN: Living in or based at a particular place.

Meaning VI: cư trú hoặc có mặt thường xuyên tại một nơi nhất định

Example EN: The island has a small resident population.

Example VI: Hòn đảo có một cộng đồng cư dân thường trú nhỏ.

Grammar/boundary: Attributive resident population; grammatical boundary with noun pending.

AI review: Person noun and residential adjective share core living-place meaning. Local/longer-term residence is not a legal immigration status determination.

Source pointers: oxford-normalized-inventory.json#/records/2753.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:plenty:more-than-enough

plenty / PRONOUN / WORD (all proposals)

Label: a sufficient large amount

Definition EN: An amount that is enough or more than enough.

Meaning VI: một lượng nhiều, đủ hoặc hơn mức cần thiết

Example EN: We have plenty of chairs for the guests.

Example VI: Chúng ta có nhiều ghế, đủ cho các vị khách.

Grammar/boundary: plenty of + plural count noun/uncountable noun; PRONOUN is source convention, nominal analysis also needs review.

AI review: Sufficient amount expressed in plenty of chairs; nominal/pronoun convention unresolved. Enough chairs for guests, not an invented precise count.

Source pointers: oxford-normalized-inventory.json#/records/1925, vocab4600-normalized-inventory.json#/records/96.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:peer:equal-status

peer / NOUN / WORD (all proposals)

Label: someone of similar age or status

Definition EN: A person of a similar age, rank or position to another person.

Meaning VI: người đồng trang lứa hoặc ngang hàng về địa vị hay vai trò

Example EN: Students discussed their ideas with their peers.

Example VI: Các học sinh thảo luận ý tưởng với những bạn đồng trang lứa.

Grammar/boundary: Age/status source groups coalesced provisionally; not British noble-title use.

AI review: Age/status noun groups combined provisionally; careful-looking verb separate. Through gap is intransitive and distinct from peers as classmates.

Source pointers: oxford-normalized-inventory.json#/records/3367, vocab4600-normalized-inventory.json#/records/1589.

Oxford ordinals considered: [0, 1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:peer:look-carefully

peer / VERB / WORD (all proposals)

Label: look closely

Definition EN: To look closely or carefully, especially when something is hard to see.

Meaning VI: nhìn kỹ hoặc chăm chú, nhất là khi khó nhìn rõ

Example EN: She peered through the narrow gap in the fence.

Example VI: Cô ấy nhìn kỹ qua khe hẹp của hàng rào.

Grammar/boundary: Intransitive peer through/at; 4600 verb evidence; not a direct-object verb in this use.

AI review: Age/status noun groups combined provisionally; careful-looking verb separate. Through gap is intransitive and distinct from peers as classmates.

Source pointers: oxford-normalized-inventory.json#/records/3367, vocab4600-normalized-inventory.json#/records/1589.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:nature:natural-world

nature / NOUN / WORD (all proposals)

Label: the world beyond human-made things

Definition EN: The plants, animals and other features of the world that are not made by people.

Meaning VI: thiên nhiên, gồm cây cối, động vật và các yếu tố không do con người tạo ra

Example EN: The children studied nature beside the river.

Example VI: Các em nhỏ tìm hiểu thiên nhiên bên dòng sông.

Grammar/boundary: Uncountable; nature as environment, not someone's character.

AI review: Natural world and essential character distinguished. River study versus nature of trust provide corresponding contextual cues. Initial problem example matched source wording; paired example revised and full-source stratum rechecked.

Source pointers: oxford-normalized-inventory.json#/records/1134, vocab4600-normalized-inventory.json#/records/209.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:nature:essential-character

nature / NOUN / WORD (all proposals)

Label: what something is fundamentally like

Definition EN: The basic qualities or character of a person or thing.

Meaning VI: bản chất hoặc những đặc điểm cơ bản của người hay vật

Example EN: The workshop explored the nature of trust between neighbours.

Example VI: Buổi thảo luận tìm hiểu bản chất của sự tin tưởng giữa những người hàng xóm.

Grammar/boundary: the nature of something; distinct from natural world.

AI review: Natural world and essential character distinguished. River study versus nature of trust provide corresponding contextual cues. Initial problem example matched source wording; paired example revised and full-source stratum rechecked.

Source pointers: oxford-normalized-inventory.json#/records/1134, vocab4600-normalized-inventory.json#/records/209.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:neither:not-one-of-two-determiner

neither / DETERMINER / WORD (all proposals)

Label: not either of two

Definition EN: Used before a singular noun to say that neither of two people or things is included.

Meaning VI: không người hay vật nào trong hai, dùng trước danh từ số ít

Example EN: Neither key fits this lock.

Example VI: Không chiếc chìa nào trong hai chiếc mở được ổ khóa này.

Grammar/boundary: neither + singular noun; representation relation to pronoun unresolved.

AI review: Two-member exclusion determiner/pronoun versus negative addition reviewed. Inversion neither can checked; neither of agreement convention remains pending.

Source pointers: oxford-normalized-inventory.json#/records/1282, vocab4600-normalized-inventory.json#/records/499.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:neither:not-one-of-two-pronoun

neither / PRONOUN / WORD (all proposals)

Label: not either one

Definition EN: Not either of the two people or things already mentioned.

Meaning VI: không ai hoặc không cái nào trong hai đã được nhắc tới

Example EN: I tested two routes, but neither was shorter.

Example VI: Tôi thử hai tuyến đường, nhưng không tuyến nào ngắn hơn.

Grammar/boundary: Pronoun neither; neither of + plural phrase has variable agreement in actual usage, no fabricated final convention.

AI review: Two-member exclusion determiner/pronoun versus negative addition reviewed. Inversion neither can checked; neither of agreement convention remains pending.

Source pointers: oxford-normalized-inventory.json#/records/1282, vocab4600-normalized-inventory.json#/records/499.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:neither:also-not

neither / ADVERB / WORD (all proposals)

Label: also not

Definition EN: Used to add another negative statement about a person or thing.

Meaning VI: cũng không, dùng để bổ sung một ý phủ định

Example EN: I cannot skate, and neither can my brother.

Example VI: Tôi không biết trượt băng, và anh trai tôi cũng không.

Grammar/boundary: neither + auxiliary + subject; negative-addition construction, not noun determiner.

AI review: Two-member exclusion determiner/pronoun versus negative addition reviewed. Inversion neither can checked; neither of agreement convention remains pending.

Source pointers: oxford-normalized-inventory.json#/records/1282, vocab4600-normalized-inventory.json#/records/499.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:overnight:during-night

overnight / ADVERB / WORD (all proposals)

Label: during the night

Definition EN: During a night or for the length of one night.

Meaning VI: trong đêm hoặc suốt một đêm

Example EN: We left the paint to dry overnight.

Example VI: Chúng tôi để sơn khô qua đêm.

Grammar/boundary: Adverb duration; do not assume a precise number of hours.

AI review: Literal duration and figurative sudden fame distinguished. Almost qualifier preserved; metaphor is not translated as a verified one-night duration.

Source pointers: oxford-normalized-inventory.json#/records/3317, vocab4600-normalized-inventory.json#/records/1239.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:overnight:very-quickly

overnight / ADVERB / WORD (all proposals)

Label: very quickly

Definition EN: In a very short time, often unexpectedly.

Meaning VI: rất nhanh, trong thời gian ngắn, thường bất ngờ

Example EN: The local singer became famous almost overnight.

Example VI: Ca sĩ địa phương nổi tiếng gần như chỉ sau một đêm.

Grammar/boundary: Figurative speed; separate from literal nighttime duration.

AI review: Literal duration and figurative sudden fame distinguished. Almost qualifier preserved; metaphor is not translated as a verified one-night duration.

Source pointers: oxford-normalized-inventory.json#/records/3317, vocab4600-normalized-inventory.json#/records/1239.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:no one:no-person

no one / PRONOUN / MULTIWORD_EXPRESSION (all proposals)

Label: not any person

Definition EN: Not a single person.

Meaning VI: không ai, không một người nào

Example EN: No one knew where the spare key was.

Example VI: Không ai biết chìa khóa dự phòng ở đâu.

Grammar/boundary: Two-word indefinite pronoun; singular agreement; no-one is a variant pending review.

AI review: Indefinite two-word pronoun and singular agreement checked. No one knew translates to không ai biết, without loss of negation.

Source pointers: oxford-normalized-inventory.json#/records/74.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:patch:repair-piece

patch / NOUN / WORD (all proposals)

Label: a piece covering a hole

Definition EN: A piece of material used to cover a hole or damaged area.

Meaning VI: miếng vật liệu dùng để vá lỗ hoặc chỗ bị hỏng

Example EN: She sewed a blue patch onto the torn sleeve.

Example VI: Cô ấy khâu một miếng vá màu xanh lên tay áo bị rách.

Grammar/boundary: Countable; physical repair piece.

AI review: Repair material, software update and localized area distinguished. Each paired example demonstrates its intended domain without taxonomy allocation.

Source pointers: oxford-normalized-inventory.json#/records/3307, vocab4600-normalized-inventory.json#/records/4489.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:patch:software-fix

patch / NOUN / WORD (all proposals)

Label: a small software update

Definition EN: A small change to software intended to correct a problem or improve it.

Meaning VI: bản cập nhật nhỏ nhằm sửa lỗi hoặc cải thiện phần mềm

Example EN: The team released a patch for the printing error.

Example VI: Nhóm phát hành một bản vá cho lỗi in.

Grammar/boundary: Countable; a patch need not be an entire new software version.

AI review: Repair material, software update and localized area distinguished. Each paired example demonstrates its intended domain without taxonomy allocation.

Source pointers: oxford-normalized-inventory.json#/records/3307, vocab4600-normalized-inventory.json#/records/4489.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:patch:small-area

patch / NOUN / WORD (all proposals)

Label: a small area unlike its surroundings

Definition EN: A small area of something, often different from the area around it.

Meaning VI: mảng hoặc khoảnh nhỏ, thường khác với phần xung quanh

Example EN: A patch of sunlight fell on the kitchen floor.

Example VI: Một mảng nắng chiếu xuống sàn bếp.

Grammar/boundary: a patch of + substance/light/land; not a repair object.

AI review: Repair material, software update and localized area distinguished. Each paired example demonstrates its intended domain without taxonomy allocation.

Source pointers: oxford-normalized-inventory.json#/records/3307, vocab4600-normalized-inventory.json#/records/4489.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:premium:insurance-payment

premium / NOUN / WORD (all proposals)

Label: a payment for insurance

Definition EN: An amount paid to an insurer for insurance coverage.

Meaning VI: phí đóng cho bên bảo hiểm để được bảo hiểm

Example EN: The policy lists the annual premium beside the coverage details.

Example VI: Hợp đồng ghi phí bảo hiểm hằng năm cạnh chi tiết phạm vi bảo hiểm.

Grammar/boundary: Countable; definition only, no financial recommendation.

AI review: Insurance payment and extra-price noun senses distinguished. Revised seat example excludes default adjective assumptions; no financial recommendation.

Source pointers: oxford-normalized-inventory.json#/records/3860, vocab4600-normalized-inventory.json#/records/3248.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:premium:extra-price

premium / NOUN / WORD (all proposals)

Label: an extra amount paid

Definition EN: An extra amount paid above a usual or stated price.

Meaning VI: khoản trả thêm so với giá thông thường hoặc đã nêu

Example EN: Buyers paid a premium for the seats closest to the stage.

Example VI: Người mua trả thêm tiền cho những ghế gần sân khấu nhất.

Grammar/boundary: a premium for/on; distinct from insurance payment.

AI review: Insurance payment and extra-price noun senses distinguished. Revised seat example excludes default adjective assumptions; no financial recommendation.

Source pointers: oxford-normalized-inventory.json#/records/3860, vocab4600-normalized-inventory.json#/records/3248.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:quiet:little-noise

quiet / ADJECTIVE / WORD (all proposals)

Label: making little noise

Definition EN: Making little or no noise.

Meaning VI: yên tĩnh, phát ra ít hoặc không có tiếng động

Example EN: The library was quiet during the afternoon.

Example VI: Thư viện yên tĩnh vào buổi chiều.

Grammar/boundary: Comparative quieter; not always literally silent.

AI review: Little noise and little speech separately contextualized. Smiling does not disprove quiet behaviour or imply a diagnosis.

Source pointers: oxford-normalized-inventory.json#/records/709, vocab4600-normalized-inventory.json#/records/699.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:quiet:not-talkative

quiet / ADJECTIVE / WORD (all proposals)

Label: not saying much

Definition EN: Not talking much, especially in a particular situation.

Meaning VI: ít nói, nhất là trong một tình huống nhất định

Example EN: He was quiet at dinner but smiled at the stories.

Example VI: Anh ấy ít nói trong bữa tối nhưng mỉm cười khi nghe những câu chuyện.

Grammar/boundary: Describes observed behaviour; does not diagnose mood or personality.

AI review: Little noise and little speech separately contextualized. Smiling does not disprove quiet behaviour or imply a diagnosis.

Source pointers: oxford-normalized-inventory.json#/records/709, vocab4600-normalized-inventory.json#/records/699.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:physician:medical-doctor

physician / NOUN / WORD (all proposals)

Label: a medical doctor

Definition EN: A doctor who is qualified to practise medicine.

Meaning VI: bác sĩ được đào tạo và có đủ tư cách hành nghề y

Example EN: A physician spoke to the students about medical training.

Example VI: Một bác sĩ nói chuyện với các sinh viên về việc đào tạo y khoa.

Grammar/boundary: Especially formal/US general doctor; UK use may contrast with surgeon; regional scope pending.

AI review: Qualified medical-doctor noun; regional surgeon contrast noted. Educational talk example is not diagnosis or treatment.

Source pointers: oxford-normalized-inventory.json#/records/3328, vocab4600-normalized-inventory.json#/records/2648.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:read:understand-writing

read / VERB / WORD (all proposals)

Label: understand written words

Definition EN: To look at written words and understand what they mean, silently or aloud.

Meaning VI: đọc và hiểu những từ được viết, thầm hoặc thành tiếng

Example EN: She read the instructions before opening the box.

Example VI: Cô ấy đọc hướng dẫn trước khi mở hộp.

Grammar/boundary: read present /ri:d/, past /red/; pronunciation note only, no media generated.

AI review: Comprehension of writing with silent/aloud use combined. Irregular pronunciation noted without audio output; instructions translated faithfully.

Source pointers: oxford-normalized-inventory.json#/records/202.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:per cent:per-hundred

per cent / OTHER / MULTIWORD_EXPRESSION (all proposals)

Label: parts out of a hundred

Definition EN: Used after a number to express that many parts in every hundred.

Meaning VI: phần trăm, biểu thị số phần trong mỗi một trăm phần

Example EN: Twenty per cent of the tickets were sold online.

Example VI: Hai mươi phần trăm số vé được bán trực tuyến.

Grammar/boundary: Number expression; source NOUN/ADJECTIVE/ADVERB analysis unresolved. OTHER is a temporary local proposal, not a new approved numeral enum.

AI review: Per-hundred numerical expression reviewed; source NOUN/ADJECTIVE/ADVERB assignments not auto-approved. OTHER fallback leaves numeral/lexical-unit policy explicit.

Source pointers: oxford-normalized-inventory.json#/records/1089.

Oxford ordinals considered: [0, 1, 2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:pipe dream:unrealistic-plan

pipe dream / NOUN / IDIOM (all proposals)

Label: an unrealistic hope or plan

Definition EN: A hope or plan that is very unlikely to become reality.

Meaning VI: mong ước hoặc kế hoạch viển vông, rất khó thành hiện thực

Example EN: Without funding, the huge indoor garden remained a pipe dream.

Example VI: Không có kinh phí, khu vườn trong nhà khổng lồ vẫn chỉ là một mong ước viển vông.

Grammar/boundary: Countable idiom; not a literal pipe or a sleeping dream.

AI review: Unrealistic hope idiom, not literal pipe. Funding condition and still-unrealized garden remain paired; no prediction of absolute impossibility.

Source pointers: vocab4600-normalized-inventory.json#/records/3879.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:next to:beside

next to / PREPOSITION / MULTIWORD_EXPRESSION (all proposals)

Label: beside something

Definition EN: At the side of and close to a person or thing.

Meaning VI: ở cạnh và gần một người hoặc vật

Example EN: The bicycle is next to the wooden gate.

Example VI: Chiếc xe đạp ở cạnh cổng gỗ.

Grammar/boundary: next to + noun phrase; almost/nearly construction requires separate evidence.

AI review: Spatial beside preposition only. Bicycle/gate example demonstrates proximity; nearly construction not invented.

Source pointers: oxford-normalized-inventory.json#/records/155.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:sponsorship:support-for-activity

sponsorship / NOUN / WORD (all proposals)

Label: support for an activity

Definition EN: Financial or other support provided for a person, event or activity.

Meaning VI: sự hỗ trợ tài chính hoặc hình thức hỗ trợ khác dành cho người, sự kiện hay hoạt động

Example EN: Local shops provided sponsorship for the school concert.

Example VI: Các cửa hàng địa phương tài trợ cho buổi hòa nhạc của trường.

Grammar/boundary: Usually uncountable; commercial publicity may accompany support but is not asserted in every case.

AI review: Support beyond money allowed; shops/concert context concrete. Publicity is possible but not made universal.

Source pointers: oxford-normalized-inventory.json#/records/3645, vocab4600-normalized-inventory.json#/records/3735.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:sympathy:care-for-suffering

sympathy / NOUN / WORD (all proposals)

Label: understanding someone's suffering

Definition EN: Understanding and care for someone who is unhappy or in difficulty.

Meaning VI: sự cảm thông và quan tâm dành cho người buồn khổ hoặc gặp khó khăn

Example EN: Her neighbours expressed sympathy after the loss of her pet.

Example VI: Những người hàng xóm bày tỏ sự cảm thông sau khi cô ấy mất thú cưng.

Grammar/boundary: sympathy for someone; not necessarily agreement with their views.

AI review: Care for suffering, not automatic agreement. Pet loss and neighbours remain in Vietnamese without medical claims.

Source pointers: oxford-normalized-inventory.json#/records/2939, vocab4600-normalized-inventory.json#/records/1494.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:skiing:sport-on-skis

skiing / NOUN / WORD (all proposals)

Label: moving on skis

Definition EN: The sport or activity of travelling over snow on skis.

Meaning VI: môn thể thao hoặc hoạt động di chuyển trên tuyết bằng ván trượt

Example EN: They tried skiing on a gentle slope.

Example VI: Họ thử trượt tuyết trên một dốc thoải.

Grammar/boundary: Uncountable activity noun; water-skiing is not intended.

AI review: Snow-skis activity excludes water-skiing in this proposal. Gentle slope is narrative context, not a safety recommendation.

Source pointers: oxford-normalized-inventory.json#/records/1693.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:susceptible:easily-affected

susceptible / ADJECTIVE / WORD (all proposals)

Label: easily affected by something

Definition EN: Likely to be affected or harmed by something.

Meaning VI: dễ bị tác động hoặc gây hại bởi điều gì

Example EN: These thin curtains are susceptible to fading in sunlight.

Example VI: Những tấm rèm mỏng này dễ bị phai màu dưới ánh nắng.

Grammar/boundary: susceptible to + noun/gerund; physical materials example, no medical prediction.

AI review: Susceptible to complement; material fading avoids medical prognosis. Thin curtains and sunlight remain in both languages.

Source pointers: vocab4600-normalized-inventory.json#/records/2197.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:utter:say

utter / VERB / WORD (all proposals)

Label: say a word or sound

Definition EN: To say a word or make a sound with the voice.

Meaning VI: thốt ra lời hoặc phát ra âm thanh bằng giọng nói

Example EN: She did not utter a word during the short journey.

Example VI: Cô ấy không nói một lời nào trong chuyến đi ngắn.

Grammar/boundary: Transitive utter + word/sound; formal; adjective utter meaning complete not supported here.

AI review: Transitive saying verb, not adjective complete. Did not utter a word preserves negation in the paired translation.

Source pointers: vocab4600-normalized-inventory.json#/records/2591.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:scan:make-digital-copy

scan / VERB / WORD (all proposals)

Label: make a digital image

Definition EN: To use a device to make a digital image of a document or object.

Meaning VI: dùng thiết bị để tạo hình ảnh số của tài liệu hoặc vật

Example EN: He scanned the signed form and saved it as a file.

Example VI: Anh ấy quét biểu mẫu đã ký và lưu thành tệp.

Grammar/boundary: Transitive scan + document; not the reading-skim meaning.

AI review: Digital capture versus targeted quick reading distinguished. Signed form and brother's name separate the meanings; no template substitution.

Source pointers: oxford-normalized-inventory.json#/records/2314.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:scan:look-over-quickly

scan / VERB / WORD (all proposals)

Label: look quickly for information

Definition EN: To look quickly over something in order to find particular information.

Meaning VI: xem nhanh một thứ để tìm thông tin cụ thể

Example EN: She scanned the list for her brother's name.

Example VI: Cô ấy lướt qua danh sách để tìm tên anh trai.

Grammar/boundary: scan something for something; distinct from making a digital image.

AI review: Digital capture versus targeted quick reading distinguished. Signed form and brother's name separate the meanings; no template substitution.

Source pointers: oxford-normalized-inventory.json#/records/2314.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:sick:unwell

sick / ADJECTIVE / WORD (all proposals)

Label: not well

Definition EN: Not in good health because of illness.

Meaning VI: ốm hoặc không khỏe do bệnh

Example EN: He stayed home because he felt sick.

Example VI: Anh ấy ở nhà vì cảm thấy không khỏe.

Grammar/boundary: Especially American general illness use; no diagnosis, sick leave is related construction.

AI review: General illness versus nausea distinguished and regional context stated. Winding-road example shows nausea, not a diagnosed disease.

Source pointers: oxford-normalized-inventory.json#/records/587.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:sick:nauseated

sick / ADJECTIVE / WORD (all proposals)

Label: feeling likely to vomit

Definition EN: Feeling as if one might vomit.

Meaning VI: buồn nôn, cảm thấy có thể nôn

Example EN: The winding road made her feel sick.

Example VI: Đường quanh co khiến cô ấy buồn nôn.

Grammar/boundary: feel sick especially UK nausea use; no treatment suggestion.

AI review: General illness versus nausea distinguished and regional context stated. Winding-road example shows nausea, not a diagnosed disease.

Source pointers: oxford-normalized-inventory.json#/records/587.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:stand:upright-position

stand / VERB / WORD (all proposals)

Label: be on one's feet

Definition EN: To be upright with the body supported by the feet.

Meaning VI: đứng thẳng, cơ thể được đỡ bằng bàn chân

Example EN: The visitors stood near the entrance.

Example VI: Các vị khách đứng gần lối vào.

Grammar/boundary: stand, stood, stood; intransitive physical position.

AI review: Upright verb, support noun and tolerate verb distinguished. Cannot stand is a negative tolerance construction; object fan noise preserved.

Source pointers: oxford-normalized-inventory.json#/records/422, vocab4600-normalized-inventory.json#/records/3625.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:stand:support-object

stand / NOUN / WORD (all proposals)

Label: a support for an object

Definition EN: A structure that holds an object in a useful position.

Meaning VI: giá đỡ giữ một vật ở vị trí thuận tiện

Example EN: The camera was fixed to a metal stand.

Example VI: Chiếc máy ảnh được gắn vào một giá đỡ kim loại.

Grammar/boundary: Countable; physical support rather than a posture.

AI review: Upright verb, support noun and tolerate verb distinguished. Cannot stand is a negative tolerance construction; object fan noise preserved.

Source pointers: oxford-normalized-inventory.json#/records/422, vocab4600-normalized-inventory.json#/records/3625.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:stand:tolerate

stand / VERB / WORD (all proposals)

Label: tolerate something

Definition EN: To accept or tolerate something unpleasant.

Meaning VI: chịu đựng hoặc chấp nhận một điều khó chịu

Example EN: I cannot stand the noise from that loose fan.

Example VI: Tôi không chịu nổi tiếng ồn từ chiếc quạt bị lỏng đó.

Grammar/boundary: Usually in negatives/questions; stand + noun/gerund; not stand to + infinitive in this proposal.

AI review: Upright verb, support noun and tolerate verb distinguished. Cannot stand is a negative tolerance construction; object fan noise preserved.

Source pointers: oxford-normalized-inventory.json#/records/422, vocab4600-normalized-inventory.json#/records/3625.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:solemn:serious

solemn / ADJECTIVE / WORD (all proposals)

Label: serious in manner

Definition EN: Serious and without humour, often because something is important or sad.

Meaning VI: nghiêm trang, không đùa cợt, thường vì một việc quan trọng hoặc buồn

Example EN: The room fell silent during the solemn ceremony.

Example VI: Căn phòng im lặng trong buổi lễ trang nghiêm.

Grammar/boundary: Serious manner does not prove honesty; oath sense not separately asserted.

AI review: Serious manner need not imply honesty. Ceremony example matches; source honesty overstatement is not reused.

Source pointers: vocab4600-normalized-inventory.json#/records/3397.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:station:railway-place

station / NOUN / WORD (all proposals)

Label: a place where trains stop

Definition EN: A place where trains stop so that people can get on or off.

Meaning VI: nhà ga, nơi tàu dừng để người lên hoặc xuống

Example EN: The last train arrived at the station just before midnight.

Example VI: Chuyến tàu cuối đến ga ngay trước nửa đêm.

Grammar/boundary: Countable; railway meaning; police/service stations need separate evidence.

AI review: Railway facility and broadcasting institution distinguished. Arrival versus interview demonstrate different referents.

Source pointers: oxford-normalized-inventory.json#/records/519, vocab4600-normalized-inventory.json#/records/1031.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:station:broadcast-organization

station / NOUN / WORD (all proposals)

Label: a broadcasting organization

Definition EN: An organization or facility that broadcasts radio or television programmes.

Meaning VI: đài hoặc cơ sở phát chương trình phát thanh hay truyền hình

Example EN: The radio station interviewed the young musicians.

Example VI: Đài phát thanh phỏng vấn các nhạc công trẻ.

Grammar/boundary: Institution/facility provisionally combined; not a railway station.

AI review: Railway facility and broadcasting institution distinguished. Arrival versus interview demonstrate different referents.

Source pointers: oxford-normalized-inventory.json#/records/519, vocab4600-normalized-inventory.json#/records/1031.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:shareholder:share-owner

shareholder / NOUN / WORD (all proposals)

Label: an owner of company shares

Definition EN: A person or organization that owns shares in a company.

Meaning VI: cổ đông, cá nhân hoặc tổ chức sở hữu cổ phần của một công ty

Example EN: Shareholders received a report about the new factory.

Example VI: Các cổ đông nhận được báo cáo về nhà máy mới.

Grammar/boundary: Countable; holdings confer rights according to company/legal terms; no investment advice.

AI review: Individual/organization holding shares supported; no automatic manager status. Company report example does not offer investment advice.

Source pointers: oxford-normalized-inventory.json#/records/4810, vocab4600-normalized-inventory.json#/records/4593.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:terminal:transport-building

terminal / NOUN / WORD (all proposals)

Label: a passenger transport building

Definition EN: A building or area where passengers begin or end journeys and board or leave transport.

Meaning VI: nhà ga hoặc khu vực nơi hành khách bắt đầu, kết thúc chuyến đi và lên xuống phương tiện

Example EN: My boarding pass shows the terminal on the east side of the airport.

Example VI: Thẻ lên máy bay của tôi ghi nhà ga nằm ở phía đông sân bay.

Grammar/boundary: Countable; airport/bus terminal; not an entire airport in all uses.

AI review: Transport building, end-stage illness and computer device distinguished. Medical wording remains expected prognosis, not guaranteed timing; specialist review pending.

Source pointers: oxford-normalized-inventory.json#/records/3212, vocab4600-normalized-inventory.json#/records/1967.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:terminal:end-stage-illness

terminal / ADJECTIVE / WORD (all proposals)

Label: an illness expected to cause death

Definition EN: Describing an illness expected to lead to death rather than recovery.

Meaning VI: ở giai đoạn cuối, nói về bệnh được dự đoán sẽ dẫn đến tử vong thay vì hồi phục

Example EN: The novel follows a family caring for a relative with a terminal illness.

Example VI: Cuốn tiểu thuyết kể về một gia đình chăm sóc người thân mắc bệnh giai đoạn cuối.

Grammar/boundary: Sensitive medical description; prognosis requires a clinician, no individual prediction or time limit.

AI review: Transport building, end-stage illness and computer device distinguished. Medical wording remains expected prognosis, not guaranteed timing; specialist review pending.

Source pointers: oxford-normalized-inventory.json#/records/3212, vocab4600-normalized-inventory.json#/records/1967.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:terminal:computer-device

terminal / NOUN / WORD (all proposals)

Label: a device for using a computer system

Definition EN: A device used to enter information into or receive information from a computer system.

Meaning VI: thiết bị đầu cuối dùng để nhập hoặc nhận thông tin từ một hệ thống máy tính

Example EN: The clerk entered the code at a terminal beside the counter.

Example VI: Nhân viên nhập mã trên thiết bị đầu cuối cạnh quầy.

Grammar/boundary: Countable; broad device concept, not every terminal is a full independent computer.

AI review: Transport building, end-stage illness and computer device distinguished. Medical wording remains expected prognosis, not guaranteed timing; specialist review pending.

Source pointers: oxford-normalized-inventory.json#/records/3212, vocab4600-normalized-inventory.json#/records/1967.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:successfully:achieve-result

successfully / ADVERB / WORD (all proposals)

Label: with a successful result

Definition EN: In a way that achieves what was intended.

Meaning VI: thành công, đạt điều đã dự định

Example EN: The team successfully moved the heavy piano upstairs.

Example VI: Nhóm đã chuyển thành công cây đàn piano nặng lên tầng trên.

Grammar/boundary: Adverb modifies completed action; does not require perfection.

AI review: Intended outcome, not perfection. Piano/upstairs participants and result retained.

Source pointers: oxford-normalized-inventory.json#/records/2102.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:subject:topic

subject / NOUN / WORD (all proposals)

Label: what is discussed

Definition EN: The topic that someone talks, writes or thinks about.

Meaning VI: chủ đề được nói, viết hoặc suy nghĩ đến

Example EN: The subject of today's discussion is public transport.

Example VI: Chủ đề thảo luận hôm nay là giao thông công cộng.

Grammar/boundary: Countable; subject of a discussion; not grammatical subject.

AI review: Topic, condition-sensitive adjective, school discipline and grammatical subject reviewed. Passive clauses show why subject cannot always mean doer; verb source evidence remains unrepresented.

Source pointers: oxford-normalized-inventory.json#/records/546, vocab4600-normalized-inventory.json#/records/3323.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:subject:liable-to

subject / ADJECTIVE / WORD (all proposals)

Label: liable to a condition or rule

Definition EN: Likely to experience something, or required to follow a rule or condition.

Meaning VI: có thể chịu tác động của điều gì hoặc phải tuân theo quy định, điều kiện

Example EN: The outdoor event is subject to changes in the weather.

Example VI: Sự kiện ngoài trời có thể bị ảnh hưởng bởi thay đổi thời tiết.

Grammar/boundary: subject to + noun; external-condition example; obligation/susceptibility boundary pending.

AI review: Topic, condition-sensitive adjective, school discipline and grammatical subject reviewed. Passive clauses show why subject cannot always mean doer; verb source evidence remains unrepresented.

Source pointers: oxford-normalized-inventory.json#/records/546, vocab4600-normalized-inventory.json#/records/3323.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:subject:school-discipline

subject / NOUN / WORD (all proposals)

Label: an area studied at school

Definition EN: An area of knowledge taught or studied at school.

Meaning VI: môn học, lĩnh vực kiến thức được dạy hoặc học ở trường

Example EN: History was her favourite subject that year.

Example VI: Lịch sử là môn học cô ấy thích nhất năm đó.

Grammar/boundary: Countable; school discipline distinct from a discussion topic.

AI review: Topic, condition-sensitive adjective, school discipline and grammatical subject reviewed. Passive clauses show why subject cannot always mean doer; verb source evidence remains unrepresented.

Source pointers: oxford-normalized-inventory.json#/records/546, vocab4600-normalized-inventory.json#/records/3323.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:subject:grammar-role

subject / NOUN / WORD (all proposals)

Label: the grammatical subject

Definition EN: The part of a clause about which a statement is made and which typically controls verb agreement.

Meaning VI: chủ ngữ, thành phần của mệnh đề thường chi phối sự hòa hợp của động từ

Example EN: In Birds fly, Birds is the subject.

Example VI: Trong câu Birds fly, Birds là chủ ngữ.

Grammar/boundary: Grammar terminology; subject need not be the doer in passive clauses; no simplistic agent definition.

AI review: Topic, condition-sensitive adjective, school discipline and grammatical subject reviewed. Passive clauses show why subject cannot always mean doer; verb source evidence remains unrepresented.

Source pointers: oxford-normalized-inventory.json#/records/546, vocab4600-normalized-inventory.json#/records/3323.

Oxford ordinals considered: [3]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:straight:directly-ahead

straight / ADVERB / WORD (all proposals)

Label: without turning

Definition EN: In a direct line or direction without turning aside.

Meaning VI: thẳng theo một hướng, không rẽ sang bên

Example EN: Walk straight until you reach the blue door.

Example VI: Đi thẳng cho đến khi bạn tới cánh cửa màu xanh.

Grammar/boundary: Adverb modifies walk; not necessarily an uninterrupted journey.

AI review: Direction adverb versus shape adjective distinguished. Flat-adverb construction in walk straight is retained as valid; no identity-related colloquial meaning introduced.

Source pointers: oxford-normalized-inventory.json#/records/1091.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:straight:not-curved

straight / ADJECTIVE / WORD (all proposals)

Label: without bends

Definition EN: Without bends or curves.

Meaning VI: thẳng, không cong hoặc uốn

Example EN: Draw a straight line between the two dots.

Example VI: Vẽ một đường thẳng nối hai chấm.

Grammar/boundary: Attributive straight line; sensitive identity meanings not introduced.

AI review: Direction adverb versus shape adjective distinguished. Flat-adverb construction in walk straight is retained as valid; no identity-related colloquial meaning introduced.

Source pointers: oxford-normalized-inventory.json#/records/1091.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:teacher:educator

teacher / NOUN / WORD (all proposals)

Label: a person who teaches

Definition EN: A person whose work is to help others learn knowledge or skills.

Meaning VI: giáo viên hoặc người làm công việc dạy kiến thức hay kỹ năng

Example EN: The teacher showed us how to fold the paper.

Example VI: Giáo viên chỉ cho chúng tôi cách gấp giấy.

Grammar/boundary: Countable; preserved history-linked runtime identity, no automatic reuse.

AI review: Education profession noun; paper-folding example demonstrates instruction. History linkage remains preserved and unresolved.

Source pointers: oxford-normalized-inventory.json#/records/588.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:thereby:as-a-result

thereby / ADVERB / WORD (all proposals)

Label: as a result of that

Definition EN: As a result of the action or situation just mentioned.

Meaning VI: qua đó hoặc nhờ đó, do hành động hay tình huống vừa nói tới

Example EN: She labelled each box, thereby making unpacking easier.

Example VI: Cô ấy dán nhãn từng hộp, nhờ đó việc dỡ đồ trở nên dễ hơn.

Grammar/boundary: Linking adverb, often thereby + participle; conflicting CONJUNCTION source tag not accepted automatically.

AI review: Result-linking adverb with participial clause checked. Labeling boxes makes unpacking easier; source CONJUNCTION conflict left pending.

Source pointers: oxford-normalized-inventory.json#/records/4273, vocab4600-normalized-inventory.json#/records/3652.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:small:little-size

small / ADJECTIVE / WORD (all proposals)

Label: little in size

Definition EN: Of little size compared with similar things.

Meaning VI: nhỏ về kích thước so với những thứ tương tự

Example EN: A small basket fitted under the chair.

Example VI: Một chiếc giỏ nhỏ đặt vừa dưới ghế.

Grammar/boundary: Comparative smaller; physical-size sense.

AI review: Physical size versus low amount/chance proposals. Scale separation is tentative and requires boundary review; example translations retain dimensions.

Source pointers: oxford-normalized-inventory.json#/records/215.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:small:little-amount

small / ADJECTIVE / WORD (all proposals)

Label: little in amount or degree

Definition EN: Of little amount or degree.

Meaning VI: ít hoặc nhỏ về số lượng hay mức độ

Example EN: There is a small chance that the bus will arrive early.

Example VI: Có một khả năng nhỏ là xe buýt sẽ đến sớm.

Grammar/boundary: Scalar amount/chance; provisional distinction from physical size.

AI review: Physical size versus low amount/chance proposals. Scale separation is tentative and requires boundary review; example translations retain dimensions.

Source pointers: oxford-normalized-inventory.json#/records/215.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:substantially:considerably

substantially / ADVERB / WORD (all proposals)

Label: by a considerable amount

Definition EN: By a considerable amount or to a considerable degree.

Meaning VI: đáng kể về lượng hoặc mức độ

Example EN: The quieter engine substantially reduced the noise.

Example VI: Động cơ êm hơn làm giảm tiếng ồn đáng kể.

Grammar/boundary: Adverb modifies reduced; source ADJECTIVE conflict needs correction review, no adjective proposed.

AI review: Degree adverb of reduction, not an adjective despite source conflict. Considerable change does not impose a numerical threshold.

Source pointers: oxford-normalized-inventory.json#/records/4404, vocab4600-normalized-inventory.json#/records/1790.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:visible (adj):can-be-seen

visible / ADJECTIVE / WORD (all proposals)

Label: able to be seen

Definition EN: Able to be seen.

Meaning VI: có thể nhìn thấy

Example EN: The island was visible from the top of the hill.

Example VI: Có thể nhìn thấy hòn đảo từ đỉnh đồi.

Grammar/boundary: Proposed display visible; (adj) is a source annotation, not part of the lexical unit; no silent source-key merge.

AI review: Annotation removal is a display proposal only; candidate key stays exact. Can-be-seen definition and viewpoint example checked; false multiword source flag disclosed.

Source pointers: vocab4600-normalized-inventory.json#/records/4123.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:whole:entire

whole / ADJECTIVE / WORD (all proposals)

Label: complete and undivided

Definition EN: Including every part, with nothing missing.

Meaning VI: toàn bộ, gồm mọi phần và không thiếu gì

Example EN: We spent the whole afternoon arranging the books.

Example VI: Chúng tôi dành cả buổi chiều để sắp xếp sách.

Grammar/boundary: the whole + singular noun; not all the afternoons in this example.

AI review: Complete adjective and nominal complete-unit use distinguished provisionally. Entire afternoon versus book-as-unit context retained.

Source pointers: oxford-normalized-inventory.json#/records/946.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:whole:complete-unit

whole / NOUN / WORD (all proposals)

Label: a complete unit

Definition EN: A complete thing made up of all its parts.

Meaning VI: một chỉnh thể gồm đầy đủ các phần

Example EN: Each chapter contributes to the book as a whole.

Example VI: Mỗi chương góp phần vào cuốn sách như một chỉnh thể.

Grammar/boundary: as a whole; countable a whole; relation to adjective pending representation review.

AI review: Complete adjective and nominal complete-unit use distinguished provisionally. Entire afternoon versus book-as-unit context retained.

Source pointers: oxford-normalized-inventory.json#/records/946.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:which:choice-determiner

which / DETERMINER / WORD (all proposals)

Label: asking about a choice

Definition EN: Used before a noun to ask for a choice from a known or limited set.

Meaning VI: nào, dùng trước danh từ để hỏi lựa chọn trong một nhóm đã biết hoặc có giới hạn

Example EN: Which bus goes to the museum?

Example VI: Xe buýt nào đi đến bảo tàng?

Grammar/boundary: Interrogative which + noun; relative determiner use not drafted separately.

AI review: Limited-choice interrogative determiner/pronoun usages reviewed. Relative uses not mechanically drafted from the two source groups.

Source pointers: oxford-normalized-inventory.json#/records/51.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:which:choice-pronoun

which / PRONOUN / WORD (all proposals)

Label: asking which one

Definition EN: Used to ask for a choice when the noun is not repeated.

Meaning VI: cái nào hoặc người nào, hỏi lựa chọn mà không nhắc lại danh từ

Example EN: There are two spare keys; which do you need?

Example VI: Có hai chìa khóa dự phòng; bạn cần chiếc nào?

Grammar/boundary: Interrogative pronoun; relative which needs separate supported review, not forced here.

AI review: Limited-choice interrogative determiner/pronoun usages reviewed. Relative uses not mechanically drafted from the two source groups.

Source pointers: oxford-normalized-inventory.json#/records/51.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:weapon:harm-instrument

weapon / NOUN / WORD (all proposals)

Label: something used to cause harm

Definition EN: An object designed or used to injure someone or damage something in an attack.

Meaning VI: vũ khí hoặc vật được dùng để làm bị thương hay gây hư hại trong cuộc tấn công

Example EN: The museum keeps the old weapon behind glass.

Example VI: Bảo tàng đặt vũ khí cũ sau lớp kính.

Grammar/boundary: Countable; historical display example, no use instructions.

AI review: Designed-or-used harm instrument avoids limiting to firearms. Museum example is descriptive; no weapon-use instruction.

Source pointers: oxford-normalized-inventory.json#/records/2036, vocab4600-normalized-inventory.json#/records/646.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worsen:become-worse

worsen / VERB / WORD (all proposals)

Label: become worse

Definition EN: To become worse or less satisfactory.

Meaning VI: trở nên tệ hơn hoặc kém thỏa đáng hơn

Example EN: The weather worsened as the boats approached the shore.

Example VI: Thời tiết trở nên xấu hơn khi các thuyền tiến gần bờ.

Grammar/boundary: Intransitive here; transitive worsen a problem is a valency variation, not an automatic new Sense.

AI review: Intransitive become-worse example matches source. Transitive valency noted conditionally, no forced new Sense or wrong object in example.

Source pointers: vocab4600-normalized-inventory.json#/records/2859.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worthy:deserving

worthy / ADJECTIVE / WORD (all proposals)

Label: deserving respect or attention

Definition EN: Deserving respect, attention or support because of good qualities.

Meaning VI: xứng đáng được tôn trọng, chú ý hoặc hỗ trợ nhờ những phẩm chất tốt

Example EN: The volunteers supported a worthy local cause.

Example VI: Các tình nguyện viên ủng hộ một hoạt động địa phương đáng trân trọng.

Grammar/boundary: worthy of + noun, worthy cause; value judgment not objectively verified by corpus evidence.

AI review: Deserving evaluative adjective, not objective approval. Worthy of pattern checked; volunteer example contextual.

Source pointers: oxford-normalized-inventory.json#/records/3904, vocab4600-normalized-inventory.json#/records/3870.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:washing:clothes-to-wash

washing / NOUN / WORD (all proposals)

Label: clothes being washed

Definition EN: Clothes or other fabric items that are being washed, need washing or have just been washed.

Meaning VI: quần áo hay đồ vải cần giặt, đang giặt hoặc vừa được giặt

Example EN: The washing was still hanging in the garden.

Example VI: Quần áo đã giặt vẫn đang phơi trong vườn.

Grammar/boundary: Uncountable; especially British English; example laundry rather than the act.

AI review: Laundry objects versus washing activity reviewed. Clothes hanging differs from time spent washing curtains; representation may coalesce.

Source pointers: oxford-normalized-inventory.json#/records/1621.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:washing:cleaning-with-water

washing / NOUN / WORD (all proposals)

Label: the act of washing

Definition EN: The activity of cleaning something with water and often soap.

Meaning VI: việc rửa hoặc giặt bằng nước, thường có xà phòng

Example EN: The washing of the curtains took most of the morning.

Example VI: Việc giặt rèm mất gần cả buổi sáng.

Grammar/boundary: Uncountable action nominal; source act/object distinction may be represented as usage variants.

AI review: Laundry objects versus washing activity reviewed. Clothes hanging differs from time spent washing curtains; representation may coalesce.

Source pointers: oxford-normalized-inventory.json#/records/1621.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wrap:cover-with-material

wrap / VERB / WORD (all proposals)

Label: cover by folding material around

Definition EN: To cover something by folding paper, cloth or another material around it.

Meaning VI: bọc một vật bằng cách gấp giấy, vải hoặc vật liệu khác quanh nó

Example EN: He wrapped the cup in a towel before packing it.

Example VI: Anh ấy bọc chiếc cốc trong khăn trước khi xếp vào hành lý.

Grammar/boundary: wrap something in something; wrap something around something.

AI review: Wrap object in material checked; towel protects a cup. Alternative around construction noted without extra Sense allocation.

Source pointers: oxford-normalized-inventory.json#/records/2858, vocab4600-normalized-inventory.json#/records/686.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:week:seven-day-period

week / NOUN / WORD (all proposals)

Label: a period of seven days

Definition EN: A period of seven consecutive days.

Meaning VI: tuần, khoảng thời gian gồm bảy ngày liên tiếp

Example EN: The builders finished the fence in a week.

Example VI: Những người thợ xây hoàn thành hàng rào trong một tuần.

Grammar/boundary: Countable; calendar conventions vary; each-week use is a construction, not automatically a distinct Sense.

AI review: Seven-day period coalesces source periodic construction. In a week remains a duration; no arbitrary first-day convention.

Source pointers: oxford-normalized-inventory.json#/records/191, vocab4600-normalized-inventory.json#/records/18.

Oxford ordinals considered: [0, 1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worse:less-good

worse / ADJECTIVE / WORD (all proposals)

Label: less good or more unpleasant

Definition EN: Less good, more serious or more unpleasant than another thing or before.

Meaning VI: tệ hơn, nghiêm trọng hơn hoặc khó chịu hơn so với điều khác hay trước đó

Example EN: The second delay was worse than the first.

Example VI: Lần chậm trễ thứ hai tệ hơn lần đầu.

Grammar/boundary: Comparative of bad; worse than; separate syntactic use from adverb badly.

AI review: Comparative adjective, adverb and nominal worse distinct by syntax. Played worse is comparative badly; nominal form still representation pending.

Source pointers: oxford-normalized-inventory.json#/records/1195, vocab4600-normalized-inventory.json#/records/39.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worse:less-well

worse / ADVERB / WORD (all proposals)

Label: less well

Definition EN: In a less successful or satisfactory way.

Meaning VI: kém hơn hoặc theo cách ít thỏa đáng hơn

Example EN: He played worse in the second match.

Example VI: Anh ấy chơi kém hơn trong trận thứ hai.

Grammar/boundary: Comparative of badly in this example; owner may represent adjective/adverb as related usages.

AI review: Comparative adjective, adverb and nominal worse distinct by syntax. Played worse is comparative badly; nominal form still representation pending.

Source pointers: oxford-normalized-inventory.json#/records/1195, vocab4600-normalized-inventory.json#/records/39.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worse:more-bad-things

worse / NOUN / WORD (all proposals)

Label: something more unpleasant

Definition EN: Something more serious or unpleasant than what has already happened.

Meaning VI: điều tệ hơn những gì đã xảy ra

Example EN: We feared worse when the lights went out.

Example VI: Chúng tôi lo sẽ có chuyện tệ hơn khi đèn tắt.

Grammar/boundary: Nominal worse; source NOUN convention is provisional, no distinct canonical identity assigned.

AI review: Comparative adjective, adverb and nominal worse distinct by syntax. Played worse is comparative badly; nominal form still representation pending.

Source pointers: oxford-normalized-inventory.json#/records/1195, vocab4600-normalized-inventory.json#/records/39.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:zone:defined-area

zone / NOUN / WORD (all proposals)

Label: an area with a particular purpose

Definition EN: An area identified by a particular use, rule or feature.

Meaning VI: khu vực được xác định theo chức năng, quy định hoặc đặc điểm riêng

Example EN: The path crosses a quiet pedestrian zone.

Example VI: Lối đi băng qua một khu vực yên tĩnh dành cho người đi bộ.

Grammar/boundary: Countable; boundary may be administrative or descriptive.

AI review: Purpose/rule/feature-defined area supported. Pedestrian zone example matches without creating a canonical topic or location.

Source pointers: oxford-normalized-inventory.json#/records/2532, vocab4600-normalized-inventory.json#/records/1090.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:whereas:contrast

whereas / CONJUNCTION / WORD (all proposals)

Label: contrasting two facts

Definition EN: Used to contrast two facts or situations.

Meaning VI: trong khi, dùng để đối chiếu hai sự việc hoặc tình huống

Example EN: The front room is sunny, whereas the back room is cool.

Example VI: Phòng phía trước nhiều nắng, trong khi phòng phía sau mát.

Grammar/boundary: Joins clauses; contrast rather than simultaneous-time while in this proposal.

AI review: Contrast of two clauses, not a time adverb. Sunny versus cool remains faithful, no invented cause.

Source pointers: oxford-normalized-inventory.json#/records/2733, vocab4600-normalized-inventory.json#/records/2497.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wound:physical-injury

wound / NOUN / WORD (all proposals)

Label: a physical injury

Definition EN: An injury to body tissue, often involving a cut or break in the skin.

Meaning VI: vết thương ở mô cơ thể, thường có vết cắt hoặc rách da

Example EN: The nurse recorded the size of the wound.

Example VI: Y tá ghi lại kích thước vết thương.

Grammar/boundary: Countable; noun pronounced /wu:nd/, not the past tense of wind; no care instructions.

AI review: Physical injury noun/verb and emotional-hurt verb reviewed. Distinct pronunciation from wind noted; nurse example provides no treatment directions.

Source pointers: oxford-normalized-inventory.json#/records/2839, vocab4600-normalized-inventory.json#/records/1870.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wound:injure

wound / VERB / WORD (all proposals)

Label: cause a physical injury

Definition EN: To cause an injury to someone's body.

Meaning VI: làm một người bị thương về cơ thể

Example EN: A falling branch wounded his shoulder.

Example VI: Một cành cây rơi làm vai anh ấy bị thương.

Grammar/boundary: Transitive wound + person/body part; not the verb wind pronounced differently.

AI review: Physical injury noun/verb and emotional-hurt verb reviewed. Distinct pronunciation from wind noted; nurse example provides no treatment directions.

Source pointers: oxford-normalized-inventory.json#/records/2839, vocab4600-normalized-inventory.json#/records/1870.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wound:hurt-feelings

wound / VERB / WORD (all proposals)

Label: hurt someone's feelings

Definition EN: To cause emotional hurt to someone.

Meaning VI: làm tổn thương cảm xúc của ai

Example EN: The dismissive comment wounded her pride.

Example VI: Lời nhận xét coi thường làm tổn thương lòng tự trọng của cô ấy.

Grammar/boundary: Figurative transitive use; distinct from physical injury; no mental-health diagnosis.

AI review: Physical injury noun/verb and emotional-hurt verb reviewed. Distinct pronunciation from wind noted; nurse example provides no treatment directions.

Source pointers: oxford-normalized-inventory.json#/records/2839, vocab4600-normalized-inventory.json#/records/1870.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wear:have-on-body

wear / VERB / WORD (all proposals)

Label: have clothing or an accessory on

Definition EN: To have clothes, jewellery or another item on the body.

Meaning VI: mặc, đeo hoặc đội quần áo, trang sức hay vật khác trên người

Example EN: She wore a blue scarf at the outdoor concert.

Example VI: Cô ấy quàng một chiếc khăn xanh ở buổi hòa nhạc ngoài trời.

Grammar/boundary: wear, wore, worn; state of having on, distinct from action put on.

AI review: Having clothing on, not putting it on. Scarf example and wore morphology checked; Vietnamese quàng keeps the worn state in context.

Source pointers: oxford-normalized-inventory.json#/records/567, vocab4600-normalized-inventory.json#/records/309.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:whisper:speak-softly

whisper / VERB / WORD (all proposals)

Label: speak very quietly

Definition EN: To speak very softly so that only someone nearby can hear.

Meaning VI: thì thầm, nói rất khẽ để chỉ người gần đó nghe được

Example EN: He whispered the answer to his teammate.

Example VI: Anh ấy thì thầm câu trả lời cho đồng đội.

Grammar/boundary: whisper something to someone; whisper to someone; no assumption the answer is secret.

AI review: Soft-speech action and utterance/voice noun proposals. Nearby audibility and rain context natural; no claim all whispers are secrets.

Source pointers: oxford-normalized-inventory.json#/records/2995, vocab4600-normalized-inventory.json#/records/1128.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:whisper:soft-voice

whisper / NOUN / WORD (all proposals)

Label: very quiet speech

Definition EN: A very soft voice or something said in that voice.

Meaning VI: giọng nói rất nhỏ hoặc lời nói bằng giọng đó

Example EN: Her whisper was barely audible over the rain.

Example VI: Giọng thì thầm của cô ấy gần như không nghe được giữa tiếng mưa.

Grammar/boundary: Countable; voice/utterance provisionally combined.

AI review: Soft-speech action and utterance/voice noun proposals. Nearby audibility and rain context natural; no claim all whispers are secrets.

Source pointers: oxford-normalized-inventory.json#/records/2995, vocab4600-normalized-inventory.json#/records/1128.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wild:not-domesticated

wild / ADJECTIVE / WORD (all proposals)

Label: living without human control

Definition EN: Living in natural conditions rather than being kept or bred by people.

Meaning VI: hoang dã, sống trong tự nhiên thay vì được con người nuôi giữ

Example EN: Wild rabbits appeared at the edge of the field.

Example VI: Những con thỏ hoang xuất hiện ở rìa cánh đồng.

Grammar/boundary: Animals in this example; no implication of aggression.

AI review: Animal untamed and plant uncultivated proposals may coalesce. Rabbits/flowers contexts match; wild does not automatically mean aggressive.

Source pointers: oxford-normalized-inventory.json#/records/1262, vocab4600-normalized-inventory.json#/records/1869.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wild:not-cultivated

wild / ADJECTIVE / WORD (all proposals)

Label: growing without cultivation

Definition EN: Growing naturally rather than being planted and cared for by people.

Meaning VI: mọc tự nhiên, không được con người trồng và chăm sóc

Example EN: Wild flowers grew beside the old wall.

Example VI: Hoa dại mọc cạnh bức tường cũ.

Grammar/boundary: Plant use; animal/plant source groups may coalesce under non-domesticated meaning.

AI review: Animal untamed and plant uncultivated proposals may coalesce. Rabbits/flowers contexts match; wild does not automatically mean aggressive.

Source pointers: oxford-normalized-inventory.json#/records/1262, vocab4600-normalized-inventory.json#/records/1869.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wrong:incorrect

wrong / ADJECTIVE / WORD (all proposals)

Label: not correct

Definition EN: Not correct or accurate.

Meaning VI: sai hoặc không chính xác

Example EN: The wrong date was printed on the invitation.

Example VI: Ngày sai được in trên giấy mời.

Grammar/boundary: Attributive/predicative adjective; factual correctness, not moral wrongdoing.

AI review: Incorrect adjective, flat adverb, moral act and fault-state adjective reviewed. Spelled wrong remains valid adverb; wrong with construction checked.

Source pointers: oxford-normalized-inventory.json#/records/272.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wrong:incorrectly

wrong / ADVERB / WORD (all proposals)

Label: in an incorrect way

Definition EN: In a way that is not correct.

Meaning VI: một cách sai hoặc không đúng

Example EN: I spelled the street name wrong on the form.

Example VI: Tôi viết sai tên đường trên biểu mẫu.

Grammar/boundary: Flat adverb after spelled; do not mechanically convert to ADJECTIVE.

AI review: Incorrect adjective, flat adverb, moral act and fault-state adjective reviewed. Spelled wrong remains valid adverb; wrong with construction checked.

Source pointers: oxford-normalized-inventory.json#/records/272.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wrong:unjust-act

wrong / NOUN / WORD (all proposals)

Label: an unjust act

Definition EN: An action that unfairly harms someone or violates what is considered right.

Meaning VI: việc làm sai trái gây hại bất công hoặc trái điều được xem là đúng

Example EN: The story ends with an attempt to put right an old wrong.

Example VI: Câu chuyện kết thúc bằng một nỗ lực sửa chữa một điều sai trái từ trước.

Grammar/boundary: Countable a wrong; ethical judgment contextual, not legal finding.

AI review: Incorrect adjective, flat adverb, moral act and fault-state adjective reviewed. Spelled wrong remains valid adverb; wrong with construction checked.

Source pointers: oxford-normalized-inventory.json#/records/272.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:wrong:not-working-properly

wrong / ADJECTIVE / WORD (all proposals)

Label: not as it should be

Definition EN: Not working or happening as it should.

Meaning VI: không ổn hoặc không hoạt động như đáng lẽ phải thế

Example EN: Something is wrong with the kitchen light.

Example VI: Đèn bếp có gì đó không ổn.

Grammar/boundary: wrong with + noun; distinct issue-state use pending boundary review.

AI review: Incorrect adjective, flat adverb, moral act and fault-state adjective reviewed. Spelled wrong remains valid adverb; wrong with construction checked.

Source pointers: oxford-normalized-inventory.json#/records/272.

Oxford ordinals considered: [3]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worker:person-who-works

worker / NOUN / WORD (all proposals)

Label: a person doing a job

Definition EN: A person who does a job or particular work.

Meaning VI: người lao động hoặc người làm một công việc

Example EN: The workers carried the new shelves into the shop.

Example VI: Những người thợ mang các kệ mới vào cửa hàng.

Grammar/boundary: Countable; not restricted to factory jobs or a particular employment contract.

AI review: Job/work person not limited to factories. Carrying shelves is plausible; employment status not inferred.

Source pointers: oxford-normalized-inventory.json#/records/795.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worst:least-good

worst / ADJECTIVE / WORD (all proposals)

Label: least good or most unpleasant

Definition EN: Less good or more unpleasant than all the others being compared.

Meaning VI: tệ nhất hoặc khó chịu nhất trong các đối tượng được so sánh

Example EN: That was the worst storm of the winter.

Example VI: Đó là cơn bão tệ nhất mùa đông.

Grammar/boundary: Superlative of bad; comparison set supplied by of the winter.

AI review: Superlative adjective/adverb and nominal possibility reviewed. Three-team comparison checked; the is not forced before performed worst.

Source pointers: oxford-normalized-inventory.json#/records/1170.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worst:least-well

worst / ADVERB / WORD (all proposals)

Label: least well

Definition EN: In the least successful or satisfactory way among those compared.

Meaning VI: kém nhất trong số các trường hợp được so sánh

Example EN: Of the three teams, ours performed worst.

Example VI: Trong ba đội, đội chúng tôi thi đấu kém nhất.

Grammar/boundary: Superlative of badly; no the before this adverb required.

AI review: Superlative adjective/adverb and nominal possibility reviewed. Three-team comparison checked; the is not forced before performed worst.

Source pointers: oxford-normalized-inventory.json#/records/1170.

Oxford ordinals considered: [1]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:worst:most-bad-things

worst / NOUN / WORD (all proposals)

Label: the most unpleasant possibility

Definition EN: The most serious or unpleasant thing that could happen.

Meaning VI: điều tồi tệ nhất có thể xảy ra

Example EN: They prepared for the worst before the storm arrived.

Example VI: Họ chuẩn bị đối phó với tình huống tồi tệ nhất trước khi bão tới.

Grammar/boundary: the worst as nominal use; representation relative to adjective unresolved.

AI review: Superlative adjective/adverb and nominal possibility reviewed. Three-team comparison checked; the is not forced before performed worst.

Source pointers: oxford-normalized-inventory.json#/records/1170.

Oxford ordinals considered: [2]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:written:in-writing

written / ADJECTIVE / WORD (all proposals)

Label: expressed in writing

Definition EN: Expressed in writing rather than only spoken.

Meaning VI: bằng văn bản, được viết ra chứ không chỉ nói

Example EN: Please send written instructions with the parcel.

Example VI: Hãy gửi hướng dẫn bằng văn bản kèm theo kiện hàng.

Grammar/boundary: Attributive adjective; written also past participle of write in other constructions.

AI review: Writing-versus-speech adjective, not merely any past-tense verb. Parcel instructions context matches; participial relation pending.

Source pointers: oxford-normalized-inventory.json#/records/1761.

Oxford ordinals considered: [0]; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

### EDITORIAL_2H2C:warming (n):becoming-warmer

warming / NOUN / WORD (all proposals)

Label: a rise in warmth

Definition EN: The process of becoming warmer or making something warmer.

Meaning VI: sự nóng lên hoặc quá trình làm một thứ ấm hơn

Example EN: The chart shows the gradual warming of the lake in spring.

Example VI: Biểu đồ cho thấy hồ ấm dần lên vào mùa xuân.

Grammar/boundary: Proposed display warming; (n) is source metadata. General temperature process, no automatic climate-topic classification.

AI review: Annotation removed only in proposed display. Temperature-rise nominal includes causative/inchoative variation; no automatic global-climate topic or history merge.

Source pointers: vocab4600-normalized-inventory.json#/records/4124.

Oxford ordinals considered: []; not approved mappings. Master identityClaim NONE; history/exclusions preserved.

Status REVIEW; owner/identity UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED; GENERATED field provenance. CEFR is evidence only, no classification assigned.

## Verification and next batch

Replay reads frozen keys and persisted authoring, never calls AI or writes with --check. External suite/typecheck/lint/frozen-command results are in docs/ai-progress.md; generator does not assert their PASS.

Next recommendation: keep risk-aware small batches, separate annotation/multiword signals before selection, preserve bilingual coupled review and obtain independent human decisions on boundary/valency/specialist/rights issues. Scale toward remaining 6143-group corpus only with separate authorization; do not repeat inventory or auto-start another batch.

Hybrid 2.2.1 / 87 Lexemes / 100 Senses, release 44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c, tree 51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e unchanged. Legacy 2018/history 75/#11/#284/#295/#849/exclusions are pinned offline, no live verification claimed. Database access/writes NONE; Production UNTOUCHED.
