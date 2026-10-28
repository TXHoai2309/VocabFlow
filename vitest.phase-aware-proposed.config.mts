import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig, mergeConfig } from "vitest/config";
// @ts-expect-error Vite bundles this config module and resolves its .mts extension.
import baseConfig from "./vitest.config.mts";

type PhaseManifest = {
  historicalTests: Array<{ testFile: string }>;
};

const repositoryRoot = path.dirname(fileURLToPath(import.meta.url));
const manifest = JSON.parse(
  readFileSync(path.join(repositoryRoot, "scripts/phase-aware-test-manifest.v1.json"), "utf8"),
) as PhaseManifest;

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      exclude: [
        "**/node_modules/**",
        "node_modules",
        "e2e",
        ...manifest.historicalTests.map(({ testFile }) => `**/${testFile}`),
      ],
    },
  }),
);
