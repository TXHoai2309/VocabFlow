# V2 short-meaning artifact bundle

This immutable bundle contains one result for each of the 7,311 V2 Sense
identities. It preserves the verified 5,147-row parent artifact and adds only
the 255 receipt-supported glosses from the reviewed V3 artifact.

## Pinned baseline

- Content fingerprint: `9abf453175f3cb48fdf46c779e6bdcbb5cad8ba659df3321893a777a539cb367`
- Verified: 5,402
- Review required: 397
- Unresolved: 1,512
- AI-derived rows: 0
- Neon writes in artifact creation: 0
- SHA-256 of the externally stored source archive (verified before packaging;
  the backup ZIP is intentionally not in Git):
  `41258717a13dad47d804ec7cb605738a6ded42a334b2a158bf3fe9cf5679845f`

`SHA256SUMS.txt` preserves the original artifact pins. `BUNDLE-SHA256SUMS.txt`
also pins the portable bundle and parent baseline. The
portable verifier checks all bundled bytes and row-level evidence without
requiring the former worktree, local database dump, or source inventory paths.
The source archive was fully verified before packaging, including its 16
referenced review receipt files and 6 pinned source files; those external source
files are not copied into this bundle.

From the repository root, run:

```powershell
pnpm short-meanings:v2:verify:offline
```

This verifies the artifact only. The sync command defaults to this bundle and
requires an explicitly configured Development database target. `REVIEW_REQUIRED`
and `UNRESOLVED` rows must remain pending; the bundle does not approve them.
