import { describe, expect, it, vi } from "vitest";
import type { CatalogRecord, CatalogValidation, CatalogRow } from "./import-vocabulary-catalog";
import {
  parseCatalogImportCliArgs,
  renderReport,
  runProductionCatalogImport,
  SOURCE_DATASET_ID,
} from "./import-vocabulary-catalog";
import { getConnectionTarget } from "../config/database-targets";
import type { NeonApiClient } from "./neon-target-verifier";
import { openSql } from "./db-core";

const target = getConnectionTarget("production", "runtime");
const branch = target.branchId;
const runtimeUrl = "postgresql://vocabflow_runtime:fixture@ep-production-pooler.neon.tech/neondb";
const environment = {
  EXECUTION_CONTEXT: "local-development",
  VOCABFLOW_ENV: "production",
  DATABASE_ENV: "production",
  NEON_API_KEY: "synthetic-fixture-key",
  PRODUCTION_DATABASE_URL: runtimeUrl,
  // Decoy operator variables prove catalog import never selects these roles.
  DATABASE_URL: "postgresql://vocabflow_runtime:development-decoy@ep-development-pooler.neon.tech/neondb",
  PRODUCTION_MIGRATION_DATABASE_URL: "postgresql://vocabflow_migration:migration-decoy@ep-production-pooler.neon.tech/neondb",
  PRODUCTION_BOOTSTRAP_DATABASE_URL: "postgresql://neondb_owner:owner-decoy@ep-production-pooler.neon.tech/neondb",
} as NodeJS.ProcessEnv;
const applyOptions = {
  target: "production",
  confirmTarget: "production",
  confirmBranch: branch,
};

const record: CatalogRecord = {
  sourceDataset: SOURCE_DATASET_ID,
  sourceRecordId: 100,
  word: "book",
  normalizedWord: "book",
  vietnamese: "sách",
  ipa: null,
  definitionEn: null,
  exampleEn: null,
  topic: null,
  imageUrl: null,
  audioUrl: null,
};

const validation: CatalogValidation = {
  sourceRecords: 1,
  validRecords: [record],
  invalidRecords: [],
  duplicateSourceIdCount: 0,
  duplicateNormalizedWordGroups: 0,
  duplicateNormalizedWordRecords: 0,
  missingImageCount: 0,
  missingAudioCount: 0,
  unusableMediaCount: 0,
  mediaAvailabilityBySourceId: { 100: { image: "MISSING", audio: "MISSING" } },
};

function sourceRow(id: number, word: string, sourceRecordId: number | null = null): CatalogRow {
  return {
    id,
    word,
    ipa: null,
    vietnamese: `${word}-vi`,
    definition_en: null,
    example_en: null,
    image_url: null,
    audio_url: null,
    topic: null,
    enabled: sourceRecordId === null,
    content_version: 1,
    source_dataset: sourceRecordId === null ? null : SOURCE_DATASET_ID,
    source_record_id: sourceRecordId,
  };
}

function neonFixture(overrides: { projectId?: string; branchId?: string; uri?: string } = {}): NeonApiClient {
  return {
    getBranch: vi.fn(async () => ({
      projectId: overrides.projectId ?? target.projectId,
      branchId: overrides.branchId ?? target.branchId,
    })),
    getConnectionUri: vi.fn(async ({ roleName }) => {
      if (roleName !== "vocabflow_runtime") throw new Error("UNEXPECTED_DATABASE_ROLE");
      return { uri: overrides.uri ?? runtimeUrl };
    }),
  };
}

function fakeSql(options: { wrongIdentity?: boolean } = {}) {
  const statements: string[] = [];
  const mutations: string[] = [];
  const importedRows: CatalogRow[] = [];
  let readOnly = false;
  const query = ((strings: TemplateStringsArray, ..._values: unknown[]) => {
    const statement = strings.join("?").replace(/\s+/g, " ").trim();
    const searchable = `${statement} ${_values.map((value) => String(value)).join(" ")}`;
    statements.push(statement);
    if (statement.includes("SET TRANSACTION READ ONLY")) readOnly = true;
    if (/^INSERT INTO/i.test(statement) && searchable.includes("vocabularies") && statement.includes("RETURNING id")) {
      mutations.push("INSERT vocabulary");
      importedRows.push({ ...sourceRow(31, record.word, record.sourceRecordId), ...{
        ipa: record.ipa,
        vietnamese: record.vietnamese,
        definition_en: record.definitionEn,
        example_en: record.exampleEn,
        image_url: record.imageUrl,
        audio_url: record.audioUrl,
        topic: record.topic,
      } });
      return Promise.resolve([{ id: 31 }]);
    }
    if (/^UPDATE/i.test(statement) && searchable.includes("vocabularies")) {
      mutations.push("UPDATE vocabulary");
      return Promise.resolve([{ id: 31 }]);
    }
    if (/^(DELETE FROM|INSERT INTO)/i.test(statement) && searchable.includes("vocabulary_topics")) {
      mutations.push("SYNC vocabulary topics");
      return Promise.resolve([]);
    }
    if (statement.includes("to_regclass")) return Promise.resolve([{ exists: true }]);
    if (statement.includes("SELECT id, environment, provider, project_id, branch_id, identity_version")) {
      return Promise.resolve([{
        id: 1,
        environment: "production",
        provider: "neon",
        project_id: target.projectId,
        branch_id: options.wrongIdentity ? "wrong-branch" : target.branchId,
        identity_version: target.identityVersion,
      }]);
    }
    if (statement.includes("information_schema.columns")) {
      return Promise.resolve([{ source_dataset_exists: true, source_record_id_exists: true }]);
    }
    if (statement.includes("WHERE id BETWEEN 1 AND")) {
      return Promise.resolve([sourceRow(1, "apple"), sourceRow(30, "new")]);
    }
    if (statement.includes("ORDER BY source_record_id ASC")) return Promise.resolve([...importedRows]);
    if (statement.includes("learner_progress")) return Promise.resolve([{ count: "4" }]);
    if (statement.includes("review_events")) return Promise.resolve([{ count: "7" }]);
    return Promise.resolve([]);
  }) as unknown as ReturnType<typeof openSql>;
  Object.assign(query, {
    unsafe: (value: string) => value,
    array: (values: unknown[]) => values,
    begin: async <T>(operation: (transaction: ReturnType<typeof openSql>) => Promise<T>) => operation(query),
    end: vi.fn(async () => undefined),
  });
  return {
    client: query,
    statements,
    mutations,
    get readOnly() { return readOnly; },
  };
}

describe("production vocab:import-catalog operator path", () => {
  it("preserves the legacy development/test CLI shape and parses explicit production release flags", () => {
    expect(parseCatalogImportCliArgs([])).toEqual({ apply: false });
    expect(parseCatalogImportCliArgs(["--apply"])).toEqual({ apply: true });
    expect(parseCatalogImportCliArgs(["--target", "production"])).toEqual({
      apply: false,
      productionOptions: { target: "production" },
    });
    expect(parseCatalogImportCliArgs([
      "--target", "production", "--apply", "--confirm-target", "production", "--confirm-branch", branch,
    ])).toEqual({ apply: true, productionOptions: applyOptions });
    expect(() => parseCatalogImportCliArgs(["--apply", "--apply"])).toThrow("CLI_ARGUMENT_INVALID");
  });

  it("uses only the provider-verified production runtime credential for a read-only dry run", async () => {
    const neon = neonFixture();
    const database = fakeSql();
    const open = vi.fn(() => database.client);

    const plan = await runProductionCatalogImport({
      options: { target: "production" },
      apply: false,
      environment,
      validation,
      neonApiClient: neon,
      openSql: open,
    });

    expect(neon.getBranch).toHaveBeenCalledWith({ projectId: target.projectId, branchId: branch });
    expect(neon.getConnectionUri).toHaveBeenCalledWith({
      projectId: target.projectId,
      branchId: branch,
      databaseName: "neondb",
      roleName: "vocabflow_runtime",
      pooled: true,
    });
    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(runtimeUrl);
    expect(database.readOnly).toBe(true);
    expect(database.mutations).toEqual([]);
    expect(database.statements.every((statement) => statement.startsWith("SELECT") || statement.includes("SET TRANSACTION READ ONLY")))
      .toBe(true);
    const report = renderReport(plan, false);
    expect(report).toContain("DATABASE_MUTATIONS=0");
    expect(report.join("\n")).not.toContain(runtimeUrl);
    expect(report.join("\n")).not.toContain(environment.NEON_API_KEY);
    expect(database.client.end).toHaveBeenCalledOnce();
  });

  it("requires explicit production target and exact confirmations before apply", async () => {
    const neon = neonFixture();
    const open = vi.fn(() => fakeSql().client);
    const failedApplyOptions = [
      { options: {}, error: "PRODUCTION_TARGET_REQUIRED" },
      { options: { target: "development" }, error: "PRODUCTION_TARGET_REQUIRED" },
      { options: { target: "production" }, error: "PRODUCTION_TARGET_CONFIRMATION_REQUIRED" },
      { options: { ...applyOptions, confirmTarget: "development" }, error: "PRODUCTION_TARGET_CONFIRMATION_REQUIRED" },
      { options: { ...applyOptions, confirmBranch: undefined }, error: "PRODUCTION_BRANCH_CONFIRMATION_MISMATCH" },
      { options: { ...applyOptions, confirmBranch: "wrong-branch" }, error: "PRODUCTION_BRANCH_CONFIRMATION_MISMATCH" },
    ];

    for (const testCase of failedApplyOptions) {
      await expect(runProductionCatalogImport({
        options: testCase.options,
        apply: true,
        environment,
        validation,
        neonApiClient: neon,
        openSql: open,
      })).rejects.toThrow(testCase.error);
    }
    expect(neon.getBranch).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("fails closed on project or branch mismatch before opening a production connection", async () => {
    for (const mismatch of [
      { projectId: "wrong-project", error: "PROJECT_NOT_FOUND" },
      { branchId: "wrong-branch", error: "BRANCH_NOT_FOUND" },
    ]) {
      const neon = neonFixture(mismatch);
      const open = vi.fn(() => fakeSql().client);

      await expect(runProductionCatalogImport({
        options: applyOptions,
        apply: true,
        environment,
        validation,
        neonApiClient: neon,
        openSql: open,
      })).rejects.toThrow(mismatch.error);

      expect(neon.getConnectionUri).not.toHaveBeenCalled();
      expect(open).not.toHaveBeenCalled();
    }
  });

  it("rejects a mismatched canonical identity inside the apply transaction before catalog writes", async () => {
    const database = fakeSql({ wrongIdentity: true });

    await expect(runProductionCatalogImport({
      options: applyOptions,
      apply: true,
      environment,
      validation,
      neonApiClient: neonFixture(),
      openSql: vi.fn(() => database.client),
    })).rejects.toThrow("DATABASE_IDENTITY_MISMATCH");

    expect(database.mutations).toEqual([]);
    expect(database.statements.some((statement) => statement.includes("SET TRANSACTION READ ONLY"))).toBe(false);
  });

  it("also requires canonical identity before a read-only production dry run", async () => {
    const database = fakeSql({ wrongIdentity: true });

    await expect(runProductionCatalogImport({
      options: { target: "production" },
      apply: false,
      environment,
      validation,
      neonApiClient: neonFixture(),
      openSql: vi.fn(() => database.client),
    })).rejects.toThrow("DATABASE_IDENTITY_MISMATCH");

    expect(database.readOnly).toBe(true);
    expect(database.mutations).toEqual([]);
  });

  it("applies through runtime only and keeps newly imported catalog rows disabled", async () => {
    const database = fakeSql();
    const neon = neonFixture();

    const plan = await runProductionCatalogImport({
      options: applyOptions,
      apply: true,
      environment,
      validation,
      neonApiClient: neon,
      openSql: vi.fn(() => database.client),
    });

    expect(neon.getConnectionUri).toHaveBeenCalledWith(expect.objectContaining({ roleName: "vocabflow_runtime" }));
    expect(database.mutations).toEqual(["INSERT vocabulary", "SYNC vocabulary topics", "SYNC vocabulary topics"]);
    expect(database.statements.some((statement) => statement.includes("false, 1"))).toBe(true);
    expect(plan.insertCount).toBe(1);
    expect(renderReport(plan, true)).toContain("DATABASE_MUTATIONS=1");
    expect(database.statements.some((statement) => statement.includes("neondb_owner") || statement.includes("vocabflow_migration")))
      .toBe(false);
  });

  it("rejects unexpected CLI flags and production confirmation on a dry run", async () => {
    expect(() => parseCatalogImportCliArgs(["--force"])).toThrow("CLI_ARGUMENT_INVALID");
    await expect(runProductionCatalogImport({
      options: { ...applyOptions },
      apply: false,
      environment,
      validation,
      neonApiClient: neonFixture(),
      openSql: vi.fn(() => fakeSql().client),
    })).rejects.toThrow("PRODUCTION_CONFIRMATION_WITHOUT_MUTATION");
  });
});
