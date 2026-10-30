import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync, symlinkSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

// Integration checks for the baseline handoff, intentionally no DB connection.
const ROOT = process.cwd();
const parent = path.resolve('.vocabflow-local/editorial-refresh-20261028/verification-fixtures');
mkdirSync(parent, { recursive: true });
const sha = value => createHash('sha256').update(value).digest('hex');
function fixture(files = []) {
  const dir = mkdtempSync(path.join(parent, 'guard-'));
  const bytes = Buffer.from(JSON.stringify({ files }));
  writeFileSync(path.join(dir, 'baseline-manifest.json'), bytes);
  writeFileSync(path.join(dir, 'baseline-manifest.json.sha256'), sha(bytes));
  return dir;
}
function run(args) {
  return spawnSync(process.execPath, ['scripts/editorial-baseline-v1.mjs', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 30000 });
}
function rejected(args, code) {
  const result = run(args);
  assert.equal(result.status, 1, result.stdout + result.stderr);
  assert.ok(result.stderr.includes(code), result.stderr);
}

test('sealed baseline verifies without DB access', () => {
  const result = run(['verify', 'vocabflow-dataset/workspaces/editorial-refresh-20261028/baseline-v2']);
  assert.equal(result.status, 0, result.stderr);
  const data = JSON.parse(result.stdout);
  assert.equal(data.databaseAccess, false);
  assert.equal(data.runtimeRows, 7341);
  assert.equal(data.exclusiveShards, 148);
});
test('capture cannot overwrite the frozen local observation', () => rejected(['capture'], 'CAPTURE_ALREADY_EXISTS_NEVER_OVERWRITE'));
test('build cannot overwrite an existing baseline', () => rejected(['build', 'baseline-v2'], 'FROZEN_BASELINE_ALREADY_EXISTS'));
test('manifest corruption is detected', () => {
  const dir = fixture();
  writeFileSync(path.join(dir, 'baseline-manifest.json'), '{"files":[],"tampered":true}');
  rejected(['verify', path.relative(ROOT, dir)], 'MANIFEST_SHA256_MISMATCH');
});
test('payload byte corruption is detected', () => {
  const original = Buffer.from('original');
  const dir = fixture([{ path: 'entry.json', byteLength: original.length, byteSha256: sha(original) }]);
  writeFileSync(path.join(dir, 'entry.json'), 'tampered');
  rejected(['verify', path.relative(ROOT, dir)], 'BASELINE_FILE_HASH_MISMATCH');
});
test('extra unlisted files are rejected', () => {
  const dir = fixture();
  writeFileSync(path.join(dir, 'extra.json'), '{}');
  rejected(['verify', path.relative(ROOT, dir)], 'UNLISTED_OR_MISSING_BASELINE_FILE');
});
test('relative traversal is rejected before any read outside workspace', () => rejected(['verify', '../outside-workspace'], 'PATH_OUTSIDE_ALLOWED_ROOT'));
test('nonexistent target below an external junction is rejected', () => {
  const dir = fixture();
  symlinkSync(os.tmpdir(), path.join(dir, 'outside'), process.platform === 'win32' ? 'junction' : 'dir');
  rejected(['verify', path.relative(ROOT, path.join(dir, 'outside', 'not-created-baseline'))], 'SYMLINK_OUTSIDE_ALLOWED_ROOT');
});
test('symbolic-link entries are rejected even if they target a local folder', () => {
  const dir = fixture();
  symlinkSync(parent, path.join(dir, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  rejected(['verify', path.relative(ROOT, dir)], 'BASELINE_SYMLINK_NOT_ALLOWED');
});
