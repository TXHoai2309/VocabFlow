import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { join } from "node:path";
import postgres from "postgres";
import { APP_SCHEMA } from "@vocabflow/contracts";
import { DEFAULT_DATASET_ROOT } from "./vocab-media-manifest";
import { getConnectionTarget } from "../config/database-targets";
import {
  assertPreConnect,
  assertResolvedTargetBeforeMutation,
  configuredDatabaseUrl
} from "./runtime-validation";
import { openSql, readContext } from "./db-core";

export const APPROVED_ENRICHMENTS = [
  { dbId: 1, starterWord: "apple", sourceId: 265, sourceWord: "apple" },
  { dbId: 2, starterWord: "book", sourceId: 762, sourceWord: "book" },
  { dbId: 7, starterWord: "home", sourceId: 208, sourceWord: "home" },
  { dbId: 8, starterWord: "school", sourceId: 262, sourceWord: "school" },
  { dbId: 9, starterWord: "teacher", sourceId: 759, sourceWord: "teacher" },
  { dbId: 11, starterWord: "water", sourceId: 375, sourceWord: "water" },
  { dbId: 18, starterWord: "eat", sourceId: 931, sourceWord: "eat" },
  { dbId: 19, starterWord: "drink", sourceId: 932, sourceWord: "drink" }
] as const;

const ENRICHABLE_FIELDS = [
  "ipa",
  "vietnamese",
  "definition_en",
  "example_en",
  "image_url",
  "audio_url",
  "topic"
] as const;

type EnrichableField = typeof ENRICHABLE_FIELDS[number];

export type SourceVocabularyRecord = {
  id: number;
  word: string;
  ipa?: string | null;
  vietnamese: string;
  definition_en?: string | null;
  example_en?: string | null;
  topic?: string | null;
};

export type SourceMediaMapping = {
  vocabularyId: number;
  word: string;
  imageKey: string | null;
  audioKey: string | null;
};

export type MediaMapAsset = {
  mediaKey: string;
  type: "image" | "audio";
  status: string;
  secureUrl?: string;
};

export type CurrentVocabularyRow = {
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
};

/**
 * Source content is intentionally partial: an absent source field must be
 * preserved from the current database row rather than written as NULL.
 */
export type EnrichmentContent = Partial<Pick<CurrentVocabularyRow, EnrichableField>>;
type CompleteEnrichmentContent = Pick<CurrentVocabularyRow, EnrichableField>;

export type EnrichmentInput = {
  dbId: number;
  starterWord: string;
  sourceId: number;
  sourceWord: string;
  content: EnrichmentContent;
  imageAvailable: boolean;
  audioAvailable: boolean;
};

export type EnrichmentPlanEntry = EnrichmentInput & {
  currentWord: string;
  currentEnabled: boolean;
  currentContentVersion: number;
  proposedContentVersion: number;
  proposedContent: CompleteEnrichmentContent;
  fieldsToChange: string[];
  semanticIdentity: "PASS";
  status: "UPDATE_REQUIRED" | "ALREADY_ENRICHED" | "NO_CHANGE";
};

export type EnrichmentPlan = {
  entries: EnrichmentPlanEntry[];
  updateCount: number;
  alreadyEnrichedCount: number;
  noChangeCount: number;
};

export type EnrichmentUpdate = {
  dbId: number;
  starterWord: string;
  enabled: boolean;
  contentVersion: number;
  content: CompleteEnrichmentContent;
};

export class StarterEnrichmentError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "StarterEnrichmentError";
    this.code = code;
  }
}

export type EnrichmentTransaction = {
  readApprovedRows: (ids: readonly number[], lockForUpdate?: boolean) => Promise<CurrentVocabularyRow[]>;
  updateVocabularyRow: (update: EnrichmentUpdate) => Promise<number>;
};

export type EnrichmentDatabase = EnrichmentTransaction & {
  transaction: <T>(operation: (transaction: EnrichmentTransaction) => Promise<T>) => Promise<T>;
};

function requiredText(value: unknown, code: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new StarterEnrichmentError(code);
  return value;
}

function optionalText(value: unknown): string | null {
  if (value == null || (typeof value === "string" && value.trim() === "")) return null;
  if (typeof value !== "string") throw new StarterEnrichmentError("SOURCE_FIELD_INVALID");
  return value;
}

function sourceOptionalField(source: SourceVocabularyRecord, field: "ipa" | "definition_en" | "example_en" | "topic") {
  if (!Object.prototype.hasOwnProperty.call(source, field) || source[field] === undefined) {
    return { present: false, value: null };
  }
  return { present: true, value: optionalText(source[field]) };
}

function indexUnique<T, K>(values: readonly T[], getKey: (value: T) => K, duplicateCode: string) {
  const indexed = new Map<K, T>();
  for (const value of values) {
    const key = getKey(value);
    if (indexed.has(key)) throw new StarterEnrichmentError(duplicateCode);
    indexed.set(key, value);
  }
  return indexed;
}

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as unknown;
  } catch {
    throw new StarterEnrichmentError("ENRICHMENT_SOURCE_UNREADABLE");
  }
}

function sourceRecordsOf(input: unknown): SourceVocabularyRecord[] {
  if (!Array.isArray(input)) throw new StarterEnrichmentError("SOURCE_DATASET_INVALID");
  const ids = new Set<number>();
  return input.map((value) => {
    if (!value || typeof value !== "object") throw new StarterEnrichmentError("SOURCE_DATASET_INVALID");
    const record = value as Record<string, unknown>;
    if (typeof record.id !== "number" || !Number.isSafeInteger(record.id) || record.id < 1) {
      throw new StarterEnrichmentError("SOURCE_ID_INVALID");
    }
    if (ids.has(record.id)) throw new StarterEnrichmentError("SOURCE_DUPLICATE_ID");
    ids.add(record.id);
    requiredText(record.word, "SOURCE_WORD_INVALID");
    requiredText(record.vietnamese, "SOURCE_VIETNAMESE_INVALID");
    return record as SourceVocabularyRecord;
  });
}

function mediaMappingsOf(input: unknown): SourceMediaMapping[] {
  if (!Array.isArray(input)) throw new StarterEnrichmentError("MEDIA_MANIFEST_INVALID");
  const ids = new Set<number>();
  return input.map((value) => {
    if (!value || typeof value !== "object") throw new StarterEnrichmentError("MEDIA_MANIFEST_INVALID");
    const record = value as Record<string, unknown>;
    if (typeof record.vocabularyId !== "number" || !Number.isSafeInteger(record.vocabularyId)) {
      throw new StarterEnrichmentError("MEDIA_MANIFEST_INVALID");
    }
    if (record.vocabularyId < 1 || ids.has(record.vocabularyId)) {
      throw new StarterEnrichmentError("MEDIA_MANIFEST_DUPLICATE_VOCABULARY_ID");
    }
    ids.add(record.vocabularyId);
    return {
      vocabularyId: record.vocabularyId,
      word: requiredText(record.word, "MEDIA_MANIFEST_INVALID"),
      imageKey: record.imageKey == null ? null : requiredText(record.imageKey, "MEDIA_MANIFEST_INVALID"),
      audioKey: record.audioKey == null ? null : requiredText(record.audioKey, "MEDIA_MANIFEST_INVALID")
    } satisfies SourceMediaMapping;
  });
}

function mediaAssetsOf(input: unknown): MediaMapAsset[] {
  if (!input || typeof input !== "object") throw new StarterEnrichmentError("MEDIA_MAP_INVALID");
  const assets = (input as { assets?: unknown }).assets;
  if (!Array.isArray(assets)) throw new StarterEnrichmentError("MEDIA_MAP_INVALID");
  const keys = new Set<string>();
  return assets.map((value) => {
    if (!value || typeof value !== "object") throw new StarterEnrichmentError("MEDIA_MAP_INVALID");
    const asset = value as Record<string, unknown>;
    if (asset.type !== "image" && asset.type !== "audio") throw new StarterEnrichmentError("MEDIA_MAP_INVALID");
    const mediaKey = requiredText(asset.mediaKey, "MEDIA_MAP_INVALID");
    if (keys.has(mediaKey)) throw new StarterEnrichmentError("MEDIA_MAP_DUPLICATE_KEY");
    keys.add(mediaKey);
    return {
      mediaKey,
      type: asset.type,
      status: requiredText(asset.status, "MEDIA_MAP_INVALID"),
      secureUrl: asset.secureUrl == null ? undefined : requiredText(asset.secureUrl, "MEDIA_MAP_INVALID")
    } satisfies MediaMapAsset;
  });
}

export function buildEnrichmentInputs(
  sourceRecords: SourceVocabularyRecord[],
  mediaMappings: SourceMediaMapping[],
  mediaAssets: MediaMapAsset[]
): EnrichmentInput[] {
  if (APPROVED_ENRICHMENTS.length !== 8) throw new StarterEnrichmentError("APPROVED_SET_INVALID");
  const approvedDbIds = new Set<number>();
  const approvedSourceIds = new Set<number>();
  const sourceById = indexUnique(sourceRecords, (record) => record.id, "SOURCE_DUPLICATE_ID");
  const mediaById = indexUnique(mediaMappings, (mapping) => mapping.vocabularyId, "MEDIA_MANIFEST_DUPLICATE_VOCABULARY_ID");
  const assetByKey = indexUnique(mediaAssets, (asset) => asset.mediaKey, "MEDIA_MAP_DUPLICATE_KEY");

  return APPROVED_ENRICHMENTS.map((approved) => {
    if (approvedDbIds.has(approved.dbId)) throw new StarterEnrichmentError("APPROVED_DB_ID_DUPLICATE");
    if (approvedSourceIds.has(approved.sourceId)) throw new StarterEnrichmentError("APPROVED_SOURCE_ID_DUPLICATE");
    approvedDbIds.add(approved.dbId);
    approvedSourceIds.add(approved.sourceId);

    const source = sourceById.get(approved.sourceId);
    if (!source || source.word !== approved.sourceWord) throw new StarterEnrichmentError("APPROVED_SOURCE_ID_WORD_MISMATCH");
    const mapping = mediaById.get(approved.sourceId);
    if (!mapping || mapping.word !== approved.sourceWord) throw new StarterEnrichmentError("APPROVED_MEDIA_WORD_MISMATCH");
    if (!mapping.imageKey || !mapping.audioKey) throw new StarterEnrichmentError("APPROVED_MEDIA_MAPPING_MISSING");
    const image = assetByKey.get(mapping.imageKey);
    const audio = assetByKey.get(mapping.audioKey);
    if (!image || image.type !== "image" || image.status !== "UPLOADED" || !image.secureUrl) {
      throw new StarterEnrichmentError("APPROVED_IMAGE_MEDIA_UNAVAILABLE");
    }
    if (!audio || audio.type !== "audio" || audio.status !== "UPLOADED" || !audio.secureUrl) {
      throw new StarterEnrichmentError("APPROVED_AUDIO_MEDIA_UNAVAILABLE");
    }

    const ipa = sourceOptionalField(source, "ipa");
    const definition = sourceOptionalField(source, "definition_en");
    const example = sourceOptionalField(source, "example_en");
    const topic = sourceOptionalField(source, "topic");
    return {
      dbId: approved.dbId,
      starterWord: approved.starterWord,
      sourceId: approved.sourceId,
      sourceWord: approved.sourceWord,
      content: {
        ipa: ipa.present ? ipa.value : undefined,
        vietnamese: requiredText(source.vietnamese, "SOURCE_VIETNAMESE_INVALID"),
        definition_en: definition.present ? definition.value : undefined,
        example_en: example.present ? example.value : undefined,
        image_url: image.secureUrl,
        audio_url: audio.secureUrl,
        topic: topic.present ? topic.value : undefined
      },
      imageAvailable: true,
      audioAvailable: true
    } satisfies EnrichmentInput;
  });
}

export function loadEnrichmentInputs(
  datasetRoot = DEFAULT_DATASET_ROOT,
  manifestPath = join(process.cwd(), "local-data", "generated", "vocab-media-manifest.json"),
  mediaMapPath = join(process.cwd(), "local-data", "generated", "cloudinary-media-map.json")
): EnrichmentInput[] {
  const dataset = sourceRecordsOf(readJson(join(datasetRoot, "vocabulary.json")));
  const manifest = readJson(manifestPath);
  const mappings = mediaMappingsOf(manifest && typeof manifest === "object" ? (manifest as { records?: unknown }).records : undefined);
  return buildEnrichmentInputs(dataset, mappings, mediaAssetsOf(readJson(mediaMapPath)));
}

function sameValue(left: unknown, right: unknown) {
  return (left ?? null) === (right ?? null);
}

export function buildEnrichmentPlan(
  currentRows: CurrentVocabularyRow[],
  inputs: EnrichmentInput[] = loadEnrichmentInputs()
): EnrichmentPlan {
  if (APPROVED_ENRICHMENTS.length !== 8 || inputs.length !== APPROVED_ENRICHMENTS.length) {
    throw new StarterEnrichmentError("APPROVED_SET_INVALID");
  }
  const approvedByDbId = new Map<number, typeof APPROVED_ENRICHMENTS[number]>(
    indexUnique(APPROVED_ENRICHMENTS, (approved) => approved.dbId, "APPROVED_DB_ID_DUPLICATE")
  );
  const approvedBySourceId = new Map<number, typeof APPROVED_ENRICHMENTS[number]>(
    indexUnique(APPROVED_ENRICHMENTS, (approved) => approved.sourceId, "APPROVED_SOURCE_ID_DUPLICATE")
  );
  if (approvedByDbId.size !== 8 || approvedBySourceId.size !== 8) {
    throw new StarterEnrichmentError("APPROVED_SET_INVALID");
  }
  const inputByDbId = indexUnique(inputs, (input) => input.dbId, "APPROVED_INPUT_DB_ID_DUPLICATE");
  const inputBySourceId = indexUnique(inputs, (input) => input.sourceId, "APPROVED_INPUT_SOURCE_ID_DUPLICATE");
  if (inputByDbId.size !== 8 || inputBySourceId.size !== 8) {
    throw new StarterEnrichmentError("APPROVED_SET_INVALID");
  }
  for (const input of inputs) {
    const approved = approvedByDbId.get(input.dbId);
    if (!approved) throw new StarterEnrichmentError("APPROVED_INPUT_DB_ID_UNEXPECTED");
    if (input.starterWord !== approved.starterWord) throw new StarterEnrichmentError("APPROVED_INPUT_WORD_MISMATCH");
    if (input.sourceId !== approved.sourceId) throw new StarterEnrichmentError("APPROVED_INPUT_SOURCE_ID_MISMATCH");
    if (input.sourceWord !== approved.sourceWord) throw new StarterEnrichmentError("SOURCE_WORD_IDENTITY_MISMATCH");
  }

  const approvedDbIds = new Set<number>(APPROVED_ENRICHMENTS.map((approved) => approved.dbId));
  const rowById = new Map<number, CurrentVocabularyRow>();
  for (const row of currentRows) {
    if (!approvedDbIds.has(row.id)) continue;
    if (rowById.has(row.id)) throw new StarterEnrichmentError("APPROVED_DB_ROW_DUPLICATE");
    rowById.set(row.id, row);
  }
  const entries = inputs.map((input) => {
    if (!inputByDbId.has(input.dbId)) throw new StarterEnrichmentError("APPROVED_DB_ROW_MISSING");
    const row = rowById.get(input.dbId);
    if (!row) throw new StarterEnrichmentError("APPROVED_DB_ROW_MISSING");
    if (row.id !== input.dbId) throw new StarterEnrichmentError("DB_IDENTITY_MISMATCH");
    if (row.word !== input.starterWord) throw new StarterEnrichmentError("DB_WORD_MISMATCH");
    if (input.sourceWord !== input.starterWord) throw new StarterEnrichmentError("SOURCE_WORD_IDENTITY_MISMATCH");
    const proposedContent = Object.fromEntries(ENRICHABLE_FIELDS.map((field) => [
      field,
      input.content[field] === undefined ? row[field] : input.content[field]
    ])) as CompleteEnrichmentContent;
    const changedFields = ENRICHABLE_FIELDS.filter((field) => !sameValue(row[field], proposedContent[field]));
    if (row.content_version !== 1 && row.content_version !== 2) {
      throw new StarterEnrichmentError("DB_CONTENT_VERSION_UNEXPECTED");
    }
    if (row.content_version === 2) {
      if (changedFields.length > 0) throw new StarterEnrichmentError("DB_CONTENT_STATE_UNEXPECTED");
      return {
        ...input,
        currentWord: row.word,
        currentEnabled: row.enabled,
        currentContentVersion: row.content_version,
        proposedContentVersion: row.content_version,
        proposedContent,
        fieldsToChange: [],
        semanticIdentity: "PASS",
        status: "ALREADY_ENRICHED"
      } satisfies EnrichmentPlanEntry;
    }

    return {
      ...input,
      currentWord: row.word,
      currentEnabled: row.enabled,
      currentContentVersion: row.content_version,
      proposedContentVersion: changedFields.length > 0 ? 2 : 1,
      proposedContent,
      fieldsToChange: changedFields.length > 0 ? [...changedFields, "content_version"] : [],
      semanticIdentity: "PASS",
      status: changedFields.length > 0 ? "UPDATE_REQUIRED" : "NO_CHANGE"
    } satisfies EnrichmentPlanEntry;
  });
  return {
    entries,
    updateCount: entries.filter((entry) => entry.status === "UPDATE_REQUIRED").length,
    alreadyEnrichedCount: entries.filter((entry) => entry.status === "ALREADY_ENRICHED").length,
    noChangeCount: entries.filter((entry) => entry.status === "NO_CHANGE").length
  };
}

export function updatesFromPlan(plan: EnrichmentPlan): EnrichmentUpdate[] {
  return plan.entries
    .filter((entry) => entry.status === "UPDATE_REQUIRED")
    .map((entry) => ({
      dbId: entry.dbId,
      starterWord: entry.starterWord,
      enabled: entry.currentEnabled,
      contentVersion: entry.proposedContentVersion,
      content: entry.proposedContent
    }));
}

function assertApprovedUpdate(update: EnrichmentUpdate) {
  const approved = APPROVED_ENRICHMENTS.find((item) => item.dbId === update.dbId);
  if (!approved || approved.starterWord !== update.starterWord) {
    throw new StarterEnrichmentError("UPDATE_IDENTITY_MISMATCH");
  }
  if (update.contentVersion !== 2) throw new StarterEnrichmentError("UPDATE_VERSION_INVALID");
}

export async function runDryRun(database: EnrichmentDatabase, inputs = loadEnrichmentInputs()) {
  const rows = await database.readApprovedRows(APPROVED_ENRICHMENTS.map((item) => item.dbId));
  return buildEnrichmentPlan(rows, inputs);
}

export async function runApply(database: EnrichmentDatabase, inputs = loadEnrichmentInputs()) {
  return database.transaction(async (transaction) => {
    const rows = await transaction.readApprovedRows(APPROVED_ENRICHMENTS.map((item) => item.dbId), true);
    const plan = buildEnrichmentPlan(rows, inputs);
    for (const update of updatesFromPlan(plan)) {
      const affectedRows = await transaction.updateVocabularyRow(update);
      if (affectedRows !== 1) throw new StarterEnrichmentError("DB_ROW_CHANGED_DURING_APPLY");
    }
    return plan;
  });
}

export function renderDryRun(plan: EnrichmentPlan): string[] {
  return [
    "STARTER_ENRICHMENT_MODE=DRY_RUN",
    "DRY_RUN_MUTATES_DB=NO",
    `APPROVED_ROW_COUNT=${plan.entries.length}`,
    `UPDATE_COUNT=${plan.updateCount}`,
    ...plan.entries.map((entry) => [
      `ENRICHMENT_ROW=${entry.dbId}`,
      `CURRENT_WORD=${entry.currentWord}`,
      `SOURCE_DATASET_ID=${entry.sourceId}`,
      `SOURCE_WORD=${entry.sourceWord}`,
      `CURRENT_CONTENT_VERSION=${entry.currentContentVersion}`,
      `PROPOSED_CONTENT_VERSION=${entry.proposedContentVersion}`,
      `FIELDS_TO_CHANGE=${entry.fieldsToChange.join(",") || "NONE"}`,
      `IMAGE_AVAILABLE=${entry.imageAvailable ? "YES" : "NO"}`,
      `AUDIO_AVAILABLE=${entry.audioAvailable ? "YES" : "NO"}`,
      `SEMANTIC_IDENTITY=${entry.semanticIdentity}`,
      `SEMANTIC_IDENTITY_CHECK=${entry.semanticIdentity}`,
      `STATUS=${entry.status}`
    ].join(" ")),
    "STUDENT_SKIPPED=YES id=10 reason=MATERIAL_MEANING_MISMATCH",
    "REMAINING_STARTER_ROWS_UNTOUCHED=21",
    "NO_INSERTS=YES",
    "NO_DELETES=YES",
    "LEARNER_PROGRESS_TOUCHED=NO",
    "REVIEW_EVENTS_TOUCHED=NO"
  ];
}

type SqlTag = {
  <T extends Record<string, unknown> = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[] & { count?: number }>;
  unsafe: (value: string) => unknown;
  begin: <T>(operation: (transaction: SqlTag) => Promise<T>) => Promise<T>;
};

function approvedIdList(sql: SqlTag, ids: readonly number[]) {
  if (ids.length === 0 || ids.some((id) => !Number.isSafeInteger(id) || id < 1)) {
    throw new StarterEnrichmentError("APPROVED_DB_ID_INVALID");
  }
  return sql.unsafe(ids.join(","));
}

function currentRowsFromSql(sql: SqlTag, ids: readonly number[], lockForUpdate = false) {
  const idList = approvedIdList(sql, ids);
  if (lockForUpdate) {
    return sql<CurrentVocabularyRow>`
      SELECT id, word, ipa, vietnamese, definition_en, example_en,
             image_url, audio_url, topic, enabled, content_version
      FROM ${sql.unsafe(`"${APP_SCHEMA}"."vocabularies"`)}
      WHERE id IN (${idList})
      ORDER BY id ASC
      FOR UPDATE
    `;
  }
  return sql<CurrentVocabularyRow>`
    SELECT id, word, ipa, vietnamese, definition_en, example_en,
           image_url, audio_url, topic, enabled, content_version
    FROM ${sql.unsafe(`"${APP_SCHEMA}"."vocabularies"`)}
    WHERE id IN (${idList})
    ORDER BY id ASC
  `;
}

export function createPostgresEnrichmentDatabase(sqlClient: SqlTag): EnrichmentDatabase {
  const asTransaction = (sql: SqlTag): EnrichmentTransaction => ({
    readApprovedRows: (ids, lockForUpdate = false) => currentRowsFromSql(sql, ids, lockForUpdate),
    updateVocabularyRow: async (update) => {
      assertApprovedUpdate(update);
      const result = await sql`
        UPDATE ${sql.unsafe(`"${APP_SCHEMA}"."vocabularies"`)}
        SET ipa = ${update.content.ipa},
            vietnamese = ${update.content.vietnamese},
            definition_en = ${update.content.definition_en},
            example_en = ${update.content.example_en},
            image_url = ${update.content.image_url},
            audio_url = ${update.content.audio_url},
            topic = ${update.content.topic},
            content_version = ${update.contentVersion},
            updated_at = now()
        WHERE id = ${update.dbId}::integer
          AND word = ${update.starterWord}::text
          AND enabled = ${update.enabled}::boolean
          AND content_version = 1
      `;
      return result.count ?? 0;
    }
  });
  return {
    ...asTransaction(sqlClient),
    transaction: (operation) => sqlClient.begin(async (transaction) => operation(asTransaction(transaction)))
  };
}

function loadRepositoryEnv() {
  const envPath = join(process.cwd(), ".env");
  if (!existsSync(envPath)) return;
  try {
    loadEnvFile(envPath);
  } catch {
    throw new StarterEnrichmentError("ENV_FILE_INVALID");
  }
}

function printPlan(plan: EnrichmentPlan) {
  for (const line of renderDryRun(plan)) console.log(line);
}

function printApplyPlan(plan: EnrichmentPlan) {
  for (const line of renderDryRun(plan).filter((line) => !line.startsWith("STARTER_ENRICHMENT_MODE=") && !line.startsWith("DRY_RUN_MUTATES_DB="))) {
    console.log(line);
  }
}

async function main() {
  loadRepositoryEnv();
  const apply = process.argv.slice(2).length === 1 && process.argv[2] === "--apply";
  if (process.argv.slice(2).length > 0 && !apply) throw new StarterEnrichmentError("CLI_ARGUMENT_INVALID");
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
  if (!url) throw new StarterEnrichmentError("RUNTIME_DATABASE_URL_REQUIRED");
  const sql = openSql(url) as unknown as SqlTag;
  try {
    const database = createPostgresEnrichmentDatabase(sql);
    const plan = apply ? await runApply(database) : await runDryRun(database);
    if (apply) {
      console.log("STARTER_ENRICHMENT_MODE=APPLY");
      printApplyPlan(plan);
    } else {
      printPlan(plan);
    }
    if (apply) console.log("STARTER_ENRICHMENT_APPLY=PASS");
  } finally {
    await sqlClientEnd(sql);
  }
}

async function sqlClientEnd(sql: SqlTag) {
  await (sql as unknown as ReturnType<typeof postgres>).end({ timeout: 5 });
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/enrich-starter-vocabulary.ts") || invokedScript.endsWith("/enrich-starter-vocabulary.js")) {
  main().catch((error: unknown) => {
    console.error(error instanceof StarterEnrichmentError ? error.code : "STARTER_ENRICHMENT_FAILED");
    process.exitCode = 1;
  });
}
