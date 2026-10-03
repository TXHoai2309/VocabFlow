# VocabFlow Master Vocabulary V2 — Runtime Import Contract

- Status: `IMPLEMENTED / READY FOR OWNER CHECK` for Phase 2D and Phase 2D.1,
  with Phase 2D.2 owner-approval/release tooling prepared offline. Owner content
  approval, a dedicated staging target, runtime snapshot, reconciliation, and
  staging execution remain pending.
- Scope: explicit runtime identity reconciliation, deterministic planning,
  guarded catalog writes, and import audit records.
- Current pilot: `DRAFT`, `IN_REVIEW`, and `importEligible: false`; it cannot be
  applied.
- Current runtime projection contract: Phase 2E.4A `app-import-v3`,
  `runtime-vocabulary-projection-v2`, and `runtime-reconciliation-v3`. Earlier
  ownership statements below describe v1 and are superseded by the current
  policy section.

## 1. Identity bridge and persistence

Phase 2D leaves `vocabflow_app.vocabularies.id` and all existing integer
references intact. Master UUIDs live only in the new bridge tables; they are
never placed in legacy `source_record_id` or inferred from a lemma, meaning,
array position, topic, or level.

| Table | Purpose |
|---|---|
| `master_vocabulary_mappings` | One Master Sense to one runtime vocabulary integer. Stores Lexeme/Sense identity and revisions, dataset/schema versions, projection contract, full applied SHA-256 fingerprint, release and last run. Both Sense UUID and runtime ID are unique. |
| `master_topic_mappings` | Stable Master Topic UUID to one runtime Topic integer. |
| `master_learning_set_mappings` | Stable Master Learning Set UUID to one runtime Set integer. |
| `master_vocabulary_topic_memberships` | Ownership ledger for links materialized in `vocabulary_topics`. |
| `master_learning_set_memberships` | Ownership and ordered position ledger for links materialized in `learning_set_items`, including the Master Set Item UUID. |
| `master_vocabulary_import_runs` | Minimal applied-release ledger, unique by environment, dataset, release, App Import contract, projection contract, and reconciliation hash. It stores the reviewed plan fingerprint and target branch identity. |

Bridge foreign keys use `NO ACTION`; there is no cascade into runtime catalog
or learner history. The migration creates empty tables and guards only. It does
not backfill or alter populated vocabulary/progress/review rows. `learner_progress`,
`review_events`, and `learner_learning_sets` are not written by this importer.

Migration `0016_nostalgic_mattie_franklin.sql` adds candidate unique keys for
the `(Master ID, runtime ID)` pairs on the Sense, Topic, and Learning Set
mapping tables. Topic memberships reference both exact pairs:
`(master_sense_id, vocabulary_id)` and `(master_topic_id, topic_id)`. Learning
Set memberships similarly reference `(master_learning_set_id, learning_set_id)`
and `(master_sense_id, vocabulary_id)`, while retaining the runtime join-table
foreign keys. Existing single-column foreign keys remain as redundant checks.
This database-level contract prevents a planner or adapter defect from writing
a membership that pairs a valid Master identity with another valid runtime ID.
Migration `0015_clean_yellowjacket.sql` remains unchanged; `0016` is an
additive snapshot-linked follow-up and has not been applied.

## 2. Human-owned reconciliation

`vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json` is a
versioned, human-owned adoption decision file. The transform never generates or
overwrites it. Its source dataset/version/schema, manifest content hash, and
release hash must match the App Import artifacts.

Each Sense, Topic, and Learning Set must explicitly choose `MAP_EXISTING`,
`CREATE_NEW`, `SKIP`, or `UNRESOLVED`. Existing integer IDs are required for
`MAP_EXISTING`; `CREATE_NEW` leaves allocation to the transaction; `SKIP`
requires a reason and an explicitly allowed partial release. Unresolved rows,
identity reuse, missing mapped rows, and slug collisions block apply. An
existing bridge mapping cannot move to another runtime ID.

An existing vocabulary row without a fingerprint needs an explicit
`firstAdoptionPolicy`:

- `ADOPT_EXISTING_AS_BASELINE` succeeds only when the current effective API
  projection exactly matches the reviewed Master projection. It stores the
  mapping/fingerprint and preserves `contentVersion`.
- `UPDATE_TO_MASTER` authorizes a field-by-field update under the selected
  projection contract. Under v2, concrete Master values are set, null or absent
  enrichment values are preserved, and Master-authoritative nullable fields
  require `clearFields` to clear a non-null runtime value.

The runtime projection is compared to what API consumers see:
`vietnamese_override ?? vietnamese`, and `image_url` becomes `null` when
`image_quarantined` is true. A mismatching Vietnamese override blocks adoption
or update. An exact override match still needs explicit
`KEEP_IF_MATCHES_PROJECTION` or `CLEAR`; `CLEAR` is the reviewed ownership
transfer. A quarantined row that would expose a Master image requires explicit
`CLEAR` and remains blocked otherwise. A quarantine masking no image needs
`KEEP_IF_NO_IMAGE` or `CLEAR`. No override or quarantine is silently removed.

After adoption, field ownership follows the current versioned contract in
“Phase 2E.4A — Runtime projection preservation.” Override and quarantine
fields are changed only by the explicit policies above. Database triggers in
the migration reject catalog changes to mapped rows from pre-existing
curation/importer paths; the V2 transaction sets its local import context while
it writes. Operational fields and learner state are not owned by the
projection.

## 3. Fingerprint and `contentVersion`

Phase 2C's full lowercase SHA-256 fingerprint is persisted with its projection
contract version in the Sense mapping. The planner compares fingerprints only
under the same contract version. A contract change requires an explicit
`projectionContractUpgradePolicy`: `REBASE_IF_EFFECTIVE_MATCHES` records the new
baseline only if the effective runtime projection already matches, while
`UPDATE_TO_MASTER` explicitly authorizes materialization under the new
contract. There is no hash truncation or implicit contract equivalence.

- New Sense / `CREATE_NEW`: insert the vocabulary row with `contentVersion = 1`,
  capture the database-generated integer, then persist its mapping and
  fingerprint in the same transaction.
- Existing mapping, same contract and fingerprint: effective row must still
  match; action is `NOOP` and the version stays unchanged.
- Changed projection: update the owned row, derive exactly previous
  `contentVersion + 1`, and persist the fingerprint in that transaction.
- First baseline: the explicit matching-baseline policy adds bridge metadata
  without incrementing an unchanged effective row.

Callers cannot choose the next version. Stale `contentVersion`, fingerprint,
mapping, or row identity makes the transaction fail instead of overwriting
concurrent edits. The run ledger prevents ambiguous replay of the same release
and reconciliation. An exact replay is a no-op; if that release's runtime
state has drifted and would need mutation, planning blocks it for review.

## Phase 2E.4A — Runtime projection preservation (current contract)

`app-import-v3` and `runtime-vocabulary-projection-v2` version the change in
null ownership semantics. `runtime-reconciliation-v3` adds an optional,
reviewed `clearFields: string[]` per vocabulary decision. Dataset schema,
Master UUID identity, revisions, and approved 2.1.0 source release hash do not
change. The v2 file path
`vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json` remains the
human-owned location; its checked-in v2 content is stale and unresolved until
an owner prepares a v3 artifact. This phase does not finalize it.

| Runtime field | Ownership | Import behavior |
|---|---|---|
| `word`, Vietnamese base, `definition_en`, `example_en`, `enabled` | `MASTER_AUTHORITATIVE` | Set concrete Master values. A null/absent nullable definition or example cannot erase a non-null runtime value without an explicit clear. Missing required values block. |
| `ipa`, `image_url`, `audio_url`, legacy `topic`, `level` | `RUNTIME_ENRICHMENT` | Set a concrete Master value. Null/absent means `PRESERVE` for MAP_EXISTING; CREATE_NEW starts null. |
| `vietnamese_override` | `RUNTIME_OVERRIDE` | Not projected; retained unless the existing explicit override policy says `CLEAR`. |
| `image_quarantined`, `content_version` | `RUNTIME_OPERATIONAL` | Quarantine is retained unless its existing explicit policy says `CLEAR`; contentVersion is derived by the importer. |
| `source_dataset`, `source_record_id` | `IDENTITY_METADATA` | Outside the projection and unchanged by this importer. |

For each mapped row, the plan exposes ownership, before value, raw Master
value (`"ABSENT"` distinguishes omission from JSON null), operation, and after
value. `SET` writes a concrete Master value; `PRESERVE` keeps the current
runtime value; `CLEAR` writes null only when the human reconciliation lists
that nullable field in `clearFields` and Master is null/absent. Duplicate,
unsupported, non-null, and non-nullable clear requests block. Null alone never
clears a field. Vietnamese override and image quarantine remain separate
control operations under their existing explicit policies.
If Master is silent on image and the quarantined runtime row contains an image,
clearing quarantine alone is blocked because preservation would expose that
image. The reconciliation must also explicitly clear `imageUrl`, or Master
must supply a replacement image.

`effectiveProjection` is the learner-visible API result after the planned
storage fields, Vietnamese override, and image quarantine. Its v2 SHA-256/JCS
fingerprint, rather than the raw Master fingerprint, is persisted as
`applied_projection_fingerprint`. Master-set media uses source asset
UUID/version/byte-hash/availability identity, preserving the established
semantic fingerprint rule that a provider URL rotation is not a content
change. A preserved legacy runtime URL has no Master asset identity, so that
effective URL participates in the fingerprint. Hidden quarantined image URLs
do not participate because the API returns null.

`contentVersion` increments once only when the effective learner-facing
projection changes. A mapping/fingerprint rebase with identical effective
content does not increment it. CREATE_NEW materializes exactly the Master
projection with initial version 1. Reapplying the same release and
reconciliation is stopped by the run ledger and performs no writes; a changed
snapshot that would require another mutation is blocked for review.

The plan reports field operations and the deterministic outcomes
`MASTER_FIELD_UPDATE`, `PRESERVED_RUNTIME_ENRICHMENT`, and `EXPLICIT_CLEAR`.
They replace the ambiguous projection-loss warning for new plans; the Phase
2E.3 loss audit remains historical evidence.

## 4. Topics and Learning Sets

Topics require explicit existing IDs or transaction-time creation. An
unmapped slug collision is a reconciliation conflict; a label or slug never
establishes identity. Topic membership resolves only through the Sense and
Topic mappings. The legacy `vocabularies.topic` compatibility value comes from
the approved projection and is not used to construct normalized membership.

Learning Sets follow the same explicit ID/create rule and slug collision gate.
Existing Set mapping does not itself authorize its contents: the reviewed
`MANAGE_LISTED_MASTER_ITEMS` policy is required before Master Set Items update
`learning_set_items`. Each Sense reuses its one vocabulary ID across sets, and
the Master item position is preserved. The importer never writes
`learner_learning_sets` or assigns a set to a learner.

The membership ownership ledgers allow planning to distinguish Master-managed
links from unrelated existing links. Listed links may be inserted or have
their order updated. Unrelated links are preserved. A missing item in a later
release is reported; no membership, catalog row, app ID, progress row, or review
event is automatically deleted or retired.

The write guards take effect only after the mapping or ownership row exists.
Before adoption, existing catalog updates and curation flows remain
unaffected. After adoption, changing a mapped vocabulary's projected fields
or a mapped Topic/Set's owned fields requires the transaction-local V2 importer
context. For `learning_set_items`, protection is per ledger-owned pair:
changing its order or deleting it requires the importer; unrelated pairs
remain operational. This preserves unrelated membership writes while keeping
each Master-owned item under the V2 workflow.

## 5. Planner, CLI, and apply gates

`pnpm import:master-vocab-v2` runs an offline `DRY_RUN` by default and writes a
deterministic JSON plan. The report includes source/release/contract identity,
target classification, eligibility, reconciliation counts, entity and
membership actions, conflict codes, fingerprint/version changes, absence
counts, and progress/review safety summaries. `--target development|test` opts
into target-verified read-only runtime inspection; without a target, planning
does not connect to a database.

The `--apply` path requires a supported approved RELEASE artifact, valid
release hash, complete explicit reconciliation, supported contracts, no
identity/override/topic/set conflicts, target pre-connect and post-connect
identity checks, and the exact plan fingerprint reviewed for the current
snapshot. Production also runs the existing production release authorization
and confirmation path. Inside one transaction, the adapter takes an advisory
lock, sets a transaction-local importer context, locks and rereads runtime and
bridge state, rebuilds the plan, compares the plan fingerprint, and only then
writes the run, catalog projection, mappings, and managed memberships. Any
gate or stale-state mismatch aborts the transaction.

The tracked pilot is intentionally still ineligible. Its offline plan reports
25 unresolved Senses, 18 unresolved Topics, and 7 unresolved Learning Sets;
it plans no vocabulary creates and records zero deletions or learner
assignments. Synthetic approved artifacts exercise adapter mutation and
replay behavior in tests; they are not copied into the real dataset or a
database.

## 6. Migration and execution boundary

`0015_clean_yellowjacket.sql` and `0016_nostalgic_mattie_franklin.sql` are
forward-only and additive. Together the chain creates the bridge tables,
candidate keys, membership identity constraints, ownership/write guards, and
indexes required by the adapter. Existing rows remain valid without backfill
and app startup continues with empty bridge tables. Phase 2D.1 performs no
Neon or other shared-database mutation and no media generation or Cloudinary
upload. No dedicated staging target is configured: `test` is shared CI, and
the existing development target has not been proven safe to migrate/reset as
a canary. The recommendation is to configure a dedicated isolated
non-production staging/canary branch in a later explicitly authorized step.
Staging migration and canary execution require that target, owner-approved
content, an approved subset release, and complete runtime reconciliation.

Phase 2D.2 prepares the field-aware owner artifact, an isolated `2.1.0` MINOR
release builder, and a pure candidate scanner for separately verified
read-only snapshots. The current owner artifact remains pending; no actual
release workspace is created. `pnpm db:migrate` has no staging selector and
must not be used as one. See the [Phase 2D.2 readiness report](master-vocabulary-v2-phase-2d2-readiness.md)
for target blockers and exact gates.
