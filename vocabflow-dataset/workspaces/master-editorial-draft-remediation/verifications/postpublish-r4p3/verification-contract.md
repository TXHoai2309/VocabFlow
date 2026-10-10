# R4P.3 published integrity contract

Read-only command: `python -B scripts/phase-2h2j-postpublish-integrity-verify.py --check`.
Only explicit `--prepare` writes new verification artifacts; existing differing outputs are rejected.
Every parent pin uses raw working bytes and raw Git cat-file blob bytes; JSON equality cannot replace byte integrity.
The exact two-file allowlist pins path, parent/published commits, blob object ID, distinct SHA256 values,
byte/newline counts, exact LF offsets and the owner-authorized transformation. No wildcard normalization.
486 other files must be byte-identical. Accepted metadata is itself pinned by the published manifest.
Current TXH may advance only with all protected blobs unchanged. The report intentionally omits volatile HEAD.
Overlay reconstruction verifies persisted BEFORE/AFTER data and provenance; it does not regenerate the R4 builder.
Old scripts/checkpoints are unchanged. DRAFT, unknown rights, no approval/ID allocation, no database access.
Historical diagnostics (not newly run): bulk-500 UTF-8 35/35; Windows default two errors;
Hybrid v2.2.0 4/5; Hybrid v2.2.1 8/8. Original R4 replay remains blocked by its prepublication HEAD guard.
