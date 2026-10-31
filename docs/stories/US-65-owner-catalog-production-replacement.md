# US-65 — Replace Production vocabulary and retire its old Cloudinary assets

- Status: ACCEPTED — PRODUCTION COMPLETE; DEVELOPMENT DEFERRED
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

## Live cutover — 2026-10-30

PR #10 merged; release SHA `253e382f630eac32db7430af5cbc402c3944e30e`.
Core CI run41064219797 passed on retry after one recorded audio-mock timing
failure; 1,345 active tests and56/56 browser checks pass. Trusted DB push run
41064220055 and Production Release run41065614267 pass for the exact main SHA.
Additive migrations0022–0024 and Vercel deployment `dpl_2KJutaGPcwNEFRAeVCMoMVqjHHwH`
completed before content mutation.

Atomic replacement committed:900retained IDs,647new IDs,6,411retired rows;
1,547words,76sets,73topics, no old projections. Protected account/settings/XP,
identity/migration history and retained-word history fingerprints match.
Actual authenticated Home shows1,539new +8learned; catalog shows1,547and
FIRST_WORDS filter139, with new images visible. No review/settings writes
were made during verification. Full live API verifies all4,641media bindings,
all levels,60retired IDs absent and18original file SHA/length matches.

Two pre-commit attempts rolled back safely. Vercel CLI records detached checkout
as`HEAD`; the successful operator independently verifies current main SHA and
the successful exact-SHA Production Release, in addition to matching READY
Vercel deployment SHA/project and the runtime header. The original raw SQL
operator double-serialized JSON; initialize the same Drizzle postgres-js driver
as the successful rehearsal before calling the unchanged released apply core.
The private executed operator and proof are retained with the operation ledger;
no tracked source/clean-state/main/deployment proof was fabricated.

Cloud retirement is running only after live verification. Shared Development
media and unrelated assets remain protected. Development Neon writes remain0.
Operational evidence is under `.vocabflow-local/editorial-refresh-20261030/owner-production-r0001/`.

## Acceptance closure — 2026-10-30

AC1–6 PASS. Final provider audit verifies all 9,168 retired assets absent,
4,640 new originals unchanged, 8,722 shared Development and 206 unrelated
resources unchanged. No Production blocker remains. Development is deferred
by owner instruction; its shared assets are intentionally retained. The common
production JSON contains actual runtime collection IDs and exact media/source
bindings; `handoff.current.json` pins all final evidence. Backups are retained.
No additional review or settings writes were made during browser verification.
