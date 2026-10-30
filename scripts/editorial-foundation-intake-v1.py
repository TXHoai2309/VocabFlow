"""Verify a Muse foundation ZIP, retain exact bytes and bind existing jobs only."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
from zipfile import ZipFile

DATA = Path('vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001')
ROOT = Path('.vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001')


def sha(blob): return hashlib.sha256(blob).hexdigest()
def read(path): return json.loads(path.read_bytes())
def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    blob = (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode('utf8')
    if path.exists(): assert path.read_bytes() == blob, 'IMMUTABLE_CONFLICT'
    else: path.write_bytes(blob)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('archive', type=Path)
    args = parser.parse_args()
    manifest_bytes = (DATA / 'execution-manifest-r0001.json').read_bytes()
    assert sha(manifest_bytes) == (DATA / 'execution-manifest-r0001.sha256').read_text().strip()
    manifest = json.loads(manifest_bytes)
    jobs = {t['media']['jobId']: t['media'] for t in manifest['targets']}
    source = args.archive.resolve()
    assert source.parent == Path('D:/Download').resolve(), 'EXPECTED_DOWNLOAD_DIRECTORY'
    assert source.name.startswith('foundation08-09-') and source.suffix == '.zip'
    raw = source.read_bytes()
    digest = sha(raw)
    bundle = ROOT / 'provider-bundles' / (digest + '.zip')
    bundle.parent.mkdir(parents=True, exist_ok=True)
    if bundle.exists(): assert bundle.read_bytes() == raw
    else: bundle.write_bytes(raw)
    helper_spec = importlib.util.spec_from_file_location('foundation_audio_qa', Path('scripts/editorial-audio-qa-v1.py'))
    helper = importlib.util.module_from_spec(helper_spec)
    helper_spec.loader.exec_module(helper)
    received = []
    with ZipFile(bundle) as zipped:
        assert zipped.testzip() is None
        assert len(zipped.namelist()) == len(set(zipped.namelist()))
        mapping = json.loads(zipped.read('mapping.json'))
        assert isinstance(mapping, list) and len({r['jobId'] for r in mapping}) == len(mapping)
        expected_members = {'mapping.json'}
        for row in mapping:
            job = jobs[row['jobId']]
            for key in ['jobId', 'itemId', 'targetRef', 'filename', 'kind', 'exactText', 'targetIpa', 'dependencyHash', 'providerRequestHash']:
                assert row[key] == job[key], 'PROVIDER_MAPPING_MISMATCH:' + key
            if row['status'] == 'UNSUPPORTED':
                assert job['kind'] == 'LETTER_SOUND_AUDIO' and job['filename'] not in zipped.namelist()
                write(ROOT / 'capability' / (job['jobId'] + '.json'), {'status': 'UNSUPPORTED', 'job': job, 'providerMapping': row, 'bundleSha256': digest})
                continue
            assert row['status'] == 'DONE' and row['actualVoice'] == 'avocado_v2:MAI_01'
            assert job['kind'] != 'LETTER_SOUND_AUDIO', 'SOUND_REQUIRES_SEPARATE_LISTENING_INTAKE'
            assert row['actualRequest'] == job['exactText']
            blob = zipped.read(job['filename'])
            assert len(blob) > 100 and '/' not in job['filename'] and '\\' not in job['filename']
            expected_members.add(job['filename'])
            asset = ROOT / 'assets' / 'audio' / (sha(blob) + '.mp3')
            asset.parent.mkdir(parents=True, exist_ok=True)
            if asset.exists(): assert asset.read_bytes() == blob
            else: asset.write_bytes(blob)
            pcm = helper.decode_pcm(asset)
            stats = helper.pcm_statistics(pcm)
            assert stats['durationMs'] > 100 and 'NO_SIGNAL_ABOVE_MINUS45_DBFS' not in stats['warnings']
            receipt = {'artifactType': 'FOUNDATION_MEDIA_RECEIPT', 'jobId': job['jobId'], 'itemId': job['itemId'], 'targetRef': job['targetRef'], 'kind': job['kind'], 'exactText': job['exactText'], 'targetIpa': job['targetIpa'], 'dependencyHash': job['dependencyHash'], 'plannedProviderRequestHash': job['providerRequestHash'], 'actualProviderMapping': row, 'providerMappingIsReportedMetadata': True, 'assetPath': asset.as_posix(), 'sha256': sha(blob), 'byteLength': len(blob), 'mimeType': 'audio/mpeg', 'statistics': stats, 'bundle': {'path': bundle.as_posix(), 'sha256': digest}, 'technicalStatus': 'DECODE_AND_BINDING_PASS', 'humanListeningAccepted': False}
            write(ROOT / 'receipts' / (job['jobId'] + '.json'), receipt)
            received.append(receipt)
        assert set(zipped.namelist()) == expected_members
    write(ROOT / 'intakes' / (digest + '.json'), {'bundleSha256': digest, 'sourceFilename': source.name, 'received': len(received), 'mappingRows': len(mapping), 'databaseWrites': 0, 'providerCalls': 0})
    assert bundle.read_bytes() == raw and sha(source.read_bytes()) == digest
    source.unlink()  # Exact downloaded ZIP only, after durable copy and full verification.
    print(json.dumps({'status': 'PASS', 'received': len(received), 'mappingRows': len(mapping), 'bundleSha256': digest, 'downloadOriginalCleaned': True, 'files': [{'ref': r['targetRef'], 'asset': r['assetPath'], 'durationMs': r['statistics']['durationMs']} for r in received]}))


if __name__ == '__main__': main()
