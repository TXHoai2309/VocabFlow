# US-41 — Content Curation & Activation

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- Dependency: US-25 catalog identity/import, US-26/US-27 taxonomy, US-28/US-30 learning-set and daily-New contracts, and US-39/US-40 reward invariants.
- Scope: review and activate a bounded slice of the imported `2000_COMMON_ENGLISH_VOCABULARY_V1` catalog.
- Out of scope: US-42, AI-generated content, learner-owned sets, automatic learner assignment, XP/review/progress backfill, daily-limit changes, schema redesign and production/live-Neon execution from a developer workstation.

## User outcome

As a parent, I want the imported catalog to contain a small, trustworthy set of
real words with explicit grade/topic/set metadata, so that I can assign useful
learning sets without exposing unreviewed or media-broken rows.

## Reviewed source and manifest

The tracked manifest is [`config/vocabulary-curation-v1.json`](../../config/vocabulary-curation-v1.json)
and is versioned `VOCABULARY_CURATION_V1`. The reviewed allow-list and its
selection rationale are kept in [`scripts/vocabulary-curation.ts`](../../scripts/vocabulary-curation.ts).
The manifest records every activation candidate with:

- `sourceDataset`, `sourceRecordId` and `expectedWord`;
- an explicit `GRADE_1`, `GRADE_2` or `GRADE_3` assignment;
- one or more canonical `topicSlugs`;
- one or more named `learningSetSlugs`; and
- `activation: true`.

The owner-refined manifest contains 213 rows (100 Grade 1, 73 Grade 2, 40 Grade
3) in 11 meaningful sets. Grade is a human-reviewed group assignment; it is
not derived from source id, spelling length, alphabetic order, topic or
frequency. Grade 2 Feelings contains 13 rows after seven advanced words were
deferred without replacement; the list is intentionally not padded back to 20.

## Quality and activation policy

1. The source identity pair is immutable and must resolve to the expected word;
   required English word and Vietnamese meaning must be present.
2. Usable audio remains required. A missing image is classified `WARN`, is
   visible in reports, and may activate when other requirements pass. A known
   unusable/corrupt image or audio asset and missing/unusable audio still block.
   Activation never grants `IMAGE_TO_WORD` eligibility; that exercise continues
   to require a usable image and follows its existing safe fallback.
3. Only manifest rows are enabled and assigned a level. Other imported rows
   remain disabled and unclassified.
4. The tool upserts set definitions and ordered memberships but never creates or
   changes `learner_learning_sets` assignments. A parent chooses a set through
   the existing assignment API.
5. Starter ids 1–30 keep their word, enabled flag and content version. The
   manifest carries 30 explicit starter-to-canonical-topic mappings and updates
   only normalized topic membership for those rows.
6. The apply transaction asserts that learner assignments, progress, review
   events, XP events and achievement rows are unchanged. It is safe to rerun.

## Tool contract

```text
pnpm vocab:curate                 # local deterministic validation; no DB connection
pnpm vocab:curate --apply         # trusted CI test context only; one DB transaction
pnpm vocab:curate --generate-manifest  # regenerate from the local audited dataset
```

The default command is a dry run and reports exact record, grade, set, starter
mapping and media PASS/WARN/BLOCK counts, including missing-image words.
`--apply` rejects local-development context and requires the existing
`ci-test`/`test` target verification before connecting.

## Owner-refined selection

The approved replacements are `ampersand` (566) → `question mark` (555),
`acquire` (1347) → `learn` (937), `immersion` (1346) → `word` (570),
`adoration` (948) → `love` (938), `amazement` (951) → `surprise` (1005),
`attraction` (955) → `liking` (989), `bitterness` (956) → `anger` (953),
`bliss` (957) → `happiness` (980), `depression` (962) → `sadness` (998),
`despair` (963) → `fear` (969), and `ecstasy` (965) → `joy` (987). The first
three remain Grade 3 / `grade-3-language`; the remaining eight are Grade 2 /
`grade-2-feelings`, with source-backed canonical topics unchanged.

`despair` → `fear` is a set-level substitution, not a synonym claim. `love`
keeps its source Vietnamese meaning (“Tình yêu, lòng yêu mến”) and source
English definition, which includes romantic attachment; it is retained because
the word itself is substantially more familiar and child-facing than
`adoration`. Seven words were removed with no replacement: `affection` (949),
`amusement` (952), `astonishment` (954), `cheerfulness` (959), `compassion`
(960), `elation` (966), and `euphoria` (968). These remain in the imported
catalog but outside curated V1.

The selected rows `anger`, `sadness`, and `joy` have no image source reference
but do have usable audio and required text; they are `WARN`, not `BLOCK`, and
remain ineligible for `IMAGE_TO_WORD`. No image is fabricated. The audio policy
was not broadened.

## Acceptance criteria

- [x] A tracked deterministic manifest exists and contains 200–300 explicit
  imported source records.
- [x] Every selected record has a source identity, expected word, grade, topic,
  learning-set membership and activation decision.
- [x] The refined media gate passes for all 213 local records: 210 images and
  all 213 audio references resolve; the three missing images are explicit
  warnings and no selected media is unusable.
- [x] Eleven sets are defined with stable order and no automatic learner
  assignments.
- [x] Starter topic mappings cover all 30 starter ids without changing starter
  identity, enabled state or content version.
- [x] Apply is transactional, CI-target guarded and idempotent; no progress,
  review, XP or achievement mutation is permitted.
- [x] Daily New limit and reward/review semantics remain unchanged.
- [x] Focused curation/media-policy tests, full lint/typecheck/test/build/E2E
  pass locally; the trusted-DB fixture asserts activation of missing-image
  rows without changing learner assignments or learning history.
- [x] The previous 220-row baseline passed Core CI and Trusted DB Integration
  (`4d76cfa946ccae94ec3e5deb690f0365ba579363`; Core CI #87, Trusted DB #81).
- [x] The current 213-row refinement passed both remote gates on the same
  pushed commit [`760c0c04`](https://github.com/TXHoai2309/VocabFlow/commit/760c0c04d7498a3b6e27b15ee47e4cee0c305aed):
  [Core CI run 35840195766](https://github.com/TXHoai2309/VocabFlow/actions/runs/35840195766)
  and [Trusted DB Integration run 35840195673](https://github.com/TXHoai2309/VocabFlow/actions/runs/35840195673).
- [x] Follow-up verification found `XX000: cache lookup failed for type
  590564` in US-41 apply on documentation-only commit `6d2675f2` (Trusted DB
  runs `35841107601` and `35842150875`). The trusted harness drops/recreates
  application enums during reset; script SQL connections now disable prepared
  statements to avoid retaining stale enum type OIDs. A regression test covers
  that connection option. The fix passed Core CI run `35843693211` and Trusted
  DB Integration run `35843693265` on `2ef6166dcc9c3475773f2385626001f2d897cc43`.
- [ ] Owner manually reviews the manifest, dry-run report and resulting catalog.

## Evidence

- Historical dry run: `MANIFEST_RECORDS=220`, `GRADE_1_RECORDS=100`,
  `GRADE_2_RECORDS=80`, `GRADE_3_RECORDS=40`, `MEDIA_GATE=PASS checked=220`.
- Refined local dry run: `MANIFEST_RECORDS=213`, grades 100/73/40,
  `MEDIA_GATE=PASS checked=213 pass=210 warn=3 block=0`,
  `MISSING_IMAGE_SELECTED=anger,sadness,joy`, `STARTER_TOPIC_MAPPINGS=30`,
  `DB_MUTATIONS=0`, `STATUS=PASS`. Real Neon apply has not been run.
- Current local evidence: focused 34 tests pass; full suite 46 files / 457
  tests pass; lint, typecheck, build and 26 E2E pass. Core CI and Trusted DB
  Integration both PASS on `760c0c04d7498a3b6e27b15ee47e4cee0c305aed` (runs
  `35840195766` and `35840195673`). Trusted DB used the configured CI test
  target; real Neon apply was not performed.
- Trusted DB follow-up on documentation-only commit `6d2675f2` failed twice at
  the first curated apply with PostgreSQL `XX000` (runs `35841107601` and
  `35842150875`). Since the trusted reset drops/recreates enum types, script
  connections now set `prepare: false`; the focused regression passes, as do
  Core CI `35843693211` and Trusted DB `35843693265` on fix commit `2ef6166`.
  No real/production Neon apply was run.
