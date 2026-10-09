#!/usr/bin/env python3
"""Offline checkpoint 03: immutable parents, persisted assessments, additive views."""
import argparse
import importlib.util
from collections import Counter
from pathlib import Path

spec=importlib.util.spec_from_file_location('checkpoint02',Path(__file__).with_name('phase-2h2i-aggregate-qa-resume.py'))
p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
a=p.a
ROOT=p.ROOT;PARENT=p.WS
WS=PARENT.parent/'checkpoint-03'
PIN='7d462d7bfb2f957c4c1809de18a22a126b8f85194763f90d863551edb15be34d'
BASELINE='29a84a268606a4a816c45008e4605da55db803b4'
load,encode,sha,require,digest=p.load,p.encode,p.sha,p.require,p.digest
ref=p.reference


def parents():
    require(p.run(True)['fingerprint']==PIN,'Checkpoint 02 fingerprint drift')
    index=a.unique(load(a.WS/'effective-sense-index.json')['records'],'proposalKey')
    reviews=load(PARENT/'review-triage-cumulative.json')['records']
    coverage=load(PARENT/'coverage-audit-cumulative.json')['groups']
    grammar=load(PARENT/'grammar-commentary-audit.json')
    require(len(index)==1563 and len(reviews)==187 and len(coverage)==500,'Inventory drift')
    require(sum(r['status']=='TRIAGED' for r in reviews)==65 and sum(r['status']=='ASSESSED' for r in coverage)==92,'Completion drift')
    require(len(grammar['pendingDedicatedInspectionKeys'])==75,'Grammar pending drift')
    return index,reviews,coverage,grammar


def source_batches(index):
    bases=[ROOT/'vocabflow-dataset/workspaces'/n for n in ['master-editorial-draft-pilot','master-editorial-stratified-120','master-editorial-bulk-300','master-editorial-bulk-500']]
    bases += [ROOT/f'vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-0{n}' for n in range(2,6)]
    batches={};bykey={}
    for base in bases:
        path=base/('pilot-sense-proposals.json' if base.name=='master-editorial-draft-pilot' else 'sense-proposals.json')
        obj=load(path);rows=obj.get('senseProposals',obj.get('senses'))
        for row in rows:
            key=row['proposalKey']
            if key not in index:continue
            manuscript=base/row['authoredSource']['path'];name=manuscript.relative_to(ROOT).as_posix()
            if name not in batches:batches[name]={'path':name,'sha256':sha(manuscript),'sourceArtifact':ref(path),'inspectionKeys':[],'effectiveContentHashes':{}}
            batches[name]['inspectionKeys'].append(key);batches[name]['effectiveContentHashes'][key]=index[key]['effectiveContentHash'];bykey[key]=name
    return batches,bykey


def selection(index,reviews,coverage,grammar):
    original_reviews=load(a.WS/'review-triage.json')['records']
    review_scope=[{'inventoryOrdinal':i,'proposalKey':r['proposalKey'],'effectiveContentHash':r['effectiveContentHash']} for i,r in enumerate(reviews) if r['status']=='PENDING'][:40]
    original_coverage=load(a.WS/'sense-coverage-audit.json')['groups']
    pending=[(i,r) for i,r in enumerate(coverage) if r['status']=='PENDING']
    pending.sort(key=lambda ir:(not bool(ir[1]['originalWarnings']),-len(original_coverage[ir[0]]['originalWarningRecord']['missingOrdinals']),-len(original_coverage[ir[0]]['originalWarningRecord']['missingOrConflictingPos']),ir[0]))
    coverage_scope=[{'originalGroupOrdinal':i,'candidateGroupKey':r['candidateGroupKey'],'originalWarnings':r['originalWarnings'],
                     'effectiveContentHashes':{k:v['effectiveContentHash'] for k,v in index.items() if v['candidateGroupKey']==r['candidateGroupKey']}} for i,r in pending[:75]]
    batches,bykey=source_batches(index);remaining=set(grammar['pendingDedicatedInspectionKeys'])
    candidates={r['proposalKey']:r for r in grammar['candidates']+grammar['extendedCandidates']}
    ranked=[]
    for name,batch in batches.items():
        keys=[k for k in batch['inspectionKeys'] if k in remaining]
        if keys:ranked.append((name,keys,max(len(candidates[k]['matchedPatterns']) for k in keys)))
    # Concentrate actual inspection in affected batches, favoring repeated pattern risk.
    ranked.sort(key=lambda item:(-len(item[1]),-item[2],item[0]))
    selected=[];seed=[]
    for name,keys,score in ranked:
        selected.append(batches[name]);seed+=keys
        if len(seed)>=25:break
    require(len(set(seed))>=25,'Insufficient uninspected grammar scope')
    return {'phase':'2H.2I-R2','checkpointNumber':3,'parentFingerprint':PIN,'remoteBaseline':BASELINE,
            'reviewRule':'NEXT_40_ORIGINAL_PENDING_ORDER','reviews':review_scope,
            'coverageRule':'ORIGINAL_WARNINGS_FIRST; MISSING_ORDINAL_COUNT_DESC; SOURCE_POS_CONFLICT_COUNT_DESC; ORIGINAL_ORDER','coverage':coverage_scope,
            'grammarRule':'PENDING_CANDIDATE_COUNT_PER_ORIGINAL_BATCH_DESC; MAX_PATTERN_MATCH_COUNT_DESC; MANUSCRIPT_PATH_ASC; COMPLETE_BATCHES_UNTIL_AT_LEAST_25_NEW_CANDIDATES',
            'grammarCandidateKeys':seed,'grammarBatches':selected,'grammarInspectionKeys':list(dict.fromkeys(k for b in selected for k in b['inspectionKeys'])),
            'linguisticDecisionsGenerated':False}


def prepare():
    inputs=parents();receipt=selection(*inputs)
    paths=[ROOT/'scripts/phase-2h2i-aggregate-qa-resume.py',ROOT/'scripts/phase-2h2i-aggregate-qa-resume-test.py']+[x for x in PARENT.rglob('*') if x.is_file()]
    inherited=load(PARENT/'accepted-parent-pins.json')
    pins={'parentFingerprint':PIN,'inheritedPinsReference':ref(PARENT/'accepted-parent-pins.json'),
          'additiveParentFiles':{x.relative_to(ROOT).as_posix():sha(x) for x in sorted(paths)},'previousFileCount':inherited['previousFileCount']+len(paths)}
    (WS/'authored').mkdir(parents=True,exist_ok=True)
    for name,obj in [('resume-selection-receipt.json',receipt),('accepted-parent-pins.json',pins)]:
        path=WS/name;data=encode(obj).encode('utf8')
        if path.exists():require(path.read_bytes()==data,'Immutable prepared selection drift')
        else:path.write_bytes(data)
    return receipt


NAMES=['review-decisions-batch-003.json','coverage-decisions-batch-003.json',
       'grammar-inspection-batch-003.json','new-correction-proposals.json']
REVIEW_CLASSES={'HEURISTIC_SIGNAL_ONLY','SOURCE_ORIGINALITY_UNCERTAIN',
                'NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI','SENSE_BOUNDARY_UNCERTAIN','SOURCE_POS_CONFLICT'}
COVERAGE_CLASSES={'CONFIRMED_GAP','POSSIBLE_GAP','SOURCE_METADATA_CONFLICT',
                  'COVERAGE_UNKNOWN','NO_IDENTIFIED_SOURCE_SUPPORTED_GAP'}
GRAMMAR_CLASSES={'CONFIRMED_PROCESS_COMMENTARY','POSSIBLE_PROCESS_COMMENTARY',
                 'VALID_LEARNER_GRAMMAR_NOTE','INSUFFICIENT_CONTEXT'}


def previous_proposals():
    original=load(a.WS/'correction-proposals.json')
    additions=load(PARENT/'authored/new-correction-proposals.json')
    fields=original['records']+additions['records']
    boundaries=original['additionalBoundaryProposals']+additions['additionalBoundaryProposals']
    require(len(fields)==30 and len(boundaries)==7,'Previous proposal counts drift')
    return fields,boundaries


def validate_decisions(index,receipt,review,coverage,grammar,proposals):
    rd=a.unique(review['records'],'proposalKey')
    require(list(rd)==[r['proposalKey'] for r in receipt['reviews']], 'Review scope/order drift')
    for chosen,row in zip(receipt['reviews'],rd.values()):
        a.check_bound(row,index)
        require(row['inventoryOrdinal']==chosen['inventoryOrdinal'] and row['status']=='TRIAGED','Review identity/status drift')
        require(row['categories'] and set(row['categories'])<=REVIEW_CLASSES,'Invalid review classification')
        require(row['explanationVi'] and row['nextActionVi'] and row['severity'] and row['priority'] in {'P0','P1','P2','P3'},'Missing review reasoning')
        require(not row.get('humanApproval') and not row.get('ownerApproval') and row['rights']=='UNKNOWN_REVIEW_REQUIRED','Unauthorized review approval')
        q=index[row['proposalKey']]
        require(row['earlierOverlayEvidence']==[{'path':x['path'],'sha256':x['sha256'],'jsonPointer':x['jsonPointer']} for x in q['pinnedCorrectionLineage']], 'Review overlay evidence drift')
    cd=a.unique(coverage['records'],'candidateGroupKey')
    require(list(cd)==[r['candidateGroupKey'] for r in receipt['coverage']], 'Coverage scope/order drift')
    for chosen,row in zip(receipt['coverage'],cd.values()):
        require(row['effectiveContentHashes']==chosen['effectiveContentHashes'],'Coverage content hash drift')
        require(row['originalGroupOrdinal']==chosen['originalGroupOrdinal'] and row['originalWarnings']==chosen['originalWarnings'],'Coverage historical identity drift')
        require(row['inspectedProposalKeys']==list(chosen['effectiveContentHashes']),'Coverage missing Sense inspection')
        senses=[q for q in index.values() if q['candidateGroupKey']==row['candidateGroupKey']]
        require(row['sourceEvidence']==[q['sourceEvidence'] for q in senses],'Coverage source evidence drift')
        require(row['classification'] in COVERAGE_CLASSES and row['status']=='ASSESSED' and row['explanationVi'] and row['nextActionVi'] and row['limitationsVi'],'Missing coverage assessment')
        require(row['exhaustiveLexicalCoverage'] is False and row['ownerApproval'] is False and row['rights']=='UNKNOWN_REVIEW_REQUIRED','Unauthorized coverage claim')
    batches=receipt['grammarBatches']
    require(grammar['completeBatches']==batches and grammar['newCandidateKeys']==receipt['grammarCandidateKeys'],'Grammar receipt scope drift')
    gr=a.unique(grammar['records'],'proposalKey')
    require(list(gr)==receipt['grammarInspectionKeys'],'Complete batch inspections missing')
    known,_=previous_proposals();known_keys={q['proposalKey']:q['correctionProposalId'] for q in known}
    actual_batches,_=source_batches(index)
    for batch in batches:
        name=batch['path'];path=ROOT/name
        require(path.resolve().is_relative_to(ROOT.resolve()),'Unsafe manuscript path')
        require(batch==actual_batches[name] and sha(path)==batch['sha256'],'Authored batch membership/hash drift')
    for row in gr.values():
        a.check_bound(row,index);q=index[row['proposalKey']]
        require(row['grammarNoteSha256']==a.text_sha(q['content']['grammarNotesEn']),'Grammar field hash drift')
        require(set(row['inspectedFields'])==set(q['content']),'Incomplete grammar content inspection')
        require(row['sourceEvidence']==q['sourceEvidence'],'Grammar source evidence drift')
        require(row['priorCorrectionEvidence']==[{'path':x['path'],'sha256':x['sha256'],'jsonPointer':x['jsonPointer']} for x in q['pinnedCorrectionLineage']],'Grammar correction history drift')
        require(row['priorProposalId']==known_keys.get(row['proposalKey']),'Prior proposal evidence drift')
        require(row['classification'] in GRAMMAR_CLASSES and row['explanationVi'] and row['ownerApproval'] is False,'Invalid grammar decision')
    ids={q['correctionProposalId'] for q in known};keys=set()
    for q in proposals['records']:
        a.validate_proposal(q,index)
        require(q['correctionProposalId'] not in ids and q['proposalKey'] not in known_keys and q['proposalKey'] not in keys,'Duplicate correction proposal')
        ids.add(q['correctionProposalId']);keys.add(q['proposalKey'])
        require(gr[q['proposalKey']]['classification']=='CONFIRMED_PROCESS_COMMENTARY','Unconfirmed correction')
        require(q['rationaleVi'] and q['relatedFieldImpact'] and q['evidenceScope'],'Missing proposal reasoning')
    expected={k for k,v in gr.items() if v['classification']=='CONFIRMED_PROCESS_COMMENTARY' and k not in known_keys}
    require(keys==expected,'New confirmed commentary missing proposal')
    # This bounded inspection confirmed no new source-supported boundary. Uncertain
    # gaps remain in coverage and remediation, never allocated or auto-promoted.
    require(not proposals['additionalBoundaryProposals'],'No confirmed new boundary assessment')
    require(not any(r['classification']=='CONFIRMED_GAP' for r in cd.values()),'Confirmed gap requires a separately authored supported boundary')
    return rd,cd,gr,batches


def assemble():
    index,reviews,coverage,grammar=parents()
    pins=load(WS/'accepted-parent-pins.json')
    require(pins['parentFingerprint']==PIN,'Parent fingerprint drift')
    require(pins['inheritedPinsReference']==ref(PARENT/'accepted-parent-pins.json'),'Inherited pin evidence drift')
    a.validate_pins(pins['additiveParentFiles'])
    expected_paths=[ROOT/'scripts/phase-2h2i-aggregate-qa-resume.py',ROOT/'scripts/phase-2h2i-aggregate-qa-resume-test.py']+[x for x in PARENT.rglob('*') if x.is_file()]
    require(pins['additiveParentFiles']=={x.relative_to(ROOT).as_posix():sha(x) for x in sorted(expected_paths)} and pins['previousFileCount']==6939,'Parent pin completeness drift')
    receipt=load(WS/'resume-selection-receipt.json')
    require(receipt==selection(index,reviews,coverage,grammar),'Prepared selection drift')
    authored=[load(WS/'authored'/n) for n in NAMES]
    rd,cd,gr,batches=validate_decisions(index,receipt,*authored)
    rrows=[];crows=[]
    for i,row in enumerate(reviews):
        key=row['proposalKey'];new=key in rd
        rrows.append(dict(row,parentRecord=ref(PARENT/'review-triage-cumulative.json',f'/records/{i}'),
                          status='TRIAGED' if new else row['status'],
                          newDecision=ref(WS/'authored'/NAMES[0],f'/records/{list(rd).index(key)}') if new else row['newDecision']))
    for i,row in enumerate(coverage):
        key=row['candidateGroupKey'];new=key in cd
        crows.append(dict(row,parentRecord=ref(PARENT/'coverage-audit-cumulative.json',f'/groups/{i}'),
                          status='ASSESSED' if new else row['status'],
                          newDecision=ref(WS/'authored'/NAMES[1],f'/records/{list(cd).index(key)}') if new else row['newDecision']))
    new_keys=set(grammar['pendingDedicatedInspectionKeys'])&set(gr)
    require(new_keys==set(receipt['grammarCandidateKeys']),'New dedicated candidate count drift')
    pending=sorted(set(grammar['pendingDedicatedInspectionKeys'])-new_keys)
    old_fields,old_boundaries=previous_proposals()
    summary={'phase':'2H.2I-R2','status':'PARTIAL','boundedTargetsCompleted':True,
        'totalCorpusSenses':1563,'totalCorpusGroups':1020,'frozenCohortGroups':500,'frozenCohortSenses':750,
        'originalReviewRecords':187,'previousReviewTriaged':65,'newReviewTriaged':len(rd),'cumulativeReviewTriaged':65+len(rd),'reviewPending':122-len(rd),
        'previousCoverageAssessed':92,'newCoverageAssessed':len(cd),'cumulativeCoverageAssessed':92+len(cd),'coveragePending':408-len(cd),
        'originalCoverageWarningGroups':126,'pendingOriginalWarningGroups':sum(bool(r['originalWarnings']) and r['status']=='PENDING' for r in crows),
        'newCoverageClassifications':dict(Counter(r['classification'] for r in cd.values())),
        'dedicatedGrammarCandidates':107,'previousGrammarCandidatesInspected':32,'newGrammarCandidatesInspected':len(new_keys),'grammarCandidatesPending':len(pending),
        'grammarInspections':len(gr),'completeAffectedBatches':len(batches),'grammarClassifications':dict(Counter(r['classification'] for r in gr.values())),
        'newConfirmedContentDefects':len(authored[3]['records']),'newConfirmedCoverageGaps':0,
        'newPossibleCoverageGaps':sum(r['classification']=='POSSIBLE_GAP' for r in cd.values()),
        'newFieldProposals':len(authored[3]['records']),'newBoundaryProposals':0,'parentFieldProposalsPreserved':30,'parentBoundaryProposalsPreserved':7,
        'totalFieldProposals':30+len(authored[3]['records']),'totalBoundaryProposals':7,'previousPinnedFilesUnchanged':6939,
        'authorization':a.AUTH,'linguisticDecisionsGeneratedDuringAssembly':False,
        'verificationCommands':'External commands are recorded separately in verification-results.json; they are not executed by this generator'}
    require(sum(bool(r['originalWarnings']) for r in crows)==126,'Historical warning identities lost')
    queue=[]
    for row in rd.values():
        if set(row['categories'])&{'SOURCE_POS_CONFLICT','SENSE_BOUNDARY_UNCERTAIN','SOURCE_ORIGINALITY_UNCERTAIN'}:
            queue.append({'identity':row['proposalKey'],'effectiveContentHash':row['effectiveContentHash'],'categories':row['categories'],
                          'priority':row['priority'],'severity':row['severity'],'rationaleVi':row['explanationVi'],'nextActionVi':row['nextActionVi'],
                          'historicalStatus':'REVIEW','ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    for row in cd.values():
        if row['classification']!='NO_IDENTIFIED_SOURCE_SUPPORTED_GAP':
            queue.append({'identity':row['candidateGroupKey'],'contentHashes':row['effectiveContentHashes'],'classification':row['classification'],
                          'priority':'P2','rationaleVi':row['explanationVi'],'nextActionVi':row['nextActionVi'],
                          'ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    for q in authored[3]['records']:
        queue.append({'identity':q['correctionProposalId'],'proposalKey':q['proposalKey'],'parentHash':q['originalEffectiveContentHash'],
                      'priority':'P3','severity':q['severity'],'rationaleVi':q['rationaleVi'],
                      'nextActionVi':'Rà soát bản thay grammarNotesEn đã đề xuất; review lại toàn batch trước bất kỳ lượt áp dụng được phép riêng.',
                      'applied':False,'ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    objects={
        'review-triage-cumulative.json':{'parentFingerprint':PIN,'records':rrows,'newDecisions':ref(WS/'authored'/NAMES[0])},
        'coverage-audit-cumulative.json':{'parentFingerprint':PIN,'groups':crows,'newDecisions':ref(WS/'authored'/NAMES[1]),'exhaustiveLexicalCoverage':False},
        'grammar-commentary-audit.json':{'candidateInventoryReference':ref(PARENT/'grammar-commentary-audit.json'),
            'candidateInventoryUnchanged':True,'dedicatedCandidateCount':107,'previousDedicatedCount':32,'newDedicatedCandidateKeys':sorted(new_keys),
            'actualInspections':ref(WS/'authored'/NAMES[2]),'completeBatches':batches,'pendingDedicatedInspectionKeys':pending,
            'parentDedicatedInspectionEvidence':[ref(PARENT/'grammar-commentary-audit.json'),ref(PARENT/'authored/expanded-grammar-inspections.json')],
            'classificationCounts':summary['grammarClassifications'],'statisticalPrevalenceClaimed':False,
            'additionalConfirmedNoncandidateKeys':sorted(k for k,v in gr.items() if v['classification']=='CONFIRMED_PROCESS_COMMENTARY' and k not in {r['proposalKey'] for r in grammar['candidates']+grammar['extendedCandidates']}),
            'inventoryPolicy':'Full-batch inspection can find defects outside the accepted keyword inventory; such findings do not silently expand or rewrite its 107 identities.'},
        'correction-proposals-additive.json':{'parentProposals':ref(PARENT/'correction-proposals-additive.json'),
            'parentFieldCount':30,'parentBoundaryCount':7,'newProposals':ref(WS/'authored'/NAMES[3]),'correctionsApplied':0},
        'prioritized-remediation-queue.json':{'parentQueue':ref(PARENT/'prioritized-remediation-queue.json'),'newItems':queue},
        'validation-summary.json':summary}
    lines=['# Phase 2H.2I-R2 — additive checkpoint 03','',
           'Status: PARTIAL at aggregate scope; all bounded checkpoint targets completed. Audit only: existing learner content remains DRAFT and unchanged.', '',
           f'Parent checkpoint 02: `{PIN}`. Original aggregate: `3d29083983cf033b4463d33c7a8ea3bd9337c209e0a5f236167c116a0852b5ce`. Remote parent: `{BASELINE}`.', '',
           f'REVIEW: 65 + {len(rd)} = {65+len(rd)} triaged; {122-len(rd)} pending of 187. Historical REVIEW never becomes PASS.',
           f'Coverage: 92 + {len(cd)} = {92+len(cd)} assessed; {408-len(cd)} pending of 500. All 126 warning identities retained; {summary["pendingOriginalWarningGroups"]} original warning groups remain pending.',
           f'Coverage findings: {encode(summary["newCoverageClassifications"]).strip()}. No exhaustive lexical completeness claim; no confirmed new boundary and no canonical IDs.',
           f'Grammar: {len(gr)} current Sense inspections across {len(batches)} complete pilot batches; {len(new_keys)} previously uninspected candidates, 32 previous + {len(new_keys)} new = {32+len(new_keys)} of 107; {len(pending)} pending.',
           f'Grammar classifications: {encode(summary["grammarClassifications"]).strip()}. {len(authored[3]["records"])} new exact grammar field proposals; existing 30 field and 7 boundary proposals retained unchanged through versioned references.',
           'This is a purposive full-batch inspection, not a prevalence estimate. Reinspected records and previously proposed fields do not count as new dedicated candidates or duplicate proposals. Two possible disclaimer notes remain uncertain; no automatic deletion.', '',
           'All 6939 accepted source/code/data files are pinned unchanged, including parent scripts, calibration, older QA decisions, overlays and original authoring checkpoints. 1563 effective Senses / 1020 corpus groups and 500-cohort / 750 Senses remain unchanged.', '',
           '## New REVIEW decisions','']
    lines += [f'- `{k}` — {", ".join(v["categories"])}: {v["explanationVi"]} Next: {v["nextActionVi"]}' for k,v in rd.items()]
    lines += ['', '## Coverage decisions','']+[f'- `{k}` — {v["classification"]}: {v["explanationVi"]}' for k,v in cd.items()]
    lines += ['', '## Exact proposed grammar replacements — unapplied','']
    for q in authored[3]['records']:
        lines += [f'### {q["correctionProposalId"]}: {q["proposalKey"]}','',f'BEFORE: {q["before"]}','',f'AFTER: {q["after"]}','',q['rationaleVi'],'']
    lines += ['## Handoff','',
              f'Pending REVIEW identities: {encode([r["proposalKey"] for r in rrows if r["status"]=="PENDING"]).strip()}',
              f'Pending coverage identities: {encode([r["candidateGroupKey"] for r in crows if r["status"]=="PENDING"]).strip()}',
              f'Pending dedicated grammar identities: {encode(pending).strip()}', '',
              'Next authorized continuation must read this checkpoint and parent evidence, deterministically select remaining identities, inspect actual content and source metadata, persist original Vietnamese decisions before assembly, and replay accepted checkpoints. No next checkpoint is created here.', '',
              'Verification-results.json records actual external commands independently of the fingerprint. Generator validation only checks persisted contracts. Canonical pnpm remains NOT_RUN unless separately executed; direct Node validation does not repair its documented limitation.', '',
              'Rights UNKNOWN_REVIEW_REQUIRED; owner approvals 0; canonical IDs 0; corrections applied 0; database access/writes NONE; Production UNTOUCHED; Master/legacy unchanged. Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses.',
              'STOP after publication. Do not apply corrections, start approval, rights clearance, another cohort or database import.', '']
    report='\n'.join(lines)
    manifest={'phase':'2H.2I-R2','checkpointNumber':3,'parentFingerprint':PIN,'remoteBaseline':BASELINE,
              'originalAggregateFingerprint':p.PIN,'frozenCheckpoint05':a.CP_PIN,'acceptedPins':ref(WS/'accepted-parent-pins.json'),
              'selection':ref(WS/'resume-selection-receipt.json'),'authoredHashes':{n:sha(WS/'authored'/n) for n in NAMES},
              'sourceHashes':{n:sha(ROOT/'scripts'/n) for n in ['phase-2h2i-aggregate-qa-checkpoint-03.py','phase-2h2i-aggregate-qa-checkpoint-03-test.py']},
              'artifactHashes':{n:a.text_sha(encode(v)) for n,v in objects.items()},'reportSha256':a.text_sha(report),'authorization':a.AUTH}
    manifest['fingerprint']=digest(manifest);objects['manifest.json']=manifest
    return {n:encode(v).encode('utf8') for n,v in objects.items()}|{'report.md':report.encode('utf8')}


def run(check=False):
    outputs=assemble()
    for name,data in outputs.items():
        path=WS/name
        if check:require(path.is_file() and path.read_bytes()==data,'Checkpoint output drift: '+name)
        else:
            require(path.resolve().is_relative_to(WS.resolve()),'Unsafe output path')
            # Published snapshots may only be replayed, never rewritten.
            require(not path.exists() or path.read_bytes()==data,'Existing checkpoint differs: '+name)
            if not path.exists():path.write_bytes(data)
    return {'fingerprint':load(WS/'manifest.json')['fingerprint'],'zeroWrites':check,'status':'PARTIAL','boundedTargetsCompleted':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checkpoint',type=int,choices=[3],default=3)
    modes=parser.add_mutually_exclusive_group();modes.add_argument('--prepare',action='store_true');modes.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.prepare:
        r=prepare();print('PREPARED',len(r['reviews']),len(r['coverage']),len(r['grammarCandidateKeys']),len(r['grammarInspectionKeys']),len(r['grammarBatches']))
    else:print(encode(run(args.check)))


if __name__=='__main__':main()
