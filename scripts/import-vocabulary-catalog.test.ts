import { describe, expect, it, vi } from "vitest";
import type {
  CatalogDatabase,
  CatalogDatabaseSnapshot,
  CatalogRecord,
  CatalogRow
} from "./import-vocabulary-catalog";
import {
  buildCatalogPlan,
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
      [3, { vocabularyId: 3, word: "book", imageKey: "missing-image", audioKey: "missing-audio" }]
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

function memoryDatabase(initial: CatalogDatabaseSnapshot) {
  let state = structuredClone(initial);
  const inserted: CatalogRecord[] = [];
  const updated: CatalogRecord[] = [];
  const database: CatalogDatabase = {
    readState: vi.fn(async () => structuredClone(state)),
    insertRecord: vi.fn(async (record: CatalogRecord) => {
      const id = Math.max(30, ...state.importedRows.map((row) => row.id)) + 1;
      state.importedRows.push(rowFromRecord(id, record));
      inserted.push(record);
      return id;
    }),
    updateRecord: vi.fn(async (record: CatalogRecord, existing: CatalogRow, nextContentVersion: number) => {
      const row = state.importedRows.find((candidate) => candidate.id === existing.id);
      if (!row) throw new Error("missing row");
      Object.assign(row, rowFromRecord(existing.id, record, row.enabled), { content_version: nextContentVersion });
      updated.push(record);
      return existing.id;
    }),
    transaction: vi.fn(async (operation) => operation({
      readState: async () => structuredClone(state),
      insertRecord: async (record: CatalogRecord) => {
        const id = Math.max(30, ...state.importedRows.map((row) => row.id)) + 1;
        state.importedRows.push(rowFromRecord(id, record));
        inserted.push(record);
        return id;
      },
      updateRecord: async (record: CatalogRecord, existing: CatalogRow, nextContentVersion: number) => {
        const row = state.importedRows.find((candidate) => candidate.id === existing.id);
        if (!row) throw new Error("missing row");
        Object.assign(row, rowFromRecord(existing.id, record, row.enabled), { content_version: nextContentVersion });
        updated.push(record);
        return existing.id;
      }
    }))
  };
  return { database, inserted, updated };
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

  it("preserves progress/review counts and starter rows during apply", async () => {
    const validation = validateCatalogRecords([sourceRecord(1)], mediaIndex());
    const mock = memoryDatabase(snapshot());
    await runApply(mock.database, validation);
    const after = await mock.database.readState();
    expect(after.starterRows.map((row) => [row.id, row.word])).toEqual([[1, "apple"], [30, "new"]]);
    expect(after.learnerProgressCount).toBe(4);
    expect(after.reviewEventCount).toBe(7);
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
