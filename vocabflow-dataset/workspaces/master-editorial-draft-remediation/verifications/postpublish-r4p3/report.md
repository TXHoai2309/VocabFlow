# R4P.3 integrity evidence

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

```json
{
  "R4_ORIGINAL_PREPUBLICATION_REPLAY": "BLOCKED_BY_OBSOLETE_HEAD_ASSERTION",
  "R4_REGENERATION_EQUIVALENCE": "NOT_INDEPENDENTLY_REESTABLISHED",
  "classifications": {
    "AUTHORIZED_EOF_EOL_EQUIVALENCE": 1,
    "AUTHORIZED_FULL_FILE_EOL_EQUIVALENCE": 1,
    "BYTE_EXACT_MATCH": 486
  },
  "databaseAccess": "NONE",
  "databaseWrites": "NONE",
  "missingOrUnverifiable": 0,
  "production": "UNTOUCHED",
  "status": "PASS_WITH_TWO_EXPLICIT_EOL_EQUIVALENCES",
  "totalReferences": 1031,
  "unauthorizedDifferences": 0,
  "uniquePins": 488
}
```
