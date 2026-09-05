import { getConnectionTarget } from "../config/database-targets";
import { getUrlForContext, readContext } from "./db-core";
import { bootstrapProtectedMetadata } from "./db-bootstrap";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";

async function main() {
  const { context, environment } = readContext();
  if (context === "cloudflare-production") throw new Error("BOOTSTRAP_NOT_ALLOWED_IN_PRODUCTION");
  const target = getConnectionTarget(environment === "test" ? "test" : "development", "bootstrap");
  const url = getUrlForContext(context, "bootstrap");
  await assertResolvedTargetBeforeMutation({ context, source: context === "ci-test" ? "github-actions" : "dev-launcher", environment, purpose: "bootstrap", operation: "identity-provision", target, connectionString: url });
  await bootstrapProtectedMetadata(url, target);
  console.log("DB_BOOTSTRAP=PASS");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "DB_BOOTSTRAP_FAILED");
  process.exitCode = 1;
});
