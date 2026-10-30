import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { v2 as cloudinary } from 'cloudinary';
import { openSql, assertPostConnectIdentity } from './db-core.ts';
import { resolveProductionConnection } from './production-release-safety.ts';
import { DATABASE_TARGETS } from '../config/database-targets.ts';

const OUT = '.vocabflow-local/editorial-refresh-20261030/owner-production-r0001';
const PLAN = 'vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001/catalog-plan-r0001.json';
const sha = b => createHash('sha256').update(b).digest('hex');
const env = { ...parseEnv(readFileSync('.env', 'utf8')), VOCABFLOW_ENV: 'production', DATABASE_ENV: 'production', EXECUTION_CONTEXT: 'local-development' };
env.PRODUCTION_DATABASE_URL = env.db_prod;
env.PRODUCTION_MIGRATION_DATABASE_URL = env.db_prod_mir;
const read = path => JSON.parse(readFileSync(path, 'utf8'));
function save(name, data) { const file = `${OUT}/${name}`; assert(!existsSync(file), 'INVENTORY_ALREADY_EXISTS'); writeFileSync(file, JSON.stringify(data, null, 2) + '\n'); }
async function dbInventory(connection, target) {
  const sql = openSql(connection);
  try {
    return await sql.begin(async tx => {
      await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
      await assertPostConnectIdentity(tx, target);
      const rows = await tx`SELECT v.id,v.word,v.enabled,v.source_dataset,v.source_record_id,v.content_version,v.image_url,v.audio_url,
        md.proposal_key,md.content_sha256,md.source_provenance,md.examples,md.development_media
        FROM vocabflow_app.vocabularies v LEFT JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id=v.id ORDER BY v.id`;
      const tables = await tx`SELECT table_name FROM information_schema.tables WHERE table_schema='vocabflow_app' AND table_type='BASE TABLE' ORDER BY table_name`;
      const fingerprints = {};
      for (const {table_name} of tables) {
        assert(/^[a-z_0-9]+$/.test(table_name));
        const [row] = await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table_name}" t`);
        fingerprints[table_name] = row;
      }
      const history = await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`;
      const fk = await tx`SELECT c.conname,c.conrelid::regclass::text AS source_table,pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c WHERE c.contype='f' AND c.confrelid IN ('vocabflow_app.vocabularies'::regclass,'vocabflow_app.learning_sets'::regclass,'vocabflow_app.topics'::regclass) ORDER BY source_table,c.conname`;
      return { rows, fingerprints, history, foreignKeys: fk };
    });
  } finally { await sql.end({timeout:5}); }
}
async function main() {
  mkdirSync(OUT, {recursive:true});
  assert(!existsSync(`${OUT}/production-inventory-r0001.json`), 'INVENTORY_ALREADY_EXISTS');
  const production = await resolveProductionConnection({purpose:'migration',environment:env});
  const runtime = await resolveProductionConnection({purpose:'runtime',environment:env});
  assert(production.target.branchId === DATABASE_TARGETS.production.branchId);
  const data = await dbInventory(production.url, production.target);
  const runtimeSql = openSql(runtime.url);
  try { await assertPostConnectIdentity(runtimeSql,runtime.target); await runtimeSql`BEGIN READ ONLY`; await runtimeSql`SELECT 1`; await runtimeSql`ROLLBACK`; } finally { await runtimeSql.end({timeout:5}); }
  cloudinary.config({cloud_name:env.CLOUDINARY_CLOUD_NAME,api_key:env.CLOUDINARY_API_KEY,api_secret:env.CLOUDINARY_API_SECRET,secure:true});
  const usage = await cloudinary.api.usage();
  const resources = [];
  const limits = [];
  for (const resource_type of ['image','video','raw']) for (const type of ['upload','authenticated','private']) {
    let next_cursor;
    do {
      const page = await cloudinary.api.resources({resource_type,type,max_results:500,next_cursor,tags:true,context:true,metadata:true});
      resources.push(...page.resources.map(x=>({...x,resource_type,type})));
      limits.push({remaining:page.rate_limit_remaining,allowed:page.rate_limit_allowed});
      next_cursor=page.next_cursor;
    } while(next_cursor);
  }
  const plan = read(PLAN);
  const byId = new Map(data.rows.map(x=>[x.id,x]));
  const referenced = plan.items.filter(x=>x.retainedRuntimeId);
  const keepMatches = referenced.map(x=>({itemId:x.itemId,localId:x.runtimeVocabularyId,productionId:byId.get(x.runtimeVocabularyId)?.id??null,
    localWord:x.content.word,productionWord:byId.get(x.runtimeVocabularyId)?.word??null,productionProposalKey:byId.get(x.runtimeVocabularyId)?.proposal_key??null}));
  const urls=[];
  const collect=(value)=>{if(typeof value==='string'&&value.startsWith('https://res.cloudinary.com/'))urls.push(value);else if(Array.isArray(value))value.forEach(collect);else if(value&&typeof value==='object')Object.values(value).forEach(collect);};
  data.rows.forEach(collect);
  const out={artifactType:'OWNER_PRODUCTION_READ_ONLY_INVENTORY',date:'2026-10-30',providerVerified:true,target:{projectId:production.target.projectId,branchId:production.target.branchId,databaseName:production.target.databaseName},
    rows:data.rows,fingerprints:data.fingerprints,history:data.history,foreignKeys:data.foreignKeys,localSourcePlan:{path:PLAN,sha256:sha(readFileSync(PLAN))},keepMatches,
    uniqueCloudinaryUrls:[...new Set(urls)].sort(),cloudinaryInventoryPath:`${OUT}/cloudinary-inventory-r0001.json`,mutations:0};
  save('production-inventory-r0001.json',out);
  save('cloudinary-inventory-r0001.json',{artifactType:'CLOUDINARY_FULL_RESOURCE_READ_ONLY_INVENTORY',resources,usage,limits,mutations:0});
  const remote = await fetch('https://vocab-flow-steel.vercel.app/api/public/learning-index');
  const publicResult = remote.ok?await remote.json():{status:remote.status};
  save('public-before-r0001.json',publicResult);
  const counts={};for(const x of resources){const key=x.public_id.split('/').slice(0,3).join('/')+':'+x.resource_type+':'+x.type;counts[key]=(counts[key]??0)+1;}
  console.log(JSON.stringify({status:'READ_ONLY_INVENTORY_SAVED',words:data.rows.length,enabled:data.rows.filter(x=>x.enabled).length,historyCount:data.history.length,applicationTables:Object.keys(data.fingerprints).length,
    localReferences:keepMatches.length,idAndWordMatches:keepMatches.filter(x=>x.localWord===x.productionWord).length,missingLocalReferences:keepMatches.filter(x=>x.productionId===null).length,
    cloudinaryResources:resources.length,resourceGroups:counts,usage:{plan:usage.plan,storage:usage.storage,credits:usage.credits},publicStatus:remote.status,publicWords:publicResult.vocabulary?.length,mutations:0}));
}
main().catch(error=>{console.error(JSON.stringify({status:'INVENTORY_FAILED',code:/^[A-Z_0-9]{3,90}$/.test(error?.message??'')?error.message:(error?.code??'SAFE_FAILURE'),httpCode:error?.http_code}));process.exitCode=1;});
