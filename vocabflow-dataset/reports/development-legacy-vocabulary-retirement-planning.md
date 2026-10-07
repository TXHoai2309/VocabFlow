# Phase 2G.3B — Legacy reference decomposition and retirement planning

Status: PASS — read-only analysis and planning only. Source baseline: `bc421abf51ddeb0e0213b5f3b7364c11f57c008a`. Accepted semantic fingerprint: `5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea`.

Development: neon / shy-hill-72364426 / br-square-grass-b3af0nte / neondb / vocabflow_runtime. Provider preconnect identity verified; transaction REPEATABLE READ, READ ONLY. Production not connected, queried or mutated. Database writes NONE.

## Reference decomposition

All 2018 legacy rows are protected. The runtime partition remains 2126 total, 108 Master-managed and zero mapping anomalies. Catalog discovery is primary truth; each reference column is counted once, including application-level Master relationship columns. No learner IDs, user IDs, household IDs, emails, sessions, tokens or connection strings are serialized.

| Catalog column | Domain | Legacy references |
|---|---|---:|
| vocabflow_app.learner_progress.vocabulary_id | LEARNER_HISTORY | 84 |
| vocabflow_app.learner_saved_vocabulary.vocabulary_id | LEARNER_HISTORY | 0 |
| vocabflow_app.learning_set_items.vocabulary_id | PRODUCT_RELATIONSHIP | 279 |
| vocabflow_app.master_learning_set_memberships.vocabulary_id | MASTER_RELATIONSHIP | 0 |
| vocabflow_app.master_vocabulary_mappings.vocabulary_id | MASTER_MAPPING | 0 |
| vocabflow_app.master_vocabulary_topic_memberships.vocabulary_id | MASTER_RELATIONSHIP | 0 |
| vocabflow_app.review_events.vocabulary_id | LEARNER_HISTORY | 221 |
| vocabflow_app.vocabulary_topics.vocabulary_id | PRODUCT_RELATIONSHIP | 2026 |

## Overlapping planning groups

| Group | Rows |
|---|---:|
| A_LEARNER_HISTORY_PROTECTED | 75 |
| B_PRODUCT_RELATIONSHIP_ONLY | 1943 |
| C1_MASTER_COVERAGE_REQUIRED | 2005 |
| C2_EXISTING_MASTER_IDENTITY_REVIEW | 13 |
| D_RETIREMENT_AFTER_RELATIONSHIP_MIGRATION_PLANNING | 1943 |
| E_HYPOTHETICAL_POST_MIGRATION_DELETE_CANDIDATE | 1943 |

Groups overlap; their counts must not be summed as a partition. A preserves learner progress, review events and saved-word references. B means only understood product links exist, not permission to delete. C1 requires future Master coverage or an explicit owner-approved content retirement. C2 preserves the specific reviewed identity questions; excluded Sense pairs are never Master successors. D records the product links and future disposition gates for rows with no learner history, Master links or unknown references. D is planning only.

1989 legacy rows have source identity obligations and 241 are enabled. These are additional gates even after taxonomy relationships change. Every planning row records source and enabled dependency review requirements, the required vocabulary disposition, and a final reference recheck.

## Existing Master and reviewed identity cases

| Runtime | Relation | Excluded Sense pairs | History refs | Topic / set refs |
|---|---|---:|---:|---:|
| #11 water | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 6 | 2 / 3 |
| #295 apple | EXISTING_MASTER_RUNTIME_DUPLICATE | 0 | 3 | 1 / 1 |
| #405 water | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |
| #846 fuse | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |
| #849 record | MULTIPLE_MASTER_CANDIDATES | 0 | 0 | 1 / 0 |
| #944 kick | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 1 |
| #1260 light | OWNER_REVIEWED_NOT_SAME_IDENTITY | 3 | 0 | 1 / 0 |
| #1313 struggle | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |
| #1330 grapple | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |
| #1463 precise | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |
| #1477 struggle | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |
| #1482 muster | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |
| #1796 liable | OWNER_REVIEWED_NOT_SAME_IDENTITY | 1 | 0 | 1 / 0 |

## Exact reference overlaps

| Overlap | Rows |
|---|---:|
| learnerProgressOnlyAmongHistory | 0 |
| reviewEventsOnlyAmongHistory | 0 |
| learnerProgressAndReviewEvents | 75 |
| savedVocabulary | 0 |
| learnerHistoryAndTopic | 75 |
| learnerHistoryAndLearningSet | 75 |
| topicWithoutLearningSet | 1777 |
| learningSetWithoutTopic | 0 |
| topicOnlyAllDomains | 1777 |
| learningSetOnlyAllDomains | 0 |
| topicAndLearningSet | 241 |
| masterRelationship | 0 |
| otherOrUnknown | 0 |

The learner progress/review intersection is computed from per-row counts, not inferred from equal marginal counts. "Only among history" excludes other history types but may include product links; "only all domains" excludes every other reference type. The artifact includes the full pairwise matrix and disjoint exact signatures covering 2018 rows.

## Semantic/reference cross-tab

| Relation | Total | Learner history | Product-only | Source identity |
|---|---:|---:|---:|---:|
| NO_MASTER_CANDIDATE | 2005 | 73 | 1932 | 1977 |
| OWNER_REVIEWED_NOT_SAME_IDENTITY | 11 | 1 | 10 | 10 |
| EXISTING_MASTER_RUNTIME_DUPLICATE | 1 | 1 | 0 | 1 |
| MULTIPLE_MASTER_CANDIDATES | 1 | 0 | 1 | 1 |

#11 retains 1 progress and 5 review references. #284 booking remains Master-managed. #295 apple remains POSSIBLE review evidence, with no mapping created; #849 record remains ambiguous. All Phase 2G.3A.1 owner exclusions remain authoritative.

## Offline scenarios and group E

S1 assumes only that product relationships have been migrated or removed. It assumes no content-retirement approval, no source identity resolution and no enabled-dependency resolution. It migrates nothing.

After that assumption, 1943 rows have zero database references, but 305 history references remain. S1 hypothetical delete candidates: 0. Missing Master coverage and identity review are vocabulary disposition gates, not reference counts; zero references alone does not settle them. No row is currently retire-safe and no delete is recommended. A future positive scenario requires an explicitly assumed approved semantic/content disposition, resolved source identity, separately authorized disable, cleared preservation policy, and zero history, saved-word, Master, mapping and unknown references. Excluded Master pairs cannot be used as successors.

| Scenario | Zero references | Hypothetical candidates | Additional assumptions |
|---|---:|---:|---|
| S0 current | 0 | 0 | none |
| S1 product references removed | 1943 | 0 | no other prerequisites inferred |
| S2 approved future disposition | 1943 | 0 | identity/content decisions approved; source obligations and policy unresolved |
| S3 disable only | 1943 | 0 | S2 plus future separately authorized disable |
| S3 all remaining prerequisites assumed / group E | 1943 | 1943 | source obligations resolved and preservation policy cleared for no-history rows |

S2 separates the pending disposition paths even while assuming their future approval:

| Disposition path | Total rows | Zero-reference rows in S1/S2 |
|---|---:|---:|
| MASTER_SUCCESSOR_REQUIRES_APPROVAL | 2 | 1 |
| MASTER_COVERAGE_REQUIRED | 2005 | 1932 |
| CONTENT_RETIREMENT_REQUIRES_OWNER_APPROVAL | 11 | 10 |

S3's full-assumption branch is a theoretical upper bound, never an approved cohort; it leaves learner history protected and never changes the real cleanup class. Current DELETE_SAFE_CANDIDATE remains 0.

## Relationship migration readiness

Topic membership uses (vocabulary_id, topic_id); its vocabulary FK has CASCADE delete. Set items use (learning_set_id, vocabulary_id) and preserve sort_order; their vocabulary FK has NO ACTION. Database constraint definitions are included in the readiness artifact. Master ownership infrastructure exists for both, with composite runtime-link FKs that prevent silent ownership drift. Runtime topic browse/progress/search use topic links; active assigned-set eligibility, queues, weak words and progress use set items.

A migration requires an owner-approved successor runtime ID; explicit relationship removal is an alternative requiring separate approval. Existing infrastructure does not establish a successor identity for legacy rows. Migration becomes deterministic only after successor/content and taxonomy identity decisions, duplicate-key and order policies, and assigned-set product impact are reviewed. No executable migration SQL is created. The cross-check helper now uses the same unqualified table key for both evidence storage and lookup; historical reference counts and accepted fingerprints are unchanged.

## Future approval sequence

1. Preserve all learner history on original runtime IDs; do not move it based on lexical or translation similarity.
2. Resolve vocabulary disposition: separately approve a Master successor, expand Master coverage, or approve content retirement. An excluded Sense cannot serve as that row's successor.
3. Review the enumerated topic IDs and learning-set IDs/sort orders, including product discovery and assignment impact. Migration/removal requires separate authorization.
4. Resolve source identity obligations and enabled runtime dependencies. No source identity is cleared by this plan.
5. Recheck catalog/reference completeness in a new read-only snapshot. Any Master, history or unknown reference blocks a hypothetical retirement cohort.
6. Obtain explicit retirement authorization before any disabling or deletion. No execution plan or SQL mutation is supplied here.

All seven authorization flags are NO: cleanup, delete, disable, merge, mapping writes, relationship migration and Master expansion. No approvals were inferred.

LEGACY_RETIREMENT_PLANNING_FINGERPRINT: `04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1`. Reproduce artifacts offline with `pnpm audit:legacy-reference-retirement-plan --check`; this check reads the persisted sanitized snapshot and never connects to a database. Historical Phase 2G.3A/2G.3A.1 artifacts and finalized reconciliation remain unchanged.
