#!/usr/bin/env python3
"""Offline, additive Phase 2H.2I checkpoint 07; judgments are persisted inputs."""
import argparse
import hashlib
import importlib.util
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


c6 = module("phase_2h2i_checkpoint06", Path(__file__).with_name("phase-2h2i-aggregate-qa-checkpoint-06.py"))
c5 = c6.c5
a = c6.a
CP06 = c6.WS
WS = CP06.parent / "checkpoint-07"
PIN = "5c80c010f6c83fee24614f07831a3016185471d8953e6a6aefa471e5f73e2766"
BASELINE = "c4f45c5265f73780a51ecfb7aacea76b7f53b965"
FROZEN = "2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44"
TOTAL_GROUPS = 500
PRIOR_ASSESSED = 417
NEW_TARGET = 83
CLASSES = {"CONFIRMED_GAP", "POSSIBLE_GAP", "SOURCE_METADATA_CONFLICT", "COVERAGE_UNKNOWN",
           "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP"}
AUTH = {
    "contentStatus": "DRAFT", "rights": "UNKNOWN_REVIEW_REQUIRED",
    "correctionsApplied": 0, "ownerApprovalsAdded": 0,
    "canonicalIdsAllocated": 0, "rightsClearanceAdded": 0,
    "databaseAccess": "NONE", "databaseWrites": "NONE",
    "production": "UNTOUCHED", "masterReleaseChanged": False,
    "legacyModified": False, "releaseFixApplied": False,
}
load, encode, sha, require, digest, ref = c5.load, c5.encode, c5.sha, c5.require, c5.digest, c5.ref
ORIGINAL_COVERAGE = c6.ORIGINAL_COVERAGE
DECISIONS = "authored/coverage-decisions-batch-007.json"
NOTES = "authored/coverage-assessment-notes-batch-007.json"
BOUNDARIES = "authored/new-boundary-proposals.json"
FIELD_PROPOSALS = "authored/new-field-correction-proposals.json"


def normalize_text_bytes(data):
    """Ignore only checkout CRLF conversion for newly produced text artifacts."""
    return data.replace(b"\r\n", b"\n")


def stable_sha(path):
    return hashlib.sha256(normalize_text_bytes(Path(path).read_bytes())).hexdigest()


def source_paths():
    return {
        "OXFORD_5000": ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe/oxford-normalized-inventory.json",
        "ENGLISH_VOCAB_4600": ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe/vocab4600-normalized-inventory.json",
    }


def source_data():
    return {key: load(path)["records"] for key, path in source_paths().items()}


def parent_state():
    replay = c6.run(True)
    require(replay["fingerprint"] == PIN and replay["zeroWrites"] is True,
            "Accepted checkpoint 06 replay drift or write")
    index = a.unique(load(a.WS / "effective-sense-index.json")["records"], "proposalKey")
    coverage = load(CP06 / "coverage-audit-cumulative.json")["groups"]
    summary = load(CP06 / "validation-summary.json")
    reviews = load(ROOT / summary["reviewHistoryReference"]["path"])["records"]
    grammar = load(ROOT / summary["grammarAuditReference"]["path"])
    require(len(index) == 1563 and len(coverage) == TOTAL_GROUPS, "Accepted inventory drift")
    require(sum(row["status"] == "ASSESSED" for row in coverage) == PRIOR_ASSESSED
            and sum(row["status"] == "PENDING" for row in coverage) == NEW_TARGET,
            "Checkpoint 06 coverage checkpoint drift")
    require(len(reviews) == 187 and sum(x["status"] == "TRIAGED" for x in reviews) == 187,
            "Accepted REVIEW history drift")
    require(grammar["dedicatedCandidateCount"] == 107 and not grammar["pendingDedicatedInspectionKeys"],
            "Accepted grammar audit drift")
    require(summary["totalFieldProposals"] == 140 and summary["totalBoundaryProposals"] == 8
            and summary["appliedCorrections"] == 0, "Accepted remediation history drift")
    return index, coverage, summary, reviews, grammar


def selection(index, coverage):
    original = load(ORIGINAL_COVERAGE)["groups"]
    require(len(original) == TOTAL_GROUPS, "Original 500-group coverage inventory drift")
    parent_by_key = a.unique(coverage, "candidateGroupKey")
    require([x["candidateGroupKey"] for x in coverage] == [x["candidateGroupKey"] for x in original],
            "Parent coverage order no longer matches accepted original order")
    selected = []
    for ordinal, original_row in enumerate(original):
        key = original_row["candidateGroupKey"]
        parent = parent_by_key[key]
        if parent["status"] != "PENDING":
            continue
        senses = [(pk, row) for pk, row in index.items() if row["candidateGroupKey"] == key]
        require(bool(senses), "Pending coverage group has no effective Sense: " + key)
        hashes = {pk: row["effectiveContentHash"] for pk, row in senses}
        selected.append({
            "candidateGroupKey": key,
            "originalGroupOrdinal": ordinal,
            "effectiveProposalKeys": list(hashes),
            "effectiveContentHashes": hashes,
            "sourceEvidenceReferences": [
                {"proposalKey": pk, "sourceEvidence": row["sourceEvidence"]} for pk, row in senses
            ],
            "originalWarnings": original_row["originalWarningRecord"]["warnings"],
            "parentCheckpointFingerprint": PIN,
            "selectionOrder": len(selected) + 1,
        })
    require(len(selected) == NEW_TARGET and len({x["candidateGroupKey"] for x in selected}) == NEW_TARGET,
            "Checkpoint 07 must select exactly 83 unique pending groups")
    assessed = {x["candidateGroupKey"] for x in coverage if x["status"] == "ASSESSED"}
    require(not assessed.intersection(x["candidateGroupKey"] for x in selected),
            "Checkpoint 07 selection overlaps accepted assessments")
    return {
        "phase": "2H.2I-R6", "checkpointNumber": 7, "parentFingerprint": PIN,
        "remoteBaseline": BASELINE, "frozenAuthoringCohortFingerprint": FROZEN,
        "coverageRule": "ALL_PENDING_IN_ACCEPTED_ORIGINAL_COVERAGE_INVENTORY_ORDER",
        "previouslyAssessedGroupCount": PRIOR_ASSESSED, "selectedGroupCount": len(selected),
        "selectedPreviouslyAssessedGroupCount": 0,
        "linguisticDecisionsGeneratedDuringSelection": False,
        "coverage": selected,
    }


def parent_file_pins():
    rows = {}
    for path in sorted(p for p in CP06.rglob("*") if p.is_file()):
        rows[path.relative_to(ROOT).as_posix()] = stable_sha(path)
    for name in ("phase-2h2i-aggregate-qa-checkpoint-06.py", "phase-2h2i-aggregate-qa-checkpoint-06-test.py"):
        path = ROOT / "scripts" / name
        rows[path.relative_to(ROOT).as_posix()] = stable_sha(path)
    return rows


def input_file_pins():
    paths = {
        ORIGINAL_COVERAGE.relative_to(ROOT).as_posix(): ORIGINAL_COVERAGE,
        (a.WS / "effective-sense-index.json").relative_to(ROOT).as_posix(): a.WS / "effective-sense-index.json",
    }
    paths.update({path.relative_to(ROOT).as_posix(): path for path in source_paths().values()})
    return {name: stable_sha(path) for name, path in sorted(paths.items())}


def prepare():
    index, coverage, _, _, _ = parent_state()
    receipt = selection(index, coverage)
    pins = {
        "parentFingerprint": PIN,
        "remoteBaseline": BASELINE,
        "frozenAuthoringCohortFingerprint": FROZEN,
        "parentManifest": ref(CP06 / "manifest.json"),
        "inheritedPinsReference": ref(CP06 / "accepted-parent-pins.json"),
        "parentFiles": parent_file_pins(),
        "inputFiles": input_file_pins(),
        "parentFileCount": len(parent_file_pins()),
        "selectionSource": ref(CP06 / "coverage-audit-cumulative.json"),
        "authorization": AUTH,
    }
    (WS / "authored").mkdir(parents=True, exist_ok=True)
    for name, value in (("resume-selection-receipt.json", receipt), ("accepted-parent-pins.json", pins)):
        path = WS / name
        data = encode(value).encode("utf-8")
        require(not path.exists() or normalize_text_bytes(path.read_bytes()) == data,
                "Checkpoint 07 preparation artifacts are immutable: " + name)
        if not path.exists():
            path.write_bytes(data)
    return receipt


def validate_pins(pins):
    require(pins["parentFingerprint"] == PIN and pins["remoteBaseline"] == BASELINE
            and pins["frozenAuthoringCohortFingerprint"] == FROZEN, "Accepted parent identity drift")
    require(pins["parentManifest"] == ref(CP06 / "manifest.json")
            and pins["inheritedPinsReference"] == ref(CP06 / "accepted-parent-pins.json"),
            "Accepted checkpoint 06 reference drift")
    require(pins["parentFiles"] == parent_file_pins(), "Accepted checkpoint 06 files changed")
    require(pins["inputFiles"] == input_file_pins(), "Pinned source/effective inventory changed")
    for name, expected in {**pins["parentFiles"], **pins["inputFiles"]}.items():
        path = ROOT / name
        require(path.is_file() and stable_sha(path) == expected, "Pinned input changed: " + name)


def validate_source_evidence(index, selected, sources):
    for group in selected:
        for entry in group["sourceEvidenceReferences"]:
            row = index[entry["proposalKey"]]
            require(entry["sourceEvidence"] == row["sourceEvidence"], "Selection source reference drift: " + entry["proposalKey"])
            for evidence in entry["sourceEvidence"]:
                corpus = evidence["corpus"]
                require(corpus in sources, "Unexpected or unpinned source corpus")
                position = evidence["recordIndex"]
                require(0 <= position < len(sources[corpus]), "Source evidence index out of bounds")
                source = sources[corpus][position]
                require(source["recordEvidenceSha256"] == evidence["recordEvidenceSha256"],
                        "Source record evidence hash drift: " + entry["proposalKey"])
                require(source["normalizedHeadword"] == row["headword"],
                        "Source evidence does not match normalized headword: " + entry["proposalKey"])
                require(source["sourcePosRaw"] and isinstance(evidence.get("normalizedPosCandidates"), list),
                        "Source POS evidence is incomplete: " + entry["proposalKey"])


def validate_decisions(index, receipt, decision_file, notes, boundary_file, field_file, sources):
    rows = decision_file["records"]
    by_key = a.unique(rows, "candidateGroupKey")
    expected_keys = [x["candidateGroupKey"] for x in receipt["coverage"]]
    note_by_key = a.unique(notes["records"], "candidateGroupKey")
    require(list(by_key) == expected_keys and list(note_by_key) == expected_keys,
            "Decision identities must follow the exact accepted selection order")
    validate_source_evidence(index, receipt["coverage"], sources)
    require(decision_file["linguisticDecisionsGeneratedDuringAssembly"] is False,
            "Assembly must consume persisted manual assessments")
    for selected, row in zip(receipt["coverage"], rows):
        key = selected["candidateGroupKey"]
        senses = [(pk, index[pk]) for pk in selected["effectiveProposalKeys"]]
        hashes = {pk: sense["effectiveContentHash"] for pk, sense in senses}
        require(row["originalGroupOrdinal"] == selected["originalGroupOrdinal"], "Original group ordinal drift: " + key)
        require(row["originalWarnings"] == selected["originalWarnings"], "Original warning history drift: " + key)
        require(row["inspectedProposalKeys"] == list(hashes) and row["effectiveContentHashes"] == hashes
                == selected["effectiveContentHashes"], "Not all effective Sense content is bound: " + key)
        require(row["inspectedPartOfSpeech"] == {pk: sense["partOfSpeech"] for pk, sense in senses},
                "Part-of-speech proposal inspection drift: " + key)
        require(row["parentCheckpointFingerprint"] == PIN and row["status"] == "ASSESSED"
                and row["classification"] in CLASSES, "Invalid assessment status/class: " + key)
        require(row["classification"] == note_by_key[key]["classification"]
                and row["explanationVi"] == note_by_key[key]["explanationVi"],
                "Persisted assessment note differs from decision: " + key)
        require(row["explanationVi"].strip() and row["limitationsVi"].strip() and row["nextActionVi"].strip(),
                "Missing content-specific rationale or limitation: " + key)
        require(row["ownerApproval"] is False and row["exhaustiveLexicalCoverage"] is False
                and row["rights"] == "UNKNOWN_REVIEW_REQUIRED", "Assessment overclaims approval/rights/exhaustiveness")
        expected_evidence = [sense["sourceEvidence"] for _, sense in senses]
        require(row["sourceEvidence"] == expected_evidence and row["actualSourceEvidence"] == expected_evidence,
                "Actual source evidence not pinned: " + key)
        scope = [f"{e['corpus']} record {e['recordIndex']} POS={','.join(e['normalizedPosCandidates'])} ordinals={e.get('structuredOxfordSenseGroupOrdinals',[])}"
                 for group in expected_evidence for e in group]
        require(row["sourceScopeReviewed"] == scope, "Inspected source scope drift: " + key)
        inspected = row["inspectedFields"]
        require(set(inspected) == set(hashes), "Inspected-field map incomplete: " + key)
        lineage = row["correctionAndOverlayLineage"]
        require(set(lineage) == set(hashes), "Correction/overlay lineage not inspected: " + key)
        for pk, sense in senses:
            require(set(inspected[pk]) == set(sense["content"]), "A bilingual/content field was omitted: " + pk)
            require(lineage[pk] == {
                "effectiveContentHash": sense["effectiveContentHash"],
                "appliedCorrectionReferences": sense["appliedCorrectionReferences"],
                "pinnedCorrectionLineage": sense["pinnedCorrectionLineage"],
                "sourceMembership": sense["sourceMembership"],
                "origin": sense["origin"],
            }, "Correction/overlay lineage differs from effective projection: " + pk)
    require(len(rows) == NEW_TARGET, "Checkpoint 07 requires exactly 83 persisted assessments")
    require(boundary_file["ownerApproval"] is False and boundary_file["canonicalIdsAllocated"] == 0
            and boundary_file["records"] == [], "New boundary proposals must be absent without a confirmed gap")
    require(boundary_file["previousBoundaryProposalCount"] == 8, "Prior eight boundaries were not retained")
    field_rows = field_file["records"]
    require(len(field_rows) == 1, "Unexpected checkpoint 07 field correction proposal count")
    proposal = field_rows[0]
    sense = index["EDITORIAL_2H2H:lot:quantity-before-noun"]
    before = sense["content"]["examples"][0]["en"]
    require(proposal["proposalKey"] == sense["proposalKey"] and proposal["field"] == "/content/examples/0/en"
            and proposal["before"] == before and proposal["after"] == "A lot of leaves were collected beside the garden gate overnight.",
            "The lot example correction proposal is not content-bound")
    require(proposal["originalEffectiveContentHash"] == sense["effectiveContentHash"]
            and proposal["beforeSha256"] == hashlib.sha256(before.encode("utf-8")).hexdigest()
            and proposal["afterSha256"] == hashlib.sha256(proposal["after"].encode("utf-8")).hexdigest(),
            "New field proposal hash mismatch")
    require(proposal["applied"] is False and proposal["ownerApproval"] is False
            and proposal["rights"] == "UNKNOWN_REVIEW_REQUIRED" and proposal["fullBatchReReviewRequired"] is True,
            "New field correction was applied or approved")
    return by_key


def history_records(index):
    fields, boundaries = c5.previous_proposals()
    cp05 = load(c6.CP05 / "authored/new-correction-proposals.json")
    cp06bound = load(CP06 / c6.BOUNDARIES)
    fields = fields + cp05["records"]
    boundaries = boundaries + cp05["additionalBoundaryProposals"] + cp06bound["records"]
    require(len(fields) == 140 and len(boundaries) == 8, "Accepted proposal history count drift")
    for proposal in fields:
        key = proposal["proposalKey"]
        require(key in index and proposal["originalEffectiveContentHash"] == index[key]["effectiveContentHash"],
                "Historical field proposal has stale content hash: " + key)
    for proposal in boundaries:
        for key, expected in proposal.get("supportingExistingContentHashes", {}).items():
            require(key in index and expected == index[key]["effectiveContentHash"],
                    "Historical boundary proposal has stale content hash: " + key)
    return fields, boundaries


def source_checkpoint(proposal_id):
    for checkpoint in ("R6", "R5", "R4", "R3", "R2", "R1"):
        if proposal_id.startswith("2H2I-" + checkpoint + "-"):
            return "CHECKPOINT_" + checkpoint[-1]
    return "ORIGINAL_AGGREGATE_QA"


def resolve_decision(index, cumulative_row, original_by_key, new_by_key):
    if cumulative_row["newDecision"]:
        refrow = cumulative_row["newDecision"]
        decision = load(ROOT / refrow["path"])["records"][int(refrow["jsonPointer"].rsplit("/", 1)[1])]
        return decision
    original = original_by_key[cumulative_row["candidateGroupKey"]]
    if original.get("decision"):
        return original["decision"]
    refrow = cumulative_row.get("parentRecord", {}).get("path")
    require(refrow is not None, "Previously assessed record has no decision provenance")
    # Decisions from resumed checkpoints carry a newDecision reference; this fallback catches bad lineage.
    raise ValueError("Assessed parent row has no resolvable decision: " + cumulative_row["candidateGroupKey"])


def cumulative_findings(cumulative, new_by_key):
    original = a.unique(load(ORIGINAL_COVERAGE)["groups"], "candidateGroupKey")
    grouped = {name: [] for name in sorted(CLASSES)}
    records = []
    for row in cumulative:
        key = row["candidateGroupKey"]
        if key in new_by_key:
            decision = new_by_key[key]
            decision_ref = ref(WS / DECISIONS, "/records/" + str(list(new_by_key).index(key)))
        elif row.get("newDecision"):
            d = row["newDecision"]
            decision = load(ROOT / d["path"])["records"][int(d["jsonPointer"].rsplit("/", 1)[1])]
            decision_ref = d
        else:
            decision = original[key]["decision"]
            require(decision is not None, "Assessed coverage row lacks its original decision: " + key)
            decision_ref = row["originalRecord"]
        cls = decision.get("classification", decision.get("category"))
        require(cls in CLASSES and row["status"] == "ASSESSED", "Cumulative class/status is invalid: " + key)
        explanation = decision.get("explanationVi", "")
        record = {
            "candidateGroupKey": key, "originalGroupOrdinal": row["originalGroupOrdinal"],
            "classification": cls, "findingCount": 1, "decisionReference": decision_ref,
            "effectiveContentHashes": new_by_key[key]["effectiveContentHashes"] if key in new_by_key
                else decision.get("reviewedContentHashes", decision.get("effectiveContentHashes", {})),
            "explanationVi": explanation,
        }
        records.append(record)
        grouped[cls].append(key)
    require(len(records) == TOTAL_GROUPS and len({x["candidateGroupKey"] for x in records}) == TOTAL_GROUPS,
            "Cumulative coverage identity accounting is not exhaustive")
    return {
        "status": "COMPLETE", "uniqueGroupCount": len(records), "findingRecordCount": len(records),
        "repeatedFindingsBeyondOnePerGroup": 0,
        "classificationGroups": {key: {"uniqueGroupCount": len(value), "findingRecordCount": len(value),
                                        "candidateGroupKeys": value} for key, value in grouped.items()},
        "records": records,
    }


def assemble():
    index, coverage, parent_summary, reviews, grammar = parent_state()
    pins = load(WS / "accepted-parent-pins.json")
    validate_pins(pins)
    receipt = load(WS / "resume-selection-receipt.json")
    require(receipt == selection(index, coverage), "Checkpoint 07 selection receipt drift")
    decision_file = load(WS / DECISIONS)
    notes = load(WS / NOTES)
    boundary_file = load(WS / BOUNDARIES)
    field_file = load(WS / FIELD_PROPOSALS)
    require(notes.get("parentFingerprint") == PIN and notes.get("status") == "PERSISTED_MANUAL_ASSESSMENTS",
            "Manual decision receipt is missing or has invalid lineage")
    new_by_key = validate_decisions(index, receipt, decision_file, notes, boundary_file, field_file, source_data())
    fields, old_boundaries = history_records(index)
    original = load(ORIGINAL_COVERAGE)["groups"]
    parent_by_key = a.unique(coverage, "candidateGroupKey")
    new_indexes = {row["candidateGroupKey"]: i for i, row in enumerate(decision_file["records"])}
    cumulative = []
    for ordinal, parent_row in enumerate(coverage):
        key = parent_row["candidateGroupKey"]
        if key not in new_by_key:
            cumulative.append(parent_row)
            continue
        require(parent_row["status"] == "PENDING" and parent_row.get("newDecision") is None,
                "Checkpoint 07 attempted to replace an accepted decision: " + key)
        cumulative.append({
            **parent_row, "status": "ASSESSED",
            "parentRecord": ref(CP06 / "coverage-audit-cumulative.json", "/groups/" + str(ordinal)),
            "newDecision": ref(WS / DECISIONS, "/records/" + str(new_indexes[key])),
        })
    assessed = sum(x["status"] == "ASSESSED" for x in cumulative)
    pending = sum(x["status"] == "PENDING" for x in cumulative)
    require(assessed == TOTAL_GROUPS and pending == 0, "Final 500-group coverage closure is incomplete")
    for before, after in zip(coverage, cumulative):
        if before["status"] == "ASSESSED":
            require(before == after, "A previously assessed coverage record changed: " + before["candidateGroupKey"])
    original_warning_keys = [x["candidateGroupKey"] for x in original if x["originalWarningRecord"]["warnings"]]
    require(len(original_warning_keys) == 126 and all(parent_by_key[k]["originalWarnings"] for k in original_warning_keys),
            "Original coverage warning identities drift")
    findings = cumulative_findings(cumulative, new_by_key)
    class_counts = Counter(x["classification"] for x in findings["records"])
    require(sum(class_counts.values()) == TOTAL_GROUPS, "Coverage classification count mismatch")

    parent_queue = load(CP06 / "prioritized-remediation-queue.json")
    new_queue_items = []
    field_record = load(WS / FIELD_PROPOSALS)["records"][0]
    lot = index[field_record["proposalKey"]]
    new_queue_items.append({
        "queueId": "FIELD:2H2I-R6-P001", "kind": "CONFIRMED_LEARNER_FACING_EXAMPLE_DEFECT",
        "proposalKey": field_record["proposalKey"], "candidateGroupKey": lot["candidateGroupKey"],
        "fieldPath": field_record["field"], "currentEffectiveContentHash": field_record["originalEffectiveContentHash"],
        "findingSourceCheckpoint": "CHECKPOINT_07", "priority": field_record["priority"],
        "evidence": field_record["rationaleVi"], "requiredFutureAction": "Owner/editor review; full batch re-review before any additive DRAFT overlay.",
        "unresolvedOwnerDependency": True, "rights": "UNKNOWN_REVIEW_REQUIRED", "applied": False,
    })
    for key, decision in new_by_key.items():
        if decision["classification"] == "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP":
            continue
        priority = "P1" if decision["classification"] == "CONFIRMED_GAP" else "P2"
        new_queue_items.append({
            "queueId": "COVERAGE:" + key, "kind": decision["classification"],
            "proposalKey": None, "candidateGroupKey": key, "fieldPath": None,
            "currentEffectiveContentHash": decision["effectiveContentHashes"],
            "findingSourceCheckpoint": "CHECKPOINT_07", "priority": priority,
            "evidence": decision["explanationVi"], "requiredFutureAction": decision["nextActionVi"],
            "unresolvedOwnerDependency": True, "rights": "UNKNOWN_REVIEW_REQUIRED", "applied": False,
        })
    oldcounts = parent_queue["cumulativePriorityCounts"]
    new_counts = Counter(row["priority"] for row in new_queue_items)
    cumulative_priority_counts = {f"P{i}": oldcounts.get(f"P{i}", 0) + new_counts[f"P{i}"] for i in range(4)}

    # The flattened inventory is a traceable view of field, boundary, and coverage work;
    # the historical queue remains separately pinned to avoid dropping unrelated QA signals.
    inventory_items = []
    for proposal in fields + field_file["records"]:
        key = proposal["proposalKey"]
        group = index[key]["candidateGroupKey"]
        pid = proposal["correctionProposalId"]
        inventory_items.append({
            "inventoryId": "FIELD:" + pid, "proposalKey": key, "candidateGroupKey": group,
            "fieldPath": proposal["field"], "currentEffectiveContentHash": proposal["originalEffectiveContentHash"],
            "findingSourceCheckpoint": "CHECKPOINT_07" if pid.startswith("2H2I-R6-") else source_checkpoint(pid),
            "priority": proposal["priority"], "evidence": proposal["rationaleVi"],
            "requiredFutureAction": "Review proposal; complete full-batch re-review before any separately authorized overlay.",
            "unresolvedOwnerDependency": True, "unresolvedRightsDependency": "UNKNOWN_REVIEW_REQUIRED",
            "applied": False,
        })
    for proposal in old_boundaries:
        inventory_items.append({
            "inventoryId": "BOUNDARY:" + proposal.get("boundaryProposalId", proposal["candidateGroupKey"]),
            "proposalKey": proposal.get("proposalKey"), "candidateGroupKey": proposal["candidateGroupKey"],
            "fieldPath": None, "currentEffectiveContentHash": proposal.get("supportingExistingContentHashes", {}),
            "findingSourceCheckpoint": proposal.get("boundaryProposalId", "ACCEPTED_PARENT_BOUNDARY"),
            "priority": proposal.get("priority", "P1"), "evidence": proposal.get("rationaleVi", "Accepted noncanonical boundary proposal."),
            "requiredFutureAction": "Owner review boundary/content, identity, and rights before any separate materialization gate.",
            "unresolvedOwnerDependency": True, "unresolvedRightsDependency": "UNKNOWN_REVIEW_REQUIRED",
            "applied": False,
        })
    for record in findings["records"]:
        if record["classification"] == "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP":
            continue
        decision = new_by_key.get(record["candidateGroupKey"])
        if decision is None:
            source_checkpoint_name = record["decisionReference"].get("path", "accepted historical decision")
            next_action = "Review the accepted historical finding and its pinned source evidence under a separate authorization."
        else:
            source_checkpoint_name = "CHECKPOINT_07"
            next_action = decision["nextActionVi"]
        cls = record["classification"]
        inventory_items.append({
            "inventoryId": "COVERAGE:" + record["candidateGroupKey"], "proposalKey": None,
            "candidateGroupKey": record["candidateGroupKey"], "fieldPath": None,
            "currentEffectiveContentHash": record["effectiveContentHashes"],
            "findingSourceCheckpoint": source_checkpoint_name,
            "priority": "P1" if cls == "CONFIRMED_GAP" else "P2", "evidence": record["explanationVi"],
            "requiredFutureAction": next_action, "unresolvedOwnerDependency": True,
            "unresolvedRightsDependency": "UNKNOWN_REVIEW_REQUIRED", "applied": False,
        })
    require(len({x["inventoryId"] for x in inventory_items}) == len(inventory_items),
            "Deduplicated remediation inventory contains duplicate identities")
    inventory_priority_counts = {f"P{i}": sum(x["priority"] == f"P{i}" for x in inventory_items) for i in range(4)}

    warning_records = load(ORIGINAL_COVERAGE)["groups"]
    grammar_ref = parent_summary["grammarAuditReference"]
    review_ref = parent_summary["reviewHistoryReference"]
    legacy_status = "LEGACY_V2_2_0_RELEASE_TREE_DIAGNOSTIC_UNRESOLVED"
    verification_path = WS / "verification-results.json"
    require(verification_path.is_file(), "Persist actual validation receipts before assembly")
    verification = load(verification_path)
    require(verification.get("status") in {"PASS", "PASS_WITH_KNOWN_LEGACY_FAILURE"}
            and verification.get("commands"), "Validation receipt is missing or unverified")
    require(verification.get("legacyV2_2_0TestStatus") == legacy_status
            and verification.get("hybridV2_2_1Status") == "PASS",
            "Frozen-release findings must remain truthful and independently verified")
    require(verification.get("databaseAccess") == "NONE" and verification.get("databaseWrites") == "NONE"
            and verification.get("production") == "UNTOUCHED", "Verification exceeded offline authorization")

    summary = {
        "phase": "2H.2I-R6", "checkpointNumber": 7, "status": "COMPLETE",
        "aggregateAiAuditInventoryStatus": "COMPLETE", "contentApprovalStatus": "PENDING",
        "parentFingerprint": PIN, "remoteBaseline": BASELINE, "frozenAuthoringCohortFingerprint": FROZEN,
        "totalCorpusGroups": 1020, "totalCorpusSenses": 1563,
        "frozenCohortGroups": 500, "frozenCohortSenses": 750,
        "remainingUnauthoredCorpusGroups": 5123,
        "previousCoverageAssessed": PRIOR_ASSESSED, "newCoverageAssessed": len(new_by_key),
        "cumulativeCoverageAssessed": assessed, "coveragePending": pending,
        "cumulativeCoverageClassificationCounts": dict(class_counts),
        "cumulativeConfirmedMissingMeaningGroups": class_counts["CONFIRMED_GAP"],
        "cumulativePossibleMissingMeaningGroups": class_counts["POSSIBLE_GAP"],
        "cumulativeMetadataConflictGroups": class_counts["SOURCE_METADATA_CONFLICT"],
        "cumulativeCoverageUnknownGroups": class_counts["COVERAGE_UNKNOWN"],
        "cumulativeNoIdentifiedSourceSupportedGapGroups": class_counts["NO_IDENTIFIED_SOURCE_SUPPORTED_GAP"],
        "originalCoverageWarningGroupsPreserved": 126,
        "reviewRecords": 187, "reviewTriaged": 187, "reviewPending": 0,
        "dedicatedGrammarCandidates": 107, "grammarCandidatesInspected": 107, "grammarCandidatesPending": 0,
        "previousFieldProposals": 140, "newFieldCorrectionProposals": len(field_file["records"]),
        "totalFieldProposals": 140 + len(field_file["records"]),
        "newBoundaryProposals": 0, "previousBoundaryProposals": 8, "totalBoundaryProposals": 8,
        "correctionsApplied": 0, "ownerApprovalsAdded": 0, "canonicalIdsAllocated": 0,
        "previous1563SensesPreserved": True, "parentCheckpointsUnchanged": True,
        "reviewAndGrammarHistoryPreserved": True, "qaHistoryPreserved": True,
        "exhaustiveLexicalCoverage": "NOT_ESTABLISHED", "rights": "UNKNOWN_REVIEW_REQUIRED",
        "releaseEligible": False, "legacyV2_2_0TestStatus": legacy_status,
        "hybridV2_2_1Status": verification["hybridV2_2_1Status"],
        "ownerApprovalsAdded": 0, "masterReleaseChanged": False, "legacyModified": False,
        "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED",
        "reviewHistoryReference": review_ref, "grammarAuditReference": grammar_ref,
        "priorFieldProposalReference": ref(CP06 / "validation-summary.json"),
        "priorBoundaryProposalReferences": [ref(c6.CP05 / "correction-proposals-additive.json"), ref(CP06 / c6.BOUNDARIES)],
        "verificationReference": ref(verification_path), "authorization": AUTH,
    }
    queue = {
        "parentQueue": ref(CP06 / "prioritized-remediation-queue.json"),
        "newItems": new_queue_items,
        "cumulativePriorityCounts": cumulative_priority_counts,
        "inheritedQueuePriorityCounts": oldcounts,
        "deduplicatedRemediationInventory": inventory_items,
        "deduplicatedInventoryPriorityCounts": inventory_priority_counts,
        "fieldProposalCount": len(fields) + len(field_file["records"]),
        "boundaryProposalCount": len(old_boundaries),
        "coverageFindingCount": sum(x["classification"] != "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP" for x in findings["records"]),
        "unresolvedOwnerDependencies": True, "unresolvedRights": "UNKNOWN_REVIEW_REQUIRED",
        "approvalInferred": False,
    }
    cumulative_obj = {
        "parentFingerprint": PIN, "groups": cumulative,
        "newDecisions": ref(WS / DECISIONS), "exhaustiveLexicalCoverage": False,
        "assessedCount": assessed, "pendingCount": pending,
    }
    qa_lessons = {
        "phase": "2H.2I-R6", "status": "CONSOLIDATED_ADVISORY_LESSONS",
        "sourceReferences": [ref(a.WS / "authoring-qa-lessons.json"), ref(c6.CP05 / "authoring-qa-lesson.json")],
        "lessons": [
            {"id": "FIELD-SEPARATION", "lesson": "Learner-facing grammar fields should teach the language, not narrate curation. Keep source/POS uncertainty in provenance and review metadata.", "verifiedExample": "The `lot` quantity-before-noun example is a sentence fragment; its proposed auxiliary is recorded as an unapplied field correction."},
            {"id": "SOURCE-SCOPE", "lesson": "A source row and ordinal are evidence for the supplied record, not proof of dictionary-wide completeness.", "verifiedExample": "`stall` has locally pinned noun and engine-verb evidence, while an additional delay-progress draft meaning lacks a matching source record in this checkpoint."},
            {"id": "POS-CROSSWALK", "lesson": "Compare grammatical function and sense content across source records; do not treat different POS entries from different corpora as a contradiction by themselves.", "verifiedExample": "`fast`, `pound`, `stall`, `instant`, and `might` combine complementary source POS evidence; `noble` retains a source-internal noun/example mismatch for review."},
            {"id": "MEANING-BOUNDARY", "lesson": "Keep senses distinct when source meaning and usage differ; avoid making every example variation a new sense.", "verifiedExample": "`since` retains time-preposition, time-adverb, time-clause, and reason-clause functions; `double` maps five POS uses without making sentence variants separate senses."},
            {"id": "BILINGUAL-SCOPE", "lesson": "Check whether Vietnamese glosses preserve the English definition's scope and whether each example translation preserves its relation and polarity.", "verifiedExample": "The `withdrawal` senses distinguish substance effects, leaving/removal, and money taken from an account."},
            {"id": "IDENTITY-GATE", "lesson": "Shared spelling and source ordinals do not establish canonical lexical identity or Master equivalence.", "verifiedExample": "The `noble` POS/source mismatch is left as a review finding; no Master identity, approval, or canonical identifier is inferred."},
            {"id": "RIGHTS-AND-APPROVAL", "lesson": "AI content review remains separate from owner approval, rights clearance, and release eligibility.", "verifiedExample": "All 83 assessments remain DRAFT with UNKNOWN_REVIEW_REQUIRED rights and no approvals."},
            {"id": "CORRECTION-OVERLAY", "lesson": "Record proposed edits as content-bound before/after overlays and re-review the full source batch before applying under separate authorization.", "verifiedExample": "The `lot` example proposal retains the original effective hash and is not applied."},
        ],
        "limitations": ["These examples are a bounded audit, not a complete prevalence estimate.",
                        "No lesson confers owner approval, canonical identity, rights clearance, or release readiness."],
    }

    class_counts_json = {name: class_counts[name] for name in sorted(CLASSES)}
    final_handoff_payload = {
        "phase": "2H.2I-R6", "status": "COMPLETE_FOR_AUTHORIZED_AI_AUDIT_INVENTORIES",
        "parentFingerprint": PIN, "remoteBaseline": BASELINE,
        "frozenCohortFingerprint": FROZEN,
        "coverage": {"total": TOTAL_GROUPS, "unique": len(cumulative), "assessed": assessed, "pending": pending,
                     "classifications": class_counts_json},
        "reviews": {"triaged": len(reviews), "pending": 0},
        "grammar": {"inspected": grammar["dedicatedCandidateCount"], "pending": 0},
        "warningsPreserved": len(original_warning_keys),
        "fieldProposals": 140 + len(field_file["records"]), "boundaryProposals": len(old_boundaries),
        "correctionsApplied": 0, "contentApproval": "PENDING", "rights": "UNKNOWN_REVIEW_REQUIRED",
        "exhaustiveLexicalCoverage": "NOT_ESTABLISHED", "releaseEligible": False,
        "authorization": AUTH,
    }
    handoff_manifest = {**final_handoff_payload, "fingerprint": digest(final_handoff_payload)}
    final_md = render_handoff(summary, findings, queue, qa_lessons, verification)
    report_md = render_report(summary, class_counts_json, new_by_key, queue, verification)
    artifacts = {
        "coverage-audit-cumulative.json": cumulative_obj,
        "aggregate-qa-final-summary.json": summary,
        "cumulative-coverage-findings.json": findings,
        "prioritized-remediation-queue.json": queue,
        "authoring-qa-lessons.json": qa_lessons,
        "final-handoff-manifest.json": handoff_manifest,
        "validation-summary.json": {**summary, "verificationCommands": verification["commands"],
                                    "validationStatus": verification["status"],
                                    "legacyFailurePreserved": verification["legacyV2_2_0TestStatus"]},
        "verification-results.json": verification,
    }
    authored_hashes = {
        DECISIONS: stable_sha(WS / DECISIONS), NOTES: stable_sha(WS / NOTES),
        BOUNDARIES: stable_sha(WS / BOUNDARIES), FIELD_PROPOSALS: stable_sha(WS / FIELD_PROPOSALS),
    }
    script_names = ["phase-2h2i-aggregate-qa-checkpoint-07.py", "phase-2h2i-aggregate-qa-checkpoint-07-test.py"]
    manifest = {
        "phase": "2H.2I-R6", "checkpointNumber": 7, "parentFingerprint": PIN,
        "remoteBaseline": BASELINE, "frozenAuthoringCohortFingerprint": FROZEN,
        "originalAggregateFingerprint": c5.c4.c3.p.PIN,
        "checkpoint02Fingerprint": c5.c4.c3.PIN, "checkpoint03Fingerprint": c5.c4.PIN,
        "checkpoint04Fingerprint": c5.PIN, "checkpoint05Fingerprint": c6.c5.PIN,
        "checkpoint06Fingerprint": PIN,
        "acceptedPins": ref(WS / "accepted-parent-pins.json"),
        "selection": ref(WS / "resume-selection-receipt.json"),
        "authoredHashes": authored_hashes,
        "sourceInventoryHashes": input_file_pins(),
        "verificationSha256": stable_sha(verification_path),
        "sourceHashes": {name: stable_sha(ROOT / "scripts" / name) for name in script_names},
        "artifactHashes": {name: a.text_sha(encode(value)) for name, value in artifacts.items()},
        "finalHandoffFingerprint": handoff_manifest["fingerprint"],
        "finalHandoffSha256": a.text_sha(encode(handoff_manifest)),
        "reportSha256": a.text_sha(report_md), "finalAuditHandoffSha256": a.text_sha(final_md),
        "authorization": AUTH,
    }
    manifest["fingerprint"] = digest(manifest)
    artifacts["manifest.json"] = manifest
    outputs = {name: encode(value).encode("utf-8") for name, value in artifacts.items()}
    outputs["final-audit-handoff.md"] = final_md.encode("utf-8")
    outputs["report.md"] = report_md.encode("utf-8")
    return outputs


def render_report(summary, classes, new_by_key, queue, verification):
    lines = [
        "# Phase 2H.2I-R6 — checkpoint 07", "",
        "Status: PASS for the bounded aggregate AI audit inventories; no owner, rights, or release approval is implied.",
        f"Parent checkpoint 06: `{PIN}`. Remote parent baseline: `{BASELINE}`.",
        f"Coverage: {summary['previousCoverageAssessed']} previous + {summary['newCoverageAssessed']} new = {summary['cumulativeCoverageAssessed']}/500; {summary['coveragePending']} pending.",
        "All 1,563 effective Sense drafts and all prior checkpoint data are preserved. Corrections applied: 0.",
        "", "## Cumulative coverage classes", "",
    ]
    lines += [f"- {name}: {classes[name]} unique groups" for name in sorted(CLASSES)]
    lines += ["", "## Checkpoint 07 findings", ""]
    for key, row in new_by_key.items():
        lines.append(f"- `{key}` — {row['classification']}: {row['explanationVi']}")
    lines += ["", "## Remediation", "",
              f"The accepted 140 field proposals and 8 boundary proposals are preserved. One new unapplied field correction proposal was recorded. The deduplicated audit inventory contains {len(queue['deduplicatedRemediationInventory'])} items.",
              "Owner/content review and rights review remain required; no proposal is applied.",
              "", "## Verification", "",
              f"Validation receipt: `{verification['status']}`. Legacy v2.2.0 remains `{verification['legacyV2_2_0TestStatus']}`; the known 4/5 failure was not hidden.",
              f"Hybrid v2.2.1: `{verification['hybridV2_2_1Status']}`.",
              "", "Rights remain UNKNOWN_REVIEW_REQUIRED; the inventory is not release eligible and dictionary-wide lexical coverage is not established.", ""]
    return "\n".join(lines)


def render_handoff(summary, findings, queue, lessons, verification):
    lines = [
        "# Final aggregate AI audit handoff — Phase 2H.2I-R6", "",
        "## Inventory closure", "",
        f"- Frozen cohort: {summary['frozenCohortGroups']} groups; unique coverage identities: {findings['uniqueGroupCount']}.",
        f"- Coverage: {summary['cumulativeCoverageAssessed']} assessed; {summary['coveragePending']} pending.",
        f"- Original warning identities retained: {summary['originalCoverageWarningGroupsPreserved']}.",
        f"- REVIEW: {summary['reviewTriaged']}/{summary['reviewRecords']} triaged; {summary['reviewPending']} pending.",
        f"- Dedicated grammar candidates: {summary['grammarCandidatesInspected']}/{summary['dedicatedGrammarCandidates']} inspected; {summary['grammarCandidatesPending']} pending.",
        "- Coverage findings count one classification per unique group; repeated findings beyond one per group: 0.",
        "", "## Cumulative coverage findings", "",
    ]
    for cls, group in findings["classificationGroups"].items():
        lines.append(f"- {cls}: {group['uniqueGroupCount']} unique groups / {group['findingRecordCount']} decision findings.")
        if group["candidateGroupKeys"]:
            lines.append("  - " + ", ".join("`" + x + "`" for x in group["candidateGroupKeys"]))
    lines += ["", "## New checkpoint 07 review notes", ""]
    for row in findings["records"]:
        if row["originalGroupOrdinal"] < 0:
            continue
        if row["candidateGroupKey"] in {x["candidateGroupKey"] for x in findings["records"][-NEW_TARGET:]}:
            lines.append(f"- `{row['candidateGroupKey']}` — {row['classification']}: {row['explanationVi']}")
    lines += ["", "## Remediation inventory", "",
              f"- Field proposals: {summary['totalFieldProposals']} ({summary['previousFieldProposals']} accepted prior + {summary['newFieldCorrectionProposals']} new, unapplied).",
              f"- Noncanonical boundary proposals: {summary['totalBoundaryProposals']} (all eight accepted parent proposals; zero new boundaries).",
              f"- Deduplicated linked remediation items: {len(queue['deduplicatedRemediationInventory'])}.",
              "- The historical queue is retained by exact parent reference; no priority category or unrelated QA signal is discarded.",
              "- The lot example proposal is an unapplied grammar correction; noble is a source POS/example metadata conflict; youth and stall carry evidence-scope uncertainty for unreferenced extra draft boundaries.",
              "", "## Reusable authoring lessons", ""]
    for lesson in lessons["lessons"]:
        lines.append(f"- **{lesson['id']}** — {lesson['lesson']} Example: {lesson['verifiedExample']}")
    lines += ["", "## Readiness and protected boundaries", "",
              "- This closes only the authorized AI audit inventories. Content approval remains PENDING.",
              "- Lexical completeness across dictionaries has NOT BEEN ESTABLISHED.",
              "- Existing DRAFT Senses were not remediated; all rights remain UNKNOWN_REVIEW_REQUIRED.",
              "- No canonical IDs, Master release, Development/Production database access, import, or legacy retirement occurred.",
              "- Canonical identity, CEFR/classification approval, rights clearance, import, and legacy retirement each require separate gates.",
              f"- Legacy v2.2.0 stays `{verification['legacyV2_2_0TestStatus']}` (historical 4/5; known failure preserved). Hybrid v2.2.1 independently verified: `{verification['hybridV2_2_1Status']}`.",
              "- The next recommended work is a separately authorized targeted DRAFT remediation, then controlled expansion of the remaining 5,123 corpus groups.", ""]
    return "\n".join(lines)


def run(check=False):
    outputs = assemble()
    for name, data in outputs.items():
        path = WS / name
        if check:
            require(path.is_file() and normalize_text_bytes(path.read_bytes()) == normalize_text_bytes(data),
                    "Checkpoint 07 output drift: " + name)
        else:
            require(path.resolve().is_relative_to(WS.resolve()), "Unsafe checkpoint output path")
            require(not path.exists() or normalize_text_bytes(path.read_bytes()) == normalize_text_bytes(data),
                    "Checkpoint 07 output is immutable: " + name)
            if not path.exists():
                path.write_bytes(data)
    return {"fingerprint": load(WS / "manifest.json")["fingerprint"],
            "finalHandoffFingerprint": load(WS / "final-handoff-manifest.json")["fingerprint"],
            "status": "COMPLETE", "zeroWrites": check}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--checkpoint", type=int, choices=[7])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.prepare:
        require(args.checkpoint == 7, "Preparation requires --checkpoint 7")
        receipt = prepare()
        print("PREPARED", len(receipt["coverage"]), receipt["coverage"][0]["candidateGroupKey"],
              receipt["coverage"][-1]["candidateGroupKey"])
    else:
        print(encode(run(args.check)))


if __name__ == "__main__":
    main()
