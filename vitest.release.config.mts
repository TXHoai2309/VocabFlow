import { readFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vitest/config";
// @ts-expect-error Vite bundles this config module and resolves its .mts extension.
import base from "./vitest.config.mts";
const scope = JSON.parse(readFileSync(new URL("./scripts/owner-publication-release-test-scope.json", import.meta.url), "utf8")) as { archivedAuthoringTests: { testFile: string }[] };
export default mergeConfig(base, defineConfig({
  test: {
    pool: "threads",
    maxWorkers: 2,
    testTimeout: 20000,
    exclude: ["**/node_modules/**", "e2e/**", ".vocabflow-local/**", ".scratch/**", "vocabflow-dataset/**", ".vercel/**", ...scope.archivedAuthoringTests.map(x => `**/${x.testFile}`)]
  }
}));
