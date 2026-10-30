import { describe, expect, it, vi } from "vitest";
import { PgDialect } from "drizzle-orm/pg-core";
import { vocabularyDatasetPredicate, vocabularyDatasetVersion, vocabularyProjectionTable, OWNER_PRODUCTION_SOURCE, OWNER_PRODUCTION_CATALOG_ID } from "./vocabulary-dataset-version";
import { readPublicLearningIndex } from "./public-learning-index";

const production = { VOCAB_DATASET_VERSION: "owner-production", VERCEL_ENV: "production", VOCABFLOW_ENV: "production", DATABASE_ENV: "production", EXECUTION_CONTEXT: "vercel-production", DATABASE_URL: "postgres://vocabflow_runtime:fixture@ep-twilight-firefly-a1dugz2x-pooler.ap-southeast-1.aws.neon.tech/neondb" };
const dialect = new PgDialect();
describe("owner Production publication gate", () => {
  it("requires the explicit Production target and keeps local publication separate", () => {
    expect(vocabularyDatasetVersion(production)).toBe("owner-production");
    const predicate = dialect.sqlToQuery(vocabularyDatasetPredicate("v", "owner-production"));
    expect(predicate.params).toEqual([OWNER_PRODUCTION_SOURCE, "VOCABFLOW_MASTER_V2_DEV"]);
    expect(predicate.sql).toContain("NOT EXISTS");
    expect(dialect.sqlToQuery(vocabularyProjectionTable("owner-production")).sql).toContain('"owner_editorial_active_projections"');
    expect(dialect.sqlToQuery(vocabularyProjectionTable("owner-local")).sql).toContain('"owner_editorial_local_projections"');
  });
  it.each([
    { VERCEL_ENV: "preview" }, { VERCEL_ENV: undefined }, { VOCABFLOW_ENV: "development" },
    { DATABASE_ENV: "development" }, { EXECUTION_CONTEXT: "local-development" },
    { DATABASE_URL: production.DATABASE_URL.replace("vocabflow_runtime", "vocabflow_migration") },
    { DATABASE_URL: production.DATABASE_URL.replace("ep-twilight-firefly-a1dugz2x-pooler", "other-host") },
    { DATABASE_URL: production.DATABASE_URL.replace("/neondb", "/other") }
  ])("refuses a noncanonical runtime: %j", override => {
    expect(vocabularyDatasetVersion({ ...production, ...override })).toBe("legacy");
  });
  it("does not prune guest state while the compatibility view still serves V2", async () => {
    const execute = vi.fn().mockResolvedValueOnce([{ id: 1, level: null, source_dataset: "VOCABFLOW_MASTER_V2_DEV", tags: [] }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const index = await readPublicLearningIndex({ execute }, "owner-production");
    expect(index.catalogIdentity).toBeUndefined();
  });
  it("announces the new identity only for the complete owner source", async () => {
    const vocabulary = Array.from({ length: 1547 }, (_, i) => ({ id: i + 1, level: null, source_dataset: OWNER_PRODUCTION_SOURCE, tags: i === 0 ? ["EDITORIAL:FIRST_WORDS"] : [] }));
    const execute = vi.fn().mockResolvedValueOnce(vocabulary).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
    const index = await readPublicLearningIndex({ execute }, "owner-production");
    expect(index.catalogIdentity).toBe(OWNER_PRODUCTION_CATALOG_ID);
    expect(index.vocabulary[0]!.tags).toEqual(["EDITORIAL:FIRST_WORDS"]);
  });
});
