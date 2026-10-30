import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import postgres from "postgres";
import { readMigrationHashEvidence, databaseHashMatchesMigrationSource } from "./migration-hash-verification";

const ROOT = process.cwd();
const OUT = ".vocabflow-local/editorial-refresh-20261028/ticket02-local-compat-v1";
const ENV = ".vocabflow-local/development.env";
const CONTAINER = "vocabflow-development-postgres";
const REQUIRED_TAGS = ["0019_light_penance", "0020_learning_topic_review", "0021_flashcard_display_mode"];
const EXTRA = { created_at: "1792171047874", hash: "fc4a8225caa27a01faea481c958fd6b39db5fb437b0f5b6e6f6f581879cac813" };
const EXTRA_ORIGIN = ".vocabflow-local/vercel-v2-cutover/final-release-file-classification.json";
const IGNORED_COLUMNS: Record<string, string[]> = {
  "vocabflow_app.topics": ["review_status", "parent_topic_id"],
  "vocabflow_app.vocabulary_topics": ["review_status"],
  "vocabflow_app.learner_profiles": ["flashcard_display_mode"],
};
const sha = (bytes: string | Buffer) => createHash("sha256").update(bytes).digest("hex");
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
function requireTrue(ok: unknown, code: string): asserts ok { if (!ok) throw new Error(code); }
function localPath(relative: string) {
  requireTrue(!path.isAbsolute(relative), "RELATIVE_PATH_REQUIRED");
  const result = path.resolve(ROOT, relative), relation = path.relative(ROOT, result);
  requireTrue(relation && !relation.startsWith("..") && !path.isAbsolute(relation), "PATH_OUTSIDE_REPO");
  let ancestor = result;
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const realRelation = path.relative(realpathSync(ROOT), realpathSync(ancestor));
  requireTrue(!realRelation || (!realRelation.startsWith("..") && !path.isAbsolute(realRelation)), "SYMLINK_OUTSIDE_REPO");
  return result;
}
function readJson(relative: string) { return JSON.parse(readFileSync(localPath(relative), "utf8")); }
function writeNew(relative: string, value: unknown) {
  const target = localPath(relative); mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, json(value), { flag: "wx" });
}

export function assertLocalConfiguration(env: Record<string, string | undefined>) {
  requireTrue(env.VOCABFLOW_ENV === "development" && env.DATABASE_ENV === "development"
    && env.EXECUTION_CONTEXT === "local-development" && env.DATABASE_DRIVER === "postgres-js" && !env.VERCEL_ENV,
  "DEDICATED_LOCAL_MARKERS_REQUIRED");
  for (const [key, role] of [["DATABASE_URL", "vocabflow_runtime"], ["DATABASE_MIGRATION_URL", "vocabflow_migration"], ["LOCAL_ADMIN_DATABASE_URL", "vocabflow_local_admin"]]) {
    let parsed: URL; try { parsed = new URL(env[key] ?? ""); } catch { throw new Error("LOCAL_CONNECTION_URL_INVALID"); }
    requireTrue(["postgres:", "postgresql:"].includes(parsed.protocol) && parsed.hostname === "127.0.0.1"
      && parsed.port === "55432" && parsed.pathname === "/vocabflow_dev" && decodeURIComponent(parsed.username) === role
      && parsed.password.length >= 20, "DEDICATED_LOCAL_TARGET_REQUIRED");
  }
}
function environment() {
  const parsed = parseEnv(readFileSync(localPath(ENV), "utf8"));
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) if (value !== undefined) env[key] = value;
  assertLocalConfiguration(env); return env;
}
type History = Array<{ id: number; hash: string; created_at: string }>;
export function validateHistory(history: History, evidence: ReturnType<typeof readMigrationHashEvidence>) {
  requireTrue(new Set(history.map(x => x.created_at)).size === history.length, "DUPLICATE_HISTORY_TIMESTAMP");
  let extras = 0;
  for (const row of history) {
    const match = evidence.find(x => String(x.folderMillis) === row.created_at);
    if (match) requireTrue(databaseHashMatchesMigrationSource(match, row.hash), "MIGRATION_HISTORY_HASH_MISMATCH");
    else { requireTrue(row.created_at === EXTRA.created_at && row.hash === EXTRA.hash, "UNKNOWN_HISTORICAL_MIGRATION"); extras++; }
  }
  requireTrue(extras === 1, "OBSERVED_HISTORICAL_MIGRATION_MISSING");
  const latest = Math.max(...history.map(x => Number(x.created_at)));
  const pending = evidence.filter(x => x.folderMillis > latest);
  requireTrue(pending.length === 0 || JSON.stringify(pending.map(x => x.tag)) === JSON.stringify(REQUIRED_TAGS), "UNREVIEWED_MIGRATION_PENDING");
  for (const migration of evidence.filter(x => x.folderMillis <= latest)) {
    requireTrue(history.some(x => String(migration.folderMillis) === x.created_at), "MISSING_HISTORY_PREFIX");
  }
  return pending;
}

async function snapshot(env: Record<string, string>) {
  const db = postgres(env.DATABASE_MIGRATION_URL, { max: 1, prepare: false, connect_timeout: 10,
    onnotice: () => undefined, connection: { default_transaction_read_only: true, application_name: "editorial-ticket02-invariants" } });
  try {
    return await db.begin("isolation level repeatable read read only", async tx => {
      await tx.unsafe("SET LOCAL statement_timeout = '60s'");
      const [identity] = await tx`SELECT current_database() AS database, session_user AS role,
        current_setting('transaction_read_only') AS read_only,
        (SELECT provider FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS provider,
        (SELECT environment FROM vocabflow_meta.local_environment WHERE database_name=current_database()) AS environment,
        has_database_privilege(current_user,current_database(),'CREATE') AS migration_database_create`;
      requireTrue(identity?.database === "vocabflow_dev" && identity.role === "vocabflow_migration" && identity.provider === "docker-local"
        && identity.environment === "development" && identity.read_only === "on" && identity.migration_database_create === false,
      "POST_CONNECT_LOCAL_IDENTITY_MISMATCH");
      const tables = await tx<{ table_schema: string; table_name: string }[]>`SELECT table_schema,table_name FROM information_schema.tables
        WHERE table_schema IN ('vocabflow_app','vocabflow_meta') AND table_type='BASE TABLE' ORDER BY table_schema,table_name`;
      const fingerprints: Record<string, { count: number; sha256: string }> = {};
      for (const table of tables) {
        requireTrue(/^[a-z_][a-z0-9_]*$/.test(table.table_name), "UNEXPECTED_TABLE_IDENTIFIER");
        const name = `${table.table_schema}.${table.table_name}`;
        const exclude = (IGNORED_COLUMNS[name] ?? []).map(x => `'${x}'`).join(",");
        const row = `to_jsonb(t) - ARRAY[${exclude}]::text[]`;
        const [value] = await tx.unsafe(`SELECT count(*)::int AS count,encode(sha256(convert_to(coalesce(string_agg((${row})::text,E'\\n' ORDER BY (${row})::text),''),'UTF8')),'hex') AS sha256 FROM "${table.table_schema}"."${table.table_name}" t`);
        fingerprints[name] = { count: value.count, sha256: value.sha256 };
      }
      const history = await tx<History>`SELECT id,hash,created_at::text FROM drizzle.__drizzle_migrations ORDER BY created_at,id`;
      const schema = await tx`SELECT table_name,column_name,data_type,is_nullable,column_default FROM information_schema.columns
        WHERE table_schema='vocabflow_app' ORDER BY table_name,ordinal_position`;
      const roleModel = await tx`SELECT rolname,rolsuper,rolinherit,rolcreaterole,rolcreatedb,rolcanlogin,rolreplication,rolbypassrls,rolconfig
        FROM pg_roles WHERE rolname LIKE 'vocabflow_%' ORDER BY rolname`;
      const memberships = await tx`SELECT granted.rolname AS granted_role,member.rolname AS member_role,m.admin_option
        FROM pg_auth_members m JOIN pg_roles granted ON granted.oid=m.roleid JOIN pg_roles member ON member.oid=m.member
        WHERE granted.rolname LIKE 'vocabflow_%' OR member.rolname LIKE 'vocabflow_%' ORDER BY granted.rolname,member.rolname`;
      const schemaSecurity = await tx`SELECT nspname,pg_get_userbyid(nspowner) AS owner,nspacl::text AS acl
        FROM pg_namespace WHERE nspname IN ('vocabflow_app','vocabflow_meta','drizzle','vocabflow_editorial_staging') ORDER BY nspname`;
      const sequences = await tx`SELECT sequencename,last_value::text FROM pg_sequences WHERE schemaname='vocabflow_app' ORDER BY sequencename`;
      const [counts] = await tx`SELECT (SELECT count(*)::int FROM vocabflow_app.vocabularies) AS vocabulary,
        (SELECT count(*)::int FROM vocabflow_app.master_v2_development_projections) AS v2,
        (SELECT count(*)::int FROM vocabflow_app.learner_progress) AS progress,
        (SELECT count(*)::int FROM vocabflow_app.review_events) AS reviews`;
      return { capturedAtUtc: new Date().toISOString(), identity, counts, fingerprints, history, schema,
        securitySha256: sha(json({ roleModel, memberships, schemaSecurity })), sequences,
        invariantAlgorithm: "POSTGRES_JSONB_SORTED_ROWS_SHA256_EXCLUDING_ONLY_ADDITIVE_COLUMNS_V1",
        excludedNewColumns: IGNORED_COLUMNS, learnerRowsExported: 0 };
    });
  } finally { await db.end({ timeout: 3 }); }
}

function validateSnapshotAgainstBaseline(state: Awaited<ReturnType<typeof snapshot>>) {
  const baseline = readJson("docs/plans/editorial-refresh-2026-10-28/ticket-01-baseline.result.json");
  requireTrue(baseline.status === "COMPLETE" && state.counts.vocabulary === 7341 && state.counts.v2 === 7311, "BASELINE_COUNTS_CHANGED");
  const capture = readJson(`${baseline.baselineRootRelative}/local-capture.json`);
  const currentVocab = state.fingerprints["vocabflow_app.vocabularies"];
  requireTrue(currentVocab?.count === capture.tables.vocabularies.length, "BASELINE_VOCABULARY_SCOPE_CHANGED");
}
function backup() {
  const folder = localPath(`${OUT}/backup`); mkdirSync(folder, { recursive: true });
  const archive = path.join(folder, "pre-migration.dump"), globalsFile = path.join(folder, "globals-without-passwords.sql");
  requireTrue(!existsSync(archive) && !existsSync(globalsFile), "BACKUP_ALREADY_EXISTS");
  const dump = spawnSync("docker", ["exec", CONTAINER, "pg_dump", "--format=custom", "--no-password", "--username=vocabflow_local_admin", "--dbname=vocabflow_dev"], { maxBuffer: 256 * 1024 * 1024 });
  requireTrue(dump.status === 0 && dump.stdout?.length > 0, "LOCAL_PG_DUMP_FAILED");
  requireTrue(dump.stdout.subarray(0, 5).toString() === "PGDMP", "INVALID_CUSTOM_DUMP_MAGIC");
  writeFileSync(archive, dump.stdout, { flag: "wx" });
  const globals = spawnSync("docker", ["exec", CONTAINER, "pg_dumpall", "--globals-only", "--no-role-passwords", "--no-password", "--username=vocabflow_local_admin"], { maxBuffer: 4 * 1024 * 1024 });
  requireTrue(globals.status === 0 && globals.stdout.length > 0 && !/\bPASSWORD\s+'/i.test(globals.stdout.toString()), "LOCAL_GLOBALS_BACKUP_FAILED");
  writeFileSync(globalsFile, globals.stdout, { flag: "wx" });
  const listing = spawnSync("docker", ["exec", "-i", CONTAINER, "pg_restore", "--list"], { input: dump.stdout, maxBuffer: 4 * 1024 * 1024 });
  requireTrue(listing.status === 0 && /vocabflow_app/.test(listing.stdout.toString()) && /vocabflow_meta/.test(listing.stdout.toString())
    && /__drizzle_migrations/.test(listing.stdout.toString()), "BACKUP_RESTORE_TOC_INVALID");
  return { archiveRelative: `${OUT}/backup/pre-migration.dump`, archiveByteSha256: sha(dump.stdout), archiveByteLength: dump.stdout.length,
    globalsRelative: `${OUT}/backup/globals-without-passwords.sql`, globalsByteSha256: sha(globals.stdout),
    restoreTocValidated: true, rolePasswordsIncluded: false, databaseRestored: false,
    recoveryScope: "Same dedicated local Docker DB with existing unchanged roles; restore command must be reviewed before destructive use." };
}
export function compareInvariants(before: Awaited<ReturnType<typeof snapshot>>, after: Awaited<ReturnType<typeof snapshot>>) {
  for (const [table, expected] of Object.entries(before.fingerprints)) {
    requireTrue(json(after.fingerprints[table]) === json(expected), `PRESERVED_TABLE_CHANGED:${table}`);
  }
  requireTrue(before.securitySha256 === after.securitySha256, "ROLE_OR_PROTECTED_SCHEMA_SECURITY_CHANGED");
  requireTrue(json(before.sequences) === json(after.sequences), "EXISTING_APP_SEQUENCES_CHANGED");
  requireTrue(json(after.history.slice(0, before.history.length)) === json(before.history), "EXISTING_MIGRATION_HISTORY_CHANGED");
}
async function prepare() {
  requireTrue(!existsSync(localPath(`${OUT}/plan.json`)), "PREPARED_PLAN_ALREADY_EXISTS");
  const env = environment(), before = await snapshot(env); validateSnapshotAgainstBaseline(before);
  const evidence = readMigrationHashEvidence("drizzle/migrations"), pending = validateHistory(before.history, evidence);
  requireTrue(JSON.stringify(pending.map(x => x.tag)) === JSON.stringify(REQUIRED_TAGS), "EXPECTED_THREE_PENDING_MIGRATIONS_REQUIRED");
  const originBytes = readFileSync(localPath(EXTRA_ORIGIN));
  requireTrue(originBytes.includes(Buffer.from(EXTRA.hash)), "HISTORICAL_EXTRA_ORIGIN_UNRESOLVED");
  const backupResult = backup(), afterBackup = await snapshot(env); compareInvariants(before, afterBackup);
  writeNew(`${OUT}/before.json`, before);
  writeNew(`${OUT}/plan.json`, { artifactType: "GUARDED_LOCAL_COMPATIBILITY_PLAN", schemaVersion: 1, ticketId: "02", status: "PREPARED_NOT_APPLIED",
    target: "127.0.0.1:55432/vocabflow_dev", pending: pending.map(x => ({ tag: x.tag, folderMillis: x.folderMillis, byteSha256: x.worktreeHash })),
    expectedBaselineVocabularyRows: 7341, expectedV2Rows: 7311, backup: backupResult,
    historicalExtra: { ...EXTRA, originIndex: EXTRA_ORIGIN, originIndexSha256: sha(originBytes), knownOriginalPath: "drizzle/migrations/0019_lucky_ironclad.sql",
      originalSqlCurrentlyAvailable: false, action: "PRESERVE_OBSERVED_HISTORY_VERBATIM_NO_REWRITE" },
    beforeSha256: sha(readFileSync(localPath(`${OUT}/before.json`))), collectorSha256: sha(readFileSync(fileURLToPath(import.meta.url))),
    executor: "scripts/local-development-postgres.ts migrate -> executeApplicationMigrations", databaseMutationStarted: false });
  console.log(json({ status: "LOCAL_COMPATIBILITY_PREPARED", plan: `${OUT}/plan.json`, pending: pending.map(x => x.tag),
    snapshot: backupResult, counts: before.counts, databaseWrites: 0 }));
}
async function apply() {
  const env = environment(), plan = readJson(`${OUT}/plan.json`), before = readJson(`${OUT}/before.json`);
  requireTrue(!existsSync(localPath(`${OUT}/applied.json`)), "MIGRATIONS_ALREADY_APPLIED_BY_THIS_PLAN");
  requireTrue(sha(readFileSync(localPath(`${OUT}/before.json`))) === plan.beforeSha256, "BEFORE_EVIDENCE_CHANGED");
  requireTrue(sha(readFileSync(fileURLToPath(import.meta.url))) === plan.collectorSha256, "PREPARED_TOOL_CHANGED");
  requireTrue(sha(readFileSync(localPath(plan.backup.archiveRelative))) === plan.backup.archiveByteSha256, "BACKUP_BYTES_CHANGED");
  const current = await snapshot(env); compareInvariants(before, current);
  const pending = validateHistory(current.history, readMigrationHashEvidence("drizzle/migrations"));
  requireTrue(json(pending.map(x => ({ tag: x.tag, folderMillis: x.folderMillis, byteSha256: x.worktreeHash }))) === json(plan.pending), "MIGRATION_PLAN_CHANGED");
  const childEnv: Record<string, string> = {};
  for (const key of ["PATH", "Path", "SystemRoot", "windir", "ComSpec", "PATHEXT", "USERPROFILE", "APPDATA", "LOCALAPPDATA", "TEMP", "TMP"]) if (process.env[key]) childEnv[key] = process.env[key]!;
  Object.assign(childEnv, env);
  const run = spawnSync(process.execPath, ["--import", "tsx", "scripts/local-development-postgres.ts", "migrate"], { env: childEnv, encoding: "utf8", maxBuffer: 4 * 1024 * 1024, timeout: 120000 });
  requireTrue(run.status === 0 && run.stdout.includes("LOCAL_POSTGRES_MIGRATIONS=PASS"), "TRUSTED_LOCAL_MIGRATION_FAILED");
  const after = await snapshot(env); compareInvariants(before, after);
  requireTrue(validateHistory(after.history, readMigrationHashEvidence("drizzle/migrations")).length === 0, "MIGRATIONS_STILL_PENDING");
  for (const [table, column] of [["master_v2_short_meanings", "vocabulary_id"], ["topics", "review_status"], ["topics", "parent_topic_id"],
    ["vocabulary_topics", "review_status"], ["learner_profiles", "flashcard_display_mode"]]) requireTrue(after.schema.some(x => x.table_name === table && x.column_name === column), "REQUIRED_SCHEMA_STILL_MISSING");
  requireTrue(after.fingerprints["vocabflow_app.master_v2_short_meanings"]?.count === 0, "UNEXPECTED_SHORT_MEANING_CONTENT_IMPORT");
  writeNew(`${OUT}/after.json`, after);
  writeNew(`${OUT}/applied.json`, { artifactType: "LOCAL_COMPATIBILITY_MIGRATION_RECEIPT", status: "APPLIED_AND_INVARIANTS_VERIFIED",
    target: plan.target, appliedTags: plan.pending.map((x: { tag: string }) => x.tag), preservedTables: Object.keys(before.fingerprints).length,
    beforeCounts: before.counts, afterCounts: after.counts, existingHistoryPrefixPreserved: true, protectedRoleAndSchemaStatePreserved: true,
    newHistoryRows: after.history.length - before.history.length, backup: plan.backup, contentImported: false,
    afterSha256: sha(readFileSync(localPath(`${OUT}/after.json`))), trustedExecutorOutput: run.stdout.trim().split(/\r?\n/) });
  console.log(json({ status: "LOCAL_COMPATIBILITY_APPLIED", receipt: `${OUT}/applied.json`, counts: after.counts,
    migrationHistoryRowsAdded: after.history.length - before.history.length, preservedTables: Object.keys(before.fingerprints).length }));
}
async function verify() {
  const env = environment(), before = readJson(`${OUT}/before.json`), plan = readJson(`${OUT}/plan.json`), current = await snapshot(env);
  compareInvariants(before, current); requireTrue(validateHistory(current.history, readMigrationHashEvidence("drizzle/migrations")).length === 0, "MIGRATIONS_STILL_PENDING");
  requireTrue(sha(readFileSync(localPath(plan.backup.archiveRelative))) === plan.backup.archiveByteSha256, "BACKUP_BYTES_CHANGED");
  console.log(json({ status: "LOCAL_COMPATIBILITY_VERIFIED", counts: current.counts, preservedTables: Object.keys(before.fingerprints).length, databaseWrites: 0 }));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2];
  (mode === "prepare" ? prepare : mode === "apply" ? apply : mode === "verify" ? verify : async () => { throw new Error("USAGE_PREPARE_APPLY_VERIFY"); })()
    .catch(error => { console.error(json({ status: "LOCAL_COMPATIBILITY_FAILED", code: /^[A-Z0-9_:.-]+$/.test(error.message) ? error.message : "LOCAL_COMPATIBILITY_OPERATION_FAILED" })); process.exitCode = 1; });
}
