# VocabFlow Master Vocabulary V2 — Runtime Import Contract

- Status: `IMPLEMENTED / READY FOR OWNER CHECK` for the Phase 2D adapter and
  additive schema. Staging execution is a later phase.
- Scope: explicit runtime identity reconciliation, deterministic planning,
  guarded catalog writes, and import audit records.
- Current pilot: `DRAFT`, `IN_REVIEW`, and `importEligible: false`; it cannot be
  applied.

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
- `UPDATE_TO_MASTER` authorizes ownership transfer after any detected override
  conflict is separately resolved. It writes Master fields; `contentVersion`
  advances only when the effective projection or its persisted fingerprint
  requires a new version.

The runtime projection is compared to what API consumers see:
`vietnamese_override ?? vietnamese`, and `image_url` becomes `null` when
`image_quarantined` is true. A mismatching Vietnamese override blocks adoption
or update. An exact override match still needs explicit
`KEEP_IF_MATCHES_PROJECTION` or `CLEAR`; `CLEAR` is the reviewed ownership
transfer. A quarantined row that would expose a Master image requires explicit
`CLEAR` and remains blocked otherwise. A quarantine masking no image needs
`KEEP_IF_NO_IMAGE` or `CLEAR`. No override or quarantine is silently removed.

After adoption, the Master projection owns vocabulary learner-facing fields:
word, IPA, Vietnamese base value, definition, example, image/audio URLs,
legacy topic string, level, enabled state, and derived `contentVersion`.
Override and quarantine fields are changed only by the explicit policies above.
Database triggers in the migration reject catalog changes to mapped rows from
pre-existing curation/importer paths; the V2 transaction sets its local import
context while it writes. Operational fields and learner state are not owned by
the projection.

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

`drizzle/migrations/0015_clean_yellowjacket.sql` is forward-only and additive.
It creates the bridge tables, constraints, ownership/write guards, and indexes
required by the adapter. Existing rows remain valid without backfill and app
startup continues with empty bridge tables. The migration has been generated
and statically tested but has not been applied. Phase 2D makes no Neon or other
shared-database mutation and performs no media generation or Cloudinary upload.
Staging migration and canary execution require a later phase after a reviewed
APPROVED release and complete runtime reconciliation exist.
