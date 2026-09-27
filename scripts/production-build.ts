import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildArtifactDigest, inspectBuildArtifact } from "./build-artifact-safety";
import { finalizeProductionWorkerConfig, requireProductionWorkerRoute } from "./production-worker-config";

export function assertPinnedProductionToolchain(input: { nodeVersion: string; packageManagerAgent: string | undefined }) {
  if (input.nodeVersion !== "v22.23.2") throw new Error("PRODUCTION_NODE_VERSION_REQUIRED");
  if (!input.packageManagerAgent?.startsWith("pnpm/11.17.0")) throw new Error("PRODUCTION_PNPM_VERSION_REQUIRED");
}

export function assertCleanReleaseSource(input: { head: string; requestedSha: string | undefined; status: string }) {
  if (!input.requestedSha || !/^[a-f0-9]{40}$/i.test(input.requestedSha)) throw new Error("RELEASE_SHA_REQUIRED");
  if (input.head.toLowerCase() !== input.requestedSha.toLowerCase()) throw new Error("RELEASE_SHA_MISMATCH");
  if (input.status.trim() !== "") throw new Error("RELEASE_SOURCE_TREE_NOT_CLEAN");
  return input.head.toLowerCase();
}

export function assertNoLocalSecretInputFiles(repositoryRoot: string) {
  const roots = [repositoryRoot, join(repositoryRoot, "apps", "web")];
  const found = roots.flatMap((root) => readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() || entry.isSymbolicLink())
    .map((entry) => entry.name)
    .filter((name) => ((name === ".env" || name.startsWith(".env.")) && name !== ".env.example")
      || name === ".dev.vars" || name.startsWith(".dev.vars.")));
  if (found.length > 0) throw new Error("LOCAL_SECRET_INPUT_FILE_PRESENT");
}

export function productionBuildEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized = { ...environment };
  for (const name of Object.keys(sanitized)) {
    if (/^(?:DATABASE_URL|DATABASE_MIGRATION_URL|PRODUCTION_DATABASE_URL|PRODUCTION_MIGRATION_DATABASE_URL|NEON_API_KEY|BETTER_AUTH_SECRET|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET|CLOUDFLARE_API_TOKEN)$/i.test(name)) {
      delete sanitized[name];
    }
  }
  return sanitized;
}

function currentReleaseSha() {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" });
  return assertCleanReleaseSource({ head, requestedSha: process.env.VOCABFLOW_RELEASE_SHA, status });
}

function main() {
  assertPinnedProductionToolchain({
    nodeVersion: process.version,
    packageManagerAgent: process.env.npm_config_user_agent,
  });
  const releaseSha = currentReleaseSha();
  assertNoLocalSecretInputFiles(process.cwd());
  const route = requireProductionWorkerRoute({
    authUrl: process.env.BETTER_AUTH_URL,
    zoneName: process.env.CLOUDFLARE_ZONE_NAME,
  });
  const child = spawnSync("pnpm", ["build"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: {
      ...productionBuildEnvironment(process.env),
      CLOUDFLARE_ENV: "production",
      CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
    },
  });
  if (child.error || child.status !== 0) throw new Error("PRODUCTION_VITE_BUILD_FAILED");

  const outputRoot = resolve("dist", "vocabflow");
  const configPath = resolve(outputRoot, "wrangler.json");
  const parsed = JSON.parse(readFileSync(configPath, "utf8")) as Record<string, unknown>;
  const assets = parsed.assets as Record<string, unknown> | undefined;
  const runWorkerFirst = assets?.run_worker_first;
  if (parsed.name !== "vocabflow" || assets?.not_found_handling !== "single-page-application"
      || assets?.directory !== "../client"
      || !Array.isArray(runWorkerFirst) || !runWorkerFirst.includes("/api/*")) {
    throw new Error("PRODUCTION_WORKER_OUTPUT_CONFIG_INVALID");
  }
  const finalized = finalizeProductionWorkerConfig(parsed, {
    authUrl: route.origin,
    zoneName: route.zoneName,
  });
  writeFileSync(configPath, `${JSON.stringify(finalized, null, 2)}\n`, "utf8");
  const scan = inspectBuildArtifact(outputRoot);
  if (!scan.safe) throw new Error("BUILD_ARTIFACT_SECURITY_CHECK_FAILED");
  const artifactDigest = buildArtifactDigest(outputRoot);
  writeFileSync(resolve(outputRoot, "release-metadata.json"), `${JSON.stringify({
    releaseSha,
    workerName: "vocabflow",
    canonicalOrigin: route.origin,
    zoneName: route.zoneName,
    node: "22.23.2",
    pnpm: "11.17.0",
    artifactDigest,
  }, null, 2)}\n`, "utf8");
  console.log("PRODUCTION_BUILD=PASS");
  console.log(`RELEASE_SHA=${releaseSha}`);
  console.log("LOCAL_DEV_SECRET_ARTIFACT=EXCLUDED");
  console.log("CLIENT_SECRET_SCAN=PASS");
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/production-build.ts") || invokedScript.endsWith("/production-build.js")) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "PRODUCTION_BUILD_FAILED");
    process.exitCode = 1;
  }
}
