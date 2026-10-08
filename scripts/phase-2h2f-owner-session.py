#!/usr/bin/env python3
"""Additive pack-01 AI recommendations; reuse the existing human intake/gates."""
import argparse
import copy
import csv
import hashlib
import importlib.util
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('approval',ROOT/'scripts/phase-2h2e-approval-gate.py')
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
WS=e.WS/'owner-session-01'
PIN='7b81c06de08b75412039cb28b1b72490da51e0a82595d68fb54de33c57740e18'
WORDS=['relatively','formerly','hence','accidentally','successfully','why','openly','always','furthermore','fully']
GATES=['HUMAN_CONTENT_REVIEWED','IDENTITY_RESOLVED','POS_ACCEPTED','CLASSIFICATION_REVIEWED','SIMILARITY_RESOLVED','RIGHTS_RESOLVED','AUTHORIZED_OWNER_DECISION','READY_FOR_CANONICAL_AUTHORING']
load,encode,digest,require=e.load,e.encode,e.digest,e.require

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def pinned_inputs():
    # Additive future owner sessions must not invalidate this session's pins.
    paths=[p for p in e.WS.iterdir() if p.is_file()]+[p for p in (e.WS/'review-packs').rglob('*') if p.is_file()]
    paths += [ROOT/'scripts/phase-2h2e-approval-gate.py',ROOT/'scripts/phase-2h2e-approval-gate-test.py',e.REPORT]
    return {p.relative_to(ROOT).as_posix():sha(p) for p in sorted(paths)}

def pack_records(preview):
    with (e.WS/'review-packs/decisions-01.csv').open(encoding='utf8',newline='') as f:rows=list(csv.DictReader(f))
    require(len(rows)==10 and len({r['proposalKey'] for r in rows})==10,'Pack 01 membership drift')
    candidates={r['proposalKey']:r for r in preview['records']};selected=[]
    for row in rows:
        item=candidates[row['proposalKey']];record=item['proposedOverlayContent']
        require(row['contentHash']==item['reviewContentHash']==e.revision(record),'Frozen pack revision mismatch')
        require(not row['decision'],'Published decision template unexpectedly completed')
        selected.append(item)
    require([x['proposedOverlayContent']['headword'] for x in selected]==WORDS,'First ten order changed')
    frozen=load(e.WS/'selected-first-40.json')['records'][:10]
    require([r['proposalKey'] for r in frozen]==[r['proposalKey'] for r in rows],'Frozen cohort changed')
    require(all(x['acceptedContentHash']==x['reviewContentHash'] for x in selected),'Unexpected prior overlay in first ten')
    return selected

def propose(record,notes):
    corrections=[];proposed=copy.deepcopy(record)
    for index,change in enumerate(notes['changes'],1):
        field=change['field'];before=e.fields(record).get(field)
        require(before and change['after']!=before,'Invalid or no-op proposed field')
        correction={'correctionRef':'2H2F_SESSION01:'+record['headword']+':'+str(index),'proposalKey':record['proposalKey'],
            'originalContentHash':e.revision(record),'field':field,'before':before,'after':change['after'],
            'beforeSha256':hashlib.sha256(before.encode()).hexdigest(),'afterSha256':hashlib.sha256(change['after'].encode()).hexdigest(),
            'issueCode':change['code'],'rationaleVi':change['reasonVi'],'ownerDecision':'UNRESOLVED','sourceType':'GENERATED',
            'registeredInAccepted2H2EOverlayList':False}
        corrections.append(correction)
        parts=field.strip('/').split('/');target=proposed
        for part in parts[:-1]:target=target[int(part)] if isinstance(target,list) else target[part]
        target[parts[-1]]=change['after']
    return corrections,proposed

def build():
    verified=e.run(True);require(verified['fingerprint']==PIN,'Accepted approval gate changed')
    preview=load(e.WS/'release-candidate-preview.json');items=pack_records(preview)
    notes=load(WS/'authored-review-notes.json');require(set(notes)==set(WORDS),'Exactly ten substantive notes required')
    pins=load(WS/'accepted-input-pins.json');require(pinned_inputs()==pins,'Accepted artifacts or tooling changed')
    human=load(e.WS/'owner-decision-ledger.json');trust=load(e.WS/'reviewer-authorization.json')
    records={r['proposalKey']:r['proposedOverlayContent'] for r in preview['records']}
    # Existing validator validates actual persisted evidence. No new approval system.
    original_overlays=load(e.WS/'content-correction-overlays.json')['corrections']
    validated=e.intake(human['decisions'],records,{'decisions':[],'events':[]},trust,original_overlays)
    require(validated['decisions']==human['decisions'],'Existing human evidence validation failed')
    _,sources,_,_=e.bulk.inputs()
    _,grams=e.bulk.previous.pilot.source_passages([],sources)
    base=ROOT/'vocabflow-dataset/releases/hybrid-100-v2.2.1';master=load(base/'dataset.json')
    require(master['status']=='APPROVED' and len(master['includedLexemes'])==87 and len(master['includedSenses'])==100,'Hybrid checkpoint drift')
    lexemes=[(p,load(base/p['recordPath'])) for p in master['includedLexemes']]
    reviews=load(e.WS/'linguistic-qa.json')['reviews']
    recommendations=[];corrections=[];identities=[];rights=[];gates=[];references=[]
    for item in items:
        r=item['proposedOverlayContent'];key=r['proposalKey'];n=notes[r['headword']];hash_=e.revision(r)
        require(n['recommendation'] in e.DECISIONS and bool(n['changes'])==(n['recommendation']=='REVISE'),'Recommendation/correction mismatch')
        cs,proposed=propose(r,n);corrections.extend(cs)
        source_bands=sorted({v['value'] for ref in r['sourceEvidence'] for v in ref['cefrEvidence']})
        conflict=n['referenceCefr'] not in source_bands
        # The dictionary content was accessed via returned search extracts, not
        # the direct pages (which returned 403). No scraped definition is copied.
        reference={'proposalKey':key,'url':n['referenceUrl'],'accessMethod':'ACTUALLY_RETURNED_PRIMARY_DICTIONARY_SEARCH_EXTRACT',
            'taskDate':'2026-10-08','directPageAccess':'403_FORBIDDEN_WHERE_ATTEMPTED','partOfSpeechObserved':'ADVERB',
            'cefrLabelObserved':n['referenceCefr'],'usedFor':'Linguistic concept/POS and classification comparison; no learner-facing quotation',
            'fullPageOrLicenseTermsReviewed':False,'publicationPermissionObtained':False}
        references.append(reference)
        lexical_matches=[{'approvedLexemePin':p,'record':x} for p,x in lexemes if x['normalizedLemma']==r['headword'].lower()]
        sense_matches=[p for p in master['includedSenses'] if any(p['masterLexemeId']==x['record']['masterLexemeId'] for x in lexical_matches)] if lexical_matches else []
        require(not lexical_matches and not r['existingMasterCandidates']['senseIdReferences'] and not r['legacyDependencies'],'Unexpected protected collision in frozen pack')
        identity={'proposalKey':key,'contentHash':hash_,'contentLinguisticallyAcceptable':n['recommendation']=='KEEP',
            'posAiAssessment':'ADVERB_ACCEPTABLE_FOR_PRESENTED_USE_NOT_HUMAN_ACCEPTED','sourceCefrEvidence':r['cefrEvidence'],
            'sourceCefrBands':source_bands,'independentDictionaryObservation':reference,'cefrDisagreement':conflict,
            'cefrEvidenceSufficientForCanonicalClassification':False,'classificationStatus':'OWNER_EVIDENCE_REVIEW_PENDING',
            'candidateLexemeKey':r['candidateGroupKey'],'boundaryAssessmentVi':n['boundaryAssessmentVi'],
            'lexemeIdentity':'UNRESOLVED','senseIdentity':'UNRESOLVED','acceptedMasterCandidates':r['existingMasterCandidates'],
            'exactApprovedLemmaMatches':lexical_matches,'exactApprovedSensePinsForMatchedLexemes':sense_matches,
            'masterReuseAuthorized':False,'noCandidateDoesNotAuthorizeNewId':True,'legacyDependencies':r['legacyDependencies'],
            'approvedMasterScope':'87 pinned Lexemes / 100 pinned Senses; no exact lemma candidate, therefore no existing Sense reuse claim'}
        identities.append(identity)
        original_signals=item['sourceEightTokenSimilarity'];proposed_signals=[f for f,v in e.fields(proposed).items() if e.bulk.previous.pilot.ngrams(v)&grams]
        rights.append({'proposalKey':key,'contentHash':hash_,'learnerFacingTextProvenance':'GENERATED_FROM_ACCEPTED_FIELD_PROVENANCE',
            'originalFieldProvenanceVerified':e.valid_provenance(r),'aiOriginalityAssessmentPerformed':True,
            'acceptedSourceSimilaritySignals':r['qaFindings'].get('sourceSimilarity',[]),'acceptedEightTokenFields':original_signals,
            'proposedEightTokenFields':proposed_signals,'copyingAssessment':('SOURCE_SIMILARITY_OBSERVED; human disposition required' if original_signals or proposed_signals else 'NO_OBSERVED_EIGHT_TOKEN_SIGNAL; common wording can overlap; human originality/rights review still required'),
            'scanScope':'Two complete pinned source corpora; not an exhaustive comparison with the web or proof of authorship',
            'sourceMediaExcluded':True,'sourceDeckRights':'UNKNOWN_REVIEW_REQUIRED','rightsResolved':False,
            'independentWordingAssessmentVi':n['meaningAssessmentVi'],'dictionaryReference':reference['url'],
            'permissionOrAttributionNeeded':'Rights reviewer must assess intended publication, generated-tool terms, any expressive copying and applicable attribution; no blanket permission inferred',
            'missingEvidence':['AUTHORIZED_RIGHTS_REVIEWER','EXACT_REVISION_RIGHTS_DISPOSITION','PINNED_ORIGINALITY_AND_AUTHORSHIP_EVIDENCE','COPYING_AND_ATTRIBUTION_ASSESSMENT','INTENDED_PUBLICATION_SCOPE_AND_TERMS']})
        ai_findings=[{'code':c['issueCode'],'field':c['field'],'reasonVi':c['rationaleVi'],'humanDecision':'UNRESOLVED'} for c in cs]
        review=copy.deepcopy(next(q for q in reviews if q['proposalKey']==key));review['findings']+=ai_findings
        decision=next((x for x in human['decisions'] if x['proposalKey']==key),None)
        gate=e.promotion(r,decision,trust,review,len(review['findings']));gates.append(gate)
        recommendations.append({'proposalKey':key,'frozenContentHash':hash_,'headword':r['headword'],'pos':r['partOfSpeechProposal'],
            'frozenContent':r['content'],'aiRecommendation':n['recommendation'],'confidence':n['confidence'],
            'meaningAssessmentVi':n['meaningAssessmentVi'],'exampleAssessmentVi':n['exampleAssessmentVi'],'grammarAssessmentVi':n['grammarAssessmentVi'],
            'boundaryAssessmentVi':n['boundaryAssessmentVi'],'acceptedQaFindings':r['qaFindings'],'priorAiReview':review['dimensionNotes'],
            'newFindings':ai_findings,'correctionRefs':[c['correctionRef'] for c in cs],'proposedContentHash':e.revision(proposed),
            'proposedContentIsApplied':False,'independentReferenceUrl':reference['url'],'actualOwnerDecision':decision,
            'recommendationKind':'AI_ASSISTED_NOT_HUMAN_DECISION','outstandingDecisions':['CONTENT','LEXEME_IDENTITY','SENSE_IDENTITY','POS','CEFR','ORIGINALITY_SIMILARITY','RIGHTS']})
    received=[x for x in human['decisions'] if x['proposalKey'] in {r['proposalKey'] for r in recommendations}]
    counts={'cohort':10,'aiReviewed':10,'aiRecommendations':dict(Counter(r['aiRecommendation'] for r in recommendations)),
        'correctionFieldsProposed':len(corrections),'cefrDisagreements':sum(x['cefrDisagreement'] for x in identities),
        'ownerDecisionsReceived':len(received),'ownerDecisionsValidated':len(received),'ownerDecisionsImportedByThisSession':0,
        **{g:sum(x['gates'][g] for x in gates) for g in GATES}}
    objects={'linguistic-recommendations.json':{'reviewerKind':'AI_ASSISTED_LINGUISTIC_RECOMMENDATION','records':recommendations},
        'content-correction-proposals.json':{'artifactType':'PROPOSED_OVERLAYS_NOT_REGISTERED_OR_APPLIED','corrections':corrections},
        'identity-classification-assessment.json':{'records':identities},'rights-evidence-assessment.json':{'records':rights},
        'independent-reference-evidence.json':{'records':references,'copiedDefinitionsOrExamples':0,'directFetch403NotClaimedSuccessful':True},
        'owner-submission-status.json':{'status':'OWNER_INPUT_PENDING' if not received else 'EXISTING_PERSISTED_OWNER_EVIDENCE',
            'actualSubmissionsReceived':len(received),'decisionCsv':'../review-packs/decisions-01.csv','reviewerRegistryChanged':False,
            'actualAuthorizationBundleProvidedForThisSession':False,'humanEvidenceManufactured':0,'actualImportPerformed':False,'receiptCreated':False},
        'decision-validation-results.json':{'existingValidator':'scripts/phase-2h2e-approval-gate.py','existingPersistedDecisionsChecked':len(received),
            'submissionValidation':'NOT_RUN_NO_ACTUAL_SUBMISSION','import':'NOT_RUN_NO_ACTUAL_SUBMISSION','blankTemplate':e.intake(
                [dict.fromkeys(e.COLUMNS,'')|{'proposalKey':r['proposalKey'],'contentHash':r['frozenContentHash']} for r in recommendations],records,{'decisions':[],'events':[]},trust,original_overlays),
            'proposedCorrectionRegistration':'PENDING_SEPARATE_OWNER_AUTHORIZED_REVISION; current 2H.2E CLI will reject unregistered 2H.2F correction refs'},
        'promotion-gate-results.json':{'recomputedBy':'existing 2H.2E promotion() from genuine persisted ledger only; AI findings cannot approve','records':gates},
        'validation-summary.json':{'status':'TECHNICAL_PASS_OWNER_INPUT_PENDING','acceptedApprovalGateFingerprint':PIN,'counts':counts,
            'originalDataChanged':False,'canonicalIdsAllocated':0,'masterReleaseChanged':False,'legacyModified':False,
            'databaseAccess':'NONE','databaseWrites':'NONE','production':'UNTOUCHED','sourceRightsStatus':'UNKNOWN_REVIEW_REQUIRED',
            'protectedState':load(e.WS/'validation-summary.json')['protectedState'],'externalChecks':'See verification-results.json; generator does not execute external commands'}}
    report=render(recommendations,identities,corrections)
    objects['manifest.json']={'session':'PHASE_2H2F_OWNER_SESSION_01','acceptedApprovalGateFingerprint':PIN,
        'fingerprint':digest({'artifacts':objects,'ownerReview':report,'authoredNotes':notes,'acceptedInputPins':pins}),
        'files':list(objects)+['owner-review-10.md','authored-review-notes.json','accepted-input-pins.json']}
    return objects,report

def render(reviews,identities,corrections):
    lines=['# Owner review 01 — 10 Sense đầu tiên (Phase 2H.2F)','',
        '**OWNER_INPUT_PENDING.** Đây là khuyến nghị AI; mọi quyết định human vẫn trống. KEEP không đồng nghĩa phê duyệt identity, CEFR, rights hay canonical.',
        '', 'Bảng dưới giữ nguyên nội dung và hash đã đóng băng. Đề xuất sửa nằm riêng ở dưới; chưa áp dụng vào draft hoặc CSV.',
        '', '| # / Word / POS | English definition | Nghĩa VI | English example | Ví dụ VI | AI | Confidence / vấn đề | proposalKey / frozen contentHash | Quyết định còn thiếu |',
        '|---|---|---|---|---|---|---|---|---|']
    for i,r in enumerate(reviews,1):
        c=r['frozenContent'];issues='; '.join(f['reasonVi'] for f in r['newFindings']) or 'Không thấy lỗi content phải sửa; boundary/CEFR/rights cần owner.'
        cells=[f"{i}. {r['headword']} / {r['pos']}",c['definitionEn'],c['meaningVi'],c['examples'][0]['en'],c['examples'][0]['vi'],r['aiRecommendation'],
            'Cao cho content; '+issues,f"`{r['proposalKey']}`<br>`{r['frozenContentHash']}`",'Content; Lexeme; Sense; POS; CEFR; originality; rights — đều pending']
        lines.append('| '+' | '.join(v.replace('|','/') for v in cells)+' |')
    lines+=['','## Chi tiết để chốt đúng phạm vi','']
    for r,a in zip(reviews,identities):
        lines += ['### '+r['headword'],'',r['meaningAssessmentVi'],'',r['exampleAssessmentVi'],'',
            'Grammar gốc: '+r['frozenContent']['grammarNotesEn'],'',r['grammarAssessmentVi'],'',r['boundaryAssessmentVi'],'',
            'CEFR deck: '+', '.join(a['sourceCefrBands'])+'; observation Cambridge: '+a['independentDictionaryObservation']['cefrLabelObserved']+
            (' — khác nhau, cần review evidence riêng.' if a['cefrDisagreement'] else ' — cùng nhãn, vẫn chưa là classification đã phê duyệt.'),'',
            f"Đã đọc extract trả về từ [Cambridge — {r['headword']}]({r['independentReferenceUrl']}); không nhận là đã đọc full page hoặc license terms. Các direct fetch bị 403 không được tính là thành công.",'',
            'Không có exact lemma candidate trong Hybrid 87/100, accepted Sense candidate hoặc legacy dependency cho mục này. Không đồng nghĩa được cấp ID mới. Master reuse chưa được phê duyệt.','']
    lines+=['## BEFORE / AFTER — chỉ đề xuất','']
    for c in corrections:lines+=['### '+c['correctionRef'],'','Proposal: `'+c['proposalKey']+'`; frozen hash: `'+c['originalContentHash']+'`','',
        'Field: `'+c['field']+'`','','BEFORE: '+c['before'],'','AFTER (AI đề xuất): '+c['after'],'',c['rationaleVi'],'']
    lines+=['## Rights và provenance','',
        'Text gốc có GENERATED field provenance đã kiểm tra hash; không đưa source media vào gói này. AI đã xem nội dung và scan hai corpus nguồn đã pin. Không có eight-token signal quan sát được cho 10 mục; điều này không chứng minh không sao chép trên toàn web hoặc có quyền xuất bản.',
        '', 'Deck vẫn UNKNOWN_REVIEW_REQUIRED. Cambridge chỉ dùng để đối chiếu concept/POS/CEFR; không cấp phép chép definition/example. Các AFTER là wording AI đề xuất riêng. Chưa có authorized rights reviewer hoặc actual evidence về authorship/tool terms, copying, attribution, exact revision và intended publication. RIGHTS_RESOLVED vẫn 0.',
        '', '## Cách owner gửi quyết định','',
        '1. Đọc bảng, BEFORE/AFTER và các boundary/CEFR note. Mỗi mục có thể KEEP / REVISE / MERGE / SPLIT / DEFER / REJECT; có thể gửi một phần.',
        '2. Có thể trả lời theo số mục, decision, rationale và phạm vi bạn thực sự chốt: content, Lexeme/Sense, POS, CEFR, rights. Đính kèm actual reviewer identity/date và evidence; không cần tự đọc raw JSON. Khi chuyển thành CSV phải giữ nguyên exact proposalKey/hash trong bảng.',
        '3. [CSV quyết định gốc](../review-packs/decisions-01.csv) vẫn trống. Registry/authorization phải do owner xác minh độc lập; CSV không tự xác thực. Các identity/classification/rights pending có thể để PENDING, không suy ra từ KEEP.',
        '4. Đề xuất 2H.2F chưa đăng ký trong overlay list 2H.2E đã chấp nhận. Owner có thể yêu cầu REVISE bằng correctionRef ở trên trong phản hồi. Không đưa ref chưa đăng ký vào CLI rồi coi đã hợp lệ: cần bước đăng ký revision/correction được owner cho phép riêng, giữ snapshot và hash cũ. Không phê duyệt AFTER dưới hash BEFORE.',
        '5. Khi có submission và bundle owner-verified thực tế: validate/dry-run bằng tooling 2H.2E, kiểm tra stale hash, evidence và conflict; chỉ import khi hợp lệ và được owner xác minh. Không tạo hệ thống approval song song.','',
        '```powershell','python -B scripts/phase-2h2e-approval-gate.py --validate-decisions PATH.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA',
        'python -B scripts/phase-2h2e-approval-gate.py --validate-rights RIGHTS.csv --trust-bundle OWNER_VERIFIED.json --trust-sha256 EXACT_SHA','```','',
        'Chưa có submission, import hoặc receipt. Gate human content, identity, POS, CEFR, similarity/rights, owner authorization và canonical readiness đều 0. Hybrid/legacy giữ nguyên; DB access/writes NONE; Production UNTOUCHED. Dừng ở session 01, chưa làm pack tiếp theo hoặc canonical/Development apply.','']
    return '\n'.join(lines)

def run(check=False):
    objects,report=build();outputs={**{WS/n:encode(v) for n,v in objects.items()},WS/'owner-review-10.md':report}
    for p,t in outputs.items():
        if check:require(p.exists() and p.read_text(encoding='utf8')==t,'Session replay drift '+str(p))
        else:p.write_text(t,encoding='utf8',newline='\n')
    return {'status':'OWNER_INPUT_PENDING','fingerprint':objects['manifest.json']['fingerprint'],'counts':objects['validation-summary.json']['counts']}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--check',action='store_true');a=p.parse_args();print(encode(run(a.check)))
