import type { ConnectionTarget, DatabasePurpose, Environment, ExecutionContext, TrustedSource } from "@vocabflow/contracts";
import { validateEnvironmentUsage } from "@vocabflow/contracts";
import { DATABASE_TARGETS, getConnectionTarget, isConfiguredTarget, SHARED_CI_TARGET } from "../config/database-targets";
import { EXECUTION_CONTEXTS, assertExecutionContext } from "../config/execution-context";
import { createNeonApiClient, verifyNeonTarget } from "./neon-target-verifier";

export type Operation = "identity-provision" | "db-migrate" | "db-reset" | "db-seed" | "integration-test" | "db-check";

const purposeEnvironmentVariables: Record<DatabasePurpose, { local: string[]; ci: string[]; production: string[] }> = {
  bootstrap: { local: ["BOOTSTRAP_DATABASE_URL"], ci: ["BOOTSTRAP_DATABASE_URL"], production: [] },
  "identity-provision": { local: ["DATABASE_IDENTITY_PROVISION_URL"], ci: ["NEON_TEST_IDENTITY_PROVISION_DATABASE_URL"], production: [] },
  migration: { local: ["DATABASE_MIGRATION_URL"], ci: ["NEON_TEST_MIGRATION_DATABASE_URL", "NEON_TEST_DATABASE_URL"], production: ["DATABASE_URL"] },
  runtime: { local: ["DATABASE_URL"], ci: ["NEON_TEST_RUNTIME_DATABASE_URL"], production: ["DATABASE_URL"] },
  "integration-test": { local: ["DATABASE_MIGRATION_URL"], ci: ["NEON_TEST_MIGRATION_DATABASE_URL", "NEON_TEST_DATABASE_URL"], production: [] }
};

function firstPresent(names: string[]) {
  return names.map((name) => process.env[name]).find((value): value is string => Boolean(value));
}

export function configuredDatabaseUrl(context: ExecutionContext, purpose: DatabasePurpose = "runtime"): string | undefined {
  const key = context === "ci-test" ? "ci" : context === "cloudflare-production" ? "production" : "local";
  return firstPresent(purposeEnvironmentVariables[purpose][key]);
}

export function assertMarkers(context: ExecutionContext, source: TrustedSource, environment: Environment) {
  assertExecutionContext(context, source, environment);
  const vocabflow = process.env.VOCABFLOW_ENV;
  const database = process.env.DATABASE_ENV;
  if (!vocabflow || !database || vocabflow !== database || vocabflow !== environment) {
    throw new Error("INVALID_ENVIRONMENT_MARKERS");
  }
}

export function assertTargetPolicy(target: ConnectionTarget) {
  validateEnvironmentUsage(target);
  if (!isConfiguredTarget(target)) throw new Error("UNCONFIGURED_DATABASE_TARGET");
}

export function parseConnectionFingerprint(connectionString: string, roleName: string) {
  try {
    const parsed = new URL(connectionString);
    const pathname = parsed.pathname.replace(/^\//, "");
    if (!parsed.hostname || !pathname || !parsed.username) throw new Error("INVALID_DATABASE_URL");
    return {
      host: parsed.hostname.toLowerCase(),
      databaseName: decodeURIComponent(pathname),
      roleName: decodeURIComponent(parsed.username),
      pooled: parsed.hostname.toLowerCase().includes("-pooler"),
      expectedRoleName: roleName
    };
  } catch {
    throw new Error("INVALID_DATABASE_URL");
  }
}

export function assertPreConnect(input: {
  context: ExecutionContext;
  source: TrustedSource;
  environment: Environment;
  purpose: DatabasePurpose;
  operation: Operation;
  target: ConnectionTarget;
  /** Optional purpose-specific credential, e.g. the bootstrap connection. */
  connectionString?: string;
}) {
  assertMarkers(input.context, input.source, input.environment);
  assertTargetPolicy(input.target);
  const expectedContext = EXECUTION_CONTEXTS[input.context];
  if (expectedContext.environment !== input.target.environment) throw new Error("INVALID_TARGET_CONTEXT");
  if (input.context === "cloudflare-production" && input.operation !== "db-check") {
    throw new Error("PRODUCTION_DB_MUTATION_OUT_OF_SCOPE");
  }
  const url = input.connectionString ?? configuredDatabaseUrl(input.context, input.purpose);
  if (!url) {
    if (input.context === "ci-test" && (input.purpose === "integration-test" || input.purpose === "migration")) throw new Error("SKIPPED_NO_TEST_DATABASE_SECRET");
    throw new Error(`${input.purpose.toUpperCase().replaceAll("-", "_")}_DATABASE_URL_REQUIRED`);
  }
  const fingerprint = parseConnectionFingerprint(url, input.target.roleName);
  if (fingerprint.roleName !== input.target.roleName) throw new Error("CONNECTION_TARGET_MISMATCH");
  if (input.context === "local-development") {
    const shared = SHARED_CI_TARGET;
    if (input.target.projectId === shared.projectId && input.target.branchId === shared.branchId) {
      throw new Error("LOCAL_SHARED_CI_TARGET_FORBIDDEN");
    }
    if (input.target.usage === "shared-ci") throw new Error("LOCAL_SHARED_CI_TARGET_FORBIDDEN");
  }
  return { url, fingerprint };
}

export function getTarget(environment: Environment, purpose: DatabasePurpose): ConnectionTarget {
  return getConnectionTarget(environment as keyof typeof DATABASE_TARGETS, purpose);
}

export async function assertResolvedTargetBeforeMutation(input: {
  context: ExecutionContext;
  source: TrustedSource;
  environment: Environment;
  purpose: DatabasePurpose;
  operation: Operation;
  target: ConnectionTarget;
  /** Optional purpose-specific credential, e.g. the bootstrap connection. */
  connectionString?: string;
  neonApiClient?: import("./neon-target-verifier").NeonApiClient;
}) {
  const pre = assertPreConnect(input);
  if (!process.env.NEON_API_KEY) throw new Error(input.context === "ci-test" ? "BLOCKED_PROVIDER_VERIFICATION" : "PROVIDER_VERIFICATION_REQUIRED");
  const result = await verifyNeonTarget({
    expected: input.target,
    configuredConnection: {
      host: pre.fingerprint.host,
      databaseName: pre.fingerprint.databaseName,
      roleName: pre.fingerprint.roleName,
      pooled: pre.fingerprint.pooled
    },
    neonApiClient: input.neonApiClient ?? createNeonApiClient(process.env.NEON_API_KEY)
  });
  if (!result.ok) throw new Error(result.code);
  if (input.context === "local-development" && result.verified.expected.usage === "shared-ci") {
    throw new Error("LOCAL_SHARED_CI_TARGET_FORBIDDEN");
  }
  return { ...pre, resolved: result.verified };
}
