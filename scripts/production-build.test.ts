import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCleanReleaseSource,
  assertNoLocalSecretInputFiles,
  assertPinnedProductionToolchain,
  productionBuildEnvironment,
} from "./production-build";

describe("Vercel production build safety", () => {
  it("requires the pinned Node and pnpm toolchain", () => {
    expect(() => assertPinnedProductionToolchain({ nodeVersion: "v22.19.0", packageManagerAgent: "pnpm/11.17.0" }))
      .toThrow("PRODUCTION_NODE_VERSION_REQUIRED");
    expect(() => assertPinnedProductionToolchain({ nodeVersion: "v22.23.2", packageManagerAgent: "pnpm/10.0.0" }))
      .toThrow("PRODUCTION_PNPM_VERSION_REQUIRED");
    expect(() => assertPinnedProductionToolchain({ nodeVersion: "v22.23.2", packageManagerAgent: "pnpm/11.17.0 node/v22.23.2" }))
      .not.toThrow();
  });

  it("requires a full matching SHA and a completely clean checkout", () => {
    const sha = "a".repeat(40);
    expect(() => assertCleanReleaseSource({ head: sha, requestedSha: undefined, status: "" }))
      .toThrow("RELEASE_SHA_REQUIRED");
    expect(() => assertCleanReleaseSource({ head: sha, requestedSha: "b".repeat(40), status: "" }))
      .toThrow("RELEASE_SHA_MISMATCH");
    expect(() => assertCleanReleaseSource({ head: sha, requestedSha: sha, status: "?? local.txt" }))
      .toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
    expect(assertCleanReleaseSource({ head: sha, requestedSha: sha, status: "" })).toBe(sha);
  });

  it("blocks local secret input files but permits the tracked example template", () => {
    const root = mkdtempSync(join(tmpdir(), "vocabflow-build-safety-"));
    try {
      mkdirSync(join(root, "apps", "web"), { recursive: true });
      writeFileSync(join(root, ".env.example"), "DOCUMENTATION_ONLY=true", "utf8");
      expect(() => assertNoLocalSecretInputFiles(root)).not.toThrow();
      writeFileSync(join(root, "apps", "web", ".dev.vars.preview"), "LOCAL_ONLY=true", "utf8");
      expect(() => assertNoLocalSecretInputFiles(root)).toThrow("LOCAL_SECRET_INPUT_FILE_PRESENT");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("filters server and Vercel deployment credentials from the static-build child environment", () => {
    const childEnvironment = productionBuildEnvironment({
      DATABASE_URL: "fixture-only",
      DATABASE_MIGRATION_URL: "fixture-only",
      PRODUCTION_DATABASE_URL: "fixture-only",
      PRODUCTION_MIGRATION_DATABASE_URL: "fixture-only",
      NEON_API_KEY: "fixture-only",
      BETTER_AUTH_SECRET: "fixture-only",
      CLOUDINARY_API_SECRET: "fixture-only",
      CLOUDINARY_API_KEY: "fixture-only",
      VERCEL_API_TOKEN: "fixture-only",
      VERCEL_TOKEN: "fixture-only",
      VOCABFLOW_VERCEL_PROJECT_ID: "non-secret-project-id",
      BETTER_AUTH_URL: "https://vocabflow.vercel.app",
      VOCABFLOW_RELEASE_SHA: "a".repeat(40),
    });
    for (const name of [
      "DATABASE_URL", "DATABASE_MIGRATION_URL", "PRODUCTION_DATABASE_URL",
      "PRODUCTION_MIGRATION_DATABASE_URL", "NEON_API_KEY", "BETTER_AUTH_SECRET",
      "CLOUDINARY_API_SECRET", "CLOUDINARY_API_KEY", "VERCEL_API_TOKEN", "VERCEL_TOKEN",
      "VOCABFLOW_VERCEL_PROJECT_ID",
    ]) expect(childEnvironment).not.toHaveProperty(name);
    expect(childEnvironment.BETTER_AUTH_URL).toBe("https://vocabflow.vercel.app");
    expect(childEnvironment.VOCABFLOW_RELEASE_SHA).toBe("a".repeat(40));
  });
});
