import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { v2 as cloudinary } from 'cloudinary';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const hash=(b,k='sha256')=>createHash(k).update(b).digest('hex');
async function main(){
  const env=parseEnv(readFileSync('.env','utf8'));cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
  const audit=read(`${OUT}/shared-media-audit-r0002.json`);assert.equal(audit.unmatchedProductionUrls,0);assert.equal(audit.unmatchedDevelopmentUrls,0);
  const ids=new Set(audit.notReferencedByCurrentProdOrDev);assert.equal(ids.size,9168);
  const resources=read(`${OUT}/cloudinary-inventory-r0001.json`).resources.filter(r=>ids.has(`${r.resource_type}:${r.type}:${r.public_id}`));assert.equal(resources.length,ids.size);
  mkdirSync(`${OUT}/old-media-assets`,{recursive:true});const journal=`${OUT}/old-media-backup-journal.jsonl`;
  const completed=new Map(existsSync(journal)?readFileSync(journal,'utf8').trim().split('\n').filter(Boolean).map(x=>{const r=JSON.parse(x);return[r.assetId,r];}):[]);
  let next=0,done=0;const failures=[];const wanted=process.argv.includes('--canary')?resources.slice(0,8):resources;
  console.log(JSON.stringify({status:'BACKING_UP_OLD_MEDIA',files:wanted.length,bytes:resources.reduce((n,x)=>n+x.bytes,0),alreadyRecorded:completed.size,cloudDeletes:0}));
  await Promise.all(Array.from({length:8},async()=>{
    while(next<wanted.length){const resource=wanted[next++];
      try{
        const prior=completed.get(resource.asset_id);if(prior){assert.equal(prior.sourceEtag,resource.etag??null);assert.equal(prior.sourceVersion,resource.version);assert.equal(hash(readFileSync(prior.path)),prior.sha256);done++;continue;}
        assert(/^[a-f0-9]{32}$/.test(resource.asset_id));
        const url=cloudinary.url(resource.public_id,{resource_type:resource.resource_type,type:resource.type,secure:true,sign_url:resource.type!=='upload',version:resource.version,...(resource.resource_type!=='raw'&&resource.format?{format:resource.format}:{})});
        const u=new URL(url);assert.equal(u.protocol,'https:');assert.equal(u.hostname,'res.cloudinary.com');
        let bytes,responseEtag;
        for(let attempt=1;attempt<=3;attempt++){
          try{const r=await fetch(url,{signal:AbortSignal.timeout(45000)});assert.equal(r.status,200,'OLD_MEDIA_FETCH_FAILED');responseEtag=(r.headers.get('etag')??'').replace(/^W\//,'').replaceAll('"','');bytes=new Uint8Array(await r.arrayBuffer());break;}
          catch(error){if(attempt===3)throw error;await new Promise(r=>setTimeout(r,attempt*1000));}
        }
        assert.equal(bytes.length,resource.bytes,'OLD_MEDIA_LENGTH_MISMATCH');assert(/^[a-f0-9]{32}$/.test(responseEtag),'OLD_MEDIA_STRONG_ETAG_REQUIRED');assert.equal(hash(bytes,'md5'),responseEtag,'OLD_MEDIA_RESPONSE_ETAG_MISMATCH');
        if(resource.etag)assert.equal(responseEtag,resource.etag,'OLD_MEDIA_INVENTORY_ETAG_MISMATCH');
        const sha256=hash(bytes);const ext=/^[a-z0-9]{1,8}$/i.test(resource.format??'')?resource.format:'bin';const path=`${OUT}/old-media-assets/${sha256}.${ext}`;
        try{writeFileSync(path,bytes,{flag:'wx'});}catch(error){if(error.code!=='EEXIST')throw error;assert.equal(hash(readFileSync(path)),sha256);}
        const receipt={assetId:resource.asset_id,publicId:resource.public_id,resourceType:resource.resource_type,deliveryType:resource.type,sourceVersion:resource.version,sourceEtag:resource.etag??null,responseEtag,sha256,byteLength:bytes.length,path};
        appendFileSync(journal,JSON.stringify(receipt)+'\n');completed.set(resource.asset_id,receipt);
      }catch(error){const first=String(error?.message??'').split('\n')[0];failures.push({assetId:resource.asset_id,code:/^[A-Z_0-9]+$/.test(first)?first:error?.code??'SAFE_FAILURE'});}
      done++;if(done%128===0)console.log(JSON.stringify({processed:done,backedUp:completed.size,failures:failures.length}));
    }
  }));
  const report={artifactType:'OWNER_PRODUCTION_OLD_MEDIA_BACKUP',status:completed.size===9168&&failures.length===0?'ALL_9168_RETIREMENT_CANDIDATES_BACKED_UP':'PARTIAL',expected:9168,backedUp:completed.size,failures,originalLengthAndResponseEtagVerified:completed.size===wanted.length&&failures.length===0,journalPath:journal,cloudDeletes:0,sharedAssetsDeleted:0,unrelatedAssetsDeleted:0};
  writeFileSync(`${OUT}/old-media-backup.current.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(failures.length)process.exitCode=1;
}
main().catch(e=>{const first=String(e?.message??'').split('\n')[0];console.error(JSON.stringify({status:'OLD_MEDIA_BACKUP_STOPPED',code:/^[A-Z_0-9]+$/.test(first)?first:e?.code??'SAFE_FAILURE'}));process.exitCode=1;});
