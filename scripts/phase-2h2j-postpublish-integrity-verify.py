#!/usr/bin/env python3
"""Offline published Batch 04 integrity; --check is strictly read-only."""
import argparse
import copy
import hashlib
import json
import subprocess
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = "vocabflow-dataset/workspaces/master-editorial-draft-remediation"
WS = BASE + "/checkpoints/batch-04"
OUT = BASE + "/verifications/postpublish-r4p3"
PUBLISHED = "0e2246cd74c456b2391274d756653e624f731671"
PARENT = "0e3a1d65231bffd2886cd6dba1d20ad756f37e65"
FINGERPRINT = "bb669bee71f2dfc6c53b8b9ec3511caae9dc31b13be342044829d674a22ddb82"
PREFIX = "vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/"
ALLOWLIST = {
    PREFIX + "checkpoint-05/authored/new-correction-proposals.json": {
        "blob": "c9bb060f96e062543355dd3812efdcc68ea4c0ec",
        "working": "b000e11c98b480bb9a7e22918881ff05cdbc1714d11d4c92e4bfcf93a55a76e9",
        "git": "108f013c72fdcb6f5b9f52a4e4af17f8a221481df1613ba54e2906c4fbe86a4a",
        "gitBytes": 36494, "workingBytes": 36495, "newlines": 1,
        "class": "AUTHORIZED_EOF_EOL_EQUIVALENCE", "proposalRecords": 23,
        "rule": 'git_bytes[:-1] + b"\\r\\n"',
    },
    PREFIX + "checkpoint-06/authored/new-boundary-proposals.json": {
        "blob": "19b98fbec4f6699aa38415aa80014725ac57751a",
        "working": "da6f219b298aa063f729aa1b5646ea28a00940361f365ca87600b4d1a7959999",
        "git": "e4f0670df5ece60c2b7fa27ef1dac0af7938b9d868d27f97b46d0bb66ba24d6a",
        "gitBytes": 4146, "workingBytes": 4244, "newlines": 98,
        "class": "AUTHORIZED_FULL_FILE_EOL_EQUIVALENCE", "proposalRecords": 1,
        "rule": 'git_bytes.replace(b"\\n", b"\\r\\n")',
    },
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    # Existing editorial checkpoint contract, not Master release JCS.
    return sha(json.dumps(value, ensure_ascii=False, sort_keys=True,
                          separators=(",", ":")).encode("utf-8"))


def encode(value):
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2) + "\n").encode("utf-8")


def git(*args):
    return subprocess.check_output(["git", *args], cwd=ROOT)


def ancestry(ancestor, descendant):
    return subprocess.run(["git", "merge-base", "--is-ancestor", ancestor, descendant],
                          cwd=ROOT, capture_output=True).returncode == 0


def git_identity(published=PUBLISHED, parent=PARENT):
    require(published == PUBLISHED and parent == PARENT, "Git commit pin changed")
    require(git("rev-parse", "--verify", published + "^{commit}").decode().strip() == published,
            "Published commit missing")
    require(git("branch", "--show-current").decode().strip() == "TXH", "Expected TXH branch")
    require(ancestry(parent, published), "Invalid Batch 03 ancestry")
    require(ancestry(published, "HEAD"), "Published commit not on current history")
    return {"publishedCommit": published, "parentCommit": parent,
            "parentIsAncestor": True, "publishedIsCurrentAncestor": True,
            "headContract": "Any TXH descendant with unchanged protected Git blobs"}


def extract_pins(value):
    refs = []
    def walk(node, pointer):
        if isinstance(node, dict):
            if isinstance(node.get("path"), str) and isinstance(node.get("sha256"), str):
                refs.append((node["path"], node["sha256"], pointer))
            for key, item in node.items():
                walk(item, pointer + "/" + key.replace("~", "~0").replace("/", "~1"))
        elif isinstance(node, list):
            for index, item in enumerate(node):
                walk(item, pointer + "/" + str(index))
    walk(value, "")
    pins = {}
    for path, hash_value, pointer in refs:
        require(not Path(path).is_absolute() and ".." not in Path(path).parts
                and "\\" not in path, "Unsafe pin path: " + path)
        if path in pins:
            require(pins[path]["sha256"] == hash_value, "Conflicting accepted pin: " + path)
            pins[path]["references"].append(pointer)
        else:
            pins[path] = {"sha256": hash_value, "references": [pointer]}
    require(len(refs) == 1031 and len(pins) == 488, "Parent reference/unique scope mismatch")
    return refs, pins


def newlines(data):
    crlf = data.count(b"\r\n")
    return {"LF": data.count(b"\n"), "CRLF": crlf,
            "bareLF": data.count(b"\n") - crlf, "bareCR": data.count(b"\r") - crlf}


def verify_bytes(path, accepted, working, blob, oid, parent_oid):
    require(sha(working) == accepted, "Accepted working SHA256 mismatch: " + path)
    require(hashlib.sha1(b"blob " + str(len(blob)).encode() + b"\0" + blob).hexdigest() == oid,
            "Git blob object ID mismatch: " + path)
    evidence = {"path": path, "publishedCommit": PUBLISHED, "originalCommit": PARENT,
                "gitBlobObjectId": oid, "parentGitBlobObjectId": parent_oid,
                "acceptedWorkingSha256": accepted, "observedWorkingSha256": sha(working),
                "gitContentSha256": sha(blob), "workingBytes": len(working), "gitBytes": len(blob),
                "workingNewlines": newlines(working), "gitNewlines": newlines(blob)}
    if path not in ALLOWLIST:
        require(working == blob, "UNAUTHORIZED_BYTE_DIFFERENCE: " + path)
        evidence["classification"] = "BYTE_EXACT_MATCH"
        return evidence
    pin = ALLOWLIST[path]
    require(oid == parent_oid == pin["blob"], "Exception Git object pin mismatch: " + path)
    require(accepted == pin["working"] and sha(blob) == pin["git"],
            "Exception dual SHA256 mismatch: " + path)
    require(len(blob) == pin["gitBytes"] and len(working) == pin["workingBytes"],
            "Exception byte count mismatch: " + path)
    require(blob.count(b"\n") == pin["newlines"] and b"\r" not in blob
            and newlines(working) == {"LF": pin["newlines"], "CRLF": pin["newlines"],
                                     "bareLF": 0, "bareCR": 0},
            "Exception exact newline count mismatch: " + path)
    if pin["class"] == "AUTHORIZED_EOF_EOL_EQUIVALENCE":
        require(blob.endswith(b"\n"), "Exception EOF is not LF")
        constructed = blob[:-1] + b"\r\n"
    else:
        constructed = blob.replace(b"\n", b"\r\n")
    require(constructed == working and sha(constructed) == pin["working"],
            "Exception exact transformation mismatch: " + path)
    require(len(json.loads(working.decode("utf-8"))["records"]) == pin["proposalRecords"],
            "Exception historical proposal count mismatch: " + path)
    evidence.update(classification=pin["class"], transformation=pin["rule"],
                    gitLfOffsets=[i for i, value in enumerate(blob) if value == 10],
                    transformedSha256=sha(constructed), exactTransformationVerified=True,
                    preservedProposalRecords=pin["proposalRecords"])
    return evidence


class Reader:
    """Raw blob batch reader; no checkout, filters, text decoding or writes."""
    def __init__(self):
        self.working = {}
        self.blobs = {}

    def raw(self, path):
        if path not in self.working:
            self.working[path] = (ROOT / path).read_bytes()
        return self.working[path]

    def read(self, path):
        return json.loads(self.raw(path).decode("utf-8"))

    def preload(self, paths):
        requests = [(commit, path) for commit in [PUBLISHED, "HEAD"] for path in sorted(paths)]
        requests += [(PARENT, path) for path in sorted(ALLOWLIST)]
        raw = subprocess.run(["git", "cat-file", "--batch"], cwd=ROOT, check=True,
                             input="".join(c + ":" + p + "\n" for c, p in requests).encode(),
                             capture_output=True).stdout
        pos = 0
        for key in requests:
            end = raw.index(b"\n", pos)
            header = raw[pos:end].split()
            require(len(header) == 3 and header[1] == b"blob", "MISSING_OR_UNVERIFIABLE: " + str(key))
            size = int(header[2])
            self.blobs[key] = (header[0].decode(), raw[end + 1:end + 1 + size])
            pos = end + size + 2
        require(pos == len(raw), "Unexpected cat-file stream bytes")

    def evidence(self, path, accepted):
        oid, blob = self.blobs[PUBLISHED, path]
        require(self.blobs["HEAD", path][0] == oid, "Protected current Git blob drift: " + path)
        parent_oid = self.blobs.get((PARENT, path), (None, None))[0]
        return verify_bytes(path, accepted, self.raw(path), blob, oid, parent_oid)


def fingerprint(manifest, expected=None):
    computed = digest({k: v for k, v in manifest.items() if k != "fingerprint"})
    require(computed == manifest["fingerprint"] and (expected is None or computed == expected),
            "Manifest fingerprint mismatch")
    return computed


def receipt(value):
    require(value and value.get("batch04Fingerprint") == FINGERPRINT
            and value.get("status") == "PASS_WITH_RECORDED_DIAGNOSTICS"
            and value.get("zeroWriteReplaySeeds") == ["20261010", "271828"],
            "Detached verification receipt missing or invalid")


def index(records, key, count=None):
    result = {row[key]: row for row in records}
    require(len(result) == len(records) and (count is None or len(result) == count),
            "Missing or duplicate " + key)
    return result


def content_hash(row):
    return digest({"proposalKey": row["proposalKey"], "candidateGroupKey": row["candidateGroupKey"],
                   "headword": row["headword"], "partOfSpeechProposal": row["partOfSpeech"],
                   "content": row["content"]})


def pointer(row, path, replacement=None, write=False):
    parts = path.strip("/").split("/")
    target = row
    for part in parts[:-1]:
        target = target[int(part)] if isinstance(target, list) else target[part]
    key = int(parts[-1]) if isinstance(target, list) else parts[-1]
    if write:
        target[key] = replacement
    return target[key]


def content_invariants(reader, manifest):
    original_path = "vocabflow-dataset/workspaces/master-editorial-aggregate-qa/effective-sense-index.json"
    original = index(reader.read(original_path)["records"], "proposalKey", 1563)
    prior = original
    all_ids, all_keys, all_layers = set(), set(), {}
    lineage = []
    expected_fps = [manifest["parentPilot01Fingerprint"], manifest["parentBatch02Fingerprint"],
                    manifest["parentBatch03Fingerprint"], FINGERPRINT]
    expected_counts = [3, 3, 12, 22]
    for phase, expected_fp, expected_count in zip(
            ["pilot-01", "batch-02", "batch-03", "batch-04"], expected_fps, expected_counts):
        base = BASE + "/checkpoints/" + phase
        m = reader.read(base + "/manifest.json")
        fingerprint(m, expected_fp)
        require(m["authorization"]["contentStatus"] == "DRAFT" and m["rights"] == "UNKNOWN_REVIEW_REQUIRED"
                and m["canonicalIdsAllocated"] == 0 and m["ownerApprovalsAdded"] == 0,
                "Checkpoint authorization changed")
        if phase == "batch-02":
            require(m["parentPilotFingerprint"] == expected_fps[0], "Pilot lineage mismatch")
        if phase in {"batch-03", "batch-04"}:
            require(m["parentBatch02Fingerprint"] == expected_fps[1], "Batch 02 lineage mismatch")
        if phase == "batch-04":
            require(m["parentBatch03Fingerprint"] == expected_fps[2] and m["parentCommit"] == PARENT,
                    "Batch 03 lineage mismatch")
        revisions = reader.read(base + "/draft-revisions.json")["records"]
        ledger = reader.read(base + "/applied-draft-corrections.json")["corrections"]
        ids = index(ledger, "correctionProposalId", expected_count)
        require(all_ids.isdisjoint(ids), "Duplicate cumulative correction application")
        revised = index(revisions, "proposalKey", expected_count)
        require(all_keys.isdisjoint(revised), "Duplicate cumulative revised Sense")
        name = "remediated-effective-draft-projection.json" if phase == "pilot-01" else "cumulative-remediated-effective-draft-projection.json"
        projection = reader.read(base + "/" + name)
        current = index(projection["records"], "proposalKey", 1563)
        require(set(current) == set(prior), "Missing parent overlay identity")
        require(len({r["candidateGroupKey"] for r in current.values()}) == 1020,
                "Authored group mismatch")
        changed = {key for key in prior if prior[key] != current[key]}
        require(changed == set(revised), "Unselected change or missing parent overlay")
        revision_ids = []
        for key, revision in revised.items():
            old, new = prior[key], current[key]
            require(revision["previousEffectiveContentHash"] == old["effectiveContentHash"],
                    "Revision parent content hash mismatch")
            clone = copy.deepcopy(old)
            fields = revision.get("fieldRevisions", [revision])
            for field in fields:
                proposal_id = field["correctionProposalId"]
                require(proposal_id in ids, "Revision missing ledger ID")
                revision_ids.append(proposal_id)
                require(pointer(clone, field["fieldPointer"]) == field["before"], "Revision BEFORE mismatch")
                require(sha(field["before"].encode()) == field["beforeFieldSha256"]
                        and sha(field["after"].encode()) == field["afterFieldSha256"], "Field hash mismatch")
                require(ids[proposal_id]["before"] == field["before"]
                        and ids[proposal_id]["after"] == field["after"]
                        and ids[proposal_id]["proposalKey"] == key, "Correction ledger body mismatch")
                pointer(clone, field["fieldPointer"], field["after"], True)
            clone["effectiveContentHash"] = content_hash(clone)
            require(clone == new == revision["record"]
                    and revision["revisedContentHash"] == clone["effectiveContentHash"],
                    "Overlay/provenance reconstruction mismatch")
            require(revision["contentStatus"] == "DRAFT" and revision["rights"] == "UNKNOWN_REVIEW_REQUIRED"
                    and revision["ownerApproval"] is False and revision["canonicalIdAllocated"] is False,
                    "Revision authorization changed")
            all_layers.setdefault(key, []).append({"revisionId": revision["revisionId"],
                                                   "revisionLayer": revision["revisionLayer"],
                                                   "revisedContentHash": revision["revisedContentHash"]})
        require(len(revision_ids) == len(set(revision_ids)) and set(revision_ids) == set(ids),
                "Ledger lost or duplicate ID")
        all_ids.update(ids)
        all_keys.update(revised)
        lineage.append({"checkpoint": phase, "fingerprint": expected_fp,
                        "corrections": len(ids), "overlayVerified": True})
        prior = current
    require(len(all_ids) == len(all_keys) == 40, "Cumulative correction count mismatch")
    mapping = index(reader.read(WS + "/cumulative-content-hash-mapping.json")["records"], "proposalKey", 1563)
    require(set(mapping) == set(original), "Cumulative mapping identities mismatch")
    for key, row in mapping.items():
        require(row["originalEffectiveContentHash"] == original[key]["effectiveContentHash"]
                and row["cumulativeEffectiveContentHash"] == prior[key]["effectiveContentHash"]
                and row["revisionLayers"] == all_layers.get(key, []), "Cumulative mapping/lineage mismatch: " + key)
        require(prior[key]["rights"] == "UNKNOWN_REVIEW_REQUIRED"
                and prior[key]["formalApproval"] == original[key]["formalApproval"], "Approval/rights drift")
    inventory = reader.read(WS + "/candidate-inventory.json")
    proposals = index(inventory["records"], "correctionProposalId", 141)
    parent_inventory = reader.read(BASE + "/checkpoints/batch-03/candidate-inventory.json")
    parent_proposals = index(parent_inventory["records"], "correctionProposalId", 141)
    require(set(proposals) == set(parent_proposals), "Original proposal disappeared")
    historical_records, historical_boundaries = [], []
    for path in sorted(manifest["sourceHashes"]):
        if path.startswith("proposal-source/"):
            source = reader.read(path.removeprefix("proposal-source/"))
            historical_records.extend(source["records"])
            historical_boundaries.extend(source.get("additionalBoundaryProposals", []))
    historical_boundaries.extend(reader.read(PREFIX + "checkpoint-06/authored/new-boundary-proposals.json")["records"])
    historical = index(historical_records, "correctionProposalId", 141)
    require(set(historical) == set(proposals), "Original source proposal IDs missing")
    for key, row in proposals.items():
        for field in ["before", "after", "proposalKey", "field"]:
            require(row[field] == historical[key][field], "Original source proposal body changed: " + key)
        for field in ["before", "after", "proposalKey", "candidateGroupKey", "sourceCheckpoint", "sourceProposalSha256"]:
            require(row.get(field) == parent_proposals[key].get(field), "Historical proposal changed: " + key)
    require(all_ids.issubset(proposals), "Applied proposal missing from history")
    boundary = inventory["boundaryProposals"]
    require(len(boundary) == 8 and boundary == parent_inventory["boundaryProposals"], "Boundary proposal drift")
    require(Counter(digest(row["proposal"]) for row in boundary)
            == Counter(digest(row) for row in historical_boundaries), "Original boundary source proposal mismatch")
    queue = reader.read(WS + "/remaining-remediation-queue.json")
    require(queue["boundaryProposals"] == boundary and queue["protectedDeferredGroups"] == ["lot", "waste", "aggregate"],
            "Protected deferrals/boundaries changed")
    states = Counter()
    for row in proposals.values():
        disposition = row.get("batch04Disposition") or row.get("batch03Disposition")
        if row["correctionProposalId"] in all_ids:
            category = "ALREADY_APPLIED"
        elif disposition == "REJECT_INCORRECT_AFTER":
            category = "PREVIOUSLY_REJECTED"
        elif disposition.startswith("DEFER_") or disposition == "PREVIOUSLY_DEFERRED_PRESERVED":
            category = "PREVIOUSLY_DEFERRED"
        elif disposition == "PENDING_IDENTITY_OR_BOUNDARY_REVIEW":
            category = "REQUIRES_IDENTITY_OR_BOUNDARY"
        else:
            require(disposition == "UNSELECTED_PENDING_REVIEW", "Unknown proposal classification")
            category = "UNREVIEWED_CANDIDATE"
        states[category] += 1
    require(dict(states) == inventory["postBatch04StateCounts"] == {
        "ALREADY_APPLIED": 40, "PREVIOUSLY_DEFERRED": 19, "PREVIOUSLY_REJECTED": 1,
        "REQUIRES_IDENTITY_OR_BOUNDARY": 4, "UNREVIEWED_CANDIDATE": 77}, "Proposal state reconciliation mismatch")
    review = reader.read(WS + "/full-batch-re-review.json")["reviews"]
    index(review, "proposalKey", 55)
    for row in review:
        require(row["reviewedContentHash"] == prior[row["proposalKey"]]["effectiveContentHash"]
                and row["reviewedContentSnapshot"] == prior[row["proposalKey"]]["content"], "Full-batch review hash mismatch")
    return {"senseCount": len(prior), "authoredGroupCount": 1020, "cumulativeCorrections": len(all_ids),
            "distinctRevisedSenses": len(all_keys), "historicalFieldProposals": len(proposals),
            "boundaryProposals": len(boundary), "proposalStates": dict(states), "lineage": lineage,
            "originalProjectionPath": original_path, "originalProjectionSha256": sha(reader.raw(original_path)),
            "contentStatus": "DRAFT", "rights": "UNKNOWN_REVIEW_REQUIRED", "overlayAndProvenanceVerified": True}


def verify():
    identity = git_identity()
    reader = Reader()
    manifest = reader.read(WS + "/manifest.json")
    fingerprint(manifest, FINGERPRINT)
    refs, pins = extract_pins(reader.read(WS + "/accepted-parent-pins.json"))
    require(len(ALLOWLIST) == 2 and set(ALLOWLIST).issubset(pins), "Exact two-file allowlist scope mismatch")
    sources = {name.removeprefix("proposal-source/"): value for name, value in manifest["sourceHashes"].items()}
    artifacts = {WS + "/" + name: value for name, value in manifest["artifactHashes"].items()}
    require(len(sources) == 11 and len(artifacts) == 16, "Manifest artifact/source scope mismatch")
    receipt_path = WS + "/verification-results.json"
    extra = {WS + "/manifest.json", receipt_path}
    for phase in ["pilot-01", "batch-02", "batch-03"]:
        base = BASE + "/checkpoints/" + phase
        for p in (ROOT / base).rglob("*"):
            if p.is_file():
                extra.add(p.relative_to(ROOT).as_posix())
    reader.preload(set(pins) | set(sources) | set(artifacts) | extra)
    inventory = []
    for path, pin in sorted(pins.items()):
        evidence = reader.evidence(path, pin["sha256"])
        evidence["referencePointers"] = pin["references"]
        inventory.append(evidence)
    counts = Counter(row["classification"] for row in inventory)
    require(dict(counts) == {"BYTE_EXACT_MATCH": 486, "AUTHORIZED_EOF_EOL_EQUIVALENCE": 1,
                            "AUTHORIZED_FULL_FILE_EOL_EQUIVALENCE": 1}, "Third discrepancy or class mismatch")
    artifact_evidence = [reader.evidence(p, h) for p, h in sorted(artifacts.items())]
    source_evidence = [reader.evidence(p, h) for p, h in sorted(sources.items())]
    # Detached receipt and all ancestor checkpoint files must be raw Git-identical.
    for path in sorted(extra):
        reader.evidence(path, sha(reader.blobs[PUBLISHED, path][1]))
    receipt(reader.read(receipt_path))
    invariants = content_invariants(reader, manifest)
    for path, data in reader.working.items():
        require((ROOT / path).read_bytes() == data, "Protected file changed during verification: " + path)
    results = {"status": "PASS_WITH_TWO_EXPLICIT_EOL_EQUIVALENCES", "totalReferences": len(refs),
               "uniquePins": len(pins), "classifications": dict(counts),
               "unauthorizedDifferences": 0, "missingOrUnverifiable": 0,
               "R4_ORIGINAL_PREPUBLICATION_REPLAY": "BLOCKED_BY_OBSOLETE_HEAD_ASSERTION",
               "R4_REGENERATION_EQUIVALENCE": "NOT_INDEPENDENTLY_REESTABLISHED",
               "databaseAccess": "NONE", "databaseWrites": "NONE", "production": "UNTOUCHED"}
    return {"accepted-commit-pins.json": {"publishedCommit": PUBLISHED, "originalCommit": PARENT, "batch04Fingerprint": FINGERPRINT},
            "complete-parent-pin-inventory.json": {"totalReferences": len(refs), "uniquePins": len(pins), "records": inventory},
            "two-file-eol-allowlist.json": {"ownerAuthorization": "R4P.3 EXACTLY TWO FILES", "records": [r for r in inventory if r["path"] in ALLOWLIST]},
            "git-ancestry-verification.json": identity,
            "manifest-integrity-results.json": {"fingerprint": FINGERPRINT, "canonicalAlgorithm": "sha256 sorted compact UTF-8 JSON omitting fingerprint", "status": "PASS", "detachedReceipt": receipt_path},
            "artifact-integrity-results.json": {"records": artifact_evidence, "verified": len(artifact_evidence)},
            "source-byte-integrity-results.json": {"records": source_evidence, "verified": len(source_evidence)},
            "content-invariant-results.json": invariants, "verification-results.json": results}


CONTRACT = """# R4P.3 published integrity contract

Read-only command: `python -B scripts/phase-2h2j-postpublish-integrity-verify.py --check`.
Only explicit `--prepare` writes new verification artifacts; existing differing outputs are rejected.
Every parent pin uses raw working bytes and raw Git cat-file blob bytes; JSON equality cannot replace byte integrity.
The exact two-file allowlist pins path, parent/published commits, blob object ID, distinct SHA256 values,
byte/newline counts, exact LF offsets and the owner-authorized transformation. No wildcard normalization.
486 other files must be byte-identical. Accepted metadata is itself pinned by the published manifest.
Current TXH may advance only with all protected blobs unchanged. The report intentionally omits volatile HEAD.
Overlay reconstruction verifies persisted BEFORE/AFTER data and provenance; it does not regenerate the R4 builder.
Old scripts/checkpoints are unchanged. DRAFT, unknown rights, no approval/ID allocation, no database access.
Historical diagnostics (not newly run): bulk-500 UTF-8 35/35; Windows default two errors;
Hybrid v2.2.0 4/5; Hybrid v2.2.1 8/8. Original R4 replay remains blocked by its prepublication HEAD guard.
"""


def outputs():
    data = verify()
    files = {name: encode(value) for name, value in data.items()}
    files["verification-contract.md"] = CONTRACT.encode()
    files["report.md"] = ("# R4P.3 integrity evidence\n\n" + CONTRACT + "\n```json\n" +
                          encode(data["verification-results.json"]).decode() + "```\n").encode()
    manifest = {"phase": "2H.2J-R4P.3", "publishedCommit": PUBLISHED,
                "status": data["verification-results.json"]["status"],
                "artifactHashes": {name: sha(value) for name, value in sorted(files.items())}}
    manifest["fingerprint"] = digest(manifest)
    files["manifest.json"] = encode(manifest)
    return files, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--prepare", action="store_true")
    args = parser.parse_args()
    target = ROOT / OUT
    before = {p.relative_to(ROOT).as_posix(): sha(p.read_bytes())
              for p in target.rglob("*") if p.is_file()} if target.exists() else {}
    status_before = git("status", "--porcelain=v1", "--untracked-files=all")
    files, manifest = outputs()
    if args.prepare:
        require(not target.exists(), "Refusing to overwrite verification workspace")
        target.mkdir(parents=True)
        for name, value in files.items():
            (target / name).write_bytes(value)
    else:
        require(target.is_dir(), "Detached verification workspace missing")
        require({p.name for p in target.iterdir()} == set(files), "Detached verification artifact scope mismatch")
        for name, value in files.items():
            require((target / name).read_bytes() == value, "Detached verification artifact mismatch: " + name)
        after = {p.relative_to(ROOT).as_posix(): sha(p.read_bytes())
                 for p in target.rglob("*") if p.is_file()}
        require(before == after and status_before == git("status", "--porcelain=v1", "--untracked-files=all"),
                "Read-only replay changed workspace")
    print(json.dumps({"status": manifest["status"], "fingerprint": manifest["fingerprint"],
                      "zeroWrites": not args.prepare, "uniquePins": 488}))


if __name__ == "__main__":
    main()
