"""Freeze the owner-authorized local continuation; never rewrite the r0001 review."""
import hashlib
import json
from pathlib import Path

SOURCE = Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001')
OUT = Path('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-runtime-r0002')
OUT.mkdir(parents=True, exist_ok=True)


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read_pin(path, expected=None):
    path = Path(path)
    raw = path.read_bytes()
    if expected:
        assert sha(raw) == expected, str(path)
    return json.loads(raw), {'path': path.as_posix(), 'sha256': sha(raw), 'byteLength': len(raw)}


manifest, manifest_pin = read_pin(SOURCE / 'input-manifest-r0001.json', '9ead950dbcd9fafd5a4c25b8b9e099c4baddb15627f63135bf5f5c6d8ca327cd')
review, review_pin = read_pin(SOURCE / 'editorial-dispositions-r0001.json', '8e67bc99ce3abc52c95d1ddf52a3417a84f4c4706bebe3ed5f0a11a3b90ecb3a')
proposal, proposal_pin = read_pin(SOURCE / 'media-reuse-proposal-r0001.json', 'f972c5b7b86b29e2a31406cd4154485c635be5c5f54ae81e3cee7c38426ee437')
for pin in proposal['sourcePackages']:
    read_pin(pin['path'], pin['sha256'])
assets, items, omitted = {}, [], []
route = '/api/local-editorial-batch-media/ticket10-a1-a2-batch-0001'
for row in review['decisions']:
    media = {'images': [], 'wordAudio': [], 'exampleAudio': []}
    for slot, candidate in (row['mediaProposal'] or {}).get('slots', {}).items():
        if slot == 'image' and row['runtimeVocabularyId'] == 30834:
            omitted.append({'runtimeVocabularyId': 30834, 'slot': 'image', 'reason': 'Daytime football scene does not distinguish afternoon; retained offline only.'})
            continue
        b = candidate['binding']
        raw = Path(b['assetPath']).read_bytes()
        assert sha(raw) == b['sha256'] and len(raw) == b['byteLength']
        receipt, receipt_pin = read_pin(b['receiptPath'], b['receiptSha256'])
        assert receipt['jobId'] == b['jobId']
        assert receipt['output']['sha256'] == b['sha256']
        assert receipt['output']['byteLength'] == b['byteLength']
        filename = b['sha256'] + ('.png' if slot == 'image' else '.mp3')
        target_slot = 'images' if slot == 'image' else slot
        entry = {
            'url': route + '/' + filename, 'mediaSha256': b['sha256'], 'mimeType': b['mimeType'],
            'sourceNoteIdentity': 'muse-job:' + b['jobId'], 'reviewStatus': 'PROPOSED',
            'rightsStatus': 'UNKNOWN_REVIEW_REQUIRED', 'originType': 'GENERATED_EDITORIAL_LOCAL_PREVIEW',
            'targetProposalKey': row['proposalKey'], 'targetContentSha256': row['sourceContentSha256'],
            'mappingEvidence': candidate['contextPolicy'],
        }
        if slot != 'image':
            expected_text = row['headword'] if slot == 'wordAudio' else row['examples'][0]['en']
            assert receipt['requestedText'] == expected_text, (row['headword'], slot)
            entry['spokenText'] = expected_text
        if slot == 'wordAudio':
            entry['pronunciation'] = 'en-US'
            entry['pronunciationEvidence'] = 'Muse request/receipt; no fresh expert phonetic acceptance claimed.'
        if slot == 'exampleAudio':
            entry['exampleIndex'] = 0
            if row['examples'][0].get('exampleKey'):
                entry['exampleKey'] = row['examples'][0]['exampleKey']
        media[target_slot].append(entry)
        assets[filename] = {'filename': filename, 'repoRelativePath': b['assetPath'], 'sha256': b['sha256'],
                            'byteLength': b['byteLength'], 'mimeType': b['mimeType'], 'receipt': receipt_pin}
    items.append({'runtimeVocabularyId': row['runtimeVocabularyId'], 'proposalKey': row['proposalKey'],
                  'sourceContentSha256': row['sourceContentSha256'], 'headword': row['headword'],
                  'partOfSpeech': row['partOfSpeech'], 'cefr': row['cefr'], 'media': media,
                  'availability': 'EXISTING_MEDIA_LOCAL_PREVIEW' if any(media.values()) else 'TEXT_ONLY_NO_NEW_MEDIA_AUTHORIZED',
                  'textDisposition': 'KEEP', 'freshIndependentReviewClaim': False})
assert len(items) == 51 and len(assets) == 56
assert sum(bool(x['media']['images']) for x in items) == 19
assert sum(bool(x['media']['wordAudio']) for x in items) == 20
assert sum(bool(x['media']['exampleAudio']) for x in items) == 17
assert [x['runtimeVocabularyId'] for x in items] == [x['runtimeVocabularyId'] for x in review['decisions']]
plan = {
    'artifactType': 'TICKET10_BOUNDED_LOCAL_RUNTIME_PLAN', 'revision': 'r0002',
    'batchId': manifest['batchId'], 'authorization': 'Owner: oci làm 10 đi; bounded continuation of existing 10-01.',
    'productionEligible': False, 'newVocabulary': 0, 'newProviderJobs': 0,
    'sourcePins': [manifest_pin, review_pin, proposal_pin],
    'learningSet': {'slug': 'editorial-a1-a2-local-0001', 'name': 'Từ cơ bản · a–all',
                    'description': '51 nghĩa từ trình độ A1–A2, từ a/an đến all.', 'sortOrder': 140},
    'policy': {'textAndIdsUnchanged': True, 'keepOriginalCefrMemberships': True, 'firstWordsOverlayForbidden': True,
               'historicalMediaCandidatesNotActivated': 26, 'withheldVariantExampleClips': 3,
               'missingMediaFallback': 'Existing text/meaning exercises; no manufactured URLs or graded missing-media cues.',
               'humanAudioAcceptance': 'Not inferred from previous foundation or other dataset approvals.'},
    'imageReview': {'reviewer': 'current-coordinator', 'date': '2026-10-30', 'imagesInspected': 20,
                     'selectedAsWordIllustration': 19, 'notExactSentenceIllustrationIds': [31365, 30833],
                     'withheld': omitted, 'freshIndependentReviewer': False},
    'items': items, 'assets': sorted(assets.values(), key=lambda x: x['filename']),
    'counts': {'senses': 51, 'A1': 27, 'A2': 24, 'withMedia': 20, 'textOnly': 31,
               'images': 19, 'wordAudio': 20, 'exampleAudio': 17, 'assets': 56},
}
raw = (json.dumps(plan, ensure_ascii=False, indent=2) + '\n').encode()
target = OUT / 'integration-plan-r0002.json'
if target.exists():
    assert target.read_bytes() == raw, 'Immutable plan conflict; create a forward revision.'
else:
    target.write_bytes(raw)
print(json.dumps({'planSha256': sha(raw), 'byteLength': len(raw), 'counts': plan['counts']}))
