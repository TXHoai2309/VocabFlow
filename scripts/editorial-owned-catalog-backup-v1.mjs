import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parseEnv } from 'node:util';
import postgres from 'postgres';

const OUT = '.vocabflow-local/editorial-refresh-20261030/owned-catalog-r0001';
const sha = x => createHash('sha256').update(x).digest('hex');
const env = parseEnv(readFileSync('.vocabflow-local/development.env', 'utf8'));
const url = new URL(env.DATABASE_MIGRATION_URL);
assert(url.hostname === '127.0.0.1' && url.port === '55432' && url.pathname === '/vocabflow_dev' && decodeURIComponent(url.username) === 'vocabflow_migration');
assert(env.VOCABFLOW_ENV === 'development' && env.DATABASE_ENV === 'development' && env.EXECUTION_CONTEXT === 'local-development' && !env.VERCEL_ENV);
const db = postgres(url.toString(), { max: 1, prepare: false, onnotice: () => {} });
const docker = args => spawnSync('docker', ['exec', 'vocabflow-development-postgres', ...args], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
const save = (name, value) => writeFileSync(`${OUT}/${name}`, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
try {
  if (existsSync(`${OUT}/backup.json`)) {
    const old = JSON.parse(readFileSync(`${OUT}/backup.json`));
    assert.equal(sha(readFileSync(old.path)), old.sha256); assert.equal(old.restoreRehearsal, 'PASS');
    console.log('OWNER_CATALOG_BACKUP_ALREADY_VERIFIED');
  } else {
    const before = await db.begin('isolation level repeatable read read only', async tx => {
      const [identity] = await tx`SELECT current_database() AS database,current_user AS role,(SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider`;
      assert.deepEqual(identity, { database: 'vocabflow_dev', role: 'vocabflow_migration', provider: 'docker-local' });
      const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='vocabflow_app' ORDER BY tablename`;
      const fingerprints = {};
      for (const { tablename } of tables) {
        assert(/^[a-z_0-9]+$/.test(tablename));
        const [row] = await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex') AS sha256 FROM vocabflow_app."${tablename}" t`);
        fingerprints[tablename] = row;
      }
      const history = [...await tx`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`];
      return { identity, fingerprints, history };
    });
    assert.equal(before.fingerprints.vocabularies.count, 7341);
    assert(!existsSync(`${OUT}/before-owned-catalog.dump`), 'Interrupted backup exists; inspect before retry.');
    const dump = spawnSync('docker', ['exec', 'vocabflow-development-postgres', 'pg_dump', '-U', 'vocabflow_local_admin', '-d', 'vocabflow_dev', '-Fc'], { encoding: null, maxBuffer: 256 * 1024 * 1024, windowsHide: true });
    assert.equal(dump.status, 0, 'LOCAL_BACKUP_FAILED'); assert.equal(dump.stdout.subarray(0, 5).toString(), 'PGDMP');
    writeFileSync(`${OUT}/before-owned-catalog.dump`, dump.stdout, { flag: 'wx' });
    save('before.json', before);
    const temporaryDatabase = 'vocabflow_owner_catalog_restore_check_20261030';
    const created = docker(['createdb', '-U', 'vocabflow_local_admin', '-O', 'vocabflow_local_admin', temporaryDatabase]);
    assert.equal(created.status, 0, 'RESTORE_REHEARSAL_DATABASE_CREATE_FAILED_DO_NOT_DROP_UNKNOWN_DATABASE');
    let restored = false;
    try {
      const restore = spawnSync('docker', ['exec', '-i', 'vocabflow-development-postgres', 'pg_restore', '-U', 'vocabflow_local_admin', '-d', temporaryDatabase, '--no-owner'], { input: dump.stdout, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
      assert.equal(restore.status, 0, 'RESTORE_REHEARSAL_FAILED');
      for (const [table, fingerprint] of Object.entries(before.fingerprints)) {
        const statement = `SELECT json_build_object('count',count(*)::int,'sha256',encode(sha256(convert_to(coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text),''),'UTF8')),'hex')) FROM vocabflow_app."${table}" t`;
        const check = docker(['psql', '-U', 'vocabflow_local_admin', '-d', temporaryDatabase, '-At', '-c', statement]);
        assert.equal(check.status, 0, `RESTORED_TABLE_CHECK_FAILED:${table}`);
        assert.deepEqual(JSON.parse(check.stdout.trim()), fingerprint, `RESTORED_TABLE_MISMATCH:${table}`);
      }
      restored = true;
    } finally {
      // Only the exact scratch database created successfully above is dropped.
      const removed = docker(['dropdb', '-U', 'vocabflow_local_admin', temporaryDatabase]);
      assert.equal(removed.status, 0, 'RESTORE_REHEARSAL_SCRATCH_CLEANUP_FAILED');
    }
    assert(restored);
    save('backup.json', { path: `${OUT}/before-owned-catalog.dump`, sha256: sha(dump.stdout), byteLength: dump.stdout.length,
      privateAccountBackup: true, restoreRehearsal: 'PASS', restoredApplicationTableFingerprints: Object.keys(before.fingerprints).length,
      scratchDatabaseRemoved: true, liveRestoreExecuted: false });
    console.log(JSON.stringify({ status: 'OWNER_CATALOG_BACKUP_AND_FULL_RESTORE_REHEARSAL_PASS', applicationTables: Object.keys(before.fingerprints).length, byteLength: dump.stdout.length }));
  }
} finally { await db.end({ timeout: 3 }); }
