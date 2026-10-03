# Development Canary 2.1.0 — Runtime Projection-Loss Audit

Scanned 2026-10-03. Target: development / Neon project shy-hill-72364426 / branch br-square-grass-b3af0nte / database neondb. Runtime evidence was refreshed in a REPEATABLE READ, READ ONLY scan.

- Release: 2.1.0, schema 2.0.1, APPROVED
- Release hash: fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591
- Snapshot fingerprint: 464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b
- Snapshot changed from Phase 2E.2: NO
- Flag: RUNTIME_PROJECTION_DATA_LOSS

The canary projection has null IPA, imageUrl, audioUrl, legacy topic, and level values where those values are not supplied by approved Master content. The current runtime rows below have non-null values that UPDATE_TO_MASTER would replace with null. These are data changes; this audit does not treat them as harmless. Cloudinary URLs are represented as “Cloudinary URL present” without copying the URL into this report.

## Field-by-field projection

| Candidate | Field | Runtime current value | Master projected value | Changes? | Becomes null? |
| --- | --- | --- | --- | --- | --- |
| apple #1 | word | apple | apple | NO | NO |
| apple #1 | ipa | ˈæpəl | null | YES | YES |
| apple #1 | vietnamese | quả táo | quả táo | NO | NO |
| apple #1 | definitionEn | A fruit with a red or green skin and white flesh. | A round fruit with firm flesh and skin that is usually red, green, or yellow. | YES | NO |
| apple #1 | exampleEn | she enjoyed a crisp, juicy apple for a snack. | She packed an apple for her afternoon snack. | YES | NO |
| apple #1 | imageUrl | Cloudinary URL present | null | YES | YES |
| apple #1 | audioUrl | Cloudinary URL present | null | YES | YES |
| apple #1 | legacy topic | Food | null | YES | YES |
| apple #1 | level | null | null | NO | NO |
| apple #1 | enabled | true | true | NO | NO |
| apple #295 | word | apple | apple | NO | NO |
| apple #295 | ipa | ˈæpəl | null | YES | YES |
| apple #295 | vietnamese | quả táo | quả táo | NO | NO |
| apple #295 | definitionEn | A fruit with a red or green skin and white flesh. | A round fruit with firm flesh and skin that is usually red, green, or yellow. | YES | NO |
| apple #295 | exampleEn | she enjoyed a crisp, juicy apple for a snack. | She packed an apple for her afternoon snack. | YES | NO |
| apple #295 | imageUrl | Cloudinary URL present | null | YES | YES |
| apple #295 | audioUrl | Cloudinary URL present | null | YES | YES |
| apple #295 | legacy topic | Food | null | YES | YES |
| apple #295 | level | GRADE_1 | null | YES | YES |
| apple #295 | enabled | true | true | NO | NO |
| bank — financial #871 | word | bank | bank | NO | NO |
| bank — financial #871 | ipa | bæŋk | null | YES | YES |
| bank — financial #871 | vietnamese | Ngân hàng | ngân hàng | YES | NO |
| bank — financial #871 | definitionEn | A financial institution that accepts deposits from the public and creates credit. | An organization that keeps and lends money and provides financial services. | YES | NO |
| bank — financial #871 | exampleEn | null | She deposited her paycheck at the bank. | YES | NO |
| bank — financial #871 | imageUrl | Cloudinary URL present | null | YES | YES |
| bank — financial #871 | audioUrl | Cloudinary URL present | null | YES | YES |
| bank — financial #871 | legacy topic | casual | null | YES | YES |
| bank — financial #871 | level | null | null | NO | NO |
| bank — financial #871 | enabled | false | true | YES | NO |
| reservation — booking #284 | word | reservation | reservation | NO | NO |
| reservation — booking #284 | ipa | ˌrɛzərˈveɪʃən | null | YES | YES |
| reservation — booking #284 | vietnamese | Đặt chỗ | việc đặt chỗ trước | YES | NO |
| reservation — booking #284 | definitionEn | An arrangement to have something reserved, such as a table at a restaurant. | An arrangement made in advance to keep a place, room, or table for someone. | YES | NO |
| reservation — booking #284 | exampleEn | null | I made a reservation for two at seven o'clock. | YES | NO |
| reservation — booking #284 | imageUrl | Cloudinary URL present | null | YES | YES |
| reservation — booking #284 | audioUrl | Cloudinary URL present | null | YES | YES |
| reservation — booking #284 | legacy topic | CommonPlace | null | YES | YES |
| reservation — booking #284 | level | null | null | NO | NO |
| reservation — booking #284 | enabled | false | true | YES | NO |

## Exact UPDATE_TO_MASTER consequences

All four MAP_EXISTING proposals have no current Master mapping and their effective runtime projections differ from the approved Master projection. The planner therefore models each accepted MAP_EXISTING + UPDATE_TO_MASTER as a runtime UPDATE and a new Master mapping:

| Candidate | Current contentVersion | Expected next contentVersion | Other relevant evidence |
| --- | ---: | ---: | --- |
| apple #1 | 2 | 3 | source_dataset/source_record_id remain null |
| apple #295 | 1 | 2 | source identity remains 2000_COMMON_ENGLISH_VOCABULARY_V1 / 265 |
| bank financial #871 | 1 | 2 | source identity remains 2000_COMMON_ENGLISH_VOCABULARY_V1 / 841 |
| reservation booking #284 | 1 | 2 | source identity remains 2000_COMMON_ENGLISH_VOCABULARY_V1 / 254 |

For #1, #295, #871 and #284, no Vietnamese override or image quarantine is present, so no extra override-clear policy is required. The approved Master updates do not change source_dataset/source_record_id; those columns are outside the projection update.

The existing normalized Topic links are distinct from the legacy topic text field. Apple #1 and #295 both keep their normalized Food Topic link if either row is updated; the legacy topic text becomes null on the selected row. Existing Learning Set memberships and learner assignments are not removed or transferred by this update. In particular, choosing #1 leaves #295 and its grade-1-food membership in place, and choosing #295 leaves #1 and its three memberships in place.

No Cloudinary object is uploaded, deleted, or modified by this plan. The runtime row's imageUrl/audioUrl references would be cleared by the projection. There is no automatic preservation or fallback behavior in the current projection contract.

## Identity and history boundaries

- Apple #1 and #295 both represent apple = quả táo, are enabled, and are reachable in current catalog/topic/learning flows.
- They have different runtime IDs and different Learning Set memberships. One learner has progress on both IDs; aggregate overlap count is 1. No learner identifiers were selected or retained.
- Selecting either ID preserves the history already attached to that ID; it does not move the other row's history, remove the other row, remove its memberships, or resolve the remaining duplicate identity.
- CREATE_NEW produces another runtime identity with initial contentVersion 1; its integer ID is allocated only at APPLY time. Existing IDs and histories remain separate.

No automatic Apple choice is recorded. The separate duplicate-consolidation/removal policy, if needed, requires a future human-owned follow-up; no history merge was performed or modeled.
