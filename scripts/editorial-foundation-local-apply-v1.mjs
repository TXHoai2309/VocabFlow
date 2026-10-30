/** Dedicated Development only: backup, trusted additive migration, seed, invariants. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';

const out='.vocabflow-local/editorial-refresh-20261030/foundation08-09-local-r0001';
const seedPath='vocabflow-dataset/workspaces/editorial-refresh-20261030/foundation08-09-r0001/runtime-seed-r0001.json';
const sha=b=>createHash('sha256').update(b).digest('hex');
const env=parseEnv(readFileSync('.vocabflow-local/development.env','utf8'));
assert(env.VOCABFLOW_ENV==='development'&&env.DATABASE_ENV==='development'&&env.EXECUTION_CONTEXT==='local-development'&&env.DATABASE_DRIVER==='postgres-js'&&!env.VERCEL_ENV);
for(const [key,role]of [['DATABASE_URL','vocabflow_runtime'],['DATABASE_MIGRATION_URL','vocabflow_migration']]){
  const u=new URL(env[key]);assert(u.hostname==='127.0.0.1'&&u.port==='55432'&&u.pathname==='/vocabflow_dev'&&decodeURIComponent(u.username)===role,'DEDICATED_LOCAL_ONLY');
}
const raw=readFileSync(seedPath);assert.equal(sha(raw),readFileSync(seedPath.replace('.json','.sha256'),'utf8').trim());
const seed=JSON.parse(raw);assert.equal(seed.targets.length,24);
mkdirSync(out,{recursive:true});
if(existsSync(`${out}/application-result.json`)){
  const completed=JSON.parse(readFileSync(`${out}/application-result.json`,'utf8'));
  assert.equal(completed.seedSha256,sha(raw),'APPLIED_SEED_CHANGED');assert.equal(completed.status,'PASS');
  console.log(JSON.stringify({status:'ALREADY_APPLIED_NO_WRITES',seedSha256:completed.seedSha256,result:`${out}/application-result.json`}));
  process.exit(0);
}
const db=postgres(env.DATABASE_MIGRATION_URL,{max:1,prepare:false,onnotice:()=>{}});
async function snapshot(){
  return db.begin('isolation level repeatable read read only',async tx=>{
    const [identity]=await tx`SELECT current_database() AS database,current_user AS role,(SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider,(SELECT environment FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS environment,has_database_privilege(current_user,current_database(),'CREATE') AS database_create`;
    assert.deepEqual(identity,{database:'vocabflow_dev',role:'vocabflow_migration',provider:'docker-local',environment:'development',database_create:false});
    const tables=await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' AND tablename NOT LIKE 'foundation\_%' ESCAPE '\' ORDER BY tablename`;
    const fingerprints={};
    for(const {tablename}of tables){
      const [row]=await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${tablename.replaceAll('"','""')}" t`);
      fingerprints[tablename]=row;
    }
    const history=[...await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`];
    return {identity,fingerprints,history};
  });
}
try{
  const current=await snapshot();
  const before=existsSync(`${out}/before.json`)?JSON.parse(readFileSync(`${out}/before.json`,'utf8')):current;
  if(!existsSync(`${out}/before.json`))writeFileSync(`${out}/before.json`,JSON.stringify(before,null,2)+'\n',{flag:'wx'});
  assert.deepEqual(current.fingerprints,before.fingerprints,'PREEXISTING_DATA_DRIFT');
  assert.deepEqual(current.history.slice(0,before.history.length),before.history,'HISTORY_PREFIX_DRIFT');
  assert([before.history.length,before.history.length+1].includes(current.history.length),'UNEXPECTED_MIGRATION_COUNT');
  if(current.history.length===before.history.length+1)assert.equal(current.history.at(-1).hash,sha(readFileSync('drizzle/migrations/0022_foundation_learning.sql')),'UNEXPECTED_NEW_MIGRATION');
  const backupPath=`${out}/before-foundation.dump`;
  if(!existsSync(backupPath)){
    const dump=spawnSync('docker',['exec','vocabflow-development-postgres','pg_dump','-U','vocabflow_local_admin','-d','vocabflow_dev','-Fc'],{encoding:null,maxBuffer:256*1024*1024,windowsHide:true});
    assert.equal(dump.status,0,'BACKUP_FAILED');assert.equal(dump.stdout.subarray(0,5).toString(),'PGDMP');writeFileSync(backupPath,dump.stdout,{flag:'wx'});
  }
  const backupBytes=readFileSync(backupPath);assert.equal(backupBytes.subarray(0,5).toString(),'PGDMP');
  const toc=spawnSync('docker',['exec','-i','vocabflow-development-postgres','pg_restore','--list'],{input:backupBytes,encoding:'utf8',maxBuffer:4*1024*1024,windowsHide:true});assert.equal(toc.status,0,'BACKUP_TOC_FAILED');assert(toc.stdout.includes('vocabularies')&&toc.stdout.includes('__drizzle_migrations')&&!toc.stdout.includes('foundation_targets'));
  console.log('FOUNDATION_LOCAL_BACKUP=PASS');
  const childEnv={};for(const k of ['PATH','Path','SystemRoot','windir','ComSpec','PATHEXT','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP'])if(process.env[k])childEnv[k]=process.env[k];Object.assign(childEnv,env);
  const migration=spawnSync(process.execPath,['--import','tsx','scripts/local-development-postgres.ts','migrate'],{env:childEnv,encoding:'utf8',maxBuffer:4*1024*1024,timeout:120000,windowsHide:true});
  assert(migration.status===0&&migration.stdout.includes('LOCAL_POSTGRES_MIGRATIONS=PASS'),'TRUSTED_LOCAL_MIGRATION_FAILED');
  const afterMigration=await snapshot();assert.deepEqual(afterMigration.fingerprints,before.fingerprints);assert.deepEqual(afterMigration.history.slice(0,before.history.length),before.history);assert.equal(afterMigration.history.length,before.history.length+1);
  await db.begin(async tx=>{
    await tx`SELECT pg_advisory_xact_lock(89421733)`;
    for(const c of seed.collections){
      await tx`INSERT INTO vocabflow_app.foundation_collections(code,title,module,sort_order) VALUES(${c.code},${c.title},${c.module},${c.order}) ON CONFLICT(code) DO NOTHING`;
      const [row]=await tx`SELECT title,module FROM vocabflow_app.foundation_collections WHERE code=${c.code}`;assert.equal(row.title,c.title);assert.equal(row.module,c.module);
    }
    for(const t of seed.targets){
      await tx`INSERT INTO vocabflow_app.foundation_targets(id,item_type,parent_letter_id,kind,content,pins,content_sha256,enabled) VALUES(${t.id}::uuid,${t.itemType},${t.parentLetterId}::uuid,${t.kind},${tx.json(t.content)},${tx.json(t.pins)},${t.contentSha256},true) ON CONFLICT(id) DO NOTHING`;
      const [row]=await tx`SELECT content_sha256,item_type FROM vocabflow_app.foundation_targets WHERE id=${t.id}::uuid`;assert.equal(row.content_sha256,t.contentSha256);assert.equal(row.item_type,t.itemType);
    }
    for(const m of seed.memberships)await tx`INSERT INTO vocabflow_app.foundation_memberships(collection,target_id,sort_order) VALUES(${m.collection},${m.targetId}::uuid,${m.order}) ON CONFLICT(collection,target_id) DO NOTHING`;
  });
  const after=await snapshot();assert.deepEqual(after.fingerprints,before.fingerprints);assert.deepEqual(after.history,afterMigration.history);
  const [counts]=await db`SELECT (SELECT count(*)::int FROM vocabflow_app.foundation_targets) AS targets,(SELECT count(*)::int FROM vocabflow_app.foundation_collections) AS collections,(SELECT count(*)::int FROM vocabflow_app.foundation_memberships) AS memberships,(SELECT count(*)::int FROM vocabflow_app.foundation_progress) AS progress,(SELECT count(*)::int FROM vocabflow_app.foundation_reviews) AS reviews`;
  assert.deepEqual(counts,{targets:24,collections:8,memberships:48,progress:0,reviews:0});
  const result={status:'PASS',seedSha256:sha(raw),counts,existingTablesFingerprintUnchanged:Object.keys(before.fingerprints).length,migrationHistoryPrefixPreserved:true,newMigrationRows:1,backup:{path:backupPath,sha256:sha(backupBytes),byteLength:backupBytes.length,tocVerified:true},remoteDatabaseAccess:false,vocabularyProgressWrites:0,accountRowsChanged:0,sourceAudioRecreated:0};
  writeFileSync(`${out}/after.json`,JSON.stringify(after,null,2)+'\n',{flag:'wx'});writeFileSync(`${out}/application-result.json`,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(result));
}finally{await db.end({timeout:3});}
