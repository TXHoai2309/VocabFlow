import { openSql } from "./db-core";
import { bootstrapProtectedMetadata, assertProductionBootstrapState } from "./db-bootstrap";
import { parseConnectionFingerprint } from "./runtime-validation";
import {
  authorizeProductionBootstrap,
  productionBootstrapRoleCredentials,
  resolveProductionBootstrapConnection,
  parseProductionBootstrapArgs,
  safeProductionBootstrapError,
} from "./production-bootstrap-safety";

async function inspectProductionBootstrapTarget(url: string, target: Awaited<ReturnType<typeof resolveProductionBootstrapConnection>>["target"]) {
  const sql = openSql(url);
  try {
    return await sql.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY`;
      return assertProductionBootstrapState(tx as unknown as ReturnType<typeof openSql>, target, target.roleName);
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

async function main() {
  const options = parseProductionBootstrapArgs(process.argv.slice(2));
  const target = authorizeProductionBootstrap(options, process.env);
  const connection = await resolveProductionBootstrapConnection(process.env);
  const state = await inspectProductionBootstrapTarget(connection.url, connection.target);
  console.log("PRODUCTION_BOOTSTRAP_PREFLIGHT=PASS");
  console.log(`PRODUCTION_BRANCH=${target.branchId}`);
  console.log(`BOOTSTRAP_STATE=${state}`);
  console.log("PRODUCTION_BOOTSTRAP_PREFLIGHT_MUTATIONS=0");

  if (!options.apply) return;

  const fingerprint = parseConnectionFingerprint(connection.url, connection.target.roleName);
  const credentials = productionBootstrapRoleCredentials(process.env, fingerprint);
  await bootstrapProtectedMetadata(connection.url, connection.target, credentials, {
    bootstrapRoleName: connection.target.roleName,
    requireFreshProductionState: true,
  });
  console.log("DB_PRODUCTION_BOOTSTRAP=PASS");
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/db-production-bootstrap.ts") || invokedScript.endsWith("/db-production-bootstrap.js")) {
  main().catch((error: unknown) => {
    console.error(`DB_PRODUCTION_BOOTSTRAP_ERROR=${safeProductionBootstrapError(error)}`);
    process.exitCode = 1;
  });
}
