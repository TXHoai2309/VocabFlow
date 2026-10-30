"""Check frozen inputs, existing-sense references, and exact media bindings offline."""
import argparse
from collections import Counter
import importlib.util
import json
from pathlib import Path
import re
import uuid

spec = importlib.util.spec_from_file_location('basic500', Path(__file__).with_name('editorial-basic500-build-v1.py'))
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

def validate(root, media, revision):
    checks = 0
    def require(condition, name):
        nonlocal checks
        checks += 1
        if not condition:
            raise ValueError(name)
    d = base.read(root / ('dataset-text-' + revision + '.json'))
    orders = base.read(media / 'work-orders.json')
    request = base.read(media / ('muse-basic-500-request-' + revision + '.json'))
    require(d['counts']['items'] == len(d['items']) == 500, 'EXACTLY_500_ENTRIES')
    require(len(d['topics']) == 20, 'EXACTLY_20_TOPICS')
    require(set(Counter(i['topicCodes'][0] for i in d['items']).values()) == {25}, '25_PER_TOPIC')
    require(not d['runtimeEligible'], 'NO_RUNTIME_ACTIVATION')
    for p in d['inputPins']:
        require(base.pin(Path(p['path'])) == p, 'INPUT_BYTES_CHANGED')
    require(orders['sourceDraft'] == base.pin(root / ('dataset-text-' + revision + '.json')), 'SOURCE_DRAFT_BINDING')
    require(base.digest((media / 'work-orders.json').read_bytes()) == (media / 'work-orders.sha256').read_text().strip(), 'WORK_ORDER_PIN')
    require(len(orders['jobs']) == request['jobCount'] == len(request['jobs']) == 1500, '1500_ACTUAL_JOB_ROWS')
    require(request['jobs'] == orders['jobs'], 'PROVIDER_PAYLOAD_EXACT_JOBS')
    require(Counter(j['kind'] for j in orders['jobs']) == {'IMAGE': 500, 'WORD_AUDIO': 500, 'EXAMPLE_AUDIO': 500}, 'EXACT_MEDIA_KIND_COUNTS')
    jobs = {j['jobId']: j for j in orders['jobs']}
    require(len(jobs) == 1500, 'NO_DUPLICATE_JOB_IDS')
    require(len({j['requestedFilename'].casefold() for j in jobs.values()}) == 1500, 'NO_FILENAME_COLLISION')
    require(len({base.norm(i['headword']) for i in d['items']}) == 500, 'NO_DUPLICATE_HEADWORDS')
    require(len({i['itemId'] for i in d['items']}) == 500, 'NO_DUPLICATE_ITEMS')
    old = {base.norm(i['headword']) for i in base.read(base.PREVIOUS)['items']}
    baseline = {i['runtimeVocabularyId']: i for i in base.read(base.BASE / 'corpus.json')['rows']}
    policy = base.read(root / 'editorial-policy.json')
    require(sum(i['runtimeVocabularyId'] is not None for i in d['items']) == 405, 'REUSE_COUNT_TRUTHFUL')
    for i in d['items']:
        require(base.norm(i['headword']) not in old, 'NO_OVERLAP_PRIOR_547')
        require(i['masterLexemeId'] is None and i['masterSenseId'] is None and not i['runtimeEligible'], 'NO_INVENTED_CANONICAL_IDS')
        require(uuid.UUID(i['itemId']).version == 7, 'AUTHORING_UUID_V7')
        require(len(i['examples']) == 1, 'ONE_AUTHORED_EXAMPLE')
        require(all(i[k].strip() for k in ['headword', 'meaningVi', 'definitionEn', 'senseNote']), 'CONTENT_REQUIRED')
        e = i['examples'][0]
        require(bool(re.search(r'(?<!\w)' + re.escape(i['headword']) + r'(?!\w)', e['en'], re.I)), 'EXACT_HEADWORD_IN_CONTEXT')
        require(2 <= len(e['en'].split()) <= 22 and 2 <= len(e['vi'].split()) <= 40, 'SHORT_BILINGUAL_EXAMPLE')
        require(not any(t in e['en'].lower() for t in ['insert example', 'example sentence here', 'lorem ipsum']), 'NO_PLACEHOLDER_EXAMPLE')
        require(i['wordPronunciation']['ipa'] is None, 'NO_TTS_INFERRED_IPA')
        require(i['classification']['schoolGrades'] == [], 'NO_CEFR_GRADE_MAPPING')
        require(i['classification']['learningLevel'] in ['A1', 'A2'], 'PROPOSED_BASIC_TRACK')
        require(i['contentSha256'] == base.stable({k: i[k] for k in ['itemId', 'headword', 'partOfSpeech', 'meaningVi', 'definitionEn', 'senseNote', 'examples', 'classification', 'topicCodes']}), 'ITEM_CONTENT_PIN')
        rid = i['runtimeVocabularyId']
        if rid is not None:
            c = baseline[rid]
            require(c['partOfSpeech'] in (None, i['partOfSpeech']), 'REUSED_POS_MATCH')
            require(base.norm(c['headword']) in {base.norm(i['headword']), *[base.norm(a) for a in policy['spellingAliases'].get(i['headword'], [])]}, 'REUSED_FORM_OR_EXPLICIT_SPELLING_ALIAS')
            require(i['classification']['sourceRuntimeCefr'] == c['currentCefr'], 'ORIGINAL_CEFR_PRESERVED')
            require(i['dedup']['selectedRuntimeVocabularyId'] == rid, 'REUSE_REFERENCE_NOT_CLONED')
        for binding, kind, exid in [(i['media']['image'], 'IMAGE', None), (i['media']['wordAudio'], 'WORD_AUDIO', None), (i['media']['exampleAudio'][0], 'EXAMPLE_AUDIO', e['exampleId'])]:
            j = jobs[binding['jobId']]
            require(j['itemId'] == i['itemId'] and j['headword'] == i['headword'] and j['kind'] == kind and j['exampleId'] == exid, 'EXACT_ITEM_KIND_EXAMPLE_BINDING')
            require(j['targetContentSha256'] == i['contentSha256'] and j['sourceDraft'] == orders['sourceDraft'], 'EXACT_SOURCE_CONTENT_BINDING')
            require(j['requestSpecSha256'] == base.stable(j['requestSpec']), 'REQUEST_SPEC_PIN')
            require(j['requestedFilename'] == j['jobId'] + ('.png' if kind == 'IMAGE' else '.mp3'), 'EXACT_UUID_FILENAME')
            require(j['state'] == 'NOT_SUBMITTED' and j['output'] is None, 'NO_INVENTED_MEDIA_OUTPUT')
            if kind != 'IMAGE':
                require(j['requestSpec']['text'] == (i['headword'] if kind == 'WORD_AUDIO' else e['en']), 'TTS_EXACT_TEXT')
                require(j['requestSpec']['voice'] == 'avocado_v2:MAI_01' and j['requestSpec']['locale'] == 'en-US' and j['requestSpec']['speed'] == 90, 'CONSISTENT_TTS_REQUEST')
    report = {'state': 'PASS', 'checks': checks, 'items': 500, 'topics': 20, 'jobs': 1500, 'dataset': base.pin(root / ('dataset-text-' + revision + '.json')), 'workOrders': base.pin(media / 'work-orders.json'), 'meaning': 'Structural, exact source/reference and content/media binding validation. Self-review is not independent owner approval or proof of generated media quality.', 'actualMediaOutputs': 0, 'canonicalNewSensesImported': 0}
    base.save(root / 'validation-report.json', report)
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--revision', default='r0002')
    args = parser.parse_args()
    assert re.fullmatch(r'r\d{4}', args.revision)
    root = base.ROOT.parent / ('basic-500-' + args.revision)
    media = base.MEDIA.parent / ('basic-500-media-' + args.revision)
    result = validate(root, media, args.revision)
    print(json.dumps({k: result[k] for k in ['state', 'checks', 'items', 'topics', 'jobs', 'actualMediaOutputs']}))
