# VocabFlow — Master Vocabulary Dataset Architecture Audit

Audit date: 2026-10-02

## Scope and evidence limits

This is a read-only audit of the checked-out repository, its tracked schema/migrations, services, import and media scripts, documentation, and current UI source. No application code, schema, migration, seed, or source dataset was changed. No database connection or live database query was made.

The existing worktree already had uncommitted changes in `apps/web/src/features/learners/vocabulary-list-page.test.tsx`, `apps/web/src/features/learners/vocabulary-list-page.tsx`, and `apps/web/src/styles.css` before this report was added. Those files were left untouched. UI observations below refer to the currently checked-out source, including those existing edits.

The ignored local vocabulary source at `local-data/2000_Common_English_Vocabulary_Dataset/vocabulary.json` is not present in this checkout. Therefore this audit cannot count actual duplicate headwords, inspect the actual `bank` records, regenerate the media manifest, or verify a live database's current rows. Counts below are explicitly identified as facts recorded in tracked project documentation or manifests, not newly queried runtime facts.

Primary evidence: `packages/contracts/src/index.ts`; `apps/api/src/db/schema.ts`; migrations `0003`, `0005`–`0007`, `0012`, and `0014`; `apps/api/src/vocabulary.ts`, `learner-vocabulary.ts`, `topics.ts`, and `learning-sets.ts`; `scripts/import-vocabulary-catalog.ts`, `vocabulary-curation.ts`, `enrich-starter-vocabulary.ts`, `vocab-media-manifest.ts`, `vocab-media-upload.ts`, and `validate-dataset.ts`; current web feature components; `docs/stories/US-04`, `US-25`–`US-29`, `US-41`; `docs/media-manifest.md`, `docs/cloudinary-media-upload.md`, and `docs/vocab-enrichment.md`.

## 1. Current architecture

Runtime content is stored in PostgreSQL under `vocabflow_app`. Drizzle declares the current schema in `apps/api/src/db/schema.ts`, and the forward migration history is under `drizzle/migrations`. `packages/contracts` defines the shared Zod DTOs and the starter seed format. The Hono API reads vocabulary, topic, learning-set, learner-progress, and review data; the web app consumes these DTOs. Vocabulary is shared catalog content; learner progress and review events point back to the catalog row by its integer vocabulary ID.

There are two different tracked content paths today:

1. The starter seed artifact is a versioned wrapper named `VOCABFLOW_STARTER_V1`, with metadata and a `records` array. Its records have explicit application IDs and nullable optional content.
2. The larger catalog importer reads a raw JSON array from the local dataset. It validates source IDs, word and Vietnamese meaning, optional text fields, and one optional image/audio reference per record. It combines those records with a generated media manifest and Cloudinary media map, then inserts or updates catalog rows using `(source_dataset, source_record_id)` as source identity. New imported rows are initially disabled. The importer is specific to that source catalog; it is not a generic Master Dataset importer.

The curation path is a separate, explicit allow-list. The tracked US-41 manifest names selected source rows, expected words, grade, topics, learning sets, activation, and any approved meaning override or image quarantine. Its reviewed data contains 213 imported candidates in 11 sets, assigned by grade group (100 Grade 1, 73 Grade 2, 40 Grade 3). This is a repository curation artifact and evidence of intended/applicable curation; this audit did not check which target database has received it.

### Fields currently consumed by the UI

| Surface | Fields actually used |
|---|---|
| Vocabulary List | `word`, `vietnamese`, `ipa`, `imageUrl`, `audioUrl`, and `level`; search matches English word/Vietnamese meaning and the level selector filters `level`. |
| Vocabulary Detail | `word`, `ipa`, `vietnamese`, `definitionEn`, `exampleEn`, `imageUrl`, `audioUrl`, legacy `topic`, `level`, `status`, and `nextReviewDate`. Its related-word panel finds peers by matching the legacy `topic` string. Synonym/antonym panels are currently empty-state copy, not data-backed relationships. |
| Study / Flashcard and exercises | Flashcard reads `word`, `ipa`, `vietnamese`, `definitionEn`, `exampleEn`, legacy `topic`, `imageUrl`, and `audioUrl`. Exercise generation uses vocabulary ID and `contentVersion` in exercise IDs; image/listening exercise availability depends on the corresponding media URL. |
| Learning Sets | Catalog uses set `name`, `description`, `grade`, and `vocabularyCount`; set detail uses item order plus vocabulary `word` and `vietnamese`. Learner assignment UI reads the set and active assignment state. |
| Topics | Topic navigation uses topic `name` and `description`; selected topic results display vocabulary `word` and `vietnamese`. Membership is obtained from the normalized topic join/API, not inferred from the legacy string in the page. |

The vocabulary list page and its test are modified in the pre-existing worktree, so those observations describe that current local version. Other consumers can require/transport DTO fields without visibly rendering every field.

Tracked project records describe 30 starter rows plus 1,994 catalog rows, or 2,024 total, and historical migrations for 17 canonical topics and five initial compatibility sets. These are documented dataset/database baselines, not a fresh database query.

## 2. Current vocabulary schema

The current `vocabflow_app.vocabularies` row has these fields:

| Field | Nullable? | Current meaning/use |
|---|---|---|
| `id` | No | Integer primary key, identity generated by default. It is the runtime identity referenced by progress/review. |
| `word` | No | English surface form/headword. There is no uniqueness constraint on it. |
| `ipa` | Yes | One optional, undifferentiated pronunciation string; no US/UK distinction. |
| `vietnamese` | No | Required source/canonical Vietnamese text. Runtime may project `vietnamese_override` over this value. |
| `vietnamese_override` | Yes | Owner-curated effective Vietnamese display meaning. Raw imported value remains in `vietnamese`. |
| `definition_en` | Yes | One English definition field. No definition language or sense ID. |
| `example_en` | Yes | One English example field. No Vietnamese example or example identity/audio. |
| `image_url` | Yes | One learner-facing image URL. No source/license/prompt/asset-version fields in this table. |
| `image_quarantined` | No, default false | Curation/moderation switch; API reads mask a quarantined image as null. |
| `audio_url` | Yes | One learner-facing pronunciation audio URL. No accent, voice, transcript, source, or per-audio version fields. |
| `topic` | Yes | Legacy free-text topic from the source data; no foreign key. Still exposed through the vocabulary DTO. |
| `level` | Yes | Enum `GRADE_1`–`GRADE_5` or `GENERAL`; this is a school/general classification, not CEFR. |
| `enabled` | No, default false | Runtime catalog availability. |
| `content_version` | No, default 1; check >= 1 | Version of the vocabulary content row used by importer/enrichment and exercise identity. |
| `source_dataset` | Yes | Source-catalog identity component for imported records. |
| `source_record_id` | Yes | Source-row identity component; paired with `source_dataset` under a unique constraint. |
| `created_at`, `updated_at` | No, default now | Database audit timestamps; not part of the vocabulary DTO. |

The public `VocabularyDto` is narrower: `id`, `word`, `ipa`, `vietnamese`, `definitionEn`, `exampleEn`, `imageUrl`, `audioUrl`, legacy `topic`, nullable `level`, `enabled`, and `contentVersion`. It does not expose override/source IDs, quarantine state, or timestamps. APIs apply the Vietnamese override and image quarantine projection before constructing the DTO.

By content ownership, `word`, IPA, meanings, definitions, examples, pronunciation/image/audio assets describe lexical content. `enabled` and `contentVersion` describe runtime/content lifecycle. `level` is instructional placement. `topic` and topic memberships are classification. Source identity and curation overrides are provenance/editorial metadata. These concepts currently coexist on one vocabulary row even though they have different cardinality and lifecycle.

Evidence: `apps/api/src/db/schema.ts:128-148`; `packages/contracts/src/index.ts:187-212,512-523`; `apps/api/src/vocabulary.ts:57-72,95-105`; `apps/api/src/learner-vocabulary.ts:65-84`; `drizzle/migrations/0012_us41_owner_content_overrides.sql`.

## 3. Current taxonomy

The contract enum called `vocabulary_level` contains `GRADE_1`, `GRADE_2`, `GRADE_3`, `GRADE_4`, `GRADE_5`, and `GENERAL`. The same enum is used by `vocabularies.level` and nullable `learning_sets.grade`. It has no Pre-A1/A1–C2 values and does not support Grades 6–12. The list UI labels these values as school grades or “Chung”. `GENERAL` is a broad fallback in the current grade-oriented field; it is not a CEFR band or difficulty score.

The normalized topic catalog has `id`, stable `slug`, localized/display `name` and `description`, `sort_order`, `enabled`, and optional unique `source_topic`. Topics have no parent/child column. Current canonical topics are flat. Migration `0006` populated 17 topic values derived from source `topic` strings. The later curation manifest also defines explicit topic memberships for the starter rows and selected imported rows.

There are two topic representations at once:

- `vocabularies.topic`: nullable raw/free-text source field, still in the DTO and used by the detail page to show the topic and find “related words”.
- `topics` plus `vocabulary_topics`: normalized topic catalog and many-to-many links used by the Topics API and topic browse route.

These representations can disagree. The normalized table supports multiple topics per vocabulary, but the DTO/UI do not carry the normalized topic list through the general vocabulary read. The Topics route gets its membership by a separate API query.

There is no first-class field/table in the current app model for CEFR, difficulty, age group, certification/exam, domain, tags, or hierarchical subtopic. A learning-set name/description can communicate an audience or exam informally, but the set schema does not make that property machine-readable.

Evidence: `apps/api/src/db/schema.ts:23,151-190`; `drizzle/migrations/0006_sticky_risque.sql`; `packages/contracts/src/index.ts:187-212`; `apps/web/src/features/learners/vocabulary-detail-page.tsx:59-61,175-178,207-208,275-276`.

## 4. Current learning-set relationship

The database already supports the desired reuse model. `learning_set_items` is a join table with `(learning_set_id, vocabulary_id)` as its composite primary key and a per-set `sort_order`. A vocabulary row may therefore be a member of multiple sets without duplicating the vocabulary row; the same pair cannot be inserted twice. Its indexes support both set-to-vocabulary and vocabulary-to-set lookup.

This is distinct from `learner_learning_sets`, which records whether a learner has an active assignment to a set. `learner_progress` is unique on `(learner_id, vocabulary_id)`, not on a set. If the same word appears in two assigned sets, progress remains one shared progress item. The queue is designed to take the union of eligible assigned-set vocabulary and deduplicate at the vocabulary identity.

Initial migration `0007` defines five compatibility sets: Starter, Grade 1 Starter, Family Basics, School Basics, and Everyday Words. The tracked US-41 curation defines 11 further sets for Grades 1–3. Set metadata currently consists of slug, name, description, nullable grade, enabled, sort order, and timestamps; it does not have explicit `audience`, `domain`, `exam`, or set type.

Examples such as “First 100 Words”, “A1 Core Vocabulary”, “IELTS Academic”, “Travel English”, and “IT English” fit the current membership structure. They would be separate set records and ordered memberships, with no duplicated vocabulary row. The current `grade` field cannot represent CEFR/exam/domain reliably; set category would need Master metadata (or future explicit app metadata) rather than overloading `grade`.

Evidence: `apps/api/src/db/schema.ts:166-220,227-241`; `apps/api/src/learning-sets.ts:111-137,190-222`; `apps/api/src/review-queue.ts:190-245`; migration `0007_modern_mysterio.sql`; `docs/stories/US-28-learning-sets.md` and `US-29-assign-learning-sets.md`.

## 5. Current media pipeline

### Image and audio files

The database stores nullable URL strings, not file bytes or a media-asset record. The starter seed accepts optional `imageUrl` and `audioUrl` directly. The larger source dataset instead provides `image_files` and `audio_files` references (zero or one reference of each type per source row). The media manifest generator reads `vocabulary.json`, resolves paths within the dataset root, inspects image/audio bytes, computes SHA-256 hashes, deduplicates identical files, and emits provider-neutral content-addressed keys such as `media/v1/images/<sha256>...` and `media/v1/audio/<sha256>.mp3`.

The Cloudinary uploader consumes that manifest. It has plan-only behavior by default and explicit apply/canary modes, verifies source hashes before upload, records non-secret checkpoints/failure/unusable reports and maps provider-neutral keys to uploaded secure URLs. Cloudinary public IDs use `vocabflow/images/content-v1/<sha256>` and `vocabflow/audio/content-v1/<sha256>`. Upload does not update the database.

The catalog importer joins source IDs to the media manifest, then keys to the Cloudinary media map; only uploaded usable media with a secure URL is set on `image_url` or `audio_url`. Missing/unusable optional media resolves to null and is reported. Image quarantine is an additional curation gate: raw URL may remain stored, while learner-facing APIs return null for quarantined images.

Tracked docs report one generated-manifest snapshot with 1,937 unique images and 1,973 unique audio assets, but the underlying ignored source and generated files were absent here; those values were not regenerated during this audit.

### What is not tracked as media metadata

Runtime does not keep image prompts, visual-style ID, origin/license/attribution, provider/model, asset review history, audio text, audio accent, TTS voice, pronunciation asset version, checksums at the row level, or example-sentence audio. The hash-based manifest and provider media map handle file identity/upload, but they are not a durable editorial media catalog. `contentVersion` is a vocabulary content revision, not a separately versioned image/audio revision.

Evidence: `scripts/vocab-media-manifest.ts:282-334,359-465`; `scripts/vocab-media-upload.ts:353-418,478-510,585-616`; `scripts/import-vocabulary-catalog.ts:236-289,311-399,419-440`; `docs/media-manifest.md`; `docs/cloudinary-media-upload.md`; `scripts/enrich-starter-vocabulary.ts`.

## 6. Problems, constraints, and quality gaps

| Target | Current support | Limitation |
|---|---|---|
| CEFR Pre-A1–C2 | None in current enum/schema/UI | Adding these values to `level` would mix CEFR with school grades. Needs a separate field or relation. |
| Difficulty label/score | None | Learner-relative difficulty is not the same as CEFR or school year; no score or calibration rule exists. |
| Audience KIDS/TEEN/ADULT/ALL | None | Learner profiles and catalog content do not have this filter/classification. |
| Grades 1–12 | Partial Grades 1–5 plus GENERAL | Current enum and UI stop at Grade 5; grade system/curriculum is not identified. |
| Certification/exam | None | No structured IELTS/TOEIC/TOEFL/Cambridge/VSTEP association or relevance/provenance. |
| Domain | None | Academic, business, travel, technology, hospitality, and others have no structured field. |
| Topic/subtopic hierarchy | Flat normalized topic table plus legacy string | There is no parent relation or subtopic identity; raw legacy topic and canonical memberships can diverge. |
| Word senses/POS | No first-class model | One vocabulary row has one `word`, one required Vietnamese string, one optional definition and one example. There is no POS/sense ID, even though duplicate spellings are possible. |
| Media provenance/version | URL fields and hashed upload manifest | No row-level source/license/prompt/accent/voice/version/review history. One word row can only expose one image and one pronunciation URL. |
| Content revision | `contentVersion` exists and appears in generated exercise IDs | Import/enrichment use it for text/media changes, but curation writes fields including `vietnamese_override` without updating `content_version`. Because exercise IDs use that version, effective-content revision behavior should be reviewed before it becomes a cross-pipeline guarantee. |

### Data quality checks: current versus needed

Current automated validation checks the starter wrapper/types, unique starter IDs, exact 30-record starter identity/defaults, missing optional IPA/image/audio warnings, raw catalog record/source-ID shape, duplicate source IDs, valid required text, optional text types, media-reference count, and normalized-word duplicate counts. The catalog importer reports normalized duplicate lemma groups but does not treat every repeated normalized word as invalid; that is necessary if repetitions later represent distinct senses, but currently the model does not explain them.

For Master v2, automate: stable ID uniqueness; normalized lemma candidates; duplicate sense-ID/reference checks; required translation and language checks; enum validation for CEFR/difficulty/audience/exam/domain; allowed parent-child topic pairs and hierarchy-cycle checks; learning-set references and duplicate/order checks; valid media URI/provider/content type/hash/status; media-reference existence; and no self-relation or duplicate relation edge. Add semantic warnings for topic/level or CEFR/difficulty combinations that warrant review. Do not auto-fail solely because two senses share a lemma, because difficulty differs from CEFR, or because one image/audio hash is reused. Related-word cycles are only invalid for relation types defined as acyclic; synonym and general related-word graphs can validly contain cycles.

Translation nuance, sense boundaries, example naturalness, exam relevance, image clarity/cultural neutrality, and whether an abstract word should have an image require human editorial review. Broken URLs can be checked automatically, but transient CDN failures must not be mistaken for bad source media. License/source completeness should block publication where rights are unknown.

Evidence: `scripts/validate-dataset.ts`; `scripts/import-vocabulary-catalog.ts:311-399`; `packages/contracts/src/index.ts:512-523`; `apps/web/src/features/study/exercise-generator.ts:174,202,230,304`; `scripts/vocabulary-curation.ts:689-700`.

## 7. Proposed Master Dataset v2

Keep the Master model independent from the app table/DTO. Recommended logical structure:

### Lexeme (headword identity)

- `masterLexemeId`: stable, opaque ID that never depends on array order or app integer ID.
- `language`: BCP-47 or an agreed controlled language code; initially `en`.
- `lemma` and normalized lemma; preserve display spelling separately from normalization.
- `lexicalUnitType`: word, multiword expression, phrasal verb, idiom, etc. This avoids assuming every catalog item is one orthographic word.
- pronunciation records with accent/locale, IPA US/UK, and notes; a pronunciation can belong to a lexeme or a sense when distinction requires it.
- lifecycle/review status and creation/update timestamps.

### Sense (teachable meaning)

- `masterSenseId`, `masterLexemeId`, stable sense order and optional editorial status.
- `partOfSpeech` and, where useful, countability/transitivity/register/region usage.
- one or more meaning translations with language and provenance; English definition and Vietnamese definition/translation belong here.
- one or more examples with separate English/Vietnamese text and stable example IDs.
- CEFR assignment with source/method/confidence; difficulty score and rubric kept separate.
- age-group, school/curriculum, domain, exam, topic, and tag memberships attached to the sense when they describe the meaning rather than every spelling of the lemma.
- synonym, antonym, derivative, and related-word edges with an explicit relation type and target lexeme/sense ID.

### MediaAsset and editorial provenance

Store media as independently versioned assets rather than new columns on a vocabulary record. Each asset should include stable asset ID, target type/ID (lexeme, sense, or example), kind (image, pronunciation, example audio), version, active/review status, URL/provider key, hash, source/license/attribution, created time, and supersedes relation. Image-only fields can include prompt, style ID, model/provider, and QA result. Audio-only fields can include exact `audioText`, locale/accent, voice/model/provider, rate, transcript/hash, and QA result.

### Dataset and audit metadata

At dataset/revision level keep dataset ID, semantic version, schema version, source/provenance, license policy, reviewer/approval state, and changelog. At field/relationship level preserve source and editorial overrides where source tracking matters. Use an explicit `reviewStatus` such as draft, in-review, approved, retired. A Master revision should not be overloaded as a media version or app row `contentVersion`.

For storage, a normalized logical model can be serialized as a repository-managed set of files (for example lexemes/senses plus taxonomy and media manifests) with schema validation. Whether the files are JSON/JSONL or a separate authoring database is an operational choice; the key boundary is stable identity and a deterministic transform, not a particular file extension.

## 8. Proposed taxonomy

Keep the dimensions orthogonal and independently sourced:

| Dimension | What it answers | Suggested representation |
|---|---|---|
| CEFR | Which proficiency descriptor/band is targeted? | Controlled value `PRE_A1`, `A1` … `C2`, attached to a sense with source/confidence. |
| Difficulty | How hard is this item under the VocabFlow editorial rubric? | Canonical score 1–5; labels such as VERY_EASY…VERY_HARD are a derived display mapping, not a second independently edited truth. |
| Age group | For what intended ages is this content suitable? | One or more controlled audience values. If `ALL` is stored, do not also store individual groups on the same assignment. |
| School | Which school/curriculum level teaches it? | Explicit curriculum/region plus grade 1–12 where known; do not treat country-specific grade labels as universal. |
| Exam | Which exam objectives make it relevant? | Separate exam membership and optional relevance rating/source; do not imply official status without evidence. |
| Domain | In which professional/usage area is the sense used? | Multi-value controlled domain taxonomy, such as business, academic, travel, technology, hospitality. |
| Topic | What subject does it concern? | Hierarchical topic identity, for example Food → Fruit. |
| Learning set | Which curated ordered course/list includes it? | Separate many-to-many set membership with its own metadata and order. |

Example for the fruit sense of “apple”: CEFR A1; difficulty score 1 (display label EASY if that is the agreed rubric); age group ALL; school curriculum/grade Grade 1; topic Food → Fruit; domain GENERAL_ENGLISH; no exam tag unless there is an evidence-based reason; memberships may include First 50 Words, First 100 Words, Grade 1 Starter, Basic Fruits, and IELTS Foundation. These labels do not replace one another and do not imply each other.

Topic and subtopic should be two levels of a general hierarchy, not separate free-text columns. Store stable taxonomy IDs/slugs and parent relationship; validate that an assigned child belongs under the expected parent. A deeper hierarchy later should not require another schema redesign.

## 9. Word versus word sense recommendation

The current app does not have a true polysemy model. A vocabulary row is identified by an integer row ID and a word string; that row carries one Vietnamese text, one optional definition, and one optional example. `word` is not unique in the DB, and source identity is the importer key. The importer counts duplicate normalized words, but neither the schema nor API assigns explicit POS/sense identities. A single Vietnamese string can potentially contain multiple glosses, but the model cannot distinguish their examples, media, level, or progress.

The actual local source file is not present in this checkout, so this audit cannot say whether the source has one `bank` row, multiple `bank` rows, or a combined meaning. The code alone does not resolve that question.

**Recommendation:** model `Lexeme → Sense` in Master v2 and make each teachable meaning a stable `masterSenseId`. A simple word with one clear meaning has one sense. “Bank” has at least a financial institution sense and a river-edge sense, with separate POS/definition/translation/example/classification/media where appropriate. Keep pronunciation at lexeme level when pronunciation is shared; permit sense-level pronunciation if homographs differ.

**Advantages:** senses receive accurate translations/examples/illustrations; CEFR/domain/exam can classify meanings instead of an ambiguous spelling; duplicate spellings become explainable rather than accidental; content can grow without concatenating glosses.

**Costs:** curation and QA require more decisions; one lemma can create multiple app rows if the runtime remains one-card/one-meaning; app IDs, queue entries, and progress need a clear sense-to-runtime identity map. Splitting a current row into senses later would affect user progress/review history if a new row ID is introduced.

This is a Master Dataset recommendation, not a decision to migrate the app now. To preserve the current runtime, the transform can initially emit one selected sense per existing app vocabulary ID. Multiple sense rows should only be imported once product behavior for progress and review at the sense level is accepted.

## 10. Media architecture and guidelines

### Proposed pipeline

Keep media production separate from vocabulary editorial content:

1. Approve a sense and its semantic/visual/audio brief.
2. Create an image prompt or exact audio text from the approved sense/example.
3. Generate or source media; store provider, model/voice, prompt/settings, source, license, style/accent, and content hash.
4. Run automatic file checks and human QA. Keep states such as planned, generated, review, approved, rejected, superseded.
5. Upload approved bytes to storage/CDN and map the stable Master asset to a provider URL.
6. When only style, image, voice, or pronunciation changes, create a new media asset version and preserve prior history. Do not rewrite the Master lexical content or bump unrelated text content versions.
7. The app transform selects one currently approved URL per supported runtime field. Example audio remains separate from word pronunciation audio.

### Image guideline

Use a 1:1 square image; one clear central subject; no text, labels, logos, or watermarks; neutral/light uncluttered background; consistent visual language; clear contrast at thumbnail size. Aim for understandable by a child without looking like a toddler-only toy, so it also serves adult learners. Keep style ID and image prompt/version in Master rather than assuming `imageUrl` captures them.

Concrete nouns such as apple, dog, and chair are good direct-image candidates. Abstract or grammatical terms such as democracy, mitigate, and although should not be forced into a literal object image. Options: use a reviewed scene illustrating the meaning, use a neutral concept diagram only when approved, or mark image status `NOT_APPLICABLE`/unavailable and keep the word usable without image. Polysemous words require a sense-specific scene; a generic image for “bank” can teach the wrong meaning.

### Audio guideline

Choose one initial default accent/voice (en-US is a reasonable first default if the product has no curriculum constraint), and retain accent/locale as metadata. Do not generate en-US and en-GB for every item before a real use case needs both. Maintain the ability to add them later.

Word audio stores exact spoken text, locale/accent, voice/provider/model, rate, asset version/hash, and QA status. Example audio is separately tied to an example ID, with transcript text and its own version; changing a voice should not change vocabulary meaning metadata. A content-addressed path could follow a stable pattern such as `sense/<senseId>/pronunciation/<locale>/<voice>/<version>-<hash>.mp3`; the URL should not be the semantic identity.

Automatic QA can check a playable format, nonempty duration, valid URL, and that transcript text matches the approved target text. Human QA should sample pronunciation, stress, clipping, volume, unnatural pacing, and accent consistency. For images, check decode/aspect/hash and then human semantic suitability, text/watermark, ambiguity, and style consistency.

## 11. Master → App import mapping

Recommended flow:

Master lexeme/sense + taxonomy + approved media
↓ deterministic transform and validation
versioned App Import Dataset
↓ ID-aware importer/upsert
existing VocabFlow runtime tables and DTOs

The current starter contract wrapper and larger-catalog importer are different formats. The latter expects the existing source JSON array plus media sidecars and source IDs; it does not accept a proposed Master schema directly. Treat the future App Import Dataset as a distinct, versioned transform output and preserve the current importer until an adapter is deliberately reviewed.

### Example: apple

Illustrative Master content:

- Lexeme: stable ID `en-apple`; language `en`; lemma `apple`; lexical-unit type `word`.
- Sense: stable ID `en-apple-noun-fruit`; POS `noun`; Vietnamese `quả táo`; English definition “the round fruit of an apple tree”; example “She ate an apple.” with reviewed Vietnamese translation.
- Classification: CEFR A1, editorial difficulty score 1, audience ALL, explicitly reviewed Grade 1/curriculum, topic Food → Fruit, domain GENERAL_ENGLISH, no exam tag unless curated; several learning-set memberships.
- Media: approved sense-matched image and an approved en-US word-pronunciation asset; example audio is optional and independent.

Illustrative legacy App Import record for a new row would contain only: application/source ID mapping; `word: apple`; `ipa`; `vietnamese`; `definitionEn`; `exampleEn`; chosen `imageUrl`; chosen `audioUrl`; legacy `topic: Food` for compatibility; `level: GRADE_1` only when explicitly approved; `enabled`; `contentVersion`. The app receives no CEFR/difficulty/audience/exam/domain/POS/sense/media-provenance metadata until its contracts and UI need them.

For the existing starter apple ID, preserve its current app ID and content history. Do not key application identity only by lemma: when “bank” has two senses, a future mapping registry must map distinct Master sense IDs to distinct runtime vocabulary IDs if both are activated. Never recycle an app ID already referenced by progress or review rows.

## 12. Compatibility matrix

| Classification | Recommendation |
|---|---|
| **KEEP NOW** | Keep integer `vocabularies.id` and all current progress/review references; keep existing runtime fields/DTO and nullable media behavior; keep `enabled`; keep `contentVersion`; keep `vocabulary_topics` and `learning_set_items` many-to-many links; keep learner-to-set assignment separate. Keep current topic string and `level` as compatibility inputs while new Master data is authored. |
| **EXTEND LATER** | Add optional app-facing CEFR, expanded school-grade support, explicit domain/audience/exam metadata, or topic parent information only when a use case/UI/API needs it. Prefer independent fields/catalogs instead of repurposing `level`, `topic`, or `learning_sets.grade`. These are additive product changes, not a prerequisite for building Master data. |
| **REQUIRES MIGRATION** | Persist CEFR in runtime; add Grades 6–12 beyond the present enum; add `topics.parent_id` or another hierarchy relation; add runtime sense IDs/tables; support multiple/locale-specific media assets or example audio in runtime; rename/remove legacy fields; or change app/progress identity from word row to sense. A sense migration in particular needs an ID/backfill strategy for existing learner progress and review history. |
| **MASTER-ONLY initially** | POS, sense structure and stable Master IDs, US/UK IPA split/pronunciation notes, Vietnamese/English example translations, difficulty score, audience, school/curriculum provenance, domains, exam tags/relevance, synonyms/antonyms/related edges, hierarchical topic detail, image prompt/source/license/style/version/status, audio transcript/accent/source/voice/version/status, example audio, editorial review history, and per-field provenance. |

“Extend later” describes product sequencing; when one of those values must be stored in PostgreSQL, it still requires an additive migration. Master-only values can be collected and validated without changing the app database or UI.

## 13. Migration roadmap

### Phase 0 — Audit (this report)

Document current fields, import/media contracts, table cardinality, app surfaces, constraints, and evidence limits. No code/data changes.

### Phase 1 — Approve Master identity and field definitions

Decide the lexeme/sense policy, stable ID rules, supported language codes, spelling normalization, curriculum jurisdiction, difficulty rubric, audience semantics, content/media revision rules, source citation/license policy, and review states. This is the key decision before accumulating data.

### Phase 2 — Define controlled taxonomies and validation contract

Version CEFR, grades/curricula, audience, domains, exams, difficulty, topic hierarchy, and learning-set categories separately. Define which values allow multiple assignments and which content conflicts are errors versus human-review warnings.

### Phase 3 — Create Master v2 schema and a small pilot

Author roughly 20–30 records to exercise simple concrete words, one polysemous word such as bank, domain/exam examples, and abstract/function words such as democracy/although. Include sense IDs, provenance, image/audio decisions, and one example with translation. Validate schema and reviewer workflow before building hundreds of rows.

### Phase 4 — Build deterministic transform and dry-run report

Transform approved Master senses into the existing app-compatible shape, retain a stable Master-to-app ID map, and show inserts/updates/skips/disablements without DB mutation. Prove `apple` can preserve its starter row and prove two `bank` senses cannot collide. Keep media manifest/provider mapping versioned and independent.

### Phase 5 — Curate the first 100–300 items

Scale only after the pilot validates editorial fields and import output. Prioritize a deliberate mix of CEFR, grade, topic, and domains. Do not label a dataset official CEFR/exam content without reviewed source evidence.

### Phase 6 — Media pipeline rollout

Adopt independent media asset IDs/versions, image style guide, default audio voice/accent, technical and human QA, attribution, upload map, and replacement/supersession flow. Keep runtime URL projection compatible.

### Phase 7 — App import v2 adapter

Add an explicit adapter with a versioned contract; compare with the existing source importer in dry-run mode; preserve application IDs, enabled state, learner progress, review events, and content-version invariants. Migrate only selected app fields.

### Phase 8 — Runtime schema/UI extensions when justified

Add CEFR/exam/domain filters or topic hierarchy only when product stories require them. Add runtime senses/multiple media only after agreeing how study, progress, reviews, and UI represent those distinctions. Use reviewed additive migrations; no wholesale rewrite is needed.

## 14. Risks

1. **Identity/progress:** splitting a current row into senses or changing its app ID can detach a learner’s progress and review history. Keep a stable mapping and do not repurpose IDs.
2. **False certainty in classification:** CEFR, school grade, exam relevance, difficulty, audience, domain, and topic measure different things. Inferred labels can mislead learners; preserve source, method, and reviewer.
3. **Curriculum scope:** Grade 1 is not universal. Include country/curriculum when school-grade claims matter.
4. **Legacy/normalized topic drift:** the detail page still uses the legacy free-text topic even though topic browse uses join-table membership.
5. **Revision semantics:** content version is part of generated exercise IDs, while owner curation can change effective meaning without changing it. Define which content mutations increment which revision before adding caches or more importers.
6. **Rights and attribution:** image/audio availability does not prove reuse or redistribution rights. Store origin/license and attribution before scaling a public dataset.
7. **Media replacement:** current row URLs do not retain old assets or explain voice/style/model changes. Keep media version history outside the current vocabulary `contentVersion`.
8. **Ambiguous images/audio:** polysemous words and abstract concepts can be made less teachable by a plausible but wrong asset. Make assets sense-specific and allow “no image”.
9. **Import drift:** current catalog importer owns raw source fields; curation owns overrides/grade/topic/set and image quarantine; a future importer must not overwrite editorial decisions.
10. **Unverified runtime state:** the raw local dataset and live database were not available/queried, so actual `bank` occurrences and applied target state remain unverified by this audit.

## 15. Recommended immediate next step

Before creating a large dataset or changing the app schema, approve a short Master v2 data dictionary and identity policy: specifically whether the durable learning item is a sense, how stable lexeme/sense IDs work, where POS/classification attaches, how school curriculum is named, and how content versus media versioning works. Then validate that policy with a 20–30 item pilot containing `apple`, both meanings of `bank`, and at least one abstract/function word. Include provenance and a draft Master-to-current-App mapping in the pilot. This will expose schema and editorial gaps while the runtime remains unchanged.

### Bước tiếp theo nên làm gì trước?

**Chốt data dictionary và chính sách Lemma → Sense trước; sau đó làm pilot nhỏ 20–30 mục để kiểm chứng mapping sang schema VocabFlow hiện tại. Chưa cần tạo migration hay mở rộng app runtime ở bước này.**
