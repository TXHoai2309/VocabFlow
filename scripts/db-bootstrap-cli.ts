import { getConnectionTarget } from "../config/database-targets";
import { getUrlForContext, readContext } from "./db-core";
import { bootstrapProtectedMetadata, ROLE_NAMES } from "./db-bootstrap";
import { parseRoleCredential } from "./db-credentials";
import { assertResolvedTargetBeforeMutation, configuredDatabaseUrl } from "./runtime-validation";

async function main() {
  const { context, environment } = readContext();
  if (context === "cloudflare-production") throw new Error("BOOTSTRAP_NOT_ALLOWED_IN_PRODUCTION");
  const target = getConnectionTarget(environment === "test" ? "test" : "development", "bootstrap");
  const url = getUrlForContext(context, "bootstrap");
  await assertResolvedTargetBeforeMutation({ context, source: context === "ci-test" ? "github-actions" : "dev-launcher", environment, purpose: "bootstrap", operation: "identity-provision", target, connectionString: url });
  // CI bootstrap must use the three purpose-specific secrets. In particular,
  // do not fall back to the legacy shared NEON_TEST_DATABASE_URL for the
  // migration credential because it would make role ownership ambiguous.
  const provisionUrl = context === "ci-test"
    ? process.env.NEON_TEST_IDENTITY_PROVISION_DATABASE_URL
    : configuredDatabaseUrl(context, "identity-provision");
  const migrationUrl = context === "ci-test"
    ? process.env.NEON_TEST_MIGRATION_DATABASE_URL
    : configuredDatabaseUrl(context, "migration");
  const runtimeUrl = context === "ci-test"
    ? process.env.NEON_TEST_RUNTIME_DATABASE_URL
    : configuredDatabaseUrl(context, "runtime");
  if (!provisionUrl || !migrationUrl || !runtimeUrl) throw new Error("ROLE_CREDENTIALS_REQUIRED");
  const credentials = {
    provision: parseRoleCredential(provisionUrl, ROLE_NAMES.provision),
    migration: parseRoleCredential(migrationUrl, ROLE_NAMES.migration),
    runtime: parseRoleCredential(runtimeUrl, ROLE_NAMES.runtime),
  };
  await bootstrapProtectedMetadata(url, target, credentials);
  console.log("DB_BOOTSTRAP=PASS");
}

main().catch((error: unknown) => {
  const candidate = error as {
    code?: string;
    message?: string;
  };

  const rawMessage =
    candidate?.message ??
    "DB_BOOTSTRAP_FAILED";

  const safeMessage = rawMessage
    .replace(/postgres(?:ql)?:\/\/\S+/gi, "[REDACTED_DATABASE_URL]")
    .replace(/napi_[A-Za-z0-9_-]+/g, "[REDACTED_NEON_API_KEY]");

  console.error(
    `DB_BOOTSTRAP_ERROR code=${candidate?.code ?? "UNKNOWN"} message=${safeMessage}`,
  );

  console.error("TRUSTED_DB_STATUS=FAIL");
  process.exitCode = 1;
});