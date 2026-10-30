import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { parseEnv } from 'node:util';
import { chromium } from 'playwright';

// Real app + real dedicated local DB. No mocked API responses or account writes.
const ROOT = process.cwd();
const API = 'http://127.0.0.1:3002';
const WEB = 'http://127.0.0.1:5173';
const RUN = randomUUID();
const OUT = `.vocabflow-local/editorial-refresh-20261028/ticket02-preview/${RUN}`;
const processes = [];
let browser;
let activePage;
const report = { artifactType: 'REAL_LOCAL_GUEST_PREVIEW_VERIFICATION', schemaVersion: 1,
  runId: RUN, startedAtUtc: new Date().toISOString(), status: 'IN_PROGRESS',
  apiOrigin: API, webOrigin: WEB, mockApiResponses: false, checks: [], flows: [],
  blockedExternalOrigins: [], blockedApiMutations: [], pageErrors: [], newAccounts: 0 };
const serverOutput = [];
const local = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
const target = new URL(local.DATABASE_URL);
assert(target.hostname === '127.0.0.1' && target.port === '55432' && target.pathname === '/vocabflow_dev', 'DEDICATED_LOCAL_DB_REQUIRED');
assert(local.DATABASE_DRIVER === 'postgres-js' && local.VOCAB_DATASET_VERSION === 'v2'
  && local.VOCABFLOW_ENV === 'development' && !local.VERCEL_ENV, 'LOCAL_V2_RUNTIME_REQUIRED');
const baselineResult = JSON.parse(readFileSync('docs/plans/editorial-refresh-2026-10-28/ticket-01-baseline.result.json', 'utf8'));
assert.equal(createHash('sha256').update(readFileSync(baselineResult.manifestRelative)).digest('hex'), baselineResult.manifestByteSha256);
const corpus = JSON.parse(readFileSync(`${baselineResult.baselineRootRelative}/corpus.json`, 'utf8')).rows.filter(x => x.proposalKey);
const byId = new Map(corpus.map(x => [x.runtimeVocabularyId, x]));
mkdirSync(OUT, { recursive: true });

async function freePort(port) {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  await new Promise(resolve => server.close(resolve));
}
function start(args, env) {
  const child = spawn(process.execPath, args, { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  for (const stream of [child.stdout, child.stderr]) stream.on('data', data => {
    const text = data.toString().replace(/postgres(?:ql)?:\/\/[^\s"']+/gu, '[REDACTED_DB_URL]');
    serverOutput.push(text.slice(0, 3000));
  });
  processes.push(child); return child;
}
async function ready(url, child) {
  for (let attempt = 0; attempt < 600; attempt++) {
    assert(child.exitCode === null, 'OWNED_DEV_SERVER_EXITED');
    try { const response = await fetch(url, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch {}
    await delay(200);
  }
  throw new Error(`LOCAL_DEV_SERVER_TIMEOUT:${new URL(url).port}`);
}
async function json(url) {
  assert(new URL(url).origin === API, 'LOCAL_API_ONLY');
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `API_RESPONSE_${response.status}:${new URL(url).pathname}`);
  return response.json();
}
function record(name, detail) { report.checks.push({ name, status: 'PASS', ...detail }); }

try {
  await freePort(3002); await freePort(5173);
  const childEnv = {};
  for (const key of ['PATH', 'Path', 'SystemRoot', 'windir', 'ComSpec', 'PATHEXT', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'TEMP', 'TMP']) {
    if (process.env[key]) childEnv[key] = process.env[key];
  }
  Object.assign(childEnv, local);
  const api = start(['--import', 'tsx', 'apps/api/src/local-dev.ts'], childEnv);
  await ready(`${API}/api/health`, api);
  const web = start(['node_modules/vite/bin/vite.js', '--config', 'apps/web/vite.config.mts', '--host', '127.0.0.1', '--port', '5173', '--strictPort'], childEnv);
  await ready(WEB, web);
  console.log(JSON.stringify({ phase: 'LOCAL_SERVERS_READY', api: API, web: WEB }));

  const index = await json(`${API}/api/public/learning-index`);
  assert.equal(index.vocabulary.length, 7311);
  assert(index.vocabulary.every(x => byId.has(x.id)));
  record('Real learning index preserves all 7311 V2 IDs', { count: index.vocabulary.length });
  for (const [cefr, expected] of [['A1', 1008], ['UNCLASSIFIED', 1772]]) {
    const browse = await json(`${API}/api/public/vocabulary/browse?cefr=${cefr}&page=1&pageSize=30`);
    assert.equal(browse.total, expected);
    assert(browse.vocabulary.length > 0 && browse.vocabulary.every(x => {
      const row = byId.get(x.id); return row && (cefr === 'UNCLASSIFIED' ? !row.currentCefr : row.currentCefr === cefr);
    }));
    record('Real filtered browse ' + cefr, { total: browse.total, visible: browse.vocabulary.length });
  }
  const empty = await json(`${API}/api/public/vocabulary/browse?cefr=A1&level=GRADE_1&page=1&pageSize=30`);
  assert.equal(empty.total, 0); assert.equal(empty.vocabulary.length, 0);
  record('Empty grade intersection stays empty', { total: 0 });

  browser = await chromium.launch({ headless: true });
  for (const [width, cefr, label] of [[1440, 'A1', 'Sơ cấp (A1)'], [390, 'UNCLASSIFIED', 'Chưa phân loại']]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: 'vi-VN', reducedMotion: 'reduce' });
    const details = new Set();
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (!['http:', 'https:'].includes(url.protocol)) return route.continue();
      if (url.origin !== WEB) { report.blockedExternalOrigins.push(url.origin); return route.abort(); }
      if (url.pathname.startsWith('/api/') && !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) {
        report.blockedApiMutations.push({ path: url.pathname, method: request.method() }); return route.abort();
      }
      if (url.pathname === '/api/public/vocabulary') {
        for (const id of (url.searchParams.get('ids') ?? '').split(',').map(Number)) if (id) details.add(id);
      }
      return route.continue();
    });
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', () => report.pageErrors.push({ width, cefr, kind: 'UNCAUGHT_BROWSER_ERROR' }));
    await page.goto(`${WEB}/vocabulary`, { waitUntil: 'networkidle' });
    const level = page.getByRole('combobox', { name: 'Mức học' });
    await level.waitFor({ state: 'visible' });
    await level.selectOption(cefr);
    await page.waitForURL(url => url.searchParams.get('cefr') === cefr);
    await page.locator('[data-testid^="vocabulary-row-"]').first().waitFor({ state: 'visible' });
    assert.notEqual(await level.locator('option[value="intro-first-words"]').getAttribute('disabled'), null, 'FOUNDATION_OPTION_MUST_REMAIN_DISABLED');
    await page.screenshot({ path: `${OUT}/browse-${cefr}-${width}.png`, fullPage: true });
    const start = page.getByRole('link', { name: 'Học nội dung đã chọn', exact: true });
    assert((await start.getAttribute('href')).includes(`cefr=${cefr}`), 'BROWSE_START_LINK_MUST_RETAIN_CEFR');
    await start.click();
    await page.getByTestId('study-setup-page').waitFor({ state: 'visible' });
    await page.getByText(`Mức học: ${label}`, { exact: true }).waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Bắt đầu học', exact: true }).click();
    await page.getByTestId('study-session-ready').waitFor({ state: 'visible', timeout: 20000 });
    assert(details.size > 0, 'NO_REAL_DETAIL_REQUESTS');
    assert([...details].every(id => { const row = byId.get(id); return row && (cefr === 'UNCLASSIFIED' ? !row.currentCefr : row.currentCefr === cefr); }), 'STUDY_SCOPE_LEAK');
    const word = await page.locator('.flashcard-front .flashcard-word').textContent();
    assert([...details].some(id => byId.get(id).runtimeDisplay === word?.trim()), 'FLASHCARD_OUTSIDE_REAL_SCOPE');
    await page.getByRole('button', { name: 'Lật để xem nghĩa', exact: true }).click();
    await page.getByRole('button', { name: 'Đã nhớ', exact: true }).waitFor({ state: 'visible' });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'HORIZONTAL_OVERFLOW');
    await page.screenshot({ path: `${OUT}/study-${cefr}-${width}.png`, fullPage: true });
    report.flows.push({ width, cefr, status: 'PASS', pages: ['vocabulary', 'study/setup', 'study'], detailIdsInScope: [...details], flashcardWord: word?.trim(), flipped: true });
    await context.close();
    activePage = null;
  }
  assert.equal(report.blockedApiMutations.length, 0, 'UNEXPECTED_API_MUTATION_ATTEMPT');
  assert.equal(report.pageErrors.length, 0, 'BROWSER_PAGE_ERROR');
  report.status = 'PASS';
  console.log(JSON.stringify({ phase: 'REAL_LOCAL_PREVIEW_PASS', flows: report.flows.length, checks: report.checks.length, output: OUT }));
} catch (error) {
  report.status = 'FAIL';
  report.error = error.code ?? String(error.message).split('\n')[0];
  report.errorMessage = String(error.message).split('\n')[0];
  report.serverDiagnostic = serverOutput.slice(-8);
  if (activePage && !activePage.isClosed()) {
    report.failureUrl = activePage.url();
    await activePage.screenshot({ path: `${OUT}/failure.png`, fullPage: true }).catch(() => {});
  }
  console.error(JSON.stringify({ status: 'LOCAL_PREVIEW_FAILED', code: report.error, output: OUT }));
  process.exitCode = 1;
} finally {
  await browser?.close();
  for (const child of processes.reverse()) if (child.exitCode === null) child.kill();
  report.finishedAtUtc = new Date().toISOString();
  writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
}
