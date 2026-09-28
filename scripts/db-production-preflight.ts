import { authorizeProductionRelease, parseProductionReleaseArgs } from "./production-release-safety";
import { readProductionPreflightState } from "./production-preflight";

async function main() {
  const options = parseProductionReleaseArgs(process.argv.slice(2));
  const target = authorizeProductionRelease({ options, mode: "read-only", environment: process.env });
  const migrationCount = await readProductionPreflightState(process.env);
  console.log("PRODUCTION_DB_PREFLIGHT=PASS");
  console.log(`PRODUCTION_BRANCH=${target.branchId}`);
  console.log(`MIGRATION_LEDGER_ROWS=${migrationCount}`);
  console.log("DATABASE_MUTATIONS=0");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "PRODUCTION_DB_PREFLIGHT_FAILED");
  process.exitCode = 1;
});
