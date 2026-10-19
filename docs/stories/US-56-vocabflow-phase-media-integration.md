# US-56 — VocabFlow Phase Media Integration

- Status: IN PROGRESS / DEVELOPMENT PREVIEW AND PRODUCTION PROPOSED IMAGE BACKFILL COMPLETE; VISUAL REVIEW, RIGHTS REVIEW, AND VERCEL PRODUCTION VERIFICATION PENDING
- Owner request: 2026-10-15, repository branch TXH.
- Scope: English Vocabulary 4600 media only. Oxford 5000 identity evidence may be
  used only through the Master V2 source crosswalk. The legacy 2000 Common media
  set is excluded.

## 1. User Story

As a vocabulary content maintainer, I want the original English Vocabulary 4600
images and audio mapped to Master V2 identities with source hashes and rights
evidence, so approved media can later be staged and uploaded without changing
Sense content or learner history.

## 2. Outcome

Create a source-specific, content-hash-deduplicated Media Manifest V2 and an
offline Cloudinary plan. Attach word pronunciation audio to a Lexeme only when
the exact source note, lemma, POS and authored group identity agree. Attach
sentence audio only when its text exactly matches the intended Sense example.
Attach images only to the intended Sense with semantic evidence. Keep uncertain
Sense mappings unresolved.

## 3. Source of Truth References

- Master Vocabulary V2 identity and staging contract: US-45.
- Media manifest and upload behavior: docs/media-manifest.md and
  docs/cloudinary-media-upload.md.
- Provider-neutral storage and metadata architecture:
  docs/architecture/technical-architecture.md.
- Source inventory: vocabflow-dataset/workspaces/full-source-inventory-dedupe.

## 4. In Scope

- Reuse the verified APKG audit while its pinned SHA matches; verify the source
  manifest, note identities, media hashes, decoding and reference integrity.
- Build a versioned English Vocabulary 4600 manifest with immutable source
  identity, media role, SHA-256, provider-neutral key, mapping evidence, rights
  status and upload eligibility.
- Build an offline Cloudinary plan from VocabFlow-local configuration only.
- Prepare an additive Neon staging integration that is idempotent and isolated
  from runtime vocabulary, progress, reviews and Sense approval state.

## 5. Out of Scope

- AI image or voice generation.
- Any media from the 2000 Common English Vocabulary dataset.
- Rights inference from local possession, a filename, or the APKG alone.
- Cloudinary canary or bulk upload while asset-level rights are unknown.
- Runtime vocabulary changes, learner history changes, Sense content/status
  changes, Production, commit, push or deploy.

## 6. Acceptance Criteria

- AC-01: Pin the APKG by path, byte length and SHA-256; compare every note ID,
  GUID and media-relevant source field with the original collection database.
- AC-02: Hash every numeric archive media entry, decode every supported image,
  fully decode every MP3, and distinguish physical files from reused hashes and
  reference occurrences.
- AC-03: Preserve raw bytes in the source APKG. Deduplicate the manifest by
  content SHA-256 and retain original archive entry and source note identities.
- AC-04: Require exact note identity, lemma, compatible POS and an authored
  group identity for a proposed Lexeme pronunciation mapping.
- AC-05: Require the correct validated Sense artifact and exact example-text
  match before mapping example audio. Require the correct Sense identity and
  semantic evidence before mapping an illustration. Keep ambiguity unresolved.
- AC-06: Mark every asset without individual rights evidence
  UNKNOWN_REVIEW_REQUIRED and uploadEligible false.
- AC-07: Keep Cloudinary in offline-plan mode unless rights are cleared. Do not
  issue upload requests when eligibility is zero.
- AC-08: Write media metadata only to additive tables in
  vocabflow_editorial_staging after the requested target identity snapshot is
  verified. Never update runtime vocabulary, progress/review tables, or
  draft/approved Sense states.
- AC-09: Verify the final plan, hashes, rights counts, mapping integrity and
  unchanged runtime boundary.

## 7. Current Acceptance Evidence

- APKG SHA-256 `495077028ede6f4de9ff166c605673da379ac4ce32113e49099f6d8e28ffbd6b`;
  13,986 numeric media entries; 4,673 source notes verified by note ID/GUID and
  source fields. The manifest APKG SHA still matches, so the archive was not
  re-inventoried during mapping recovery.
- 4,669 images, 4,649 word-audio filenames, 4,669 example-audio filenames and
  9,317 audio files total. Full image and MP3 decoding passed; 13,986 physical
  files are valid, nine repeated files across nine duplicate hashes deduplicate
  to 13,977 content hashes, and no physical source file is orphaned.
- Verified Development is project `shy-hill-72364426`, branch
  `br-square-grass-b3af0nte`, database `neondb`. The current snapshot confirms
  7,451 identities, 5,616 effective DRAFT projections, 1,689 pending content,
  and 146 pending version decisions. Snapshot SHA-256 is
  `ed5728a635234a1fb3c8771f8d2ed19041866106a10e04430abe5b31d89a9f3b`; stable
  fingerprint is
  `217c272765f80e92319b928740176ec6685527ff56de74d891bf16052cb7106b`.
  All 5,616 current projections are DRAFT and have matching identity/draft
  hashes. Candidate-version history has 5,043 selected rows; 573 recovered
  projections have no `candidate_versions` row but retain registered batch
  lineage and matching effective hashes.
- Source-provenance mapping found 4,226 word-audio reference rows for 4,210
  distinct Lexeme identities using source-note, lemma, POS and pronunciation
  evidence. Image mapping proposed 2,981 reference rows to 2,979 unique Sense
  proposals using pinned note provenance and semantic comparison; all remain
  pending visual review. 93 image references are ambiguous, 1,537 are source
  candidates for non-effective identities, and 63 have no verified Sense
  candidate. No image maps to a pending Sense.
- Example audio has 0 exact-text matches, 3,746 text mismatches and 928
  unresolved references. Mismatched audio was not linked to a Sense.
- Development staging contains 13,977 deduplicated asset rows, 14,012 mapping
  rows and 13,977 per-asset rights rows. Exact readback and a second idempotent
  run passed. `vocabflow_runtime` has no usage/create permission on the staging
  schema; runtime table counts are unchanged. No binary media or Sense content
  or status was written.
- All 13,977 assets remain `UNKNOWN_REVIEW_REQUIRED`; Cloudinary remains
  `OFFLINE_PLAN_ONLY` with zero eligible or uploaded assets. The prior 3,646
  target was historical and is superseded by the verified 5,616 snapshot.
- Detailed artifacts: `vocabflow-dataset/workspaces/english-vocabulary-4600-media-v2`.

## 8. Definition of Done

The source manifest, current-effective snapshot and offline mapping bundle
validate; Development metadata staging is verified and idempotent; runtime
vocabulary and learner history remain unchanged. Image proposals still need
visual review, example audio with mismatched text stays unresolved, and rights
need asset-level clearance before any Cloudinary canary or upload.

## 9. Open Questions and Blockers

- What asset-level license or written permission covers the third-party images
  and audio in the 4600 deck?
- Which Sense image proposals pass human visual review, and is any example audio
  text mismatch an explicitly allowed equivalent under the mapping contract?
- 573 current-effective DRAFT projections have matching hashes and recovery
  batch lineage but no `candidate_versions` history row; keep this exception
  visible in subsequent reconciliation.

## 10. US-56.1 Media Review & Rights Resolution

- Development-only review desk: `http://127.0.0.1:5173/dev/media-review`; API is
  loopback-only on port 3004 and requires the explicit local opt-in.
- Review displays original APKG previews, source note identity, target Sense or
  Lexeme evidence, content fingerprints, rights status, and full mapping
  evidence. Image, word-audio, example-audio and rights queues are paged and
  filterable. Selected-image batch actions apply only to the current page;
  ambiguous targets cannot be bulk accepted.
- Mapping and rights decisions append to `media_mapping_review_events_v1` and
  `media_rights_review_events_v1` in the verified Development staging schema.
  Events pin source hash/note, target fingerprint, reviewer identity and time;
  unique idempotency keys require an exact event hash on replay. Runtime roles
  have no staging schema access; no decision event has been submitted yet.
- Current snapshot SHA-256 is
  `ed5728a635234a1fb3c8771f8d2ed19041866106a10e04430abe5b31d89a9f3b`; the
  live target remains 7,451 identities / 5,616 effective DRAFT Sense
  projections. The projection has 5,043 selected `candidate_versions` rows
  and 573 recovered rows without version history, but with verified batch
  lineage and matching hashes; no Sense content or status changed.
- Image proposals: 2,981 source mapping rows / 2,979 unique effective Sense
  candidates. Accepted, rejected, ambiguous and needs-review counts all remain
  zero pending reviewer action. Word audio: 4,226 proposed rows / 4,210 Lexeme
  identities, with no audio decisions submitted. Across 4,664 word-audio
  mapping references, 375 remain pending target selection and 63 have no
  verified Lexeme target. Eight Lexeme identities are associated with multiple
  source POS classes; seven share the same source IPA, while `tear` has distinct
  source IPA forms (`/tɛː/`, `/tɪr/`) and is surfaced as a possible homograph or
  pronunciation variant for reviewer resolution.
- Reclassified 4,674 example-audio rows under
  `safe-punctuation-whitespace-v1`: 0 exact, 0 safe-normalized, 3,766 different
  sentences and 908 unresolved. The old bundle split was 3,746 mismatch / 928
  unresolved; 20 previously unresolved rows now have effective Sense
  candidates to compare and remain `DIFFERENT_SENTENCE`. Source associations
  are preserved; no example link is accepted.
- Rights evidence currently consists only of a deck-page CC BY-NC notice and a
  license-scope reference. Neither proves rights for an individual embedded
  image or audio file. All 13,977 hashes remain
  `UNKNOWN_REVIEW_REQUIRED`; none are cleared. The cited CC BY-NC terms are
  noncommercial only for material actually covered, so commercial use still
  requires other permission or a separate license.
- Cloudinary remains `OFFLINE_PLAN_ONLY`: 0 eligible, 13,977 blocked, no
  canary, no upload and no public URL. Readiness outputs are
  `media-review-readiness-v1.json`,
  `cloudinary-eligible-media-review-v1.json`, and
  `cloudinary-blocked-media-review-v1.json` in the media workspace.
- Validation: US-56 mapping suite 7/7, review-contract suite 6/6, source-byte
  preview suite 2/2, focused web TypeScript build and API syntax check pass.
  Live Development snapshot/lineage and staging readback pass; runtime staging
  access, vocabulary writes and learner-history writes are all false. One
  source image preview re-read the original APKG bytes and matched its pinned
  SHA-256. No owner review decisions or external uploads were made.

## 11. Development-only learning media preview

- Owner authorized local Development use for personal study/testing. This does
  not clear rights, permit redistribution, change the commercial gate, or
  permit Cloudinary upload. All source assets retain
  `UNKNOWN_REVIEW_REQUIRED` unless a separate evidence-backed decision exists.
- `/dev/staging-preview` now shows a media panel for the selected effective
  Sense. It defaults to `Accepted only`; images require `ACCEPT_MAPPING` to
  that Sense/content hash and word audio requires an accepted Lexeme outcome,
  exact normalized headword and compatible POS. Each accepted IPA/pronunciation
  remains a separate manual playback choice. Example audio requires an accepted
  target example and a fresh exact or safe-punctuation/whitespace comparison.
  Conflicting example clips are left unresolved. Candidate audio with a
  different sentence remains available only on Media Review with its
  source/mismatch label.
- The owner-requested `Include proposed` view is opt-in and read-only. It shows
  source-verified image and word-audio proposals only when the mapping snapshot,
  current effective Sense identity and content hash still agree. Every card
  carries the proposed label, source note identity, mapping evidence, target
  fingerprint and current rights status. `AMBIGUOUS_SENSE_MAPPING` stays in a
  separate section. It never creates a review event or marks rights cleared.
- Multi-IPA and multi-POS Lexeme pronunciation candidates stay in a separate
  manual-choice list. Homograph audio whose source POS differs from the
  selected Sense is visibly labelled as a Lexeme variant and is not attached
  to that Sense. Example-audio mismatch rows are never returned next to a V2
  example; they remain available with their mismatch label in Media Review.
- Every resolver response rechecks the live effective DRAFT hash, source note
  evidence and pinned mapping snapshot. Asset links use manifest SHA-256 keys;
  the server reads only numeric archive entries from the pinned APKG, verifies
  bytes and MIME, and binds only to localhost. The raw archive and media are not
  copied into the client build. No new Neon rows or decisions are written.
- Current live review state has zero accepted image, word-audio or example
  mappings and zero review/right events. Therefore the panel's Accepted-only
  view correctly shows fallbacks until a reviewer confirms mappings. With
  Include proposed enabled, `tear` exposes `/tɛː/` and `/tɪr/` as separate
  manually playable options; `/tɪr/` is labelled as a source-POS mismatch for
  the current verb Sense, and neither variant is selected by default.
- Validation: focused resolver tests 4/4; TypeScript build check and production
  client build pass. The built JS contains no Development route or resolver URL
  strings and the output has no raw APKG/image/audio files. Local image and MP3
  endpoint responses returned `image/jpeg`/`audio/mpeg`, matched their pinned
  hashes, and carried `no-store`/`nosniff`; a traversal attempt returned 404.
  Live staging readback retained 5,616 effective DRAFT, 1,689 pending content
  and 146 pending version identities. No Cloudinary, rights, learner-history,
  runtime or Sense content/status changes occurred.
- Limitation: in-app browser visual/playback verification was blocked by its
  local URL policy for `127.0.0.1`; direct loopback endpoint checks passed.
  Focused ESLint was unavailable because `@babel/core` is missing from the
  installed `eslint-plugin-react-hooks` dependency.

### US-56 Development proposed-media preview continuation (2026-10-15)

- Keep the current-effective snapshot `217c272765f80e92319b928740176ec6685527ff56de74d891bf16052cb7106b` and all existing US-56 review artifacts. Add a default-off `Include proposed` toggle; no pipeline rebuild or new authoring phase.
- Validate ten live effective Sense image proposals and ten Lexeme pronunciation proposals from pinned mappings. Re-read source image/audio bytes through the loopback resolver and verify direct response SHA-256 and MIME (`image/jpeg`, `audio/mpeg`). A real ambiguous image mapping for `issue` is returned only in the ambiguous bucket.
- Verify `tear` offers the two pinned IPA variants `/tɛː/` and `/tɪr/` separately; the noun-source audio is labelled POS-mismatched for the current verb Sense. No option is preselected. A missing-media Sense returns empty proposal lists and keeps fallbacks.
- Verify an example-audio source classified as `UNRESOLVED_EXAMPLE_TEXT_MISMATCH` is not present alongside its current V2 examples. Accepted-only remains unchanged. Development readback reports zero image/word/example review events; this work sends no review decision and no Neon write.
- Resolver tests pass 6/6, web TypeScript check passes, API syntax check passes, and Vite production build passes. Production JS/CSS/HTML contains no dev media/staging route markers or APKG markers and no raw media files. No runtime, learner progress, review history, Sense text/status, rights status, Cloudinary or Production changes.
- The preview-component RTL test is checked in and typechecks, but its Vitest run could not start because the local jsdom dependency chain cannot resolve `is-potential-custom-element-name`. Manual browser rendering/playback also remains unverified because the local `127.0.0.1` browser surface was blocked by its URL policy. The exact endpoints and source bytes were verified directly; user can inspect the running local preview at `http://127.0.0.1:5173/dev/staging-preview`.

## 12. Owner-reported rights claim (2026-10-18)

- The owner states in chat that all source images and audio have been licensed
  for use and requests that they be opened in Production. This statement is
  recorded as an owner attestation; it is not a rights-review decision.
- The current readiness artifact reports 13,977 hashes as
  `UNKNOWN_REVIEW_REQUIRED`, zero rights-review events, and one accepted
  word-audio mapping. No image mapping is accepted; example audio has zero
  exact/safe matches, 3,766 different sentences, and 908 unresolved rows.
- The recorded source-page CC BY-NC notice is insufficient to clear embedded
  assets under the review contract. A clearance decision still needs a
  verifiable HTTPS license/permission record covering the source assets, the
  rights holder, intended public use scope, and applicable attribution terms.
  Production media stays withheld until rights and mapping gates pass.

## 13. V2 Production image coverage backfill (2026-10-19)

- Applied an idempotent, serializable, compare-and-set update to the verified
  Neon V2 Production projection only. The update changed only
  `development_media.images`; no canonical Sense content, content hash,
  review status, rights status, learner progress, review history, topics, or
  learning-set counts changed.
- Added 3,937 source-reference mapping rows for 3,936 current target Senses;
  these use 3,932 unique physical source image hashes from 4,669 inventory
  image assets; 737 inventory hashes are not used by the selected mappings.
  All mappings remain PROPOSED
  with `UNKNOWN_REVIEW_REQUIRED` rights and no visual review. No media was
  uploaded. A second dry run returned zero planned row changes.
- The API now returns a mapped image only when the mapping pins the exact
  current Sense identity and content hash and the signed authenticated
  Cloudinary URL, resource type, MIME, V2 namespace, and owner attestation
  validate. Repeated source references to one hash are safe to deduplicate;
  different current hashes stay unresolved. WebP image delivery is supported.
- Vocabulary detail no longer reserves a blank image panel without an
  eligible URL; failed image delivery has a compact fallback and image error
  state resets when navigating to another Sense.
- Validation: 7 focused test files / 47 tests PASS; Web TypeScript check PASS;
  workspace production build PASS. Full workspace typecheck still reports
  errors in unrelated pre-existing local scripts. Production deployment and
  browser verification were not performed: Vercel Production attestation
  configuration could not be read through the connected account scope.
- Sample outcomes: `banana`, `abolish`, and `advertise` have current proposed
  mappings. `ahead` is withheld because the source note is adjective and the
  target is adverb. The historical-period `age` Sense does not match the
  available source meaning; the years-lived `age` Sense scores below the
  conservative candidate threshold. The mappings remain unreviewed and
  rights-unknown.
