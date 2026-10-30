import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { readMigrationFiles } from 'drizzle-orm/migrator';
import { applyOwnerProduction, tableFingerprint, verifyOwnerProduction } from './editorial-owner-production-apply-core-v1.mjs';
import { readPublicLearningIndex } from '../apps/api/src/public-learning-index.ts';
import { readPublicVocabulary } from '../apps/api/src/vocabulary.ts';
import { readPublicVocabularyBrowse } from '../apps/api/src/learner-vocabulary-browse.ts';
import { createReviewQueueService } from '../apps/api/src/review-queue.ts';
import { createLearnerVocabularyBrowseService } from '../apps/api/src/learner-vocabulary-browse.ts';
import { createGlobalSearchService } from '../apps/api/src/global-search.ts';
import { createApp } from '../apps/api/src/index.ts';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const hash=b=>createHash('sha256').update(b).digest('hex');
const NAME='vocabflow-us65-full-rehearsal',IMAGE='postgres@sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4';
const docker=(args,input)=>spawnSync('docker',['exec',...(input?['-i']:[]),NAME,...args],{input,encoding:'utf8',windowsHide:true,maxBuffer:5*1024*1024});
const report={artifactType:'OWNER_PRODUCTION_FULL_REPLACEMENT_REHEARSAL',status:'IN_PROGRESS',checks:[],productionWrites:0,developmentWrites:0};
const pass=name=>{report.checks.push({name,status:'PASS'});console.log(JSON.stringify({check:name,status:'PASS'}));};
async function main(){
  const path=`${OUT}/production-plan-r0001.json`,plan=read(path),inventory=read(`${OUT}/production-inventory-r0001.json`),backup=read(`${OUT}/backup-r0002.json`),pin=hash(readFileSync(path));
  assert.equal(hash(readFileSync(backup.path)),backup.sha256);assert.equal(backup.restoreRehearsal,'PASS');
  const password=randomBytes(32).toString('hex');const created=spawnSync('docker',['run','-d','--name',NAME,'--label','vocabflow.us65.rehearsal=true','-p','127.0.0.1:55665:5432','--env','POSTGRES_PASSWORD','--env','POSTGRES_USER=qa_admin',IMAGE],{env:{...process.env,POSTGRES_PASSWORD:password},encoding:'utf8',windowsHide:true});
  assert.equal(created.status,0,'REHEARSAL_CONTAINER_CREATE_FAILED_DO_NOT_REMOVE_UNKNOWN_CONTAINER');const id=created.stdout.trim();assert(/^[a-f0-9]{64}$/.test(id));let db;
  try{
    let ready=false;for(let n=0;n<45;n++){if(docker(['pg_isready','-U','qa_admin']).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}assert(ready,'REHEARSAL_POSTGRES18_NOT_READY');
    const restore=docker(['pg_restore','--exit-on-error','--no-owner','--no-privileges','-U','qa_admin','-d','postgres'],readFileSync(backup.path));assert.equal(restore.status,0,'FULL_REHEARSAL_RESTORE_FAILED');
    db=postgres(`postgres://qa_admin:${password}@127.0.0.1:55665/postgres`,{max:1,prepare:false,onnotice:()=>{}});
    await db`SET TIME ZONE 'UTC'`;
    const frozen=read(`${OUT}/backup-before-r0002.json`);
    for(const [table,expected]of Object.entries(frozen.fingerprints))assert.deepEqual(await tableFingerprint(db,table),expected,'RESTORED_ROW_FINGERPRINT_MISMATCH');
    pass('all28-production-backup-tables-restored-byte-fingerprints-match');
    await db`CREATE ROLE vocabflow_runtime NOLOGIN`;
    const [latest]=await db`SELECT max(created_at)::text AS value FROM drizzle.__drizzle_migrations`;
    const pending=readMigrationFiles({migrationsFolder:'drizzle/migrations'}).filter(x=>x.folderMillis>Number(latest.value));assert.equal(pending.length,3);
    await db.begin(async tx=>{for(const m of pending){for(const statement of m.sql)await tx.unsafe(statement);await tx`INSERT INTO drizzle.__drizzle_migrations(hash,created_at)VALUES(${m.hash},${m.folderMillis})`;}});
    pass('exact-three-additive-migration-artifacts-apply-to-production-backup-schema');
    const database=drizzle(db);const before=await readPublicLearningIndex(database,'owner-production');assert.equal(before.vocabulary.length,4537);assert.equal(before.catalogIdentity,undefined);
    pass('new-runtime-compatibility-keeps4537-enabled-words-before-the-content-transaction');
    let deliberateRollback=false;
    try{await db.begin('isolation level serializable',async tx=>{await applyOwnerProduction(tx,plan,inventory,pin);throw new Error('DELIBERATE_REHEARSAL_ROLLBACK');});}
    catch(error){if(error.message==='DELIBERATE_REHEARSAL_ROLLBACK')deliberateRollback=true;else throw error;}
    assert(deliberateRollback,'DELIBERATE_ROLLBACK_WAS_NOT_EXECUTED');
    assert.equal((await db`SELECT count(*)::int AS count FROM vocabflow_app.vocabularies`)[0].count,7311);
    assert.equal((await db`SELECT count(*)::int AS count FROM vocabflow_app.owner_editorial_projections`)[0].count,0);
    pass('full-replacement-rollback-restores-old7311-and-empty-owner-projection');
    const applied=await db.begin('isolation level serializable',tx=>applyOwnerProduction(tx,plan,inventory,pin));assert.equal(applied.status,'APPLIED');
    const rerun=await db.begin('isolation level serializable',tx=>applyOwnerProduction(tx,plan,inventory,pin));assert.equal(rerun.status,'ALREADY_APPLIED_NO_WRITES');
    await verifyOwnerProduction(db,plan,pin);pass('exact1547-replacement-and-idempotent-rerun-with-protected-rows-unchanged');
    const index=await readPublicLearningIndex(database,'owner-production');assert.equal(index.vocabulary.length,1547);assert.equal(index.learningSets.length,76);assert.equal(index.topics.length,73);assert.equal(index.catalogIdentity,plan.catalogId);
    const levels={'intro-first-words':139,A1:731,A2:544,B1:132,B2:1,C1:0,C2:0,UNCLASSIFIED:139};
    for(const [cefr,total]of Object.entries(levels)){const page=await readPublicVocabularyBrowse(database,'owner-production',{cefr,page:1,pageSize:30});assert.equal(page.total,total,cefr);}
    pass('published-index-all76sets73topics-and-eight-level-totals-match');
    const samples=[plan.items[0],plan.items[547],plan.items[1047]];
    const detail=await readPublicVocabulary(database,{datasetVersion:'owner-production',ids:samples.map(x=>x.runtimeVocabularyId)});assert.equal(detail.length,3);
    for(const row of detail){const item=samples.find(x=>x.runtimeVocabularyId===row.id);assert.equal(row.imageUrl,item.content.media.image);assert.equal(row.audioUrl,item.content.media.wordAudio);assert.deepEqual(row.examples,item.content.examples);assert.equal(row.contentReviewStatus,undefined);}
    const canonicalEnv={VOCAB_DATASET_VERSION:'owner-production',VERCEL_ENV:'production',VOCABFLOW_ENV:'production',DATABASE_ENV:'production',EXECUTION_CONTEXT:'vercel-production',DATABASE_URL:'postgres://vocabflow_runtime:fixture@ep-twilight-firefly-a1dugz2x-pooler.ap-southeast-1.aws.neon.tech/neondb'};
    const app=createApp({publicLearningIndex:()=>readPublicLearningIndex(database,'owner-production'),publicVocabularyBatch:(_env,ids)=>readPublicVocabulary(database,{datasetVersion:'owner-production',ids})});
    const response=await app.request('http://rehearsal/api/public/vocabulary?ids='+samples.map(x=>x.runtimeVocabularyId).join(','),{},canonicalEnv);assert.equal(response.status,200);const body=await response.json();
    for(const row of body.vocabulary){const item=samples.find(x=>x.runtimeVocabularyId===row.id);assert.equal(row.imageUrl,item.content.media.image);assert.equal(row.audioUrl,item.content.media.wordAudio);assert.equal(row.examples[0].audioUrl,item.content.media.exampleAudio);assert.equal(row.developmentMedia,undefined);}
    const indexResponse=await app.request('http://rehearsal/api/public/learning-index',{},canonicalEnv);assert.equal(indexResponse.headers.get('x-vocabflow-catalog-mode'),'owner-production');assert.equal(indexResponse.headers.get('cache-control'),'no-store');
    pass('real-hono-production-response-preserves-owner-https-image-word-sentence-without-master-pass');
    const [actor]=await db`SELECT lp.id,hm.user_id FROM vocabflow_app.learner_profiles lp JOIN vocabflow_app.household_members hm ON hm.household_id=lp.household_id WHERE lp.enabled=true LIMIT 1`;assert(actor);
    const options={datasetVersion:'owner-production'},browse=createLearnerVocabularyBrowseService(database,options),queue=createReviewQueueService(database,options),search=createGlobalSearchService(database,options);
    assert.equal((await browse.browse(actor.user_id,actor.id,{page:1,pageSize:30})).total,1547);
    for(const set of index.learningSets.slice(0,3)){
      const result=await search.search(actor.user_id,actor.id,{q:set.name,limit:10});assert(result.learningSets.some(x=>x.id===set.id));
      const session=await queue.list(actor.user_id,actor.id,undefined,{type:'learning-set',id:set.id},30);assert(session.queue.every(x=>set.vocabularyIds.includes(x.vocabulary.id)));
      const empty=await queue.list(actor.user_id,actor.id,undefined,{type:'learning-set',id:set.id,cefr:'C2'},30);assert.equal(empty.queue.length,0);
    }
    await assert.rejects(browse.browse('unrelated-household',actor.id,{page:1,pageSize:30}),/HOUSEHOLD_ACCESS_DENIED/);
    pass('actual-account-read-services-queues-search-empty-level-and-household-denial-pass');
    const publicWords=await readPublicVocabulary(database,{datasetVersion:'owner-production',ids:plan.items.map(x=>x.runtimeVocabularyId)});
    assert.equal(publicWords.length,1547);
    writeFileSync(`${OUT}/public-runtime-fixture.current.json`,JSON.stringify({artifactType:'REHEARSED_PUBLIC_CATALOG_BROWSER_FIXTURE',accountDataIncluded:false,index,vocabulary:publicWords})+'\n');
    report.status='PASS';report.planSha256=pin;report.counts=applied.counts;report.removed=applied.removed;report.protectedFingerprintsMatched=true;report.accountReviewWrites=0;
  }finally{
    if(db)await db.end({timeout:5});const inspected=spawnSync('docker',['inspect','--format','{{.Id}}',NAME],{encoding:'utf8',windowsHide:true});assert.equal(inspected.stdout.trim(),id,'REHEARSAL_CONTAINER_ID_CHANGED_DO_NOT_REMOVE');const removed=spawnSync('docker',['rm','-fv',id],{encoding:'utf8',windowsHide:true});assert.equal(removed.status,0,'REHEARSAL_CONTAINER_NOT_REMOVED');
  }
  report.scratchContainerRemoved=true;writeFileSync(`${OUT}/full-rehearsal-r0001.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{const first=String(e?.message??'').split('\n')[0];writeFileSync(`${OUT}/full-rehearsal-failure.current.json`,JSON.stringify({checks:report.checks,code:e?.code,first:first.slice(0,180),stack:String(e?.stack??'').split('\n').filter(x=>x.includes('/scripts/')||x.includes('\\scripts\\')).slice(0,5)},null,2)+'\n');console.error(JSON.stringify({status:'FULL_REHEARSAL_STOPPED',code:/^[A-Z_0-9:]{3,90}$/i.test(first)?first:e?.code??'SAFE_FAILURE',lastCheck:report.checks.at(-1)?.name,detail:first.slice(0,150)}));process.exitCode=1;});
