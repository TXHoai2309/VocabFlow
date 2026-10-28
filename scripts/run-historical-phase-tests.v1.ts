import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
};

type PhaseManifest = {
  artifactType: string;
  artifactVersion: number;
  historicalTests: HistoricalBinding[];
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(repositoryRoot, "scripts/phase-aware-test-manifest.v1.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as PhaseManifest;

function git(args: string[], cwd = repositoryRoot): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

function gitObject(commit: string, file: string): string {
  return git(["rev-parse", `${commit}:${file}`]);
}

function sha256File(file: string): string {
  return createHash("sha256").update(readFileSync(file)).digest("hex");
}

function optionValue(name: string): string | undefined {
  const args = process.argv.filter((argument) => argument !== "--");
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function runPnpm(args: string[], cwd: string): { status: number; output: string } {
  const result = spawnSync("pnpm", args, {
    cwd,
    encoding: "utf8",
    shell: process.platform === "win32",
    env: { ...process.env, CI: "true" },
    maxBuffer: 40 * 1024 * 1024,
  });
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}${result.error ? `\n${result.error.message}` : ""}`,
  };
}

function fail(message: string): never {
  console.error(message);
  process.exitCode = 1;
  throw new Error(message);
}

if (process.version !== "v22.23.2") fail(`NODE_VERSION_MISMATCH: expected v22.23.2, observed ${process.version}`);

const reportDirArgument = optionValue("--report-dir");
const reportDir = reportDirArgument
  ? path.resolve(repositoryRoot, reportDirArgument)
  : mkdtempSync(path.join(os.tmpdir(), "vocabflow-historical-phase-results-v1-"));
if (existsSync(reportDir) && reportDirArgument) fail(`REPORT_DIRECTORY_ALREADY_EXISTS: ${reportDir}`);
mkdirSync(reportDir, { recursive: true });

const scratchRoot = mkdtempSync(path.join(os.tmpdir(), "vocabflow-historical-phase-clones-v1-"));
const reportRows: Array<Record<string, unknown>> = [];
function writeProgress(): void {
  writeFileSync(path.join(reportDir, "historical-phase-progress.v1.json"), `${JSON.stringify({
    artifactType: "VOCABFLOW_HISTORICAL_PHASE_TEST_PROGRESS",
    artifactVersion: 1,
    manifestSha256: sha256File(manifestPath),
    completedRows: reportRows.length,
    expectedRows: manifest.historicalTests.length,
    reportRows,
  }, null, 2)}\n`, "utf8");
}
const grouped = new Map<string, HistoricalBinding[]>();
for (const binding of manifest.historicalTests) {
  const group = grouped.get(binding.snapshotCommit) ?? [];
  group.push(binding);
  grouped.set(binding.snapshotCommit, group);
}

try {
  const pnpmVersion = runPnpm(["--version"], repositoryRoot);
  if (pnpmVersion.status !== 0 || pnpmVersion.output.trim() !== "11.17.0") {
    fail(`PNPM_VERSION_MISMATCH: expected 11.17.0, observed ${pnpmVersion.output.trim()}`);
  }

  let snapshotNumber = 0;
  for (const [commit, bindings] of grouped) {
    snapshotNumber += 1;
    const expectedTree = bindings[0].snapshotTree;
    if (bindings.some((binding) => binding.snapshotTree !== expectedTree)) fail(`TREE_BINDING_MISMATCH: ${commit}`);

    const checkout = path.join(scratchRoot, `snapshot-${String(snapshotNumber).padStart(2, "0")}`);
    const clone = spawnSync("git", ["clone", "--shared", "--no-checkout", repositoryRoot, checkout], {
      cwd: repositoryRoot,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    if (clone.status !== 0) fail(`CLONE_FAILED: ${commit}\n${clone.stderr ?? ""}`);
    execFileSync("git", ["-C", checkout, "config", "core.autocrlf", "false"], { cwd: repositoryRoot });
    execFileSync("git", ["-C", checkout, "checkout", "--detach", commit], { cwd: repositoryRoot, stdio: "pipe" });

    const actualTree = git(["rev-parse", "HEAD^{tree}"], checkout);
    if (actualTree !== expectedTree) fail(`TREE_MISMATCH: ${commit}: expected ${expectedTree}, observed ${actualTree}`);

    for (const binding of bindings) {
      for (const [file, expectedBlob] of [
        [binding.testFile, binding.testBlob],
        ["package.json", binding.packageJsonBlob],
        ["pnpm-lock.yaml", binding.lockfileBlob],
        ["vitest.config.mts", binding.vitestConfigBlob],
      ] as const) {
        const actualBlob = gitObject(commit, file);
        if (actualBlob !== expectedBlob) fail(`ARTIFACT_BLOB_MISMATCH: ${commit}:${file}`);
      }
    }

    const install = runPnpm(["install", "--frozen-lockfile", "--ignore-scripts", "--reporter=append-only"], checkout);
    const installLogName = `snapshot-${String(snapshotNumber).padStart(2, "0")}-install.log`;
    writeFileSync(path.join(reportDir, installLogName), install.output, "utf8");
    if (install.status !== 0) {
      for (const binding of bindings) reportRows.push({
        testFile: binding.testFile,
        originalPhase: binding.originalPhase,
        snapshotCommit: commit,
        snapshotTree: expectedTree,
        status: "BLOCKED_WITH_REASON",
        reason: "FROZEN_LOCKFILE_INSTALL_FAILED",
        installLog: installLogName,
        exitCode: install.status,
      });
      writeProgress();
      continue;
    }

    for (const binding of bindings) {
      const caseName = binding.testFile.replaceAll(/[\\/]/gu, "__").replaceAll(/[^A-Za-z0-9_.-]/gu, "_");
      const vitestJsonName = `${caseName}.vitest.json`;
      const vitestJsonPath = path.join(reportDir, vitestJsonName);
      const vitestCli = path.join(checkout, "node_modules", "vitest", "vitest.mjs");
      const result = spawnSync(process.execPath, [
        vitestCli,
        "run",
        "--pool=threads",
        "--maxWorkers=1",
        "--no-file-parallelism",
        binding.testFile,
        "--reporter=json",
        `--outputFile=${vitestJsonPath}`,
      ], { cwd: checkout, encoding: "utf8", maxBuffer: 40 * 1024 * 1024, timeout: 300_000 });
      const logName = `${caseName}.log`;
      writeFileSync(path.join(reportDir, logName), `${result.stdout ?? ""}${result.stderr ?? ""}`, "utf8");
      const jsonAvailable = existsSync(vitestJsonPath);
      const vitestJson = jsonAvailable ? JSON.parse(readFileSync(vitestJsonPath, "utf8")) as {
        numTotalTests?: number;
        numPassedTests?: number;
        numFailedTests?: number;
        numPendingTests?: number;
        testResults?: Array<{
          name?: string;
          status?: string;
          message?: string;
          assertionResults?: Array<{ fullName?: string; status?: string; failureMessages?: string[] }>;
        }>;
      } : {};
      const suiteSetupFailure = (vitestJson.numTotalTests ?? 0) === 0
        && (vitestJson.testResults ?? []).some((testResult) => testResult.status === "failed");
      const status = result.status === 0
        ? "PASS"
        : result.error?.name === "TimeoutError" || suiteSetupFailure
          ? "BLOCKED_WITH_REASON"
          : "FAIL";
      const suiteFailureMessages = (vitestJson.testResults ?? [])
        .filter((testResult) => testResult.status === "failed")
        .map((testResult) => ({ name: testResult.name, message: testResult.message }));
      const assertionFailures = (vitestJson.testResults ?? []).flatMap((testResult) =>
        (testResult.assertionResults ?? [])
          .filter((assertion) => assertion.status === "failed")
          .map((assertion) => ({
            test: assertion.fullName,
            failureMessages: assertion.failureMessages ?? [],
          })),
      );
      const dirtyAfterTest = git(["status", "--porcelain", "--untracked-files=all"], checkout);
      reportRows.push({
        testFile: binding.testFile,
        originalPhase: binding.originalPhase,
        snapshotCommit: commit,
        snapshotTree: expectedTree,
        testBlob: binding.testBlob,
        lockfileBlob: binding.lockfileBlob,
        status,
        reason: result.error
          ? `${result.error.name}: ${result.error.message}`
          : suiteSetupFailure
            ? "VITEST_SETUP_FAILED_BEFORE_ASSERTIONS"
            : undefined,
        suiteFailureMessages,
        assertionFailures,
        exitCode: result.status,
        tests: {
          total: vitestJson.numTotalTests ?? null,
          passed: vitestJson.numPassedTests ?? null,
          failed: vitestJson.numFailedTests ?? null,
          skipped: vitestJson.numPendingTests ?? null,
        },
        vitestJson: jsonAvailable ? vitestJsonName : null,
        log: logName,
        checkoutAfterTest: dirtyAfterTest ? "DIRTY" : "CLEAN",
        checkoutDiff: dirtyAfterTest || null,
        testBlobSha256: sha256File(path.join(checkout, binding.testFile)),
      });
      writeProgress();
    }
  }
} finally {
  rmSync(scratchRoot, { recursive: true, force: true });
}

const resultSummary = {
  artifactType: "VOCABFLOW_HISTORICAL_PHASE_TEST_RESULTS",
  artifactVersion: 1,
  environment: {
    node: process.version,
    nodeExecutable: process.execPath,
    pnpm: "11.17.0",
    vitest: "5.0.0",
    platform: `${process.platform}-${process.arch}`,
  },
  manifestSha256: sha256File(manifestPath),
  reportRows,
};
const outputPath = path.join(reportDir, "historical-phase-results.v1.json");
writeFileSync(outputPath, `${JSON.stringify(resultSummary, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: outputPath, counts: reportRows.reduce<Record<string, number>>((counts, row) => {
  const status = String(row.status);
  counts[status] = (counts[status] ?? 0) + 1;
  return counts;
}, {}) }, null, 2));
if (reportRows.some((row) => row.status !== "PASS")) process.exitCode = 1;
