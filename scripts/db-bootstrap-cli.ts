import { bootstrapTargetForEnvironment } from "./bootstrap-target";
import { getUrlForContext, readContext } from "./db-core";
import { bootstrapProtectedMetadata, ROLE_NAMES } from "./db-bootstrap";
import { parseRoleCredential } from "./db-credentials";
import { assertResolvedTargetBeforeMutation, configuredDatabaseUrl } from "./runtime-validation";

async function main() {
  const { context, environment } = readContext();
  if (context === "vercel-production") throw new Error("BOOTSTRAP_NOT_ALLOWED_IN_PRODUCTION");
  const target = bootstrapTargetForEnvironment(environment);
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

  const rawMessage = candidate?.message ?? "DB_BOOTSTRAP_FAILED";
  const safeMessage = /^[A-Z][A-Z0-9_]{2,79}$/.test(rawMessage) ? rawMessage : "DB_BOOTSTRAP_FAILED";

  console.error(
    `DB_BOOTSTRAP_ERROR code=${candidate?.code ?? "UNKNOWN"} message=${safeMessage}`,
  );

  console.error("TRUSTED_DB_STATUS=FAIL");
  process.exitCode = 1;
});
