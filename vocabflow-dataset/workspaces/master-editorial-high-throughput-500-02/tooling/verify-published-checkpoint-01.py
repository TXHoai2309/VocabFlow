"""Read-only accepted CP01 verification at publication or any valid descendant.

The historical freeze builder's exact HEAD/remote guard is publication-time
policy, not content integrity. This additive verifier replaces only selection()
with accepted-byte, ancestry, source-pin and projection checks, then replays
the original content validators. No historical file or Git state is changed.
"""
import importlib.util
import json
import subprocess
from functools import lru_cache
from pathlib import Path

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("accepted_cp01_replay", HERE / "checkpoint-01.py")
H = importlib.util.module_from_spec(spec)
spec.loader.exec_module(H)
ACCEPTED = "1bf6748b91d1c4d66127bf12b9f700cb668abe03"
FINGERPRINT = "4b968558eb6f2506e1c83c5ca4ebc783e5f01265394f01d6f8ee15abe4fbb773"
COHORT = "9710a47fda875f70412c7440b2969c031dc6eb3c076140a42007aed4f83cf59c"

def git(*args):
    return subprocess.check_output(["git", *args], cwd=H.ROOT)

def manifest(directory, expected, raw_root):
    value = H.V.load(directory / "manifest.json")
    H.req(value["fingerprint"] == expected == H.digest({k:v for k,v in value.items() if k != "fingerprint"}), "Manifest fingerprint drift")
    for name, pin in value["artifactHashes"].items():
        H.req(H.sha((directory / name).read_bytes()) == pin, "Artifact drift: " + name)
    for name, pin in value["rawInputSha256"].items():
        H.req(H.sha((raw_root / name).read_bytes()) == pin, "Raw input drift: " + name)
    return value

def content(records):
    H.req(len(records) == len({r["proposalKey"] for r in records}), "Duplicate proposal identity")
    examples = []
    for r in records:
        expected = H.digest({"proposalKey":r["proposalKey"], "candidateGroupKey":r["candidateGroupKey"], "headword":r["headword"], "partOfSpeechProposal":r["partOfSpeech"], "content":r["content"]})
        H.req(expected == r["effectiveContentHash"], "Effective content hash drift: " + r["proposalKey"])
        if "fieldHashes" in r:
            H.req(r["fieldHashes"] == {k:H.digest(v) for k,v in r["content"].items()}, "Field hash drift")
        # Older immutable records predate explicit example keys/field hashes.
        # Their entire content is still checked above and against the parent.
        examples.extend(e["exampleKey"] for e in r["content"]["examples"] if "exampleKey" in e)
    H.req(len(examples) == len(set(examples)), "Duplicate example identity")

@lru_cache(maxsize=1)
def accepted_selection():
    H.req(subprocess.run(["git","merge-base","--is-ancestor",ACCEPTED,"HEAD"], cwd=H.ROOT, capture_output=True).returncode == 0, "Accepted publication not in current ancestry")
    H.req(git("rev-parse", ACCEPTED + "^").decode().strip() == H.BASE, "Accepted parent commit drift")
    prefix = H.WS.relative_to(H.ROOT).as_posix()
    accepted_paths = git("ls-tree", "-r", "--name-only", ACCEPTED, "--", prefix).decode().splitlines()
    H.req(len(accepted_paths) == 79, "Accepted workspace scope drift")
    for name in accepted_paths:
        H.req((H.ROOT/name).read_bytes() == git("show", ACCEPTED+":"+name), "Accepted Git/working bytes drift: " + name)
    cp_prefix = H.CP.relative_to(H.ROOT).as_posix() + "/"
    H.req({p.relative_to(H.ROOT).as_posix() for p in H.CP.rglob("*") if p.is_file()} == {p for p in accepted_paths if p.startswith(cp_prefix)}, "Unexpected historical CP01 file")
    sm = H.V.load(H.WS/"selection/selection-manifest.json")
    H.req(sm["fingerprint"] == H.digest({k:v for k,v in sm.items() if k != "fingerprint"}), "Selection manifest digest drift")
    H.req({p.name for p in (H.WS/"selection").iterdir()} == set(sm["artifactHashes"]) | {"selection-manifest.json"}, "Selection scope drift")
    for name, pin in sm["artifactHashes"].items():
        H.req(H.sha((H.WS/"selection"/name).read_bytes()) == pin, "Selection byte pin drift")
    pins=sm["inputPins"]
    H.req(H.sha((H.ROOT/"vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation/full-master-expansion-candidate-ledger.json").read_bytes())==pins["sourceGroupLedgerSha256"], "Frozen source ledger byte drift")
    for name,pin in pins["sourceInventoryHashes"].items():
        H.req(H.sha((H.ROOT/"vocabflow-dataset/workspaces/full-source-inventory-dedupe"/name).read_bytes())==pin, "Frozen inventory byte drift")
    H.req(H.sha((H.OLD/"checkpoints/checkpoint-05/assembled/cumulative-effective-draft-projection.json").read_bytes())==pins["parentProjectionSha256"], "Frozen CP05 projection byte drift")
    frozen = H.V.load(H.WS/"selection/frozen-cohort.json")
    H.req(frozen["fingerprint"] == COHORT == H.digest({k:v for k,v in frozen.items() if k != "fingerprint"}), "Frozen cohort fingerprint drift")
    allgroups = frozen["groups"]
    H.req(len(allgroups) == len({g["candidateGroupKey"] for g in allgroups}) == 500, "Frozen group identities drift")
    H.req([g["cohortOrder"] for g in allgroups] == list(range(1,501)), "Cohort order drift")
    H.req(all(g["checkpoint"] == (i-1)//100+1 and g["authoringOrder"] == (i-1)%100+1 and g["microBatchWithinCheckpoint"] == ((i-1)%100)//20+1 for i,g in enumerate(allgroups,1)), "Checkpoint partition drift")
    sourcegroups, _, _, sources = H.V.inputs()
    bykey = {g["candidateGroupKey"]:g for g in sourcegroups}
    for g in allgroups:
        source = bykey[g["candidateGroupKey"]]
        H.req(all(g[k] == v for k,v in source.items()), "Frozen source group drift")
        for ref in g["sourceEvidence"]:
            record = sources[ref["corpus"]][ref["recordIndex"]]
            H.req(record["recordEvidenceSha256"] == ref["recordEvidenceSha256"], "Source evidence pin drift")
    olddir = H.OLD/"checkpoints/checkpoint-05/assembled"
    manifest(olddir, H.PARENT_FP, olddir.parent)
    parent = H.V.load(olddir/"cumulative-effective-draft-projection.json")
    content(parent["records"])
    H.req(len(parent["records"]) == 2081 and len({r["candidateGroupKey"] for r in parent["records"]}) == 1520, "CP05 parent counts drift")
    groups = allgroups[:100]
    H.C.CP=H.CP; H.C.PARENT_FP=H.PARENT_FP; H.C.selection=accepted_selection
    return groups, parent, frozen

@lru_cache(maxsize=1)
def verify():
    H.selection = accepted_selection
    groups, oldparent, frozen = accepted_selection()
    accepted = manifest(H.CP/"assembled", FINGERPRINT, H.CP)
    H.req(len(accepted["artifactHashes"]) == 8 and len(accepted["rawInputSha256"]) == 60, "CP01 pin accounting drift")
    files, replay = H.build()
    H.req(replay == accepted, "Accepted CP01 manifest replay drift")
    for name, data in files.items():
        H.req((H.CP/"assembled"/name).read_bytes() == data, "CP01 content replay drift: "+name)
    parent = H.V.load(H.CP/"assembled/cumulative-effective-draft-projection.json")
    content(parent["records"])
    H.req(parent["records"][:2081] == oldparent["records"], "CP05 inheritance drift")
    H.req(len(parent["records"]) == 2226 and len({r["candidateGroupKey"] for r in parent["records"]}) == 1620, "CP01 cumulative accounting drift")
    new = parent["records"][2081:]
    H.req(len(new) == 145 and {r["candidateGroupKey"] for r in new} == {g["candidateGroupKey"] for g in groups}, "CP01 new group coverage drift")
    report = {"status":"PASS", "historicalBaselineGuard":"OBSOLETE_FOR_DESCENDANT_REPLAY_NOT_EXECUTED", "acceptedCommit":ACCEPTED, "parentFingerprint":FINGERPRINT, "cohortFingerprint":COHORT, "acceptedWorkspaceBytePins":79, "artifactPins":8, "rawInputPins":60, "inheritedSenses":2081, "newSenses":145, "cumulativeSenses":2226, "contentReplay":"PASS", "reviewBindings":"PASS", "ancestry":"PASS", "zeroWrites":True}
    return report, parent, frozen

if __name__ == "__main__":
    print(json.dumps(verify()[0], sort_keys=True))
