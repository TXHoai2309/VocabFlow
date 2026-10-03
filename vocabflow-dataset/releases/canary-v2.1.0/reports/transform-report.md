# Master Vocabulary V2 → App Import V2 Transform Report

- Source dataset version: 2.1.0
- Source schema version: 2.0.1
- Source manifest status: APPROVED
- Source manifest JCS SHA-256: 6c80ef29049f925c8e4c331642eba4fd0222b78fc249d144913f573de8f96b6c
- App Import contract: app-import-v2
- Runtime projection contract: runtime-vocabulary-projection-v1
- Mode: RELEASE
- importEligible: true

## Counts

- Lexemes read from manifest pins: 6
- Senses considered: 8
- Senses projected: 8
- Senses skipped: 0
- Senses release-ineligible: 0
- App vocabulary mappings with an integer ID: 0
- App vocabulary mappings unresolved: 8
- Image URLs resolved: 0/8
- Word-audio URLs resolved: 0/8
- Legacy level mappings: 0/8
- Legacy topic mappings: 0/8
- Normalized app topic rows: 0
- Sense-topic membership rows: 0
- Learning Sets / membership rows: 1/1
- Duplicate projection fingerprints (review signal only): 0
- App Topic slug collisions: 0
- App Learning Set slug collisions: 0

## Selection and compatibility rules

- One vocabulary projection is produced per eligible Master Sense. Sense order is owning Lexeme displayOrder, normalizedLemma, Lexeme ID, then senseOrder and Sense ID.
- Translation: preferred eligible Vietnamese Translation first; then displayOrder and translationId. A deterministic first-row fallback is marked if none is preferred.
- Definition and example: eligible English row with the lowest displayOrder, then stable entity ID.
- IPA/audio: preferred en-US Sense override first; otherwise preferred en-US Lexeme pronunciation. Audio URL requires its own approved pinned media version and READY HTTPS delivery.
- Legacy topic: sole primary assignment; otherwise most-specific active topic, then code and Topic ID. All assignments also remain in the separate membership artifact.
- Legacy level: only an explicit active School Level under an active non-internal curriculum at grades 1–5 maps to GRADE_1–GRADE_5. CEFR, difficulty, age, exam, internal-demo grades and grades 6+ never map. Unknown remains null.
- PREVIEW forces all runtimeProjection.enabled values false. RELEASE is accepted only for a validator-clean APPROVED manifest; output is enabled only in that mode.

## Skips

- None

## Lossiness and Master-only information

- Multiple Topic assignments are reduced to one legacy vocabulary.topic string; full Sense→Topic memberships remain separately projected. Topic hierarchy is retained only as Master parent IDs in the topic artifact because runtime topics are flat.
- CEFR, difficulty, age groups, Domain, Exam, POS, curriculum metadata, provenance, translations beyond one Vietnamese choice, Vietnamese example translations, editorial notes and learning context are not current vocabulary DTO fields.
- Multiple pronunciations reduce to one preferred en-US IPA/audio selection. Image/audio prompt, QA, license, attribution, source locator, provider IDs and delivery URL identity are excluded from fingerprint semantics; only pinned asset/version/hash plus delivery-availability state is fingerprinted.
- Learning Set membership is a separate projection and never duplicates a vocabulary Sense. Runtime integer IDs remain unresolved and are not inferred from lemma or UUID.
- contentVersion is pending runtime reconciliation; it is intentionally not assigned by this offline transform.

## Row-level compatibility warnings

- MULTIPLE_PRONUNCIATIONS_REDUCED_TO_ONE_EN_US_SELECTION

## Runtime integration still required

- A future reviewed importer must persist explicit Master Sense ↔ app integer mappings, compare/store projection fingerprints transactionally, and derive contentVersion from the prior applied fingerprint.
- Runtime schema/API changes are needed to preserve Master UUID identity and source mapping without placing UUIDs in the legacy integer source_record_id. Existing progress/review IDs must not be recycled.
- Taxonomy and Learning Set mappings need explicit integer-ID reconciliation and a policy for app slug/name collisions. No database write or learner-history migration is part of this transform.
