import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { v2 as cloudinary } from 'cloudinary';
import { openSql, assertPostConnectIdentity } from './db-core.ts';
import { resolveProductionConnection } from './production-release-safety.ts';
import { getConnectionTarget } from '../config/database-targets.ts';
import { verifyNeonTarget, createNeonApiClient } from './neon-target-verifier.ts';
import { parseConnectionFingerprint } from './runtime-validation.ts';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const hash=b=>createHash('sha256').update(b).digest('hex');
const save=(p,x)=>{writeFileSync(p+'.tmp',JSON.stringify(x,null,2)+'\n');renameSync(p+'.tmp',p);};
const key=r=>`${r.resource_type}:${r.type}:${r.public_id}`;
async function main(){
  const apply=process.argv.includes('--apply');assert(process.argv.slice(2).every(x=>x==='--apply'),'UNKNOWN_RETIREMENT_ARGUMENT');
  const env={...parseEnv(readFileSync('.env','utf8')),VOCABFLOW_ENV:'production',DATABASE_ENV:'production',EXECUTION_CONTEXT:'local-development'};env.PRODUCTION_MIGRATION_DATABASE_URL=env.db_prod_mir;
  const audit=read(`${OUT}/shared-media-audit-r0002.json`),backup=read(`${OUT}/old-media-backup.current.json`),plan=read(`${OUT}/production-plan-r0001.json`);
  assert.equal(backup.status,'ALL_9168_RETIREMENT_CANDIDATES_BACKED_UP');assert.equal(audit.notReferencedByCurrentProdOrDev.length,9168);
  const resources=read(`${OUT}/cloudinary-inventory-r0001.json`).resources;const byKey=new Map(resources.map(x=>[key(x),x]));
  const receipts=new Map(readFileSync(backup.journalPath,'utf8').trim().split('\n').map(x=>JSON.parse(x)).map(x=>[x.assetId,x]));
  const candidates=audit.notReferencedByCurrentProdOrDev.map(k=>byKey.get(k));assert(candidates.every(Boolean));
  for(const r of candidates){assert(r.public_id.startsWith('Vocab/v2/')||/^vocabflow\/(images|audio)\/content-v1\//.test(r.public_id));assert(!r.public_id.includes('/owner/'));const receipt=receipts.get(r.asset_id);assert(receipt&&receipt.sourceVersion===r.version);const b=readFileSync(receipt.path);assert.equal(b.length,r.bytes);assert.equal(hash(b),receipt.sha256);}
  const summary={artifactType:'OWNER_PRODUCTION_CLOUDINARY_RETIREMENT',status:apply?'REQUESTED':'DRY_RUN_NO_DELETES',catalogId:plan.catalogId,candidates:9168,sharedDevelopmentProtected:audit.shared.length,unrelatedProtected:audit.unrelatedProtectedAssets,originalBackupsVerified:9168,deleted:0,missingAlreadyDeleted:0};
  if(!apply){save(`${OUT}/cloud-retirement-dry-run.current.json`,summary);console.log(JSON.stringify(summary));return;}
  const cutover=read(`${OUT}/live-cutover.current.json`);assert.equal(cutover.status,'PASS');assert.equal(cutover.catalogId,plan.catalogId);
  const live=await fetch(cutover.origin+'/api/public/learning-index',{cache:'no-store'});assert.equal(live.status,200);const index=await live.json();assert.equal(index.catalogIdentity,plan.catalogId);assert.equal(index.vocabulary.length,1547);
  const canonical=await resolveProductionConnection({purpose:'migration',environment:env});const devTarget=getConnectionTarget('development','migration');
  const fingerprint=parseConnectionFingerprint(env.DATABASE_MIGRATION_URL,devTarget.roleName);const verified=await verifyNeonTarget({expected:devTarget,configuredConnection:fingerprint,neonApiClient:createNeonApiClient(env.NEON_API_KEY)});assert(verified.ok,'DEVELOPMENT_REFERENCE_IDENTITY_MISMATCH');
  const references=new Set();const collect=v=>{if(typeof v==='string'&&v.startsWith('https://res.cloudinary.com/'))references.add(v);else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.values(v).forEach(collect);};
  for(const [url,target,projection]of [[canonical.url,canonical.target,'owner_editorial_projections'],[env.DATABASE_MIGRATION_URL,devTarget,'master_v2_development_projections']]){
    const db=openSql(url);try{await db.begin('read only',async tx=>{await assertPostConnectIdentity(tx,target);const rows=await tx.unsafe(`SELECT v.image_url,v.audio_url,p.examples,p.development_media FROM vocabflow_app.vocabularies v LEFT JOIN vocabflow_app.${projection} p ON p.vocabulary_id=v.id`);rows.forEach(collect);});}finally{await db.end({timeout:5});}
  }
  const tails=new Map();for(const r of resources){tails.set(`${r.resource_type}:${r.type}:${r.public_id}`,key(r));if(r.format)tails.set(`${r.resource_type}:${r.type}:${r.public_id}.${r.format}`,key(r));}
  const protectedNow=new Set();
  for(const value of references){const u=new URL(value);const parts=decodeURIComponent(u.pathname).split('/');if(parts[1]!==env.CLOUDINARY_CLOUD_NAME)continue;const at=parts.findIndex((x,i)=>i>=4&&(x==='Vocab'||x==='vocabflow'));if(at<0)continue;let tail=parts.slice(at).join('/');let match=tails.get(`${parts[2]}:${parts[3]}:${tail}`);const repeated=tail.match(/(\.[a-z0-9]+)\1$/i);if(!match&&parts[2]==='raw'&&repeated){tail=tail.slice(0,-repeated[1].length);match=tails.get(`${parts[2]}:${parts[3]}:${tail}`);}if(match)protectedNow.add(match);}
  assert(candidates.every(x=>!protectedNow.has(key(x))),'RETIREMENT_CANDIDATE_REFERENCED_BY_CURRENT_DATABASE');
  cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
  const journalPath=`${OUT}/cloud-retirement-checkpoint.current.json`;const journal=existsSync(journalPath)?read(journalPath):{catalogId:plan.catalogId,deleted:{},missing:{},protectedShared:audit.shared.length,protectedUnrelated:audit.unrelatedProtectedAssets};assert.equal(journal.catalogId,plan.catalogId);
  const groups=new Map();for(const r of candidates){if(journal.deleted[r.asset_id]||journal.missing[r.asset_id])continue;const group=r.resource_type+':'+r.type;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(r);}
  for(const group of groups.values())for(let n=0;n<group.length;n+=100){
    const batch=group.slice(n,n+100),resource_type=batch[0].resource_type,type=batch[0].type;
    const current=await cloudinary.api.resources_by_ids(batch.map(x=>x.public_id),{resource_type,type});const currentById=new Map(current.resources.map(x=>[x.public_id,x]));
    const selected=[];for(const r of batch){const now=currentById.get(r.public_id);if(!now){journal.missing[r.asset_id]=r.public_id;continue;}assert.equal(now.asset_id,r.asset_id,'CLOUDINARY_ASSET_ID_CHANGED');assert.equal(now.version,r.version,'CLOUDINARY_VERSION_CHANGED');assert.equal(now.bytes,r.bytes,'CLOUDINARY_BYTE_LENGTH_CHANGED');selected.push(r);}
    if(selected.length){const result=await cloudinary.api.delete_resources(selected.map(x=>x.public_id),{resource_type,type,invalidate:true,keep_original:false});for(const r of selected){assert.equal(result.deleted?.[r.public_id],'deleted','CLOUDINARY_DELETE_NOT_CONFIRMED');journal.deleted[r.asset_id]={publicId:r.public_id,version:r.version,backup:receipts.get(r.asset_id).path};}}
    save(journalPath,journal);console.log(JSON.stringify({deleted:Object.keys(journal.deleted).length,missing:Object.keys(journal.missing).length,sharedProtected:audit.shared.length}));
  }
  const report={...summary,status:'COMPLETED_PRODUCTION_UNREFERENCED_RETIREMENT',deleted:Object.keys(journal.deleted).length,missingAlreadyDeleted:Object.keys(journal.missing).length,freshProductionAndDevelopmentReferenceChecks:true,backupsRetained:true,sharedAssetsDeleted:0,unrelatedAssetsDeleted:0,newAssetsDeleted:0};
  assert.equal(report.deleted+report.missingAlreadyDeleted,9168);save(`${OUT}/cloud-retirement-result-r0001.json`,report);console.log(JSON.stringify(report));
}
main().catch(e=>{const first=String(e?.message??'').split('\n')[0];console.error(JSON.stringify({status:'CLOUD_RETIREMENT_STOPPED',code:/^[A-Z_0-9:]{3,100}$/i.test(first)?first:e?.code??'SAFE_FAILURE',httpCode:e?.http_code}));process.exitCode=1;});
