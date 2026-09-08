import { describe, expect, it, vi, afterEach } from "vitest";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { executeApplicationMigrations } from "./db-migration-executor";
import { resetApplicationScope } from "./db-reset-operations";

vi.mock("drizzle-orm/migrator", { spy: true });

const validInfrastructure = {
  expected_user: true, schema_exists: true, expected_owner: true,
  metadata_usage: true, metadata_create: true, application_usage: true,
  application_create: true, database_create: false,
};

function database(infrastructure = validInfrastructure, failure?: Error) {
  let history: Array<{ hash: string; created_at: number }> = [];
  const emitted: string[] = [];
  const applied: string[] = [];
  let inserts = 0;
  const tx = Object.assign(async (parts: TemplateStringsArray, ...values: unknown[]) => {
    const query = parts.join("?");
    emitted.push(query);
    if (query.includes("WITH target AS")) return [infrastructure];
    if (query.includes("ORDER BY created_at DESC")) return history.slice(-1);
    if (query.includes('INSERT INTO "drizzle"')) {
      inserts++;
      history.push({ hash: String(values[0]), created_at: Number(values[1]) });
    }
    if (query.includes("to_regclass")) return [{ exists: true }];
    if (query.includes("TRUNCATE TABLE")) history = [];
    return [];
  }, {
    unsafe: async (statement: string) => {
      emitted.push(statement);
      applied.push(statement);
      if (failure) throw failure;
      return [];
    },
  });
  const sql = {
    begin: async (operation: (client: typeof tx) => Promise<void>) => {
      const before = [...history];
      try { await operation(tx); } catch (error) { history = before; throw error; }
    },
  } as unknown as Parameters<typeof executeApplicationMigrations>[0];
  return { sql, emitted, applied, history: () => history, inserts: () => inserts };
}

afterEach(() => vi.restoreAllMocks());

describe("least-privilege migration executor", () => {
  it("applies the real Drizzle journal from zero, no-ops at latest, and reapplies after reset", async () => {
    const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const db = database();
    const files = readMigrationFiles({ migrationsFolder: "drizzle/migrations" });
    await executeApplicationMigrations(db.sql);
    expect(db.applied).toEqual(files.flatMap((file) => file.sql));
    expect(db.history()).toEqual(files.map((file) => ({ hash: file.hash, created_at: file.folderMillis })));
    expect(db.emitted.join("\n")).not.toMatch(/CREATE\s+SCHEMA/i);
    expect(db.emitted.join("\n")).toContain('CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations"');
    expect(db.emitted.join("\n")).toContain("id SERIAL PRIMARY KEY");
    expect(db.emitted.join("\n")).toContain("created_at bigint");
    const appliedCount = db.applied.length;
    await executeApplicationMigrations(db.sql);
    expect(db.applied).toHaveLength(appliedCount);
    await resetApplicationScope(db.sql);
    expect(db.history()).toEqual([]);
    const afterReset = db.applied.length;
    await executeApplicationMigrations(db.sql);
    expect(db.applied.slice(afterReset)).toEqual(files.flatMap((file) => file.sql));
    expect(db.history()).toEqual(files.map((file) => ({ hash: file.hash, created_at: file.folderMillis })));
    expect(logs.mock.calls.every(([line]) => /^TRUSTED_DB_SUBSTAGE=migration-[a-z-]+$/.test(String(line)))).toBe(true);
  });

  it.each([
    ["schema_exists", false, "MIGRATION_SCHEMA_MISSING"],
    ["expected_owner", false, "MIGRATION_SCHEMA_OWNER_MISMATCH"],
    ["expected_user", false, "MIGRATION_ROLE_MISMATCH"],
    ["metadata_create", false, "MIGRATION_METADATA_SCHEMA_PRIVILEGES_INVALID"],
    ["metadata_usage", false, "MIGRATION_METADATA_SCHEMA_PRIVILEGES_INVALID"],
    ["application_create", false, "MIGRATION_APPLICATION_SCHEMA_PRIVILEGES_INVALID"],
    ["application_usage", false, "MIGRATION_APPLICATION_SCHEMA_PRIVILEGES_INVALID"],
    ["database_create", true, "MIGRATION_DATABASE_CREATE_FORBIDDEN"],
  ])("rejects invalid infrastructure: %s", async (key, value, code) => {
    const db = database({ ...validInfrastructure, [String(key)]: value });
    await expect(executeApplicationMigrations(db.sql)).rejects.toThrow(String(code));
    expect(db.applied).toEqual([]);
    expect(db.emitted.join("\n")).not.toContain("CREATE TABLE");
  });

  it("preserves native SQLSTATE, emits no error values, and records no failed migration", async () => {
    const logs = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const original = Object.assign(new Error("sensitive-server-detail"), { code: "42501" });
    const db = database(validInfrastructure, original);
    await expect(executeApplicationMigrations(db.sql)).rejects.toBe(original);
    expect(db.inserts()).toBe(0);
    expect(db.history()).toEqual([]);
    expect(JSON.stringify(logs.mock.calls)).not.toContain("sensitive-server-detail");
  });

  it("uses the latest timestamp cutoff and journal statement order for multiple migrations", async () => {
    const first = { sql: ["SELECT 1", "SELECT 2"], hash: "first", folderMillis: 100, bps: true };
    const second = { sql: ["SELECT 3"], hash: "second", folderMillis: 200, bps: true };
    const reader = vi.mocked(readMigrationFiles).mockReturnValueOnce([first]);
    const db = database();
    await executeApplicationMigrations(db.sql);
    reader.mockReturnValueOnce([first, second]);
    await executeApplicationMigrations(db.sql);
    expect(db.applied).toEqual(["SELECT 1", "SELECT 2", "SELECT 3"]);
    expect(db.history()).toEqual([
      { hash: "first", created_at: 100 }, { hash: "second", created_at: 200 },
    ]);
  });

  it("blocks schema creation in artifacts before metadata or migration writes", async () => {
    vi.mocked(readMigrationFiles).mockReturnValueOnce([
      { sql: ['CREATE SCHEMA "unexpected"'], hash: "bad", folderMillis: 100, bps: true },
    ]);
    const db = database();
    await expect(executeApplicationMigrations(db.sql)).rejects.toThrow("MIGRATION_SCHEMA_DDL_FORBIDDEN");
    expect(db.applied).toEqual([]);
    expect(db.emitted.join("\n")).not.toContain("CREATE TABLE");
  });
});
