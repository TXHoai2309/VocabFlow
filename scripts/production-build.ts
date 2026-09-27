import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildArtifactDigest, inspectBuildArtifact } from "./build-artifact-safety";

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

const buildOnlyOrServerSecret = /^(?:DATABASE_URL|DATABASE_MIGRATION_URL|PRODUCTION_DATABASE_URL|PRODUCTION_MIGRATION_DATABASE_URL|NEON_API_KEY|BETTER_AUTH_SECRET|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET|VERCEL_API_TOKEN|VERCEL_TOKEN|VERCEL_ORG_ID|VERCEL_PROJECT_ID|VOCABFLOW_VERCEL_ORG_ID|VOCABFLOW_VERCEL_PROJECT_ID)$/i;

const sensitiveEnvironmentName = /(?:^|_)DATABASE(?:_[A-Z0-9]+)*_URL$|(?:^|_)(?:[A-Z0-9]+_)*(?:SECRET|TOKEN|API_KEY|PASSWORD|PRIVATE_KEY|CREDENTIALS?)$/i;
const databaseUrl = /postgres(?:ql)?:\/\/[^\s"'`<>]+/gi;
const labeledCredential = /((?:[A-Z][A-Z0-9_]*_)?(?:DATABASE(?:_[A-Z0-9]+)*_URL|[A-Z][A-Z0-9_]*(?:SECRET|TOKEN|API_KEY|PASSWORD|PRIVATE_KEY|CREDENTIALS?)|api[_ -]?key|api[_ -]?secret|token|password|secret)\s*[=:]\s*)["']?[^\s,;}'"]+/gi;
const apiKeyLikeValue = /\b(?:napi_[A-Za-z0-9_-]+|sk_(?:live|test)_[A-Za-z0-9_-]{8,}|sk-[A-Za-z0-9_-]{16,}|gh[pousr]_[A-Za-z0-9_]{16,}|xox[baprs]-[A-Za-z0-9-]{10,})\b/gi;
const bearerCredential = /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi;

export type ProductionBuildDiagnostic = {
  errorClass: string;
  errorCode: string;
  errorMessage: string;
  errorLocation: string;
};

function knownSecretValues(environment: NodeJS.ProcessEnv) {
  return Object.entries(environment)
    .filter(([name, value]) => sensitiveEnvironmentName.test(name) && Boolean(value))
    .map(([, value]) => value as string)
    .sort((left, right) => right.length - left.length);
}

function sanitizeDiagnosticText(value: string, secrets: readonly string[]) {
  let sanitized = value;
  for (const secret of secrets) sanitized = sanitized.replaceAll(secret, "[REDACTED]");
  return sanitized
    .replace(databaseUrl, "[REDACTED_DATABASE_URL]")
    .replace(apiKeyLikeValue, "[REDACTED_API_KEY]")
    .replace(bearerCredential, "Bearer [REDACTED]")
    .replace(labeledCredential, "$1[REDACTED]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 1000);
}

function firstStackLocation(stack: string | undefined, secrets: readonly string[]) {
  const frame = stack?.split(/\r?\n/).slice(1).find((line) => /^\s*at\s/.test(line));
  return frame ? sanitizeDiagnosticText(frame.trim(), secrets).slice(0, 300) : "UNKNOWN";
}

export function productionBuildDiagnostic(error: unknown, environment: NodeJS.ProcessEnv = process.env): ProductionBuildDiagnostic {
  const secrets = knownSecretValues(environment);
  if (!(error instanceof Error)) {
    return {
      errorClass: "NonErrorThrown",
      errorCode: "NONE",
      errorMessage: "Non-Error value thrown (not serialized)",
      errorLocation: "UNKNOWN",
    };
  }

  const errorCode = "code" in error && typeof error.code === "string" ? error.code : "NONE";
  return {
    errorClass: sanitizeDiagnosticText(error.name || "Error", secrets) || "Error",
    errorCode: sanitizeDiagnosticText(errorCode, secrets) || "NONE",
    errorMessage: sanitizeDiagnosticText(error.message || "Error without a message", secrets) || "Error without a message",
    errorLocation: firstStackLocation(error.stack, secrets),
  };
}

export function productionBuildErrorLines(error: unknown, environment: NodeJS.ProcessEnv = process.env) {
  const diagnostic = productionBuildDiagnostic(error, environment);
  const failureToken = /^[A-Z][A-Z0-9_]{2,79}$/.test(diagnostic.errorMessage)
    ? diagnostic.errorMessage
    : "PRODUCTION_BUILD_FAILED";
  return [
    failureToken,
    `PRODUCTION_BUILD_ERROR_CLASS=${diagnostic.errorClass}`,
    `PRODUCTION_BUILD_ERROR_CODE=${diagnostic.errorCode}`,
    `PRODUCTION_BUILD_ERROR_MESSAGE=${diagnostic.errorMessage}`,
    `PRODUCTION_BUILD_ERROR_LOCATION=${diagnostic.errorLocation}`,
  ];
}

export function productionBuildEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized = { ...environment };
  for (const name of Object.keys(sanitized)) {
    if (buildOnlyOrServerSecret.test(name)) delete sanitized[name];
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
  const child = spawnSync("pnpm", ["build"], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: productionBuildEnvironment(process.env),
  });
  if (child.error || child.status !== 0) throw new Error("PRODUCTION_VITE_BUILD_FAILED");

  const outputRoot = resolve("dist", "client");
  const scan = inspectBuildArtifact(outputRoot);
  if (!scan.safe) throw new Error("BUILD_ARTIFACT_SECURITY_CHECK_FAILED");
  const artifactDigest = buildArtifactDigest(outputRoot);
  writeFileSync(resolve("dist", "vocabflow-release-metadata.json"), `${JSON.stringify({
    releaseSha,
    node: "22.23.2",
    pnpm: "11.17.0",
    outputDirectory: "dist/client",
    artifactDigest,
  }, null, 2)}\n`, "utf8");
  console.log("PRODUCTION_BUILD=PASS");
  console.log(`RELEASE_SHA=${releaseSha}`);
  console.log("LOCAL_DEV_SECRET_ARTIFACT=EXCLUDED");
  console.log(`CLIENT_SECRET_SCAN=PASS key_name_hits=${scan.clientSecretKeyNameMatches} value_hits=${scan.secretValueMatches}`);
  console.log("BUILD_SOURCE_MAP_SCAN=PASS");
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/production-build.ts") || invokedScript.endsWith("/production-build.js")) {
  try {
    main();
  } catch (error) {
    for (const line of productionBuildErrorLines(error)) console.error(line);
    process.exitCode = 1;
  }
}
