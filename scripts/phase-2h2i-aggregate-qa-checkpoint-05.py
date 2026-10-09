#!/usr/bin/env python3
"""Offline Phase 2H.2I-R4 continuation; immutable, content-bound checkpoint 05."""
import argparse
import importlib.util
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
def module(name,path):
    spec=importlib.util.spec_from_file_location(name,path)
    value=importlib.util.module_from_spec(spec);spec.loader.exec_module(value);return value
c4=module('checkpoint04',Path(__file__).with_name('phase-2h2i-aggregate-qa-checkpoint-04.py'))
c3=c4.c3;p=c4.p;a=c4.a
CP04=c4.WS;WS=CP04.parent/'checkpoint-05'
PIN='524b064666d9538cb9774bd50f4a2bd63e82505e8f2a82232a4b59f4baf6724b'
BASELINE='9cac61f60b1c3dcff64fc66d3b3adf215aa0e29f'
DOCS=['docs/ai-progress.md','docs/changelog.md','docs/stories/US-45-master-vocabulary-v2-runtime-import-bridge.md']
NAMES=['review-decisions-batch-005.json','coverage-decisions-batch-005.json',
       'grammar-inspection-batch-005.json','new-correction-proposals.json']
REVIEW_CLASSES={'HEURISTIC_SIGNAL_ONLY','SOURCE_ORIGINALITY_UNCERTAIN','NO_SUBSTANTIVE_CONTENT_DEFECT_FOUND_BY_AI','SENSE_BOUNDARY_UNCERTAIN','SOURCE_POS_CONFLICT'}
COVERAGE_CLASSES={'CONFIRMED_GAP','POSSIBLE_GAP','SOURCE_METADATA_CONFLICT','COVERAGE_UNKNOWN','NO_IDENTIFIED_SOURCE_SUPPORTED_GAP'}
GRAMMAR_CLASSES={'CONFIRMED_PROCESS_COMMENTARY','POSSIBLE_PROCESS_COMMENTARY','VALID_LEARNER_GRAMMAR_NOTE','INSUFFICIENT_CONTEXT'}
load,encode,sha,require,digest=c4.load,c4.encode,c4.sha,c4.require,c4.digest
ref=c4.ref

def parents():
    actual=c4.run(True)['fingerprint']
    require(actual==PIN,'Accepted checkpoint 04 fingerprint drift')
    index,_,_,_=c4.parents()
    reviews=load(CP04/'review-triage-cumulative.json')['records']
    coverage=load(CP04/'coverage-audit-cumulative.json')['groups']
    grammar=load(CP04/'grammar-commentary-audit.json')
    proposals=load(CP04/'correction-proposals-additive.json')
    require(len(index)==1563 and len(reviews)==187 and len(coverage)==500,'Parent inventory drift')
    require(sum(x['status']=='TRIAGED' for x in reviews)==145 and sum(x['status']=='PENDING' for x in reviews)==42,'Parent REVIEW counts drift')
    require(sum(x['status']=='ASSESSED' for x in coverage)==242 and sum(x['status']=='PENDING' for x in coverage)==258,'Parent coverage counts drift')
    require(len(grammar['pendingDedicatedInspectionKeys'])==24 and grammar['dedicatedCandidateCount']==107,'Parent grammar candidate inventory drift')
    require(proposals['totalFieldCount']==117 and proposals['totalBoundaryCount']==7,'Parent correction lineage count drift')
    return index,reviews,coverage,grammar

def selection(index,reviews,coverage,grammar):
    original_reviews=load(a.WS/'review-triage.json')['records']
    review_map={x['proposalKey']:x for x in reviews}
    selected_reviews=[]
    for row in original_reviews:
        key=row['originalReview']['record']['proposalKey'];current=review_map[key]
        if current['status']=='PENDING':
            selected_reviews.append({'inventoryOrdinal':row['inventoryOrdinal'],'proposalKey':key,
                                     'effectiveContentHash':index[key]['effectiveContentHash']})
    original_coverage=load(a.WS/'sense-coverage-audit.json')['groups']
    coverage_map={x['candidateGroupKey']:x for x in coverage}
    selected_coverage=[]
    for ordinal,original in enumerate(original_coverage):
        current=coverage_map[original['candidateGroupKey']]
        if current['status']!='PENDING':continue
        key=current['candidateGroupKey']
        hashes={k:v['effectiveContentHash'] for k,v in index.items() if v['candidateGroupKey']==key}
        selected_coverage.append({'originalGroupOrdinal':ordinal,'candidateGroupKey':key,
                                  'originalWarnings':original['originalWarningRecord']['warnings'],
                                  'effectiveContentHashes':hashes})
        if len(selected_coverage)==75:break
    batches,_=c3.source_batches(index)
    candidate_keys=list(grammar['pendingDedicatedInspectionKeys'])
    pending=set(candidate_keys)
    selected_batches=[b for b in batches.values() if pending.intersection(b['inspectionKeys'])]
    inspection_keys=list(dict.fromkeys(k for b in selected_batches for k in b['inspectionKeys']))
    require(len(selected_reviews)==42 and len(selected_coverage)==75 and len(candidate_keys)==24,'Bounded pending selection is short')
    require(pending<=set(inspection_keys),'A pending grammar candidate has no complete source batch')
    return {'phase':'2H.2I-R4','checkpointNumber':5,'parentFingerprint':PIN,'remoteBaseline':BASELINE,
            'originalAggregateFingerprint':p.PIN,'checkpoint02Fingerprint':c3.PIN,'checkpoint03Fingerprint':c4.PIN,
            'reviewRule':'ALL_REMAINING_PENDING_IN_ORIGINAL_REVIEW_INVENTORY_ORDER','reviews':selected_reviews,
            'coverageRule':'NEXT_75_PENDING_IN_ACCEPTED_ORIGINAL_GROUP_ORDER','coverage':selected_coverage,
            'grammarRule':'ALL_REMAINING_DEDICATED_KEYS; INSPECT_EVERY_MEMBER_OF_EACH_ORIGINAL_BATCH',
            'grammarCandidateKeys':candidate_keys,'grammarInspectionKeys':inspection_keys,
            'grammarBatches':selected_batches,
            'grammarHashes':{k:index[k]['effectiveContentHash'] for k in inspection_keys},
            'linguisticDecisionsGenerated':False}

def parent_file_pins():
    prior=load(CP04/'accepted-parent-pins.json')
    rows=dict(prior['additiveParentFiles'])
    for path in sorted(x for x in CP04.rglob('*') if x.is_file()):
        rows[path.relative_to(ROOT).as_posix()]=sha(path)
    return rows

def prepare():
    index,reviews,coverage,grammar=parents()
    receipt=selection(index,reviews,coverage,grammar)
    filepins=parent_file_pins()
    pins={'parentFingerprint':PIN,'parentManifest':ref(CP04/'manifest.json'),
          'inheritedPinsReference':ref(CP04/'accepted-parent-pins.json'),
          'parentFiles':filepins,'documentationBaseline':{d:sha(ROOT/d) for d in DOCS},
          'previousFileCount':len(filepins)}
    (WS/'authored').mkdir(parents=True,exist_ok=True)
    for name,value in [('resume-selection-receipt.json',receipt),('accepted-parent-pins.json',pins)]:
        path=WS/name;data=encode(value).encode('utf8')
        if path.exists():require(path.read_bytes()==data,'Prepared checkpoint 05 selection/pins are immutable')
        else:path.write_bytes(data)
    return receipt

def previous_proposals():
    fields,boundaries=c4.previous_proposals()
    cp04=load(CP04/'authored/new-correction-proposals.json')
    fields=fields+cp04['records'];boundaries=boundaries+cp04['additionalBoundaryProposals']
    require(len(fields)==117 and len(boundaries)==7,'Accepted 2H.2I proposal history drift')
    return fields,boundaries

def validate_authored(index,receipt,review,coverage,grammar,proposals):
    rd=a.unique(review['records'],'proposalKey')
    require(list(rd)==[x['proposalKey'] for x in receipt['reviews']],'Review selection/order mismatch')
    original_reviews=load(a.WS/'review-triage.json')['records']
    for selected,row in zip(receipt['reviews'],rd.values()):
        a.check_bound(row,index)
        require(row['inventoryOrdinal']==selected['inventoryOrdinal'] and row['effectiveContentHash']==selected['effectiveContentHash'],'Review hash/ordinal drift')
        require(row['status']=='TRIAGED' and row['categories'] and set(row['categories'])<=REVIEW_CLASSES,'Review class/status invalid')
        require(row['explanationVi'] and row['nextActionVi'] and row['severity'] and row['priority'] in {'P0','P1','P2','P3'},'Review rationale incomplete')
        require(row['ownerApproval'] is False and row['humanApproval'] is False and row['rights']=='UNKNOWN_REVIEW_REQUIRED','Review fabricated approval')
        source=original_reviews[selected['inventoryOrdinal']]['originalReview']['record']
        require(source['proposalKey']==row['proposalKey'],'Review source identity mismatch')
        expected=[{'path':x['path'],'sha256':x['sha256'],'jsonPointer':x['jsonPointer']} for x in index[row['proposalKey']]['pinnedCorrectionLineage']]
        require(row['earlierOverlayEvidence']==expected,'Review omitted correction/overlay lineage')
    cd=a.unique(coverage['records'],'candidateGroupKey')
    require(list(cd)==[x['candidateGroupKey'] for x in receipt['coverage']],'Coverage selection/order mismatch')
    original_cov=load(a.WS/'sense-coverage-audit.json')['groups']
    for selected,row in zip(receipt['coverage'],cd.values()):
        require(row['effectiveContentHashes']==selected['effectiveContentHashes'],'Coverage content hash drift')
        require(row['originalGroupOrdinal']==selected['originalGroupOrdinal'] and row['originalWarnings']==selected['originalWarnings'],'Coverage ordinal/warning drift')
        require(row['inspectedProposalKeys']==list(selected['effectiveContentHashes']),'Coverage omitted an effective Sense')
        senses=[v for v in index.values() if v['candidateGroupKey']==row['candidateGroupKey']]
        require(row['sourceEvidence']==[v['sourceEvidence'] for v in senses],'Coverage source evidence drift')
        require(row['classification'] in COVERAGE_CLASSES and row['status']=='ASSESSED','Coverage classification/status invalid')
        require(row['explanationVi'] and row['limitationsVi'] and row['nextActionVi'],'Coverage explanation/limitations missing')
        require(row['exhaustiveLexicalCoverage'] is False and row['ownerApproval'] is False and row['rights']=='UNKNOWN_REVIEW_REQUIRED','Coverage overclaim/approval')
        require(original_cov[selected['originalGroupOrdinal']]['candidateGroupKey']==row['candidateGroupKey'],'Coverage original ordinal mismatch')
    require(grammar['completeBatches']==receipt['grammarBatches'] and grammar['newCandidateKeys']==receipt['grammarCandidateKeys'],'Grammar batch/candidate selection drift')
    gr=a.unique(grammar['records'],'proposalKey')
    require(list(gr)==receipt['grammarInspectionKeys'],'Full-batch grammar members missing or reordered')
    old_fields,_=previous_proposals();old_ids={x['proposalKey']:x['correctionProposalId'] for x in old_fields}
    actual_batches,_=c3.source_batches(index)
    for batch in receipt['grammarBatches']:
        path=ROOT/batch['path']
        require(path.resolve().is_relative_to(ROOT.resolve()) and batch==actual_batches[batch['path']] and sha(path)==batch['sha256'],'Original batch membership/hash drift')
    for row in gr.values():
        a.check_bound(row,index);q=index[row['proposalKey']]
        require(row['effectiveContentHash']==receipt['grammarHashes'][row['proposalKey']],'Grammar content hash drift')
        require(row['grammarNoteSha256']==a.text_sha(q['content']['grammarNotesEn']),'Grammar note revision drift')
        require(set(row['inspectedFields'])==set(q['content']),'Grammar inspection omitted content fields')
        require(row['sourceEvidence']==q['sourceEvidence'],'Grammar source evidence drift')
        require(row['priorCorrectionEvidence']==[{'path':x['path'],'sha256':x['sha256'],'jsonPointer':x['jsonPointer']} for x in q['pinnedCorrectionLineage']],'Grammar overlay history drift')
        require(row['priorProposalId']==old_ids.get(row['proposalKey']),'Grammar old proposal lineage drift')
        require(row['classification'] in GRAMMAR_CLASSES and row['explanationVi'] and row['ownerApproval'] is False,'Grammar classification invalid')
    ids={x['correctionProposalId'] for x in old_fields};new_keys=set()
    for item in proposals['records']:
        require(item['proposalKey'] in index,'Foreign new correction proposal')
        q=index[item['proposalKey']];field=item['field'];before=None
        if field=='/content/grammarNotesEn':
            before=q['content']['grammarNotesEn']
            require(item.get('findingSource')=='GRAMMAR_COMMENTARY_AUDIT' and item['proposalKey'] in gr and gr[item['proposalKey']]['classification']=='CONFIRMED_PROCESS_COMMENTARY','Grammar correction lacks confirmed full-batch finding')
        else:
            m=re.fullmatch(r'/content/examples/(\d+)/(vi|en)',field)
            require(m is not None,'Unsupported example correction field')
            n=int(m.group(1));side=m.group(2);require(n<len(q['content']['examples']),'Correction example ordinal missing')
            before=q['content']['examples'][n][side]
            require(item.get('findingSource')=='SENSE_COVERAGE_AUDIT' and q['candidateGroupKey'] in cd,'Example proposal lacks selected coverage assessment')
            require(any(x.get('proposalKey')==item['proposalKey'] and x.get('field')==field and x.get('before')==item['before'] and x.get('after')==item['after'] for x in cd[q['candidateGroupKey']].get('confirmedContentFindings',[])),'Example correction not bound to finding')
        require(item['originalEffectiveContentHash']==q['effectiveContentHash'] and item['before']==before,'Correction parent/before mismatch')
        require(item['beforeSha256']==a.text_sha(item['before']) and item['afterSha256']==a.text_sha(item['after']) and item['after'] and item['after']!=item['before'],'Correction field hashes invalid')
        require(item['applied'] is False and item['ownerApproval'] is False and item['fullBatchReReviewRequired'] is True,'Correction applied/approved or not reviewable')
        require(item['correctionProposalId'] not in ids and item['proposalKey'] not in new_keys and item['proposalKey'] not in {x['proposalKey'] for x in old_fields},'Duplicate/conflicting proposal')
        require(item['rationaleVi'] and item['severity'] and item['correctionConfidence'] and item['relatedFieldImpact'] and item['evidenceScope'],'Proposal rationale incomplete')
        ids.add(item['correctionProposalId']);new_keys.add(item['proposalKey'])
    require(not proposals['additionalBoundaryProposals'] or all(x['applied'] is False and x['ownerApproval'] is False and x['approved'] is False and x['canonicalId'] is None for x in proposals['additionalBoundaryProposals']),'Boundary approval/canonical ID was invented')
    return rd,cd,gr,old_fields,old_ids

def assemble():
    index,reviews,coverage,grammar_state=parents()
    pins=load(WS/'accepted-parent-pins.json');receipt=load(WS/'resume-selection-receipt.json')
    require(pins['parentFingerprint']==PIN and pins['parentManifest']==ref(CP04/'manifest.json'),'Parent checkpoint pin mismatch')
    a.validate_pins(pins['parentFiles'])
    require(pins['parentFiles']==parent_file_pins(),'Parent file scope drift')
    require(set(pins['documentationBaseline'])==set(DOCS) and pins['previousFileCount']==len(pins['parentFiles']),'Documentation/parent pins incomplete')
    require(receipt==selection(index,reviews,coverage,grammar_state),'Checkpoint 05 deterministic selection drift')
    authored=[load(WS/'authored'/n) for n in NAMES]
    rd,cd,gr,old_fields,old_ids=validate_authored(index,receipt,*authored)
    review_rows=[]
    for i,old in enumerate(reviews):
        key=old['proposalKey'];fresh=key in rd
        review_rows.append({**old,'parentRecord':ref(CP04/'review-triage-cumulative.json',f'/records/{i}'),
            'status':'TRIAGED' if fresh else old['status'],
            'newDecision':ref(WS/'authored'/NAMES[0],f'/records/{list(rd).index(key)}') if fresh else old['newDecision']})
    coverage_rows=[]
    for i,old in enumerate(coverage):
        key=old['candidateGroupKey'];fresh=key in cd
        ordinal=next(j for j,x in enumerate(load(a.WS/'sense-coverage-audit.json')['groups']) if x['candidateGroupKey']==key)
        coverage_rows.append({**old,'originalGroupOrdinal':ordinal,'parentRecord':ref(CP04/'coverage-audit-cumulative.json',f'/groups/{i}'),
            'status':'ASSESSED' if fresh else old['status'],
            'newDecision':ref(WS/'authored'/NAMES[1],f'/records/{list(cd).index(key)}') if fresh else old['newDecision']})
    all_pending=set(grammar_state['pendingDedicatedInspectionKeys'])
    new_candidate_keys=set(receipt['grammarCandidateKeys'])
    require(new_candidate_keys==all_pending,'All remaining dedicated candidates must be inspected')
    old_boundary=c4.previous_proposals()[1];new_props=authored[3]['records'];new_boundary=authored[3]['additionalBoundaryProposals']
    p04props=load(CP04/'authored/new-correction-proposals.json')
    total_fields=old_fields+[] # 117 prior proposals already include checkpoint 04
    require(len(total_fields)==117 and len(old_boundary)==7,'Historical proposal totals drift')
    old_queue=load(CP04/'prioritized-remediation-queue.json')
    new_queue=[]
    for x in rd.values():
        if any(c in {'SOURCE_POS_CONFLICT','SENSE_BOUNDARY_UNCERTAIN','SOURCE_ORIGINALITY_UNCERTAIN'} for c in x['categories']):
            new_queue.append({'identity':x['proposalKey'],'effectiveContentHash':x['effectiveContentHash'],'categories':x['categories'],'priority':x['priority'],'severity':x['severity'],'rationaleVi':x['explanationVi'],'nextActionVi':x['nextActionVi'],'historicalStatus':'REVIEW','ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    for x in cd.values():
        if x['classification']!='NO_IDENTIFIED_SOURCE_SUPPORTED_GAP':
            new_queue.append({'identity':x['candidateGroupKey'],'effectiveContentHashes':x['effectiveContentHashes'],'classification':x['classification'],'priority':'P1' if x['classification']=='CONFIRMED_GAP' else 'P2','rationaleVi':x['explanationVi'],'nextActionVi':x['nextActionVi'],'ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    for x in new_props:
        new_queue.append({'identity':x['correctionProposalId'],'proposalKey':x['proposalKey'],'parentHash':x['originalEffectiveContentHash'],'priority':x['priority'],'severity':x['severity'],'rationaleVi':x['rationaleVi'],'nextActionVi':'Đánh giá riêng; yêu cầu review lại toàn batch trước khi áp dụng nếu có phase được ủy quyền.','applied':False,'ownerApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'})
    old_counts=old_queue['cumulativePriorityCounts']
    queue_counts={f'P{i}':old_counts.get(f'P{i}',0)+sum(x.get('priority')==f'P{i}' for x in new_queue) for i in range(4)}
    original_review=len(reviews);cum_review=sum(x['status']=='TRIAGED' for x in review_rows);review_pending=sum(x['status']=='PENDING' for x in review_rows)
    cum_cov=sum(x['status']=='ASSESSED' for x in coverage_rows);cov_pending=sum(x['status']=='PENDING' for x in coverage_rows)
    pending_candidates=[]
    summary={'phase':'2H.2I-R4','status':'PARTIAL','boundedTargetsCompleted':True,
        'totalCorpusGroups':1020,'totalCorpusSenses':1563,'frozenCohortGroups':500,'frozenCohortSenses':750,
        'originalReviewRecords':original_review,'previousReviewTriaged':145,'newReviewTriaged':len(rd),'cumulativeReviewTriaged':cum_review,'reviewPending':review_pending,
        'reviewTriageClosed':review_pending==0,'previousCoverageAssessed':242,'newCoverageAssessed':len(cd),'cumulativeCoverageAssessed':cum_cov,'coveragePending':cov_pending,
        'originalCoverageWarningGroupsPreserved':126,'previousGrammarCandidates':83,'newGrammarCandidatesInspected':len(new_candidate_keys),
        'cumulativeGrammarCandidates':83+len(new_candidate_keys),'grammarCandidatesTotal':107,'grammarCandidatesPending':len(pending_candidates),
        'grammarCandidateInventoryClosed':len(pending_candidates)==0,'newActualBatchSenseInspections':len(gr),'completeBatchesInspected':len(receipt['grammarBatches']),
        'grammarClassificationCountsCheckpointLocal':dict(Counter(x['classification'] for x in gr.values())),
        'newConfirmedContentDefects':len(new_props),'newConfirmedCoverageGaps':sum(x['classification']=='CONFIRMED_GAP' for x in cd.values()),
        'newPossibleCoverageGaps':sum(x['classification']=='POSSIBLE_GAP' for x in cd.values()),
        'newSourceMetadataConflicts':sum(x['classification']=='SOURCE_METADATA_CONFLICT' for x in cd.values()),
        'newFieldCorrectionProposals':len(new_props),'newBoundaryProposals':len(new_boundary),
        'totalFieldProposals':117+len(new_props),'totalBoundaryProposals':7+len(new_boundary),
        'cumulativeRemediationPriorityCounts':queue_counts,'correctionsApplied':0,
        'authorization':a.AUTH,'linguisticDecisionsGeneratedDuringAssembly':False,
        'verificationCommands':'Actual commands stored in separate verification-results.json'}
    require(cum_review==187 and review_pending==0 and cum_cov==317 and cov_pending==183 and summary['cumulativeGrammarCandidates']==107,'Checkpoint 05 expected cumulative counts mismatch')
    queue={'parentQueue':ref(CP04/'prioritized-remediation-queue.json'),'newItems':new_queue,
        'cumulativePriorityCounts':queue_counts,'priorItemsReferenced':{'originalAggregate':ref(a.WS/'prioritized-remediation-queue.json'),
        'checkpoint02':ref(c4.p.WS/'prioritized-remediation-queue.json'),'checkpoint03':ref(c4.CP03/'prioritized-remediation-queue.json'),
        'checkpoint04':ref(CP04/'prioritized-remediation-queue.json')},'unresolvedRights':'UNKNOWN_REVIEW_REQUIRED','approvalInferred':False}
    grammar_records=[]
    prior_refs=[]
    for parent in [c4.p.WS,c4.CP03,CP04]:
        audit=load(parent/'grammar-commentary-audit.json')
        prior_refs.append(ref(parent/'grammar-commentary-audit.json'))
    grammar_audit={'candidateInventoryReference':ref(CP04/'grammar-commentary-audit.json'),
        'candidateInventoryUnchanged':True,'dedicatedCandidateCount':107,'previousDedicatedCount':83,
        'newDedicatedCandidateKeys':receipt['grammarCandidateKeys'],'actualInspections':ref(WS/'authored'/NAMES[2]),
        'completeBatches':receipt['grammarBatches'],'pendingDedicatedInspectionKeys':pending_candidates,
        'cumulativeDedicatedCandidateCountInspected':107,
        'actualBatchMemberInspectionCount':len(gr),'parentGrammarAuditReferences':prior_refs,
        'classificationCountsCheckpointLocal':dict(Counter(x['classification'] for x in gr.values())),
        'statisticalPrevalenceClaimed':False,'allCorpusGrammarNotesCertifiedErrorFree':False}
    lesson={'lessonId':'2H2I-QA-LESSON-005','status':'RECOMMENDATION_ONLY','scope':'Future separately authorized authoring cohorts',
        'rules':['Review the effective EN definition, VI meaning, paired examples, POS, grammar note, historical REVIEW and exact overlays before classifying a finding.',
        'Keep source/POS uncertainty, sense boundaries, originality signals and rights gates separate from linguistic correctness.',
        'Inspect every member of a batch selected for grammar review; keyword/regex matches only nominate candidates and do not establish defects.',
        'Preserve accurate grammar guidance and propose exact field changes only for confirmed learner-facing defects.',
        'Treat source ordinals as bounded evidence, not proof of exhaustive lexical coverage or canonical identity.'],
        'observedEvidence':{'reviewRecordsTriaged':len(rd),'coverageGroupsAssessed':len(cd),'dedicatedGrammarCandidatesInspected':len(new_candidate_keys),'actualBatchMemberInspections':len(gr)},
        'workflowChangeAuthorized':False,'frozenAuthoringArtifactsModified':False}
    objects={'review-triage-cumulative.json':{'parentFingerprint':PIN,'records':review_rows,'newDecisions':ref(WS/'authored'/NAMES[0])},
        'coverage-audit-cumulative.json':{'parentFingerprint':PIN,'groups':coverage_rows,'newDecisions':ref(WS/'authored'/NAMES[1]),'exhaustiveLexicalCoverage':False},
        'grammar-commentary-audit.json':grammar_audit,
        'correction-proposals-additive.json':{'parentProposals':ref(CP04/'correction-proposals-additive.json'),
            'parentFieldCount':117,'parentBoundaryCount':7,'newProposals':ref(WS/'authored'/NAMES[3]),
            'totalFieldCount':summary['totalFieldProposals'],'totalBoundaryCount':summary['totalBoundaryProposals'],'correctionsApplied':0},
        'prioritized-remediation-queue.json':queue,'validation-summary.json':summary,'authoring-qa-lesson.json':lesson}
    report=['# Phase 2H.2I-R4 — additive checkpoint 05','',
        'Status: PARTIAL for the aggregate audit; all three bounded selections are completed. This is offline AI audit work, not owner approval.',
        f'Parent checkpoint 04: {PIN}. Remote parent: {BASELINE}.',
        f'REVIEW triage: 145 + {len(rd)} = {cum_review}/187; pending {review_pending}. Formal approval and rights clearance remain separate.',
        f'Sense coverage: 242 + {len(cd)} = {cum_cov}/500; pending {cov_pending}. Original warning identities preserved: 126. Exhaustive lexical coverage: false.',
        f'Dedicated grammar candidates: 83 + {len(new_candidate_keys)} = {83+len(new_candidate_keys)}/107; pending {len(pending_candidates)}. Actual batch Sense inspections: {len(gr)} across {len(receipt["grammarBatches"])} full original batches.',
        'Checkpoint-local grammar classification counts: '+encode(summary['grammarClassificationCountsCheckpointLocal']).strip()+'. These counts are not a prevalence estimate and do not certify all corpus grammar notes.',
        f'New findings: {len(new_props)} exact unapplied field proposals; coverage gaps {summary["newConfirmedCoverageGaps"]} confirmed / {summary["newPossibleCoverageGaps"]} possible; source metadata conflicts {summary["newSourceMetadataConflicts"]}.',
        'Rights remain UNKNOWN_REVIEW_REQUIRED; no formal approval, canonical ID, correction application, database access/write, Production operation, Master release, legacy or frozen authoring change. Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses.','',
        '## REVIEW assessments','']
    report += [f'- {k}: {v["categories"]} — {v["explanationVi"]} Next: {v["nextActionVi"]}' for k,v in rd.items()]
    report += ['','## Sense coverage assessments','']+[f'- {k}: {v["classification"]} — {v["explanationVi"]}' for k,v in cd.items()]
    report += ['','## New correction proposals — exact BEFORE / AFTER','']
    for q in new_props:
        report += [f'### {q["correctionProposalId"]} / {q["proposalKey"]}','',f'Field: {q["field"]}; parent hash: {q["originalEffectiveContentHash"]}.','',
                   'BEFORE: '+q['before'],'','AFTER (unapplied proposal): '+q['after'],'',q['rationaleVi'],'']
    if not new_props:
        # Preserve a concrete prior correction example without representing it as a new R4 proposal.
        example=load(CP04/'authored/new-correction-proposals.json')['records'][0]
        report += ['No new field correction was confirmed in this checkpoint. Example of an existing, unapplied checkpoint-04 proposal (not counted as new here):',
                   '',f'{example["proposalKey"]} {example["field"]}','',f'BEFORE: {example["before"]}','',f'AFTER: {example["after"]}','']
    report += ['## Full-batch grammar inspection','',
        'Every member of every original batch listed in the receipt was read and classified against its effective content revision. Candidate-level outcomes are preserved separately from total repeated batch-member inspections. Similarity and lexical heuristics do not establish copying, rights clearance, or identity.',
        '','## Handoff','',
        'REVIEW triage and the original dedicated grammar-candidate inventory are closed as AI audit inventories only. The Sense coverage audit remains PARTIAL with 183 groups pending. This does not close all grammar QA across the 1,563 Sense corpus.',
        'Verification results record executed commands separately from deterministic assembly. Canonical pnpm is NOT_RUN unless the external receipt states otherwise.',
        'STOP after scoped checkpoint-05 publication. No correction application, next checkpoint, new headword cohort, owner approval, rights clearance, canonical release, or database import.','']
    report='\n'.join(report)
    manifest={'phase':'2H.2I-R4','checkpointNumber':5,'parentFingerprint':PIN,'remoteBaseline':BASELINE,
        'originalAggregateFingerprint':p.PIN,'checkpoint02Fingerprint':c4.c3.PIN,'checkpoint03Fingerprint':c4.PIN,
        'frozenAuthoringCheckpoint05':c4.a.CP_PIN,'acceptedPins':ref(WS/'accepted-parent-pins.json'),
        'selection':ref(WS/'resume-selection-receipt.json'),
        'authoredHashes':{n:sha(WS/'authored'/n) for n in NAMES},
        'sourceHashes':{n:sha(ROOT/'scripts'/n) for n in ['phase-2h2i-aggregate-qa-checkpoint-05.py','phase-2h2i-aggregate-qa-checkpoint-05-test.py']},
        'artifactHashes':{n:a.text_sha(encode(v)) for n,v in objects.items()},'reportSha256':a.text_sha(report),'authorization':a.AUTH}
    manifest['fingerprint']=digest(manifest);objects['manifest.json']=manifest
    return {n:encode(v).encode('utf8') for n,v in objects.items()}|{'report.md':report.encode('utf8')}

def run(check=False):
    outputs=assemble()
    for name,data in outputs.items():
        path=WS/name
        if check:require(path.is_file() and path.read_bytes()==data,'Checkpoint 05 output drift: '+name)
        else:
            require(path.resolve().is_relative_to(WS.resolve()),'Unsafe artifact output')
            require(not path.exists() or path.read_bytes()==data,'Immutable checkpoint 05 output mismatch: '+name)
            if not path.exists():path.write_bytes(data)
    return {'fingerprint':load(WS/'manifest.json')['fingerprint'],'status':'PARTIAL','boundedTargetsCompleted':True,'zeroWrites':check}

def main():
    parser=argparse.ArgumentParser(description=__doc__);mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--prepare',action='store_true');mode.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.prepare:
        result=prepare()
        print('PREPARED',len(result['reviews']),len(result['coverage']),len(result['grammarCandidateKeys']),len(result['grammarInspectionKeys']),len(result['grammarBatches']))
    else:print(encode(run(args.check)))

if __name__=='__main__':main()
