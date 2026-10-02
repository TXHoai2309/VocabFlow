# VocabFlow Master Vocabulary Dataset V2

This directory contains the Phase 1 Master Vocabulary contract, the Phase 2A
cross-file validator package, and the Phase 2B editorial pilot. It is separate
from the app's runtime DTOs and database schema. The pinned `2.0.0` dataset
manifest remains `DRAFT`; its 19 Lexemes and 25 Senses are all `IN_REVIEW`,
with project-authored examples and Vietnamese translations. Pilot CEFR bands
and difficulty scores are unverified editorial estimates. The internal school
profile and IELTS-tagging exercise are explicitly non-official. Media records
contain planning briefs only; no image or audio bytes have been generated.

## Package layout

| File | Validates |
|---|---|
| `schemas/common.schema.json` | Reusable definitions: UUIDv7, BCP 47 tags, release hashes, pronunciations, typed classifications, relation shape, and shared values. Validate a standalone Classification against `#/$defs/classification`. |
| `schemas/dataset.schema.json` | One Dataset Release manifest, including exact revision/content pins. |
| `schemas/lexeme.schema.json` | One immutable Lexeme revision and its aliases and Lexeme-owned pronunciations. |
| `schemas/sense.schema.json` | One immutable Sense revision and its semantic linguistic children and Sense-owned pronunciation overrides. |
| `schemas/taxonomy.schema.json` | One versioned taxonomy snapshot containing its controlled catalogs. |
| `schemas/learning-set.schema.json` | One Learning Set revision with its ordered Sense membership items. |
| `schemas/media-asset.schema.json` | One semantic media slot, its immutable media versions, and provider deliveries. |
| `schemas/provenance.schema.json` | One immutable evidence/source/authorship record. |
| `fixtures/valid/` | Synthetic inputs expected to satisfy the named schema. |
| `fixtures/invalid/` | Synthetic inputs expected to fail the named schema. |
| `../scripts/fixtures/master-vocabulary-v2-dataset.ts` | Builds an approved synthetic cross-file release for isolated validator tests. |

Every schema uses JSON Schema Draft 2020-12. The schema `$id` values use the
reserved `.invalid` domain as stable local identifiers. A validator must load
and register the schema files by `$id` and must not fetch those IDs over the
network. Relative references such as `common.schema.json#/$defs/uuidV7` resolve
through that local registry. The Phase 2A validator registers these local
schemas and never fetches their `$id` values over the network. It does not
include an importer, database adapter, or runtime integration.

## Offline App Import V2 projection

Phase 2C provides `pnpm transform:master-vocab-v2`, which first validates the
Master package and writes deterministic App Import V2 preview artifacts under
`import/`. The default mode is `PREVIEW`; it always marks the package
`importEligible: false` and keeps rows disabled. `--release` requires a
validator-clean `APPROVED` manifest, so this current DRAFT pilot is rejected
before any import artifacts are written. This is an offline projection only;
it does not assign app integer IDs or write to the runtime database.

See the [App Import V2 projection contract](../docs/architecture/master-vocabulary-v2-app-import-contract.md)
for field selection, fingerprint semantics, compatibility rules, information
loss, and future runtime requirements.

## Run validation

From the repository root, run:

```sh
pnpm validate:master-vocab-v2
```

The command validates `vocabflow-dataset/dataset.json`, follows only its exact
pins, prints a concise status, and writes
[`reports/validation-report.json`](reports/validation-report.json). Supply
`--dataset-root <path>` after the command to validate another package using the
same local schemas. The report includes a run timestamp and is git-ignored so
repeated runs do not create timestamp-only diffs. Issues are sorted
deterministically by artifact, JSON pointer, code, and entity; `validatedAt` is
the only intentionally volatile field.

## Release reproducibility

`datasetVersion` names the curated release; `schemaVersion` identifies its
serialized contract. `dataset.json` records exact pins rather than bare IDs:

- Lexeme: `masterLexemeId` + `lexemeRevision`.
- Sense: `masterSenseId` + `senseRevision`.
- Classification: `classificationId` + `classificationRevision`.
- Learning Set: `learningSetId` + `learningSetRevision` (which contains the
  exact ordered item list).
- Taxonomy: `taxonomyId` + `taxonomyVersion`.
- Relation: `relationId` + `relationRevision`.
- Media: `mediaAssetId` + `mediaAssetVersion` + asset-record `contentHash` and
  exact byte `sha256`.
- Media planning slots without a byte version: `includedMediaAssets` pins the
  asset ID, exact record path, and content hash. It represents the brief/status
  only; selecting bytes still requires an exact `includedMediaAssetVersions`
  pin.
- Provenance: immutable `provenanceId` + record `contentHash`.

Each pin includes a package-relative `recordPath` and SHA-256 `contentHash`.
Published revision files are append-only: a new revision receives a new file
and never replaces the bytes for an older revision. Historical reconstruction
loads only the manifest's exact paths and revisions, checks each record's
identity and revision against its pin, and verifies every hash. A missing,
changed, or mismatched artifact makes the release unreconstructable and must
fail validation; the validator must never fall back to the latest revision.

`releaseHashAlgorithm` is `sha256-canonical-json-v1`. Compute each record's
`contentHash` as SHA-256 over its UTF-8 [RFC 8785 JSON Canonicalization Scheme
(JCS)](https://www.rfc-editor.org/rfc/rfc8785.html) representation. Compute
`releaseHash` the same way over the manifest with only its `releaseHash`
property omitted. The manifest contains every pin and selected media byte
hash. Strings must already be in their contractually normalized form before
the immutable artifact is finalized; JCS preserves the exact stored Unicode
values. A change to this hashing contract needs a new algorithm/schema
contract, not silent reinterpretation.

## Validation stages and release boundary

The validator has two stages. First, Ajv validates the manifest and each pinned
artifact with JSON Schema Draft 2020-12. It reuses schema checks for required
fields, enums, UUIDv7/SHA-256 shapes, Pronunciation owner XOR, Classification
`oneOf` value shape, unknown properties, and `uniqueItems`. It registers all
local `$id` schemas before compiling references, enables URI and date-time
formats, and does not fetch schemas from the network. The `language-tag` custom
format currently checks syntax only.

Second, cross-file validation follows only paths declared in `dataset.json`.
It never scans the records directory, chooses a latest revision, or falls back
when a pin is missing. Paths must remain beneath the package root, including
after resolving symlinks. If manifest schema validation fails, no pins are
dereferenced. Any files not named by the manifest are outside that release.

`DRAFT` and `IN_REVIEW` are working states: the validator checks every declared
pin, artifact hash, identity/revision match, reference, and graph invariant but
does not require publication status or a release hash. `APPROVED` additionally
requires its release hash, approved pinned learner-facing records and taxonomy,
eligible approved Learning Set memberships, and active references where the
contract requires them. Approved CEFR, Exam, School Level, and Relation claims
also require Provenance under the current contract. Draft status does not waive
checks on data that is actually pinned. The tracked Phase 2B pilot is editorial
working content and must not be treated as an approved production vocabulary.

The cross-file stage checks:

- Typed reference resolution for Lexeme/Sense children, pronunciation owners,
  classifications, Learning Sets, Relations, Media, and Provenance subjects.
- Duplicate typed entity IDs, set code/membership/position, preferred
  Translation/Example Translation/Pronunciation, classification assignment and
  primary scopes, and Topic/Domain/School Level code scopes.
- Topic/Domain parent scope, self-parent and cycle checks; Classification
  taxonomy type/framework/scale and active-scope checks; retired taxonomy
  references in approved releases.
- Learning Set item ownership and approved-set eligibility.
- Media asset/version/delivery ownership, selected version state, media-kind
  target compatibility, pronunciation/example audio target compatibility,
  READY HTTPS URL safety, selected byte-hash pin, and asset-record hash.
- Relation endpoint types, self-edges, required directionality for the
  contract's symmetric/directed types, and canonical duplicate symmetric
  edges. Other relation graph cycles are allowed.
- Provenance reference closure for linguistic records, classifications, CEFR
  descriptors, Curricula, Difficulty Scales, Learning Sets, Relations, and
  taxonomy/media subjects.

The complete stable issue-code catalog is in
[`docs/architecture/master-vocabulary-v2-validation-contract.md`](../docs/architecture/master-vocabulary-v2-validation-contract.md).
`ERROR` makes the report `FAIL`; `WARNING` and `INFO` leave it `PASS`. The
normalized lemma warning is a duplicate-review candidate only; records are not
merged or modified.

Intentionally deferred: a pinned IANA Language Subtag Registry/canonical BCP 47
casing policy; historical revision monotonicity/immutability checks that need
revision history; semantic naturalness/editorial review; a complete provider
and MIME allowlist; decoding/QC and computing media SHA-256 from local bytes;
license verification; and exact version-level Provenance linkage for licensed
media, which the current serialized contract does not model unambiguously. The
validator does not fetch external sources or media.

## Draft behavior

Pinned draft records still require fields marked required by their schemas.
The schemas permit only explicitly optional draft content to be absent. For
example, an unapproved Translation, Definition, or Example can omit final text
and Provenance. JSON Schema enforces that `APPROVED` versions of those child
records include nonblank text and Provenance IDs. Cross-file validation checks
that each supplied Provenance ID resolves. Draft status never bypasses
reference integrity, owner XOR, UUID, classification shape, pin, or hash
checks.

## Fixture map

Validate `dataset.json` with `schemas/dataset.schema.json`. For the remaining
fixtures, use the map below; standalone Classification fixtures target
`schemas/common.schema.json#/$defs/classification` and owner-rule fixtures
target `#/$defs/pronunciation`.

| Fixture | Schema target | Expected |
|---|---|---|
| `fixtures/valid/lexeme-minimal.json` | `lexeme.schema.json` | Valid |
| `fixtures/valid/sense-minimal.json` | `sense.schema.json` | Valid |
| `fixtures/valid/classification-cefr.json` | `common.schema.json#/$defs/classification` | Valid |
| `fixtures/valid/classification-difficulty.json` | `common.schema.json#/$defs/classification` | Valid |
| `fixtures/valid/classification-topic.json` | `common.schema.json#/$defs/classification` | Valid |
| `fixtures/valid/lexeme-pronunciation.json` | `lexeme.schema.json` | Valid |
| `fixtures/valid/sense-pronunciation-override.json` | `sense.schema.json` | Valid |
| `fixtures/valid/learning-set-sense-reference.json` | `learning-set.schema.json` | Valid |
| `fixtures/valid/media-asset-version-delivery.json` | `media-asset.schema.json` | Valid, schema shape only |
| `fixtures/invalid/pronunciation-both-owners.json` | `common.schema.json#/$defs/pronunciation` | Invalid: owner XOR |
| `fixtures/invalid/pronunciation-no-owner.json` | `common.schema.json#/$defs/pronunciation` | Invalid: owner XOR |
| `fixtures/invalid/classification-difficulty-no-scale.json` | `common.schema.json#/$defs/classification` | Invalid: missing `scaleId` |
| `fixtures/invalid/classification-cefr-numeric.json` | `common.schema.json#/$defs/classification` | Invalid: wrong value shape |
| `fixtures/invalid/classification-topic-code.json` | `common.schema.json#/$defs/classification` | Invalid: Topic requires `valueRef` |
| `fixtures/invalid/lexeme-invalid-uuid.json` | `lexeme.schema.json` | Invalid: not UUIDv7 |
| `fixtures/invalid/dataset-invalid-version.json` | `dataset.schema.json` | Invalid: not SemVer |
| `fixtures/invalid/learning-set-identical-duplicate-item.json` | `learning-set.schema.json` | Invalid: identical duplicate item (`uniqueItems`) |

Fixture text, IDs, timestamps, media hash, and `.invalid` media URL are
synthetic schema examples. They are not a vocabulary pilot or assertions that
referenced entities or media bytes exist. In particular, no media file is
included or uploaded, and fixture hashes must not be treated as verified
content hashes.

## Decisions still open for a later owner review

- The language-tag validator's pinned IANA registry release and canonical tag
  casing policy.
- Exact `KIDS` / `TEEN` / `ADULT` age boundaries and whether those labels remain
  editorial audience categories.
- Initial CEFR framework/version, taxonomy catalog ownership boundaries, and
  curriculum jurisdictions/editions to include in the first approved release.
- Which provider/MIME allowlists and decoding/QC rules a future media validator
  will enforce.
- The storage and retention mechanism that guarantees published revision
  artifacts remain append-only, and the operational location where future
  schema/release validation will run.
- The complete controlled vocabularies for POS, register, accent, region,
  relation semantics, and provider-specific generation settings.

These open items do not change the current schema-only contract. Any change to
fixed enums or field representation requires an explicit schema version
change.
