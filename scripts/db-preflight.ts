import { appendFileSync } from "node:fs";
import { getConnectionTarget } from "../config/database-targets";
import { assertResolvedTargetBeforeMutation, configuredDatabaseUrl } from "./runtime-validation";

function output(name: string, value: string) {
  const destination = process.env.GITHUB_OUTPUT;
  if (destination) {
    appendFileSync(destination, `${name}=${value}\n`, "utf8");
  }
}

async function main() {
  const context = "ci-test" as const;
  const environment = "test" as const;
  const migrationUrl = configuredDatabaseUrl(context, "integration-test");
  if (!migrationUrl) {
    console.log("TRUSTED_DB_STATUS=SKIPPED_NO_TEST_DATABASE_SECRET");
    output("run_db", "false");
    return;
  }
  if (!process.env.NEON_API_KEY) {
    console.log("TRUSTED_DB_STATUS=BLOCKED_PROVIDER_VERIFICATION");
    output("run_db", "false");
    process.exitCode = 1;
    return;
  }

  const bootstrapUrl = configuredDatabaseUrl(context, "bootstrap");
  const identityUrl = configuredDatabaseUrl(context, "identity-provision");
  const runtimeUrl = configuredDatabaseUrl(context, "runtime");
  if (!bootstrapUrl || !identityUrl || !runtimeUrl) {
    console.log("TRUSTED_DB_STATUS=FAIL");
    output("run_db", "false");
    process.exitCode = 1;
    return;
  }

  await assertResolvedTargetBeforeMutation({
    context,
    source: "github-actions",
    environment,
    purpose: "bootstrap",
    operation: "identity-provision",
    target: getConnectionTarget("test", "bootstrap"),
    connectionString: bootstrapUrl
  });
  await assertResolvedTargetBeforeMutation({
    context,
    source: "github-actions",
    environment,
    purpose: "identity-provision",
    operation: "identity-provision",
    target: getConnectionTarget("test", "identity-provision"),
    connectionString: identityUrl
  });
  await assertResolvedTargetBeforeMutation({
    context,
    source: "github-actions",
    environment,
    purpose: "integration-test",
    operation: "integration-test",
    target: getConnectionTarget("test", "integration-test"),
    connectionString: migrationUrl
  });
  await assertResolvedTargetBeforeMutation({
    context,
    source: "github-actions",
    environment,
    purpose: "runtime",
    operation: "integration-test",
    target: getConnectionTarget("test", "runtime"),
    connectionString: runtimeUrl
  });
  console.log("DB_PREFLIGHT=PASS");
  output("run_db", "true");
}

main().catch((error: unknown) => {
  const code = error instanceof Error ? error.message : "FAIL";
  const status = code === "BLOCKED_PROVIDER_VERIFICATION" || code === "PROVIDER_UNAVAILABLE"
    ? "BLOCKED_PROVIDER_VERIFICATION"
    : "FAIL";
  console.log(`TRUSTED_DB_STATUS=${status}`);
  output("run_db", "false");
  process.exitCode = 1;
});
