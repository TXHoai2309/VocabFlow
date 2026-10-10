# Phase 2H.2K offline authoring contract

Authoritative UTF-8 LF manuscript: ten-field PSV, one row per proposed Sense:
headword | editorial slug | proposed POS | English label | English definition |
Vietnamese meaning | original English example | Vietnamese example translation |
English usage note | proposed display form. Unlike legacy PSV, field ten is display,
not a count of source cards or an inferred Sense ordinal. Pipe characters cannot
appear inside fields. Multiple rows for a group are permitted with distinct slugs.
NUMBER is a noncanonical source proposal requiring taxonomy review, not a new
approved Master POS. JSON is the assembled downstream projection.

Review PSV: headword | slug | PASS/REVIEW/FAIL | substantive Vietnamese explanation.
Review is a separate editorial second pass by the same assistant; it is not
independent human review or a separate-model review. Receipts bind exact manuscript,
review, source and record hashes. Review may persist; FAIL cannot seal.

Selection is immutable after --freeze; source references and raw working SHA256
pins are rechecked on replay. Seed/order and exact source balancing are recorded.
The available pool has no eligible remaining multiword phrases; whip (v) is an
annotation, not a phrase. No fabricated quota replacements are allowed.

--seal N only adds a new contiguous micro-batch receipt; it never rewrites text.
--assemble adds a new snapshot and rejects existing paths. --check recomputes
without writes. --resume-status shows the next incomplete micro-batch and stops
at checkpoint 01. Resume: author/review its exact frozen slice then --seal N.
Completed checkpoint 01: use --check and await checkpoint 02 authorization.

If a later cross-corpus scan finds an issue in a sealed manuscript, preserve it
and add a content-bound forward revision. The one current revision changes only
the neighbor example's Vietnamese wording; BEFORE/AFTER and source overlap
evidence remain visible. Replay does not generate prose or silently normalize
historical bytes. All new output bytes are raw UTF-8 LF; Git blob SHA256 and
working-file SHA256 are separately checked at publication.

All 1,563 inherited records and 40 corrections remain unchanged. New records have
explicit AI authorship, unknown rights, no approvals/UUIDs/runtime mappings.
Eight-word overlap screening of both full corpora is a heuristic, not a license
decision. Short conventional matches stay visible. No release or database access.
