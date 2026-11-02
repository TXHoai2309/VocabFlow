"""Compile only actually authored text. Freeze a Muse packet only at 5,000 valid entries."""
from pathlib import Path
import argparse
import collections
import csv
import hashlib
import importlib.util
import json
import shutil
import zipfile

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / '.vocabflow-local/editorial-refresh-20261031/ticket14-expansion-5000-r0001'
PREP = OUT / 'preparation'
DOC = ROOT / 'docs/plans/editorial-refresh-2026-10-28/ticket14-5000-r0001'
DATA = ROOT / 'vocabflow-dataset/workspaces/editorial-refresh-20261031/expansion-5000-r0001'


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


check = module('authoring_check', ROOT / 'scripts/editorial-expansion-5000-authoring-check.py')
validator = module('handoff_validator', DOC / 'validate-handoff.py')


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def pin(path, root):
    return {'path': path.relative_to(root).as_posix(), 'byteLength': path.stat().st_size,
            'sha256': validator.file_hash(path)}


def main(freeze=False):
    paths = sorted((DATA / 'authored').glob('*.psv'))
    rows, errors = check.check(paths)
    plan = validator.read(PREP / 'production-plan.json')
    registry = validator.read(PREP / 'id-registry.json')
    baseline = validator.read(PREP / 'baseline-1547.json')
    assert len(baseline['items']) == 1547
    source = ROOT / 'data/owner-publication/catalog-1547-r0001.json'
    assert validator.file_hash(source) == baseline['sourceSha256'], 'SELECTED_BASELINE_DRIFT'
    by_topic = collections.defaultdict(list)
    for row in rows:
        by_topic[row['topicCode']].append(row)
    if errors:
        dump(OUT / 'authoring-errors.current.json', {'status': 'NEEDS_CORRECTION', 'errors': errors})
        raise ValueError(f'AUTHORING_ERRORS:{len(errors)}')
    slots = collections.defaultdict(list)
    for slot in registry['slots']:
        slots[slot['suggestedTopicCode']].append(slot)
    items, jobs = [], []
    for topic in plan['topics']:
        code = topic['code']
        assert len(by_topic[code]) <= len(slots[code]), f'TOPIC_SLOT_OVERFLOW:{code}'
        for row, slot in zip(by_topic[code], slots[code]):
            glyphs = validator.literal_glyphs({'displayForm': row['headword'], 'partOfSpeech': row['pos']})
            style = ' Friendly, coherent educational illustration; one clear focal scene; square 768x768 PNG; '
            if glyphs:
                scene = row['imageScene'] + style + 'Render only these exact teaching glyphs: ' + json.dumps(glyphs, ensure_ascii=False) + '; no other text, labels, logos, watermarks or contact sheets.'
            else:
                scene = row['imageScene'] + style + 'no written words, labels, logos, watermarks or contact sheets.'
            item = {'slot': slot['slot'], 'itemId': slot['itemId'], 'displayForm': row['headword'],
                    'partOfSpeech': row['pos'], 'meaningVi': row['meaningVi'],
                    'shortMeaningVi': row['meaningVi'], 'definitionEn': row['definitionEn'],
                    'learningLevel': row['level'], 'cefr': None if row['level'] == 'FIRST_WORDS' else row['level'],
                    'classificationStatus': 'EDITORIAL_ESTIMATE',
                    'classificationRationale': 'Codex editorial estimate for this meaning and example; not an official CEFR assignment or school-grade mapping.',
                    'topicCodes': [code], 'imageBrief': scene,
                    'masterLexemeId': None, 'masterSenseId': None, 'runtimeVocabularyId': None,
                    'editorialReview': 'CODEX_EDITOR_SELF_REVIEWED_PENDING_FINAL_ACCEPTANCE',
                    'sources': [{'kind': 'CODEX_EDITOR_AUTHORED',
                                 'attribution': 'Original Codex editorial draft; producer is commissioned only for images and TTS.',
                                 'url': None, 'license': None}],
                    'example': {'exampleId': slot['exampleId'], 'en': row['exampleEn'], 'vi': row['exampleVi']},
                    'mediaJobIds': {'image': slot['imageJobId'], 'wordAudio': slot['wordAudioJobId'],
                                    'exampleAudio': slot['exampleAudioJobId']},
                    'pronunciation': {'pronunciationId': slot['pronunciationId'], 'locale': 'en-US',
                                      'ipa': None, 'ipaSource': None}}
            item['contentSha256'] = validator.stable(item)
            items.append(item)
            for kind, id_key in [('IMAGE', 'imageJobId'), ('WORD_AUDIO', 'wordAudioJobId'), ('EXAMPLE_AUDIO', 'exampleAudioJobId')]:
                job_id = slot[id_key]
                request = validator.request_for(item, kind, plan)
                jobs.append({'jobId': job_id, 'itemId': item['itemId'], 'kind': kind,
                             'targetContentSha256': item['contentSha256'],
                             'exampleId': item['example']['exampleId'] if kind == 'EXAMPLE_AUDIO' else None,
                             'pronunciationId': item['pronunciation']['pronunciationId'] if kind == 'WORD_AUDIO' else None,
                             'outputPath': plan['media']['paths'][kind].format(jobId=job_id),
                             'request': request, 'requestSha256': validator.stable(request),
                             'state': 'NOT_SUBMITTED', 'output': None})
    complete = len(items) == 5000 and len(by_topic) == 50 and all(len(by_topic[t['code']]) == 100 for t in plan['topics'])
    dataset = {'schemaVersion': 'vocabflow-expansion-5000/1.0.0', 'campaignId': plan['campaignId'],
               'state': 'TEXT_FROZEN_PENDING_MEDIA' if freeze and complete else 'AUTHORING_IN_PROGRESS',
               'runtimeEligible': False, 'items': items}
    working = OUT / 'text-production'
    dump(working / 'dataset.current.json', dataset)
    source_ledger = {'authorship': 'CODEX_EDITOR_AUTHORED', 'independentReviewClaimed': False,
                     'sources': [pin(p, ROOT) for p in paths],
                     'itemSources': [{'itemId': i['itemId'], 'sourceFile': r['sourceFile'], 'sourceLine': r['sourceLine']}
                                     for topic in plan['topics']
                                     for i, r in zip([i for i in items if topic['code'] in i['topicCodes']], by_topic[topic['code']])]}
    dump(working / 'source-ledger.current.json', source_ledger)
    with (working / 'review.current.csv').open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.writer(f)
        w.writerow(['itemId', 'word', 'pos', 'meaningVi', 'definitionEn', 'learningLevelEstimate', 'topic', 'exampleEn', 'exampleVi', 'imageBrief'])
        for i in items:
            w.writerow([i['itemId'], i['displayForm'], i['partOfSpeech'], i['meaningVi'], i['definitionEn'],
                        i['learningLevel'], i['topicCodes'][0], i['example']['en'], i['example']['vi'], i['imageBrief']])
    report = {'status': 'TEXT_COMPLETE_NOT_FROZEN' if complete else 'AUTHORING_IN_PROGRESS',
              'authoredItems': len(items), 'remainingToTarget': 5000 - len(items), 'topicsWithRows': sum(bool(v) for v in by_topic.values()),
              'topicCounts': dict(sorted((k, len(v)) for k, v in by_topic.items())),
              'levelCounts': dict(collections.Counter(i['learningLevel'] for i in items)),
              'plannedJobsForAuthoredItems': len(jobs), 'submittedJobs': 0, 'actualMedia': 0,
              'canonicalIdsAssigned': False, 'dbWrites': 0,
              'dataset': pin(working / 'dataset.current.json', ROOT)}
    dump(OUT / 'authoring-progress.current.json', report)
    if freeze:
        assert complete, 'CANNOT_FREEZE_INCOMPLETE_TEXT'
        ready = OUT / 'muse-ready'
        assert not ready.exists(), 'IMMUTABLE_READY_PACKET_ALREADY_EXISTS'
        shutil.copytree(PREP, ready)
        for name in ['validate-handoff.py', 'contract.md', 'muse-prompt.txt', 'dataset.schema.json']:
            shutil.copyfile(DOC / name, ready / name)
        plan.update(state='READY_FOR_MUSE_MEDIA', authoredItems=5000, executableMediaJobs=15000)
        dump(ready / 'production-plan.json', plan)
        dump(ready / 'dataset.json', dataset)
        canonical_text = DATA / 'dataset-text-r0001.json'
        if canonical_text.exists():
            assert canonical_text.read_bytes() == (ready / 'dataset.json').read_bytes(), 'IMMUTABLE_TEXT_REVISION_ALREADY_EXISTS'
        else:
            shutil.copyfile(ready / 'dataset.json', canonical_text)
        dump(ready / 'media-jobs.json', {'campaignId': plan['campaignId'],
                                       'datasetSha256': validator.file_hash(ready / 'dataset.json'), 'jobs': jobs})
        item_lookup = {i['itemId']: i for i in items}
        job_lookup = {j['jobId']: j for j in jobs}
        batch_index = []
        all_batch_items, all_batch_jobs = set(), set()
        for index in range(1, 101):
            batch_id = f'batch-{index:03d}'
            batch_slots = [s for s in registry['slots'] if s['batchId'] == batch_id]
            batch_items = [item_lookup[s['itemId']] for s in batch_slots]
            batch_jobs = [job_lookup[s[k]] for s in batch_slots for k in ['imageJobId', 'wordAudioJobId', 'exampleAudioJobId']]
            assert len(batch_items) == 50 and len(batch_jobs) == 150
            assert all(i['itemId'] not in all_batch_items for i in batch_items)
            all_batch_items.update(i['itemId'] for i in batch_items)
            all_batch_jobs.update(j['jobId'] for j in batch_jobs)
            path = ready / 'batches' / (batch_id + '.json')
            dump(path, {'batchId': batch_id, 'datasetSha256': validator.file_hash(ready / 'dataset.json'),
                        'items': batch_items, 'jobs': batch_jobs})
            batch_index.append({'batchId': batch_id, **pin(path, ready), 'items': 50, 'jobs': 150})
        assert len(all_batch_items) == 5000 and len(all_batch_jobs) == 15000
        dump(ready / 'batches/index.json', {'batches': batch_index, 'items': 5000, 'jobs': 15000})
        first = jobs[1]
        dump(ready / 'output-contract.json', {
            'artifactType': 'MUSE_MEDIA_RETURN_CONTRACT',
            'mediaResultsFilename': 'media-results.json',
            'mediaResultsRoot': {'jobsSha256': validator.file_hash(ready / 'media-jobs.json'), 'results': []},
            'resultExampleNotActualOutput': {
                'jobId': first['jobId'], 'itemId': first['itemId'], 'kind': first['kind'],
                'status': 'PENDING', 'targetContentSha256': first['targetContentSha256'],
                'requestSha256': first['requestSha256'], 'path': first['outputPath'],
                'sha256': None, 'byteLength': None, 'exactText': first['request']['exactText'],
                'actualProvider': None, 'actualModel': None, 'actualVoice': None,
                'error': None, 'processing': []},
            'instructions': [
                'Create one result per job using its own job/item/kind/content/request/path values.',
                'SUCCEEDED requires an actual file with measured bytes/SHA-256, successful decode, and correct meaning/text.',
                'Audio exactText is copied from the frozen request and must be what the clip actually reads.',
                'IMAGE exactText can be null; record actual dimensions and any resizing in processing.',
                'Unknown actual provider/model/voice fields are null; requested configuration is not observed metadata.',
                'Failures remain FAILED/PENDING with a concrete error; do not invent successful files.',
                'Preserve original input pins and frozen text in the final single archive.',
                'Run python validate-handoff.py . --delivery and include its actual report.'],
            'expectedFinalMediaFiles': 15000,
            'requiredAdditionalOutputs': ['README.md', 'progress.json', 'validation-report.json', 'SHA256SUMS.txt'],
            'archiveSelfSha256IsReportedOutsideArchive': True})
        shutil.copyfile(working / 'source-ledger.current.json', ready / 'source-ledger.json')
        shutil.copyfile(working / 'review.current.csv', ready / 'review.csv')
        (ready / 'sources').mkdir()
        for path in paths:
            shutil.copyfile(path, ready / 'sources' / path.name)
        (ready / 'SOURCES-AND-REVIEW.txt').write_text(
            'Original English definitions, Vietnamese glosses, bilingual examples and image scenes '
            'authored by the Codex editorial coordinator and authorized internal workers. '
            'Raw authoring PSV files are in sources/. No independently reviewed Master release '
            'or official CEFR certification is claimed. Classification values are editorial '
            'estimates for the selected meanings. Final owner acceptance and media alignment '
            'review remain pending. Muse is commissioned only for images and TTS; its actual '
            'provider/model/voice and file provenance must be recorded in the returned receipts.\n',
            encoding='utf-8')
        (ready / 'START-HERE.md').write_text('''# READY_FOR_MUSE_MEDIA — 5,000 new entries

All text is frozen and authored by Codex. Muse produces only the 15,000 image,
word-audio and example-audio jobs. Read contract.md and run validate-handoff.py
before production. Keep all text, IDs and paths unchanged; report content
questions separately. Final delivery is one ZIP64 containing actual media,
JSON, receipts and checksums. Record real shortages honestly.

Use batches/index.json and one batch file at a time: each contains 50 items
and 150 jobs, copied from the canonical frozen dataset and work orders. There
are 100 such batches; do not paste all 5,000 records into chat context.
Python 3 with jsonschema is required; final media verification also needs
ffprobe and ffmpeg. output-contract.json specifies exact receipt fields.

The dataset remains an editorial draft pending final acceptance. This is not
a database import or a claim of official CEFR certification.
''', encoding='utf-8')
        inputs = [pin(p, ready) for p in sorted(ready.rglob('*')) if p.is_file() and p.name != 'input-manifest.json']
        dump(ready / 'input-manifest.json', {'artifactType': 'INPUT_BYTE_MANIFEST',
                                           'campaignId': plan['campaignId'], 'files': inputs, 'selfHashIsExternal': True})
        validation = validator.verify(ready)
        dump(OUT / 'ready-validation.current.json', validation)
        archive = OUT / 'vocabflow-expansion-5000-r0001-muse-input.zip'
        with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, allowZip64=True) as z:
            for p in sorted(ready.rglob('*')):
                if p.is_file():
                    z.write(p, p.relative_to(ready).as_posix())
        with zipfile.ZipFile(archive) as z:
            assert z.testzip() is None
            assert all(z.read(n) == (ready / n).read_bytes() for n in z.namelist())
        report.update(status='READY_FOR_MUSE_MEDIA', readyArchive=pin(archive, ROOT),
                      readyValidation=validation, allArchiveMembersCrcAndBytesVerified=True)
        dump(OUT / 'authoring-progress.current.json', report)
    print(json.dumps(report, ensure_ascii=True))


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--freeze', action='store_true')
    args = p.parse_args()
    main(args.freeze)
