import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { parseEnv } from 'node:util';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { matchesCefrFilter } from '@vocabflow/contracts';
import { createLearnerVocabularyBrowseService } from '../apps/api/src/learner-vocabulary-browse.ts';
import { createReviewQueueService } from '../apps/api/src/review-queue.ts';
import { createLearnerVocabularyService } from '../apps/api/src/learner-vocabulary.ts';
import { createLearningSetService } from '../apps/api/src/learning-sets.ts';
const ROOT = '.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-runtime-r0002';
const read = file => JSON.parse(readFileSync(file));
const plan = read(`${ROOT}/integration-plan-r0002.json`);
const applied = read(`${ROOT}/application-result.json`);
const frozen = read('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001/live-capture-r0001.json');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
assert.equal(sha(readFileSync(`${ROOT}/integration-plan-r0002.json`)), applied.planSha256);
const expected = plan.items.map(x => x.runtimeVocabularyId).sort((a, b) => a - b);
const report = { artifactType: 'TICKET10_REAL_LOCAL_VERIFICATION', date: new Date().toISOString(), status: 'IN_PROGRESS', checks: [], accountWrites: 0, productionRelease: false };
const pass = (name, details = {}) => report.checks.push({ name, status: 'PASS', ...details });
async function json(route) { const r = await fetch(`http://127.0.0.1:3002${route}`); assert.equal(r.status, 200, route); return r.json(); }
const index = await json('/api/public/learning-index');
const set = index.learningSets.find(x => x.id === applied.learningSet.id);
assert.deepEqual([...set.vocabularyIds].sort((a, b) => a - b), expected); assert.equal(set.vocabularyCount, 51);
assert.equal(index.vocabulary.length, 7311);
const pilot = index.vocabulary.filter(x => matchesCefrFilter(x.cefr, 'intro-first-words', x.tags));
assert.equal(pilot.length, 30); assert(pilot.every(x => !expected.includes(x.id)));
pass('public-index-exact51-native-collection-and-accepted30-word-pilot-unchanged');
const detail = [];
for (let offset = 0; offset < expected.length; offset += 25) detail.push(...(await json(`/api/public/vocabulary?ids=${expected.slice(offset, offset + 25).join(',')}`)).vocabulary);
assert.equal(detail.length, 51);
for (const row of detail) {
  const old = frozen.apiRows.find(x => x.id === row.id); const item = plan.items.find(x => x.runtimeVocabularyId === row.id);
  assert.deepEqual(row.examples, old.examples); assert.equal(row.exampleEn, old.exampleEn);
  assert.equal(row.contentHash, old.contentHash); assert.equal(row.contentVersion, old.contentVersion);
  assert.equal(row.definitionEn, old.definitionEn); assert.equal(row.vietnamese, old.vietnamese); assert.equal(row.cefr, old.cefr);
  assert.equal(row.masterSenseIdentity, old.masterSenseIdentity); assert.deepEqual(row.tags, old.tags);
  if (item.media.wordAudio.length) assert.deepEqual(row.developmentMedia, item.media);
  else assert.deepEqual(row.developmentMedia, old.developmentMedia);
}
pass('all51-public-text-bilingual-examples-identity-cefr-content-version-preserved');
for (const cefr of [undefined, 'A1', 'A2', 'C2']) {
  const first = await json(`/api/public/vocabulary/browse?learningSetId=${set.id}&pageSize=30${cefr ? `&cefr=${cefr}` : ''}`);
  const collected = [...first.vocabulary];
  for (let page = 2; collected.length < first.total; page++) collected.push(...(await json(`/api/public/vocabulary/browse?learningSetId=${set.id}&pageSize=30&page=${page}${cefr ? `&cefr=${cefr}` : ''}`)).vocabulary);
  const wanted = plan.items.filter(x => !cefr || x.cefr === cefr).map(x => x.runtimeVocabularyId).sort((a, b) => a - b);
  assert.equal(first.total, wanted.length); assert.deepEqual(collected.map(x => x.id).sort((a, b) => a - b), wanted);
}
pass('guest-native-collection-pagination-and-cefr-intersections-51-27-24-0');
for (const asset of plan.assets) {
  const r = await fetch(`http://127.0.0.1:3002/api/local-editorial-batch-media/${plan.batchId}/${asset.filename}`);
  assert.equal(r.status, 200); assert.equal(r.headers.get('content-type'), asset.mimeType);
  assert.equal(sha(new Uint8Array(await r.arrayBuffer())), asset.sha256);
}
assert.equal((await fetch(`http://127.0.0.1:3002/api/local-editorial-batch-media/${plan.batchId}/${'0'.repeat(64)}.mp3`)).status, 404);
assert.equal(detail.find(x => x.id === 30834).imageUrl, null);
for (const id of [31365, 30833, 30834]) assert.equal(detail.find(x => x.id === id).developmentMedia.exampleAudio.length, 0);
assert.equal(detail.find(x => x.id === 30080).developmentMedia.exampleAudio[0].spokenText, detail.find(x => x.id === 30080).examples[0].en);
pass('all56-media-bytes-and-mime-exact-3-wrong-sentence-clips-and-ambiguous-afternoon-image-withheld');
const env = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
const target = new URL(env.DATABASE_URL);
assert(target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/vocabflow_dev');
const db = postgres(target.toString(), { max: 1, prepare: false, onnotice: () => {}, connection: { default_transaction_read_only: 'on' } });
// Use the application's actual adapter, including Drizzle's PostgreSQL date parsers.
const database = drizzle(db);
try {
  const [actor] = await db`SELECT lp.id,hm.user_id FROM vocabflow_app.learner_profiles lp JOIN vocabflow_app.household_members hm ON hm.household_id=lp.household_id WHERE lp.enabled=true ORDER BY lp.id LIMIT 1`; assert(actor);
  const browse = createLearnerVocabularyBrowseService(database, { datasetVersion: 'v2' });
  const queue = createReviewQueueService(database, { datasetVersion: 'v2' });
  const vocabulary = createLearnerVocabularyService(database, { datasetVersion: 'v2' });
  const accountRows = [];
  for (let page = 1; page <= 2; page++) {
    const result = await browse.browse(actor.user_id, actor.id, { learningSetId: set.id, page, pageSize: 30 });
    assert.equal(result.total, 51); accountRows.push(...result.vocabulary);
  }
  assert.deepEqual(accountRows.map(x => x.id).sort((a, b) => a - b), expected);
  for (const id of expected) {
    const [row] = await vocabulary.list(actor.user_id, actor.id, undefined, id); assert(row);
    const guest = detail.find(x => x.id === id);
    assert.deepEqual(row.developmentMedia, guest.developmentMedia); assert.deepEqual(row.examples, guest.examples);
  }
  const setDetail = await createLearningSetService(database, { datasetVersion: 'v2' }).detail(actor.user_id, set.id); assert(setDetail);
  for (const cefr of [undefined, 'A1', 'A2', 'C2']) {
    const q = await queue.list(actor.user_id, actor.id, undefined, { type: 'learning-set', id: set.id, ...(cefr ? { cefr } : {}) }, 30);
    const allowed = plan.items.filter(x => !cefr || x.cefr === cefr).map(x => x.runtimeVocabularyId);
    assert(q.queue.every(x => allowed.includes(x.vocabulary.id)));
    assert.equal(q.dueCount + q.newCount, allowed.length);
    if (!allowed.length) assert.equal(q.queue.length, 0);
  }
  await assert.rejects(browse.browse('ticket10-no-household', actor.id, { learningSetId: set.id, page: 1, pageSize: 30 }), /HOUSEHOLD_ACCESS_DENIED/);
  pass('real-account-services-share-sense-media-progress-and-exact-cefr-queue-with-ownership-boundary', { browserLoginPerformed: false, progressWrites: 0 });
  for (const [table, previous] of Object.entries(applied.protectedAfter)) {
    if (!/^[a-z_0-9]+$/.test(table)) continue;
    const [now] = await db.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t`);
    assert.deepEqual(now, previous, table);
  }
  pass('protected-account-progress-foundation-and-content-tables-unchanged-after-verification');
  report.status = 'PASS';
} finally { await db.end({ timeout: 3 }); }
writeFileSync(`${ROOT}/verification-result.json`, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
