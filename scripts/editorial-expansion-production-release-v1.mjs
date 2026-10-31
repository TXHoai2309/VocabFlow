import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { assertCleanReleaseSource } from './production-build.ts';
import { openSql, assertPostConnectIdentity } from './db-core.ts';
import { authorizeProductionRelease, resolveProductionConnection } from './production-release-safety.ts';
import { DATABASE_TARGETS } from '../config/database-targets.ts';
import { captureExpansionBaseline, applyExpansion, verifyExpansion } from './editorial-expansion-production-apply-core-v1.mjs';

const OUT = '.vocabflow-local/editorial-refresh-20261101/expansion-4997-production-r0001';
const ORIGIN = 'https://vocab-flow-steel.vercel.app';
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const sha = b => createHash('sha256').update(b).digest('hex');
const save = (name, data) => writeFileSync(`${OUT}/${name}`, JSON.stringify(data, null, 2) + '\n', { flag: 'wx' });

async function deploymentProof(expectedSha) {
  const linked = read('.vercel/project.json');
  const auth = read(join(process.env.APPDATA, 'com.vercel.cli/Data/auth.json'));
  assert(auth.token, 'VERCEL_AUTH_REQUIRED');
  const response = await fetch(`https://api.vercel.com/v6/deployments?projectId=${encodeURIComponent(linked.projectId)}&target=production&limit=1&teamId=${encodeURIComponent(linked.orgId)}`, {
    headers: { Authorization: `Bearer ${auth.token}` }, signal: AbortSignal.timeout(30000),
  });
  assert(response.ok, 'DEPLOYMENT_PROOF_UNAVAILABLE');
  const latest = (await response.json()).deployments?.[0];
  assert(latest && (latest.readyState === 'READY' || latest.state === 'READY'), 'PRODUCTION_RUNTIME_NOT_READY');
  assert.equal(latest.meta?.githubCommitSha, expectedSha, 'PRODUCTION_RELEASE_SHA_MISMATCH');
  assert.equal(latest.meta?.githubCommitRef, 'main', 'PRODUCTION_MAIN_REQUIRED');
  return { deploymentId: latest.uid, releaseSha: expectedSha };
}

async function main() {
  const phase = process.argv[2];
  assert(['inventory', 'rehearse', 'apply', 'verify'].includes(phase) && process.argv.length === 3, 'UNKNOWN_PHASE');
  const env = { ...parseEnv(readFileSync('.env', 'utf8')), VOCABFLOW_ENV: 'production', DATABASE_ENV: 'production', EXECUTION_CONTEXT: 'local-development' };
  env.PRODUCTION_MIGRATION_DATABASE_URL = env.db_prod_mir;
  const mutation = phase === 'apply' || phase === 'rehearse';
  const options = { target: 'production', ...(mutation ? { confirmTarget: 'production', confirmBranch: DATABASE_TARGETS.production.branchId } : {}) };
  const target = authorizeProductionRelease({ options, mode: mutation ? 'mutation' : 'read-only', environment: env });
  const connection = await resolveProductionConnection({ purpose: 'migration', environment: env });
  const db = openSql(connection.url);
  try {
    await assertPostConnectIdentity(db, target);
    if (phase === 'inventory') {
      assert(!existsSync(`${OUT}/production-baseline-r0001.json`), 'BASELINE_ALREADY_EXISTS');
      const baseline = await db.begin(async tx => {
        await tx`SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY`;
        return captureExpansionBaseline(tx);
      });
      assert.equal(baseline.counts.words, 1547);
      const response = await fetch(`${ORIGIN}/api/public/learning-index`, { cache: 'no-store' });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-vocabflow-catalog-mode'), 'owner-production');
      const index = await response.json();
      assert.equal(index.vocabulary.length, 1547);
      save('production-baseline-r0001.json', { ...baseline, target: { projectId: target.projectId, branchId: target.branchId } });
      save('public-before-r0001.json', index);
      console.log(JSON.stringify({ status: 'READ_ONLY_BASELINE_CAPTURED', counts: baseline.counts, allocation: baseline.allocation }));
      return;
    }
    const planPath = `${OUT}/production-plan-r0002.json`, bytes = readFileSync(planPath), pin = sha(bytes), plan = JSON.parse(bytes);
    assert.equal(pin, readFileSync(`${OUT}/production-plan-r0002.sha256`, 'utf8').trim(), 'PLAN_PIN_MISMATCH');
    assert.equal(plan.target.branchId, target.branchId);
    for (const source of plan.sourcePins) assert.equal(sha(readFileSync(source.path)), source.sha256, 'SOURCE_PIN_CHANGED');
    if (phase === 'rehearse') {
      let result;
      try {
        await db.begin('isolation level serializable', async tx => {
          result = await applyExpansion(tx, plan, pin);
          throw new Error('INTENTIONAL_REHEARSAL_ROLLBACK');
        });
      } catch (error) { assert.equal(error.message, 'INTENTIONAL_REHEARSAL_ROLLBACK'); }
      const after = await db.begin('read only', tx => captureExpansionBaseline(tx));
      assert.deepEqual(after.catalog, plan.baseline.catalog, 'REHEARSAL_CHANGED_BASELINE');
      assert.deepEqual(after.counts, plan.baseline.counts);
      const report = { status: 'FULL_REHEARSAL_ROLLBACK_PASS', planSha256: pin, countsAfterRollback: after.counts, result, committedVocabularyWrites: 0 };
      save('rehearsal-r0002.json', report);
      console.log(JSON.stringify({ status: report.status, counts: after.counts }));
      return;
    }
    if (phase === 'apply') {
      const sourceCheckout = fileURLToPath(new URL('../', import.meta.url));
      assertCleanReleaseSource({ head: execFileSync('git', ['-C', sourceCheckout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        requestedSha: plan.runtimeReleaseSha, status: execFileSync('git', ['-C', sourceCheckout, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' }) });
      const rehearsal = read(`${OUT}/rehearsal-r0002.json`);
      assert.equal(rehearsal.status, 'FULL_REHEARSAL_ROLLBACK_PASS');
      assert.equal(rehearsal.planSha256, pin);
      const proof = await deploymentProof(plan.runtimeReleaseSha);
      const result = await db.begin('isolation level serializable', tx => applyExpansion(tx, plan, pin));
      // PostgreSQL sequences are nontransactional: advance only after real commit.
      const planMaximum = Math.max(...plan.items.map(i => i.runtimeVocabularyId));
      await db.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(89421732)`;
        await tx`LOCK TABLE vocabflow_app.vocabularies IN SHARE ROW EXCLUSIVE MODE`;
        await tx`SELECT setval(pg_get_serial_sequence('vocabflow_app.vocabularies','id'),greatest(
          coalesce((SELECT last_value FROM pg_sequences WHERE schemaname='vocabflow_app' AND sequencename='vocabularies_id_seq'),0),
          coalesce((SELECT max(id) FROM vocabflow_app.vocabularies),0),${planMaximum}),true)`;
      });
      if (!existsSync(`${OUT}/application-result-r0001.json`)) save('application-result-r0001.json', { ...result, ...proof, planSha256: pin });
      console.log(JSON.stringify({ status: result.status, counts: result.counts, ...proof }));
    }
    const verified = await db.begin('read only', async tx => {
      await tx`SET LOCAL TIME ZONE 'UTC'`;
      return verifyExpansion(tx, plan, pin);
    });
    const response = await fetch(`${ORIGIN}/api/public/learning-index`, { cache: 'no-store' });
    assert.equal(response.status, 200);
    const index = await response.json();
    assert.equal(index.vocabulary.length, 6544);
    assert.equal(index.learningSets.length, 438);
    assert.equal(index.topics.length, 123);
    assert.equal(index.catalogIdentity, 'owner-production-1547-20261030-r0001');
    const existing = read(`${OUT}/public-before-r0001.json`);
    const byId = new Map(index.vocabulary.map(i => [i.id, i]));
    for (const item of existing.vocabulary) assert.deepEqual(byId.get(item.id), item, 'EXISTING_PUBLIC_ENTRY_CHANGED');
    const report = { status: 'PRODUCTION_ADDITIVE_PUBLICATION_VERIFIED', planSha256: pin, counts: verified.counts ?? verified,
      words: index.vocabulary.length, learningSets: index.learningSets.length, topics: index.topics.length, preservedExistingItems: 1547,
      newItems: 4997, heldItems: 3, catalogIdentity: index.catalogIdentity, origin: ORIGIN };
    writeFileSync(`${OUT}/live-verification.current.json`, JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { await db.end({ timeout: 5 }); }
}
main().catch(error => { console.error(JSON.stringify({ status: 'PUBLICATION_STOPPED', code: /^[A-Z0-9_:-]{3,120}$/.test(error?.message ?? '') ? error.message : error?.code ?? 'SAFE_FAILURE' })); process.exitCode = 1; });
