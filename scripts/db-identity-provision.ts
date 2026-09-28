import { getConnectionTarget } from "../config/database-targets";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { canonicalIdentityMatches, type DatabaseIdentity, type ConnectionTarget } from "@vocabflow/contracts";
import { authorizeProductionRelease, parseProductionReleaseArgs, resolveProductionConnection } from "./production-release-safety";

export function parseIdentityProvisionArgs(args: readonly string[]) {
  let apply = false;
  const releaseArgs: string[] = [];
  for (const arg of args) {
    if (arg === "--apply") {
      if (apply) throw new Error("CLI_ARGUMENT_INVALID");
      apply = true;
    } else {
      releaseArgs.push(arg);
    }
  }
  return { apply, options: parseProductionReleaseArgs(releaseArgs) };
}

function assertProductionIdentity(target: ConnectionTarget, identity: DatabaseIdentity) {
  if (!canonicalIdentityMatches(identity, target)) throw new Error("DATABASE_IDENTITY_MISMATCH");
}

const safeIdentityProvisionErrors = new Set([
  "BRANCH_NOT_FOUND",
  "CANONICAL_IDENTITY_INVALID",
  "CLI_ARGUMENT_INVALID",
  "CONNECTION_TARGET_MISMATCH",
  "DATABASE_IDENTITY_MISMATCH",
  "IDENTITY_MISMATCH",
  "IDENTITY_PROVISION_FAILED",
  "INVALID_DATABASE_URL",
  "PRODUCTION_BRANCH_CONFIRMATION_MISMATCH",
  "PRODUCTION_CANONICAL_TARGET_MISMATCH",
  "PRODUCTION_CONFIRMATION_WITHOUT_MUTATION",
  "PRODUCTION_DEVELOPMENT_BRANCH_BLOCKED",
  "PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED",
  "PRODUCTION_IDENTITY_APPLY_REQUIRED",
  "PRODUCTION_IDENTITY_CONNECTION_TARGET_MISMATCH",
  "PRODUCTION_IDENTITY_PROVISION_DATABASE_URL_REQUIRED",
  "PRODUCTION_OPERATOR_CONTEXT_REQUIRED",
  "PRODUCTION_PROVIDER_VERIFICATION_REQUIRED",
  "PRODUCTION_SHARED_CI_BRANCH_BLOCKED",
  "PRODUCTION_TARGET_CHANGED_AFTER_PREFLIGHT",
  "PRODUCTION_TARGET_CONFIRMATION_REQUIRED",
  "PRODUCTION_TARGET_REQUIRED",
  "PROJECT_NOT_FOUND",
  "PROTECTED_METADATA_MISSING",
  "PROVIDER_AUTH_FAILED",
  "PROVIDER_RESPONSE_INVALID",
  "PROVIDER_UNAVAILABLE",
]);

export function safeIdentityProvisionError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return safeIdentityProvisionErrors.has(message) ? message : "IDENTITY_PROVISION_FAILED";
}

export async function provisionCanonicalIdentity(sql: ReturnType<typeof openSql>, target: ConnectionTarget): Promise<DatabaseIdentity> {
  let identity: DatabaseIdentity | undefined;
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(89421731)`;
    const rows = await tx<{ id: number; environment: "development" | "test" | "production"; provider: "neon"; project_id: string; branch_id: string; identity_version: number }[]>`
      SELECT id, environment, provider, project_id, branch_id, identity_version
      FROM vocabflow_meta.environment_identity
      ORDER BY id
    `;
    if (rows.length > 1) throw new Error("CANONICAL_IDENTITY_INVALID");
    if (rows.length === 1) {
      const row = rows[0];
      if (row.id !== 1 || row.environment !== target.environment || row.provider !== target.provider || row.project_id !== target.projectId || row.branch_id !== target.branchId || row.identity_version !== target.identityVersion) throw new Error("IDENTITY_MISMATCH");
      identity = { environment: row.environment, provider: row.provider, projectId: row.project_id, branchId: row.branch_id, identityVersion: row.identity_version as 1 };
      return;
    }
    await tx`INSERT INTO vocabflow_meta.environment_identity (id, environment, provider, project_id, branch_id, identity_version) VALUES (1, ${target.environment}, ${target.provider}, ${target.projectId}, ${target.branchId}, ${target.identityVersion})`;
    identity = { environment: target.environment, provider: target.provider, projectId: target.projectId, branchId: target.branchId, identityVersion: target.identityVersion };
  });
  if (!identity) throw new Error("IDENTITY_PROVISION_FAILED");
  return identity;
}

async function main() {
  const parsed = parseIdentityProvisionArgs(process.argv.slice(2));
  const { context, environment } = readContext();
  if (environment === "production" || parsed.options.target === "production") {
    if (!parsed.apply) {
      authorizeProductionRelease({ options: parsed.options, mode: "read-only", environment: process.env });
      throw new Error("PRODUCTION_IDENTITY_APPLY_REQUIRED");
    }
    const authorizedTarget = authorizeProductionRelease({ options: parsed.options, mode: "mutation", environment: process.env });
    const target = getConnectionTarget("production", "identity-provision");
    if (target.branchId !== authorizedTarget.branchId) throw new Error("PRODUCTION_TARGET_CHANGED_AFTER_PREFLIGHT");
    const connection = await resolveProductionConnection({ purpose: "identity-provision", environment: process.env });
    const sql = openSql(connection.url);
    try {
      const [databaseIdentity] = await sql<{ database_name: string; session_user: string; current_user: string }[]>`
        SELECT current_database()::text AS database_name,
          session_user::text AS session_user,
          current_user::text AS current_user
      `;
      if (databaseIdentity?.database_name !== target.databaseName
        || databaseIdentity.session_user !== target.roleName
        || databaseIdentity.current_user !== target.roleName) {
        throw new Error("PRODUCTION_IDENTITY_CONNECTION_TARGET_MISMATCH");
      }
      const identity = await provisionCanonicalIdentity(sql, target);
      assertProductionIdentity(target, identity);
      await assertPostConnectIdentity(sql, target);
    } finally {
      await sql.end({ timeout: 5 });
    }
    console.log("IDENTITY_PROVISION=PASS");
    console.log(`PRODUCTION_BRANCH=${target.branchId}`);
    return;
  }
  if (process.argv.slice(2).length > 0) throw new Error("CLI_ARGUMENT_INVALID");
  if (context === "vercel-production") throw new Error("IDENTITY_PROVISION_NOT_ALLOWED_IN_PRODUCTION");
  const target = getConnectionTarget(environment === "test" ? "test" : "development", "identity-provision");
  const { url } = await assertResolvedTargetBeforeMutation({
    context,
    source: context === "ci-test" ? "github-actions" : "dev-launcher",
    environment,
    purpose: "identity-provision",
    operation: "identity-provision",
    target
  });
  const sql = openSql(url);
  try {
    await provisionCanonicalIdentity(sql, target);
  } finally {
    await sql.end({ timeout: 5 });
  }
  console.log("IDENTITY_PROVISION=PASS");
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/db-identity-provision.ts") || invokedScript.endsWith("/db-identity-provision.js")) {
  main().catch((error: unknown) => {
    console.error(safeIdentityProvisionError(error));
    process.exitCode = 1;
  });
}
