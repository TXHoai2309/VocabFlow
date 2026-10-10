# Phase 2H.2K-R1 — Reviewer B integration and recheck handoff

STATUS: INTEGRATED_PENDING_INDEPENDENT_RECHECK
REVIEWER_B_REPORT_IMPORTED: YES — four original files copied byte-for-byte from owner-supplied ZIP
REVIEWER_B_SOURCE_SHA256: c4a22c67d33402a18032f8d8014a69ea6251a2e1e754ccae240a0ae52b80a925
REVIEW_RECORDS_VERIFIED: 103 unique keys / 103 original local effectiveContentHash matches; 92 PASS / 11 REVIEW / 0 FAIL
AUTHOR_A_B_RECONCILIATION: 82 PASS/PASS; 8 PASS/REVIEW; 10 REVIEW/PASS; 3 REVIEW/REVIEW; 18 disagreements

All TSV records equal the parsed JSON records. The original TSV occurs as an exact byte sequence within the hash-verified original report. Metadata identifies the reviewed checkpoint and frozen cohort. Reviewer B independence is an owner-supplied session declaration retained with its provenance; transport integrity does not constitute cryptographic authentication or human approval. No substitute Reviewer B assessments were generated.

Reviewer B's O1681 reference for neighbor is intentionally nonlexical: Oxford record 1788223607720 is lend and contains the historical Vietnamese overlap. The existing neighbor forward-revision reason names that record; an eight-word comparison verifies the relationship. R1 records O1681 as similarity evidence, while V228 remains the linked lexical source. No lexical source identity was silently rebound.

## Four forward corrections

F01_LARGE: Author A revision applied; independent recheck PENDING

- English remains: A large box of donated books stood beside the entrance.
- BEFORE: Một thùng sách được quyên góp lớn nằm cạnh lối vào.
- AFTER: Một thùng lớn đựng sách được quyên góp nằm cạnh lối vào.
- The large object is explicitly the box; donated books and entrance location are preserved. No new agent or placement action is introduced.

F02_ALSO: Author A revision applied; independent recheck PENDING

- English remains: The workshop teaches sewing and also offers basic repairs.
- BEFORE: Buổi học hướng dẫn may và cũng có dịch vụ sửa chữa cơ bản.
- AFTER: Xưởng này dạy may và cũng cung cấp dịch vụ sửa chữa cơ bản.
- Workshop is interpreted coherently as a practical workshop/business providing both teaching and repair services. The additive meaning of also, present tense and both activities remain. No repair objects or fees are invented. Reviewer B must confirm this interpretation.

F03_PURSE: Author A revision applied; independent recheck PENDING

- BEFORE: Cô ấy giữ một chiếc chìa khóa dự phòng trong túi ngăn bên trong chiếc túi xách của mình.
- AFTER: Cô ấy giữ một chiếc chìa khóa dự phòng trong ngăn bên trong túi xách của mình.
- Inside pocket is rendered naturally without changing the spare key, holder, location or American handbag meaning.

F04_RAINFOREST: Author A revision applied; independent recheck PENDING

- BEFORE: Countable: a rainforest; rainforest plants names plants found there.
- AFTER: Countable: a rainforest. The phrase 'rainforest plants' refers to plants that grow there.
- Countability remains; the attributive phrase is clearly marked. Definition and examples are unchanged.

CONTENT_CORRECTIONS_APPLIED: 4 fields / 4 existing Senses
NEW_REVISED_CONTENT_HASHES:

| Finding | Revised effectiveContentHash |
| --- | --- |
| F01 | 16fdd82d0907d5adbc2f8071e88366ccd7bd761121f82ccd29570e8ce6cb738e |
| F02 | 83056ed20f1ef69e4c5abc4c0c7c92268f46002c11ff3bccff0465d8040d11e3 |
| F03 | 9f99df805191c9e50ad43c4009f9b36ceb4eecbd360efa7b237e5365659cb097 |
| F04 | 15999fd6f97137b8a55f8cf0ff84ed435985b89d38c3d1f16fe7ee2060093bcb |

The additive field-correction evidence stores each proposalKey, original reviewed hash, field pointer, exact BEFORE/AFTER, raw UTF-8 field SHA256, revised content/record hashes, finding ID, Author A provenance and source references. Reviewer B's original judgments remain bound to original content. All four modified Senses are explicitly awaiting independent recheck. The 103-row reconciliation retains both complete original reviews and all 13 Author A REVIEW concerns, even where Reviewer B found content PASS.

## Deferred coverage queue

COVERAGE_CANDIDATES_REVIEWED: 6
COVERAGE_CANDIDATES_DEFERRED: 6 — no new Senses inserted

| Candidate | Disposition | Reason |
| --- | --- | --- |
| M01 forget to do | STRONG_CANDIDATE | O478 directly demonstrates omitted actions; current recollection meaning remains correct but incomplete. |
| M02 together, combining things | STRONG_CANDIDATE | O232 mixes flour/water; V307 includes things; current definition only covers people. |
| M03 chemist, British pharmacist | NEEDS_MORE_EVIDENCE | V1700 Vietnamese gloss suggests pharmacist; English definition/example only demonstrate scientist. Regional English evidence requires further acceptance. |
| M04 history, past events/development | STRONG_CANDIDATE | O267 building history and V208 turning point concern events, not the discipline of study. |
| M05 perfect, ideally suitable | STRONG_CANDIDATE | O382 perfect for a picnic supports suitability separately from faultless spelling. |
| M06 possible, uncertain truth/occurrence | STRONG_CANDIDATE — boundary review | O288 possible that contrasts with possible to. Happen is already in the definition: this is a potential split of merged scope, not an entirely absent meaning. Existing content is unchanged and F10 remains unresolved. |

Each candidate has exact original content-hash binding, linked source references, exact source-field quotations and substantive Vietnamese adjudication. Quotes are evidence, not newly authored learner prose. The pharmacist external dictionary links are preserved in Reviewer B's report but were not newly verified or promoted to accepted source evidence in this integration.

TAXONOMY_SIXTY: DRAFT NUMBER preserved; canonical mapping unresolved
PREVIOUS_SENSES_PRESERVED: 1563
PRIOR_DRAFT_CORRECTIONS_PRESERVED: 40
NEW_SENSES_PRESERVED: 103
NEW_GROUPS_PRESERVED: 100
TOTAL_GROUPS: 1120
TOTAL_DRAFT_SENSES: 1666

The original cohort, five sealed manuscripts, five review manuscripts, seals, original assembled snapshot and neighbor revision remain byte unchanged. Effective R1 content retains the prior neighbor forward revision. Its old eight-word overlap remains in the historical sealed manuscript; it has not been erased from all stored versions.

SOURCE_SIMILARITY: four short conventional-match observations preserved; final effective eight-word overlaps and exact copied English examples both zero across all 9677 source records. Conventional short matches are not automatically copyright infringement, and the heuristic screen is not rights clearance.

## Executed checks and handoff

TEST_RESULTS: R1 focused tests 14/14 PASS; original authoring tests 21/21 PASS; AST parsing PASS; seven TypeScript projects PASS; pnpm ESLint PASS; git diff --check PASS

Typecheck used tsc -p with --noEmit --incremental false --composite false for api, tests/api, apps/web, apps/api, packages/contracts, packages/learning-domain and scripts. The existing Node engine warning remains: wanted 22.23.2, installed 22.19.0. Tests/typecheck/lint had identical all-file SHA256 and Git-status snapshots before/after each command.

ZERO_WRITE_REPLAY: PASS — R1 seeds 20261010 and 271828, identical output/fingerprint; all tracked and untracked file hashes/status unchanged after each replay
R1_REVISION_FINGERPRINT: b3bfb4e69fc5a51bc6a6c26075daf59e2f938b4653965b2ee7519aafb4516eab
ORIGINAL_CHECKPOINT_FINGERPRINT: 3b970929ff32949443e3773dcd123367057bd38c38e1f7aa62d282b440f897c1 — unchanged, original replay PASS
FROZEN_COHORT_FINGERPRINT: f20e8c59d7b47cdf80f026d16acda8dbb283f948c8d5cb61cfef9c60cb7652c8 — unchanged
R4P3_VERIFICATION: PASS_WITH_TWO_EXPLICIT_EOL_EQUIVALENCES — 488 unique pins; fingerprint bf902b322460203c3ac8d1c7bcc404154c22672977a7063272b6b711b00d00b8; zero writes

REVIEWER_B_RECHECK: PENDING
CURRENT_PUBLICATION_READINESS: NOT_READY — F01/F02 remain gates until independent recheck evidence
COMMIT_SHA: NONE
PUSH_STATUS: NOT_ATTEMPTED
CACHE_FILES_CHANGED: NONE
STASHES_WORKTREES_PRESERVED: 7 / 12 including VocabFlow-us55
DATABASE_ACCESS / WRITES: NONE / NONE
PRODUCTION: UNTOUCHED
RIGHTS: UNKNOWN_REVIEW_REQUIRED
CONTENT_STATUS: DRAFT
HUMAN_APPROVALS / CANONICAL_IDS: 0 / 0

EXACT_NEXT_ACTION: Provide Reviewer B with checkpoints/checkpoint-01/revisions/reviewer-b-r1/assembled/reviewer-b-recheck-request.md and reviewer-b-recheck-handoff.json. Obtain an independent recheck for all four revised Sense hashes, including their full surrounding context and retained concerns. Do not interpret Author A validation as Reviewer B approval. Do not stage/commit/push or begin checkpoint 02 while this gate is pending.

Read-only local replay: set PYTHONDONTWRITEBYTECODE=1 and run python -B scripts/phase-2h2k-review-integration.py --check. Do not rerun --assemble against the existing immutable R1 snapshot. Any additional revision must be a new forward version with new hash-bound evidence.
