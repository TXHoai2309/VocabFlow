import { describe, expect, it, vi } from "vitest";
import {
  CURATION_GROUPS,
  CURATION_VERSION,
  applyCurationManifest,
  buildManifestFromCatalog,
  classifyCuratedMedia,
  printDryRun,
  readManifest,
  validateManifest,
  validateManifestAgainstCatalog,
  withCurationReadOnlyTransaction,
  type CurationDatabasePlan,
  type CurationManifest,
  type TopicSlug
} from "./vocabulary-curation";
import type { CatalogValidation } from "./import-vocabulary-catalog";
import { configuredCurationTarget } from "./vocabulary-curation-access";

const rawTopicBySlug: Record<TopicSlug, string> = {
  action: "Action", body: "body", casual: "casual", challenge: "Challenge", clothing: "Clothing",
  "common-place": "CommonPlace", communication: "Communication", "computer-office-science": "Computer_office_science",
  emotion: "Emotion", family: "Family", food: "Food", healthy: "Healthy", miscellaneous: "Miscellaneous",
  nature: "nature", "object-in-house": "ObjectInHouse", photography: "Photography", "writing-numbers": "writing_number"
};

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
      topic: rawTopicBySlug[record.topicSlugs[0] ?? "miscellaneous"],
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
  it("runs database dry-run planning in a PostgreSQL READ ONLY transaction", async () => {
    const statements: string[] = [];
    const query = Object.assign(
      vi.fn((strings: TemplateStringsArray) => {
        statements.push(strings.join(" ").trim());
        return Promise.resolve([]);
      }),
      { unsafe: vi.fn((value: string) => value) }
    );
    const fakeSql = {
      begin: vi.fn(async (callback: (tx: typeof query) => Promise<string>) => callback(query))
    };

    await expect(withCurationReadOnlyTransaction(fakeSql as never, async () => "READ_ONLY_OK"))
      .resolves.toBe("READ_ONLY_OK");
    expect(statements).toEqual(["SET TRANSACTION READ ONLY"]);
    expect(statements.some((statement) => /\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(statement))).toBe(false);
  });

  it("reports zero database mutations in the read-only dry-run output", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const emptyPlan: CurationDatabasePlan = {
      totalVocabularyRows: 0,
      enabledVocabularyRows: 0,
      importedVocabularyRows: 0,
      enabledImportedVocabularyRows: 0,
      curatedSourceRowsFound: 0,
      learnerProgressRows: 0,
      reviewEventRows: 0,
      xpEventRows: 0,
      learnerAchievementRows: 0,
      learnerLearningSetAssignments: 0,
      starterCount: 0,
      starterEnabledCount: 0,
      starterTopicMappings: 0,
      rowsToEnable: 0,
      rowsAlreadyEnabled: 0,
      rowsToDisable: 0,
      gradeUpdates: 0,
      topicMappingInserts: 0,
      topicMappingDeletes: 0,
      learningSetsToCreateOrUpdate: 0,
      learningSetItemsToCreateOrUpdate: 0,
      unexpectedLearningSetItems: 0,
      meaningOverridesToApply: 0,
      imageQuarantinesToApply: 0
    };
    try {
      printDryRun(
        readManifest(),
        "PASS records=1994",
        "PASS checked=213",
        undefined,
        [
          "EXECUTION_CONTEXT=local-development",
          "DATABASE_ENV=development",
          "TARGET_NAME=development",
          `TARGET_BRANCH=${configuredCurationTarget("development").branchId}`
        ],
        emptyPlan
      );
      expect(log).toHaveBeenCalledWith("DATABASE_MUTATIONS=0");
      expect(log).toHaveBeenCalledWith("TARGET_NAME=development");
      expect(log).toHaveBeenCalledWith("PLAN_STATUS=PASS");
    } finally {
      log.mockRestore();
    }
  });

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
    expect(manifest.learningSets).toEqual(CURATION_GROUPS.map(({ words: _words, ...definition }) => definition));
    expect(manifest.learningSets.every((set) => /[À-ỹ]/u.test(`${set.name} ${set.description}`))).toBe(true);
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

  it("stores only the owner-approved source-bound media quarantines and Vietnamese overrides", () => {
    const manifest = readManifest();
    const byId = new Map(manifest.records.map((record) => [record.sourceRecordId, record]));
    expect([...manifest.records.filter((record) => record.imagePolicy === "QUARANTINED").map(({ sourceRecordId, expectedWord }) => [sourceRecordId, expectedWord])])
      .toEqual([[4, "basket"], [98, "cup"], [884, "father"], [889, "grandfather"], [759, "teacher"], [637, "cliff"], [647, "east"], [570, "word"]]);
    expect([...manifest.records.filter((record) => record.vietnameseOverride !== undefined).map(({ sourceRecordId, expectedWord, vietnameseOverride }) => [sourceRecordId, expectedWord, vietnameseOverride])])
      .toEqual([
        [911, "aunt", "Cô, dì, bác gái"],
        [897, "granddaughter", "Cháu gái (cháu nội hoặc ngoại)"],
        [896, "grandson", "Cháu trai (cháu nội hoặc ngoại)"],
        [910, "uncle", "Chú, cậu, bác trai"],
        [621, "axe", "Rìu"]
      ]);
    expect(byId.get(891)?.vietnameseOverride).toBeUndefined();
    expect(byId.get(938)?.vietnameseOverride).toBeUndefined();
  });

  it("preserves owner content policies when the reviewed manifest is regenerated", () => {
    const manifest = readManifest();
    const regenerated = buildManifestFromCatalog(validationFor(manifest));
    expect(regenerated.records
      .filter((record) => record.imagePolicy === "QUARANTINED")
      .map((record) => [record.sourceRecordId, record.expectedWord]))
      .toEqual(manifest.records.filter((record) => record.imagePolicy === "QUARANTINED").map((record) => [record.sourceRecordId, record.expectedWord]));
    expect(regenerated.records
      .filter((record) => record.vietnameseOverride !== undefined)
      .map((record) => [record.sourceRecordId, record.expectedWord, record.vietnameseOverride]))
      .toEqual(manifest.records.filter((record) => record.vietnameseOverride !== undefined).map((record) => [record.sourceRecordId, record.expectedWord, record.vietnameseOverride]));
  });

  it("classifies missing images as WARN without granting IMAGE_TO_WORD eligibility", () => {
    expect(classifyCuratedMedia({ image: "READY", audio: "READY" })).toMatchObject({
      classification: "PASS", activationAllowed: true, imageExerciseEligible: true
    });
    expect(classifyCuratedMedia({ image: "MISSING", audio: "READY" })).toMatchObject({
      classification: "WARN_MISSING_IMAGE", activationAllowed: true, imageExerciseEligible: false
    });
    expect(classifyCuratedMedia({ image: "READY", audio: "READY" }, "QUARANTINED")).toMatchObject({
      classification: "WARN_QUARANTINED_IMAGE", activationAllowed: true, imageExerciseEligible: false
    });
    expect(classifyCuratedMedia({ image: "UNUSABLE", audio: "READY" }, "QUARANTINED")).toMatchObject({
      classification: "BLOCK", activationAllowed: false, imageExerciseEligible: false,
      blockingReasons: ["UNUSABLE_IMAGE"]
    });
  });

  it("reports selected missing-image rows as warnings while audio and unusable-media gates still block", () => {
    const manifest = readManifest();
    const validation = validationFor(manifest);
    const report = validateManifestAgainstCatalog(manifest, validation);
    expect(report).toMatchObject({
      mediaChecked: 213,
      mediaPass: 202,
      mediaWarnings: 11,
      mediaWarnMissingImage: 3,
      mediaWarnQuarantinedImage: 8,
      mediaBlocked: 0,
      effectiveImageIneligibleCount: 11,
      meaningOverrides: 5,
      imageQuarantines: 8,
      duplicateSourceIdentities: 0,
      duplicateNormalizedWords: 0,
      expectedWordMismatches: 0,
      missingRequiredMeanings: 0
    });
    expect(report.missingImageWords).toEqual(["anger", "sadness", "joy"]);
    expect(report.quarantinedImageWords).toEqual(["basket", "cup", "father", "grandfather", "teacher", "cliff", "east", "word"]);

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

  it("fails closed when an owner override is attached to an identity with a mismatched word", () => {
    const manifest = readManifest();
    const invalid = {
      ...manifest,
      records: manifest.records.map((record) => record.sourceRecordId === 911 ? { ...record, expectedWord: "uncle" } : record)
    } as CurationManifest;
    expect(() => validateManifestAgainstCatalog(invalid, validationFor(manifest)))
      .toThrowError("CURATED_SOURCE_WORD_MISMATCH_911");
  });
});
