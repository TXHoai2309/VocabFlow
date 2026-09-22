import { describe, expect, it } from "vitest";
import {
  CURATION_GROUPS,
  CURATION_VERSION,
  readManifest,
  validateManifest,
  type CurationManifest
} from "./vocabulary-curation";

describe("US-41 vocabulary curation manifest", () => {
  it("is a reviewed 200-300 row manifest with explicit grades and learning sets", () => {
    const manifest = readManifest();
    expect(manifest.version).toBe(CURATION_VERSION);
    expect(manifest.records).toHaveLength(220);
    expect(manifest.learningSets).toHaveLength(11);
    expect(manifest.starterTopicMappings).toHaveLength(30);
    expect(new Set(manifest.records.map((record) => record.sourceRecordId)).size).toBe(220);
    expect(new Set(manifest.records.map((record) => record.expectedWord.toLocaleLowerCase("en-US"))).size).toBe(220);
    expect(new Set(manifest.records.map((record) => record.grade))).toEqual(new Set(["GRADE_1", "GRADE_2", "GRADE_3"]));
    expect(manifest.records.every((record) => record.activation)).toBe(true);
  });

  it("keeps the selection policy explicit and deterministic", () => {
    const manifest = readManifest();
    expect(manifest.selectionPolicy.gradePolicy).toMatch(/not inferred from id, length, alphabetic order, topic, or frequency/i);
    expect(manifest.selectionPolicy.mediaPolicy).toMatch(/image.*audio/i);
    expect(CURATION_GROUPS.reduce((sum, group) => sum + group.words.length, 0)).toBe(220);
    expect(new Set(CURATION_GROUPS.map((group) => group.slug)).size).toBe(CURATION_GROUPS.length);
  });

  it("rejects a manifest that would silently broaden activation", () => {
    const manifest = readManifest();
    const invalid = {
      ...manifest,
      records: manifest.records.map((record, index) => index === 0 ? { ...record, activation: false } : record)
    } as unknown as CurationManifest;
    expect(() => validateManifest(invalid)).toThrowError("CURATION_RECORD_NOT_ACTIVATED");
  });
});
