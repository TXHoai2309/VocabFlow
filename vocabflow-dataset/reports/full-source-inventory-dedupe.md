# Phase 2H.1 — Full source inventory, normalization and dedupe

Status: PASS — offline source inventory and review planning only.

## Source corpora

| Corpus | Source records | Unique normalized headwords | Duplicate groups | POS present | CEFR evidence | Explicit English definitions | Heuristic English text | Meaning fields | Example fields | Media entries / refs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Oxford 5000 | 5004 | 5001 | 3 | 5004 | 5004 | 0 | 0 | 0 | 5004 | 1 / 10863 |
| 4600 English Vocab | 4673 | 4654 | 19 | 4670 | 4673 | 0 | 4664 | 4673 | 4673 | 13986 / 14012 |

Raw source records across the files are kept as source identities only; their total is not a runtime word count. The two corpora overlap. Oxford is the lexical and sense-structure evidence backbone. The 4600 corpus remains enrichment evidence. Every note keeps its Anki note ID, GUID, model, raw field values, tags, card IDs and deck identity. Source APKG SHA-256 covers the original package; source media is not extracted to release assets.

## Source file identities

- `ENGLISH_VOCAB_4600` — ../4600 English Vocab.apkg, 584090331 bytes, SHA-256 `495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b`.
- `OXFORD_5000` — ../5000_T_vng_Ting_Anh_Oxford_5000_A1-C1.apkg, 1893404 bytes, SHA-256 `7efd68822a49fd984948cbbf8cb5b1249d602a5f47d1a4693e1dbdc3a60e1abd`.

Oxford groups structured evidence from `Example Data`; the 4600 deck keeps one source note per record and may combine English meaning and Vietnamese in a raw field. The extractor does not turn these into canonical Master definitions. POS/CEFR are source values, with deck/tag CEFR origins recorded separately.

## Normalized headword overlap

- Exact NFC/visible-text/casefold overlap: **3512**.
- Oxford only: **1489**; 4600 only: **1142**.
- Union of unique normalized headwords: **6143**; source-record totals are not an additive runtime word count.
- Candidate groups sharing an explicit POS label: **3450**; conflicting POS groups: **61**; CEFR conflict groups: **96**.
- Human sense/content review groups: **4170**; possible-polysemy groups: **2191**; multiple-record same-source groups: **22**; POS conflicts: **61**; CEFR conflicts: **96**.
- Punctuation normalization collisions: **0**; definition-content conflict groups: **19**; example-variant groups: **3510**; Vietnamese-meaning-variant groups: **1993**.

A normalized spelling match is only a lexical lookup candidate. It does not establish Lexeme identity or Sense identity. Repeated source notes remain separate records. Oxford's structured POS/example groups are preserved as source evidence; they are not assigned VocabFlow Sense IDs.

## Master and legacy comparisons

The approved Hybrid-100 release `2.2.1` (44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c) contains 87 Lexemes and 100 Senses. Same normalized lemmas are reported as Sense-uncertain. No Master IDs or runtime mappings were created.

Legacy coverage compares the accepted 2G.3C sanitized content snapshot: 2018 rows; categories: `{"AMBIGUOUS_POTENTIAL_COVERAGE_REQUIRES_HUMAN_REVIEW": 294, "NO_EXACT_NORMALIZED_SOURCE_HEADWORD_FOUND": 1284, "POTENTIAL_HEADWORD_COVERAGE_REQUIRES_HUMAN_COMPARISON": 440}`. These are possible headword coverage signals only. No legacy mapping, cleanup classification, or history changed.

## Provenance and rights

The inspected note-field schemas contain no dedicated license/attribution field. This inventory does not establish whether a license exists elsewhere. Text rights and media rights remain **UNKNOWN / REVIEW_REQUIRED**. Media reference names, index IDs and byte lengths are inventoried; no image/audio file was promoted or copied into the Master release. Local availability is not evidence of redistribution permission.

## Identity and safety

Policy: NFC, visible headword extraction with raw source field preserved, Unicode whitespace collapse, Unicode casefold; retain punctuation, accents, parentheses, token order, multiword phrases and apparent inflections. No stemming or accent folding. A secondary punctuation-insensitive key only creates collision review tasks.

No APKG, approved release file, runtime database or mapping was modified. Database access NONE. Database writes NONE. Master authoring/apply NONE. Legacy cleanup NONE. Production UNTOUCHED.

Validation scope: PASS covers only the deterministic inventory checks computed by this generator. Python syntax compilation, focused tests, repository typecheck/lint, dataset/Master validators and the frozen release validator are NOT_EXECUTED_BY_GENERATOR / EXTERNAL_VERIFICATION_REQUIRED. The generator checks the declared release-manifest hash against its pin and counts the loaded inventory; it does not recompute the Hybrid release hash or tree fingerprint. Frozen fingerprint constants are expectations, not observed validator results.

Separately executed closure evidence, exact commands, exit codes and environment limitations: [docs/ai-progress.md#phase-2h1-validation-provenance-closure-2026-10-08](../../docs/ai-progress.md#phase-2h1-validation-provenance-closure-2026-10-08). These external results are not included in deterministic generated evidence.

Previous Phase 2H.1 fingerprint: `db21e13f409a3873478962db13841b42d1fc13d49399f21c628809cf3019d3a1` — SUPERSEDED_BY_VALIDATION_PROVENANCE_CORRECTION. Reason: validation provenance correction only; source hashes, data semantics and review queue remain unchanged.

PHASE_2H1_FINGERPRINT: `58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53`

Offline deterministic replay: `python scripts/phase-2h1-source-inventory.py --check`. This rereads source evidence, rebuilds artifacts and compares them to disk without DB access or file mutation. It does not rerun external tools.
