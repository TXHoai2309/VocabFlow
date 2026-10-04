# Phase 2E.4B — Migration hash root-cause audit

Audit date: 2026-10-04. Development target: Neon project/branch/database `shy-hill-72364426 / br-square-grass-b3af0nte / neondb`.

## Root cause confirmed

The 17 and six reported mismatches were line-ending-only Drizzle hash differences. The migration files and their Git blobs have unchanged logical SQL. Drizzle ORM 0.45.2 hashes each complete migration file as UTF-8 text exactly as checked out, without newline normalization. Worktree B checked out CRLF for all 18 files; Worktree A had mixed line endings. The database hashes reproduce as LF for 17 files and CRLF for `0004_scheduled_review_write`.

Phase 2E.3's six mismatches were exactly `0001`–`0003` and `0012`–`0014`, whose Worktree A raw bytes were CRLF while their DB hashes match LF. Phase 2E.4A's 17 mismatches were every local file except `0004`: Worktree B raw bytes were CRLF, while the `0004` DB hash also happens to be the CRLF digest. This reproduces both counts without any SQL-content change. After the verifier checks Drizzle digests for LF, CRLF, and bare-CR serializations of the same source, all 18 DB hashes match; genuine historical content drift is none.

## Paths and exact hash contract

- Migration SQL: `drizzle/migrations/*.sql`; journal: `drizzle/migrations/meta/_journal.json`.
- Hash implementation: installed `drizzle-orm@0.45.2`, `node_modules/drizzle-orm/migrator.js` / `.cjs`, function `readMigrationFiles`. It calls `readFileSync(path).toString()`, then `createHash("sha256").update(query).digest("hex")` on the complete file text before statement-breakpoint splitting.
- Algorithm / input / encoding: SHA-256 over the complete SQL file after Node's UTF-8 Buffer-to-string decode and UTF-8 string encoding by `crypto.update`.
- Newlines normalized by Drizzle: NO. Trailing newline significant: YES. UTF-8 BOM significant: YES. Git blob bytes consumed by Drizzle: NO; it reads the checked-out working-tree file.
- Runner: `scripts/db-migration-executor.ts` uses `readMigrationFiles` both for read-only planning and apply; the ledger is `drizzle.__drizzle_migrations(hash, created_at)`. This audit did not run the migration executor in apply mode.
- Development scanner: `scripts/master-vocabulary-v2-development-reconciliation-scan.ts`; verifier: `scripts/migration-hash-verification.ts`.

Git configuration in Worktree B: `core.autocrlf=true` (origin `file:C:/Program Files/Git/etc/gitconfig`); `core.eol` unset; no repository `.gitattributes`; effective `text` and `eol` attributes are unspecified for the checked migrations. The verified SQL content has no UTF-8 BOM. Worktree A is `d9012af`; Worktree B is `b5b22e3`. Git blob content SHA-256 is computed from `git show <revision>:<path>` bytes, not the Git object ID. For all 18 files, blob contents at `7e76daa`, `b5b22e3`, and current `TXH` are identical.

Worktree A's later `d9012af` commit adds `0018_panoramic_spirit.sql`, after the 18-migration Phase 2E.4B baseline. The read-only scan and matrix here cover the 18 rows present at `b5b22e3`. The current `TXH` branch therefore has a newer, unapplied local migration 0018 relative to the 18-row development ledger. No attempt was made to execute it; a fresh catalog scan against that newer chain would correctly stop at migration verification until the trusted migration process handles 0018.

## 18-migration representation matrix

The rows below compare the read-only development ledger hash with raw working-tree hashes, SHA-256 of actual Git blob content, and Drizzle-compatible newline representations. `DB representation` identifies which exact Drizzle input serialization reproduces the stored row.

| Migration | DB SHA-256 | Worktree A raw | Worktree B raw | Git blob content | LF | CRLF | CR | DB representation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0000_application-schema | 6cc85e79be79afa23b69d7cfbdf9a440b0d7d0ade9c3152492c67cb7a48512d1 | 6cc85e79be79afa23b69d7cfbdf9a440b0d7d0ade9c3152492c67cb7a48512d1 | 523e1ff580d5d3da5fd4efaf6bbb9038c45e5bdce73645b4a606bf39d3eb25b2 | 6cc85e79be79afa23b69d7cfbdf9a440b0d7d0ade9c3152492c67cb7a48512d1 | 6cc85e79be79afa23b69d7cfbdf9a440b0d7d0ade9c3152492c67cb7a48512d1 | 523e1ff580d5d3da5fd4efaf6bbb9038c45e5bdce73645b4a606bf39d3eb25b2 | 2cb5b52e60ed7622bc06b9e03b6e9b2c843bad7ae89e21c7fa9d19dc712497b6 | LF |
| 0001_curious_miss_america | 118c170f0bd351a55e5313d59d3fa819498e4e607bc746aedb87932a7ddd10d3 | 7be0fba980471b05c389acf7a218b19c0c99770e255b28116b48acbc43a6a257 | 7be0fba980471b05c389acf7a218b19c0c99770e255b28116b48acbc43a6a257 | 118c170f0bd351a55e5313d59d3fa819498e4e607bc746aedb87932a7ddd10d3 | 118c170f0bd351a55e5313d59d3fa819498e4e607bc746aedb87932a7ddd10d3 | 7be0fba980471b05c389acf7a218b19c0c99770e255b28116b48acbc43a6a257 | 4b268636d01482a454c7500b9fe58160c6a6bc258c6222ee9c213158165f8e49 | LF |
| 0002_smiling_wrecking_crew | dfd62f6c75b70ab9afa1a20117b766cbd05e6db742747b9d8e010408efb392e2 | 7b574b08ccba43f02dd7130cd812eb52ddda40abbe5790648625c9952e7baaaa | 7b574b08ccba43f02dd7130cd812eb52ddda40abbe5790648625c9952e7baaaa | dfd62f6c75b70ab9afa1a20117b766cbd05e6db742747b9d8e010408efb392e2 | dfd62f6c75b70ab9afa1a20117b766cbd05e6db742747b9d8e010408efb392e2 | 7b574b08ccba43f02dd7130cd812eb52ddda40abbe5790648625c9952e7baaaa | bbedf98ca6bf737e0af5edba4b9569c235564c0ffb18c86e988f3f0326cbad4f | LF |
| 0003_lazy_lady_deathstrike | 8ea4b7b4d662ba942c662f9d4c2d5992d3ea6ffd3e2d502cc178a68a923f31c0 | 6ddbfa3d7ee607a3b88924f48df275e8816fac8b26b38a160ea6f5c26c91c8c9 | 6ddbfa3d7ee607a3b88924f48df275e8816fac8b26b38a160ea6f5c26c91c8c9 | 8ea4b7b4d662ba942c662f9d4c2d5992d3ea6ffd3e2d502cc178a68a923f31c0 | 8ea4b7b4d662ba942c662f9d4c2d5992d3ea6ffd3e2d502cc178a68a923f31c0 | 6ddbfa3d7ee607a3b88924f48df275e8816fac8b26b38a160ea6f5c26c91c8c9 | f4a3db7fd96b7b9d220817ddf5a64e4110d39baadf32d4ca6c8a70c71c1d205e | LF |
| 0004_scheduled_review_write | 19d3787f9af28805503db11a2f34d66d8bbbdcd16ca9b8a0edb2dd90fb2f9657 | 19d3787f9af28805503db11a2f34d66d8bbbdcd16ca9b8a0edb2dd90fb2f9657 | 19d3787f9af28805503db11a2f34d66d8bbbdcd16ca9b8a0edb2dd90fb2f9657 | 9031b19eb649e1f4bb9e58bc73c845dedf36ca79ee6912c246c1f303f2a7c97b | 9031b19eb649e1f4bb9e58bc73c845dedf36ca79ee6912c246c1f303f2a7c97b | 19d3787f9af28805503db11a2f34d66d8bbbdcd16ca9b8a0edb2dd90fb2f9657 | 0355038a47ab2ee45eb51b3e75ec5e3c3baae7b74c761ee67ca8e74c631f7e5f | CRLF |
| 0005_graceful_eddie_brock | 028ffe026bd7addfa2cedfe927c95cf669324f6da19e1a1215eb12ffb7aa2f10 | 028ffe026bd7addfa2cedfe927c95cf669324f6da19e1a1215eb12ffb7aa2f10 | 73a1926c454424cc8a8e42f274b3062010882e42da94dea66a681800ccaafaa2 | 028ffe026bd7addfa2cedfe927c95cf669324f6da19e1a1215eb12ffb7aa2f10 | 028ffe026bd7addfa2cedfe927c95cf669324f6da19e1a1215eb12ffb7aa2f10 | 73a1926c454424cc8a8e42f274b3062010882e42da94dea66a681800ccaafaa2 | 144d619350edf0ef1dd648572bd052af774316c25576a663b01272e11c5469cb | LF |
| 0006_sticky_risque | 0035f537b27b0732390b60bf057ffab29b4a4eb3012b8ba0625286740f8e2803 | 0035f537b27b0732390b60bf057ffab29b4a4eb3012b8ba0625286740f8e2803 | 2f83fbfa02734f517cb45b2385f06c37ee504174478bd97ab4784788dcf8dc42 | 0035f537b27b0732390b60bf057ffab29b4a4eb3012b8ba0625286740f8e2803 | 0035f537b27b0732390b60bf057ffab29b4a4eb3012b8ba0625286740f8e2803 | 2f83fbfa02734f517cb45b2385f06c37ee504174478bd97ab4784788dcf8dc42 | dbcc8b4d0e58aba1b9d4e080350227cf353ecf32edac2e46b8726d0650a2aab0 | LF |
| 0007_modern_mysterio | 557f83cb0058389fe969ed336de58f9e4b36b1691c1f4ee6f46b3d75c88d8699 | 557f83cb0058389fe969ed336de58f9e4b36b1691c1f4ee6f46b3d75c88d8699 | bd569a9fb8264063f81aac39ffd29386cb11eb61d81dcdc06aa80c8c86e70829 | 557f83cb0058389fe969ed336de58f9e4b36b1691c1f4ee6f46b3d75c88d8699 | 557f83cb0058389fe969ed336de58f9e4b36b1691c1f4ee6f46b3d75c88d8699 | bd569a9fb8264063f81aac39ffd29386cb11eb61d81dcdc06aa80c8c86e70829 | f4a3d6c6d255aea6f07b046e69bf026e450468a61dbb1c575ef74c426845cf65 | LF |
| 0008_chief_morph | c8af7c9bfc3c99e7221b1a94a5541dbccb5bf9568a560e82303ad7f3ace25a05 | c8af7c9bfc3c99e7221b1a94a5541dbccb5bf9568a560e82303ad7f3ace25a05 | bdc9448b065e279e1d54522947cc9dff99783a01a013bf16599fd950966c4067 | c8af7c9bfc3c99e7221b1a94a5541dbccb5bf9568a560e82303ad7f3ace25a05 | c8af7c9bfc3c99e7221b1a94a5541dbccb5bf9568a560e82303ad7f3ace25a05 | bdc9448b065e279e1d54522947cc9dff99783a01a013bf16599fd950966c4067 | 83a050282c1f57205bd4d0f532fca7376eb672d3d6be1b230dc42a341bb3a18a | LF |
| 0009_tricky_meggan | 27f979b2d9f00406f3c6f1e506aeaf15ae916705d9c8606f27579c46626443f0 | 27f979b2d9f00406f3c6f1e506aeaf15ae916705d9c8606f27579c46626443f0 | afa1d6a1e9a1c067e591e208a9efef3dc7c6c3dee46a0a3cd65d2e672e81ab59 | 27f979b2d9f00406f3c6f1e506aeaf15ae916705d9c8606f27579c46626443f0 | 27f979b2d9f00406f3c6f1e506aeaf15ae916705d9c8606f27579c46626443f0 | afa1d6a1e9a1c067e591e208a9efef3dc7c6c3dee46a0a3cd65d2e672e81ab59 | ddfaee38c1129263c965685153ed3dcecc0e681ea4bcf7ebdd565cbf023591a2 | LF |
| 0010_gamification-rewards | 55e7d4f7baa1c5c86a83f360e8eb8097638817ba05f02f93285912e13336f804 | 55e7d4f7baa1c5c86a83f360e8eb8097638817ba05f02f93285912e13336f804 | 5f9a519fc7335b8bfbada949b003dab8d3df28f9b004629136bd31718f3b1dec | 55e7d4f7baa1c5c86a83f360e8eb8097638817ba05f02f93285912e13336f804 | 55e7d4f7baa1c5c86a83f360e8eb8097638817ba05f02f93285912e13336f804 | 5f9a519fc7335b8bfbada949b003dab8d3df28f9b004629136bd31718f3b1dec | 70bc272d9eaa4093a791fbb62a649023e8f5b4219164fd48f9d916dfab4c8d61 | LF |
| 0011_exercise-correct-xp | 6783f4b66e34f112fb33a3251366755f9069f4fd5829ea508e0c26996319b4dc | 6783f4b66e34f112fb33a3251366755f9069f4fd5829ea508e0c26996319b4dc | d302c0cee6a26b32edc43d199e767c6ffa678a1c809b40d2216890d18e707001 | 6783f4b66e34f112fb33a3251366755f9069f4fd5829ea508e0c26996319b4dc | 6783f4b66e34f112fb33a3251366755f9069f4fd5829ea508e0c26996319b4dc | d302c0cee6a26b32edc43d199e767c6ffa678a1c809b40d2216890d18e707001 | 495a0d65b1acf7d567df119622f5d856f2fb0731d62a6d0d80ef8923c8bc34c1 | LF |
| 0012_us41_owner_content_overrides | 2c5925738743dcf057955c937f2c8838121088fca2411092851132264c70d8b7 | 6360d4a53af14f41175790cb8033ac4802d9f3a1b01e330311bfd6eda729c07e | 6360d4a53af14f41175790cb8033ac4802d9f3a1b01e330311bfd6eda729c07e | 2c5925738743dcf057955c937f2c8838121088fca2411092851132264c70d8b7 | 2c5925738743dcf057955c937f2c8838121088fca2411092851132264c70d8b7 | 6360d4a53af14f41175790cb8033ac4802d9f3a1b01e330311bfd6eda729c07e | 25041663f48e35b4e15f20036f819d4a5b5343d3764d335a3ebf4d8d64890690 | LF |
| 0013_runtime-vocabulary-sequence-privilege | f378a186c06f8f225bc25898064e5e40ebe8f4fab92262fee37f9374b3e0c8fd | 6d5f4a2b04a05d7515b258d78417ac837d515b234470debab3ae49a073a0757c | 6d5f4a2b04a05d7515b258d78417ac837d515b234470debab3ae49a073a0757c | f378a186c06f8f225bc25898064e5e40ebe8f4fab92262fee37f9374b3e0c8fd | f378a186c06f8f225bc25898064e5e40ebe8f4fab92262fee37f9374b3e0c8fd | 6d5f4a2b04a05d7515b258d78417ac837d515b234470debab3ae49a073a0757c | 566e888a9af15dca4e0876e7e30419af4542ba3a6f86633a0b2ce8b4c07c6e5a | LF |
| 0014_vietnamese_catalog_metadata | 40699f1088f69cd07e4a9fb38629b1792789c2c1ab764c4271f328c8ef871c8c | e9de92f426c66213d9412e531e4c1fbf330c72c3d6a8880d50e34fba762a5302 | e9de92f426c66213d9412e531e4c1fbf330c72c3d6a8880d50e34fba762a5302 | 40699f1088f69cd07e4a9fb38629b1792789c2c1ab764c4271f328c8ef871c8c | 40699f1088f69cd07e4a9fb38629b1792789c2c1ab764c4271f328c8ef871c8c | e9de92f426c66213d9412e531e4c1fbf330c72c3d6a8880d50e34fba762a5302 | a24b562220df36ced04a95230ee00cdeb6cfdfd9979848e829e35a52b3e48a8e | LF |
| 0015_clean_yellowjacket | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | 7f30095f9a030efa3656833f322d9bc97b41bf3a4feb146bd632aadac7742a55 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 | 7f30095f9a030efa3656833f322d9bc97b41bf3a4feb146bd632aadac7742a55 | daa5e8d6d2ff947a743a50097a46ee49f211e548b2c2f47e772ff103eb28afda | LF |
| 0016_nostalgic_mattie_franklin | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | b690ba4c84aec0e0562ca1b15c002956674d28c48b4376da27687a4f3554b2e7 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 | b690ba4c84aec0e0562ca1b15c002956674d28c48b4376da27687a4f3554b2e7 | 5f3a88974f24bc4ace30e0c418bc7dac511381996b396bc0f78181378c7805b3 | LF |
| 0017_nosy_hellfire_club | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | 54a6c96e92d91358f588d9ac6f81e47983ae718ac5519e03ae4e5fd6c72651c0 | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d | 54a6c96e92d91358f588d9ac6f81e47983ae718ac5519e03ae4e5fd6c72651c0 | c715b37e6fcba9d9e5018eb9a24c1a6060a31e9defc197e27fae30a02cb4e3fe | LF |

Raw file sizes and newline counts (CRLF, bare LF) also show that these are different checked-out byte streams. BOM is `NO` in both worktrees for every file.

| Migration | A bytes | A CRLF / bare LF / BOM | B bytes | B CRLF / bare LF / BOM |
| --- | ---: | --- | ---: | --- |
| 0000_application-schema | 2436 | 0 / 53 / NO | 2489 | 53 / 0 / NO |
| 0001_curious_miss_america | 1609 | 21 / 0 / NO | 1609 | 21 / 0 / NO |
| 0002_smiling_wrecking_crew | 781 | 11 / 0 / NO | 781 | 11 / 0 / NO |
| 0003_lazy_lady_deathstrike | 2984 | 51 / 0 / NO | 2984 | 51 / 0 / NO |
| 0004_scheduled_review_write | 5248 | 55 / 0 / NO | 5248 | 55 / 0 / NO |
| 0005_graceful_eddie_brock | 792 | 0 / 5 / NO | 797 | 5 / 0 / NO |
| 0006_sticky_risque | 4796 | 0 / 59 / NO | 4855 | 59 / 0 / NO |
| 0007_modern_mysterio | 6857 | 0 / 87 / NO | 6944 | 87 / 0 / NO |
| 0008_chief_morph | 382 | 0 / 1 / NO | 383 | 1 / 0 / NO |
| 0009_tricky_meggan | 378 | 0 / 1 / NO | 379 | 1 / 0 / NO |
| 0010_gamification-rewards | 3504 | 0 / 45 / NO | 3549 | 45 / 0 / NO |
| 0011_exercise-correct-xp | 294 | 0 / 1 / NO | 295 | 1 / 0 / NO |
| 0012_us41_owner_content_overrides | 212 | 1 / 0 / NO | 212 | 1 / 0 / NO |
| 0013_runtime-vocabulary-sequence-privilege | 243 | 2 / 0 / NO | 243 | 2 / 0 / NO |
| 0014_vietnamese_catalog_metadata | 7924 | 147 / 0 / NO | 7924 | 147 / 0 / NO |
| 0015_clean_yellowjacket | 17740 | 0 / 266 / NO | 18006 | 266 / 0 / NO |
| 0016_nostalgic_mattie_franklin | 1894 | 0 / 7 / NO | 1901 | 7 / 0 / NO |
| 0017_nosy_hellfire_club | 1027 | 0 / 9 / NO | 1036 | 9 / 0 / NO |

## Verification design and result

The verifier reads each migration through Drizzle, reads the source text with the same Buffer-to-string behavior, and creates three exact Drizzle SHA-256 candidates from the same logical SQL text: LF, CRLF, and bare CR. It accepts a DB row only when it equals one of those full-file hashes. It does not edit migrations or the ledger, strip a BOM, discard a terminal newline, or normalize SQL whitespace. Regressions cover LF/CRLF/bare-CR equivalence, modified SQL, appended trailing content, removed terminal newline, and BOM significance.

Read-only development scan succeeded: 18/18 ledger rows present; 0015, 0016, and 0017 exact under this deterministic verifier; historical content mismatches: none; catalog discovery and runtime snapshot produced. Both inspection transactions use `REPEATABLE READ, READ ONLY`. Current Phase 2E.3-contract fingerprint: `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`. The planner's full-snapshot fingerprint emitted by this specialized scan is `9834483fa3017eb801a059dc2adaf4c51843eb011610a0769faac9c445ae2869`.

## Phase 2E.3 / 2E.4A snapshot fingerprints

- Phase 2E.3 discovery fingerprint: `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`.
- Phase 2E.4A planner fingerprint: `fa8941ef8a458b58b6c2b548a50a1db5618221d4115d4d6f6ef914c2931c5d5d`.
- Current comparable discovery fingerprint: `464e6f0d6f9807f2b25d01c7d66b5ef9166c2b0808e19d31cd282a15652f6e7b`.
- `DATABASE_RUNTIME_CONTENT_CHANGED = NO` within the comparable Phase 2E.3 discovery contract; the exact fingerprint is unchanged.
- `SNAPSHOT_CONTRACT_CHANGED = YES`. Phase 2E.4A fingerprints the full `RuntimeSnapshot`: vocabularies, vocabulary mappings, topics and topic mappings, Learning Sets and mappings, vocabulary/topic links, Master topic memberships, Learning Set items and Master memberships, per-row progress vocabulary IDs, per-row review vocabulary IDs, and applied runs. The Phase 2E.3/current discovery fingerprint uses a canary-focused projection, candidate discovery results, aggregate history counts, Apple progress/review ranges and overlap count, membership/assignment aggregates, target/release/migration identity; it excludes learner IDs and timestamps. The current scanner's planner hash uses its reduced scan-specific `RuntimeSnapshot` object (empty topic/per-row history arrays plus aggregate extensions), so `9834…` and `fa8941…` are not hashes of the same snapshot shape. Their difference does not establish a database-content change. No learner IDs are included in this report.

## Release and owner-safety audit

- Canary release 2.1.0 remains APPROVED, schema 2.0.1, release hash `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.
- Immutable Master release content (`dataset.json`, pinned Master records and release hash): unchanged. App Import projection files remain as regenerated in Phase 2E.4A and were not changed in this phase. Phase 2E.4B regenerated only analysis-only candidate/proposal/review outputs; these do not change approved semantic content.
- Derived filenames ending in `-v2.json` alongside `artifactVersion=app-import-v3` are intentional stable paths: `scripts/import-master-vocabulary-v2.ts` reads `import/vocabulary-import-v2.json` and siblings, `scripts/transform-master-vocabulary-v2.ts` writes those paths, and release-builder/importer tests assert them. No architecture rule requires versioned filenames, so they are not renamed.
- Apple #1/#295 remain UNRESOLVED. Human-owned reconciliation is unchanged; all owner decisions remain open. Planner remains `canApply=false`.
- No migration execution, ledger update, runtime mutation, import APPLY, production connection, or Cloudinary operation occurred. Database writes: NONE.

## Validation

Focused migration/scanner tests passed (5 files / 27 tests); `pnpm typecheck`, `pnpm lint`, and `git diff --check` passed. Node v22.19.0 emitted the repository engine warning (expected v22.23.2).
