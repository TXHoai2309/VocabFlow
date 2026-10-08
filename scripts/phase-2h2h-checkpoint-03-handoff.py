#!/usr/bin/env python3
"""Read-only lineage verification and additive checkpoint-03 QA handoff.

No authoring, approval, database or network capability. Core replay remains
the accepted continuation CLI; this sidecar does not rewrite its snapshots.
"""
import argparse
import importlib.util
from pathlib import Path

spec=importlib.util.spec_from_file_location('resume',Path(__file__).with_name('phase-2h2h-bulk-500-resume.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
CP=r.location(3)
PARENT_PIN='d9a2fbaf95ae482131051e9bb755304c146f56437d22e311026d961d1f338363'


def assemble():
    pins=r.load(CP/'accepted-parent-byte-pins.json')
    r.validate_pins(pins['files'])
    exception=pins['toolingSourceException']
    r.require(exception['path']=='scripts/phase-2h2h-bulk-500-resume-test.py','Unexpected source exception')
    r.require(r.sha(r.ROOT/exception['path'])==exception['afterSha256'],'Test source drift')
    core=r.run(3,True)
    parent=r.parent_state(3)
    r.require(parent['fingerprint']==PARENT_PIN and len(parent['records'])==1108,'Checkpoint-02 parent drift')
    projection=r.load(CP/'effective-draft-projection.json')
    effective={x['proposalKey']:x for x in projection['records']}
    r.require(all(effective[k]==v for k,v in parent['records'].items()),'Previous 1108 records changed')
    prior=r.load(r.location(2)/'quality-audit.json')['senses']
    previous_flags=[x for x in prior if x['aiAssessment']=='REVIEW']
    r.require(len(previous_flags)==27,'Previous REVIEW count drift')
    current=r.load(CP/'quality-audit.json')['senses']
    current_keys={x['proposalKey'] for x in current}
    r.require(not current_keys & {x['proposalKey'] for x in prior},'Old/new QA keys overlap')
    r.require(not any(x['aiAssessment']=='FAIL' or x['structuralErrors'] for x in current),'Unresolved critical new content')
    evidence_names=[
        'master-editorial-draft-pilot/pilot-quality-audit.json',
        'master-editorial-quality-corrections/correction-quality-audit.json',
        'master-editorial-stratified-120/quality-audit.json',
        'master-editorial-bulk-300/quality-audit.json',
        'master-editorial-draft-v2-session-01/quality-audit.json',
        'master-editorial-bulk-500/quality-audit.json',
        'master-editorial-bulk-500-resume/checkpoints/checkpoint-02/quality-audit.json']
    base=r.ROOT/'vocabflow-dataset/workspaces'
    history={'phase':'2H.2H-R2','coreCheckpointFingerprint':core['fingerprint'],
        'parentCheckpointFingerprint':PARENT_PIN,
        'previous1108ExactRecordsPreserved':True,'previousFindingsReassessed':False,
        'previousCheckpoint02ReviewFlags':previous_flags,
        'previousCheckpoint02AllAssessments':{x['proposalKey']:x['aiAssessment'] for x in prior},
        'newCheckpoint03ReviewFindings':[x for x in current if x['aiAssessment']=='REVIEW'],
        'priorQaEvidence':[{'path':(base/n).relative_to(r.ROOT).as_posix(),'sha256':r.sha(base/n)} for n in evidence_names],
        'formalHumanApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'}
    counts=r.load(CP/'validation-summary.json')['counts']
    pending=r.load(CP/'checkpoint.json')['pendingGroupKeys']
    overlays=r.load(CP/'content-correction-overlays.json')
    lines=['# Phase 2H.2H-R2 editorial handoff','',
        'This checkpoint adds exactly 100 frozen pending groups. All content remains DRAFT; AI self-review is not owner approval.','',
        'Frozen selection: `'+r.SELECTION_PIN+'`.',
        'Original checkpoint: `'+r.ORIGINAL_PIN+'`.',
        'Parent checkpoint 02: `'+PARENT_PIN+'`.',
        'Core checkpoint 03: `'+core['fingerprint']+'`.','',
        '## Actual coverage','', '```json',r.encode(counts).rstrip(),'```','',
        'See report.md for concrete bilingual previews and source/POS/CEFR distribution. See sense-proposals.json for every definition, gloss, example and grammar note. CEFR evidence is not an approved Sense classification.','',
        '## Previous and new QA findings','',
        'All 27 checkpoint-02 REVIEW objects are reproduced exactly in qa-history.json, separately from the following new findings. Its priorQaEvidence links retain older reviews and DRAFT V2 correction findings. None has been promoted or silently re-reviewed.','']
    for q in history['newCheckpoint03ReviewFindings']:
        applied=q['review'].get('correctionRefs',[])
        lines+=['- `'+q['proposalKey']+'`: Retained original AI finding: '+q['review']['note']+
                (' Applied and re-reviewed overlays: '+', '.join(applied)+'. REVIEW is retained for unresolved content/identity scope.' if applied else '')+
                (' Generated signals: '+', '.join(q['signals'])+'.' if q['signals'] else '')]
    lines+=['','## Corrections and re-review','',
        str(len(overlays['corrections']))+' exact-parent field overlays; '+str(len(overlays['reReviewedBatches']))+' entire affected batches re-reviewed. BEFORE/AFTER, field hashes, correction refs and reviewed effective hashes are retained. Original manuscripts remain byte-identical. New unresolved REVIEW assessments are retained after corrections.','',
        '## Primary fact and lexical checks','']
    for item in r.load(CP/'authored/fact-verification.json')['checks']:
        lines+=['- ['+item['headword']+']('+item['url']+'): '+item['finding']]
    lines+=['','## Preservation and limits','',
        'Original 100-group snapshot, checkpoint 02, all 1,108 parent effective records, DRAFT V2 overlays, human ledgers and frozen Hybrid 2.2.1 remain unchanged. The only prior tooling source correction makes the read-only regression test check actual no-write behaviour when an authorized checkpoint 03 already exists.',
        'No database access/writes, runtime mapping, legacy cleanup, owner approvals, canonical IDs or Production operations. External validation evidence is recorded separately in verification-results.json; neither assembler executes external tests, tsc or lint.','',
        '## Remaining pending groups','',str(len(pending))+' keys remain, in frozen order:','']
    lines += ['- `'+k+'`' for k in pending]
    lines+=['','## Next separately authorized continuation','',
        '`python -B scripts/phase-2h2h-bulk-500-resume.py --prepare --checkpoint 4` will freeze the next 100 keys after verifying the full chain. Author/review batches 061–080 and seal explicit decisions, then assemble/check checkpoint 04. No checkpoint-04 file is created by this handoff.','']
    report='\n'.join(lines)
    objects={'qa-history.json':history}
    sidecar={'coreCheckpointFingerprint':core['fingerprint'],'parentCheckpointFingerprint':PARENT_PIN,
        'files':['qa-history.json','editorial-handoff.md','accepted-parent-byte-pins.json'],
        'acceptedParentPinsHash':r.sha(CP/'accepted-parent-byte-pins.json'),
        'fingerprint':r.digest({'history':history,'report':report,'acceptedParentPinsHash':r.sha(CP/'accepted-parent-byte-pins.json')})}
    objects['handoff-manifest.json']=sidecar
    return objects,report


def run(check=False):
    objects,report=assemble()
    r.h.write_snapshot({**{CP/n:r.encode(v) for n,v in objects.items()},CP/'editorial-handoff.md':report},check)
    return objects['handoff-manifest.json']['fingerprint']


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true')
    print(run(parser.parse_args().check))
