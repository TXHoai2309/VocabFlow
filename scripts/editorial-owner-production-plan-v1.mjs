import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const LOCAL='vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001/catalog-plan-r0001.json';
const BASE='vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const sha=b=>createHash('sha256').update(b).digest('hex');
const pin=p=>({path:p,sha256:sha(readFileSync(p)),byteLength:readFileSync(p).length});
const stable=x=>Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
function save(name,x){const p=`${OUT}/${name}`,b=JSON.stringify(x,null,2)+'\n';if(existsSync(p))assert.equal(readFileSync(p,'utf8'),b,'IMMUTABLE_PRODUCTION_PLAN_CONFLICT');else writeFileSync(p,b,{flag:'wx'});}
async function main(){
  const local=read(LOCAL),inventory=read(`${OUT}/production-inventory-r0001.json`),uploads=read(`${OUT}/upload-checkpoint.current.json`),shared=read(`${OUT}/shared-media-audit-r0002.json`),backup=read(`${OUT}/backup-r0002.json`);
  assert.equal(sha(readFileSync(LOCAL)),inventory.localSourcePlan.sha256);
  assert.equal(uploads.status,'ALL_4640_ORIGINALS_UPLOADED_VERIFIED');assert.equal(Object.keys(uploads.assets).length,4640);assert.equal(Object.keys(uploads.failures).length,0);
  assert.equal(backup.restoreRehearsal,'PASS');assert.equal(sha(readFileSync(backup.path)),backup.sha256);
  const baseline=read(`${BASE}/baseline-manifest.json`);const frozenPin=baseline.files.find(x=>x.path==='local-capture.json');assert.equal(sha(readFileSync(`${BASE}/local-capture.json`)),frozenPin.byteSha256);
  const capture=read(`${BASE}/local-capture.json`);const frozen=new Map(capture.tables.vocabularies.map(x=>[x.id,x]));
  const productionBySource=new Map(inventory.rows.map(x=>[`${x.source_dataset}:${x.source_record_id}`,x]));assert.equal(productionBySource.size,inventory.rows.length);
  let nextId=Math.max(...inventory.rows.map(x=>x.id))+1;const retained=[];
  const items=local.items.map(original=>{
    const originalRow=original.retainedRuntimeId?frozen.get(original.runtimeVocabularyId):null;
    const prior=originalRow?.source_record_id!=null?productionBySource.get(`${originalRow.source_dataset}:${originalRow.source_record_id}`):undefined;
    if(prior)retained.push(prior.id);
    const content=structuredClone(original.content);const mediaEvidence=original.mediaEvidence.map(e=>{
      const asset=uploads.assets[e.asset.sha256];assert(asset?.uploadBytesAndEtagMatch);assert.equal(asset.sourceByteLength,e.asset.byteLength);
      if(e.kind==='image')content.media.image=asset.deliveryUrl;
      else if(e.kind==='wordAudio')content.media.wordAudio=asset.deliveryUrl;
      else if(e.kind==='exampleAudio'){content.media.exampleAudio=asset.deliveryUrl;assert.equal(content.examples.length,1);content.examples[0].audioUrl=asset.deliveryUrl;}
      else assert.fail('UNRECOGNIZED_MEDIA_BINDING_KIND');
      return {...e,cloudinary:asset};
    });
    return {...original,localRuntimeVocabularyId:original.runtimeVocabularyId,runtimeVocabularyId:prior?.id??nextId++,retainedRuntimeId:Boolean(prior),contentVersion:prior?prior.content_version+1:1,
      proposalKey:`owner-publication:${original.itemId}`,content,contentSha256:sha(stable(content)),mediaEvidence,
      sourceIdentityEvidence:prior?{frozenRuntimeId:originalRow.id,sourceDataset:originalRow.source_dataset,sourceRecordId:originalRow.source_record_id,productionRuntimeId:prior.id,productionPriorContentVersion:prior.content_version,productionPriorProposalKey:prior.proposal_key,productionPriorContentSha256:prior.content_sha256}:null};
  });
  assert.equal(items.length,1547);assert.equal(retained.length,900);assert.equal(new Set(items.map(x=>x.runtimeVocabularyId)).size,1547);
  const wanted=new Set(items.map(x=>x.runtimeVocabularyId));const retired=inventory.rows.filter(x=>!wanted.has(x.id)).map(x=>x.id);assert.equal(retired.length,6411);
  const samples=items.filter((x,i)=>i===0||i===546||i===547||i===1046||i===1047||i===1546);
  for(const item of samples)for(const e of item.mediaEvidence){const r=await fetch(e.cloudinary.originalUrl,{signal:AbortSignal.timeout(30000)});assert.equal(r.status,200);const b=new Uint8Array(await r.arrayBuffer());assert.equal(b.length,e.asset.byteLength);assert.equal(sha(b),e.asset.sha256);}
  const plan={artifactType:'OWNER_PRODUCTION_CATALOG_REPLACEMENT_PLAN',revision:'r0001',status:'PREPARED_NOT_APPLIED',catalogId:'owner-production-1547-20261030-r0001',sourceDataset:'VOCABFLOW_OWNER_EDITORIAL',
    ownerInstruction:'giờ thay cho tôi đi, xóa cả bên phía cloudiary nhé, ưu tiên làm ở prod trc, dev để sau',target:inventory.target,
    sourcePins:[pin(LOCAL),pin(`${OUT}/production-inventory-r0001.json`),pin(`${OUT}/shared-media-audit-r0002.json`),pin(`${BASE}/local-capture.json`),...local.sourcePins],backup:pin(`${OUT}/backup-r0002.json`),
    counts:{selectedWords:1547,retainedRuntimeIds:900,newRuntimeIds:647,retiredRows:6411,topics:73,learningSets:76,uniqueMedia:4640,imageSlots:1547,wordAudioSlots:1547,exampleAudioSlots:1547},
    levels:local.levels,retainedRuntimeIds:retained.sort((a,b)=>a-b),retiredRuntimeIds:retired.sort((a,b)=>a-b),groups:local.groups,items,
    assets:Object.values(uploads.assets).sort((a,b)=>a.sourceSha256.localeCompare(b.sourceSha256)),ownerSelection:local.ownerSelection,textSourceNotices:local.textSourceNotices,
    runtimeMode:'owner-production',compatibilityBeforeCutover:'Existing V2 rows remain readable through the additive compatibility view until the atomic owner-catalog apply.',
    protections:['auth/account/household/learner/settings','retained-source-identity progress','protected metadata and migration history','unrelated Cloudinary resources','shared Development media pending its later cutover'],
    cloudinaryRetirement:{sharedProtectedCount:shared.shared.length,unrelatedProtectedCount:shared.unrelatedProtectedAssets,productionExclusiveCount:shared.productionExclusive.length,
      candidatesAfterNewProductionVerified:shared.notReferencedByCurrentProdOrDev,candidateCount:shared.notReferencedByCurrentProdOrDev.length,requiresFreshReferencesAndVerifiedOriginalBackup:true},
    mediaVerification:{all4640UploadBytesAndOriginalMd5Match:true,originalSourceSha256Retained:true,liveOriginalGetHashChecks:18,imagesUseOptimizedHttpsDelivery:true},
    canonicalMasterIdentityAssigned:false,independentMasterPassClaimed:false,remoteDatabaseWrites:0,oldCloudinaryDeletes:0};
  save('production-plan-r0001.json',plan);
  console.log(JSON.stringify({status:'PRODUCTION_PLAN_READY_NOT_APPLIED',counts:plan.counts,retirement:plan.cloudinaryRetirement.candidateCount,sharedProtected:plan.cloudinaryRetirement.sharedProtectedCount,plan:pin(`${OUT}/production-plan-r0001.json`)}));
}
main().catch(e=>{const first=String(e?.message??'').split('\n')[0];console.error(JSON.stringify({status:'PRODUCTION_PLAN_STOPPED',code:/^[A-Z_0-9:]{3,90}$/.test(first)?first:e?.code??'SAFE_FAILURE'}));process.exitCode=1;});
