import { getConnectionTarget } from "../config/database-targets";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { openSql, readContext } from "./db-core";
import type { DatabaseIdentity, ConnectionTarget } from "@vocabflow/contracts";

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
  const { context, environment } = readContext();
  if (context === "cloudflare-production") throw new Error("IDENTITY_PROVISION_NOT_ALLOWED_IN_PRODUCTION");
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
    const message = error instanceof Error ? error.message : "IDENTITY_PROVISION_FAILED";
    console.error(message);
    process.exitCode = 1;
  });
}
