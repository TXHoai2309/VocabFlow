# Hybrid Oxford + 4600 — 100-Sense Offline Source Proof

## Scope and safety

This is a sanitized source-candidate workspace, not a Master release. It does not materialize learner-facing Master content or allocate Master UUIDs.
The proof is offline. It performs no database writes, APPLY, migrations, production connection, media upload, or TTS generation.
Raw note fields stay in the ignored `.vocabflow-local/master-v2-hybrid-source/` cache; no source media bytes are copied into the repository.
Source and media rights remain unknown/unverified; no technical media candidate is ship eligible.

## Source summary

| Metric | Oxford package | 4600 package |
| --- | ---: | ---: |
| File | `5000_T_vng_Ting_Anh_Oxford_5000_A1-C1.apkg` | `4600 English Vocab.apkg` |
| Size bytes | 1893404 | 584090331 |
| SHA-256 | `7efd68822a49fd984948cbbf8cb5b1249d602a5f47d1a4693e1dbdc3a60e1abd` | `495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b` |
| Archive members | 5 | 13990 |
| Collection DB | `collection.anki21` | `collection.anki21` |
| Notes / cards | 5004 / 10008 | 4673 / 4673 |
| Models | `English Vocab` | `English Vocab Note` |
| Normalized unique headwords | 5001 | 4654 |
| Duplicate normalized headword groups | 3 | 19 |
| Oxford derived sense candidates | 8003 | Not segmented from this source model |
| Media map entries | 1 | 13986 |
| Media-map entries resolved / missing; archive members unreferenced | 1 / 0; 2 | 13986 / 0; 2 |
| Actual image / audio / other archive members | 0 / 0 / 3 | 4669 / 9317 / 2 |

Oxford grouping produced 7935 structured sense groups and 68 note-level fallback candidates. All selected Oxford candidates use structured groups. Field presence counts use raw nonempty fields; media types are classified by member signatures where possible and bytes are not extracted to the workspace.

## Selected 100 candidates

- Total candidate Senses: **100**.
- Unique Oxford Lexeme candidates: **77**.
- Source split: Oxford + 4600 headword match **70**; Oxford only **20**; 4600 only **10**.
- CEFR: A1 18, A2 18, B1 18, B2 18, C1 18; unassigned **0**.
- POS: NOUN 45, VERB 25, ADJECTIVE 22, ADVERB 5; other **3**; unassigned **0**.
- Distinct multi-sense Lexemes represented: **55**; multi-sense Lexemes with 2+ selected Senses: **12**; selected Senses from multi-sense Lexemes: **68**.
- Multiword / phrasal candidate count: **5**.
- Selection fallbacks: none.

## Alignment, Master audit, and media

- Alignment: ALIGNED 23; HEADWORD_ONLY 3; AMBIGUOUS 44; NO_MATCH 20; 4600-only authoring required 10.
- Existing Master: existing Sense candidates 2; existing Lexeme / new Sense candidates 3; new Lexeme candidates 95; ambiguous 0.
- Technical media candidates: images 33; word audio 33; example audio 33; ambiguous targets 10; rights-confirmed reusable media 0.
- Example audio remains Example-targeted and is never labeled pronunciation audio. Images are assigned to a Sense target only after semantic alignment.
- `SOURCE_RIGHTS_VERIFIED=NO`; `MEDIA_REUSE_ELIGIBLE=NO`.
- Explicit license-grant indicators: Oxford NO; 4600 NO. General rights-metadata markers: Oxford NO; 4600 NO.

## Quality review signals

- Missing Vietnamese evidence: 10; missing English-definition evidence: 67; missing example evidence: 0.
- HTML noise: 100; duplicate source-headword candidates: 0; ambiguous existing-Master matches: 0.
- Selected candidates with Oxford remote pronunciation references: 0; URLs were not fetched or stored.
- QA flag counts: `{"EXAMPLE_AUDIO_NOT_PRONUNCIATION": 33, "HTML_NOISE": 100, "IMAGE_SENSE_TARGET_AMBIGUOUS": 10, "MEDIA_RIGHTS_UNKNOWN": 100, "MISSING_EN_DEFINITION": 67, "MISSING_VI": 10, "MULTIWORD_NORMALIZATION_REVIEW": 5, "POLYSEMY_COLLISION_RISK": 42, "POS_CONFLICT": 22, "SEMANTIC_ALIGNMENT_AMBIGUOUS": 44, "SOURCE_TEXT_RIGHTS_UNKNOWN": 100}`.

## Reproducibility and gates

- Proof fingerprint: `276a2c39e311cb9f434976dd4b22f06d2db2f335b8b882b0bdfb2e6af3eb6323`.
- Repeat run: YES; both passes recompute the source SHA-256 values and proof fingerprint.
- Candidate IDs are SHA-256-derived `SOURCE-CANDIDATE-*` values. No `masterLexemeId`/`masterSenseId` is assigned to new candidates.
- Existing canonical Master package was read only. Master release 2.1.0 and runtime canary remain outside this workspace.

```text
DATABASE_WRITES = NONE
IMPORT_APPLY_EXECUTED = NO
MIGRATIONS_EXECUTED = NONE
MASTER_CANONICAL_MUTATION = NONE
MEDIA_UPLOADS = NONE
SOURCE_FILES_VERIFIED = YES
SAMPLE_EXACTLY_100_SENSES = YES
PROOF_DETERMINISTIC = YES
RUN_1_PROOF_FINGERPRINT = 276a2c39e311cb9f434976dd4b22f06d2db2f335b8b882b0bdfb2e6af3eb6323
RUN_2_PROOF_FINGERPRINT = 276a2c39e311cb9f434976dd4b22f06d2db2f335b8b882b0bdfb2e6af3eb6323
HYBRID_100_EDITORIAL_AUTHORING_READY = YES
```
