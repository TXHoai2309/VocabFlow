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

The current manifest contains 220 rows (100 Grade 1, 80 Grade 2, 40 Grade 3)
in 11 meaningful sets. Grade is a human-reviewed group assignment; it is not
derived from source id, spelling length, alphabetic order, topic or frequency.

## Quality and activation policy

1. The source identity pair is immutable and must resolve to the expected word.
2. The selected row must have one resolved uploaded image and one resolved
   uploaded audio asset. A missing or unusable asset blocks activation.
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
mapping and media-gate counts. `--apply` rejects local-development context and
requires the existing `ci-test`/`test` target verification before connecting.

## Acceptance criteria

- [x] A tracked deterministic manifest exists and contains 200–300 explicit
  imported source records.
- [x] Every selected record has a source identity, expected word, grade, topic,
  learning-set membership and activation decision.
- [x] The reviewed media gate passes for all 220 local records (220 images and
  220 audio references resolved).
- [x] Eleven sets are defined with stable order and no automatic learner
  assignments.
- [x] Starter topic mappings cover all 30 starter ids without changing starter
  identity, enabled state or content version.
- [x] Apply is transactional, CI-target guarded and idempotent; no progress,
  review, XP or achievement mutation is permitted.
- [x] Daily New limit and reward/review semantics remain unchanged.
- [ ] Core CI and Trusted DB Integration pass on the same pushed commit.
- [ ] Owner manually reviews the manifest, dry-run report and resulting catalog.

## Evidence

- Local dry run: `MANIFEST_RECORDS=220`, `GRADE_1_RECORDS=100`,
  `GRADE_2_RECORDS=80`, `GRADE_3_RECORDS=40`, `LEARNING_SET_COUNT=11`,
  `STARTER_TOPIC_MAPPINGS=30`, `MEDIA_GATE=PASS checked=220`,
  `DB_MUTATIONS=0`, `STATUS=PASS`.
- Focused manifest tests and repository typecheck/lint are part of the US-41
  closeout. Remote gate run ids and the owner decision are appended after the
  candidate is pushed.
