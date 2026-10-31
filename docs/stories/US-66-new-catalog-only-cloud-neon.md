# US-66 — Keep only the selected Muse catalog in cloud storage and Neon

- Status: ACCEPTED — selected Dev/Prod catalogs and complete old-data purge verified.
- Keep the exact 547 + 500 + 500 = 1,547 selected words and their 4,640 media
  originals. Synchronize this same catalog into Neon Development as requested.
- Production's verified selected catalog remains intact. Preserve accounts,
  settings, protected identity/migration infrastructure and retained-word history.
- Owner's latest correction explicitly includes the 206 non-VocabFlow Cloudinary
  assets in deletion. Delete every inventoried non-selected asset only after Dev
  references are replaced and the selected assets are independently verified.
- Owner explicitly waives old-backup retention and requests their deletion.
  This supersedes the historical retention directions in US64/65: do not create
  another persistent old-data dump. Remove old DB/media backups after the new
  catalogs verify; preserve the new data, media, source attribution and operation
  evidence. Disable the old Neon restore-history window as part of this request.
- Development uses the honest owner-publication projection and an explicit,
  identity-checked Development flag; never relabel owner content as Master PASS.
- Do not reset whole databases/projects, accounts, security roles or schemas.
- Acceptance: both canonical Neon branches contain exactly the selected 1,547;
  Dev runtime reads new media/levels; Cloudinary contains exactly the 4,640 pinned
  selected originals; old backups are removed with a path-checked manifest;
  Production remains healthy and final evidence/documents are updated.

## Execution checkpoint

Both Neon catalogs are synced; actual Preview/Production HTTP and Dev Hono
media boundary checks pass. All900retained Dev source identities match, zero
new-ID collisions; full apply rollback was exercised before the commit. Dev
keeps5accounts and2retained progress/review rows. Owner publication guard and
release/media tests75PASS, changed lint and root typecheckPASS. Preview deployment
`dpl_8NGhc3F897S7VLdQZFAgqNSoqJRJ` is READY at commit3539f98. PR #11 keeps
this configuration in the shared codebase; Production selection stays independent.
Neon project's restore-history window is0seconds; no project snapshots exist.
Cloudinary backup search (active+deleted) returns0backed-up assets. Non-selected
cloud original deletion is running; no new old-data dump was created.

## Acceptance closure

## 2026-10-31 — US66 selected catalog only: purge completed

Owner explicitly replaced the earlier retention direction: keep the exact
1,547 Muse-selected words, synchronize canonical Neon Development, delete all
other Cloudinary originals including the 206 formerly unrelated files, and
remove old backups. Both canonical branches now verify1,547words/76sets/73topics
with exact selected text, classifications, examples and4,641media bindings.
Development retains900source IDs, adds647and retires6,411old rows. Account,
settings and retained-history fingerprints match; no fake Master PASS.

Deleted the remaining8,928non-selected Cloudinary originals; final inventory
contains exactly4,640selected originals, checked by asset ID/version/bytes.
Old+other assets remaining0; backed-up cloud assets0. Combined with US65,
18,096old/other originals have been removed. All4,640new local original files
still match source SHA-256 and length. Removed22old local DB/media
backup targets (1,445,260,632.0bytes) after path/link/keep-list checks. No
new persistent old-data backup was created. Canonical Neon project has0snapshot
backups and restore-history window0seconds. Provider disk reclamation remains
managed asynchronously; no claim of immediate physical-byte erasure.

Protected Preview HTTP and Production API pass. Common new data and evidence:
`.vocabflow-local/editorial-refresh-20261031/old-data-purge-r0001/dataset-dev-prod-complete-r0001.json`
and `handoff.current.json`. Historical US64/65 backup/shared-asset retention
statements are superseded by this explicit owner instruction. Accounts, protected
identity/migration history, code history and source attribution remain intact.

PR #11 merged into main at `d22523936fbdf0069b77a5a3aa6128346ec4bb5b` after
Core CI run41164580500 passed. The compatible Dev Preview was already READY
and verified before its lexical cutover; Production's selected catalog was
not changed by this synchronization. Final cloud inventory verifies zero old
originals/backups and all4,640selected local originals pass SHA-256.
