import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanary, produceWorker, mergeCanary, exportBundle, verifyBundle, safe, sha, bytes } from './editorial-canary-lib-v1.mjs';

const ROOT = process.cwd();
const DEFAULT_ROOT = '.vocabflow-local/editorial-refresh-20261028/ticket03-canary-v1';
const DEFAULT_BUNDLE = '.vocabflow-local/editorial-refresh-20261028/ticket03-handoff-v1';
const SELF = fileURLToPath(import.meta.url);
function relativeRoot(value) { return safe(ROOT, value.replaceAll('\\', '/')); }
function workerProcess(rootRelative, workerId) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SELF, 'worker', rootRelative, workerId], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = ''; child.stdout.on('data', data => { stdout += data; }); child.stderr.on('data', data => { stderr += data; });
    child.on('error', reject); child.on('exit', code => code === 0 ? resolve(JSON.parse(stdout)) : reject(new Error(stderr || `WORKER_EXIT_${code}`)));
  });
}
try {
  const mode = process.argv[2], rootRelative = process.argv[3] ?? DEFAULT_ROOT, root = relativeRoot(rootRelative);
  if (mode === 'demo') {
    const result = JSON.parse(readFileSync(relativeRoot('docs/plans/editorial-refresh-2026-10-28/ticket-01-baseline.result.json'), 'utf8'));
    const manifestBytes = readFileSync(relativeRoot(result.manifestRelative));
    if (sha(manifestBytes) !== result.manifestByteSha256) throw new Error('BASELINE_PIN_MISMATCH');
    const baselineManifest = JSON.parse(manifestBytes), corpusPin = baselineManifest.files.find(x => x.path === 'corpus.json');
    const corpusBytes = readFileSync(relativeRoot(`${result.baselineRootRelative}/corpus.json`));
    if (sha(corpusBytes) !== corpusPin.byteSha256) throw new Error('CORPUS_PIN_MISMATCH');
    const corpus = JSON.parse(corpusBytes).rows;
    const rows = ['apple', 'blue', 'dog'].map(word => corpus.find(x => x.proposalKey && x.headword === word && x.examples?.[0]?.en));
    createCanary(root, rows, { baselineId: result.baselineId, manifestByteSha256: result.manifestByteSha256, corpusByteSha256: corpusPin.byteSha256 });
    writeFileSync(path.join(root, 'README.md'), '# Ticket03 mock canary\n\nThree existing items, nine simulated IMAGE/WORD_AUDIO/EXAMPLE_AUDIO jobs. Outputs are output.fake.json with application/json MIME, not playable media and never runtime eligible. No provider or DB access.\n\ninput/manifest-r0001.json is immutable. coordination-state.json is coordinator-owned. Workers write only assigned claims and attempt outputs/receipts. results/ contains coordinator snapshots.\n\nThe handoff bundle pins every file and includes tools/ for verification in another worktree with Node.js core modules only. Run from the receiving workspace: node <received-folder>/tools/editorial-canary-v1.mjs verify-bundle <received-folder>. No original ignored baseline files are required.\n\nCanonical IDs/pronunciation/semantic review remain pending. This is a bounded canary contract, not approval of production content, media, providers, locale or voice.\n', { flag: 'wx' });
    const workers = await Promise.all([workerProcess(rootRelative, 'images-canary'), workerProcess(rootRelative, 'tts-canary')]);
    const summary = mergeCanary(root), bundleRelative = process.argv[4] ?? DEFAULT_BUNDLE;
    const bundle = exportBundle(root, relativeRoot(bundleRelative));
    const report = { artifactType: 'TICKET_03_CANARY_RESULT', rootRelative, bundleRelative, ...bundle, status: 'COMPLETE_MOCK_ONLY', concurrentWorkerResults: workers,
      counts: summary.counts, providerCalls: 0, databaseAccess: false, runtimeEligible: false };
    const reportPath = relativeRoot('.vocabflow-local/editorial-refresh-20261028/ticket03-result.json');
    if (existsSync(reportPath)) throw new Error('RESULT_ALREADY_EXISTS');
    mkdirSync(path.dirname(reportPath), { recursive: true }); writeFileSync(reportPath, bytes(report), { flag: 'wx' });
    console.log(JSON.stringify(report));
  } else if (mode === 'worker') {
    const receipts = produceWorker(root, process.argv[4]); console.log(JSON.stringify({ workerId: process.argv[4], receipts: receipts.length, mockOnly: true }));
  } else if (mode === 'merge') console.log(JSON.stringify(mergeCanary(root)));
  else if (mode === 'verify-bundle') console.log(JSON.stringify(verifyBundle(root)));
  else throw new Error('USAGE: node scripts/editorial-canary-v1.mjs demo|worker|merge|verify-bundle [repo-relative-root] [workerId|bundle-root]');
} catch (error) {
  console.error(JSON.stringify({ status: 'CANARY_FAILED', code: error.code ?? error.message })); process.exitCode = 1;
}
