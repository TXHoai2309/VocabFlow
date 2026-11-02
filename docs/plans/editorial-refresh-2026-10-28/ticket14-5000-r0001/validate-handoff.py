"""Read-only readiness/media verifier. Python 3 + jsonschema; ffprobe for delivery."""
from pathlib import Path, PurePosixPath
import argparse
import collections
import hashlib
import json
import math
import shutil
import struct
import subprocess
import sys
import unicodedata
from jsonschema import Draft202012Validator

LITERAL_GLYPHS = {
    'alphabet': ['A', 'B', 'C'], 'consonant': ['B'], 'vowel': ['A', 'E', 'I', 'O', 'U'],
    'capital letter': ['A'], 'uppercase': ['A'], 'lowercase': ['a'], 'initial': ['A'],
    'contraction': ['do', 'not', "don't"], 'punctuation': ['.', ',', '?', '!'],
    'comma': [','], 'period': ['.'], 'apostrophe': ["'"], 'hyphen': ['-'],
    'quotation mark': ['"'], 'exclamation mark': ['!'], 'question mark': ['?'],
    'plus': ['+'], 'minus': ['-'], 'equal': ['='], 'fraction': ['1/2'],
    'decimal': ['0.5'], 'percentage': ['50%'], 'percent': ['50%'], 'pi': ['π'],
    'square root': ['√'], 'equation': ['2+3=5'], 'inequality': ['<', '>'],
    'exponent': ['2³'], 'coefficient': ['3x'], 'variable': ['x'], 'constant': ['5']}
NUMBER_GLYPHS = dict(zip(
    'eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion fourth fifth sixth seventh eighth ninth tenth'.split(),
    '11 12 13 14 15 16 17 18 19 20 30 40 50 60 70 80 90 100 1000 1000000 1000000000 4th 5th 6th 7th 8th 9th 10th'.split()))


def literal_glyphs(item):
    word = item['displayForm'].casefold()
    return [NUMBER_GLYPHS[word]] if item['partOfSpeech'] == 'NUMBER' and word in NUMBER_GLYPHS else LITERAL_GLYPHS.get(word)


class Invalid(ValueError):
    pass


def require(condition, code):
    if not condition:
        raise Invalid(code)


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(data):
    return hashlib.sha256(data).hexdigest()


def file_hash(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def stable(value):
    return digest(json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'),
                             allow_nan=False).encode('utf-8'))


def normalize(text):
    text = unicodedata.normalize('NFKC', text).casefold()
    for old in ['’', '‘']:
        text = text.replace(old, "'")
    for old in ['‐', '‑', '–', '—', '-']:
        text = text.replace(old, ' ')
    return ' '.join(text.split())


def safe_path(root, rel):
    require(isinstance(rel, str) and '\\' not in rel and ':' not in rel, 'UNSAFE_PATH')
    p = PurePosixPath(rel)
    require(bool(p.parts) and not p.is_absolute() and '..' not in p.parts and rel == p.as_posix(), 'UNSAFE_PATH')
    resolved = (root / rel).resolve()
    require(resolved.is_relative_to(root.resolve()), 'PATH_OUTSIDE_ROOT')
    return resolved


def check_item(item, slot, excluded, variants, topics):
    require(item['itemId'] == slot['itemId'], 'ITEM_ID_MISMATCH')
    require(item['example']['exampleId'] == slot['exampleId'], 'EXAMPLE_ID_MISMATCH')
    require(item['pronunciation']['pronunciationId'] == slot['pronunciationId'], 'PRONUNCIATION_ID_MISMATCH')
    require(item['mediaJobIds'] == {'image': slot['imageJobId'], 'wordAudio': slot['wordAudioJobId'],
                                   'exampleAudio': slot['exampleAudioJobId']}, 'MEDIA_JOB_ID_MISMATCH')
    norm = normalize(item['displayForm'])
    key = ' '.join(variants.get(x, x) for x in norm.split())
    require(norm not in excluded and key not in excluded, 'DUPLICATE_HEADWORD_OR_VARIANT')
    require(all(t in topics for t in item['topicCodes']), 'UNKNOWN_TOPIC')
    expected_cefr = None if item['learningLevel'] == 'FIRST_WORDS' else item['learningLevel']
    require(item['cefr'] == expected_cefr, 'CEFR_LEVEL_MISMATCH')
    require((item['pronunciation']['ipa'] is None) == (item['pronunciation']['ipaSource'] is None), 'IPA_SOURCE_MISMATCH')
    require(item['contentSha256'] == stable({k: v for k, v in item.items() if k != 'contentSha256'}), 'CONTENT_HASH_MISMATCH')
    excluded.update([norm, key])


def request_for(item, kind, plan):
    if kind == 'IMAGE':
        request = {'prompt': item['imageBrief'], 'mimeType': 'image/png',
                   'width': plan['media']['image']['width'], 'height': plan['media']['image']['height']}
        if literal_glyphs(item):
            request['expectedGlyphs'] = literal_glyphs(item)
        return request
    request = {'exactText': item['displayForm'] if kind == 'WORD_AUDIO' else item['example']['en'],
               'locale': 'en-US', 'requestedVoice': plan['media']['tts']['requestedVoice'],
               'requestedSpeed': plan['media']['tts']['requestedSpeed'], 'mimeType': 'audio/mpeg'}
    if kind == 'WORD_AUDIO':
        request['pronunciationContext'] = {'partOfSpeech': item['partOfSpeech'],
                                           'definitionEn': item['definitionEn'],
                                           'contextMustNotBeSpoken': True}
    return request


def verify(root, delivery=False):
    pins = read(root / 'input-manifest.json')
    for pin in pins['files']:
        path = safe_path(root, pin['path'])
        require(path.is_file(), 'PIN_FILE_MISSING')
        require(path.stat().st_size == pin['byteLength'] and file_hash(path) == pin['sha256'], 'INPUT_PIN_MISMATCH')
    plan = read(root / 'production-plan.json')
    require(plan['textAuthoringMode'] == 'CODEX_AUTHORS_MUSE_MEDIA_ONLY', 'WRONG_ROLE')
    require(plan['state'] == 'READY_FOR_MUSE_MEDIA', 'TEXT_NOT_READY')
    require(plan['authoredItems'] == 5000 and plan['executableMediaJobs'] == 15000, 'TEXT_NOT_READY')
    dataset = read(root / 'dataset.json')
    schema = read(root / 'dataset.schema.json')
    Draft202012Validator.check_schema(schema)
    errors = list(Draft202012Validator(schema).iter_errors(dataset))
    require(not errors, 'DATASET_SCHEMA_INVALID')
    slots = {s['slot']: s for s in read(root / 'id-registry.json')['slots']}
    require(len(slots) == 5000, 'REGISTRY_COUNT_MISMATCH')
    baseline = read(root / 'baseline-1547.json')
    require(len(baseline['items']) == 1547, 'BASELINE_COUNT_MISMATCH')
    excluded = {k for i in baseline['items'] for k in [i['normalizedWord'], i['variantKey']]}
    variants = plan['normalization']['englishVariantTokens']
    topics = {t['code'] for t in plan['topics']}
    used_slots, item_map, expected_jobs = set(), {}, {}
    for item in dataset['items']:
        require(item['slot'] not in used_slots, 'DUPLICATE_SLOT')
        used_slots.add(item['slot'])
        slot = slots[item['slot']]
        check_item(item, slot, excluded, variants, topics)
        require(item['itemId'] not in item_map, 'DUPLICATE_ITEM_ID')
        item_map[item['itemId']] = item
        for kind, id_key in [('IMAGE', 'imageJobId'), ('WORD_AUDIO', 'wordAudioJobId'), ('EXAMPLE_AUDIO', 'exampleAudioJobId')]:
            job_id = slot[id_key]
            require(job_id not in expected_jobs, 'DUPLICATE_JOB_ID')
            expected_jobs[job_id] = {'jobId': job_id, 'itemId': item['itemId'], 'kind': kind,
                                    'targetContentSha256': item['contentSha256'],
                                    'exampleId': item['example']['exampleId'] if kind == 'EXAMPLE_AUDIO' else None,
                                    'pronunciationId': item['pronunciation']['pronunciationId'] if kind == 'WORD_AUDIO' else None,
                                    'outputPath': plan['media']['paths'][kind].format(jobId=job_id),
                                    'request': request_for(item, kind, plan)}
    jobs = read(root / 'media-jobs.json')
    require(jobs['datasetSha256'] == file_hash(root / 'dataset.json'), 'DATASET_BYTE_PIN_MISMATCH')
    require(len(jobs['jobs']) == 15000, 'JOB_COUNT_MISMATCH')
    seen_jobs = set()
    for job in jobs['jobs']:
        require(job['jobId'] not in seen_jobs, 'DUPLICATE_JOB_ID')
        seen_jobs.add(job['jobId'])
        require(job['jobId'] in expected_jobs, 'UNALLOCATED_JOB')
        expected = expected_jobs[job['jobId']]
        require({k: job.get(k) for k in expected} == expected, 'JOB_BINDING_OR_EXACT_TEXT_MISMATCH')
        require(job.get('requestSha256') == stable(job['request']), 'REQUEST_HASH_MISMATCH')
    summary = {'status': 'READY_FOR_MUSE_MEDIA_VERIFIED', 'items': len(item_map), 'jobs': len(seen_jobs),
               'levelCounts': dict(collections.Counter(i['learningLevel'] for i in dataset['items'])),
               'semanticAndListeningAcceptance': 'PENDING', 'dbWrites': 0}
    if not delivery:
        return summary
    receipts = read(root / 'media-results.json')
    require(receipts['jobsSha256'] == file_hash(root / 'media-jobs.json'), 'JOB_FILE_PIN_MISMATCH')
    require(len(receipts['results']) == 15000, 'RECEIPT_COUNT_MISMATCH')
    ffprobe = shutil.which('ffprobe')
    require(ffprobe is not None, 'FFPROBE_REQUIRED_FOR_ACTUAL_AUDIO_DECODE_CHECK')
    ffmpeg = shutil.which('ffmpeg')
    require(ffmpeg is not None, 'FFMPEG_REQUIRED_FOR_ACTUAL_MEDIA_DECODE_CHECK')
    seen_results, seen_paths = set(), set()
    for result in receipts['results']:
        job_id = result.get('jobId')
        require(job_id in expected_jobs and job_id not in seen_results, 'UNKNOWN_OR_DUPLICATE_RECEIPT')
        job = expected_jobs[job_id]
        require(result.get('status') == 'SUCCEEDED', 'MEDIA_JOB_INCOMPLETE')
        require(result.get('itemId') == job['itemId'] and result.get('kind') == job['kind'], 'RECEIPT_BINDING_MISMATCH')
        require(result.get('targetContentSha256') == job['targetContentSha256'], 'RECEIPT_CONTENT_PIN_MISMATCH')
        require(result.get('requestSha256') == stable(job['request']), 'RECEIPT_REQUEST_PIN_MISMATCH')
        require(result.get('path') == job['outputPath'] and result['path'] not in seen_paths, 'MEDIA_PATH_MISMATCH')
        require(all(k in result for k in ['actualProvider', 'actualModel', 'actualVoice']), 'ACTUAL_PROVIDER_FIELDS_MISSING')
        path = safe_path(root, result['path'])
        require(path.is_file() and path.stat().st_size == result.get('byteLength'), 'MEDIA_SIZE_MISMATCH')
        require(file_hash(path) == result.get('sha256'), 'MEDIA_HASH_MISMATCH')
        if job['kind'] == 'IMAGE':
            with path.open('rb') as f:
                header = f.read(24)
            require(header[:8] == b'\x89PNG\r\n\x1a\n' and header[12:16] == b'IHDR', 'INVALID_PNG')
            require(struct.unpack('>II', header[16:24]) == (plan['media']['image']['width'], plan['media']['image']['height']), 'PNG_DIMENSIONS_MISMATCH')
        else:
            require(result.get('exactText') == job['request']['exactText'], 'RECEIPT_EXACT_TEXT_MISMATCH')
            require(path.stat().st_size > 26, 'EMPTY_OR_HEADER_ONLY_MP3')
            probe = subprocess.run([ffprobe, '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(path)], capture_output=True, text=True, timeout=45)
            require(probe.returncode == 0, 'AUDIO_PROBE_FAILED')
            meta = json.loads(probe.stdout)
            duration = float(meta.get('format', {}).get('duration', 0))
            require(math.isfinite(duration) and 0 < duration <= 60, 'INVALID_AUDIO_DURATION')
            require(any(s.get('codec_name') == 'mp3' and s.get('codec_type') == 'audio' for s in meta.get('streams', [])), 'NOT_MP3_AUDIO')
        decoded = subprocess.run([ffmpeg, '-v', 'error', '-i', str(path), '-f', 'null', '-'], capture_output=True, timeout=60)
        require(decoded.returncode == 0, 'MEDIA_DECODE_FAILED')
        seen_results.add(job_id)
        seen_paths.add(result['path'])
    actual_paths = {p.relative_to(root).as_posix() for p in (root / 'media').rglob('*') if p.is_file()}
    require(actual_paths == seen_paths, 'UNEXPECTED_OR_MISSING_MEDIA_FILES')
    summary.update(status='DELIVERY_FILES_VERIFIED_PENDING_COORDINATOR_REVIEW', files=len(seen_results),
                   imageFiles=5000, audioFiles=10000)
    return summary


def self_test():
    count = 0
    for bad in ['../secret', '/tmp/secret', 'C:/secret', 'media\\bad.png', 'media/../../secret', './media/test']:
        try:
            safe_path(Path.cwd(), bad)
        except Invalid:
            count += 1
        else:
            raise Invalid('UNSAFE_PATH_CANARY_NOT_REJECTED')
    require(normalize('  COLOUR‑pencil  ') == 'colour pencil', 'NORMALIZATION_CANARY_FAILED')
    require(stable({'vi': 'cây', 'en': 'tree'}) == stable({'en': 'tree', 'vi': 'cây'}), 'STABLE_HASH_CANARY_FAILED')
    return {'status': 'SELF_TEST_PASS', 'unsafePathRejections': count, 'otherChecks': 2,
            'actualProductionMediaVerified': False}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('root', nargs='?', default='.')
    parser.add_argument('--delivery', action='store_true')
    parser.add_argument('--self-test', action='store_true')
    args = parser.parse_args()
    try:
        print(json.dumps(self_test() if args.self_test else verify(Path(args.root).resolve(), args.delivery), ensure_ascii=True))
    except (Invalid, FileNotFoundError, KeyError, ValueError) as error:
        code = str(error) if isinstance(error, Invalid) else 'MALFORMED_OR_MISSING_REQUIRED_INPUT'
        print(json.dumps({'status': 'NOT_READY_OR_INVALID', 'code': code, 'dbWrites': 0}))
        sys.exit(2)
