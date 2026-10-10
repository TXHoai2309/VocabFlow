#!/usr/bin/env python3
"""Additive checkpoint 04 using the published checkpoint 02 contracts."""
import copy
import importlib.util
import json
import subprocess
from collections import Counter
from functools import lru_cache
from pathlib import Path

ROOT=next(p for p in Path(__file__).resolve().parents if (p/'AGENTS.md').is_file())
spec=importlib.util.spec_from_file_location('checkpoint02',ROOT/'scripts/phase-2h2k-checkpoint-02.py')
C=importlib.util.module_from_spec(spec);spec.loader.exec_module(C)
V=C.V
CP=V.WS/'checkpoints/checkpoint-04'
BASE='1ab727a65322c63ab2d6d7786511522c06eb8846'
PARENT_FP='3c1aa8e8266e95810474408727412f96187e3649adb5132c9c35ae32dd448cf7'
PARENT=V.WS/'checkpoints/checkpoint-03/assembled'


@lru_cache(maxsize=1)
def selection():
    V.require(subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=ROOT,capture_output=True).returncode==0,'Baseline ancestry drift')
    cohort=V.frozen();groups=[g for g in cohort['groups'] if g['checkpoint']==4 and 301<=g['authoringOrder']<=400]
    V.require(cohort['fingerprint']=='f20e8c59d7b47cdf80f026d16acda8dbb283f948c8d5cb61cfef9c60cb7652c8','Frozen fingerprint drift')
    V.require(len(groups)==len({g['candidateGroupKey'] for g in groups})==100 and [g['authoringOrder'] for g in groups]==list(range(301,401)),'Frozen selection drift')
    V.require(all(g['microBatchWithinCheckpoint']==(g['authoringOrder']-301)//20+1 for g in groups),'Micro membership drift')
    m=V.load(PARENT/'manifest.json');V.require(m['fingerprint']==PARENT_FP==V.digest({k:v for k,v in m.items() if k!='fingerprint'}),'Parent manifest drift')
    for name,h in m['artifactHashes'].items():V.require(V.sha((PARENT/name).read_bytes())==h,'Parent artifact drift: '+name)
    previous=PARENT.parent
    for name,h in m['rawInputSha256'].items():V.require(V.sha((previous/name).read_bytes())==h,'Parent raw input drift: '+name)
    parent=V.load(PARENT/'cumulative-effective-draft-projection.json');records=parent['records'];authored={r['candidateGroupKey'] for r in records}
    V.require(len(records)==len({r['proposalKey'] for r in records})==1875 and len(authored)==1320,'Parent accounting drift')
    r1c=V.load(V.CP/'publication/reviewer-b-r1c/assembled/cumulative-effective-draft-projection.json')
    V.require(records[:1666]==r1c['records'],'Final R1C inheritance drift')
    cp2=V.load(V.WS/'checkpoints/checkpoint-02/assembled/cumulative-effective-draft-projection.json')
    V.require(records[:1770]==cp2['records'],'CP02 inheritance drift')
    V.require(authored.isdisjoint(g['candidateGroupKey'] for g in groups),'Previously authored overlap')
    V.inputs();return groups,parent


def validate_handoff(number, rows, seal):
    expected={'microBatch':number,'records':rows,
              'sourceEvidence':[{'group':g['normalizedHeadword'],'evidence':C.evidence(g)} for g in selection()[0][(number-1)*20:number*20]],
              'manuscriptSha256':seal['manuscriptSha256'],
              'reviewInstruction':'Blind independent review before viewing Author A judgments; exact content hashes required'}
    V.require((CP/f'handoff/micro-{number:02d}.json').read_bytes()==V.encode(expected),'Independent handoff source/content drift')


def boundary_evidence(planning, review):
    """Retain explicit pre-authoring source conflicts alongside immutable plans."""
    entries={p['candidateGroupKey']:p for p in planning};items=[]
    for path in sorted((CP/'planning').glob('boundary-review-*.json')):
        data=path.read_bytes();V.require(b'\r' not in data,'Boundary evidence requires UTF-8 LF')
        for item in json.loads(data.decode('utf-8'))['records']:
            group=item['candidateGroupKey'];V.require(group in entries,'Unknown boundary group')
            entry=entries[group];keys={'EDITORIAL_2H2K:'+entry['normalizedHeadword']+':'+s for s in entry['proposedSenseBoundaries']}
            V.require(item['proposalKey'] in keys and item['assessment']=='REVIEW' and item['canonicalResolution']=='UNRESOLVED','Boundary identity/status drift')
            V.require(item['recordedBeforeManuscript'] is True and isinstance(item['missingSenseCandidate'],bool) and len(item['issueVi'])>=70,'Invalid boundary evidence')
            name,fragment=item['sourceEvidencePointer'].split('#/entries/')
            index=int(fragment.split('/')[0]);V.require(V.load(CP/'planning'/name)['entries'][index]['candidateGroupKey']==group,'Boundary source pointer mismatch')
            items.append(item)
    V.require(len(items)==len({i['proposalKey'] for i in items}),'Duplicate boundary record')
    missing={q['proposalKey'] for q in review['records'] if q.get('missingSenseCandidates')}
    boundaries={q['proposalKey'] for q in review['records'] if q.get('unresolvedBoundaryItems')}
    missing.update(i['proposalKey'] for i in items if i['missingSenseCandidate'])
    boundaries.update(i['proposalKey'] for i in items)
    return {'preAuthoringBoundaryReviews':items,'missingSenseCandidateProposalKeys':sorted(missing),
            'unresolvedBoundaryProposalKeys':sorted(boundaries),'countingUnit':'Unique authored proposal keys with retained candidate/boundary evidence; reviewer and planning duplicates counted once'}


def build():
    groups,parent=selection();rows=[];qa=[];seals=[];planning=[]
    for n in range(1,6):
        path=CP/f'micro-{n:02d}-seal.json'
        if not path.exists():
            V.require(not any((CP/f'micro-{k:02d}-seal.json').exists() for k in range(n+1,6)),'Noncontiguous seals');break
        r,q,s=C.micro(n);V.require(path.read_bytes()==V.encode(s),'Sealed bytes drift')
        validate_handoff(n,r,s)
        rows+=r;qa+=q;seals.append(s);planning+=C.plan(n)['entries']
    V.require(len(rows)==len({r['proposalKey'] for r in rows}),'Duplicate proposals')
    V.require({r['proposalKey'] for r in rows}.isdisjoint(r['proposalKey'] for r in parent['records']),'Parent proposal collision')
    original=copy.deepcopy(rows);rows,changes=C.revisions(rows);review=C.independent(rows,original)
    for q in qa:
        r=next(r for r in rows if r['proposalKey']==q['proposalKey'])
        if q['reviewedContentHash']!=r['effectiveContentHash']:
            q['originalReviewedContentHash']=q['reviewedContentHash'];q['reviewedContentHash']=r['effectiveContentHash'];q['reviewedRecordSha256']=V.digest(r)
            q['reviewExplanationVi']+=' Author A đã đối chiếu BEFORE/AFTER của revision; verdict độc lập cho hash mới được lưu riêng.'
    count=len({r['candidateGroupKey'] for r in rows});boundary=boundary_evidence(planning,review)
    counts={'microBatchesCompleted':len(seals),'newAuthoredGroups':count,'newSenses':len(rows),
            'multiSenseGroups':sum(n>1 for n in Counter(r['candidateGroupKey'] for r in rows).values()),
            'plannedSourceSupportedMeaningCandidates':sum(len(p['sourceSupportedMeaningCandidates']) for p in planning),
            'sourceMeaningCandidatesExamined':sum(len(p['sourceSupportedMeaningCandidates']) for p in planning)+len(boundary['missingSenseCandidateProposalKeys']),
            'missingSenseCandidates':len(boundary['missingSenseCandidateProposalKeys']),
            'unresolvedBoundaryItems':len(boundary['unresolvedBoundaryProposalKeys']),
            'cumulativeAuthoredGroups':1320+count,'cumulativeDraftSenses':1875+len(rows),'remainingUnauthoredGroups':4823-count,
            'selfReview':dict(Counter(q['assessment'] for q in qa)),'independentReview':dict(Counter(q['assessment'] for q in review['records']))}
    projection={**{k:v for k,v in parent.items() if k!='records'},'parentFingerprint':PARENT_FP,'inheritedRecordCount':1875,'newRecordCount':len(rows),'records':parent['records']+rows}
    V.require(projection['records'][:1875]==parent['records'],'Inherited content/hash inequality')
    artifacts={'cumulative-effective-draft-projection.json':projection,'new-sense-proposals.json':{'records':rows},'revision-evidence.json':{'records':changes},
               'self-review.json':{'records':qa},'independent-review.json':review,'source-coverage-ledger.json':{'entries':planning,**boundary},
               'validation-summary.json':{'counts':counts,'sourceSimilarityFindings':[f for s in seals for f in s['sourceSimilarityFindings']],
                 'crossSourceCopyingScreen':V.cross_source_copying(rows,V.inputs()[3]),'rights':V.RIGHTS,'canonicalIdsAllocated':0,'ownerApprovals':0,
                 'databaseAccess':'NONE','databaseWrites':'NONE','previousCheckpointReviewsPreserved':['CP01 seven findings and six deferred candidates','CP02 fifty and cathedral','CP03 four REVIEW findings, five boundaries and two deferred candidates'],
                 'meaningCandidateCountContract':'Planned source-supported meanings plus retained deferred candidate proposals, deduplicated across planning and independent review',
                 'publicationReady':len(seals)==5 and review['publicationReady']}}
    files={name:V.encode(a) for name,a in artifacts.items()}
    paths=[p for folder in ['planning','authored','self-review','handoff','independent-review','revisions','tooling'] for p in (CP/folder).glob('*') if p.is_file()]+list(CP.glob('micro-*-seal.json'))
    m={'phase':'2H.2K','checkpoint':4,'parentFingerprint':PARENT_FP,'cohortFingerprint':V.frozen()['fingerprint'],'counts':counts,
       'rawInputSha256':{str(p.relative_to(CP)).replace('\\','/'):V.sha(p.read_bytes()) for p in sorted(paths)},
       'microBatchFingerprints':[s['fingerprint'] for s in seals],'artifactHashes':{n:V.sha(b) for n,b in sorted(files.items())},
       'contentStatus':'DRAFT','rights':V.RIGHTS,'publicationReady':artifacts['validation-summary.json']['publicationReady']}
    m['fingerprint']=V.digest(m);files['manifest.json']=V.encode(m);return files,m


C.CP=CP;C.PARENT_FP=PARENT_FP;C.selection=selection;C.build=build

if __name__=='__main__':C.main()
