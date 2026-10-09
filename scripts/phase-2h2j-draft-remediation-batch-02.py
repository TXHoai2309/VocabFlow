#!/usr/bin/env python3
"""Offline, additive Phase 2H.2J-R2 DRAFT remediation layer."""

import argparse
import copy
import hashlib
import importlib.util
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "vocabflow-dataset/workspaces/master-editorial-aggregate-qa"
AUDIT_RESUME = ROOT / "vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume"
CP07 = AUDIT_RESUME / "checkpoints/checkpoint-07"
PILOT_SCRIPT = ROOT / "scripts/phase-2h2j-draft-remediation-pilot-01.py"
PILOT_TEST = ROOT / "scripts/phase-2h2j-draft-remediation-pilot-01-test.py"
PILOT_WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/pilot-01"
WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/batch-02"
INDEX = AUDIT / "effective-sense-index.json"
ROOT_PROPOSALS = AUDIT / "correction-proposals.json"
CP07_FIELDS = CP07 / "authored/new-field-correction-proposals.json"

PARENT_COMMIT = "67a70f5c87030b459f09fa7203404bd7b4e6b69f"
PARENT_PILOT_FINGERPRINT = "7b7e93bd26bcbac1d18e02b52b929e382722223c67bbe7455bbf9caf1d3a4283"
PARENT_AUDIT_FINGERPRINT = "9c90d8c2f2b964e128e19c5db807336d754573467f7f783a8a666e54a242ed77"
PARENT_HANDOFF_FINGERPRINT = "862be642a7223396f43664ca8604d986a5c1f5cbad91c9ab295492f819ff4ed8"
FROZEN_COHORT = "2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44"
PILOT_APPLIED = {
    "2H2I-R1-P008", "2H2I-R1-P009", "2H2I-R1-P010",
}
PILOT_DEFERRED = "2H2I-R6-P001"
SELECTED_IDS = [
    "2H2I-R3-P001",       # clear Vietnamese example defect, source batch 06
    "2H2I-P003",          # grammar-note process commentary, source batch 17
    "2H2I-R1-P006",       # adjective grammar note, source batch 20
    "2H2I-R1-P007",       # noun grammar note, source batch 20
    "2H2I-R1-P005",       # countability note, resumed source batch 30
]
MAX_CANDIDATES = 40
MAX_APPLIED = 30
MAX_BATCHES = 8

SOURCE_AUDIT_QA = [
    ("vocabflow-dataset/workspaces/master-editorial-bulk-500",
     "vocabflow-dataset/workspaces/master-editorial-bulk-500/quality-audit.json",
     "vocabflow-dataset/workspaces/master-editorial-bulk-500/effective-draft-index.json"),
    *[
        (f"vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-{n:02}",
         f"vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-{n:02}/quality-audit.json",
         f"vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-{n:02}/effective-draft-projection.json")
        for n in range(2, 6)
    ],
]
PREPARED_FILES = [
    "accepted-parent-pins.json",
    "candidate-inventory.json",
    "batch-selection-receipt.json",
]
ELIGIBILITY = "authored/eligibility-assessments.json"
APPLICATION = "authored/application-decisions.json"
FULL_BATCH_INPUT = "authored/full-batch-review-assessments.json"
VERIFY_FILE = "verification-results.json"
BOUNDARY_GROUPS = {
    "condensed", "hail", "to", "elastic", "high", "harness", "fiery", "instrumental",
}
EXPLICIT_IDENTITY_DEPENDENCIES = {
    "2H2I-P001": "cross-POS source group and unresolved determiner/adverb/noun/verb boundary",
    "2H2I-P002": "infinitive-marker ordinal is explicitly undrafted; a second POS would require separate boundary review",
    "2H2I-P004": "proposed AFTER adds an adverb construction beyond the accepted adjective Sense",
    "2H2I-R4-P023": "contradictory PREPOSITION evidence and distance/additional-quantity boundary remain unresolved",
}
REVIEW_DIMENSIONS = [
    "grammar", "meaningPreservation", "englishNaturalness", "vietnameseFaithfulness",
    "posAndConstruction", "sourceEvidence", "priorCorrectionLineage", "historicalQa",
    "siblingSenseConsistency", "rightsAndOriginalitySignals",
]
AUTH = {
    "phase": "2H.2J-R2",
    "contentStatus": "DRAFT",
    "ownerApprovalsAdded": 0,
    "canonicalIdsAllocated": 0,
    "rightsClearanceAdded": 0,
    "rights": "UNKNOWN_REVIEW_REQUIRED",
    "databaseAccess": "NONE",
    "databaseWrites": "NONE",
    "masterReleaseChanged": False,
    "legacyModified": False,
    "production": "UNTOUCHED",
    "publicationEligible": False,
}


def read(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def sha_bytes(value):
    return hashlib.sha256(value).hexdigest()


def sha_file(path):
    return sha_bytes(Path(path).read_bytes())


def stable_text_sha(path):
    return sha_bytes(Path(path).read_bytes().replace(b"\r\n", b"\n"))


def digest(value):
    return sha_bytes(json.dumps(value, ensure_ascii=False, sort_keys=True,
                                separators=(",", ":")).encode("utf-8"))


def text_sha(value):
    return sha_bytes(value.encode("utf-8"))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


def pilot_module():
    return module("phase_2h2j_pilot_01_parent", PILOT_SCRIPT)


def verify_parents():
    pilot = pilot_module()
    replay = pilot.run(True)
    require(replay["fingerprint"] == PARENT_PILOT_FINGERPRINT
            and replay["zeroWrites"] is True,
            "Accepted Pilot 01 replay or fingerprint drift")
    cp07 = module("phase_2h2i_checkpoint_07_parent",
                  ROOT / "scripts/phase-2h2i-aggregate-qa-checkpoint-07.py")
    audit = cp07.run(True)
    require(audit["fingerprint"] == PARENT_AUDIT_FINGERPRINT
            and audit["finalHandoffFingerprint"] == PARENT_HANDOFF_FINGERPRINT
            and audit["zeroWrites"] is True,
            "Accepted Phase 2H.2I audit replay or fingerprint drift")
    pilot_manifest = read(PILOT_WS / "manifest.json")
    require(pilot_manifest["fingerprint"] == PARENT_PILOT_FINGERPRINT
            and pilot_manifest["parentFinalAuditFingerprint"] == PARENT_AUDIT_FINGERPRINT
            and pilot_manifest["parentFinalAuditHandoffFingerprint"] == PARENT_HANDOFF_FINGERPRINT,
            "Pilot 01 manifest lineage drift")
    audit_manifest = read(CP07 / "manifest.json")
    handoff = read(CP07 / "final-handoff-manifest.json")
    require(audit_manifest["fingerprint"] == PARENT_AUDIT_FINGERPRINT
            and handoff["fingerprint"] == PARENT_HANDOFF_FINGERPRINT
            and handoff["coverage"]["assessed"] == 500
            and handoff["coverage"]["pending"] == 0,
            "Accepted aggregate audit manifest/handoff drift")
    return pilot, pilot_manifest, audit_manifest, handoff


def source_proposals(pilot):
    proposals, sources = pilot.all_historical_proposals()
    cp07_rows = read(CP07_FIELDS)["records"]
    require(len(cp07_rows) == 1 and cp07_rows[0]["correctionProposalId"] == PILOT_DEFERRED,
            "Checkpoint 07 field correction proposal drift")
    sources.append({
        "label": "checkpoint-07-new-field-proposals",
        "path": CP07_FIELDS.relative_to(ROOT).as_posix(),
        "sha256": sha_file(CP07_FIELDS),
        "proposalCount": len(cp07_rows),
    })
    proposals.extend({
        **copy.deepcopy(row),
        "_sourcePath": CP07_FIELDS.relative_to(ROOT).as_posix(),
        "_sourceSha256": sha_file(CP07_FIELDS),
    } for row in cp07_rows)
    require(len(proposals) == 141
            and len({p["correctionProposalId"] for p in proposals}) == 141,
            "Historical inventory must contain exactly 141 unique field proposal IDs")
    return proposals, sources


def authored_batch_inventory():
    indexed = defaultdict(list)
    pins = {}
    for folder_rel, qa_rel, projection_rel in SOURCE_AUDIT_QA:
        folder = ROOT / folder_rel
        qa_path = ROOT / qa_rel
        projection = ROOT / projection_rel
        manifest_path = folder / "manifest.json"
        require(qa_path.is_file() and projection.is_file() and manifest_path.is_file(),
                "Accepted authored batch evidence is incomplete: " + folder_rel)
        qa = read(qa_path)
        for batch in qa.get("batches", []):
            number = batch["batch"]
            authored = folder / "authored" / f"batch-{number:03}.json"
            psv = folder / "authored" / f"batch-{number:03}.psv"
            review = folder / "authored" / f"batch-{number:03}.review.psv"
            require(all(path.is_file() for path in [authored, psv, review]),
                    "Accepted authored batch source is incomplete: " + str(number))
            source = {
                "checkpoint": Path(folder_rel).name,
                "batch": number,
                "groupKeys": copy.deepcopy(batch["groupKeys"]),
                "senseCount": batch["senseCount"],
                "qualityAudit": {"path": qa_path.relative_to(ROOT).as_posix(),
                                 "sha256": sha_file(qa_path)},
                "effectiveProjection": {"path": projection.relative_to(ROOT).as_posix(),
                                        "sha256": sha_file(projection)},
                "manifest": {"path": manifest_path.relative_to(ROOT).as_posix(),
                             "sha256": sha_file(manifest_path)},
                "authoredJson": {"path": authored.relative_to(ROOT).as_posix(),
                                 "sha256": sha_file(authored)},
                "authoredPsv": {"path": psv.relative_to(ROOT).as_posix(),
                                "sha256": sha_file(psv)},
                "reviewPsv": {"path": review.relative_to(ROOT).as_posix(),
                              "sha256": sha_file(review)},
                "priorFullBatchReview": batch["fullBatchReview"],
                "priorBatchSha256": batch["sha256"],
            }
            pins[f"{source['checkpoint']}:{number:03}"] = source
            for group in batch["groupKeys"]:
                indexed[group].append(source)
    return indexed, pins


def pointer_get(value, pointer):
    require(pointer.startswith("/"), "Field pointer must be absolute")
    current = value
    for raw in pointer[1:].split("/"):
        key = raw.replace("~1", "/").replace("~0", "~")
        current = current[int(key)] if isinstance(current, list) else current[key]
    return current


def pointer_set(value, pointer, replacement):
    require(pointer.startswith("/"), "Field pointer must be absolute")
    parts = [part.replace("~1", "/").replace("~0", "~")
             for part in pointer[1:].split("/")]
    current = value
    for part in parts[:-1]:
        current = current[int(part)] if isinstance(current, list) else current[part]
    tail = parts[-1]
    if isinstance(current, list):
        current[int(tail)] = replacement
    else:
        current[tail] = replacement


def record_hash(row, pilot):
    return pilot.current_hash(row)


def load_context():
    pilot, pilot_manifest, audit_manifest, handoff = verify_parents()
    original_rows = read(INDEX)["records"]
    current_rows = read(PILOT_WS / "remediated-effective-draft-projection.json")["records"]
    require(len(original_rows) == 1563 and len(current_rows) == 1563
            and len({row["proposalKey"] for row in current_rows}) == 1563,
            "Parent effective projection count/identity drift")
    require(len({row["candidateGroupKey"] for row in current_rows}) == 1020,
            "Parent authored group count drift")
    original = {row["proposalKey"]: row for row in original_rows}
    current = {row["proposalKey"]: row for row in current_rows}
    require(all(record_hash(row, pilot) == row["effectiveContentHash"]
                for row in current_rows),
            "Pilot 01 current row content hash drift")
    for row in original_rows:
        require(record_hash(row, pilot) == row["effectiveContentHash"],
                "Original accepted effective index content hash drift")
    require(set(original) == set(current), "Pilot 01 proposal identities differ from base")

    proposals, proposal_sources = source_proposals(pilot)
    for proposal in proposals:
        pilot.validate_proposal(proposal, original)
    boundaries, boundary_sources = pilot.all_boundaries()
    require(len(boundaries) == 8, "Accepted boundary proposal count drift")

    pilot_applied = read(PILOT_WS / "applied-draft-corrections.json")["corrections"]
    pilot_revisions = read(PILOT_WS / "draft-revisions.json")["records"]
    pilot_mapping = read(PILOT_WS / "remediated-content-hash-mapping.json")["records"]
    applied_ids = {item["correctionProposalId"] for item in pilot_applied}
    require(applied_ids == PILOT_APPLIED, "Pilot 01 applied correction IDs drift")
    changed_from_original = {
        key for key in original
        if original[key]["effectiveContentHash"] != current[key]["effectiveContentHash"]
    }
    require(changed_from_original == {
        item["proposalKey"] for item in pilot_revisions
    } and len(pilot_revisions) == 3,
        "Pilot 01 effective projection does not preserve exactly its three revisions")
    mapping = {item["proposalKey"]: item for item in pilot_mapping}
    require(len(mapping) == 1563 and set(mapping) == set(original),
            "Pilot 01 content hash mapping inventory drift")
    for key in original:
        require(mapping[key]["remediatedEffectiveContentHash"]
                == current[key]["effectiveContentHash"],
                "Pilot 01 content hash mapping differs from its projection")
    for proposal_id in PILOT_APPLIED:
        proposal = next(p for p in proposals if p["correctionProposalId"] == proposal_id)
        key = proposal["proposalKey"]
        require(mapping[key]["originalEffectiveContentHash"]
                == original[key]["effectiveContentHash"]
                and mapping[key]["remediatedEffectiveContentHash"]
                != mapping[key]["originalEffectiveContentHash"],
                "Pilot 01 applied revision is missing its exact parent hash mapping")

    batch_index, batch_pins = authored_batch_inventory()
    proposal_fields = defaultdict(list)
    for proposal in proposals:
        proposal_fields[(proposal["proposalKey"], proposal["field"])].append(proposal)
    pilot_lot_review = next(
        item for item in read(PILOT_WS / "authored/eligibility-assessments.json")["records"]
        if item["correctionProposalId"] == PILOT_DEFERRED
    )
    require(pilot_lot_review["eligibilityStatus"] == "DEFER_SEMANTIC_RISK",
            "Pilot 01 lot deferral was not preserved")

    indexed_proposals = []
    for proposal in proposals:
        key = proposal["proposalKey"]
        row = current[key]
        matches = batch_index.get(row["candidateGroupKey"], [])
        if len(matches) > 1:
            # The accepted checkpoint origin disambiguates cumulative copies.
            origin_to_checkpoint = {
                "ORIGINAL": "master-editorial-bulk-500",
                "CHECKPOINT_02": "checkpoint-02",
                "CHECKPOINT_03": "checkpoint-03",
                "CHECKPOINT_04": "checkpoint-04",
                "CHECKPOINT_05": "checkpoint-05",
            }
            expected = origin_to_checkpoint.get(row.get("origin"))
            selected_matches = [match for match in matches
                                if match["checkpoint"] == expected]
            if selected_matches:
                matches = selected_matches
        batch = matches[0] if len(matches) == 1 else None
        competing = proposal_fields[(key, proposal["field"])]
        if proposal["correctionProposalId"] in applied_ids:
            status = "ALREADY_APPLIED_IN_PILOT_01"
            dependency = "PILOT_01_REVISION_ALREADY_IN_PARENT_PROJECTION"
        elif proposal["correctionProposalId"] == PILOT_DEFERRED:
            status = "PREVIOUSLY_DEFERRED"
            dependency = "EXACT_PILOT_01_SEMANTIC_AGENCY_DEFERRAL"
        elif row["effectiveContentHash"] != proposal["originalEffectiveContentHash"]:
            status = "CURRENT_HASH_CONFLICT"
            dependency = "HISTORICAL_PARENT_HASH_DIFFERS_FROM_CUMULATIVE_PARENT"
        elif len(competing) > 1:
            status = "DUPLICATE_FIELD_PROPOSAL"
            dependency = "COMPETING_PROPOSALS_TARGET_SAME_SENSE_FIELD"
        elif proposal["correctionProposalId"] in EXPLICIT_IDENTITY_DEPENDENCIES:
            status = "REQUIRES_BOUNDARY_OR_IDENTITY_DECISION"
            dependency = EXPLICIT_IDENTITY_DEPENDENCIES[proposal["correctionProposalId"]]
        elif proposal["proposalKey"].split(":")[1].casefold() in BOUNDARY_GROUPS:
            status = "REQUIRES_BOUNDARY_OR_IDENTITY_DECISION"
            dependency = "SENSE_GROUP_IS_IN_ACCEPTED_BOUNDARY_PROPOSAL_SET"
        else:
            status = "CANDIDATE_NOT_YET_REVIEWED"
            dependency = (
                "ORIGINAL_AUTHORED_BATCH_PINNED"
                if batch else "ORIGINAL_AUTHORED_BATCH_MEMBERSHIP_NOT_FOUND_IN_ACCEPTED_QA"
            )
        if proposal["correctionProposalId"] in SELECTED_IDS:
            require(status == "CANDIDATE_NOT_YET_REVIEWED" and batch is not None,
                    "Selected candidate has conflict or missing accepted batch evidence: "
                    + proposal["correctionProposalId"])
        indexed_proposals.append({
            "correctionProposalId": proposal["correctionProposalId"],
            "proposalKey": key,
            "candidateGroupKey": row["candidateGroupKey"],
            "sourceCheckpoint": proposal["_sourcePath"],
            "sourceProposalSha256": proposal["_sourceSha256"],
            "field": proposal["field"],
            "historicalParentContentHash": proposal["originalEffectiveContentHash"],
            "before": proposal["before"],
            "after": proposal["after"],
            "beforeFieldSha256": proposal["beforeSha256"],
            "afterFieldSha256": proposal["afterSha256"],
            "evidence": {
                "sourceEvidence": copy.deepcopy(row.get("sourceEvidence", [])),
                "sourceMembership": copy.deepcopy(row.get("sourceMembership", [])),
                "historicalQaFindings": copy.deepcopy(row.get("historicalQaFindings", [])),
                "pinnedHistoricalQaReferences": copy.deepcopy(row.get("pinnedHistoricalQaReferences", [])),
                "proposalRationaleVi": proposal.get("rationaleVi"),
            },
            "priority": proposal.get("priority"),
            "severity": proposal.get("severity"),
            "originalAuthoredBatch": copy.deepcopy(batch),
            "pilot01ApplicationStatus": (
                "APPLIED" if proposal["correctionProposalId"] in applied_ids
                else "DEFERRED" if proposal["correctionProposalId"] == PILOT_DEFERRED
                else "NOT_APPLIED"
            ),
            "currentEffectiveContentHash": row["effectiveContentHash"],
            "conflictDependencyStatus": dependency,
            "inventoryStatus": status,
        })

    indexed = {item["correctionProposalId"]: item for item in indexed_proposals}
    require(set(indexed) == {p["correctionProposalId"] for p in proposals}
            and len(indexed) == 141,
            "Candidate index omitted or duplicated historical proposals")
    candidates = []
    for proposal_id in SELECTED_IDS:
        item = indexed[proposal_id]
        candidates.append({
            "correctionProposalId": proposal_id,
            "proposalKey": item["proposalKey"],
            "candidateGroupKey": item["candidateGroupKey"],
            "sourceCheckpoint": item["sourceCheckpoint"],
            "originalAuthoredBatch": item["originalAuthoredBatch"],
            "historicalParentContentHash": item["historicalParentContentHash"],
            "parentEffectiveContentHash": item["currentEffectiveContentHash"],
            "field": item["field"],
            "before": item["before"],
            "after": item["after"],
            "beforeFieldSha256": item["beforeFieldSha256"],
            "afterFieldSha256": item["afterFieldSha256"],
            "selectionBasis": (
                "HIGH_CONFIDENCE_BILINGUAL_EXAMPLE_REPAIR"
                if proposal_id == "2H2I-R3-P001"
                else "LOW_RISK_LEARNER_FACING_GRAMMAR_NOTE_CANDIDATE"
            ),
        })
    batch_keys = {
        (item["originalAuthoredBatch"]["checkpoint"], item["originalAuthoredBatch"]["batch"])
        for item in candidates
    }
    require(len(candidates) <= MAX_CANDIDATES and len(batch_keys) <= MAX_BATCHES,
            "Batch selection exceeds authorized candidate or original-batch cap")
    require(len({(c["proposalKey"], c["field"]) for c in candidates}) == len(candidates),
            "Selection has duplicate field targets")

    priority_accounting = read(CP07 / "prioritized-remediation-queue.json")
    require(priority_accounting["cumulativePriorityCounts"] == {
        "P0": 0, "P1": 10, "P2": 103, "P3": 164,
    } and priority_accounting["deduplicatedInventoryPriorityCounts"] == {
        "P0": 0, "P1": 17, "P2": 31, "P3": 140,
    }, "Historical priority accounting drift")
    selection = {
        "phase": "2H.2J-R2",
        "batch": "TARGETED_DRAFT_REMEDIATION_BATCH_02",
        "status": "SELECTED_FOR_INDEPENDENT_REVIEW",
        "parentPilotFingerprint": PARENT_PILOT_FINGERPRINT,
        "parentAuditFingerprint": PARENT_AUDIT_FINGERPRINT,
        "parentHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
        "selectionMethod": "FIXED_STABLE_REVIEW_ORDER_AFTER_COMPLETE_141_ITEM_INDEX",
        "selectionPolicy": [
            "Prioritize confirmed learner-facing language defects.",
            "Then prioritize safe replacement of process commentary with learner-facing grammar.",
            "Use only proposals with exact current hashes and pinned original authored-batch evidence.",
            "Group review by original batch and stop at the 8-batch cap.",
            "Do not select replacements if an assessment defers or rejects a candidate.",
        ],
        "candidateInventorySha256": None,
        "candidateIdsInStableOrder": SELECTED_IDS,
        "selectedCandidateCount": len(candidates),
        "selectedBatchCount": len(batch_keys),
        "candidates": candidates,
        "explicitExclusions": {
            PILOT_DEFERRED: {
                "proposalKey": "EDITORIAL_2H2H:lot:quantity-before-noun",
                "status": "PREVIOUSLY_DEFERRED",
                "reason": pilot_lot_review["reviewExplanationVi"],
                "currentEffectiveContentHash": indexed[PILOT_DEFERRED]["currentEffectiveContentHash"],
            },
            "pilot01AlreadyApplied": sorted(PILOT_APPLIED),
            "boundaryProposalCount": len(boundaries),
        },
        "historicalPriorityAccounting": {
            "cumulativePriorityCounts": priority_accounting["cumulativePriorityCounts"],
            "deduplicatedInventoryPriorityCounts": priority_accounting["deduplicatedInventoryPriorityCounts"],
        },
        "authorization": AUTH,
    }
    inventory = {
        "phase": "2H.2J-R2",
        "status": "COMPLETE_141_HISTORICAL_FIELD_PROPOSAL_INDEX",
        "parentPilotFingerprint": PARENT_PILOT_FINGERPRINT,
        "sourceProposalFiles": proposal_sources,
        "fieldProposalCount": len(indexed_proposals),
        "uniqueCorrectionProposalIds": len(indexed),
        "records": indexed_proposals,
        "boundaryProposalCount": len(boundaries),
        "boundaryProposalSources": boundary_sources,
        "authorization": AUTH,
    }
    selection["candidateInventorySha256"] = text_sha(encode(inventory))

    original_projection_pin = {
        "path": INDEX.relative_to(ROOT).as_posix(),
        "sha256": sha_file(INDEX),
        "count": len(original_rows),
        "authoredGroups": len({row["candidateGroupKey"] for row in original_rows}),
    }
    pilot_projection_path = PILOT_WS / "remediated-effective-draft-projection.json"
    pilot_mapping_path = PILOT_WS / "remediated-content-hash-mapping.json"
    parent_pins = {
        "phase": "2H.2J-R2",
        "parentRemoteCommit": PARENT_COMMIT,
        "parentPilotFingerprint": PARENT_PILOT_FINGERPRINT,
        "parentPilotManifestSha256": sha_file(PILOT_WS / "manifest.json"),
        "parentPilotProjection": {
            "path": pilot_projection_path.relative_to(ROOT).as_posix(),
            "sha256": sha_file(pilot_projection_path),
            "mappingPath": pilot_mapping_path.relative_to(ROOT).as_posix(),
            "mappingSha256": sha_file(pilot_mapping_path),
            "recordCount": len(current_rows),
        },
        "originalEffectiveProjection": original_projection_pin,
        "parentAuditCheckpoint07": {
            "path": (CP07 / "manifest.json").relative_to(ROOT).as_posix(),
            "sha256": sha_file(CP07 / "manifest.json"),
            "fingerprint": PARENT_AUDIT_FINGERPRINT,
        },
        "parentAuditHandoff": {
            "path": (CP07 / "final-handoff-manifest.json").relative_to(ROOT).as_posix(),
            "sha256": sha_file(CP07 / "final-handoff-manifest.json"),
            "fingerprint": PARENT_HANDOFF_FINGERPRINT,
        },
        "proposalSources": proposal_sources,
        "boundaryProposalSources": boundary_sources,
        "acceptedBatchSources": batch_pins,
        "pilot01Script": {
            "path": PILOT_SCRIPT.relative_to(ROOT).as_posix(),
            "sha256": sha_file(PILOT_SCRIPT),
        },
        "pilot01Test": {
            "path": PILOT_TEST.relative_to(ROOT).as_posix(),
            "sha256": sha_file(PILOT_TEST),
        },
        "overlayContract": {
            "script": "scripts/phase-2h2g-draft-v2.py",
            "scriptSha256": sha_file(ROOT / "scripts/phase-2h2g-draft-v2.py"),
            "test": "scripts/phase-2h2g-draft-v2-test.py",
            "testSha256": sha_file(ROOT / "scripts/phase-2h2g-draft-v2-test.py"),
            "acceptedOverlayFingerprint": "6633405d49aa0e211265d38be37b074e99cd783d787681d4a25909843a7fe071",
        },
        "frozenAuthoringCohortFingerprint": FROZEN_COHORT,
        "authorization": AUTH,
    }
    return {
        "pilot": pilot,
        "pilotManifest": pilot_manifest,
        "auditManifest": audit_manifest,
        "handoff": handoff,
        "originalRows": original,
        "parentRows": current,
        "proposals": proposals,
        "proposalSources": proposal_sources,
        "boundaries": boundaries,
        "boundarySources": boundary_sources,
        "batchPins": batch_pins,
        "inventory": inventory,
        "selection": selection,
        "parentPins": parent_pins,
        "originalProjectionPin": original_projection_pin,
        "pilotApplied": pilot_applied,
        "pilotRevisions": pilot_revisions,
    }


def immutable_write(path, content, check=False, allow_provisional_rebuild=False):
    expected = content.encode("utf-8")
    if check:
        require(Path(path).is_file() and Path(path).read_bytes().replace(b"\r\n", b"\n") == expected,
                "Replay drift: " + str(path.relative_to(ROOT)))
        return
    exists = Path(path).exists()
    differs = exists and Path(path).read_bytes().replace(b"\r\n", b"\n") != expected
    require(not differs or allow_provisional_rebuild,
            "Refusing to overwrite different immutable Batch 02 artifact: "
            + str(path.relative_to(ROOT)))
    if not exists or differs:
        require(Path(path).resolve().is_relative_to(WS.resolve()),
                "Unsafe Batch 02 output path")
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        Path(path).write_bytes(expected)


def prepare(check=False):
    context = load_context()
    objects = {
        "accepted-parent-pins.json": context["parentPins"],
        "candidate-inventory.json": context["inventory"],
        "batch-selection-receipt.json": context["selection"],
    }
    for name, obj in objects.items():
        immutable_write(WS / name, encode(obj), check)
    return {
        "status": "PREPARED_FOR_INDEPENDENT_REVIEW",
        "candidateCount": context["selection"]["selectedCandidateCount"],
        "batchCount": context["selection"]["selectedBatchCount"],
        "fingerprint": digest(objects),
        "zeroWrites": check,
    }


def ensure_prepared(context):
    for name, value in [
        ("accepted-parent-pins.json", context["parentPins"]),
        ("candidate-inventory.json", context["inventory"]),
        ("batch-selection-receipt.json", context["selection"]),
    ]:
        path = WS / name
        require(path.is_file() and path.read_bytes().replace(b"\r\n", b"\n")
                == encode(value).encode("utf-8"),
                "Prepared parent pin/inventory/selection is missing or was changed: " + name)


def load_authored(context):
    ensure_prepared(context)
    selection = read(WS / "batch-selection-receipt.json")
    eligibility = read(WS / ELIGIBILITY)
    application = read(WS / APPLICATION)
    batch_review = read(WS / FULL_BATCH_INPUT)
    require(selection["candidateIdsInStableOrder"] == SELECTED_IDS,
            "Selection candidate order drift")
    selected_by_id = {c["correctionProposalId"]: c for c in selection["candidates"]}
    proposals = {p["correctionProposalId"]: p for p in context["proposals"]}
    parent = context["parentRows"]
    require([r["correctionProposalId"] for r in eligibility["records"]] == SELECTED_IDS,
            "Eligibility assessments must cover the exact immutable selection in order")
    require([r["correctionProposalId"] for r in application["records"]] == SELECTED_IDS,
            "Application decisions must cover the exact immutable selection in order")
    allowed_statuses = {
        "APPLY_ELIGIBLE", "DEFER_SEMANTIC_RISK", "DEFER_POS_OR_IDENTITY",
        "DEFER_STALE_REVISION", "DEFER_CONFLICTING_PROPOSALS",
        "DEFER_INSUFFICIENT_EVIDENCE", "REJECT_INCORRECT_CORRECTION",
    }
    for assessment, decision in zip(eligibility["records"], application["records"]):
        proposal_id = assessment["correctionProposalId"]
        selection_item = selected_by_id[proposal_id]
        proposal = proposals[proposal_id]
        row = parent[proposal["proposalKey"]]
        require(assessment["eligibilityStatus"] in allowed_statuses
                and assessment["proposalKey"] == proposal["proposalKey"]
                and assessment["field"] == proposal["field"]
                and assessment["before"] == proposal["before"]
                and assessment["after"] == proposal["after"]
                and assessment["parentEffectiveContentHash"] == row["effectiveContentHash"]
                == selection_item["parentEffectiveContentHash"]
                and assessment["reviewedContentHash"] == row["effectiveContentHash"]
                and pointer_get(row, proposal["field"]) == proposal["before"]
                and assessment["beforeFieldSha256"] == text_sha(proposal["before"])
                and assessment["afterFieldSha256"] == text_sha(proposal["after"])
                and assessment["reviewExplanationVi"].strip(),
                "Eligibility assessment is stale, incomplete, or not Vietnamese-reasoned: "
                + proposal_id)
        require(assessment["reviewedContentSnapshot"] == {
            "headword": row["headword"],
            "partOfSpeech": row["partOfSpeech"],
            "content": row["content"],
            "sourceEvidence": row.get("sourceEvidence", []),
            "historicalQaFindings": row.get("historicalQaFindings", []),
            "pinnedHistoricalQaReferences": row.get("pinnedHistoricalQaReferences", []),
        }, "Eligibility review snapshot differs from accepted current effective content: "
           + proposal_id)
        require(set(assessment["reviewDimensions"]) == set(REVIEW_DIMENSIONS)
                and all(isinstance(value, bool)
                        for value in assessment["reviewDimensions"].values()),
                "Eligibility review dimensions are incomplete: " + proposal_id)
        expected_decision = (
            "APPLY_TO_CUMULATIVE_DRAFT_LAYER"
            if assessment["eligibilityStatus"] == "APPLY_ELIGIBLE"
            else "REJECT_PROPOSAL_NO_REVISION"
            if assessment["eligibilityStatus"] == "REJECT_INCORRECT_CORRECTION"
            else "DEFER_NO_REVISION"
        )
        require(decision["decision"] == expected_decision
                and decision["eligibilityStatus"] == assessment["eligibilityStatus"]
                and decision["parentEffectiveContentHash"] == row["effectiveContentHash"]
                and decision["correctionProposalId"] == proposal_id
                and decision["ownerApproval"] is False
                and decision["canonicalIdAllocated"] is False
                and decision["rightsClearanceAdded"] is False,
                "Application decision exceeds eligibility or authorization: " + proposal_id)
        require(decision["decisionExplanationVi"].strip(),
                "Application decision must carry a specific Vietnamese explanation")

    actual_review = verify_batch_review_input(context, batch_review)
    return {
        "selection": selection,
        "eligibility": eligibility,
        "application": application,
        "batchReview": batch_review,
        "proposalsById": proposals,
        "batchReviewContext": actual_review,
    }


def verify_batch_review_input(context, document):
    require(document["reviewKind"] == "AI_FULL_AUTHORED_BATCH_REVIEW_NOT_OWNER_APPROVAL"
            and document["parentPilotFingerprint"] == PARENT_PILOT_FINGERPRINT
            and document["selectedProposalIds"] == SELECTED_IDS,
            "Full-batch review metadata or parent pin drift")
    parent = context["parentRows"]
    reviewed_projection = copy.deepcopy(parent)
    eligibility_by_id = {
        row["correctionProposalId"]: row
        for row in read(WS / ELIGIBILITY)["records"]
    }
    proposal_by_id = {
        row["correctionProposalId"]: row for row in context["proposals"]
    }
    for proposal_id in SELECTED_IDS:
        if eligibility_by_id[proposal_id]["eligibilityStatus"] != "APPLY_ELIGIBLE":
            continue
        proposal = proposal_by_id[proposal_id]
        row = reviewed_projection[proposal["proposalKey"]]
        require(row["effectiveContentHash"]
                == eligibility_by_id[proposal_id]["parentEffectiveContentHash"],
                "Full-batch review simulation has a stale parent hash: " + proposal_id)
        require(pointer_get(row, proposal["field"]) == proposal["before"],
                "Full-batch review simulation found a stale BEFORE value: " + proposal_id)
        pointer_set(row, proposal["field"], proposal["after"])
        row["effectiveContentHash"] = context["pilot"].current_hash(row)
    batches = document["batches"]
    expected_sources = {}
    for candidate in context["selection"]["candidates"]:
        batch = candidate["originalAuthoredBatch"]
        ref = (batch["checkpoint"], batch["batch"])
        expected_sources[ref] = batch
    batch_key = lambda item: (item["sourceCheckpoint"], item["batch"])
    expected_keys = set(expected_sources)
    require(len(batches) == len(expected_keys)
            and {batch_key(item) for item in batches} == expected_keys,
            "Full-batch review must cover exactly every selected candidate's original batch")
    all_reviews = {}
    checked_batches = []
    for batch in batches:
        key = batch_key(batch)
        expected = expected_sources[key]
        require(batch["groupKeys"] == expected["groupKeys"]
                and batch["senseCount"] == expected["senseCount"]
                and batch["sourceReferences"] == {
                    "qualityAudit": expected["qualityAudit"],
                    "effectiveProjection": expected["effectiveProjection"],
                    "manifest": expected["manifest"],
                    "authoredJson": expected["authoredJson"],
                    "authoredPsv": expected["authoredPsv"],
                    "reviewPsv": expected["reviewPsv"],
                }, "Original batch source pin or membership drift: " + str(key))
        expected_rows = sorted(
            [row for row in reviewed_projection.values()
             if row["candidateGroupKey"] in set(expected["groupKeys"])],
            key=lambda row: row["proposalKey"],
        )
        reviews = batch["senseReviews"]
        require(len(expected_rows) == expected["senseCount"]
                and len(reviews) == expected["senseCount"],
                "Complete original batch Sense count/re-review mismatch: " + str(key))
        require([r["proposalKey"] for r in reviews]
                == [row["proposalKey"] for row in expected_rows],
                "Full-batch member identities are missing, duplicated, or reordered: "
                + str(key))
        for review, row in zip(reviews, expected_rows):
            original_row = parent[row["proposalKey"]]
            require(review["candidateGroupKey"] == row["candidateGroupKey"]
                    and review["parentEffectiveContentHash"] == original_row["effectiveContentHash"]
                    and review["reviewedContentHash"] == row["effectiveContentHash"]
                    and review["reviewStatus"] in {"PASS", "REVIEW", "FAIL"}
                    and review["reviewExplanationVi"].strip()
                    and set(review["reviewDimensions"]) == set(REVIEW_DIMENSIONS)
                    and all(isinstance(value, bool)
                            for value in review["reviewDimensions"].values()),
                    "Full-batch Sense review is not bound or sufficiently dimensioned: "
                    + row["proposalKey"])
            require(review["reviewedContentSnapshot"] == {
                "headword": row["headword"],
                "partOfSpeech": row["partOfSpeech"],
                "content": row["content"],
                "sourceEvidence": row.get("sourceEvidence", []),
                "historicalQaFindings": row.get("historicalQaFindings", []),
                "pinnedHistoricalQaReferences": row.get("pinnedHistoricalQaReferences", []),
            }, "Full-batch review snapshot differs from the current effective Sense: "
               + row["proposalKey"])
            require(row["proposalKey"] not in all_reviews,
                    "Duplicate complete-batch review identity: " + row["proposalKey"])
            all_reviews[row["proposalKey"]] = review
        checked_batches.append({
            "sourceCheckpoint": key[0],
            "batch": key[1],
            "groupKeys": expected["groupKeys"],
            "senseCount": expected["senseCount"],
            "sourceReferences": batch["sourceReferences"],
            "reviewedProposalKeys": [row["proposalKey"] for row in expected_rows],
            "reviewedContentHashes": {
                row["proposalKey"]: row["effectiveContentHash"] for row in expected_rows
            },
            "priorFullBatchReview": expected["priorFullBatchReview"],
            "reviewStatusCounts": {
                status: sum(r["reviewStatus"] == status for r in reviews)
                for status in ["PASS", "REVIEW", "FAIL"]
            },
        })
    applied_ids = {
        row["correctionProposalId"] for row in context["proposals"]
        if row["correctionProposalId"] in SELECTED_IDS
    }
    eligibility = eligibility_by_id
    for proposal_id in applied_ids:
        if eligibility[proposal_id]["eligibilityStatus"] == "APPLY_ELIGIBLE":
            key = eligibility[proposal_id]["proposalKey"]
            require(all_reviews[key]["reviewStatus"] == "PASS",
                    "Newly revised Sense did not pass full-batch linguistic re-review: " + key)
            require(all(all_reviews[key]["reviewDimensions"][d]
                        for d in ["grammar", "meaningPreservation",
                                  "englishNaturalness", "vietnameseFaithfulness",
                                  "posAndConstruction"]),
                    "Newly revised Sense has unresolved content-quality dimension: " + key)
    return {"batches": checked_batches, "reviewsByKey": all_reviews}


def apply_eligible(context, authored):
    eligibility = {row["correctionProposalId"]: row
                   for row in authored["eligibility"]["records"]}
    decisions = {row["correctionProposalId"]: row
                 for row in authored["application"]["records"]}
    grouped = defaultdict(list)
    for proposal_id in SELECTED_IDS:
        if eligibility[proposal_id]["eligibilityStatus"] == "APPLY_ELIGIBLE":
            grouped[authored["proposalsById"][proposal_id]["proposalKey"]].append(proposal_id)
    revisions = []
    revised_rows = {}
    for proposal_key in sorted(grouped):
        original = context["parentRows"][proposal_key]
        cloned = copy.deepcopy(original)
        ids = grouped[proposal_key]
        field_targets = set()
        field_revisions = []
        for proposal_id in ids:
            proposal = authored["proposalsById"][proposal_id]
            require((proposal_key, proposal["field"]) not in field_targets,
                    "Duplicate field application rejected: " + proposal_id)
            field_targets.add((proposal_key, proposal["field"]))
            require(proposal_id not in PILOT_APPLIED
                    and proposal_id != PILOT_DEFERRED,
                    "Previously applied/deferred proposal cannot be reapplied: " + proposal_id)
            require(original["effectiveContentHash"]
                    == authored["selection"]["candidates"][
                        SELECTED_IDS.index(proposal_id)
                    ]["parentEffectiveContentHash"],
                    "Stale cumulative parent hash: " + proposal_id)
            require(pointer_get(cloned, proposal["field"]) == proposal["before"],
                    "BEFORE mismatch during cloned Batch 02 application: " + proposal_id)
            pointer_set(cloned, proposal["field"], proposal["after"])
            field_revisions.append({
                "correctionProposalId": proposal_id,
                "proposalKey": proposal_key,
                "candidateGroupKey": original["candidateGroupKey"],
                "fieldPointer": proposal["field"],
                "before": proposal["before"],
                "after": proposal["after"],
                "beforeFieldSha256": text_sha(proposal["before"]),
                "afterFieldSha256": text_sha(proposal["after"]),
                "previousEffectiveContentHash": original["effectiveContentHash"],
                "historicalProposalReference": {
                    "path": next(x["sourceCheckpoint"] for x in context["inventory"]["records"]
                                 if x["correctionProposalId"] == proposal_id),
                    "sha256": next(x["sourceProposalSha256"] for x in context["inventory"]["records"]
                                   if x["correctionProposalId"] == proposal_id),
                },
                "eligibilityStatus": eligibility[proposal_id]["eligibilityStatus"],
                "applicationDecision": decisions[proposal_id]["decision"],
            })
        revised_hash = record_hash(cloned, context["pilot"])
        cloned["effectiveContentHash"] = revised_hash
        revision_id = "DRAFT_REMEDIATION_BATCH_02:" + proposal_key
        upstream = [
            row for row in context["pilotRevisions"]
            if row["proposalKey"] == proposal_key
        ]
        revision = {
            "revisionId": revision_id,
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_02",
            "draftRevision": 2,
            "status": "AI_REVIEWED_DRAFT_FIELD_CORRECTION",
            "contentStatus": "DRAFT",
            "publicationEligible": False,
            "proposalKey": proposal_key,
            "candidateGroupKey": original["candidateGroupKey"],
            "sourceAuditCheckpoint": "PHASE_2H.2I_FINAL_CHECKPOINT_07",
            "parentLayer": "DRAFT_REMEDIATION_PILOT_01_EFFECTIVE_PROJECTION",
            "previousEffectiveContentHash": original["effectiveContentHash"],
            "revisedContentHash": revised_hash,
            "correctionProposalIds": ids,
            "fieldRevisions": field_revisions,
            "upstreamRevisionReferences": [
                {
                    "revisionId": item["revisionId"],
                    "previousEffectiveContentHash": item["previousEffectiveContentHash"],
                    "revisedContentHash": item["revisedContentHash"],
                    "revisionLayer": item["revisionLayer"],
                }
                for item in upstream
            ],
            "eligibilityAssessments": [
                eligibility[proposal_id] for proposal_id in ids
            ],
            "applicationDecisions": [decisions[proposal_id] for proposal_id in ids],
            "originalProvenance": {
                "editorialFieldProvenance": copy.deepcopy(original.get("editorialFieldProvenance")),
                "reviewFieldProvenance": copy.deepcopy(original.get("reviewFieldProvenance")),
                "pinnedCorrectionLineage": copy.deepcopy(original.get("pinnedCorrectionLineage", [])),
                "appliedCorrectionReferences": copy.deepcopy(original.get("appliedCorrectionReferences", [])),
                "sourceEvidence": copy.deepcopy(original.get("sourceEvidence", [])),
            },
            "rights": "UNKNOWN_REVIEW_REQUIRED",
            "ownerApproval": False,
            "canonicalIdAllocated": False,
            "record": cloned,
        }
        require({k: v for k, v in cloned.items()
                 if k not in {"content", "effectiveContentHash"}}
                == {k: v for k, v in original.items()
                    if k not in {"content", "effectiveContentHash"}},
                "Batch 02 revision changed non-content provenance or identity data")
        revisions.append(revision)
        revised_rows[proposal_key] = cloned
    applied_ids = [
        proposal_id for proposal_id in SELECTED_IDS
        if eligibility[proposal_id]["eligibilityStatus"] == "APPLY_ELIGIBLE"
    ]
    require(len(applied_ids) <= MAX_APPLIED, "Batch 02 application cap exceeded")
    return revisions, revised_rows


def build():
    context = load_context()
    authored = load_authored(context)
    revisions, revised_rows = apply_eligible(context, authored)
    review_context = authored["batchReviewContext"]
    all_rows = []
    mapping = []
    pilot_rows = context["parentRows"]
    for original in read(INDEX)["records"]:
        key = original["proposalKey"]
        current = copy.deepcopy(revised_rows.get(key, pilot_rows[key]))
        all_rows.append(current)
        previous_revisions = [
            row for row in context["pilotRevisions"] if row["proposalKey"] == key
        ]
        batch_revisions = [row for row in revisions if row["proposalKey"] == key]
        refs = [
            {"revisionId": row["revisionId"], "revisionLayer": row["revisionLayer"],
             "revisedContentHash": row["revisedContentHash"]}
            for row in [*previous_revisions, *batch_revisions]
        ]
        mapping.append({
            "proposalKey": key,
            "candidateGroupKey": original["candidateGroupKey"],
            "originalEffectiveContentHash": original["effectiveContentHash"],
            "pilot01EffectiveContentHash": pilot_rows[key]["effectiveContentHash"],
            "cumulativeEffectiveContentHash": current["effectiveContentHash"],
            "revisionLayers": refs,
            "latestRevisionLayer": (
                "DRAFT_REMEDIATION_BATCH_02" if batch_revisions
                else "DRAFT_REMEDIATION_PILOT_01" if previous_revisions
                else "ACCEPTED_BASE_UNCHANGED"
            ),
        })
    require(len(all_rows) == 1563 and len(mapping) == 1563
            and len({row["proposalKey"] for row in all_rows}) == 1563
            and len({row["candidateGroupKey"] for row in all_rows}) == 1020,
            "Cumulative DRAFT projection coverage drift")
    changed_batch = {
        row["proposalKey"] for row in mapping
        if row["pilot01EffectiveContentHash"] != row["cumulativeEffectiveContentHash"]
    }
    require(changed_batch == set(revised_rows),
            "Unselected content changed in Batch 02 projection")
    pilot_changed = {
        row["proposalKey"] for row in mapping
        if row["originalEffectiveContentHash"] != row["pilot01EffectiveContentHash"]
    }
    require(len(pilot_changed) == 3,
            "Cumulative projection did not preserve exactly three Pilot 01 revisions")
    for key in pilot_changed:
        row = next(r for r in all_rows if r["proposalKey"] == key)
        require(row == pilot_rows[key],
                "A Pilot 01-only Sense changed in Batch 02")

    eligibility_by_id = {
        row["correctionProposalId"]: row for row in authored["eligibility"]["records"]
    }
    application_by_id = {
        row["correctionProposalId"]: row for row in authored["application"]["records"]
    }
    applied_ids = [
        proposal_id for proposal_id in SELECTED_IDS
        if eligibility_by_id[proposal_id]["eligibilityStatus"] == "APPLY_ELIGIBLE"
    ]
    deferred_ids = [
        proposal_id for proposal_id in SELECTED_IDS
        if eligibility_by_id[proposal_id]["eligibilityStatus"].startswith("DEFER_")
    ]
    rejected_ids = [
        proposal_id for proposal_id in SELECTED_IDS
        if eligibility_by_id[proposal_id]["eligibilityStatus"] == "REJECT_INCORRECT_CORRECTION"
    ]
    require(len(applied_ids) + len(deferred_ids) + len(rejected_ids) == len(SELECTED_IDS),
            "Selection dispositions are not exhaustive")
    applied = []
    for revision in revisions:
        for field_revision in revision["fieldRevisions"]:
            applied.append({
                **field_revision,
                "revisionId": revision["revisionId"],
                "revisionLayer": revision["revisionLayer"],
                "revisedContentHash": revision["revisedContentHash"],
                "sourceAuditCheckpoint": revision["sourceAuditCheckpoint"],
                "rights": "UNKNOWN_REVIEW_REQUIRED",
                "contentStatus": "DRAFT",
                "ownerApproval": False,
                "canonicalIdAllocated": False,
            })
    reviews = [
        review for batch in authored["batchReview"]["batches"]
        for review in batch["senseReviews"]
    ]
    pass_count = sum(row["reviewStatus"] == "PASS" for row in reviews)
    review_count = sum(row["reviewStatus"] == "REVIEW" for row in reviews)
    fail_count = sum(row["reviewStatus"] == "FAIL" for row in reviews)
    require(fail_count == 0, "A full-batch re-review found a critical FAIL; do not accept projection")
    require(all(review_context["reviewsByKey"][rev["proposalKey"]]["reviewStatus"] == "PASS"
                for revision in revisions for rev in revision["fieldRevisions"]),
            "Newly revised field did not pass independent full-batch re-review")

    inventory_by_id = {
        row["correctionProposalId"]: row for row in context["inventory"]["records"]
    }
    dispositions = []
    for proposal_id in sorted(inventory_by_id):
        item = copy.deepcopy(inventory_by_id[proposal_id])
        if proposal_id in applied_ids:
            item["batch02Disposition"] = "APPLIED_TO_CUMULATIVE_DRAFT_LAYER"
        elif proposal_id in deferred_ids:
            item["batch02Disposition"] = "DEFERRED_NO_REVISION"
            item["batch02ReviewExplanationVi"] = eligibility_by_id[proposal_id]["reviewExplanationVi"]
        elif proposal_id in rejected_ids:
            item["batch02Disposition"] = "REJECTED_NO_REVISION"
            item["batch02ReviewExplanationVi"] = eligibility_by_id[proposal_id]["reviewExplanationVi"]
        elif item["inventoryStatus"] == "ALREADY_APPLIED_IN_PILOT_01":
            item["batch02Disposition"] = "ALREADY_APPLIED_IN_PILOT_01"
        elif item["inventoryStatus"] == "PREVIOUSLY_DEFERRED":
            item["batch02Disposition"] = "PREVIOUSLY_DEFERRED_PRESERVED"
        elif item["inventoryStatus"] == "REQUIRES_BOUNDARY_OR_IDENTITY_DECISION":
            item["batch02Disposition"] = "PENDING_SEPARATE_BOUNDARY_OR_IDENTITY_REVIEW"
        elif item["inventoryStatus"] == "CURRENT_HASH_CONFLICT":
            item["batch02Disposition"] = "PENDING_CURRENT_HASH_RECONCILIATION"
        elif item["inventoryStatus"] == "DUPLICATE_FIELD_PROPOSAL":
            item["batch02Disposition"] = "PENDING_DUPLICATE_FIELD_RECONCILIATION"
        elif proposal_id in SELECTED_IDS:
            raise ValueError("Selected proposal missing a disposition: " + proposal_id)
        else:
            item["batch02Disposition"] = "CANDIDATE_NOT_YET_REVIEWED"
        dispositions.append(item)

    _, boundary_sources = context["pilot"].all_boundaries()
    boundary_inventory = []
    for boundary in context["boundaries"]:
        boundary_inventory.append({
            "proposal": copy.deepcopy(boundary),
            "sourceReferences": boundary_sources,
            "batch02Disposition": "PRESERVED_OUT_OF_SCOPE_NO_NEW_SENSE_BOUNDARY",
        })
    require(len(boundary_inventory) == 8,
            "All eight prior boundary proposals must remain preserved")
    priority = read(CP07 / "prioritized-remediation-queue.json")
    corrections_by_status = {
        "APPLY_ELIGIBLE": len(applied_ids),
        "DEFERRED": len(deferred_ids),
        "REJECTED": len(rejected_ids),
    }
    batch_rows = review_context["batches"]
    batch_sense_count = len(reviews)
    selected_batches = sorted({row["batch"] for row in batch_rows})
    batch_names = [
        f"{row['sourceCheckpoint']}:{row['batch']:03}" for row in batch_rows
    ]
    parent_pilot_file = PILOT_WS / "remediated-effective-draft-projection.json"
    original_after = sha_file(INDEX)
    pilot_after = sha_file(parent_pilot_file)
    require(original_after == context["originalProjectionPin"]["sha256"]
            and pilot_after == context["parentPins"]["parentPilotProjection"]["sha256"],
            "A protected parent projection changed during Batch 02 assembly")
    parent_state = {
        "parentPilotFingerprint": PARENT_PILOT_FINGERPRINT,
        "parentAuditFingerprint": PARENT_AUDIT_FINGERPRINT,
        "parentHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
        "originalEffectiveProjectionUnchanged": True,
        "pilot01EffectiveProjectionUnchanged": True,
        "pilot01AppliedCorrectionCountPreserved": 3,
        "lotDeferredProposalPreserved": True,
        "historicalFieldProposalCountPreserved": 141,
        "historicalBoundaryProposalCountPreserved": 8,
    }
    auth = {**AUTH}
    post_qa = {
        "phase": "2H.2J-R2",
        "status": "PASS_WITH_REVIEW_ITEMS" if review_count else "PASS",
        "reviewKind": "AI_POST_REMEDIATION_FULL_BATCH_REVIEW_NOT_OWNER_APPROVAL",
        "affectedOriginalBatches": batch_names,
        "fullBatchesReviewed": len(batch_rows),
        "sensesReviewed": batch_sense_count,
        "pass": pass_count,
        "review": review_count,
        "fail": fail_count,
        "newCorrectionsAppliedInBatch02": len(applied),
        "cumulativeDraftCorrectionsApplied": 3 + len(applied),
        "newlyRevisedSenseCount": len(revisions),
        "cumulativeRevisedSenseCount": 3 + len(revisions),
        "unresolvedHistoricalReviewsNotConvertedToPass": True,
        "checks": {
            "grammar": "PASS_FOR_ALL_NEWLY_REVISED_FIELDS",
            "meaningPreservation": "PASS_FOR_ALL_NEWLY_REVISED_FIELDS",
            "englishNaturalness": "PASS_FOR_ALL_NEWLY_REVISED_FIELDS",
            "vietnameseFaithfulness": "PASS_FOR_ALL_NEWLY_REVISED_FIELDS",
            "posAndConstruction": "PASS_FOR_ALL_NEWLY_REVISED_FIELDS",
            "sourceProvenancePreserved": True,
            "sourceOriginalitySignals": "REVIEWED_WITHIN_PINNED_SCOPE; NO_RIGHTS_CLEARANCE_INFERRED",
            "externalRightsOrOriginalityClearance": "NOT_PERFORMED",
            "senseBoundaryStability": "PASS_NO_BOUNDARY_CHANGES",
            "fieldCompleteness": "PASS_FOR_REVISED_FIELDS",
            "duplicateContent": "CHECKED_WITHIN_ALL_AFFECTED_BATCHES",
            "historicalReviewConvertedToPass": False,
        },
        "reviewedSenseReferences": [
            {
                "proposalKey": row["proposalKey"],
                "candidateGroupKey": row["candidateGroupKey"],
                "parentEffectiveContentHash": row["parentEffectiveContentHash"],
                "reviewedContentHash": row["reviewedContentHash"],
                "reviewStatus": row["reviewStatus"],
            } for row in sorted(reviews, key=lambda x: x["proposalKey"])
        ],
        "rights": "UNKNOWN_REVIEW_REQUIRED",
        "ownerApproval": False,
        "releaseEligible": False,
    }
    artifacts = {
        "accepted-parent-pins.json": context["parentPins"],
        "candidate-inventory.json": context["inventory"],
        "batch-selection-receipt.json": context["selection"],
        ELIGIBILITY: authored["eligibility"],
        APPLICATION: authored["application"],
        FULL_BATCH_INPUT: authored["batchReview"],
        "applied-draft-corrections.json": {
            "schemaVersion": "OFFLINE_CUMULATIVE_DRAFT_REMEDIATION_BATCH_V1",
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_02",
            "status": "APPLIED_TO_NEW_CUMULATIVE_DRAFT_LAYER",
            "corrections": applied,
            "historicalProposalStatusRemainsUnapplied": True,
            "parentPilotAppliedCorrectionsPreserved": 3,
            "authorization": auth,
        },
        "draft-revisions.json": {
            "schemaVersion": "OFFLINE_VERSIONED_CUMULATIVE_DRAFT_OVERLAY_V1",
            "revisionLayer": "DRAFT_REMEDIATION_BATCH_02",
            "revision": 2,
            "parentProjection": context["parentPins"]["parentPilotProjection"]["path"],
            "records": revisions,
            "duplicateApplicationPolicy": "FAIL_CLOSED",
            "authorization": auth,
        },
        "cumulative-remediated-effective-draft-projection.json": {
            "schemaVersion": "OFFLINE_CUMULATIVE_EFFECTIVE_DRAFT_PROJECTION_V1",
            "contentStatus": "DRAFT",
            "count": len(all_rows),
            "authoredGroupCount": 1020,
            "records": all_rows,
            "baseProjection": {
                "path": context["parentPins"]["parentPilotProjection"]["path"],
                "sha256": context["parentPins"]["parentPilotProjection"]["sha256"],
                "pilot01Fingerprint": PARENT_PILOT_FINGERPRINT,
            },
            "latestOverlay": "draft-revisions.json",
            "publicationEligible": False,
            "authorization": auth,
        },
        "cumulative-content-hash-mapping.json": {
            "method": "SHA256(canonical UTF-8 JSON of proposalKey, candidateGroupKey, headword, partOfSpeechProposal, content)",
            "count": len(mapping),
            "records": mapping,
            "changedInBatch02SenseCount": len(changed_batch),
            "retainedPilot01RevisionCount": 3,
            "unchangedFromPilot01SenseCount": len(mapping) - len(changed_batch),
        },
        "full-batch-re-review.json": {
            "reviewKind": "AI_FULL_AUTHORED_BATCH_REVIEW_NOT_OWNER_APPROVAL",
            "status": "COMPLETE_FOR_SELECTED_ORIGINAL_BATCHES",
            "batches": batch_rows,
            "reviews": sorted(reviews, key=lambda x: x["proposalKey"]),
            "reviewedSenseCount": batch_sense_count,
            "pass": pass_count,
            "review": review_count,
            "fail": fail_count,
            "criticalDefectFound": False,
            "formalOwnerApproval": False,
        },
        "post-remediation-quality-audit.json": post_qa,
        "deferred-and-rejected-proposals.json": {
            "historicalLotDeferral": next(
                item for item in dispositions
                if item["correctionProposalId"] == PILOT_DEFERRED
            ),
            "batch02Deferred": [item for item in dispositions
                                if item["batch02Disposition"] == "DEFERRED_NO_REVISION"],
            "batch02Rejected": [item for item in dispositions
                                if item["batch02Disposition"] == "REJECTED_NO_REVISION"],
            "status": "PRESERVED_WITHOUT_REWRITING_HISTORICAL_PROPOSALS",
        },
        "remaining-remediation-queue.json": {
            "historicalPriorityAccounting": {
                "cumulativePriorityCounts": priority["cumulativePriorityCounts"],
                "deduplicatedInventoryPriorityCounts": priority["deduplicatedInventoryPriorityCounts"],
            },
            "fieldProposalCount": len(dispositions),
            "fieldProposals": dispositions,
            "boundaryProposalCount": len(boundary_inventory),
            "boundaryProposals": boundary_inventory,
            "batch02Selected": len(SELECTED_IDS),
            "batch02Eligible": corrections_by_status["APPLY_ELIGIBLE"],
            "batch02Deferred": corrections_by_status["DEFERRED"],
            "batch02Rejected": corrections_by_status["REJECTED"],
            "newCorrectionsAppliedInBatch02": len(applied),
            "cumulativeDraftCorrectionsApplied": 3 + len(applied),
            "nextBoundaryGroups": sorted(BOUNDARY_GROUPS),
            "authorization": auth,
        },
        "validation-summary.json": {
            "phase": "2H.2J-R2",
            "status": "PASS_WITH_REVIEW_ITEMS" if review_count else "PASS",
            "parentState": parent_state,
            "historicalFieldProposals": 141,
            "historicalBoundaryProposals": 8,
            "batch02CandidatesSelected": len(SELECTED_IDS),
            "batch02Eligible": corrections_by_status["APPLY_ELIGIBLE"],
            "batch02Deferred": corrections_by_status["DEFERRED"],
            "batch02Rejected": corrections_by_status["REJECTED"],
            "newCorrectionsAppliedInBatch02": len(applied),
            "cumulativeDraftCorrectionsApplied": 3 + len(applied),
            "distinctNewlyRevisedSenses": len(revisions),
            "cumulativeRevisedSenses": 3 + len(revisions),
            "effectiveDraftSenses": 1563,
            "authoredGroups": 1020,
            "originalProjectionUnchanged": True,
            "pilot01ProjectionUnchanged": True,
            "lotDeferredProposalPreserved": True,
            "affectedOriginalBatches": batch_names,
            "fullBatchesReviewed": len(batch_rows),
            "fullBatchSensesReviewed": batch_sense_count,
            "postRemediationQa": {"PASS": pass_count, "REVIEW": review_count, "FAIL": fail_count},
            "unselectedSensesPreserved": True,
            "reviewHistoryPreserved": True,
            "sourceProvenancePreserved": True,
            "originalProposalsPreserved": 141,
            "originalBoundariesPreserved": 8,
            "ownerApprovalsAdded": 0,
            "canonicalIdsAllocated": 0,
            "rights": "UNKNOWN_REVIEW_REQUIRED",
            "contentApprovalStatus": "PENDING",
            "releaseEligible": False,
            "masterReleaseChanged": False,
            "legacyModified": False,
            "databaseAccess": "NONE",
            "databaseWrites": "NONE",
            "production": "UNTOUCHED",
            "externalVerification": "SEE_DETACHED_VERIFICATION_RESULTS",
            "authorization": auth,
        },
    }
    report = render_report(artifacts)
    artifact_text = {name: encode(value) for name, value in artifacts.items()}
    artifact_text["report.md"] = report
    manifest = {
        "phase": "2H.2J-R2",
        "batch": "TARGETED_DRAFT_REMEDIATION_BATCH_02",
        "parentPilotFingerprint": PARENT_PILOT_FINGERPRINT,
        "parentFinalAuditFingerprint": PARENT_AUDIT_FINGERPRINT,
        "parentFinalAuditHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
        "parentCommit": PARENT_COMMIT,
        "remoteBaseline": PARENT_COMMIT,
        "frozenAuthoringCohortFingerprint": FROZEN_COHORT,
        "artifactHashes": {
            name: sha_bytes(value.encode("utf-8"))
            for name, value in artifact_text.items()
        },
        "authoredInputHashes": {
            name: stable_text_sha(WS / name)
            for name in [ELIGIBILITY, APPLICATION, FULL_BATCH_INPUT]
        },
        "sourceHashes": {
            "phase-2h2j-draft-remediation-batch-02.py":
                stable_text_sha(ROOT / "scripts/phase-2h2j-draft-remediation-batch-02.py"),
            "phase-2h2j-draft-remediation-batch-02-test.py":
                stable_text_sha(ROOT / "scripts/phase-2h2j-draft-remediation-batch-02-test.py"),
            "phase-2h2j-draft-remediation-pilot-01.py":
                stable_text_sha(PILOT_SCRIPT),
            "phase-2h2i-aggregate-qa-checkpoint-07.py":
                stable_text_sha(ROOT / "scripts/phase-2h2i-aggregate-qa-checkpoint-07.py"),
        },
        "selectedCandidateCount": len(SELECTED_IDS),
        "appliedCorrectionCount": len(applied),
        "distinctNewlyRevisedSenseCount": len(revisions),
        "cumulativeAppliedCorrectionCount": 3 + len(applied),
        "effectiveDraftSenseCount": len(all_rows),
        "fullBatchCount": len(batch_rows),
        "fullBatchSenseCount": batch_sense_count,
        "rights": "UNKNOWN_REVIEW_REQUIRED",
        "ownerApprovalsAdded": 0,
        "canonicalIdsAllocated": 0,
        "databaseAccess": "NONE",
        "databaseWrites": "NONE",
        "production": "UNTOUCHED",
        "detachedVerificationReceipt": {
            "path": VERIFY_FILE,
            "binding": "Detached external command receipt bound to this manifest fingerprint; excluded from self-hash.",
        },
        "authorization": auth,
    }
    manifest["fingerprint"] = digest(manifest)
    artifact_text["manifest.json"] = encode(manifest)
    return artifact_text, manifest


def render_report(artifacts):
    summary = artifacts["validation-summary.json"]
    selection = artifacts["batch-selection-receipt.json"]
    eligibility = {
        row["correctionProposalId"]: row
        for row in artifacts[ELIGIBILITY]["records"]
    }
    lines = [
        "# Phase 2H.2J-R2 — Targeted DRAFT Remediation Batch 02",
        "",
        "Status: complete for the bounded selected batch set; historical review and content-approval states remain unchanged.",
        f"Parent Pilot 01 fingerprint: {PARENT_PILOT_FINGERPRINT}.",
        f"Parent Phase 2H.2I final audit fingerprint: {PARENT_AUDIT_FINGERPRINT}.",
        f"Parent handoff fingerprint: {PARENT_HANDOFF_FINGERPRINT}.",
        "",
        "## Selection and decisions",
        "",
        f"Selected {summary['batch02CandidatesSelected']} candidates across {summary['fullBatchesReviewed']} original authored batches.",
        "",
    ]
    for candidate in selection["candidates"]:
        item = eligibility[candidate["correctionProposalId"]]
        lines.append(
            f"- {candidate['correctionProposalId']} / {candidate['proposalKey']} — "
            f"{item['eligibilityStatus']}: {item['reviewExplanationVi']}"
        )
    lines += [
        "",
        "## Cumulative DRAFT overlay",
        "",
        f"- Newly applied field corrections: {summary['newCorrectionsAppliedInBatch02']}; cumulative including Pilot 01: {summary['cumulativeDraftCorrectionsApplied']}.",
        f"- Newly revised Senses: {summary['distinctNewlyRevisedSenses']}; cumulative revised Senses: {summary['cumulativeRevisedSenses']}.",
        "- Effective projection remains 1,563 Senses across 1,020 authored groups.",
        "- The three Pilot 01 revisions and all unselected effective rows remain unchanged.",
        f"- Full-batch review: {summary['fullBatchSensesReviewed']} Senses in {', '.join(summary['affectedOriginalBatches'])}.",
        f"- Post-remediation review: {summary['postRemediationQa']['PASS']} PASS, {summary['postRemediationQa']['REVIEW']} REVIEW, {summary['postRemediationQa']['FAIL']} FAIL.",
        "- Historical REVIEW findings were not converted to PASS. A reviewed DRAFT overlay is not owner approval.",
        "",
        "## Preserved limits",
        "",
        "- The deferred lot proposal, 141 field proposal records, and all eight boundary proposals remain preserved.",
        "- Content remains DRAFT; rights UNKNOWN_REVIEW_REQUIRED; content approval PENDING; release eligibility NO.",
        "- No canonical IDs, owner approvals, database access/writes, Master changes, legacy changes, or Production operations.",
        "- The known Hybrid v2.2.0 release-tree diagnostic remains visible; Hybrid v2.2.1 is separately tested.",
        "- External tests, typecheck, lint, parent replays, hash-seed replay, and worktree checks are recorded in verification-results.json.",
        "",
        "## Next recommendation",
        "",
        "Review the exact Batch 02 overlay and its remaining queue before separately authorizing another bounded DRAFT remediation batch. Keep the lot agency decision, source/POS boundary proposals, and all unresolved identity and rights decisions pending.",
        "",
    ]
    return "\n".join(lines)


def validate_detached_verification(path, fingerprint):
    require(path.is_file(), "Detached verification-results.json is missing")
    result = read(path)
    require(result.get("batch02Fingerprint") == fingerprint
            and result.get("parentPilotFingerprint") == PARENT_PILOT_FINGERPRINT
            and result.get("parentAuditFingerprint") == PARENT_AUDIT_FINGERPRINT
            and result.get("status") in {"PASS", "PASS_WITH_REVIEW_ITEMS"}
            and result.get("databaseAccess") == "NONE"
            and result.get("databaseWrites") == "NONE"
            and result.get("production") == "UNTOUCHED",
            "Detached verification receipt is missing, stale, or outside authorization")
    replays = result.get("newBatchReplay", [])
    require(len(replays) >= 2
            and len({str(item["pythonHashSeed"]) for item in replays}) >= 2
            and all(item["exitCode"] == 0 and item["fingerprint"] == fingerprint
                    and item["zeroWrites"] is True for item in replays),
            "Batch 02 detached replay evidence is incomplete or inconsistent")
    require(result.get("unrelatedLegacyDiagnostic", {}).get("status")
            == "KNOWN_FAILURE_PRESERVED"
            and result.get("hybrid100V221", {}).get("status") == "PASS",
            "Frozen release diagnostics or Hybrid-100 v2.2.1 evidence missing")


def run(check=False):
    outputs, manifest = build()
    verification_path = WS / VERIFY_FILE
    pending_rebuild = False
    if not check and verification_path.is_file():
        pending_rebuild = read(verification_path).get("status") == "PENDING_EXTERNAL_VERIFICATION"
    for name, text in outputs.items():
        immutable_write(WS / name, text, check,
                        allow_provisional_rebuild=pending_rebuild)
    if not check:
        if pending_rebuild or not verification_path.exists():
            pending = {
                "phase": "2H.2J-R2",
                "status": "PENDING_EXTERNAL_VERIFICATION",
                "batch02Fingerprint": manifest["fingerprint"],
                "parentPilotFingerprint": PARENT_PILOT_FINGERPRINT,
                "parentAuditFingerprint": PARENT_AUDIT_FINGERPRINT,
                "databaseAccess": "NONE",
                "databaseWrites": "NONE",
                "production": "UNTOUCHED",
            }
            immutable_write(verification_path, encode(pending), False,
                            allow_provisional_rebuild=pending_rebuild)
    else:
        validate_detached_verification(WS / VERIFY_FILE, manifest["fingerprint"])
    return {
        "fingerprint": manifest["fingerprint"],
        "status": "PASS_WITH_REVIEW_ITEMS" if read(WS / "validation-summary.json").get(
            "postRemediationQa", {}
        ).get("REVIEW", 0) else "PASS",
        "zeroWrites": check,
        "newCorrectionsApplied": manifest["appliedCorrectionCount"],
        "cumulativeCorrectionsApplied": manifest["cumulativeAppliedCorrectionCount"],
        "effectiveDraftSenseCount": manifest["effectiveDraftSenseCount"],
        "fullBatchSenseCount": manifest["fullBatchSenseCount"],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--prepare", action="store_true")
    mode.add_argument("--assemble", action="store_true")
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.prepare:
        result = prepare(False)
    elif args.assemble:
        result = run(False)
    else:
        result = run(True)
    print(encode(result), end="")


if __name__ == "__main__":
    main()
