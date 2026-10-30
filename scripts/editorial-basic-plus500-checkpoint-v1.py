"""Preserve actual source-driven additional500 progress with verified ZIP members."""
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import zipfile

def sha(blob):return hashlib.sha256(blob).hexdigest()

def main():
    repo=Path.cwd();root=repo/'.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001';data=repo/'vocabflow-dataset/workspaces/editorial-refresh-20261029/basic-plus-500-r0001'
    progress=json.loads((root/'production-progress.current.json').read_bytes())
    files={p for p in root.rglob('*') if p.is_file() and 'provider-bundles' not in p.parts and not(p.parent.name=='attempt-0001' and p.name.startswith('output.'))}
    files.update(p for p in data.rglob('*') if p.is_file())
    files.add(data.parent/'basic-plus-500-current.json')
    files.update(repo/'scripts'/n for n in ['editorial-basic-plus500-v1.py','validate-editorial-basic-plus500-v1.py','editorial-basic-plus500-media-v1.py','editorial-basic-plus500-review-v1.py','editorial-basic-plus500-checkpoint-v1.py','editorial-basic500-media-v1.py','editorial-basic500-audio-qa-v1.py','editorial-expansion-media-intake-v1.py','editorial-media-archive-v1.py','editorial-audio-qa-v1.py'])
    files.add(repo/'docs/plans/editorial-refresh-2026-10-28/basic-plus-500-production.md')
    files.add(repo/'scripts/editorial-basic-plus500-collections-v1.py')
    files.add(repo/'scripts/editorial-basic-plus500-finalize-v1.py')
    files.add(repo/'scripts/editorial-basic-plus500-image-correction-v1.py')
    records=[{'path':p.relative_to(repo).as_posix(),'sha256':sha(p.read_bytes()),'byteLength':p.stat().st_size} for p in sorted(files)]
    key=sha(json.dumps(records,sort_keys=True).encode())[:16]
    complete=root/'dataset-complete-r0003.json'
    label='basic-plus-500-complete-media-r0003' if complete.exists() else f"basic-plus-500-media{progress['downloadedHashVerified']}"
    target=root.parent/'handoff'/f'{label}-{key}.zip'
    assert not target.exists(),'CHECKPOINT_ALREADY_EXISTS'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_STORED) as z:
        for record in records:z.write(repo/record['path'],record['path'])
        z.writestr('CHECKPOINT-MANIFEST.json',json.dumps({'artifactType':'BASIC_PLUS500_ACTUAL_MEDIA_CHECKPOINT','createdAtUtc':datetime.now(timezone.utc).isoformat(),'receiptBackedProgress':progress,'scope':'Actual assets and receipts, frozen text/selected source rows/work orders, QA/review/tooling. Provider source ZIPs remain separately preserved locally; duplicate run output copies omitted. Full baseline rebuild dependencies remain in earlier text source backups. No owner approval or DB import implied.','files':records},ensure_ascii=False,indent=2)+'\n')
    with zipfile.ZipFile(target) as z:
        assert z.testzip() is None
        for record in records:
            blob=z.read(record['path']);assert len(blob)==record['byteLength'] and sha(blob)==record['sha256'],record['path']
    result={'path':target.relative_to(repo).as_posix(),'sha256':sha(target.read_bytes()),'byteLength':target.stat().st_size,'verifiedMembers':len(records)+1,'actualMediaJobs':progress['downloadedHashVerified'],'byKind':progress['byKind'],'ownerAccepted':False,'canonicalImportPerformed':False}
    if complete.exists():
        selected=json.loads(complete.read_bytes())
        result.update({'selectedDataset':{'path':complete.relative_to(repo).as_posix(),'sha256':sha(complete.read_bytes()),'byteLength':complete.stat().st_size},'selectedMediaJobs':selected['mediaSelection']['selectedMediaJobs'],'correctionImagesSelected':len(selected['mediaSelection']['replacements'])})
    target.with_suffix('.result.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8');print(json.dumps(result))

if __name__=='__main__':main()
