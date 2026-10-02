# Master Vocabulary V2 Phase 2B Pilot QA

**Release:** `vocabflow-master-v2` `2.0.0` / schema `2.0.1`

**State:** `DRAFT`; all Lexemes, Senses, classifications, Learning Sets, and set items are `IN_REVIEW`.

**Validation:** PASS — 0 errors, 0 warnings, 1 informational `DRAFT_WORKING_DATASET` result.

This is an editorial architecture pilot, not a finished learner vocabulary or a
production release. Vietnamese translations, definitions, examples, and
classifications are project-authored drafts. CEFR bands and the 1–100 scores
are unverified editorial estimates. No official CEFR vocabulary-list, IELTS,
or curriculum alignment is claimed.

## Coverage

| Measure | Pilot result |
|---|---:|
| Lexemes | 19 |
| Senses | 25 |
| Lexemes with multiple Senses | 6: `bank`, `run`, `record`, `light`, `water`, `play` |
| Part of speech | 5: NOUN, VERB, ADJECTIVE, ADVERB, CONJUNCTION |
| Lexical unit types | 3: WORD, PHRASAL_VERB, MULTIWORD_EXPRESSION |
| CEFR band labels | 5: A1, A2, B1, B2, C1 |
| Difficulty assignments | 25, editorial scale `VocabFlow pilot 1.0.0`; range 12–70 |
| Domain taxonomy values | 6: GENERAL_ENGLISH, ACADEMIC_ENGLISH, BUSINESS_ENGLISH, TRAVEL_ENGLISH, IT_TECHNOLOGY, HOSPITALITY |
| Topic taxonomy nodes | 21 total; 18 used by pilot assignments |
| Learning Sets | 7 |
| Age-group assignments | 15 across KIDS, TEEN, ADULT; no `ALL` value |
| School mapping | 1 demo-only Grade 1 assignment under an internal curriculum profile |
| Exam classification | 1 exploratory IELTS-tagging exercise; not an official exam claim |
| Classification records | 122 across TOPIC, DOMAIN, CEFR, DIFFICULTY, AGE_GROUP, SCHOOL_LEVEL, EXAM |
| Project-authored Provenance records | 256 |
| Image media slots | 23 PLANNED; 2 NOT_APPLICABLE |
| Pronunciation audio slots | 2 PLANNED; no bytes or provider deliveries |

The single pilot Difficulty Scale is `EDITORIAL`, version `1.0.0`, with rubric
`EDITORIAL-1`. It is not calibrated against learner outcomes and is not
calculated from CEFR. Audience assignments describe editorial suitability; no
hard age boundaries are defined. Topic assignments use a 21-node taxonomy
snapshot, including reusable parent-child nodes such as Food → Fruit,
Society → Government, and Technology → Computer science.

## Architecture cases

| Case | Result |
|---|---|
| `bank` | One Lexeme owns two Sense IDs. The finance Sense translates as `ngân hàng`, uses Finance and business-related classification, and has a financial-institution brief. The river Sense translates as `bờ sông`, uses Rivers and has a distinct river-edge brief. Each Sense has its own definition, example, topic assignment, and media slot. |
| `run` | One Lexeme has separate VERB “move on foot” and NOUN “short period of running” Senses. |
| `record` | The Lexeme default noun pronunciation is `/ˈɹɛk.ɚd/`; the verb Sense owns the `/ɹɪˈkɔɹd/` override. Each planned audio slot targets its exact owner. |
| `light` | Separate NOUN illumination and ADJECTIVE “not heavy” Senses have independent Vietnamese translations and topic/media briefs. |
| `look after` | Stored as `PHRASAL_VERB`, with a care meaning and a natural example. |
| `ice cream` | Stored as `MULTIWORD_EXPRESSION`, separate from phrasal verbs. |
| `democracy` | Abstract government concept with a project-authored definition and example; its image slot is `NOT_APPLICABLE`. |
| `although` | CONJUNCTION with a contrastive example; its image slot is `NOT_APPLICABLE`. |
| `mitigate` | Academic Sense has a provenance-backed editorial C1 estimate and an exploratory IELTS classification explicitly marked non-official. |
| `algorithm` | Sense is classified under IT_TECHNOLOGY and ACADEMIC_ENGLISH, with a specific computing topic and a process-focused planned image brief. |
| `reservation` / `check in` | Separate travel/hospitality Senses and Learning Set memberships; `check in` is explicitly a `PHRASAL_VERB`. |
| Learning Set reuse | The exact apple-fruit `masterSenseId` is reused in Basic starter pilot, Basic fruits, and A1 core pilot. No Sense record is copied. |

All 25 Senses have a Vietnamese translation, an English learner-friendly
definition, an English example, and a Vietnamese example translation. Linguistic
content and editorial classifications link to project-authored Provenance.
All stable IDs were generated as UUIDv7 and persisted in the pinned records.

## Problems discovered and resolution

1. **Planning-only media could not be reproducibly pinned.** The previous
   manifest shape required a byte-version pin with `sha256`, so a `PLANNED` or
   `NOT_APPLICABLE` asset with no bytes had no valid exact release pin. This was
   a contract/schema gap exposed by the bank Sense briefs and abstract/function
   word media cases. Added `includedMediaAssets` slot pins for exact asset ID,
   record path, and JCS content hash; kept byte-version pins separate. Bumped
   the serialization schema version to `2.0.1`, documented the distinction,
   and added draft and approved-release regression tests. The pilot pins all 27
   asset records and has zero byte-version pins.
2. **Human approval and external alignment are not available in this pilot.**
   This is a review-state/content limitation, not a schema blocker. Content
   remains `IN_REVIEW`; CEFR, exam, and curriculum records are labeled as
   editorial or internal demo data with project-authored evidence.
3. **Execution environment Node version is below the package engine.** The
   project requests Node `22.23.2`; this run used Node `22.19.0` with pnpm
   `11.17.0`. The validator and relevant checks passed, but the engine warning
   remains visible.

## Deferred

- Owner review and approval of Vietnamese translations, examples, pronunciation,
  and classifications; no record is approved by this pilot.
- Defensible external CEFR descriptors or vocabulary lists, official exam
  syllabus evidence, and a real jurisdiction-specific curriculum source.
- Empirical calibration of the difficulty scale and definitions for age-group
  boundaries.
- Image/audio generation, license review, media byte hashing, quality assurance,
  and delivery-provider metadata.
- Master-to-App transformation and import output (Phase 2C); this pilot does
  not produce `vocabulary-import-v2.json`.

Runtime APIs, UI, PostgreSQL schema/migrations, Neon, the existing importer, and
Cloudinary were not part of this pilot's dataset work.
