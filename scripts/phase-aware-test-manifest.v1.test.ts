import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

type HistoricalBinding = {
  testFile: string;
  originalPhase: string;
  snapshotCommit: string;
  snapshotTree: string;
  testBlob: string;
  packageJsonBlob: string;
  lockfileBlob: string;
  vitestConfigBlob: string;
  expectedExecutionState: string;
  appliesToCurrentHead: boolean;
};

type PhaseManifest = {
  artifactType: string;
  artifactVersion: number;
  status: string;
  executionScopes: {
    originalRootSuite: { command: string; gateStatus: string };
    proposedCurrentApplicable: { command: string; config: string; releaseGateEffect: string };
    historicalPhases: { command: string; runner: string };
  };
  currentStateContracts: Array<{ gate: string; command: string }>;
  historicalTests: HistoricalBinding[];
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifest = JSON.parse(
  readFileSync(path.join(repositoryRoot, "scripts/phase-aware-test-manifest.v1.json"), "utf8"),
) as PhaseManifest;

function listVitestFiles(directory: string, prefix = ""): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", ".git", "e2e", ".vocabflow-local", ".scratch", "vocabflow-dataset", ".vercel"].includes(entry.name)) return [];
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listVitestFiles(path.join(directory, entry.name), relativePath);
    return /\.(?:test|spec)\.(?:ts|tsx)$/u.test(entry.name) ? [relativePath] : [];
  }).sort();
}

describe("phase-aware historical test bindings", () => {
  it("keeps the default mandatory root suite and its fail-closed gate unchanged", () => {
    expect(manifest.executionScopes.originalRootSuite).toEqual({
      command: "pnpm test",
      gateStatus: "UNCHANGED_MANDATORY_FAILS_UNLESS_ALL_CHECKS_PASS",
    });
    expect(manifest.executionScopes.proposedCurrentApplicable.releaseGateEffect).toBe("NONE_PENDING_OWNER_APPROVAL");
  });

  it("binds each predecessor test to a unique immutable commit, tree, and test blob", () => {
    const files = manifest.historicalTests.map(({ testFile }) => testFile);
    expect(new Set(files).size).toBe(files.length);
    expect([...files].sort()).toEqual([
      "scripts/hybrid-100-canary-integrity.test.ts",
      "scripts/hybrid-100-canonical-promote.test.ts",
      "scripts/hybrid-100-cefr-full-owner-approval.test.ts",
      "scripts/hybrid-100-cefr-owner-review-closure.test.ts",
      "scripts/hybrid-100-editorial-draft.test.ts",
      "scripts/hybrid-100-owner-reconciliation-proposal.test.ts",
      "scripts/hybrid-100-rc-final-audit.test.ts",
      "scripts/hybrid-100-release-candidate.test.ts",
      "scripts/hybrid-100-runtime-eligibility-closure.test.ts",
      "scripts/master-vocabulary-v2-pilot.test.ts",
    ]);
    for (const binding of manifest.historicalTests) {
      expect(binding.snapshotCommit).toMatch(/^[a-f0-9]{40}$/u);
      expect(binding.snapshotTree).toMatch(/^[a-f0-9]{40}$/u);
      expect(binding.testBlob).toMatch(/^[a-f0-9]{40}$/u);
      expect(binding.packageJsonBlob).toMatch(/^[a-f0-9]{40}$/u);
      expect(binding.lockfileBlob).toMatch(/^[a-f0-9]{40}$/u);
      expect(binding.vitestConfigBlob).toMatch(/^[a-f0-9]{40}$/u);
      expect(binding.expectedExecutionState).toBe("PASS_AT_PINNED_SNAPSHOT");
      expect(binding.appliesToCurrentHead).toBe(false);
      expect(readFileSync(path.join(repositoryRoot, binding.testFile), "utf8").length).toBeGreaterThan(0);
    }
  });

  it("partitions every root Vitest file into exactly one current or historical scope", () => {
    const allFiles = listVitestFiles(repositoryRoot);
    const historical = new Set(manifest.historicalTests.map(({ testFile }) => testFile));
    const current = allFiles.filter((file) => !historical.has(file));
    expect(historical.size + current.length).toBe(allFiles.length);
    expect([...historical].every((file) => allFiles.includes(file))).toBe(true);
    expect(current.filter((file) => historical.has(file))).toEqual([]);
    expect(allFiles.length).toBeGreaterThan(100);
  });

  it("keeps executable commands for both proposed current and historical scopes", () => {
    expect(manifest.executionScopes.proposedCurrentApplicable.command).toBe("pnpm test:current-phase:proposed");
    expect(manifest.executionScopes.proposedCurrentApplicable.config).toBe("vitest.phase-aware-proposed.config.mts");
    expect(manifest.executionScopes.historicalPhases.command).toContain("pnpm test:historical-phases");
    expect(manifest.executionScopes.historicalPhases.runner).toBe("scripts/run-historical-phase-tests.v1.ts");
    expect(manifest.currentStateContracts.map(({ gate }) => gate)).toEqual([
      "taxonomy 2.0.1, approved releases 2.2.0 and 2.2.1, 286 materialized approval targets, canonical UUID uniqueness and stable identity across releases",
      "CP02 queue, frozen selection, source pins and read-only micro-replay regression",
      "T16 final-partial contract and 29/29 proposals",
      "scanner v2 unit contract",
      "scanner v2 frozen-input deterministic replay",
      "Master Vocabulary V2 dataset integrity",
      "historical identity immutability and promotion collision guard",
    ]);
    expect(manifest.currentStateContracts.every(({ command }) => command.length > 0)).toBe(true);
  });
});
