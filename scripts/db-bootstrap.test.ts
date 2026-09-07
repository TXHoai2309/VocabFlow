import { describe, expect, it } from "vitest";
import { createLoginRole, ROLE_NAMES, type BootstrapRoleCredentials } from "./db-bootstrap";

type CapturedQuery = { strings: string[]; values: unknown[] };

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
});
