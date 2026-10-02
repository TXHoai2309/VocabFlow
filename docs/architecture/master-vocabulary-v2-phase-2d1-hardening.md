# Phase 2D.1 — Bridge hardening and canary preparation

**Status:** Implemented as offline code, tests, and review artifacts. No
database migration or import was applied.

## Bridge identity invariant

The Phase 2D planner checked Master/runtime identity pairs before writing, but
the original membership foreign keys checked each Master and runtime identity
independently. A defective writer could therefore combine `Sense A → vocabulary
10` with ledger `Sense A → vocabulary 11`, provided both IDs existed.

The follow-up migration `0016_nostalgic_mattie_franklin.sql` adds these
candidate unique keys:

| Mapping table | Candidate key |
| --- | --- |
| `master_vocabulary_mappings` | `(master_sense_id, vocabulary_id)` |
| `master_topic_mappings` | `(master_topic_id, topic_id)` |
| `master_learning_set_mappings` | `(master_learning_set_id, learning_set_id)` |

It adds exact composite foreign keys from each Topic membership to its Sense
and Topic mapping pairs, and from each Learning Set membership to its Set and
Sense mapping pairs. Existing runtime join-table foreign keys and scalar Master
foreign keys remain. The migration is additive and snapshot-linked after
committed migration 0015; 0015 was not rewritten. The schema tests inspect both
Drizzle metadata and generated SQL. They are offline contract tests, not a live
PostgreSQL constraint exercise. Drizzle emitted the new foreign-key statements
before their referenced candidate keys, so the additive SQL was reordered to
create all three unique keys before dependent composite foreign keys. The
Drizzle snapshot and journal still describe the same schema; a generation
rerun reports no schema changes.

## Guard transition

`0015` already implements conditional ownership guards, now covered by explicit
regression tests:

| Row state and operation | Expected result |
| --- | --- |
| Vocabulary/Topic/Learning Set has no Master mapping | Existing owned-field writes pass. |
| Mapped catalog row changes a Master-owned field without V2 context | Rejected by the guard. |
| Mapped catalog row is unchanged, or its update touches only non-owned fields | Guard does not reject it. |
| Mapped catalog row changes in the V2 transaction-local importer context | Allowed. |
| Learning Set item pair is absent from the ownership ledger | It remains an unrelated runtime link. |
| Ledger-owned Set item changes order or is deleted without V2 context | Rejected by the guard. |

The item guard is deliberately scoped to the pair in
`master_learning_set_memberships`; a new, unledgered item pair remains
unowned. Operations that create or update a Master-owned pair must use the V2
workflow so the membership ledger is written atomically. This keeps unrelated
links usable without allowing a legacy writer to alter a ledger-owned item.
Tests compare the transition truth table with the existing guard SQL; no
database was mutated to execute triggers.

## Existing write paths

| Path | Tables/operation | Before Master adoption | After adoption | Required follow-up |
| --- | --- | --- | --- | --- |
| `scripts/import-vocabulary-catalog.ts` | Inserts/updates imported `vocabularies`; deletes/rebuilds their `vocabulary_topics` links | Passes for unmapped rows and links. | Updating mapped vocabulary content or deleting a ledger-owned topic link is blocked. | Route owned rows and links through V2 import, or exclude mapped identities from legacy apply. |
| `scripts/enrich-starter-vocabulary.ts` | Updates starter `vocabularies` content and media | Passes while the row is unmapped. | Master-owned projection changes are blocked. | Exclude mapped IDs or move edits into reviewed Master revisions and V2 release. |
| `scripts/vocabulary-curation.ts` | Upserts `learning_sets`; updates curated `vocabularies`; deletes/rebuilds `vocabulary_topics`; inserts/upserts `learning_set_items` | Passes for unmapped rows and unledgered links. | Mapped Set/catalog edits are blocked; ledger-owned membership order/delete is blocked. | Migrate owned rows, Sets and pairs to V2; preserve unrelated pairs. |
| `scripts/master-vocabulary-v2-import-store.ts` | Writes vocabulary, Topic, Set, mapping and membership rows in one transaction | N/A | Authorized by transaction-local V2 importer context and records ownership mappings/ledgers. | Current supported Master writer. |
| `drizzle/migrations/0003_lazy_lady_deathstrike.sql`, `0006_sticky_risque.sql`, `0007_modern_mysterio.sql` | Initial catalog, Topic and Set data | Runs as historical schema/seed migrations before Master mapping exists. | These files are history; no new operation is invoked by canary import. | No migration rewrite. |
| `apps/api/src/topics.ts`, `apps/api/src/learning-sets.ts` | Reads Topics, Sets, and their runtime membership | Unaffected. | No catalog write to guard. | None. |
| `apps/api/src/learners.ts` | Creates `learner_learning_sets` learner assignments | Separate learner-assignment operation. | Unaffected; V2 importer does not write learner assignments. | None. |

The app exposes no Topic, vocabulary, Learning Set, or Set-item administration
write API. Integration test scripts create fixtures on their dedicated test
target; they are not operational catalog writers.

## Staging target audit

`config/database-targets.ts` has `development`, `test`, and `production` only.
The `test` target is labeled `shared-ci`; it is not a canary. The current
development target is explicitly development, but repository configuration
does not establish that it is isolated or safe to migrate/reset for staging.
No target was connected to or inspected during this offline task.

**Recommendation: option B.** In a later explicitly authorized operation,
configure a dedicated Neon staging/canary branch and explicit `staging` target.
Before Phase 2E it must be non-production, isolated from shared CI, verified
against configured project/branch identity before and after connection, safe
to migrate/reset under a documented policy, and use `vocabflow_migration` for
migrations and `vocabflow_runtime` for imports. Do not substitute `test` or
assume the existing development branch is safe without evidence.

`STAGING_TARGET_READY = NO` — there is no configured dedicated staging target.

## Owner content review and release boundary

The generated owner package is
[`canary-content-review.md`](../../vocabflow-dataset/reports/canary-content-review.md).
It selects eight existing pilot Senses: apple (fruit), bank (financial and
river), record (noun and verb), look after, algorithm, and reservation. They
cover polysemy, different Senses on one Lexeme, noun/verb IPA stress and a
Sense pronunciation override, a phrasal verb, a technical Domain, and travel
vocabulary. The records and child content remain `IN_REVIEW`; no checkbox has
been completed.

The validator's current `APPROVED` contract requires every pinned Lexeme,
Sense, Classification, Learning Set and Relation to be `APPROVED`, plus an
`APPROVED` pinned taxonomy snapshot. Approved CEFR, Exam and School Level
classifications need source Provenance. The Classification status vocabulary
has no `EDITORIAL` value. Approval of an editorial CEFR estimate would still
be an `APPROVED` classification and must not be presented as an official
claim; these canary CEFR/difficulty assignments are therefore omitted.

The proposed smallest subset boundary is recorded in
[`canary-release-plan-v2.json`](../../vocabflow-dataset/reports/canary-release-plan-v2.json):

- 8 exact Sense pins and 6 exact Lexeme pins;
- 40 exact Provenance pins referenced by those records and one selected Set;
- 1 Learning Set pin (`TECHNOLOGY_STARTER`) with 1 item, all already in the
  Sense subset; the other 6 intersecting Set revisions would add unrelated
  pilot Senses and are excluded;
- no Classification or taxonomy snapshot pins, so runtime Topic and Level are
  null in this minimal release;
- no Relations or media slot/version pins. All 9 Sense-targeted media records
  in the current pilot are `PLANNED`; runtime image/audio URLs remain null.

An optional Topic branch is also enumerated in the plan: 8 Topic assignments,
7 runtime Topics, and 8 linked Provenance pins. Those assignments are
`IN_REVIEW`, and the current taxonomy snapshot is `DRAFT`; including them needs
owner review and an approved taxonomy snapshot or a separately authored,
versioned snapshot. They are excluded from the proposed release. Other omitted
pilot classifications for these Senses comprise 3 AGE_GROUP, 11 DOMAIN, 8
CEFR, 8 DIFFICULTY, and 1 SCHOOL_LEVEL records. Their working source records
remain available outside the canary. Provenance closure is preserved for every
record actually included.

The canonical `dataset.json` remains `DRAFT`. The canary preparation script
does not edit it or the human-owned reconciliation file.

## Runtime reconciliation and visibility

[`runtime-reconciliation-candidates-v2.json`](../../vocabflow-dataset/import/mappings/runtime-reconciliation-candidates-v2.json)
is generated analysis separate from
`runtime-reconciliation-v2.json`. It has eight Master Sense entries, each
`UNRESOLVED`, with no runtime candidate rows because there is no verified
read-only target. Lemma, Vietnamese, definition/example and Topic are listed
as possible later search signals only. They never establish identity or
select `MAP_EXISTING`.

For each Sense the artifact records unavailable, `null` values for learner
progress count, review-event count, `contentVersion`, effective Vietnamese,
Vietnamese override, image quarantine, enabled, `sourceDataset`, and
`sourceRecordId`. These values are unknown, not zero. No runtime row or history
was read or altered.

## Reconciliation checklist

- Vocabulary: choose existing ID or new ID; verify the runtime row has the
  same Sense meaning; check whether learner history belongs to that Sense;
  review `vietnamese_override` and image quarantine; approve ownership
  transfer policy. `MAP_EXISTING`, `CREATE_NEW`, and `SKIP` remain human choices.
- Topics: decide existing Topic ID or create; check slug collision, hierarchy
  loss in the flat runtime, and whether to include the optional classification
  branch.
- Learning Sets: decide existing Set ID or create; confirm the reviewed Set
  owns only the listed Master items and preserve unrelated links. For this
  subset, review the one `TECHNOLOGY_STARTER` item.
- Progress/reviews: inspect per-candidate references and effective content
  values only after a suitable read-only target is configured. No `UNRESOLVED`
  decision can be applied.

## Readiness gates

| Gate | Result | Evidence/blocker |
| --- | --- | --- |
| `BRIDGE_DB_INVARIANTS_READY` | `YES` | Drizzle composite keys/FKs, generated migration and offline regression tests are present. Migration remains unapplied. |
| `STAGING_TARGET_READY` | `NO` | No dedicated isolated staging target is configured. |
| `CANARY_CONTENT_REVIEW_READY` | `YES` | Deterministic owner review package exists; all decisions remain unchecked. |
| `CANARY_RELEASE_READY` | `NO` | Source Lexeme/Sense/Set records are in review; canonical manifest is DRAFT; no approved release hash exists. |
| `RUNTIME_RECONCILIATION_READY` | `NO` | No safe read-only target; all eight Sense decisions remain UNRESOLVED. |
| `MIGRATION_APPLY_READY` | `NO` | No target is selected and verified; no migration ran. |
| `PHASE_2E_STAGING_CANARY_READY` | `NO` | Required target, owner approval, approved subset release, complete reconciliation, and apply planning gates remain unmet. |

No remote database, branch, learner state, review event, media delivery, or
canonical/human-owned decision artifact was mutated.
