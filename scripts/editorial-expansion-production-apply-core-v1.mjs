import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';

// This module receives an identity-checked transaction from the release runner.
// It deliberately contains no connection/configuration, DELETE, baseline upsert,
// sequence reset or independent-Master-review claim.
const SOURCE = 'VOCABFLOW_OWNER_EDITORIAL';
const CATALOG = 'owner-production-1547-20261030-r0001';
const EXPANSION = 'production-expansion-4997-20261101-r0001';
const HEX = /^[0-9a-f]{64}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const deferredProposalKeys = Object.freeze([
  '01a19020-3328-770f-981b-ad67d448d3fe', // antihistamine
  '01a19020-334c-7c09-ae91-18bd8a404f08', // painter
  '01a19020-3356-76ad-aec6-f612b501260a', // apiece
]);
const additiveTables = new Set(['vocabularies', 'owner_editorial_projections', 'learning_sets', 'topics', 'learning_set_items', 'vocabulary_topics']);
const integer = value => Number.isSafeInteger(value) && value > 0 && value < 2147483647;
const idsSql = ids => { assert(ids.length && ids.every(integer), 'UNSAFE_OR_EMPTY_ID_SCOPE'); return [...ids].sort((a, b) => a - b).join(','); };
const same = (a, b, code) => assert.deepEqual(a, b, code);

export async function expansionTableFingerprint(tx, table, where = '') {
  assert(/^[a-z_0-9]+$/.test(table), 'UNSAFE_TABLE_IDENTIFIER');
  const [value] = await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${table}" t ${where}`);
  return value;
}

async function protectedState(tx) {
  const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' ORDER BY tablename`;
  const result = {};
  for (const { tablename } of tables) {
    if (!additiveTables.has(tablename)) result[tablename] = await expansionTableFingerprint(tx, tablename);
  }
  const [identity] = await tx`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS sha256 FROM vocabflow_meta.environment_identity t`;
  const [migrations] = await tx`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\n' ORDER BY to_jsonb(t)::text COLLATE "C"),''),'UTF8')),'hex') AS sha256 FROM drizzle.__drizzle_migrations t`;
  return { tables: result, identity, migrations };
}

async function counts(tx) {
  const [value] = await tx`SELECT (SELECT count(*)::int FROM vocabflow_app.vocabularies) AS words,(SELECT count(*)::int FROM vocabflow_app.owner_editorial_projections) AS projections,(SELECT count(*)::int FROM vocabflow_app.learning_sets) AS sets,(SELECT count(*)::int FROM vocabflow_app.topics) AS topics,(SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS old_projections`;
  return { words: value.words, projections: value.projections, sets: value.sets, topics: value.topics, oldProjections: value.old_projections };
}

export async function captureExpansionBaseline(tx) {
  await tx`SET LOCAL TIME ZONE 'UTC'`;
  const vocabulary = await tx`SELECT id FROM vocabflow_app.vocabularies ORDER BY id`;
  const projection = await tx`SELECT vocabulary_id AS id FROM vocabflow_app.owner_editorial_projections ORDER BY vocabulary_id`;
  const learningSets = await tx`SELECT id FROM vocabflow_app.learning_sets ORDER BY id`;
  const topics = await tx`SELECT id FROM vocabflow_app.topics ORDER BY id`;
  const catalog = {
    vocabularies: { ids: vocabulary.map(x => x.id), fingerprint: await expansionTableFingerprint(tx, 'vocabularies') },
    projections: { ids: projection.map(x => x.id), fingerprint: await expansionTableFingerprint(tx, 'owner_editorial_projections') },
    learningSets: { ids: learningSets.map(x => x.id), fingerprint: await expansionTableFingerprint(tx, 'learning_sets') },
    topics: { ids: topics.map(x => x.id), fingerprint: await expansionTableFingerprint(tx, 'topics') },
    setItems: { fingerprint: await expansionTableFingerprint(tx, 'learning_set_items') },
    vocabularyTopics: { fingerprint: await expansionTableFingerprint(tx, 'vocabulary_topics') },
  };
  const [allocation] = await tx`SELECT coalesce((SELECT max(id) FROM vocabflow_app.vocabularies),0)::int AS max_id,coalesce((SELECT last_value FROM pg_sequences WHERE schemaname='vocabflow_app' AND sequencename='vocabularies_id_seq'),0)::bigint AS sequence_last_value,coalesce((SELECT max(source_record_id) FROM vocabflow_app.vocabularies WHERE source_dataset='VOCABFLOW_OWNER_EDITORIAL'),0)::int AS max_source_record_id`;
  return {
    schemaVersion: 1,
    counts: await counts(tx),
    catalog,
    allocation: { maxVocabularyId: allocation.max_id, vocabularySequenceLastValue: Number(allocation.sequence_last_value), maxSourceRecordId: allocation.max_source_record_id },
    protected: await protectedState(tx),
  };
}

function https(url) {
  const value = new URL(url);
  assert(value.protocol === 'https:' && value.hostname === 'res.cloudinary.com' && !value.username && !value.password, 'NON_CLOUDINARY_PUBLICATION_URL');
}

export function validateExpansionPlan(plan) {
  assert.equal(plan.catalogId, CATALOG, 'BASELINE_CATALOG_ID_MUST_REMAIN_STABLE');
  assert.equal(plan.expansionId, EXPANSION, 'UNEXPECTED_EXPANSION_ID');
  assert.equal(plan.sourceDataset, SOURCE, 'UNEXPECTED_SOURCE_DATASET');
  assert.equal(plan.items.length, 4997, 'EXACT_4997_ITEMS_REQUIRED');
  assert.equal(plan.groups.length, 50, 'EXACT_50_TOPICS_REQUIRED');
  assert.equal(plan.lessons.length, 362, 'EXACT_362_LESSONS_REQUIRED');
  assert.equal(plan.baseline.counts.words, 1547, 'EXPECTED_1547_WORD_BASELINE');
  assert.equal(plan.baseline.counts.projections, 1547, 'EXPECTED_1547_PROJECTION_BASELINE');
  assert.equal(plan.baseline.counts.oldProjections, 0, 'OLD_MASTER_PROJECTIONS_MUST_BE_EMPTY');
  const idFloor = Math.max(plan.baseline.allocation.maxVocabularyId, plan.baseline.allocation.vocabularySequenceLastValue);
  const sourceFloor = plan.baseline.allocation.maxSourceRecordId;
  const ids = new Set(), proposals = new Set(), sourceIds = new Set(), groups = new Map(), slugs = new Set(), itemsById = new Map();
  for (const group of plan.groups) {
    assert(typeof group.code === 'string' && group.code.startsWith('expansion5000:') && !groups.has(group.code), 'DUPLICATE_OR_INVALID_TOPIC_CODE');
    assert(/^owner-exp5000-[a-z0-9-]+$/.test(group.slug) && !slugs.has(group.slug), 'DUPLICATE_OR_INVALID_TOPIC_SLUG');
    assert(group.name && group.description && Number.isSafeInteger(group.sortOrder) && group.sortOrder >= 0, 'INVALID_TOPIC_METADATA');
    groups.set(group.code, group);
    slugs.add(group.slug);
  }
  for (const item of plan.items) {
    assert(integer(item.runtimeVocabularyId) && item.runtimeVocabularyId > idFloor && !ids.has(item.runtimeVocabularyId), 'EXISTING_OR_DUPLICATE_RUNTIME_ID');
    assert(integer(item.sourceRecordId) && item.sourceRecordId > sourceFloor && !sourceIds.has(item.sourceRecordId), 'EXISTING_OR_DUPLICATE_SOURCE_ID');
    assert(UUID.test(item.proposalKey) && !proposals.has(item.proposalKey) && !deferredProposalKeys.includes(item.proposalKey), 'DEFERRED_OR_DUPLICATE_PROPOSAL');
    assert.equal(item.contentVersion, 1, 'NEW_CONTENT_VERSION_MUST_BE_ONE');
    assert(HEX.test(item.contentSha256), 'INVALID_CONTENT_HASH');
    assert(item.topicCodes.length === 1 && groups.has(item.topicCodes[0]), 'UNKNOWN_OR_AMBIGUOUS_ITEM_TOPIC');
    const c = item.content;
    assert.equal(createHash('sha256').update(canonicalize(c)).digest('hex'), item.contentSha256, 'PUBLICATION_CONTENT_HASH_MISMATCH');
    assert(c.word && c.meaningVi && c.shortMeaningVi && c.definitionEn && c.partOfSpeech, 'INCOMPLETE_PUBLICATION_TEXT');
    assert(c.cefr === null || ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].includes(c.cefr), 'INVALID_CEFR');
    assert(Array.isArray(c.tags) && Array.isArray(c.examples) && c.examples.length === 1 && c.examples[0].en && c.examples[0].vi, 'INVALID_EXAMPLES_OR_TAGS');
    for (const url of [c.media.image, c.media.wordAudio, c.media.exampleAudio, c.examples[0].audioUrl]) https(url);
    assert.equal(c.examples[0].audioUrl, c.media.exampleAudio, 'EXAMPLE_AUDIO_BINDING_MISMATCH');
    assert(item.mediaEvidence?.length === 3 && item.sourceProvenance && item.classificationEvidence, 'PUBLICATION_EVIDENCE_REQUIRED');
    ids.add(item.runtimeVocabularyId); sourceIds.add(item.sourceRecordId); proposals.add(item.proposalKey);
    itemsById.set(item.runtimeVocabularyId, item);
  }
  const placements = new Set();
  for (const lesson of plan.lessons) {
    assert(/^exp5000-[a-z0-9-]+$/.test(lesson.slug) && !slugs.has(lesson.slug), 'DUPLICATE_OR_INVALID_LESSON_SLUG');
    assert(groups.has(lesson.topicCode), 'UNKNOWN_LESSON_TOPIC');
    assert(lesson.name && lesson.description && Number.isSafeInteger(lesson.sortOrder) && lesson.sortOrder >= 0, 'INVALID_LESSON_METADATA');
    assert(lesson.runtimeVocabularyIds.length > 0 && lesson.runtimeVocabularyIds.length <= 20, 'INVALID_LESSON_SIZE');
    for (const id of lesson.runtimeVocabularyIds) {
      assert(ids.has(id) && !placements.has(id), 'UNKNOWN_OR_DUPLICATE_LESSON_MEMBER');
      assert.equal(itemsById.get(id).topicCodes[0], lesson.topicCode, 'LESSON_TOPIC_MISMATCH');
      placements.add(id);
    }
    slugs.add(lesson.slug);
  }
  assert.equal(placements.size, ids.size, 'LESSON_PARTITION_MISSING_ITEMS');
  return { items: ids.size, groups: groups.size, lessons: plan.lessons.length };
}

function provenanceFor(plan, item, pin) {
  return { ownerPublishedCatalog: { catalogId: plan.catalogId, planSha256: pin, shortMeaningVi: item.content.shortMeaningVi, package: 'expansion5000', ownerSelection: plan.ownerSelection ?? null }, expansionPublication: { expansionId: plan.expansionId, planSha256: pin, sourceRecordId: item.sourceRecordId }, sourceText: item.sourceProvenance, mediaEvidence: item.mediaEvidence, classificationEvidence: item.classificationEvidence, independentMasterPassClaimed: false, canonicalMasterIdentityAssigned: false };
}

async function verifyOriginalCatalog(tx, baseline) {
  const scopes = [
    ['vocabularies', 'id', baseline.catalog.vocabularies],
    ['owner_editorial_projections', 'vocabulary_id', baseline.catalog.projections],
    ['learning_sets', 'id', baseline.catalog.learningSets],
    ['topics', 'id', baseline.catalog.topics],
  ];
  for (const [table, column, saved] of scopes) same(await expansionTableFingerprint(tx, table, `WHERE ${column} IN (${idsSql(saved.ids)})`), saved.fingerprint, `BASELINE_${table.toUpperCase()}_CHANGED`);
  same(await expansionTableFingerprint(tx, 'learning_set_items', `WHERE learning_set_id IN (${idsSql(baseline.catalog.learningSets.ids)})`), baseline.catalog.setItems.fingerprint, 'BASELINE_SET_MEMBERSHIPS_CHANGED');
  same(await expansionTableFingerprint(tx, 'vocabulary_topics', `WHERE topic_id IN (${idsSql(baseline.catalog.topics.ids)})`), baseline.catalog.vocabularyTopics.fingerprint, 'BASELINE_TOPIC_MEMBERSHIPS_CHANGED');
}

export async function verifyExpansion(tx, plan, pin) {
  validateExpansionPlan(plan);
  assert(HEX.test(pin), 'INVALID_PLAN_PIN');
  await verifyOriginalCatalog(tx, plan.baseline);
  const ids = plan.items.map(item => item.runtimeVocabularyId);
  const rows = await tx.unsafe(`SELECT v.id,v.word,v.ipa,v.vietnamese,v.vietnamese_override,v.definition_en,v.example_en,v.image_url,v.audio_url,v.image_quarantined,v.topic,v.level,v.enabled,v.content_version,v.source_dataset,v.source_record_id,p.proposal_key,p.source_group_key,p.content_sha256,p.part_of_speech,p.cefr,p.tags,p.examples,p.source_provenance,p.content_review_decision,p.editorial_status,p.rights_status,p.development_media FROM vocabflow_app.vocabularies v JOIN vocabflow_app.owner_editorial_projections p ON p.vocabulary_id=v.id WHERE v.id IN (${idsSql(ids)}) ORDER BY v.id`);
  assert.equal(rows.length, plan.items.length, 'EXPANSION_ROWS_MISSING');
  const byId = new Map(plan.items.map(item => [item.runtimeVocabularyId, item]));
  for (const row of rows) {
    const item = byId.get(row.id), c = item.content;
    for (const [key, value] of Object.entries({ word: c.word, ipa: null, vietnamese: c.meaningVi, vietnamese_override: null, definition_en: c.definitionEn, example_en: c.examples[0].en, image_url: c.media.image, audio_url: c.media.wordAudio, image_quarantined: false, topic: item.topicLabel ?? plan.groups.find(g => g.code === item.topicCodes[0]).name, level: null, enabled: true, content_version: 1, source_dataset: SOURCE, source_record_id: item.sourceRecordId, proposal_key: item.proposalKey, source_group_key: item.topicCodes[0], content_sha256: item.contentSha256, part_of_speech: c.partOfSpeech, cefr: c.cefr, content_review_decision: 'OWNER_SELECTED_PUBLICATION', editorial_status: 'OWNER_PUBLISHED_CATALOG', rights_status: 'OWNER_ATTESTED_MEDIA_TEXT_PROVENANCE_RETAINED', development_media: null })) assert.equal(row[key], value, `PUBLISHED_${key.toUpperCase()}_MISMATCH`);
    same(row.tags, c.tags, 'PUBLISHED_TAGS_MISMATCH');
    same(row.examples, c.examples, 'PUBLISHED_EXAMPLES_MISMATCH');
    assert.equal(row.source_provenance.ownerPublishedCatalog.catalogId, plan.catalogId);
    assert.equal(row.source_provenance.ownerPublishedCatalog.planSha256, pin);
    assert.equal(row.source_provenance.ownerPublishedCatalog.shortMeaningVi, c.shortMeaningVi);
    assert.equal(row.source_provenance.expansionPublication.expansionId, plan.expansionId);
    assert.equal(row.source_provenance.expansionPublication.planSha256, pin);
    same(row.source_provenance, provenanceFor(plan, item, pin), 'PUBLISHED_PROVENANCE_MISMATCH');
  }
  const topics = await tx`SELECT id,slug,name,description,sort_order,enabled,source_topic,review_status FROM vocabflow_app.topics WHERE slug IN ${tx(plan.groups.map(g => g.slug))} ORDER BY slug`;
  assert.equal(topics.length, plan.groups.length, 'EXPANSION_TOPICS_MISSING');
  const topicIds = new Map();
  for (const group of plan.groups) {
    const topic = topics.find(t => t.slug === group.slug);
    same({ name: topic.name, description: topic.description, sortOrder: topic.sort_order, enabled: topic.enabled, sourceTopic: topic.source_topic, reviewStatus: topic.review_status }, { name: group.name, description: group.description, sortOrder: group.sortOrder, enabled: true, sourceTopic: `owner:${plan.expansionId}:${group.code}`, reviewStatus: 'APPROVED' }, 'EXPANSION_TOPIC_METADATA_CHANGED');
    topicIds.set(group.code, topic.id);
  }
  const sets = await tx`SELECT id,slug,name,description,grade,enabled,sort_order FROM vocabflow_app.learning_sets WHERE slug IN ${tx(plan.lessons.map(l => l.slug))} ORDER BY slug`;
  assert.equal(sets.length, plan.lessons.length, 'EXPANSION_SETS_MISSING');
  const setIds = new Map(sets.map(set => [set.slug, set.id]));
  const placements = await tx`SELECT learning_set_id,vocabulary_id,sort_order FROM vocabflow_app.learning_set_items WHERE learning_set_id IN ${tx(sets.map(s => s.id))} ORDER BY learning_set_id,sort_order,vocabulary_id`;
  const expectedPlacements = [];
  for (const lesson of plan.lessons) {
    const set = sets.find(s => s.slug === lesson.slug);
    same({ name: set.name, description: set.description, grade: set.grade, enabled: set.enabled, sortOrder: set.sort_order }, { name: lesson.name, description: lesson.description, grade: null, enabled: true, sortOrder: lesson.sortOrder }, 'EXPANSION_SET_METADATA_CHANGED');
    lesson.runtimeVocabularyIds.forEach((id, index) => expectedPlacements.push({ learning_set_id: setIds.get(lesson.slug), vocabulary_id: id, sort_order: index }));
  }
  const sortPlacement = (a, b) => a.learning_set_id - b.learning_set_id || a.sort_order - b.sort_order || a.vocabulary_id - b.vocabulary_id;
  same([...placements], expectedPlacements.sort(sortPlacement), 'EXPANSION_LESSON_MEMBERSHIPS_CHANGED');
  const memberships = await tx`SELECT vocabulary_id,topic_id,review_status FROM vocabflow_app.vocabulary_topics WHERE vocabulary_id IN ${tx(ids)} ORDER BY vocabulary_id,topic_id`;
  const expectedMemberships = plan.items.map(item => ({ vocabulary_id: item.runtimeVocabularyId, topic_id: topicIds.get(item.topicCodes[0]), review_status: 'APPROVED' })).sort((a, b) => a.vocabulary_id - b.vocabulary_id || a.topic_id - b.topic_id);
  same([...memberships], expectedMemberships, 'EXPANSION_TOPIC_MEMBERSHIPS_CHANGED');
  const total = await counts(tx);
  same(total, { words: plan.baseline.counts.words + 4997, projections: plan.baseline.counts.projections + 4997, sets: plan.baseline.counts.sets + 362, topics: plan.baseline.counts.topics + 50, oldProjections: 0 }, 'UNEXPECTED_FINAL_CATALOG_COUNTS');
  return total;
}

export async function applyExpansion(tx, plan, pin) {
  validateExpansionPlan(plan);
  assert(HEX.test(pin), 'INVALID_PLAN_PIN');
  await tx`SET LOCAL TIME ZONE 'UTC'`;
  await tx`SET LOCAL lock_timeout='15s'`;
  await tx`SET LOCAL statement_timeout='180s'`;
  await tx`SELECT pg_advisory_xact_lock(89421732)`;
  await tx`LOCK TABLE vocabflow_app.vocabularies,vocabflow_app.owner_editorial_projections,vocabflow_app.learning_sets,vocabflow_app.topics,vocabflow_app.learning_set_items,vocabflow_app.vocabulary_topics IN SHARE ROW EXCLUSIVE MODE`;
  const existing = await tx`SELECT vocabulary_id FROM vocabflow_app.owner_editorial_projections WHERE proposal_key IN ${tx(plan.items.map(item => item.proposalKey))}`;
  if (existing.length) {
    assert.equal(existing.length, 4997, 'PARTIAL_EXPANSION_REQUIRES_REVIEW');
    return { status: 'ALREADY_APPLIED_NO_WRITES', counts: await verifyExpansion(tx, plan, pin) };
  }
  same(await counts(tx), plan.baseline.counts, 'CATALOG_COUNT_CHANGED_SINCE_PLAN');
  await verifyOriginalCatalog(tx, plan.baseline);
  const protectedBefore = await protectedState(tx);
  const vocab = plan.items.map(item => ({ id: item.runtimeVocabularyId, word: item.content.word, ipa: null, vietnamese: item.content.meaningVi, vietnamese_override: null, definition_en: item.content.definitionEn, example_en: item.content.examples[0].en, image_url: item.content.media.image, audio_url: item.content.media.wordAudio, image_quarantined: false, topic: item.topicLabel ?? plan.groups.find(g => g.code === item.topicCodes[0]).name, level: null, enabled: true, content_version: 1, source_dataset: SOURCE, source_record_id: item.sourceRecordId }));
  for (let n = 0; n < vocab.length; n += 100) await tx`INSERT INTO vocabflow_app.vocabularies ${tx(vocab.slice(n, n + 100))}`;
  const projections = plan.items.map(item => ({ proposal_key: item.proposalKey, source_group_key: item.topicCodes[0], vocabulary_id: item.runtimeVocabularyId, part_of_speech: item.content.partOfSpeech, cefr: item.content.cefr, tags: JSON.stringify(item.content.tags), examples: JSON.stringify(item.content.examples), content_sha256: item.contentSha256,
    source_provenance: JSON.stringify(provenanceFor(plan, item, pin)) }));
  for (let n = 0; n < projections.length; n += 100) await tx`INSERT INTO vocabflow_app.owner_editorial_projections ${tx(projections.slice(n, n + 100))}`;
  const topicIds = new Map();
  for (const group of plan.groups) {
    const [topic] = await tx`INSERT INTO vocabflow_app.topics(slug,name,description,sort_order,enabled,source_topic,review_status) VALUES(${group.slug},${group.name},${group.description},${group.sortOrder},true,${`owner:${plan.expansionId}:${group.code}`},'APPROVED') RETURNING id`;
    topicIds.set(group.code, topic.id);
  }
  const collections = [], placements = [];
  for (const lesson of plan.lessons) {
    const [set] = await tx`INSERT INTO vocabflow_app.learning_sets(slug,name,description,grade,enabled,sort_order) VALUES(${lesson.slug},${lesson.name},${lesson.description},NULL,true,${lesson.sortOrder}) RETURNING id`;
    lesson.runtimeVocabularyIds.forEach((id, index) => placements.push({ learning_set_id: set.id, vocabulary_id: id, sort_order: index }));
    collections.push({ id: set.id, slug: lesson.slug, count: lesson.runtimeVocabularyIds.length });
  }
  const memberships = plan.items.map(item => ({ vocabulary_id: item.runtimeVocabularyId, topic_id: topicIds.get(item.topicCodes[0]), review_status: 'APPROVED' }));
  for (let n = 0; n < placements.length; n += 200) await tx`INSERT INTO vocabflow_app.learning_set_items ${tx(placements.slice(n, n + 200))}`;
  for (let n = 0; n < memberships.length; n += 200) await tx`INSERT INTO vocabflow_app.vocabulary_topics ${tx(memberships.slice(n, n + 200))}`;
  const verified = await verifyExpansion(tx, plan, pin);
  const protectedAfter = await protectedState(tx);
  same(protectedAfter, protectedBefore, 'PROTECTED_NONCATALOG_STATE_CHANGED');
  return { status: 'APPLIED_ADDITIVE', expansionId: plan.expansionId, planSha256: pin, counts: verified, addedWords: vocab.length, addedTopics: topicIds.size, addedLessons: collections.length, collections, protectedBefore, protectedAfter, existingRowsUpdated: 0, rowsDeleted: 0, canonicalMasterAllocations: 0, sequenceResetPerformed: false };
}
