import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import postgres from 'postgres';
import { PgDialect } from 'drizzle-orm/pg-core';
import { matchesCefrFilter } from '@vocabflow/contracts';
import { createLearnerVocabularyBrowseService } from '../apps/api/src/learner-vocabulary-browse.ts';
import { createReviewQueueService } from '../apps/api/src/review-queue.ts';
import { createLearnerVocabularyService } from '../apps/api/src/learner-vocabulary.ts';
import { createLearningSetService } from '../apps/api/src/learning-sets.ts';

const ROOT = '.vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0002';
const plan = JSON.parse(readFileSync(`${ROOT}/integration-plan.json`));
const applied = JSON.parse(readFileSync(`${ROOT}/apply-result.json`));
const sha = b => createHash('sha256').update(b).digest('hex');
const expected = plan.items.map(x => x.runtimeVocabularyId).sort((a,b) => a-b);
const report = { type: 'REAL_LOCAL_PILOT_VERIFICATION', date: new Date().toISOString(), status: 'IN_PROGRESS', checks: [], productionRelease: false, accountWrites: 0 };
const pass = (name, details = {}) => report.checks.push({ name, status: 'PASS', ...details });
async function json(route) {
  const r = await fetch(`http://127.0.0.1:3002${route}`, { headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(r.status, 200, route); return r.json();
}
const index = await json('/api/public/learning-index');
const guestIds = index.vocabulary.filter(x => matchesCefrFilter(x.cefr, 'intro-first-words', x.tags)).map(x => x.id).sort((a,b) => a-b);
assert.deepEqual(guestIds, expected); assert.equal(index.vocabulary.length, 7311);
assert(Buffer.byteLength(JSON.stringify(index)) < 600000, 'Lightweight index unexpectedly large');
pass('guest-index-exact-30', { indexVocabulary: index.vocabulary.length, byteLength: Buffer.byteLength(JSON.stringify(index)) });
const browse = await json('/api/public/vocabulary/browse?cefr=intro-first-words&pageSize=30');
assert.equal(browse.total, 30); assert.deepEqual(browse.vocabulary.map(x=>x.id).sort((a,b)=>a-b), expected);
pass('public-browse-exact-30');
const zero = await json('/api/public/vocabulary/browse?cefr=intro-first-words&q=zzzz-no-pilot-match');
assert.equal(zero.total, 0); assert.equal(zero.vocabulary.length, 0); pass('public-empty-search-does-not-expand');
const fish = await json('/api/public/vocabulary/browse?cefr=intro-first-words&q=fish');
assert.equal(fish.total, 1); assert.equal(fish.vocabulary[0].word, 'fish'); assert.equal(fish.vocabulary[0].id, 34300); pass('exact-sense-headword-search');
const detail = await json(`/api/public/vocabulary?ids=${expected.join(',')}`);
const frozen = JSON.parse(readFileSync('vocabflow-dataset/workspaces/editorial-refresh-20261028/pilot-r0001/manifest-r0001.json'));
for (const item of frozen.items) {
  const word = detail.vocabulary.find(x=>x.id===item.runtimeVocabularyId);
  assert.equal(word.word, item.headword); assert.equal(word.displayForm, item.headword);
  assert.equal(word.shortMeaningVi, item.meaningVi); assert.equal(word.exampleEn, item.example.en);
  assert.equal(word.examples[0].en, item.example.en); assert.equal(word.examples[0].vi, item.example.vi);
  assert.equal(word.examples[0].exampleKey, 'editorial-draft:'+item.example.draftRef);
  const binding = plan.items.find(x=>x.runtimeVocabularyId===word.id).preview;
  assert.deepEqual(word.developmentMedia, binding.media);
}
pass('all-30-draft-presentations-exact');
for (const asset of plan.assets) {
  const r = await fetch('http://127.0.0.1:3002/api/local-editorial-media/'+asset.filename);
  assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), asset.mimeType);
  assert.equal(sha(new Uint8Array(await r.arrayBuffer())), asset.sha256);
}
assert.equal((await fetch('http://127.0.0.1:3002/api/local-editorial-media/'+'0'.repeat(64)+'.mp3')).status,404);
pass(`all-${plan.assets.length}-allowlisted-assets-exact-bytes-and-mime`);
for (const set of applied.sets) {
  const collection = index.learningSets.find(x=>x.id===set.id); assert.equal(collection.vocabularyCount, set.count);
  const scoped = await json(`/api/public/vocabulary/browse?cefr=intro-first-words&learningSetId=${set.id}&pageSize=30`);
  assert.equal(scoped.total, set.count); assert.deepEqual(scoped.vocabulary.map(x=>x.id).sort((a,b)=>a-b), [...collection.vocabularyIds].sort((a,b)=>a-b));
}
pass('four-collections-guest-browse-count-parity', { counts: applied.sets.map(x=>x.count) });

const env = parseEnv(readFileSync('.vocabflow-local/development.env','utf8'));
const target = new URL(env.DATABASE_URL); assert(target.hostname==='127.0.0.1' && target.port==='55432' && target.pathname==='/vocabflow_dev');
const db = postgres(env.DATABASE_URL,{ max:1, prepare:false, onnotice:()=>undefined, connection: { default_transaction_read_only: 'on' } });
const dialect = new PgDialect();
const database = { execute: query => { const q=dialect.sqlToQuery(query);return db.unsafe(q.sql,q.params); } };
try {
  const [actor] = await db`SELECT lp.id,hm.user_id FROM vocabflow_app.learner_profiles lp JOIN vocabflow_app.household_members hm ON hm.household_id=lp.household_id WHERE lp.enabled=true ORDER BY lp.id LIMIT 1`;
  assert(actor, 'Existing local account fixture required');
  const browseService = createLearnerVocabularyBrowseService(database,{ datasetVersion:'v2' });
  const account = await browseService.browse(actor.user_id,actor.id,{ page:1,pageSize:30,cefr:'intro-first-words' });
  assert.equal(account.total,30);assert.deepEqual(account.vocabulary.map(x=>x.id).sort((a,b)=>a-b),expected);
  const vocabulary = createLearnerVocabularyService(database,{ datasetVersion:'v2' });
  const queueService = createReviewQueueService(database,{ datasetVersion:'v2' });
  for (const set of applied.sets) {
    const q = await queueService.list(actor.user_id,actor.id,undefined,{ type:'learning-set',id:set.id,cefr:'intro-first-words' },30);
    assert.equal(q.dueCount + q.newCount, set.count);
    const allowed = new Set(index.learningSets.find(x=>x.id===set.id).vocabularyIds);
    for (const entry of q.queue) { assert(allowed.has(entry.vocabulary.id)); assert(entry.vocabulary.examples[0].exampleKey.startsWith('editorial-draft:')); }
    const setDetail = await createLearningSetService(database,{ datasetVersion:'v2' }).detail(actor.user_id,set.id);
    assert(setDetail);
  }
  const empty = await queueService.list(actor.user_id,actor.id,undefined,{ type:'learning-set',id:applied.sets[0].id,cefr:'C2' },30);
  assert.equal(empty.dueCount+empty.newCount,0);assert.equal(empty.queue.length,0);
  pass('account-real-services-count-scope-and-empty-parity', { browserLoginPerformed:false });
  const shared = await db`SELECT lsi.vocabulary_id,count(*)::int AS memberships FROM vocabflow_app.learning_set_items lsi WHERE lsi.vocabulary_id IN ${db(expected)} GROUP BY lsi.vocabulary_id HAVING count(*)>1`;
  assert(shared.length>0);const id=shared[0].vocabulary_id;
  const a = await vocabulary.list(actor.user_id,actor.id,undefined,id); assert.equal(a.length,1);assert.equal(a[0].id,id);
  const status = account.vocabulary.find(x=>x.id===id); assert.equal(status.status,a[0].status);assert.equal(status.nextReviewDate,a[0].nextReviewDate);
  pass('reused-sense-shared-identity-and-progress', { sensesInMultipleSets:shared.length, progressWrites:0 });
  await assert.rejects(browseService.browse('editorial-no-household-user',actor.id,{ page:1,pageSize:30,cefr:'intro-first-words' }),/HOUSEHOLD_ACCESS_DENIED/);
  pass('account-ownership-boundary-preserved');
  for (const [table, previous] of Object.entries(applied.protectedBefore)) {
    if(table==='history') continue;
    assert(/^[a-z_]+$/.test(table));
    const [now] = await db.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t`);
    assert.deepEqual(now, previous, table);
  }
  pass('protected-content-auth-progress-fingerprints-still-unchanged');
  report.status='PASS';
} finally { await db.end({timeout:3}); }
writeFileSync(`${ROOT}/verification-result.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
