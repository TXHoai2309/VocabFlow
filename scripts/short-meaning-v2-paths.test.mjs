import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { repositoryRoot, resolveRepositoryPath, reviewedShortMeaningsArtifact } from "./short-meaning-v2-paths.mjs";

test("short-meaning artifact paths resolve from the current repository", () => {
  const expectedRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  assert.equal(repositoryRoot, expectedRoot);
  assert.equal(reviewedShortMeaningsArtifact, path.join(repositoryRoot, "vocabflow-dataset/artifacts/short-meanings-v2-final-reviewed-v3"));
  assert.equal(resolveRepositoryPath(".vocabflow-local/example"), path.join(repositoryRoot, ".vocabflow-local/example"));
});

test("absolute artifact overrides are preserved", () => {
  const absolute = path.resolve("external-artifact");
  assert.equal(resolveRepositoryPath(absolute), absolute);
});
