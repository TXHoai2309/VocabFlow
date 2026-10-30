import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const ROOT='vocabflow-dataset/workspaces/editorial-refresh-20261028/ticket10-a1-a2-batch-0001';
const OUT='.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001';
const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=readFileSync(`${ROOT}/input-manifest-r0001.json`);
assert.equal(sha(bytes),readFileSync(`${ROOT}/input-manifest-r0001.sha256`,'utf8').trim());
const manifest=JSON.parse(bytes);const ids=manifest.ownedRuntimeVocabularyIds;
assert.equal(ids.length,51);assert.equal(new Set(ids).size,51);
const env=parseEnv(readFileSync('.vocabflow-local/development.env','utf8'));
const target=new URL(env.DATABASE_URL);
assert(target.hostname==='127.0.0.1'&&target.port==='55432'&&target.pathname==='/vocabflow_dev','DEDICATED_LOCAL_ONLY');
assert(env.DATABASE_DRIVER==='postgres-js'&&env.VOCABFLOW_ENV==='development'&&!env.VERCEL_ENV);
const db=postgres(target.toString(),{max:1,prepare:false,connect_timeout:10,onnotice:()=>{},connection:{application_name:'ticket10-read-only-audit',default_transaction_read_only:'on'}});
mkdirSync(OUT,{recursive:true});
const expected=new Map(manifest.inputRows.map(r=>[r.runtimeVocabularyId,r]));
const report={artifactType:'TICKET10_LIVE_LOCAL_CAPTURE',startedAtUtc:new Date().toISOString(),manifestSha256:sha(bytes),databaseWrites:0,remoteDatabaseAccess:false,providerCalls:0,checks:[]};
const pass=(name,details={})=>report.checks.push({name,status:'PASS',...details});
async function fingerprints(tx){
  const out={};
  const tables=['vocabularies','master_v2_development_projections','learning_sets','learning_set_items','learner_progress','review_events','learner_saved_vocabulary','learner_profiles','household_members','user','session','account','verification'];
  for(const table of tables){
    const [exists]=await tx`SELECT to_regclass(${'vocabflow_app.'+table}) IS NOT NULL AS yes`;
    if(!exists.yes)continue;
    const [row]=await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t`);
    out[table]=row;
  }
  return out;
}
try{
  const capture=await db.begin('isolation level repeatable read read only',async tx=>{
    await tx.unsafe("SET LOCAL statement_timeout='30s'");
    const [identity]=await tx`SELECT current_database() AS database,current_setting('transaction_read_only') AS read_only,current_setting('transaction_isolation') AS isolation`;
    assert.equal(identity.database,'vocabflow_dev');assert.equal(identity.read_only,'on');
    const rows=await tx`SELECT to_jsonb(v) AS vocabulary,to_jsonb(p) AS projection FROM vocabflow_app.vocabularies v JOIN vocabflow_app.master_v2_development_projections p ON p.vocabulary_id=v.id WHERE v.id IN ${tx(ids)} ORDER BY v.id`;
    assert.equal(rows.length,51);
    const differences=[];
    for(const {vocabulary:v,projection:p} of rows){
      const e=expected.get(v.id);
      for(const [field,live,frozen]of [['sourceHash',p.content_sha256,e.sourceContentSha256],['word',v.word,e.runtimeDisplay],['meaningVi',v.vietnamese,e.meaningVi],['meaningOverride',v.vietnamese_override,e.meaningViOverride],['definitionEn',v.definition_en,e.definitionEn],['examples',JSON.stringify(p.examples),JSON.stringify(e.examples)],['cefr',p.cefr,e.currentCefr],['version',v.content_version,e.currentRuntimeContentVersion]]){
        if(live!==frozen)differences.push({runtimeVocabularyId:v.id,field,live,frozen});
      }
    }
    return {identity,rows,differences,protectedBefore:await fingerprints(tx)};
  });
  assert.equal(capture.differences.length,0,'LIVE_BASELINE_DRIFT_REQUIRES_REBASE');
  pass('all51-live-content-hashes-text-examples-levels-and-versions-match-frozen');
  const apiRows=[];
  for(let n=0;n<ids.length;n+=25){
    const response=await fetch('http://127.0.0.1:3002/api/public/vocabulary?ids='+ids.slice(n,n+25).join(','),{signal:AbortSignal.timeout(25000)});
    assert.equal(response.status,200,'LOCAL_PUBLIC_DETAIL_FAILED');
    const result=await response.json();apiRows.push(...result.vocabulary);
  }
  assert.deepEqual(apiRows.map(r=>r.id).sort((a,b)=>a-b),ids);
  pass('real-public-api-returns-exact51-ids-no-scope-expansion');
  const protectedAfter=await db.begin('isolation level repeatable read read only',tx=>fingerprints(tx));
  assert.deepEqual(protectedAfter,capture.protectedBefore,'CONCURRENT_LOCAL_STATE_CHANGE_REVIEW_REQUIRED');
  pass('protected-content-collections-account-and-progress-fingerprints-unchanged',{tables:Object.keys(protectedAfter).length});
  const payload={...capture,apiRows,protectedAfter,finishedAtUtc:new Date().toISOString()};
  const output=Buffer.from(JSON.stringify(payload,null,2)+'\n');
  writeFileSync(`${OUT}/live-capture-r0001.json`,output,{flag:'wx'});
  report.capture={path:`${OUT}/live-capture-r0001.json`,sha256:sha(output),byteLength:output.length};
  report.status='PASS';report.items=51;
}finally{await db.end({timeout:3});}
writeFileSync(`${OUT}/live-verification-r0001.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
