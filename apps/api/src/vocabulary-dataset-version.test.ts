import { describe, expect, it } from "vitest";
import { vocabularyDatasetVersion } from "./vocabulary-dataset-version";

const localDevelopmentV2 = {
  VOCAB_DATASET_VERSION: "v2",
  VOCABFLOW_ENV: "development",
  DATABASE_ENV: "development",
  EXECUTION_CONTEXT: "local-development"
} as const;

describe("Development vocabulary dataset flag", () => {
  it("selects V2 only for explicitly flagged local Development", () => {
    expect(vocabularyDatasetVersion(localDevelopmentV2)).toBe("v2");
  });

  it("rolls back to legacy when the flag is removed or changed", () => {
    expect(vocabularyDatasetVersion({ ...localDevelopmentV2, VOCAB_DATASET_VERSION: undefined })).toBe("legacy");
    expect(vocabularyDatasetVersion({ ...localDevelopmentV2, VOCAB_DATASET_VERSION: "legacy" })).toBe("legacy");
  });

  it("fails closed to legacy outside local Development", () => {
    expect(vocabularyDatasetVersion({ ...localDevelopmentV2, DATABASE_ENV: "production" })).toBe("legacy");
    expect(vocabularyDatasetVersion({ ...localDevelopmentV2, EXECUTION_CONTEXT: "vercel-preview" })).toBe("legacy");
    expect(vocabularyDatasetVersion({ ...localDevelopmentV2, VERCEL_ENV: "production" })).toBe("legacy");
  });
});

describe("Production V2 cutover selection", () => {
  const production = {
    VOCAB_DATASET_VERSION: "v2", VOCABFLOW_ENV: "production", DATABASE_ENV: "production",
    EXECUTION_CONTEXT: "vercel-production", VERCEL_ENV: "production",
    DATABASE_URL: "postgresql://vocabflow_runtime:fixture-only@ep-twilight-firefly-a1dugz2x-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  };

  it("selects only the staged production runtime endpoint with consistent markers", () => {
    expect(vocabularyDatasetVersion(production)).toBe("v2");
    expect(vocabularyDatasetVersion({ ...production, DATABASE_URL: production.DATABASE_URL.replace("-pooler", "") })).toBe("v2");
  });

  it.each([
    { VOCAB_DATASET_VERSION: "legacy" }, { VOCAB_DATASET_VERSION: undefined },
    { DATABASE_ENV: "development" }, { VOCABFLOW_ENV: "development" },
    { EXECUTION_CONTEXT: "local-development" }, { VERCEL_ENV: "preview" },
    { DATABASE_URL: undefined }, { DATABASE_URL: "not-a-connection" },
    { DATABASE_URL: production.DATABASE_URL.replace("ep-twilight-firefly-a1dugz2x", "ep-ancient-tree-a15xogc1") },
    { DATABASE_URL: production.DATABASE_URL.replace("vocabflow_runtime", "neondb_owner") },
    { DATABASE_URL: production.DATABASE_URL.replace("/neondb?", "/wrong?") },
  ])("keeps V2 disabled on an inconsistent target: %j", (override) => {
    expect(vocabularyDatasetVersion({ ...production, ...override })).toBe("legacy");
  });
});

describe("Vercel Preview V2 selection", () => {
  const preview = {
    VOCAB_DATASET_VERSION: "v2",
    VOCABFLOW_ENV: "development",
    DATABASE_ENV: "development",
    EXECUTION_CONTEXT: "vercel-preview",
    VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://vocabflow_runtime:fixture-only@ep-ancient-tree-a15xogc1.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  };

  it("selects the V2 Development source for a correctly marked Preview deployment", () => {
    expect(vocabularyDatasetVersion(preview)).toBe("v2");
    expect(vocabularyDatasetVersion({
      ...preview,
      DATABASE_URL: preview.DATABASE_URL.replace("ep-ancient-tree-a15xogc1.", "ep-ancient-tree-a15xogc1-pooler.c-4."),
    })).toBe("v2");
  });

  it.each([
    { EXECUTION_CONTEXT: "local-development" },
    { VERCEL_ENV: "production" },
    { DATABASE_ENV: "production" },
    { VOCABFLOW_ENV: "production" },
    { VOCAB_DATASET_VERSION: "legacy" },
    { DATABASE_URL: preview.DATABASE_URL.replace("ep-ancient-tree-a15xogc1", "ep-twilight-firefly-a1dugz2x") },
    { DATABASE_URL: preview.DATABASE_URL.replace("vocabflow_runtime", "neondb_owner") },
  ])("fails closed for mismatched Preview configuration: %j", (override) => {
    expect(vocabularyDatasetVersion({ ...preview, ...override })).toBe("legacy");
  });
});

describe("Owner-selected publication in canonical Development", () => {
  const dev = {
    VOCAB_DATASET_VERSION: "owner-development", VOCABFLOW_ENV: "development",
    DATABASE_ENV: "development", EXECUTION_CONTEXT: "vercel-preview", VERCEL_ENV: "preview",
    DATABASE_URL: "postgresql://vocabflow_runtime:fixture@ep-ancient-tree-a15xogc1.ap-southeast-1.aws.neon.tech/neondb",
  };
  it("uses the shared publication projection only for the verified Dev runtime", () => {
    expect(vocabularyDatasetVersion(dev)).toBe("owner-production");
    expect(vocabularyDatasetVersion({ ...dev, DATABASE_URL: dev.DATABASE_URL.replace("ep-ancient-tree-a15xogc1.", "ep-ancient-tree-a15xogc1-pooler.c-4.") })).toBe("owner-production");
  });
  it.each([
    { VERCEL_ENV: "production" }, { VOCABFLOW_ENV: "production" }, { DATABASE_ENV: "production" },
    { EXECUTION_CONTEXT: "local-development" }, { VOCAB_DATASET_VERSION: "owner-production" },
    { DATABASE_URL: dev.DATABASE_URL.replace("ep-ancient-tree-a15xogc1", "ep-twilight-firefly-a1dugz2x") },
    { DATABASE_URL: dev.DATABASE_URL.replace("vocabflow_runtime", "vocabflow_migration") },
    { DATABASE_URL: dev.DATABASE_URL.replace("/neondb", "/wrong") },
  ])("does not broaden another target or a privileged credential: %j", override => {
    expect(vocabularyDatasetVersion({ ...dev, ...override })).toBe("legacy");
  });
});
