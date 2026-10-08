#!/usr/bin/env python3
"""Offline noncanonical audit, frozen review cohort and human decision intake.

No database, canonical identity generation, or release publication capability.
"""
import argparse
import copy
import csv
import datetime as dt
import hashlib
import importlib.util
import io
import json
import os
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('bulk',ROOT/'scripts/phase-2h2d-bulk-editorial.py')
bulk=importlib.util.module_from_spec(spec);spec.loader.exec_module(bulk)
load,digest,require,encode=bulk.load,bulk.digest,bulk.require,bulk.encode
WS=ROOT/'vocabflow-dataset/workspaces/master-editorial-approval-gate'
REPORT=ROOT/'vocabflow-dataset/reports/master-editorial-approval-gate.md'
QUEUE_PIN='53fb17292af49e1c2c144a13630275386c7bdd7edc5a4d7e6c5e8ba8aa9b107e'
BULK_PIN='6d9b4c758c0be6f60ee4feb3a38c90dacce7dd053488fc7ff6a680b19f080e85'
SEED='PHASE_2H2E_FIRST40_V1'
LEVELS={'LOW':0,'MEDIUM':1,'HIGH':2,'CRITICAL':3}
DECISIONS=['KEEP','REVISE','MERGE','SPLIT','DEFER','REJECT']
COLUMNS=['proposalKey','contentHash','decision','reviewerId','reviewedAt','rationale','contentApproval',
         'lexemeIdentity','senseIdentity','posDecision','cefrDecision','rightsDispositionRef','correctionRef','identityEvidenceRef','targetMasterSenseId']
RIGHTS_COLUMNS=['rightsRef','proposalKey','contentHash','reviewerId','reviewedAt','decision','scope','originalityAssessment',
                'copyingConcerns','sourceMediaExcluded','attribution','uncertainty','evidenceRefs','rationale']
DIMENSIONS=['EN_DEFINITION','VI_MEANING','EN_GRAMMAR','VI_FAITHFULNESS','POS','EXAMPLE_ALIGNMENT','BOUNDARIES',
            'LEXEME_FORMS','COLLOCATIONS','CEFR','FACTUAL_ACCURACY','SOURCE_SIMILARITY','MASTER_LEGACY','RIGHTS']
SPECIALIST={'bail','physician','immune system','attorney','indictment','bench','electron','glucose','ergonomic','mammal',
            'microbe','militant','yield','warrant','whip','testify','senator','medicine','theology','heir','capitalist','terminal'}

def fields(r):
    return bulk.previous.pilot.content_fields({'content':r['content']})

def revision(r):
    return digest({k:r[k] for k in ['proposalKey','candidateGroupKey','headword','partOfSpeechProposal','content']})

def valid_provenance(record):
    content=fields(record)
    provenance=record.get('editorialProvenance',{})
    evidence={f['field']:f for f in record['reviewFieldProvenance']} if 'reviewFieldProvenance' in record else (
        {f['field']:f for f in provenance['fields']} if 'fields' in provenance else
        {field:dict(value,sha256Utf8=value.get('textHash')) for field,value in provenance.items() if field.startswith('/content/')})
    return all(field in evidence and evidence[field].get('sha256Utf8')==hashlib.sha256(value.encode()).hexdigest() for field,value in content.items())

def inputs():
    ledger,sources,protected,prior=bulk.inputs()
    _,qobjects,exports,_=bulk.build()
    require(qobjects['manifest.json']['fingerprint']==QUEUE_PIN,'Accepted queue fingerprint changed')
    require(load(bulk.WS/'manifest.json')['fingerprint']==BULK_PIN,'Bulk fingerprint changed')
    require(all(load(bulk.QUEUE/n)==v for n,v in qobjects.items()),'Accepted queue artifacts changed')
    require(all((bulk.QUEUE/n).read_text(encoding='utf8')==v for n,v in exports.items()),'Accepted queue exports changed')
    records=qobjects['review-inventory.json']['records']
    require(len(records)==813 and len({r['proposalKey'] for r in records})==813,'Inventory coverage or duplicate')
    return records,{g['candidateGroupKey']:g for g in ledger},sources,protected

def audit(records,ledger):
    siblings=Counter(r['candidateGroupKey'] for r in records);out=[]
    for r in records:
        g=ledger[r['candidateGroupKey']];signals=bulk.previous.signals(g);factors=[]
        def factor(code,level,evidence):factors.append({'factor':code,'level':level,'evidence':evidence})
        if r['legacyDependencies']:factor('LEGACY_LINKED_IDENTITY','HIGH',r['legacyDependencies'])
        if any(x['historyProtected'] for x in r['legacyDependencies']):factor('HISTORY_PROTECTED','HIGH',r['legacyDependencies'])
        if any(x['ownerReviewedExclusionCount'] for x in r['legacyDependencies']):factor('OWNER_EXCLUDED_PAIR','CRITICAL',r['legacyDependencies'])
        master=r['existingMasterCandidates']
        if master['lexemeIdReference'] or master['senseIdReferences']:factor('MASTER_OVERLAP','HIGH',master)
        if siblings[r['candidateGroupKey']]>1:factor('MULTI_SENSE_BOUNDARY','HIGH',{'siblingCount':siblings[r['candidateGroupKey']]})
        blockers=r['qaFindings'].get('identityBlockers',[])
        specific=[b for b in blockers if b!='LEXEME_AND_SENSE_IDENTITY_OWNER_REVIEW']
        if specific:factor('UNRESOLVED_STRUCTURAL_IDENTITY','HIGH',specific)
        if re.search(r'[,()]',r['headword']) or r['headword'] in ['arms','it','IT','seven','second','regardless of','used to']:
            factor('LEXICAL_FORM_OR_CONSTRUCTION','HIGH',r['headword'])
        if g['normalizedHeadword'] in SPECIALIST:factor('SPECIALIST_OR_SENSITIVE','HIGH',g['normalizedHeadword'])
        for signal in ['POS_CONFLICT','CEFR_CONFLICT','MULTIWORD_PHRASAL']:
            if signal in signals:factor(signal,'HIGH' if signal!='CEFR_CONFLICT' else 'MEDIUM',g['sourceEvidence'])
        if r['partOfSpeechProposal'] not in g['normalizedPosCandidates']:factor('PROPOSED_POS_OVERRIDE','HIGH',g['normalizedPosCandidates'])
        q=r['qaFindings'];similarity=q.get('sourceSimilarity',[])
        if similarity:factor('SIMILARITY_REQUIRES_DISPOSITION','MEDIUM',similarity)
        warnings=[w for w in q.get('warnings',[]) if w not in ['HUMAN_CONTENT_REVIEW','SENSE_IDENTITY_UNRESOLVED','SENSE_CEFR_UNVERIFIED','RIGHTS_UNRESOLVED','SOURCE_SIMILARITY_REVIEW']]
        if warnings:factor('LINGUISTIC_OR_POLICY_FINDING','MEDIUM',warnings)
        if q.get('structuralErrors'):factor('STRUCTURAL_FAILURE','CRITICAL',q['structuralErrors'])
        evidence=r['sourceEvidence']
        require(evidence==g['sourceEvidence'],'Queue evidence diverges from pinned ledger')
        if not evidence:factor('MISSING_SOURCE_EVIDENCE','CRITICAL',[])
        bands={e['value'] for ref in evidence for e in ref['cefrEvidence']}
        if not bands:factor('MISSING_CEFR_EVIDENCE','MEDIUM',[])
        # Headword-level CEFR and unknown deck rights are universal pending gates,
        # not evidence that otherwise simple original prose is copied/high-risk.
        level=max((f['level'] for f in factors),key=lambda x:LEVELS[x],default='LOW')
        out.append({'proposalKey':r['proposalKey'],'originalPhase':r['proposalKey'].split(':')[0].replace('EDITORIAL_',''),
                    'acceptedContentHash':revision(r),'correctedContentVersion':'QA1_CORRECTED_PREVIEW' if r['proposalKey'].startswith('EDITORIAL_2H2B') else '2H2D_OVERLAY_PREVIEW' if r['proposalKey'].startswith('EDITORIAL_2H2D') else 'ACCEPTED_2H2C_DRAFT',
                    'oldRiskTier':r['riskTier'],'proposedRiskTier':level,'riskFactors':factors,
                    'reasonForChange':'All legacy links, preserved blockers, siblings and actual identity evidence checked; wording correction never clears identity',
                    'reviewerStatus':'AI_METADATA_AUDIT_RECOMMENDATION_HUMAN_PENDING','sourceEvidence':evidence,
                    'candidateLexeme':{'key':r['candidateGroupKey'],'display':r['headword'],'identity':'UNRESOLVED'},
                    'senseIdentity':'UNRESOLVED','posConstruction':{'proposal':r['partOfSpeechProposal'],'notes':r['content']['grammarNotesEn']},
                    'cefrEvidence':r['cefrEvidence'],'cefrStatus':'UNVERIFIED','provenance':r['editorialProvenance'],
                    'existingMasterCandidates':master,'legacyDependencies':r['legacyDependencies'],'semanticQa':q,
                    'rights':{'sourceDeck':'UNKNOWN_REVIEW_REQUIRED','originalEditorial':'REVIEW_PENDING','media':'EXCLUDED'},
                    'pendingGates':['HUMAN_CONTENT','LEXEME_IDENTITY','SENSE_IDENTITY','POS','CLASSIFICATION','RIGHTS']})
    return out

def select(records,risks):
    risk={r['proposalKey']:r for r in risks}
    pool=[r for r in records if risk[r['proposalKey']]['proposedRiskTier']=='LOW' and r['partOfSpeechProposal'] in ['NOUN','VERB','ADJECTIVE','ADVERB']]
    pool.sort(key=lambda r:(hashlib.sha256((SEED+'\n'+r['proposalKey']).encode()).hexdigest(),r['proposalKey']))
    chosen=[];keys=set();targets={'NOUN':10,'VERB':10,'ADJECTIVE':10,'ADVERB':10,'OXFORD_ONLY':8,'VOCAB4600_ONLY':8,'BOTH':16,**{'CEFR_'+x:3 for x in ['A1','A2','B1','B2','C1']}}
    def signals(r):return {r['partOfSpeechProposal'],'BOTH' if len(r['sourceMembership'])==2 else 'OXFORD_ONLY' if r['sourceMembership']==['OXFORD_5000'] else 'VOCAB4600_ONLY'}|{'CEFR_'+e['value'] for ref in r['sourceEvidence'] for e in ref['cefrEvidence']}
    count=Counter();capacity=Counter(s for r in pool for s in signals(r))
    for q in sorted(targets,key=lambda q:(capacity[q]/targets[q],q)):
        for r in pool:
            if len(chosen)==40 or count[q]>=min(targets[q],capacity[q]):break
            if r['proposalKey'] not in keys and q in signals(r) and count[r['partOfSpeechProposal']]<10:
                chosen.append(r);keys.add(r['proposalKey']);count.update(signals(r))
    for r in pool:
        if len(chosen)==40:break
        if r['proposalKey'] not in keys:chosen.append(r);keys.add(r['proposalKey']);count.update(signals(r))
    if len(chosen)<40:
        extra=sorted([r for r in records if r['proposalKey'] not in keys],key=lambda r:(LEVELS[risk[r['proposalKey']]['proposedRiskTier']],hashlib.sha256((SEED+'\n'+r['proposalKey']).encode()).hexdigest()))
        chosen.extend(extra[:40-len(chosen)])
    require(len(chosen)==40,'Fewer than 40 reviewable records')
    return {'seed':SEED,'algorithm':'SCARCE_STRATUM_HASH_RANK_POS_CAP_V1','acceptedQueueFingerprint':QUEUE_PIN,
            'eligibleLowRiskCount':len(pool),'reviewOnlyCount':sum(r not in pool for r in chosen),'coverage':dict(count),'targets':targets,'capacity':dict(capacity),
            'quotaShortfalls':[{'dimension':q,'target':v,'achieved':count[q],'available':capacity[q]} for q,v in targets.items() if count[q]<v],
            'records':[{'proposalKey':r['proposalKey'],'acceptedContentHash':revision(r),'reviewOnly':r not in pool,'record':r} for r in chosen]}

def freeze():
    records,ledger,_,_=inputs();selection=select(records,audit(records,ledger))
    objects={'selected-first-40.json':selection};objects['selection-manifest.json']={'fingerprint':digest(objects),'frozenBeforeLinguisticReview':True,'files':['selected-first-40.json']}
    for n,v in objects.items():
        p=WS/n;require(not p.exists() or load(p)==v,'Refuse to replace frozen cohort');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(encode(v),encoding='utf8',newline='\n')
    return objects['selection-manifest.json']['fingerprint']

def timestamp(value):
    require(bool(re.fullmatch(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z',value or '')),'Actual UTC review date required')
    parsed=dt.datetime.fromisoformat(value.replace('Z','+00:00'))
    require(parsed<=dt.datetime.now(dt.timezone.utc),'Future review date rejected')

def trust_bundle(path=None,expected=None):
    if path is None:return {'reviewers':[],'rights':[],'identityEvidence':[],'classificationEvidence':[],'approvalEvidence':[]}
    raw=Path(path).read_bytes();require(expected and hashlib.sha256(raw).hexdigest()==expected,'Owner-verified trust bundle SHA required')
    value=json.loads(raw);require(value.get('authorizationEvidenceRef'),'Reviewer registry needs actual owner authorization evidence')
    return value

def authorized(reviewer,when,trust,role):
    timestamp(when)
    actor=next((r for r in trust['reviewers'] if r['reviewerId']==reviewer),None)
    require(actor and actor.get('kind')=='HUMAN' and role in actor.get('roles',[]) and actor.get('authorizationEvidenceRef'),'Unauthorized or nonhuman reviewer')
    require(actor['authorizedFrom']<=when<=actor['authorizedThrough'],'Reviewer authorization date outside validity')

def validate_rights(value,record,trust):
    authorized(value.get('reviewerId'),value.get('reviewedAt'),trust,'RIGHTS_REVIEWER')
    require(value.get('proposalKey')==record['proposalKey'] and value.get('contentHash')==revision(record),'Rights evidence stale or wrong subject')
    require(value.get('decision')=='ADEQUATE_FOR_INTENDED_PUBLICATION','Rights not resolved')
    require(value.get('scope')=='ORIGINAL_EDITORIAL_TEXT_ONLY_NO_MEDIA','Rights scope must exclude deck media and copying')
    require(value.get('sourceMediaExcluded') is True and value.get('evidenceRefs') and value.get('originalityAssessment') and value.get('rationale'),'Rights evidence incomplete')
    require(value.get('copyingConcerns')=='RESOLVED' and value.get('attribution') and value.get('uncertainty')=='RESOLVED','Rights copying/attribution uncertainty unresolved')
    require(all(any(x.get('evidenceRef')==ref and re.fullmatch(r'[0-9a-f]{64}',x.get('sha256','')) and x.get('ownerVerified') is True for x in trust.get('evidenceInventory',[])) for ref in value['evidenceRefs']),'Rights evidence references not owner-verified and pinned')

def validate_decision(row,records,trust,overlays):
    require(set(row)==set(COLUMNS),'Decision format fields mismatch')
    key=row['proposalKey'];require(key in records,'Unknown proposal key');record=records[key]
    require(row['contentHash']==revision(record),'Stale content hash')
    require(row['decision'] in DECISIONS,'Invalid decision')
    authorized(row['reviewerId'],row['reviewedAt'],trust,'CONTENT_REVIEWER')
    require(len(row['rationale'].strip())>=10,'Specific review rationale required')
    for name,allowed in [('contentApproval',['PENDING','APPROVED','NOT_APPROVED']),('lexemeIdentity',['PENDING','CONFIRMED_NEW','CONFIRMED_EXISTING']),('senseIdentity',['PENDING','CONFIRMED_NEW','CONFIRMED_EXISTING']),('posDecision',['PENDING','ACCEPTED']),('cefrDecision',['PENDING','UNCLASSIFIED_REVIEWED','ACCEPTED_EVIDENCE'])]:
        require(row[name] in allowed,'Invalid '+name)
    require(row['decision'] not in ['DEFER','REJECT','REVISE','MERGE','SPLIT'] or row['contentApproval']!='APPROVED','Non-KEEP cannot approve current content')
    if row['decision']=='REVISE':require(any(c['correctionRef']==row['correctionRef'] and c['proposalKey']==key for c in overlays),'REVISE needs exact proposed correction')
    if row['contentApproval']=='APPROVED':
        evidence=next((e for e in trust.get('approvalEvidence',[]) if e.get('proposalKey')==key and e.get('contentHash')==row['contentHash'] and e.get('reviewerId')==row['reviewerId'] and e.get('reviewedAt')==row['reviewedAt']),None)
        require(evidence and evidence.get('humanSubmissionEvidenceRef'),'Approved content needs real human submission evidence')
    if row['lexemeIdentity']!='PENDING' or row['senseIdentity']!='PENDING' or row['decision'] in ['MERGE','SPLIT'] or row['targetMasterSenseId']:
        e=next((e for e in trust.get('identityEvidence',[]) if e.get('identityEvidenceRef')==row['identityEvidenceRef']),None)
        require(e and e.get('proposalKey')==key and e.get('contentHash')==row['contentHash'] and e.get('humanSubmissionEvidenceRef'),'Reviewed identity evidence required')
        authorized(e.get('reviewerId'),e.get('reviewedAt'),trust,'IDENTITY_REVIEWER')
        require(e.get('lexemeIdentity')==row['lexemeIdentity'] and e.get('senseIdentity')==row['senseIdentity'],'Identity decision mismatches evidence')
        require(not e.get('protectedConflict') and e.get('protectedReferenceAssessment')=='NO_CONFLICT_CONFIRMED','Protected identity unresolved')
        if row['decision'] in ['MERGE','SPLIT']:
            targets=e.get('reviewedTargets',[]);require(targets and all(t.get('proposalKey') in records and revision(records[t['proposalKey']])==t.get('contentHash') for t in targets),'Unresolved MERGE/SPLIT target')
            require(e.get('action')==row['decision'],'Identity evidence action mismatch')
        if row['targetMasterSenseId'] or 'CONFIRMED_EXISTING' in [row['lexemeIdentity'],row['senseIdentity']]:
            _,_,master,_,_=bulk.previous.pilot.inputs()
            target=row['targetMasterSenseId'];require(target and target in master,'Target is not pinned approved Master Sense')
            require(e.get('approvedMasterSenseId')==target and e.get('approvedMasterPinHash')==digest(master[target]),'Arbitrary existing Sense reuse rejected')
        else:require(not e.get('approvedMasterSenseId'),'New identity cannot reuse Master')
    if row['cefrDecision']!='PENDING':
        e=next((e for e in trust.get('classificationEvidence',[]) if e.get('proposalKey')==key and e.get('contentHash')==row['contentHash'] and e.get('decision')==row['cefrDecision']),None)
        require(e and e.get('evidenceRefs') and e.get('humanSubmissionEvidenceRef'),'Classification evidence required')
        authorized(e.get('reviewerId'),e.get('reviewedAt'),trust,'CLASSIFICATION_REVIEWER')
    if row['rightsDispositionRef']:
        e=next((e for e in trust.get('rights',[]) if e.get('rightsRef')==row['rightsDispositionRef']),None)
        require(e,'Missing rights evidence');validate_rights(e,record,trust)
    return row

def intake(rows,records,ledger,trust,overlays):
    out=copy.deepcopy(ledger);bykey={r['proposalKey']:r for r in out['decisions']};incoming={}
    for row in rows:
        if not row.get('decision','').strip():
            require(all(not row.get(k,'') for k in COLUMNS if k not in ['proposalKey','contentHash','decision']),'Partial nonempty decision without action');continue
        row={k:v.strip() for k,v in row.items()};validate_decision(row,records,trust,overlays);key=row['proposalKey']
        require(key not in incoming or incoming[key]==row,'Contradictory duplicate decision');incoming[key]=row
    for key,row in incoming.items():
        require(key not in bykey or bykey[key]==row,'Conflicting decision; preserve prior event and obtain explicit supersession in later phase')
        if key in bykey:continue
        out['decisions'].append(row);out['events'].append({'eventHash':digest(row),'decision':row,'trustBundleHash':digest(trust),'submissionEvidence':trust.get('authorizationEvidenceRef')})
    return out

def promotion(record,decision,trust,review,issue_count):
    require(not decision or decision['proposalKey']==record['proposalKey'],'Gate decision subject mismatch')
    rights=next((e for e in trust.get('rights',[]) if decision and e.get('rightsRef')==decision['rightsDispositionRef']),None)
    approved=bool(decision and decision['decision']=='KEEP' and decision['contentApproval']=='APPROVED')
    content_evidence=next((e for e in trust.get('approvalEvidence',[]) if decision and e.get('proposalKey')==record['proposalKey'] and e.get('contentHash')==revision(record)),{})
    reviewed_codes={f['code'] for f in review.get('findings',[])} if review else set()
    findings_resolved=approved and reviewed_codes<=set(content_evidence.get('resolvedFindingCodes',[]))
    identity=bool(decision and decision['lexemeIdentity']!='PENDING' and decision['senseIdentity']!='PENDING')
    gates={'DRAFT_COMPLETE':all(fields(record).values()),'AI_QA_COMPLETE':bool(review),
           'HUMAN_CONTENT_REVIEWED':approved,'IDENTITY_RESOLVED':identity,'POS_ACCEPTED':bool(decision and decision['posDecision']=='ACCEPTED'),
           'CLASSIFICATION_REVIEWED':bool(decision and decision['cefrDecision']!='PENDING'),'FIELD_PROVENANCE_VALID':valid_provenance(record),
           'SIMILARITY_RESOLVED':bool(rights),'RIGHTS_RESOLVED':bool(rights),'PROTECTED_CONFLICT_RESOLVED':identity,
           'CONTENT_FINDINGS_RESOLVED':findings_resolved,'AUTHORIZED_OWNER_DECISION':approved}
    gates['READY_FOR_CANONICAL_AUTHORING']=all(gates.values());gates['CANONICAL_AUTHORIZED']=False
    return {'proposalKey':record['proposalKey'],'contentHash':revision(record),'gates':gates,'missingPromotionGates':[k for k,v in gates.items() if not v]}

def csv_text(columns,rows):
    s=io.StringIO(newline='');w=csv.DictWriter(s,fieldnames=columns,lineterminator='\n');w.writeheader();w.writerows(rows);return s.getvalue()

def build():
    records,ledger,sources,protected=inputs();risks=audit(records,ledger);selection=select(records,risks);sm=load(WS/'selection-manifest.json')
    require(digest({'selected-first-40.json':selection})==sm['fingerprint'] and load(WS/'selected-first-40.json')==selection,'Frozen selection replay changed')
    qa=load(WS/'linguistic-qa.json');overlays=load(WS/'content-correction-overlays.json')['corrections'];selected=selection['records']
    require({r['proposalKey'] for r in qa['reviews']}=={r['proposalKey'] for r in selected},'40 Sense review incomplete')
    require(all(r['reviewerKind']=='AI_SELF_REVIEW' and set(r['dimensionNotes'])==set(DIMENSIONS) and all(r['dimensionNotes'].values()) for r in qa['reviews']),'Review dimensions incomplete')
    original={r['proposalKey']:r['record'] for r in selected};preview=copy.deepcopy(original)
    for c in overlays:
        r=preview[c['proposalKey']];require(c['originalContentHash']==revision(original[c['proposalKey']]),'Overlay stale original')
        require(fields(r).get(c['field'])==c['before'] and c['before']!=c['after'] and c['ownerDecision']=='UNRESOLVED','Invalid overlay')
        require(hashlib.sha256(c['before'].encode()).hexdigest()==c['beforeSha256'] and hashlib.sha256(c['after'].encode()).hexdigest()==c['afterSha256'],'Overlay field hash mismatch')
        parts=c['field'].strip('/').split('/');target=r
        for part in parts[:-1]:target=target[int(part)] if isinstance(target,list) else target[part]
        target[parts[-1]]=c['after']
    for key,r in preview.items():
        require(valid_provenance(original[key]),'Accepted content provenance mismatch')
        r['reviewFieldProvenance']=[]
        for field,value in fields(r).items():
            correction=next((c for c in overlays if c['proposalKey']==key and c['field']==field),None)
            r['reviewFieldProvenance'].append({'field':field,'sourceType':'GENERATED','sha256Utf8':hashlib.sha256(value.encode()).hexdigest(),
                'acceptedFieldSha256':hashlib.sha256(fields(original[key])[field].encode()).hexdigest(),
                'correctionRef':correction['correctionRef'] if correction else None,'humanApproval':'UNRESOLVED'})
        require(valid_provenance(r),'Preview content provenance mismatch')
    bykey={r['proposalKey']:r for r in records};bykey.update(preview)
    human=load(WS/'owner-decision-ledger.json');trust=load(WS/'reviewer-authorization.json')
    require(all(h['eventHash']==digest(h['decision']) for h in human['events']),'Decision audit history corrupt')
    require(len(human['events'])==len(human['decisions']) and {digest(r) for r in human['decisions']}=={h['eventHash'] for h in human['events']},'Ledger and audit event coverage mismatch')
    require(all(h['trustBundleHash']==digest(trust) for h in human['events']),'Decision authorization provenance changed')
    validated=intake(human['decisions'],bykey,{'decisions':[],'events':[]},trust,overlays)
    require(validated['decisions']==human['decisions'],'Decision ledger validation mismatch')
    glossary=[];q=load(bulk.WS/'quality-audit.json')['senses']
    for signal in [a for a in q if a['sourceSimilarity']]:
        r=bykey[signal['proposalKey']];matches=[{'proposalKey':x['proposalKey'],'sameGroup':x['candidateGroupKey']==r['candidateGroupKey'],'samePos':x['partOfSpeechProposal']==r['partOfSpeechProposal']} for x in records if x['proposalKey']!=r['proposalKey'] and x['content']['meaningVi']==r['content']['meaningVi']]
        glossary.append({'proposalKey':r['proposalKey'],'gloss':r['content']['meaningVi'],'signals':signal['sourceSimilarity'],'otherDraftExactGlossMatches':matches,
                         'disposition':'SHORT_CONVENTIONAL_GLOSS_OVERLAP_NOT_IDENTITY_PROOF','analysis':'Shared lexical equivalents do not establish copied explanatory prose or shared Sense identity. Examine POS, definitions, examples and sibling boundaries; retain original identities.',
                         'reviewerStatus':'AI_GLOSS_AND_BOUNDARY_COMPARISON; HUMAN_RIGHTS_PENDING','autoMerge':False})
    require(len(glossary)==18,'All 18 accepted gloss signals must be accounted')
    facts=load(WS/'duplicate-gloss-notes.json');require(set(facts)=={r['proposalKey'] for r in glossary},'Explicit gloss notes incomplete')
    for g in glossary:g['actualFinding']=facts[g['proposalKey']]
    _,grams=bulk.previous.pilot.source_passages([ledger[r['candidateGroupKey']] for r in preview.values()],sources)
    results=[];candidate=[]
    for item in selected:
        r=preview[item['proposalKey']];review=next(x for x in qa['reviews'] if x['proposalKey']==r['proposalKey']);issues=review['findings']
        decision=next((x for x in human['decisions'] if x['proposalKey']==r['proposalKey']),None)
        gate=promotion(r,decision,trust,review,len(issues));results.append(gate)
        candidate.append({'proposalKey':r['proposalKey'],'acceptedContentHash':item['acceptedContentHash'],'reviewContentHash':revision(r),
                 'frozenAcceptedContent':item['record'],'proposedOverlayContent':r,'candidateLexicalIdentity':{'candidateGroupKey':r['candidateGroupKey'],'headword':r['headword'],'status':'UNRESOLVED'},
                 'provenance':{'accepted':r['editorialProvenance'],'overlayFields':[{'field':c['field'],'sourceType':'GENERATED','sha256Utf8':hashlib.sha256(c['after'].encode()).hexdigest()} for c in overlays if c['proposalKey']==r['proposalKey']]},
                 'issues':issues,'ownerDecision':decision,'rightsStatus':'UNKNOWN_REVIEW_REQUIRED' if not gate['gates']['RIGHTS_RESOLVED'] else 'DOCUMENTED_TEXT_SCOPE_ONLY',
                 'sourceEightTokenSimilarity':[f for f,v in fields(r).items() if bulk.previous.pilot.ngrams(v)&grams],
                 'missingPromotionGates':gate['missingPromotionGates'],'canonicalId':None,'runtimeMapping':None,'publicationEligible':False})
    columns_schema={'schemaVersion':'OFFLINE_OWNER_DECISION_V1','fields':COLUMNS,'decisions':DECISIONS,'enumValues':{'contentApproval':['PENDING','APPROVED','NOT_APPROVED'],'lexemeIdentity':['PENDING','CONFIRMED_NEW','CONFIRMED_EXISTING'],'senseIdentity':['PENDING','CONFIRMED_NEW','CONFIRMED_EXISTING'],'posDecision':['PENDING','ACCEPTED'],'cefrDecision':['PENDING','UNCLASSIFIED_REVIEWED','ACCEPTED_EVIDENCE']},'reviewDateFormat':'YYYY-MM-DDTHH:MM:SSZ','contentHashMethod':'SHA256 canonical sorted UTF8 JSON(proposalKey,candidateGroupKey,headword,partOfSpeechProposal,content)','emptyAndPartialAccepted':True,'trustSource':'Actual human submission plus owner-verified reviewer authorization bundle; generated data is never authorization','canonicalSchemaChanged':False}
    matrix={'sourceDeckRights':'UNKNOWN_REVIEW_REQUIRED','rows':[
        {'category':'SOURCE_DECK_EXPRESSIVE_TEXT_OR_MEDIA','action':'Obtain compatible permission and exact attribution, or exclude; unresolved copying blocks','permissionInvented':False},
        {'category':'INDEPENDENT_EDITORIAL_WORDING','action':'Review authorship trail and full-source similarity, generated-tool terms and intended distribution; unknown deck license is not proof this prose is copied'},
        {'category':'LEXICAL_FACTS_POS_CEFR','action':'Separate observations from expression; substantiate classifications and assess source/database obligations without assuming blanket clearance'},
        {'category':'THIRD_PARTY_REFERENCE_URL','action':'Concept evidence only; copying definitions requires separate compatible license or permission'},
        {'category':'CONVENTIONAL_SHORT_GLOSS','action':'Assess phrase length, expressive originality and context; no automatic merge or automatic legal clearance'},
        {'category':'UNRESOLVED_OR_JURISDICTION_DEPENDENT','action':'Independent rewriting or qualified legal/rights review before publication'}],
        'rightsDecisionFields':RIGHTS_COLUMNS,'actualRightsDecisions':len(trust.get('rights',[])),'sourceMediaExcluded':True,'clearanceByChecklist':False,
        'referenceScope':'US primary guidance only; no jurisdiction-specific legal clearance inferred',
        'primaryReferences':[
            {'url':'https://www.copyright.gov/help/faq/faq-protect.html','use':'Distinguish factual observations and conventional phrases from expressive prose; source compilation obligations need separate assessment'},
            {'url':'https://www.copyright.gov/help/faq/faq-fairuse.html','use':'Eight-token similarity is a technical screening heuristic, never a legal copying or fair-use threshold'},
            {'url':'https://www.copyright.gov/newsnet/2025/1060.html','use':'Generated provenance is not proof of human authorship, copyrightability or compatible publication rights'}]}
    counts={'inventory':813,'draftGroups':520,'riskReclassified':sum(r['oldRiskTier']!=r['proposedRiskTier'] for r in risks),'riskTiers':dict(Counter(r['proposedRiskTier'] for r in risks)),
            'glossSignalsReviewed':18,'cohort':40,'linguisticIssues':sum(len(r['findings']) for r in qa['reviews']),'correctionFields':len(overlays),'reviewPacks':4,
            'actualHumanDecisions':len(human['decisions']),'identityResolved':sum(r['gates']['IDENTITY_RESOLVED'] for r in results),'classificationReviewed':sum(r['gates']['CLASSIFICATION_REVIEWED'] for r in results),
            'rightsResolved':sum(r['gates']['RIGHTS_RESOLVED'] for r in results),'readyForCanonicalAuthoring':sum(r['gates']['READY_FOR_CANONICAL_AUTHORING'] for r in results),'releaseReady':0}
    objects={'risk-rubric.json':{'version':'EXPLICIT_FACTORS_V1','levels':LEVELS,'precedence':'Maximum material factor severity; rights and headword CEFR pending are separate universal gates','knownBlockersSurviveCorrections':True},
             'risk-reclassification.json':{'records':risks},'duplicate-gloss-review.json':{'records':glossary},'owner-decision-schema.json':columns_schema,
             'rights-disposition-matrix.json':matrix,'promotion-gate-results.json':{'records':results},'release-candidate-preview.json':{'artifactType':'NONCANONICAL_EDITORIAL_CANDIDATE_NOT_MASTER_RELEASE','records':candidate},
             'validation-summary.json':{'status':'TECHNICAL_PASS_HUMAN_DECISIONS_PENDING','counts':counts,'inputQueueFingerprint':QUEUE_PIN,'selectionFingerprint':sm['fingerprint'],'authorization':bulk.previous.AUTH,'databaseAccess':'NONE','databaseWrites':'NONE','production':'UNTOUCHED','protectedState':protected,'externalChecks':'Not run by generator; see verification-results.json'}}
    templates={}
    for n in range(4):
        subset=candidate[n*10:n*10+10];lines=['# First 40 — owner review pack '+str(n+1),'','Keep decisions blank until you actually review. KEEP does not clear rights, classification or identity. Save this pack CSV and resume later.','', 'Decision options: KEEP / REVISE / MERGE / SPLIT / DEFER / REJECT.','']
        for r in subset:
            p=r['proposedOverlayContent'];c=p['content'];lines+=['## '+p['headword']+' / '+p['partOfSpeechProposal'],'',r['proposalKey'],'','Review hash: `'+r['reviewContentHash']+'`','', '| Field | English | Vietnamese |','|---|---|---|', '| Meaning | '+c['definitionEn'].replace('|','/')+' | '+c['meaningVi'].replace('|','/')+' |','| Example | '+c['examples'][0]['en'].replace('|','/')+' | '+c['examples'][0]['vi'].replace('|','/')+' |','', 'Grammar: '+c['grammarNotesEn'],'','Master: '+encode(p['existingMasterCandidates']).strip().replace('\n',' '), '','Legacy: '+encode(p['legacyDependencies']).strip().replace('\n',' '),'','QA: '+encode(r['issues']).strip().replace('\n',' '),'','Missing gates: '+', '.join(r['missingPromotionGates']),'','Source evidence: '+', '.join(x['artifact']+'#/records/'+str(x['recordIndex']) for x in p['sourceEvidence']),'']
            for overlay in [o for o in overlays if o['proposalKey']==r['proposalKey']]:lines+=['BEFORE '+overlay['field']+': '+overlay['before'],'','AFTER (PROPOSED): '+overlay['after'],'','Correction ref: '+overlay['correctionRef'],'']
        templates[f'review-packs/review-{n+1:02d}.md']='\n'.join(lines)
        templates[f'review-packs/decisions-{n+1:02d}.csv']=csv_text(COLUMNS,[dict.fromkeys(COLUMNS,'')|{'proposalKey':r['proposalKey'],'contentHash':r['reviewContentHash']} for r in subset])
    templates['owner-decision-template.csv']=csv_text(COLUMNS,[dict.fromkeys(COLUMNS,'')|{'proposalKey':r['proposalKey'],'contentHash':r['reviewContentHash']} for r in candidate])
    templates['rights-review-template.csv']=csv_text(RIGHTS_COLUMNS,[dict.fromkeys(RIGHTS_COLUMNS,'')|{'proposalKey':r['proposalKey'],'contentHash':r['reviewContentHash']} for r in candidate])
    persisted={n:load(WS/n) for n in ['linguistic-qa.json','content-correction-overlays.json','duplicate-gloss-notes.json','owner-decision-ledger.json','reviewer-authorization.json','selected-first-40.json','selection-manifest.json']}
    objects['manifest.json']={'fingerprint':digest({'artifacts':objects,'persistedInputs':persisted,'exports':templates}),'inputQueueFingerprint':QUEUE_PIN,'files':list(objects),'persistedInputHashes':{n:digest(v) for n,v in persisted.items()},'exportHashes':{n:hashlib.sha256(v.encode()).hexdigest() for n,v in templates.items()}}
    report=render_report(objects,selection,qa,overlays)
    return objects,templates,report

def render_report(objects,selection,qa,overlays):
    counts=objects['validation-summary.json']['counts']
    lines=['# Phase 2H.2E — Approval intake and first 40-Sense candidate','', 'Offline technical completion; actual human decisions and canonical authorization remain absent.','', 'Approval gate fingerprint: '+objects['manifest.json']['fingerprint'],'','```json',encode(counts).strip(),'```','', 'Risk audit covers all 813 keys. Any legacy-linked identity is HIGH, regardless of history count. Specific unresolved lexical/alias blockers remain HIGH after wording correction. a, an and abnormal were incorrectly LOW and are now HIGH. The accepted queue and original drafts are unchanged. Source rights unknown is a gate, not automatic proof that original prose is copied.','', '## Frozen selection','', '```json',encode({k:v for k,v in selection.items() if k!='records'}).strip(),'```','', '## Owner workflow','', '1. Read one review pack and edit its decisions CSV. Leave untouched rows blank. Keep exact proposal key and review hash.',
         '2. Record actual reviewer ID, UTC date, rationale and separate content, Lexeme/Sense, POS, classification and rights decisions. KEEP alone is a disposition; PENDING fields are valid.',
         '3. Submit the completed file to the owner in a future task. The owner must authorize real reviewer IDs, roles and dates in a trusted evidence bundle. The checked-in registry is empty; AI recommendations cannot authorize a reviewer.',
         '4. Validate first; import only into the offline ledger after the owner verifies the authorization bundle SHA. The CSV does not authenticate its signer by itself. Never authorize a bundle only because it was supplied by the same untrusted CSV.',
         '5. Partial imports append hash-addressed events; identical reimport adds no event. Conflicts fail atomically and preserve prior decisions. Changed decisions need an explicit later supersession workflow, not overwrite.',
         '', '```powershell', 'python -B scripts/phase-2h2e-approval-gate.py --validate-decisions PATH.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA',
         'python -B scripts/phase-2h2e-approval-gate.py --import-decisions PATH.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA',
         'python -B scripts/phase-2h2e-approval-gate.py --validate-rights RIGHTS.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA',
         'python -B scripts/phase-2h2e-approval-gate.py --check','```','',
         'The trust bundle holds human reviewers (kind HUMAN; authorizedFrom/Through; roles; authorizationEvidenceRef), actual approvalEvidence with humanSubmissionEvidenceRef, identityEvidence with reviewed target hashes and protected reference assessment, classificationEvidence and rights evidence. See tests for synthetic isolated examples; test identities are never written to the real ledger. --validate-decisions writes nothing. --import-decisions appends only offline ledger/history and refreshes this package. It never changes the 813 accepted drafts or allocates identities.',
         '', 'REVISE references an exact overlay and never approves its original automatically. MERGE/SPLIT require human identity evidence and exact reviewed target revisions; operations are recorded only. Existing Master reuse must match pinned approved Sense and its record hash; lemma similarity cannot authorize it. DEFER/REJECT are not approvals. Rights decisions must cover this exact content revision, original editorial text only, excluded media, originality assessment, copying concerns, attribution and actual rights-review evidence.',
         '', '## Rights matrix','', 'Deck permissions, independent editorial wording, lexical/POS/CEFR facts, third-party references and short conventional glosses are separate. Unknown deck license provides no permission to reproduce expressive deck text/media. Independently authored wording is not labelled copied merely because deck rights are unknown. Similarity signals still require actual rights assessment; reference URLs confer no reproduction license. Legal/rights review is needed for unresolved publication rights, not invented clearance.',
         '', 'The rights CSV validator emits normalized evidence records without writing or granting clearance. The owner can review these records and include them in the verified trust bundle. evidenceInventory pins each supporting evidence reference with SHA256 and ownerVerified=true. An established ledger rejects silent trust-bundle changes; extending reviewer authorization requires explicit reconciliation. Import receipts under decision-history preserve the prior ledger hash, new snapshot and verified bundle before snapshot replacement, allowing recovery after an interrupted refresh.',
         '', 'Primary guidance (US scope only): [protected expression and facts](https://www.copyright.gov/help/faq/faq-protect.html), [no fixed fair-use word threshold](https://www.copyright.gov/help/faq/faq-fairuse.html), [AI output and human expressive authorship](https://www.copyright.gov/newsnet/2025/1060.html). The eight-token scan is technical screening, not legal clearance. Generated provenance is not a claim of human authorship or copyright ownership.',
         '', '## Corrections','']
    for c in overlays:lines+=['### '+c['correctionRef'],'','BEFORE: '+c['before'],'','AFTER (PROPOSED): '+c['after'],'',c['rationale'],'']
    lines+=['## Remaining gates','','Human content, Lexeme/Sense identity, POS/construction, classification, originality/similarity, field provenance and adequate intended-publication rights. CANONICAL_AUTHORIZED is false irrespective of future offline intake. No canonical UUIDs, runtime mappings or DB capabilities. Hybrid 2.2.1 (87/100), legacy 2018/history75/#11/#284/#295/#849/exclusions remain pinned offline; no live verification. Production untouched.','', 'Next: obtain real owner decisions and rights evidence, then validate them in a separately authorized task before canonical materialization and Development planning. No automatic next phase. External command evidence is recorded separately from generator checks.','']
    return '\n'.join(lines)

def run(check=False):
    objects,templates,report=build();outputs={**{WS/n:encode(v) for n,v in objects.items()},**{WS/n:v for n,v in templates.items()},REPORT:report}
    for p,t in outputs.items():
        if check:require(p.exists() and p.read_text(encoding='utf8')==t,'Offline replay drift '+str(p))
        else:p.parent.mkdir(parents=True,exist_ok=True);p.write_text(t,encoding='utf8',newline='\n')
    return {'fingerprint':objects['manifest.json']['fingerprint'],'counts':objects['validation-summary.json']['counts']}

def import_file(path,trust,write=False):
    run(True);objects,_,_=build();records={r['proposedOverlayContent']['proposalKey']:r['proposedOverlayContent'] for r in objects['release-candidate-preview.json']['records']}
    # Intake is scoped to the frozen 40; later cohorts can be versioned separately.
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);require(reader.fieldnames is None or reader.fieldnames==COLUMNS,'CSV header mismatch');rows=list(reader)
    ledger=load(WS/'owner-decision-ledger.json');overlays=load(WS/'content-correction-overlays.json')['corrections'];updated=intake(rows,records,ledger,trust,overlays)
    if write and updated!=ledger:
        require(not ledger['decisions'] or load(WS/'reviewer-authorization.json')==trust,'Trust bundle change requires explicit reviewed authorization reconciliation')
        event_path=WS/'decision-history'/('import-'+digest({'ledger':updated,'trust':trust})+'.json');event_path.parent.mkdir(exist_ok=True)
        event_path.write_text(encode({'previousLedgerHash':digest(ledger),'updatedLedger':updated,'verifiedTrustBundle':trust}),encoding='utf8',newline='\n')
        # Audit receipt persists first; recoverable even if snapshot refresh is interrupted.
        for name,data in [('reviewer-authorization.json',trust),('owner-decision-ledger.json',updated)]:
            tmp=WS/(name+'.tmp');tmp.write_text(encode(data),encoding='utf8',newline='\n');os.replace(tmp,WS/name)
        run(False)
    return {'validation':'PASS','newDecisions':len(updated['decisions'])-len(ledger['decisions']),'ledgerWouldChange':updated!=ledger,'written':write and updated!=ledger}

def validate_rights_file(path,trust):
    objects,_,_=build();records={r['proposalKey']:r['proposedOverlayContent'] for r in objects['release-candidate-preview.json']['records']}
    with Path(path).open(encoding='utf-8-sig',newline='') as f:
        reader=csv.DictReader(f);require(reader.fieldnames is None or reader.fieldnames==RIGHTS_COLUMNS,'Rights CSV header mismatch');rows=list(reader)
    validated=[];seen={}
    for row in rows:
        if not row.get('decision','').strip():
            require(all(not row.get(k,'') for k in RIGHTS_COLUMNS if k not in ['proposalKey','contentHash','decision']),'Incomplete rights action');continue
        require(row.get('proposalKey') in records,'Unknown rights subject');require(row['rightsRef'],'Missing rights ref')
        value=dict(row,sourceMediaExcluded=row['sourceMediaExcluded']=='TRUE',evidenceRefs=[v.strip() for v in row['evidenceRefs'].split(';') if v.strip()])
        if row['decision']=='PENDING':
            authorized(row['reviewerId'],row['reviewedAt'],trust,'RIGHTS_REVIEWER');require(row['contentHash']==revision(records[row['proposalKey']]),'Stale pending rights hash')
            require(row['rationale'],'Pending rights rationale missing')
        else:validate_rights(value,records[row['proposalKey']],trust)
        require(value['rightsRef'] not in seen or seen[value['rightsRef']]==value,'Contradictory rights ref');seen[value['rightsRef']]=value
        validated.append(value)
    return {'validation':'PASS','rightsRecords':validated,'written':False,'instruction':'Owner must verify evidence and approve adding these exact records to trusted authorization bundle; validator never grants clearance'}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);mode=p.add_mutually_exclusive_group();mode.add_argument('--freeze-selection',action='store_true');mode.add_argument('--check',action='store_true');mode.add_argument('--validate-decisions');mode.add_argument('--import-decisions');mode.add_argument('--validate-rights');p.add_argument('--trust-bundle');p.add_argument('--trust-sha256');a=p.parse_args()
    if a.validate_rights:result=validate_rights_file(a.validate_rights,trust_bundle(a.trust_bundle,a.trust_sha256))
    elif a.validate_decisions or a.import_decisions:result=import_file(a.validate_decisions or a.import_decisions,trust_bundle(a.trust_bundle,a.trust_sha256),bool(a.import_decisions))
    else:require(not(a.trust_bundle or a.trust_sha256),'Trust arguments only for intake');result=freeze() if a.freeze_selection else run(a.check)
    print(encode(result))
