# US69 — Consolidate current vocabulary data and remove workspace clutter

Status: ACCEPTED — relocation, cleanup, hash and runtime checks complete. Owner explicitly requested cleanup of D:/hoctienganh and
the application's .vocabflow-local directory, keeping necessary vocabulary
files and consolidating them into one folder on 2026-11-01.

Put current catalog, local images/audio, authoring sources, deferred repairs,
foundation authoring and publication receipts under D:/hoctienganh/VocabFlow-data.
Keep main code, active environment configuration and local PostgreSQL settings.
Update Node-only media locations without changing IDs, content, authorization,
learner progress, databases, cloud assets or production deployments.

Delete identified temporary/test/build/cache/redundant media packages. Preserve
unique historical code/patches in a compact separate code archive; remove old
registered worktrees only after verifying no unrelated edits and that commits
are retained by main. Do not reset or rewrite Git history. Check literal absolute
source/destination paths before recursive moves/deletes; do not follow junctions
into retained files. Retain current catalog bytes and all selected media hashes.

Acceptance: all 6,544 entries mapped to local and cloud media; retained media and
critical source bytes verify after relocation; owner local media works with its
fixed manifest pin; foundation audio retains its existing DB path identity via
an exact Node-only path relocation; path-escape/remote-host guards remain valid;
only necessary data/runtime material remains in .vocabflow-local; workspace root
is organized; meaningful checks and final documentation complete. No automatic
commit, push, deploy or DB import is included.

## 2026-11-01 — US69: one current data folder; workspace clutter removed

Owner requested consolidation and deletion of unnecessary local files. All current
vocabulary data now lives in `D:/hoctienganh/VocabFlow-data`: unchanged 6,544-entry
catalog, local/cloud media index, 6,544 images, 13,087 unique MP3s, authoring sources,
three deferred items, 18 foundation clips and source licenses. Original operational
and Muse input/intake evidence is preserved in a CRC-verified ZIP. Original frozen
JSON keeps its historical paths; the current index/relocation plan records new ones.

Moved all 19,656 selected/foundation/deferred media files on the same volume. All
19,649 available file identities and sizes matched; seven deferred files whose
directory-entry file IDs were unavailable matched SHA-256 before deletion. Final
SHA-256 checks pass for every relocated original and all eight critical artifacts.
No source text, ID, learner progress, DB, cloud asset or deployment was changed.

Removed 120 explicit clutter targets and three merged worktrees after verifying
their commits remain in main and no unrelated edits existed. Preserved 5,086
historical code/doc/patch files in one ZIP and independent shadow Git refs in a
verified bundle under `_archive`. Main Git history/branches and dirty work remain.
The workspace root now contains only `VocabFlow`, `VocabFlow-data` and `_archive`.
`.vocabflow-local` keeps two unchanged active env files and a README pointer.

Updated only Node local media configuration: a hash-pinned relocated 1,547-item
manifest and an exact foundation legacy-path relocation, preserving DB content
hashes and all request/root/hash guards. Sixteen focused tests, targeted ESLint
and root typecheck pass. Actual default Hono image/audio responses and foundation
original-path resolution pass; remote-host/unknown-file checks still deny access.
No browser, database or cloud calls were used for that media smoke check.

Current entry: `vocabflow-dataset/current.json`. Completion:
`D:/hoctienganh/VocabFlow-data/operations/reorganization-r0001/handoff.json`.
Prior US67/US68 operation directories are now inside `operations/original-evidence.zip`.
