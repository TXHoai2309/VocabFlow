"""Freeze Cohort 500-03 from the accepted Cohort 500-02 parent, read-only in --check mode."""
import argparse
import copy
import hashlib
import importlib.util
import json
import subprocess
from collections import Counter
from pathlib import Path

ROOT = next(p for p in Path(__file__).resolve().parents if (p / "AGENTS.md").is_file())
OLD = ROOT / "vocabflow-dataset/workspaces/master-editorial-high-throughput-500"
PARENT_WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-high-throughput-500-02"
WS = ROOT / "vocabflow-dataset/workspaces/master-editorial-high-throughput-500-03"
PARENT_DIR = PARENT_WS / "checkpoints/checkpoint-05/assembled"
PARENT_CP = PARENT_WS / "checkpoints/checkpoint-05"
SEED = "PHASE_2H2L_COHORT_500_03_V1"
BASE = "5de34ecad78ec78fe1903d428fc6f82a440cc539"
PARENT_FP = "23cb5e4fc6786375cfe07581c7c91fcb097621dfe01ba3608cec6db70804e61e"
PREVIOUS_COHORT_FP = "9710a47fda875f70412c7440b2969c031dc6eb3c076140a42007aed4f83cf59c"
ORIGINAL_COHORT_FP = "f20e8c59d7b47cdf80f026d16acda8dbb283f948c8d5cb61cfef9c60cb7652c8"

spec = importlib.util.spec_from_file_location(
    "accepted_2h2k_contracts", ROOT / "scripts/phase-2h2k-checkpoint-02.py"
)
C = importlib.util.module_from_spec(spec)
spec.loader.exec_module(C)
V = C.V


def sha(data):
    return hashlib.sha256(data).hexdigest()


def digest(value):
    return V.digest(value)


def encode(value):
    return V.encode(value)


def require(condition, message):
    V.require(condition, message)


def source_membership(group):
    corpora = {ref["corpus"] for ref in group["sourceEvidence"]}
    return "BOTH" if corpora == {"OXFORD_5000", "ENGLISH_VOCAB_4600"} else (
        "OXFORD" if corpora == {"OXFORD_5000"} else "VOCAB"
    )


def risk_score(group):
    dimensions = group["priorityDimensions"]
    return sum(
        int(dimensions.get(key, 0) or 0)
        for key in ["POS_CONFLICT", "POSSIBLE_POLYSEMY", "EXISTING_MASTER_LEMMA", "LEGACY_HISTORY"]
    ) + int(len(group["normalizedPosCandidates"]) != 1)


def pos_family(group):
    candidates = set(group["normalizedPosCandidates"])
    if "NOUN" in candidates:
        return "NOUN"
    if "VERB" in candidates:
        return "VERB"
    if candidates & {"ADJECTIVE", "ADVERB"}:
        return "MODIFIER"
    return "OTHER"


def cefr_evidence(group):
    allowed = {"A1", "A2", "B1", "B2", "C1", "C2"}
    return sorted({
        evidence["value"]
        for ref in group["sourceEvidence"]
        for evidence in ref["cefrEvidence"]
        if evidence["value"] in allowed
    })


def seeded_hash(value):
    return sha((SEED + "\n" + value).encode("utf-8"))


def allocate(cells, total):
    population = sum(len(items) for items in cells.values())
    quotas = {key: (len(items) * total) // population for key, items in cells.items()}
    left = total - sum(quotas.values())
    order = sorted(
        cells,
        key=lambda key: (-((len(cells[key]) * total) % population), seeded_hash(json.dumps(key, separators=(",", ":")))),
    )
    for key in order[:left]:
        quotas[key] += 1
    require(sum(quotas.values()) == total, "Hamilton allocation failure")
    return quotas


def verify_inputs():
    require(subprocess.check_output(["git", "branch", "--show-current"], cwd=ROOT).decode().strip() == "TXH", "Not on TXH")
    require(subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT).decode().strip() == BASE, "Local baseline drift")
    remote = subprocess.check_output(["git", "ls-remote", "origin", "refs/heads/TXH"], cwd=ROOT).decode().split()
    require(remote and remote[0] == BASE, "Remote baseline drift")

    source_groups, _, _, sources = V.inputs()
    require(len(source_groups) == len({g["candidateGroupKey"] for g in source_groups}) == 6143, "Canonical ledger identity drift")
    original = V.frozen()
    require(original["fingerprint"] == ORIGINAL_COHORT_FP, "Original cohort fingerprint drift")

    previous_frozen_path = PARENT_WS / "selection/frozen-cohort.json"
    previous_manifest_path = PARENT_WS / "selection/selection-manifest.json"
    previous_frozen = V.load(previous_frozen_path)
    previous_manifest = V.load(previous_manifest_path)
    require(previous_frozen["fingerprint"] == PREVIOUS_COHORT_FP == digest({k: v for k, v in previous_frozen.items() if k != "fingerprint"}), "Cohort 500-02 frozen cohort digest drift")
    require(previous_manifest["fingerprint"] == digest({k: v for k, v in previous_manifest.items() if k != "fingerprint"}), "Cohort 500-02 selection manifest digest drift")
    require(previous_manifest["frozenCohortFingerprint"] == PREVIOUS_COHORT_FP, "Cohort 500-02 selection manifest target drift")
    for name, pin in previous_manifest["artifactHashes"].items():
        require(sha((PARENT_WS / "selection" / name).read_bytes()) == pin, "Cohort 500-02 frozen selection artifact drift: " + name)

    parent_manifest_path = PARENT_DIR / "manifest.json"
    parent_manifest = V.load(parent_manifest_path)
    require(parent_manifest["fingerprint"] == PARENT_FP == digest({k: v for k, v in parent_manifest.items() if k != "fingerprint"}), "CP05 parent manifest drift")
    require(parent_manifest["cohortFingerprint"] == PREVIOUS_COHORT_FP, "CP05 parent cohort mismatch")
    for name, pin in parent_manifest["artifactHashes"].items():
        require(sha((PARENT_DIR / name).read_bytes()) == pin, "CP05 parent artifact drift: " + name)
    for name, pin in parent_manifest["rawInputSha256"].items():
        require(sha((PARENT_CP / name).read_bytes()) == pin, "CP05 parent raw input drift: " + name)
    for name, pin in parent_manifest["toolingSha256"].items():
        require(sha((PARENT_WS / name).read_bytes()) == pin, "CP05 parent tooling drift: " + name)
    for name, pin in parent_manifest["selectionArtifactSha256"].items():
        require(sha((PARENT_WS / "selection" / name).read_bytes()) == pin, "CP05 parent selection artifact drift: " + name)

    projection_path = PARENT_DIR / "cumulative-effective-draft-projection.json"
    projection = V.load(projection_path)
    records = projection["records"]
    require(projection["contentStatus"] == "DRAFT" and projection["rights"] == "UNKNOWN_REVIEW_REQUIRED", "Parent projection status boundary drift")
    authored = {record["candidateGroupKey"] for record in records}
    require(len(records) == len({record["proposalKey"] for record in records}) == 2871, "Parent proposal accounting drift")
    require(len(authored) == 2020, "Parent authored group accounting drift")
    require(authored.issubset({g["candidateGroupKey"] for g in source_groups}), "Parent includes unknown source group")
    for record in records:
        require(record["rights"] == "UNKNOWN_REVIEW_REQUIRED", "Parent record rights boundary drift")
        require(record["effectiveContentHash"] == digest({
            "proposalKey": record["proposalKey"],
            "candidateGroupKey": record["candidateGroupKey"],
            "headword": record["headword"],
            "partOfSpeechProposal": record["partOfSpeech"],
            "content": record["content"],
        }), "Parent effective content hash drift")

    keys = {group["candidateGroupKey"] for group in source_groups}
    remaining = [copy.deepcopy(group) for group in source_groups if group["candidateGroupKey"] not in authored]
    require(len(remaining) == len({g["candidateGroupKey"] for g in remaining}) == 4123, "Eligible-pool accounting drift")
    return source_groups, authored, remaining, sources, projection, previous_frozen, parent_manifest


def stats(items, sources):
    source_counts = Counter(source_membership(group) for group in items)
    risk_counts = Counter("LOW_0" if risk_score(group) == 0 else "MODERATE_1_2" if risk_score(group) <= 2 else "ELEVATED_3_PLUS" for group in items)
    pos_counts = Counter(pos_family(group) for group in items)
    cefr_counts = Counter(
        level for group in items for level in cefr_evidence(group)
    )
    return {
        "sourceMembership": dict(sorted(source_counts.items())),
        "riskScoreBands": dict(sorted(risk_counts.items())),
        "posFamilies": dict(sorted(pos_counts.items())),
        "sourceCefrEvidenceOnly": dict(sorted(cefr_counts.items())),
        "emptyPosCandidateGroups": sum(not group["normalizedPosCandidates"] for group in items),
        "multiplePosCandidateGroups": sum(len(group["normalizedPosCandidates"]) > 1 for group in items),
        "possiblePolysemyFlagGroups": sum(bool(group["priorityDimensions"].get("POSSIBLE_POLYSEMY")) for group in items),
        "posConflictGroups": sum(bool(group["priorityDimensions"].get("POS_CONFLICT")) for group in items),
        "groups": len(items),
    }


def build():
    source_groups, authored, remaining, sources, projection, previous_frozen, parent_manifest = verify_inputs()
    cells = {}
    for group in remaining:
        cells.setdefault((source_membership(group), min(risk_score(group), 3), pos_family(group)), []).append(group)
    quotas = allocate(cells, 500)
    selected = []
    for key, items in sorted(cells.items()):
        selected.extend(sorted(items, key=lambda group: (seeded_hash("SELECT\n" + group["candidateGroupKey"]), group["candidateGroupKey"]))[:quotas[key]])
    selected.sort(key=lambda group: (seeded_hash("ORDER\n" + group["candidateGroupKey"]), group["candidateGroupKey"]))
    require(len(selected) == len({g["candidateGroupKey"] for g in selected}) == 500, "Selection count/identity drift")
    require(not authored.intersection(g["candidateGroupKey"] for g in selected), "Selection overlaps authored parent")
    for index, group in enumerate(selected, 1):
        group.update({
            "cohortOrder": index,
            "checkpoint": (index - 1) // 100 + 1,
            "authoringOrder": (index - 1) % 100 + 1,
            "microBatchWithinCheckpoint": ((index - 1) % 100) // 20 + 1,
            "selectionRiskScore": risk_score(group),
            "selectionRiskFlags": group["reviewFlags"],
        })

    selected_keys = {group["candidateGroupKey"] for group in selected}
    unselected = [copy.deepcopy(group) for group in remaining if group["candidateGroupKey"] not in selected_keys]
    require(len(unselected) == len({g["candidateGroupKey"] for g in unselected}) == 3623, "Unselected pool accounting drift")

    input_pins = {
        "sourceGroupLedgerSha256": sha((ROOT / "vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation/full-master-expansion-candidate-ledger.json").read_bytes()),
        "sourceInventoryHashes": {
            name: sha((ROOT / "vocabflow-dataset/workspaces/full-source-inventory-dedupe" / name).read_bytes())
            for name in ["oxford-normalized-inventory.json", "vocab4600-normalized-inventory.json"]
        },
        "parentProjectionSha256": sha((PARENT_DIR / "cumulative-effective-draft-projection.json").read_bytes()),
        "parentManifestSha256": sha((PARENT_DIR / "manifest.json").read_bytes()),
        "previousFrozenCohortSha256": sha((PARENT_WS / "selection/frozen-cohort.json").read_bytes()),
        "previousSelectionManifestSha256": sha((PARENT_WS / "selection/selection-manifest.json").read_bytes()),
        "freezeToolSha256": sha(Path(__file__).read_bytes()),
    }
    algorithm = "Proportionate stratified sample over observed joint source-membership × capped editorial-risk × POS-family cells. Allocate 500 with Hamilton largest remainders; deterministic SHA256 tie breaks and within-cell ordering; seeded SHA256 ordering. No quota is hand-entered. CEFR remains descriptive source evidence only."
    selection_stats = {
        "seed": SEED,
        "algorithm": algorithm,
        "parentFingerprint": PARENT_FP,
        "parentProjectionSha256": input_pins["parentProjectionSha256"],
        "sourcePopulation": stats(source_groups, sources),
        "parentAuthoredExclusions": {"groups": len(authored), "draftSenses": len(projection["records"])},
        "eligibleRemaining": stats(remaining, sources),
        "selected": stats(selected, sources),
        "unselected": stats(unselected, sources),
        "stratumCounts": {"|".join(map(str, key)): len(items) for key, items in sorted(cells.items())},
        "stratumQuotas": {"|".join(map(str, key)): quotas[key] for key in sorted(quotas)},
    }
    audit = {
        "auditStatus": "PASS_SOURCE_REFERENCE_AND_PROVENANCE_VALIDATED",
        "scope": "All 4,123 groups not authored in the published Cohort 500-02 CP05 projection",
        "posInterpretation": "Normalized source POS candidates are recorded as evidence only; no canonical classification or POS resolution is approved by this audit.",
        "riskInterpretation": "Priority dimensions and selected risk score are screening indicators, not editorial verdicts.",
        "sourceValidation": "VocabFlow source validators verified every source-record hash, source reference, normalized headword binding, full 9,677-record coverage, and one-time source accounting.",
        "selectedGroupCount": 500,
        "unselectedGroupCount": 3623,
        "eligibleGroupAudit": [
            {
                "candidateGroupKey": group["candidateGroupKey"],
                "normalizedHeadword": group["normalizedHeadword"],
                "sourceMembership": source_membership(group),
                "normalizedPosCandidates": group["normalizedPosCandidates"],
                "riskScore": risk_score(group),
                "riskFlags": group["reviewFlags"],
                "priorityDimensions": group["priorityDimensions"],
                "sourceEvidence": [
                    {
                        "corpus": ref["corpus"],
                        "recordIndex": ref["recordIndex"],
                        "sourceRecordId": ref["sourceRecordId"],
                        "recordEvidenceSha256": ref["recordEvidenceSha256"],
                        "rawHeadwordEvidencePointer": ref["rawHeadwordEvidencePointer"],
                        "rawPosEvidencePointer": ref["rawPosEvidencePointer"],
                        "rawContentPointer": ref["rawContentPointer"],
                        "rawHeadword": sources[ref["corpus"]][ref["recordIndex"]]["rawHeadword"],
                        "rawSourcePOS": sources[ref["corpus"]][ref["recordIndex"]]["sourcePosRaw"],
                    }
                    for ref in group["sourceEvidence"]
                ],
                "selection": "SELECTED" if group["candidateGroupKey"] in selected_keys else "NOT_SELECTED",
                "selectionOrder": next((item["cohortOrder"] for item in selected if item["candidateGroupKey"] == group["candidateGroupKey"]), None),
            }
            for group in remaining
        ],
    }
    cohort = {
        "phase": "2H.2L",
        "cohortId": "500-03",
        "seed": SEED,
        "algorithm": algorithm,
        "parentFingerprint": PARENT_FP,
        "previousCohortFingerprint": PREVIOUS_COHORT_FP,
        "inputPins": input_pins,
        "groups": selected,
        "coverage": {
            "sourceMembership": dict(Counter(source_membership(g) for g in selected)),
            "riskScoreBands": dict(Counter("LOW_0" if risk_score(g) == 0 else "MODERATE_1_2" if risk_score(g) <= 2 else "ELEVATED_3_PLUS" for g in selected)),
            "posFamilies": dict(Counter(pos_family(g) for g in selected)),
        },
        "sourceCefrEvidenceIsNotApprovedClassification": True,
    }
    cohort["fingerprint"] = digest(cohort)
    exclusion = {
        "groupCount": len(authored),
        "candidateGroupKeys": sorted(authored),
        "parentProjectionSha256": input_pins["parentProjectionSha256"],
        "parentFingerprint": PARENT_FP,
    }
    rationale = (
        "# Cohort 500-03 selection rationale\n\n"
        + f"Frozen source: 6,143 unique ledger groups; 2,020 authored in the accepted parent; 4,123 eligible; 500 selected; 3,623 remain unselected. Seed: {SEED}.\n\n"
        + algorithm + "\n\n"
        + "Selected composition: " + json.dumps(cohort["coverage"], ensure_ascii=False, sort_keys=True) + "\n\n"
        + "Population audit: " + json.dumps(selection_stats, ensure_ascii=False, sort_keys=True) + "\n\n"
        + "Every source record and reference was checked against its evidence hash and identity binding before selection. POS candidates and risk flags remain evidence; they do not confer canonical classification, approval, rights clearance or identity.\n"
        + "The five 100-group checkpoints each contain five deterministic 20-group microbatches. Only CP01 may begin after this freeze and audit passes.\n"
    )
    files = {
        "authored-exclusion.json": encode(exclusion),
        "frozen-cohort.json": encode(cohort),
        "preauthoring-audit.json": encode(audit),
        "remaining-group-inventory.json": encode({"groupCount": len(unselected), "groups": unselected}),
        "selection-rationale.md": rationale.encode("utf-8"),
        "selection-statistics.json": encode(selection_stats),
    }
    manifest = {
        "phase": "2H.2L",
        "cohortId": "500-03",
        "baseline": BASE,
        "parentFingerprint": PARENT_FP,
        "frozenCohortFingerprint": cohort["fingerprint"],
        "counts": {"sourceGroups": 6143, "authoredGroups": 2020, "eligibleGroups": 4123, "selectedGroups": 500, "unselectedGroups": 3623},
        "inputPins": input_pins,
        "artifactHashes": {name: sha(data) for name, data in sorted(files.items())},
    }
    manifest["fingerprint"] = digest(manifest)
    files["selection-manifest.json"] = encode(manifest)
    return files, manifest


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--freeze", action="store_true")
    group.add_argument("--check", action="store_true")
    group.add_argument("--preview", action="store_true")
    args = parser.parse_args()
    files, manifest = build()
    target = WS / "selection"
    if args.freeze:
        require(not target.exists(), "Selection directory already exists; refusing overwrite")
        staging = WS / ".selection-freeze-staging"
        require(not staging.exists(), "Freeze staging path already exists; refusing overwrite")
        staging.mkdir()
        for name, data in files.items():
            (staging / name).write_bytes(data)
        staging.rename(target)
    elif args.check:
        require({path.name for path in target.iterdir()} == set(files), "Selection artifact scope drift")
        for name, data in files.items():
            require((target / name).read_bytes() == data, "Deterministic selection replay drift: " + name)
    print(json.dumps({
        "cohortFingerprint": manifest["frozenCohortFingerprint"],
        "manifestFingerprint": manifest["fingerprint"],
        "counts": manifest["counts"],
        "coverage": json.loads(files["frozen-cohort.json"])["coverage"],
        "preauthoringAudit": "PASS",
        "zeroWrites": args.check or args.preview,
    }, ensure_ascii=False, sort_keys=True))


if __name__ == "__main__":
    main()
