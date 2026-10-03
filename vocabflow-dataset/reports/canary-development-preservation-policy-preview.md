# Development Canary — Runtime Preservation Policy Preview

Scanned 2026-10-04 against the provider-verified development target: Neon project `shy-hill-72364426`, branch `br-square-grass-b3af0nte`, database `neondb`. Release: 2.1.0 / schema 2.0.1 / APPROVED; release hash `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.

- Runtime snapshot: planner CLI `--target development`, protected target verification passed, store used `SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY`. No APPLY path was invoked.
- Planner snapshot fingerprint: `fa8941ef8a458b58b6c2b548a50a1db5618221d4115d4d6f6ef914c2931c5d5d` (canonical JSON SHA-256 of the runtime snapshot used by this plan).
- Apple #1 and #295 were run as two separate temporary reconciliation simulations under the OS temp directory. Neither decision was saved to the human-owned reconciliation.
- The temporary simulations use `MAP_EXISTING` with `firstAdoptionPolicy=UPDATE_TO_MASTER` for apple, bank #871 and reservation #284, and `CREATE_NEW` for the other five Senses and Technology Starter. Both scenario plans have zero issues; their `canApply=true` applies only to these disposable simulations.
- The checked-in human reconciliation was previewed separately against the same snapshot: `canApply=false`, eight Sense decisions unresolved, stale source metadata/contract, and no finalized owner choices.
- The migration scanner verified the development target and read 18/18 ledger rows in read-only mode, then stopped before catalog discovery because it found hash mismatches for 17 local migrations, including 0015–0017. See [current migration scan](canary-development-migration-drift-scan-2026-10-04.md). No migration drift is called safe. The import planner does not read the migration ledger when computing `canApply`; this is recorded as `MIGRATION_DRIFT_BLOCKS_CURRENT_PLANNER=NO`, without endorsing the drift.

Cloudinary URL values are redacted as `Cloudinary URL present`, matching the Phase 2E.3 audit. Other field values are rendered exactly. In each field table, Master raw `null` is explicit JSON null; `ABSENT` would mean the property is omitted.

### apple #1 (simulation only; owner choice remains open)

- Planner action: `UPDATE`
- contentVersion: 2 → 3
- Outcomes: MASTER_FIELD_UPDATE, PRESERVED_RUNTIME_ENRICHMENT

| Field | Before | Master raw | Operation | After / storage projection |
|---|---|---|---|---|
| word | apple | apple | SET | apple |
| ipa | ˈæpəl | null | PRESERVE | ˈæpəl |
| vietnamese | quả táo | quả táo | SET | quả táo |
| definitionEn | A fruit with a red or green skin and white flesh. | A round fruit with firm flesh and skin that is usually red, green, or yellow. | SET | A round fruit with firm flesh and skin that is usually red, green, or yellow. |
| exampleEn | she enjoyed a crisp, juicy apple for a snack. | She packed an apple for her afternoon snack. | SET | She packed an apple for her afternoon snack. |
| imageUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| audioUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| topic | Food | null | PRESERVE | Food |
| level | null | null | PRESERVE | null |
| enabled | true | true | SET | true |

Runtime controls are separate from the base projection:

| Control | Before | Master raw | Operation | After |
|---|---|---|---|---|
| vietnameseOverride | null | NOT_PROJECTED | PRESERVE | null |
| imageQuarantined | false | NOT_PROJECTED | PRESERVE | false |


### apple #295 (simulation only; owner choice remains open)

- Planner action: `UPDATE`
- contentVersion: 1 → 2
- Outcomes: MASTER_FIELD_UPDATE, PRESERVED_RUNTIME_ENRICHMENT

| Field | Before | Master raw | Operation | After / storage projection |
|---|---|---|---|---|
| word | apple | apple | SET | apple |
| ipa | ˈæpəl | null | PRESERVE | ˈæpəl |
| vietnamese | quả táo | quả táo | SET | quả táo |
| definitionEn | A fruit with a red or green skin and white flesh. | A round fruit with firm flesh and skin that is usually red, green, or yellow. | SET | A round fruit with firm flesh and skin that is usually red, green, or yellow. |
| exampleEn | she enjoyed a crisp, juicy apple for a snack. | She packed an apple for her afternoon snack. | SET | She packed an apple for her afternoon snack. |
| imageUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| audioUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| topic | Food | null | PRESERVE | Food |
| level | GRADE_1 | null | PRESERVE | GRADE_1 |
| enabled | true | true | SET | true |

Runtime controls are separate from the base projection:

| Control | Before | Master raw | Operation | After |
|---|---|---|---|---|
| vietnameseOverride | null | NOT_PROJECTED | PRESERVE | null |
| imageQuarantined | false | NOT_PROJECTED | PRESERVE | false |


### bank financial #871

- Planner action: `UPDATE`
- contentVersion: 1 → 2
- Outcomes: MASTER_FIELD_UPDATE, PRESERVED_RUNTIME_ENRICHMENT

| Field | Before | Master raw | Operation | After / storage projection |
|---|---|---|---|---|
| word | bank | bank | SET | bank |
| ipa | bæŋk | null | PRESERVE | bæŋk |
| vietnamese | Ngân hàng | ngân hàng | SET | ngân hàng |
| definitionEn | A financial institution that accepts deposits from the public and creates credit. | An organization that keeps and lends money and provides financial services. | SET | An organization that keeps and lends money and provides financial services. |
| exampleEn | null | She deposited her paycheck at the bank. | SET | She deposited her paycheck at the bank. |
| imageUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| audioUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| topic | casual | null | PRESERVE | casual |
| level | null | null | PRESERVE | null |
| enabled | false | true | SET | true |

Runtime controls are separate from the base projection:

| Control | Before | Master raw | Operation | After |
|---|---|---|---|---|
| vietnameseOverride | null | NOT_PROJECTED | PRESERVE | null |
| imageQuarantined | false | NOT_PROJECTED | PRESERVE | false |


### reservation booking #284

- Planner action: `UPDATE`
- contentVersion: 1 → 2
- Outcomes: MASTER_FIELD_UPDATE, PRESERVED_RUNTIME_ENRICHMENT

| Field | Before | Master raw | Operation | After / storage projection |
|---|---|---|---|---|
| word | reservation | reservation | SET | reservation |
| ipa | ˌrɛzərˈveɪʃən | null | PRESERVE | ˌrɛzərˈveɪʃən |
| vietnamese | Đặt chỗ | việc đặt chỗ trước | SET | việc đặt chỗ trước |
| definitionEn | An arrangement to have something reserved, such as a table at a restaurant. | An arrangement made in advance to keep a place, room, or table for someone. | SET | An arrangement made in advance to keep a place, room, or table for someone. |
| exampleEn | null | I made a reservation for two at seven o'clock. | SET | I made a reservation for two at seven o'clock. |
| imageUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| audioUrl | Cloudinary URL present | null | PRESERVE | Cloudinary URL present |
| topic | CommonPlace | null | PRESERVE | CommonPlace |
| level | null | null | PRESERVE | null |
| enabled | false | true | SET | true |

Runtime controls are separate from the base projection:

| Control | Before | Master raw | Operation | After |
|---|---|---|---|---|
| vietnameseOverride | null | NOT_PROJECTED | PRESERVE | null |
| imageQuarantined | false | NOT_PROJECTED | PRESERVE | false |


## CREATE_NEW vocabulary rows

The following five Senses receive only their Master projection, each at initial `contentVersion=1`. No runtime value is copied from another row.

| Sense | imageUrl | audioUrl | Initial contentVersion |
|---|---|---|---:|
| bank — bờ sông | null | null | 1 |
| record — bản thu âm | null | null | 1 |
| record — ghi âm; ghi lại | null | null | 1 |
| look after — chăm sóc; trông nom | null | null | 1 |
| algorithm — thuật toán | null | null | 1 |

## Run boundaries

`RUNTIME_SNAPSHOT_READ_ONLY=YES`

`MIGRATION_DRIFT_BLOCKS_CURRENT_PLANNER=NO` (planner code path verified; drift remains an unresolved integrity issue)

`APPLE_OWNER_DECISION_REQUIRED=YES`

`OWNER_RECONCILIATION_FINALIZED=NO`

`IMPORT_PLAN_CAN_APPLY=NO` for the checked-in human reconciliation

`IMPORT_APPLY_EXECUTED=NO`

