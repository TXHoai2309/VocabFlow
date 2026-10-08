# Phase 2H.2B — editorial draft pilot

NONCANONICAL GENERATED DRAFTS — HUMAN REVIEW PENDING. No approved identity, license clearance, canonical UUID, release, mapping or database operation.

Baseline: `a2f4f54eefc6734eb7da805f80ff8a9c6ebd4690`. Phase 2H.2A: `5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff`. Phase 2H.2B: `a42e4c25cebdf98cdd24f9e9231be81fff36bbdd571496eeff2886b4d1f1bdad`.

The AI assistant wrote new learner-facing wording in five persisted batches after reviewing pinned source lexical/context evidence. Each content field discloses GENERATED authorship and its text hash; no human author/reviewer/license is invented. Assembly and --check use those files; they never generate prose. Source deck rights remain UNKNOWN_REVIEW_REQUIRED and publicationEligible is false.

## Accounting and review gates

```json
{
  "pilotGroups": 100,
  "groupsWithDrafts": 100,
  "blockedGroups": 0,
  "lexemeProposalGroups": 100,
  "senseDrafts": 155,
  "multiSenseGroups": 37,
  "englishDefinitions": 155,
  "englishExamples": 155,
  "vietnameseMeanings": 155,
  "vietnameseExampleTranslations": 155,
  "qualityCounts": {
    "PASS": 0,
    "REVIEW": 155,
    "FAIL": 0
  },
  "posReviewPending": 155,
  "cefrReviewPending": 155,
  "existingMasterGroupReview": 13,
  "existingMasterSenseReview": 29,
  "ownerApprovals": 0,
  "canonicalIdsAllocated": 0,
  "runtimeMappingsCreated": 0,
  "publicationEligible": 0
}
```

Every pilot group has substantive draft content. Source ordinals are contextual review references, not final Sense identities. Counts reflect supported editorial splits, not a target of one Sense per headword. Academic study/research and have-to negation are explicitly proposed coalescences; highly polysemous groups remain independently reviewable by proposal key. New meanings and alternative POS tags can be deferred or added after evidence review.

QA does not certify linguistic correctness. It flags empty/repeated definitions, duplicates, source passage/eight-token similarity, punctuation, potential conflation, POS conflicts, existing identity overlap, protected legacy exclusions and provenance/rights/approval violations. All bilingual meaning/example, grammar, Sense-boundary and CEFR checks remain human review. False positives must be resolved by the owner, not silently discarded.

## Future Master materialization

See future-master-materialization-contract.json: use existing schemas, separately approved UUIDv7 registry, reviewed lexical normalization NFKC-LOWER-EN-1, exact identity/revision continuity, child IDs, GENERATED field-level provenance and real subsequent OWNER_REVIEW evidence, independent reviewed classifications/taxonomy, immutable pins and canonical release hashes. No Master object or allocation occurs here.

## Protected inputs and external verification

Accepted Phase 2H.1/2H.2A and the 87-Lexeme/100-Sense Hybrid release are untouched. All 2018 legacy rows and 75 historical identities remain protected; #11 and owner-excluded pairs keep NONE, #284 booking mapping remains pinned, #295 and #849 remain pending cases. No live check is claimed.

Generated validation covers deterministic assembly and structural checks only. Exact external commands/exits are recorded [in the handoff](../../docs/ai-progress.md#phase-2h2b-editorial-draft-pilot-2026-10-08). Replay: `python -B scripts/phase-2h2b-editorial-draft.py --check`. No commit/push. Owner reviews actual draft wording, splits, rights and identity before separately authorizing canonical materialization.

## Owner reading copy — all 100 groups

Each Sense can be corrected, deferred or rejected independently; every group and Sense decision currently UNRESOLVED.

### 1. a, an

Group key: `NORMALIZED_HEADWORD:a, an`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**one unspecified thing — DETERMINER** (`EDITORIAL_2H2B:a, an:indefinite`)

Definition: Used before a singular countable noun when the listener does not yet know which person or thing is meant.
Vietnamese: một đối tượng chưa được xác định cụ thể

- EN: I found an envelope under a chair.
- VI: Tôi tìm thấy một phong bì dưới một chiếc ghế.

Grammar / uncertainty: Choose a before a consonant sound and an before a vowel sound; these forms are proposed variants, not two approved identities.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 2. abandon

Group key: `NORMALIZED_HEADWORD:abandon`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**stop a plan — VERB** (`EDITORIAL_2H2B:abandon:stop-plan`)

Definition: To decide not to continue a plan or activity.
Vietnamese: từ bỏ việc tiếp tục một kế hoạch hoặc hoạt động

- EN: We abandoned our picnic plans when the storm arrived.
- VI: Chúng tôi từ bỏ kế hoạch đi dã ngoại khi cơn bão kéo đến.

Grammar / uncertainty: abandon + plan or activity; separate from leaving someone without care.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**leave without care — VERB** (`EDITORIAL_2H2B:abandon:leave-without-care`)

Definition: To leave a person or animal that depends on you without support or protection.
Vietnamese: bỏ mặc người hoặc con vật đang cần sự chăm sóc của mình

- EN: The story follows a dog abandoned beside a road.
- VI: Câu chuyện kể về một con chó bị bỏ rơi bên đường.

Grammar / uncertainty: Often passive: be abandoned; review responsibility and emotional tone.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 3. ability

Group key: `NORMALIZED_HEADWORD:ability`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**capacity to do something — NOUN** (`EDITORIAL_2H2B:ability:capacity`)

Definition: The skill or capacity needed to do a particular thing.
Vietnamese: khả năng thực hiện một việc cụ thể

- EN: Her ability to explain difficult ideas helped the whole class.
- VI: Khả năng giải thích những ý tưởng khó của cô ấy đã giúp cả lớp.

Grammar / uncertainty: ability to + verb; distinguish a skill from permission.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 4. able

Group key: `NORMALIZED_HEADWORD:able`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**capable of doing — ADJECTIVE** (`EDITORIAL_2H2B:able:can-do`)

Definition: Having the skill, strength or opportunity needed to do something.
Vietnamese: có khả năng hoặc điều kiện để làm một việc

- EN: After a short rest, I was able to finish the walk.
- VI: Sau khi nghỉ một lát, tôi đã có thể đi hết quãng đường.

Grammar / uncertainty: be able to + verb; this construction expresses capability.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**competent and skilful — ADJECTIVE** (`EDITORIAL_2H2B:able:competent`)

Definition: Good at doing the work or tasks expected of you.
Vietnamese: có năng lực và làm việc thành thạo

- EN: An able assistant kept the busy office organized.
- VI: Một trợ lý có năng lực đã giữ cho văn phòng bận rộn hoạt động ngăn nắp.

Grammar / uncertainty: Usually before a noun; more formal than be able to.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 5. abnormal

Group key: `NORMALIZED_HEADWORD:abnormal`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**outside the usual pattern — ADJECTIVE** (`EDITORIAL_2H2B:abnormal:unusual`)

Definition: Different from what is normally expected in a particular situation.
Vietnamese: khác với tình trạng hoặc quy luật thường thấy

- EN: The sensor detected an abnormal rise in temperature.
- VI: Cảm biến phát hiện nhiệt độ tăng bất thường.

Grammar / uncertainty: Use for a specified observation; avoid using it to judge a person's worth.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 6. aboard

Group key: `NORMALIZED_HEADWORD:aboard`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**on a vehicle — PREPOSITION** (`EDITORIAL_2H2B:aboard:on-transport`)

Definition: On or into a ship, aircraft, train or other vehicle.
Vietnamese: ở trên hoặc lên một phương tiện vận chuyển

- EN: We stepped aboard the ferry just before departure.
- VI: Chúng tôi bước lên phà ngay trước lúc khởi hành.

Grammar / uncertainty: aboard + vehicle; an adverbial use also exists but is outside this source POS proposal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 7. abolish

Group key: `NORMALIZED_HEADWORD:abolish`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**officially end a system — VERB** (`EDITORIAL_2H2B:abolish:officially-end`)

Definition: To officially bring a rule, practice or institution to an end.
Vietnamese: chính thức chấm dứt một quy định, tập quán hoặc tổ chức

- EN: The council voted to abolish the outdated parking rule.
- VI: Hội đồng bỏ phiếu bãi bỏ quy định đỗ xe đã lỗi thời.

Grammar / uncertainty: abolish + rule or institution; not a general synonym for remove an object.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 8. abortion

Group key: `NORMALIZED_HEADWORD:abortion`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**ending a pregnancy — NOUN** (`EDITORIAL_2H2B:abortion:end-pregnancy`)

Definition: The ending of a pregnancy before a baby is born, especially through a medical procedure.
Vietnamese: việc chấm dứt thai kỳ trước khi em bé được sinh ra, thường bằng can thiệp y tế

- EN: The report discussed access to abortion services.
- VI: Báo cáo bàn về khả năng tiếp cận dịch vụ phá thai.

Grammar / uncertainty: Neutral language-learning example only; sensitive terminology needs human review, with no medical or legal advice.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 9. about

Group key: `NORMALIZED_HEADWORD:about`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**on the subject of — PREPOSITION** (`EDITORIAL_2H2B:about:topic`)

Definition: Concerning the subject or issue being discussed.
Vietnamese: về một chủ đề hoặc vấn đề

- EN: We talked about the new library after lunch.
- VI: Chúng tôi nói về thư viện mới sau bữa trưa.

Grammar / uncertainty: about + noun or -ing form; topic relation, not approximation.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**approximately — PREPOSITION** (`EDITORIAL_2H2B:about:approximately`)

Definition: A little more or less than the stated number or amount.
Vietnamese: khoảng một số lượng được nêu ra

- EN: The journey took about forty minutes.
- VI: Chuyến đi mất khoảng bốn mươi phút.

Grammar / uncertainty: Source calls this preposition; approximation may be analysed as adverbial, so POS remains pending.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**in different places nearby — ADVERB** (`EDITORIAL_2H2B:about:around`)

Definition: In various places within or near an area.
Vietnamese: quanh quẩn hoặc ở nhiều chỗ trong một khu vực gần đó

- EN: The children wandered about while we packed the bags.
- VI: Bọn trẻ đi quanh quẩn trong lúc chúng tôi xếp đồ vào túi.

Grammar / uncertainty: wander about; this use is less common than around in some varieties of English.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 10. above

Group key: `NORMALIZED_HEADWORD:above`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**higher than something — PREPOSITION** (`EDITORIAL_2H2B:above:higher-than`)

Definition: In a position higher than another thing.
Vietnamese: ở vị trí cao hơn một vật khác

- EN: A small clock hangs above the kitchen door.
- VI: Một chiếc đồng hồ nhỏ treo phía trên cửa bếp.

Grammar / uncertainty: above + noun phrase; do not inherit the conflicting source adjective tag automatically.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**in a higher place — ADVERB** (`EDITORIAL_2H2B:above:higher-place`)

Definition: In or towards a higher position than the place already mentioned.
Vietnamese: ở phía cao hơn so với vị trí đã nói đến

- EN: We heard footsteps from the room above.
- VI: Chúng tôi nghe tiếng bước chân từ căn phòng ở phía trên.

Grammar / uncertainty: No following object in this example; review the separate adjectival analysis of room above.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 11. abroad

Group key: `NORMALIZED_HEADWORD:abroad`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**in another country — ADVERB** (`EDITORIAL_2H2B:abroad:foreign-country`)

Definition: In or to a country other than the country you normally live in.
Vietnamese: ở hoặc đến một nước khác với nơi mình thường sống

- EN: Mai hopes to study abroad next year.
- VI: Mai hy vọng sẽ du học vào năm tới.

Grammar / uncertainty: study, live or travel abroad; no preposition before abroad in this use.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 12. abrupt

Group key: `NORMALIZED_HEADWORD:abrupt`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**sudden and unexpected — ADJECTIVE** (`EDITORIAL_2H2B:abrupt:sudden`)

Definition: Happening suddenly rather than gradually.
Vietnamese: đột ngột thay vì diễn ra từ từ

- EN: The abrupt change of topic surprised everyone.
- VI: Sự chuyển chủ đề đột ngột khiến mọi người ngạc nhiên.

Grammar / uncertainty: This proposal covers a sudden change; a curt manner is a separate possible sense requiring more evidence.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 13. absence

Group key: `NORMALIZED_HEADWORD:absence`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**not being present — NOUN** (`EDITORIAL_2H2B:absence:not-present`)

Definition: The state of not being in the place where you are expected.
Vietnamese: tình trạng không có mặt ở nơi được mong đợi

- EN: Please explain your absence from yesterday's meeting.
- VI: Hãy giải thích việc bạn vắng mặt trong cuộc họp hôm qua.

Grammar / uncertainty: absence from + event or place.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**lack of something — NOUN** (`EDITORIAL_2H2B:absence:lack`)

Definition: The fact that something needed or expected is not there.
Vietnamese: sự thiếu vắng một điều được cần hoặc mong đợi

- EN: The absence of clear instructions delayed the project.
- VI: Việc thiếu hướng dẫn rõ ràng đã làm dự án chậm lại.

Grammar / uncertainty: absence of + thing; distinguish from a person's non-attendance.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 14. absent

Group key: `NORMALIZED_HEADWORD:absent`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**not present — ADJECTIVE** (`EDITORIAL_2H2B:absent:not-there`)

Definition: Not in the place where a person is expected to be.
Vietnamese: không có mặt tại nơi được mong đợi

- EN: Two students were absent from the workshop.
- VI: Hai học sinh vắng mặt trong buổi thực hành.

Grammar / uncertainty: absent from + place or event.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**not found or included — ADJECTIVE** (`EDITORIAL_2H2B:absent:missing`)

Definition: Not present in something where it might be expected.
Vietnamese: không tồn tại hoặc không được đưa vào nơi lẽ ra có thể có

- EN: A clear conclusion was absent from the essay.
- VI: Bài luận thiếu một kết luận rõ ràng.

Grammar / uncertainty: Use with a specified missing feature; not a claim about participation.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 15. absolute

Group key: `NORMALIZED_HEADWORD:absolute`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**complete and unrestricted — ADJECTIVE** (`EDITORIAL_2H2B:absolute:complete`)

Definition: Complete, with no stated limit, condition or exception.
Vietnamese: hoàn toàn, không có giới hạn hoặc ngoại lệ được nêu ra

- EN: The laboratory required absolute silence during the test.
- VI: Phòng thí nghiệm yêu cầu sự im lặng tuyệt đối trong lúc thử nghiệm.

Grammar / uncertainty: An intensifying adjective; specialized mathematical uses are not proposed here.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 16. absolutely

Group key: `NORMALIZED_HEADWORD:absolutely`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**completely — ADVERB** (`EDITORIAL_2H2B:absolutely:completely`)

Definition: Used to emphasize that something is fully true or complete.
Vietnamese: hoàn toàn; dùng để nhấn mạnh mức độ trọn vẹn

- EN: You are absolutely right about the missing page.
- VI: Bạn hoàn toàn đúng về trang bị thiếu.

Grammar / uncertainty: Often strengthens a statement or adjective; review register and degree compatibility.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 17. absorb

Group key: `NORMALIZED_HEADWORD:absorb`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**take in liquid — VERB** (`EDITORIAL_2H2B:absorb:take-in-liquid`)

Definition: To draw liquid into a material rather than leave it on the surface.
Vietnamese: hút chất lỏng vào bên trong một vật liệu

- EN: The dry cloth absorbed the spilled juice.
- VI: Chiếc khăn khô thấm phần nước trái cây bị đổ.

Grammar / uncertainty: absorb + liquid; other physical uptake processes need separate contextual review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**take in information — VERB** (`EDITORIAL_2H2B:absorb:learn-information`)

Definition: To understand and remember information that you receive.
Vietnamese: tiếp thu và ghi nhớ thông tin

- EN: I needed time to absorb the instructions before starting.
- VI: Tôi cần thời gian để tiếp thu hướng dẫn trước khi bắt đầu.

Grammar / uncertainty: Figurative use with information, ideas or details.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 18. abstract

Group key: `NORMALIZED_HEADWORD:abstract`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**based on ideas — ADJECTIVE** (`EDITORIAL_2H2B:abstract:not-concrete`)

Definition: Existing as an idea or quality rather than as a physical object.
Vietnamese: thuộc về ý tưởng hoặc tính chất, không phải một vật thể cụ thể

- EN: Freedom is an abstract concept with many interpretations.
- VI: Tự do là một khái niệm trừu tượng có nhiều cách hiểu.

Grammar / uncertainty: This is the conceptual adjective; an article summary is a separate noun use not supported by this source grouping.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 19. absurd

Group key: `NORMALIZED_HEADWORD:absurd`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**extremely unreasonable — ADJECTIVE** (`EDITORIAL_2H2B:absurd:unreasonable`)

Definition: So unreasonable or illogical that it is difficult to take seriously.
Vietnamese: vô lý đến mức khó có thể xem là nghiêm túc

- EN: Charging a delivery fee for an empty package seemed absurd.
- VI: Tính phí giao hàng cho một gói đồ rỗng có vẻ thật vô lý.

Grammar / uncertainty: It is absurd to + verb; often expresses a strong evaluation.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 20. abundance

Group key: `NORMALIZED_HEADWORD:abundance`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a plentiful amount — NOUN** (`EDITORIAL_2H2B:abundance:plenty`)

Definition: A quantity that is more than enough for the situation.
Vietnamese: một lượng dồi dào, nhiều hơn mức cần thiết

- EN: The garden produced an abundance of tomatoes this summer.
- VI: Mùa hè này khu vườn cho một lượng cà chua dồi dào.

Grammar / uncertainty: an abundance of + noun; do not confuse with a shortage.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 21. abundant

Group key: `NORMALIZED_HEADWORD:abundant`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**available in large amounts — ADJECTIVE** (`EDITORIAL_2H2B:abundant:plentiful`)

Definition: Present in a quantity that easily meets the need.
Vietnamese: có nhiều và đủ đáp ứng nhu cầu

- EN: Fresh fruit is abundant here during the summer.
- VI: Trái cây tươi có rất nhiều ở đây vào mùa hè.

Grammar / uncertainty: abundant resources; distinguish availability from frequent events.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 22. abuse

Group key: `NORMALIZED_HEADWORD:abuse`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**cruel treatment — NOUN** (`EDITORIAL_2H2B:abuse:harm-noun`)

Definition: Cruel or harmful treatment of a person or animal.
Vietnamese: sự đối xử tàn nhẫn hoặc gây hại cho người hay động vật

- EN: The shelter provides support for people affected by abuse.
- VI: Trung tâm hỗ trợ những người chịu ảnh hưởng của sự ngược đãi.

Grammar / uncertainty: Usually uncountable in this sense; use sensitive, non-graphic contexts.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**treat cruelly — VERB** (`EDITORIAL_2H2B:abuse:harm-verb`)

Definition: To treat a person or animal in a cruel or harmful way.
Vietnamese: đối xử tàn nhẫn hoặc gây tổn hại cho người hay động vật

- EN: The shelter took in a horse that its former keeper had abused.
- VI: Trại cứu hộ tiếp nhận một con ngựa từng bị người chăm sóc trước đây ngược đãi.

Grammar / uncertainty: Transitive; avoid conflating personal mistreatment with misuse of an object.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**improper use — NOUN** (`EDITORIAL_2H2B:abuse:misuse-noun`)

Definition: The use of a right, power or resource in a harmful or improper way.
Vietnamese: việc sử dụng quyền lực, quyền hạn hoặc nguồn lực sai mục đích

- EN: The committee investigated an abuse of authority.
- VI: Ủy ban điều tra một trường hợp lạm dụng quyền hạn.

Grammar / uncertainty: abuse of + power or resource.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

**use improperly — VERB** (`EDITORIAL_2H2B:abuse:misuse-verb`)

Definition: To use power, trust or a resource in a harmful or unfair way.
Vietnamese: sử dụng quyền lực, lòng tin hoặc nguồn lực một cách gây hại hay bất công

- EN: A manager must not abuse the trust of the team.
- VI: Người quản lý không được lạm dụng lòng tin của nhóm.

Grammar / uncertainty: abuse + trust or power; distinct from bodily mistreatment.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [3]; see pinned note references in pilot-sense-proposals.json.

**insulting language — NOUN** (`EDITORIAL_2H2B:abuse:insults-noun`)

Definition: Harsh words directed at someone to insult or hurt them.
Vietnamese: những lời xúc phạm nhằm làm tổn thương người khác

- EN: The referee faced verbal abuse after the match.
- VI: Trọng tài phải chịu những lời lăng mạ sau trận đấu.

Grammar / uncertainty: verbal abuse; no offensive quotation is needed for teaching.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [4]; see pinned note references in pilot-sense-proposals.json.

**speak insultingly to — VERB** (`EDITORIAL_2H2B:abuse:insult-verb`)

Definition: To direct harsh, insulting words at someone.
Vietnamese: dùng những lời gay gắt để xúc phạm người khác

- EN: The driver was reported for abusing a passenger.
- VI: Người lái xe bị phản ánh vì lăng mạ một hành khách.

Grammar / uncertainty: Transitive; retain context to distinguish from physical harm.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [5]; see pinned note references in pilot-sense-proposals.json.

### 23. abysmal

Group key: `NORMALIZED_HEADWORD:abysmal`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**extremely poor — ADJECTIVE** (`EDITORIAL_2H2B:abysmal:extremely-poor`)

Definition: Very bad in quality, performance or condition.
Vietnamese: cực kỳ kém về chất lượng hoặc tình trạng

- EN: The hotel received complaints about its abysmal service.
- VI: Khách sạn nhận được những lời phàn nàn về dịch vụ tệ hại của mình.

Grammar / uncertainty: Strong negative evaluation; more emphatic than poor.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 24. academic

Group key: `NORMALIZED_HEADWORD:academic`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**related to study and research — ADJECTIVE** (`EDITORIAL_2H2B:academic:education-research`)

Definition: Connected with formal education, study or scholarly research.
Vietnamese: thuộc việc học tập, giáo dục chính quy hoặc nghiên cứu học thuật

- EN: The journal publishes academic articles about language learning.
- VI: Tạp chí đăng các bài nghiên cứu học thuật về việc học ngôn ngữ.

Grammar / uncertainty: Source study and scholarship groups are provisionally combined; owner may split educational performance from research use.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0, 2]; see pinned note references in pilot-sense-proposals.json.

**a university scholar — NOUN** (`EDITORIAL_2H2B:academic:scholar`)

Definition: A person whose work involves teaching or research at a university.
Vietnamese: người giảng dạy hoặc nghiên cứu ở bậc đại học

- EN: Several academics contributed to the public discussion.
- VI: Một số giảng viên và nhà nghiên cứu đại học đã tham gia cuộc thảo luận công khai.

Grammar / uncertainty: Countable noun; do not use this noun for every student.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 25. accent

Group key: `NORMALIZED_HEADWORD:accent`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a way of pronouncing — NOUN** (`EDITORIAL_2H2B:accent:speech-pattern`)

Definition: A pattern of pronunciation associated with a person, place or language background.
Vietnamese: cách phát âm đặc trưng của một người hoặc một vùng

- EN: I recognized her regional accent immediately.
- VI: Tôi nhận ra ngay giọng nói đặc trưng vùng miền của cô ấy.

Grammar / uncertainty: An accent is not a measure of intelligence or language ability.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**a mark on a letter — NOUN** (`EDITORIAL_2H2B:accent:written-mark`)

Definition: A written mark placed on a letter to indicate pronunciation or another spelling distinction.
Vietnamese: dấu được đặt trên chữ cái để thể hiện cách đọc hoặc đặc điểm chính tả

- EN: The teacher explained why the French word needs an accent.
- VI: Giáo viên giải thích vì sao từ tiếng Pháp đó cần một dấu trên chữ cái.

Grammar / uncertainty: Countable; which mark is required depends on the language.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 26. accept

Group key: `NORMALIZED_HEADWORD:accept`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**agree to receive — VERB** (`EDITORIAL_2H2B:accept:receive`)

Definition: To willingly receive something that is offered to you.
Vietnamese: đồng ý nhận một thứ được đề nghị

- EN: She accepted the invitation to speak at the festival.
- VI: Cô ấy nhận lời mời phát biểu tại lễ hội.

Grammar / uncertainty: accept + invitation, offer or gift.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**recognize as true — VERB** (`EDITORIAL_2H2B:accept:acknowledge`)

Definition: To recognize that an idea or situation is true, even if you dislike it.
Vietnamese: thừa nhận một ý kiến hoặc tình huống là đúng dù không mong muốn

- EN: He finally accepted that the schedule had to change.
- VI: Cuối cùng anh ấy chấp nhận rằng lịch trình phải thay đổi.

Grammar / uncertainty: accept that + clause; distinguish from receiving a physical item.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 27. acceptable

Group key: `NORMALIZED_HEADWORD:acceptable`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**good enough — ADJECTIVE** (`EDITORIAL_2H2B:acceptable:meets-standard`)

Definition: Good enough or suitable enough to meet a particular standard.
Vietnamese: đủ tốt hoặc phù hợp để đáp ứng một tiêu chuẩn

- EN: The team agreed on an acceptable price for the repairs.
- VI: Nhóm thống nhất một mức giá có thể chấp nhận cho việc sửa chữa.

Grammar / uncertainty: acceptable to someone; the standard should be explicit in context.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 28. access

Group key: `NORMALIZED_HEADWORD:access`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a way or right to reach — NOUN** (`EDITORIAL_2H2B:access:opportunity`)

Definition: The ability, opportunity or permission to reach or use something.
Vietnamese: khả năng, cơ hội hoặc quyền tiếp cận và sử dụng một thứ

- EN: The village now has access to reliable internet.
- VI: Ngôi làng hiện đã có thể sử dụng kết nối internet ổn định.

Grammar / uncertainty: access to + noun; normally uncountable here.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**reach and use — VERB** (`EDITORIAL_2H2B:access:open-use`)

Definition: To open, reach or make use of something, especially information in a system.
Vietnamese: truy cập hoặc tiếp cận để sử dụng thông tin hay một hệ thống

- EN: You can access the timetable through the school's website.
- VI: Bạn có thể xem thời khóa biểu qua trang web của trường.

Grammar / uncertainty: access + direct object, without to; digital context here.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 29. accessory

Group key: `NORMALIZED_HEADWORD:accessory`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**an additional useful item — NOUN** (`EDITORIAL_2H2B:accessory:extra-item`)

Definition: An item used with something else to make it more useful or attractive.
Vietnamese: vật được dùng kèm để tăng công dụng hoặc làm đẹp

- EN: A waterproof case is a useful accessory for this camera.
- VI: Một chiếc vỏ chống nước là phụ kiện hữu ích cho máy ảnh này.

Grammar / uncertainty: Countable; legal accessory use is not proposed from this evidence.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 30. accidentally

Group key: `NORMALIZED_HEADWORD:accidentally`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**without intending to — ADVERB** (`EDITORIAL_2H2B:accidentally:unintentionally`)

Definition: In a way that was not planned or intended.
Vietnamese: một cách không chủ ý

- EN: I accidentally sent the message to the wrong person.
- VI: Tôi vô tình gửi tin nhắn nhầm người.

Grammar / uncertainty: Modifies an action; distinguish an accident from an intentional choice.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 31. accommodation

Group key: `NORMALIZED_HEADWORD:accommodation`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a place to stay — NOUN** (`EDITORIAL_2H2B:accommodation:place-to-stay`)

Definition: A room, building or other place provided for someone to live or stay in.
Vietnamese: chỗ được cung cấp để ở hoặc lưu trú

- EN: The course fee does not include accommodation.
- VI: Học phí khóa học không bao gồm chỗ ở.

Grammar / uncertainty: Usually uncountable in British English; review American plural usage separately.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 32. according to

Group key: `NORMALIZED_HEADWORD:according to`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**as stated by — PREPOSITION** (`EDITORIAL_2H2B:according to:reported-source`)

Definition: Used to name the person or source that provides a statement or piece of information.
Vietnamese: theo lời hoặc thông tin từ một người hay một nguồn

- EN: According to the timetable, the first train leaves at six.
- VI: Theo thời gian biểu, chuyến tàu đầu tiên khởi hành lúc sáu giờ.

Grammar / uncertainty: according to + source; reporting does not endorse the statement as verified truth.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 33. accountant

Group key: `NORMALIZED_HEADWORD:accountant`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a financial records professional — NOUN** (`EDITORIAL_2H2B:accountant:finance-worker`)

Definition: A person whose job involves preparing and checking financial records.
Vietnamese: người có công việc lập và kiểm tra sổ sách tài chính

- EN: Our accountant checks the invoices at the end of each month.
- VI: Kế toán của chúng tôi kiểm tra các hóa đơn vào cuối mỗi tháng.

Grammar / uncertainty: Countable occupation noun; qualifications vary by jurisdiction.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 34. accounting

Group key: `NORMALIZED_HEADWORD:accounting`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**financial recording work — NOUN** (`EDITORIAL_2H2B:accounting:financial-recording`)

Definition: The work or system of recording and organizing financial transactions.
Vietnamese: công việc hoặc hệ thống ghi chép và tổ chức các giao dịch tài chính

- EN: She is taking an introductory course in accounting.
- VI: Cô ấy đang học một khóa nhập môn kế toán.

Grammar / uncertainty: Usually uncountable; not the person who does the work.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 35. accusation

Group key: `NORMALIZED_HEADWORD:accusation`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a claim of wrongdoing — NOUN** (`EDITORIAL_2H2B:accusation:claim-of-wrongdoing`)

Definition: A statement claiming that someone has done something wrong.
Vietnamese: lời khẳng định rằng ai đó đã làm điều sai trái

- EN: He denied the accusation that he had damaged the equipment.
- VI: Anh ấy bác bỏ lời cáo buộc rằng mình đã làm hỏng thiết bị.

Grammar / uncertainty: An accusation is a claim, not proof; accusation against someone or that-clause.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 36. accuse

Group key: `NORMALIZED_HEADWORD:accuse`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**say someone did wrong — VERB** (`EDITORIAL_2H2B:accuse:claim-someone-did-wrong`)

Definition: To say that someone is responsible for a wrong action.
Vietnamese: nói rằng ai đó chịu trách nhiệm về một hành động sai trái

- EN: They accused him of hiding the missing documents.
- VI: Họ cáo buộc anh ấy đã giấu những tài liệu bị thất lạc.

Grammar / uncertainty: accuse someone of + noun or -ing; do not imply guilt is established.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 37. accustom

Group key: `NORMALIZED_HEADWORD:accustom`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**make used to something — VERB** (`EDITORIAL_2H2B:accustom:make-familiar`)

Definition: To help a person become familiar or comfortable with a new situation.
Vietnamese: giúp một người dần quen với một tình huống mới

- EN: The coach accustomed the team to training in cold weather.
- VI: Huấn luyện viên giúp đội quen dần với việc tập luyện trong thời tiết lạnh.

Grammar / uncertainty: accustom someone to + noun or -ing; rather formal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 38. ache

Group key: `NORMALIZED_HEADWORD:ache`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**hurt continuously — VERB** (`EDITORIAL_2H2B:ache:continuous-pain`)

Definition: To feel a continuous pain that is usually not sharp.
Vietnamese: đau âm ỉ hoặc đau liên tục

- EN: My shoulders ached after carrying the heavy bag.
- VI: Vai tôi đau mỏi sau khi mang chiếc túi nặng.

Grammar / uncertainty: Intransitive; a body part aches. Noun use requires a separate proposal if later supported.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 39. achievement

Group key: `NORMALIZED_HEADWORD:achievement`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a result of effort — NOUN** (`EDITORIAL_2H2B:achievement:accomplishment`)

Definition: Something successfully done through effort, skill or determination.
Vietnamese: điều đạt được nhờ nỗ lực, kỹ năng hoặc quyết tâm

- EN: Completing her first novel was a major achievement.
- VI: Hoàn thành cuốn tiểu thuyết đầu tiên là một thành tựu lớn của cô ấy.

Grammar / uncertainty: Countable for a particular accomplishment.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 40. acquaint

Group key: `NORMALIZED_HEADWORD:acquaint`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**make familiar with — VERB** (`EDITORIAL_2H2B:acquaint:make-informed`)

Definition: To give someone enough information to become familiar with something.
Vietnamese: giúp ai đó biết và hiểu một điều

- EN: The guide acquainted us with the safety procedures.
- VI: Người hướng dẫn giúp chúng tôi nắm được các quy trình an toàn.

Grammar / uncertainty: acquaint someone with + noun; formal, unlike the everyday meet someone.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 41. acquire

Group key: `NORMALIZED_HEADWORD:acquire`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**gain over time — VERB** (`EDITORIAL_2H2B:acquire:gain`)

Definition: To come to have a skill, quality or possession through learning or experience.
Vietnamese: có được một kỹ năng, phẩm chất hoặc tài sản qua học hỏi hay trải nghiệm

- EN: Children acquire new vocabulary through repeated use.
- VI: Trẻ em tiếp thu từ vựng mới thông qua việc sử dụng nhiều lần.

Grammar / uncertainty: acquire + skill or knowledge; gradual acquisition is not instant understanding.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**buy a business — VERB** (`EDITORIAL_2H2B:acquire:purchase-business`)

Definition: To buy a business or asset and become its owner.
Vietnamese: mua lại một doanh nghiệp hoặc tài sản để trở thành chủ sở hữu

- EN: The company acquired a smaller competitor last year.
- VI: Công ty mua lại một đối thủ nhỏ hơn vào năm ngoái.

Grammar / uncertainty: Business use; ownership details need context, not an automatic merger assumption.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 42. acre

Group key: `NORMALIZED_HEADWORD:acre`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a unit of land area — NOUN** (`EDITORIAL_2H2B:acre:land-area`)

Definition: A unit used to measure the area of a piece of land.
Vietnamese: đơn vị acre dùng để đo diện tích đất

- EN: The farm covers twelve acres near the river.
- VI: Trang trại có diện tích mười hai acre gần con sông.

Grammar / uncertainty: Keep acre as a named unit; avoid equating it with a Vietnamese mẫu whose size varies.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 43. acrobat

Group key: `NORMALIZED_HEADWORD:acrobat`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a performer of physical feats — NOUN** (`EDITORIAL_2H2B:acrobat:performance-artist`)

Definition: A performer who entertains people with difficult balancing, jumping or other controlled body movements.
Vietnamese: nghệ sĩ biểu diễn các động tác giữ thăng bằng, nhào lộn hoặc vận động khó

- EN: The acrobat balanced on a narrow platform above the stage.
- VI: Nghệ sĩ xiếc giữ thăng bằng trên một bục hẹp phía trên sân khấu.

Grammar / uncertainty: Countable; a performer rather than an ordinary sports participant.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 44. act

Group key: `NORMALIZED_HEADWORD:act`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**do something or behave — VERB** (`EDITORIAL_2H2B:act:behave`)

Definition: To take action or behave in a particular way.
Vietnamese: hành động hoặc cư xử theo một cách

- EN: We must act quickly before the rain reaches the equipment.
- VI: Chúng ta phải hành động nhanh trước khi mưa làm ướt thiết bị.

Grammar / uncertainty: act + manner adverb; a behaviour proposal separate from stage performance.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**perform a role — VERB** (`EDITORIAL_2H2B:act:perform`)

Definition: To play a character in a film, play or other performance.
Vietnamese: đóng vai một nhân vật trong phim hoặc sân khấu

- EN: She acts in a small theatre company on weekends.
- VI: Cô ấy diễn trong một đoàn kịch nhỏ vào cuối tuần.

Grammar / uncertainty: act in + production; acting is not necessarily deceptive behaviour.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**a particular deed — NOUN** (`EDITORIAL_2H2B:act:deed`)

Definition: One thing that a person does, often considered for its effect or intention.
Vietnamese: một hành động cụ thể, thường được xem xét theo tác động hoặc ý định

- EN: Returning the lost wallet was an act of kindness.
- VI: Trả lại chiếc ví bị mất là một hành động tử tế.

Grammar / uncertainty: an act of + quality or behaviour.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 45. action

Group key: `NORMALIZED_HEADWORD:action`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**steps taken for a purpose — NOUN** (`EDITORIAL_2H2B:action:steps-taken`)

Definition: Something done to deal with a situation or achieve a result.
Vietnamese: việc được làm để giải quyết tình huống hoặc đạt mục tiêu

- EN: The school took action to reduce food waste.
- VI: Nhà trường thực hiện các biện pháp để giảm lãng phí thức ăn.

Grammar / uncertainty: take action; distinguish a response from continuous movement.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**movement or activity — NOUN** (`EDITORIAL_2H2B:action:movement`)

Definition: Movement or activity, especially when something is happening rather than resting.
Vietnamese: sự chuyển động hoặc hoạt động khi điều gì đó đang diễn ra

- EN: The photographer captured the dancers in action.
- VI: Nhiếp ảnh gia chụp được các vũ công đang biểu diễn.

Grammar / uncertainty: in action; the proposed boundary with general activity needs human review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 46. activity

Group key: `NORMALIZED_HEADWORD:activity`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**something people do — NOUN** (`EDITORIAL_2H2B:activity:something-done`)

Definition: Something people do for a purpose, enjoyment or a particular occasion.
Vietnamese: việc mọi người làm vì một mục đích hoặc để vui chơi

- EN: Drawing was the children's favourite afternoon activity.
- VI: Vẽ là hoạt động buổi chiều mà bọn trẻ thích nhất.

Grammar / uncertainty: Countable for a particular task; activity can also be uncountable in broader contexts.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 47. actor

Group key: `NORMALIZED_HEADWORD:actor`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a person playing a character — NOUN** (`EDITORIAL_2H2B:actor:performer`)

Definition: A person who performs a character in a play, film or similar production.
Vietnamese: người đóng vai nhân vật trong kịch, phim hoặc tác phẩm tương tự

- EN: The actor practised the scene before the audience arrived.
- VI: Diễn viên tập lại cảnh diễn trước khi khán giả đến.

Grammar / uncertainty: Actor can refer to a performer of any gender.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 48. actress

Group key: `NORMALIZED_HEADWORD:actress`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a female actor — NOUN** (`EDITORIAL_2H2B:actress:female-performer`)

Definition: A woman who performs a character in a play, film or similar production.
Vietnamese: nữ diễn viên đóng vai trong kịch hoặc phim

- EN: The actress discussed her new role in an interview.
- VI: Nữ diễn viên chia sẻ về vai diễn mới trong một cuộc phỏng vấn.

Grammar / uncertainty: Actor is also widely used for women; preserve choice and context rather than require a gendered label.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 49. acute

Group key: `NORMALIZED_HEADWORD:acute`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**rapid in onset — ADJECTIVE** (`EDITORIAL_2H2B:acute:rapid-onset`)

Definition: Describing a condition that develops quickly, in contrast to one that continues over a long period.
Vietnamese: chỉ tình trạng khởi phát nhanh, đối lập với tình trạng kéo dài

- EN: The article compared acute and chronic conditions.
- VI: Bài viết so sánh các tình trạng cấp tính và mạn tính.

Grammar / uncertainty: Medical terminology draft only; not a diagnosis or treatment claim. Human terminology review required.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**very severe — ADJECTIVE** (`EDITORIAL_2H2B:acute:severe`)

Definition: Very strong or serious and demanding attention.
Vietnamese: rất nghiêm trọng hoặc gay gắt, cần được quan tâm

- EN: An acute shortage of spare parts delayed repairs to the bridge.
- VI: Việc thiếu phụ tùng trầm trọng khiến công tác sửa cầu bị chậm lại.

Grammar / uncertainty: acute shortage or problem; severity is distinct from rapid onset.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**keenly perceptive — ADJECTIVE** (`EDITORIAL_2H2B:acute:perceptive`)

Definition: Able to notice or understand small details very clearly.
Vietnamese: nhạy bén trong việc nhận ra hoặc hiểu những chi tiết nhỏ

- EN: Her acute observation revealed a small error in the chart.
- VI: Sự quan sát nhạy bén của cô ấy giúp phát hiện một lỗi nhỏ trong biểu đồ.

Grammar / uncertainty: acute observation or awareness; do not confuse with pain or illness.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 50. addition

Group key: `NORMALIZED_HEADWORD:addition`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**something added — NOUN** (`EDITORIAL_2H2B:addition:extra-thing`)

Definition: Something new that is put with what is already there.
Vietnamese: thứ mới được bổ sung vào những gì đã có

- EN: The reading room is a useful addition to the school.
- VI: Phòng đọc là một phần bổ sung hữu ích cho trường.

Grammar / uncertainty: an addition to + existing thing.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**combining numbers — NOUN** (`EDITORIAL_2H2B:addition:arithmetic`)

Definition: The mathematical process of combining numbers to find their total.
Vietnamese: phép toán cộng các số để tìm tổng

- EN: The children practised addition with small wooden counters.
- VI: Bọn trẻ luyện phép cộng bằng những thẻ gỗ nhỏ.

Grammar / uncertainty: Uncountable mathematical operation; separate from a new item.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 51. administration

Group key: `NORMALIZED_HEADWORD:administration`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**organizational management — NOUN** (`EDITORIAL_2H2B:administration:management-work`)

Definition: The work of organizing and managing the affairs of an institution.
Vietnamese: công việc tổ chức và quản lý hoạt động của một cơ quan

- EN: She handles the day-to-day administration of the clinic.
- VI: Cô ấy phụ trách công việc quản lý hằng ngày của phòng khám.

Grammar / uncertainty: administration of + organization; not necessarily a government.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**a governing team — NOUN** (`EDITORIAL_2H2B:administration:government-team`)

Definition: The government or group of officials responsible for running a country or institution during a particular period.
Vietnamese: chính quyền hoặc nhóm lãnh đạo điều hành trong một giai đoạn

- EN: The new administration announced its transport priorities.
- VI: Chính quyền mới công bố những ưu tiên về giao thông.

Grammar / uncertainty: Countable in this use; jurisdiction and institutional context matter.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 52. adorable

Group key: `NORMALIZED_HEADWORD:adorable`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**very lovable — ADJECTIVE** (`EDITORIAL_2H2B:adorable:lovable`)

Definition: So charming or appealing that people feel fond of it.
Vietnamese: đáng yêu đến mức khiến người khác thấy yêu mến

- EN: The puppy's tiny ears made it look adorable.
- VI: Đôi tai nhỏ xíu khiến chú chó con trông thật đáng yêu.

Grammar / uncertainty: Informal positive evaluation; not a physical size category.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 53. affection

Group key: `NORMALIZED_HEADWORD:affection`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**warm fondness — NOUN** (`EDITORIAL_2H2B:affection:fondness`)

Definition: A warm feeling of liking and caring for someone or something.
Vietnamese: tình cảm trìu mến và quan tâm

- EN: He spoke about his old school with great affection.
- VI: Anh ấy nói về ngôi trường cũ với nhiều tình cảm trìu mến.

Grammar / uncertainty: affection for + person or thing; usually uncountable.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 54. against

Group key: `NORMALIZED_HEADWORD:against`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**in opposition to — PREPOSITION** (`EDITORIAL_2H2B:against:opposition`)

Definition: Opposing a person, idea or action.
Vietnamese: chống lại hoặc phản đối một người, ý kiến hay hành động

- EN: Several residents voted against the proposal.
- VI: Một số cư dân bỏ phiếu phản đối đề xuất.

Grammar / uncertainty: against + noun phrase; do not adopt the conflicting adjective tag.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**touching for support — PREPOSITION** (`EDITORIAL_2H2B:against:touching`)

Definition: Touching a surface, often while leaning on it for support.
Vietnamese: chạm vào một bề mặt, thường để tựa hoặc đỡ

- EN: He rested the bicycle against the garden wall.
- VI: Anh ấy dựng chiếc xe đạp tựa vào tường vườn.

Grammar / uncertainty: lean or rest something against + surface.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 55. age

Group key: `NORMALIZED_HEADWORD:age`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**years of life — NOUN** (`EDITORIAL_2H2B:age:years-lived`)

Definition: The length of time that a person or living thing has been alive.
Vietnamese: số thời gian một người hoặc sinh vật đã sống

- EN: At the age of eight, she learned to swim.
- VI: Lúc tám tuổi, cô ấy học bơi.

Grammar / uncertainty: at the age of + number; distinguish from a historical period.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**grow older — VERB** (`EDITORIAL_2H2B:age:grow-older`)

Definition: To become older or show changes associated with getting older.
Vietnamese: trở nên già hơn hoặc thay đổi theo tuổi tác

- EN: The trees aged slowly in the sheltered valley.
- VI: Những cây ấy già đi chậm rãi trong thung lũng được che chắn.

Grammar / uncertainty: Intransitive in this example; avoid negative assumptions about older people.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**a period in history — NOUN** (`EDITORIAL_2H2B:age:historical-period`)

Definition: A period characterized by a particular way of life, technology or important feature.
Vietnamese: giai đoạn lịch sử có một đặc điểm nổi bật

- EN: The exhibition explores the age of steam travel.
- VI: Triển lãm tìm hiểu thời đại của giao thông chạy bằng hơi nước.

Grammar / uncertainty: the age of + characteristic; not someone's chronological age.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 56. ahead

Group key: `NORMALIZED_HEADWORD:ahead`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**in front — ADVERB** (`EDITORIAL_2H2B:ahead:in-front`)

Definition: In a position farther forward than someone or something else.
Vietnamese: ở phía trước hoặc tiến xa hơn về phía trước

- EN: The path ahead becomes narrow near the bridge.
- VI: Lối đi phía trước trở nên hẹp gần cây cầu.

Grammar / uncertainty: ahead of + noun in a related construction; review adjective-like postmodifier analysis.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 57. all right

Group key: `NORMALIZED_HEADWORD:all right`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**satisfactory or well — ADJECTIVE** (`EDITORIAL_2H2B:all right:satisfactory`)

Definition: In a satisfactory condition, or feeling well enough.
Vietnamese: ổn về tình trạng hoặc sức khỏe

- EN: The bike looks damaged, but the rider is all right.
- VI: Chiếc xe đạp có vẻ bị hỏng, nhưng người đi xe vẫn ổn.

Grammar / uncertainty: be all right; does not mean excellent or establish a medical assessment.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**in a satisfactory way — ADVERB** (`EDITORIAL_2H2B:all right:satisfactorily`)

Definition: In a way that is good enough for the situation.
Vietnamese: một cách đủ ổn để đáp ứng tình huống

- EN: The old printer still works all right.
- VI: Chiếc máy in cũ vẫn hoạt động khá ổn.

Grammar / uncertainty: Modifies the action works; compare with adjective after be.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**agreement or acceptance — INTERJECTION** (`EDITORIAL_2H2B:all right:agreement`)

Definition: Used to show that you accept a suggestion or agree to continue.
Vietnamese: lời thể hiện sự đồng ý hoặc chấp nhận một đề nghị

- EN: All right, let's meet outside the library at noon.
- VI: Được rồi, chúng ta hãy gặp nhau ngoài thư viện lúc trưa.

Grammar / uncertainty: Conversational response; preserve all right as two words in this proposal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 58. alone

Group key: `NORMALIZED_HEADWORD:alone`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**without other people — ADJECTIVE** (`EDITORIAL_2H2B:alone:without-company`)

Definition: With no other person present or keeping you company.
Vietnamese: ở một mình, không có người khác bên cạnh

- EN: She was alone in the waiting room.
- VI: Cô ấy ở một mình trong phòng chờ.

Grammar / uncertainty: be alone; being alone does not necessarily mean feeling lonely.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**without help or company — ADVERB** (`EDITORIAL_2H2B:alone:independently`)

Definition: Without another person joining or helping in an action.
Vietnamese: tự làm hoặc đi một mình, không có người khác tham gia

- EN: He completed the first stage of the walk alone.
- VI: Anh ấy đi hết chặng đầu của hành trình một mình.

Grammar / uncertainty: Modifies an action; no noun identity is inferred from the conflicting source tag.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 59. alongside

Group key: `NORMALIZED_HEADWORD:alongside`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**beside — PREPOSITION** (`EDITORIAL_2H2B:alongside:next-to`)

Definition: Beside someone or something, especially in a parallel position.
Vietnamese: bên cạnh một người hoặc vật

- EN: The small boat moved alongside the ferry.
- VI: Chiếc thuyền nhỏ di chuyển bên cạnh chiếc phà.

Grammar / uncertainty: alongside + noun; cooperative work is a related figurative use requiring separate boundary review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 60. amid

Group key: `NORMALIZED_HEADWORD:amid`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**surrounded by a situation — PREPOSITION** (`EDITORIAL_2H2B:amid:in-the-middle-of`)

Definition: In the middle of events, activity or surrounding conditions.
Vietnamese: giữa hoặc trong bối cảnh một tình huống đang diễn ra

- EN: The musicians continued playing amid the noise.
- VI: Các nhạc công tiếp tục chơi giữa tiếng ồn.

Grammar / uncertainty: Formal preposition; do not inherit the source adjective tag.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 61. any more

Group key: `NORMALIZED_HEADWORD:any more`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**no longer — ADVERB** (`EDITORIAL_2H2B:any more:no-longer`)

Definition: Used in a negative statement to say that a previous situation has stopped.
Vietnamese: không còn tiếp diễn như trước nữa

- EN: We don't use the old entrance any more.
- VI: Chúng tôi không còn sử dụng lối vào cũ nữa.

Grammar / uncertainty: Usually with a negative clause; distinguish temporal any more from an additional amount.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 62. apart

Group key: `NORMALIZED_HEADWORD:apart`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**separated by a distance — ADVERB** (`EDITORIAL_2H2B:apart:separated`)

Definition: With space or time separating people or things.
Vietnamese: cách nhau một khoảng không gian hoặc thời gian

- EN: The festival dates are nearly a month apart.
- VI: Hai ngày tổ chức lễ hội cách nhau gần một tháng.

Grammar / uncertainty: distance or time span + apart; usually not an adjective before a noun.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**into separate parts — ADVERB** (`EDITORIAL_2H2B:apart:into-pieces`)

Definition: Into separate pieces or parts rather than remaining together.
Vietnamese: thành các phần rời thay vì liền với nhau

- EN: She took the toy apart to replace the battery.
- VI: Cô ấy tháo món đồ chơi ra để thay pin.

Grammar / uncertainty: take something apart; distinguish dismantling from mere distance.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 63. apple

Group key: `NORMALIZED_HEADWORD:apple`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a round tree fruit — NOUN** (`EDITORIAL_2H2B:apple:fruit`)

Definition: A round fruit with firm flesh, a central core and usually red, green or yellow skin.
Vietnamese: quả táo có thịt giòn, lõi ở giữa và vỏ thường đỏ, xanh hoặc vàng

- EN: I packed an apple and a sandwich for the trip.
- VI: Tôi chuẩn bị một quả táo và một chiếc bánh mì kẹp cho chuyến đi.

Grammar / uncertainty: Countable fruit noun; this is not a company-name identity.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 64. aquarium

Group key: `NORMALIZED_HEADWORD:aquarium`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a tank for aquatic life — NOUN** (`EDITORIAL_2H2B:aquarium:tank`)

Definition: A transparent tank in which fish or other water-living creatures are kept.
Vietnamese: bể có thành trong suốt dùng để nuôi cá hoặc sinh vật sống dưới nước

- EN: A small aquarium stood beside the classroom window.
- VI: Một bể cá nhỏ đặt cạnh cửa sổ lớp học.

Grammar / uncertainty: Countable; the public visitor attraction is a possible separate sense needing evidence review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 65. architect

Group key: `NORMALIZED_HEADWORD:architect`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a building designer — NOUN** (`EDITORIAL_2H2B:architect:building-designer`)

Definition: A person trained to design buildings and plan how they are constructed.
Vietnamese: người được đào tạo để thiết kế công trình và lập kế hoạch xây dựng

- EN: The architect included wide windows in the house design.
- VI: Kiến trúc sư đưa các cửa sổ rộng vào bản thiết kế ngôi nhà.

Grammar / uncertainty: Occupation noun; figurative architect of a plan is not included here.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 66. arm

Group key: `NORMALIZED_HEADWORD:arm`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**an upper limb — NOUN** (`EDITORIAL_2H2B:arm:body-part`)

Definition: One of the parts of the body that extends from the shoulder to the hand.
Vietnamese: cánh tay, phần cơ thể kéo dài từ vai đến bàn tay

- EN: She raised her arm to ask a question.
- VI: Cô ấy giơ tay để đặt câu hỏi.

Grammar / uncertainty: Countable body part; distinct from weapons.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**provide with weapons — VERB** (`EDITORIAL_2H2B:arm:provide-weapons`)

Definition: To provide a person or group with weapons.
Vietnamese: trang bị vũ khí cho một người hoặc nhóm

- EN: The report described plans to arm the guards.
- VI: Báo cáo mô tả kế hoạch trang bị vũ khí cho lực lượng bảo vệ.

Grammar / uncertainty: arm someone; neutral reporting only, no instructions for weapon use.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**weapons — NOUN** (`EDITORIAL_2H2B:arm:weapons`)

Definition: Weapons, especially when considered as military equipment.
Vietnamese: vũ khí, nhất là trang bị quân sự

- EN: The agreement restricted the sale of arms.
- VI: Thỏa thuận hạn chế việc bán vũ khí.

Grammar / uncertainty: Usually plural arms in this sense; not a reference to body parts.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 67. articulate

Group key: `NORMALIZED_HEADWORD:articulate`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**express clearly — VERB** (`EDITORIAL_2H2B:articulate:express`)

Definition: To express an idea or feeling clearly in words.
Vietnamese: diễn đạt rõ một ý nghĩ hoặc cảm xúc bằng lời

- EN: She articulated the team's concerns during the meeting.
- VI: Cô ấy trình bày rõ những lo ngại của nhóm trong cuộc họp.

Grammar / uncertainty: articulate + idea or concern; source adjective evidence needs independent confirmation.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**good at expressing ideas — ADJECTIVE** (`EDITORIAL_2H2B:articulate:eloquent`)

Definition: Able to express ideas and feelings clearly and effectively.
Vietnamese: có khả năng diễn đạt ý nghĩ và cảm xúc rõ ràng

- EN: The articulate speaker made the complicated issue easy to follow.
- VI: Người diễn thuyết có cách diễn đạt rõ ràng giúp mọi người dễ theo dõi vấn đề phức tạp.

Grammar / uncertainty: A person can be articulate; the POS conflict supports review, not automatic splitting approval.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 68. at the onset

Group key: `NORMALIZED_HEADWORD:at the onset`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**at the beginning — OTHER** (`EDITORIAL_2H2B:at the onset:at-beginning`)

Definition: At the time when an event or process begins.
Vietnamese: vào lúc một sự việc hoặc quá trình bắt đầu

- EN: At the onset of winter, the birds moved south.
- VI: Vào đầu mùa đông, những con chim di chuyển về phương nam.

Grammar / uncertainty: at the onset of + noun; phrase-level adverbial prepositional construction, not the source-tagged noun onset by itself.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 69. attack

Group key: `NORMALIZED_HEADWORD:attack`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**an attempt to harm — NOUN** (`EDITORIAL_2H2B:attack:assault-noun`)

Definition: An attempt to harm or damage someone or something.
Vietnamese: cuộc tấn công nhằm gây hại cho người hoặc vật

- EN: The museum increased security after an attack on the building.
- VI: Bảo tàng tăng cường an ninh sau một cuộc tấn công vào tòa nhà.

Grammar / uncertainty: an attack on + target; disease episodes are not included in this proposal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**try to harm — VERB** (`EDITORIAL_2H2B:attack:assault-verb`)

Definition: To act violently against someone or something in order to cause harm.
Vietnamese: tấn công người hoặc vật nhằm gây hại

- EN: The dog attacked the fence rather than the people behind it.
- VI: Con chó tấn công hàng rào thay vì những người ở phía sau.

Grammar / uncertainty: Transitive; illustrative context only, no violent instructions.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 70. attorney

Group key: `NORMALIZED_HEADWORD:attorney`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a lawyer — NOUN** (`EDITORIAL_2H2B:attorney:lawyer`)

Definition: A lawyer who can act for a client in legal matters.
Vietnamese: luật sư có thể đại diện cho khách hàng trong các vấn đề pháp lý

- EN: The attorney explained the contract's unclear wording.
- VI: Luật sư giải thích cách diễn đạt chưa rõ trong hợp đồng.

Grammar / uncertainty: Especially American English; jurisdiction-specific qualifications need review, not legal advice.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 71. automatic

Group key: `NORMALIZED_HEADWORD:automatic`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**working without manual action — ADJECTIVE** (`EDITORIAL_2H2B:automatic:self-operating`)

Definition: Working or happening without someone controlling each step by hand.
Vietnamese: hoạt động hoặc diễn ra mà không cần điều khiển thủ công từng bước

- EN: An automatic gate let the delivery van enter the courtyard.
- VI: Một chiếc cổng tự động mở cho xe giao hàng đi vào sân.

Grammar / uncertainty: automatic + device or process; habitual human responses may require a distinct sense.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 72. automatically

Group key: `NORMALIZED_HEADWORD:automatically`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**without manual control — ADVERB** (`EDITORIAL_2H2B:automatically:without-manual-control`)

Definition: Without a person having to control or start each step separately.
Vietnamese: không cần người điều khiển hoặc khởi động riêng từng bước

- EN: The computer saves the document automatically every few minutes.
- VI: Máy tính tự động lưu tài liệu sau mỗi vài phút.

Grammar / uncertainty: Modifies a process; not a guarantee that a system cannot fail.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 73. awesome

Group key: `NORMALIZED_HEADWORD:awesome`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**extremely good — ADJECTIVE** (`EDITORIAL_2H2B:awesome:excellent`)

Definition: Extremely good or impressive in an informal description.
Vietnamese: rất tuyệt hoặc gây ấn tượng mạnh trong cách nói thân mật

- EN: The view from the hill was awesome.
- VI: Khung cảnh nhìn từ ngọn đồi thật tuyệt vời.

Grammar / uncertainty: Informal praise; the older awe-inspiring sense needs separate contextual review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 74. bad

Group key: `NORMALIZED_HEADWORD:bad`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**poor or unpleasant — ADJECTIVE** (`EDITORIAL_2H2B:bad:poor-quality`)

Definition: Not good in quality, effect or experience.
Vietnamese: kém về chất lượng, tác động hoặc trải nghiệm

- EN: A bad connection interrupted the video call.
- VI: Kết nối kém làm gián đoạn cuộc gọi video.

Grammar / uncertainty: bad + thing or experience; not the food-spoilage sense.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**spoiled — ADJECTIVE** (`EDITORIAL_2H2B:bad:spoiled-food`)

Definition: No longer fresh or suitable to eat.
Vietnamese: bị hỏng hoặc không còn phù hợp để ăn

- EN: The milk smelled bad, so we did not use it.
- VI: Sữa có mùi hỏng nên chúng tôi không dùng.

Grammar / uncertainty: Food context; smell is illustrative, not a complete food-safety test.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 75. balloon

Group key: `NORMALIZED_HEADWORD:balloon`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**an inflated flexible object — NOUN** (`EDITORIAL_2H2B:balloon:inflated-object`)

Definition: A thin flexible container filled with air or gas so that it becomes rounded.
Vietnamese: vật có vỏ mỏng, mềm được bơm khí để phồng lên

- EN: A yellow balloon floated above the party table.
- VI: Một quả bóng bay màu vàng lơ lửng phía trên bàn tiệc.

Grammar / uncertainty: Countable; a balloon used for travel is outside this basic object proposal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 76. banana

Group key: `NORMALIZED_HEADWORD:banana`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a long curved fruit — NOUN** (`EDITORIAL_2H2B:banana:fruit`)

Definition: A long, usually curved fruit with a soft inside and a peel removed before eating.
Vietnamese: quả chuối dài, thường cong, có phần ruột mềm bên trong lớp vỏ

- EN: He sliced a banana into his bowl of porridge.
- VI: Anh ấy thái một quả chuối vào bát cháo yến mạch.

Grammar / uncertainty: Countable fruit; review word choice for local varieties without changing identity automatically.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 77. bank

Group key: `NORMALIZED_HEADWORD:bank`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a financial institution — NOUN** (`EDITORIAL_2H2B:bank:financial-institution`)

Definition: An organization that keeps money for customers and provides financial services.
Vietnamese: ngân hàng, tổ chức giữ tiền và cung cấp các dịch vụ tài chính

- EN: I visited the bank to open a savings account.
- VI: Tôi đến ngân hàng để mở một tài khoản tiết kiệm.

Grammar / uncertainty: Financial context; do not merge with the river-edge proposal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**the edge of a river — NOUN** (`EDITORIAL_2H2B:bank:river-edge`)

Definition: The land immediately beside a river or similar flowing water.
Vietnamese: bờ đất sát một con sông hoặc dòng nước

- EN: We sat on the grassy bank and watched the boats pass.
- VI: Chúng tôi ngồi trên bờ sông phủ cỏ và nhìn thuyền đi qua.

Grammar / uncertainty: Usually the bank of a river; separate meaning even though POS is also NOUN.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 78. basis

Group key: `NORMALIZED_HEADWORD:basis`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a supporting foundation — NOUN** (`EDITORIAL_2H2B:basis:foundation`)

Definition: The information, reason or principle on which something is developed or decided.
Vietnamese: thông tin, lý do hoặc nguyên tắc làm cơ sở cho một việc

- EN: These interviews form the basis of our report.
- VI: Những cuộc phỏng vấn này tạo cơ sở cho báo cáo của chúng tôi.

Grammar / uncertainty: basis of or basis for + noun; plural bases.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 79. basket

Group key: `NORMALIZED_HEADWORD:basket`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a carrying container — NOUN** (`EDITORIAL_2H2B:basket:container`)

Definition: A container, often made from woven material, used to hold or carry things.
Vietnamese: giỏ dùng để đựng hoặc mang đồ, thường được làm bằng vật liệu đan

- EN: She placed the folded clothes in a basket.
- VI: Cô ấy đặt quần áo đã gấp vào một chiếc giỏ.

Grammar / uncertainty: Countable; a shopping basket can also be virtual, but that sense is not proposed here.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 80. bed

Group key: `NORMALIZED_HEADWORD:bed`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**furniture for sleeping — NOUN** (`EDITORIAL_2H2B:bed:sleeping-furniture`)

Definition: A piece of furniture that supports a person while they sleep or rest.
Vietnamese: giường, đồ nội thất dùng để nằm ngủ hoặc nghỉ

- EN: The guest room has a narrow bed beside the window.
- VI: Phòng dành cho khách có một chiếc giường hẹp cạnh cửa sổ.

Grammar / uncertainty: in bed often has no article; flower beds are a different possible sense.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 81. big

Group key: `NORMALIZED_HEADWORD:big`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**large in size — ADJECTIVE** (`EDITORIAL_2H2B:big:large`)

Definition: Having a large size or extent compared with similar things.
Vietnamese: lớn về kích thước hoặc phạm vi so với những thứ tương tự

- EN: A big suitcase would not fit under the seat.
- VI: Một chiếc va li lớn không thể đặt vừa dưới ghế.

Grammar / uncertainty: Physical size in this example; not the importance proposal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**important — ADJECTIVE** (`EDITORIAL_2H2B:big:important`)

Definition: Having an important effect or meaning in a particular situation.
Vietnamese: có ý nghĩa hoặc tác động quan trọng trong một tình huống

- EN: Moving to a new city was a big decision for her.
- VI: Chuyển đến một thành phố mới là một quyết định quan trọng đối với cô ấy.

Grammar / uncertainty: Figurative big decision or change; size alone does not capture this meaning.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 82. billion

Group key: `NORMALIZED_HEADWORD:billion`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**one thousand million — OTHER** (`EDITORIAL_2H2B:billion:large-number`)

Definition: The number equal to one thousand groups of one million.
Vietnamese: số một tỷ, bằng một nghìn lần một triệu

- EN: The project cost more than a billion dollars.
- VI: Dự án tốn hơn một tỷ đô la.

Grammar / uncertainty: Source NUMBER has no direct Master POS enum; OTHER is a local review proposal, not an approved noun conversion. Use billion after exact numbers without plural s.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 83. bite

Group key: `NORMALIZED_HEADWORD:bite`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**cut or grip with teeth — VERB** (`EDITORIAL_2H2B:bite:use-teeth`)

Definition: To use the teeth to cut into or hold something.
Vietnamese: dùng răng cắn vào hoặc giữ một vật

- EN: The puppy tried to bite the corner of the cushion.
- VI: Chú chó con cố cắn góc chiếc đệm.

Grammar / uncertainty: bite, bit, bitten; keep the physical action separate from a wound or portion of food.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**a mark from teeth or an insect — NOUN** (`EDITORIAL_2H2B:bite:injury`)

Definition: A mark or injury caused by teeth or by an insect feeding on the skin.
Vietnamese: vết cắn hoặc vết đốt do động vật hay côn trùng gây ra

- EN: She noticed an insect bite on her ankle.
- VI: Cô ấy nhận thấy một vết côn trùng đốt ở mắt cá chân.

Grammar / uncertainty: Countable mark; not a diagnosis or treatment instruction.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**a small mouthful — NOUN** (`EDITORIAL_2H2B:bite:small-mouthful`)

Definition: A small amount of food taken into the mouth at one time.
Vietnamese: miếng thức ăn nhỏ được đưa vào miệng trong một lần

- EN: He took a bite of the sandwich before answering.
- VI: Anh ấy ăn một miếng bánh mì kẹp trước khi trả lời.

Grammar / uncertainty: a bite of + food; separate from a wound.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 84. block

Group key: `NORMALIZED_HEADWORD:block`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a section of streets — NOUN** (`EDITORIAL_2H2B:block:street-section`)

Definition: A section of a town bounded by streets, or the distance along one side of it.
Vietnamese: khu phố được bao quanh bởi các đường hoặc quãng đường dọc một cạnh của khu đó

- EN: The library is two blocks from the station.
- VI: Thư viện cách nhà ga hai dãy phố.

Grammar / uncertainty: Especially useful in grid street layouts; lengths vary.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**prevent passage — VERB** (`EDITORIAL_2H2B:block:obstruct`)

Definition: To stop movement or access by putting an obstacle in the way.
Vietnamese: chặn đường đi hoặc ngăn việc tiếp cận bằng một vật cản

- EN: A fallen branch blocked the narrow path.
- VI: Một cành cây bị gãy chắn lối đi hẹp.

Grammar / uncertainty: block + route or entrance; no street-section identity implied.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**a solid piece — NOUN** (`EDITORIAL_2H2B:block:solid-piece`)

Definition: A solid piece of material, often with flat sides.
Vietnamese: khối vật liệu đặc, thường có các mặt phẳng

- EN: The sculptor started with a block of wood.
- VI: Nhà điêu khắc bắt đầu với một khối gỗ.

Grammar / uncertainty: a block of + material; distinct from a section of a town.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 85. book

Group key: `NORMALIZED_HEADWORD:book`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a written volume — NOUN** (`EDITORIAL_2H2B:book:written-volume`)

Definition: A set of pages or a digital work containing writing intended to be read as a whole.
Vietnamese: tác phẩm gồm các trang giấy hoặc nội dung số được viết để đọc thành một chỉnh thể

- EN: She borrowed a book about birds from the library.
- VI: Cô ấy mượn một cuốn sách về các loài chim ở thư viện.

Grammar / uncertainty: Countable; do not infer identity with an existing booking Sense from the same spelling.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**reserve in advance — VERB** (`EDITORIAL_2H2B:book:reserve`)

Definition: To arrange in advance to use a service, place or ticket.
Vietnamese: đặt trước dịch vụ, chỗ hoặc vé

- EN: We booked a table for six at the small restaurant.
- VI: Chúng tôi đặt trước một bàn cho sáu người tại nhà hàng nhỏ.

Grammar / uncertainty: book + ticket, room or table; compare with existing booking evidence without reusing an ID.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 86. bowl

Group key: `NORMALIZED_HEADWORD:bowl`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a rounded open dish — NOUN** (`EDITORIAL_2H2B:bowl:dish`)

Definition: A deep, rounded container that is open at the top, commonly used for food.
Vietnamese: bát hoặc tô sâu, có dạng tròn và miệng mở, thường dùng đựng thức ăn

- EN: She poured the soup into a blue bowl.
- VI: Cô ấy rót súp vào một chiếc bát màu xanh.

Grammar / uncertainty: Countable dish; the sporting verb bowl is outside this evidence scope.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 87. bread

Group key: `NORMALIZED_HEADWORD:bread`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a baked staple food — NOUN** (`EDITORIAL_2H2B:bread:baked-food`)

Definition: Food made by baking dough, often sliced or divided into rolls.
Vietnamese: bánh mì, thực phẩm làm bằng cách nướng bột nhào

- EN: We bought fresh bread for the family breakfast.
- VI: Chúng tôi mua bánh mì mới cho bữa sáng của gia đình.

Grammar / uncertainty: Usually uncountable: a loaf or a slice of bread; not a bread for an ordinary portion.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 88. broadly

Group key: `NORMALIZED_HEADWORD:broadly`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**in general terms — ADVERB** (`EDITORIAL_2H2B:broadly:in-general`)

Definition: Considering the main features rather than every detail.
Vietnamese: xét một cách khái quát, không đi vào từng chi tiết

- EN: Broadly speaking, the two plans aim for the same result.
- VI: Nói một cách khái quát, hai kế hoạch hướng tới cùng một kết quả.

Grammar / uncertainty: broadly speaking; this is summary scope, not spatial width.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**across a wide range — ADVERB** (`EDITORIAL_2H2B:broadly:widely`)

Definition: Across many areas, people or kinds of activity.
Vietnamese: trên nhiều lĩnh vực, đối tượng hoặc loại hoạt động

- EN: The training programme is broadly applicable across departments.
- VI: Chương trình đào tạo có thể áp dụng rộng rãi ở nhiều phòng ban.

Grammar / uncertainty: broadly applicable; collocation and boundary with generally need human review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

### 89. buck

Group key: `NORMALIZED_HEADWORD:buck`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a dollar — NOUN** (`EDITORIAL_2H2B:buck:dollar`)

Definition: An informal word for a dollar in a context where that currency is understood.
Vietnamese: cách gọi thân mật cho một đô la khi đã rõ loại tiền tệ

- EN: The notebook cost five bucks at the market.
- VI: Cuốn sổ có giá năm đô la ở chợ.

Grammar / uncertainty: Informal; specify currency context when necessary. Animal and verb uses are not in this proposal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 90. cable

Group key: `NORMALIZED_HEADWORD:cable`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**an insulated connection — NOUN** (`EDITORIAL_2H2B:cable:wire-bundle`)

Definition: A group of wires or fibres enclosed together to carry power or signals.
Vietnamese: dây cáp gồm các dây dẫn hoặc sợi được bọc chung để truyền điện hay tín hiệu

- EN: I replaced the damaged cable connecting the screen to the computer.
- VI: Tôi thay dây cáp bị hỏng nối màn hình với máy tính.

Grammar / uncertainty: Countable; a rope-like load-bearing cable may need a separate sense review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

### 91. carbon dioxide

Group key: `NORMALIZED_HEADWORD:carbon dioxide`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a carbon-and-oxygen gas — NOUN** (`EDITORIAL_2H2B:carbon dioxide:gas`)

Definition: A gas made of carbon and oxygen that is released in breathing and many burning processes.
Vietnamese: khí cacbon đioxit gồm cacbon và oxy, được thải ra khi hô hấp và trong nhiều quá trình đốt cháy

- EN: The class discussed how plants use carbon dioxide.
- VI: Cả lớp thảo luận về cách thực vật sử dụng khí cacbon đioxit.

Grammar / uncertainty: Usually uncountable; chemical formula and scientific precision require subject review before publication.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 92. coral reef

Group key: `NORMALIZED_HEADWORD:coral reef`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a coral-built marine structure — NOUN** (`EDITORIAL_2H2B:coral reef:marine-formation`)

Definition: A ridge or larger structure in the sea built mainly from the hard material produced by corals.
Vietnamese: rạn trong biển được tạo nên chủ yếu từ phần vật liệu cứng do san hô tạo ra

- EN: Divers observed small fish sheltering in the coral reef.
- VI: Những người lặn quan sát cá nhỏ trú trong rạn san hô.

Grammar / uncertainty: Countable compound noun; a reef is not just one living coral animal.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 93. cosmopolitan city

Group key: `NORMALIZED_HEADWORD:cosmopolitan city`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a culturally diverse city — NOUN** (`EDITORIAL_2H2B:cosmopolitan city:diverse-city`)

Definition: A city where people from many countries and cultural backgrounds live or meet.
Vietnamese: thành phố nơi nhiều cộng đồng từ các quốc gia và nền văn hóa khác nhau sinh sống hoặc gặp gỡ

- EN: The port developed into a cosmopolitan city over many years.
- VI: Qua nhiều năm, thành phố cảng phát triển thành một đô thị có nhiều cộng đồng văn hóa khác nhau.

Grammar / uncertainty: A compositional noun phrase; owner must decide whether it needs a Lexeme or should be represented as a construction/example.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 94. fossil fuel

Group key: `NORMALIZED_HEADWORD:fossil fuel`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**fuel from ancient organic matter — NOUN** (`EDITORIAL_2H2B:fossil fuel:ancient-organic-fuel`)

Definition: A fuel such as coal, oil or natural gas formed from ancient organic material.
Vietnamese: nhiên liệu như than đá, dầu mỏ hoặc khí tự nhiên hình thành từ vật chất hữu cơ cổ

- EN: The factory is reducing its use of fossil fuel.
- VI: Nhà máy đang giảm việc sử dụng nhiên liệu hóa thạch.

Grammar / uncertainty: Category noun; plural fossil fuels for different types.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 95. greenhouse gas

Group key: `NORMALIZED_HEADWORD:greenhouse gas`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a heat-trapping atmospheric gas — NOUN** (`EDITORIAL_2H2B:greenhouse gas:heat-trapping-gas`)

Definition: A gas in the atmosphere that absorbs outgoing infrared radiation and helps retain heat.
Vietnamese: khí trong khí quyển hấp thụ bức xạ hồng ngoại thoát ra và góp phần giữ nhiệt

- EN: The lesson explained why methane is a greenhouse gas.
- VI: Bài học giải thích vì sao khí metan là một khí nhà kính.

Grammar / uncertainty: Scientific wording remains a subject-review requirement; do not infer exam suitability.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: []; see pinned note references in pilot-sense-proposals.json.

### 96. have to

Group key: `NORMALIZED_HEADWORD:have to`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**be required to — VERB** (`EDITORIAL_2H2B:have to:necessity`)

Definition: To need to do something because a rule, responsibility or situation makes it necessary.
Vietnamese: phải làm một việc vì quy định, trách nhiệm hoặc hoàn cảnh

- EN: We have to leave early to catch the first bus.
- VI: Chúng tôi phải đi sớm để kịp chuyến xe buýt đầu tiên.

Grammar / uncertainty: have to + base verb; don't have to means no necessity, not prohibition. The negative source group is treated as a polarity pattern, not automatically a new Sense.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0, 1]; see pinned note references in pilot-sense-proposals.json.

### 97. light

Group key: `NORMALIZED_HEADWORD:light`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**illumination — NOUN** (`EDITORIAL_2H2B:light:illumination`)

Definition: The brightness that makes things visible.
Vietnamese: ánh sáng giúp nhìn thấy các vật

- EN: Morning light entered through the narrow window.
- VI: Ánh sáng buổi sáng chiếu vào qua cửa sổ hẹp.

Grammar / uncertainty: Usually uncountable; separate from a lamp or device.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**a lighting device — NOUN** (`EDITORIAL_2H2B:light:lamp`)

Definition: A device that produces illumination for a room or place.
Vietnamese: đèn hoặc thiết bị tạo ánh sáng cho một nơi

- EN: Please switch off the hallway light before leaving.
- VI: Hãy tắt đèn hành lang trước khi rời đi.

Grammar / uncertainty: Countable device; existing Master noun meanings need comparison, not lemma-only reuse.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**not heavy — ADJECTIVE** (`EDITORIAL_2H2B:light:low-weight`)

Definition: Having relatively little weight and being easy to lift or carry.
Vietnamese: nhẹ về trọng lượng và dễ nâng hoặc mang

- EN: The empty basket was light enough for the child to carry.
- VI: Chiếc giỏ rỗng đủ nhẹ để đứa trẻ mang được.

Grammar / uncertainty: Weight adjective; does not mean pale in colour.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

**make begin burning — VERB** (`EDITORIAL_2H2B:light:ignite`)

Definition: To cause something to start burning.
Vietnamese: châm hoặc thắp để một vật bắt đầu cháy

- EN: She lit the candle before the ceremony began.
- VI: Cô ấy thắp nến trước khi buổi lễ bắt đầu.

Grammar / uncertainty: light, lit or lighted; no procedural instruction for hazardous fire-setting.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [3]; see pinned note references in pilot-sense-proposals.json.

**pale in colour — ADJECTIVE** (`EDITORIAL_2H2B:light:pale-colour`)

Definition: Having a pale colour rather than a dark one.
Vietnamese: có màu nhạt thay vì màu đậm hoặc tối

- EN: He chose a light blue shirt for the photograph.
- VI: Anh ấy chọn một chiếc áo sơ mi xanh nhạt để chụp ảnh.

Grammar / uncertainty: Colour adjective; separate from low weight even though both are adjectives.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [4]; see pinned note references in pilot-sense-proposals.json.

### 98. record

Group key: `NORMALIZED_HEADWORD:record`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**a best recorded result — NOUN** (`EDITORIAL_2H2B:record:best-result`)

Definition: The best known result achieved in a particular activity.
Vietnamese: thành tích tốt nhất được ghi nhận trong một hoạt động

- EN: The runner set a new school record for the race.
- VI: Vận động viên lập kỷ lục mới của trường trong cuộc đua.

Grammar / uncertainty: set or break a record; not an ordinary written file.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**capture for later use — VERB** (`EDITORIAL_2H2B:record:capture-information`)

Definition: To store sounds, images or information so they can be used later.
Vietnamese: ghi âm, ghi hình hoặc ghi lại thông tin để dùng về sau

- EN: We recorded the interview with the guest's permission.
- VI: Chúng tôi ghi âm cuộc phỏng vấn với sự cho phép của khách mời.

Grammar / uncertainty: Transitive; noun/verb stress differs and requires pronunciation review. Information capture subtypes may need later splitting.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**stored information — NOUN** (`EDITORIAL_2H2B:record:stored-information`)

Definition: Information kept in writing or another stored form about something that happened.
Vietnamese: thông tin được lưu lại bằng văn bản hoặc hình thức khác về một việc đã xảy ra

- EN: The office keeps a record of every equipment repair.
- VI: Văn phòng lưu hồ sơ về mọi lần sửa chữa thiết bị.

Grammar / uncertainty: a record of + event; a physical audio disc is not proposed from this group alone.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

### 99. run

Group key: `NORMALIZED_HEADWORD:run`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**move quickly on foot — VERB** (`EDITORIAL_2H2B:run:move-fast`)

Definition: To move on foot faster than walking, with moments when neither foot touches the ground.
Vietnamese: chạy bằng chân nhanh hơn đi bộ

- EN: The children ran across the field to meet their teacher.
- VI: Bọn trẻ chạy qua sân để gặp giáo viên.

Grammar / uncertainty: run, ran, run; running as movement is distinct from managing an organization.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**operate — VERB** (`EDITORIAL_2H2B:run:operate`)

Definition: To operate or function as a machine, program or system.
Vietnamese: chạy hoặc hoạt động, dùng cho máy móc hay hệ thống

- EN: The generator ran quietly throughout the evening.
- VI: Máy phát điện chạy êm suốt buổi tối.

Grammar / uncertainty: Intransitive in this example; run a program is a related transitive use needing boundary review.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.

**manage an organization — VERB** (`EDITORIAL_2H2B:run:manage`)

Definition: To organize and control the work of a business or other organization.
Vietnamese: điều hành công việc của một doanh nghiệp hoặc tổ chức

- EN: Her family runs a small bakery near the station.
- VI: Gia đình cô ấy điều hành một tiệm bánh nhỏ gần nhà ga.

Grammar / uncertainty: run + organization; no identity equivalence with physical motion.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [2]; see pinned note references in pilot-sense-proposals.json.

**a running session — NOUN** (`EDITORIAL_2H2B:run:exercise-session`)

Definition: A period or outing spent running, usually for exercise.
Vietnamese: một buổi hoặc chặng chạy, thường để tập thể dục

- EN: Their Sunday run ended beside the old lighthouse.
- VI: Buổi chạy vào Chủ nhật của họ kết thúc cạnh ngọn hải đăng cũ.

Grammar / uncertainty: go for a run; countable session, not a verb use.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [3]; see pinned note references in pilot-sense-proposals.json.

### 100. water

Group key: `NORMALIZED_HEADWORD:water`. Owner: UNRESOLVED. Rights: UNKNOWN_REVIEW_REQUIRED.

**the common clear liquid — NOUN** (`EDITORIAL_2H2B:water:liquid`)

Definition: The usually colourless liquid found in rain, rivers and seas that living things need.
Vietnamese: nước, chất lỏng thường không màu có trong mưa, sông và biển, cần cho sự sống

- EN: She filled the glass with water from the jug.
- VI: Cô ấy rót nước từ bình vào cốc.

Grammar / uncertainty: Usually uncountable; runtime #11 remains distinct from the owner-excluded existing Master verb pair.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [0]; see pinned note references in pilot-sense-proposals.json.

**give water to plants — VERB** (`EDITORIAL_2H2B:water:give-water`)

Definition: To give water to a plant or an area of soil so that plants can grow.
Vietnamese: tưới nước cho cây hoặc đất trồng để cây phát triển

- EN: We watered the young trees after sunset.
- VI: Chúng tôi tưới những cây non sau khi mặt trời lặn.

Grammar / uncertainty: Transitive; possible similarity to the existing Master verb is a review candidate, never approval to map runtime #11.
QA: REVIEW; identity, bilingual content, grammar, CEFR and rights pending. Source Oxford ordinals: [1]; see pinned note references in pilot-sense-proposals.json.
