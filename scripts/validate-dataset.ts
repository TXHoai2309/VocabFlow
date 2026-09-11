import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  vocabflowStarterDatasetSchema,
  vocabularySeedRecordSchema,
  type VocabflowStarterDataset,
  type VocabularySeedRecord
} from "@vocabflow/contracts";
import { z } from "zod";

export type DatasetWarningCode =
  | "DUPLICATE_NORMALIZED_WORD"
  | "MISSING_IPA"
  | "MISSING_IMAGE"
  | "MISSING_AUDIO";

export type DatasetWarning = {
  code: DatasetWarningCode;
  count: number;
};

export class DatasetValidationError extends Error {
  readonly code: string;
  readonly issues: z.ZodIssue[];

  constructor(code: string, issues: z.ZodIssue[] = []) {
    super(code);
    this.name = "DatasetValidationError";
    this.code = code;
    this.issues = issues;
  }
}

export type DatasetValidationResult = {
  dataset: VocabflowStarterDataset;
  warnings: DatasetWarning[];
};

function fail(code: string, issues?: z.ZodIssue[]): never {
  throw new DatasetValidationError(code, issues);
}

function normalizeWord(word: string) {
  return word.normalize("NFKC").trim().toLocaleLowerCase("en-US");
}

function warningCounts(records: VocabularySeedRecord[]): DatasetWarning[] {
  const counts = new Map<DatasetWarningCode, number>();
  const normalizedWords = new Map<string, number>();

  for (const record of records) {
    const normalized = normalizeWord(record.word);
    normalizedWords.set(normalized, (normalizedWords.get(normalized) ?? 0) + 1);
    if (record.ipa == null) counts.set("MISSING_IPA", (counts.get("MISSING_IPA") ?? 0) + 1);
    if (record.imageUrl == null) counts.set("MISSING_IMAGE", (counts.get("MISSING_IMAGE") ?? 0) + 1);
    if (record.audioUrl == null) counts.set("MISSING_AUDIO", (counts.get("MISSING_AUDIO") ?? 0) + 1);
  }

  const duplicateWordCount = [...normalizedWords.values()]
    .filter((count) => count > 1)
    .reduce((sum, count) => sum + count, 0);
  if (duplicateWordCount > 0) counts.set("DUPLICATE_NORMALIZED_WORD", duplicateWordCount);

  return ["DUPLICATE_NORMALIZED_WORD", "MISSING_IPA", "MISSING_IMAGE", "MISSING_AUDIO"]
    .flatMap((code) => {
      const count = counts.get(code as DatasetWarningCode);
      return count ? [{ code: code as DatasetWarningCode, count }] : [];
    });
}

export function validateDataset(input: unknown): DatasetValidationResult {
  const parsed = vocabflowStarterDatasetSchema.safeParse(input);
  if (!parsed.success) fail("DATASET_SCHEMA_INVALID", parsed.error.issues);

  const ids = new Set<number>();
  for (const record of parsed.data.records) {
    if (ids.has(record.id)) fail("DUPLICATE_ID");
    ids.add(record.id);
  }

  return { dataset: parsed.data, warnings: warningCounts(parsed.data.records) };
}

export function validateStarterV1Dataset(input: unknown): DatasetValidationResult {
  const result = validateDataset(input);
  const { records } = result.dataset;
  const expectedIds = Array.from({ length: 30 }, (_, index) => index + 1);
  const actualIds = records.map((record) => record.id);

  if (records.length !== 30 || actualIds.some((id, index) => id !== expectedIds[index])) {
    fail("STARTER_V1_RECORD_SET_INVALID");
  }
  if (records.some((record) => !record.enabled || record.contentVersion !== 1)) {
    fail("STARTER_V1_RECORD_DEFAULTS_INVALID");
  }
  if (records.some((record) => record.ipa !== null
    || record.definitionEn !== null
    || record.exampleEn !== null
    || record.imageUrl !== null
    || record.audioUrl !== null
    || record.topic !== null)) {
    fail("STARTER_V1_OPTIONAL_FIELDS_INVALID");
  }

  return result;
}

export function readStarterV1Dataset(): VocabflowStarterDataset {
  const path = join(process.cwd(), "drizzle", "seed", "vocabflow-starter-v1.json");
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    fail("DATASET_SOURCE_UNREADABLE");
  }
  return validateStarterV1Dataset(input).dataset;
}

function main() {
  const result = validateStarterV1Dataset(readStarterV1Dataset());
  for (const warning of result.warnings) {
    console.log(`DATASET_WARNING=${warning.code} count=${warning.count}`);
  }
  console.log(`DATASET_STATUS=PASS records=${result.dataset.records.length}`);
}

const invokedScript = process.argv[1]?.replaceAll("\\", "/") ?? "";
if (invokedScript.endsWith("/validate-dataset.ts") || invokedScript.endsWith("/validate-dataset.js")) {
  try {
    main();
  } catch (error) {
    if (error instanceof DatasetValidationError) {
      console.error(`DATASET_STATUS=FAIL code=${error.code}`);
    } else {
      console.error("DATASET_STATUS=FAIL code=UNEXPECTED_ERROR");
    }
    process.exitCode = 1;
  }
}

export { vocabularySeedRecordSchema };
