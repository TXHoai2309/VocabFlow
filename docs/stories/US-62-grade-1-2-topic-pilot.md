# US-62 — Grade 1–2 themed vocabulary pilot

- Status: `IN PROGRESS — EDITORIAL / RIGHTS PREFLIGHT`
- Owner: Project Owner
- Last updated: 2026-10-21
- Authority: Owner approved the 30-word, four-topic, learner-selected pilot and
  the full age-suitability/content/media review criteria in chat.
- Dependency: US-59 topic/grade consistency, US-61 set/topic discovery and the
  canonical content/media publication pipeline.

## Outcome

Learners of any age can optionally choose a small Grade 1–2 pilot made of
approximately 30 useful words across four familiar themes. Learners choose a
theme independently; no set order is enforced. Grade, CEFR and topic remain
separate labels and filters. This pilot is not aligned to a named textbook or
official school syllabus.

## Required content review

Each activated row must bind to an exact canonical vocabulary identity and pass
all of the following:

- A human editorial review finds the word concrete and suitable for the named
  Grade 1–2 group, without relying on CEFR as a grade proxy.
- The learner-facing Vietnamese meaning is short and accurate. The English
  example and Vietnamese translation are both short, natural and easy for a
  child to understand.
- The chosen topic already exists and is approved where possible. Create a new
  canonical topic only when an existing reviewed topic is a poor semantic fit.
- Every media asset shown has exact-byte provenance and usage rights for the
  paid product, CDN delivery and playback context. No Development `PROPOSED`,
  unknown-rights, or merely mapped asset may be shown as approved media.
- The item is checked in study as well as browse; grade and topic intersect and
  a zero-result scope stays empty instead of widening to the full catalog.

## Boundaries

No CEFR-to-grade inference, textbook alignment claim, forced sequence, automatic
learner assignment, progress migration, production operation, provider spend,
or publication of draft content. Existing topic IDs and source/media records
must not be approved just because a display label was changed.

## Acceptance

- AC1: The local review package identifies about 30 exact canonical word
  identities in four familiar reviewed topics, with explicit Grade 1 or Grade 2
  assignments and no forced ordering.
- AC2: Every proposed word has age review, a concise Vietnamese meaning and a
  short bilingual example tied to the exact vocabulary identity.
- AC3: Every learner-visible image/audio item has asset-level rights evidence
  and semantic review. Unsupported media is omitted and remains ineligible for
  the corresponding exercise.
- AC4: Only reviewed rows/topics become eligible for the catalog. Browse,
  topic, grade and study counts match; topic × grade uses intersection and no
  fallback.
- AC5: Existing assignments and learning history remain unchanged; the pilot
  does not force a set order.
- AC6: Owner can inspect the exact draft, source identities, review findings
  and media evidence before activation.

## Preflight evidence and current limit

The local V2 public index currently has 4,537 word IDs and 11 learning sets,
but exposes zero eligible topic facets and zero explicit grade assignments.
Sampled beginner candidates report `editorialStatus: DRAFT` and
`rightsStatus: UNKNOWN_REVIEW_REQUIRED`; their images are Development previews
and no published audio URL was present in the samples. Several familiar
child-level terms are not present in the active local V2 index. The separate
older curation allow-list contains age-suitability problems and verifies media
availability, not the asset-level commercial rights required here. It cannot
be promoted as this pilot.

US-57 currently has no enabled media provider or rights-cleared generated
assets. Its provider-term research explicitly does not grant rights to
individual assets. This story therefore remains at editorial/rights preflight;
no Grade 1–2 rows or topics have been added to the runtime catalog, and no
media or database was changed for this pilot.

## Next implementation gate

Prepare a source-bound draft of 30 candidates with original, reviewable
learner-facing copy and existing topic mappings. Keep it outside the runtime
until a canonical identity and rights-cleared media path are available for each
row. Then run the complete content review and local study-scope verification
before any activation command.
