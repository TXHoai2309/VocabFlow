import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getTableConfig } from "drizzle-orm/pg-core";
import { APP_SCHEMA, MIGRATION_SCHEMA } from "@vocabflow/contracts";
import { account, householdMembers, households, session, user, verification } from "../apps/api/src/db/schema";
import { DATABASE_RESET_POLICY } from "../config/database-reset-policy";
import { assertApplicationTablesAbsent, assertApplicationTablesPresent } from "./db-core";
import { resetApplicationScope } from "./db-reset-operations";

type CapturedQuery = { text: string; values: unknown[] };

function applicationAssertionSql(count: string, queries: CapturedQuery[], enumCount = "0") {
  const tag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const text = strings.join("?");
    queries.push({ text, values });
    return Promise.resolve([{ count: text.includes("pg_type") ? enumCount : count }]);
  }) as unknown as Parameters<typeof assertApplicationTablesAbsent>[0] & { array(values: unknown[]): unknown };
  tag.array = ((values: unknown[]) => values) as typeof tag.array;
  return tag;
}

describe("dedicated application schema", () => {
  it("uses one canonical application schema in the reset policy", () => {
    expect(APP_SCHEMA).toBe("vocabflow_app");
    expect(MIGRATION_SCHEMA).toBe("drizzle");
    expect(DATABASE_RESET_POLICY.applicationSchemas).toEqual([APP_SCHEMA]);
    expect(DATABASE_RESET_POLICY.applicationTables).toEqual([
      `${APP_SCHEMA}.household_members`,
      `${APP_SCHEMA}.households`,
      `${APP_SCHEMA}.account`,
      `${APP_SCHEMA}.session`,
      `${APP_SCHEMA}.verification`,
      `${APP_SCHEMA}.user`
    ]);
    expect(DATABASE_RESET_POLICY.applicationEnumTypes).toEqual([`${APP_SCHEMA}.household_role`]);
    expect(DATABASE_RESET_POLICY.protectedSchemas).toEqual(["vocabflow_meta"]);
    expect(DATABASE_RESET_POLICY.migrationTrackingObjects).toEqual([`${MIGRATION_SCHEMA}.__drizzle_migrations`]);
  });

  it("binds every runtime Drizzle table to the dedicated application schema", () => {
    for (const table of [account, session, user, verification, households, householdMembers]) {
      expect(getTableConfig(table).schema).toBe(APP_SCHEMA);
    }
  });

  it("qualifies clean-migration table assertions with vocabflow_app", async () => {
    const absentQueries: CapturedQuery[] = [];
    await expect(assertApplicationTablesAbsent(applicationAssertionSql("0", absentQueries))).resolves.toBeUndefined();
    expect(absentQueries[0]?.text).toContain("table_schema::text = ?::text");
    expect(absentQueries[0]?.text).toContain("table_name::text = ANY(?::text[])");
    expect(absentQueries[0]?.values[0]).toBe(APP_SCHEMA);

    const presentQueries: CapturedQuery[] = [];
    await expect(assertApplicationTablesPresent(applicationAssertionSql("6", presentQueries))).resolves.toBeUndefined();
    expect(presentQueries[0]?.values[0]).toBe(APP_SCHEMA);
    await expect(assertApplicationTablesPresent(applicationAssertionSql("3", []))).rejects.toThrow("APPLICATION_SCHEMA_INCOMPLETE");
  });

  it("fails state-zero validation when the application enum survives reset", async () => {
    await expect(assertApplicationTablesAbsent(applicationAssertionSql("0", [], "1"))).rejects.toThrow("APPLICATION_ENUM_TYPES_PRESENT");
  });

  it("resets only application tables and Drizzle state while preserving protected metadata", async () => {
    const statements: string[] = [];
    const unsafeFragments: string[] = [];
    const tx = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
      const text = strings.join("?");
      statements.push(text);
      return Promise.resolve(text.includes("to_regclass") ? [{ exists: true }] : []);
    }) as unknown as { (strings: TemplateStringsArray, ...values: unknown[]): Promise<unknown[]>; unsafe(value: string): unknown };
    tx.unsafe = (value: string) => {
      unsafeFragments.push(value);
      return value;
    };
    const sql = {
      begin: async (operation: (transaction: typeof tx) => Promise<void>) => operation(tx)
    } as unknown as Parameters<typeof resetApplicationScope>[0];

    await resetApplicationScope(sql);

    expect(statements[0]).toContain("pg_advisory_xact_lock");
    expect(statements.filter((statement) => statement.includes("DROP TABLE IF EXISTS"))).toHaveLength(6);
    const lastTableDrop = Math.max(...statements.map((statement, index) => statement.includes("DROP TABLE IF EXISTS") ? index : -1));
    const enumDrop = statements.findIndex((statement) => statement.includes("DROP TYPE IF EXISTS"));
    const migrationReset = statements.findIndex((statement) => statement.includes("TRUNCATE TABLE"));
    expect(enumDrop).toBeGreaterThan(lastTableDrop);
    expect(migrationReset).toBeGreaterThan(enumDrop);
    expect(statements.some((statement) => statement.includes("DROP SCHEMA"))).toBe(false);
    expect(statements.some((statement) => /DROP ROLE|GRANT|REVOKE/i.test(statement))).toBe(false);
    expect(unsafeFragments).toEqual([
      `"${APP_SCHEMA}"."household_members"`,
      `"${APP_SCHEMA}"."households"`,
      `"${APP_SCHEMA}"."account"`,
      `"${APP_SCHEMA}"."session"`,
      `"${APP_SCHEMA}"."verification"`,
      `"${APP_SCHEMA}"."user"`,
      `"${APP_SCHEMA}"."household_role"`,
      `"${MIGRATION_SCHEMA}"."__drizzle_migrations"`
    ]);
    expect(unsafeFragments.some((fragment) => fragment.includes("vocabflow_meta"))).toBe(false);
  });

  it("keeps Drizzle metadata separate and emits only schema-qualified application objects", () => {
    const schemaSource = readFileSync(join(process.cwd(), "apps", "api", "src", "db", "schema.ts"), "utf8");
    const migration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0000_application-schema.sql"), "utf8");
    const householdMigration = readFileSync(join(process.cwd(), "drizzle", "migrations", "0001_curious_miss_america.sql"), "utf8");
    const journal = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "_journal.json"), "utf8")) as { entries: Array<{ idx: number; tag: string }> };
    const snapshot = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "migrations", "meta", "0000_snapshot.json"), "utf8")) as {
      schemas: Record<string, string>;
      tables: Record<string, unknown>;
    };
    const dbCore = readFileSync(join(process.cwd(), "scripts", "db-core.ts"), "utf8");

    expect(schemaSource).toContain("pgSchema(APP_SCHEMA)");
    expect(schemaSource).not.toContain("pgTable(");
    expect(Object.keys(snapshot.schemas)).toEqual([APP_SCHEMA]);
    expect(Object.keys(snapshot.tables).every((table) => table.startsWith(`${APP_SCHEMA}.`))).toBe(true);
    expect(migration).not.toContain("CREATE SCHEMA");
    expect(migration).not.toContain('"public".');
    expect(migration).toContain(`CREATE TABLE "${APP_SCHEMA}"."user"`);
    expect(migration).toContain(`TO "vocabflow_runtime"`);
    expect(migration).toContain(`ALTER DEFAULT PRIVILEGES FOR ROLE "vocabflow_migration" IN SCHEMA "${APP_SCHEMA}"`);
    expect(householdMigration).toContain(`CREATE TYPE "${APP_SCHEMA}"."household_role" AS ENUM('OWNER', 'PARENT')`);
    expect(householdMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."households"`);
    expect(householdMigration).toContain(`CREATE TABLE "${APP_SCHEMA}"."household_members"`);
    expect(householdMigration).not.toMatch(/CREATE SCHEMA|CREATE ON DATABASE|vocabflow_meta/i);
    expect(journal.entries.map((entry) => entry.tag)).toEqual(["0000_application-schema", "0001_curious_miss_america"]);
    expect(dbCore).toContain("await executeApplicationMigrations(sql)");
  });

  it("keeps household reset order dependency-safe", () => {
    const tables = DATABASE_RESET_POLICY.applicationTables;
    expect(tables.indexOf(`${APP_SCHEMA}.household_members`)).toBeLessThan(tables.indexOf(`${APP_SCHEMA}.households`));
    expect(tables.indexOf(`${APP_SCHEMA}.households`)).toBeLessThan(tables.indexOf(`${APP_SCHEMA}.user`));
  });
});
