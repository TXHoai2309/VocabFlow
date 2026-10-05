# PHASE 2F.6 — Hybrid-100 RC Final Audit

RC fingerprint: 06b2a4dec2f54438416cae67788e0683fe94907cbce0a60fbb2d6469bc25b82c
RC tree fingerprint: 9d021e151d934a61c577289a4aff3ded8883858bac672e1c27ac546a335966a7
Authorized CEFR fingerprint: d0a60b26f75b65c18953e76ed759447151ab81a880e9c3e869cbefc6f12bb622
Canonical promotion plan fingerprint: 969b5090a020b3f4793e6a77dcd78ce46fbb119036c45bfcf93bca81cc7a04db

## Audit result

- RC: 2.2.0-rc.1 / IN_REVIEW; immutable: YES; package tree and candidate fingerprint match their pinned values.
- Exact cohort: 87/87 Lexemes and 100/100 Senses from the owner-approved map; 99 CEFR Classifications; no extra/missing cohort Sense.
- Candidate counts: 87 Lexemes, 100 Senses, 99 Classifications, 799 Provenance, 1 Taxonomy snapshot; media 0, sets 0, relations 0.
- Provenance closure: 799/799; dangling 0; canonical hash/content mismatches 0; source types PROJECT_AUTHORED=602, OWNER_REVIEW=197. PASS.
- Semantic content drift: 0; CEFR value drift: 0; Classification ID drift: 0; confidence drift: 0.
- CEFR reuse audit: 1 existing Classification reused; full record hash drift 0. Water keeps its owner-reviewed existing A2 revision 1 record and confidence 0.55; the decision confidence 0.78 is editorial review metadata and does not rewrite a reused record.
- CEFR distribution: PRE_A1 = 0; A1 = 17; A2 = 28; B1 = 20; B2 = 27; C1 = 7; C2 = 0; UNCLASSIFIED = 1. Duplicate primary CEFR assignments: 0.
- Source rights remain UNVERIFIED; source text/media reused: NO. No LICENSED_SOURCE or PUBLIC_DOMAIN_SOURCE claim is present. The authored package reuses no source text/media, so unverified rights alone are not a blocker.
- Spot checks far, acute, toll, hopefully, textile, crawl, and compelling match the owner-reviewed semantic package exactly; no editorial rewrite was performed.
- Light: A1 revision 2 preserved (01a0fc13-09f1-76b9-8a57-6c6e55e9b438); Water: A2 revision 1 reused (01a0fc13-09f2-77bf-93db-1ceefb68082a); Fuse: intentionally unclassified (01a1070c-7c59-726e-88d6-cf9dc05adb73).
- RC contains no runtime import projection, reconciliation, mapping, contentVersion, or SQL plan. Canary fingerprint is unchanged.

## Current lifecycle inventory

| Entity | APPROVED | IN_REVIEW | DRAFT | other |
|---|---:|---:|---:|---:|
| LEXEME | 0 | 3 | 84 | 0 |
| SENSE | 0 | 2 | 98 | 0 |
| CLASSIFICATION | 0 | 1 | 98 | 0 |

- Approval-only next revisions required: 87 Lexemes, 100 Senses, 99 Classifications (286 total). Stable IDs are preserved; target revisions change only revision/status fields; learner-facing content change required: NO. No record has been created.
- Existing owner-review and project-authored Provenance already close the approved-content references. The current validator requires resolvable Provenance references, not a new OWNER_REVIEW record for each lifecycle transition; no new IDs are planned.

## Validator contract and taxonomy decision

- `vocabflow-dataset/schemas/dataset.schema.json:160` requires `releasedAt`, `releaseHash`, and `releaseHashAlgorithm` for APPROVED manifests; algorithm is `sha256-canonical-json-v1`.
- `scripts/validate-master-vocabulary-v2.ts:411-420` verifies SHA-256 over RFC 8785/JCS canonical manifest JSON with `releaseHash` omitted.
- `scripts/validate-master-vocabulary-v2.ts:669-675` requires included Lexeme, Sense, Classification, Learning Set, Relation, and Taxonomy records to be APPROVED. Lines 498-503 require approved content's Provenance references to resolve.
- Taxonomy option C: TAXONOMY_APPROVAL_POLICY_AMBIGUOUS. Current 01a0fc13-09e9-72dd-b49d-ffef077385dd / 2.0.0 is DRAFT. It must remain immutable; direct APPROVED release fails the validator. Framework stays CEFR / EDITORIAL-PILOT-1.
- The identity policy makes each taxonomyVersion an immutable snapshot and requires a new version for taxonomy record/value/hierarchy changes, but has no lifecycle-only approval version rule or taxonomy-specific PATCH/MINOR mapping. Existing repository snapshots are DRAFT; the canary has no taxonomy pin. Do not invent 2.0.1 or 2.1.0. Final build is blocked until the owner resolves this architecture decision.

## Proposed final manifest (not created)

- datasetId/code unchanged; datasetVersion 2.2.0; schemaVersion 2.0.1; eventual status APPROVED.
- Proposed pins: 87 Lexemes, 100 Senses, 99 Classifications, 1 approved Taxonomy snapshot (version pending owner decision), 799 Provenance, no Media, Learning Sets, or Relations.
- No new approval Provenance is required under the current validator contract; closure recomputes to 799. If a future contract requires release/lifecycle evidence, recompute that closure during the authorized build.
- The official releaseHash has not been created. In a later authorized build, set releasedAt and all final pins first, then compute SHA-256/JCS with releaseHash omitted.

## Decision

- RC_FINAL_AUDIT_PASS = YES
- CONTENT_CORRECTION_REQUIRED = NO
- NEXT_REQUIRED_RC = NONE
- TAXONOMY_APPROVAL_POLICY_RESOLVED = NO
- APPROVED_RELEASE_BUILD_TECHNICALLY_READY = NO (taxonomy architecture decision pending)
- APPROVED_RELEASE_AUTHORIZED = NO; owner authorization remains pending.
- Recommendation: APPROVE_RC_FOR_FINAL_RELEASE_BUILD after the taxonomy versioning decision is resolved. This does not create or authorize the release.
- RUNTIME_IMPORT_AUTHORIZED = NO; PRODUCTION_MUTATION_AUTHORIZED = NO.

## Execution boundary

Database connection: NONE. Database writes: NONE. Reconciliation scan: NO. Import apply: NO. Migrations: NONE. Development runtime mutation: NO. Production connection/mutation: NO.
No canonical records, lifecycle states, RC.1 files, release 2.2.0, or official releaseHash were modified or created.
