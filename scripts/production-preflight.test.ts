import { describe, expect, it, vi } from "vitest";
import { DATABASE_TARGETS, getConnectionTarget } from "../config/database-targets";
import type { DatabasePurpose } from "@vocabflow/contracts";
import { openSql } from "./db-core";
import { readProductionPreflightState, type ProductionPreflightDependencies } from "./production-preflight";

type Purpose = Extract<DatabasePurpose, "runtime" | "migration">;
type QueryRecord = { role: Purpose; query: string; values: unknown[] };

const environment = {
  EXECUTION_CONTEXT: "local-development",
  VOCABFLOW_ENV: "production",
  DATABASE_ENV: "production",
} as NodeJS.ProcessEnv;

function fakeSql(role: Purpose, records: QueryRecord[], options: { wrongIdentity?: boolean } = {}) {
  const client = Object.assign(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      const query = strings.join("?");
      records.push({ role, query, values });
      if (values.includes("drizzle.__drizzle_migrations")) {
        if (role !== "migration") throw new Error("permission denied for schema drizzle");
        return Promise.resolve([{ exists: true }]);
      }
      if (query.includes("SELECT id, environment, provider, project_id, branch_id, identity_version")) {
        return Promise.resolve([{
          id: 1,
          environment: "production",
          provider: "neon",
          project_id: DATABASE_TARGETS.production.projectId,
          branch_id: options.wrongIdentity && role === "runtime" ? "wrong-branch" : DATABASE_TARGETS.production.branchId,
          identity_version: 1,
        }]);
      }
      if (query.includes("to_regclass")) return Promise.resolve([{ exists: true }]);
      if (query.includes("count(*)::text")) return Promise.resolve([{ count: "12" }]);
      return Promise.resolve([]);
    },
    {
      unsafe: (identifier: string) => identifier,
      begin: async (callback: unknown) => (callback as (transaction: unknown) => Promise<unknown>)(client),
      end: async () => undefined,
    },
  );
  return client as unknown as ReturnType<typeof openSql>;
}

function dependencies(options: { wrongRuntimeIdentity?: boolean } = {}) {
  const resolvedPurposes: Purpose[] = [];
  const resolvedRoles: string[] = [];
  const queries: QueryRecord[] = [];
  const deps: ProductionPreflightDependencies = {
    resolveConnection: vi.fn(async ({ purpose }) => {
      resolvedPurposes.push(purpose);
      const target = getConnectionTarget("production", purpose);
      resolvedRoles.push(target.roleName);
      return {
        target,
        url: `mock-connection-${purpose}`,
      };
    }),
    openSql: vi.fn((url) => fakeSql(url.endsWith("runtime") ? "runtime" : "migration", queries, {
      wrongIdentity: options.wrongRuntimeIdentity,
    })),
  };
  return { deps, queries, resolvedPurposes, resolvedRoles };
}

describe("read-only production DB preflight", () => {
  it("validates runtime separately and reads the Drizzle ledger only as vocabflow_migration", async () => {
    const fixture = dependencies();

    await expect(readProductionPreflightState(environment, fixture.deps)).resolves.toBe(12);

    expect(fixture.resolvedPurposes).toEqual(["runtime", "migration"]);
    expect(fixture.resolvedRoles).toEqual(["vocabflow_runtime", "vocabflow_migration"]);
    const ledgerQueries = fixture.queries.filter((query) => query.values.includes("drizzle.__drizzle_migrations"));
    expect(ledgerQueries).toHaveLength(1);
    expect(ledgerQueries[0]?.role).toBe("migration");
    expect(fixture.queries.filter((query) => query.query.includes("SELECT id, environment"))).toHaveLength(2);
    expect(fixture.queries.filter((query) => query.query.includes("SELECT id, environment")).map((query) => query.role))
      .toEqual(["runtime", "migration"]);
    expect(fixture.queries.some((query) => query.role === "runtime" && query.values.includes("drizzle.__drizzle_migrations"))).toBe(false);
    expect(fixture.deps.openSql).toHaveBeenCalledWith("mock-connection-runtime");
    expect(fixture.deps.openSql).toHaveBeenCalledWith("mock-connection-migration");
    expect(fixture.queries.every(({ query }) => query.trim().startsWith("SELECT") || query.includes("SET TRANSACTION READ ONLY")))
      .toBe(true);
  });

  it("stops when the independently checked runtime identity is not canonical", async () => {
    const fixture = dependencies({ wrongRuntimeIdentity: true });

    await expect(readProductionPreflightState(environment, fixture.deps)).rejects.toThrow("DATABASE_IDENTITY_MISMATCH");

    expect(fixture.resolvedPurposes).toEqual(["runtime"]);
    expect(fixture.resolvedRoles).toEqual(["vocabflow_runtime"]);
    expect(fixture.queries.some((query) => query.role === "runtime" && query.query.includes("SELECT id, environment"))).toBe(true);
    expect(fixture.queries.some((query) => query.values.includes("drizzle.__drizzle_migrations"))).toBe(false);
  });
});
