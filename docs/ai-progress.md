# Current Handoff Snapshot

- Project: VocabFlow Family MVP
- Current phase/batch: BATCH 1
- Current active story: US-01 Parent Registration
- Story status: READY FOR IMPLEMENTATION
- Current Git branch: `main`
- Baseline HEAD before documentation pack: `24e4580`
- Documentation/agent pack status: finalized and approved for repository baseline
- Last accepted baseline: BATCH 0 Foundation, recorded in commit `24e4580`
  with implementation baseline `2429b0f`
- CI status: Core CI PASS
- Database acceptance status: Trusted DB Integration PASS on Neon PostgreSQL 18
- Current implementation focus: US-01 Parent Registration implementation
  contract; feature code has not started
- Last completed work: BATCH 0 Foundation accepted; least-privilege migration
  executor and trusted DB acceptance evidence are in Git history.
- Files/areas most recently changed: `docs/implementation/`, then this
  documentation pack; no application feature code is changed here.
- Tests/evidence: Acceptance record under
  `docs/implementation/BATCH0_FOUNDATION_ACCEPTANCE.md`; source-to-Markdown
  paragraph/table parity check PASS; `pnpm lint`, `pnpm typecheck`,
  `pnpm test` (73/73), `pnpm build` and `git diff --check` PASS.
- Open blockers: None for the US-01 contract. Successful registration includes
  authenticated Better Auth signup followed by idempotent `POST /api/bootstrap`.
- Frozen areas: BATCH 0 bootstrap, role model, database targets, schemas, reset
  policy, migration executor and CI behavior unless a proven regression appears.
- Next safe action: Begin US-01 implementation from `T01-01` under the accepted
  story contract.
- Do NOT do next: Do not call Neon, modify migrations, or reopen BATCH 0 without
  regression evidence.
- Documents new agent must read first: `docs/README.md`,
  `docs/product/product-spec.md`, `docs/architecture/technical-architecture.md`,
  `docs/design/design-system.md`, `docs/design/feature-ui-spec.md`,
  `docs/flow/user-flow.md`, `docs/decisions.md`, `docs/roadmap.md`, the active
  story and this file.

## 2026-09-08 — Documentation and Agent Pack

### Goal

Create canonical Markdown documentation and a VocabFlow-specific AI-agent
operating contract before BATCH 1 implementation.

### Completed

- Audited the repository tree, package/configuration, apps, packages, Drizzle,
  scripts, workflows and current Git state.
- Converted six active canonical DOCX documents to Markdown.
- Added documentation index, source-baseline map, decisions, changelog,
  roadmap, story templates and US-01 contract.
- Added root `AGENTS.md` with VocabFlow scope, architecture, security, testing,
  documentation and Git rules.

### Decisions

- Family MVP remains the active product baseline; Personal MVP is historical.
- BATCH 0 is accepted and frozen.
- US-01 success boundary is Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.

### Files changed

- Canonical Markdown files under `docs/product`, `docs/architecture`,
  `docs/design`, `docs/flow` and `docs/implementation`.
- Documentation governance files under `docs/`.
- Story system under `docs/stories/` and `docs/templates/`.
- Root `AGENTS.md`.

### Verification

- Textual parity check: all source paragraphs and table cells found in their
  Markdown counterpart.
- DOCX sources contain no embedded media or diagrams requiring binary export.
- Markdown link/fence validation: PASS.
- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS.
- `pnpm test`: PASS (10 files, 73 tests).
- `pnpm build`: PASS.
- `git diff --check`: PASS.
- Packaged DOCX renderer could not run because bundled LibreOffice was not
  available in this environment; no DOCX output was authored.

### Remaining / blockers

- No contract blocker remains; no feature implementation has started.

### Next safe action

- Begin US-01 implementation from `T01-01`; keep learner creation out of scope.

## 2026-09-08 — Finalize documentation governance and US-01 contract

### Goal

Resolve the documentation status gate and finalize the owner-approved US-01
registration boundary before feature implementation.

### Completed

- Aligned `docs/README.md`, `docs/stories/README.md` and `AGENTS.md` on the
  shared story status model.
- Set BATCH 1 and US-01 to `READY FOR IMPLEMENTATION`.
- Accepted success boundary: Better Auth signup → authenticated session →
  `POST /api/bootstrap` → canonical default household resolved.
- Explicitly kept learner creation and new database schema/migration out of
  US-01.
- Corrected architecture conversion metadata to preserve source status
  `APPROVED FOR IMPLEMENTATION`.

### Verification

- Relative Markdown links and anchors: PASS.
- Vietnamese Unicode scan: PASS.
- No stale active DOCX links; remaining DOCX names are source-baseline/history
  references only.
- `git diff --check`: PASS.
- No application code, database code, migrations, CI or BATCH 0 changed.

### Remaining / blockers

- None for the accepted US-01 contract.
- Documentation/agent pack remains uncommitted by instruction.

### Next safe action

- Start US-01 implementation at `T01-01` only after the owner is ready to move
  from documentation review to implementation work.
