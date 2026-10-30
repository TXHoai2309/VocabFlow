import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { openSql, assertPostConnectIdentity } from './db-core.ts';
import { authorizeProductionRelease, parseProductionReleaseArgs, resolveProductionConnection } from './production-release-safety.ts';
import { assertCleanReleaseSource } from './production-build.ts';
import { applyOwnerProduction, verifyOwnerProduction } from './editorial-owner-production-apply-core-v1.mjs';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const PIN='5496ccdff01d327d2d0e622c1c1e00f17f8de1352e0630fbc2f4eb59537b751c';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const hash=b=>createHash('sha256').update(b).digest('hex');
async function main(){
  const args=process.argv.slice(2),apply=args.includes('--apply');assert(args.filter(x=>x==='--apply').length<=1,'DUPLICATE_APPLY_FLAG');
  const options=parseProductionReleaseArgs(args.filter(x=>x!=='--apply'));
  const env={...parseEnv(readFileSync('.env','utf8')),VOCABFLOW_ENV:'production',DATABASE_ENV:'production',EXECUTION_CONTEXT:'local-development'};
  env.PRODUCTION_MIGRATION_DATABASE_URL=env.db_prod_mir;
  const target=authorizeProductionRelease({options,mode:apply?'mutation':'read-only',environment:env});
  const path=`${OUT}/production-plan-r0001.json`;assert.equal(hash(readFileSync(path)),PIN,'PRODUCTION_PLAN_PIN_MISMATCH');const plan=read(path),inventory=read(`${OUT}/production-inventory-r0001.json`);
  assert.equal(target.projectId,plan.target.projectId);assert.equal(target.branchId,plan.target.branchId);
  for(const ref of plan.sourcePins){const b=readFileSync(ref.path);assert.equal(b.length,ref.byteLength);assert.equal(hash(b),ref.sha256);}
  const backup=read(plan.backup.path);assert.equal(backup.restoreRehearsal,'PASS');assert.equal(hash(readFileSync(backup.path)),backup.sha256);
  const connection=await resolveProductionConnection({purpose:'migration',environment:env});const db=openSql(connection.url);
  try{
    await assertPostConnectIdentity(db,target);
    if(!apply){
      const live=await db.begin('read only',tx=>tx`SELECT id,word,enabled,content_version,source_dataset,source_record_id FROM vocabflow_app.vocabularies ORDER BY id`);
      assert.deepEqual([...live],inventory.rows.map(({id,word,enabled,content_version,source_dataset,source_record_id})=>({id,word,enabled,content_version,source_dataset,source_record_id})),'PRODUCTION_SOURCE_CHANGED_SINCE_PLAN');
      const report={status:'PRODUCTION_DRY_RUN_PASS_NO_DATABASE_WRITES',planSha256:PIN,counts:plan.counts,backupRestore:'PASS',newMediaUploaded:plan.assets.length,sourceIdentityMatches:900,remoteDatabaseWrites:0,cloudDeletes:0};
      writeFileSync(`${OUT}/dry-run.current.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));return;
    }
    const expectedSha=process.env.VOCABFLOW_RELEASE_SHA;
    const release=assertCleanReleaseSource({head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),requestedSha:expectedSha,status:execFileSync('git',['status','--porcelain','--untracked-files=all'],{encoding:'utf8'})});
    const rehearsal=read(`${OUT}/full-rehearsal-r0001.json`);assert.equal(rehearsal.status,'PASS');assert.equal(rehearsal.planSha256,PIN);
    const linked=read('.vercel/project.json');const auth=read(join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'));assert(auth.token);
    const deployed=await fetch(`https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(linked.projectId)}&target=production&limit=1&teamId=${encodeURIComponent(linked.orgId)}`,{headers:{Authorization:`Bearer ${auth.token}`}});assert(deployed.ok,'VERCEL_RELEASE_PROOF_UNAVAILABLE');const latest=(await deployed.json()).deployments?.[0];
    assert(latest?.readyState==='READY'||latest?.state==='READY','PRODUCTION_DEPLOYMENT_NOT_READY');assert.equal(latest.meta?.githubCommitSha,release,'PRODUCTION_DEPLOYMENT_SOURCE_SHA_MISMATCH');assert.equal(latest.meta?.githubCommitRef,'main','PRODUCTION_MAIN_RELEASE_REQUIRED');
    const origin='https://vocab-flow-steel.vercel.app';const before=await fetch(origin+'/api/public/learning-index',{cache:'no-store'});assert.equal(before.status,200);assert.equal(before.headers.get('x-vocabflow-catalog-mode'),'owner-production','COMPATIBLE_PRODUCTION_RUNTIME_MUST_DEPLOY_BEFORE_DATA_REPLACEMENT');
    const [projection]=await db`SELECT to_regclass('vocabflow_app.owner_editorial_projections')::text AS present`;assert(projection.present,'PRODUCTION_PUBLICATION_MIGRATION_REQUIRED');
    const applied=await db.begin('isolation level serializable',tx=>applyOwnerProduction(tx,plan,inventory,PIN));
    if(applied.status!=='ALREADY_APPLIED_NO_WRITES'){
      assert(!existsSync(`${OUT}/application-result-r0001.json`),'APPLICATION_RESULT_ALREADY_EXISTS');
      writeFileSync(`${OUT}/application-result-r0001.json`,JSON.stringify({...applied,releaseSha:release,deploymentId:latest.uid,productionOnly:true},null,2)+'\n',{flag:'wx'});
    }
    await verifyOwnerProduction(db,plan,PIN);
    const response=await fetch(origin+'/api/public/learning-index',{cache:'no-store'});assert.equal(response.status,200);const index=await response.json();assert.equal(index.catalogIdentity,plan.catalogId);assert.equal(index.vocabulary.length,1547);assert.equal(index.learningSets.length,76);assert.equal(index.topics.length,73);
    const proof={artifactType:'OWNER_PRODUCTION_LIVE_CUTOVER_VERIFICATION',status:'PASS',catalogId:plan.catalogId,releaseSha:release,deploymentId:latest.uid,origin,planSha256:PIN,words:1547,sets:76,topics:73,counts:applied.counts,oldCloudinaryAssetsDeleted:0};
    writeFileSync(`${OUT}/live-cutover.current.json`,JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
  }finally{await db.end({timeout:5});}
}
main().catch(error=>{const first=String(error?.message??'').split('\n')[0];console.error(JSON.stringify({status:'PRODUCTION_APPLY_STOPPED',code:/^[A-Z_0-9:]{3,100}$/i.test(first)?first:error?.code??'SAFE_FAILURE'}));process.exitCode=1;});
