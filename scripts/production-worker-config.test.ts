import { describe, expect, it } from "vitest";
import { finalizeProductionWorkerConfig, requireProductionWorkerRoute } from "./production-worker-config";
import { assertCleanReleaseSource, assertNoLocalSecretInputFiles, assertPinnedProductionToolchain, productionBuildEnvironment } from "./production-build";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const input = { authUrl: "https://learn.owner-domain.vn", zoneName: "owner-domain.vn" };

describe("production Worker build configuration", () => {
  it("requires the owner to supply a hostname and Cloudflare zone", () => {
    expect(() => requireProductionWorkerRoute({})).toThrow("PRODUCTION_HOSTNAME_OWNER_INPUT_REQUIRED");
  });

  it("rejects a hostname outside the owner-supplied zone", () => {
    expect(() => requireProductionWorkerRoute({ authUrl: input.authUrl, zoneName: "another-domain.vn" }))
      .toThrow("PRODUCTION_HOSTNAME_ZONE_MISMATCH");
  });

  it("finalizes same-origin API and SPA deployment without enabling workers.dev", () => {
    const result = finalizeProductionWorkerConfig({
      name: "vocabflow",
      assets: { not_found_handling: "single-page-application", run_worker_first: ["/api/*"], directory: "../client" },
      vars: { EXISTING_SAFE_MARKER: "present" },
    }, input);
    expect(result).toMatchObject({
      name: "vocabflow",
      workers_dev: false,
      routes: [{ pattern: "learn.owner-domain.vn/*", zone_name: "owner-domain.vn" }],
      assets: { not_found_handling: "single-page-application", run_worker_first: ["/api/*"] },
      vars: {
        VOCABFLOW_ENV: "production",
        DATABASE_ENV: "production",
        BETTER_AUTH_URL: "https://learn.owner-domain.vn",
        EXISTING_SAFE_MARKER: "present",
      },
    });
  });

  it("requires the pinned Node and pnpm versions and an exact clean release SHA", () => {
    expect(() => assertPinnedProductionToolchain({ nodeVersion: "v22.19.0", packageManagerAgent: "pnpm/11.17.0" }))
      .toThrow("PRODUCTION_NODE_VERSION_REQUIRED");
    expect(() => assertPinnedProductionToolchain({ nodeVersion: "v22.23.2", packageManagerAgent: "pnpm/10.0.0" }))
      .toThrow("PRODUCTION_PNPM_VERSION_REQUIRED");
    expect(() => assertCleanReleaseSource({ head: "a".repeat(40), requestedSha: "a".repeat(40), status: " M file" }))
      .toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
    expect(assertCleanReleaseSource({ head: "a".repeat(40), requestedSha: "a".repeat(40), status: "" }))
      .toBe("a".repeat(40));
  });

  it("refuses local env files and strips credentials from the child production-build environment", () => {
    const root = mkdtempSync(join(tmpdir(), "vocabflow-production-build-"));
    try {
      mkdirSync(join(root, "apps", "web"), { recursive: true });
      writeFileSync(join(root, ".env.example"), "DOCUMENTATION_ONLY=true", "utf8");
      expect(() => assertNoLocalSecretInputFiles(root)).not.toThrow();
      writeFileSync(join(root, "apps", "web", ".env.local"), "LOCAL_ONLY=true", "utf8");
      expect(() => assertNoLocalSecretInputFiles(root)).toThrow("LOCAL_SECRET_INPUT_FILE_PRESENT");
      const childEnvironment = productionBuildEnvironment({
        DATABASE_URL: "fixture-only",
        NEON_API_KEY: "fixture-only",
        BETTER_AUTH_URL: "https://learn.owner-domain.vn",
        VOCABFLOW_RELEASE_SHA: "a".repeat(40),
      });
      expect(childEnvironment).not.toHaveProperty("DATABASE_URL");
      expect(childEnvironment).not.toHaveProperty("NEON_API_KEY");
      expect(childEnvironment.BETTER_AUTH_URL).toBe("https://learn.owner-domain.vn");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
