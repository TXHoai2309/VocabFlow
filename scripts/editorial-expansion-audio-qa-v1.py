"""Offline screening of downloaded expansion audio; never accepts or imports it."""
import hashlib
import importlib.util
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MEDIA = ROOT / '.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001'
PINS = ROOT / '.vocabflow-local/editorial-refresh-20261028/media-production-r0001/audio-qa/local-model-pins.json'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    spec = importlib.util.spec_from_file_location('pilot_qa_helpers', ROOT / 'scripts/editorial-audio-qa-v1.py')
    helpers = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(helpers)
    orders_path = MEDIA / 'work-orders.json'
    assert sha(orders_path) == (MEDIA / 'work-orders.sha256').read_text().strip().split()[0]
    orders = json.loads(orders_path.read_text(encoding='utf-8'))
    source = ROOT / orders['sourceDraft']['path']
    assert sha(source) == orders['sourceDraft']['sha256']
    jobs = {j['jobId']: j for j in orders['jobs']}
    pins = json.loads(PINS.read_text(encoding='utf-8'))
    for pin in pins['files']:
        assert sha(Path(pin['path'])) == pin['sha256']
    model_dir = next(Path(f['path']).parent for f in pins['files'] if Path(f['path']).name == 'model.bin')
    os.environ.update(HF_HUB_OFFLINE='1', TRANSFORMERS_OFFLINE='1', HF_HUB_DISABLE_TELEMETRY='1')
    from faster_whisper import WhisperModel
    model = WhisperModel(str(model_dir), device='cpu', compute_type='int8', local_files_only=True, cpu_threads=4)
    output_dir = MEDIA / 'audio-qa'
    output_dir.mkdir(exist_ok=True)
    results = []
    for receipt_path in sorted((MEDIA / 'runs').glob('*/attempt-*/receipt.json')):
        receipt = json.loads(receipt_path.read_text(encoding='utf-8'))
        if receipt['kind'] not in ('WORD_AUDIO', 'EXAMPLE_AUDIO'):
            continue
        job = jobs[receipt['jobId']]
        target = output_dir / (receipt['jobId'] + '-' + receipt['output']['sha256'][:16] + '.json')
        if target.exists():
            results.append(json.loads(target.read_text(encoding='utf-8')))
            continue
        audio = MEDIA / receipt['output']['assetRelativePath']
        assert sha(audio) == receipt['output']['sha256']
        assert audio.stat().st_size == receipt['output']['byteLength']
        assert receipt['workOrdersSha256'] == sha(orders_path)
        assert receipt['requestSpecSha256'] == job['requestSpecSha256']
        assert receipt['targetContentSha256'] == job['targetContentSha256']
        assert receipt['requestedText'] == job['requestSpec']['text']
        samples = helpers.decode_pcm(audio)
        stats = helpers.pcm_statistics(samples)
        # Expected text is compared only AFTER transcription, never used as a hint.
        segments, _ = model.transcribe(samples, language='en', beam_size=5,
                                        condition_on_previous_text=False, vad_filter=False)
        transcript = ' '.join(s.text.strip() for s in segments).strip()
        expected = receipt['requestedText']
        exact = helpers.text_tokens(expected) == helpers.text_tokens(transcript)
        result = {'jobId':job['jobId'], 'itemId':job['itemId'], 'kind':job['kind'],
                  'headword':job['headword'], 'expectedText':expected, 'transcript':transcript,
                  'outputSha256':sha(audio), 'receiptSha256':sha(receipt_path),
                  'pcmStatistics':stats, 'exactNormalizedTextMatch':exact,
                  'screeningStatus':'ASR_MATCH_REVIEW_PENDING' if exact else 'ASR_MISMATCH_REQUIRES_REVIEW',
                  'humanListeningPerformed':False, 'voiceLocaleVerified':False,
                  'runtimeEligible':False, 'modelPinsSha256':sha(PINS)}
        target.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        results.append(result)
        print(json.dumps({'jobId':job['jobId'],'asrMatch':exact}),flush=True)
    summary={'screened':len(results),'asrMatches':sum(r['exactNormalizedTextMatch'] for r in results),
             'asrMismatches':sum(not r['exactNormalizedTextMatch'] for r in results),
             'acceptedByThisTool':0,'note':'ASR mismatch is not proof of wrong speech; human listening has not been performed.'}
    (output_dir/'summary.current.json').write_text(json.dumps(summary,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(summary))


if __name__ == '__main__':
    main()
