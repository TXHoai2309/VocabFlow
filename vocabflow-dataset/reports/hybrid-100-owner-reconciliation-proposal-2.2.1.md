# Hybrid-100 Owner Reconciliation Proposal — 2.2.1

**Status:** proposal only; every actual `ownerDecision` remains `UNRESOLVED`. This artifact is analysis-only and is not accepted by the importer.

- Frozen source: `2.2.1 / APPROVED`; releaseHash `44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c`; release tree `51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e`.
- Phase 2G.1C snapshot fingerprint: `89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e` (100 Senses; 0 existing mappings; 85 zero-candidate; 13 one-candidate; 2 multi-candidate; 18 candidate rows; 15 distinct runtime IDs).
- Proposed counts: CREATE_NEW 97; MAP_EXISTING 3; OWNER_CHOICE_REQUIRED 0.
- All MAP_EXISTING proposals use `UPDATE_TO_MASTER`; no baseline-adoption proposal is made.

## Decision dimensions

The importer identity choices are `MAP_EXISTING`, `CREATE_NEW`, `SKIP`, and `UNRESOLVED`. `ADOPT_EXISTING_AS_BASELINE` and `UPDATE_TO_MASTER` are first-adoption policies used only with MAP_EXISTING. `OWNER_CHOICE_REQUIRED` and `IDENTITY_REVIEW_REQUIRED` are analysis statuses. `CREATE`, `UPDATE`, `NOOP`, `BLOCKED`, and `CONFLICT` are planner outcomes; NOOP is not an identity decision.

## 1. HIGH-CONFIDENCE CREATE_NEW

### No runtime candidate (85)

Each listed Sense follows the required zero-candidate default. No integer ID is allocated; `proposedAppVocabularyId` is null.

| Master Sense | POS | Meaning | Sense ID |
| --- | --- | --- | --- |
| acute | ADJECTIVE | Very severe or intense, especially when describing pain or a problem. | `01a1070c-7c58-76b5-a2aa-97f25323b0a8` |
| addition | NOUN | Something added to a group or place that was already there. | `01a1070c-7c59-726e-88d5-cff4c73ff34a` |
| age | NOUN | A particular period in history marked by shared conditions or events. | `01a1070c-7c57-7676-9acf-2166c93ae47a` |
| all right | INTERJECTION | Used to show that you agree with a suggestion or request. | `01a1070c-7c58-76b5-a2a9-f257db26d791` |
| all right | ADJECTIVE | In a satisfactory or acceptable condition, though not necessarily excellent. | `01a1070c-7c58-76b5-a2aa-db8e56d2cc07` |
| aquarium | NOUN | A public place where fish and other water animals are kept for people to see. | `01a1070c-7c59-726e-88d6-b5d43a60b62f` |
| architect | NOUN | A trained professional who plans buildings and prepares their designs. | `01a1070c-7c59-726e-88d4-c8cce3636c7a` |
| attack | NOUN | An act of violence intended to hurt a person or damage a place. | `01a1070c-7c59-726e-88d6-41334868edc3` |
| balloon | NOUN | A flexible bag that expands when filled with air or another gas. | `01a1070c-7c59-726e-88d5-589ec0261ad8` |
| bite | NOUN | A small wound or mark made when teeth or an insect pierce skin. | `01a1070c-7c57-7676-9acf-fbb6c07854f6` |
| broadly | ADVERB | Across a wide area, range of people, or set of subjects. | `01a1070c-7c58-76b5-a2ab-ed6693eca162` |
| challenge | VERB | To question whether a decision, claim, or authority is correct. | `01a1070c-7c59-726e-88d4-b375a308217e` |
| champion | NOUN | A person or team that has won an important competition. | `01a1070c-7c59-726e-88d6-12b693a50e53` |
| charge | VERB | To ask someone to pay a particular amount for a product or service. | `01a1070c-7c58-76b5-a2a9-aa41e4cd8ff9` |
| commercial | ADJECTIVE | Connected with buying and selling goods or providing services for profit. | `01a1070c-7c58-76b5-a2aa-20e7d1e01c66` |
| compelling | ADJECTIVE | So interesting that it holds someone's attention. | `01a1070c-7c58-76b5-a2aa-f3a4a21a7dc3` |
| concentrate | VERB | To give most of your attention or effort to one thing. | `01a1070c-7c58-76b5-a2ab-6137a474d3c3` |
| concern | VERB | To make someone feel worried about a possible problem or risk. | `01a1070c-7c59-726e-88d5-13e0fb40de8c` |
| confirm | VERB | To show that information or a plan is correct and certain. | `01a1070c-7c57-7676-9ace-93aa39952372` |
| crawl | VERB | To move forward very slowly, especially because progress is difficult. | `01a1070c-7c57-7676-9ace-32d1337aab90` |
| creature | NOUN | A living animal or other being, especially one that can move. | `01a1070c-7c59-726e-88d5-2a10fa50c2ef` |
| criticism | NOUN | Words that point out faults or weaknesses in someone's work or actions. | `01a1070c-7c59-726e-88d4-e052bbcb6335` |
| direct | ADVERB | By a direct route, without changing direction or stopping. | `01a1070c-7c57-7676-9acf-99d8c8592c32` |
| direct | VERB | To guide actors and creative work while a film is being made. | `01a1070c-7c58-76b5-a2ab-48eb58f50cbf` |
| double | ADVERB | Two times as much, as many, or as often as something else. | `01a1070c-7c59-726e-88d6-e7a8d422dbdf` |
| during | PREPOSITION | At some point within the time when an event or activity happens. | `01a1070c-7c58-76b5-a2aa-397ef521e177` |
| exchange | NOUN | The act of giving something and receiving something else in return. | `01a1070c-7c5a-7542-a092-e7df11b3bc0a` |
| exchange | VERB | To give one thing and receive something else in return. | `01a1070c-7c59-726e-88d4-f95f0a11a85e` |
| far | ADJECTIVE | At a great distance from a particular place. | `01a1070c-7c58-76b5-a2a9-4b4562d352c8` |
| forthcoming | ADJECTIVE | Willing to share information or speak honestly when someone asks. | `01a1070c-7c57-7676-9acf-51b00d9e4aca` |
| fossil fuel | NOUN | Fuel formed over a very long time from ancient plants or animals. | `01a1070c-7c57-7676-9ace-d8831aa1814d` |
| freshman | NOUN | A student in the first year of a high school or college program. | `01a1070c-7c58-76b5-a2a9-620e574defe8` |
| gap | NOUN | An empty space between two things or between parts of something. | `01a1070c-7c57-7676-9ace-014df3449d2e` |
| habit | NOUN | Something that you do regularly, often without thinking about it. | `01a1070c-7c57-7676-9acf-6a88ac566599` |
| honour | NOUN | Deep respect shown for a person's character, actions, or achievements. | `01a1070c-7c57-7676-9acd-eaf36e6184b3` |
| hopefully | ADVERB | Used at the start of a sentence to say that you hope something will happen. | `01a1070c-7c57-7676-9acf-09879397d1e1` |
| icon | NOUN | A small picture on a screen that represents a program, action, or item. | `01a1070c-7c59-726e-88d4-982f187e5653` |
| integrity | NOUN | The quality of being honest and following strong moral principles. | `01a1070c-7c59-726e-88d5-fa99c56877b4` |
| integrity | NOUN | The condition of being whole, complete, and free from damage. | `01a1070c-7c58-76b5-a2a9-3185a807d618` |
| junior | ADJECTIVE | Designed for or intended to be used by younger people. | `01a1070c-7c57-7676-9ace-c2f9d561c8f4` |
| just | ADVERB | Only a short time before the present moment or another event. | `01a1070c-7c58-76b5-a2aa-66b0757806fe` |
| known | ADJECTIVE | Recognized or familiar to people because they have heard about it. | `01a1070c-7c57-7676-9acf-e2bf85a21c08` |
| lawmaker | NOUN | An elected person who helps create or change laws for a country or region. | `01a1070c-7c59-726e-88d5-413213f77278` |
| lead | VERB | To cause a particular result or make it more likely to happen. | `01a1070c-7c59-726e-88d6-84571ea5dbf5` |
| leadership | NOUN | The act of guiding a group toward a shared goal. | `01a1070c-7c59-726e-88d6-6d55c97117dc` |
| let | VERB | To give someone permission to do something they want to do. | `01a1070c-7c57-7676-9ace-f28714bdee2e` |
| let | VERB | To allow an action or event to happen without trying to stop it. | `01a1070c-7c5a-7542-a092-d1d73dd0f634` |
| linguistic | ADJECTIVE | Connected with language, the way it works, or its study. | `01a1070c-7c58-76b5-a2a8-ebb7ee4a97d9` |
| market | VERB | To promote a product or service so that people will buy it. | `01a1070c-7c57-7676-9ace-4b581bada298` |
| member | NOUN | A person who belongs to a group, club, or organization. | `01a1070c-7c58-76b5-a2a9-d9fe7b7d857e` |
| moment | NOUN | A specific point in time when something happens or changes. | `01a1070c-7c59-726e-88d6-56be2debcdfe` |
| moment | NOUN | A very short period of time, often lasting only a few seconds. | `01a1070c-7c57-7676-9acf-390ac30fd890` |
| nature | NOUN | The basic character or qualities that make a person or thing what it is. | `01a1070c-7c5a-7542-a092-beb09c96a03f` |
| officer | NOUN | A person with an official position and particular duties or authority. | `01a1070c-7c59-726e-88d6-fc58f364e770` |
| per cent | ADJECTIVE | Used after a number to describe a rate measured out of one hundred. | `01a1070c-7c58-76b5-a2ac-007b8e765c31` |
| per cent | NOUN | A proportion that tells how many parts there are in every hundred. | `01a1070c-7c57-7676-9acf-83edaac99eb9` |
| portable | ADJECTIVE | Small or light enough to be carried or moved easily. | `01a1070c-7c59-726e-88d4-6b2a61e1e7c4` |
| prominent | ADJECTIVE | Well known and important, so that many people notice or respect you. | `01a1070c-7c59-726e-88d6-2bd02d10cccb` |
| quiet | ADJECTIVE | Making very little noise or having very little activity around you. | `01a1070c-7c58-76b5-a2ab-23b5c52b4d0f` |
| rear | ADJECTIVE | Located at the back of something rather than at its front. | `01a1070c-7c57-7676-9acf-c8bb470b0069` |
| repay | VERB | To give money back to the person or organization that lent it. | `01a1070c-7c59-726e-88d5-e6665424a3b2` |
| resident | NOUN | A person who lives in a particular place, usually for a long time. | `01a1070c-7c58-76b5-a2a9-c1530836b546` |
| rest | NOUN | A period when you stop working or moving to recover your energy. | `01a1070c-7c59-726e-88d5-700f2c9a47a0` |
| roster | NOUN | An official list of people who belong to a team or group. | `01a1070c-7c58-76b5-a2aa-aeb83963a729` |
| rotate | VERB | To take turns in a planned order so each person has a role. | `01a1070c-7c58-76b5-a2aa-4d54a373af15` |
| rotate | VERB | To turn around a central point while remaining in the same general place. | `01a1070c-7c58-76b5-a2a9-0030193008ca` |
| scholar | NOUN | A person who studies a subject deeply and knows a great deal about it. | `01a1070c-7c58-76b5-a2a8-d1cd64c3eada` |
| scrape | VERB | To remove a thin layer or substance by rubbing with a hard edge. | `01a1070c-7c59-726e-88d4-5263bfd63bbf` |
| set | NOUN | A group of related things that belong or are used together. | `01a1070c-7c59-726e-88d5-b778960784d8` |
| shake | VERB | To take someone's hand and move it briefly as a greeting or agreement. | `01a1070c-7c57-7676-9ace-a81c3cdf40fa` |
| shareholder | NOUN | A person or organization that owns part of a company through shares. | `01a1070c-7c5a-7542-a092-ff8307ef6e05` |
| shift | NOUN | A set period when a person is scheduled to work. | `01a1070c-7c58-76b5-a2ab-8ebf5829835d` |
| shift | NOUN | A change in the way something is arranged, understood, or done. | `01a1070c-7c59-726e-88d7-1390989a47b8` |
| spell | NOUN | A short period during which a particular kind of weather or activity lasts. | `01a1070c-7c58-76b5-a2ab-d47ce6596f64` |
| spread | VERB | To extend over a larger area or reach more places over time. | `01a1070c-7c59-726e-88d6-9edb547352aa` |
| textile | NOUN | Cloth made by weaving or knitting fibers together for practical use. | `01a1070c-7c58-76b5-a2a9-18ee254ff4be` |
| toll | NOUN | The number of people killed or injured by an accident or disaster. | `01a1070c-7c58-76b5-a2ab-a764716f4128` |
| total | ADJECTIVE | Complete in every part, with nothing missing or left out. | `01a1070c-7c58-76b5-a2aa-c4a190ee77a4` |
| total | ADJECTIVE | Including all parts together as one combined amount or number. | `01a1070c-7c58-76b5-a2ab-74b8a6de7e22` |
| trade | NOUN | A skilled job that people learn through training and practical work. | `01a1070c-7c57-7676-9ace-18656f491ca7` |
| tumor | NOUN | A mass of cells that grows abnormally in a person's body. | `01a1070c-7c57-7676-9ace-63a7042782dc` |
| unique | ADJECTIVE | Being the only one of its kind, with no exact match elsewhere. | `01a1070c-7c58-76b5-a2aa-0a20d4f7ae01` |
| via | PREPOSITION | By going through a particular place or using a particular method. | `01a1070c-7c59-726e-88d4-388175c26836` |
| welcome | ADJECTIVE | Wanted and received with pleasure by a person or group. | `01a1070c-7c58-76b5-a2ab-be14abe16989` |
| withdraw | VERB | To take back a statement, offer, or request that you made earlier. | `01a1070c-7c57-7676-9ace-79a6118270d8` |

### Runtime candidates rejected (12)

Candidate identity is not established by Vietnamese overlap, synonyms, or a related concept. Runtime candidate rows and their mappings, source identity, history counts, projection differences, and enrichment-preservation evidence are captured in the JSON proposal.

| Master Sense / meaning | Candidate(s) | Reason for CREATE_NEW |
| --- | --- | --- |
| exact / ADJECTIVE: Completely correct in every detail, with no important difference. (01a1070c-7c57-7676-9acf-b1c2d0e92475) | #1463 precise | The runtime lemma is 'precise', while the Master lemma is 'exact'. Their meanings overlap, but English lexical identity differs; matching Vietnamese does not justify reuse. |
| fuse / NOUN: A cord that burns slowly to set off a firework or explosive device. (01a1070c-7c59-726e-88d6-cf9dc05adb73) | #846 fuse | Both use 'fuse', but runtime #846 is an electrical safety device and the Master Sense is a slow-burning cord for an explosive or firework. |
| liable / ADJECTIVE: Likely to experience something undesirable in a particular situation. (01a1070c-7c59-726e-88d4-83e56ae5f536) | #1796 liable | Runtime #1796 combines responsibility with likelihood of doing something bad, and its effective Vietnamese is 'có trách nhiệm'. That mixed row does not establish the narrower Master Sense 'likely to experience something undesirable'; preserve it and propose a separate row. |
| rally / VERB: To bring people together for a shared public purpose or event. (01a1070c-7c56-71df-b6f0-39632387320e) | #1482 muster | The runtime lemma is 'muster', while the Master lemma is 'rally'. Gathering may overlap, but these are different English lexical identities. |
| relief / NOUN: Help given to people who are suffering or facing a serious emergency. (01a1070c-7c5a-7542-a093-116a29fa3a72) | #1461 relief | Runtime #1461 is pain/stress relief, not emergency aid. It is proposed exclusively for the separate pain-relief Master Sense. |
| rock / NOUN: The hard natural material that forms the ground and mountains. (01a1070c-7c58-76b5-a2ab-0ab34eedf7c6) | #944 kick | Runtime #944 is 'kick' = strike with the foot. Its Vietnamese 'đá' is a translation homonym for Master 'rock' = natural stone; it is not the same English identity or Sense. |
| struggle / VERB: To try very hard to do something that is difficult for you. (01a1070c-7c58-76b5-a2a9-92d544914a1a) | #1313 struggle; #1330 grapple; #1477 struggle | Runtime #1313 defines a 'difficult or strenuous effort' as a noun-like entry; the Master is the verb 'try very hard to do something difficult'. No clear same-POS/same-Sense basis supports reuse. Runtime #1330 is the different lemma 'grapple'. A matching Vietnamese translation does not make it the identity 'struggle'. Runtime #1477 defines struggle as 'fight or battle', a different sense from trying very hard to do something difficult. |
| light / ADJECTIVE: Weighing little and easy to lift or carry. (01a0fc13-09ee-7768-9be6-d20fa32521ee) | #1260 light | Runtime #1260 is the noun 'light' meaning visible brightness. It is not low weight, pale color, or the verb 'ignite'; matching lemma alone is insufficient. |
| light / ADJECTIVE: Pale in color or close to white, rather than dark or strong. (01a1070c-7c59-726e-88d5-9c1965cff571) | #1260 light | Runtime #1260 is the noun 'light' meaning visible brightness. It is not low weight, pale color, or the verb 'ignite'; matching lemma alone is insufficient. |
| light / VERB: To make something begin burning by giving it a flame. (01a1070c-7c57-7676-9acd-d23079256ae2) | #1260 light | Runtime #1260 is the noun 'light' meaning visible brightness. It is not low weight, pale color, or the verb 'ignite'; matching lemma alone is insufficient. |
| reservation / NOUN: A feeling of doubt that makes someone cautious about agreeing. (01a1070c-7c58-76b5-a2ab-369dd574695b) | #284 reservation | Runtime #284 means an advance booking and is already mapped to Master Sense 01a0fc13-09ef-7d37-a50f-d05db6b1a89c. The Hybrid Sense means doubt/hesitation, so the existing mapping must remain unchanged. |
| water / VERB: To supply water to a plant so that it can grow. (01a0fc13-09ef-75ac-b815-039ab337c01a) | #11 water; #405 water | Runtime #11 is noun/liquid 'water', not the verb meaning to supply water to a plant. Its progress and review history remain attached to #11. Runtime #405 is noun/liquid 'water', not the verb meaning to supply water to a plant. |

## 2. HIGH-CONFIDENCE MAP_EXISTING + UPDATE_TO_MASTER

These are proposal-only identity matches. Each mapped runtime ID is selected once, has no existing Master mapping in the scan, and requires explicit first-adoption policy `UPDATE_TO_MASTER`. The importer would derive the next contentVersion from a future verified current snapshot; no version is changed here.

| Master Sense | Runtime ID / word | Semantic justification | Content version | History | Existing mapping |
| --- | --- | --- | --- | --- | --- |
| deviate / VERB: To move away from a planned route, direction, or standard. (01a1070c-7c58-76b5-a2a9-78fe16fc29bb) | #1836 deviate | The lemma is deviate and the runtime definition 'to depart from an established course or norm' is a clear same-sense verb paraphrase of moving away from a planned route, direction, or standard. The Vietnamese wording differs, but it expresses the same departure meaning. Master-authoritative definition, Vietnamese, example, and enabled state require UPDATE_TO_MASTER. | 1 → 2 | 0 progress / 0 reviews | none |
| relief / NOUN: A reduction in pain or discomfort after treatment or a change. (01a1070c-7c58-76b5-a2aa-7e0812b069ae) | #1461 relief | The lemma is relief, both records are noun senses, and 'easing of pain or stress' is a clear same-sense paraphrase of reducing pain or discomfort. Runtime #1461 is reserved for this pain-relief Sense only; the separate emergency-aid Sense is proposed CREATE_NEW. Master-authoritative fields require UPDATE_TO_MASTER. | 1 → 2 | 0 progress / 0 reviews | none |
| stand / VERB: To be upright on your feet rather than sitting or lying down. (01a1070c-7c59-726e-88d5-882b36643f4e) | #948 stand | The lemma and effective Vietnamese match ('stand' / 'đứng'), the runtime definition 'be upright' is a direct same-sense paraphrase, and the Master sense is a verb. Master-authoritative definition and example require UPDATE_TO_MASTER; null Master enrichment must remain preserved. | 1 → 2 | 0 progress / 0 reviews | none |

For every map, `ipa`, `imageUrl`, `audioUrl`, `topic`, and `level` are runtime enrichment. A null or absent Master value means preserve; the proposal requests no clearing. This is particularly relevant to #1836 (IPA/image/audio/topic) and #948 (runtime IPA).

## 3. OWNER_CHOICE_REQUIRED

No Sense meets the threshold for OWNER_CHOICE_REQUIRED after applying conservative CREATE_NEW to ambiguous candidates and selecting only clear same-Sense paraphrases for MAP_EXISTING. Owner decisions themselves remain unresolved on all 100 rows.

## 4. IDENTITY COLLISIONS / HISTORY-SENSITIVE CASES

- **Reservation / #284:** runtime #284 is the booking Sense and its existing mapping to Master Sense `01a0fc13-09ef-7d37-a50f-d05db6b1a89c` remains untouched. The Hybrid doubt/hesitation Sense is CREATE_NEW.
- **Water / #11 and #405:** both discovered rows mean noun/liquid water, not the Master verb 'supply water to a plant'. Runtime #11 has 1 learner progress reference and 5 review-event references; neither row is selected and no history moves.
- **Light / #1260:** one brightness noun candidate is shared by three Master Senses (low-weight adjective, pale-color adjective, ignite verb). All three are CREATE_NEW; #1260 remains untouched.
- **Relief / #1461:** one runtime pain/stress-relief candidate was discovered for two Master noun Senses. It is proposed only for pain/discomfort reduction (#1461, UPDATE_TO_MASTER); emergency aid is CREATE_NEW. This proposal does not map #1461 twice.
- **Struggle:** #1313 is a noun-like 'difficult effort' definition, #1477 is fight/battle, and #1330 is the different lemma grapple. None establishes the Master verb Sense; CREATE_NEW is the conservative proposal.
- **False semantic candidates:** `exact` → `precise` and `rally` → `muster` are CREATE_NEW because lexical identity differs. `rock` → `kick` is explicitly rejected as a Vietnamese translation homonym (`đá`).
- **Liable / #1796:** the row mixes responsibility with a likelihood sense, and its effective Vietnamese points to responsibility. CREATE_NEW preserves that legacy identity while separating the narrower Master Sense.

## Integrity and execution boundary

- Phase 2G.1C candidate, snapshot summary, and manifest all pin `89bfe022122209e0d11031d4f970a9029fd92186bce46ddfca77b95870a51f8e`; no database scan was rerun.
- Current proposal rows: 100; owner decisions finalized: 0; unresolved: 100.
- `analysisOnly=true`, `acceptedByImporter=false`, `requiresHumanDecision=true`, `ownerReviewed=false`; this is not an APPLY-authorized reconciliation.
- This phase: database connection NONE; database writes NONE; IDs allocated 0; bridge mappings created 0; learner rows mutated 0; importer APPLY not executed; migrations NONE; production untouched.
- The 2.2.1 release and all Phase 2G.1C scan artifacts are inputs only and remain unchanged.

Machine-readable proposal: `vocabflow-dataset/workspaces/hybrid-100-runtime-reconciliation-2.2.1/owner-review/owner-reconciliation-proposal.json`.
