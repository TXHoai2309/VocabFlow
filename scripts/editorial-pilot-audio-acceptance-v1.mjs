import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const ROOT = '.vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0002';
const PIN = '9ce4e83ddb69862a5ea8579a0be6f3969a422418980358e945945c85190a0f39';
const sha = b => createHash('sha256').update(b).digest('hex');
const read = p => JSON.parse(readFileSync(p,'utf8'));
const save = (name,value) => writeFileSync(`${ROOT}/${name}`,JSON.stringify(value,null,2)+'\n',{flag:'wx'});
const planBytes = readFileSync(`${ROOT}/integration-plan.json`);assert.equal(sha(planBytes),PIN);
const plan=JSON.parse(planBytes);assert.equal(plan.revision,2);assert.equal(plan.productionEligible,false);
assert.equal(sha(readFileSync(plan.previousPlan.path)),plan.previousPlan.sha256);
assert.equal(sha(readFileSync(plan.ownerListeningAcceptance.path)),plan.ownerListeningAcceptance.sha256);
const previous=read(plan.previousPlan.path);const acceptance=read(plan.ownerListeningAcceptance.path);
assert.deepEqual(acceptance.files.map(x=>x.word),['duck','blue','white','pen','pencil']);
for(const asset of plan.assets) assert.equal(sha(readFileSync(asset.repoRelativePath)),asset.sha256);
const oldById=new Map(previous.items.map(i=>[i.runtimeVocabularyId,i]));
const approved=new Set(acceptance.files.map(x=>x.runtimeVocabularyId));
assert.equal(plan.items.length,30);assert.equal(plan.assets.length,85);
for(const item of plan.items) {
  const old=oldById.get(item.runtimeVocabularyId);assert(old);
  if(!approved.has(item.runtimeVocabularyId)) assert.deepEqual(item,old);
  else {
    assert.equal(old.preview.media.wordAudio.length,0);assert.equal(item.preview.media.wordAudio.length,1);
    const chosen=acceptance.files.find(x=>x.runtimeVocabularyId===item.runtimeVocabularyId);
    assert.equal(item.preview.media.wordAudio[0].mediaSha256,chosen.assetSha256);
    const normalize=p=>{const c=structuredClone(p);delete c.ownerListeningAcceptanceSha256;c.media.wordAudio=[];c.missingMedia=c.missingMedia.filter(x=>x.kind!=='WORD_AUDIO');return c;};
    assert.deepEqual(normalize(item.preview),normalize(old.preview));
  }
}
const env=parseEnv(readFileSync('.vocabflow-local/development.env','utf8'));
assert(env.VOCABFLOW_ENV==='development'&&env.DATABASE_ENV==='development'&&env.EXECUTION_CONTEXT==='local-development'&&env.DATABASE_DRIVER==='postgres-js'&&!env.VERCEL_ENV);
const url=new URL(env.DATABASE_MIGRATION_URL);assert(url.hostname==='127.0.0.1'&&url.port==='55432'&&url.pathname==='/vocabflow_dev'&&decodeURIComponent(url.username)==='vocabflow_migration');
const db=postgres(env.DATABASE_MIGRATION_URL,{max:1,prepare:false,onnotice:()=>undefined});
const parentResult=read('.vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0001/apply-result.json');
const protectedNames=Object.keys(parentResult.protectedBefore).filter(x=>x!=='history');
async function fingerprint(tx) {
  const result={};
  for(const table of protectedNames) {
    assert(/^[a-z_]+$/.test(table));
    const [row]=await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t`);result[table]=row;
  }
  result.history=await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`;
  return result;
}
try {
  const [identity]=await db`SELECT current_database() AS database,session_user AS role,(SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider`;
  assert.deepEqual(identity,{database:'vocabflow_dev',role:'vocabflow_migration',provider:'docker-local'});
  const applied=existsSync(`${ROOT}/apply-result.json`);
  if(!applied) {
    assert(!existsSync(`${ROOT}/pre-audio-acceptance.dump`),'Inspect prior interrupted backup before retry');
    const backup=spawnSync('docker',['exec','vocabflow-development-postgres','pg_dump','-U','vocabflow_local_admin','-d','vocabflow_dev','-Fc'],{maxBuffer:128*1024*1024,windowsHide:true});
    assert.equal(backup.status,0);assert.equal(backup.stdout.subarray(0,5).toString(),'PGDMP');
    writeFileSync(`${ROOT}/pre-audio-acceptance.dump`,backup.stdout,{flag:'wx'});save('backup.json',{sha256:sha(backup.stdout),byteLength:backup.stdout.length,restoreExecuted:false});
  }
  const result=await db.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(20261029,7)`;
    const before=await fingerprint(tx);
    const rows=await tx`SELECT * FROM vocabflow_app.master_v2_development_projections WHERE vocabulary_id IN ${tx(plan.items.map(x=>x.runtimeVocabularyId))} ORDER BY vocabulary_id FOR UPDATE`;
    assert.equal(rows.length,30);
    for(const row of rows) {
      const item=plan.items.find(i=>i.runtimeVocabularyId===row.vocabulary_id);
      const old=oldById.get(row.vocabulary_id);
      assert.equal(row.proposal_key,item.proposalKey);assert.equal(row.content_sha256,item.sourceContentSha256);
      assert.deepEqual(row.source_provenance.editorialLocalPreview,{...(applied?item.preview:old.preview),integrationPlanSha256:applied?PIN:plan.previousPlan.sha256});
    }
    if(!applied) {
      save('prior-projections.json',rows);
      for(const item of plan.items) await tx`UPDATE vocabflow_app.master_v2_development_projections SET source_provenance=jsonb_set(source_provenance,'{editorialLocalPreview}',${tx.json({...item.preview,integrationPlanSha256:PIN})},true) WHERE vocabulary_id=${item.runtimeVocabularyId} AND content_sha256=${item.sourceContentSha256}`;
    }
    const after=await fingerprint(tx);assert.deepEqual(after,before);
    return {status:applied?'IDEMPOTENT_VERIFY_PASS':'OWNER_LISTENING_ACCEPTANCE_APPLIED',planSha256:PIN,protectedBefore:before,protectedAfter:after,counts:plan.counts,sets:parentResult.sets,newMediaGenerated:0,progressWrites:0,remoteWrites:0,changedAudioBindings:5};
  });
  if(!applied)save('apply-result.json',result);
  console.log(JSON.stringify({status:result.status,counts:result.counts,newMediaGenerated:0,progressWrites:0}));
} finally {await db.end({timeout:3});}
