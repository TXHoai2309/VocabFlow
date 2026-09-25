import { describe, expect, it, vi } from "vitest";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertCurationDatabaseAccess,
  configuredCurationTarget,
  formatCurationTargetMetadata,
  parseCurationCliArgs,
  resolveCurationTargetName,
  runAuthorizedCurationApply,
  type CurationDatabaseAccessRequest
} from "./vocabulary-curation-access";

const developmentTarget = configuredCurationTarget("development");
const testTarget = configuredCurationTarget("test");

function developmentRequest(overrides: Partial<CurationDatabaseAccessRequest> = {}): CurationDatabaseAccessRequest {
  return {
    executionContext: "local-development",
    trustedSource: "dev-launcher",
    vocabularyEnvironment: "development",
    databaseEnvironment: "development",
    requestedTarget: "development",
    resolvedTarget: developmentTarget,
    mode: "dry-run",
    ...overrides
  };
}

function testRequest(overrides: Partial<CurationDatabaseAccessRequest> = {}): CurationDatabaseAccessRequest {
  return {
    executionContext: "ci-test",
    trustedSource: "github-actions",
    vocabularyEnvironment: "test",
    databaseEnvironment: "test",
    requestedTarget: undefined,
    resolvedTarget: testTarget,
    mode: "dry-run",
    ...overrides
  };
}

describe("US-41 curation target authorization", () => {
  it("keeps the existing ci-test/test dry-run path on the canonical shared CI target", () => {
    expect(assertCurationDatabaseAccess(testRequest())).toMatchObject({
      name: "test",
      branchId: testTarget.branchId,
      mode: "dry-run"
    });
  });

  it("keeps the existing ci-test/test apply path allowed without local owner flags", () => {
    expect(assertCurationDatabaseAccess(testRequest({ mode: "apply" }))).toMatchObject({
      name: "test",
      branchId: testTarget.branchId,
      mode: "apply"
    });
  });

  it("blocks local development database access without explicit target selection", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({ requestedTarget: undefined })))
      .toThrow("CURATION_DEVELOPMENT_TARGET_REQUIRED");
    expect(() => resolveCurationTargetName("local-development", undefined))
      .toThrow("CURATION_DEVELOPMENT_TARGET_REQUIRED");
  });

  it("allows a read-only local development request only for the canonical configured target", () => {
    expect(assertCurationDatabaseAccess(developmentRequest())).toMatchObject({
      name: "development",
      branchId: developmentTarget.branchId,
      mode: "dry-run"
    });
  });

  it("prints zero-mutation safety metadata without accepting or exposing connection secrets", () => {
    const target = assertCurationDatabaseAccess(developmentRequest());
    const output = formatCurationTargetMetadata("local-development", "development", target).join("\n");
    expect(output).toContain("EXECUTION_CONTEXT=local-development");
    expect(output).toContain("DATABASE_ENV=development");
    expect(output).toContain(`TARGET_BRANCH=${developmentTarget.branchId}`);
    expect(output).not.toMatch(/postgres(?:ql)?:\/\/|password|api.?key|token/i);
    expect(output).not.toContain("DATABASE_MUTATIONS");
  });

  it("requires confirmation for development apply", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({ mode: "apply" })))
      .toThrow("CURATION_TARGET_CONFIRMATION_REQUIRED");
  });

  it("rejects a wrong development target confirmation", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({
      mode: "apply",
      confirmTarget: "test",
      confirmBranch: developmentTarget.branchId
    }))).toThrow("CURATION_TARGET_CONFIRMATION_REQUIRED");
  });

  it("rejects a wrong branch confirmation using the canonical configured branch", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({
      mode: "apply",
      confirmTarget: "development",
      confirmBranch: testTarget.branchId
    }))).toThrow("CURATION_BRANCH_CONFIRMATION_MISMATCH");
  });

  it("blocks a development request whose resolved target is the shared CI target", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({ resolvedTarget: testTarget })))
      .toThrow("CURATION_RESOLVED_TARGET_MISMATCH");
  });

  it("passes the correctly confirmed target to an injected apply planner without connecting to Neon", async () => {
    const request = developmentRequest({
      mode: "apply",
      confirmTarget: "development",
      confirmBranch: developmentTarget.branchId
    });
    const fixturePlanner = vi.fn(async (target) => ({ selectedTarget: target.name, branch: target.branchId }));
    await expect(runAuthorizedCurationApply(request, fixturePlanner)).resolves.toEqual({
      selectedTarget: "development",
      branch: developmentTarget.branchId
    });
    expect(fixturePlanner).toHaveBeenCalledOnce();
    expect(fixturePlanner).toHaveBeenCalledWith(expect.objectContaining({ name: "development" }));
  });

  it("blocks production for every curation mode", () => {
    const productionTarget = getConnectionTarget("production", "runtime");
    for (const mode of ["dry-run", "apply"] as const) {
      expect(() => assertCurationDatabaseAccess(developmentRequest({
        requestedTarget: "production",
        resolvedTarget: productionTarget,
        mode
      }))).toThrow("CURATION_PRODUCTION_TARGET_BLOCKED");
      expect(() => assertCurationDatabaseAccess({
        ...developmentRequest({ mode }),
        vocabularyEnvironment: "production",
        databaseEnvironment: "production",
        resolvedTarget: productionTarget
      })).toThrow("CURATION_PRODUCTION_TARGET_BLOCKED");
    }
  });

  it("rejects target or environment mismatches before provider or DB access", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({ databaseEnvironment: "test" })))
      .toThrow("CURATION_DEVELOPMENT_ENVIRONMENT_MISMATCH");
    expect(() => assertCurationDatabaseAccess(testRequest({ requestedTarget: "development" })))
      .toThrow("CURATION_TEST_TARGET_MISMATCH");
  });

  it("does not allow the execution context to claim a different trusted source", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({ trustedSource: "github-actions" })))
      .toThrow("CURATION_EXECUTION_SOURCE_MISMATCH");
    expect(() => assertCurationDatabaseAccess(testRequest({ trustedSource: "dev-launcher" })))
      .toThrow("CURATION_EXECUTION_SOURCE_MISMATCH");
  });

  it("allows confirmations only as part of an explicitly authorized development apply", () => {
    expect(() => assertCurationDatabaseAccess(developmentRequest({
      confirmTarget: "development",
      confirmBranch: developmentTarget.branchId
    }))).toThrow("CURATION_CONFIRMATION_WITHOUT_APPLY");
  });

  it("provides no generic force or guard bypass", () => {
    for (const flag of ["--force", "--unsafe", "--skip-guard", "--ignore-environment"]) {
      expect(() => parseCurationCliArgs([flag])).toThrow("CLI_ARGUMENT_INVALID");
    }
  });

  it("parses only explicit target and confirmation flags", () => {
    expect(parseCurationCliArgs([
      "--target", "development", "--apply", "--confirm-target", "development",
      "--confirm-branch", developmentTarget.branchId
    ])).toMatchObject({
      requestedTarget: "development",
      apply: true,
      confirmTarget: "development",
      confirmBranch: developmentTarget.branchId
    });
    expect(() => parseCurationCliArgs(["--target", "development", "--apply", "--apply"]))
      .toThrow("CLI_ARGUMENT_INVALID");
  });
});
