/** Record explicit owner listening acceptance and enable the same18 clips locally. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';

const DATA='vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001';
const MEDIA='.vocabflow-local/editorial-refresh-20261030/foundation08-09-media-r0001';
const OUT='.vocabflow-local/editorial-refresh-20261030/foundation08-09-local-r0002';
const DOC='docs/plans/editorial-refresh-2026-10-28';
const sha=b=>createHash('sha256').update(b).digest('hex');
const pin=path=>{const bytes=readFileSync(path);return {path,sha256:sha(bytes),byteLength:bytes.length};};
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const freeze=(path,value)=>{const bytes=JSON.stringify(value,null,2)+'\n';if(existsSync(path))assert.equal(readFileSync(path,'utf8'),bytes,'IMMUTABLE_ACCEPTANCE_CONFLICT');else writeFileSync(path,bytes,{flag:'wx'});};
mkdirSync(OUT,{recursive:true});
if(existsSync(`${OUT}/application-result.json`)){console.log('FOUNDATION_AUDIO_ACCEPTANCE_ALREADY_APPLIED_NO_WRITES');process.exit(0);}
const seedPin=pin(`${DATA}/runtime-seed-r0001.json`);assert.equal(seedPin.sha256,'d850dd02ba005942611c19db9cc53d001cf447798808c5c6490dd51a8081542f');
const datasetPin=pin(`${DATA}/dataset-selected-r0001.json`);assert.equal(datasetPin.sha256,'8b769379d99fba883e063fad6918589cfe823f6c740d5b43881bbfd4a3de31c7');
const beforeSeed=read(seedPin.path);const nextSeed=structuredClone(beforeSeed);const dataset=read(datasetPin.path);
const accepted=[];
for(const item of dataset.items){
  if(!item.media.asset){assert.equal(item.media.kind,'LETTER_SOUND_AUDIO');continue;}
  assert.deepEqual(pin(item.media.asset.path),item.media.asset);
  assert.deepEqual(pin(item.media.receipt.path),item.media.receipt);
  accepted.push({targetId:item.targetId,draftRef:item.draftRef,jobId:item.media.jobId,kind:item.media.kind,exactText:item.media.exactText,targetIpa:item.media.targetIpa,asset:item.media.asset,receipt:item.media.receipt});
}
assert.equal(accepted.length,18);
const acceptancePath=`${DOC}/foundation-08-09-owner-listening-acceptance-r0001.json`;
freeze(acceptancePath,{artifactType:'OWNER_FOUNDATION_08_09_AUDIO_LISTENING_ACCEPTANCE',date:'2026-10-30',authority:'Direct owner message in this chat',verbatimOwnerStatement:'tôi nghe ok rồi mà chưa có hình ảnh hả',context:'Owner listened to the linked foundation08/09 gallery containing18actual audio clips and6missing sound slots,then confirmed the audio sounds OK and asked about images.',decision:'OWNER_LISTENING_ACCEPTED_18_EXISTING_CLIPS',scope:'Accept the existing6letter-name and12utterance audio. No6isolated sound file exists or is accepted;no image generation is authorized by this record.',sourceDataset:datasetPin,sourceSeed:seedPin,acceptedFiles:accepted,newMediaGenerated:0,newIndependentExpertPhoneticReviewClaim:false});
const acceptancePin=pin(acceptancePath);
for(const row of nextSeed.targets){
  if(!row.content.audio)continue;
  assert.equal(row.content.audio.review,'PENDING');row.content.audio.review='OWNER_ACCEPTED';
  // Same target and spoken-content revisions; only acceptance metadata changes.
  const old=beforeSeed.targets.find(t=>t.id===row.id);
  // The seed uses recursively sorted compact JSON,including nested audio fields.
  function canonical(value){if(Array.isArray(value))return value.map(canonical);if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical(value[k])]));return value;}
  row.contentSha256=sha(JSON.stringify(canonical(row.content)));
  assert.deepEqual(row.pins,old.pins);
}
nextSeed.revision=2;nextSeed.ownerListeningAcceptance=acceptancePin;nextSeed.previousSeed=seedPin;
freeze(`${DATA}/runtime-seed-r0002.json`,nextSeed);
for(const item of dataset.items){
  const row=nextSeed.targets.find(t=>t.id===item.targetId);item.content=row.content;item.contentSha256=row.contentSha256;
  if(item.media.asset){item.media.status='OWNER_LISTENING_ACCEPTED_DECODE_BINDING_ASR_PASS';item.media.humanListeningAccepted=true;item.media.ownerListeningAcceptance=acceptancePin;}
}
dataset.state='LOCAL_18_AUDIO_OWNER_ACCEPTED_6_SOUNDS_MISSING';dataset.revision=2;dataset.previousDataset=datasetPin;dataset.ownerListeningAcceptance=acceptancePin;dataset.runtimeSeed=pin(`${DATA}/runtime-seed-r0002.json`);
freeze(`${DATA}/dataset-selected-r0002.json`,dataset);

const env=parseEnv(readFileSync('.vocabflow-local/development.env','utf8'));
const u=new URL(env.DATABASE_MIGRATION_URL);
assert(u.hostname==='127.0.0.1'&&u.port==='55432'&&u.pathname==='/vocabflow_dev'&&u.username==='vocabflow_migration');
assert(env.VOCABFLOW_ENV==='development'&&env.DATABASE_ENV==='development'&&env.EXECUTION_CONTEXT==='local-development'&&env.DATABASE_DRIVER==='postgres-js'&&!env.VERCEL_ENV);
const db=postgres(env.DATABASE_MIGRATION_URL,{max:1,prepare:false,onnotice:()=>{}});
async function protectedState(tx){
  const result={};
  const tables=await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' AND tablename<>'foundation_targets' ORDER BY tablename`;
  for(const {tablename}of tables){
    const [row]=await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${tablename.replaceAll('"','""')}" t`);
    result[tablename]=row;
  }
  return result;
}
try{
  const before=await db.begin('isolation level repeatable read read only',tx=>protectedState(tx));
  freeze(`${OUT}/before-protected.json`,before);
  const backupPath=`${OUT}/before-audio-acceptance.dump`;
  if(!existsSync(backupPath)){
    const dump=spawnSync('docker',['exec','vocabflow-development-postgres','pg_dump','-U','vocabflow_local_admin','-d','vocabflow_dev','-Fc'],{encoding:null,maxBuffer:256*1024*1024,windowsHide:true});
    assert.equal(dump.status,0);assert.equal(dump.stdout.subarray(0,5).toString(),'PGDMP');writeFileSync(backupPath,dump.stdout,{flag:'wx'});
  }
  let changed=0;
  await db.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(89421733)`;
    const [identity]=await tx`SELECT current_database() AS database,current_user AS role,(SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider,(SELECT environment FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS environment`;
    assert.deepEqual(identity,{database:'vocabflow_dev',role:'vocabflow_migration',provider:'docker-local',environment:'development'});
    const state=await protectedState(tx);assert.deepEqual(state,before);
    for(const next of nextSeed.targets){
      const previous=beforeSeed.targets.find(t=>t.id===next.id);
      const [live]=await tx`SELECT content_sha256,pins,content,item_type FROM vocabflow_app.foundation_targets WHERE id=${next.id}::uuid FOR UPDATE`;
      assert(live&&live.item_type===next.itemType);assert.deepEqual(live.pins,next.pins);
      if(!next.content.audio){assert.equal(live.content_sha256,previous.contentSha256);continue;}
      assert([previous.contentSha256,next.contentSha256].includes(live.content_sha256),'LIVE_CONTENT_DRIFT');
      if(live.content_sha256===next.contentSha256){assert.deepEqual(live.content,next.content);continue;}
      assert.deepEqual(live.content,previous.content);
      await tx`UPDATE vocabflow_app.foundation_targets SET content=${tx.json(next.content)},content_sha256=${next.contentSha256} WHERE id=${next.id}::uuid AND content_sha256=${previous.contentSha256}`;
      changed++;
    }
    assert.deepEqual(await protectedState(tx),before);
  });
  const after=await db.begin('isolation level repeatable read read only',tx=>protectedState(tx));assert.deepEqual(after,before);
  const rows=await db`SELECT item_type,kind,count(*)::int AS count,count(*) FILTER(WHERE content->'audio'->>'review'='OWNER_ACCEPTED')::int AS accepted FROM vocabflow_app.foundation_targets GROUP BY item_type,kind ORDER BY item_type,kind`;
  assert.equal(rows.reduce((n,r)=>n+r.accepted,0),18);
  const result={artifactType:'FOUNDATION_AUDIO_ACCEPTANCE_LOCAL_APPLICATION',status:'PASS',date:'2026-10-30',acceptance:acceptancePin,previousDataset:datasetPin,dataset:pin(`${DATA}/dataset-selected-r0002.json`),runtimeSeed:pin(`${DATA}/runtime-seed-r0002.json`),counts:{acceptedLetterNameAudio:6,acceptedUtteranceAudio:12,isolatedSoundsMissing:6,images:0},targetMetadataRowsUpdated:changed,protectedTablesUnchanged:Object.keys(before).length,progressOrReviewWrites:0,newAudioGenerated:0,newImagesGenerated:0,remoteDatabaseAccess:false,backup:pin(backupPath),remainingBrowserVerification:'PENDING_NOT_REASSESSED',full08Complete:false,full09Complete:false};
  freeze(`${OUT}/application-result.json`,result);console.log(JSON.stringify(result));
}finally{await db.end({timeout:3});}
