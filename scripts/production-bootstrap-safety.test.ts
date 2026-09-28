import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { DATABASE_TARGETS, getConnectionTarget } from "../config/database-targets";
import { assertResetTargetAllowed, resolveProductionConnection } from "./production-release-safety";
import { bootstrapTargetForEnvironment } from "./bootstrap-target";
import {
  classifyProductionBootstrapState,
  ROLE_NAMES,
  type ProductionBootstrapCatalogSnapshot,
} from "./db-bootstrap";
import { parseIdentityProvisionArgs } from "./db-identity-provision";
import { configuredDatabaseUrl } from "./runtime-validation";
import {
  authorizeProductionBootstrap,
  authorizeProductionBootstrapApply,
  parseProductionBootstrapArgs,
  productionBootstrapRoleCredentials,
  resolveProductionBootstrapConnection,
  safeProductionBootstrapError,
} from "./production-bootstrap-safety";

const target = getConnectionTarget("production", "bootstrap");
const productionEnvironment = {
  EXECUTION_CONTEXT: "local-development",
  VOCABFLOW_ENV: "production",
  DATABASE_ENV: "production",
};
const branch = "br-rough-silence-b3gbqjcb";
const bootstrapUrl = "postgresql://neondb_owner:one-shot@ep-prod-pooler.neon.tech/neondb";
const roleUrls = {
  PRODUCTION_IDENTITY_PROVISION_DATABASE_URL: "postgresql://vocabflow_identity_provision:provision-pass@ep-prod-pooler.neon.tech/neondb",
  PRODUCTION_MIGRATION_DATABASE_URL: "postgresql://vocabflow_migration:migration-pass@ep-prod-pooler.neon.tech/neondb",
  PRODUCTION_DATABASE_URL: "postgresql://vocabflow_runtime:runtime-pass@ep-prod-pooler.neon.tech/neondb",
};
const completeProductionFlags = {
  apply: true,
  target: "production",
  confirmTarget: "production",
  confirmBranch: branch,
};

function providerFixture(overrides: { projectId?: string; branchId?: string; uri?: string } = {}) {
  return {
    getBranch: vi.fn(async () => ({
      projectId: overrides.projectId ?? target.projectId,
      branchId: overrides.branchId ?? target.branchId,
    })),
    getConnectionUri: vi.fn(async () => ({ uri: overrides.uri ?? bootstrapUrl })),
  };
}

function stateSnapshot(overrides: Partial<ProductionBootstrapCatalogSnapshot> = {}): ProductionBootstrapCatalogSnapshot {
  return {
    databaseName: "neondb",
    sessionUser: "neondb_owner",
    currentUser: "neondb_owner",
    vocabularyRoles: [],
    vocabularySchemas: [],
    relations: [],
    applicationTypes: [],
    protected: {
      schema_exists: false,
      identity_exists: false,
      metadata_exists: false,
      schema_owner: null,
      owner: null,
      metadataOwner: null,
      identity_count: "0",
      metadata_count: "0",
      identity_id: null,
      metadata_id: null,
      metadata_version: null,
    },
    identities: [],
    ...overrides,
  };
}

function bootstrappedSnapshot(identity: ProductionBootstrapCatalogSnapshot["identities"] = []): ProductionBootstrapCatalogSnapshot {
  return stateSnapshot({
    vocabularyRoles: [ROLE_NAMES.owner, ROLE_NAMES.provision, ROLE_NAMES.migration, ROLE_NAMES.runtime],
    vocabularySchemas: ["drizzle", "vocabflow_app", "vocabflow_meta"],
    relations: ["vocabflow_meta.bootstrap_metadata", "vocabflow_meta.environment_identity"],
    protected: {
      schema_exists: true,
      identity_exists: true,
      metadata_exists: true,
      schema_owner: ROLE_NAMES.owner,
      owner: ROLE_NAMES.owner,
      metadataOwner: ROLE_NAMES.owner,
      identity_count: String(identity.length),
      metadata_count: "1",
      identity_id: identity[0]?.id ?? null,
      metadata_id: 1,
      metadata_version: 1,
    },
    identities: identity,
  });
}

describe("guarded fresh production bootstrap", () => {
  it("keeps the normal development/test bootstrap target selection and refuses production fallback", () => {
    expect(bootstrapTargetForEnvironment("development").branchId).toBe(DATABASE_TARGETS.development.branchId);
    expect(bootstrapTargetForEnvironment("test").branchId).toBe(DATABASE_TARGETS.test.branchId);
    expect(() => bootstrapTargetForEnvironment("production")).toThrow("USE_PRODUCTION_BOOTSTRAP_COMMAND");
    expect(target).toMatchObject({ projectId: "shy-hill-72364426", branchId: branch, databaseName: "neondb", roleName: "neondb_owner" });
  });

  it("requires an explicit target and stays read-only unless apply is explicit", () => {
    expect(parseProductionBootstrapArgs(["--target", "production"]).apply).toBe(false);
    expect(() => authorizeProductionBootstrap(parseProductionBootstrapArgs([]), productionEnvironment))
      .toThrow("PRODUCTION_TARGET_REQUIRED");
    expect(() => authorizeProductionBootstrapApply(parseProductionBootstrapArgs(["--target", "production"]), productionEnvironment))
      .toThrow("PRODUCTION_BOOTSTRAP_APPLY_REQUIRED");
  });

  it("requires exact production and branch confirmations before bootstrap mutation", () => {
    expect(() => authorizeProductionBootstrapApply({ ...completeProductionFlags, confirmTarget: "development" }, productionEnvironment))
      .toThrow("PRODUCTION_TARGET_CONFIRMATION_REQUIRED");
    expect(() => authorizeProductionBootstrapApply({ ...completeProductionFlags, confirmBranch: "wrong-branch" }, productionEnvironment))
      .toThrow("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH");
    expect(authorizeProductionBootstrapApply(completeProductionFlags, productionEnvironment).branchId).toBe(branch);
  });

  it("rejects Vercel runtime context and production reset remains blocked", () => {
    expect(() => authorizeProductionBootstrap(parseProductionBootstrapArgs(["--target", "production"]), {
      ...productionEnvironment,
      EXECUTION_CONTEXT: "vercel-production",
    })).toThrow("PRODUCTION_OPERATOR_CONTEXT_REQUIRED");
    expect(() => assertResetTargetAllowed({ args: [], environment: {
      ...productionEnvironment,
      EXECUTION_CONTEXT: "vercel-production",
    } })).toThrow("DB_RESET_PRODUCTION_BLOCKED");
  });

  it("uses only the one-shot owner URL and requires Neon provider proof", async () => {
    const provider = providerFixture();
    await expect(resolveProductionBootstrapConnection({
      ...productionEnvironment,
      BOOTSTRAP_DATABASE_URL: "postgresql://vocabflow_identity_bootstrap:dev@ep-dev.neon.tech/neondb",
      DATABASE_URL: "postgresql://vocabflow_runtime:runtime@ep-dev.neon.tech/neondb",
      PRODUCTION_DATABASE_URL: roleUrls.PRODUCTION_DATABASE_URL,
      NEON_API_KEY: "fixture-key",
    })).rejects.toThrow("PRODUCTION_BOOTSTRAP_DATABASE_URL_REQUIRED");
    await expect(resolveProductionBootstrapConnection({
      ...productionEnvironment,
      PRODUCTION_DATABASE_URL: roleUrls.PRODUCTION_DATABASE_URL,
      NEON_API_KEY: "fixture-key",
    })).rejects.toThrow("PRODUCTION_BOOTSTRAP_DATABASE_URL_REQUIRED");
    await expect(resolveProductionBootstrapConnection({
      ...productionEnvironment,
      PRODUCTION_BOOTSTRAP_DATABASE_URL: bootstrapUrl,
    })).rejects.toThrow("PRODUCTION_PROVIDER_VERIFICATION_REQUIRED");
    expect(provider.getBranch).not.toHaveBeenCalled();
  });

  it("resolves identity provisioning only from its dedicated operator URL", async () => {
    const provider = providerFixture({ uri: roleUrls.PRODUCTION_IDENTITY_PROVISION_DATABASE_URL });
    await expect(resolveProductionConnection({
      purpose: "identity-provision",
      environment: {
        ...productionEnvironment,
        DATABASE_URL: roleUrls.PRODUCTION_DATABASE_URL,
        PRODUCTION_DATABASE_URL: roleUrls.PRODUCTION_DATABASE_URL,
        NEON_API_KEY: "fixture-key",
      },
      neonApiClient: provider,
    })).rejects.toThrow("PRODUCTION_IDENTITY_PROVISION_DATABASE_URL_REQUIRED");
    expect(provider.getBranch).not.toHaveBeenCalled();

    const result = await resolveProductionConnection({
      purpose: "identity-provision",
      environment: {
        ...productionEnvironment,
        PRODUCTION_IDENTITY_PROVISION_DATABASE_URL: roleUrls.PRODUCTION_IDENTITY_PROVISION_DATABASE_URL,
        NEON_API_KEY: "fixture-key",
      },
      neonApiClient: provider,
    });
    expect(result.target.roleName).toBe("vocabflow_identity_provision");
    expect(provider.getBranch).toHaveBeenCalledOnce();
  });

  it("proves the exact provider project and branch before accepting the bootstrap URL", async () => {
    const wrongProject = providerFixture({ projectId: "other-project" });
    await expect(resolveProductionConnection({
      purpose: "bootstrap",
      environment: { ...productionEnvironment, PRODUCTION_BOOTSTRAP_DATABASE_URL: bootstrapUrl, NEON_API_KEY: "fixture-key" },
      neonApiClient: wrongProject,
    })).rejects.toThrow("PROJECT_NOT_FOUND");
    const wrongBranch = providerFixture({ branchId: "other-branch" });
    await expect(resolveProductionConnection({
      purpose: "bootstrap",
      environment: { ...productionEnvironment, PRODUCTION_BOOTSTRAP_DATABASE_URL: bootstrapUrl, NEON_API_KEY: "fixture-key" },
      neonApiClient: wrongBranch,
    })).rejects.toThrow("BRANCH_NOT_FOUND");
    const correct = providerFixture();
    const result = await resolveProductionConnection({
      purpose: "bootstrap",
      environment: { ...productionEnvironment, PRODUCTION_BOOTSTRAP_DATABASE_URL: bootstrapUrl, NEON_API_KEY: "fixture-key" },
      neonApiClient: correct,
    });
    expect(result.target).toMatchObject({ projectId: "shy-hill-72364426", branchId: branch, databaseName: "neondb", roleName: "neondb_owner" });
    expect(correct.getBranch).toHaveBeenCalledOnce();
    expect(correct.getConnectionUri).toHaveBeenCalledOnce();
  });

  it("requires distinct role credentials whose target matches the one-shot bootstrap connection", () => {
    const fingerprint = { host: "ep-prod-pooler.neon.tech", databaseName: "neondb", roleName: "neondb_owner", pooled: true, expectedRoleName: "neondb_owner" };
    expect(productionBootstrapRoleCredentials(roleUrls, fingerprint)).toMatchObject({
      provision: { roleName: "vocabflow_identity_provision" },
      migration: { roleName: "vocabflow_migration" },
      runtime: { roleName: "vocabflow_runtime" },
    });
    expect(() => productionBootstrapRoleCredentials({
      ...roleUrls,
      PRODUCTION_IDENTITY_PROVISION_DATABASE_URL: "postgresql://vocabflow_identity_provision:secret@ep-wrong-pooler.neon.tech/neondb",
    }, fingerprint)).toThrow("PRODUCTION_BOOTSTRAP_ROLE_TARGET_MISMATCH");
    expect(() => productionBootstrapRoleCredentials({
      PRODUCTION_MIGRATION_DATABASE_URL: roleUrls.PRODUCTION_MIGRATION_DATABASE_URL,
      PRODUCTION_DATABASE_URL: roleUrls.PRODUCTION_DATABASE_URL,
    }, fingerprint)).toThrow("PRODUCTION_IDENTITY_PROVISION_DATABASE_URL_REQUIRED");
  });

  it("fails closed on partial or unexpected VocabFlow roles, schemas, relations, or identity", () => {
    expect(classifyProductionBootstrapState(stateSnapshot(), target, "neondb_owner")).toBe("FRESH");
    expect(() => classifyProductionBootstrapState(stateSnapshot({ vocabularyRoles: [ROLE_NAMES.migration] }), target, "neondb_owner"))
      .toThrow("PRODUCTION_BOOTSTRAP_UNEXPECTED_STATE");
    expect(() => classifyProductionBootstrapState(stateSnapshot({ vocabularySchemas: ["vocabflow_app"] }), target, "neondb_owner"))
      .toThrow("PRODUCTION_BOOTSTRAP_UNEXPECTED_STATE");
    expect(() => classifyProductionBootstrapState(stateSnapshot({ relations: ["drizzle.__drizzle_migrations"] }), target, "neondb_owner"))
      .toThrow("PRODUCTION_BOOTSTRAP_UNEXPECTED_STATE");
    expect(() => classifyProductionBootstrapState(stateSnapshot({ applicationTypes: ["stray_type"] }), target, "neondb_owner"))
      .toThrow("PRODUCTION_BOOTSTRAP_UNEXPECTED_STATE");
    expect(() => classifyProductionBootstrapState(bootstrappedSnapshot([{
      id: 1,
      environment: "development",
      provider: "neon",
      project_id: target.projectId,
      branch_id: target.branchId,
      identity_version: 1,
    }]), target, "neondb_owner")).toThrow("PRODUCTION_BOOTSTRAP_UNEXPECTED_STATE");
    expect(() => classifyProductionBootstrapState(stateSnapshot({ databaseName: "wrong-db" }), target, "neondb_owner"))
      .toThrow("PRODUCTION_BOOTSTRAP_CONNECTION_TARGET_MISMATCH");
  });

  it("allows only the complete canonical bootstrap state as an idempotent retry", () => {
    expect(classifyProductionBootstrapState(bootstrappedSnapshot(), target, "neondb_owner")).toBe("ALREADY_BOOTSTRAPPED");
    expect(classifyProductionBootstrapState(bootstrappedSnapshot([{
      id: 1,
      environment: "production",
      provider: "neon",
      project_id: target.projectId,
      branch_id: target.branchId,
      identity_version: 1,
    }]), target, "neondb_owner")).toBe("ALREADY_BOOTSTRAPPED");
  });

  it("reuses the existing guarded role/schema bootstrap implementation", () => {
    const bootstrapSource = readFileSync(resolve("scripts/db-bootstrap.ts"), "utf8");
    const commandSource = readFileSync(resolve("scripts/db-production-bootstrap.ts"), "utf8");
    expect(commandSource).toContain("bootstrapProtectedMetadata(connection.url");
    expect(bootstrapSource).toContain("assertRoleModel(sql, bootstrapRoleName)");
    expect(bootstrapSource).toContain("withTemporarySetMembership(tx as unknown as SqlTag, ROLE_NAMES.owner");
    expect(bootstrapSource).toContain("requireFreshProductionState");
  });

  it("keeps operator credentials out of Vercel runtime lookup and identity provisioning guarded", () => {
    const runtimeValidation = readFileSync(resolve("scripts/runtime-validation.ts"), "utf8");
    expect(runtimeValidation).toContain("PRODUCTION_BOOTSTRAP_DATABASE_URL");
    expect(runtimeValidation).toContain("configuredProductionOperatorDatabaseUrl");
    expect(configuredDatabaseUrl("vercel-production", "bootstrap")).toBeUndefined();
    expect(configuredDatabaseUrl("vercel-production", "identity-provision")).toBeUndefined();
    expect(configuredDatabaseUrl("vercel-production", "migration")).toBeUndefined();
    expect(configuredDatabaseUrl("vercel-production", "runtime")).toBe(process.env.DATABASE_URL);
    expect(parseIdentityProvisionArgs(["--target", "production"]).apply).toBe(false);
    expect(() => parseIdentityProvisionArgs(["--apply", "--apply"])).toThrow("CLI_ARGUMENT_INVALID");
    expect(safeProductionBootstrapError(new Error(`postgresql://user:password@host/db napi_secret`)))
      .toBe("PRODUCTION_BOOTSTRAP_FAILED");
    expect(safeProductionBootstrapError(new Error("PRODUCTION_TARGET_REQUIRED"))).toBe("PRODUCTION_TARGET_REQUIRED");
    expect(safeProductionBootstrapError(new Error("OWNER_SECRET_TOKEN"))).toBe("PRODUCTION_BOOTSTRAP_FAILED");
  });
});
