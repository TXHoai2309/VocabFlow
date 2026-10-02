# VocabFlow Master Vocabulary V2 — Validation Contract

**Status:** Phase 2A implementation contract, based on the accepted Phase 1
architecture. This document describes the runnable validator at
`scripts/validate-master-vocabulary-v2.ts`; it does not change runtime or
database contracts.

## Entry point and report

Run `pnpm validate:master-vocab-v2` from the repository root. The command
validates `vocabflow-dataset/dataset.json`, follows its exact pins, and writes
`vocabflow-dataset/reports/validation-report.json`. Pass
`--dataset-root <path>` to validate another dataset package against the same
checked-in schemas.

The machine report contains `schemaVersion`, `datasetVersion`, `validatedAt`,
`status`, severity counts, and a sorted `issues` array. Each issue contains a
stable `code`, `severity`, `stage`, and message; `entityType`, `entityId`,
`recordPath`, and JSON Pointer `path` are included when known. The report is
git-ignored because `validatedAt` is run-specific. Issue order is deterministic.

## Stages and release boundary

1. **Schema:** Ajv Draft 2020-12 validates the manifest and each pinned record.
   Local schemas are registered by `$id` before references compile. URI and
   date-time formats are assertions. `language-tag` currently asserts the
   schema's basic syntax pattern; IANA registry membership and canonical BCP 47
   casing stay deferred until their registry/policy is approved.
2. **Pins:** only manifest arrays are traversed. Every pinned path must remain
   inside the dataset package, resolve to a readable JSON object, match the
   pinned ID/revision, and match its RFC 8785 JCS SHA-256. The media byte hash
   pin is compared with the selected version's declared `sha256`. The release
   hash is SHA-256 over the JCS manifest with only `releaseHash` omitted.
3. **Cross-file semantics:** the validator builds typed registries, then checks
   reference integrity, ownership, uniqueness/cardinality, approved state,
   taxonomy graph scope, media compatibility, Relations, and Provenance.

The validator never scans a records directory, chooses a latest revision, or
falls back when an artifact is missing. A manifest that fails schema validation
is not dereferenced. An unpinned file is outside that release. `DRAFT` and
`IN_REVIEW` validate every declared pin and reference without requiring
publication status or a release hash. `APPROVED` also requires the release
hash, approved pinned records/taxonomy/media, eligible approved set membership,
and active taxonomy scopes where the contract calls for them.

## Semantic guarantees

- Typed registries cover Dataset, Taxonomy snapshot, Lexeme, Sense,
  Pronunciation, Translation, Definition, Example, Example Translation,
  Classification, Topic, Domain, Exam, Curriculum, School Level, Difficulty
  Scale, Learning Set, Learning Set Item, Relation, Media Asset, Media Asset
  Version, Media Delivery, and Provenance. The same UUID in different types is
  not treated as the same identity.
- Sense, linguistic-child, pronunciation, classification, set, relation,
  media, and Provenance references must resolve to the expected type. Embedded
  children must name their actual containing owner. A Sense-owned
  Pronunciation resolves its Lexeme through that Sense.
- Approved preferred Translation and Example Translation cardinality is one
  per owner/language; approved preferred Pronunciation is one per owner/locale.
  Learning Set code, membership pair, and position are unique. Classification
  assignments and primary scopes are unique. Topic/Domain codes and
  Curriculum-scoped School Level codes are unique.
- Topic and Domain parent links resolve within one pinned taxonomy snapshot,
  cannot self-parent, and cannot cycle. School Levels resolve to Curricula in
  their own snapshot. CEFR framework/version, typed taxonomy values, and
  Difficulty scales resolve; approved classifications cannot point to retired
  taxonomy entries where the contract prohibits it.
- Approved Learning Sets contain only approved Senses and approved membership
  items. Media current and pinned versions resolve, owners and delivery
  versions match, target entity types match media kinds, and ready delivery
  URLs are credential-free HTTPS. Pronunciation/example audio references must
  match their owner target and media kind.
- Relation endpoints resolve to Lexeme/Sense types. Self-edges fail. Synonym
  and Antonym are symmetric; Derivative and Variant Of are directed. Reversed
  copies of a symmetric edge are duplicate edges. Other relation cycles are
  allowed.
- Approved Translation, Definition, Example, and Example Translation
  Provenance presence is enforced by JSON Schema. The cross-file stage checks
  all provided Provenance IDs, including CEFR descriptor, Curriculum, and
  Difficulty Scale evidence. It additionally requires Provenance for approved
  CEFR, Exam, and School Level assignments and approved Relations, as specified
  by the existing contract.
- Same-language `normalizedLemma` collisions emit a warning only; no automatic
  merge or repair occurs.

## Stable issue-code catalog

`ERROR` codes make the report `FAIL`. `WARNING` and `INFO` do not fail an
otherwise valid report.

| Code | Severity | Meaning |
|---|---|---|
| `SCHEMA_REGISTRY_LOAD_FAILED` | ERROR | A checked-in schema could not be loaded or compiled. |
| `SCHEMA_VALIDATOR_MISSING` | ERROR | The schema or target definition was not registered. |
| `SCHEMA_VALIDATION_FAILED` | ERROR | A document violates its Draft 2020-12 schema. |
| `DATASET_ROOT_MISSING` | ERROR | Dataset package root does not exist. |
| `DATASET_MANIFEST_UNREADABLE` | ERROR | `dataset.json` is absent, invalid JSON, or not an object. |
| `PIN_PATH_INVALID` | ERROR | A pin fails the filesystem containment check, including a symlink escape. |
| `PIN_ARTIFACT_MISSING` | ERROR | A pinned artifact does not exist. |
| `PIN_ARTIFACT_UNREADABLE` | ERROR | A pinned artifact is invalid JSON or not an object. |
| `PIN_CONFLICT` | ERROR | The same entity revision points to conflicting paths or hashes. |
| `PIN_ID_MISMATCH` | ERROR | Artifact ID does not match its manifest pin. |
| `PIN_REVISION_MISMATCH` | ERROR | Artifact revision/version does not match its exact pin. |
| `CONTENT_HASH_MISMATCH` | ERROR | Artifact JCS SHA-256 differs from `contentHash`. |
| `CANONICAL_HASH_FAILED` | ERROR | The artifact or release cannot be represented by the selected canonical hash implementation. |
| `PIN_MEDIA_VERSION_MISSING` | ERROR | Pinned media version is absent from its asset record. |
| `PIN_MEDIA_HASH_MISMATCH` | ERROR | Media pin byte SHA-256 differs from its pinned version's declared SHA-256. |
| `RELEASE_HASH_MISMATCH` | ERROR | Manifest JCS hash does not match `releaseHash`. |
| `DUPLICATE_ENTITY_ID` | ERROR | One typed durable ID is registered more than once in the release graph. |
| `REFERENCE_DANGLING` | ERROR | A reference does not resolve to a pinned entity. |
| `REFERENCE_TYPE_MISMATCH` | ERROR | A reference resolves to an entity of the wrong type. |
| `LINGUISTIC_CHILD_OWNER_MISMATCH` | ERROR | An embedded child does not name its containing Sense, Example, or Lexeme. |
| `APPROVED_PROVENANCE_MISSING` | ERROR | Approved CEFR, Exam, School Level, or Relation content lacks required Provenance. |
| `PROVENANCE_SUBJECT_UNRESOLVED` | ERROR | A modeled Provenance subject does not resolve to the declared in-graph subject type. |
| `APPROVED_RELEASE_CONTENT_NOT_APPROVED` | ERROR | An approved release pins a learner-facing record that is not approved. |
| `APPROVED_RELEASE_TAXONOMY_NOT_APPROVED` | ERROR | An approved release pins a taxonomy snapshot that is not approved. |
| `APPROVED_RELEASE_MEDIA_NOT_APPROVED` | ERROR | An approved release pins a media slot or version that is not approved. |
| `TAXONOMY_VERSION_CONFLICT` | ERROR | A release pins multiple versions of the same taxonomy ID. |
| `TAXONOMY_FRAMEWORK_DUPLICATE` | ERROR | CEFR framework code/version scope repeats in one taxonomy snapshot. |
| `TAXONOMY_CODE_DUPLICATE` | ERROR | Topic or Domain code is duplicated in a taxonomy namespace. |
| `TAXONOMY_SCOPE_MISMATCH` | ERROR | School Level references a Curriculum outside its taxonomy snapshot. |
| `SCHOOL_LEVEL_CODE_DUPLICATE` | ERROR | School Level code repeats within a Curriculum. |
| `TOPIC_PARENT_MISSING` | ERROR | Topic parent is not in the same pinned taxonomy snapshot. |
| `TOPIC_SELF_PARENT` | ERROR | Topic names itself as its parent. |
| `TOPIC_CYCLE` | ERROR | Topic parent links contain a cycle. |
| `DOMAIN_PARENT_MISSING` | ERROR | Domain parent is not in the same pinned taxonomy snapshot. |
| `DOMAIN_SELF_PARENT` | ERROR | Domain names itself as its parent. |
| `DOMAIN_CYCLE` | ERROR | Domain parent links contain a cycle. |
| `CLASSIFICATION_FRAMEWORK_MISSING` | ERROR | CEFR framework/version does not exist in a pinned taxonomy. |
| `CLASSIFICATION_SCOPE_INACTIVE` | ERROR | Approved Classification uses an inactive framework or Difficulty scale. |
| `CLASSIFICATION_DUPLICATE_ASSIGNMENT` | ERROR | Same Sense, dimension, and value scope repeats. |
| `CLASSIFICATION_PRIMARY_DUPLICATE` | ERROR | More than one Classification is primary in one Sense scope. |
| `CLASSIFICATION_INVALID_DATE_RANGE` | ERROR | `validTo` is not later than `validFrom`. |
| `DIFFICULTY_MODEL_VERSION_MISSING` | ERROR | An empirical Difficulty Scale lacks its model version. |
| `AGE_GROUP_ALL_NOT_STORED` | ERROR | The derived `ALL` value was stored as an assignment. |
| `RETIRED_TAXONOMY_REFERENCE` | ERROR | Approved release newly references a retired taxonomy entity. |
| `LEARNING_SET_CODE_DUPLICATE` | ERROR | Learning Set catalog code repeats. |
| `LEARNING_SET_ITEM_OWNER_MISMATCH` | ERROR | Item `learningSetId` differs from its containing set. |
| `LEARNING_SET_DUPLICATE_MEMBERSHIP` | ERROR | The same Sense occurs more than once in a Learning Set. |
| `LEARNING_SET_DUPLICATE_POSITION` | ERROR | Two items in one Learning Set have the same position. |
| `LEARNING_SET_SENSE_NOT_ELIGIBLE` | ERROR | Approved set contains a non-approved Sense or membership. |
| `PREFERRED_TRANSLATION_DUPLICATE` | ERROR | More than one approved preferred Translation exists for a Sense/language. |
| `PREFERRED_EXAMPLE_TRANSLATION_DUPLICATE` | ERROR | More than one approved preferred Example Translation exists for an Example/language. |
| `PREFERRED_PRONUNCIATION_DUPLICATE` | ERROR | More than one approved preferred Pronunciation exists for an owner/locale. |
| `MEDIA_VERSION_OWNER_MISMATCH` | ERROR | A Media Asset Version names a different parent asset. |
| `MEDIA_VERSION_DUPLICATE` | ERROR | Media version number repeats within its asset. |
| `MEDIA_CURRENT_VERSION_MISSING` | ERROR | Current Media Asset Version does not resolve. |
| `MEDIA_CURRENT_VERSION_NOT_APPROVED` | ERROR | Approved asset selects a non-approved current version. |
| `MEDIA_TARGET_KIND_MISMATCH` | ERROR | Media kind is incompatible with the target entity type. |
| `MEDIA_DELIVERY_VERSION_UNRESOLVED` | ERROR | Delivery does not resolve to a version of its containing asset. |
| `MEDIA_READY_DELIVERY_URL_INVALID` | ERROR | Ready delivery URL is not credential-free HTTPS with a host. |
| `PRONUNCIATION_AUDIO_MISMATCH` | ERROR | Pronunciation audio target, kind, locale, or accent is incompatible. |
| `EXAMPLE_AUDIO_MISMATCH` | ERROR | Example audio does not target its exact Example with the correct media kind. |
| `RELATION_SELF_REFERENCE` | ERROR | Relation endpoints form a prohibited self-edge. |
| `RELATION_DIRECTIONALITY_MISMATCH` | ERROR | Relation directionality conflicts with the accepted type semantics. |
| `RELATION_SYMMETRIC_DUPLICATE` | ERROR | A canonical symmetric Relation edge is already present. |
| `LEXEME_NORMALIZED_COLLISION` | WARNING | Two Lexemes share language and normalizedLemma; editorial review candidate only. |
| `DRAFT_WORKING_DATASET` | INFO | Draft pins and references are checked without publication status or release-hash requirements. |
| `REPORT_WRITE_FAILED` | ERROR | Validation report could not be written. |

## Explicitly deferred

- IANA registry snapshot and canonical BCP 47 casing.
- Revision monotonicity/history, append-only artifact retention, and state
  transition verification, which require historical records or an authoring
  workflow.
- Human review of translation nuance, definitions, example naturalness,
  classification plausibility, or media editorial quality.
- Provider/MIME allowlists, byte decoding, local byte hashing, and external
  license verification. No network media is fetched.
- Exact Provenance linkage to one Media Asset Version for licensed media: the
  current schema does not encode a version-qualified Provenance reference.
- Runtime projections, importers, database storage, and migrations.
