# Development Canary Owner Reconciliation Review — Master V2 2.1.0

Generated: 2026-10-03T16:32:39.003Z

## Verified scope

- Approved release 2.1.0; schema 2.0.1; release hash `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.
- Read-only development target: project `shy-hill-72364426`, branch `br-square-grass-b3af0nte`, database `neondb`.
- Snapshot fingerprint: `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`.
- This is analysis-only. It is not the human-owned reconciliation file, is rejected by the import planner, and does not authorize APPLY.

## Apple identity audit

- Runtime rows #1 and #295 both currently mean **apple = quả táo**. The snapshot supports `DUPLICATE_RUNTIME_ROWS_SAME_MASTER_SENSE`; no evidence identifies a separate lexical Sense.
- Same learner progress overlap: **1** — DUPLICATE_LEARNER_HISTORY. Learner identifiers were not selected or recorded.
- Source history: ID 1 is seeded by migration `0003_lazy_lady_deathstrike.sql` from the project-authored Starter V1 catalog, predating the current legacy V1 importer rows. Later enrichment references source record 265 without writing source identity fields, consistent with ID 1's current null source metadata. ID 295 explicitly records `2000_COMMON_ENGLISH_VOCABULARY_V1 / 265`.
- Runtime API behavior: the vocabulary catalog and learner vocabulary endpoint return enabled rows; both are enabled and therefore can appear in the unfiltered catalog. The API applies an optional level filter; #1 has no level and #295 has GRADE_1, so level-filtered views can show #295 while excluding #1. The catalog endpoint does not filter by topic. Topic pages and topic-scoped Study Setup use normalized vocabulary_topics links; both rows have the enabled Food topic link. Learning Set detail uses learning_set_items and enabled rows; both rows have enabled-set memberships. Unscoped Study Setup/review queue requires the learner to have an active assignment to an enabled set containing the row; #1 belongs to three sets with 11 active assignment rows in aggregate, while #295 belongs to one set with one active assignment row (these are per-set assignment totals, not unique learners). Review then selects due progress rows or rows NEW for that learner; saved scopes use each learner's saved membership, and saved-all includes all enabled saved rows. Both apple IDs are reachable in current learner flows; #1 is more structurally connected through Learning Sets, while #295 carries legacy source identity and GRADE_1. Neither row is unreachable, and these signals do not select a canonical ID.
- No API behavior was changed. Evidence paths: `apps/api/src/vocabulary.ts`, `apps/api/src/learner-vocabulary.ts`, `apps/api/src/topics.ts`, `apps/api/src/learning-sets.ts`, `apps/api/src/review-queue.ts`, and `apps/web/src/features/study/study-setup-page.tsx`.

## apple — OWNER_CHOICE_REQUIRED
- Master Sense: `01a0fc13-09ed-70b4-801b-408be3b771e9`; owner decision: **UNRESOLVED**.
- Runtime candidates: #1, #295.
### Runtime #1
- Current content: Vietnamese **quả táo**; definition “A fruit with a red or green skin and white flesh.”; example “she enjoyed a crisp, juicy apple for a snack.”; IPA ˈæpəl.
- Visibility fields: enabled=true, level=—, legacy topic=Food, image=Cloudinary URL present, audio=Cloudinary URL present; contentVersion=2.
- Source: — / —.
- History: progress=3 (NEW 0, LEARNING 3, MASTERED 0); reviews=8; review range 2026-09-16 03:17:15.132781+00 to 2026-10-02 10:24:44.882337+00.
- Learning Set memberships: #1 starter-vocabulary / Bộ từ khởi đầu VocabFlow (enabled=true, sortOrder=0, assignments=8, active=8); #2 grade-1-starter / Bộ từ khởi đầu lớp 1 (enabled=true, sortOrder=0, assignments=2, active=2); #5 everyday-words / Từ vựng hằng ngày (enabled=true, sortOrder=0, assignments=1, active=1).
- Normalized Topic memberships: food / Đồ ăn (enabled=true); Vietnamese override=NONE; image quarantine=FALSE.
- Projection changes if updated: `ipa`: ˈæpəl → —; `definitionEn`: A fruit with a red or green skin and white flesh. → A round fruit with firm flesh and skin that is usually red, green, or yellow.; `exampleEn`: she enjoyed a crisp, juicy apple for a snack. → She packed an apple for her afternoon snack.; `imageUrl`: image URL present (Cloudinary) → —; `audioUrl`: audio URL present (Cloudinary) → —; `topic`: Food → —
### Runtime #295
- Current content: Vietnamese **quả táo**; definition “A fruit with a red or green skin and white flesh.”; example “she enjoyed a crisp, juicy apple for a snack.”; IPA ˈæpəl.
- Visibility fields: enabled=true, level=GRADE_1, legacy topic=Food, image=Cloudinary URL present, audio=Cloudinary URL present; contentVersion=1.
- Source: 2000_COMMON_ENGLISH_VOCABULARY_V1 / 265.
- History: progress=1 (NEW 0, LEARNING 1, MASTERED 0); reviews=1; review range 2026-10-02 13:10:35.322753+00 to 2026-10-02 13:10:35.322753+00.
- Learning Set memberships: #9 grade-1-food / Đồ ăn lớp 1 (enabled=true, sortOrder=60, assignments=1, active=1).
- Normalized Topic memberships: food / Đồ ăn (enabled=true); Vietnamese override=NONE; image quarantine=FALSE.
- Projection changes if updated: `ipa`: ˈæpəl → —; `definitionEn`: A fruit with a red or green skin and white flesh. → A round fruit with firm flesh and skin that is usually red, green, or yellow.; `exampleEn`: she enjoyed a crisp, juicy apple for a snack. → She packed an apple for her afternoon snack.; `imageUrl`: image URL present (Cloudinary) → —; `audioUrl`: audio URL present (Cloudinary) → —; `topic`: Food → —; `level`: GRADE_1 → —
- Proposal: Both runtime rows currently represent apple = quả táo; the available evidence does not identify one canonical runtime identity.
- Warning: Do not map both runtime rows to this Master Sense.
- Warning: No option is ranked or selected.
- Warning: DUPLICATE_LEARNER_HISTORY


Owner options (unranked):
- **Option A — MAP_EXISTING #1:** preserves 3 progress rows and 8 review events on the chosen ID; the other apple keeps 1 progress row and 1 review event, plus its memberships. No Learning Set or Topic membership changes are proposed here; existing links remain attached to their IDs. If UPDATE_TO_MASTER is selected, contentVersion 2 → 3 and it removes/replaces the listed media/topic/level projection values. The other apple row (#295) remains a distinct runtime ID with its own progress/review history and needs a separate owner decision; the importer must not map both to this one Master Sense.
- **Option B — MAP_EXISTING #295:** preserves 1 progress row and 1 review event on the chosen ID; the other apple keeps 3 progress rows and 8 review events, plus its memberships. No Learning Set or Topic membership changes are proposed here; existing links remain attached to their IDs. If UPDATE_TO_MASTER is selected, contentVersion 1 → 2 and it removes/replaces the listed media/topic/level projection values. The other apple row (#1) remains a distinct runtime ID with its own progress/review history and needs a separate owner decision; the importer must not map both to this one Master Sense.
- **Option C — CREATE_NEW:** Creates a third apple runtime identity at apply time while IDs 1 and 295 and their separate history/memberships remain; this is likely undesirable if all three rows mean apple = quả táo. Initial contentVersion=1.
- Final owner decision: ____________________

---

## bank — MAP_EXISTING
- Master Sense: `01a0fc13-09ee-7211-8e5a-784c689a0c7a`; owner decision: **UNRESOLVED**.
- Runtime candidates: #871.
### Runtime #871
- Current content: Vietnamese **Ngân hàng**; definition “A financial institution that accepts deposits from the public and creates credit.”; example “—”; IPA bæŋk.
- Visibility fields: enabled=false, level=—, legacy topic=casual, image=Cloudinary URL present, audio=Cloudinary URL present; contentVersion=1.
- Source: 2000_COMMON_ENGLISH_VOCABULARY_V1 / 841.
- History: progress=0; reviews=0; review range — to —.
- Learning Set memberships: none.
- Normalized Topic memberships: none; Vietnamese override=NONE; image quarantine=FALSE.
- Projection changes if updated: `ipa`: bæŋk → —; `vietnamese`: Ngân hàng → ngân hàng; `definitionEn`: A financial institution that accepts deposits from the public and creates credit. → An organization that keeps and lends money and provides financial services.; `exampleEn`: — → She deposited her paycheck at the bank.; `imageUrl`: image URL present (Cloudinary) → —; `audioUrl`: audio URL present (Cloudinary) → —; `topic`: casual → —; `enabled`: false → true
- Proposal: Runtime #871 is the financial-institution sense; the row has no progress/review history, Vietnamese override, existing Master mapping, or image quarantine. Proposed MAP_EXISTING #871 with UPDATE_TO_MASTER; effective projection differs=true; contentVersion 1 → 2 under UPDATE_TO_MASTER.
- Warning: UPDATE_TO_MASTER clears existing Cloudinary image/audio, legacy topic, and changes enabled/content fields to the approved projection.
- Final owner decision: ____________________

---

## bank — CREATE_NEW
- Master Sense: `01a0fc13-09ee-7584-a480-e313e359f744`; owner decision: **UNRESOLVED**.
- Runtime candidates: #871.
### Runtime #871
- Current content: Vietnamese **Ngân hàng**; definition “A financial institution that accepts deposits from the public and creates credit.”; example “—”; IPA bæŋk.
- Visibility fields: enabled=false, level=—, legacy topic=casual, image=Cloudinary URL present, audio=Cloudinary URL present; contentVersion=1.
- Source: 2000_COMMON_ENGLISH_VOCABULARY_V1 / 841.
- History: progress=0; reviews=0; review range — to —.
- Learning Set memberships: none.
- Normalized Topic memberships: none; Vietnamese override=NONE; image quarantine=FALSE.
- Projection changes if updated: `ipa`: bæŋk → —; `vietnamese`: Ngân hàng → bờ sông; `definitionEn`: A financial institution that accepts deposits from the public and creates credit. → The sloping ground along the edge of a river.; `exampleEn`: — → We sat on the bank of the river and watched the boats.; `imageUrl`: image URL present (Cloudinary) → —; `audioUrl`: audio URL present (Cloudinary) → —; `topic`: casual → —; `enabled`: false → true
- Proposal: The only runtime candidate is #871 and its Vietnamese/definition identify the financial sense, not a river bank; no second suitable runtime candidate was found.
- Warning: Do not reuse financial row #871 for the river sense.
- Warning: Planned initial contentVersion = 1.
- Final owner decision: ____________________

---

## record — CREATE_NEW
- Master Sense: `01a0fc13-09ee-71ff-9a0a-a96e48ef7dac`; owner decision: **UNRESOLVED**.
- Runtime candidates: #849.
### Runtime #849
- Current content: Vietnamese **Đĩa**; definition “A thin grooved disc of a material by which sound is recorded and reproduced, especially a vinyl disc.”; example “—”; IPA ˈrɛkərd.
- Visibility fields: enabled=false, level=—, legacy topic=casual, image=Cloudinary URL present, audio=Cloudinary URL present; contentVersion=1.
- Source: 2000_COMMON_ENGLISH_VOCABULARY_V1 / 819.
- History: progress=0; reviews=0; review range — to —.
- Learning Set memberships: none.
- Normalized Topic memberships: none; Vietnamese override=NONE; image quarantine=FALSE.
- Projection changes if updated: `ipa`: ˈrɛkərd → ˈɹɛk.ɚd; `vietnamese`: Đĩa → bản thu âm; `definitionEn`: A thin grooved disc of a material by which sound is recorded and reproduced, especially a vinyl disc. → A piece of music or speech that has been recorded so it can be played again.; `exampleEn`: — → The record of the band's live concert can be streamed online.; `imageUrl`: image URL present (Cloudinary) → —; `audioUrl`: audio URL present (Cloudinary) → —; `topic`: casual → —; `enabled`: false → true
- Proposal: Runtime #849 is a physical grooved/vinyl disc sense, while Master represents recorded music or speech more generally; it has zero progress and review references but remains a distinct physical-object meaning.
- Warning: Do not repurpose #849 based only on zero history.
- Warning: Planned initial contentVersion = 1.
- Final owner decision: ____________________

---

## record — CREATE_NEW
- Master Sense: `01a0fc13-09ee-7823-95fc-5d1d76f13fa5`; owner decision: **UNRESOLVED**.
- Runtime candidates: #849.
### Runtime #849
- Current content: Vietnamese **Đĩa**; definition “A thin grooved disc of a material by which sound is recorded and reproduced, especially a vinyl disc.”; example “—”; IPA ˈrɛkərd.
- Visibility fields: enabled=false, level=—, legacy topic=casual, image=Cloudinary URL present, audio=Cloudinary URL present; contentVersion=1.
- Source: 2000_COMMON_ENGLISH_VOCABULARY_V1 / 819.
- History: progress=0; reviews=0; review range — to —.
- Learning Set memberships: none.
- Normalized Topic memberships: none; Vietnamese override=NONE; image quarantine=FALSE.
- Projection changes if updated: `ipa`: ˈrɛkərd → ɹɪˈkɔɹd; `vietnamese`: Đĩa → ghi âm; ghi lại; `definitionEn`: A thin grooved disc of a material by which sound is recorded and reproduced, especially a vinyl disc. → To capture sound, images, or information so it can be played or used later.; `exampleEn`: — → She will record the interview tomorrow.; `imageUrl`: image URL present (Cloudinary) → —; `audioUrl`: audio URL present (Cloudinary) → —; `topic`: casual → —; `enabled`: false → true
- Proposal: Runtime #849 is a noun and cannot also identify the verb sense; no other runtime candidate was found.
- Warning: Planned initial contentVersion = 1.
- Final owner decision: ____________________

---

## look after — CREATE_NEW
- Master Sense: `01a0fc13-09ee-79c7-85ff-cbe0fc14a249`; owner decision: **UNRESOLVED**.
- Runtime candidates: none.
- Proposal: No suitable runtime candidate was found.
- Warning: Planned initial contentVersion = 1.
- Final owner decision: ____________________

---

## algorithm — CREATE_NEW
- Master Sense: `01a0fc13-09ef-710c-8e76-753a5cfea69c`; owner decision: **UNRESOLVED**.
- Runtime candidates: none.
- Proposal: No suitable runtime candidate was found.
- Warning: Planned initial contentVersion = 1.
- Final owner decision: ____________________

---

## reservation — MAP_EXISTING
- Master Sense: `01a0fc13-09ef-7d37-a50f-d05db6b1a89c`; owner decision: **UNRESOLVED**.
- Runtime candidates: #284.
### Runtime #284
- Current content: Vietnamese **Đặt chỗ**; definition “An arrangement to have something reserved, such as a table at a restaurant.”; example “—”; IPA ˌrɛzərˈveɪʃən.
- Visibility fields: enabled=false, level=—, legacy topic=CommonPlace, image=Cloudinary URL present, audio=Cloudinary URL present; contentVersion=1.
- Source: 2000_COMMON_ENGLISH_VOCABULARY_V1 / 254.
- History: progress=0; reviews=0; review range — to —.
- Learning Set memberships: none.
- Normalized Topic memberships: none; Vietnamese override=NONE; image quarantine=FALSE.
- Projection changes if updated: `ipa`: ˌrɛzərˈveɪʃən → —; `vietnamese`: Đặt chỗ → việc đặt chỗ trước; `definitionEn`: An arrangement to have something reserved, such as a table at a restaurant. → An arrangement made in advance to keep a place, room, or table for someone.; `exampleEn`: — → I made a reservation for two at seven o'clock.; `imageUrl`: image URL present (Cloudinary) → —; `audioUrl`: audio URL present (Cloudinary) → —; `topic`: CommonPlace → —; `enabled`: false → true
- Proposal: Runtime #284 represents the booking/reservation sense and has zero progress/review history, no Vietnamese override, no existing Master mapping, and no image quarantine. Proposed MAP_EXISTING #284 with UPDATE_TO_MASTER; effective projection differs=true; contentVersion 1 → 2 under UPDATE_TO_MASTER.
- Warning: UPDATE_TO_MASTER clears existing Cloudinary image/audio and legacy topic, and changes Vietnamese/definition/example/enabled fields to the approved projection.
- Final owner decision: ____________________

## Technology Starter Learning Set

- Master Learning Set: `01a0fc13-09f2-7709-a32d-5bef5b1f7a51` (slug `technology-starter`, name “Technology starter”). Runtime Learning Sets checked: 16; exact slug/name collisions: 0; candidate rows: 0.
- Proposal: CREATE_NEW; do not allocate an integer ID now and do not assign learners. Owner decision: **UNRESOLVED**.
- Final owner decision: ____________________

## Historical migration hash drift

- `HISTORICAL_MIGRATION_HASH_DRIFT`: 6 historical file hashes differ (["0001_curious_miss_america","0002_smiling_wrecking_crew","0003_lazy_lady_deathstrike","0012_us41_owner_content_overrides","0013_runtime-vocabulary-sequence-privilege","0014_vietnamese_catalog_metadata"]); migration rows are 18/18 present, while 0015/0016/0017 match exactly.
- Assessment: The current Master import planner does not read or compare the Drizzle migration ledger when computing canApply. This drift is therefore not an automatic planner blocker, but remains a separate migration-history integrity issue and is not classified as harmless.
- Older migration files were not changed. This remains separate from Sense identity decisions.

## Read-only and approval state

- Database transaction mode: REPEATABLE READ, READ ONLY; no learner UUIDs were selected; no INSERT/UPDATE/DELETE, import APPLY, mapping edit, history merge, row disable/delete, ID allocation, or media operation occurred.
- All owner decisions remain **UNRESOLVED**. The final human-owned reconciliation remains unchanged.
