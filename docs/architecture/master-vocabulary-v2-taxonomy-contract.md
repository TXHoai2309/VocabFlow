# VocabFlow Master Vocabulary V2 — Taxonomy Contract

**Status:** Phase 1 architecture baseline for owner review. Taxonomies are independent controlled dimensions over approved Master Senses. They do not replace the existing runtime `level` field and do not require app migrations in this task.

## 1. Shared contract

- CEFR, difficulty, age group, school curriculum/grade, topic, domain, exam, and Learning Set answer different questions.
- Store an approved assignment as a classification attached to a Sense unless a later requirement explicitly makes it Lexeme-wide.
- A classification has a stable assignment ID, dimension, typed value/reference, approval status, effective scope/version when relevant, and provenance for evidence claims.
- IDs are UUIDv7. Codes/labels/paths are lookup and display values, not identity. Retiring or renaming a code does not free its ID/code for reuse.
- Multiple assignments are supported where specified. “Unknown/unreviewed” is not the same as a broad catch-all value.
- Never infer one dimension from another. A CEFR level does not mechanically imply difficulty, age, school grade, exam, domain, topic, or set membership.
- Learning Set membership is curated collection membership, not a taxonomy assignment.

## 2. CEFR

| Property | Contract |
|---|---|
| Values | `PRE_A1`, `A1`, `A2`, `B1`, `B2`, `C1`, `C2`, in that explicit order. |
| Meaning | A proficiency-level claim for a particular Sense under an identified CEFR framework/source. It is not an intrinsic difficulty score or school grade. |
| Cardinality | Zero or more source claims may be retained. At most one approved primary level per Sense and framework/version. If multiple source/framework claims differ, keep them as separately sourced evidence and resolve the preferred projection explicitly. |
| Required evidence | Approved classification includes provenance for the framework/descriptor or a marked editorial assessment. Do not claim official CEFR alignment solely because an editor selected a band. |
| Validation | Exact controlled code; valid framework/version; referenced evidence resolves; level order uses the contract above; unknown values fail validation. |
| Runtime compatibility | Master-only initially. Do not put CEFR into current `vocabulary_level`, which currently means `GRADE_1`–`GRADE_5` or `GENERAL`. |

## 3. Difficulty

Difficulty is an editorial/calibration estimate for a defined learner context. It is independent of CEFR. A high-CEFR word may be familiar to one learner group, and an A1 word can still be hard for a particular age/language cohort.

| Property | Contract |
|---|---|
| Canonical score | Integer `difficultyScore` from **1 to 100**, with 1 easiest and 100 hardest for the named difficulty scale/profile. This provides enough resolution for later calibration while retaining a simple bounded data contract. Do not present the integer as measured precision until calibrated. |
| Scope | Every score refers to a versioned `difficultyScaleId`/profile that names the target learner context and rubric. Scores from different profiles or rubric versions are not directly comparable. |
| Labels | Display labels are derived, never independently persisted as a second truth: 1–20 `VERY_EASY`; 21–40 `EASY`; 41–60 `MEDIUM`; 61–80 `HARD`; 81–100 `VERY_HARD`. Boundary changes require a taxonomy-contract version change and a re-evaluation plan. |
| Cardinality | Zero or one approved active score per Sense and scale/profile. Keep prior score claims in history rather than overwriting them silently. |
| Calibration metadata | Keep scale ID, rubric version, score method (`EDITORIAL`, `PILOT_CALIBRATED`, `EMPIRICAL_MODEL`), sample/evidence summary where relevant, and calibration timestamp/model version when empirically calibrated. Do not mix an editorial score with a future psychometric estimate without preserving method and scale. |
| Validation | Integer range 1–100; scale/profile exists and is active; rubric version resolves; method-specific evidence is present. Missing difficulty is allowed and must not default from CEFR. |
| Runtime compatibility | Master-only initially; never overload current school-oriented `level`. |

The 1–100 scale is a normalized editorial score until learner-response data and an explicit calibration model exist. Calibration can refine score placement without changing its meaning or converting it into CEFR. If future empirical calibration uses a different statistical scale, store that estimate as a separately named, model-versioned measurement rather than silently reinterpreting historical 1–100 scores.

## 4. Age Group

| Property | Contract |
|---|---|
| Values | `KIDS`, `TEEN`, `ADULT`. |
| Meaning | Intended suitability/audience for the content, not the learner's actual profile or age. |
| Cardinality | Zero or more per Sense. A Sense may target multiple groups. |
| `ALL` | Do not store `ALL`. Derive an “all ages” display only when the approved assignments cover all three groups. No assignments means “not classified”, not ALL. |
| Validation | Exact controlled code; optional group-boundary definitions must be versioned when age ranges are eventually set. Prevent duplicate values on the same Sense. |
| Runtime compatibility | Master-only initially; it must not be placed in `level`. |

Exact age ranges for KIDS/TEEN/ADULT remain an owner decision. Until defined, these are editorial audience categories and should not be presented as hard age cutoffs or learner restrictions.

## 5. School Curriculum and Grade

| Property | Contract |
|---|---|
| Grade range | Numbered grades 1 through 12 are supported as values within a Curriculum. Other school systems may use stages/levels without a numeric grade and must not be forced into this range. |
| Scope | Every School Level belongs to a `curriculumId` containing jurisdiction/authority and, where available, edition. Grade 1 in one jurisdiction is not assumed to equal Grade 1 elsewhere. |
| Cardinality | Zero or more curriculum School Level assignments per Sense. A preferred level may be marked per curriculum/edition; multiple curriculum mappings may coexist. |
| Validation | School Level reference must resolve; if it is a numbered grade, `gradeNumber` is 1–12; curriculum and jurisdiction are required; source/provenance supports formal curriculum claims. |
| Runtime compatibility | Current app enum supports only Grades 1–5 plus `GENERAL`. Do not encode CEFR/difficulty/age/exam/domain into this field. Grade 6–12 requires a future app contract/schema decision if exposed at runtime. |

## 6. Topic hierarchy

| Property | Contract |
|---|---|
| Structure | Topic entities have stable `topicId`, localized labels/definition, code/slug, status, and optional `parentTopicId`. Parent links support arbitrary depth; “topic” and “subtopic” are views over the same node model, not two fixed columns. |
| Example | Food → Fruit → Citrus. Each arrow is `child.parentTopicId = parent.topicId`; `Fruit` is not a second kind of entity. |
| Cardinality | A Sense may have zero or many topic assignments. A Topic has zero or many children. Each Topic has at most one parent in this versioned tree contract. |
| Validation | Parent exists in same taxonomy; no self-parent or cycle; a code is unique in its namespace; no duplicate Sense–Topic assignment; retired topics cannot be newly assigned in an approved release. |
| Reparent/rename | If the topic concept is unchanged, keep `topicId` while updating its label/path with review history. If scope changes enough to represent a different concept, retire old topic and create a new ID with an explicit replacement relationship. |
| Runtime compatibility | Current app already has flat `topics` and many-to-many `vocabulary_topics`, but no parent field. Master hierarchy can be authored first. Runtime navigation to descendants would need an additive schema/API/UI change later. |

This contract is a tree with one parent per node. If future information architecture requires one concept in multiple parent branches, add an explicit polyhierarchy/alternate-placement model rather than duplicating the Topic identity.

## 7. Domain

Initial domain codes include:

- `GENERAL_ENGLISH`
- `ACADEMIC_ENGLISH`
- `BUSINESS_ENGLISH`
- `TRAVEL_ENGLISH`
- `IT_TECHNOLOGY`
- `HOSPITALITY`

Domains are extensible through governed taxonomy records, not a hardcoded forever enum. Each Domain has a stable `domainId`, nonrecycled code, localized labels/definition, optional parent domain, and status. A Sense may have zero or many approved Domain assignments; one may be marked primary where the UI needs a default. `GENERAL_ENGLISH` is an explicit broad usage label, not an automatic assignment to every Sense, and it may coexist with a specialized domain where editorially useful.

Validation checks domain reference, code uniqueness, parent-cycle absence, duplicate assignment, and approval. Adding Finance, Medical, or another domain is an additive taxonomy release. Domain tags do not imply topic, exam, audience, or Learning Set.

## 8. Exam

Initial exam-family codes include `IELTS`, `TOEIC`, `TOEFL`, `CAMBRIDGE`, and `VSTEP`; additional exams/tracks can be added as governed Exam records. Exam identity is separate from edition, track, authority, and exam family where needed.

| Property | Contract |
|---|---|
| Membership | A Sense may have zero or many Exam assignments, each linked to an `examId` and optional track/edition. |
| Relevance | Optional. If used, store a separately defined relevance scale/score, not CEFR or difficulty. Do not fabricate a relevance value when there is no reviewed evidence. |
| Evidence | Every assertion that a Sense is officially required/recommended by an exam must cite a matching syllabus, specification, or other approved source/edition in Provenance. Without it, label the assignment `EDITORIAL_RELEVANCE`/unverified and do not market it as official exam vocabulary. |
| Validation | Exam reference/edition resolves; assignment status is explicit; relevance scale/version and evidence are present if score is set; duplicates are rejected. |
| Compatibility | Exam data is Master-only initially. Current learning-set `name` or `description` can say “IELTS Foundation” but does not create structured exam membership. |

## 9. Learning Set

Learning Sets are curated, ordered collections that can combine any classification dimensions. They are not a taxonomy branch and do not own copies of Lexemes or Senses.

| Property | Contract |
|---|---|
| Examples | `First 100 Words`, `Grade 1 Starter`, `A1 Core`, `IELTS Foundation`, `Basic Fruits`. |
| Membership target | `masterSenseId`, because distinct meanings may have different instructional value. |
| Cardinality | Many Senses per set; one Sense may be in many sets. One `(learningSetId, masterSenseId)` membership per set; membership stores stable ID and explicit positive position. |
| Ordering | Position is unique within a set. Reorder changes Learning Set revision/order, not Sense identity/revision. |
| Metadata | Stable `learningSetId`, code, localized name/description, set kind, status, revision, sort order, and optional selection provenance. Name/grade/exam wording is not an implicit taxonomy assignment. |
| Validation | Set and Sense IDs resolve; approved sets contain only approved eligible Senses; duplicate pair and duplicate position fail; retired membership cannot be activated. |
| Runtime compatibility | Current `learning_set_items` is already many-to-many by vocabulary ID with order. Future transform maps Sense memberships to current app IDs; current `learning_sets.grade` remains only its existing nullable school/general enum. |

## 10. Cross-dimension validation rules

1. **No implication rules:** CEFR does not produce difficulty, age group, grade, exam, domain, topic, or set membership. Any assignment must be separately reviewed and sourced.
2. **Cardinality conflicts are scoped:** one primary CEFR value is selected per Sense/framework/version; many source claims can remain recorded. Difficulty has one active value per Sense/scale. Age group and topic/domain/exam/school memberships may be multiple as defined above.
3. **Unknown stays unknown:** missing CEFR is not Pre-A1; missing difficulty is not Medium; no audience assignment is not ALL; no school classification is not GENERAL; no exam membership is not a negative exam claim.
4. **Compatibility checks are warnings unless evidence establishes a rule:** a high difficulty score with A1, Grade 1 with a broad adult audience, or a specialized domain under GENERAL_ENGLISH may be valid. Flag for review; do not auto-correct or reject solely from a heuristic.
5. **Structural errors fail:** unresolved IDs, invalid codes, duplicate assignments, invalid grade number, topic/domain cycles, invalid parent scope, out-of-range score, retired references in an approved release, and unsupported enum values fail validation.
6. **Official claims need evidence:** CEFR descriptor alignment, curriculum mapping, and exam relevance must preserve provenance and edition. A label by itself is not proof of official status.
7. **Learning Sets remain independent:** membership must not be inferred from equal names or classification values. A Sense can be A1 and in A1 Core, but a different A1 set still requires its own membership decisions.

## 11. Example assignments for apple

For the fruit Sense of `apple`, a valid Master record could have CEFR `A1` with source/reviewer evidence; difficulty score `12` under a named scale/profile (derived display `VERY_EASY`); audience assignments `KIDS`, `TEEN`, `ADULT` so a UI may derive “all ages”; one explicit Grade 1 School Level under a named curriculum/jurisdiction; Topic assignments `Food` and child `Fruit`; Domain `GENERAL_ENGLISH`; no Exam assignment absent reviewed exam evidence; and membership in several independently ordered Learning Sets.

This combination is valid because each field answers a separate question. If evidence or editorial confidence changes, update that one assignment; do not rewrite the Sense ID or copy the Sense into each set.

## 12. Compatibility boundary

The app currently has a single nullable vocabulary `level` enum with `GRADE_1`–`GRADE_5` and `GENERAL`, a flat normalized Topic catalog plus a separate legacy free-text topic field, and many-to-many Topic and Learning Set membership. This contract retains those facts as a runtime compatibility boundary. Master v2 can carry full independent taxonomy assignments immediately; Neon receives only the supported legacy projection until a separately reviewed additive runtime change is authorized.
