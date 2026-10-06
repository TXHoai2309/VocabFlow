# VocabFlow Master Vocabulary V2 — Identity and Versioning Policy

**Status:** Accepted Phase 1 architecture baseline. Applies to Master data and the future app projection contract. It does not change current PostgreSQL schema, integer vocabulary IDs, or runtime behavior.

## 1. Decisions

1. Use **UUIDv7** for durable Master entity IDs. Store canonical lowercase UUID text in serialized artifacts and native UUID values in any future database representation.
2. Generate IDs once when a new entity is created. Persist and carry them through editing, release, transform, import, and media delivery. Never derive or regenerate IDs from content.
3. Lexeme identity and Sense identity are separate. A Sense is the long-lived learner-content identity; the Lexeme is the language-specific lexical form that owns one or more Senses.
4. Keep Dataset content release, serialized schema, Lexeme editorial revision, Sense editorial revision, Media Asset Version, and runtime content version independent.
5. Use a deterministic fingerprint of the exact learner-facing vocabulary projection as the automatic trigger for runtime content-version changes. The write path must compute/compare the fingerprint; callers cannot decide to “remember to bump” it.
6. Media replacement does not by itself revise semantic Sense content. It does change runtime content version when a different selected media asset/version/hash changes the learner-facing app projection.

## 2. UUIDv7 choice and generation

UUIDv7 is selected over ULID and semantic IDs because it is a standard 128-bit UUID with a time-ordered timestamp prefix, good random uniqueness space, and direct compatibility with PostgreSQL UUID fields. RFC 9562 defines the UUIDv7 timestamp/random layout and recommends using UUIDv7 instead of UUIDv1/v6 when possible: [RFC 9562, section 5.7](https://www.rfc-editor.org/rfc/rfc9562.html#section-5.7).

Generation requirements:

- Use a maintained UUIDv7 implementation that conforms to RFC 9562. Do not hand-build bits or use UUIDv4 while labeling it UUIDv7.
- Generate from a reliable UTC clock and cryptographically suitable randomness as required by the chosen library/runtime. A monotonic-within-process option may be used if correctly implemented; the stored ID remains opaque.
- Validate UUID version 7, the RFC variant, canonical 36-character textual representation, and uniqueness at every import/release boundary.
- Generate IDs at entity creation in the Master authoring workflow, not in a transform, SQL insert, or runtime request. Serialize the assigned ID with the record and preserve it across all environments.
- Timestamp ordering is a convenience, not a promise of strict total ordering across clocks, processes, or writers. Do not use ID sort order as curriculum/set order.
- UUIDv7 embeds approximate creation time. Do not use these IDs as secret tokens, access credentials, or proof of authorization.

UUIDv7 is preferable here to ULID because UUID tooling and the app's database both understand UUIDs natively; ULID's compact/base32 form does not improve semantic identity and requires a separate database/text convention. Neither scheme makes an ID meaningful or permits ID reuse.

## 3. Identity registry

| Identity | Stable ID field | Identity boundary and rule |
|---|---|---|
| Lexeme | `masterLexemeId` | One lexical unit in one language. Not derived from lemma, language text, POS, or source row. |
| Sense | `masterSenseId` | One durable teachable meaning/use of one Lexeme. Never shared by two semantically distinct senses. |
| Example | `exampleId` | One reviewed teaching sentence/context for one Sense. Correct the same example under its ID; create a new ID for a genuinely new teaching context. |
| Translation | `translationId` | One target-language lexical translation/gloss for one Sense. |
| Definition | `definitionId` | One explanatory definition for one Sense and language. |
| Example Translation | `exampleTranslationId` | One language translation of one Example. Separate from a lexical Translation. |
| Pronunciation | `pronunciationId` | One pronunciation variant for a Lexeme or Sense override and locale/accent. |
| Classification | `classificationId` | One typed assignment of one independent dimension to one Sense; its mutable assignment state is tracked by `classificationRevision`. |
| Learning Set | `learningSetId` | One editorial collection/course identity. Not derived from its title, topic, grade, exam, or contents. |
| Learning Set Item | `learningSetItemId` | One membership identity linking a set to a Sense. Its order may change without changing membership identity. |
| Topic | `topicId` | One taxonomy concept. Not derived from label, slug, or parent/path. |
| Domain | `domainId` | One usage-domain concept. Domain code is a lookup key, not identity. |
| Exam | `examId` | One exam family/track identity. A distinct edition/track may have its own entity while preserving the family relation. |
| Curriculum | `curriculumId` | One named education framework/jurisdiction/edition. |
| School Level | `schoolLevelId` | One level within one Curriculum. Grade number alone is not identity. |
| Difficulty Scale | `scaleId` | One versioned difficulty rubric and learner-context profile. Its revision is a separate `scaleVersion`. |
| Taxonomy Snapshot | `taxonomyId` | One governed taxonomy catalog lineage; each immutable snapshot in the lineage has its own `taxonomyVersion`. |
| Relation | `relationId` | One reviewed relationship edge and its provenance/lifecycle; exact mutable state is tracked by `relationRevision`. |
| Media Asset | `mediaAssetId` | One semantic/editorial asset slot or brief for one target. Not a hash, file path, provider public ID, or URL. |
| Media Delivery | `deliveryId` | One provider placement for an immutable media version. A provider migration creates/retires delivery rows without changing the asset identity. |
| Provenance | `provenanceId` | One evidence/source/authorship claim. |
| Review Event | `reviewId` | One append-only editorial review decision. It is not a learner review ID. |
| Dataset | `datasetId` | One stable catalog lineage. A release version identifies a snapshot within the lineage. |

All these IDs are immutable after authoring. External dataset IDs, current app integer IDs, codes, names, slugs, source URLs, checksums, positions, and revision numbers are attributes or mappings, not Master identity.

## 4. Duplicate detection, aliases, merge, split, and retirement

### Duplicate detection

Normalize text using a versioned, language-aware normalization policy to find *candidates*. A normalized lemma collision is a review signal, not an automatic duplicate: two records may be homographs, separate lexical units, spelling variants, or distinct senses. Compare language, lexical-unit type, pronunciation/POS evidence, sense definitions/translations, provenance, and editorial history before deciding.

Do not use a compound key such as `(language, normalizedLemma, POS, topic)` as the durable ID. That key can change, can collide on homographs, and cannot preserve references through correction or reclassification.

### Alias

Keep a Lexeme ID when only its preferred spelling, capitalization, display form, or accepted variant changes and the lexical identity remains the same. Record former spellings/alternate forms as aliases with language, status, and optional provenance. A slug/name alias may redirect to a renamed taxonomy/collection record. An alias is a lookup route, not a second identity and not a duplicate Sense.

### Merge

Merge only after review establishes that records represent the same identity/meaning. Choose a surviving ID explicitly, preferably the identity already published and referenced; write a redirect/`mergedInto` mapping from the retired ID to the survivor; preserve provenance and revision history; and update future references through a controlled remap. Never delete the losing identity or recycle it for new content.

If two branches contain the same UUID with conflicting content, treat that as an ID collision/release-blocking conflict. Do not silently pick a row. If the conflicting record has never been published or referenced outside its draft branch, an audited editorial correction may re-key one draft before release. Once an ID is published or referenced, its meaning cannot be re-keyed; resolve the conflict with explicit retirement/redirect and preserve the published identity history.

### Split

When one Lexeme is discovered to contain two independent lexical identities, keep the Lexeme ID for the identity that remains the original record and create a new Lexeme ID for the separated identity. Preserve existing Sense IDs if each Sense's meaning remains the same and only its owning Lexeme relationship is corrected; record that reparenting in history. When one Sense is separated into two meanings, retain the old Sense ID for the meaning whose identity remains continuous and create a new Sense ID for the new meaning. If no defensible continuity exists, retire the old Sense and create the corrected identities with an explicit replacement map; do not make learner history silently refer to a different meaning.

### Retirement

Retired IDs remain reserved and resolvable for old releases, import mappings, media, and learner-history references. Do not hard-delete published identities as part of normal curation. Retirement removes an entity from new approved releases; it does not erase historical projections or free an ID for reuse.

## 5. Version dimensions

| Version | Scope | Changes when | Does not change merely because |
|---|---|---|---|
| `datasetVersion` | Approved content snapshot/release | The curated release changes under the release policy below | A file is reserialized or a provider URL changes. |
| `schemaVersion` | Serialized Master data contract | Field shape, type, cardinality, enum, or requiredness changes | A word, translation, topic membership, or image changes under the same shape. |
| `lexemeRevision` | One Lexeme's authored lexical identity/form fields | Approved Lexeme-owned fields or alias state change | A child Sense or media asset changes. |
| `senseRevision` | One Sense's semantic teaching content | Sense meaning, preferred Translation/Definition/Example, or other approved sense-owned content changes | A media replacement or reviewer-note/provenance-only correction changes. |
| `classificationRevision` | One typed classification assignment | Its dimension value, scope, evidence, or lifecycle state changes | An unrelated Sense semantic edit changes. |
| `relationRevision` | One reviewed relationship edge | Its endpoints, relation meaning, evidence, or lifecycle state changes | An unrelated Lexeme or Sense edit changes. |
| `learningSetRevision` | One set definition and ordered membership | The set meaning, metadata, membership, or item order changes | A referenced Sense changes. |
| `taxonomyVersion` | One immutable taxonomy snapshot | A lifecycle/governance-only taxonomy transition, metadata correction, or semantic taxonomy change is serialized in a new snapshot under the taxonomy version policy below | A Sense or set changes. |
| `mediaAssetVersion` | One editorial media slot | A replacement deliverable or learner-visible media rendition is approved for the same slot | Provider delivery moves to another URL with the same asset version/bytes. |
| `runtimeContentVersion` | One app vocabulary projection row | The learner-facing projection fingerprint differs from the last applied fingerprint | Nonprojected source/provenance/reviewer metadata changes. |

### Taxonomy snapshot lifecycle/version rule

A taxonomy snapshot identified by `(taxonomyId, taxonomyVersion)` is immutable
once serialized or pinned. A lifecycle change that changes the serialized
snapshot, including `DRAFT` → `APPROVED`, must never overwrite the existing
snapshot. Create a new snapshot version in the same `taxonomyId` lineage. There
is no `taxonomyRevision` field; taxonomy approval is represented by a new
`taxonomyVersion`, not by an entity revision.

Taxonomy version bumps use this policy:

- **PATCH**: lifecycle/governance-only transitions or metadata-only corrections
  that preserve semantic taxonomy meaning, identifiers, values, and hierarchy.
- **MINOR**: backward-compatible additive semantic changes, such as adding a
  Topic, Domain, Framework, taxonomy value, or additive hierarchy/content.
- **MAJOR**: breaking semantic changes, such as an incompatible interpretation,
  breaking code/identity or hierarchy semantics, or a release-line reset that
  requires migration.

The stable `taxonomyId` remains unchanged across the version lineage. An
approval-only PATCH must compare the complete serialized taxonomy payload after
excluding exactly these **top-level snapshot metadata** fields:
`taxonomyVersion`, `status`, `createdAt`, and `updatedAt`. No other field is
excluded. In particular, nested child `ACTIVE`/`RETIRED` lifecycle values stay
inside the semantic comparison and cannot be silently changed during approval.

The compared semantic payload therefore includes, at minimum, `taxonomyId`,
`cefrFrameworks`, `topics`, `domains`, `exams`, `curricula`, `schoolLevels`, and
`difficultyScales`. Preserve all stable child IDs, codes, hierarchy references,
labels, definitions/descriptors, framework code/version, child lifecycle
statuses, and scale/framework semantic metadata. Unknown or future fields also
remain included because the comparison excludes only the four named
top-level metadata properties. For a lifecycle-only approval snapshot, the
canonical semantic diff must be zero. The diff can only be verified after the
new snapshot is authored; a plan stating the invariant is not proof that the
target snapshot already exists or has passed comparison.

### Dataset version policy

Use SemVer for `datasetVersion`, independent from `schemaVersion`:

- **MAJOR**: an incompatible content contract/interpretation change for downstream consumers, a breaking change to how released identities are represented, or a deliberate release-line reset with migration instructions. A new MAJOR never recycles identities.
- **MINOR**: additive approved Lexemes/Senses, taxonomy values, translations, relations, sets, or classifications that consumers can ignore safely.
- **PATCH**: editorial corrections that preserve the intended identity and remain compatible with the release contract. A patch can still change learner-facing wording; therefore its runtime projection fingerprint/content version changes where output changes.

Every release is immutable after publication. Corrections produce a later release referencing the same stable identities and higher entity revisions as needed. `schemaVersion` changes only when the serialized data contract changes. The exact release cadence and compatibility guarantees between consumer versions remain product-owner decisions.

### Reproducible release snapshot

`datasetVersion` names the curated release; it is not a pointer to whatever is current later. The release manifest pins exact records and their revisions: `(masterLexemeId, lexemeRevision)`, `(masterSenseId, senseRevision)`, `(classificationId, classificationRevision)`, `(learningSetId, learningSetRevision)`, and `(relationId, relationRevision)`. It also pins each immutable taxonomy snapshot `(taxonomyId, taxonomyVersion)`, each included media slot/version plus exact byte SHA-256, and each immutable Provenance record. Every pin includes a package-relative record path and the SHA-256 content hash of that serialized record.

The pinned artifact at that path is immutable. A revision increment writes a new artifact and does not replace an older one. Reconstructing `2.0.0` means loading exactly its recorded IDs, revisions, paths, and hashes and verifying them; resolving “latest revision” at read time is forbidden. Lexeme/Sense parent snapshots include the exact state of their owned linguistic children, whose stable child IDs remain unchanged when correcting the same conceptual child. Learning Set revisions include the exact ordered item list. Classification assignments and relations are independently revisioned so a classification/evidence edit does not silently rewrite an older Sense snapshot.

`releaseHash` is SHA-256 over the [RFC 8785 JSON Canonicalization Scheme (JCS)](https://www.rfc-editor.org/rfc/rfc8785.html) UTF-8 bytes of the manifest with the `releaseHash` field omitted. The manifest includes the exact revision pins and content hashes, and the selected media byte hashes. `releaseHashAlgorithm` is `sha256-canonical-json-v1`; changing canonicalization requires a new named algorithm/schema contract. The per-record `contentHash` is likewise computed over JCS UTF-8 bytes for that immutable record. Linguistic strings must already satisfy the contract's NFC requirement before a revision is finalized; hashing preserves their exact stored Unicode values. A release is not approved until all referenced artifacts resolve, hashes match, and its release hash verifies.

### Lexeme and Sense revision rules

Revisions are positive, monotonically increasing integers local to the entity, starting at 1. An approved editorial transaction computes whether owned content changed and advances the appropriate revision automatically. The revision history records old/new values and provenance. Never decrement, reuse, overwrite an already published revision artifact, or infer a revision from datasetVersion.

`lexemeRevision` changes for Lexeme-owned fields such as lemma/display form, normalized lexical metadata, aliases, or Lexeme-level pronunciation semantic/transcription state. It does not fan out to every Sense just because the headword was corrected. `senseRevision` changes for the semantic state of a Sense and its approved learner-facing linguistic children: preferred Translation, preferred Definition, Example content/selection where it affects the semantic state, and Sense-level pronunciation semantic/transcription changes. A child stable ID remains unchanged when correcting the same conceptual child; the parent revision advances and preserves the corrected child state. A classification/provenance/reviewer-note change alone does not advance `senseRevision`; classification edits advance `classificationRevision`, while Provenance claims are immutable records. Audio bytes or voice-render replacement remain `mediaAssetVersion` changes and do not automatically increment semantic Sense revision. A changed spoken target or transcription is linguistic state and advances the owning Lexeme or Sense revision.

Each Pronunciation has exactly one owner: `masterLexemeId` XOR `masterSenseId`. A Sense-owned override stores only `masterSenseId`; the Lexeme is resolved by loading that Sense's `masterLexemeId`. Both owner fields or neither owner field are invalid. A Lexeme-level pronunciation semantic/transcription change advances `lexemeRevision`; a Sense-level override semantic/transcription change advances `senseRevision`. The media bytes attached to either pronunciation are pinned and versioned independently.

Example IDs remain stable when correcting the same sentence/context; that correction advances the parent Sense revision because the app projection can change. Adding/removing an Example advances Sense revision if the selected runtime example changes. If multiple examples are editorial-only and the projection remains identical, no runtime version change is required even though the Master release/revision records the editorial update.

## 6. Media Asset Version policy

- `mediaAssetId` identifies the intended target/slot, such as the approved illustration slot for the fruit Sense of “apple” or the en-US pronunciation slot.
- `mediaAssetVersion` is a positive integer unique within `mediaAssetId`. Approved versions are immutable; a replacement appends the next version and names the prior version it supersedes.
- `sha256` is the full lowercase SHA-256 digest of exact bytes. Equal hashes mean equal bytes for deduplication purposes; they do not prove equal editorial meaning, rights, target Sense, or asset identity.
- A delivery/provider migration creates a new `deliveryId` or delivery row for the same `(mediaAssetId, mediaAssetVersion)`. It does not create a new media version if the bytes and learner-visible rendition are unchanged.
- A regenerated/replaced render becomes a new asset version when approved, even if produced from the same prompt. If the semantic target or editorial purpose changes (for example, image now represents the riverbank sense instead of the financial-bank sense), create a new `mediaAssetId` and retire the old slot rather than pretending it is only a byte refresh.
- Prompt, model, voice, style, source, rights, QA, transcript, and hash metadata are version-scoped. Correcting review notes or nonmaterial provenance text without changing the approved media does not itself require a new asset version.
- Media version does not automatically change `senseRevision`. If it is selected for runtime and its asset identity/version/hash changes, the runtime projection fingerprint changes and runtime `contentVersion` advances.

## 7. Runtime content version from projection fingerprint

### Normative rule

For each Master Sense mapped to an app row, the projection materializer constructs the exact approved learner-facing vocabulary projection for the chosen language/configuration and computes a deterministic SHA-256 fingerprint. In the same transaction that applies projected values:

1. Compare the incoming fingerprint to the last persisted fingerprint for that app row/projection contract version.
2. If equal, keep the existing runtime `contentVersion` and make the import idempotent.
3. If different, apply the row and set `contentVersion` to the previous value plus one. For a new app row, start at 1.
4. Persist the fingerprint/version as part of the same transaction. A caller cannot pass a chosen version or opt out of the comparison.
5. All writes to learner-facing vocabulary projection fields must pass through this materializer or an equivalent database-enforced mechanism. A script convention by itself is insufficient to guarantee the invariant.

Phase 2D persists the full projection fingerprint and projection contract version
in `master_vocabulary_mappings`, alongside each explicit Master Sense to app
integer mapping. The bridge is additive; it does not change the legacy integer
ID or source identity columns. A transaction-local V2 importer context and
database guards prevent the existing catalog curation/import paths from
changing learner-facing fields after a row is adopted. See the
[Runtime Import Contract](master-vocabulary-v2-runtime-import-contract.md) for
the explicit first-adoption, override, reconciliation, and apply rules. The
guard establishes a write boundary for the repository's current paths; any new
catalog writer must use the same governed materializer.

### Fingerprint inputs

Use an explicitly versioned projection contract (for example `runtime-vocabulary-projection-v1`) and deterministic canonical serialization. Normalize strings to Unicode NFC and line endings to LF without lowercasing or rewriting learner-facing text. Emit properties in a fixed documented order, represent absence as explicit `null`, use canonical number/string encoding, and sort only sets whose order has no learner meaning. Preserve order for selected examples or other ordered content.

For the current supported app row, fingerprint the learner-visible content and its semantic media identity, including:

- selected display `word` and language;
- selected IPA/pronunciation string for the projection locale;
- effective selected Translation text and its target language (owner override after approval, otherwise selected Master translation);
- selected Definition and Example text/language;
- selected legacy topic and `level` values while those fields remain in the DTO;
- selected image and word-audio semantic asset IDs, media versions, and full byte hashes; include example audio if a later projection exposes it;
- the runtime availability/enabled state if it is part of the materialized learner-facing projection;
- any later learner-facing fields as soon as they are added to the projection contract.

Do not fingerprint Cloudinary URL/public ID as the media identity. A provider URL change that delivers the same selected approved asset/version/hash does not change semantic learner-facing content. Delivery health is tracked separately; if the selected asset is unavailable and the runtime projection intentionally changes its URL to null, that projection change is fingerprinted.

The fingerprint envelope contains the projection contract version. A deliberate change to canonicalization or the field set requires a new projection contract version and a controlled baseline/reconciliation. Do not truncate the stored SHA-256 digest.

Taxonomy/set membership endpoints are separate projections in the current app. A Learning Set reorder/membership change increments `learningSetRevision` and the relevant catalog/set projection revision; it is not a change to an individual vocabulary row unless those membership fields are later embedded in that row's learner-facing projection.

## 8. Exercise ID compatibility

Current exercise IDs include exercise type, application vocabulary integer ID, and runtime `contentVersion`, for example `meaning:<appVocabularyId>:<contentVersion>` and `listening:<appVocabularyId>:<contentVersion>`. The deterministic fingerprint policy preserves that format: when learner-facing content changes, the materializer automatically increments `contentVersion`, which produces a fresh exercise ID; when a re-import is identical, the ID remains stable.

The Master Sense ID is not substituted into the existing exercise ID in this phase. Each activated Sense must map to a stable app integer ID. If two senses of one Lexeme are both activated, they require separate app rows/IDs; putting them under one row would make the current prompt, meaning, distractors, and exercise identity ambiguous. Existing app IDs referenced by `learner_progress` and `review_events` cannot be recycled. A future sense-aware runtime would require an explicit progress/history mapping policy and is outside this task.

## 9. Illustrative revision examples

| Change | Dataset version | Entity revision | Media version | Runtime `contentVersion` |
|---|---|---|---|---|
| Correct an editor note only | Next release as appropriate | Review history only | No | No, if fingerprint unchanged |
| Correct selected Vietnamese meaning | Next release | Sense revision advances | No | Automatically advances because effective Translation changes |
| Add an alternate unselected example | Next release | Sense revision advances if approved | No | No if selected runtime example and projection stay identical |
| Change the selected English example | Next release | Sense revision advances | No | Automatically advances |
| Replace selected image with new approved bytes | Next release | No semantic Sense revision | Asset version advances; hash changes | Automatically advances |
| Move the same approved bytes to a new CDN URL | No content bump required | No | No | No if selected asset/version/hash and projected content remain the same |
| Reclassify a Sense as B1 instead of A2 when CEFR is not in app DTO | Next release | Classification/review history changes | No | No; if CEFR later enters the runtime projection, it is included then |

## 10. Compatibility and implementation boundary

This policy preserves today's app IDs, `contentVersion` integer contract, review/progress foreign keys, and exercise-ID shape. It strengthens the future write rule: a Master import must derive version changes from projection values rather than trusting a script author's manual increment. The Master → app mapping is explicit and stable; changing Master IDs does not silently remap existing learner history.

Phase 2D implements the bridge and import adapter, but does not apply its
additive migration. Runtime adoption still requires a later staging phase with
an approved release, completed human reconciliation, migration application,
and canary review. No DRAFT pilot row is eligible for adoption.
