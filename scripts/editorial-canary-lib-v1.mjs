import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Bounded ticket03 harness. Fake JSON outputs are never image/audio media.
export const KINDS = ['IMAGE', 'WORD_AUDIO', 'EXAMPLE_AUDIO'];
export const MOCK = { mockOnly: true, runtimeEligible: false, provider: 'MOCK_NO_PROVIDER', voice: null, locale: null };
export const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const bytes = value => Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
export function assert(ok, code) { if (!ok) throw new Error(code); }
export function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export const hashValue = value => sha(Buffer.from(stable(value), 'utf8'));
export function safe(root, relative) {
  assert(typeof relative === 'string' && relative && !path.isAbsolute(relative) && !relative.includes('\\')
    && !relative.split('/').some(x => !x || x === '.' || x === '..' || x.includes(':')), 'INVALID_RELATIVE_PATH');
  const result = path.resolve(root, relative), relation = path.relative(path.resolve(root), result);
  assert(relation && !relation.startsWith('..') && !path.isAbsolute(relation), 'PATH_OUTSIDE_ROOT');
  let ancestor = result;
  while (true) { try { lstatSync(ancestor); break; } catch (error) { if (error.code !== 'ENOENT') throw error; ancestor = path.dirname(ancestor); } }
  const actual = path.relative(realpathSync(root), realpathSync(ancestor));
  assert(!actual || (!actual.startsWith('..') && !path.isAbsolute(actual)), 'JUNCTION_OUTSIDE_ROOT');
  return result;
}
function load(root, relative) { return JSON.parse(readFileSync(safe(root, relative), 'utf8')); }
function immutable(root, relative, value) {
  const output = Buffer.isBuffer(value) ? value : bytes(value), file = safe(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  if (existsSync(file)) { assert(readFileSync(file).equals(output), 'IMMUTABLE_OUTPUT_CONFLICT'); return; }
  try { writeFileSync(file, output, { flag: 'wx' }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; assert(readFileSync(file).equals(output), 'IMMUTABLE_OUTPUT_CONFLICT'); }
}
function saveState(root, state) {
  const temp = `coordination-${randomUUID()}.tmp`;
  immutable(root, temp, state);
  renameSync(safe(root, temp), safe(root, 'coordination-state.json'));
}
function withCoordinator(root, action) {
  const lock = safe(root, 'coordinator.lock');
  try { writeFileSync(lock, String(process.pid), { flag: 'wx' }); }
  catch (error) { if (error.code === 'EEXIST') throw new Error('COORDINATOR_BUSY'); throw error; }
  try { return action(); } finally { unlinkSync(lock); }
}
function identity(item) {
  return { baselineRowId: item.baselineRowId, runtimeVocabularyId: item.runtimeVocabularyId,
    proposalKey: item.proposalKey, sourceGroupKey: item.sourceGroupKey,
    sourceContentSha256: item.sourceContentSha256, masterSenseId: null, masterLexemeId: null };
}
export function requestFor(item, kind) {
  const binding = identity(item);
  if (kind === 'IMAGE') return { binding, kind, imageBrief: item.imageBrief, imageStyle: item.imageStyle, ...MOCK };
  if (kind === 'WORD_AUDIO') return { binding, kind, text: item.headword, partOfSpeech: item.partOfSpeech,
    pronunciation: item.pronunciation, ttsConfig: item.ttsConfig, ...MOCK };
  assert(kind === 'EXAMPLE_AUDIO', 'UNKNOWN_JOB_KIND');
  return { binding, kind, exampleKey: item.example.exampleKey, baselineExampleRef: item.example.baselineExampleRef,
    exampleId: null, text: item.example.en, ttsConfig: item.ttsConfig, ...MOCK };
}
function verifyManifest(root, ref) {
  const raw = readFileSync(safe(root, ref.path));
  assert(sha(raw) === ref.byteSha256, 'MANIFEST_HASH_MISMATCH');
  const manifest = JSON.parse(raw);
  assert(manifest.mockOnly && !manifest.runtimeEligible && !manifest.approvalGranted, 'NON_MOCK_MANIFEST_REJECTED');
  assert(manifest.jobs.length === manifest.items.length * 3 && new Set(manifest.jobs.map(x => x.jobId)).size === manifest.jobs.length, 'MANIFEST_JOB_CARDINALITY');
  for (const job of manifest.jobs) {
    const item = manifest.items.find(x => x.baselineRowId === job.target.baselineRowId);
    assert(item && hashValue(identity(item)) === hashValue(job.target), 'MANIFEST_TARGET_MISMATCH');
    assert(hashValue(requestFor(item, job.kind)) === job.requestHash, 'MANIFEST_REQUEST_HASH_MISMATCH');
  }
  return manifest;
}
function publishManifest(root, state, items, priorJobs = []) {
  const revision = state.manifests.length + 1;
  const manifest = { artifactType: 'EDITORIAL_CANARY_MANIFEST', schemaVersion: 'canary-1', hashAlgorithm: 'sha256-sorted-json-canary-v1',
    campaignId: state.campaignId, batchId: state.batchId, revision, mockOnly: true, runtimeEligible: false,
    approvalGranted: false, masterIdentityStatus: 'PENDING_IDENTITY', baselinePin: state.baselinePin, items,
    jobs: items.flatMap(item => KINDS.map(kind => ({ jobId: priorJobs.find(j => j.target.baselineRowId === item.baselineRowId && j.kind === kind)?.jobId ?? randomUUID(),
      kind, target: identity(item), requestHash: hashValue(requestFor(item, kind)) }))) };
  const relative = `input/manifest-r${String(revision).padStart(4, '0')}.json`;
  immutable(root, relative, manifest);
  const ref = { path: relative, byteSha256: sha(bytes(manifest)) };
  state.manifests.push(ref); state.currentManifest = ref;
  return manifest;
}
function newOrder(state, job, workerId) {
  assert(/^[a-z0-9-]+$/u.test(workerId), 'INVALID_WORKER_ID');
  const attempt = 1 + state.orders.filter(x => x.jobId === job.jobId).length;
  const attemptId = randomUUID(), leaseId = randomUUID();
  const folder = `runs/${workerId}/${job.jobId}/attempt-${String(attempt).padStart(4, '0')}`;
  const order = { jobId: job.jobId, attempt, attemptId, leaseId, workerId, manifest: state.currentManifest,
    requestHash: job.requestHash, kind: job.kind, target: job.target,
    outputPath: `${folder}/output.fake.json`, receiptPath: `${folder}/receipt.json`,
    expiresAtUtc: new Date(Date.now() + 3600_000).toISOString() };
  state.orders.push(order); state.activeAttempts[job.jobId] = attemptId;
  return order;
}
export function createCanary(root, sourceRows, baselinePin) {
  root = safe(process.cwd(), path.relative(process.cwd(), root).replaceAll('\\', '/'));
  mkdirSync(root, { recursive: true });
  assert(!existsSync(safe(root, 'coordination-state.json')), 'CANARY_ALREADY_EXISTS');
  assert(sourceRows.length === 3 && new Set(sourceRows.map(x => x.baselineRowId)).size === 3, 'EXACTLY_THREE_EXISTING_ITEMS_REQUIRED');
  const items = sourceRows.map(row => {
    assert(row.proposalKey && row.sourceContentSha256 && Number.isSafeInteger(row.runtimeVocabularyId) && row.examples?.[0]?.en, 'EXISTING_SOURCE_IDENTITY_REQUIRED');
    return { ...identity(row), headword: row.headword, partOfSpeech: row.partOfSpeech,
      meaningVi: row.meaningVi, definitionEn: row.definitionEn, imageBrief: row.definitionEn, imageStyle: 'MOCK_NO_IMAGE',
      pronunciation: { pronunciationId: null, phonemePayload: 'PENDING_PRONUNCIATION_MOCK_ONLY' },
      ttsConfig: { provider: 'MOCK_NO_PROVIDER', voice: null, locale: null, rate: 1 },
      example: { exampleKey: row.examples[0].exampleKey ?? null, baselineExampleRef: `${row.baselineRowId}-example-0`,
        exampleId: null, en: row.examples[0].en, vi: row.examples[0].vi ?? null },
      semanticReviewStatus: 'UNREVIEWED' };
  });
  const state = { artifactType: 'CANARY_COORDINATOR_STATE', schemaVersion: 1, campaignId: 'editorial-refresh-20261028',
    batchId: randomUUID(), baselinePin, manifests: [], currentManifest: null, orders: [], activeAttempts: {},
    snapshotGeneration: 0, lastSnapshot: null, providerCalls: 0, databaseAccess: false };
  const manifest = publishManifest(root, state, items);
  for (const job of manifest.jobs) newOrder(state, job, job.kind === 'IMAGE' ? 'images-canary' : 'tts-canary');
  immutable(root, 'coordination-state.json', state);
  return state;
}
export function reviseCanary(root, reviseItems) {
  return withCoordinator(root, () => {
    const state = load(root, 'coordination-state.json'), old = verifyManifest(root, state.currentManifest);
    const items = reviseItems(structuredClone(old.items));
    assert(items.length === old.items.length && items.every(item => old.items.some(x => hashValue(identity(x)) === hashValue(identity(item)))), 'IDENTITY_REVISION_NOT_PERMITTED');
    assert(items.every(item => { const before = old.items.find(x => x.baselineRowId === item.baselineRowId); return item.headword === before.headword
      && item.partOfSpeech === before.partOfSpeech && item.definitionEn === before.definitionEn
      && item.example.exampleKey === before.example.exampleKey && item.example.baselineExampleRef === before.example.baselineExampleRef
      && item.example.exampleId === null && item.pronunciation.pronunciationId === null; }), 'SOURCE_IDENTITY_OR_MEANING_REVISION_NOT_PERMITTED');
    const manifest = publishManifest(root, state, items, old.jobs); saveState(root, state); return manifest;
  });
}
export function retryJob(root, jobId, workerId) {
  return withCoordinator(root, () => {
    const state = load(root, 'coordination-state.json'), manifest = verifyManifest(root, state.currentManifest);
    const job = manifest.jobs.find(x => x.jobId === jobId); assert(job, 'UNKNOWN_JOB');
    const order = newOrder(state, job, workerId); saveState(root, state); return order;
  });
}
export function produceJob(root, workerId, jobId, { attemptId, leaseId } = {}) {
  const state = load(root, 'coordination-state.json');
  const currentAttempt = state.activeAttempts[jobId];
  const order = state.orders.find(x => x.attemptId === (attemptId ?? currentAttempt));
  assert(order && order.jobId === jobId && order.workerId === workerId && (!leaseId || leaseId === order.leaseId), 'WORKER_LEASE_MISMATCH');
  assert(order.attemptId === currentAttempt, 'SUPERSEDED_ATTEMPT');
  assert(Date.parse(order.expiresAtUtc) > Date.now(), 'LEASE_EXPIRED');
  const manifest = verifyManifest(root, order.manifest), job = manifest.jobs.find(x => x.jobId === jobId);
  assert(job && job.requestHash === order.requestHash && hashValue(job.target) === hashValue(order.target), 'ORDER_BINDING_MISMATCH');
  const claim = `claims/${order.jobId}/${order.attemptId}.json`;
  immutable(root, claim, { attemptId: order.attemptId, jobId, leaseId: order.leaseId, workerId });
  if (existsSync(safe(root, order.receiptPath))) return validateReceipt(root, state, order.receiptPath).receipt;
  const output = bytes({ artifactType: 'CANARY_DUMMY_NOT_MEDIA', mockOnly: true, runtimeEligible: false,
    jobId, kind: job.kind, requestHash: job.requestHash, target: job.target, fakePayload: 'NO_IMAGE_NO_AUDIO_NO_PROVIDER' });
  immutable(root, order.outputPath, output);
  const receipt = { artifactType: 'EDITORIAL_CANARY_RECEIPT', schemaVersion: 1, mockOnly: true, runtimeEligible: false,
    jobId, attemptId: order.attemptId, leaseId: order.leaseId, workerId, manifest: order.manifest,
    requestHash: job.requestHash, kind: job.kind, target: job.target,
    output: { relativePath: order.outputPath, byteSha256: sha(output), byteLength: output.length, mimeType: 'application/json' },
    createdAtUtc: new Date().toISOString(), providerRequestId: null, providerCalls: 0, reviewStatus: 'REVIEW_REQUIRED_MOCK' };
  immutable(root, order.receiptPath, receipt); return receipt;
}
export function produceWorker(root, workerId) {
  const state = load(root, 'coordination-state.json');
  return state.orders.filter(x => x.workerId === workerId && state.activeAttempts[x.jobId] === x.attemptId)
    .map(order => produceJob(root, workerId, order.jobId, order));
}
export function validateReceipt(root, state, relative) {
  const receipt = load(root, relative), order = state.orders.find(x => x.attemptId === receipt.attemptId);
  assert(order && relative === order.receiptPath && receipt.jobId === order.jobId && receipt.leaseId === order.leaseId
    && receipt.workerId === order.workerId, 'RECEIPT_LEASE_OR_JOB_MISMATCH');
  const claim = load(root, `claims/${order.jobId}/${order.attemptId}.json`);
  assert(claim.attemptId === order.attemptId && claim.leaseId === order.leaseId && claim.workerId === order.workerId
    && claim.jobId === order.jobId, 'CLAIM_BINDING_MISMATCH');
  const issued = state.manifests.find(x => x.path === receipt.manifest?.path && x.byteSha256 === receipt.manifest?.byteSha256);
  assert(issued && hashValue(receipt.manifest) === hashValue(order.manifest), 'RECEIPT_MANIFEST_PIN_MISMATCH');
  const manifest = verifyManifest(root, issued), job = manifest.jobs.find(x => x.jobId === order.jobId);
  assert(receipt.mockOnly === true && receipt.runtimeEligible === false && receipt.providerCalls === 0
    && receipt.reviewStatus === 'REVIEW_REQUIRED_MOCK', 'NON_MOCK_RECEIPT_REJECTED');
  assert(job && receipt.requestHash === job.requestHash && receipt.requestHash === order.requestHash
    && receipt.kind === job.kind && hashValue(receipt.target) === hashValue(job.target), 'RECEIPT_TARGET_OR_REQUEST_MISMATCH');
  assert(receipt.output?.relativePath === order.outputPath && receipt.output.mimeType === 'application/json', 'RECEIPT_OUTPUT_PATH_MISMATCH');
  const output = readFileSync(safe(root, receipt.output.relativePath));
  assert(sha(output) === receipt.output.byteSha256 && output.length === receipt.output.byteLength, 'OUTPUT_BYTES_MISMATCH');
  const payload = JSON.parse(output);
  assert(payload.artifactType === 'CANARY_DUMMY_NOT_MEDIA' && payload.mockOnly && !payload.runtimeEligible
    && payload.jobId === job.jobId && payload.kind === job.kind && payload.requestHash === job.requestHash
    && hashValue(payload.target) === hashValue(job.target), 'OUTPUT_PAYLOAD_BINDING_MISMATCH');
  const current = verifyManifest(root, state.currentManifest).jobs.find(x => x.jobId === job.jobId);
  const status = state.activeAttempts[job.jobId] !== order.attemptId ? 'SUPERSEDED_ATTEMPT'
    : current?.requestHash !== job.requestHash ? 'STALE_INPUT' : 'REVIEW_REQUIRED_MOCK';
  return { receipt, status, carriedOverUnchangedInput: issued.byteSha256 !== state.currentManifest.byteSha256 && status === 'REVIEW_REQUIRED_MOCK' };
}
export function mergeCanary(root) {
  return withCoordinator(root, () => {
    const state = load(root, 'coordination-state.json'), manifest = verifyManifest(root, state.currentManifest);
    const jobs = manifest.jobs.map(job => {
      const order = state.orders.find(x => x.attemptId === state.activeAttempts[job.jobId]);
      assert(order, 'ACTIVE_ORDER_MISSING');
      if (!existsSync(safe(root, order.receiptPath))) return { jobId: job.jobId, kind: job.kind, status: 'MISSING_RECEIPT' };
      const result = validateReceipt(root, state, order.receiptPath);
      return { jobId: job.jobId, kind: job.kind, status: result.status, carriedOverUnchangedInput: result.carriedOverUnchangedInput,
        receiptPath: order.receiptPath, outputPath: result.receipt.output.relativePath, outputByteSha256: result.receipt.output.byteSha256 };
    });
    const snapshot = { artifactType: 'CANARY_COORDINATOR_SNAPSHOT', mockOnly: true, runtimeEligible: false,
      currentManifest: state.currentManifest, items: manifest.items.length, jobs, providerCalls: 0,
      counts: jobs.reduce((acc, job) => ({ ...acc, [job.status]: (acc[job.status] ?? 0) + 1 }), {}) };
    const payloadHash = hashValue(snapshot);
    if (state.lastSnapshot?.payloadHash === payloadHash) return load(root, state.lastSnapshot.path);
    state.snapshotGeneration++;
    const relative = `results/snapshot-${String(state.snapshotGeneration).padStart(4, '0')}.json`;
    immutable(root, relative, snapshot); state.lastSnapshot = { path: relative, payloadHash };
    saveState(root, state); return snapshot;
  });
}
function regularFiles(root, folder = root) {
  return readdirSync(folder, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(folder, entry.name); assert(!lstatSync(file).isSymbolicLink(), 'BUNDLE_SYMLINK_REJECTED');
    return entry.isDirectory() ? regularFiles(root, file) : [path.relative(root, file).replaceAll('\\', '/')];
  });
}
export function exportBundle(root, destination) {
  destination = safe(process.cwd(), path.relative(process.cwd(), destination).replaceAll('\\', '/'));
  assert(!existsSync(destination), 'BUNDLE_ALREADY_EXISTS');
  const relation = path.relative(path.resolve(root), path.resolve(destination));
  assert(relation.startsWith('..') || path.isAbsolute(relation), 'BUNDLE_MUST_BE_OUTSIDE_CANARY_ROOT');
  const state = load(root, 'coordination-state.json'); verifyManifest(root, state.currentManifest);
  const files = regularFiles(root).map(relative => ({ path: relative, content: readFileSync(safe(root, relative)) }));
  for (const name of ['editorial-canary-lib-v1.mjs', 'editorial-canary-v1.mjs']) {
    files.push({ path: `tools/${name}`, content: readFileSync(fileURLToPath(new URL(`./${name}`, import.meta.url))) });
  }
  assert(new Set(files.map(x => x.path)).size === files.length, 'BUNDLE_DUPLICATE_PATH');
  assert(!files.some(x => x.path === 'coordinator.lock' || x.path.endsWith('.tmp')), 'COORDINATOR_OPERATION_IN_PROGRESS');
  mkdirSync(destination, { recursive: true });
  for (const file of files) immutable(destination, file.path, file.content);
  const manifest = { artifactType: 'PORTABLE_CANARY_PACKAGE', schemaVersion: 1, mockOnly: true, runtimeEligible: false,
    baselinePin: state.baselinePin, originalBaselineRequired: false,
    files: files.map(x => ({ path: x.path, byteSha256: sha(x.content), byteLength: x.content.length })) };
  immutable(destination, 'package-manifest.json', manifest);
  immutable(destination, 'package-manifest.sha256', Buffer.from(`${sha(bytes(manifest))}\n`));
  return verifyBundle(destination);
}
export function verifyBundle(root) {
  const raw = readFileSync(safe(root, 'package-manifest.json'));
  assert(sha(raw) === readFileSync(safe(root, 'package-manifest.sha256'), 'utf8').trim(), 'PACKAGE_MANIFEST_HASH_MISMATCH');
  const manifest = JSON.parse(raw), expected = [...manifest.files.map(x => x.path), 'package-manifest.json', 'package-manifest.sha256'].sort();
  assert(hashValue(regularFiles(root).sort()) === hashValue(expected), 'PACKAGE_FILE_SET_MISMATCH');
  for (const pin of manifest.files) {
    const value = readFileSync(safe(root, pin.path)); assert(sha(value) === pin.byteSha256 && value.length === pin.byteLength, 'PACKAGE_FILE_HASH_MISMATCH');
  }
  const state = load(root, 'coordination-state.json'), current = verifyManifest(root, state.currentManifest);
  assert(hashValue(state.baselinePin) === hashValue(manifest.baselinePin), 'PACKAGE_BASELINE_PIN_MISMATCH');
  let receipts = 0;
  for (const order of state.orders) if (existsSync(safe(root, order.receiptPath))) { validateReceipt(root, state, order.receiptPath); receipts++; }
  return { status: 'PORTABLE_CANARY_VERIFIED', packageManifestSha256: sha(raw), files: manifest.files.length,
    items: current.items.length, jobs: current.jobs.length, receipts, providerCalls: 0, databaseAccess: false,
    originalBaselineRequired: false, mockOnly: true, runtimeEligible: false };
}
export function readCanary(root) { const state = load(root, 'coordination-state.json'); return { state, manifest: verifyManifest(root, state.currentManifest) }; }
