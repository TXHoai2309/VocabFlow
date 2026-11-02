# Học từ YouTube/bài viết v1 — historical card-import proposal

Status override, 2026-11-01: SUPERSEDED AS ACTIVE DIRECTION by the owner's Q34
clarification. Q34 did not confirm this contract. The owner wants to learn inside
the original video with its voice and English/Vietnamese subtitles, not to convert
the source into flashcards. See `video-learning.discovery.md` for the active design.
The ≤30-card batch limit and card-first flow do not constrain video duration,
subtitle counts or learning segments. Prior answers below are preserved as history;
their applicability must be checked against the revised purpose. Practice/game
contracts remain confirmed. No implementation is authorized.

Status: READY FOR CONTRACT REVIEW. Product choices Q25–Q33 are accepted.
Whole-contract understanding of the complete flow/routine defaults is pending in
Q34. Practice/game product contracts are already confirmed. No implementation,
provider purchase, paid API call, schema change or deployment is requested.

## Accepted product boundaries

- Each import produces personal learning content, not an automatic shared-catalog
  publication (ADR 0005). The shared 6,544-entry catalog is not replaced or expanded
  by an individual's source selection.
- Q25: enter source → preview suggested words/phrases and context → select/edit
  → save a personal set. Do not automatically save every source token.
- Q26: if a URL cannot be read, support pasted text or imported SRT/VTT subtitles.
  This is a feature scope, not a request for the owner to upload a file now.
- Q27: match by meaning in context, not headword alone. Reuse an existing suitable
  sense and its progress; a genuinely new meaning is personal. Example: river bank
  must not be merged into the financial bank sense.
- Source sentence/link and timestamps when actually supplied stay with the personal
  source context. Do not mutate shared definitions/examples to match one article.
- Q28: text first: contextual Vietnamese meaning, original sentence/translation and
  source. Reuse suitable existing media; no new image or TTS generation in v1.
- Q29: require the existing account login before source analysis or personal-set
  saving. Guests retain existing public learning/practice/game access.
- Q30: personal sets can be studied with normal flashcards/scheduled review and
  used in practice/game when required media exists. Importing is not learning;
  reused senses keep existing progress, while new private senses start as new.
- Q31: AI may draft missing meaning/translation from the selected source context;
  the owner reviews/edits before saving. Show its draft status, not independent
  verification. Ambiguous meanings require selection, not a surface-word merge.
- Q32: one source per operation and at most 30 selected cards per enrichment/save
  batch; allow further batches. Long sources support explicit passage selection.
  No silent truncation, full playlists or crawling a whole website.
- Q33: only free allowance or an explicitly agreed quota; no new paid spending,
  purchase, upgrade or automatic paid fallback. Exhaustion stops automatic work
  visibly. A paid option needs a priced proposal/budget before any future use.

## Complete user flow for final understanding check

1. Sign in with the app's existing account and start a personal source import.
2. Enter one supported English YouTube/article URL, paste text, or import SRT/VTT.
   Show source acquisition progress and clear unsupported/empty/quota states.
3. Preview the extracted text/captions and select a passage when appropriate.
   Keep actual source metadata; manual text without timing has no invented timestamp.
4. Suggest words/phrases with source occurrences, then let the user select up to
   30. Suggestions alone do not create learned words, progress or shared content.
5. Resolve same-meaning matches before reuse; AI drafts only the missing selected
   text within the approved quota. Present editable meaning/translation and the
   original context separately, with a draft label where AI was used.
6. User reviews/selects the intended senses and saves a named personal set. Reuse
   existing suitable senses; new meanings remain private. Keep source context as
   personal placement/context, not as an overwrite of shared examples/definitions.
7. Open the saved set for normal learning/review, or eligible practice/game. Show
   the actual available modes/counts when private text-only items lack media.
   Continue another explicit batch for additional words; do not save the remainder
   automatically or repeat the same generation after a duplicate click.

This v1 creates study sets from sources. A full embedded video player, synchronized
reader/subtitle-click interface, source-video downloading, image generation and
TTS generation are not implicitly added by the agreed conversion flow.

## Verified source-acquisition facts

Official YouTube captions.download requires authorization and permission to edit
the video; captions.list is track metadata rather than transcript text. This does
not prove automatic extraction of every public video is impossible: it limits that
particular official API route.

Primary sources:
- https://developers.google.com/youtube/data/reference/rest/v3/captions/download
- https://developers.google.com/youtube/data/reference/rest/v3/captions/list

A documented third-party option exists: Supadata accepts a supported YouTube URL
with its own API key; no end-user YouTube ownership/OAuth step is documented in
that interface. Segmented transcripts can include text/offset/duration (milliseconds).
HTTP 202 job polling may be needed. Private/restricted/live sources can still fail,
and an English language preference does not guarantee English output. Its native,
auto and generate modes have different transcription behavior; do not automatically
enable AI fallback, paid processing or choose a plan by merely citing this option.

This is researched feasibility, not a selected service or a successful integration:
- https://docs.supadata.ai/api-reference/endpoint/transcript/transcript
- https://docs.supadata.ai/get-transcript
- https://docs.supadata.ai/api-reference/endpoint/transcript/transcript-get
- https://docs.supadata.ai/errors/transcript-unavailable
- https://docs.supadata.ai/web/scrape

No app integration for YouTube/transcript/article ingestion was found in the prior
bounded repo search. No provider subscription or paid API call has been performed.

## Explicit routine defaults for whole-contract review

- Same headword does not imply same sense. Match part of speech/context when
  available; preserve source inflections alongside the chosen learning headword.
  Uncertain matches stay suggestions until selected, not silently reused.
- Reuse suitable existing private meanings within their owner's sets as well as
  shared senses. Multiple source occurrences do not require duplicate progress
  identities; different meanings still remain different learning units.
- New private meanings default to unclassified where level evidence is absent.
  Do not claim official CEFR, Master PASS, or independent review because AI drafted
  text or the user selected a personal card.
- Borrow existing images/audio only with a valid content binding. Source sentences
  are not assigned unrelated example audio; no silent TTS/image generation or video
  thumbnail repurposing. Missing media stays explicitly missing.
- First-release personal-set management includes naming/renaming, removing items
  and deleting one's own set. Shared definitions/progress are never deleted or edited
  through private-set actions. Any personal wording correction keeps historical
  results/version context; a genuinely different sense requires a different identity.
- Saving is explicit and retry-safe. Duplicate requests do not create another set,
  sense or membership, reset a reused sense, or charge the same generation again.
  Partial failures remain visible; only valid user-reviewed cards are saved.
- Account ownership is server-authoritative. Other accounts and guests cannot read
  private source text, sets or progress. Local drafts cannot become visible to a
  different account after logout/login on the same device.
- English content is the v1 scope. Check actual extracted language, not merely a
  requested provider language. Unsupported/restricted/private/missing sources fall
  back to user-supplied text/subtitles; do not pretend content was extracted.
- Bound URL/text/file sizes, redirects and processing attempts. Never send cookies
  or stored app credentials to a supplied URL; block private-network/metadata URL
  fetches, and treat page/subtitle/AI text as untrusted data, not executable instructions.
- Keep saved cards' source context usable when an external link later disappears.
  This does not promise permanent storage of full videos/articles or a full offline
  synchronization feature. No automatic guest-to-account migration is added.
- Report quota availability/failures honestly. The user can supply text or edit
  missing fields manually, but manual text does not magically restore an exhausted
  AI quota. No automatic provider switching, paid retry or transcription generation.

## Implementation facts still to resolve before provider-enabled delivery

These are engineering prerequisites, not unanswered product choices or permission
to hide a nonfunctional integration behind mock data:

- Select and verify an actual transcript/extraction and text-assistance provider,
  credentials, free/approved allowance, rate limits and job behavior without printing
  secrets or incurring new charges. Supadata is a researched candidate only; no
  pricing tier or free allowance is promised by this brief.
- Define bounded processing/input limits consistent with those verified providers,
  per-account/global quota gates, idempotent jobs, cancellation/retry and safe fetches.
- Design private-content identity/ownership, normal learning authority, source
  context, migrations and API contracts. Do not bypass existing review authorization,
  overwrite shared owner-publication rows or reuse a public-only scope as private auth.
- Run the existing relevant UI/API/domain checks and trusted migration/integration
  checks when implementation reaches that stage. Fixture tests do not prove a live
  provider works. Missing quota/credentials must be reported as a delivery dependency.

## Acceptance examples for final understanding check

1. Import a source containing river bank when only financial bank is shared:
   preserve the context and offer/create the private river sense, not the wrong match.
2. Import an existing suitable sense into another personal set: retain its progress;
   merely saving a new private sense does not count as having learned it.
3. Select 31 candidates: request a smaller first batch or a second operation; no
   silent discard, automatic extra generation or hidden extra billing.
4. URL extraction fails: show why, allow text/SRT/VTT input and preserve the original
   link/context when supplied. Do not invent source text or precise video timing.
5. A new text-only private card can use flashcards; unavailable image/audio modes
   explain their missing content. No wrong image/example MP3 is borrowed to fill gaps.
6. An ambiguous/failed AI draft remains editable and visibly incomplete, not
   automatically published as verified. Saving needs the user's explicit selection.
7. Quota is zero/unknown: do not start an unapproved paid request; show the stopped
   state and manual options. Repeated clicks/retries cannot double-save or double-generate.
8. Account B cannot access A's source, set, draft or progress by guessing IDs; removing
   A's personal set does not delete a shared sense or another account's progress.

## Remaining product frontier

Q34 reopened the direction instead of confirming it. Continue the video-learning
design in `video-learning.discovery.md`; do not implement this historical import
proposal or present its exclusions as the owner's current requirements.
