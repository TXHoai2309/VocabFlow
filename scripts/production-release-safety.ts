import { DATABASE_TARGETS, getConnectionTarget } from "../config/database-targets";
import type { ConnectionTarget, DatabasePurpose } from "@vocabflow/contracts";
import { createNeonApiClient, verifyNeonTarget, type NeonApiClient } from "./neon-target-verifier";
import { parseConnectionFingerprint } from "./runtime-validation";

export type ProductionReleaseMode = "read-only" | "mutation";
export type ProductionReleaseOptions = {
  target?: string;
  confirmTarget?: string;
  confirmBranch?: string;
};

export function parseProductionReleaseArgs(args: readonly string[]): ProductionReleaseOptions {
  const result: ProductionReleaseOptions = {};
  const seen = new Set<string>();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error("CLI_ARGUMENT_INVALID");
    seen.add(flag);
    if (flag !== "--target" && flag !== "--confirm-target" && flag !== "--confirm-branch") {
      throw new Error("CLI_ARGUMENT_INVALID");
    }
    const value = args[index + 1];
    if (!value || value.startsWith("--")) throw new Error("CLI_ARGUMENT_INVALID");
    index += 1;
    if (flag === "--target") result.target = value;
    else if (flag === "--confirm-target") result.confirmTarget = value;
    else result.confirmBranch = value;
  }
  return result;
}

export function authorizeProductionRelease(input: {
  options: ProductionReleaseOptions;
  mode: ProductionReleaseMode;
  environment: NodeJS.ProcessEnv;
}): ConnectionTarget {
  const { options, environment, mode } = input;
  if (options.target !== "production") throw new Error("PRODUCTION_TARGET_REQUIRED");
  if (environment.EXECUTION_CONTEXT !== "local-development") throw new Error("PRODUCTION_OPERATOR_CONTEXT_REQUIRED");
  if (environment.VOCABFLOW_ENV !== "production" || environment.DATABASE_ENV !== "production") {
    throw new Error("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
  }
  const target = getConnectionTarget("production", "migration");
  const canonical = DATABASE_TARGETS.production;
  if (target.environment !== "production" || target.usage !== "production"
      || target.projectId !== canonical.projectId || target.branchId !== canonical.branchId
      || target.roleName !== canonical.roles.migration) {
    throw new Error("PRODUCTION_CANONICAL_TARGET_MISMATCH");
  }
  if (mode === "mutation") {
    if (options.confirmTarget !== "production") throw new Error("PRODUCTION_TARGET_CONFIRMATION_REQUIRED");
    if (options.confirmBranch !== canonical.branchId) throw new Error("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH");
  } else if (options.confirmTarget !== undefined || options.confirmBranch !== undefined) {
    throw new Error("PRODUCTION_CONFIRMATION_WITHOUT_MUTATION");
  }
  if (String(target.branchId) === String(DATABASE_TARGETS.development.branchId)) throw new Error("PRODUCTION_DEVELOPMENT_BRANCH_BLOCKED");
  if (String(target.branchId) === String(DATABASE_TARGETS.test.branchId) || String(target.usage) === "shared-ci") {
    throw new Error("PRODUCTION_SHARED_CI_BRANCH_BLOCKED");
  }
  return target;
}

export async function runAuthorizedProductionMutation<T>(input: {
  options: ProductionReleaseOptions;
  environment: NodeJS.ProcessEnv;
}, mutation: (target: ConnectionTarget) => Promise<T>) {
  const target = authorizeProductionRelease({ ...input, mode: "mutation" });
  return mutation(target);
}

export function assertResetTargetAllowed(input: {
  args: readonly string[];
  environment: NodeJS.ProcessEnv;
}) {
  if (input.args.length > 0) throw new Error("DB_RESET_ARGUMENTS_NOT_SUPPORTED");
  if (input.environment.VOCABFLOW_ENV === "production"
      || input.environment.DATABASE_ENV === "production"
      || input.environment.EXECUTION_CONTEXT === "vercel-production") {
    throw new Error("DB_RESET_PRODUCTION_BLOCKED");
  }
}

export async function resolveProductionConnection(input: {
  purpose: Extract<DatabasePurpose, "migration" | "runtime">;
  environment: NodeJS.ProcessEnv;
  neonApiClient?: NeonApiClient;
}) {
  const { environment, purpose } = input;
  if (environment.VOCABFLOW_ENV !== "production" || environment.DATABASE_ENV !== "production") {
    throw new Error("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
  }
  const target = getConnectionTarget("production", purpose);
  const urlName = purpose === "migration" ? "PRODUCTION_MIGRATION_DATABASE_URL" : "PRODUCTION_DATABASE_URL";
  const url = environment[urlName];
  if (!url) throw new Error(`${urlName}_REQUIRED`);
  const fingerprint = parseConnectionFingerprint(url, target.roleName);
  if (!environment.NEON_API_KEY) throw new Error("PRODUCTION_PROVIDER_VERIFICATION_REQUIRED");
  const verification = await verifyNeonTarget({
    expected: target,
    configuredConnection: {
      host: fingerprint.host,
      databaseName: fingerprint.databaseName,
      roleName: fingerprint.roleName,
      pooled: fingerprint.pooled,
    },
    neonApiClient: input.neonApiClient ?? createNeonApiClient(environment.NEON_API_KEY),
  });
  if (!verification.ok) throw new Error(verification.code);
  return { target, url, resolved: verification.verified };
}
