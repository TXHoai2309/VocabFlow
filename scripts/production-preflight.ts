import type { DatabasePurpose } from "@vocabflow/contracts";
import { assertPostConnectIdentity, openSql, readMigrationState } from "./db-core";
import { resolveProductionConnection } from "./production-release-safety";

type PreflightPurpose = Extract<DatabasePurpose, "runtime" | "migration">;
type ProductionConnection = Pick<Awaited<ReturnType<typeof resolveProductionConnection>>, "target" | "url">;

export type ProductionPreflightDependencies = {
  resolveConnection: (input: {
    purpose: PreflightPurpose;
    environment: NodeJS.ProcessEnv;
  }) => Promise<ProductionConnection>;
  openSql: (url: string) => ReturnType<typeof openSql>;
};

const defaultDependencies: ProductionPreflightDependencies = {
  resolveConnection: ({ purpose, environment }) => resolveProductionConnection({ purpose, environment }),
  openSql,
};

async function verifyReadOnlyConnection(
  purpose: PreflightPurpose,
  environment: NodeJS.ProcessEnv,
  dependencies: ProductionPreflightDependencies,
): Promise<number | undefined> {
  const connection = await dependencies.resolveConnection({ purpose, environment });
  const sql = dependencies.openSql(connection.url);
  try {
    return await sql.begin(async (tx) => {
      await tx`SET TRANSACTION READ ONLY`;
      await assertPostConnectIdentity(tx as unknown as ReturnType<typeof openSql>, connection.target);
      await tx`SELECT 1`;
      if (purpose === "migration") {
        return readMigrationState(tx as unknown as ReturnType<typeof openSql>);
      }
      return undefined;
    });
  } finally {
    await sql.end({ timeout: 5 });
  }
}

export async function readProductionPreflightState(
  environment: NodeJS.ProcessEnv,
  dependencies: ProductionPreflightDependencies = defaultDependencies,
): Promise<number> {
  // Validate runtime connectivity/identity independently. It must never read
  // the Drizzle ledger, which is deliberately accessible only to migration.
  await verifyReadOnlyConnection("runtime", environment, dependencies);

  const migrationCount = await verifyReadOnlyConnection("migration", environment, dependencies);
  if (migrationCount === undefined) throw new Error("PRODUCTION_MIGRATION_PREFLIGHT_FAILED");
  return migrationCount;
}
