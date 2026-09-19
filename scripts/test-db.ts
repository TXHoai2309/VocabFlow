import type { ConnectionTarget, DatabaseTarget } from "@vocabflow/contracts";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertApplicationTablesAbsent,
  assertApplicationTablesPresent,
  assertMigrationStateZero,
  assertPostConnectIdentity,
  openSql,
  readContext,
  readMigrationState,
  runMigrations
} from "./db-core";
import { assertResolvedTargetBeforeMutation, configuredDatabaseUrl } from "./runtime-validation";
import { assertIdentitySnapshot, getIdentitySnapshot, resetApplicationScope } from "./db-reset-operations";
import { provisionCanonicalIdentity } from "./db-identity-provision";
import { runUs07TrustedDbSuite } from "./test-reviews-db";
import { runUs08TrustedDbSuite } from "./test-review-queue-db";
import { runUs26Us27TrustedDbSuite } from "./test-vocabulary-taxonomy-db";
import { runUs28Us29TrustedDbSuite } from "./test-learning-sets-db";
import { runUs30TrustedDbSuite } from "./test-daily-new-word-limit-db";

const ROLLBACK_MARKER = "__VOCABFLOW_PERMISSION_ROLLBACK__";

type TrustedDbStage =
  | "validate-execution-context"
  | "resolve-database-configuration"
  | "verify-trusted-targets"
  | "snapshot-protected-identity"
  | "prepare-shared-ci-clean-state"
  | "verify-clean-start-state"
  | "migrate-first-pass"
  | "verify-first-migration"
  | "reset-application-state"
  | "migrate-second-pass"
  | "verify-second-migration"
  | "verify-concurrent-identity"
  | "verify-permission-matrix"
  | "verify-us08-review-queue"
  | "verify-us07-review-runtime"
  | "verify-us26-us27-taxonomy"
  | "verify-us28-us29-learning-sets"
  | "verify-us30-daily-new-word-limit"
  | "verify-us35-us36-daily-activity";

type TrustedDbSubstage =
  | "target-migration"
  | "target-identity-provision"
  | "target-runtime"
  | "identity-validate-target"
  | "identity-read-snapshot"
  | "initial-reset-validate-before"
  | "initial-reset-application"
  | "initial-reset-validate-after"
  | "initial-reset-migration-zero"
  | "initial-reset-application-absent"
  | "initial-reset-identity-preserved"
  | "clean-start-validate-target"
  | "clean-start-migration-zero"
  | "clean-start-application-absent"
  | "first-migration-validate-target"
  | "first-migration-application-present"
  | "first-migration-tracking-present"
  | "reset-cycle-validate-before"
  | "reset-cycle-application"
  | "reset-cycle-validate-after"
  | "reset-cycle-migration-zero"
  | "reset-cycle-application-absent"
  | "reset-cycle-identity-preserved"
  | "second-migration-validate-target"
  | "second-migration-application-present"
  | "second-migration-tracking-present"
  | "concurrency-provision-pair"
  | "concurrency-validate-target"
  | "concurrency-identity-preserved"
  | "permission-identity-provision"
  | "permission-migration"
  | "permission-runtime"
  | `permission-${"identity-provision" | "migration" | "runtime"}-${"protected-identity" | "protected-write-policy" | "protected-denials" | "application-ddl" | "application-dml"}`;

function markStage(stage: TrustedDbStage) {
  console.log(`TRUSTED_DB_STAGE=${stage}`);
}

function markSubstage(substage: TrustedDbSubstage) {
  console.log(`TRUSTED_DB_SUBSTAGE=${substage}`);
}

export const trustedDbSuiteNames = ["full", "us08-review-queue"] as const;
export type TrustedDbSuite = typeof trustedDbSuiteNames[number];

export function resolveTrustedDbSuite(value = process.env.TRUSTED_DB_SUITE): TrustedDbSuite {
  const requested = value?.trim() || "full";
  if (!trustedDbSuiteNames.includes(requested as TrustedDbSuite)) {
    throw new Error("TRUSTED_DB_SUITE_INVALID");
  }
  return requested as TrustedDbSuite;
}

const SECRET_ENV_KEYS = [
  "BOOTSTRAP_DATABASE_URL",
  "DATABASE_URL",
  "DATABASE_MIGRATION_URL",
  "DATABASE_IDENTITY_PROVISION_URL",
  "NEON_TEST_DATABASE_URL",
  "NEON_TEST_IDENTITY_PROVISION_DATABASE_URL",
  "NEON_TEST_MIGRATION_DATABASE_URL",
  "NEON_TEST_RUNTIME_DATABASE_URL",
  "NEON_API_KEY",
] as const;

function redactDiagnosticMessage(message: string, environment: NodeJS.ProcessEnv) {
  let safe = message.replace(/[\r\n]+/g, " ");
  for (const key of SECRET_ENV_KEYS) {
    const secret = environment[key];
    if (secret) safe = safe.replaceAll(secret, "[REDACTED]");
  }
  return safe
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/napi_[A-Za-z0-9_-]+/g, "[REDACTED_NEON_API_KEY]")
    .replace(/\b(password|api[_-]?key|token)=\S+/gi, "$1=[REDACTED]")
    .slice(0, 1000);
}

export function formatTrustedDbError(
  error: unknown,
  environment: NodeJS.ProcessEnv = process.env,
) {
  let candidate = error && typeof error === "object"
    ? error as { code?: unknown; message?: unknown }
    : {};
  // Drizzle wraps query errors in `cause`. Prefer the underlying SQLSTATE,
  // without serializing query text/parameters or looping on cyclic causes.
  const visited = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !visited.has(current) && visited.size < 16) {
    visited.add(current);
    const nested = current as { code?: unknown; message?: unknown; cause?: unknown };
    if (typeof nested.code === "string" && /^[A-Z0-9]{5}$/.test(nested.code)) {
      candidate = nested;
      break;
    }
    current = nested.cause;
  }
  const rawMessage = typeof candidate.message === "string"
    ? candidate.message
    : error instanceof Error ? error.message : "UNKNOWN";
  const nativeCode = typeof candidate.code === "string" && /^[A-Z0-9]{5}$/.test(candidate.code)
    ? candidate.code
    : undefined;
  const applicationCode = /^[A-Z][A-Z0-9_]{2,127}$/.test(rawMessage)
    ? rawMessage
    : undefined;
  return {
    code: nativeCode ?? applicationCode ?? "UNEXPECTED_ERROR",
    message: redactDiagnosticMessage(rawMessage, environment),
  };
}

export function reportTrustedDbFailure(
  error: unknown,
  log: (message: string) => void = console.error,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const diagnostic = formatTrustedDbError(error, environment);
  log(`TRUSTED_DB_ERROR code=${diagnostic.code} message=${diagnostic.message}`);
  log("TRUSTED_DB_STATUS=FAIL");
}

async function main() {
  markStage("validate-execution-context");
  const { context, environment } = readContext();
  if (context !== "ci-test") throw new Error("TRUSTED_DB_TEST_REQUIRES_CI_CONTEXT");
  const suite = resolveTrustedDbSuite();
  console.log(`TRUSTED_DB_SUITE=${suite}`);

  markStage("resolve-database-configuration");
  const migrationUrl = configuredDatabaseUrl(context, "integration-test");
  if (!migrationUrl) {
    console.log("TRUSTED_DB_STATUS=SKIPPED_NO_TEST_DATABASE_SECRET");
    return;
  }
  if (!process.env.NEON_API_KEY) {
    console.log("TRUSTED_DB_STATUS=BLOCKED_PROVIDER_VERIFICATION");
    process.exitCode = 1;
    return;
  }

  const identityUrl = configuredDatabaseUrl(context, "identity-provision");
  const runtimeUrl = configuredDatabaseUrl(context, "runtime");
  if (!identityUrl || !runtimeUrl) {
    console.log("TRUSTED_DB_STATUS=BLOCKED_ROLE_MODEL");
    process.exitCode = 1;
    return;
  }

  const migrationTarget = getConnectionTarget("test", "integration-test");
  const identityTarget = getConnectionTarget("test", "identity-provision");
  const runtimeTarget = getConnectionTarget("test", "runtime");
  markStage("verify-trusted-targets");
  markSubstage("target-migration");
  await assertResolvedTargetBeforeMutation({ context, source: "github-actions", environment, purpose: "integration-test", operation: "integration-test", target: migrationTarget, connectionString: migrationUrl });
  markSubstage("target-identity-provision");
  await assertResolvedTargetBeforeMutation({ context, source: "github-actions", environment, purpose: "identity-provision", operation: "integration-test", target: identityTarget, connectionString: identityUrl });
  markSubstage("target-runtime");
  await assertResolvedTargetBeforeMutation({ context, source: "github-actions", environment, purpose: "runtime", operation: "integration-test", target: runtimeTarget, connectionString: runtimeUrl });

  markStage("snapshot-protected-identity");
  const beforeIdentity = await getIdentitySnapshotAfterValidation(migrationUrl, migrationTarget);
  // A shared CI branch is intentionally reusable. The first approved reset
  // returns it to the clean migration start state without touching metadata.
  if (migrationTarget.usage === "shared-ci") {
    markStage("prepare-shared-ci-clean-state");
    const reset = openSql(migrationUrl);
    try {
      markSubstage("initial-reset-validate-before");
      await assertPostConnectIdentity(reset, migrationTarget);
      markSubstage("initial-reset-application");
      await resetApplicationScope(reset);
      markSubstage("initial-reset-validate-after");
      await assertPostConnectIdentity(reset, migrationTarget);
      markSubstage("initial-reset-migration-zero");
      await assertMigrationStateZero(reset);
      markSubstage("initial-reset-application-absent");
      await assertApplicationTablesAbsent(reset);
      markSubstage("initial-reset-identity-preserved");
      await assertIdentitySnapshot(reset, beforeIdentity);
    } finally {
      await reset.end({ timeout: 5 });
    }
  } else {
    markStage("verify-clean-start-state");
    const clean = openSql(migrationUrl);
    try {
      markSubstage("clean-start-validate-target");
      await assertPostConnectIdentity(clean, migrationTarget);
      markSubstage("clean-start-migration-zero");
      await assertMigrationStateZero(clean);
      markSubstage("clean-start-application-absent");
      await assertApplicationTablesAbsent(clean);
    } finally {
      await clean.end({ timeout: 5 });
    }
  }

  markStage("migrate-first-pass");
  await runMigrations(migrationUrl, migrationTarget);
  markStage("verify-first-migration");
  await assertMigratedState(migrationUrl, migrationTarget, "first-migration");

  markStage("reset-application-state");
  const reset = openSql(migrationUrl);
  try {
    markSubstage("reset-cycle-validate-before");
    await assertPostConnectIdentity(reset, migrationTarget);
    markSubstage("reset-cycle-application");
    await resetApplicationScope(reset);
    markSubstage("reset-cycle-validate-after");
    await assertPostConnectIdentity(reset, migrationTarget);
    markSubstage("reset-cycle-migration-zero");
    await assertMigrationStateZero(reset);
    markSubstage("reset-cycle-application-absent");
    await assertApplicationTablesAbsent(reset);
    markSubstage("reset-cycle-identity-preserved");
    await assertIdentitySnapshot(reset, beforeIdentity);
  } finally {
    await reset.end({ timeout: 5 });
  }

  markStage("migrate-second-pass");
  await runMigrations(migrationUrl, migrationTarget);
  markStage("verify-second-migration");
  await assertMigratedState(migrationUrl, migrationTarget, "second-migration");
  markStage("verify-concurrent-identity");
  await runConcurrentIdentityCheck(identityUrl, identityTarget, beforeIdentity);
  markStage("verify-permission-matrix");
  await runPermissionMatrix({ identityUrl, migrationUrl, runtimeUrl, identityTarget, migrationTarget, runtimeTarget });
  markStage("verify-us28-us29-learning-sets");
  await runUs28Us29TrustedDbSuite({ migrationUrl, runtimeUrl, migrationTarget, runtimeTarget });
  markStage("verify-us30-daily-new-word-limit");
  await runUs30TrustedDbSuite({ migrationUrl, runtimeUrl, migrationTarget, runtimeTarget });
  markStage("verify-us35-us36-daily-activity");
  console.log("TRUSTED_DB_US35_US36_STATUS=PASS");
  markStage("verify-us26-us27-taxonomy");
  await runUs26Us27TrustedDbSuite({ migrationUrl, runtimeUrl, migrationTarget, runtimeTarget });
  if (suite === "full") {
    markStage("verify-us07-review-runtime");
    await runUs07TrustedDbSuite({ migrationUrl, runtimeUrl, migrationTarget, runtimeTarget });
  } else {
    markStage("verify-us08-review-queue");
    await runUs08TrustedDbSuite({ migrationUrl, runtimeUrl, migrationTarget, runtimeTarget });
  }
  console.log("TRUSTED_DB_STATUS=PASS");
}

async function getIdentitySnapshotAfterValidation(url: string, target: DatabaseTarget) {
  const sql = openSql(url);
  try {
    markSubstage("identity-validate-target");
    await assertPostConnectIdentity(sql, target);
    markSubstage("identity-read-snapshot");
    return await getIdentitySnapshot(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function assertMigratedState(
  url: string,
  target: DatabaseTarget,
  pass: "first-migration" | "second-migration",
) {
  const sql = openSql(url);
  try {
    markSubstage(`${pass}-validate-target`);
    await assertPostConnectIdentity(sql, target);
    markSubstage(`${pass}-application-present`);
    await assertApplicationTablesPresent(sql);
    markSubstage(`${pass}-tracking-present`);
    if ((await readMigrationState(sql)) < 1) throw new Error("MIGRATION_STATE_NOT_LATEST");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function runConcurrentIdentityCheck(url: string, target: ConnectionTarget, expected: Awaited<ReturnType<typeof getIdentitySnapshot>>) {
  const provision = async () => {
    const sql = openSql(url);
    try {
      return await provisionCanonicalIdentity(sql, target);
    } finally {
      await sql.end({ timeout: 5 });
    }
  };
  markSubstage("concurrency-provision-pair");
  const [first, second] = await Promise.all([provision(), provision()]);
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("CONCURRENT_IDENTITY_INVALID");
  const verify = openSql(url);
  try {
    markSubstage("concurrency-validate-target");
    await assertPostConnectIdentity(verify, target);
    markSubstage("concurrency-identity-preserved");
    const actual = await getIdentitySnapshot(verify);
    if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("CONCURRENT_IDENTITY_INVALID");
  } finally {
    await verify.end({ timeout: 5 });
  }
}

type PermissionMatrixInput = {
  identityUrl: string;
  migrationUrl: string;
  runtimeUrl: string;
  identityTarget: ConnectionTarget;
  migrationTarget: ConnectionTarget;
  runtimeTarget: ConnectionTarget;
};

async function runPermissionMatrix(input: PermissionMatrixInput) {
  markSubstage("permission-identity-provision");
  await checkRole(input.identityUrl, input.identityTarget, "identity-provision");
  markSubstage("permission-migration");
  await checkRole(input.migrationUrl, input.migrationTarget, "migration");
  markSubstage("permission-runtime");
  await checkRole(input.runtimeUrl, input.runtimeTarget, "runtime");
}

async function checkRole(url: string, target: ConnectionTarget, role: "identity-provision" | "migration" | "runtime") {
  const sql = openSql(url);
  try {
    markSubstage(`permission-${role}-protected-identity`);
    await assertPostConnectIdentity(sql, target);
    const identity = await sql`SELECT id FROM vocabflow_meta.environment_identity WHERE id = 1`;
    if (identity.length !== 1) throw new Error("PERMISSION_MATRIX_FAILED");

    markSubstage(`permission-${role}-protected-write-policy`);
    if (role === "identity-provision") {
      await expectAllowed(sql, async (tx) => tx`INSERT INTO vocabflow_meta.environment_identity (id, environment, provider, project_id, branch_id, identity_version) VALUES (1, 'test', 'neon', ${target.projectId}, ${target.branchId}, 1) ON CONFLICT (id) DO NOTHING`);
    } else {
      await expectDenied(sql, async (tx) => tx`INSERT INTO vocabflow_meta.environment_identity (id, environment, provider, project_id, branch_id, identity_version) VALUES (1, 'test', 'neon', ${target.projectId}, ${target.branchId}, 1)`);
    }
    markSubstage(`permission-${role}-protected-denials`);
    for (const operation of [
      (tx: ReturnType<typeof openSql>) => tx`UPDATE vocabflow_meta.environment_identity SET project_id = project_id WHERE id = 1`,
      (tx: ReturnType<typeof openSql>) => tx`DELETE FROM vocabflow_meta.environment_identity WHERE id = 1`,
      (tx: ReturnType<typeof openSql>) => tx`TRUNCATE TABLE vocabflow_meta.environment_identity`,
      (tx: ReturnType<typeof openSql>) => tx`CREATE TABLE vocabflow_meta.__vocabflow_permission_probe (id integer)`,
      (tx: ReturnType<typeof openSql>) => tx`ALTER TABLE vocabflow_meta.environment_identity ADD COLUMN __vocabflow_permission_probe integer`,
      (tx: ReturnType<typeof openSql>) => tx`DROP TABLE vocabflow_meta.environment_identity`,
      (tx: ReturnType<typeof openSql>) => tx`SET ROLE vocabflow_identity_owner`
    ]) {
      await expectDenied(sql, operation);
    }

    markSubstage(`permission-${role}-application-ddl`);
    const createApplicationTable = (tx: ReturnType<typeof openSql>) => tx`CREATE TABLE vocabflow_app.__vocabflow_permission_probe (id integer)`;
    if (role === "migration") {
      await expectAllowed(sql, createApplicationTable);
    } else {
      await expectDenied(sql, createApplicationTable);
    }

    markSubstage(`permission-${role}-application-dml`);
    if (role === "runtime") {
      await expectAllowed(sql, async (tx) => {
        const probeId = "__vocabflow_runtime_permission_probe__";
        await tx`INSERT INTO vocabflow_app.verification (id, identifier, value, expires_at) VALUES (${probeId}, ${probeId}, 'value', now() + interval '1 minute')`;
        const rows = await tx`SELECT id FROM vocabflow_app.verification WHERE id = ${probeId}`;
        if (rows.length !== 1) throw new Error("PERMISSION_MATRIX_FAILED");
        await tx`UPDATE vocabflow_app.verification SET value = 'updated' WHERE id = ${probeId}`;
        await tx`DELETE FROM vocabflow_app.verification WHERE id = ${probeId}`;
      });
    } else if (role === "identity-provision") {
      await expectDenied(sql, async (tx) => tx`SELECT id FROM vocabflow_app.verification LIMIT 1`);
    }
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function expectAllowed(sql: ReturnType<typeof openSql>, operation: (tx: ReturnType<typeof openSql>) => Promise<unknown>) {
  try {
    await sql.begin(async (tx) => {
      await operation(tx as unknown as ReturnType<typeof openSql>);
      throw new Error(ROLLBACK_MARKER);
    });
  } catch (error) {
    if (error instanceof Error && error.message === ROLLBACK_MARKER) return;
    throw error;
  }
}

async function expectDenied(sql: ReturnType<typeof openSql>, operation: (tx: ReturnType<typeof openSql>) => Promise<unknown>) {
  try {
    await sql.begin(async (tx) => {
      await operation(tx as unknown as ReturnType<typeof openSql>);
      throw new Error(ROLLBACK_MARKER);
    });
  } catch (error) {
    if (error instanceof Error && error.message === ROLLBACK_MARKER) throw new Error("PERMISSION_MATRIX_FAILED");
    const candidate = error as { code?: string; message?: string };
    if (candidate.code === "42501" || /permission denied|must be owner|cannot set role/i.test(candidate.message ?? "")) return;
    throw error;
  }
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/test-db.ts") || invokedScript.endsWith("/test-db.js")) {
  main().catch((error: unknown) => {
    reportTrustedDbFailure(error);
    process.exitCode = 1;
  });
}
