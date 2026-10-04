import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { resolveCanonicalReconciliationRoot } from "./import-master-vocabulary-v2";

const temporaryRoots: string[] = [];

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Master V2 reconciliation path resolution", () => {
  it("uses the package human-owned reconciliation for release artifacts", () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "vocabflow-reconciliation-"));
    temporaryRoots.push(temporaryRoot);
    const datasetRoot = path.join(temporaryRoot, "vocabflow-dataset");
    const releaseRoot = path.join(datasetRoot, "releases", "canary-v2.1.0");
    const relative = path.join("import", "mappings", "runtime-reconciliation-v2.json");
    mkdirSync(path.dirname(path.join(datasetRoot, relative)), { recursive: true });
    mkdirSync(path.dirname(path.join(releaseRoot, relative)), { recursive: true });
    writeFileSync(path.join(datasetRoot, relative), "{}\n", "utf8");
    writeFileSync(path.join(releaseRoot, relative), "{}\n", "utf8");

    expect(resolveCanonicalReconciliationRoot(releaseRoot)).toBe(datasetRoot);
    expect(resolveCanonicalReconciliationRoot(datasetRoot)).toBe(datasetRoot);
  });
});
