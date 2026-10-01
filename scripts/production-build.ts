import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { lstatSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
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

type ReleaseShaEnvironment = {
  VERCEL_ENV?: string;
  VERCEL_GIT_COMMIT_SHA?: string;
  VOCABFLOW_RELEASE_SHA?: string;
};

function isVercelGitEnvironment(environment: ReleaseShaEnvironment) {
  return (environment.VERCEL_ENV === "preview" || environment.VERCEL_ENV === "production")
    && Boolean(environment.VERCEL_GIT_COMMIT_SHA?.trim());
}

export function resolveProductionBuildReleaseSha(environment: ReleaseShaEnvironment) {
  if (isVercelGitEnvironment(environment)) {
    const vercelSha = environment.VERCEL_GIT_COMMIT_SHA;
    if (!vercelSha || !/^[a-f0-9]{40}$/i.test(vercelSha)) {
      throw new Error("VERCEL_GIT_COMMIT_SHA_INVALID");
    }
    return vercelSha;
  }
  return environment.VOCABFLOW_RELEASE_SHA;
}

function gitDiffQuietExitCode(args: string[]) {
  const result = spawnSync("git", args, { stdio: "ignore" });
  if (result.error) throw result.error;
  return result.status;
}

const MAX_TRACKED_SOURCE_DIAGNOSTIC_FILES = 20;
const MAX_TRACKED_SOURCE_DIAGNOSTIC_PATH_LENGTH = 240;

function gitDiffNameOnly(args: string[]) {
  const result = spawnSync("git", [...args, "-z"], { encoding: "buffer", maxBuffer: 128 * 1024 });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) return null;
  return result.stdout.toString("utf8").split("\0").filter(Boolean);
}

function safeTrackedSourceDiagnosticPath(path: string, environment: NodeJS.ProcessEnv) {
  return sanitizeDiagnosticText(path, knownSecretValues(environment))
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "?")
    .slice(0, MAX_TRACKED_SOURCE_DIAGNOSTIC_PATH_LENGTH);
}

function trackedSourceDiagnosticLine(label: string, paths: string[] | null, environment: NodeJS.ProcessEnv) {
  if (paths === null) return `RELEASE_SOURCE_DIRTY_${label}=UNAVAILABLE`;
  const safePaths = paths.map((path) => safeTrackedSourceDiagnosticPath(path, environment));
  const shownPaths = safePaths.slice(0, MAX_TRACKED_SOURCE_DIAGNOSTIC_FILES);
  if (safePaths.length > MAX_TRACKED_SOURCE_DIAGNOSTIC_FILES) {
    shownPaths.push(`[${safePaths.length - MAX_TRACKED_SOURCE_DIAGNOSTIC_FILES} additional paths omitted]`);
  }
  return `RELEASE_SOURCE_DIRTY_${label}=${JSON.stringify(shownPaths)}`;
}

const MAX_VERCEL_JSON_DIAGNOSTIC_BYTES = 16 * 1024;
const MAX_VERCEL_JSON_GIT_DIAGNOSTIC_LENGTH = 300;
const MAX_VERCEL_JSON_DIFF_BUFFER_BYTES = 64 * 1024;
const MAX_VERCEL_JSON_SERIALIZED_DIFF_LENGTH = 3975;

type VercelJsonFileIdentity = {
  size: number;
  sha256: string;
  lineEndings: "LF_ONLY" | "CRLF_ONLY" | "MIXED" | "NONE";
  finalNewline: "YES" | "NO";
};

function boundedGitOutput(root: string, args: string[], maxBuffer = 1024) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8", maxBuffer });
  if (result.error || result.status !== 0 || typeof result.stdout !== "string") return null;
  return result.stdout.trim();
}

function gitVercelJsonBlob(root: string) {
  const result = spawnSync("git", ["show", "HEAD:vercel.json"], {
    cwd: root,
    encoding: "buffer",
    maxBuffer: MAX_VERCEL_JSON_DIAGNOSTIC_BYTES,
  });
  if (result.error || result.status !== 0 || !Buffer.isBuffer(result.stdout)) return null;
  return result.stdout;
}

function vercelJsonFileIdentity(contents: Buffer): VercelJsonFileIdentity {
  let lineFeedCount = 0;
  let carriageReturnLineFeedCount = 0;
  for (let index = 0; index < contents.length; index += 1) {
    if (contents[index] === 0x0a) {
      lineFeedCount += 1;
      if (index > 0 && contents[index - 1] === 0x0d) carriageReturnLineFeedCount += 1;
    }
  }
  const bareLineFeedCount = lineFeedCount - carriageReturnLineFeedCount;
  const lineEndings = lineFeedCount === 0
    ? "NONE"
    : bareLineFeedCount > 0 && carriageReturnLineFeedCount > 0
      ? "MIXED"
      : carriageReturnLineFeedCount > 0
        ? "CRLF_ONLY"
        : "LF_ONLY";
  return {
    size: contents.length,
    sha256: createHash("sha256").update(contents).digest("hex"),
    lineEndings,
    finalNewline: contents.length > 0 && contents[contents.length - 1] === 0x0a ? "YES" : "NO",
  };
}

function identityDiagnosticLines(prefix: "HEAD" | "WORKTREE", identity: VercelJsonFileIdentity | null, size?: number) {
  if (!identity) {
    return [
      `VERCEL_JSON_${prefix}_SIZE=${size ?? "UNAVAILABLE"}`,
      `VERCEL_JSON_${prefix}_HASH=UNAVAILABLE`,
      `VERCEL_JSON_${prefix}_LINE_ENDINGS=UNAVAILABLE`,
      `VERCEL_JSON_${prefix}_FINAL_NEWLINE=UNAVAILABLE`,
    ];
  }
  return [
    `VERCEL_JSON_${prefix}_SIZE=${identity.size}`,
    `VERCEL_JSON_${prefix}_HASH=${identity.sha256}`,
    `VERCEL_JSON_${prefix}_LINE_ENDINGS=${identity.lineEndings}`,
    `VERCEL_JSON_${prefix}_FINAL_NEWLINE=${identity.finalNewline}`,
  ];
}

function safeVercelJsonDiffMetadata(value: string | null, environment: NodeJS.ProcessEnv) {
  if (value === null || value.length === 0) return "NONE";
  return sanitizeDiagnosticText(value, knownSecretValues(environment))
    .replace(/[\x00-\x1F\x7F-\x9F]/g, "?")
    .slice(0, MAX_VERCEL_JSON_GIT_DIAGNOSTIC_LENGTH);
}

function canonicalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value !== null && typeof value === "object") {
    const sortedEntries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
      .map(([key, child]) => [key, canonicalizeJson(child)] as const);
    return Object.fromEntries(sortedEntries);
  }
  return value;
}

export function vercelJsonSemanticDiagnosticLines(
  headText: string | null,
  worktreeText: string | null,
  environment: NodeJS.ProcessEnv = process.env,
) {
  if (headText === null || worktreeText === null) {
    return [
      "VERCEL_JSON_SEMANTIC_EQUAL=NO",
      "VERCEL_JSON_PARSE_ERROR=CONTENT_UNAVAILABLE",
      "VERCEL_JSON_PARSE_ERROR_MESSAGE=One or both bounded JSON inputs were unavailable.",
    ];
  }

  const parse = (label: "HEAD" | "WORKTREE", text: string) => {
    try {
      return { value: JSON.parse(text) as unknown, errorLines: [] as string[] };
    } catch (error) {
      const errorName = error instanceof Error ? error.name : "NonErrorThrown";
      const errorMessage = error instanceof Error ? error.message : "JSON parse failed.";
      return {
        value: undefined,
        errorLines: [
          `VERCEL_JSON_PARSE_ERROR=${label}_${errorName.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 60)}`,
          `VERCEL_JSON_PARSE_ERROR_MESSAGE=${sanitizeDiagnosticText(errorMessage, knownSecretValues(environment)).slice(0, 200)}`,
        ],
      };
    }
  };

  const parsedHead = parse("HEAD", headText);
  const parsedWorktree = parse("WORKTREE", worktreeText);
  if (parsedHead.errorLines.length > 0 || parsedWorktree.errorLines.length > 0) {
    return ["VERCEL_JSON_SEMANTIC_EQUAL=NO", ...parsedHead.errorLines, ...parsedWorktree.errorLines];
  }
  const headCanonical = JSON.stringify(canonicalizeJson(parsedHead.value));
  const worktreeCanonical = JSON.stringify(canonicalizeJson(parsedWorktree.value));
  return [`VERCEL_JSON_SEMANTIC_EQUAL=${headCanonical === worktreeCanonical ? "YES" : "NO"}`];
}

function redactSensitiveDiagnosticText(value: string, secrets: readonly string[]) {
  let sanitized = value;
  for (const secret of secrets) sanitized = sanitized.replaceAll(secret, "[REDACTED]");
  return sanitized
    .replace(databaseUrl, "[REDACTED_DATABASE_URL]")
    .replace(apiKeyLikeValue, "[REDACTED_API_KEY]")
    .replace(bearerCredential, "Bearer [REDACTED]")
    .replace(labeledCredential, "$1[REDACTED]");
}

function sanitizeVercelJsonDiff(diff: string, environment: NodeJS.ProcessEnv) {
  const sensitiveJsonProperty = /("(?:[^"\\]|\\.)*(?:secret|token|api[_-]?key|password|credential|private[_-]?key|database(?:[_-]?[a-z0-9]+)*[_-]?url)(?:[^"\\]|\\.)*"\s*:\s*)("(?:\\.|[^"\\])*"|[^,\r\n}\]]+)/gi;
  return redactSensitiveDiagnosticText(diff, knownSecretValues(environment))
    .replace(sensitiveJsonProperty, '$1"[REDACTED]"')
    .replace(/\r\n?/g, "\n")
    .replace(/\x1b(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, "?");
}

function boundedVercelJsonDiffLine(diff: string | null, environment: NodeJS.ProcessEnv) {
  const value = diff === null ? "DIFF_UNAVAILABLE_OUTPUT_LIMIT" : sanitizeVercelJsonDiff(diff, environment);
  const marker = "\n[TRUNCATED]";
  let serialized = JSON.stringify(value);
  if (serialized.length > MAX_VERCEL_JSON_SERIALIZED_DIFF_LENGTH) {
    let low = 0;
    let high = value.length;
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      if (JSON.stringify(`${value.slice(0, middle)}${marker}`).length <= MAX_VERCEL_JSON_SERIALIZED_DIFF_LENGTH) low = middle;
      else high = middle - 1;
    }
    serialized = JSON.stringify(`${value.slice(0, low)}${marker}`);
  }
  return `VERCEL_JSON_BOUNDED_DIFF=${serialized}`;
}

function readVercelJsonDiff(root: string) {
  const result = spawnSync("git", ["diff", "--no-ext-diff", "--unified=1", "--", "vercel.json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: MAX_VERCEL_JSON_DIFF_BUFFER_BYTES,
  });
  if (result.error || result.status !== 0 || typeof result.stdout !== "string") return null;
  return result.stdout;
}

export function vercelJsonMutationDiagnosticLines(
  repositoryRoot = process.cwd(),
  environment: NodeJS.ProcessEnv = process.env,
) {
  const headBlobId = boundedGitOutput(repositoryRoot, ["rev-parse", "HEAD:vercel.json"]);
  const headContents = gitVercelJsonBlob(repositoryRoot);
  let worktreeContents: Buffer | null = null;
  let worktreeSize: number | undefined;
  try {
    const path = join(repositoryRoot, "vercel.json");
    const stats = lstatSync(path);
    worktreeSize = stats.size;
    if (stats.isFile() && !stats.isSymbolicLink() && stats.size <= MAX_VERCEL_JSON_DIAGNOSTIC_BYTES) {
      worktreeContents = readFileSync(path);
    }
  } catch {
    worktreeContents = null;
  }

  const headSizeText = boundedGitOutput(repositoryRoot, ["cat-file", "-s", "HEAD:vercel.json"]);
  const headSize = headSizeText && /^\d+$/.test(headSizeText) ? Number(headSizeText) : undefined;
  const numstat = boundedGitOutput(repositoryRoot, ["diff", "--numstat", "--", "vercel.json"]);
  const summary = boundedGitOutput(repositoryRoot, ["diff", "--summary", "--", "vercel.json"]);
  const worktreeText = worktreeContents?.toString("utf8") ?? null;
  return [
    `VERCEL_JSON_HEAD_BLOB_ID=${headBlobId && /^[a-f0-9]{40,64}$/i.test(headBlobId) ? headBlobId : "UNAVAILABLE"}`,
    ...identityDiagnosticLines("HEAD", headContents ? vercelJsonFileIdentity(headContents) : null, headSize),
    ...identityDiagnosticLines("WORKTREE", worktreeContents ? vercelJsonFileIdentity(worktreeContents) : null, worktreeSize),
    ...vercelJsonSemanticDiagnosticLines(headContents?.toString("utf8") ?? null, worktreeText, environment),
    `VERCEL_JSON_DIFF_NUMSTAT=${safeVercelJsonDiffMetadata(numstat, environment)}`,
    `VERCEL_JSON_DIFF_SUMMARY=${safeVercelJsonDiffMetadata(summary, environment)}`,
    boundedVercelJsonDiffLine(readVercelJsonDiff(repositoryRoot), environment),
  ];
}

export function assertTrackedSourceUnmodified(
  runGitDiffQuiet: (args: string[]) => number | null = gitDiffQuietExitCode,
  readGitDiffNames: (args: string[]) => string[] | null = gitDiffNameOnly,
  writeDiagnostic: (line: string) => void = (line) => console.error(line),
  environment: NodeJS.ProcessEnv = process.env,
  readVercelJsonDiagnostics: () => string[] = () => vercelJsonMutationDiagnosticLines(process.cwd(), environment),
) {
  const unstagedStatus = runGitDiffQuiet(["diff", "--quiet"]);
  const stagedStatus = runGitDiffQuiet(["diff", "--cached", "--quiet"]);
  if (![unstagedStatus, stagedStatus].every((status) => status === 0 || status === 1)) {
    throw new Error("GIT_TRACKED_SOURCE_CHECK_FAILED");
  }
  if (unstagedStatus === 1 || stagedStatus === 1) {
    const unstagedPaths = readGitDiffNames(["diff", "--name-only"]);
    const stagedPaths = readGitDiffNames(["diff", "--cached", "--name-only"]);
    writeDiagnostic(trackedSourceDiagnosticLine("UNSTAGED_FILES", unstagedPaths, environment));
    writeDiagnostic(trackedSourceDiagnosticLine("STAGED_FILES", stagedPaths, environment));
    if (unstagedPaths?.includes("vercel.json") || stagedPaths?.includes("vercel.json")) {
      const vercelJsonDiagnostics = readVercelJsonDiagnostics();
      for (const line of vercelJsonDiagnostics) writeDiagnostic(line);
      const onlyUnstagedVercelJson = unstagedStatus === 1
        && stagedStatus === 0
        && unstagedPaths?.length === 1
        && unstagedPaths[0] === "vercel.json"
        && stagedPaths?.length === 0;
      if (onlyUnstagedVercelJson && vercelJsonDiagnostics.includes("VERCEL_JSON_SEMANTIC_EQUAL=YES")) {
        writeDiagnostic("VERCEL_JSON_FORMAT_ONLY_MUTATION_ACCEPTED=YES");
        writeDiagnostic("RELEASE_SOURCE_EFFECTIVE_DIRTY_UNSTAGED_FILES=[]");
        return;
      }
    }
    throw new Error("RELEASE_SOURCE_TREE_NOT_CLEAN");
  }
}

export function assertProductionBuildReleaseSource(input: {
  head: string;
  environment: ReleaseShaEnvironment;
  readLocalStatus: () => string;
  assertTrackedSourceUnmodified: () => void;
}) {
  const requestedSha = resolveProductionBuildReleaseSha(input.environment);
  const releaseSha = assertCleanReleaseSource({ head: input.head, requestedSha, status: "" });
  if (isVercelGitEnvironment(input.environment)) {
    input.assertTrackedSourceUnmodified();
    return releaseSha;
  }
  return assertCleanReleaseSource({
    head: input.head,
    requestedSha: releaseSha,
    status: input.readLocalStatus(),
  });
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
  return redactSensitiveDiagnosticText(value, secrets)
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
  const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8", maxBuffer: 1024 }).trim();
  return assertProductionBuildReleaseSource({
    head,
    environment: process.env,
    readLocalStatus: () => execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { encoding: "utf8" }),
    assertTrackedSourceUnmodified: () => assertTrackedSourceUnmodified(),
  });
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
