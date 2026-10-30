# US-63 — Nine learning levels in Vocabulary discovery

- Status: `IMPLEMENTED / READY FOR OWNER CHECK`
- Owner: Project Owner
- Last updated: 2026-10-28
- Authority: owner explicitly confirmed the nine-level proposal following the
  local data audit and earlier requested the Vocabulary filters to be changed.
- Priority: this is the next narrow discovery slice after US-59 navigation
  removal. US-62 content authoring remains separate.

## Outcome and scope

Vocabulary uses one primary “Mức học” selector: Làm quen chữ và âm, Từ đầu
tiên, Câu đầu tiên, Sơ cấp (A1), Cơ bản (A2), Trung cấp (B1), Trên trung cấp
(B2), Nâng cao (C1), Chuyên sâu (C2). Include All and a separate Unclassified
choice. The six CEFR groups keep their existing `cefr` query identities.
Unclassified is an explicit query-filter token, never a stored CEFR value.

The three introductory groups have no eligible content yet. Show their names
with “Chưa có nội dung” as disabled options. They cannot start a broad session
or be fabricated from missing CEFR. Published foundational content requires its
own reviewed item/placement model in the content-authoring slice; this UI does
not provide an implicit publication path. Preserve valid CEFR options supplied
by the active catalog; unavailable bands are visible but disabled.

Move school grade and topic selectors into an accessible additional-filters
disclosure. Existing filters remain independent and survive refresh, browse,
setup and study. Selected supplementary constraints must be visible on opening
the page. Use the established theme, native controls and empty/error states.

## Acceptance

- AC1: all nine labels are visible in the selector; the first three are honestly
  unavailable. CEFR is not duplicated as a second main selector.
- AC2: the six named CEFR choices select the exact existing level; selecting
  Unclassified matches only absent/blank CEFR, never all content.
- AC3: account browse/count/queue and guest queue apply equivalent Unclassified
  predicates before capacities. Invalid and duplicate query values fail closed.
- AC4: grade/topic remain supplementary, intersect the main selection, and are
  preserved into study. Empty intersections remain empty.
- AC5: no new grades, age labels, content, media, tables, migrations, progress
  changes, paid API calls or deployment are included.
- AC6: meaningful contract/API/guest/UI tests, mobile/desktop browser evidence,
  changed-source lint, web/API typechecks and build are recorded.

## Boundary

The confirmed decision selects the discovery system, not learner proficiency
assessment or mandatory progression. It does not make CEFR an age/curriculum
claim. The audited Docker schema mismatch remains a separate local rollout task;
offline/mocked tests do not establish its compatibility.

## Implementation and verification

- Added shared learning-level names, filter validation and absent/blank matching
  in `packages/contracts/src/learning-levels.ts`. The existing `cefr` parameter
  remains compatible for A1–C2; the Unclassified token is query-only.
- Main Vocabulary selector lists the nine names and separate All/Unclassified.
  Introductory options are disabled with an explanation; bands absent from the
  current catalog are unavailable. Initial loading/failure is distinguished
  from a successfully loaded catalog with no content.
- Grade/topic are in a native disclosure, opened for active supplementary
  constraints. Shared topic/collection filters and setup use the same names.
- One SQL predicate is reused by browse/count and account queue; guest queue
  and collection/topic summaries use the corresponding shared match function.
  Grade/topic intersection, capacities and progress identities are preserved.
- Nine targeted Vitest files passed 242/242 tests. After the final metadata
  availability-state correction, the affected Vocabulary suite passed 30/30
  (including one additional case distinguishing load failure from no content).
  The exact suite list is in the verification report; no whole-repository
  all-green claim is made.
- Chromium: 4/4 tests pass across account/guest at 375/1440px, including the
  opened native menu, keyboard skipping unavailable options, initial loading,
  retry with selection intact, no-results, reload and study scope. Inspected
  menu, Vocabulary and guest screenshots. Browser APIs are mocked.
- Web/API TypeScript, ESLint for all changed TS/TSX sources, build and diff
  checks pass. Strict premium audit has zero findings; the Impeccable detector
  also returned no findings. Existing main-bundle and dynamic-import build
  notices remain. No runtime token/theme migration was needed.
- No database migration/backfill, generated content, provider call, commit,
  push or deployment. Docker schema incompatibility found by the audit remains
  an explicit limitation for live local end-to-end validation.

Evidence: [verification report](../qa/US-63-verification.md) and
[strict static audit](../qa/US-63-premium-ui-audit.json).

## 2026-10-29 — Foundation draft coordinator review

Both offline worker handoffs verified.08sixletters/twelveactivities need neutral
pre-answer instructions (C08-01);09twelveutterance drafts have no blocking
wording issue identified. Shared typed target/progress policy is still proposed.
Neither introductory selector is enabled by this review. Follow-up prompts:
[review](../plans/editorial-refresh-2026-10-28/parallel-08-09-review-r0001/review.md).

## 2026-10-29 — Corrected foundation drafts reviewed

08C08-01resolved in offline r0002projection;09compatibility and coordinator
forward bridge PASS. Separate implementation contract prepared at
[foundation pilot contract](../plans/editorial-refresh-2026-10-28/parallel-08-09-review-r0002/implementation-contract.md),
READY FOR CONTRACT REVIEW. No new introductory runtime enabled by draft review.
