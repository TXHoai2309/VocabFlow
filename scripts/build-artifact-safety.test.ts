import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildArtifactDigest, inspectBuildArtifact, sanitizeGeneratedSecretFiles } from "./build-artifact-safety";

let temporaryRoot: string | undefined;

afterEach(() => {
  if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

describe("build artifact secret safety", () => {
  it("removes generated dev vars and scans client output without printing values", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "vocabflow-artifact-test-"));
    temporaryRoot = fixtureRoot;
    const root = join(fixtureRoot, "vocabflow");
    const client = join(fixtureRoot, "client");
    mkdirSync(root);
    mkdirSync(client);
    writeFileSync(join(root, ".dev.vars"), "DATABASE_URL=synthetic-only", "utf8");
    writeFileSync(join(root, "wrangler.json"), "{}", "utf8");
    writeFileSync(join(client, "index.html"), "<div>safe</div>", "utf8");
    expect(sanitizeGeneratedSecretFiles(root)).toBe(1);
    expect(() => readFileSync(join(root, ".dev.vars"))).toThrow();
    expect(inspectBuildArtifact(root)).toMatchObject({ safe: true, localEnvironmentFiles: 0 });
    const before = buildArtifactDigest(root);
    writeFileSync(join(client, "index.html"), "<div>changed</div>", "utf8");
    expect(buildArtifactDigest(root)).not.toBe(before);
  });

  it("flags browser-visible secret key names and database credential URLs", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "vocabflow-artifact-test-"));
    temporaryRoot = fixtureRoot;
    const root = join(fixtureRoot, "vocabflow");
    const client = join(fixtureRoot, "client");
    mkdirSync(root);
    mkdirSync(client);
    writeFileSync(join(client, "bundle.js"), 'DATABASE_URL postgresql://user:pass@host/db; "BETTER_AUTH_SECRET":"synthetic-only-secret-value"; napi_syntheticcredential', "utf8");
    const scan = inspectBuildArtifact(root);
    expect(scan.safe).toBe(false);
    expect(scan.clientSecretKeyNameMatches).toBe(1);
    expect(scan.secretValueMatches).toBe(1);
    expect(scan.clientDatabaseCredentialMatches).toBe(1);
    expect(scan.providerCredentialMatches).toBe(1);
  });

  it("blocks built source maps", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "vocabflow-artifact-test-"));
    temporaryRoot = fixtureRoot;
    const root = join(fixtureRoot, "vocabflow");
    const client = join(fixtureRoot, "client");
    mkdirSync(root);
    mkdirSync(client);
    writeFileSync(join(client, "index.html"), "<main></main>", "utf8");
    writeFileSync(join(root, "worker.js.map"), "{}", "utf8");
    expect(inspectBuildArtifact(root)).toMatchObject({ safe: false, sourceMaps: 1 });
  });
});
