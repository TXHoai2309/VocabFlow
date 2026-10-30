"""Freeze the read-only ticket10 review evidence and a local subset backup.

Existing asset bytes only. No database write, remote request, or media job.
"""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen
from zipfile import ZIP_DEFLATED, ZipFile

DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001')
LOCAL = Path('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001')


def read(path):
    return json.loads(path.read_bytes())


def pin(path):
    blob = path.read_bytes()
    return {'path': path.as_posix(), 'sha256': hashlib.sha256(blob).hexdigest(), 'byteLength': len(blob)}


def write(path, value):
    blob = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')
    if path.exists():
        assert path.read_bytes() == blob, 'IMMUTABLE_HANDOFF_CONFLICT'
    else:
        path.write_bytes(blob)


def main():
    manifest = read(DATA / 'input-manifest-r0001.json')
    dispositions = read(DATA / 'editorial-dispositions-r0001.json')
    proposal = read(DATA / 'media-reuse-proposal-r0001.json')
    live = read(LOCAL / 'live-capture-r0001.json')
    summary = read(DATA / 'review-summary-r0001.json')
    owned = set(manifest['ownedRuntimeVocabularyIds'])
    decisions = {row['runtimeVocabularyId']: row for row in dispositions['decisions']}
    assert len(owned) == len(decisions) == 51 and owned == set(decisions)
    assert len({r['headword'] for r in decisions.values()}) == 35
    assert all(r['contentDecision'] == 'KEEP' and not r['databaseChangeProposed'] for r in decisions.values())
    assert all(not r['freshIndependentReviewClaim'] and not r['newCefrAssessmentClaim'] for r in decisions.values())
    assert live['protectedBefore'] == live['protectedAfter'] and not live['differences']
    assert summary['contentEdits'] == summary['databaseWrites'] == summary['providerCalls'] == 0
    assert not summary['wholeTicketFamily10Complete'] and not proposal['runtimeActivation']
    assert {r['runtimeVocabularyId'] for r in proposal['withheldVariantExampleAudio']} == {31365, 30833, 30834}

    index_path = LOCAL / 'membership-observation-r0001.json'
    if not index_path.exists():
        # This is the only network request: the already running loopback API.
        with urlopen('http://127.0.0.1:3002/api/public/learning-index', timeout=25) as response:
            assert response.status == 200
            index = json.load(response)
        rows = [r for r in index['vocabulary'] if r['id'] in owned]
        assert len(rows) == 51 and {r['id'] for r in rows} == owned
        assert all(r['cefr'] == decisions[r['id']]['cefr'] for r in rows)
        sets = []
        for collection in index['learningSets']:
            matched = sorted(owned.intersection(collection['vocabularyIds']))
            if matched:
                sets.append({**{k: v for k, v in collection.items() if k != 'vocabularyIds'}, 'ownedVocabularyIds': matched})
        covered = {rid for collection in sets for rid in collection['ownedVocabularyIds']}
        write(index_path, {'artifactType': 'READ_ONLY_LOCAL_MEMBERSHIP_OBSERVATION', 'source': 'http://127.0.0.1:3002/api/public/learning-index', 'ownedVocabulary': rows, 'observedExistingSets': sets, 'ownedRowsWithExistingSetMembership': len(covered), 'ownedRowsWithoutExistingSetMembership': sorted(owned - covered), 'batchSpecificCollectionCreated': False, 'membershipsChanged': 0, 'learnerQueueOrReviewWrites': 0})
    membership = read(index_path)
    assert {r['id'] for r in membership['ownedVocabulary']} == owned

    variant_review = []
    notes = {
        31365: 'Adult person helping children cross the road. Compatible with adult NOUN; not the current two-adults-painting example scene.',
        30833: 'Frightened child hearing traffic noise. Compatible with afraid; current example specifies thunder, which this image does not depict.',
        30834: 'Football in daylight; source simplified afternoon scene. Daylight alone does not distinguish afternoon from morning; do not treat as a time-recognition answer or current fence-repair example scene.',
    }
    for rid, note in notes.items():
        slot = decisions[rid]['mediaProposal']['slots']['image']['binding']
        variant_review.append({'runtimeVocabularyId': rid, 'asset': pin(Path(slot['assetPath'])), 'reviewer': 'CURRENT_COORDINATOR_VISUAL_SELF_REVIEW', 'decision': 'WORD_CONTEXT_CANDIDATE_ONLY_NOT_EXACT_SENTENCE_ILLUSTRATION', 'note': note, 'independentReviewClaim': False, 'runtimeActivated': False})
    write(DATA / 'variant-image-context-review-r0001.json', {'items': variant_review})

    files = set(DATA.glob('*r0001.json')) | {DATA / 'input-manifest-r0001.sha256', DATA / 'review-r0001.csv', LOCAL / 'live-capture-r0001.json', LOCAL / 'live-verification-r0001.json', index_path, LOCAL / 'review-gallery-r0001.html'}
    # Full pinned JSON sources are evidence; this is not a full media archive of those source packages.
    for source in manifest['sourcePins'] + proposal['sourcePackages']:
        path = Path(source['path'])
        assert pin(path) == source
        files.add(path)
    selected_assets, withheld_assets, historical_assets = set(), set(), set()
    proposed_slots = 0
    for row in decisions.values():
        evidence = row['historicalIndependentReview']
        receipt = Path(evidence['receiptPath'])
        assert pin(receipt)['sha256'] == evidence['receiptSha256']
        files.add(receipt)
        for candidate in row['legacyCandidates']:
            assert candidate['bytesVerified']
            path = Path(candidate['localPath'])
            assert pin(path)['sha256'] == candidate['assetSha256']
            files.add(path)
            historical_assets.add(path)
        slots = (row['mediaProposal'] or {}).get('slots', {})
        for slot, value in slots.items():
            binding = value['binding']
            asset, receipt = Path(binding['assetPath']), Path(binding['receiptPath'])
            assert pin(asset)['sha256'] == binding['sha256'] and asset.stat().st_size == binding['byteLength']
            assert pin(receipt)['sha256'] == binding['receiptSha256']
            files.update([asset, receipt])
            selected_assets.add(asset)
            proposed_slots += 1
        if row['runtimeVocabularyId'] in {31365, 30833, 30834}:
            assert 'exampleAudio' not in slots
    assert proposed_slots == len(selected_assets) == 57
    for withheld in proposal['withheldVariantExampleAudio']:
        binding = withheld['clip']
        asset, receipt = Path(binding['assetPath']), Path(binding['receiptPath'])
        assert pin(asset)['sha256'] == binding['sha256'] and pin(receipt)['sha256'] == binding['receiptSha256']
        assert asset not in selected_assets
        files.update([asset, receipt])
        withheld_assets.add(asset)
    files.update([Path('scripts/editorial-ticket10-local-capture-v1.mjs'), Path('scripts/editorial-ticket10-review-v1.py'), Path(__file__).relative_to(Path.cwd())])
    backup_index = {'artifactType': 'TICKET10_READ_ONLY_REVIEW_SUBSET_BACKUP', 'batchId': manifest['batchId'], 'state': summary['state'], 'wholeTicket10Complete': False, 'runtimeImported': False, 'proposedAssetSlots': proposed_slots, 'withheldSentenceAssetsForEvidenceOnly': len(withheld_assets), 'historicalCandidateUniqueFiles': len(historical_assets), 'scope': 'Owned51 content and review artifacts, pinned source JSON evidence,57 proposed media assets,3 withheld sentence assets, historical candidate bytes and used review/provider receipts. Other media referenced by full source JSON is outside this subset backup.', 'files': [pin(p) for p in sorted(files)]}
    backup_index_path = LOCAL / 'backup-index-r0001.json'
    write(backup_index_path, backup_index)
    files.add(backup_index_path)
    archive = LOCAL / 'ticket10-a1-a2-51-review-handoff-r0001.zip'
    if not archive.exists():
        with ZipFile(archive, 'x', compression=ZIP_DEFLATED, compresslevel=6) as zipped:
            for path in sorted(files):
                zipped.write(path, path.as_posix())
    with ZipFile(archive) as zipped:
        assert zipped.testzip() is None
        assert set(zipped.namelist()) == {p.as_posix() for p in files}
        for path in files:
            assert hashlib.sha256(zipped.read(path.as_posix())).hexdigest() == pin(path)['sha256']
    result = {'artifactType': 'TICKET10_BOUNDED_REVIEW_HANDOFF', 'batchId': manifest['batchId'], 'state': summary['state'], 'reviewedSenses': 51, 'headwordGroups': 35, 'levels': summary['levels'], 'keep': 51, 'contentEdits': 0, 'databaseWrites': 0, 'providerCalls': 0, 'membershipObservation': pin(index_path), 'ownedRowsWithExistingSetMembership': membership['ownedRowsWithExistingSetMembership'], 'proposedMediaSlots': 57, 'withheldMismatchedSentenceClips': 3, 'reviewSummary': pin(DATA / 'review-summary-r0001.json'), 'dispositions': pin(DATA / 'editorial-dispositions-r0001.json'), 'mediaProposal': pin(DATA / 'media-reuse-proposal-r0001.json'), 'variantImageContextReview': pin(DATA / 'variant-image-context-review-r0001.json'), 'gallery': pin(LOCAL / 'review-gallery-r0001.html'), 'archive': {**pin(archive), 'members': len(files), 'crcAndAllMemberHashesVerified': True}, 'originalTicket10Acceptance': {'dispositionsAndOwnership': 'PASS', 'unchangedTextIdsAndProtectedState': 'PASS', 'mediaAndMembershipApplied': 'PENDING_NOT_APPLIED', 'learnerRuntimePreviewWithMedia': 'PENDING_NOT_IMPLEMENTED', 'wholeTicketFamily10Complete': False}, 'nextConcreteStep': 'Resolve existing-media binding for the51 owned IDs without reusing pilot07 FIRST_WORDS namespace; preserve exact current examples and withhold the3 different sentence clips. Do not generate new assets or change IDs.'}
    write(DATA / 'handoff-r0001.json', result)
    print(json.dumps(result, ensure_ascii=True))


if __name__ == '__main__':
    main()
