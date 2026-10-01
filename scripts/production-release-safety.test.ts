import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertResetTargetAllowed,
  authorizeProductionRelease,
  parseProductionReleaseArgs,
  resolveProductionConnection,
  runAuthorizedProductionMutation,
} from "./production-release-safety";

const branch = getConnectionTarget("production", "migration").branchId;
const productionEnvironment = {
  EXECUTION_CONTEXT: "local-development",
  VOCABFLOW_ENV: "production",
  DATABASE_ENV: "production",
};
const productionFlags = { target: "production", confirmTarget: "production", confirmBranch: branch };
const releaseSha = "a".repeat(40);
const githubRepository = "TXHoai2309/VocabFlow";
const temporaryEventDirectories: string[] = [];

function coreCiWorkflowRun(overrides: Record<string, unknown> = {}) {
  return {
    action: "completed",
    repository: { full_name: githubRepository },
    workflow_run: {
      name: "Core CI",
      conclusion: "success",
      event: "push",
      head_branch: "main",
      head_sha: releaseSha,
      head_repository: { full_name: githubRepository },
      ...overrides,
    },
  };
}

function ciProductionEnvironment(event = coreCiWorkflowRun()) {
  const eventDirectory = mkdtempSync(join(tmpdir(), "vocabflow-production-release-"));
  temporaryEventDirectories.push(eventDirectory);
  const eventPath = join(eventDirectory, "event.json");
  writeFileSync(eventPath, JSON.stringify(event), { encoding: "utf8", mode: 0o600 });
  return {
    EXECUTION_CONTEXT: "ci-production-release",
    VOCABFLOW_ENV: "production",
    DATABASE_ENV: "production",
    VOCABFLOW_RELEASE_SHA: releaseSha,
    GITHUB_ACTIONS: "true",
    GITHUB_REPOSITORY: githubRepository,
    GITHUB_WORKFLOW: "Production Release",
    GITHUB_EVENT_NAME: "workflow_run",
    GITHUB_EVENT_PATH: eventPath,
  };
}

afterAll(() => {
  for (const directory of temporaryEventDirectories) rmSync(directory, { recursive: true, force: true });
});

describe("production database release guard", () => {
  it("resolves the canonical production target in read-only mode after explicit selection", () => {
    const target = authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only", environment: productionEnvironment,
    });
    expect(target).toMatchObject({ environment: "production", usage: "production", branchId: branch, roleName: "vocabflow_migration" });
  });

  it("blocks production migration when target selection is missing or wrong", () => {
    for (const options of [{}, { target: "development" }]) {
      expect(() => authorizeProductionRelease({ options, mode: "read-only", environment: productionEnvironment }))
        .toThrow("PRODUCTION_TARGET_REQUIRED");
    }
  });

  it("requires exact production and branch confirmations for mutations", () => {
    expect(() => authorizeProductionRelease({
      options: { target: "production", confirmTarget: "development", confirmBranch: branch },
      mode: "mutation", environment: productionEnvironment,
    })).toThrow("PRODUCTION_TARGET_CONFIRMATION_REQUIRED");
    expect(() => authorizeProductionRelease({
      options: { target: "production", confirmTarget: "production", confirmBranch: "wrong-branch" },
      mode: "mutation", environment: productionEnvironment,
    })).toThrow("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH");
  });

  it("cannot accept the development or shared-ci branch as production confirmation", () => {
    for (const wrongBranch of [
      getConnectionTarget("development", "migration").branchId,
      getConnectionTarget("test", "migration").branchId,
    ]) {
      expect(() => authorizeProductionRelease({
        options: { ...productionFlags, confirmBranch: wrongBranch },
        mode: "mutation", environment: productionEnvironment,
      })).toThrow("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH");
    }
  });

  it("requires production markers and local release operator context", () => {
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only", environment: { ...productionEnvironment, DATABASE_ENV: "development" },
    })).toThrow("PRODUCTION_ENVIRONMENT_MARKERS_REQUIRED");
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only", environment: { ...productionEnvironment, EXECUTION_CONTEXT: "ci-test" },
    })).toThrow("PRODUCTION_OPERATOR_CONTEXT_REQUIRED");
  });

  it("keeps the local production operator path and admits only the verified GitHub release context", () => {
    expect(authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only", environment: productionEnvironment,
    })).toMatchObject({ branchId: branch, roleName: "vocabflow_migration" });
    expect(authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only", environment: ciProductionEnvironment(),
    })).toMatchObject({ branchId: branch, roleName: "vocabflow_migration" });
  });

  it("requires GitHub Actions, the exact repository, and workflow-run metadata", () => {
    const missing = {
      EXECUTION_CONTEXT: "ci-production-release",
      VOCABFLOW_ENV: "production",
      DATABASE_ENV: "production",
    };
    expect(() => authorizeProductionRelease({ options: { target: "production" }, mode: "read-only", environment: missing }))
      .toThrow("PRODUCTION_GITHUB_CONTEXT_REQUIRED");
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only",
      environment: { ...ciProductionEnvironment(), GITHUB_REPOSITORY: "somebody-else/VocabFlow" },
    })).toThrow("PRODUCTION_GITHUB_CONTEXT_REQUIRED");
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only",
      environment: { ...ciProductionEnvironment(), GITHUB_EVENT_PATH: undefined },
    })).toThrow("PRODUCTION_GITHUB_EVENT_REQUIRED");
  });

  it.each([
    ["wrong base repository", coreCiWorkflowRun({ head_repository: { full_name: "untrusted/VocabFlow" } })],
    ["non-main branch", coreCiWorkflowRun({ head_branch: "feature/unsafe" })],
    ["failed Core CI", coreCiWorkflowRun({ conclusion: "failure" })],
    ["pull request code", coreCiWorkflowRun({ event: "pull_request", head_branch: "contributor-branch" })],
    ["wrong workflow", coreCiWorkflowRun({ name: "Other workflow" })],
  ])("rejects %s for production release", (_label, event) => {
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only", environment: ciProductionEnvironment(event),
    })).toThrow("PRODUCTION_CORE_CI_RELEASE_REQUIRED");
  });

  it("binds the production release to the successful Core CI immutable SHA", () => {
    const mismatch = ciProductionEnvironment(coreCiWorkflowRun({ head_sha: "b".repeat(40) }));
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only", environment: mismatch,
    })).toThrow("PRODUCTION_RELEASE_SHA_MISMATCH");
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "read-only",
      environment: { ...ciProductionEnvironment(), VOCABFLOW_RELEASE_SHA: "not-a-commit" },
    })).toThrow("RELEASE_SHA_REQUIRED");
  });

  it("does not allow ci-test to authorize production and retains exact mutation confirmations", () => {
    expect(() => authorizeProductionRelease({
      options: productionFlags, mode: "mutation", environment: {
        ...ciProductionEnvironment(), EXECUTION_CONTEXT: "ci-test",
      },
    })).toThrow("PRODUCTION_OPERATOR_CONTEXT_REQUIRED");
    const validCi = ciProductionEnvironment();
    expect(() => authorizeProductionRelease({
      options: { target: "production" }, mode: "mutation", environment: validCi,
    })).toThrow("PRODUCTION_TARGET_CONFIRMATION_REQUIRED");
    expect(() => authorizeProductionRelease({
      options: { target: "production", confirmTarget: "production", confirmBranch: "wrong" },
      mode: "mutation", environment: validCi,
    })).toThrow("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH");
    expect(() => authorizeProductionRelease({
      options: { ...productionFlags, confirmBranch: getConnectionTarget("development", "migration").branchId },
      mode: "mutation", environment: ciProductionEnvironment(),
    })).toThrow("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH");
  });

  it("correct confirmation reaches only an injected fixture boundary; no real DB is opened", async () => {
    const fixture = vi.fn(async (target) => ({ branch: target.branchId, externalIo: false }));
    await expect(runAuthorizedProductionMutation({ options: productionFlags, environment: productionEnvironment }, fixture))
      .resolves.toEqual({ branch, externalIo: false });
    expect(fixture).toHaveBeenCalledOnce();
  });

  it("provider target resolution uses the production URL and injected provider fixture", async () => {
    const target = getConnectionTarget("production", "migration");
    const uri = "postgres://vocabflow_migration:fixture@ep-fixture-pooler.us-east-2.aws.neon.tech/neondb";
    const neonApiClient = {
      getBranch: vi.fn(async () => ({ projectId: target.projectId, branchId: target.branchId })),
      getConnectionUri: vi.fn(async () => ({ uri })),
    };
    const result = await resolveProductionConnection({
      purpose: "migration",
      environment: { ...productionEnvironment, PRODUCTION_MIGRATION_DATABASE_URL: uri, NEON_API_KEY: "test-fixture-only" },
      neonApiClient,
    });
    expect(result.target.branchId).toBe(branch);
    expect(neonApiClient.getBranch).toHaveBeenCalledOnce();
    expect(neonApiClient.getConnectionUri).toHaveBeenCalledOnce();
  });

  it("requires Neon provider verification for the GitHub release context", async () => {
    const eventEnvironment = ciProductionEnvironment();
    await expect(resolveProductionConnection({
      purpose: "migration",
      environment: {
        ...eventEnvironment,
        PRODUCTION_MIGRATION_DATABASE_URL: "postgresql://vocabflow_migration:fixture@ep-production-pooler.neon.tech/neondb",
      },
      neonApiClient: { getBranch: vi.fn(), getConnectionUri: vi.fn() },
    })).rejects.toThrow("PRODUCTION_PROVIDER_VERIFICATION_REQUIRED");
  });

  it("requires a separate migration credential and never falls back to DATABASE_URL", async () => {
    await expect(resolveProductionConnection({
      purpose: "migration",
      environment: { ...productionEnvironment, DATABASE_URL: "postgres://ignored" },
      neonApiClient: { getBranch: vi.fn(), getConnectionUri: vi.fn() },
    })).rejects.toThrow("PRODUCTION_MIGRATION_DATABASE_URL_REQUIRED");
  });

  it("rejects generic force, unsafe and unknown CLI bypass flags", () => {
    for (const flag of ["--force", "--unsafe", "--skip-guard", "--ignore-environment"]) {
      expect(() => parseProductionReleaseArgs(["--target", "production", flag])).toThrow("CLI_ARGUMENT_INVALID");
    }
  });

  it("blocks reset tooling for every production marker and preserves non-production behavior", () => {
    expect(() => assertResetTargetAllowed({ args: [], environment: productionEnvironment }))
      .toThrow("DB_RESET_PRODUCTION_BLOCKED");

    for (const environment of [
      { VOCABFLOW_ENV: "production" },
      { DATABASE_ENV: "production" },
      { EXECUTION_CONTEXT: "vercel-production" },
      { EXECUTION_CONTEXT: "ci-production-release", VOCABFLOW_ENV: "production", DATABASE_ENV: "production" },
      { EXECUTION_CONTEXT: "ci-production-release" },
    ]) {
      expect(() => assertResetTargetAllowed({ args: [], environment }))
        .toThrow("DB_RESET_PRODUCTION_BLOCKED");
    }

    expect(() => assertResetTargetAllowed({ args: [], environment: {
      VOCABFLOW_ENV: "test", DATABASE_ENV: "test", EXECUTION_CONTEXT: "ci-test",
    } })).not.toThrow();
    expect(() => assertResetTargetAllowed({ args: [], environment: {
      VOCABFLOW_ENV: "development", DATABASE_ENV: "development", EXECUTION_CONTEXT: "local-development",
    } })).not.toThrow();

    expect(() => assertResetTargetAllowed({ args: ["--target", "production"], environment: {
      VOCABFLOW_ENV: "test", DATABASE_ENV: "test", EXECUTION_CONTEXT: "ci-test",
    } })).toThrow("DB_RESET_ARGUMENTS_NOT_SUPPORTED");
  });
});
