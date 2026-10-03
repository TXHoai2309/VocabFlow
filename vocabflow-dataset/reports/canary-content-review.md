# Canary content review — Master Vocabulary V2

**Owner review only.** This package records a proposed subset from the current pinned DRAFT pilot. It does not approve content, change the manifest, choose runtime identities, or authorize an import.

- Dataset: vocabflow-master-v2 2.0.0; current manifest status: **DRAFT**
- Source manifest file SHA-256: `2b0da6b4e8128a894027bdbd08c9ffeaee4ffd913feddfad929290d75a886787`
- Proposed review set: **8 Senses** across **6 Lexemes**.
- No runtime target is available. Runtime progress/review counts, overrides, quarantine and contentVersion are unavailable; see the separate reconciliation candidates file.
- All fields below are a source review aid. Experimental CEFR/difficulty values are explicitly editorial and non-official.
- Topic/Level below show the full DRAFT PREVIEW projection. The proposed minimal APPROVED canary omits in-review classifications and the current DRAFT taxonomy, so its runtime Topic and Level would be null.

## Review decisions

Review each Sense and its exact selected child IDs below. Record the same decisions in `canary-owner-approval-v2.json`; the release tool accepts only that explicit JSON artifact.

- `APPROVE` requires a reviewer, date, and APPROVED decisions for every learner-facing field.
- `REQUEST_CHANGES` blocks that Sense from this canary until a reviewed immutable Master revision is supplied and the approval template is regenerated.
- `EXCLUDE_FROM_CANARY` omits that Sense; `PENDING` blocks release preparation.
- Complete `releaseApproval` at the end of `canary-owner-approval-v2.json` only after reviewing the exact selected subset; it is the release-level approval and supplies `releasedAt`.
- `2.1.0` is a MINOR content release: the 2.0.0 DRAFT history is preserved, the schema is unchanged, and a new approved canary snapshot is created.
- Lexeme identity and pronunciation, and any included Learning Set and item, require separate explicit review because the APPROVED manifest pins those records too.

## Proposed Learning Set canary

- [ ] Review **Technology starter** (`TECHNOLOGY_STARTER`, `01a0fc13-09f2-7709-a32d-5bef5b1f7a51`), currently IN_REVIEW. Its exact revision contains 1 item(s), all already in the proposed Sense subset.
  - Decision: [ ] APPROVE [ ] REQUEST CHANGES [ ] EXCLUDE FROM CANARY; review name [ ] description [ ] membership [ ]; reviewer: __________; date: __________.
  - Item `01a0fc13-09f2-765d-b327-41d62c73ecc1`: Sense `01a0fc13-09ef-710c-8e76-753a5cfea69c`, position 1, status IN_REVIEW; decision [ ] APPROVE [ ] EXCLUDE.
  - Selection Provenance is pinned in the dependency plan; PLANNED media remains outside runtime URLs.
- Other Learning Sets that intersect these Senses are excluded because their pinned revisions would add non-canary Senses.

### fruit — apple (NOUN)

- Purpose: simple concrete noun; fruit.
- Identity: lemma `apple`; masterLexemeId `01a0fc13-09ed-72c7-aef1-9124d94a6828`; masterSenseId `01a0fc13-09ed-70b4-801b-408be3b771e9`; POS `NOUN`; lexicalUnitType `WORD`.
- Vietnamese translation: quả táo
- Definition: A round fruit with firm flesh and skin that is usually red, green, or yellow.
- Example: She packed an apple for her afternoon snack.
- Example translation: Cô ấy mang theo một quả táo cho bữa ăn nhẹ buổi chiều.
- Selected IPA: none
- Legacy Topic (full DRAFT preview): Fruit; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio no audio slot; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — A1 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 12 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — General English (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — TEEN (IN_REVIEW), KIDS (IN_REVIEW), ADULT (IN_REVIEW).
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `—` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. No selected IPA is available; decide whether text-only pronunciation is acceptable.
- Exact selected IDs: Translation `01a0fc13-09ed-74f7-88ba-a0f8187dc38b`; Definition `01a0fc13-09ed-7095-9aec-8e6891154c2c`; Example `01a0fc13-09ed-7ed8-b9b0-57b9fc8a7c3c`; Example Translation `01a0fc13-09ed-7798-97b4-f528164f1a60`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________

### financial institution — bank (NOUN)

- Purpose: polysemy; financial institution.
- Identity: lemma `bank`; masterLexemeId `01a0fc13-09ed-77ca-b066-98b5169c16b8`; masterSenseId `01a0fc13-09ee-7211-8e5a-784c689a0c7a`; POS `NOUN`; lexicalUnitType `WORD`.
- Vietnamese translation: ngân hàng
- Definition: An organization that keeps and lends money and provides financial services.
- Example: She deposited her paycheck at the bank.
- Example translation: Cô ấy gửi tiền lương vào ngân hàng.
- Selected IPA: none
- Legacy Topic (full DRAFT preview): Finance; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio no audio slot; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — A2 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 32 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — Business English (IN_REVIEW), General English (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — not assigned.
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `—` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. No selected IPA is available; decide whether text-only pronunciation is acceptable.
- Exact selected IDs: Translation `01a0fc13-09ee-7361-828e-95ee6e59ee22`; Definition `01a0fc13-09ee-7db4-93a1-795b4c5acc47`; Example `01a0fc13-09ee-7a73-b99c-fe636e2e77cf`; Example Translation `01a0fc13-09ee-77b8-97aa-e9c8c4f7ef4f`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________

### side of a river — bank (NOUN)

- Purpose: polysemy; river edge.
- Identity: lemma `bank`; masterLexemeId `01a0fc13-09ed-77ca-b066-98b5169c16b8`; masterSenseId `01a0fc13-09ee-7584-a480-e313e359f744`; POS `NOUN`; lexicalUnitType `WORD`.
- Vietnamese translation: bờ sông
- Definition: The sloping ground along the edge of a river.
- Example: We sat on the bank of the river and watched the boats.
- Example translation: Chúng tôi ngồi bên bờ sông và ngắm những chiếc thuyền.
- Selected IPA: none
- Legacy Topic (full DRAFT preview): Rivers; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio no audio slot; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — B1 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 46 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — General English (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — not assigned.
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `—` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. No selected IPA is available; decide whether text-only pronunciation is acceptable.
- Exact selected IDs: Translation `01a0fc13-09ee-773c-9f05-c241b035be3a`; Definition `01a0fc13-09ee-73cb-a49c-b14345623a87`; Example `01a0fc13-09ee-756e-84f0-4aa8e5a8f78d`; Example Translation `01a0fc13-09ee-7104-8318-d9aafb68c89f`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________

### music recording — record (NOUN)

- Purpose: same Lexeme as the verb; noun stress pattern.
- Identity: lemma `record`; masterLexemeId `01a0fc13-09ee-781c-8793-6ec31c09956e`; masterSenseId `01a0fc13-09ee-71ff-9a0a-a96e48ef7dac`; POS `NOUN`; lexicalUnitType `WORD`.
- Vietnamese translation: bản thu âm
- Definition: A piece of music or speech that has been recorded so it can be played again.
- Example: The record of the band's live concert can be streamed online.
- Example translation: Bản thu buổi hòa nhạc trực tiếp của ban nhạc có thể nghe trực tuyến.
- Selected IPA: `ˈɹɛk.ɚd` (Lexeme pronunciation)
- Legacy Topic (full DRAFT preview): Records and information; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio no audio slot; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — B1 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 44 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — General English (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — not assigned.
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `01a0fc13-09f0-74eb-b535-661bd926cf1c` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. Verify the lexeme pronunciation IPA and dialect/stress before publication.
- Exact selected IDs: Translation `01a0fc13-09ee-7224-8ec2-ecaf1c0b1bb4`; Definition `01a0fc13-09ee-70be-80e8-750d76467636`; Example `01a0fc13-09ee-7b2b-abac-821ced9ddc1a`; Example Translation `01a0fc13-09ee-70ce-ae1b-3e88aa2dc908`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________

### capture sound — record (VERB)

- Purpose: same Lexeme as the noun; verb stress pattern.
- Identity: lemma `record`; masterLexemeId `01a0fc13-09ee-781c-8793-6ec31c09956e`; masterSenseId `01a0fc13-09ee-7823-95fc-5d1d76f13fa5`; POS `VERB`; lexicalUnitType `WORD`.
- Vietnamese translation: ghi âm; ghi lại
- Definition: To capture sound, images, or information so it can be played or used later.
- Example: She will record the interview tomorrow.
- Example translation: Cô ấy sẽ ghi âm cuộc phỏng vấn vào ngày mai.
- Selected IPA: `ɹɪˈkɔɹd` (Sense override)
- Legacy Topic (full DRAFT preview): Records and information; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio WORD_PRONUNCIATION_AUDIO: PLANNED; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED; WORD_PRONUNCIATION_AUDIO: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — B2 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 54 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — General English (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — not assigned.
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `01a0fc13-09f0-7a52-ac26-1949740de386` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. Verify the sense override IPA and dialect/stress before publication.
- Exact selected IDs: Translation `01a0fc13-09ee-78c5-8f55-27e2e8dc0955`; Definition `01a0fc13-09ee-7543-95d9-795bbc90a6c1`; Example `01a0fc13-09ee-7330-a69c-dff44607f372`; Example Translation `01a0fc13-09ee-7cc8-99b6-d51894609012`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________

### take care of — look after (VERB)

- Purpose: phrasal verb.
- Identity: lemma `look after`; masterLexemeId `01a0fc13-09ee-73d5-affa-6e017eb9adb3`; masterSenseId `01a0fc13-09ee-79c7-85ff-cbe0fc14a249`; POS `VERB`; lexicalUnitType `PHRASAL_VERB`.
- Vietnamese translation: chăm sóc; trông nom
- Definition: To take responsibility for someone or something and make sure they are safe or cared for.
- Example: Can you look after my dog this weekend?
- Example translation: Cuối tuần này bạn trông giúp chó của tôi được không?
- Selected IPA: none
- Legacy Topic (full DRAFT preview): Care and relationships; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio no audio slot; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — A2 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 34 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — General English (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — not assigned.
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `—` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. No selected IPA is available; decide whether text-only pronunciation is acceptable.
- Exact selected IDs: Translation `01a0fc13-09ee-7142-8375-88b4a8e36b12`; Definition `01a0fc13-09ee-7668-ad7a-fb3ae553c73b`; Example `01a0fc13-09ee-7672-995d-747cf923c4c9`; Example Translation `01a0fc13-09ee-70bb-8a01-a427ae8eacc0`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________

### computing procedure — algorithm (NOUN)

- Purpose: technical domain; algorithm.
- Identity: lemma `algorithm`; masterLexemeId `01a0fc13-09ee-7113-8786-38671cd485b7`; masterSenseId `01a0fc13-09ef-710c-8e76-753a5cfea69c`; POS `NOUN`; lexicalUnitType `WORD`.
- Vietnamese translation: thuật toán
- Definition: A defined sequence of steps that a computer follows to solve a problem or process information.
- Example: The app uses an algorithm to sort the search results.
- Example translation: Ứng dụng dùng một thuật toán để sắp xếp kết quả tìm kiếm.
- Selected IPA: none
- Legacy Topic (full DRAFT preview): Computer science; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio no audio slot; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — B2 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 66 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — Academic English (IN_REVIEW), IT and technology (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — not assigned.
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `—` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. No selected IPA is available; decide whether text-only pronunciation is acceptable.
- Exact selected IDs: Translation `01a0fc13-09ef-7187-84e1-34c0242759b5`; Definition `01a0fc13-09ef-775c-bdc5-78f54f84cbed`; Example `01a0fc13-09ef-7542-ba90-310df4bf5b96`; Example Translation `01a0fc13-09ef-795b-a916-6a7a0d898a75`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________

### booking — reservation (NOUN)

- Purpose: travel and hospitality; reservation.
- Identity: lemma `reservation`; masterLexemeId `01a0fc13-09ef-7e5d-b757-aa456f0cd969`; masterSenseId `01a0fc13-09ef-7d37-a50f-d05db6b1a89c`; POS `NOUN`; lexicalUnitType `WORD`.
- Vietnamese translation: việc đặt chỗ trước
- Definition: An arrangement made in advance to keep a place, room, or table for someone.
- Example: I made a reservation for two at seven o'clock.
- Example translation: Tôi đã đặt bàn cho hai người lúc bảy giờ.
- Selected IPA: none
- Legacy Topic (full DRAFT preview): Travel; Level (full DRAFT preview): —. Proposed canary projection omits the unapproved classifications/taxonomy, so runtime Topic and Level are null.
- Media: image PLANNED; audio no audio slot; runtime imageUrl: null; runtime audioUrl: null. IMAGE: PLANNED.
- CEFR: EDITORIAL / NON-OFFICIAL — B1 — editorial estimate, non-official (IN_REVIEW); difficulty: EDITORIAL / NON-OFFICIAL — 48 on 01a0fc13-09e9-7df8-ae50-b2cea43242ae — editorial estimate, non-official (IN_REVIEW). Neither is an official learner claim.
- Domains: EDITORIAL / NON-OFFICIAL — Hospitality (IN_REVIEW), Travel English (IN_REVIEW) — editorial pilot metadata, omitted from the proposed release.
- Audience / age group: EDITORIAL / NON-OFFICIAL — not assigned.
- Exam / curriculum: EDITORIAL / NON-OFFICIAL — not assigned.
- Selected pronunciation ID: `—` (approve text/absence explicitly; audio URL stays null).
- Provenance: 5 source references; 5 exact Provenance pins resolve; sources still need owner review (PROJECT_AUTHORED).
- Current review status: Lexeme IN_REVIEW; selected content IN_REVIEW.
- Human review required: Lexeme, Sense and selected learner-facing child records are currently IN_REVIEW; owner must decide APPROVE, REQUEST CHANGES or EXCLUDE FROM CANARY. Confirm Vietnamese nuance and the selected definition/example translations before any learner-facing release. Media remains PLANNED; runtime media projection is null and no delivery may be assumed. CEFR and difficulty are editorial pilot estimates, not official claims; omit them from an approved release unless provenance and approval requirements are met. Domain assignments are editorial pilot metadata and are omitted from the minimal approved release. Topic comes from an IN_REVIEW editorial classification; include only after owner review of the Topic assignment and taxonomy snapshot. No selected IPA is available; decide whether text-only pronunciation is acceptable.
- Exact selected IDs: Translation `01a0fc13-09ef-73bc-a930-1cf6e11b7e3c`; Definition `01a0fc13-09ef-7b90-8334-fff3383108d8`; Example `01a0fc13-09ef-7424-9c6d-5f41f21db19d`; Example Translation `01a0fc13-09ef-70cd-b5d7-61357df8dc30`.
- Learner content: [ ] APPROVE  [ ] REQUEST CHANGES  [ ] EXCLUDE FROM CANARY
- Part of speech reviewed: [ ] approved; Translation: [ ] approved; Definition: [ ] approved; Example: [ ] approved; Example translation: [ ] approved; Pronunciation/absence: [ ] approved.
- Media runtime URLs: [ ] owner accepts imageUrl/audioUrl null for this canary.
- Reviewer: ____________________    Date: ____________________
- Notes: ____________________________________________________________________
