import { describe, expect, it, vi } from "vitest";
import type {
  CatalogDatabase,
  CatalogDatabaseSnapshot,
  CatalogRecord,
  CatalogValidation,
  CatalogRow
} from "./import-vocabulary-catalog";
import {
  CATALOG_INSERT_BATCH_SIZE,
  buildCatalogPlan,
  createPostgresCatalogDatabase,
  renderCatalogImportFailure,
  runApply,
  runDryRun,
  validateCatalogRecords,
  SOURCE_DATASET_ID
} from "./import-vocabulary-catalog";

function mediaIndex() {
  return {
    records: new Map([
      [1, { vocabularyId: 1, word: "Apple", imageKey: "image-1", audioKey: "audio-1" }],
      [2, { vocabularyId: 2, word: "apple", imageKey: null, audioKey: null }],
      [3, { vocabularyId: 3, word: "book", imageKey: "missing-image", audioKey: "missing-audio" }],
      [4, { vocabularyId: 4, word: "chair", imageKey: null, audioKey: "audio-1" }]
    ]),
    assets: new Map([
      ["image-1", { mediaKey: "image-1", status: "UPLOADED", secureUrl: "https://media.test/image-1" }],
      ["audio-1", { mediaKey: "audio-1", status: "UPLOADED", secureUrl: "https://media.test/audio-1" }]
    ])
  };
}

function sourceRecord(id: unknown, word = "apple", vietnamese = "táo"): Record<string, unknown> {
  return {
    id,
    word,
    vietnamese,
    ipa: "ˈæpəl",
    definition_en: "fruit",
    example_en: "",
    topic: "Food",
    image_files: ["images/apple.png"],
    audio_files: ["audio/apple.mp3"]
  };
}

function validatedRecords(): CatalogRecord[] {
  return validateCatalogRecords([
    sourceRecord(1, "Apple"),
    sourceRecord(2, "apple")
  ], mediaIndex()).validRecords;
}

function starterRow(id: number, word: string): CatalogRow {
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
    enabled: true,
    content_version: 1,
    source_dataset: null,
    source_record_id: null
  };
}

function snapshot(importedRows: CatalogRow[] = []): CatalogDatabaseSnapshot {
  return {
    schemaReady: true,
    starterRows: [starterRow(1, "apple"), starterRow(30, "new")],
    importedRows,
    learnerProgressCount: 4,
    reviewEventCount: 7
  };
}

function rowFromRecord(id: number, record: CatalogRecord, enabled = false): CatalogRow {
  return {
    id,
    word: record.word,
    ipa: record.ipa,
    vietnamese: record.vietnamese,
    definition_en: record.definitionEn,
    example_en: record.exampleEn,
    image_url: record.imageUrl,
    audio_url: record.audioUrl,
    topic: record.topic,
    enabled,
    content_version: 1,
    source_dataset: record.sourceDataset,
    source_record_id: record.sourceRecordId
  };
}

function memoryDatabase(
  initial: CatalogDatabaseSnapshot,
  options: {
    returningRows?: "missing" | "duplicate-source" | "unexpected-source" | "starter-id" | "duplicate-id";
    failBatchNumber?: number;
    afterApply?: (state: CatalogDatabaseSnapshot) => void;
  } = {},
) {
  let state = structuredClone(initial);
  const inserted: CatalogRecord[] = [];
  const updated: CatalogRecord[] = [];
  const mutationOrder: string[] = [];
  let batchNumber = 0;
  let nextId = Math.max(30, ...state.importedRows.map((row) => row.id)) + 1;
  const insertOne = async (record: CatalogRecord) => {
    const id = nextId++;
    state.importedRows.push(rowFromRecord(id, record));
    inserted.push(record);
    return id;
  };
  const insertMany = async (records: readonly CatalogRecord[]) => {
    batchNumber += 1;
    mutationOrder.push(`INSERT_BATCH:${records.length}`);
    if (batchNumber === options.failBatchNumber) throw new Error("SYNTHETIC_BATCH_FAILURE");
    const rows = [];
    for (const record of records) {
      const id = await insertOne(record);
      rows.push({ id, source_dataset: record.sourceDataset, source_record_id: record.sourceRecordId });
    }
    if (options.returningRows === "missing") return rows.slice(1);
    if (options.returningRows === "duplicate-source") return [rows[0]!, rows[0]!];
    if (options.returningRows === "unexpected-source") return rows.map((row, index) => index === 0 ? { ...row, source_record_id: 999999 } : row);
    if (options.returningRows === "starter-id") return rows.map((row, index) => index === 0 ? { ...row, id: 30 } : row);
    if (options.returningRows === "duplicate-id") return rows.map((row) => ({ ...row, id: 31 }));
    return rows;
  };
  const batchInsert = vi.fn(insertMany);
  const updateOne = async (record: CatalogRecord, existing: CatalogRow, nextContentVersion: number) => {
    const row = state.importedRows.find((candidate) => candidate.id === existing.id);
    if (!row) throw new Error("missing row");
    Object.assign(row, rowFromRecord(existing.id, record, row.enabled), { content_version: nextContentVersion });
    updated.push(record);
    mutationOrder.push(`UPDATE:${record.sourceRecordId}`);
    return existing.id;
  };
  const transaction = {
    readState: async () => structuredClone(state),
    insertRecord: insertOne,
    insertRecords: batchInsert,
    updateRecord: updateOne,
    syncTopicMemberships: async () => {
      mutationOrder.push("TOPIC_SYNC");
      options.afterApply?.(state);
    },
  };
  const database: CatalogDatabase = {
    readState: vi.fn(async () => structuredClone(state)),
    insertRecord: vi.fn(insertOne),
    insertRecords: batchInsert,
    updateRecord: vi.fn(updateOne),
    transaction: vi.fn(async (operation) => {
      const before = structuredClone(state);
      try {
        return await operation(transaction);
      } catch (error) {
        state = before;
        throw error;
      }
    }),
  };
  return { database, inserted, updated, mutationOrder, batchInsert };
}

function catalogValidation(records: CatalogRecord[]): CatalogValidation {
  const base = validateCatalogRecords([sourceRecord(1)], mediaIndex());
  return { ...base, sourceRecords: records.length, validRecords: records };
}

function catalogRecords(count: number): CatalogRecord[] {
  const template = validatedRecords()[0]!;
  return Array.from({ length: count }, (_, index) => ({
    ...template,
    sourceRecordId: 1000 + index,
    word: `catalog-word-${index}`,
    normalizedWord: `catalog-word-${index}`,
  }));
}

describe("US-25 catalog validation", () => {
  it("rejects missing required fields and invalid source identity", () => {
    const result = validateCatalogRecords([
      sourceRecord(undefined, "", ""),
      sourceRecord("2", "book", "sách")
    ], mediaIndex());

    expect(result.sourceRecords).toBe(2);
    expect(result.validRecords).toHaveLength(0);
    expect(result.invalidRecords).toHaveLength(2);
    expect(result.invalidRecords[0]?.codes).toEqual(expect.arrayContaining([
      "SOURCE_RECORD_ID_INVALID",
      "WORD_INVALID",
      "VIETNAMESE_INVALID"
    ]));
  });

  it("reports duplicate source identity as invalid but keeps duplicate normalized words as warnings", () => {
    const result = validateCatalogRecords([
      sourceRecord(1, "Apple"),
      sourceRecord(1, "apple"),
      sourceRecord(2, " apple ")
    ], mediaIndex());

    expect(result.duplicateSourceIdCount).toBe(1);
    expect(result.invalidRecords).toHaveLength(2);
    expect(result.validRecords).toHaveLength(1);
    expect(result.duplicateNormalizedWordGroups).toBe(0);

    const duplicateWords = validateCatalogRecords([
      sourceRecord(1, "Apple"),
      sourceRecord(2, " apple ")
    ], mediaIndex());
    expect(duplicateWords.invalidRecords).toHaveLength(0);
    expect(duplicateWords.duplicateNormalizedWordGroups).toBe(1);
    expect(duplicateWords.duplicateNormalizedWordRecords).toBe(2);
  });

  it("accepts missing optional media/definition/example and reports missing or unusable media", () => {
    const result = validateCatalogRecords([
      { id: 2, word: "book", vietnamese: "sách", definition_en: null, example_en: null },
      sourceRecord(3, "chair", "ghế")
    ], mediaIndex());

    expect(result.invalidRecords).toHaveLength(0);
    expect(result.validRecords[0]).toMatchObject({ imageUrl: null, audioUrl: null, definitionEn: null, exampleEn: null });
    expect(result.missingImageCount).toBe(1);
    expect(result.missingAudioCount).toBe(1);
    expect(result.unusableMediaCount).toBe(2);
    expect(result.mediaAvailabilityBySourceId).toEqual({
      2: { image: "MISSING", audio: "MISSING" },
      3: { image: "UNUSABLE", audio: "UNUSABLE" }
    });
  });

  it("keeps missing and unusable media distinguishable per source row", () => {
    const result = validateCatalogRecords([sourceRecord(4, "chair", "ghế")], mediaIndex());

    expect(result.validRecords[0]).toMatchObject({ imageUrl: null, audioUrl: "https://media.test/audio-1" });
    expect(result.mediaAvailabilityBySourceId[4]).toEqual({ image: "MISSING", audio: "READY" });
  });
});

describe("US-25 catalog planning and mutation safety", () => {
  it("plans independent new DB identity and disables new imported rows", () => {
    const validation = validateCatalogRecords([sourceRecord(100)], mediaIndex());
    const plan = buildCatalogPlan(validation, snapshot());

    expect(plan.insertCount).toBe(1);
    expect(plan.entries[0]).toMatchObject({ action: "INSERT", record: { sourceRecordId: 100 } });
    expect(plan.entries[0]).not.toHaveProperty("id", 100);
  });

  it("does not blindly disable an intentionally enabled existing imported row", () => {
    const record = validatedRecords()[0]!;
    const existing = rowFromRecord(31, record, true);
    const changed = { ...record, definitionEn: "updated definition" };
    const validation = validateCatalogRecords([{
      id: changed.sourceRecordId,
      word: changed.word,
      vietnamese: changed.vietnamese,
      ipa: changed.ipa,
      definition_en: changed.definitionEn,
      image_files: [],
      audio_files: []
    }], mediaIndex());
    const plan = buildCatalogPlan(validation, snapshot([existing]));

    expect(plan.updateCount).toBe(1);
    expect(plan.entries[0]).toMatchObject({ action: "UPDATE", existing: { enabled: true } });
  });

  it("keeps dry-run read-only and makes first/second apply idempotent", async () => {
    const validation = validateCatalogRecords([
      sourceRecord(1),
      sourceRecord(2, "book", "sách")
    ], mediaIndex());
    const mock = memoryDatabase(snapshot());

    const dryRun = await runDryRun(mock.database, validation);
    expect(dryRun.insertCount).toBe(2);
    expect(mock.database.insertRecord).not.toHaveBeenCalled();
    expect(mock.database.updateRecord).not.toHaveBeenCalled();

    const first = await runApply(mock.database, validation);
    expect(first.insertCount).toBe(2);
    expect(mock.inserted).toHaveLength(2);
    const afterFirstApply = await mock.database.readState();
    expect(afterFirstApply.importedRows.map((row) => row.id)).toEqual([31, 32]);
    expect(afterFirstApply.importedRows.map((row) => row.source_record_id)).toEqual([1, 2]);
    expect(afterFirstApply.importedRows.every((row) => row.id !== row.source_record_id)).toBe(true);
    expect(afterFirstApply.importedRows.every((row) => row.enabled === false)).toBe(true);

    const second = await runApply(mock.database, validation);
    expect(second.insertCount).toBe(0);
    expect(second.updateCount).toBe(0);
    expect(second.skipCount).toBe(2);
    expect(mock.inserted).toHaveLength(2);
  });

  it("inserts 1,994 records in bounded batches with database-generated IDs", async () => {
    const records = catalogRecords(1994);
    const mock = memoryDatabase(snapshot());

    const plan = await runApply(mock.database, catalogValidation(records));

    expect(plan.insertCount).toBe(1994);
    expect(mock.batchInsert).toHaveBeenCalledTimes(10);
    expect(mock.batchInsert.mock.calls.map(([batch]) => batch.length)).toEqual([
      200, 200, 200, 200, 200, 200, 200, 200, 200, 194,
    ]);
    const afterApply = await mock.database.readState();
    expect(afterApply.importedRows).toHaveLength(1994);
    expect(afterApply.importedRows[0]?.id).toBeGreaterThan(30);
    expect(afterApply.importedRows.every((row) => row.enabled === false && row.content_version === 1)).toBe(true);
    expect(afterApply.importedRows.map((row) => row.source_record_id)).toEqual(records.map((record) => record.sourceRecordId));
    expect(new Set(afterApply.importedRows.map((row) => row.id)).size).toBe(1994);
  });

  it("builds bounded multi-row SQL without explicit IDs and verifies RETURNING source identities", async () => {
    const records = catalogRecords(2);
    let statement = "";
    let parameters: unknown[] = [];
    const sqlClient = Object.assign(
      (() => Promise.resolve([])) as unknown as Parameters<typeof createPostgresCatalogDatabase>[0],
      {
        unsafe: vi.fn(async (query: string, values: unknown[] = []) => {
          statement = query;
          parameters = values;
          return records.map((record, index) => ({
            id: 31 + index,
            source_dataset: record.sourceDataset,
            source_record_id: record.sourceRecordId,
          }));
        }),
        begin: async <T>(operation: (transaction: Parameters<typeof createPostgresCatalogDatabase>[0]) => Promise<T>) => operation(sqlClient),
        array: (values: unknown[]) => values,
      },
    );

    const inserted = await createPostgresCatalogDatabase(sqlClient).insertRecords!(records);

    expect(inserted.map((row) => row.source_record_id)).toEqual(records.map((record) => record.sourceRecordId));
    expect(sqlClient.unsafe).toHaveBeenCalledOnce();
    expect(parameters).toHaveLength(records.length * 10);
    expect(parameters.slice(0, 10)).toEqual([
      records[0]?.word,
      records[0]?.ipa,
      records[0]?.vietnamese,
      records[0]?.definitionEn,
      records[0]?.exampleEn,
      records[0]?.imageUrl,
      records[0]?.audioUrl,
      records[0]?.topic,
      records[0]?.sourceDataset,
      records[0]?.sourceRecordId,
    ]);
    expect(statement).toContain('INSERT INTO "vocabflow_app"."vocabularies"');
    expect(statement).toContain("enabled, content_version, source_dataset, source_record_id");
    expect(statement).toContain("false, 1");
    expect(statement).toContain("RETURNING id, source_dataset, source_record_id");
    expect(statement).not.toMatch(/INSERT INTO [^(]+\(\s*id\b/i);

    await expect(createPostgresCatalogDatabase(sqlClient).insertRecords!(catalogRecords(CATALOG_INSERT_BATCH_SIZE + 1)))
      .rejects.toThrow("INSERT_BATCH_SIZE_INVALID");
    expect(sqlClient.unsafe).toHaveBeenCalledOnce();
  });

  it.each([
    ["missing", "missing", "INSERT_RETURNING_COUNT_MISMATCH"],
    ["duplicate source identity", "duplicate-source", "INSERT_RETURNING_DUPLICATE_SOURCE_IDENTITY"],
    ["unexpected source identity", "unexpected-source", "INSERT_RETURNING_SOURCE_IDENTITY_MISMATCH"],
  ] as const)("rolls back when RETURNING has %s", async (_case, returningRows, code) => {
    const mock = memoryDatabase(snapshot(), { returningRows });
    await expect(runApply(mock.database, catalogValidation(catalogRecords(2)))).rejects.toThrow(code);
    expect((await mock.database.readState()).importedRows).toEqual([]);
  });

  it("rejects generated IDs at or below the starter range and duplicate generated IDs", async () => {
    for (const returningRows of [
      "starter-id",
      "duplicate-id",
    ] as const) {
      const mock = memoryDatabase(snapshot(), { returningRows });
      await expect(runApply(mock.database, catalogValidation(catalogRecords(2))))
        .rejects.toThrow(/IMPORTED_ID_COLLIDES_WITH_STARTER|INSERT_RETURNING_DUPLICATE_ID/);
      expect((await mock.database.readState()).importedRows).toEqual([]);
    }
  });

  it("fails the transaction on a failed batch and does not commit an earlier batch", async () => {
    const mock = memoryDatabase(snapshot(), { failBatchNumber: 2 });

    await expect(runApply(mock.database, catalogValidation(catalogRecords(201))))
      .rejects.toThrow("SYNTHETIC_BATCH_FAILURE");

    expect(mock.batchInsert).toHaveBeenCalledTimes(2);
    expect((await mock.database.readState()).importedRows).toEqual([]);
    expect(mock.mutationOrder).not.toContain("TOPIC_SYNC");
  });

  it("synchronizes topic memberships only after all insert and update work", async () => {
    const records = catalogRecords(2);
    const existing = { ...rowFromRecord(31, records[0]!, false), definition_en: "old definition" };
    const mock = memoryDatabase(snapshot([existing]));

    await runApply(mock.database, catalogValidation(records));

    expect(mock.mutationOrder).toEqual(["UPDATE:1000", "INSERT_BATCH:1", "TOPIC_SYNC"]);
  });

  it("preserves progress/review counts and starter rows during apply", async () => {
    const validation = validateCatalogRecords([sourceRecord(1)], mediaIndex());
    const mock = memoryDatabase(snapshot());
    await runApply(mock.database, validation);
    const after = await mock.database.readState();
    expect(after.starterRows.map((row) => [row.id, row.word])).toEqual([[1, "apple"], [30, "new"]]);
    expect(after.learnerProgressCount).toBe(4);
    expect(after.reviewEventCount).toBe(7);
  });

  it.each([
    ["starter rows", "STARTER_ROWS_CHANGED", (state: CatalogDatabaseSnapshot) => { state.starterRows[0]!.word = "changed"; }],
    ["learner progress", "LEARNER_PROGRESS_CHANGED", (state: CatalogDatabaseSnapshot) => { state.learnerProgressCount += 1; }],
    ["review events", "REVIEW_EVENTS_CHANGED", (state: CatalogDatabaseSnapshot) => { state.reviewEventCount += 1; }],
    ["enabled new imported row", "IMPORTED_ROW_ENABLED_UNEXPECTED", (state: CatalogDatabaseSnapshot) => { state.importedRows[0]!.enabled = true; }],
  ])("rolls back if post-apply %s invariant changes", async (_case, code, changeState) => {
    const mock = memoryDatabase(snapshot(), { afterApply: changeState });
    await expect(runApply(mock.database, catalogValidation(catalogRecords(1)))).rejects.toThrow(code);
    expect((await mock.database.readState()).importedRows).toEqual([]);
  });

  it("rejects duplicate imported source identities already present in the database", async () => {
    const record = catalogRecords(1)[0]!;
    const duplicate = rowFromRecord(32, record);
    const mock = memoryDatabase(snapshot([rowFromRecord(31, record), duplicate]));

    await expect(runApply(mock.database, catalogValidation([record]))).rejects.toThrow("DATABASE_DUPLICATE_SOURCE_ID");
    expect(mock.batchInsert).not.toHaveBeenCalled();
  });

  it("reports safe operational connection codes without serializing error details", () => {
    const host = "production-pooler-host.neon.tech";
    const url = `postgresql://user:password@${host}:5432/database`;
    const apiKey = "napi_synthetic-secret-api-key";
    const error = Object.assign(new Error(`write CONNECTION_CLOSED ${url} ${apiKey}`), { code: "CONNECTION_CLOSED" });

    const report = renderCatalogImportFailure(error);

    expect(report).toBe("CATALOG_IMPORT_STATUS=FAIL code=CONNECTION_CLOSED");
    expect(report).not.toContain(host);
    expect(report).not.toContain(url);
    expect(report).not.toContain("password");
    expect(report).not.toContain(apiKey);
    expect(renderCatalogImportFailure(Object.assign(new Error("unsafe detail"), { code: "42501" })))
      .toBe("CATALOG_IMPORT_STATUS=FAIL code=UNEXPECTED_ERROR");
  });

  it("preserves US-41 owner overrides while refreshing raw catalog content", async () => {
    const original = validatedRecords()[0]!;
    const existing = {
      ...rowFromRecord(31, original, true),
      vietnamese_override: "owner-reviewed meaning",
      image_quarantined: true
    } as CatalogRow;
    const source = sourceRecord(1, original.word, "refreshed raw meaning");
    const validation = validateCatalogRecords([source], mediaIndex());
    const mock = memoryDatabase(snapshot([existing]));

    await runApply(mock.database, validation);

    const refreshed = (await mock.database.readState()).importedRows[0] as CatalogRow & {
      vietnamese_override: string | null;
      image_quarantined: boolean;
    };
    expect(refreshed.vietnamese).toBe("refreshed raw meaning");
    expect(refreshed.vietnamese_override).toBe("owner-reviewed meaning");
    expect(refreshed.image_quarantined).toBe(true);
  });
});

describe("US-25 source identity schema", () => {
  it("uses a dataset-scoped identity rather than source id as the DB primary key", () => {
    expect(SOURCE_DATASET_ID).toBe("2000_COMMON_ENGLISH_VOCABULARY_V1");
    expect(SOURCE_DATASET_ID).not.toMatch(/[\\/]/);
  });

  it("allows the same source record number in a different dataset", () => {
    const first = validatedRecords()[0]!;
    const otherDatasetRow: CatalogRow = {
      ...rowFromRecord(32, first),
      source_dataset: "ANOTHER_DATASET_V1",
      source_record_id: first.sourceRecordId
    };
    const plan = buildCatalogPlan(
      validateCatalogRecords([sourceRecord(1)], mediaIndex()),
      snapshot([otherDatasetRow])
    );
    expect(plan.insertCount).toBe(1);
    expect(plan.updateCount).toBe(0);
  });
});
