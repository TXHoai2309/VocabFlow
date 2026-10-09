#!/usr/bin/env python3
"""Offline additive checkpoint-04 lineage, QA history and editorial handoff."""
import argparse
import importlib.util
import re
from collections import Counter
from pathlib import Path

spec=importlib.util.spec_from_file_location('resume',Path(__file__).with_name('phase-2h2h-bulk-500-resume.py'))
r=importlib.util.module_from_spec(spec);spec.loader.exec_module(r)
CP=r.location(4)
PARENT_PIN='7f29d6e83de770a5b2825fe9a1bf30dc164736fa2744b993e501a08cf8593b2c'


def finding_categories(q):
    # Explicit author tags and actual generated signals only; no inference about
    # old prose reviews, and no claim that a polarity signal is a translation bug.
    categories=set(re.findall(r'\[([A-Z_]+)\]',q['review']['note']))
    for signal in q['signals']:
        categories.add({'SOURCE_SIMILARITY_REVIEW':'SOURCE_SIMILARITY',
                        'DRAFT_NEAR_DUPLICATE_REVIEW':'DRAFT_NEAR_DUPLICATE',
                        'POLARITY_SIGNAL_REQUIRES_CONTEXT_REVIEW':'POLARITY_CONTEXT_SIGNAL'}.get(signal,signal))
    return sorted(categories)


def assemble():
    pins=r.load(CP/'accepted-parent-byte-pins.json');r.validate_pins(pins['files'])
    exception=pins['toolingSourceException']
    r.require(exception['path']=='scripts/phase-2h2h-checkpoint-03-test.py','Unexpected source exception')
    r.require(r.sha(r.ROOT/exception['path'])==exception['afterSha256'],'Regression source pin drift')
    core=r.run(4,True);parent=r.parent_state(4)
    r.require(parent['fingerprint']==PARENT_PIN and len(parent['records'])==1248,'Checkpoint-03 parent drift')
    effective={x['proposalKey']:x for x in r.load(CP/'effective-draft-projection.json')['records']}
    r.require(all(effective[k]==v for k,v in parent['records'].items()),'Previous 1248 records changed')
    previous=[]
    for label,path,senses,review_count in [('ORIGINAL',r.h.WS,147,16),('CHECKPOINT_02',r.location(2),148,27),('CHECKPOINT_03',r.location(3),140,57)]:
        qa=r.load(path/'quality-audit.json')['senses']
        r.require(len(qa)==senses and sum(q['aiAssessment']=='REVIEW' for q in qa)==review_count,'Prior QA count drift')
        previous.append({'checkpoint':label,'path':(path/'quality-audit.json').relative_to(r.ROOT).as_posix(),
                         'sha256':r.sha(path/'quality-audit.json'),'counts':dict(Counter(q['aiAssessment'] for q in qa)),
                         'allAssessments':{q['proposalKey']:q['aiAssessment'] for q in qa},
                         'exactReviewObjects':[q for q in qa if q['aiAssessment']=='REVIEW'],
                         'reassessed':False,'priorFindingVersionsChanged':False})
    current=r.load(CP/'quality-audit.json')['senses']
    r.require(len(current)==142 and not any(q['structuralErrors'] or q['aiAssessment']=='FAIL' for q in current),'Incomplete or critical new content')
    oldkeys={k for p in previous for k in p['allAssessments']}
    r.require(not oldkeys&{q['proposalKey'] for q in current},'QA old/new overlap')
    overlays=r.load(CP/'content-correction-overlays.json')
    findings=[]
    for q in current:
        refs=[c['correctionRef'] for c in overlays['corrections'] if c['proposalKey']==q['proposalKey']]
        if q['aiAssessment']=='REVIEW' or refs:
            findings.append({'proposalKey':q['proposalKey'],'aiAssessment':q['aiAssessment'],
                'categories':finding_categories(q),'exactFinding':q,'actualCorrectedContent':bool(refs),
                'correctionRefs':refs,'originalContentFindingVersioned':bool(refs),
                'remainingGeneratedSignals':q['signals'],
                'remainingUnresolved':'OWNER_CONTENT_IDENTITY_CLASSIFICATION_RIGHTS_REVIEW; '+
                    ('original corrected field finding is retained as historical, not asserted against the revised field' if refs else 'specific author finding or generated context signal remains for review'),
                'initialRecommendationSupersededByLexicalEvidence':q['proposalKey']=='EDITORIAL_2H2H:youth:young-person',
                'humanApproved':False})
    breakdown=Counter(category for q in current if q['aiAssessment']=='REVIEW' for category in finding_categories(q))
    history={'phase':'2H.2H-R3','coreCheckpointFingerprint':core['fingerprint'],'parentCheckpointFingerprint':PARENT_PIN,
             'previous1248ExactRecordsPreserved':True,'previousQaHistory':previous,'newFindings':findings,
             'newAllAssessments':{q['proposalKey']:q['aiAssessment'] for q in current},
             'newQaCounts':dict(Counter(q['aiAssessment'] for q in current)),
             'newReviewReasonBreakdown':dict(sorted(breakdown.items())),
             'categoryCounting':'Nonexclusive Sense counts from explicit new author tags and actual signals; corrected historical tags remain counted. No retrospective category assignment to old findings.',
             'formalHumanApproval':False,'rights':'UNKNOWN_REVIEW_REQUIRED'}
    counts=r.load(CP/'validation-summary.json')['counts'];pending=r.load(CP/'checkpoint.json')['pendingGroupKeys']
    lines=['# Phase 2H.2H-R3 — checkpoint 04 editorial handoff','',
           '142 original bilingual DRAFT Senses from the exact next 100 frozen groups; 12 field overlays and nine full-batch effective reviews. AI QA is author self-review, not owner approval.','',
           'Core checkpoint 04: `'+core['fingerprint']+'`.',
           'Parent checkpoint 03: `'+PARENT_PIN+'`.',
           'Frozen selection: `'+r.SELECTION_PIN+'`.','',
           '## Actual counts','', '```json',r.encode(counts).rstrip(),'```','',
           '## Bilingual content','',
           'report.md shows the first ten actual groups. sense-proposals.json contains every original and effective record. The following later-group examples show important boundaries:','']
    for row in r.load(CP/'sense-proposals.json')['senses']:
        if row['headword'] in {'discharge','double','youth','stricken'}:
            c=row['content'];x=c['examples'][0]
            lines+=['- **'+row['displayFormProposal']+' — '+c['senseLabelEn']+'**: '+c['definitionEn']+' / '+c['meaningVi'],
                    '  '+x['en']+' / '+x['vi']]
    lines+=['','## QA continuity and trend','',
        'Original REVIEW 16/147; checkpoint 02 REVIEW 27/148; checkpoint 03 REVIEW 57/140. Exact prior REVIEW objects and every assessment are preserved separately in qa-history.json, with source-file byte hashes. No prior category or assessment is reinterpreted.',
        'New counts and nonexclusive reason categories: `'+str(history['newQaCounts'])+'`; `'+str(history['newReviewReasonBreakdown'])+'`.',
        'Earlier checkpoints used prose findings rather than comparable category tags. The rates describe these different frozen cohorts and self-review scope; they do not establish statistical confidence or an independently measured improvement. New flags include construction/POS uncertainty, source-similarity/context signals and historical findings whose affected content was corrected. Rights and canonical identity remain unresolved for every Sense.','']
    for f in findings:
        lines+=['- `'+f['proposalKey']+'`: '+f['aiAssessment']+'; '+', '.join(f['categories'])+
                '; original finding: '+f['exactFinding']['review']['note']+
                (' Versioned correction refs: '+', '.join(f['correctionRefs'])+'. Read effectiveReReview for the revised finding; the original is historical.' if f['actualCorrectedContent'] else '')]
    lines+=['','## Lexical evidence and corrections','',
        'Full-page opens for gallon, war, discharge and double returned 403. Only the actual accessible search-returned text/extracts are claimed as evidence. No dictionary expressive wording or examples were copied; no rights clearance is inferred.','']
    for item in r.load(CP/'authored/fact-verification.json')['checks']:
        lines+=['- ['+item['headword']+']('+item['url']+'): '+item['finding']]
    lines+=['','The initial youth review proposed gender-neutral Vietnamese. Later accessible lexical evidence established the countable male boundary, superseding that recommendation. The original finding is retained; three field overlays align definition, gloss and grammar. Collective youth stays inclusive.','',
        '## Preservation and validation','',
        'All prior 1,248 exact records, checkpoints 01–03, DRAFT V2 corrections, prior QA/human ledgers and Hybrid 2.2.1 87 Lexemes/100 Senses remain pinned. Generic continuation and checkpoint-03 handoff source remain byte-identical. The sole prior source exception removes an obsolete absence assertion from a regression test while retaining its real before/after zero-write comparison.',
        'External tests/typecheck/lint/replays are recorded only after execution in verification-results.json. The assembler does not run those external checks. All records remain DRAFT, UNKNOWN_REVIEW_REQUIRED; owner approvals/canonical IDs added zero. No runtime, database, legacy or Production operations.','',
        '## Exact next resume instructions','',
        'After separate Phase 2H.2H-R4 authorization: `python -B scripts/phase-2h2h-bulk-500-resume.py --prepare --checkpoint 5`; use that persisted receipt, then author/review/seal batches 081–100. Do not reselect or modify checkpoints 01–04. This run does not prepare checkpoint 05.','',
        'Remaining 100 keys in frozen order:','']
    lines+=['- `'+k+'`' for k in pending];lines.append('')
    report='\n'.join(lines)
    manifest={'coreCheckpointFingerprint':core['fingerprint'],'parentCheckpointFingerprint':PARENT_PIN,
              'acceptedParentPinsHash':r.sha(CP/'accepted-parent-byte-pins.json'),
              'files':['qa-history.json','editorial-handoff.md','accepted-parent-byte-pins.json'],
              'fingerprint':r.digest({'history':history,'report':report,'acceptedParentPinsHash':r.sha(CP/'accepted-parent-byte-pins.json')})}
    return {'qa-history.json':history,'handoff-manifest.json':manifest},report


def run(check=False):
    objects,report=assemble()
    r.h.write_snapshot({**{CP/n:r.encode(v) for n,v in objects.items()},CP/'editorial-handoff.md':report},check)
    return objects['handoff-manifest.json']['fingerprint']


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--check',action='store_true')
    print(run(parser.parse_args().check))
