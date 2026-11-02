# Bắn cá điền từ v1 — confirmed product contract

Status: PRODUCT CONTRACT CONFIRMED — owner Q24, 2026-11-01.
The owner explicitly chose “Đồng ý, chốt game rồi phân tích học từ link (đề xuất)”.
The complete brief, score/record rules and routine defaults are confirmed; the
next step is link-learning discovery. No implementation request, code, migration,
media generation, DB/cloud write or deployment is included.

## Accepted continuous-play revision

The owner revised the game to continuous play with hearts and then accepted five
starting hearts, the loss events, scoped unlearned-word expansion and same-device
continuation in Q21–Q23. Zero hearts ends the game in defeat. This supersedes the
earlier fixed 5/10/20/30-fish and no-lives proposals for this game only; the confirmed
practice-v1 session contract is unchanged.

## Settled context

- First build a design for one vocabulary game; shooting fish/word completion is
  the owner's example. Other games are not automatically part of this release.
- Games must not automatically change vocabulary review scheduling (ADR 0004).
- General product targets multiple ages and mobile-first web use. Existing image,
  word audio and lexical identities can be considered for reuse; no new media
  generation or broader data catalog is requested by this discovery.
- Practice v1 is confirmed separately. Its detailed interaction, session and
  scoring rules are not automatically inherited by the game without a clear decision.

## Accepted answer mechanic — Q15

The owner selected cue → type the English word → automatic fish hit on a correct
answer. There is no independent aiming action, fish-answer selection or letter-
shooting assembly in this first mechanic. Cue details remain a later decision.

## Accepted pacing and reward boundary — Q16/Q17

The owner agreed to both remaining recommendations: a relaxed first release,
no answer timeout or fish escaping because of slow typing, and separate personal
game points/records without existing XP/streak credit. Timed challenges and reward
integration are not included in v1. Existing no-SRS-change remains accepted.

## Accepted source and cues — Q18

The owner selected reuse of practice's source/cue behavior: learned words by
default, explicit learning set/level/saved-word alternatives, image/audio/combined
alternating cues, and technical-media retry/skip without a wrong answer or silent
modality change. Q22 accepted the sequence: exhaust learned words → add unlearned
words within the same selected source → reshuffle that source when fully exhausted.
Do not widen globally. An explicit all-catalog selection can of course make that
catalog the chosen scope. Game exposure does not mark a word normally learned or
change its review date. If no learned words exist, eligible unlearned words in the
explicitly selected source can start the sequence; do not draw from an unstated source.

## Accepted heart and continuation rules — Q21/Q23

- Start with five hearts. Incorrect explicit submit, voluntary answer reveal or
  voluntary skip removes one heart, shows the answer and advances to another word.
- Do not remove hearts on individual keystrokes, audio replay, empty-submit
  validation, or technical image/audio failures. Technical skips remain distinguishable
  from voluntary skips; a media-retry control must not trigger a penalty.
- On the fifth penalized action, show its feedback and end the game. No next fish
  or further score award is accepted after defeat.
- Pause/exit/reload can resume the same game in the same browser/device storage
  context, retaining hearts, score, current target and the queue position.
- Starting over is a new game with five hearts and a fresh score; do not restore
  hearts merely by reloading. Practice's fixed question counts do not apply.

## Confirmed scoring — Q24

| Resolved fish action | Points | Hearts |
|---|---:|---:|
| Correct submitted English word | +10 once | No change |
| Incorrect submitted English word | 0 | −1 |
| Voluntary answer reveal or skip | 0 | −1 |
| Technical media error/retry/technical skip | 0 | No change |

The old +5-after-correction proposal is superseded: a wrong answer now advances
to another fish. No combo multiplier or heart recovery is included in v1. One
resolved fish can award points or remove a heart only once. A fresh encounter after
the full source reshuffles is a new fish, not a duplicate network submission, and
can score normally. It still is not a new official learning/review event.

Private records are grouped by the same source and cue mode so one small set
is not compared directly with the whole catalog. Record the rules version for
future scoring changes. Game results/records follow the existing account-sync and
device-local guest model; active-game continuation is same-device in v1. Paused
games remain in progress; defeated or voluntarily ended games can finalize their
own result. No leaderboard, XP, streak credit or paid reward economy.

## Confirmed routine defaults

- Every fish is one vocabulary target. Fish motion is decorative: typing correctly
  triggers the hit, without aiming/reflex timing or a fish escaping due to slow input.
- Eligible content stays scoped and does not repeat until its current learned or
  unlearned stage is exhausted. Then apply the accepted expansion/reshuffle sequence.
  Avoid an immediate boundary repeat when another eligible target exists; a one-word
  image/audio scope can repeat because continuous play was explicitly requested.
- Combined cues retain alternating image/audio behavior. If the scope cannot
  support it, explain the limitation and ask for an explicit setup change.
- Typed answers normalize case, Unicode and excess whitespace, like the confirmed
  practice brief; do not silently accept misspellings or unrelated synonyms.
- Answer-revealing labels/alternative text must not leak the word before an answer
  or explicit reveal. Motion can be reduced without changing the game rules.
- Missing/stale content is a technical issue, not a wrong answer. If no eligible
  content remains, pause with an explanation instead of looping forever or taking hearts.
- Changing source/cue mode starts a new game; a resume keeps the original rules.
- Account results stay private; guest history is not automatically transferred on
  login. No normal review/learned/weak-word history is rewritten by game actions.
- Preserve a pending action on save failure; retrying it cannot duplicate points,
  heart loss or terminal defeat. The account write must validate the authoritative
  game/content state separately from the normal review mutation.

## Confirmed end-to-end acceptance cases

1. Start a five-heart game; four incorrect submissions leave one heart, and the
   fifth ends it with zero. Keypresses alone never reduce hearts.
2. Correct once, then retry the same submission after a lost response: only one
   fish hit/score award. Defeat likewise cannot be applied twice.
3. An MP3 failure followed by technical skip costs no heart; voluntarily skipping
   a readable/hearable target costs one.
4. Exhaust learned words in selected set A: unlearned targets still come from A.
   After all of A is exhausted, reshuffle A; no automatic all-catalog expansion.
5. A never-learned word answered correctly in the game remains outside official
   learned/SRS progress. Existing XP and streak are unchanged.
6. Reload at two hearts retains two hearts and the score. Explicit new game starts
   at five hearts/zero score. Changing setup cannot silently keep another ruleset's score.
7. A player's history cannot be read by another account. Game-over summary shows
   game points, caught fish and missed/revealed content without relabeling it as SRS mastery.

No framework, canvas engine, full navigation redesign or SQL schema is selected
by this product brief. Whole-contract understanding is confirmed; an implementation
request is still required. Planning now moves to YouTube/article learning.
