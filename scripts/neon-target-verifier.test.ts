import { describe, expect, it } from "vitest";
import type { ConnectionTarget } from "@vocabflow/contracts";
import { createNeonApiClient, mapProviderCodeToDbStatus, verifyNeonTarget, type NeonApiClient } from "./neon-target-verifier";

const expected: ConnectionTarget = {
  environment: "development",
  provider: "neon",
  projectId: "project",
  branchId: "branch",
  databaseName: "vocabflow",
  pooled: false,
  usage: "development",
  identityVersion: 1,
  purpose: "runtime",
  roleName: "runtime"
};
const configured = { host: "ep-example.neon.tech", databaseName: "vocabflow", roleName: "runtime", pooled: false };

function fake(overrides: Partial<NeonApiClient> = {}): NeonApiClient {
  return {
    getBranch: async () => ({ projectId: "project", branchId: "branch" }),
    getConnectionUri: async () => ({ uri: "postgresql://runtime:secret@ep-example.neon.tech/vocabflow" }),
    ...overrides
  };
}

describe("Neon target verifier", () => {
  it("resolves a matching provider target", async () => {
    const result = await verifyNeonTarget({ expected, configuredConnection: configured, neonApiClient: fake() });
    expect(result.ok).toBe(true);
  });

  it("sanitizes provider errors", async () => {
    const result = await verifyNeonTarget({
      expected,
      configuredConnection: configured,
      neonApiClient: fake({ getBranch: async () => { throw new Error("password=secret-uri"); } })
    });
    expect(result).toMatchObject({ ok: false, code: "PROVIDER_UNAVAILABLE", message: "Neon provider verification failed." });
    expect(JSON.stringify(result)).not.toContain("secret-uri");
  });

  it("maps invalid provider authentication to FAIL", async () => {
    const result = await verifyNeonTarget({
      expected,
      configuredConnection: configured,
      neonApiClient: fake({ getBranch: async () => { throw new Error("PROVIDER_AUTH_FAILED"); } })
    });
    expect(result).toMatchObject({ ok: false, code: "PROVIDER_AUTH_FAILED" });
  });

  it("rejects project and branch mismatches from provider proof", async () => {
    const project = await verifyNeonTarget({
      expected,
      configuredConnection: configured,
      neonApiClient: fake({ getBranch: async () => ({ projectId: "other", branchId: "branch" }) })
    });
    const branch = await verifyNeonTarget({
      expected,
      configuredConnection: configured,
      neonApiClient: fake({ getBranch: async () => ({ projectId: "project", branchId: "other" }) })
    });
    expect(project).toMatchObject({ ok: false, code: "PROJECT_NOT_FOUND" });
    expect(branch).toMatchObject({ ok: false, code: "BRANCH_NOT_FOUND" });
  });

  it("rejects malformed provider responses", async () => {
    const result = await verifyNeonTarget({
      expected,
      configuredConnection: configured,
      neonApiClient: fake({ getConnectionUri: async () => ({ uri: "not-a-database-uri" }) })
    });
    expect(result).toMatchObject({ ok: false, code: "PROVIDER_RESPONSE_INVALID" });
  });

  it.each([
    ["host", "postgresql://runtime:secret@other.neon.tech/vocabflow"],
    ["database", "postgresql://runtime:secret@ep-example.neon.tech/other"],
    ["role", "postgresql://other:secret@ep-example.neon.tech/vocabflow"],
    ["pooled", "postgresql://runtime:secret@ep-example-pooler.neon.tech/vocabflow"]
  ])("rejects %s mismatches", async (_label, uri) => {
    const result = await verifyNeonTarget({
      expected,
      configuredConnection: configured,
      neonApiClient: fake({ getConnectionUri: async () => ({ uri }) })
    });
    expect(result).toMatchObject({ ok: false, code: "CONNECTION_TARGET_MISMATCH" });
  });

  it("maps provider unavailability to a deterministic blocked status", async () => {
    const result = await verifyNeonTarget({
      expected,
      configuredConnection: configured,
      neonApiClient: fake({ getConnectionUri: async () => { throw new Error("PROVIDER_UNAVAILABLE"); } })
    });
    expect(result).toMatchObject({ ok: false, code: "PROVIDER_UNAVAILABLE" });
    expect(mapProviderCodeToDbStatus("PROVIDER_UNAVAILABLE")).toBe("BLOCKED_PROVIDER_VERIFICATION");
  });

  it("maps provider availability to blocked and mismatch to fail", () => {
    expect(mapProviderCodeToDbStatus("PROVIDER_UNAVAILABLE")).toBe("BLOCKED_PROVIDER_VERIFICATION");
    expect(mapProviderCodeToDbStatus("CONNECTION_TARGET_MISMATCH")).toBe("FAIL");
  });

  it("parses Neon branch responses wrapped in a branch object", async () => {
    const client = createNeonApiClient("api-key", async (input) => {
      const url = String(input);
      if (url.includes("/branches/")) {
        return new Response(JSON.stringify({ branch: { id: "branch", project_id: "project" } }), { status: 200 });
      }
      return new Response(JSON.stringify({ uri: "postgresql://runtime:secret@ep-example.neon.tech/vocabflow" }), { status: 200 });
    });

    await expect(client.getBranch({ projectId: "project", branchId: "branch" })).resolves.toEqual({
      projectId: "project",
      branchId: "branch"
    });
  });
});
