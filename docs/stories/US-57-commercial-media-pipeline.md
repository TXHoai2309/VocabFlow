# US-57 — Commercial Media Pipeline

## 2026-10-17 — Cloudinary V1 cleanup assessment

- The existing inventory identifies 3,909 V1 assets in `Vocab/images` and
  `Vocab/audio`: 1,937 images and 1,972 audio assets. All 13,977 assets in the
  V2 upload map remain protected under the separate V2 namespace.
- Read-only Neon V2 Development checks found no references to the V1 namespace
  in vocabulary URLs, V2 projection media, or the checked media-staging tables.
- Production references were not inspected. Keep every V1 asset `UNKNOWN`; no
  deletion candidate is proven and no binary backup/checksum was created. The
  inventory's hash evidence is derived from public IDs, not verified bytes.
- Assessment artifact:
  `.vocabflow-local/cloudinary-v1-cleanup/cloudinary-v1-cleanup-assessment-v1.json`
  (SHA-256 `ae0b5546b3919cc56bdbc0c329bd6e5e507ffaef08884f05155d1f9d609991ba`).
  No Cloudinary asset was mutated or deleted.

- Status: US-57.1 PREFLIGHT COMPLETE; CANARY INPUTS READY; PROVIDER CALLS BLOCKED
- Scope: current Master V2 effective staging Sense content only; no APKG media source.
- Baseline pin: Development project `shy-hill-72364426`, branch
  `br-square-grass-b3af0nte`, database `neondb`, schema
  `vocabflow_editorial_staging`; snapshot SHA-256
  `ed5728a635234a1fb3c8771f8d2ed19041866106a10e04430abe5b31d89a9f3b`,
  fingerprint `217c272765f80e92319b928740176ec6685527ff56de74d891bf16052cb7106b`.

## Outcome

Add a commercial-rights gate and a deterministic, offline-only generation
manifest for 25 effective DRAFT Senses. It includes one example-audio request
per exact Sense example, word audio deduplicated by Lexeme and accent, and a
Sense-specific image brief where a standalone illustration is useful. `tear`
is included as a pronunciation ambiguity canary; no pronunciation is selected
and it is excluded from the word-audio requests until a canonical Lexeme and
pronunciation identity are reviewed.

## Artifacts

- `vocabflow-dataset/workspaces/us57-commercial-media-pipeline/commercial-media-rights-policy-v1.json`
- `vocabflow-dataset/workspaces/us57-commercial-media-pipeline/provider-options-v1.json`
- `vocabflow-dataset/workspaces/us57-commercial-media-pipeline/media-generation-manifest-v1.json`
- `vocabflow-dataset/workspaces/us57-commercial-media-pipeline/media-generation-plan-report-v1.json`
- `vocabflow-dataset/workspaces/us57-commercial-media-pipeline/canary-execution-readiness-v1.json`

Build the plan with:

```powershell
node scripts/us57-commercial-media-plan-v1.mjs
```

The builder verifies the pinned snapshot bytes, target and fingerprint; requires
each selected Sense to remain EFFECTIVE/DRAFT with matching identity and draft
content hashes; joins only exact normalized lemma candidates from the existing
Master V2 Lexeme index; and binds each example request to the example text hash.
It writes only these new offline workspace artifacts.

## Commercial Rights Gate

Rights status is separate from mapping review. `ACCEPT_MAPPING` never clears
rights. Each decision must bind exact bytes by SHA-256, provider/source,
license/contract evidence version, paid-app and CDN/playback scope, attribution,
reviewer and UTC review time. CC BY-NC and unknown rights fail closed. The
asset-level decision checker is covered by the US-57 tests.

Provider terms research is not an asset-level rights grant. The pinned APKG
media assets remain excluded; this plan contains no APKG media, source artwork,
reference image bytes, or legacy 2,000-word media.

## Provider and Cost Decision

- TTS scenario: Amazon Polly Neural, one shared word clip per Lexeme and
  `en-US`/`en-GB` locale, plus exact Sense example clips in `en-US`. Planning
  uses Joanna (`en-US`) and Amy (`en-GB`) at the documented Neural list price
  of $16 per million input characters. It is a one-pass estimate before any
  applicable free tier; retries and taxes are additional. All 28 word jobs
  are blocked: the 14 exact Master V2 Lexeme candidates have empty canonical
  `pronunciations` arrays, and the `tear` Sense has no canonical Lexeme match.
- Current public Polly terms were rechecked on 2026-10-15. AWS service terms
  designate output as the customer's content; the product page says standard
  MP3/OGG output may be redistributed, and pricing permits cache/replay without
  an added fee. Joanna en-US and Amy en-GB are listed Neural voices. Neural
  synthesis is supported in `ap-southeast-7` (Thailand), but no VocabFlow AWS
  credentials, CLI, configured region, account eligibility, account quota or
  effective Polly AI-content opt-out were available to verify. AWS
  Organizations supports a Polly opt-out; that does not prove it is enabled
  for this account.
- Canary cost scenario: the 25 example sentences are 1,393 characters
  ($0.022288 at list price). The 28 blocked word requests add 170 characters
  ($0.002720) if pronunciation identities are later approved. The TTS scenario
  is $0.025008; 24 Imagen 4 images add a conditional $0.96, or $0.985008 total
  for one pass. One retry per request yields a conditional $1.970016. The
  executable spend authorization is $0.00 until the owner sets a cap.
- Image provider decision: the current Google Cloud Service Specific Terms
  page, updated 2026-10-08, prohibits use of Generative AI Services in online
  services directed toward or likely to be accessed by under-18 users; Imagen
  is blocked for VocabFlow. OpenAI Images is a conditional candidate: its
  business agreement assigns output to the customer and permits API use in
  Customer Applications, but it requires parental/guardian consent for minors
  using OpenAI Services and age-appropriate safety/privacy safeguards. Adobe
  allows commercial use of non-beta Firefly output, but business API
  entitlement, organization-specific Operations pricing and minor-scope terms
  remain unverified. No image provider is enabled.
- A one-retry-per-request OpenAI low-quality image scenario (24 square
  1024x1024 images, 196 output tokens/image), using a UTF-8-byte upper bound
  for prompt tokens and the full Polly list-price plan, estimates $0.503706
  before tax. This is a provider-specific planning scenario only, not an
  approved spend ceiling or executable quote. The proposed $3 cap remains
  pending owner approval. No paid provider request was sent; generated images,
  generated audio, Cloudinary uploads and Neon writes are all zero.
- The earlier $1.970016 one-retry figure belongs to the Imagen price scenario;
  the current Google under-18 restriction blocks that scenario for VocabFlow.
  The readiness report labels it blocked and separately records the conditional
  OpenAI low-quality estimate.

The manifest reports conditional provider price scenarios only. It is not an
authorization to spend.

## Data and Storage Boundary

- No Cloudinary request or URL generation.
- No Neon connection/write. Planned Neon destination remains the existing
  Development staging schema only.
- The US-56 media tables intentionally constrain `upload_eligible=false`;
  this plan does not change them. Rights-cleared commercial outputs should use
  additive `commercial_generated_media_*_v1` staging tables after a fresh
  runtime-role isolation check.
- Cloudinary public IDs are derived from a verified output SHA-256 under a
  distinct `content-v2` namespace with `overwrite=false`. No ID is assigned
  before bytes exist. The existing uploader needs a generated-output manifest
  adapter before any later apply.
- No runtime vocabulary, release state, learner progress or review history
  touched.
- Generated asset storage keys become output-content-hash keys only after the
  returned bytes are hashed and verified. Request keys are provider-neutral and
  do not pretend output bytes already exist.
- Human semantic review is required before an illustration maps to its Sense.
  Image candidates with poor standalone visual fit can be skipped. Shared
  images require identical approved semantics, not a matching headword.

## Focused Validation

```powershell
node --test scripts/us57-commercial-media-plan-v1.test.mjs
```

This verifies snapshot pinning, 5,616 effective targets, canary identity and
content hashes, exact example text, Lexeme-level word-audio dedupe,
pronunciation ambiguity handling, rights-gate fail-closed behavior,
provider-neutral request hashes, deterministic hash-derived Cloudinary and
staging mapping identities, fail-closed cost-gate evaluation, the current
provider/account preflight and zero-generation/upload/DB-write mode. Live
Cloudinary/Neon apply behavior is not exercised while outputs remain uncreated
and rights status remains UNKNOWN.

## Remaining Owner Decisions

1. Set a maximum authorized spend for one canary run (including retries).
2. Confirm VocabFlow user-age scope; this determines whether Imagen is eligible.
3. Choose and authorize provider accounts/terms; for AWS, confirm the applicable
   contract and the effective Polly service-improvement opt-out policy.
4. Review/approve canonical pronunciation identities and Lexeme crosswalks.
5. Review generated media and rights evidence before any Cloudinary or Neon
   staging apply.
