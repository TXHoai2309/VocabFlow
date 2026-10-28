import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { join, resolve } from "node:path";
import postgres from "postgres";
import { APP_SCHEMA } from "@vocabflow/contracts";
import { DEFAULT_DATASET_ROOT } from "./vocab-media-manifest";
import { normalizeWord } from "./validate-dataset";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertPreConnect,
  assertResolvedTargetBeforeMutation,
  configuredDatabaseUrl
} from "./runtime-validation";
import { assertPostConnectIdentity, openSql, readContext } from "./db-core";
import {
  authorizeProductionRelease,
  parseProductionReleaseArgs,
  resolveProductionConnection,
  runAuthorizedProductionMutation,
  type ProductionReleaseOptions,
} from "./production-release-safety";
import type { NeonApiClient } from "./neon-target-verifier";

export const SOURCE_DATASET_ID = "2000_COMMON_ENGLISH_VOCABULARY_V1";
export const STARTER_ID_MAX = 30;
export const CATALOG_INSERT_BATCH_SIZE = 200;

const SAFE_OPERATIONAL_ERROR_CODES = new Set([
  "CONNECTION_CLOSED",
  "CONNECT_TIMEOUT",
  "CONNECTION_TIMEOUT",
  "SOCKET_TIMEOUT",
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
]);

const VOCABULARY_TABLE = `"${APP_SCHEMA}"."vocabularies"`;
const PROGRESS_TABLE = `"${APP_SCHEMA}"."learner_progress"`;
const EVENTS_TABLE = `"${APP_SCHEMA}"."review_events"`;

type RawCatalogRecord = Record<string, unknown>;

export type CatalogRecord = {
  sourceDataset: typeof SOURCE_DATASET_ID;
  sourceRecordId: number;
  word: string;
  normalizedWord: string;
  vietnamese: string;
  ipa: string | null;
  definitionEn: string | null;
  exampleEn: string | null;
  topic: string | null;
  imageUrl: string | null;
  audioUrl: string | null;
};

export type CatalogMediaAvailability = "READY" | "MISSING" | "UNUSABLE";
export type CatalogMediaAvailabilityBySourceId = Record<number, { image: CatalogMediaAvailability; audio: CatalogMediaAvailability }>;

export type CatalogInvalidRecord = {
  sourceRecordId: number | null;
  codes: string[];
};

export type CatalogValidation = {
  sourceRecords: number;
  validRecords: CatalogRecord[];
  invalidRecords: CatalogInvalidRecord[];
  duplicateSourceIdCount: number;
  duplicateNormalizedWordGroups: number;
  duplicateNormalizedWordRecords: number;
  missingImageCount: number;
  missingAudioCount: number;
  unusableMediaCount: number;
  mediaAvailabilityBySourceId: CatalogMediaAvailabilityBySourceId;
};

export type CatalogRow = {
  id: number;
  word: string;
  ipa: string | null;
  vietnamese: string;
  definition_en: string | null;
  example_en: string | null;
  image_url: string | null;
  audio_url: string | null;
  topic: string | null;
  enabled: boolean;
  content_version: number;
  source_dataset: string | null;
  source_record_id: number | null;
};

export type CatalogDatabaseSnapshot = {
  schemaReady: boolean;
  starterRows: CatalogRow[];
  importedRows: CatalogRow[];
  learnerProgressCount: number;
  reviewEventCount: number;
};

export type CatalogPlanEntry =
  | { action: "INSERT"; record: CatalogRecord }
  | { action: "UPDATE"; record: CatalogRecord; existing: CatalogRow; nextContentVersion: number }
  | { action: "SKIP"; record: CatalogRecord; existing: CatalogRow };

export type CatalogPlan = {
  validation: CatalogValidation;
  snapshot: CatalogDatabaseSnapshot;
  entries: CatalogPlanEntry[];
  insertCount: number;
  updateCount: number;
  skipCount: number;
  existingStarterRows: number;
  starterRowsModified: number;
  learnerProgressRowsModified: number;
  reviewEventRowsModified: number;
};

export class CatalogImportError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "CatalogImportError";
    this.code = code;
  }
}

export function catalogImportFailureCode(error: unknown): string {
  if (error instanceof CatalogImportError) return error.code;
  if (typeof error !== "object" || error === null || !("code" in error)) return "UNEXPECTED_ERROR";
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && SAFE_OPERATIONAL_ERROR_CODES.has(code)
    ? code
    : "UNEXPECTED_ERROR";
}

export function renderCatalogImportFailure(error: unknown) {
  return `CATALOG_IMPORT_STATUS=FAIL code=${catalogImportFailureCode(error)}`;
}

type MediaManifestRecord = {
  vocabularyId: number;
  word: string;
  imageKey: string | null;
  audioKey: string | null;
};

type MediaAsset = {
  mediaKey: string;
  status: string;
  secureUrl?: string;
};

type MediaIndex = {
  records: Map<number, MediaManifestRecord>;
  assets: Map<string, MediaAsset>;
};

type SqlTag = {
  <T extends Record<string, unknown> = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  unsafe: (value: string, parameters?: unknown[]) => unknown;
  begin: <T>(operation: (transaction: SqlTag) => Promise<T>) => Promise<T>;
};

export type CatalogInsertResult = {
  id: number;
  source_dataset: string;
  source_record_id: number;
};

export type CatalogTransaction = {
  readState: () => Promise<CatalogDatabaseSnapshot>;
  insertRecord: (record: CatalogRecord) => Promise<number>;
  insertRecords?: (records: readonly CatalogRecord[]) => Promise<CatalogInsertResult[]>;
  updateRecord: (record: CatalogRecord, existing: CatalogRow, nextContentVersion: number) => Promise<number>;
  syncTopicMemberships?: () => Promise<void>;
};

export type CatalogDatabase = CatalogTransaction & {
  transaction: <T>(operation: (transaction: CatalogTransaction) => Promise<T>) => Promise<T>;
};

export type CatalogImportCliOptions = {
  apply: boolean;
  productionOptions?: ProductionReleaseOptions;
};

export function parseCatalogImportCliArgs(args: readonly string[]): CatalogImportCliOptions {
  let apply = false;
  const releaseArgs: string[] = [];
  for (const arg of args) {
    if (arg === "--apply") {
      if (apply) throw new CatalogImportError("CLI_ARGUMENT_INVALID");
      apply = true;
    } else {
      releaseArgs.push(arg);
    }
  }
  if (releaseArgs.length === 0) return { apply };
  try {
    return { apply, productionOptions: parseProductionReleaseArgs(releaseArgs) };
  } catch {
    throw new CatalogImportError("CLI_ARGUMENT_INVALID");
  }
}

function requiredText(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new CatalogImportError(code);
  return value.trim();
}

function optionalText(value: unknown, code: string): string | null {
  if (value == null) return null;
  if (typeof value !== "string") throw new CatalogImportError(code);
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function sourceMediaReference(value: unknown, field: string): string[] {
  if (value == null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new CatalogImportError(`MEDIA_REFERENCE_INVALID_${field}`);
  }
  const references = value.map((item) => item.trim()).filter(Boolean);
  if (references.length > 1) throw new CatalogImportError(`MEDIA_REFERENCE_MULTIPLE_${field}`);
  return references;
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new CatalogImportError("SOURCE_FILE_UNREADABLE");
  }
}

function readMediaIndex(
  manifestPath = join(process.cwd(), "local-data", "generated", "vocab-media-manifest.json"),
  mediaMapPath = join(process.cwd(), "local-data", "generated", "cloudinary-media-map.json"),
): MediaIndex {
  const manifest = readJson(manifestPath);
  const map = readJson(mediaMapPath);
  if (!manifest || typeof manifest !== "object" || !Array.isArray((manifest as { records?: unknown }).records)) {
    throw new CatalogImportError("MEDIA_MANIFEST_INVALID");
  }
  if (!map || typeof map !== "object" || !Array.isArray((map as { assets?: unknown }).assets)) {
    throw new CatalogImportError("MEDIA_MAP_INVALID");
  }

  const records = new Map<number, MediaManifestRecord>();
  for (const value of (manifest as { records: unknown[] }).records) {
    if (!value || typeof value !== "object") throw new CatalogImportError("MEDIA_MANIFEST_INVALID");
    const record = value as Record<string, unknown>;
    if (typeof record.vocabularyId !== "number" || !Number.isSafeInteger(record.vocabularyId)) {
      throw new CatalogImportError("MEDIA_MANIFEST_INVALID");
    }
    if (records.has(record.vocabularyId)) throw new CatalogImportError("MEDIA_MANIFEST_DUPLICATE_ID");
    records.set(record.vocabularyId, {
      vocabularyId: record.vocabularyId,
      word: requiredText(record.word, "MEDIA_MANIFEST_INVALID"),
      imageKey: record.imageKey == null ? null : requiredText(record.imageKey, "MEDIA_MANIFEST_INVALID"),
      audioKey: record.audioKey == null ? null : requiredText(record.audioKey, "MEDIA_MANIFEST_INVALID")
    });
  }

  const assets = new Map<string, MediaAsset>();
  for (const value of (map as { assets: unknown[] }).assets) {
    if (!value || typeof value !== "object") throw new CatalogImportError("MEDIA_MAP_INVALID");
    const asset = value as Record<string, unknown>;
    const mediaKey = requiredText(asset.mediaKey, "MEDIA_MAP_INVALID");
    if (assets.has(mediaKey)) throw new CatalogImportError("MEDIA_MAP_DUPLICATE_KEY");
    assets.set(mediaKey, {
      mediaKey,
      status: requiredText(asset.status, "MEDIA_MAP_INVALID"),
      secureUrl: asset.secureUrl == null ? undefined : requiredText(asset.secureUrl, "MEDIA_MAP_INVALID")
    });
  }
  return { records, assets };
}

function resolveMedia(
  key: string | null,
  index: MediaIndex,
): { url: string | null; missing: number; unusable: number; availability: CatalogMediaAvailability } {
  if (!key) return { url: null, missing: 1, unusable: 0, availability: "MISSING" };
  const asset = index.assets.get(key);
  if (!asset || asset.status !== "UPLOADED" || !asset.secureUrl) {
    return { url: null, missing: 0, unusable: 1, availability: "UNUSABLE" };
  }
  return { url: asset.secureUrl, missing: 0, unusable: 0, availability: "READY" };
}

type Candidate = {
  sourceRecordId: number | null;
  raw: RawCatalogRecord;
  codes: string[];
};

function candidateFrom(value: unknown): Candidate {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { sourceRecordId: null, raw: {}, codes: ["RECORD_INVALID"] };
  }
  const raw = value as RawCatalogRecord;
  const sourceRecordId = typeof raw.id === "number" && Number.isSafeInteger(raw.id) && raw.id > 0 ? raw.id : null;
  const codes: string[] = [];
  if (sourceRecordId === null) codes.push("SOURCE_RECORD_ID_INVALID");
  for (const [field, code] of [["word", "WORD_INVALID"], ["vietnamese", "VIETNAMESE_INVALID"]] as const) {
    if (typeof raw[field] !== "string" || raw[field].trim() === "") codes.push(code);
  }
  for (const [field, code] of [
    ["ipa", "IPA_INVALID"],
    ["definition_en", "DEFINITION_INVALID"],
    ["example_en", "EXAMPLE_INVALID"],
    ["topic", "TOPIC_INVALID"]
  ] as const) {
    if (raw[field] != null && typeof raw[field] !== "string") codes.push(code);
  }
  for (const [field, code] of [["image_files", "IMAGE"], ["audio_files", "AUDIO"]] as const) {
    try {
      sourceMediaReference(raw[field], field);
    } catch (error) {
      if (error instanceof CatalogImportError) codes.push(`${error.code}_${code}`);
      else codes.push(`MEDIA_REFERENCE_INVALID_${code}`);
    }
  }
  return { sourceRecordId, raw, codes };
}

export function validateCatalogRecords(
  input: unknown,
  mediaIndex = readMediaIndex(),
): CatalogValidation {
  if (!Array.isArray(input)) throw new CatalogImportError("SOURCE_DATASET_INVALID");
  const candidates = input.map(candidateFrom);
  const idCounts = new Map<number, number>();
  for (const candidate of candidates) {
    if (candidate.sourceRecordId !== null) {
      idCounts.set(candidate.sourceRecordId, (idCounts.get(candidate.sourceRecordId) ?? 0) + 1);
    }
  }
  const duplicateIds = new Set([...idCounts].filter(([, count]) => count > 1).map(([id]) => id));
  const invalidRecords: CatalogInvalidRecord[] = [];
  const validCandidates: Candidate[] = [];
  for (const candidate of candidates) {
    const codes = [...candidate.codes];
    if (candidate.sourceRecordId !== null && duplicateIds.has(candidate.sourceRecordId)) codes.push("DUPLICATE_SOURCE_ID");
    if (codes.length > 0) {
      invalidRecords.push({ sourceRecordId: candidate.sourceRecordId, codes: [...new Set(codes)] });
    } else {
      validCandidates.push(candidate);
    }
  }

  const records: CatalogRecord[] = [];
  let missingImageCount = 0;
  let missingAudioCount = 0;
  let unusableMediaCount = 0;
  const mediaAvailabilityBySourceId: CatalogMediaAvailabilityBySourceId = {};
  for (const candidate of validCandidates) {
    const sourceRecordId = candidate.sourceRecordId;
    if (sourceRecordId === null) throw new CatalogImportError("SOURCE_RECORD_ID_INVALID");
    const mapping = mediaIndex.records.get(sourceRecordId);
    const image = resolveMedia(mapping?.imageKey ?? null, mediaIndex);
    const audio = resolveMedia(mapping?.audioKey ?? null, mediaIndex);
    mediaAvailabilityBySourceId[sourceRecordId] = { image: image.availability, audio: audio.availability };
    missingImageCount += image.missing;
    missingAudioCount += audio.missing;
    unusableMediaCount += image.unusable + audio.unusable;
    try {
      const word = requiredText(candidate.raw.word, "WORD_INVALID");
      const vietnamese = requiredText(candidate.raw.vietnamese, "VIETNAMESE_INVALID");
      records.push({
        sourceDataset: SOURCE_DATASET_ID,
        sourceRecordId,
        word,
        normalizedWord: normalizeWord(word),
        vietnamese,
        ipa: optionalText(candidate.raw.ipa, "IPA_INVALID"),
        definitionEn: optionalText(candidate.raw.definition_en, "DEFINITION_INVALID"),
        exampleEn: optionalText(candidate.raw.example_en, "EXAMPLE_INVALID"),
        topic: optionalText(candidate.raw.topic, "TOPIC_INVALID"),
        imageUrl: image.url,
        audioUrl: audio.url
      });
    } catch (error) {
      if (!(error instanceof CatalogImportError)) throw error;
      invalidRecords.push({ sourceRecordId, codes: [error.code] });
    }
  }

  const normalizedCounts = new Map<string, number>();
  for (const record of records) normalizedCounts.set(record.normalizedWord, (normalizedCounts.get(record.normalizedWord) ?? 0) + 1);
  const duplicateNormalizedWordGroups = [...normalizedCounts.values()].filter((count) => count > 1).length;
  const duplicateNormalizedWordRecords = [...normalizedCounts.values()]
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count, 0);

  return {
    sourceRecords: input.length,
    validRecords: records,
    invalidRecords,
    duplicateSourceIdCount: duplicateIds.size,
    duplicateNormalizedWordGroups,
    duplicateNormalizedWordRecords,
    missingImageCount,
    missingAudioCount,
    unusableMediaCount,
    mediaAvailabilityBySourceId
  };
}

export function loadCatalogValidation(
  datasetRoot = DEFAULT_DATASET_ROOT,
  manifestPath = join(process.cwd(), "local-data", "generated", "vocab-media-manifest.json"),
  mediaMapPath = join(process.cwd(), "local-data", "generated", "cloudinary-media-map.json"),
): CatalogValidation {
  const sourcePath = join(resolve(datasetRoot), "vocabulary.json");
  if (!existsSync(sourcePath)) throw new CatalogImportError("SOURCE_FILE_UNREADABLE");
  const mediaIndex = readMediaIndex(manifestPath, mediaMapPath);
  return validateCatalogRecords(readJson(sourcePath), mediaIndex);
}

function ownedFields(record: CatalogRecord) {
  return [
    record.word,
    record.ipa,
    record.vietnamese,
    record.definitionEn,
    record.exampleEn,
    record.imageUrl,
    record.audioUrl,
    record.topic
  ];
}

function existingFields(row: CatalogRow) {
  return [
    row.word,
    row.ipa,
    row.vietnamese,
    row.definition_en,
    row.example_en,
    row.image_url,
    row.audio_url,
    row.topic
  ];
}

function sameValues(left: readonly unknown[], right: readonly unknown[]) {
  return left.length === right.length && left.every((value, index) => (value ?? null) === (right[index] ?? null));
}

export function buildCatalogPlan(
  validation: CatalogValidation,
  snapshot: CatalogDatabaseSnapshot,
): CatalogPlan {
  const existingById = new Map<number, CatalogRow>();
  for (const row of snapshot.importedRows) {
    if (row.source_dataset !== SOURCE_DATASET_ID) continue;
    if (row.source_record_id == null || existingById.has(row.source_record_id)) {
      throw new CatalogImportError("DATABASE_DUPLICATE_SOURCE_ID");
    }
    existingById.set(row.source_record_id, row);
  }
  const entries: CatalogPlanEntry[] = validation.validRecords.map((record) => {
    const existing = existingById.get(record.sourceRecordId);
    if (!existing) return { action: "INSERT", record };
    if (sameValues(ownedFields(record), existingFields(existing))) {
      return { action: "SKIP", record, existing };
    }
    return {
      action: "UPDATE",
      record,
      existing,
      nextContentVersion: Math.max(existing.content_version, 1) + 1
    };
  });
  return {
    validation,
    snapshot,
    entries,
    insertCount: entries.filter((entry) => entry.action === "INSERT").length,
    updateCount: entries.filter((entry) => entry.action === "UPDATE").length,
    skipCount: entries.filter((entry) => entry.action === "SKIP").length,
    existingStarterRows: snapshot.starterRows.length,
    starterRowsModified: 0,
    learnerProgressRowsModified: 0,
    reviewEventRowsModified: 0
  };
}

function safeCount(value: unknown): number {
  try {
    const parsed = typeof value === "number" ? BigInt(value) : BigInt(String(value));
    if (parsed < 0n || parsed > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("UNSAFE_COUNT");
    return Number(parsed);
  } catch {
    throw new CatalogImportError("DATABASE_COUNT_INVALID");
  }
}

function rowFromDatabase(row: Record<string, unknown>): CatalogRow {
  const id = safeCount(row.id);
  const sourceRecordId = row.source_record_id == null ? null : safeCount(row.source_record_id);
  const contentVersion = safeCount(row.content_version);
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(contentVersion) || contentVersion < 1) {
    throw new CatalogImportError("DATABASE_ROW_INVALID");
  }
  return {
    id,
    word: String(row.word),
    ipa: row.ipa == null ? null : String(row.ipa),
    vietnamese: String(row.vietnamese),
    definition_en: row.definition_en == null ? null : String(row.definition_en),
    example_en: row.example_en == null ? null : String(row.example_en),
    image_url: row.image_url == null ? null : String(row.image_url),
    audio_url: row.audio_url == null ? null : String(row.audio_url),
    topic: row.topic == null ? null : String(row.topic),
    enabled: row.enabled === true,
    content_version: contentVersion,
    source_dataset: row.source_dataset == null ? null : String(row.source_dataset),
    source_record_id: sourceRecordId
  };
}

function sourceIdentityKey(sourceDataset: string, sourceRecordId: number) {
  return `${sourceDataset}\u0000${sourceRecordId}`;
}

function validateInsertReturningRows(
  records: readonly CatalogRecord[],
  rows: readonly Record<string, unknown>[],
): CatalogInsertResult[] {
  if (rows.length !== records.length) throw new CatalogImportError("INSERT_RETURNING_COUNT_MISMATCH");

  const expected = new Map<string, CatalogRecord>();
  for (const record of records) {
    const key = sourceIdentityKey(record.sourceDataset, record.sourceRecordId);
    if (expected.has(key)) throw new CatalogImportError("INSERT_SOURCE_IDENTITY_DUPLICATE");
    expected.set(key, record);
  }

  const returned = new Map<string, CatalogInsertResult>();
  const generatedIds = new Set<number>();
  for (const row of rows) {
    const id = safeCount(row.id);
    const sourceRecordId = safeCount(row.source_record_id);
    const sourceDataset = typeof row.source_dataset === "string" ? row.source_dataset : "";
    const key = sourceIdentityKey(sourceDataset, sourceRecordId);
    if (!expected.has(key)) throw new CatalogImportError("INSERT_RETURNING_SOURCE_IDENTITY_MISMATCH");
    if (returned.has(key)) throw new CatalogImportError("INSERT_RETURNING_DUPLICATE_SOURCE_IDENTITY");
    if (id <= STARTER_ID_MAX) throw new CatalogImportError("IMPORTED_ID_COLLIDES_WITH_STARTER");
    if (generatedIds.has(id)) throw new CatalogImportError("INSERT_RETURNING_DUPLICATE_ID");
    returned.set(key, { id, source_dataset: sourceDataset, source_record_id: sourceRecordId });
    generatedIds.add(id);
  }

  if (returned.size !== expected.size) throw new CatalogImportError("INSERT_RETURNING_SOURCE_IDENTITY_MISSING");
  return records.map((record) => returned.get(sourceIdentityKey(record.sourceDataset, record.sourceRecordId))!);
}

function validateFallbackGeneratedIds(records: readonly CatalogRecord[], ids: readonly number[]) {
  if (ids.length !== records.length) throw new CatalogImportError("INSERT_RETURNING_COUNT_MISMATCH");
  const seen = new Set<number>();
  for (const id of ids) {
    if (!Number.isSafeInteger(id) || id <= STARTER_ID_MAX) {
      throw new CatalogImportError("IMPORTED_ID_COLLIDES_WITH_STARTER");
    }
    if (seen.has(id)) throw new CatalogImportError("INSERT_RETURNING_DUPLICATE_ID");
    seen.add(id);
  }
}

async function stateFromSql(sqlClient: SqlTag): Promise<CatalogDatabaseSnapshot> {
  const [columns] = await sqlClient<{ source_dataset_exists: boolean; source_record_id_exists: boolean }>`
    SELECT
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ${APP_SCHEMA} AND table_name = 'vocabularies' AND column_name = 'source_dataset'
      ) AS source_dataset_exists,
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = ${APP_SCHEMA} AND table_name = 'vocabularies' AND column_name = 'source_record_id'
      ) AS source_record_id_exists
  `;
  const schemaReady = columns?.source_dataset_exists === true && columns.source_record_id_exists === true;
  const starterRows = await sqlClient<Record<string, unknown>>`
    SELECT id, word, ipa, vietnamese, definition_en, example_en, image_url, audio_url, topic,
           enabled, content_version
           ${schemaReady ? sqlClient.unsafe(", source_dataset, source_record_id") : sqlClient.unsafe("")}
    FROM ${sqlClient.unsafe(VOCABULARY_TABLE)}
    WHERE id BETWEEN 1 AND ${STARTER_ID_MAX}
    ORDER BY id ASC
  `;
  const importedRows = schemaReady
    ? await sqlClient<Record<string, unknown>>`
        SELECT id, word, ipa, vietnamese, definition_en, example_en, image_url, audio_url, topic,
               enabled, content_version, source_dataset, source_record_id
        FROM ${sqlClient.unsafe(VOCABULARY_TABLE)}
        WHERE source_dataset = ${SOURCE_DATASET_ID}
        ORDER BY source_record_id ASC
      `
    : [];
  const [progress] = await sqlClient<{ count: string }>`SELECT count(*)::text AS count FROM ${sqlClient.unsafe(PROGRESS_TABLE)}`;
  const [events] = await sqlClient<{ count: string }>`SELECT count(*)::text AS count FROM ${sqlClient.unsafe(EVENTS_TABLE)}`;
  return {
    schemaReady,
    starterRows: starterRows.map(rowFromDatabase),
    importedRows: importedRows.map(rowFromDatabase),
    learnerProgressCount: safeCount(progress?.count ?? 0),
    reviewEventCount: safeCount(events?.count ?? 0)
  };
}

function transactionForSql(sqlClient: SqlTag): CatalogTransaction {
  return {
    readState: () => stateFromSql(sqlClient),
    insertRecord: async (record) => {
      const [row] = await sqlClient<{ id: number }>`
        INSERT INTO ${sqlClient.unsafe(VOCABULARY_TABLE)}
          (word, ipa, vietnamese, definition_en, example_en, image_url, audio_url, topic,
           enabled, content_version, source_dataset, source_record_id)
        VALUES (
          ${record.word}, ${record.ipa}, ${record.vietnamese}, ${record.definitionEn},
          ${record.exampleEn}, ${record.imageUrl}, ${record.audioUrl}, ${record.topic},
          false, 1, ${record.sourceDataset}, ${record.sourceRecordId}
        )
        RETURNING id
      `;
      const id = safeCount(row?.id);
      if (id <= STARTER_ID_MAX) throw new CatalogImportError("IMPORTED_ID_COLLIDES_WITH_STARTER");
      return id;
    },
    insertRecords: async (records) => {
      if (records.length === 0) return [];
      if (records.length > CATALOG_INSERT_BATCH_SIZE) {
        throw new CatalogImportError("INSERT_BATCH_SIZE_INVALID");
      }

      const parameters = records.flatMap((record) => [
        record.word,
        record.ipa,
        record.vietnamese,
        record.definitionEn,
        record.exampleEn,
        record.imageUrl,
        record.audioUrl,
        record.topic,
        record.sourceDataset,
        record.sourceRecordId,
      ]);
      let parameterIndex = 0;
      const values = records.map(() => {
        const fields = Array.from({ length: 8 }, () => `$${++parameterIndex}`);
        fields.push("false", "1", `$${++parameterIndex}`, `$${++parameterIndex}`);
        return `(${fields.join(", ")})`;
      });
      const statement = `
        INSERT INTO ${VOCABULARY_TABLE}
          (word, ipa, vietnamese, definition_en, example_en, image_url, audio_url, topic,
           enabled, content_version, source_dataset, source_record_id)
        VALUES ${values.join(", ")}
        RETURNING id, source_dataset, source_record_id
      `;
      const rows = await sqlClient.unsafe(statement, parameters) as Array<Record<string, unknown>>;
      return validateInsertReturningRows(records, rows);
    },
    updateRecord: async (record, existing, nextContentVersion) => {
      const rows = await sqlClient<{ id: number }>`
        UPDATE ${sqlClient.unsafe(VOCABULARY_TABLE)}
        SET word = ${record.word},
            ipa = ${record.ipa},
            vietnamese = ${record.vietnamese},
            definition_en = ${record.definitionEn},
            example_en = ${record.exampleEn},
            image_url = ${record.imageUrl},
            audio_url = ${record.audioUrl},
            topic = ${record.topic},
            content_version = ${nextContentVersion},
            updated_at = now()
        WHERE source_dataset = ${record.sourceDataset}
          AND source_record_id = ${record.sourceRecordId}
        RETURNING id
      `;
      if (rows.length !== 1 || rows[0]?.id !== existing.id) throw new CatalogImportError("DB_ROW_CHANGED_DURING_APPLY");
      return existing.id;
    },
    syncTopicMemberships: async () => {
      await sqlClient`
        DELETE FROM "${sqlClient.unsafe(APP_SCHEMA)}"."vocabulary_topics" vt
        USING "${sqlClient.unsafe(APP_SCHEMA)}"."vocabularies" v
        WHERE v.id = vt.vocabulary_id
          AND v.source_dataset = ${SOURCE_DATASET_ID}
      `;
      await sqlClient`
        INSERT INTO "${sqlClient.unsafe(APP_SCHEMA)}"."vocabulary_topics" (vocabulary_id, topic_id, review_status)
        SELECT v.id, t.id, 'APPROVED'
        FROM "${sqlClient.unsafe(APP_SCHEMA)}"."vocabularies" v
        JOIN "${sqlClient.unsafe(APP_SCHEMA)}"."topics" t ON t.source_topic = v.topic
        WHERE v.source_dataset = ${SOURCE_DATASET_ID}
          AND v.source_record_id IS NOT NULL
        ON CONFLICT (vocabulary_id, topic_id) DO UPDATE SET review_status = 'APPROVED'
      `;
      await sqlClient`UPDATE "${sqlClient.unsafe(APP_SCHEMA)}"."topics" t SET review_status = 'APPROVED'
        WHERE EXISTS (SELECT 1 FROM "${sqlClient.unsafe(APP_SCHEMA)}"."vocabularies" v
          WHERE v.source_dataset = ${SOURCE_DATASET_ID} AND v.topic = t.source_topic)`;
    }
  };
}

export function createPostgresCatalogDatabase(sqlClient: SqlTag): CatalogDatabase {
  return {
    ...transactionForSql(sqlClient),
    transaction: <T>(operation: (transaction: CatalogTransaction) => Promise<T>) =>
      sqlClient.begin((transaction) => operation(transactionForSql(transaction)))
  };
}

export async function runDryRun(
  database: CatalogDatabase,
  validation = loadCatalogValidation(),
): Promise<CatalogPlan> {
  return buildCatalogPlan(validation, await database.readState());
}

export async function runApply(
  database: CatalogDatabase,
  validation = loadCatalogValidation(),
): Promise<CatalogPlan> {
  if (validation.invalidRecords.length > 0) throw new CatalogImportError("INVALID_RECORDS_PRESENT");
  return database.transaction(async (transaction) => {
    const before = await transaction.readState();
    if (!before.schemaReady) throw new CatalogImportError("CATALOG_SCHEMA_NOT_READY");
    const plan = buildCatalogPlan(validation, before);
    const pendingInserts: CatalogRecord[] = [];
    const flushInserts = async () => {
      if (pendingInserts.length === 0) return;
      const records = pendingInserts.splice(0, pendingInserts.length);
      if (transaction.insertRecords) {
        validateInsertReturningRows(records, await transaction.insertRecords(records));
        return;
      }
      const ids: number[] = [];
      for (const record of records) ids.push(await transaction.insertRecord(record));
      validateFallbackGeneratedIds(records, ids);
    };

    for (const entry of plan.entries) {
      if (entry.action === "INSERT") {
        pendingInserts.push(entry.record);
        if (pendingInserts.length === CATALOG_INSERT_BATCH_SIZE) await flushInserts();
      } else if (entry.action === "UPDATE") {
        await flushInserts();
        await transaction.updateRecord(entry.record, entry.existing, entry.nextContentVersion);
      }
    }
    await flushInserts();
    await transaction.syncTopicMemberships?.();
    const after = await transaction.readState();
    if (after.learnerProgressCount !== before.learnerProgressCount) throw new CatalogImportError("LEARNER_PROGRESS_CHANGED");
    if (after.reviewEventCount !== before.reviewEventCount) throw new CatalogImportError("REVIEW_EVENTS_CHANGED");
    if (after.starterRows.length !== before.starterRows.length
      || after.starterRows.some((row, index) => row.id !== before.starterRows[index]?.id || row.word !== before.starterRows[index]?.word)) {
      throw new CatalogImportError("STARTER_ROWS_CHANGED");
    }
    if (after.importedRows.some((row) => row.enabled && row.source_dataset === SOURCE_DATASET_ID && !before.importedRows.some((beforeRow) => beforeRow.id === row.id))) {
      throw new CatalogImportError("IMPORTED_ROW_ENABLED_UNEXPECTED");
    }
    return { ...plan, snapshot: before };
  });
}

export function renderReport(plan: CatalogPlan, applyMode: boolean): string[] {
  const validation = plan.validation;
  const status = validation.invalidRecords.length === 0 ? "PASS" : "FAIL";
  return [
    `SOURCE_DATASET_ID=${SOURCE_DATASET_ID}`,
    `SOURCE_RECORDS=${validation.sourceRecords}`,
    `VALID_RECORDS=${validation.validRecords.length}`,
    `INVALID_RECORDS=${validation.invalidRecords.length}`,
    `INSERT_COUNT=${plan.insertCount}`,
    `UPDATE_COUNT=${plan.updateCount}`,
    `SKIP_COUNT=${plan.skipCount}`,
    `DUPLICATE_SOURCE_ID_COUNT=${validation.duplicateSourceIdCount}`,
    `DUPLICATE_NORMALIZED_WORD_GROUPS=${validation.duplicateNormalizedWordGroups}`,
    `DUPLICATE_NORMALIZED_WORD_RECORDS=${validation.duplicateNormalizedWordRecords}`,
    `MISSING_IMAGE_COUNT=${validation.missingImageCount}`,
    `MISSING_AUDIO_COUNT=${validation.missingAudioCount}`,
    `UNUSABLE_MEDIA_COUNT=${validation.unusableMediaCount}`,
    `EXISTING_STARTER_ROWS=${plan.existingStarterRows}`,
    `STARTER_ROWS_MODIFIED=${plan.starterRowsModified}`,
    `LEARNER_PROGRESS_ROWS_MODIFIED=${plan.learnerProgressRowsModified}`,
    `REVIEW_EVENT_ROWS_MODIFIED=${plan.reviewEventRowsModified}`,
    `SCHEMA_READY=${plan.snapshot.schemaReady ? "YES" : "NO"}`,
    `APPLY_MODE=${applyMode ? "APPLY" : "DRY_RUN"}`,
    `DATABASE_MUTATIONS=${applyMode ? plan.insertCount + plan.updateCount : 0}`,
    `STATUS=${status}`
  ];
}

export async function runProductionCatalogImport(input: {
  options: ProductionReleaseOptions;
  apply: boolean;
  environment: NodeJS.ProcessEnv;
  validation?: CatalogValidation;
  neonApiClient?: NeonApiClient;
  openSql?: (url: string) => ReturnType<typeof openSql>;
}): Promise<CatalogPlan> {
  const authorizedTarget = authorizeProductionRelease({
    options: input.options,
    mode: input.apply ? "mutation" : "read-only",
    environment: input.environment,
  });
  const connection = await resolveProductionConnection({
    purpose: "runtime",
    environment: input.environment,
    neonApiClient: input.neonApiClient,
  });
  const canonicalRuntimeTarget = getConnectionTarget("production", "runtime");
  const providerTarget = connection.resolved.expected;
  if (
    connection.target.roleName !== canonicalRuntimeTarget.roleName
    || connection.target.purpose !== "runtime"
    || connection.target.projectId !== authorizedTarget.projectId
    || connection.target.branchId !== authorizedTarget.branchId
    || connection.target.databaseName !== authorizedTarget.databaseName
    || providerTarget.roleName !== canonicalRuntimeTarget.roleName
    || providerTarget.branchId !== authorizedTarget.branchId
    || providerTarget.projectId !== authorizedTarget.projectId
    || providerTarget.databaseName !== authorizedTarget.databaseName
  ) {
    throw new CatalogImportError("PRODUCTION_RUNTIME_TARGET_MISMATCH");
  }

  const validation = input.validation ?? loadCatalogValidation();
  const sqlClient = (input.openSql ?? openSql)(connection.url) as unknown as SqlTag;
  try {
    if (!input.apply) {
      return await sqlClient.begin(async (transaction) => {
        await transaction`SET TRANSACTION READ ONLY`;
        await assertPostConnectIdentity(transaction as unknown as ReturnType<typeof openSql>, connection.target);
        return runDryRun(createPostgresCatalogDatabase(transaction), validation);
      });
    }

    const database: CatalogDatabase = {
      ...createPostgresCatalogDatabase(sqlClient),
      transaction: <T>(operation: (transaction: CatalogTransaction) => Promise<T>) =>
        sqlClient.begin(async (transaction) => {
          // Check protected identity inside the same transaction and before
          // reading or mutating the production catalog.
          await assertPostConnectIdentity(transaction as unknown as ReturnType<typeof openSql>, connection.target);
          return operation(transactionForSql(transaction));
        }),
    };
    return runAuthorizedProductionMutation(
      { options: input.options, environment: input.environment },
      async (confirmedTarget) => {
        if (confirmedTarget.branchId !== authorizedTarget.branchId) {
          throw new CatalogImportError("PRODUCTION_TARGET_CHANGED_AFTER_PREFLIGHT");
        }
        return runApply(database, validation);
      },
    );
  } finally {
    await sqlClientEnd(sqlClient);
  }
}

function loadRepositoryEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  try {
    loadEnvFile(envPath);
  } catch {
    throw new CatalogImportError("ENV_FILE_INVALID");
  }
}

function sqlClientEnd(sqlClient: SqlTag) {
  return (sqlClient as unknown as ReturnType<typeof postgres>).end({ timeout: 5 });
}

async function main() {
  loadRepositoryEnv();
  const args = process.argv.slice(2);
  const options = parseCatalogImportCliArgs(args);
  const productionInvocation = options.productionOptions !== undefined
    || process.env.VOCABFLOW_ENV === "production"
    || process.env.DATABASE_ENV === "production";
  if (productionInvocation) {
    const plan = await runProductionCatalogImport({
      options: options.productionOptions ?? {},
      apply: options.apply,
      environment: process.env,
    });
    console.log("TARGET_NAME=production");
    console.log(`TARGET_BRANCH=${getConnectionTarget("production", "runtime").branchId}`);
    for (const line of renderReport(plan, options.apply)) console.log(line);
    return;
  }

  const apply = options.apply;
  const validation = loadCatalogValidation();
  const { context, environment } = readContext();
  const target = getConnectionTarget(environment === "test" ? "test" : environment === "production" ? "production" : "development", "runtime");
  const connection = apply
    ? await assertResolvedTargetBeforeMutation({
      context,
      source: context === "ci-test" ? "github-actions" : context === "vercel-production" ? "vercel-runtime" : "dev-launcher",
      environment,
      purpose: "runtime",
      operation: "db-enrich",
      target
    })
    : assertPreConnect({
      context,
      source: context === "ci-test" ? "github-actions" : context === "vercel-production" ? "vercel-runtime" : "dev-launcher",
      environment,
      purpose: "runtime",
      operation: "db-enrich",
      target
    });
  const url = connection.url ?? configuredDatabaseUrl(context, "runtime");
  if (!url) throw new CatalogImportError("RUNTIME_DATABASE_URL_REQUIRED");
  const sqlClient = openSql(url) as unknown as SqlTag;
  try {
    const database = createPostgresCatalogDatabase(sqlClient);
    const plan = apply ? await runApply(database, validation) : await runDryRun(database, validation);
    for (const line of renderReport(plan, apply)) console.log(line);
  } finally {
    await sqlClientEnd(sqlClient);
  }
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/import-vocabulary-catalog.ts") || invokedScript.endsWith("/import-vocabulary-catalog.js")) {
  main().catch((error: unknown) => {
    console.error(renderCatalogImportFailure(error));
    process.exitCode = 1;
  });
}
