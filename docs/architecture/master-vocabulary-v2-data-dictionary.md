# VocabFlow Master Vocabulary V2 — Logical Data Dictionary

**Status:** Accepted Phase 1 architecture baseline. This document defines the logical Master model; it does not define PostgreSQL tables, an importer implementation, or a runtime migration. Its serialized document shapes are defined by the schema-only package in `vocabflow-dataset/`.

## 1. Model decisions

- The Master Dataset is the editorial source of truth. Neon/PostgreSQL remains the app runtime store and receives a projection of approved Master content.
- The durable learning item is a **Sense**. A **Lexeme** is its headword/lexical identity and can contain multiple senses.
- A Sense may have many translations, definitions, examples, classifications, relations, media assets, and Learning Set memberships.
- A Learning Set contains ordered Sense references. Reuse a Sense across sets; do not copy the Lexeme or Sense per set.
- Classification attaches to a Sense when it describes a particular meaning. Lexeme-level pronunciation is the default; a Sense can override it where a homograph or pronunciation variant requires that.
- Language belongs to each linguistic value, not to a Vietnamese-named core field. Translation and definition are separate concepts.
- IDs are stable identities; words, POS labels, slugs, topic names, taxonomy values, and array positions are editable attributes.
- The logical model is language-extensible. Initial content may use English Lexemes and Vietnamese Translations, but the schema concepts do not bake that pair into their names.

## 2. Dictionary conventions

“Required” means required for a published/approved record unless a row says “conditional”. Draft records may be incomplete but must be marked draft and cannot be projected for learners. Cardinality is relative to the owning entity. IDs in this document follow the separate identity policy: opaque UUIDv7 values. `Code` and `slug` are human-readable stable keys for taxonomy lookup, not durable record identity.

Localization is represented as language-tagged child records or language maps with equivalent validation. Prefer child records for values that require independent provenance or review. Timestamps are UTC instants. A timestamp, source URL, reviewer name, or asset URL is not an identity.

For the schema package's immutable revision artifacts, a Lexeme snapshot serializes its aliases and Lexeme-owned pronunciations, and a Sense snapshot serializes its translations, definitions, examples/example translations, and Sense-owned pronunciation overrides. A Learning Set snapshot serializes its Learning Set Items in `items`; a Taxonomy Snapshot contains the exact catalog records for its version. Those child records keep their stable IDs across corrections to the same conceptual child; the next parent revision contains the corrected child state, while the previous revision artifact remains available. Classification assignments and Relation edges have independent revisions and are pinned separately because their edits do not automatically advance a Sense revision.

## 3. Dataset and release manifest

**Owner entity:** Dataset release. A dataset release is an immutable, named snapshot of included Master identities and their exact revisions. Master identities are not regenerated for each release. Published revision artifacts are immutable files/records; a later edit appends a new revision and never overwrites the artifact selected by an older release.

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `datasetId` | UUIDv7 | Required; one per dataset lineage | Dataset | Stable identity for the VocabFlow Master catalog or a separately governed subset | Never changes between releases; example `0199f7e2-70c0-7abc-8def-0123456789ab` (UUIDv7 shape). Not the app database ID. |
| `datasetCode` | String | Required; 1 | Dataset | Human-readable namespace/key | Lowercase stable token such as `vocabflow-master-en`; unique in the Master registry. Not derived from a release number. |
| `name` | Localized text | Required; one or more | Dataset | Display name | Nonblank per language tag; e.g. English “VocabFlow Master Vocabulary”. |
| `description` | Localized text | Optional; zero or more | Dataset | Dataset scope and selection notes | Each localization has a BCP 47 language tag; avoid claims of official exam/CEFR coverage without evidence. |
| `datasetVersion` | SemVer string | Required; one per release | Dataset release | Version of the curated content release | Valid `MAJOR.MINOR.PATCH`; e.g. `2.0.0`. Semantics are defined in the identity/versioning policy. |
| `schemaVersion` | SemVer string | Required; one per serialized artifact | Dataset release | Version of the data shape/contract used to serialize the release | Independent of `datasetVersion`; e.g. `2.0.0`. A field shape change need not mean the vocabulary content changed. |
| `status` | Enum | Required; one | Dataset release | Editorial/release state | `DRAFT`, `IN_REVIEW`, `APPROVED`, `RETIRED`; only approved release content can enter a learner-facing projection. |
| `includedLexemes` | Pinned-record reference list | Required; zero or more | Dataset release | Exact Lexeme state included in the release | Each entry contains `masterLexemeId`, `lexemeRevision`, `recordPath`, and SHA-256 `contentHash`. Resolve the stated revision and path only; never substitute the latest revision. |
| `includedSenses` | Pinned-record reference list | Required; zero or more | Dataset release | Exact teachable Sense state included in the release | Each entry contains `masterSenseId`, `senseRevision`, `recordPath`, and `contentHash`. Every Sense and owning Lexeme must resolve at the pinned revisions; a release may include only selected senses of a polysemous Lexeme. |
| `includedClassifications` | Pinned-record reference list | Required; zero or more | Dataset release | Exact classification assignments included in the release | Each entry pins `classificationId` + `classificationRevision`, path, and content hash. Classification edits do not silently change an older Sense snapshot. |
| `includedLearningSets` | Pinned-record reference list | Required; zero or more | Dataset release | Exact set definition and ordered membership included in the release | Each entry pins `learningSetId` + `learningSetRevision`, path, and content hash. The set revision captures its item membership and order. |
| `includedTaxonomySnapshots` | Pinned snapshot reference list | Required; zero or more | Dataset release | Exact taxonomy state used by included classifications | Each entry pins `taxonomyId` + `taxonomyVersion`, path, and content hash; taxonomy references resolve against these snapshots, not current catalogs. |
| `includedMediaAssetVersions` | Pinned media-version reference list | Required; zero or more | Dataset release | Exact selected media slot/version and bytes | Each entry pins `mediaAssetId`, `mediaAssetVersion`, asset-record path/hash, and the full byte `sha256` where bytes exist. A delivery URL/provider placement is not the selected media identity. |
| `includedRelations` | Pinned-record reference list | Required; zero or more | Dataset release | Exact relationship edges included in the release | Each entry pins `relationId` + `relationRevision`, path, and content hash. |
| `includedProvenance` | Immutable-record reference list | Required; zero or more | Dataset release | Evidence records needed to interpret included claims | Each entry pins `provenanceId`, path, and content hash. A corrected source claim receives a new immutable provenance record. |
| `releaseHash`, `releaseHashAlgorithm` | SHA-256, controlled string | Required for `APPROVED`; absent for `DRAFT`/`IN_REVIEW` | Dataset release | Integrity hash for the canonical manifest and pinned content references | Use `sha256-canonical-json-v1`: SHA-256 over RFC 8785 JCS canonical UTF-8 manifest bytes with `releaseHash` omitted; the manifest includes every exact revision/content hash and selected media byte hash. |
| `createdAt`, `releasedAt` | UTC timestamp | Created required; release optional until approved | Dataset release | Snapshot creation and publication times | `releasedAt` required when status is `APPROVED`; not used to generate IDs or infer language level. |
| `changeSummary` | Localized text | Optional; zero or more | Dataset release | Human-readable description of changes | Does not replace revisions or provenance; e.g. “Adds reviewed fruit and school senses.” |

## 4. Lexeme

**Owner entity:** Lexeme. Lexeme captures a lexical form and language identity. It does not own a particular Vietnamese translation, learning-set membership, or sense-specific classification.

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `masterLexemeId` | UUIDv7 | Required; 1 | Lexeme | Durable identity for this lexical unit | Immutable; independent of lemma, POS, spelling normalization, source row, or app integer ID. |
| `language` | BCP 47 language tag | Required; 1 | Lexeme | Language of the lemma, such as `en` | Canonical casing and valid registered language tag; no `english` free text. Separate from a translation’s target language. |
| `lemma` | String | Required; 1 | Lexeme | Preferred display/base form | NFC-normalized, trimmed, nonblank; preserve meaningful case/punctuation and multiword forms. Example `bank`, `take off`. |
| `normalizedLemma` | String | Required/generated; 1 | Lexeme | Search/deduplication comparison form | Deterministic language-aware normalization, stored with a normalization policy version. It is an index/detection aid, never an ID or automatic merge instruction. |
| `lexicalUnitType` | Enum | Required; 1 | Lexeme | Kind of lexical unit | Controlled values such as `WORD`, `MULTIWORD_EXPRESSION`, `PHRASAL_VERB`, `IDIOM`; `take off` may be a phrasal verb. Extend by schema version, not arbitrary text. |
| `displayOrder` | Integer | Optional; 0..1 per Lexeme collection | Lexeme | Editorial order in a selected catalog view | Nonnegative; presentation only and never identity. Use dataset/set ordering when order is collection-specific. |
| `lexemeRevision` | Positive integer | Required; 1 | Lexeme | Revision of Lexeme-owned editorial fields | Starts at 1 and increments through the controlled write path; it is not the runtime `contentVersion`. |
| `status` | Enum | Required; 1 | Lexeme | Lifecycle state | `DRAFT`, `IN_REVIEW`, `APPROVED`, `RETIRED`, `MERGED`; only approved Lexemes are eligible for release. |
| `mergedIntoLexemeId` | UUIDv7 reference | Conditional; 0..1 | Lexeme | Canonical Lexeme after an approved merge | Required only for `MERGED`; must point to another existing non-self identity; preserve the old identity as an alias. |
| `createdAt`, `updatedAt` | UTC timestamp | Required; 1 each | Lexeme | Editorial audit times | Set by the controlled authoring workflow; not identity and not revision substitutes. |

## 5. Part of speech and pronunciation

### Part of speech

POS describes the Lexeme’s grammatical category in a particular Sense record when category depends on meaning/use. A project-controlled `partOfSpeechCode` value is attached to Sense and may be localized for display. Do not encode POS into `masterLexemeId` or `masterSenseId`.

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `partOfSpeechCode` | Controlled code | Optional; 0..1 per Sense | Sense | Grammatical category | Use a versioned POS vocabulary such as `NOUN`, `VERB`, `ADJECTIVE`, `ADVERB`, `PREPOSITION`; avoid unreviewed variants such as “n.” and “noun” in canonical data. |
| `grammarNotes` | Localized text | Optional; 0..many | Sense | Usage constraints useful for teaching | Language-tagged, concise and sense-specific; e.g. transitive/intransitive note for one verb sense. |

### Pronunciation

**Owner entity:** Pronunciation. A Pronunciation belongs to one Lexeme by default or to one Sense as a deliberate override. A Sense without an override inherits the applicable Lexeme pronunciations.

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `pronunciationId` | UUIDv7 | Required; 1 | Pronunciation | Stable identity for an accent/variant pronunciation record | Immutable, not derived from IPA or audio URL. |
| `masterLexemeId` | UUIDv7 reference | Conditional; 0..1 | Pronunciation | Lexeme-level owner | Set this field for a Lexeme pronunciation and omit `masterSenseId`. |
| `masterSenseId` | UUIDv7 reference | Conditional; 0..1 | Pronunciation | Sense-level override owner | Set this field for a Sense override and omit `masterLexemeId`; resolve the owning Lexeme through `Sense.masterLexemeId`. Exactly one owner field is present; both and neither are invalid. |
| `locale` | BCP 47 language/locale tag | Required; 1 | Pronunciation | Language and regional variant, e.g. `en-US`, `en-GB` | Canonical tag; keep distinct from the learner’s UI language. |
| `accentCode` | Controlled code | Optional; 0..1 | Pronunciation | More specific pronunciation variety | E.g. `US_GENERAL`, `UK_SOUTHERN_ENGLAND`; define controlled values rather than interpreting URL names. |
| `ipa` | String | Optional; 0..1 | Pronunciation | IPA transcription for this variant | Validate allowed IPA Unicode and nonblank text; do not merge US and UK strings into one ambiguous field. |
| `pronunciationNotes` | Localized text | Optional; 0..many | Pronunciation | Stress, syllable, or variant note | Language-tagged; distinguish editorial notes from the IPA value. |
| `audioAssetId` | UUIDv7 reference | Optional; 0..1 | Pronunciation | Approved spoken-word media slot | Must resolve to an approved pronunciation Audio Media Asset for the same owner and locale. URL is not the reference. |
| `isPreferred` | Boolean | Required; 1 | Pronunciation | Default pronunciation within the owner/locale scope | At most one preferred pronunciation per owner and locale; explicit reviewer decision. |
| `status` | Enum | Required; 1 | Pronunciation | Editorial state | Same review lifecycle as other content; only approved pronunciation is projected. |

## 6. Sense

**Owner entity:** Sense. This is the durable semantic learning item. It may have multiple translated forms or definitions, but one record must represent one teachable meaning/use.

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `masterSenseId` | UUIDv7 | Required; 1 | Sense | Durable identity for one meaning/use | Immutable; never based on spelling, display order, POS, topic, grade, or Learning Set. |
| `masterLexemeId` | UUIDv7 reference | Required; many senses to one Lexeme | Sense | Owning lexical identity | Must resolve. Sense and Lexeme IDs are never interchangeable. |
| `senseLabel` | Localized text | Optional; 0..many | Sense | Short editorial label for editors or advanced UI | Not the translation itself; e.g. “financial institution”. |
| `senseOrder` | Integer | Required; 1 per Lexeme ordering | Sense | Stable editorial presentation order among sibling senses | Positive integer; unique within the Lexeme in a release. Reordering does not change Sense identity. |
| `partOfSpeechCode` | Controlled code | Optional; 0..1 | Sense | Grammatical category of this sense | Must resolve to the POS vocabulary version; `bank` as a financial institution can be `NOUN`. |
| `usageRegister` | Controlled code | Optional; 0..many | Sense | Formal, informal, technical, archaic, etc. | Values are versioned and language-aware; e.g. `FORMAL`. |
| `regionCodes` | Controlled region codes | Optional; 0..many | Sense | Region-specific usage | Distinguish dialect evidence from pronunciation accent. |
| `senseRevision` | Positive integer | Required; 1 | Sense | Revision of the semantic Sense state, including approved learner-facing child state | Increment when meaning or an owned approved Translation, Definition, Example selection/content, or Sense-level pronunciation transcription/semantic variant changes. Child IDs stay stable for corrections to the same conceptual child; the new Sense revision preserves the updated child state. Classification assignments have their own revisions and are pinned separately. |
| `status` | Enum | Required; 1 | Sense | Lifecycle state | `DRAFT`, `IN_REVIEW`, `APPROVED`, `RETIRED`, `MERGED`; app projection only accepts approved senses. |
| `mergedIntoSenseId` | UUIDv7 reference | Conditional; 0..1 | Sense | Canonical Sense after a reviewed duplicate merge | Only for `MERGED`; old ID remains reserved and resolves through alias/redirect metadata. |
| `createdAt`, `updatedAt` | UTC timestamp | Required; 1 each | Sense | Editorial audit times | Changed only by authoring workflow, not used as identity or sole revision signal. |

## 7. Translation, Definition, and Example

These are separate content records. A Translation gives a target-language equivalent/gloss. A Definition explains the sense in prose in a named language. A Definition is not copied into a Translation field just because both can be rendered in an app card. In serialized Sense revision files, these child records travel inside the owning Sense snapshot so the pinned `senseRevision` recovers their exact state; their child IDs still identify the same conceptual records across corrections.

### Translation

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `translationId` | UUIDv7 | Required; 1 | Translation | Stable identity for a sense-language translation | Immutable; may change text without changing its ID if it remains the same translation record. |
| `masterSenseId` | UUIDv7 reference | Required; many per Sense | Translation | Sense being translated | Must resolve. Translation is attached to the sense, not merely the spelling. |
| `language` | BCP 47 language tag | Required; 1 | Translation | Target language | Example `vi`; allows additional languages without new language-named columns. |
| `text` | String | Required for approved value; 1 | Translation | Equivalent or concise gloss in the target language | Nonblank, NFC-normalized; preserve meaningful alternatives as separate values rather than semicolon-packed text. |
| `translationKind` | Enum | Required; 1 | Translation | Nature of target-language rendering | `EQUIVALENT`, `GLOSS`, `EXPLANATORY_TRANSLATION`; labels do not turn a translation into a prose definition. |
| `isPreferred` | Boolean | Required; 1 | Translation | Preferred runtime projection translation for this language | At most one preferred translation per Sense and language. The existing app projection can choose its configured target language, initially Vietnamese. |
| `displayOrder` | Integer | Required; 1 per Sense/language | Translation | Order among alternatives | Nonnegative and unique within the scope. |
| `provenanceIds` | UUIDv7 references | Required for approved value; 1..many | Translation | Evidence/editorial sources | Each must resolve to a Provenance record; manual review is provenance too. |
| `status` | Enum | Required; 1 | Translation | Review state | Only approved translations can be projected. |

### Definition

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `definitionId` | UUIDv7 | Required; 1 | Definition | Stable identity for an explanatory definition | Immutable and distinct from `translationId`. |
| `masterSenseId` | UUIDv7 reference | Required; many per Sense | Definition | Sense defined | Must resolve; distinct senses may have independent definitions even if their Lemma spelling matches. |
| `language` | BCP 47 language tag | Required; 1 | Definition | Language in which the explanation is written | Example `en` or `vi`. |
| `text` | String | Required for approved value; 1 | Definition | Concise explanatory prose | Nonblank; must define this Sense, not the entire Lexeme. E.g. English explanation for the fruit sense of “apple”. |
| `definitionKind` | Enum | Required; 1 | Definition | Definition style | `LEARNER_FRIENDLY`, `DICTIONARY_STYLE`, `TECHNICAL`; controlled and not a synonym for translation kind. |
| `displayOrder` | Integer | Required; 1 per Sense/language | Definition | Display order for alternative definitions | Nonnegative and unique in scope. |
| `provenanceIds` | UUIDv7 references | Required for approved value; 1..many | Definition | Source and review history for the wording | Must resolve; do not copy a third-party definition without compatible rights. |
| `status` | Enum | Required; 1 | Definition | Review state | Only approved definitions can be projected. |

### Example

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `exampleId` | UUIDv7 | Required; 1 | Example | Stable identity for one example sentence/utterance | Immutable across corrections that keep the same teaching context; new teaching context receives a new ID. |
| `masterSenseId` | UUIDv7 reference | Required; many per Sense | Example | Sense demonstrated | Must resolve; the sentence must illustrate the owning Sense, not only contain the same spelling. |
| `language` | BCP 47 language tag | Required; 1 | Example | Language of the example text | Example `en`. |
| `text` | String | Required for approved value; 1 | Example | Sentence or short utterance | Nonblank, safe for learner display, and reviewed for natural usage; avoid language-targeting a different Sense. |
| `register` | Controlled code | Optional; 0..1 | Example | Style of the sentence | E.g. `NEUTRAL`; validate against the register vocabulary. |
| `levelNotes` | String/localized text | Optional; 0..1 | Example | Editorial note on syntactic or vocabulary load | Keep distinct from CEFR classification and difficulty score. |
| `displayOrder` | Integer | Required; 1 per Sense/language | Example | Order among examples | Nonnegative and unique in scope. |
| `exampleTranslations` | Example Translation records | Optional; 0..many | Example | Reviewed sentence translations | Each embedded child retains its `exampleTranslationId` and `exampleId`; it is distinct from a Sense-level lexical Translation. |
| `audioAssetIds` | UUIDv7 references | Optional; 0..many | Example | Approved spoken versions of this sentence | Must resolve to example-audio assets whose target is this `exampleId`; distinct from word pronunciation audio. |
| `provenanceIds` | UUIDv7 references | Required for approved value; 1..many | Example | Source/reviewer for the example | Include authorship/license evidence if sourced externally. |
| `status` | Enum | Required; 1 | Example | Review state | Only approved examples can be projected. |

### Example Translation

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `exampleTranslationId` | UUIDv7 | Required; 1 | Example Translation | Stable identity for one reviewed translation of a sentence | Immutable; separate from the Sense-level `translationId`. |
| `exampleId` | UUIDv7 reference | Required; many translations to one Example | Example Translation | Sentence being translated | Must resolve; translation meaning must match that example. |
| `language` | BCP 47 language tag | Required; 1 | Example Translation | Target language of the sentence translation | Example `vi`; valid canonical language tag. |
| `text` | String | Required for approved value; 1 | Example Translation | Translation of the full example sentence | Nonblank and reviewed; e.g. Vietnamese rendering of “She ate an apple.” |
| `isPreferred`, `displayOrder` | Boolean, nonnegative integer | Required; 1 each | Example Translation | Preferred display and order among translations | At most one preferred per Example/language; order unique in scope. |
| `provenanceIds` | UUIDv7 references | Required for approved value; 1..many | Example Translation | Evidence/reviewer for the sentence translation | All references resolve; rights apply to source sentence and translation. |
| `status` | Enum | Required; 1 | Example Translation | Editorial review state | Only approved translations can be projected. |

## 8. Classification and taxonomy entities

### Classification assignment

**Owner entity:** Classification assignment. Each assignment points to one Sense and exactly one independent dimension. Multiple assignments are allowed where the dimension contract says so. Assignment values are not folded into a single `level` field.

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `classificationId` | UUIDv7 | Required; 1 | Classification | Stable identity for this assignment | Immutable; not generated from its value or taxonomy location. |
| `classificationRevision` | Positive integer | Required; 1 | Classification | Revision of this assignment's value, scope, evidence, or lifecycle state | Starts at 1 and advances when the assignment changes; a classification-only change does not advance `senseRevision`. Releases pin the exact classification revision. |
| `masterSenseId` | UUIDv7 reference | Required; many per Sense | Classification | Sense classified | Must resolve. Default scope is Sense, even when lexical spelling is shared. |
| `dimension` | Enum | Required; 1 | Classification | Independent classification dimension | Current values: `CEFR`, `DIFFICULTY`, `AGE_GROUP`, `SCHOOL_LEVEL`, `TOPIC`, `DOMAIN`, `EXAM`; unknown values fail closed until a schema version adds them. |
| `frameworkCode`, `frameworkVersion` | Controlled code, version string | Required for `CEFR`; otherwise absent | Classification | CEFR framework scope for a level claim | Must resolve to a framework/version in a pinned taxonomy snapshot; different frameworks remain separate claims. |
| `valueCode` | Controlled scalar code | Conditional; 0..1 | Classification | Scalar value for code-based dimensions | Required for `CEFR` (`PRE_A1`, `A1`…`C2`) and `AGE_GROUP` (`KIDS`, `TEEN`, `ADULT`). Future controlled scalar dimensions also use `valueCode`. |
| `valueRef` | UUIDv7 taxonomy reference | Conditional; 0..1 | Classification | Value for an entity-backed dimension | Required for `TOPIC`, `DOMAIN`, `EXAM`, and `SCHOOL_LEVEL`, resolving to the matching entity in a pinned taxonomy snapshot. |
| `numericValue` | Integer | Conditional; 0..1 | Classification | Canonical difficulty score | Required only for `DIFFICULTY`, within 1–100, high means harder. |
| `scaleId` | UUIDv7 reference | Conditional; 0..1 | Classification | Difficulty rubric/calibration scope | Required with `numericValue` for `DIFFICULTY`; resolves to a pinned versioned scale and target learning cohort. |
| Value-shape exclusivity | Conditional object shape | Required; exactly one shape | Classification | Typed representation for the selected dimension | CEFR/AGE_GROUP: `valueCode` only; TOPIC/DOMAIN/EXAM/SCHOOL_LEVEL: `valueRef` only; DIFFICULTY: `numericValue` + `scaleId` only. JSON Schema enforces this with `oneOf`; unrelated value fields are forbidden. |
| `isPrimary` | Boolean | Required; 1 | Classification | Primary assignment for display/projection within a dimension/scope | At most one primary per Sense/dimension/scale scope. It does not make other approved memberships invalid. |
| `sourceProvenanceIds` | UUIDv7 references | Required for sourced/approved claim; 1..many | Classification | Evidence for the classification | CEFR and exam claims need evidence; an editor-only judgment is explicitly marked editorial. |
| `confidence` | Decimal 0..1 | Optional; 0..1 | Classification | Editorial confidence where meaningful | Use only with a documented scoring rubric; confidence is not difficulty or exam relevance. |
| `status` | Enum | Required; 1 | Classification | Assignment review state | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `RETIRED`; only approved assignments are exposed. |
| `validFrom`, `validTo` | UTC timestamps | Optional; 0..1 each | Classification | Effective period for versioned curriculum or exam mappings | `validTo` must be later than `validFrom`; use only for actual edition/date scope, not routine edits. |

### Audience Group Values

Audience is a controlled value set, not an entity inferred from the learner profile. The allowed codes are `KIDS`, `TEEN`, and `ADULT`. A Sense may have zero or more approved assignments. Do not store `ALL`; derive an “all ages” display only when all three approved values are assigned. An unclassified Sense is not equivalent to ALL. Exact age ranges remain a separate editorial/product decision; if boundaries are later defined, add a versioned age-band definition rather than silently changing the meaning of these codes.

### Difficulty Scale/Profile

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `scaleId` | UUIDv7 | Required; 1 | Difficulty Scale | Stable identity for one difficulty rubric/profile | Immutable; not derived from score range or learner demographics. |
| `scaleCode`, `scaleVersion` | String, positive integer | Required; 1 each | Difficulty Scale | Human-readable rubric and its revision | Unique code/version pair; boundary/rubric changes increment `scaleVersion`. |
| `targetContext` | Structured controlled fields | Required; 1 | Difficulty Scale | Learner/language context for interpreting scores | Identify relevant learner language and instructional context; values must be controlled and documented. Scores from different contexts are not directly comparable. |
| `scoreMinimum`, `scoreMaximum` | Integer | Required; 1 each | Difficulty Scale | Permitted score bounds | This policy uses 1 and 100; reject scores outside the referenced scale. |
| `anchors`, `labelThresholds` | Structured rubric data | Required; one versioned set | Difficulty Scale | Calibration examples and derived display-label boundaries | Anchors must define direction (higher = harder); thresholds match the approved label mapping and are nonoverlapping/complete. |
| `method`, `status`, `provenanceIds` | Enum, enum, UUIDv7 references | Required; 1, 1, 1..many | Difficulty Scale | Editorial or empirical basis, lifecycle, and rubric evidence | Empirical methods identify model/version; only approved scales receive classifications. |

### Topic

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `topicId` | UUIDv7 | Required; 1 | Topic | Stable topic identity | Immutable; not derived from name, slug, parent, or path. |
| `datasetId` | UUIDv7 reference | Required; 1 | Topic | Owning taxonomy/catalog namespace | Must resolve; a topic ID is unique globally even if two datasets have the same slug. |
| `code` | String | Required; 1 | Topic | Stable machine-readable code | Unique in dataset taxonomy; e.g. `FRUIT`. Renaming a display label does not rename the identity. |
| `slug` | String | Required; 1 | Topic | URL/display-friendly lookup key | Unique among siblings or within namespace per chosen publication rule; mutable via alias/redirect if published. Not a durable ID. |
| `parentTopicId` | UUIDv7 reference | Optional; 0..1 | Topic | Parent topic at arbitrary depth | Must resolve in same taxonomy; no self-parent or cycles. Example Fruit parent Food. |
| `labels` | Localized text map | Required; 1..many | Topic | Display labels | Each key is a valid language tag and each label is nonblank; e.g. `en: Fruit`, `vi: Trái cây`. |
| `definition` | Localized text map | Optional; 0..many | Topic | Scope note distinguishing neighboring nodes | Language-tagged; useful for curation consistency. |
| `status`, `sortOrder` | Enum, integer | Required; 1 each | Topic | Publication state and sibling order | Status follows review lifecycle; order nonnegative and applies only under the same parent. |

### Domain

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `domainId` | UUIDv7 | Required; 1 | Domain | Stable identity for a usage domain | Immutable and independent of domain code. |
| `code` | String | Required; 1 | Domain | Stable domain key | Examples `GENERAL_ENGLISH`, `ACADEMIC_ENGLISH`, `BUSINESS_ENGLISH`, `TRAVEL_ENGLISH`, `IT_TECHNOLOGY`, `HOSPITALITY`; unique in domain taxonomy. |
| `parentDomainId` | UUIDv7 reference | Optional; 0..1 | Domain | Parent for future domain hierarchy | Must resolve; cycles prohibited. |
| `labels`, `definition` | Localized text | Required label; optional definition | Domain | Display name and scope | Versioned localization; labels are not IDs. |
| `status`, `sortOrder` | Enum, integer | Required; 1 each | Domain | Review state and display order | Retired codes remain reserved; no code reuse. |

### Exam

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `examId` | UUIDv7 | Required; 1 | Exam | Stable identity for an exam family/track | Immutable; different exam editions/tracks can be separate records or versioned children according to source evidence. |
| `code` | String | Required; 1 | Exam | Stable exam key | Examples `IELTS`, `TOEIC`, `TOEFL`, `CAMBRIDGE`, `VSTEP`; a specific track/edition can use a distinct child code. |
| `authority` | String/reference | Optional; 0..1 | Exam | Exam owner or governing body | Cite a source; do not infer official status from the code. |
| `edition` | String | Optional; 0..1 | Exam | Applicable test format/edition | Keep unspecified when the mapping is not edition-specific. |
| `labels`, `description` | Localized text | Required label; optional description | Exam | Display name and scope | Evidence-bearing claims must point to Provenance. |
| `status`, `sortOrder` | Enum, integer | Required; 1 each | Exam | Lifecycle and display ordering | Retain retired records and IDs for historical references. |

### Curriculum and School Level

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `curriculumId` | UUIDv7 | Required; 1 | Curriculum | Stable identity for an education framework | Immutable; example a named national or institutional English curriculum release. |
| `jurisdictionCode` | Controlled region code | Required; 1 | Curriculum | Country/region/authority scope | Use a governed code, not free-text “international”; required because Grade 1 is not universal. |
| `authority` | String/reference | Optional; 0..1 | Curriculum | Issuing authority | Record evidence in Provenance when asserting a formal curriculum. |
| `curriculumCode`, `edition` | String | Required code; optional edition | Curriculum | Identifies curriculum and its release | Stable code plus explicit edition/year where source material is versioned. |
| `labels`, `sourceProvenanceIds` | Localized text, UUIDv7 refs | Required label; provenance conditional on approved use | Curriculum | Display name and evidence | References must resolve. |
| `schoolLevelId` | UUIDv7 | Required; 1 | School Level | Stable identity for one named level within a curriculum | Not derived from grade number alone. |
| `curriculumId` | UUIDv7 reference | Required; many levels to one Curriculum | School Level | Framework containing this level | Must resolve; examples from different curricula remain distinct. |
| `gradeNumber` | Integer | Required for Grade 1–12 model; 1 | School Level | Numeric grade ordinal | Range 1–12 when the level is a numbered grade; no value fabricated for systems using stages instead. |
| `levelCode`, `labels` | String, localized text | Required; 1 and 1..many | School Level | Stable curriculum-specific code and display name | Example `GRADE_1` under one particular curriculum; code is scoped by curriculum and is not a universal level ID. |
| `status`, `sortOrder` | Enum, integer | Required; 1 each | School Level | Lifecycle and order within curriculum | Retire rather than recycle a published level ID. |

### CEFR value

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `cefrCode` | Enum | Required; one controlled catalog value | CEFR taxonomy | `PRE_A1`, `A1`, `A2`, `B1`, `B2`, `C1`, `C2` | Validate exact code and defined order. It is not a Lexeme ID and is not the difficulty score. |
| `frameworkVersion`, `labels`, `descriptor` | String/localized text | Required version/label; optional descriptor | CEFR taxonomy | Versioned framework metadata and descriptions | If a source uses a specific descriptor release, cite it in Provenance; never claim official mapping without evidence. |

## 9. Learning Sets and membership

### Learning Set

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `learningSetId` | UUIDv7 | Required; 1 | Learning Set | Stable identity for one curated collection/course/list | Immutable; not derived from title, grade, exam, domain, or contents. |
| `code` | String | Required; 1 | Learning Set | Stable human-readable key | Unique within the Master catalog; e.g. `FIRST_100_WORDS`; renames use an alias, not a new identity. |
| `labels`, `description` | Localized text | Required label; optional description | Learning Set | Display copy and set purpose | Name can mention audience/exam, but does not itself assign the corresponding taxonomy. |
| `setKind` | Enum | Required; 1 | Learning Set | Editorial collection purpose | Examples `STARTER`, `SEQUENCE`, `TOPIC_COLLECTION`, `CURRICULUM`, `EXAM_PREPARATION`, `DOMAIN`; independent of taxonomy membership. |
| `status` | Enum | Required; 1 | Learning Set | Draft/approval/retirement state | Only approved sets are published. |
| `sortOrder` | Integer | Optional; 0..1 per catalog view | Learning Set | Ordering among sets in a view | Nonnegative; membership order lives on Learning Set Item. |
| `learningSetRevision` | Positive integer | Required; 1 | Learning Set | Revision of set definition/membership | Increment on reviewed set meaning/order/membership changes; it does not change Sense identity or learner progress. |
| `createdAt`, `updatedAt` | UTC timestamp | Required; 1 each | Learning Set | Editorial audit times | Not IDs or revision substitutes. |

### Learning Set Item

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `learningSetItemId` | UUIDv7 | Required; 1 | Learning Set Item | Stable identity for this membership row | Immutable across reordering. If membership is removed then later restored, policy may reuse the old item ID only if the same membership is restored; never assign it to another pair. |
| `learningSetId` | UUIDv7 reference | Required; many items to one set | Learning Set Item | Owning collection | Must resolve. |
| `masterSenseId` | UUIDv7 reference | Required; many sets to one Sense | Learning Set Item | Sense included in the set | Must resolve and be approved for a published set. Repeated Lexeme/Sense rows are not created. |
| `position` | Positive integer | Required; 1 per item | Learning Set Item | Order of the item in its set | Unique within a set; change does not alter identity or Sense revision. |
| `status` | Enum | Required; 1 | Learning Set Item | Membership review state | An approved set cannot include a retired/rejected Sense. |
| `addedByProvenanceId` | UUIDv7 reference | Optional; 0..1 | Learning Set Item | Selection rationale/source | Useful for curriculum/exam sets; exam membership in a set does not itself certify official relevance. |

Learning Set membership is independent from Topic, CEFR, difficulty, audience, school grade, domain, and exam. A Sense can appear in First 100 Words, Grade 1 Starter, Basic Fruits, and IELTS Foundation without duplication.

## 10. Relations

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `relationId`, `relationRevision` | UUIDv7, positive integer | Required; 1 pair | Relation | Stable identity and exact revision of one reviewed lexical relationship | ID is immutable; revision starts at 1 and advances when endpoints, relation meaning, evidence, or lifecycle state changes. Dataset releases pin the exact revision. |
| `fromEntityType`, `fromId` | Enum, UUIDv7 reference | Required; 1 pair | Relation | Source endpoint | Type is `LEXEME` or `SENSE`; ID must resolve to that type. |
| `toEntityType`, `toId` | Enum, UUIDv7 reference | Required; 1 pair | Relation | Target endpoint | Type/ID must resolve; self-relations prohibited. |
| `relationType` | Controlled enum | Required; 1 | Relation | Meaning of the edge | Initial values may include `SYNONYM`, `ANTONYM`, `RELATED`, `DERIVATIVE`, `VARIANT_OF`; define allowed endpoint types and symmetry for each. |
| `directionality` | Enum | Required; 1 | Relation | Whether inverse edge is equivalent or distinct | `SYMMETRIC` for reviewed synonym/antonym pair; `DIRECTED` for derivation/variant; avoid duplicating symmetric edges in both directions. |
| `provenanceIds` | UUIDv7 references | Required for approved relation; 1..many | Relation | Evidence/review source | Must resolve; relatedness should not be inferred solely from spelling similarity. |
| `status` | Enum | Required; 1 | Relation | Editorial lifecycle | Only approved relations are projected. |

Cycles are validated according to relation semantics. Synonym/related graphs may legitimately contain cycles; tree or hierarchy relations may not.

## 11. Media Asset, versions, and delivery locations

An asset ID identifies an editorial media slot/brief for a target. A `mediaAssetVersion` identifies an immutable approved revision of that slot. A hash identifies exact bytes. A provider delivery ID, public ID, or URL identifies where a delivery copy is stored. These identities are separate. The serialized Media Asset document contains its versions and deliveries; a release pins the immutable asset-record path/hash, exact selected version, and selected bytes hash rather than resolving `currentMediaAssetVersion` at read time.

### Media Asset

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `mediaAssetId` | UUIDv7 | Required; 1 | Media Asset | Stable editorial identity for the media slot | Not a hash, filename, Cloudinary public ID, or URL. Example: the selected illustration slot for one Sense. |
| `targetEntityType`, `targetId` | Enum, UUIDv7 reference | Required; 1 pair | Media Asset | Lexeme, Sense, or Example the media supports | Validate target type and referenced identity. Sense media should illustrate the exact sense. Example audio must target Example. |
| `mediaKind` | Enum | Required; 1 | Media Asset | `IMAGE`, `WORD_PRONUNCIATION_AUDIO`, or `EXAMPLE_AUDIO` | Type must agree with target and media-specific fields. |
| `semanticBrief` | Localized text | Required; 1..many | Media Asset | Editorial intent for the asset | Nonblank; e.g. “single red apple fruit, not an electronics company logo.” |
| `styleId` | Stable code/reference | Conditional for image | Media Asset | Reusable visual style | Required for generated images; style change may create a new asset identity if the editorial brief changes materially. |
| `status` | Enum | Required; 1 | Media Asset | Slot lifecycle | `PLANNED`, `IN_PROGRESS`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `RETIRED`, `NOT_APPLICABLE`; only approved active versions are selected for app projection. |
| `currentMediaAssetVersion` | Positive integer | Required once a version exists | Media Asset | Currently selected approved version number | Must resolve to an approved version for this asset; no current version for `PLANNED`/`NOT_APPLICABLE`. |
| `createdAt`, `updatedAt` | UTC timestamp | Required; 1 each | Media Asset | Editorial audit times | Not byte identity; version rows capture change history. |

### Media Asset Version

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `mediaAssetId`, `mediaAssetVersion` | UUIDv7 reference, positive integer | Required; composite identity | Media Asset Version | Immutable revision of the editorial asset slot | Unique `(mediaAssetId, mediaAssetVersion)`; first approved render may be version 1. Replacements append a version. |
| `sha256` | 64-char lowercase hex | Required when bytes exist; 0..1 for planned/rejected | Media Asset Version | Exact byte/content identity | Recompute from uploaded source bytes; two asset IDs may share a hash, and that does not make them the same editorial asset. |
| `mimeType`, `byteLength` | MIME string, nonnegative integer | Required when bytes exist | Media Asset Version | Technical file facts | Validate allowed MIME for kind and actual file decoding; example `image/webp`. |
| `sourceType`, `sourceLocator` | Controlled enum, URI/string | Required; 1 each for a produced version | Media Asset Version | Generated, licensed, public-domain, owner-supplied, or other origin and source | Source URI must be valid and safe; provenance/license record is mandatory before approval where applicable. |
| `licenseId`, `attribution` | Controlled/reference, localized text | Conditional | Media Asset Version | Rights and required credit | Approval is blocked when required rights are unknown; generated media still records generation terms/tool provenance. |
| `prompt`, `generationProvider`, `model`, `generationSettings` | Text, controlled/provider string, string, structured object | Conditional for generated media | Media Asset Version | Reproducible image/TTS generation inputs | Prompt is required for generated images; settings include style/model/voice/rate. Do not store secrets. |
| `audioText`, `locale`, `accentCode`, `voiceId` | String, BCP 47, code, provider voice key | Conditional for audio | Media Asset Version | Exact spoken text and voice configuration | Word audio text must match the reviewed pronunciation target; example audio targets one Example. Locale/accent must match the selected Pronunciation where applicable. |
| `qaStatus`, `qaNotes`, `reviewedBy`, `reviewedAt` | Enum, text, reviewer reference, UTC timestamp | Required before approval | Media Asset Version | Technical and semantic QA evidence | `APPROVED` requires successful technical checks and appropriate human review; rejected versions remain auditable. |
| `supersedesMediaAssetVersion` | Positive integer | Optional; 0..1 | Media Asset Version | Prior version replaced by this one | Must be lower version of the same `mediaAssetId`; never overwrite prior approved bytes/metadata. |
| `status` | Enum | Required; 1 | Media Asset Version | Draft/review/approved/superseded state | Approved selection is explicit; old versions may remain approved historically but only `currentMediaAssetVersion` is projected. |

### Media Delivery Location

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `deliveryId` | UUIDv7 | Required; 1 | Media Delivery Location | Identity for a provider placement | Not the asset ID or content hash. |
| `mediaAssetId`, `mediaAssetVersion` | Reference pair | Required; many locations to one asset version | Media Delivery Location | Source media version delivered | Must resolve to the immutable version. |
| `provider` | Controlled string | Required; 1 | Media Delivery Location | Storage/CDN provider | Example `cloudinary`; provider can change without changing asset identity. |
| `providerPublicId` | String | Required; 1 | Media Delivery Location | Provider-native lookup key | Unique in provider/account scope; never used as the Master ID. |
| `url` | URI | Required for ready delivery | Media Delivery Location | Runtime fetch URL | HTTPS, allowed host/provider, no credentials; can be replaced while hash and asset version remain the same. |
| `deliveryStatus` | Enum | Required; 1 | Media Delivery Location | Upload/availability state | `PENDING`, `READY`, `FAILED`, `RETIRED`; only `READY` URL may project. |

## 12. Provenance and review metadata

### Provenance

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `provenanceId` | UUIDv7 | Required; 1 | Provenance | Stable identity for a source/authoring claim | Immutable; separate from the content record it supports. |
| `subjectType`, `subjectId` | Enum, UUIDv7 reference | Required; 1 pair | Provenance | Lexeme, Sense, linguistic child, classification, relation, or media version supported | Must resolve to an allowed subject type. Field-level provenance may use a controlled `fieldPath`. |
| `sourceType` | Enum | Required; 1 | Provenance | `PROJECT_AUTHORED`, `LICENSED_SOURCE`, `PUBLIC_DOMAIN_SOURCE`, `GENERATED`, `OWNER_REVIEW`, or equivalent controlled origin | Do not infer rights from source type alone. |
| `sourceName`, `sourceUrl` | String, URI | Required for external source; otherwise optional | Provenance | Source identity/location | Validate HTTPS/approved schemes and allowlisted access rules; URL is evidence, not identity. |
| `licenseName`, `licenseUrl`, `attributionText` | String, URI, localized text | Required when rights require them | Provenance | Usage conditions and credit | Preserve exact license/version/attribution; unknown rights cannot be represented as approved. |
| `retrievedAt`, `authoredBy`, `reviewedBy` | UTC timestamp, actor/reference, actor/reference | Conditional | Provenance | Collection/authorship/reviewer trail | Avoid embedding credentials or unnecessary personal data. |
| `method`, `notes`, `confidence` | Controlled/text/decimal | Optional | Provenance | How the claim was produced and its confidence | Confidence range 0..1 and only with defined meaning; generated content records tool/model/version without secrets. |

### Review Metadata

| Field | Type | Req. / cardinality | Owner | Meaning | Validation, example, compatibility |
|---|---|---|---|---|---|
| `reviewId` | UUIDv7 | Required; 1 | Review Event | Stable identity for an editorial review decision | Immutable; separate from learner review events. |
| `subjectType`, `subjectId` | Enum, UUIDv7 reference | Required; 1 pair | Review Event | Entity under review | Must resolve to a Master entity/version. |
| `reviewStatus` | Enum | Required; current state 1 | Review Event / subject | `DRAFT`, `IN_REVIEW`, `APPROVED`, `REJECTED`, `RETIRED`, `MERGED` | Published projection requires approval at all required subject levels. Keep history as append-only review events. |
| `decision` | Enum | Required; 1 per event | Review Event | `APPROVE`, `REQUEST_CHANGES`, `REJECT`, `RETIRE`, `MERGE` | Must agree with resulting subject status. |
| `reviewerId`, `reviewedAt` | Actor/reference, UTC timestamp | Required for decision event | Review Event | Who decided and when | Actor references a governed internal reviewer identity; never use display name as ID. |
| `checklistVersion`, `notes` | String, text | Required checklist version; notes optional | Review Event | QA standard and rationale | Checklist version must resolve; notes should explain exceptions and evidence, not replace provenance. |

## 13. Example: apple fruit Sense

One Lexeme represents English `apple`; its fruit meaning is one Sense. The fruit Sense owns a Vietnamese Translation, English Definition, English Example and associated Example Translation. It may receive a CEFR assignment, a numeric difficulty assignment, an audience assignment, one curriculum School Level assignment, Topic memberships Food and Fruit, a GENERAL_ENGLISH Domain assignment, and any curated Learning Set Items. A reviewed image and pronunciation asset can target the Sense/Pronunciation independently. Another `apple` Sense (for example a technology company usage if VocabFlow chooses to teach it) would have a distinct Sense ID and its own classifications/examples; it would not overwrite the fruit content.

## 14. Runtime boundary

The app currently accepts one vocabulary row with fields such as `word`, `ipa`, `vietnamese`, `definitionEn`, `exampleEn`, one image/audio URL, legacy topic text, grade-oriented `level`, `enabled`, and integer `contentVersion`. The Master can store richer data without sending every field to Neon. A projection must explicitly select one approved Sense translation/definition/example and one approved compatible media delivery location for each supported runtime field. Master IDs map to stable app IDs through an explicit registry; neither lemma nor an array index is sufficient. The Master classification model has no runtime `level` field: school level is one typed taxonomy dimension, separate from CEFR, difficulty, and audience.

This Phase 1 contract is serialized by the schema-only package under `vocabflow-dataset/`. It does not change app code or database schema. JSON Schema validates each document's shape; release closure, pin resolution, graph rules, and uniqueness across files remain cross-file validator responsibilities.
