# US-59 — Consistent, compact learning catalog

## Owner-requested follow-up — 2026-10-28

- Follow-up status: `IMPLEMENTED / READY FOR OWNER CHECK`.
- The owner explicitly requested removal of the pictured “Duyệt theo chủ đề”
  entry on Vocabulary. Remove that header navigation and its unused styles;
  preserve taxonomy, topic memberships, collection APIs and study scope.
- Reprioritized narrow scope: this navigation removal only. The owner later
  confirmed the nine-level grouping, implemented separately in US-63. No
  database or data operation is part of this navigation follow-up.
- Removed the header link, unused URL construction and link-specific CSS.
  Updated its existing component expectation. Verification: 27/27 browse
  component tests, 2/2 existing catalog Chromium E2E tests at 375/1440px,
  web TypeScript, changed-source ESLint and production build pass. Both E2E
  screenshots were inspected; APIs are mocked so this does not establish live
  local-DB compatibility. Impeccable detector returns no findings. No deployment.

- Status: IMPLEMENTED / READY FOR OWNER CHECK
- Owner: Project Owner
- Last updated: 2026-10-21
- Baseline commit: 1e8ab34

## Authority and outcome

Owner accepted the three-phase improvement plan, phase 1 first, Q5 parent
topics including descendants, and Q4 excluding inferred classifications from
the main catalog. Preserve the all-ages product and existing account/guest
security and scheduler invariants. Sources: product spec, technical architecture,
design system, feature UI spec, US-58, decisions and the 2026-10-21 audit.

## Scope

- V2 All/default/Pathway use enabled dataset content, even outside learning sets.
- Browse and study preserve explicit grade/CEFR/topic constraints with no broad
  fallback for an empty intersection. Topics include enabled descendants once a
  canonical parent relationship is available; duplicate membership does not
  duplicate words.
- Main topic discovery uses normalized reviewed/source classifications rather
  than raw tags. Preserve inferred evidence separately, not as primary filters.
- Lightweight saved-state reads, reduced dashboard candidate capacity and
  reusable metadata where safe. Preserve counts and canonical review writes.
- Compact shared vocabulary cards, clearer topics and source metadata in
  detail/review views. Preserve full original meanings and content.

## Boundaries

No deployment, production data operation, automatic topic approval, grade
inference, textbook alignment claim, preference feature, new curriculum,
rewritten auth/scheduler or history mutation. Display presets and curated
grade 1–2 pathways remain phases 2 and 3. Existing draft work is preserved.

## Acceptance

- AC1: V2 All includes enabled words outside sets; disabled words remain absent.
- AC2: Shared scope validates grade/CEFR and preserves it in setup, study,
  account predicates and guest selection. Invalid values fail closed.
- AC3: Canonical topic identity, membership review evidence and hierarchy have
  explicit semantics; inferred-only content never becomes approved by renaming.
- AC4: Page loading does not download complete saved vocabulary just to mark
  bookmarks; authentication/ownership failures remain visible and isolated.
- AC5: Dashboard smaller queues retain full source counts and daily allowance.
- AC6: Shared cards show a concise meaning without pipeline notices; full
  meaning/explanation remains available in detail. Keyboard/empty/error/loading
  states and existing tokens remain.
- AC7: Targeted regression tests and relevant repo checks recorded below.

## Implementation record

Local implementation completed after owner confirmation of Q4/Q5.

- All V2 broad sources use the enabled dataset; grade and CEFR constrain both
  Due and New before limits, and guest selection uses the same intersection.
- Shared topic closure drives browse/count/detail/progress/search/queue and
  public topic membership. UNION/EXISTS prevent cycles from hanging reads and
  duplicate links from multiplying word counts. Migration 0020 adds node/link
  review states, nullable parent FK/index and self-parent guard; existing
  reviewed Master ledger and exact legacy source classifications are retained.
  The five parent edges are pinned to taxonomy 2.0.1. Arbitrary hierarchy edits
  are not exposed; future editors must validate longer cycles before writing.
- Inferred-only topics stay outside discovery; words remain in broad browse.
  Reviewed importer/adoption and source curation paths explicitly publish their
  proven classifications. No runtime content is automatically approved.
- Browse supplies page-local isSaved; metadata is public-only and cached 60s
  per database/dataset. Stateless Neon HTTP client reuse is bounded to four
  connection identities so this cache survives repeated requests. No learner
  progress/saved data is shared in that cache.
- Home requests capacity 5 rather than the default 20 Due + 10 New; counts and
  daily allowance remain independent. Broad-source setup no longer waits for
  the set catalog. The two fixed-empty dashboard endpoints remain a possible
  future consolidation; no client infers V2 capability from an empty response.
- Cards are compact and their buttons are outside the detail link. Published
  images are not labeled Development merely because a Master ID exists.
  Topic focus and selected state are distinct. Primary action preserves grade,
  CEFR and canonical topic ID into setup; it is hidden during text search so
  it never suggests the session is limited by a text query it cannot preserve.

## Verification

- 20 relevant Vitest files: 331 tests PASS (catalog, topic policy/progress,
  browse, review queue, guest selection, cards, setup, Home and migration shape).
- 4 import/curation suites: 63 tests PASS, including the production operator
  fixture; these are mocked/offline tests, not production operations.
- Chromium E2E: 2/2 PASS at 375px and 1440px; inspected screenshots. Tests cover
  no full saved-word read, scoped start URL, bookmark state, no nested button
  inside card links, and no horizontal overflow.
- Build PASS (including client secret/source-map scans); web and API TypeScript
  checks PASS; ESLint on changed source files PASS; git diff check PASS.
- Full test run: 108 files PASS, 20 files FAIL, 1 file skipped; 1560 tests PASS,
  28 FAIL, 17 skipped. Failures concern historical dataset/release pins, earlier
  tree/HEAD assumptions, source identity fixtures and timeouts. Do not treat
  this run as an all-green repository check. The final targeted runs above
  cover the implemented change after corrections.
- Global lint still fails in pre-existing local/historical scripts (including
  ignored .vocabflow-local); global typecheck still fails in backfill/pending
  and local Postgres scripts outside this change. No broad suppressions added.

## Rollout and remaining work

No commit, push, deployment, live DB operation or live timing measurement was
performed. Migration 0020 has been generated and structurally tested, but not
executed against PostgreSQL in this task; use the trusted DB integration and
migration path before rollout. Apply it before code expecting its columns.
Source metadata still contains only inferred topic memberships and zero grade
assignments in the inspected overlay; the UI must not claim curated grade 1–2
content is already available. Existing strict old browser contracts may need
a page refresh when the additive catalog fields are deployed.

Phase 2 display preferences are tracked separately in US-60 after the owner's
explicit reprioritization; phase 3 editorial content remains. Owner manual
acceptance and DB migration validation are pending; this story is not
ACCEPTED/CLOSED.
