import { describe, expect, it } from "vitest";
import { assertNoApplicationDatabasePrivileges, assertNoResidualBootstrapMembership, assertNoResidualBootstrapOwnerMembership, assertProtectedShape, createLoginRole, ROLE_NAMES, type BootstrapRoleCredentials, withTemporarySetMembership } from "./db-bootstrap";

type CapturedQuery = { strings: string[]; values: unknown[] };

function resultSql(result: unknown[]) {
  const tag = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve(result)) as unknown as Parameters<typeof assertNoApplicationDatabasePrivileges>[0] & { array(values: unknown[]): unknown };
  tag.array = ((values: unknown[]) => values) as typeof tag.array;
  return tag;
}

function fakeSql(queries: CapturedQuery[]) {
  const tag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    queries.push({ strings: [...strings], values });
    return Promise.resolve();
  }) as ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<void>) & { unsafe(value: string): string };
  tag.unsafe = (value: string) => value;
  return tag;
}

describe("bootstrap role creation", () => {
  it("creates each application role as a credentialed, restricted LOGIN role", async () => {
    const queries: CapturedQuery[] = [];
    const unsafeQueries: string[] = [];
    const sql = fakeSql(queries);
    sql.unsafe = (value: string) => {
      unsafeQueries.push(value);
      return value;
    };
    const credentials: BootstrapRoleCredentials = {
      provision: { roleName: ROLE_NAMES.provision, password: "provision-secret" },
      migration: { roleName: ROLE_NAMES.migration, password: "migration-secret" },
      runtime: { roleName: ROLE_NAMES.runtime, password: "runtime-secret" }
    };

    await createLoginRole(sql, ROLE_NAMES.provision, credentials.provision.password);
    await createLoginRole(sql, ROLE_NAMES.migration, credentials.migration.password);
    await createLoginRole(sql, ROLE_NAMES.runtime, credentials.runtime.password);

    expect(queries).toHaveLength(3);
    expect(unsafeQueries).toHaveLength(3);
    for (const query of unsafeQueries) {
      expect(query).toContain("CREATE ROLE %I LOGIN NOINHERIT PASSWORD %L");
      expect(query).toContain("NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS");
      expect(query).not.toContain("-secret");
    }
    expect(queries.flatMap((query) => query.values)).toEqual([
      "vocabflow.bootstrap_role_name",
      ROLE_NAMES.provision,
      "vocabflow.bootstrap_role_password",
      "provision-secret",
      "vocabflow.bootstrap_role_name",
      ROLE_NAMES.migration,
      "vocabflow.bootstrap_role_password",
      "migration-secret",
      "vocabflow.bootstrap_role_name",
      ROLE_NAMES.runtime,
      "vocabflow.bootstrap_role_password",
      "runtime-secret"
    ]);
  });

  it("grants migration SET only around the ownership operation and revokes it", async () => {
    const queries: CapturedQuery[] = [];
    const unsafeQueries: string[] = [];
    const sql = fakeSql(queries);
    sql.unsafe = (value: string) => {
      unsafeQueries.push(value);
      return value;
    };

    await withTemporarySetMembership(sql, ROLE_NAMES.migration, async () => undefined);

    expect(queries).toHaveLength(2);
    expect(queries[0]?.strings.join("?")).toContain("WITH INHERIT FALSE, SET TRUE");
    expect(queries[1]?.strings.join("?")).toContain("REVOKE");
    expect(unsafeQueries).toEqual([
      `"${ROLE_NAMES.migration}"`,
      `"${ROLE_NAMES.bootstrap}"`,
      `"${ROLE_NAMES.migration}"`,
      `"${ROLE_NAMES.bootstrap}"`
    ]);
  });

  it("grants owner SET before protected ownership and revokes it after the last operation", async () => {
    const queries: CapturedQuery[] = [];
    const unsafeQueries: string[] = [];
    const sql = fakeSql(queries);
    sql.unsafe = (value: string) => {
      unsafeQueries.push(value);
      return value;
    };

    await withTemporarySetMembership(sql, ROLE_NAMES.owner, async () => {
      await sql`CREATE SCHEMA vocabflow_meta AUTHORIZATION ${sql.unsafe(`"${ROLE_NAMES.owner}"`)}`;
      await sql`SET LOCAL ROLE ${sql.unsafe(`"${ROLE_NAMES.owner}"`)}`;
      await sql`CREATE TABLE vocabflow_meta.environment_identity (id smallint)`;
      await sql`RESET ROLE`;
    });

    expect(queries).toHaveLength(6);
    expect(queries[0]?.strings.join("?")).toContain("GRANT");
    expect(queries[1]?.strings.join("?")).toContain("CREATE SCHEMA");
    expect(queries[2]?.strings.join("?")).toContain("SET LOCAL ROLE");
    expect(queries[3]?.strings.join("?")).toContain("CREATE TABLE");
    expect(queries[4]?.strings.join("?")).toContain("RESET ROLE");
    expect(queries[5]?.strings.join("?")).toContain("REVOKE");
    expect(unsafeQueries[0]).toBe(`"${ROLE_NAMES.owner}"`);
    expect(unsafeQueries[1]).toBe(`"${ROLE_NAMES.bootstrap}"`);
    expect(unsafeQueries.at(-2)).toBe(`"${ROLE_NAMES.owner}"`);
    expect(unsafeQueries.at(-1)).toBe(`"${ROLE_NAMES.bootstrap}"`);
  });

  it("rejects permanent application database ownership or CREATE privilege", async () => {
    const valid = resultSql([{
      application_database_owner: false,
      owner_create: false,
      provision_create: false,
      migration_create: false,
      runtime_create: false
    }]);
    await expect(assertNoApplicationDatabasePrivileges(valid)).resolves.toBeUndefined();

    const violation = resultSql([{
      application_database_owner: false,
      owner_create: true,
      provision_create: false,
      migration_create: false,
      runtime_create: false
    }]);
    await expect(assertNoApplicationDatabasePrivileges(violation)).rejects.toThrow("BLOCKED_ROLE_MODEL");
  });

  it("uses the pg_class alias for protected constraint table names", async () => {
    const queries: string[] = [];
    const columns = [
      ["bootstrap_metadata", "id", "int2"],
      ["bootstrap_metadata", "version", "int4"],
      ["environment_identity", "id", "int2"],
      ["environment_identity", "environment", "text"],
      ["environment_identity", "provider", "text"],
      ["environment_identity", "project_id", "text"],
      ["environment_identity", "branch_id", "text"],
      ["environment_identity", "identity_version", "int4"],
      ["environment_identity", "created_at", "timestamptz"]
    ].map(([table_name, column_name, udt_name]) => ({ table_name, column_name, udt_name, is_nullable: "NO" }));
    const constraints = [
      ["bootstrap_metadata", "PRIMARY KEY (id)"],
      ["bootstrap_metadata", "CHECK (id = 1)"],
      ["bootstrap_metadata", "CHECK (version = 1)"],
      ["environment_identity", "PRIMARY KEY (id)"],
      ["environment_identity", "CHECK (id = 1)"],
      ["environment_identity", "CHECK (environment IN ('development', 'test', 'production'))"],
      ["environment_identity", "CHECK (provider = 'neon')"],
      ["environment_identity", "CHECK (identity_version = 1)"]
    ].map(([table_name, definition]) => ({ table_name, contype: "c", definition }));
    let call = 0;
    const sql = ((_strings: TemplateStringsArray, ..._values: unknown[]) => {
      queries.push(_strings.join("?"));
      call += 1;
      if (call === 1) return Promise.resolve(columns);
      if (call === 2) return Promise.resolve(constraints);
      return Promise.resolve([{ public_create: false }]);
    }) as unknown as Parameters<typeof assertProtectedShape>[0] & { array(values: unknown[]): unknown };
    sql.array = ((values: unknown[]) => values) as typeof sql.array;

    await expect(assertProtectedShape(sql)).resolves.toBeUndefined();
    expect(queries[1]).toContain("SELECT ctable.relname AS table_name");
    expect(queries[1]).not.toContain("SELECT c.relname AS table_name");
  });

  it("fails if a bootstrap-to-migration membership remains", async () => {
    const sql = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([{ count: "0" }])) as unknown as Parameters<typeof assertNoResidualBootstrapMembership>[0];
    await expect(assertNoResidualBootstrapMembership(sql)).resolves.toBeUndefined();

    const residual = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([{ count: "1" }])) as unknown as Parameters<typeof assertNoResidualBootstrapMembership>[0];
    await expect(assertNoResidualBootstrapMembership(residual)).rejects.toThrow("BLOCKED_ROLE_MODEL");
  });

  it("fails if a bootstrap-to-owner membership remains", async () => {
    const sql = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([{ count: "0" }])) as unknown as Parameters<typeof assertNoResidualBootstrapOwnerMembership>[0];
    await expect(assertNoResidualBootstrapOwnerMembership(sql)).resolves.toBeUndefined();

    const residual = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([{ count: "1" }])) as unknown as Parameters<typeof assertNoResidualBootstrapOwnerMembership>[0];
    await expect(assertNoResidualBootstrapOwnerMembership(residual)).rejects.toThrow("BLOCKED_ROLE_MODEL");
  });

  it("preserves the original ownership error on rollback without masking it", async () => {
    const queries: CapturedQuery[] = [];
    const unsafeQueries: string[] = [];
    const sql = fakeSql(queries);
    sql.unsafe = (value: string) => {
      unsafeQueries.push(value);
      return value;
    };
    const original = new Error('must be able to SET ROLE "vocabflow_identity_owner"');

    await expect(withTemporarySetMembership(sql, ROLE_NAMES.owner, async () => {
      throw original;
    })).rejects.toBe(original);
    expect(queries).toHaveLength(1);
    expect(queries[0]?.strings.join("?")).toContain("GRANT");
    expect(queries.some((query) => query.strings.join("?").includes("REVOKE"))).toBe(false);
    expect(unsafeQueries).toEqual([
      `"${ROLE_NAMES.owner}"`,
      `"${ROLE_NAMES.bootstrap}"`
    ]);
  });
});
