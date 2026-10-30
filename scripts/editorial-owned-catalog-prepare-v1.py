"""Freeze the exact owner-selected local replacement before any live DB writes."""
import hashlib
import json
from collections import Counter
from pathlib import Path

ROOT = Path('.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001')
DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001')
DATA.mkdir(parents=True, exist_ok=True)
CATALOG = 'owner-editorial-1547-20261030-r0001'
PACKAGES = [
    ('expansion547', '.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001/dataset-547-r0004.json', '153f5dfed457145e1c8c9febffb22a0cf0b33e5c8ad01a743f144baf47e9fdfb'),
    ('basic500', '.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/dataset-complete-r0003.json', '85c8d508270b8c9d857962e97efbd76de89be4c4cd26ec2d43dbc5458e174c9b'),
    ('basicplus500', '.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001/dataset-complete-r0003.json', '979623530945044b8bf832a78e93fd8186b374d1584b39fa2993501ad4b1cb9f'),
]


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode()


def file_pin(path):
    path = Path(path)
    raw = path.read_bytes()
    return {'path': path.as_posix(), 'sha256': digest(raw), 'byteLength': len(raw)}


def save(path, value):
    raw = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()
    if path.exists():
        assert path.read_bytes() == raw, f'Immutable conflict: {path}'
    else:
        with path.open('xb') as output:
            output.write(raw)
    return file_pin(path)


inventory = json.loads((ROOT / 'inventory-r0002.json').read_bytes())
retained = set(inventory['retainRuntimeIds'])
old_versions = {x['id']: x['content_version'] for x in inventory['selectedRuntimeRows']}
new_id = inventory['previousMaximumVocabularyId']
items, groups, assets, source_pins = [], [], {}, []
for package, path, expected_hash in PACKAGES:
    source_pin = file_pin(path)
    assert source_pin['sha256'] == expected_hash, (package, source_pin['sha256'])
    source_pins.append(source_pin)
    source = json.loads(Path(path).read_bytes())
    topic_labels = {t['code']: t['labelVi'] for t in source['topics']}
    for order, topic in enumerate(source['topics']):
        groups.append({'code': package + ':' + topic['code'], 'slug': 'owned-' + package + '-' + topic['code'].lower().replace('_', '-'),
                       'name': topic['labelVi'], 'description': 'Từ vựng và câu ví dụ về ' + topic['labelVi'].lower() + '.',
                       'sourcePackage': package, 'sortOrder': len(groups)})
    for row in source['items']:
        runtime_id = row['runtimeVocabularyId']
        if runtime_id is None:
            new_id += 1
            runtime_id = new_id
        assert row['masterLexemeId'] is None and row['masterSenseId'] is None
        example = row['examples'][0]
        bindings = [('image', row['media']['image']), ('wordAudio', row['media']['wordAudio']), ('exampleAudio', row['media']['exampleAudio'][0])]
        media, evidence = {}, []
        for kind, binding in bindings:
            p = Path(binding['assetPath'])
            pin = file_pin(p)
            assert pin['sha256'] == binding['sha256']
            if binding.get('byteLength') is not None:
                assert pin['byteLength'] == binding['byteLength']
            receipt_pin = file_pin(binding['receiptPath'])
            if binding.get('receiptSha256'):
                assert receipt_pin['sha256'] == binding['receiptSha256']
            receipt = json.loads(Path(binding['receiptPath']).read_bytes())
            assert receipt['jobId'] == binding['jobId']
            assert receipt['output']['sha256'] == pin['sha256'] and receipt['output']['byteLength'] == pin['byteLength']
            if kind != 'image':
                assert receipt['requestedText'] == (row['headword'] if kind == 'wordAudio' else example['en']), (row['headword'], kind)
            filename = pin['sha256'] + ('.png' if kind == 'image' else '.mp3')
            mime = 'image/png' if kind == 'image' else 'audio/mpeg'
            assert binding['mimeType'] == mime
            if filename in assets:
                assert assets[filename]['sha256'] == pin['sha256'] and assets[filename]['byteLength'] == pin['byteLength']
            else:
                assets[filename] = {'filename': filename, 'repoRelativePath': pin['path'], 'sha256': pin['sha256'], 'byteLength': pin['byteLength'], 'mimeType': mime}
            media[kind] = '/api/local-owner-editorial-media/' + filename
            evidence.append({'kind': kind, 'jobId': binding['jobId'], 'asset': pin, 'receipt': receipt_pin})
        tags = ['EDITORIAL:FIRST_WORDS'] if row['classification']['learningLevel'] == 'FIRST_WORDS' else []
        topics = row.get('curatedTopicCodes', row['topicCodes'])
        assert topics and all(x in topic_labels for x in topics), (row['headword'], topics)
        examples = [{'en': example['en'], 'vi': example['vi'], 'exampleKey': example.get('exampleKey', 'owner-example:' + example['exampleId']), 'audioUrl': media['exampleAudio']}]
        content = {'word': row['headword'], 'meaningVi': row['meaningVi'], 'shortMeaningVi': row['shortMeaningVi'],
                   'definitionEn': row['definitionEn'], 'partOfSpeech': row['partOfSpeech'], 'cefr': row['classification']['cefr'],
                   'tags': tags, 'examples': examples, 'media': media}
        items.append({'itemId': row['itemId'], 'runtimeVocabularyId': runtime_id, 'retainedRuntimeId': runtime_id in retained,
                      'contentVersion': old_versions[runtime_id] + 1 if runtime_id in retained else 1,
                      'proposalKey': 'owner-editorial:' + row['itemId'], 'package': package,
                      'sourceItemContentSha256': row['contentSha256'], 'contentSha256': digest(canonical(content)),
                      'topicCodes': [package + ':' + x for x in topics], 'topicLabel': topic_labels[topics[0]],
                      'content': content, 'sourceProvenance': row['provenance'], 'classificationEvidence': row['classification'],
                      'mediaEvidence': evidence, 'canonicalMasterIdentityAssigned': False})
assert len(items) == 1547 and len({x['runtimeVocabularyId'] for x in items}) == 1547
assert len({x['content']['word'].casefold() for x in items}) == 1547
retire_ids = [x['id'] for x in inventory['vocabularyRows'] if x['id'] not in retained]
assert len(retire_ids) == 6436
assert sum(x['retainedRuntimeId'] for x in items) == 905
attestation = {
    'artifactType': 'OWNER_MEDIA_USE_ATTESTATION_AND_CATALOG_SELECTION', 'date': '2026-10-30',
    'ownerStatements': ['tôi đang định xóa sạch kho từ vựng cũ đi để biên soạn lại data mới có dc k, vì tôi tự tạo nên bản quyền hình ảnh các thư cũng là của tôi', 'giữ lại các từ hôm qua đến nay bắt đầu soạn mới qua muse, xóa sạch những data cũ đi'],
    'scope': 'Exactly the three pinned packages and their selected4641image/word/example slots; dedicated local catalog replacement.',
    'sourcePackages': source_pins, 'mediaUse': 'OWNER_ATTESTED', 'notALegalOwnershipDetermination': True,
    'notExpertPhoneticAcceptance': True, 'textProvenancePreserved': True, 'newProviderJobs': 0,
}
attestation_pin = save(DATA / 'owner-selection-r0001.json', attestation)
plan = {
    'artifactType': 'OWNER_SELECTED_LOCAL_CATALOG_REPLACEMENT', 'catalogId': CATALOG, 'revision': 'r0001',
    'sourceDataset': 'VOCABFLOW_OWNER_EDITORIAL_LOCAL', 'productionEligible': False,
    'sourcePins': source_pins, 'ownerSelection': attestation_pin, 'inventory': file_pin(ROOT / 'inventory-r0002.json'),
    'counts': {'selectedWords':1547,'retainedRuntimeIds':905,'newLocalRuntimeIds':642,'retiredVocabularyRows':6436,
               'imageSlots':1547,'wordAudioSlots':1547,'exampleAudioSlots':1547,'uniqueAssetFiles':len(assets),'groups':len(groups)},
    'levels':dict(Counter('FIRST_WORDS' if x['content']['tags'] else x['content']['cefr'] or 'UNCLASSIFIED' for x in items)),
    'retainedRuntimeIds': sorted(retained), 'retiredRuntimeIds': retire_ids,
    'groups': groups, 'items': items, 'assets': sorted(assets.values(), key=lambda x:x['filename']),
    'preserveNonlexical': ['accounts','learners','settings','households','foundation08/09','roles','environment identity','migration-history prefix'],
    'textSourceNotices': [file_pin('vocabflow-dataset/workspaces/editorial-refresh-20261028/expansion-550-r0001/SOURCES-AND-LICENSE.txt'), file_pin('vocabflow-dataset/workspaces/editorial-refresh-20261028/expansion-550-r0001/OPEN-ENGLISH-WORDNET-LICENSE.txt')],
}
pin = save(DATA / 'catalog-plan-r0001.json', plan)
print(json.dumps({'plan':pin,'counts':plan['counts'],'levels':plan['levels']}))
