import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { canonicalJsonSha256, validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

type JsonRecord = Record<string, unknown>;
type PinnedRecord = { pin: JsonRecord; value: JsonRecord };

const datasetRoot = path.resolve(process.cwd(), "vocabflow-dataset");
const manifest = readJson("dataset.json");
function readJson(recordPath: string): JsonRecord {
  return JSON.parse(readFileSync(path.join(datasetRoot, recordPath), "utf8")) as JsonRecord;
}
function records(collection: string): PinnedRecord[] {
  return (manifest[collection] as JsonRecord[]).map((pin) => ({
    pin,
    value: readJson(String(pin.recordPath)),
  }));
}
function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

const lexemeRecords = records("includedLexemes");
const senseRecords = records("includedSenses");
const classificationRecords = records("includedClassifications");
const learningSetRecords = records("includedLearningSets");
const taxonomyRecord = records("includedTaxonomySnapshots")[0].value;
const mediaRecords = records("includedMediaAssets");

describe("Master Vocabulary V2 Phase 2B pilot", () => {
  it("passes the full cross-file validator as a draft working dataset", () => {
    const report = validateMasterVocabularyV2({ datasetRoot, writeReport: false });
    expect(report).toMatchObject({ status: "PASS", errorCount: 0, warningCount: 0, infoCount: 1 });
    expect(report.issues.map((issue) => issue.code)).toEqual(["DRAFT_WORKING_DATASET"]);
  });

  it("keeps bank as one Lexeme with two independent semantic Senses", () => {
    const bank = lexemeRecords.find(({ value }) => value.lemma === "bank")?.value;
    expect(bank).toBeDefined();
    const bankSenses = senseRecords.filter(({ value }) => value.masterLexemeId === bank?.masterLexemeId);
    expect(bankSenses).toHaveLength(2);
    expect(new Set(bankSenses.map(({ value }) => value.masterSenseId)).size).toBe(2);
    expect(bankSenses.map(({ value }) => (value.translations as JsonRecord[])[0].text).sort()).toEqual(["bờ sông", "ngân hàng"]);
    const bankIds = bankSenses.map(({ value }) => String(value.masterSenseId));
    const topics = classificationRecords
      .filter(({ value }) => value.dimension === "TOPIC" && bankIds.includes(String(value.masterSenseId)))
      .map(({ value }) => value.valueRef);
    expect(new Set(topics).size).toBe(2);
    const briefs = mediaRecords
      .filter(({ value }) => value.mediaKind === "IMAGE" && bankIds.includes(String(value.targetId)))
      .map(({ value }) => ((value.semanticBrief as JsonRecord[])[0]).text);
    expect(briefs).toHaveLength(2);
    expect(briefs[0]).not.toBe(briefs[1]);
    expect(briefs.join(" ").toLowerCase()).toContain("river");
    expect(briefs.join(" ").toLowerCase()).toContain("financial");
  });

  it("reuses the same apple Sense in multiple Learning Sets without duplicate Sense pins", () => {
    const apple = senseRecords.find(({ value }) => value.translations && (value.translations as JsonRecord[])[0]?.text === "quả táo")?.value;
    expect(apple).toBeDefined();
    const appleId = String(apple?.masterSenseId);
    const containingSets = learningSetRecords.filter(({ value }) =>
      (value.items as JsonRecord[]).some((item) => item.masterSenseId === appleId),
    );
    expect(containingSets.map(({ value }) => value.code)).toEqual(expect.arrayContaining(["BASIC_STARTER_PILOT", "BASIC_FRUITS", "A1_CORE_PILOT"]));
    expect(containingSets).toHaveLength(3);
    const senseIds = (manifest.includedSenses as JsonRecord[]).map((pin) => pin.masterSenseId);
    expect(senseIds).toHaveLength(25);
    expect(new Set(senseIds).size).toBe(senseIds.length);
  });

  it("models record pronunciation at Lexeme and Sense ownership scopes", () => {
    const record = lexemeRecords.find(({ value }) => value.lemma === "record")?.value;
    const verb = senseRecords.find(({ value }) => value.masterLexemeId === record?.masterLexemeId && value.partOfSpeechCode === "VERB")?.value;
    const defaultPronunciation = (record?.pronunciations as JsonRecord[])[0];
    const override = (verb?.pronunciationOverrides as JsonRecord[])[0];
    expect(defaultPronunciation.masterLexemeId).toBe(record?.masterLexemeId);
    expect(defaultPronunciation).not.toHaveProperty("masterSenseId");
    expect(override.masterSenseId).toBe(verb?.masterSenseId);
    expect(override).not.toHaveProperty("masterLexemeId");
    expect(defaultPronunciation.ipa).not.toBe(override.ipa);
    for (const pronunciation of [defaultPronunciation, override]) {
      const asset = mediaRecords.find(({ value }) => value.mediaAssetId === pronunciation.audioAssetId)?.value;
      expect(asset).toMatchObject({ mediaKind: "WORD_PRONUNCIATION_AUDIO", status: "PLANNED" });
    }
  });

  it("covers word, phrasal verb, and multiword expression identities and required POS cases", () => {
    const lemmas = new Map(lexemeRecords.map(({ value }) => [value.lemma, value]));
    expect(lemmas.get("look after")?.lexicalUnitType).toBe("PHRASAL_VERB");
    expect(lemmas.get("check in")?.lexicalUnitType).toBe("PHRASAL_VERB");
    expect(lemmas.get("ice cream")?.lexicalUnitType).toBe("MULTIWORD_EXPRESSION");
    expect(new Set(senseRecords.map(({ value }) => value.partOfSpeechCode))).toEqual(new Set(["NOUN", "VERB", "ADJECTIVE", "ADVERB", "CONJUNCTION"]));
    for (const lemma of ["run", "record", "light"]) {
      const owner = lemmas.get(lemma);
      expect(senseRecords.filter(({ value }) => value.masterLexemeId === owner?.masterLexemeId).length).toBeGreaterThan(1);
    }
  });

  it("keeps media in planning states with no generated bytes", () => {
    expect(mediaRecords).toHaveLength(27);
    expect(mediaRecords.filter(({ value }) => value.status === "PLANNED")).toHaveLength(25);
    expect(mediaRecords.filter(({ value }) => value.status === "NOT_APPLICABLE")).toHaveLength(2);
    expect(mediaRecords.every(({ value }) => (value.versions as unknown[]).length === 0 && (value.deliveries as unknown[]).length === 0)).toBe(true);
    expect(manifest.includedMediaAssetVersions).toEqual([]);
    const notApplicableSenseIds = new Set(mediaRecords.filter(({ value }) => value.status === "NOT_APPLICABLE").map(({ value }) => value.targetId));
    for (const lemma of ["democracy", "although"]) {
      const lexeme = lexemeRecords.find(({ value }) => value.lemma === lemma)?.value;
      const sense = senseRecords.find(({ value }) => value.masterLexemeId === lexeme?.masterLexemeId)?.value;
      expect(notApplicableSenseIds.has(sense?.masterSenseId)).toBe(true);
    }
  });

  it("pins exact record bytes by identity and JCS content hash", () => {
    expect(manifest.status).toBe("DRAFT");
    expect(manifest).not.toHaveProperty("releaseHash");
    const descriptors: Array<[string, string, string?]> = [
      ["includedLexemes", "masterLexemeId", "lexemeRevision"],
      ["includedSenses", "masterSenseId", "senseRevision"],
      ["includedClassifications", "classificationId", "classificationRevision"],
      ["includedLearningSets", "learningSetId", "learningSetRevision"],
      ["includedTaxonomySnapshots", "taxonomyId", "taxonomyVersion"],
      ["includedMediaAssets", "mediaAssetId"],
      ["includedProvenance", "provenanceId"],
    ];
    for (const [collection, idField, revisionField] of descriptors) {
      for (const { pin, value } of records(collection)) {
        expect(value[idField]).toBe(pin[idField]);
        if (revisionField) expect(value[revisionField]).toBe(pin[revisionField]);
        expect(canonicalJsonSha256(value)).toBe(pin.contentHash);
      }
    }
  });

  it("uses a real Topic hierarchy and clearly editorial taxonomy assignments", () => {
    const food = (taxonomyRecord.topics as JsonRecord[]).find((topic) => topic.code === "FOOD");
    const fruit = (taxonomyRecord.topics as JsonRecord[]).find((topic) => topic.code === "FRUIT");
    expect(fruit?.parentTopicId).toBe(food?.topicId);
    expect((taxonomyRecord.topics as JsonRecord[])).toHaveLength(21);
    expect((taxonomyRecord.domains as JsonRecord[]).map((domain) => domain.code).sort()).toEqual([
      "ACADEMIC_ENGLISH", "BUSINESS_ENGLISH", "GENERAL_ENGLISH", "HOSPITALITY", "IT_TECHNOLOGY", "TRAVEL_ENGLISH",
    ]);
    const cefr = new Set(classificationRecords.filter(({ value }) => value.dimension === "CEFR").map(({ value }) => value.valueCode));
    expect(cefr).toEqual(new Set(["A1", "A2", "B1", "B2", "C1"]));
    const scores = classificationRecords.filter(({ value }) => value.dimension === "DIFFICULTY").map(({ value }) => value.numericValue as number);
    expect(Math.min(...scores)).toBe(12);
    expect(Math.max(...scores)).toBe(70);
    const ageGroups = classificationRecords.filter(({ value }) => value.dimension === "AGE_GROUP").map(({ value }) => value.valueCode);
    expect(ageGroups).toHaveLength(15);
    expect(new Set(ageGroups)).toEqual(new Set(["KIDS", "TEEN", "ADULT"]));
    expect(ageGroups).not.toContain("ALL");
    expect(strings(classificationRecords.find(({ value }) => value.dimension === "SCHOOL_LEVEL")?.value.sourceProvenanceIds)).toHaveLength(1);
    expect((taxonomyRecord.curricula as JsonRecord[])[0].jurisdiction).toBe("INTERNAL_DEMO");
    expect((taxonomyRecord.difficultyScales as JsonRecord[])[0].scoreMethod).toBe("EDITORIAL");
    expect((taxonomyRecord.exams as JsonRecord[])[0].authority).toContain("not an IELTS authority");
  });
});
