import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  assertCanaryRepositoryState,
  CANARY_GIT_TREE_SHA,
  CANARY_RELATIVE_PATH,
  computeCanaryCommittedTreeFingerprint,
  LAST_CANARY_COMMIT,
  PHASE_2F7_BASELINE_COMMIT,
  SUPERSEDED_DIRTY_WORKTREE_FINGERPRINT,
} from "./hybrid-100-canary-integrity";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATASET_ROOT = path.join(REPO_ROOT, "vocabflow-dataset");
const APPROVED_RELEASE_WORKSPACE = path.join(DATASET_ROOT, "workspaces", "hybrid-100-approved-release");
const FINAL_REVIEW_WORKSPACE = path.join(DATASET_ROOT, "workspaces", "hybrid-100-rc-final-review");
const CANARY_BASELINE_ARTIFACT = path.join(APPROVED_RELEASE_WORKSPACE, "canary-baseline-correction.json");
const fixtureRoots: string[] = [];

function git(root: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function createFixture(crlfCheckout = false): { root: string; treeSha: string; commit: string; file: string } {
  const root = mkdtempSync(path.join(os.tmpdir(), "vocabflow-canary-guard-"));
  fixtureRoots.push(root);
  git(os.tmpdir(), "init", root);
  git(root, "config", "user.name", "Canary Integrity Test");
  git(root, "config", "user.email", "canary-integrity@example.invalid");
  git(root, "config", "core.autocrlf", "true");
  const directory = path.join(root, CANARY_RELATIVE_PATH);
  mkdirSync(directory, { recursive: true });
  if (crlfCheckout) writeFileSync(path.join(directory, ".gitattributes"), "card.json text eol=crlf\n", "utf8");
  const file = path.join(directory, "card.json");
  writeFileSync(file, "{\"word\":\"fixture\"}\n", "utf8");
  git(root, "add", ".");
  git(root, "commit", "-m", "test canary baseline");
  const commit = git(root, "rev-parse", "HEAD");
  git(root, "update-ref", "refs/remotes/origin/TXH", commit);
  if (crlfCheckout) {
    rmSync(file);
    git(root, "checkout-index", "-f", "--", `${CANARY_RELATIVE_PATH}/card.json`);
  }
  return { root, file, treeSha: git(root, "rev-parse", `HEAD:${CANARY_RELATIVE_PATH}`), commit };
}

afterEach(() => {
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Hybrid-100 canary Git integrity guard", () => {
  it("pins HEAD and origin/TXH to the canary tree from its last changing commit", () => {
    const state = assertCanaryRepositoryState(REPO_ROOT);
    expect(git(REPO_ROOT, "rev-parse", `${PHASE_2F7_BASELINE_COMMIT}:${CANARY_RELATIVE_PATH}`)).toBe(CANARY_GIT_TREE_SHA);
    expect(state).toMatchObject({
      authoritativeCanaryGitTreeSha: CANARY_GIT_TREE_SHA,
      headCanaryGitTreeSha: CANARY_GIT_TREE_SHA,
      remoteCanaryGitTreeSha: CANARY_GIT_TREE_SHA,
      lastCanaryCommit: LAST_CANARY_COMMIT,
      lastCanaryCommitTreeSha: CANARY_GIT_TREE_SHA,
      canaryWorkingTreeClean: true,
    });
    const correction = JSON.parse(readFileSync(CANARY_BASELINE_ARTIFACT, "utf8")) as Record<string, unknown>;
    expect(state.canaryCommittedTreeFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(state.canaryCommittedTreeFingerprint).toBe(correction.canaryCommittedTreeFingerprint);
  });

  it("passes a clean isolated repository with matching remote and historical tree pins", () => {
    const fixture = createFixture();
    expect(assertCanaryRepositoryState(fixture.root, {
      expectedTreeSha: fixture.treeSha,
      expectedLastCanaryCommit: fixture.commit,
    })).toMatchObject({
      headCanaryGitTreeSha: fixture.treeSha,
      remoteCanaryGitTreeSha: fixture.treeSha,
      lastCanaryCommit: fixture.commit,
      canaryWorkingTreeClean: true,
    });
  });

  it("rejects a tracked canary modification", () => {
    const fixture = createFixture();
    writeFileSync(fixture.file, "{\"word\":\"modified\"}\n", "utf8");
    expect(() => assertCanaryRepositoryState(fixture.root, {
      expectedTreeSha: fixture.treeSha,
      expectedLastCanaryCommit: fixture.commit,
    })).toThrow("CANARY_WORKTREE_DIRTY");
  });

  it("rejects an untracked file inside the canary directory", () => {
    const fixture = createFixture();
    writeFileSync(path.join(path.dirname(fixture.file), "extra.json"), "{}\n", "utf8");
    expect(() => assertCanaryRepositoryState(fixture.root, {
      expectedTreeSha: fixture.treeSha,
      expectedLastCanaryCommit: fixture.commit,
    })).toThrow("CANARY_WORKTREE_DIRTY");
  });

  it("ignores CRLF checkout bytes when Git normalizes the committed text file as unchanged", () => {
    const fixture = createFixture(true);
    const checkout = readFileSync(fixture.file, "utf8");
    expect(checkout.includes("\r\n")).toBe(true);
    expect(() => git(fixture.root, "diff", "--quiet", "HEAD", "--", CANARY_RELATIVE_PATH)).not.toThrow();
    expect(assertCanaryRepositoryState(fixture.root, {
      expectedTreeSha: fixture.treeSha,
      expectedLastCanaryCommit: fixture.commit,
    }).canaryWorkingTreeClean).toBe(true);
  });

  it("does not treat the superseded dirty-worktree fingerprint as the clean baseline", () => {
    const fixture = createFixture();
    const state = assertCanaryRepositoryState(fixture.root, {
      expectedTreeSha: fixture.treeSha,
      expectedLastCanaryCommit: fixture.commit,
    });
    expect(SUPERSEDED_DIRTY_WORKTREE_FINGERPRINT).not.toBe(state.canaryCommittedTreeFingerprint);
    expect(state.authoritativeCanaryGitTreeSha).toBe(fixture.treeSha);
  });

  it("preserves release pins and confirms approval-only targets remain unmaterialized", () => {
    const policy = JSON.parse(readFileSync(path.join(FINAL_REVIEW_WORKSPACE, "taxonomy-version-policy-decision.json"), "utf8")) as {
      fingerprintPayload: Record<string, string>;
      policyFingerprint: string;
    };
    const revisionPlan = JSON.parse(readFileSync(path.join(FINAL_REVIEW_WORKSPACE, "approval-revision-plan.json"), "utf8")) as {
      rows: Array<{ action: string; targetRecordPath?: string }>;
    };
    const taxonomyPlan = JSON.parse(readFileSync(path.join(FINAL_REVIEW_WORKSPACE, "taxonomy-approval-plan.json"), "utf8")) as {
      targetRecordCreated: boolean;
    };
    const targets = (revisionPlan.rows as Array<{ action: string; targetRecordPath?: string }>)
      .filter((row) => row.action === "CREATE_APPROVED_NEXT_REVISION")
      .map((row) => row.targetRecordPath)
      .filter((target): target is string => Boolean(target));
    expect(policy.fingerprintPayload).toMatchObject({
      rcFingerprint: "06b2a4dec2f54438416cae67788e0683fe94907cbce0a60fbb2d6469bc25b82c",
      rcTreeFingerprint: "9d021e151d934a61c577289a4aff3ded8883858bac672e1c27ac546a335966a7",
      finalManifestPlanFingerprint: "b004c752ea52bdfd732d3c5d44284829b7f9f3070b8c193aa23fca96a4e5f97b",
    });
    expect(policy.policyFingerprint).toBe("9596e407a8448a0aa4b6edb1944154ca4754ac396596501c06b9272318c2779b");
    expect(taxonomyPlan.targetRecordCreated).toBe(false);
    expect(targets).toHaveLength(286);
    expect(targets.filter((target) => existsSync(path.join(DATASET_ROOT, ...target.split("/")))).length).toBe(0);
    expect(existsSync(path.join(DATASET_ROOT, "taxonomy", "01a0fc13-09e9-72dd-b49d-ffef077385dd-2.0.1.json"))).toBe(false);
    expect(existsSync(path.join(DATASET_ROOT, "releases", "hybrid-100-v2.2.0"))).toBe(false);
    expect(computeCanaryCommittedTreeFingerprint(REPO_ROOT)).not.toBe(SUPERSEDED_DIRTY_WORKTREE_FINGERPRINT);
  }, 20_000);
});
