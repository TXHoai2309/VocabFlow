# Phase 2F.4 — Hybrid 100 CEFR Classification Draft and Release Readiness

## Scope and pinned base

- Candidate cohort: 100; owner-approved semantic fingerprint: `a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d`. Canonical Master: 103 Lexemes / 123 Senses / 846 Provenance; root remains DRAFT 2.0.0 / schema 2.0.1.
- Framework: `CEFR / EDITORIAL-PILOT-1`; taxonomy 01a0fc13-09e9-72dd-b49d-ffef077385dd version 2.0.0; rubric HYBRID-CEFR-EDITORIAL-RUBRIC-1.0.0.
- Decision types: reuse 1; new editorial 94; owner review 4; insufficient evidence 1.
- Source CEFR tags informed review but did not determine a recommendation. The original 18-per-band draw is sampling design, not a target distribution.

## Proposed level distribution

- PRE_A1 = 0
- A1 = 17
- A2 = 28
- B1 = 21
- B2 = 27
- C1 = 6
- C2 = 0
- UNCLASSIFIED = 1

## Evidence and review

- Oxford-backed: 90/90. Source agreement: 48/90 (53.3%); editorially adjusted: 39; source disagreement held for owner review: 3.
- 4600-only: 9/10 have an editorial level; the remaining candidate is unclassified because its narrow technical Sense does not support a defensible general estimate. No 4600 CEFR value was inherited.
- Confidence: strong 19; reasonable 77; tentative 3; below 0.60 1. Tentative recommendations require explicit owner review.
- Existing CEFR audit: 2 candidates have existing CEFR records; same framework 2, other framework 0, multiple 0, conflicting records 0. One recommendation conflicts with an existing same-framework pilot value; it is held for owner review. Duplicate primary assignments: 0.
- Polysemy review: 12 multi-Sense groups checked independently. QA: PASS. Siblings may differ when their meanings differ.
- QA warnings: 48; each is recorded with the affected candidate and does not silently alter a decision.

## Editorial first-pass corrections

- 24/98 newly authored Senses had at least one correction group: 24.49%.
- Candidate groups by category (categories overlap): semantic target or Sense label 6; definition 8; Vietnamese translation 8; example 18; naturalness 7; collocation 1.
- The highest meaning risk came from semantic target/label changes; definition and translation changes affect meaning clarity; example, naturalness, and collocation edits usually carry lower semantic risk while still affecting teaching quality.

## Rights and release readiness

- Source and media rights remain UNVERIFIED. No Oxford or 4600 source prose or media was reused, and no licensed/public-domain source provenance was created. The CEFR label is a VocabFlow editorial estimate, not an official source claim.
- Content cohort ready: YES. Approved release ready: NO. CEFR recommendations and the existing-value conflict still require owner review.
- Other classifications, pronunciation, and 100-Sense runtime reconciliation have not started. Runtime evidence remains the separate 8-Sense canary only.
- No canonical Classification records or root pins were changed. No release was created, no runtime import ran, and no database or production mutation occurred.
- Recommended next scale option: `BUILD_100_SENSE_RELEASE_CANDIDATE`. Validate promotion and immutable release construction with this 100-Sense cohort after owner review, before expanding authoring to 500. This is a recommendation only; no next-phase work was executed.

## Determinism

- CEFR draft fingerprint: `2da4c57ebbd18ce5e2c1fa77749fb7fe79a2f22752ba39506d2f59a7d7804a74`. The fingerprint covers the exact cohort pins, approved semantic and promotion fingerprints, taxonomy pin/hash, rubric, decisions, identity registry, project-authored provenance draft, and release-readiness contract.
- Classification and provenance IDs are deterministic RFC 9562 UUIDv7 values. A materialized rerun allocates no additional IDs.

See [owner review sheet](hybrid-100-cefr-owner-review.md) and [workspace](../workspaces/hybrid-100-cefr-draft/README.md).
