import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { APP_SCHEMA, assertMemberships, assertMigrationPrivileges, assertNoApplicationDatabasePrivileges, assertNoResidualBootstrapMembership, assertNoResidualBootstrapOwnerMembership, assertProtectedPrivileges, assertProtectedShape, assertRoleModel, createLoginRole, MIGRATION_SCHEMA, protectedState, ROLE_NAMES, type BootstrapRoleCredentials, withTemporarySetMembership } from "./db-bootstrap";

type CapturedQuery = { strings: string[]; values: unknown[] };
type BuiltQuery = { text: string; parameters: unknown[]; types: number[] };

const testRequire = createRequire(import.meta.url);
const postgresTypes = testRequire(join(dirname(testRequire.resolve("postgres")), "types.js")) as {
  stringify(query: unknown, text: string, value: unknown, parameters: unknown[], types: number[], options: unknown): string;
};

function capturePostgresSql(results: unknown[][], builtQueries: BuiltQuery[]) {
  // Use the same CommonJS module instance as `types.js` so nested unsafe
  // identifier fragments are recognized as Query objects by the serializer.
  const postgresCjs = testRequire("postgres") as typeof postgres;
  const realSql = postgresCjs("postgres://test:test@127.0.0.1:1/test", { max: 1 });
  const realTag = realSql as unknown as (strings: TemplateStringsArray, ...values: unknown[]) => unknown;
  let resultIndex = 0;
  const tag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const query = realTag(strings, ...values) as { strings: string[]; args: unknown[] };
    const parameters: unknown[] = [];
    const types: number[] = [];
    const text = postgresTypes.stringify(query, query.strings[0] ?? "", query.args[0], parameters, types, realSql.options);
    builtQueries.push({ text, parameters, types });
    return Promise.resolve(results[resultIndex++] ?? []);
  }) as unknown as Parameters<typeof assertProtectedPrivileges>[0] & { array: typeof realSql.array; unsafe: typeof realSql.unsafe };
  tag.array = realSql.array;
  tag.unsafe = realSql.unsafe;
  return { tag, close: () => realSql.end({ timeout: 1 }) };
}

function resultSql(result: unknown[], queries?: string[]) {
  const tag = ((_strings: TemplateStringsArray, ..._values: unknown[]) => {
    queries?.push(_strings.join("?"));
    return Promise.resolve(result);
  }) as unknown as Parameters<typeof assertNoApplicationDatabasePrivileges>[0] & { array(values: unknown[]): unknown };
  tag.array = ((values: unknown[]) => values) as typeof tag.array;
  return tag;
}

function sequenceSql(results: unknown[][], queries?: string[]) {
  let resultIndex = 0;
  const tag = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
    queries?.push(strings.join("?"));
    return Promise.resolve(results[resultIndex++] ?? []);
  }) as unknown as Parameters<typeof assertMigrationPrivileges>[0] & { array(values: unknown[]): unknown; unsafe(value: string): unknown };
  tag.array = ((values: unknown[]) => values) as typeof tag.array;
  tag.unsafe = ((value: string) => value) as typeof tag.unsafe;
  return tag;
}

function fakeSql(queries: CapturedQuery[]) {
  const tag = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    queries.push({ strings: [...strings], values });
    return Promise.resolve(strings.join("?").includes("pg_auth_members") ? [{ forbidden: false }] : undefined);
  }) as ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>) & { unsafe(value: string): string };
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
    expect(queries[0]?.strings.join("?")).toContain("set_config(?::text, ?::text, true)");
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

    expect(queries).toHaveLength(3);
    expect(queries[0]?.strings.join("?")).toContain("WITH INHERIT FALSE, SET TRUE");
    expect(queries[1]?.strings.join("?")).toContain("REVOKE");
    expect(queries[2]?.strings.join("?")).toContain("pg_auth_members");
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

    expect(queries).toHaveLength(7);
    expect(queries[0]?.strings.join("?")).toContain("GRANT");
    expect(queries[1]?.strings.join("?")).toContain("CREATE SCHEMA");
    expect(queries[2]?.strings.join("?")).toContain("SET LOCAL ROLE");
    expect(queries[3]?.strings.join("?")).toContain("CREATE TABLE");
    expect(queries[4]?.strings.join("?")).toContain("RESET ROLE");
    expect(queries[5]?.strings.join("?")).toContain("REVOKE");
    expect(queries[6]?.strings.join("?")).toContain("pg_auth_members");
    expect(unsafeQueries[0]).toBe(`"${ROLE_NAMES.owner}"`);
    expect(unsafeQueries[1]).toBe(`"${ROLE_NAMES.bootstrap}"`);
    expect(unsafeQueries.at(-2)).toBe(`"${ROLE_NAMES.owner}"`);
    expect(unsafeQueries.at(-1)).toBe(`"${ROLE_NAMES.bootstrap}"`);
  });

  it("leaves all fresh-bootstrap temporary memberships clean", async () => {
    const memberships = new Set<string>();
    const statements: string[] = [];
    const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
      const statement = strings.join("?");
      statements.push(statement);
      if (statement.startsWith("GRANT ")) memberships.add(String(values[0]));
      if (statement.startsWith("REVOKE ")) memberships.delete(String(values[0]));
      if (statement.includes("pg_auth_members")) {
        return Promise.resolve([{ forbidden: memberships.has(`"${String(values[0])}"`) }]);
      }
      return Promise.resolve(undefined);
    }) as unknown as Parameters<typeof withTemporarySetMembership>[0];
    sql.unsafe = (value: string) => value;

    const runOwnershipSequence = async (role: typeof ROLE_NAMES.migration | typeof ROLE_NAMES.owner) => {
      await withTemporarySetMembership(sql, role, async () => {
        await sql`SET LOCAL ROLE ${sql.unsafe(`"${role}"`)}`;
        await sql`RESET ROLE`;
      });
    };

    await runOwnershipSequence(ROLE_NAMES.migration);
    await runOwnershipSequence(ROLE_NAMES.migration);
    await runOwnershipSequence(ROLE_NAMES.owner);

    expect(memberships.size).toBe(0);
    expect(statements.filter((statement) => statement.startsWith("GRANT "))).toHaveLength(3);
    expect(statements.filter((statement) => statement.startsWith("REVOKE "))).toHaveLength(3);
    for (let index = 0; index < statements.length; index += 1) {
      if (!statements[index]?.startsWith("REVOKE ")) continue;
      expect(statements[index - 1]).toContain("RESET ROLE");
    }
  });

  it("fails immediately if a successful ownership sequence leaves membership behind", async () => {
    const statements: string[] = [];
    const sql = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
      const statement = strings.join("?");
      statements.push(statement);
      if (statement.includes("pg_auth_members")) return Promise.resolve([{ forbidden: true }]);
      return Promise.resolve(undefined);
    }) as unknown as Parameters<typeof withTemporarySetMembership>[0];
    sql.unsafe = (value: string) => value;

    await expect(withTemporarySetMembership(sql, ROLE_NAMES.migration, async () => undefined))
      .rejects.toThrow("BLOCKED_ROLE_MODEL_BOOTSTRAP_TO_MIGRATION_MEMBERSHIP");
    expect(statements[0]).toContain("GRANT");
    expect(statements[1]).toContain("REVOKE");
    expect(statements[2]).toContain("pg_auth_members");
  });

  it("rejects permanent application database ownership or CREATE privilege", async () => {
    const queries: string[] = [];
    const valid = resultSql([{
      application_database_owner: false,
      owner_create: false,
      provision_create: false,
      migration_create: false,
      runtime_create: false
    }], queries);
    await expect(assertNoApplicationDatabasePrivileges(valid)).resolves.toBeUndefined();
    expect(queries[0]).toContain("has_database_privilege(?::text, current_database()::text, 'CREATE')");
    expect(queries[0]).not.toContain("has_database_privilege(?, current_database()");

    const violation = resultSql([{
      application_database_owner: false,
      owner_create: true,
      provision_create: false,
      migration_create: false,
      runtime_create: false
    }]);
    await expect(assertNoApplicationDatabasePrivileges(violation)).rejects.toThrow("BLOCKED_ROLE_MODEL");
  });

  it("casts protected-state catalog parameters before execution", async () => {
    const queries: string[] = [];
    const results = [
      [{ schema_exists: true, identity_exists: true, metadata_exists: true, schema_owner: ROLE_NAMES.owner }],
      [{ owner: ROLE_NAMES.owner, identity_count: "0", identity_id: null }],
      [{ owner: ROLE_NAMES.owner, metadata_count: "1", metadata_id: 1, metadata_version: 1 }]
    ];
    let call = 0;
    const sql = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
      queries.push(strings.join("?"));
      return Promise.resolve(results[call++] ?? []);
    }) as unknown as Parameters<typeof protectedState>[0] & { array(values: unknown[]): unknown; unsafe(value: string): unknown };
    sql.array = ((values: unknown[]) => values) as typeof sql.array;
    sql.unsafe = ((value: string) => value) as typeof sql.unsafe;

    await expect(protectedState(sql)).resolves.toMatchObject({ schema_exists: true, identity_exists: true, metadata_exists: true });
    expect(queries[0]).toContain("to_regnamespace(?::text)");
    expect(queries[0]).toContain("to_regclass(?::text)");
    expect(queries[0]).toContain("nspname::text = ?::text");
    expect(queries[1]).toContain("nspname::text = ?::text AND c.relname::text = ?::text");
    expect(queries[2]).toContain("nspname::text = ?::text");
  });

  it("builds typed OID privilege queries without quoted relation binds", async () => {
    const builtQueries: BuiltQuery[] = [];
    const capture = capturePostgresSql([
      [{ owner_oid: 11, provision_oid: 12, migration_oid: 13, runtime_oid: 14, table_oid: 15, schema_oid: 16 }],
      [{ provision_select: true, provision_insert: true, provision_update: false, provision_delete: false, provision_truncate: false }],
      [{ provision_schema_create: false }],
      [{ migration_select: true, migration_insert: false, migration_update: false, migration_delete: false, migration_truncate: false }],
      [{ migration_schema_create: false }],
      [{ runtime_select: true, runtime_insert: false, runtime_update: false, runtime_delete: false, runtime_truncate: false }],
      [{ runtime_schema_create: false }],
      [{ provision_set_owner: false, migration_set_owner: false, runtime_set_owner: false }]
    ], builtQueries);

    try {
      await expect(assertProtectedPrivileges(capture.tag)).resolves.toBeUndefined();
    } finally {
      await capture.close();
    }

    expect(builtQueries).toHaveLength(8);
    for (let parameter = 1; parameter <= 6; parameter += 1) {
      expect(builtQueries[0]?.text).toContain(`$${parameter}::text`);
    }
    expect(builtQueries[0]?.text).toContain("to_regclass($5::text)::oid");
    expect(builtQueries[0]?.text).toContain("to_regnamespace($6::text)::oid");
    expect(builtQueries[0]?.parameters[4]).toBe("vocabflow_meta.environment_identity");
    expect(builtQueries[0]?.text).not.toMatch(/'\$\d/);

    expect(builtQueries[1]?.text).toContain("has_table_privilege($1::oid, $2::oid, 'SELECT'::text)");
    expect(builtQueries[2]?.text).toContain("has_schema_privilege($1::oid, $2::oid, 'CREATE'::text)");
    expect(builtQueries[3]?.text).toContain("has_table_privilege($1::oid, $2::oid, 'SELECT'::text)");
    expect(builtQueries[4]?.text).toContain("has_schema_privilege($1::oid, $2::oid, 'CREATE'::text)");
    expect(builtQueries[5]?.text).toContain("has_table_privilege($1::oid, $2::oid, 'SELECT'::text)");
    expect(builtQueries[6]?.text).toContain("has_schema_privilege($1::oid, $2::oid, 'CREATE'::text)");
    expect(builtQueries[7]?.text).toContain("pg_has_role($1::oid, $2::oid, 'SET'::text)");
    for (const query of builtQueries.slice(1)) {
      expect(query.text).not.toMatch(/'\$\d/);
    }
  });

  it("checks dedicated application schema invariants with specific failure codes", async () => {
    const validResults = [
      [{ migration_role_oid: 13, schema_oid: 14, schema_owner: ROLE_NAMES.migration }],
      [{ schema_oid: 15, schema_owner: ROLE_NAMES.migration, provision_role_oid: 12, runtime_role_oid: 16 }],
      [{
        migration_usage: true,
        migration_create: true,
        runtime_usage: true,
        runtime_create: false,
        provision_create: false,
        provision_set_migration: false,
        runtime_set_migration: false,
        forbidden_migration_membership: false
      }],
      [{ migration_schema_usage: true, migration_schema_create: true }]
    ];
    const queries: string[] = [];
    await expect(assertMigrationPrivileges(sequenceSql(validResults, queries), undefined as never)).resolves.toBeUndefined();
    expect(queries).toHaveLength(4);
    expect(queries[0]).toContain("to_regnamespace(?::text)::oid");
    expect(queries[1]).toContain("to_regnamespace(?::text)::oid");
    expect(queries[2]).toContain("has_schema_privilege(?::oid, ?::oid, 'CREATE'::text)");
    expect(queries.join("\n")).not.toContain("'public'");

    const cases: Array<{ name: string; results: unknown[][]; code: string }> = [
      {
        name: "migration role missing",
        results: [[{ migration_role_oid: null, schema_oid: 14, schema_owner: ROLE_NAMES.migration }]],
        code: "BLOCKED_ROLE_MODEL_MIGRATION_ROLE_MISSING"
      },
      {
        name: "drizzle schema missing",
        results: [[{ migration_role_oid: 13, schema_oid: null, schema_owner: null }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_MISSING"
      },
      {
        name: "drizzle schema owner is wrong",
        results: [[{ migration_role_oid: 13, schema_oid: 14, schema_owner: ROLE_NAMES.owner }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_OWNER"
      },
      {
        name: "application schema missing",
        results: [validResults[0] ?? [], [{ schema_oid: null, schema_owner: null, provision_role_oid: 12, runtime_role_oid: 16 }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_MISSING"
      },
      {
        name: "application schema owner is wrong",
        results: [validResults[0] ?? [], [{ schema_oid: 15, schema_owner: ROLE_NAMES.owner, provision_role_oid: 12, runtime_role_oid: 16 }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_OWNER"
      },
      {
        name: "application schema role is missing",
        results: [validResults[0] ?? [], [{ schema_oid: 15, schema_owner: ROLE_NAMES.migration, provision_role_oid: null, runtime_role_oid: 16 }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_ROLE_MISSING"
      },
      {
        name: "migration cannot use application schema",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ ...(validResults[2]?.[0] as object), migration_usage: false }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_MIGRATION_USAGE"
      },
      {
        name: "migration cannot create application objects",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ ...(validResults[2]?.[0] as object), migration_create: false }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_MIGRATION_CREATE"
      },
      {
        name: "runtime cannot use application schema",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ ...(validResults[2]?.[0] as object), runtime_usage: false }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_RUNTIME_USAGE"
      },
      {
        name: "runtime can create application objects",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ ...(validResults[2]?.[0] as object), runtime_create: true }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_RUNTIME_CREATE"
      },
      {
        name: "provision can create application objects",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ ...(validResults[2]?.[0] as object), provision_create: true }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_PROVISION_CREATE"
      },
      {
        name: "application role is a migration member",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ ...(validResults[2]?.[0] as object), forbidden_migration_membership: true }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_FORBIDDEN_MEMBERSHIP"
      },
      {
        name: "application role can set migration role",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ ...(validResults[2]?.[0] as object), runtime_set_migration: true }]],
        code: "BLOCKED_ROLE_MODEL_APP_SCHEMA_FORBIDDEN_MEMBERSHIP"
      },
      {
        name: "drizzle schema usage is missing",
        results: [validResults[0] ?? [], validResults[1] ?? [], validResults[2] ?? [], [{ migration_schema_usage: false, migration_schema_create: true }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_USAGE"
      },
      {
        name: "drizzle schema create is missing",
        results: [validResults[0] ?? [], validResults[1] ?? [], validResults[2] ?? [], [{ migration_schema_usage: true, migration_schema_create: false }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_CREATE"
      }
    ];

    for (const testCase of cases) {
      await expect(assertMigrationPrivileges(sequenceSql(testCase.results), undefined as never), testCase.name).rejects.toThrow(testCase.code);
    }
  });

  it("emits typed OID checks for application and Drizzle schema privileges", async () => {
    const builtQueries: BuiltQuery[] = [];
    const capture = capturePostgresSql([
      [{ migration_role_oid: 13, schema_oid: 14, schema_owner: ROLE_NAMES.migration }],
      [{ schema_oid: 15, schema_owner: ROLE_NAMES.migration, provision_role_oid: 12, runtime_role_oid: 16 }],
      [{
        migration_usage: true,
        migration_create: true,
        runtime_usage: true,
        runtime_create: false,
        provision_create: false,
        provision_set_migration: false,
        runtime_set_migration: false,
        forbidden_migration_membership: false
      }],
      [{ migration_schema_usage: true, migration_schema_create: true }]
    ], builtQueries);

    try {
      await expect(assertMigrationPrivileges(capture.tag, undefined as never)).resolves.toBeUndefined();
    } finally {
      await capture.close();
    }

    expect(builtQueries).toHaveLength(4);
    expect(builtQueries[0]?.text).toContain("to_regnamespace($2::text)::oid");
    expect(builtQueries[0]?.parameters).toContain(MIGRATION_SCHEMA);
    expect(builtQueries[1]?.text).toContain("to_regnamespace($1::text)::oid");
    expect(builtQueries[1]?.parameters).toContain(APP_SCHEMA);
    expect(builtQueries[2]?.text).toContain("has_schema_privilege($1::oid, $2::oid, 'USAGE'::text)");
    expect(builtQueries[2]?.text).toContain("pg_has_role($11::oid, $12::oid, 'SET'::text)");
    expect(builtQueries[2]?.text).toContain("ANY($16::oid[])");
    expect(builtQueries[3]?.text).toContain("has_schema_privilege($1::oid, $2::oid, 'USAGE'::text)");
    expect(builtQueries.map((query) => query.text).join("\n")).not.toContain("'public'");
  });

  it("wraps every fresh schema ownership sequence in temporary membership", () => {
    const source = readFileSync(join(process.cwd(), "scripts", "db-bootstrap.ts"), "utf8");
    const freshPathStart = source.indexOf("if (!credentials) throw new Error(\"ROLE_CREDENTIALS_REQUIRED\")");
    const migrationSchemaStage = source.indexOf('markStage("create-migration-schema")', freshPathStart);
    const applicationSchemaStage = source.indexOf('markStage("create-application-schema")', migrationSchemaStage);
    const protectedSchemaStage = source.indexOf('markStage("create-protected-schema")', applicationSchemaStage);
    const protectedMembershipStart = source.lastIndexOf("await withTemporarySetMembership", protectedSchemaStage);
    const finalAssertionStage = source.indexOf('markStage("assert-migration-privileges")', protectedSchemaStage);
    const migrationBlock = source.slice(migrationSchemaStage, applicationSchemaStage);
    const applicationBlock = source.slice(applicationSchemaStage, protectedMembershipStart);
    const protectedBlock = source.slice(protectedMembershipStart, finalAssertionStage);
    const freshPath = source.slice(freshPathStart, finalAssertionStage);
    expect(APP_SCHEMA).toBe("vocabflow_app");
    expect(applicationSchemaStage).toBeGreaterThan(migrationSchemaStage);
    expect(protectedSchemaStage).toBeGreaterThan(applicationSchemaStage);
    expect(freshPath.match(/withTemporarySetMembership\(/g)).toHaveLength(3);
    expect(migrationBlock).toContain("withTemporarySetMembership(tx as unknown as SqlTag, ROLE_NAMES.migration");
    expect(migrationBlock.indexOf("RESET ROLE")).toBeGreaterThan(migrationBlock.indexOf("SET LOCAL ROLE"));
    expect(applicationBlock).toContain("withTemporarySetMembership(tx as unknown as SqlTag, ROLE_NAMES.migration");
    expect(applicationBlock).toContain("CREATE SCHEMA");
    expect(applicationBlock).toContain("AUTHORIZATION");
    expect(applicationBlock).toContain("GRANT USAGE, CREATE ON SCHEMA");
    expect(applicationBlock).toContain("GRANT USAGE ON SCHEMA");
    expect(applicationBlock.indexOf("RESET ROLE")).toBeGreaterThan(applicationBlock.indexOf("SET LOCAL ROLE"));
    expect(protectedBlock).toContain("withTemporarySetMembership(tx as unknown as SqlTag, ROLE_NAMES.owner");
    expect(protectedBlock.indexOf("RESET ROLE")).toBeGreaterThan(protectedBlock.indexOf("SET LOCAL ROLE"));
    expect(source).not.toContain('markStage("configure-public-schema")');
    expect(source).not.toContain("ON SCHEMA public");
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
    expect(queries[0]).toContain("table_schema::text = ?::text");
    expect(queries[0]).toContain("table_name::text = ANY(?::text[])");
    expect(queries[1]).toContain("SELECT ctable.relname AS table_name");
    expect(queries[1]).not.toContain("SELECT c.relname AS table_name");
    expect(queries[1]).toContain("ctable.relname::text = ANY(?::text[])");
    expect(queries[2]).toContain("n.nspname::text = ?::text");
  });

  it("casts role-model arrays and membership parameters", async () => {
    const queries: string[] = [];
    const roles = [ROLE_NAMES.owner, ROLE_NAMES.provision, ROLE_NAMES.migration, ROLE_NAMES.runtime].map((rolname) => ({
      rolname,
      rolcanlogin: rolname !== ROLE_NAMES.owner,
      rolinherit: false,
      rolsuper: false,
      rolcreatedb: false,
      rolcreaterole: false,
      rolreplication: false,
      rolbypassrls: false
    }));
    const results = [
      roles,
      [{ application_database_owner: false, owner_create: false, provision_create: false, migration_create: false, runtime_create: false }],
      [{ forbidden: false }],
      [{ forbidden: false }],
      [{ forbidden: false }],
      [{ provision_to_migration: false, runtime_to_migration: false }]
    ];
    let call = 0;
    const sql = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
      queries.push(strings.join("?"));
      return Promise.resolve(results[call++] ?? []);
    }) as unknown as Parameters<typeof assertRoleModel>[0] & { array(values: unknown[]): unknown };
    sql.array = ((values: unknown[]) => values) as typeof sql.array;

    await expect(assertRoleModel(sql)).resolves.toBeUndefined();
    expect(queries[0]).toContain("rolname::text = ANY(?::text[])");
    expect(queries[2]).toContain("granted.rolname::text = ?::text");
    expect(queries[3]).toContain("granted.rolname::text = ?::text");
    expect(queries[4]).toContain("member.rolname::text = ANY(?::text[])");
    expect(queries[5]).toContain("AS provision_to_migration");
  });

  it("fails if a bootstrap-to-migration membership remains", async () => {
    const queries: string[] = [];
    const sql = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
      queries.push(strings.join("?"));
      return Promise.resolve([{ forbidden: false }]);
    }) as unknown as Parameters<typeof assertNoResidualBootstrapMembership>[0];
    await expect(assertNoResidualBootstrapMembership(sql)).resolves.toBeUndefined();
    expect(queries[0]).toContain("granted.rolname::text = ?::text");

    const residual = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([{ forbidden: true }])) as unknown as Parameters<typeof assertNoResidualBootstrapMembership>[0];
    await expect(assertNoResidualBootstrapMembership(residual)).rejects.toThrow("BLOCKED_ROLE_MODEL_BOOTSTRAP_TO_MIGRATION_MEMBERSHIP");
  });

  it("fails if a bootstrap-to-owner membership remains", async () => {
    const sql = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([{ forbidden: false }])) as unknown as Parameters<typeof assertNoResidualBootstrapOwnerMembership>[0];
    await expect(assertNoResidualBootstrapOwnerMembership(sql)).resolves.toBeUndefined();

    const residual = ((_strings: TemplateStringsArray, ..._values: unknown[]) => Promise.resolve([{ forbidden: true }])) as unknown as Parameters<typeof assertNoResidualBootstrapOwnerMembership>[0];
    await expect(assertNoResidualBootstrapOwnerMembership(residual)).rejects.toThrow("BLOCKED_ROLE_MODEL_BOOTSTRAP_TO_OWNER_MEMBERSHIP");
  });

  it("returns a specific failure for every forbidden membership relation", async () => {
    const success = [
      [{ forbidden: false }],
      [{ forbidden: false }],
      [{ forbidden: false }],
      [{ provision_to_migration: false, runtime_to_migration: false }]
    ];
    await expect(assertMemberships(sequenceSql(success))).resolves.toBeUndefined();

    const cases: Array<{ name: string; results: unknown[][]; code: string }> = [
      {
        name: "bootstrap to owner",
        results: [[{ forbidden: true }]],
        code: "BLOCKED_ROLE_MODEL_BOOTSTRAP_TO_OWNER_MEMBERSHIP"
      },
      {
        name: "bootstrap to migration",
        results: [[{ forbidden: false }], [{ forbidden: true }]],
        code: "BLOCKED_ROLE_MODEL_BOOTSTRAP_TO_MIGRATION_MEMBERSHIP"
      },
      {
        name: "application role to owner",
        results: [[{ forbidden: false }], [{ forbidden: false }], [{ forbidden: true }]],
        code: "BLOCKED_ROLE_MODEL_APP_TO_OWNER_MEMBERSHIP"
      },
      {
        name: "provision to migration",
        results: [[{ forbidden: false }], [{ forbidden: false }], [{ forbidden: false }], [{ provision_to_migration: true, runtime_to_migration: false }]],
        code: "BLOCKED_ROLE_MODEL_PROVISION_TO_MIGRATION_MEMBERSHIP"
      },
      {
        name: "runtime to migration",
        results: [[{ forbidden: false }], [{ forbidden: false }], [{ forbidden: false }], [{ provision_to_migration: false, runtime_to_migration: true }]],
        code: "BLOCKED_ROLE_MODEL_RUNTIME_TO_MIGRATION_MEMBERSHIP"
      }
    ];

    for (const testCase of cases) {
      await expect(assertMemberships(sequenceSql(testCase.results)), testCase.name).rejects.toThrow(testCase.code);
    }
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
