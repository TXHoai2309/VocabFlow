import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const ROOT = '.vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0001';
const PIN = 'c85095a6c90540f9e71032c3337cf9ba36b547854a5f6633b5c241616a0483a3';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const save = (name, value) => writeFileSync(`${ROOT}/${name}`, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });
assert(!existsSync('.vocabflow-local/editorial-refresh-20261028/ticket07-local-pilot-r0002/apply-result.json'), 'Pilot is at revision2; verify with editorial-pilot-audio-acceptance-v1.mjs instead of applying revision1');
const bytes = readFileSync(`${ROOT}/integration-plan.json`);
assert.equal(sha(bytes), PIN);
const plan = JSON.parse(bytes);
assert.equal(plan.productionEligible, false);
assert.equal(plan.items.length, 30);
assert.equal(new Set(plan.items.map(x => x.runtimeVocabularyId)).size, 30);
for (const asset of plan.assets) assert.equal(sha(readFileSync(asset.repoRelativePath)), asset.sha256);
const env = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
assert.equal(env.VOCABFLOW_ENV, 'development'); assert.equal(env.DATABASE_ENV, 'development');
assert.equal(env.EXECUTION_CONTEXT, 'local-development'); assert.equal(env.DATABASE_DRIVER, 'postgres-js');
assert(!env.VERCEL_ENV);
const target = new URL(env.DATABASE_MIGRATION_URL);
assert(target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/vocabflow_dev'
  && decodeURIComponent(target.username) === 'vocabflow_migration');
const db = postgres(env.DATABASE_MIGRATION_URL, { max: 1, prepare: false, onnotice: () => undefined });
const protectedTables = ['vocabularies','learner_progress','review_events','learner_profiles','user','session','account','verification','master_vocabulary_mappings','master_vocabulary_import_runs','master_learning_set_mappings','master_learning_set_memberships','topics','vocabulary_topics','learner_learning_sets'];
async function fingerprint(tx) {
  const result = {};
  for (const table of protectedTables) {
    const [row] = await tx.unsafe(`SELECT count(*)::int AS count, encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t`);
    result[table] = row;
  }
  result.history = await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`;
  return result;
}
try {
  const [identity] = await db`SELECT current_database() AS name, session_user AS role,
    (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider,
    (SELECT environment FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS environment`;
  assert.deepEqual(identity, { name: 'vocabflow_dev', role: 'vocabflow_migration', provider: 'docker-local', environment: 'development' });
  const priorResult = existsSync(`${ROOT}/apply-result.json`) ? JSON.parse(readFileSync(`${ROOT}/apply-result.json`)) : null;
  if (!priorResult && process.argv.includes('--apply')) {
    const dump = `${ROOT}/pre-pilot.dump`;
    assert(!existsSync(dump), 'Backup exists; inspect previous interrupted attempt before retry');
    const backup = spawnSync('docker', ['exec','vocabflow-development-postgres','pg_dump','-U','vocabflow_local_admin','-d','vocabflow_dev','-Fc'], { encoding: null, maxBuffer: 128 * 1024 * 1024, windowsHide: true });
    assert.equal(backup.status, 0, 'Dedicated local backup failed');
    assert(backup.stdout.subarray(0,5).toString() === 'PGDMP');
    writeFileSync(dump, backup.stdout, { flag: 'wx' });
    save('backup.json', { path: dump, sha256: sha(backup.stdout), byteLength: backup.stdout.length, restoreExecuted: false });
  }
  const result = await db.begin(async tx => {
    await tx`SET LOCAL statement_timeout = '60s'`;
    await tx`SELECT pg_advisory_xact_lock(20261029, 7)`;
    const before = await fingerprint(tx);
    const ids = plan.items.map(x => x.runtimeVocabularyId);
    const rows = await tx`SELECT * FROM vocabflow_app.master_v2_development_projections WHERE vocabulary_id IN ${tx(ids)} ORDER BY vocabulary_id FOR UPDATE`;
    assert.equal(rows.length, 30);
    for (const item of plan.items) {
      const row = rows.find(x => x.vocabulary_id === item.runtimeVocabularyId);
      assert.equal(row.proposal_key, item.proposalKey); assert.equal(row.content_sha256, item.sourceContentSha256);
      if (row.source_provenance.editorialLocalPreview) {
        assert.deepEqual(row.source_provenance.editorialLocalPreview, { ...item.preview, integrationPlanSha256: PIN });
      }
    }
    if (!process.argv.includes('--apply')) return { status: 'PREFLIGHT_PASS', protectedBefore: before, items: rows.length, planSha256: PIN, databaseWrites: 0 };
    if (!priorResult) save('prior-projections.json', rows);
    const sets = [];
    for (const [index, collection] of plan.collections.entries()) {
      const existing = await tx`SELECT * FROM vocabflow_app.learning_sets WHERE slug=${collection.slug}`;
      assert(priorResult || existing.length === 0, 'Unexpected set slug collision');
      const [set] = existing.length ? existing : await tx`INSERT INTO vocabflow_app.learning_sets(slug,name,description,grade,enabled,sort_order)
        VALUES(${collection.slug},${collection.name},'Pilot local · nội dung biên tập đang kiểm tra, chưa phát hành.',NULL,true,${100 + index}) RETURNING *`;
      if (!priorResult) for (const [order, id] of collection.vocabularyIds.entries()) await tx`INSERT INTO vocabflow_app.learning_set_items(learning_set_id,vocabulary_id,sort_order) VALUES(${set.id},${id},${order})`;
      const memberships = await tx`SELECT vocabulary_id FROM vocabflow_app.learning_set_items WHERE learning_set_id=${set.id} ORDER BY sort_order,vocabulary_id`;
      assert.deepEqual(memberships.map(x => x.vocabulary_id), collection.vocabularyIds);
      sets.push({ id: set.id, slug: set.slug, count: memberships.length });
    }
    for (const item of plan.items) {
      if (!priorResult) await tx`UPDATE vocabflow_app.master_v2_development_projections SET
        source_provenance=jsonb_set(source_provenance,'{editorialLocalPreview}',${tx.json({ ...item.preview, integrationPlanSha256: PIN })},true)
        WHERE vocabulary_id=${item.runtimeVocabularyId} AND proposal_key=${item.proposalKey} AND content_sha256=${item.sourceContentSha256}`;
    }
    const after = await fingerprint(tx); assert.deepEqual(after, before, 'Protected content/progress/auth/history changed');
    const overlays = await tx`SELECT count(*)::int AS count FROM vocabflow_app.master_v2_development_projections WHERE source_provenance->'editorialLocalPreview'->>'integrationPlanSha256'=${PIN}`;
    assert.equal(overlays[0].count, 30);
    const unchanged = await tx`SELECT * FROM vocabflow_app.master_v2_development_projections WHERE vocabulary_id IN ${tx(ids)} ORDER BY vocabulary_id`;
    for (const row of unchanged) {
      const old = rows.find(x => x.vocabulary_id === row.vocabulary_id);
      const clean = x => { const copy = structuredClone(x); delete copy.source_provenance.editorialLocalPreview; return copy; };
      assert.deepEqual(clean(row), clean(old), 'Original projection changed');
    }
    return { status: priorResult ? 'IDEMPOTENT_VERIFY_PASS' : 'LOCAL_PREVIEW_APPLIED', planSha256: PIN, protectedBefore: before, protectedAfter: after,
      counts: plan.counts, sets, originalVocabularyRowsChanged: 0, originalProjectionColumnsChanged: 0, canonicalIdsCreated: 0, remoteWrites: 0 };
  });
  if (!priorResult) save(process.argv.includes('--apply') ? 'apply-result.json' : 'preflight-result.json', result);
  console.log(JSON.stringify({ status: result.status, counts: result.counts, sets: result.sets, planSha256: PIN }));
} finally { await db.end({ timeout: 3 }); }
