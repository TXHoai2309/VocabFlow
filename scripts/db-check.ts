import { getConnectionTarget } from "../config/database-targets";
import { openSql, readContext, assertPostConnectIdentity, readMigrationState } from "./db-core";
import { assertPreConnect } from "./runtime-validation";

async function main() {
  const { context, environment } = readContext();
  const target = getConnectionTarget(environment === "test" ? "test" : environment === "production" ? "production" : "development", "runtime");
  const { url } = assertPreConnect({ context, source: context === "ci-test" ? "github-actions" : context === "vercel-production" ? "vercel-runtime" : "dev-launcher", environment, purpose: "runtime", operation: "db-check", target });
  const sql = openSql(url);
  try {
    await sql`SELECT 1`;
    await assertPostConnectIdentity(sql, target);
    await readMigrationState(sql);
  } finally {
    await sql.end({ timeout: 5 });
  }
  console.log("DB_CHECK=PASS");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "DB_CHECK_FAILED");
  process.exitCode = 1;
});
