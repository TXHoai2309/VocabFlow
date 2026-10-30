# Shared learning targets — coordinator proposal r0001

Status: PROPOSED_FOR_COMPATIBILITY_REVIEW. Offline interoperability only; no canonical allocation, DB migration, runtime approval or media production follows from this file. Keep vocabulary contracts/routes unchanged while a separate additive learning-item seam is reviewed.

## Target and progress identity

Use a tagged target union with distinct fields: `VOCABULARY_SENSE { vocabularyId: positive integer }`, `LETTER_ACTIVITY { activityId: canonical UUIDv7 }`, `UTTERANCE { utteranceId: canonical UUIDv7 }`. New IDs are allocated once by the coordinator at creation after reconciliation; current draft refs remain strings in draft-only namespaces and never persisted progress IDs.

Progress owner is learner plus resolved typed target. A letter is a content parent; A-name and A-sound are separate LETTER_ACTIVITY targets. An utterance is the target for its current context-recall activity; adding a different assessment objective later requires explicit progress-owner review, not automatic skill mastery. Placement, case glyph, translation, delivery URL, audio asset and content revision are excluded from the stable progress key. Same target reused in two sets has one progress; components of an utterance receive no vocabulary progress writes. Distinct types never collide even with the same display text.

## Revisions and stale submissions

Keep progress expectedRevision separate from target/content, presentation and pronunciation revisions. Queue stores a server-issued attempt/session reference, typed target and served revision pins. Review echoes those pins plus reviewId and expectedRevision. Exact replay returns the saved result; same reviewId with changed target/answer conflicts. Stale state or served content/audio is rejected and reconciled before the UI advances. Copy/translation changes do not reset progress; target identity changes use explicit new identity/history handling. English/audio dependency changes invalidate only relevant media bindings. All dependency hashes preserve their named algorithms; work-order hash and output byte hash remain distinct.

## Assessment and delivery phases

LETTER_ACTIVITY LISTEN_SELECT_LETTER_PAIR sends neutral instruction, three letter-pair options and valid target audio before answer. Correct letter/IPA/anchor/feedback are held by the authority until submission. Accessible names and any publicly delivered answer key must receive the same audit as visible text; cheating resistance is not claimed, but the interface must not state the answer. The server validates against its frozen option/answer set, not a client-supplied answer list.

UTTERANCE CONTEXT_LISTEN_RECALL shows context first, reveals target/direction/translation and audio on demand, and records a self-assessed result; play alone is not a review. Equivalent natural replies can exist, so this is practice of the presented target, not automated grading of free speech. Optional response turns remain supporting text without extra review/media jobs.

No automated speech scoring in this slice. For both branches keep sparse NEW, due-before-new, existing1/3/7/14/30scheduler, forgotten reset, household authorization and advance only after confirmed save. Typed adapter resolves identity before invoking unchanged scheduler.

## Persistence and count policy to review

Prefer additive foundation target/progress/review tables rather than weakening existing vocabulary foreign keys. Household ownership and review idempotency apply as today. A new separately versioned guest namespace for foundation targets should preserve existing guest.v1 data without rewriting it; durable saves remain serialized with Web Locks. Exact schema/migration is the coordinator's next implementation contract, not settled by this proposal.

Display and ledger counts separately: letters=6; letterActivities=12; utterances=12; newLexicalSenses=0. Vocabulary daily goals and the600lexical additions ledger stay unchanged. For compatibility fixtures, model independent bounded admission for new letter activities and new utterances; quota amount is a parameter, not a hardcoded or accepted product default. Empty scopes remain empty across guest/account. Discovery uses letters-sounds/first-utterances as independent dimensions; school grade and CEFR stay null in these drafts.

## Media

Current phase remains SPEC_ONLY. Letter-name and isolated-sound jobs have separate binding/locale/target and listening checks. Never treat TTS reading a character as proof it emitted the target isolated sound. Resolve phoneme-capable provider/recording capability with a small canary before mass sound generation. No image jobs for either submitted draft; glyphs use actual text. Utterance jobs pin exact full text and activity/presentation revision. Muse UI lease stays coordinator-owned; no parallel browser control of the same page.

Completion of compatibility review means both branches can map their draft refs into this proposed union, demonstrate preserved identity/counts/dependencies and identify concrete conflicts. It does not mean schema/API/progress persistence has shipped.
