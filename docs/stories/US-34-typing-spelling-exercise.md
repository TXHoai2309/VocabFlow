# US-34 — Typing / Spelling Exercise

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Scope: extend the existing `/study/exercises` interaction layer; no second
  exercise subsystem or progress store.

## User story

As a learner, I want to type the English word from a safe cue so I can practise
spelling and recall.

## Contract

- Exercise type is `TYPE_WORD`.
- Cue selection is deterministic: Vietnamese meaning first, then usable image,
  usable audio, then a definition/example only when it does not contain the
  target answer. If no safe cue exists, the router falls back safely.
- Submitted answers use Unicode NFKC normalization, outer trim and
  case-insensitive comparison. Meaningful internal spaces are preserved.
- Spelling is strict: no fuzzy matching, autocorrection, punctuation removal or
  silent typo acceptance. `ice cream` is not equal to `icecream`.
- A blank answer is rejected locally. Enter and the accessible submit button
  submit once; the input then locks and feedback shows the canonical answer.
- Only the canonical `REMEMBERED`/`FORGOTTEN` result is sent to the review API.
  Raw keystrokes and raw typed answers are not persisted or logged.
- Optional cue-media failure selects another safe cue or Flashcard and never
  turns the review into `FORGOTTEN` by itself.

## Out of scope

- Fuzzy or tolerant spelling, edit-distance scoring, autocorrection or a raw
  answer-history table.
- A separate typing scheduler, score or learner-progress model.
