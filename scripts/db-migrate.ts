import { readContext, runMigrations } from "./db-core";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";

async function main() {
  const { context, environment } = readContext();
  const target = (await import("../config/database-targets")).getConnectionTarget(environment === "test" ? "test" : environment === "production" ? "production" : "development", "migration");
  const { url } = await assertResolvedTargetBeforeMutation({ context, source: context === "ci-test" ? "github-actions" : context === "cloudflare-production" ? "cloudflare-runtime" : "dev-launcher", environment, purpose: "migration", operation: "db-migrate", target });
  await runMigrations(url, target);
  console.log("DB_MIGRATE=PASS");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "DB_MIGRATE_FAILED");
  process.exitCode = 1;
});
