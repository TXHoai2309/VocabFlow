# Phase 2H.2B-QA1 - editorial corrections

EDITORIAL CORRECTIONS PROPOSED - OWNER REVIEW PENDING. No human approval, canonical identity, rights clearance or materialization.

Remote parent: `8eca81e84d896fd0449aed04ce646465d4dd4b9b`. Original input: `a42e4c25cebdf98cdd24f9e9231be81fff36bbdd571496eeff2886b4d1f1bdad`. Correction fingerprint: `b75b0522e64db5d61cff4adbccd2fb553c72f5d475d6e4370b2075e656b6a40d`.

The two independent review files were not located in the workspace/task attachments. Intake uses the complete 22 findings in the preserved user request, Section 5; no unavailable review file or full independent review was claimed as loaded. AI assistant examined exact original keys and sibling context, persisted proposals once, and assembled a read-only original + overlay preview. Five original PSV files, original artifacts and fingerprint are unchanged.

## Accounting and limitations

```json
{
  "totalFindings": 22,
  "reviseFindingsResolvedAsProposals": 17,
  "identityFindingsReviewed": 4,
  "falsePositivesRejected": 1,
  "dispositions": {
    "ACCEPT_CORRECTION_PROPOSAL": 13,
    "MODIFY_CORRECTION_PROPOSAL": 4,
    "DEFER_IDENTITY_DECISION": 4,
    "REJECT_FINDING_WITH_REASON": 1
  },
  "senseKeysPreserved": 155,
  "pilotGroupsPreserved": 100,
  "multiSenseGroups": 37,
  "correctedPreviewCount": 155,
  "textRevisedDrafts": 17,
  "textUnchangedDrafts": 138,
  "triageRetainedWithoutRevision": 134,
  "identityCaseDraftsRetained": 4,
  "englishDefinitionsUpdated": 9,
  "englishExamplesUpdated": 4,
  "vietnameseMeaningsUpdated": 12,
  "vietnameseExampleTranslationsUpdated": 6,
  "posProposalsUpdated": 1,
  "identityDecisionsPending": 155,
  "explicitIdentityIssueRecords": 15,
  "ownerApproved": 0,
  "canonicalIdsAllocated": 0,
  "qualityCounts": {
    "REVIEW": 155
  },
  "sourceSimilaritySignals": 0
}
```

17 drafts change in preview, 4 identity-case drafts retain text, and 134 other drafts are retained, including attorney. All 155 are REVIEW, not approved. No Sense key, group or permanent identity changes. CEFR evidence is unchanged and re-evaluation pending for corrected meanings/POS. Existing Master comparisons are pinned original evidence, not revalidated identity proof. No raw APKG prose/media is copied into this correction report.

## Side-by-side content proposals - 17 findings

### Finding 1 - EDITORIAL_2H2B:a, an:indefinite

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: DETERMINER
- Sense label: one unspecified thing
- Definition EN: Used before a singular countable noun when the listener does not yet know which person or thing is meant.
- Meaning VI: một đối tượng chưa được xác định cụ thể
- Example EN: I found an envelope under a chair.
- Example VI: Tôi tìm thấy một phong bì dưới một chiếc ghế.

**AFTER (PROPOSED)**

- POS: DETERMINER
- Sense label: the indefinite article
- Definition EN: Used with a singular countable noun to introduce someone or something, or to describe a member of a class without identifying a particular one.
- Meaning VI: mạo từ không xác định dùng trước danh từ đếm được số ít; có thể biểu đạt ý một người hoặc một vật nhưng không phải lúc nào cũng cần dịch thành một
- Example EN: I found an envelope under a chair.
- Example VI: Tôi tìm thấy một phong bì dưới một chiếc ghế.

Changed fields: `/content/senseLabelEn`, `/content/definitionEn`, `/content/meaningVi`.

Semantic reason: The original Vietnamese wording describes an object instead of the grammatical article and the definition overrestricts use to listener ignorance. Retain the existing example, which illustrates indefinite introduction.

Grammar / representation: DETERMINER is a valid local POS. Propose a as the lexical form with an as a sound-conditioned variant, but defer canonical lemma/alias identity; a, an remains only the source grouping key.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: ARTICLE_LEMMA_AND_ALIAS_REVIEW, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

### Finding 2 - EDITORIAL_2H2B:abortion:end-pregnancy

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: ending a pregnancy
- Definition EN: The ending of a pregnancy before a baby is born, especially through a medical procedure.
- Meaning VI: việc chấm dứt thai kỳ trước khi em bé được sinh ra, thường bằng can thiệp y tế
- Example EN: The report discussed access to abortion services.
- Example VI: Báo cáo bàn về khả năng tiếp cận dịch vụ phá thai.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: deliberately ending a pregnancy
- Definition EN: The deliberate ending of a pregnancy through medical care before birth.
- Meaning VI: việc chủ động chấm dứt thai kỳ bằng chăm sóc hoặc can thiệp y tế trước khi sinh
- Example EN: The report discussed access to abortion services.
- Example VI: Báo cáo bàn về khả năng tiếp cận dịch vụ phá thai.

Changed fields: `/content/senseLabelEn`, `/content/definitionEn`, `/content/meaningVi`, `/content/grammarNotesEn`.

Semantic reason: Distinguish the intended induced termination sense from any ending of pregnancy. The original services example and translation remain aligned with that scope.

Grammar / representation: NOUN remains appropriate; no new meaning identity is approved.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: MEDICAL_TERMINOLOGY_SCOPE_REVIEW, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: This proposal concerns induced abortion, not spontaneous pregnancy loss. Medical terminology, audience suitability and scope require subject review; no treatment or jurisdictional advice is offered.

Verification: [NHS describes termination of pregnancy and medicine/surgery; supports intended scope, not a license to copy or medical approval.](https://www.nhs.uk/tests-and-treatments/abortion/what-is/). No text-reuse license inferred.

### Finding 3 - EDITORIAL_2H2B:about:approximately

Disposition: MODIFY_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: PREPOSITION
- Sense label: approximately
- Definition EN: A little more or less than the stated number or amount.
- Meaning VI: khoảng một số lượng được nêu ra
- Example EN: The journey took about forty minutes.
- Example VI: Chuyến đi mất khoảng bốn mươi phút.

**AFTER (PROPOSED)**

- POS: ADVERB
- Sense label: approximately
- Definition EN: A little more or less than the stated number or amount.
- Meaning VI: khoảng một số lượng được nêu ra
- Example EN: The journey took about forty minutes.
- Example VI: Chuyến đi mất khoảng bốn mươi phút.

Changed fields: `/partOfSpeechProposal`, `/content/grammarNotesEn`.

Semantic reason: The forty-minutes example expresses approximation, not topic. Propose ADVERB for evaluation but do not present the source PREPOSITION analysis as universally wrong.

Grammar / representation: Cambridge's learner dictionary excerpt tags approximation as adverb, while its grammar blog calls about before quantities a preposition. The valid schema offers both enums; the analysis convention remains unresolved.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: POS_FRAMEWORK_DECISION, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: Proposed learner-dictionary ADVERB analysis before an approximate quantity or time. Some grammar frameworks treat this construction as PREPOSITION; owner must select the POS convention. Keep the topic preposition and spatial adverb proposals distinct.

Verification: [Cambridge learner dictionary excerpt has an approximation adverb entry; search excerpt inspected, full dictionary URL returned 403.](https://beckassets.blob.core.windows.net/product/readingsample/12002961/9780521712668_excerpt_001.pdf). No text-reuse license inferred.

Verification: [Cambridge publisher grammar discussion treats about/around before quantities as prepositions; preserve disagreement rather than approve a universal correction.](https://dictionaryblog.cambridge.org/2022/11/02/at-a-rough-guess-talking-about-approximate-numbers-and-amounts/). No text-reuse license inferred.

### Finding 4 - EDITORIAL_2H2B:able:competent

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: ADJECTIVE
- Sense label: competent and skilful
- Definition EN: Good at doing the work or tasks expected of you.
- Meaning VI: có năng lực và làm việc thành thạo
- Example EN: An able assistant kept the busy office organized.
- Example VI: Một trợ lý có năng lực đã giữ cho văn phòng bận rộn hoạt động ngăn nắp.

**AFTER (PROPOSED)**

- POS: ADJECTIVE
- Sense label: competent and skilful
- Definition EN: Good at doing the work or tasks expected of you.
- Meaning VI: có năng lực và làm việc thành thạo
- Example EN: An able assistant kept the busy office organized.
- Example VI: Một trợ lý có năng lực giúp mọi việc trong văn phòng bận rộn diễn ra có tổ chức.

Changed fields: `/content/examples/0/vi`.

Semantic reason: Replace the awkward Vietnamese kept-office-organized construction with natural wording preserving the assistant's competence and organizational effect. English text and other able Sense remain unchanged.

Grammar / representation: Attributive able modifies assistant; translation preserves that attribution.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

### Finding 5 - EDITORIAL_2H2B:acquire:gain

Disposition: MODIFY_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: VERB
- Sense label: gain over time
- Definition EN: To come to have a skill, quality or possession through learning or experience.
- Meaning VI: có được một kỹ năng, phẩm chất hoặc tài sản qua học hỏi hay trải nghiệm
- Example EN: Children acquire new vocabulary through repeated use.
- Example VI: Trẻ em tiếp thu từ vựng mới thông qua việc sử dụng nhiều lần.

**AFTER (PROPOSED)**

- POS: VERB
- Sense label: gain over time
- Definition EN: To come to have something, such as a possession, a skill or a quality.
- Meaning VI: có được một thứ, chẳng hạn tài sản, kỹ năng hoặc phẩm chất
- Example EN: Children acquire new vocabulary through repeated use.
- Example VI: Trẻ em tiếp thu từ vựng mới thông qua việc sử dụng nhiều lần.

Changed fields: `/content/definitionEn`, `/content/meaningVi`, `/content/grammarNotesEn`.

Semantic reason: Choose broad acquisition instead of inventing extra Senses. The existing vocabulary-learning example remains a valid subtype; specialized business purchase may be a usage specialization rather than a separate identity.

Grammar / representation: Keep VERB and direct object; remove the restrictive learning/experience condition on possessions.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: GENERAL_VERSUS_BUSINESS_ACQUISITION_BOUNDARY, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: Transitive acquisition may occur through learning, purchase or other means. This broad proposal overlaps the narrower business-purchase sibling; review general versus specialized usage boundaries, without executing a split or merge.

### Finding 6 - EDITORIAL_2H2B:act:behave

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: VERB
- Sense label: do something or behave
- Definition EN: To take action or behave in a particular way.
- Meaning VI: hành động hoặc cư xử theo một cách
- Example EN: We must act quickly before the rain reaches the equipment.
- Example VI: Chúng ta phải hành động nhanh trước khi mưa làm ướt thiết bị.

**AFTER (PROPOSED)**

- POS: VERB
- Sense label: take action
- Definition EN: To do something in response to a situation or to achieve a result.
- Meaning VI: hành động để ứng phó với tình huống hoặc đạt một kết quả
- Example EN: We must act quickly before the rain reaches the equipment.
- Example VI: Chúng ta phải hành động nhanh trước khi mưa làm ướt thiết bị.

Changed fields: `/content/senseLabelEn`, `/content/definitionEn`, `/content/meaningVi`, `/content/grammarNotesEn`.

Semantic reason: The existing rain/equipment example demonstrates taking action, not manner of behaving. Align all meaning fields without combining the two readings.

Grammar / representation: VERB remains intransitive in act quickly; acting-in-a-performance and deed siblings stay separate.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: TAKE_ACTION_VERSUS_BEHAVE_SCOPE, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: Intransitive act with a manner adverb, as in act quickly. This response-to-a-situation proposal does not also define behave; the editorial key is retained as an immutable local reference despite its older slug.

### Finding 7 - EDITORIAL_2H2B:action:movement

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: movement or activity
- Definition EN: Movement or activity, especially when something is happening rather than resting.
- Meaning VI: sự chuyển động hoặc hoạt động khi điều gì đó đang diễn ra
- Example EN: The photographer captured the dancers in action.
- Example VI: Nhiếp ảnh gia chụp được các vũ công đang biểu diễn.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: activity in progress
- Definition EN: The activity of someone or something while doing what they normally do.
- Meaning VI: hoạt động của người hoặc vật khi đang thực hiện công việc hay chức năng của mình
- Example EN: The photographer captured the dancers in action.
- Example VI: Nhiếp ảnh gia chụp được các vũ công đang biểu diễn.

Changed fields: `/content/senseLabelEn`, `/content/definitionEn`, `/content/meaningVi`, `/content/grammarNotesEn`.

Semantic reason: The photographer's dancers in action illustrates active performance. Narrow the proposed reading to the in-action pattern, not arbitrary physical motion.

Grammar / representation: NOUN inside the prepositional phrase in action; phrase behavior remains a usage consideration.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: IN_ACTION_CONSTRUCTION_VERSUS_SENSE, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: The pattern in action shows someone or something actively at work. The dancing example includes movement but the proposed meaning is broader activity in progress; distinguish from steps taken to address a problem.

### Finding 8 - EDITORIAL_2H2B:acute:perceptive

Disposition: MODIFY_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: ADJECTIVE
- Sense label: keenly perceptive
- Definition EN: Able to notice or understand small details very clearly.
- Meaning VI: nhạy bén trong việc nhận ra hoặc hiểu những chi tiết nhỏ
- Example EN: Her acute observation revealed a small error in the chart.
- Example VI: Sự quan sát nhạy bén của cô ấy giúp phát hiện một lỗi nhỏ trong biểu đồ.

**AFTER (PROPOSED)**

- POS: ADJECTIVE
- Sense label: highly sensitive perception
- Definition EN: Highly sensitive to small differences or details that others may miss.
- Meaning VI: nhạy bén với những khác biệt hoặc chi tiết nhỏ mà người khác có thể bỏ qua
- Example EN: The dog has an acute sense of smell and noticed the food inside the closed bag.
- Example VI: Con chó có khứu giác nhạy bén và phát hiện thức ăn bên trong chiếc túi đóng kín.

Changed fields: `/content/senseLabelEn`, `/content/definitionEn`, `/content/meaningVi`, `/content/examples/0/en`, `/content/examples/0/vi`, `/content/grammarNotesEn`.

Semantic reason: Use the natural sense-of-smell collocation, but explicitly narrow the former notice/understand wording toward sensitive perception instead of treating sensory and intellectual meanings as proven identical.

Grammar / representation: Attributive ADJECTIVE modifies sense, not the dog directly; both sentences express detecting concealed food.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: SENSORY_VERSUS_INTELLECTUAL_PERCEPTION, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: acute sense of smell or acute hearing; this sensory-perception proposal needs boundary review against intellectual perceptiveness. Existing medical-onset and severity proposals remain separate.

### Finding 9 - EDITORIAL_2H2B:age:grow-older

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: VERB
- Sense label: grow older
- Definition EN: To become older or show changes associated with getting older.
- Meaning VI: trở nên già hơn hoặc thay đổi theo tuổi tác
- Example EN: The trees aged slowly in the sheltered valley.
- Example VI: Những cây ấy già đi chậm rãi trong thung lũng được che chắn.

**AFTER (PROPOSED)**

- POS: VERB
- Sense label: grow older
- Definition EN: To become older or show changes associated with getting older.
- Meaning VI: trở nên già hơn hoặc thay đổi theo tuổi tác
- Example EN: As my grandparents aged, they chose a home with fewer stairs.
- Example VI: Khi ông bà tôi lớn tuổi hơn, họ chọn một ngôi nhà có ít cầu thang hơn.

Changed fields: `/content/examples/0/en`, `/content/examples/0/vi`.

Semantic reason: Human subjects and a practical change naturally illustrate growing older; replace the awkward trees-aged-slowly example. Preserve age noun siblings.

Grammar / representation: Intransitive past-tense aged; Vietnamese preserves the participants, temporal link and choice, without inventing a health claim.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

### Finding 10 - EDITORIAL_2H2B:arm:weapons

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: weapons
- Definition EN: Weapons, especially when considered as military equipment.
- Meaning VI: vũ khí, nhất là trang bị quân sự
- Example EN: The agreement restricted the sale of arms.
- Example VI: Thỏa thuận hạn chế việc bán vũ khí.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: weapons, in the plural arms
- Definition EN: Weapons, especially when considered as military equipment.
- Meaning VI: vũ khí; nghĩa này dùng dạng số nhiều arms
- Example EN: The agreement restricted the sale of arms.
- Example VI: Thỏa thuận hạn chế việc bán vũ khí.

Changed fields: `/content/senseLabelEn`, `/content/meaningVi`, `/content/grammarNotesEn`.

Semantic reason: The original arms example is valid but the singular source grouping can mislead learners. Make plural-only weapons usage explicit without changing group keys or canonical lemmas.

Grammar / representation: NOUN remains valid; lexical identity and form/alias treatment remain unresolved.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: PLURAL_ARMS_LEXICAL_IDENTITY, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: Weapons usage is plural arms, as in the sale of arms; do not teach a singular arm as one weapon in this reading. Owner must decide whether arms needs a separate lexical form or a reviewed form relationship to arm. Body-part noun and provide-weapons verb are not merged.

### Finding 11 - EDITORIAL_2H2B:bad:spoiled-food

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: ADJECTIVE
- Sense label: spoiled
- Definition EN: No longer fresh or suitable to eat.
- Meaning VI: bị hỏng hoặc không còn phù hợp để ăn
- Example EN: The milk smelled bad, so we did not use it.
- Example VI: Sữa có mùi hỏng nên chúng tôi không dùng.

**AFTER (PROPOSED)**

- POS: ADJECTIVE
- Sense label: spoiled
- Definition EN: No longer fresh or suitable to eat.
- Meaning VI: bị hỏng hoặc không còn phù hợp để ăn
- Example EN: The milk had gone bad, so we threw it away without drinking it.
- Example VI: Sữa đã bị hỏng nên chúng tôi đổ bỏ mà không uống.

Changed fields: `/content/examples/0/en`, `/content/examples/0/vi`.

Semantic reason: Had gone bad asserts spoilage rather than relying on an unpleasant smell. English/Vietnamese share the spoilage and disposal sequence; no safety test is claimed.

Grammar / representation: Predicative ADJECTIVE after go, with past perfect marking the prior spoilage; keep general poor-quality sibling separate.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

### Finding 12 - EDITORIAL_2H2B:block:street-section

Disposition: MODIFY_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: a section of streets
- Definition EN: A section of a town bounded by streets, or the distance along one side of it.
- Meaning VI: khu phố được bao quanh bởi các đường hoặc quãng đường dọc một cạnh của khu đó
- Example EN: The library is two blocks from the station.
- Example VI: Thư viện cách nhà ga hai dãy phố.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: a city-street distance
- Definition EN: The distance along a city street from one intersecting street to the next.
- Meaning VI: quãng đường dọc một phố từ chỗ giao với một đường đến chỗ giao tiếp theo
- Example EN: The library is two blocks from the station.
- Example VI: Thư viện cách nhà ga hai đoạn phố, mỗi đoạn tính từ một giao lộ đến giao lộ tiếp theo.

Changed fields: `/content/senseLabelEn`, `/content/definitionEn`, `/content/meaningVi`, `/content/examples/0/vi`, `/content/grammarNotesEn`.

Semantic reason: Choose the distance reading already realized by two blocks from the station. Avoid preserving the original combined area-or-distance definition; record the area interpretation as an unresolved future split possibility.

Grammar / representation: Countable NOUN used as a distance measure; Vietnamese preserves two units and identifies how a block is measured.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: CITY_BLOCK_AREA_VERSUS_DISTANCE, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Proposed usage note: Two blocks from a place describes street distance, not the enclosed area of a city block. Block lengths vary; owner may later propose a separate area Sense if supported. This overlay creates no new Sense.

### Finding 13 - EDITORIAL_2H2B:bread:baked-food

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: a baked staple food
- Definition EN: Food made by baking dough, often sliced or divided into rolls.
- Meaning VI: bánh mì, thực phẩm làm bằng cách nướng bột nhào
- Example EN: We bought fresh bread for the family breakfast.
- Example VI: Chúng tôi mua bánh mì mới cho bữa sáng của gia đình.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: a baked staple food
- Definition EN: A staple food made from flour mixed with water and other ingredients, usually baked as loaves or rolls.
- Meaning VI: bánh mì, thực phẩm làm từ bột trộn với nước và các nguyên liệu khác, thường được nướng thành ổ hoặc bánh nhỏ
- Example EN: We bought fresh bread for the family breakfast.
- Example VI: Chúng tôi mua bánh mì mới cho bữa sáng của gia đình.

Changed fields: `/content/definitionEn`, `/content/meaningVi`.

Semantic reason: Specify the flour/water staple and familiar forms so the definition does not identify every baked-dough food as bread. Usually leaves room for other preparation traditions.

Grammar / representation: Usually uncountable food noun; the original fresh-bread example and translation remain aligned, not an approved cultural taxonomy.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

### Finding 14 - EDITORIAL_2H2B:carbon dioxide:gas

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: a carbon-and-oxygen gas
- Definition EN: A gas made of carbon and oxygen that is released in breathing and many burning processes.
- Meaning VI: khí cacbon đioxit gồm cacbon và oxy, được thải ra khi hô hấp và trong nhiều quá trình đốt cháy
- Example EN: The class discussed how plants use carbon dioxide.
- Example VI: Cả lớp thảo luận về cách thực vật sử dụng khí cacbon đioxit.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: a carbon-and-oxygen gas
- Definition EN: A gas whose molecules each contain one carbon atom joined to two oxygen atoms.
- Meaning VI: khí cacbon đioxit (CO₂), mỗi phân tử gồm một nguyên tử cacbon liên kết với hai nguyên tử oxy
- Example EN: The class discussed how plants use carbon dioxide.
- Example VI: Cả lớp thảo luận về cách thực vật sử dụng khí cacbon đioxit.

Changed fields: `/content/definitionEn`, `/content/meaningVi`.

Semantic reason: State molecular composition rather than an imprecise made-of-elements description. The original plant-use example remains in scope; wider scientific teaching still needs subject review.

Grammar / representation: Uncountable compound NOUN; no CEFR or exam suitability inferred.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: SCIENCE_SUBJECT_REVIEW, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

Verification: [PubChem search result identifies molecular formula CO2; full-page access showed a browser challenge. Formula verifies atom counts, not editorial approval or rights.](https://pubchem.ncbi.nlm.nih.gov/compound/carbon_dioxide). No text-reuse license inferred.

### Finding 15 - EDITORIAL_2H2B:coral reef:marine-formation

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: a coral-built marine structure
- Definition EN: A ridge or larger structure in the sea built mainly from the hard material produced by corals.
- Meaning VI: rạn trong biển được tạo nên chủ yếu từ phần vật liệu cứng do san hô tạo ra
- Example EN: Divers observed small fish sheltering in the coral reef.
- Example VI: Những người lặn quan sát cá nhỏ trú trong rạn san hô.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: a coral-built marine structure
- Definition EN: A ridge or larger structure in the sea built mainly from the hard material produced by corals.
- Meaning VI: rạn san hô, cấu trúc trong biển hình thành chủ yếu từ phần vật liệu cứng do san hô tạo ra
- Example EN: Divers observed small fish sheltering in the coral reef.
- Example VI: Những người lặn quan sát cá nhỏ trú trong rạn san hô.

Changed fields: `/content/meaningVi`.

Semantic reason: Lead with the recognizable lexical equivalent instead of a bare descriptive ran. Existing EN definition and paired diving example remain aligned.

Grammar / representation: Countable compound NOUN; explanation does not claim each coral animal is itself a reef.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

### Finding 16 - EDITORIAL_2H2B:cosmopolitan city:diverse-city

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: a culturally diverse city
- Definition EN: A city where people from many countries and cultural backgrounds live or meet.
- Meaning VI: thành phố nơi nhiều cộng đồng từ các quốc gia và nền văn hóa khác nhau sinh sống hoặc gặp gỡ
- Example EN: The port developed into a cosmopolitan city over many years.
- Example VI: Qua nhiều năm, thành phố cảng phát triển thành một đô thị có nhiều cộng đồng văn hóa khác nhau.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: a culturally diverse city
- Definition EN: A city where people from many countries and cultural backgrounds live or meet.
- Meaning VI: thành phố đa văn hóa, nơi người từ nhiều quốc gia và nền văn hóa sinh sống hoặc gặp gỡ
- Example EN: The port developed into a cosmopolitan city over many years.
- Example VI: Qua nhiều năm, thành phố cảng phát triển thành một đô thị có nhiều cộng đồng văn hóa khác nhau.

Changed fields: `/content/meaningVi`.

Semantic reason: Lead with a clear Vietnamese equivalent; keep the more extensive description subordinate. The original port-city example translation already conveys cultural diversity.

Grammar / representation: Compositional noun phrase; owner must still decide whether it warrants a Lexeme rather than a construction/example.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: COMPOSITIONAL_PHRASE_LEXEME_REVIEW, Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

### Finding 17 - EDITORIAL_2H2B:fossil fuel:ancient-organic-fuel

Disposition: ACCEPT_CORRECTION_PROPOSAL. Owner decision: UNRESOLVED.

**BEFORE**

- POS: NOUN
- Sense label: fuel from ancient organic matter
- Definition EN: A fuel such as coal, oil or natural gas formed from ancient organic material.
- Meaning VI: nhiên liệu như than đá, dầu mỏ hoặc khí tự nhiên hình thành từ vật chất hữu cơ cổ
- Example EN: The factory is reducing its use of fossil fuel.
- Example VI: Nhà máy đang giảm việc sử dụng nhiên liệu hóa thạch.

**AFTER (PROPOSED)**

- POS: NOUN
- Sense label: fuel from ancient organic matter
- Definition EN: A fuel such as coal, oil or natural gas formed from ancient organic material.
- Meaning VI: nhiên liệu như than đá, dầu mỏ hoặc khí tự nhiên hình thành từ vật chất hữu cơ cổ
- Example EN: The factory is reducing its dependence on fossil fuels.
- Example VI: Nhà máy đang giảm sự phụ thuộc vào nhiên liệu hóa thạch.

Changed fields: `/content/examples/0/en`, `/content/examples/0/vi`.

Semantic reason: General fossil-fuel categories naturally take the plural in this example. Dependence/use context changes are mirrored in Vietnamese; base source lemma remains fossil fuel.

Grammar / representation: Plural fossil fuels is an inflected example form, not a new Lexeme or an automatic identity change.

Translation/example impact: All six POS/label/definition/meaning/example-pair fields re-evaluated together by AI; changed pairs listed in overlay; human equivalence/naturalness verification pending

Other Senses: Sibling keys/content untouched; boundary effects remain explicit blockers

Remaining risks: Human linguistic verification, Lexeme/Sense identity, Sense-specific CEFR, Rights and publication permission. AI reviewer confidence: MEDIUM.

## Four mandatory identity reviews - no permanent change

### EDITORIAL_2H2B:at the onset:at-beginning

Disposition: DEFER_IDENTITY_DECISION. Owner UNRESOLVED. Text retained.

Current OTHER: At the time when an event or process begins. / vào lúc một sự việc hoặc quá trình bắt đầu

Example: At the onset of winter, the birds moved south. / Vào đầu mùa đông, những con chim di chuyển về phương nam.

Proposed representation: `{"alternative": "construction/example rather than a standalone Lexeme", "analysis": "prepositional phrase with temporal adverbial function", "lexicalUnitType": "MULTIWORD_EXPRESSION", "posFallback": "OTHER"}`.

The whole expression marks the beginning of an event; the source's onset noun tag does not classify the complete expression.

Propose MULTIWORD_EXPRESSION pending lexicalization review. It is a prepositional phrase headed by at with adverbial function in the example; keep valid OTHER as a temporary fallback, consider PREPOSITION only under an approved phrase POS convention.

Open decisions: CONSTRUCTION_VERSUS_LEXEME, PHRASE_POS_CONVENTION.

### EDITORIAL_2H2B:billion:large-number

Disposition: DEFER_IDENTITY_DECISION. Owner UNRESOLVED. Text retained.

Current OTHER: The number equal to one thousand groups of one million. / số một tỷ, bằng một nghìn lần một triệu

Example: The project cost more than a billion dollars. / Dự án tốn hơn một tỷ đô la.

Proposed representation: `{"analysis": "cardinal numeral; billion after an exact number, billions of for an indefinite large quantity", "lexicalUnitType": "WORD", "posFallback": "OTHER"}`.

The draft teaches a cardinal number; singular billion after a billion does not prove it is an ordinary count noun.

Schema lacks NUMBER/NUMERAL. Keep OTHER, WORD and explicit numeral usage pending owner convention; never fabricate an enum or arbitrarily promote NOUN.

Open decisions: NUMERAL_CLASSIFICATION_POLICY.

### EDITORIAL_2H2B:have to:necessity

Disposition: DEFER_IDENTITY_DECISION. Owner UNRESOLVED. Text retained.

Current VERB: To need to do something because a rule, responsibility or situation makes it necessary. / phải làm một việc vì quy định, trách nhiệm hoặc hoàn cảnh

Example: We have to leave early to catch the first bus. / Chúng tôi phải đi sớm để kịp chuyến xe buýt đầu tiên.

Proposed representation: `{"analysis": "semi-modal construction have to + bare infinitive; don't have to = no necessity", "lexicalUnitType": "MULTIWORD_EXPRESSION", "partOfSpeechProposal": "VERB"}`.

Necessity and absence of necessity may be polarity patterns of one construction; lack of necessity is not prohibition.

Propose MULTIWORD_EXPRESSION with VERB under existing enum; semi-modal have to takes a bare infinitive after to, inflects have/has/had, and uses do-support in negatives/questions. Do not equate it to a particle phrasal verb or introduce a new Sense automatically.

Open decisions: SEMI_MODAL_LEXICAL_UNIT, POLARITY_VERSUS_DISTINCT_SENSE.

### EDITORIAL_2H2B:run:operate

Disposition: DEFER_IDENTITY_DECISION. Owner UNRESOLVED. Text retained.

Current VERB: To operate or function as a machine, program or system. / chạy hoặc hoạt động, dùng cho máy móc hay hệ thống

Example: The generator ran quietly throughout the evening. / Máy phát điện chạy êm suốt buổi tối.

Proposed representation: `{"lexicalUnitType": "WORD", "partOfSpeechProposal": "VERB", "structureProposal": "POSSIBLE_SPLIT_REQUIRES_EVIDENCE_AND_OWNER_REVIEW", "valency": "INTRANSITIVE_FUNCTION"}`.

The generator ran quietly is intransitive functioning; running a generator or program is transitive operating. Their relation may warrant a usage distinction or a separately evidenced Sense; the example supports only the former.

Keep the current VERB and intransitive example. Propose an intransitive-functioning usage note; a transitive split is conditional on evidence and owner identity decision, not performed here.

Open decisions: FUNCTION_VERSUS_TRANSITIVE_OPERATION.

## Attorney - scoped false-positive rejection

REJECT_FINDING_WITH_REASON. Original English: The attorney explained the contract's unclear wording.

Original Vietnamese: Luật sư giải thích cách diễn đạt chưa rõ trong hợp đồng.

English unclear wording and Vietnamese cách diễn đạt chưa rõ express the same lack of clarity. Participants, explanatory action and contract are unchanged; retain the valid pair.

The heuristic sees Vietnamese chưa but misses lexical English negation in unclear. Reject this single code for this exact original pair as an AI review disposition, not an owner approval or global heuristic exemption.

Raw warning is retained in audit history; effective review excludes this one warning for this unchanged pair. All other QA/rights/CEFR findings remain. This AI review disposition is not human acceptance.

## Assessment of all 155 drafts

Content: paired original/new values and field hashes make the 17 corrections auditable; naturalness and semantic precision still need owner evaluation. The preview retains all 155 keys, 100 groups, 37 multi-Sense groups and complete bilingual content. Automated duplicate/copy/format signals cover every preview entry.

Identity: all 155 decisions remain unresolved, with four mandatory reviewed representation cases plus article/forms, plural arms, construction and meaning-boundary blockers. No split/merge/reuse was executed; #11/history exclusions cannot be reversed by new wording.

Classification: no automatic verified CEFR, no default A1 and no inferred school/age/exam classification. Source disagreements remain visible. Rights/provenance: GENERATED correction authorship, no human author/reviewer/license fabricated; source rights UNKNOWN_REVIEW_REQUIRED. Source verification: prompt findings substitute for unavailable AI files; pinned deck evidence and limited external fact/POS checks do not establish permissions or final linguistic truth.

## Scaling readiness - CONDITIONAL, plan only

73/100 pilot groups start with a; convenience pilot is not a statistically representative sample.

Next: propose 120 new groups, 20 from each b-d/e-h/i-m/n-r/s-v/w-z bucket. Use source/POS/CEFR and polysemy/conflict/Master/history strata, SHA256 ranking with fixed seed QA1_STRATIFIED_EXTENSION_120 plus candidateGroupKey, stable key tie-breaks and deduplication. Do not choose first-n alphabetically within buckets. Report unmet quotas instead of inventing examples or identities.

Automate traceability, completeness, copy/duplicate signals, allowed POS, paired-field quantities/negation signals and immutable identity/rights guards. Human judgment is required for meaning/valency, constructions, bilingual naturalness, specialist terminology, identity and rights.

At most 20 groups per batch; at most 10 for identity-heavy groups, at most 5 for subject-sensitive or highly polysemous groups; no cap on supported Sense count.

All high-risk content/identities receive explicit editorial review. For evidence-complete low-risk drafts, audit at least 10 per batch and 20 percent, whichever is larger; deterministic hash-rank selection including each POS/source/CEFR stratum. Sampling controls draft QA effort only, never grants rights, identity or content approval.

Any critical wrong-meaning, identity or rights defect triggers 100 percent review of the affected stratum; two substantive translation/grammar defects in a batch trigger full batch review. Stop promotion until root cause corrected and owner reviews evidence.

Explicit identity review always covers Any Master overlap or owner-excluded pair, Any history-linked runtime identity, Polysemy, merge/split/coalescence, Plural-only forms, aliases, constructions, phrasal/semi-modal units, POS ambiguity or unsupported NUMBER mapping.

Gates: Owner dispositions on these 22 findings and sensitive/identity cases, Rights basis and original/generated provenance per field, Approved POS/lexical-unit convention and correction contract, Stratified extension selection validated before drafting, Separate full-corpus drafting and later canonical/release permissions. No full-corpus authoring has begun.

## Verification and protected state

Generator validates deterministic assembly only. External commands/exits: [handoff](../../docs/ai-progress.md#phase-2h2b-qa1-editorial-corrections-2026-10-08). Replay: `python -B scripts/phase-2h2b-qa1-corrections.py --check`.

Hybrid 2.2.1, 87 Lexemes/100 Senses, exact accepted release hash/tree remain unchanged. Legacy 2018, history 75, #11/#284/#295/#849 and owner exclusions remain pinned, without live DB checks. Database access/writes NONE/NONE; Production UNTOUCHED. No staging, commit/push, canonical Master authoring, Development import or legacy cleanup.
