import { readFileSync } from "node:fs";
import { isAbsolute } from "node:path";
import { DATABASE_TARGETS, getConnectionTarget } from "../config/database-targets";
import type { ConnectionTarget, DatabasePurpose } from "@vocabflow/contracts";
import { createNeonApiClient, verifyNeonTarget, type NeonApiClient } from "./neon-target-verifier";
import { configuredProductionOperatorDatabaseUrl, parseConnectionFingerprint } from "./runtime-validation";

export type ProductionReleaseMode = "read-only" | "mutation";
export type ProductionReleaseOptions = {
  target?: string;
  confirmTarget?: string;
  confirmBranch?: string;
};

export function assertProductionReleaseIsCurrentMain(input: {
  eventSha?: string;
  releaseSha?: string;
  currentMainSha?: string;
}) {
  if (!input.eventSha || input.eventSha !== input.releaseSha || input.releaseSha !== input.currentMainSha) {
    throw new Error("PRODUCTION_RELEASE_NOT_CURRENT_MAIN");
  }
}

export const TRUSTED_DB_POLL_INTERVAL_MS = 15_000;
export const TRUSTED_DB_MAX_WAIT_MS = 35 * 60 * 1_000;

export async function waitForTrustedDbIntegration(input: {
  releaseSha?: string;
  fetchWorkflowRuns: (requestTimeoutMs: number) => Promise<unknown>;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  pollIntervalMs?: number;
  maxWaitMs?: number;
}) {
  const releaseSha = input.releaseSha;
  const pollIntervalMs = input.pollIntervalMs ?? TRUSTED_DB_POLL_INTERVAL_MS;
  const maxWaitMs = input.maxWaitMs ?? TRUSTED_DB_MAX_WAIT_MS;
  if (!releaseSha || !/^[a-f0-9]{40}$/i.test(releaseSha) || pollIntervalMs <= 0 || maxWaitMs <= 0) {
    throw new Error("PRODUCTION_TRUSTED_DB_REQUIRED");
  }

  const now = input.now ?? Date.now;
  const sleep = input.sleep ?? ((milliseconds: number) => new Promise<void>((resolve) => setTimeout(resolve, milliseconds)));
  const deadline = now() + maxWaitMs;

  while (true) {
    const requestTimeoutMs = deadline - now();
    if (requestTimeoutMs <= 0) throw new Error("PRODUCTION_TRUSTED_DB_REQUIRED");

    let response: unknown;
    try {
      response = await input.fetchWorkflowRuns(requestTimeoutMs);
    } catch {
      throw new Error("PRODUCTION_TRUSTED_DB_REQUIRED");
    }
    if (now() >= deadline) throw new Error("PRODUCTION_TRUSTED_DB_REQUIRED");

    const responseRecord = asRecord(response);
    const runs = Array.isArray(responseRecord?.workflow_runs) ? responseRecord.workflow_runs : [];
    const matchingRuns = runs.filter((value) => {
      const run = asRecord(value);
      const repository = asRecord(run?.repository);
      const headRepository = asRecord(run?.head_repository);
      return run?.name === "Trusted DB Integration"
        && run.head_sha === releaseSha
        && run.head_branch === "main"
        && run.event === "push"
        && repository?.full_name === PRODUCTION_RELEASE_REPOSITORY
        && headRepository?.full_name === PRODUCTION_RELEASE_REPOSITORY;
    });

    if (matchingRuns.some((value) => {
      const run = asRecord(value);
      return run?.status === "completed" && run.conclusion === "success";
    })) return;

    if (matchingRuns.some((value) => asRecord(value)?.status === "completed")) {
      throw new Error("PRODUCTION_TRUSTED_DB_REQUIRED");
    }

    const remainingMs = deadline - now();
    if (remainingMs <= 0) throw new Error("PRODUCTION_TRUSTED_DB_REQUIRED");
    await sleep(Math.min(pollIntervalMs, remainingMs));
  }
}

const PRODUCTION_RELEASE_REPOSITORY = "TXHoai2309/VocabFlow";
const PRODUCTION_RELEASE_WORKFLOW = "Production Release";
const CORE_CI_WORKFLOW = "Core CI";

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as RecordValue
    : undefined;
}

function readGithubEventPayload(environment: NodeJS.ProcessEnv): unknown {
  const eventPath = environment.GITHUB_EVENT_PATH;
  if (!eventPath || !isAbsolute(eventPath)) throw new Error("PRODUCTION_GITHUB_EVENT_REQUIRED");
  try {
    return JSON.parse(readFileSync(eventPath, "utf8")) as unknown;
  } catch {
    throw new Error("PRODUCTION_GITHUB_EVENT_INVALID");
  }
}

function assertGithubProductionReleaseContext(environment: NodeJS.ProcessEnv) {
  if (environment.GITHUB_ACTIONS !== "true"
      || environment.GITHUB_REPOSITORY !== PRODUCTION_RELEASE_REPOSITORY
      || environment.GITHUB_WORKFLOW !== PRODUCTION_RELEASE_WORKFLOW
      || environment.GITHUB_EVENT_NAME !== "workflow_run") {
    throw new Error("PRODUCTION_GITHUB_CONTEXT_REQUIRED");
  }

  const payload = asRecord(readGithubEventPayload(environment));
  const repository = asRecord(payload?.repository);
  const workflowRun = asRecord(payload?.workflow_run);
  const headRepository = asRecord(workflowRun?.head_repository);
  if (!payload || !repository || !workflowRun || !headRepository
      || payload.action !== "completed"
      || repository.full_name !== PRODUCTION_RELEASE_REPOSITORY
      || headRepository.full_name !== PRODUCTION_RELEASE_REPOSITORY
      || workflowRun.name !== CORE_CI_WORKFLOW
      || workflowRun.conclusion !== "success"
      || workflowRun.event !== "push"
      || workflowRun.head_branch !== "main") {
    throw new Error("PRODUCTION_CORE_CI_RELEASE_REQUIRED");
  }

  const releaseSha = environment.VOCABFLOW_RELEASE_SHA;
  const completedSha = workflowRun.head_sha;
  if (!releaseSha || !/^[a-f0-9]{40}$/i.test(releaseSha)) {
    throw new Error("RELEASE_SHA_REQUIRED");
  }
  if (typeof completedSha !== "string" || !/^[a-f0-9]{40}$/i.test(completedSha)
      || completedSha.toLowerCase() !== releaseSha.toLowerCase()) {
    throw new Error("PRODUCTION_RELEASE_SHA_MISMATCH");
  }
}

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
  if (environment.EXECUTION_CONTEXT === "ci-production-release") {
    assertGithubProductionReleaseContext(environment);
  } else if (environment.EXECUTION_CONTEXT !== "local-development") {
    throw new Error("PRODUCTION_OPERATOR_CONTEXT_REQUIRED");
  }
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
      || input.environment.EXECUTION_CONTEXT === "vercel-production"
      || input.environment.EXECUTION_CONTEXT === "ci-production-release") {
    throw new Error("DB_RESET_PRODUCTION_BLOCKED");
  }
}

export async function resolveProductionConnection(input: {
  purpose: Extract<DatabasePurpose, "bootstrap" | "identity-provision" | "migration" | "runtime">;
  environment: NodeJS.ProcessEnv;
  neonApiClient?: NeonApiClient;
}) {
  const { environment, purpose } = input;
  if (environment.VOCABFLOW_ENV !== "production" || environment.DATABASE_ENV !== "production") {
    throw new Error("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
  }
  const target = getConnectionTarget("production", purpose);
  const url = configuredProductionOperatorDatabaseUrl(purpose, environment);
  if (!url) throw new Error(`${productionOperatorVariable(purpose)}_REQUIRED`);
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

function productionOperatorVariable(purpose: Extract<DatabasePurpose, "bootstrap" | "identity-provision" | "migration" | "runtime">) {
  return {
    bootstrap: "PRODUCTION_BOOTSTRAP_DATABASE_URL",
    "identity-provision": "PRODUCTION_IDENTITY_PROVISION_DATABASE_URL",
    migration: "PRODUCTION_MIGRATION_DATABASE_URL",
    runtime: "PRODUCTION_DATABASE_URL"
  }[purpose];
}
