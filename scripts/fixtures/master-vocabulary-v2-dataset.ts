import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { canonicalJsonSha256 } from "../validate-master-vocabulary-v2";

type JsonObject = Record<string, unknown>;

const id = (tail: string) => `0195f85c-7b2a-7d10-8c01-${tail.padStart(12, "0")}`;
const timestamp = "2026-10-02T00:00:00Z";

export const fixtureIds = {
  dataset: id("1"),
  lexeme: id("10"),
  secondLexeme: id("11"),
  sense: id("20"),
  translation: id("30"),
  definition: id("31"),
  example: id("32"),
  exampleTranslation: id("33"),
  lexemePronunciation: id("40"),
  sensePronunciation: id("41"),
  cefrClassification: id("50"),
  difficultyClassification: id("51"),
  topicClassification: id("52"),
  domainClassification: id("53"),
  examClassification: id("54"),
  schoolClassification: id("55"),
  ageClassification: id("56"),
  taxonomy: id("60"),
  topicParent: id("61"),
  topicChild: id("62"),
  domainParent: id("63"),
  domainChild: id("64"),
  exam: id("65"),
  curriculum: id("66"),
  schoolLevel: id("67"),
  scale: id("68"),
  learningSet: id("70"),
  setItem: id("71"),
  imageAsset: id("80"),
  imageDelivery: id("81"),
  wordAudioAsset: id("82"),
  wordAudioDelivery: id("83"),
  exampleAudioAsset: id("84"),
  exampleAudioDelivery: id("85"),
  provenanceTranslation: id("90"),
  provenanceDefinition: id("91"),
  provenanceExample: id("92"),
  provenanceExampleTranslation: id("93"),
  provenanceCefr: id("94"),
  provenanceSchool: id("95"),
  provenanceExam: id("96"),
  provenanceRelation: id("97"),
  provenanceSet: id("98"),
  relation: id("99"),
  provenanceCurriculum: id("86"),
  provenanceDifficultyScale: id("87"),
} as const;

function localized(language: string, text: string): JsonObject {
  return { language, text };
}

function approvedProvenance(provenanceId: string, subjectType: string, subjectId: string): JsonObject {
  return { provenanceId, subjectType, subjectId, sourceType: "PROJECT_AUTHORED", createdAt: timestamp };
}

function writeRecord(root: string, relativePath: string, value: JsonObject): string {
  const absolutePath = path.join(root, ...relativePath.split("/"));
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  return relativePath;
}

function recordPin(relativePath: string, idField: string, entityId: string, revisionField?: string, revision?: string | number): JsonObject {
  const pin: JsonObject = { [idField]: entityId };
  if (revisionField) pin[revisionField] = revision;
  pin.recordPath = relativePath;
  return pin;
}

function addHashedPin(root: string, pins: JsonObject[], pin: JsonObject): void {
  const record = JSON.parse(readFileSync(path.join(root, ...String(pin.recordPath).split("/")), "utf8")) as JsonObject;
  pins.push({ ...pin, contentHash: canonicalJsonSha256(record) });
}

export function writeValidMasterVocabularyFixture(root: string): void {
  mkdirSync(root, { recursive: true });
  const lexeme = {
    masterLexemeId: fixtureIds.lexeme,
    lexemeRevision: 1,
    language: "en",
    lemma: "zorb",
    normalizedLemma: "zorb",
    normalizationPolicyVersion: "fixture-v1",
    lexicalUnitType: "WORD",
    pronunciations: [{ pronunciationId: fixtureIds.lexemePronunciation, masterLexemeId: fixtureIds.lexeme, locale: "en-US", ipa: "zɔːrb", isPreferred: true, status: "APPROVED", audioAssetId: fixtureIds.wordAudioAsset }],
    status: "APPROVED",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const secondLexeme = {
    masterLexemeId: fixtureIds.secondLexeme,
    lexemeRevision: 1,
    language: "en",
    lemma: "zorbish",
    normalizedLemma: "zorbish",
    normalizationPolicyVersion: "fixture-v1",
    lexicalUnitType: "WORD",
    status: "APPROVED",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const sense = {
    masterSenseId: fixtureIds.sense,
    masterLexemeId: fixtureIds.lexeme,
    senseRevision: 1,
    senseOrder: 1,
    translations: [{ translationId: fixtureIds.translation, masterSenseId: fixtureIds.sense, language: "vi", text: "từ giả lập", translationKind: "EQUIVALENT", isPreferred: true, displayOrder: 0, provenanceIds: [fixtureIds.provenanceTranslation], status: "APPROVED" }],
    definitions: [{ definitionId: fixtureIds.definition, masterSenseId: fixtureIds.sense, language: "en", text: "A synthetic fixture meaning.", definitionKind: "LEARNER_FRIENDLY", displayOrder: 0, provenanceIds: [fixtureIds.provenanceDefinition], status: "APPROVED" }],
    examples: [{ exampleId: fixtureIds.example, masterSenseId: fixtureIds.sense, language: "en", text: "This synthetic zorb shines.", displayOrder: 0, exampleTranslations: [{ exampleTranslationId: fixtureIds.exampleTranslation, exampleId: fixtureIds.example, language: "vi", text: "Từ giả lập này phát sáng.", isPreferred: true, displayOrder: 0, provenanceIds: [fixtureIds.provenanceExampleTranslation], status: "APPROVED" }], audioAssetIds: [fixtureIds.exampleAudioAsset], provenanceIds: [fixtureIds.provenanceExample], status: "APPROVED" }],
    pronunciationOverrides: [{ pronunciationId: fixtureIds.sensePronunciation, masterSenseId: fixtureIds.sense, locale: "en-GB", isPreferred: true, status: "APPROVED" }],
    provenanceIds: [],
    status: "APPROVED",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const taxonomy = {
    taxonomyId: fixtureIds.taxonomy,
    taxonomyVersion: "2.0.0",
    status: "APPROVED",
    cefrFrameworks: [{ frameworkCode: "CEFR_GLOBAL", frameworkVersion: "2020", labels: [localized("en", "CEFR Global")], descriptors: [{ valueCode: "A1", language: "en", text: "Synthetic A1 descriptor." }], status: "ACTIVE" }],
    topics: [
      { topicId: fixtureIds.topicParent, code: "FIXTURE_ROOT", slug: "fixture-root", labels: [localized("en", "Fixture root")], status: "ACTIVE" },
      { topicId: fixtureIds.topicChild, code: "FIXTURE_CHILD", slug: "fixture-child", labels: [localized("en", "Fixture child")], parentTopicId: fixtureIds.topicParent, status: "ACTIVE" },
    ],
    domains: [
      { domainId: fixtureIds.domainParent, code: "FIXTURE_DOMAIN_ROOT", labels: [localized("en", "Fixture domain root")], status: "ACTIVE" },
      { domainId: fixtureIds.domainChild, code: "FIXTURE_DOMAIN_CHILD", labels: [localized("en", "Fixture domain child")], parentDomainId: fixtureIds.domainParent, status: "ACTIVE" },
    ],
    exams: [{ examId: fixtureIds.exam, code: "FIXTURE_EXAM", familyCode: "OTHER", labels: [localized("en", "Fixture exam")], status: "ACTIVE" }],
    curricula: [{ curriculumId: fixtureIds.curriculum, code: "FIXTURE_CURRICULUM", jurisdiction: "XX", labels: [localized("en", "Fixture curriculum")], sourceProvenanceIds: [fixtureIds.provenanceCurriculum], status: "ACTIVE" }],
    schoolLevels: [{ schoolLevelId: fixtureIds.schoolLevel, curriculumId: fixtureIds.curriculum, gradeNumber: 1, levelCode: "GRADE_1", labels: [localized("en", "Grade 1")], status: "ACTIVE", sortOrder: 1 }],
    difficultyScales: [{ scaleId: fixtureIds.scale, scaleVersion: "1.0.0", labels: [localized("en", "Fixture difficulty")], targetLearnerContext: "Synthetic test fixture", rubricVersion: "fixture-v1", scoreMethod: "EDITORIAL", provenanceIds: [fixtureIds.provenanceDifficultyScale], status: "ACTIVE" }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const classifications: JsonObject[] = [
    { classificationId: fixtureIds.cefrClassification, classificationRevision: 1, masterSenseId: fixtureIds.sense, dimension: "CEFR", frameworkCode: "CEFR_GLOBAL", frameworkVersion: "2020", valueCode: "A1", isPrimary: true, sourceProvenanceIds: [fixtureIds.provenanceCefr], status: "APPROVED" },
    { classificationId: fixtureIds.difficultyClassification, classificationRevision: 1, masterSenseId: fixtureIds.sense, dimension: "DIFFICULTY", numericValue: 18, scaleId: fixtureIds.scale, isPrimary: true, status: "APPROVED" },
    { classificationId: fixtureIds.topicClassification, classificationRevision: 1, masterSenseId: fixtureIds.sense, dimension: "TOPIC", valueRef: fixtureIds.topicChild, isPrimary: true, status: "APPROVED" },
    { classificationId: fixtureIds.domainClassification, classificationRevision: 1, masterSenseId: fixtureIds.sense, dimension: "DOMAIN", valueRef: fixtureIds.domainChild, isPrimary: true, status: "APPROVED" },
    { classificationId: fixtureIds.examClassification, classificationRevision: 1, masterSenseId: fixtureIds.sense, dimension: "EXAM", valueRef: fixtureIds.exam, isPrimary: true, sourceProvenanceIds: [fixtureIds.provenanceExam], status: "APPROVED" },
    { classificationId: fixtureIds.schoolClassification, classificationRevision: 1, masterSenseId: fixtureIds.sense, dimension: "SCHOOL_LEVEL", valueRef: fixtureIds.schoolLevel, isPrimary: true, sourceProvenanceIds: [fixtureIds.provenanceSchool], status: "APPROVED" },
    { classificationId: fixtureIds.ageClassification, classificationRevision: 1, masterSenseId: fixtureIds.sense, dimension: "AGE_GROUP", valueCode: "KIDS", isPrimary: true, status: "APPROVED" },
  ];
  const learningSet = {
    learningSetId: fixtureIds.learningSet,
    learningSetRevision: 1,
    code: "FIXTURE_SET",
    name: [localized("en", "Fixture set")],
    setKind: "STARTER",
    status: "APPROVED",
    items: [{ learningSetItemId: fixtureIds.setItem, learningSetId: fixtureIds.learningSet, masterSenseId: fixtureIds.sense, position: 1, status: "APPROVED", addedByProvenanceId: fixtureIds.provenanceSet }],
    selectionProvenanceIds: [fixtureIds.provenanceSet],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const imageAsset = mediaAsset(fixtureIds.imageAsset, fixtureIds.sense, "SENSE", "IMAGE", fixtureIds.imageDelivery, "image/png", "a");
  const wordAudioAsset = mediaAsset(fixtureIds.wordAudioAsset, fixtureIds.lexeme, "LEXEME", "WORD_PRONUNCIATION_AUDIO", fixtureIds.wordAudioDelivery, "audio/mpeg", "b");
  const exampleAudioAsset = mediaAsset(fixtureIds.exampleAudioAsset, fixtureIds.example, "EXAMPLE", "EXAMPLE_AUDIO", fixtureIds.exampleAudioDelivery, "audio/mpeg", "c");
  const relation = { relationId: fixtureIds.relation, relationRevision: 1, fromEntityType: "LEXEME", fromId: fixtureIds.lexeme, toEntityType: "LEXEME", toId: fixtureIds.secondLexeme, relationType: "SYNONYM", directionality: "SYMMETRIC", provenanceIds: [fixtureIds.provenanceRelation], status: "APPROVED" };
  const provenances = [
    approvedProvenance(fixtureIds.provenanceTranslation, "LINGUISTIC_CHILD", fixtureIds.translation),
    approvedProvenance(fixtureIds.provenanceDefinition, "LINGUISTIC_CHILD", fixtureIds.definition),
    approvedProvenance(fixtureIds.provenanceExample, "LINGUISTIC_CHILD", fixtureIds.example),
    approvedProvenance(fixtureIds.provenanceExampleTranslation, "LINGUISTIC_CHILD", fixtureIds.exampleTranslation),
    approvedProvenance(fixtureIds.provenanceCefr, "CLASSIFICATION", fixtureIds.cefrClassification),
    approvedProvenance(fixtureIds.provenanceSchool, "CLASSIFICATION", fixtureIds.schoolClassification),
    approvedProvenance(fixtureIds.provenanceExam, "CLASSIFICATION", fixtureIds.examClassification),
    approvedProvenance(fixtureIds.provenanceRelation, "RELATION", fixtureIds.relation),
    approvedProvenance(fixtureIds.provenanceSet, "LEARNING_SET", fixtureIds.learningSet),
    approvedProvenance(fixtureIds.provenanceCurriculum, "TAXONOMY_RECORD", fixtureIds.curriculum),
    approvedProvenance(fixtureIds.provenanceDifficultyScale, "TAXONOMY_RECORD", fixtureIds.scale),
  ];

  const pins: Record<string, JsonObject[]> = {
    includedLexemes: [], includedSenses: [], includedClassifications: [], includedLearningSets: [], includedTaxonomySnapshots: [], includedMediaAssetVersions: [], includedRelations: [], includedProvenance: [],
  };
  const writeAndPin = (collection: string, relative: string, value: JsonObject, idField: string, entityId: string, revisionField?: string, revision?: string | number): void => {
    writeRecord(root, relative, value);
    addHashedPin(root, pins[collection], recordPin(relative, idField, entityId, revisionField, revision));
  };

  writeAndPin("includedLexemes", `records/lexemes/${fixtureIds.lexeme}.json`, lexeme, "masterLexemeId", fixtureIds.lexeme, "lexemeRevision", 1);
  writeAndPin("includedLexemes", `records/lexemes/${fixtureIds.secondLexeme}.json`, secondLexeme, "masterLexemeId", fixtureIds.secondLexeme, "lexemeRevision", 1);
  writeAndPin("includedSenses", `records/senses/${fixtureIds.sense}.json`, sense, "masterSenseId", fixtureIds.sense, "senseRevision", 1);
  classifications.forEach((classification) => writeAndPin("includedClassifications", `records/classifications/${String(classification.classificationId)}.json`, classification, "classificationId", String(classification.classificationId), "classificationRevision", 1));
  writeAndPin("includedLearningSets", `records/learning-sets/${fixtureIds.learningSet}.json`, learningSet, "learningSetId", fixtureIds.learningSet, "learningSetRevision", 1);
  writeAndPin("includedTaxonomySnapshots", `records/taxonomies/${fixtureIds.taxonomy}.json`, taxonomy, "taxonomyId", fixtureIds.taxonomy, "taxonomyVersion", "2.0.0");
  for (const [asset, assetId, version] of [[imageAsset, fixtureIds.imageAsset, "a"], [wordAudioAsset, fixtureIds.wordAudioAsset, "b"], [exampleAudioAsset, fixtureIds.exampleAudioAsset, "c"]] as const) {
    writeRecord(root, `records/media/${assetId}.json`, asset);
    pins.includedMediaAssetVersions.push({ mediaAssetId: assetId, mediaAssetVersion: 1, recordPath: `records/media/${assetId}.json`, contentHash: canonicalJsonSha256(asset), sha256: `${version.repeat(64)}` });
  }
  writeAndPin("includedRelations", `records/relations/${fixtureIds.relation}.json`, relation, "relationId", fixtureIds.relation, "relationRevision", 1);
  provenances.forEach((provenance) => writeAndPin("includedProvenance", `records/provenance/${String(provenance.provenanceId)}.json`, provenance, "provenanceId", String(provenance.provenanceId)));

  const manifest: JsonObject = {
    datasetId: fixtureIds.dataset,
    datasetCode: "vocabflow-v2-cross-file-fixture",
    name: [localized("en", "Synthetic V2 Cross-file Fixture")],
    datasetVersion: "2.0.0",
    schemaVersion: "2.0.0",
    status: "APPROVED",
    ...pins,
    createdAt: timestamp,
    releasedAt: timestamp,
    releaseHashAlgorithm: "sha256-canonical-json-v1",
  };
  manifest.releaseHash = canonicalJsonSha256(manifest);
  writeRecord(root, "dataset.json", manifest);
}

function mediaAsset(
  mediaAssetId: string,
  targetId: string,
  targetEntityType: string,
  mediaKind: string,
  deliveryId: string,
  mimeType: string,
  hashLetter: string,
): JsonObject {
  const isAudio = mediaKind !== "IMAGE";
  return {
    mediaAssetId,
    targetEntityType,
    targetId,
    mediaKind,
    semanticBrief: [localized("en", `Synthetic ${mediaKind.toLowerCase()} asset.`)],
    status: "APPROVED",
    currentMediaAssetVersion: 1,
    versions: [{ mediaAssetId, mediaAssetVersion: 1, sha256: hashLetter.repeat(64), mimeType, byteLength: 10, sourceType: "PROJECT_AUTHORED", sourceLocator: "fixture://synthetic-bytes", ...(isAudio ? { audioText: "zorb", locale: "en-US" } : {}), qaStatus: "PASSED", reviewedBy: "fixture-reviewer", reviewedAt: timestamp, status: "APPROVED" }],
    deliveries: [{ deliveryId, mediaAssetId, mediaAssetVersion: 1, provider: "fixture-cdn", providerDeliveryId: `synthetic-${deliveryId}`, url: `https://media.invalid/${deliveryId}.${isAudio ? "mp3" : "png"}`, deliveryStatus: "READY" }],
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function refreshFixtureHashes(root: string, options: { recordHashes?: boolean; releaseHash?: boolean } = {}): void {
  const manifestPath = path.join(root, "dataset.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as JsonObject;
  const recordHashes = options.recordHashes ?? true;
  if (recordHashes) {
    for (const collection of ["includedLexemes", "includedSenses", "includedClassifications", "includedLearningSets", "includedTaxonomySnapshots", "includedMediaAssetVersions", "includedRelations", "includedProvenance"]) {
      const entries = Array.isArray(manifest[collection]) ? manifest[collection] as JsonObject[] : [];
      for (const pin of entries) {
        try {
          const data = JSON.parse(readFileSync(path.join(root, ...String(pin.recordPath).split("/")), "utf8")) as JsonObject;
          pin.contentHash = canonicalJsonSha256(data);
          if (collection === "includedMediaAssetVersions") {
            const version = Array.isArray(data.versions) ? (data.versions as JsonObject[]).find((item) => item.mediaAssetVersion === pin.mediaAssetVersion) : undefined;
            if (version?.sha256) pin.sha256 = version.sha256;
          }
        } catch {
          // Missing-artifact scenarios keep their original pin so the validator can report the missing path.
        }
      }
    }
  }
  if (options.releaseHash !== false && typeof manifest.releaseHash === "string") {
    delete manifest.releaseHash;
    manifest.releaseHash = canonicalJsonSha256(manifest);
  }
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

export function readFixtureJson(root: string, relativePath: string): JsonObject {
  return JSON.parse(readFileSync(path.join(root, ...relativePath.split("/")), "utf8")) as JsonObject;
}

export function writeFixtureJson(root: string, relativePath: string, value: JsonObject): void {
  writeRecord(root, relativePath, value);
}
