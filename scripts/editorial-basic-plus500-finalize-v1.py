"""Freeze a complete offline collection after receipt/hash/decode checks.

This is a data export, not runtime publication or owner content approval.
"""
from collections import Counter
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path('.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001')
DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-plus-500-r0001')


def pin(path):
    blob = path.read_bytes()
    return {'path': path.as_posix(), 'sha256': hashlib.sha256(blob).hexdigest(), 'byteLength': len(blob)}


def read(path):
    return json.loads(path.read_bytes())


def immutable(path, value):
    blob = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')
    if path.exists():
        assert path.read_bytes() == blob, 'IMMUTABLE_EXPORT_CONFLICT'
    else:
        path.write_bytes(blob)


def main():
    progress = read(ROOT / 'production-progress.current.json')
    assert progress['downloadedHashVerified'] == 1500 and not progress['missingJobIds'], 'MEDIA_INCOMPLETE'
    assert progress['byKind'] == {'IMAGE': 500, 'WORD_AUDIO': 500, 'EXAMPLE_AUDIO': 500}
    source = DATA / 'dataset-text-r0001.json'
    assert progress['sourceDraft'] == pin(source)
    data = read(ROOT / 'dataset-with-media.current.json')
    original = {item['itemId']: item for item in read(source)['items']}
    memberships_path = DATA / 'collection-memberships-r0001.json'
    memberships = read(memberships_path)
    assert memberships['sourceDataset']['sha256'] == pin(source)['sha256']
    placement = {row['itemId']: row for row in memberships['assignments']}
    assert set(placement) == set(original)
    assert set(Counter(row['displayTopicCodes'][0] for row in placement.values()).values()) == {25}
    qa_path = ROOT / 'audio-qa/decode.current.json'
    qa = read(qa_path)
    assert qa['state'] == 'PASS' and qa['received'] == qa['decodePassed'] == 1000, 'AUDIO_DECODE_INCOMPLETE'
    assert qa['workOrdersSha256'] == pin(ROOT / 'work-orders.json')['sha256']
    decoded = {row['jobId']: row for row in qa['results']}
    assert len(decoded) == 1000
    jobs = set()
    hashes = set()
    for item in data['items']:
        row = placement[item['itemId']]
        assert item['contentSha256'] == row['sourceContentSha256'] == original[item['itemId']]['contentSha256']
        assert item['runtimeVocabularyId'] == original[item['itemId']]['runtimeVocabularyId']
        item['curatedTopicCodes'] = row['displayTopicCodes']
        item['curatedCollectionCodes'] = row['displayCollectionCodes']
        bindings = [item['media']['image'], item['media']['wordAudio'], *item['media']['exampleAudio']]
        assert len(bindings) == 3
        for media_index, binding in enumerate(bindings):
            asset = pin(Path(binding['assetPath']))
            receipt_path = Path(binding['receiptPath'])
            assert asset['sha256'] == binding['sha256'] and asset['byteLength'] == binding['byteLength']
            assert pin(receipt_path)['sha256'] == binding['receiptSha256']
            receipt = read(receipt_path)
            assert receipt['itemId'] == item['itemId'] and receipt['jobId'] == binding['jobId']
            assert receipt['targetContentSha256'] == item['contentSha256']
            if media_index:
                check = decoded[binding['jobId']]
                assert check['assetSha256'] == binding['sha256'] and check['receiptSha256'] == binding['receiptSha256']
                assert check['state'] == 'DECODE_PASS'
            assert binding['jobId'] not in jobs
            jobs.add(binding['jobId']); hashes.add(binding['sha256'])
    assert len(data['items']) == 500 and len(jobs) == 1500
    data['state'] = 'MEDIA_COMPLETE_TECHNICAL_CHECKS_PASSED_CONTENT_REVIEW_PENDING'
    data['exportRevision'] = 'r0002'
    data['runtimeEligible'] = False
    data['collectionPresentation'] = {'memberships': pin(memberships_path), 'sourceTopicsPreserved': True}
    data['mediaSelection'] = {'baseText': pin(source), 'selectedMediaJobs': 1500, 'selectedImages': 500, 'selectedWordAudio': 500, 'selectedExampleAudio': 500, 'decodeReport': pin(qa_path), 'ownerAccepted': False}
    target = ROOT / 'dataset-complete-r0002.json'
    immutable(target, data)
    result = {'state': data['state'], 'dataset': pin(target), 'items': 500, 'topics': 20, 'selectedMediaJobs': 1500, 'uniqueAssetHashes': len(hashes), 'allAssetAndReceiptHashesVerified': True, 'existingSensesReused': 500, 'netNewCanonicalRecords': 0, 'ownerAccepted': False, 'canonicalImportPerformed': False}
    immutable(ROOT / 'complete-export-r0002.result.json', result)
    print(json.dumps(result))


def select_correction():
    base=ROOT/'dataset-complete-r0002.json';data=read(base)
    correction=ROOT/'image-corrections-r0001'
    orders_path=correction/'work-orders.json';orders=read(orders_path)
    assert orders['sourceDraft']==pin(base) and len(orders['jobs'])==1
    assert pin(orders_path)['sha256']==(correction/'work-orders.sha256').read_text().strip()
    review_path=correction/'visual-review-r0001.json';review=read(review_path)
    assert review['reviewer']=='CODEX_SELF_REVIEW_NOT_OWNER_APPROVAL'
    assert set(review['reviewedReplacementJobIds'])=={j['jobId'] for j in orders['jobs']}
    assert not review['unresolvedCorrections']
    by_id={i['itemId']:i for i in data['items']};replacements=[]
    for job in orders['jobs']:
        receipt_path=correction/'runs'/job['jobId']/'attempt-0001/receipt.json'
        receipt=read(receipt_path)
        for key in ['jobId','itemId','kind','exampleId','targetContentSha256','requestSpecSha256']:
            assert receipt[key]==job[key], 'CORRECTION_RECEIPT_BINDING'
        assert receipt['sourceDraft']==pin(base) and receipt['workOrdersSha256']==pin(orders_path)['sha256']
        output=receipt['output'];asset=correction/output['assetRelativePath']
        assert pin(asset)['sha256']==output['sha256'] and asset.stat().st_size==output['byteLength']
        item=by_id[job['itemId']]
        assert item['contentSha256']==job['targetContentSha256']
        old=item['media']['image'];assert old['jobId']==job['replacesJobId']
        item['media']['image']={'jobId':job['jobId'],'status':'DOWNLOADED_SELF_REVIEWED_OWNER_REVIEW_PENDING','assetPath':asset.as_posix(),'sha256':output['sha256'],'byteLength':output['byteLength'],'mimeType':'image/png','receiptPath':receipt_path.as_posix(),'receiptSha256':pin(receipt_path)['sha256']}
        item['selectedImageCorrection']={'originalBinding':old,'replacementWorkOrders':pin(orders_path),'replacementRequestSpecSha256':job['requestSpecSha256'],'selectedImageBrief':job['requestSpec']['prompt'],'visualReview':pin(review_path),'textAndAudioChanged':False}
        replacements.append({'itemId':item['itemId'],'headword':item['headword'],'oldJobId':old['jobId'],'newJobId':job['jobId']})
    reviewed_original=read(ROOT/'visual-review-original-r0001.json')
    assert reviewed_original['sourceDataset']==pin(base) and reviewed_original['reviewedImageCount']==500
    assert {r['headword'] for r in replacements}==set(reviewed_original['unresolvedImageHeadwords'])
    original={i['itemId']:i for i in read(base)['items']};selected=[]
    for item in data['items']:
        before=original[item['itemId']]
        for key in ['contentSha256','examples','runtimeVocabularyId','classification','topicCodes','curatedTopicCodes']:
            assert item[key]==before[key], 'FROZEN_CONTENT_CHANGED'
        assert item['media']['wordAudio']==before['media']['wordAudio'] and item['media']['exampleAudio']==before['media']['exampleAudio']
        for binding in [item['media']['image'],item['media']['wordAudio'],*item['media']['exampleAudio']]:
            assert pin(Path(binding['assetPath']))['sha256']==binding['sha256']
            assert pin(Path(binding['receiptPath']))['sha256']==binding['receiptSha256']
            selected.append(binding)
    assert len(selected)==len({b['jobId'] for b in selected})==1500
    data['state']='MEDIA_COMPLETE_IMAGE_SELF_REVIEWED_OWNER_REVIEW_PENDING'
    data['exportRevision']='r0003'
    data['mediaSelection'].update({'originalFullMedia':pin(base),'imageCorrectionOrders':pin(orders_path),'originalVisualReview':pin(ROOT/'visual-review-original-r0001.json'),'replacementVisualReview':pin(review_path),'replacements':replacements,'selectedMediaJobs':1500,'ownerAccepted':False})
    target=ROOT/'dataset-complete-r0003.json';immutable(target,data)
    result={'state':data['state'],'dataset':pin(target),'items':500,'topics':20,'selectedMediaJobs':1500,'uniqueAssetHashes':len({b['sha256'] for b in selected}),'correctionImagesSelected':len(replacements),'allAssetAndReceiptHashesVerified':True,'existingSensesReused':500,'netNewCanonicalRecords':0,'ownerAccepted':False,'canonicalImportPerformed':False}
    immutable(ROOT/'complete-export-r0003.result.json',result);print(json.dumps(result))


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--select-correction',action='store_true')
    args=parser.parse_args()
    select_correction() if args.select_correction else main()
