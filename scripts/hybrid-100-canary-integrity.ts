import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import canonicalize from "canonicalize";

export const CANARY_RELATIVE_PATH = "vocabflow-dataset/releases/canary-v2.1.0";
export const CANARY_GIT_TREE_SHA = "f5d4e502be5106da191b5b2ab807f5db12065831";
export const PHASE_2F7_BASELINE_COMMIT = "0b51d7b996d4a19ab6fc83c5092f50c7b30f4e76";
export const LAST_CANARY_COMMIT = "7ce73b7c8e0d2f14e4d7c34366bf6cd08544f847";
export const SUPERSEDED_DIRTY_WORKTREE_FINGERPRINT = "2c75c7092b89ed343e186d5087c4c99b2a09d8afd666c61f3cab1d746f504547";

export interface CanaryRepositoryState {
  authoritativeCanaryGitTreeSha: string;
  headCanaryGitTreeSha: string;
  remoteCanaryGitTreeSha: string;
  lastCanaryCommit: string;
  lastCanaryCommitTreeSha: string;
  canaryWorkingTreeClean: true;
  canaryCommittedTreeFingerprint: string;
}

export interface CanaryBaselinePins {
  expectedTreeSha?: string;
  expectedLastCanaryCommit?: string;
  remoteRef?: string;
}

function gitBuffer(root: string, args: string[]): Buffer {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  }) as Buffer;
}

function gitText(root: string, args: string[]): string {
  return gitBuffer(root, args).toString("utf8").trim();
}

function treeSha(root: string, revision: string): string {
  try {
    return gitText(root, ["rev-parse", `${revision}:${CANARY_RELATIVE_PATH}`]);
  } catch {
    throw new Error(`CANARY_GIT_TREE_UNAVAILABLE:${revision}`);
  }
}

export function computeCanaryCommittedTreeFingerprint(root: string, revision = "HEAD"): string {
  const output = gitBuffer(root, ["ls-tree", "-r", "-z", "--full-tree", revision, "--", CANARY_RELATIVE_PATH]);
  const entries: Array<{ path: string; sha256: string }> = [];
  for (const record of output.toString("utf8").split("\0").filter(Boolean)) {
    const separator = record.indexOf("\t");
    if (separator < 0) throw new Error("CANARY_GIT_TREE_ENTRY_INVALID");
    const metadata = record.slice(0, separator).split(" ");
    const objectType = metadata[1];
    const objectId = metadata[2];
    const relativePath = record.slice(separator + 1);
    if (objectType !== "blob" || !objectId || !relativePath) continue;
    const blob = gitBuffer(root, ["cat-file", "blob", objectId]);
    entries.push({
      path: relativePath,
      sha256: createHash("sha256").update(blob).digest("hex"),
    });
  }
  entries.sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
  const canonical = canonicalize(entries as never);
  if (canonical === undefined) throw new Error("CANARY_FINGERPRINT_CANONICALIZATION_FAILED");
  return createHash("sha256").update(canonical).digest("hex");
}

export function assertCanaryRepositoryState(root: string, pins: CanaryBaselinePins = {}): CanaryRepositoryState {
  const expectedTreeSha = pins.expectedTreeSha ?? CANARY_GIT_TREE_SHA;
  const expectedLastCanaryCommit = pins.expectedLastCanaryCommit ?? LAST_CANARY_COMMIT;
  const remoteRef = pins.remoteRef ?? "origin/TXH";
  const headCanaryGitTreeSha = treeSha(root, "HEAD");
  if (headCanaryGitTreeSha !== expectedTreeSha) {
    throw new Error(`CANARY_HEAD_GIT_TREE_MISMATCH:${headCanaryGitTreeSha}`);
  }
  const remoteCanaryGitTreeSha = treeSha(root, remoteRef);
  if (remoteCanaryGitTreeSha !== expectedTreeSha) {
    throw new Error(`CANARY_REMOTE_GIT_TREE_MISMATCH:${remoteCanaryGitTreeSha}`);
  }
  const lastCanaryCommit = gitText(root, ["log", "-1", "--format=%H", "--", CANARY_RELATIVE_PATH]);
  if (lastCanaryCommit !== expectedLastCanaryCommit) {
    throw new Error(`CANARY_LAST_CHANGE_COMMIT_MISMATCH:${lastCanaryCommit}`);
  }
  const lastCanaryCommitTreeSha = treeSha(root, lastCanaryCommit);
  if (lastCanaryCommitTreeSha !== expectedTreeSha) {
    throw new Error(`CANARY_LAST_CHANGE_TREE_MISMATCH:${lastCanaryCommitTreeSha}`);
  }
  const trackedChanges = gitText(root, ["diff", "--name-only", "HEAD", "--", CANARY_RELATIVE_PATH]);
  const untrackedFiles = gitText(root, [
    "ls-files", "--others", "--exclude-standard", "-z", "--", CANARY_RELATIVE_PATH,
  ]);
  const ignoredUntrackedFiles = gitText(root, [
    "ls-files", "--others", "--ignored", "--exclude-standard", "-z", "--", CANARY_RELATIVE_PATH,
  ]);
  if (trackedChanges.length > 0 || untrackedFiles.length > 0 || ignoredUntrackedFiles.length > 0) {
    throw new Error("CANARY_WORKTREE_DIRTY");
  }
  return {
    authoritativeCanaryGitTreeSha: expectedTreeSha,
    headCanaryGitTreeSha,
    remoteCanaryGitTreeSha,
    lastCanaryCommit,
    lastCanaryCommitTreeSha,
    canaryWorkingTreeClean: true,
    canaryCommittedTreeFingerprint: computeCanaryCommittedTreeFingerprint(root),
  };
}
