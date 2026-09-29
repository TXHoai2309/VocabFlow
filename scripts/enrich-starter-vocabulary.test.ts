import { describe, expect, it, vi } from "vitest";
import { getConnectionTarget } from "../config/database-targets";
import type { NeonApiClient } from "./neon-target-verifier";
import { openSql } from "./db-core";
import {
  APPROVED_ENRICHMENTS,
  buildEnrichmentInputs,
  buildEnrichmentPlan,
  parseStarterEnrichmentCliArgs,
  renderDryRun,
  renderStarterEnrichmentFailure,
  runProductionStarterEnrichment,
  runApply,
  runDryRun,
  updatesFromPlan,
  type CurrentVocabularyRow,
  type EnrichmentDatabase,
  type EnrichmentInput,
  type MediaMapAsset,
  type SourceMediaMapping,
  type SourceVocabularyRecord
} from "./enrich-starter-vocabulary";

const productionTarget = getConnectionTarget("production", "runtime");
const productionRuntimeUrl = "postgresql://vocabflow_runtime:fixture@ep-production-pooler.neon.tech/neondb";
const productionEnvironment = {
  EXECUTION_CONTEXT: "local-development",
  VOCABFLOW_ENV: "production",
  DATABASE_ENV: "production",
  NEON_API_KEY: "fixture-neon-key-not-real",
  PRODUCTION_DATABASE_URL: productionRuntimeUrl,
  DATABASE_URL: "postgresql://vocabflow_runtime:decoy@ep-development-pooler.neon.tech/neondb",
  PRODUCTION_MIGRATION_DATABASE_URL: "postgresql://vocabflow_migration:decoy@ep-production-pooler.neon.tech/neondb",
  PRODUCTION_BOOTSTRAP_DATABASE_URL: "postgresql://neondb_owner:decoy@ep-production-pooler.neon.tech/neondb"
} as NodeJS.ProcessEnv;

const productionApplyOptions = {
  target: "production",
  confirmTarget: "production",
  confirmBranch: productionTarget.branchId
};

function productionNeonFixture(overrides: { projectId?: string; branchId?: string } = {}): NeonApiClient {
  return {
    getBranch: vi.fn(async () => ({
      projectId: overrides.projectId ?? productionTarget.projectId,
      branchId: overrides.branchId ?? productionTarget.branchId
    })),
    getConnectionUri: vi.fn(async ({ roleName }) => {
      if (roleName !== "vocabflow_runtime") throw new Error("UNEXPECTED_DATABASE_ROLE");
      return { uri: productionRuntimeUrl };
    })
  };
}

function productionSqlFixture(options: { wrongIdentity?: boolean } = {}) {
  const statements: string[] = [];
  const mutations: string[] = [];
  let readOnly = false;
  const query = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    const statement = strings.join("?").replace(/\s+/g, " ").trim();
    statements.push(statement);
    if (statement.includes("SET TRANSACTION READ ONLY")) readOnly = true;

    let rows: Record<string, unknown>[] = [];
    if (statement.includes("to_regclass")) rows = [{ exists: true }];
    else if (statement.includes("SELECT id, environment, provider, project_id, branch_id, identity_version")) {
      rows = [{
        id: 1,
        environment: "production",
        provider: "neon",
        project_id: productionTarget.projectId,
        branch_id: options.wrongIdentity ? "wrong-branch" : productionTarget.branchId,
        identity_version: productionTarget.identityVersion
      }];
    } else if (statement.includes("SELECT id, word, ipa, vietnamese")) {
      rows = currentRows().map((row) => ({ ...row }));
    } else if (/^UPDATE/i.test(statement)) {
      mutations.push("UPDATE vocabulary");
    }
    const result = rows as Record<string, unknown>[] & { count?: number };
    if (/^UPDATE/i.test(statement)) result.count = 1;
    void values;
    return Promise.resolve(result);
  }) as unknown as ReturnType<typeof openSql>;
  Object.assign(query, {
    unsafe: (value: string) => value,
    begin: async <T>(operation: (transaction: ReturnType<typeof openSql>) => Promise<T>) => operation(query),
    end: vi.fn(async () => undefined)
  });
  return { client: query, statements, mutations, get readOnly() { return readOnly; } };
}

function fixtureSources(): SourceVocabularyRecord[] {
  return APPROVED_ENRICHMENTS.map((approved, index) => ({
    id: approved.sourceId,
    word: approved.sourceWord,
    ipa: `/fixture/${index}/`,
    vietnamese: `nghĩa ${approved.sourceWord}`,
    definition_en: `Definition of ${approved.sourceWord}`,
    example_en: index === 0 ? `Example of ${approved.sourceWord}` : "",
    topic: "Fixture"
  }));
}

function fixtureMappings(): SourceMediaMapping[] {
  return APPROVED_ENRICHMENTS.map((approved) => ({
    vocabularyId: approved.sourceId,
    word: approved.sourceWord,
    imageKey: `media/v1/images/${approved.sourceId}.jpg`,
    audioKey: `media/v1/audio/${approved.sourceId}.mp3`
  }));
}

function fixtureAssets(): MediaMapAsset[] {
  return APPROVED_ENRICHMENTS.flatMap((approved) => [
    {
      mediaKey: `media/v1/images/${approved.sourceId}.jpg`,
      type: "image" as const,
      status: "UPLOADED",
      secureUrl: `https://res.cloudinary.test/image/${approved.sourceId}.jpg`
    },
    {
      mediaKey: `media/v1/audio/${approved.sourceId}.mp3`,
      type: "audio" as const,
      status: "UPLOADED",
      secureUrl: `https://res.cloudinary.test/audio/${approved.sourceId}.mp3`
    }
  ]);
}

function fixtureInputs(): EnrichmentInput[] {
  return buildEnrichmentInputs(fixtureSources(), fixtureMappings(), fixtureAssets());
}

function currentRows(inputs = fixtureInputs()): CurrentVocabularyRow[] {
  return inputs.map((input) => ({
    id: input.dbId,
    word: input.starterWord,
    ipa: null,
    vietnamese: "starter meaning",
    definition_en: null,
    example_en: null,
    image_url: null,
    audio_url: null,
    topic: null,
    enabled: true,
    content_version: 1
  }));
}

function mockDatabase(rows: CurrentVocabularyRow[], options: {
  updateResult?: (update: Parameters<NonNullable<EnrichmentDatabase["transaction"]>>[0]) => number;
} = {}) {
  let readCalls = 0;
  let updateCalls = 0;
  let transactionCalls = 0;
  let committed = false;
  let rolledBack = false;
  let lastUpdate: Parameters<EnrichmentDatabase["updateVocabularyRow"]>[0] | undefined;
  const updates: Parameters<EnrichmentDatabase["updateVocabularyRow"]>[0][] = [];
  const transaction: EnrichmentDatabase = {
    readApprovedRows: async () => {
      readCalls += 1;
      return rows;
    },
    updateVocabularyRow: async () => {
      updateCalls += 1;
      return 1;
    },
    transaction: async (operation) => {
      transactionCalls += 1;
      try {
        const result = await operation({
          readApprovedRows: async () => rows,
          updateVocabularyRow: async (update) => {
            lastUpdate = update;
            updates.push(update);
            updateCalls += 1;
            return options.updateResult ? options.updateResult(update as never) : 1;
          }
        });
        committed = true;
        return result;
      } catch (error) {
        rolledBack = true;
        throw error;
      }
    }
  };
  return {
    database: transaction,
    lastUpdate: () => lastUpdate,
    updates: () => updates,
    counts: () => ({ readCalls, updateCalls, transactionCalls, committed, rolledBack })
  };
}

describe("starter vocabulary enrichment safety", () => {
  it("defines exactly the approved eight IDs and excludes student and the other starter rows", () => {
    expect(APPROVED_ENRICHMENTS.map((item) => item.dbId)).toEqual([1, 2, 7, 8, 9, 11, 18, 19]);
    expect(APPROVED_ENRICHMENTS.map((item) => item.dbId)).not.toContain(10);
    expect(APPROVED_ENRICHMENTS).toHaveLength(8);
    const excluded = Array.from({ length: 30 }, (_, index) => index + 1)
      .filter((id) => !APPROVED_ENRICHMENTS.some((item) => item.dbId === id));
    expect(excluded).toHaveLength(22);
    expect(excluded).toContain(10);
    expect(excluded.filter((id) => id !== 10)).toHaveLength(21);
  });

  it("loads deterministic source and explicit media fixtures for all eight approved rows", () => {
    const inputs = buildEnrichmentInputs(fixtureSources(), fixtureMappings(), fixtureAssets());
    expect(inputs).toHaveLength(8);
    expect(inputs.every((input) => input.imageAvailable && input.audioAvailable)).toBe(true);
    expect(inputs.map((input) => input.sourceId)).toEqual([265, 762, 208, 262, 759, 375, 931, 932]);
  });

  it("rejects an approved source ID when its exact source word does not match", () => {
    const sources = fixtureSources();
    sources[0] = { ...sources[0]!, word: "not apple" };
    expect(() => buildEnrichmentInputs(sources, fixtureMappings(), fixtureAssets())).toThrow("APPROVED_SOURCE_ID_WORD_MISMATCH");
  });

  it("rejects an input whose source dataset ID is not the approved source ID", () => {
    const inputs = fixtureInputs();
    inputs[0] = { ...inputs[0]!, sourceId: 999 };
    expect(() => buildEnrichmentPlan(currentRows(), inputs)).toThrow("APPROVED_INPUT_SOURCE_ID_MISMATCH");
  });

  it("requires both explicit usable media-map entries", () => {
    const mappings = fixtureMappings();
    mappings[0] = { ...mappings[0]!, audioKey: null };
    expect(() => buildEnrichmentInputs(fixtureSources(), mappings, fixtureAssets())).toThrow("APPROVED_MEDIA_MAPPING_MISSING");
  });

  it("requires media-map assets to be successfully uploaded", () => {
    const assets = fixtureAssets();
    assets[0] = { ...assets[0]!, status: "PENDING" };
    expect(() => buildEnrichmentInputs(fixtureSources(), fixtureMappings(), assets)).toThrow("APPROVED_IMAGE_MEDIA_UNAVAILABLE");
  });

  it("performs a dry run without any database mutation", async () => {
    const mock = mockDatabase(currentRows());
    const plan = await runDryRun(mock.database, fixtureInputs());
    expect(plan.entries).toHaveLength(8);
    expect(plan.updateCount).toBe(8);
    expect(mock.counts()).toMatchObject({ readCalls: 1, updateCalls: 0, transactionCalls: 0 });
  });

  it("requires exact DB ID and word identity before planning", () => {
    const rows = currentRows();
    rows[0] = { ...rows[0]!, word: "APPLE" };
    expect(() => buildEnrichmentPlan(rows, fixtureInputs())).toThrow("DB_WORD_MISMATCH");
    expect(() => buildEnrichmentPlan(rows.slice(1), fixtureInputs())).toThrow("APPROVED_DB_ROW_MISSING");
  });

  it("fails safe for a semantic source mismatch and preserves a disabled row", async () => {
    const inputs = fixtureInputs();
    inputs[0] = { ...inputs[0]!, sourceWord: "not apple" };
    expect(() => buildEnrichmentPlan(currentRows(), inputs)).toThrow("SOURCE_WORD_IDENTITY_MISMATCH");
    const rows = currentRows();
    rows[0] = { ...rows[0]!, enabled: false };
    const mock = mockDatabase(rows);
    await runApply(mock.database, fixtureInputs());
    expect(mock.updates().find((update) => update.dbId === 1)?.enabled).toBe(false);
  });

  it("does not overwrite a database field when that source field is absent", () => {
    const sources = fixtureSources();
    const sourceWithoutTopic = { ...sources[0]! };
    delete sourceWithoutTopic.topic;
    sources[0] = sourceWithoutTopic;
    const inputs = buildEnrichmentInputs(sources, fixtureMappings(), fixtureAssets());
    const rows = currentRows(inputs);
    rows[0] = { ...rows[0]!, topic: "existing topic" };
    const plan = buildEnrichmentPlan(rows, inputs);
    const entry = plan.entries[0]!;
    expect(entry.proposedContent.topic).toBe("existing topic");
    expect(entry.fieldsToChange).not.toContain("topic");
  });

  it("plans version 1 to 2 and never includes identity or learner-history fields", () => {
    const plan = buildEnrichmentPlan(currentRows(), fixtureInputs());
    expect(plan.entries.every((entry) => entry.proposedContentVersion === 2 && entry.semanticIdentity === "PASS")).toBe(true);
    expect(plan.entries.flatMap((entry) => entry.fieldsToChange)).not.toEqual(expect.arrayContaining(["id", "word", "enabled", "created_at", "learner_progress", "review_events"]));
    expect(plan.entries.find((entry) => entry.dbId === 1)?.fieldsToChange).toContain("content_version");
    const update = updatesFromPlan(plan)[0];
    expect(update).toBeDefined();
    expect(update).not.toHaveProperty("id");
    expect(update).not.toHaveProperty("word");
    expect(update).not.toHaveProperty("learner_progress");
    expect(update).not.toHaveProperty("review_events");
  });

  it("treats a fully enriched version-2 rerun as idempotent", () => {
    const inputs = fixtureInputs();
    const rows = currentRows(inputs).map((row, index) => ({
      ...row,
      ...inputs[index]!.content,
      content_version: 2
    }));
    const plan = buildEnrichmentPlan(rows, inputs);
    expect(plan.updateCount).toBe(0);
    expect(plan.alreadyEnrichedCount).toBe(8);
  });

  it("keeps an already enriched apply at zero updates", async () => {
    const inputs = fixtureInputs();
    const rows = currentRows(inputs).map((row, index) => ({
      ...row,
      ...inputs[index]!.content,
      content_version: 2
    }));
    const mock = mockDatabase(rows);
    const plan = await runApply(mock.database, inputs);
    expect(plan.alreadyEnrichedCount).toBe(8);
    expect(mock.counts()).toMatchObject({ updateCalls: 0, committed: true, rolledBack: false });
  });

  it("fails safe for unexpected version or changed version-2 content", () => {
    const versionRows = currentRows();
    versionRows[0] = { ...versionRows[0]!, content_version: 3 };
    expect(() => buildEnrichmentPlan(versionRows, fixtureInputs())).toThrow("DB_CONTENT_VERSION_UNEXPECTED");
    const changedRows = currentRows().map((row, index) => ({
      ...row,
      ...fixtureInputs()[index]!.content,
      content_version: 2
    }));
    changedRows[0] = { ...changedRows[0]!, topic: "unexpected" };
    expect(() => buildEnrichmentPlan(changedRows, fixtureInputs())).toThrow("DB_CONTENT_STATE_UNEXPECTED");
  });

  it("updates all rows through one transaction and leaves progress/reviews outside the adapter", async () => {
    const mock = mockDatabase(currentRows());
    const plan = await runApply(mock.database, fixtureInputs());
    expect(plan.updateCount).toBe(8);
    expect(mock.counts()).toMatchObject({ transactionCalls: 1, updateCalls: 8, committed: true, rolledBack: false });
  });

  it("rolls back when any guarded update does not affect exactly one row", async () => {
    let calls = 0;
    const mock = mockDatabase(currentRows(), {
      updateResult: () => {
        calls += 1;
        return calls === 2 ? 0 : 1;
      }
    });
    await expect(runApply(mock.database, fixtureInputs())).rejects.toThrow("DB_ROW_CHANGED_DURING_APPLY");
    expect(mock.counts()).toMatchObject({ transactionCalls: 1, committed: false, rolledBack: true });
  });

  it("does not log media URLs, credentials, or secret-like content in the dry-run report", () => {
    const output = renderDryRun(buildEnrichmentPlan(currentRows(), fixtureInputs())).join("\n");
    expect(output).not.toContain("secure_url");
    expect(output).not.toContain("api_secret");
    expect(output).not.toContain("cloudinary.test");
  });
});

describe("production vocab:enrich-starter operator path", () => {
  it("preserves the Development CLI shape and parses explicit production flags", () => {
    expect(parseStarterEnrichmentCliArgs([])).toEqual({ apply: false });
    expect(parseStarterEnrichmentCliArgs(["--apply"])).toEqual({ apply: true });
    expect(parseStarterEnrichmentCliArgs(["--target", "production"])).toEqual({
      apply: false,
      productionOptions: { target: "production" }
    });
    expect(parseStarterEnrichmentCliArgs([
      "--target", "production", "--apply", "--confirm-target", "production", "--confirm-branch", productionTarget.branchId
    ])).toEqual({ apply: true, productionOptions: productionApplyOptions });
    expect(() => parseStarterEnrichmentCliArgs(["--force"])).toThrow("CLI_ARGUMENT_INVALID");
    expect(() => parseStarterEnrichmentCliArgs(["--apply", "--apply"])).toThrow("CLI_ARGUMENT_INVALID");
  });

  it("requires an explicit production target even when the environment is marked production", async () => {
    const neon = productionNeonFixture();
    const open = vi.fn(() => productionSqlFixture().client);
    await expect(runProductionStarterEnrichment({
      options: {},
      apply: false,
      environment: productionEnvironment,
      inputs: fixtureInputs(),
      neonApiClient: neon,
      openSql: open
    })).rejects.toThrow("PRODUCTION_TARGET_REQUIRED");
    expect(neon.getBranch).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("runs a provider-verified production dry run read-only with the runtime URL and no confirmation flags", async () => {
    const neon = productionNeonFixture();
    const database = productionSqlFixture();
    const open = vi.fn(() => database.client);
    const plan = await runProductionStarterEnrichment({
      options: { target: "production" },
      apply: false,
      environment: productionEnvironment,
      inputs: fixtureInputs(),
      neonApiClient: neon,
      openSql: open
    });

    expect(neon.getBranch).toHaveBeenCalledWith({
      projectId: productionTarget.projectId,
      branchId: productionTarget.branchId
    });
    expect(neon.getConnectionUri).toHaveBeenCalledWith(expect.objectContaining({ roleName: "vocabflow_runtime" }));
    expect(open).toHaveBeenCalledOnce();
    expect(open).toHaveBeenCalledWith(productionRuntimeUrl);
    expect(database.readOnly).toBe(true);
    expect(database.mutations).toEqual([]);
    expect(database.statements.every((statement) => statement.startsWith("SELECT") || statement.includes("SET TRANSACTION READ ONLY"))).toBe(true);
    expect(renderDryRun(plan)).toContain("DATABASE_MUTATIONS=0");
    expect(renderDryRun(plan).join("\n")).not.toContain(productionRuntimeUrl);
    expect(renderDryRun(plan).join("\n")).not.toContain(productionEnvironment.NEON_API_KEY);
    expect(database.client.end).toHaveBeenCalledOnce();
  });

  it("fails closed for missing apply target confirmation or an incorrect canonical branch confirmation", async () => {
    const neon = productionNeonFixture();
    const open = vi.fn(() => productionSqlFixture().client);
    for (const testCase of [
      { options: { target: "production" }, error: "PRODUCTION_TARGET_CONFIRMATION_REQUIRED" },
      { options: { ...productionApplyOptions, confirmTarget: "development" }, error: "PRODUCTION_TARGET_CONFIRMATION_REQUIRED" },
      { options: { ...productionApplyOptions, confirmBranch: "wrong-branch" }, error: "PRODUCTION_BRANCH_CONFIRMATION_MISMATCH" }
    ]) {
      await expect(runProductionStarterEnrichment({
        options: testCase.options,
        apply: true,
        environment: productionEnvironment,
        inputs: fixtureInputs(),
        neonApiClient: neon,
        openSql: open
      })).rejects.toThrow(testCase.error);
    }
    expect(neon.getBranch).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it("requires provider verification and never falls back to DATABASE_URL", async () => {
    const open = vi.fn(() => productionSqlFixture().client);
    const noProductionCredential = { ...productionEnvironment };
    delete noProductionCredential.PRODUCTION_DATABASE_URL;
    await expect(runProductionStarterEnrichment({
      options: { target: "production" },
      apply: false,
      environment: noProductionCredential,
      inputs: fixtureInputs(),
      neonApiClient: productionNeonFixture(),
      openSql: open
    })).rejects.toThrow("PRODUCTION_DATABASE_URL_REQUIRED");
    const noProviderKey = { ...productionEnvironment };
    delete noProviderKey.NEON_API_KEY;
    await expect(runProductionStarterEnrichment({
      options: { target: "production" },
      apply: false,
      environment: noProviderKey,
      inputs: fixtureInputs(),
      neonApiClient: productionNeonFixture(),
      openSql: open
    })).rejects.toThrow("PRODUCTION_PROVIDER_VERIFICATION_REQUIRED");
    expect(open).not.toHaveBeenCalled();
  });

  it("rejects provider project or branch mismatch before connecting", async () => {
    for (const mismatch of [
      { projectId: "wrong-project", message: "PROJECT_NOT_FOUND" },
      { branchId: "wrong-branch", message: "BRANCH_NOT_FOUND" }
    ]) {
      const open = vi.fn(() => productionSqlFixture().client);
      await expect(runProductionStarterEnrichment({
        options: { target: "production" },
        apply: false,
        environment: productionEnvironment,
        inputs: fixtureInputs(),
        neonApiClient: productionNeonFixture(mismatch),
        openSql: open
      })).rejects.toThrow(mismatch.message);
      expect(open).not.toHaveBeenCalled();
    }
  });

  it("checks canonical post-connect identity before reading the plan or mutating", async () => {
    const database = productionSqlFixture({ wrongIdentity: true });
    await expect(runProductionStarterEnrichment({
      options: productionApplyOptions,
      apply: true,
      environment: productionEnvironment,
      inputs: fixtureInputs(),
      neonApiClient: productionNeonFixture(),
      openSql: vi.fn(() => database.client)
    })).rejects.toThrow("DATABASE_IDENTITY_MISMATCH");
    expect(database.statements.some((statement) => statement.includes("SELECT id, word, ipa, vietnamese"))).toBe(false);
    expect(database.mutations).toEqual([]);
  });

  it("only applies after the production mutation guard and confirms identity before updates", async () => {
    const database = productionSqlFixture();
    const neon = productionNeonFixture();
    const plan = await runProductionStarterEnrichment({
      options: productionApplyOptions,
      apply: true,
      environment: productionEnvironment,
      inputs: fixtureInputs(),
      neonApiClient: neon,
      openSql: vi.fn(() => database.client)
    });
    const identityIndex = database.statements.findIndex((statement) => statement.includes("SELECT id, environment, provider, project_id, branch_id, identity_version"));
    const enrichmentReadIndex = database.statements.findIndex((statement) => statement.includes("SELECT id, word, ipa, vietnamese"));
    const updateIndex = database.statements.findIndex((statement) => /^UPDATE/i.test(statement));
    expect(identityIndex).toBeGreaterThanOrEqual(0);
    expect(identityIndex).toBeLessThan(enrichmentReadIndex);
    expect(enrichmentReadIndex).toBeLessThan(updateIndex);
    expect(neon.getConnectionUri).toHaveBeenCalledWith(expect.objectContaining({ roleName: "vocabflow_runtime" }));
    expect(database.mutations).toHaveLength(8);
    expect(plan.updateCount).toBe(8);
    expect(database.statements.join("\n")).not.toMatch(/neondb_owner|vocabflow_migration/);
  });

  it("reports operational guard tokens without leaking arbitrary error messages or credentials", () => {
    expect(renderStarterEnrichmentFailure(new Error("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH")))
      .toBe("PRODUCTION_BRANCH_CONFIRMATION_MISMATCH");
    expect(renderStarterEnrichmentFailure(new Error("postgresql://user:password@host/db")))
      .toBe("STARTER_ENRICHMENT_FAILED");
    expect(renderStarterEnrichmentFailure(new Error("NAPI_FAKE_API_KEY")))
      .toBe("STARTER_ENRICHMENT_FAILED");
  });
});
