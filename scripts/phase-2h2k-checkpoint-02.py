#!/usr/bin/env python3
"""Checkpoint 02: persisted source planning, immutable DRAFT seals and replay."""
import argparse
import copy
import importlib.util
import json
import subprocess
from collections import Counter
from functools import lru_cache
from pathlib import Path

spec = importlib.util.spec_from_file_location('authoring', Path(__file__).with_name('phase-2h2k-high-throughput-authoring.py'))
V = importlib.util.module_from_spec(spec)
spec.loader.exec_module(V)
ROOT = V.ROOT
CP = V.WS/'checkpoints/checkpoint-02'
BASE = '7276bb798424e0b6e6ff6942feda0f92dc42dd66'
PARENT_FP = '1010457b2f4cd0a60917317b0cec1815c2e8bcad023757fb6355ad534894877f'
PARENT = V.CP/'publication/reviewer-b-r1c/assembled'


@lru_cache(maxsize=1)
def selection():
    V.require(subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=ROOT,capture_output=True).returncode == 0,'Baseline ancestry drift')
    cohort = V.frozen()
    V.require(cohort['fingerprint']=='f20e8c59d7b47cdf80f026d16acda8dbb283f948c8d5cb61cfef9c60cb7652c8','Frozen fingerprint drift')
    groups = [g for g in cohort['groups'] if g['checkpoint']==2 and 101<=g['authoringOrder']<=200]
    V.require(len(groups)==len({g['candidateGroupKey'] for g in groups})==100,'Selection count/identity drift')
    V.require([g['authoringOrder'] for g in groups]==list(range(101,201)),'Frozen ordering drift')
    V.require(all(g['microBatchWithinCheckpoint']==(g['authoringOrder']-101)//20+1 for g in groups),'Micro membership drift')
    manifest = V.load(PARENT/'manifest.json')
    V.require(manifest['fingerprint']==PARENT_FP,'Wrong final parent')
    for name,h in manifest['artifactHashes'].items():
        V.require(V.sha((PARENT/name).read_bytes())==h,'Parent artifact drift: '+name)
    parent = V.load(PARENT/'cumulative-effective-draft-projection.json')
    authored = {r['candidateGroupKey'] for r in parent['records']}
    V.require(len(parent['records'])==1666 and len(authored)==1120,'Parent accounting drift')
    V.require(authored.isdisjoint(g['candidateGroupKey'] for g in groups),'Previously authored overlap')
    V.inputs()
    return groups,parent


def evidence(group):
    sources=V.inputs()[3]
    return [{'reference':ref,'sourceFields':sources[ref['corpus']][ref['recordIndex']]['sourceFields'],
             'candidateSourceSenseGroups':sources[ref['corpus']][ref['recordIndex']]['candidateSourceSenseGroups']}
            for ref in group['sourceEvidence']]


def plan(number):
    groups=selection()[0][(number-1)*20:number*20]
    path=CP/f'planning/micro-{number:02d}-decisions.psv'
    data=path.read_bytes();V.require(b'\r' not in data,'Planning requires UTF-8 LF')
    decisions={}
    for line in data.decode('utf-8').splitlines():
        fields=line.split('|');V.require(len(fields)==6,'Planning requires six fields')
        word,slugs,meanings,construction,classification,rationale=fields
        V.require(word not in decisions and len(rationale)>=50,'Duplicate/insubstantial planning')
        V.require(classification in {'A','B','C','D','E','A+C'},'Unknown distinction category')
        decisions[word]=(slugs.split(','),meanings.split('~'),construction,classification,rationale)
    V.require(set(decisions)=={g['normalizedHeadword'] for g in groups},'Planning coverage mismatch')
    entries=[]
    for group in groups:
        slugs,meanings,construction,classification,rationale=decisions[group['normalizedHeadword']]
        V.require(len(slugs)==len(set(slugs))==len(meanings),'Planning boundary/meaning count mismatch')
        entries.append({'candidateGroupKey':group['candidateGroupKey'],'normalizedHeadword':group['normalizedHeadword'],
                        'sourceReferences':group['sourceEvidence'],'sourceEvidence':evidence(group),
                        'proposedPOS':group['normalizedPosCandidates'],'sourceSupportedMeaningCandidates':meanings,
                        'constructionCandidates':construction.split(';'),'distinctionClass':classification,
                        'proposedSenseBoundaries':slugs,'proposedNumberOfSenses':len(slugs),
                        'ambiguityRiskFlags':['IDENTITY_UNRESOLVED','RIGHTS_UNKNOWN']+(['NUMBER_TAXONOMY_UNRESOLVED'] if 'NUMBER' in group['normalizedPosCandidates'] else []),
                        'rationaleVi':rationale,'missingSenseCandidates':[],'unresolvedBoundaryItems':[]})
    value={'microBatch':number,'parentFingerprint':PARENT_FP,'decisionManuscriptSha256':V.sha(data),'entries':entries,
           'authorship':'AUTHOR_A_AI_SOURCE_COVERAGE_PLANNING','sourceInventoryCount':9677}
    value['fingerprint']=V.digest(value)
    return value


def micro(number):
    groups=selection()[0][(number-1)*20:number*20]
    planning=plan(number);pp=CP/f'planning/micro-{number:02d}.json'
    V.require(pp.read_bytes()==V.encode(planning),'Planning drift')
    mp=CP/f'authored/micro-{number:02d}.psv';rp=CP/f'self-review/micro-{number:02d}.psv'
    rows=V.parse_manuscript(mp.read_bytes(),groups)
    expected={'EDITORIAL_2H2K:'+p['normalizedHeadword']+':'+slug for p in planning['entries'] for slug in p['proposedSenseBoundaries']}
    V.require(expected=={r['proposalKey'] for r in rows},'Manuscript differs from planned boundaries')
    qa=V.validate_reviews(rows,rp.read_bytes())
    ready=V.load(CP/f'planning/micro-{number:02d}-ready.json')
    V.require(ready=={'planningSha256':V.sha(pp.read_bytes()),'manuscriptAbsentWhenPlanningPersisted':True},'Missing planning-before-manuscript evidence')
    receipt={'microBatch':number,'parentFingerprint':PARENT_FP,'planningFingerprint':planning['fingerprint'],
             'planningSha256':V.sha(pp.read_bytes()),'manuscriptSha256':V.sha(mp.read_bytes()),'selfReviewSha256':V.sha(rp.read_bytes()),
             'recordHash':V.digest(rows),'reviewHash':V.digest(qa),'groupKeys':[g['candidateGroupKey'] for g in groups],
             'senseCount':len(rows),'qaCounts':dict(Counter(q['assessment'] for q in qa)),
             'sourceSimilarityFindings':V.copying_checks(rows,V.inputs()[3]),'status':'SEALED_AI_DRAFT_NOT_APPROVED'}
    receipt['fingerprint']=V.digest(receipt)
    return rows,qa,receipt


def revisions(rows):
    original=copy.deepcopy(rows);bykey={r['proposalKey']:r for r in rows};changes=[]
    paths=sorted((CP/'revisions').glob('corrections*.json'))
    if not paths:return rows,changes
    for change in [c for path in paths for c in V.load(path)['records']]:
        key=change['proposalKey'];V.require(key in bykey,'Unknown revision key');row=bykey[key]
        V.require(row['effectiveContentHash']==change['beforeContentHash'],'Revision parent hash mismatch')
        content=row['content'];field=change['field'];V.require(field in {'definitionEn','meaningVi','grammarNotesEn','exampleEn','exampleVi'},'Unsupported field revision')
        target=content['examples'][0] if field.startswith('example') else content
        name={'exampleEn':'en','exampleVi':'vi'}.get(field,field)
        V.require(target[name]==change['before'],'Revision BEFORE mismatch');target[name]=change['after']
        row['fieldHashes']={k:V.digest(v) for k,v in content.items()}
        row['effectiveContentHash']=V.digest({'proposalKey':key,'candidateGroupKey':row['candidateGroupKey'],'headword':row['headword'],'partOfSpeechProposal':row['partOfSpeech'],'content':content})
        V.require(row['effectiveContentHash']==change['afterContentHash'],'Revision AFTER hash mismatch');changes.append(change)
    V.require({r['proposalKey'] for r in original}==set(bykey),'Revision identity drift')
    return rows,changes


def independent(rows, original):
    results=[];pending=[]
    for n in range(1,6):
        path=CP/f'independent-review/micro-{n:02d}.json'
        if not path.exists():pending.append(n);continue
        review=V.load(path)
        V.require(review['reviewerKind']=='ISOLATED_AI_REVIEW_AGENT' and review['blindFirstPass'] is True,'Independent provenance invalid')
        results+=review['records']
    bykey={r['proposalKey']:r for r in original}
    V.require(len(results)==len({r['proposalKey'] for r in results}),'Duplicate independent review')
    for q in results:
        V.require(q['proposalKey'] in bykey and q['effectiveContentHash']==bykey[q['proposalKey']]['effectiveContentHash'],'Independent content hash mismatch')
        V.require(q['assessment'] in {'PASS','REVIEW','FAIL'} and len(q['explanationVi'])>=70 and isinstance(q['blocksPublication'],bool),'Invalid independent judgment')
    first=copy.deepcopy(results);effective={r['proposalKey']:r for r in rows};merged={q['proposalKey']:q for q in results}
    for path in sorted((CP/'independent-review').glob('recheck*.json')):
        recheck=V.load(path);V.require(recheck['reviewerKind']=='ISOLATED_AI_REVIEW_AGENT','Recheck provenance')
        seen=set()
        for q in recheck['records']:
            key=q['proposalKey'];V.require(key in effective and key not in seen and q['effectiveContentHash']==effective[key]['effectiveContentHash'],'Recheck hash/identity mismatch');seen.add(key)
            V.require(q['assessment'] in {'PASS','REVIEW','FAIL'} and isinstance(q['blocksPublication'],bool) and len(q['explanationVi'])>=70,'Invalid recheck verdict');merged[key]=q
    results=[merged[k] for k in sorted(merged)]
    complete=not pending and set(effective)==set(merged) and all(q['effectiveContentHash']==effective[q['proposalKey']]['effectiveContentHash'] for q in results)
    ready=complete and not any(q['assessment']=='FAIL' or q['blocksPublication'] for q in results)
    return {'status':'COMPLETE' if complete else 'INDEPENDENT_REVIEW_PENDING','records':results,'firstPassRecords':first,'pendingMicroBatches':pending,'publicationReady':ready}


def build():
    groups,parent=selection();rows=[];qa=[];receipts=[];planning=[]
    for n in range(1,6):
        seal=CP/f'micro-{n:02d}-seal.json'
        if not seal.exists():
            V.require(not any((CP/f'micro-{k:02d}-seal.json').exists() for k in range(n+1,6)),'Noncontiguous seals');break
        r,q,s=micro(n);V.require(seal.read_bytes()==V.encode(s),'Sealed bytes drift')
        rows+=r;qa+=q;receipts.append(s);planning+=plan(n)['entries']
    V.require(len(rows)==len({r['proposalKey'] for r in rows}),'Duplicate proposals')
    V.require({r['proposalKey'] for r in rows}.isdisjoint(r['proposalKey'] for r in parent['records']),'Parent proposal collision')
    original=copy.deepcopy(rows);rows,changes=revisions(rows)
    for q in qa:
        revised=next(r for r in rows if r['proposalKey']==q['proposalKey'])
        if q['reviewedContentHash']!=revised['effectiveContentHash']:
            q['originalReviewedContentHash']=q['reviewedContentHash'];q['reviewedContentHash']=revised['effectiveContentHash'];q['reviewedRecordSha256']=V.digest(revised)
            q['reviewExplanationVi']+=' Lớp sửa tiến tới đã được Author A đối chiếu BEFORE/AFTER theo finding độc lập; cần recheck riêng của Reviewer B.'
    review=independent(rows,original)
    counts={'microBatchesCompleted':len(receipts),'newAuthoredGroups':len({r['candidateGroupKey'] for r in rows}),
            'newSenses':len(rows),'multiSenseGroups':sum(c>1 for c in Counter(r['candidateGroupKey'] for r in rows).values()),
            'sourceMeaningCandidatesExamined':sum(len(p['sourceSupportedMeaningCandidates']) for p in planning),
            'missingSenseCandidates':sum(len(q.get('missingSenseCandidates',[])) for q in review['records']),
            'unresolvedBoundaryItems':sum(len(q.get('unresolvedBoundaryItems',[])) for q in review['records']),
            'cumulativeAuthoredGroups':1120+len({r['candidateGroupKey'] for r in rows}),
            'cumulativeDraftSenses':1666+len(rows),'remainingUnauthoredGroups':5023-len({r['candidateGroupKey'] for r in rows}),
            'selfReview':dict(Counter(q['assessment'] for q in qa)),'independentReview':dict(Counter(q['assessment'] for q in review['records']))}
    projection={**{k:v for k,v in parent.items() if k!='records'},'parentFingerprint':PARENT_FP,'inheritedRecordCount':1666,'newRecordCount':len(rows),'records':parent['records']+rows}
    V.require(projection['records'][:1666]==parent['records'],'Inherited record equality failed')
    artifacts={'cumulative-effective-draft-projection.json':projection,'new-sense-proposals.json':{'records':rows},'revision-evidence.json':{'records':changes},
               'self-review.json':{'records':qa},'independent-review.json':review,'source-coverage-ledger.json':{'entries':planning},
               'validation-summary.json':{'counts':counts,'sourceSimilarityFindings':[f for s in receipts for f in s['sourceSimilarityFindings']],
                 'crossSourceCopyingScreen':V.cross_source_copying(rows,V.inputs()[3]),'rights':V.RIGHTS,'canonicalIdsAllocated':0,'ownerApprovals':0,
                 'databaseAccess':'NONE','databaseWrites':'NONE','historicalDiagnostics':'Not rerun; historical fixtures unchanged',
                 'publicationReady':len(receipts)==5 and review['publicationReady']}}
    files={n:V.encode(a) for n,a in artifacts.items()}
    input_paths=[p for folder in ['planning','authored','self-review','handoff','independent-review','revisions'] for p in (CP/folder).glob('*') if p.is_file()]
    input_paths+=list(CP.glob('micro-*-seal.json'))
    manifest={'phase':'2H.2K','checkpoint':2,'parentFingerprint':PARENT_FP,'cohortFingerprint':V.frozen()['fingerprint'],
              'rawInputSha256':{str(p.relative_to(CP)).replace('\\','/'):V.sha(p.read_bytes()) for p in sorted(input_paths)},
              'counts':counts,'microBatchFingerprints':[s['fingerprint'] for s in receipts],
              'artifactHashes':{n:V.sha(b) for n,b in sorted(files.items())},'rights':V.RIGHTS,'contentStatus':'DRAFT',
              'publicationReady':artifacts['validation-summary.json']['publicationReady']}
    manifest['fingerprint']=V.digest(manifest);files['manifest.json']=V.encode(manifest)
    return files,manifest


def main():
    p=argparse.ArgumentParser(description=__doc__);m=p.add_mutually_exclusive_group(required=True)
    m.add_argument('--plan',type=int,choices=range(1,6));m.add_argument('--seal',type=int,choices=range(1,6))
    m.add_argument('--assemble',action='store_true');m.add_argument('--check',action='store_true');m.add_argument('--resume-status',action='store_true');a=p.parse_args()
    if a.plan:
        n=a.plan;V.require(not (CP/f'authored/micro-{n:02d}.psv').exists(),'Planning must precede manuscript')
        value=plan(n);pp=CP/f'planning/micro-{n:02d}.json';V.write_new(pp,V.encode(value))
        V.write_new(CP/f'planning/micro-{n:02d}-ready.json',V.encode({'planningSha256':V.sha(pp.read_bytes()),'manuscriptAbsentWhenPlanningPersisted':True}));print('PLANNED',n);return
    if a.seal:
        n=a.seal;V.require(n==1 or (CP/f'micro-{n-1:02d}-seal.json').exists(),'Previous seal missing')
        rows,qa,receipt=micro(n);V.cross_source_copying(rows,V.inputs()[3]);V.write_new(CP/f'micro-{n:02d}-seal.json',V.encode(receipt))
        V.write_new(CP/f'handoff/micro-{n:02d}.json',V.encode({'microBatch':n,'records':rows,'sourceEvidence':[{'group':g['normalizedHeadword'],'evidence':evidence(g)} for g in selection()[0][(n-1)*20:n*20]],'manuscriptSha256':receipt['manuscriptSha256'],'reviewInstruction':'Blind independent review before viewing Author A judgments; exact content hashes required'}));print('SEALED',n,len(rows));return
    files,manifest=build()
    if a.resume_status:print(json.dumps(manifest));return
    for name,data in files.items():
        if a.check:V.require((CP/'assembled'/name).read_bytes()==data,'Replay drift: '+name)
        else:V.write_new(CP/'assembled'/name,data)
    print(json.dumps({'fingerprint':manifest['fingerprint'],'counts':manifest['counts'],'publicationReady':manifest['publicationReady'],'zeroWrites':a.check}))


if __name__=='__main__':main()
