# Phase 2D.2 — Owner approval, canary release, and staging readiness

**Status:** approval workflow and offline tooling prepared. Owner approval,
staging target, runtime snapshot, and reconciliation are still pending.

## Owner approval and release builder

`vocabflow-dataset/reports/canary-owner-approval-v2.json` is an explicit,
field-aware approval template. It starts with `PENDING` at release, Sense,
Lexeme, Learning Set, and Learning Set item levels. A Sense can enter the
canary only after the owner records a reviewer/date and approves POS,
Vietnamese translation, English definition/example, example translation,
pronunciation or its absence, and acceptance of null media URLs. Lexeme lemma,
lexical unit type, and pronunciation have separate review fields. Optional
Learning Set content and each item also have separate review fields.

`REQUEST_CHANGES` excludes that Sense from this canary; `EXCLUDE_FROM_CANARY`
also omits it. Any `PENDING` Sense blocks preparation. A release-level owner
approval is required for the selected snapshot. The tool checks the raw source
manifest hash, exact source revisions/hashes, and selected child IDs before
using decisions. It rejects a stale or incomplete artifact and never infers an
approval.

After explicit approval, run:

```powershell
pnpm dataset:prepare-canary-v2 -- --approval-file vocabflow-dataset/reports/canary-owner-approval-v2.json
```

The default output is `vocabflow-dataset/releases/canary-v2.1.0`. The builder
creates new Lexeme/Sense/Set revisions, keeps stable Master IDs, pins the
dependency-closed Provenance set, computes RFC 8785 record/release hashes,
validates the release, and runs the offline Phase 2C RELEASE transform. It
refuses to overwrite an existing workspace. Its reconciliation template is
generated and explicitly marked non-human-reviewed; the planner must reject it
until a verified runtime snapshot is reviewed and the human-owned file in that
workspace is completed. The root
`vocabflow-dataset/import/mappings/runtime-reconciliation-v2.json` is never
written by this workflow.

The proposed dataset version is **2.1.0 MINOR**: this is additive approved
content on the existing 2.x line. The existing `2.0.0` DRAFT remains intact;
the schema stays `2.0.1`. Semantic status changes create new entity revisions.
The release omits experimental Classification records and can run without a
taxonomy snapshot when it pins no Classification records. If a release pins
Classifications, the transform still requires exactly one pinned taxonomy.
Referenced PLANNED audio slots may be pinned for provenance/identity closure,
but no media versions are pinned, so runtime media URLs remain null.

No real owner approval artifact has been submitted. The checked-in approval
template is intentionally blank. The only approved-release build exercised so
far is a synthetic test fixture in a temporary directory, removed by the
test; it is not a project release.

## Read-only reconciliation

`vocabflow-dataset/import/mappings/runtime-reconciliation-candidates-v2.json`
is a no-target report for the eight proposed Senses. It lists the fields the
future scanner reports, including source IDs, base/override/effective
Vietnamese, image quarantine, URL fields, content version, learner-progress
and review-event reference counts, and field-level projection differences.
Because no verified staging target exists, it contains no runtime rows,
reports no search, leaves all eight decisions `UNRESOLVED`, and uses `null`
for unavailable runtime state. Null counts do not mean zero.

`scripts/master-vocabulary-v2-read-only-reconciliation-scan.ts` is a pure scan
over a snapshot supplied by a separately verified read-only adapter. It uses
exact normalized discovery signals, includes API-effective overrides and
quarantine behavior, displays history counts and projection drift, and always
leaves decisions `UNRESOLVED`. If one app ID is a candidate for multiple
Senses, it marks the candidate ambiguous; `bank` and `record` polysemy cannot
be auto-mapped. Topic slug collisions and Learning Set name/slug candidates
are also displayed without selecting an identity. No runtime snapshot was
provided or searched in this phase.

## Staging and migration gate

The configured targets remain `development`, `test` (`shared-ci`), and
`production`. There is no Neon staging project/branch identity. The target
configuration, environment enum, execution contexts, and database purpose
policy therefore remain unchanged. `test/shared-ci` is not staging.

The current `pnpm db:migrate` command has no staging target selector: local/CI
contexts route to development or shared CI, while production has a separate
release guard. Do not run it as a staging command. After the owner supplies a
dedicated branch identity, staging support must be added across target types,
pre-connect provider checks, post-connect server identity checks, execution
context, role purposes, planner allowlist, and run ledger before a dedicated
dry-run/apply command can be named. That command must verify project, branch,
database name, and server identity and use `vocabflow_migration` only for
migrations; import reads/writes use the specifically authorized runtime
purpose. Production authorization remains separate.

Migrations `0015` and `0016` are present in the local journal and linked
snapshot chain. They remain unapplied. No database target was connected, and
no migration, importer APPLY, learner-progress, review-event, assignment,
media, or remote operation was run.

## Readiness

```text
NODE_RUNTIME_READY = YES
OWNER_CONTENT_APPROVED = NO
CANARY_RELEASE_READY = NO
STAGING_TARGET_READY = NO
STAGING_MIGRATION_READY = NO
RUNTIME_SNAPSHOT_READY = NO
RUNTIME_RECONCILIATION_READY = NO
IMPORT_PLAN_CAN_APPLY = NO
PHASE_2E_STAGING_CANARY_READY = NO
```

Node was `v22.23.2`; pnpm was `11.17.0`. The focused approval/release,
read-only scanner, bridge-hardening, and Phase 2C transform tests pass. The
repository-wide check results and any unrelated Study UI failures are recorded
in the current handoff entry in `docs/ai-progress.md`.
