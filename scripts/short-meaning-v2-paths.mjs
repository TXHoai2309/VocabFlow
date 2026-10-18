import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));

export const repositoryRoot = path.resolve(scriptDirectory, "..");

export function resolveRepositoryPath(value) {
  return path.isAbsolute(value) ? value : path.resolve(repositoryRoot, value);
}

export const reviewedShortMeaningsArtifact = resolveRepositoryPath(
  "vocabflow-dataset/artifacts/short-meanings-v2-final-reviewed-v3"
);
