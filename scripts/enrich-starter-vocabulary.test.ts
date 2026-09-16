import { describe, expect, it } from "vitest";
import {
  APPROVED_ENRICHMENTS,
  buildEnrichmentInputs,
  buildEnrichmentPlan,
  loadEnrichmentInputs,
  renderDryRun,
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

  it("loads the real source and explicit media mappings for all eight approved rows", () => {
    const inputs = loadEnrichmentInputs();
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
