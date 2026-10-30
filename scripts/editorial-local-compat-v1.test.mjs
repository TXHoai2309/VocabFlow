import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLocalConfiguration, validateHistory, compareInvariants } from './editorial-local-compat-v1.mts';
import { readMigrationHashEvidence } from './migration-hash-verification.ts';

const password = 'dummy-local-test-password-only';
const env = {
  VOCABFLOW_ENV: 'development', DATABASE_ENV: 'development', EXECUTION_CONTEXT: 'local-development', DATABASE_DRIVER: 'postgres-js',
  DATABASE_URL: `postgres://vocabflow_runtime:${password}@127.0.0.1:55432/vocabflow_dev`,
  DATABASE_MIGRATION_URL: `postgres://vocabflow_migration:${password}@127.0.0.1:55432/vocabflow_dev`,
  LOCAL_ADMIN_DATABASE_URL: `postgres://vocabflow_local_admin:${password}@127.0.0.1:55432/vocabflow_dev`,
};
const evidence = readMigrationHashEvidence('drizzle/migrations');
const extra = { id: 20, hash: 'fc4a8225caa27a01faea481c958fd6b39db5fb437b0f5b6e6f6f581879cac813', created_at: '1792171047874' };
function beforeHistory() {
  return [...evidence.slice(0, 19).map((x, i) => ({ id: i + 1, hash: x.worktreeHash, created_at: String(x.folderMillis) })), extra];
}
test('accepts only the dedicated local configuration', () => assert.doesNotThrow(() => assertLocalConfiguration(env)));
test('refuses remote URLs before any connection', () => assert.throws(() => assertLocalConfiguration({ ...env, DATABASE_URL: env.DATABASE_URL.replace('127.0.0.1', 'remote.invalid') }), /DEDICATED_LOCAL_TARGET_REQUIRED/));
test('refuses wrong database/port/roles and production markers', () => {
  assert.throws(() => assertLocalConfiguration({ ...env, DATABASE_MIGRATION_URL: env.DATABASE_MIGRATION_URL.replace('/vocabflow_dev', '/neondb') }), /DEDICATED_LOCAL_TARGET_REQUIRED/);
  assert.throws(() => assertLocalConfiguration({ ...env, DATABASE_MIGRATION_URL: env.DATABASE_MIGRATION_URL.replace('55432', '5432') }), /DEDICATED_LOCAL_TARGET_REQUIRED/);
  assert.throws(() => assertLocalConfiguration({ ...env, DATABASE_MIGRATION_URL: env.DATABASE_URL }), /DEDICATED_LOCAL_TARGET_REQUIRED/);
  assert.throws(() => assertLocalConfiguration({ ...env, VERCEL_ENV: 'production' }), /DEDICATED_LOCAL_MARKERS_REQUIRED/);
});
test('selects exactly the three reviewed pending artifacts while retaining historical extra', () => {
  assert.deepEqual(validateHistory(beforeHistory(), evidence).map(x => x.tag), ['0019_light_penance', '0020_learning_topic_review', '0021_flashcard_display_mode']);
});
test('recognizes prior LF/CRLF representations without rewriting history', () => {
  const history = beforeHistory(); history[0] = { ...history[0], hash: evidence[0].crlfHash };
  assert.equal(validateHistory(history, evidence).length, 3);
});
test('rejects history hashes, duplicate timestamps, missing prefix and unknown extras', () => {
  const history = beforeHistory();
  assert.throws(() => validateHistory(history.map((x, i) => i === 0 ? { ...x, hash: '0'.repeat(64) } : x), evidence), /MIGRATION_HISTORY_HASH_MISMATCH/);
  assert.throws(() => validateHistory([...history, history[0]], evidence), /DUPLICATE_HISTORY_TIMESTAMP/);
  assert.throws(() => validateHistory(history.slice(1), evidence), /MISSING_HISTORY_PREFIX/);
  assert.throws(() => validateHistory(history.map(x => x.id === 20 ? { ...x, hash: '1'.repeat(64) } : x), evidence), /UNKNOWN_HISTORICAL_MIGRATION/);
});
test('rejects an additional unreviewed pending migration', () => {
  assert.throws(() => validateHistory(beforeHistory(), [...evidence, { ...evidence.at(-1), tag: '0022_unreviewed', folderMillis: evidence.at(-1).folderMillis + 1000 }]), /UNREVIEWED_MIGRATION_PENDING/);
});
test('accepts completed journal plus unchanged historical prefix', () => {
  const history = [...beforeHistory(), ...evidence.slice(19).map((x, i) => ({ id: 21 + i, hash: x.worktreeHash, created_at: String(x.folderMillis) }))];
  assert.deepEqual(validateHistory(history, evidence), []);
});
test('preservation comparison rejects content, security, sequence or historical changes', () => {
  const before = { fingerprints: { vocabulary: { count: 1, sha256: 'a' } }, securitySha256: 'roles', sequences: [{ name: 'id', value: '1' }], history: [{ id: 1, hash: 'old' }] };
  assert.doesNotThrow(() => compareInvariants(before, { ...before, fingerprints: { ...before.fingerprints, new_empty_table: { count: 0, sha256: 'b' } }, history: [...before.history, { id: 2, hash: 'new' }] }));
  assert.throws(() => compareInvariants(before, { ...before, fingerprints: { vocabulary: { count: 1, sha256: 'changed' } } }), /PRESERVED_TABLE_CHANGED/);
  assert.throws(() => compareInvariants(before, { ...before, securitySha256: 'different' }), /ROLE_OR_PROTECTED_SCHEMA_SECURITY_CHANGED/);
  assert.throws(() => compareInvariants(before, { ...before, sequences: [] }), /EXISTING_APP_SEQUENCES_CHANGED/);
  assert.throws(() => compareInvariants(before, { ...before, history: [] }), /EXISTING_MIGRATION_HISTORY_CHANGED/);
});
