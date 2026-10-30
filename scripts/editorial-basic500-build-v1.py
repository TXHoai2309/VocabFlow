"""Freeze a separately authored 500-entry basic collection and exact Muse jobs.

Offline only. Existing runtime senses are referenced, never cloned or updated.
Re-running must reproduce identical bytes; corrections require a new revision.
"""
from collections import Counter, defaultdict
import argparse
import csv
import hashlib
import html
import json
from pathlib import Path
import re
import secrets
import time
import unicodedata
import uuid

REVISION = 'r0001'
ROOT = Path('vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-500-' + REVISION)
MEDIA = Path('.vocabflow-local/editorial-refresh-20261029/basic-500-media-' + REVISION)
BASE = Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2')
PREVIOUS = Path('.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001/dataset-547-r0004.json')
QUEUE = BASE / 'sources/66492f5302afdf8d6f40d152a4a96ff1b53b28e6a8e4fd608c81ac80b1f5db66.json'

def read(path):
    return json.loads(path.read_bytes())

def encode(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')

def digest(value):
    return hashlib.sha256(value).hexdigest()

def stable(value):
    return digest(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf8'))

def pin(path):
    blob = path.read_bytes()
    return {'path': path.as_posix(), 'sha256': digest(blob), 'byteLength': len(blob)}

def save(path, value):
    blob = value if isinstance(value, bytes) else encode(value)
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        assert path.read_bytes() == blob, f'IMMUTABLE_CONFLICT: {path}'
    else:
        path.write_bytes(blob)

def norm(text):
    return re.sub(r'[^\w]+', ' ', unicodedata.normalize('NFKC', text).casefold()).strip()

def uuid7():
    return str(uuid.UUID(int=(int(time.time() * 1000) << 80) | (7 << 76) | (secrets.randbits(12) << 64) | (2 << 62) | secrets.randbits(62)))

def pos_for(topic, word):
    if topic.startswith('actions-'):
        return 'VERB'
    if topic in ['size-properties', 'feelings-quality']:
        return 'ADJECTIVE'
    if topic == 'numbers-colors':
        if word in ['one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'zero']:
            return 'NUMBER'
        if word in ['first', 'second', 'third', 'last']:
            return 'DETERMINER'
        return 'ADJECTIVE'
    if word in ['today', 'tomorrow', 'yesterday']:
        return 'ADVERB'
    return 'NOUN'

def image_brief(row, note):
    word = row['headword']
    count_words = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
    days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    specific = f"Illustrate this exact sense: {row['definitionEn']}. Context: {row['exampleEn']}"
    allowed = []
    if word in count_words:
        n = count_words.index(word)
        specific = f'Counting concept: exactly {n} identical red apples on a plain tray, all fully visible, easy to count, no other fruit or decorations. ' + ('The tray must be completely empty.' if n == 0 else 'Do not add any extra objects that could be counted.')
    elif word in days:
        allowed = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
        specific = f'A single simple weekly calendar with exactly seven columns in order Mon Tue Wed Thu Fri Sat Sun. Highlight only column {days.index(word)+1}, {word}. No dates, other words or decorative numbers.'
    elif word in ['today', 'tomorrow', 'yesterday']:
        allowed = ['Yesterday', 'Today', 'Tomorrow']
        specific = f'Three adjacent calendar cards labeled exactly Yesterday, Today, Tomorrow from left to right. Today remains the reference. Clearly highlight only the {word} card. One clear educational diagram, no extra labels or dates.'
    elif word == 'letter':
        allowed = ['M']
        specific = 'One large clearly formed uppercase Latin alphabet symbol M on a plain educational letter tile. This is an alphabet letter, not mail or an envelope.'
    elif row['topicCode'] == 'numbers-colors' and row['partOfSpeech'] == 'ADJECTIVE':
        specific = f'A single simple matte ball entirely {word}, on a neutral light background. Make the target color unmistakable; no multicolored decorations.'
    elif word in ['first', 'second', 'third']:
        position = ['first', 'second', 'third'].index(word) + 1
        specific = f'A single side-view scene: four children in one orderly queue facing a closed door on the right. The child in position {position} counting from the door wears a bright yellow top, the other three wear muted blue. Clear spacing, no overtaking, no letters or numbers.'
    elif word == 'last':
        specific = 'Four children in one orderly queue facing a closed door on the right. Only the last child, farthest from the door, wears bright yellow; the other three wear muted blue. Clear spacing, no letters or numbers.'
    elif row['partOfSpeech'] == 'ADJECTIVE':
        specific += ' If comparison is needed, use one coherent scene with a neutral comparison object; no split panels. Do not ridicule a person or depict a body type as ugly or bad.'
    no_text = ('Only these exact English teaching tokens may be readable: ' + ', '.join(allowed) + '. No other text.') if allowed else 'No readable words, letters, numerals, labels, captions, logos or watermarks.'
    return {'prompt': 'Clear friendly educational illustration, one coherent scene, accurate anatomy and objects, soft light, uncluttered neutral background, suitable for children and adult beginners. ' + specific + ' Sense constraint: ' + note + ' ' + no_text + ' No grids, contact sheets, gore, frightening scenes or dangerous unsupervised child actions. Square PNG, at least 1024 by 1024 pixels.', 'allowedReadableText': allowed, 'reviewRequired': True}

def build():
    policy = read(ROOT / 'editorial-policy.json')
    rows = []
    topics = []
    for number, line in enumerate((ROOT / 'authored-content.psv').read_text(encoding='utf8').splitlines(), 1):
        if line.startswith('# '):
            code, label = line[2:].split('|')
            topics.append({'code': code, 'labelVi': label})
        elif line.strip():
            cells = line.split('|')
            assert len(cells) == 5, f'BAD_ROW {number}'
            row = dict(zip(['headword', 'meaningVi', 'definitionEn', 'exampleEn', 'exampleVi'], cells))
            row.update(topicCode=code, partOfSpeech=pos_for(code, row['headword']), sourceLine=number)
            rows.append(row)
    assert len(rows) == 500 and len(topics) == 20
    assert set(Counter(r['topicCode'] for r in rows).values()) == {25}
    assert len({norm(r['headword']) for r in rows}) == 500
    previous = {norm(i['headword']) for i in read(PREVIOUS)['items']}
    assert not any(norm(r['headword']) in previous for r in rows), 'OVERLAP_PREVIOUS_547'
    baseline = read(BASE / 'corpus.json')['rows']
    index = defaultdict(list)
    for item in baseline:
        index[norm(item['headword'])].append(item)
    queue_index = defaultdict(list)
    for entry in read(QUEUE)['entries']:
        queue_index[norm(entry.get('headword', ''))].append(entry)
    # Persist identities once, before content freeze. They are authoring IDs, not canonical IDs.
    identities_path = ROOT / 'authoring-identities.json'
    if identities_path.exists():
        ids = read(identities_path)
    else:
        ids = {'datasetId': uuid7(), 'items': {norm(r['headword']): {k: uuid7() for k in ['itemId', 'exampleId', 'pronunciationRef', 'imageJobId', 'wordAudioJobId', 'exampleAudioJobId']} for r in rows}}
        save(identities_path, ids)
    assert set(ids['items']) == {norm(r['headword']) for r in rows}
    items = []
    unresolved = []
    for offset, row in enumerate(rows):
        word = row['headword']
        identity = ids['items'][norm(word)]
        candidates = list(index[norm(word)])
        for alias in policy['spellingAliases'].get(word, []):
            candidates += index[norm(alias)]
        candidates = list({c['runtimeVocabularyId']: c for c in candidates}.values())
        compatible = [c for c in candidates if c['partOfSpeech'] in (None, row['partOfSpeech'])]
        selected = None
        if word in policy['doNotReuseExistingSense']:
            reason = policy['doNotReuseExistingSense'][word]
        elif word in policy['selectedRuntimeIds']:
            selected = next(c for c in compatible if c['runtimeVocabularyId'] == policy['selectedRuntimeIds'][word])
            reason = 'Explicitly selected after comparing the authored meaning with all same-form runtime senses.'
        elif len(compatible) == 1:
            selected = compatible[0]
            reason = 'Only compatible record; its Vietnamese meaning was reviewed against the selected sense.'
        elif not compatible:
            reason = 'No compatible sense in the pinned local runtime snapshot.'
        else:
            unresolved.append({'headword': word, 'compatible': [{k: c[k] for k in ['runtimeVocabularyId', 'partOfSpeech', 'meaningVi', 'definitionEn']} for c in compatible]})
            continue
        note = policy['senseNotes'].get(word, row['definitionEn'])
        level = 'A2' if word in policy['a2EditorialProposals'] else 'A1'
        source_queue = queue_index[norm(word)]
        status = 'REUSE_EXISTING_SENSE_PROPOSED' if selected else ('MISSING_RUNTIME_SENSE_SAME_FORM' if candidates else 'MISSING_RUNTIME_FORM')
        example = {'exampleId': identity['exampleId'], 'exampleKey': 'basic-500-example-0001', 'en': row['exampleEn'], 'vi': row['exampleVi'], 'authorship': 'EDITORIALLY_AUTHORED_2026_10_29', 'audioJobId': identity['exampleAudioJobId']}
        item = {'itemId': identity['itemId'], 'authoringRevision': 1, 'entryCode': f'B500-{offset+1:04d}', 'masterLexemeId': None, 'masterSenseId': None,
                'runtimeVocabularyId': selected['runtimeVocabularyId'] if selected else None, 'identityStatus': 'EXISTING_RUNTIME_REFERENCE_MASTER_RECONCILIATION_PENDING' if selected else 'NEW_SENSE_CANDIDATE_CANONICAL_RECONCILIATION_PENDING',
                'headword': word, 'displayForm': word, 'language': 'en', 'partOfSpeech': row['partOfSpeech'], 'meaningVi': row['meaningVi'], 'shortMeaningVi': row['meaningVi'], 'definitionEn': row['definitionEn'], 'senseNote': note, 'examples': [example],
                'classification': {'learningLevel': level, 'cefr': level, 'status': 'EDITORIAL_PROPOSAL_NOT_OFFICIAL_CEFR_OR_RUNTIME_CHANGE', 'sourceRuntimeCefr': selected['currentCefr'] if selected else None, 'schoolGrades': [], 'agePolicy': 'ALL_AGES_BEGINNER_COLLECTION_NOT_A_SCHOOL_SYLLABUS'},
                'topicCodes': [row['topicCode']], 'collectionCodes': ['basic-500-' + REVISION, 'basic-500-' + row['topicCode']],
                'wordPronunciation': {'pronunciationRef': identity['pronunciationRef'], 'locale': 'en-US', 'ipa': None, 'ipaStatus': 'NOT_INVENTED', 'audioJobId': identity['wordAudioJobId']},
                'imageBrief': image_brief(row, note), 'media': {'image': {'jobId': identity['imageJobId'], 'status': 'PLANNED', 'assetPath': None, 'sha256': None}, 'wordAudio': {'jobId': identity['wordAudioJobId'], 'status': 'PLANNED', 'assetPath': None, 'sha256': None}, 'exampleAudio': [{'jobId': identity['exampleAudioJobId'], 'exampleId': identity['exampleId'], 'status': 'PLANNED', 'assetPath': None, 'sha256': None}]},
                'dedup': {'status': status, 'sameFormRuntimeCandidates': [{'runtimeVocabularyId': c['runtimeVocabularyId'], 'baselineRowId': c['baselineRowId'], 'headword': c['headword'], 'partOfSpeech': c['partOfSpeech'], 'meaningVi': c['meaningVi']} for c in candidates], 'selectedRuntimeVocabularyId': selected['runtimeVocabularyId'] if selected else None, 'selectionReason': reason, 'sourceQueueSameFormCount': len(source_queue), 'previous547Overlap': False, 'globalNewWordClaim': False},
                'provenance': {'authorship': 'EDITORIALLY_AUTHORED_NOT_DICTIONARY_QUOTATION', 'sourceLine': row['sourceLine'], 'definitionViAndExamplesAuthoredBy': 'CODEX_EDITORIAL', 'frozenRuntimeReference': {'baselineRowId': selected['baselineRowId'], 'runtimeVocabularyId': selected['runtimeVocabularyId']} if selected else None},
                'editorialReview': {'textPass': 'AUTHORED_AND_SELF_REVIEWED', 'meaningDisambiguation': 'SENSE_EXPLICIT', 'ownerReview': 'NOT_YET_REVIEWED', 'mediaReview': 'NOT_YET_GENERATED'}, 'runtimeEligible': False}
        item['contentSha256'] = stable({k: item[k] for k in ['itemId', 'headword', 'partOfSpeech', 'meaningVi', 'definitionEn', 'senseNote', 'examples', 'classification', 'topicCodes']})
        items.append(item)
    if unresolved:
        print(json.dumps({'unresolved': unresolved}, ensure_ascii=False))
        raise SystemExit('EXPLICIT_SENSE_DECISIONS_REQUIRED')
    inputs = [pin(p) for p in [ROOT / 'authored-content.psv', ROOT / 'editorial-policy.json', identities_path, BASE / 'corpus.json', QUEUE, PREVIOUS]]
    counts = dict(Counter(i['dedup']['status'] for i in items))
    dataset = {'artifactType': 'BASIC_500_EDITORIAL_DATASET', 'datasetId': ids['datasetId'], 'revision': REVISION, 'state': 'TEXT_FROZEN_MEDIA_PENDING', 'runtimeEligible': False, 'quantityMeaning': '500 curated learning entries, not 500 newly imported canonical words', 'counts': {'items': 500, 'topics': 20, 'examples': 500, 'plannedImages': 500, 'plannedWordAudio': 500, 'plannedExampleAudio': 500, 'actualMediaOutputs': 0, 'dedup': counts}, 'inputPins': inputs, 'topics': [dict(t, selectedCount=25) for t in topics], 'learningLevelCounts': dict(Counter(i['classification']['learningLevel'] for i in items)), 'classificationPolicy': 'Proposed basic track A1/A2 estimates; preserve sourceRuntimeCefr and review discrepancies before any canonical change. Grade-independent.', 'items': items}
    save(ROOT / ('dataset-text-' + REVISION + '.json'), dataset)
    source_pin = pin(ROOT / ('dataset-text-' + REVISION + '.json'))
    jobs = []
    for item in items:
        identity = ids['items'][norm(item['headword'])]
        for kind, key in [('IMAGE', 'imageJobId'), ('WORD_AUDIO', 'wordAudioJobId'), ('EXAMPLE_AUDIO', 'exampleAudioJobId')]:
            if kind == 'IMAGE':
                request = {'prompt': item['imageBrief']['prompt'], 'outputMime': 'image/png', 'minWidth': 1024, 'minHeight': 1024, 'allowedReadableText': item['imageBrief']['allowedReadableText']}
            else:
                request = {'text': item['headword'] if kind == 'WORD_AUDIO' else item['examples'][0]['en'], 'locale': 'en-US', 'voice': 'avocado_v2:MAI_01', 'speed': 90, 'outputMime': 'audio/mpeg', 'instruction': 'Speak only exact text. No introduction, Vietnamese translation, spelling, extra words or leading/trailing music.', 'pronunciationGuidanceNotSpoken': item['senseNote']}
            jobs.append({'jobId': identity[key], 'itemId': item['itemId'], 'kind': kind, 'headword': item['headword'], 'entryCode': item['entryCode'], 'exampleId': item['examples'][0]['exampleId'] if kind == 'EXAMPLE_AUDIO' else None, 'targetContentSha256': item['contentSha256'], 'requestedFilename': identity[key] + ('.png' if kind == 'IMAGE' else '.mp3'), 'requestSpec': request, 'requestSpecSha256': stable(request), 'provider': 'MUSE_LOGGED_IN_UI', 'providerModel': None, 'state': 'NOT_SUBMITTED', 'output': None, 'receipt': None, 'sourceDraft': source_pin})
    orders = {'artifactType': 'BASIC_500_MUSE_MEDIA_WORK_ORDERS', 'revision': REVISION, 'sourceDraft': source_pin, 'counts': {'items': 500, 'images': 500, 'wordAudio': 500, 'exampleAudio': 500, 'jobs': 1500}, 'jobs': jobs}
    save(MEDIA / 'work-orders.json', orders)
    save(MEDIA / 'work-orders.sha256', (digest(encode(orders)) + '\n').encode())
    request = {'artifactType': 'MUSE_BASIC_500_EXACT_MEDIA_REQUEST', 'campaignCode': 'basic-500-' + REVISION, 'instruction': 'Media production only. Do not author, translate or alter the dataset. Produce one separate PNG or MP3 for every exact job. Keep each requested UUID filename. Never borrow filenames or IDs from expansion-550. Do not return placeholder or empty files. If a job fails, report its jobId and continue others. Use ONLY the attached jobs. Up to 40 PNG per ZIP and up to 100 MP3 per ZIP; if ZIP too large, split smaller. Every ZIP must contain a mapping.json ARRAY and the exactly named files, no unmapped files. Mapping rows require jobId,itemId,kind,headword,filename,exactText (null for image, exact requestSpec.text for audio), actualVoice, actualModel (null if unknown). Use avocado_v2:MAI_01 en-US speed 90 consistently. Pronunciation guidance is NOT spoken text. Return downloadable ZIP attachments progressively. Do not create public links unless separately approved. For calendar/letter images only, permitted teaching tokens are explicitly listed; all other images must contain no readable text. Do not claim completion without delivering the actual files.', 'sourceDraft': source_pin, 'jobCount': 1500, 'jobs': jobs}
    request_path = MEDIA / ('muse-basic-500-request-' + REVISION + '.json')
    save(request_path, request)
    save(ROOT / 'build-summary.json', {'state': dataset['state'], 'counts': dataset['counts'], 'learningLevelCounts': dataset['learningLevelCounts'], 'dataset': source_pin, 'workOrders': pin(MEDIA / 'work-orders.json'), 'museRequest': pin(request_path), 'mediaRoot': MEDIA.as_posix(), 'canonicalNewSensesImported': 0})
    with (ROOT / 'review.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.writer(stream)
        writer.writerow(['code', 'topic', 'headword', 'pos', 'meaningVi', 'definitionEn', 'exampleEn', 'exampleVi', 'proposedLevel', 'sourceLevel', 'reuseRuntimeId', 'dedup'])
        for i in items:
            writer.writerow([i['entryCode'], i['topicCodes'][0], i['headword'], i['partOfSpeech'], i['meaningVi'], i['definitionEn'], i['examples'][0]['en'], i['examples'][0]['vi'], i['classification']['learningLevel'], i['classification']['sourceRuntimeCefr'], i['runtimeVocabularyId'], i['dedup']['status']])
    cards = ''.join('<section><h2>' + html.escape(t['labelVi']) + '</h2>' + ''.join('<article><b>' + html.escape(i['entryCode'] + ' · ' + i['headword']) + '</b> — ' + html.escape(i['meaningVi']) + '<p>' + html.escape(i['definitionEn']) + '</p><p>' + html.escape(i['examples'][0]['en']) + '<br>' + html.escape(i['examples'][0]['vi']) + '</p><small>' + html.escape(i['classification']['learningLevel'] + ' (đề xuất) · ' + i['dedup']['status'] + ' · runtime ' + str(i['runtimeVocabularyId'])) + '</small></article>' for i in items if i['topicCodes'] == [t['code']]) + '</section>' for t in topics)
    save(ROOT / 'review.html', ('<!doctype html><meta charset="utf-8"><title>Bộ 500 từ cơ bản — bản thảo</title><style>body{font:17px/1.6 system-ui;max-width:960px;margin:32px auto;padding:16px;background:#f8fafc;color:#172033}article{background:white;padding:20px;margin:12px 0;border:1px solid #dce3ed;border-radius:12px}p{margin:8px 0}small{color:#53637b}</style><h1>500 từ cơ bản · 20 chủ đề</h1><p>Bản thảo nội dung, chưa có media và chưa nhập DB. Mức A1/A2 là đề xuất biên tập; giữ tham chiếu các nghĩa cũ để tránh tạo bản ghi trùng.</p>' + cards).encode('utf8'))
    print(json.dumps({'items': 500, 'topics': 20, 'jobs': len(jobs), 'dedup': counts, 'levels': dataset['learningLevelCounts'], 'state': dataset['state']}))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', default='r0001')
    args = parser.parse_args()
    assert re.fullmatch(r'r\d{4}', args.revision), 'INVALID_REVISION'
    REVISION = args.revision
    ROOT = ROOT.parent / ('basic-500-' + REVISION)
    MEDIA = MEDIA.parent / ('basic-500-media-' + REVISION)
    build()
