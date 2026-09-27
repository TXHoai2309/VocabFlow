import { lstatSync, readdirSync, readFileSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { join, relative, resolve } from "node:path";

const clientSecretKeyName = /\b(?:DATABASE_URL|DATABASE_MIGRATION_URL|PRODUCTION_DATABASE_URL|PRODUCTION_MIGRATION_DATABASE_URL|NEON_API_KEY|BETTER_AUTH_SECRET|CLOUDINARY_API_SECRET)\b/i;
const secretKeyAssignment = /["']?\b(?:DATABASE_URL|DATABASE_MIGRATION_URL|PRODUCTION_DATABASE_URL|PRODUCTION_MIGRATION_DATABASE_URL|NEON_API_KEY|BETTER_AUTH_SECRET|CLOUDINARY_API_SECRET)\b["']?\s*[:=]\s*["'`]([^"'`]{8,})["'`]/i;
const databaseCredential = /postgres(?:ql)?:\/\/[^\s"'`]+:[^\s"'`]+@/i;
const neonCredential = /napi_[A-Za-z0-9_-]{10,}/i;

function walkFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) return walkFiles(path);
    return entry.isFile() ? [path] : [];
  });
}

function isLocalEnvironmentFile(name: string) {
  return name === ".env" || name.startsWith(".env.") || name === ".dev.vars" || name.startsWith(".dev.vars.");
}

export function sanitizeGeneratedSecretFiles(outputRoot = resolve("dist", "vocabflow")) {
  if (!lstatSync(outputRoot).isDirectory()) throw new Error("BUILD_ARTIFACT_ROOT_INVALID");
  const clientRoot = resolve(outputRoot, "..", "client");
  const roots = [outputRoot, ...(existsDirectory(clientRoot) ? [clientRoot] : [])];
  const removed = roots.flatMap(walkFiles).filter((path) => isLocalEnvironmentFile(path.split(/[\\/]/).at(-1) ?? ""));
  for (const path of removed) unlinkSync(path);
  return removed.length;
}

export function inspectBuildArtifact(outputRoot = resolve("dist", "vocabflow")) {
  const clientRoot = resolve(outputRoot, "..", "client");
  if (!lstatSync(clientRoot).isDirectory()) throw new Error("BUILD_CLIENT_ARTIFACT_MISSING");
  const files = [...walkFiles(outputRoot), ...walkFiles(clientRoot)];
  const localEnvironmentFiles = files.filter((path) => isLocalEnvironmentFile(path.split(/[\\/]/).at(-1) ?? ""));
  const sourceMaps = files.filter((path) => path.endsWith(".map"));
  let clientSecretKeyNameMatches = 0;
  let secretValueMatches = 0;
  let clientDatabaseCredentialMatches = 0;
  let providerCredentialMatches = 0;
  for (const path of files) {
    const content = readFileSync(path, "utf8");
    if (secretKeyAssignment.test(content)) secretValueMatches += 1;
    if (databaseCredential.test(content) && path.startsWith(clientRoot)) clientDatabaseCredentialMatches += 1;
    if (neonCredential.test(content)) providerCredentialMatches += 1;
    if (path.startsWith(clientRoot) && clientSecretKeyName.test(content)) clientSecretKeyNameMatches += 1;
  }
  return {
    localEnvironmentFiles: localEnvironmentFiles.length,
    sourceMaps: sourceMaps.length,
    clientSecretKeyNameMatches,
    secretValueMatches,
    clientDatabaseCredentialMatches,
    providerCredentialMatches,
    safe: localEnvironmentFiles.length === 0 && sourceMaps.length === 0
      && secretValueMatches === 0 && clientDatabaseCredentialMatches === 0 && providerCredentialMatches === 0,
  };
}

export function buildArtifactDigest(outputRoot = resolve("dist", "vocabflow")) {
  const clientRoot = resolve(outputRoot, "..", "client");
  const artifactRoot = resolve(outputRoot, "..");
  const files = [...walkFiles(outputRoot), ...walkFiles(clientRoot)]
    .filter((path) => path !== join(outputRoot, "release-metadata.json"))
    .sort();
  const hash = createHash("sha256");
  for (const path of files) {
    hash.update(relative(artifactRoot, path).replaceAll("\\", "/"));
    hash.update("\0");
    hash.update(readFileSync(path));
    hash.update("\0");
  }
  return hash.digest("hex");
}

function existsDirectory(path: string) {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}
