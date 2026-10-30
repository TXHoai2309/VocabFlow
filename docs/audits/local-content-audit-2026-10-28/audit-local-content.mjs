import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

// Intentionally ignores shell DATABASE_URL and the remote .env/.env.local files.
const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));
const localEnv = parseEnv(await readFile(new URL('../../../.vocabflow-local/development.env', import.meta.url), 'utf8'));
const connection = new URL(localEnv.DATABASE_URL);
if (!['postgres:', 'postgresql:'].includes(connection.protocol)
  || !['127.0.0.1', 'localhost', '[::1]'].includes(connection.hostname)
  || connection.port !== '55432' || connection.pathname !== '/vocabflow_dev') {
  throw new Error('REFUSED: expected the dedicated local development database');
}
const sql = postgres(connection.toString(), {
  max: 1, prepare: false, connect_timeout: 10,
  connection: { application_name: 'local-content-audit-2026-10-28', default_transaction_read_only: 'on' }
});
const queries = {};
const metrics = {};
try {
  await sql.begin('isolation level repeatable read read only', async tx => {
    await tx.unsafe("SET LOCAL statement_timeout = '30s'");
    await tx.unsafe("SET LOCAL lock_timeout = '2s'");
    const query = async (name, statement) => {
      queries[name] = statement;
      metrics[name] = await tx.unsafe(statement);
      return metrics[name];
    };
    await query('transaction', `SELECT current_database() AS database, current_setting('transaction_read_only') AS read_only,
      current_setting('transaction_isolation') AS isolation, now() AS captured_at`);
    await query('tables', `SELECT table_schema, table_name FROM information_schema.tables
      WHERE table_schema IN ('vocabflow_app', 'vocabflow_editorial_staging') AND table_type = 'BASE TABLE'
      ORDER BY table_schema, table_name`);
    await query('schema_compatibility', `SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'vocabflow_app' AND ((table_name = 'topics' AND column_name IN ('review_status','parent_topic_id'))
      OR (table_name = 'vocabulary_topics' AND column_name = 'review_status')
      OR (table_name = 'learner_profiles' AND column_name = 'flashcard_display_mode')
      OR table_name = 'master_v2_short_meanings') ORDER BY table_name, column_name`);
    await query('runtime_grade_enum', `SELECT e.enumlabel AS value FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
      JOIN pg_enum e ON e.enumtypid=t.oid WHERE n.nspname='vocabflow_app' AND t.typname='vocabulary_level' ORDER BY e.enumsortorder`);
    await query('vocabulary_by_source', `SELECT source_dataset, enabled, count(*)::int AS rows,
      count(DISTINCT lower(trim(word)))::int AS normalized_headwords,
      count(*) FILTER (WHERE level IS NOT NULL)::int AS grade_assigned,
      min(created_at) AS first_created_at, max(updated_at) AS last_updated_at
      FROM vocabflow_app.vocabularies GROUP BY source_dataset, enabled ORDER BY source_dataset, enabled`);
    await query('cefr', `SELECT coalesce(md.cefr, '(unknown)') AS cefr, count(*)::int AS senses,
      count(DISTINCT lower(trim(v.word)))::int AS headwords
      FROM vocabflow_app.master_v2_development_projections md JOIN vocabflow_app.vocabularies v ON v.id=md.vocabulary_id
      WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV' GROUP BY md.cefr ORDER BY md.cefr NULLS LAST`);
    await query('v2_content_coverage', `SELECT count(*)::int AS senses,
      count(DISTINCT lower(trim(v.word)))::int AS headwords,
      count(*) FILTER (WHERE nullif(trim(v.ipa),'') IS NOT NULL)::int AS ipa,
      count(*) FILTER (WHERE nullif(trim(v.image_url),'') IS NOT NULL)::int AS legacy_image_url,
      count(*) FILTER (WHERE nullif(trim(v.audio_url),'') IS NOT NULL)::int AS legacy_audio_url,
      count(*) FILTER (WHERE nullif(trim(v.vietnamese),'') IS NULL)::int AS missing_vietnamese,
      count(*) FILTER (WHERE nullif(trim(v.definition_en),'') IS NOT NULL)::int AS definition_en,
      count(*) FILTER (WHERE nullif(trim(v.example_en),'') IS NOT NULL)::int AS example_en,
      count(*) FILTER (WHERE jsonb_array_length(md.examples)>0)::int AS with_examples,
      count(*) FILTER (WHERE jsonb_array_length(coalesce(md.development_media->'images','[]'::jsonb))>0)::int AS with_images,
      count(*) FILTER (WHERE jsonb_array_length(coalesce(md.development_media->'wordAudio','[]'::jsonb))>0)::int AS with_word_audio,
      count(*) FILTER (WHERE jsonb_array_length(coalesce(md.development_media->'exampleAudio','[]'::jsonb))>0)::int AS with_example_audio
      FROM vocabflow_app.vocabularies v JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id=v.id
      WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV'`);
    await query('projection_status', `SELECT content_review_decision, editorial_status, rights_status, count(*)::int AS senses
      FROM vocabflow_app.master_v2_development_projections GROUP BY 1,2,3 ORDER BY 1,2,3`);
    await query('sets', `SELECT ls.id, ls.slug, ls.name, ls.grade, ls.enabled, count(lsi.vocabulary_id)::int AS all_items,
      count(*) FILTER (WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV')::int AS enabled_v2_items,
      count(*) FILTER (WHERE v.enabled AND v.source_dataset IS DISTINCT FROM 'VOCABFLOW_MASTER_V2_DEV')::int AS enabled_legacy_items
      FROM vocabflow_app.learning_sets ls LEFT JOIN vocabflow_app.learning_set_items lsi ON lsi.learning_set_id=ls.id
      LEFT JOIN vocabflow_app.vocabularies v ON v.id=lsi.vocabulary_id GROUP BY ls.id ORDER BY ls.id`);
    await query('v2_membership_coverage', `SELECT count(*)::int AS senses,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM vocabflow_app.learning_set_items lsi JOIN vocabflow_app.learning_sets ls
        ON ls.id=lsi.learning_set_id AND ls.enabled WHERE lsi.vocabulary_id=v.id))::int AS in_enabled_sets,
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM vocabflow_app.vocabulary_topics vt JOIN vocabflow_app.topics t
        ON t.id=vt.topic_id AND t.enabled WHERE vt.vocabulary_id=v.id))::int AS in_enabled_topics
      FROM vocabflow_app.vocabularies v WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV'`);
    await query('topic_inventory', `SELECT count(*)::int AS topics, count(*) FILTER(WHERE enabled)::int AS enabled_topics FROM vocabflow_app.topics`);
    await query('topic_links', `SELECT count(*)::int AS links FROM vocabflow_app.vocabulary_topics`);
    await query('duplicate_headwords', `WITH grouped AS (SELECT lower(trim(v.word)) AS headword, count(*)::int AS senses,
      count(DISTINCT md.part_of_speech)::int AS parts_of_speech FROM vocabflow_app.vocabularies v
      JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id=v.id
      WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV' GROUP BY 1)
      SELECT count(*) FILTER(WHERE senses>1)::int AS multisense_headwords,
      coalesce(sum(senses-1) FILTER(WHERE senses>1),0)::int AS rows_above_one_per_headword,
      max(senses)::int AS maximum_senses FROM grouped`);
    await query('duplicate_sample', `SELECT lower(trim(v.word)) AS headword, count(*)::int AS senses,
      array_agg(DISTINCT md.part_of_speech ORDER BY md.part_of_speech) AS parts_of_speech
      FROM vocabflow_app.vocabularies v JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id=v.id
      WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV' GROUP BY 1 HAVING count(*)>1 ORDER BY count(*) DESC, 1 LIMIT 12`);
    await query('provenance_keys', `SELECT key, count(*)::int AS senses FROM vocabflow_app.master_v2_development_projections,
      LATERAL jsonb_object_keys(source_provenance) AS key GROUP BY key ORDER BY key`);
    await query('provenance_metadata_keys', `SELECT key, count(*)::int AS senses FROM vocabflow_app.master_v2_development_projections,
      LATERAL jsonb_object_keys(coalesce(source_provenance->'developmentLearningMetadataV1','{}'::jsonb)) AS key GROUP BY key ORDER BY key`);
    await query('placement_metadata', `SELECT count(*)::int AS senses,
      count(*) FILTER(WHERE jsonb_array_length(coalesce(source_provenance->'developmentLearningMetadataV1'->'schoolGrades','[]'::jsonb))>0)::int AS with_school_grades,
      count(*) FILTER(WHERE jsonb_array_length(coalesce(source_provenance->'developmentLearningMetadataV1'->'ageGroups','[]'::jsonb))>0)::int AS with_age_groups,
      count(*) FILTER(WHERE source_provenance->'developmentLearningMetadataV1'->'cefr' IS NOT NULL
        AND source_provenance->'developmentLearningMetadataV1'->'cefr' <> 'null'::jsonb)::int AS with_cefr_evidence_object
      FROM vocabflow_app.master_v2_development_projections`);
    await query('cefr_evidence_status', `SELECT source_provenance->'developmentLearningMetadataV1'->'cefr'->>'status' AS status,
      count(*)::int AS senses FROM vocabflow_app.master_v2_development_projections GROUP BY 1 ORDER BY 1 NULLS LAST`);
    await query('local_restore_lineage', `SELECT source_provenance->'localDockerRestoreLineage'->>'mediaPolicy' AS media_policy,
      count(*)::int AS senses FROM vocabflow_app.master_v2_development_projections GROUP BY 1`);
    await query('v2_pos', `SELECT md.part_of_speech, count(*)::int AS senses
      FROM vocabflow_app.master_v2_development_projections md JOIN vocabflow_app.vocabularies v ON v.id=md.vocabulary_id
      WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV' GROUP BY 1 ORDER BY count(*) DESC`);
    await query('example_coverage', `SELECT count(*)::int AS total_examples,
      count(*) FILTER(WHERE nullif(trim(e->>'en'),'') IS NOT NULL)::int AS has_en_key,
      count(*) FILTER(WHERE nullif(trim(e->>'vi'),'') IS NOT NULL)::int AS has_vi_key
      FROM vocabflow_app.master_v2_development_projections p, LATERAL jsonb_array_elements(p.examples) AS e`);
    await query('example_shape', `SELECT key, count(*)::int AS examples FROM
      (SELECT e FROM vocabflow_app.master_v2_development_projections p, LATERAL jsonb_array_elements(p.examples) AS e LIMIT 30) sample,
      LATERAL jsonb_object_keys(sample.e) AS key GROUP BY key ORDER BY key`);
    await query('beginner_sense_sample', `SELECT v.id AS vocabulary_id, v.word, md.part_of_speech, md.cefr,
      left(coalesce(v.vietnamese_override,v.vietnamese),180) AS vietnamese, left(v.example_en,180) AS example_en
      FROM vocabflow_app.vocabularies v JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id=v.id
      WHERE v.enabled AND v.source_dataset='VOCABFLOW_MASTER_V2_DEV' AND lower(trim(v.word)) IN ('one','book','blue','dog','apple','zero')
      ORDER BY v.word,v.id LIMIT 20`);
    await query('identity_links', `SELECT 'projection_without_vocab' AS issue, count(*)::int AS rows
      FROM vocabflow_app.master_v2_development_projections p LEFT JOIN vocabflow_app.vocabularies v ON v.id=p.vocabulary_id WHERE v.id IS NULL
      UNION ALL SELECT 'v2_vocab_without_projection', count(*)::int FROM vocabflow_app.vocabularies v
      LEFT JOIN vocabflow_app.master_v2_development_projections p ON p.vocabulary_id=v.id
      WHERE v.source_dataset='VOCABFLOW_MASTER_V2_DEV' AND p.vocabulary_id IS NULL
      UNION ALL SELECT 'set_item_missing_vocab',count(*)::int FROM vocabflow_app.learning_set_items l LEFT JOIN vocabflow_app.vocabularies v ON v.id=l.vocabulary_id WHERE v.id IS NULL
      UNION ALL SELECT 'set_item_missing_set',count(*)::int FROM vocabflow_app.learning_set_items l LEFT JOIN vocabflow_app.learning_sets s ON s.id=l.learning_set_id WHERE s.id IS NULL
      UNION ALL SELECT 'topic_link_missing_vocab',count(*)::int FROM vocabflow_app.vocabulary_topics l LEFT JOIN vocabflow_app.vocabularies v ON v.id=l.vocabulary_id WHERE v.id IS NULL
      UNION ALL SELECT 'topic_link_missing_topic',count(*)::int FROM vocabflow_app.vocabulary_topics l LEFT JOIN vocabflow_app.topics t ON t.id=l.topic_id WHERE t.id IS NULL
      UNION ALL SELECT 'progress_missing_vocab',count(*)::int FROM vocabflow_app.learner_progress l LEFT JOIN vocabflow_app.vocabularies v ON v.id=l.vocabulary_id WHERE v.id IS NULL
      UNION ALL SELECT 'review_missing_vocab',count(*)::int FROM vocabflow_app.review_events l LEFT JOIN vocabflow_app.vocabularies v ON v.id=l.vocabulary_id WHERE v.id IS NULL
      UNION ALL SELECT 'saved_missing_vocab',count(*)::int FROM vocabflow_app.learner_saved_vocabulary l LEFT JOIN vocabflow_app.vocabularies v ON v.id=l.vocabulary_id WHERE v.id IS NULL`);
    await query('canonical_bridge', `SELECT (SELECT count(*)::int FROM vocabflow_app.master_vocabulary_mappings) AS canonical_mappings,
      (SELECT count(*)::int FROM vocabflow_app.master_learning_set_memberships) AS canonical_set_memberships,
      (SELECT count(*)::int FROM vocabflow_app.master_vocabulary_topic_memberships) AS canonical_topic_memberships`);
    await query('beginner_candidates', `WITH requested(word) AS (VALUES ('a'),('b'),('c'),('one'),('two'),('three'),('four'),('five'),('six'),('seven'),('eight'),('nine'),('ten'),
      ('zero'),('red'),('blue'),('yellow'),('green'),('cat'),('dog'),('apple'),('banana'),('book'),('pen'),('pencil'),('mother'),('father'),('hello'),('goodbye'),('ball'),('hand'),('eye'),('nose'),('ear'),('mouth'))
      SELECT r.word, count(v.id) FILTER(WHERE v.source_dataset='VOCABFLOW_MASTER_V2_DEV')::int AS enabled_v2_senses,
      count(v.id) FILTER(WHERE v.source_dataset IS DISTINCT FROM 'VOCABFLOW_MASTER_V2_DEV')::int AS enabled_legacy_senses,
      array_agg(DISTINCT md.cefr) FILTER(WHERE md.cefr IS NOT NULL) AS cefr
      FROM requested r LEFT JOIN vocabflow_app.vocabularies v ON lower(trim(v.word))=r.word AND v.enabled
      LEFT JOIN vocabflow_app.master_v2_development_projections md ON md.vocabulary_id=v.id GROUP BY r.word ORDER BY r.word`);
  });
  const output = { scope: 'local Docker PostgreSQL only; no remote DB or API requests', repoRoot,
    connectionFile: '.vocabflow-local/development.env', target: { hostname: connection.hostname, port: connection.port, database: connection.pathname.slice(1) },
    metrics, queries };
  await writeFile(new URL('metrics.json', import.meta.url), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(metrics, null, 2));
} finally {
  await sql.end({ timeout: 3 });
}
