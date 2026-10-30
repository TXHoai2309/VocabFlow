"""Export the selected local catalog; verify references without copying media again.

The small handoff ZIP is a manifest/evidence package. Original media remains at
the exact repository-relative paths in catalog-complete-r0001.json. Private DB
backups, account rows, environment files and credentials never enter this ZIP.
"""
import hashlib
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001'
LOCAL = ROOT / '.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001'


def read(path):
    return json.loads(path.read_text(encoding='utf-8-sig'))


def write_json(path, value):
    payload = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf-8')
    if path.exists():
        assert path.read_bytes() == payload, f'Immutable artifact conflict: {path.name}'
    else:
        path.write_bytes(payload)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def pin(path):
    data = path.read_bytes()
    return {'path': path.relative_to(ROOT).as_posix(), 'sha256': sha(data), 'byteLength': len(data)}


def checked(reference, path_key='path'):
    path = (ROOT / reference[path_key]).resolve()
    assert path.is_relative_to(ROOT)
    assert path.is_file(), path
    assert path.stat().st_size == reference['byteLength'], path.name
    with path.open('rb') as stream:
        assert hashlib.file_digest(stream, 'sha256').hexdigest() == reference['sha256'], path.name
    return path


def main():
    plan_path = DATA / 'catalog-plan-r0001.json'
    plan = read(plan_path)
    applied = read(LOCAL / 'application-result.json')
    verified = read(LOCAL / 'verification.current.json')
    tests = read(LOCAL / 'focused-tests.current.json')
    checks = read(LOCAL / 'checks.current.json')
    browser = read(LOCAL / 'browser-verification-r0001.json')
    backup = read(LOCAL / 'backup.json')
    assert applied['status'] == 'APPLIED_LOCAL_ONLY'
    assert verified['status'] == 'PASS' and tests['success'] and tests['numFailedTests'] == 0
    assert checks['requiredChecks'] == 'PASS' and browser['status'] == 'PASS'
    assert backup['restoreRehearsal'] == 'PASS' and backup['privateAccountBackup'] is True
    assert sha(plan_path.read_bytes()) == applied['planSha256']
    for reference in [*plan['sourcePins'], plan['ownerSelection'], *plan['textSourceNotices']]:
        checked(reference)
    for asset in plan['assets']:
        checked(asset, 'repoRelativePath')
    receipts = {e['receipt']['path']: e['receipt'] for item in plan['items'] for e in item['mediaEvidence']}
    for receipt in receipts.values():
        checked(receipt)
    with urllib.request.urlopen('http://127.0.0.1:3002/api/public/learning-index') as response:
        index = json.load(response)
    assert index['catalogIdentity'] == plan['catalogId']
    assert sorted(x['id'] for x in index['vocabulary']) == sorted(x['runtimeVocabularyId'] for x in plan['items'])
    assert len(index['vocabulary']) == 1547 and len(index['topics']) == 73 and len(index['learningSets']) == 76
    complete = {
        'artifactType': 'OWNER_EDITORIAL_COMPLETE_LOCAL_DATASET', 'schemaVersion': 1,
        'catalogId': plan['catalogId'], 'revision': 'r0001', 'date': '2026-10-30',
        'status': 'LOCAL_ACTIVE_OWNER_SELECTED', 'sourceDataset': plan['sourceDataset'],
        'productionEligible': False, 'canonicalMasterIdentityAssigned': False,
        'counts': {**plan['counts'], 'learningSets': 76, 'topics': 73}, 'levels': plan['levels'],
        'packages': [{'code': code, 'wordCount': sum(x['package'] == code for x in plan['items'])}
                     for code in ['expansion547', 'basic500', 'basicplus500']],
        'mediaConvention': {
            'assetFilename': '<sha256-of-file-bytes>.png or .mp3',
            'route': '/api/local-owner-editorial-media/<assetFilename>',
            'pathBase': 'VocabFlow repository root; repoRelativePath is authoritative',
            'joinKeys': ['itemId', 'proposalKey', 'runtimeVocabularyId', 'mediaEvidence.kind', 'mediaEvidence.jobId'],
            'receipts': 'Each binding pins its original job receipt and exact file hash/length.',
            'sharedFile': 'chair and sit intentionally share byte-identical audio for the identical sentence.',
            'localRuntimeIntegerIdsAreNotCanonicalMasterIds': True,
        },
        'sourcePins': plan['sourcePins'], 'ownerSelection': plan['ownerSelection'],
        'textSourceNotices': plan['textSourceNotices'], 'replacementPlan': pin(plan_path),
        'topics': index['topics'], 'learningSets': index['learningSets'],
        'items': plan['items'], 'assets': plan['assets'],
        'sourceAndReviewNotes': [
            'Muse generated media; owner approved the selected image/audio and attested use rights.',
            '547 English definitions retain Open English WordNet attribution/license.',
            'Reused editorial text retains its original lineage; media generation does not replace text provenance.',
            'Owner selection is not fabricated independent Master PASS or expert phonetic review.',
        ],
    }
    complete_path = DATA / 'catalog-complete-r0001.json'
    write_json(complete_path, complete)
    manifest = {
        'artifactType': 'OWNER_CATALOG_DATA_HANDOFF', 'status': 'COMPLETE_LOCAL_ONLY',
        'catalogId': plan['catalogId'], 'dataset': pin(complete_path), 'plan': pin(plan_path),
        'counts': complete['counts'], 'levels': plan['levels'],
        'allAssetBytesAndReceiptsReverified': True, 'uniqueMediaFiles': len(plan['assets']),
        'uniqueReceipts': len(receipts), 'testsPassed': tests['numPassedTests'],
        'privateBackupIndex': {'path': (LOCAL / 'backup.json').relative_to(ROOT).as_posix(),
                               'restoreRehearsal': 'PASS', 'includedInZip': False},
        'mediaIncludedInZip': False,
        'mediaLocation': 'Use assets[].repoRelativePath in the complete JSON; retain original three media directories.',
        'remoteWrites': 0, 'providerJobs': 0, 'commitPushDeploy': False,
    }
    handoff_path = DATA / 'handoff-r0001.json'
    write_json(handoff_path, manifest)
    members = [plan_path, complete_path, handoff_path, checked(plan['ownerSelection']),
               *[checked(x) for x in plan['sourcePins']], *[checked(x) for x in plan['textSourceNotices']],
               LOCAL / 'application-result.json', LOCAL / 'verification.current.json',
               LOCAL / 'checks.current.json', LOCAL / 'browser-verification-r0001.json',
               LOCAL / 'focused-tests.current.json', LOCAL / 'browser-home.png', LOCAL / 'browser-study.png',
               LOCAL / 'browser-study-mobile.png', Path(__file__).resolve()]
    archive = LOCAL / 'owner-catalog-1547-manifests-r0001.zip'
    member_index = []
    with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as z:
        for path in sorted(set(members)):
            name = path.relative_to(ROOT).as_posix()
            assert not name.endswith('.dump') and '/.env' not in name and name not in {'.env', '.env.local'}
            assert path.name not in {'before.json', 'backup.json'}
            payload = path.read_bytes()
            info = zipfile.ZipInfo(name, date_time=(2026, 10, 30, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, payload)
            member_index.append({'path': name, 'sha256': sha(payload), 'byteLength': len(payload)})
    with zipfile.ZipFile(archive) as z:
        assert z.testzip() is None and len(z.namelist()) == len(member_index)
        for member in member_index:
            payload = z.read(member['path'])
            assert len(payload) == member['byteLength'] and sha(payload) == member['sha256']
    archive_index = {'artifactType': 'OWNER_CATALOG_MANIFEST_ARCHIVE_INDEX', 'archive': pin(archive),
                     'members': member_index, 'crcAndEveryMemberHashVerified': True,
                     'containsAccountRowsEnvOrDbDump': False, 'containsMediaBytes': False}
    write_json(DATA / 'archive-index-r0001.json', archive_index)
    write_json(DATA / 'current.json', {'catalogId': plan['catalogId'], 'status': 'LOCAL_ACTIVE_OWNER_SELECTED',
                                     'dataset': pin(complete_path), 'handoff': pin(handoff_path),
                                     'archiveIndex': pin(DATA / 'archive-index-r0001.json')})
    print(json.dumps({'status': 'PASS', 'words': 1547, 'uniqueMedia': len(plan['assets']),
                      'dataset': pin(complete_path), 'archive': pin(archive)}, ensure_ascii=True))


if __name__ == '__main__':
    main()
