# Production replacement — prepared; live catalog has not switched

## Live result supersedes the prepared checkpoint below

Production deployment and exact1,547content replacement are verified live.
See [US65 live cutover evidence](../../stories/US-65-owner-catalog-production-replacement.md).
Cloud retirement is complete: 9,168 deleted; final inventory verifies all protected resources. The former prepared/no-writes statements below
are preserved as historical checkpoints, not current status.


Owner instruction,2026-10-30: “giờ thay cho tôi đi, xóa cả bên phía cloudiary nhé,
ưu tiên làm ở prod trc, dev để sau”. One session; no fresh vocabulary/media
generation. Production replacement and old vocabulary-media retirement are
authorized. Development Neon changes remain deferred.

## Completed external actions

- Verified the configured Production branch through Neon API and protected DB
 identity. Captured7,311vocabulary rows,4,537enabled,28application tables and
 23migration-history entries. Runtime and migration credentials were checked
 separately without logging their values.
- Uploaded **4,640new originals** to Cloudinary under the separate
 `vocabflow/owner/production-1547-20261030-r0001` namespace. Every upload's byte
 count and original MD5 match the selected local file; SHA256 and Muse receipt
 pins remain attached.18original delivery GETs also match source SHA256/length.
 These files cover1,547images +1,547word +1,547sentence slots; one identical
 sentence audio file is shared. Images have an optimized HTTPS delivery URL;
 exact originals remain available.
- Created a private Production dump from an exported repeatable-read snapshot,
 using official PostgreSQL18tooling to match Neon18. Restored it into a separate
 local18container and matched all28table fingerprints with UTC/C collation.
 All scratch containers were removed by their exact created IDs. No live restore.
- Backed up **9,168old Cloudinary retirement candidates**:241,783,727bytes,
 each checked against inventory byte length and delivery ETag, then SHA256
 pinned. These files are not referenced by current Production or Development.

**Production schema/content has not been mutated. Old Cloudinary deletion is
still0. New uploads are the only remote writes in this checkpoint.**

## Exact proposed cutover

| Operation | Count |
| --- | ---: |
| Selected words from existing547/500/500packages |1,547|
| Reuse Production runtime IDs |900|
| New Production runtime IDs |647|
| Retire old Production vocabulary rows |6,411|
| Topic nodes / topic sets |73 /73|
| Parent package sets |3|

Local905retained/642new counts must not be reused on Production. Five local
legacy IDs do not exist in Production.900existing Production rows match the
frozen `(source_dataset, source_record_id)` source identity.410of those no
longer have a V2 projection on Production; matching only word text or local
proposal hashes would discard their real identity. The Production plan uses
the frozen source-record identity and keeps its explicit evidence per item.

The complete rehearsal preserves account/auth/household/profile/settings/XP
and retained-word history fingerprints. Of the current35progress rows,8belong
to kept words and27to retired words; of44review rows,8remain and36retire.
This is observed rehearsal evidence, not a mutation of the live account.

Levels stay139FIRST_WORDS,731A1,544A2,132B1,1B2,0C1/C2. FIRST_WORDS is
explicitly curated with CEFRnull; foundation letters/utterances remain separate.
Source/WordNet license and reused editorial lineage remain intact. Static
attribution/license files are included in `apps/web/public/licenses/`.

## Why media is not deleted first

The Cloudinary inventory has18,096assets.17,890are in historical vocabulary
namespaces;206belong to other resources/projects and are protected.
**8,722old vocabulary assets are shared by Production and Development.**
The corrected r0002audit includes43raw GIF references with a doubled legacy
extension. Those underlying assets are protected too; the earlier8,679count
was incomplete and is superseded.

After a verified Production cutover,9,168unreferenced candidates can be retired
from their exact inventoried asset IDs/versions, with local original backups.
The8,722shared assets must remain until the deferred Development cutover, unless
the owner separately accepts breaking Development delivery. No account-wide
Cloudinary deletion or deletion of unrelated206assets is authorized by this plan.

## Runtime and release preparation

New code adds a separate `owner-production` dataset mode, source
`VOCABFLOW_OWNER_EDITORIAL`, and migration0024publication table. Honest
`OWNER_SELECTED_PUBLICATION` metadata never claims independent Master PASS.
An additive compatibility view serves the old V2 catalog until the atomic
content transaction commits, so deploying compatible code first does not
empty the site. The new public index is uncached during this replacement and
announces the new catalog identity only when all1,547owner rows are present.

Actual deployed Hono media middleware now recognizes only this exact owner's
Cloudinary namespace and runtime gate; it withholds localhost/foreign media.
SDK analytics is accepted as the sole optional URL query parameter. Production
FIRST_WORDS filters depend on real content, rather than a DEV build flag.
Guest state receives its own versioned backup before pruning retired IDs.

Fixed native Node ESM package exports and existing tooling type mismatches that
prevented typecheck. No release provenance, CI status or clean tree was faked.

## Evidence and checks

All operational artifacts below are under the Git-ignored directory:
`.vocabflow-local/editorial-refresh-20261030/owner-production-r0001/`.

- `production-plan-r0001.json`: exact1,547text/media/source/ID plan,
  SHA256 `5496ccdff01d327d2d0e622c1c1e00f17f8de1352e0630fbc2f4eb59537b751c`.
- `backup-r0002.json`: private dump7,437,657bytes, SHA256
  `178c73640cf3cd004a5eb037b017787370ae0223bbe6d325f782065cccedf846`,
  restore28/28PASS. Earlier r0001fingerprint rehearsal used incompatible
  collation and is unverified historical evidence; use r0002only.
- `upload-checkpoint.current.json`: all4,640Cloudinary originals, URLs,
  asset IDs, versions, source hash/length and upload verification.
- `shared-media-audit-r0002.json`, `old-media-backup.current.json`,
  `old-media-backup-journal.jsonl`: reference/backup evidence for9,168candidates.
- `dry-run.current.json`: real Production read-only preflight PASS,0DBwrites.
- `schema-qa-r0001.json`: exact0024SQL/compatibility/runtime privileges PASS
  on a disposable PostgreSQL18fixture.
- `full-rehearsal-r0001.json`: restored real Production backup → pending
 0022–0024artifacts → old runtime compatibility → full replacement rollback →
 committed1,547replacement → idempotent no-write rerun → actual public and
 account read services/level counts/media middleware/household denial. All8
 grouped checks PASS; no live DB/account review writes.
- `app-tests.current.json`:962app/domain tests PASS; additional boundary,
 release-safety and regression reports cover actual deployed media and native
 Node imports. Counts overlap and must not be added together.
- `typecheck.current.log`: root `pnpm typecheck` PASS after the scoped fixes.
- `build.current.log`: build, client-secret and source-map scans PASS; known
 chunk/dynamic-import warnings remain. Strict premium audit has0findings.
- Changed-source TypeScript lint PASS. Broader app lint still reports10existing
 errors in foundation/dev-staging code. Full-repo test run reports historical
 artifact/pinning failures; it is **not** a passing Core CI release.

Browser-only verification is pending: the in-app browser reported Local browser
use disabled when opening the disposable production-build preview. No browser
approval, live account login or all-file listening is claimed. A public-only
fixture/preview exists for a later browser check, never connecting to Neon.

## Remaining release boundary

Production currently runs `main` commit
`86a08f1d68dca3749d46f8cc94e01e738241f8ac`. The new runtime is uncommitted in
the shared checkout. Repository `AGENTS.md §13` requires explicit authorization
before commit/push; DEC-018requires a tested immutable `main` release and passing
release gates. User authorization to replace Production data is recorded; no
additional approval is being invented for the already-authorized data operation.
The missing action is publishing the necessary code change through that release
boundary. Existing root test/lint failures must be resolved or explicitly handled
through the project's reviewed release process; never silently skipped.

Do not run the content apply before compatible code and0024are deployed. The
apply tool requires exact branch confirmations, clean pinned source, matching
READY Vercel `main` SHA, successful rehearsal, backup pins and the live
`X-VocabFlow-Catalog-Mode: owner-production` header. The retirement tool further
requires verified live1,547catalog, fresh Production/Development reference reads,
matching Cloudinary asset IDs/versions and original backups. This ordering is
mandatory to avoid leaving the live site with unreadable media or an empty catalog.

No commit, push, deployment, Production content/schema write, Development Neon
write or old Cloudinary deletion has occurred in this checkpoint.

Reference behavior checked against primary provider docs:
[Cloudinary Admin API](https://cloudinary.com/documentation/admin_api),
[Cloudinary uploads](https://cloudinary.com/documentation/upload_images),
[Cloudinary deletion](https://cloudinary.com/documentation/delete_assets).
