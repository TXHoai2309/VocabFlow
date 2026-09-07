import { appendFileSync } from "node:fs";
import { getConnectionTarget } from "../config/database-targets";
import { assertResolvedTargetBeforeMutation, configuredDatabaseUrl } from "./runtime-validation";

type PreflightResolver = (
  input: Parameters<typeof assertResolvedTargetBeforeMutation>[0],
) => Promise<unknown>;

function output(name: string, value: string) {
  const destination = process.env.GITHUB_OUTPUT;
  if (destination) {
    appendFileSync(destination, `${name}=${value}\n`, "utf8");
  }
}

function providerRequired() {
  if (!process.env.NEON_API_KEY) throw new Error("BLOCKED_PROVIDER_VERIFICATION");
}

/** Phase 1: verify only the externally-created bootstrap connection. */
export async function runBootstrapPreflight(
  resolve: PreflightResolver = assertResolvedTargetBeforeMutation,
) {
  const context = "ci-test" as const;
  const environment = "test" as const;
  const bootstrapUrl = configuredDatabaseUrl(context, "bootstrap");
  if (!bootstrapUrl) throw new Error("BOOTSTRAP_DATABASE_URL_REQUIRED");
  providerRequired();

  await resolve({
    context,
    source: "github-actions",
    environment,
    purpose: "bootstrap",
    operation: "identity-provision",
    target: getConnectionTarget(environment, "bootstrap"),
    connectionString: bootstrapUrl,
  });

  return { status: "PASS" as const, runDb: true as const };
}

/** Phase 2: verify purpose-specific application role credentials. */
export async function runFullPreflight(
  resolve: PreflightResolver = assertResolvedTargetBeforeMutation,
) {
  const context = "ci-test" as const;
  const environment = "test" as const;
  const migrationUrl = process.env.NEON_TEST_MIGRATION_DATABASE_URL;
  if (!migrationUrl) {
    // Before the trusted DB job starts, an absent test secret is an explicit
    // configuration skip. Once bootstrap has executed, missing role URLs are
    // a hard failure and must not be allowed to silently bypass acceptance.
    if (process.env.TRUSTED_DB_EXECUTION_STARTED === "true") {
      throw new Error("REQUIRED_DATABASE_CONFIGURATION");
    }
    return { status: "SKIPPED_NO_TEST_DATABASE_SECRET" as const, runDb: false as const };
  }
  providerRequired();

  const identityUrl = process.env.NEON_TEST_IDENTITY_PROVISION_DATABASE_URL;
  const runtimeUrl = process.env.NEON_TEST_RUNTIME_DATABASE_URL;
  if (!identityUrl || !runtimeUrl) throw new Error("REQUIRED_DATABASE_CONFIGURATION");

  await resolve({
    context,
    source: "github-actions",
    environment,
    purpose: "identity-provision",
    operation: "identity-provision",
    target: getConnectionTarget(environment, "identity-provision"),
    connectionString: identityUrl,
  });
  await resolve({
    context,
    source: "github-actions",
    environment,
    purpose: "integration-test",
    operation: "integration-test",
    target: getConnectionTarget(environment, "integration-test"),
    connectionString: migrationUrl,
  });
  await resolve({
    context,
    source: "github-actions",
    environment,
    purpose: "runtime",
    operation: "integration-test",
    target: getConnectionTarget(environment, "runtime"),
    connectionString: runtimeUrl,
  });

  return { status: "PASS" as const, runDb: true as const };
}

function statusFor(error: unknown) {
  const code = error instanceof Error ? error.message : "FAIL";
  if (code === "BLOCKED_PROVIDER_VERIFICATION" || code === "PROVIDER_UNAVAILABLE") {
    return "BLOCKED_PROVIDER_VERIFICATION" as const;
  }
  if (code === "SKIPPED_NO_TEST_DATABASE_SECRET") {
    return "SKIPPED_NO_TEST_DATABASE_SECRET" as const;
  }
  return "FAIL" as const;
}

async function main() {
  const phase = process.argv[2] ?? "full";
  if (phase !== "bootstrap" && phase !== "full") throw new Error("INVALID_PREFLIGHT_PHASE");

  const result = phase === "bootstrap" ? await runBootstrapPreflight() : await runFullPreflight();
  console.log(`TRUSTED_DB_STATUS=${result.status}`);
  output("status", result.status);
  output("run_db", String(result.runDb));
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/db-preflight.ts") || invokedScript.endsWith("/db-preflight.js")) {
  main().catch((error: unknown) => {
    const status = statusFor(error);
    console.log(`TRUSTED_DB_STATUS=${status}`);
    output("status", status);
    output("run_db", "false");
    process.exitCode = 1;
  });
}
