# Phase 2H.2A — full Master expansion candidate preparation

Status: READY FOR OWNER REVIEW. Offline editorial planning only. No candidate identity approved; no canonical Master records authored.

Remote/local input baseline: `6a1fe9889162cfec3e7bc102aa64a84da2b1bc73`. Phase 2H.1 fingerprint: `58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53`.
Phase 2H.2A fingerprint: `5b754405d9072e79b603e6b008bd8788a7dae7aed4f2eedde3087482fc0bc7ff`.

## Existing Master V2 materialization contract

This ledger is evidence metadata, not a parallel Master schema. Future authored records must use the existing schemas and identity/versioning policy. Candidate group keys retain the accepted Phase 2H.1 keys; they are never UUIDs or Master entity IDs.

| Concern | Existing representation and gate |
|---|---|
| Lexeme / Sense / polysemy | `lexeme.schema.json`: lexical form, language, lexicalUnitType, aliases; `sense.schema.json`: one teachable meaning owned by masterLexemeId. Multiple POS/meanings require review, not automatic splitting. |
| POS | Sense partOfSpeechCode enum; source NUMBER has no direct enum counterpart and needs editorial review. |
| CEFR / difficulty / age / grade / topic / domain / exam | common.schema.json classification: independent Sense assignments. CEFR valueCode + framework; difficulty numericValue 1–100 + scaleId; AGE_GROUP code; school/topic/domain/exam valueRef to controlled taxonomy. Grade is not CEFR. |
| Pronunciation | Lexeme owner XOR Sense override; locale/accent/IPA, optional audioAssetId. Source IPA is unverified evidence. |
| English definitions / Vietnamese translations / examples | Sense-owned immutable linguistic children; APPROVED children require nonblank text and provenanceIds. Example translations are distinct from lexical translations. Original authorship and editorial verification required. |
| Provenance / source evidence / rights | provenance.schema.json supports sourceType, fieldPath, source URLs, license/attribution and authoredBy; it does not prove permission or model a full clearance workflow. Unknown rights remain in planning metadata; no LICENSED_SOURCE claim is fabricated. |
| UUIDv7 / immutable revisions | Allocate once during authorized entity creation; never from spelling/hash. Stable identity + append-only lexemeRevision/senseRevision/classificationRevision; taxonomyVersion identifies immutable snapshots. |
| Release pins | dataset.schema.json pins exact IDs/revisions/recordPath/contentHash; canonical releaseHash excludes only releaseHash. Never choose latest revision implicitly. |
| Learning sets / taxonomy | learning-set.schema.json ordered Sense memberships with stable item IDs and selection provenance; taxonomy.schema.json catalogs frameworks/topics/domains/exams/curricula/schoolLevels/difficultyScales. Runtime relationship labels are evidence, not approved taxonomy mappings. |

Contract sources: [Dataset README](../README.md), [schemas](../schemas/), [identity/versioning policy](../../docs/architecture/master-vocabulary-v2-identity-versioning-policy.md), [US-45](../../docs/stories/US-45-master-vocabulary-v2-runtime-import-bridge.md). Approved Hybrid-100 structural examples: light has distinct Sense-owned content/POS; water source noun evidence does not authorize the excluded runtime #11 / Master verb pair. No new sense definitions are inferred from spelling.

## Full ledger and priorities

6143 groups exactly once; 9677 source notes traceable by note ID/GUID, record hash, input artifact/index, raw field pointers and Oxford structured group ordinals. No raw definitions/examples/media payload is duplicated. Input artifact canonical hashes pin all evidence; resolve candidate keys by lookup, not JSON Pointer parsing.
Source accounting remains Oxford 5004/5001/3; 4600 4673/4654/19; overlap 3512; source-only 1489/1142; union 6143. All 4170 accepted review groups remain indexed. Master lemma alignment 87 is not Sense identity proof.

Overlapping dimensions (not a sum partition):

- EXISTING_MASTER_LEMMA: 87
- LEGACY_HISTORY: 58
- LEGACY_PRODUCT: 708
- BOTH_SOURCE_CLEAN_LEXICAL: 3358
- OXFORD_ONLY: 1489
- VOCAB4600_ONLY: 1142
- POS_CONFLICT: 61
- CEFR_CONFLICT: 96
- POSSIBLE_POLYSEMY: 2191
- MULTIWORD_PHRASAL: 27
- SOURCE_DUPLICATES: 22
- RIGHTS_GAP: 6143
- CONTENT_GAP: 6143

Disjoint processing partition: Master lemma overlap → legacy history → legacy product → complex review → clean both-source lexical evidence → Oxford-only → 4600-only. Within each partition sort normalized headwords. All 6143 are accounted for; lower priority never implies deletion or low relevance.

- BOTH_SOURCE_CLEAN_LEXICAL: 1677
- COMPLEX_REVIEW: 1950
- EXISTING_MASTER_LEMMA: 87
- LEGACY_HISTORY: 57
- LEGACY_PRODUCT: 646
- OXFORD_ONLY: 717
- VOCAB4600_ONLY: 1009

Legacy source-covered rows: 734; unmatched: 1284. All 75 history-protected runtime IDs remain protected (covered 58, unmatched 17). Missing exact headwords do not invalidate legacy content. #11/#295/#849 and every owner-excluded pair retain identityClaim NONE; #284 remains outside legacy with its accepted mapping untouched.

## Bounded pilot

100 distinct headword groups. Stable reserved bank/record/light/run/water patterns first, then deterministic ordered quotas; earlier selections cannot be duplicated. Full strata/intersection evidence is in pilot-cohort.json. A shortage is reported and filled from the documented remainder, never fabricated.

| Selection stratum | Target | Eligible | Selected | Shortfall |
|---|---:|---:|---:|---:|
| PROTECTED_STRUCTURAL_PATTERNS | 5 | 5 | 5 | 0 |
| EXISTING_MASTER_LEMMA | 10 | 87 | 10 | 0 |
| LEGACY_HISTORY | 10 | 58 | 10 | 0 |
| LEGACY_PRODUCT | 10 | 708 | 10 | 0 |
| POS_CONFLICT | 10 | 61 | 10 | 0 |
| CEFR_CONFLICT | 10 | 96 | 10 | 0 |
| MULTIWORD_PHRASAL | 10 | 27 | 10 | 0 |
| POSSIBLE_POLYSEMY | 10 | 2191 | 10 | 0 |
| OXFORD_ONLY | 10 | 1489 | 10 | 0 |
| VOCAB4600_ONLY | 10 | 1142 | 10 | 0 |
| STRAIGHTFORWARD_BOTH_SOURCE | 5 | 1883 | 5 | 0 |

## Owner gate, content and safety

Every pilot decision defaults to UNRESOLVED. Choices distinguish identity reuse with proof, proposed new Lexeme, new Sense under an existing Lexeme, more evidence, or batch deferral. Selection and readiness for editorial review do not authorize authoring. Currently materializable: 0; unresolved identities: 6143. Future authoring needs explicit identity proof, owner disposition, rights disposition, original verified content with provenance, then separate authoring authorization.
Both corpus text/media rights remain UNKNOWN_REVIEW_REQUIRED. Oxford has no explicit canonical definition field; 4600 mixed Meaning text is heuristic evidence only. Gaps: English definitions/examples, verified Vietnamese translations/pronunciations, genuine authorship provenance, rights disposition, independent classifications. No media promotion. Existing approved content can only be reused after proven identity; gaps are future requirements, not claims that frozen content is missing.
New Master data first → separately authorized Development apply → legacy relationship migration → evaluate cleanup. No live Neon access, runtime IDs/mappings, DB writes, Master authoring/apply, relationship changes, disable/delete, or Production operations. All authorization flags false.

## Verification provenance

Generated PASS covers computed ledger/accounting/pin checks only. External tests/typecheck/lint/frozen validator are NOT_EXECUTED_BY_GENERATOR. Exact executions are recorded [separately](../../docs/ai-progress.md#phase-2h2a-candidate-preparation-2026-10-08).
Offline replay: `python -B scripts/phase-2h2a-master-expansion.py --check`. It reads accepted inputs and compares deterministic artifacts without writing or running external commands. Unknown CLI arguments are rejected. No timestamps participate in this fingerprint.

Next: owner review of the materialization contract and pilot. No commit/push; Phase 2H.2B / 2H.3 not started.
