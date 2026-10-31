import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import canonicalize from 'canonicalize';
import { applyExpansion, deferredProposalKeys, validateExpansionPlan } from './editorial-expansion-production-apply-core-v1.mjs';

const digest = content => createHash('sha256').update(canonicalize(content)).digest('hex');
const image = 'https://res.cloudinary.com/owner/image/upload/v1/vocabflow/owner/production-expansion-4997-20261101-r0001/images/a.png';
const wordAudio = 'https://res.cloudinary.com/owner/video/upload/v1/vocabflow/owner/production-expansion-4997-20261101-r0001/audio/b.mp3';
const exampleAudio = 'https://res.cloudinary.com/owner/video/upload/v1/vocabflow/owner/production-expansion-4997-20261101-r0001/audio/c.mp3';

function fixture() {
  const groups = Array.from({ length: 50 }, (_, n) => ({ code: `expansion5000:topic-${n}`, slug: `owner-exp5000-topic-${n}`, name: `Topic ${n}`, description: 'Original topic draft', sortOrder: 100 + n }));
  const items = [], lessons = [];
  for (let group = 0; group < 50; group++) {
    const groupSize = group === 49 ? 97 : 100;
    const members = [];
    for (let n = 0; n < groupSize; n++) {
      const index = items.length;
      const content = { word: `word-${index}`, meaningVi: 'nghĩa', shortMeaningVi: 'nghĩa', definitionEn: 'An original definition.', partOfSpeech: 'NOUN', cefr: 'A2', tags: [], examples: [{ en: 'An original example.', vi: 'Ví dụ.', audioUrl: exampleAudio }], media: { image, wordAudio, exampleAudio } };
      const item = { runtimeVocabularyId: 50000 + index, sourceRecordId: 1548 + index, proposalKey: `00000000-0000-7000-8000-${(index + 1).toString(16).padStart(12, '0')}`, contentVersion: 1, contentSha256: digest(content), topicCodes: [groups[group].code], content, sourceProvenance: { original: true }, classificationEvidence: { status: 'EDITORIAL_ESTIMATE' }, mediaEvidence: [{ kind: 'IMAGE' }, { kind: 'WORD_AUDIO' }, { kind: 'EXAMPLE_AUDIO' }] };
      items.push(item); members.push(item.runtimeVocabularyId);
    }
    const lessonCount = group < 12 ? 8 : 7;
    const size = Math.ceil(groupSize / lessonCount);
    for (let start = 0, part = 0; start < members.length; start += size, part++) {
      lessons.push({ slug: `exp5000-topic-${group}-a2-${part}`, name: `Topic ${group}, part ${part}`, description: 'Original lesson', topicCode: groups[group].code, sortOrder: 100 + lessons.length, runtimeVocabularyIds: members.slice(start, start + size) });
    }
  }
  return { catalogId: 'owner-production-1547-20261030-r0001', expansionId: 'production-expansion-4997-20261101-r0001', sourceDataset: 'VOCABFLOW_OWNER_EDITORIAL', baseline: { counts: { words: 1547, projections: 1547, oldProjections: 0 }, allocation: { maxVocabularyId: 30000, vocabularySequenceLastValue: 40000, maxSourceRecordId: 1547 } }, items, groups, lessons };
}
const original = fixture();
const copy = () => structuredClone(original);

test('complete 4,997-item plan partitions every identity into 362 lessons / 50 topics', () => {
  assert.deepEqual(validateExpansionPlan(original), { items: 4997, groups: 50, lessons: 362 });
});

for (const [name, mutate, error] of [
  ['duplicate runtime identity', p => { p.items[1].runtimeVocabularyId = p.items[0].runtimeVocabularyId; }, /EXISTING_OR_DUPLICATE_RUNTIME_ID/],
  ['old runtime identity', p => { p.items[0].runtimeVocabularyId = 1; }, /EXISTING_OR_DUPLICATE_RUNTIME_ID/],
  ['runtime ID below sequence allocation floor', p => { p.items[0].runtimeVocabularyId = 39999; }, /EXISTING_OR_DUPLICATE_RUNTIME_ID/],
  ['duplicate source identity', p => { p.items[1].sourceRecordId = p.items[0].sourceRecordId; }, /EXISTING_OR_DUPLICATE_SOURCE_ID/],
  ['old source identity', p => { p.items[0].sourceRecordId = 1547; }, /EXISTING_OR_DUPLICATE_SOURCE_ID/],
  ['duplicate proposal identity', p => { p.items[1].proposalKey = p.items[0].proposalKey; }, /DEFERRED_OR_DUPLICATE_PROPOSAL/],
  ['changed published text retaining its old hash', p => { p.items[0].content.word = 'different'; }, /PUBLICATION_CONTENT_HASH_MISMATCH/],
  ['changed guest catalog identity', p => { p.catalogId = 'a-new-catalog-resetting-progress'; }, /BASELINE_CATALOG_ID_MUST_REMAIN_STABLE/],
  ['wrong item count', p => { p.items.pop(); }, /EXACT_4997_ITEMS_REQUIRED/],
  ['unknown lesson member', p => { p.lessons[0].runtimeVocabularyIds[0] = 999999; }, /UNKNOWN_OR_DUPLICATE_LESSON_MEMBER/],
  ['duplicate lesson member', p => { p.lessons[0].runtimeVocabularyIds[1] = p.lessons[0].runtimeVocabularyIds[0]; }, /UNKNOWN_OR_DUPLICATE_LESSON_MEMBER/],
  ['missing lesson member', p => { p.lessons[0].runtimeVocabularyIds.pop(); }, /LESSON_PARTITION_MISSING_ITEMS/],
  ['wrong lesson topic', p => { p.lessons[0].topicCode = p.groups[1].code; }, /LESSON_TOPIC_MISMATCH/],
  ['duplicate lesson slug', p => { p.lessons[1].slug = p.lessons[0].slug; }, /DUPLICATE_OR_INVALID_LESSON_SLUG/],
  ['old Master projection baseline', p => { p.baseline.counts.oldProjections = 1; }, /OLD_MASTER_PROJECTIONS_MUST_BE_EMPTY/],
  ['missing media evidence', p => { p.items[0].mediaEvidence.pop(); }, /PUBLICATION_EVIDENCE_REQUIRED/],
]) {
  test(`rejects ${name} before mutation`, () => {
    const plan = copy(); mutate(plan); assert.throws(() => validateExpansionPlan(plan), error);
  });
}

for (const proposal of deferredProposalKeys) {
  test(`defers incomplete original proposal ${proposal}`, () => {
    const plan = copy(); plan.items[0].proposalKey = proposal;
    assert.throws(() => validateExpansionPlan(plan), /DEFERRED_OR_DUPLICATE_PROPOSAL/);
  });
}

test('rejects non-HTTPS Cloudinary URL even with a freshly calculated content hash', () => {
  const plan = copy(); plan.items[0].content.media.image = image.replace('https:', 'http:');
  plan.items[0].contentSha256 = digest(plan.items[0].content);
  assert.throws(() => validateExpansionPlan(plan), /NON_CLOUDINARY_PUBLICATION_URL/);
});

test('rejects swapped example-audio mapping even if all URLs and content hash are valid', () => {
  const plan = copy(); plan.items[0].content.examples[0].audioUrl = wordAudio;
  plan.items[0].contentSha256 = digest(plan.items[0].content);
  assert.throws(() => validateExpansionPlan(plan), /EXAMPLE_AUDIO_BINDING_MISMATCH/);
});

test('invalid plan cannot issue any SQL or acquire a mutation lock', async () => {
  const plan = copy(); plan.items.pop();
  let calls = 0;
  const tx = () => { calls++; throw new Error('UNEXPECTED_SQL'); };
  await assert.rejects(applyExpansion(tx, plan, 'a'.repeat(64)), /EXACT_4997_ITEMS_REQUIRED/);
  assert.equal(calls, 0);
});
