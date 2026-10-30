"""Select reviewed image corrections and freeze a complete media-bound offline export.

No DB publication or owner approval is inferred by this command.
"""
import hashlib
import importlib.util
import json
from pathlib import Path

ROOT = Path('.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002')
CORRECTIONS = ROOT / 'image-corrections-r0001'

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def enc(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')

def pin(path):
    return {'path': path.as_posix(), 'sha256': sha(path), 'byteLength': path.stat().st_size}

def immutable(path, value):
    blob = enc(value)
    if path.exists():
        assert path.read_bytes() == blob, 'IMMUTABLE_EXPORT_CONFLICT'
    else:
        path.write_bytes(blob)

def main():
    spec = importlib.util.spec_from_file_location('b500_intake', Path(__file__).with_name('editorial-basic500-media-v1.py'))
    intake = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(intake)
    progress = intake.assemble(ROOT)
    assert not progress['missingJobIds'] and progress['downloadedHashVerified'] == 1500
    data = json.loads((ROOT / 'dataset-with-media.current.json').read_bytes())
    baseline_pin = pin(ROOT / 'dataset-with-media-before-corrections-r0002.json')
    orders = json.loads((CORRECTIONS / 'work-orders.json').read_bytes())
    assert sha(CORRECTIONS / 'work-orders.json') == (CORRECTIONS / 'work-orders.sha256').read_text().strip()
    assert orders['sourceDraft'] == baseline_pin and len(orders['jobs']) == 6
    review_path = CORRECTIONS / 'visual-review-r0001.json'
    review = json.loads(review_path.read_bytes())
    assert review['reviewer'] == 'CODEX_SELF_REVIEW_NOT_OWNER_APPROVAL'
    assert set(review['reviewedReplacementJobIds']) == {j['jobId'] for j in orders['jobs']}
    assert not review['unresolvedCorrections']
    by_id = {i['itemId']: i for i in data['items']}
    replacements = []
    for job in orders['jobs']:
        receipt_path = CORRECTIONS / 'runs' / job['jobId'] / 'attempt-0001/receipt.json'
        receipt = json.loads(receipt_path.read_bytes())
        for key in ['jobId', 'itemId', 'kind', 'exampleId', 'targetContentSha256', 'requestSpecSha256']:
            assert receipt[key] == job[key], 'CORRECTION_RECEIPT_BINDING'
        assert receipt['sourceDraft'] == baseline_pin
        assert receipt['workOrdersSha256'] == sha(CORRECTIONS / 'work-orders.json')
        output = receipt['output']
        asset = CORRECTIONS / output['assetRelativePath']
        assert sha(asset) == output['sha256'] and asset.stat().st_size == output['byteLength']
        item = by_id[job['itemId']]
        assert item['contentSha256'] == job['targetContentSha256']
        assert item['media']['image']['jobId'] == job['replacesJobId']
        old_binding = item['media']['image']
        binding = {'jobId': job['jobId'], 'status': 'DOWNLOADED_SELF_REVIEWED_OWNER_REVIEW_PENDING', 'assetPath': asset.as_posix(), 'sha256': sha(asset), 'byteLength': asset.stat().st_size, 'mimeType': 'image/png', 'receiptPath': receipt_path.as_posix(), 'receiptSha256': sha(receipt_path)}
        item['media']['image'] = binding
        item['selectedImageCorrection'] = {'originalBinding': old_binding, 'replacementWorkOrders': pin(CORRECTIONS / 'work-orders.json'), 'replacementRequestSpecSha256': job['requestSpecSha256'], 'selectedImageBrief': job['requestSpec']['prompt'], 'visualReview': pin(review_path), 'textAndAudioChanged': False}
        replacements.append({'itemId': item['itemId'], 'headword': item['headword'], 'oldJobId': old_binding['jobId'], 'newJobId': job['jobId']})
    all_bindings = []
    for item in data['items']:
        bindings = [item['media']['image'], item['media']['wordAudio'], *item['media']['exampleAudio']]
        assert len(bindings) == 3 and all(b.get('assetPath') for b in bindings)
        for b in bindings:
            asset = Path(b['assetPath'])
            assert sha(asset) == b['sha256'] and asset.stat().st_size == b['byteLength']
            receipt = json.loads(Path(b['receiptPath']).read_bytes())
            assert sha(Path(b['receiptPath'])) == b['receiptSha256']
            assert receipt['itemId'] == item['itemId'] and receipt['jobId'] == b['jobId'] and receipt['targetContentSha256'] == item['contentSha256']
            all_bindings.append(b)
    assert len({b['jobId'] for b in all_bindings}) == 1500
    data['state'] = 'MEDIA_COMPLETE_SELF_REVIEWED_OWNER_REVIEW_AND_CANONICAL_RECONCILIATION_PENDING'
    data['exportRevision'] = 'r0003'
    data['runtimeEligible'] = False
    data['mediaSelection'] = {'baseText': progress['sourceDraft'], 'originalFullMedia': baseline_pin, 'correctionWorkOrders': pin(CORRECTIONS / 'work-orders.json'), 'visualReview': pin(review_path), 'replacements': replacements, 'selectedMediaJobs': 1500, 'selectedImages': 500, 'selectedWordAudio': 500, 'selectedExampleAudio': 500, 'ownerAccepted': False}
    target = ROOT / 'dataset-complete-r0003.json'
    immutable(target, data)
    result = {'state': data['state'], 'dataset': pin(target), 'items': 500, 'topics': 20, 'selectedMediaJobs': 1500, 'uniqueAssetHashes': len({b['sha256'] for b in all_bindings}), 'correctionImagesSelected': 6, 'allAssetAndReceiptHashesVerified': True, 'ownerAccepted': False, 'canonicalImportPerformed': False}
    immutable(ROOT / 'complete-export-r0003.result.json', result)
    print(json.dumps(result))

if __name__ == '__main__':
    main()
