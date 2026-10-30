import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { openSql, assertPostConnectIdentity } from './db-core.ts';
import { getConnectionTarget } from '../config/database-targets.ts';
import { createNeonApiClient, verifyNeonTarget } from './neon-target-verifier.ts';
import { parseConnectionFingerprint } from './runtime-validation.ts';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const read=p=>JSON.parse(readFileSync(p,'utf8'));const env=parseEnv(readFileSync('.env','utf8'));
async function main(){
  const target=getConnectionTarget('development','migration');const u=env.DATABASE_MIGRATION_URL;
  const fp=parseConnectionFingerprint(u,target.roleName);const verified=await verifyNeonTarget({expected:target,configuredConnection:fp,neonApiClient:createNeonApiClient(env.NEON_API_KEY)});assert(verified.ok,'DEVELOPMENT_READ_ONLY_IDENTITY_MISMATCH');
  const sql=openSql(u);let rows;
  try{rows=await sql.begin('read only',async tx=>{await assertPostConnectIdentity(tx,target);return tx`SELECT v.image_url,v.audio_url,md.examples,md.development_media FROM vocabflow_app.vocabularies v LEFT JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id=v.id`;});}finally{await sql.end({timeout:5});}
  const urls=new Set();const collect=v=>{if(typeof v==='string'&&v.startsWith('https://res.cloudinary.com/'))urls.add(v);else if(Array.isArray(v))v.forEach(collect);else if(v&&typeof v==='object')Object.values(v).forEach(collect);};rows.forEach(collect);
  const all=read(`${OUT}/cloudinary-inventory-r0001.json`).resources;
  const old=all.filter(x=>x.public_id.startsWith('Vocab/v2/')||/^vocabflow\/(images|audio)\/content-v1\//.test(x.public_id));
  const key=x=>`${x.resource_type}:${x.type}:${x.public_id}`;
  const tails=new Map();for(const r of old){tails.set(`${r.resource_type}:${r.type}:${r.public_id}`,key(r));if(r.format)tails.set(`${r.resource_type}:${r.type}:${r.public_id}.${r.format}`,key(r));}
  function keys(values){const found=new Set();let unmatched=0,legacyMalformedUrlsMapped=0;for(const value of values){const u=new URL(value);const parts=decodeURIComponent(u.pathname).split('/');if(parts[1]!==env.CLOUDINARY_CLOUD_NAME){unmatched++;continue;}const at=parts.findIndex((x,i)=>i>=4&&(x==='Vocab'||x==='vocabflow'));const tail=parts.slice(at).join('/');let match=tails.get(`${parts[2]}:${parts[3]}:${tail}`);
    // Legacy raw-image URLs accidentally repeated the file extension. Protect
    // the unique underlying resource too; do not mistake it for unused media.
    const repeated=tail.match(/(\.[a-z0-9]+)\1$/i);if(!match&&parts[2]==='raw'&&repeated){match=tails.get(`${parts[2]}:${parts[3]}:${tail.slice(0,-repeated[1].length)}`);if(match)legacyMalformedUrlsMapped++;}
    if(match)found.add(match);else unmatched++;}return{found,unmatched,legacyMalformedUrlsMapped};}
  const prod=keys(read(`${OUT}/production-inventory-r0001.json`).uniqueCloudinaryUrls);const dev=keys(urls);
  const shared=[...prod.found].filter(x=>dev.found.has(x)).sort();const exclusive=[...prod.found].filter(x=>!dev.found.has(x)).sort();
  const report={artifactType:'OWNER_PRODUCTION_DEVELOPMENT_SHARED_MEDIA_AUDIT',productionWrites:0,developmentWrites:0,totalCloudinary:all.length,oldVocabAssets:old.length,unrelatedProtectedAssets:all.length-old.length,
    productionReferenced:[...prod.found].sort(),developmentReferenced:[...dev.found].sort(),shared,productionExclusive:exclusive,notReferencedByCurrentProdOrDev:old.map(key).filter(x=>!prod.found.has(x)&&!dev.found.has(x)).sort(),unmatchedProductionUrls:prod.unmatched,unmatchedDevelopmentUrls:dev.unmatched,
    legacyMalformedUrlsMapped:{production:prod.legacyMalformedUrlsMapped,development:dev.legacyMalformedUrlsMapped},
    retirementPolicy:'Never delete new or unrelated assets. Defer shared development assets until its catalog is replaced, unless owner explicitly accepts that temporary breakage.'};
  writeFileSync(`${OUT}/shared-media-audit-r0002.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({oldVocabAssets:old.length,unrelatedProtected:report.unrelatedProtectedAssets,productionReferenced:prod.found.size,developmentReferenced:dev.found.size,shared:shared.length,productionExclusive:exclusive.length,notReferencedByCurrentProdOrDev:report.notReferencedByCurrentProdOrDev.length,unmatchedProduction:prod.unmatched,unmatchedDevelopment:dev.unmatched,developmentWrites:0}));
}
main().catch(e=>{console.error(JSON.stringify({status:'SHARED_MEDIA_AUDIT_FAILED',code:e?.code??'SAFE_FAILURE'}));process.exitCode=1;});
