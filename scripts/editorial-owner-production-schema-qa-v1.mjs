import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { vocabularyDatasetPredicate, vocabularyProjectionTable } from '../apps/api/src/vocabulary-dataset-version.ts';
import { localFirstWords } from '../apps/api/src/editorial-local-preview.ts';
const NAME='vocabflow-us65-publication-qa';
const IMAGE='postgres@sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const docker=(args,input)=>spawnSync('docker',['exec',...(input?['-i']:[]),NAME,...args],{input,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});
function run(statement){const r=docker(['psql','-XqAt','--set=ON_ERROR_STOP=1','-U','qa_admin','-d','postgres'],statement);if(r.status!==0)writeFileSync(`${OUT}/schema-qa-diagnostic.log`,r.stderr);assert.equal(r.status,0,'POSTGRES18_QA_STATEMENT_FAILED');return r.stdout.trim();}
const report={artifactType:'OWNER_PRODUCTION_POSTGRES18_COMPATIBILITY_QA',status:'IN_PROGRESS',checks:[],productionWrites:0,developmentWrites:0,usesOnlySyntheticFixtureData:true};
const pass=name=>report.checks.push({name,status:'PASS'});
function executeCompiled(statement){const q=new PgDialect().sqlToQuery(statement);const values=q.params.map(v=>`'${String(v).replaceAll("'","''")}'`).join(',');return run(`PREPARE qa_check AS ${q.sql}; EXECUTE qa_check${q.params.length?'('+values+')':''};`);}
async function main(){
  const created=spawnSync('docker',['run','-d','--name',NAME,'--label','vocabflow.us65.schema-qa=true','--env','POSTGRES_PASSWORD','--env','POSTGRES_USER=qa_admin',IMAGE],{env:{...process.env,POSTGRES_PASSWORD:randomBytes(32).toString('hex')},encoding:'utf8',windowsHide:true});
  assert.equal(created.status,0,'QA_CONTAINER_CREATE_FAILED_DO_NOT_REMOVE_UNKNOWN_CONTAINER');const id=created.stdout.trim();assert(/^[a-f0-9]{64}$/.test(id));
  try{
    let ready=false;for(let n=0;n<45;n++){if(docker(['pg_isready','-U','qa_admin']).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}assert(ready,'QA_POSTGRES18_NOT_READY');
    run(`CREATE ROLE vocabflow_runtime NOLOGIN; CREATE SCHEMA vocabflow_app; GRANT USAGE ON SCHEMA vocabflow_app TO vocabflow_runtime;
      CREATE TABLE vocabflow_app.vocabularies(id integer PRIMARY KEY,source_dataset text,enabled boolean);
      GRANT SELECT ON vocabflow_app.vocabularies TO vocabflow_runtime;`);
    run(readFileSync('drizzle/migrations/0024_owner_editorial_publication.sql','utf8'));
    assert.equal(run('SET ROLE vocabflow_runtime; SELECT count(*) FROM vocabflow_app.owner_editorial_active_projections'),'0');
    pass('fresh-migration-only-database-needs-no-importer-created-legacy-table');
    run(`DROP VIEW vocabflow_app.owner_editorial_active_projections;
      DROP TABLE vocabflow_app.owner_editorial_projections;
      DROP TABLE vocabflow_app.master_v2_development_projections;
      CREATE TABLE vocabflow_app.master_v2_development_projections(proposal_key text,source_group_key text,vocabulary_id integer,part_of_speech text,cefr text,tags jsonb,examples jsonb,source_provenance jsonb,content_sha256 text,content_review_decision text,editorial_status text,rights_status text,development_media jsonb,created_at timestamptz,updated_at timestamptz);
      INSERT INTO vocabflow_app.vocabularies VALUES(1,'VOCABFLOW_MASTER_V2_DEV',true);
      INSERT INTO vocabflow_app.master_v2_development_projections VALUES('old:one','old',1,'NOUN','A1','[]','[]','{}',repeat('1',64),'PASS','DRAFT','UNKNOWN_REVIEW_REQUIRED','{}',now(),now());`);
    run(readFileSync('drizzle/migrations/0024_owner_editorial_publication.sql','utf8'));
    pass('exact0024-ddl-and-runtime-read-grants-apply-on-postgres18');
    const selection=sql`SELECT v.id FROM vocabflow_app.vocabularies v LEFT JOIN ${vocabularyProjectionTable('owner-production')} md ON md.vocabulary_id=v.id WHERE v.enabled=true AND ${vocabularyDatasetPredicate('v','owner-production')} ORDER BY v.id`;
    assert.equal(executeCompiled(selection),'1');pass('before-content-cutover-compatible-runtime-still-serves-existing-v2');
    const insert=`INSERT INTO vocabflow_app.vocabularies VALUES(2,'VOCABFLOW_OWNER_EDITORIAL',true);
      INSERT INTO vocabflow_app.owner_editorial_projections(proposal_key,source_group_key,vocabulary_id,part_of_speech,cefr,tags,examples,source_provenance,content_sha256)
      VALUES('owner:test','owner',2,'NOUN',NULL,'["EDITORIAL:FIRST_WORDS"]','[]','{"ownerPublishedCatalog":{"catalogId":"owner-production-1547-20261030-r0001","shortMeaningVi":"mèo"}}',repeat('2',64));`;
    run('BEGIN;'+insert+'ROLLBACK;');assert.equal(executeCompiled(selection),'1');pass('aborted-catalog-transaction-leaves-existing-v2-readable');
    run('BEGIN;'+insert+'COMMIT;');assert.equal(executeCompiled(selection),'2');pass('committed-owner-catalog-switch-hides-v2-without-fabricated-master-review');
    assert.equal(run('SELECT content_review_decision FROM vocabflow_app.owner_editorial_active_projections'),'OWNER_SELECTED_PUBLICATION');
    const firstWords=sql`SELECT count(*) FROM vocabflow_app.vocabularies v JOIN ${vocabularyProjectionTable('owner-production')} md ON md.vocabulary_id=v.id WHERE ${localFirstWords}`;
    assert.equal(executeCompiled(firstWords),'1');pass('curated-first-words-work-outside-vocabflow-dev-with-null-cefr');
    assert.equal(run('SET ROLE vocabflow_runtime; SELECT count(*) FROM vocabflow_app.owner_editorial_active_projections'),'1');
    const denied=docker(['psql','-XqAt','--set=ON_ERROR_STOP=1','--set=VERBOSITY=sqlstate','-U','qa_admin','-d','postgres'],`SET ROLE vocabflow_runtime; DELETE FROM vocabflow_app.owner_editorial_projections;`);
    assert.notEqual(denied.status,0);assert(denied.stderr.includes('42501'));pass('runtime-can-read-the-view-but-cannot-delete-publication-data');
    report.status='PASS';
  }finally{
    const inspected=spawnSync('docker',['inspect','--format','{{.Id}}',NAME],{encoding:'utf8',windowsHide:true});assert.equal(inspected.stdout.trim(),id,'QA_CONTAINER_ID_CHANGED_DO_NOT_REMOVE');
    const removed=spawnSync('docker',['rm','-fv',id],{encoding:'utf8',windowsHide:true});assert.equal(removed.status,0,'QA_CONTAINER_NOT_REMOVED');
  }
  report.scratchContainerRemoved=true;writeFileSync(`${OUT}/schema-qa-r0001.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
}
main().catch(e=>{const first=String(e?.message??'').split('\n')[0];console.error(JSON.stringify({status:'SCHEMA_QA_STOPPED',code:/^[A-Z_0-9]+$/.test(first)?first:e?.code??'SAFE_FAILURE'}));process.exitCode=1;});
