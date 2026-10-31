import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import canonicalize from 'canonicalize';
import { validateExpansionPlan } from './editorial-expansion-production-apply-core-v1.mjs';

const OUT = '.vocabflow-local/editorial-refresh-20261101/expansion-4997-production-r0001';
const INTAKE = '.vocabflow-local/editorial-refresh-20261101/expansion-5000-intake-r0001';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const hash = b => createHash('sha256').update(b).digest('hex');
const pin = path => { const b = readFileSync(path); return { path, byteLength: b.length, sha256: hash(b) }; };

function main() {
  const runtimeReleaseSha = process.argv[2];
  assert(/^[0-9a-f]{40}$/.test(runtimeReleaseSha ?? ''), 'RUNTIME_RELEASE_SHA_REQUIRED');
  assert(!existsSync(`${OUT}/production-plan-r0001.json`), 'IMMUTABLE_PLAN_ALREADY_EXISTS');
  const baseline = read(`${OUT}/production-baseline-r0001.json`);
  const draft = read(`${INTAKE}/dataset-with-media.current.json`);
  const uploads = read(`${OUT}/upload-checkpoint.current.json`);
  assert.equal(uploads.status, 'ALL_ORIGINALS_UPLOADED_BYTES_VERIFIED');
  assert.equal(Object.keys(uploads.assets).length, 14991);
  const floor = Math.max(baseline.allocation.maxVocabularyId, baseline.allocation.vocabularySequenceLastValue);
  const sourceFloor = baseline.allocation.maxSourceRecordId;
  const idByProposal = new Map();
  const items = draft.items.filter(row => !row.missingMedia.length).map(row => {
    const item = row.sourceItem;
    const get = role => { const a = row.media[role]; assert.equal(a.decode.status, 'PASS');
      const cloud = uploads.assets[a.sha256]; assert(cloud?.uploadBytesAndEtagMatch, 'UNVERIFIED_CLOUD_ASSET'); return cloud; };
    const image = get('image'), word = get('wordAudio'), example = get('exampleAudio');
    const content = { word: item.displayForm, meaningVi: item.meaningVi, shortMeaningVi: item.shortMeaningVi,
      definitionEn: item.definitionEn, partOfSpeech: item.partOfSpeech, cefr: item.cefr,
      tags: item.learningLevel === 'FIRST_WORDS' ? ['EDITORIAL:FIRST_WORDS'] : [],
      examples: [{ en: item.example.en, vi: item.example.vi, exampleKey: `expansion-5000-example:${item.example.exampleId}`, audioUrl: example.originalUrl }],
      media: { image: image.deliveryUrl, wordAudio: word.originalUrl, exampleAudio: example.originalUrl } };
    const runtimeVocabularyId = floor + item.slot;
    idByProposal.set(item.itemId, runtimeVocabularyId);
    return { itemId: item.itemId, proposalKey: item.itemId, package: 'expansion5000', runtimeVocabularyId,
      sourceRecordId: sourceFloor + item.slot, contentVersion: 1, contentSha256: hash(canonicalize(content)), content,
      topicCodes: item.topicCodes.map(code => `expansion5000:${code}`),
      topicLabel: draft.topics.find(t => t.code === item.topicCodes[0]).labelVi,
      sourceProvenance: { kind: 'CODEX_ORIGINAL_EDITORIAL', originalItemId: item.itemId,
        originalSlot: item.slot, originalContentSha256: item.contentSha256, originalExampleId: item.example.exampleId,
        originalPronunciationId: item.pronunciation.pronunciationId, originalTopicCodes: item.topicCodes,
        frozenDatasetSha256: draft.sourceDatasetSha256, author: 'Codex; authorized internal workers',
        mediaProducerAttribution: 'Muse, provided and selected for production by owner', ownerPublicationDate: '2026-11-01' },
      classificationEvidence: { learningLevel: item.learningLevel, cefr: item.cefr, status: 'EDITORIAL_ESTIMATE',
        rationale: item.classificationRationale, officialCefrCertificationClaimed: false, gradeAssignment: null },
      mediaEvidence: Object.entries(row.media).map(([role, a]) => ({ role, jobId: a.jobId,
        sourceSha256: a.sha256, byteLength: a.byteLength, sourcePath: a.localPath,
        decoderStatus: a.decode.status, actualProviderReported: a.actualProviderReported,
        actualModelReported: a.actualModelReported, actualVoiceReported: a.actualVoiceReported,
        processingReported: a.processingReported, cloudinary: uploads.assets[a.sha256] })) };
  });
  const groups = draft.topics.map((t, index) => ({ code: `expansion5000:${t.code}`, slug: `owner-exp5000-${t.code}`,
    name: t.labelVi, description: `Từ vựng, hình minh họa và câu ví dụ về ${t.labelVi.toLocaleLowerCase('vi')}.`, sortOrder: 1000 + index }));
  const levelOrder = ['FIRST_WORDS', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
  const levelNames = { FIRST_WORDS: 'Từ đầu tiên', A1: 'Sơ cấp A1', A2: 'Cơ bản A2', B1: 'Trung cấp B1', B2: 'Trên trung cấp B2', C1: 'Nâng cao C1', C2: 'Chuyên sâu C2' };
  const sortedLessons = [...draft.lessons].sort((a, b) => levelOrder.indexOf(a.learningLevel) - levelOrder.indexOf(b.learningLevel)
    || draft.topics.findIndex(t => t.code === a.topicCode) - draft.topics.findIndex(t => t.code === b.topicCode) || a.part - b.part);
  const lessons = sortedLessons.map((l, index) => ({ lessonKey: l.lessonKey,
    slug: `exp5000-${l.topicCode}-${l.learningLevel.toLowerCase().replaceAll('_', '-')}-${l.part}`,
    name: `${l.topicLabelVi} · ${levelNames[l.learningLevel]} · Bài ${l.part}`,
    description: 'Từ vựng theo chủ đề và cấp độ, có hình minh họa, phát âm và câu ví dụ song ngữ.',
    topicCode: `expansion5000:${l.topicCode}`, learningLevel: l.learningLevel, sortOrder: 1000 + index,
    runtimeVocabularyIds: l.fileCompleteItemIds.map(id => { assert(idByProposal.has(id)); return idByProposal.get(id); }) }));
  const sourcePins = [pin(`${INTAKE}/dataset-with-media.current.json`), pin(`${INTAKE}/assembly-verification.current.json`),
    pin(`${OUT}/production-baseline-r0001.json`), pin(`${OUT}/upload-manifest-r0001.json`), pin(`${OUT}/upload-checkpoint.current.json`),
    ...['editorial-expansion-production-apply-core-v1.mjs', 'editorial-expansion-production-release-v1.mjs',
      'editorial-expansion-production-plan-v1.mjs', 'editorial-expansion-production-upload-v1.mjs'].map(f => pin(`scripts/${f}`))];
  const plan = { artifactType: 'OWNER_PRODUCTION_ADDITIVE_EXPANSION_PLAN', status: 'PREPARED_NOT_APPLIED', revision: 'r0001',
    date: '2026-11-01', catalogId: 'owner-production-1547-20261030-r0001', expansionId: 'production-expansion-4997-20261101-r0001',
    sourceDataset: 'VOCABFLOW_OWNER_EDITORIAL', target: baseline.target, baseline, sourcePins, runtimeReleaseSha,
    ownerSelection: { date: '2026-11-01', scope: 'Publish4997complete entries onproduction; defer3; uploadimages/voice tocloud',
      sourceAttribution: 'Owner-supplied Muse outputs and Codex original text; no independent MasterPASS claim' },
    counts: { existingItems: 1547, addedItems: 4997, finalItems: 6544, addedTopics: 50, addedLessons: 362,
      finalTopics: 123, finalLessons: 438, uploadedNewAssets: 14991, heldItems: 3 }, items, groups, lessons,
    protections: ['existing catalog rows/memberships', 'accounts/settings/progress/reviews/saved items', 'DBidentity/migration history', 'all existing Cloudinary media'],
    heldProposalKeys: draft.items.filter(x => x.missingMedia.length).map(x => x.sourceItem.itemId),
    canonicalMasterIdentityAssigned: false, independentMasterPassClaimed: false };
  validateExpansionPlan(plan);
  const bytes = Buffer.from(JSON.stringify(plan, null, 2) + '\n');
  writeFileSync(`${OUT}/production-plan-r0001.json`, bytes, { flag: 'wx' });
  writeFileSync(`${OUT}/production-plan-r0001.sha256`, hash(bytes) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ status: 'ADDITIVE_PLAN_VALIDATED', counts: plan.counts, sha256: hash(bytes), runtimeReleaseSha }));
}
try { main(); } catch (e) { console.error(JSON.stringify({ status: 'PLAN_STOPPED', code: /^[A-Z0-9_:-]{3,120}$/.test(e.message ?? '') ? e.message : 'SAFE_FAILURE' })); process.exitCode = 1; }
