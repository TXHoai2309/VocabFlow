"""Intake exact Muse ZIPs into the basic-500 campaign, isolated from expansion-550."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import importlib.util
import json
from pathlib import Path
import re

spec = importlib.util.spec_from_file_location('muse_zip_intake', Path(__file__).with_name('editorial-expansion-media-intake-v1.py'))
intake = importlib.util.module_from_spec(spec)
spec.loader.exec_module(intake)

def assemble(root):
    guard = intake.guards
    raw = (root / 'work-orders.json').read_bytes()
    order_hash = intake.sha(raw)
    guard.require(order_hash == (root / 'work-orders.sha256').read_text().strip(), 'WORK_ORDERS_PIN_MISMATCH')
    orders = json.loads(raw)
    source = orders['sourceDraft']
    source_path = guard.safe(Path.cwd().resolve(), source['path'])
    guard.require(intake.sha(source_path.read_bytes()) == source['sha256'] and source_path.stat().st_size == source['byteLength'], 'SOURCE_CHANGED')
    dataset = intake.read(source_path)
    jobs = {j['jobId']: j for j in orders['jobs']}
    items = {i['itemId']: i for i in dataset['items']}
    guard.require(len(jobs) == len(orders['jobs']) == 3 * len(items), 'JOB_COUNT_MISMATCH')
    produced = {}
    hashes = {}
    duplicates = []
    for path in root.glob('runs/*/attempt-0001/receipt.json'):
        receipt = intake.read(path)
        guard.require(receipt['jobId'] in jobs, 'UNKNOWN_RECEIPT_JOB')
        job = jobs[receipt['jobId']]
        guard.require(receipt['workOrdersSha256'] == order_hash and receipt['sourceDraft'] == source, 'RECEIPT_SOURCE_MISMATCH')
        for field in ['jobId', 'itemId', 'kind', 'exampleId', 'targetContentSha256', 'requestSpecSha256']:
            guard.require(receipt[field] == job[field], 'RECEIPT_' + field.upper() + '_MISMATCH')
        guard.require(receipt['requestedText'] == job['requestSpec'].get('text'), 'RECEIPT_TEXT_MISMATCH')
        output = receipt['output']
        asset = guard.safe(root.resolve(), output['assetRelativePath'])
        blob = asset.read_bytes()
        guard.require(intake.sha(blob) == output['sha256'] and len(blob) == output['byteLength'], 'ASSET_BYTES_CHANGED')
        observed = guard.media_type(blob)
        guard.require(observed['mimeType'] == job['requestSpec']['outputMime'], 'MIME_CHANGED')
        previous = hashes.get(output['sha256'])
        if previous:
            duplicates.append({'sha256': output['sha256'], 'jobIds': [previous, job['jobId']], 'requiresReview': True})
        hashes[output['sha256']] = job['jobId']
        binding = {'jobId': job['jobId'], 'status': 'DOWNLOADED_REVIEW_REQUIRED', 'assetPath': asset.relative_to(Path.cwd()).as_posix(), 'sha256': output['sha256'], 'byteLength': len(blob), 'mimeType': observed['mimeType'], 'receiptPath': path.as_posix(), 'receiptSha256': intake.sha(path.read_bytes())}
        item = items[job['itemId']]
        if job['kind'] == 'IMAGE':
            item['media']['image'] = binding
        elif job['kind'] == 'WORD_AUDIO':
            item['media']['wordAudio'] = binding
        else:
            item['media']['exampleAudio'] = [{**binding, 'exampleId': job['exampleId']}]
        produced[job['jobId']] = binding
    counts = Counter(jobs[j]['kind'] for j in produced)
    complete = len(produced) == len(jobs)
    dataset['counts']['actualMediaOutputs'] = len(produced)
    dataset['state'] = 'ALL_MEDIA_DOWNLOADED_REVIEW_PENDING' if complete else 'MEDIA_INCOMPLETE'
    dataset['runtimeEligible'] = False
    report = {'state': dataset['state'], 'updatedAtUtc': datetime.now(timezone.utc).isoformat(), 'sourceDraft': source, 'items': len(items), 'plannedJobs': len(jobs), 'downloadedHashVerified': len(produced), 'byKind': dict(counts), 'missingJobIds': [j for j in jobs if j not in produced], 'duplicateAssetHashesRequiringReview': duplicates, 'ownerReview': 'PENDING', 'canonicalNewSensesImported': 0, 'canonicalRuntimeUpdates': 0}
    (root / 'dataset-with-media.current.json').write_bytes(guard.encode(dataset))
    (root / 'production-progress.current.json').write_bytes(guard.encode(report))
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', nargs='?', type=Path)
    parser.add_argument('--revision', default='r0002')
    parser.add_argument('--cleanup-download', action='store_true')
    parser.add_argument('--download-root', type=Path, default=Path('D:/Download'))
    parser.add_argument('--assemble', action='store_true')
    args = parser.parse_args()
    guard = intake.guards
    guard.require(bool(re.fullmatch(r'r\d{4}', args.revision)), 'INVALID_REVISION')
    intake.ROOT = Path('.vocabflow-local/editorial-refresh-20261029/basic-500-media-' + args.revision)
    if args.assemble:
        result = assemble(intake.ROOT)
        print(json.dumps({k: v for k, v in result.items() if k not in ['missingJobIds', 'duplicateAssetHashesRequiringReview']}))
    else:
        guard.require(args.source is not None, 'SOURCE_ZIP_REQUIRED')
        result = intake.intake(args.source, args.cleanup_download, args.download_root)
        print(json.dumps({'status': result['status'], 'outputs': len(result['outputs']), 'deletedSource': result['deletedOriginalDownloadAfterVerifiedCopy']}))
