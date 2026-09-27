import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildArtifactDigest, inspectBuildArtifact } from "./build-artifact-safety";
import { assertCleanReleaseSource, assertPinnedProductionToolchain } from "./production-build";
import { requireProductionWorkerRoute } from "./production-worker-config";

function main() {
  assertPinnedProductionToolchain({ nodeVersion: process.version, packageManagerAgent: process.env.npm_config_user_agent });
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" });
  const releaseSha = assertCleanReleaseSource({ head, requestedSha: process.env.VOCABFLOW_RELEASE_SHA, status });
  const route = requireProductionWorkerRoute({ authUrl: process.env.BETTER_AUTH_URL, zoneName: process.env.CLOUDFLARE_ZONE_NAME });
  if (!process.env.CLOUDFLARE_ACCOUNT_ID || !process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error("CLOUDFLARE_DEPLOY_CREDENTIALS_REQUIRED");
  }
  const outputRoot = resolve("dist", "vocabflow");
  const metadata = JSON.parse(readFileSync(resolve(outputRoot, "release-metadata.json"), "utf8")) as Record<string, unknown>;
  if (metadata.releaseSha !== releaseSha || metadata.canonicalOrigin !== route.origin || metadata.zoneName !== route.zoneName) {
    throw new Error("PRODUCTION_ARTIFACT_RELEASE_MISMATCH");
  }
  if (metadata.artifactDigest !== buildArtifactDigest(outputRoot)) throw new Error("PRODUCTION_ARTIFACT_INTEGRITY_MISMATCH");
  const config = JSON.parse(readFileSync(resolve(outputRoot, "wrangler.json"), "utf8")) as Record<string, unknown>;
  const vars = config.vars as Record<string, unknown> | undefined;
  const assets = config.assets as Record<string, unknown> | undefined;
  const routes = config.routes as Array<Record<string, unknown>> | undefined;
  const runWorkerFirst = assets?.run_worker_first;
  if (config.name !== "vocabflow" || config.workers_dev !== false
      || assets?.not_found_handling !== "single-page-application"
      || assets?.directory !== "../client"
      || !Array.isArray(runWorkerFirst) || !runWorkerFirst.includes("/api/*")
      || vars?.VOCABFLOW_ENV !== "production" || vars?.DATABASE_ENV !== "production"
      || vars?.BETTER_AUTH_URL !== route.origin
      || routes?.length !== 1 || routes?.[0]?.pattern !== `${route.hostname}/*` || routes?.[0]?.zone_name !== route.zoneName) {
    throw new Error("PRODUCTION_WORKER_OUTPUT_CONFIG_INVALID");
  }
  const scan = inspectBuildArtifact(outputRoot);
  if (!scan.safe) throw new Error("BUILD_ARTIFACT_SECURITY_CHECK_FAILED");
  const deploy = spawnSync("pnpm", ["exec", "wrangler", "deploy", "--config", "dist/vocabflow/wrangler.json"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (deploy.error || deploy.status !== 0) throw new Error("CLOUDFLARE_DEPLOY_FAILED");
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "";
  console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "PRODUCTION_DEPLOY_FAILED");
  process.exitCode = 1;
}
