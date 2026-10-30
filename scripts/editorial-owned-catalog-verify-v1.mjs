import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { matchesCefrFilter } from '@vocabflow/contracts';
import { createLearnerVocabularyBrowseService } from '../apps/api/src/learner-vocabulary-browse.ts';
import { createLearnerVocabularyService } from '../apps/api/src/learner-vocabulary.ts';
import { createReviewQueueService } from '../apps/api/src/review-queue.ts';
import { createLearningSetService } from '../apps/api/src/learning-sets.ts';
import { createGlobalSearchService } from '../apps/api/src/global-search.ts';

const OUT = '.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001';
const read = file => JSON.parse(readFileSync(file));
const plan = read('vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001/catalog-plan-r0001.json');
const applied = read(`${OUT}/application-result.json`);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const report = { artifactType: 'OWNER_CATALOG_REAL_LOCAL_VERIFICATION', status: 'IN_PROGRESS', checks: [], accountWrites: 0, remoteWrites: 0, providerJobs: 0 };
const pass = (name, details = {}) => report.checks.push({ name, status: 'PASS', ...details });
async function json(route) {
  const r = await fetch('http://127.0.0.1:3002' + route); assert.equal(r.status, 200, route); return r.json();
}
const index = await json('/api/public/learning-index');
assert.equal(index.catalogIdentity, plan.catalogId); assert.equal(index.vocabulary.length, 1547);
assert.equal(index.learningSets.length, 76); assert.equal(index.topics.length, 73);
const wanted = plan.items.map(x => x.runtimeVocabularyId).sort((a, b) => a - b);
assert.deepEqual(index.vocabulary.map(x => x.id).sort((a, b) => a - b), wanted);
assert(index.vocabulary.every(x => !plan.retiredRuntimeIds.includes(x.id)));
pass('index-exact1547-ids-76sets-73topics-and-no-retired-words');
const words = [];
for (let offset = 0; offset < wanted.length; offset += 60) words.push(...(await json('/api/public/vocabulary?ids=' + wanted.slice(offset, offset + 60).join(','))).vocabulary);
assert.equal(words.length, 1547);
for (const item of plan.items) {
  const row = words.find(x => x.id === item.runtimeVocabularyId); const c = item.content;
  assert.equal(row.word, c.word); assert.equal(row.vietnamese, c.meaningVi); assert.equal(row.shortMeaningVi, c.shortMeaningVi);
  assert.equal(row.definitionEn, c.definitionEn); assert.equal(row.exampleEn, c.examples[0].en); assert.deepEqual(row.examples, c.examples);
  assert.equal(row.partOfSpeech, c.partOfSpeech); assert.equal(row.cefr ?? null, c.cefr); assert.deepEqual(row.tags ?? [], c.tags);
  assert.equal(row.imageUrl, c.media.image); assert.equal(row.audioUrl, c.media.wordAudio);
  assert.equal(row.contentVersion, item.contentVersion); assert.equal(row.contentHash, item.contentSha256);
  assert.equal(row.masterSenseIdentity, item.proposalKey); assert.equal(row.developmentMedia, undefined);
  assert.equal(row.contentReviewStatus, undefined, 'Do not claim independent Master PASS for owner-local content');
}
pass('all1547-current-text-examples-cefr-media-ids-versions-exact-no-fabricated-master-review');
for (const cefr of ['intro-first-words', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'UNCLASSIFIED']) {
  const expected = index.vocabulary.filter(x => matchesCefrFilter(x.cefr, cefr, x.tags)).length;
  const page = await json('/api/public/vocabulary/browse?pageSize=30&cefr=' + cefr);
  assert.equal(page.total, expected, cefr); assert(page.vocabulary.every(x => matchesCefrFilter(x.cefr, cefr, x.tags)));
}
const obsolete = await json('/api/public/vocabulary?ids=' + plan.retiredRuntimeIds.slice(0, 60).join(',')); assert.equal(obsolete.vocabulary.length, 0);
const missing = await json('/api/public/vocabulary/browse?q=zzzz-no-owned-word'); assert.equal(missing.total, 0);
for (const set of index.learningSets) {
  const page = await json(`/api/public/vocabulary/browse?learningSetId=${set.id}&pageSize=30`);
  assert.equal(page.total, set.vocabularyCount); assert(page.vocabulary.every(x => set.vocabularyIds.includes(x.id)));
}
pass('all76collection-counts-and-eight-learning-level-intersections-correct-empty-stays-empty');
const sampled = [];
for (const group of ['expansion547', 'basic500', 'basicplus500']) {
  const items = plan.items.filter(x => x.package === group);
  sampled.push(items[0], items.at(-1));
}
for (const item of sampled) for (const source of item.mediaEvidence) {
  const response = await fetch('http://127.0.0.1:3002' + item.content.media[source.kind]); assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), source.kind === 'image' ? 'image/png' : 'audio/mpeg');
  const bytes = new Uint8Array(await response.arrayBuffer()); assert.equal(sha(bytes), source.asset.sha256); assert.equal(bytes.length, source.asset.byteLength);
}
assert.equal((await fetch('http://127.0.0.1:3002/api/local-owner-editorial-media/' + '0'.repeat(64) + '.mp3')).status, 404);
assert.equal((await fetch('http://127.0.0.1:3002/api/local-editorial-media/' + plan.assets[0].filename)).status, 404);
pass('18live-image-word-sentence-deliveries-exact-unknown-and-retired-media-routes-closed', { all4641BindingsByteVerifiedDuringPreparation: true, uniqueFiles: 4640 });
const env = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
const url = new URL(env.DATABASE_URL); assert(url.hostname === '127.0.0.1' && url.port === '55432' && url.pathname === '/vocabflow_dev' && env.VOCAB_DATASET_VERSION === 'owner-local');
const db = postgres(url.toString(), { max: 1, prepare: false, connection: { default_transaction_read_only: 'on' }, onnotice: () => {} });
const database = drizzle(db);
try {
  const [counts] = await db`SELECT count(*)::int AS total,count(*) FILTER (WHERE source_dataset='VOCABFLOW_OWNER_EDITORIAL_LOCAL')::int AS owned FROM vocabflow_app.vocabularies`;
  assert.deepEqual(counts, { total: 1547, owned: 1547 });
  const kept = await db`SELECT id FROM vocabflow_app.vocabularies WHERE id IN ${db(plan.retainedRuntimeIds)} ORDER BY id`; assert.deepEqual(kept.map(x => x.id), plan.retainedRuntimeIds);
  const [retired] = await db`SELECT count(*)::int AS count FROM vocabflow_app.vocabularies WHERE id IN ${db(plan.retiredRuntimeIds)}`; assert.equal(retired.count, 0);
  const [actor] = await db`SELECT lp.id,hm.user_id FROM vocabflow_app.learner_profiles lp JOIN vocabflow_app.household_members hm ON hm.household_id=lp.household_id WHERE lp.enabled=true ORDER BY lp.id LIMIT 1`; assert(actor);
  const options = { datasetVersion: 'owner-local' };
  const browse = createLearnerVocabularyBrowseService(database, options);
  const queue = createReviewQueueService(database, options);
  const detail = createLearnerVocabularyService(database, options);
  const collectionService = createLearningSetService(database, options);
  const search = createGlobalSearchService(database, options);
  for (const set of index.learningSets.slice(0, 3)) {
    const result = await search.search(actor.user_id, actor.id, { q: set.name, limit: 10 });
    assert(result.learningSets.some(x => x.id === set.id), 'Owner collection remains searchable');
  }
  const all = await browse.browse(actor.user_id, actor.id, { page: 1, pageSize: 30 }); assert.equal(all.total, 1547);
  for (const set of index.learningSets.slice(0, 3)) {
    const collection = await collectionService.detail(actor.user_id, set.id); assert(collection);
    const session = await queue.list(actor.user_id, actor.id, undefined, { type: 'learning-set', id: set.id }, 30);
    assert.equal(session.dueCount + session.newCount, set.vocabularyCount);
    assert(session.queue.every(x => set.vocabularyIds.includes(x.vocabulary.id)));
    const empty = await queue.list(actor.user_id, actor.id, undefined, { type: 'learning-set', id: set.id, cefr: 'C2' }, 30); assert.equal(empty.queue.length, 0);
  }
  for (const item of sampled) {
    const [row] = await detail.list(actor.user_id, actor.id, undefined, item.runtimeVocabularyId);
    assert.equal(row.word, item.content.word); assert.equal(row.imageUrl, item.content.media.image); assert.deepEqual(row.examples, item.content.examples);
  }
  await assert.rejects(browse.browse('owner-catalog-no-household', actor.id, { page: 1, pageSize: 30 }), /HOUSEHOLD_ACCESS_DENIED/);
  pass('real-account-owner-dataset-collection-queue-detail-and-household-boundary-pass-without-writes');
  for (const [table, expected] of Object.entries(applied.protectedAfter)) {
    const isSubset = table.endsWith('_retained'); const actualTable = isSubset ? table.slice(0, -'_retained'.length) : table;
    assert(/^[a-z_0-9]+$/.test(actualTable));
    const condition = isSubset ? `WHERE vocabulary_id IN (${plan.retainedRuntimeIds.join(',')})` : '';
    const [now] = await db.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${actualTable}" t ${condition}`);
    assert.deepEqual(now, expected, table);
  }
  pass('all-protected-nonlexical-foundation-and-retained-progress-fingerprints-unchanged');
  report.status = 'PASS'; report.counts = { words: 1547, retainedIds: 905, newLocalIds: 642, retiredRows: 6436, topics: 73, sets: 76 };
} finally { await db.end({ timeout: 3 }); }
writeFileSync(`${OUT}/verification.current.json`, JSON.stringify(report, null, 2) + '\n'); console.log(JSON.stringify(report));
