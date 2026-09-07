import { describe, expect, it } from "vitest";
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { assertMigrationPrivileges, assertNoApplicationDatabasePrivileges, assertNoResidualBootstrapMembership, assertNoResidualBootstrapOwnerMembership, assertProtectedPrivileges, assertProtectedShape, assertRoleModel, configurePublicSchema, createLoginRole, protectedState, ROLE_NAMES, type BootstrapRoleCredentials, withTemporarySetMembership } from "./db-bootstrap";

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
  }) as unknown as Parameters<typeof assertMigrationPrivileges>[0] & { unsafe(value: string): unknown };
  tag.unsafe = ((value: string) => value) as typeof tag.unsafe;
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

  it("checks migration schema invariants with specific failure codes", async () => {
    const validResults = [
      [{ migration_role_exists: true, schema_exists: true, schema_owner: ROLE_NAMES.migration }],
      [{ public_usage: true, public_create: true }],
      [{ migration_schema_usage: true, migration_schema_create: true }]
    ];
    const queries: string[] = [];
    await expect(assertMigrationPrivileges(sequenceSql(validResults, queries), undefined as never)).resolves.toBeUndefined();
    expect(queries).toHaveLength(3);
    expect(queries[0]).toContain("rolname::text = ?::text");
    expect(queries[0]).toContain("to_regnamespace(?::text)");
    expect(queries[1]).toContain("has_schema_privilege(?::text, 'public'::text, 'USAGE')");
    expect(queries[2]).toContain("has_schema_privilege(?::text, ?::text, 'USAGE')");

    const cases: Array<{ name: string; results: unknown[][]; code: string }> = [
      {
        name: "migration role missing",
        results: [[{ migration_role_exists: false, schema_exists: true, schema_owner: ROLE_NAMES.migration }]],
        code: "BLOCKED_ROLE_MODEL_MIGRATION_ROLE_MISSING"
      },
      {
        name: "drizzle schema missing",
        results: [[{ migration_role_exists: true, schema_exists: false, schema_owner: null }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_MISSING"
      },
      {
        name: "drizzle schema owner is wrong",
        results: [[{ migration_role_exists: true, schema_exists: true, schema_owner: ROLE_NAMES.owner }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_OWNER"
      },
      {
        name: "public schema usage is missing",
        results: [validResults[0] ?? [], [{ public_usage: false, public_create: true }]],
        code: "BLOCKED_ROLE_MODEL_PUBLIC_SCHEMA_USAGE"
      },
      {
        name: "public schema create is missing",
        results: [validResults[0] ?? [], [{ public_usage: true, public_create: false }]],
        code: "BLOCKED_ROLE_MODEL_PUBLIC_SCHEMA_CREATE"
      },
      {
        name: "drizzle schema usage is missing",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ migration_schema_usage: false, migration_schema_create: true }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_USAGE"
      },
      {
        name: "drizzle schema create is missing",
        results: [validResults[0] ?? [], validResults[1] ?? [], [{ migration_schema_usage: true, migration_schema_create: false }]],
        code: "BLOCKED_ROLE_MODEL_DRIZZLE_SCHEMA_CREATE"
      }
    ];

    for (const testCase of cases) {
      await expect(assertMigrationPrivileges(sequenceSql(testCase.results), undefined as never), testCase.name).rejects.toThrow(testCase.code);
    }
  });

  it("emits explicit parameter types for every migration privilege query", async () => {
    const builtQueries: BuiltQuery[] = [];
    const capture = capturePostgresSql([
      [{ migration_role_exists: true, schema_exists: true, schema_owner: ROLE_NAMES.migration }],
      [{ public_usage: true, public_create: true }],
      [{ migration_schema_usage: true, migration_schema_create: true }]
    ], builtQueries);

    try {
      await expect(assertMigrationPrivileges(capture.tag, undefined as never)).resolves.toBeUndefined();
    } finally {
      await capture.close();
    }

    expect(builtQueries).toHaveLength(3);
    expect(builtQueries[0]?.text).toContain("rolname::text = $1::text");
    expect(builtQueries[0]?.text).toContain("to_regnamespace($2::text)");
    expect(builtQueries[0]?.text).toContain("n.nspname::text = $3::text");
    expect(builtQueries[1]?.text).toContain("has_schema_privilege($1::text, 'public'::text, 'USAGE')");
    expect(builtQueries[1]?.text).toContain("has_schema_privilege($2::text, 'public'::text, 'CREATE')");
    expect(builtQueries[2]?.text).toContain("has_schema_privilege($1::text, $2::text, 'USAGE')");
    expect(builtQueries[2]?.text).toContain("has_schema_privilege($3::text, $4::text, 'CREATE')");
    for (const query of builtQueries) {
      expect(query.text).not.toMatch(/'\$\d/);
    }
  });

  it("runs public schema configuration before the fresh-target migration assertion", () => {
    const source = readFileSync(join(process.cwd(), "scripts", "db-bootstrap.ts"), "utf8");
    const freshPathStart = source.indexOf("if (!credentials) throw new Error(\"ROLE_CREDENTIALS_REQUIRED\")");
    const configurePublicSchema = source.indexOf('markStage("configure-public-schema")', freshPathStart);
    const migrationAssertion = source.indexOf('markStage("assert-migration-privileges")', freshPathStart);
    const resetRole = source.lastIndexOf("await tx`RESET ROLE`", configurePublicSchema);
    expect(freshPathStart).toBeGreaterThanOrEqual(0);
    expect(configurePublicSchema).toBeGreaterThan(freshPathStart);
    expect(resetRole).toBeGreaterThan(freshPathStart);
    expect(resetRole).toBeLessThan(configurePublicSchema);
    expect(migrationAssertion).toBeGreaterThan(configurePublicSchema);
  });

  it("configures public schema in the bootstrap context and checks the ACL immediately", async () => {
    const builtQueries: BuiltQuery[] = [];
    const capture = capturePostgresSql([
      [{
        public_schema_exists: true,
        public_owner: "pg_database_owner",
        current_user_is_bootstrap: true,
        session_user_is_bootstrap: true,
        current_user_is_public_owner: false,
        current_user_is_database_owner: true,
        current_user_is_superuser: false,
        current_user_in_public_owner: true,
        current_user_create_grantable: false
      }],
      [],
      [],
      [{
        migration_public_usage: true,
        migration_public_create: true,
        migration_acl_usage: true,
        migration_acl_create: true,
        provision_public_create: false,
        runtime_public_create: false
      }],
      []
    ], builtQueries);

    try {
      await expect(configurePublicSchema(capture.tag)).resolves.toBeUndefined();
    } finally {
      await capture.close();
    }

    expect(builtQueries).toHaveLength(5);
    expect(builtQueries[0]?.text).toContain("current_user::text = $1::text");
    expect(builtQueries[0]?.text).toContain("session_user::text = $2::text");
    expect(builtQueries[0]?.text).toContain("public_owner");
    expect(builtQueries[1]?.text).toContain("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
    expect(builtQueries[2]?.text).toContain(`GRANT USAGE, CREATE ON SCHEMA public TO "${ROLE_NAMES.migration}"`);
    expect(builtQueries[3]?.text).toContain("has_schema_privilege(role_ids.migration_role_oid::oid, role_ids.public_schema_oid::oid, 'USAGE'::text)");
    expect(builtQueries[3]?.text).toContain("has_schema_privilege(role_ids.migration_role_oid::oid, role_ids.public_schema_oid::oid, 'CREATE'::text)");
    expect(builtQueries[3]?.text).toContain("privilege.grantee = role_ids.migration_role_oid");
    expect(builtQueries[4]?.text).toContain(`GRANT USAGE ON SCHEMA public TO "${ROLE_NAMES.runtime}"`);
    for (const parameter of [1, 2]) {
      expect(builtQueries[0]?.text).toContain(`$${parameter}::text`);
    }
    for (const parameter of [1, 2, 3]) {
      expect(builtQueries[3]?.text).toContain(`$${parameter}::text`);
    }
    expect(builtQueries[3]?.text).not.toMatch(/'\$\d/);
    expect(builtQueries[2]?.text.indexOf("REVOKE")).toBe(-1);

    const source = readFileSync(join(process.cwd(), "scripts", "db-bootstrap.ts"), "utf8");
    const functionStart = source.indexOf("export async function configurePublicSchema");
    const functionEnd = source.indexOf("export async function bootstrapProtectedMetadata", functionStart);
    const functionSource = source.slice(functionStart, functionEnd);
    expect(functionSource.indexOf('markSubstage("public-grant-migration")')).toBeLessThan(functionSource.indexOf('markSubstage("public-post-grant-check")'));
    expect(functionSource).not.toContain("REVOKE CREATE ON SCHEMA public FROM vocabflow_migration");
  });

  it("fails closed when public schema grant authority is unavailable", async () => {
    const queries: string[] = [];
    const sql = sequenceSql([[
      {
        public_schema_exists: true,
        public_owner: "pg_database_owner",
        current_user_is_bootstrap: true,
        session_user_is_bootstrap: true,
        current_user_is_public_owner: false,
        current_user_is_database_owner: false,
        current_user_is_superuser: false,
        current_user_in_public_owner: false,
        current_user_create_grantable: false
      }
    ]], queries) as Parameters<typeof configurePublicSchema>[0];
    await expect(configurePublicSchema(sql)).rejects.toThrow("BLOCKED_ROLE_MODEL_PUBLIC_SCHEMA_GRANT_AUTHORITY");
    expect(queries).toHaveLength(1);
  });

  it("fails closed when the grant is not executed by the bootstrap identity", async () => {
    const sql = sequenceSql([[
      {
        public_schema_exists: true,
        public_owner: "pg_database_owner",
        current_user_is_bootstrap: false,
        session_user_is_bootstrap: true,
        current_user_is_public_owner: true,
        current_user_is_database_owner: false,
        current_user_is_superuser: true,
        current_user_in_public_owner: true,
        current_user_create_grantable: true
      }
    ]]) as Parameters<typeof configurePublicSchema>[0];
    await expect(configurePublicSchema(sql)).rejects.toThrow("BLOCKED_ROLE_MODEL_PUBLIC_SCHEMA_GRANT_CONTEXT");
  });

  it("fails closed when the public migration grant is not effective", async () => {
    const sql = sequenceSql([
      [{
        public_schema_exists: true,
        public_owner: "pg_database_owner",
        current_user_is_bootstrap: true,
        session_user_is_bootstrap: true,
        current_user_is_public_owner: false,
        current_user_is_database_owner: false,
        current_user_is_superuser: false,
        current_user_in_public_owner: true,
        current_user_create_grantable: false
      }],
      [],
      [],
      [{
        migration_public_usage: true,
        migration_public_create: false,
        migration_acl_usage: true,
        migration_acl_create: false,
        provision_public_create: false,
        runtime_public_create: false
      }]
    ]) as Parameters<typeof configurePublicSchema>[0];
    await expect(configurePublicSchema(sql)).rejects.toThrow("BLOCKED_ROLE_MODEL_PUBLIC_SCHEMA_GRANT_NOT_EFFECTIVE");
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
      [{ count: "0" }],
      [{ count: "0" }],
      [{ count: "0" }]
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
    expect(queries[2]).toContain("member.rolname::text = ANY(?::text[])");
    expect(queries[3]).toContain("granted.rolname::text = ?::text");
    expect(queries[4]).toContain("member.rolname::text = ?::text");
  });

  it("fails if a bootstrap-to-migration membership remains", async () => {
    const queries: string[] = [];
    const sql = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
      queries.push(strings.join("?"));
      return Promise.resolve([{ count: "0" }]);
    }) as unknown as Parameters<typeof assertNoResidualBootstrapMembership>[0];
    await expect(assertNoResidualBootstrapMembership(sql)).resolves.toBeUndefined();
    expect(queries[0]).toContain("granted.rolname::text = ?::text");

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
