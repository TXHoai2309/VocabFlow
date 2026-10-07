# Phase 2G.3C — Legacy content disposition and Master expansion plan

Status: PASS — planning only. Baseline: `ad1aa6813628c73504baa016e9059a9d165a53be`. All 2018 legacy rows are assigned exactly one content disposition; learner history protection is an independent flag, not a reason to discard useful content.

## Dispositions

| Disposition | Rows |
|---|---:|
| MASTER_EXPANSION_CANDIDATE | 2005 |
| MASTER_IDENTITY_REVIEW | 13 |
| CONTENT_RETIREMENT_CANDIDATE | 0 |
| HISTORY_PRESERVATION_ONLY | 0 |
| CONTENT_OWNER_REVIEW_REQUIRED | 0 |

NO_MASTER_CANDIDATE is a coverage gap, not evidence of obsolete content. Current canonical topics, existing Vietnamese, active product and curated-set membership support provisional expansion; disabled rows are not classified as obsolete. Missing definitions/examples require original future authoring. No explicit owner catalog-retirement evidence was supplied, so no retirement or history-only disposition is invented. Insufficient lemma/meaning evidence is routed to owner review.

## Product coverage

| Current topic | Legacy rows | History protected |
|---|---:|---:|
| action | 144 | 4 |
| body | 128 | 5 |
| casual | 150 | 8 |
| challenge | 37 | 0 |
| clothing | 71 | 0 |
| common-place | 119 | 5 |
| communication | 49 | 4 |
| computer-office-science | 98 | 0 |
| emotion | 260 | 5 |
| family | 32 | 1 |
| food | 147 | 22 |
| healthy | 52 | 0 |
| miscellaneous | 264 | 3 |
| nature | 124 | 3 |
| object-in-house | 269 | 22 |
| photography | 11 | 0 |
| writing-numbers | 71 | 1 |

Topic counts overlap. Runtime levels are GRADE_1–GRADE_5/GENERAL or null, never CEFR. CEFR remains unclassified for all legacy rows here. Existing school grade and set grade are evidence, not newly assigned classifications. Definition-leading "to" supplies only a verb cue; every POS requires review. Normalized lemma families identify lexical review groups, not merged Lexemes or Senses. All source text/media rights remain unverified; copied runtime text is review evidence and is not promoted to canonical Master.

## Special owner identity review

| Runtime | Progress/review/saved refs | Topics | Sets:order | Accepted state | Master candidates | Disposition | New Sense requirement | Preserve history runtime? |
|---|---|---|---|---|---|---|---|---|
| #11 water | 1/5/0 | food, nature | starter-vocabulary:10, grade-1-starter:7, everyday-words:1 | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a0fc13-09ef-75ac-b815-039ab337c01a (VERB, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | YES |
| #295 apple | 1/2/0 | food | grade-1-food:60 | EXISTING_MASTER_RUNTIME_DUPLICATE; 0 exclusions | 01a0fc13-09ed-70b4-801b-408be3b771e9 (NOUN, POSSIBLE) | MASTER_IDENTITY_REVIEW | OWNER_DECISION_REQUIRED; EXISTING_SENSE_REUSE_OR_NEW_SENSE | YES |
| #405 water | 0/0/0 | food | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a0fc13-09ef-75ac-b815-039ab337c01a (VERB, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #846 fuse | 0/0/0 | casual | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c59-726e-88d6-cf9dc05adb73 (NOUN, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #849 record | 0/0/0 | casual | none | MULTIPLE_MASTER_CANDIDATES; 0 exclusions | 01a0fc13-09ee-71ff-9a0a-a96e48ef7dac (NOUN, POSSIBLE); 01a0fc13-09ee-7823-95fc-5d1d76f13fa5 (VERB, POSSIBLE) | MASTER_IDENTITY_REVIEW | OWNER_DECISION_REQUIRED; EXISTING_SENSE_REUSE_OR_NEW_SENSE | No history; other gates remain |
| #944 kick | 0/0/0 | action | grade-1-actions:80 | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c58-76b5-a2ab-0ab34eedf7c6 (NOUN, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #1260 light | 0/0/0 | object-in-house | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 3 exclusions | 01a0fc13-09ee-7768-9be6-d20fa32521ee (ADJECTIVE, NONE); 01a1070c-7c57-7676-9acd-d23079256ae2 (VERB, NONE); 01a1070c-7c59-726e-88d5-9c1965cff571 (ADJECTIVE, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #1313 struggle | 0/0/0 | challenge | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c58-76b5-a2a9-92d544914a1a (VERB, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #1330 grapple | 0/0/0 | challenge | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c58-76b5-a2a9-92d544914a1a (VERB, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #1463 precise | 0/0/0 | emotion | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c57-7676-9acf-b1c2d0e92475 (ADJECTIVE, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #1477 struggle | 0/0/0 | emotion | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c58-76b5-a2a9-92d544914a1a (VERB, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #1482 muster | 0/0/0 | emotion | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c56-71df-b6f0-39632387320e (VERB, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |
| #1796 liable | 0/0/0 | miscellaneous | none | OWNER_REVIEWED_NOT_SAME_IDENTITY; 1 exclusions | 01a1070c-7c59-726e-88d4-83e56ae5f536 (ADJECTIVE, NONE) | MASTER_IDENTITY_REVIEW | DISTINCT_SENSE_REQUIRED_IF_MASTER_COVERAGE_APPROVED | No history; other gates remain |

Accepted exclusions remain non-identity for their precise reviewed pairs. Those eleven rows may represent useful distinct legacy Senses; they require fresh owner identity decisions, not adoption of the rejected Hybrid Sense. #295 apple stays duplicate review; #849 record stays noun/verb ambiguous. #11 retains 1 progress and 5 review references. #284 booking remains Master-managed and is excluded from every legacy batch.

## Proposed expansion phases

| Phase | Review rows | Expansion candidates | Estimated lemma/Lexeme groups | Repeated lemmas | Source obligations | Identity gates |
|---|---:|---:|---:|---:|---:|---:|
| A_HISTORY_ACTIVE_PRODUCT_REVIEW | 75 | 73 | 75 | 0 | 46 | 2 |
| B_ACTIVE_TOPIC_SET_NO_HISTORY | 166 | 165 | 166 | 0 | 166 | 1 |
| C_REMAINING_COVERAGE_REVIEW | 1777 | 1767 | 1750 | 27 | 1777 | 10 |
| D_CONTENT_RETIREMENT_REVIEW | 0 | 0 | 0 | 0 | 0 | 0 |

Review batches: 11; sizes: A-01=75, B-01=166, C-01=200, C-02=200, C-03=200, C-04=200, C-05=200, C-06=200, C-07=200, C-08=200, C-09=177. Target is 200 review units, within a 100–300 limit; the small 75-row history cohort is not padded. Repeated lemma families stay together within a phase. Estimated Lexemes count distinct normalized lemmas only; existing Master reuse, homographs, duplicate rows and true polysemy still require human decisions. Confirmed polysemy count is unknown. A row is a review unit, not a newly allocated Sense.

A reviews history-protected useful content first. B covers enabled runtime or enabled-set relevance without history. Generic topic membership alone does not make all disabled content immediately high priority; C retains that coverage for later controlled authoring. D is reserved for evidence-backed retirement review and is empty without such evidence. The 13 special identity cases are gates within their phases; owner-review rows cannot proceed automatically.

For each phase: settle identity and product scope; establish rights and author original definitions/examples; resolve POS and optional CEFR separately; validate an editorial draft; obtain separate owner approval for canonical promotion, runtime reconciliation and import. Topic/set migration follows approved successors. No Master IDs, content revisions, releases, mappings or import artifacts are created here.

## Retirement dependencies

Each row records applicable NEEDS_MASTER_AUTHORING, NEEDS_MASTER_IDENTITY_DECISION, NEEDS_CONTENT_RETIREMENT_APPROVAL, NEEDS_HISTORY_PRESERVATION_POLICY, NEEDS_TOPIC_RELATIONSHIP_MIGRATION, NEEDS_LEARNING_SET_RELATIONSHIP_MIGRATION and NEEDS_SOURCE_IDENTITY_RESOLUTION gates. None is marked resolved. History remains on original runtime IDs regardless of future active-catalog retirement. No row may move toward deletion merely because it is inactive, lacks Master coverage or later loses taxonomy links.

Development content was read in REPEATABLE READ, READ ONLY as vocabflow_runtime, with provider/DB identity verified and inventory/reference content unchanged from 2G.3B. The 75 history rows, 108 Master-managed rows and 100/100 Hybrid checkpoint remain protected. Production was not connected or queried. No DB writes, mapping writes, relationship migration, disable, deletion, Master authoring or apply occurred. All six authorization flags are NO. Frozen release check PASS.

PLANNING_FINGERPRINT: `d60ea07432633de6ab4bb0516ce9401252c6d03982c77710f0b2a71c0968ac09`. No timestamps occur in its payload. Accepted semantic and retirement fingerprints remain `5115d7021d7a66466fe87ded8ae49f24ceb399edf1e1c9981b990f3443acdfea` and `04feaa380fa441633ef8a4c84b8d0e5a5aee48d03a7a5ff020866c789eb8cdd1`. Offline verification: `pnpm plan:legacy-master-expansion --check`.
