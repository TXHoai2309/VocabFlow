/** Disposable read-only preview of the production build and rehearsed public data.
 * Never reads credentials or connects to either Neon branch.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { matchesCefrFilter } from '@vocabflow/contracts';
import { ownerPublishedPublicMedia } from '../apps/api/src/owner-public-media.ts';
const data=JSON.parse(readFileSync('.vocabflow-local/editorial-refresh-20261030/owner-production-r0001/public-runtime-fixture.current.json','utf8'));
assert.equal(data.accountDataIncluded,false);assert.equal(data.vocabulary.length,1547);
const env={VOCAB_DATASET_VERSION:'owner-production',VERCEL_ENV:'production',VOCABFLOW_ENV:'production',DATABASE_ENV:'production',EXECUTION_CONTEXT:'vercel-production',DATABASE_URL:'postgres://vocabflow_runtime:fixture@ep-twilight-firefly-a1dugz2x-pooler.ap-southeast-1.aws.neon.tech/neondb'};
const words=data.vocabulary.map(x=>ownerPublishedPublicMedia(x,env));assert(words.every(Boolean));
const byId=new Map(words.map(x=>[x.id,x]));
function filtered(params){
  const set=data.index.learningSets.find(x=>x.id===Number(params.get('learningSetId')));
  const topic=data.index.topics.find(x=>x.id===Number(params.get('topicId')));
  const constraint=params.has('learningSetId')?(set?.vocabularyIds??[]):params.has('topicId')?(topic?.vocabularyIds??[]):undefined;
  const ids=constraint?new Set(constraint):undefined;const q=(params.get('q')??'').toLocaleLowerCase();
  return words.filter(w=>(!ids||ids.has(w.id))&&(!params.get('level')||w.level===params.get('level'))&&matchesCefrFilter(w.cefr,params.get('cefr'),w.tags)&&(!q||[w.word,w.vietnamese,w.shortMeaningVi].some(x=>String(x??'').toLocaleLowerCase().includes(q))));
}
const app=new Hono();app.all('/api/auth/*',c=>c.json(null));
app.get('/api/health',c=>c.json({status:'ok',fixture:true}));
app.get('/api/public/learning-index',c=>{c.header('Cache-Control','no-store');return c.json(data.index);});
app.get('/api/public/vocabulary',c=>c.json({vocabulary:(c.req.query('ids')??'').split(',').map(Number).map(id=>byId.get(id)).filter(Boolean)}));
app.get('/api/public/vocabulary/matches',c=>c.json({ids:filtered(new URL(c.req.url).searchParams).map(x=>x.id)}));
app.get('/api/public/vocabulary/browse',c=>{const p=new URL(c.req.url).searchParams;const all=filtered(p);const size=Number(p.get('pageSize'))||30;const pages=Math.max(1,Math.ceil(all.length/size));const page=Math.min(pages,Math.max(1,Number(p.get('page'))||1));return c.json({vocabulary:all.slice((page-1)*size,page*size),total:all.length,totalPages:pages,page,pageSize:size,filters:{cefrOptions:['intro-first-words','A1','A2','B1','B2'],topicOptions:[...new Set(words.map(x=>x.topic).filter(Boolean))]}});});
app.all('/api/*',c=>c.json({error:{code:'FIXTURE_READ_ONLY',message:'Preview only.'}},404));
app.use('*',serveStatic({root:resolve('dist/client')}));app.get('*',serveStatic({path:resolve('dist/client/index.html')}));
serve({fetch:app.fetch,hostname:'127.0.0.1',port:5180});console.log('OWNER_PRODUCTION_REHEARSED_BUILD_PREVIEW=http://127.0.0.1:5180 (no remote DB; no account data)');
