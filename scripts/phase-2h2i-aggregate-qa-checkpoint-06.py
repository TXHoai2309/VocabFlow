#!/usr/bin/env python3
"""Offline, additive Phase 2H.2I checkpoint 06; no linguistic judgments in replay."""
import argparse
import importlib.util
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


c5 = module("phase_2h2i_checkpoint05", Path(__file__).with_name("phase-2h2i-aggregate-qa-checkpoint-05.py"))
a = c5.a
CP05 = c5.WS
WS = CP05.parent / "checkpoint-06"
PIN = "4a3a5d0f48a07dcdd7e5e2f1d7ca2aa2af58709bae174a02f77d84814bbd078f"
BASELINE = "7072cf62c310ab9c724745502d446111c14b9943"
TOTAL_GROUPS = 500
PREVIOUS_ASSESSED = 317
NEW_TARGET = 100
CLASSES = {"CONFIRMED_GAP", "POSSIBLE_GAP", "SOURCE_METADATA_CONFLICT", "COVERAGE_UNKNOWN", "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP"}
AUTH = {
    "contentStatus": "DRAFT", "rights": "UNKNOWN_REVIEW_REQUIRED",
    "correctionsApplied": 0, "ownerApprovalsAdded": 0,
    "canonicalIdsAllocated": 0, "rightsClearanceAdded": 0,
    "databaseAccess": "NONE", "databaseWrites": "NONE",
    "production": "UNTOUCHED", "masterReleaseChanged": False,
    "legacyModified": False, "releaseFixApplied": False,
}
load, encode, sha, require, digest = c5.load, c5.encode, c5.sha, c5.require, c5.digest
ref = c5.ref


def normalize_text_bytes(data):
    """Treat Git's configured CRLF checkout conversion as transport-only for text artifacts."""
    return data.replace(b"\r\n", b"\n")


def stable_sha(path):
    """Hash new checkpoint text inputs independent of Windows checkout line endings."""
    return hashlib.sha256(normalize_text_bytes(Path(path).read_bytes())).hexdigest()


ORIGINAL_COVERAGE = a.WS / "sense-coverage-audit.json"
DECISIONS = "authored/coverage-decisions-batch-006.json"
BOUNDARIES = "authored/new-boundary-proposals.json"
ASSESSMENT_NOTES = "authored/coverage-assessment-notes-batch-006.json"


def parents():
    replay = c5.run(True)
    require(replay["fingerprint"] == PIN and replay["zeroWrites"] is True, "Accepted checkpoint 05 replay drift")
    index = a.unique(load(a.WS / "effective-sense-index.json")["records"], "proposalKey")
    reviews = load(CP05 / "review-triage-cumulative.json")["records"]
    coverage = load(CP05 / "coverage-audit-cumulative.json")["groups"]
    grammar = load(CP05 / "grammar-commentary-audit.json")
    require(len(index) == 1563 and len(reviews) == 187 and len(coverage) == TOTAL_GROUPS, "Parent inventory drift")
    require(sum(x["status"] == "TRIAGED" for x in reviews) == 187, "REVIEW triage history drift")
    require(sum(x["status"] == "ASSESSED" for x in coverage) == PREVIOUS_ASSESSED, "Parent coverage count drift")
    require(sum(x["status"] == "PENDING" for x in coverage) == 183, "Parent pending count drift")
    require(len(grammar["pendingDedicatedInspectionKeys"]) == 0 and grammar["dedicatedCandidateCount"] == 107,
            "Dedicated grammar inventory drift")
    old_fields, old_boundaries = c5.previous_proposals()
    cp05_proposals = load(CP05 / "authored/new-correction-proposals.json")
    require(len(old_fields) + len(cp05_proposals["records"]) == 140
            and len(old_boundaries) + len(cp05_proposals["additionalBoundaryProposals"]) == 7,
            "Accepted proposal history drift")
    return index, reviews, coverage, grammar


def selection(index, coverage):
    original = load(ORIGINAL_COVERAGE)["groups"]
    by_key = {x["candidateGroupKey"]: x for x in coverage}
    require(len(original) == TOTAL_GROUPS and len(by_key) == TOTAL_GROUPS, "Original coverage inventory drift")
    selected = []
    for ordinal, original_row in enumerate(original):
        key = original_row["candidateGroupKey"]
        current = by_key[key]
        if current["status"] != "PENDING":
            continue
        senses = [(proposal_key, row) for proposal_key, row in index.items() if row["candidateGroupKey"] == key]
        require(bool(senses), "Pending coverage group has no effective Senses: " + key)
        hashes = {proposal_key: row["effectiveContentHash"] for proposal_key, row in senses}
        evidence = [{"proposalKey": proposal_key, "sourceEvidence": row["sourceEvidence"]} for proposal_key, row in senses]
        selected.append({
            "candidateGroupKey": key,
            "originalGroupOrdinal": ordinal,
            "originalWarnings": original_row["originalWarningRecord"]["warnings"],
            "effectiveProposalKeys": list(hashes),
            "effectiveContentHashes": hashes,
            "parentCheckpointFingerprint": PIN,
            "sourceEvidenceReferences": evidence,
            "immutableSelectionRule": "FIRST_100_PENDING_IN_ACCEPTED_ORIGINAL_COVERAGE_INVENTORY_ORDER",
        })
        if len(selected) == NEW_TARGET:
            break
    require(len(selected) == NEW_TARGET, "Fewer than 100 pending parent groups")
    require(len({x["candidateGroupKey"] for x in selected}) == NEW_TARGET, "Duplicate selection identities")
    prior = {x["candidateGroupKey"] for x in coverage if x["status"] == "ASSESSED"}
    require(not prior.intersection(x["candidateGroupKey"] for x in selected), "Selection overlaps previous assessments")
    return {
        "phase": "2H.2I-R5", "checkpointNumber": 6, "parentFingerprint": PIN,
        "remoteBaseline": BASELINE,
        "originalAggregateFingerprint": c5.c4.c3.p.PIN,
        "checkpoint02Fingerprint": c5.c4.c3.PIN,
        "checkpoint03Fingerprint": c5.c4.PIN,
        "checkpoint04Fingerprint": c5.PIN,
        "coverageRule": "FIRST_100_PENDING_IN_ACCEPTED_ORIGINAL_COVERAGE_INVENTORY_ORDER",
        "selectedGroupCount": len(selected), "previouslyAssessedGroupCount": PREVIOUS_ASSESSED,
        "selectedPreviouslyAssessedGroupCount": 0,
        "linguisticDecisionsGeneratedDuringSelection": False,
        "coverage": selected,
    }


def parent_file_pins():
    rows = {}
    for base in (CP05, ROOT / "scripts"):
        for path in sorted(x for x in base.rglob("*") if x.is_file()):
            if base == ROOT / "scripts" and path.name not in {
                "phase-2h2i-aggregate-qa-checkpoint-05.py",
                "phase-2h2i-aggregate-qa-checkpoint-05-test.py",
            }:
                continue
            rows[path.relative_to(ROOT).as_posix()] = sha(path)
    return rows


def prepare():
    index, _, coverage, _ = parents()
    receipt = selection(index, coverage)
    pins = {
        "parentFingerprint": PIN,
        "parentManifest": ref(CP05 / "manifest.json"),
        "inheritedPinsReference": ref(CP05 / "accepted-parent-pins.json"),
        "parentFiles": parent_file_pins(),
        "previousFileCount": len(parent_file_pins()),
        "selectionSource": ref(CP05 / "coverage-audit-cumulative.json"),
        "authorization": AUTH,
    }
    (WS / "authored").mkdir(parents=True, exist_ok=True)
    for name, value in (("resume-selection-receipt.json", receipt), ("accepted-parent-pins.json", pins)):
        path = WS / name
        data = encode(value).encode("utf-8")
        require(not path.exists() or path.read_bytes() == data, "Checkpoint 06 selection/pins are immutable")
        if not path.exists():
            path.write_bytes(data)
    return receipt


def validate_pins(pins):
    require(pins["parentFingerprint"] == PIN, "Checkpoint 05 pin mismatch")
    require(pins["parentManifest"] == ref(CP05 / "manifest.json"), "Checkpoint 05 manifest reference drift")
    require(pins["parentFiles"] == parent_file_pins(), "Checkpoint 05 or accepted script bytes changed")
    for name, expected in pins["parentFiles"].items():
        path = ROOT / name
        require(path.is_file() and sha(path) == expected, "Pinned parent file changed: " + name)


def validate_decisions(index, receipt, coverage_file, boundaries, assessment_notes):
    rows = coverage_file["records"]
    unique = a.unique(rows, "candidateGroupKey")
    expected_keys = [x["candidateGroupKey"] for x in receipt["coverage"]]
    require(list(unique) == expected_keys, "Decision identities or accepted order differ from selection receipt")
    note_rows = a.unique(assessment_notes["records"], "candidateGroupKey")
    require(list(note_rows) == expected_keys, "Persisted content assessment notes are missing, duplicated, or reordered")
    original = load(ORIGINAL_COVERAGE)["groups"]
    for selected, row in zip(receipt["coverage"], rows):
        key = selected["candidateGroupKey"]
        group_senses = [(proposal_key, value) for proposal_key, value in index.items() if value["candidateGroupKey"] == key]
        expected_hashes = {proposal_key: value["effectiveContentHash"] for proposal_key, value in group_senses}
        require(row["originalGroupOrdinal"] == selected["originalGroupOrdinal"], "Coverage original ordinal drift: " + key)
        require(row["originalWarnings"] == selected["originalWarnings"] == original[selected["originalGroupOrdinal"]]["originalWarningRecord"]["warnings"], "Historical warning identity drift: " + key)
        require(row["inspectedProposalKeys"] == list(expected_hashes) == selected["effectiveProposalKeys"], "Not every effective Sense was inspected: " + key)
        require(row["effectiveContentHashes"] == expected_hashes == selected["effectiveContentHashes"], "Effective Sense content hash drift: " + key)
        require(row["parentCheckpointFingerprint"] == PIN, "Wrong parent checkpoint: " + key)
        require(row["classification"] in CLASSES and row["status"] == "ASSESSED", "Invalid coverage status/class: " + key)
        require(row["classification"] == note_rows[key]["classification"]
                and row["explanationVi"] == note_rows[key]["explanationVi"], "Decision differs from persisted assessment note: " + key)
        require(row["exhaustiveLexicalCoverage"] is False, "Unsupported exhaustive coverage claim: " + key)
        require(row["ownerApproval"] is False and row["rights"] == "UNKNOWN_REVIEW_REQUIRED", "Approval/rights overclaim: " + key)
        require(row["explanationVi"].strip() and row["limitationsVi"].strip() and row["nextActionVi"].strip(), "Missing group-specific rationale: " + key)
        require(row["sourceEvidence"] == [value["sourceEvidence"] for _, value in group_senses], "Source evidence mismatch: " + key)
        require(row["actualSourceEvidence"] == row["sourceEvidence"], "Inspection evidence was not recorded exactly: " + key)
        inspected = row["inspectedFields"]
        require(set(inspected) == set(expected_hashes), "Inspected field map does not cover every Sense: " + key)
        for proposal_key, value in group_senses:
            fields = value["content"]
            require(set(inspected[proposal_key]) == set(fields), "A learner-facing content field was omitted: " + proposal_key)
            require({"definitionEn", "meaningVi", "examples"}.issubset(fields), "Required bilingual fields absent in source row: " + proposal_key)
    require(len(rows) == NEW_TARGET, "Checkpoint 06 requires exactly 100 actual assessments")
    require(coverage_file["linguisticDecisionsGeneratedDuringAssembly"] is False, "Assembly generated linguistic decisions")
    require(boundaries["ownerApproval"] is False and boundaries["canonicalIdsAllocated"] == 0, "Boundary authorization overclaim")
    boundary_rows = boundaries["records"]
    boundary_ids = [x["boundaryProposalId"] for x in boundary_rows]
    require(len(set(boundary_ids)) == len(boundary_ids), "Duplicate boundary proposal identity")
    confirmed_groups = {key for key, row in unique.items() if row["classification"] == "CONFIRMED_GAP"}
    require({x["candidateGroupKey"] for x in boundary_rows} == confirmed_groups,
            "Every confirmed gap needs exactly one proposal-only boundary, and no other group may have one")
    for proposal in boundary_rows:
        key = proposal["candidateGroupKey"]
        require(key in unique and unique[key]["classification"] == "CONFIRMED_GAP", "Boundary proposal has no confirmed selected parent group")
        require(proposal["action"] == "PROPOSE_NEW_DRAFT_BOUNDARY_ONLY" and proposal["applied"] is False
                and proposal["approved"] is False and proposal["ownerApproval"] is False,
                "Boundary proposal was applied or approved")
        require(proposal["canonicalId"] is None and proposal["proposalKeyAllocated"] is False
                and proposal["sourceOrdinalAllocated"] is False and proposal["approvedCefrAllocated"] is False,
                "Boundary proposal allocated protected identity/classification")
        require(proposal["rights"] == "UNKNOWN_REVIEW_REQUIRED" and proposal["proposedPos"]
                and proposal["content"]["definitionEn"] and proposal["content"]["meaningVi"]
                and proposal["content"]["examples"] and proposal["rationaleVi"], "Boundary proposal is incomplete")
        support = proposal["supportingExistingContentHashes"]
        require(set(support).issubset(unique[key]["effectiveContentHashes"])
                and all(unique[key]["effectiveContentHashes"][k] == v for k, v in support.items()),
                "Boundary proposal has stale or foreign supporting hashes")
        require(proposal["sourceEvidence"] and all(x["proposalKey"] in support
                and x["sourceEvidence"] == index[x["proposalKey"]]["sourceEvidence"] for x in proposal["sourceEvidence"]),
                "Boundary proposal source evidence is not pinned to its supporting content")
        require(proposal["boundaryProposalId"].startswith("2H2I-R5-B"), "Boundary proposal identity is outside checkpoint 06")
    return unique


def assemble():
    index, reviews, coverage, grammar = parents()
    pins = load(WS / "accepted-parent-pins.json")
    validate_pins(pins)
    receipt = load(WS / "resume-selection-receipt.json")
    require(receipt == selection(index, coverage), "Checkpoint 06 selection receipt drift")
    coverage_file = load(WS / DECISIONS)
    boundaries = load(WS / BOUNDARIES)
    assessment_notes = load(WS / ASSESSMENT_NOTES)
    require(assessment_notes.get("parentFingerprint") == PIN
            and assessment_notes.get("status") == "PERSISTED_MANUAL_ASSESSMENTS",
            "Assessment-note lineage/status invalid")
    new = validate_decisions(index, receipt, coverage_file, boundaries, assessment_notes)
    old = load(CP05 / "coverage-audit-cumulative.json")["groups"]
    old_by_key = a.unique(old, "candidateGroupKey")
    cumulative = []
    for i, row in enumerate(old):
        key = row["candidateGroupKey"]
        ordinal = row["originalGroupOrdinal"]
        if key in new:
            require(row["status"] == "PENDING" and row.get("newDecision") is None, "Previously assessed group selected: " + key)
            new_index = list(new).index(key)
            cumulative.append({**row, "status": "ASSESSED", "parentRecord": ref(CP05 / "coverage-audit-cumulative.json", f"/groups/{i}"),
                               "newDecision": ref(WS / DECISIONS, f"/records/{new_index}")})
        else:
            cumulative.append({**row, "parentRecord": ref(CP05 / "coverage-audit-cumulative.json", f"/groups/{i}")})
    require(len(cumulative) == TOTAL_GROUPS and len(old_by_key) == TOTAL_GROUPS, "Cumulative coverage inventory size drift")
    assessed = sum(x["status"] == "ASSESSED" for x in cumulative)
    pending = sum(x["status"] == "PENDING" for x in cumulative)
    require(assessed == 417 and pending == 83, "Checkpoint 06 cumulative coverage counts mismatch")
    old_summary = load(CP05 / "validation-summary.json")
    previous_queue = load(CP05 / "prioritized-remediation-queue.json")
    new_queue = []
    for row in new.values():
        if row["classification"] != "NO_IDENTIFIED_SOURCE_SUPPORTED_GAP":
            new_queue.append({
                "identity": row["candidateGroupKey"],
                "effectiveContentHashes": row["effectiveContentHashes"],
                "classification": row["classification"],
                "priority": "P1" if row["classification"] == "CONFIRMED_GAP" else "P2",
                "rationaleVi": row["explanationVi"], "nextActionVi": row["nextActionVi"],
                "ownerApproval": False, "rights": "UNKNOWN_REVIEW_REQUIRED",
            })
    for proposal in boundaries["records"]:
        new_queue.append({"identity": proposal["boundaryProposalId"], "candidateGroupKey": proposal["candidateGroupKey"],
            "parentContentHashes": proposal["supportingExistingContentHashes"], "classification": "CONFIRMED_GAP",
            "priority": "P1", "rationaleVi": proposal["rationaleVi"],
            "nextActionVi": "Yêu cầu owner review ranh giới và nội dung đề xuất trước mọi bước materialization.",
            "applied": False, "ownerApproval": False, "rights": "UNKNOWN_REVIEW_REQUIRED"})
    prev_counts = previous_queue["cumulativePriorityCounts"]
    queue_counts = {f"P{i}": prev_counts.get(f"P{i}", 0) + sum(x.get("priority") == f"P{i}" for x in new_queue) for i in range(4)}
    classes = Counter(x["classification"] for x in new.values())
    prior_coverage = load(CP05 / "coverage-audit-cumulative.json")
    original_rows = load(ORIGINAL_COVERAGE)["groups"]
    require(sum(bool(x["originalWarningRecord"]["warnings"]) for x in original_rows) == 126,
            "Original 126 warning identities drift")
    require(len(reviews) == 187 and len(grammar["pendingDedicatedInspectionKeys"]) == 0, "Closed review/grammar history drift")
    old_fields, old_boundaries = c5.previous_proposals()
    cp05_proposals = load(CP05 / "authored/new-correction-proposals.json")
    require(len(old_fields) + len(cp05_proposals["records"]) == 140
            and len(old_boundaries) + len(cp05_proposals["additionalBoundaryProposals"]) == 7,
            "Historical proposal counts drift")
    summary = {
        "phase": "2H.2I-R5", "checkpointNumber": 6, "status": "PARTIAL", "boundedTargetsCompleted": True,
        "parentFingerprint": PIN, "remoteBaseline": BASELINE,
        "totalCorpusGroups": 1020, "totalCorpusSenses": 1563,
        "frozenCohortGroups": 500, "frozenCohortSenses": 750,
        "previousCoverageAssessed": PREVIOUS_ASSESSED, "newCoverageAssessed": len(new),
        "cumulativeCoverageAssessed": assessed, "coveragePending": pending,
        "originalCoverageWarningGroupsPreserved": 126,
        "newCoverageClassificationCounts": dict(classes),
        "newConfirmedCoverageGaps": classes["CONFIRMED_GAP"],
        "newPossibleCoverageGaps": classes["POSSIBLE_GAP"],
        "newSourceMetadataConflicts": classes["SOURCE_METADATA_CONFLICT"],
        "newCoverageUnknown": classes["COVERAGE_UNKNOWN"],
        "newNoIdentifiedSourceSupportedGap": classes["NO_IDENTIFIED_SOURCE_SUPPORTED_GAP"],
        "newBoundaryProposals": len(boundaries["records"]),
        "totalFieldProposals": old_summary["totalFieldProposals"],
        "totalBoundaryProposals": old_summary["totalBoundaryProposals"] + len(boundaries["records"]),
        "reviewTriaged": 187, "reviewPending": 0,
        "grammarCandidatesInspected": 107, "grammarCandidatesPending": 0,
        "appliedCorrections": 0, "ownerApprovalsAdded": 0, "canonicalIdsAllocated": 0,
        "previous1563SensesPreserved": True, "parentCheckpointsUnchanged": True,
        "reviewAndGrammarHistoryPreserved": True, "exhaustiveLexicalCoverage": False,
        "legacyV2_2_0TestStatus": "LEGACY_V2_2_0_RELEASE_TREE_DIAGNOSTIC_UNRESOLVED",
        "reviewHistoryReference": ref(CP05 / "review-triage-cumulative.json"),
        "reviewHistorySha256": sha(CP05 / "review-triage-cumulative.json"),
        "grammarAuditReference": ref(CP05 / "grammar-commentary-audit.json"),
        "grammarAuditSha256": sha(CP05 / "grammar-commentary-audit.json"),
        "previousFieldProposalHistoryReference": ref(CP05 / "correction-proposals-additive.json"),
        "previousBoundaryProposalCount": 7,
        "authorization": AUTH,
    }
    objects = {
        "coverage-audit-cumulative.json": {"parentFingerprint": PIN, "groups": cumulative,
            "newDecisions": ref(WS / DECISIONS), "exhaustiveLexicalCoverage": False},
        "prioritized-remediation-queue.json": {"parentQueue": ref(CP05 / "prioritized-remediation-queue.json"),
            "newItems": new_queue, "cumulativePriorityCounts": queue_counts,
            "priorItemsReferenced": {"checkpoint05": ref(CP05 / "prioritized-remediation-queue.json")},
            "unresolvedRights": "UNKNOWN_REVIEW_REQUIRED", "approvalInferred": False},
        "validation-summary.json": summary,
    }
    verification_path = WS / "verification-results.json"
    require(verification_path.is_file(), "Persist actual verification command receipts before assembly")
    verification = load(verification_path)
    require(verification.get("status") in {"PASS", "PARTIAL"} and verification.get("commands"), "Verification receipts missing")
    report_lines = [
        "# Phase 2H.2I-R5 — aggregate Sense coverage checkpoint 06", "",
        "Status: PARTIAL for the aggregate audit; the bounded 100-group coverage selection is assessed.",
        f"Parent checkpoint 05: `{PIN}`. Remote baseline: `{BASELINE}`.",
        f"Coverage: {PREVIOUS_ASSESSED} previous + {len(new)} new = {assessed}/500; {pending} remain pending.",
        "All content remains DRAFT; rights are UNKNOWN_REVIEW_REQUIRED. These AI assessments are not owner approval, identity approval, rights clearance, or exhaustive lexical verification.",
        "", "## New classification counts", "",
    ]
    report_lines += [f"- {name}: {classes[name]}" for name in sorted(CLASSES)]
    report_lines += ["", "## Content-bound assessments", ""]
    report_lines += [f"- {key}: {row['classification']} — {row['explanationVi']}  Next: {row['nextActionVi']}" for key, row in new.items()]
    if boundaries["records"]:
        report_lines += ["", "## Noncanonical boundary proposal", ""]
        for proposal in boundaries["records"]:
            report_lines += [f"- {proposal['boundaryProposalId']} for {proposal['candidateGroupKey']} ({proposal['proposedPos']}): {proposal['content']['definitionEn']} {proposal['rationaleVi']} Source: {proposal['lexicalCorroboration']}. DRAFT only; no proposal key, canonical ID, source ordinal, CEFR approval, or owner approval allocated."]
    report_lines += ["", "## Legacy v2.2.0 release-tree diagnostic", "",
        "Status: LEGACY_V2_2_0_RELEASE_TREE_DIAGNOSTIC_UNRESOLVED. The test still fails 1 of 5 checks on this Windows checkout. Read-only comparison shows that all 1,096 tracked release JSON files are CRLF in the worktree and LF in their Git blobs; normalizing the checkout to LF reproduces the recorded tree fingerprint, while raw worktree bytes do not. The failure is therefore reproducible as a checkout line-ending mismatch, but the release-integrity test remains red and requires separate resolution. No release or test changes were made. See verification-results.json for exact fingerprints and test result.",
        "", "## Handoff", "", "The audit remains PARTIAL with 83 coverage groups pending. Continue only in a separately authorized checkpoint 07; no corrections were applied.", ""]
    report = "\n".join(report_lines)
    source_names = ["phase-2h2i-aggregate-qa-checkpoint-06.py", "phase-2h2i-aggregate-qa-checkpoint-06-test.py"]
    manifest = {
        "phase": "2H.2I-R5", "checkpointNumber": 6, "parentFingerprint": PIN,
        "remoteBaseline": BASELINE, "originalAggregateFingerprint": c5.c4.c3.p.PIN,
        "checkpoint02Fingerprint": c5.c4.c3.PIN, "checkpoint03Fingerprint": c5.c4.PIN,
        "checkpoint04Fingerprint": c5.PIN, "checkpoint05Fingerprint": PIN,
        "acceptedPins": ref(WS / "accepted-parent-pins.json"),
        "selection": ref(WS / "resume-selection-receipt.json"),
        "authoredHashes": {DECISIONS: stable_sha(WS / DECISIONS), BOUNDARIES: stable_sha(WS / BOUNDARIES),
            ASSESSMENT_NOTES: stable_sha(WS / ASSESSMENT_NOTES)},
        "verificationSha256": stable_sha(verification_path),
        "sourceHashes": {name: stable_sha(ROOT / "scripts" / name) for name in source_names},
        "artifactHashes": {name: a.text_sha(encode(value)) for name, value in objects.items()},
        "reportSha256": a.text_sha(report), "authorization": AUTH,
    }
    manifest["fingerprint"] = digest(manifest)
    objects["manifest.json"] = manifest
    outputs = {name: encode(value).encode("utf-8") for name, value in objects.items()}
    outputs["report.md"] = report.encode("utf-8")
    return outputs


def run(check=False):
    outputs = assemble()
    for name, data in outputs.items():
        path = WS / name
        if check:
            require(path.is_file() and normalize_text_bytes(path.read_bytes()) == normalize_text_bytes(data),
                    "Checkpoint 06 output drift: " + name)
        else:
            require(path.resolve().is_relative_to(WS.resolve()), "Unsafe checkpoint output path")
            require(not path.exists() or normalize_text_bytes(path.read_bytes()) == normalize_text_bytes(data),
                    "Checkpoint 06 output is immutable: " + name)
            if not path.exists():
                path.write_bytes(data)
    return {"fingerprint": load(WS / "manifest.json")["fingerprint"], "status": "PARTIAL", "zeroWrites": check}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.prepare:
        receipt = prepare()
        print("PREPARED", len(receipt["coverage"]), receipt["coverage"][0]["candidateGroupKey"], receipt["coverage"][-1]["candidateGroupKey"])
    else:
        print(encode(run(args.check)))


if __name__ == "__main__":
    main()
