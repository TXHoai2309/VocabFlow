#!/usr/bin/env python3
"""Offline evidence ledger; never creates Master records, identities or mappings."""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import itertools
import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe"
LEGACY = ROOT / "vocabflow-dataset/workspaces/legacy-master-expansion-planning"
RELEASE = ROOT / "vocabflow-dataset/releases/hybrid-100-v2.2.1"
WORKSPACE = ROOT / "vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation"
REPORT = ROOT / "vocabflow-dataset/reports/full-master-expansion-candidate-preparation.md"
BASELINE = "6a1fe9889162cfec3e7bc102aa64a84da2b1bc73"
INPUT_FINGERPRINT = "58928e98845e326f8d9a268aa160c867443e8497436d9c58fa2b9a5647f10a53"
RELEASE_HASH = "44874b11d1fdef76a515f6285d04c9a417318daa6969e112608a59e7c232613c"
RELEASE_TREE = "51ab4c5ce31bd38b51742d1aea16602150522da27ad26c123cc17b332f9a406e"
AUTHORIZATION = {key: False for key in ["masterIds", "masterAuthoring", "masterApply", "runtimeMapping", "relationshipMigration", "disable", "delete", "mediaPublishing", "databaseAccess", "databaseWrite", "production"]}
RIGHTS = "UNKNOWN_REVIEW_REQUIRED"
DECISIONS = ["REUSE_EXISTING_IDENTITY_WITH_PROOF", "PROPOSE_NEW_LEXEME", "PROPOSE_NEW_SENSE_UNDER_EXISTING_LEXEME", "REQUEST_MORE_EVIDENCE", "EXCLUDE_OR_DEFER_BATCH"]
GAPS = ["ORIGINAL_ENGLISH_DEFINITION_REQUIRED", "ORIGINAL_ENGLISH_EXAMPLE_REQUIRED", "VIETNAMESE_TRANSLATION_VERIFICATION_REQUIRED", "PRONUNCIATION_VERIFICATION_REQUIRED", "AUTHORSHIP_PROVENANCE_REQUIRED", "RIGHTS_REVIEW_REQUIRED"]


def load(path):
    return json.loads(path.read_text(encoding="utf-8"))


def canonical(value):
    # Same inventory canonicalization; planning output contains no float values.
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")


def digest(value):
    return hashlib.sha256(canonical(value)).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def inventory_module():
    spec = importlib.util.spec_from_file_location("phase2h1", ROOT / "scripts/phase-2h1-source-inventory.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def checked_inputs():
    inv = inventory_module()
    data = {name: load(INPUT / name) for name in inv.ARTIFACT_NAMES}
    require(inv.inventory_fingerprint(data) == INPUT_FINGERPRINT, "Phase 2H.1 input drift")
    manifest = load(INPUT / "manifest.json")
    require(manifest["acceptedInventoryFingerprint"] == INPUT_FINGERPRINT, "Manifest fingerprint drift")
    require(not any(manifest["authorization"].values()), "Input authorization drift")
    release = load(RELEASE / "dataset.json")
    require(release["status"] == "APPROVED" and release["releaseHash"] == RELEASE_HASH, "Release pin drift")
    require(len(release["includedLexemes"]) == 87 and len(release["includedSenses"]) == 100, "Hybrid counts drift")
    require(digest({k: v for k, v in release.items() if k != "releaseHash"}) == RELEASE_HASH, "Release manifest hash drift")
    # Verify the exact pinned JSON records, including all accepted Senses.
    for pins in [v for k, v in release.items() if k.startswith("included")]:
        for pin in pins:
            path = (RELEASE / pin["recordPath"]).resolve()
            require(path.is_relative_to(RELEASE.resolve()), "Unsafe release record path")
            require(digest(load(path)) == pin["contentHash"], "Release record hash drift")
    legacy_manifest = load(LEGACY / "manifest.json")
    require(legacy_manifest["fingerprint"] == "d60ea07432633de6ab4bb0516ce9401252c6d03982c77710f0b2a71c0968ac09", "Legacy planning pin drift")
    disposition = load(LEGACY / "content-disposition.json")
    require(digest(disposition["rows"]) == legacy_manifest["evidenceHashes"]["rows"], "Legacy disposition drift")
    require(len(disposition["rows"]) == 2018, "Legacy count drift")
    require(sum(row["learnerHistoryProtected"] for row in disposition["rows"]) == 75, "History protection drift")
    snapshot = load(LEGACY / "content-snapshot.json")
    require(digest(snapshot) == legacy_manifest["evidenceHashes"]["snapshot"], "Legacy snapshot drift")
    checkpoint = snapshot["hybridCheckpoint"]
    require(checkpoint["hybridMasterMappings"] == 100 and checkpoint["orphanMappingCount"] == 0 and not checkpoint["mappingProblems"], "Hybrid checkpoint drift")
    require(checkpoint["runtime284MappingSenseId"] == checkpoint["expectedBookingMasterSenseId"] == "01a0fc13-09ef-7d37-a50f-d05db6b1a89c", "Runtime #284 identity drift")
    history11 = next(row for row in disposition["rows"] if row["runtimeVocabularyId"] == 11)
    require(history11["learnerHistoryProtected"] and history11["learnerProgressReferenceCount"] == 1 and history11["reviewEventReferenceCount"] == 5, "Runtime #11 history drift")
    cross = data["cross-source-overlap.json"]["summary"]
    for key, expected in {"exactNormalizedHeadwordOverlap": 3512, "unionUniqueNormalizedHeadwords": 6143, "ambiguousHumanReviewGroupCount": 4170, "possiblePolysemyGroupCount": 2191, "posConflictHeadwordGroups": 61, "cefrConflictHeadwordGroups": 96}.items():
        require(cross[key] == expected, "Source accounting drift: " + key)
    pins = {"remoteBaseline": BASELINE, "phase2h1Fingerprint": INPUT_FINGERPRINT,
            "phase2h1EvidenceBase": INPUT.relative_to(ROOT).as_posix(),
            "legacyEvidenceBase": LEGACY.relative_to(ROOT).as_posix(),
            "hybridReleaseBase": RELEASE.relative_to(ROOT).as_posix(),
            "phase2g3cFingerprint": legacy_manifest["fingerprint"], "hybridReleaseHash": RELEASE_HASH,
            "hybridReleaseTreeExpected": RELEASE_TREE, "releaseTreeVerification": "EXTERNAL_COMMAND_REQUIRED",
            "inputArtifactCanonicalHashes": {name: digest(value) for name, value in sorted(data.items())},
            "legacyDispositionCanonicalHash": digest(disposition),
            "legacySnapshotCanonicalHash": digest(snapshot),
            "historicalHybridCheckpoint": {"scope": "PINNED_OFFLINE_CAPTURE; NOT_A_LIVE_DATABASE_RECHECK", "mappingCount": checkpoint["hybridMasterMappings"], "runtime284SenseReference": checkpoint["runtime284MappingSenseId"]},
            "schemaCanonicalHashes": {p.name: digest(load(p)) for p in sorted((ROOT / "vocabflow-dataset/schemas").glob("*.json"))}}
    return data, disposition["rows"], pins


def materialization_blockers(group, decision="UNRESOLVED", identity_proof=False, rights_cleared=False, content_verified=False, authorized=False):
    """Future prerequisite evaluation only; no writer exists in this tool."""
    blockers = []
    if decision not in DECISIONS or decision in ["REQUEST_MORE_EVIDENCE", "EXCLUDE_OR_DEFER_BATCH"]:
        blockers.append("OWNER_IDENTITY_DECISION_REQUIRED")
    if not identity_proof:
        blockers.append("LEXEME_AND_SENSE_IDENTITY_PROOF_REQUIRED")
    if not rights_cleared:
        blockers.append("RIGHTS_DISPOSITION_REQUIRED")
    if not content_verified:
        blockers.append("ORIGINAL_CONTENT_AND_PROVENANCE_VERIFICATION_REQUIRED")
    if not authorized:
        blockers.append("SEPARATE_AUTHORING_AUTHORIZATION_REQUIRED")
    return blockers


def make_group(source, records, master, legacy_rows, review_keys, coverage_refs):
    key = source["candidateGroupKey"]
    refs = []
    for corpus, filename, ids in [("OXFORD_5000", "oxford-normalized-inventory.json", source["oxfordSourceRecordIds"]), ("ENGLISH_VOCAB_4600", "vocab4600-normalized-inventory.json", source["vocab4600SourceRecordIds"])]:
        for note_id in ids:
            row, index = records[corpus][note_id]
            require(row["normalizedHeadword"] == source["normalizedHeadword"], "Source group mismatch")
            refs.append({"corpus": corpus, "artifact": filename, "recordIndex": index,
                         "sourceRecordId": note_id, "sourceNoteGuid": row["sourceNoteGuid"],
                         "recordEvidenceSha256": row["recordEvidenceSha256"],
                         "rawPosEvidencePointer": f"/records/{index}/sourcePosRaw",
                         "rawHeadwordEvidencePointer": f"/records/{index}/rawHeadword",
                         "normalizedPosCandidates": row["sourcePosClassesCandidate"],
                         "cefrEvidence": row["sourceCefrEvidence"],
                         "structuredOxfordSenseGroupOrdinals": [g["sourceGroupOrdinal"] for g in row["candidateSourceSenseGroups"]],
                         "rawContentPointer": f"/records/{index}/sourceFields"})
    flags = list(source["identityEvidence"])
    pos = sorted({p for ref in refs for p in ref["normalizedPosCandidates"]})
    statuses = ["SOURCE_EVIDENCE_ONLY", "LEXEME_REVIEW_REQUIRED", "CONTENT_AUTHORING_REQUIRED", "RIGHTS_REVIEW_REQUIRED"]
    if "POSSIBLE_POLYSEMY" in flags or len(pos) > 1:
        statuses.append("SENSE_SPLIT_REVIEW_REQUIRED")
    if source["sourcePosConflict"] or not pos or "NUMBER" in pos or len(pos) > 1:
        statuses.append("POS_REVIEW_REQUIRED")
    # A source CEFR value is evidence, never a verified Sense classification.
    statuses.append("CEFR_REVIEW_REQUIRED")
    if master["masterLexemeIdCandidate"]:
        statuses.append("EXISTING_MASTER_IDENTITY_REVIEW")
    legacy_refs = [{"runtimeVocabularyId": r["runtimeVocabularyId"], "historyProtected": r["learnerHistoryProtected"],
                    "progressCount": r["learnerProgressReferenceCount"], "reviewCount": r["reviewEventReferenceCount"],
                    "savedWordCount": r["savedVocabularyReferenceCount"], "topicCount": len(r["topics"]),
                    "learningSetCount": len(r["learningSets"]), "sourceIdentityObligation": r["sourceIdentityObligation"],
                    "semanticReviewDisposition": r["semanticReviewDisposition"], "ownerReviewedExclusionCount": r["ownerReviewedExclusionCount"],
                    "phase2h1CoverageCategory": coverage_refs[r["runtimeVocabularyId"]][1]["coverageCategory"],
                    "phase2h1CoveragePointer": f"legacy-source-coverage-readonly.json#/rows/{coverage_refs[r['runtimeVocabularyId']][0]}",
                    "identityEvidencePointer": f"content-disposition.json#/rows/{i}", "identityClaim": "NONE"}
                   for i, r in legacy_rows]
    dimensions = {
        "EXISTING_MASTER_LEMMA": bool(master["masterLexemeIdCandidate"]),
        "LEGACY_HISTORY": any(r["historyProtected"] for r in legacy_refs),
        "LEGACY_PRODUCT": any(r["topicCount"] or r["learningSetCount"] for r in legacy_refs),
        "BOTH_SOURCE_CLEAN_LEXICAL": bool(source["normalizedHeadwordMatch"] and source["candidateSamePosValues"] and not source["sourcePosConflict"] and not source["sourceCefrConflicts"]),
        "OXFORD_ONLY": bool(source["oxfordSourceRecordIds"] and not source["vocab4600SourceRecordIds"]),
        "VOCAB4600_ONLY": bool(source["vocab4600SourceRecordIds"] and not source["oxfordSourceRecordIds"]),
        "POS_CONFLICT": source["sourcePosConflict"], "CEFR_CONFLICT": source["sourceCefrConflicts"],
        "POSSIBLE_POLYSEMY": "POSSIBLE_POLYSEMY" in flags,
        "MULTIWORD_PHRASAL": "MULTIWORD_OR_PHRASAL_VERB" in flags,
        "SOURCE_DUPLICATES": len(source["oxfordSourceRecordIds"]) > 1 or len(source["vocab4600SourceRecordIds"]) > 1,
        "RIGHTS_GAP": True, "CONTENT_GAP": True}
    complex_review = any(dimensions[k] for k in ["POS_CONFLICT", "CEFR_CONFLICT", "POSSIBLE_POLYSEMY", "MULTIWORD_PHRASAL"])
    partition = next((k for k in ["EXISTING_MASTER_LEMMA", "LEGACY_HISTORY", "LEGACY_PRODUCT"] if dimensions[k]), None)
    if not partition:
        partition = "COMPLEX_REVIEW" if complex_review else next(k for k in ["BOTH_SOURCE_CLEAN_LEXICAL", "OXFORD_ONLY", "VOCAB4600_ONLY"] if dimensions[k])
    return {"candidateGroupKey": key, "normalizedHeadword": source["normalizedHeadword"],
            "displaySpellings": sorted({records[ref["corpus"]][ref["sourceRecordId"]][0]["headwordText"] for ref in refs}),
            "sourceMembership": sorted({ref["corpus"] for ref in refs}), "sourceEvidence": refs,
            "normalizedPosCandidates": pos, "reviewFlags": flags,
            "phase2h1ReviewQueueMember": key in review_keys,
            "masterLemmaCandidates": {"lexemeIdReference": master["masterLexemeIdCandidate"], "senseIdReferences": master["masterSenseIdCandidatesSameLemma"], "identityClaim": "NONE"},
            "legacyCoverageEvidence": legacy_refs, "sourceRights": {"text": RIGHTS, "media": RIGHTS},
            "readinessStates": statuses, "requiredEditorialActions": statuses[1:],
            "candidateDisposition": "CANDIDATE_READY_FOR_EDITORIAL_REVIEW", "ownerDecision": "UNRESOLVED",
            "lexemeIdentity": "UNRESOLVED", "senseIdentity": "UNRESOLVED", "masterIdsAllocated": 0,
            "priorityDimensions": dimensions, "processingPartition": partition,
            "contentGaps": GAPS, "materializationBlockers": materialization_blockers(None)}


def choose_pilot(groups):
    selected = {}
    quotas = []
    def select(name, target, predicate):
        eligible = [g for g in groups if predicate(g)]
        available = [g for g in eligible if g["candidateGroupKey"] not in selected]
        chosen = available[:target]
        for g in chosen:
            selected[g["candidateGroupKey"]] = {"candidateGroupKey": g["candidateGroupKey"], "selectionStratum": name}
        quotas.append({"stratum": name, "target": target, "eligible": len(eligible), "availableAfterEarlierStrata": len(available), "selected": len(chosen), "shortfall": max(0, target-len(chosen))})
    select("PROTECTED_STRUCTURAL_PATTERNS", 5, lambda g: g["normalizedHeadword"] in ["bank", "record", "light", "run", "water"])
    for name in ["EXISTING_MASTER_LEMMA", "LEGACY_HISTORY", "LEGACY_PRODUCT", "POS_CONFLICT", "CEFR_CONFLICT", "MULTIWORD_PHRASAL", "POSSIBLE_POLYSEMY", "OXFORD_ONLY", "VOCAB4600_ONLY"]:
        select(name, 10, lambda g, name=name: g["priorityDimensions"][name])
    select("STRAIGHTFORWARD_BOTH_SOURCE", 100-len(selected), lambda g: g["priorityDimensions"]["BOTH_SOURCE_CLEAN_LEXICAL"] and not any(g["priorityDimensions"][k] for k in ["POSSIBLE_POLYSEMY", "MULTIWORD_PHRASAL", "SOURCE_DUPLICATES"]))
    if len(selected) < 100:
        select("DETERMINISTIC_REMAINDER", 100-len(selected), lambda g: True)
    require(len(selected) == 100, "Pilot quota cannot be satisfied")
    return list(selected.values()), quotas


def build():
    data, disposition, pins = checked_inputs()
    records = {}
    for corpus, file in [("OXFORD_5000", "oxford-normalized-inventory.json"), ("ENGLISH_VOCAB_4600", "vocab4600-normalized-inventory.json")]:
        records[corpus] = {r["sourceRecordId"]: (r, i) for i, r in enumerate(data[file]["records"])}
    master = {r["normalizedHeadword"]: r for r in data["master-coverage-readonly.json"]["sourceNormalizedHeadwordGroups"]}
    legacy = defaultdict(list)
    coverage = {r["runtimeVocabularyId"]: r for r in data["legacy-source-coverage-readonly.json"]["rows"]}
    coverage_refs = {r["runtimeVocabularyId"]: (i, r) for i, r in enumerate(data["legacy-source-coverage-readonly.json"]["rows"])}
    for i, row in enumerate(disposition):
        legacy[coverage[row["runtimeVocabularyId"]]["normalizedHeadwordComparisonKey"]].append((i, row))
    review_keys = {r["candidateGroupKey"] for r in data["sense-review-queue.json"]["groups"]}
    sources = sorted(data["lexical-candidate-groups.json"]["groups"], key=lambda r: r["normalizedHeadword"])
    groups = [make_group(s, records, master[s["normalizedHeadword"]], legacy[s["normalizedHeadword"]], review_keys, coverage_refs) for s in sources]
    keys = {g["candidateGroupKey"] for g in groups}
    require(len(groups) == len(keys) == 6143, "Ledger duplicates or missing groups")
    require(review_keys <= keys and sum(g["phase2h1ReviewQueueMember"] for g in groups) == 4170, "Review queue lost")
    for corpus, source_records in records.items():
        refs = [r["sourceRecordId"] for g in groups for r in g["sourceEvidence"] if r["corpus"] == corpus]
        require(len(refs) == len(set(refs)) == len(source_records) and set(refs) == set(source_records), "Source record accounting failure")
    pilot, quotas = choose_pilot(groups)
    by_key = {g["candidateGroupKey"]: g for g in groups}
    dimensions = list(groups[0]["priorityDimensions"])
    dimensions_count = {d: sum(g["priorityDimensions"][d] for g in groups) for d in dimensions}
    intersections = {a+" + "+b: sum(g["priorityDimensions"][a] and g["priorityDimensions"][b] for g in groups) for a, b in itertools.combinations(dimensions, 2)}
    all_legacy_ids = {r["runtimeVocabularyId"] for r in disposition}
    linked_ids = {r["runtimeVocabularyId"] for g in groups for r in g["legacyCoverageEvidence"]}
    protected_ids = sorted(r["runtimeVocabularyId"] for r in disposition if r["learnerHistoryProtected"])
    special = [{"runtimeVocabularyId": r["runtimeVocabularyId"], "semanticReviewDisposition": r["semanticReviewDisposition"], "historyProtected": r["learnerHistoryProtected"],
                "ownerReviewedExcludedSenseIds": [c["masterSenseId"] for c in r["masterCandidates"] if c.get("ownerReviewedRelation") == "OWNER_REVIEWED_NOT_SAME_IDENTITY"], "identityClaim": "NONE"}
               for r in disposition if r["runtimeVocabularyId"] in [11, 295, 849] or r["ownerReviewedExclusionCount"]]
    owner = []
    for selection in pilot:
        g = by_key[selection["candidateGroupKey"]]
        owner.append({"candidateGroupKey": g["candidateGroupKey"], "normalizedHeadword": g["normalizedHeadword"],
                      "sourceEvidenceSummary": {"corpora": g["sourceMembership"], "noteCount": len(g["sourceEvidence"]), "structuredOxfordGroupCount": sum(len(r["structuredOxfordSenseGroupOrdinals"]) for r in g["sourceEvidence"]), "evidenceRef": "full-master-expansion-candidate-ledger.json#"+g["candidateGroupKey"]},
                      "candidateLexemeRelationship": "EXISTING_LEMMA_REVIEW_ONLY" if g["masterLemmaCandidates"]["lexemeIdReference"] else "PROPOSE_NEW_LEXEME_SUBJECT_TO_IDENTITY_REVIEW",
                      "proposedSenseSplitRationale": {"status": "UNRESOLVED", "posCandidates": g["normalizedPosCandidates"], "reviewSignals": g["reviewFlags"], "rule": "Inspect every pinned source sense-group context; POS differences and group counts are review signals, not approved meaning counts."},
                      "existingMasterIdentityConsiderations": g["masterLemmaCandidates"], "originalContentRequirements": GAPS,
                      "requiredPosCefrReview": {"pos": g["normalizedPosCandidates"], "cefr": [r["cefrEvidence"] for r in g["sourceEvidence"]], "classificationDecision": "UNRESOLVED"},
                      "provenanceAvailability": "PINNED_SOURCE_NOTE_GUID_RECORD_HASH_AND_GROUP_ORDINAL; AUTHORSHIP_PROVENANCE_NOT_CREATED",
                      "rightsStatus": RIGHTS, "decisionOptions": DECISIONS, "ownerDecision": "UNRESOLVED", "materializationEligible": False})
    require(all(g["ownerDecision"] == "UNRESOLVED" and g["lexemeIdentity"] == "UNRESOLVED" and g["senseIdentity"] == "UNRESOLVED" and g["masterIdsAllocated"] == 0 for g in groups), "Identity approval appeared")
    require(all(g["sourceRights"] == {"text": RIGHTS, "media": RIGHTS} for g in groups), "Rights clearance appeared")
    require(all(g["ownerDecision"] == "UNRESOLVED" and not g["materializationEligible"] for g in owner), "Pilot approval appeared")
    require(not any(AUTHORIZATION.values()), "Unauthorized planning operation")
    def wrap(payload):
        return {"phase": "2H.2A", "artifactType": "OFFLINE_EDITORIAL_PLANNING", "inputPins": pins, "authorization": AUTHORIZATION, **payload}
    artifacts = {
        "full-master-expansion-candidate-ledger.json": wrap({"groupCount": len(groups), "groups": groups}),
        "candidate-classification-summary.json": wrap({"overlappingDimensions": dimensions_count, "pairwiseIntersections": intersections,
            "disjointProcessingPartition": dict(sorted(Counter(g["processingPartition"] for g in groups).items())),
            "partitionPrecedence": ["EXISTING_MASTER_LEMMA", "LEGACY_HISTORY", "LEGACY_PRODUCT", "COMPLEX_REVIEW", "BOTH_SOURCE_CLEAN_LEXICAL", "OXFORD_ONLY", "VOCAB4600_ONLY"],
            "cleanLexicalMeaning": "Both source records with compatible POS and no POS/CEFR conflict; does not imply Sense/content/rights readiness.",
            "legacyDependencies": {"linkedRuntimeRows": len(linked_ids), "unmatchedRuntimeRows": len(all_legacy_ids-linked_ids), "historyProtectedRuntimeIds": protected_ids,
                "phase2h1CoverageCategoryCounts": data["legacy-source-coverage-readonly.json"]["coverageCategoryCounts"],
                "historyProtectedLinkedRows": len(set(protected_ids)&linked_ids), "historyProtectedUnmatchedRows": len(set(protected_ids)-linked_ids),
                "all2018RowsPreserved": True, "unmatchedIsInvalid": False}}),
        "lexeme-sense-identity-review.json": wrap({"unresolvedGroupCount": 6143, "rule": "normalizedHeadword != approved Lexeme != approved Sense",
            "reviewGroupKeys": sorted(review_keys), "protectedLegacyCases": special,
            "runtime284": {"status": "OUTSIDE_LEGACY; ACCEPTED_MASTER_MAPPING_UNCHANGED", "operation": "NONE", "senseReference": pins["historicalHybridCheckpoint"]["runtime284SenseReference"]},
            "existingMasterReferenceScope": "87 lemma overlaps only; 100 approved Senses untouched; no candidate proves identity",
            "normalizationBoundary": "Source NFC/casefold preserved; approved Master NFKC-LOWER-EN-1 not rewritten or treated as equivalent identity policy"}),
        "pilot-cohort.json": wrap({"pilotSize": len(pilot), "selectionRule": "Sorted normalized headwords; ordered strata reserve first available distinct groups; no randomness", "quotaResults": quotas,
            "overlappingStrataCounts": {d: sum(by_key[p["candidateGroupKey"]]["priorityDimensions"][d] for p in pilot) for d in dimensions}, "groups": pilot}),
        "pilot-owner-review.json": wrap({"status": "READY_FOR_OWNER_REVIEW; NO_APPROVALS", "decisionSemantics": "Options propose future authoring; a filled decision alone never authorizes identity allocation, runtime mapping or release publication", "groups": owner}),
        "authoring-readiness.json": wrap({"editorialReviewableGroups": 6143, "ownerApprovedForAuthoring": 0, "currentlyMaterializableGroups": 0,
            "pilotCurrentlyMaterializableGroups": 0, "unresolvedIdentityGroups": 6143, "hardGates": materialization_blockers(None),
            "readinessStateSemantics": {
                "SOURCE_EVIDENCE_ONLY": "Pinned source observations; no canonical learner-facing content",
                "LEXEME_REVIEW_REQUIRED": "Determine lexical identity independently from normalized spelling",
                "SENSE_SPLIT_REVIEW_REQUIRED": "Compare POS and source meaning contexts; split count and identity unresolved",
                "POS_REVIEW_REQUIRED": "Resolve conflicting, missing, multiple or unsupported candidate POS values",
                "CEFR_REVIEW_REQUIRED": "Verify source evidence for each proposed Sense; no automatic classification",
                "CONTENT_AUTHORING_REQUIRED": "Original verified learner-facing content and genuine authorship provenance required for new Senses",
                "RIGHTS_REVIEW_REQUIRED": "Local source availability does not establish reuse/redistribution permission",
                "EXISTING_MASTER_IDENTITY_REVIEW": "Existing lemma candidates are references only; proof required before reuse",
                "CANDIDATE_READY_FOR_EDITORIAL_REVIEW": "Evidence can be reviewed; identity, rights, authoring and release gates remain unresolved",
                "OWNER_APPROVED_FOR_AUTHORING": "Not assigned in this phase; future explicit owner decision plus separate authoring authorization required"},
            "futureMaterializationContract": {"schemas": ["lexeme.schema.json", "sense.schema.json", "common.schema.json#/$defs/classification", "provenance.schema.json", "taxonomy.schema.json", "learning-set.schema.json", "dataset.schema.json"],
                "identity": "Allocate UUIDv7 once in separately authorized authoring; never derive Master ID from candidate key", "revision": "Append immutable revisions; pin exact paths and canonical hashes; do not overwrite accepted release",
                "content": "Original verified definitions/examples and translations with genuine authorship provenance; source-derived reuse needs established permission", "classification": "Independent Sense-level dimensions; no CEFR default, grade conversion or inferred exams", "media": "No promotion"}}),
        "rights-content-gap-summary.json": wrap({"textRights": RIGHTS, "mediaRights": RIGHTS, "rightsBlockedGroups": 6143,
            "gaps": {g: 6143 for g in GAPS}, "gapScope": "Requirements for any proposed new Sense; existing approved content can only be reused after proven identity and separately authorized decision",
            "sourceLimitations": {"OXFORD_5000": "NO_EXPLICIT_CANONICAL_ENGLISH_DEFINITION_FIELD", "ENGLISH_VOCAB_4600": "MIXED_MEANING_HEURISTIC_TEXT_NOT_VETTED"},
            "sourceMediaPromoted": 0, "contentCopiedIntoMaster": 0, "classificationGaps": ["CEFR_REVIEW", "DIFFICULTY_RUBRIC", "AGE_GROUP_EVIDENCE", "CURRICULUM_SCHOOL_LEVEL", "TOPIC_DOMAIN_REVIEW", "EXAM_EVIDENCE", "LEARNING_SET_SELECTION_PROVENANCE"]}),
        "validation-summary.json": wrap({"status": "PASS", "statusScope": "COMPUTED_OFFLINE_PLANNING_CHECKS_ONLY", "computedChecks": {"groupCount": len(groups), "missingGroups": len({s["candidateGroupKey"] for s in sources}-keys), "duplicateKeys": len(groups)-len(keys), "sourceRecordsReferencedExactlyOnce": sum(len(g["sourceEvidence"]) for g in groups),
            "reviewQueueCoverage": len(review_keys & keys), "pilotValidUniqueGroups": len({p["candidateGroupKey"] for p in pilot}), "pilotUnresolvedDecisions": sum(g["ownerDecision"] == "UNRESOLVED" for g in owner), "masterPinnedRecordsVerified": True, "protectedHistoryRuntimeIds": len(protected_ids),
            "masterIdsAllocated": 0, "runtimeIdsAllocated": 0, "runtimeMappingsCreated": 0, "mediaPublished": 0, "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED"},
            "externalVerification": {"status": "NOT_EXECUTED_BY_GENERATOR", "evidenceLocation": "docs/ai-progress.md#phase-2h2a-candidate-preparation-2026-10-08",
                "requiredCommands": ["python -B scripts/phase-2h2a-master-expansion-test.py", "node node_modules/typescript/bin/tsc -b", "node node_modules/eslint/bin/eslint.js . --max-warnings=0", "node node_modules/tsx/dist/cli.mjs scripts/hybrid-100-runtime-eligible-patch-release.ts --check"]}})}
    fingerprint = digest(artifacts)
    artifacts["manifest.json"] = wrap({"fingerprint": fingerprint, "fingerprintMethod": "SHA256_UTF8_SORTED_KEYS_COMPACT_JSON_ALL_ARTIFACTS_EXCLUDING_MANIFEST; NO_VOLATILE_TIMESTAMPS",
                                       "artifactCanonicalHashes": {k: digest(v) for k, v in sorted(artifacts.items())}, "status": "READY_FOR_OWNER_REVIEW", "files": sorted(artifacts)})
    report = make_report(artifacts, fingerprint)
    return artifacts, report, fingerprint


def make_report(artifacts, fingerprint):
    summary = artifacts["candidate-classification-summary.json"]
    pilot = artifacts["pilot-cohort.json"]
    lines = ["# Phase 2H.2A — full Master expansion candidate preparation", "", "Status: READY FOR OWNER REVIEW. Offline editorial planning only. No candidate identity approved; no canonical Master records authored.", "",
        f"Remote/local input baseline: `{BASELINE}`. Phase 2H.1 fingerprint: `{INPUT_FINGERPRINT}`.", f"Phase 2H.2A fingerprint: `{fingerprint}`.", "", "## Existing Master V2 materialization contract", "",
        "This ledger is evidence metadata, not a parallel Master schema. Future authored records must use the existing schemas and identity/versioning policy. Candidate group keys retain the accepted Phase 2H.1 keys; they are never UUIDs or Master entity IDs.", "",
        "| Concern | Existing representation and gate |", "|---|---|",
        "| Lexeme / Sense / polysemy | `lexeme.schema.json`: lexical form, language, lexicalUnitType, aliases; `sense.schema.json`: one teachable meaning owned by masterLexemeId. Multiple POS/meanings require review, not automatic splitting. |",
        "| POS | Sense partOfSpeechCode enum; source NUMBER has no direct enum counterpart and needs editorial review. |",
        "| CEFR / difficulty / age / grade / topic / domain / exam | common.schema.json classification: independent Sense assignments. CEFR valueCode + framework; difficulty numericValue 1–100 + scaleId; AGE_GROUP code; school/topic/domain/exam valueRef to controlled taxonomy. Grade is not CEFR. |",
        "| Pronunciation | Lexeme owner XOR Sense override; locale/accent/IPA, optional audioAssetId. Source IPA is unverified evidence. |",
        "| English definitions / Vietnamese translations / examples | Sense-owned immutable linguistic children; APPROVED children require nonblank text and provenanceIds. Example translations are distinct from lexical translations. Original authorship and editorial verification required. |",
        "| Provenance / source evidence / rights | provenance.schema.json supports sourceType, fieldPath, source URLs, license/attribution and authoredBy; it does not prove permission or model a full clearance workflow. Unknown rights remain in planning metadata; no LICENSED_SOURCE claim is fabricated. |",
        "| UUIDv7 / immutable revisions | Allocate once during authorized entity creation; never from spelling/hash. Stable identity + append-only lexemeRevision/senseRevision/classificationRevision; taxonomyVersion identifies immutable snapshots. |",
        "| Release pins | dataset.schema.json pins exact IDs/revisions/recordPath/contentHash; canonical releaseHash excludes only releaseHash. Never choose latest revision implicitly. |",
        "| Learning sets / taxonomy | learning-set.schema.json ordered Sense memberships with stable item IDs and selection provenance; taxonomy.schema.json catalogs frameworks/topics/domains/exams/curricula/schoolLevels/difficultyScales. Runtime relationship labels are evidence, not approved taxonomy mappings. |", "",
        "Contract sources: [Dataset README](../README.md), [schemas](../schemas/), [identity/versioning policy](../../docs/architecture/master-vocabulary-v2-identity-versioning-policy.md), [US-45](../../docs/stories/US-45-master-vocabulary-v2-runtime-import-bridge.md). Approved Hybrid-100 structural examples: light has distinct Sense-owned content/POS; water source noun evidence does not authorize the excluded runtime #11 / Master verb pair. No new sense definitions are inferred from spelling.", "",
        "## Full ledger and priorities", "", "6143 groups exactly once; 9677 source notes traceable by note ID/GUID, record hash, input artifact/index, raw field pointers and Oxford structured group ordinals. No raw definitions/examples/media payload is duplicated. Input artifact canonical hashes pin all evidence; resolve candidate keys by lookup, not JSON Pointer parsing.",
        "Source accounting remains Oxford 5004/5001/3; 4600 4673/4654/19; overlap 3512; source-only 1489/1142; union 6143. All 4170 accepted review groups remain indexed. Master lemma alignment 87 is not Sense identity proof.", "",
        "Overlapping dimensions (not a sum partition):", ""]
    lines += [f"- {k}: {v}" for k, v in summary["overlappingDimensions"].items()]
    lines += ["", "Disjoint processing partition: Master lemma overlap → legacy history → legacy product → complex review → clean both-source lexical evidence → Oxford-only → 4600-only. Within each partition sort normalized headwords. All 6143 are accounted for; lower priority never implies deletion or low relevance.", ""]
    lines += [f"- {k}: {v}" for k, v in summary["disjointProcessingPartition"].items()]
    dep = summary["legacyDependencies"]
    lines += ["", f"Legacy source-covered rows: {dep['linkedRuntimeRows']}; unmatched: {dep['unmatchedRuntimeRows']}. All 75 history-protected runtime IDs remain protected (covered {dep['historyProtectedLinkedRows']}, unmatched {dep['historyProtectedUnmatchedRows']}). Missing exact headwords do not invalidate legacy content. #11/#295/#849 and every owner-excluded pair retain identityClaim NONE; #284 remains outside legacy with its accepted mapping untouched.", "", "## Bounded pilot", "", "100 distinct headword groups. Stable reserved bank/record/light/run/water patterns first, then deterministic ordered quotas; earlier selections cannot be duplicated. Full strata/intersection evidence is in pilot-cohort.json. A shortage is reported and filled from the documented remainder, never fabricated.", "", "| Selection stratum | Target | Eligible | Selected | Shortfall |", "|---|---:|---:|---:|---:|"]
    lines += [f"| {q['stratum']} | {q['target']} | {q['eligible']} | {q['selected']} | {q['shortfall']} |" for q in pilot["quotaResults"]]
    lines += ["", "## Owner gate, content and safety", "", "Every pilot decision defaults to UNRESOLVED. Choices distinguish identity reuse with proof, proposed new Lexeme, new Sense under an existing Lexeme, more evidence, or batch deferral. Selection and readiness for editorial review do not authorize authoring. Currently materializable: 0; unresolved identities: 6143. Future authoring needs explicit identity proof, owner disposition, rights disposition, original verified content with provenance, then separate authoring authorization.",
        "Both corpus text/media rights remain UNKNOWN_REVIEW_REQUIRED. Oxford has no explicit canonical definition field; 4600 mixed Meaning text is heuristic evidence only. Gaps: English definitions/examples, verified Vietnamese translations/pronunciations, genuine authorship provenance, rights disposition, independent classifications. No media promotion. Existing approved content can only be reused after proven identity; gaps are future requirements, not claims that frozen content is missing.",
        "New Master data first → separately authorized Development apply → legacy relationship migration → evaluate cleanup. No live Neon access, runtime IDs/mappings, DB writes, Master authoring/apply, relationship changes, disable/delete, or Production operations. All authorization flags false.", "", "## Verification provenance", "",
        "Generated PASS covers computed ledger/accounting/pin checks only. External tests/typecheck/lint/frozen validator are NOT_EXECUTED_BY_GENERATOR. Exact executions are recorded [separately](../../docs/ai-progress.md#phase-2h2a-candidate-preparation-2026-10-08).",
        "Offline replay: `python -B scripts/phase-2h2a-master-expansion.py --check`. It reads accepted inputs and compares deterministic artifacts without writing or running external commands. Unknown CLI arguments are rejected. No timestamps participate in this fingerprint.", "", "Next: owner review of the materialization contract and pilot. No commit/push; Phase 2H.2B / 2H.3 not started.", ""]
    return "\n".join(lines)


def run(check=False):
    artifacts, report, fingerprint = build()
    expected = {WORKSPACE / k: json.dumps(v, ensure_ascii=False, indent=2)+"\n" for k, v in artifacts.items()}
    expected[REPORT] = report
    if check:
        changed = [p.relative_to(ROOT).as_posix() for p, content in expected.items() if not p.is_file() or p.read_text(encoding="utf-8") != content]
        require(not changed, "Artifact replay mismatch: " + ", ".join(changed))
    else:
        # Write only the dedicated workspace/report. Accepted inputs are never outputs.
        for p, content in expected.items():
            p.parent.mkdir(parents=True, exist_ok=True)
            if not p.is_file() or p.read_text(encoding="utf-8") != content:
                p.write_text(content, encoding="utf-8", newline="\n")
    return {"status": "PASS", "fingerprint": fingerprint, "groups": 6143, "pilot": 100, "mode": "CHECK" if check else "WRITE_PLANNING_ARTIFACTS", "artifactComparison": "PASS" if check else "NOT_EXECUTED", "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    print(json.dumps(run(args.check), indent=2))
