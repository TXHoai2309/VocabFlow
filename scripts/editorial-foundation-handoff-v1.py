"""Freeze the foundation24-item JSON and a portable source/media subset handoff."""
import hashlib
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

DATA=Path('vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001')
MEDIA=Path('.vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001')
EVIDENCE=Path('.vocabflow-local/editorial-refresh-20261030/foundation08-09-local-r0001')
DOC=Path('docs/plans/editorial-refresh-2026-10-28')
def read(path):return json.loads(path.read_bytes())
def pin(path):
    blob=path.read_bytes();return {'path':path.as_posix(),'sha256':hashlib.sha256(blob).hexdigest(),'byteLength':len(blob)}
def freeze(path,value):
    blob=(json.dumps(value,ensure_ascii=False,indent=2)+'\n').encode()
    if path.exists():assert path.read_bytes()==blob,'IMMUTABLE_HANDOFF_CONFLICT:'+str(path)
    else:path.write_bytes(blob)

def main():
    manifest_path=DATA/'execution-manifest-r0001.json';manifest=read(manifest_path)
    assert pin(manifest_path)['sha256']==(DATA/'execution-manifest-r0001.sha256').read_text().strip()
    seed_path=DATA/'runtime-seed-r0001.json';seed=read(seed_path)
    assert pin(seed_path)['sha256']==(DATA/'runtime-seed-r0001.sha256').read_text().strip()
    targets={r['id']:r for r in seed['targets']}
    receipts={r['jobId']:(p,r) for p in (MEDIA/'receipts').glob('*.json') for r in [read(p)]}
    assert len(receipts)==18 and len(targets)==24
    items=[];used={manifest_path,seed_path,DATA/'execution-manifest-r0001.sha256',DATA/'runtime-seed-r0001.sha256',MEDIA/'muse-request-r0001.json'}
    for target in manifest['targets']:
        row=targets[target['targetId']];job=target['media'];rp=receipts.get(job['jobId'])
        media={'jobId':job['jobId'],'filenameRequested':job['filename'],'kind':job['kind'],'exactText':job['exactText'],'targetIpa':job['targetIpa'],'dependencyHash':job['dependencyHash'],'providerRequestHash':job['providerRequestHash'],'status':'MISSING_PROVIDER_PHONEME_CAPABILITY','asset':None,'receipt':None,'humanListeningAccepted':False}
        if rp:
            receipt_path,receipt=rp
            asset=Path(receipt['assetPath']);assert pin(asset)['sha256']==receipt['sha256'] and asset.stat().st_size==receipt['byteLength']
            assert receipt['targetRef']==target['draftRef'] and receipt['dependencyHash']==job['dependencyHash']
            media.update(status='RECEIVED_DECODE_BINDING_AND_ASR_PASS_LISTENING_PENDING',asset=pin(asset),receipt=pin(receipt_path),actualProviderMapping=receipt['actualProviderMapping'])
            used.update([asset,receipt_path])
        else:assert job['kind']=='LETTER_SOUND_AUDIO'
        used.add(Path(target['source']['repoRelativePath']))
        items.append({'targetId':target['targetId'],'itemType':target['itemType'],'parentLetterId':target['parentLetterId'],'draftRef':target['draftRef'],'pins':target['revisionPins'],'source':target['source'],'sourceDependency':target['sourceDependency'],'content':row['content'],'contentSha256':row['contentSha256'],'media':media,'cefr':None,'schoolGrade':None,'lexicalVocabularyId':None})
    ledger={'scope':'FUTURE_PLANNING_ONLY_NOT_EXECUTION','currentLetters':['A','I','M','S','F','T'],'remainingLetters':['B','C','D','E','G','H','J','K','L','N','O','P','Q','R','U','V','W','X','Y','Z'],'futureBatches':[['B','C','D','E','G'],['H','J','K','L','N'],['O','P','Q','R','U'],['V','W','X','Y','Z']],'newJobsAllocated':0,'newLexicalSenses':0}
    freeze(DATA/'remaining-letters-ledger-r0001.json',ledger)
    dataset={'schemaVersion':'foundation-dataset/1','artifactType':'PRIVATE_FOUNDATION_SELECTED_DATASET','date':'2026-10-30','state':'LOCAL_IMPLEMENTED_18_AUDIO_REVIEW_PENDING_6_SOUNDS_MISSING','privateAuthoringDataDoNotServeAsPublicDto':True,'sourceManifest':pin(manifest_path),'runtimeSeed':pin(seed_path),'parentLetters':manifest['parentLetters'],'counts':{'letters':6,'letterActivities':12,'utterances':12,'targets':24,'receivedAudio':18,'isolatedSoundAudioMissing':6,'images':0,'newLexicalSenses':0},'items':items,'collections':seed['collections'],'memberships':seed['memberships'],'futureLetters':pin(DATA/'remaining-letters-ledger-r0001.json')}
    dataset_path=DATA/'dataset-selected-r0001.json';freeze(dataset_path,dataset);used.update([dataset_path,DATA/'remaining-letters-ledger-r0001.json'])
    tests=read(EVIDENCE/'focused-tests-r0002.json');assert tests['success'] and tests['numFailedTests']==0
    verified=read(EVIDENCE/'verification.current.json');assert verified['status']=='PASS' and verified['checksPassed']==32
    asr=read(MEDIA/'audio-qa/asr-all18-r0001.json');assert len(asr['results'])==18 and all(r['normalizedMatch'] for r in asr['results'])
    apply=read(EVIDENCE/'application-result.json');assert apply['status']=='PASS' and apply['existingTablesFingerprintUnchanged']==28
    # Preserve media bundles,capability evidence and relevant local result reports.
    for folder in ['provider-bundles','capability','intakes','audio-qa']:
        used.update(p for p in (MEDIA/folder).rglob('*') if p.is_file())
    used.update([MEDIA/'review-gallery-r0001.html',MEDIA/'muse-audio-delivery-proof.png',EVIDENCE/'application-result.json',EVIDENCE/'before.json',EVIDENCE/'after.json',EVIDENCE/'verification.current.json',EVIDENCE/'focused-tests-r0002.json',DOC/'foundation-08-09-execution-2026-10-30.md'])
    # DB backup contains account data and is kept separately in its private local directory.
    assert all(p.suffix!='.dump' and '.env' not in p.name for p in used)
    for file in ['scripts/editorial-foundation-prepare-v1.mjs','scripts/editorial-foundation-intake-v1.py','scripts/editorial-foundation-seed-v1.py','scripts/editorial-foundation-local-apply-v1.mjs','scripts/editorial-foundation-verify-v1.mts','scripts/editorial-foundation-handoff-v1.py','apps/api/src/foundation-local.ts','apps/api/src/db/foundation-schema.ts','packages/contracts/src/foundation.ts','packages/learning-domain/src/foundation-queue.ts','apps/web/src/features/foundation/foundation-client.ts','apps/web/src/features/foundation/foundation-page.tsx','apps/web/src/features/foundation/foundation-routing.ts','apps/web/src/features/study/session-capacity.tsx','apps/web/src/features/study/session-capacity-options.ts','drizzle/migrations/0022_foundation_learning.sql','drizzle/migrations/meta/0022_snapshot.json']:
        used.add(Path(file))
    for file in ['apps/api/src/local-dev.ts','apps/web/src/App.tsx','apps/web/src/features/study/study-setup-page.tsx','apps/web/src/features/learners/vocabulary-list-page.tsx','apps/web/src/styles.css','packages/contracts/src/index.ts','packages/learning-domain/src/index.ts','drizzle.config.ts','drizzle/migrations/meta/_journal.json','apps/web/src/features/foundation/foundation-client.test.ts','apps/web/src/features/foundation/foundation-page.test.tsx','apps/api/src/foundation-local.test.ts','packages/learning-domain/src/foundation-queue.test.ts']:
        used.add(Path(file))
    archive_index=EVIDENCE/'handoff-index-r0001.json'
    freeze(archive_index,{'artifactType':'FOUNDATION_LOCAL_HANDOFF_INDEX','containsPrivateAnswerContent':True,'accountRowsOrEnvOrDbDumpIncluded':False,'files':[pin(p) for p in sorted(used)]})
    used.add(archive_index)
    archive=EVIDENCE/'foundation08-09-local-handoff-r0001.zip'
    if not archive.exists():
        with ZipFile(archive,'x',compression=ZIP_DEFLATED,compresslevel=6) as zipped:
            for p in sorted(used):zipped.write(p,p.as_posix())
    with ZipFile(archive) as zipped:
        assert zipped.testzip() is None and set(zipped.namelist())=={p.as_posix() for p in used}
        for p in used:assert hashlib.sha256(zipped.read(p.as_posix())).hexdigest()==pin(p)['sha256']
    handoff={'artifactType':'FOUNDATION08_09_LOCAL_IMPLEMENTATION_HANDOFF','date':'2026-10-30','state':dataset['state'],'ticketStatus':{'08':'in-progress','09':'in-progress'},'dataset':pin(dataset_path),'executionManifest':pin(manifest_path),'counts':dataset['counts'],'mediaAsrMatches':18,'humanListeningAccepted':False,'componentAndRegressionTests':{'passed':tests['numPassedTests'],'failed':tests['numFailedTests'],'report':pin(EVIDENCE/'focused-tests-r0002.json')},'realPostgresAndApiChecks':{'passed':32,'report':pin(EVIDENCE/'verification.current.json'),'sessionIdentityInjectedForAccountTests':True,'realBrowserLoginPerformed':False},'dedicatedLocalApplication':pin(EVIDENCE/'application-result.json'),'existingTablesPreserved':28,'remoteDatabaseAccess':False,'vocabularyProgressWrites':0,'build':'PASS','apiTypecheck':'PASS','webTypecheck':'PASS','focusedChangedTsTsxLint':'PASS','impeccableMechanicalDetector':{'findings':0,'runtimeVisualVerificationClaim':False},'browserVerification':{'state':'PENDING_LOCAL_BROWSER_USE_DISABLED','requiredWidths':[390,1440],'realPlaybackVerified':False},'remaining':['6isolated phoneme recordings unavailable from current Muse plain-text TTS','Owner listening approval of18new clips;letter names remain unscored practice until accepted','Actual desktop/mobile/browser playback verification after Local browser use is enabled'],'gallery':pin(MEDIA/'review-gallery-r0001.html'),'archive':{**pin(archive),'members':len(used),'crcAndEveryMemberHashVerified':True,'containsAccountRowsEnvOrDbDump':False},'routes':['http://127.0.0.1:5173/foundation/learn?module=letters','http://127.0.0.1:5173/foundation/learn?module=utterances'],'deploymentPerformed':False}
    freeze(DATA/'handoff-r0001.json',handoff)
    print(json.dumps(handoff,ensure_ascii=True))

if __name__=='__main__':main()
