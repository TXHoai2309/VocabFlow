# Starter Vocabulary Enrichment

The approved enrichment tool updates only the eight existing starter rows whose
English words have exact, unique source matches:

```text
1, 2, 7, 8, 9, 11, 18, 19
```

It validates the source record IDs and words, resolves media only through the
generated manifest and Cloudinary media map, preserves vocabulary identity and
enabled state, and never addresses `learner_progress` or `review_events`.

The default command is a database-read-only dry run:

```text
pnpm run vocab:enrich-starter
```

It reports the current and proposed content versions, changed fields, media
availability and identity checks. The future apply command is explicit:

```text
pnpm run vocab:enrich-starter -- --apply
```

Apply validates all eight rows before updating any row, performs updates in one
transaction, guards every update by ID/word/enabled/version, and rolls back on
any failure. A completed version-2 row is classified as `ALREADY_ENRICHED` and
is skipped on rerun; an unexpected version-2 content difference fails safe.
The apply command must be run only after owner-approved database preflight.
