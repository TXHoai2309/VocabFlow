#!/usr/bin/env python3
"""Offline frozen selection, persisted editorial assembly, and owner handoff."""
import argparse
import copy
import csv
import hashlib
import importlib.util
import io
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('previous', ROOT/'scripts/phase-2h2c-stratified-editorial.py')
previous = importlib.util.module_from_spec(spec)
spec.loader.exec_module(previous)
load, digest, require = previous.load, previous.digest, previous.require
WS = ROOT/'vocabflow-dataset/workspaces/master-editorial-bulk-300'
QUEUE = ROOT/'vocabflow-dataset/workspaces/master-editorial-owner-review-queue'
SEED = 'PHASE_2H2D_BULK_300_V1'
BUCKETS = {'a-d':'abcd','e-h':'efgh','i-m':'ijklm','n-r':'nopqr','s-v':'stuv','w-z':'wxyz'}
PRIOR_SELECTION = '2d380a64570532fd3afce23b5b84bd9a63dc525d2d56b67453b38f4418456a79'
PRIOR_EDITORIAL = 'a84e173137c48a1f9258c9c74d84b63f642b15651f8bd1f72378c72fe825a935'
TARGETS = {'OXFORD_ONLY':65,'VOCAB4600_ONLY':65,'BOTH':120,'NOUN':60,'VERB':50,'ADJECTIVE':50,'ADVERB':35,
           'POSSIBLE_POLYSEMY':50,'POS_CONFLICT':12,'CEFR_CONFLICT':12,'EXISTING_MASTER_LEMMA':5,'LEGACY_HISTORY':8,
           'MULTIWORD_PHRASAL':5, **{'CEFR_'+x:10 for x in ['A1','A2','B1','B2','C1','C2']}}

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def inputs():
    ledger, sources, master, protected, pilot = previous.inputs()
    manifest = load(previous.WS/'manifest.json')
    artifacts = {n:load(previous.WS/n) for n in manifest['files']}
    require(digest({'authoredByteHashes':manifest['authoredByteHashes'],'artifacts':artifacts}) == manifest['fingerprint'] == PRIOR_EDITORIAL, 'Previous editorial drift')
    require(all(sha(previous.WS/n)==v for n,v in manifest['authoredByteHashes'].items()), 'Previous original bytes drift')
    sel = load(previous.WS/'selection-manifest.json')
    require(digest({n:load(previous.WS/n) for n in sel['files']}) == sel['fingerprint'] == PRIOR_SELECTION, 'Previous selection drift')
    prior = pilot + load(previous.WS/'selected-cohort.json')['groups']
    require(len({g['candidateGroupKey'] for g in prior})==220, 'Prior group accounting')
    return ledger, sources, protected, prior

def bucket(g):
    return next((b for b,letters in BUCKETS.items() if g['normalizedHeadword'][0] in letters),None)

def rank(g):
    return hashlib.sha256((SEED+'\n'+g['candidateGroupKey']).encode()).hexdigest(),g['candidateGroupKey']

def annotation(g):
    w=g['normalizedHeadword']
    return bool(re.search(r'[()<>\[\]{}]|\b(?:adj|adv|noun|verb)\.$',w))

def coverage(groups):
    return Counter(s for g in groups for s in previous.signals(g))

def select(ledger,prior):
    excluded={g['candidateGroupKey'] for g in prior}
    pool=sorted([g for g in ledger if bucket(g) and g['candidateGroupKey'] not in excluded and not annotation(g)],key=rank)
    chosen=[]; used=set(); capacity=coverage(pool)
    order=sorted(TARGETS,key=lambda q:(capacity[q]/TARGETS[q],q))
    while True:
        counts=coverage(chosen); bybucket=Counter(bucket(g) for g in chosen); changed=False
        for q in order:
            if counts[q]>=min(TARGETS[q],capacity[q]): continue
            g=next((g for g in pool if g['candidateGroupKey'] not in used and bybucket[bucket(g)]<50 and q in previous.signals(g)),None)
            if g:
                chosen.append(g);used.add(g['candidateGroupKey']);bybucket[bucket(g)]+=1;counts.update(previous.signals(g));changed=True
        if not changed:break
    for b in BUCKETS:
        eligible=[g for g in pool if bucket(g)==b]
        require(len(eligible)>=50,'Alphabet capacity insufficient: '+b)
        for g in eligible:
            if sum(bucket(x)==b for x in chosen)>=50:break
            if g['candidateGroupKey'] not in used:chosen.append(g);used.add(g['candidateGroupKey'])
    chosen.sort(key=lambda g:(list(BUCKETS).index(bucket(g)),rank(g)))
    counts=coverage(chosen)
    audit={'targets':TARGETS,'available':dict(capacity),'achieved':dict(counts),
           'alphabet':{b:{'target':50,'available':sum(bucket(g)==b for g in pool),'selected':sum(bucket(g)==b for g in chosen)} for b in BUCKETS},
           'shortfalls':[{'dimension':q,'target':v,'achieved':counts[q],'available':capacity[q],
                          'reason':'INSUFFICIENT_CAPACITY' if capacity[q]<v else 'JOINT_GREEDY_SHORTFALL_NOT_PROVEN_INFEASIBLE'} for q,v in TARGETS.items() if counts[q]<v],
           'annotationExclusions':[{'key':g['candidateGroupKey'],'reason':'SOURCE_METADATA_NOT_VERIFIED_LEXICAL_UNIT'} for g in ledger if annotation(g)],
           'posAndCefrCountsAreOverlappingSourceEvidence':True}
    cohort={'seed':SEED,'algorithm':'SCARCE_QUOTA_ROTATION_SHA256_BUCKET_FILL_V1','rankEncoding':'SHA256_UTF8(seed + LF + exact key), then key',
            'priorGroups':220,'baseline':'477bb5c087b0ede7f50045054aabe92505c78bba','inputFingerprints':dict(previous.PINS,phase2h2cSelection=PRIOR_SELECTION,phase2h2cEditorial=PRIOR_EDITORIAL),
            'groups':[dict(g,alphabetBucket=bucket(g),displayFormProposal=g['normalizedHeadword'],
                           lexicalUnitTypeProposal='MULTIWORD_EXPRESSION' if ' ' in g['normalizedHeadword'] else 'WORD',
                           displayDecision='Source spellings retained as evidence; normalized lexical form proposed, not identity approval',sha256Rank=rank(g)[0]) for g in chosen]}
    return {'selected-cohort.json':cohort,'selection-quota-audit.json':audit}

def encode(v):return json.dumps(v,ensure_ascii=False,indent=2,sort_keys=True)+'\n'

def freeze():
    ledger,_,_,prior=inputs();objects=select(ledger,prior)
    objects['selection-manifest.json']={'fingerprint':digest(objects),'files':list(objects),'frozenBeforeAuthoring':True,'selectedKeyFingerprint':digest([g['candidateGroupKey'] for g in objects['selected-cohort.json']['groups']])}
    for n,v in objects.items():
        p=WS/n;require(not p.exists() or p.read_text(encoding='utf8')==encode(v),'Frozen selection overwrite rejected')
        p.parent.mkdir(parents=True,exist_ok=True);p.write_text(encode(v),encoding='utf8',newline='\n')
    return objects['selection-manifest.json']['fingerprint']

def read_batches(groups):
    rows=[];batches=[];hashes={};byword={g['normalizedHeadword']:g for g in groups}
    for p in sorted((WS/'authored').glob('batch-*.psv')):
        keys=set();start=len(rows)
        for line_no,line in enumerate(p.read_text(encoding='utf8').splitlines(),1):
            f=line.split('|');require(len(f)==10,'Ten PSV fields required')
            word,slug,pos,label,definition,meaning,en,vi,grammar,ordinals=f
            require(word in byword,'Unselected group');g=byword[word];keys.add(g['candidateGroupKey'])
            row={'candidateGroupKey':g['candidateGroupKey'],'proposalKey':'EDITORIAL_2H2D:'+word+':'+slug,
                 'headwordEvidence':word,'displayFormProposal':g['displayFormProposal'],'lexicalUnitTypeProposal':g['lexicalUnitTypeProposal'],
                 'partOfSpeechProposal':pos,'content':{'senseLabelEn':label,'definitionEn':definition,'meaningVi':meaning,
                 'examples':[{'en':en,'vi':vi}],'grammarNotesEn':grammar},'oxfordGroupOrdinalsConsidered':[] if ordinals=='-' else [int(x) for x in ordinals.split(',')],
                 'authoredSource':{'path':p.relative_to(WS).as_posix(),'line':line_no},'ownerDecision':'UNRESOLVED','identityDecision':'UNRESOLVED',
                 'canonicalId':None,'runtimeMapping':None,'publicationEligible':False,'identityClaim':'NONE','sourceRights':previous.RIGHTS}
            require(not previous.structural_errors(row),'Structural failure '+row['proposalKey'])
            rows.append(row)
        require(len(keys)<=5,'Conservative batch size exceeded')
        require(keys,'Empty batch');hashes[p.relative_to(WS).as_posix()]=sha(p)
        receipt=load(p.with_suffix('.json'));require(receipt['sha256']==sha(p) and set(receipt['groupKeys'])==keys and receipt['senseCount']==len(rows)-start,'Batch receipt mismatch')
        hashes[p.with_suffix('.json').relative_to(WS).as_posix()]=sha(p.with_suffix('.json'))
        batches.append(dict(receipt,path=p.relative_to(WS).as_posix(),sizeLimit=5))
    require(len({r['proposalKey'] for r in rows})==len(rows),'Duplicate Sense key')
    return rows,batches,hashes

def apply_overlays(originals,overlays):
    preview=copy.deepcopy(originals);bykey={r['proposalKey']:r for r in preview};seen=set()
    for c in overlays:
        require((c['proposalKey'],c['field']) not in seen,'Duplicate overlay field');seen.add((c['proposalKey'],c['field']))
        r=bykey[c['proposalKey']];fields=dict(previous.pilot.content_fields(r),**{'/displayFormProposal':r['displayFormProposal']})
        require(c['field'] in fields,'Unknown correction field')
        require(fields[c['field']]==c['before'] and c['before']!=c['after'],'Invalid BEFORE/AFTER')
        require(hashlib.sha256(c['before'].encode()).hexdigest()==c['beforeSha256'],'Before hash mismatch')
        require(c['ownerDecision']=='UNRESOLVED','Unauthorized overlay approval')
        parts=c['field'].strip('/').split('/');target=r
        for part in parts[:-1]:target=target[int(part)] if isinstance(target,list) else target[part]
        target[parts[-1]]=c['after']
    return preview

def build():
    ledger,sources,protected,prior=inputs();selection=select(ledger,prior);sm=load(WS/'selection-manifest.json')
    require(digest(selection)==sm['fingerprint'],'Selection replay drift')
    require(all(load(WS/n)==v for n,v in selection.items()),'Stored selection drift')
    groups=selection['selected-cohort.json']['groups'];bykey={g['candidateGroupKey']:g for g in groups}
    originals,batches,hashes=read_batches(groups);overlays=load(WS/'content-correction-overlays.json')['corrections']
    rows=apply_overlays(originals,overlays)
    require(all(hashlib.sha256(c['after'].encode()).hexdigest()==c['afterSha256'] for c in overlays),'After hash mismatch')
    blocked=load(WS/'authored/blocked-groups.json');authored={r['candidateGroupKey'] for r in rows}
    require(authored.isdisjoint({r['candidateGroupKey'] for r in blocked}),'Blocked/authored overlap')
    require(authored|{r['candidateGroupKey'] for r in blocked}==set(bykey),'Selected slots unaccounted')
    reviews=load(WS/'authored/sense-review.json');reviewkeys={r['proposalKey'] for r in reviews}
    require(reviewkeys<={r['proposalKey'] for r in rows},'Unknown review key')
    exact,grams=previous.pilot.source_passages(groups,sources);qa=[];rights=[]
    for row in rows:
        g=bykey[row['candidateGroupKey']]
        require(not previous.structural_errors(row),'Corrected structural failure')
        for ref in g['sourceEvidence']:
            source=sources[ref['corpus']][ref['recordIndex']]
            require(all(ref[f]==source[f] for f in ['sourceRecordId','sourceNoteGuid','recordEvidenceSha256']),'Source pointer mismatch')
        overrides={'ashore':'ADVERB','seven':'OTHER'}
        require(row['partOfSpeechProposal'] in g['normalizedPosCandidates'] or overrides.get(row['headwordEvidence'])==row['partOfSpeechProposal'],'Unsupported POS')
        supported={n for ref in g['sourceEvidence'] for n in ref['structuredOxfordSenseGroupOrdinals']}
        require(set(row['oxfordGroupOrdinalsConsidered'])<=supported,'Oxford ordinal mismatch')
        risks=sorted(previous.signals(g)&previous.RISK_SIGNALS)
        if row['headwordEvidence'] in {'indictment','bench','electron','glucose','ergonomic','mammal','microbe','militant','yield','warrant','whip','testify','senator','medicine'}:
            risks.append('SPECIALIST_OR_SENSITIVE')
        if risks:require(row['proposalKey'] in reviewkeys,'High risk Sense lacks explicit review')
        row.update(sourceEvidence=g['sourceEvidence'],sourceMembership=g['sourceMembership'],posEvidence=g['normalizedPosCandidates'],
                   cefrEvidence=[ref['cefrEvidence'] for ref in g['sourceEvidence']],cefrClassification=None,existingMasterCandidates=g['masterLemmaCandidates'],
                   legacyDependencies=g['legacyCoverageEvidence'],riskTier='HIGH' if risks else 'LOW',riskSignals=risks)
        fields=dict(previous.pilot.content_fields(row),**{'/'+f:row[f] for f in ['displayFormProposal','lexicalUnitTypeProposal','partOfSpeechProposal']})
        row['generatedProvenance']={'sourceType':'GENERATED','actor':'AI_ASSISTANT','humanReviewer':None,'license':None,
               'fields':[{'field':f,'sha256Utf8':hashlib.sha256(v.encode()).hexdigest()} for f,v in fields.items()]}
        row['statuses']=['DRAFT','HUMAN_REVIEW_PENDING']+(['AI_REVIEWED'] if row['proposalKey'] in reviewkeys else [])+(['IDENTITY_REVIEW_REQUIRED'] if risks else [])+(['CORRECTION_PROPOSED'] if any(c['proposalKey']==row['proposalKey'] for c in overlays) else [])
        similarity=[{'field':f,'sharedEightTokenWindows':len(previous.pilot.ngrams(v)&grams),'exactFiveTokens':len(previous.pilot.words(v))>=5 and ' '.join(previous.pilot.words(v)) in exact} for f,v in fields.items() if (previous.pilot.ngrams(v)&grams) or (len(previous.pilot.words(v))>=5 and ' '.join(previous.pilot.words(v)) in exact)]
        warnings=previous.language_signals(row)+(['SOURCE_SIMILARITY_REVIEW'] if similarity else [])
        if row['headwordEvidence'] in {'ashore','comprise','loyal','presently','seven','second','wholesale','regardless of'}:
            warnings.append('SOURCE_POS_OR_CONSTRUCTION_POLICY_REQUIRES_OWNER_REVIEW')
        row['qaFindings']=warnings
        qa.append({'proposalKey':row['proposalKey'],'structuralErrors':[],'warnings':warnings,'sourceSimilarity':similarity,'status':'HUMAN_REVIEW_PENDING'})
        rights.append({'proposalKey':row['proposalKey'],'rights':previous.RIGHTS,'fieldProvenance':row['generatedProvenance'],'clearanceEvidence':[],'copyingSignals':similarity})
    boundaries=[]
    for g in groups:
        senses=[r for r in rows if r['candidateGroupKey']==g['candidateGroupKey']]
        supported={n for ref in g['sourceEvidence'] for n in ref['structuredOxfordSenseGroupOrdinals']}
        represented={n for r in senses for n in r['oxfordGroupOrdinalsConsidered']}
        boundaries.append({'candidateGroupKey':g['candidateGroupKey'],'supportedOrdinals':sorted(supported),'representedOrdinals':sorted(represented),
                           'unrepresentedOrdinals':sorted(supported-represented),'state':'BLOCKED' if not senses else 'HUMAN_BOUNDARY_REVIEW_PENDING'})
    counts={'previousGroups':220,'previousSenses':342,'selected':300,'authoredGroups':len(authored),'blockedGroups':len(blocked),'newSenses':len(rows),
            'totalGroups':220+len(authored),'totalSenses':342+len(rows),'remainingUndrafted':6143-220-len(authored),
            'multiSenseGroups':sum(v>1 for v in Counter(r['candidateGroupKey'] for r in rows).values()),'aiReviewedSenses':len(reviewkeys),
            'humanReviewed':0,'ownerApproved':0,'identityPending':len(rows),'rightsBlocked':len(rows),'correctionFields':len(overlays),
            'sourceCoverage':dict(Counter('+'.join(g['sourceMembership']) for g in groups)),
            'sourcePosCoverage':dict(Counter(p for g in groups for p in set(g['normalizedPosCandidates']))),
            'cefrEvidenceCoverage':dict(Counter(v for g in groups for v in {e['value'] for ref in g['sourceEvidence'] for e in ref['cefrEvidence']}))}
    counts.update(englishDefinitions=len(rows),englishExamples=sum(len(r['content']['examples']) for r in rows),vietnameseMeanings=len(rows),
                  vietnameseExampleTranslations=sum(len(r['content']['examples']) for r in rows),semanticQaBlockers=len(rows),
                  sourceSimilaritySenses=sum(bool(q['sourceSimilarity']) for q in qa),correctedSenses=len({c['proposalKey'] for c in overlays}),
                  draftPosCoverage=dict(Counter(r['partOfSpeechProposal'] for r in rows)))
    reviewed_corrections=[dict(c,aiReview='AI_SELF_REVIEW_OF_PROPOSED_AFTER_AND_COUPLED_TRANSLATION; HUMAN_PENDING') for c in overlays]
    escalation={'policy':'Critical meaning/identity/rights expands whole stratum; two substantive grammar/translation defects expand whole batch',
                'fullReviewStrata':['SOURCE_SIMILARITY','NORMALIZED_HOMOGRAPH_IDENTITY'],
                'fullReviewBatches':sorted({b['batch'] for b in batches if any(c['severity']=='SUBSTANTIVE' and bykey[next(r['candidateGroupKey'] for r in rows if r['proposalKey']==c['proposalKey'])]['candidateGroupKey'] in b['groupKeys'] for c in overlays)}),
                'disposition':'FULL_AI_REVIEW_ALL_471_SENSES_ALREADY_COMPLETED; OWNER_AND_RIGHTS_RELEASE_GATES_REMAIN',
                'allReleasePromotionBlocked':True}
    common={'phase':'2H.2D','artifactType':'NONCANONICAL_EDITORIAL_DRAFT','authorization':previous.AUTH,
            'offlineAuthorization':{'authoring':True,'ownerReviewPackaging':True,'scopedGitPublication':True},'selectionFingerprint':sm['fingerprint']}
    outputs={'sense-proposals.json':dict(common,senses=rows,originals=originals),
             'lexeme-proposals.json':dict(common,groups=[{'candidateGroupKey':g['candidateGroupKey'],'displayFormProposals':sorted({r['displayFormProposal'] for r in rows if r['candidateGroupKey']==g['candidateGroupKey']}),'lexicalUnitTypeProposal':g['lexicalUnitTypeProposal'],'canonicalId':None,'ownerDecision':'UNRESOLVED','identityReviewRequired':True} for g in groups]),
             'quality-audit.json':dict(common,senses=qa,boundaryCoverage=boundaries),
             'editorial-review.json':dict(common,senses=reviews,batches=batches,dimensions=previous.REVIEW_DIMENSIONS,reviewKind='AI_SELF_REVIEW_NOT_HUMAN',
                    correctionReview=reviewed_corrections,externalFactChecks=load(WS/'authored/fact-verification.json'),
                    lowRiskSampling={'method':'SHA256(seed + LF + AUDIT + LF + proposalKey)','target':'At least 20 percent; superseded by full self-review of every Sense','orderedKeys':sorted(reviewkeys,key=lambda k:hashlib.sha256((SEED+'\nAUDIT\n'+k).encode()).hexdigest())},escalation=escalation),
             'provenance-rights-audit.json':dict(common,senses=rights,rights=previous.RIGHTS,mediaCopied=False,
                    checklist=['Identify deck rightsholder and distribution license','Review each generated field and similarity signals','Document permission or independently cleared provenance','Confirm media excluded or separately licensed','Obtain actual human editorial and owner release decisions'],checklistIsClearance=False),
             'validation-summary.json':dict(common,status='PARTIAL' if blocked else 'STRUCTURAL_PASS_HUMAN_REVIEW_PENDING',counts=counts,blockedGroups=blocked,
                    deterministicChecks=['SELECTION_REPLAY','PRIOR_PINS','STRUCTURE','SOURCE_POINTERS','OVERLAYS','SLOT_ACCOUNTING'],externalChecks='RECORDED_SEPARATELY_NOT_RUN_BY_GENERATOR',protectedState=protected,databaseAccess='NONE',databaseWrites='NONE',production='UNTOUCHED')}
    hashes.update({p.relative_to(WS).as_posix():sha(p) for p in sorted((WS/'authored').glob('*.json'))})
    hashes['content-correction-overlays.json']=sha(WS/'content-correction-overlays.json')
    outputs['manifest.json']=dict(common,fingerprint=digest({'authoredByteHashes':hashes,'artifacts':outputs}),authoredByteHashes=hashes,files=list(outputs))
    older=load(ROOT/'vocabflow-dataset/workspaces/master-editorial-quality-corrections/corrected-pilot-preview.json')['senseProposals']+load(previous.WS/'sense-proposals.json')['senses']
    old_audits={r['proposalKey']:r for r in load(previous.WS/'quality-audit.json')['senses']}
    require(len(older)==342,'Prior Sense accounting')
    inventory=[];ledgerbykey={g['candidateGroupKey']:g for g in ledger}
    for r in older+rows:
        g=ledgerbykey[r['candidateGroupKey']];signals=previous.signals(g);q=next((a for a in qa if a['proposalKey']==r['proposalKey']),old_audits.get(r['proposalKey'],
               {'issueFlags':r.get('issueFlags',[]),'identityBlockers':r.get('identityBlockers',[]),'correctionHistory':r.get('correctionHistory',[]),'qualityReviewStatus':r.get('qualityReviewStatus','HUMAN_REVIEW_PENDING')}))
        if g['normalizedHeadword'] in {'ashore','comprise','loyal','presently','seven','second','wholesale','regardless of'}:signals.add('POS_CONFLICT')
        legacy=g['legacyCoverageEvidence'];master=g['masterLemmaCandidates']
        specialist={'indictment','bench','electron','glucose','ergonomic','mammal','microbe','militant','yield','warrant','whip','testify','senator','medicine'}
        actionable=[v for v in q.get('warnings',[]) if v not in {'HUMAN_CONTENT_REVIEW','SENSE_IDENTITY_UNRESOLVED','SENSE_CEFR_UNVERIFIED','RIGHTS_UNRESOLVED'}]
        priority=6 if g['normalizedHeadword'] in specialist or q.get('sourceSimilarity') else 5 if 'LEGACY_HISTORY' in signals else 4 if 'EXISTING_MASTER_LEMMA' in signals or 'POSSIBLE_POLYSEMY' in signals else 3 if signals&{'POS_CONFLICT','CEFR_CONFLICT'} else 2 if actionable or any(c['proposalKey']==r['proposalKey'] for c in overlays) else 1
        inventory.append({'proposalKey':r['proposalKey'],'candidateGroupKey':r['candidateGroupKey'],'headword':r.get('displayFormProposal',r.get('normalizedHeadword',g['normalizedHeadword'])),
                'partOfSpeechProposal':r['partOfSpeechProposal'],'content':r['content'],'sourceMembership':g['sourceMembership'],'sourceEvidence':g['sourceEvidence'],
                'existingMasterCandidates':master,'legacyDependencies':legacy,'riskTier':'HIGH' if priority>=4 else 'MEDIUM' if priority>=2 else 'LOW',
                'priority':priority,'qaFindings':q or {'state':'SEE_ACCEPTED_PRIOR_QA','sourcePhase':'QA1' if r in older[:155] else '2H.2C'},
                'rights':previous.RIGHTS,'recommendedAction':'REVIEW_CONTENT_AND_IDENTITY' if priority>=4 else 'REVIEW_CONTENT',
                'ownerDecision':'UNRESOLVED','editorialProvenance':r.get('generatedProvenance',r.get('fieldAuthorship')),
                'cefrEvidence':[ref['cefrEvidence'] for ref in g['sourceEvidence']],'cefrStatus':'UNVERIFIED_SENSE_CLASSIFICATION',
                'readiness':{'humanContentReview':True,'identityDecision':True,'identityCollisionOrComplexity':priority>=4,'blockedByEvidence':False,'blockedByRights':True,'fullyApproved':False}})
    require(len({r['proposalKey'] for r in inventory})==len(inventory),'Consolidated duplicate key')
    inventory.sort(key=lambda r:(r['priority'],r['headword'],r['proposalKey']))
    qobjects={'review-inventory.json':{'records':inventory,'artifactType':'NONCANONICAL_OWNER_REVIEW'},
              'review-priority.json':{'orderedKeys':[r['proposalKey'] for r in inventory],'policy':'Content ordering independent of universal uncleared rights','tiers':{'1':'low risk without Master collision','2':'minor linguistic review','3':'POS/CEFR ambiguity','4':'polysemy/identity','5':'history/exclusions','6':'specialist or specific rights defect'}},
              'release-blockers.json':{'releaseReadySenses':0,'masterIdsAllocated':0,'rights':previous.RIGHTS,'ownerApproval':'PENDING','identity':'PENDING','canonicalPublicationAuthorized':False,'checklist':outputs['provenance-rights-audit.json']['checklist']},
              'coverage-summary.json':{'previousSenses':342,'newSenses':len(rows),'totalRecords':len(inventory),'uniqueGroups':len({r['candidateGroupKey'] for r in inventory}),'fullyApproved':0,'blockedByRights':len(inventory),'blockedSelectedGroups':blocked}}
    exports={}
    for i in range(0,len(inventory),20):
        lines=['# Owner review batch '+str(i//20+1),'','NONCANONICAL. Decisions requested: KEEP / REVISE / MERGE / SPLIT / DEFER / REJECT. No decision is executed.','']
        for r in inventory[i:i+20]:
            c=r['content'];lines += ['## '+r['headword']+' — '+r['partOfSpeechProposal'],'',r['proposalKey'],'','EN: '+c['definitionEn'],'','VI: '+c['meaningVi'],'','Example EN: '+c['examples'][0]['en'],'','Example VI: '+c['examples'][0]['vi'],'','Grammar: '+c['grammarNotesEn'],'','Sources: '+', '.join(r['sourceMembership'])+'; '+', '.join(ref['artifact']+'#/records/'+str(ref['recordIndex']) for ref in r['sourceEvidence']),
                '', 'Master Lexeme candidate: '+str(bool(r['existingMasterCandidates']['lexemeIdReference']))+'; Sense references: '+str(len(r['existingMasterCandidates']['senseIdReferences']))+'; legacy dependencies: '+str(len(r['legacyDependencies']))+'; risk '+r['riskTier']+'.',
                '', 'Decision requested: KEEP / REVISE / MERGE / SPLIT / DEFER / REJECT. Reviewer: ____; rationale: ____.',
                '', 'Priority '+str(r['priority'])+'; owner UNRESOLVED; rights UNKNOWN_REVIEW_REQUIRED. Master/legacy details: review-inventory.json, exact proposal key.','']
        exports[f'exports/review-{i//20+1:03d}.md']='\n'.join(lines)
    stream=io.StringIO(newline='');writer=csv.writer(stream,lineterminator='\n');writer.writerow(['proposalKey','headword','requestedDecision','reviewer','rationale','ownerStatus'])
    writer.writerows([r['proposalKey'],r['headword'],'','','','UNRESOLVED'] for r in inventory)
    exports['review-decisions-template.csv']=stream.getvalue()
    qobjects['manifest.json']={'fingerprint':digest({'artifacts':qobjects,'exports':exports}),'files':list(qobjects),'exportSha256':{n:hashlib.sha256(t.encode()).hexdigest() for n,t in exports.items()},'decisionOptions':['KEEP','REVISE','MERGE','SPLIT','DEFER','REJECT']}
    report=['# Phase 2H.2D — Bulk editorial and owner review','', 'Selection: '+sm['fingerprint'],'','Editorial: '+outputs['manifest.json']['fingerprint'],'','Queue: '+qobjects['manifest.json']['fingerprint'],'','```json',encode(counts).strip(),'```','', 'Human content, identity, rights and owner release decisions remain pending. All 300 selection slots retained; blocked slots are explicitly accounted. No canonical IDs, runtime mapping or DB operation. Original batch text is immutable; corrections are overlays.','', '## New bilingual draft content','']
    for r in rows:
        c=r['content'];report += ['### '+r['proposalKey'],'',c['definitionEn']+' — '+c['meaningVi'],'',c['examples'][0]['en'],'',c['examples'][0]['vi'],'']
    report+=['## Owner handoff','','Read exports in master-editorial-owner-review-queue/exports, 20 Senses per file. Template decisions are requests only. Rights checklist is not clearance. Blocked groups need evidence/boundary authoring before claiming completion. Human approval and a separately authorized release are required before any Development apply.','']
    report+=['## QA and selection limitations','', 'All source Oxford ordinals are represented, with coalescence of the duplicate ordinal classification for second. This is draft coverage, not an approved exhaustive dictionary. Source annotation exclusions were recorded before freeze. Sunday, Valentine\'s Day and IT required later display corrections: the original display-form validation was insufficient; exact selected keys were retained. Seven has an unresolved numeral POS policy. Ashore overrides a defective adjective source tag with an explicitly reviewed adverb proposal.', '',
              'All 471 Senses received AI self-review; this is not independent human review. Short conventional Vietnamese gloss matches remain source-similarity signals, not a copyright or license decision. Example collisions were rewritten in overlays; originals remain hashed. Critical provenance/identity strata and affected batches receive full AI review; release remains blocked for all Senses.', '', '```json',encode(selection['selection-quota-audit.json']['shortfalls']).strip(),'```','', '## BEFORE / AFTER overlays','']
    for c in overlays:report+=['### '+c['proposalKey']+' '+c['field'],'','BEFORE: '+c['before'],'','AFTER (PROPOSED): '+c['after'],'',c['rationale'],'']
    report+=['## Concept verification sources','']
    for f in load(WS/'authored/fact-verification.json'):report+=['- ['+f['word']+']('+f['url']+'): '+f['scope']]
    report+=['','External tests/typecheck/lint/frozen checks and exact exit codes are in docs/ai-progress.md; the generator does not execute or certify those commands. Previous fingerprints, original bytes and frozen release are separately verified. No database access or writes; Production untouched.','']
    return outputs,qobjects,exports,'\n'.join(report)

def run(check=False):
    outputs,qobjects,exports,report=build()
    files={**{WS/n:encode(v) for n,v in outputs.items()},**{QUEUE/n:encode(v) for n,v in qobjects.items()},**{QUEUE/n:t for n,t in exports.items()},ROOT/'vocabflow-dataset/reports/master-editorial-bulk-300.md':report}
    for p,t in files.items():
        if check:require(p.exists() and p.read_text(encoding='utf8')==t,'Replay drift '+str(p))
        else:p.parent.mkdir(parents=True,exist_ok=True);p.write_text(t,encoding='utf8',newline='\n')
    return {'counts':outputs['validation-summary.json']['counts'],'selection':outputs['manifest.json']['selectionFingerprint'],'editorial':outputs['manifest.json']['fingerprint'],'queue':qobjects['manifest.json']['fingerprint']}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--freeze-selection',action='store_true');p.add_argument('--check',action='store_true');args=p.parse_args()
    require(not(args.freeze_selection and args.check),'Conflicting modes')
    print(encode(freeze() if args.freeze_selection else run(args.check)))
