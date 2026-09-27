import { getConnectionTarget } from "../config/database-targets";
import { openSql, readContext, runMigrations, assertPostConnectIdentity } from "./db-core";
import { assertResolvedTargetBeforeMutation } from "./runtime-validation";
import { authorizeProductionRelease, parseProductionReleaseArgs, resolveProductionConnection, runAuthorizedProductionMutation } from "./production-release-safety";
import { planApplicationMigrationsReadOnly } from "./db-migration-executor";

function parseMigrationArgs(args: readonly string[]) {
  let apply = false;
  let dryRun = false;
  const safetyArgs: string[] = [];
  for (const arg of args) {
    if (arg === "--apply") {
      if (apply) throw new Error("CLI_ARGUMENT_INVALID");
      apply = true;
    } else if (arg === "--dry-run") {
      if (dryRun) throw new Error("CLI_ARGUMENT_INVALID");
      dryRun = true;
    } else safetyArgs.push(arg);
  }
  if (apply && dryRun) throw new Error("CLI_ARGUMENT_INVALID");
  return { apply, dryRun: dryRun || !apply, options: parseProductionReleaseArgs(safetyArgs) };
}

async function productionMigration() {
  const parsed = parseMigrationArgs(process.argv.slice(2));
  const target = authorizeProductionRelease({
    options: parsed.options,
    mode: parsed.apply ? "mutation" : "read-only",
    environment: process.env,
  });
  const connection = await resolveProductionConnection({ purpose: "migration", environment: process.env });
  if (!parsed.apply) {
    const sql = openSql(connection.url);
    try {
      await assertPostConnectIdentity(sql, target);
      const plan = await planApplicationMigrationsReadOnly(sql);
      console.log(`PRODUCTION_MIGRATION_PLAN=PASS`);
      console.log(`MIGRATIONS_TOTAL=${plan.migrationCount}`);
      console.log(`MIGRATIONS_APPLIED_THROUGH=${plan.appliedThrough ?? "NONE"}`);
      console.log(`MIGRATIONS_PENDING=${plan.pendingCount}`);
      console.log(`PENDING_MIGRATION_HASHES=${plan.pendingHashes.join(",") || "(none)"}`);
      console.log("DATABASE_MUTATIONS=0");
    } finally {
      await sql.end({ timeout: 5 });
    }
    return;
  }
  await runAuthorizedProductionMutation({ options: parsed.options, environment: process.env }, async (confirmedTarget) => {
    if (confirmedTarget.branchId !== target.branchId) throw new Error("PRODUCTION_TARGET_CHANGED_AFTER_PREFLIGHT");
    await runMigrations(connection.url, confirmedTarget, { productionForwardOnly: true });
  });
  console.log("DB_MIGRATE=PASS");
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const { context, environment } = readContext();
  if (environment === "production" || rawArgs.includes("production") || process.env.DATABASE_ENV === "production") {
    await productionMigration();
    return;
  }
  if (rawArgs.length > 0) throw new Error("CLI_ARGUMENT_INVALID");
  const target = getConnectionTarget(environment === "test" ? "test" : "development", "migration");
  const { url } = await assertResolvedTargetBeforeMutation({
    context,
    source: context === "ci-test" ? "github-actions" : "dev-launcher",
    environment,
    purpose: "migration",
    operation: "db-migrate",
    target,
  });
  await runMigrations(url, target);
  console.log("DB_MIGRATE=PASS");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "";
  console.error(/^[A-Z][A-Z0-9_]{2,79}$/.test(message) ? message : "DB_MIGRATE_FAILED");
  process.exitCode = 1;
});
