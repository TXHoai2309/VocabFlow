# Luyện tự do v1 — confirmed product contract

Status: PRODUCT CONTRACT CONFIRMED — owner Q14, 2026-11-01.
The owner explicitly selected “Đúng, chốt luyện rồi phân tích game tiếp (đề xuất)”.
The complete product scope and explicit routine defaults are confirmed; the next
step is game discovery. Implementation has not been requested and no story is
READY FOR IMPLEMENTATION. No code, migration, DB write or deployment here.

## Accepted scope

- Deliver practice first; game and YouTube/article learning are later releases.
- Practice images, audio, or combined alternating image/audio questions.
- Default source is learned words. Allow an explicit chosen learning set, level
  or saved-word source. If no learned words exist, guide to an explicit selection.
- Answer by choosing one of four English words or typing the English word;
  choice is the default interaction.
- Keep the selected modality. Media failures offer retry/skip and do not grade
  the user wrong or silently substitute a different cue.
- Store separate practice history. Accounts synchronize results; guests keep
  their history on the device, following the existing guest/account separation.
- Practice does not change scheduled review dates. V1 does not award the existing
  review XP or extend its streak. Later game rewards have not been settled.

## Accepted practice loop — Q11–Q13

1. Choose source, image/audio/combined, choice/typing, and 5/10/20/30 questions;
   default 10. No countdown. Each target appears once in the initial pass.
2. Show the actual eligible count if the scope cannot supply the requested number.
   Never silently add unseen/out-of-scope targets to fill the session.
3. Present the selected cue. Listening can replay the same cue without penalty.
4. First submitted answer establishes initial correctness. Show feedback and the
   correct word after submission. An explicit answer reveal before submission is
   recorded separately as “Đã xem”, not correct or incorrect.
5. Summary separates first-pass correct/incorrect, revealed and skipped items.
   Accuracy = correct / (correct + incorrect); display no percentage when
   that denominator is zero. Optional wrong-word practice makes new practice
   results and cannot overwrite the original first-pass result or touch SRS.
6. Save in-progress position for continuation on the same device. Account results
   still synchronize; cross-device active-session continuation is not in v1.
   Same-device continuation means the same browser/storage context, not a promise
   of recovery after local browser data has been cleared. Returning after
   completion cannot submit the same answer again.

## Confirmed routine behavior

These explicit defaults were part of the full brief confirmed in Q14:

- Modality filtering happens before session creation. If no appropriate content
  exists, explain the empty scope and offer explicit setup changes.
- Four-choice questions need distinct, unambiguous options. Do not silently switch
  interaction or scope when options cannot be produced. Report unavailable content.
- A requested combined session needs both eligible image and audio content;
  explain if one type is unavailable instead of silently running a single modality.
  It also needs at least two distinct targets to alternate without repeating a word
  in the initial pass; a one-word source must not be silently duplicated.
- V1 listening uses word-pronunciation audio to recognize/type the English word.
  Sentence dictation and speech/pronunciation recording are not added implicitly.
- The target answer must not leak into image alternative text, hidden answer labels
  or other pre-answer teaching metadata. Accessible prompts remain neutral.
- Typed responses tolerate case, Unicode representation and excess surrounding/
  separator whitespace. V1 does not silently accept misspellings or unrelated
  synonyms; approved lexical variants still require a defined source.
- Technical failures, user skips and answer reveals remain distinct in stored
  results, even if a compact summary groups technical skips together.
- Saving failures retain the current answer and allow an idempotent retry without
  advancing twice or awarding anything through the scheduled-review path.
- Existing main review weak-word/history/learned counts are unchanged. Practice's
  “needs more practice” list uses its own results. No automatic guest-history
  migration or new login mechanism is added by this feature.
- Exact entry-point/navigation fit and API/storage contracts must be checked
  against existing screens and architecture before implementation. This brief does
  not authorize a broader UI redesign or prescribe SQL schema by assumption.

## Confirmed user flow

Open Luyện tự do → choose source and mode → choose answer interaction and count
→ answer/reveal/skip with feedback → summary and history → optionally practice wrong
answers again. Existing scheduled-review screens keep their existing purpose.
This is a new independent practice flow; the existing exercise screen's normal
review submission must not be relabeled as free practice without separating writes.

All account results are private and access-controlled; guest storage follows the
current app policy. Nothing here approves automatic guest-history transfer, wider
content publishing, an import service, a mini-game, XP or a production deployment.

## Confirmed acceptance examples

- Replaying the same target in free practice ten times does not change its due
  date, review revision, existing XP or streak.
- Learned-word source with six eligible targets and requested ten does not pull
  four other words from the catalog.
- In listening mode, an unavailable MP3 is retried/skipped with no wrong answer
  and no automatic Vietnamese-reading replacement.
- A revealed answer is excluded from answered accuracy, while an earlier wrong
  submission remains wrong after later correction/practice.
- Account A cannot read account B's practice history; guest results stay separate
  and are not automatically imported on login.
- A save retry or reload cannot duplicate an answer; a mid-session return uses
  the agreed same-device behavior and a stable source/content identity.

## Future phases, deliberately still open

Game: exact shooting-fish mechanics, target audience, controls, timing/difficulty,
scoring and game rewards. Link learning: source acquisition/fallbacks, private sense
identity/reuse, candidate selection, context/media, cost/limits and unsupported
sources. YouTube transcript constraints and official sources are in discovery.md.
