import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertCleanReleaseSource,
  assertNoLocalSecretInputFiles,
  assertPinnedProductionToolchain,
  productionBuildDiagnostic,
  productionBuildErrorLines,
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

  it("shows ordinary Error messages in the sanitized diagnostic fields", () => {
    const error = Object.assign(new Error("Unable to inspect the generated artifact"), { code: "EACCES" });
    const lines = productionBuildErrorLines(error, {});
    expect(lines[0]).toBe("PRODUCTION_BUILD_FAILED");
    expect(lines[3]).toBe("PRODUCTION_BUILD_ERROR_MESSAGE=Unable to inspect the generated artifact");
    expect(lines[1]).toBe("PRODUCTION_BUILD_ERROR_CLASS=Error");
    expect(lines[2]).toBe("PRODUCTION_BUILD_ERROR_CODE=EACCES");
  });

  it("redacts PostgreSQL connection URLs from error messages", () => {
    const lines = productionBuildErrorLines(
      new Error("connect failed for postgres://runtime:pw@db.example/neondb and postgresql://other:pw@db2.example/app"),
      {},
    );
    const output = lines.join("\n");
    expect(output).toContain("[REDACTED_DATABASE_URL]");
    expect(output).not.toContain("runtime:pw");
    expect(output).not.toContain("other:pw");
  });

  it("redacts known secret environment values wherever they occur", () => {
    const environment = {
      DATABASE_URL: "postgresql://runtime:fixture-db-secret@db.example/neondb",
      BETTER_AUTH_SECRET: "fixture-auth-secret-value",
    };
    const lines = productionBuildErrorLines(
      new Error(`failed using ${environment.DATABASE_URL}; auth=${environment.BETTER_AUTH_SECRET}`),
      environment,
    );
    const output = lines.join("\n");
    expect(output).not.toContain("fixture-db-secret");
    expect(output).not.toContain(environment.BETTER_AUTH_SECRET);
    expect(output).toContain("[REDACTED]");
  });

  it("redacts API-key-looking values", () => {
    const lines = productionBuildErrorLines(
      new Error("provider rejected napi_synthetic_api_key_value and sk_live_synthetic_key_value_123456"),
      {},
    );
    const output = lines.join("\n");
    expect(output).not.toContain("napi_synthetic_api_key_value");
    expect(output).not.toContain("sk_live_synthetic_key_value_123456");
    expect(output).toContain("[REDACTED_API_KEY]");
  });

  it("preserves uppercase guard tokens unchanged", () => {
    const lines = productionBuildErrorLines(new Error("PRODUCTION_NODE_VERSION_REQUIRED"), {});
    expect(lines[0]).toBe("PRODUCTION_NODE_VERSION_REQUIRED");
    expect(lines[3]).toBe("PRODUCTION_BUILD_ERROR_MESSAGE=PRODUCTION_NODE_VERSION_REQUIRED");
  });

  it("does not mistake an uppercase secret value for a guard token", () => {
    const secret = "UPPERCASE_SECRET_VALUE";
    const lines = productionBuildErrorLines(new Error(secret), { NEON_API_KEY: secret });
    expect(lines[0]).toBe("PRODUCTION_BUILD_FAILED");
    expect(lines.join("\n")).not.toContain(secret);
  });

  it("reports only a sanitized stack location and never serializes the environment or full stack", () => {
    const databaseUrl = "postgresql://runtime:fixture-stack-secret@db.example/neondb";
    const authSecret = "fixture-stack-auth-secret";
    const error = new Error(`request failed with ${databaseUrl} and ${authSecret}`);
    error.stack = [
      `Error: request failed with ${databaseUrl} and ${authSecret}`,
      "    at buildStep (scripts/production-build.ts:84:9)",
      `    at hiddenFrame (${authSecret})`,
      `DATABASE_URL=${databaseUrl}`,
      "UNRELATED_ENV_MARKER=must-not-be-logged",
    ].join("\n");
    const lines = productionBuildErrorLines(error, {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: authSecret,
      UNRELATED_ENV_MARKER: "must-not-be-logged",
    });
    expect(productionBuildDiagnostic(error, {
      DATABASE_URL: databaseUrl,
      BETTER_AUTH_SECRET: authSecret,
      UNRELATED_ENV_MARKER: "must-not-be-logged",
    }).errorLocation).toContain("scripts/production-build.ts:84:9");
    const output = lines.join("\n");
    expect(lines[4]).toContain("scripts/production-build.ts:84:9");
    expect(output).not.toContain(databaseUrl);
    expect(output).not.toContain(authSecret);
    expect(output).not.toContain("hiddenFrame");
    expect(output).not.toContain("UNRELATED_ENV_MARKER");
    expect(output).not.toContain("must-not-be-logged");
  });
});
