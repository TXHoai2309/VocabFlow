# Development Runtime Reconciliation Scan — Master V2 Canary 2.1.0

Scanned: 2026-10-04T04:59:22.905Z

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

Current: **YES** (3/3 required migrations 0015–0017 matched; 19/19 migration journal rows present). Latest applied: `0018_panoramic_spirit`.

| Migration | Applied and hash matched | Expected local hash | Database hash |
| --- | --- | --- | --- |
| 0015_clean_yellowjacket | YES | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 |
| 0016_nostalgic_mattie_franklin | YES | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 |
| 0017_nosy_hellfire_club | YES | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d |

Local journal rows present: 19/19; missing rows: 0. Local migration file hash differences: none.

No historical migration hash differences were found.

## Migration hash representation matrix

| Migration | Database SHA-256 | Worktree raw SHA-256 | LF SHA-256 | CRLF SHA-256 | CR SHA-256 | DB representation |
| --- | --- | --- | --- | --- | --- | --- |
| 0000_application-schema | 6cc85e79be79afa23b69d7cfbdf9a440b0d7d0ade9c3152492c67cb7a48512d1 | 6cc85e79be79afa23b69d7cfbdf9a440b0d7d0ade9c3152492c67cb7a48512d1 | 6cc85e79be79afa23b69d7cfbdf9a440b0d7d0ade9c3152492c67cb7a48512d1 | 523e1ff580d5d3da5fd4efaf6bbb9038c45e5bdce73645b4a606bf39d3eb25b2 | 2cb5b52e60ed7622bc06b9e03b6e9b2c843bad7ae89e21c7fa9d19dc712497b6 | LF |
| 0001_curious_miss_america | 118c170f0bd351a55e5313d59d3fa819498e4e607bc746aedb87932a7ddd10d3 | 7be0fba980471b05c389acf7a218b19c0c99770e255b28116b48acbc43a6a257 | 118c170f0bd351a55e5313d59d3fa819498e4e607bc746aedb87932a7ddd10d3 | 7be0fba980471b05c389acf7a218b19c0c99770e255b28116b48acbc43a6a257 | 4b268636d01482a454c7500b9fe58160c6a6bc258c6222ee9c213158165f8e49 | LF |
| 0002_smiling_wrecking_crew | dfd62f6c75b70ab9afa1a20117b766cbd05e6db742747b9d8e010408efb392e2 | 7b574b08ccba43f02dd7130cd812eb52ddda40abbe5790648625c9952e7baaaa | dfd62f6c75b70ab9afa1a20117b766cbd05e6db742747b9d8e010408efb392e2 | 7b574b08ccba43f02dd7130cd812eb52ddda40abbe5790648625c9952e7baaaa | bbedf98ca6bf737e0af5edba4b9569c235564c0ffb18c86e988f3f0326cbad4f | LF |
| 0003_lazy_lady_deathstrike | 8ea4b7b4d662ba942c662f9d4c2d5992d3ea6ffd3e2d502cc178a68a923f31c0 | 6ddbfa3d7ee607a3b88924f48df275e8816fac8b26b38a160ea6f5c26c91c8c9 | 8ea4b7b4d662ba942c662f9d4c2d5992d3ea6ffd3e2d502cc178a68a923f31c0 | 6ddbfa3d7ee607a3b88924f48df275e8816fac8b26b38a160ea6f5c26c91c8c9 | f4a3db7fd96b7b9d220817ddf5a64e4110d39baadf32d4ca6c8a70c71c1d205e | LF |
| 0004_scheduled_review_write | 19d3787f9af28805503db11a2f34d66d8bbbdcd16ca9b8a0edb2dd90fb2f9657 | 19d3787f9af28805503db11a2f34d66d8bbbdcd16ca9b8a0edb2dd90fb2f9657 | 9031b19eb649e1f4bb9e58bc73c845dedf36ca79ee6912c246c1f303f2a7c97b | 19d3787f9af28805503db11a2f34d66d8bbbdcd16ca9b8a0edb2dd90fb2f9657 | 0355038a47ab2ee45eb51b3e75ec5e3c3baae7b74c761ee67ca8e74c631f7e5f | CRLF |
| 0005_graceful_eddie_brock | 028ffe026bd7addfa2cedfe927c95cf669324f6da19e1a1215eb12ffb7aa2f10 | 028ffe026bd7addfa2cedfe927c95cf669324f6da19e1a1215eb12ffb7aa2f10 | 028ffe026bd7addfa2cedfe927c95cf669324f6da19e1a1215eb12ffb7aa2f10 | 73a1926c454424cc8a8e42f274b3062010882e42da94dea66a681800ccaafaa2 | 144d619350edf0ef1dd648572bd052af774316c25576a663b01272e11c5469cb | LF |
| 0006_sticky_risque | 0035f537b27b0732390b60bf057ffab29b4a4eb3012b8ba0625286740f8e2803 | 0035f537b27b0732390b60bf057ffab29b4a4eb3012b8ba0625286740f8e2803 | 0035f537b27b0732390b60bf057ffab29b4a4eb3012b8ba0625286740f8e2803 | 2f83fbfa02734f517cb45b2385f06c37ee504174478bd97ab4784788dcf8dc42 | dbcc8b4d0e58aba1b9d4e080350227cf353ecf32edac2e46b8726d0650a2aab0 | LF |
| 0007_modern_mysterio | 557f83cb0058389fe969ed336de58f9e4b36b1691c1f4ee6f46b3d75c88d8699 | 557f83cb0058389fe969ed336de58f9e4b36b1691c1f4ee6f46b3d75c88d8699 | 557f83cb0058389fe969ed336de58f9e4b36b1691c1f4ee6f46b3d75c88d8699 | bd569a9fb8264063f81aac39ffd29386cb11eb61d81dcdc06aa80c8c86e70829 | f4a3d6c6d255aea6f07b046e69bf026e450468a61dbb1c575ef74c426845cf65 | LF |
| 0008_chief_morph | c8af7c9bfc3c99e7221b1a94a5541dbccb5bf9568a560e82303ad7f3ace25a05 | c8af7c9bfc3c99e7221b1a94a5541dbccb5bf9568a560e82303ad7f3ace25a05 | c8af7c9bfc3c99e7221b1a94a5541dbccb5bf9568a560e82303ad7f3ace25a05 | bdc9448b065e279e1d54522947cc9dff99783a01a013bf16599fd950966c4067 | 83a050282c1f57205bd4d0f532fca7376eb672d3d6be1b230dc42a341bb3a18a | LF |
| 0009_tricky_meggan | 27f979b2d9f00406f3c6f1e506aeaf15ae916705d9c8606f27579c46626443f0 | 27f979b2d9f00406f3c6f1e506aeaf15ae916705d9c8606f27579c46626443f0 | 27f979b2d9f00406f3c6f1e506aeaf15ae916705d9c8606f27579c46626443f0 | afa1d6a1e9a1c067e591e208a9efef3dc7c6c3dee46a0a3cd65d2e672e81ab59 | ddfaee38c1129263c965685153ed3dcecc0e681ea4bcf7ebdd565cbf023591a2 | LF |
| 0010_gamification-rewards | 55e7d4f7baa1c5c86a83f360e8eb8097638817ba05f02f93285912e13336f804 | 55e7d4f7baa1c5c86a83f360e8eb8097638817ba05f02f93285912e13336f804 | 55e7d4f7baa1c5c86a83f360e8eb8097638817ba05f02f93285912e13336f804 | 5f9a519fc7335b8bfbada949b003dab8d3df28f9b004629136bd31718f3b1dec | 70bc272d9eaa4093a791fbb62a649023e8f5b4219164fd48f9d916dfab4c8d61 | LF |
| 0011_exercise-correct-xp | 6783f4b66e34f112fb33a3251366755f9069f4fd5829ea508e0c26996319b4dc | 6783f4b66e34f112fb33a3251366755f9069f4fd5829ea508e0c26996319b4dc | 6783f4b66e34f112fb33a3251366755f9069f4fd5829ea508e0c26996319b4dc | d302c0cee6a26b32edc43d199e767c6ffa678a1c809b40d2216890d18e707001 | 495a0d65b1acf7d567df119622f5d856f2fb0731d62a6d0d80ef8923c8bc34c1 | LF |
| 0012_us41_owner_content_overrides | 2c5925738743dcf057955c937f2c8838121088fca2411092851132264c70d8b7 | 6360d4a53af14f41175790cb8033ac4802d9f3a1b01e330311bfd6eda729c07e | 2c5925738743dcf057955c937f2c8838121088fca2411092851132264c70d8b7 | 6360d4a53af14f41175790cb8033ac4802d9f3a1b01e330311bfd6eda729c07e | 25041663f48e35b4e15f20036f819d4a5b5343d3764d335a3ebf4d8d64890690 | LF |
| 0013_runtime-vocabulary-sequence-privilege | f378a186c06f8f225bc25898064e5e40ebe8f4fab92262fee37f9374b3e0c8fd | 6d5f4a2b04a05d7515b258d78417ac837d515b234470debab3ae49a073a0757c | f378a186c06f8f225bc25898064e5e40ebe8f4fab92262fee37f9374b3e0c8fd | 6d5f4a2b04a05d7515b258d78417ac837d515b234470debab3ae49a073a0757c | 566e888a9af15dca4e0876e7e30419af4542ba3a6f86633a0b2ce8b4c07c6e5a | LF |
| 0014_vietnamese_catalog_metadata | 40699f1088f69cd07e4a9fb38629b1792789c2c1ab764c4271f328c8ef871c8c | e9de92f426c66213d9412e531e4c1fbf330c72c3d6a8880d50e34fba762a5302 | 40699f1088f69cd07e4a9fb38629b1792789c2c1ab764c4271f328c8ef871c8c | e9de92f426c66213d9412e531e4c1fbf330c72c3d6a8880d50e34fba762a5302 | a24b562220df36ced04a95230ee00cdeb6cfdfd9979848e829e35a52b3e48a8e | LF |
| 0015_clean_yellowjacket | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | 7f30095f9a030efa3656833f322d9bc97b41bf3a4feb146bd632aadac7742a55 | daa5e8d6d2ff947a743a50097a46ee49f211e548b2c2f47e772ff103eb28afda | LF |
| 0016_nostalgic_mattie_franklin | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | b690ba4c84aec0e0562ca1b15c002956674d28c48b4376da27687a4f3554b2e7 | 5f3a88974f24bc4ace30e0c418bc7dac511381996b396bc0f78181378c7805b3 | LF |
| 0017_nosy_hellfire_club | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | 54a6c96e92d91358f588d9ac6f81e47983ae718ac5519e03ae4e5fd6c72651c0 | c715b37e6fcba9d9e5018eb9a24c1a6060a31e9defc197e27fae30a02cb4e3fe | LF |
| 0018_panoramic_spirit | eec77c49abbad9a2ea0a69fead9409e0b817978fd3ff3df95b09a55575b114ed | eec77c49abbad9a2ea0a69fead9409e0b817978fd3ff3df95b09a55575b114ed | 75564ed643ec886c89f733d0cd554afb1617ee561c5fe9b0b67fcb618a0c7c71 | eec77c49abbad9a2ea0a69fead9409e0b817978fd3ff3df95b09a55575b114ed | 0352db94a7fdb7175a6d63c5dbab35d3e31380f02d51f5daf6c377c332b60a98 | CRLF |

## Approved release

- Version/schema/status: `2.1.0 / 2.0.1 / APPROVED`
- Release hash: `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`
- RELEASE transform: `8/8 projected; importEligible=true`
- Topics/taxonomy: 0/0. Topic reconciliation is `NOT_REQUIRED_FOR_THIS_CANARY`; Master runtime topic projection is null.
- Reconciliation dry-run: reconciliationComplete=false; canApply=false. (No APPLY path was invoked.)

## Snapshot fingerprint

- Algorithm: SHA-256 over canonical JSON (RFC 8785/JCS).
- Fingerprint: `bc888e2b615efe3c1380a39a130cc0323340f433e341fb833d412e7ad46abce5`
- Included: development project/branch/database and role/purpose, release hash, applied migration tags/hashes, the full vocabulary discovery universe (learner-facing content, overrides/quarantine, enabled/contentVersion/source identity), candidate IDs per Master Sense, relevant Master mappings/fingerprints/contracts/releases, candidate progress/review reference counts, all Learning Set discovery fields, candidate memberships/assignment counts/mappings, and applied import-run identities.
- Excluded: scan time, database timestamps, learner IDs, and learner-level row content. History contributes aggregate counts per candidate vocabulary ID and candidate set.

- Full planner snapshot fingerprint (canonical JSON of the complete runtime snapshot): `9834483fa3017eb801a059dc2adaf4c51843eb011610a0769faac9c445ae2869`

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
