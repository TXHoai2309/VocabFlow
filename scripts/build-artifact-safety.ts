import { lstatSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve, sep } from "node:path";

const clientSecretKeyName = /\b(?:DATABASE_URL|DATABASE_MIGRATION_URL|PRODUCTION_DATABASE_URL|PRODUCTION_MIGRATION_DATABASE_URL|NEON_API_KEY|BETTER_AUTH_SECRET|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET|VERCEL_API_TOKEN|VERCEL_TOKEN)\b/i;
const secretKeyAssignment = /["']?\b(?:DATABASE_URL|DATABASE_MIGRATION_URL|PRODUCTION_DATABASE_URL|PRODUCTION_MIGRATION_DATABASE_URL|NEON_API_KEY|BETTER_AUTH_SECRET|CLOUDINARY_API_KEY|CLOUDINARY_API_SECRET|VERCEL_API_TOKEN|VERCEL_TOKEN)\b["']?\s*[:=]\s*["'`]([^"'`]{8,})["'`]/i;
const databaseCredential = /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/i;
const neonCredential = /napi_[A-Za-z0-9_-]{10,}/i;

function walkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) return walkFiles(path);
    return entry.isFile() ? [path] : [];
  });
}

function isDirectory(path: string) {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}

function isInside(directory: string, path: string) {
  const pathFromDirectory = relative(directory, path);
  return pathFromDirectory === "" || (!pathFromDirectory.startsWith(`..${sep}`) && pathFromDirectory !== "..");
}

function isLocalEnvironmentFile(name: string) {
  return name === ".env" || name.startsWith(".env.") || name === ".dev.vars" || name.startsWith(".dev.vars.");
}

function artifactClientRoot(outputRoot: string) {
  const vercelStaticRoot = join(outputRoot, "static");
  return isDirectory(vercelStaticRoot) ? vercelStaticRoot : outputRoot;
}

export function sanitizeGeneratedSecretFiles(outputRoot = resolve("dist", "client")) {
  if (!isDirectory(outputRoot)) throw new Error("BUILD_CLIENT_ARTIFACT_MISSING");
  const removed = walkFiles(outputRoot).filter((path) => isLocalEnvironmentFile(path.split(/[\\/]/).at(-1) ?? ""));
  for (const path of removed) unlinkSync(path);
  return removed.length;
}

export function inspectBuildArtifact(outputRoot = resolve("dist", "client")) {
  if (!isDirectory(outputRoot)) throw new Error("BUILD_ARTIFACT_ROOT_INVALID");
  const files = walkFiles(outputRoot);
  const clientRoot = artifactClientRoot(outputRoot);
  const clientFiles = files.filter((path) => isInside(clientRoot, path));
  const functionsRoot = join(outputRoot, "functions");
  const localEnvironmentFiles = files.filter((path) => isLocalEnvironmentFile(path.split(/[\\/]/).at(-1) ?? ""));
  const sourceMapFiles = files.filter((path) => path.endsWith(".map"));
  const sourceMaps = sourceMapFiles.filter((path) => isInside(clientRoot, path));
  const serverSourceMaps = sourceMapFiles.filter((path) => !isInside(clientRoot, path) && isInside(functionsRoot, path));
  const otherSourceMaps = sourceMapFiles.filter((path) => !isInside(clientRoot, path) && !isInside(functionsRoot, path));
  let clientSecretKeyNameMatches = 0;
  let secretValueMatches = 0;
  let clientDatabaseCredentialMatches = 0;
  let databaseCredentialMatches = 0;
  let providerCredentialMatches = 0;
  for (const path of files) {
    const content = readFileSync(path, "utf8");
    if (secretKeyAssignment.test(content)) secretValueMatches += 1;
    if (databaseCredential.test(content)) databaseCredentialMatches += 1;
    if (neonCredential.test(content)) providerCredentialMatches += 1;
  }
  for (const path of clientFiles) {
    const content = readFileSync(path, "utf8");
    if (databaseCredential.test(content)) clientDatabaseCredentialMatches += 1;
    if (clientSecretKeyName.test(content)) clientSecretKeyNameMatches += 1;
  }
  return {
    localEnvironmentFiles: localEnvironmentFiles.length,
    sourceMaps: sourceMaps.length,
    serverSourceMaps: serverSourceMaps.length,
    otherSourceMaps: otherSourceMaps.length,
    clientSecretKeyNameMatches,
    secretValueMatches,
    clientDatabaseCredentialMatches,
    databaseCredentialMatches,
    providerCredentialMatches,
    safe: localEnvironmentFiles.length === 0 && sourceMaps.length === 0 && otherSourceMaps.length === 0
      && secretValueMatches === 0 && databaseCredentialMatches === 0 && providerCredentialMatches === 0,
  };
}

export function buildArtifactSafetyCounts(scan: ReturnType<typeof inspectBuildArtifact>) {
  return [
    `localEnvironmentFiles=${scan.localEnvironmentFiles}`,
    `sourceMaps=${scan.sourceMaps}`,
    `serverSourceMaps=${scan.serverSourceMaps}`,
    `otherSourceMaps=${scan.otherSourceMaps}`,
    `secretValueMatches=${scan.secretValueMatches}`,
    `databaseCredentialMatches=${scan.databaseCredentialMatches}`,
    `clientDatabaseCredentialMatches=${scan.clientDatabaseCredentialMatches}`,
    `providerCredentialMatches=${scan.providerCredentialMatches}`,
  ].join(" ");
}

export function buildArtifactDigest(outputRoot = resolve("dist", "client")) {
  const files = walkFiles(outputRoot).sort();
  const hash = createHash("sha256");
  for (const path of files) {
    hash.update(relative(outputRoot, path).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}
