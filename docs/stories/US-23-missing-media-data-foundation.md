# US-23 — Missing Media / Dataset Vertical Slice

- Status: ACCEPTED / CLOSED
- Documentation state: retrospective/backfilled from implementation evidence
- Implementation baseline: `e56940c801dbdf58c6708eac27c98848cb189b70`
- Dependencies: US-04 content contract, US-12 audio behavior, and media manifest foundation.

## User story

As a learner, I want vocabulary with missing media to remain usable so that
incomplete source assets do not block the learning flow.

## In scope

- Preserve optional image/audio as nullable content.
- Validate and report missing media in the dataset/media vertical slice.
- Keep flashcards and vocabulary rows safe when a media URL is absent or fails.

## Out of scope

- Inventing fallback audio, using SpeechSynthesis, or redesigning the uploader.

## Task mapping

- T23-01: audit source/media references and nullable DTO fields.
- T23-02: integrate deterministic manifest/provider mapping.
- T23-03: preserve card/list fallback behavior.
- T23-04: test missing and unusable media paths.

## Acceptance criteria

- AC-23-01: missing optional media is accepted and reported, not fatal.
- AC-23-02: card/list UI remains usable without media.
- AC-23-03: media identity is deterministic and provider mapping is reusable.

## Authorization and persistence

Media is content metadata; learner progress and review history remain separate
and unchanged. Runtime vocabulary reads continue to use canonical DB IDs.

## Test and evidence

Media manifest/upload safety, vocabulary, flashcard, and E2E regression evidence
passed under the shared baseline. The generated media outputs are local
gitignored artifacts and are not required by Core CI.

## Known limitations

Unavailable assets remain unavailable until an explicit controlled media
operation supplies them.

### 2026-10-18 presentation refinement

Vocabulary cards omit the thumbnail entirely when no safe image URL is
available and use a compact fallback only after an image load failure. Error
state is scoped to the current vocabulary identity and URL. Audio controls stay
hidden without a playable URL. This is a presentation change only; it does not
create mappings, alter rights states, or change media storage.
