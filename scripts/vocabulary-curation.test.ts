import { describe, expect, it, vi } from "vitest";
import {
  CURATION_GROUPS,
  CURATION_VERSION,
  applyCurationManifest,
  classifyCuratedMedia,
  readManifest,
  validateManifest,
  validateManifestAgainstCatalog,
  type CurationManifest
} from "./vocabulary-curation";
import type { CatalogValidation } from "./import-vocabulary-catalog";

function validationFor(manifest: CurationManifest): CatalogValidation {
  const mediaAvailabilityBySourceId: CatalogValidation["mediaAvailabilityBySourceId"] = {};
  const validRecords: CatalogValidation["validRecords"] = manifest.records.map((record) => {
    const missingImage = [953, 998, 987].includes(record.sourceRecordId);
    mediaAvailabilityBySourceId[record.sourceRecordId] = { image: missingImage ? "MISSING" : "READY", audio: "READY" };
    return {
      sourceDataset: manifest.sourceDataset,
      sourceRecordId: record.sourceRecordId,
      word: record.expectedWord,
      normalizedWord: record.expectedWord.toLocaleLowerCase("en-US"),
      vietnamese: "meaning",
      ipa: null,
      definitionEn: null,
      exampleEn: null,
      topic: null,
      imageUrl: missingImage ? null : "https://media.test/image",
      audioUrl: "https://media.test/audio"
    };
  });
  return {
    sourceRecords: 1994,
    validRecords,
    invalidRecords: [],
    duplicateSourceIdCount: 0,
    duplicateNormalizedWordGroups: 0,
    duplicateNormalizedWordRecords: 0,
    missingImageCount: 3,
    missingAudioCount: 0,
    unusableMediaCount: 0,
    mediaAvailabilityBySourceId
  };
}

describe("US-41 vocabulary curation manifest", () => {
  it("is a reviewed 200-300 row manifest with explicit grades and learning sets", () => {
    const manifest = readManifest();
    expect(manifest.version).toBe(CURATION_VERSION);
    expect(manifest.records).toHaveLength(213);
    expect(manifest.learningSets).toHaveLength(11);
    expect(manifest.starterTopicMappings).toHaveLength(30);
    expect(new Set(manifest.records.map((record) => record.sourceRecordId)).size).toBe(213);
    expect(new Set(manifest.records.map((record) => record.expectedWord.toLocaleLowerCase("en-US"))).size).toBe(213);
    expect(new Set(manifest.records.map((record) => record.grade))).toEqual(new Set(["GRADE_1", "GRADE_2", "GRADE_3"]));
    expect(manifest.records.every((record) => record.activation)).toBe(true);
    expect(manifest.records.filter((record) => record.grade === "GRADE_1")).toHaveLength(100);
    expect(manifest.records.filter((record) => record.grade === "GRADE_2")).toHaveLength(73);
    expect(manifest.records.filter((record) => record.grade === "GRADE_3")).toHaveLength(40);
    expect(manifest.records.filter((record) => record.learningSetSlugs.includes("grade-2-feelings"))).toHaveLength(13);
  });

  it("keeps the selection policy explicit and deterministic", () => {
    const manifest = readManifest();
    expect(manifest.selectionPolicy.gradePolicy).toMatch(/not inferred from id, length, alphabetic order, topic, or frequency/i);
    expect(manifest.selectionPolicy.mediaPolicy).toMatch(/missing image is warn/i);
    expect(manifest.selectionPolicy.mediaPolicy).toMatch(/usable audio is required/i);
    expect(CURATION_GROUPS.reduce((sum, group) => sum + group.words.length, 0)).toBe(213);
    expect(new Set(CURATION_GROUPS.map((group) => group.slug)).size).toBe(CURATION_GROUPS.length);
  });

  it("keeps the owner-approved source identities and defers seven items without padding", () => {
    const manifest = readManifest();
    const byId = new Map(manifest.records.map((record) => [record.sourceRecordId, record]));
    const approved = [
      [555, "question mark", "GRADE_3", "grade-3-language"],
      [937, "learn", "GRADE_3", "grade-3-language"],
      [570, "word", "GRADE_3", "grade-3-language"],
      [938, "love", "GRADE_2", "grade-2-feelings"],
      [1005, "surprise", "GRADE_2", "grade-2-feelings"],
      [989, "liking", "GRADE_2", "grade-2-feelings"],
      [953, "anger", "GRADE_2", "grade-2-feelings"],
      [980, "happiness", "GRADE_2", "grade-2-feelings"],
      [998, "sadness", "GRADE_2", "grade-2-feelings"],
      [969, "fear", "GRADE_2", "grade-2-feelings"],
      [987, "joy", "GRADE_2", "grade-2-feelings"]
    ] as const;
    for (const [id, word, grade, set] of approved) {
      expect(byId.get(id)).toMatchObject({ sourceRecordId: id, expectedWord: word, grade, learningSetSlugs: [set] });
    }
    expect(byId.get(555)?.topicSlugs).toEqual(["writing-numbers"]);
    expect(byId.get(570)?.topicSlugs).toEqual(["writing-numbers"]);
    expect(byId.get(938)?.topicSlugs).toEqual(["action"]);
    for (const deferredId of [949, 952, 954, 959, 960, 966, 968]) expect(byId.has(deferredId)).toBe(false);
    expect(manifest.records).toHaveLength(213);
  });

  it("classifies missing images as WARN without granting IMAGE_TO_WORD eligibility", () => {
    expect(classifyCuratedMedia({ image: "READY", audio: "READY" })).toMatchObject({
      classification: "PASS", activationAllowed: true, imageExerciseEligible: true
    });
    expect(classifyCuratedMedia({ image: "MISSING", audio: "READY" })).toMatchObject({
      classification: "WARN", activationAllowed: true, imageExerciseEligible: false
    });
  });

  it("reports selected missing-image rows as warnings while audio and unusable-media gates still block", () => {
    const manifest = readManifest();
    const validation = validationFor(manifest);
    const report = validateManifestAgainstCatalog(manifest, validation);
    expect(report).toMatchObject({ mediaChecked: 213, mediaPass: 210, mediaWarnings: 3, mediaBlocked: 0 });
    expect(report.missingImageWords).toEqual(["anger", "sadness", "joy"]);

    validation.mediaAvailabilityBySourceId[953] = { image: "READY", audio: "MISSING" };
    expect(() => validateManifestAgainstCatalog(manifest, validation)).toThrow(/MISSING_AUDIO/);
    validation.mediaAvailabilityBySourceId[953] = { image: "UNUSABLE", audio: "READY" };
    expect(() => validateManifestAgainstCatalog(manifest, validation)).toThrow(/UNUSABLE_IMAGE/);
  });

  it("blocks apply preparation before opening a transaction when audio is missing", async () => {
    const manifest = readManifest();
    const mediaAvailability = validationFor(manifest).mediaAvailabilityBySourceId;
    mediaAvailability[953] = { image: "MISSING", audio: "MISSING" };
    const begin = vi.fn();
    await expect(applyCurationManifest({ begin } as never, manifest, mediaAvailability)).rejects.toThrow(/MISSING_AUDIO/);
    expect(begin).not.toHaveBeenCalled();
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
