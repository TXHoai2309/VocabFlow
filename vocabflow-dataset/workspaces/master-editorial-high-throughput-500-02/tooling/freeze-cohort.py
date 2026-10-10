"""Deterministic source-backed stratified selection for Phase 2H.2L."""
import argparse
import copy
import hashlib
import importlib.util
import json
import subprocess
from collections import Counter
from pathlib import Path
ROOT=next(p for p in Path(__file__).resolve().parents if (p/"AGENTS.md").is_file())
OLD=ROOT/"vocabflow-dataset/workspaces/master-editorial-high-throughput-500"
WS=ROOT/"vocabflow-dataset/workspaces/master-editorial-high-throughput-500-02"
SEED="PHASE_2H2L_COHORT_500_02_V1"
BASE="f397c18db58930fcd8bd29a1711249f2f2433276"
PARENT_FP="6d66f021b215ddddf3d2f5eb325835fd536f86bf83a392b208dc0ef40edce1fc"
EXPECTED_OLD_COHORT="f20e8c59d7b47cdf80f026d16acda8dbb283f948c8d5cb61cfef9c60cb7652c8"
sp=importlib.util.spec_from_file_location("accepted_cp05",OLD/"checkpoints/checkpoint-05/tooling/checkpoint-05.py")
M=importlib.util.module_from_spec(sp);sp.loader.exec_module(M);V=M.V

def sha(b):return hashlib.sha256(b).hexdigest()
def digest(x):return sha(json.dumps(x,ensure_ascii=False,sort_keys=True,separators=(",",":")).encode())
def enc(x):return (json.dumps(x,ensure_ascii=False,sort_keys=True,indent=2)+"\n").encode()
def req(x,msg):
    if not x:raise ValueError(msg)
def src(g):
    cs={r["corpus"] for r in g["sourceEvidence"]};return "BOTH" if cs=={"OXFORD_5000","ENGLISH_VOCAB_4600"} else "OXFORD" if cs=={"OXFORD_5000"} else "VOCAB"
def risk(g):
    d=g["priorityDimensions"]
    return sum(int(d.get(k,0) or 0) for k in ["POS_CONFLICT","POSSIBLE_POLYSEMY","EXISTING_MASTER_LEMMA","LEGACY_HISTORY"])+int(len(g["normalizedPosCandidates"])!=1)
def pos(g):
    p=set(g["normalizedPosCandidates"])
    return "NOUN" if "NOUN" in p else "VERB" if "VERB" in p else "MODIFIER" if p&{"ADJECTIVE","ADVERB"} else "OTHER"
def cefr(g):
    return sorted({e["value"] for r in g["sourceEvidence"] for e in r["cefrEvidence"] if e["value"] in {"A1","A2","B1","B2","C1","C2"}})
def h(s):return sha((SEED+"\n"+s).encode())
def allocate(cells,total):
    n=sum(len(v) for v in cells.values()); quotas={k:(len(v)*total)//n for k,v in cells.items()};left=total-sum(quotas.values())
    order=sorted(cells,key=lambda k:(-((len(cells[k])*total)%n),h(json.dumps(k,separators=(",",":")))))
    for k in order[:left]:quotas[k]+=1
    req(sum(quotas.values())==total,"Hamilton allocation failure")
    return quotas

def build():
    req(subprocess.check_output(["git","branch","--show-current"],cwd=ROOT).decode().strip()=="TXH","Not on TXH")
    req(subprocess.check_output(["git","rev-parse","HEAD"],cwd=ROOT).decode().strip()==BASE,"Local baseline drift")
    req(subprocess.check_output(["git","ls-remote","origin","refs/heads/TXH"],cwd=ROOT).decode().split()[0]==BASE,"Remote baseline drift")
    oldcohort=V.frozen();req(oldcohort["fingerprint"]==EXPECTED_OLD_COHORT,"Historical cohort drift")
    sourcegroups,_,_,_=V.inputs();req(len(sourcegroups)==len({g["candidateGroupKey"] for g in sourcegroups})==6143,"Canonical ledger identity drift")
    pm=V.load(OLD/"checkpoints/checkpoint-05/assembled/manifest.json")
    req(pm["fingerprint"]==PARENT_FP==V.digest({k:v for k,v in pm.items() if k!="fingerprint"}),"CP05 manifest drift")
    for name,pin in pm["artifactHashes"].items():req(sha((OLD/"checkpoints/checkpoint-05/assembled"/name).read_bytes())==pin,"CP05 artifact hash drift")
    for name,pin in pm["rawInputSha256"].items():req(sha((OLD/"checkpoints/checkpoint-05"/name).read_bytes())==pin,"CP05 input hash drift")
    projection=V.load(OLD/"checkpoints/checkpoint-05/assembled/cumulative-effective-draft-projection.json")
    records=projection["records"];authored={r["candidateGroupKey"] for r in records}
    req(len(records)==len({r["proposalKey"] for r in records})==2081 and len(authored)==1520,"CP05 projection accounting drift")
    groups_by_key={g["candidateGroupKey"]:g for g in sourcegroups};req(authored<=groups_by_key.keys(),"Unknown authored identity")
    remaining=[copy.deepcopy(g) for g in sourcegroups if g["candidateGroupKey"] not in authored]
    req(len(remaining)==len({g["candidateGroupKey"] for g in remaining})==4623,"Remaining inventory accounting drift")
    cells={}
    for g in remaining:cells.setdefault((src(g),min(risk(g),3),pos(g)),[]).append(g)
    quotas=allocate(cells,500);selected=[]
    for key,items in cells.items():selected.extend(sorted(items,key=lambda g:(h("SELECT\n"+g["candidateGroupKey"]),g["candidateGroupKey"]))[:quotas[key]])
    selected.sort(key=lambda g:(h("ORDER\n"+g["candidateGroupKey"]),g["candidateGroupKey"]))
    req(len(selected)==len({g["candidateGroupKey"] for g in selected})==500 and not authored.intersection(g["candidateGroupKey"] for g in selected),"Selection identity/overlap drift")
    for i,g in enumerate(selected,1):g.update({"cohortOrder":i,"checkpoint":(i-1)//100+1,"authoringOrder":(i-1)%100+1,"microBatchWithinCheckpoint":((i-1)%100)//20+1,"selectionRiskScore":risk(g),"selectionRiskFlags":g["reviewFlags"]})
    source_counts=Counter(src(g) for g in selected);risk_counts=Counter("LOW_0" if risk(g)==0 else "MODERATE_1_2" if risk(g)<=2 else "ELEVATED_3_PLUS" for g in selected);pos_counts=Counter(pos(g) for g in selected)
    strata_counts={"|".join(map(str,k)):len(v) for k,v in sorted(cells.items())};strata_quota={"|".join(map(str,k)):quotas[k] for k in sorted(quotas)}
    def groupstats(items):return {"sourceMembership":dict(sorted(Counter(src(g) for g in items).items())),"riskScoreBands":dict(sorted(Counter("LOW_0" if risk(g)==0 else "MODERATE_1_2" if risk(g)<=2 else "ELEVATED_3_PLUS" for g in items).items())),"posFamilies":dict(sorted(Counter(pos(g) for g in items).items())),"sourceCefrEvidenceOnly":dict(sorted(Counter(x for g in items for x in cefr(g)).items())),"possiblePolysemyFlagGroups":sum(bool(g["priorityDimensions"].get("POSSIBLE_POLYSEMY")) for g in items),"posConflictGroups":sum(bool(g["priorityDimensions"].get("POS_CONFLICT")) for g in items)}
    seed_manifest={"seed":SEED,"algorithm":"Proportionate stratified sample over joint (source membership × capped editorial risk score × POS family) cells. Allocate 500 by Hamilton largest remainders; deterministic SHA256 tie breaks and within-cell ordering; seeded SHA256 order the selected groups. No quota hand-entered. CEFR is source evidence only.","total":len(sourcegroups),"authored":len(authored),"remaining":len(remaining),"selected":len(selected),"sourceGroupLedgerSha256":sha((ROOT/"vocabflow-dataset/workspaces/full-master-expansion-candidate-preparation/full-master-expansion-candidate-ledger.json").read_bytes()),"sourceInventoryHashes":{n:sha((ROOT/"vocabflow-dataset/workspaces/full-source-inventory-dedupe"/n).read_bytes()) for n in ["oxford-normalized-inventory.json","vocab4600-normalized-inventory.json"]},"parentProjectionSha256":sha((OLD/"checkpoints/checkpoint-05/assembled/cumulative-effective-draft-projection.json").read_bytes()),"parentFingerprint":PARENT_FP,"previousCohortFingerprint":EXPECTED_OLD_COHORT,"stratumCounts":strata_counts,"stratumQuotas":strata_quota,"selectedSource":dict(source_counts),"selectedRisk":dict(risk_counts),"selectedPos":dict(pos_counts)}
    cohort={"phase":"2H.2L","cohortId":"500-02","seed":SEED,"algorithm":seed_manifest["algorithm"],"parentFingerprint":PARENT_FP,"previousCohortFingerprint":EXPECTED_OLD_COHORT,"inputPins":{k:v for k,v in seed_manifest.items() if k.endswith("Sha256") or k.endswith("Hashes")},"groups":selected,"coverage":{"sourceMembership":dict(source_counts),"riskScoreBands":dict(risk_counts),"posFamilies":dict(pos_counts)},"sourceCefrEvidenceIsNotApprovedClassification":True}
    cohort["fingerprint"]=digest(cohort)
    exclusion={"groupCount":len(authored),"candidateGroupKeys":sorted(authored),"parentProjectionSha256":seed_manifest["parentProjectionSha256"],"parentFingerprint":PARENT_FP}
    rationale=("# Cohort 500-02 selection rationale\n\n"+f"Frozen source: 6143 unique ledger groups; 1520 excluded as authored in CP05; 4623 eligible groups. Seed: {SEED}.\n\n"+seed_manifest["algorithm"]+"\n\n"+"Selection composition: "+json.dumps(cohort["coverage"],ensure_ascii=False,sort_keys=True)+"\n\nRemaining-pool composition: "+json.dumps(groupstats(remaining),ensure_ascii=False,sort_keys=True)+"\n\nSelected-pool source-backed composition: "+json.dumps(groupstats(selected),ensure_ascii=False,sort_keys=True)+"\n\nThe stratified cells are derived from empirical source membership, priority dimensions and normalized POS candidates in the accepted candidate ledger. Risk is the sum of the four pinned priority dimensions plus a multiple-POS indicator, capped into 0/1/2/3+ sampling bands; raw score is preserved per selected group. POS families are noun, verb, modifier (adjective/adverb), and other. Hamilton allocation follows observed joint cell sizes; no category quota was manually invented. CEFR values are descriptive source evidence and do not grant CEFR classification. Regional variants and source evidence limits stay in each group's linked source records.\n\nThe selected 500 are partitioned in deterministic selection order into five checkpoints of 100. Only checkpoint 01 is authorized for authoring in this phase.")
    files={"remaining-group-inventory.json":enc({"groupCount":len(remaining),"groups":remaining}),"authored-exclusion.json":enc(exclusion),"frozen-cohort.json":enc(cohort),"selection-statistics.json":enc({"seed":SEED,"population":groupstats(sourcegroups),"authoredExclusions":groupstats([groups_by_key[k] for k in authored]),"remaining":groupstats(remaining),"selected":groupstats(selected),"stratumCounts":strata_counts,"stratumQuotas":strata_quota}),"selection-rationale.md":rationale.encode()}
    manifest={"phase":"2H.2L","cohortId":"500-02","baseline":BASE,"parentFingerprint":PARENT_FP,"frozenCohortFingerprint":cohort["fingerprint"],"counts":{"sourceGroups":6143,"authoredGroups":1520,"remainingGroups":4623,"selectedGroups":500},"inputPins":{k:v for k,v in seed_manifest.items() if k.endswith("Sha256") or k.endswith("Hashes")},"artifactHashes":{n:sha(b) for n,b in sorted(files.items())}}
    manifest["fingerprint"]=digest(manifest);files["selection-manifest.json"]=enc(manifest)
    return files,manifest
if __name__=="__main__":
    p=argparse.ArgumentParser();q=p.add_mutually_exclusive_group(required=True);q.add_argument("--freeze",action="store_true");q.add_argument("--check",action="store_true");a=p.parse_args();files,m=build();target=WS/"selection"
    if a.freeze:
        req(not target.exists(),"Selection directory already exists; refusing overwrite")
        for n,b in files.items():
            path=target/n;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(b)
    else:
        req({p.name for p in target.iterdir()}==set(files),"Selection artifact scope drift")
        for n,b in files.items():req((target/n).read_bytes()==b,"Deterministic selection replay drift: "+n)
    print(json.dumps({"cohortFingerprint":m["frozenCohortFingerprint"],"manifestFingerprint":m["fingerprint"],"counts":m["counts"],"coverage":V.load(target/"frozen-cohort.json")["coverage"],"zeroWrites":a.check},ensure_ascii=False))
