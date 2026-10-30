import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

// Ticket 01 only. Never loads app/remote envs, writes SQL, or calls a provider.
const ROOT = process.cwd();
const CAMPAIGN = 'editorial-refresh-20261028';
const SOURCE = 'VOCABFLOW_MASTER_V2_DEV';
const WORK = 'vocabflow-dataset/workspaces/master-v2-development-sync/';
const PLAN = 'docs/plans/editorial-refresh-2026-10-28/';
const STAGING = `.vocabflow-local/${CAMPAIGN}/staging`;
const CAPTURE = `${STAGING}/ticket01-local-capture-v1.json`;
const MEDIA = `${STAGING}/ticket01-media-v1/`;
const OUTPUT = `vocabflow-dataset/workspaces/${CAMPAIGN}/baseline-v1`;
const RECOVERY = '.vocabflow-local/vercel-v2-cutover/release-build-37e9dc0/';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const norm = text => String(text ?? '').normalize('NFKC').trim().toLowerCase();
const jsonBytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
const readJson = relative => JSON.parse(readFileSync(safePath(ROOT, relative), 'utf8'));
const ordered = items => [...items].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
function assert(ok, code) { if (!ok) throw new Error(code); }
function safePath(root, relative) {
  assert(typeof relative === 'string' && !path.isAbsolute(relative), 'RELATIVE_PATH_REQUIRED');
  const result = path.resolve(root, relative);
  const relation = path.relative(path.resolve(root), result);
  assert(relation && !relation.startsWith('..') && !path.isAbsolute(relation), 'PATH_OUTSIDE_ALLOWED_ROOT');
  let ancestor = result;
  while (true) {
    try { lstatSync(ancestor); break; }
    catch (error) { if (error.code !== 'ENOENT') throw error; ancestor = path.dirname(ancestor); }
  }
  const realRelative = path.relative(realpathSync(root), realpathSync(ancestor));
  assert(!realRelative || (!realRelative.startsWith('..') && !path.isAbsolute(realRelative)), 'SYMLINK_OUTSIDE_ALLOWED_ROOT');
  return result;
}
function writeJson(file, value) {
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, jsonBytes(value), { flag: 'wx' });
}
function countBy(items, getKey) {
  const result = {};
  for (const item of items) { const key = getKey(item) ?? 'UNCLASSIFIED'; result[key] = (result[key] ?? 0) + 1; }
  return result;
}
function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stable(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}
function fingerprint(value) { return digest(Buffer.from(stable(value), 'utf8')); }

async function capture() {
  assert(!existsSync(safePath(ROOT, CAPTURE)), 'CAPTURE_ALREADY_EXISTS_NEVER_OVERWRITE');
  const localEnv = parseEnv(readFileSync(safePath(ROOT, '.vocabflow-local/development.env'), 'utf8'));
  const target = new URL(localEnv.DATABASE_URL);
  assert(['postgres:', 'postgresql:'].includes(target.protocol)
    && ['127.0.0.1', 'localhost', '[::1]'].includes(target.hostname)
    && target.port === '55432' && target.pathname === '/vocabflow_dev', 'DEDICATED_LOCAL_DATABASE_REQUIRED');
  const db = postgres(target.toString(), { max: 1, prepare: false, connect_timeout: 10,
    connection: { application_name: 'editorial-baseline-ticket01-read-only', default_transaction_read_only: 'on' } });
  try {
    const result = await db.begin('isolation level repeatable read read only', async tx => {
      await tx.unsafe("SET LOCAL statement_timeout = '30s'");
      await tx.unsafe("SET LOCAL lock_timeout = '2s'");
      const [transaction] = await tx.unsafe(`SELECT current_database() AS database,
        current_setting('transaction_read_only') AS readOnly,
        current_setting('transaction_isolation') AS isolation, now() AS captured_at_utc`);
      assert(transaction.readonly === 'on' && transaction.isolation === 'repeatable read', 'READ_ONLY_TRANSACTION_REQUIRED');
      const queries = {}, tables = {};
      // Content and structural tables only; never export learner/account records.
      const selections = {
        vocabularies: 'id', master_v2_development_projections: 'proposal_key',
        learning_sets: 'id', learning_set_items: 'learning_set_id, vocabulary_id',
        topics: 'id', vocabulary_topics: 'vocabulary_id, topic_id',
        master_vocabulary_mappings: 'vocabulary_id', master_learning_set_memberships: 'learning_set_id, vocabulary_id',
        master_vocabulary_topic_memberships: 'vocabulary_id, topic_id'
      };
      for (const [table, order] of Object.entries(selections)) {
        const statement = `SELECT * FROM vocabflow_app.${table} ORDER BY ${order}`;
        queries[table] = statement;
        tables[table] = await tx.unsafe(statement);
      }
      const referenceChecks = [];
      for (const [table, column, parent, parentColumn] of [
        ['master_v2_development_projections', 'vocabulary_id', 'vocabularies', 'id'],
        ['learning_set_items', 'vocabulary_id', 'vocabularies', 'id'],
        ['learning_set_items', 'learning_set_id', 'learning_sets', 'id'],
        ['vocabulary_topics', 'vocabulary_id', 'vocabularies', 'id'],
        ['vocabulary_topics', 'topic_id', 'topics', 'id'],
        ['learner_progress', 'vocabulary_id', 'vocabularies', 'id'],
        ['review_events', 'vocabulary_id', 'vocabularies', 'id'],
        ['learner_saved_vocabulary', 'vocabulary_id', 'vocabularies', 'id']
      ]) {
        const statement = `SELECT count(*)::int AS orphan_count FROM vocabflow_app.${table} child LEFT JOIN vocabflow_app.${parent} parent ON child.${column}=parent.${parentColumn} WHERE parent.${parentColumn} IS NULL`;
        const [row] = await tx.unsafe(statement);
        queries[`${table}_${column}_reference`] = statement;
        referenceChecks.push({ table, column, parent, orphanCount: row.orphan_count });
      }
      const schemaColumns = await tx.unsafe(`SELECT table_name, column_name, data_type FROM information_schema.columns
        WHERE table_schema='vocabflow_app' ORDER BY table_name, ordinal_position`);
      return { artifactType: 'EDITORIAL_LOCAL_READ_ONLY_CAPTURE', schemaVersion: 1, campaignId: CAMPAIGN,
        clientReviewDate: '2026-10-29', transaction, target: '127.0.0.1:55432/vocabflow_dev',
        databaseWrites: 0, learnerRowsExported: 0, tables, referenceChecks, schemaColumns, queries };
    });
    writeJson(safePath(ROOT, CAPTURE), result);
    console.log(JSON.stringify({ status: 'LOCAL_CAPTURE_WRITTEN', path: CAPTURE,
      byteSha256: digest(readFileSync(safePath(ROOT, CAPTURE))), vocabularyRows: result.tables.vocabularies.length,
      projectionRows: result.tables.master_v2_development_projections.length, transaction: result.transaction, databaseWrites: 0 }));
  } finally { await db.end({ timeout: 3 }); }
}

function build() {
  const baselineId = process.argv[3] ?? 'baseline-v1';
  assert(/^baseline-v[1-9]\d*$/u.test(baselineId), 'INVALID_BASELINE_REVISION');
  const output = `vocabflow-dataset/workspaces/${CAMPAIGN}/${baselineId}`;
  assert(!existsSync(safePath(ROOT, output)), 'FROZEN_BASELINE_ALREADY_EXISTS');
  const plan = readJson(`${PLAN}campaign-plan.draft.json`);
  const captureData = readJson(CAPTURE);
  const mediaSummary = readJson(`${MEDIA}media-inventory.summary.json`);
  const mediaAssets = readJson(`${MEDIA}media-inventory.assets.json`);
  const mediaLinks = readJson(`${MEDIA}media-linkages.json`);
  assert(captureData.transaction.readonly === 'on' && captureData.databaseWrites === 0, 'CAPTURE_NOT_READ_ONLY');
  assert(captureData.referenceChecks.every(x => x.orphanCount === 0), 'ORPHAN_REFERENCES_REQUIRE_RECONCILIATION');
  const sources = new Map();
  function source(declaredPath, expectedHash, role, availablePath = declaredPath) {
    const sourceKey = `${declaredPath}|${expectedHash ?? ''}`;
    if (sources.has(sourceKey)) return sources.get(sourceKey).value;
    const file = safePath(ROOT, availablePath);
    const bytes = readFileSync(file), hash = digest(bytes);
    assert(!expectedHash || hash === expectedHash, `SOURCE_PIN_MISMATCH:${declaredPath}`);
    const extension = path.extname(file).toLowerCase();
    assert(['.json', '.md', '.mjs', '.sha256'].includes(extension), 'SOURCE_EXTENSION_NOT_ALLOWED');
    const record = { declaredPath, resolvedPath: availablePath, byteSha256: hash, byteLength: bytes.length,
      role, recoveredExactCopy: availablePath !== declaredPath, packagePath: `sources/${hash}${extension}`,
      bytes, value: extension === '.json' ? JSON.parse(bytes.toString('utf8')) : null };
    sources.set(sourceKey, record);
    return record.value;
  }
  for (const pin of [...plan.sourcePins, ...plan.historicalMediaEvidencePins]) source(pin.path, pin.byteSha256, 'PLAN_PIN');
  const rc = source(`${WORK}master-v2-release-candidate-v9.json`, plan.sourcePins[0].byteSha256, 'RC_V9');
  const enrichment = source(`${WORK}master-v2-development-learning-metadata-enrichment-v1.json`, plan.sourcePins[1].byteSha256, 'CEFR_ENRICHMENT');
  const queue = source(`${WORK}independent-content-review-queue-v1.json`, rc.sourceQueueFileSha256, 'REVIEW_QUEUE');
  const metadata = source(enrichment.sourcePins.baseManifestPath, enrichment.sourcePins.baseManifestSha256, 'BASE_METADATA');
  const runtimeSnapshot = source(metadata.sourcePins.runtimeSnapshotPath, null, 'RUNTIME_IDENTITY_SNAPSHOT');
  const runtimeSidecar = readFileSync(safePath(ROOT, `${metadata.sourcePins.runtimeSnapshotPath}.sha256`), 'utf8').trim().split(/\s+/u)[0];
  assert(runtimeSidecar === digest(readFileSync(safePath(ROOT, metadata.sourcePins.runtimeSnapshotPath)))
    && runtimeSnapshot.projectionFingerprint === metadata.sourcePins.runtimeProjectionFingerprint,
  'RUNTIME_SNAPSHOT_PIN_MISMATCH');
  source(`${metadata.sourcePins.runtimeSnapshotPath}.sha256`, null, 'RUNTIME_SNAPSHOT_SIDECAR');
  source(`${WORK}master-v2-content-rights-ledger-v9.json`, rc.rightsLedgerFileSha256, 'HISTORICAL_RIGHTS_LEDGER');
  source(`${WORK}independent-content-revision-review-correction-v1.json`, rc.correctionReceiptSha256, 'HISTORICAL_REVIEW_CORRECTION');
  source(rc.attributionBundlePath, rc.attributionBundleSha256, 'ATTRIBUTION');
  for (const ref of rc.revisionReviewReceipts) source(ref.path, ref.sha256, 'REVISION_REVIEW_RECEIPT');
  for (const prefix of ['oxfordInventory', 'vocab4600Inventory', 'taxonomy']) {
    const declared = enrichment.sourcePins[`${prefix}Path`];
    source(declared, enrichment.sourcePins[`${prefix}Sha256`], 'METADATA_EVIDENCE', existsSync(safePath(ROOT, declared)) ? declared : `${RECOVERY}${declared}`);
  }
  for (const pin of mediaSummary.sourcePins) source(pin.path, pin.byteSha256, 'MEDIA_EVIDENCE');
  for (const pin of mediaSummary.outputs) source(pin.path, pin.byteSha256, 'MEDIA_DERIVED_EVIDENCE');
  source(`${MEDIA}media-inventory.summary.json`, null, 'MEDIA_DERIVED_SUMMARY');
  source(CAPTURE, null, 'FROZEN_LOCAL_CAPTURE');
  source(`${PLAN}foundation-planning-inventory.json`, null, 'PLANNING_TARGETS');
  source('scripts/editorial-baseline-v1.mjs', null, 'COLLECTOR_VERSION');
  const current = new Map(queue.entries.map(entry => [entry.proposalKey, { ...entry, finalContent: entry.content, finalHash: entry.effectiveContentHash }]));
  const overlayCounts = [];
  for (const ref of rc.revisionOverlays) {
    const overlay = source(ref.path, ref.sha256, 'REVISION_OVERLAY');
    let applied = 0;
    for (const revision of overlay.revisions) {
      const item = current.get(revision.proposalKey);
      assert(item && item.finalHash === revision.parentContentHash, 'REVISION_PARENT_CHAIN_MISMATCH');
      item.finalHash = revision.effectiveContentHash;
      item.finalContent = revision.contentForReview;
      applied++;
    }
    overlayCounts.push({ path: ref.path, applied });
  }
  const vocabById = new Map(captureData.tables.vocabularies.map(v => [v.id, v]));
  const projectionById = new Map(captureData.tables.master_v2_development_projections.map(p => [p.vocabulary_id, p]));
  const projectionByKey = new Map(captureData.tables.master_v2_development_projections.map(p => [p.proposal_key, p]));
  const enrichByKey = new Map(enrichment.senses.map(x => [x.proposalKey, x]));
  const rcPass = rc.senseDispositions.filter(x => x.contentReviewDecision === 'PASS');
  assert(runtimeSnapshot.identities.length === 7311 && runtimeSnapshot.identities.every(x =>
    projectionByKey.get(x.proposalKey)?.content_sha256 === x.contentSha256), 'RUNTIME_IDENTITY_SNAPSHOT_JOIN_MISMATCH');
  assert(rcPass.length === 7311 && projectionByKey.size === 7311 && vocabById.size === 7341, 'BASELINE_SCOPE_CHANGED');
  assert(captureData.tables.master_vocabulary_mappings.length === 0, 'MASTER_MAPPING_STATE_CHANGED_REVIEW_REQUIRED');
  let receiptMatches = 0, labelsAdded = 0, labelsChanged = 0;
  const corpus = [], crosswalk = [];
  for (const disposition of rcPass) {
    const entry = current.get(disposition.proposalKey), p = projectionByKey.get(disposition.proposalKey);
    const v = vocabById.get(p?.vocabulary_id), m = enrichByKey.get(disposition.proposalKey);
    assert(entry && p && v?.enabled && v.source_dataset === SOURCE && m, 'PROPOSAL_RUNTIME_JOIN_MISSING');
    assert(p.content_sha256 === disposition.effectiveContentHash && entry.finalHash === p.content_sha256
      && m.contentSha256 === p.content_sha256, 'CURRENT_CONTENT_HASH_JOIN_MISMATCH');
    const receipt = source(disposition.contentReviewReceipt, p.review_receipt_sha256, 'PASS_REVIEW_RECEIPT');
    const match = receipt.entries?.some(x => x.proposalKey === disposition.proposalKey
      && [x.effectiveContentHash, x.reviewedContentHash].includes(p.content_sha256)
      && (x.decision ?? x.verdict ?? x.disposition ?? x.revisedDecision) === 'PASS');
    assert(match && receipt.reviewerIdentity === disposition.reviewerIdentity, 'PASS_REVIEW_RECEIPT_BINDING_MISMATCH');
    receiptMatches++;
    if (!p.cefr && m.cefr?.value) labelsAdded++;
    if (p.cefr && m.cefr?.value !== p.cefr) labelsChanged++;
    const expected = entry.finalContent;
    assert(v.word === (entry.displayForm || entry.headword) && v.definition_en === expected.definitionEn
      && v.vietnamese === expected.meaningVi && (v.vietnamese_override ?? v.vietnamese) === expected.meaningVi
      && v.example_en === expected.examples[0].en && p.source_group_key === entry.sourceGroupKey
      && p.part_of_speech === entry.partOfSpeech && p.usage_notes === (expected.usageNotes ?? expected.grammarNotesEn ?? null)
      && fingerprint(p.examples) === fingerprint(expected.examples), 'RUNTIME_LEARNER_CONTENT_DIFFERS_REVIEW_REQUIRED');
    const rowId = `runtime-${v.id}`;
    corpus.push({ baselineRowId: rowId, runtimeVocabularyId: v.id, sourceDataset: v.source_dataset,
      proposalKey: p.proposal_key, sourceGroupKey: p.source_group_key, headword: entry.headword,
      runtimeDisplay: v.word, partOfSpeech: p.part_of_speech, sourceContentSha256: p.content_sha256,
      currentRuntimeContentVersion: v.content_version, currentCefr: p.cefr,
      proposedCefrEvidence: m.cefr, definitionEn: v.definition_en, meaningVi: v.vietnamese,
      meaningViOverride: v.vietnamese_override, examples: p.examples, usageNotes: p.usage_notes,
      historicalContentReview: { decision: disposition.contentReviewDecision, receiptPath: disposition.contentReviewReceipt,
        receiptSha256: p.review_receipt_sha256, reviewerIdentity: disposition.reviewerIdentity },
      campaignEditorialDisposition: 'UNREVIEWED', masterIdentityStatus: 'PENDING_IDENTITY',
      mediaStateInLocalRestore: p.development_media, enabled: v.enabled });
    crosswalk.push({ baselineRowId: rowId, runtimeVocabularyId: v.id, sourceDataset: SOURCE,
      sourceRecordId: v.source_record_id, proposalKey: p.proposal_key, sourceGroupKey: p.source_group_key,
      headword: entry.headword, partOfSpeech: p.part_of_speech, sourceContentSha256: p.content_sha256,
      masterLexemeId: null, masterSenseId: null, pronunciationId: null, identityStatus: 'PENDING_IDENTITY',
      identityCaveat: 'Runtime/proposal identity verified. No verified Master UUID mapping in current artifacts; none assigned by ticket 01.',
      examples: p.examples.map((example, ordinal) => ({ baselineExampleRef: `${rowId}-example-${ordinal}`,
        exampleKey: example.exampleKey ?? null, exampleId: null, en: example.en, vi: example.vi,
        exactTextSha256: digest(Buffer.from(example.en, 'utf8')) })) });
  }
  const legacy = captureData.tables.vocabularies.filter(v => v.source_dataset !== SOURCE);
  assert(legacy.length === 30 && legacy.every(v => v.enabled), 'LEGACY_SCOPE_CHANGED');
  for (const v of legacy) {
    assert(!projectionById.has(v.id), 'LEGACY_PROJECTION_COLLISION');
    const rowId = `runtime-${v.id}`;
    corpus.push({ baselineRowId: rowId, runtimeVocabularyId: v.id, sourceDataset: v.source_dataset,
      proposalKey: null, sourceGroupKey: null, headword: v.word, runtimeDisplay: v.word,
      partOfSpeech: null, sourceContentSha256: null, currentRuntimeContentVersion: v.content_version,
      currentCefr: null, proposedCefrEvidence: null, meaningVi: v.vietnamese, meaningViOverride: v.vietnamese_override,
      definitionEn: v.definition_en, examples: v.example_en ? [{ en: v.example_en, vi: null }] : [],
      campaignEditorialDisposition: 'UNREVIEWED', masterIdentityStatus: 'PENDING_IDENTITY', enabled: v.enabled });
    crosswalk.push({ baselineRowId: rowId, runtimeVocabularyId: v.id, sourceDataset: v.source_dataset,
      sourceRecordId: v.source_record_id, proposalKey: null, sourceGroupKey: null, headword: v.word,
      masterLexemeId: null, masterSenseId: null, pronunciationId: null, identityStatus: 'LEGACY_PENDING_RECONCILIATION', examples: [] });
  }
  corpus.sort((a, b) => a.runtimeVocabularyId - b.runtimeVocabularyId);
  crosswalk.sort((a, b) => a.runtimeVocabularyId - b.runtimeVocabularyId);
  assert(labelsAdded === 1155 && labelsChanged === 0, 'CEFR_ADOPTION_DELTA_CHANGED');
  const groups = new Map();
  for (const row of corpus) {
    const key = norm(row.headword); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(row);
  }
  const shards = []; let groupKeys = [], shardRows = [];
  function flush() {
    if (!shardRows.length) return;
    const shardId = `review-shard-${String(shards.length + 1).padStart(4, '0')}`;
    const families = ordered(new Set(shardRows.map(x => {
      const cefr = x.proposedCefrEvidence?.value ?? x.currentCefr;
      return ['A1', 'A2'].includes(cefr) ? '10' : ['B1', 'B2'].includes(cefr) ? '11' : ['C1', 'C2'].includes(cefr) ? '12' : '13';
    })));
    shards.push({ shardId, status: 'UNASSIGNED', ownershipSlot: `owner-${shardId}`, assignedWorker: null,
      executionAuthorized: false, normalizedHeadwordGroups: groupKeys, rowIds: shardRows.map(x => x.baselineRowId),
      runtimeVocabularyIds: shardRows.map(x => x.runtimeVocabularyId), suggestedTicketFamilies: families,
      count: shardRows.length, legacyCount: shardRows.filter(x => x.sourceDataset !== SOURCE).length });
    for (const row of shardRows) row.shardId = shardId;
    groupKeys = []; shardRows = [];
  }
  for (const key of ordered(groups.keys())) {
    const group = groups.get(key);
    if (shardRows.length && shardRows.length + group.length > 50) flush();
    groupKeys.push(key); shardRows.push(...group);
  }
  flush();
  const corpusByRowId = new Map(corpus.map(x => [x.baselineRowId, x]));
  for (const row of crosswalk) row.shardId = corpusByRowId.get(row.baselineRowId).shardId;
  const inventory = readJson(`${PLAN}foundation-planning-inventory.json`), targetCategories = new Map();
  for (const [category, values] of Object.entries(inventory.groups)) {
    for (const value of Array.isArray(values) ? values : values.split(/\s+/u)) {
      const key = norm(value); if (!targetCategories.has(key)) targetCategories.set(key, []); targetCategories.get(key).push(category);
    }
  }
  const lookup = new Map();
  for (const row of corpus) for (const key of new Set([norm(row.headword), norm(row.runtimeDisplay)])) {
    if (!lookup.has(key)) lookup.set(key, []); lookup.get(key).push(row.baselineRowId);
  }
  const excluded = rc.senseDispositions.filter(x => x.contentReviewDecision !== 'PASS');
  const coverageTargets = ordered(targetCategories.keys()).map(key => ({ normalizedTarget: key,
    categories: targetCategories.get(key), type: targetCategories.get(key).includes('first_utterances') ? 'UTTERANCE_OR_PATTERN' : 'LEXICAL_CANDIDATE',
    candidateRowIds: lookup.get(key) ?? [],
    excludedRcCandidates: excluded.filter(x => norm(x.headword) === key).map(x => ({ proposalKey: x.proposalKey, decision: x.contentReviewDecision })),
    status: lookup.has(key) ? 'CANDIDATES_FOUND_SENSE_SUITABILITY_UNREVIEWED' : 'NO_EXACT_MATCH_REQUIRES_ALIAS_MORPHOLOGY_SOURCE_REVIEW',
    authoringAuthorized: false, verifiedMissingLexeme: false }));
  const byKey = new Map(crosswalk.filter(x => x.proposalKey).map(x => [x.proposalKey, x]));
  const mediaBindings = mediaLinks.bindings.map(binding => {
    const target = byKey.get(binding.targetProposalKey);
    const hashMatches = !!target && target.sourceContentSha256 === binding.targetContentSha256;
    const example = binding.kind === 'EXAMPLE_AUDIO' ? target?.examples.find(x => x.exampleKey === binding.targetExampleKey
      && x.en === binding.targetExampleText && x.en === binding.sourceExampleText) : null;
    return { ...binding, frozenRuntimeVocabularyId: target?.runtimeVocabularyId ?? null,
      baselineRowId: target?.baselineRowId ?? null, shardId: target?.shardId ?? null,
      frozenRuntimeContentHashMatches: hashMatches,
      ...(binding.kind === 'EXAMPLE_AUDIO' ? { runtimeExampleVerification: example ? 'EXACT_EXISTING_KEY_AND_TEXT_MATCH' : 'UNRESOLVED_EXAMPLE',
        baselineExampleRef: example?.baselineExampleRef ?? null, masterExampleId: null } : {}),
      readiness: hashMatches ? 'CANDIDATE_REQUIRES_SEMANTIC_PRONUNCIATION_POLICY_REVIEW' : 'UNRESOLVED_BINDING',
      activated: false };
  });
  assert(mediaBindings.every(x => x.frozenRuntimeContentHashMatches), 'MEDIA_CURRENT_RUNTIME_JOIN_MISMATCH');
  assert(mediaBindings.filter(x => x.kind === 'EXAMPLE_AUDIO').every(x => x.runtimeExampleVerification === 'EXACT_EXISTING_KEY_AND_TEXT_MATCH'), 'MEDIA_CURRENT_EXAMPLE_JOIN_MISMATCH');
  assert(mediaAssets.assets.length === 13977 && mediaAssets.assets.every(x => x.local.sha256Matches && x.local.sizeMatches), 'LOCAL_MEDIA_BYTES_UNVERIFIED');
  const sets = captureData.tables.learning_sets, setItems = captureData.tables.learning_set_items;
  const schemaMissing = [ ['master_v2_short_meanings', null], ['topics', 'review_status'], ['topics', 'parent_topic_id'],
    ['vocabulary_topics', 'review_status'], ['learner_profiles', 'flashcard_display_mode'] ].filter(([table, column]) => !captureData.schemaColumns.some(x => x.table_name === table && (!column || x.column_name === column)))
    .map(([table, column]) => column ? `${table}.${column}` : table);
  const summary = { artifactType: 'EDITORIAL_BASELINE_SUMMARY', schemaVersion: 1, campaignId: CAMPAIGN,
    capturedAtUtc: captureData.transaction.captured_at_utc, scope: 'DEDICATED_LOCAL_AND_PINNED_OFFLINE_ONLY',
    counts: { allRuntimeRows: corpus.length, v2Senses: rcPass.length, legacyRows: legacy.length,
      distinctV2RuntimeDisplayStrings: new Set(corpus.filter(x => x.proposalKey).map(x => norm(x.runtimeDisplay))).size,
      distinctV2CanonicalHeadwords: new Set(corpus.filter(x => x.proposalKey).map(x => norm(x.headword))).size,
      runtimeDisplayDiffersFromCanonicalRows: corpus.filter(x => x.proposalKey && norm(x.headword) !== norm(x.runtimeDisplay)).length,
      exactStringDisplayDiffersFromCanonicalRows: corpus.filter(x => x.proposalKey && x.headword !== x.runtimeDisplay).length,
      comparisonNormalization: 'NFKC_TRIM_LOWERCASE',
      verifiedMasterSenseMappings: 0, examples: crosswalk.flatMap(x => x.examples).length,
      examplesWithExistingKey: crosswalk.flatMap(x => x.examples).filter(x => x.exampleKey).length,
      reviewShards: shards.length, reviewRowsAssignedExactlyOnce: shards.reduce((n, s) => n + s.count, 0),
      targetPlanningStrings: coverageTargets.length, targetStringsWithExactCandidates: coverageTargets.filter(x => x.candidateRowIds.length).length,
      targetStringsRequiringFurtherSearch: coverageTargets.filter(x => !x.candidateRowIds.length).length,
      learningSets: sets.length, learningSetsWithV2: sets.filter(s => setItems.some(i => i.learning_set_id === s.id && projectionById.has(i.vocabulary_id))).length,
      historicalPassReceiptBindingsVerified: receiptMatches, mediaAssets: mediaAssets.assets.length,
      frozenMediaBindings: mediaBindings.length },
    cefr: { local: countBy(corpus.filter(x => x.proposalKey), x => x.currentCefr),
      offlineEnrichment: countBy(enrichment.senses, x => x.cefr?.value), labelsAdded, labelsChanged,
      secondarySourceDisagreements: enrichment.counts.cefrSecondarySourceDisagreementSenses, applied: false },
    revisionOverlayReplay: overlayCounts, rcDecisionCounts: countBy(rc.senseDispositions, x => x.contentReviewDecision),
    rcExcludedScope: rc.scopeAndExcludedIdentities, schemaMissing,
    evidenceClosure: { currentContentAndOperationalInputs: 'PACKAGED_AND_BYTE_PINNED',
      historicalPrimaryArchiveReplay: 'PARTIAL_NOT_REPLAYED', oewnDerivedSenses: 573,
      note: 'OEWN archive/member/record claims remain preserved in queue/provenance. Packaging current content and source inventories is not a fresh replay of every historical raw archive or source record.' },
    media: { ...mediaSummary.inventory, latestMappings: mediaSummary.mappingCoverageBySource['backfill-manifest'],
      semanticReviewRepeated: false, currentCdnVerified: false, activated: false },
    referenceChecks: captureData.referenceChecks,
    remainingIssues: ['PENDING_MASTER_IDENTITY: 7311 V2 and 30 legacy runtime identities are retained; no Master UUIDs minted.',
      'CAMPAIGN_SEMANTIC_REVIEW_PENDING: every baseline row starts UNREVIEWED.',
      'ALIASES_MORPHOLOGY_AND_SENSE_REVIEW_PENDING: unmatched planning strings are not verified new words.',
      'MEDIA_MAPPING_REVIEW_PENDING: exact byte/hash and current Sense binding do not approve image meaning, pronunciation or rights.',
      'OLD_LOCAL_SCHEMA: ticket 02 owns compatibility; no migrations in ticket 01.',
      'HISTORICAL_RAW_EVIDENCE_PARTIAL: OEWN archive/member/record references retained as claims; not all raw archive bytes revalidated.',
      'OFF_MACHINE_BACKUP_UNCONFIGURED: create a portable local handoff archive; external backup location remains open.'],
    databaseWrites: 0, contentActivation: false, newVocabularyAuthored: 0, providerCalls: 0 };
  assert(summary.counts.reviewRowsAssignedExactlyOnce === 7341 && coverageTargets.length === 355, 'COVERAGE_ACCOUNTING_MISMATCH');
  mkdirSync(safePath(ROOT, STAGING), { recursive: true });
  const temporary = mkdtempSync(path.join(safePath(ROOT, STAGING), 'baseline-build-'));
  const write = (relative, value) => writeJson(safePath(temporary, relative), value);
  write('local-capture.json', captureData);
  write('corpus.json', { artifactType: 'FROZEN_RUNTIME_CORPUS', rows: corpus });
  write('identity-crosswalk.json', { artifactType: 'VERIFIED_RUNTIME_PENDING_MASTER_CROSSWALK', rows: crosswalk });
  write('review-shards.json', { artifactType: 'EXCLUSIVE_EDITORIAL_SHARDS', grouping: 'NFKC_TRIM_LOWER_HEADWORD_WITH_ALL_SIBLINGS_AND_LEGACY', targetRowsPerShard: 50, shards });
  write('coverage-target-matrix.json', { artifactType: 'PLANNING_COVERAGE_CANDIDATES_NOT_APPROVED_GAPS', targets: coverageTargets });
  write('excluded-rc-identities.json', { artifactType: 'RC_NON_PASS_EXCLUSIONS', dispositions: excluded, broaderExcludedScope: rc.scopeAndExcludedIdentities });
  write('media/current-runtime-bindings.json', { artifactType: 'MEDIA_BINDINGS_JOINED_TO_FROZEN_RUNTIME', bindings: mediaBindings });
  for (const file of ['media-inventory.summary.json', 'media-inventory.assets.json', 'media-linkages.json', 'media-source-references.json']) {
    const target = safePath(temporary, `media/${file}`); mkdirSync(path.dirname(target), { recursive: true }); copyFileSync(safePath(ROOT, `${MEDIA}${file}`), target);
  }
  write('summary.json', summary);
  const sourceIndex = [];
  for (const item of sources.values()) {
    const target = safePath(temporary, item.packagePath); mkdirSync(path.dirname(target), { recursive: true });
    if (existsSync(target)) assert(digest(readFileSync(target)) === item.byteSha256, 'PACKAGED_SOURCE_COLLISION');
    else writeFileSync(target, item.bytes, { flag: 'wx' });
    const { bytes, value, ...record } = item; sourceIndex.push(record);
  }
  write('source-index.json', { artifactType: 'BASELINE_OPERATIONAL_SOURCE_PINS', closureScope: summary.evidenceClosure, sources: sourceIndex });
  writeFileSync(safePath(temporary, 'README.md'), `# Frozen editorial ${baselineId}\n\nScope: ticket 01 only, dedicated local capture plus pinned offline evidence.\n\nRead summary.json, identity-crosswalk.json, review-shards.json and coverage-target-matrix.json. Sources are packaged by their exact byte hash; source-index.json preserves declared and recovered locations. This is reproducible current-content and operational-input closure, not a fresh replay of every historical raw archive. OEWN archive/member/record references remain preserved claims with partial historical evidence closure.\n\nMaster IDs remain pending; all editorial dispositions are UNREVIEWED. No CEFR adoption, migration, data activation or media/provider generation occurred. Shards are ownership slots, not assigned workers or permission to execute later tickets.\n\nMedia byte inventory is verified locally. Binary files remain external to this baseline folder at their recorded repo-relative paths; the portable handoff archive includes them separately. Current CDN and semantic mapping review remain pending.\n`, { flag: 'wx' });
  const files = [];
  function list(folder) { for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name); if (entry.isDirectory()) list(file);
    else files.push({ path: path.relative(temporary, file).replaceAll('\\', '/'), byteSha256: digest(readFileSync(file)), byteLength: statSync(file).size });
  } }
  list(temporary); files.sort((a, b) => a.path < b.path ? -1 : 1);
  write('baseline-manifest.json', { artifactType: 'IMMUTABLE_EDITORIAL_BASELINE_MANIFEST', schemaVersion: 1,
    campaignId: CAMPAIGN, baselineId, capturedAtUtc: summary.capturedAtUtc,
    databaseWrites: 0, executionAuthorization: 'TICKET_01_ONLY', files });
  const manifestSha256 = digest(readFileSync(safePath(temporary, 'baseline-manifest.json')));
  writeFileSync(safePath(temporary, 'baseline-manifest.json.sha256'), `${manifestSha256}\n`, { flag: 'wx' });
  const target = safePath(ROOT, output);
  mkdirSync(path.dirname(target), { recursive: true });
  // Both absolute paths and their real parents are verified before this directory move.
  safePath(safePath(ROOT, STAGING), path.basename(temporary));
  assert(realpathSync(path.dirname(target)) === realpathSync(safePath(ROOT, `vocabflow-dataset/workspaces/${CAMPAIGN}`)), 'FREEZE_TARGET_PARENT_CHANGED');
  assert(!existsSync(target), 'FREEZE_TARGET_EXISTS');
  renameSync(temporary, target);
  console.log(JSON.stringify({ status: 'BASELINE_FROZEN', path: output, manifestSha256, summary }, null, 2));
}

function verify() {
  const relative = process.argv[3] ?? OUTPUT;
  const root = safePath(ROOT, relative);
  const bytes = readFileSync(safePath(root, 'baseline-manifest.json'));
  const manifest = JSON.parse(bytes);
  assert(digest(bytes) === readFileSync(safePath(root, 'baseline-manifest.json.sha256'), 'utf8').trim(), 'MANIFEST_SHA256_MISMATCH');
  assert(new Set(manifest.files.map(x => x.path)).size === manifest.files.length, 'DUPLICATE_MANIFEST_PATH');
  const actualFiles = [];
  function list(folder) { for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name); assert(!lstatSync(file).isSymbolicLink(), 'BASELINE_SYMLINK_NOT_ALLOWED');
    if (entry.isDirectory()) list(file); else actualFiles.push(path.relative(root, file).replaceAll('\\', '/'));
  } }
  list(root);
  const expectedFiles = [...manifest.files.map(x => x.path), 'baseline-manifest.json', 'baseline-manifest.json.sha256'];
  assert(fingerprint(ordered(actualFiles)) === fingerprint(ordered(expectedFiles)), 'UNLISTED_OR_MISSING_BASELINE_FILE');
  for (const pin of manifest.files) {
    const file = safePath(root, pin.path), actual = readFileSync(file);
    assert(actual.length === pin.byteLength && digest(actual) === pin.byteSha256, `BASELINE_FILE_HASH_MISMATCH:${pin.path}`);
  }
  const load = file => JSON.parse(readFileSync(safePath(root, file), 'utf8'));
  const corpus = load('corpus.json').rows, crosswalk = load('identity-crosswalk.json').rows, shards = load('review-shards.json').shards;
  const assigned = shards.flatMap(x => x.rowIds);
  assert(corpus.length === 7341 && crosswalk.length === 7341 && assigned.length === 7341
    && new Set(assigned).size === 7341 && assigned.every(id => corpus.some(x => x.baselineRowId === id)), 'BASELINE_ROW_OR_SHARD_COVERAGE_INVALID');
  const groupOwners = new Map();
  for (const shard of shards) for (const group of shard.normalizedHeadwordGroups) {
    assert(!groupOwners.has(group), 'HEADWORD_GROUP_HAS_MULTIPLE_OWNERS'); groupOwners.set(group, shard.shardId);
  }
  assert(corpus.every(x => groupOwners.get(norm(x.headword)) === x.shardId), 'SIBLING_OWNERSHIP_MISMATCH');
  const links = load('media/current-runtime-bindings.json').bindings;
  assert(links.every(x => { const target = crosswalk.find(r => r.runtimeVocabularyId === x.frozenRuntimeVocabularyId);
    return target && target.sourceContentSha256 === x.targetContentSha256 && target.proposalKey === x.targetProposalKey; }), 'MEDIA_BINDING_INVALID');
  assert(crosswalk.every(x => x.masterSenseId === null && x.masterLexemeId === null), 'UNVERIFIED_MASTER_ID_MINTED');
  console.log(JSON.stringify({ status: 'FROZEN_BASELINE_VERIFIED', manifestSha256: digest(bytes),
    verifiedFiles: manifest.files.length, runtimeRows: corpus.length, exclusiveShards: shards.length,
    mediaBindings: links.length, databaseAccess: false, databaseWrites: 0 }));
}

try {
  const mode = process.argv[2];
  if (mode === 'capture') await capture();
  else if (mode === 'build') build();
  else if (mode === 'verify') verify();
  else throw new Error('USAGE: node scripts/editorial-baseline-v1.mjs capture|build|verify [repo-relative-baseline-root]');
} catch (error) {
  // Do not emit connection URLs, SQL payloads or raw driver errors.
  console.error(JSON.stringify({ status: 'BASELINE_OPERATION_FAILED', code: error.code ?? error.message }));
  process.exitCode = 1;
}
