import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { buildPilot, exportPilot, verifyPackage, verifyPilot } from './editorial-pilot-v1.mjs';
import { bytes, hashValue, sha } from './editorial-canary-lib-v1.mjs';

// Local evidence tests, intentionally skipped if the ticket04 frozen data was not handed off.
// Every mutation is confined to a new UUID test folder; never edits the sealed draft.
const draft = 'vocabflow-dataset/workspaces/editorial-refresh-20261028/pilot-r0001';
const enabled = existsSync(path.join(draft, 'draft-seal.json'));
const suiteRoot = `.vocabflow-local/editorial-pilot-tests-v1/${randomUUID()}`;
const json = p => JSON.parse(readFileSync(p, 'utf8'));
const write = (p, j) => writeFileSync(p, bytes(j));
const digest = p => ({ byteSha256: sha(readFileSync(p)), byteLength: readFileSync(p).length });
function clone() {
  const root = `${suiteRoot}/${randomUUID()}`; mkdirSync(path.dirname(root), { recursive: true }); cpSync(draft, root, { recursive: true }); return root;
}
function reseal(root, edit) {
  const f = `${root}/manifest-r0001.json`, m = json(f); edit(m); write(f, m);
  const sealFile = `${root}/draft-seal.json`, seal = json(sealFile);
  for (const p of seal.files) Object.assign(p, digest(`${root}/${p.path}`));
  Object.assign(seal.manifest, digest(f)); write(sealFile, seal);
  writeFileSync(`${root}/draft-seal.sha256`, `${digest(sealFile).byteSha256}\n`);
}
function review(root) {
  const m = json(`${root}/manifest-r0001.json`), receipt = `${suiteRoot}/${randomUUID()}.json`;
  write(receipt, { artifactType: 'TEST_REVIEW_FIXTURE_NOT_ACTUAL_EDITORIAL_REVIEW', authorIdentity: m.authorIdentity,
    reviewerIdentity: 'TEST_INDEPENDENT_REVIEWER', manifestByteSha256: digest(`${root}/manifest-r0001.json`).byteSha256,
    status: 'PASS_DRAFT_ONLY', unresolvedBlockingFindings: 0,
    reviewedItems: m.items.map(i => ({ runtimeVocabularyId: i.runtimeVocabularyId, sourceRowHash: i.sourceRowHash, presentationHash: i.presentationHash, decision: 'PASS_DRAFT_ONLY' })) });
  return receipt;
}
const local = (name, fn) => test(name, { skip: !enabled }, fn);

local('sealed real pilot is 30 existing identities, four themes, no writes or executable jobs', () => {
  const result = verifyPilot(draft); assert.equal(result.items, 30); assert.equal(result.newWords, 0);
  assert.equal(result.jobs, 90); assert.equal(result.omittedImages, 5);
});
local('modified learner copy fails byte seal before handoff', () => {
  const root = clone(), file = `${root}/manifest-r0001.json`, m = json(file);
  m.items[0].meaningVi = 'incorrect text'; write(file, m);
  assert.throws(() => verifyPilot(root), /FILE_MISMATCH/);
});
local('missing candidate media is detected', () => {
  const root = clone(), file = `${root}/candidate-media-index.json`, j = json(file);
  j.assets[0].bundlePath = 'candidate-media/missing.mp3'; write(file, j);
  reseal(root, () => {}); assert.throws(() => verifyPilot(root), /ENOENT/);
});
local('rehashed wrong Sense target is rejected against pinned source excerpt', () => {
  const root = clone(); reseal(root, m => { m.items.find(i => i.headword === 'orange').proposalKey = 'WRONG_FRUIT_SENSE'; });
  assert.throws(() => verifyPilot(root), /SOURCE_IDENTITY_MISMATCH/);
});
local('new child sentence cannot borrow an old canonical example key', () => {
  const root = clone(); reseal(root, m => { m.items[0].example.exampleKey = 'old-example-key'; });
  assert.throws(() => verifyPilot(root), /UNVERIFIED_IDENTITY/);
});
local('CEFR and learner history identity cannot drift with editorial presentation', () => {
  for (const field of ['localCefr', 'sharedProgressRuntimeVocabularyId']) {
    const root = clone(); reseal(root, m => { m.items[0].placement[field] = field === 'localCefr' ? 'C2' : 999999; });
    assert.throws(() => verifyPilot(root), /IDENTITY_OR_PLACEMENT_DRIFT/);
  }
});
local('audio sentence mismatch rejected even when dependency hash is recomputed', () => {
  const root = clone(); reseal(root, m => { const j = m.jobs.find(j => j.kind === 'EXAMPLE_AUDIO');
    j.dependencies.exactEnglishText = 'The wrong sentence.'; j.dependencyHash = hashValue(j.dependencies); });
  assert.throws(() => verifyPilot(root), /EXAMPLE_AUDIO_WRONG_TEXT/);
});
local('a preflight job cannot silently become executable', () => {
  const root = clone(); reseal(root, m => { m.jobs[0].executionAllowed = true; });
  assert.throws(() => verifyPilot(root), /JOB_GATE_OR_HASH/);
});
local('partial or author self review cannot export a handoff', () => {
  const root = clone(), r = review(root), receipt = json(r);
  receipt.reviewerIdentity = receipt.authorIdentity; write(r, receipt);
  assert.throws(() => exportPilot(root, r, `${suiteRoot}/self`), /INDEPENDENT_REVIEW_IDENTITY/);
  receipt.reviewerIdentity = 'TEST_OTHER'; receipt.reviewedItems.pop(); write(r, receipt);
  assert.throws(() => exportPilot(root, r, `${suiteRoot}/partial`), /INDEPENDENT_REVIEW_INCOMPLETE/);
});
local('portable handoff verifies from another workspace without original baseline', () => {
  const root = clone(), receipt = review(root), out = `${suiteRoot}/package`;
  assert.equal(exportPilot(root, receipt, out).independentReview, 'PASS_DRAFT_ONLY');
  const receiver = `${suiteRoot}/receiver`; mkdirSync(receiver, { recursive: true }); cpSync(out, `${receiver}/received`, { recursive: true });
  const result = spawnSync(process.execPath, ['received/tools/editorial-pilot-v1.mjs', 'verify-package', 'received'], { cwd: receiver, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr); assert.equal(JSON.parse(result.stdout).items, 30);
  assert.throws(() => exportPilot(root, receipt, out), /PACKAGE_ALREADY_EXISTS/);
  const file = `${out}/review/independent-review.json`, changed = json(file); changed.reviewedItems.pop(); write(file, changed);
  const p = `${out}/package-manifest.json`, packageManifest = json(p);
  Object.assign(packageManifest.files.find(f => f.path === 'review/independent-review.json'), digest(file)); write(p, packageManifest);
  writeFileSync(`${out}/package-manifest.sha256`, `${digest(p).byteSha256}\n`);
  assert.throws(() => verifyPackage(out), /INDEPENDENT_REVIEW_INCOMPLETE/);
});
local('build refuses missing duplicate-check forms before touching output or baseline', () => {
  const selection = json(`${draft}/selection.json`); delete selection.items[0].searchForms;
  const input = `${suiteRoot}/invalid-selection.json`; mkdirSync(suiteRoot, { recursive: true }); write(input, selection);
  assert.throws(() => buildPilot(input, `${suiteRoot}/invalid-output`), /SEARCH_MUST_INCLUDE_HEADWORD/);
  assert.equal(existsSync(`${suiteRoot}/invalid-output`), false);
});
