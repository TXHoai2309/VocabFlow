import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildAppImportV2,
  loadPinnedMasterProjectionGraph,
  projectLegacyLevel,
  runMasterVocabularyTransform,
  type MasterProjectionGraph,
} from "./transform-master-vocabulary-v2";

const datasetRoot = path.resolve(process.cwd(), "vocabflow-dataset");
const sourceGraph = loadPinnedMasterProjectionGraph(datasetRoot);

function cloneGraph(): MasterProjectionGraph {
  return structuredClone(sourceGraph);
}

function rows(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null && !Array.isArray(entry)) : [];
}

function runtime(record: Record<string, unknown>): Record<string, unknown> {
  return record.runtimeProjection as Record<string, unknown>;
}

function senseFor(graph: MasterProjectionGraph, word: string, predicate: (sense: Record<string, unknown>) => boolean = () => true): Record<string, unknown> {
  const lexeme = graph.lexemes.find((row) => row.lemma === word);
  if (!lexeme) throw new Error(`Missing lexeme ${word}`);
  const sense = graph.senses.find((row) => row.masterLexemeId === lexeme.masterLexemeId && predicate(row));
  if (!sense) throw new Error(`Missing sense ${word}`);
  return sense;
}

function outputRow(graph: MasterProjectionGraph, senseId: string): Record<string, unknown> {
  const artifact = buildAppImportV2(graph);
  const row = rows(artifact.vocabulary.records).find((entry) => entry.masterSenseId === senseId);
  if (!row) throw new Error(`Missing projection ${senseId}`);
  return row;
}

function addReadyImage(graph: MasterProjectionGraph, senseId: string, url = "https://cdn.example.test/apple.webp", sha256 = "a".repeat(64)): void {
  const asset = graph.mediaAssets.find((row) => row.targetEntityType === "SENSE" && row.targetId === senseId && row.mediaKind === "IMAGE");
  if (!asset) throw new Error(`Missing image slot for ${senseId}`);
  const assetId = String(asset.mediaAssetId);
  asset.status = "APPROVED";
  asset.currentMediaAssetVersion = 1;
  asset.versions = [{ mediaAssetId: assetId, mediaAssetVersion: 1, status: "APPROVED", sha256 }];
  asset.deliveries = [{ mediaAssetId: assetId, mediaAssetVersion: 1, deliveryId: "01a0fc13-0a50-7000-8000-000000000000", provider: "test-provider", providerDeliveryId: "delivery-1", deliveryStatus: "READY", url }];
  graph.manifest.includedMediaAssetVersions = [
    ...rows(graph.manifest.includedMediaAssetVersions),
    { mediaAssetId: assetId, mediaAssetVersion: 1, sha256, recordPath: "synthetic-media-slot.json", contentHash: "f".repeat(64) },
  ];
}

describe("Master V2 to App Import V3 projection", () => {
  it("produces deterministic artifacts for identical pinned input", () => {
    const first = buildAppImportV2(sourceGraph, "PREVIEW");
    const second = buildAppImportV2(sourceGraph, "PREVIEW");
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
  });

  it("projects bank as two distinct Sense rows", () => {
    const artifact = buildAppImportV2(sourceGraph);
    const bankRows = rows(artifact.vocabulary.records).filter((row) => runtime(row).word === "bank");
    expect(bankRows).toHaveLength(2);
    expect(new Set(bankRows.map((row) => row.masterSenseId)).size).toBe(2);
    expect(new Set(bankRows.map((row) => runtime(row).vietnamese)).size).toBe(2);
  });

  it("keeps apple as one vocabulary row when it is reused by multiple Learning Sets", () => {
    const artifact = buildAppImportV2(sourceGraph);
    const apple = senseFor(sourceGraph, "apple");
    const appleId = String(apple.masterSenseId);
    expect(rows(artifact.vocabulary.records).filter((row) => row.masterSenseId === appleId)).toHaveLength(1);
    expect(rows(artifact.learningSetItems.records).filter((item) => item.masterSenseId === appleId).length).toBeGreaterThan(1);
  });

  it("uses the preferred record Sense pronunciation override", () => {
    const sense = senseFor(sourceGraph, "record", (row) => rows(row.pronunciationOverrides).length > 0);
    expect(runtime(outputRow(sourceGraph, String(sense.masterSenseId))).ipa).toBe("ɹɪˈkɔɹd");
  });

  it("falls back to the preferred Lexeme pronunciation when a Sense has no override", () => {
    const sense = senseFor(sourceGraph, "record", (row) => rows(row.pronunciationOverrides).length === 0);
    expect(runtime(outputRow(sourceGraph, String(sense.masterSenseId))).ipa).toBe("ˈɹɛk.ɚd");
  });

  it("keeps PLANNED image media out of imageUrl", () => {
    const sense = senseFor(sourceGraph, "apple");
    expect(runtime(outputRow(sourceGraph, String(sense.masterSenseId))).imageUrl).toBeNull();
  });

  it("keeps NOT_APPLICABLE image media out of imageUrl", () => {
    const graph = cloneGraph();
    const sense = senseFor(graph, "apple");
    const asset = graph.mediaAssets.find((row) => row.targetId === sense.masterSenseId && row.mediaKind === "IMAGE");
    if (!asset) throw new Error("Missing apple image slot");
    asset.status = "NOT_APPLICABLE";
    expect(runtime(outputRow(graph, String(sense.masterSenseId))).imageUrl).toBeNull();
  });

  it("keeps PLANNED pronunciation audio out of audioUrl", () => {
    const sense = senseFor(sourceGraph, "record", (row) => rows(row.pronunciationOverrides).length > 0);
    expect(runtime(outputRow(sourceGraph, String(sense.masterSenseId))).audioUrl).toBeNull();
  });

  it("does not convert an A1 classification into GRADE_1", () => {
    const classification = sourceGraph.classifications.find((row) => row.dimension === "CEFR" && row.valueCode === "A1");
    if (!classification) throw new Error("Missing A1 classification");
    const projected = runtime(outputRow(sourceGraph, String(classification.masterSenseId)));
    expect(projected.level).not.toBe("GRADE_1");
  });

  it("maps an explicit compatible School Level grade 1–5", () => {
    const graph = cloneGraph();
    const schoolLevel = rows(graph.taxonomy.schoolLevels)[0];
    const curriculum = rows(graph.taxonomy.curricula).find((row) => row.curriculumId === schoolLevel?.curriculumId);
    if (!schoolLevel || !curriculum) throw new Error("Missing pilot School Level");
    curriculum.code = "COMPATIBLE_CURRICULUM";
    curriculum.jurisdiction = "VN";
    schoolLevel.gradeNumber = 3;
    expect(projectLegacyLevel({ valueRef: schoolLevel.schoolLevelId }, graph.taxonomy).level).toBe("GRADE_3");
  });

  it("leaves Grade 6 unprojected with an explicit compatibility warning", () => {
    const graph = cloneGraph();
    const schoolLevel = rows(graph.taxonomy.schoolLevels)[0];
    const curriculum = rows(graph.taxonomy.curricula).find((row) => row.curriculumId === schoolLevel?.curriculumId);
    if (!schoolLevel || !curriculum) throw new Error("Missing pilot School Level");
    curriculum.code = "COMPATIBLE_CURRICULUM";
    curriculum.jurisdiction = "VN";
    schoolLevel.gradeNumber = 6;
    expect(projectLegacyLevel({ valueRef: schoolLevel.schoolLevelId }, graph.taxonomy)).toMatchObject({ level: null, warning: "SCHOOL_GRADE_OUTSIDE_RUNTIME_ENUM" });
  });

  it("resolves multiple Topic assignments deterministically when there is no primary", () => {
    const graph = cloneGraph();
    const sense = senseFor(graph, "apple");
    const senseId = String(sense.masterSenseId);
    const existing = graph.classifications.find((row) => row.masterSenseId === senseId && row.dimension === "TOPIC");
    const topics = rows(graph.taxonomy.topics);
    if (!existing || topics.length < 2) throw new Error("Missing topic fixture");
    existing.isPrimary = false;
    const alternative = topics.find((topic) => topic.topicId !== existing.valueRef);
    if (!alternative) throw new Error("Missing second topic");
    graph.classifications.push({ ...existing, classificationId: "synthetic-topic-classification", valueRef: alternative.topicId, isPrimary: false });
    const artifact = buildAppImportV2(graph);
    const projection = rows(artifact.vocabulary.records).find((row) => row.masterSenseId === senseId);
    const memberships = rows(artifact.topicMemberships.records).filter((row) => row.masterSenseId === senseId);
    expect(memberships).toHaveLength(2);
    const candidateTopics = memberships.map((membership) => rows(graph.taxonomy.topics).find((topic) => topic.topicId === membership.masterTopicId)!);
    const depth = (topic: Record<string, unknown>): number => {
      let value = 0;
      let parent = topic.parentTopicId;
      while (parent) {
        const parentTopic = rows(graph.taxonomy.topics).find((row) => row.topicId === parent);
        if (!parentTopic) break;
        value += 1;
        parent = parentTopic.parentTopicId;
      }
      return value;
    };
    const expected = [...candidateTopics].sort((a, b) => depth(b) - depth(a) || String(a.code).localeCompare(String(b.code)))[0];
    expect(runtime(projection!).topic).toBe(rows(expected?.labels).find((entry) => entry.language === "en")?.text);
  });

  it("keeps projection fingerprints stable across repeated calculations", () => {
    const graph = cloneGraph();
    const sense = senseFor(graph, "bank");
    const a = outputRow(graph, String(sense.masterSenseId)).masterProjectionFingerprint;
    const b = outputRow(graph, String(sense.masterSenseId)).masterProjectionFingerprint;
    expect(a).toBe(b);
  });

  it("changes the fingerprint when the selected Vietnamese Translation changes", () => {
    const graph = cloneGraph();
    const sense = senseFor(graph, "apple");
    const id = String(sense.masterSenseId);
    const before = outputRow(graph, id).masterProjectionFingerprint;
    const translation = rows(sense.translations)[0]!;
    translation.text = `${String(translation.text)} (edited)`;
    expect(outputRow(graph, id).masterProjectionFingerprint).not.toBe(before);
  });

  it("does not change the fingerprint for provenance-only edits", () => {
    const graph = cloneGraph();
    const sense = senseFor(graph, "apple");
    const id = String(sense.masterSenseId);
    const before = outputRow(graph, id).masterProjectionFingerprint;
    sense.provenanceIds = ["synthetic-provenance"];
    rows(sense.translations)[0]!.provenanceIds = ["another-provenance"];
    expect(outputRow(graph, id).masterProjectionFingerprint).toBe(before);
  });

  it("does not change semantic fingerprint when provider URL changes for the same approved media version", () => {
    const graph = cloneGraph();
    const sense = senseFor(graph, "apple");
    const id = String(sense.masterSenseId);
    addReadyImage(graph, id);
    const before = outputRow(graph, id);
    const asset = graph.mediaAssets.find((row) => row.targetId === id && row.mediaKind === "IMAGE")!;
    rows(asset.deliveries)[0]!.url = "https://other-cdn.example.test/apple.webp";
    const after = outputRow(graph, id);
    expect(after.masterProjectionFingerprint).toBe(before.masterProjectionFingerprint);
    expect(runtime(after).imageUrl).not.toBe(runtime(before).imageUrl);
  });

  it("changes fingerprint when selected media bytes change", () => {
    const graph = cloneGraph();
    const sense = senseFor(graph, "apple");
    const id = String(sense.masterSenseId);
    addReadyImage(graph, id);
    const before = outputRow(graph, id).masterProjectionFingerprint;
    const assetId = String(graph.mediaAssets.find((row) => row.targetId === id && row.mediaKind === "IMAGE")!.mediaAssetId);
    const changedHash = "b".repeat(64);
    rows(graph.mediaAssets.find((row) => row.mediaAssetId === assetId)!.versions)[0]!.sha256 = changedHash;
    const versionPin = rows(graph.manifest.includedMediaAssetVersions).find((pin) => pin.mediaAssetId === assetId)!;
    versionPin.sha256 = changedHash;
    expect(outputRow(graph, id).masterProjectionFingerprint).not.toBe(before);
  });

  it("keeps every app vocabulary ID unresolved without authoritative reconciliation", () => {
    const artifact = buildAppImportV2(sourceGraph);
    for (const row of rows(artifact.vocabulary.records)) {
      expect(row.appVocabularyId).toBeNull();
      expect(row.mappingStatus).toBe("UNRESOLVED");
    }
  });

  it("does not map either bank Sense by lemma alone", () => {
    const artifact = buildAppImportV2(sourceGraph);
    const bankRows = rows(artifact.mapping.mappings).filter((row) => row.masterLexemeId === senseFor(sourceGraph, "bank").masterLexemeId);
    expect(bankRows).toHaveLength(2);
    expect(bankRows.every((row) => row.appVocabularyId === null && row.runtimeIdentityState === "NOT_RECONCILED")).toBe(true);
  });

  it("rejects RELEASE for the current DRAFT/IN_REVIEW pilot before writing output", () => {
    const outputRoot = mkdtempSync(path.join(os.tmpdir(), "vocabflow-app-import-release-"));
    try {
      expect(() => runMasterVocabularyTransform({ datasetRoot, outputRoot, mode: "RELEASE", writeOutputs: true }))
        .toThrow("RELEASE_REQUIRES_APPROVED_MANIFEST:DRAFT");
      expect(existsSync(path.join(outputRoot, "vocabulary-import-v2.json"))).toBe(false);
    } finally {
      rmSync(outputRoot, { recursive: true, force: true });
    }
  });

  it("refuses a source whose pinned Master record no longer matches its content hash", () => {
    const temporaryRoot = mkdtempSync(path.join(os.tmpdir(), "vocabflow-invalid-master-"));
    const copiedDataset = path.join(temporaryRoot, "dataset");
    try {
      cpSync(datasetRoot, copiedDataset, { recursive: true });
      const manifest = JSON.parse(readFileSync(path.join(copiedDataset, "dataset.json"), "utf8")) as Record<string, unknown>;
      const firstSensePin = rows(manifest.includedSenses)[0]!;
      const recordPath = String(firstSensePin.recordPath);
      const sense = JSON.parse(readFileSync(path.join(copiedDataset, recordPath), "utf8")) as Record<string, unknown>;
      sense.status = "APPROVED";
      writeFileSync(path.join(copiedDataset, recordPath), `${JSON.stringify(sense, null, 2)}\n`, "utf8");
      expect(() => runMasterVocabularyTransform({ datasetRoot: copiedDataset, mode: "PREVIEW", writeOutputs: false }))
        .toThrow(/MASTER_VALIDATION_FAILED:.*CONTENT_HASH_MISMATCH/);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
  });

  it("marks the preview non-importable and keeps enabled false", () => {
    const artifact = buildAppImportV2(sourceGraph);
    expect(artifact.vocabulary.importEligible).toBe(false);
    expect(rows(artifact.vocabulary.records).every((row) => runtime(row).enabled === false)).toBe(true);
  });

  it("does not invent an authoritative runtime contentVersion", () => {
    const row = rows(buildAppImportV2(sourceGraph).vocabulary.records)[0]!;
    expect(row.contentVersion).toEqual({ status: "PENDING_RUNTIME_RECONCILIATION" });
    expect(runtime(row)).not.toHaveProperty("contentVersion");
  });
});
