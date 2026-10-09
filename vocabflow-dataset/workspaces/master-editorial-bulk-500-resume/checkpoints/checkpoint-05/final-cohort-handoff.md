# Frozen bulk-500 — final checkpoint 05 cohort handoff

500/500 frozen groups authored; zero pending. This is a DRAFT content milestone, not owner content approval, rights clearance or an exhaustive Sense inventory.

Core fingerprint: `2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44`.
Frozen selection: `ed303558ab029cdf24f49ca9226b2910bd4beb79d41b6d1d27edb5f4dfc52076`.
Remote parent: `24b1774c60d5fb3bfe5eadf0eada9f3d5dc77660`.

## Counts

```json
{
  "aiQa": {
    "PASS": 116,
    "REVIEW": 57
  },
  "cefrEvidenceCoverage": {
    "A1": 29,
    "A2": 12,
    "B1": 15,
    "B2": 26,
    "C1": 15,
    "C2": 18
  },
  "cohortPending": 0,
  "correctionsApplied": 3,
  "correctionsProposed": 3,
  "cumulativeCohortAuthored": 500,
  "frozenSelection": 500,
  "multiSenseGroups": 47,
  "newGroups": 100,
  "newSenses": 173,
  "originalAuthored": 100,
  "posCoverage": {
    "ADJECTIVE": 27,
    "ADVERB": 32,
    "CONJUNCTION": 2,
    "DETERMINER": 4,
    "INTERJECTION": 1,
    "NOUN": 63,
    "NUMBER": 1,
    "PREPOSITION": 6,
    "PRONOUN": 4,
    "VERB": 33
  },
  "previousTotalSenses": 1390,
  "remainingCorpusGroups": 5123,
  "sourceCoverage": {
    "ENGLISH_VOCAB_4600": 24,
    "ENGLISH_VOCAB_4600+OXFORD_5000": 49,
    "OXFORD_5000": 27
  },
  "totalCorpusGroups": 1020,
  "totalSenses": 1563
}
```

The cohort contains 750 Sense drafts across checkpoints 01–05. All previous 1,390 corpus records remain exact; 173 new Senses bring the full corpus to 1,563. There are 1,020 authored corpus groups and 5,123 groups outside this authored corpus.

## Cumulative QA and unresolved records

`{'PASS': 563, 'REVIEW': 187}`. AI author self-review only. No human reviews or approvals manufactured. All prior REVIEW objects (16/27/57/30) and every checkpoint assessment are preserved with source hashes in cumulative-qa-history.json. Corrections retain original findings and are not retroactive PASS promotions.

- ORIGINAL: {'PASS': 131, 'REVIEW': 16}
- CHECKPOINT_02: {'PASS': 121, 'REVIEW': 27}
- CHECKPOINT_03: {'PASS': 83, 'REVIEW': 57}
- CHECKPOINT_04: {'PASS': 112, 'REVIEW': 30}
- CHECKPOINT_05: {'PASS': 116, 'REVIEW': 57}

Every unresolved REVIEW record is included in full in cumulative-qa-history.json. The following index is exhaustive for all five checkpoints:

- ORIGINAL `EDITORIAL_2H2H:law:rule`: Rule and legal field remain distinct noun proposals; the example asserts only a fictional rule, not current legal advice. Countability and article use match each sense; rights remain unresolved.
- ORIGINAL `EDITORIAL_2H2H:participation:taking-part`: Workshop participation is voluntary involvement rather than attendance permission as a lexical rule. Vietnamese sentence naturally expresses open participation; in/by constructions and uncountability checked.
- ORIGINAL `EDITORIAL_2H2H:whereby:by-which`: Formal relative process linker is preserved under the ledger ADVERB evidence, with construction uncertainty left for review. Vietnamese theo đó has its antecedent in the sentence and not an incomplete gloss.
- ORIGINAL `EDITORIAL_2H2H:matter:be-important`: Issue noun, important intransitive verb and physical substance noun are separate source boundaries. Vietnamese preserves letter timing, apology context and microscope observation; no technical mass/weight equivalence is asserted.
- ORIGINAL `EDITORIAL_2H2H:education:learning-process`: Learning process broader than attending school is retained. Access improvement is an aim, not a completed result; Vietnamese remote-village context and uncountable system use match.
- ORIGINAL `EDITORIAL_2H2H:over:across`: Spatial above, movement across and visiting adverb have separate ordinals and syntactic complements. Lamp, dog and lunch visit are distinct contexts; Vietnamese preserves invitation rather than completed visit.
- ORIGINAL `EDITORIAL_2H2H:last:final-in-order`: Source-supported determiner, adverb, noun and duration verb reviewed separately. DETERMINER label remains an unresolved source classification; recent visit is not claimed final forever, and duration does not imply ending quality.
- ORIGINAL `EDITORIAL_2H2H:last:most-recently`: Source-supported determiner, adverb, noun and duration verb reviewed separately. DETERMINER label remains an unresolved source classification; recent visit is not claimed final forever, and duration does not imply ending quality.
- ORIGINAL `EDITORIAL_2H2H:last:final-person`: Source-supported determiner, adverb, noun and duration verb reviewed separately. DETERMINER label remains an unresolved source classification; recent visit is not claimed final forever, and duration does not imply ending quality.
- ORIGINAL `EDITORIAL_2H2H:last:continue`: Source-supported determiner, adverb, noun and duration verb reviewed separately. DETERMINER label remains an unresolved source classification; recent visit is not claimed final forever, and duration does not imply ending quality.
- ORIGINAL `EDITORIAL_2H2H:society:community-system`: Broad social community and organized interest association are separated, with uncountable/countable guidance. Libraries and history group examples translate faithfully without suggesting the association represents all society.
- ORIGINAL `EDITORIAL_2H2H:to:destination`: Destination preposition is supported by Oxford ordinal zero. Infinitive marker source ordinal one is not drafted because ledger POS does not support its category; the gap remains visible in boundary audit.
- ORIGINAL `EDITORIAL_2H2H:speech:speaking`: Audience address and spoken expression/ability separated. Opening thanks and clear actor speech each match their intended boundary; Vietnamese does not add medical or speech-impairment facts.
- ORIGINAL `EDITORIAL_2H2H:well-being:health-comfort`: Welfare includes physical and mental dimensions rather than a diagnosis. Can support remains a possibility in Vietnamese; breaks are not presented as a guaranteed health intervention.
- ORIGINAL `EDITORIAL_2H2H:advise:recommend`: Recommendation rather than binding instruction is intended. Person-to-infinitive and bare gerund constructions checked; Vietnamese extra water and walking purpose are retained without adding health claims.
- ORIGINAL `EDITORIAL_2H2H:mental:mind-related`: Mind-related effort not pathology is the boundary. Puzzle example and Vietnamese trí óc fit adjective evidence; note avoids labelling a person or making a diagnostic claim.
- CHECKPOINT_02 `EDITORIAL_2H2H:further:additional`: Additional adjective and greater-distance adverb separated. Details versus walking contexts align; contradictory PREPOSITION evidence is not silently accepted and remains an undrafted source classification concern.
- CHECKPOINT_02 `EDITORIAL_2H2H:further:greater-distance`: Additional adjective and greater-distance adverb separated. Details versus walking contexts align; contradictory PREPOSITION evidence is not silently accepted and remains an undrafted source classification concern.
- CHECKPOINT_02 `EDITORIAL_2H2H:september:calendar-month`: Calendar month and in construction checked; examples capitalize September. Normalized group key remains lowercase; a separate display-only decision will preserve proper-name capitalization without identity change. Overlay AFTER wording and coupled boundary have been rechecked; original wording preserved.
- CHECKPOINT_02 `EDITORIAL_2H2H:warming:getting-warmer`: General temperature increase fits gradual room heating; no unsupported global-climate claim. Vietnamese preserves heater timing and gradual change; process noun is distinct from the participial adjective.
- CHECKPOINT_02 `EDITORIAL_2H2H:indifferent:uninterested`: Lack of concern about restaurant choice is not dislike or hostility. Vietnamese keeps seemed uncertainty; to complement is appropriate and no temporal constraint is inferred.
- CHECKPOINT_02 `EDITORIAL_2H2H:thirteen:number`: Number is exactly twelve plus one, and thirteen chairs is plural. Both languages preserve the same count; new scoped NUMBER parsing is editorial only, with canonical classification still unresolved.
- CHECKPOINT_02 `EDITORIAL_2H2H:exclude:not-include`: Leaving a cost outside a total and barring participation are distinct supported boundaries. Delivery-price and age-rule examples preserve scope without asserting a real policy; from valency checked.
- CHECKPOINT_02 `EDITORIAL_2H2H:exclude:bar-participation`: Leaving a cost outside a total and barring participation are distinct supported boundaries. Delivery-price and age-rule examples preserve scope without asserting a real policy; from valency checked.
- CHECKPOINT_02 `EDITORIAL_2H2H:decent:adequate`: Adequate standard and fair conduct have separate ordinals. Room budget and returned wallet contexts distinguish them; anomalous NOUN source evidence remains unresolved rather than drafted as accepted.
- CHECKPOINT_02 `EDITORIAL_2H2H:decent:respectable`: Adequate standard and fair conduct have separate ordinals. Room budget and returned wallet contexts distinguish them; anomalous NOUN source evidence remains unresolved rather than drafted as accepted.
- CHECKPOINT_02 `EDITORIAL_2H2H:elastic:stretch-and-return`: Adjective stretch/recovery meaning follows POS evidence even though source definition describes rubber noun. Cuff action translates naturally; towards previous shape avoids absolute perfect-recovery claim.
- CHECKPOINT_02 `EDITORIAL_2H2H:zero:number`: Absence of messages represented by zero, with plural messages. Vietnamese natural negation preserves amount; source NUMBER supported only in continuation, and scale point is not invented as absolute no temperature.
- CHECKPOINT_02 `EDITORIAL_2H2H:inferior:lower-rank-person`: Source-supported person noun interpreted as hierarchy, not a moral judgment of worth. Officer example avoids endorsing demeaning conduct; negation and subordinate relationship preserved in Vietnamese.
- CHECKPOINT_02 `EDITORIAL_2H2H:fierce:intense`: Force intensity and aggression have separate ordinals. Wind versus dog contexts and all-night/approach relations translate correctly; growling does not become a factual claim of an attack.
- CHECKPOINT_02 `EDITORIAL_2H2H:whoever:any-person`: PRONOUN Oxford evidence used for any qualifying person; conflicting NOUN evidence is not promoted. First arrival and seat permission preserved; clause-function note is grammatical, not a new canonical entity.
- CHECKPOINT_02 `EDITORIAL_2H2H:any:unspecified-amount`: Question amount, unrestricted choice, stand-alone pronoun and comparative degree differ meaningfully. Free-choice det boundary has no specific ordinal claim; translations retain question polarity and negative easier comparison, not a forced duplicate Sense split.
- CHECKPOINT_02 `EDITORIAL_2H2H:any:free-choice`: Question amount, unrestricted choice, stand-alone pronoun and comparative degree differ meaningfully. Free-choice det boundary has no specific ordinal claim; translations retain question polarity and negative easier comparison, not a forced duplicate Sense split.
- CHECKPOINT_02 `EDITORIAL_2H2H:any:one-unspecified`: Question amount, unrestricted choice, stand-alone pronoun and comparative degree differ meaningfully. Free-choice det boundary has no specific ordinal claim; translations retain question polarity and negative easier comparison, not a forced duplicate Sense split.
- CHECKPOINT_02 `EDITORIAL_2H2H:any:degree`: Question amount, unrestricted choice, stand-alone pronoun and comparative degree differ meaningfully. Free-choice det boundary has no specific ordinal claim; translations retain question polarity and negative easier comparison, not a forced duplicate Sense split.
- CHECKPOINT_02 `EDITORIAL_2H2H:whose:question-with-noun`: Question determiner, standalone question pronoun and relative possession determiner all represented. Bag, coat and writer examples translate possession faithfully; no false restriction to people or confusion with who's.
- CHECKPOINT_02 `EDITORIAL_2H2H:whose:question-alone`: Question determiner, standalone question pronoun and relative possession determiner all represented. Bag, coat and writer examples translate possession faithfully; no false restriction to people or confusion with who's.
- CHECKPOINT_02 `EDITORIAL_2H2H:whose:relative-possession`: Question determiner, standalone question pronoun and relative possession determiner all represented. Bag, coat and writer examples translate possession faithfully; no false restriction to people or confusion with who's.
- CHECKPOINT_02 `EDITORIAL_2H2H:introduction:bringing-into-use`: Opening text, acquaintance event and bringing into use have separate ordinals. Survey purpose, visitor questions and booking queues translate each boundary; not split by grammatical tense.
- CHECKPOINT_02 `EDITORIAL_2H2H:racist:discriminatory`: Discriminatory adjective and person noun distinct, based on beliefs/treatment rather than ancestry. School/speaker examples oppose prejudice without quoted slurs or real-person allegations; translations preserve actions.
- CHECKPOINT_02 `EDITORIAL_2H2H:racist:person-with-prejudice`: Discriminatory adjective and person noun distinct, based on beliefs/treatment rather than ancestry. School/speaker examples oppose prejudice without quoted slurs or real-person allegations; translations preserve actions.
- CHECKPOINT_02 `EDITORIAL_2H2H:warn:give-danger-notice`: Risk information not guaranteed harm or fabricated expertise. Loose stones/path and guide recipients translate correctly; about/of and negative infinitive constructions checked.
- CHECKPOINT_02 `EDITORIAL_2H2H:apparently:reported-or-seeming`: Reported/seeming claim preserves uncertainty, neither certainty nor automatic falsehood. Delayed train example has Vietnamese nghe nói and no real schedule assertion.
- CHECKPOINT_03 `EDITORIAL_2H2H:submit:accept-authority`: PASS: Transitive document delivery and intransitive submission to authority keep different complements. Submitted spelling and both source ordinals are checked; the rebel narrative translates resistance faithfully.
- CHECKPOINT_03 `EDITORIAL_2H2H:fuse:burning-cord`: REVIEW: The 4600 record supports the burning-cord noun only, not an electrical device or verb. The museum-style diagram example gives no operating instructions; specialist boundary remains for owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:contempt:lack-of-respect`: REVIEW: Emotional disrespect and court-related contempt are separate noun boundaries. The legal example reports a finding without prescribing a penalty; jurisdiction and precise Vietnamese legal terminology remain unresolved for owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:contempt:court-disrespect`: REVIEW: Emotional disrespect and court-related contempt are separate noun boundaries. The legal example reports a finding without prescribing a penalty; jurisdiction and precise Vietnamese legal terminology remain unresolved for owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:worth:monetary-value`: REVIEW: Predicative monetary worth, noun value and worth the effort remain distinct. The noun example extends value to practical importance beyond the source's money example; that extension and adjective taxonomy remain owner-review obligations.
- CHECKPOINT_03 `EDITORIAL_2H2H:worth:value`: REVIEW: Predicative monetary worth, noun value and worth the effort remain distinct. The noun example extends value to practical importance beyond the source's money example; that extension and adjective taxonomy remain owner-review obligations.
- CHECKPOINT_03 `EDITORIAL_2H2H:worth:deserving-effort`: REVIEW: Predicative monetary worth, noun value and worth the effort remain distinct. The noun example extends value to practical importance beyond the source's money example; that extension and adjective taxonomy remain owner-review obligations.
- CHECKPOINT_03 `EDITORIAL_2H2H:foster:encourage-development`: REVIEW: Encouraging trust and caring for a child preserve separate source ordinals and complements. The temporary-care boundary was checked with Oxford; the Vietnamese siblings example needs a gender-neutral overlay and full-batch re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:foster:temporary-child-care`: REVIEW: Encouraging trust and caring for a child preserve separate source ordinals and complements. The temporary-care boundary was checked with Oxford; the Vietnamese siblings example needs a gender-neutral overlay and full-batch re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:mission:important-task`: PASS: A rescue team's assigned purpose illustrates the countable task noun without turning every religious or diplomatic usage into the same Sense. Missing walkers translates directly and the infinitive names the task.
- CHECKPOINT_03 `EDITORIAL_2H2H:some:unspecified-amount`: REVIEW: Determiner with fabric and pronoun referring back to peaches are separate source-supported proposals. Positive offers and number agreement are qualified; quantifier taxonomy and complete pragmatic coverage remain unapproved.
- CHECKPOINT_03 `EDITORIAL_2H2H:some:unspecified-part`: REVIEW: Determiner with fabric and pronoun referring back to peaches are separate source-supported proposals. Positive offers and number agreement are qualified; quantifier taxonomy and complete pragmatic coverage remain unapproved.
- CHECKPOINT_03 `EDITORIAL_2H2H:whether:alternatives`: REVIEW: The seat request is an indirect yes-no question and the Vietnamese preserves uncertainty. Infinitive guidance distinguishes whether from conditional if; broader alternative-clause coverage needs owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:inclined:likely-or-willing`: REVIEW: Willingness and tendency are kept within the source adjective boundary and separated from physical slope. The negative meeting example is natural; the combined boundary's breadth remains a review obligation.
- CHECKPOINT_03 `EDITORIAL_2H2H:deforestation:forest-removal`: REVIEW: The proposal describes forest removal rather than pruning, but the broad draft boundary needs comparison with formal land-use definitions. The map example makes no unsupported causal or statistical claim.
- CHECKPOINT_03 `EDITORIAL_2H2H:everything:all-things`: REVIEW: Singular agreement and context-limited totality are explicit. The repair-bag translation preserves all needed things rather than every object in existence; full pronoun identity and pragmatic coverage remain unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:october:calendar-month`: REVIEW: The tenth-month boundary and in/on distinction are correct; display capitalization needs an additive October form overlay while the frozen lowercase key remains unchanged. No calendar or lexical identity approval is inferred.
- CHECKPOINT_03 `EDITORIAL_2H2H:wreck:destroy-or-damage`: REVIEW: Severe damage is supported by the 4600 verb evidence. The falling-tree example is natural, but the grammar field includes implementation commentary; replace that sentence through an additive learner-facing overlay.
- CHECKPOINT_03 `EDITORIAL_2H2H:college:educational-institution`: REVIEW: Further/higher/specialist education avoids claiming a single national degree level. The Vietnamese gloss offers context-dependent choices; the example uses a plausible local college but the regional institution boundary remains unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:mad:angry`: REVIEW: American anger and an informal judgement about an unreasonable idea are separated. The second avoids equating a clinical condition with foolishness; register and sensitive wording remain owner-review obligations.
- CHECKPOINT_03 `EDITORIAL_2H2H:mad:foolish-or-unreasonable`: REVIEW: American anger and an informal judgement about an unreasonable idea are separated. The second avoids equating a clinical condition with foolishness; register and sensitive wording remain owner-review obligations.
- CHECKPOINT_03 `EDITORIAL_2H2H:orchestra:instrumental-group`: REVIEW: The instrumental ensemble boundary and qualified conductor claim are appropriate. The Vietnamese tuning example over-specifies strings and sound; replace it with cao độ in an additive field overlay and re-review the batch.
- CHECKPOINT_03 `EDITORIAL_2H2H:foundation:funding-organisation`: PASS: Building support, developmental basis and funding organisation are kept distinct. The archive example makes no financial-law claim; plural foundations and proper-name capitalization are useful qualified grammar guidance.
- CHECKPOINT_03 `EDITORIAL_2H2H:inequality:unequal-treatment-or-opportunity`: PASS: Social/resource inequality is separated from mathematical notation. The survey's topic does not assert a measured disparity; singular/plural guidance and access-to-transport translation are coherent.
- CHECKPOINT_03 `EDITORIAL_2H2H:obsolete:no-longer-used`: PASS: Replacement and loss of practical use match the source adjective rather than equating age with uselessness. Historical retention of workshop tools is plausible; the Vietnamese gloss does not claim a tool is broken.
- CHECKPOINT_03 `EDITORIAL_2H2H:totally:completely`: PASS: Complete change of narrative mood illustrates the adverb's emphatic scope. Totally is not assigned a universal CEFR or identity; the revised ending and resulting atmosphere are faithful in Vietnamese.
- CHECKPOINT_03 `EDITORIAL_2H2H:aisle:passage-between-rows`: REVIEW: Passage-between-rows semantics and silent-s pronunciation are correct. Beside the aisle of history books is less natural than at the end of the history-book aisle; apply a coupled EN/VI example overlay and re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:early:before-usual-time`: REVIEW: Adjective and adverb preserve separate POS and source ordinals. Earlier/earliest and early in a period are checked, but the combined temporal boundary and adjective wording main time remain content-review obligations.
- CHECKPOINT_03 `EDITORIAL_2H2H:early:arrive-before-time`: REVIEW: Adjective and adverb preserve separate POS and source ordinals. Earlier/earliest and early in a period are checked, but the combined temporal boundary and adjective wording main time remain content-review obligations.
- CHECKPOINT_03 `EDITORIAL_2H2H:gay:same-gender-attraction`: REVIEW: Same-gender attraction is described neutrally as an adjective and the fictional couple is not linked to any real identity. Older cheerful usage is not silently merged; inclusivity, scope and register await owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:injury:physical-harm`: PASS: Physical harm is the supplied noun boundary, without a diagnosis or treatment instruction. Ankle location, missed performance and general-versus-particular countability are coherent in both languages.
- CHECKPOINT_03 `EDITORIAL_2H2H:penalty:punishment`: REVIEW: General punishment and football kick retain separate source ordinals. No monetary amount or legal consequence is invented; the sporting boundary is checked with IFAB but rule-dependent content remains owner-review material.
- CHECKPOINT_03 `EDITORIAL_2H2H:penalty:football-kick`: REVIEW: General punishment and football kick retain separate source ordinals. No monetary amount or legal consequence is invented; the sporting boundary is checked with IFAB but rule-dependent content remains owner-review material.
- CHECKPOINT_03 `EDITORIAL_2H2H:severe:very-serious`: PASS: Serious water shortage illustrates effects rather than size or a medical severity score. Vietnamese tình trạng thiếu nước nghiêm trọng matches the noun phrase; weather and punishment are collocation guidance only.
- CHECKPOINT_03 `EDITORIAL_2H2H:possibility:chance-or-option`: REVIEW: A feasible option and something that may happen are combined under the broad source boundary. The courtyard example illustrates an option, not a probability estimate; possible sub-Sense splitting remains unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:cultivate:grow-on-land`: REVIEW: Growing plants and deliberate habit development retain separate source ordinals and transitive objects. The agricultural grammar's final-syllable spelling claim is misleading; replace it with useful cultivation guidance via overlay.
- CHECKPOINT_03 `EDITORIAL_2H2H:cultivate:develop-deliberately`: REVIEW: Growing plants and deliberate habit development retain separate source ordinals and transitive objects. The agricultural grammar's final-syllable spelling claim is misleading; replace it with useful cultivation guidance via overlay.
- CHECKPOINT_03 `EDITORIAL_2H2H:methodology:system-of-methods`: PASS: A coordinated system of methods is distinguished from one technique. The survey comparison is fictional and claims no validated research outcome; the Vietnamese gloss includes both common and precise choices.
- CHECKPOINT_03 `EDITORIAL_2H2H:network:connected-system`: REVIEW: Connected equipment and social cooperation are different draft boundaries proposed within one broad source ordinal. Do not infer distinct canonical identities from this split; the full split and contact/system coverage need owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:network:people-with-links`: REVIEW: Connected equipment and social cooperation are different draft boundaries proposed within one broad source ordinal. Do not infer distinct canonical identities from this split; the full split and contact/system coverage need owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:anybody:unspecified-person`: REVIEW: Question/negative unspecified-person use and affirmative free choice are distinct proposals within one source ordinal. Singular agreement and adjective position are checked; canonical boundary and pragmatic coverage remain unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:anybody:free-choice-person`: REVIEW: Question/negative unspecified-person use and affirmative free choice are distinct proposals within one source ordinal. Singular agreement and adjective position are checked; canonical boundary and pragmatic coverage remain unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:firearm:gun`: REVIEW: Gun/projectile semantics are presented as a formal noun without importing any jurisdiction's legal classification. The museum sentence is descriptive only; specialist terminology and the broad Vietnamese alternative need owner review.
- CHECKPOINT_03 `EDITORIAL_2H2H:proceedings:legal-process`: REVIEW: Court process and activities of a formal gathering keep distinct source ordinals and plural-only grammar. No guilt, penalty or jurisdiction is asserted; legal Vietnamese terminology and document-related uses remain unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:proceedings:event-activities`: REVIEW: Court process and activities of a formal gathering keep distinct source ordinals and plural-only grammar. No guilt, penalty or jurisdiction is asserted; legal Vietnamese terminology and document-related uses remain unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:spiral:winding-shape`: REVIEW: Everyday winding shape covers the supplied cylinder-style observation while the example is a flat widening line. Formal spiral-versus-helix scope needs owner review; no mathematical theorem or DNA claim is introduced.
- CHECKPOINT_03 `EDITORIAL_2H2H:craft:handmade-items`: REVIEW: Handmade objects, making verb, occupation, vessel and skill retain all five source ordinals. Invariant vessel plural is checked. The bookbinding EN rewards versus VI requires mismatch needs an additive example overlay and full-batch re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:craft:make-carefully`: REVIEW: Handmade objects, making verb, occupation, vessel and skill retain all five source ordinals. Invariant vessel plural is checked. The bookbinding EN rewards versus VI requires mismatch needs an additive example overlay and full-batch re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:craft:skilled-handwork`: REVIEW: Handmade objects, making verb, occupation, vessel and skill retain all five source ordinals. Invariant vessel plural is checked. The bookbinding EN rewards versus VI requires mismatch needs an additive example overlay and full-batch re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:craft:vessel`: REVIEW: Handmade objects, making verb, occupation, vessel and skill retain all five source ordinals. Invariant vessel plural is checked. The bookbinding EN rewards versus VI requires mismatch needs an additive example overlay and full-batch re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:craft:skill`: REVIEW: Handmade objects, making verb, occupation, vessel and skill retain all five source ordinals. Invariant vessel plural is checked. The bookbinding EN rewards versus VI requires mismatch needs an additive example overlay and full-batch re-review.
- CHECKPOINT_03 `EDITORIAL_2H2H:electronics:devices`: REVIEW: Device collection and field of study preserve separate ordinals. Singular agreement applies to the subject field; replace the devices grammar's unhelpful final-s commentary with useful collocations through an overlay.
- CHECKPOINT_03 `EDITORIAL_2H2H:electronics:field-of-study`: REVIEW: Device collection and field of study preserve separate ordinals. Singular agreement applies to the subject field; replace the devices grammar's unhelpful final-s commentary with useful collocations through an overlay.
- CHECKPOINT_03 `EDITORIAL_2H2H:lord:nobleman`: REVIEW: Historical noble/land authority is distinguished from religious use and a capitalized title. The fictional gift of a mill claims no modern peerage law; exact title scope and Vietnamese register remain unresolved.
- CHECKPOINT_03 `EDITORIAL_2H2H:writing:handwriting`: PASS: Composition activity and visible handwriting retain separate source ordinals. Comparative time for exhibition labels is not confused with lettering size; uncountable and collected writings usages are separated.
- CHECKPOINT_03 `EDITORIAL_2H2H:competence:ability-to-do-well`: REVIEW: Adequate task performance should not be overstated as full mastery in the Vietnamese gloss. Customer enquiries also need a clearer questions translation; apply two field overlays and re-review the full batch.
- CHECKPOINT_03 `EDITORIAL_2H2H:we:speaker-and-others`: REVIEW: Speaker-plus-others is the supplied subject pronoun; us is explicitly object form. The you outside we example supports chúng tôi; inclusive/exclusive context and pronoun identity remain owner-review obligations.
- CHECKPOINT_04 `EDITORIAL_2H2H:register:enrol-or-record`: REVIEW: [SENSE_BOUNDARY] Enrolment and official-list noun accurately represent source ordinals 0 and 1; for/with/in constructions were checked against accessible Cambridge search text. That text also documents measurement and other noun uses absent from these two source boundaries. Additional scope needs editorial review; this is not an exhaustive register inventory.
- CHECKPOINT_04 `EDITORIAL_2H2H:register:official-list`: REVIEW: [SENSE_BOUNDARY] Enrolment and official-list noun accurately represent source ordinals 0 and 1; for/with/in constructions were checked against accessible Cambridge search text. That text also documents measurement and other noun uses absent from these two source boundaries. Additional scope needs editorial review; this is not an exhaustive register inventory.
- CHECKPOINT_04 `EDITORIAL_2H2H:war:armed-conflict`: REVIEW: [GRAMMAR] Armed fighting is a single source-supported noun boundary; particular-war versus warfare countability is not artificially split. Translation preserves town and daily-life scope. grammarNotesEn ends with an internal proposal comment, which should be removed by an exact-parent overlay before effective review.
- CHECKPOINT_04 `EDITORIAL_2H2H:naturally:as-expected`: PASS: Rain-filled pond illustrates a natural process; sentence-initial Naturally comments on an expected reaction. Vietnamese chưa được mở faithfully renders unopened, even if a polarity heuristic flags it. The grammar does not make natural equal safe; both ordinal boundaries remain separate.
- CHECKPOINT_04 `EDITORIAL_2H2H:layer:one-level-of-material`: PASS: A dust covering is a countable layer with an of complement. Vietnamese keeps thin and unused shelves; the definition covers above/below layers without requiring a numerical thickness. No geological classification is approved.
- CHECKPOINT_04 `EDITORIAL_2H2H:rope:thick-strong-cord`: REVIEW: [TRANSLATION] Thick cord and countability guidance are accurate, and the shelter/wind scenario is faithful. examples/0/vi repeats bằng awkwardly in mái trú bằng vải bạt bằng dây thừng; improve that phrasing in a versioned overlay, retaining the material and fixing action.
- CHECKPOINT_04 `EDITORIAL_2H2H:yet:up-to-now`: PASS: The timetable question uses present-perfect yet and Vietnamese đã...chưa naturally; a polarity heuristic may flag it but there is no translation negation error. The separate conjunction joins small room with enough comfortable seats. Comma and register notes fit both distinct ordinals.
- CHECKPOINT_04 `EDITORIAL_2H2H:unemployed:without-a-job`: REVIEW: [SEMANTICS] Factory closure and months without work translate faithfully, but definitionEn's able and available qualifier narrows an everyday adjective to a technical employment-statistics category. Remove that qualifier by overlay; no official statistical definition is being approved.
- CHECKPOINT_04 `EDITORIAL_2H2H:exactly:with-full-precision`: REVIEW: [TRANSLATION] Full equality of board lengths is correct, but examples/0/vi ends with bằng nhau chính xác, which is awkward Vietnamese. Use bằng nhau hoàn toàn in an overlay while retaining the exact-equality meaning and both boards.
- CHECKPOINT_04 `EDITORIAL_2H2H:reportedly:according-to-reports`: PASS: The reporting adverb explicitly retains uncertainty; Vietnamese theo nguồn tin does not claim independent confirmation. Fictional missing-statue scenario is original. Grammar distinguishes report attribution from proof of truth rather than using reportedly as an assertion of fact.
- CHECKPOINT_04 `EDITORIAL_2H2H:carriage:railway-passenger-car`: REVIEW: [TRANSLATION] Passenger train and horse-drawn vehicle are separate ordinal boundaries with sensible regional notes. In the horse-vehicle example, Vietnamese nằm cạnh is awkward for a museum display object; replace with được đặt cạnh by overlay, retaining restoration and former owner's photograph.
- CHECKPOINT_04 `EDITORIAL_2H2H:carriage:horse-drawn-vehicle`: REVIEW: [TRANSLATION] Passenger train and horse-drawn vehicle are separate ordinal boundaries with sensible regional notes. In the horse-vehicle example, Vietnamese nằm cạnh is awkward for a museum display object; replace with được đặt cạnh by overlay, retaining restoration and former owner's photograph.
- CHECKPOINT_04 `EDITORIAL_2H2H:bible:christian-scripture`: REVIEW: [FORM] Christian sacred collection and physical-copy example are supported without asserting religious claims as history. Kinh Thánh is appropriate. displayFormProposal defaults to lowercase bible in the parser; add a Bible display overlay while preserving the normalized identity and manuscript bytes.
- CHECKPOINT_04 `EDITORIAL_2H2H:quite:moderately`: REVIEW: [POS_CLASSIFICATION] Both actual adverb meanings are supported by Oxford and accessible Cambridge grammar text: gradable spacious and complete correct. The 4600 source labels quite ADJECTIVE; that conflicting classification remains unresolved rather than adopted. Context/intonation/region affect degree, so no approved CEFR or universal strength is inferred.
- CHECKPOINT_04 `EDITORIAL_2H2H:quite:completely`: REVIEW: [POS_CLASSIFICATION] Both actual adverb meanings are supported by Oxford and accessible Cambridge grammar text: gradable spacious and complete correct. The 4600 source labels quite ADJECTIVE; that conflicting classification remains unresolved rather than adopted. Context/intonation/region affect degree, so no approved CEFR or universal strength is inferred.
- CHECKPOINT_04 `EDITORIAL_2H2H:freight:transported-goods`: REVIEW: [GRAMMAR] Goods transport and uncountability are accurate, with train timing faithfully translated. grammarNotesEn ends with an internal canonical-identity statement rather than learner usage; replace that sentence with a useful goods/passenger contrast in an overlay.
- CHECKPOINT_04 `EDITORIAL_2H2H:double:two-part`: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- CHECKPOINT_04 `EDITORIAL_2H2H:double:twice-quantity-before-noun`: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- CHECKPOINT_04 `EDITORIAL_2H2H:double:twice-quantity-alone`: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- CHECKPOINT_04 `EDITORIAL_2H2H:double:become-twice`: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- CHECKPOINT_04 `EDITORIAL_2H2H:double:pay-twice`: REVIEW: [POS_CLASSIFICATION] All five source ordinals are represented: two-part door adjective, noun-followed quantity determiner, standalone twelve-tool quantity pronoun, membership-change verb and paid-double adverb. Vietnamese preserves each construction. Det/pronoun/adverb taxonomy boundaries need owner review despite source support; accessible Oxford adjective/adverb and published wordlist extracts corroborate usage but do not approve canonical POS.
- CHECKPOINT_04 `EDITORIAL_2H2H:better:higher-quality`: REVIEW: [LEXICAL_IDENTITY] Higher-quality adjective and worked-better adverb accurately represent good/well comparatives. The nominal for the better boundary is source-supported but construction-bound; owner should decide how it relates to good/well and phrase teaching before canonical identity allocation. Vietnamese retains the leadership improvement without fabricating an independent countable noun.
- CHECKPOINT_04 `EDITORIAL_2H2H:better:more-effectively`: REVIEW: [LEXICAL_IDENTITY] Higher-quality adjective and worked-better adverb accurately represent good/well comparatives. The nominal for the better boundary is source-supported but construction-bound; owner should decide how it relates to good/well and phrase teaching before canonical identity allocation. Vietnamese retains the leadership improvement without fabricating an independent countable noun.
- CHECKPOINT_04 `EDITORIAL_2H2H:better:improvement`: REVIEW: [LEXICAL_IDENTITY] Higher-quality adjective and worked-better adverb accurately represent good/well comparatives. The nominal for the better boundary is source-supported but construction-bound; owner should decide how it relates to good/well and phrase teaching before canonical identity allocation. Vietnamese retains the leadership improvement without fabricating an independent countable noun.
- CHECKPOINT_04 `EDITORIAL_2H2H:humid:moist-air`: PASS: Water vapour in air and post-shower example support có độ ẩm cao. Vietnamese không khí, rather than wet ground, preserves the target. Humidity note correctly distinguishes air moisture from a surface being wet.
- CHECKPOINT_04 `EDITORIAL_2H2H:rust:iron-corrosion-material`: REVIEW: [GRAMMAR] Iron/steel corrosion and hinge example are accurate, with uncountable material expressed as rỉ sét. grammarNotesEn's final separate POS proposal comment belongs to tooling rather than learner content; replace it with a concise verb-usage contrast by overlay.
- CHECKPOINT_04 `EDITORIAL_2H2H:youth:young-period-of-life`: REVIEW: [TRANSLATION] Life period, countable person and collective young people are genuine noun uses, with countability/register distinguished. The countable example leaves gender unspecified, while examples/0/vi thanh niên can suggest a male; change to người trẻ tuổi in an overlay. Keep human identity/age classification unresolved and do not merge all three uses into one canonical Sense.
- CHECKPOINT_04 `EDITORIAL_2H2H:youth:young-person`: REVIEW: [TRANSLATION] Life period, countable person and collective young people are genuine noun uses, with countability/register distinguished. The countable example leaves gender unspecified, while examples/0/vi thanh niên can suggest a male; change to người trẻ tuổi in an overlay. Keep human identity/age classification unresolved and do not merge all three uses into one canonical Sense.
- CHECKPOINT_04 `EDITORIAL_2H2H:youth:young-people-collectively`: REVIEW: [TRANSLATION] Life period, countable person and collective young people are genuine noun uses, with countability/register distinguished. The countable example leaves gender unspecified, while examples/0/vi thanh niên can suggest a male; change to người trẻ tuổi in an overlay. Keep human identity/age classification unresolved and do not merge all three uses into one canonical Sense.
- CHECKPOINT_04 `EDITORIAL_2H2H:idle:not-active`: PASS: Unused sewing machine demonstrates temporary inactivity rather than laziness. Vietnamese không hoạt động is correct, with awaited replacement part retained. Stand/remain idle and person/equipment distinction keep value judgment out of the definition.
- CHECKPOINT_05 `EDITORIAL_2H2H:lot:quantity-before-noun`: REVIEW: [LEXICAL_IDENTITY] Three source-supported quantity constructions are accurate, but the normalized key lot contains multiword a lot and a lot of uses; no single-word or Master identity approval follows.
- CHECKPOINT_05 `EDITORIAL_2H2H:lot:quantity-without-noun`: REVIEW: [LEXICAL_IDENTITY] Three source-supported quantity constructions are accurate, but the normalized key lot contains multiword a lot and a lot of uses; no single-word or Master identity approval follows.
- CHECKPOINT_05 `EDITORIAL_2H2H:lot:degree-or-frequency`: REVIEW: [LEXICAL_IDENTITY] Three source-supported quantity constructions are accurate, but the normalized key lot contains multiword a lot and a lot of uses; no single-word or Master identity approval follows.
- CHECKPOINT_05 `EDITORIAL_2H2H:offense:punishable-act`: PASS: Rule-breaking countable noun and uncountable hurt feelings are separate; fictional school example avoids real legal claims and offense/offence spelling guidance is qualified.
- CHECKPOINT_05 `EDITORIAL_2H2H:offense:hurt-or-insult`: PASS: Rule-breaking countable noun and uncountable hurt feelings are separate; fictional school example avoids real legal claims and offense/offence spelling guidance is qualified.
- CHECKPOINT_05 `EDITORIAL_2H2H:all:whole-quantity-before-noun`: REVIEW: [POS_CLASSIFICATION] Determiner and standalone pronoun work; all dry with plural towels ambiguously allows every-member quantification. Replace that example with a singular degree context through an overlay and retain the original finding.
- CHECKPOINT_05 `EDITORIAL_2H2H:all:whole-quantity-standing-alone`: REVIEW: [POS_CLASSIFICATION] Determiner and standalone pronoun work; all dry with plural towels ambiguously allows every-member quantification. Replace that example with a singular degree context through an overlay and retain the original finding.
- CHECKPOINT_05 `EDITORIAL_2H2H:all:complete-degree`: REVIEW: [POS_CLASSIFICATION] Determiner and standalone pronoun work; all dry with plural towels ambiguously allows every-member quantification. Replace that example with a singular degree context through an overlay and retain the original finding.
- CHECKPOINT_05 `EDITORIAL_2H2H:intrigue:arouse-curiosity`: PASS: The unsigned letter arouses curiosity rather than a conspiratorial noun sense; intrigued person/intriguing cause grammar and museum example are coherent.
- CHECKPOINT_05 `EDITORIAL_2H2H:stubborn:refusing-to-change`: PASS: Refusal to change a decision differs from a stain resisting removal; Vietnamese captures the person/object distinction, including the organizer refusing to postpone.
- CHECKPOINT_05 `EDITORIAL_2H2H:ton:large-weight-unit`: REVIEW: [SEMANTICS] Multiple measurement systems remain explicitly unresolved in the cargo example; no exact conversion or claim that every ton equals a metric tonne is introduced.
- CHECKPOINT_05 `EDITORIAL_2H2H:wicked:morally-bad`: REVIEW: [SENSE_BOUNDARY] Cruel moral adjective is accurately illustrated by a fictional ruler; other colloquial or playful uses remain outside this source-limited draft and require coverage review.
- CHECKPOINT_05 `EDITORIAL_2H2H:around:in-the-vicinity`: PASS: Surrounding-preposition and vicinity-adverb examples differ structurally; fountain planting and zip-repair question preserve natural Vietnamese and noun-complement contrast.
- CHECKPOINT_05 `EDITORIAL_2H2H:harness:put-energy-to-use`: REVIEW: [SENSE_BOUNDARY] Energy-use verb is sound and solar water heating is accurate; source horse-equipment example represents another boundary not authored here, retained for coverage audit.
- CHECKPOINT_05 `EDITORIAL_2H2H:fond:feeling-affection-or-liking`: REVIEW: [POS_CLASSIFICATION] Fond of growing is an adjective construction corroborated lexically; the 4600 verb label remains a source conflict, never accepted as a new verb Sense.
- CHECKPOINT_05 `EDITORIAL_2H2H:whatever:anything-without-restriction`: PASS: Whatever fabric takes a noun and whatever remains stands alone; unrestricted choice versus residual objects matches Vietnamese and is not mislabeled as indifference.
- CHECKPOINT_05 `EDITORIAL_2H2H:fiery:full-of-strong-emotion`: REVIEW: [SENSE_BOUNDARY] Emotional intensity example is accurate but the 4600 evidence directly describes burning; literal-fire coverage is missing and must not be silently called exhaustive.
- CHECKPOINT_05 `EDITORIAL_2H2H:downtown:central-city-area`: REVIEW: [POS_CLASSIFICATION] Central district noun, downtown hotel adjective and went downtown adverb are accurate; North American usage and regional construction identity remain unapproved.
- CHECKPOINT_05 `EDITORIAL_2H2H:downtown:in-the-city-centre`: REVIEW: [POS_CLASSIFICATION] Central district noun, downtown hotel adjective and went downtown adverb are accurate; North American usage and regional construction identity remain unapproved.
- CHECKPOINT_05 `EDITORIAL_2H2H:downtown:to-or-in-the-centre`: REVIEW: [POS_CLASSIFICATION] Central district noun, downtown hotel adjective and went downtown adverb are accurate; North American usage and regional construction identity remain unapproved.
- CHECKPOINT_05 `EDITORIAL_2H2H:magnet:object-with-magnetic-attraction`: PASS: Attraction is limited to certain materials, avoiding the false all-metals claim; fridge-note example and magnetic-field definition remain coherent.
- CHECKPOINT_05 `EDITORIAL_2H2H:o’clock:exact-hour-expression`: REVIEW: [FORM] Curly-apostrophe normalized key and straight-apostrophe example are spelling variants; exact-hour adverb is accurate, but lexical-form identity remains unresolved.
- CHECKPOINT_05 `EDITORIAL_2H2H:upwards:towards-a-higher-position`: PASS: Higher direction is distinct from a numeric lower bound; warm-air lantern example translates faithfully and upward/upwards variety note is qualified.
- CHECKPOINT_05 `EDITORIAL_2H2H:will:future-prediction`: REVIEW: [POS_CLASSIFICATION] Prediction and promise are modal constructions under source VERB, distinct from determination and inheritance nouns; no ordinary inflected verb or legal document validity is approved.
- CHECKPOINT_05 `EDITORIAL_2H2H:will:present-decision-or-promise`: REVIEW: [POS_CLASSIFICATION] Prediction and promise are modal constructions under source VERB, distinct from determination and inheritance nouns; no ordinary inflected verb or legal document validity is approved.
- CHECKPOINT_05 `EDITORIAL_2H2H:will:determination`: REVIEW: [POS_CLASSIFICATION] Prediction and promise are modal constructions under source VERB, distinct from determination and inheritance nouns; no ordinary inflected verb or legal document validity is approved.
- CHECKPOINT_05 `EDITORIAL_2H2H:will:document-about-inheritance`: REVIEW: [POS_CLASSIFICATION] Prediction and promise are modal constructions under source VERB, distinct from determination and inheritance nouns; no ordinary inflected verb or legal document validity is approved.
- CHECKPOINT_05 `EDITORIAL_2H2H:content:information-in-a-work`: REVIEW: [LEXICAL_IDENTITY] Information noun and satisfied adjective have distinct meanings and pronunciation stress; spelling alone cannot establish a shared Sense or existing Master identity.
- CHECKPOINT_05 `EDITORIAL_2H2H:content:satisfied-with-situation`: REVIEW: [LEXICAL_IDENTITY] Information noun and satisfied adjective have distinct meanings and pronunciation stress; spelling alone cannot establish a shared Sense or existing Master identity.
- CHECKPOINT_05 `EDITORIAL_2H2H:fridge:refrigerated-storage-appliance`: PASS: Chilled storage appliance differs from freezer; remaining soup and cooling sequence translate faithfully and informal refrigerator shortening is accurate.
- CHECKPOINT_05 `EDITORIAL_2H2H:instrumental:important-in-achieving-result`: REVIEW: [SENSE_BOUNDARY] Key-role and music-without-vocals adjectives are separate; the source-supported NOUN piece-of-music boundary remains unrepresented and requires coverage review.
- CHECKPOINT_05 `EDITORIAL_2H2H:instrumental:music-without-vocals`: REVIEW: [SENSE_BOUNDARY] Key-role and music-without-vocals adjectives are separate; the source-supported NOUN piece-of-music boundary remains unrepresented and requires coverage review.
- CHECKPOINT_05 `EDITORIAL_2H2H:fast:moving-quickly`: REVIEW: [LEXICAL_IDENTITY] Quick adjective/adverb and food-abstention verb differ meaningfully; fasting source boundary remains a proposal and the fictional observance is not a recommendation.
- CHECKPOINT_05 `EDITORIAL_2H2H:fast:at-high-speed`: REVIEW: [LEXICAL_IDENTITY] Quick adjective/adverb and food-abstention verb differ meaningfully; fasting source boundary remains a proposal and the fictional observance is not a recommendation.
- CHECKPOINT_05 `EDITORIAL_2H2H:fast:go-without-food`: REVIEW: [LEXICAL_IDENTITY] Quick adjective/adverb and food-abstention verb differ meaningfully; fasting source boundary remains a proposal and the fictional observance is not a recommendation.
- CHECKPOINT_05 `EDITORIAL_2H2H:weave:interlace-material`: REVIEW: [GRAMMAR] Fabric wove/woven and motion weaved are reviewed as different inflection patterns; local source supports both meanings but movement-form evidence needs lexical corroboration.
- CHECKPOINT_05 `EDITORIAL_2H2H:weave:move-in-a-winding-route`: REVIEW: [GRAMMAR] Fabric wove/woven and motion weaved are reviewed as different inflection patterns; local source supports both meanings but movement-form evidence needs lexical corroboration.
- CHECKPOINT_05 `EDITORIAL_2H2H:forward:towards-the-front`: REVIEW: [POS_CLASSIFICATION] Direction adverb and front-section adjective are supported; 4600 PREPOSITION label conflicts with its own adverbial example and is not authored as a new Sense.
- CHECKPOINT_05 `EDITORIAL_2H2H:forward:at-or-towards-the-front`: REVIEW: [POS_CLASSIFICATION] Direction adverb and front-section adjective are supported; 4600 PREPOSITION label conflicts with its own adverbial example and is not authored as a new Sense.
- CHECKPOINT_05 `EDITORIAL_2H2H:intermittent:stopping-and-starting`: PASS: Pauses between rain episodes distinguish intermittent from continuous light rain; Vietnamese lúc có lúc không and intermittently guidance are natural.
- CHECKPOINT_05 `EDITORIAL_2H2H:withdrawal:removing-from-a-situation`: REVIEW: [SEMANTICS] Contest departure, account withdrawal and cessation effects are separate; the health boundary is descriptive, not diagnosis or treatment, and formal scope remains owner-unapproved.
- CHECKPOINT_05 `EDITORIAL_2H2H:withdrawal:taking-money-out`: REVIEW: [SEMANTICS] Contest departure, account withdrawal and cessation effects are separate; the health boundary is descriptive, not diagnosis or treatment, and formal scope remains owner-unapproved.
- CHECKPOINT_05 `EDITORIAL_2H2H:withdrawal:effects-after-stopping-a-substance`: REVIEW: [SEMANTICS] Contest departure, account withdrawal and cessation effects are separate; the health boundary is descriptive, not diagnosis or treatment, and formal scope remains owner-unapproved.
- CHECKPOINT_05 `EDITORIAL_2H2H:guilty:responsible-for-wrongdoing`: REVIEW: [POS_CLASSIFICATION] Responsibility and remorse are accurate adjectives; 4600 NOUN label conflicts with its own felt-guilty example and no noun is manufactured.
- CHECKPOINT_05 `EDITORIAL_2H2H:guilty:feeling-remorse`: REVIEW: [POS_CLASSIFICATION] Responsibility and remorse are accurate adjectives; 4600 NOUN label conflicts with its own felt-guilty example and no noun is manufactured.
- CHECKPOINT_05 `EDITORIAL_2H2H:million:one-thousand-thousand`: REVIEW: [POS_CLASSIFICATION] NUMBER proposal accurately denotes 1000000 and million/millions-of syntax; source NOUN classification conflict remains unresolved.
- CHECKPOINT_05 `EDITORIAL_2H2H:sentence:official-punishment`: PASS: Grammatical unit, punishment-imposing verb and punishment noun differ; fictional judge/appeal contexts and sentence-to construction preserve legal meaning without legal advice.
- CHECKPOINT_05 `EDITORIAL_2H2H:thus:as-a-result`: REVIEW: [POS_CLASSIFICATION] Result and manner adverbs are accurate; source CONJUNCTION conflict remains unresolved and the result example avoids a comma splice.
- CHECKPOINT_05 `EDITORIAL_2H2H:thus:in-this-way`: REVIEW: [POS_CLASSIFICATION] Result and manner adverbs are accurate; source CONJUNCTION conflict remains unresolved and the result example avoids a comma splice.
- CHECKPOINT_05 `EDITORIAL_2H2H:might:uncertain-possibility`: REVIEW: [LEXICAL_IDENTITY] Modal possibility and great-power noun differ; conditional delivery is uncertain and fictional military power does not imply shared Sense identity.
- CHECKPOINT_05 `EDITORIAL_2H2H:might:great-power`: REVIEW: [LEXICAL_IDENTITY] Modal possibility and great-power noun differ; conditional delivery is uncertain and fictional military power does not imply shared Sense identity.
- CHECKPOINT_05 `EDITORIAL_2H2H:unlike:different-from`: REVIEW: [POS_CLASSIFICATION] Different-from preposition is accurate in the tent comparison; source-supported ADJECTIVE possibility is unrepresented rather than guessed from the same example.
- CHECKPOINT_05 `EDITORIAL_2H2H:pound:british-currency-unit`: REVIEW: [SEMANTICS] British currency, everyday avoirdupois weight and repeated-striking verb are distinct; sixteen-ounce statement needs evidenced measurement-system qualification, preserved through a grammar overlay.
- CHECKPOINT_05 `EDITORIAL_2H2H:pound:weight-unit`: REVIEW: [SEMANTICS] British currency, everyday avoirdupois weight and repeated-striking verb are distinct; sixteen-ounce statement needs evidenced measurement-system qualification, preserved through a grammar overlay.
- CHECKPOINT_05 `EDITORIAL_2H2H:pound:strike-repeatedly`: REVIEW: [SEMANTICS] British currency, everyday avoirdupois weight and repeated-striking verb are distinct; sixteen-ounce statement needs evidenced measurement-system qualification, preserved through a grammar overlay.
- CHECKPOINT_05 `EDITORIAL_2H2H:including:with-as-part-of-the-group`: REVIEW: [POS_CLASSIFICATION] Group-membership preposition includes new members within the total eight; conflicting source ADJECTIVE label is not treated as an approved boundary.
- CHECKPOINT_05 `EDITORIAL_2H2H:therefore:logical-result`: REVIEW: [POS_CLASSIFICATION] Logical-result adverb and semicolon clause connection are accurate; source CONJUNCTION label remains unresolved rather than changing canonical POS.

## Sense Coverage warnings

Every frozen group has a coverage row in cohort-integrity.json. Missing Oxford ordinals, source POS conflicts and absent structured ordinals remain warnings. Even matching all ordinals does not prove lexical exhaustiveness. Explicit new gaps: fiery literal burning; harness horse-equipment use. These are handoff findings, not silently approved omissions.

- `NORMALIZED_HEADWORD:aggregate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:approximate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:condensed`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:culminate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:daisy`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:hail`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['NOUN']
- `NORMALIZED_HEADWORD:merry`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:omit`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:ordeal`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:overcrowded`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:primate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:primitive`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:rumor`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:subtract`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:to`: SOURCE_ORDINALS_NOT_REPRESENTED; missing ordinals [1]; missing/conflicting POS []
- `NORMALIZED_HEADWORD:wail`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:wardrobe`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:chew`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:habitual`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:further`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['PREPOSITION']
- `NORMALIZED_HEADWORD:rupture`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:clay`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:inadvertent`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:throne`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:homogeneous`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:indifferent`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:intimidate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:vegetarian`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:wooded`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:leash`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:proximity`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:thunder`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:wavy`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:decent`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['NOUN']
- `NORMALIZED_HEADWORD:elastic`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:inferior`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:skeletal`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:willpower`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:whoever`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['NOUN']
- `NORMALIZED_HEADWORD:chin`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:grapefruit`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:tract`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:drastic`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:irrigate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:personalize`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:fuse`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:toddler`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:deforestation`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:wreck`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:fog`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:zip`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:disgraceful`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:saturated`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:obsolete`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:aisle`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:apprentice`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:spiral`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:sunlight`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:yawn`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:faint`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:kettle`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:winding`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:hospitality`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:termite`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:inflate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:folklore`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:necklace`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:statute`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:hinder`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:peel`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:dynamics`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:bible`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:federation`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:morals`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:quite`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['ADJECTIVE']
- `NORMALIZED_HEADWORD:skillful`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:freight`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:prehistoric`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:sew`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:etiquette`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:intertwine`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:ruins`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:sideways`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:foresee`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:peninsula`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:stern`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:wax`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:humid`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:lump`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:rust`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:stricken`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:enchant`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:idle`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:starch`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:handbook`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:offense`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:turbine`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:harmonize`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:intrigue`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:pessimistic`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:stubborn`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:mist`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:raisin`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:wicked`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:harness`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN, EXPLICIT_UNREPRESENTED_MEANING; missing ordinals []; missing/conflicting POS []. Horse-equipment boundary suggested by source example remains unrepresented.
- `NORMALIZED_HEADWORD:laundry`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:outlaw`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:fond`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['VERB']
- `NORMALIZED_HEADWORD:irritate`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:fiery`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN, EXPLICIT_UNREPRESENTED_MEANING; missing ordinals []; missing/conflicting POS []. Literal burning boundary in 4600 is not yet represented; emotional intensity is a separate draft proposal.
- `NORMALIZED_HEADWORD:pedestrian`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:hygiene`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:magnet`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:lightly`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:instrumental`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['NOUN']
- `NORMALIZED_HEADWORD:kin`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:forward`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['PREPOSITION']
- `NORMALIZED_HEADWORD:intermittent`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:guilty`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['NOUN']
- `NORMALIZED_HEADWORD:million`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['NOUN']
- `NORMALIZED_HEADWORD:thus`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['CONJUNCTION']
- `NORMALIZED_HEADWORD:unlike`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['ADJECTIVE']
- `NORMALIZED_HEADWORD:wizard`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:warp`: NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN; missing ordinals []; missing/conflicting POS []
- `NORMALIZED_HEADWORD:including`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['ADJECTIVE']
- `NORMALIZED_HEADWORD:therefore`: SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING; missing ordinals []; missing/conflicting POS ['CONJUNCTION']

## Corrections and source evidence

Three additive field overlays preserve every original manuscript: singular all-degree example and its Vietnamese translation; explicitly qualified avoirdupois-pound grammar. All Senses in batches 082 and 099 were rereviewed. Prior correction ledgers remain byte-identical. Full-page Cambridge opens for weave/ton/turbine/withdrawal failed with 403; only actual search-returned text and pinned local source evidence are claimed. Detailed corroboration and limits are in authored/fact-verification.json.

## Terminal boundary and preservation

Checkpoint 05 has nextCheckpointNumber=null and no pending keys. The unchanged generic report.md contains historical continuation boilerplate mentioning checkpoint 6; it is inapplicable here, and the CLI rejects checkpoint 6. Do not run it or select another cohort. The authoritative terminal state and this handoff supersede that generic continuation text.

STOP after publication of this handoff. Proposed next phase: 2H.2I — Aggregate QA and Sense Coverage Audit, requiring separate authorization. No formal approval cycle or database import is authorized.

Checkpoints 01–04, prior 1,390 records, all correction/QA history and Hybrid-100 2.2.1 (87 Lexemes / 100 Senses) remain pinned. One regression-test source exception replaces an obsolete future-checkpoint absence assertion with a real read-only before/after hash check. Generic generation/sealing and prior handoff sources remain unchanged.

All content remains DRAFT, rights UNKNOWN_REVIEW_REQUIRED, canonical IDs and runtime mappings unresolved. No Neon/DB access or writes, Master release or legacy changes, or Production operations. External tests, command results and Git safety are separately recorded only after execution in verification-results.json.
