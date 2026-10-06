# Hybrid-100 RC Final Audit — Current State after Phase 2F.6A

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

## Historical Phase 2F.6 decision (2026-10-05)

- Historical decision: RC pass = YES; content correction required = NO; next required RC = NONE.
- At that time, taxonomy policy resolved = NO; approved release technically ready = NO. The taxonomy approval version policy was unresolved then.

## Current state — Phase 2F.6A (2026-10-06)

- Owner taxonomy architecture decision: APPROVED. Taxonomy policy is resolved; this decision authorizes the architecture only.
- Taxonomy 01a0fc13-09e9-72dd-b49d-ffef077385dd: 2.0.0 / DRAFT remains immutable (67ecd13e49e756df6fce2def9f40fe11eb8831ef9a68097299d37324ac588b79); planned new snapshot 2.0.1 / APPROVED, PATCH, same taxonomyId, framework CEFR / EDITORIAL-PILOT-1.
- Approval-only semantic projection fields: taxonomyId, cefrFrameworks, topics, domains, exams, curricula, schoolLevels, difficultyScales. Excluded only top-level snapshot metadata: taxonomyVersion, status, createdAt, updatedAt. Nested lifecycle fields remain in the comparison. Required future semantic diff = 0; actual 2.0.0→2.0.1 comparison is NOT YET VERIFIED because the target snapshot does not exist.
- Policy fingerprint: 9596e407a8448a0aa4b6edb1944154ca4754ac396596501c06b9272318c2779b; repeated canonical computation identical: YES.
- Version policy: PATCH = Lifecycle/governance-only transitions or metadata-only corrections that preserve taxonomy semantic meaning, identifiers, values, and hierarchy. MINOR = Backward-compatible additive semantic taxonomy changes, such as adding a Topic, Domain, Framework, taxonomy value, or additive hierarchy/content extension. MAJOR = Breaking semantic taxonomy changes, such as incompatible interpretation, code/identity semantics, hierarchy semantics, or a release-line reset requiring migration.
- The target snapshot is plan-only and was not materialized. No taxonomyRevision field is used.

### Validator contract

- `vocabflow-dataset/schemas/dataset.schema.json:160` requires `releasedAt`, `releaseHash`, and `releaseHashAlgorithm` for APPROVED manifests; algorithm is `sha256-canonical-json-v1`.
- `scripts/validate-master-vocabulary-v2.ts:411-420` verifies SHA-256 over RFC 8785/JCS canonical manifest JSON with `releaseHash` omitted.
- `scripts/validate-master-vocabulary-v2.ts:669-675` requires included Lexeme, Sense, Classification, Learning Set, Relation, and Taxonomy records to be APPROVED. Lines 498-503 require approved content's Provenance references to resolve.
- Historical Phase 2F.6 taxonomy decision was TAXONOMY_APPROVAL_POLICY_AMBIGUOUS; current resolved decision is CREATE_NEW_APPROVED_TAXONOMY_SNAPSHOT. Directly pinning the existing DRAFT snapshot in an APPROVED release fails the validator.

## Proposed final manifest plan (not created)

- datasetId/code unchanged; datasetVersion 2.2.0; schemaVersion 2.0.1; eventual status APPROVED.
- Planned exact pins: 87 Lexemes, 100 Senses, 99 Classifications, taxonomy 2.0.1 / APPROVED, 799 Provenance, 0 Media, 0 Learning Sets, 0 Relations.
- Approval-only next revisions: 87 Lexemes, 100 Senses, 99 Classifications (286 total); stable IDs preserved; semantic content changes required: NO. Provenance closure is recomputed from pinned candidate data.
- Final release build is technically ready, but remains unauthorized. No target revisions or final package artifacts have been created.
- The official releaseHash has not been created. In a separately authorized build, set releasedAt and all final pins first, then compute SHA-256/JCS with releaseHash omitted.

## Decision

- RC_FINAL_AUDIT_PASS = YES
- CONTENT_CORRECTION_REQUIRED = NO
- NEXT_REQUIRED_RC = NONE
- TAXONOMY_POLICY_OWNER_APPROVED = YES
- TAXONOMY_APPROVAL_POLICY_RESOLVED = YES
- APPROVED_RELEASE_BUILD_TECHNICALLY_READY = YES
- APPROVED_RELEASE_AUTHORIZED = NO; separate final-build authorization is pending.
- Recommendation: REQUEST_FINAL_RELEASE_BUILD_AUTHORIZATION. This phase does not create or authorize the release build.
- RUNTIME_IMPORT_AUTHORIZED = NO; PRODUCTION_MUTATION_AUTHORIZED = NO.

## Execution boundary

Database connection: NONE. Database writes: NONE. Reconciliation scan: NO. Import apply: NO. Migrations: NONE. Development runtime mutation: NO. Production connection/mutation: NO.
No canonical records, lifecycle states, taxonomy 2.0.1, approved entity revisions, RC.1 files, release 2.2.0, or official releaseHash were modified or created.
