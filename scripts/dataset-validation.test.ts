import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DatasetValidationError,
  validateDataset,
  validateStarterV1Dataset
} from "./validate-dataset";

const source = JSON.parse(readFileSync(join(process.cwd(), "drizzle", "seed", "vocabflow-starter-v1.json"), "utf8")) as {
  source: string;
  provenance: string;
  status: string;
  name: string;
  version: number;
  records: Array<Record<string, unknown>>;
};

function validDataset() {
  return structuredClone(source);
}

function expectValidationCode(input: unknown, code: string) {
  expect(() => validateDataset(input)).toThrowError(
    expect.objectContaining({ code })
  );
}

describe("US-04 Starter v1 dataset validation", () => {
  it("accepts exactly the approved 30-record set", () => {
    const result = validateStarterV1Dataset(validDataset());
    expect(result.dataset.records).toHaveLength(30);
    expect(result.dataset.records.map((record) => record.id)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
    expect(result.dataset.records.every((record) => record.enabled === true && record.contentVersion === 1)).toBe(true);
    expect(result.dataset.records[0]).toMatchObject({ id: 1, word: "apple", vietnamese: "táo" });
    expect(result.dataset.records[29]).toMatchObject({ id: 30, word: "new", vietnamese: "mới" });
    expect(result.warnings).toEqual([
      { code: "MISSING_IPA", count: 30 },
      { code: "MISSING_IMAGE", count: 30 },
      { code: "MISSING_AUDIO", count: 30 }
    ]);
  });

  it.each([
    ["missing id", (dataset: ReturnType<typeof validDataset>) => { delete dataset.records[0]?.id; }, "DATASET_SCHEMA_INVALID"],
    ["missing word", (dataset: ReturnType<typeof validDataset>) => { delete dataset.records[0]?.word; }, "DATASET_SCHEMA_INVALID"],
    ["missing Vietnamese meaning", (dataset: ReturnType<typeof validDataset>) => { delete dataset.records[0]?.vietnamese; }, "DATASET_SCHEMA_INVALID"],
    ["duplicate id", (dataset: ReturnType<typeof validDataset>) => { dataset.records[1]!.id = 1; }, "DUPLICATE_ID"],
    ["invalid id type", (dataset: ReturnType<typeof validDataset>) => { dataset.records[0]!.id = "1"; }, "DATASET_SCHEMA_INVALID"],
    ["invalid enabled", (dataset: ReturnType<typeof validDataset>) => { dataset.records[0]!.enabled = "true"; }, "DATASET_SCHEMA_INVALID"],
    ["invalid contentVersion type", (dataset: ReturnType<typeof validDataset>) => { dataset.records[0]!.contentVersion = "1"; }, "DATASET_SCHEMA_INVALID"],
    ["contentVersion below one", (dataset: ReturnType<typeof validDataset>) => { dataset.records[0]!.contentVersion = 0; }, "DATASET_SCHEMA_INVALID"]
  ])("fails for %s", (_name, mutate, code) => {
    const dataset = validDataset();
    mutate(dataset);
    expectValidationCode(dataset, code);
  });

  it("warns on duplicate normalized words and missing optional media", () => {
    const dataset = validDataset();
    dataset.records[1]!.word = " APPLE ";
    const result = validateDataset(dataset);
    expect(result.warnings).toContainEqual({ code: "DUPLICATE_NORMALIZED_WORD", count: 2 });
    expect(result.warnings).toContainEqual({ code: "MISSING_IPA", count: 30 });
    expect(result.warnings).toContainEqual({ code: "MISSING_IMAGE", count: 30 });
    expect(result.warnings).toContainEqual({ code: "MISSING_AUDIO", count: 30 });
  });

  it("accepts missing definition and example without warnings", () => {
    const dataset = validDataset();
    const result = validateDataset(dataset);
    expect(result.warnings.map((warning) => warning.code)).not.toContain("MISSING_DEFINITION");
    expect(result.warnings.map((warning) => warning.code)).not.toContain("MISSING_EXAMPLE");
  });

  it("fails closed when the approved source metadata changes", () => {
    const dataset = validDataset();
    dataset.source = "OTHER_SOURCE";
    expect(() => validateDataset(dataset)).toThrowError(DatasetValidationError);
  });
});
