# VocabFlow Project Decisions

## Production owner publication — owner direction, 2026-10-30

Owner authorizes replacement of Production vocabulary with the selected
547/500/500packages and old Cloudinary vocabulary retirement, prioritizing
Production before Development. Verify provider identity and preserve source-
record runtime identity rather than assuming local IDs match. Preserve accounts,
settings/XP and retained-source progress; remove retired lexical references.

Use a separate honest OWNER_SELECTED_PUBLICATION projection and compatibility
view, leaving existing V2 content readable until the atomic content transaction.
Deploy compatible code first. Publish exact new media before switching data;
verify the live catalog before deleting inventoried backed-up old assets.
Keep shared Development assets until its deferred cutover and preserve unrelated
resources. Owner authorization does not manufacture independent Master PASS.
AGENTS13and immutable-main/CIrelease boundaries remain applicable; no fake clean
source/SHA/gates or silent manual deployment bypass. Current work is prepared,
not a completed Production cutover. [Evidence](plans/editorial-refresh-2026-10-28/owner-production-replacement-2026-10-30.md).

## Owner-selected catalog replacement — 2026-10-30

Explicit owner instruction supersedes reviewing the old catalog in place:
keep exactly the three Muse packages (547/500/500) and retire other local
vocabulary. Back up and rehearse restoration first. Retain the 905 referenced
runtime IDs/progress, allocate 642 local IDs above the previous maximum, rebuild
lexical collections and remove only retired lexical history. Preserve auth,
settings, foundation08/09, protected metadata and migration history. Historical
source/media packages remain immutable on disk.

Use a separate owner-local projection with OWNER_SELECTED_LOCAL review and
owner-attested media use, keeping WordNet/reused text attribution. Never write
fake canonical allocations or independent Master PASS. Explicit owner-local
mode requires exact Development markers and loopback DB. Hash-pinned media
runs in the local Node entry only. Guest catalog replacement uses a versioned
backup and Web Lock before pruning; offline failure must retain existing state.
No deployment/remote replacement or fresh generation is implied. See
[scope, counts and evidence](plans/editorial-refresh-2026-10-28/owner-local-catalog-replacement-2026-10-30.md).

## Dedicated local editorial preview — 2026-10-29

Owner authorized ticket07 after accepting the media gallery. Use a reversible
source-provenance namespace in the existing development projection for this
bounded30-Sense pilot, retaining source columns and existing progress identity.
The original source hash and separate integration-plan hash remain distinct.
Only matching source hashes in vocabflow_dev enable the local presentation;
Node development alone serves its hash-pinned media. This is not the future
canonical placement/variant model or commercial media acceptance. Same Sense
uses one presentation across these local sets; per-collection variants need a
separate model.05/06 final gates and08–15 remain open. See
[ticket07 contract/evidence](plans/editorial-refresh-2026-10-28/ticket-07-local-pilot.md).


## Whole-corpus editorial campaign — accepted scope (recorded 2026-10-29)

The owner accepted reviewing the entire corpus, retaining correct material and
selectively correcting errors/missing fields rather than rewriting everything.
The expansion planning target is approximately 600 genuinely new words/lexical
phrases, with a 500–800 envelope after duplicate/sense checks, plus approximately
25–35 additional curated learning sets using suitable existing and new Senses.
This is not an assertion that 600 exact missing entries have been identified.

The owner requested installing to-tickets into the repo; the original 1.3.1
skill was copied unchanged. The [campaign analysis](plans/editorial-refresh-2026-10-28/README.md)
records a draft coordination contract. The owner subsequently approved the
15-ticket breakdown/blocking edges and selected local Markdown publication on
29 October. Tickets are published one file each with status `planned`; this
approval explicitly does not start implementation. The tracker is configured
for this campaign only. Voice/image/provider, implementation contracts,
generation spend and content publication remain separate decisions.
No application schema, runtime content, learner history or release changed.

The owner then explicitly requested “giờ làm 01 trước”. This authorizes only
the read-only local/offline baseline and filesystem handoff of ticket 01.
It does not extend execution to 02–15 or authorize DB writes/provider calls.
The [completed baseline report](plans/editorial-refresh-2026-10-28/ticket-01-baseline.md)
records the selected immutable checkpoint, ID/source/media crosswalk and known
limits. Existing identity policy remains: keep runtime IDs, leave unverified
Master mappings pending, and do not assign canonical identities from words/hashes.

The owner subsequently requested tickets02 and03 together. This authorizes the
recoverable local schema compatibility work, including existing reviewed
migrations0019–0021 through the trusted executor, and the bounded mock-only
manifest/receipt canary. Both are complete; no remote operation, provider call,
new vocabulary/media, pilot authoring or content activation followed from this
authorization. Production provider/voice/style/item/rights decisions remain
separate. See [02 evidence](plans/editorial-refresh-2026-10-28/ticket-02-local-preview.md)
and [03 evidence](plans/editorial-refresh-2026-10-28/ticket-03-manifest-canary.md).

The subsequent continuation request authorizes the next frontier04: offline
pilot curation and source-bound child presentations, with independent draft
review and media preflight. [04](plans/editorial-refresh-2026-10-28/ticket-04-frozen-pilot.md)
is complete. Its four themes are draft collection groups, not a decision to
mint canonical topics or infer grades from CEFR. Existing source Sense/runtime
identities and examples remain intact; new sentences use draft references until
canonical Example creation is reviewed. This does not select a provider/voice,
authorize05/06 generation, approve content for publication or clear new assets.

## Content reuse and school placements — owner decisions (2026-10-28)

The owner accepted reusing suitable existing Senses and authoring missing
content, with letters/letter names/basic sounds treated as separate introductory
content rather than English articles. The owner also accepted one Sense across
multiple school grades/sets with shared identity and progress; child-appropriate
wording/examples are curated in the pedagogical context. See ADR-0002 and the
[local-only audit](audits/local-content-audit-2026-10-28/README.md).
No generated-content activation, provider spend, database migration or history
rewrite is authorized by these decisions.

The owner subsequently explicitly confirmed these nine learner-facing levels:
Làm quen chữ và âm; Từ đầu tiên; Câu đầu tiên; Sơ cấp (A1); Cơ bản (A2);
Trung cấp (B1); Trên trung cấp (B2); Nâng cao (C1); Chuyên sâu (C2).
Unclassified is a separate state. The three introductory groups require curated
content and are not automatic Pre-A1/unknown-CEFR mappings. School grade remains
supplementary. This supersedes the earlier four/seven-level and grade-primary
proposals. The first discovery implementation is bounded by US-63; unpopulated
introductory options stay honestly unavailable until a reviewed authoring model
exists. There is no mandatory progression lock or proficiency assessment.

## Learning experience improvement — owner decisions (2026-10-21)

Owner explicitly accepted all three proposed choices after the source audit.

- Keep the app for all ages. Prioritize phase 1: consistent All scope across
  guest/account, preserve grade/topic constraints into study, reduce redundant
  reads and simplify vocabulary/topic presentation. Display preferences and
  curated pathways follow in phases 2 and 3.
- Curate content suitable for grades 1–2 without claiming alignment to a named
  textbook. CEFR, school grade and topic remain independent. Do not assign
  grade 1 automatically from A1.
- Default flashcard presentation is Self Recall (Tự nhớ): hide meaning
  before flip, then show meaning and one example. Easy Introduction can show
  the Vietnamese meaning immediately. Display preferences belong to each
  learner profile; guest preferences remain device-local.
- The owner explicitly reprioritized phase 2 after US-59's local implementation;
  US-60 implements the three display choices. US-59 owner check and migration
  rollout remain pending. No production deployment or content operation is
  authorized by this decision. Topic inference visibility and parent-topic
  inclusion behavior were subsequently resolved below.

- Owner accepted Q5: parent topic selection includes enabled descendants,
  intersects the chosen school level and never counts a word twice.
- Owner accepted Q4: only canonical topics belong in main discovery. Inferred
  labels remain review evidence; removing them from discovery never deletes
  words or meanings and unclassified words remain in the broad catalog.
- Shared understanding for phases 1 and 2 is complete; implementation proceeds
  under US-59 and US-60 respectively. Curricular content remains phase 3.

References: `learning-experience-audit-2026-10-21.md` and root `GLOSSARY.md`.

## US-58 decision — Public learning with isolated device persistence (2026-10-19)

Owner-authorized parity correction: use all enabled dataset words for guest
default/Pathway/All, like authenticated V2 queues. Do not require CEFR or set
membership to study enabled content. Explicit collection scopes remain narrow.
The deployed 594 words outside enabled sets need no database backfill to learn.

Correction authorized by the owner after the deployed loading audit: separate
lightweight public scheduling metadata from bounded word details/pages. Pure
local resources cannot require catalog fetches. Public media/authorization
boundaries and the existing storage format stay intact. New source totals,
today's allowance and session candidate counts have separate DTO meanings.
Publish the correction to the same TXH/dev/main branches requested in-session.

Owner authority: explicit request in the current chat to open initial-phase
learning to everyone, recommend accounts, and store guest data in localStorage.
This reprioritizes US-58 and overrides historical account-required entry and
server-only guest persistence restrictions. Keep all account security boundaries.
Expose enabled content only; apply the existing deployed media policy. Guests
reuse SRS rules locally and advance only after a durable, serialized browser save.
Keep guest history separate from account history; automatic merging needs a
future import contract. Do not silently claim signup migrated guest progress.


## DEC-032 — Owner-attested V2 public media and release

- Status: ACCEPTED by explicit owner instruction on 2026-10-18.
- The owner attests that the APKG image/audio collection incorporated into
  VocabFlow V2 may be used and publicly displayed on VocabFlow. Record this as
  `OWNER_ATTESTED_FOR_PUBLIC_DISPLAY`, separately from formal third-party
  license evidence. Do not mark source licenses verified or change Neon
  `rights_status` values from `UNKNOWN_REVIEW_REQUIRED`.
- Public runtime scope is limited to one valid, current V2 `PASS`/`DRAFT`
  projection, one unique non-ambiguous mapping, an exact pronunciation match
  for word audio, and a signed Cloudinary URL in the V2 media namespace. Example
  audio requires an accepted mapping with the same stable `exampleKey` on the
  current Sense. V1, unrelated, ambiguous, mismatched, and unmapped media stay
  excluded. Authorization never changes mapping review states.
- Runtime authorization is an explicit, non-secret Vercel environment value
  matching the attestation ID in
  [the owner attestation record](rights/v2-apkg-public-media-owner-attestation-2026-10-18.md).
  Missing or mismatched values keep public V2 media withheld.
- For this owner-directed release, Vercel Git deployment from `main` is enabled
  so the Preview-verified release commit can create a Production deployment.
  This overrides the earlier `main`-disabled release setting. The setting also
  enables later `main` pushes to deploy automatically unless the owner changes
  it.
- No Neon vocabulary/content, review, learner history, Cloudinary asset, or V1
  resource is modified by this decision.

## DEC-031 — V1 test-data disposition for V2 cutover

- Status: ACCEPTED by explicit owner instruction on 2026-10-18; supersedes the earlier Vercel cutover preparation status where V1 backup or account continuity was described as a prerequisite.
- Discard V1 test users, accounts, sessions, progress, and review history during the future V2 cutover. The owner waives a V1 backup; do not retry SQL access after PostgreSQL 53000.
- This decision does not authorize deletion of the V1 Neon database, Cloudinary V1 assets, or Production resources.
- V2 Production starts without copied test auth or learner-history rows; users register through Better Auth.
- Rollback to the former Vercel deployment is available as a code action, but V1 database service availability remains unknown while its project is quota-blocked. Do not claim a complete data rollback.

## Mixed Study allocation and bounded candidates (2026-10-08)

Owner approved a Mixed bug fix: frontend selectStudyQueue owns deterministic
ceil(N/2) DUE / floor(N/2) NEW allocation, filling shortages from NEW then DUE.
Backend remains a canonical candidate provider with optional per-type capacity
5/10/20/30; omitted capacity preserves 20 DUE/10 NEW. Setup and Study share the
allocator; daily New eligibility and final atomic review checks stay canonical.
Saved-all/Weak keep their policy. See [US-54](stories/US-54-study-source-picker.md).

## Study scope is independent of assignment (2026-10-08)

Owner approved US-54's compact Pathway/Custom/All source choice. Queue scope
belongs to the session, not learner_learning_sets. All unions enabled sets;
Custom unions selected enabled sets. Pathway picks the earliest sort_order / ID
set with sparse NEW and keeps Due from previously studied enabled-set words.
Membership must precede database limits. The daily allowance and atomic review
write remain authoritative. Preferences contain account-scoped source/IDs only.
This decision adds no schema, migration or Dataset change. Existing unscoped
queue and Topic assignment-access semantics remain. See
[US-54](stories/US-54-study-source-picker.md).


## Single-account learning baseline (2026-10-07)

This owner-approved baseline supersedes the earlier learner-management flow and
all historical create/select/switch instructions below.

- USER_MODEL: 1 authenticated account = 1 learning identity in the UX.
- INTERNAL_MODEL: learner_profile, household/membership, learner_id foreign keys
  and learner-scoped APIs remain for compatibility.
- MULTI_LEARNER_LEGACY: all existing profiles and their progress, reviews,
  saved words and settings remain intact; only one canonical ID is used in UI.
- CANONICAL_RESOLUTION: valid same-user legacy stored ID present and enabled in
  the canonical API list wins; otherwise earliest enabled createdAt, then ID.
  Persist the canonical DTO under vocabflow.activeLearner.v1 scoped by userId.
- FUTURE_MULTI_PROFILE: schema intentionally retained; no unique constraint,
  migration, cleanup, delete, disable, merge or learner-data reassignment.
- LOGOUT: supported through Better Auth signOut; clear internal storage only
  on success, then replace navigation with /login. Failure preserves the app
  and storage and displays “Không thể đăng xuất. Vui lòng thử lại.”

The frontend preserves the legacy account-scoped canonical choice to avoid
silently changing existing learning history. Automatic resolution belongs in
the authenticated provider, with stale async results invalidated on identity
changes/unmount/logout and duplicate pending operations shared. Only internal
provisioning invokes POST /api/learners; user-facing create controls are removed.
Authorization remains session → household membership → learner household.
No database operation or deployment is authorized by this product decision.


## Legacy candidate identity precedence — Phase 2G.3A.1 (2026-10-07)

The explicit owner correction requires finalized reconciliation to outrank
candidate heuristics. A runtime candidate reviewed for a Master Sense whose
final decision is CREATE_NEW becomes an excluded runtime/Sense pair:
OWNER_REVIEWED_NOT_SAME_IDENTITY, identityClaim NONE, no automatic mapping.
The analysis-only proposal supplies candidate IDs and semantic evidence; the
human-reviewed final reconciliation supplies authority. Exclusions are derived
from pinned immutable inputs and cannot be overridden by exact lemma,
existing-runtime, alias or translation similarity. They do not exclude other
Master Senses for the runtime row. This changes offline analysis only and
authorizes no database operation.

These decisions are accepted baselines. Revisit one only when the stated
evidence condition is met and the affected source document is updated.

## DEC-001 — Family MVP supersedes Personal MVP

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The product pivoted from a personal, local-only experiment to a
  family web application.
- Decision: Family MVP v1.0 is the current product source of truth. Personal
  MVP v0.2.1 is archived/superseded.
- Consequences: Personal-only persistence, no-auth and no-cloud assumptions
  cannot override Family MVP requirements.
- Evidence/source: [Product Specification](product/product-spec.md#2--pivot-từ-personal--family)
- Revisit only if: The product owner approves a new product baseline.

## DEC-002 — Parent account is the authentication boundary

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Family MVP needs one account to manage a household and its learners.
- Decision: Parents authenticate; learners are profiles without independent
  email/password or PIN authentication in this MVP.
- Consequences: Learner-scoped authorization must resolve session user →
  household membership → learner household.
- Evidence/source: [Product Specification](product/product-spec.md#1--mục-tiêu-persona--phạm-vi),
  [Technical Architecture](architecture/technical-architecture.md#6-authentication-household-bootstrap--authorization)
- Revisit only if: A new learner security boundary is accepted as product scope.

## DEC-003 — PostgreSQL is the canonical runtime source of truth

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Progress must survive reload, logout/login and multiple devices.
- Decision: Neon PostgreSQL is canonical for account, household, learner,
  vocabulary runtime content, progress and review history. Local storage is
  cache/snapshot only.
- Consequences: Successful review means server-confirmed persistence.
- Evidence/source: [Product Specification](product/product-spec.md#6--content-persistence--progress-semantics),
  [Technical Architecture](architecture/technical-architecture.md#5-data-architecture)
- Revisit only if: A validated persistence architecture change is approved.

## DEC-004 — Frozen implementation stack

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The implementation baseline must not reopen stack choices during a
  vertical slice.
- Decision: React/Vite/TypeScript SPA, Hono API on Vercel Functions, Neon PostgreSQL, Drizzle,
  Better Auth and Zod are the pinned stack.
- Consequences: Framework/provider changes require a demonstrated blocker spike.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#2-frozen-technology-stack),
  `package.json`
- Revisit only if: A blocker is demonstrated by a focused spike/test.

## DEC-005 — Same-origin web and API boundary

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Cookie/session and deployment behavior should remain simple.
- Decision: React/Vite static assets and Hono `/api/*` run under the same origin.
- Consequences: Web code never connects directly to Neon.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#31-same-origin-routing),
  `vercel.json`, `api/[...route].ts`, `apps/api/src/index.ts`
- Revisit only if: Deployment constraints make same-origin impossible.

## DEC-006 — Dedicated schema boundaries

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Application objects, protected identity metadata and migration
  metadata require different ownership and reset policies.
- Decision: Use `vocabflow_app` for application tables, `vocabflow_meta` for
  protected identity metadata, and `drizzle` for migration metadata.
- Consequences: Application reset preserves protected metadata and schemas.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#5-data-architecture),
  [BATCH 0 Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md),
  `config/database-reset-policy.ts`, `apps/api/src/db/schema.ts`
- Revisit only if: A migration/reset contract explicitly changes.

## DEC-007 — Least-privilege database roles

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Bootstrap, identity provisioning, migration and runtime have
  different trust boundaries.
- Decision: Keep the frozen role model and protected metadata permissions from
  BATCH 0; application roles receive no broad database CREATE privilege.
- Consequences: Bootstrap is one-shot infrastructure work; normal migrations
  use the approved migration role.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#13-security-privacy--operational-safety),
  [BATCH 0 Execution Specification](implementation/batch0-foundation-execution-spec.md)
- Revisit only if: A proven PostgreSQL/Neon blocker or explicit security review
  requires a role-model change.

## DEC-008 — PostgreSQL 18 automatic membership is accepted

- Status: ACCEPTED
- Date: 2026-09-07
- Context: PostgreSQL 18 may retain an administrative membership when a
  non-superuser CREATEROLE role creates application roles.
- Decision: ADMIN-only automatic membership is acceptable when
  `admin=true`, `set=false`, `inherit=false`; effective SET/INHERIT access is
  forbidden.
- Consequences: Assertions inspect membership options, not row count alone.
- Evidence/source: commit `46d84f1` (Align bootstrap memberships with
  PostgreSQL 18), [BATCH 0 Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md)
- Revisit only if: PostgreSQL changes the behavior or a security test fails.

## DEC-009 — Least-privilege migration executor

- Status: ACCEPTED
- Date: 2026-09-08
- Context: Built-in Drizzle PostgreSQL migration creates the `drizzle` schema,
  which violates the migration role's no-database-CREATE contract.
- Decision: Use the repository executor that reads Drizzle migration files and
  maintains compatible `drizzle.__drizzle_migrations` history without issuing
  `CREATE SCHEMA`.
- Consequences: Bootstrap owns schema creation; migration validates existing
  infrastructure before applying artifacts.
- Evidence/source: commit `2429b0f`,
  `scripts/db-migration-executor.ts`,
  [Technical Architecture](architecture/technical-architecture.md#13-security-privacy--operational-safety)
- Revisit only if: Installed Drizzle metadata semantics change or executor
  compatibility tests fail.

## DEC-010 — No CREATE ON DATABASE for application roles

- Status: ACCEPTED
- Date: 2026-09-08
- Context: Schema administration belongs to bootstrap; application roles need
  only their schema-level rights.
- Decision: Do not grant database-level CREATE to migration, provision or
  runtime roles.
- Consequences: Application schema must already exist before normal migration.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#13-security-privacy--operational-safety),
  [BATCH 0 Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md)
- Revisit only if: A reviewed database-permission design replaces the current
  schema ownership model.

## DEC-011 — BATCH 0 is accepted and frozen

- Status: ACCEPTED
- Date: 2026-09-08
- Context: Core CI and Trusted DB Integration passed on Neon PostgreSQL 18.
- Decision: Stop debugging Foundation and begin work through explicit BATCH 1
  story contracts.
- Consequences: Do not alter bootstrap, role model, schemas, reset policy,
  migration executor or CI without a proven regression.
- Evidence/source: [BATCH 0 Foundation Acceptance](implementation/BATCH0_FOUNDATION_ACCEPTANCE.md),
  commit `24e4580`
- Revisit only if: A reproducible regression or approved new requirement exists.

## DEC-012 — No offline write queue in Family MVP

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The MVP prioritizes server-authoritative progress and a small
  vertical slice.
- Decision: IndexedDB may cache read data, but offline review writes and full
  conflict-resolution sync are out of scope.
- Consequences: Failed review saves show retry/error behavior; they are not
  silently queued.
- Evidence/source: [Product Specification](product/product-spec.md#3--core-learning-loop--session-rules),
  [Technical Architecture](architecture/technical-architecture.md#11-client-state--cache-policy)
- Revisit only if: Offline behavior becomes an explicitly validated product
  requirement.

## DEC-013 — Review writes are server-authoritative and idempotent

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Double-click, retry and concurrent requests must not create duplicate
  progress transitions.
- Decision: The backend authenticates and authorizes, computes scheduler state,
  and atomically persists progress plus review event using `reviewId` and
  `expectedRevision` safeguards.
- Consequences: The client advances only after server confirmation.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#9-review-write-architecture),
  [Product Specification](product/product-spec.md#6--content-persistence--progress-semantics)
- Revisit only if: A proven atomic-write limitation requires a reviewed design
  change.

## DEC-014 — US-01 registration includes household bootstrap

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: A parent account is not useful for Family MVP until its canonical
  default household is resolved.
- Decision: US-01 success is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved. Signup success
  alone is not the completed Family registration boundary.
- Consequences: Bootstrap failure preserves authenticated state and exposes safe
  retry/recovery; the idempotent/race-safe bootstrap contract is reused. Learner
  creation remains out of scope for US-01. T01-04 may add only the minimal
  additive `vocabflow_app.households` and `vocabflow_app.household_members`
  application migration required for canonical bootstrap; BATCH 0 database
  infrastructure remains frozen.
- Evidence/source: [Product Specification](product/product-spec.md#8--acceptance-validation--freeze),
  [Technical Architecture](architecture/technical-architecture.md#62-household-bootstrap-flow),
  [User Flow](flow/user-flow.md#2-luồng-parent--learner),
  [US-01 contract](stories/US-01-parent-registration.md)
- Revisit only if: The product owner explicitly changes the Family registration
  boundary or a validated implementation blocker requires a new contract.

## DEC-015 — US-01 registration collects parent display name

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: Better Auth 1.7.3 `signUp.email` requires `name`, while the Phase 1
  Register contract previously collected only email and password.
- Decision: US-01 explicitly collects `name`, `email` and `password`. `name` is
  the parent's persisted display/profile identity; it is trimmed at the form
  boundary and passed directly to Better Auth. No fake constant, email-derived
  value or hidden generated name is allowed.
- Consequences: Learner profile naming and learner creation remain a later
  story. Household name remains server-owned by the bootstrap contract. This
  is a contract/UI clarification only and adds no learner or database schema.
- Evidence/source: Better Auth 1.7.3 signup runtime/type contract,
  [Feature UI Specification](design/feature-ui-spec.md#2--authentication),
  [US-01 contract](stories/US-01-parent-registration.md)
- Revisit only if: Better Auth is upgraded or the product owner explicitly
  changes the parent registration identity contract.

## DEC-016 — Server-owned default household name for US-01 bootstrap

- Status: ACCEPTED
- Date: Recorded 2026-09-08
- Context: The first Family registration must resolve one canonical household,
  while learner naming and household customization are outside US-01.
- Decision: `POST /api/bootstrap` uses the neutral server-owned default name
  `Gia đình VocabFlow`; it never derives a household name from email or parent
  display name and never accepts a client-supplied owner id. The household and
  `OWNER` membership are resolved in one idempotent write keyed by the unique
  primary owner.
- Consequences: Signup success alone is not the Family registration boundary;
  a bootstrap failure stays recoverable without a second signup. Household
  naming customization can be introduced by a later reviewed story.
- Evidence/source: `apps/api/src/bootstrap.ts`,
  `apps/api/src/index.ts`, [US-01 contract](stories/US-01-parent-registration.md)
- Revisit only if: The product owner adds a household naming requirement or a
  proven persistence constraint requires a new contract.

## DEC-017 — Vercel is the V1.0 production hosting target

- Status: ACCEPTED
- Date: 2026-09-27
- Context: The owner changed the V1.0 hosting decision from Cloudflare to Vercel
  while keeping the existing React/Vite, Hono, Neon, Better Auth and Cloudinary
  architecture.
- Decision: Serve the Vite SPA as static output and run the existing Hono API as
  a same-origin Vercel Function. Do not migrate to Next.js or duplicate API
  routes/domain logic.
- Consequences: Vercel Preview auth trusts only the exact current
  `VERCEL_URL`; Preview requires development markers and must not use production
  credentials. Production uses the owner-selected canonical HTTPS
  `BETTER_AUTH_URL`. Cloudflare deployment configuration is no longer the V1.0
  production path.
- Follow-up: the manual normal-release operation mode recorded here is
  superseded by DEC-018; the Vercel hosting target and runtime boundaries are
  unchanged.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#3-system-context--deployment-topology),
  [V1.0.0 Release Runbook](releases/v1.0.0-release-runbook.md), `vercel.json`,
  `api/[...route].ts`, `apps/api/src/auth-production-config.ts`
- Revisit only if: The owner explicitly changes the V1.0 hosting target or a
  focused deployment spike proves Vercel cannot satisfy the accepted boundary.

## DEC-018 — Protected GitHub Actions production release pipeline

- Status: ACCEPTED
- Date: 2026-10-01
- Context: Manual production migration/deploy steps are easy to run against a
  different commit or in the wrong order; a migration failure must prevent the
  matching app deploy.
- Decision: A completed, successful `Core CI` push run for `main` in
  `TXHoai2309/VocabFlow` triggers `Production Release`. The release checks out
  and verifies that run's immutable `head_sha`, performs read-only production
  DB preflight and migration planning, applies only guarded forward-only
  migrations with the migration role and exact canonical confirmations, then
  deploys the same SHA via `pnpm deploy:production`. Any failed DB step stops
  before deployment. The workflow uses a serialized concurrency group and the
  GitHub Environment `production`; that environment must be configured with
  required reviewers and a `main` deployment-branch rule before its credentials
  are provisioned. Production DB/Vercel credentials must exist only in that
  Environment, not as repository- or organization-level secrets. Vercel Git
  integration must not independently auto-deploy Production.
- Boundaries: the workflow never bootstraps/resets Production, imports the
  vocabulary catalog, applies US-41 curation, or uses Trusted DB test
  credentials. `trusted-db.yml` remains a separate `ci-test` / `shared-ci`
  workflow. First-time bootstrap and owner-reviewed content operations remain
  separate operator procedures.
- Evidence/source: [Technical Architecture](architecture/technical-architecture.md#15-cicd--environment-strategy),
  [Production Release Runbook](releases/v1.0.0-release-runbook.md),
  `.github/workflows/production-release.yml`,
  `scripts/production-release-safety.ts`.
- Revisit only if: A release-safety review finds a concrete workflow or
  provider limitation, or the owner explicitly changes the approved release
  boundary.

## DEC-019 — Reproducible Master Vocabulary V2 release snapshots

- Status: ACCEPTED
- Date: 2026-10-02
- Context: An immutable dataset release cannot be reconstructed from stable
  Lexeme/Sense IDs alone after those records or their supporting catalogs,
  sets, and media have changed.
- Decision: A Dataset Release pins exact Lexeme, Sense, Classification,
  Learning Set, taxonomy snapshot, Relation, media slot/version, and immutable
  Provenance artifacts using their IDs, revisions/versions, package-relative
  record paths, and SHA-256 content hashes. Historical reconstruction must
  resolve the recorded pins and never use the latest revision. `releaseHash`
  uses `sha256-canonical-json-v1` over JCS canonical manifest bytes excluding
  the hash field itself. Pronunciations have exactly one owner
  (`masterLexemeId` XOR `masterSenseId`); classifications use `valueCode` for
  controlled scalar values, `valueRef` for entity-backed dimensions, and
  `numericValue` plus `scaleId` for difficulty. Lexeme/Sense revisions include
  the approved semantic child state they own; Classification and Relation
  assignments have independent revisions.
- Consequences: Draft 2020-12 schemas validate document-local shapes; the
  Phase 2A validator now checks reference closure, pinned artifact/hash
  resolution, graph and scoped uniqueness rules, media target compatibility,
  and approved release invariants. Historical revision monotonicity and
  append-only storage checks still require revision history or a governed
  authoring store. This decision does not alter app runtime contracts or
  database schema.
- Evidence/source: `docs/architecture/master-vocabulary-v2-data-dictionary.md`,
  `docs/architecture/master-vocabulary-v2-identity-versioning-policy.md`,
  `docs/architecture/master-vocabulary-v2-taxonomy-contract.md`,
  `vocabflow-dataset/README.md`
- Revisit only if: The owner changes the release reproducibility, identity,
  classification representation, or canonical hash contract.

## DEC-020 — Additive Master Vocabulary V2 runtime identity bridge

- Status: ACCEPTED
- Date: 2026-10-02
- Context: Phase 2C can produce deterministic Master-to-App projections but
  does not know whether a Master Sense owns an existing learner-history ID or
  should receive a new runtime integer. Runtime APIs also expose a Vietnamese
  override and image quarantine that can make stored vocabulary columns differ
  from their effective learner-facing values.
- Decision: Preserve `vocabularies.id` and create additive identity,
  fingerprint, import-run, Topic/Set mapping, and membership ownership tables.
  Identity adoption comes only from a separate human-reviewed reconciliation
  artifact; never infer it from lemma, labels, order, or taxonomy. The default
  importer is offline dry-run. Apply requires an approved eligible release,
  complete reconciliation, explicit first-adoption/override policies, verified
  target identity, an unchanged transaction-locked plan, and atomic projection
  plus fingerprint persistence. No automatic catalog cleanup or learner Set
  assignment is allowed.
- Consequences: Existing app integer IDs remain attached to
  `learner_progress`, `review_events`, and runtime membership. A new Sense gets
  its generated ID only inside the transaction and begins at
  `contentVersion = 1`; changed projections derive a one-step version increase.
  The migration is additive and remains unapplied until the staging phase. The
  current DRAFT pilot cannot be applied.
- Evidence/source: [Runtime Import Contract](architecture/master-vocabulary-v2-runtime-import-contract.md),
  [App Import V2 projection contract](architecture/master-vocabulary-v2-app-import-contract.md),
  `scripts/master-vocabulary-v2-import-planner.ts`,
  `scripts/master-vocabulary-v2-import-store.ts`,
  `drizzle/migrations/0015_clean_yellowjacket.sql`.
- Revisit only if: the projection contract, history-preservation guarantees,
  runtime identity model, or explicit ownership policy changes.

## DEC-021 — Learner-owned saved vocabulary

- Status: ACCEPTED
- Date: 2026-10-02
- Context: The owner explicitly reprioritized Feature #8 after the earlier
  vocabulary UI baseline had deferred favorites. Saved state must survive
  reloads, remain isolated by active learner, and constrain study selection.
- Decision: Persist only the `(learner_id, vocabulary_id, created_at)` relation
  in an additive table with a composite primary key and foreign keys to the
  learner and runtime vocabulary. Expose authenticated learner-scoped list,
  idempotent POST save, and idempotent DELETE unsave routes. Catalog, Detail
  and Saved Words read state from that relation. The normal saved study queue
  applies membership in SQL before New/Due selection and retains existing mode
  semantics. A separate explicit all-saved intent returns the learner's full
  enabled saved collection. Not-due LEARNING/MASTERED items are classified as
  VOLUNTARY practice, never as due Review; writes still use the canonical
  revision-checked review API and scheduler. Existing daily-New limits remain.
- Consequences: Vocabulary content remains canonical in `vocabularies`; saved
  state is not copied into client storage or Master Vocabulary Dataset V2.
  `/saved` is the single Saved Words route; its search and filters are
  URL-backed. Saved membership is separate from SRS eligibility. The feature
  does not change active-set assignment, introduce progress resets, bypass
  canonical review-history writes, or change content authoring.
- Evidence/source: [US-46 Saved Vocabulary](stories/US-46-saved-vocabulary.md),
  [Feature UI Specification](design/feature-ui-spec.md#71e-saved-vocabulary-us-46),
  migration `drizzle/migrations/0017_nosy_hellfire_club.sql`.
- Revisit only if: the owner changes learner ownership, saved queue semantics,
  or the runtime vocabulary identity boundary.

## DEC-022 — Collection Continue and session persistence

- Status: ACCEPTED
- Date: 2026-10-03
- Context: Home's previous “Tiếp tục học” block showed the first item in the
  current review queue, while Study queue/index and selected mode exist only
  during the current React session. The runtime has no persisted incomplete
  Study session entity or API.
- Decision: Continue Learning selects one learner-authorized, partially learned
  Topic, active assigned Learning Set, or Saved collection. A collection is
  eligible only when `0 < learnedCount < totalCount`. Topic membership is
  intersected with enabled vocabulary in the learner's active assigned Sets,
  matching the Topic scope Study Setup can actually queue. Rank by the latest
  actual `review_events.reviewed_at`; this is only a vocabulary-level activity
  heuristic because collection provenance is not persisted. Ties and missing
  timestamps use deterministic Set → Topic → Saved, collection sort order, then
  ID. Continue navigates to Study Setup with the exact collection scope. Do not
  create fake session/source resume using browser storage; omit mode unless a
  future persisted source is introduced.
- Consequences: Home needs one compact read-only aggregate summary. Progress is
  calculated from the selected collection's own members and learner statuses.
  Exact question/queue or collection-origin resume stays unsupported and can be
  reconsidered only alongside an accepted session persistence model that
  persists collection provenance.
- Evidence/source: [US-47 Continue Learning](stories/US-47-continue-learning.md),
  [Feature UI Specification](design/feature-ui-spec.md#continue-learning-card-us-47),
  `apps/api/src/continue-learning.ts`, and the runtime Study state in
  `apps/web/src/features/study/study-page.tsx`.
- Revisit only if: a canonical persisted Study session becomes part of the
  runtime architecture or the owner changes candidate priority.

## DEC-023 — Separate daily new and review goals

- Status: ACCEPTED
- Date: 2026-10-04
- Context: Feature #10 needs learner-configurable daily targets for newly
  learned and reviewed vocabulary. The existing `daily_learning_goal` is one
  aggregate unique-review threshold, while `daily_new_word_limit` is a scheduler
  hard cap for NEW admission and due review is exempt.
- Decision: Add learner-scoped `daily_new_word_goal` (default 10) and
  `daily_review_word_goal` (default 20), each constrained to 1–100. Derive daily
  category counts from distinct vocabulary IDs in persisted `review_events` for
  the household-local `review_date`: NEW-to-non-NEW transitions count toward
  new; events whose previous status was non-NEW count toward review. Overall
  progress combines both targets and completes only when both are met. Keep the
  scheduler hard cap and streak date/definition unchanged. Retain the legacy
  `daily_learning_goal` column without backfill, removal or active threshold use.
  Migration 0018 is additive and must be applied separately by an authorized
  development/test migration workflow; this implementation does not apply it.
- Consequences: Settings and activity-summary remain learner-scoped and
  household-authorized; daily goal display and DAILY_GOAL XP use the same
  category semantics. No client counter or mutable completion state is added.
- Evidence/source: [US-35 Daily Learning Goal](stories/US-35-daily-learning-goal.md),
  [Feature UI Specification](design/feature-ui-spec.md#71d-daily-learning-goal-and-streak-us-35--us-36),
  `drizzle/migrations/0018_panoramic_spirit.sql`.
- Revisit only if: the owner changes category semantics, defaults, or the
  scheduler's separate NEW admission cap.

## DEC-024 — Weak-word classification and study scope

- Status: ACCEPTED by the explicit Feature #12 implementation request.
- Date: 2026-10-04.
- Context: Learners need an actionable, truthful attention list without
  invented weakness scores, duplicated scheduler state, or arbitrary client
  vocabulary-ID queues.
- Decision: Derive candidates over enabled vocabulary in the learner's active
  assigned enabled Learning Sets. Use at most the latest 10 persisted valid
  review events per word in the inclusive 30-household-local-date window;
  break equal `reviewed_at` timestamps by descending review UUID. Classify as
  Weak with at least 2 events and exact accuracy below 60%. Otherwise classify
  by current state: LEARNING → Learning, MASTERED → Stable. Keep due as a
  separate `next_review_date <= household-local today` axis. Summary accuracy
  uses all persisted valid review events in the same 30-day window and is null
  without data. Rank Weak overdue, Weak due today, Weak not due, then Learning
  by due urgency, then Stable by due urgency; within a group use lower recent
  accuracy, older next-review date, then vocabulary ID. `scope=weak` resolves
  candidates on the server; DUE stays DUE and non-due becomes VOLUNTARY. Writes
  remain on the canonical review API and scheduler.
- Consequences: Weak classification is a derived read model with no new table,
  column, migration, review write mode or client ID list. Existing learner,
  active-set, due-date and review-history indexes are reused. Insufficient
  history cannot produce Weak, and a Stable item can independently be Due.
- Evidence/source: [US-49 Weak Words / Need Review](stories/US-49-weak-words-review.md),
  [Technical Architecture](architecture/technical-architecture.md#us-49-weak-words-derived-read-model-and-queue-scope),
  and the persisted `review_events` / `learner_progress` schema.
- Revisit only if persisted event semantics, active-set eligibility, or the
  owner-approved threshold/window changes.

## DEC-025 — Simplified primary navigation

- Status: ACCEPTED by the explicit Feature #13 implementation request.
- Date: 2026-10-05.
- Context: The previous shared shell exposed many unrelated level-one routes,
  while the mobile navigation used a separate menu interaction. Core learning
  areas should remain immediately available without hiding required secondary
  routes.
- Decision: Desktop AppShell has six primary destinations (Home, Vocabulary,
  Study Setup, Progress, Favorites and Settings), with Settings separated.
  Tablet/mobile replaces the sidebar with a fixed five-item bottom bar for the
  first five core destinations; Settings belongs in the account menu. Study
  remains the selected destination on `/study` and `/study/exercises`. Only
  canonical destination routes receive active state. Weak Words, Topics,
  Learning Sets and Learners remain accessible from contextual links or the
  account menu. Do not add a sign-out action without a canonical existing
  sign-out flow.
- Consequences: Presentation and route discovery change without adding
  requests, routes, APIs, persistence, scheduler behavior or database changes.
  Fixed mobile navigation must preserve safe-area insets and page content
  clearance. US-50 supersedes US-44's earlier instruction to hide app navigation
  during Study; the question experience stays focused within the shared shell.
- Evidence/source: [US-50 Simplified App Navigation](stories/US-50-simplified-navigation.md),
  [Feature UI Specification](design/feature-ui-spec.md#simplified-navigation-extension-feature-13--us-50),
  and `apps/web/src/components/app-shell.tsx`.
- Revisit only if the owner changes the primary destination model or a canonical
  route/auth capability changes.

## DEC-026 — Immutable taxonomy snapshots and semantic version bumps

- Status: ACCEPTED
- Date: Recorded 2026-10-06
- Context: The Hybrid-100 release candidate pins taxonomy 2.0.0 as DRAFT, while
  an APPROVED release requires an APPROVED taxonomy pin. The prior identity
  policy did not specify a lifecycle-only taxonomy version bump.
- Decision: `(taxonomyId, taxonomyVersion)` identifies an immutable snapshot.
  Lifecycle changes such as DRAFT → APPROVED create a new snapshot in the same
  taxonomy lineage. PATCH covers lifecycle/governance-only or metadata-only
  changes preserving semantic content; MINOR covers backward-compatible
  additive semantic changes; MAJOR covers breaking semantic changes. An
  approval-only PATCH compares the complete taxonomy payload excluding only
  top-level `taxonomyVersion`, `status`, `createdAt`, and `updatedAt`. Nested
  child lifecycle status remains semantic. There is no `taxonomyRevision`.
- Consequences: Taxonomy 2.0.0 remains immutable DRAFT. A 2.0.1 APPROVED PATCH
  snapshot is planned for the Hybrid-100 release; its semantic diff must be
  zero and must be verified after materialization. The owner decision does not
  authorize creating that snapshot, entity approval revisions, release 2.2.0,
  a releaseHash, runtime import, database changes, or production mutation.
- Evidence/source: [Taxonomy snapshot version policy](architecture/master-vocabulary-v2-identity-versioning-policy.md#taxonomy-snapshot-lifecycleversion-rule),
  Phase 2F.6A [owner decision artifact](../vocabflow-dataset/workspaces/hybrid-100-rc-final-review/taxonomy-version-policy-decision.json).
- Revisit only if a taxonomy semantic-versioning contract change receives
  explicit owner approval and includes migration/compatibility rules.

## DEC-027 — Scoped LF artifacts and offline DRAFT baseline gate

- Status: ACCEPTED by explicit owner authorization.
- Date: 2026-10-11.
- Context: On Windows checkouts with `core.autocrlf=true`, automatic CRLF
  conversion changed the working bytes of frozen release JSON and seven
  semantic-closure outputs. Byte-sensitive closure and release integrity
  checks then failed even though Git blobs remained unchanged.
- Decision: Preserve LF checkout bytes for tracked JSON recursively under
  `vocabflow-dataset/releases/`, and for the six exact JSON outputs and one
  exact Markdown report under the legacy semantic-closure audit. The recursive
  release rule is valid only for the tracked release JSON set verified by the
  2026-10-11 EOL audit; it does not cover non-JSON release files. This is a
  checkout representation rule and does not authorize changing accepted blobs,
  manifests, fingerprints, or release history.
- Phase 2H.2L baseline policy: For offline AI-authored DRAFT Git checkpoints
  only, assess full-suite baseline debt separately from regression status.
  Keep `FULL_TEST_STATUS` as `PASS` or `FAIL`; classify
  `BASELINE_NON_REGRESSION` as `PASS`, `FAIL`, or `UNPROVEN`; and report
  `BASELINE_EXCEPTION_POLICY` as `APPROVED_SCOPED`, `NOT_APPLICABLE`, or
  `BLOCKED_BY_CONTRACT`. An approved scoped exception can qualify only the
  explicitly documented full-suite baseline debt. It cannot suppress a
  candidate-only reproducible deterministic failure, a real release/identity
  integrity issue, failed focused or parent/frozen checks, incomplete review,
  blocking findings, failed seals/assembly/replay, or staging/remote/pin
  failures. Compare accepted baseline and candidate under equivalent Node,
  pnpm, dependency, runner, and EOL settings; compare exact test identities and
  normalized error signatures; investigate every candidate-only failure; and
  keep all historical failures visible.
- Scope and approval boundaries: This policy applies to one offline DRAFT Git
  checkpoint at a time. It authorizes no runtime release, database access or
  import, canonical promotion, Production change, historical release mutation,
  rights clearance, owner approval, or automatic extension to a later
  checkpoint. Independent review must cover 100% of new Senses; every blocking
  finding must be resolved and revised fields independently rechecked before
  seals, assembly, and two-seed zero-write replay.
- Revalidation and revocation: Repeat the baseline comparison and all
  checkpoint-specific integrity gates for every checkpoint. If a candidate-only
  deterministic failure reproduces, or any baseline failure is shown to be a
  genuine integrity problem affecting the candidate, mark the exception
  `BLOCKED_BY_CONTRACT`, keep publication ineligible, preserve the evidence,
  and require owner review of a forward-only remedy. Never hide the finding by
  editing historical tests or accepted artifacts.
- Evidence/source: Owner authorization dated 2026-10-11; isolated EOL matching
  and Git-blob checks, semantic-closure check, approved-release focused tests,
  and the CP02 baseline comparison recorded in `docs/ai-progress.md`.
- Revisit only if the owner changes the offline DRAFT publication contract or
  the repository adopts a higher-priority immutable validation requirement.

## 2026-10-29 — Owner prioritizes vocabulary expansion in one session

Owner redirects the campaign from 08/09 runtime proposals to 500–600 lexical
additions with topic/level metadata and complete media bindings. This chat
owns authoring, examples, translations and JSON. Muse only produces requested
images and TTS. No additional worker chats or new learning UI are authorized
by this continuation. The prepared 550 candidates remain editorial drafts;
canonical identity reconciliation, actual media review and any import are
separate unfinished steps. Historical pilot acceptance does not accept these
new candidates. See plans/editorial-refresh-2026-10-28/expansion-550-production.md.

## 2026-10-29 — Additional 500-entry basic collection

Owner selects500 basic entries for the next collection. Preserve exact existing
senses and progress identities where available, author missing senses and
context separately, and distinguish collection size from net new vocabulary.
The preceding547-item export remains independent. This chat owns text and
bindings; Muse owns only requested media. Proposed basic-track levels do not
overwrite source CEFR or imply school grades. Continue the existing media
filename/hash/receipt contract in a separate basic-500 media root. No new
learning UI, extra chats, or DB import is implied by authoring/media generation.
## 2026-10-30 — Owner resumes the bounded foundation08/09 local wave

Direct instructions “vậy làm luôn cái đó đi” and “làm tiếp cho tôi” authorize
the concrete local08/09contract after its previous deferral. One session owns
typed UUID foundation identities/progress,additive local persistence,new
same-origin local endpoints and media work order. Reuse existing visual system
and5/10/20/30capacity control;no independent daily foundation quota,lexical
progress migration,word-goal increment,new vocabulary or public deployment.

Node Development entry alone installs the foundation authority;Worker and
Production do not expose it. Existing Better Auth/household boundary remains
the authority. New foundation items never occupy vocabulary integer IDs.
Guest foundation state has its own validated Web-Locks namespace,with durable
save before UI advance. Account state remains transactionally server-authoritative.

Muse supplied18name/utterance clips but cannot produce isolated phonemes via
its plain-text backend. Six sound targets remain pending and unassessable;
no paid provider switch or fake phoneme substitute. New audio remains pending
listening acceptance;old05/06approval is not assigned to new bytes. Evidence:
`plans/editorial-refresh-2026-10-28/foundation-08-09-execution-2026-10-30.md`.
