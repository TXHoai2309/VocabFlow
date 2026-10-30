"""Package the bounded local preview, excluding credentials, account rows and dumps."""
import hashlib
import json
import zipfile
from pathlib import Path

DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001')
ROOT = Path('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-runtime-r0002')
PIN = '94b7a904599e7851b2dd7e38c528a5b111cdd885fa9d01d4446ac54af5e6aa1d'


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    return json.loads(Path(path).read_bytes())


def pin(path):
    path = Path(path)
    raw = path.read_bytes()
    return {'path': path.as_posix(), 'sha256': digest(raw), 'byteLength': len(raw)}


def save(path, value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    path = Path(path)
    if path.exists():
        assert path.read_bytes() == raw, f'Immutable artifact conflict: {path}'
    else:
        with path.open('xb') as target:
            target.write(raw)
    return pin(path)


plan = read(ROOT / 'integration-plan-r0002.json')
assert pin(ROOT / 'integration-plan-r0002.json')['sha256'] == PIN
applied = read(ROOT / 'application-result.json')
verification = read(ROOT / 'verification-result.json')
browser = read(ROOT / 'browser-verification.json')
tests = read(ROOT / 'focused-tests-r0002.json')
assert applied['planSha256'] == PIN and verification['status'] == 'PASS'
assert applied['protectedBefore'] == applied['protectedAfter']
assert tests['numPassedTests'] == 151 and tests['numFailedTests'] == 0 and tests['success']
assert browser['ratingsSubmittedByAgent'] == 0
assert len(read(ROOT / 'premium-audit.json')['findings']) == 0
assert b'local-editorial-batch-media' not in Path('apps/api/dist/vercel-runtime.mjs').read_bytes()
manifest = read(DATA / 'input-manifest-r0001.json')
rows = {x['runtimeVocabularyId']: x for x in manifest['inputRows']}
items = []
for item in plan['items']:
    source = rows[item['runtimeVocabularyId']]
    items.append({
        'runtimeVocabularyId': item['runtimeVocabularyId'], 'proposalKey': item['proposalKey'],
        'canonicalMasterIdAllocated': False, 'sourceContentSha256': source['sourceContentSha256'],
        'contentVersion': source['currentRuntimeContentVersion'], 'word': source['headword'],
        'partOfSpeech': source['partOfSpeech'], 'cefr': source['currentCefr'],
        'definitionEn': source['definitionEn'], 'meaningVi': source['meaningVi'],
        'meaningViOverride': source['meaningViOverride'], 'examples': source['examples'],
        'editorialDisposition': 'KEEP', 'availability': item['availability'], 'media': item['media'],
        'originalCefrMembershipPreserved': True, 'ownerListeningAcceptanceClaim': False,
    })
dataset = {
    'artifactType': 'REVIEWED_EXISTING_SENSES_LOCAL_PREVIEW', 'batchId': plan['batchId'], 'revision': 'r0002',
    'status': 'LOCAL_PREVIEW_VERIFIED_WITH_EXPLICIT_MEDIA_GAPS', 'productionEligible': False,
    'counts': plan['counts'], 'newVocabulary': 0, 'newProviderJobs': 0,
    'sourcePins': [*plan['sourcePins'], pin(ROOT / 'integration-plan-r0002.json')],
    'localLearningSet': applied['learningSet'], 'policy': plan['policy'], 'items': items,
    'assetIndex': plan['assets'],
}
dataset_pin = save(DATA / 'dataset-selected-r0002.json', dataset)
qa = {
    'artifactType': 'TICKET10_VERIFICATION_SUMMARY', 'focusedTests': {'passed': 151, 'files': len(tests['testResults'])},
    'scopedApiTypecheck': 'PASS', 'scopedWebTypecheck': 'PASS', 'changedTypeScriptLint': 'PASS',
    'build': 'PASS_EXISTING_CHUNK_AND_DYNAMIC_IMPORT_WARNINGS', 'strictPremiumAudit': 'PASS',
    'workerContainsLocalBatchAdapter': False, 'rootTypecheck': 'FAIL_OUT_OF_SCOPE_TOOLING_SCRIPTS',
    'rootTypecheckAffectedExamples': ['scripts/backfill-production-v2-image-coverage.ts', 'scripts/resolve-master-v2-development-pending.ts', 'scripts/editorial-foundation-verify-v1.mts'],
    'runtimeVerification': pin(ROOT / 'verification-result.json'),
    'browserVerification': pin(ROOT / 'browser-verification.json'),
    'allFilesHumanListened': False, 'accountBrowserLoginPerformed': False,
}
qa_pin = save(ROOT / 'checks-r0002.json', qa)
handoff = {
    'artifactType': 'TICKET10_LOCAL_PREVIEW_HANDOFF', 'revision': 'r0002', 'batchId': plan['batchId'],
    'status': dataset['status'], 'ticketStatus': 'READY_FOR_OWNER_REVIEW', 'wholeTicket10Complete': False,
    'allMediaComplete': False, 'counts': plan['counts'], 'selectedDataset': dataset_pin,
    'integrationPlan': pin(ROOT / 'integration-plan-r0002.json'), 'application': pin(ROOT / 'application-result.json'),
    'verification': qa_pin, 'localLearningSet': applied['learningSet'],
    'previewUrl': 'http://127.0.0.1:5173/learning-sets/30', 'protectedFingerprints': len(applied['protectedAfter']),
    'progressWritesByCoordinator': 0, 'newProviderJobs': 0, 'remoteWrites': 0, 'productionEligible': False,
    'remaining': ['31senses without activated media; generation remains owner-paused', 'Owner review of this bounded local preview', 'Remaining A1/A2 batches are outside this frozen51-ID instance'],
    'archiveIndexPath': (ROOT / 'archive-index-r0002.json').as_posix(),
    'previousHandoffUnchanged': pin(DATA / 'handoff-r0001.json'),
}
handoff_pin = save(DATA / 'handoff-r0002.json', handoff)
files = {
    DATA / 'input-manifest-r0001.json', DATA / 'editorial-dispositions-r0001.json', DATA / 'media-reuse-proposal-r0001.json',
    DATA / 'dataset-selected-r0002.json', DATA / 'handoff-r0002.json', DATA / 'variant-image-context-review-r0001.json',
    ROOT / 'integration-plan-r0002.json', ROOT / 'application-result.json', ROOT / 'verification-result.json',
    ROOT / 'browser-verification.json', ROOT / 'focused-tests-r0002.json', ROOT / 'premium-audit.json', ROOT / 'checks-r0002.json',
    ROOT / 'browser-accident-media.png', ROOT / 'browser-text-only-study.png', ROOT / 'image-reuse-review-sheet.png',
    Path('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001/live-capture-r0001.json'),
    Path('docs/plans/editorial-refresh-2026-10-28/ticket-10-01-local-preview-r0002.md'),
}
for asset in plan['assets']:
    assert pin(asset['repoRelativePath'])['sha256'] == asset['sha256']
    assert pin(asset['receipt']['path']) == asset['receipt']
    files.update([Path(asset['repoRelativePath']), Path(asset['receipt']['path'])])
for source in read(DATA / 'media-reuse-proposal-r0001.json')['sourcePackages']:
    assert pin(source['path']) == source
    files.add(Path(source['path']))
for file in [
    'scripts/editorial-ticket10-runtime-plan-v1.py', 'scripts/editorial-ticket10-local-apply-v1.mjs',
    'scripts/editorial-ticket10-local-verify-v1.mjs', 'scripts/editorial-ticket10-local-handoff-v1.py',
    'apps/api/src/local-dev.ts', 'apps/api/src/pinned-local-media.ts', 'apps/api/src/pinned-local-media.test.ts',
    'apps/api/src/editorial-ticket10-local-media.ts', 'apps/web/src/features/study/development-example-audio.ts',
    'apps/web/src/features/study/development-media.tsx', 'apps/web/src/features/study/development-media.test.tsx',
    'apps/web/src/features/study/flashcard.tsx', 'apps/web/src/features/study/flashcard.test.tsx',
]:
    files.add(Path(file))
member_pins = [pin(file) for file in sorted(files)]
assert all(not Path(x['path']).name.startswith('.env') and not x['path'].endswith('.dump') for x in member_pins)
index_bytes = (json.dumps({'artifactType': 'TICKET10_PACKAGE_MEMBERS', 'files': member_pins}, ensure_ascii=False, indent=2) + '\n').encode()
archive = ROOT / 'ticket10-a1-a2-51-local-preview-r0002.zip'
if not archive.exists():
    with zipfile.ZipFile(archive, 'x', compression=zipfile.ZIP_DEFLATED) as z:
        for file in sorted(files):
            z.write(file, file.as_posix())
        z.writestr('package-members.json', index_bytes)
with zipfile.ZipFile(archive) as z:
    assert z.testzip() is None
    assert z.read('package-members.json') == index_bytes
    assert set(z.namelist()) == {x['path'] for x in member_pins} | {'package-members.json'}
    for member in member_pins:
        raw = z.read(member['path'])
        assert digest(raw) == member['sha256'] and len(raw) == member['byteLength']
archive_index = {'artifactType': 'TICKET10_ARCHIVE_INDEX', 'archive': pin(archive), 'members': len(member_pins) + 1,
                 'crcAndEveryMemberSha256Verified': True, 'accountRowsOrDatabaseDumpIncluded': False}
save(ROOT / 'archive-index-r0002.json', archive_index)
current = {'revision': 'r0002', 'selectedDataset': dataset_pin, 'handoff': handoff_pin, 'archiveIndex': pin(ROOT / 'archive-index-r0002.json')}
save(DATA / 'current.json', current)
Path('docs/plans/editorial-refresh-2026-10-28/ticket-10-01-local-preview-r0002.result.json').write_text(json.dumps({**handoff, 'archive': archive_index}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(json.dumps({'status': handoff['status'], 'counts': plan['counts'], 'archive': archive_index, 'dataset': dataset_pin}))
