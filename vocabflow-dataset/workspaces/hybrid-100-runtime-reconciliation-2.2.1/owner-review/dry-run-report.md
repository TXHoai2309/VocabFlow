# Phase 2G.2B — Owner-approved Hybrid-100 Development DRY_RUN

- Remote baseline: `642e1f80a6c0236771d2c5bc4c93992faa982b28`
- Source release: 2.2.1 / APPROVED
- Release hash: `44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`
- Owner authorization fingerprint: `0668e7c3ef4d52a3912b1bb4ae9b07f09af9420444d9b014af65122a3f404770`
- Approved proposal fingerprint: `6033cb0d217578aeab7b7e3fb750fda0476c2b880e9958f3865992604b2be6c0`
- Source reconciliation snapshot: `89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e`
- Current Development snapshot: `89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e`
- Snapshot stale: **NO**
- Development target: development / neon / project `shy-hill-72364426` / branch `br-square-grass-b3af0nte` / database `neondb`
- Migration readiness: 19/19 READY; latest `0018_panoramic_spirit`; bridge READY
- Reconciliation hash: `4c3d86eb3a4b06a04c68e870847f97fa432fdf247595c577eb758888d62315db`
- Planner snapshot fingerprint: `4e98667da86b87cce4a966bf46b80d587630c6e80f3f3b3a82ebe34d531788f1`
- Plan fingerprint: `466d95e327fa7732ae1036b03d1a9dfa0c8d3e2528844b95176dafd50a540d1c`

## Final owner decisions

- CREATE_NEW: 97
- MAP_EXISTING: 3
- SKIP: 0
- UNRESOLVED: 0

## Vocabulary actions

- CREATE: 97
- UPDATE: 3
- NOOP: 0
- SKIP: 0
- CONFLICT: 0
- BLOCKED: 0

## Mapping actions

- CREATE_MAPPING: 100
- KEEP_MAPPING: 0
- CONFLICT: 0

## Approved UPDATE rows

### deviate / #1836
- contentVersion: 1 → 2
- fields SET: `word`, `vietnamese`, `definitionEn`, `exampleEn`, `enabled`
- fields PRESERVE: `ipa`, `imageUrl`, `audioUrl`, `topic`, `level`
- control operations: vietnameseOverride=PRESERVE, imageQuarantined=PRESERVE
- learner progress refs: 0; review event refs: 0

### pain-relief / #1461
- contentVersion: 1 → 2
- fields SET: `word`, `vietnamese`, `definitionEn`, `exampleEn`, `enabled`
- fields PRESERVE: `ipa`, `imageUrl`, `audioUrl`, `topic`, `level`
- control operations: vietnameseOverride=PRESERVE, imageQuarantined=PRESERVE
- learner progress refs: 0; review event refs: 0

### stand / #948
- contentVersion: 1 → 2
- fields SET: `word`, `vietnamese`, `definitionEn`, `exampleEn`, `enabled`
- fields PRESERVE: `ipa`, `imageUrl`, `audioUrl`, `topic`, `level`
- control operations: vietnameseOverride=PRESERVE, imageQuarantined=PRESERVE
- learner progress refs: 0; review event refs: 0

## History safety

- learnerProgressRows: 87
- reviewEvents: 229
- mappedProgressReferences: 3
- mappedReviewReferences: 8
- deletionsPlanned: 0
- learnerAssignmentsChanged: 0

## Authorization and execution state

- Owner reconciliation approved: **YES**
- DRY_RUN technically apply-ready: **YES**
- Database APPLY authorized: **NO**
- Production authorized: **NO**
- Database connection: **READ_ONLY_DEVELOPMENT**
- Database writes: **NONE**
- Runtime IDs allocated: **0**
- Bridge mappings created: **0**
- Import runs created: **0**
- Importer APPLY executed: **NO**
- Production connection: **NONE**
