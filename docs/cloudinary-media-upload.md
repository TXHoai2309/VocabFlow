# Cloudinary Media Upload

The repository includes a safe, content-addressed uploader for the generated
vocabulary media manifest. The default command is an offline plan and does not
require credentials or make network requests:

```text
pnpm run media:manifest
pnpm run media:upload
```

The plan reports the canonical candidates without writing an upload checkpoint.
The current manifest contains 1,937 image assets and 1,973 audio assets (3,910
canonical upload candidates). Missing optional media is absent from the
candidate set and does not block the plan.

An actual upload requires the explicit apply flag:

```text
pnpm run media:upload -- --apply
```

For the first controlled canary, select exactly one canonical image and one
canonical audio asset in stable manifest order. The default canary command is
also plan-only and makes no Cloudinary requests:

```text
pnpm run media:upload -- --canary
```

It reports `CANARY_MODE=true`, `APPLY_MODE=false`, one selected image, one
selected audio asset and two total selected assets. The later real canary must
be explicitly enabled:

```text
pnpm run media:upload -- --canary --apply
```

Canary apply is bounded to those two canonical assets and retains the same
hash verification, `overwrite=false`, checkpoint, retry, public-ID and
secret-safe protections as the full batch. Normal `--apply` remains the full
3,910-asset batch.

Apply mode loads `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`, `MEDIA_PROVIDER`, `CLOUDINARY_VOCAB_IMAGE_FOLDER` and
`CLOUDINARY_VOCAB_AUDIO_FOLDER` from the repository environment. Credentials are
used only by this local Node process and are never printed. The command uses
Cloudinary `overwrite=false`, bounded concurrency and bounded retries. It does
not update the database.

Provider-neutral manifest keys remain authoritative:

```text
media/v1/images/<sha256>.<normalized-extension>
media/v1/audio/<sha256>.mp3
```

Cloudinary public IDs deliberately use `content-v1` rather than the literal
provider-neutral `v1` path segment:

```text
vocabflow/images/content-v1/<sha256>
vocabflow/audio/content-v1/<sha256>
```

Images use Cloudinary resource type `image`; MP3 files use resource type
`video`, which is Cloudinary's audio upload resource type. The configured image
and audio asset folders are applied independently.

Apply state is written to the gitignored generated directory:

```text
local-data/generated/cloudinary-upload-state.json
local-data/generated/cloudinary-media-map.json
local-data/generated/cloudinary-upload-failures.json
```

The checkpoint contains only asset identity and non-secret provider metadata.
Re-running apply skips matching successful checkpoint entries, safely skips
matching assets already present in Cloudinary, retries only transient failures,
and writes a deterministic failure report. Before every upload the local file
is re-hashed and must still match the manifest SHA-256; changed or missing
bytes fail closed. A later controlled upload should begin with the offline plan,
review the summary, and then pass `--apply` explicitly.

Optional controls are bounded:

```text
pnpm run media:upload -- --concurrency 1-5 --max-retries 0-5
```
