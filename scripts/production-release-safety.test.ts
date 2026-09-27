import { describe, expect, it, vi } from "vitest";
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

  it("blocks reset tooling in production and rejects all reset CLI target overrides", () => {
    expect(() => assertResetTargetAllowed({ args: [], environment: productionEnvironment }))
      .toThrow("DB_RESET_PRODUCTION_BLOCKED");
    expect(() => assertResetTargetAllowed({ args: ["--target", "production"], environment: {
      VOCABFLOW_ENV: "test", DATABASE_ENV: "test", EXECUTION_CONTEXT: "ci-test",
    } })).toThrow("DB_RESET_ARGUMENTS_NOT_SUPPORTED");
  });
});
