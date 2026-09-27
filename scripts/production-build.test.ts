import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  assertProductionBuildReleaseSource,
  assertCleanReleaseSource,
  assertNoLocalSecretInputFiles,
  assertPinnedProductionToolchain,
  assertTrackedSourceUnmodified,
  productionBuildDiagnostic,
  productionBuildErrorLines,
  productionBuildEnvironment,
  resolveProductionBuildReleaseSha,
  vercelJsonMutationDiagnosticLines,
} from "./production-build";

function runGitFixtureCommand(root: string, args: string[]) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) throw new Error("GIT_FIXTURE_SETUP_FAILED");
  return result.stdout;
}

function trackedSourceFixture() {
  const root = mkdtempSync(join(tmpdir(), "vocabflow-tracked-source-"));
  mkdirSync(join(root, "src"), { recursive: true });
  mkdirSync(join(root, "apps", "web"), { recursive: true });
  writeFileSync(join(root, "src", "lesson.ts"), "export const lesson = 'baseline';\n", "utf8");
  writeFileSync(join(root, "vercel.json"), '{"buildCommand":"pnpm build:production"}\n', "utf8");
  runGitFixtureCommand(root, ["init", "--quiet"]);
  runGitFixtureCommand(root, ["config", "user.name", "VocabFlow Test"]);
  runGitFixtureCommand(root, ["config", "user.email", "vocabflow-test@example.invalid"]);
  runGitFixtureCommand(root, ["add", "src/lesson.ts", "vercel.json"]);
  runGitFixtureCommand(root, ["commit", "--quiet", "-m", "test fixture"]);
  return root;
}

function fixtureGitDiffQuiet(root: string, args: string[]) {
  const result = spawnSync("git", args, { cwd: root, stdio: "ignore", windowsHide: true });
  if (result.error) throw result.error;
  return result.status;
}

function fixtureGitDiffNames(root: string, args: string[]) {
  const result = spawnSync("git", [...args, "-z"], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 128 * 1024,
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) return null;
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

function fixtureGitStatus(root: string) {
  const result = spawnSync("git", ["status", "--porcelain", "--untracked-files=all"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  if (result.error || result.status !== 0 || typeof result.stdout !== "string") throw new Error("GIT_FIXTURE_SETUP_FAILED");
  return result.stdout;
}

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
      writeFileSync(join(root, ".env"), "DATABASE_URL=fixture-only", "utf8");
      writeFileSync(join(root, ".env.preview"), "BETTER_AUTH_SECRET=fixture-only", "utf8");
      writeFileSync(join(root, ".dev.vars"), "SECRET=fixture-only", "utf8");
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

  it("avoids the overflowing status command for a Vercel workspace with over 1 MiB of untracked paths", () => {
    const sha = "a".repeat(40);
    const simulatedStatusOutput = Array.from({ length: 12_000 }, (_, index) =>
      `?? generated/${String(index).padStart(5, "0")}-${"x".repeat(100)}`).join("\r\n");
    expect(Buffer.byteLength(simulatedStatusOutput)).toBeGreaterThan(1024 * 1024);
    const readLocalStatus = vi.fn(() => { throw new Error("spawnSync git ENOBUFS"); });
    const checkTrackedSource = vi.fn();

    expect(assertProductionBuildReleaseSource({
      head: sha,
      environment: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: sha },
      readLocalStatus,
      assertTrackedSourceUnmodified: checkTrackedSource,
    })).toBe(sha);
    expect(readLocalStatus).not.toHaveBeenCalled();
    expect(checkTrackedSource).toHaveBeenCalledOnce();
  });

  it("does not enumerate Vercel-generated or install artifacts on a Production Git build", () => {
    const sha = "b".repeat(40);
    const generatedArtifacts = [
      ".vercel/output/config.json",
      "node_modules/.pnpm/generated-install-metadata.json",
      "dist/client/index.html",
    ];
    const readLocalStatus = vi.fn(() => {
      throw new Error(`status serialized ${generatedArtifacts.length} generated artifact paths`);
    });

    expect(assertProductionBuildReleaseSource({
      head: sha,
      environment: { VERCEL_ENV: "production", VERCEL_GIT_COMMIT_SHA: sha },
      readLocalStatus,
      assertTrackedSourceUnmodified: () => undefined,
    })).toBe(sha);
    expect(readLocalStatus).not.toHaveBeenCalled();
  });

  it("blocks actual unstaged tracked changes and reports only bounded filename diagnostics", () => {
    const root = trackedSourceFixture();
    const filenameSecret = "synthetic-secret-path-value";
    const changedContent = "SOURCE_CONTENT_MUST_NEVER_BE_PRINTED";
    const secretPath = join(root, "src", `${filenameSecret}.ts`);
    writeFileSync(secretPath, "baseline\n", "utf8");
    runGitFixtureCommand(root, ["add", "src"]);
    runGitFixtureCommand(root, ["commit", "--quiet", "-m", "add fixture filename"]);
    writeFileSync(secretPath, `${changedContent}\n`, "utf8");
    const diagnostics: string[] = [];

    try {
      expect(() => assertTrackedSourceUnmodified(
        (args) => fixtureGitDiffQuiet(root, args),
        (args) => fixtureGitDiffNames(root, args),
        (line) => diagnostics.push(line),
        { VOCABFLOW_API_KEY: filenameSecret },
      )).toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
      expect(diagnostics).toEqual([
        'RELEASE_SOURCE_DIRTY_UNSTAGED_FILES=["src/[REDACTED].ts"]',
        "RELEASE_SOURCE_DIRTY_STAGED_FILES=[]",
      ]);
      const output = diagnostics.join("\n");
      expect(output).not.toContain(filenameSecret);
      expect(output).not.toContain(changedContent);
      expect(output).not.toContain("baseline");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("blocks a real local vercel.json edit under the local full-clean-tree policy", () => {
    const root = trackedSourceFixture();
    const sha = "9".repeat(40);
    try {
      writeFileSync(join(root, "vercel.json"), '{"buildCommand":"pnpm build:production","rewrites":[]}\n', "utf8");
      expect(() => assertProductionBuildReleaseSource({
        head: sha,
        environment: { VOCABFLOW_RELEASE_SHA: sha },
        readLocalStatus: () => fixtureGitStatus(root),
        assertTrackedSourceUnmodified: () => undefined,
      })).toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("blocks arbitrary tracked application edits in both local and Vercel release modes", () => {
    const root = trackedSourceFixture();
    const sha = "8".repeat(40);
    try {
      writeFileSync(join(root, "src", "lesson.ts"), "export const lesson = 'modified';\n", "utf8");
      expect(() => assertProductionBuildReleaseSource({
        head: sha,
        environment: { VOCABFLOW_RELEASE_SHA: sha },
        readLocalStatus: () => fixtureGitStatus(root),
        assertTrackedSourceUnmodified: () => undefined,
      })).toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
      expect(() => assertTrackedSourceUnmodified(
        (args) => fixtureGitDiffQuiet(root, args),
        (args) => fixtureGitDiffNames(root, args),
        () => undefined,
        {},
      )).toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("reports only bounded vercel.json identity metadata and keeps an unproven transform blocked", () => {
    const root = trackedSourceFixture();
    const platformSecret = "SYNTHETIC_PLATFORM_CONFIG_SECRET_VALUE";
    const modifiedConfig = `{"buildCommand":"${platformSecret}"}\r\n`;
    const environment = { BETTER_AUTH_SECRET: platformSecret };
    const diagnostics: string[] = [];
    try {
      writeFileSync(join(root, "vercel.json"), modifiedConfig, "utf8");
      expect(() => assertTrackedSourceUnmodified(
        (args) => fixtureGitDiffQuiet(root, args),
        (args) => fixtureGitDiffNames(root, args),
        (line) => diagnostics.push(line),
        environment,
        () => vercelJsonMutationDiagnosticLines(root, environment),
      )).toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");

      expect(diagnostics[0]).toBe('RELEASE_SOURCE_DIRTY_UNSTAGED_FILES=["vercel.json"]');
      expect(diagnostics[1]).toBe("RELEASE_SOURCE_DIRTY_STAGED_FILES=[]");
      expect(diagnostics).toContainEqual(expect.stringMatching(/^VERCEL_JSON_HEAD_BLOB_ID=[a-f0-9]{40,64}$/));
      const headHash = diagnostics.find((line) => line.startsWith("VERCEL_JSON_HEAD_HASH="));
      const worktreeHash = diagnostics.find((line) => line.startsWith("VERCEL_JSON_WORKTREE_HASH="));
      expect(headHash).toMatch(/^VERCEL_JSON_HEAD_HASH=[a-f0-9]{64}$/);
      expect(worktreeHash).toMatch(/^VERCEL_JSON_WORKTREE_HASH=[a-f0-9]{64}$/);
      expect(headHash).not.toBe(worktreeHash);
      expect(diagnostics).toContain(`VERCEL_JSON_HEAD_SIZE=${Buffer.byteLength('{"buildCommand":"pnpm build:production"}\n')}`);
      expect(diagnostics).toContain(`VERCEL_JSON_WORKTREE_SIZE=${Buffer.byteLength(modifiedConfig)}`);
      expect(diagnostics).toContain("VERCEL_JSON_HEAD_LINE_ENDINGS=LF_ONLY");
      expect(diagnostics).toContain("VERCEL_JSON_WORKTREE_LINE_ENDINGS=CRLF_ONLY");
      expect(diagnostics).toContain("VERCEL_JSON_WORKTREE_FINAL_NEWLINE=YES");
      expect(diagnostics.some((line) => line.startsWith("VERCEL_JSON_DIFF_NUMSTAT=") && line.includes("vercel.json"))).toBe(true);
      const output = diagnostics.join("\n");
      expect(output).not.toContain(platformSecret);
      expect(output).not.toContain(modifiedConfig);

      writeFileSync(join(root, "vercel.json"), modifiedConfig.trimEnd(), "utf8");
      expect(vercelJsonMutationDiagnosticLines(root, environment)).toContain("VERCEL_JSON_WORKTREE_LINE_ENDINGS=NONE");
      expect(vercelJsonMutationDiagnosticLines(root, environment)).toContain("VERCEL_JSON_WORKTREE_FINAL_NEWLINE=NO");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("blocks actual staged tracked changes and names only the staged file", () => {
    const root = trackedSourceFixture();
    const diagnostics: string[] = [];
    try {
      writeFileSync(join(root, "src", "lesson.ts"), "export const lesson = 'staged';\n", "utf8");
      runGitFixtureCommand(root, ["add", "src/lesson.ts"]);
      expect(() => assertTrackedSourceUnmodified(
        (args) => fixtureGitDiffQuiet(root, args),
        (args) => fixtureGitDiffNames(root, args),
        (line) => diagnostics.push(line),
      )).toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
      expect(diagnostics).toEqual([
        "RELEASE_SOURCE_DIRTY_UNSTAGED_FILES=[]",
        'RELEASE_SOURCE_DIRTY_STAGED_FILES=["src/lesson.ts"]',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("caps diagnostic filename count and per-path length", () => {
    const diagnostics: string[] = [];
    expect(() => assertTrackedSourceUnmodified(
      () => 1,
      () => Array.from({ length: 25 }, (_, index) => `generated/${index}-${"x".repeat(300)}`),
      (line) => diagnostics.push(line),
      {},
    )).toThrow("RELEASE_SOURCE_TREE_NOT_CLEAN");
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics[0]).toContain("additional paths omitted");
    expect(diagnostics.every((line) => line.length < 6000)).toBe(true);
    expect(diagnostics.join("\n")).not.toContain("x".repeat(241));
  });

  it("allows Vercel install/build-style untracked outputs without a false dirty-source failure", () => {
    const root = trackedSourceFixture();
    const diagnostics: string[] = [];
    try {
      mkdirSync(join(root, ".vercel", "output"), { recursive: true });
      mkdirSync(join(root, "node_modules", ".pnpm"), { recursive: true });
      mkdirSync(join(root, "dist", "client"), { recursive: true });
      writeFileSync(join(root, ".vercel", "output", "config.json"), "{}", "utf8");
      writeFileSync(join(root, "node_modules", ".pnpm", "install-metadata.json"), "{}", "utf8");
      writeFileSync(join(root, "dist", "client", "index.html"), "<main />", "utf8");
      expect(() => assertTrackedSourceUnmodified(
        (args) => fixtureGitDiffQuiet(root, args),
        (args) => fixtureGitDiffNames(root, args),
        (line) => diagnostics.push(line),
      )).not.toThrow();
      expect(diagnostics).toEqual([]);

      writeFileSync(join(root, ".env.preview"), "SYNTHETIC_SECRET_CONTENT", "utf8");
      expect(() => assertNoLocalSecretInputFiles(root)).toThrow("LOCAL_SECRET_INPUT_FILE_PRESENT");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("uses a matching Vercel Git SHA without a per-commit release-SHA variable", () => {
    const sha = "c".repeat(40);
    expect(resolveProductionBuildReleaseSha({
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: sha,
      VOCABFLOW_RELEASE_SHA: "d".repeat(40),
    })).toBe(sha);
    expect(assertProductionBuildReleaseSource({
      head: sha,
      environment: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: sha },
      readLocalStatus: () => { throw new Error("Vercel status must not be enumerated"); },
      assertTrackedSourceUnmodified: () => undefined,
    })).toBe(sha);
  });

  it("blocks a Vercel Git SHA that does not match HEAD", () => {
    expect(() => assertProductionBuildReleaseSource({
      head: "e".repeat(40),
      environment: { VERCEL_ENV: "preview", VERCEL_GIT_COMMIT_SHA: "f".repeat(40) },
      readLocalStatus: () => "",
      assertTrackedSourceUnmodified: () => undefined,
    })).toThrow("RELEASE_SHA_MISMATCH");
  });

  it("preserves the explicit local release-SHA requirement and mismatch guard", () => {
    const head = "1".repeat(40);
    expect(assertProductionBuildReleaseSource({
      head,
      environment: { VOCABFLOW_RELEASE_SHA: head },
      readLocalStatus: () => "",
      assertTrackedSourceUnmodified: () => undefined,
    })).toBe(head);
    expect(() => assertProductionBuildReleaseSource({
      head,
      environment: { VOCABFLOW_RELEASE_SHA: "2".repeat(40) },
      readLocalStatus: () => "",
      assertTrackedSourceUnmodified: () => undefined,
    })).toThrow("RELEASE_SHA_MISMATCH");
  });

  it("fails closed when no valid Vercel or explicit release SHA is available", () => {
    const readLocalStatus = vi.fn(() => "");
    expect(() => assertProductionBuildReleaseSource({
      head: "3".repeat(40),
      environment: { VERCEL_ENV: "development", VERCEL_GIT_COMMIT_SHA: "4".repeat(40) },
      readLocalStatus,
      assertTrackedSourceUnmodified: () => undefined,
    })).toThrow("RELEASE_SHA_REQUIRED");
    expect(readLocalStatus).not.toHaveBeenCalled();
    expect(() => resolveProductionBuildReleaseSha({
      VERCEL_ENV: "preview",
      VERCEL_GIT_COMMIT_SHA: "not-a-full-commit-sha",
    })).toThrow("VERCEL_GIT_COMMIT_SHA_INVALID");
  });
});
