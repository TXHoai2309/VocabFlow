import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { formatTrustedDbError, reportTrustedDbFailure, resolveTrustedDbSuite } from "./test-db";
import { buildCapQueueExpectation } from "./test-review-queue-db";

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
      "verify-us26-us27-taxonomy",
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

const originalSuite = process.env.TRUSTED_DB_SUITE;

afterEach(() => {
  if (originalSuite === undefined) delete process.env.TRUSTED_DB_SUITE;
  else process.env.TRUSTED_DB_SUITE = originalSuite;
});

describe("trusted DB suite selection", () => {
  it("defaults to the canonical full suite", () => {
    delete process.env.TRUSTED_DB_SUITE;
    expect(resolveTrustedDbSuite()).toBe("full");
  });

  it("accepts only the explicit US-08 scoped suite", () => {
    expect(resolveTrustedDbSuite("us08-review-queue")).toBe("us08-review-queue");
    expect(() => resolveTrustedDbSuite("us07-review-runtime")).toThrow("TRUSTED_DB_SUITE_INVALID");
    expect(() => resolveTrustedDbSuite("skip-us07")).toThrow("TRUSTED_DB_SUITE_INVALID");
  });

  it("keeps the canonical workflow default and exposes an explicit choice", () => {
    const workflow = readFileSync(join(process.cwd(), ".github/workflows/trusted-db.yml"), "utf8").replace(/\r\n/g, "\n");
    expect(workflow).toContain("default: full");
    expect(workflow).toContain("- us08-review-queue");
    expect(workflow).toContain("TRUSTED_DB_SUITE: ${{ inputs.suite || 'full' }}");
    const runner = readFileSync(join(process.cwd(), "scripts/test-db.ts"), "utf8");
    expect(runner).toContain('if (suite === "full")');
    expect(runner).toContain('await runUs07TrustedDbSuite');
    expect(runner).toContain('await runUs08TrustedDbSuite');
    expect(runner).toContain('await runUs26Us27TrustedDbSuite');
    expect(runner).toContain('markStage("verify-us08-review-queue")');
  });
});

describe("US-08 cap harness contract model", () => {
  it("keeps the 19-DUE NEW-cap contract explicit", () => {
    const expectation = buildCapQueueExpectation(
      "2026-09-14",
      Array.from({ length: 19 }, (_, index) => index + 1),
      Array.from({ length: 11 }, (_, index) => index + 20),
    );
    expect(expectation).toEqual({
      reviewDate: "2026-09-14",
      dueCount: 19,
      newCount: 11,
      returnedDueIds: Array.from({ length: 19 }, (_, index) => index + 1),
      returnedNewIds: Array.from({ length: 10 }, (_, index) => index + 20),
      queueIds: Array.from({ length: 19 }, (_, index) => index + 1).concat(Array.from({ length: 10 }, (_, index) => index + 20)),
      newSuppressed: false
    });
  });

  it("keeps the 20-DUE suppression contract separate from total NEW count", () => {
    const expectation = buildCapQueueExpectation("2026-09-14", Array.from({ length: 20 }, (_, index) => index + 1), [21]);
    expect(expectation.dueCount).toBe(20);
    expect(expectation.newCount).toBe(1);
    expect(expectation.returnedNewIds).toEqual([]);
    expect(expectation.queueIds).toHaveLength(20);
    expect(expectation.newSuppressed).toBe(true);
  });

  it("keeps the 21-DUE canonical first-20 contract explicit", () => {
    const expectation = buildCapQueueExpectation("2026-09-14", Array.from({ length: 21 }, (_, index) => index + 1), []);
    expect(expectation.dueCount).toBe(21);
    expect(expectation.newCount).toBe(0);
    expect(expectation.returnedDueIds).toEqual(Array.from({ length: 20 }, (_, index) => index + 1));
    expect(expectation.returnedNewIds).toEqual([]);
    expect(expectation.queueIds).toHaveLength(20);
    expect(expectation.newSuppressed).toBe(true);
  });
});
