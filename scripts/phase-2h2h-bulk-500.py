#!/usr/bin/env python3
"""Offline frozen selection and assembly of persisted bilingual manuscripts.

No prose generation, canonical approval, network or database capability.
Incomplete authoring is an explicit resumable checkpoint, never a lexical blocker.
"""
import argparse
import copy
import hashlib
import importlib.util
import re
from collections import Counter
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('draft_v2', ROOT/'scripts/phase-2h2g-draft-v2.py')
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)
d = g.e.bulk
c = d.previous
load, encode, digest, require = g.load, g.encode, g.digest, g.require
WS = ROOT/'vocabflow-dataset/workspaces/master-editorial-bulk-500'
REPORT = ROOT/'vocabflow-dataset/reports/master-editorial-bulk-500.md'
SEED = 'PHASE_2H2H_BULK_500_V1'
BASELINE = 'fb8b3c21207534442d13352dec97bf1852dc4792'
G_PIN = '6633405d49aa0e211265d38be37b074e99cd783d787681d4a25909843a7fe071'
ALPHABET = dict(zip(d.BUCKETS, [80, 80, 85, 85, 85, 85]))
# Overlapping minimums, scaled from the preceding 300-group policy.
TARGETS = {'OXFORD_ONLY':100, 'VOCAB4600_ONLY':100, 'BOTH':200,
           'NOUN':100, 'VERB':80, 'ADJECTIVE':80, 'ADVERB':55,
           'POSSIBLE_POLYSEMY':80, 'POS_CONFLICT':20, 'CEFR_CONFLICT':20,
           'EXISTING_MASTER_LEMMA':8, 'LEGACY_HISTORY':12, 'MULTIWORD_PHRASAL':8,
           **{'CEFR_'+x:15 for x in ['A1','A2','B1','B2','C1','C2']}}
AUTH = {'offlineDraftAuthoring':True, 'scopedGitPublication':True,
        'ownerApprovalsAdded':0, 'canonicalIdsAllocated':0, 'releaseEligible':False,
        'databaseAccess':'NONE', 'databaseWrites':'NONE', 'production':'UNTOUCHED'}
REVIEW_DIMENSIONS = c.REVIEW_DIMENSIONS + ['LEXICAL_IDENTITY']


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


@lru_cache(maxsize=1)
def inputs():
    require(g.run(True)['fingerprint'] == G_PIN, 'DRAFT V2 fingerprint drift')
    ledger, sources, protected, prior = d.inputs()
    prior = prior + load(d.WS/'selected-cohort.json')['groups']
    require(len({x['candidateGroupKey'] for x in prior}) == 520, 'Prior 520 group drift')
    records = {r['proposalKey']:r for r in load(d.QUEUE/'review-inventory.json')['records']}
    for r in load(g.e.WS/'release-candidate-preview.json')['records']:
        records[r['proposalKey']] = r['proposedOverlayContent']
    revisions = load(g.WS/'draft-revisions.json')['records']
    effective = {k:g.resolve(k, records, revisions) for k in records}
    require(len(effective) == 813, 'Prior 813 Sense drift')
    return ledger, sources, protected, prior, effective


def rank(row):
    return hashlib.sha256((SEED+'\n'+row['candidateGroupKey']).encode()).hexdigest(), row['candidateGroupKey']


def select(ledger, prior):
    excluded = {x['candidateGroupKey'] for x in prior}
    pool = sorted([x for x in ledger if x['candidateGroupKey'] not in excluded
                   and d.bucket(x) and not d.annotation(x)], key=rank)
    available = Counter(d.bucket(x) for x in pool)
    caps = {b:min(n, available[b]) for b,n in ALPHABET.items()}
    # A suggested alphabet quota can be genuinely impossible. Redistribute
    # each vacant slot round-robin, without claiming the suggestion was met.
    while sum(caps.values()) < 500:
        before = sum(caps.values())
        for b in caps:
            if sum(caps.values()) < 500 and caps[b] < available[b]:
                caps[b] += 1
        require(sum(caps.values()) > before, 'Fewer than 500 eligible groups')
    capacity = d.coverage(pool)
    order = sorted(TARGETS, key=lambda q:(capacity[q]/TARGETS[q], q))
    selected, used = [], set()
    while True:
        counts = d.coverage(selected); buckets = Counter(d.bucket(x) for x in selected); changed = False
        for q in order:
            if counts[q] >= min(TARGETS[q], capacity[q]):
                continue
            row = next((x for x in pool if x['candidateGroupKey'] not in used
                        and buckets[d.bucket(x)] < caps[d.bucket(x)] and q in c.signals(x)), None)
            if row:
                selected.append(row); used.add(row['candidateGroupKey'])
                buckets[d.bucket(row)] += 1; counts.update(c.signals(row)); changed = True
        if not changed:
            break
    for b in caps:
        for row in pool:
            if sum(d.bucket(x) == b for x in selected) >= caps[b]:
                break
            if d.bucket(row) == b and row['candidateGroupKey'] not in used:
                selected.append(row); used.add(row['candidateGroupKey'])
    # Authoring order interleaves alphabet bands; it is fixed before prose.
    bands = {b:sorted([x for x in selected if d.bucket(x)==b], key=rank) for b in caps}
    selected = [bands[b][i] for i in range(max(caps.values())) for b in caps if i<len(bands[b])]
    require(len(selected)==len(used)==500, 'Selection is not 500 unique groups')
    counts = d.coverage(selected)
    audit = {'targets':TARGETS, 'available':dict(capacity), 'achieved':dict(counts),
             'alphabet':{b:{'suggested':ALPHABET[b], 'available':available[b], 'frozenTarget':caps[b]} for b in caps},
             'alphabetRedistribution':'ROUND_ROBIN_AFTER_CAPACITY_CLAMP',
             'shortfalls':[{'dimension':q,'target':n,'achieved':counts[q],'available':capacity[q],
                            'reason':'INSUFFICIENT_CAPACITY' if capacity[q]<n else 'JOINT_GREEDY_SHORTFALL_NOT_PROVEN_INFEASIBLE'}
                           for q,n in TARGETS.items() if counts[q]<n],
             'evidenceCountsOverlap':True,
             'annotationExclusions':[x['candidateGroupKey'] for x in ledger if d.annotation(x)]}
    cohort = {'seed':SEED, 'baseline':BASELINE, 'priorGroups':520, 'priorEffectiveSenses':813,
              'algorithm':'SCARCE_QUOTA_ROTATION_SHA256_CAPACITY_CLAMP_INTERLEAVE_V1',
              'rankEncoding':'SHA256_UTF8(seed + LF + exact candidateGroupKey), then key',
              'groups':[dict(x, alphabetBucket=d.bucket(x), sha256Rank=rank(x)[0],
                             displayFormProposal=x['normalizedHeadword'],
                             lexicalUnitTypeProposal='MULTIWORD_EXPRESSION' if ' ' in x['normalizedHeadword'] else 'WORD') for x in selected]}
    return {'selected-cohort.json':cohort, 'selection-quota-audit.json':audit}


def write_snapshot(outputs, check):
    # Validate the entire existing snapshot before any write; never partial overwrite.
    for path, text in outputs.items():
        require(not path.exists() or path.read_text(encoding='utf8')==text, 'Differing immutable artifact '+str(path))
        if check:
            require(path.exists(), 'Missing artifact '+str(path))
    if not check:
        for path, text in outputs.items():
            if not path.exists():
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(text, encoding='utf8', newline='\n')


def freeze():
    ledger, _, _, prior, _ = inputs()
    objects = select(ledger, prior)
    objects['selection-manifest.json'] = {'files':list(objects), 'fingerprint':digest(objects),
        'frozenBeforeAuthoring':True, 'selectedKeyFingerprint':digest([x['candidateGroupKey'] for x in objects['selected-cohort.json']['groups']])}
    write_snapshot({WS/n:encode(v) for n,v in objects.items()}, False)
    return objects['selection-manifest.json']['fingerprint']


def read_batches(groups):
    byword = {x['normalizedHeadword']:x for x in groups}; rows=[]; hashes={}; batches=[]
    for path in sorted(p for p in (WS/'authored').glob('batch-*.psv') if re.fullmatch(r'batch-\d+\.psv',p.name)):
        start=len(rows); keys=set()
        receipt=load(path.with_suffix('.json'))
        reviewpath=path.with_suffix('.review.psv')
        require(receipt['reviewNotesSha256']==sha(reviewpath),'Review notes drift')
        require(receipt['fullBatchReview'] is True,'Full batch review required')
        notes=dict(line.split('|',1) for line in reviewpath.read_text(encoding='utf8').splitlines())
        for n,line in enumerate(path.read_text(encoding='utf8').splitlines(),1):
            fields=line.split('|'); require(len(fields)==10,'Ten PSV fields required')
            word,slug,pos,label,definition,meaning,en,vi,grammar,ordinals=fields
            require(word in byword and re.fullmatch(r'[a-z0-9-]+',slug),'Invalid word/slug')
            group=byword[word]; key=group['candidateGroupKey']; keys.add(key)
            row={'candidateGroupKey':key,'proposalKey':'EDITORIAL_2H2H:'+word+':'+slug,
                 'headword':word,'headwordEvidence':word,'displayFormProposal':word,
                 'lexicalUnitTypeProposal':group['lexicalUnitTypeProposal'],'partOfSpeechProposal':pos,
                 'content':{'senseLabelEn':label,'definitionEn':definition,'meaningVi':meaning,
                            'examples':[{'en':en,'vi':vi}],'grammarNotesEn':grammar},
                 'oxfordGroupOrdinalsConsidered':[] if ordinals=='-' else [int(v) for v in ordinals.split(',')],
                 'authoredSource':{'path':path.relative_to(WS).as_posix(),'line':n},
                 'canonicalId':None,'runtimeMapping':None,'publicationEligible':False,
                 'ownerDecision':'UNRESOLVED','identityDecision':'UNRESOLVED','identityClaim':'NONE',
                 'sourceRights':c.RIGHTS,'statuses':['DRAFT','HUMAN_REVIEW_PENDING']}
            require(not c.structural_errors(row),'Invalid manuscript '+row['proposalKey'])
            rows.append(row)
        require(0<len(keys)<=5,'Conservative complex/specialist batch limit is five')
        require(receipt['sha256']==sha(path) and set(receipt['groupKeys'])==keys and receipt['senseCount']==len(rows)-start,'Receipt drift')
        require(receipt['sourcePointers']=={key:byword[key.split(':',1)[1]]['sourceEvidence'] for key in keys},'Batch source pointer drift')
        review={x['proposalKey']:x for x in receipt['reviews']}
        require(len(review)==len(receipt['reviews']) and set(review)=={x['proposalKey'] for x in rows[start:]},'Review coverage drift')
        for row in rows[start:]:
            item=review[row['proposalKey']]
            require(item['reviewerKind']=='AI_SELF_REVIEW' and item['humanReviewer'] is None,'False human review')
            require(item['reviewedContentHash']==g.e.revision(row),'Review is not bound to this exact content')
            require(set(item['dimensions'])==set(c.REVIEW_DIMENSIONS) and len(item['note'])>=60,'Insufficient review')
            require(item['assessment'] in {'PASS','REVIEW','FAIL'},'Invalid QA assessment')
            require(item['note']==notes[row['headword']],'Unbound review note')
        for p in [path,path.with_suffix('.json'),reviewpath]: hashes[p.relative_to(WS).as_posix()]=sha(p)
        batches.append(receipt)
    require(len({r['proposalKey'] for r in rows})==len(rows),'Duplicate proposal key')
    return rows,batches,hashes


def apply_corrections(originals, corrections):
    keys={r['proposalKey']:r for r in originals}
    for correction in corrections:
        require(correction['proposalKey'] in keys,'Unknown overlay Sense')
        require(g.e.revision(keys[correction['proposalKey']])==correction['parentContentHash'],'Stale overlay parent')
        require(correction['reviewerKind']=='AI_SELF_REVIEW' and correction['humanReviewer'] is None,'False correction approval')
        require(sha_text(correction['after'])==correction['afterSha256'],'Overlay after hash drift')
    rows=d.apply_overlays(originals,corrections)
    for correction in corrections:
        row=next(r for r in rows if r['proposalKey']==correction['proposalKey'])
        require(g.e.revision(row)==correction['reviewedAfterContentHash'],'Corrected content review drift')
        require(not c.structural_errors(row),'Corrected structure failure')
    return rows


def sha_text(text):
    return hashlib.sha256(text.encode('utf8')).hexdigest()


def near_duplicates(rows, prior):
    """Conservative textual signal; never a semantic equivalence decision.

    Compare long definitions and bilingual examples against earlier effective
    drafts and other new proposals. Short gloss overlap is ordinary vocabulary.
    """
    fields=['/content/definitionEn','/content/examples/0/en','/content/examples/0/vi']
    corpus={r['proposalKey']:{f:set(c.pilot.words(v)) for f,v in c.pilot.content_fields(r).items()
                            if f in fields and len(c.pilot.words(v))>=8} for r in [*prior.values(),*rows]}
    findings={r['proposalKey']:[] for r in rows}
    for row in rows:
        key=row['proposalKey']
        for other,parts in corpus.items():
            if other==key:continue
            for field,left in corpus[key].items():
                right=parts.get(field)
                if right:
                    score=len(left&right)/len(left|right)
                    if score>=0.85:findings[key].append({'field':field,'otherProposalKey':other,'tokenSetJaccard':round(score,4)})
    return findings


def check_pointer(ref, sources):
    source=sources[ref['corpus']][ref['recordIndex']]
    require(all(source[f]==ref[f] for f in ['sourceRecordId','sourceNoteGuid','recordEvidenceSha256']), 'Source pointer drift')


def enrich(row, group, sources):
    require(row['partOfSpeechProposal'] in group['normalizedPosCandidates'], 'Unsupported POS '+row['proposalKey'])
    for ref in group['sourceEvidence']: check_pointer(ref,sources)
    ordinals={n for ref in group['sourceEvidence'] for n in ref['structuredOxfordSenseGroupOrdinals']}
    require(set(row['oxfordGroupOrdinalsConsidered'])<=ordinals, 'Unsupported Oxford ordinal')
    row.update(sourceEvidence=group['sourceEvidence'], sourceMembership=group['sourceMembership'],
               posEvidence=group['normalizedPosCandidates'], cefrEvidence=[ref['cefrEvidence'] for ref in group['sourceEvidence']],
               cefrClassification=None, topicClassification=None, existingMasterCandidates=group['masterLemmaCandidates'],
               legacyDependencies=group['legacyCoverageEvidence'], riskSignals=sorted(c.signals(group)&c.RISK_SIGNALS))
    row['generatedProvenance']={'sourceType':'GENERATED','actor':'AI_ASSISTANT','humanReviewer':None,'license':None,
        'fields':[{'field':f,'sha256Utf8':hashlib.sha256(text.encode()).hexdigest()} for f,text in c.pilot.content_fields(row).items()]}
    return row


def build():
    ledger,sources,protected,prior,effective=inputs()
    pins=load(WS/'accepted-input-pins.json')
    require(all(sha(ROOT/p)==v for p,v in pins.items()),'Accepted input bytes changed')
    selection=select(ledger,prior); sm=load(WS/'selection-manifest.json')
    require(digest(selection)==sm['fingerprint'],'Selection fingerprint drift')
    require(sm['frozenBeforeAuthoring'] is True and sm['files']==list(selection),'Frozen selection contract drift')
    require(sm['selectedKeyFingerprint']==digest([x['candidateGroupKey'] for x in selection['selected-cohort.json']['groups']]),'Frozen key sequence drift')
    require(all(load(WS/n)==v for n,v in selection.items()),'Selection replay drift')
    groups=selection['selected-cohort.json']['groups']; bykey={x['candidateGroupKey']:x for x in groups}
    originals,batches,hashes=read_batches(groups)
    overlay=load(WS/'content-correction-overlays.json')
    corrected=apply_corrections(originals,overlay['corrections'])
    duplicates=near_duplicates(corrected,effective)
    checkpoint=load(WS/'authored/checkpoint.json'); blocked=checkpoint['blockedGroups']
    require(all(len(x['reason'])>=40 and x['kind']=='INSUFFICIENT_LEXICAL_EVIDENCE' for x in blocked),'Invalid lexical blocker')
    authored={r['candidateGroupKey'] for r in originals}; blockedkeys={x['candidateGroupKey'] for x in blocked}
    pending=set(checkpoint['pendingGroupKeys'])
    require(not (authored&blockedkeys or authored&pending or blockedkeys&pending),'Checkpoint classes overlap')
    require(authored|blockedkeys|pending==set(bykey),'Selected groups unaccounted')
    require(len(checkpoint['pendingGroupKeys'])==len(pending) and len(blocked)==len(blockedkeys),'Duplicate checkpoint keys')
    # Pending is execution-budget state, not evidence failure or completed authoring.
    require(not pending or checkpoint['status']=='PARTIAL_CONTEXT_BUDGET_CHECKPOINT','Unexplained partial checkpoint')
    exact,grams=c.pilot.source_passages(groups,sources)
    initial_reviews={r['proposalKey']:r for b in batches for r in b['reviews']}
    final_review=load(WS/'authored/effective-sense-review.json')
    reviews={r['proposalKey']:r for r in final_review['records']}
    require(len(reviews)==len(final_review['records']) and set(reviews)==set(initial_reviews),'Effective review coverage drift')
    rows=[]; qa=[]; rights=[]
    for original in corrected:
        row=enrich(copy.deepcopy(original),bykey[original['candidateGroupKey']],sources)
        review=reviews[row['proposalKey']]
        require(review['reviewerKind']=='AI_SELF_REVIEW' and review['humanReviewer'] is None,'False effective human review')
        require(set(review['dimensions'])==set(REVIEW_DIMENSIONS),'Fourteen review dimensions required')
        require(review['reviewedContentHash']==g.e.revision(row),'Stale effective review hash')
        require(review['assessment'] in {'PASS','REVIEW','FAIL'} and len(review['lexicalIdentityNote'])>=60,'Invalid effective assessment')
        similarity=[{'field':f,'sharedEightTokenWindows':len(c.pilot.ngrams(text)&grams),
                     'exactFiveTokens':len(c.pilot.words(text))>=5 and ' '.join(c.pilot.words(text)) in exact}
                    for f,text in c.pilot.content_fields(row).items()
                    if c.pilot.ngrams(text)&grams or (len(c.pilot.words(text))>=5 and ' '.join(c.pilot.words(text)) in exact)]
        warnings=c.language_signals(row)+(['SOURCE_SIMILARITY_REVIEW'] if similarity else [])
        if duplicates[row['proposalKey']]:warnings.append('DRAFT_NEAR_DUPLICATE_REVIEW')
        assessment=reviews[row['proposalKey']]['assessment']
        if warnings and assessment=='PASS': assessment='REVIEW'
        corrections=[x for x in overlay['corrections'] if x['proposalKey']==row['proposalKey']]
        qa.append({'proposalKey':row['proposalKey'],'structuralErrors':[], 'signals':warnings,
                   'sourceSimilarity':similarity,'aiAssessment':assessment,'review':review,
                   'nearDuplicateSignals':duplicates[row['proposalKey']],
                   'originalReview':initial_reviews[row['proposalKey']],
                   'correctionReview':corrections,'effectiveReviewedContentHash':g.e.revision(row),
                   'ownerAssessment':'PENDING','riskSignals':row['riskSignals']})
        rights.append({'proposalKey':row['proposalKey'],'rights':c.RIGHTS,'clearanceEvidence':[],
                       'fieldProvenance':row['generatedProvenance'],'copyingSignals':similarity})
        row['aiAssessment']=assessment; rows.append(row)
    require(not (set(effective)&{r['proposalKey'] for r in rows}),'Prior/new Sense key collision')
    index=copy.deepcopy(load(g.WS/'effective-draft-preview.json')['records'])
    for item in index:
        require(g.e.revision(effective[item['proposalKey']])==item['effectiveContentHash'],'Prior effective hash drift')
        item['lookupWorkspace']=g.WS.relative_to(ROOT).as_posix()
    index += [{'proposalKey':r['proposalKey'],'effectiveContentHash':g.e.revision(r),'status':'DRAFT',
               'lookupLayer':'2H2H_PERSISTED_MANUSCRIPT','lookupWorkspace':WS.relative_to(ROOT).as_posix()} for r in rows]
    counts={'sourceRecords':9677,'sourceGroups':6143,'previousGroups':520,'previousEffectiveSenses':813,
            'selected':500,'authoredGroups':len(authored),'blockedGroups':len(blocked),'pendingGroups':len(pending),
            'newSenses':len(rows),'totalGroups':520+len(authored),'totalSenses':813+len(rows),
            'remainingUndrafted':6143-520-len(authored),
            'multiSenseGroups':sum(n>1 for n in Counter(r['candidateGroupKey'] for r in rows).values()),
            'englishDefinitions':len(rows),'vietnameseMeanings':len(rows),
            'englishExamples':sum(len(r['content']['examples']) for r in rows),
            'vietnameseExamples':sum(len(r['content']['examples']) for r in rows),
            'aiQa':dict(Counter(q['aiAssessment'] for q in qa)), 'correctionsProposed':len(overlay['corrections']),
            'correctionsApplied':len(overlay['corrections']),
            'selectedSourceCoverage':dict(Counter('+'.join(x['sourceMembership']) for x in groups)),
            'authoredSourceCoverage':dict(Counter('+'.join(bykey[k]['sourceMembership']) for k in authored)),
            'draftPosCoverage':dict(Counter(r['partOfSpeechProposal'] for r in rows)),
            'selectedPosEvidence':dict(Counter(p for x in groups for p in x['normalizedPosCandidates'])),
            'selectedCefrEvidence':dict(Counter(v for x in groups for v in {e['value'] for ref in x['sourceEvidence'] for e in ref['cefrEvidence']}))}
    common={'phase':'2H.2H','contentStatus':'DRAFT','authorization':AUTH,'selectionFingerprint':sm['fingerprint']}
    objects={'sense-proposals.json':dict(common,senses=rows,originals=originals),
             'lexeme-proposals.json':dict(common,groups=[{'candidateGroupKey':x['candidateGroupKey'],
                'displayFormProposal':x['normalizedHeadword'],'canonicalId':None,'ownerDecision':'UNRESOLVED',
                'state':'AUTHORED' if x['candidateGroupKey'] in authored else 'BLOCKED' if x['candidateGroupKey'] in blockedkeys else 'PENDING_AUTHORING',
                'senseProposalKeys':[r['proposalKey'] for r in rows if r['candidateGroupKey']==x['candidateGroupKey']]} for x in groups]),
             'quality-audit.json':dict(common,senses=qa,batches=batches, dimensions=REVIEW_DIMENSIONS,
                nearDuplicateScope='LONG_EN_DEFINITIONS_AND_BILINGUAL_EXAMPLES_AGAINST_813_PRIOR_PLUS_NEW; TOKEN_SET_JACCARD_AT_LEAST_0.85; SIGNAL_ONLY',
                reviewKind='AI_AUTHOR_SELF_REVIEW_NOT_INDEPENDENT_HUMAN',
                escalation={'criticalDefects':1,'substantiveDefectsPerBatch':2,
                            'action':'FULL_BATCH_REVIEW_BEFORE_PUBLICATION','actualCoverage':'ALL_AUTHORED_SENSES',
                            'reReviewedBatches':overlay['reReviewedBatches']},
                duplicateExamples=[text for text,n in Counter(r['content']['examples'][0]['en'] for r in rows).items() if n>1],
                boundaryCoverage=[{'candidateGroupKey':k,'supportedOrdinals':sorted({n for ref in bykey[k]['sourceEvidence'] for n in ref['structuredOxfordSenseGroupOrdinals']}),
                                  'representedOrdinals':sorted({n for r in rows if r['candidateGroupKey']==k for n in r['oxfordGroupOrdinalsConsidered']}),
                                  'status':'DRAFT_SUBSET_NOT_EXHAUSTIVE_CANONICAL_SENSE_INVENTORY'} for k in sorted(authored)]),
             'provenance-rights-audit.json':dict(common,senses=rights,sourceRights=c.RIGHTS,mediaCopied=False,
                similarityScope='PINNED_TWO_SOURCE_CORPORA_EIGHT_TOKEN_AND_EXACT_FIVE_TOKEN_SCAN_NOT_WEB_CLEARANCE'),
             'effective-draft-index.json':dict(common,records=index,count=len(index),
                inheritance='QA1 -> 2H2C -> 2H2D -> 2H2E preview -> 2H2G DRAFT V2 -> 2H2H',priorFingerprint=G_PIN),
             'validation-summary.json':dict(common,status='PARTIAL' if pending or blocked else 'PASS_DRAFT_ONLY',counts=counts,
                checkpoint=checkpoint, protectedState=protected,previous813Preserved=True,draftV2CorrectionsPreserved=True,
                deterministicChecks=['SELECTION_REPLAY','ACCEPTED_BYTE_PINS','SOURCE_POINTERS','POS_EVIDENCE','OXFORD_ORDINALS','DRAFT_NEAR_DUPLICATE_SCAN',
                                     'STRUCTURE','FIELD_HASHES','CONTENT_BOUND_AI_REVIEW','CHECKPOINT_PARTITION','PRIOR_EFFECTIVE_HASHES','SIMILARITY_SCAN'],
                externalChecks='Separate verification-results.json; not run by this generator')}
    for p in [WS/'accepted-input-pins.json',WS/'authored/checkpoint.json',WS/'content-correction-overlays.json']:
        hashes[p.relative_to(WS).as_posix()]=sha(p)
    hashes['authored/fact-verification.json']=sha(WS/'authored/fact-verification.json')
    hashes['authored/effective-sense-review.json']=sha(WS/'authored/effective-sense-review.json')
    report=render(counts,rows,sm['fingerprint'],checkpoint)
    objects['manifest.json']=dict(common,files=list(objects),authoredByteHashes=hashes,
         acceptedDraftV2Fingerprint=G_PIN,fingerprint=digest({'artifacts':objects,'authoredByteHashes':hashes,'report':report}))
    return objects,report


def render(counts, rows, selection, checkpoint):
    lines=['# Phase 2H.2H — bulk 500 editorial checkpoint','',
           'PARTIAL offline DRAFT. Frozen 500-group cohort; persisted bilingual prose is assembled without generation.',
           'Execution/context budget pending groups are not insufficient-evidence blockers. No fabricated content or completed-group claim.','',
           '## Counts and coverage','', '```json',encode(counts).rstrip(),'```','',
           'Selection fingerprint: `'+selection+'`. See manifest.json for the editorial fingerprint.','',
           '## Authored examples','']
    for row in rows[:12]:
        x=row['content']; ex=x['examples'][0]
        lines += ['### '+row['headword']+' — '+x['senseLabelEn'],'',x['definitionEn'],'',x['meaningVi'],'',ex['en'],'',ex['vi'],'',x['grammarNotesEn'],'']
    lines += ['## QA, corrections and limits','',
              'All persisted Senses received content-bound AI author self-review across 14 dimensions: the 13 inherited grouped dimensions plus an explicit lexical-identity assessment. Original batch reviews and effective 14-dimension reviews are both preserved. Structural and pinned source similarity checks cover all. This is not independent human linguistic approval.',
              'Standalone Vietnamese glosses, tense-independent grammar, meaning/example/POS alignment, valency, plural forms and translation polarity were checked. No source media or expressive passages were imported.',
              'Source similarity, long-field near-duplicate and polarity heuristics are review signals, not proof of error or clearance. Near-duplicates are checked against all 813 prior effective drafts and other new Senses at token-set Jaccard >=0.85. All source CEFR is evidence; verified Sense CEFR/topic classification remains null. All Master/legacy overlaps and unrepresented source ordinals remain unresolved.',
              'Two coupled example fields for legislative were corrected in an additive overlay: committee in its civics lesson became students in their civics lesson, with matching Vietnamese. Batch 018 was fully re-reviewed after this substantive naturalness defect. Parent revision, BEFORE/AFTER UTF-8 hashes and effective review hash are verified; original manuscript unchanged.',
              'All original 813 drafts and 2H.2G corrections remain effective through their original lookup layers. No flattened prior content replaces those layers.',
              'Rights UNKNOWN_REVIEW_REQUIRED; owner approvals and canonical IDs zero. Protected Hybrid 2.2.1 87/100 and legacy evidence remain pinned offline, not live queried. Database NONE/NONE; Production UNTOUCHED.','',
              'Scientific checks: [Smithsonian primate classification](https://humanorigins.si.edu/evidence/behavior/primate-behavior) and [Natural History Museum fossil explanation](https://www.nhm.ac.uk/discover/what-is-a-fossil.html). These establish narrow factual boundaries only; no source prose license or rights clearance is inferred.','',
              '## Resume','',checkpoint['reason'],
              'Continue pendingGroupKeys in the frozen interleaved order, using immutable batches of at most five groups and content-bound review receipts. No new selection or owner-review cycle. Future additions should use a new checkpoint/derived snapshot rather than overwrite this published checkpoint.',
              '`python -B scripts/phase-2h2h-bulk-500.py --check` replays persisted prose without writes. External test/typecheck/lint/frozen evidence is separate in verification-results.json.','']
    return '\n'.join(lines)


def run(check=False):
    objects,report=build()
    write_snapshot({**{WS/n:encode(v) for n,v in objects.items()},REPORT:report},check)
    return {'fingerprint':objects['manifest.json']['fingerprint'],**objects['validation-summary.json']['counts']}


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--freeze',action='store_true')
    parser.add_argument('--check',action='store_true')
    args=parser.parse_args()
    require(not(args.freeze and args.check),'Choose freeze or check')
    print(encode({'selectionFingerprint':freeze()} if args.freeze else run(args.check)))
