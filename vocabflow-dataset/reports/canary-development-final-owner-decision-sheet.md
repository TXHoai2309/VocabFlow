# Final Owner Decisions — Canary 2.1.0

- Release: dataset 2.1.0 / schema 2.0.1 / APPROVED
- Release hash: fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591
- Development target: Neon project shy-hill-72364426 / branch br-square-grass-b3af0nte / database neondb
- Snapshot fingerprint: 464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b
- Snapshot changed from Phase 2E.2: NO

All listed choices remain unselected. This sheet records evidence and exact consequences; it does not choose or rank runtime identities. Full field-by-field content impact is in canary-development-projection-loss-audit.md.

## 1. apple — fruit / quả táo

Master Sense: 01a0fc13-09ed-70b4-801b-408be3b771e9

Runtime candidates:

| Runtime ID | Current identity and contentVersion | Learner history | Source identity | Existing memberships |
| ---: | --- | --- | --- | --- |
| #1 | apple = quả táo; enabled; level null; contentVersion 2 | 3 progress rows (all LEARNING), 8 reviews | source_dataset/source_record_id null | starter-vocabulary (8 active assignment rows), grade-1-starter (2), everyday-words (1); normalized Topic food |
| #295 | apple = quả táo; enabled; level GRADE_1; contentVersion 1 | 1 progress row (LEARNING), 1 review | 2000_COMMON_ENGLISH_VOCABULARY_V1 / 265 | grade-1-food (1 active assignment row); normalized Topic food |

One learner has progress on both IDs (overlap count 1). Learner identifiers were not selected. Assignment counts above are per-set rows, not unique learners. Both runtime rows are reachable in current catalog/topic/learning flows. They share the same apple meaning; the evidence does not establish a separate Sense.

Choose exactly one:

- [ ] MAP_EXISTING #1
- [ ] MAP_EXISTING #295
- [ ] CREATE_NEW — creates a third apple runtime ID, allocated at APPLY time

If MAP_EXISTING:

- [ ] UPDATE_TO_MASTER
- [ ] Other existing action: ____________________

The current content differs from the approved projection for either existing row. ADOPT_EXISTING_AS_BASELINE does not pass the current planner because the projections differ. With UPDATE_TO_MASTER, #1 changes contentVersion 2 → 3; #295 changes 1 → 2.

Consequences of choosing #1: its 3 progress rows and 8 reviews remain on #1; #295 keeps its 1 progress row, 1 review, source identity, level and grade-1-food membership. Both IDs and their memberships remain. The legacy topic text on #1 becomes null; its normalized Food Topic link remains.

Consequences of choosing #295: its 1 progress row and 1 review remain on #295; #1 keeps its 3 progress rows, 8 reviews and three Learning Set memberships. Both IDs and their memberships remain. The legacy topic text and level on #295 become null; its normalized Food Topic link remains.

Consequences of CREATE_NEW: a third apple runtime ID is created at APPLY time with contentVersion 1. IDs #1 and #295, their histories and memberships remain separate. No history merge or duplicate cleanup occurs.

Projection-loss acknowledgement:

- [ ] I reviewed the IPA, Cloudinary image/audio URL, legacy topic, and (for #295) level changes listed in the projection-loss audit.

- Owner selection: ____________________
- Content action: ____________________
- Owner / date: ____________________

## 2. bank — financial institution / ngân hàng

Master Sense: 01a0fc13-09ee-7211-8e5a-784c689a0c7a

Evidence-backed proposal: MAP_EXISTING #871 + UPDATE_TO_MASTER. Runtime #871 represents the financial institution. Current contentVersion 1; no progress or review history; source identity 2000_COMMON_ENGLISH_VOCABULARY_V1 / 841. The update changes it to contentVersion 2 and clears current IPA, Cloudinary image/audio URLs, and legacy topic; it changes Vietnamese/definition, adds the Master example, and enables the row. See the field audit.

- [ ] ACCEPT MAP_EXISTING #871 + UPDATE_TO_MASTER
- [ ] CHANGE: ____________________
- [ ] I acknowledge the projection changes, including nulling the current imageUrl, audioUrl, IPA and legacy topic.

Owner / date: ____________________

## 3. bank — river edge / bờ sông

Master Sense: 01a0fc13-09ee-7584-a480-e313e359f744

Evidence-backed proposal: CREATE_NEW, contentVersion 1; runtime ID allocated at APPLY time. #871 is the financial-institution meaning and is not reused for this Sense.

- [ ] ACCEPT CREATE_NEW
- [ ] CHANGE: ____________________

Owner / date: ____________________

## 4. record — noun / music recording / bản thu âm

Master Sense: 01a0fc13-09ee-71ff-9a0a-a96e48ef7dac

Evidence-backed proposal: CREATE_NEW, contentVersion 1; runtime ID allocated at APPLY time. Runtime #849 represents a physical grooved/vinyl disc. It is not repurposed as the broader music-recording meaning.

- [ ] ACCEPT CREATE_NEW
- [ ] CHANGE: ____________________

Owner / date: ____________________

## 5. record — verb / ghi âm; ghi lại

Master Sense: 01a0fc13-09ee-7823-95fc-5d1d76f13fa5

Evidence-backed proposal: CREATE_NEW, contentVersion 1; runtime ID allocated at APPLY time. Runtime #849 is the physical-disc noun and does not identify the verb.

- [ ] ACCEPT CREATE_NEW
- [ ] CHANGE: ____________________

Owner / date: ____________________

## 6. look after — chăm sóc; trông nom

Master Sense: 01a0fc13-09ee-79c7-85ff-cbe0fc14a249

Evidence-backed proposal: CREATE_NEW; no runtime candidate found. Initial contentVersion 1; integer runtime ID allocated at APPLY time.

- [ ] ACCEPT CREATE_NEW
- [ ] CHANGE: ____________________

Owner / date: ____________________

## 7. algorithm — thuật toán

Master Sense: 01a0fc13-09ef-710c-8e76-753a5cfea69c

Evidence-backed proposal: CREATE_NEW; no runtime candidate found. Initial contentVersion 1; integer runtime ID allocated at APPLY time. This Sense is also the item in Technology Starter.

- [ ] ACCEPT CREATE_NEW
- [ ] CHANGE: ____________________

Owner / date: ____________________

## 8. reservation — booking / việc đặt chỗ trước

Master Sense: 01a0fc13-09ef-7d37-a50f-d05db6b1a89c

Evidence-backed proposal: MAP_EXISTING #284 + UPDATE_TO_MASTER. Current contentVersion 1; no progress or review history; source identity 2000_COMMON_ENGLISH_VOCABULARY_V1 / 254. The update changes it to contentVersion 2 and clears current IPA, Cloudinary image/audio URLs, and legacy topic; it changes Vietnamese/definition, adds the Master example, and enables the row. See the field audit.

- [ ] ACCEPT MAP_EXISTING #284 + UPDATE_TO_MASTER
- [ ] CHANGE: ____________________
- [ ] I acknowledge the projection changes, including nulling the current imageUrl, audioUrl, IPA and legacy topic.

Owner / date: ____________________

## Technology Starter Learning Set

- Master Learning Set: 01a0fc13-09f2-7709-a32d-5bef5b1f7a51
- Slug/name: technology-starter / Technology starter
- Evidence: 16 runtime Learning Sets inspected; no candidate and no exact slug or name collision.

Evidence-backed proposal: CREATE_NEW. No runtime integer ID is allocated in this task, and no learners are assigned.

- [ ] ACCEPT CREATE_NEW
- [ ] CHANGE: ____________________

Owner / date: ____________________

## Owner completion

- Human owner: ____________________
- Date: ____________________
- Final reconciliation file updated by owner: ____________________

The prepared machine-readable owner-ready file is analysis-only. The planner's source of truth remains the human-owned file at vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json; it has not been changed and does not yet contain decisions for release 2.1.0.
