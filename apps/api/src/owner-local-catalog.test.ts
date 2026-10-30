import { describe, expect, it } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { vocabularyDatasetPredicate, vocabularyDatasetVersion, vocabularyProjectionTable } from "./vocabulary-dataset-version";

const local = { VOCAB_DATASET_VERSION: "owner-local", VOCABFLOW_ENV: "development", DATABASE_ENV: "development", DATABASE_DRIVER: "postgres-js", EXECUTION_CONTEXT: "local-development", DATABASE_URL: "postgres://fixture@127.0.0.1:55432/vocabflow_dev" };
describe("owner catalog has a dedicated local authority", () => {
  it("selects its own source/projection, leaving Master V2 independent", () => {
    expect(vocabularyDatasetVersion(local)).toBe("owner-local");
    const dialect = new PgDialect();
    expect(dialect.sqlToQuery(vocabularyDatasetPredicate("v", "owner-local")).params).toEqual(["VOCABFLOW_OWNER_EDITORIAL_LOCAL"]);
    expect(dialect.sqlToQuery(vocabularyProjectionTable("owner-local")).sql).toContain('"owner_editorial_local_projections"');
    expect(dialect.sqlToQuery(vocabularyProjectionTable("v2")).sql).toContain('"master_v2_development_projections"');
  });
  it.each([
    { VERCEL_ENV: "production" }, { VERCEL_ENV: "preview" }, { VOCABFLOW_ENV: "production" },
    { DATABASE_ENV: "production" }, { DATABASE_DRIVER: "neon-http" }, { EXECUTION_CONTEXT: "vercel-production" },
    { DATABASE_URL: "postgres://fixture@remote.test:55432/vocabflow_dev" },
    { DATABASE_URL: "http://fixture@127.0.0.1:55432/vocabflow_dev" },
    { DATABASE_URL: "postgres://fixture@127.0.0.1:55432/other" }
  ])("does not enable the owner-local dataset outside its boundary: %j", override => {
    expect(vocabularyDatasetVersion({ ...local, ...override })).toBe("legacy");
  });
});
