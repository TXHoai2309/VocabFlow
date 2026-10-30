import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, renameSync, symlinkSync, writeFileSync, copyFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createCanary, readCanary, produceJob, produceWorker, mergeCanary, reviseCanary, retryJob, exportBundle, verifyBundle, safe, bytes } from './editorial-canary-lib-v1.mjs';

const ROOT = process.cwd();
const fixtures = path.resolve('.vocabflow-local/editorial-refresh-20261028/ticket03-verification');
mkdirSync(fixtures, { recursive: true });
const corpus = JSON.parse(readFileSync('vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2/corpus.json', 'utf8')).rows;
const sourceRows = ['apple', 'blue', 'dog'].map(word => corpus.find(x => x.proposalKey && x.headword === word));
function setup() {
  const parent = mkdtempSync(path.join(fixtures, 'case-')), root = path.join(parent, 'canary');
  createCanary(root, sourceRows, { baselineId: 'baseline-v2', manifestByteSha256: 'eef748df5dda27086c19f071ad6e3601f474b4494e07822fd844eda75f6365b2' });
  return root;
}
function complete(root) { produceWorker(root, 'images-canary'); produceWorker(root, 'tts-canary'); }
function first(root) { const { state } = readCanary(root); return state.orders[0]; }
function changeReceipt(root, order, revise) {
  const file = safe(root, order.receiptPath), receipt = JSON.parse(readFileSync(file)); revise(receipt); writeFileSync(file, bytes(receipt));
}
function worker(root, id) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/editorial-canary-v1.mjs', 'worker', path.relative(ROOT, root), id], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = ''; child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(stderr)));
  });
}
function copyTree(source, target) {
  mkdirSync(target, { recursive: true });
  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name), to = path.join(target, entry.name);
    if (entry.isDirectory()) copyTree(from, to); else copyFileSync(from, to);
  }
}

test('three existing identities yield nine mock-only jobs without canonical IDs', () => {
  const root = setup(), { manifest } = readCanary(root);
  assert.equal(manifest.items.length, 3); assert.equal(manifest.jobs.length, 9);
  assert.ok(manifest.items.every(x => x.masterSenseId === null && x.masterLexemeId === null));
  assert.equal(manifest.runtimeEligible, false); assert.equal(manifest.items[2].example.exampleKey, null);
  assert.ok(manifest.items[2].example.baselineExampleRef);
});
test('image and TTS worker processes complete concurrently without lost receipts', async () => {
  const root = setup(); await Promise.all([worker(root, 'images-canary'), worker(root, 'tts-canary')]);
  const summary = mergeCanary(root); assert.equal(summary.counts.REVIEW_REQUIRED_MOCK, 9);
  assert.equal(summary.providerCalls, 0); assert.equal(summary.runtimeEligible, false);
});
test('receipt replay and merge replay are idempotent', () => {
  const root = setup(); complete(root); const a = mergeCanary(root), state = readCanary(root).state;
  const snapshotPath = state.lastSnapshot.path; complete(root); const b = mergeCanary(root);
  assert.deepEqual(a, b); assert.equal(readCanary(root).state.lastSnapshot.path, snapshotPath);
});
test('one worker cannot claim another worker lease', () => {
  const root = setup(), order = first(root);
  assert.throws(() => produceJob(root, 'tts-canary', order.jobId, order), /WORKER_LEASE_MISMATCH/);
  assert.throws(() => produceJob(root, 'images-canary', order.jobId, { leaseId: 'wrong' }), /WORKER_LEASE_MISMATCH/);
});
test('wrong receipt manifest pin is rejected', () => {
  const root = setup(), order = first(root); produceJob(root, order.workerId, order.jobId, order);
  changeReceipt(root, order, x => { x.manifest.byteSha256 = '0'.repeat(64); });
  assert.throws(() => mergeCanary(root), /RECEIPT_MANIFEST_PIN_MISMATCH/);
});
test('wrong target or request binding is rejected', () => {
  const root = setup(), order = first(root); produceJob(root, order.workerId, order.jobId, order);
  changeReceipt(root, order, x => { x.target.runtimeVocabularyId++; });
  assert.throws(() => mergeCanary(root), /RECEIPT_TARGET_OR_REQUEST_MISMATCH/);
});
test('wrong job is rejected', () => {
  const root = setup(), order = first(root); produceJob(root, order.workerId, order.jobId, order);
  changeReceipt(root, order, x => { x.jobId = 'unissued-job'; });
  assert.throws(() => mergeCanary(root), /RECEIPT_LEASE_OR_JOB_MISMATCH/);
});
test('changed output bytes and missing outputs are rejected', () => {
  const root = setup(), order = first(root); produceJob(root, order.workerId, order.jobId, order);
  writeFileSync(safe(root, order.outputPath), '{}');
  assert.throws(() => mergeCanary(root), /OUTPUT_BYTES_MISMATCH/);
  renameSync(safe(root, order.outputPath), safe(root, order.outputPath + '.preserved'));
  assert.throws(() => mergeCanary(root), /ENOENT/);
});
test('same attempt cannot overwrite conflicting output', () => {
  const root = setup(), order = first(root); mkdirSync(path.dirname(safe(root, order.outputPath)), { recursive: true });
  writeFileSync(safe(root, order.outputPath), 'different-bytes');
  assert.throws(() => produceJob(root, order.workerId, order.jobId, order), /IMMUTABLE_OUTPUT_CONFLICT/);
});
test('Vietnamese-only presentation correction preserves all image and English audio requests', () => {
  const root = setup(); complete(root);
  reviseCanary(root, items => { items[0].meaningVi += ' (mock correction)'; return items; });
  const summary = mergeCanary(root);
  assert.equal(summary.counts.REVIEW_REQUIRED_MOCK, 9); assert.equal(summary.counts.STALE_INPUT, undefined);
  assert.ok(summary.jobs.every(x => x.carriedOverUnchangedInput));
});
test('English example edit stales only that example audio', () => {
  const root = setup(); complete(root);
  reviseCanary(root, items => { items[0].example.en += ' Mock text amendment.'; return items; });
  const summary = mergeCanary(root); assert.equal(summary.counts.STALE_INPUT, 1);
  assert.equal(summary.jobs.find(x => x.status === 'STALE_INPUT').kind, 'EXAMPLE_AUDIO');
  assert.equal(summary.counts.REVIEW_REQUIRED_MOCK, 8);
});
test('image brief edit stales only its image', () => {
  const root = setup(); complete(root);
  reviseCanary(root, items => { items[0].imageBrief += ' Mock framing amendment.'; return items; });
  const summary = mergeCanary(root); assert.equal(summary.counts.STALE_INPUT, 1);
  assert.equal(summary.jobs.find(x => x.status === 'STALE_INPUT').kind, 'IMAGE');
});
test('phoneme amendment stales only its word audio', () => {
  const root = setup(); complete(root);
  reviseCanary(root, items => { items[0].pronunciation.phonemePayload = 'MOCK_PHONEME_2'; return items; });
  const summary = mergeCanary(root); assert.equal(summary.counts.STALE_INPUT, 1);
  assert.equal(summary.jobs.find(x => x.status === 'STALE_INPUT').kind, 'WORD_AUDIO');
});
test('voice amendment stales the word and example audio for that item', () => {
  const root = setup(); complete(root);
  reviseCanary(root, items => { items[0].ttsConfig.voice = 'MOCK_VOICE_2'; return items; });
  const summary = mergeCanary(root); assert.equal(summary.counts.STALE_INPUT, 2);
  assert.ok(summary.jobs.filter(x => x.status === 'STALE_INPUT').every(x => x.kind !== 'IMAGE'));
});
test('canary cannot redefine original headword, POS or example identity', () => {
  const root = setup();
  assert.throws(() => reviseCanary(root, items => { items[0].headword = 'new-word'; return items; }), /SOURCE_IDENTITY_OR_MEANING_REVISION_NOT_PERMITTED/);
  assert.throws(() => reviseCanary(root, items => { items[0].example.exampleKey = 'invented'; return items; }), /SOURCE_IDENTITY_OR_MEANING_REVISION_NOT_PERMITTED/);
});
test('coordinator retry uses new immutable attempt and rejects superseded lease', () => {
  const root = setup(), old = first(root); produceJob(root, old.workerId, old.jobId, old);
  const next = retryJob(root, old.jobId, old.workerId); assert.equal(next.attempt, 2);
  assert.throws(() => produceJob(root, old.workerId, old.jobId, old), /SUPERSEDED_ATTEMPT/);
  produceJob(root, next.workerId, next.jobId, next);
  assert.ok(existsSync(safe(root, old.receiptPath)) && existsSync(safe(root, next.receiptPath)));
  assert.equal(mergeCanary(root).counts.REVIEW_REQUIRED_MOCK, 1);
});
test('missing receipts are visible and workers do not write aggregate snapshots', () => {
  const root = setup(); const result = mergeCanary(root); assert.equal(result.counts.MISSING_RECEIPT, 9);
  const old = readCanary(root).state.lastSnapshot.path; produceWorker(root, 'images-canary');
  assert.equal(readCanary(root).state.lastSnapshot.path, old);
  assert.equal(mergeCanary(root).counts.REVIEW_REQUIRED_MOCK, 3);
});
test('coordinator lock prevents another merge writer', () => {
  const root = setup(); writeFileSync(safe(root, 'coordinator.lock'), 'another-coordinator');
  assert.throws(() => mergeCanary(root), /COORDINATOR_BUSY/);
});
test('traversal, alternate-data-stream and parent junction paths are rejected', () => {
  const root = setup();
  assert.throws(() => safe(root, '../escape'), /INVALID_RELATIVE_PATH/);
  assert.throws(() => safe(root, 'stream:secret'), /INVALID_RELATIVE_PATH/);
  symlinkSync(os.tmpdir(), path.join(root, 'outside'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => safe(root, 'outside/not-created.json'), /JUNCTION_OUTSIDE_ROOT/);
});
test('portable package verifies after relocation without original ignored sources', () => {
  const root = setup(); complete(root); mergeCanary(root);
  const bundle = path.join(path.dirname(root), 'handoff'), report = exportBundle(root, bundle);
  const relocated = path.join(path.dirname(root), 'other-worktree', 'received'); copyTree(bundle, relocated);
  assert.deepEqual(verifyBundle(relocated), report);
  assert.equal(report.originalBaselineRequired, false); assert.equal(report.receipts, 9);
});
test('package detects an extra file and a modified source pin', () => {
  const root = setup(); complete(root); const bundle = path.join(path.dirname(root), 'handoff'); exportBundle(root, bundle);
  writeFileSync(safe(bundle, 'extra.fake'), 'x'); assert.throws(() => verifyBundle(bundle), /PACKAGE_FILE_SET_MISMATCH/);
  renameSync(safe(bundle, 'extra.fake'), path.join(path.dirname(bundle), 'extra.preserved'));
  const stateFile = safe(bundle, 'coordination-state.json'); const state = JSON.parse(readFileSync(stateFile)); state.baselinePin.manifestByteSha256 = 'f'.repeat(64);
  writeFileSync(stateFile, bytes(state)); assert.throws(() => verifyBundle(bundle), /PACKAGE_FILE_HASH_MISMATCH/);
});
