"""Read-only data-derived cohort audit; --write creates the additive report once."""
import argparse
import importlib.util
import json
from collections import Counter
from pathlib import Path
spec=importlib.util.spec_from_file_location('cp05',Path(__file__).with_name('checkpoint-05.py'))
M=importlib.util.module_from_spec(spec);spec.loader.exec_module(M)
V=M.V; WS=V.WS
REPORT=WS/'reports/cohort-500-completion.md'

def audit():
    frozen=V.frozen(); groups=frozen['groups']; V.require(len(groups)==len({g['candidateGroupKey'] for g in groups})==500,'Cohort identity accounting')
    previous=None; rows=[]; findings=[]; deferred=[]; total=0; seen=set(); chain=[]
    for n in range(1,6):
        cp=WS/f'checkpoints/checkpoint-{n:02d}'; assembled=cp/'assembled'
        accepted=assembled if n>1 else cp/'publication/reviewer-b-r1c/assembled'
        manifest=V.load(accepted/'manifest.json'); V.require(manifest['fingerprint']==V.digest({k:v for k,v in manifest.items() if k!='fingerprint'}),'Manifest fingerprint')
        for name,h in manifest['artifactHashes'].items():V.require(V.sha((accepted/name).read_bytes())==h,'Artifact byte pin: '+name)
        if n>1:
            for name,h in manifest['rawInputSha256'].items():V.require(V.sha((cp/name).read_bytes())==h,'Raw input byte pin: '+name)
        projection=V.load(accepted/'cumulative-effective-draft-projection.json')['records']
        baseline=1563 if n==1 else len(previous)
        if previous is not None:
            V.require(projection[:baseline]==previous,'Parent content mismatch')
            V.require(manifest['parentFingerprint']==chain[-1],'Parent fingerprint chain')
        new=projection[baseline:]; keys={r['candidateGroupKey'] for r in new}
        selected=[g for g in groups if g['checkpoint']==n]
        V.require([g['authoringOrder'] for g in selected]==list(range((n-1)*100+1,n*100+1)),'Frozen partition order')
        V.require(len(keys)==100 and keys=={g['candidateGroupKey'] for g in selected} and not seen.intersection(keys),'Partition group mismatch')
        seen.update(keys);V.require(len(projection)==len({r['proposalKey'] for r in projection}),'Duplicate proposal')
        summary=V.load(accepted/'validation-summary.json')
        if n==1:
            reviews=V.load(accepted/'final-review-reconciliation.json')['records']
            review_counts=Counter(r['finalReviewerBAssessment'] for r in reviews)
            corrections=summary['contentCorrectionsApplied']
            missing=V.load(accepted/'deferred-coverage-queue.json')['records']
            similarity=summary['copyingScreen']; short=len(summary['sourceSimilarityFindings'])
        else:
            reviews=V.load(accepted/'independent-review.json')['records'];review_counts=Counter(r['assessment'] for r in reviews)
            corrections=len(V.load(accepted/'revision-evidence.json')['records'])
            coverage=V.load(accepted/'source-coverage-ledger.json');missing=coverage.get('missingSenseCandidateProposalKeys',[])
            similarity=summary['crossSourceCopyingScreen'];short=len(summary['sourceSimilarityFindings'])
            V.require(manifest['counts']['newAuthoredGroups']==len(keys) and manifest['counts']['newSenses']==len(new),'Manifest accounting')
            V.require(manifest['publicationReady'] and all(not r['blocksPublication'] for r in reviews),'Publication blockers')
        newkeys={r['proposalKey'] for r in new}; bykey={r['proposalKey']:r for r in new}
        V.require(len(reviews)==len(new) and {r['proposalKey'] for r in reviews}==newkeys,'Review coverage')
        for r in reviews:
            V.require(r['effectiveContentHash']==bykey[r['proposalKey']]['effectiveContentHash'],'Review hash binding')
            if r.get('assessment',r.get('finalReviewerBAssessment'))=='REVIEW':
                explanation=r.get('explanationVi') or r['originalReviewerBReview']['reviewExplanationVi']
                issues=r.get('issues',[])
                category='SOURCE_COVERAGE_OR_SCOPE'
                text=(explanation+' '+json.dumps(issues,ensure_ascii=False)).lower()
                if 'taxonomy' in text or 'number' in text or 'từ loại' in text or 'pos' in text:category='TAXONOMY_OR_POS'
                elif 'dịch' in text or 'wording' in text or 'cư xử' in text:category='WORDING_OR_TRANSLATION_PRECISION'
                findings.append((n,r['proposalKey'],category,explanation))
        deferred.extend((n,({k:m[k] for k in ['candidateId','headword','existingProposalKey','candidateMeaning','classification','disposition'] if k in m} if isinstance(m,dict) else m)) for m in missing)
        V.require(summary.get('ownerApprovals',summary.get('humanApprovals',0))==0,'No content approvals')
        V.require(summary['rights']=='UNKNOWN_REVIEW_REQUIRED' and summary['canonicalIdsAllocated']==0 and summary['databaseAccess']=='NONE' and summary['databaseWrites']=='NONE','Protected status')
        rows.append((n,len(keys),len(new),dict(review_counts),corrections,len(missing),short,similarity))
        total+=len(new);chain.append(manifest['fingerprint']);previous=projection
    V.require(seen=={g['candidateGroupKey'] for g in groups} and len(seen)==500,'Complete partition')
    V.require(len(previous)==1563+total and len({r['candidateGroupKey'] for r in previous})==1520,'Final inventory')
    out=['# Cohort 500 completion audit','', 'COHORT_500_AUTHORING_COMPLETE: YES','MASTER_RELEASE_APPROVED: NO','DATABASE_IMPORT_COMPLETE: NO','',f'Frozen fingerprint: {frozen["fingerprint"]}', '', '| CP | Groups | New Senses | Independent verdicts | Field corrections | Deferred affected proposals | Short similarity observations |','|---|---:|---:|---|---:|---:|---:|']
    for n,g,s,c,r,d,h,sim in rows:out.append(f'| {n:02d} | {g} | {s} | {c} | {r} | {d} | {h} |')
    out+=['',f'Unique selected/authored cohort groups: {len(seen)} / {len(seen)}. Zero gaps or overlaps; exact orders 1–500.',f'Total cohort Senses: {total}; cumulative groups: 1520; cumulative effective Senses: {len(previous)}; remaining source groups: {6143-1520}.','Parent records retained exactly at every accepted CP01 R1C → CP02 → CP03 → CP04 → CP05 edge. CP01 baseline: 1563 records / 1020 groups.','', '## Accepted fingerprint chain','']
    out += [f'- CP{n:02d}: {fp}' for n,fp in enumerate(chain,1)]
    out += ['', '## Unresolved independent findings', '', 'Categories are audit labels for retained explanations, not canonical classifications. No finding is automatically cleared.', '']
    for n,key,cat,explanation in findings:out.append(f'- CP{n:02d} / {key} / {cat}: {explanation}')
    out += ['', '## Deferred source coverage', '','Counts use affected proposal identities; one identity can retain more than one possible meaning. No deferred candidate was inserted.','']
    for n,m in deferred:out.append(f'- CP{n:02d}: '+json.dumps(m,ensure_ascii=False,sort_keys=True))
    out += ['', '## Full source similarity summaries', '']
    for n,g,s,c,r,d,h,sim in rows:out.append(f'- CP{n:02d}: '+json.dumps(sim,ensure_ascii=False,sort_keys=True))
    out += ['', 'All content remains AI_GENERATED_EDITORIAL_DRAFT. Rights: UNKNOWN_REVIEW_REQUIRED. Human/owner content approvals: 0. Canonical IDs allocated: 0. Database access/writes: NONE/NONE; Production untouched. Git publication is an offline DRAFT milestone, not release approval or import. Historical parent corrections and reviewer provenance remain intact.', '','This report is reproduced from accepted manifests, hash-pinned artifacts, frozen membership, exact parent prefixes and review hash bindings. It does not claim exhaustive dictionary coverage or rights clearance. Historical diagnostics are not rerun by this audit. Stop after CP05; future corpus expansion needs separate owner authorization.','']
    return '\n'.join(out).encode('utf-8')

if __name__=='__main__':
    p=argparse.ArgumentParser();a=p.add_mutually_exclusive_group(required=True);a.add_argument('--write',action='store_true');a.add_argument('--check',action='store_true');args=p.parse_args();data=audit()
    if args.write:V.write_new(REPORT,data)
    else:V.require(REPORT.read_bytes()==data,'Completion report drift')
    print('COHORT500_PARTITION_LINEAGE_REVIEW_REPORT=PASS; zeroWrites='+str(args.check))
