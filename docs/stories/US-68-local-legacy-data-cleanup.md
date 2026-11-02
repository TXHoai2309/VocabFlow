# US68 — Remove retired local lexical data, retain the selected 6,544 entries

Status: ACCEPTED — audited local deletion and retained-source verification complete. The owner explicitly requested local inspection and deletion
of old vocabulary data on 2026-11-01, keeping the owner-edited 6,544-entry catalog.

Delete the retired Anki/Oxford sources, Master V2/import/release payloads, source
and media caches, lexical snapshots and their old local workspace data copies.
Use an explicit absolute-path manifest, verify every target is inside the named
workspace, reject reparse points, and reject overlap with any retained source.
Preserve code, Git history, schemas, synthetic fixtures, source attribution,
accounts/settings, the current publication evidence and selected source/media.
Do not create another old-data backup. No Neon, Cloudinary or deployment changes
are part of this local cleanup.

Keep all 6,544 published entries, the 19,631 unique local originals they use,
the frozen 5,000-item authoring source and its three owner-deferred repairs.
Foundation 08/09 authoring remains separate from lexical counts. Keep original
Muse input/output packages for these selected editions.

Acceptance: all manifest targets absent; every retained original and critical
catalog artifact matches its pre-delete byte length and SHA-256; owner-selected
catalog remains exactly 6,544; no code/history or remote mutation. Retired offline
Master/replay commands may no longer have their former real data inputs; this is
intentional deletion, not a claim that those historical workflows still run.

Evidence: `.vocabflow-local/editorial-refresh-20261101/local-legacy-cleanup-r0001/`.

## 2026-11-01 — US68: retired local data removed; selected 6,544 preserved

Owner requested deletion of old local vocabulary data, keeping the selected owner
catalog. Removed 259 audited absolute targets containing
136,189 files (11,588,290,253 bytes): retired external
Anki/Oxford archives, Master V2/import/release payloads, old source/media caches,
lexical snapshots and copies in historical local working directories. No old-data
backup was created. Each target was inside D:/hoctienganh, checked for reparse
points, and disjoint from every retained source before native PowerShell deletion.

All 19,631 current unique image/audio originals and eight critical catalog/source/
attribution files match their byte length and SHA-256 before and after deletion.
The combined selected catalog still has exactly 6,544 entries; frozen 5,000-item
text, three owner-deferred repairs, selected Muse packages and foundation 08/09
authoring remain intact. Preserved application code, Git history, schemas,
synthetic fixtures, licenses and operation evidence. Neon, Cloudinary, local DBs,
accounts/settings and deployments were not changed by this file cleanup.

Historical Master/replay commands intentionally no longer have their real retired
data inputs. This is not a full historical test-suite PASS claim. The active owner
catalog/media inputs remain hash-identical. Git history can still contain earlier
tracked records; no history rewrite or secure physical erasure is claimed.

Current data entry point: `vocabflow-dataset/current.json` and its README.
Evidence: `.vocabflow-local/editorial-refresh-20261101/local-legacy-cleanup-r0001/handoff.current.json`.


## US69 evidence relocation — 2026-11-01

The original operation evidence is now byte-preserved in
`D:/hoctienganh/VocabFlow-data/operations/original-evidence.zip`, under its original
repository-relative member paths. The current catalog is `VocabFlow-data/catalog.json`
and `vocabflow-dataset/current.json` records the live local paths.
