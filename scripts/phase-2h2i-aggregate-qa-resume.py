#!/usr/bin/env python3
"""Additive aggregate-QA checkpoint 02; offline, persisted inspection only."""
import argparse
import importlib.util
import re
from collections import Counter
from pathlib import Path

spec = importlib.util.spec_from_file_location('aggregate_parent', Path(__file__).with_name('phase-2h2i-aggregate-qa.py'))
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)
ROOT = a.ROOT
PARENT = a.WS
WS = ROOT/'vocabflow-dataset/workspaces/master-editorial-aggregate-qa-resume/checkpoints/checkpoint-02'
PIN = '3d29083983cf033b4463d33c7a8ea3bd9337c209e0a5f236167c116a0852b5ce'
BASELINE = '3ad14d262e56dd09883ec67a51e7b1a407ecea0e'
load, encode, digest, sha, require = a.load, a.encode, a.digest, a.sha, a.require
PATTERNS = [r'\bthis record\b', r'\bin this record\b', r'\bsource\b', r'\bcanonical\b',
            r'\bidentity\b', r'\bowner\b', r'\bunresolved\b', r'\bpropos\w*',
            r'\bmetadata\b', r'\bordinal\b', r'\bclassification\b']


def parents():
    require(a.run(True)['fingerprint'] == PIN, 'Accepted parent fingerprint drift')
    index = a.unique(load(PARENT/'effective-sense-index.json')['records'], 'proposalKey')
    reviews = load(PARENT/'review-triage.json')['records']
    coverage = load(PARENT/'sense-coverage-audit.json')['groups']
    proposals = load(PARENT/'correction-proposals.json')
    require(len(index)==1563 and len(reviews)==187 and len(coverage)==500, 'Parent inventory drift')
    require(sum(r['status']=='TRIAGED' for r in reviews)==25 and
            sum(r['status']=='ASSESSED' for r in coverage)==17, 'Parent completion drift')
    require(len(proposals['records'])==20 and len(proposals['additionalBoundaryProposals'])==5,
            'Parent proposal scope drift')
    return index, reviews, coverage, proposals


def scan(index):
    candidates = []
    for key, row in index.items():
        note = row['content']['grammarNotesEn']
        matches = [p for p in PATTERNS if re.search(p, note, re.I)]
        if matches:
            candidates.append({'proposalKey': key, 'effectiveContentHash': row['effectiveContentHash'],
                'matchedPatterns': matches, 'score': len(matches), 'grammarNoteSha256': a.text_sha(note),
                'origin': row['origin'], 'status': 'CANDIDATE_ONLY_NOT_CONFIRMED',
                'contentReference': {'path': row['effectiveContentPath'], 'jsonPointer': row['jsonPointer']}})
    return sorted(candidates, key=lambda x: (-x['score'], x['proposalKey']))


def selection(index, reviews, coverage, proposals):
    review_scope = [{'inventoryOrdinal': r['inventoryOrdinal'],
                     'proposalKey': r['originalReview']['record']['proposalKey'],
                     'effectiveContentHash': r['effectiveContentHash']} for r in reviews if r['status']=='PENDING'][:40]
    pending = [(i,r) for i,r in enumerate(coverage) if r['status']=='PENDING']
    pending.sort(key=lambda item: (not bool(item[1]['originalWarningRecord']['warnings']),
                                  -len(item[1]['originalWarningRecord']['missingOrdinals']),
                                  -len(item[1]['originalWarningRecord']['missingOrConflictingPos']), item[0]))
    coverage_scope = [{'originalGroupOrdinal': i, 'candidateGroupKey': r['candidateGroupKey'],
        'effectiveContentHashes': {k:v['effectiveContentHash'] for k,v in index.items()
                                  if v['candidateGroupKey']==r['candidateGroupKey']},
        'originalWarnings': r['originalWarningRecord']['warnings']} for i,r in pending[:75]]
    known = {p['proposalKey'] for p in proposals['records']}
    candidates = [x for x in scan(index) if x['proposalKey'] not in known]
    prior = [x for x in candidates if x['origin']=='EDITORIAL_2H2C'][:1]
    cohort = [x for x in candidates if index[x['proposalKey']]['cohort']][:2]
    seeds = prior+cohort
    sources = [('EDITORIAL_2H2C', ROOT/'vocabflow-dataset/workspaces/master-editorial-stratified-120'),
               ('ORIGINAL', ROOT/'vocabflow-dataset/workspaces/master-editorial-bulk-500')]+[
               ('CHECKPOINT_0'+str(n), ROOT/('vocabflow-dataset/workspaces/master-editorial-bulk-500-resume/checkpoints/checkpoint-0'+str(n)))
               for n in range(2,6)]
    byorigin = {origin:(path,load(path/'sense-proposals.json')['senses']) for origin,path in sources}
    batches = []
    for seed in seeds:
        path, rows = byorigin[seed['origin']]
        raw = next(r for r in rows if r['proposalKey']==seed['proposalKey'])
        name = raw['authoredSource']['path']
        members = [r['proposalKey'] for r in rows if r['authoredSource']['path']==name]
        batch_path = (path/name).relative_to(ROOT).as_posix()
        if not any(b['path']==batch_path for b in batches):
            batches.append({'path': batch_path, 'sha256': sha(ROOT/batch_path), 'triggerProposalKey':seed['proposalKey'],
                'inspectionKeys': members, 'effectiveContentHashes': {k:index[k]['effectiveContentHash'] for k in members},
                'scope': 'ENTIRE_ORIGINAL_AUTHORED_BATCH; LATEST_EFFECTIVE_CONTENT'})
    return {'phase':'2H.2I-R1','checkpointNumber':2,'parentFingerprint':PIN,'remoteBaseline':BASELINE,
            'reviewRule':'NEXT_40_PENDING_IN_ACCEPTED_ORIGINAL_INVENTORY_ORDER', 'reviews':review_scope,
            'coverageRule':'FLAGGED_FIRST; MISSING_ORDINAL_COUNT_DESC; MISSING_OR_CONFLICTING_POS_COUNT_DESC; ACCEPTED_ORIGINAL_GROUP_ORDINAL_ASC',
            'coverage':coverage_scope,'unflaggedGroupsRemainEligibleForLaterAudit':True,
            'grammarRule':'SCAN_ALL_1563; EXCLUDE_ALREADY_PROPOSED_FIELDS_FOR_SEEDS; HIGHEST_SCORED_PRIOR_STRATIFIED120_ONE_AND_COHORT_TWO; THEN_INSPECT_THEIR_ENTIRE_ORIGINAL_BATCHES',
            'grammarSeedKeys':[x['proposalKey'] for x in seeds], 'grammarBatches':batches,
            'grammarInspectionKeys':list(dict.fromkeys(k for b in batches for k in b['inspectionKeys'])),
            'candidateScanCount':len(scan(index)), 'linguisticDecisionsGenerated':False}


def prepare():
    index, reviews, coverage, proposals = parents()
    receipt = selection(index,reviews,coverage,proposals)
    inherited = load(PARENT/'accepted-input-pins.json')['files']
    paths = [ROOT/'scripts/phase-2h2i-aggregate-qa.py', ROOT/'scripts/phase-2h2i-aggregate-qa-test.py', a.REPORT]+[
        p for p in PARENT.rglob('*') if p.is_file()]
    pins = {'parentFingerprint':PIN, 'remoteBaseline':BASELINE,
            'inheritedPinsReference':{'path':(PARENT/'accepted-input-pins.json').relative_to(ROOT).as_posix(),
                                      'sha256':sha(PARENT/'accepted-input-pins.json')},
            'additiveParentFiles':{p.relative_to(ROOT).as_posix():sha(p) for p in sorted(paths)},
            'previousFileCount':len(inherited)+len(paths)}
    WS.mkdir(parents=True,exist_ok=True)
    (WS/'authored').mkdir(exist_ok=True)
    for name, obj in [('resume-selection-receipt.json',receipt),('accepted-parent-pins.json',pins)]:
        p = WS/name
        if p.exists():
            require(p.read_bytes()==encode(obj).encode('utf8'), 'Prepared immutable input drift '+name)
        else:
            p.write_text(encode(obj),encoding='utf8',newline='\n')
    return receipt


def reference(path, pointer=None):
    result={'path':path.relative_to(ROOT).as_posix(),'sha256':sha(path)}
    if pointer is not None:
        result['jsonPointer']=pointer
    return result


def validate_decisions(index, receipt, review, coverage, grammar, proposals):
    rd=a.unique(review['records'],'proposalKey')
    require(list(rd)==[r['proposalKey'] for r in receipt['reviews']], 'Review scope or ordering drift')
    for selected, row in zip(receipt['reviews'], rd.values()):
        a.check_bound(row,index)
        require(row['inventoryOrdinal']==selected['inventoryOrdinal'] and row['status']=='TRIAGED', 'Review identity/status drift')
        require(row['explanationVi'] and row['categories'] and row.get('ownerApproval',False) is False
                and row.get('humanApproval',False) is False,
                'Missing inspection or invented approval')
    cd=a.unique(coverage['records'],'candidateGroupKey')
    require(list(cd)==[r['candidateGroupKey'] for r in receipt['coverage']], 'Coverage scope or ordering drift')
    classes={'CONFIRMED_GAP','POSSIBLE_GAP','SOURCE_METADATA_CONFLICT','COVERAGE_UNKNOWN','NO_IDENTIFIED_SOURCE_SUPPORTED_GAP'}
    for selected,row in zip(receipt['coverage'],cd.values()):
        require(row['effectiveContentHashes']==selected['effectiveContentHashes'], 'Coverage hash drift')
        require(set(row['inspectedProposalKeys'])==set(selected['effectiveContentHashes']), 'Coverage missing Sense inspection')
        senses=[v for v in index.values() if v['candidateGroupKey']==row['candidateGroupKey']]
        require(row['sourceEvidence']==[v['sourceEvidence'] for v in senses], 'Coverage source evidence drift')
        require(row['classification'] in classes and row['status']=='ASSESSED' and row['explanationVi']
                and row['exhaustiveLexicalCoverage'] is False and row['ownerApproval'] is False, 'Invalid coverage assessment')
    batches=receipt['grammarBatches']+grammar['additionalEscalatedBatches']
    keys=list(dict.fromkeys(k for b in batches for k in b['inspectionKeys']))
    gr=a.unique(grammar['records'],'proposalKey')
    require(list(gr)==keys, 'Full affected batch inspections missing')
    for batch in batches:
        require(sha(ROOT/batch['path'])==batch['sha256'], 'Inspected manuscript changed')
        # Check membership against the accepted source proposals, not just the receipt.
        workspace=(ROOT/batch['path']).parent.parent
        source=load(workspace/'sense-proposals.json')['senses']
        actual=[r['proposalKey'] for r in source if r['authoredSource']['path']=='authored/'+Path(batch['path']).name]
        require(actual==batch['inspectionKeys'], 'Affected batch member scope drift')
        require(batch['effectiveContentHashes']=={k:index[k]['effectiveContentHash'] for k in actual}, 'Batch content drift')
    for row in gr.values():
        a.check_bound(row,index)
        require(row['grammarNoteSha256']==a.text_sha(index[row['proposalKey']]['content']['grammarNotesEn']), 'Grammar field hash drift')
        require(set(row['inspectedFields'])==set(index[row['proposalKey']]['content']), 'Incomplete grammar content inspection')
        require(row['classification'] in {'CONFIRMED_PROCESS_COMMENTARY','POSSIBLE_PROCESS_COMMENTARY','VALID_LEARNER_GRAMMAR_NOTE','INSUFFICIENT_CONTEXT'}
                and row['explanationVi'] and row['ownerApproval'] is False, 'Invalid grammar decision')
    parent_props=load(PARENT/'correction-proposals.json')
    ids={p['correctionProposalId'] for p in parent_props['records']}
    for p in proposals['records']:
        a.validate_proposal(p,index)
        require(p['correctionProposalId'] not in ids, 'Duplicate proposal ID')
        ids.add(p['correctionProposalId'])
        require(gr[p['proposalKey']]['classification']=='CONFIRMED_PROCESS_COMMENTARY','Unconfirmed field proposal')
        require(p['rationaleVi'] and p['relatedFieldImpact'] and p['evidenceScope'],'Missing proposal evidence')
    require({p['proposalKey'] for p in proposals['records']}=={k for k,v in gr.items() if v['classification']=='CONFIRMED_PROCESS_COMMENTARY'}, 'Confirmed issue lacks proposal')
    boundary_ids=set()
    for p in proposals['additionalBoundaryProposals']:
        require(p['boundaryProposalId'] not in boundary_ids,'Duplicate boundary ID')
        boundary_ids.add(p['boundaryProposalId'])
        require(cd[p['candidateGroupKey']]['classification']=='CONFIRMED_GAP','Unconfirmed boundary')
        require(p['canonicalId'] is None and p['proposalKeyAllocated'] is False and p['applied'] is False
                and p['approved'] is False and p['ownerApproval'] is False and p['rights']=='UNKNOWN_REVIEW_REQUIRED'
                and p['sourceOrdinalAllocated'] is False and p['approvedCefrAllocated'] is False,'Unauthorized boundary approval')
        require(p['supportingExistingContentHashes']==cd[p['candidateGroupKey']]['effectiveContentHashes'],'Boundary parent hash drift')
        senses=[v for v in index.values() if v['candidateGroupKey']==p['candidateGroupKey']]
        require(p['sourceEvidence']==[{'proposalKey':v['proposalKey'],'sourceEvidence':v['sourceEvidence']} for v in senses], 'Boundary source evidence drift')
        require(all(p['content'].get(k) for k in ['definitionEn','meaningVi','examples','grammarNotesEn','senseLabelEn']), 'Incomplete proposed boundary')
    return rd,cd,gr,batches


def assemble():
    index,reviews,coverage,old_proposals=parents()
    pins=load(WS/'accepted-parent-pins.json')
    require(pins['parentFingerprint']==PIN,'Parent pin mismatch')
    require(sha(ROOT/pins['inheritedPinsReference']['path'])==pins['inheritedPinsReference']['sha256'],'Inherited pin reference drift')
    a.validate_pins(pins['additiveParentFiles'])
    receipt=load(WS/'resume-selection-receipt.json')
    require(receipt==selection(index,reviews,coverage,old_proposals),'Prepared selection drift')
    names=['review-decisions-batch-002.json','coverage-decisions-batch-002.json','expanded-grammar-inspections.json','new-correction-proposals.json','fact-verification.json']
    authored={name:load(WS/'authored'/name) for name in names}
    rd,cd,gr,batches=validate_decisions(index,receipt,*(authored[n] for n in names[:4]))
    rrows=[]
    for i,row in enumerate(reviews):
        key=row['originalReview']['record']['proposalKey'];new=key in rd
        rrows.append({'proposalKey':key,'effectiveContentHash':row['effectiveContentHash'],'historicalReviewStatus':'REVIEW',
                      'originalRecord':reference(PARENT/'review-triage.json',f'/records/{i}'),
                      'status':'TRIAGED' if new else row['status'],
                      'newDecision':reference(WS/'authored'/names[0],f'/records/{list(rd).index(key)}') if new else None})
    crows=[]
    for i,row in enumerate(coverage):
        key=row['candidateGroupKey'];new=key in cd
        crows.append({'candidateGroupKey':key,'originalRecord':reference(PARENT/'sense-coverage-audit.json',f'/groups/{i}'),
                      'originalWarnings':row['originalWarningRecord']['warnings'],'status':'ASSESSED' if new else row['status'],
                      'newDecision':reference(WS/'authored'/names[1],f'/records/{list(cd).index(key)}') if new else None})
    candidates=scan(index)
    # Additional patterns catch wording found during actual coverage inspection.
    extended_patterns=[r'\bthis draft\b',r'\bno .{0,40}proposed\b',r'\bno dose is specified here\b']
    extended=[{'proposalKey':k,'effectiveContentHash':v['effectiveContentHash'],'matchedPatterns':[p for p in extended_patterns if re.search(p,v['content']['grammarNotesEn'],re.I)],'status':'CANDIDATE_ONLY_NOT_CONFIRMED'} for k,v in index.items() if any(re.search(p,v['content']['grammarNotesEn'],re.I) for p in extended_patterns)]
    candidate_keys={r['proposalKey'] for r in candidates+extended}
    parent_grammar_keys={r['proposalKey'] for r in load(PARENT/'authored/calibration-decisions.json')['records']}|{p['proposalKey'] for p in old_proposals['records']}
    summary={'status':'PARTIAL','boundedTargetsCompleted':True,'totalCorpusSenses':len(index),'originalReviewRecords':len(reviews),
             'previousReviewTriaged':25,'newReviewTriaged':len(rd),'cumulativeReviewTriaged':25+len(rd),'reviewPending':162-len(rd),
             'previousCoverageAssessed':17,'newCoverageAssessed':len(cd),'cumulativeCoverageAssessed':17+len(cd),'coveragePending':483-len(cd),
             'originalCoverageWarningGroups':sum(bool(r['originalWarningRecord']['warnings']) for r in coverage),
             'newCoverageClassifications':dict(Counter(r['classification'] for r in cd.values())),
             'grammarInspections':len(gr),'completeAffectedBatches':len(batches),'grammarClassifications':dict(Counter(r['classification'] for r in gr.values())),
             'initialScanCandidates':len(candidates),'expandedScanUniqueCandidates':len(candidate_keys),
             'candidateKeysWithParentDedicatedInspection':len(candidate_keys&parent_grammar_keys),
             'candidateKeysWithNewDedicatedInspection':len(candidate_keys&set(gr)),
             'pendingDedicatedGrammarCandidateInspections':len(candidate_keys-parent_grammar_keys-set(gr)),
             'pendingOriginalWarningGroups':sum(bool(r['originalWarnings']) and r['status']=='PENDING' for r in crows),
             'newFieldProposals':len(authored[names[3]]['records']),'newBoundaryProposals':len(authored[names[3]]['additionalBoundaryProposals']),
             'parentFieldProposalsPreserved':20,'parentBoundaryProposalsPreserved':5,'previousPinnedFilesUnchanged':pins['previousFileCount'],
             'authorization':a.AUTH,'linguisticDecisionsGeneratedDuringAssembly':False,'verificationCommands':'See separate verification-results.json; not executed by generator'}
    require(summary['originalCoverageWarningGroups']==126,'Warning identities lost')
    props={'parentProposals':reference(PARENT/'correction-proposals.json'),'parentFieldCount':20,'parentBoundaryCount':5,
           'newProposals':reference(WS/'authored'/names[3]),'correctionsApplied':0}
    queue=[]
    for row in rd.values():
        if set(row['categories'])&{'SOURCE_POS_CONFLICT','SENSE_BOUNDARY_UNCERTAIN','SOURCE_ORIGINALITY_UNCERTAIN'}:
            queue.append({'identity':row['proposalKey'],'effectiveContentHash':row['effectiveContentHash'],
                          'categories':row['categories'],'priority':row['priority'],'severity':row['severity'],
                          'rationaleVi':row['explanationVi'],'nextActionVi':row['nextActionVi'],
                          'dependency':'Source/POS/boundary decisions and originality review remain separate from rights clearance',
                          'historicalStatus':'REVIEW','ownerApproval':False,'rightsGate':'UNKNOWN_REVIEW_REQUIRED'})
    for row in cd.values():
        if row['classification']!='NO_IDENTIFIED_SOURCE_SUPPORTED_GAP':
            queue.append({'identity':row['candidateGroupKey'],'contentHashes':row['effectiveContentHashes'],'classification':row['classification'],
                          'priority':'P1' if row['classification']=='CONFIRMED_GAP' else 'P2','rationaleVi':row['explanationVi'],
                          'nextAction':'Owner review boundary or source ambiguity; proposals only. No application authorized.',
                          'rightsGate':'UNKNOWN_REVIEW_REQUIRED; independent of linguistic judgment'})
    for p in authored[names[3]]['records']:
        queue.append({'identity':p['correctionProposalId'],'proposalKey':p['proposalKey'],'parentHash':p['originalEffectiveContentHash'],
                      'priority':'P3','severity':p['severity'],'rationaleVi':p['rationaleVi'],'nextAction':'Review replacement, re-review entire batch before separately authorized application',
                      'overlayFeasible':True,'applied':False,'ownerApproval':False,'rightsGate':'UNKNOWN_REVIEW_REQUIRED'})
    objects={'review-triage-cumulative.json':{'parentFingerprint':PIN,'records':rrows,'newDecisions':reference(WS/'authored'/names[0])},
             'coverage-audit-cumulative.json':{'parentFingerprint':PIN,'groups':crows,'newDecisions':reference(WS/'authored'/names[1]),'exhaustiveLexicalCoverage':False},
             'grammar-commentary-audit.json':{'scannedSenses':1563,'patterns':PATTERNS,'candidates':candidates,'extendedPatterns':extended_patterns,'extendedCandidates':extended,
                       'actualInspections':reference(WS/'authored'/names[2]),'completeBatches':batches,
                       'parentDedicatedInspectionEvidence':[reference(PARENT/'authored/calibration-decisions.json'),reference(PARENT/'correction-proposals.json')],
                       'notInspectedInThisCheckpointKeys':sorted(candidate_keys-set(gr)),
                       'pendingDedicatedInspectionKeys':sorted(candidate_keys-parent_grammar_keys-set(gr)),
                       'classificationCounts':summary['grammarClassifications'],'statisticalPrevalenceClaimed':False},
             'correction-proposals-additive.json':props,'prioritized-remediation-queue.json':{'parentQueue':reference(PARENT/'prioritized-remediation-queue.json'),'newItems':queue},
             'validation-summary.json':summary}
    lines=['# Phase 2H.2I-R1 — additive checkpoint 02','', 'Status: PARTIAL aggregate audit; bounded targets completed. All existing content remains DRAFT. No corrections applied.', '',
           f'Parent fingerprint: `{PIN}`. Remote baseline: `{BASELINE}`.', '',
           f'REVIEW: 25 previous + {len(rd)} new = {25+len(rd)} triaged; {162-len(rd)} pending of 187.',
           f'Coverage: 17 previous + {len(cd)} new = {17+len(cd)} assessed; {483-len(cd)} pending of 500. All 126 original warning identities preserved.',
           f'Grammar: all 1563 notes scanned; {len(candidate_keys)} distinct candidates from original and supplementary patterns. {len(gr)} actual inspections across {len(batches)} complete original batches; {summary["newFieldProposals"]} confirmed minor process-commentary defects.',
           'The sample is purposive. Candidate matches are not confirmed defects; uninspected candidates remain listed. No statistical prevalence or full lexical completeness is claimed.', '',
           f'Dedicated candidate inspections: {summary["candidateKeysWithParentDedicatedInspection"]} parent, {summary["candidateKeysWithNewDedicatedInspection"]} new; {summary["pendingDedicatedGrammarCandidateInspections"]} still pending dedicated classification. Complete batch records include nonmatches. Pending original warning groups: {summary["pendingOriginalWarningGroups"]}.', '',
           'Parent 20 field proposals, 5 boundary proposals, calibration samples, 25 triage and 17 coverage decisions remain exact versioned references. All 6921 accepted source/code/data files are pinned unchanged.', '', '## New REVIEW decisions','']
    lines += [f'- `{k}`: {v["explanationVi"]}' for k,v in rd.items()]
    lines += ['', '## New coverage decisions','']+[f'- `{k}` — {v["classification"]}: {v["explanationVi"]}' for k,v in cd.items()]
    lines += ['', '## Grammar proposals — unapplied','']
    for p in authored[names[3]]['records']:
        lines += [f'### {p["correctionProposalId"]}: {p["proposalKey"]}', '',f'BEFORE: {p["before"]}', '',f'AFTER: {p["after"]}', '', p['rationaleVi'],'']
    lines += ['## Proposed boundaries and external evidence','', 'Two new boundary proposals: condensed concentrated liquid (ADJECTIVE); elastic stretchy material (NOUN). No canonical identity, source ordinal or approved CEFR allocated. Inferior remains a possible gap requiring a widen-versus-split decision.']
    lines += [f'- [{x["topic"]}]({x["url"]}): {x["finding"]} Access: actual search-returned primary text, not full-page inspection.' for x in authored[names[4]]['records']]
    nextreview=next(x['proposalKey'] for x in rrows if x['status']=='PENDING');nextcoverage=next(x['candidateGroupKey'] for x in crows if x['status']=='PENDING')
    lines += ['', '## Handoff','',f'Next original pending REVIEW key: `{nextreview}`. First pending coverage key in original order: `{nextcoverage}`; future selection must reprioritize remaining flags deterministically.',
              'Resume with a separately authorized additive checkpoint. Read remaining effective content and source evidence, persist actual decisions before assembly, preserve parent lineage and replay every accepted checkpoint.',
              '', 'Verification is recorded separately in verification-results.json from actual command results; this generator only checks deterministic content contracts. Canonical pnpm wrapper is NOT_RUN unless a separate receipt proves execution.',
              '', 'Rights UNKNOWN_REVIEW_REQUIRED. Owner approvals 0; canonical IDs 0; database access/writes NONE; Production UNTOUCHED; Master and legacy unchanged. Hybrid-100 v2.2.1 remains 87 Lexemes / 100 Senses.',
              'STOP: do not apply proposals, start approval or rights clearance, author another cohort, or import into any database.', '']
    report='\n'.join(lines)
    manifest={'phase':'2H.2I-R1','checkpointNumber':2,'parentFingerprint':PIN,'remoteBaseline':BASELINE,'frozenCheckpoint05':a.CP_PIN,
              'acceptedPins':reference(WS/'accepted-parent-pins.json'),'selection':reference(WS/'resume-selection-receipt.json'),
              'authoredHashes':{n:sha(WS/'authored'/n) for n in names},'sourceHashes':{n:sha(ROOT/'scripts'/n) for n in ['phase-2h2i-aggregate-qa-resume.py','phase-2h2i-aggregate-qa-resume-test.py']},
              'artifactHashes':{n:a.text_sha(encode(v)) for n,v in objects.items()},'reportSha256':a.text_sha(report),'authorization':a.AUTH}
    manifest['fingerprint']=digest(manifest)
    objects['manifest.json']=manifest
    return {n:encode(v).encode('utf8') for n,v in objects.items()}|{'report.md':report.encode('utf8')}


def run(check=False):
    outputs=assemble()
    for name,data in outputs.items():
        path=WS/name
        if check:
            require(path.is_file() and path.read_bytes()==data,'Checkpoint output drift: '+name)
        else:
            require(path.resolve().is_relative_to(WS.resolve()),'Unsafe output path')
            path.write_bytes(data)
    return {'fingerprint':load(WS/'manifest.json')['fingerprint'],'zeroWrites':check,'status':'PARTIAL','boundedTargetsCompleted':True}


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--checkpoint',type=int,choices=[2],default=2)
    mode=parser.add_mutually_exclusive_group()
    mode.add_argument('--prepare',action='store_true')
    mode.add_argument('--check',action='store_true')
    args=parser.parse_args()
    if args.prepare:
        receipt=prepare()
        print('PREPARED',len(receipt['reviews']),len(receipt['coverage']),len(receipt['grammarInspectionKeys']))
    else:
        print(encode(run(args.check)))


if __name__=='__main__':
    main()
