import { openSql, assertPostConnectIdentity, readMigrationState } from "./db-core";
import { authorizeProductionRelease, parseProductionReleaseArgs, resolveProductionConnection } from "./production-release-safety";

async function main() {
  const options = parseProductionReleaseArgs(process.argv.slice(2));
  const target = authorizeProductionRelease({ options, mode: "read-only", environment: process.env });
  const connection = await resolveProductionConnection({ purpose: "runtime", environment: process.env });
  const sql = openSql(connection.url);
  try {
    const migrationCount = await sql.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY`;
      await tx`SELECT 1`;
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, target);
      return readMigrationState(tx as unknown as ReturnType<typeof openSql>);
    });
    console.log("PRODUCTION_DB_PREFLIGHT=PASS");
    console.log(`PRODUCTION_BRANCH=${target.branchId}`);
    console.log(`MIGRATION_LEDGER_ROWS=${migrationCount}`);
    console.log("DATABASE_MUTATIONS=0");
  } finally {
    await sql.end({ timeout: 5 });
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "PRODUCTION_DB_PREFLIGHT_FAILED");
  process.exitCode = 1;
});
