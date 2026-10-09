# Phase 2H.2H-R3 — checkpoint 04 editorial handoff

142 original bilingual DRAFT Senses from the exact next 100 frozen groups; 12 field overlays and nine full-batch effective reviews. AI QA is author self-review, not owner approval.

Core checkpoint 04: `94166e0c8a0586317a82047c717895ae25968b522fa2a37ca342b1f5da9f7560`.
Parent checkpoint 03: `7f29d6e83de770a5b2825fe9a1bf30dc164736fa2744b993e501a08cf8593b2c`.
Frozen selection: `ed303558ab029cdf24f49ca9226b2910bd4beb79d41b6d1d27edb5f4dfc52076`.

## Actual counts

```json
{
  "aiQa": {
    "PASS": 112,
    "REVIEW": 30
  },
  "cefrEvidenceCoverage": {
    "A1": 17,
    "A2": 11,
    "B1": 20,
    "B2": 21,
    "C1": 19,
    "C2": 17
  },
  "cohortPending": 100,
  "correctionsApplied": 12,
  "correctionsProposed": 12,
  "cumulativeCohortAuthored": 400,
  "frozenSelection": 500,
  "multiSenseGroups": 27,
  "newGroups": 100,
  "newSenses": 142,
  "originalAuthored": 100,
  "posCoverage": {
    "ADJECTIVE": 23,
    "ADVERB": 18,
    "CONJUNCTION": 3,
    "DETERMINER": 1,
    "NOUN": 64,
    "NUMBER": 2,
    "PRONOUN": 1,
    "VERB": 30
  },
  "previousTotalSenses": 1248,
  "remainingCorpusGroups": 5223,
  "sourceCoverage": {
    "ENGLISH_VOCAB_4600": 34,
    "ENGLISH_VOCAB_4600+OXFORD_5000": 40,
    "OXFORD_5000": 26
  },
  "totalCorpusGroups": 920,
  "totalSenses": 1390
}
```

## Bilingual content

report.md shows the first ten actual groups. sense-proposals.json contains every original and effective record. The following later-group examples show important boundaries:

- **discharge — allow a patient to leave**: To officially allow a patient to leave hospital care. / cho xuất viện
  The hospital discharged the patient after arranging a follow-up appointment. / Bệnh viện cho người bệnh xuất viện sau khi thu xếp một cuộc hẹn tái khám.
- **discharge — end military service officially**: To officially allow or require someone to leave military service. / cho xuất ngũ
  The navy discharged the sailor at the end of her service. / Hải quân cho nữ thủy thủ xuất ngũ khi cô kết thúc thời gian phục vụ.
- **discharge — send out a substance**: To release a liquid or gas from a place or container. / xả; thải ra
  The pipe discharges treated water into a storage tank. / Đường ống xả nước đã xử lý vào bể chứa.
- **discharge — carry out a duty**: To carry out a duty or responsibility that you are expected to fulfil. / thực hiện nhiệm vụ hoặc nghĩa vụ
  The treasurer discharged her duties with careful records and regular reports. / Người thủ quỹ thực hiện nhiệm vụ của mình bằng việc ghi chép cẩn thận và báo cáo thường xuyên.
- **discharge — end someone's employment**: To require someone to leave a job or position. / cho thôi việc; miễn nhiệm
  In the story, the company discharged its manager after an investigation. / Trong câu chuyện, công ty cho người quản lý thôi việc sau một cuộc điều tra.
- **double — having two similar parts**: Consisting of two similar parts or providing for two people. / đôi; có hai phần tương tự
  The studio has a double door opening onto the courtyard. / Xưởng có một cửa hai cánh mở ra sân.
- **double — twice the amount before a noun**: Twice as much or as many as a stated or understood amount. / gấp đôi
  The larger pot holds double the amount of water. / Chiếc nồi lớn chứa lượng nước gấp đôi.
- **double — twice an understood amount**: An amount that is twice another amount already understood. / số lượng gấp đôi
  The first box held twelve tools, and the second held double. / Hộp thứ nhất chứa mười hai dụng cụ, còn hộp thứ hai chứa gấp đôi.
- **double — become or make twice as much**: To become twice as large, or make something twice as large. / tăng gấp đôi; làm tăng gấp đôi
  The club doubled its membership after opening a weekend class. / Câu lạc bộ tăng gấp đôi số thành viên sau khi mở một lớp cuối tuần.
- **double — at twice the amount**: At twice the usual or stated amount. / gấp đôi
  Visitors paid double during the special evening session. / Khách trả gấp đôi trong buổi đặc biệt vào tối đó.
- **stricken — badly affected by trouble**: Seriously affected by illness, distress or another harmful event. / bị ảnh hưởng nặng nề; lâm vào đau khổ
  The storm-stricken village received blankets and clean water. / Ngôi làng chịu ảnh hưởng nặng nề của bão nhận được chăn và nước sạch.
- **youth — period of being young**: The part of life when someone is young. / tuổi trẻ; thời trẻ
  In her youth, my grandmother travelled between villages by bicycle. / Thời trẻ, bà tôi đi lại giữa các làng bằng xe đạp.
- **youth — young person**: A boy or a young man. / nam thanh niên; chàng trai trẻ
  A youth from the village helped the visitors find the path. / Một thanh niên trong làng giúp khách tìm lối đi.
- **youth — young people as a group**: Young people considered together as a social group. / giới trẻ; thanh thiếu niên
  The council invited local youth to discuss the new sports centre. / Hội đồng mời giới trẻ địa phương thảo luận về trung tâm thể thao mới.

## QA continuity and trend

Original REVIEW 16/147; checkpoint 02 REVIEW 27/148; checkpoint 03 REVIEW 57/140. Exact prior REVIEW objects and every assessment are preserved separately in qa-history.json, with source-file byte hashes. No prior category or assessment is reinterpreted.
New counts and nonexclusive reason categories: `{'PASS': 112, 'REVIEW': 30}`; `{'FORM': 1, 'GRAMMAR': 3, 'LEXICAL_IDENTITY': 3, 'POLARITY_CONTEXT_SIGNAL': 5, 'POS_CLASSIFICATION': 7, 'SEMANTICS': 1, 'SENSE_BOUNDARY': 2, 'SOURCE_SIMILARITY': 1, 'TRANSLATION': 7}`.
Earlier checkpoints used prose findings rather than comparable category tags. The rates describe these different frozen cohorts and self-review scope; they do not establish statistical confidence or an independently measured improvement. New flags include construction/POS uncertainty, source-similarity/context signals and historical findings whose affected content was corrected. Rights and canonical identity remain unresolved for every Sense.

- `EDITORIAL_2H2H:register:enrol-or-record`: REVIEW; SENSE_BOUNDARY; original finding: REVIEW: [SENSE_BOUNDARY] Enrolment and official-list noun accurately represent source ordinals 0 and 1; for/with/in constructions were checked against accessible Cambridge search text. That text also documents measurement and other noun uses absent from these two source boundaries. Additional scope needs editorial review; this is not an exhaustive register inventory.
- `EDITORIAL_2H2H:register:official-list`: REVIEW; SENSE_BOUNDARY; original finding: REVIEW: [SENSE_BOUNDARY] Enrolment and official-list noun accurately represent source ordinals 0 and 1; for/with/in constructions were checked against accessible Cambridge search text. That text also documents measurement and other noun uses absent from these two source boundaries. Additional scope needs editorial review; this is not an exhaustive register inventory.
- `EDITORIAL_2H2H:war:armed-conflict`: REVIEW; GRAMMAR; original finding: REVIEW: [GRAMMAR] Armed fighting is a single source-supported noun boundary; particular-war versus warfare countability is not artificially split. Translation preserves town and daily-life scope. grammarNotesEn ends with an internal proposal comment, which should be removed by an exact-parent overlay before effective review. Versioned correction refs: 2H2H-R3-C01. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:naturally:as-expected`: REVIEW; POLARITY_CONTEXT_SIGNAL; original finding: PASS: Rain-filled pond illustrates a natural process; sentence-initial Naturally comments on an expected reaction. Vietnamese chưa được mở faithfully renders unopened, even if a polarity heuristic flags it. The grammar does not make natural equal safe; both ordinal boundaries remain separate.
- `EDITORIAL_2H2H:layer:one-level-of-material`: REVIEW; POLARITY_CONTEXT_SIGNAL; original finding: PASS: A dust covering is a countable layer with an of complement. Vietnamese keeps thin and unused shelves; the definition covers above/below layers without requiring a numerical thickness. No geological classification is approved.
- `EDITORIAL_2H2H:rope:thick-strong-cord`: REVIEW; TRANSLATION; original finding: REVIEW: [TRANSLATION] Thick cord and countability guidance are accurate, and the shelter/wind scenario is faithful. examples/0/vi repeats bằng awkwardly in mái trú bằng vải bạt bằng dây thừng; improve that phrasing in a versioned overlay, retaining the material and fixing action. Versioned correction refs: 2H2H-R3-C02. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:yet:up-to-now`: REVIEW; POLARITY_CONTEXT_SIGNAL; original finding: PASS: The timetable question uses present-perfect yet and Vietnamese đã...chưa naturally; a polarity heuristic may flag it but there is no translation negation error. The separate conjunction joins small room with enough comfortable seats. Comma and register notes fit both distinct ordinals.
- `EDITORIAL_2H2H:unemployed:without-a-job`: REVIEW; SEMANTICS; original finding: REVIEW: [SEMANTICS] Factory closure and months without work translate faithfully, but definitionEn's able and available qualifier narrows an everyday adjective to a technical employment-statistics category. Remove that qualifier by overlay; no official statistical definition is being approved. Versioned correction refs: 2H2H-R3-C03. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:exactly:with-full-precision`: REVIEW; TRANSLATION; original finding: REVIEW: [TRANSLATION] Full equality of board lengths is correct, but examples/0/vi ends with bằng nhau chính xác, which is awkward Vietnamese. Use bằng nhau hoàn toàn in an overlay while retaining the exact-equality meaning and both boards. Versioned correction refs: 2H2H-R3-C04. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:reportedly:according-to-reports`: REVIEW; SOURCE_SIMILARITY; original finding: PASS: The reporting adverb explicitly retains uncertainty; Vietnamese theo nguồn tin does not claim independent confirmation. Fictional missing-statue scenario is original. Grammar distinguishes report attribution from proof of truth rather than using reportedly as an assertion of fact.
- `EDITORIAL_2H2H:carriage:railway-passenger-car`: REVIEW; TRANSLATION; original finding: REVIEW: [TRANSLATION] Passenger train and horse-drawn vehicle are separate ordinal boundaries with sensible regional notes. In the horse-vehicle example, Vietnamese nằm cạnh is awkward for a museum display object; replace with được đặt cạnh by overlay, retaining restoration and former owner's photograph.
- `EDITORIAL_2H2H:carriage:horse-drawn-vehicle`: REVIEW; TRANSLATION; original finding: REVIEW: [TRANSLATION] Passenger train and horse-drawn vehicle are separate ordinal boundaries with sensible regional notes. In the horse-vehicle example, Vietnamese nằm cạnh is awkward for a museum display object; replace with được đặt cạnh by overlay, retaining restoration and former owner's photograph. Versioned correction refs: 2H2H-R3-C05. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:bible:christian-scripture`: REVIEW; FORM; original finding: REVIEW: [FORM] Christian sacred collection and physical-copy example are supported without asserting religious claims as history. Kinh Thánh is appropriate. displayFormProposal defaults to lowercase bible in the parser; add a Bible display overlay while preserving the normalized identity and manuscript bytes. Versioned correction refs: 2H2H-R3-C06. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:quite:moderately`: REVIEW; POS_CLASSIFICATION; original finding: REVIEW: [POS_CLASSIFICATION] Both actual adverb meanings are supported by Oxford and accessible Cambridge grammar text: gradable spacious and complete correct. The 4600 source labels quite ADJECTIVE; that conflicting classification remains unresolved rather than adopted. Context/intonation/region affect degree, so no approved CEFR or universal strength is inferred.
- `EDITORIAL_2H2H:quite:completely`: REVIEW; POS_CLASSIFICATION; original finding: REVIEW: [POS_CLASSIFICATION] Both actual adverb meanings are supported by Oxford and accessible Cambridge grammar text: gradable spacious and complete correct. The 4600 source labels quite ADJECTIVE; that conflicting classification remains unresolved rather than adopted. Context/intonation/region affect degree, so no approved CEFR or universal strength is inferred.
- `EDITORIAL_2H2H:freight:transported-goods`: REVIEW; GRAMMAR; original finding: REVIEW: [GRAMMAR] Goods transport and uncountability are accurate, with train timing faithfully translated. grammarNotesEn ends with an internal canonical-identity statement rather than learner usage; replace that sentence with a useful goods/passenger contrast in an overlay. Versioned correction refs: 2H2H-R3-C07. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:double:two-part`: REVIEW; POS_CLASSIFICATION; original finding: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- `EDITORIAL_2H2H:double:twice-quantity-before-noun`: REVIEW; POS_CLASSIFICATION; original finding: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- `EDITORIAL_2H2H:double:twice-quantity-alone`: REVIEW; POS_CLASSIFICATION; original finding: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- `EDITORIAL_2H2H:double:become-twice`: REVIEW; POS_CLASSIFICATION; original finding: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- `EDITORIAL_2H2H:double:pay-twice`: REVIEW; POS_CLASSIFICATION; original finding: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- `EDITORIAL_2H2H:better:higher-quality`: REVIEW; LEXICAL_IDENTITY; original finding: REVIEW: [LEXICAL_IDENTITY] Higher-quality adjective and worked-better adverb accurately represent good/well comparatives. The nominal for the better boundary is source-supported but construction-bound; owner should decide how it relates to good/well and phrase teaching before canonical identity allocation. Vietnamese retains the leadership improvement without fabricating an independent countable noun.
- `EDITORIAL_2H2H:better:more-effectively`: REVIEW; LEXICAL_IDENTITY; original finding: REVIEW: [LEXICAL_IDENTITY] Higher-quality adjective and worked-better adverb accurately represent good/well comparatives. The nominal for the better boundary is source-supported but construction-bound; owner should decide how it relates to good/well and phrase teaching before canonical identity allocation. Vietnamese retains the leadership improvement without fabricating an independent countable noun.
- `EDITORIAL_2H2H:better:improvement`: REVIEW; LEXICAL_IDENTITY; original finding: REVIEW: [LEXICAL_IDENTITY] Higher-quality adjective and worked-better adverb accurately represent good/well comparatives. The nominal for the better boundary is source-supported but construction-bound; owner should decide how it relates to good/well and phrase teaching before canonical identity allocation. Vietnamese retains the leadership improvement without fabricating an independent countable noun.
- `EDITORIAL_2H2H:humid:moist-air`: REVIEW; POLARITY_CONTEXT_SIGNAL; original finding: PASS: Water vapour in air and post-shower example support có độ ẩm cao. Vietnamese không khí, rather than wet ground, preserves the target. Humidity note correctly distinguishes air moisture from a surface being wet.
- `EDITORIAL_2H2H:rust:iron-corrosion-material`: REVIEW; GRAMMAR; original finding: REVIEW: [GRAMMAR] Iron/steel corrosion and hinge example are accurate, with uncountable material expressed as rỉ sét. grammarNotesEn's final separate POS proposal comment belongs to tooling rather than learner content; replace it with a concise verb-usage contrast by overlay. Versioned correction refs: 2H2H-R3-C08. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:stricken:badly-affected`: PASS; ; original finding: PASS: Harmful-event adjective and storm-stricken village match the source English boundary better than its literal hit bruised gloss. Vietnamese retains aid items and severe storm effects. With/by and ordinary struck-versus-adjectival stricken distinguish usage without denying literary variants. Versioned correction refs: 2H2H-R3-C09. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:youth:young-period-of-life`: REVIEW; TRANSLATION; original finding: REVIEW: [TRANSLATION] Life period, countable person and collective young people are genuine noun uses, with countability/register distinguished. The countable example leaves gender unspecified, while examples/0/vi thanh niên can suggest a male; change to người trẻ tuổi in an overlay. Keep human identity/age classification unresolved and do not merge all three uses into one canonical Sense.
- `EDITORIAL_2H2H:youth:young-person`: REVIEW; TRANSLATION; original finding: REVIEW: [TRANSLATION] Life period, countable person and collective young people are genuine noun uses, with countability/register distinguished. The countable example leaves gender unspecified, while examples/0/vi thanh niên can suggest a male; change to người trẻ tuổi in an overlay. Keep human identity/age classification unresolved and do not merge all three uses into one canonical Sense. Versioned correction refs: 2H2H-R3-C10, 2H2H-R3-C11, 2H2H-R3-C12. Read effectiveReReview for the revised finding; the original is historical.
- `EDITORIAL_2H2H:youth:young-people-collectively`: REVIEW; TRANSLATION; original finding: REVIEW: [TRANSLATION] Life period, countable person and collective young people are genuine noun uses, with countability/register distinguished. The countable example leaves gender unspecified, while examples/0/vi thanh niên can suggest a male; change to người trẻ tuổi in an overlay. Keep human identity/age classification unresolved and do not merge all three uses into one canonical Sense.
- `EDITORIAL_2H2H:idle:not-active`: REVIEW; POLARITY_CONTEXT_SIGNAL; original finding: PASS: Unused sewing machine demonstrates temporary inactivity rather than laziness. Vietnamese không hoạt động is correct, with awaited replacement part retained. Stand/remain idle and person/equipment distinction keep value judgment out of the definition.

## Lexical evidence and corrections

Full-page opens for gallon, war, discharge and double returned 403. Only the actual accessible search-returned text/extracts are claimed as evidence. No dictionary expressive wording or examples were copied; no rights clearance is inferred.

- [register](https://dictionary.cambridge.org/dictionary/english/register): Accessible search-returned text supports enrolment for/with and official-list noun; further measurement and other meanings remain out of this source-limited draft.
- [appreciate](https://dictionary.cambridge.org/us/dictionary/english/appreciate): Accessible search-returned text supports value/gratitude and understanding constructions including noun, -ing, that and how; no financial sense authored.
- [gallon](https://dictionary.cambridge.org/dictionary/english/gallon): Accessible search-returned text distinguishes US and imperial volume units. No exact conversion is copied into the draft.
- [discharge](https://dictionary.cambridge.org/dictionary/english/discharge): Accessible search-returned text corroborates hospital/service release, substance output, formal duty performance and employment dismissal. No legal procedure is advised.
- [quite](https://dictionary.cambridge.org/dictionary/english/quite): Accessible search-returned grammar distinguishes moderate degree and completeness, with context and variety qualifications. Source adjective conflict remains unapproved.
- [double](https://www.oxfordlearnersdictionaries.com/definition/english/double_1): Accessible search extract confirms two similar parts/two-person adjective. Published Oxford wordlist search extracts list det/pron/verb and separate adverb; detailed unseen entries are not claimed as read.
- [dynamics](https://dictionary.cambridge.org/us/dictionary/english/dynamics): Accessible search-returned text separates plural forces producing group change from the science of motion. Vietnamese avoids động năng.
- [federation](https://dictionary.cambridge.org/us/dictionary/english/federation?topic=international-politics-and-government): Accessible search-returned text supports unions of organizations and states; examples here are original clubs and a fictional polity.
- [youth](https://dictionary.cambridge.org/us/dictionary/english/youth): Accessible search-returned text supports countable boy/young man, gender-inclusive collective youth and period of life; countable definition/gloss/grammar corrected, initial finding retained as superseded.
- [stricken](https://dictionary.cambridge.org/us/dictionary/english/stricken): Accessible search-returned text supports severe harmful effects and literary register; grammar overlay adds that register.

The initial youth review proposed gender-neutral Vietnamese. Later accessible lexical evidence established the countable male boundary, superseding that recommendation. The original finding is retained; three field overlays align definition, gloss and grammar. Collective youth stays inclusive.

## Preservation and validation

All prior 1,248 exact records, checkpoints 01–03, DRAFT V2 corrections, prior QA/human ledgers and Hybrid 2.2.1 87 Lexemes/100 Senses remain pinned. Generic continuation and checkpoint-03 handoff source remain byte-identical. The sole prior source exception removes an obsolete absence assertion from a regression test while retaining its real before/after zero-write comparison.
External tests/typecheck/lint/replays are recorded only after execution in verification-results.json. The assembler does not run those external checks. All records remain DRAFT, UNKNOWN_REVIEW_REQUIRED; owner approvals/canonical IDs added zero. No runtime, database, legacy or Production operations.

## Exact next resume instructions

After separate Phase 2H.2H-R4 authorization: `python -B scripts/phase-2h2h-bulk-500-resume.py --prepare --checkpoint 5`; use that persisted receipt, then author/review/seal batches 081–100. Do not reselect or modify checkpoints 01–04. This run does not prepare checkpoint 05.

Remaining 100 keys in frozen order:

- `NORMALIZED_HEADWORD:starch`
- `NORMALIZED_HEADWORD:yes`
- `NORMALIZED_HEADWORD:considerably`
- `NORMALIZED_HEADWORD:handbook`
- `NORMALIZED_HEADWORD:lot`
- `NORMALIZED_HEADWORD:offense`
- `NORMALIZED_HEADWORD:turbine`
- `NORMALIZED_HEADWORD:whatsoever`
- `NORMALIZED_HEADWORD:all`
- `NORMALIZED_HEADWORD:harmonize`
- `NORMALIZED_HEADWORD:intrigue`
- `NORMALIZED_HEADWORD:pessimistic`
- `NORMALIZED_HEADWORD:stubborn`
- `NORMALIZED_HEADWORD:wash`
- `NORMALIZED_HEADWORD:down`
- `NORMALIZED_HEADWORD:exit`
- `NORMALIZED_HEADWORD:mist`
- `NORMALIZED_HEADWORD:raisin`
- `NORMALIZED_HEADWORD:ton`
- `NORMALIZED_HEADWORD:wicked`
- `NORMALIZED_HEADWORD:around`
- `NORMALIZED_HEADWORD:harness`
- `NORMALIZED_HEADWORD:laundry`
- `NORMALIZED_HEADWORD:outlaw`
- `NORMALIZED_HEADWORD:shake`
- `NORMALIZED_HEADWORD:woman`
- `NORMALIZED_HEADWORD:class`
- `NORMALIZED_HEADWORD:fond`
- `NORMALIZED_HEADWORD:irritate`
- `NORMALIZED_HEADWORD:not`
- `NORMALIZED_HEADWORD:since`
- `NORMALIZED_HEADWORD:whatever`
- `NORMALIZED_HEADWORD:commonly`
- `NORMALIZED_HEADWORD:fiery`
- `NORMALIZED_HEADWORD:junior`
- `NORMALIZED_HEADWORD:namely`
- `NORMALIZED_HEADWORD:temporarily`
- `NORMALIZED_HEADWORD:wisdom`
- `NORMALIZED_HEADWORD:downtown`
- `NORMALIZED_HEADWORD:highway`
- `NORMALIZED_HEADWORD:more`
- `NORMALIZED_HEADWORD:pedestrian`
- `NORMALIZED_HEADWORD:somewhat`
- `NORMALIZED_HEADWORD:wildlife`
- `NORMALIZED_HEADWORD:dog`
- `NORMALIZED_HEADWORD:hygiene`
- `NORMALIZED_HEADWORD:magnet`
- `NORMALIZED_HEADWORD:o’clock`
- `NORMALIZED_HEADWORD:upwards`
- `NORMALIZED_HEADWORD:will`
- `NORMALIZED_HEADWORD:continent`
- `NORMALIZED_HEADWORD:eat`
- `NORMALIZED_HEADWORD:lightly`
- `NORMALIZED_HEADWORD:potentially`
- `NORMALIZED_HEADWORD:unfortunately`
- `NORMALIZED_HEADWORD:win`
- `NORMALIZED_HEADWORD:content`
- `NORMALIZED_HEADWORD:fridge`
- `NORMALIZED_HEADWORD:instrumental`
- `NORMALIZED_HEADWORD:nowadays`
- `NORMALIZED_HEADWORD:up`
- `NORMALIZED_HEADWORD:wage`
- `NORMALIZED_HEADWORD:carrot`
- `NORMALIZED_HEADWORD:fast`
- `NORMALIZED_HEADWORD:kin`
- `NORMALIZED_HEADWORD:normally`
- `NORMALIZED_HEADWORD:south`
- `NORMALIZED_HEADWORD:weave`
- `NORMALIZED_HEADWORD:cookie`
- `NORMALIZED_HEADWORD:forward`
- `NORMALIZED_HEADWORD:intermittent`
- `NORMALIZED_HEADWORD:nearby`
- `NORMALIZED_HEADWORD:shift`
- `NORMALIZED_HEADWORD:withdrawal`
- `NORMALIZED_HEADWORD:chest`
- `NORMALIZED_HEADWORD:guilty`
- `NORMALIZED_HEADWORD:million`
- `NORMALIZED_HEADWORD:portion`
- `NORMALIZED_HEADWORD:sentence`
- `NORMALIZED_HEADWORD:worthwhile`
- `NORMALIZED_HEADWORD:morning`
- `NORMALIZED_HEADWORD:rock`
- `NORMALIZED_HEADWORD:today`
- `NORMALIZED_HEADWORD:writer`
- `NORMALIZED_HEADWORD:kitchen`
- `NORMALIZED_HEADWORD:principal`
- `NORMALIZED_HEADWORD:thus`
- `NORMALIZED_HEADWORD:watch`
- `NORMALIZED_HEADWORD:might`
- `NORMALIZED_HEADWORD:new`
- `NORMALIZED_HEADWORD:unlike`
- `NORMALIZED_HEADWORD:wizard`
- `NORMALIZED_HEADWORD:instant`
- `NORMALIZED_HEADWORD:pound`
- `NORMALIZED_HEADWORD:stall`
- `NORMALIZED_HEADWORD:warp`
- `NORMALIZED_HEADWORD:including`
- `NORMALIZED_HEADWORD:noble`
- `NORMALIZED_HEADWORD:therefore`
- `NORMALIZED_HEADWORD:want`
