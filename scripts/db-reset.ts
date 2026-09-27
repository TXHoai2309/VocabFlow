import { getConnectionTarget } from "../config/database-targets";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { resetApplicationScope } from "./db-reset-operations";
import { assertResetTargetAllowed } from "./production-release-safety";

async function main() {
  assertResetTargetAllowed({ args: process.argv.slice(2), environment: process.env });
  const { context, environment } = readContext();
  const target = getConnectionTarget(environment === "test" ? "test" : "development", "migration");
  const { url } = await assertResolvedTargetBeforeMutation({ context, source: context === "ci-test" ? "github-actions" : "dev-launcher", environment, purpose: "migration", operation: "db-reset", target });
  const sql = openSql(url);
  try {
    await assertPostConnectIdentity(sql, target);
    await resetApplicationScope(sql);
    await assertPostConnectIdentity(sql, target);
  } finally {
    await sql.end({ timeout: 5 });
  }
  console.log("DB_RESET=PASS");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error && /^[A-Z][A-Z0-9_]{2,79}$/.test(error.message) ? error.message : "DB_RESET_FAILED");
  process.exitCode = 1;
});
