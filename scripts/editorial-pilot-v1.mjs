import { randomUUID } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assert, bytes, hashValue, safe, sha } from './editorial-canary-lib-v1.mjs';

// Offline ticket04 only. No DB client, network, provider or publication command.
const ALGORITHM = 'sha256-sorted-json-editorial-draft-v1';
const norm = s => String(s ?? '').normalize('NFKC').trim().toLowerCase();
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const pin = p => ({ byteSha256: sha(readFileSync(p)), byteLength: readFileSync(p).length });
const put = (root, rel, value) => {
  const file = safe(root, rel); mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.isBuffer(value) ? value : bytes(value), { flag: 'wx' });
};
const bindingIdentity = r => ({ baselineRowId: r.baselineRowId, runtimeVocabularyId: r.runtimeVocabularyId,
  proposalKey: r.proposalKey, sourceGroupKey: r.sourceGroupKey, sourceContentSha256: r.sourceContentSha256,
  masterLexemeId: null, masterSenseId: null, pronunciationId: null, identityStatus: 'PENDING_IDENTITY' });

function validateSelection(s) {
  assert(s.artifactType === 'PILOT_EDITORIAL_SELECTION' && s.schemaVersion === 1, 'SELECTION_SCHEMA');
  assert(s.items?.length === 30 && s.themes?.length === 4, 'THIRTY_ITEMS_FOUR_THEMES_REQUIRED');
  assert(new Set(s.items.map(x => x.runtimeVocabularyId)).size === 30, 'DUPLICATE_TARGET');
  assert(new Set(s.themes.map(t => t.code)).size === 4, 'DUPLICATE_THEME');
  for (const t of s.themes) assert(s.items.filter(i => i.theme === t.code).length === t.expectedItems, 'THEME_COUNT');
  for (const i of s.items) {
    assert(Number.isSafeInteger(i.runtimeVocabularyId) && s.themes.some(t => t.code === i.theme), 'INVALID_TARGET');
    assert(i.searchForms?.map(norm).includes(norm(i.headword)), 'SEARCH_MUST_INCLUDE_HEADWORD');
    assert([i.meaningVi, i.en, i.vi, i.senseNoteVi].every(x => typeof x === 'string' && x.trim()), 'INCOMPLETE_COPY');
    assert(i.en.split(/\s+/u).length <= 8 && i.en.toLowerCase().includes(i.headword), 'EXAMPLE_TOO_LONG_OR_NO_TARGET');
    assert(Boolean(i.imageBrief) !== Boolean(i.omitImageReason), 'EXPLICIT_IMAGE_DECISION_REQUIRED');
    assert(!i.grades || (i.grades.length && i.grades.every(g => ['GRADE_1', 'GRADE_2'].includes(g))), 'INVALID_GRADE');
  }
}

export function buildPilot(selectionRelative, outputRelative) {
  const cwd = process.cwd(), selectionFile = safe(cwd, selectionRelative), s = read(selectionFile);
  validateSelection(s);
  const base = safe(cwd, s.baselineRoot), manifestPath = safe(base, 'baseline-manifest.json');
  assert(pin(manifestPath).byteSha256 === s.baselineManifestSha256, 'BASELINE_MANIFEST_MISMATCH');
  const bm = read(manifestPath), inputPins = [{ path: 'baseline-manifest.json', ...pin(manifestPath) }];
  const load = rel => {
    const p = safe(base, rel), expected = bm.files.find(f => f.path === rel), actual = pin(p);
    assert(expected && actual.byteSha256 === expected.byteSha256 && actual.byteLength === expected.byteLength, `BASELINE_FILE_MISMATCH:${rel}`);
    if (!inputPins.some(x => x.path === rel)) inputPins.push({ path: rel, ...actual });
    return read(p);
  };
  const corpus = load('corpus.json').rows, crosswalk = load('identity-crosswalk.json').rows;
  const capture = load('local-capture.json'), index = load('source-index.json').sources;
  const sourceByName = term => {
    const entry = index.find(x => x.declaredPath.includes(term)); assert(entry, `SOURCE_NOT_FOUND:${term}`);
    return { entry, value: load(entry.packagePath) };
  };
  const queue = sourceByName('independent-content-review-queue-v1.json');
  const oxford = sourceByName('oxford-normalized-inventory.json');
  const vocab = sourceByName('vocab4600-normalized-inventory.json');
  const taxonomy = sourceByName('/taxonomy/');
  const bindings = load('media/current-runtime-bindings.json').bindings;
  const inventory = load('media/media-inventory.assets.json').assets;
  const rows = new Map(corpus.map(r => [r.runtimeVocabularyId, r]));
  const forms = record => [record.headword, record.runtimeDisplay, record.displayForm, record.headwordText,
    record.rawHeadword, record.normalizedHeadword, ...(Array.isArray(record.aliases) ? record.aliases.filter(x => typeof x === 'string') : [])].filter(Boolean).map(norm);
  const search = wanted => {
    const terms = wanted.map(norm), matches = records => records.filter(r => forms(r).some(f => terms.includes(f)));
    return { searchForms: wanted, runtimeCandidates: matches(corpus).map(r => ({ ...bindingIdentity(r), headword: r.headword, partOfSpeech: r.partOfSpeech, definitionEn: r.definitionEn, meaningVi: r.meaningVi })),
      queueCandidates: matches(queue.value.entries).map(r => ({ proposalKey: r.proposalKey, headword: r.headword, partOfSpeech: r.partOfSpeech, effectiveContentHash: r.effectiveContentHash, reviewStatus: r.reviewStatus })),
      sourceCandidates: [oxford, vocab].flatMap(source => matches(source.value.records).map(r => ({ sourcePath: source.entry.packagePath,
        sourceRecordId: r.sourceRecordId, headwordText: r.headwordText, partOfSpeechCandidates: r.sourcePosClassesCandidate, recordEvidenceSha256: r.recordEvidenceSha256 }))) };
  };
  // All matching forms are candidates, not an assertion of alias/meaning equivalence.
  const selectedSources = [], items = [], jobs = [], media = new Map(), dedupRows = [];
  const batchId = randomUUID();
  for (const choice of s.items) {
    const r = rows.get(choice.runtimeVocabularyId), cw = crosswalk.find(x => x.runtimeVocabularyId === choice.runtimeVocabularyId);
    assert(r?.sourceDataset === 'VOCABFLOW_MASTER_V2_DEV' && r.proposalKey && r.sourceContentSha256 && r.headword === choice.headword && r.enabled, 'EXACT_V2_IDENTITY_REQUIRED');
    assert(cw?.proposalKey === r.proposalKey && cw.sourceContentSha256 === r.sourceContentSha256 && cw.masterSenseId === null && cw.masterLexemeId === null, 'CROSSWALK_MISMATCH');
    const found = search(choice.searchForms);
    assert(found.runtimeCandidates.some(x => x.runtimeVocabularyId === r.runtimeVocabularyId), 'SELECTED_TARGET_NOT_FOUND');
    dedupRows.push({ targetRuntimeVocabularyId: r.runtimeVocabularyId, ...found, decision: 'REUSE_EXACT_EXISTING_SENSE_NO_NEW_LEXEME_OR_SENSE', rationaleVi: choice.senseNoteVi });
    const source = { corpusRow: r, crosswalkRow: cw,
      siblingRows: corpus.filter(x => norm(x.headword) === norm(r.headword)),
      existingTopicMemberships: capture.tables.vocabulary_topics.filter(x => x.vocabulary_id === r.runtimeVocabularyId) };
    selectedSources.push(source);
    const variantId = randomUUID(), exampleDraftRef = randomUUID();
    const item = { ...bindingIdentity(r), draftVariantId: variantId, itemType: 'VOCABULARY_SENSE_PRESENTATION',
      headword: r.headword, partOfSpeech: r.partOfSpeech, senseDefinitionEn: r.definitionEn,
      sourceRowHash: hashValue(r), sourceCrosswalkHash: hashValue(cw), hashAlgorithm: ALGORITHM,
      decision: 'KEEP_SENSE_REVISE_CHILD_PRESENTATION', meaningVi: choice.meaningVi,
      example: { draftRef: exampleDraftRef, masterExampleId: null, exampleKey: null, en: choice.en, vi: choice.vi,
        sourceExampleRefs: cw.examples.map(e => ({ baselineExampleRef: e.baselineExampleRef, exampleKey: e.exampleKey, exactTextSha256: e.exactTextSha256 })),
        identityNote: 'New child example draft. Never overwrite/reuse a source exampleKey for changed English text.' },
      placement: { themeCode: choice.theme, proposedGrades: choice.grades ?? ['GRADE_1', 'GRADE_2'],
        gradeEvidenceType: 'EDITORIAL_SUITABILITY_DRAFT_NOT_CURRICULUM', rationaleVi: choice.senseNoteVi,
        proposedLearningLevel: 'FIRST_WORDS', learningLevelLabelVi: 'Từ đầu tiên',
        learningLevelStatus: 'CURATED_DRAFT_NOT_RUNTIME_MAPPING', localCefr: r.currentCefr,
        sourceCefrEvidence: r.proposedCefrEvidence, cefrChangeRequested: false,
        setMembershipStatus: 'PROPOSED_NO_CANONICAL_SET_ID', topicMembershipStatus: 'PROPOSED_NOT_DB_APPROVED',
        runtimeEligible: false, sharedProgressRuntimeVocabularyId: r.runtimeVocabularyId },
      pedagogy: { audience: 'Optional Grade1–2 starter with adult support; open to any age', senseNoteVi: choice.senseNoteVi,
        prerequisiteNote: 'Examples are supported listening/context, not a reading mastery requirement; introduce extra words with an adult.',
        humanEditorialApproval: 'PENDING_OWNER_REVIEW', officialCurriculumAlignment: false },
      image: { decision: choice.imageBrief ? 'REUSE_REVIEW_FIRST_ELSE_GENERATE_LATER' : 'OMIT_NOT_DIAGNOSTIC',
        semanticBrief: choice.imageBrief, omissionReason: choice.omitImageReason ?? null, styleProfile: null },
      audio: { wordText: r.headword, exampleText: choice.en, locale: null, voice: null, provider: null, model: null,
        phonemePayload: null, pronunciationId: null, status: 'CONFIG_AND_LISTENING_REVIEW_PENDING' },
      runtimeEligible: false, newWordCountContribution: 0, mediaJobs: [] };
    for (const kind of ['IMAGE', 'WORD_AUDIO', 'EXAMPLE_AUDIO']) {
      const candidates = bindings.filter(b => b.frozenRuntimeVocabularyId === r.runtimeVocabularyId && b.kind === kind && b.frozenRuntimeContentHashMatches);
      const unique = [...new Set(candidates.map(b => b.mediaSha256))];
      for (const h of unique) {
        const a = inventory.find(x => x.mediaSha256 === h); assert(a?.local?.path, 'ASSET_INVENTORY_MISSING');
        if (!media.has(h)) media.set(h, { ...a, bundlePath: `candidate-media/${h}.${a.extension}`, semanticReview: 'NOT_PERFORMED', approvedForPilot: false });
      }
      const omitted = kind === 'IMAGE' && !choice.imageBrief;
      const jobId = randomUUID(), deps = kind === 'IMAGE' ? { identity: bindingIdentity(r), semanticBrief: choice.imageBrief }
        : kind === 'WORD_AUDIO' ? { identity: bindingIdentity(r), text: r.headword, pronunciationEvidence: candidates.map(b => ({ sourceIpa: b.sourceIpa ?? null, sourceIpaSha256: b.sourceIpaSha256 ?? null })) }
          : { identity: bindingIdentity(r), exampleDraftRef, exactEnglishText: choice.en };
      const job = { jobId, kind, target: bindingIdentity(r), draftVariantId: variantId,
        exampleDraftRef: kind === 'EXAMPLE_AUDIO' ? exampleDraftRef : null,
        state: omitted ? 'OMITTED' : 'PREFLIGHT_ONLY', executionAllowed: false, runtimeEligible: false,
        decision: omitted ? 'OMIT' : kind === 'EXAMPLE_AUDIO' ? 'NEW_TEXT_REQUIRES_EXACT_AUDIO_CHECK' : unique.length ? 'REVIEW_EXISTING_BEFORE_NEW_GENERATION' : 'GENERATE_IF_LATER_AUTHORIZED',
        dependencyHash: hashValue(deps), dependencyHashAlgorithm: ALGORITHM, dependencies: deps,
        providerRequestHash: null, requestHashReason: 'Final provider/voice/locale/style/config not selected; dependency hash is not a provider request hash.',
        candidateBindings: candidates, candidateAssetHashes: unique,
        exactExampleAudioApproved: false,
        blockers: omitted ? [] : ['TICKET_05_OR_06_EXECUTION', ...(kind === 'IMAGE' ? ['IMAGE_STYLE_POLICY', 'ASSET_VISUAL_AND_RIGHTS_REVIEW'] : ['LOCALE_VOICE_PROVIDER_PHONEME_CONFIG', 'LISTENING_AND_RIGHTS_REVIEW']), 'RECEIPT_ADAPTER_AND_RELEASE_GATES'],
        outputContract: omitted ? null : { attemptPathPattern: `.vocabflow-local/editorial-refresh-20261028/runs/<runUuid>/${jobId}/attempt-0001/output.${kind === 'IMAGE' ? 'png' : 'mp3'}`,
          receiptPathPattern: `.vocabflow-local/editorial-refresh-20261028/runs/<runUuid>/${jobId}/attempt-0001/receipt.json`,
          assetPathPattern: `.vocabflow-local/editorial-refresh-20261028/assets/${kind === 'IMAGE' ? 'images' : 'audio'}/<fullOutputSha256>.${kind === 'IMAGE' ? 'png' : 'mp3'}`,
          requiredReceiptFields: ['manifestByteSha256', 'jobId', 'attemptId', 'workerId', 'target', 'providerRequestHash', 'outputRelativePath', 'outputSha256', 'byteLength', 'mimeType', kind === 'IMAGE' ? 'dimensions' : 'durationMs', 'provenance', 'rightsEvidence', 'independentReview'],
          formatNote: 'PNG/MP3 are provisional. Pin actual format and MIME in a new work order if the selected provider differs; never relabel bytes.' } };
      jobs.push(job); item.mediaJobs.push(jobId);
    }
    item.presentationHash = hashValue({ meaningVi: item.meaningVi, example: item.example, placement: item.placement, image: item.image });
    items.push(item);
  }
  const themes = s.themes.map(t => ({ ...t, canonicalTopicCandidate: taxonomy.value.topics.find(x => x.code === t.canonicalTopicCandidateCode) ?? null,
    existingTopicCandidates: t.existingTopicCandidates.map(c => { const topic = capture.tables.topics.find(x => x.id === c.runtimeTopicId); assert(topic?.slug === c.slug, 'TOPIC_REFERENCE_MISMATCH'); return { ...c, frozenTopic: topic, currentDbReviewStatus: 'NOT_READ_BY_TICKET04' }; }),
    groupIdentity: 'DRAFT_COLLECTION_CODE_NOT_CANONICAL_TOPIC_ID', membershipRuntimeIds: items.filter(i => i.placement.themeCode === t.code).map(i => i.runtimeVocabularyId), runtimeEligible: false }));
  const root = safe(cwd, outputRelative); assert(!existsSync(root), 'OUTPUT_ALREADY_EXISTS'); mkdirSync(root, { recursive: true });
  const manifest = { artifactType: 'EDITORIAL_PILOT_FROZEN_DRAFT', schemaVersion: 1, campaignId: s.campaignId, ticketId: '04', batchId,
    manifestRevision: 1, authorIdentity: s.authorIdentity, freezeStatus: 'FROZEN_DRAFT_NOT_ACTIVATED',
    runtimeEligible: false, executionAllowed: false, databaseWrites: 0, providerCalls: 0, newVocabularyIdentities: 0,
    technicalUuidPolicy: 'Batch/job/draft refs are UUIDv4 transport IDs, never Master entity IDs. No Master UUIDs minted.',
    baselinePin: { rootRelative: s.baselineRoot, manifestByteSha256: s.baselineManifestSha256 },
    inputPins, selectionPin: pin(selectionFile), hashAlgorithm: ALGORITHM, themes, items, jobs,
    reviewPolicy: 'Independent AI draft review is separate from authoring and from human publication approval. Pending canonical/placement/media gates prevent activation.',
    rightsPolicy: { existingMediaAttestationId: 'vocabflow-v2-public-media-owner-2026-10-18',
      status: 'EXISTING_ATTESTATION_PRESERVED_VERIFY_ASSET_SCOPE_NO_NEW_RIGHTS_GRANTED',
      newMediaRightsStatus: 'NOT_CREATED_PENDING_EVIDENCE', delivery: 'NO_REMOTE_URL_VERIFIED' } };
  put(root, 'manifest-r0001.json', manifest);
  put(root, 'selection.json', readFileSync(selectionFile));
  put(root, 'source-evidence.json', { artifactType: 'PILOT_SOURCE_EXCERPTS', baselinePin: manifest.baselinePin, inputPins, selectedSources });
  put(root, 'dedup-audit.json', { artifactType: 'PILOT_DUPLICATE_CANDIDATE_AUDIT', normalization: 'NFKC_TRIM_LOWERCASE',
    scanned: { runtimeRows: corpus.length, queueRows: queue.value.entries.length, oxfordRecords: oxford.value.records.length, vocab4600Records: vocab.value.records.length },
    limitations: ['Search forms are manually supplied candidates, not approved canonical aliases.', 'No complete canonical alias registry is available; no negative search is a verified new-word gap.', 'Reuse-only pilot. Deferred terms require later identity and full-source review.'],
    selected: dedupRows, deferred: s.deferredSearches.map(d => ({ ...d, ...search(d.searchForms), disposition: 'DEFER_NOT_VERIFIED_GAP' })) });
  const assetRows = [...media.values()];
  for (const a of assetRows) {
    const file = safe(cwd, a.local.path), actual = pin(file);
    assert(actual.byteSha256 === a.mediaSha256 && actual.byteLength === a.expectedByteLength, 'CANDIDATE_ASSET_BYTES_MISMATCH');
    const dest = safe(root, a.bundlePath); mkdirSync(path.dirname(dest), { recursive: true }); copyFileSync(file, dest);
  }
  put(root, 'candidate-media-index.json', { artifactType: 'PILOT_CANDIDATE_MEDIA_NOT_APPROVED', assets: assetRows });
  const table = items.map(i => `| ${i.placement.themeCode} | ${i.runtimeVocabularyId} | ${i.headword} (${i.partOfSpeech}) | ${i.meaningVi} | ${i.example.en} | ${i.example.vi} | ${i.placement.proposedGrades.join(', ')} |`).join('\n');
  put(root, 'READABLE-DRAFT.md', Buffer.from(`# Pilot 30 từ — bản thảo đóng băng\n\nChỉ tuyển chọn và biên tập trình bày; không nhập DB hoặc bật media. Master IDs và cấu hình provider vẫn chờ.\n\n| Nhóm | Runtime ID | Từ / POS | Nghĩa Việt | Ví dụ Anh | Ví dụ Việt | Lớp đề xuất |\n| --- | ---: | --- | --- | --- | --- | --- |\n${table}\n\nBốn nhóm là bộ tuyển chọn nháp; không phải bốn topic canonical mới. Từ đầu tiên là mức tuyển chọn đề xuất, không suy từ CEFR. Ví dụ dùng nghe/đọc có hỗ trợ.\n`));
  const sealFiles = readdirRecursive(root).map(rel => ({ path: rel, ...pin(safe(root, rel)) }));
  const seal = { artifactType: 'EDITORIAL_PILOT_DRAFT_SEAL', schemaVersion: 1, batchId, manifest: { path: 'manifest-r0001.json', ...pin(safe(root, 'manifest-r0001.json')) }, files: sealFiles };
  put(root, 'draft-seal.json', seal); put(root, 'draft-seal.sha256', Buffer.from(`${sha(bytes(seal))}\n`));
  return verifyPilot(outputRelative);
}

function readdirRecursive(root, prefix = '') {
  return readdirSync(prefix ? safe(root, prefix) : root, { withFileTypes: true }).flatMap(e => {
    const rel = prefix ? `${prefix}/${e.name}` : e.name; assert(!e.isSymbolicLink(), 'SYMLINK_NOT_ALLOWED');
    return e.isDirectory() ? readdirRecursive(root, rel) : [rel];
  }).sort();
}

export function verifyPilot(rootRelative) {
  const root = safe(process.cwd(), rootRelative), seal = read(safe(root, 'draft-seal.json'));
  assert(sha(readFileSync(safe(root, 'draft-seal.json'))) === readFileSync(safe(root, 'draft-seal.sha256'), 'utf8').trim(), 'SEAL_MISMATCH');
  assert(new Set(seal.files.map(x => x.path)).size === seal.files.length, 'DUPLICATE_FILE_PIN');
  for (const f of seal.files) { const a = pin(safe(root, f.path)); assert(a.byteSha256 === f.byteSha256 && a.byteLength === f.byteLength, `FILE_MISMATCH:${f.path}`); }
  const m = read(safe(root, 'manifest-r0001.json')), s = read(safe(root, 'selection.json'));
  assert(m.artifactType === 'EDITORIAL_PILOT_FROZEN_DRAFT' && m.freezeStatus === 'FROZEN_DRAFT_NOT_ACTIVATED', 'MANIFEST_SCHEMA');
  assert(seal.manifest.path === 'manifest-r0001.json' && seal.manifest.byteSha256 === pin(safe(root, 'manifest-r0001.json')).byteSha256 && seal.batchId === m.batchId, 'MANIFEST_PIN');
  validateSelection(s); assert(m.executionAllowed === false && m.runtimeEligible === false && m.databaseWrites === 0 && m.providerCalls === 0 && m.newVocabularyIdentities === 0, 'DRAFT_BOUNDARY');
  assert(m.items.length === 30 && m.jobs.length === 90 && new Set(m.items.map(i => i.runtimeVocabularyId)).size === 30 && new Set(m.jobs.map(j => j.jobId)).size === 90, 'CARDINALITY');
  const evidence = read(safe(root, 'source-evidence.json'));
  assert(m.baselinePin.manifestByteSha256 === s.baselineManifestSha256 && hashValue(evidence.baselinePin) === hashValue(m.baselinePin)
    && hashValue(evidence.inputPins) === hashValue(m.inputPins), 'INPUT_EVIDENCE_PINS');
  assert(m.selectionPin.byteSha256 === pin(safe(root, 'selection.json')).byteSha256, 'SELECTION_PIN');
  assert(m.themes.length === 4 && m.themes.every(t => !t.runtimeEligible && hashValue(t.membershipRuntimeIds) === hashValue(m.items.filter(i => i.placement.themeCode === t.code).map(i => i.runtimeVocabularyId))), 'THEME_MEMBERSHIP');
  for (const i of m.items) {
    const source = evidence.selectedSources.find(x => x.corpusRow.runtimeVocabularyId === i.runtimeVocabularyId);
    assert(source && i.sourceRowHash === hashValue(source.corpusRow) && i.sourceCrosswalkHash === hashValue(source.crosswalkRow), 'SOURCE_ROW_MISMATCH');
    assert(hashValue(bindingIdentity(i)) === hashValue(bindingIdentity(source.corpusRow)), 'SOURCE_IDENTITY_MISMATCH');
    assert(i.masterSenseId === null && i.masterLexemeId === null && i.pronunciationId === null && i.example.masterExampleId === null && i.example.exampleKey === null
      && i.runtimeEligible === false && i.placement.runtimeEligible === false && i.pedagogy.humanEditorialApproval === 'PENDING_OWNER_REVIEW', 'UNVERIFIED_IDENTITY_OR_ACTIVATION');
    const choice = s.items.find(c => c.runtimeVocabularyId === i.runtimeVocabularyId);
    assert(choice && i.meaningVi === choice.meaningVi && i.example.en === choice.en && i.example.vi === choice.vi && i.headword === choice.headword, 'SELECTION_COPY_MISMATCH');
    assert(i.partOfSpeech === source.corpusRow.partOfSpeech && i.senseDefinitionEn === source.corpusRow.definitionEn
      && i.placement.sharedProgressRuntimeVocabularyId === i.runtimeVocabularyId && i.placement.cefrChangeRequested === false
      && i.placement.localCefr === source.corpusRow.currentCefr
      && hashValue(i.placement.proposedGrades) === hashValue(choice.grades ?? ['GRADE_1', 'GRADE_2']), 'IDENTITY_OR_PLACEMENT_DRIFT');
    assert(i.presentationHash === hashValue({ meaningVi: i.meaningVi, example: i.example, placement: i.placement, image: i.image }), 'PRESENTATION_HASH');
    const jobs = m.jobs.filter(j => j.target.runtimeVocabularyId === i.runtimeVocabularyId);
    assert(jobs.length === 3 && hashValue(jobs.map(j => j.kind).sort()) === hashValue(['EXAMPLE_AUDIO', 'IMAGE', 'WORD_AUDIO'])
      && i.mediaJobs.length === 3 && i.mediaJobs.every(id => jobs.some(j => j.jobId === id)), 'JOB_BINDING');
    for (const j of jobs) {
      assert(hashValue(j.target) === hashValue(bindingIdentity(i)) && hashValue(j.dependencies.identity) === hashValue(j.target) && j.draftVariantId === i.draftVariantId, 'JOB_IDENTITY');
      assert(j.executionAllowed === false && j.runtimeEligible === false && j.providerRequestHash === null && j.dependencyHash === hashValue(j.dependencies), 'JOB_GATE_OR_HASH');
      assert(j.kind !== 'IMAGE' || (j.state === 'OMITTED') === (i.image.decision === 'OMIT_NOT_DIAGNOSTIC'), 'IMAGE_OMISSION_DRIFT');
      if (j.kind === 'WORD_AUDIO') assert(j.dependencies.text === i.headword, 'WORD_AUDIO_WRONG_TEXT');
      if (j.kind === 'EXAMPLE_AUDIO') assert(j.dependencies.exactEnglishText === i.example.en && j.exampleDraftRef === i.example.draftRef, 'EXAMPLE_AUDIO_WRONG_TEXT');
    }
  }
  const mediaIndex = read(safe(root, 'candidate-media-index.json'));
  for (const a of mediaIndex.assets) {
    const actual = pin(safe(root, a.bundlePath));
    assert(a.approvedForPilot === false && actual.byteSha256 === a.mediaSha256 && actual.byteLength === a.expectedByteLength, 'CANDIDATE_MEDIA_INVALID_OR_APPROVED');
  }
  for (const j of m.jobs) assert(j.candidateAssetHashes.every(h => mediaIndex.assets.some(a => a.mediaSha256 === h))
    && j.candidateBindings.every(b => b.targetProposalKey === j.target.proposalKey && b.targetContentSha256 === j.target.sourceContentSha256
      && b.frozenRuntimeVocabularyId === j.target.runtimeVocabularyId && j.candidateAssetHashes.includes(b.mediaSha256)), 'CANDIDATE_BINDING_DRIFT');
  return { status: 'PASS_FROZEN_DRAFT_ONLY', rootRelative, batchId: m.batchId, manifestByteSha256: seal.manifest.byteSha256,
    sealByteSha256: sha(readFileSync(safe(root, 'draft-seal.json'))), files: seal.files.length,
    items: m.items.length, jobs: m.jobs.length, omittedImages: m.jobs.filter(j => j.state === 'OMITTED').length,
    mediaCandidateFiles: read(safe(root, 'candidate-media-index.json')).assets.length, newWords: 0, runtimeEligible: false };
}

function validateReview(receipt, verified, m) {
  assert(receipt.authorIdentity === m.authorIdentity && receipt.authorIdentity !== receipt.reviewerIdentity && receipt.reviewerIdentity
    && receipt.manifestByteSha256 === verified.manifestByteSha256, 'INDEPENDENT_REVIEW_IDENTITY_OR_PIN');
  assert(receipt.status === 'PASS_DRAFT_ONLY' && receipt.reviewedItems?.length === 30 && receipt.unresolvedBlockingFindings === 0, 'INDEPENDENT_REVIEW_INCOMPLETE');
  assert(new Set(receipt.reviewedItems.map(x => x.runtimeVocabularyId)).size === 30 && m.items.every(i => receipt.reviewedItems.some(r => r.runtimeVocabularyId === i.runtimeVocabularyId
    && r.sourceRowHash === i.sourceRowHash && r.presentationHash === i.presentationHash && r.decision === 'PASS_DRAFT_ONLY')), 'REVIEW_ITEM_PINS');
}

export function exportPilot(rootRelative, reviewRelative, destinationRelative) {
  const verified = verifyPilot(rootRelative), cwd = process.cwd(), root = safe(cwd, rootRelative), reviewPath = safe(cwd, reviewRelative), receipt = read(reviewPath);
  const m = read(safe(root, 'manifest-r0001.json'));
  validateReview(receipt, verified, m);
  const dest = safe(cwd, destinationRelative); assert(!existsSync(dest), 'PACKAGE_ALREADY_EXISTS'); mkdirSync(dest, { recursive: true });
  for (const rel of readdirRecursive(root)) { const out = safe(dest, `pilot/${rel}`); mkdirSync(path.dirname(out), { recursive: true }); copyFileSync(safe(root, rel), out); }
  put(dest, 'review/independent-review.json', readFileSync(reviewPath));
  for (const rel of ['scripts/editorial-pilot-v1.mjs', 'scripts/editorial-canary-lib-v1.mjs']) put(dest, `tools/${path.basename(rel)}`, readFileSync(safe(cwd, rel)));
  put(dest, 'README.md', Buffer.from('# Ticket04 portable editorial draft\n\nVerify from the receiving workspace root:\n\n    node <received-folder>/tools/editorial-pilot-v1.mjs verify-package <received-folder>\n\nShared input: pilot/manifest-r0001.json. Separate review receipt: review/independent-review.json. Candidate image/audio bytes are included under pilot/candidate-media; none are approved for this pilot. No DB import, provider call or publication is authorized. Workers read this frozen copy and return separate receipts outside the package. Configure voice/locale/style and issue new executable work orders only under tickets05/06. Source excerpts and scan results are included; the full sealed baseline is a separate ticket01 archive for replaying whole-corpus searches.\n'));
  const files = readdirRecursive(dest).map(rel => ({ path: rel, ...pin(safe(dest, rel)) }));
  put(dest, 'package-manifest.json', { artifactType: 'PILOT_DRAFT_HANDOFF', schemaVersion: 1, batchId: m.batchId, manifestByteSha256: verified.manifestByteSha256, runtimeEligible: false, files });
  put(dest, 'package-manifest.sha256', Buffer.from(`${pin(safe(dest, 'package-manifest.json')).byteSha256}\n`));
  return verifyPackage(destinationRelative);
}

export function verifyPackage(rootRelative) {
  const root = safe(process.cwd(), rootRelative), f = safe(root, 'package-manifest.json'), p = read(f);
  assert(pin(f).byteSha256 === readFileSync(safe(root, 'package-manifest.sha256'), 'utf8').trim(), 'PACKAGE_SEAL_MISMATCH');
  for (const file of p.files) { const actual = pin(safe(root, file.path)); assert(actual.byteSha256 === file.byteSha256 && actual.byteLength === file.byteLength, 'PACKAGE_FILE_MISMATCH'); }
  const result = verifyPilot(`${rootRelative}/pilot`), receipt = read(safe(root, 'review/independent-review.json'));
  assert(result.manifestByteSha256 === p.manifestByteSha256 && result.batchId === p.batchId && p.runtimeEligible === false, 'PACKAGE_REVIEW_MISMATCH');
  validateReview(receipt, result, read(safe(root, 'pilot/manifest-r0001.json')));
  return { ...result, packageRelative: rootRelative, packageFiles: p.files.length, packageManifestByteSha256: pin(f).byteSha256, independentReview: 'PASS_DRAFT_ONLY' };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, ...args] = process.argv.slice(2);
    const result = command === 'build' ? buildPilot(...args) : command === 'verify' ? verifyPilot(...args)
      : command === 'export' ? exportPilot(...args) : command === 'verify-package' ? verifyPackage(...args) : (() => { throw new Error('Use build/verify/export/verify-package'); })();
    console.log(JSON.stringify(result, null, 2));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
