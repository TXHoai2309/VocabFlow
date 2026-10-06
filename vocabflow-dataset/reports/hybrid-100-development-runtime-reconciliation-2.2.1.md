<!-- generatedBy: hybrid-100-development-reconciliation-scan-2.2.1-v1 -->

# Hybrid-100 Development Runtime Reconciliation — 2.2.1

**Outcome:** CANDIDATES DISCOVERED — owner decisions remain unresolved.

## Source and projection gates

- Source: 2.2.1 / APPROVED; schema 2.0.1; releaseHash `44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`.
- Release tree fingerprint: `51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e`; independent release hash and frozen-source builder checks passed before and after the scan.
- Runtime projection: `app-import-v3` / `runtime-vocabulary-projection-v2`; RELEASE projected 100/100, skipped 0, importEligible=true.
- Projected non-null fields: Vietnamese 100, definitionEn 100, exampleEn 100, IPA 0.
- Topics, topic memberships, Learning Sets and Learning Set items: 0 / 0 / 0 / 0. CEFR remains Master-only; runtime level is not inferred.

## Development target and migration/bridge state

- Neon Development: project `shy-hill-72364426`, branch `br-square-grass-b3af0nte`, database `neondb`, role `vocabflow_runtime`. Connection URLs and credentials are not stored.
- Migration journal: 19/19; latest `0018_panoramic_spirit`.
- Required bridge tables, columns, composite constraints and write guards: true. Migration/bridge readiness: **READY**.

## Candidate summary

- Master Senses scanned: 100; mappings present 0; unmapped 100.
- Runtime candidates: zero 85, one 13, multiple 2; rows 18.
- Classifications: EXACT_EFFECTIVE_MATCH 0, PARTIAL_MATCH 1, SEMANTIC_CANDIDATE 4, CONFLICTING_MEANING 13.
- Recommendations: EXISTING_MAPPING_NOOP_CANDIDATE 0, EXISTING_MAPPING_UPDATE_REVIEW_REQUIRED 0, MAP_EXISTING_CANDIDATE 4, CREATE_NEW_CANDIDATE 85, IDENTITY_REVIEW_REQUIRED 11, RUNTIME_OVERRIDE_REVIEW_REQUIRED 0, QUARANTINE_REVIEW_REQUIRED 0, BLOCKED 0.
- Candidate IDs with learner progress > 0: 1; review events > 0: 1. Polysemy groups 2; override review 0; quarantine review 0.
- Snapshot fingerprint: `89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e`; computed twice from the same captured repeatable-read snapshot and identical.
- History evidence is aggregate-only. Learner IDs and learner row contents were neither queried nor serialized.

## Per-Sense owner review

| Lemma / POS | Reviewed meaning | Master Sense ID | Candidate IDs | Classification | Key field differences | Progress / reviews | Override / quarantine | Analysis recommendation | Owner decision |
| --- | --- | --- | --- | --- | --- | ---: | --- | --- | --- |
| acute / ADJECTIVE | Very severe or intense, especially when describing pain or a problem. | `01a1070c-7c58-76b5-a2aa-97f25323b0a8` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| addition / NOUN | Something added to a group or place that was already there. | `01a1070c-7c59-726e-88d5-cff4c73ff34a` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| age / NOUN | A particular period in history marked by shared conditions or events. | `01a1070c-7c57-7676-9acf-2166c93ae47a` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| all right / INTERJECTION | Used to show that you agree with a suggestion or request. | `01a1070c-7c58-76b5-a2a9-f257db26d791` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| all right / ADJECTIVE | In a satisfactory or acceptable condition, though not necessarily excellent. | `01a1070c-7c58-76b5-a2aa-db8e56d2cc07` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| aquarium / NOUN | A public place where fish and other water animals are kept for people to see. | `01a1070c-7c59-726e-88d6-b5d43a60b62f` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| architect / NOUN | A trained professional who plans buildings and prepares their designs. | `01a1070c-7c59-726e-88d4-c8cce3636c7a` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| attack / NOUN | An act of violence intended to hurt a person or damage a place. | `01a1070c-7c59-726e-88d6-41334868edc3` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| balloon / NOUN | A flexible bag that expands when filled with air or another gas. | `01a1070c-7c59-726e-88d5-589ec0261ad8` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| bite / NOUN | A small wound or mark made when teeth or an insect pierce skin. | `01a1070c-7c57-7676-9acf-fbb6c07854f6` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| broadly / ADVERB | Across a wide area, range of people, or set of subjects. | `01a1070c-7c58-76b5-a2ab-ed6693eca162` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| challenge / VERB | To question whether a decision, claim, or authority is correct. | `01a1070c-7c59-726e-88d4-b375a308217e` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| champion / NOUN | A person or team that has won an important competition. | `01a1070c-7c59-726e-88d6-12b693a50e53` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| charge / VERB | To ask someone to pay a particular amount for a product or service. | `01a1070c-7c58-76b5-a2a9-aa41e4cd8ff9` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| commercial / ADJECTIVE | Connected with buying and selling goods or providing services for profit. | `01a1070c-7c58-76b5-a2aa-20e7d1e01c66` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| compelling / ADJECTIVE | So interesting that it holds someone's attention. | `01a1070c-7c58-76b5-a2aa-f3a4a21a7dc3` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| concentrate / VERB | To give most of your attention or effort to one thing. | `01a1070c-7c58-76b5-a2ab-6137a474d3c3` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| concern / VERB | To make someone feel worried about a possible problem or risk. | `01a1070c-7c59-726e-88d5-13e0fb40de8c` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| confirm / VERB | To show that information or a plan is correct and certain. | `01a1070c-7c57-7676-9ace-93aa39952372` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| crawl / VERB | To move forward very slowly, especially because progress is difficult. | `01a1070c-7c57-7676-9ace-32d1337aab90` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| creature / NOUN | A living animal or other being, especially one that can move. | `01a1070c-7c59-726e-88d5-2a10fa50c2ef` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| criticism / NOUN | Words that point out faults or weaknesses in someone's work or actions. | `01a1070c-7c59-726e-88d4-e052bbcb6335` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| deviate / VERB | To move away from a planned route, direction, or standard. | `01a1070c-7c58-76b5-a2a9-78fe16fc29bb` | 1836 | 1836: CONFLICTING_MEANING | 1836.ipa, 1836.vietnamese, 1836.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| direct / ADVERB | By a direct route, without changing direction or stopping. | `01a1070c-7c57-7676-9acf-99d8c8592c32` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| direct / VERB | To guide actors and creative work while a film is being made. | `01a1070c-7c58-76b5-a2ab-48eb58f50cbf` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| double / ADVERB | Two times as much, as many, or as often as something else. | `01a1070c-7c59-726e-88d6-e7a8d422dbdf` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| during / PREPOSITION | At some point within the time when an event or activity happens. | `01a1070c-7c58-76b5-a2aa-397ef521e177` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| exact / ADJECTIVE | Completely correct in every detail, with no important difference. | `01a1070c-7c57-7676-9acf-b1c2d0e92475` | 1463 | 1463: SEMANTIC_CANDIDATE | 1463.word, 1463.ipa, 1463.definitionEn | 0 / 0 | none / none | MAP_EXISTING_CANDIDATE | UNRESOLVED |
| exchange / NOUN | The act of giving something and receiving something else in return. | `01a1070c-7c5a-7542-a092-e7df11b3bc0a` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| exchange / VERB | To give one thing and receive something else in return. | `01a1070c-7c59-726e-88d4-f95f0a11a85e` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| far / ADJECTIVE | At a great distance from a particular place. | `01a1070c-7c58-76b5-a2a9-4b4562d352c8` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| forthcoming / ADJECTIVE | Willing to share information or speak honestly when someone asks. | `01a1070c-7c57-7676-9acf-51b00d9e4aca` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| fossil fuel / NOUN | Fuel formed over a very long time from ancient plants or animals. | `01a1070c-7c57-7676-9ace-d8831aa1814d` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| freshman / NOUN | A student in the first year of a high school or college program. | `01a1070c-7c58-76b5-a2a9-620e574defe8` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| fuse / NOUN | A cord that burns slowly to set off a firework or explosive device. | `01a1070c-7c59-726e-88d6-cf9dc05adb73` | 846 | 846: CONFLICTING_MEANING | 846.ipa, 846.vietnamese, 846.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| gap / NOUN | An empty space between two things or between parts of something. | `01a1070c-7c57-7676-9ace-014df3449d2e` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| habit / NOUN | Something that you do regularly, often without thinking about it. | `01a1070c-7c57-7676-9acf-6a88ac566599` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| honour / NOUN | Deep respect shown for a person's character, actions, or achievements. | `01a1070c-7c57-7676-9acd-eaf36e6184b3` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| hopefully / ADVERB | Used at the start of a sentence to say that you hope something will happen. | `01a1070c-7c57-7676-9acf-09879397d1e1` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| icon / NOUN | A small picture on a screen that represents a program, action, or item. | `01a1070c-7c59-726e-88d4-982f187e5653` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| integrity / NOUN | The quality of being honest and following strong moral principles. | `01a1070c-7c59-726e-88d5-fa99c56877b4` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| integrity / NOUN | The condition of being whole, complete, and free from damage. | `01a1070c-7c58-76b5-a2a9-3185a807d618` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| junior / ADJECTIVE | Designed for or intended to be used by younger people. | `01a1070c-7c57-7676-9ace-c2f9d561c8f4` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| just / ADVERB | Only a short time before the present moment or another event. | `01a1070c-7c58-76b5-a2aa-66b0757806fe` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| known / ADJECTIVE | Recognized or familiar to people because they have heard about it. | `01a1070c-7c57-7676-9acf-e2bf85a21c08` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| lawmaker / NOUN | An elected person who helps create or change laws for a country or region. | `01a1070c-7c59-726e-88d5-413213f77278` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| lead / VERB | To cause a particular result or make it more likely to happen. | `01a1070c-7c59-726e-88d6-84571ea5dbf5` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| leadership / NOUN | The act of guiding a group toward a shared goal. | `01a1070c-7c59-726e-88d6-6d55c97117dc` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| let / VERB | To give someone permission to do something they want to do. | `01a1070c-7c57-7676-9ace-f28714bdee2e` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| let / VERB | To allow an action or event to happen without trying to stop it. | `01a1070c-7c5a-7542-a092-d1d73dd0f634` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| liable / ADJECTIVE | Likely to experience something undesirable in a particular situation. | `01a1070c-7c59-726e-88d4-83e56ae5f536` | 1796 | 1796: CONFLICTING_MEANING | 1796.ipa, 1796.vietnamese, 1796.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| linguistic / ADJECTIVE | Connected with language, the way it works, or its study. | `01a1070c-7c58-76b5-a2a8-ebb7ee4a97d9` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| market / VERB | To promote a product or service so that people will buy it. | `01a1070c-7c57-7676-9ace-4b581bada298` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| member / NOUN | A person who belongs to a group, club, or organization. | `01a1070c-7c58-76b5-a2a9-d9fe7b7d857e` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| moment / NOUN | A specific point in time when something happens or changes. | `01a1070c-7c59-726e-88d6-56be2debcdfe` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| moment / NOUN | A very short period of time, often lasting only a few seconds. | `01a1070c-7c57-7676-9acf-390ac30fd890` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| nature / NOUN | The basic character or qualities that make a person or thing what it is. | `01a1070c-7c5a-7542-a092-beb09c96a03f` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| officer / NOUN | A person with an official position and particular duties or authority. | `01a1070c-7c59-726e-88d6-fc58f364e770` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| per cent / ADJECTIVE | Used after a number to describe a rate measured out of one hundred. | `01a1070c-7c58-76b5-a2ac-007b8e765c31` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| per cent / NOUN | A proportion that tells how many parts there are in every hundred. | `01a1070c-7c57-7676-9acf-83edaac99eb9` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| portable / ADJECTIVE | Small or light enough to be carried or moved easily. | `01a1070c-7c59-726e-88d4-6b2a61e1e7c4` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| prominent / ADJECTIVE | Well known and important, so that many people notice or respect you. | `01a1070c-7c59-726e-88d6-2bd02d10cccb` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| quiet / ADJECTIVE | Making very little noise or having very little activity around you. | `01a1070c-7c58-76b5-a2ab-23b5c52b4d0f` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| rally / VERB | To bring people together for a shared public purpose or event. | `01a1070c-7c56-71df-b6f0-39632387320e` | 1482 | 1482: SEMANTIC_CANDIDATE | 1482.word, 1482.ipa, 1482.definitionEn | 0 / 0 | none / none | MAP_EXISTING_CANDIDATE | UNRESOLVED |
| rear / ADJECTIVE | Located at the back of something rather than at its front. | `01a1070c-7c57-7676-9acf-c8bb470b0069` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| relief / NOUN | Help given to people who are suffering or facing a serious emergency. | `01a1070c-7c5a-7542-a093-116a29fa3a72` | 1461 | 1461: CONFLICTING_MEANING | 1461.ipa, 1461.vietnamese, 1461.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| relief / NOUN | A reduction in pain or discomfort after treatment or a change. | `01a1070c-7c58-76b5-a2aa-7e0812b069ae` | 1461 | 1461: CONFLICTING_MEANING | 1461.ipa, 1461.vietnamese, 1461.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| repay / VERB | To give money back to the person or organization that lent it. | `01a1070c-7c59-726e-88d5-e6665424a3b2` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| resident / NOUN | A person who lives in a particular place, usually for a long time. | `01a1070c-7c58-76b5-a2a9-c1530836b546` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| rest / NOUN | A period when you stop working or moving to recover your energy. | `01a1070c-7c59-726e-88d5-700f2c9a47a0` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| rock / NOUN | The hard natural material that forms the ground and mountains. | `01a1070c-7c58-76b5-a2ab-0ab34eedf7c6` | 944 | 944: SEMANTIC_CANDIDATE | 944.word, 944.ipa, 944.definitionEn | 0 / 0 | none / none | MAP_EXISTING_CANDIDATE | UNRESOLVED |
| roster / NOUN | An official list of people who belong to a team or group. | `01a1070c-7c58-76b5-a2aa-aeb83963a729` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| rotate / VERB | To take turns in a planned order so each person has a role. | `01a1070c-7c58-76b5-a2aa-4d54a373af15` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| rotate / VERB | To turn around a central point while remaining in the same general place. | `01a1070c-7c58-76b5-a2a9-0030193008ca` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| scholar / NOUN | A person who studies a subject deeply and knows a great deal about it. | `01a1070c-7c58-76b5-a2a8-d1cd64c3eada` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| scrape / VERB | To remove a thin layer or substance by rubbing with a hard edge. | `01a1070c-7c59-726e-88d4-5263bfd63bbf` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| set / NOUN | A group of related things that belong or are used together. | `01a1070c-7c59-726e-88d5-b778960784d8` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| shake / VERB | To take someone's hand and move it briefly as a greeting or agreement. | `01a1070c-7c57-7676-9ace-a81c3cdf40fa` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| shareholder / NOUN | A person or organization that owns part of a company through shares. | `01a1070c-7c5a-7542-a092-ff8307ef6e05` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| shift / NOUN | A set period when a person is scheduled to work. | `01a1070c-7c58-76b5-a2ab-8ebf5829835d` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| shift / NOUN | A change in the way something is arranged, understood, or done. | `01a1070c-7c59-726e-88d7-1390989a47b8` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| spell / NOUN | A short period during which a particular kind of weather or activity lasts. | `01a1070c-7c58-76b5-a2ab-d47ce6596f64` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| spread / VERB | To extend over a larger area or reach more places over time. | `01a1070c-7c59-726e-88d6-9edb547352aa` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| stand / VERB | To be upright on your feet rather than sitting or lying down. | `01a1070c-7c59-726e-88d5-882b36643f4e` | 948 | 948: PARTIAL_MATCH | 948.ipa, 948.definitionEn, 948.exampleEn | 0 / 0 | none / none | MAP_EXISTING_CANDIDATE | UNRESOLVED |
| struggle / VERB | To try very hard to do something that is difficult for you. | `01a1070c-7c58-76b5-a2a9-92d544914a1a` | 1313, 1330, 1477 | 1313: CONFLICTING_MEANING; 1330: SEMANTIC_CANDIDATE; 1477: CONFLICTING_MEANING | 1313.ipa, 1313.vietnamese, 1313.definitionEn, 1330.word, 1330.ipa, 1330.definitionEn, 1477.ipa, 1477.vietnamese, 1477.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| textile / NOUN | Cloth made by weaving or knitting fibers together for practical use. | `01a1070c-7c58-76b5-a2a9-18ee254ff4be` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| toll / NOUN | The number of people killed or injured by an accident or disaster. | `01a1070c-7c58-76b5-a2ab-a764716f4128` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| total / ADJECTIVE | Complete in every part, with nothing missing or left out. | `01a1070c-7c58-76b5-a2aa-c4a190ee77a4` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| total / ADJECTIVE | Including all parts together as one combined amount or number. | `01a1070c-7c58-76b5-a2ab-74b8a6de7e22` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| trade / NOUN | A skilled job that people learn through training and practical work. | `01a1070c-7c57-7676-9ace-18656f491ca7` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| tumor / NOUN | A mass of cells that grows abnormally in a person's body. | `01a1070c-7c57-7676-9ace-63a7042782dc` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| unique / ADJECTIVE | Being the only one of its kind, with no exact match elsewhere. | `01a1070c-7c58-76b5-a2aa-0a20d4f7ae01` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| via / PREPOSITION | By going through a particular place or using a particular method. | `01a1070c-7c59-726e-88d4-388175c26836` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| welcome / ADJECTIVE | Wanted and received with pleasure by a person or group. | `01a1070c-7c58-76b5-a2ab-be14abe16989` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| withdraw / VERB | To take back a statement, offer, or request that you made earlier. | `01a1070c-7c57-7676-9ace-79a6118270d8` | — | — | none | 0 / 0 | none / none | CREATE_NEW_CANDIDATE | UNRESOLVED |
| light / ADJECTIVE | Weighing little and easy to lift or carry. | `01a0fc13-09ee-7768-9be6-d20fa32521ee` | 1260 | 1260: CONFLICTING_MEANING | 1260.ipa, 1260.vietnamese, 1260.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| light / ADJECTIVE | Pale in color or close to white, rather than dark or strong. | `01a1070c-7c59-726e-88d5-9c1965cff571` | 1260 | 1260: CONFLICTING_MEANING | 1260.ipa, 1260.vietnamese, 1260.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| light / VERB | To make something begin burning by giving it a flame. | `01a1070c-7c57-7676-9acd-d23079256ae2` | 1260 | 1260: CONFLICTING_MEANING | 1260.ipa, 1260.vietnamese, 1260.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| reservation / NOUN | A feeling of doubt that makes someone cautious about agreeing. | `01a1070c-7c58-76b5-a2ab-369dd574695b` | 284 | 284: CONFLICTING_MEANING | 284.ipa, 284.vietnamese, 284.definitionEn | 0 / 0 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |
| water / VERB | To supply water to a plant so that it can grow. | `01a0fc13-09ef-75ac-b815-039ab337c01a` | 11, 405 | 11: CONFLICTING_MEANING; 405: CONFLICTING_MEANING | 11.ipa, 11.vietnamese, 11.definitionEn, 405.ipa, 405.vietnamese, 405.definitionEn | 1 / 5 | none / none | IDENTITY_REVIEW_REQUIRED | UNRESOLVED |

## Ownership and no-write evidence

- Every owner decision is UNRESOLVED; finalized 0, unresolved 100. No importer-accepted reconciliation artifact was created.
- Master null/absent runtime enrichment means PRESERVE. No clearFields decision is authorized. Existing mappings retain their runtime integer identity; candidate similarity does not establish identity.
- DATABASE_CONNECTION = READ_ONLY_DEVELOPMENT; DATABASE_TRANSACTION = REPEATABLE_READ_READ_ONLY.
- INSERT_COUNT = 0; UPDATE_COUNT = 0; DELETE_COUNT = 0; DDL_COUNT = 0; RUNTIME_IDS_ALLOCATED = 0; BRIDGE_MAPPINGS_CREATED = 0; LEARNER_ROWS_MUTATED = 0.
- IMPORT_APPLY_EXECUTED = NO; MIGRATIONS_EXECUTED = NONE; PRODUCTION_CONNECTION = NONE; PRODUCTION_MUTATION = NO.
- Owner reconciliation is required. Runtime import remains unauthorized.
