"""Additive CP02 adapter; immutable CP01 contracts, descendant-safe parent replay."""
import argparse
import copy
import importlib.util
import json
from collections import Counter
from functools import lru_cache
from pathlib import Path

HERE=Path(__file__).resolve().parent
def load(name, file):
    spec=importlib.util.spec_from_file_location(name,HERE/file)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
P=load("published_parent", "verify-published-checkpoint-01.py")
M=load("cp02_contracts", "checkpoint-01.py")
V=M.V;ROOT=M.ROOT;WS=M.WS;CP=WS/"checkpoints/checkpoint-02"
PARENT_FP=P.FINGERPRINT
M.CP=CP;M.PARENT_FP=PARENT_FP

@lru_cache(maxsize=1)
def selection():
    _,parent,frozen=P.verify()
    groups=[g for g in frozen["groups"] if g["checkpoint"]==2 and 101<=g["cohortOrder"]<=200]
    V.require(len(groups)==len({g["candidateGroupKey"] for g in groups})==100,"CP02 selection identity drift")
    V.require([g["cohortOrder"] for g in groups]==list(range(101,201)) and [g["authoringOrder"] for g in groups]==list(range(1,101)),"CP02 global/local order drift")
    V.require({g["candidateGroupKey"] for g in groups}.isdisjoint(r["candidateGroupKey"] for r in parent["records"]),"CP02 inherited group overlap")
    M.C.CP=CP;M.C.PARENT_FP=PARENT_FP;M.C.selection=selection
    return groups,parent,frozen

M.selection=selection
parse=M.parse;plan=M.plan;micro=M.micro

def apply_changes(rows,changes):
    result=copy.deepcopy(rows);bykey={r["proposalKey"]:r for r in result}
    for change in changes:
        key=change["proposalKey"];V.require(key in bykey,"Unknown revision identity")
        row=bykey[key];V.require(row["effectiveContentHash"]==change["beforeContentHash"],"Revision parent hash mismatch")
        field=change["field"]
        # CP02 allows a forward lexical-label correction as well as CP01 fields.
        V.require(field in {"senseLabelEn","definitionEn","meaningVi","grammarNotesEn","exampleEn","exampleVi"},"Unsupported revision field")
        target=row["content"]["examples"][0] if field.startswith("example") else row["content"]
        name={"exampleEn":"en","exampleVi":"vi"}.get(field,field)
        V.require(target[name]==change["before"],"Revision BEFORE mismatch")
        V.require(change["beforeFieldHash"]==M.digest(change["before"]) and change["afterFieldHash"]==M.digest(change["after"]),"Revision field hash mismatch")
        target[name]=change["after"]
        row["fieldHashes"]={k:M.digest(v) for k,v in row["content"].items()}
        row["effectiveContentHash"]=M.digest({"proposalKey":key,"candidateGroupKey":row["candidateGroupKey"],"headword":row["headword"],"partOfSpeechProposal":row["partOfSpeech"],"content":row["content"]})
        V.require(row["effectiveContentHash"]==change["afterContentHash"],"Revision AFTER hash mismatch")
    return result

def review_integrity(original, effective, changes):
    current={r["proposalKey"]:r for r in effective}
    first={}
    for n in range(1,6):
        receipt=V.load(CP/f"independent-review/micro-{n:02d}.json")
        expected={r["proposalKey"] for r in original if r["candidateGroupKey"] in {g["candidateGroupKey"] for g in selection()[0][(n-1)*20:n*20]}}
        V.require({q["proposalKey"] for q in receipt["records"]}==expected,"Reviewer micro membership drift")
        counts=Counter(q["assessment"] for q in receipt["records"])
        V.require(all(receipt[k]==counts[state] for k,state in [("passCount","PASS"),("reviewCount","REVIEW"),("failCount","FAIL")]),"Reviewer receipt count drift")
        for q in receipt["records"]:
            V.require(isinstance(q["affectedFields"],list) and isinstance(q["missingSenseCandidates"],list) and isinstance(q["unresolvedBoundaryItems"],list),"Reviewer dimensions missing")
            first[q["proposalKey"]]=q
    changed={c["proposalKey"] for c in changes}
    for path in sorted((CP/"revisions").glob("corrections*.json")):
        ledger=V.load(path)
        V.require(ledger["parentFingerprint"]==PARENT_FP,"Revision checkpoint parent drift")
        for c in ledger["records"]:
            source=CP/c["reviewFindingSource"]
            V.require(ledger["reviewFindingSha256"]==M.sha(source.read_bytes()),"Revision finding byte pin drift")
            finding=first[c["proposalKey"]]
            # Reviewers address the examples content field; revision ledgers
            # address the specific EN/VI leaf. Match the structural container.
            affected=set(finding["affectedFields"])
            matches=c["field"] in affected or (c["field"] in {"exampleEn","exampleVi"} and "examples" in affected)
            V.require(matches and finding["blocksPublication"],"Revision lacks substantive matching reviewer finding")
            V.require(c["beforeFieldHash"]==M.digest(c["before"]) and c["afterFieldHash"]==M.digest(c["after"]),"Revision field hash drift")
            V.require(c["before"]!=c["after"] and len(c["reasonVi"])>=70,"Revision rationale/actual change missing")
    rechecked=set();dispositions=set()
    for path in sorted((CP/"handoff").glob("recheck*.json")):
        handoff=V.load(path);n=handoff["microBatch"]
        V.require(handoff["firstPassReviewSha256"]==M.sha((CP/f"independent-review/micro-{n:02d}.json").read_bytes()),"Recheck first-pass byte pin drift")
        V.require(handoff["sourceEvidence"]==V.load(CP/f"handoff/micro-{n:02d}.json")["sourceEvidence"],"Recheck evidence drift")
        V.require(handoff["corrections"]==[c for c in changes if c["reviewFindingSource"]==f"independent-review/micro-{n:02d}.json"],"Recheck correction binding drift")
        keys={r["proposalKey"] for r in handoff["records"]}
        V.require(keys.isdisjoint(rechecked),"Duplicate recheck handoff")
        unchanged=keys-changed
        if unchanged:
            V.require(handoff.get("reviewDispositionOnly") is True and len(handoff.get("reasonVi",""))>=70,"Unrelated recheck handoff")
            V.require(all(first[k]["assessment"]=="REVIEW" and not first[k]["blocksPublication"] and first[k]["effectiveContentHash"]==current[k]["effectiveContentHash"] for k in unchanged),"Invalid unchanged review disposition")
            dispositions.update(unchanged)
        V.require(all(r==current[r["proposalKey"]] for r in handoff["records"]),"Recheck effective record drift")
        review=V.load(CP/f"independent-review/{path.name}")
        V.require({q["proposalKey"] for q in review["records"]}==keys,"Recheck receipt scope drift")
        rechecked.update(keys)
    V.require(rechecked==changed|dispositions,"Corrected content lacks independent recheck handoff")

def build():
    groups,parent,frozen=selection();rows=[];qa=[];seals=[];plans=[]
    for n in range(1,6):
        path=CP/f"micro-{n:02d}-seal.json"
        V.require(path.exists(),"Missing CP02 microbatch seal")
        r,q,z=micro(n);V.require(path.read_bytes()==M.encode(z),"Seal drift")
        M.validate_handoff(n,r,z);rows+=r;qa+=q;seals.append(z);plans+=plan(n)["entries"]
    V.require(len(rows)==len({r["proposalKey"] for r in rows}),"Duplicate new proposals")
    V.require({r["proposalKey"] for r in rows}.isdisjoint(r["proposalKey"] for r in parent["records"]),"Inherited proposal collision")
    original=copy.deepcopy(rows)
    changes=[c for path in sorted((CP/"revisions").glob("corrections*.json")) for c in V.load(path)["records"]]
    rows=apply_changes(rows,changes);ind=M.C.independent(rows,original)
    review_integrity(original,rows,changes)
    for q in qa:
        r=next(r for r in rows if r["proposalKey"]==q["proposalKey"])
        if q["reviewedContentHash"]!=r["effectiveContentHash"]:
            q["originalReviewedContentHash"]=q["reviewedContentHash"];q["reviewedContentHash"]=r["effectiveContentHash"];q["reviewedRecordSha256"]=M.digest(r)
            q["reviewExplanationVi"]+=" Revision BEFORE/AFTER được rà soát; recheck độc lập hash mới được lưu riêng."
    P.content(rows)
    V.require(all("exampleKey" in e for r in rows for e in r["content"]["examples"]),"New example key missing")
    boundary=M.boundaries(plans,ind);newgroups={r["candidateGroupKey"] for r in rows}
    V.require(len(newgroups)==100 and newgroups=={g["candidateGroupKey"] for g in groups},"CP02 authored group coverage")
    counts={"sourceGroups":6143,"previousAuthoredGroups":1620,"previousEffectiveSenses":2226,"selectedCohortGroups":500,"microBatchesCompleted":len(seals),"newAuthoredGroups":len(newgroups),"newSenses":len(rows),"multiSenseGroups":sum(n>1 for n in Counter(r["candidateGroupKey"] for r in rows).values()),"plannedSourceSupportedMeaningCandidates":sum(len(p["sourceSupportedMeaningCandidates"]) for p in plans),"sourceMeaningCandidatesExamined":sum(len(p["sourceSupportedMeaningCandidates"]) for p in plans)+len(boundary["missingSenseCandidateProposalKeys"]),"missingSenseCandidates":len(boundary["missingSenseCandidateProposalKeys"]),"unresolvedBoundaryItems":len(boundary["unresolvedBoundaryProposalKeys"]),"cumulativeAuthoredGroups":1620+len(newgroups),"cumulativeDraftSenses":2226+len(rows),"remainingUnauthoredGroups":4523-len(newgroups),"selfReview":dict(Counter(q["assessment"] for q in qa)),"independentReview":dict(Counter(q["assessment"] for q in ind["records"]))}
    projection={**{k:v for k,v in parent.items() if k!="records"},"parentFingerprint":PARENT_FP,"inheritedRecordCount":2226,"newRecordCount":len(rows),"records":parent["records"]+rows}
    V.require(projection["records"][:2226]==parent["records"],"Inherited parent inequality")
    artifacts={"cumulative-effective-draft-projection.json":projection,"new-sense-proposals.json":{"records":rows},"revision-evidence.json":{"records":changes},"self-review.json":{"records":qa},"independent-review.json":ind,"source-coverage-ledger.json":{"entries":plans,**boundary},"validation-summary.json":{"counts":counts,"sourceSimilarityFindings":[f for z in seals for f in z["sourceSimilarityFindings"]],"crossSourceCopyingScreen":V.cross_source_copying(rows,V.inputs()[3]),"rights":M.RIGHTS,"canonicalIdsAllocated":0,"ownerApprovals":0,"parentPostpublicationVerification":P.verify()[0],"inheritedReviewLimitations":{"previousCohortReviewFindings":34,"previousCohortDeferredIdentities":16,"cp01NonblockingReview":2},"databaseAccess":"NONE","databaseWrites":"NONE","publicationReady":len(seals)==5 and ind["publicationReady"]}}
    files={n:M.encode(x) for n,x in artifacts.items()}
    files["report.md"]=("# Phase 2H.2L — Cohort 500-02 Checkpoint 02\n\n"+json.dumps(counts,ensure_ascii=False,sort_keys=True,indent=2)+"\n\nAll 2,226 inherited records are preserved exactly, including historical correction/review lineage and unresolved findings. New records are AI-authored offline DRAFT, without human approval, canonical IDs or rights clearance. Source-supported planning does not claim exhaustive dictionary coverage. Blind receipts and forward correction/recheck history are immutable. No database or Production activity. Stop after CP02; CP03 not started.\n").encode()
    inputs=[p for d in ["planning","authored","self-review","handoff","independent-review","revisions"] for p in (CP/d).glob("*") if p.is_file()]+list(CP.glob("micro-*-seal.json"))
    tooling=[HERE/"checkpoint-02.py",HERE/"checkpoint-02-test.py",HERE/"verify-published-checkpoint-01.py"]
    manifest={"phase":"2H.2L","cohortId":"500-02","checkpoint":2,"parentFingerprint":PARENT_FP,"parentCommit":P.ACCEPTED,"cohortFingerprint":frozen["fingerprint"],"counts":counts,"rawInputSha256":{p.relative_to(CP).as_posix():M.sha(p.read_bytes()) for p in sorted(inputs)},"toolingSha256":{p.relative_to(WS).as_posix():M.sha(p.read_bytes()) for p in tooling if p.exists()},"selectionArtifactSha256":{n:M.sha((WS/"selection"/n).read_bytes()) for n in ["frozen-cohort.json","selection-manifest.json"]},"microBatchFingerprints":[z["fingerprint"] for z in seals],"artifactHashes":{n:M.sha(b) for n,b in sorted(files.items())},"contentStatus":"DRAFT","rights":M.RIGHTS,"publicationReady":artifacts["validation-summary.json"]["publicationReady"]}
    manifest["fingerprint"]=M.digest(manifest);files["manifest.json"]=M.encode(manifest)
    return files,manifest

def main():
    p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True)
    g.add_argument("--plan",type=int,choices=range(1,6));g.add_argument("--seal",type=int,choices=range(1,6));g.add_argument("--assemble",action="store_true");g.add_argument("--check",action="store_true");a=p.parse_args()
    selection()
    if a.plan:
        n=a.plan;V.require(not (CP/f"authored/micro-{n:02d}.psv").exists(),"Planning must precede manuscript")
        pp=CP/f"planning/micro-{n:02d}.json";M.write_new(pp,M.encode(plan(n)));M.write_new(CP/f"planning/micro-{n:02d}-ready.json",M.encode({"planningSha256":M.sha(pp.read_bytes()),"manuscriptAbsentWhenPlanningPersisted":True}));print("PLANNED",n);return
    if a.seal:
        n=a.seal;V.require(n==1 or (CP/f"micro-{n-1:02d}-seal.json").exists(),"Previous microbatch missing")
        r,q,z=micro(n);V.cross_source_copying(r,V.inputs()[3]);M.write_new(CP/f"micro-{n:02d}-seal.json",M.encode(z));M.write_new(CP/f"handoff/micro-{n:02d}.json",M.encode({"microBatch":n,"records":r,"sourceEvidence":[{"group":g["normalizedHeadword"],"evidence":M.C.evidence(g)} for g in selection()[0][(n-1)*20:n*20]],"manuscriptSha256":z["manuscriptSha256"],"reviewInstruction":"Blind independent review before viewing Author A judgments; exact content hashes required"}));print("SEALED",n,len(r));return
    files,manifest=build();target=CP/"assembled"
    if a.check:V.require({p.name for p in target.iterdir()}==set(files),"Assembly scope drift")
    for name,data in files.items():
        if a.check:V.require((target/name).read_bytes()==data,"Assembly replay drift: "+name)
        else:M.write_new(target/name,data)
    print(json.dumps({"fingerprint":manifest["fingerprint"],"counts":manifest["counts"],"publicationReady":manifest["publicationReady"],"zeroWrites":a.check},ensure_ascii=False,sort_keys=True))

if __name__=="__main__":main()
