<!-- generatedBy: hybrid-100-runtime-eligibility-closure-v1 -->

# Hybrid-100 Nested Learner-Content Lifecycle Audit — Patch 2.2.1 Plan

## Outcome

**RUNTIME_ELIGIBILITY_CLOSURE_TECHNICALLY_READY = YES.** **PHASE_2G1A_READY = YES.** This is an offline audit and in-memory simulation only. It does not authorize nested child approval, Sense revision materialization, a 2.2.1 release build, runtime import, database writes, or production mutation.

## Pinned source and owner-reviewed package

- Source release: `2.2.0 / APPROVED`; releaseHash `c82a32a3d7fc3534105b85e14908edd336c2409aa7294d070528a47f6260339d`; immutable release tree fingerprint `35334eb7769c39029223d2d60311c6faab8c462efd0a340f262bed27543256ae`.
- Owner-reviewed semantic draft fingerprint: `a112a475e896f09038d4dd6834389af2d553d3a509829ef410ef17ae4e37ee1d`; independently recomputed from the workspace records, candidate map, identity registry, editorial decisions, and authorship audit. The owner authorization artifact binds that fingerprint to canonical DRAFT promotion only.
- Cohort: 87 Lexemes, 100 Senses, 99 Classifications, 799 Provenance records, 1 Taxonomy snapshot, 0 Media assets, 0 Learning Sets, 0 Relations.
- Parent Sense status: 100 APPROVED / 100.

## Nested lifecycle status inventory

| Child type | APPROVED | IN_REVIEW | DRAFT | Other | Total |
|---|---:|---:|---:|---:|---:|
| Translation | 0 | 2 | 98 | 0 | 100 |
| Definition | 0 | 2 | 98 | 0 | 100 |
| Example | 0 | 2 | 98 | 0 | 100 |
| ExampleTranslation | 0 | 2 | 98 | 0 | 100 |
| Sense Pronunciation | 0 | 0 | 0 | 0 | 0 |
| Lexeme Pronunciation | 0 | 0 | 0 | 0 | 0 |

The four learner-facing child types each have 100 rows. All 400 rows trace to the exact semantic package or a pinned existing-Sense reuse decision. Their stable child/owner IDs, language, text, order, preferred selection and Provenance links match their reviewed source; observed drift is zero. 0 child rows are blocked. Pronunciation rows are absent from the approved package and release, so none are inferred or promoted.

For new authored Senses, the audit independently verifies the Phase 2F.2 semantic package fingerprint and compares released semantic fields to the owner-reviewed revision-1 draft records. Provenance references are checked against the current canonical manifest's exact immutable Sense pins and the 799 Provenance pins in release 2.2.0; each child reference resolves to the expected owner and field path. The two reuse decisions resolve to the exact canonical record paths/content hashes pinned by owner review; their child content and Provenance refs are preserved from those records.

## Runtime content and in-memory simulation

- Future required Vietnamese Translation: 100/100 Senses.
- English Definition preserved: 100/100.
- English Example preserved: 100/100.
- ExampleTranslation preserved: 100/100.
- Pronunciation/IPA present in source: 0 records; IPA is not required by the current projection contract and no IPA is synthesized.
- Simulated App Import: `app-import-v3`; projection: `runtime-vocabulary-projection-v2`.
- RELEASE projection: 100/100 projected; 0 skipped; importEligible=true.
- Non-null runtime fields: Vietnamese 100; definitionEn 100; exampleEn 100; ipa 0.
- Simulation is in memory. No simulated file or release directory was written.

## 2.2.1 PATCH plan

- Planned transition: `2.2.0 → 2.2.1` / `PATCH`, under the repository identity/versioning policy.
- Sense revisions required: **100**; stable Master Sense IDs preserved and parent status remains APPROVED. Every planned Sense revision is the next monotonic revision because its nested statuses change.
- Only nested lifecycle statuses become APPROVED. Lexeme pins, CEFR Classification pins/values, taxonomy 2.0.1, the 799 Provenance IDs, media/set/relation counts and learner-facing text remain unchanged.
- Planned target cohort remains 87 Lexemes, 100 Senses, 99 Classifications, 799 Provenance records, 1 Taxonomy snapshot, 0 media, 0 Learning Sets, 0 Relations. Release timestamps, releaseHash and change summary belong to a future authorized build.
- Child approval, Sense revision materialization, and release 2.2.1 creation are **not authorized**. Release directory created: NO.

## Publication validator and runtime-readiness boundary

The current validator requires an APPROVED manifest's pinned top-level Lexeme/Sense/Classification records to be APPROVED. Nested Translation, Definition, Example, ExampleTranslation and Pronunciation keep independent status values and are checked for schema/reference/Provenance rules; the publication validator does not require the nested rows to satisfy runtime projection completeness. The RELEASE transform correctly filters nested learner-facing content by its own APPROVED status and fails closed when no eligible Vietnamese Translation exists.

Recommendation: keep Master-release approval and runtime-import readiness separate, with a dedicated runtime-readiness gate. Do not silently change the publication validator contract.

## Safety and validation

- Frozen 2.2.0 release hash/tree: unchanged before and after.
- Canonical Master: unchanged; no revisions created.
- 2.2.1 release: not created.
- Development/Neon/Production: no connection; no database writes or migrations; no importer apply.
- Authorization flags: `NESTED_CHILD_APPROVAL_AUTHORIZED = NO`; `SENSE_REVISION_MATERIALIZATION_AUTHORIZED = NO`; `PATCH_RELEASE_2_2_1_BUILD_AUTHORIZED = NO`; `DATABASE_WRITE_AUTHORIZED = NO`; `RUNTIME_IMPORT_AUTHORIZED = NO`; `PRODUCTION_MUTATION_AUTHORIZED = NO`.
- Release validator: PASS; semantic fingerprint: verified; owner-child trace: 400/400; projection simulation: 100/100.

## Per-Sense content checklist

Statuses are Translation / Definition / Example / ExampleTranslation. Required content is Vietnamese Translation / English Definition / English Example / ExampleTranslation / Pronunciation-IPA.

| Lemma | POS | Reviewed meaning | Master Sense ID | Current child statuses | Required future content | Planned Sense revision |
|---|---|---|---|---|---|---:|
| light | ADJECTIVE | not heavy | 01a0fc13-09ee-7768-9be6-d20fa32521ee | IN_REVIEW / IN_REVIEW / IN_REVIEW / IN_REVIEW | YES / YES / YES / YES / NO | 3 |
| water | VERB | give plants water | 01a0fc13-09ef-75ac-b815-039ab337c01a | IN_REVIEW / IN_REVIEW / IN_REVIEW / IN_REVIEW | YES / YES / YES / YES / NO | 3 |
| rally | VERB | bring people together | 01a1070c-7c56-71df-b6f0-39632387320e | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| light | VERB | start a flame | 01a1070c-7c57-7676-9acd-d23079256ae2 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| honour | NOUN | respect shown | 01a1070c-7c57-7676-9acd-eaf36e6184b3 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| gap | NOUN | empty space | 01a1070c-7c57-7676-9ace-014df3449d2e | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| trade | NOUN | skilled occupation | 01a1070c-7c57-7676-9ace-18656f491ca7 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| crawl | VERB | move very slowly | 01a1070c-7c57-7676-9ace-32d1337aab90 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| market | VERB | promote for sale | 01a1070c-7c57-7676-9ace-4b581bada298 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| tumor | NOUN | abnormal cell growth | 01a1070c-7c57-7676-9ace-63a7042782dc | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| withdraw | VERB | take back formally | 01a1070c-7c57-7676-9ace-79a6118270d8 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| confirm | VERB | verify as true | 01a1070c-7c57-7676-9ace-93aa39952372 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| shake | VERB | greet with a handshake | 01a1070c-7c57-7676-9ace-a81c3cdf40fa | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| junior | ADJECTIVE | for younger people | 01a1070c-7c57-7676-9ace-c2f9d561c8f4 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| fossil fuel | NOUN | ancient-source fuel | 01a1070c-7c57-7676-9ace-d8831aa1814d | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| let | VERB | give permission | 01a1070c-7c57-7676-9ace-f28714bdee2e | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| hopefully | ADVERB | it is hoped that | 01a1070c-7c57-7676-9acf-09879397d1e1 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| age | NOUN | historical period | 01a1070c-7c57-7676-9acf-2166c93ae47a | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| moment | NOUN | short while | 01a1070c-7c57-7676-9acf-390ac30fd890 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| forthcoming | ADJECTIVE | open with information | 01a1070c-7c57-7676-9acf-51b00d9e4aca | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| habit | NOUN | regular behavior | 01a1070c-7c57-7676-9acf-6a88ac566599 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| per cent | NOUN | amount per hundred | 01a1070c-7c57-7676-9acf-83edaac99eb9 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| direct | ADVERB | straight to a place | 01a1070c-7c57-7676-9acf-99d8c8592c32 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| exact | ADJECTIVE | precise and correct | 01a1070c-7c57-7676-9acf-b1c2d0e92475 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| rear | ADJECTIVE | at the back | 01a1070c-7c57-7676-9acf-c8bb470b0069 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| known | ADJECTIVE | recognized by people | 01a1070c-7c57-7676-9acf-e2bf85a21c08 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| bite | NOUN | bite mark | 01a1070c-7c57-7676-9acf-fbb6c07854f6 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| scholar | NOUN | serious student or researcher | 01a1070c-7c58-76b5-a2a8-d1cd64c3eada | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| linguistic | ADJECTIVE | related to language | 01a1070c-7c58-76b5-a2a8-ebb7ee4a97d9 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| rotate | VERB | turn around an axis | 01a1070c-7c58-76b5-a2a9-0030193008ca | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| textile | NOUN | cloth material | 01a1070c-7c58-76b5-a2a9-18ee254ff4be | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| integrity | NOUN | wholeness and soundness | 01a1070c-7c58-76b5-a2a9-3185a807d618 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| far | ADJECTIVE | distant | 01a1070c-7c58-76b5-a2a9-4b4562d352c8 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| freshman | NOUN | first-year student | 01a1070c-7c58-76b5-a2a9-620e574defe8 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| deviate | VERB | move off the planned course | 01a1070c-7c58-76b5-a2a9-78fe16fc29bb | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| struggle | VERB | make a hard effort | 01a1070c-7c58-76b5-a2a9-92d544914a1a | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| charge | VERB | ask for payment | 01a1070c-7c58-76b5-a2a9-aa41e4cd8ff9 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| resident | NOUN | person living locally | 01a1070c-7c58-76b5-a2a9-c1530836b546 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| member | NOUN | person in a group | 01a1070c-7c58-76b5-a2a9-d9fe7b7d857e | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| all right | INTERJECTION | agreement or acceptance | 01a1070c-7c58-76b5-a2a9-f257db26d791 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| unique | ADJECTIVE | one of a kind | 01a1070c-7c58-76b5-a2aa-0a20d4f7ae01 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| commercial | ADJECTIVE | related to business | 01a1070c-7c58-76b5-a2aa-20e7d1e01c66 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| during | PREPOSITION | within a period | 01a1070c-7c58-76b5-a2aa-397ef521e177 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| rotate | VERB | take turns in sequence | 01a1070c-7c58-76b5-a2aa-4d54a373af15 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| just | ADVERB | very recently | 01a1070c-7c58-76b5-a2aa-66b0757806fe | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| relief | NOUN | lessening of pain | 01a1070c-7c58-76b5-a2aa-7e0812b069ae | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| acute | ADJECTIVE | severe and intense | 01a1070c-7c58-76b5-a2aa-97f25323b0a8 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| roster | NOUN | organized people list | 01a1070c-7c58-76b5-a2aa-aeb83963a729 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| total | ADJECTIVE | complete in every part | 01a1070c-7c58-76b5-a2aa-c4a190ee77a4 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| all right | ADJECTIVE | satisfactory condition | 01a1070c-7c58-76b5-a2aa-db8e56d2cc07 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| compelling | ADJECTIVE | captivating | 01a1070c-7c58-76b5-a2aa-f3a4a21a7dc3 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| rock | NOUN | solid stone | 01a1070c-7c58-76b5-a2ab-0ab34eedf7c6 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| quiet | ADJECTIVE | with little noise | 01a1070c-7c58-76b5-a2ab-23b5c52b4d0f | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| reservation | NOUN | hesitation or doubt | 01a1070c-7c58-76b5-a2ab-369dd574695b | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| direct | VERB | guide a film production | 01a1070c-7c58-76b5-a2ab-48eb58f50cbf | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| concentrate | VERB | focus attention | 01a1070c-7c58-76b5-a2ab-6137a474d3c3 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| total | ADJECTIVE | combined amount | 01a1070c-7c58-76b5-a2ab-74b8a6de7e22 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| shift | NOUN | work period | 01a1070c-7c58-76b5-a2ab-8ebf5829835d | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| toll | NOUN | number of deaths and injuries | 01a1070c-7c58-76b5-a2ab-a764716f4128 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| welcome | ADJECTIVE | warmly accepted | 01a1070c-7c58-76b5-a2ab-be14abe16989 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| spell | NOUN | brief period | 01a1070c-7c58-76b5-a2ab-d47ce6596f64 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| broadly | ADVERB | across a wide range | 01a1070c-7c58-76b5-a2ab-ed6693eca162 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| per cent | ADJECTIVE | per-hundred modifier | 01a1070c-7c58-76b5-a2ac-007b8e765c31 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| via | PREPOSITION | by way of | 01a1070c-7c59-726e-88d4-388175c26836 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| scrape | VERB | remove by scraping | 01a1070c-7c59-726e-88d4-5263bfd63bbf | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| portable | ADJECTIVE | easy to carry | 01a1070c-7c59-726e-88d4-6b2a61e1e7c4 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| liable | ADJECTIVE | likely to face a problem | 01a1070c-7c59-726e-88d4-83e56ae5f536 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| icon | NOUN | screen symbol | 01a1070c-7c59-726e-88d4-982f187e5653 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| challenge | VERB | question a claim | 01a1070c-7c59-726e-88d4-b375a308217e | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| architect | NOUN | building designer | 01a1070c-7c59-726e-88d4-c8cce3636c7a | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| criticism | NOUN | comments about faults | 01a1070c-7c59-726e-88d4-e052bbcb6335 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| exchange | VERB | trade one thing for another | 01a1070c-7c59-726e-88d4-f95f0a11a85e | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| concern | VERB | cause worry | 01a1070c-7c59-726e-88d5-13e0fb40de8c | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| creature | NOUN | living animal | 01a1070c-7c59-726e-88d5-2a10fa50c2ef | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| lawmaker | NOUN | person who makes laws | 01a1070c-7c59-726e-88d5-413213f77278 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| balloon | NOUN | inflated flexible bag | 01a1070c-7c59-726e-88d5-589ec0261ad8 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| rest | NOUN | recovery break | 01a1070c-7c59-726e-88d5-700f2c9a47a0 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| stand | VERB | be on your feet | 01a1070c-7c59-726e-88d5-882b36643f4e | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| light | ADJECTIVE | pale-colored | 01a1070c-7c59-726e-88d5-9c1965cff571 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| set | NOUN | collection of items | 01a1070c-7c59-726e-88d5-b778960784d8 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| addition | NOUN | new item added | 01a1070c-7c59-726e-88d5-cff4c73ff34a | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| repay | VERB | pay borrowed money back | 01a1070c-7c59-726e-88d5-e6665424a3b2 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| integrity | NOUN | honesty and principles | 01a1070c-7c59-726e-88d5-fa99c56877b4 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| champion | NOUN | competition winner | 01a1070c-7c59-726e-88d6-12b693a50e53 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| prominent | ADJECTIVE | well known and important | 01a1070c-7c59-726e-88d6-2bd02d10cccb | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| attack | NOUN | violent assault | 01a1070c-7c59-726e-88d6-41334868edc3 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| moment | NOUN | particular instant | 01a1070c-7c59-726e-88d6-56be2debcdfe | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| leadership | NOUN | guidance of a group | 01a1070c-7c59-726e-88d6-6d55c97117dc | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| lead | VERB | cause a result | 01a1070c-7c59-726e-88d6-84571ea5dbf5 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| spread | VERB | extend over an area | 01a1070c-7c59-726e-88d6-9edb547352aa | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| aquarium | NOUN | aquatic animal display place | 01a1070c-7c59-726e-88d6-b5d43a60b62f | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| fuse | NOUN | ignition cord | 01a1070c-7c59-726e-88d6-cf9dc05adb73 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| double | ADVERB | two times | 01a1070c-7c59-726e-88d6-e7a8d422dbdf | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| officer | NOUN | official with duties | 01a1070c-7c59-726e-88d6-fc58f364e770 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| shift | NOUN | change in direction or view | 01a1070c-7c59-726e-88d7-1390989a47b8 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| nature | NOUN | basic character | 01a1070c-7c5a-7542-a092-beb09c96a03f | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| let | VERB | allow something to happen | 01a1070c-7c5a-7542-a092-d1d73dd0f634 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| exchange | NOUN | act of trading | 01a1070c-7c5a-7542-a092-e7df11b3bc0a | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| shareholder | NOUN | company share owner | 01a1070c-7c5a-7542-a092-ff8307ef6e05 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
| relief | NOUN | emergency help | 01a1070c-7c5a-7542-a093-116a29fa3a72 | DRAFT / DRAFT / DRAFT / DRAFT | YES / YES / YES / YES / NO | 3 |
