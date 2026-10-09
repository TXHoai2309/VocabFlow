#!/usr/bin/env python3
"""Offline Phase 2H.2I checkpoint 04; selections and authored findings are additive."""
import argparse
import importlib.util
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

spec=importlib.util.spec_from_file_location('checkpoint03',Path(__file__).with_name('phase-2h2i-aggregate-qa-checkpoint-03.py'))
c3=importlib.util.module_from_spec(spec);spec.loader.exec_module(c3)
p=c3.p;a=c3.a
ROOT=c3.ROOT;CP03=c3.WS;WS=CP03.parent/'checkpoint-04'
PIN='d5e87509822821b74b0588a5d99f2168a5db47c59299192d540ace84315b0b71'
BASELINE='09e0c4b684f2f81028680d5a78ad5bd680224a7b'
load,encode,sha,require,digest=p.load,p.encode,p.sha,p.require,p.digest
ref=p.reference
DOCS=['docs/ai-progress.md','docs/changelog.md','docs/stories/US-45-master-vocabulary-v2-runtime-import-bridge.md']
NAMES=['review-decisions-batch-004.json','coverage-decisions-batch-004.json',
       'grammar-inspection-batch-004.json','new-correction-proposals.json']
REVIEW_CLASSES={'HEURISTIC_SIGNAL_ONLY','SOURCE_ORIGINALITY_UNCERTAIN','NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI','SENSE_BOUNDARY_UNCERTAIN','SOURCE_POS_CONFLICT'}
COVERAGE_CLASSES={'CONFIRMED_GAP','POSSIBLE_GAP','SOURCE_METADATA_CONFLICT','COVERAGE_UNKNOWN','NO_IDENTIFIED_SOURCE_SUPPORTED_GAP'}
GRAMMAR_CLASSES={'CONFIRMED_PROCESS_COMMENTARY','POSSIBLE_PROCESS_COMMENTARY','VALID_LEARNER_GRAMMAR_NOTE','INSUFFICIENT_CONTEXT'}


def parents():
    require(c3.run(True)['fingerprint']==PIN,'Accepted checkpoint 03 drift')
    manifest=load(CP03/'manifest.json')
    require(manifest['fingerprint']==PIN and manifest['originalAggregateFingerprint']==p.PIN and manifest['parentFingerprint']==c3.PIN,'Checkpoint lineage drift')
    index=a.unique(load(a.WS/'effective-sense-index.json')['records'],'proposalKey')
    reviews=load(CP03/'review-triage-cumulative.json')['records']
    coverage=load(CP03/'coverage-audit-cumulative.json')['groups']
    grammar=load(CP03/'grammar-commentary-audit.json')
    require(len(index)==1563 and len(reviews)==187 and len(coverage)==500,'Current corpus inventory drift')
    require(sum(r['status']=='TRIAGED' for r in reviews)==105 and sum(r['status']=='ASSESSED' for r in coverage)==167,'Checkpoint 03 cumulative counts drift')
    require(len(grammar['pendingDedicatedInspectionKeys'])==49 and grammar['candidateInventoryUnchanged'] is True,'Grammar candidate inventory drift')
    return index,reviews,coverage,grammar


def selection(index,reviews,coverage,grammar):
    original_reviews=load(a.WS/'review-triage.json')['records']
    by_review={r['proposalKey']:r for r in reviews}
    scope=[]
    for original in original_reviews:
        key=original['originalReview']['record']['proposalKey']
        current=by_review[key]
        if current['status']=='PENDING':
            scope.append({'inventoryOrdinal':original['inventoryOrdinal'],'proposalKey':key,'effectiveContentHash':index[key]['effectiveContentHash']})
    scope=scope[:40]
    original_coverage=load(a.WS/'sense-coverage-audit.json')['groups']
    by_coverage={r['candidateGroupKey']:r for r in coverage}
    cov=[]
    for ordinal,original in enumerate(original_coverage):
        current=by_coverage[original['candidateGroupKey']]
        if current['status']!='PENDING':continue
        key=current['candidateGroupKey']
        cov.append({'originalGroupOrdinal':ordinal,'candidateGroupKey':key,
                    'originalWarnings':original['originalWarningRecord']['warnings'],
                    'effectiveContentHashes':{k:v['effectiveContentHash'] for k,v in index.items() if v['candidateGroupKey']==key}})
        if len(cov)==75:break
    batches,bykey=c3.source_batches(index)
    pending=set(grammar['pendingDedicatedInspectionKeys'])
    candidate_inventory=load(p.WS/'grammar-commentary-audit.json')
    candidate_map={r['proposalKey']:r for r in candidate_inventory['candidates']+candidate_inventory['extendedCandidates']}
    ranked=[]
    for name,batch in batches.items():
        keys=[k for k in batch['inspectionKeys'] if k in pending]
        if keys:
            score=sum(len(candidate_map[k]['matchedPatterns']) for k in keys if k in candidate_map)
            ranked.append((name,keys,score))
    # Risk is evaluated from the existing candidate pattern evidence; complete original
    # batch membership is the tie-breaking execution unit, never a defect decision.
    ranked.sort(key=lambda row:(-row[2],-len(row[1]),row[0]))
    selected=[];new_keys=[]
    for name,keys,_ in ranked:
        selected.append(batches[name]);new_keys.extend(keys)
        if len(set(new_keys))>=25:break
    require(len(scope)==40 and len(cov)==75 and len(set(new_keys))>=25,'Insufficient pending bounded scope')
    return {'phase':'2H.2I-R3','checkpointNumber':4,'parentFingerprint':PIN,'remoteBaseline':BASELINE,
            'originalAggregateFingerprint':p.PIN,'checkpoint02Fingerprint':c3.PIN,'reviewRule':'NEXT_40_PENDING_IN_ORIGINAL_REVIEW_INVENTORY_ORDER',
            'reviews':scope,'coverageRule':'NEXT_75_PENDING_IN_ACCEPTED_ORIGINAL_GROUP_ORDER','coverage':cov,
            'grammarRule':'PENDING_CANDIDATE_PATTERN_SCORE_DESC; COMPLETE_ORIGINAL_BATCH; CANDIDATE_COUNT_DESC; MANUSCRIPT_PATH_ASC',
            'grammarCandidateKeys':list(dict.fromkeys(new_keys)),'grammarBatches':selected,
            'grammarInspectionKeys':list(dict.fromkeys(k for b in selected for k in b['inspectionKeys'])),
            'linguisticDecisionsGenerated':False}


def prepare():
    index,reviews,coverage,grammar=parents();receipt=selection(index,reviews,coverage,grammar)
    paths=[ROOT/'scripts/phase-2h2i-aggregate-qa.py',ROOT/'scripts/phase-2h2i-aggregate-qa-test.py',
           ROOT/'scripts/phase-2h2i-aggregate-qa-resume.py',ROOT/'scripts/phase-2h2i-aggregate-qa-resume-test.py',
           ROOT/'scripts/phase-2h2i-aggregate-qa-checkpoint-03.py',ROOT/'scripts/phase-2h2i-aggregate-qa-checkpoint-03-test.py']
    # The three progress documents are intentional R3 targets. Record their
    # pre-edit digests separately in the receipt, but do not make the parent
    # replay depend on their post-R3 bytes.
    paths += [x for x in CP03.rglob('*') if x.is_file()]
    inherited=load(CP03/'accepted-parent-pins.json')
    pins={'parentFingerprint':PIN,'inheritedPinsReference':ref(CP03/'accepted-parent-pins.json'),
          'additiveParentFiles':{x.relative_to(ROOT).as_posix():sha(x) for x in sorted(paths)},
          'documentationBaseline':{d:sha(ROOT/d) for d in DOCS},
          'previousFileCount':6962}
    (WS/'authored').mkdir(parents=True,exist_ok=True)
    for name,obj in [('resume-selection-receipt.json',receipt),('accepted-parent-pins.json',pins)]:
        path=WS/name;data=encode(obj).encode('utf8')
        if path.exists():
            if name=='accepted-parent-pins.json' and not any((WS/'authored'/n).exists() for n in NAMES):
                old=load(path)
                old_parent_files={k:v for k,v in old.get('additiveParentFiles',{}).items() if k not in DOCS}
                require(old.get('parentFingerprint')==PIN and old.get('inheritedPinsReference')==pins['inheritedPinsReference'] and
                        old_parent_files==pins['additiveParentFiles'] and old.get('previousFileCount')==6962,
                        'Prepared parent files drift before authoring')
                path.write_bytes(data)
            else:require(path.read_bytes()==data,'Prepared selection/pins are immutable: '+name)
        else:path.write_bytes(data)
    return receipt


def previous_proposals():
    originals=load(a.WS/'correction-proposals.json')
    cp02=load(p.WS/'correction-proposals-additive.json')
    # Parent continuation files point to authored proposal documents by path/hash.
    cp02_props=load(ROOT/cp02['newProposals']['path'])
    cp03_props=load(CP03/'authored/new-correction-proposals.json')
    fields=originals['records']+cp02_props['records']+cp03_props['records']
    boundaries=originals['additionalBoundaryProposals']+cp02_props['additionalBoundaryProposals']+cp03_props['additionalBoundaryProposals']
    require(len(fields)==82 and len(boundaries)==7,'Accepted proposal history drift')
    return fields,boundaries


def validate_decisions(index,receipt,review,coverage,grammar,proposals):
    rd=a.unique(review['records'],'proposalKey')
    require(list(rd)==[r['proposalKey'] for r in receipt['reviews']],'Review identity/order drift')
    original_reviews=load(a.WS/'review-triage.json')['records']
    for selected,row in zip(receipt['reviews'],rd.values()):
        a.check_bound(row,index)
        require(row['inventoryOrdinal']==selected['inventoryOrdinal'] and row['status']=='TRIAGED','Review scope/status drift')
        require(row['categories'] and set(row['categories'])<=REVIEW_CLASSES and row['explanationVi'] and row['nextActionVi'],'Review reasoning/category missing')
        require(row['priority'] in {'P0','P1','P2','P3'} and row['severity'],'Review priority/severity invalid')
        require(row.get('ownerApproval') is False and row.get('humanApproval') is False and row['rights']=='UNKNOWN_REVIEW_REQUIRED','Review invents approval')
        source=original_reviews[selected['inventoryOrdinal']]
        require(source['originalReview']['record']['proposalKey']==row['proposalKey'],'Wrong original review evidence')
        expected=[{'path':x['path'],'sha256':x['sha256'],'jsonPointer':x['jsonPointer']} for x in index[row['proposalKey']]['pinnedCorrectionLineage']]
        require(row['earlierOverlayEvidence']==expected,'Review correction lineage drift')
    cd=a.unique(coverage['records'],'candidateGroupKey')
    require(list(cd)==[r['candidateGroupKey'] for r in receipt['coverage']],'Coverage identity/order drift')
    original_cov=load(a.WS/'sense-coverage-audit.json')['groups']
    for selected,row in zip(receipt['coverage'],cd.values()):
        require(row['effectiveContentHashes']==selected['effectiveContentHashes'],'Coverage content hash drift')
        require(row['originalGroupOrdinal']==selected['originalGroupOrdinal'] and row['originalWarnings']==selected['originalWarnings'],'Coverage original group evidence drift')
        require(row['inspectedProposalKeys']==list(selected['effectiveContentHashes']),'Coverage omitted a Sense')
        senses=[q for q in index.values() if q['candidateGroupKey']==row['candidateGroupKey']]
        require(row['sourceEvidence']==[q['sourceEvidence'] for q in senses],'Coverage source evidence drift')
        require(row['classification'] in COVERAGE_CLASSES and row['status']=='ASSESSED' and row['explanationVi'] and row['limitationsVi'] and row['nextActionVi'],'Coverage assessment incomplete')
        require(row['exhaustiveLexicalCoverage'] is False and row['ownerApproval'] is False and row['rights']=='UNKNOWN_REVIEW_REQUIRED','Coverage overclaims or approval')
        require(original_cov[selected['originalGroupOrdinal']]['candidateGroupKey']==row['candidateGroupKey'],'Coverage ordinal changed')
    require(grammar['completeBatches']==receipt['grammarBatches'] and grammar['newCandidateKeys']==receipt['grammarCandidateKeys'],'Grammar receipt drift')
    gr=a.unique(grammar['records'],'proposalKey');require(list(gr)==receipt['grammarInspectionKeys'],'Incomplete complete-batch inspection')
    old_fields,_=previous_proposals();old_ids={q['proposalKey']:q['correctionProposalId'] for q in old_fields}
    actual_batches,_=c3.source_batches(index)
    for batch in receipt['grammarBatches']:
        path=ROOT/batch['path'];require(path.resolve().is_relative_to(ROOT.resolve()),'Unsafe batch path')
        require(batch==actual_batches[batch['path']] and sha(path)==batch['sha256'],'Manuscript membership/hash drift')
    for row in gr.values():
        a.check_bound(row,index);q=index[row['proposalKey']]
        require(row['grammarNoteSha256']==a.text_sha(q['content']['grammarNotesEn']),'Grammar note hash drift')
        require(set(row['inspectedFields'])==set(q['content']),'Grammar inspection omitted content fields')
        require(row['sourceEvidence']==q['sourceEvidence'],'Grammar source evidence drift')
        require(row['priorCorrectionEvidence']==[{'path':x['path'],'sha256':x['sha256'],'jsonPointer':x['jsonPointer']} for x in q['pinnedCorrectionLineage']],'Prior overlay evidence drift')
        require(row['priorProposalId']==old_ids.get(row['proposalKey']),'Grammar prior proposal lineage drift')
        require(row['classification'] in GRAMMAR_CLASSES and row['explanationVi'] and row['ownerApproval'] is False,'Grammar assessment invalid')
    ids={q['correctionProposalId'] for q in old_fields};newkeys=set()
    coverage_by_key=cd
    for q in proposals['records']:
        require(q['proposalKey'] in index,'Foreign correction proposal')
        parent=index[q['proposalKey']]
        require(q['originalEffectiveContentHash']==parent['effectiveContentHash'],'Stale correction parent')
        if q['field']=='/content/grammarNotesEn':
            before_value=parent['content']['grammarNotesEn']
            require(q.get('findingSource')=='GRAMMAR_COMMENTARY_AUDIT' and
                    q['proposalKey'] in gr and gr[q['proposalKey']]['classification']=='CONFIRMED_PROCESS_COMMENTARY',
                    'Grammar proposal lacks a confirmed inspected finding')
        else:
            m=re.fullmatch(r'/content/examples/(\d+)/vi',q['field'])
            require(m is not None,'Unsupported additive correction field')
            example_index=int(m.group(1));require(example_index<len(parent['content']['examples']),'Correction example index out of range')
            before_value=parent['content']['examples'][example_index]['vi']
            group_key=parent['candidateGroupKey']
            require(q.get('findingSource')=='SENSE_COVERAGE_AUDIT' and group_key in coverage_by_key and
                    any(x.get('correctionProposalId')==q['correctionProposalId'] and x.get('field')==q['field'] and
                        x.get('before')==q['before'] and x.get('after')==q['after'] for x in coverage_by_key[group_key]['confirmedContentFindings']),
                    'Example proposal lacks a confirmed inspected finding')
        require(q['before']==before_value and q['beforeSha256']==a.text_sha(q['before']) and
                q['afterSha256']==a.text_sha(q['after']),'Correction field/value hash drift')
        require(q['before']!=q['after'] and q['after'] and q['applied'] is False and q['ownerApproval'] is False and
                q['fullBatchReReviewRequired'] is True,'Empty, duplicate, applied, or unreviewable correction')
        require(q['correctionProposalId'] not in ids and q['proposalKey'] not in old_ids and q['proposalKey'] not in newkeys,'Duplicate/contradictory proposal')
        ids.add(q['correctionProposalId']);newkeys.add(q['proposalKey'])
        require(q['priority'] in {'P0','P1','P2','P3'} and q['severity'] and q['rationaleVi'] and q['evidenceScope'] and q['relatedFieldImpact'],'Proposal lacks evidence')
    expected={k for k,v in gr.items() if v['classification']=='CONFIRMED_PROCESS_COMMENTARY' and k not in old_ids}
    expected|={finding['proposalKey'] for row in cd.values() for finding in row.get('confirmedContentFindings',[]) if finding['proposalKey'] not in old_ids}
    require(newkeys==expected,'Confirmed process finding missing additive proposal')
    require(not proposals['additionalBoundaryProposals'] or all(p['approved'] is False and p['ownerApproval'] is False and p['applied'] is False and p['canonicalId'] is None for p in proposals['additionalBoundaryProposals']),'Unauthorized boundary proposal')
    return rd,cd,gr,old_fields,old_fields,receipt['grammarBatches']


def assemble():
    index,reviews,coverage,grammar_state=parents();pins=load(WS/'accepted-parent-pins.json')
    require(pins['parentFingerprint']==PIN and pins['inheritedPinsReference']==ref(CP03/'accepted-parent-pins.json'),'Checkpoint 03 pin mismatch')
    a.validate_pins(pins['additiveParentFiles'])
    require(set(pins.get('documentationBaseline',{}))==set(DOCS),'Documentation baseline pin incomplete')
    paths=[ROOT/'scripts/phase-2h2i-aggregate-qa.py',ROOT/'scripts/phase-2h2i-aggregate-qa-test.py',ROOT/'scripts/phase-2h2i-aggregate-qa-resume.py',ROOT/'scripts/phase-2h2i-aggregate-qa-resume-test.py',ROOT/'scripts/phase-2h2i-aggregate-qa-checkpoint-03.py',ROOT/'scripts/phase-2h2i-aggregate-qa-checkpoint-03-test.py']+[x for x in CP03.rglob('*') if x.is_file()]
    require(pins['additiveParentFiles']=={x.relative_to(ROOT).as_posix():sha(x) for x in sorted(paths)} and pins['previousFileCount']==6962,'Accepted file pin scope drift')
    receipt=load(WS/'resume-selection-receipt.json')
    require(receipt==selection(index,reviews,coverage,grammar_state),'Selection receipt drift')
    authored=[load(WS/'authored'/n) for n in NAMES];rd,cd,gr,old_fields,_,batches=validate_decisions(index,receipt,*authored)
    # Keep historical REVIEW decisions byte-bound through their cumulative records;
    # attach this checkpoint's decision only to the selected PENDING identities.
    rrows=[]
    for i,old in enumerate(reviews):
        key=old['proposalKey'];fresh=key in rd
        rrows.append({**old,'parentRecord':ref(CP03/'review-triage-cumulative.json',f'/records/{i}'),
                      'status':'TRIAGED' if fresh else old['status'],
                      'newDecision':ref(WS/'authored'/NAMES[0],f'/records/{list(rd).index(key)}') if fresh else old['newDecision']})
    crows=[]
    for i,old in enumerate(coverage):
        key=old['candidateGroupKey'];fresh=key in cd
        ordinal=next(j for j,q in enumerate(load(a.WS/'sense-coverage-audit.json')['groups']) if q['candidateGroupKey']==key)
        crows.append({**old,'originalGroupOrdinal':ordinal,'parentRecord':ref(CP03/'coverage-audit-cumulative.json',f'/groups/{i}'),
                      'status':'ASSESSED' if fresh else old['status'],
                      'newDecision':ref(WS/'authored'/NAMES[1],f'/records/{list(cd).index(key)}') if fresh else old['newDecision']})
    new_candidate_keys=set(receipt['grammarCandidateKeys']);require(new_candidate_keys<=set(grammar_state['pendingDedicatedInspectionKeys']),'Candidate already inspected')
    pending=sorted(set(grammar_state['pendingDedicatedInspectionKeys'])-new_candidate_keys)
    new_props=authored[3]['records'];old_boundaries=previous_proposals()[1]
    cp02q=load(p.WS/'prioritized-remediation-queue.json');cp03q=load(CP03/'prioritized-remediation-queue.json');origq=load(a.WS/'prioritized-remediation-queue.json')
    allitems=origq['items']+cp02q['newItems']+cp03q['newItems']
    new_queue=[]
    for q in rd.values():
        if q['categories'][0] in {'SOURCE_POS_CONFLICT','SENSE_BOUNDARY_UNCERTAIN','SOURCE_ORIGINALITY_UNCERTAIN'}:
            new_queue.append({'identity':q['proposalKey'],'effectiveContentHash':q['effectiveContentHash'],'categories':q['categories'],'priority':q['priority'],'severity':q['severity'],'rationaleVi':q['explanationVi'],'nextActionVi':q['nextActionVi'],'historicalStatus':'REVIEW','ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    for q in cd.values():
        if q['classification']!='NO_IDENTIFIED_SOURCE_SUPPORTED_GAP':new_queue.append({'identity':q['candidateGroupKey'],'effectiveContentHashes':q['effectiveContentHashes'],'classification':q['classification'],'priority':'P2','rationaleVi':q['explanationVi'],'nextActionVi':q['nextActionVi'],'ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    for q in new_props:new_queue.append({'identity':q['correctionProposalId'],'proposalKey':q['proposalKey'],'parentHash':q['originalEffectiveContentHash'],'priority':q['priority'],'severity':q['severity'],'rationaleVi':q['rationaleVi'],'nextActionVi':'Đánh giá đề xuất; review toàn batch trước một lượt áp dụng riêng nếu được cho phép.','applied':False,'ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    counts=Counter(x['priority'] for x in allitems+new_queue)
    summary={'phase':'2H.2I-R3','status':'PARTIAL','boundedTargetsCompleted':True,'totalCorpusGroups':1020,'totalCorpusSenses':1563,'frozenCohortGroups':500,'frozenCohortSenses':750,
        'originalReviewRecords':187,'previousReviewTriaged':105,'newReviewTriaged':len(rd),'cumulativeReviewTriaged':105+len(rd),'reviewPending':82-len(rd),
        'previousCoverageAssessed':167,'newCoverageAssessed':len(cd),'cumulativeCoverageAssessed':167+len(cd),'coveragePending':333-len(cd),'originalCoverageWarningGroupsPreserved':126,
        'previousGrammarCandidatesInspected':58,'newGrammarCandidatesInspected':len(new_candidate_keys),'cumulativeGrammarCandidatesInspected':58+len(new_candidate_keys),'grammarCandidatesTotal':107,'grammarCandidatesPending':len(pending),
        'completeBatchesInspected':len(batches),'actualGrammarMembersInspected':len(gr),'grammarClassifications':dict(Counter(x['classification'] for x in gr.values())),
        'newCoverageClassifications':dict(Counter(x['classification'] for x in cd.values())),
        'newConfirmedContentDefects':len(new_props),'newConfirmedCoverageGaps':sum(x['classification']=='CONFIRMED_GAP' for x in cd.values()),
        'newPossibleCoverageGaps':sum(x['classification']=='POSSIBLE_GAP' for x in cd.values()),'newSourceMetadataConflicts':sum(x['classification']=='SOURCE_METADATA_CONFLICT' for x in cd.values()),
        'newFieldCorrectionProposals':len(new_props),'newBoundaryProposals':len(authored[3]['additionalBoundaryProposals']),'totalFieldProposals':82+len(new_props),'totalBoundaryProposals':len(old_boundaries)+len(authored[3]['additionalBoundaryProposals']),
        'cumulativeRemediationPriorityCounts':{f'P{i}':counts.get(f'P{i}',0) for i in range(4)},'correctionsApplied':0,
        'previousBaselineFilesObserved':6962,'previousFilesUnchangedExcludingR3DocumentationTargets':6959,
        'authorization':a.AUTH,'linguisticDecisionsGeneratedDuringAssembly':False,'verificationCommands':'Actual commands stored in separate verification-results.json'}
    require(summary['cumulativeReviewTriaged']==145 and summary['reviewPending']==42 and summary['cumulativeCoverageAssessed']==242 and summary['coveragePending']==258,'Bounded count mismatch')
    queue={'parentQueue':ref(CP03/'prioritized-remediation-queue.json'),'newItems':new_queue,'cumulativePriorityCounts':summary['cumulativeRemediationPriorityCounts'],
           'priorItemsReferenced':{'originalAggregate':ref(a.WS/'prioritized-remediation-queue.json'),'checkpoint02':ref(p.WS/'prioritized-remediation-queue.json'),'checkpoint03':ref(CP03/'prioritized-remediation-queue.json')},
           'unresolvedRights':'UNKNOWN_REVIEW_REQUIRED','approvalInferred':False}
    lesson={'lessonId':'2H2I-QA-LESSON-004','status':'RECOMMENDATION_ONLY','scope':'Future separately authorized authoring cohorts',
        'rules':['Keep provenance, source ordinal, canonical identity, owner approval, taxonomy and proposal status in provenance/QA fields, not learner-facing grammar notes.',
                 'Use grammar notes to explain a real English construction or usage distinction; verify the grammar claim against the effective definition, POS and examples.',
                 'Preserve clear, natural Vietnamese meanings and example translations; inspect paired EN/VI fields together.',
                 'Review source-supported Sense boundaries before adding meanings; an ordinal or keyword is evidence, not automatic identity approval.',
                 'Compare source similarity as a review signal, inspect actual passages and record scope; neither a match nor a heuristic alone proves copying or clears rights.'],
        'observedEvidence':{'checkpoint03PriorGrammarInspections':126,'checkpoint04FullBatchInspectionCount':len(gr),'newConfirmedProcessCommentary':len(new_props)},
        'workflowChangeAuthorized':False,'frozenAuthoringArtifactsModified':False}
    objects={'review-triage-cumulative.json':{'parentFingerprint':PIN,'records':rrows,'newDecisions':ref(WS/'authored'/NAMES[0])},
        'coverage-audit-cumulative.json':{'parentFingerprint':PIN,'groups':crows,'newDecisions':ref(WS/'authored'/NAMES[1]),'exhaustiveLexicalCoverage':False},
        'grammar-commentary-audit.json':{'candidateInventoryReference':ref(CP03/'grammar-commentary-audit.json'),'candidateInventoryUnchanged':True,'dedicatedCandidateCount':107,
            'previousDedicatedCount':58,'newDedicatedCandidateKeys':sorted(new_candidate_keys),'actualInspections':ref(WS/'authored'/NAMES[2]),'completeBatches':batches,
            'pendingDedicatedInspectionKeys':pending,'classificationCounts':summary['grammarClassifications'],'statisticalPrevalenceClaimed':False},
        'correction-proposals-additive.json':{'parentProposals':ref(CP03/'correction-proposals-additive.json'),'parentFieldCount':82,'parentBoundaryCount':len(old_boundaries),
            'newProposals':ref(WS/'authored'/NAMES[3]),'totalFieldCount':summary['totalFieldProposals'],'totalBoundaryCount':summary['totalBoundaryProposals'],'correctionsApplied':0},
        'prioritized-remediation-queue.json':queue,'validation-summary.json':summary,'authoring-qa-lesson.json':lesson}
    report=['# Phase 2H.2I-R3 — additive checkpoint 04','',
        'Status: PARTIAL at aggregate scope; bounded selection is complete. This is offline audit-only work. All effective records remain NONCANONICAL DRAFT.', '',
        f'Checkpoint 03: `{PIN}`. Checkpoint 02: `{c3.PIN}`. Original aggregate: `{p.PIN}`. Remote parent: `{BASELINE}`.', '',
        f'REVIEW: 105 + {len(rd)} = {105+len(rd)} / 187 triaged; {82-len(rd)} pending.',
        f'Coverage: 167 + {len(cd)} = {167+len(cd)} / 500 assessed; {333-len(cd)} pending. All 126 originally warned identities remain preserved; no exhaustive lexical coverage claim.',
        f'Grammar: 58 + {len(new_candidate_keys)} = {58+len(new_candidate_keys)} / 107 dedicated candidate identities inspected; {len(pending)} pending. {len(gr)} actual complete-batch members across {len(batches)} whole authored batches.',
        f'Grammar results: {encode(summary["grammarClassifications"]).strip()}; {len(new_props)} new exact field proposals, none applied. The batch sample is purposive and supports no prevalence estimate.',
        f'Coverage findings: {encode(summary["newCoverageClassifications"] if "newCoverageClassifications" in summary else dict(Counter(x["classification"] for x in cd.values()))).strip()}. Confirmed gaps: {summary["newConfirmedCoverageGaps"]}; possible gaps: {summary["newPossibleCoverageGaps"]}; source metadata conflicts: {summary["newSourceMetadataConflicts"]}; boundary proposals: {summary["newBoundaryProposals"]}.',
        f'Proposal totals: {summary["totalFieldProposals"]} field and {summary["totalBoundaryProposals"]} boundary proposals. Prior 82 / 7 are retained through immutable parent references.', '',
        '## New REVIEW findings','']
    report += [f'- `{k}` — {", ".join(v["categories"])}: {v["explanationVi"]} Next: {v["nextActionVi"]}' for k,v in rd.items()]
    report += ['', '## New coverage findings','']+[f'- `{k}` — {v["classification"]}: {v["explanationVi"]}' for k,v in cd.items()]
    report += ['', '## Field proposals — unapplied','']
    for q in new_props:report += [f'### {q["correctionProposalId"]}: {q["proposalKey"]}','',f'BEFORE: {q["before"]}','',f'AFTER: {q["after"]}','',q['rationaleVi'],'']
    report += ['## Cumulative remediation priorities','',encode(summary['cumulativeRemediationPriorityCounts']).strip(),
        'Historical items remain linked through the original aggregate, checkpoint 02 and checkpoint 03 queue references. Rights and identity blockers remain unresolved independently of AI linguistic review.',
        '', '## Reusable authoring QA lesson','']+[f'- {q}' for q in lesson['rules']]
    report += ['', '## Handoff','',
        'Pending identities remain PENDING in cumulative review, coverage and grammar inventories; use those exact keys and hashes for any separately authorized continuation.',
        'Verification results list actual command exits separately from the deterministic assembler. Canonical pnpm is NOT_RUN unless the external receipt states otherwise.',
        'Rights UNKNOWN_REVIEW_REQUIRED; owner approvals 0; canonical IDs 0; correction applications 0; database access/writes NONE; Development and Production untouched; Master release and legacy unchanged. Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses.',
        'STOP after checkpoint 04 publication. No checkpoint 05, correction application, authoring cohort, canonical approval, rights clearance, or database import.','']
    report='\n'.join(report)
    manifest={'phase':'2H.2I-R3','checkpointNumber':4,'parentFingerprint':PIN,'remoteBaseline':BASELINE,'originalAggregateFingerprint':p.PIN,
        'checkpoint02Fingerprint':c3.PIN,'frozenCheckpoint05':a.CP_PIN,'acceptedPins':ref(WS/'accepted-parent-pins.json'),
        'selection':ref(WS/'resume-selection-receipt.json'),'authoredHashes':{n:sha(WS/'authored'/n) for n in NAMES},
        'sourceHashes':{n:sha(ROOT/'scripts'/n) for n in ['phase-2h2i-aggregate-qa-checkpoint-04.py','phase-2h2i-aggregate-qa-checkpoint-04-test.py']},
        'artifactHashes':{n:a.text_sha(encode(v)) for n,v in objects.items()},'reportSha256':a.text_sha(report),'authorization':a.AUTH}
    manifest['fingerprint']=digest(manifest);objects['manifest.json']=manifest
    return {n:encode(v).encode('utf8') for n,v in objects.items()}|{'report.md':report.encode('utf8')}


def run(check=False):
    outputs=assemble()
    for name,data in outputs.items():
        path=WS/name
        if check:require(path.is_file() and path.read_bytes()==data,'Checkpoint output drift: '+name)
        else:
            require(path.resolve().is_relative_to(WS.resolve()),'Unsafe artifact output')
            require(not path.exists() or path.read_bytes()==data,'Immutable checkpoint output mismatch: '+name)
            if not path.exists():path.write_bytes(data)
    return {'fingerprint':load(WS/'manifest.json')['fingerprint'],'zeroWrites':check,'status':'PARTIAL','boundedTargetsCompleted':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__);modes=parser.add_mutually_exclusive_group()
    modes.add_argument('--prepare',action='store_true');modes.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.prepare:
        r=prepare();print('PREPARED',len(r['reviews']),len(r['coverage']),len(r['grammarCandidateKeys']),len(r['grammarInspectionKeys']),len(r['grammarBatches']))
    else:print(encode(run(args.check)))


if __name__=='__main__':main()
