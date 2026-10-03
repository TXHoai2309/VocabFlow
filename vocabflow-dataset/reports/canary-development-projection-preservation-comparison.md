# Phase 2E.3 → 2E.4A — Projection Loss Policy Comparison

The [Phase 2E.3 audit](canary-development-projection-loss-audit.md) remains historical evidence for the old behavior. This report compares that behavior with the Phase 2E.4A v2 field policy using read-only development snapshot fingerprint `fa8941ef8a458b58b6c2b548a50a1db5618221d4115d4d6f6ef914c2931c5d5d` and release hash `fc67dd2a70adadd311384360c004faa4693ae24ffe4524761ce7075f21c95591`.

| Candidate | OLD contract: MAP_EXISTING + UPDATE_TO_MASTER | NEW contract: effective result | Version under both scenarios |
|---|---|---|---|
| apple #1 | IPA ˈæpəl; Cloudinary image/audio; legacy topic Food; no level | Preserve IPA/media/topic; definition and example update from Master; level remains null; enabled stays true | 2 → 3 |
| apple #295 | IPA ˈæpəl; Cloudinary image/audio; legacy topic Food; level GRADE_1 | Preserve IPA/media/topic/level; definition and example update from Master; enabled stays true | 1 → 2 |
| bank financial #871 | IPA bæŋk; Cloudinary image/audio; legacy topic casual; enabled false | Set Vietnamese, definition, example, enabled=true; preserve IPA/media/topic; level remains null | 1 → 2 |
| reservation booking #284 | IPA ˌrɛzərˈveɪʃən; Cloudinary image/audio; legacy topic CommonPlace; enabled false | Set Vietnamese, definition, example, enabled=true; preserve IPA/media/topic; level remains null | 1 → 2 |

## Field operation change

Under the old contract, Master null was written as null for IPA, image, audio, legacy topic and level. Under the new contract, those fields are `PRESERVE` for MAP_EXISTING. For this canary, those retained values keep the existing Cloudinary references and legacy strings; values remain redacted here. Concrete Master semantic values still use `SET`, including changed definitions/examples and bank/reservation Vietnamese values. The enabled transition false→true is also a Master-authoritative `SET`.

The displayed version transitions remain +1 in all four examples because each effective learner-facing projection still changes in semantic fields. Preservation alone does not cause the increment. Apple #1 and #295 remain alternative owner simulations; this report does not choose either.

## Explicit clear

New v3 reconciliation can list a nullable field in `clearFields` when the Master value is null/absent. The planner then reports `CLEAR`, stores null, and emits `EXPLICIT_CLEAR`. Null without that instruction never clears a mapped row. No clear was requested in these canary simulations.

The approved release 2.1.0 Master records and `dataset.json` release hash were not changed. Only generated App Import projections and reconciliation-template metadata were regenerated for the versioned contract.
