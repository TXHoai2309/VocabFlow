import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { assertNoApiTestEntrypoints } from "./vercel-api-boundary";

let temporaryRoot: string | undefined;

afterEach(() => {
  if (temporaryRoot) rmSync(temporaryRoot, { recursive: true, force: true });
  temporaryRoot = undefined;
});

function createApiRoot() {
  temporaryRoot = mkdtempSync(join(tmpdir(), "vocabflow-vercel-api-boundary-test-"));
  return temporaryRoot;
}

describe("Vercel API function boundary", () => {
  it("keeps the production api directory free of test and spec TypeScript entrypoints", () => {
    expect(() => assertNoApiTestEntrypoints(resolve("api"))).not.toThrow();
  });

  it.each(["entrypoint.test.ts", "health.spec.ts", "nested/handler.test.mts"]) (
    "rejects %s anywhere under the production api directory",
    (entrypoint) => {
      const apiRoot = createApiRoot();
      const path = join(apiRoot, entrypoint);
      mkdirSync(join(path, ".."), { recursive: true });
      writeFileSync(path, "export {};", "utf8");

      expect(() => assertNoApiTestEntrypoints(apiRoot))
        .toThrow("VERCEL_API_TEST_ENTRYPOINT_PRESENT");
    },
  );

  it("allows production TypeScript function files", () => {
    const apiRoot = createApiRoot();
    writeFileSync(join(apiRoot, "handler.ts"), "export {};", "utf8");
    writeFileSync(join(apiRoot, "runtime.mts"), "export {};", "utf8");

    expect(() => assertNoApiTestEntrypoints(apiRoot)).not.toThrow();
  });
});
