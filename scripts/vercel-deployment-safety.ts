import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { buildArtifactDigest, inspectBuildArtifact } from "./build-artifact-safety";
import { parseProductionAuthOrigin } from "../apps/api/src/auth-production-config";

export type VercelDeployTarget = "preview" | "production";

export type LinkedVercelProject = {
  projectId?: unknown;
  orgId?: unknown;
};

export function verifyLinkedVercelProject(input: {
  linkedProject: LinkedVercelProject;
  expectedProjectId?: string;
  expectedOrgId?: string;
}) {
  if (!input.expectedProjectId || !input.expectedOrgId) throw new Error("VERCEL_PROJECT_ID_OWNER_INPUT_REQUIRED");
  if (input.linkedProject.projectId !== input.expectedProjectId || input.linkedProject.orgId !== input.expectedOrgId) {
    throw new Error("VERCEL_LINKED_PROJECT_MISMATCH");
  }
  return { projectId: input.expectedProjectId, orgId: input.expectedOrgId };
}

export function vercelDeployCommandPlan(target: VercelDeployTarget): string[][] {
  const production = target === "production";
  return [
    ["pull", "--yes", `--environment=${target}`],
    ["build", ...(production ? ["--prod"] : [])],
    ["deploy", "--prebuilt", ...(production ? ["--prod"] : []), "--yes"],
  ];
}

function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) return walk(path);
    return entry.isFile() ? [path] : [];
  });
}

function hasExpectedApiFunction(outputRoot: string) {
  const functionsRoot = join(outputRoot, "functions");
  if (!existsSync(functionsRoot) || !lstatSync(functionsRoot).isDirectory()) return false;
  return walk(functionsRoot).some((path) => {
    const relativePath = relative(functionsRoot, path).replaceAll("\\", "/");
    return relativePath.startsWith("api/handler.func/");
  });
}

export function verifyVercelArtifact(input: {
  outputRoot?: string;
  distributionRoot?: string;
  releaseSha: string;
}) {
  const outputRoot = resolve(input.outputRoot ?? ".vercel/output");
  const distributionRoot = resolve(input.distributionRoot ?? "dist");
  const clientRoot = join(distributionRoot, "client");
  const metadataPath = join(distributionRoot, "vocabflow-release-metadata.json");
  if (!existsSync(join(outputRoot, "static", "index.html"))) throw new Error("VERCEL_STATIC_OUTPUT_MISSING");
  if (!hasExpectedApiFunction(outputRoot)) throw new Error("VERCEL_API_FUNCTION_MISSING");
  if (!existsSync(metadataPath)) throw new Error("PRODUCTION_BUILD_METADATA_MISSING");

  const metadata = JSON.parse(readFileSync(metadataPath, "utf8")) as Record<string, unknown>;
  if (metadata.releaseSha !== input.releaseSha || metadata.outputDirectory !== "dist/client") {
    throw new Error("PRODUCTION_ARTIFACT_RELEASE_MISMATCH");
  }
  if (metadata.artifactDigest !== buildArtifactDigest(clientRoot)) {
    throw new Error("PRODUCTION_ARTIFACT_INTEGRITY_MISMATCH");
  }

  const clientScan = inspectBuildArtifact(clientRoot);
  const deployScan = inspectBuildArtifact(outputRoot);
  if (!clientScan.safe || !deployScan.safe) throw new Error("BUILD_ARTIFACT_SECURITY_CHECK_FAILED");
  return {
    clientScan,
    deployScan,
    outputDigest: buildArtifactDigest(outputRoot),
  };
}

export function verifyVercelProductionOrigin(value: string | undefined) {
  return parseProductionAuthOrigin(value);
}
