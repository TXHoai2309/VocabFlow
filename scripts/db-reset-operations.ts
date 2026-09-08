import type postgres from "postgres";
import { APP_SCHEMA, MIGRATION_SCHEMA } from "@vocabflow/contracts";
import { DATABASE_RESET_POLICY } from "../config/database-reset-policy";

type SqlClient = ReturnType<typeof postgres>;

export async function resetApplicationScope(sql: SqlClient) {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(89421732)`;
    for (const objectName of DATABASE_RESET_POLICY.applicationTables) {
      const [schema, table] = objectName.split(".");
      if (schema !== APP_SCHEMA || !table) throw new Error("INVALID_RESET_POLICY");
      await tx`DROP TABLE IF EXISTS ${tx.unsafe(`"${schema}"."${table}"`)}`;
    }
    for (const objectName of DATABASE_RESET_POLICY.applicationEnumTypes) {
      const [schema, type] = objectName.split(".");
      if (schema !== APP_SCHEMA || !type) throw new Error("INVALID_RESET_POLICY");
      await tx`DROP TYPE IF EXISTS ${tx.unsafe(`"${schema}"."${type}"`)}`;
    }
    const [migrationSchema, migrationTable] = DATABASE_RESET_POLICY.migrationTrackingObjects[0].split(".");
    if (migrationSchema !== MIGRATION_SCHEMA || !migrationTable) throw new Error("INVALID_RESET_POLICY");
    const migrationExists = await tx<{ exists: boolean }[]>`SELECT to_regclass(${`${migrationSchema}.${migrationTable}`}) IS NOT NULL AS exists`;
    if (migrationExists[0]?.exists) await tx`TRUNCATE TABLE ${tx.unsafe(`"${migrationSchema}"."${migrationTable}"`)}`;
  });
}

export async function getIdentitySnapshot(sql: SqlClient) {
  const rows = await sql<{ id: number; environment: string; provider: string; project_id: string; branch_id: string; identity_version: number }[]>`
    SELECT id, environment, provider, project_id, branch_id, identity_version
    FROM vocabflow_meta.environment_identity
    ORDER BY id
  `;
  return rows;
}

export async function assertIdentitySnapshot(sql: SqlClient, before: Awaited<ReturnType<typeof getIdentitySnapshot>>) {
  const after = await getIdentitySnapshot(sql);
  if (JSON.stringify(after) !== JSON.stringify(before)) throw new Error("PROTECTED_IDENTITY_CHANGED");
}
