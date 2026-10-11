"""Additive CP04 adapter; immutable CP01 contracts, descendant-safe parent replay."""
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
B=load("cp04_accepted_cp03", "checkpoint-03.py")
class Parent:
    ACCEPTED="b2fb8e5ebb7570c0f90a440f58d34089b974b1ae"
    FINGERPRINT="d409f7844c9ef2b1d91b464e20d669da27360e0f4d3de4ba443a0b2612d53436"
    content=staticmethod(B.P.content)
    @staticmethod
    @lru_cache(maxsize=1)
    def verify():
        import subprocess
        root=B.ROOT
        subprocess.run(["git","merge-base","--is-ancestor",Parent.ACCEPTED,"HEAD"],cwd=root,check=True)
        scope=B.WS.relative_to(root).as_posix()
        names=subprocess.check_output(["git","ls-tree","-r","--name-only",Parent.ACCEPTED,"--",scope],cwd=root).decode().splitlines()
        B.V.require(len(names)==199,"Accepted CP03 workspace scope drift")
        for name in names:
            blob=subprocess.check_output(["git","show",Parent.ACCEPTED+":"+name],cwd=root)
            B.V.require((root/name).read_bytes()==blob,"Accepted CP03 byte pin drift: "+name)
        cp_scope=B.CP.relative_to(root).as_posix()+"/"
        B.V.require({p.relative_to(root).as_posix() for p in B.CP.rglob("*") if p.is_file()}=={n for n in names if n.startswith(cp_scope)},"Unexpected historical CP03 file")
        files,manifest=B.build()
        B.V.require(manifest["fingerprint"]==Parent.FINGERPRINT,"CP03 fingerprint drift")
        target=B.CP/"assembled"
        B.V.require({p.name for p in target.iterdir()}==set(files),"CP03 assembly scope drift")
        for name,data in files.items():B.V.require((target/name).read_bytes()==data,"CP03 parent replay drift: "+name)
        parent=B.V.load(target/"cumulative-effective-draft-projection.json")
        B.V.require(len(parent["records"])==2547 and len({r["candidateGroupKey"] for r in parent["records"]})==1820,"CP03 parent inventory drift")
        B.P.content(parent["records"])
        report={"status":"PASS","acceptedCommit":Parent.ACCEPTED,"parentFingerprint":Parent.FINGERPRINT,"acceptedWorkspaceBytePins":len(names),"artifactPins":len(manifest["artifactHashes"]),"rawInputPins":len(manifest["rawInputSha256"]),"zeroWrites":True,"cp01":B.P.verify()[0]}
        return report,parent,B.selection()[2]
P=Parent
M=load("cp04_contracts", "checkpoint-01.py")
V=M.V;ROOT=M.ROOT;WS=M.WS;CP=WS/"checkpoints/checkpoint-04"
PARENT_FP=P.FINGERPRINT
M.CP=CP;M.PARENT_FP=PARENT_FP

@lru_cache(maxsize=1)
def selection():
    _,parent,frozen=P.verify()
    groups=[g for g in frozen["groups"] if g["checkpoint"]==4 and 301<=g["cohortOrder"]<=400]
    V.require(len(groups)==len({g["candidateGroupKey"] for g in groups})==100,"CP03 selection identity drift")
    V.require([g["cohortOrder"] for g in groups]==list(range(301,401)) and [g["authoringOrder"] for g in groups]==list(range(1,101)),"CP03 global/local order drift")
    V.require({g["candidateGroupKey"] for g in groups}.isdisjoint(r["candidateGroupKey"] for r in parent["records"]),"CP03 inherited group overlap")
    M.C.CP=CP;M.C.PARENT_FP=PARENT_FP;M.C.selection=selection
    return groups,parent,frozen

M.selection=selection
R=load("cp04_pos_resolution", "pos-resolution.py")
_original_plan=M.plan
_original_parse=M.parse

def effective_pos(group):
    entries=R.approved_entries(CP/"pos-resolution/entries.json")
    evidence=R.source_evidence(group,V.inputs()[3])
    return R.resolveEffectivePOS(group,evidence,entries.get(group["candidateGroupKey"]))

def plan(number):
    value=_original_plan(number)
    groups={g["candidateGroupKey"]:g for g in selection()[0]}
    for entry in value["entries"]:
        entry["proposedPOS"]=effective_pos(groups[entry["candidateGroupKey"]])
    value["fingerprint"]=M.digest({k:v for k,v in value.items() if k!="fingerprint"})
    return value

def parse(data,groups):
    transient=copy.deepcopy(groups)
    originals={g["candidateGroupKey"]:g for g in groups}
    for group in transient:
        group["normalizedPosCandidates"]=effective_pos(originals[group["candidateGroupKey"]])
    rows=_original_parse(data,transient)
    for row in rows:
        row["sourceEvidence"]=copy.deepcopy(originals[row["candidateGroupKey"]]["sourceEvidence"])
    return rows

M.plan=plan;M.parse=parse;micro=M.micro

def apply_changes(rows,changes):
    result=copy.deepcopy(rows);bykey={r["proposalKey"]:r for r in result}
    for change in changes:
        key=change["proposalKey"];V.require(key in bykey,"Unknown revision identity")
        row=bykey[key];V.require(row["effectiveContentHash"]==change["beforeContentHash"],"Revision parent hash mismatch")
        field=change["field"]
        # CP03 allows a forward lexical-label correction as well as CP01 fields.
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
        declared=receipt.get("counts")
        if declared is not None:
            V.require(all(declared.get(state)==counts[state] for state in ["PASS","REVIEW","FAIL"]),"Reviewer nested receipt count drift")
        else:
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
        V.require(path.exists(),"Missing CP03 microbatch seal")
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
    V.require(len(newgroups)==100 and newgroups=={g["candidateGroupKey"] for g in groups},"CP03 authored group coverage")
    counts={"sourceGroups":6143,"previousAuthoredGroups":1820,"previousEffectiveSenses":2547,"selectedCohortGroups":500,"microBatchesCompleted":len(seals),"newAuthoredGroups":len(newgroups),"newSenses":len(rows),"multiSenseGroups":sum(n>1 for n in Counter(r["candidateGroupKey"] for r in rows).values()),"plannedSourceSupportedMeaningCandidates":sum(len(p["sourceSupportedMeaningCandidates"]) for p in plans),"sourceMeaningCandidatesExamined":sum(len(p["sourceSupportedMeaningCandidates"]) for p in plans)+len(boundary["missingSenseCandidateProposalKeys"]),"missingSenseCandidates":len(boundary["missingSenseCandidateProposalKeys"]),"unresolvedBoundaryItems":len(boundary["unresolvedBoundaryProposalKeys"]),"cumulativeAuthoredGroups":1820+len(newgroups),"cumulativeDraftSenses":2547+len(rows),"remainingUnauthoredGroups":4323-len(newgroups),"selfReview":dict(Counter(q["assessment"] for q in qa)),"independentReview":dict(Counter(q["assessment"] for q in ind["records"]))}
    projection={**{k:v for k,v in parent.items() if k!="records"},"parentFingerprint":PARENT_FP,"inheritedRecordCount":2547,"newRecordCount":len(rows),"records":parent["records"]+rows}
    V.require(projection["records"][:2547]==parent["records"],"Inherited parent inequality")
    artifacts={"cumulative-effective-draft-projection.json":projection,"new-sense-proposals.json":{"records":rows},"revision-evidence.json":{"records":changes},"self-review.json":{"records":qa},"independent-review.json":ind,"source-coverage-ledger.json":{"entries":plans,**boundary},"validation-summary.json":{"counts":counts,"sourceSimilarityFindings":[f for z in seals for f in z["sourceSimilarityFindings"]],"crossSourceCopyingScreen":V.cross_source_copying(rows,V.inputs()[3]),"copyingScreenProjectionScope":"EFFECTIVE_DRAFT_AFTER_VERIFIED_ADDITIVE_CORRECTIONS","originalCopyingDiagnostic":V.load(CP/"revisions/original-copying-diagnostic.json"),"originalManuscriptsPreserved":True,"independentReviewBeforeSealRequired":True,"rights":M.RIGHTS,"canonicalIdsAllocated":0,"ownerApprovals":0,"parentPostpublicationVerification":P.verify()[0],"inheritedReviewLimitations":{"previousCohortReviewFindings":34,"previousCohortDeferredIdentities":16,"cp01NonblockingReview":2,"cp02NonblockingReview":5,"cp02DeferredMissingSenseCandidates":1,"cp03NonblockingReview":26,"cp03DeferredMissingSenseCandidates":3},"databaseAccess":"NONE","databaseWrites":"NONE","publicationReady":len(seals)==5 and ind["publicationReady"]}}
    files={n:M.encode(x) for n,x in artifacts.items()}
    files["report.md"]=("# Phase 2H.2L — Cohort 500-02 Checkpoint 04\n\n"+json.dumps(counts,ensure_ascii=False,sort_keys=True,indent=2)+"\n\nAll 2,547 inherited records are preserved exactly, including historical correction/review lineage and unresolved findings. New records are AI-authored offline DRAFT, without human approval, canonical IDs or rights clearance. Source-supported planning does not claim exhaustive dictionary coverage. Blind receipts and forward correction/recheck history are immutable. No database or Production activity. Continue to CP05 only after publication verification under the owner's 500-group authorization.\n").encode()
    inputs=[p for d in ["planning","authored","self-review","handoff","independent-review","revisions","pos-resolution"] for p in (CP/d).glob("*") if p.is_file()]+list(CP.glob("micro-*-seal.json"))
    tooling=[HERE/"checkpoint-04.py",HERE/"checkpoint-04-test.py",HERE/"verify-published-checkpoint-01.py",HERE/"checkpoint-03.py",HERE/"pos-resolution.py",HERE/"pos-resolution-test.py"]
    manifest={"phase":"2H.2L","cohortId":"500-02","checkpoint":4,"parentFingerprint":PARENT_FP,"parentCommit":P.ACCEPTED,"cohortFingerprint":frozen["fingerprint"],"counts":counts,"rawInputSha256":{p.relative_to(CP).as_posix():M.sha(p.read_bytes()) for p in sorted(inputs)},"toolingSha256":{p.relative_to(WS).as_posix():M.sha(p.read_bytes()) for p in tooling if p.exists()},"selectionArtifactSha256":{n:M.sha((WS/"selection"/n).read_bytes()) for n in ["frozen-cohort.json","selection-manifest.json"]},"microBatchFingerprints":[z["fingerprint"] for z in seals],"artifactHashes":{n:M.sha(b) for n,b in sorted(files.items())},"contentStatus":"DRAFT","rights":M.RIGHTS,"publicationReady":artifacts["validation-summary.json"]["publicationReady"]}
    manifest["fingerprint"]=M.digest(manifest);files["manifest.json"]=M.encode(manifest)
    return files,manifest

def draft_handoff(number):
    rows,qa,seal=micro(number)
    return {"microBatch":number,"records":rows,"sourceEvidence":[{"group":g["normalizedHeadword"],"evidence":M.C.evidence(g)} for g in selection()[0][(number-1)*20:number*20]],"manuscriptSha256":seal["manuscriptSha256"],"reviewInstruction":"Blind independent review before viewing Author A judgments; exact content hashes required"}

def reviewed_effective():
    original=[r for n in range(1,6) for r in micro(n)[0]]
    for n in range(1,6):M.validate_handoff(n,micro(n)[0],micro(n)[2])
    changes=[c for path in sorted((CP/"revisions").glob("corrections*.json")) for c in V.load(path)["records"]]
    effective=apply_changes(original,changes)
    review_integrity(original,effective,changes)
    review=M.C.independent(effective,original)
    V.require(review["publicationReady"],"Cannot seal before complete current-hash independent review/recheck")
    V.cross_source_copying(effective,V.inputs()[3])
    return effective

def main():
    p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True)
    g.add_argument("--handoff",type=int,choices=range(1,6));g.add_argument("--plan",type=int,choices=range(1,6));g.add_argument("--seal",type=int,choices=range(1,6));g.add_argument("--assemble",action="store_true");g.add_argument("--check",action="store_true");a=p.parse_args()
    selection()
    if a.plan:
        n=a.plan;V.require(not (CP/f"authored/micro-{n:02d}.psv").exists(),"Planning must precede manuscript")
        pp=CP/f"planning/micro-{n:02d}.json";M.write_new(pp,M.encode(plan(n)));M.write_new(CP/f"planning/micro-{n:02d}-ready.json",M.encode({"planningSha256":M.sha(pp.read_bytes()),"manuscriptAbsentWhenPlanningPersisted":True}));print("PLANNED",n);return
    if a.handoff:
        M.write_new(CP/f"handoff/micro-{a.handoff:02d}.json",M.encode(draft_handoff(a.handoff)));print("UNSEALED_HANDOFF",a.handoff);return
    if a.seal:
        n=a.seal;V.require(n==1 or (CP/f"micro-{n-1:02d}-seal.json").exists(),"Previous microbatch missing")
        reviewed_effective()
        r,q,z=micro(n);M.write_new(CP/f"micro-{n:02d}-seal.json",M.encode(z));print("SEALED",n,len(r));return
    files,manifest=build();target=CP/"assembled"
    if a.check:V.require({p.name for p in target.iterdir()}==set(files),"Assembly scope drift")
    for name,data in files.items():
        if a.check:V.require((target/name).read_bytes()==data,"Assembly replay drift: "+name)
        else:M.write_new(target/name,data)
    print(json.dumps({"fingerprint":manifest["fingerprint"],"counts":manifest["counts"],"publicationReady":manifest["publicationReady"],"zeroWrites":a.check},ensure_ascii=False,sort_keys=True))

if __name__=="__main__":main()
