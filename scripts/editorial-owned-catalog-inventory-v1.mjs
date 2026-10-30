import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const env = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
const target = new URL(env.DATABASE_URL);
assert(target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/vocabflow_dev');
const db = postgres(target.toString(), { max: 1, prepare: false, connection: { default_transaction_read_only: 'on' } });
const files = [
  '.vocabflow-local/editorial-refresh-20261028/expansion-550-media-r0001/dataset-547-r0004.json',
  '.vocabflow-local/editorial-refresh-20261029/basic-500-media-r0002/dataset-complete-r0003.json',
  '.vocabflow-local/editorial-refresh-20261029/basic-plus-500-media-r0001/dataset-complete-r0003.json'
];
const items = files.flatMap(f => JSON.parse(readFileSync(f)).items);
const ids = items.map(x => x.runtimeVocabularyId).filter(x => x != null);
assert.equal(new Set(ids).size, 905);
try {
  const out = await db.begin('isolation level repeatable read read only', async tx => {
    const counts = await tx`SELECT source_dataset,count(*)::int AS total,count(*) FILTER (WHERE enabled)::int AS enabled FROM vocabflow_app.vocabularies GROUP BY source_dataset ORDER BY source_dataset`;
    const owned = await tx`SELECT id,word,content_version FROM vocabflow_app.vocabularies WHERE id IN ${tx(ids)} ORDER BY id`;
    assert.equal(owned.length, 905);
    const [max] = await tx`SELECT max(id)::int AS id FROM vocabflow_app.vocabularies`;
    const vocabularyRows = await tx`SELECT id,word,content_version FROM vocabflow_app.vocabularies ORDER BY id`;
    const fks = await tx`SELECT c.conname AS name,c.conrelid::regclass::text AS child,c.confrelid::regclass::text AS parent,c.confdeltype AS delete_action,pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE c.contype='f' AND n.nspname='vocabflow_app' ORDER BY child,name`;
    const dependencies = [];
    for (const table of [...new Set(fks.filter(x => x.parent === 'vocabflow_app.vocabularies').map(x => x.child))]) {
      assert(/^vocabflow_app\.[a-z_0-9]+$/.test(table));
      const [has] = await tx`SELECT count(*)::int AS count FROM information_schema.columns WHERE table_schema='vocabflow_app' AND table_name=${table.split('.')[1]} AND column_name='vocabulary_id'`;
      if (!has.count) continue;
      const [row] = await tx.unsafe(`SELECT count(*)::int AS total,count(*) FILTER (WHERE vocabulary_id IN (${ids.join(',')}))::int AS retained,count(*) FILTER (WHERE vocabulary_id NOT IN (${ids.join(',')}))::int AS removed FROM ${table}`);
      dependencies.push({ table, ...row });
    }
    return { scope: 'DEDICATED_LOCAL_READ_ONLY', packages: files, selectedEntries: items.length, retainRuntimeIds: ids,
      selectedRuntimeRows: owned, vocabularyRows, previousMaximumVocabularyId: max.id, newLocalIdsNeeded: 642, counts, dependencies, foreignKeys: fks };
  });
  const root = '.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001';
  mkdirSync(root, { recursive: true });
  assert(!existsSync(root + '/inventory-r0002.json'), 'Frozen inventory exists; do not overwrite it.');
  writeFileSync(root + '/inventory-r0002.json', JSON.stringify(out, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ counts: out.counts, previousMaximumVocabularyId: out.previousMaximumVocabularyId,
    selectedEntries: 1547, retainedRuntimeRows: 905, newLocalIdsNeeded: 642,
    removeVocabularyRows: out.counts.reduce((n, x) => n + x.total, 0) - 905, dependencies: out.dependencies,
    dependentHistory: out.foreignKeys.filter(x => /review_events$|master_vocabulary_mappings$/.test(x.parent)).map(x => ({ child: x.child, definition: x.definition })) }));
} finally { await db.end({ timeout: 3 }); }
