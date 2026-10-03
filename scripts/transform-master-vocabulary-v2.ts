import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import canonicalize from "canonicalize";
import { canonicalJsonSha256, validateMasterVocabularyV2 } from "./validate-master-vocabulary-v2";

export const APP_IMPORT_CONTRACT_VERSION = "app-import-v3";
export const RUNTIME_PROJECTION_CONTRACT_VERSION = "runtime-vocabulary-projection-v2";
export const RUNTIME_PRONUNCIATION_LOCALE = "en-US";
export const MASTER_SOURCE_DATASET = "VOCABFLOW_MASTER_V2";

type JsonRecord = Record<string, unknown>;
type TransformMode = "PREVIEW" | "RELEASE";
type RuntimeLevel = "GRADE_1" | "GRADE_2" | "GRADE_3" | "GRADE_4" | "GRADE_5" | "GENERAL";

export interface MasterProjectionGraph {
  datasetRoot: string;
  manifest: JsonRecord;
  lexemes: JsonRecord[];
  senses: JsonRecord[];
  classifications: JsonRecord[];
  learningSets: JsonRecord[];
  taxonomy: JsonRecord;
  mediaAssets: JsonRecord[];
}

interface SemanticMediaIdentity {
  mediaAssetId: string;
  mediaAssetVersion: number;
  sha256: string;
  deliveryAvailable: boolean;
}

interface ProjectedVocabularyRecord {
  masterLexemeId: string;
  masterSenseId: string;
  sourceRevisions: { lexemeRevision: number; senseRevision: number };
  sourceIdentity: { sourceDataset: string; masterSenseId: string };
  runtimeProjection: {
    word: string;
    ipa: string | null;
    vietnamese: string;
    definitionEn: string | null;
    exampleEn: string | null;
    imageUrl: string | null;
    audioUrl: string | null;
    topic: string | null;
    level: RuntimeLevel | null;
    enabled: boolean;
  };
  projectionSemantics: {
    wordLanguage: string;
    pronunciationLocale: string;
    translationLanguage: string;
    definitionLanguage: string | null;
    exampleLanguage: string | null;
    image: SemanticMediaIdentity | null;
    audio: SemanticMediaIdentity | null;
  };
  projectionContractVersion: string;
  masterProjectionFingerprint: string;
  appVocabularyId: null;
  mappingStatus: "UNRESOLVED";
  contentVersion: { status: "PENDING_RUNTIME_RECONCILIATION" };
  warnings: string[];
}

export interface AppImportV3Artifacts {
  vocabulary: JsonRecord;
  topics: JsonRecord;
  learningSets: JsonRecord;
  learningSetItems: JsonRecord;
  topicMemberships: JsonRecord;
  mapping: JsonRecord;
  report: string;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function records(value: unknown): JsonRecord[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

function text(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function number(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeLearnerText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.replace(/\r\n?/g, "\n").normalize("NFC");
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function duplicateValueCount(values: string[]): number {
  return values.length - new Set(values).size;
}

function statusEligible(value: unknown, mode: TransformMode): boolean {
  if (mode === "RELEASE") return value === "APPROVED";
  return value === "APPROVED" || value === "IN_REVIEW" || value === "DRAFT";
}

function label(labels: unknown, language: string): string | null {
  const found = records(labels).find((entry) => entry.language === language && typeof entry.text === "string");
  return normalizeLearnerText(found?.text);
}

function pinRead(datasetRoot: string, pinsValue: unknown, idField: string, revisionField?: string): JsonRecord[] {
  const pins = records(pinsValue);
  return pins.map((pin) => {
    const recordPath = text(pin.recordPath);
    if (!recordPath) throw new Error(`PIN_PATH_MISSING:${String(pin[idField] ?? "unknown")}`);
    const absolutePath = path.resolve(datasetRoot, recordPath);
    if (!absolutePath.startsWith(`${datasetRoot}${path.sep}`)) throw new Error(`PIN_PATH_OUTSIDE_DATASET:${recordPath}`);
    const parsed: unknown = JSON.parse(readFileSync(absolutePath, "utf8"));
    if (!isRecord(parsed)) throw new Error(`PIN_RECORD_NOT_OBJECT:${recordPath}`);
    if (parsed[idField] !== pin[idField]) throw new Error(`PIN_ID_MISMATCH:${recordPath}`);
    if (revisionField && parsed[revisionField] !== pin[revisionField]) throw new Error(`PIN_REVISION_MISMATCH:${recordPath}`);
    if (canonicalJsonSha256(parsed) !== pin.contentHash) throw new Error(`PIN_HASH_MISMATCH:${recordPath}`);
    return parsed;
  });
}

export function loadPinnedMasterProjectionGraph(datasetRoot: string): MasterProjectionGraph {
  const resolvedRoot = path.resolve(datasetRoot);
  const manifestValue: unknown = JSON.parse(readFileSync(path.join(resolvedRoot, "dataset.json"), "utf8"));
  if (!isRecord(manifestValue)) throw new Error("DATASET_MANIFEST_NOT_OBJECT");
  const taxonomySnapshots = pinRead(resolvedRoot, manifestValue.includedTaxonomySnapshots, "taxonomyId", "taxonomyVersion");
  const classifications = pinRead(resolvedRoot, manifestValue.includedClassifications, "classificationId", "classificationRevision");
  if (taxonomySnapshots.length > 1) throw new Error("TRANSFORM_REQUIRES_AT_MOST_ONE_TAXONOMY_SNAPSHOT");
  if (taxonomySnapshots.length === 0 && classifications.length > 0) throw new Error("TRANSFORM_CLASSIFICATIONS_REQUIRE_TAXONOMY");
  const assetPins = [
    ...records(manifestValue.includedMediaAssets),
    ...records(manifestValue.includedMediaAssetVersions),
  ];
  const uniqueAssetPins = new Map<string, JsonRecord>();
  for (const pin of assetPins) {
    const key = String(pin.recordPath ?? "");
    if (key) uniqueAssetPins.set(key, pin);
  }
  const mediaAssets = [...uniqueAssetPins.values()].map((pin) => {
    const recordPath = text(pin.recordPath);
    if (!recordPath) throw new Error("MEDIA_ASSET_PIN_PATH_MISSING");
    const absolutePath = path.resolve(resolvedRoot, recordPath);
    if (!absolutePath.startsWith(`${resolvedRoot}${path.sep}`)) throw new Error(`MEDIA_ASSET_PIN_PATH_OUTSIDE_DATASET:${recordPath}`);
    const parsed: unknown = JSON.parse(readFileSync(absolutePath, "utf8"));
    if (!isRecord(parsed) || parsed.mediaAssetId !== pin.mediaAssetId) throw new Error(`MEDIA_ASSET_PIN_ID_MISMATCH:${recordPath}`);
    if (canonicalJsonSha256(parsed) !== pin.contentHash) throw new Error(`MEDIA_ASSET_PIN_HASH_MISMATCH:${recordPath}`);
    return parsed;
  });
  return {
    datasetRoot: resolvedRoot,
    manifest: manifestValue,
    lexemes: pinRead(resolvedRoot, manifestValue.includedLexemes, "masterLexemeId", "lexemeRevision"),
    senses: pinRead(resolvedRoot, manifestValue.includedSenses, "masterSenseId", "senseRevision"),
    classifications,
    learningSets: pinRead(resolvedRoot, manifestValue.includedLearningSets, "learningSetId", "learningSetRevision"),
    taxonomy: taxonomySnapshots[0] ?? {
      status: "APPROVED",
      cefrFrameworks: [],
      topics: [],
      domains: [],
      exams: [],
      curricula: [],
      schoolLevels: [],
      difficultyScales: [],
    },
    mediaAssets,
  };
}

function taxonomyArray(taxonomy: JsonRecord, field: string): JsonRecord[] {
  return records(taxonomy[field]);
}

function ancestryDepth(topic: JsonRecord, topicsById: Map<string, JsonRecord>): number {
  let depth = 0;
  let parentId = text(topic.parentTopicId);
  const seen = new Set<string>();
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId);
    const parent = topicsById.get(parentId);
    if (!parent) break;
    depth += 1;
    parentId = text(parent.parentTopicId);
  }
  return depth;
}

function englishTopicName(topic: JsonRecord): string {
  return label(topic.labels, "en") ?? text(topic.code) ?? String(topic.topicId);
}

function levelProjection(classification: JsonRecord | undefined, taxonomy: JsonRecord): { level: RuntimeLevel | null; warning?: string } {
  if (!classification) return { level: null };
  const schoolLevelId = text(classification.valueRef);
  const schoolLevel = taxonomyArray(taxonomy, "schoolLevels").find((row) => row.schoolLevelId === schoolLevelId);
  if (!schoolLevel || schoolLevel.status !== "ACTIVE") return { level: null, warning: "SCHOOL_LEVEL_REFERENCE_NOT_PROJECTABLE" };
  const curriculum = taxonomyArray(taxonomy, "curricula").find((row) => row.curriculumId === schoolLevel.curriculumId);
  if (!curriculum || curriculum.status !== "ACTIVE") return { level: null, warning: "SCHOOL_CURRICULUM_NOT_ACTIVE" };
  if (curriculum.code === "VOCABFLOW_INTERNAL_DEMO" || curriculum.jurisdiction === "INTERNAL_DEMO") {
    return { level: null, warning: "SCHOOL_CURRICULUM_INTERNAL_DEMO_NOT_PROJECTABLE" };
  }
  const grade = number(schoolLevel.gradeNumber, -1);
  if (!Number.isInteger(grade) || grade < 1 || grade > 5) {
    return { level: null, warning: "SCHOOL_GRADE_OUTSIDE_RUNTIME_ENUM" };
  }
  return { level: `GRADE_${grade}` as RuntimeLevel };
}

export function projectLegacyLevel(classification: JsonRecord | undefined, taxonomy: JsonRecord): { level: RuntimeLevel | null; warning?: string } {
  return levelProjection(classification, taxonomy);
}

function getClassificationIndex(graph: MasterProjectionGraph, mode: TransformMode): Map<string, JsonRecord[]> {
  const bySense = new Map<string, JsonRecord[]>();
  for (const classification of graph.classifications) {
    const senseId = text(classification.masterSenseId);
    if (!senseId || !statusEligible(classification.status, mode)) continue;
    const list = bySense.get(senseId) ?? [];
    list.push(classification);
    bySense.set(senseId, list);
  }
  return bySense;
}

function mediaVersionPin(graph: MasterProjectionGraph, assetId: string, version: number): JsonRecord | undefined {
  return records(graph.manifest.includedMediaAssetVersions).find((pin) => pin.mediaAssetId === assetId && pin.mediaAssetVersion === version);
}

function safeReadyUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function resolveApprovedMedia(graph: MasterProjectionGraph, assetId: string | undefined): { url: string | null; semantic: SemanticMediaIdentity | null } {
  if (!assetId) return { url: null, semantic: null };
  const asset = graph.mediaAssets.find((row) => row.mediaAssetId === assetId);
  if (!asset || asset.status !== "APPROVED") return { url: null, semantic: null };
  const versionNumber = number(asset.currentMediaAssetVersion, -1);
  if (versionNumber < 1) return { url: null, semantic: null };
  const pin = mediaVersionPin(graph, assetId, versionNumber);
  if (!pin) return { url: null, semantic: null };
  const version = records(asset.versions).find((row) => row.mediaAssetVersion === versionNumber);
  if (!version || version.status !== "APPROVED" || version.sha256 !== pin.sha256 || typeof version.sha256 !== "string") {
    return { url: null, semantic: null };
  }
  const delivery = records(asset.deliveries)
    .filter((row) => row.mediaAssetVersion === versionNumber && row.deliveryStatus === "READY")
    .map((row) => safeReadyUrl(row.url))
    .find((url): url is string => Boolean(url));
  return {
    url: delivery ?? null,
    semantic: {
      mediaAssetId: assetId,
      mediaAssetVersion: versionNumber,
      sha256: version.sha256,
      deliveryAvailable: Boolean(delivery),
    },
  };
}

function selectPronunciation(lexeme: JsonRecord, sense: JsonRecord, mode: TransformMode): JsonRecord | undefined {
  const overrides = records(sense.pronunciationOverrides)
    .filter((entry) => entry.locale === RUNTIME_PRONUNCIATION_LOCALE && entry.isPreferred === true && statusEligible(entry.status, mode))
    .sort((a, b) => compareText(String(a.pronunciationId ?? ""), String(b.pronunciationId ?? "")));
  if (overrides[0]) return overrides[0];
  return records(lexeme.pronunciations)
    .filter((entry) => entry.locale === RUNTIME_PRONUNCIATION_LOCALE && entry.isPreferred === true && statusEligible(entry.status, mode))
    .sort((a, b) => compareText(String(a.pronunciationId ?? ""), String(b.pronunciationId ?? "")))[0];
}

function eligibleLocalizedRows(value: unknown, mode: TransformMode, language: string): JsonRecord[] {
  return records(value)
    .filter((row) => row.language === language && statusEligible(row.status, mode))
    .sort((a, b) => number(a.displayOrder) - number(b.displayOrder) || compareText(String(a.definitionId ?? a.exampleId ?? a.translationId ?? ""), String(b.definitionId ?? b.exampleId ?? b.translationId ?? "")));
}

function chooseTranslation(sense: JsonRecord, mode: TransformMode): { row?: JsonRecord; warning?: string } {
  const translations = eligibleLocalizedRows(sense.translations, mode, "vi")
    .sort((a, b) => Number(b.isPreferred === true) - Number(a.isPreferred === true) || number(a.displayOrder) - number(b.displayOrder) || compareText(String(a.translationId ?? ""), String(b.translationId ?? "")));
  if (translations.length === 0) return { warning: "VIETNAMESE_TRANSLATION_MISSING" };
  if (!translations.some((row) => row.isPreferred === true)) return { row: translations[0], warning: "VIETNAMESE_TRANSLATION_NO_PREFERRED_FALLBACK" };
  if (translations.filter((row) => row.isPreferred === true).length > 1) return { row: translations[0], warning: "MULTIPLE_PREFERRED_VIETNAMESE_TRANSLATIONS_TIE_BROKEN" };
  return { row: translations[0] };
}

function selectSenseText(sense: JsonRecord, field: "definitions" | "examples", mode: TransformMode): JsonRecord | undefined {
  const idField = field === "definitions" ? "definitionId" : "exampleId";
  return records(sense[field])
    .filter((row) => row.language === "en" && statusEligible(row.status, mode))
    .sort((a, b) => number(a.displayOrder) - number(b.displayOrder) || compareText(String(a[idField] ?? ""), String(b[idField] ?? "")))[0];
}

function topicCandidates(classifications: JsonRecord[], taxonomy: JsonRecord): Array<{ classification: JsonRecord; topic: JsonRecord }> {
  const topics = taxonomyArray(taxonomy, "topics");
  const byId = new Map(topics.map((topic) => [String(topic.topicId), topic]));
  return classifications
    .filter((entry) => entry.dimension === "TOPIC")
    .map((classification) => ({ classification, topic: byId.get(String(classification.valueRef)) }))
    .filter((entry): entry is { classification: JsonRecord; topic: JsonRecord } => Boolean(entry.topic && entry.topic.status === "ACTIVE"))
    .sort((a, b) => compareText(String(a.topic.code ?? ""), String(b.topic.code ?? "")) || compareText(String(a.topic.topicId ?? ""), String(b.topic.topicId ?? "")));
}

function chooseLegacyTopic(candidates: Array<{ classification: JsonRecord; topic: JsonRecord }>, taxonomy: JsonRecord): { selected?: JsonRecord; warning?: string } {
  const primary = candidates.filter((entry) => entry.classification.isPrimary === true);
  if (primary.length === 1) return { selected: primary[0]!.topic };
  if (primary.length > 1) return { selected: primary[0]!.topic, warning: "MULTIPLE_PRIMARY_TOPICS_TIE_BROKEN_BY_CODE" };
  const topicById = new Map(taxonomyArray(taxonomy, "topics").map((topic) => [String(topic.topicId), topic]));
  const ordered = [...candidates].sort((a, b) =>
    ancestryDepth(b.topic, topicById) - ancestryDepth(a.topic, topicById)
      || compareText(String(a.topic.code ?? ""), String(b.topic.code ?? ""))
      || compareText(String(a.topic.topicId ?? ""), String(b.topic.topicId ?? "")),
  );
  return ordered.length ? { selected: ordered[0]!.topic } : {};
}

function metadata(graph: MasterProjectionGraph, mode: TransformMode): JsonRecord {
  return {
    artifactVersion: APP_IMPORT_CONTRACT_VERSION,
    sourceDataset: MASTER_SOURCE_DATASET,
    sourceDatasetId: graph.manifest.datasetId,
    sourceDatasetVersion: graph.manifest.datasetVersion,
    sourceSchemaVersion: graph.manifest.schemaVersion,
    sourceManifestStatus: graph.manifest.status,
    sourceManifestContentHash: canonicalJsonSha256(graph.manifest),
    sourceReleaseHash: graph.manifest.releaseHash ?? null,
    mode,
    importEligible: mode === "RELEASE",
  };
}

function normalizedMediaForFingerprint(media: SemanticMediaIdentity | null): SemanticMediaIdentity | null {
  return media ? { ...media } : null;
}

function fingerprintFor(record: ProjectedVocabularyRecord["runtimeProjection"], lexemeLanguage: string, selectedTranslation: string, definition: string | null, example: string | null, ipa: string | null, image: SemanticMediaIdentity | null, audio: SemanticMediaIdentity | null): string {
  const envelope = {
    projectionContractVersion: RUNTIME_PROJECTION_CONTRACT_VERSION,
    word: normalizeLearnerText(record.word),
    wordLanguage: lexemeLanguage,
    ipa: normalizeLearnerText(ipa),
    pronunciationLocale: RUNTIME_PRONUNCIATION_LOCALE,
    vietnamese: normalizeLearnerText(selectedTranslation),
    translationLanguage: "vi",
    definitionEn: normalizeLearnerText(definition),
    definitionLanguage: definition === null ? null : "en",
    exampleEn: normalizeLearnerText(example),
    exampleLanguage: example === null ? null : "en",
    topic: normalizeLearnerText(record.topic),
    level: record.level,
    image: normalizedMediaForFingerprint(image),
    audio: normalizedMediaForFingerprint(audio),
    enabled: record.enabled,
  };
  const canonical = canonicalize(envelope);
  if (canonical === undefined) throw new TypeError("PROJECTION_FINGERPRINT_NOT_CANONICALIZABLE");
  return canonicalJsonSha256(envelope);
}

function sortedLexemes(graph: MasterProjectionGraph): JsonRecord[] {
  return [...graph.lexemes].sort((a, b) =>
    number(a.displayOrder) - number(b.displayOrder)
      || compareText(String(a.normalizedLemma ?? a.lemma ?? ""), String(b.normalizedLemma ?? b.lemma ?? ""))
      || compareText(String(a.masterLexemeId ?? ""), String(b.masterLexemeId ?? "")),
  );
}

function buildVocabulary(graph: MasterProjectionGraph, mode: TransformMode): { rows: ProjectedVocabularyRecord[]; skipped: Array<{ masterSenseId: string; reason: string }> } {
  const sensesByLexeme = new Map<string, JsonRecord[]>();
  for (const sense of graph.senses) {
    const lexemeId = text(sense.masterLexemeId);
    if (!lexemeId) continue;
    const list = sensesByLexeme.get(lexemeId) ?? [];
    list.push(sense);
    sensesByLexeme.set(lexemeId, list);
  }
  for (const list of sensesByLexeme.values()) list.sort((a, b) => number(a.senseOrder) - number(b.senseOrder) || compareText(String(a.masterSenseId ?? ""), String(b.masterSenseId ?? "")));
  const classificationsBySense = getClassificationIndex(graph, mode);
  const rows: ProjectedVocabularyRecord[] = [];
  const skipped: Array<{ masterSenseId: string; reason: string }> = [];
  for (const lexeme of sortedLexemes(graph)) {
    const lexemeId = text(lexeme.masterLexemeId);
    if (!lexemeId || !statusEligible(lexeme.status, mode)) continue;
    const lemma = normalizeLearnerText(lexeme.lemma);
    if (!lemma) continue;
    for (const sense of sensesByLexeme.get(lexemeId) ?? []) {
      const senseId = text(sense.masterSenseId);
      if (!senseId || !statusEligible(sense.status, mode)) continue;
      const translation = chooseTranslation(sense, mode);
      const translationText = normalizeLearnerText(translation.row?.text);
      if (!translationText) {
        skipped.push({ masterSenseId: senseId, reason: translation.warning ?? "VIETNAMESE_TRANSLATION_MISSING" });
        continue;
      }
      const definitionRow = selectSenseText(sense, "definitions", mode);
      const exampleRow = selectSenseText(sense, "examples", mode);
      const definitionEn = normalizeLearnerText(definitionRow?.text);
      const exampleEn = normalizeLearnerText(exampleRow?.text);
      const pronunciation = selectPronunciation(lexeme, sense, mode);
      const ipa = normalizeLearnerText(pronunciation?.ipa);
      const audio = resolveApprovedMedia(graph, text(pronunciation?.audioAssetId));
      const classes = classificationsBySense.get(senseId) ?? [];
      const topicRows = topicCandidates(classes, graph.taxonomy);
      const topicChoice = chooseLegacyTopic(topicRows, graph.taxonomy);
      const topicName = topicChoice.selected ? normalizeLearnerText(englishTopicName(topicChoice.selected)) : null;
      const schoolClass = classes.filter((entry) => entry.dimension === "SCHOOL_LEVEL").sort((a, b) =>
        Number(b.isPrimary === true) - Number(a.isPrimary === true) || compareText(String(a.classificationId ?? ""), String(b.classificationId ?? "")),
      )[0];
      const level = levelProjection(schoolClass, graph.taxonomy);
      const imageCandidates = graph.mediaAssets
        .filter((asset) => asset.targetEntityType === "SENSE" && asset.targetId === senseId && asset.mediaKind === "IMAGE")
        .sort((a, b) => Number(b.status === "APPROVED") - Number(a.status === "APPROVED") || compareText(String(a.mediaAssetId ?? ""), String(b.mediaAssetId ?? "")))
        .map((asset) => ({ asset, resolution: resolveApprovedMedia(graph, text(asset.mediaAssetId)) }));
      const selectedImage = imageCandidates.find((candidate) => candidate.resolution.url !== null)
        ?? imageCandidates.find((candidate) => candidate.resolution.semantic !== null)
        ?? imageCandidates[0];
      const image = selectedImage?.resolution ?? { url: null, semantic: null };
      const enabled = mode === "RELEASE";
      const runtimeProjection: ProjectedVocabularyRecord["runtimeProjection"] = {
        word: lemma,
        ipa,
        vietnamese: translationText,
        definitionEn,
        exampleEn,
        imageUrl: image.url,
        audioUrl: audio.url,
        topic: topicName,
        level: level.level,
        enabled,
      };
      const warnings = [
        translation.warning,
        topicChoice.warning,
        level.warning,
        classes.filter((entry) => entry.dimension === "SCHOOL_LEVEL").length > 1 ? "MULTIPLE_SCHOOL_LEVEL_CLASSIFICATIONS_TIE_BROKEN" : undefined,
        classes.some((entry) => entry.dimension === "CEFR") ? "CEFR_CLASSIFICATION_MASTER_ONLY_NOT_RUNTIME_LEVEL" : undefined,
        topicRows.length > 1 ? "MULTIPLE_TOPIC_MEMBERSHIPS_FLATTENED_IN_LEGACY_TOPIC" : undefined,
        topicRows.some((entry) => Boolean(entry.topic.parentTopicId)) ? "TOPIC_HIERARCHY_NOT_REPRESENTED_IN_FLAT_RUNTIME" : undefined,
        records(lexeme.pronunciations).length + records(sense.pronunciationOverrides).length > 1 ? "MULTIPLE_PRONUNCIATIONS_REDUCED_TO_ONE_EN_US_SELECTION" : undefined,
      ].filter((warning): warning is string => Boolean(warning));
      const masterProjectionFingerprint = fingerprintFor(runtimeProjection, text(lexeme.language) ?? "en", translationText, definitionEn, exampleEn, ipa, image.semantic, audio.semantic);
      rows.push({
        masterLexemeId: lexemeId,
        masterSenseId: senseId,
        sourceRevisions: { lexemeRevision: number(lexeme.lexemeRevision), senseRevision: number(sense.senseRevision) },
        sourceIdentity: { sourceDataset: MASTER_SOURCE_DATASET, masterSenseId: senseId },
        runtimeProjection,
        projectionSemantics: {
          wordLanguage: text(lexeme.language) ?? "en",
          pronunciationLocale: RUNTIME_PRONUNCIATION_LOCALE,
          translationLanguage: "vi",
          definitionLanguage: definitionEn === null ? null : "en",
          exampleLanguage: exampleEn === null ? null : "en",
          image: image.semantic,
          audio: audio.semantic,
        },
        projectionContractVersion: RUNTIME_PROJECTION_CONTRACT_VERSION,
        masterProjectionFingerprint,
        appVocabularyId: null,
        mappingStatus: "UNRESOLVED",
        contentVersion: { status: "PENDING_RUNTIME_RECONCILIATION" },
        warnings: [...new Set(warnings)].sort(compareText),
      });
    }
  }
  return { rows, skipped };
}

function buildTopics(graph: MasterProjectionGraph, rows: ProjectedVocabularyRecord[], mode: TransformMode): { topics: JsonRecord[]; memberships: JsonRecord[] } {
  const projectedIds = new Set(rows.map((row) => row.masterSenseId));
  const byId = new Map(taxonomyArray(graph.taxonomy, "topics").map((topic) => [String(topic.topicId), topic]));
  const membershipSource = graph.classifications
    .filter((entry) => entry.dimension === "TOPIC" && statusEligible(entry.status, mode) && projectedIds.has(String(entry.masterSenseId)))
    .map((entry) => ({ classification: entry, topic: byId.get(String(entry.valueRef)) }))
    .filter((entry): entry is { classification: JsonRecord; topic: JsonRecord } => Boolean(entry.topic && entry.topic.status === "ACTIVE"))
    .sort((a, b) => compareText(String(a.topic.code ?? ""), String(b.topic.code ?? ""))
      || compareText(String(a.classification.masterSenseId ?? ""), String(b.classification.masterSenseId ?? ""))
      || compareText(String(a.topic.topicId ?? ""), String(b.topic.topicId ?? "")));
  const selectedTopicIds = new Set(membershipSource.map((entry) => String(entry.topic.topicId)));
  const selectedTopics = [...selectedTopicIds]
    .map((id) => byId.get(id)!)
    .filter(Boolean)
    .sort((a, b) => compareText(String(a.code ?? ""), String(b.code ?? "")) || compareText(String(a.topicId ?? ""), String(b.topicId ?? "")));
  const appTopics = selectedTopics.map((topic, sortOrder) => ({
    masterTopicId: topic.topicId,
    masterParentTopicId: topic.parentTopicId ?? null,
    code: topic.code,
    slug: topic.slug,
    name: label(topic.labels, "en") ?? String(topic.code),
    description: label(topic.definition, "en") ?? "",
    sortOrder,
    appTopicId: null,
    mappingStatus: "UNRESOLVED",
  }));
  const memberships = membershipSource.map(({ classification, topic }) => ({
    masterSenseId: classification.masterSenseId,
    masterTopicId: topic.topicId,
    classificationId: classification.classificationId,
    isPrimary: classification.isPrimary === true,
    appVocabularyId: null,
    appTopicId: null,
    mappingStatus: "UNRESOLVED",
  }));
  return { topics: appTopics, memberships };
}

function englishCodeName(value: unknown): string | null {
  return label(value, "en");
}

function slugFromCode(value: unknown): string {
  return String(value ?? "").toLowerCase().replace(/_/g, "-");
}

function buildLearningSets(graph: MasterProjectionGraph, rows: ProjectedVocabularyRecord[], mode: TransformMode): { sets: JsonRecord[]; items: JsonRecord[] } {
  const projectedIds = new Set(rows.map((row) => row.masterSenseId));
  const sets = [...graph.learningSets]
    .filter((set) => statusEligible(set.status, mode))
    .sort((a, b) => number(a.sortOrder) - number(b.sortOrder)
      || compareText(String(a.code ?? ""), String(b.code ?? ""))
      || compareText(String(a.learningSetId ?? ""), String(b.learningSetId ?? "")));
  const outSets: JsonRecord[] = [];
  const items: JsonRecord[] = [];
  for (const set of sets) {
    const setId = String(set.learningSetId);
    const name = englishCodeName(set.name);
    if (!name) continue;
    const setItems = records(set.items)
      .filter((item) => item.learningSetId === set.learningSetId && statusEligible(item.status, mode) && projectedIds.has(String(item.masterSenseId)))
      .sort((a, b) => number(a.position) - number(b.position) || compareText(String(a.learningSetItemId ?? ""), String(b.learningSetItemId ?? "")));
    outSets.push({
      masterLearningSetId: setId,
      sourceRevision: number(set.learningSetRevision),
      code: set.code,
      slug: slugFromCode(set.code),
      name,
      description: englishCodeName(set.description) ?? "",
      sortOrder: number(set.sortOrder),
      grade: null,
      enabled: mode === "RELEASE",
      appLearningSetId: null,
      mappingStatus: "UNRESOLVED",
      itemCount: setItems.length,
    });
    for (const item of setItems) {
      items.push({
        masterLearningSetId: setId,
        learningSetItemId: item.learningSetItemId,
        masterSenseId: item.masterSenseId,
        position: number(item.position),
        appLearningSetId: null,
        appVocabularyId: null,
        mappingStatus: "UNRESOLVED",
      });
    }
  }
  return { sets: outSets, items };
}

function buildMapping(rows: ProjectedVocabularyRecord[], shared: JsonRecord): JsonRecord {
  return {
    ...shared,
    mappingPolicy: "explicit-only; no lemma matching or integer-id allocation",
    mappings: rows.map((row) => ({
      masterLexemeId: row.masterLexemeId,
      masterSenseId: row.masterSenseId,
      appVocabularyId: null,
      mappingStatus: "UNRESOLVED",
      runtimeIdentityState: "NOT_RECONCILED",
      masterProjectionFingerprint: row.masterProjectionFingerprint,
    })),
  };
}

function buildReport(graph: MasterProjectionGraph, mode: TransformMode, rows: ProjectedVocabularyRecord[], skipped: Array<{ masterSenseId: string; reason: string }>, topics: JsonRecord[], memberships: JsonRecord[], sets: JsonRecord[], setItems: JsonRecord[]): string {
  const unresolved = rows.filter((row) => row.appVocabularyId === null).length;
  const imageCount = rows.filter((row) => row.runtimeProjection.imageUrl !== null).length;
  const audioCount = rows.filter((row) => row.runtimeProjection.audioUrl !== null).length;
  const levelCount = rows.filter((row) => row.runtimeProjection.level !== null).length;
  const topicCount = rows.filter((row) => row.runtimeProjection.topic !== null).length;
  const repeatedFingerprints = rows.length - new Set(rows.map((row) => row.masterProjectionFingerprint)).size;
  const releaseIneligible = graph.manifest.status === "APPROVED" ? 0 : records(graph.manifest.includedSenses).length;
  const warningCodes = [...new Set(rows.flatMap((row) => row.warnings))].sort(compareText);
  const skipLines = skipped.length ? skipped.map((row) => `- ${row.masterSenseId}: ${row.reason}`).join("\n") : "- None";
  const warningLines = warningCodes.length ? warningCodes.map((warning) => `- ${warning}`).join("\n") : "- No row-level compatibility warnings.";
  return `# Master Vocabulary V2 → App Import V3 Transform Report\n\n`
    + `- Source dataset version: ${String(graph.manifest.datasetVersion)}\n`
    + `- Source schema version: ${String(graph.manifest.schemaVersion)}\n`
    + `- Source manifest status: ${String(graph.manifest.status)}\n`
    + `- Source manifest JCS SHA-256: ${canonicalJsonSha256(graph.manifest)}\n`
    + `- App Import contract: ${APP_IMPORT_CONTRACT_VERSION}\n`
    + `- Runtime projection contract: ${RUNTIME_PROJECTION_CONTRACT_VERSION}\n`
    + `- Mode: ${mode}\n`
    + `- importEligible: ${mode === "RELEASE"}\n\n`
    + `## Counts\n\n`
    + `- Lexemes read from manifest pins: ${records(graph.manifest.includedLexemes).length}\n`
    + `- Senses considered: ${records(graph.manifest.includedSenses).length}\n`
    + `- Senses projected: ${rows.length}\n`
    + `- Senses skipped: ${skipped.length}\n`
    + `- Senses release-ineligible: ${releaseIneligible}\n`
    + `- App vocabulary mappings with an integer ID: 0\n`
    + `- App vocabulary mappings unresolved: ${unresolved}\n`
    + `- Image URLs resolved: ${imageCount}/${rows.length}\n`
    + `- Word-audio URLs resolved: ${audioCount}/${rows.length}\n`
    + `- Legacy level mappings: ${levelCount}/${rows.length}\n`
    + `- Legacy topic mappings: ${topicCount}/${rows.length}\n`
    + `- Normalized app topic rows: ${topics.length}\n`
    + `- Sense-topic membership rows: ${memberships.length}\n`
    + `- Learning Sets / membership rows: ${sets.length}/${setItems.length}\n`
    + `- Duplicate projection fingerprints (review signal only): ${repeatedFingerprints}\n`
    + `- App Topic slug collisions: ${duplicateValueCount(topics.map((topic) => String(topic.slug)))}\n`
    + `- App Learning Set slug collisions: ${duplicateValueCount(sets.map((set) => String(set.slug)))}\n\n`
    + `## Selection and compatibility rules\n\n`
    + `- One vocabulary projection is produced per eligible Master Sense. Sense order is owning Lexeme displayOrder, normalizedLemma, Lexeme ID, then senseOrder and Sense ID.\n`
    + `- Translation: preferred eligible Vietnamese Translation first; then displayOrder and translationId. A deterministic first-row fallback is marked if none is preferred.\n`
    + `- Definition and example: eligible English row with the lowest displayOrder, then stable entity ID.\n`
    + `- IPA/audio: preferred en-US Sense override first; otherwise preferred en-US Lexeme pronunciation. Audio URL requires its own approved pinned media version and READY HTTPS delivery.\n`
    + `- Legacy topic: sole primary assignment; otherwise most-specific active topic, then code and Topic ID. All assignments also remain in the separate membership artifact.\n`
    + `- Legacy level: only an explicit active School Level under an active non-internal curriculum at grades 1–5 maps to GRADE_1–GRADE_5. CEFR, difficulty, age, exam, internal-demo grades and grades 6+ never map. Unknown remains null.\n`
    + `- PREVIEW forces all runtimeProjection.enabled values false. RELEASE is accepted only for a validator-clean APPROVED manifest; output is enabled only in that mode.\n\n`
    + `## Skips\n\n${skipLines}\n\n`
    + `## Lossiness and Master-only information\n\n`
    + `- Multiple Topic assignments are reduced to one legacy vocabulary.topic string; full Sense→Topic memberships remain separately projected. Topic hierarchy is retained only as Master parent IDs in the topic artifact because runtime topics are flat.\n`
    + `- CEFR, difficulty, age groups, Domain, Exam, POS, curriculum metadata, provenance, translations beyond one Vietnamese choice, Vietnamese example translations, editorial notes and learning context are not current vocabulary DTO fields.\n`
    + `- Multiple pronunciations reduce to one preferred en-US IPA/audio selection. Image/audio prompt, QA, license, attribution, source locator, provider IDs and delivery URL identity are excluded from fingerprint semantics; only pinned asset/version/hash plus delivery-availability state is fingerprinted.\n`
    + `- Learning Set membership is a separate projection and never duplicates a vocabulary Sense. Runtime integer IDs remain unresolved and are not inferred from lemma or UUID.\n`
    + `- contentVersion is pending runtime reconciliation; it is intentionally not assigned by this offline transform.\n\n`
    + `## Row-level compatibility warnings\n\n${warningLines}\n\n`
    + `## Runtime integration still required\n\n`
    + `- A future reviewed importer must persist explicit Master Sense ↔ app integer mappings, compare/store projection fingerprints transactionally, and derive contentVersion from the prior applied fingerprint.\n`
    + `- Runtime schema/API changes are needed to preserve Master UUID identity and source mapping without placing UUIDs in the legacy integer source_record_id. Existing progress/review IDs must not be recycled.\n`
    + `- Taxonomy and Learning Set mappings need explicit integer-ID reconciliation and a policy for app slug/name collisions. No database write or learner-history migration is part of this transform.\n`;
}

export function buildAppImportV2(graph: MasterProjectionGraph, mode: TransformMode = "PREVIEW"): AppImportV3Artifacts {
  if (mode === "RELEASE" && graph.manifest.status !== "APPROVED") {
    throw new Error(`RELEASE_REQUIRES_APPROVED_MANIFEST:${String(graph.manifest.status)}`);
  }
  const { rows, skipped } = buildVocabulary(graph, mode);
  if (mode === "RELEASE" && skipped.length > 0) throw new Error(`RELEASE_PROJECTION_INCOMPLETE:${skipped.length}`);
  const topicOutput = buildTopics(graph, rows, mode);
  const learningSetOutput = buildLearningSets(graph, rows, mode);
  const shared = metadata(graph, mode);
  const repeatedFingerprints = rows.length - new Set(rows.map((row) => row.masterProjectionFingerprint)).size;
  const duplicateMasterSenses = rows.length !== new Set(rows.map((row) => row.masterSenseId)).size;
  if (duplicateMasterSenses) throw new Error("DUPLICATE_MASTER_SENSE_PROJECTION");
  const topicSlugCollisions = duplicateValueCount(topicOutput.topics.map((topic) => String(topic.slug)));
  const setSlugCollisions = duplicateValueCount(learningSetOutput.sets.map((set) => String(set.slug)));
  if (mode === "RELEASE" && (topicSlugCollisions > 0 || setSlugCollisions > 0)) {
    throw new Error(`RELEASE_RUNTIME_SLUG_COLLISION:topics=${topicSlugCollisions}:learningSets=${setSlugCollisions}`);
  }
  const report = buildReport(graph, mode, rows, skipped, topicOutput.topics, topicOutput.memberships, learningSetOutput.sets, learningSetOutput.items);
  return {
    vocabulary: {
      ...shared,
      projectionContractVersion: RUNTIME_PROJECTION_CONTRACT_VERSION,
      recordIdentity: "masterSenseId",
      contentVersionPolicy: "PENDING_RUNTIME_RECONCILIATION",
      records: rows,
      duplicateProjectionFingerprintCount: repeatedFingerprints,
    },
    topics: { ...shared, identity: "masterTopicId", runtimeShape: "flat-topic-v1", records: topicOutput.topics },
    learningSets: { ...shared, identity: "masterLearningSetId", records: learningSetOutput.sets },
    learningSetItems: { ...shared, identity: "learningSetItemId", records: learningSetOutput.items },
    topicMemberships: { ...shared, identity: "masterSenseId+masterTopicId", records: topicOutput.memberships },
    mapping: buildMapping(rows, shared),
    report,
  };
}

export interface RunTransformOptions {
  datasetRoot?: string;
  outputRoot?: string;
  mode?: TransformMode;
  writeOutputs?: boolean;
}

export function runMasterVocabularyTransform(options: RunTransformOptions = {}): AppImportV3Artifacts {
  const datasetRoot = path.resolve(options.datasetRoot ?? path.join(process.cwd(), "vocabflow-dataset"));
  const mode = options.mode ?? "PREVIEW";
  const validation = validateMasterVocabularyV2({ datasetRoot, writeReport: false, validatedAt: "2000-01-01T00:00:00Z" });
  if (validation.status !== "PASS") {
    throw new Error(`MASTER_VALIDATION_FAILED:${validation.errorCount}:${validation.issues.filter((issue) => issue.severity === "ERROR").map((issue) => issue.code).join(",")}`);
  }
  const graph = loadPinnedMasterProjectionGraph(datasetRoot);
  if (mode === "RELEASE" && graph.manifest.status !== "APPROVED") {
    throw new Error(`RELEASE_REQUIRES_APPROVED_MANIFEST:${String(graph.manifest.status)}`);
  }
  const artifacts = buildAppImportV2(graph, mode);
  if (options.writeOutputs) {
    const outputRoot = path.resolve(options.outputRoot ?? path.join(datasetRoot, "import"));
    const mappingsRoot = path.join(outputRoot, "mappings");
    mkdirSync(mappingsRoot, { recursive: true });
    const outputs: Array<[string, unknown]> = [
      ["vocabulary-import-v2.json", artifacts.vocabulary],
      ["topics-import-v2.json", artifacts.topics],
      ["learning-sets-import-v2.json", artifacts.learningSets],
      ["learning-set-items-import-v2.json", artifacts.learningSetItems],
      ["topic-memberships-import-v2.json", artifacts.topicMemberships],
      ["mappings/master-app-map.json", artifacts.mapping],
    ];
    for (const [relativePath, value] of outputs) {
      const target = path.join(outputRoot, relativePath);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    }
    const reportPath = path.join(datasetRoot, "reports", "transform-report.md");
    mkdirSync(path.dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, artifacts.report, "utf8");
  }
  return artifacts;
}

function parseArgs(args: string[]): { mode: TransformMode; datasetRoot: string; outputRoot: string } {
  let mode: TransformMode = "PREVIEW";
  let datasetRoot = path.join(process.cwd(), "vocabflow-dataset");
  let outputRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--preview") mode = "PREVIEW";
    else if (arg === "--release") mode = "RELEASE";
    else if (arg === "--dataset-root" && args[index + 1]) datasetRoot = path.resolve(args[++index]!);
    else if (arg === "--output-dir" && args[index + 1]) outputRoot = path.resolve(args[++index]!);
    else throw new Error(`UNKNOWN_OR_INCOMPLETE_ARGUMENT:${arg}`);
  }
  const resolvedDatasetRoot = path.resolve(datasetRoot);
  return { mode, datasetRoot: resolvedDatasetRoot, outputRoot: path.resolve(outputRoot ?? path.join(resolvedDatasetRoot, "import")) };
}

function isMain(): boolean {
  const scriptPath = process.argv[1];
  return Boolean(scriptPath && path.resolve(scriptPath) === path.resolve(fileURLToPath(import.meta.url)));
}

if (isMain()) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const artifacts = runMasterVocabularyTransform({ ...args, writeOutputs: true });
    process.stdout.write(`Master V2 transform ${args.mode}: wrote ${records(artifacts.vocabulary.records).length} vocabulary projections. importEligible=${String(artifacts.vocabulary.importEligible)}\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
