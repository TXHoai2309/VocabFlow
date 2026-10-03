# Master Vocabulary V2 Canary Release 2.1.0

**Prepared:** 2026-10-03
**Owner approval:** recorded in `canary-owner-approval-v2.json` with reviewer
`PROJECT_OWNER`; release-level, all eight Sense, six Lexeme, Learning Set, and
exact item decisions are `APPROVE`. Null runtime media URLs were approved for
this canary only.

## Immutable release

- Dataset version: `2.1.0` (`APPROVED`)
- Schema version: `2.0.1`
- Release workspace: `vocabflow-dataset/releases/canary-v2.1.0`
- Release hash: `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`
- Hash algorithm: `sha256-canonical-json-v1` (RFC 8785/JCS)
- Approved content: 8 Senses, 6 Lexemes, 41 Provenance records, 1 Learning Set,
  and its exact 1 approved item (`TECHNOLOGY_STARTER`)
- Media: 2 planned assets, 0 media versions, 0/8 image URLs and 0/8 audio URLs
  resolved; runtime `imageUrl` and `audioUrl` remain null
- Experimental classifications: 0; taxonomy snapshots: 0

The stable Master IDs remain pinned. Approved revisions are Sense r3 for apple
fruit, record noun/music recording, and reservation booking; Sense r2 for bank
financial, bank river, record verb, look after, and algorithm; Lexeme r2 for
all six included Lexemes; and Learning Set r2. Existing conceptual child IDs
remain stable where the identity policy treats them as the same child. The
historical `2.0.0` DRAFT was not changed.

## Validation and projection

- Master validator: **PASS**, 0 errors, 0 warnings, 0 informational issues.
- Phase 2C RELEASE transform: **PASS**, `mode=RELEASE`, 8/8 Senses projected,
  `importEligible=true`.
- App Import V2 vocabulary rows: 8. The two bank Senses and noun/verb record
  Senses remain separate projections. The Technology Starter item reuses the
  algorithm Sense projection; it creates no duplicate vocabulary row.
- Release-scoped reconciliation template: all 8 Sense decisions and the
  Learning Set decision remain `UNRESOLVED`; it is generated, non-human-reviewed,
  and not importable. No runtime snapshot or target was used.

**CONTENT APPROVED != RUNTIME IDENTITY RECONCILED**

## Gates

```text
NODE_RUNTIME_READY = YES
OWNER_CONTENT_APPROVED = YES
CANARY_RELEASE_READY = YES
STAGING_TARGET_READY = NO
RUNTIME_SNAPSHOT_READY = NO
RUNTIME_RECONCILIATION_READY = NO
IMPORT_PLAN_CAN_APPLY = NO
PHASE_2E_STAGING_CANARY_READY = NO
```

No import APPLY, runtime mapping decision, database/Neon connection, migration,
runtime ID allocation, learner assignment change, media generation, or
Cloudinary operation was performed. Root human-owned reconciliation and the
experimental classification records were left untouched.

## Checks

- Focused Dataset V2, canary preparation, RELEASE transform, planner,
  reconciliation scan, and application schema tests: **7 files, 91/91 passed**.
- Bridge-hardening suite: **11/12 passed**. Its remaining existing assertion
  expects migration journal index 16, while this branch already has index 17;
  migration and unrelated test files were not changed.
- TypeScript: **PASS**.
- ESLint: **PASS**.
- `git diff --check`: recorded with the release change.
