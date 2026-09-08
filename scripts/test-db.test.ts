import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { formatTrustedDbError, reportTrustedDbFailure } from "./test-db";

const source = readFileSync(join(process.cwd(), "scripts", "test-db.ts"), "utf8");
const mainSource = source.slice(
  source.indexOf("async function main()"),
  source.indexOf("async function getIdentitySnapshotAfterValidation"),
);

function stagePosition(stage: string) {
  const position = mainSource.indexOf(`markStage("${stage}")`);
  expect(position, `missing TRUSTED_DB_STAGE=${stage}`).toBeGreaterThanOrEqual(0);
  return position;
}

describe("trusted DB acceptance diagnostics", () => {
  it("keeps the actual major stage ordering explicit", () => {
    const prefix = [
      "validate-execution-context",
      "resolve-database-configuration",
      "verify-trusted-targets",
      "snapshot-protected-identity",
    ].map(stagePosition);
    expect(prefix).toEqual([...prefix].sort((left, right) => left - right));

    const firstMigration = stagePosition("migrate-first-pass");
    expect(stagePosition("prepare-shared-ci-clean-state")).toBeLessThan(firstMigration);
    expect(stagePosition("verify-clean-start-state")).toBeLessThan(firstMigration);

    const commonTail = [
      "migrate-first-pass",
      "verify-first-migration",
      "reset-application-state",
      "migrate-second-pass",
      "verify-second-migration",
      "verify-concurrent-identity",
      "verify-permission-matrix",
    ].map(stagePosition);
    expect(commonTail).toEqual([...commonTail].sort((left, right) => left - right));
  });

  it("preserves PostgreSQL SQLSTATE and stable application error codes", () => {
    const postgresError = Object.assign(new Error("permission denied for schema vocabflow_app"), { code: "42501" });
    expect(formatTrustedDbError(postgresError, {})).toEqual({
      code: "42501",
      message: "permission denied for schema vocabflow_app",
    });
    const wrapped = new Error("Failed query: secret query parameters", { cause: postgresError });
    expect(formatTrustedDbError(wrapped, {})).toEqual(formatTrustedDbError(postgresError, {}));

    expect(formatTrustedDbError(new Error("APPLICATION_SCHEMA_INCOMPLETE"), {})).toEqual({
      code: "APPLICATION_SCHEMA_INCOMPLETE",
      message: "APPLICATION_SCHEMA_INCOMPLETE",
    });
  });

  it("redacts credentials and emits the canonical two-line failure diagnostic", () => {
    const databaseUrl = "postgresql://vocabflow_runtime:top-secret@db.example/neondb";
    const apiKey = "napi_super_secret_key";
    const logs: string[] = [];
    const error = Object.assign(
      new Error(`connection failed ${databaseUrl}\npassword=top-secret token=session-secret ${apiKey}`),
      { code: "08006" },
    );

    reportTrustedDbFailure(error, (message) => logs.push(message), {
      NEON_TEST_RUNTIME_DATABASE_URL: databaseUrl,
      NEON_API_KEY: apiKey,
    });

    expect(logs).toHaveLength(2);
    expect(logs[0]).toContain("TRUSTED_DB_ERROR code=08006 message=");
    expect(logs[1]).toBe("TRUSTED_DB_STATUS=FAIL");
    expect(logs.join("\n")).not.toContain(databaseUrl);
    expect(logs.join("\n")).not.toContain("top-secret");
    expect(logs.join("\n")).not.toContain("session-secret");
    expect(logs.join("\n")).not.toContain(apiKey);
    expect(logs.join("\n")).not.toContain("\npassword=");
  });

  it("keeps the schema-qualified migrate-reset-migrate acceptance path", () => {
    expect(mainSource.match(/await runMigrations\(migrationUrl, migrationTarget\)/g)).toHaveLength(2);
    expect(mainSource.match(/await resetApplicationScope\(reset\)/g)).toHaveLength(2);
    expect(mainSource.match(/await assertMigrationStateZero\(reset\)/g)).toHaveLength(2);
    expect(mainSource.match(/await assertApplicationTablesAbsent\(reset\)/g)).toHaveLength(2);
    expect(mainSource.match(/await assertIdentitySnapshot\(reset, beforeIdentity\)/g)).toHaveLength(2);
    expect(source).toContain("vocabflow_app.verification");
    expect(source).toContain("vocabflow_meta.environment_identity");
  });
});
