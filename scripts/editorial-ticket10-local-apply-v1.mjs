import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const ROOT = '.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-runtime-r0002';
const PIN = '94b7a904599e7851b2dd7e38c528a5b111cdd885fa9d01d4446ac54af5e6aa1d';
const sha = raw => createHash('sha256').update(raw).digest('hex');
const save = (name, value) => writeFileSync(`${ROOT}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const raw = readFileSync(`${ROOT}/integration-plan-r0002.json`); assert.equal(sha(raw), PIN);
const plan = JSON.parse(raw); assert.equal(plan.productionEligible, false); assert.equal(plan.items.length, 51);
for (const pin of plan.sourcePins) { const bytes = readFileSync(pin.path); assert.equal(sha(bytes), pin.sha256); assert.equal(bytes.length, pin.byteLength); }
for (const asset of plan.assets) {
  const bytes = readFileSync(asset.repoRelativePath); assert.equal(sha(bytes), asset.sha256); assert.equal(bytes.length, asset.byteLength);
  assert.equal(sha(readFileSync(asset.receipt.path)), asset.receipt.sha256);
}
const env = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
const target = new URL(env.DATABASE_MIGRATION_URL);
assert(target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/vocabflow_dev' && decodeURIComponent(target.username) === 'vocabflow_migration');
assert(env.VOCABFLOW_ENV === 'development' && env.DATABASE_ENV === 'development' && env.DATABASE_DRIVER === 'postgres-js' && env.EXECUTION_CONTEXT === 'local-development' && !env.VERCEL_ENV);
const db = postgres(target.toString(), { max: 1, prepare: false, onnotice: () => {} });
const manifest = JSON.parse(readFileSync(plan.sourcePins[0].path));
const historical = JSON.parse(readFileSync('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001/live-capture-r0001.json'));
assert.equal(sha(readFileSync('.vocabflow-local/editorial-refresh-20261030/ticket10-a1-a2-batch-0001/live-capture-r0001.json')), '0db2b7bd689d036b8f9f22ca940b4c9afa3f27c6c55dc11e971d4156035a649e');
const ids = plan.items.map(x => x.runtimeVocabularyId).sort((a, b) => a - b);
assert.deepEqual(ids, [...manifest.ownedRuntimeVocabularyIds].sort((a, b) => a - b));
const hasMedia = item => Object.values(item.media).some(x => x.length > 0);
const prior = existsSync(`${ROOT}/application-result.json`) ? JSON.parse(readFileSync(`${ROOT}/application-result.json`)) : null;
if (prior) assert.equal(prior.planSha256, PIN);

async function fingerprint(tx, from, expression = 'to_jsonb(t)', where = '') {
  const [row] = await tx.unsafe(`SELECT count(*)::int AS count, encode(sha256(convert_to(coalesce(string_agg((${expression})::text,E'\\n' ORDER BY (${expression})::text),''),'UTF8')),'hex') AS sha256 FROM ${from} t ${where}`);
  return row;
}
async function protectedState(tx) {
  const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' ORDER BY tablename`;
  const out = {};
  for (const { tablename } of tables) {
    assert(/^[a-z_0-9]+$/.test(tablename));
    if (['master_v2_development_projections', 'learning_sets', 'learning_set_items'].includes(tablename)) continue;
    out[tablename] = await fingerprint(tx, `vocabflow_app."${tablename}"`);
  }
  out.projectionsExceptMedia = await fingerprint(tx, 'vocabflow_app.master_v2_development_projections', "to_jsonb(t)-'development_media'");
  out.unownedProjections = await fingerprint(tx, 'vocabflow_app.master_v2_development_projections', 'to_jsonb(t)', `WHERE vocabulary_id NOT IN (${ids.join(',')})`);
  out.existingLearningSets = await fingerprint(tx, 'vocabflow_app.learning_sets', 'to_jsonb(t)', "WHERE slug <> 'editorial-a1-a2-local-0001'");
  out.existingMemberships = await fingerprint(tx, 'vocabflow_app.learning_set_items', 'to_jsonb(t)', "WHERE learning_set_id NOT IN (SELECT id FROM vocabflow_app.learning_sets WHERE slug='editorial-a1-a2-local-0001')");
  out.migrationHistory = await fingerprint(tx, 'drizzle.__drizzle_migrations');
  return out;
}
function assertOriginal(rows, applied) {
  assert.equal(rows.length, 51);
  for (const current of rows) {
    const old = historical.rows.find(x => x.vocabulary.id === current.vocabulary.id);
    assert.deepEqual(current.vocabulary, old.vocabulary, 'Frozen vocabulary changed');
    const item = plan.items.find(x => x.runtimeVocabularyId === current.vocabulary.id);
    const expected = structuredClone(old.projection);
    if (applied && hasMedia(item)) expected.development_media = item.media;
    assert.deepEqual(current.projection, expected, `Unexpected projection drift for ${item.headword}`);
  }
}
try {
  const [identity] = await db`SELECT current_database() AS name, session_user AS role,
    (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider,
    (SELECT environment FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS environment`;
  assert.deepEqual(identity, { name: 'vocabflow_dev', role: 'vocabflow_migration', provider: 'docker-local', environment: 'development' });
  const getRows = tx => tx`SELECT to_jsonb(v) AS vocabulary,to_jsonb(p) AS projection FROM vocabflow_app.vocabularies v JOIN vocabflow_app.master_v2_development_projections p ON p.vocabulary_id=v.id WHERE v.id IN ${tx(ids)} ORDER BY v.id`;
  if (!process.argv.includes('--apply') && !prior) {
    const result = await db.begin('isolation level repeatable read read only', async tx => {
      assertOriginal(await getRows(tx), false);
      const [collision] = await tx`SELECT count(*)::int AS count FROM vocabflow_app.learning_sets WHERE slug=${plan.learningSet.slug}`;
      assert.equal(collision.count, 0);
      return { status: 'PREFLIGHT_PASS_NO_WRITES', planSha256: PIN, counts: plan.counts, protectedBefore: await protectedState(tx) };
    });
    if (!existsSync(`${ROOT}/preflight-result.json`)) save('preflight-result.json', result);
    console.log(JSON.stringify({ status: result.status, counts: result.counts }));
  } else {
    if (!prior) {
      assert(!existsSync(`${ROOT}/before-ticket10.dump`), 'Prior backup exists; inspect interrupted apply before retry.');
      const rows = await getRows(db); assertOriginal(rows, false);
      const dump = spawnSync('docker', ['exec', 'vocabflow-development-postgres', 'pg_dump', '-U', 'vocabflow_local_admin', '-d', 'vocabflow_dev', '-Fc'], { encoding: null, maxBuffer: 128 * 1024 * 1024, windowsHide: true });
      assert.equal(dump.status, 0, 'DEDICATED_LOCAL_BACKUP_FAILED'); assert.equal(dump.stdout.subarray(0, 5).toString(), 'PGDMP');
      writeFileSync(`${ROOT}/before-ticket10.dump`, dump.stdout, { flag: 'wx' });
      save('backup.json', { path: `${ROOT}/before-ticket10.dump`, sha256: sha(dump.stdout), byteLength: dump.stdout.length, privateAccountBackup: true, restoreExecuted: false });
      save('before-owned-rows.json', { planSha256: PIN, rows });
    }
    const result = await db.begin('isolation level serializable', async tx => {
      await tx`SET LOCAL statement_timeout='60s'`; await tx`SELECT pg_advisory_xact_lock(20261030,10)`;
      await tx`SELECT vocabulary_id FROM vocabflow_app.master_v2_development_projections WHERE vocabulary_id IN ${tx(ids)} FOR UPDATE`;
      assertOriginal(await getRows(tx), Boolean(prior));
      const before = await protectedState(tx);
      let set;
      if (prior) {
        [set] = await tx`SELECT id,slug FROM vocabflow_app.learning_sets WHERE id=${prior.learningSet.id} AND slug=${plan.learningSet.slug}`;
      } else {
        const existing = await tx`SELECT id FROM vocabflow_app.learning_sets WHERE slug=${plan.learningSet.slug}`; assert.equal(existing.length, 0);
        [set] = await tx`INSERT INTO vocabflow_app.learning_sets(slug,name,description,grade,enabled,sort_order) VALUES(${plan.learningSet.slug},${plan.learningSet.name},${plan.learningSet.description},NULL,true,${plan.learningSet.sortOrder}) RETURNING id,slug`;
        for (const [sortOrder, id] of ids.entries()) await tx`INSERT INTO vocabflow_app.learning_set_items(learning_set_id,vocabulary_id,sort_order) VALUES(${set.id},${id},${sortOrder})`;
        for (const item of plan.items.filter(hasMedia)) {
          const updated = await tx`UPDATE vocabflow_app.master_v2_development_projections SET development_media=${tx.json(item.media)} WHERE vocabulary_id=${item.runtimeVocabularyId} AND proposal_key=${item.proposalKey} AND content_sha256=${item.sourceContentSha256} RETURNING vocabulary_id`;
          assert.equal(updated.length, 1);
        }
      }
      assert(set);
      const members = await tx`SELECT vocabulary_id FROM vocabflow_app.learning_set_items WHERE learning_set_id=${set.id} ORDER BY vocabulary_id`;
      assert.deepEqual(members.map(x => x.vocabulary_id), ids);
      assertOriginal(await getRows(tx), true);
      const after = await protectedState(tx); assert.deepEqual(after, before, 'Protected content/identity/progress/history changed');
      if (prior) assert.deepEqual(after, prior.protectedAfter);
      return { artifactType: 'TICKET10_LOCAL_APPLICATION', status: prior ? 'ALREADY_APPLIED_NO_WRITES' : 'APPLIED_LOCAL_ONLY', appliedAtUtc: new Date().toISOString(), planSha256: PIN,
        counts: plan.counts, learningSet: { ...set, count: members.length }, protectedBefore: before, protectedAfter: after,
        projectionMediaRowsChanged: prior ? 0 : 20, newMemberships: prior ? 0 : 51, lexicalTextRowsChanged: 0, progressWrites: 0, canonicalIdsCreated: 0, providerJobs: 0, productionEligible: false };
    });
    if (!prior) save('application-result.json', result);
    console.log(JSON.stringify({ status: result.status, counts: result.counts, learningSet: result.learningSet, protectedFingerprints: Object.keys(result.protectedAfter).length }));
  }
} finally { await db.end({ timeout: 3 }); }
