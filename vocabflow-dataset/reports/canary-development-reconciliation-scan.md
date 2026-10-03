# Development Runtime Reconciliation Scan — Master V2 Canary 2.1.0

Scanned: 2026-10-03T14:26:40.650Z

## Target verification

- Environment/provider: `development / neon`
- Neon project/branch: `shy-hill-72364426 / br-square-grass-b3af0nte`
- Database: `neondb`
- Runtime role/purpose: `vocabflow_runtime / runtime`
- Pre-connect Neon branch/connection verification: PASS
- Post-connect protected identity, database, and role verification: PASS
- Snapshot transaction: `REPEATABLE READ, READ ONLY`
- Migration inspection role: `vocabflow_migration` (same verified development project/branch/database)

## Migration state

Current: **YES** (3/3 required migrations 0015–0017 matched; 18/18 migration journal rows present). Latest applied: `0017_nosy_hellfire_club`.

| Migration | Applied and hash matched | Expected local hash | Database hash |
| --- | --- | --- | --- |
| 0015_clean_yellowjacket | YES | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 |
| 0016_nostalgic_mattie_franklin | YES | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 |
| 0017_nosy_hellfire_club | YES | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d |

Local journal rows present: 18/18; missing rows: 0. Local migration file hash differences: 0001_curious_miss_america, 0002_smiling_wrecking_crew, 0003_lazy_lady_deathstrike, 0012_us41_owner_content_overrides, 0013_runtime-vocabulary-sequence-privilege, 0014_vietnamese_catalog_metadata.

## Approved release

- Version/schema/status: `2.1.0 / 2.0.1 / APPROVED`
- Release hash: `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`
- RELEASE transform: `8/8 projected; importEligible=true`
- Topics/taxonomy: 0/0. Topic reconciliation is `NOT_REQUIRED_FOR_THIS_CANARY`; Master runtime topic projection is null.
- Reconciliation dry-run: reconciliationComplete=false; canApply=false. (No APPLY path was invoked.)

## Snapshot fingerprint

- Algorithm: SHA-256 over canonical JSON (RFC 8785/JCS).
- Fingerprint: `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`
- Included: development project/branch/database and role/purpose, release hash, applied migration tags/hashes, the full vocabulary discovery universe (learner-facing content, overrides/quarantine, enabled/contentVersion/source identity), candidate IDs per Master Sense, relevant Master mappings/fingerprints/contracts/releases, candidate progress/review reference counts, all Learning Set discovery fields, candidate memberships/assignment counts/mappings, and applied import-run identities.
- Excluded: scan time, database timestamps, learner IDs, and learner-level row content. History contributes aggregate counts per candidate vocabulary ID and candidate set.

## Candidate summary

- Master Senses scanned: 8
- Runtime candidate rows: 7
- Candidate classifications: EXACT_EFFECTIVE_MATCH 0; PARTIAL_MATCH 7; SEMANTIC_CANDIDATE 0; CONFLICTING_MEANING 0
- Ambiguous runtime identity candidate rows: 4
- Conflicting Vietnamese overrides: 0
- Image quarantine counts among candidates: FALSE 7; TRUE_NO_MASTER_IMAGE 0; TRUE_CONFLICT 0
- Sensitive URL values redacted before artifact output: 0

| Master Sense / meaning | Runtime candidates | Field-level diff (Master → runtime effective) | History counts | Vietnamese override | Image quarantine | Final decision |
| --- | --- | --- | --- | --- | --- | --- |
| apple — quả táo — A round fruit with firm flesh and skin that is usually red, green, or yellow. | #1 apple (PARTIAL_MATCH; WOULD_REQUIRE_UPDATE_TO_MASTER)<br>#295 apple (PARTIAL_MATCH; WOULD_REQUIRE_UPDATE_TO_MASTER) | #1: ipa: Master=null, runtime="ˈæpəl"; definitionEn: Master="A round fruit with firm flesh and skin that is usually red, green, or yellow.", runtime="A fruit with a red or green skin and white flesh."; exampleEn: Master="She packed an apple for her afternoon snack.", runtime="she enjoyed a crisp, juicy apple for a snack."; imageUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/image/upload/v1789543012/vocabflow/images/content-v1/6e27070bea876863cbfb4c10dd08d113ec0c7349f07a3354d17d38816735a115.jpg"; audioUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/video/upload/v1789542079/vocabflow/audio/content-v1/4ecd6162db1b4b732273869bd3aab3873031cbf335406ea510a2d192ff7e6ae8.mp3"; topic: Master=null, runtime="Food"<br>#295: ipa: Master=null, runtime="ˈæpəl"; definitionEn: Master="A round fruit with firm flesh and skin that is usually red, green, or yellow.", runtime="A fruit with a red or green skin and white flesh."; exampleEn: Master="She packed an apple for her afternoon snack.", runtime="she enjoyed a crisp, juicy apple for a snack."; imageUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/image/upload/v1789543012/vocabflow/images/content-v1/6e27070bea876863cbfb4c10dd08d113ec0c7349f07a3354d17d38816735a115.jpg"; audioUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/video/upload/v1789542079/vocabflow/audio/content-v1/4ecd6162db1b4b732273869bd3aab3873031cbf335406ea510a2d192ff7e6ae8.mp3"; topic: Master=null, runtime="Food"; level: Master=null, runtime="GRADE_1" | #1: progress 3, reviews 8<br>#295: progress 1, reviews 1 | #1: NONE<br>#295: NONE | #1: FALSE<br>#295: FALSE | #1: UNRESOLVED<br>#295: UNRESOLVED |
| bank — ngân hàng — An organization that keeps and lends money and provides financial services. | #871 bank (PARTIAL_MATCH; IDENTITY_REVIEW_REQUIRED) | #871: ipa: Master=null, runtime="bæŋk"; vietnamese: Master="ngân hàng", runtime="Ngân hàng"; definitionEn: Master="An organization that keeps and lends money and provides financial services.", runtime="A financial institution that accepts deposits from the public and creates credit."; exampleEn: Master="She deposited her paycheck at the bank.", runtime=null; imageUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/image/upload/v1789543163/vocabflow/images/content-v1/a99c24a75deec5735d2c1a47ca715119a594d1ba3ac7892e87ebbb6edaf17571.png"; audioUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/video/upload/v1789542166/vocabflow/audio/content-v1/64975747300e7c3c857909e4cea4e71a9a5857779144bc71535619d3435956d5.mp3"; topic: Master=null, runtime="casual"; enabled: Master=true, runtime=false | #871: progress 0, reviews 0 | #871: NONE | #871: FALSE | #871: UNRESOLVED; flags ["AMBIGUOUS_RUNTIME_IDENTITY"] |
| bank — bờ sông — The sloping ground along the edge of a river. | #871 bank (PARTIAL_MATCH; IDENTITY_REVIEW_REQUIRED) | #871: ipa: Master=null, runtime="bæŋk"; vietnamese: Master="bờ sông", runtime="Ngân hàng"; definitionEn: Master="The sloping ground along the edge of a river.", runtime="A financial institution that accepts deposits from the public and creates credit."; exampleEn: Master="We sat on the bank of the river and watched the boats.", runtime=null; imageUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/image/upload/v1789543163/vocabflow/images/content-v1/a99c24a75deec5735d2c1a47ca715119a594d1ba3ac7892e87ebbb6edaf17571.png"; audioUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/video/upload/v1789542166/vocabflow/audio/content-v1/64975747300e7c3c857909e4cea4e71a9a5857779144bc71535619d3435956d5.mp3"; topic: Master=null, runtime="casual"; enabled: Master=true, runtime=false | #871: progress 0, reviews 0 | #871: NONE | #871: FALSE | #871: UNRESOLVED; flags ["AMBIGUOUS_RUNTIME_IDENTITY"] |
| record — bản thu âm — A piece of music or speech that has been recorded so it can be played again. | #849 record (PARTIAL_MATCH; IDENTITY_REVIEW_REQUIRED) | #849: ipa: Master="ˈɹɛk.ɚd", runtime="ˈrɛkərd"; vietnamese: Master="bản thu âm", runtime="Đĩa"; definitionEn: Master="A piece of music or speech that has been recorded so it can be played again.", runtime="A thin grooved disc of a material by which sound is recorded and reproduced, especially a vinyl disc."; exampleEn: Master="The record of the band's live concert can be streamed online.", runtime=null; imageUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/image/upload/v1789543218/vocabflow/images/content-v1/be9fe7864e5001843c63044d47e7f6d2cfac68bd7760d306491d18f8fe67826d.png"; audioUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/video/upload/v1789542280/vocabflow/audio/content-v1/8347a699dde737215403b98582ea5a35435c47d7c162f1ba35e389cc91549ad8.mp3"; topic: Master=null, runtime="casual"; enabled: Master=true, runtime=false | #849: progress 0, reviews 0 | #849: NONE | #849: FALSE | #849: UNRESOLVED; flags ["AMBIGUOUS_RUNTIME_IDENTITY"] |
| record — ghi âm; ghi lại — To capture sound, images, or information so it can be played or used later. | #849 record (PARTIAL_MATCH; IDENTITY_REVIEW_REQUIRED) | #849: ipa: Master="ɹɪˈkɔɹd", runtime="ˈrɛkərd"; vietnamese: Master="ghi âm; ghi lại", runtime="Đĩa"; definitionEn: Master="To capture sound, images, or information so it can be played or used later.", runtime="A thin grooved disc of a material by which sound is recorded and reproduced, especially a vinyl disc."; exampleEn: Master="She will record the interview tomorrow.", runtime=null; imageUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/image/upload/v1789543218/vocabflow/images/content-v1/be9fe7864e5001843c63044d47e7f6d2cfac68bd7760d306491d18f8fe67826d.png"; audioUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/video/upload/v1789542280/vocabflow/audio/content-v1/8347a699dde737215403b98582ea5a35435c47d7c162f1ba35e389cc91549ad8.mp3"; topic: Master=null, runtime="casual"; enabled: Master=true, runtime=false | #849: progress 0, reviews 0 | #849: NONE | #849: FALSE | #849: UNRESOLVED; flags ["AMBIGUOUS_RUNTIME_IDENTITY"] |
| look after — chăm sóc; trông nom — To take responsibility for someone or something and make sure they are safe or cared for. | No runtime candidate found | — | — | — | — | UNRESOLVED (no candidate) |
| algorithm — thuật toán — A defined sequence of steps that a computer follows to solve a problem or process information. | No runtime candidate found | — | — | — | — | UNRESOLVED (no candidate) |
| reservation — việc đặt chỗ trước — An arrangement made in advance to keep a place, room, or table for someone. | #284 reservation (PARTIAL_MATCH; IDENTITY_REVIEW_REQUIRED) | #284: ipa: Master=null, runtime="ˌrɛzərˈveɪʃən"; vietnamese: Master="việc đặt chỗ trước", runtime="Đặt chỗ"; definitionEn: Master="An arrangement made in advance to keep a place, room, or table for someone.", runtime="An arrangement to have something reserved, such as a table at a restaurant."; exampleEn: Master="I made a reservation for two at seven o'clock.", runtime=null; imageUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/image/upload/v1789543292/vocabflow/images/content-v1/da33753a7f38d876c0df7ce81b0d63d31694c0c65a1bcfe7bd5be63f44fba5fc.jpg"; audioUrl: Master=null, runtime="https://res.cloudinary.com/tuaepr58/video/upload/v1789542061/vocabflow/audio/content-v1/4aeeeec07bedea313bf9b92f09056f5027babc3216832deb56e875c2bc736cdf.mp3"; topic: Master=null, runtime="CommonPlace"; enabled: Master=true, runtime=false | #284: progress 0, reviews 0 | #284: NONE | #284: FALSE | #284: UNRESOLVED |

## Technology Starter candidates

- No matching runtime Learning Set candidate among 16 inspected rows; decision remains UNRESOLVED.

No runtime set mapping, membership, or learner assignment was changed.

## Owner decision template

### apple — 01a0fc13-09ed-70b4-801b-408be3b771e9

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

### bank — 01a0fc13-09ee-7211-8e5a-784c689a0c7a

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

### bank — 01a0fc13-09ee-7584-a480-e313e359f744

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

### record — 01a0fc13-09ee-71ff-9a0a-a96e48ef7dac

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

### record — 01a0fc13-09ee-7823-95fc-5d1d76f13fa5

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

### look after — 01a0fc13-09ee-79c7-85ff-cbe0fc14a249

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

### algorithm — 01a0fc13-09ef-710c-8e76-753a5cfea69c

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

### reservation — 01a0fc13-09ef-7d37-a50f-d05db6b1a89c

Decision:
[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

If MAP_EXISTING:
appVocabularyId = ___

firstAdoptionPolicy:
[ ] ADOPT_EXISTING_AS_BASELINE
[ ] UPDATE_TO_MASTER

vietnameseOverridePolicy = ___
imageQuarantinePolicy = ___

Current decision: UNRESOLVED.

Technology Starter — 01a0fc13-09f2-7709-a32d-5bef5b1f7a51

[ ] MAP_EXISTING
[ ] CREATE_NEW
[ ] SKIP

Current decision: UNRESOLVED.

No MAP_EXISTING, CREATE_NEW, or SKIP decision has been selected. No first-adoption policy has been set.

## Safety boundary

This was a read-only evidence scan. No migration/import apply, INSERT, UPDATE, DELETE, runtime ID allocation, bridge mapping creation, learner-history mutation, set assignment, media operation, shared-CI connection, or production connection was performed. Candidate similarity is discovery evidence only.
