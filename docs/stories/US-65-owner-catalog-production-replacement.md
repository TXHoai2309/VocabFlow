# US-65 — Replace Production vocabulary and retire its old Cloudinary assets

- Status: IN PROGRESS — MEDIA/BACKUP/REHEARSAL PASS; RELEASE PENDING
- Release authorization: owner explicitly approved commit/push, CI repair and
  continuation through Production completion on 2026-10-30. PR #10 records the
  publication/runtime package. The checkpoint below predates that approval.
- Authority: owner explicitly requests “giờ thay cho tôi đi, xóa cả bên phía
  cloudiary nhé, ưu tiên làm ở prod trc, dev để sau”, 2026-10-30.
- Priority supersedes further Development changes. One session, no delegation.
- Replace Production lexical catalog with the exact selected 547/500/500
  packages. Publish their existing image/word/example files to Cloudinary and
  keep source/receipt/license lineage. No new media or vocabulary generation.
- Resolve Production IDs against its actual rows/proposal keys; do not assume
  local numeric IDs, migration state or private localhost routes work remotely.
- Preserve users/auth/households/learner profiles/settings and retained-sense
  progress. Remove retired lexical references and rebuild selected collections.
  Preserve protected identity, least-privilege roles and migration history.
- Pin before-state and prepare a restorable Production backup before mutation.
  Upload/verify new assets before switching DB/app. Delete only inventoried old
  vocabulary assets after the new catalog is verified live; protect unrelated
  Cloudinary assets, new media and any references that require a later dev step.
- The existing clean immutable-source Production release contract still applies.
  Never fake CI, clean-source status, canonical Master identities or review PASS.
  Do not commit/push without explicit authorization. Prepare the concrete tested
  release before requesting any missing final release authorization.
- No Development Neon mutation or old rollback database/project deletion.

## Acceptance

1. Read-only provider/DB identity and catalog/media inventory exact; preservation
   scope and keep/delete/new-ID/media lists are pinned before destructive work.
2. Verified/restorable DB backup and recoverable old asset inventory; new1547
   images/word/sentence bindings use valid HTTPS media with exact source hashes.
3. Explicit Production runtime supports owner-selected metadata and level/set
   scope honestly. No localhost routes, developer banners or fabricated PASS.
4. Atomic idempotent replacement leaves exactly1547selected rows; counts,
   collections, media, household authorization and retained progress verify.
5. Same tested release reaches Production through the protected release path;
   public browser/API checks pass before old cloud asset retirement.
6. Exact Cloudinary retirement report, rollback references and handoff updated.
   Report any shared dev assets retained for the deferred dev phase separately.


## Checkpoint — 2026-10-30

AC1–2prepared/verified, AC3–4pass on restored Production backup, AC5–6pending
live release/cutover/retirement.4,640new originals uploaded; backup28/28restore
PASS;9,168old unused media originals backed up. Full PostgreSQL18rehearsal
passes rollback, exact1,547apply, idempotency, all levels/sets, actual Hono
media middleware and account read/household boundaries. No live DB/schema
mutation, old cloud deletion, Development mutation, commit, push or deploy.

[Prepared result and remaining source/release gate](../plans/editorial-refresh-2026-10-28/owner-production-replacement-2026-10-30.md).
Root typecheck/build/scans/app tests and changed lint pass; historical root
test/lint gates remain unresolved. Browser attempt was denied by Work settings;
no rendered-production or live account-browser proof is claimed.
