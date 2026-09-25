import type { ConnectionTarget, Environment, ExecutionContext, TrustedSource } from "@vocabflow/contracts";
import { getConnectionTarget, SHARED_CI_TARGET } from "../config/database-targets";

export type CurationTargetName = "development" | "test" | "production";
export type CurationAccessMode = "dry-run" | "apply";

export type CurationCliOptions = {
  apply: boolean;
  generateManifest: boolean;
  requestedTarget?: CurationTargetName;
  confirmTarget?: string;
  confirmBranch?: string;
};

export function parseCurationCliArgs(args: readonly string[]): CurationCliOptions {
  const seen = new Set<string>();
  let apply = false;
  let generateManifest = false;
  let requestedTarget: CurationTargetName | undefined;
  let confirmTarget: string | undefined;
  let confirmBranch: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (seen.has(flag)) throw new Error("CLI_ARGUMENT_INVALID");
    seen.add(flag);

    if (flag === "--apply") {
      apply = true;
      continue;
    }
    if (flag === "--generate-manifest") {
      generateManifest = true;
      continue;
    }

    if (flag === "--target" || flag === "--confirm-target" || flag === "--confirm-branch") {
      const value = args[index + 1];
      if (!value || value.startsWith("--")) throw new Error("CLI_ARGUMENT_INVALID");
      index += 1;
      if (flag === "--target") {
        if (value !== "development" && value !== "test" && value !== "production") {
          throw new Error("CLI_ARGUMENT_INVALID");
        }
        requestedTarget = value;
      } else if (flag === "--confirm-target") {
        confirmTarget = value;
      } else {
        confirmBranch = value;
      }
      continue;
    }

    // There is deliberately no generic force/unsafe/guard-bypass option.
    throw new Error("CLI_ARGUMENT_INVALID");
  }

  if ((apply && generateManifest) || (generateManifest && seen.size > 1)) {
    throw new Error("CLI_ARGUMENT_INVALID");
  }
  return { apply, generateManifest, requestedTarget, confirmTarget, confirmBranch };
}

export type CurationDatabaseAccessRequest = {
  executionContext: ExecutionContext;
  trustedSource: TrustedSource;
  vocabularyEnvironment: Environment;
  databaseEnvironment: string | undefined;
  requestedTarget: CurationTargetName | undefined;
  resolvedTarget: ConnectionTarget;
  mode: CurationAccessMode;
  confirmTarget?: string;
  confirmBranch?: string;
};

export type AuthorizedCurationTarget = {
  name: "development" | "test";
  branchId: string;
  mode: CurationAccessMode;
  target: ConnectionTarget;
};

export function formatCurationTargetMetadata(
  executionContext: ExecutionContext,
  databaseEnvironment: Environment,
  target: AuthorizedCurationTarget
) {
  return [
    `EXECUTION_CONTEXT=${executionContext}`,
    `DATABASE_ENV=${databaseEnvironment}`,
    `TARGET_NAME=${target.name}`,
    `TARGET_BRANCH=${target.branchId}`
  ];
}

const targetIdentityFields = [
  "environment",
  "provider",
  "projectId",
  "branchId",
  "databaseName",
  "pooled",
  "usage",
  "identityVersion",
  "purpose",
  "roleName"
] as const;

function isCanonicalTarget(actual: ConnectionTarget, expected: ConnectionTarget) {
  return targetIdentityFields.every((field) => actual[field] === expected[field]);
}

export function assertCurationDatabaseAccess(
  request: CurationDatabaseAccessRequest
): AuthorizedCurationTarget {
  const { executionContext, vocabularyEnvironment, databaseEnvironment, requestedTarget, resolvedTarget, mode } = request;

  if (requestedTarget === "production" || vocabularyEnvironment === "production" || resolvedTarget.environment === "production") {
    throw new Error("CURATION_PRODUCTION_TARGET_BLOCKED");
  }

  if (executionContext === "local-development") {
    const expected = getConnectionTarget("development", "runtime");
    if (request.trustedSource !== "dev-launcher") throw new Error("CURATION_EXECUTION_SOURCE_MISMATCH");
    if (vocabularyEnvironment !== "development" || databaseEnvironment !== "development") {
      throw new Error("CURATION_DEVELOPMENT_ENVIRONMENT_MISMATCH");
    }
    if (requestedTarget !== "development") throw new Error("CURATION_DEVELOPMENT_TARGET_REQUIRED");
    if (!isCanonicalTarget(resolvedTarget, expected)) throw new Error("CURATION_RESOLVED_TARGET_MISMATCH");
    if (resolvedTarget.usage !== "development" || resolvedTarget.branchId === SHARED_CI_TARGET.branchId) {
      throw new Error("CURATION_SHARED_CI_TARGET_BLOCKED");
    }

    if (mode === "apply") {
      if (request.confirmTarget !== "development") throw new Error("CURATION_TARGET_CONFIRMATION_REQUIRED");
      if (request.confirmBranch !== expected.branchId) throw new Error("CURATION_BRANCH_CONFIRMATION_MISMATCH");
    } else if (request.confirmTarget !== undefined || request.confirmBranch !== undefined) {
      throw new Error("CURATION_CONFIRMATION_WITHOUT_APPLY");
    }

    return { name: "development", branchId: expected.branchId, mode, target: expected };
  }

  if (executionContext === "ci-test") {
    const expected = getConnectionTarget("test", "runtime");
    if (request.trustedSource !== "github-actions") throw new Error("CURATION_EXECUTION_SOURCE_MISMATCH");
    if (vocabularyEnvironment !== "test" || databaseEnvironment !== "test") {
      throw new Error("CURATION_TEST_ENVIRONMENT_MISMATCH");
    }
    if (requestedTarget !== undefined && requestedTarget !== "test") {
      throw new Error("CURATION_TEST_TARGET_MISMATCH");
    }
    if (!isCanonicalTarget(resolvedTarget, expected)
      || resolvedTarget.usage !== "shared-ci"
      || resolvedTarget.branchId !== SHARED_CI_TARGET.branchId) {
      throw new Error("CURATION_TEST_TARGET_MISMATCH");
    }
    if (request.confirmTarget !== undefined || request.confirmBranch !== undefined) {
      throw new Error("CURATION_CI_CONFIRMATION_NOT_ALLOWED");
    }
    return { name: "test", branchId: expected.branchId, mode, target: expected };
  }

  throw new Error("CURATION_EXECUTION_CONTEXT_BLOCKED");
}

export function resolveCurationTargetName(
  executionContext: ExecutionContext,
  requestedTarget: CurationTargetName | undefined
): "development" | "test" {
  if (executionContext === "ci-test") {
    if (requestedTarget !== undefined && requestedTarget !== "test") throw new Error("CURATION_TEST_TARGET_MISMATCH");
    return "test";
  }
  if (executionContext === "local-development") {
    if (requestedTarget !== "development") throw new Error("CURATION_DEVELOPMENT_TARGET_REQUIRED");
    return "development";
  }
  throw new Error("CURATION_EXECUTION_CONTEXT_BLOCKED");
}

export function configuredCurationTarget(name: "development" | "test") {
  return getConnectionTarget(name, "runtime");
}

export async function runAuthorizedCurationApply<T>(
  request: CurationDatabaseAccessRequest,
  applyPlanner: (target: AuthorizedCurationTarget) => Promise<T>
): Promise<T> {
  if (request.mode !== "apply") throw new Error("CURATION_APPLY_MODE_REQUIRED");
  const authorized = assertCurationDatabaseAccess(request);
  return applyPlanner(authorized);
}
