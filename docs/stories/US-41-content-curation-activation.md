# US-41 — Content Curation & Activation

- Status: `IMPLEMENTED / READY FOR OWNER DEVELOPMENT DRY RUN — no target command run`.
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

- `sourceDataset`, `sourceRecordId` and `expectedWord` as the exact owner-
  override identity;
- an explicit `GRADE_1`, `GRADE_2` or `GRADE_3` assignment;
- one or more canonical `topicSlugs`;
- one or more named `learningSetSlugs`; and
- `activation: true`.
- optional source-bound `imagePolicy: "QUARANTINED"` and
  `vietnameseOverride` decisions.

The owner-refined manifest contains 213 rows (100 Grade 1, 73 Grade 2, 40 Grade
3) in 11 meaningful sets. Grade is a human-reviewed group assignment; it is
not derived from source id, spelling length, alphabetic order, topic or
frequency. Grade 2 Feelings contains 13 rows after seven advanced words were
deferred without replacement; the list is intentionally not padded back to 20.

## Quality and activation policy

1. The source identity pair is immutable and must resolve to the expected word;
   required English word and Vietnamese meaning must be present.
2. Usable audio remains required. A missing image is `WARN_MISSING_IMAGE`; an
   owner-quarantined image is `WARN_QUARANTINED_IMAGE`. Both may activate when
   other requirements pass but resolve to no learner-facing image and cannot
   qualify for `IMAGE_TO_WORD`. Known unusable/corrupt image or audio and
   missing/unusable audio still block.
3. The owner-approved `vietnameseOverride` takes precedence at runtime while
   preserving raw imported `vietnamese`. The source catalog importer does not
   write the override or quarantine columns, so re-import cannot silently
   undo owner-reviewed content.
4. Only manifest rows are enabled and assigned a level. Other imported rows
   remain disabled and unclassified.
5. The tool upserts set definitions and ordered memberships but never creates or
   changes `learner_learning_sets` assignments. A parent chooses a set through
   the existing assignment API.
6. Starter ids 1–30 keep their word, enabled flag and content version. The
   manifest carries 30 explicit starter-to-canonical-topic mappings and updates
   only normalized topic membership for those rows.
7. The apply transaction asserts that learner assignments, progress, review
   events, XP events and achievement rows are unchanged. It is safe to rerun.

## Tool contract

```text
pnpm vocab:curate                 # local deterministic validation; no DB connection
pnpm vocab:curate -- --target development  # verified development snapshot/plan; read-only
pnpm vocab:curate -- --target development --apply --confirm-target development --confirm-branch br-square-grass-b3af0nte
pnpm vocab:curate -- --apply      # trusted CI test context only; one DB transaction
pnpm vocab:curate --generate-manifest  # regenerate from the local audited dataset
```

The default command is a dry run and reports exact record, grade, set, starter
mapping, missing-image WARN, quarantined-image WARN and media BLOCK counts,
including exact missing/quarantined words and owner override counts. Explicit
`--target development` verifies canonical Neon project/branch identity and
prints non-secret target metadata plus a DB snapshot and activation plan inside
a PostgreSQL `READ ONLY` transaction; it requires no apply confirmation and
reports `DATABASE_MUTATIONS=0`. A local-development apply requires both
`--confirm-target development` and `--confirm-branch` equal to the branch id in
`config/database-targets.ts` (currently `br-square-grass-b3af0nte`); it repeats
target identity checks before its transaction. Production is blocked for both
dry run and apply. Trusted DB
remains isolated to `ci-test` / `test` and its canonical `shared-ci` target.
The owner development dry-run and apply commands are intentionally not run by
this implementation change.

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

## Owner-approved final content remediation

The owner approved keeping all 213 curated source rows. The tracked manifest
marks exactly these source identities as `imagePolicy: "QUARANTINED"`:
`(4,basket)`, `(98,cup)`, `(884,father)`, `(889,grandfather)`,
`(759,teacher)`, `(637,cliff)`, `(647,east)` and `(570,word)`. The image
references remain in the imported source and canonical raw `image_url` for
audit, while `image_quarantined=true` makes every learner-facing read expose
no image. In particular, the teacher poster text is never sent to Flashcard or
exercise generation. Quarantine is non-blocking WARN and does not disable the
vocabulary or valid audio/listening, typing and meaning-choice modes.

The owner-approved meaning overrides are attached to source identities and
used only for the curated runtime value:

| Source identity | Owner-approved Vietnamese meaning |
| --- | --- |
| `(911,aunt)` | `Cô, dì, bác gái` |
| `(910,uncle)` | `Chú, cậu, bác trai` |
| `(897,granddaughter)` | `Cháu gái (cháu nội hoặc ngoại)` |
| `(896,grandson)` | `Cháu trai (cháu nội hoặc ngoại)` |
| `(621,axe)` | `Rìu` |

`(891,cousin)` and `(938,love)` have no override and retain their current
source meaning. No raw dataset values were changed. The canonical precedence
is raw catalog import → source-identity-bound manifest override → runtime
effective-content projection. Re-import updates raw columns only; the next
curation activation remains the reviewed step that can replace or clear owner
metadata. No LLM/API translation or classification is used.

## Acceptance criteria

- [x] A tracked deterministic manifest exists and contains 200–300 explicit
  imported source records.
- [x] Every selected record has a source identity, expected word, grade, topic,
  learning-set membership and activation decision.
- [x] The refined media gate passes for all 213 local records: 210 images and
  all 213 audio references resolve; the three missing images are explicit
  warnings and no selected media is unusable.
- [x] Exactly eight source-bound image quarantines and five owner-approved
  Vietnamese overrides survive manifest regeneration and catalog re-import;
  learner-facing queries mask all quarantined images and apply only exact
  source-identity overrides.
- [x] Dry run reports 202 media PASS, three missing-image WARN, eight
  quarantined-image WARN, zero BLOCK and 11 effective image-ineligible rows.
- [x] Runtime regressions prove all 213 vocabulary rows remain enabled
  candidates, quarantined words are excluded from `IMAGE_TO_WORD`, and valid
  audio/listening, typing, meaning choice and image-free Flashcard behavior
  remain available.
- [x] Eleven sets are defined with stable order and no automatic learner
  assignments.
- [x] Starter topic mappings cover all 30 starter ids without changing starter
  identity, enabled state or content version.
- [x] Apply is transactional, explicitly target guarded and idempotent; no progress,
  review, XP or achievement mutation is permitted.
- [x] Daily New limit and reward/review semantics remain unchanged.
- [x] Owner approved the final image quarantine and five meaning decisions;
  regenerated content review has zero activation blockers.
- [x] Focused curation, media-policy, owner-override, catalog-import,
  Flashcard/exercise, queue, progress, gamification and reset regressions pass;
  the full local test, lint, typecheck, build and E2E gates pass.
- [x] Core CI #93 and Trusted DB Integration #88 (attempt 3) pass on the
  remediation implementation SHA; Trusted DB used only the configured CI test
  target.
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

- Final local real-dataset dry run: `MANIFEST_RECORDS=213`, grades 100/73/40,
  `MEDIA_GATE=PASS checked=213 pass=202 warn=11 block=0 warn_missing=3
  warn_quarantined=8`, `IMAGE_QUARANTINES=8`, `MEANING_OVERRIDES=5`,
  `EFFECTIVE_IMAGE_INELIGIBLE_COUNT=11`, duplicate identities/words 0,
  expected-word mismatches 0, missing meanings 0, and 30 starter mappings.
  `DATABASE_MUTATIONS=0`; `REAL_NEON_APPLY=NOT_RUN`.
- Owner review regenerated from the canonical manifest and local source data:
  15 review rows; all 8 image findings retain `MISMATCH`/`AMBIGUOUS` review
  classifications while being `SAFE_WITH_LIMITATION` and
  `IMAGE_TO_WORD=NO`; all five approved meaning corrections re-evaluate as
  `OK`; `BLOCK_BEFORE_ACTIVATION_COUNT=0`. Cousin and love remain unchanged.
- Local validation: focused suite 17 files / 175 tests; full suite 47 files /
  476 tests; lint and typecheck pass; production build passes; E2E 26/26 pass.
  The CSV artifacts round-trip through the spreadsheet runtime (15 rows and 8
  image rows) and remain in ignored `local-data/generated/`.
- Core CI run [#93](https://github.com/TXHoai2309/VocabFlow/actions/runs/35964700073)
  and Trusted DB Integration run [#88, attempt 3](https://github.com/TXHoai2309/VocabFlow/actions/runs/35964700003)
  pass on implementation SHA
  `0cc10dd9ded1564a860d605b196939a25dce1d1d`. Attempts 1 and 2 exposed an
  early runtime identity-harness error and a later legacy US-07 replay-race
  failure; attempt 3 passed the full suite, including US-41 source-refresh and
  idempotency assertions. Trusted DB used only its configured CI test target.
  Real Neon apply has not been run.
