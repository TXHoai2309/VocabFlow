"""Phase 2H.2L Checkpoint 01; reuses accepted CP02 validators without modifying them."""
import argparse,copy,hashlib,importlib.util,json,re,subprocess
from collections import Counter
from functools import lru_cache
from pathlib import Path
ROOT=next(p for p in Path(__file__).resolve().parents if (p/"AGENTS.md").is_file())
OLD=ROOT/"vocabflow-dataset/workspaces/master-editorial-high-throughput-500";WS=ROOT/"vocabflow-dataset/workspaces/master-editorial-high-throughput-500-02";CP=WS/"checkpoints/checkpoint-01"
BASE="f397c18db58930fcd8bd29a1711249f2f2433276";PARENT_FP="6d66f021b215ddddf3d2f5eb325835fd536f86bf83a392b208dc0ef40edce1fc";RIGHTS="UNKNOWN_REVIEW_REQUIRED";PREFIX="EDITORIAL_2H2L:"
sp=importlib.util.spec_from_file_location("checkpoint02",ROOT/"scripts/phase-2h2k-checkpoint-02.py");C=importlib.util.module_from_spec(sp);sp.loader.exec_module(C);V=C.V
sf=importlib.util.spec_from_file_location("freeze_cohort",WS/"tooling/freeze-cohort.py");F=importlib.util.module_from_spec(sf);sf.loader.exec_module(F)

def sha(b):return hashlib.sha256(b).hexdigest()
def digest(x):return V.digest(x)
def encode(x):return V.encode(x)
def write_new(p,b):return V.write_new(p,b)
def req(x,m):return V.require(x,m)

@lru_cache(maxsize=1)
def selection():
    expected,_=F.build();root=WS/"selection"
    req({p.name for p in root.iterdir()}==set(expected),"Frozen selection scope drift")
    for n,b in expected.items():req((root/n).read_bytes()==b,"Frozen selection/hash drift: "+n)
    frozen=V.load(root/"frozen-cohort.json");req(frozen["fingerprint"]=="9710a47fda875f70412c7440b2969c031dc6eb3c076140a42007aed4f83cf59c","Unexpected 2H.2L cohort freeze")
    groups=[g for g in frozen["groups"] if g["checkpoint"]==1]
    req(len(groups)==len({g["candidateGroupKey"] for g in groups})==100 and [g["authoringOrder"] for g in groups]==list(range(1,101)),"CP01 selection drift")
    pm=V.load(OLD/"checkpoints/checkpoint-05/assembled/manifest.json");req(pm["fingerprint"]==PARENT_FP==digest({k:v for k,v in pm.items() if k!="fingerprint"}),"CP05 parent manifest drift")
    parentdir=OLD/"checkpoints/checkpoint-05/assembled"
    for n,h in pm["artifactHashes"].items():req(sha((parentdir/n).read_bytes())==h,"CP05 parent artifact drift: "+n)
    for n,h in pm["rawInputSha256"].items():req(sha((OLD/"checkpoints/checkpoint-05"/n).read_bytes())==h,"CP05 parent input drift: "+n)
    parent=V.load(parentdir/"cumulative-effective-draft-projection.json");records=parent["records"]
    authored={r["candidateGroupKey"] for r in records};req(len(records)==len({r["proposalKey"] for r in records})==2081 and len(authored)==1520,"CP05 parent accounting drift")
    req(all(r.get("effectiveContentHash")==digest({"proposalKey":r["proposalKey"],"candidateGroupKey":r["candidateGroupKey"],"headword":r["headword"],"partOfSpeechProposal":r["partOfSpeech"],"content":r["content"]}) for r in records),"CP05 effective content hash drift")
    req(not authored.intersection(g["candidateGroupKey"] for g in frozen["groups"]),"New cohort overlaps prior authored groups")
    V.inputs()
    C.CP=CP;C.PARENT_FP=PARENT_FP;C.selection=selection
    return groups,parent,frozen

def plan(number):
    groups=selection()[0][(number-1)*20:number*20];byword={g["normalizedHeadword"]:g for g in groups}
    path=CP/f"planning/micro-{number:02d}-decisions.psv";data=path.read_bytes();req(b"\r" not in data,"Planning requires UTF-8 LF")
    decisions={}
    for line in data.decode("utf-8").splitlines():
        if not line.strip():continue
        fields=line.split("|");req(len(fields)==6,"Planning requires six fields")
        word,slug,meaning,construction,classification,rationale=fields
        req(word in byword and re.fullmatch("[a-z0-9-]+",slug),"Unknown planned group or sense slug")
        req(classification in {"A","B","C","D","E","A+C"} and len(rationale)>=50,"Unknown/insubstantial planning classification")
        req(all(x.strip() for x in fields),"Empty source-planning field")
        decisions.setdefault(word,[]).append({"senseSlug":slug,"sourceSupportedMeaning":meaning,"construction":construction,"distinctionClass":classification,"rationaleVi":rationale})
    req(set(decisions)==set(byword),"Planning coverage mismatch")
    entries=[]
    for group in groups:
        senses=decisions[group["normalizedHeadword"]];slugs=[x["senseSlug"] for x in senses]
        req(len(slugs)==len(set(slugs)),"Duplicate planned Sense boundary")
        classes=sorted({x["distinctionClass"] for x in senses})
        entries.append({"candidateGroupKey":group["candidateGroupKey"],"normalizedHeadword":group["normalizedHeadword"],
            "sourceReferences":group["sourceEvidence"],"sourceEvidence":C.evidence(group),"proposedPOS":group["normalizedPosCandidates"],
            "sourceSupportedMeaningCandidates":[x["sourceSupportedMeaning"] for x in senses],
            "constructionCandidates":[part.strip() for x in senses for part in x["construction"].split(";") if part.strip()],
            "distinctionClass":classes[0] if len(classes)==1 else None,"distinctionClassesBySense":[{"senseSlug":x["senseSlug"],"classification":x["distinctionClass"]} for x in senses],
            "senseDecisionRecords":senses,"proposedSenseBoundaries":slugs,"proposedNumberOfSenses":len(slugs),
            "ambiguityRiskFlags":["IDENTITY_UNRESOLVED","RIGHTS_UNKNOWN"]+(["NUMBER_TAXONOMY_UNRESOLVED"] if "NUMBER" in group["normalizedPosCandidates"] else []),
            "rationaleVi":" | ".join(x["rationaleVi"] for x in senses),"missingSenseCandidates":[],"unresolvedBoundaryItems":[]} )
    value={"microBatch":number,"parentFingerprint":PARENT_FP,"decisionManuscriptSha256":sha(data),"entries":entries,
           "authorship":"AUTHOR_A_AI_SOURCE_COVERAGE_PLANNING","sourceInventoryCount":9677}
    value["fingerprint"]=digest(value)
    return value

def parse(data,groups):
    req(b"\r" not in data,"Manuscript must be raw UTF-8 LF");rows=[];seen=set();examples=set();byword={g["normalizedHeadword"]:g for g in groups}
    for line in data.decode("utf-8").splitlines():
        if not line.strip():continue
        f=line.split("|");req(len(f)==10,"PSV requires ten fields");word,slug,pos,label,definition,vi,en,ev,grammar,display=f
        req(word in byword and re.fullmatch("[a-z0-9-]+",slug) and pos in V.POS,"Unknown group, slug or POS")
        req(pos in byword[word]["normalizedPosCandidates"],"Unsupported source POS")
        req(all(x.strip() for x in f) and all(not re.search(r"\b(TODO|TBD|placeholder|lorem ipsum)\b",x,re.I) for x in f),"Empty/placeholder field")
        key=PREFIX+word+":"+slug;example=key+":example-1";req(key not in seen and example not in examples,"Duplicate proposal/example key");seen.add(key);examples.add(example)
        content={"senseLabelEn":label,"definitionEn":definition,"meaningVi":vi,"examples":[{"exampleKey":example,"en":en,"vi":ev}],"grammarNotesEn":grammar}
        row={"proposalKey":key,"candidateGroupKey":byword[word]["candidateGroupKey"],"headword":word,"displayFormProposal":display,"partOfSpeech":pos,"content":content,"sourceEvidence":byword[word]["sourceEvidence"],"contentStatus":"DRAFT","rights":RIGHTS,"formalApproval":False,"canonicalIdsAllocated":0,"sourceSenseCoverage":"Selected supported meanings only; no claim of exhaustive dictionary coverage","editorialAuthorship":{"kind":"AI_GENERATED_EDITORIAL_DRAFT","humanAuthor":None,"humanReviewer":None,"process":"Original 2H.2L manuscript composed from linked source evidence"},"riskFlags":byword[word]["reviewFlags"]}
        row["fieldHashes"]={k:digest(v) for k,v in content.items()};row["effectiveContentHash"]=digest({"proposalKey":key,"candidateGroupKey":row["candidateGroupKey"],"headword":word,"partOfSpeechProposal":pos,"content":content});rows.append(row)
    req({r["candidateGroupKey"] for r in rows}==set(byword.values() and g["candidateGroupKey"] for g in groups),"Missing frozen group; blocked groups need explicit handling")
    return rows

def validate_reviews(rows,data):
    notes={};out=[]
    for line in data.decode("utf-8").splitlines():
        if not line.strip():continue
        f=line.split("|");req(len(f)==4,"Review requires four fields");word,slug,state,note=f;key=PREFIX+word+":"+slug
        req(key not in notes and state in {"PASS","REVIEW","FAIL"} and len(note)>=70,"Invalid/duplicate/insubstantial review");notes[key]=(state,note)
    req(set(notes)=={r["proposalKey"] for r in rows},"Every Sense needs Author A review")
    for r in rows:
        state,note=notes[r["proposalKey"]];req(state!="FAIL","FAIL cannot seal")
        out.append({"proposalKey":r["proposalKey"],"reviewedContentHash":r["effectiveContentHash"],"reviewedRecordSha256":digest(r),"assessment":state,"reviewExplanationVi":note,"reviewerKind":"AI_SECOND_PASS_EDITORIAL_REVIEW_NOT_HUMAN","dimensions":["MEANING","EN_DEFINITION","VI_SCOPE","EXAMPLE_AGENCY_TENSE_NUMBER_POLARITY","POS_CONSTRUCTION","GRAMMAR","SENSE_BOUNDARY","SOURCE_AGREEMENT","SPECIALIST_SENSITIVITY"],"humanApproval":False})
    return out

def micro(number):
    groups=selection()[0][(number-1)*20:number*20];pl=plan(number);pp=CP/f"planning/micro-{number:02d}.json";req(pp.read_bytes()==encode(pl),"Planning drift")
    rows=parse((CP/f"authored/micro-{number:02d}.psv").read_bytes(),groups);expected={PREFIX+p["normalizedHeadword"]+":"+slug for p in pl["entries"] for slug in p["proposedSenseBoundaries"]};req(expected=={r["proposalKey"] for r in rows},"Manuscript differs from planned boundaries")
    qa=validate_reviews(rows,(CP/f"self-review/micro-{number:02d}.psv").read_bytes());ready=V.load(CP/f"planning/micro-{number:02d}-ready.json")
    reconciliation=CP/f"planning/micro-{number:02d}-plan-reconciliation.json"
    if reconciliation.exists():
        rec=V.load(reconciliation);decisions=CP/f"planning/micro-{number:02d}-decisions.psv";prior=CP/f"planning/micro-{number:02d}-plan-pre-reconciliation.json"
        expected_ready={"planningSha256":sha(pp.read_bytes()),"manuscriptAbsentWhenPlanningPersisted":False,"sourceDecisionsSha256":sha(decisions.read_bytes()),"sourceDecisionsPersistedBeforeManuscript":True,"planReconciliationSha256":sha(reconciliation.read_bytes())}
        req(ready==expected_ready and rec.get("correctedPlanSha256")==sha(pp.read_bytes()) and rec.get("correctedPlanFingerprint")==pl["fingerprint"],"Plan reconciliation receipt mismatch")
        req(rec.get("sourceDecisionsSha256")==sha(decisions.read_bytes()) and rec.get("manuscriptSha256")==sha((CP/f"authored/micro-{number:02d}.psv").read_bytes()),"Plan reconciliation input drift")
        req(prior.exists() and rec.get("priorPlanSha256")==sha(prior.read_bytes()),"Prior plan evidence missing")
    else:req(ready=={"planningSha256":sha(pp.read_bytes()),"manuscriptAbsentWhenPlanningPersisted":True},"Missing plan-before-manuscript receipt")
    receipt={"phase":"2H.2L","microBatch":number,"parentFingerprint":PARENT_FP,"cohortFingerprint":selection()[2]["fingerprint"],"planningFingerprint":pl["fingerprint"],"planningSha256":sha(pp.read_bytes()),"manuscriptSha256":sha((CP/f"authored/micro-{number:02d}.psv").read_bytes()),"selfReviewSha256":sha((CP/f"self-review/micro-{number:02d}.psv").read_bytes()),"recordHash":digest(rows),"reviewHash":digest(qa),"groupKeys":[g["candidateGroupKey"] for g in groups],"senseCount":len(rows),"qaCounts":dict(Counter(q["assessment"] for q in qa)),"sourceSimilarityFindings":V.copying_checks(rows,V.inputs()[3]),"status":"SEALED_AI_DRAFT_NOT_APPROVED"};receipt["fingerprint"]=digest(receipt)
    return rows,qa,receipt

def validate_handoff(n,rows,seal):
    expected={"microBatch":n,"records":rows,"sourceEvidence":[{"group":g["normalizedHeadword"],"evidence":C.evidence(g)} for g in selection()[0][(n-1)*20:n*20]],"manuscriptSha256":seal["manuscriptSha256"],"reviewInstruction":"Blind independent review before viewing Author A judgments; exact content hashes required"}
    req((CP/f"handoff/micro-{n:02d}.json").read_bytes()==encode(expected),"Independent handoff source/content drift")

def boundaries(planning,review):
    entries={e["candidateGroupKey"]:e for e in planning};items=[]
    for p in sorted((CP/"planning").glob("boundary-review-*.json")):
        raw=p.read_bytes();req(b"\r" not in raw,"Boundary evidence requires LF")
        for i in json.loads(raw.decode())["records"]:
            e=entries.get(i["candidateGroupKey"]);req(e is not None,"Unknown boundary group")
            keys={PREFIX+e["normalizedHeadword"]+":"+s for s in e["proposedSenseBoundaries"]}
            req(i["proposalKey"] in keys and i["assessment"]=="REVIEW" and i["canonicalResolution"]=="UNRESOLVED" and i["recordedBeforeManuscript"] is True and len(i["issueVi"])>=70,"Invalid boundary identity/status")
            name,fragment=i["sourceEvidencePointer"].split("#/entries/");idx=int(fragment.split("/")[0]);req(V.load(CP/"planning"/name)["entries"][idx]["candidateGroupKey"]==i["candidateGroupKey"],"Boundary source pointer mismatch");items.append(i)
    req(len(items)==len({i["proposalKey"] for i in items}),"Duplicate boundary records")
    missing={q["proposalKey"] for q in review["records"] if q.get("missingSenseCandidates")};unresolved={q["proposalKey"] for q in review["records"] if q.get("unresolvedBoundaryItems")}
    missing.update(i["proposalKey"] for i in items if i.get("missingSenseCandidate"));unresolved.update(i["proposalKey"] for i in items)
    return {"preAuthoringBoundaryReviews":items,"missingSenseCandidateProposalKeys":sorted(missing),"unresolvedBoundaryProposalKeys":sorted(unresolved),"countingUnit":"Unique proposal identities; duplicate reviewer and planning observations counted once"}

def build():
    groups,parent,frozen=selection();rows=[];qa=[];seals=[];plans=[]
    for n in range(1,6):
        path=CP/f"micro-{n:02d}-seal.json"
        if not path.exists():req(not any((CP/f"micro-{k:02d}-seal.json").exists() for k in range(n+1,6)),"Noncontiguous seals");break
        r,q,z=micro(n);req(path.read_bytes()==encode(z),"Seal drift");validate_handoff(n,r,z);rows+=r;qa+=q;seals.append(z);plans+=plan(n)["entries"]
    req(len({r["proposalKey"] for r in rows})==len(rows),"Duplicate new proposals")
    oldrows=parent["records"];req(not {r["proposalKey"] for r in rows}.intersection(r["proposalKey"] for r in oldrows),"Proposal collision")
    original=copy.deepcopy(rows);rows,changes=C.revisions(rows);ind=C.independent(rows,original)
    for q in qa:
        r=next(r for r in rows if r["proposalKey"]==q["proposalKey"])
        if q["reviewedContentHash"]!=r["effectiveContentHash"]:q["originalReviewedContentHash"]=q["reviewedContentHash"];q["reviewedContentHash"]=r["effectiveContentHash"];q["reviewedRecordSha256"]=digest(r);q["reviewExplanationVi"]+=" Revision BEFORE/AFTER được rà soát; recheck độc lập hash mới được lưu riêng."
    boundary=boundaries(plans,ind);newgroups={r["candidateGroupKey"] for r in rows};req(len(newgroups)==100 and newgroups=={g["candidateGroupKey"] for g in selection()[0]},"CP01 authored group coverage")
    counts={"sourceGroups":6143,"previousAuthoredGroups":1520,"previousEffectiveSenses":2081,"selectedCohortGroups":500,"microBatchesCompleted":len(seals),"newAuthoredGroups":len(newgroups),"newSenses":len(rows),"multiSenseGroups":sum(n>1 for n in Counter(r["candidateGroupKey"] for r in rows).values()),"plannedSourceSupportedMeaningCandidates":sum(len(p["sourceSupportedMeaningCandidates"]) for p in plans),"sourceMeaningCandidatesExamined":sum(len(p["sourceSupportedMeaningCandidates"]) for p in plans)+len(boundary["missingSenseCandidateProposalKeys"]),"missingSenseCandidates":len(boundary["missingSenseCandidateProposalKeys"]),"unresolvedBoundaryItems":len(boundary["unresolvedBoundaryProposalKeys"]),"cumulativeAuthoredGroups":1520+len(newgroups),"cumulativeDraftSenses":2081+len(rows),"remainingUnauthoredGroups":4623-len(newgroups),"selfReview":dict(Counter(q["assessment"] for q in qa)),"independentReview":dict(Counter(q["assessment"] for q in ind["records"]))}
    projection={**{k:v for k,v in parent.items() if k!="records"},"parentFingerprint":PARENT_FP,"inheritedRecordCount":2081,"newRecordCount":len(rows),"records":oldrows+rows};req(projection["records"][:2081]==oldrows,"Inherited parent inequality")
    artifacts={"cumulative-effective-draft-projection.json":projection,"new-sense-proposals.json":{"records":rows},"revision-evidence.json":{"records":changes},"self-review.json":{"records":qa},"independent-review.json":ind,"source-coverage-ledger.json":{"entries":plans,**boundary},"validation-summary.json":{"counts":counts,"sourceSimilarityFindings":[f for z in seals for f in z["sourceSimilarityFindings"]],"crossSourceCopyingScreen":V.cross_source_copying(rows,V.inputs()[3]),"rights":RIGHTS,"canonicalIdsAllocated":0,"ownerApprovals":0,"previousCohortFingerprint":PARENT_FP,"previousCohortIndependentReview":{"PASS":484,"REVIEW":34,"FAIL":0},"previousDeferredProposalIdentities":16,"databaseAccess":"NONE","databaseWrites":"NONE","publicationReady":len(seals)==5 and ind["publicationReady"]}}
    files={n:encode(x) for n,x in artifacts.items()};inputs=[p for d in ["planning","authored","self-review","handoff","independent-review","revisions","tooling"] for p in (CP/d).glob("*") if p.is_file()]+list(CP.glob("micro-*-seal.json"))
    m={"phase":"2H.2L","cohortId":"500-02","checkpoint":1,"parentFingerprint":PARENT_FP,"cohortFingerprint":frozen["fingerprint"],"counts":counts,"rawInputSha256":{str(p.relative_to(CP)).replace("\\","/"):sha(p.read_bytes()) for p in sorted(inputs)},"selectionArtifactSha256":{n:sha((WS/"selection"/n).read_bytes()) for n in ["frozen-cohort.json","selection-manifest.json"]},"microBatchFingerprints":[z["fingerprint"] for z in seals],"artifactHashes":{n:sha(b) for n,b in sorted(files.items())},"contentStatus":"DRAFT","rights":RIGHTS,"publicationReady":artifacts["validation-summary.json"]["publicationReady"]};m["fingerprint"]=digest(m);files["manifest.json"]=encode(m)
    report="""# Phase 2H.2L — Checkpoint 01\n\n"""+json.dumps(counts,ensure_ascii=False,sort_keys=True,indent=2)+"\n\nParent records are inherited byte-for-byte at the record-object level. Author A and isolated reviewer judgments are separate; no human approval, canonical IDs or rights clearance. Source coverage is evidence-limited, not exhaustive.\nPrevious 2H.2K CP01–05 records, 34 REVIEW findings and 16 deferred identities remain in the parent lineage; no deferred meaning is applied.\nAll content remains offline DRAFT. No database or Production activity. Checkpoint 02 is not started.\n"
    files["report.md"]=report.encode();m["artifactHashes"]["report.md"]=sha(files["report.md"]);m["fingerprint"]=digest({k:v for k,v in m.items() if k!="fingerprint"});files["manifest.json"]=encode(m)
    return files,m

def reconcile_plan(number):
    groups=selection()[0][(number-1)*20:number*20];pp=CP/f"planning/micro-{number:02d}.json";rp=CP/f"planning/micro-{number:02d}-ready.json";mp=CP/f"authored/micro-{number:02d}.psv"
    recp=CP/f"planning/micro-{number:02d}-plan-reconciliation.json";prior=CP/f"planning/micro-{number:02d}-plan-pre-reconciliation.json";decision=CP/f"planning/micro-{number:02d}-decisions.psv"
    req(pp.is_file() and rp.is_file() and mp.is_file() and decision.is_file(),"Reconciliation requires existing planning, receipt, decisions and manuscript")
    req(not (CP/f"micro-{number:02d}-seal.json").exists() and not (CP/f"handoff/micro-{number:02d}.json").exists() and not recp.exists() and not prior.exists(),"Refusing to reconcile sealed or previously reconciled microbatch")
    old_plan=pp.read_bytes();old_ready=V.load(rp);new_plan=plan(number);new_plan_bytes=encode(new_plan)
    req(old_plan!=new_plan_bytes,"Existing plan already matches current frozen cohort")
    req(old_ready.get("manuscriptAbsentWhenPlanningPersisted") is True,"Original plan receipt does not support pre-authoring order")
    rows=parse(mp.read_bytes(),groups);expected={PREFIX+p["normalizedHeadword"]+":"+slug for p in new_plan["entries"] for slug in p["proposedSenseBoundaries"]}
    req(expected=={r["proposalKey"] for r in rows},"Existing manuscript does not match corrected frozen plan; stop for editorial reconciliation")
    decision_bytes=decision.read_bytes();decision_time=decision.stat().st_mtime_ns;manuscript_time=mp.stat().st_mtime_ns
    req(decision_time<=manuscript_time,"Cannot substantiate source-decision planning before manuscript")
    write_new(prior,old_plan)
    rec={"phase":"2H.2L","microBatch":number,"status":"UNSEALED_PLAN_RECONCILIATION","reason":"The adapter delegated planning before installing the local cohort selector, so the saved derived plan came from the legacy 2H.2K validator. Source decisions and manuscript remain unchanged.","priorPlanSha256":sha(old_plan),"priorPlanFingerprint":json.loads(old_plan.decode("utf-8")).get("fingerprint"),"priorPlanGroupKeys":[e.get("candidateGroupKey") for e in json.loads(old_plan.decode("utf-8")).get("entries",[])],"priorReadyReceipt":old_ready,"sourceDecisionsSha256":sha(decision_bytes),"sourceDecisionsMtimeNs":decision_time,"manuscriptSha256":sha(mp.read_bytes()),"manuscriptMtimeNs":manuscript_time,"correctedPlanSha256":sha(new_plan_bytes),"correctedPlanFingerprint":new_plan["fingerprint"],"correctedPlanGroupKeys":[e["candidateGroupKey"] for e in new_plan["entries"]],"manuscriptProposalKeysMatchCorrectedPlan":True,"sealedBeforeReconciliation":False}
    rec_bytes=encode(rec);write_new(recp,rec_bytes);pp.write_bytes(new_plan_bytes)
    ready={"planningSha256":sha(new_plan_bytes),"manuscriptAbsentWhenPlanningPersisted":False,"sourceDecisionsSha256":sha(decision_bytes),"sourceDecisionsPersistedBeforeManuscript":True,"planReconciliationSha256":sha(rec_bytes)}
    rp.write_bytes(encode(ready))
    print(json.dumps({"status":"RECONCILED_UNSEALED_PLAN","priorPlanSha256":sha(old_plan),"correctedPlanSha256":sha(new_plan_bytes),"groups":len(new_plan["entries"]),"senses":len(rows),"manuscriptMatchesFrozenPlan":True}))

def main():
    p=argparse.ArgumentParser();g=p.add_mutually_exclusive_group(required=True);g.add_argument("--plan",type=int,choices=range(1,6));g.add_argument("--reconcile-plan",type=int,choices=range(1,6));g.add_argument("--seal",type=int,choices=range(1,6));g.add_argument("--assemble",action="store_true");g.add_argument("--check",action="store_true");g.add_argument("--resume-status",action="store_true");a=p.parse_args()
    if a.reconcile_plan:return reconcile_plan(a.reconcile_plan)
    if a.plan:
        n=a.plan;req(not (CP/f"authored/micro-{n:02d}.psv").exists(),"Persist planning before manuscript");x=plan(n);pp=CP/f"planning/micro-{n:02d}.json";write_new(pp,encode(x));write_new(CP/f"planning/micro-{n:02d}-ready.json",encode({"planningSha256":sha(pp.read_bytes()),"manuscriptAbsentWhenPlanningPersisted":True}));print("PLANNED",n);return
    if a.seal:
        n=a.seal;req(n==1 or (CP/f"micro-{n-1:02d}-seal.json").exists(),"Previous microbatch missing");r,q,z=micro(n);V.cross_source_copying(r,V.inputs()[3]);write_new(CP/f"micro-{n:02d}-seal.json",encode(z));write_new(CP/f"handoff/micro-{n:02d}.json",encode({"microBatch":n,"records":r,"sourceEvidence":[{"group":g["normalizedHeadword"],"evidence":C.evidence(g)} for g in selection()[0][(n-1)*20:n*20]],"manuscriptSha256":z["manuscriptSha256"],"reviewInstruction":"Blind independent review before viewing Author A judgments; exact content hashes required"}));print("SEALED",n,len(r));return
    files,m=build()
    if a.resume_status:print(json.dumps({"completed":m["counts"],"nextMicroBatch":None if m["counts"]["microBatchesCompleted"]==5 else m["counts"]["microBatchesCompleted"]+1}));return
    target=CP/"assembled"
    if a.check:req({p.name for p in target.iterdir()}==set(files),"Assembly scope drift")
    for n,b in files.items():
        if a.check:req((target/n).read_bytes()==b,"Assembly replay drift: "+n)
        else:write_new(target/n,b)
    print(json.dumps({"fingerprint":m["fingerprint"],"counts":m["counts"],"publicationReady":m["publicationReady"],"zeroWrites":a.check}))
if __name__=="__main__":main()
