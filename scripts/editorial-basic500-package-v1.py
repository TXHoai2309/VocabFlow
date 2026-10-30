"""Create and verify a portable text/media checkpoint of the selected basic export.

Includes original and replacement assets and receipts, excludes duplicate run
output bytes and provider ZIP copies. No provider calls or DB changes.
"""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import zipfile

def sha(blob):
    return hashlib.sha256(blob).hexdigest()

def main():
    repo = Path.cwd()
    media = repo / '.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002'
    text = repo / 'vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-500-r0002'
    export = media / 'dataset-complete-r0003.json'
    assert export.is_file() and json.loads(export.read_bytes())['counts']['actualMediaOutputs'] == 1500
    paths = set(p for p in media.rglob('*') if p.is_file() and 'provider-bundles' not in p.parts and not (p.parent.name == 'attempt-0001' and p.name.startswith('output.')))
    paths.update(p for p in text.rglob('*') if p.is_file())
    names = ['editorial-basic500-build-v1.py', 'validate-editorial-basic500-v1.py', 'editorial-basic500-media-v1.py', 'editorial-basic500-audio-qa-v1.py', 'editorial-basic500-review-v1.py', 'editorial-basic500-finalize-v1.py', 'editorial-basic500-package-v1.py', 'editorial-expansion-media-intake-v1.py', 'editorial-media-archive-v1.py', 'editorial-audio-qa-v1.py']
    paths.update(repo / 'scripts' / n for n in names)
    paths.add(repo / 'docs/plans/editorial-refresh-2026-10-28/basic-500-production.md')
    records = [{'path': p.relative_to(repo).as_posix(), 'sha256': sha(p.read_bytes()), 'byteLength': p.stat().st_size} for p in sorted(paths)]
    fingerprint = sha(json.dumps(records, sort_keys=True).encode())[:16]
    target = repo / '.vocabflow-local/editorial-refresh-20261029/handoff' / ('basic-500-complete-media-r0003-' + fingerprint + '.zip')
    assert not target.exists(), 'PACKAGE_ALREADY_EXISTS'
    manifest = {'artifactType': 'BASIC_500_COMPLETE_MEDIA_OFFLINE_PACKAGE', 'createdAtUtc': datetime.now(timezone.utc).isoformat(), 'selectedExport': {'path': export.relative_to(repo).as_posix(), 'sha256': sha(export.read_bytes())}, 'selectedCounts': {'items': 500, 'images': 500, 'wordAudio': 500, 'exampleAudio': 500}, 'scope': 'Includes authored text, selected and superseded assets, exact job receipts/work orders, visual/audio QA and gallery. Duplicate run/output bytes omitted; source ZIP archives remain separately preserved locally. Frozen baseline source dependencies needed to rebuild the text exist in the earlier text-source backup. This package already contains the built text/export. No canonical DB import or owner acceptance implied.', 'files': records}
    with zipfile.ZipFile(target, 'w', zipfile.ZIP_STORED) as archive:
        for record in records:
            archive.write(repo / record['path'], record['path'])
        archive.writestr('BASIC-500-COMPLETE-MANIFEST.json', json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    with zipfile.ZipFile(target) as archive:
        assert archive.testzip() is None
        for record in records:
            blob = archive.read(record['path'])
            assert len(blob) == record['byteLength'] and sha(blob) == record['sha256'], record['path']
    result = {'archive': target.relative_to(repo).as_posix(), 'sha256': sha(target.read_bytes()), 'byteLength': target.stat().st_size, 'verifiedMembers': len(records)+1, 'selectedMediaJobs': 1500, 'ownerAccepted': False, 'canonicalImportPerformed': False}
    target.with_suffix('.result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf8')
    print(json.dumps(result))

if __name__ == '__main__':
    main()
