# Vocabulary Media Manifest Dry Run

The repository includes an offline manifest generator for the converted
vocabulary media dataset. It does not require Cloudinary credentials and does
not upload files or change the database.

Run:

```text
pnpm run media:manifest
```

The default inputs are:

```text
local-data/vocabulary/2000_Common_English_Vocabulary_Dataset/vocabulary.json
```

The generated, gitignored outputs are:

```text
local-data/generated/vocab-media-manifest.json
local-data/generated/vocab-media-report.json
```

The generator validates references remain inside the dataset root, detects
image content from bytes, validates MP3 frame content, computes SHA-256 hashes,
deduplicates shared files and emits deterministic provider-neutral keys:

```text
media/v1/images/<sha256>.<normalized-extension>
media/v1/audio/<sha256>.mp3
```

Missing optional media is reported but is not fatal. Invalid content, unsafe
paths, duplicate vocabulary IDs and manifest invariant failures stop the run.

Optional flags:

```text
pnpm run media:manifest -- --dataset-root PATH --output-dir PATH
```
