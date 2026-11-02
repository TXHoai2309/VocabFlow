# Practice, games and learning from links — discovery

Status: DISCOVERY COMPLETE — PRACTICE/GAME/VIDEO V1 CONTRACTS AND PLAN CONFIRMED.

Q44 closed the video first-release product frontier and confirmed the consolidated
plan. Current contracts: `practice-v1.proposed.md` (Q14), `game-v1.proposed.md`
(Q24), `video-learning-v1.proposed.md` (Q44). Articles and later video modes are
explicit future work, not missing decisions for these first releases. Provider/
quota verification and technical story design remain prerequisites for later
implementation; no coding or rollout was requested by this confirmation.

Current direction after Q34: VIDEO LEARNING DISCOVERY. The owner corrected the
card-import framing: learn with the original YouTube video/voice and EN/VI
subtitles. `video-learning.discovery.md` is active; the prior card-first contract
and final-review request are superseded, not approved. Practice/game are unchanged.
No implementation, schema changes, import, generation or deployment is authorized
by this discovery document. Round 2 product decisions are accepted below;
all product choices Q2–Q13 and the complete brief were confirmed in Q14. The owner
chose game discovery next. Q24 then confirmed the complete game brief and chose
link-learning discovery next. Neither reply requested implementation.

## Owner input — round 1

The owner wants review, practice through images, audio and a combination of cues;
games such as shooting fish with word completion; learning from YouTube links;
and converting an English web article/link into vocabulary to learn. The repeated
mention of combined practice is recorded as one idea, not two agreed features.

## Existing facts

- Vocabulary discovery, saved/weak words, study setup, flashcards, exercise study,
  progress and settings already have routes in `apps/web/src/App.tsx`.
- `apps/web/src/features/study/exercise-generator.ts` defines meaning multiple
  choice, listening choice, image-to-word and typing. Typing supports Vietnamese,
  image, audio, definition and example cues. Existing primitives do not by
  themselves prove the requested dedicated practice experience is complete.
- Presentation preferences Tự nhớ / Dễ làm quen / Chi tiết are distinct from
  review scheduling. Their existing meaning must not be overloaded.
- Shared catalog publication is recorded as 6,544 entries. Current local sources
  and media are under `D:/hoctienganh/VocabFlow-data`; this discovery does not
  change database counts or declare a new production feature acceptance.
- Foundation letters/sounds and utterances remain separate from lexical senses.

## Design tree

1. Scope and priority — practice, then one game, then learning from links (ACCEPTED).
   - Practice modes: image, audio and combined.
     - Free-practice results do not change review scheduling — ACCEPTED.
     - Learned-word default with explicit alternative scope — ACCEPTED.
     - Four-English-word choice or typed English response; choice default — ACCEPTED.
     - Combined mode alternates image/audio questions — ACCEPTED.
     - Strict modality with retry/skip on media failure, not a wrong answer — ACCEPTED.
     - Separate history: account sync, guests on device — ACCEPTED.
     - No existing XP/streak credit for practice v1 — ACCEPTED.
     - 5/10/20/30, default 10, untimed, unique initial targets — ACCEPTED.
     - First answer counted; pre-answer reveal is separate — ACCEPTED.
     - Same-device continuation; account results sync — ACCEPTED.
     - Whole first-release brief and routine defaults — CONFIRMED IN Q14.
   - Games: shooting-fish / word-completion example.
     - First game example: shooting fish with vocabulary — OWNER REQUESTED.
     - Typed English answer triggers automatic fish hit — ACCEPTED IN Q15.
     - Relaxed/untimed, personal points without XP/streak — ACCEPTED Q16/Q17.
     - Reuse practice sources and image/audio/combined cues — ACCEPTED Q18.
     - Continuous play, hearts and zero-heart defeat — OWNER REVISION.
     - Five starting hearts; loss events; scoped expansion; continuation — ACCEPTED Q21–Q23.
     - +10/0 score, record grouping and complete game brief — CONFIRMED Q24.
     - End-to-end cases and final understanding — CONFIRMED Q24.
     - Mobile-first and all-ages context remain the existing product baseline;
       no new reflex-heavy control or child-only style has been accepted.
   - Learning from YouTube or English web links.
     - Personal content by default; no automatic shared publication — ACCEPTED.
     - Official YouTube transcript-access constraints — VERIFIED BELOW.
     - Preview/edit/select before saving; manual text/subtitle fallback — ACCEPTED Q25/Q26.
     - Reuse only matching senses; private new meanings and source context — ACCEPTED Q27.
     - Text-first/reused media; account-only; normal study/review and eligible practice/game — ACCEPTED Q28–Q30.
     - AI draft/review; one source and ≤30 selected cards per batch; no new costs — ACCEPTED Q31–Q33.
     - Complete link contract and explicit quality/recovery defaults — FINAL REVIEW Q34.
2. Practice acceptance scenarios and scope — CONFIRMED IN Q14.
3. Game understanding — CONFIRMED Q24; link understanding — PENDING.

## Round 2 decisions — owner accepted

- Priority: practice controls using existing media, then one game, then link-based
  learning. Finish the first practice contract before designing later releases.
- Repetition semantics: free practice/games record their own results
  without automatically moving scheduled review dates; official review remains
  responsible for scheduled-review updates. Example: answering the same word ten
  times in a game must have an explicitly agreed scheduling effect.
- Imported content ownership: personal learning content by default, with
  no automatic publication into the shared 6,544-entry catalog.

Recorded the accepted terms in GLOSSARY and boundaries in ADRs 0004/0005. The owner
has not accepted a detailed implementation contract or authorized coding.

## Further verified facts

Current exercise first attempts submit through the normal review write and update
scheduled progress. Reinforcement within the same session is separate, but the
existing summary action to review wrong words starts fresh persisted attempts.
Do not relabel either existing path as non-scheduling practice without changes.
References: `apps/web/src/features/study/study-page.tsx`,
`apps/api/src/reviews.ts`, `apps/web/src/features/guest/learning-fetch.ts`.

No user-facing YouTube/article ingestion integration was found in the bounded
app/package/dependency search. Official YouTube captions.download requires OAuth
and permission to edit the video; a public URL/API key is insufficient for arbitrary
videos. captions.list returns track metadata, not caption text. The documented
IFrame API exposes caption-display options, not transcript-text export. The link
release must decide supported sources and fallback input rather than promise every
YouTube URL can be converted. Official sources:
[captions.download](https://developers.google.com/youtube/data/reference/rest/v3/captions/download),
[captions.list](https://developers.google.com/youtube/data/reference/rest/v3/captions/list),
[IFrame API](https://developers.google.com/youtube/iframe_api_reference).

## Round 3 decisions — owner accepted all recommendations

- Starting vocabulary: learned words by default, with explicit selection
  of another learning set/scope; do not silently draw from the entire catalog.
- Answer interaction: a choice between selecting one of four English words
  and typing the English word; default to choice.
- Combined practice: alternate image and audio questions within the same session.
- An empty learned-word pool leads to an explicit learning-set choice; it does
  not silently widen to unseen words. This was included in the accepted proposal.

The owner's reply was “đồng ý với các đề xuất”; this explicitly accepts Q5–Q7,
not future proposals. Added the resolved practice-mode meanings to GLOSSARY.

## Round 4 decisions — owner accepted

- Strict modality: keep the chosen image/audio modality when media is
  missing or fails; offer retry/skip and report unavailable content, without
  counting a technical failure as a learner mistake or substituting another cue.
- Result history: store practice sessions/results separately from review
  history, with summaries of attempted/correct/incorrect/skipped content. Account
  history would sync; guest practice would remain on that device. Exact persistence,
  interrupted-session and per-attempt semantics still need the first-release contract.
- Rewards: record practice progress without awarding existing review XP or extending
  the existing streak in the first release. Game rewards remain a later decision;
  this acceptance does not approve a game scoring system.

## Round 5 decisions — owner accepted

- Session: select 5/10/20/30 questions, default 10, no countdown. First pass has
  unique target words; show actual eligible count when the selected pool is smaller,
  without widening the selected scope.
- Answer/result: first submitted answer controls first-pass correctness. Replays of
  the cue audio are allowed. Revealing an answer before submission is a separate
  “Đã xem” result, excluded from the answered correctness denominator. A later
  optional wrong-answer practice round does not rewrite earlier results.
- Interrupted session: resume on the same device in v1. Account result
  history sync remains accepted; cross-device continuation of the active cursor
  is deferred for this release.

Concrete practice-v1 brief: `practice-v1.proposed.md`, PRODUCT CONTRACT CONFIRMED.
The owner confirmed all requirements/routine defaults and chose game design next.
This does not imply coding authorization.

The practice frontier is closed for product discovery, including explicit routine
defaults and acceptance examples. Q14 confirmed shared understanding and game
discovery as the next step. Implementation still needs the owner's request.
The invoked grilling skill says: “Do not act on it until the user confirms you have
reached a shared understanding.”
Game and source-import details remain explicit later-release branches, not silently
accepted requirements. Keep questions dependent on those branches for their rounds.

## Round 7 decisions — Q15–Q17 accepted

- Q15: the owner selected cue → typed English word → automatic fish hit on a
  correct answer. No independent aiming, selecting fish answers or shooting letters
  in the chosen first mechanic. Exact cues have not yet been selected.
- Q16: the owner agreed to the relaxed untimed first version. Moving fish is
  decoration, not a typing deadline; timed escape/challenge is deferred.
- Q17: the owner agreed to separate personal game points/records without existing
  XP/streak credit. This is now explicitly accepted rather than inferred from
  practice v1's reward decision.

Added the settled meanings of “Bắn cá điền từ” and “Điểm game” to GLOSSARY.
Detailed point/round/record rules still require decisions. No game
engine, new UI, migration, DB write, imported content or deployment in this phase.

## Round 8 — Q18 accepted; Q19/Q20 unanswered

- Q18 accepted: reuse learned-word defaults, explicit alternative sets/levels/saved
  words, image/audio/alternating combined cues and strict technical-media handling.
- Q19 proposed: 10 for a first correct answer, 5 after a prior wrong answer,
  0 after reveal/skip; retries, no lives/combos and no duplicate score per fish.
- Q20 proposed: 5/10/20/30 fish, default 10, distinct initial targets, same-device
  continuation; private account results/records sync and device-local guest records.

The Q18-only response did not settle Q19/Q20. The later owner message “có, hoặc làm
cái tim ấy, sẽ có 5 tim chẳng hạn, k giới hạn từ luyện (nếu hết thì lấy những từ
chưa học), hết 5 tim là thua” changes the game direction. No-lives and fixed-length
proposals are superseded; the exact numeric score rule is not yet settled.

## Round 9 decisions — Q21–Q23 accepted

- Q21 accepted five hearts, losing one on explicit wrong submit/reveal/voluntary
  skip and advancing with feedback; no loss for keystrokes/replay/technical errors.
- Q22 accepted unlearned expansion within the selected source, not globally,
  and reshuffling that source after full exhaustion.
- Q23 accepted same-device continuation preserving hearts/score; a fresh game
  starts over, and zero hearts ends the current game.

Only the game is being revised. Confirmed practice-v1 keeps its 5/10/20/30 untimed
sessions and first-answer/reveal rules. Added the resolved concept of a heart to
GLOSSARY. Heart penalties are now accepted; numeric scoring/records remain proposed.

## Round 10 — final game understanding check, Q24

The owner confirmed the complete `game-v1.proposed.md` in Q24, including +10 once
for a correct fish, 0 for wrong/reveal/skip, no combo/heart recovery, with private
records compared within the same source and cue mode.
The earlier +5 retry score no longer fits the accepted wrong→next-fish flow.
Routine recovery, synchronization/privacy, replay and source-cycle cases are
explicit in the confirmed brief. Product acceptance is recorded, not coding
authorization. The owner selected link discovery as the next step.

## Round 11 decisions — Q25–Q27 accepted

- Q25: source → candidate preview → owner selects/edits → save a personal set.
  Do not auto-import every token from the article/transcript.
- Q26: allow pasted text or SRT/VTT import when a URL cannot provide its content;
  continue investigating supported automatic extraction, without promising every URL.
- Q27: reuse a shared sense only when it matches the source context, preserving
  that learner's existing progress. A new meaning stays personal. Source context
  and link belong to the personal set; they do not overwrite the shared wording.

Added the resolved Nguồn học / Từ đề xuất terms to GLOSSARY. No AI/media provider,
data authority implementation or source-content extraction job has been authorized.

## Round 12 decisions — Q28–Q30 accepted

- Text-first private cards with contextual Vietnamese meaning, original sentence/
  translation and source; reuse suitable media, no new images or TTS in v1.
- Account login required before source analysis/personal-set saving. Existing
  guest public learning/practice/game scope is unchanged.
- Personal sets support normal study/review plus media-eligible practice/game.
  Importing is not learning; reused senses keep progress and new private senses
  start as new. This accepts a new private-content learning capability, not a
  bypass of the current public/owner content authority or Master PASS restrictions.

## Round 13 decisions — Q31–Q33 accepted

- AI can draft missing contextual meanings/translations; user reviews/edits before
  saving and unresolved meanings require selection. Do not present drafts as verified.
- One source per operation, ≤30 selected cards per batch; explicit passage selection
  for long sources and further batches, no playlist/site crawl or silent truncation.
- Only free/explicitly approved allowance, with no new paid spending or automatic
  upgrade. Stop automatic work when quota is exhausted; provider/keys/allowances
  still require engineering verification. No external API operation has been run.

Added precise private-meaning/import/draft terms to GLOSSARY and accepted boundaries
to ADR 0005. Complete link-learning brief is READY FOR CONTRACT REVIEW. Q34 is its
whole-contract understanding check; practice/game remain confirmed and unchanged.

## Q34 clarification — video learning replaces the card-first proposal

The owner did not confirm the proposed contract. They want the video's subtitles
and original voice for listening and watching with English/Vietnamese subtitles;
flashcards are not the desired core experience. They explicitly requested deeper
idea development before finalizing scope. Reopened this branch and marked the old
brief historical. Updated the consolidated plan and source/video glossary terms.

Proposals for the next round: video-first scope with articles considered later;
watch-for-understanding plus intensive segment practice; original voice through
the visible embedded player, with no separate MP3 download in the first version.
These are questions, not accepted implementation requirements. Dictation, shadowing,
segment bookmarks, translations and listening progress need subsequent design.
No ≤30-card limit is inferred for video transcripts or durations. No implementation,
provider call, new spending, database action or deployment was performed.

## Round 15 — Q35–Q37 accepted

The owner chose YouTube first, articles later; both watch-for-understanding and
intensive segment practice with a free choice of workflow; and original voice
through the visible embedded YouTube player, without separate MP3 extraction in
the first version. These decisions settle direction, not the entire exercise list
or release scope. Added Xem hiểu/Luyện sâu to the glossary and updated phase 3.

Next frontier Q38–Q40: first-release exercise scope, default subtitle presentation
in watch mode, and missing transcript/translation behavior. Actual quotas/providers,
exercise grading and private progress still need further design. No coding or calls.

## Round 16 — Q38–Q40 accepted

- First video release: watch with subtitles plus segment replay and listening
  gap-fill. Full-sentence dictation and guided shadowing are deferred.
- Watch mode defaults to English, with Vietnamese opened when needed; users can
  switch to bilingual or hide subtitles. Exercise answer visibility is separate.
- Missing timed English transcript: allow ordinary playback when available and
  SRT/VTT import, without automatic speech recognition in v1. Missing Vietnamese
  does not block English study; communicate unavailable translation/timing honestly.

Next frontier Q41–Q43: exercise reveal/first-answer behavior, bounded on-demand
translation, and private video progress/authentication separate from vocabulary
SRS/rewards. No feature implementation or external processing requested.

## Round 17 — Q41–Q43 accepted; final video contract review Q44

The owner accepted gap-fill with hidden full app subtitles/Vietnamese before the
first answer, unlimited replay and separate revealed results; selected-segment
translation within verified quota with saved reuse; and login/private video
library/results with same-device active-session continuation, separate from
vocabulary scheduling, XP, streak and learned counts.

Added `video-learning-v1.proposed.md` with the complete flow, explicit proposed
routine defaults and acceptance scenarios. Q44 checks that full contract and the
updated consolidated plan. Default answer normalization, version-bound grading,
source-error handling, deletion and recovery are explicit review proposals, not
invented prior answers. Actual providers/quotas and technical story design remain
implementation prerequisites; no app/source/DB/cloud/API processing changes.

## Round 18 — Q44 confirmed; first-release discovery complete

The owner selected “Chốt video v1 và kế hoạch ba phần”. The entire video brief,
explicit section-4 defaults and acceptance cases are now confirmed, along with
the practice → five-heart game → video plan. The earlier card-import proposal
stays superseded. No first-release product questions remain; do not ask another
routine scope confirmation or infer a request to implement. No code, provider
request, new spending, migration, DB/cloud mutation, commit or deployment.
