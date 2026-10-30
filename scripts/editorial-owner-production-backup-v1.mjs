import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import { openSql, assertPostConnectIdentity } from './db-core.ts';
import { resolveProductionConnection } from './production-release-safety.ts';

const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const BACKUP_CONTAINER='vocabflow-us65-postgres18-rehearsal';
const env={...parseEnv(readFileSync('.env','utf8')),VOCABFLOW_ENV:'production',DATABASE_ENV:'production',EXECUTION_CONTEXT:'local-development'};
env.PRODUCTION_MIGRATION_DATABASE_URL=env.db_prod_mir;
const sha=b=>createHash('sha256').update(b).digest('hex');
const docker=(args,options={})=>spawnSync('docker',['exec',...(options.input?['-i']:[]),BACKUP_CONTAINER,...args],{encoding:'utf8',windowsHide:true,maxBuffer:16*1024*1024,...options});
async function backup(){
  const path=`${OUT}/before-production-r0002.dump`;const reportPath=`${OUT}/backup-r0002.json`;
  if(existsSync(reportPath)){const old=JSON.parse(readFileSync(reportPath));assert.equal(sha(readFileSync(path)),old.sha256);assert.equal(old.restoreRehearsal,'PASS');console.log('PRODUCTION_BACKUP_ALREADY_VERIFIED');return;}
  assert(!existsSync(path),'INTERRUPTED_BACKUP_REQUIRES_INSPECTION');
  const connection=await resolveProductionConnection({purpose:'migration',environment:env});
  const sql=openSql(connection.url);let before,dump;
  try{
    await sql.begin('isolation level repeatable read read only',async tx=>{
      await tx`SET LOCAL TIME ZONE 'UTC'`;
      await assertPostConnectIdentity(tx,connection.target);
      const tables=await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' ORDER BY tablename`;
      const fingerprints={};
      for(const {tablename} of tables){assert(/^[a-z_0-9]+$/.test(tablename));const [r]=await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${tablename}" t`);fingerprints[tablename]=r;}
      const history=await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`;
      const [snapshot]=await tx`SELECT pg_export_snapshot() AS snapshot`;
      console.log(JSON.stringify({phase:'EXPORTED_SNAPSHOT',identifierShape:String(snapshot.snapshot).replace(/[a-f0-9]/gi,'X').slice(0,80)}));
      assert(/^[a-z0-9:_-]+$/i.test(snapshot.snapshot),'PRODUCTION_SNAPSHOT_ID_FORMAT_INVALID');
      before={artifactType:'PRODUCTION_PRIVATE_BACKUP_SNAPSHOT',target:{projectId:connection.target.projectId,branchId:connection.target.branchId,databaseName:connection.target.databaseName},fingerprints,history};
      const u=new URL(connection.url);const backupEnv={...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:decodeURIComponent(u.pathname.slice(1)),PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password),PGSSLMODE:'require',PGCONNECT_TIMEOUT:'20'};
      const forwarded=['PGHOST','PGPORT','PGDATABASE','PGUSER','PGPASSWORD','PGSSLMODE','PGCONNECT_TIMEOUT'].flatMap(k=>['--env',k]);
      dump=spawnSync('docker',['exec',...forwarded,BACKUP_CONTAINER,'pg_dump','-w','-Fc','--no-owner','--no-privileges','--schema=vocabflow_app','--schema=vocabflow_meta','--schema=drizzle',`--snapshot=${snapshot.snapshot}`],{env:backupEnv,encoding:null,windowsHide:true,maxBuffer:256*1024*1024,timeout:180000});
      if(dump.status!==0){let diagnostic=String(dump.stderr??'');for(const value of [connection.url,u.password,decodeURIComponent(u.password)])if(value)diagnostic=diagnostic.replaceAll(value,'[REDACTED]');writeFileSync(`${OUT}/backup-diagnostic.private.log`,diagnostic);}
      assert.equal(dump.status,0,'PRODUCTION_PGDUMP_FAILED');
      console.log(JSON.stringify({phase:'DUMP_RETURNED',byteLength:dump.stdout.length,prefixHex:dump.stdout.subarray(0,8).toString('hex')}));
      assert.equal(dump.stdout.subarray(0,5).toString(),'PGDMP','PRODUCTION_DUMP_HEADER_INVALID');
    });
  }finally{await sql.end({timeout:5});}
  writeFileSync(path,dump.stdout,{flag:'wx'});writeFileSync(`${OUT}/backup-before-r0002.json`,JSON.stringify(before,null,2)+'\n',{flag:'wx'});
  const scratch='vocabflow_us65_restore_rehearsal_20261030';
  const created=docker(['createdb','-U','vocabflow_local_admin','-O','vocabflow_local_admin',scratch]);
  assert.equal(created.status,0,'SCRATCH_CREATE_FAILED_DO_NOT_DROP_UNKNOWN_DATABASE');let verified=false;
  try{
    const restored=docker(['pg_restore','--exit-on-error','--no-owner','--no-privileges','-U','vocabflow_local_admin','-d',scratch],{input:dump.stdout});
    assert.equal(restored.status,0,'PRODUCTION_BACKUP_RESTORE_FAILED');
    for(const [table,expected] of Object.entries(before.fingerprints)){
      const statement=`SET TIME ZONE 'UTC'; SELECT json_build_object('count',count(*)::int,'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex')) FROM vocabflow_app."${table}" t`;
      const check=docker(['psql','-U','vocabflow_local_admin','-d',scratch,'-qAt','-c',statement]);assert.equal(check.status,0,'RESTORE_FINGERPRINT_QUERY_FAILED');assert.deepEqual(JSON.parse(check.stdout.trim()),expected,`RESTORE_MISMATCH:${table}`);
    }verified=true;
  }finally{const removed=docker(['dropdb','-U','vocabflow_local_admin',scratch]);assert.equal(removed.status,0,'SCRATCH_DATABASE_NOT_REMOVED');}
  assert(verified);
  const report={artifactType:'PRODUCTION_PRIVATE_BACKUP_INDEX',revision:'r0002',path,sha256:sha(dump.stdout),byteLength:dump.stdout.length,privateAccountBackup:true,restoreRehearsal:'PASS',fingerprintOrder:'UTF8_JSONB_TEXT_COLLATE_C_UTC',tableFingerprintsRestored:Object.keys(before.fingerprints).length,sameExportedSnapshot:true,scratchDatabaseRemoved:true,productionRestoreExecuted:false,productionWrites:0};
  writeFileSync(reportPath,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:'PRODUCTION_BACKUP_RESTORE_PASS',bytes:report.byteLength,verifiedTables:report.tableFingerprintsRestored,productionWrites:0}));
}
async function main(){
  if(existsSync(`${OUT}/backup-r0002.json`)){await backup();return;}
  const created=spawnSync('docker',['run','-d','--name',BACKUP_CONTAINER,'--label','vocabflow.us65.backup=true','--env','POSTGRES_PASSWORD','--env','POSTGRES_USER=vocabflow_local_admin','postgres@sha256:979bccfde35445db618c65107d27d08c6c21339d8dc3ad4c830c6633947be0e4'],{env:{...process.env,POSTGRES_PASSWORD:randomBytes(32).toString('hex')},encoding:'utf8',windowsHide:true});
  assert.equal(created.status,0,'BACKUP_CONTAINER_CREATE_FAILED_DO_NOT_REMOVE_UNKNOWN_CONTAINER');const id=created.stdout.trim();assert(/^[a-f0-9]{64}$/.test(id));
  try{
    let ready=false;for(let attempt=0;attempt<45;attempt++){if(docker(['pg_isready','-U','vocabflow_local_admin']).status===0){ready=true;break;}await new Promise(r=>setTimeout(r,1000));}assert(ready,'POSTGRES18_BACKUP_CONTAINER_NOT_READY');await backup();
  }finally{
    const current=spawnSync('docker',['inspect','--format','{{.Id}}',BACKUP_CONTAINER],{encoding:'utf8',windowsHide:true});assert.equal(current.stdout.trim(),id,'BACKUP_CONTAINER_ID_CHANGED_DO_NOT_REMOVE');
    const removed=spawnSync('docker',['rm','-fv',id],{encoding:'utf8',windowsHide:true});assert.equal(removed.status,0,'BACKUP_CONTAINER_NOT_REMOVED');
  }
}
main().catch(error=>{const first=String(error?.message??'').split('\n')[0];console.error(JSON.stringify({status:'BACKUP_STOPPED',code:/^[A-Z_0-9:]{3,90}$/i.test(first)?first:(error?.code??'SAFE_FAILURE')}));process.exitCode=1;});
