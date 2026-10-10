#!/usr/bin/env python3
"""Finalize owner-supplied independent AI recheck evidence for offline DRAFT Git publication."""
import argparse
import copy
import importlib.util
import json
from collections import Counter

spec = importlib.util.spec_from_file_location('integration', __file__.replace('publication.py','review-integration.py'))
R = importlib.util.module_from_spec(spec)
spec.loader.exec_module(R)
V = R.V
OUT = V.CP / 'publication/reviewer-b-r1c'
INTAKE = V.WS / 'review-intake/checkpoint-01/reviewer-b-r1b/vocabflow-2h2k-r1b-reviewer-recheck.json'
RECEIPT_SHA = 'fd9ddfe5dce8839acd08304e69c198fddb426574d9c00459cc465035f3fee151'
R1_FP = 'b3bfb4e69fc5a51bc6a6c26075daf59e2f938b4653965b2ee7519aafb4516eab'
EXPECTED_HASHES = {
    'F01':'16fdd82d0907d5adbc2f8071e88366ccd7bd761121f82ccd29570e8ce6cb738e',
    'F02':'83056ed20f1ef69e4c5abc4c0c7c92268f46002c11ff3bccff0465d8040d11e3',
    'F03':'9f99df805191c9e50ad43c4009f9b36ceb4eecbd360efa7b237e5365659cb097',
    'F04':'15999fd6f97137b8a55f8cf0ff84ed435985b89d38c3d1f16fe7ee2060093bcb',
}
REMAINING = {'forget','together','chemist','history','perfect','possible','sixty'}


def verify_recheck(receipt, original, revised, corrections):
    V.require(receipt['reviewPhase']=='2H.2K-R1B' and receipt['reviewerKind']=='INDEPENDENT_AI_SESSION'
              and receipt['status']=='INDEPENDENT_RECHECK_COMPLETE'
              and receipt['draftPublicationRecommendation']=='READY_FOR_DRAFT_PUBLICATION_INTEGRATION', 'Recheck provenance/status mismatch')
    V.require(receipt['rights']==V.RIGHTS and receipt['databaseAccess']==receipt['databaseWrites']=='NONE'
              and receipt['production']=='UNTOUCHED', 'Receipt protected-state mismatch')
    records=receipt['records']
    V.require(len(records)==receipt['reviewedRevisions']==4 and {r['findingId'] for r in records}==set(R.FIELDS)
              and len({r['proposalKey'] for r in records})==4, 'Four recheck identities mismatch')
    before={r['proposalKey']:r for r in original};after={r['proposalKey']:r for r in revised}
    changes={r['sourceFindingId']:r for r in corrections};bindings=[]
    V.require(len(changes)==4 and set(changes)==set(R.FIELDS), 'Four R1 corrections required')
    for review in records:
        finding=review['findingId'];key,pointer=R.FIELDS[finding];change=changes[finding]
        V.require(review['proposalKey']==key and review['exactChangedFields']==[pointer], 'Recheck field/key mismatch')
        V.require(review['reviewerKind']=='INDEPENDENT_AI_SESSION' and review['reviewPhase']=='2H.2K-R1B'
                  and review['reviewStatus']=='PASS' and review['blocksDraftCheckpointPublication'] is False
                  and review['remainingIssue'] is None and review['suggestedCorrection'] is None
                  and len(review['reviewExplanationVi'])>=70, 'Recheck does not resolve publication gate')
        old,new=before[key],after[key]
        V.require(review['originalReviewedContentHash']==change['originalEffectiveContentHash']==old['effectiveContentHash']==R.content_hash(old),
                  'Recheck original hash mismatch')
        V.require(review['revisedEffectiveContentHash']==change['revisedEffectiveContentHash']==new['effectiveContentHash']==R.content_hash(new)==EXPECTED_HASHES[finding],
                  'Recheck revised hash mismatch')
        V.require(review['before']==change['before'] and review['after']==change['after'] and change['fieldPointer']==pointer,
                  'Recheck BEFORE/AFTER lineage mismatch')
        expected=copy.deepcopy(old)
        parent=expected['content']['examples'][0] if pointer.endswith('/vi') else expected['content']
        field='vi' if pointer.endswith('/vi') else 'grammarNotesEn'
        V.require(parent[field]==review['before'], 'Original changed field mismatch')
        parent[field]=review['after']
        expected['fieldHashes']={k:V.digest(v) for k,v in expected['content'].items()}
        expected['effectiveContentHash']=R.content_hash(expected)
        V.require(expected==new, 'Unrelated revised Sense fields changed')
        V.require(change['beforeFieldSha256']==V.sha(review['before'].encode())
                  and change['afterFieldSha256']==V.sha(review['after'].encode())
                  and change['parentRecordSha256']==V.digest(old) and change['revisedRecordSha256']==V.digest(new), 'R1 correction integrity mismatch')
        local={str(V.SOURCE.relative_to(V.ROOT)/ref['artifact']).replace('\\','/')+'#/records/'+str(ref['recordIndex'])+'/sourceFields'
               for ref in new['sourceEvidence']}
        refs=review['sourceEvidenceReferences']
        V.require({ref for ref in refs if not ref.startswith('https://')}==local, 'Recheck local source reference mismatch')
        bindings.append({'proposalKey':key,'findingId':finding,'originalReviewedContentHash':old['effectiveContentHash'],
                         'reviewedRevisedContentHash':new['effectiveContentHash'],'reviewedRecordSha256':V.digest(new),
                         'reviewStatus':'PASS','reviewerKind':'INDEPENDENT_AI_SESSION','evidenceReceiptSha256':RECEIPT_SHA,
                         'receiptRecordSha256':V.digest(review),'receiptRecord':review,'originalR1Correction':change,
                         'provenance':'USER_SUPPLIED_TRANSCRIPTION_NOT_CRYPTOGRAPHICALLY_SIGNED','humanApproval':False})
    changed={r['proposalKey'] for r in bindings}
    V.require(set(before)==set(after) and len(before)==len(after)==103, '103 Sense identities changed')
    unchanged=[key for key in before if key not in changed]
    V.require(len(unchanged)==99 and all(before[key]==after[key] for key in unchanged), '99 unaffected Senses changed')
    return bindings, unchanged


def integrate_reviews(original_b, author_a, revised, bindings, receipt):
    bykey={r['proposalKey']:r for r in revised};rechecks={r['proposalKey']:r for r in bindings}
    a={r['proposalKey']:r for r in author_a};records=[]
    V.require(len(original_b)==len({r['proposalKey'] for r in original_b})==103
              and set(a)=={r['proposalKey'] for r in original_b}==set(bykey), 'Complete review coverage mismatch')
    for original in original_b:
        key=original['proposalKey'];recheck=rechecks.get(key)
        current_hash=bykey[key]['effectiveContentHash']
        if recheck:
            V.require(recheck['reviewedRevisedContentHash']==current_hash, 'Stale final recheck binding')
        else:
            V.require(original['effectiveContentHash']==current_hash, 'Stale original review binding')
        records.append({'proposalKey':key,'effectiveContentHash':current_hash,
                        'finalReviewerBAssessment':recheck['reviewStatus'] if recheck else original['reviewStatus'],
                        'originalAuthorAReview':a[key],'originalReviewerBReview':original,'independentRecheck':recheck,
                        'authorAOriginalReviewConcernRetained':a[key]['assessment']=='REVIEW','humanApproval':False})
    counts=dict(Counter(r['finalReviewerBAssessment'] for r in records));counts.setdefault('FAIL',0)
    V.require(counts==receipt['reviewCountsAfterIntegration']=={'PASS':96,'REVIEW':7,'FAIL':0}, 'Final effective QA counts mismatch')
    remaining=[r for r in records if r['finalReviewerBAssessment']=='REVIEW']
    V.require({bykey[r['proposalKey']]['headword'] for r in remaining}==set(receipt['remainingOldReviewItems'])==REMAINING
              and len(remaining)==7, 'Seven remaining REVIEW identities mismatch')
    matrix=dict(Counter(r['originalAuthorAReview']['assessment']+'/'+r['finalReviewerBAssessment'] for r in records))
    V.require(matrix=={'PASS/PASS':85,'PASS/REVIEW':5,'REVIEW/PASS':11,'REVIEW/REVIEW':2}, 'Final reconciliation mismatch')
    return records, counts, matrix, remaining


def build():
    r1files,r1manifest=R.build()
    V.require(r1manifest['fingerprint']==R1_FP, 'Accepted R1 fingerprint drift')
    V.require({p.name for p in (R.R1/'assembled').iterdir()}==set(r1files), 'R1 immutable artifact scope drift')
    for name,data in r1files.items():
        V.require((R.R1/'assembled'/name).read_bytes()==data, 'R1 immutable artifact byte drift: '+name)
    pins=V.load(OUT/'input-pins.json')
    for path,value in pins['workingSha256'].items():
        V.require(V.sha((V.ROOT/path).read_bytes())==value, 'R1C immutable input drift: '+path)
    raw=INTAKE.read_bytes();V.require(V.sha(raw)==RECEIPT_SHA, 'R1B receipt byte SHA256 mismatch')
    receipt=json.loads(raw)
    original=V.load(V.CP/'assembled/new-sense-proposals.json')['records']
    revised=json.loads(r1files['revised-new-sense-proposals.json'])['records']
    corrections=json.loads(r1files['field-correction-evidence.json'])['records']
    bindings,unchanged=verify_recheck(receipt,original,revised,corrections)
    b=V.load(R.INTAKE/'reviewer-b-103-senses.json')['records']
    a=V.load(V.CP/'assembled/editorial-reviews.json')['records']
    records,counts,matrix,remaining=integrate_reviews(b,a,revised,bindings,receipt)
    queue=json.loads(r1files['deferred-coverage-queue.json'])['records']
    V.require(len(queue)==receipt['missingSenseCandidatesPreserved']==6
              and Counter(r['classification'] for r in queue)=={'STRONG_CANDIDATE':5,'NEEDS_MORE_EVIDENCE':1}, 'Deferred coverage drift')
    projection=json.loads(r1files['cumulative-effective-draft-projection.json'])
    V.require(projection['records'][:1563]==V.inputs()[2]['records'] and projection['records'][1563:]==revised
              and projection['priorCorrectionsPreserved']==40 and len(projection['records'])==1666
              and len({r['candidateGroupKey'] for r in projection['records']})==1120, 'Final projection mismatch')
    summary=json.loads(r1files['validation-summary.json'])
    V.require(len(summary['sourceSimilarityFindings'])==4 and not summary['copyingScreen']['eightWordOverlaps'], 'Similarity history mismatch')
    final={'phase':'2H.2K-R1C','independentReviewStatus':'INDEPENDENT_AI_REVIEW_COMPLETE',
           'draftGitPublicationReady':True,'reviewerBFinalEffectiveCounts':counts,'finalReconciliationMatrix':matrix,
           'originalAuthorACounts':dict(Counter(r['assessment'] for r in a)),
           'originalReviewerBCounts':dict(Counter(r['reviewStatus'] for r in b)),
           'remainingReviewItems':sorted(REMAINING),'deferredCoverageCandidates':6,
           'coverageClassifications':{'STRONG_CANDIDATE':5,'NEEDS_MORE_EVIDENCE':1},
           'previousAuthoredGroups':1020,'newAuthoredGroups':100,'cumulativeAuthoredGroups':1120,
           'previousSenses':1563,'newSenses':103,'cumulativeDraftSenses':1666,'remainingUnauthoredGroups':5023,
           'contentCorrectionsApplied':4,'unaffectedNewSenses':99,'historicalCorrectionsPreserved':40,
           'sourceSimilarityFindings':summary['sourceSimilarityFindings'],'copyingScreen':summary['copyingScreen'],
           'exactCopiedEnglishSourceExamples':0,'historicalNeighborOverlap':summary['historicalNeighborOverlap'],
           'sixtyTaxonomyReview':summary['sixtyTaxonomyReview'],
           'reviewProvenance':'OWNER_SUPPLIED_INDEPENDENT_AI_REVIEW_TRANSCRIPTION_NOT_CRYPTOGRAPHIC_IDENTITY_ATTESTATION',
           'authorization':{'offlineDraftGitPublicationAuthorized':True,'humanApprovalGranted':False,'rightsClearanceGranted':False},
           'humanApproval':'NOT_GRANTED','humanApprovals':0,'canonicalIdsAllocated':0,'contentStatus':'DRAFT','rights':V.RIGHTS,
           'releaseEligible':False,'databaseAccess':'NONE','databaseWrites':'NONE','production':'UNTOUCHED'}
    objects={'final-review-reconciliation.json':{'records':records,'counts':counts,'matrix':matrix},
             'revised-content-verdict-bindings.json':{'records':bindings},'remaining-review-findings.json':{'records':remaining},
             'deferred-coverage-queue.json':{'records':queue},'validation-summary.json':final,
             'unchanged-new-sense-evidence.json':{'count':99,'records':[{'proposalKey':key,'recordSha256':V.digest(next(r for r in original if r['proposalKey']==key))} for key in unchanged]}}
    files={n:V.encode(v) for n,v in objects.items()}
    files['cumulative-effective-draft-projection.json']=r1files['cumulative-effective-draft-projection.json']
    manifest={'phase':'2H.2K-R1C','originalCheckpointFingerprint':R.ORIGINAL_FP,'parentR1Fingerprint':R1_FP,
              'frozenCohortFingerprint':R.COHORT_FP,'reviewerBOriginalReportSha256':R.REPORT_SHA,'reviewerBRecheckReceiptSha256':RECEIPT_SHA,
              'inputPinsSha256':V.sha((OUT/'input-pins.json').read_bytes()),'artifactHashes':{n:V.sha(b) for n,b in sorted(files.items())},
              'independentReviewStatus':'INDEPENDENT_AI_REVIEW_COMPLETE','draftGitPublicationReady':True,
              'contentStatus':'DRAFT','rights':V.RIGHTS,'humanApproval':'NOT_GRANTED','releaseEligible':False}
    manifest['fingerprint']=V.digest(manifest);files['manifest.json']=V.encode(manifest)
    return files,manifest


def main():
    parser=argparse.ArgumentParser(description=__doc__);mode=parser.add_mutually_exclusive_group(required=True)
    mode.add_argument('--assemble',action='store_true');mode.add_argument('--check',action='store_true');args=parser.parse_args()
    files,manifest=build();target=OUT/'assembled'
    if args.check:
        V.require(target.is_dir() and {p.name for p in target.iterdir()}==set(files), 'R1C assembled scope drift')
        for name,data in files.items():V.require((target/name).read_bytes()==data,'R1C replay byte drift: '+name)
    else:
        V.require(not target.exists(),'Refusing to overwrite existing R1C snapshot')
        for name,data in files.items():V.write_new(target/name,data)
    print(json.dumps({'fingerprint':manifest['fingerprint'],'independentReview':'COMPLETE','finalCounts':{'PASS':96,'REVIEW':7,'FAIL':0},
                      'draftGitPublicationReady':True,'zeroWrites':args.check}))


if __name__=='__main__':
    main()
