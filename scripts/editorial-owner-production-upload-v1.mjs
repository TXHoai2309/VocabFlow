import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { v2 as cloudinary } from 'cloudinary';

const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const SOURCE='vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001/catalog-plan-r0001.json';
const ROOT='vocabflow/owner/production-1547-20261030-r0001';
const read=p=>JSON.parse(readFileSync(p,'utf8'));
const digest=(b,type='sha256')=>createHash(type).update(b).digest('hex');
const env=parseEnv(readFileSync('.env','utf8'));
cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
const args=process.argv.slice(2);assert(args.every(x=>['--apply','--canary'].includes(x)), 'UNKNOWN_UPLOAD_ARGUMENT');
const apply=args.includes('--apply');const canary=args.includes('--canary');
const save=(p,obj)=>{const tmp=p+'.tmp';writeFileSync(tmp,JSON.stringify(obj,null,2)+'\n');renameSync(tmp,p);};
async function main(){
  mkdirSync(OUT,{recursive:true});
  const inventory=read(`${OUT}/production-inventory-r0001.json`);assert(inventory.providerVerified&&inventory.mutations===0);
  const plan=read(SOURCE);assert.equal(digest(readFileSync(SOURCE)),inventory.localSourcePlan.sha256);
  const assets=plan.assets.map(a=>({...a,resourceType:a.mimeType==='image/png'?'image':'video',publicId:`${ROOT}/${a.mimeType==='image/png'?'images':'audio'}/${a.sha256}`}));
  assert.equal(assets.length,4640);assert.equal(new Set(assets.map(x=>x.publicId)).size,4640);
  const checkpointPath=`${OUT}/upload-checkpoint.current.json`;
  const cp=existsSync(checkpointPath)?read(checkpointPath):{artifactType:'OWNER_PRODUCTION_CLOUDINARY_UPLOAD_CHECKPOINT',sourcePlanSha256:inventory.localSourcePlan.sha256,root:ROOT,status:'PREPARED',assets:{},failures:{},oldAssetsDeleted:0};
  assert.equal(cp.sourcePlanSha256,inventory.localSourcePlan.sha256);assert.equal(cp.root,ROOT);
  if(!apply){console.log(JSON.stringify({status:'DRY_RUN',files:assets.length,bytes:assets.reduce((n,x)=>n+x.byteLength,0),imageMaxBytes:Math.max(...assets.filter(x=>x.resourceType==='image').map(x=>x.byteLength)),oldAssetsDeleted:0}));return;}
  const largest=assets.filter(x=>x.resourceType==='image').sort((a,b)=>b.byteLength-a.byteLength)[0];
  const wanted=canary?[largest,...assets.filter(x=>x!==largest).slice(0,11)]:assets;
  let next=0,completed=0;
  console.log(JSON.stringify({status:'UPLOADING',files:wanted.length,alreadyRecorded:Object.keys(cp.assets).length,concurrency:6}));
  await Promise.all(Array.from({length:6},async()=>{
    while(next<wanted.length){const asset=wanted[next++];
      try{
        const bytes=readFileSync(asset.repoRelativePath);assert.equal(bytes.length,asset.byteLength);assert.equal(digest(bytes),asset.sha256);
        if(cp.assets[asset.sha256]){assert.equal(cp.assets[asset.sha256].publicId,asset.publicId);completed++;continue;}
        let uploaded;
        for(let attempt=1;attempt<=3;attempt++){
          try{uploaded=await cloudinary.uploader.upload(asset.repoRelativePath,{resource_type:asset.resourceType,type:'upload',public_id:asset.publicId,overwrite:false,unique_filename:false,use_filename:false,
            tags:['vocabflow-owner-publication','owner-production-1547-20261030-r0001'],context:{source_sha256:asset.sha256},timeout:120000});break;}
          catch(error){if(attempt===3||![408,420,429,500,502,503,504].includes(error?.http_code))throw error;await new Promise(r=>setTimeout(r,attempt*1500));}
        }
        if(uploaded.existing){uploaded=await cloudinary.api.resource(asset.publicId,{resource_type:asset.resourceType,type:'upload',context:true});}
        assert.equal(uploaded.public_id,asset.publicId);assert.equal(uploaded.bytes,asset.byteLength);
        assert.equal(uploaded.etag,digest(bytes,'md5'),'CLOUDINARY_ORIGINAL_ETAG_MISMATCH');
        assert.equal(new URL(uploaded.secure_url).protocol,'https:');assert.equal(new URL(uploaded.secure_url).hostname,'res.cloudinary.com');
        cp.assets[asset.sha256]={sourceSha256:asset.sha256,sourceByteLength:asset.byteLength,sourcePath:asset.repoRelativePath,publicId:asset.publicId,resourceType:asset.resourceType,deliveryType:'upload',assetId:uploaded.asset_id,version:uploaded.version,format:uploaded.format,etag:uploaded.etag,
          originalUrl:uploaded.secure_url,deliveryUrl:asset.resourceType==='image'?cloudinary.url(asset.publicId,{resource_type:'image',type:'upload',version:uploaded.version,format:uploaded.format,secure:true,width:960,crop:'limit',quality:'auto',fetch_format:'auto'}):uploaded.secure_url,
          uploadBytesAndEtagMatch:true};delete cp.failures[asset.sha256];
      }catch(error){cp.failures[asset.sha256]={code:/^[A-Z_0-9]{3,90}$/.test(error?.message??'')?error.message:'UPLOAD_OR_VERIFICATION_FAILED',httpCode:error?.http_code??null};}
      completed++;cp.status='UPLOADING';save(checkpointPath,cp);
      if(completed%64===0)console.log(JSON.stringify({completed,recorded:Object.keys(cp.assets).length,failures:Object.keys(cp.failures).length}));
    }
  }));
  cp.status=Object.keys(cp.assets).length===4640&&Object.keys(cp.failures).length===0?'ALL_4640_ORIGINALS_UPLOADED_VERIFIED':canary?'CANARY_FINISHED':'PARTIAL_WITH_FAILURES';save(checkpointPath,cp);
  console.log(JSON.stringify({status:cp.status,uploaded:Object.keys(cp.assets).length,failures:Object.keys(cp.failures).length,oldAssetsDeleted:0}));
  if(Object.keys(cp.failures).length)process.exitCode=1;
}
main().catch(e=>{console.error(JSON.stringify({status:'UPLOAD_STOPPED',code:/^[A-Z_0-9]{3,90}$/.test(e?.message??'')?e.message:'SAFE_FAILURE'}));process.exitCode=1;});
