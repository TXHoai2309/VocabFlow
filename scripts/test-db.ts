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

const ROLLBACK_MARKER = "__VOCABFLOW_PERMISSION_ROLLBACK__";

async function main() {
  const { context, environment } = readContext();
  if (context !== "ci-test") throw new Error("TRUSTED_DB_TEST_REQUIRES_CI_CONTEXT");

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
  await assertResolvedTargetBeforeMutation({ context, source: "github-actions", environment, purpose: "integration-test", operation: "integration-test", target: migrationTarget, connectionString: migrationUrl });
  await assertResolvedTargetBeforeMutation({ context, source: "github-actions", environment, purpose: "identity-provision", operation: "integration-test", target: identityTarget, connectionString: identityUrl });
  await assertResolvedTargetBeforeMutation({ context, source: "github-actions", environment, purpose: "runtime", operation: "integration-test", target: runtimeTarget, connectionString: runtimeUrl });

  const beforeIdentity = await getIdentitySnapshotAfterValidation(migrationUrl, migrationTarget);
  // A shared CI branch is intentionally reusable. The first approved reset
  // returns it to the clean migration start state without touching metadata.
  if (migrationTarget.usage === "shared-ci") {
    const reset = openSql(migrationUrl);
    try {
      await assertPostConnectIdentity(reset, migrationTarget);
      await resetApplicationScope(reset);
      await assertPostConnectIdentity(reset, migrationTarget);
      await assertMigrationStateZero(reset);
      await assertApplicationTablesAbsent(reset);
      await assertIdentitySnapshot(reset, beforeIdentity);
    } finally {
      await reset.end({ timeout: 5 });
    }
  } else {
    const clean = openSql(migrationUrl);
    try {
      await assertPostConnectIdentity(clean, migrationTarget);
      await assertMigrationStateZero(clean);
      await assertApplicationTablesAbsent(clean);
    } finally {
      await clean.end({ timeout: 5 });
    }
  }

  await runMigrations(migrationUrl, migrationTarget);
  await assertMigratedState(migrationUrl, migrationTarget);

  const reset = openSql(migrationUrl);
  try {
    await assertPostConnectIdentity(reset, migrationTarget);
    await resetApplicationScope(reset);
    await assertPostConnectIdentity(reset, migrationTarget);
    await assertMigrationStateZero(reset);
    await assertApplicationTablesAbsent(reset);
    await assertIdentitySnapshot(reset, beforeIdentity);
  } finally {
    await reset.end({ timeout: 5 });
  }

  await runMigrations(migrationUrl, migrationTarget);
  await assertMigratedState(migrationUrl, migrationTarget);
  await runConcurrentIdentityCheck(identityUrl, identityTarget, beforeIdentity);
  await runPermissionMatrix({ identityUrl, migrationUrl, runtimeUrl, identityTarget, migrationTarget, runtimeTarget });
  console.log("TRUSTED_DB_STATUS=PASS");
}

async function getIdentitySnapshotAfterValidation(url: string, target: DatabaseTarget) {
  const sql = openSql(url);
  try {
    await assertPostConnectIdentity(sql, target);
    return await getIdentitySnapshot(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function assertMigratedState(url: string, target: DatabaseTarget) {
  const sql = openSql(url);
  try {
    await assertPostConnectIdentity(sql, target);
    await assertApplicationTablesPresent(sql);
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
  const [first, second] = await Promise.all([provision(), provision()]);
  if (JSON.stringify(first) !== JSON.stringify(second)) throw new Error("CONCURRENT_IDENTITY_INVALID");
  const verify = openSql(url);
  try {
    await assertPostConnectIdentity(verify, target);
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
  await checkRole(input.identityUrl, input.identityTarget, "identity-provision");
  await checkRole(input.migrationUrl, input.migrationTarget, "migration");
  await checkRole(input.runtimeUrl, input.runtimeTarget, "runtime");
}

async function checkRole(url: string, target: ConnectionTarget, role: "identity-provision" | "migration" | "runtime") {
  const sql = openSql(url);
  try {
    await assertPostConnectIdentity(sql, target);
    const identity = await sql`SELECT id FROM vocabflow_meta.environment_identity WHERE id = 1`;
    if (identity.length !== 1) throw new Error("PERMISSION_MATRIX_FAILED");

    if (role === "identity-provision") {
      await expectAllowed(sql, async (tx) => tx`INSERT INTO vocabflow_meta.environment_identity (id, environment, provider, project_id, branch_id, identity_version) VALUES (1, 'test', 'neon', ${target.projectId}, ${target.branchId}, 1) ON CONFLICT (id) DO NOTHING`);
    } else {
      await expectDenied(sql, async (tx) => tx`INSERT INTO vocabflow_meta.environment_identity (id, environment, provider, project_id, branch_id, identity_version) VALUES (1, 'test', 'neon', ${target.projectId}, ${target.branchId}, 1)`);
    }
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

    const createApplicationTable = (tx: ReturnType<typeof openSql>) => tx`CREATE TABLE vocabflow_app.__vocabflow_permission_probe (id integer)`;
    if (role === "migration") {
      await expectAllowed(sql, createApplicationTable);
    } else {
      await expectDenied(sql, createApplicationTable);
    }

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
    throw new Error("PERMISSION_MATRIX_FAILED");
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
    throw new Error("BLOCKED_ROLE_MODEL");
  }
}

main().catch((error: unknown) => {
  const code = error instanceof Error ? error.message : "FAIL";
  const status = code === "BLOCKED_ROLE_MODEL" || code === "BLOCKED_PROVIDER_VERIFICATION" || code === "SKIPPED_NO_TEST_DATABASE_SECRET" || code === "PROVIDER_UNAVAILABLE"
    ? code === "PROVIDER_UNAVAILABLE" ? "BLOCKED_PROVIDER_VERIFICATION" : code
    : "FAIL";
  console.error(`TRUSTED_DB_STATUS=${status}`);
  process.exitCode = 1;
});
