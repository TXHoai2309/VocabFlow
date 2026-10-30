"""Decode every received basic-500 clip; optionally ASR-screen a named risk sample.

Offline cached model only. Recognition never constitutes owner acceptance and
cannot establish the phonetic correctness of homographs such as read.
"""
import argparse
from collections import Counter
import hashlib
import importlib.util
import json
import os
from pathlib import Path

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf8')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asr-sample', action='store_true')
    parser.add_argument('--media-root', type=Path, default=Path('.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002'))
    parser.add_argument('--sample-words', help='Comma-separated exact headwords for word-audio screening.')
    parser.add_argument('--sample-examples', help='Comma-separated exact headwords for example-audio screening.')
    args = parser.parse_args()
    root = args.media_root
    assert root.resolve().is_relative_to((Path.cwd()/'.vocabflow-local').resolve()), 'MEDIA_ROOT_OUTSIDE_LOCAL_WORKSPACE'
    spec = importlib.util.spec_from_file_location('offline_audio_helpers', Path(__file__).with_name('editorial-audio-qa-v1.py'))
    helpers = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helpers)
    order_path = root / 'work-orders.json'
    order_sha = sha(order_path)
    assert order_sha == (root / 'work-orders.sha256').read_text().strip()
    orders = json.loads(order_path.read_bytes())
    assert sha(Path(orders['sourceDraft']['path'])) == orders['sourceDraft']['sha256']
    jobs = {j['jobId']: j for j in orders['jobs']}
    decoded = []
    audio = {}
    for rp in sorted(root.glob('runs/*/attempt-0001/receipt.json')):
        receipt = json.loads(rp.read_bytes())
        if receipt['kind'] == 'IMAGE':
            continue
        job = jobs[receipt['jobId']]
        assert receipt['sourceDraft'] == orders['sourceDraft'] and receipt['workOrdersSha256'] == order_sha
        assert receipt['requestedText'] == job['requestSpec']['text'] and receipt['requestSpecSha256'] == job['requestSpecSha256']
        path = root / receipt['output']['assetRelativePath']
        assert sha(path) == receipt['output']['sha256'] and path.stat().st_size == receipt['output']['byteLength']
        try:
            samples = helpers.decode_pcm(path)
            stats = helpers.pcm_statistics(samples)
            assert stats['durationMs'] >= 150, 'IMPLAUSIBLY_SHORT_CLIP'
            result = {'jobId': job['jobId'], 'headword': job['headword'], 'kind': job['kind'], 'expectedText': job['requestSpec']['text'], 'receiptSha256': sha(rp), 'assetSha256': receipt['output']['sha256'], 'state': 'DECODE_PASS', 'statistics': stats}
            audio[job['jobId']] = path
        except Exception as error:
            result = {'jobId': job['jobId'], 'state': 'DECODE_FAIL', 'error': str(error)}
        decoded.append(result)
    report = {'state': 'PASS' if all(r['state'] == 'DECODE_PASS' for r in decoded) else 'FAIL', 'scope': 'ALL_LOCALLY_RECEIVED_AUDIO_AT_RUN', 'plannedAudio': sum(j['kind'] != 'IMAGE' for j in orders['jobs']), 'received': len(decoded), 'decodePassed': sum(r['state'] == 'DECODE_PASS' for r in decoded), 'warnings': [r['jobId'] for r in decoded if r.get('statistics', {}).get('warnings')], 'workOrdersSha256': order_sha, 'spokenAccuracyClaim': False, 'results': decoded}
    write(root / 'audio-qa/decode.current.json', report)
    print(json.dumps({k: report[k] for k in ['state', 'plannedAudio', 'received', 'decodePassed', 'warnings']}), flush=True)
    if not args.asr_sample or report['state'] != 'PASS':
        return
    pins_path = Path('.vocabflow-local/editorial-refresh-20261028/media-production-r0001/audio-qa/local-model-pins.json')
    pins = json.loads(pins_path.read_bytes())
    for p in pins['files']:
        assert sha(Path(p['path'])) == p['sha256']
    model_dir = next(Path(p['path']).parent for p in pins['files'] if Path(p['path']).name == 'model.bin')
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1')
    from faster_whisper import WhisperModel
    model = WhisperModel(str(model_dir), device='cpu', compute_type='int8', local_files_only=True, cpu_threads=4)
    word_risks = {'read','wind','close','use','lie','practice','gray','T-shirt','pupil','aunt','uncle','cousin','daughter','wardrobe','broccoli','shrimp','yogurt','noodle','fish','chicken','letter','light','save','draw','bank','mouse','bat','second','third','zero'}
    example_risks = {'person', 'walk', 'read', 'wind', 'close', 'use'}
    if args.sample_words is not None:
        word_risks = {s.strip() for s in args.sample_words.split(',') if s.strip()}
    if args.sample_examples is not None:
        example_risks = {s.strip() for s in args.sample_examples.split(',') if s.strip()}
    selected = [r for r in decoded if (r['kind'] == 'WORD_AUDIO' and r['headword'] in word_risks) or (r['kind'] == 'EXAMPLE_AUDIO' and r['headword'] in example_risks)]
    results = []
    for row in selected:
        output = root / 'audio-qa/asr-sample' / (row['jobId'] + '-' + row['assetSha256'][:16] + '.json')
        if output.exists():
            result = json.loads(output.read_bytes())
        else:
            samples = helpers.decode_pcm(audio[row['jobId']])
            segments, info = model.transcribe(samples, language='en', task='transcribe', beam_size=1, vad_filter=False, condition_on_previous_text=False)
            text = ' '.join(s.text.strip() for s in segments).strip()
            exact = helpers.text_tokens(text) == helpers.text_tokens(row['expectedText'])
            result = {'jobId': row['jobId'], 'headword': row['headword'], 'kind': row['kind'], 'assetSha256': row['assetSha256'], 'expectedText': row['expectedText'], 'recognizedText': text, 'normalizedExactMatch': exact, 'state': 'ASR_MATCH_REVIEW_REQUIRED' if exact else 'ASR_DIFFERENCE_REVIEW_REQUIRED', 'ownerAccepted': False, 'modelPins': {'path': pins_path.as_posix(), 'sha256': sha(pins_path)}, 'expectedTextUsedAsRecognitionHint': False}
            write(output, result)
        results.append(result)
        print(json.dumps({'asrSampleProgress': len(results), 'plannedSample': len(selected), 'headword': result['headword'], 'state': result['state']}), flush=True)
    summary = {'scope': 'NAMED_RISK_SAMPLE_ONLY', 'screened': len(results), 'expectedSample': len(selected), 'normalizedMatches': sum(r['normalizedExactMatch'] for r in results), 'states': dict(Counter(r['state'] for r in results)), 'limitations': 'ASR differences can be spelling variants or recognizer errors. ASR matches do not prove phonetic pronunciation, speaker identity, full-dataset accuracy or owner approval. Never regenerate automatically from ASR alone.', 'results': results}
    write(root / 'audio-qa/asr-sample.current.json', summary)
    print(json.dumps({k: summary[k] for k in ['scope', 'screened', 'normalizedMatches', 'states']}), flush=True)

if __name__ == '__main__':
    main()
