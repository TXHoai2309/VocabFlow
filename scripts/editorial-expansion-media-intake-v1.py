"""Import a Muse UI-downloaded ZIP using exact authoring job IDs; no provider calls."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path, PurePosixPath
import zipfile

spec=importlib.util.spec_from_file_location('safe_pilot_zip',Path(__file__).with_name('editorial-media-archive-v1.py'))
guards=importlib.util.module_from_spec(spec);spec.loader.exec_module(guards)
ROOT=Path('.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001')
DATA=Path('vocabflow-dataset/workspaces/editorial-refresh-20261028/expansion-550-r0001')
sha=lambda b:hashlib.sha256(b).hexdigest()
read=lambda p:json.loads(p.read_bytes())
req=guards.require

def intake(source,cleanup=False,download_root=Path('D:/Download')):
    workspace=Path.cwd().resolve();root=ROOT.resolve();req(root.is_relative_to(workspace),'MEDIA_ROOT_OUTSIDE_WORKSPACE')
    raw=Path(source);req(not raw.is_symlink() and not getattr(raw,'is_junction',lambda:False)(),'DOWNLOAD_LINK')
    original=raw.resolve(strict=True);req(original.parent==download_root.resolve(strict=True) and original.suffix.lower()=='.zip','DIRECT_DOWNLOAD_ZIP_REQUIRED')
    req(original.stat().st_size<=guards.MAX_TOTAL,'ARCHIVE_TOO_LARGE')
    order_bytes=(root/'work-orders.json').read_bytes();order_sha=sha(order_bytes)
    req(order_sha==(root/'work-orders.sha256').read_text().strip(),'WORK_ORDERS_PIN_MISMATCH')
    orders=json.loads(order_bytes);source_draft=orders['sourceDraft'];draft_path=guards.safe(workspace,source_draft['path'])
    req(sha(draft_path.read_bytes())==source_draft['sha256'],'DRAFT_PIN_MISMATCH')
    jobs={j['jobId']:j for j in orders['jobs']};blob=original.read_bytes();archive_sha=sha(blob);plans=[]
    with zipfile.ZipFile(original) as archive:
        members=guards.validate_members(archive)
        mapping_member=next(i for i in members if PurePosixPath(i.filename).name.casefold()=='mapping.json')
        mapping_bytes=archive.read(mapping_member);mapping=json.loads(mapping_bytes)
        req(isinstance(mapping,list) and 0<len(mapping)<=255,'MAPPING_ARRAY_REQUIRED')
        used_jobs=set();used_members=set()
        for row in mapping:
            req(isinstance(row,dict) and row.get('jobId') in jobs,'UNKNOWN_JOB_ID')
            job=jobs[row['jobId']];req(job['jobId'] not in used_jobs,'DUPLICATE_JOB');used_jobs.add(job['jobId'])
            req(row.get('itemId')==job['itemId'] and row.get('kind')==job['kind'] and row.get('headword')==job['headword'],'TARGET_ID_KIND_WORD_MISMATCH')
            filename=row.get('filename');guards.checked_name(filename)
            req(filename==job['requestedFilename'],'FILENAME_NOT_EXACT_JOB_UUID')
            candidates=[m for m in members if not m.is_dir() and PurePosixPath(m.filename).name==filename]
            req(len(candidates)==1,'MEDIA_MEMBER_MISSING_OR_AMBIGUOUS');member=candidates[0]
            req(member.filename not in used_members,'DUPLICATE_MEDIA_MEMBER');used_members.add(member.filename)
            if job['kind']!='IMAGE':req(row.get('exactText')==job['requestSpec']['text'],'AUDIO_EXACT_TEXT_MISMATCH')
            else:req(row.get('exactText') in (None,''),'IMAGE_MAPPING_CANNOT_INVENT_SPOKEN_TEXT')
            content=archive.read(member);observed=guards.media_type(content)
            req(observed['mimeType']==job['requestSpec']['outputMime'],'OUTPUT_MIME_MISMATCH')
            digest=sha(content);attempt=f"runs/{job['jobId']}/attempt-0001";output_relative=attempt+'/output.'+observed['extension']
            asset_relative='assets/'+('images/' if job['kind']=='IMAGE' else 'audio/')+digest+'.'+observed['extension']
            # Conflicts are rejected before copying/cleaning any downloaded source.
            for relative in [output_relative,asset_relative]:
                target=guards.safe(root,relative)
                if target.exists():req(sha(target.read_bytes())==digest,'IMMUTABLE_OUTPUT_CONFLICT')
            receipt_relative=attempt+'/receipt.json';receipt_path=guards.safe(root,receipt_relative)
            if receipt_path.exists():
                receipt=read(receipt_path);req(receipt['output']['sha256']==digest and receipt['requestSpecSha256']==job['requestSpecSha256'],'RECEIPT_CONFLICT')
            plans.append((job,row,content,observed,digest,member.filename,output_relative,asset_relative,receipt_relative))
        all_media={m.filename for m in members if not m.is_dir() and PurePosixPath(m.filename).name.casefold()!='mapping.json'}
        req(all_media==used_members,'UNMAPPED_OR_EXTRA_MEDIA')
    archive_relative='provider-bundles/'+archive_sha+'.zip';guards.immutable(guards.safe(root,archive_relative),blob)
    outputs=[]
    for job,row,content,observed,digest,member,output_relative,asset_relative,receipt_relative in plans:
        guards.immutable(guards.safe(root,output_relative),content);guards.immutable(guards.safe(root,asset_relative),content)
        receipt={'artifactType':'EXPANSION_MUSE_MEDIA_RECEIPT','jobId':job['jobId'],'itemId':job['itemId'],'kind':job['kind'],'exampleId':job['exampleId'],'targetContentSha256':job['targetContentSha256'],'sourceDraft':source_draft,'workOrdersSha256':order_sha,'requestSpecSha256':job['requestSpecSha256'],
                 'sourceArchive':{'path':archive_relative,'sha256':archive_sha,'member':member,'mappingByteSha256':sha(mapping_bytes)},'provider':{'service':'MUSE_LOGGED_IN_UI','actualVoiceReported':row.get('actualVoice'),'actualModelReported':row.get('actualModel'),'reportedMetadataIndependentlyVerified':False},'requestedText':job['requestSpec'].get('text'),
                 'output':{'assetRelativePath':asset_relative,'sha256':digest,'byteLength':len(content),'mimeType':observed['mimeType'],'dimensions':observed.get('dimensions'),'durationMs':None},'reviewStatus':'REVIEW_REQUIRED','runtimeEligible':False,'createdAtUtc':datetime.now(timezone.utc).isoformat()}
        p=guards.safe(root,receipt_relative)
        if not p.exists():guards.immutable(p,guards.encode(receipt))
        req(sha(guards.safe(root,output_relative).read_bytes())==digest and sha(guards.safe(root,asset_relative).read_bytes())==digest,'FINAL_ASSET_REHASH_FAILED')
        outputs.append({'jobId':job['jobId'],'receiptPath':receipt_relative,'receiptSha256':sha(p.read_bytes())})
    req(sha(guards.safe(root,archive_relative).read_bytes())==archive_sha,'ARCHIVE_REHASH_FAILED')
    deleted=False
    if cleanup:
        req(original.parent==download_root.resolve(strict=True) and sha(original.read_bytes())==archive_sha,'CLEANUP_SOURCE_CHANGED')
        original.unlink();deleted=not original.exists()
    transfer={'sourcePath':str(original),'archivePath':archive_relative,'archiveSha256':archive_sha,'outputs':outputs,'deletedOriginalDownloadAfterVerifiedCopy':deleted,'status':'DOWNLOADED_HASH_VERIFIED_REVIEW_REQUIRED'}
    p=guards.safe(root,'provider-bundles/'+archive_sha+'.transfer.json')
    if not p.exists():guards.immutable(p,guards.encode(transfer))
    return transfer

def assemble():
    order_path=ROOT/'work-orders.json';order_sha=sha(order_path.read_bytes())
    req(order_sha==(ROOT/'work-orders.sha256').read_text().strip(),'WORK_ORDERS_PIN_MISMATCH')
    orders=read(order_path);draft_path=DATA/'dataset-text-r0001.json'
    req(sha(draft_path.read_bytes())==orders['sourceDraft']['sha256'],'DRAFT_PIN_MISMATCH')
    dataset=read(draft_path);jobs={j['jobId']:j for j in orders['jobs']};by_id={i['itemId']:i for i in dataset['items']};produced={}
    for p in ROOT.glob('runs/*/attempt-0001/receipt.json'):
        r=read(p);req(r.get('jobId') in jobs,'UNKNOWN_RECEIPT_JOB');j=jobs[r['jobId']]
        req(r['workOrdersSha256']==order_sha and r['sourceDraft']==orders['sourceDraft'],'RECEIPT_SOURCE_PIN_MISMATCH')
        req(r['kind']==j['kind'] and r['exampleId']==j['exampleId'] and r['requestedText']==j['requestSpec'].get('text'),'RECEIPT_TARGET_TEXT_MISMATCH')
        req(r['itemId']==j['itemId'] and r['targetContentSha256']==j['targetContentSha256'] and r['requestSpecSha256']==j['requestSpecSha256'],'RECEIPT_BINDING_MISMATCH')
        a=r['output'];path=guards.safe(ROOT.resolve(),a['assetRelativePath']);req(sha(path.read_bytes())==a['sha256'] and path.stat().st_size==a['byteLength'],'ASSET_BYTES_CHANGED')
        binding={'jobId':j['jobId'],'status':'DOWNLOADED_REVIEW_REQUIRED','assetPath':(ROOT/a['assetRelativePath']).as_posix(),'sha256':a['sha256'],'mimeType':a['mimeType'],'receiptPath':p.as_posix()}
        item=by_id[j['itemId']]
        if j['kind']=='IMAGE':item['media']['image']=binding
        elif j['kind']=='WORD_AUDIO':item['media']['wordAudio']=binding
        else:item['media']['exampleAudio']=[{**binding,'exampleId':j['exampleId']}]
        produced[j['jobId']]=binding
    dataset['counts']['actualMediaOutputs']=len(produced);dataset['state']='ALL_MEDIA_DOWNLOADED_REVIEW_PENDING' if len(produced)==1650 else 'MEDIA_INCOMPLETE'
    dataset['runtimeEligible']=False
    report={'state':dataset['state'],'items':550,'plannedJobs':1650,'downloadedHashVerified':len(produced),'missingJobIds':sorted(set(jobs)-set(produced)),'reviewAccepted':0,'canonicalNewSensesImported':0}
    (ROOT/'dataset-with-media.current.json').write_bytes(guards.encode(dataset));(ROOT/'production-progress.current.json').write_bytes(guards.encode(report))
    return report

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('source',nargs='?');parser.add_argument('--cleanup-download',action='store_true');parser.add_argument('--download-root',type=Path,default=Path('D:/Download'));parser.add_argument('--assemble',action='store_true');args=parser.parse_args()
    if args.assemble:result=assemble();print(json.dumps({k:v for k,v in result.items() if k!='missingJobIds'}))
    else:
        req(args.source,'SOURCE_ZIP_REQUIRED');result=intake(args.source,args.cleanup_download,args.download_root);print(json.dumps({'status':result['status'],'outputs':len(result['outputs']),'deletedSource':result['deletedOriginalDownloadAfterVerifiedCopy']}))
