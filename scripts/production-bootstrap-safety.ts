import type { DatabasePurpose } from "@vocabflow/contracts";
import { getConnectionTarget } from "../config/database-targets";
import { parseRoleCredential } from "./db-credentials";
import {
  authorizeProductionRelease,
  parseProductionReleaseArgs,
  resolveProductionConnection,
  type ProductionReleaseOptions,
} from "./production-release-safety";
import { parseConnectionFingerprint } from "./runtime-validation";

export type ProductionBootstrapOptions = ProductionReleaseOptions & { apply: boolean };

const bootstrapRoleCredentialPurposes = [
  ["identity-provision", "PRODUCTION_IDENTITY_PROVISION_DATABASE_URL"],
  ["migration", "PRODUCTION_MIGRATION_DATABASE_URL"],
  ["runtime", "PRODUCTION_DATABASE_URL"],
] as const satisfies readonly (readonly [Extract<DatabasePurpose, "identity-provision" | "migration" | "runtime">, string])[];

export function parseProductionBootstrapArgs(args: readonly string[]): ProductionBootstrapOptions {
  let apply = false;
  const releaseArgs: string[] = [];
  for (const arg of args) {
    if (arg === "--apply") {
      if (apply) throw new Error("CLI_ARGUMENT_INVALID");
      apply = true;
    } else {
      releaseArgs.push(arg);
    }
  }
  return { ...parseProductionReleaseArgs(releaseArgs), apply };
}

export function authorizeProductionBootstrap(options: ProductionBootstrapOptions, environment: NodeJS.ProcessEnv) {
  if (options.apply) {
    return authorizeProductionRelease({ options, mode: "mutation", environment });
  }
  return authorizeProductionRelease({ options, mode: "read-only", environment });
}

export function authorizeProductionBootstrapApply(options: ProductionBootstrapOptions, environment: NodeJS.ProcessEnv) {
  if (!options.apply) throw new Error("PRODUCTION_BOOTSTRAP_APPLY_REQUIRED");
  return authorizeProductionRelease({ options, mode: "mutation", environment });
}

export async function resolveProductionBootstrapConnection(environment: NodeJS.ProcessEnv) {
  return resolveProductionConnection({ purpose: "bootstrap", environment });
}

export function productionBootstrapRoleCredentials(
  environment: NodeJS.ProcessEnv,
  bootstrapConnection: ReturnType<typeof parseConnectionFingerprint>,
) {
  const credentials = {} as Record<(typeof bootstrapRoleCredentialPurposes)[number][0], ReturnType<typeof parseRoleCredential>>;
  for (const [purpose, variable] of bootstrapRoleCredentialPurposes) {
    const url = environment[variable];
    if (!url) throw new Error(`${variable}_REQUIRED`);
    const target = getConnectionTarget("production", purpose);
    const fingerprint = parseConnectionFingerprint(url, target.roleName);
    if (fingerprint.host !== bootstrapConnection.host
      || fingerprint.databaseName !== bootstrapConnection.databaseName
      || fingerprint.pooled !== bootstrapConnection.pooled) {
      throw new Error("PRODUCTION_BOOTSTRAP_ROLE_TARGET_MISMATCH");
    }
    credentials[purpose] = parseRoleCredential(url, target.roleName);
  }
  return {
    provision: credentials["identity-provision"],
    migration: credentials.migration,
    runtime: credentials.runtime,
  };
}

export function safeProductionBootstrapError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const safeCodes = new Set([
    "BLOCKED_ROLE_MODEL",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_FORBIDDEN_MEMBERSHIP",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_MIGRATION_CREATE",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_MIGRATION_USAGE",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_MISSING",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_OWNER",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_PROVISION_CREATE",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_ROLE_MISSING",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_RUNTIME_CREATE",
    "BLOCKED_ROLE_MODEL_APP_SCHEMA_RUNTIME_USAGE",
    "BLOCKED_ROLE_MODEL_APP_TO_OWNER_MEMBERSHIP",
    "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_CREATE",
    "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_MISSING",
    "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_OWNER",
    "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_USAGE",
    "BLOCKED_ROLE_MODEL_MIGRATION_ROLE_MISSING",
    "BLOCKED_ROLE_MODEL_PROVISION_TO_MIGRATION_MEMBERSHIP",
    "BLOCKED_ROLE_MODEL_RUNTIME_TO_MIGRATION_MEMBERSHIP",
    "BLOCKED_ROLE_MODEL_UNEXPECTED_BOOTSTRAP_MEMBERSHIP_OPTIONS",
    "BRANCH_NOT_FOUND",
    "CLI_ARGUMENT_INVALID",
    "CONNECTION_TARGET_MISMATCH",
    "INVALID_DATABASE_URL",
    "INVALID_ROLE_IDENTIFIER",
    "PRODUCTION_BOOTSTRAP_APPLY_REQUIRED",
    "PRODUCTION_BOOTSTRAP_CONNECTION_TARGET_MISMATCH",
    "PRODUCTION_BOOTSTRAP_DATABASE_URL_REQUIRED",
    "PRODUCTION_BOOTSTRAP_ROLE_TARGET_MISMATCH",
    "PRODUCTION_BOOTSTRAP_UNEXPECTED_STATE",
    "PRODUCTION_BRANCH_CONFIRMATION_MISMATCH",
    "PRODUCTION_CANONICAL_TARGET_MISMATCH",
    "PRODUCTION_CONFIRMATION_WITHOUT_MUTATION",
    "PRODUCTION_DATABASE_URL_REQUIRED",
    "PRODUCTION_DEVELOPMENT_BRANCH_BLOCKED",
    "PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED",
    "PRODUCTION_IDENTITY_PROVISION_DATABASE_URL_REQUIRED",
    "PRODUCTION_MIGRATION_DATABASE_URL_REQUIRED",
    "PRODUCTION_OPERATOR_CONTEXT_REQUIRED",
    "PRODUCTION_PROVIDER_VERIFICATION_REQUIRED",
    "PRODUCTION_SHARED_CI_BRANCH_BLOCKED",
    "PRODUCTION_TARGET_CONFIRMATION_REQUIRED",
    "PRODUCTION_TARGET_REQUIRED",
    "PROJECT_NOT_FOUND",
    "PROTECTED_METADATA_MALFORMED",
    "PROVIDER_AUTH_FAILED",
    "PROVIDER_RESPONSE_INVALID",
    "PROVIDER_UNAVAILABLE",
    "ROLE_CREDENTIALS_REQUIRED",
  ]);
  return safeCodes.has(message) ? message : "PRODUCTION_BOOTSTRAP_FAILED";
}
