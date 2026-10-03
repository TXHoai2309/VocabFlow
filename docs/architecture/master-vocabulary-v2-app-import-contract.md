# Master Vocabulary V2 → App Import V2 Contract

**Status:** Phase 2C offline projection contract, superseded for current runtime import by Phase 2E.4A `app-import-v3` / `runtime-vocabulary-projection-v2`. This document does not authorize database import or alter the current runtime.

## Boundary and artifacts

The flow is `pinned Master V2 → Master validator → deterministic projection → reviewed future importer → runtime database`. The transform reads only paths named in `dataset.json` pins and verifies the pinned canonical hashes. It does not connect to Neon, allocate integer IDs, or mutate learner/review state.

The CLI is `pnpm transform:master-vocab-v2`. It defaults to `PREVIEW`; use `--preview` explicitly or `--release`. Optional `--dataset-root PATH` and `--output-dir PATH` select local paths. A successful run writes:

- `vocabulary-import-v2.json`: one learner-facing record per eligible Sense.
- `topics-import-v2.json`: flat App topic candidates with Master parent IDs retained as trace metadata.
- `topic-memberships-import-v2.json`: every eligible Sense→Topic assignment.
- `learning-sets-import-v2.json` and `learning-set-items-import-v2.json`: sets and ordered memberships by Master Sense.
- `mappings/master-app-map.json`: explicit unresolved Sense→app vocabulary mapping rows.
- `../reports/transform-report.md`: stable, timestamp-free run summary and lossiness report.

Every current JSON artifact declares `artifactVersion: app-import-v3`, source dataset/schema versions, source manifest status/hash, `mode`, and `importEligible`. Vocabulary rows retain `masterLexemeId`, `masterSenseId`, source revisions, `sourceDataset: VOCABFLOW_MASTER_V2`, `masterProjectionFingerprint`, projection semantics, and mapping state. An integer `appVocabularyId` is always `null` until a reviewed reconciliation records a real mapping. Master UUIDs are not written into the old integer `source_record_id`.

## Review and enablement

`PREVIEW` accepts structurally valid draft/review graphs, sets top-level `importEligible: false`, and forces every projected runtime row and Learning Set to `enabled: false`. These artifacts are architecture previews and cannot be treated as release input.

`RELEASE` requires a clean Master validator result and `dataset.json.status: APPROVED`. The current DRAFT pilot is rejected before output files are written. Release projection also fails if an otherwise eligible Sense lacks the required Vietnamese value. Approved output sets runtime `enabled: true`; the future importer still must review/reconcile the artifact and IDs before any write.

The current validator requires every pinned Lexeme, Sense, Classification,
Learning Set, and Relation in an `APPROVED` manifest to have status `APPROVED`;
its pinned taxonomy snapshot must also be `APPROVED`. An approved CEFR, Exam,
or School Level classification additionally needs source Provenance. The
Classification status vocabulary has no `EDITORIAL` status, so experimental
metadata cannot be relabeled to bypass those gates. A legitimate learner
content canary may omit nonessential Classification and taxonomy pins while
retaining their source records in the working DRAFT dataset. Omitting them
also omits their runtime projections: the proposed small canary therefore has
null legacy Topic and Level unless a separately reviewed and approved Topic
branch is included. Provenance validation remains required for included
content and is not weakened.

## Learner-facing selection

One selected Master Sense produces one vocabulary projection, even when its Lexeme has other senses or the Sense belongs to several Learning Sets. Stable ordering is Lexeme `displayOrder`, `normalizedLemma`, Lexeme ID, then Sense `senseOrder` and Sense ID.

- `word`: owning Lexeme `lemma`; language is retained for fingerprinting.
- `ipa`: preferred en-US Sense pronunciation override; otherwise preferred en-US Lexeme pronunciation; otherwise `null`. A selected Sense override does not fall back to Lexeme audio if that override has no safe media delivery.
- `vietnamese`: one eligible preferred Vietnamese Translation; ties resolve by `displayOrder`, then Translation ID. If none is preferred, the first eligible row by that order is used with a warning. No eligible Vietnamese Translation means the Sense is skipped; RELEASE fails if that occurs.
- `definitionEn` and `exampleEn`: eligible English rows by `displayOrder`, then entity ID; absent rows are `null`.
- `imageUrl` and `audioUrl`: only a pinned APPROVED asset version with matching byte hash and a matching `READY` HTTPS delivery without embedded credentials can supply a runtime URL. PLANNED, NOT_APPLICABLE, unpinned, unapproved, or undelivered media produces `null`. No URLs are fabricated.
- `enabled`: always false in PREVIEW; true only in an accepted RELEASE projection.

## Topic and level compatibility

The legacy `topic` string selects the sole primary active Topic when one exists. If no primary exists, it selects the most-specific active Topic by hierarchy depth, then Topic code and ID. Multiple primary rows use the same stable code/ID tie-break and emit a warning. The English Topic label becomes the runtime string. Every assignment also appears in the normalized membership artifact so that the legacy field does not erase membership data.

Current runtime Topics are flat. The separate topic artifact retains `masterParentTopicId`, but runtime parent/child semantics are not represented. Topic catalog rows and membership rows have unresolved `appTopicId`/`appVocabularyId` values until a future importer reconciles them.

Runtime vocabulary `level` is not CEFR. It remains `null` without an explicit active School Level attached to an active curriculum that is not marked `INTERNAL_DEMO`. A compatible grade number 1–5 maps to `GRADE_1`…`GRADE_5`. Grade 6–12, internal demo levels and unresolved levels remain `null` with a warning where a School Level was assigned. CEFR, difficulty, age group and exam tags never substitute for a runtime grade; `GENERAL` is not a fallback.

Learning Set `code` produces a deterministic lowercase hyphenated runtime slug. English name/description, sort order and ordered Sense memberships are retained. Runtime `grade` is `null` because the Master pilot does not define a compatible set-grade mapping. Reused Sense membership never creates another vocabulary row.

## Fingerprint and contentVersion

`masterProjectionFingerprint` hashes projected Master content and its semantic media identity. The plan's `appliedProjectionFingerprint` is a separate fingerprint of the resulting effective runtime projection; it accounts for preserved runtime enrichment, runtime override, and image quarantine and determines mapping no-op and contentVersion behavior.

For Master-supplied media, fingerprint identity is asset UUID + pinned version + full byte SHA-256 + whether a safe READY delivery is available. Provider URL/public ID, provider identifiers, prompt, reviewer, provenance, timestamps, filesystem paths and file ordering do not enter the Master media identity. A delivery URL change for the same asset/version/hash does not alter the fingerprint; moving between available and unavailable delivery state does. If Master is silent and a runtime URL is preserved, that effective URL is fingerprinted because there is no Master media identity for the retained enrichment. A quarantined image is hidden by the API and excluded from the effective fingerprint. Learning Set membership and Topic membership remain separate endpoint projections and do not affect a vocabulary row fingerprint.

`contentVersion` is deliberately not an integer in this artifact. Its state is `PENDING_RUNTIME_RECONCILIATION`; a future runtime materializer must compare the fingerprint with the last fingerprint applied to that app ID and set/increment `contentVersion` transactionally. This transform has no prior runtime state and cannot make that decision.

## Deliberate information loss and future work

The current DTO cannot represent CEFR, difficulty, age groups, Domain, Exam, POS, grammar/register/region notes, provenance, Vietnamese example translations, multiple translations, multiple pronunciations, hierarchical Topic behavior, detailed media rights/QA/provenance, curriculum metadata, or Learning Set editorial metadata beyond the projected English name/description. The report calls out these reductions and row-level compatibility cases.

Before runtime adoption, a separately reviewed phase needs explicit persistent Master UUID↔integer ID reconciliation, a durable fingerprint store and controlled write boundary, `contentVersion` derivation, topic/set identity collision policy, and a learner progress/review history policy for Sense-level migration. Existing integer IDs referenced by `learner_progress` or `review_events` must never be recycled. None of those runtime or database changes are part of Phase 2C.

That paragraph records the Phase 2C handoff. The later runtime bridge and
projection policy are documented below and in the runtime import contract;
they still do not authorize or perform a database APPLY.

## Phase 2E.4A runtime preservation rules

The serializer and plan use separate fingerprints: App Import v3 emits
`masterProjectionFingerprint`; the planner creates a v2 effective-projection
fingerprint for each runtime target. This separation allows the immutable 2.1.0
release content to be interpreted under the new policy without editing its
pinned Master records or release hash.

Concrete Master values are `SET`. Null/absent `ipa`, `imageUrl`, `audioUrl`,
legacy `topic`, and `level` are `PRESERVE` for mapped runtime rows and remain
null for CREATE_NEW. Master-authoritative `word`, Vietnamese base, definition,
example, and `enabled` are not generically merged with runtime values. A
non-null runtime definition/example paired with a silent Master null blocks
until a reviewed `clearFields` entry explicitly clears it. Missing required
Master fields block. `vietnameseOverride` and `imageQuarantined` remain separate
runtime controls with their existing explicit policies; source identity fields
are not projected.

The reconciliation artifact version is `runtime-reconciliation-v3`; only
nullable projected fields can appear in `clearFields`, and each listed field
must be null/absent in the Master projection. The planner previews `SET`,
`PRESERVE`, and `CLEAR` with before/raw/after values and exposes the resulting
API `effectiveProjection`. `contentVersion` starts at 1 for new rows and
increments once for mapped rows only when that effective projection changes.
A preservation-only mapping or fingerprint rebase leaves it unchanged. The
run ledger makes an exact release/reconciliation replay idempotent.
