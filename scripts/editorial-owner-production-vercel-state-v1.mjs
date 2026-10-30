import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const OUT='.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
async function main(){
  const linked=JSON.parse(readFileSync('.vercel/project.json','utf8'));
  const auth=JSON.parse(readFileSync(join(process.env.APPDATA,'com.vercel.cli/Data/auth.json'),'utf8'));assert(auth.token);
  async function get(path){const r=await fetch(`https://api.vercel.com${path}${path.includes('?')?'&':'?'}teamId=${encodeURIComponent(linked.orgId)}`,{headers:{Authorization:`Bearer ${auth.token}`}});assert(r.ok,`VERCEL_READ_${r.status}`);return r.json();}
  const [project,deployments]=await Promise.all([get(`/v9/projects/${encodeURIComponent(linked.projectId)}`),get(`/v6/deployments?projectId=${encodeURIComponent(linked.projectId)}&target=production&limit=5`)]);
  assert.equal(project.id,linked.projectId);
  const report={artifactType:'OWNER_PRODUCTION_VERCEL_READ_ONLY_STATE',projectId:project.id,projectName:project.name,framework:project.framework,buildCommand:project.buildCommand,nodeVersion:project.nodeVersion,
    productionBranch:project.link?.productionBranch,gitProvider:project.link?.type,gitRepo:project.link?.repo,
    productionDeployments:deployments.deployments.map(d=>({id:d.uid,url:d.url,state:d.state,readyState:d.readyState,target:d.target,gitSha:d.meta?.githubCommitSha,gitBranch:d.meta?.githubCommitRef})),mutations:0};
  writeFileSync(`${OUT}/vercel-state-r0001.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify(report));
}
main().catch(e=>{const first=String(e?.message??'').split('\n')[0];console.error(JSON.stringify({status:'VERCEL_STATE_FAILED',code:/^[A-Z_0-9]+$/.test(first)?first:'SAFE_FAILURE'}));process.exitCode=1;});
