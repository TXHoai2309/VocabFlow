import { describe, expect, it } from "vitest";
import { getConnectionTarget } from "../config/database-targets";
import type { openSql } from "./db-core";
import { parseIdentityProvisionArgs, provisionCanonicalIdentity, safeIdentityProvisionError } from "./db-identity-provision";

type IdentityDbRow = { id: number; environment: "production"; provider: "neon"; project_id: string; branch_id: string; identity_version: number };

function fakeSql(identityRows: IdentityDbRow[]) {
  const queries: Array<{ text: string; values: unknown[] }> = [];
  const tag = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    queries.push({ text: strings.join("?"), values });
    if (strings.join("?").includes("SELECT id, environment, provider, project_id")) return identityRows;
    return [];
  }) as unknown as ReturnType<typeof openSql>;
  tag.unsafe = ((value: string) => value) as unknown as typeof tag.unsafe;
  tag.begin = (async <T>(callback: (transaction: ReturnType<typeof openSql>) => Promise<T>) => callback(tag)) as unknown as typeof tag.begin;
  return { sql: tag, queries };
}

describe("canonical identity provisioning", () => {
  const target = getConnectionTarget("production", "identity-provision");

  it("inserts and returns the canonical production identity after bootstrap", async () => {
    const fixture = fakeSql([]);
    const identity = await provisionCanonicalIdentity(fixture.sql, target);
    expect(identity).toEqual({
      environment: "production",
      provider: "neon",
      projectId: "shy-hill-72364426",
      branchId: "br-rough-silence-b3gbqjcb",
      identityVersion: 1,
    });
    const insert = fixture.queries.find(({ text }) => text.includes("INSERT INTO vocabflow_meta.environment_identity"));
    expect(insert?.values).toEqual(["production", "neon", target.projectId, target.branchId, 1]);
  });

  it("accepts only an already matching canonical production identity on retry", async () => {
    const fixture = fakeSql([{
      id: 1,
      environment: "production",
      provider: "neon",
      project_id: target.projectId,
      branch_id: target.branchId,
      identity_version: 1,
    }]);
    await expect(provisionCanonicalIdentity(fixture.sql, target)).resolves.toEqual({
      environment: "production",
      provider: "neon",
      projectId: target.projectId,
      branchId: target.branchId,
      identityVersion: 1,
    });
    expect(fixture.queries.some(({ text }) => text.includes("INSERT INTO vocabflow_meta.environment_identity"))).toBe(false);
  });

  it("requires explicit guarded apply arguments for production identity writes", () => {
    expect(parseIdentityProvisionArgs(["--target", "production"]).apply).toBe(false);
    expect(parseIdentityProvisionArgs([
      "--target", "production", "--apply", "--confirm-target", "production",
      "--confirm-branch", "br-rough-silence-b3gbqjcb",
    ])).toMatchObject({ apply: true, options: { target: "production", confirmTarget: "production", confirmBranch: "br-rough-silence-b3gbqjcb" } });
  });

  it("never returns a connection URL or arbitrary token as an identity error", () => {
    expect(safeIdentityProvisionError(new Error("DATABASE_IDENTITY_MISMATCH"))).toBe("DATABASE_IDENTITY_MISMATCH");
    expect(safeIdentityProvisionError(new Error("postgresql://user:password@host/database")))
      .toBe("IDENTITY_PROVISION_FAILED");
    expect(safeIdentityProvisionError(new Error("OWNER_SECRET_TOKEN"))).toBe("IDENTITY_PROVISION_FAILED");
  });
});
