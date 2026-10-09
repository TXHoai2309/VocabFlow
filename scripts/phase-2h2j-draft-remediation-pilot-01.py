#!/usr/bin/env python3
"""Offline, additive Phase 2H.2J-R1 DRAFT remediation overlay."""
import argparse
import copy
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / "vocabflow-dataset/workspaces/master-editorial-aggregate-qa"
AUDIT_RESUME = ROOT / "vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume"
BULK_RESUME = ROOT / "vocabflow-dataset/workspaces/master-editorial-bulk-500-resume"
CP07 = AUDIT_RESUME / "checkpoints/checkpoint-07"
WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-draft-remediation/checkpoints/pilot-01"
INDEX_PATH = AUDIT / "effective-sense-index.json"
ROOT_PROPOSALS = AUDIT / "correction-proposals.json"
CP07_NEW_FIELDS = CP07 / "authored/new-field-correction-proposals.json"
SELECTION = "pilot-selection-receipt.json"
ELIGIBILITY = "authored/eligibility-assessments.json"
APPLICATION = "authored/application-decisions.json"
FULL_BATCH_INPUT = "authored/full-batch-review-assessments.json"
VERIFICATION = "verification-results.json"

PARENT_CHECKPOINT_FINGERPRINT = "9c90d8c2f2b964e128e19c5db807336d754573467f7f783a8a666e54a242ed77"
PARENT_HANDOFF_FINGERPRINT = "862be642a7223396f43664ca8604d986a5c1f5cbad91c9ab295492f819ff4ed8"
REMOTE_BASELINE = "f0fb9bb7b5013b6c8240eed6bb2a111e572165b0"
ACCEPTED_AUDIT_RECORDED_REMOTE_BASELINE = "c4f45c5265f73780a51ecfb7aacea76b7f53b965"
FROZEN_COHORT = "2007c5a1e67d4dab6228378b5b00b22ab4736cb16d3f5a3e3d03735e2a290e44"
EXPECTED_SELECTION = ["2H2I-R6-P001", "2H2I-R1-P008", "2H2I-R1-P009", "2H2I-R1-P010"]
APPLY_IDS = EXPECTED_SELECTION[1:]
EXPECTED_BATCHES = {
    68: {"checkpoint": "checkpoint-04", "groups": [
        "NORMALIZED_HEADWORD:yet", "NORMALIZED_HEADWORD:comply", "NORMALIZED_HEADWORD:high",
        "NORMALIZED_HEADWORD:inflate", "NORMALIZED_HEADWORD:prescribe"], "senses": 9},
    72: {"checkpoint": "checkpoint-04", "groups": [
        "NORMALIZED_HEADWORD:hinder", "NORMALIZED_HEADWORD:impression", "NORMALIZED_HEADWORD:peel",
        "NORMALIZED_HEADWORD:surprising", "NORMALIZED_HEADWORD:wait"], "senses": 7},
    81: {"checkpoint": "checkpoint-05", "groups": [
        "NORMALIZED_HEADWORD:starch", "NORMALIZED_HEADWORD:yes", "NORMALIZED_HEADWORD:considerably",
        "NORMALIZED_HEADWORD:handbook", "NORMALIZED_HEADWORD:lot"], "senses": 8},
}
AUTH = {
    "phase": "2H.2J-R1", "contentStatus": "DRAFT",
    "ownerApprovalsAdded": 0, "canonicalIdsAllocated": 0, "rightsClearanceAdded": 0,
    "rights": "UNKNOWN_REVIEW_REQUIRED", "databaseAccess": "NONE", "databaseWrites": "NONE",
    "masterReleaseChanged": False, "legacyModified": False, "production": "UNTOUCHED",
    "publicationEligible": False,
}


def read(path):
    path = Path(path)
    return json.loads(path.read_text(encoding="utf-8"))


def encode(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n"


def sha_bytes(data):
    return hashlib.sha256(data).hexdigest()


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


def audit_parent():
    cp7 = module("phase_2h2i_checkpoint07", ROOT / "scripts/phase-2h2i-aggregate-qa-checkpoint-07.py")
    replay = cp7.run(True)
    require(replay["fingerprint"] == PARENT_CHECKPOINT_FINGERPRINT
            and replay["finalHandoffFingerprint"] == PARENT_HANDOFF_FINGERPRINT
            and replay["zeroWrites"] is True, "Accepted final audit checkpoint or handoff replay drift")
    manifest = read(CP07 / "manifest.json")
    handoff = read(CP07 / "final-handoff-manifest.json")
    require(manifest["fingerprint"] == PARENT_CHECKPOINT_FINGERPRINT
            and manifest["remoteBaseline"] == ACCEPTED_AUDIT_RECORDED_REMOTE_BASELINE
            and manifest["frozenAuthoringCohortFingerprint"] == FROZEN_COHORT,
            "Accepted final audit manifest pins drift")
    require(handoff["fingerprint"] == PARENT_HANDOFF_FINGERPRINT
            and handoff["coverage"]["assessed"] == 500
            and handoff["coverage"]["pending"] == 0,
            "Accepted audit handoff inventory drift")
    return cp7, manifest


def source_proposal_files():
    files = [(ROOT_PROPOSALS, "root-aggregate-proposals")]
    for checkpoint in ["checkpoint-02", "checkpoint-03", "checkpoint-04", "checkpoint-05"]:
        additive_path = AUDIT_RESUME / "checkpoints" / checkpoint / "correction-proposals-additive.json"
        additive = read(additive_path)
        ref = additive["newProposals"]
        path = ROOT / ref["path"]
        require(path.resolve().is_relative_to(ROOT.resolve()), "Unsafe proposal source path")
        require(sha_file(path) == ref["sha256"], "Historical field proposal source pin drift: " + str(path))
        files.append((path, checkpoint + "-new-field-proposals"))
    return files


def all_historical_proposals():
    sources = []
    records = []
    for path, label in source_proposal_files():
        data = read(path)
        rows = data["records"] if path == ROOT_PROPOSALS else data["records"]
        sources.append({"label": label, "path": path.relative_to(ROOT).as_posix(), "sha256": sha_file(path),
                        "proposalCount": len(rows)})
        records.extend({**copy.deepcopy(row), "_sourcePath": path.relative_to(ROOT).as_posix(),
                        "_sourceSha256": sha_file(path)} for row in rows)
    require(len(records) == 140, "Expected exactly 140 historical field proposals")
    require(len({row["correctionProposalId"] for row in records}) == 140,
            "Historical correction proposal identities are duplicated")
    return records, sources


def all_boundaries():
    references = []
    rows = []
    source = read(ROOT_PROPOSALS)
    boundaries = source.get("additionalBoundaryProposals", [])
    references.append({"path": ROOT_PROPOSALS.relative_to(ROOT).as_posix(), "sha256": sha_file(ROOT_PROPOSALS),
                       "count": len(boundaries), "scope": "original aggregate boundary proposals"})
    rows.extend(copy.deepcopy(boundaries))
    for checkpoint in ["checkpoint-02", "checkpoint-03", "checkpoint-04", "checkpoint-05"]:
        path = AUDIT_RESUME / "checkpoints" / checkpoint / "authored/new-correction-proposals.json"
        data = read(path)
        new = data.get("additionalBoundaryProposals", [])
        if new:
            references.append({"path": path.relative_to(ROOT).as_posix(), "sha256": sha_file(path),
                               "count": len(new), "scope": checkpoint + " additive boundary proposals"})
            rows.extend(copy.deepcopy(new))
    c6_path = AUDIT_RESUME / "checkpoints/checkpoint-06/authored/new-boundary-proposals.json"
    c6 = read(c6_path)
    references.append({"path": c6_path.relative_to(ROOT).as_posix(), "sha256": sha_file(c6_path),
                       "count": len(c6["records"]), "scope": "checkpoint 06 boundary proposals"})
    rows.extend(copy.deepcopy(c6["records"]))
    require(len(rows) == 8, "Expected all eight accepted boundary proposals")
    return rows, references


def get_pointer(value, pointer):
    require(pointer.startswith("/"), "Correction pointer must be absolute")
    item = value
    for part in pointer[1:].split("/"):
        part = part.replace("~1", "/").replace("~0", "~")
        item = item[int(part)] if isinstance(item, list) else item[part]
    return item


def set_pointer(value, pointer, replacement):
    parts = pointer[1:].split("/")
    item = value
    for raw in parts[:-1]:
        part = raw.replace("~1", "/").replace("~0", "~")
        item = item[int(part)] if isinstance(item, list) else item[part]
    tail = parts[-1].replace("~1", "/").replace("~0", "~")
    if isinstance(item, list):
        item[int(tail)] = replacement
    else:
        item[tail] = replacement


def current_hash(row):
    return digest({"proposalKey": row["proposalKey"],
                   "candidateGroupKey": row["candidateGroupKey"],
                   "headword": row["headword"],
                   "partOfSpeechProposal": row["partOfSpeech"],
                   "content": row["content"]})


def validate_proposal(proposal, rows):
    key = proposal["proposalKey"]
    require(key in rows, "Proposal points to unknown Sense: " + key)
    row = rows[key]
    require(proposal["originalEffectiveContentHash"] == row["effectiveContentHash"] == current_hash(row),
            "Stale proposal parent hash: " + proposal["correctionProposalId"])
    require(get_pointer(row, proposal["field"]) == proposal["before"],
            "Historical correction BEFORE differs from current effective field: " + proposal["correctionProposalId"])
    require(proposal["beforeSha256"] == text_sha(proposal["before"])
            and proposal["afterSha256"] == text_sha(proposal["after"]),
            "Historical correction field hash is invalid: " + proposal["correctionProposalId"])
    require(proposal.get("applied") is False and proposal.get("ownerApproval") is False,
            "Historical proposal state/approval changed: " + proposal["correctionProposalId"])


def load_context():
    cp7, audit_manifest = audit_parent()
    base_rows = read(INDEX_PATH)["records"]
    require(len(base_rows) == 1563 and len({r["proposalKey"] for r in base_rows}) == 1563,
            "Accepted effective DRAFT projection is not 1,563 unique Senses")
    require(len({r["candidateGroupKey"] for r in base_rows}) == 1020,
            "Accepted effective DRAFT projection no longer covers exactly 1,020 authored groups")
    rows = {row["proposalKey"]: row for row in base_rows}
    require(all(current_hash(row) == row["effectiveContentHash"] for row in base_rows),
            "Effective base content hash drift")
    original_props, prop_sources = all_historical_proposals()
    cp7_props = read(CP07_NEW_FIELDS)["records"]
    require(len(cp7_props) == 1 and cp7_props[0]["correctionProposalId"] == "2H2I-R6-P001",
            "Checkpoint 07 lot correction proposal drift")
    all_props = original_props + [{**copy.deepcopy(cp7_props[0]),
                                   "_sourcePath": CP07_NEW_FIELDS.relative_to(ROOT).as_posix(),
                                   "_sourceSha256": sha_file(CP07_NEW_FIELDS)}]
    require(len(all_props) == 141 and len({p["correctionProposalId"] for p in all_props}) == 141,
            "Final audit must expose exactly 141 unique field proposals")
    for proposal in all_props:
        validate_proposal(proposal, rows)
    boundaries, boundary_sources = all_boundaries()
    return {"cp7": cp7, "auditManifest": audit_manifest, "baseRecords": base_rows,
            "rows": rows, "proposals": all_props, "proposalSources": prop_sources,
            "boundaries": boundaries, "boundarySources": boundary_sources}


def load_authored(context):
    selection = read(WS / SELECTION)
    eligibility = read(WS / ELIGIBILITY)
    application = read(WS / APPLICATION)
    batch_review = read(WS / FULL_BATCH_INPUT)
    by_id = {p["correctionProposalId"]: p for p in context["proposals"]}
    require(selection["parentCheckpointFingerprint"] == PARENT_CHECKPOINT_FINGERPRINT
            and selection["parentHandoffFingerprint"] == PARENT_HANDOFF_FINGERPRINT,
            "Selection parent pins drift")
    selected = selection["candidates"]
    require([x["correctionProposalId"] for x in selected] == EXPECTED_SELECTION,
            "Selection must put the lot proposal first and preserve exact pilot scope")
    require(len({x["proposalKey"] for x in selected}) == len(selected), "Duplicate selected proposal key")
    for item in selected:
        proposal = by_id[item["correctionProposalId"]]
        row = context["rows"][proposal["proposalKey"]]
        require(item["proposalKey"] == proposal["proposalKey"]
                and item["field"] == proposal["field"]
                and item["before"] == proposal["before"] and item["after"] == proposal["after"]
                and item["parentContentHash"] == row["effectiveContentHash"],
                "Selection is not bound to exact accepted proposal/current content")

    eligibility_rows = eligibility["records"]
    require([r["correctionProposalId"] for r in eligibility_rows] == EXPECTED_SELECTION,
            "Eligibility review omitted/reordered a selected proposal")
    expected_status = {EXPECTED_SELECTION[0]: "DEFER_SEMANTIC_RISK",
                       **{key: "APPLY_ELIGIBLE" for key in APPLY_IDS}}
    for review in eligibility_rows:
        proposal = by_id[review["correctionProposalId"]]
        row = context["rows"][proposal["proposalKey"]]
        require(review["eligibilityStatus"] == expected_status[review["correctionProposalId"]]
                and review["proposalKey"] == proposal["proposalKey"]
                and review["parentContentHash"] == row["effectiveContentHash"]
                and review["field"] == proposal["field"]
                and review["before"] == proposal["before"] and review["after"] == proposal["after"]
                and review["sourceEvidence"] == row["sourceEvidence"]
                and review["reviewExplanationVi"].strip(),
                "Eligibility assessment is stale, incomplete, or unreasoned")

    decisions = application["records"]
    require([r["correctionProposalId"] for r in decisions] == EXPECTED_SELECTION,
            "Application ledger does not match exact selection")
    for decision in decisions:
        expected_action = "DEFER" if decision["correctionProposalId"] == EXPECTED_SELECTION[0] else "APPLY_TO_NEW_DRAFT_LAYER"
        require(decision["decision"] == expected_action
                and decision["eligibilityStatus"] == expected_status[decision["correctionProposalId"]]
                and decision["ownerApproval"] is False and decision["canonicalIdAllocated"] is False,
                "Unauthorized or inconsistent application decision")

    fields = {}
    for proposal in context["proposals"]:
        fields.setdefault((proposal["proposalKey"], proposal["field"]), []).append(proposal)
    for proposal_id in APPLY_IDS:
        proposal = by_id[proposal_id]
        require(len(fields[(proposal["proposalKey"], proposal["field"])]) == 1,
                "Competing proposal targets selected field: " + proposal_id)
        row = context["rows"][proposal["proposalKey"]]
        require(not row.get("pinnedCorrectionLineage") and not row.get("appliedCorrectionReferences"),
                "Selected field has earlier overlay lineage requiring conflict review")

    return {"selection": selection, "eligibility": eligibility, "application": application,
            "batchReview": batch_review, "byId": by_id}


def apply_selected(context, authored):
    revisions = []
    revised_rows = {}
    for proposal_id in APPLY_IDS:
        proposal = authored["byId"][proposal_id]
        base = context["rows"][proposal["proposalKey"]]
        cloned = copy.deepcopy(base)
        require(get_pointer(cloned, proposal["field"]) == proposal["before"],
                "BEFORE mismatch during cloned application: " + proposal_id)
        set_pointer(cloned, proposal["field"], proposal["after"])
        revised = current_hash(cloned)
        cloned["effectiveContentHash"] = revised
        revision_id = "DRAFT_REMEDIATION_PILOT_01:" + proposal_id
        eligibility = next(x for x in authored["eligibility"]["records"] if x["correctionProposalId"] == proposal_id)
        original_provenance = {
            "editorialFieldProvenance": copy.deepcopy(base.get("editorialFieldProvenance")),
            "reviewFieldProvenance": copy.deepcopy(base.get("reviewFieldProvenance")),
            "pinnedCorrectionLineage": copy.deepcopy(base.get("pinnedCorrectionLineage", [])),
            "appliedCorrectionReferences": copy.deepcopy(base.get("appliedCorrectionReferences", [])),
            "sourceEvidence": copy.deepcopy(base.get("sourceEvidence", [])),
        }
        revision = {
            "revisionId": revision_id, "revisionLayer": "DRAFT_REMEDIATION_PILOT_01",
            "draftRevision": 1, "status": "AI_REVIEWED_DRAFT_FIELD_CORRECTION",
            "contentStatus": "DRAFT", "publicationEligible": False,
            "correctionProposalId": proposal_id, "proposalKey": proposal["proposalKey"],
            "candidateGroupKey": base["candidateGroupKey"],
            "sourceAuditCheckpoint": "PHASE_2H.2I-R6_CHECKPOINT_07",
            "previousEffectiveContentHash": base["effectiveContentHash"],
            "fieldPointer": proposal["field"], "before": proposal["before"], "after": proposal["after"],
            "beforeFieldSha256": text_sha(proposal["before"]), "afterFieldSha256": text_sha(proposal["after"]),
            "revisedContentHash": revised, "eligibilityAssessment": eligibility,
            "originalProvenance": original_provenance,
            "rights": "UNKNOWN_REVIEW_REQUIRED", "ownerApproval": False,
            "canonicalIdAllocated": False, "record": cloned,
        }
        revisions.append(revision)
        revised_rows[proposal["proposalKey"]] = cloned
    require(len(revisions) == 3 and len(revised_rows) == 3,
            "Pilot application count or distinct Sense count drift")
    return revisions, revised_rows


def verify_full_batch_review(context, authored, revised_rows):
    doc = authored["batchReview"]
    require(doc["reviewKind"] == "AI_FULL_AUTHORED_BATCH_REVIEW_NOT_OWNER_APPROVAL"
            and doc["parentCheckpointFingerprint"] == PARENT_CHECKPOINT_FINGERPRINT,
            "Full-batch review metadata or parent pin drift")
    expected_keys = set()
    batch_outputs = []
    pins = {}
    for batch_no, expected in EXPECTED_BATCHES.items():
        checkpoint = expected["checkpoint"]
        folder = BULK_RESUME / "checkpoints" / checkpoint
        qa_path = folder / "quality-audit.json"
        projection_path = folder / "effective-draft-projection.json"
        manifest_path = folder / "manifest.json"
        batch_path = folder / "authored" / f"batch-{batch_no:03}.json"
        psv_path = folder / "authored" / f"batch-{batch_no:03}.psv"
        decision_path = folder / "authored" / f"batch-{batch_no:03}.review-decisions.json"
        require(all(path.is_file() for path in [qa_path, projection_path, manifest_path, batch_path, psv_path, decision_path]),
                "Original authored batch evidence missing: " + str(batch_no))
        qa = read(qa_path)
        projection = read(projection_path)
        projection_rows = {row["proposalKey"]: row for row in projection["records"]}
        batch = next((x for x in qa["batches"] if x["batch"] == batch_no), None)
        require(batch is not None and batch["groupKeys"] == expected["groups"]
                and batch["senseCount"] == expected["senses"],
                "Accepted authored batch membership drift: " + str(batch_no))
        rows = [row for row in context["baseRecords"] if row["candidateGroupKey"] in set(expected["groups"])]
        require(len(rows) == expected["senses"], "Current complete batch Sense inventory drift: " + str(batch_no))
        require(len({digest(row["content"]) for row in rows}) == len(rows),
                "Duplicate complete content found within reviewed authored batch: " + str(batch_no))
        for row in rows:
            expected_keys.add(row["proposalKey"])
            require(row.get("sourceEvidence") and isinstance(row.get("deterministicSignals"), list)
                    and row.get("historicalQaFindings"),
                    "Source evidence, originality signals, or historical QA is missing: " + row["proposalKey"])
            require(all("sourceSimilarity" in finding for finding in row["historicalQaFindings"]),
                    "Historical source-similarity signals were not available for re-review: " + row["proposalKey"])
            source_row = projection_rows.get(row["proposalKey"])
            require(source_row is not None and source_row["content"] == row["content"]
                    and source_row["headword"] == row["headword"]
                    and source_row["partOfSpeechProposal"] == row["partOfSpeech"],
                    "Aggregate index differs from accepted authored batch projection: " + row["proposalKey"])
        qhash = sha_file(qa_path)
        phash = sha_file(projection_path)
        mh = read(manifest_path).get("fingerprint")
        source_batch_hash = sha_file(batch_path)
        source_psv_hash = sha_file(psv_path)
        decision_hash = sha_file(decision_path)
        pins.update({
            qa_path.relative_to(ROOT).as_posix(): qhash,
            projection_path.relative_to(ROOT).as_posix(): phash,
            manifest_path.relative_to(ROOT).as_posix(): sha_file(manifest_path),
            batch_path.relative_to(ROOT).as_posix(): source_batch_hash,
            psv_path.relative_to(ROOT).as_posix(): source_psv_hash,
            decision_path.relative_to(ROOT).as_posix(): decision_hash,
        })
        batch_outputs.append({
            "batch": batch_no, "sourceCheckpoint": checkpoint,
            "originalAuthoredBatch": {"path": batch_path.relative_to(ROOT).as_posix(), "sha256": source_batch_hash},
            "originalAuthoredPsv": {"path": psv_path.relative_to(ROOT).as_posix(), "sha256": source_psv_hash},
            "acceptedPriorReviewDecisions": {"path": decision_path.relative_to(ROOT).as_posix(), "sha256": decision_hash},
            "acceptedQualityAudit": {"path": qa_path.relative_to(ROOT).as_posix(), "sha256": qhash,
                                     "parentProjectionSha256": phash, "checkpointManifestFingerprint": mh},
            "groupKeys": expected["groups"], "senseCount": expected["senses"],
            "reviewedAllCurrentSenses": True,
        })
    reviews = doc["reviews"]
    review_map = {row["proposalKey"]: row for row in reviews}
    require(len(review_map) == len(reviews) == len(expected_keys) == 24
            and set(review_map) == expected_keys,
            "Full-batch review must cover each current Sense exactly once")
    expected_apply = {context["rows"][authored["byId"][pid]["proposalKey"]]["proposalKey"] for pid in APPLY_IDS}
    for key, review in review_map.items():
        base = context["rows"][key]
        final = revised_rows.get(key, base)
        require(review["parentEffectiveContentHash"] == base["effectiveContentHash"]
                and review["reviewedEffectiveContentHash"] == final["effectiveContentHash"]
                and review["reviewStatus"] in {"PASS", "REVIEW"}
                and review["explanationVi"].strip(),
                "Full-batch review is stale, missing a reason, or marks a fail as accepted: " + key)
        checks = review["checks"]
        require(all(checks.get(name) is True for name in ["definition", "vietnameseMeaning", "allBilingualExamples",
                "posAndConstruction", "grammarNotes", "siblingSenseConsistency", "sourceAndProvenance",
                "sourceOriginalitySignalsChecked", "historicalFindingsRechecked", "meaningAndTranslationDriftChecked", "fieldCompleteness",
                "duplicateContentChecked"]), "Full-batch review omits a required content dimension: " + key)
        if key in expected_apply:
            require(review["reviewStatus"] == "PASS", "Applied Sense did not pass full-batch re-review: " + key)
        elif base.get("effectiveQaAssessment") == "REVIEW":
            require(review["reviewStatus"] == "REVIEW",
                    "Historical REVIEW was incorrectly converted to PASS: " + key)
    pass_count = sum(x["reviewStatus"] == "PASS" for x in reviews)
    review_count = sum(x["reviewStatus"] == "REVIEW" for x in reviews)
    require(pass_count == 20 and review_count == 4 and doc.get("criticalDefectFound") is False,
            "Full-batch re-review counts or critical finding state drift")
    return batch_outputs, pins, reviews


def build(verification_override=None):
    context = load_context()
    authored = load_authored(context)
    revisions, revised_rows = apply_selected(context, authored)
    batches, batch_pins, reviews = verify_full_batch_review(context, authored, revised_rows)
    verification = verification_override if verification_override is not None else read(WS / VERIFICATION)
    require(verification.get("status") in {"PASS", "PASS_WITH_REVIEW_ITEMS"}
            and verification.get("databaseAccess") == "NONE"
            and verification.get("databaseWrites") == "NONE"
            and verification.get("production") == "UNTOUCHED",
            "Verification results missing, incomplete, or outside offline authorization")
    require(verification.get("parentCheckpoint07Fingerprint") == PARENT_CHECKPOINT_FINGERPRINT
            and verification.get("parentHandoffFingerprint") == PARENT_HANDOFF_FINGERPRINT,
            "Verification receipt is not bound to accepted final audit")

    all_rows = []
    mapping = []
    for original in context["baseRecords"]:
        key = original["proposalKey"]
        final = copy.deepcopy(revised_rows.get(key, original))
        all_rows.append(final)
        mapping.append({"proposalKey": key, "candidateGroupKey": original["candidateGroupKey"],
                        "originalEffectiveContentHash": original["effectiveContentHash"],
                        "remediatedEffectiveContentHash": final["effectiveContentHash"],
                        "revisionLayer": "DRAFT_REMEDIATION_PILOT_01" if key in revised_rows else "ACCEPTED_BASE_UNCHANGED",
                        "revisionId": next((r["revisionId"] for r in revisions if r["proposalKey"] == key), None)})
    require(len(all_rows) == 1563 and len(mapping) == 1563, "Remediated projection count drift")
    changed = {m["proposalKey"] for m in mapping if m["originalEffectiveContentHash"] != m["remediatedEffectiveContentHash"]}
    require(changed == set(revised_rows) and len(changed) == 3, "Unselected Sense content was modified")

    props_by_id = {p["correctionProposalId"]: p for p in context["proposals"]}
    selections = authored["selection"]["candidates"]
    decisions = {d["correctionProposalId"]: d for d in authored["application"]["records"]}
    original_inventory = []
    for proposal in context["proposals"]:
        decision = decisions.get(proposal["correctionProposalId"])
        if decision:
            disposition = "DEFERRED_SEMANTIC_RISK" if decision["decision"] == "DEFER" else "APPLIED_TO_NEW_DRAFT_LAYER"
        else:
            disposition = "UNSELECTED_PENDING_SEPARATE_REVIEW"
        original_inventory.append({
            "correctionProposalId": proposal["correctionProposalId"], "proposalKey": proposal["proposalKey"],
            "candidateGroupKey": proposal.get("candidateGroupKey") or context["rows"][proposal["proposalKey"]]["candidateGroupKey"],
            "field": proposal["field"], "before": proposal["before"], "after": proposal["after"],
            "originalEffectiveContentHash": proposal["originalEffectiveContentHash"],
            "sourceReference": {"path": proposal["_sourcePath"], "sha256": proposal["_sourceSha256"]},
            "historicalApplied": proposal.get("applied") is True,
            "pilotDisposition": disposition,
            "historicalRecordRemainsUnapplied": proposal.get("applied") is False,
        })
    require(len(original_inventory) == 141 and all(x["historicalRecordRemainsUnapplied"] for x in original_inventory),
            "Historical field proposals were changed or lost")

    _, boundary_refs = all_boundaries()
    queue_data = read(CP07 / "prioritized-remediation-queue.json")
    boundary_inventory = []
    for row in context["boundaries"]:
        boundary_inventory.append({"candidateGroupKey": row.get("candidateGroupKey"),
                                   "proposalId": row.get("proposalId"),
                                   "boundaryProposalId": row.get("boundaryProposalId"),
                                   "proposedPos": row.get("proposedPos"),
                                   "status": row.get("status", "UNAPPROVED_UNAPPLIED"),
                                   "sourceRefs": boundary_refs,
                                   "disposition": "PRESERVED_OUT_OF_SCOPE_NO_NEW_SENSE_BOUNDARY"})
    require(len(boundary_inventory) == 8, "Accepted eight boundary proposals not preserved")

    pass_count = sum(x["reviewStatus"] == "PASS" for x in reviews)
    review_count = sum(x["reviewStatus"] == "REVIEW" for x in reviews)
    input_pins = {
        "acceptedFinalAudit": {"checkpoint07Manifest": {"path": (CP07 / "manifest.json").relative_to(ROOT).as_posix(),
            "sha256": sha_file(CP07 / "manifest.json"), "fingerprint": PARENT_CHECKPOINT_FINGERPRINT,
            "recordedRemoteBaseline": ACCEPTED_AUDIT_RECORDED_REMOTE_BASELINE},
            "finalHandoffManifest": {"path": (CP07 / "final-handoff-manifest.json").relative_to(ROOT).as_posix(),
            "sha256": sha_file(CP07 / "final-handoff-manifest.json"), "fingerprint": PARENT_HANDOFF_FINGERPRINT}},
        "effectiveBaseProjection": {"path": INDEX_PATH.relative_to(ROOT).as_posix(), "sha256": sha_file(INDEX_PATH),
                                    "records": len(context["baseRecords"]), "authoredGroups": 1020},
        "bulk500Projection": {"path": "vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-05/effective-draft-projection.json",
            "sha256": sha_file(ROOT / "vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-05/effective-draft-projection.json"),
            "selectionFingerprint": FROZEN_COHORT},
        "proposalSources": context["proposalSources"],
        "checkpoint07NewFieldProposal": {"path": CP07_NEW_FIELDS.relative_to(ROOT).as_posix(), "sha256": sha_file(CP07_NEW_FIELDS)},
        "boundaryProposalSources": boundary_refs,
        "fullBatchEvidence": batches,
        "fullBatchEvidenceFileHashes": batch_pins,
        "draftV2OverlayContract": {"script": "scripts/phase-2h2g-draft-v2.py",
            "scriptSha256": sha_file(ROOT / "scripts/phase-2h2g-draft-v2.py"),
            "test": "scripts/phase-2h2g-draft-v2-test.py",
            "testSha256": sha_file(ROOT / "scripts/phase-2h2g-draft-v2-test.py"),
            "acceptedOverlayFingerprint": "6633405d49aa0e211265d38be37b074e99cd783d787681d4a25909843a7fe071"},
        "priorityAccounting": {"cumulativePriorityCounts": queue_data["cumulativePriorityCounts"],
            "deduplicatedInventoryPriorityCounts": queue_data["deduplicatedInventoryPriorityCounts"]},
        "phase": "2H.2J-R1", "remoteBaseline": REMOTE_BASELINE,
        "parentCheckpoint07Fingerprint": PARENT_CHECKPOINT_FINGERPRINT,
        "parentHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
        "acceptedAuditRecordedRemoteBaseline": ACCEPTED_AUDIT_RECORDED_REMOTE_BASELINE,
        "frozenAuthoringCohortFingerprint": FROZEN_COHORT,
    }
    candidate_ref = {"path": (WS / SELECTION).relative_to(ROOT).as_posix(), "sha256": stable_text_sha(WS / SELECTION)}
    eligibility_ref = {"path": (WS / ELIGIBILITY).relative_to(ROOT).as_posix(), "sha256": stable_text_sha(WS / ELIGIBILITY)}
    application_ref = {"path": (WS / APPLICATION).relative_to(ROOT).as_posix(), "sha256": stable_text_sha(WS / APPLICATION)}
    batch_review_ref = {"path": (WS / FULL_BATCH_INPUT).relative_to(ROOT).as_posix(), "sha256": stable_text_sha(WS / FULL_BATCH_INPUT)}
    verification_ref = {"path": (WS / VERIFICATION).relative_to(ROOT).as_posix(),
                        "binding": "Detached post-assembly validation receipt; bound by manifest fingerprint, not self-hashed."}

    applied = []
    for revision in revisions:
        proposal = props_by_id[revision["correctionProposalId"]]
        applied.append({"correctionProposalId": revision["correctionProposalId"],
                        "proposalKey": revision["proposalKey"], "candidateGroupKey": revision["candidateGroupKey"],
                        "previousEffectiveContentHash": revision["previousEffectiveContentHash"],
                        "fieldPointer": revision["fieldPointer"], "before": revision["before"], "after": revision["after"],
                        "beforeFieldSha256": revision["beforeFieldSha256"], "afterFieldSha256": revision["afterFieldSha256"],
                        "revisedContentHash": revision["revisedContentHash"], "revisionId": revision["revisionId"],
                        "revisionLayer": revision["revisionLayer"], "sourceAuditCheckpoint": revision["sourceAuditCheckpoint"],
                        "historicalProposalReference": {"path": proposal["_sourcePath"], "sha256": proposal["_sourceSha256"]},
                        "eligibilityAssessment": eligibility_ref, "rights": "UNKNOWN_REVIEW_REQUIRED",
                        "contentStatus": "DRAFT", "ownerApproval": False, "canonicalIdAllocated": False,
                        "originalProvenance": revision["originalProvenance"]})

    post_qa = {
        "phase": "2H.2J-R1", "status": "PASS_WITH_REVIEW_ITEMS",
        "reviewKind": "AI_POST_REMEDIATION_BATCH_REVIEW_NOT_OWNER_APPROVAL",
        "affectedAuthoredBatches": [b["batch"] for b in batches],
        "fullBatchesReviewed": len(batches), "sensesReviewed": len(reviews),
        "pass": pass_count, "review": review_count, "fail": 0,
        "appliedSenseRevisions": len(revisions), "unresolvedHistoricalReviewNotConvertedToPass": True,
        "checks": {"grammar": "PASS_FOR_3_APPLIED_FIELDS", "meaningPreservation": "PASS_FOR_3_APPLIED_FIELDS",
            "englishNaturalness": "PASS_FOR_3_APPLIED_FIELDS", "vietnameseFaithfulness": "PASS_FOR_3_APPLIED_FIELDS",
            "posAndConstruction": "PASS_FOR_ALL_REVIEWED_BATCH_SENSES",
            "sourceProvenancePreserved": True, "externalRightsOrOriginalityClearance": "NOT_PERFORMED",
            "sourceOriginalitySignals": "REVIEWED_WITHIN_PINNED_SOURCE_SCOPE; NO_RIGHTS_CLEARANCE_INFERRED",
            "senseBoundaryStability": "PASS_NO_BOUNDARY_CHANGES", "fieldCompleteness": "PASS",
            "duplicateContent": "CHECKED_FOR_REVIEWED_BATCHES", "historicalReviewConvertedToPass": False},
        "reviewedSenseReferences": [{"proposalKey": r["proposalKey"],
            "parentEffectiveContentHash": r["parentEffectiveContentHash"],
            "remediatedEffectiveContentHash": r["reviewedEffectiveContentHash"],
            "reviewStatus": r["reviewStatus"]} for r in reviews],
        "rights": "UNKNOWN_REVIEW_REQUIRED", "ownerApproval": False, "releaseEligible": False,
    }
    artifacts = {
        "accepted-input-pins.json": input_pins,
        "pilot-selection-receipt.json": authored["selection"],
        "authored/eligibility-assessments.json": authored["eligibility"],
        "authored/application-decisions.json": authored["application"],
        "authored/full-batch-review-assessments.json": authored["batchReview"],
        "applied-draft-corrections.json": {"schemaVersion": "OFFLINE_DRAFT_REMEDIATION_PILOT_V1",
            "status": "APPLIED_TO_NEW_VERSIONED_DRAFT_LAYER", "applicationScope": "EXACT_THREE_FIELDS_ONLY",
            "corrections": applied, "historicalProposalStatusRemainsUnapplied": True, "authorization": AUTH},
        "draft-revisions.json": {"schemaVersion": "OFFLINE_VERSIONED_DRAFT_OVERLAY_V1",
            "revisionLayer": "DRAFT_REMEDIATION_PILOT_01", "revision": 1,
            "parentProjection": INDEX_PATH.relative_to(ROOT).as_posix(), "records": revisions,
            "duplicateApplicationPolicy": "FAIL_CLOSED", "authorization": AUTH},
        "remediated-effective-draft-projection.json": {"schemaVersion": "OFFLINE_EFFECTIVE_DRAFT_PROJECTION_V1",
            "contentStatus": "DRAFT", "count": len(all_rows), "records": all_rows,
            "baseProjection": {"path": INDEX_PATH.relative_to(ROOT).as_posix(), "sha256": sha_file(INDEX_PATH)},
            "latestOverlay": "draft-revisions.json", "publicationEligible": False, "authorization": AUTH},
        "remediated-content-hash-mapping.json": {"count": len(mapping), "records": mapping,
            "changedSenseCount": len(changed), "unchangedSenseCount": len(mapping) - len(changed)},
        "full-batch-re-review.json": {"reviewKind": "AI_FULL_AUTHORED_BATCH_REVIEW_NOT_OWNER_APPROVAL",
            "status": "COMPLETE_FOR_SELECTED_PROPOSAL_BATCHES", "batches": batches, "reviews": reviews,
            "reviewedSenseCount": len(reviews), "pass": pass_count, "review": review_count, "fail": 0,
            "criticalDefectFound": False, "formalOwnerApproval": False},
        "post-remediation-quality-audit.json": post_qa,
        "remaining-remediation-queue.json": {"historicalAuditPriorityAccounting": input_pins["priorityAccounting"],
            "fieldProposals": original_inventory, "fieldProposalCount": len(original_inventory),
            "boundaryProposals": boundary_inventory, "boundaryProposalCount": len(boundary_inventory),
            "selected": len(selections), "eligible": len(APPLY_IDS), "deferred": 1, "rejected": 0,
            "unselectedPending": len(original_inventory) - len(selections),
            "correctionsAppliedToNewLayer": len(applied),
            "nextBoundaryGroups": ["condensed", "hail", "to", "elastic", "high", "harness", "fiery", "instrumental"],
            "authorization": AUTH},
        "validation-summary.json": {"phase": "2H.2J-R1", "status": "COMPLETE_WITH_DEFERRED_CANDIDATE_AND_REVIEW_ITEMS",
            "parentFinalAuditFingerprint": PARENT_CHECKPOINT_FINGERPRINT,
            "parentFinalAuditHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
            "pilotCandidatesSelected": len(selections), "pilotCandidatesEligible": len(APPLY_IDS),
            "pilotCandidatesDeferred": 1, "pilotCandidatesRejected": 0,
            "newDraftFieldCorrectionsApplied": len(applied), "distinctSensesRevised": len(revisions),
            "effectiveDraftSenseCount": len(all_rows), "originalEffectiveProjectionUnchanged": True,
            "affectedBatches": [b["batch"] for b in batches], "fullBatchesReviewed": len(batches),
            "postRemediationQa": {"PASS": pass_count, "REVIEW": review_count, "FAIL": 0},
            "unselectedSensesPreserved": True, "originalFieldProposalsPreserved": 141,
            "originalBoundaryProposalsPreserved": 8, "historicalReviewStatesPreserved": True,
            "correctionsApplied": len(applied), "ownerApprovalsAdded": 0, "canonicalIdsAllocated": 0,
            "rights": "UNKNOWN_REVIEW_REQUIRED", "releaseEligible": False,
            "masterReleaseChanged": False, "legacyModified": False,
            "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED",
            "verificationReference": verification_ref,
            "selectionReference": candidate_ref, "eligibilityReference": eligibility_ref,
            "applicationReference": application_ref, "batchReviewReference": batch_review_ref,
            "authorization": AUTH},
    }
    report = render_report(artifacts)
    artifact_text = {name: encode(value) for name, value in artifacts.items()}
    artifact_text["report.md"] = report
    manifest = {
        "phase": "2H.2J-R1", "pilot": "TARGETED_DRAFT_REMEDIATION_PILOT_01",
        "parentFinalAuditFingerprint": PARENT_CHECKPOINT_FINGERPRINT,
        "parentFinalAuditHandoffFingerprint": PARENT_HANDOFF_FINGERPRINT,
        "remoteBaseline": REMOTE_BASELINE, "frozenAuthoringCohortFingerprint": FROZEN_COHORT,
        "artifactHashes": {name: sha_bytes(text.encode("utf-8")) for name, text in artifact_text.items()},
        "authoredInputHashes": {name: stable_text_sha(WS / name) for name in [SELECTION, ELIGIBILITY, APPLICATION, FULL_BATCH_INPUT]},
        "sourceHashes": {"phase-2h2j-draft-remediation-pilot-01.py": stable_text_sha(ROOT / "scripts/phase-2h2j-draft-remediation-pilot-01.py"),
                         "phase-2h2j-draft-remediation-pilot-01-test.py": stable_text_sha(ROOT / "scripts/phase-2h2j-draft-remediation-pilot-01-test.py")},
        "correctionCount": len(applied), "distinctRevisedSenseCount": len(revisions),
        "effectiveDraftSenseCount": len(all_rows), "fullBatchReviewCount": len(reviews),
        "rights": "UNKNOWN_REVIEW_REQUIRED", "ownerApprovalsAdded": 0, "canonicalIdsAllocated": 0,
        "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED",
        "detachedVerificationReceipt": {"path": VERIFICATION,
            "binding": "The receipt records post-assembly checks and binds to this manifest fingerprint; it is detached to avoid a self-referential hash."},
        "authorization": AUTH,
    }
    manifest["fingerprint"] = digest(manifest)
    artifact_text["manifest.json"] = encode(manifest)
    return artifact_text, manifest


def render_report(artifacts):
    summary = artifacts["validation-summary.json"]
    revisions = artifacts["draft-revisions.json"]["records"]
    candidates = artifacts["pilot-selection-receipt.json"]["candidates"]
    eligibility = {x["correctionProposalId"]: x for x in artifacts["authored/eligibility-assessments.json"]["records"]}
    lines = [
        "# Phase 2H.2J-R1 — Targeted DRAFT Remediation Pilot 01", "",
        "Status: complete for three eligible DRAFT field overlays, with one candidate deferred and historical REVIEW items preserved.",
        f"Parent final audit: `{PARENT_CHECKPOINT_FINGERPRINT}`; handoff: `{PARENT_HANDOFF_FINGERPRINT}`.",
        "", "## Candidate decisions", "",
    ]
    for candidate in candidates:
        item = eligibility[candidate["correctionProposalId"]]
        lines.append(f"- `{candidate['correctionProposalId']}` / `{candidate['proposalKey']}` — {item['eligibilityStatus']}: {item['reviewExplanationVi']}")
    lines += ["", "## Applied DRAFT overlay", "",
              f"- Applied field corrections: {len(revisions)} across {len(revisions)} Senses; effective DRAFT projection remains {summary['effectiveDraftSenseCount']} records.",
              "- Original projection and source proposal files remain unchanged. The historical proposals remain unapplied in their source audit artifacts.",
              "- Affected original author batches: 68, 72, and 81; all 24 current Senses were re-reviewed.",
              f"- Post-remediation batch review: {summary['postRemediationQa']['PASS']} PASS, {summary['postRemediationQa']['REVIEW']} REVIEW, {summary['postRemediationQa']['FAIL']} FAIL. Historical REVIEW was not converted to PASS.",
              "", "## Preserved boundaries and limits", "",
              "- The eight noncanonical Sense-boundary proposals remain unchanged and out of scope.",
              "- Content remains DRAFT; owner approval is not implied; rights remain UNKNOWN_REVIEW_REQUIRED; release eligibility is NO.",
              "- No canonical IDs, database access/writes, Production operations, Master release changes, or legacy modifications occurred.",
              "- The known Hybrid v2.2.0 4/5 release-tree diagnostic remains recorded; v2.2.1 verification is independent.",
              "- No external originality or rights clearance is claimed.",
              "", "## Next recommendation", "",
              "Continue only with a separately authorized targeted DRAFT remediation batch, selecting remaining proposals after current-content and full-batch review.", ""]
    return "\n".join(lines)


def validate_detached_replay(verification, fingerprint):
    if verification.get("pilotFingerprint"):
        require(verification["pilotFingerprint"] == fingerprint,
                "Detached verification receipt references a different pilot fingerprint")
    if verification.get("postAssemblyReplay"):
        replay = verification["postAssemblyReplay"]
        require(len(replay) >= 2 and len({row["pythonHashSeed"] for row in replay}) >= 2
                and all(row["exitCode"] == 0 and row["fingerprint"] == fingerprint
                        and row["zeroWrites"] is True for row in replay),
                "Detached post-assembly replay results are incomplete or inconsistent")


def run(check=False):
    outputs, manifest = build()
    for name, text in outputs.items():
        path = WS / name
        expected = text.encode("utf-8")
        if check:
            require(path.is_file() and path.read_bytes().replace(b"\r\n", b"\n") == expected,
                    "Pilot checkpoint replay drift: " + name)
        else:
            require(not path.exists() or path.read_bytes().replace(b"\r\n", b"\n") == expected,
                    "Refusing to overwrite immutable pilot artifact: " + name)
    if not check:
        for name, text in outputs.items():
            path = WS / name
            if not path.exists():
                require(path.resolve().is_relative_to(WS.resolve()), "Unsafe pilot output path")
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_bytes(text.encode("utf-8"))
    verification = read(WS / VERIFICATION)
    validate_detached_replay(verification, manifest["fingerprint"])
    return {"fingerprint": manifest["fingerprint"], "status": "COMPLETE_WITH_DEFERRED_CANDIDATE_AND_REVIEW_ITEMS",
            "zeroWrites": check, "correctionsApplied": manifest["correctionCount"],
            "distinctSensesRevised": manifest["distinctRevisedSenseCount"]}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    args = parser.parse_args()
    print(encode(run(args.check)), end="")


if __name__ == "__main__":
    main()
