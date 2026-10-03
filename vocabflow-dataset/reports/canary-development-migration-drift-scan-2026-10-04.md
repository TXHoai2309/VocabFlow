# Development Runtime Reconciliation Scan — Blocked

Scanned: 2026-10-03T18:15:56.869Z

Development target project/branch/database were provider-verified. Migration history was read using the verified `vocabflow_migration` role in a `REPEATABLE READ, READ ONLY` transaction. The actual DB history does not match the complete local migration chain, so the catalog scan was stopped before reconciliation planning.

- Applied/local migrations: 18/18
- Latest DB migration: 0017_nosy_hellfire_club
- Required migration hashes (0015–0017):
| Migration | Matched | Expected local hash | Database hash |
| --- | --- | --- | --- |
| 0015_clean_yellowjacket | NO | 7f30095f9a030efa3656833f322d9bc97b41bf3a4feb146bd632aadac7742a55 | f29a8d6e6d659bd64db5ad79450f99fee1f63c9748e66445570620bdf4ca5640 |
| 0016_nostalgic_mattie_franklin | NO | b690ba4c84aec0e0562ca1b15c002956674d28c48b4376da27687a4f3554b2e7 | fde7d92ee9baa200d50584379be6826da05e5ebf2adf07f332a62be7864cc820 |
| 0017_nosy_hellfire_club | NO | 54a6c96e92d91358f588d9ac6f81e47983ae718ac5519e03ae4e5fd6c72651c0 | e6f74f0f93a300f6ca7252dca86549034fa74486359296349e807a6d3a43875d |

- Missing/mismatched journal migrations: - No missing tag detected; applied history still differs from the local migration chain.
- Missing journal rows: none
- Local hash drift: 0000_application-schema, 0001_curious_miss_america, 0002_smiling_wrecking_crew, 0003_lazy_lady_deathstrike, 0005_graceful_eddie_brock, 0006_sticky_risque, 0007_modern_mysterio, 0008_chief_morph, 0009_tricky_meggan, 0010_gamification-rewards, 0011_exercise-correct-xp, 0012_us41_owner_content_overrides, 0013_runtime-vocabulary-sequence-privilege, 0014_vietnamese_catalog_metadata, 0015_clean_yellowjacket, 0016_nostalgic_mattie_franklin, 0017_nosy_hellfire_club

No runtime catalog query, reconciliation candidate artifact, planner, or database mutation was performed.
