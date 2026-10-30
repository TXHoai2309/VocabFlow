import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const OUT = '.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001';
const PLAN = 'vocabflow-dataset/workspaces/editorial-refresh-20261030/owned-catalog-r0001/catalog-plan-r0001.json';
const PIN = '09c1dcf07f9e9b76e3d45bfbf758b0171d92cae57d3ba15b52eebd8c1b68eef3';
const sha = x => createHash('sha256').update(x).digest('hex');
const raw = readFileSync(PLAN); assert.equal(sha(raw), PIN); const plan = JSON.parse(raw);
const inventory = JSON.parse(readFileSync(plan.inventory.path)); assert.equal(sha(readFileSync(plan.inventory.path)), plan.inventory.sha256);
const backup = JSON.parse(readFileSync(`${OUT}/backup.json`));
assert.equal(backup.restoreRehearsal, 'PASS'); assert.equal(sha(readFileSync(backup.path)), backup.sha256);
for (const source of [...plan.sourcePins, plan.ownerSelection, ...plan.textSourceNotices]) assert.equal(sha(readFileSync(source.path)), source.sha256);
assert.equal(plan.productionEligible, false); assert.equal(plan.items.length, 1547);
const keep = plan.retainedRuntimeIds; const retired = plan.retiredRuntimeIds;
const expectedIds = plan.items.map(x => x.runtimeVocabularyId).sort((a, b) => a - b);
assert.equal(keep.length, 905); assert.equal(retired.length, 6436); assert.equal(new Set(expectedIds).size, 1547);
const envPath = '.vocabflow-local/development.env'; const originalEnv = readFileSync(envPath, 'utf8'); const env = parseEnv(originalEnv);
const target = new URL(env.DATABASE_MIGRATION_URL);
assert(target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/vocabflow_dev' && decodeURIComponent(target.username) === 'vocabflow_migration');
assert(env.DATABASE_DRIVER === 'postgres-js' && env.VOCABFLOW_ENV === 'development' && env.DATABASE_ENV === 'development' && env.EXECUTION_CONTEXT === 'local-development' && !env.VERCEL_ENV);
const db = postgres(target.toString(), { max: 1, prepare: false, onnotice: () => {} });
const save = (file, data) => writeFileSync(`${OUT}/${file}`, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });
const mutable = new Set(['vocabularies','master_v2_development_projections','master_v2_short_meanings','master_learning_set_memberships','master_vocabulary_topic_memberships','master_learning_set_mappings','master_topic_mappings','master_vocabulary_mappings','learning_set_items','vocabulary_topics','learner_learning_sets','learning_sets','topics','review_events','learner_progress','learner_saved_vocabulary','owner_editorial_local_projections']);
async function fingerprint(tx, table, where = '') {
  assert(/^[a-z_0-9]+$/.test(table));
  const [row] = await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t ${where}`);
  return row;
}
async function protectedState(tx) {
  const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' ORDER BY tablename`;
  const out = {};
  for (const { tablename } of tables) if (!mutable.has(tablename)) out[tablename] = await fingerprint(tx, tablename);
  for (const table of ['learner_progress', 'review_events', 'learner_saved_vocabulary']) out[table + '_retained'] = await fingerprint(tx, table, `WHERE vocabulary_id IN (${keep.join(',')})`);
  return out;
}
async function verify(tx) {
  const rows = await tx`SELECT v.id,v.word,v.content_version,v.source_dataset,p.content_sha256,p.content_review_decision,p.source_provenance->'ownerEditorialCatalog'->>'planSha256' AS plan_pin FROM vocabflow_app.vocabularies v LEFT JOIN vocabflow_app.owner_editorial_local_projections p ON p.vocabulary_id=v.id ORDER BY v.id`;
  assert.deepEqual(rows.map(x => x.id), expectedIds);
  for (const row of rows) {
    const expected = plan.items.find(x => x.runtimeVocabularyId === row.id);
    assert.equal(row.word, expected.content.word); assert.equal(row.content_version, expected.contentVersion);
    assert.equal(row.source_dataset, plan.sourceDataset); assert.equal(row.content_sha256, expected.contentSha256);
    assert.equal(row.content_review_decision, 'OWNER_SELECTED_LOCAL'); assert.equal(row.plan_pin, PIN);
  }
  const [counts] = await tx`SELECT (SELECT count(*)::int FROM vocabflow_app.owner_editorial_local_projections) AS projections,(SELECT count(*)::int FROM vocabflow_app.learning_sets) AS sets,(SELECT count(*)::int FROM vocabflow_app.topics) AS topics,(SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS old_projections,(SELECT count(*)::int FROM vocabflow_app.vocabularies WHERE image_url IS NOT NULL AND audio_url IS NOT NULL AND enabled=true) AS media_ready`;
  assert.deepEqual(counts, { projections: 1547, sets: 76, topics: 73, old_projections: 0, media_ready: 1547 });
  return counts;
}
try {
  const [identity] = await db`SELECT current_database() AS name,session_user AS role,(SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider`;
  assert.deepEqual(identity, { name: 'vocabflow_dev', role: 'vocabflow_migration', provider: 'docker-local' });
  if (!process.argv.includes('--apply')) {
    const live = await db`SELECT id,word,content_version FROM vocabflow_app.vocabularies ORDER BY id`;
    assert.deepEqual([...live], inventory.vocabularyRows);
    console.log(JSON.stringify({ status: 'OWNER_CATALOG_PREFLIGHT_PASS_NO_WRITES', counts: plan.counts, restoreRehearsal: 'PASS', planSha256: PIN }));
  } else {
    const prior = existsSync(`${OUT}/application-result.json`) ? JSON.parse(readFileSync(`${OUT}/application-result.json`)) : null;
    if (prior) assert.equal(prior.planSha256, PIN);
    const childEnv = {};
    for (const k of ['PATH','Path','SystemRoot','windir','ComSpec','PATHEXT','USERPROFILE','APPDATA','LOCALAPPDATA','TEMP','TMP']) if (process.env[k]) childEnv[k] = process.env[k];
    Object.assign(childEnv, env);
    if (!prior) {
      for (const asset of plan.assets) { const bytes = readFileSync(asset.repoRelativePath); assert.equal(sha(bytes), asset.sha256); assert.equal(bytes.length, asset.byteLength); }
      const migrate = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/local-development-postgres.ts', 'migrate'], { env: childEnv, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, timeout: 120000, windowsHide: true });
      assert(migrate.status === 0 && migrate.stdout.includes('LOCAL_POSTGRES_MIGRATIONS=PASS'), 'TRUSTED_LOCAL_MIGRATION_FAILED');
    }
    const previousHistory = JSON.parse(readFileSync(`${OUT}/before.json`)).history;
    const history = [...await db`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`];
    assert.deepEqual(history.slice(0, previousHistory.length), previousHistory, 'MIGRATION_HISTORY_PREFIX_CHANGED');
    assert.equal(history.length, previousHistory.length + 1);
    assert.equal(history.at(-1).hash, sha(readFileSync('drizzle/migrations/0023_owner_editorial_local.sql')));
    const [access] = await db`SELECT has_table_privilege('vocabflow_runtime','vocabflow_app.owner_editorial_local_projections','SELECT') AS readable`;
    assert.equal(access.readable, true, 'OWNER_PROJECTION_RUNTIME_READ_ACCESS_MISSING');
    const report = await db.begin('isolation level serializable', async tx => {
      await tx`SET LOCAL statement_timeout='90s'`; await tx`SET LOCAL lock_timeout='8s'`;
      await tx`SELECT pg_advisory_xact_lock(20261030,1547)`;
      await tx`LOCK TABLE vocabflow_app.vocabularies,vocabflow_app.learner_progress,vocabflow_app.review_events,vocabflow_app.learner_saved_vocabulary IN SHARE ROW EXCLUSIVE MODE`;
      const before = await protectedState(tx);
      const [already] = await tx`SELECT count(*)::int AS count FROM vocabflow_app.owner_editorial_local_projections`;
      if (already.count === 1547) { await verify(tx); return { ...(prior ?? {}), status: 'ALREADY_APPLIED_NO_WRITES', planSha256: PIN, protectedAfter: before }; }
      assert.equal(already.count, 0); assert(!prior, 'RECORDED_APPLY_MISSING');
      const live = await tx`SELECT id,word,content_version FROM vocabflow_app.vocabularies ORDER BY id`;
      assert.deepEqual([...live], inventory.vocabularyRows, 'VOCABULARY_DRIFT_SINCE_FROZEN_PLAN');
      const removed = {};
      for (const table of ['master_learning_set_memberships','master_vocabulary_topic_memberships','master_learning_set_mappings','master_topic_mappings','master_vocabulary_mappings','master_v2_short_meanings','master_v2_development_projections','learning_set_items','vocabulary_topics','learner_learning_sets']) {
        const result = await tx.unsafe(`DELETE FROM vocabflow_app."${table}"`); removed[table] = result.count;
      }
      for (const table of ['review_events','learner_saved_vocabulary','learner_progress']) {
        const result = await tx.unsafe(`DELETE FROM vocabflow_app."${table}" WHERE vocabulary_id IN (${retired.join(',')})`); removed[table] = result.count;
      }
      removed.learning_sets = (await tx`DELETE FROM vocabflow_app.learning_sets`).count;
      removed.topics = (await tx`DELETE FROM vocabflow_app.topics`).count;
      removed.vocabularies = (await tx`DELETE FROM vocabflow_app.vocabularies WHERE id IN ${tx(retired)}`).count;
      assert.equal(removed.vocabularies, 6436);
      for (const [index, item] of plan.items.entries()) {
        const c = item.content; const example = c.examples[0];
        if (item.retainedRuntimeId) {
          const update = await tx`UPDATE vocabflow_app.vocabularies SET word=${c.word},ipa=NULL,vietnamese=${c.meaningVi},vietnamese_override=NULL,definition_en=${c.definitionEn},example_en=${example.en},image_url=${c.media.image},audio_url=${c.media.wordAudio},image_quarantined=false,topic=${item.topicLabel},level=NULL,enabled=true,content_version=${item.contentVersion},source_dataset=${plan.sourceDataset},source_record_id=${index + 1},updated_at=now() WHERE id=${item.runtimeVocabularyId} AND content_version=${item.contentVersion - 1} RETURNING id`;
          assert.equal(update.length, 1);
        } else {
          await tx`INSERT INTO vocabflow_app.vocabularies(id,word,vietnamese,definition_en,example_en,image_url,audio_url,topic,enabled,content_version,source_dataset,source_record_id) VALUES(${item.runtimeVocabularyId},${c.word},${c.meaningVi},${c.definitionEn},${example.en},${c.media.image},${c.media.wordAudio},${item.topicLabel},true,1,${plan.sourceDataset},${index + 1})`;
        }
        const provenance = { ownerEditorialCatalog: { catalogId: plan.catalogId, planSha256: PIN, shortMeaningVi: c.shortMeaningVi, package: item.package, ownerSelection: plan.ownerSelection, sourceItemContentSha256: item.sourceItemContentSha256 }, sourceText: item.sourceProvenance, classificationEvidence: item.classificationEvidence, mediaEvidence: item.mediaEvidence, independentReviewClaim: false, canonicalMasterIdentityAssigned: false };
        await tx`INSERT INTO vocabflow_app.owner_editorial_local_projections(proposal_key,source_group_key,vocabulary_id,part_of_speech,cefr,tags,examples,source_provenance,content_sha256) VALUES(${item.proposalKey},${item.topicCodes[0]},${item.runtimeVocabularyId},${c.partOfSpeech},${c.cefr},${tx.json(c.tags)},${tx.json(c.examples)},${tx.json(provenance)},${item.contentSha256})`;
      }
      const collections = [];
      const packageNames = { expansion547: 'Từ vựng mở rộng · 547 từ', basic500: 'Từ vựng cơ bản · 500 từ', basicplus500: 'Từ vựng cơ bản mở rộng · 500 từ' };
      for (const [order, [code, name]] of Object.entries(packageNames).entries()) {
        const [set] = await tx`INSERT INTO vocabflow_app.learning_sets(slug,name,description,grade,enabled,sort_order) VALUES(${'owned-' + code},${name},'Từ vựng có hình minh họa, phát âm và câu ví dụ.',NULL,true,${order}) RETURNING id,slug`;
        const members = plan.items.filter(x => x.package === code);
        for (const [position, member] of members.entries()) await tx`INSERT INTO vocabflow_app.learning_set_items(learning_set_id,vocabulary_id,sort_order) VALUES(${set.id},${member.runtimeVocabularyId},${position})`;
        collections.push({ ...set, count: members.length });
      }
      for (const group of plan.groups) {
        const [topic] = await tx`INSERT INTO vocabflow_app.topics(slug,name,description,sort_order,enabled,source_topic,review_status) VALUES(${group.slug},${group.name},${group.description},${group.sortOrder},true,${'owner:' + plan.catalogId + ':' + group.code},'APPROVED') RETURNING id`;
        const [set] = await tx`INSERT INTO vocabflow_app.learning_sets(slug,name,description,grade,enabled,sort_order) VALUES(${group.slug},${group.name},${group.description},NULL,true,${group.sortOrder + 10}) RETURNING id,slug`;
        const members = plan.items.filter(x => x.topicCodes.includes(group.code)); assert(members.length);
        for (const [position, member] of members.entries()) {
          await tx`INSERT INTO vocabflow_app.learning_set_items(learning_set_id,vocabulary_id,sort_order) VALUES(${set.id},${member.runtimeVocabularyId},${position})`;
          await tx`INSERT INTO vocabflow_app.vocabulary_topics(vocabulary_id,topic_id,review_status) VALUES(${member.runtimeVocabularyId},${topic.id},'APPROVED')`;
        }
        collections.push({ ...set, topicId: topic.id, count: members.length });
      }
      const counts = await verify(tx); const after = await protectedState(tx);
      assert.deepEqual(after, before, 'NONLEXICAL_OR_RETAINED_PROGRESS_CHANGED');
      const [sequence] = await tx`SELECT last_value FROM pg_sequences WHERE schemaname='vocabflow_app' AND sequencename='vocabularies_id_seq'`;
      assert(sequence);
      await tx`SELECT setval(pg_get_serial_sequence('vocabflow_app.vocabularies','id'),${Math.max(Number(sequence.last_value ?? 0), ...expectedIds)},true)`;
      return { artifactType: 'OWNER_CATALOG_LOCAL_APPLICATION', status: 'APPLIED_LOCAL_ONLY', catalogId: plan.catalogId, planSha256: PIN, counts, removed, collections,
        retainedRuntimeIds: 905, newLocalRuntimeIds: 642, protectedBefore: before, protectedAfter: after, migrationHistory: history, newCanonicalIds: 0, newProviderJobs: 0, remoteWrites: 0 };
    });
    if (!prior) save('application-result.json', report);
    const nextEnv = originalEnv.match(/^VOCAB_DATASET_VERSION=.*$/m) ? originalEnv.replace(/^VOCAB_DATASET_VERSION=.*$/m, 'VOCAB_DATASET_VERSION=owner-local') : originalEnv + '\nVOCAB_DATASET_VERSION=owner-local\n';
    const previous = { ...env }; delete previous.VOCAB_DATASET_VERSION;
    const next = parseEnv(nextEnv); delete next.VOCAB_DATASET_VERSION; assert.deepEqual(next, previous);
    if (nextEnv !== originalEnv) writeFileSync(envPath, nextEnv);
    console.log(JSON.stringify({ status: report.status, catalogId: plan.catalogId, words: 1547, datasets: 3, topics: 73, collections: 76, retiredVocabularyRows: 6436, activeDatasetMode: 'owner-local' }));
  }
} finally { await db.end({ timeout: 3 }); }
