import { execFileSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { assertCleanReleaseSource, assertNoLocalSecretInputFiles, assertPinnedProductionToolchain } from "./production-build";
import {
  requireVercelToken,
  vercelDeployCommandPlan,
  verifyLinkedVercelProject,
  verifyVercelArtifact,
  verifyVercelProductionOrigin,
  type VercelDeployTarget,
} from "./vercel-deployment-safety";

function currentReleaseSha() {
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  const status = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" });
  return assertCleanReleaseSource({ head, requestedSha: process.env.VOCABFLOW_RELEASE_SHA, status });
}

function currentTarget(): VercelDeployTarget {
  const target = process.argv[2];
  if (target !== "preview" && target !== "production") throw new Error("VERCEL_DEPLOY_TARGET_REQUIRED");
  if (process.argv.length > 3) throw new Error("VERCEL_DEPLOY_ARGUMENTS_NOT_SUPPORTED");
  return target;
}

function verifyLinkedProject() {
  let linkedProject: unknown;
  try {
    linkedProject = JSON.parse(readFileSync(resolve(".vercel", "project.json"), "utf8"));
  } catch {
    throw new Error("VERCEL_PROJECT_LINK_REQUIRED");
  }
  if (typeof linkedProject !== "object" || linkedProject === null) throw new Error("VERCEL_PROJECT_LINK_INVALID");
  verifyLinkedVercelProject({
    linkedProject: linkedProject as { projectId?: unknown; orgId?: unknown },
    expectedProjectId: process.env.VOCABFLOW_VERCEL_PROJECT_ID,
    expectedOrgId: process.env.VOCABFLOW_VERCEL_ORG_ID,
  });
}

type VercelSpawnResult = { error?: Error | null; status: number | null };
type VercelSpawn = (
  command: string,
  args: string[],
  options: { stdio: "inherit"; shell: boolean; env: NodeJS.ProcessEnv },
) => VercelSpawnResult;

export function runVercel(args: string[], spawn: VercelSpawn = spawnSync) {
  const result = spawn("pnpm", ["exec", "vercel", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  if (result.error || result.status !== 0) throw new Error("VERCEL_COMMAND_FAILED");
}

function main() {
  const token = requireVercelToken(process.env.VERCEL_TOKEN);
  assertPinnedProductionToolchain({
    nodeVersion: process.version,
    packageManagerAgent: process.env.npm_config_user_agent,
  });
  const releaseSha = currentReleaseSha();
  const target = currentTarget();
  verifyLinkedProject();
  if (target === "production") verifyVercelProductionOrigin(process.env.BETTER_AUTH_URL);
  assertNoLocalSecretInputFiles(process.cwd());

  const [pull, build, deploy] = vercelDeployCommandPlan(target, token);
  runVercel(pull);
  runVercel(build);
  const artifact = verifyVercelArtifact({ releaseSha });
  runVercel(deploy);
  console.log(`VERCEL_DEPLOY=PASS target=${target}`);
  console.log(`RELEASE_SHA=${releaseSha}`);
  console.log(`VERCEL_OUTPUT_DIGEST=${artifact.outputDigest}`);
  console.log("CLIENT_SECRET_SCAN=PASS");
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/deploy-vercel.ts") || invokedScript.endsWith("/deploy-vercel.js")) {
  try {
    main();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "VERCEL_DEPLOY_FAILED");
    process.exitCode = 1;
  }
}
