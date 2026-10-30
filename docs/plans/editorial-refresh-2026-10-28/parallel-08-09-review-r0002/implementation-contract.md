# Foundation pilot08/09 — concrete local implementation contract

Status: READY FOR CONTRACT REVIEW. This is the proposed next implementation wave, not owner acceptance or permission to execute. AGENTS.md section2 requires the owner's contract review before READY FOR IMPLEMENTATION. Two completed offline workers cover contracts/drafts only.

## User outcome and bounded content

Enable local “Làm quen chữ và âm” for six letters A/I/M/S/F/T, with twelve independent listening activities (six letter names, six selected sounds). Enable local “Câu đầu tiên” for twelve complete contextual utterances in four groups. Grade/CEFR remain independent and null for these drafts. Keep the existing vocabulary pilot and all vocabulary identities/progress intact. New lexical additions count remains0; this wave is24foundation learning targets, not24new words or completion of the600-word campaign.

Inputs: corrected ticket08-draft-r0002 and ticket09-draft-r0001. The coordinator forward mapping `mapped-targets-r0002.json` pins both and preserves original audio target dependencies. Worker09compat-r0001 still describes historical08r0001; its passing reference canaries are not proof that corrected app delivery exists. Historical files stay immutable.

## Shared identity and review contract

Discriminant is `itemType`. The resolved target union is VOCABULARY_SENSE/vocabularyId integer, LETTER_ACTIVITY/activityId UUIDv7, UTTERANCE/utteranceId UUIDv7. Existing vocabulary routes and DTOs remain unchanged. Coordinator allocates each new canonical ID once in a versioned registry after reconciliation and freezes it; draft refs and synthetic fixture IDs never become persisted progress IDs. Letter parent IDs and activity/utterance IDs are separate identities.

Stable progress is learner plus typed resolved target, independent of collection/glyph/translation/media/content revision. A-name and A-sound stay separate; utterance reviews never update component-word progress. Same activity/item reused in two collections shares progress. expectedRevision is progress state, distinct from served target/presentation/pronunciation revisions. Letters currently target1/presentation2/pronunciation1; utterances retain original revisions. Audio binding revisions include actual spoken target dependencies, so a neutral instruction correction does not invalidate unchanged spoken audio.

For new foundation letter submissions choose opaque `selectedOptionKey`, not selectedLetterId (the worker09canary's older illustrative field). Freeze options/answer at the authority using server-issued attemptRef; reject options supplied by the client as an answer key. The authority validates the matching attempt, served revisions and expectedRevision and derives correctness. Exact reviewId replay returns the original result before stale checks, a changed payload conflicts, and failed save does not advance. Utterance submission is SELF_RECALL REMEMBERED/FORGOTTEN; synonyms are not automatically marked wrong, and opening/reveal/audio is not a review. Preserve current sparse NEW, due-before-new,1/3/7/14/30scheduler and household authorization.

## Local persistence and API boundary

Propose additive foundation item/activity/presentation/collection/binding tables and separate foundation progress/review/attempt persistence. Preserve lexical foreign keys and existing guest.v1. Before migration, coordinator finalizes concrete columns, indexes, constraints and reviewed schema diff under the trusted executor; capture local backup and table/security/history fingerprints. No remote DB, broad role grant, reset or migration history rewrite.

Use new same-origin `/api/public/foundation/*` reads and `/api/learners/:learnerId/foundation/*` authorized catalog/queue/attempt/review routes rather than broadening integer vocabulary fields. Exact request/response schemas and HTTP401/403/404/conflict outcomes are implementation deliverables. Public content contains published local item metadata only; account progress requires existing household ownership. Public APIs never read learner progress. Production stays disabled until a separate release.

Guest foundation state uses a separately versioned `vocabflow.foundation-guest.v1` namespace; keep vocabulary guest.v1 unchanged. Validate, serialize with Web Locks and save receipt/state before advancing. No automatic guest-to-account transfer. Account authority is server-side; guest has the existing explicit device-local exception. Real migration, quota-day boundaries, retries/races and save-failure behavior require integration tests, not the fake-authority fixture alone.

## Counts and existing setup — owner correction

Owner pointed out that session quantity is already selected in setup. Reuse the
existing5/10/20/30session-capacity control and show the relevant unit (hoạt động
chữ/âm or câu). Remove the proposed independent10+10daily New limits. Session
capacity and daily New allowance are different concepts: this correction adds
no new daily quota and does not reinterpret the chosen session count as one.

Preserve current vocabulary daily limits/goals and scheduler. Foundation
activities and utterances do not silently consume or inflate vocabulary word
allowances, word goals or the600new lexical additions ledger. Foundation queue
uses the selected session capacity with due-first selection and distinct typed
progress owners; any future additional daily foundation quota needs a separate
product decision. Repeat receipt/reuse in another collection never duplicates
progress. Empty scopes remain empty. Show6letters/12activities and12utterances
separately and preserve current account/guest setup behavior.

## UI and assessment phases

Reuse incumbent controls/design. “Mức học” can route to the relevant typed foundation catalog, with scope preserved through setup/study; no foundation token stored as CEFR. Do not apply lexical topic/grade filters to foundation by widening or inventing mappings; unsupported combinations remain unavailable or empty explicitly. Show correct type/count and honest empty/media-pending states. No new mastery claim for speaking.

For letters deliver only neutral pre-answer instruction, shuffled glyph options, opaque attempt/audio/option handles and neutral accessible labels. The full coordinator mapping/authorityContent/answer keys are private authoring/authority data and must not be served as the pre-answer DTO. Teaching/explanation reveal invalidates that blind attempt and cannot record a graded success; a fresh assessed attempt is issued later. UI/DOM/accessibility/network review must verify no target IPA/anchor/correct answer leaks through labels/metadata. Raw glyph options are allowed and not labeled as answers.

Utterance phase starts with context, reveals EN/VI and audio on request and saves self-assessment only after a deliberate choice. Supporting response text adds no extra progress. If audio is absent/unaccepted, listening-assessed letter activity cannot begin; utterance text practice may be labeled text-only, never claim playable audio. Both learner and guest flows must be checked on390/1440widths.

## Media wave and provider capability

Proposed media scope:24audio targets (6letter names+6isolated sounds+12utterances),0generatedimages. Existing Muse voice Aria/en-US is a candidate for name/utterance consistency, not proof of phoneme capability. Coordinator owns browser lease and new work orders; freeze provider/config/exact payload and named request/dependency hashes before each canary. Preserve attempt receipts and content-addressed asset names, output bytes/MIME/duration and rights records.

Before bulk generation, test one letter name, its selected isolated sound and one utterance. In particular, /æ/ must be an isolated target rather than the name of A or spoken IPA notation. If Muse cannot do the isolated sound correctly, keep those6sound jobs pending and return concrete evidence/options; no fabricated substitute or automatic paid provider switch. Human listening is required for selected sounds; ASR text match is insufficient. Reuse exact bytes only with reviewed binding and rights. Gallery/listening approval follows actual outputs. Local review does not imply production/commercial clearance.

## Parallel ownership after approval

This chat finalizes shared registry/contracts/schema/API/progress/guest adapter and integration tests. Two manually opened worker chats can implement isolated branch views/tests (`foundation-letters/*` and `foundation-utterances/*`) against the frozen shared interface, returning patches for shared routing/styles to coordinator. Assign file leases before dispatch so workers do not modify packages/contracts, guest-store, route registry or migration files concurrently. Coordinator produces Muse media sequentially under one browser lease while branch UI work can run in parallel. This is proposed dispatch, not proof that any chat is running it.

## Acceptance and exclusions

Required evidence: all source/asset pins, accepted acoustic outputs, same target/shared progress across two collections, A-name vs A-sound isolation, utterance/component isolation, exact zero scope, household authz, idempotent/conflicting replay, stale state/served pins, durable-save failure without UI advance, session-capacity/deduplication consistency, preserved lexical progress/history and guest.v1, local backup/migration evidence, desktop/mobile/accessibility and actual media playback. Run appropriate repo checks and distinguish existing script failures from new regressions.

Full08/09tickets remain open until runnable local content/media/acceptance exists. This contract excludes expansion to all26letters, slot-pattern activities, automatic speech grading, public/CDN deployment,600new lexical items and bulk10–14execution. Those are separate frontier work.
