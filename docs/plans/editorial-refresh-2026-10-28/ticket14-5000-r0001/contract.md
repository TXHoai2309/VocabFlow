# Ticket 14 — Đợt mở rộng khoảng 5.000 mục, 31/10/2026

Status: TEXT_COMPLETE — 5,000 editor-authored entries across 50 topics. Media
execution requires a verified `READY_FOR_MUSE_MEDIA` packet; this document
alone does not start production. Owner requested one final ZIP and no repeated
coordinator polling. No media, database write or deployment is performed by
this text stage. The existing 1,547 selected entries remain unchanged.

## Production sequence

1. Codex reads `production-plan.json`, the 1,547-entry exclusion baseline, and
   the ID registry, then verifies input hashes. The owner reaffirmed on
   31/10/2026: Codex authors the text; Muse generates images and TTS only.
2. Codex builds the 5,000-item editorial draft in 100 recoverable batches of 50. Each
   entry has one teachable meaning, one bilingual example, a concise original
   English definition, POS, one primary topic and an estimated learning level.
   Audit duplicates across the whole draft and baseline before creating media.
   Freeze `dataset.json`; calculate every item content hash and the file hash.
3. Codex creates exactly three jobs per item: image, word audio and example audio.
   Pin job requests to the frozen content hash and exact text. Muse accepts
   only a `READY_FOR_MUSE_MEDIA` package containing the frozen text and all
   15,000 jobs, and generates actual
   files, retaining a checkpoint after each batch. Retry only failed jobs.
   Keep the frozen dataset, plan, registry, media jobs and input manifest
   unchanged; execution state belongs in new receipts and `progress.json`.
4. Muse validates bytes, hashes, PNG dimensions, decoded MP3 duration, exact mappings,
   all input identities and media coverage. Review every
   media alignment; record producer self-review honestly. Codex and the
   owner will perform acceptance after receipt; producer review is not that
   acceptance. Counts refer to delivered files, not queued jobs.
5. Deliver one ZIP64 archive named `vocabflow-expansion-5000-r0001-complete.zip`.
   It contains dataset, jobs, receipts, actual media, input pins, progress,
   sources and validation evidence. Preserve a checkpoint before ZIP creation.
   Use a download accessible to the signed-in owner; do not create public
   sharing without the owner's separate approval. A ZIP containing only links,
   nested ZIPs, placeholder media, or missing files is not a complete handoff.

If the platform cannot create/store/deliver one archive of the measured size,
report `BLOCKED_SINGLE_ZIP_DELIVERY`, exact completed counts and the platform
error, retaining the files/checkpoints. Do not silently split the final ZIP,
drop entries, convert a missing job into success or claim asynchronous work
continues after the execution has stopped. Provider limits are measured at
execution time; this contract promises no particular Muse limit or runtime.

## Identity and relationships

The coordinator preallocates authoring item/example/pronunciation/job UUIDv7
values once. They are proposal identities, not approved Master Lexeme/Sense
IDs. `masterLexemeId`, `masterSenseId` and `runtimeVocabularyId` remain null.
One item owns one example and one pronunciation record. The three jobs bind
to those exact records. Multiple learning sets reference the same item ID;
they do not clone the word or its future learning progress. Content hashes use
`sha256-utf8-json-sortkeys-compact-v1`, defined by the included validator.
Do not describe this hash as JCS or a canonical Master release hash.

File paths are ASCII, relative to the output root, and owned by job UUID:

- `media/images/<imageJobId>.png`
- `media/audio/words/<wordAudioJobId>.mp3`
- `media/audio/examples/<exampleAudioJobId>.mp3`

Every receipt identifies job, item, kind, dependency hash, path, SHA-256 and
byte length. Actual provider/model/voice details are recorded when observed;
unknown actual values are null, separately from requested settings. The
receipt represents a generated file; final acceptance remains pending.
Two slots may share bytes only when their exact requests genuinely match;
paths and receipts remain separate, with reuse attribution. An arbitrary
duplicate image or combined audio track cannot satisfy multiple requests.

## Content and classification

Target 5,000 genuinely additional lexical words or useful fixed phrases.
The 50-topic allocation and level totals are planning targets, not reasons to
invent awkward filler or assign unsupported CEFR levels. Record justified
reallocations and measured totals. One normalized headword is the default
counting unit in this run: do not repeat it as a different POS/sense or as a
British spelling, inflection, plural, capitalization or hyphen variant.
Potential distinct-sense additions are held separately for later review and
do not count toward 5,000. The count denotes selected pedagogical headword
records, not a verified count of canonical Master Lexemes or Senses. Closed-class
grammar headwords have explicit functions; ordinary noun plurals and verb tense
variants do not inflate the batch. Lexicalized plural-only meanings are reviewed
separately. Use US English as the preferred display/audio form.
The producer manually checks derivational families and semantic duplicates;
the mechanical validator only catches exact/variant matches.

Allowed word levels: FIRST_WORDS and A1–C2. FIRST_WORDS is curated separately
and has null CEFR. Other CEFR values must match their estimated level.
Classification is `EDITORIAL_ESTIMATE`, never official certification. If a
level is uncertain, record the uncertainty for later editorial review rather
than calling it certified. School grades are empty; age suitability is a
separate pedagogical note. Letter names, isolated phonemes, first-utterance
activities and complete dialogue lessons belong outside this lexical batch.

Vietnamese glosses and examples must be original, precise, natural and
appropriate to the intended learners. One example illustrates this exact
meaning; its translation preserves the same meaning. Avoid identical boilerplate
sentences and bulk dictionary copying. Do not fabricate IPA: leave it null
unless a verifiable pronunciation source and locator are recorded.
Record consulted sources and licenses, or explicitly `MODEL_AUTHORED_DRAFT`.
Do not assert exclusive ownership or independent review of unreviewed outputs.

## Media

Images: one clear, semantically specific educational scene, square 768×768 PNG,
consistent friendly illustration, no labels, watermark, brand or contact sheet.
Generate original visuals. For language and number concepts, a job may provide
`expectedGlyphs`: render only those exact necessary letters, numerals,
punctuation or short teaching forms. The general text-free rule does not remove
the very glyph needed to depict that concept. Accurate compositing of those
glyphs is allowed as a documented media-production step; do not substitute
scraped stock images or placeholder files.
Use a literal contextual scene for abstract meanings; a generic decorative
picture does not demonstrate a meaning. A supported larger square generation
may be resized to the requested 768×768, recording actual source dimensions and
the resizing step in its receipt. Then optimize PNG encoding losslessly.
Record actual final dimensions and size; never claim the source was natively
768×768 if it was resized. All 5,000 image slots are planned; missing images remain missing.

TTS: en-US, consistent clear female voice. Request the previously used
`avocado_v2:MAI_01`, speed 90 if actually available. Otherwise record the
available voice/config honestly and use it consistently. Word audio reads only
the frozen display form; example audio reads only the exact frozen English
sentence. No spoken labels, Vietnamese, numbering, music or added explanations.
Homographs require sense-appropriate pronunciation using the job's silent
POS/definition context. If necessary, a provider may produce a contextual
carrier phrase and isolate the exact word, recording the source text and crop
times in the receipt. The delivered clip contains only the requested word,
with its natural sense-correct pronunciation. If this cannot be achieved,
report a failed job rather than knowingly supplying another reading.
A zero-byte/header-only
file or a renamed text file is a failed job, even with the expected filename.

## Completion boundary

Production completion means 5,000 unique draft entries, 15,000 successful jobs,
15,000 actual media paths, computed file hashes, validated mappings, and one
downloadable tested archive. Actual shortages produce a PARTIAL result and
machine-readable missing jobs, never a COMPLETE label. Schema/file checks do
not prove all translations, CEFR judgments, image semantics or speech correct.
The returned package remains `DRAFT_PENDING_COORDINATOR_REVIEW`; import and
production deployment are separate subsequent work.
