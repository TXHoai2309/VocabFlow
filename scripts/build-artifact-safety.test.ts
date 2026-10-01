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

function createArtifact() {
  temporaryRoot = mkdtempSync(join(tmpdir(), "vocabflow-vercel-artifact-test-"));
  return temporaryRoot;
}

describe("Vercel build artifact secret safety", () => {
  it("removes generated environment files and hashes the static client output", () => {
    const artifact = createArtifact();
    writeFileSync(join(artifact, ".dev.vars"), "DATABASE_URL=synthetic-only", "utf8");
    writeFileSync(join(artifact, ".env.example"), "DOCUMENTATION_ONLY=true", "utf8");
    writeFileSync(join(artifact, "index.html"), "<div>safe</div>", "utf8");

    expect(sanitizeGeneratedSecretFiles(artifact)).toBe(2);
    expect(() => readFileSync(join(artifact, ".dev.vars"))).toThrow();
    expect(inspectBuildArtifact(artifact)).toMatchObject({ safe: true, localEnvironmentFiles: 0 });
    const before = buildArtifactDigest(artifact);
    writeFileSync(join(artifact, "index.html"), "<div>changed</div>", "utf8");
    expect(buildArtifactDigest(artifact)).not.toBe(before);
  });

  it("scans static output for browser secrets without printing values", () => {
    const artifact = createArtifact();
    writeFileSync(join(artifact, "bundle.js"), 'DATABASE_URL postgresql://user:pass@host/db; "BETTER_AUTH_SECRET":"synthetic-only-secret-value"; napi_syntheticcredential', "utf8");

    const scan = inspectBuildArtifact(artifact);
    expect(scan.safe).toBe(false);
    expect(scan.clientSecretKeyNameMatches).toBe(1);
    expect(scan.secretValueMatches).toBe(1);
    expect(scan.clientDatabaseCredentialMatches).toBe(1);
    expect(scan.providerCredentialMatches).toBe(1);
  });

  it("allows harmless source maps only in Vercel function output", () => {
    const artifact = createArtifact();
    const staticRoot = join(artifact, "static");
    const functionRoot = join(artifact, "functions", "api", "handler.func");
    mkdirSync(staticRoot, { recursive: true });
    mkdirSync(functionRoot, { recursive: true });
    writeFileSync(join(staticRoot, "index.html"), "<main>safe</main>", "utf8");
    writeFileSync(join(functionRoot, "index.js"), "export default () => new Response('ok')", "utf8");
    writeFileSync(join(functionRoot, "index.js.map"), '{"version":3,"sources":[],"mappings":""}', "utf8");

    expect(inspectBuildArtifact(artifact)).toMatchObject({ safe: true, sourceMaps: 0, serverSourceMaps: 1 });
  });

  it("forbids source maps in Vercel public static output", () => {
    const artifact = createArtifact();
    const staticRoot = join(artifact, "static");
    mkdirSync(staticRoot, { recursive: true });
    writeFileSync(join(staticRoot, "index.html"), "<main>safe</main>", "utf8");
    writeFileSync(join(staticRoot, "app.js.map"), '{"version":3,"sources":[],"mappings":""}', "utf8");

    expect(inspectBuildArtifact(artifact)).toMatchObject({ safe: false, sourceMaps: 1, serverSourceMaps: 0 });
  });

  it("forbids source maps in the ordinary dist/client output", () => {
    const artifact = createArtifact();
    const clientRoot = join(artifact, "dist", "client");
    mkdirSync(clientRoot, { recursive: true });
    writeFileSync(join(clientRoot, "index.html"), "<main>safe</main>", "utf8");
    writeFileSync(join(clientRoot, "app.js.map"), '{"version":3,"sources":[],"mappings":""}', "utf8");

    expect(inspectBuildArtifact(clientRoot)).toMatchObject({ safe: false, sourceMaps: 1, serverSourceMaps: 0 });
  });

  it("scans private function source maps for credential assignments and provider credentials", () => {
    const artifact = createArtifact();
    const staticRoot = join(artifact, "static");
    const functionRoot = join(artifact, "functions", "api", "handler.func");
    mkdirSync(staticRoot, { recursive: true });
    mkdirSync(functionRoot, { recursive: true });
    writeFileSync(join(staticRoot, "index.html"), "<main>safe</main>", "utf8");
    writeFileSync(join(functionRoot, "index.js.map"),
      'DATABASE_URL="postgresql://user:synthetic-password@db.example.test/app"; napi_syntheticcredentialvalue', "utf8");

    expect(inspectBuildArtifact(artifact)).toMatchObject({
      safe: false,
      sourceMaps: 0,
      serverSourceMaps: 1,
      secretValueMatches: 1,
      databaseCredentialMatches: 1,
      providerCredentialMatches: 1,
    });
  });

  it("scans both Vercel function and static artifact files for env files", () => {
    const artifact = createArtifact();
    const staticRoot = join(artifact, "static");
    const functionRoot = join(artifact, "functions", "api", "[...route].func");
    mkdirSync(staticRoot, { recursive: true });
    mkdirSync(functionRoot, { recursive: true });
    writeFileSync(join(staticRoot, "index.html"), "<main>safe</main>", "utf8");
    writeFileSync(join(functionRoot, "index.js"), "export default () => new Response('ok')", "utf8");
    writeFileSync(join(functionRoot, ".env.production"), "BETTER_AUTH_SECRET=synthetic-only", "utf8");
    writeFileSync(join(functionRoot, "index.js.map"), "{}", "utf8");

    expect(inspectBuildArtifact(artifact)).toMatchObject({
      safe: false,
      localEnvironmentFiles: 1,
      sourceMaps: 0,
      serverSourceMaps: 1,
    });
    expect(sanitizeGeneratedSecretFiles(artifact)).toBe(1);
    expect(() => readFileSync(join(functionRoot, ".env.production"))).toThrow();
  });
});
