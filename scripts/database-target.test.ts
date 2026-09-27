import { describe, expect, it } from "vitest";
import { resolveDatabaseTarget, validateEnvironmentUsage } from "@vocabflow/contracts";
import { assertMarkers, assertPreConnect, assertResolvedTargetBeforeMutation, configuredDatabaseUrl } from "./runtime-validation";
import { validatePostConnectIdentity } from "./post-connect-validation";

describe("foundation target policy", () => {
  it("keeps identity, migration and runtime credentials purpose-specific", () => {
    const keys = ["NEON_TEST_IDENTITY_PROVISION_DATABASE_URL", "NEON_TEST_MIGRATION_DATABASE_URL", "NEON_TEST_DATABASE_URL", "NEON_TEST_RUNTIME_DATABASE_URL", "VOCABFLOW_ENV", "DATABASE_ENV"];
    const previous = new Map(keys.map((key) => [key, process.env[key]]));
    process.env.NEON_TEST_IDENTITY_PROVISION_DATABASE_URL = "postgresql://vocabflow_identity_provision:secret@identity.neon.tech/vocabflow";
    process.env.NEON_TEST_MIGRATION_DATABASE_URL = "postgresql://vocabflow_migration:secret@migration.neon.tech/vocabflow";
    process.env.NEON_TEST_RUNTIME_DATABASE_URL = "postgresql://vocabflow_runtime:secret@runtime.neon.tech/vocabflow";
    process.env.VOCABFLOW_ENV = "test";
    process.env.DATABASE_ENV = "test";
    const target = { environment: "test" as const, provider: "neon" as const, projectId: "project", branchId: "branch", databaseName: "vocabflow", pooled: false, usage: "shared-ci" as const, identityVersion: 1 as const, purpose: "identity-provision" as const, roleName: "vocabflow_identity_provision" };
    expect(configuredDatabaseUrl("ci-test", "identity-provision")).toContain("vocabflow_identity_provision");
    expect(configuredDatabaseUrl("ci-test", "integration-test")).toContain("vocabflow_migration");
    expect(() => assertPreConnect({ context: "ci-test", source: "github-actions", environment: "test", purpose: "identity-provision", operation: "identity-provision", target, connectionString: "postgresql://vocabflow_migration:secret@migration.neon.tech/vocabflow" })).toThrow("CONNECTION_TARGET_MISMATCH");
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  });

  it.each([
    ["local-development", "dev-launcher", "development"],
    ["ci-test", "github-actions", "test"],
    ["vercel-production", "vercel-runtime", "production"]
  ] as const)("accepts the %s trusted context mapping", (context, source, environment) => {
    const previousVocabulary = process.env.VOCABFLOW_ENV;
    const previousDatabase = process.env.DATABASE_ENV;
    process.env.VOCABFLOW_ENV = environment;
    process.env.DATABASE_ENV = environment;
    expect(() => assertMarkers(context, source, environment)).not.toThrow();
    if (previousVocabulary === undefined) delete process.env.VOCABFLOW_ENV; else process.env.VOCABFLOW_ENV = previousVocabulary;
    if (previousDatabase === undefined) delete process.env.DATABASE_ENV; else process.env.DATABASE_ENV = previousDatabase;
  });

  it("rejects production markers from local and CI contexts", () => {
    process.env.VOCABFLOW_ENV = "production";
    process.env.DATABASE_ENV = "production";
    expect(() => assertMarkers("local-development", "dev-launcher", "production")).toThrow("INVALID_EXECUTION_CONTEXT");
    expect(() => assertMarkers("ci-test", "github-actions", "production")).toThrow("INVALID_EXECUTION_CONTEXT");
    process.env.VOCABFLOW_ENV = "development";
    process.env.DATABASE_ENV = "development";
  });

  it("rejects invalid environment and usage combinations", () => {
    expect(() => validateEnvironmentUsage({ environment: "production", usage: "development" })).toThrow("INVALID_DATABASE_TARGET_POLICY");
  });

  it("requires both provider and configured comparisons", () => {
    const expected = { environment: "development" as const, provider: "neon" as const, projectId: "p", branchId: "b", databaseName: "db", pooled: false, usage: "development" as const, identityVersion: 1 as const, purpose: "runtime" as const, roleName: "runtime" };
    const provider = { projectId: "p", branchId: "b", host: "host", databaseName: "db", roleName: "runtime", pooled: false };
    expect(resolveDatabaseTarget(expected, provider, provider).provider.host).toBe("host");
    expect(() => resolveDatabaseTarget(expected, provider, { ...provider, host: "other" })).toThrow("CONNECTION_TARGET_MISMATCH");
  });

  it("enforces marker equality", () => {
    process.env.VOCABFLOW_ENV = "development";
    process.env.DATABASE_ENV = "test";
    expect(() => assertMarkers("local-development", "dev-launcher", "development")).toThrow("INVALID_ENVIRONMENT_MARKERS");
    process.env.DATABASE_ENV = "development";
  });

  it("validates database-side canonical identity", () => {
    const expected = { environment: "test" as const, provider: "neon" as const, projectId: "p", branchId: "b", databaseName: "db", pooled: false, usage: "shared-ci" as const, identityVersion: 1 as const };
    expect(validatePostConnectIdentity({ environment: "test", provider: "neon", projectId: "p", branchId: "b", identityVersion: 1 }, expected)).toBe(true);
    expect(() => validatePostConnectIdentity({ environment: "production", provider: "neon", projectId: "p", branchId: "b", identityVersion: 1 }, expected)).toThrow("DATABASE_IDENTITY_MISMATCH");
  });

  it("denies a local mutation resolved to the shared CI target", async () => {
    process.env.VOCABFLOW_ENV = "development";
    process.env.DATABASE_ENV = "development";
    process.env.DATABASE_MIGRATION_URL = "postgresql://runtime:secret@ep-shared.neon.tech/vocabflow";
    process.env.NEON_API_KEY = "test-key";
    const target = { environment: "development" as const, provider: "neon" as const, projectId: "development-project", branchId: "development-branch", databaseName: "vocabflow", pooled: false, usage: "development" as const, identityVersion: 1 as const, purpose: "migration" as const, roleName: "runtime" };
    await expect(assertResolvedTargetBeforeMutation({
      context: "local-development",
      source: "dev-launcher",
      environment: "development",
      purpose: "migration",
      operation: "db-migrate",
      target,
      neonApiClient: {
        getBranch: async () => ({ projectId: "shared-project", branchId: "shared-branch" }),
        getConnectionUri: async () => ({ uri: "postgresql://runtime:secret@ep-shared.neon.tech/vocabflow" })
      }
    })).rejects.toThrow("PROJECT_NOT_FOUND");
    delete process.env.DATABASE_MIGRATION_URL;
    delete process.env.NEON_API_KEY;
  });
});
