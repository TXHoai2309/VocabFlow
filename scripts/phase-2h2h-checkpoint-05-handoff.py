#!/usr/bin/env python3
"""Terminal frozen bulk-500 integrity and cumulative QA handoff; offline only."""
import argparse
import importlib.util
from collections import Counter
from pathlib import Path

spec=importlib.util.spec_from_file_location('resume',Path(__file__).with_name('phase-2h2h-bulk-500-resume.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
CP=r.location(5)
PARENT_PIN='94166e0c8a0586317a82047c717895ae25968b522fa2a37ca342b1f5da9f7560'
PREVIOUS=[('ORIGINAL',r.h.WS,147,16),('CHECKPOINT_02',r.location(2),148,27),('CHECKPOINT_03',r.location(3),140,57),('CHECKPOINT_04',r.location(4),142,30)]


def assemble():
    pins=r.load(CP/'accepted-parent-byte-pins.json');r.validate_pins(pins['files'])
    e=pins['toolingSourceException']
    r.require(e['path']=='scripts/phase-2h2h-checkpoint-04-test.py' and r.sha(r.ROOT/e['path'])==e['afterSha256'],'Regression source exception drift')
    core=r.run(5,True);parent=r.parent_state(5)
    r.require(parent['fingerprint']==PARENT_PIN and len(parent['records'])==1390,'Checkpoint-04 parent drift')
    checkpoint=r.load(CP/'checkpoint.json');counts=r.load(CP/'validation-summary.json')['counts']
    selected=r.load(r.h.WS/'selected-cohort.json')['groups'];selected_keys={g['candidateGroupKey'] for g in selected}
    completed=checkpoint['completedGroupKeys']
    r.require(len(completed)==500 and len(set(completed))==500 and set(completed)==selected_keys,'Frozen cohort incomplete or foreign')
    r.require(not checkpoint['pendingGroupKeys'] and checkpoint['nextCheckpointNumber'] is None and checkpoint['lastBatch']==100,'Terminal state drift')
    r.require(counts['totalCorpusGroups']==1020 and counts['remainingCorpusGroups']==5123 and counts['newSenses']==173,'Corpus count drift')
    effective={x['proposalKey']:x for x in r.load(CP/'effective-draft-projection.json')['records']}
    r.require(all(effective[k]==v for k,v in parent['records'].items()),'Previous 1390 exact records changed')
    history=[];coverage=[];cohort_senses=[]
    for label,path,n,review_count in PREVIOUS+[('CHECKPOINT_05',CP,173,None)]:
        quality=r.load(path/'quality-audit.json');qa=quality['senses'];rows=r.load(path/'sense-proposals.json')['senses']
        r.require(len(qa)==n and len(rows)==n,'Sense/QA scope drift '+label)
        if review_count is not None:r.require(sum(q['aiAssessment']=='REVIEW' for q in qa)==review_count,'Prior REVIEW drift '+label)
        r.require(not any(q['aiAssessment']=='FAIL' or q['structuralErrors'] for q in qa),'Critical content failure '+label)
        history.append({'checkpoint':label,'sourcePath':(path/'quality-audit.json').relative_to(r.ROOT).as_posix(),'sourceSha256':r.sha(path/'quality-audit.json'),'counts':dict(Counter(q['aiAssessment'] for q in qa)),'allAssessments':{q['proposalKey']:q['aiAssessment'] for q in qa},'exactUnresolvedReviewRecords':[q for q in qa if q['aiAssessment']=='REVIEW'],'reassessed':False,'humanApproval':False})
        coverage+=quality['boundaryCoverage'];cohort_senses+=rows
    r.require(len(coverage)==500 and {x['candidateGroupKey'] for x in coverage}==selected_keys,'Coverage decomposition incomplete')
    r.require(len({x['proposalKey'] for x in cohort_senses})==750,'Duplicate or missing cohort Sense')
    bygroup={g['candidateGroupKey']:g for g in selected};coverage_rows=[]
    explicit_gaps={'NORMALIZED_HEADWORD:fiery':'Literal burning boundary in 4600 is not yet represented; emotional intensity is a separate draft proposal.','NORMALIZED_HEADWORD:harness':'Horse-equipment boundary suggested by source example remains unrepresented.'}
    for c in coverage:
        key=c['candidateGroupKey'];g=bygroup[key]
        pos=sorted({x['partOfSpeechProposal'] for x in cohort_senses if x['candidateGroupKey']==key})
        missing=sorted(set(c['supportedOrdinals'])-set(c['representedOrdinals']))
        missing_pos=sorted(set(g['normalizedPosCandidates'])-set(pos))
        warnings=[]
        if missing:warnings.append('SOURCE_ORDINALS_NOT_REPRESENTED')
        if missing_pos:warnings.append('SOURCE_POS_NOT_REPRESENTED_OR_CONFLICTING')
        if not c['supportedOrdinals']:warnings.append('NO_STRUCTURED_SENSE_ORDINALS_EXHAUSTIVENESS_UNKNOWN')
        if key in explicit_gaps:warnings.append('EXPLICIT_UNREPRESENTED_MEANING')
        coverage_rows.append({'candidateGroupKey':key,'supportedOrdinals':c['supportedOrdinals'],'representedOrdinals':c['representedOrdinals'],'missingOrdinals':missing,'sourcePosCandidates':g['normalizedPosCandidates'],'representedPos':pos,'missingOrConflictingPos':missing_pos,'warnings':warnings,'explicitGap':explicit_gaps.get(key),'senseCoverageApproved':False,'limitation':'Source ordinal/POS coverage is evidence, never proof that every real meaning is covered.'})
    allreviews=[{'checkpoint':item['checkpoint'],'record':q} for item in history for q in item['exactUnresolvedReviewRecords']]
    qa_counts=Counter()
    for item in history:qa_counts.update(item['counts'])
    overlays=[]
    for label,path,_,_ in PREVIOUS+[('CHECKPOINT_05',CP,173,None)]:
        p=path/'content-correction-overlays.json'
        if p.exists():overlays.append({'checkpoint':label,'path':p.relative_to(r.ROOT).as_posix(),'sha256':r.sha(p),'exactCorrectionHistory':r.load(p)})
    history_obj={'phase':'2H.2H-R4','checkpoints':history,'cumulativeCohortQaCounts':dict(qa_counts),'allUnresolvedReviewRecords':allreviews,'correctionHistory':overlays,'formalHumanApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED','limitation':'Counts describe AI author self-review of different cohorts, not independent quality estimates. Old findings and corrected historical versions are retained verbatim; they are not silently cleared.'}
    integrity={'phase':'2H.2H-R4','status':'PASS_DRAFT_COHORT_COMPLETE','coreFingerprint':core['fingerprint'],'frozenSelectionFingerprint':r.SELECTION_PIN,'parentCheckpointFingerprint':PARENT_PIN,'counts':counts,'cohortSenseCount':len(cohort_senses),'uniqueFrozenGroupCount':len(completed),'pendingGroupCount':0,'previous1390ExactRecordsPreserved':True,'previousCheckpointsUnchanged':True,'coverage':coverage_rows,'coverageWarningGroups':sum(bool(c['warnings']) for c in coverage_rows),'cumulativeQaCounts':dict(qa_counts),'unresolvedReviewCount':len(allreviews),'nextCheckpointNumber':None,'nextProposedPhase':'2H.2I — Aggregate QA and Sense Coverage Audit','nextPhaseAuthorized':False,'databaseAccess':'NONE','databaseWrites':'NONE','production':'UNTOUCHED','humanApprovalsAdded':0,'canonicalIdsAllocated':0,'rightsClearanceAdded':0,'releaseEligible':False,'contentStatus':'DRAFT','rights':'UNKNOWN_REVIEW_REQUIRED'}
    lines=['# Frozen bulk-500 — final checkpoint 05 cohort handoff','','500/500 frozen groups authored; zero pending. This is a DRAFT content milestone, not owner content approval, rights clearance or an exhaustive Sense inventory.','',
           'Core fingerprint: `'+core['fingerprint']+'`.', 'Frozen selection: `'+r.SELECTION_PIN+'`.', 'Remote parent: `'+pins['remoteParent']+'`.','',
           '## Counts','', '```json',r.encode(counts).rstrip(),'```','',
           'The cohort contains 750 Sense drafts across checkpoints 01–05. All previous 1,390 corpus records remain exact; 173 new Senses bring the full corpus to 1,563. There are 1,020 authored corpus groups and 5,123 groups outside this authored corpus.','',
           '## Cumulative QA and unresolved records','',
           '`'+str(dict(qa_counts))+'`. AI author self-review only. No human reviews or approvals manufactured. All prior REVIEW objects (16/27/57/30) and every checkpoint assessment are preserved with source hashes in cumulative-qa-history.json. Corrections retain original findings and are not retroactive PASS promotions.','']
    for item in history:lines.append('- '+item['checkpoint']+': '+str(item['counts']))
    lines+=['','Every unresolved REVIEW record is included in full in cumulative-qa-history.json. The following index is exhaustive for all five checkpoints:','']
    for item in allreviews:
        q=item['record'];lines.append('- '+item['checkpoint']+' `'+q['proposalKey']+'`: '+q['review']['note'])
    lines+=['','## Sense Coverage warnings','',
        'Every frozen group has a coverage row in cohort-integrity.json. Missing Oxford ordinals, source POS conflicts and absent structured ordinals remain warnings. Even matching all ordinals does not prove lexical exhaustiveness. Explicit new gaps: fiery literal burning; harness horse-equipment use. These are handoff findings, not silently approved omissions.','']
    for c in coverage_rows:
        if c['warnings']:lines.append('- `'+c['candidateGroupKey']+'`: '+', '.join(c['warnings'])+'; missing ordinals '+str(c['missingOrdinals'])+'; missing/conflicting POS '+str(c['missingOrConflictingPos'])+('. '+c['explicitGap'] if c['explicitGap'] else ''))
    lines+=['','## Corrections and source evidence','',
        'Three additive field overlays preserve every original manuscript: singular all-degree example and its Vietnamese translation; explicitly qualified avoirdupois-pound grammar. All Senses in batches 082 and 099 were rereviewed. Prior correction ledgers remain byte-identical. Full-page Cambridge opens for weave/ton/turbine/withdrawal failed with 403; only actual search-returned text and pinned local source evidence are claimed. Detailed corroboration and limits are in authored/fact-verification.json.','',
        '## Terminal boundary and preservation','',
        'Checkpoint 05 has nextCheckpointNumber=null and no pending keys. The unchanged generic report.md contains historical continuation boilerplate mentioning checkpoint 6; it is inapplicable here, and the CLI rejects checkpoint 6. Do not run it or select another cohort. The authoritative terminal state and this handoff supersede that generic continuation text.','',
        'STOP after publication of this handoff. Proposed next phase: 2H.2I — Aggregate QA and Sense Coverage Audit, requiring separate authorization. No formal approval cycle or database import is authorized.','',
        'Checkpoints 01–04, prior 1,390 records, all correction/QA history and Hybrid-100 2.2.1 (87 Lexemes / 100 Senses) remain pinned. One regression-test source exception replaces an obsolete future-checkpoint absence assertion with a real read-only before/after hash check. Generic generation/sealing and prior handoff sources remain unchanged.','',
        'All content remains DRAFT, rights UNKNOWN_REVIEW_REQUIRED, canonical IDs and runtime mappings unresolved. No Neon/DB access or writes, Master release or legacy changes, or Production operations. External tests, command results and Git safety are separately recorded only after execution in verification-results.json.','']
    report='\n'.join(lines)
    objects={'cohort-integrity.json':integrity,'cumulative-qa-history.json':history_obj}
    manifest={'coreFingerprint':core['fingerprint'],'frozenSelectionFingerprint':r.SELECTION_PIN,'acceptedParentPinsSha256':r.sha(CP/'accepted-parent-byte-pins.json'),'fingerprint':r.digest({'artifacts':objects,'report':report,'acceptedParentPinsSha256':r.sha(CP/'accepted-parent-byte-pins.json')})}
    objects['final-handoff-manifest.json']=manifest
    return objects,report


def run(check=False):
    objects,report=assemble()
    r.h.write_snapshot({**{CP/n:r.encode(v) for n,v in objects.items()},CP/'final-cohort-handoff.md':report},check)
    return objects['final-handoff-manifest.json']['fingerprint']


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true')
    print(run(parser.parse_args().check))
