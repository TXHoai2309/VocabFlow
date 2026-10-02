import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { canonicalJsonSha256, validateMasterVocabularyDocument, validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";
import {
  fixtureIds,
  readFixtureJson,
  refreshFixtureHashes,
  writeFixtureJson,
  writeValidMasterVocabularyFixture,
} from "./fixtures/master-vocabulary-v2-dataset";

const temporaryRoots: string[] = [];
let datasetRoot = "";

function createFixture(): string {
  const root = mkdtempSync(path.join(os.tmpdir(), "vocabflow-master-v2-"));
  temporaryRoots.push(root);
  writeValidMasterVocabularyFixture(root);
  return root;
}

function manifest(): Record<string, unknown> {
  return readFixtureJson(datasetRoot, "dataset.json");
}

function writeManifest(value: Record<string, unknown>): void {
  writeFixtureJson(datasetRoot, "dataset.json", value);
}

function updateManifestAndHashes(recordHashes = true): void {
  refreshFixtureHashes(datasetRoot, { recordHashes, releaseHash: true });
}

function record(collection: string, id: string): Record<string, unknown> {
  const pins = manifest()[collection] as Array<Record<string, unknown>>;
  const pin = pins.find((entry) => Object.values(entry).includes(id));
  if (!pin || typeof pin.recordPath !== "string") throw new Error(`Missing ${collection} pin for ${id}`);
  return readFixtureJson(datasetRoot, pin.recordPath);
}

function writeRecord(collection: string, id: string, value: Record<string, unknown>): void {
  const pins = manifest()[collection] as Array<Record<string, unknown>>;
  const pin = pins.find((entry) => Object.values(entry).includes(id));
  if (!pin || typeof pin.recordPath !== "string") throw new Error(`Missing ${collection} pin for ${id}`);
  writeFixtureJson(datasetRoot, pin.recordPath, value);
}

function codes(report: ReturnType<typeof validateMasterVocabularyV2>): string[] {
  return report.issues.map((issue) => issue.code);
}

beforeEach(() => {
  datasetRoot = createFixture();
});

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("Master Vocabulary V2 cross-file validator", () => {
  it("matches the deterministic RFC 8785 hash vector", () => {
    expect(canonicalJsonSha256({ b: 2, a: 1 })).toBe("43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777");
  });

  it("keeps every Phase 1 JSON Schema fixture expectation", () => {
    const fixtureCases = [
      ["valid", "lexeme-minimal.json", "lexeme.schema.json", undefined, true],
      ["valid", "sense-minimal.json", "sense.schema.json", undefined, true],
      ["valid", "classification-cefr.json", "common.schema.json", "#/$defs/classification", true],
      ["valid", "classification-difficulty.json", "common.schema.json", "#/$defs/classification", true],
      ["valid", "classification-topic.json", "common.schema.json", "#/$defs/classification", true],
      ["valid", "lexeme-pronunciation.json", "lexeme.schema.json", undefined, true],
      ["valid", "sense-pronunciation-override.json", "sense.schema.json", undefined, true],
      ["valid", "learning-set-sense-reference.json", "learning-set.schema.json", undefined, true],
      ["valid", "media-asset-version-delivery.json", "media-asset.schema.json", undefined, true],
      ["invalid", "pronunciation-both-owners.json", "common.schema.json", "#/$defs/pronunciation", false],
      ["invalid", "pronunciation-no-owner.json", "common.schema.json", "#/$defs/pronunciation", false],
      ["invalid", "classification-difficulty-no-scale.json", "common.schema.json", "#/$defs/classification", false],
      ["invalid", "classification-cefr-numeric.json", "common.schema.json", "#/$defs/classification", false],
      ["invalid", "classification-topic-code.json", "common.schema.json", "#/$defs/classification", false],
      ["invalid", "lexeme-invalid-uuid.json", "lexeme.schema.json", undefined, false],
      ["invalid", "dataset-invalid-version.json", "dataset.schema.json", undefined, false],
      ["invalid", "learning-set-identical-duplicate-item.json", "learning-set.schema.json", undefined, false],
    ] as const;
    for (const [folder, file, schema, target, expected] of fixtureCases) {
      const value = readFixtureJson(path.resolve(process.cwd(), "vocabflow-dataset"), `fixtures/${folder}/${file}`);
      expect(validateMasterVocabularyDocument(value, schema, target).valid, `${folder}/${file}`).toBe(expected);
    }
  });

  it("accepts a valid approved dataset graph, exact pins, media, taxonomy, and release hash", () => {
    const report = validateMasterVocabularyV2({ datasetRoot, writeReport: false });
    expect(report.status).toBe("PASS");
    expect(report.errorCount).toBe(0);
    expect(report.warningCount).toBe(0);
    expect(report.infoCount).toBe(0);
  });

  it("writes a machine-readable report with a stable caller-supplied timestamp", () => {
    const report = validateMasterVocabularyV2({ datasetRoot, validatedAt: "2026-10-02T00:00:00.000Z" });
    const reportPath = path.join(datasetRoot, "reports", "validation-report.json");
    expect(report.status).toBe("PASS");
    expect(existsSync(reportPath)).toBe(true);
    expect(JSON.parse(readFileSync(reportPath, "utf8"))).toMatchObject({
      schemaVersion: "2.0.0",
      datasetVersion: "2.0.0",
      validatedAt: "2026-10-02T00:00:00.000Z",
      status: "PASS",
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      issues: [],
    });
  });

  it("does not include unpinned files in the release", () => {
    writeFixtureJson(datasetRoot, "records/lexemes/unpinned-invalid.json", { status: "not a schema record" });
    const report = validateMasterVocabularyV2({ datasetRoot, writeReport: false });
    expect(report.status).toBe("PASS");
    expect(report.errorCount).toBe(0);
  });

  it("reports normalized lemma collisions as warnings while the release passes", () => {
    const second = record("includedLexemes", fixtureIds.secondLexeme);
    second.normalizedLemma = "zorb";
    writeRecord("includedLexemes", fixtureIds.secondLexeme, second);
    updateManifestAndHashes();
    const report = validateMasterVocabularyV2({ datasetRoot, writeReport: false });
    expect(report.status).toBe("PASS");
    expect(report.warningCount).toBe(1);
    expect(codes(report)).toContain("LEXEME_NORMALIZED_COLLISION");
  });

  it("rejects a dangling Sense to Lexeme reference", () => {
    const sense = record("includedSenses", fixtureIds.sense);
    sense.masterLexemeId = "0195f85c-7b2a-7d10-8c01-999999999999";
    writeRecord("includedSenses", fixtureIds.sense, sense);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("REFERENCE_DANGLING");
  });

  it("rejects a dangling linguistic child Sense reference", () => {
    const sense = record("includedSenses", fixtureIds.sense);
    const translations = sense.translations as Array<Record<string, unknown>>;
    translations[0].masterSenseId = "0195f85c-7b2a-7d10-8c01-999999999999";
    writeRecord("includedSenses", fixtureIds.sense, sense);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("REFERENCE_DANGLING");
  });

  it("rejects a Classification valueRef that resolves to the wrong taxonomy type", () => {
    const classification = record("includedClassifications", fixtureIds.topicClassification);
    classification.valueRef = fixtureIds.domainChild;
    writeRecord("includedClassifications", fixtureIds.topicClassification, classification);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("REFERENCE_TYPE_MISMATCH");
  });

  it("requires Provenance for an approved School Level claim", () => {
    const classification = record("includedClassifications", fixtureIds.schoolClassification);
    delete classification.sourceProvenanceIds;
    writeRecord("includedClassifications", fixtureIds.schoolClassification, classification);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("APPROVED_PROVENANCE_MISSING");
  });

  it("resolves Curriculum Provenance IDs across the pinned graph", () => {
    const taxonomy = record("includedTaxonomySnapshots", fixtureIds.taxonomy);
    const curricula = taxonomy.curricula as Array<Record<string, unknown>>;
    curricula[0].sourceProvenanceIds = ["0195f85c-7b2a-7d10-8c01-999999999999"];
    writeRecord("includedTaxonomySnapshots", fixtureIds.taxonomy, taxonomy);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("REFERENCE_DANGLING");
  });

  it("requires Difficulty Scale Provenance under its JSON Schema", () => {
    const taxonomy = record("includedTaxonomySnapshots", fixtureIds.taxonomy);
    const scales = taxonomy.difficultyScales as Array<Record<string, unknown>>;
    delete scales[0].provenanceIds;
    writeRecord("includedTaxonomySnapshots", fixtureIds.taxonomy, taxonomy);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("SCHEMA_VALIDATION_FAILED");
  });

  it("resolves Difficulty Scale Provenance IDs across the pinned graph", () => {
    const taxonomy = record("includedTaxonomySnapshots", fixtureIds.taxonomy);
    const scales = taxonomy.difficultyScales as Array<Record<string, unknown>>;
    scales[0].provenanceIds = ["0195f85c-7b2a-7d10-8c01-999999999999"];
    writeRecord("includedTaxonomySnapshots", fixtureIds.taxonomy, taxonomy);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("REFERENCE_DANGLING");
  });

  it("detects Topic hierarchy cycles", () => {
    const taxonomy = record("includedTaxonomySnapshots", fixtureIds.taxonomy);
    const topics = taxonomy.topics as Array<Record<string, unknown>>;
    topics[0].parentTopicId = fixtureIds.topicChild;
    writeRecord("includedTaxonomySnapshots", fixtureIds.taxonomy, taxonomy);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("TOPIC_CYCLE");
  });

  it("detects Domain hierarchy cycles", () => {
    const taxonomy = record("includedTaxonomySnapshots", fixtureIds.taxonomy);
    const domains = taxonomy.domains as Array<Record<string, unknown>>;
    domains[0].parentDomainId = fixtureIds.domainChild;
    writeRecord("includedTaxonomySnapshots", fixtureIds.taxonomy, taxonomy);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("DOMAIN_CYCLE");
  });

  it("rejects duplicate Learning Set membership", () => {
    const set = record("includedLearningSets", fixtureIds.learningSet);
    const items = set.items as Array<Record<string, unknown>>;
    items.push({ ...items[0], learningSetItemId: "0195f85c-7b2a-7d10-8c01-999999999901", position: 2 });
    writeRecord("includedLearningSets", fixtureIds.learningSet, set);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("LEARNING_SET_DUPLICATE_MEMBERSHIP");
  });

  it("rejects duplicate Learning Set positions", () => {
    const secondSenseId = "0195f85c-7b2a-7d10-8c01-999999999902";
    const secondSense = { masterSenseId: secondSenseId, masterLexemeId: fixtureIds.secondLexeme, senseRevision: 1, senseOrder: 1, status: "APPROVED", createdAt: "2026-10-02T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z" };
    const relativePath = `records/senses/${secondSenseId}.json`;
    writeFixtureJson(datasetRoot, relativePath, secondSense);
    const currentManifest = manifest();
    const pins = currentManifest.includedSenses as Array<Record<string, unknown>>;
    pins.push({ masterSenseId: secondSenseId, senseRevision: 1, recordPath: relativePath, contentHash: canonicalJsonSha256(secondSense) });
    const set = record("includedLearningSets", fixtureIds.learningSet);
    const items = set.items as Array<Record<string, unknown>>;
    items.push({ learningSetItemId: "0195f85c-7b2a-7d10-8c01-999999999903", learningSetId: fixtureIds.learningSet, masterSenseId: secondSenseId, position: 1, status: "APPROVED" });
    writeRecord("includedLearningSets", fixtureIds.learningSet, set);
    writeManifest(currentManifest);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("LEARNING_SET_DUPLICATE_POSITION");
  });

  it("rejects more than one approved preferred Translation per Sense and language", () => {
    const sense = record("includedSenses", fixtureIds.sense);
    const translations = sense.translations as Array<Record<string, unknown>>;
    translations.push({ ...translations[0], translationId: "0195f85c-7b2a-7d10-8c01-999999999904", text: "another synthetic translation" });
    writeRecord("includedSenses", fixtureIds.sense, sense);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("PREFERRED_TRANSLATION_DUPLICATE");
  });

  it("rejects more than one approved preferred Example Translation per Example and language", () => {
    const sense = record("includedSenses", fixtureIds.sense);
    const examples = sense.examples as Array<Record<string, unknown>>;
    const translations = examples[0].exampleTranslations as Array<Record<string, unknown>>;
    translations.push({ ...translations[0], exampleTranslationId: "0195f85c-7b2a-7d10-8c01-999999999906", text: "Another synthetic sentence translation." });
    writeRecord("includedSenses", fixtureIds.sense, sense);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("PREFERRED_EXAMPLE_TRANSLATION_DUPLICATE");
  });

  it("rejects more than one approved preferred Pronunciation per owner and locale", () => {
    const lexeme = record("includedLexemes", fixtureIds.lexeme);
    const pronunciations = lexeme.pronunciations as Array<Record<string, unknown>>;
    pronunciations.push({ ...pronunciations[0], pronunciationId: "0195f85c-7b2a-7d10-8c01-999999999905", ipa: "zɜːrb" });
    writeRecord("includedLexemes", fixtureIds.lexeme, lexeme);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("PREFERRED_PRONUNCIATION_DUPLICATE");
  });

  it("rejects a media kind and target type mismatch", () => {
    const pins = manifest().includedMediaAssetVersions as Array<Record<string, unknown>>;
    const imagePin = pins.find((pin) => pin.mediaAssetId === fixtureIds.imageAsset);
    if (!imagePin || typeof imagePin.recordPath !== "string") throw new Error("Fixture image pin missing");
    const image = readFixtureJson(datasetRoot, imagePin.recordPath);
    image.mediaKind = "WORD_PRONUNCIATION_AUDIO";
    image.targetEntityType = "EXAMPLE";
    image.targetId = fixtureIds.example;
    writeFixtureJson(datasetRoot, imagePin.recordPath, image);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("MEDIA_TARGET_KIND_MISMATCH");
  });

  it("rejects a missing pinned artifact without falling back to another revision", () => {
    const currentManifest = manifest();
    const pins = currentManifest.includedLexemes as Array<Record<string, unknown>>;
    const pin = pins.find((entry) => entry.masterLexemeId === fixtureIds.secondLexeme);
    if (!pin || typeof pin.recordPath !== "string") throw new Error("Fixture Lexeme pin missing");
    rmSync(path.join(datasetRoot, ...pin.recordPath.split("/")));
    const report = validateMasterVocabularyV2({ datasetRoot, writeReport: false });
    expect(codes(report)).toContain("PIN_ARTIFACT_MISSING");
    expect(report.status).toBe("FAIL");
  });

  it("rejects artifact revision mismatches against exact pins", () => {
    const lexeme = record("includedLexemes", fixtureIds.lexeme);
    lexeme.lexemeRevision = 2;
    writeRecord("includedLexemes", fixtureIds.lexeme, lexeme);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("PIN_REVISION_MISMATCH");
  });

  it("rejects a pinned record contentHash mismatch", () => {
    const lexeme = record("includedLexemes", fixtureIds.lexeme);
    lexeme.lemma = "mutated without repinning";
    writeRecord("includedLexemes", fixtureIds.lexeme, lexeme);
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("CONTENT_HASH_MISMATCH");
  });

  it("rejects a releaseHash mismatch", () => {
    const currentManifest = manifest();
    currentManifest.releaseHash = "f".repeat(64);
    writeManifest(currentManifest);
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("RELEASE_HASH_MISMATCH");
  });

  it("rejects traversal pins at the manifest schema boundary without dereferencing them", () => {
    const currentManifest = manifest();
    const pins = currentManifest.includedLexemes as Array<Record<string, unknown>>;
    pins[0].recordPath = "../../outside.json";
    writeManifest(currentManifest);
    updateManifestAndHashes(false);
    const report = validateMasterVocabularyV2({ datasetRoot, writeReport: false });
    expect(report.status).toBe("FAIL");
    expect(codes(report)).toContain("SCHEMA_VALIDATION_FAILED");
    expect(codes(report)).not.toContain("PIN_ARTIFACT_MISSING");
  });

  it("rejects the same durable Lexeme ID pinned at conflicting revisions", () => {
    const currentManifest = manifest();
    const original = record("includedLexemes", fixtureIds.lexeme);
    const conflicting = { ...original, lexemeRevision: 2 };
    const relativePath = `records/lexemes/${fixtureIds.lexeme}-revision-2.json`;
    writeFixtureJson(datasetRoot, relativePath, conflicting);
    const pins = currentManifest.includedLexemes as Array<Record<string, unknown>>;
    pins.push({ masterLexemeId: fixtureIds.lexeme, lexemeRevision: 2, recordPath: relativePath, contentHash: canonicalJsonSha256(conflicting) });
    writeManifest(currentManifest);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("DUPLICATE_ENTITY_ID");
  });

  it("rejects the same entity revision pinned to conflicting artifact paths", () => {
    const currentManifest = manifest();
    const original = record("includedLexemes", fixtureIds.lexeme);
    const relativePath = `records/lexemes/${fixtureIds.lexeme}-conflict.json`;
    writeFixtureJson(datasetRoot, relativePath, original);
    const pins = currentManifest.includedLexemes as Array<Record<string, unknown>>;
    pins.push({ masterLexemeId: fixtureIds.lexeme, lexemeRevision: 1, recordPath: relativePath, contentHash: canonicalJsonSha256(original) });
    writeManifest(currentManifest);
    updateManifestAndHashes();
    expect(codes(validateMasterVocabularyV2({ datasetRoot, writeReport: false }))).toContain("PIN_CONFLICT");
  });
});
