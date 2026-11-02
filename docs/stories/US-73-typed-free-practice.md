# US-73 — Gõ từ trong Luyện tự do (ticket 04)

- Status: ACCEPTED
- Owner assigned sequential execution 2026-11-01.
- Blocker02/US71 ACCEPTED; cue03/US72 also ACCEPTED (29 tests,11 browser flows,
  SQL rollback). This is integration evidence, not an invented dependency.

## Contract before code

Extend responseMode=choice|type independently of image/audio/mixed cues. Typed
sessions need one valid media target, no distractors, and mixed still needs two
distinct targets/both cues. Public question carries responseMode and no answer
or choice hints for type. Add strict type-answer action {actionId,questionId,text}
bounded1–200 nonblank characters; reject type action on choice and vice versa.
Compare exact canonical word after NFKC/case/trim/collapsed whitespace. No fuzzy
matching, invented synonyms or unrecorded variants. Empty submit produces inline
validation and no outcome/write. First result persists; retry uses same action;
reveal/skip/media rules/auth/CAS/SRS isolation are unchanged. No new migration.

UI: native labelled English text field, spellcheck/autocomplete/autocorrect off,
noValidate form, Enter submits except during IME composition. Use existing
exercise typing classes; retain input while pending/error and disable duplicate
submits. Media loading/errors retain selected cue; no meaning fallback. Feedback
before Next. All ticket04 criteria and common constraints apply.

## Verification

API/browser cases: normalized correct word, wrong/synonym incorrect, empty no
write, first result/reveal, uncertain retry, no answer hints, image/audio/mixed
typing and one-word image source. Extend actual PostgreSQL rollback readback.
Typecheck/lint/build and focused API/web regression required before ACCEPTED.

## Evidence

READY FOR IMPLEMENTATION recorded before code.
Gate passed; now IN PROGRESS.

Acceptance: 31/31 scoped API/reader tests, 14/14 Chromium flows, typecheck/build/
changed-source ESLint PASS. Typed Unicode/case/whitespace, wrong/synonym rejection,
empty no-write, one-target source, reveal/first result, uncertain retry and full
image/audio/mixed typing flows pass. Local rollback PostgreSQL verifies typed
audio grading, exact JSONB replay and cue summary readback, learning snapshots
unchanged. No new migration, live provider, cloud or media creation.
