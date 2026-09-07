import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runBootstrapPreflight, runFullPreflight } from "./db-preflight";

const trackedEnv = [
  "EXECUTION_CONTEXT",
  "VOCABFLOW_ENV",
  "DATABASE_ENV",
  "BOOTSTRAP_DATABASE_URL",
  "NEON_TEST_IDENTITY_PROVISION_DATABASE_URL",
  "NEON_TEST_MIGRATION_DATABASE_URL",
  "NEON_TEST_RUNTIME_DATABASE_URL",
  "NEON_API_KEY",
  "TRUSTED_DB_EXECUTION_STARTED"
];
const originalEnv = new Map(trackedEnv.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of trackedEnv) {
    const value = originalEnv.get(key);
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function setTestMarkers() {
  process.env.EXECUTION_CONTEXT = "ci-test";
  process.env.VOCABFLOW_ENV = "test";
  process.env.DATABASE_ENV = "test";
  process.env.NEON_API_KEY = "test-api-key";
}

describe("trusted DB preflight phases", () => {
  it("bootstrap preflight requires only bootstrap connectivity and provider proof", async () => {
    setTestMarkers();
    process.env.BOOTSTRAP_DATABASE_URL = "postgresql://vocabflow_identity_bootstrap:secret@ep-test-pooler.neon.tech/neondb";
    delete process.env.NEON_TEST_IDENTITY_PROVISION_DATABASE_URL;
    delete process.env.NEON_TEST_MIGRATION_DATABASE_URL;
    delete process.env.NEON_TEST_RUNTIME_DATABASE_URL;
    const calls: string[] = [];

    const result = await runBootstrapPreflight(async (input) => {
      calls.push(input.purpose);
      return {};
    });

    expect(result).toEqual({ status: "PASS", runDb: true });
    expect(calls).toEqual(["bootstrap"]);
  });

  it("fails closed when the bootstrap URL is missing or malformed", async () => {
    setTestMarkers();
    await expect(runBootstrapPreflight(async () => ({}))).rejects.toThrow("BOOTSTRAP_DATABASE_URL_REQUIRED");

    process.env.BOOTSTRAP_DATABASE_URL = "not-a-database-uri";
    await expect(runBootstrapPreflight(async (input) => {
      // Exercise the same pre-connect URL validation used by production code.
      const { assertPreConnect } = await import("./runtime-validation");
      assertPreConnect(input);
      return {};
    })).rejects.toThrow("INVALID_DATABASE_URL");
  });

  it("full preflight verifies post-bootstrap role URLs and no earlier", async () => {
    setTestMarkers();
    delete process.env.BOOTSTRAP_DATABASE_URL;
    process.env.NEON_TEST_IDENTITY_PROVISION_DATABASE_URL = "postgresql://vocabflow_identity_provision:secret@ep-test-pooler.neon.tech/neondb";
    process.env.NEON_TEST_MIGRATION_DATABASE_URL = "postgresql://vocabflow_migration:secret@ep-test-pooler.neon.tech/neondb";
    process.env.NEON_TEST_RUNTIME_DATABASE_URL = "postgresql://vocabflow_runtime:secret@ep-test-pooler.neon.tech/neondb";
    const calls: string[] = [];

    const result = await runFullPreflight(async (input) => {
      calls.push(input.purpose);
      return {};
    });

    expect(result).toEqual({ status: "PASS", runDb: true });
    expect(calls).toEqual(["identity-provision", "integration-test", "runtime"]);
  });

  it("does not skip missing role URLs after bootstrap has started", async () => {
    setTestMarkers();
    process.env.TRUSTED_DB_EXECUTION_STARTED = "true";
    delete process.env.NEON_TEST_MIGRATION_DATABASE_URL;
    await expect(runFullPreflight()).rejects.toThrow("REQUIRED_DATABASE_CONFIGURATION");
  });

  it("keeps full preflight after bootstrap in the canonical workflow", () => {
    const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/trusted-db.yml"), "utf8");
    expect(workflow.indexOf("pnpm db:bootstrap-preflight")).toBeLessThan(workflow.indexOf("run: pnpm db:bootstrap\n"));
    expect(workflow.indexOf("run: pnpm db:bootstrap\n")).toBeLessThan(workflow.indexOf("pnpm db:preflight"));
    expect(workflow.indexOf("pnpm db:preflight")).toBeLessThan(workflow.indexOf("run: pnpm db:identity-provision\n"));
    expect(workflow.indexOf("run: pnpm db:identity-provision\n")).toBeLessThan(workflow.indexOf("run: pnpm test:db\n"));
    expect(workflow).not.toMatch(/run:\s*pnpm db:(?:migrate|reset)\b/);
  });
});
